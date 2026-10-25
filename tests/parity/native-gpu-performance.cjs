/* Hardware GPU A/B for the added terrain specialization, not simulated phone
 * performance. Other production programs, quality, MSAA and content stay fixed.
 * Run alone: PLAYWRIGHT_PATH=... node ... http://127.0.0.1:8765/ */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const trench=process.argv.includes('--trench'),pixelsOnly=process.argv.includes('--pixels-only');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true)),rows=[],errors=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  await page.evaluate(async trench=>{settings.adaptive=false;if(trench){settings.lamp=true;renderer.dynamicScale=.64;renderer.resize();await __prepareView([762,-1401.18,-110],[763,-1402,-111],8);}else await __prepareView([0,-8,7],[0,-8,-10],8);},trench);
  await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0);
  const row=await page.evaluate(async({trench,pixelsOnly})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),original=renderer.surfaceProgram;
   if(!ext)throw Error('Native GPU timer queries unavailable; no timing claim can be made');
   const affected=trench?[16,17]:[1],selectedKeys=new Set();for(const mat of affected)if(!renderer.surfacePrograms.has('0:'+mat))throw Error('Required terrain specialization missing: '+mat);
   const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),samples=[],visuals=[];
   const mode=enabled=>{renderer.surfaceProgram=function(b){if(b.kind===0&&affected.includes(b.material)){selectedKeys.add('0:'+b.material);if(!enabled)return this.program;}return original.call(this,b);};};
   const render=()=>renderer.render(eye,target,t);
   const read=()=>{render();const pixels=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,pixels);return pixels;};
   let reference=null;
   const compare=()=>{const pixels=read();let differingChannels=0,maxDifference=0,rangeMin=255,rangeMax=0;if(!reference)reference=pixels;
    for(let i=0;i<pixels.length;i++){const d=Math.abs(pixels[i]-reference[i]);if(d)differingChannels++;maxDifference=Math.max(maxDifference,d);if(i%4!==3){rangeMin=Math.min(rangeMin,pixels[i]);rangeMax=Math.max(rangeMax,pixels[i]);}}
    return {differingChannels,maxDifference,channels:pixels.length,range:rangeMax-rangeMin};};
   try{
    for(const enabled of [false,true,true,false]){
     mode(enabled);for(let i=0;i<(pixelsOnly?2:10);i++){await raf();render();}
     const gpuMs=[],cpuMs=[];
     for(let i=0;i<(pixelsOnly?0:25);i++){
      await raf();const query=g.createQuery();g.beginQuery(ext.TIME_ELAPSED_EXT,query);const start=performance.now();render();cpuMs.push(performance.now()-start);g.endQuery(ext.TIME_ELAPSED_EXT);g.flush();
      const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}
      if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU measurement; rerun the sample');gpuMs.push(g.getQueryParameter(query,g.QUERY_RESULT)/1e6);g.deleteQuery(query);
     }
     samples.push({enabled,gpuMs,cpuMs,pixels:compare(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,msaa:renderer.msaaSamples,resolution:[renderer.canvas.width,renderer.canvas.height],gl:g.getError()});
    }
    for(const view of (trench?[
     {id:'slope-wall',p:[762,-1398,-108],aim:[755,-1400,-120]},
     {id:'midwater',p:[760,-700,-90],aim:[770,-700,-100]},
     {id:'hadal',p:[766,-7000,-120],aim:[776,-7001.8,-130]},
     {id:'reef-unchanged',p:[0,-8,7],aim:[0,-8,-10]}
    ]:[
     {id:'reef-reversed',p:[0,-8,-10],aim:[0,-9,8]},
     {id:'offshore',p:[390,-32,-184],aim:[390,-32,-210]},
     {id:'hadal',p:[766,-7000,-120],aim:[766,-7000,-145]}
    ])){
     await __prepareView(view.p,view.aim,8);while(renderer.sceneStream.jobs.size)await raf();
     reference=null;mode(false);compare();mode(true);visuals.push({id:view.id,...compare(),gl:g.getError()});
    }
    return {selectedKeys:[...selectedKeys],affected,renderer:debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',samples,visuals,quality:renderer.quality,scale:renderer.dynamicScale};
   }finally{renderer.surfaceProgram=original;}
  },{trench,pixelsOnly});
  rows.push({touch,...row});console.log(JSON.stringify({touch,pixels:row.samples.map(s=>s.pixels),visuals:row.visuals}));
  assert.deepEqual(row.selectedKeys.slice().sort(),row.affected.map(m=>'0:'+m).sort(),'Controlled views must actually draw all affected surfaces');
  assert(!/swiftshader|llvmpipe|software/i.test(row.renderer),'Hardware benchmark must not silently use a software GPU');
  for(const sample of [...row.samples,...row.visuals]){const pixels=sample.pixels||sample;assert.equal(sample.gl,0);assert(pixels.range>20,'Image must contain visible detail');assert(pixels.maxDifference<=1,'Only 8-bit compiler rounding is permitted');assert(pixels.differingChannels/pixels.channels<.0001,'Too many changed RGBA channels');}
  for(const sample of row.samples)for(const key of ['draws','triangles','msaa','resolution'])assert.deepEqual(sample[key],row.samples[0][key],key+' must stay fixed');
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)],before=median(row.samples.filter(s=>!s.enabled).flatMap(s=>s.gpuMs)),after=median(row.samples.filter(s=>s.enabled).flatMap(s=>s.gpuMs));
  rows.at(-1).comparison=pixelsOnly?null:{beforeMedianGpuMs:before,afterMedianGpuMs:after,reductionPercent:100*(1-after/before)};
  console.log(JSON.stringify({touch,...rows.at(-1).comparison,pixels:row.samples.map(s=>s.pixels.differingChannels),visuals:row.visuals}));await context.close();
 }}finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/'+(trench?'native-trench-gpu-performance':'native-gpu-performance')+(pixelsOnly?'-pixels':'')+'.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,trench,pixelsOnly,method:'Native hardware Chrome. Same context, only the identified terrain specializations toggled; ABBA, 10 warm frames and 25 complete-frame GPU queries per block. Fixed camera/time, framebuffer, MSAA and content. pixelsOnly skips GPU timing and uses two warm frames per block. Trench diagnostic uses scale .64; reef default uses 1. Full RGBA comparison; max 1/255 rounding in fewer than 0.01% of channels. Touch is desktop browser emulation, not physical phone FPS or battery.',rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
