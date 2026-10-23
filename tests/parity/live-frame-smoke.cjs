/* Continuous real RAF + real WebGL, separate from CPU-only timings and fixed
 * screenshots. Small software-GPU viewports are not device FPS measurements.
 * Input is a held movement fixture; touch gestures are covered separately. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(s=>/^https?:/.test(s))||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[],errors=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:240,height:320}:{width:320,height:240},deviceScaleFactor:1,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,reduced:true,startWithSound:false}})));
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();await page.bringToFront();
  await page.evaluate(()=>{
   window.__liveFrames=[];window.__liveStart={p:player.p.slice(),t,frame:renderer.frame,focus:document.hasFocus()};
   const record=oceanPerf.record;oceanPerf.record=function(ms,cpu){record.call(this,ms,cpu);__liveFrames.push({ms,cpu,t,frame:renderer.frame,p:player.p.slice(),animal:allLife[0].p.slice()});if(__liveFrames.length>=6){window.__freeze=true;keys.clear();}};
   resetInput();stopAuto();keys.add('KeyW');window.__freeze=false;lastTime=performance.now();
  });
  await page.waitForFunction(()=>__liveFrames.length>=6,null,{timeout:120000});
  const row=await page.evaluate(()=>({start:__liveStart,frames:__liveFrames,gl:renderer.gl.getError(),quality:renderer.quality,scale:renderer.dynamicScale,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,contextLost:renderer.gl.isContextLost()}));
  assert.equal(row.start.focus,true);assert.equal(row.gl,0);assert.equal(row.contextLost,false);assert.equal(row.compiled,true);assert.equal(row.streamed,true);assert.equal(row.quality,2);assert.equal(row.scale,1);
  assert.equal(row.frames.length,6);for(let i=1;i<row.frames.length;i++){assert(row.frames[i].ms>row.frames[i-1].ms);assert(row.frames[i].t>row.frames[i-1].t);assert(row.frames[i].frame>row.frames[i-1].frame);}
  assert(Math.hypot(...row.frames.at(-1).p.map((v,i)=>v-row.start.p[i]))>.01,'Real rendered movement must advance');assert.notDeepEqual(row.frames[0].animal,row.frames.at(-1).animal,'Actual animals must animate');
  rows.push({touch,...row});console.log('PASS '+(touch?'touch profile':'desktop')+' six actual RAF/WebGL frames with continuous swimming and animal motion');await context.close();
 }}finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/live-frame-smoke.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,method:'Unfrozen application RAF and real renderer, six consecutive frames per profile, held movement fixture, no render spy or forced frame timestamps. Software GPU; not physical-device FPS or touch-input certification.',rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
