/* Native startup diagnosis through normal UI. No pose, clock, quality or save
 * writes. Transparent CPU timings and at most three GPU-sampled frames per
 * 20-second segment can perturb samples; this is not a power/FPS guarantee. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(key,fallback)=>process.argv.find(v=>v.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),profile=option('profile','desktop'),output=path.resolve(__dirname,'../..',option('out','qa/parity/v01816-startup-baseline.json'));
assert(['desktop','touch'].includes(profile));assert(!new URL(url).searchParams.has('still'));
const touch=profile==='touch',result={url,profile,method:'Visible native Chrome; default auto quality, original RAF, stationary normal UI entry twice. First context cold, second dive same spawn in same context after home; adaptive resolution can differ and is recorded, so not fixed-workload A/B. Wrappers preserve all arguments and returns. Three GPU-sampled frames per segment at most, queries read after the segment. CPU timings include render entry, stream update and resize allocation separately.',segments:[],errors:[]};
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?{n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)}:null;};
let browser,page;
(async()=>{
 try{
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  await page.waitForFunction(()=>!renderer.sceneStream?.waitStarted&&(!renderer.sceneStream||renderer.sceneStream.jobs.size===0));
  result.metadata=await page.evaluate(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,adaptive:settings.adaptive,quality:renderer.quality};});
  assert(result.metadata.adaptive&&result.metadata.renderer&&!/swiftshader|software|llvmpipe/i.test(result.metadata.renderer));
  await page.evaluate(()=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2');
   const probe=window.__startupProbe={segment:null,frame:null,ext,g,restores:[],pending:[],inResize:false};
   const read=()=>({at:performance.now(),active,modal,p:player.p.slice(),eye:eye.slice(),yaw:player.yaw,pitch:player.pitch,t,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,pendingResize:!!renderer.pendingResize,streamWaiting:!!renderer.sceneStream?.waitStarted,streamJobs:renderer.sceneStream?.jobs.size||0,hidden:document.hidden,focused:document.hasFocus()});
   const wrap=(owner,key,callback)=>{const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key);owner[key]=callback(original);probe.restores.push(()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key];});};
   const timed=(owner,key,field)=>wrap(owner,key,original=>function(...args){const start=performance.now();try{return Reflect.apply(original,this,args);}finally{if(probe.frame)probe.frame[field]=(probe.frame[field]||0)+performance.now()-start;else if(probe.segment)probe.segment.events.push({kind:field,at:start,duration:performance.now()-start});}});
   wrap(renderer,'resize',original=>function(...args){const start=performance.now();probe.inResize=true;try{return Reflect.apply(original,this,args);}finally{probe.inResize=false;if(probe.frame)probe.frame.resizeMs=performance.now()-start;else if(probe.segment)probe.segment.events.push({kind:'resizeMs',at:start,duration:performance.now()-start});}});
   for(const key of ['texStorage2D','renderbufferStorageMultisample','checkFramebufferStatus','getInternalformatParameter','getError','deleteFramebuffer','deleteRenderbuffer','deleteTexture'])wrap(g,key,original=>function(...args){if(!probe.inResize||!probe.frame)return Reflect.apply(original,this,args);const start=performance.now();try{return Reflect.apply(original,this,args);}finally{(probe.frame.resizeCalls??=[]).push({name:key,ms:performance.now()-start});}});
   if(renderer.sceneStream)timed(renderer.sceneStream,'update','streamMs');
   const life=updateLife;updateLife=function(...args){const start=performance.now();try{return Reflect.apply(life,this,args);}finally{if(probe.segment)probe.segment.events.push({kind:'lifeMs',at:start,duration:performance.now()-start});}};probe.restores.push(()=>{updateLife=life;});
   wrap(renderer,'render',original=>function(...args){
    const s=probe.segment;if(!s)return Reflect.apply(original,this,args);
    const frame=probe.frame={id:s.frames.length,before:read(),rendererFrame:this.frame},start=performance.now();
    const query=ext&&s.gpuFrames<3&&start-s.start>=s.gpuFrames*7000+500&&!this.pendingResize&&!this.sceneStream?.waitStarted?g.createQuery():null;
    if(query){s.gpuFrames++;frame.gpuSample=true;g.beginQuery(ext.TIME_ELAPSED_EXT,query);}
    try{return Reflect.apply(original,this,args);}
    finally{if(query){g.endQuery(ext.TIME_ELAPSED_EXT);probe.pending.push({query,frame:frame.id,at:start-s.start,resolution:frame.before.resolution});}frame.renderMs=performance.now()-start;frame.cpuRenderMs=this.cpuRenderMs;frame.after=read();frame.submitted=this.frame-frame.rendererFrame;frame.draws=this.drawCalls;frame.triangles=this.submittedTriangles;frame.shadows=this.shadowDraws;s.frames.push(frame);probe.frame=null;}
   });
   probe.begin=label=>{if(probe.segment)throw Error('Overlapping startup probe');probe.segment={label,start:performance.now(),before:read(),frames:[],events:[],gpuFrames:0};};
   probe.end=()=>{const s=probe.segment;s.after=read();s.elapsedMs=performance.now()-s.start;const disjoint=ext?g.getParameter(ext.GPU_DISJOINT_EXT):null;s.gpu=probe.pending.map(({query,...q})=>{const available=g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE);const row={...q,status:disjoint?'disjoint':available?'available':'not-ready',ms:available&&!disjoint?g.getQueryParameter(query,g.QUERY_RESULT)/1e6:null};g.deleteQuery(query);return row;});probe.pending=[];s.gl=g.getError();s.contextLost=g.isContextLost();probe.segment=null;return s;};
   probe.restore=()=>{for(const restore of probe.restores.reverse())restore();};
  });
  await page.waitForTimeout(3400);
  for(const label of ['cold-dive','warm-dive']){
   await page.evaluate(label=>__startupProbe.begin(label),label);
   if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
   await page.waitForFunction(()=>active&&!modal);await page.waitForTimeout(20000);
   const s=await page.evaluate(()=>__startupProbe.end());
   s.summary={renderMs:stats(s.frames.map(f=>f.renderMs)),cpuRenderMs:stats(s.frames.map(f=>f.cpuRenderMs)),resizeMs:stats(s.frames.map(f=>f.resizeMs)),streamMs:stats(s.frames.map(f=>f.streamMs)),lifeMs:stats(s.events.filter(e=>e.kind==='lifeMs').map(e=>e.duration)),frameMs:stats(s.frames.slice(1).map((f,i)=>f.before.at-s.frames[i].before.at))};
   result.segments.push(s);assert.equal(s.gl,0);assert.equal(s.contextLost,false);assert(s.frames.every(f=>!f.before.hidden&&f.before.focused));assert(s.frames.some(f=>f.before.active));
   console.log(JSON.stringify({label,frames:s.frames.length,...s.summary,gpu:s.gpu}));
   await page.screenshot({path:output.replace(/\.json$/,'-'+label+'.png')});
   if(label==='cold-dive'){if(touch){await page.locator('#pauseBtn').tap();await page.locator('#menuHome').tap();}else{await page.locator('#pauseBtn').click();await page.locator('#menuHome').click();}await page.waitForFunction(()=>!active&&!modal);await page.waitForTimeout(1800);}
  }
  await page.evaluate(()=>__startupProbe.restore());assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(error){result.status='failed';result.failure=error.stack;throw error;}
 finally{await browser?.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
