/* Native GL pixels at the actual record -> resize -> next render boundary.
 * Injected slow samples exercise adaptation deterministically; actual viewport
 * changes then exercise production resize listeners, including a blocked real
 * region fetch. This is not FPS data or physical-phone orientation evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
// Compositor screenshots retain the displayed canvas even though WebGL was
// created with preserveDrawingBuffer:false. Reading its default framebuffer
// after a browser event can legitimately return zeros; do not mistake that
// readback lifetime for a player-visible black flash.
async function presentedPixels(page,touch,label){
 const viewport=page.viewportSize(),clip={x:Math.floor(viewport.width/2)-16,y:Math.floor(viewport.height/2)-16,width:32,height:32};
 const png=await page.screenshot({clip,path:path.resolve(__dirname,'../../qa/parity',`resize-${touch?'touch':'desktop'}-${label}.png`)});
 return page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;let max=0,sum=0;for(let i=0;i<pixels.length;i++)if(i%4!==3){max=Math.max(max,pixels[i]);sum+=pixels[i];}return {max,mean:sum/(canvas.width*canvas.height*3),pixels:canvas.width*canvas.height};},png.toString('base64'));
}
async function actualResizeEvents(page,touch){
 await page.evaluate(touch=>{
  // Restore the original quality for this separate event-driven case.
  renderer.quality=touch?1:2;renderer.dynamicScale=1;renderer.resize();renderer.render(eye,target,t);
  window.__presentationResizeEvents=[];
  const capture=event=>__presentationResizeEvents.push({type:event.type,trusted:event.isTrusted,viewport:[innerWidth,innerHeight],canvas:[renderer.canvas.width,renderer.canvas.height],pending:renderer.pendingResize===true,frame:renderer.frame});
  window.addEventListener('resize',capture);visualViewport?.addEventListener('resize',capture);
  window.__presentationState=()=>({viewport:[innerWidth,innerHeight],canvas:[renderer.canvas.width,renderer.canvas.height],pending:renderer.pendingResize===true,frame:renderer.frame,waiting:!!renderer.sceneStream?.waitStarted,jobs:renderer.sceneStream?.jobs.size||0,events:__presentationResizeEvents.slice(),gl:renderer.gl.getError(),lost:renderer.gl.isContextLost()});
 },touch);
 const before={state:await page.evaluate(()=>__presentationState()),pixels:await presentedPixels(page,touch,'before-event')};
 const size=touch?{width:844,height:390}:{width:1040,height:720};
 // This exercises both production window/visualViewport listeners. No direct
 // renderer.resize() call or replacement is allowed in the measured interval.
 await page.setViewportSize(size);
 await page.waitForFunction(size=>innerWidth===size.width&&innerHeight===size.height&&__presentationResizeEvents.some(e=>e.trusted&&e.viewport[0]===size.width&&e.viewport[1]===size.height),size);
 const queued={state:await page.evaluate(()=>__presentationState()),pixels:await presentedPixels(page,touch,'queued-event')};
 const next=await page.evaluate(()=>{const rendered=renderer.render(eye,target,t);return {rendered,state:__presentationState()};});next.pixels=await presentedPixels(page,touch,'event-rendered');
 // Keep an actual cold region request outstanding while changing dimensions
 // again. The real SceneStream.update readiness gate remains intact.
 let releaseNetwork,firstBlocked;const release=new Promise(r=>releaseNetwork=r),blocked=new Promise(r=>firstBlocked=r),blockedURLs=[];
 const routeHandler=async route=>{blockedURLs.push(route.request().url());firstBlocked();await release;await route.continue().catch(()=>{});};
 await page.route('**/assets/scene/chunk-*.bin.gz',routeHandler);
 let pending,waiting,committed,cold;
 try{
  cold=await page.evaluate(()=>{
   const options=[{p:[600,-8,-90],aim:[600,-8,-100]},{p:[766,-700,-90],aim:[770,-700,-100]},{p:[766,-7000,-120],aim:[776,-7001.8,-130]}];
   const view=options.find(v=>[...renderer.sceneStream.needed(v.p)].some(id=>!renderer.sceneStream.meshes[id].resident));if(!view)throw Error('Fixture requires an actual nonresident region; no fake readiness gate');
   const missing=[...renderer.sceneStream.needed(view.p)].filter(id=>!renderer.sceneStream.meshes[id].resident).length;
   __renderView(view.p,view.aim,8);const held=renderer.render(eye,target,t);return {view,missing,held,state:__presentationState()};
  });
  await Promise.race([blocked,new Promise((_,reject)=>setTimeout(()=>reject(Error('No actual scene request intercepted')),15000))]);
  await page.waitForFunction(()=>renderer.sceneStream.jobs.size>0&&renderer.sceneStream.waitStarted>0);
  pending={state:await page.evaluate(()=>__presentationState()),pixels:await presentedPixels(page,touch,'region-pending')};
  const secondSize=touch?{width:390,height:844}:{width:1280,height:768};
  await page.setViewportSize(secondSize);
  await page.waitForFunction(size=>innerWidth===size.width&&innerHeight===size.height&&__presentationResizeEvents.some(e=>e.trusted&&e.viewport[0]===size.width&&e.viewport[1]===size.height),secondSize);
  waiting=await page.evaluate(()=>{const rendered=renderer.render(eye,target,t);return {rendered,state:__presentationState()};});waiting.pixels=await presentedPixels(page,touch,'rotated-region-pending');
  releaseNetwork();await page.evaluate(async()=>{await renderer.sceneStream.ready(eye);});
  committed=await page.evaluate(()=>{const rendered=renderer.render(eye,target,t);return {rendered,state:__presentationState(),compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed};});committed.pixels=await presentedPixels(page,touch,'region-committed');
  return {before,queued,next,cold,pending,waiting,committed,size,secondSize,blockedRequests:blockedURLs.length};
 }finally{releaseNetwork();await page.unroute('**/assets/scene/chunk-*.bin.gz',routeHandler);}
}
function assertActualEvents(row){
 const e=row.events,label=row.touch?'touch':'desktop';
 assert(e.queued.state.events.some(x=>x.trusted),'real resize listener did not run');
 assert.deepEqual(e.queued.state.viewport,[e.size.width,e.size.height]);assert(e.queued.state.pending);
 assert.deepEqual(e.queued.state.canvas,e.before.state.canvas);assert.equal(e.queued.state.frame,e.before.state.frame);
 assert.notEqual(e.next.rendered,false);assert(!e.next.state.pending);assert.deepEqual(e.next.state.canvas,[e.size.width,e.size.height]);assert(e.next.state.frame>e.before.state.frame);
 assert(e.cold.missing>0&&e.blockedRequests>0);assert.equal(e.cold.held,false);assert(e.pending.state.jobs>0&&e.pending.state.waiting);
 assert.equal(e.waiting.rendered,false);assert(e.waiting.state.waiting&&e.waiting.state.jobs>0&&e.waiting.state.pending);
 assert.deepEqual(e.waiting.state.viewport,[e.secondSize.width,e.secondSize.height]);assert.deepEqual(e.waiting.state.canvas,e.next.state.canvas);assert.equal(e.waiting.state.frame,e.next.state.frame);
 assert.notEqual(e.committed.rendered,false);assert(!e.committed.state.pending);assert.deepEqual(e.committed.state.canvas,[e.secondSize.width,e.secondSize.height]);assert(e.committed.state.frame>e.waiting.state.frame);assert(e.committed.compiled&&e.committed.streamed);
 for(const name of ['before','queued','next','pending','waiting'])assert(e[name].pixels.max>10&&e[name].pixels.mean>1,`${label} ${name}: actually presented frame became black`);
 // The cold region may genuinely be deep/dark. Its completion is tested by
 // resident geometry, render/frame advancement and GL, not a brightness target.
 for(const name of ['before','queued','next','pending','waiting','committed']){assert.equal(e[name].state.gl,0);assert(!e[name].state.lost);}
}

