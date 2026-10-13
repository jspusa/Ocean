// These thumbnails are original in-game geometry in an isolated WebGL studio.
// This fixture is not a claim about natural play, habitat density or camera scale.
import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;
try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const browser=await pw.chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});
 await page.goto(process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/?still');await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 await page.evaluate(()=>{settings.third=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();window.guideOriginal=renderer.batches.map(b=>({b,instances:b.instances}));});
 const indices=await page.evaluate(abyssOnly=>SPECIES.map((s,i)=>s.fauna&&(!abyssOnly||s.abyss)?i:-1).filter(i=>i>=0),process.argv.includes('--abyss'));
 for(const i of indices){
  const data=await page.evaluate(i=>{
   for(const a of guideOriginal){a.b.instances=a.instances;a.b.visible=false;}
   const f=life.find(f=>f.species===i),sp=SPECIES[i],batch=renderer.batches.find(b=>(b.kind===8||b.kind===9||b.kind===10)&&b.species===i&&!(b.minDistance>0));
   batch.instances=[f];batch.visible=true;f.p=[0,-6,0];f.yaw=.08;f.pitch=0;f.bank=0;f.phase=0;f.faunaVisibility=1;f.retreat=0;
   const center=animalFocusPoint(f),span=sp.modelBounds.size,d=Math.max(span[1],span[0]/(640/360),span[2])*sp.size*1.8;
   renderer.photoNear=sp.cetacean?.16:.002;renderer.photoFov=40;renderer.photoAperture=0;renderer.forceShadow=true;
   // The crab's three-metre measure is its lateral leg span. A raised oblique
   // camera separates those limbs; a side-on portrait hid half of the anatomy.
   const offset=sp.id==='japanese_spider_crab'?V.mul(V.norm([.70,.48,.70]),sp.size*1.27):sp.id==='humpback_anglerfish'?[d*.62,d*.20,d*.85]:[d*.12,d*.15,d];
   renderer.render(V.add(center,offset),center,0);
   return {id:sp.id,image:renderer.canvas.toDataURL('image/jpeg',.93),gl:renderer.gl.getError(),drawn:batch.drawCount};
  },i);
  if(data.gl||data.drawn!==1)throw Error('Guide render failed: '+data.id);
  await writeFile('assets/guide_'+data.id+'.jpg',Buffer.from(data.image.split(',')[1],'base64'));console.log('PASS original WebGL guide '+data.id);
 }
}finally{await browser.close();}
