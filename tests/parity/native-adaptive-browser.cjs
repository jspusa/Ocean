/* Real rendered slow frames drive the unchanged adaptive controller on a
 * high-DPR viewport. This is a framebuffer response check, not a phone FPS claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs')(true)),errors=[];let result;
 try{const context=await browser.newContext({viewport:{width:3840,height:2160},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
  await page.evaluate(async()=>{settings.adaptive=true;await __prepareView([0,-8,7],[0,-8,-10],8);oceanPerf.resetSamples();});await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0);await page.bringToFront();
  result=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now(),initial=[renderer.canvas.width,renderer.canvas.height],old=oceanPerf.record,changes=[],frames=[];let last=renderer.dynamicScale;
   oceanPerf.record=function(ms,cpu){
    const pending=changes.at(-1);if(pending&&!pending.applied)pending.applied=[renderer.canvas.width,renderer.canvas.height];
    old.call(this,ms,cpu);frames.push(ms);if(last!==renderer.dynamicScale){const g=renderer.gl,p=new Uint8Array(32*32*4);g.bindFramebuffer(g.FRAMEBUFFER,null);g.readPixels(Math.floor(renderer.canvas.width/2)-16,Math.floor(renderer.canvas.height/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,p);let maxRGB=0;for(let i=0;i<p.length;i++)if(i%4!==3)maxRGB=Math.max(maxRGB,p[i]);changes.push({afterMs:performance.now()-start,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],maxRGB});last=renderer.dynamicScale;}if(performance.now()-start<24000)return;window.__freeze=true;oceanPerf.record=old;resolve({initial,changes,quality:renderer.quality,adaptive:settings.adaptive,msaa:renderer.msaaSamples,frames:frames.length,gl:renderer.gl.getError()});};keys.add('KeyW');window.__freeze=false;lastTime=performance.now();
  }));
  assert.equal(result.gl,0);assert.equal(result.adaptive,true);assert.equal(result.quality,2);assert.equal(result.msaa,4);assert.deepEqual(result.initial,[3771,2121]);assert(result.frames>100);
  assert(result.changes.length>0,'This high-DPR stress view must exercise an actual adaptive change');for(const step of result.changes){assert(step.maxRGB>10,'Adaptive change must preserve the current swimming frame');assert.deepEqual(step.applied,result.initial.map(n=>Math.round(n*step.scale)),'Real GL targets must follow every actual adaptive change on the next render');}console.log(JSON.stringify(result));
 }finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/native-adaptive-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,result,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