(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs')(true)),rows=[],errors=[];fs.mkdirSync(path.resolve(__dirname,'../../qa/parity'),{recursive:true});
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},deviceScaleFactor:1,hasTouch:touch,isMobile:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
  await page.evaluate(async()=>{await __prepareView([0,-8,7],[0,-8,-10],8);settings.adaptive=true;});await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0);
  rows.push({touch,...await page.evaluate(()=>{
   const g=renderer.gl,measure=()=>{g.bindFramebuffer(g.FRAMEBUFFER,null);const p=new Uint8Array(32*32*4);g.readPixels(Math.floor(renderer.canvas.width/2)-16,Math.floor(renderer.canvas.height/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,p);let max=0,sum=0;for(let i=0;i<p.length;i++)if(i%4!==3){max=Math.max(max,p[i]);sum+=p[i];}return {max,mean:sum/3072,size:[renderer.canvas.width,renderer.canvas.height]};};
   renderer.render(eye,target,t);const before=measure(),scale=renderer.dynamicScale;oceanPerf.resetSamples();oceanPerf.lastAdaptive=0;
   for(let i=1;i<=92;i++)oceanPerf.record(i*1000/30,1);
   const adapted=measure(),newScale=renderer.dynamicScale,stream=renderer.sceneStream;
   // A chunk wait must not commit pending canvas dimensions or erase the old frame.
   renderer.sceneStream={update:()=>false};const held=renderer.render(eye,target,t),waiting=measure();renderer.sceneStream=stream;
   renderer.render(eye,target,t);const next=measure();
   renderer.dynamicScale=1;renderer.resize();const recovery=measure();renderer.render(eye,target,t);const restored=measure();
   // Browser resize/manual-quality callers use this same public entry point.
   renderer.quality=0;renderer.resize();const quality=measure();renderer.render(eye,target,t);const qualityNext=measure();
   return {before,adapted,waiting,next,recovery,restored,quality,qualityNext,scale,newScale,held,gl:g.getError()};
  })});rows.at(-1).events=await actualResizeEvents(page,touch);assertActualEvents(rows.at(-1));await context.close();
 }
 }finally{await browser.close();fs.mkdirSync(path.resolve(__dirname,'../../qa/parity'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../qa/parity/resize-presentation.json'),JSON.stringify({url,rows,errors},null,2));}
 console.log(JSON.stringify(rows));assert.deepEqual(errors,[]);
 for(const row of rows){assert(row.newScale<row.scale);assert.equal(row.gl,0);assert.equal(row.held,false);for(const key of ['before','adapted','waiting','next','recovery','restored','quality','qualityNext'])assert(row[key].max>10,`${row.touch?'touch':'desktop'} ${key}: a rendered swimming frame became black`);assert.deepEqual(row.adapted.size,row.before.size);assert.deepEqual(row.waiting.size,row.before.size);assert.deepEqual(row.next.size,row.before.size.map(n=>Math.round(n*row.newScale)));assert.deepEqual(row.recovery.size,row.next.size);assert.deepEqual(row.restored.size,row.before.size);assert.notDeepEqual(row.qualityNext.size,row.restored.size);}
 console.log('PASS native desktop/touch presentation survives adaptation, recovery, quality changes, actual resize/orientation events and delayed real region requests');
})().catch(e=>{console.error(e);process.exitCode=1;});
