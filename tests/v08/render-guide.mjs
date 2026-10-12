import {homedir} from 'node:os';
// Current original models rendered in an isolated WebGL viewing fixture.
import {createRequire} from 'node:module';import{writeFile}from'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const browser=await pw.chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:8765/?still');await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
await page.evaluate(()=>{settings.third=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();window.guideOriginal=renderer.batches.map(b=>({b,instances:b.instances}));});
for(let i=0;i<12;i++){
 const data=await page.evaluate(i=>{for(const a of guideOriginal){a.b.instances=a.instances;a.b.visible=false;}const f=life.find(f=>f.species===i),batch=renderer.batches.find(b=>b.dynamic&&b.instances.includes(f)&&!(b.minDistance>0));batch.instances=[f];batch.visible=true;f.p=[0,-6,0];f.yaw=.08;f.pitch=0;f.bank=0;f.phase=1.2;f.effort=.45;const radius=batch.radius*Math.max(...f.s),distance=radius*1.55;renderer.forceShadow=true;renderer.render([distance*.12,-6+distance*.12,distance],[i===10?-1:0,-6,0],6);return {id:SPECIES[i].id,image:renderer.canvas.toDataURL('image/jpeg',.91),gl:renderer.gl.getError()};},i);
 if(data.gl)throw new Error('GL error for '+data.id);await writeFile('assets/guide_'+data.id+'.jpg',Buffer.from(data.image.split(',')[1],'base64'));console.log(data.id);
}await browser.close();
