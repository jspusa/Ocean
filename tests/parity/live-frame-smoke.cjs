/* Continuous real RAF + real WebGL, separate from CPU-only timings and fixed
 * screenshots. Small software-GPU viewports are not device FPS measurements.
 * Input is a held movement fixture; touch gestures are covered separately. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(s=>/^https?:/.test(s))||'http://127.0.0.1:8000/';
const expectedVersion=process.argv.find(s=>s.startsWith('--expected-version='))?.slice(19)||fs.readFileSync(path.resolve(__dirname,'../../VERSION'),'utf8').trim();
(async()=>{
 const browser=await pw.chromium.launch(require('./browser-launch.cjs')());
 const rows=[],errors=[],networkFailures=[],consoleMessages=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:240,height:320}:{width:320,height:240},deviceScaleFactor:1,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>{if(networkFailures.length<40)networkFailures.push({touch,url:r.url(),error:r.failure()?.errorText});});
  page.on('response',r=>{if(r.status()>=400&&networkFailures.length<40)networkFailures.push({touch,url:r.url(),status:r.status()});});
  page.on('console',m=>{if(['warning','error'].includes(m.type())&&consoleMessages.length<40)consoleMessages.push({touch,type:m.type(),text:m.text()});});
  await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,reduced:true,startWithSound:false}})));
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();await page.bringToFront();
  await page.evaluate(()=>{
   window.__liveFrames=[];window.__liveStart={p:player.p.slice(),t,frame:renderer.frame,focus:document.hasFocus()};
   const record=oceanPerf.record;oceanPerf.record=function(ms,cpu){record.call(this,ms,cpu);__liveFrames.push({ms,cpu,t,frame:renderer.frame,p:player.p.slice(),animal:allLife[0].p.slice()});if(__liveFrames.length>=6){window.__freeze=true;keys.clear();}};
   resetInput();stopAuto();keys.add('KeyW');window.__freeze=false;lastTime=performance.now();
  });
  await page.waitForFunction(()=>__liveFrames.length>=6,null,{timeout:120000});
  const row=await page.evaluate(()=>({version:document.documentElement.dataset.version,start:__liveStart,frames:__liveFrames,gl:renderer.gl.getError(),quality:renderer.quality,scale:renderer.dynamicScale,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,sceneLoad:renderer.sceneLoad,contextLost:renderer.gl.isContextLost()}));
  rows.push({touch,...row});
  assert.equal(row.version,expectedVersion,'Live frames must belong to the requested release');
  assert.equal(row.start.focus,true);assert.equal(row.gl,0);assert.equal(row.contextLost,false);assert.equal(row.compiled,true);assert.equal(row.streamed,true);assert.equal(row.quality,2);assert.equal(row.scale,1);
  assert.equal(row.frames.length,6);for(let i=1;i<row.frames.length;i++){assert(row.frames[i].ms>row.frames[i-1].ms);assert(row.frames[i].t>row.frames[i-1].t);assert(row.frames[i].frame>row.frames[i-1].frame);}
  assert(Math.hypot(...row.frames.at(-1).p.map((v,i)=>v-row.start.p[i]))>.01,'Real rendered movement must advance');assert.notDeepEqual(row.frames[0].animal,row.frames.at(-1).animal,'Actual animals must animate');
  console.log('PASS '+(touch?'touch profile':'desktop')+' six actual RAF/WebGL frames with continuous swimming and animal motion');await context.close();
 }}finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/live-frame-smoke.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,expectedVersion,gpuMode:process.env.NATIVE_GPU==='1'?'native':'software',method:'Unfrozen application RAF and real renderer, six consecutive frames per profile, held movement fixture, no render spy or forced frame timestamps. Six-frame smoke check; not a device FPS benchmark or touch-input certification. Bounded network/console diagnostics and both profile rows are retained even if a streaming assertion fails.',rows,errors,networkFailures,consoleMessages},null,2));}
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
