/* Real original meshes and published-world actors. This checks usable content,
 * stable prior saves/identity and whole-path motion, not catalogue labels alone. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)));
const modules=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life'];
function world(expansion=true,compiled=false){
 // Exercise the original runtime append route even after a full bake includes
 // these animals. The separate compiled route below must never append again.
 const input=JSON.parse(JSON.stringify(header));if(!compiled)input.life=input.life.filter(i=>!input.nodes[i].reefFish);
 const ctx=vm.createContext({console,header:input});for(const n of modules)vm.runInContext(read(n),ctx,{filename:n});if(expansion)vm.runInContext(read('reef_fauna'),ctx,{filename:'reef_fauna'});
 vm.runInContext('obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:[]});',ctx);
 const renderer={batches:[],batch(g,instances,kind,dynamic){const b={g,instances,kind,dynamic};this.batches.push(b);return b;}};
 if(expansion){ctx.renderer=renderer;vm.runInContext('ensureReefFish(renderer);initializeIndividuals(renderer);',ctx);}
 return {ctx,renderer,get:s=>vm.runInContext(s,ctx),step:vm.runInContext('updateLife',ctx)};
}
const current=world(),original=world(false),entries=current.get('REEF_FISH_SPECIES'),fish=current.get('life.filter(f=>f.reefFish)');
assert.equal(current.get('SPECIES.length'),original.get('SPECIES.length')+4);assert.equal(entries.length,4);assert.equal(fish.length,64);assert.equal(current.renderer.batches.length,8);
assert.equal(current.get('JSON.stringify(SPECIES.slice(0,SPECIES.length-REEF_FISH_SPECIES.length).map(s=>s.id))'),original.get('JSON.stringify(SPECIES.map(s=>s.id))'));
assert.equal(new Set(fish.map(f=>f.uid)).size,64);
const initialCount=current.get('life.length');assert.equal(current.get('ensureReefFish(renderer)'),false);assert.equal(current.get('life.length'),initialCount);assert.equal(current.renderer.batches.length,8);
console.log('PASS four usable species, 64 unique actors and eight shared LOD batches append idempotently');
if(header.life.some(i=>header.nodes[i].reefFish)){
 const baked=world(true,true),residents=baked.get('life.filter(f=>f.reefFish)');assert.equal(residents.length,64);assert.equal(baked.renderer.batches.length,0);
 const identity=f=>JSON.stringify([f.uid,Array.from(f.home),Array.from(f.s),f.bioSeed]);assert.deepEqual(Array.from(residents,identity),Array.from(fish,identity));assert.equal(baked.get('ensureReefFish(renderer)'),false);
 console.log('PASS compiled reef fish preserve the runtime identities and do not create duplicate actors or batches');
}
let bytes=0;const fingerprints=new Set();
for(const sp of entries){
 assert(sp.thumb.startsWith('data:image/svg+xml;charset=utf-8,'));assert(decodeURIComponent(sp.thumb).includes('viewBox="0 0 420 210"'));assert(sp.source.startsWith('https://'));
 const pairs=current.renderer.batches.filter(b=>b.g.species===current.get('SPECIES.findIndex(s=>s.id==="'+sp.id+'")'));assert.equal(pairs.length,2);assert.equal(pairs[0].instances,pairs[1].instances);assert.equal(pairs[0].kind,1);assert.equal(pairs[0].dynamic,true);assert.equal(pairs[1].shadow,false);assert.equal(pairs[0].maxDistance,pairs[1].minDistance);
 for(const b of pairs){assert(b.g.v.every(Number.isFinite));assert(b.g.v.length>1000);assert.equal(b.g.material,6);assert(Math.abs(b.g.modelBounds.size[0]-1)<1e-10);const mesh=current.get('indexGeometry')(b.g.v);bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;}
 fingerprints.add(crypto.createHash('sha256').update(JSON.stringify(pairs[0].g.v.filter((_,i)=>i%12<3))).digest('hex'));
}
assert.equal(fingerprints.size,4,'All four species need distinct anatomy, not only different pigment');assert(bytes<3*1024*1024,'Shared original fish geometry must stay bounded');
console.log('PASS distinct metre-normalized anatomy, real near/far models, guide art and '+bytes+' source geometry bytes');
for(const time of [0,.016,1,10,120,7000,3,3]){
 original.step(time);current.step(time);assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.reefFish))'),original.get('JSON.stringify(allLife)'),'Existing animal state at '+time);assert.equal(current.get('JSON.stringify(shoal)'),original.get('JSON.stringify(shoal)'));
}
console.log('PASS all prior animal identity, genes, scale and motion remain exactly unchanged');
const continuity=current.get(`(()=>{
 const animals=life.filter(f=>f.reefFish),previous=animals.map(f=>reefFishMotionPose(f,0).slice());let maxStep=0,minFloor=Infinity,minRock=Infinity;
 for(let frame=1;frame<=180*120;frame++){
  const time=frame/120;
  for(let k=0;k<animals.length;k++){
   const f=animals[k],p=reefFishMotionPose(f,time),distance=V.dist(p,previous[k]);if(!Number.isFinite(distance))throw Error('nonfinite pose');maxStep=Math.max(maxStep,distance);previous[k]=p.slice();
   if(frame%30!==0)continue;
   const b=SPECIES[f.species].modelBounds,c=Math.cos(f.yaw),s=Math.sin(f.yaw),cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),scale=f.s[0];
   for(let corner=0;corner<8;corner++){
    const x=(corner&1?b.max[0]:b.min[0])*scale,y=(corner&2?b.max[1]:b.min[1])*scale,z=(corner&4?b.max[2]:b.min[2])*scale,a=x*cp-y*sp,q=[p[0]+c*a+s*z,p[1]+x*sp+y*cp,p[2]-s*a+c*z];
    minFloor=Math.min(minFloor,q[1]-groundHeight(q[0],q[2]));
    for(const o of obstacles){const d=((q[0]-o.p[0])/o.s[0])**2+((q[1]-o.p[1])/o.s[1])**2+((q[2]-o.p[2])/o.s[2])**2;minRock=Math.min(minRock,d);}
   }
  }
 }
 return {maxStep,minFloor,minRock};
})()`);
assert(continuity.maxStep<.01,'Dense 120 Hz motion must not teleport at obstacle boundaries');assert(continuity.minFloor>.02,'Complete fish bounds stay above the terrain');assert(continuity.minRock>=1,'Complete fish bounds stay outside reef obstacles');
console.log('PASS 64 full-body paths over 180 seconds: max step '+continuity.maxStep.toFixed(6)+' m, floor clearance '+continuity.minFloor.toFixed(3)+' m');
for(const sp of entries){const f=fish.find(f=>current.get('SPECIES')[f.species].id===sp.id),home=f.home.slice();current.get('reefFishMotionPose')(f,100,f.p,{exhibit:true,react:false});assert(f.p.every(Number.isFinite));assert.deepEqual(Array.from(f.home),Array.from(home));}
console.log('PASS independent aquarium poses retain authored world homes');
