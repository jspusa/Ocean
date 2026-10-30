/* Current production turtle portrait for the catalogue, not a habitat photo.
 * Run only after the actual-world visual acceptance; root serializes GPU work. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');let browser;
(async()=>{try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
 const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8765/?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  window.__freeze=true;settings.adaptive=false;active=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();
  const actor=life.find(f=>f.uid==='turtle-002'),batch=renderer.batches.find(b=>b.instances.includes(actor)&&!(b.minDistance>0));
  if(!actor||!batch||batch.count!==turtleGeometry().v.length/12)throw Error('Current compiled turtle required');
  actor.p=[0,-6,0];actor.yaw=0;actor.pitch=0;actor.ecologyPresent=true;batch.instances=[actor];
  const eye=[1.9,-4.9,3.3],target=[0,-6,0];renderer.photoFov=30;renderer.photoNear=.08;renderer.lamp=false;renderer.lighting='day';renderer.forceShadow=true;
  await renderer.sceneStream.ready(eye);for(const b of renderer.batches)b.visible=b===batch;
  for(let i=0;i<5;i++){await new Promise(r=>requestAnimationFrame(r));renderer.render(eye,target,6);}
  return {uid:actor.uid,version:document.documentElement.dataset.version,triangles:batch.count/3,drawCount:batch.drawCount,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),method:'Actual current production turtle mesh/material in an isolated catalogue portrait; original instance scale and phenotype. No external wildlife photograph.',image:renderer.canvas.toDataURL('image/jpeg',.93)};
 });
 assert.equal(result.uid,'turtle-002');assert.equal(result.triangles,12970);assert.equal(result.drawCount,1);assert.equal(result.gl,0);assert.equal(result.lost,false);
 const bytes=Buffer.from(result.image.split(',')[1],'base64');delete result.image;result.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(root,'assets/guide_turtle.jpg'),bytes);fs.writeFileSync(path.join(root,'qa/parity/v01845-turtle/guide.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
