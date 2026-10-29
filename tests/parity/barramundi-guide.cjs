/* Actual production mesh/material in an isolated catalogue portrait.
 * Deliberately a model illustration, not an underwater habitat photograph. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');let browser;
(async()=>{try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
 const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#startBtn').click();await page.waitForFunction(()=>oceanBarramundi.status(renderer).ready,null,{timeout:20000});
 const result=await page.evaluate(async()=>{
  window.__freeze=true;settings.adaptive=false;active=false;settings.third=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();
  const actor=life.find(f=>f.barramundi),batch=renderer.batches.find(b=>b.instances.includes(actor));
  actor.p=[0,-6,0];actor.yaw=.08;actor.pitch=0;actor.bank=0;actor.effort=.45;actor.ecologyPresent=true;
  const eye=[.05,-5.92,.85],target=[0,-6,0];renderer.photoFov=40;renderer.photoNear=.002;renderer.lamp=false;renderer.lighting='day';renderer.forceShadow=true;await renderer.sceneStream?.ready(eye);
  for(const b of renderer.batches)b.visible=b===batch;
  for(let i=0;i<5;i++){await new Promise(r=>requestAnimationFrame(r));renderer.render(eye,target,6);}
  return {uid:actor.uid,version:document.documentElement.dataset.version,triangles:batch.count/3,drawCount:batch.drawCount,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),asset:oceanBarramundi.status(renderer),image:renderer.canvas.toDataURL('image/jpeg',.93)};
 });
 assert.equal(result.uid,'barramundi-001');assert.equal(result.triangles,3864);assert.equal(result.drawCount,1);assert.equal(result.gl,0);assert.equal(result.lost,false);
 const bytes=Buffer.from(result.image.split(',')[1],'base64');delete result.image;result.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(root,'assets/guide_barramundi.jpg'),bytes);fs.writeFileSync(path.join(root,'qa/parity/v01843-textured-fauna/guide.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
