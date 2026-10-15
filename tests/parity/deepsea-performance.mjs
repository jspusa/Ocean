/* Actual public research-station entry and active automatic quality. Chrome
 * touch emulation is not a phone GPU benchmark. Exclusive GPU, no scene edits. */
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const touch=process.argv.includes('--touch'),url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/',browser=await pw.chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
try{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:90000});await page.locator('#welcomeAudio').uncheck();
 for(const station of ['midwater','slope','hadal']){
  await page.locator('#shipResearch [data-feature="deepsea"]').click();await page.locator('[data-deepsea-station="'+station+'"]').click();await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));await page.waitForTimeout(1500);
  await page.keyboard.press('KeyV');await page.waitForTimeout(500);const vehicle=await page.evaluate(()=>({shown:oceanDeepsea.snapshot().vehicle,diver:diverBatch.visible,drawn:renderer.batches.find(b=>b.sceneRole==='vehicle:research')?.drawCount,gl:renderer.gl.getError()}));if(!vehicle.shown||vehicle.diver||vehicle.drawn!==1||vehicle.gl)throw Error('Research third-person vehicle did not render: '+JSON.stringify(vehicle));await page.screenshot({path:'qa/parity/deepsea-vehicle-'+(touch?'touch':'desktop')+'-'+station+'.png'});await page.keyboard.press('KeyV');await page.waitForTimeout(500);
  const result=await page.evaluate(()=>new Promise((resolve,reject)=>{
   if(!settings.adaptive||window.__freeze||oceanPerf.benchmark)return reject(Error('Automatic live rendering required'));
   const previous=oceanPerf.record,frames=[],start=performance.now(),initial={quality:renderer.quality,scale:renderer.dynamicScale,p:player.p.slice()};
   const timeout=setTimeout(()=>{oceanPerf.record=previous;reject(Error('Live frame measurement timed out'));},30000);
   oceanPerf.record=function(...args){previous.apply(this,args);frames.push({at:performance.now(),cpu:args[1]});if(performance.now()-start<20000)return;clearTimeout(timeout);oceanPerf.record=previous;
    const intervals=frames.slice(1).map((x,i)=>x.at-frames[i].at),sorted=intervals.slice().sort((a,b)=>a-b),elapsed=intervals.reduce((a,b)=>a+b,0),ext=renderer.gl.getExtension('WEBGL_debug_renderer_info');
    resolve({version:OPEN_WORLD.version,station:oceanDeepsea.current().id,initial,final:{quality:renderer.quality,scale:renderer.dynamicScale,p:player.p.slice(),adaptive:settings.adaptive,resolution:[renderer.canvas.width,renderer.canvas.height]},durationMs:elapsed,frames:intervals.length,averageFPS:1000*intervals.length/elapsed,p95FrameMs:sorted[Math.floor(sorted.length*.95)],gl:renderer.gl.getError(),contextLost:renderer.gl.isContextLost(),renderer:ext?renderer.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',intervals});
   };
  }));results.push(result);console.log('PASS '+station+' '+result.averageFPS.toFixed(1)+' FPS / P95 '+result.p95FrameMs.toFixed(1)+' ms');
  await page.locator('#homeBtn').click();await page.locator('#debriefClose').click();
 }
 await context.close();
}catch(error){errors.push(error.stack);console.error(error.stack);}finally{await browser.close();await writeFile('qa/parity/deepsea-performance-'+(touch?'touch':'desktop')+'.json',JSON.stringify({url,touch,note:'Actual 20 second live RAF intervals per public station. Automatic quality enabled. Touch is Chrome emulation on the same computer.',results,errors},null,2));}
if(errors.length||results.length!==3||results.some(r=>r.gl||r.contextLost||!r.final.adaptive||r.frames<100||r.durationMs<19000))process.exitCode=1;
