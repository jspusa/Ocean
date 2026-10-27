/* Production population and formal motion seams. Browser appearance, input,
 * cadence and GPU cost remain separate release gates. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4)));
const modules=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish'];
function world(expansion=true,input=header){
 const data=JSON.parse(JSON.stringify(input)),ctx=vm.createContext({console,header:data});
 for(const name of modules)vm.runInContext(source(name),ctx,{filename:name+'.js'});
 if(expansion)for(const name of ['frilled_shark','frilled_shark_world'])if(fs.existsSync(path.join(root,'src',name+'.js')))vm.runInContext(source(name),ctx,{filename:name+'.js'});
 const renderer={batches:[],batch(g,instances,kind,dynamic){const batch={g,instances,kind,dynamic};this.batches.push(batch);return batch;}};ctx.renderer=renderer;
 // Keep the historical 42 -> 43 registration assertion, then load all later
 // production species before decoding today's archive. Procedural A/B worlds
 // still exercise only the original append boundary.
 const catalogue=JSON.parse(vm.runInContext('JSON.stringify(SPECIES.map(s=>s.id))',ctx)),loaded=new Set([...modules,...(expansion?['frilled_shark','frilled_shark_world']:[])]);
 const loadArchiveSpecies=()=>{for(const name of ['frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community'])if(!loaded.has(name)){vm.runInContext(source(name),ctx,{filename:name+'.js'});loaded.add(name);}};
 return {ctx,renderer,catalogue,loadArchiveSpecies,get:s=>vm.runInContext(s,ctx)};
}
function loadScene(w,keepNew=false){w.loadArchiveSpecies();w.get('obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.filter(i=>'+(keepNew?'true':'!header.nodes[i].frilledShark')+').map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals(renderer);');}
const previous=world(false),current=world();loadScene(previous);loadScene(current);
assert.equal(current.get('typeof ensureFrilledShark'),'function','The ordinary compiled population seam can append the authored frilled shark');
assert.equal(current.get('ensureFrilledShark(renderer)'),true);current.get('initializeIndividuals(renderer)');
const fish=current.get('life.find(f=>f.frilledShark)'),sp=current.get('SPECIES.find(s=>s.id==="frilled_shark")');
assert.equal(current.catalogue.length,43);assert.equal(current.get('SPECIES.indexOf(SPECIES.find(s=>s.id==="frilled_shark"))'),42);
assert.equal(JSON.stringify(current.catalogue.slice(0,42)),JSON.stringify(previous.catalogue));
assert.equal(fish.uid,'frilled_shark-001');assert.equal(fish.encounterId,'frilled-shark-pass');assert.deepEqual(Array.from(fish.home),[784,-900,-110]);assert.deepEqual(Array.from(fish.s),[1.7,1.7,1.7]);
assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.frilledShark))'),previous.get('JSON.stringify(allLife)'),'Every prior UID, home, appearance and ordering stays unchanged');
assert.equal(current.renderer.batches.length,2);const [near,far]=current.renderer.batches;assert.equal(near.instances,far.instances);assert.equal(near.instances.length,1);assert.equal(near.kind,11);assert.equal(near.dynamic,true);assert.equal(far.shadow,false);assert.equal(near.maxDistance,far.minDistance);assert(near.maxDistance>=12);assert(far.maxDistance>=70);
assert.equal(current.get('ensureFrilledShark(renderer)'),false);assert.equal(current.renderer.batches.length,2);assert.equal(current.get('life.filter(f=>f.frilledShark).length'),1);
console.log('PASS one original 1.7 m individual and two shared LOD batches append once without changing the previous 42 species or individuals');
const pose=current.get('faunaMotionPose'),poseState=f=>JSON.stringify([f.p,f.yaw,f.pitch,f.bank,f.trenchBeat,f.faunaTime]);
pose(fish,0);const initial=poseState(fish),origin=fish.p.slice();pose(fish,30);
assert.equal(fish.trenchBeat,sp.motionProfile.beat,'The dedicated frilled-shark cadence reaches the shared kind 11 rig');
assert(Math.hypot(...fish.p.map((v,i)=>v-origin[i]))>.1,'The shark slowly swims through its own authored water');
pose(fish,0);assert.equal(poseState(fish),initial,'Formal time determines the entire pose independently of frame history');
pose(fish,42);const undisturbed=poseState(fish);pose(fish,42,fish.p,{observerPosition:[784,-900,-110],observerVelocity:[100,0,0]});assert.equal(poseState(fish),undisturbed,'Moving the observer cannot relocate or turn the encounter');
const aquarium=JSON.parse(JSON.stringify(fish)),home=[2,5,-3];aquarium.home=home.slice();aquarium.center=home.slice();aquarium.p=home.slice();aquarium.radius=.6;
for(const time of [0,1,20,180,7000]){pose(aquarium,time,aquarium.p,{exhibit:true,react:false});assert(Math.hypot(...aquarium.p.map((v,i)=>v-home[i]))<.7,'Exhibits retain their independent home instead of returning to the trench');}
assert.deepEqual(aquarium.home,home);
for(const time of [0,.016,1,10,120,7000,3,3]){
 previous.get('updateLife')(time);current.get('updateLife')(time);
 assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.frilledShark))'),previous.get('JSON.stringify(allLife)'),'Every incumbent keeps its prior motion at '+time);
 assert.equal(current.get('JSON.stringify(shoal)'),previous.get('JSON.stringify(shoal)'));
}
console.log('PASS dedicated formal-time motion, unchanged incumbent motion, camera independence and aquarium-local homes');
const envelope=current.get(`(()=>{
 const f=life.find(f=>f.frilledShark),bounds=SPECIES[f.species].modelBounds,previous=[0,0,0],scale=f.s[0],sphere=1.25;
 let maxStep=0,minFloor=Infinity,maxBodyRadius=0,maxHomeDistance=0,maxWallDistance=0;
 // The body sphere includes every source corner plus 0.08 model units for
 // the shared shader's maximum 0.07-unit lateral wave and a further margin.
 for(let corner=0;corner<8;corner++)maxBodyRadius=Math.max(maxBodyRadius,Math.hypot((corner&1?bounds.max[0]:bounds.min[0])*scale,(corner&2?bounds.max[1]:bounds.min[1])*scale,((corner&4?bounds.max[2]:bounds.min[2])+(corner&4?.08:-.08))*scale));
 if(maxBodyRadius>sphere)throw Error('Animated mesh exceeds its conservative water clearance sphere');
 const walls=OceanTrench.solids.filter(s=>s.role==='wall'&&s.min[1]<=-899&&s.max[1]>=-901);
 faunaMotionPose(f,0,previous);
 for(let frame=1;frame<=240*120;frame++){
  const p=faunaMotionPose(f,frame/120);if(!p.every(Number.isFinite)||![f.yaw,f.pitch,f.bank,f.trenchBeat].every(Number.isFinite))throw Error('Nonfinite dedicated pose');
  maxStep=Math.max(maxStep,V.dist(p,previous));previous.splice(0,3,...p);maxHomeDistance=Math.max(maxHomeDistance,V.dist(p,f.home));
  if(frame%30)continue;
  if(OceanRegions.pointBlocked(p,sphere))throw Error('Animated whole-body sphere intersects an actual region solid');
  maxWallDistance=Math.max(maxWallDistance,Math.min(...walls.map(s=>Math.hypot(...p.map((n,i)=>Math.max(s.min[i]-n,0,n-s.max[i]))))));
  const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch);
  for(let corner=0;corner<8;corner++){
   const x=(corner&1?bounds.max[0]:bounds.min[0])*scale,y=(corner&2?bounds.max[1]:bounds.min[1])*scale,z=((corner&4?bounds.max[2]:bounds.min[2])+(corner&4?.08:-.08))*scale,a=x*cp-y*sn,q=[p[0]+cy*a+sy*z,p[1]+x*sn+y*cp,p[2]-sy*a+cy*z];
   if(!OceanTrench.containsPosition(q))throw Error('Animated body left the actual connected water volume');
   minFloor=Math.min(minFloor,q[1]-OceanTrench.floorAt(q[0],q[2],q[1]+.1));
  }
 }
 return {maxStep,minFloor,maxBodyRadius,maxHomeDistance,maxWallDistance};
})()`);
assert(envelope.maxStep<.0011,'120 Hz motion has a bounded natural swimming step');assert(envelope.minFloor>1);assert(envelope.maxHomeDistance<2.81);assert(envelope.maxWallDistance<8,'The authored encounter stays beside the existing fault wall');
console.log('PASS 240 seconds at 120 Hz keep the complete animated body clear of real rock solids and inside water: '+JSON.stringify(envelope));
vm.runInContext(source('features'),current.ctx);vm.runInContext(source('aquarium'),current.ctx);const aquariumAPI=current.get('oceanAquarium');
for(let cell=0;cell<12;cell++)for(let level=0;level<3;level++){
 const layout=aquariumAPI.exhibitLayout({cell,level,species:'frilled_shark'});assert.equal(layout.scale,1.7,'Every aquarium layout retains the physical 1.7 m animal');
 const exhibit={...JSON.parse(JSON.stringify(fish)),home:Array.from(layout.home),center:Array.from(layout.home),p:Array.from(layout.home),radius:layout.radius,homeYaw:0};
 for(let time=0;time<=240;time+=2){pose(exhibit,time,exhibit.p,{exhibit:true,react:false});const p=exhibit.p;assert(p[0]-1.25>-21.8&&p[0]+1.25<21.8&&p[1]-1.25>-13.7&&p[1]+1.25<-.5&&p[2]-1.25>-16.8&&p[2]+1.25<16.8,'Every independent exhibit keeps its whole animated body within its tank water');}
}
console.log('PASS all 36 aquarium cell/level layouts preserve real size and the full animated body inside tank water');
const serialized=JSON.parse(JSON.stringify(header));serialized.life=serialized.life.filter(i=>!serialized.nodes[i].frilledShark);serialized.life.push(serialized.nodes.push(JSON.parse(JSON.stringify(fish)))-1);
const restored=world(true,serialized);loadScene(restored,true);assert.equal(restored.get('ensureFrilledShark(renderer)'),false);assert.equal(restored.renderer.batches.length,0);assert.equal(restored.get('life.filter(f=>f.frilledShark).length'),1);assert.equal(restored.get('life.find(f=>f.frilledShark).uid'),'frilled_shark-001');
const proceduralBefore=world(false),proceduralAfter=world();proceduralBefore.get('addLife(renderer);initializeIndividuals(renderer)');proceduralAfter.get('addLife(renderer);initializeIndividuals(renderer)');
assert.equal(proceduralAfter.get('life.filter(f=>f.frilledShark).length'),1,'Procedural scene creation also appends exactly one authored frilled shark');
assert.equal(proceduralAfter.get('life.length'),proceduralBefore.get('life.length')+1);
assert.equal(proceduralAfter.get('JSON.stringify(allLife.filter(f=>!f.frilledShark))'),proceduralBefore.get('JSON.stringify(allLife)'),'Full generation preserves all earlier identities, homes, appearance and motion');
assert.equal(proceduralAfter.get('JSON.stringify(shoal)'),proceduralBefore.get('JSON.stringify(shoal)'));
assert.equal(proceduralAfter.renderer.batches.length,proceduralBefore.renderer.batches.length+2);assert.equal(proceduralAfter.get('ensureFrilledShark(renderer)'),false);
console.log('PASS procedural creation and serialized compiled restoration both retain one stable individual without duplicate batches');
