/* Controlled native-GPU cost and rendered-anatomy fixture. Natural UI / save
 * acceptance lives in oarfish-browser.cjs. Only the two new batches are toggled
 * in ABBA; camera, scene, time, resolution and all other content stay fixed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../..'),option=(n,d)=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3)||d;
const url=option('url','http://127.0.0.1:8765/?still'),output=path.resolve(root,option('out','qa/parity/oarfish-gpu-browser.json'));
const lowLOD=process.argv.includes('--low-lod');
const result={url,method:'Native GPU fixed-scene ABBA, 10 warm frames plus 25 complete-render timer queries per block. Only new oarfish batches hidden/shown; no pixel-equivalence expectation because the animal is added. Isolated original-mesh images and frozen pose are visual fixtures, not natural exploration or physical phone evidence.',profiles:[],errors:[]};
if(lowLOD)result.method='Controlled native low-LOD visual check: the original actor is placed in a 6 m deep open-water studio with daylight; real 36 m camera distance selects the production far batch and an 18-degree diagnostic lens resolves its silhouette. This is not the wild 480 m habitat. No timed blocks, natural UI, physical phone or gameplay FPS claim.';
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  const profile={name:touch?'touch':'desktop',meta:await page.evaluate(({touch,lowLOD})=>{
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.quality=touch?1:2;renderer.dynamicScale=.64;renderer.resize();renderer.lamp=true;renderer.photoNear=.16;
   const fish=life.find(f=>SPECIES[f.species]?.id==='oarfish');if(!fish)throw Error('Live oarfish missing');
   const range=lowLOD?36:7;if(lowLOD)renderer.photoFov=18;
   faunaMotionPose(fish,8,fish.p);if(lowLOD)fish.p[1]=-6;
   const center=animalFocusPoint(fish),view=V.add(center,[Math.sin(fish.yaw)*range,0,Math.cos(fish.yaw)*range]);
   const gl=renderer.gl,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info'),batches=renderer.batches.filter(b=>b.species===fish.species&&b.sceneRole==='oarfish-encounter');
   if(batches.length!==2||!ext)throw Error('Two real LOD batches and GPU timer required');
   window.__oarfishGPU={fish,center,view,batches,ext,query:null};renderer.render(view,center,8);
   return {version:document.documentElement.dataset.version,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,msaa:renderer.msaaSamples,scale:renderer.dynamicScale,adaptive:settings.adaptive,range,diagnosticFov:renderer.photoFov||null,geometry:batches.map(b=>({indices:b.count,vertices:b.vertexCount,role:b.sceneRole})),position:fish.p.slice(),camera:view.slice(),target:center.slice()};
  },{touch,lowLOD}),blocks:[]};
  assert(profile.meta.renderer&&!/swiftshader|llvmpipe|software/i.test(profile.meta.renderer));assert.equal(profile.meta.version,fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
  // Streaming may preserve the previous image while a destination loads.
  // Warm actual completed frames across RAFs, never time that early return.
  async function warm(enabled){await page.evaluate(enabled=>new Promise((resolve,reject)=>{const d=__oarfishGPU;for(const b of d.batches)b.visible=enabled;let count=0;const started=performance.now();function frame(){const rendered=renderer.render(d.view,d.center,8);if(rendered!==false)count++;if(count>=10)return resolve();if(performance.now()-started>60000)return reject(Error('Fixture world did not become ready'));requestAnimationFrame(frame);}requestAnimationFrame(frame);}),enabled);}
  await warm(false);
  Object.assign(profile.meta,await page.evaluate(()=>({resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,msaa:renderer.msaaSamples,scale:renderer.dynamicScale})));
  for(const enabled of lowLOD?[]:[false,true,true,false]){
   await warm(enabled);
   const samples=[];
   for(let i=0;i<25;i++){
    await page.evaluate(()=>{const d=__oarfishGPU,g=renderer.gl;d.query=g.createQuery();g.beginQuery(d.ext.TIME_ELAPSED_EXT,d.query);const rendered=renderer.render(d.view,d.center,8);g.endQuery(d.ext.TIME_ELAPSED_EXT);if(rendered===false)throw Error('Incomplete streaming frame is not a GPU sample');});
    await page.waitForFunction(()=>renderer.gl.getQueryParameter(__oarfishGPU.query,renderer.gl.QUERY_RESULT_AVAILABLE));
    const row=await page.evaluate(()=>{const d=__oarfishGPU,g=renderer.gl,r={ms:g.getQueryParameter(d.query,g.QUERY_RESULT)/1e6,disjoint:g.getParameter(d.ext.GPU_DISJOINT_EXT),gl:g.getError(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles};g.deleteQuery(d.query);d.query=null;return r;});
    assert.equal(row.gl,0);assert.equal(row.disjoint,false,'Discard this run rather than treating disjoint GPU timing as valid');samples.push(row);
   }
   profile.blocks.push({enabled,samples,medianGpuMs:median(samples.map(s=>s.ms))});console.log(profile.name+' '+(enabled?'with':'without')+' oarfish '+profile.blocks.at(-1).medianGpuMs.toFixed(3)+' ms');
  }
  if(!lowLOD){profile.comparison={withoutMedianGpuMs:median(profile.blocks.filter(b=>!b.enabled).flatMap(b=>b.samples.map(s=>s.ms))),withMedianGpuMs:median(profile.blocks.filter(b=>b.enabled).flatMap(b=>b.samples.map(s=>s.ms)))};
   profile.comparison.addedGpuMs=profile.comparison.withMedianGpuMs-profile.comparison.withoutMedianGpuMs;}
  // Same real habitat with lamp on/off and whole model in frame. Canvas-only
  // PNGs deliberately omit the live UI since this is a diagnostic camera.
  profile.images=[];
  for(const lamp of [true,false]){
   const data=await page.evaluate(lamp=>{const d=__oarfishGPU;for(const b of d.batches)b.visible=true;renderer.lamp=lamp;renderer.render(d.view,d.center,8);return {image:renderer.canvas.toDataURL('image/png'),gl:renderer.gl.getError(),drawn:d.batches.map(b=>b.drawCount)};},lamp);
   assert.equal(data.gl,0);assert(data.drawn.some(n=>n>0),'The actual oarfish must be drawn in the fixture');if(lowLOD)assert.deepEqual(data.drawn,[0,1],'The production far batch must replace the high batch at 36 m');const file=output.replace(/\.json$/,'')+'-'+profile.name+'-'+(lamp?'lit':'dark')+'.png';fs.writeFileSync(file,Buffer.from(data.image.split(',')[1],'base64'));profile.images.push({file,drawn:data.drawn});
  }
  result.profiles.push(profile);await context.close();
 }
 assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.failure=e.stack;throw e;}
 finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
