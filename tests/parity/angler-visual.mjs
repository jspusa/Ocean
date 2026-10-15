/* Isolated anatomical studio: actual compiled high/low meshes and .09 m scale.
 * This is a controlled camera/lighting fixture, not a natural-habitat claim.
 * Run only with the exclusive GPU slot; browser closes even after failures. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;
try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/?still',out='qa/parity',checks=[],browser=await pw.chromium.launch({channel:'chrome',headless:true});
try{
 await mkdir(out,{recursive:true});const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1});
 await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:90000});
 await page.evaluate(()=>{window.__freeze=true;settings.sound=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();window.__anglerOriginal=renderer.batches.map(b=>({b,instances:b.instances,visible:b.visible,minDistance:b.minDistance,maxDistance:b.maxDistance}));});
 for(const [name,direction,low]of [['front',[1,.04,0],false],['left45',[1,.11,1],false],['right45',[1,.11,-1],false],['side',[0,.09,1],false],['low45',[1,.11,1],true]]){
  const result=await page.evaluate(({direction,low})=>{
   for(const entry of __anglerOriginal){entry.b.instances=entry.instances;entry.b.visible=false;entry.b.minDistance=entry.minDistance;entry.b.maxDistance=entry.maxDistance;}
   const f=life.find(f=>SPECIES[f.species].id==='humpback_anglerfish'),sp=SPECIES[f.species],batch=renderer.batches.find(b=>b.kind===10&&b.species===f.species&&Boolean(b.minDistance>0)===low);
   // A separate instance prevents moving or rescaling the real habitat actor.
   const subject={...f,p:[0,-6,0],s:f.s.slice(),yaw:0,pitch:0,bank:0,phase:0,effort:0,abyssBeat:0,ecologyPresent:true,faunaVisibility:1,retreat:0};
   batch.instances=[subject];batch.visible=true;batch.minDistance=0;batch.maxDistance=100;
   const center=animalFocusPoint(subject),distance=Math.hypot(...sp.modelBounds.size)*sp.size*1.45,camera=V.add(center,V.mul(V.norm(direction),distance));
   renderer.lighting='day';renderer.lamp=false;renderer.photoNear=.002;renderer.photoFov=32;renderer.photoAperture=0;renderer.forceShadow=true;renderer.render(camera,center,0);
   return {uid:f.uid,scale:subject.s,home:f.home,worldPosition:f.p,studioPosition:subject.p,direction,low,triangles:batch.count/3,drawn:batch.drawCount,gl:renderer.gl.getError(),image:renderer.canvas.toDataURL('image/png')};
  },{direction,low});
  const image=result.image;delete result.image;result.pass=result.gl===0&&result.drawn===1&&result.scale.every(v=>v===.09);checks.push({name,...result});
  await writeFile(`${out}/angler-014-${name}.png`,Buffer.from(image.split(',')[1],'base64'));console.log((result.pass?'PASS ':'FAIL ')+name+' actual compiled mesh at .09 m');
 }
 await writeFile(`${out}/angler-014-visual.json`,JSON.stringify({url,fixture:'Isolated .09 m proxy of the actual compiled mesh; real world actors unmodified. Pixel inspection remains required.',checks},null,2));
 if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await browser.close();}
