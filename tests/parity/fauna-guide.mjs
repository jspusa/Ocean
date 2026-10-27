// These thumbnails are original in-game geometry in an isolated WebGL studio.
// The isolated studio includes every species regardless of wild season.
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
 const speciesAt=process.argv.indexOf('--species'),speciesId=speciesAt<0?null:process.argv[speciesAt+1];
 if(speciesAt>=0&&(!speciesId||speciesId.startsWith('--')))throw Error('--species requires one catalogue id');
 const indices=await page.evaluate(({abyssOnly,speciesId})=>SPECIES.map((s,i)=>s.fauna&&(!abyssOnly||s.abyss)&&(!speciesId||s.id===speciesId)?i:-1).filter(i=>i>=0),{abyssOnly:process.argv.includes('--abyss'),speciesId});
 if(!indices.length)throw Error('No original fauna matches requested guide filter');
 for(const i of indices){
  const data=await page.evaluate(i=>{
   for(const a of guideOriginal){a.b.instances=a.instances;a.b.visible=false;}
   const f=life.find(f=>f.species===i),sp=SPECIES[i],batch=renderer.batches.find(b=>(b.kind===8||b.kind===9||b.kind===10||b.kind===11)&&b.species===i&&!(b.minDistance>0));
   batch.instances=[f];batch.visible=true;f.ecologyPresent=true;f.p=[0,-6,0];f.yaw=sp.id==='dumbo_octopus'?-Math.PI/2+.12:.08;f.pitch=0;f.bank=0;f.phase=0;f.faunaVisibility=1;f.retreat=0;
   const center=animalFocusPoint(f),span=sp.modelBounds.size,d=Math.max(span[1],span[0]/(640/360),span[2])*sp.size*1.8;
   renderer.photoNear=sp.cetacean?.16:.002;renderer.photoFov=40;renderer.photoAperture=0;renderer.forceShadow=true;
   // Deep-sea portraits use the same camera-mounted lamp as their encounter,
   // so black tissue and forward-facing fins remain readable in the catalogue.
   renderer.lamp=sp.id==='tripod_fish'||sp.id==='dumbo_octopus';
   // The crab's three-metre measure is its lateral leg span. A raised oblique
   // camera separates those limbs; a side-on portrait hid half of the anatomy.
   const offset=sp.id==='japanese_spider_crab'?V.mul(V.norm([.70,.48,.70]),sp.size*1.27):sp.id==='humpback_anglerfish'?[d*.62,d*.20,d*.85]:[d*.12,d*.15,d];
   // Narrow framing repair: these old meshes have thin animated extremities
   // close to the static crop; retain their full silhouette at the same metres.
   const margin=['pistol_shrimp','frogfish','vampire_squid','sea_pig'].includes(sp.id)?1.26:1;
   renderer.render(V.add(center,V.mul(offset,margin)),center,0);
   return {id:sp.id,image:renderer.canvas.toDataURL('image/jpeg',.93),gl:renderer.gl.getError(),drawn:batch.drawCount};
  },i);
  if(data.gl||data.drawn!==1)throw Error('Guide render failed: '+data.id);
  await writeFile('assets/guide_'+data.id+'.jpg',Buffer.from(data.image.split(',')[1],'base64'));console.log('PASS original WebGL guide '+data.id);
 }
}finally{await browser.close();}
