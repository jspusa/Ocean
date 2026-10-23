/* Real GPU timer queries around complete frames, with the original and bounded
 * surface programs in the same WebGL context. Software GPU timings are neither
 * physical-device FPS nor battery measurements; this is a reproducible A/B. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';
const profiles=[{id:'desktop',mobile:false,quality:2},{id:'touch',mobile:true,quality:1}];
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[],errors=[];
 try{for(const profile of profiles){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:profile.mobile,hasTouch:profile.mobile}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({quality})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,startWithSound:false,reduced:true}})),profile);
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  const meta=await page.evaluate(async()=>{
   settings.adaptive=false;settings.third=false;settings.lamp=false;
   await __prepareView([0,-8,7],[0,-8,-10],8);
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info');
   window.__surfaceGPU={ext,programs:renderer.surfacePrograms,pixels:null,query:null};
   if(!renderer.surfacePrograms||renderer.surfacePrograms.size!==3)throw Error('Expected the three production surface programs');
   return {timer:!!ext,renderer:debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',quality:renderer.quality,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaaSamples:renderer.msaaSamples,programs:renderer.surfacePrograms.size};
  });
  // ready() covers required geometry; allow all already-requested preloads to
  // finish too, so later frames do not mix in static-shadow invalidations.
  await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0,null,{timeout:120000});
  const capture=async(specialized,measure)=>{
   const row=await page.evaluate(({specialized,measure})=>{
    const p=__surfaceGPU,g=renderer.gl,saved=renderer.surfacePrograms;
    renderer.surfacePrograms=specialized?p.programs:null;
    let query;
    try{
     if(measure&&p.ext){query=g.createQuery();g.beginQuery(p.ext.TIME_ELAPSED_EXT,query);}
     const begin=performance.now();renderer.render(eye,target,t);const cpuSubmitMs=performance.now()-begin;
     if(query)g.endQuery(p.ext.TIME_ELAPSED_EXT);p.query=query;
     const a=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);
     g.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);
     let differingChannels=0,maxDifference=0;if(p.pixels){for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-p.pixels[i]);if(d)differingChannels++;maxDifference=Math.max(maxDifference,d);}}else p.pixels=a;
     return {specialized,cpuSubmitMs,readbackWallMs:performance.now()-begin,differingChannels,maxDifference,gl:g.getError(),triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,draws:renderer.drawCalls,shadowDraws:renderer.shadowDraws};
    }finally{renderer.surfacePrograms=saved;}
   },{specialized,measure});
   if(measure&&meta.timer){
    await page.waitForFunction(()=>renderer.gl.getQueryParameter(__surfaceGPU.query,renderer.gl.QUERY_RESULT_AVAILABLE),null,{timeout:120000});
    Object.assign(row,await page.evaluate(()=>{const p=__surfaceGPU,g=renderer.gl,result={disjoint:g.getParameter(p.ext.GPU_DISJOINT_EXT),gpuMs:g.getQueryParameter(p.query,g.QUERY_RESULT)/1e6};g.deleteQuery(p.query);p.query=null;return result;}));
   }
   assert.equal(row.gl,0);assert.equal(row.differingChannels,0,'Same-context full RGBA image must remain exact');
   return row;
  };
  // Warm both pipelines before timings; compilation may be deferred to a draw.
  await capture(false,false);await capture(true,false);
  const samples=[];for(let round=0;round<3;round++)for(const specialized of round%2?[true,false]:[false,true]){
   const row=await capture(specialized,true);samples.push({round,...row});
   console.log(profile.id+' '+(specialized?'specialized':'original')+' GPU '+(row.gpuMs??'unavailable')+' ms, pixel delta '+row.differingChannels);
  }
  for(const row of samples)for(const key of ['triangles','vertices','draws','shadowDraws'])assert.equal(row[key],samples[0][key],key+' must remain unchanged');
  const valid=samples.filter(row=>row.disjoint===false),before=valid.filter(row=>!row.specialized),after=valid.filter(row=>row.specialized);
  const comparison=before.length&&after.length?{originalMedianGpuMs:median(before.map(row=>row.gpuMs)),specializedMedianGpuMs:median(after.map(row=>row.gpuMs))}:null;
  if(comparison)comparison.reductionPercent=100*(1-comparison.specializedMedianGpuMs/comparison.originalMedianGpuMs);
  rows.push({profile:profile.id,meta,samples,comparison});await context.close();
 }}finally{
  await browser.close();const out=path.resolve(__dirname,'../../qa/parity/surface-gpu-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,method:'Three alternating paired complete-frame EXT_disjoint_timer_query_webgl2 samples after warming both paths, original/specialized in one context at fixed reef camera/time, complete-content exact RGBA. Disjoint queries excluded. No performance threshold: GPU/driver dependent, not physical-device FPS or battery.',rows,errors},null,2));
 }
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
