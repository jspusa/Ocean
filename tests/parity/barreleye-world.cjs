/* Actual authored-population and formal-motion seams. GPU transparency and
 * ordinary player input are separate acceptance tests, never implied here. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4)));
const modules=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world'];
function world(expansion=true,input=header){
 const ctx=vm.createContext({console,header:JSON.parse(JSON.stringify(input))});
 for(const name of modules)vm.runInContext(source(name),ctx,{filename:name+'.js'});
 if(expansion)for(const name of ['barreleye','barreleye_world'])if(fs.existsSync(path.join(root,'src',name+'.js')))vm.runInContext(source(name),ctx,{filename:name+'.js'});
 // The accepted addLife boundary records actual meshes and shared actors.
 const renderer={batches:[],batch(g,instances,kind,dynamic){const batch={g,instances,kind,dynamic};this.batches.push(batch);return batch;}};ctx.renderer=renderer;
 return {ctx,renderer,get:s=>vm.runInContext(s,ctx)};
}
function loadScene(w,keepNew=false){w.get('obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.filter(i=>'+(keepNew?'true':'!header.nodes[i].barreleye')+').map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);ensureReefFish(renderer);ensureOarfish(renderer);ensureFrilledShark(renderer);initializeIndividuals(renderer);');}
const previous=world(false),current=world();loadScene(previous);loadScene(current);
assert.equal(current.get('typeof ensureBarreleye'),'function','The ordinary compiled population seam must append the authored barreleye');
const existingBatches=current.renderer.batches.length;
assert.equal(current.get('ensureBarreleye(renderer)'),true);current.get('initializeIndividuals(renderer)');
const fish=current.get('life.find(f=>f.barreleye)'),sp=current.get('SPECIES.find(s=>s.id==="barreleye")');
assert.equal(current.get('SPECIES.length'),44);assert.equal(current.get('SPECIES.indexOf(SPECIES.find(s=>s.id==="barreleye"))'),43);
assert.equal(current.get('JSON.stringify(SPECIES.slice(0,43).map(s=>s.id))'),previous.get('JSON.stringify(SPECIES.map(s=>s.id))'));
assert.equal(fish.uid,'barreleye-001');assert.equal(fish.encounterId,'barreleye-pass');assert.deepEqual(Array.from(fish.home),[768,-690,-96]);assert.deepEqual(Array.from(fish.s),[.14,.14,.14]);
assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.barreleye))'),previous.get('JSON.stringify(allLife)'),'All 43 incumbent species retain their existing actors, identities, homes and appearance');
assert.equal(current.renderer.batches.length,existingBatches+2);const [near,far]=current.renderer.batches.slice(-2);assert.equal(near.instances,far.instances);assert.equal(near.instances.length,1);assert.equal(near.kind,11);assert.equal(near.dynamic,true);assert.equal(far.shadow,false);assert.equal(near.maxDistance,far.minDistance);assert(near.maxDistance>=3);assert(far.maxDistance>=20);
assert.equal(current.get('ensureBarreleye(renderer)'),false);assert.equal(current.renderer.batches.length,existingBatches+2);assert.equal(current.get('life.filter(f=>f.barreleye).length'),1);
console.log('PASS one original 14 cm individual and two shared LOD meshes append exactly once without changing the previous 43 species or actors');
const pose=current.get('faunaMotionPose'),poseState=f=>JSON.stringify([f.p,f.yaw,f.pitch,f.bank,f.trenchBeat,f.faunaTime]);
pose(fish,0);const initial=poseState(fish),origin=fish.p.slice();pose(fish,30);
assert.equal(fish.trenchBeat,sp.motionProfile.beat,'The actual hovering animal supplies its authored fin cadence to rig 6');
assert(Math.hypot(...fish.p.map((v,i)=>v-origin[i]))>.001,'It makes a small natural drift, rather than remaining a frozen prop');
pose(fish,0);assert.equal(poseState(fish),initial,'Formal time determines the entire pose independent of frame history');
pose(fish,42);const undisturbed=poseState(fish);pose(fish,42,fish.p,{observerPosition:fish.p.slice(),observerVelocity:[100,0,0]});assert.equal(poseState(fish),undisturbed,'The camera cannot relocate or turn the encounter');
const aquarium=JSON.parse(JSON.stringify(fish)),home=[2,5,-3];aquarium.home=home.slice();aquarium.center=home.slice();aquarium.p=home.slice();aquarium.radius=.224;
for(const time of [0,1,20,180,7000]){pose(aquarium,time,aquarium.p,{exhibit:true,react:false});assert(Math.hypot(...aquarium.p.map((v,i)=>v-home[i]))<.06,'Exhibits retain their local home and restrained centimetre drift');}
assert.deepEqual(aquarium.home,home);
for(const time of [0,.016,1,10,120,7000,3,3]){
 previous.get('updateLife')(time);current.get('updateLife')(time);
 assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.barreleye))'),previous.get('JSON.stringify(allLife)'),'Every incumbent keeps its prior motion at '+time);
 assert.equal(current.get('JSON.stringify(shoal)'),previous.get('JSON.stringify(shoal)'));
}
console.log('PASS formal hovering motion, unchanged incumbent motion, camera independence and aquarium-local homes');
const envelope=current.get(`(()=>{
 const f=life.find(f=>f.barreleye),bounds=SPECIES[f.species].modelBounds,previous=[0,0,0],scale=f.s[0],sphere=.16;
 let maxStep=0,minFloor=Infinity,maxBodyRadius=0,maxHomeDistance=0,maxYawStep=0,maxPitchStep=0;
 // Add 0.10 model units on each coordinate for the small fin/eye rig. The
 // result must fit this independently fixed, conservative 16 cm sphere.
 for(let corner=0;corner<8;corner++)maxBodyRadius=Math.max(maxBodyRadius,Math.hypot(...[0,1,2].map(k=>((corner&(1<<k)?bounds.max[k]:bounds.min[k])+(corner&(1<<k)?.10:-.10))*scale)));
 if(maxBodyRadius>sphere)throw Error('Actual animated mesh exceeds the whole-body safety sphere');
 faunaMotionPose(f,0,previous);let lastYaw=f.yaw,lastPitch=f.pitch;
 for(let frame=1;frame<=240*120;frame++){
  const p=faunaMotionPose(f,frame/120);if(!p.every(Number.isFinite)||![f.yaw,f.pitch,f.bank,f.trenchBeat].every(Number.isFinite))throw Error('Nonfinite hovering pose');
  maxStep=Math.max(maxStep,V.dist(p,previous));previous.splice(0,3,...p);maxHomeDistance=Math.max(maxHomeDistance,V.dist(p,f.home));maxYawStep=Math.max(maxYawStep,Math.abs(f.yaw-lastYaw));maxPitchStep=Math.max(maxPitchStep,Math.abs(f.pitch-lastPitch));lastYaw=f.yaw;lastPitch=f.pitch;
  if(frame%30)continue;
  if(OceanRegions.pointBlocked(p,sphere))throw Error('Complete animal intersects an actual rock solid');
  if(!OceanTrench.containsPosition(p))throw Error('Hovering animal leaves the connected deep-water bounds');
  const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch);
  for(let corner=0;corner<8;corner++){
   const q=[0,1,2].map(k=>((corner&(1<<k)?bounds.max[k]:bounds.min[k])+(corner&(1<<k)?.10:-.10))*scale),x=q[0]*cp-q[1]*sn,world=[p[0]+cy*x+sy*q[2],p[1]+q[0]*sn+q[1]*cp,p[2]-sy*x+cy*q[2]];
   if(!OceanTrench.containsPosition(world))throw Error('Animated body corner leaves water');
   minFloor=Math.min(minFloor,world[1]-OceanTrench.floorAt(world[0],world[2],world[1]+.1));
  }
 }
 return {maxStep,minFloor,maxBodyRadius,maxHomeDistance,maxYawStep,maxPitchStep};
})()`);
assert(envelope.maxStep<.00004,'120 Hz hover has no positional jumps');assert(envelope.maxYawStep<.00003&&envelope.maxPitchStep<.00002,'Head orientation remains slowly changing');assert(envelope.maxHomeDistance<.06);assert(envelope.minFloor>20,'This midwater fish is genuinely above the bottom');
console.log('PASS 240 seconds at 120 Hz keep the whole animated animal in clear midwater: '+JSON.stringify(envelope));
const route=current.get(`(()=>{
 const e=BarreleyeWorld.encounter,approach=[768,-689.85,-95.3],rows=[];
 if(OceanRegions.pointBlocked(e.gate,.4)||OceanRegions.pointBlocked(approach,.4)||!OceanRegions.pathClear(e.gate,approach,.4))throw Error('Normal swimmer approach is obstructed');
 for(const id of ['midwater','slope','hadal']){
  const path=OceanTrench.route('midwater',id,[0,-8,7]),station=OceanTrench.stations.find(s=>s.id===id),join=[station.p[0],e.gate[1],-90];
  if(!path.length||!path.some((p,i)=>i&&p[1]<=e.gate[1]&&path[i-1][1]>=e.gate[1]))throw Error('Encounter does not lie on a normal descent');
  if(V.dist(join,e.gate)>28||!OceanRegions.pathClear(join,e.gate,.4))throw Error('Existing descent cannot reach the encounter gate');
  rows.push({id,join,gateDistance:V.dist(join,e.gate)});
 }
 return {home:e.home,gate:e.gate,station:e.station,approach,rows};
})()`);
assert.equal(route.station,'midwater');assert.equal(route.home[1],-690);console.log('PASS existing 700 m, 1400 m and hadal descent corridors connect safely to the authored encounter: '+JSON.stringify(route));
vm.runInContext(source('features'),current.ctx);vm.runInContext(source('aquarium'),current.ctx);const aquariumAPI=current.get('oceanAquarium');
for(let cell=0;cell<12;cell++)for(let level=0;level<3;level++){
 const layout=aquariumAPI.exhibitLayout({cell,level,species:'barreleye'});assert.equal(layout.scale,.14,'Every exhibit keeps the actual 14 cm animal');
 const exhibit={...JSON.parse(JSON.stringify(fish)),home:Array.from(layout.home),center:Array.from(layout.home),p:Array.from(layout.home),radius:layout.radius,homeYaw:0};
 for(let time=0;time<=240;time+=2){pose(exhibit,time,exhibit.p,{exhibit:true,react:false});const p=exhibit.p;assert(p[0]-.16>-21.8&&p[0]+.16<21.8&&p[1]-.16>-13.7&&p[1]+.16<-.5&&p[2]-.16>-16.8&&p[2]+.16<16.8,'The whole real-size animal remains inside its independent tank water');}
}
console.log('PASS all 36 aquarium cell/level layouts preserve physical scale and whole-body water clearance');
const serialized=JSON.parse(JSON.stringify(header));serialized.life=serialized.life.filter(i=>!serialized.nodes[i].barreleye);serialized.life.push(serialized.nodes.push(JSON.parse(JSON.stringify(fish)))-1);
const restored=world(true,serialized);loadScene(restored,true);const restoredBatches=restored.renderer.batches.length;assert.equal(restored.get('ensureBarreleye(renderer)'),false);assert.equal(restored.renderer.batches.length,restoredBatches);assert.equal(restored.get('life.filter(f=>f.barreleye).length'),1);assert.equal(restored.get('life.find(f=>f.barreleye).uid'),'barreleye-001');
const proceduralBefore=world(false),proceduralAfter=world();proceduralBefore.get('addLife(renderer);initializeIndividuals(renderer)');proceduralAfter.get('addLife(renderer);initializeIndividuals(renderer)');
assert.equal(proceduralAfter.get('life.filter(f=>f.barreleye).length'),1,'Procedural creation also produces exactly one individual');assert.equal(proceduralAfter.get('life.length'),proceduralBefore.get('life.length')+1);
assert.equal(proceduralAfter.get('JSON.stringify(allLife.filter(f=>!f.barreleye))'),proceduralBefore.get('JSON.stringify(allLife)'),'Full generation preserves every prior actor');assert.equal(proceduralAfter.get('JSON.stringify(shoal)'),proceduralBefore.get('JSON.stringify(shoal)'));
assert.equal(proceduralAfter.renderer.batches.length,proceduralBefore.renderer.batches.length+2);assert.equal(proceduralAfter.get('ensureBarreleye(renderer)'),false);
console.log('PASS procedural fallback and serialized compiled restoration retain exactly one stable individual without extra batches');
