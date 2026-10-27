/* Original content at the agreed mesh, append and simulation seams. Native
 * appearance/input/GPU evidence is deliberately separate from these CPU checks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),source=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)));
const modules=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna'];
function world(expansion=true,input=header,compiled=false){
 const data=JSON.parse(JSON.stringify(input));if(!compiled)data.life=data.life.filter(i=>!data.nodes[i].oarfish);
 const ctx=vm.createContext({console,header:data});for(const n of modules)vm.runInContext(source(n),ctx,{filename:n});
 if(expansion&&fs.existsSync(path.join(root,'src/oarfish.js')))vm.runInContext(source('oarfish'),ctx,{filename:'oarfish'});
 const renderer={batches:[],batch(g,instances,kind,dynamic){const b={g,instances,kind,dynamic};this.batches.push(b);return b;}};ctx.renderer=renderer;
 // Historical registration assertions run before loading the current archive.
 // Complete its species dependencies in the same order as index.html, without
 // removing later actors or changing their saved numeric species indexes.
 const loaded=new Set([...modules,...(expansion?['oarfish']:[])]);
 const loadArchiveSpecies=()=>{for(const name of ['oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community'])if(!loaded.has(name)){vm.runInContext(source(name),ctx,{filename:name});loaded.add(name);}};
 return {ctx,renderer,loadArchiveSpecies,get:s=>vm.runInContext(s,ctx)};
}
const current=world(),previous=world(false),species=current.get('SPECIES.find(s=>s.id==="oarfish")');
assert(species,'The field guide must register the original oarfish model');
assert.equal(current.get('SPECIES.length'),42);assert.equal(current.get('SPECIES.indexOf(SPECIES.find(s=>s.id==="oarfish"))'),41);
assert.equal(current.get('JSON.stringify(SPECIES.slice(0,41).map(s=>s.id))'),previous.get('JSON.stringify(SPECIES.map(s=>s.id))'));
assert.equal(current.get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),previous.get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),'The existing procedural habitat population must not inherit the new species');
assert.equal(species.size,4);assert.equal(species.latin,'Regalecus glesne');assert(species.thumb.startsWith('data:image/svg+xml;charset=utf-8,'));
const high=current.get('faunaGeometry("oarfish")'),low=current.get('faunaGeometry("oarfish",true)');let bytes=0;
for(const g of [high,low]){
 assert(g.v.every(Number.isFinite),'Every real mesh component is finite');assert.equal(g.v.length%36,0);
 for(let k=0;k<g.v.length;k+=12){assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-6,'Surface normals stay unit length');}
 for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);assert(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-11,'No degenerate source triangles');}
 assert(Math.abs(g.modelBounds.size[0]-1)<1e-8,'Model represents one metre of total fish length before the 4 m instance scale');
 const body=[],tail=[],dorsal=[],eyes=[],pelvic=[],pectoral=[];
 for(let k=0;k<g.v.length;k+=12){
  const p=g.v.slice(k,k+3),tag=g.v[k+11],red=g.v[k+6]>g.v[k+7]*1.35&&g.v[k+6]>g.v[k+8]*1.5;
  if(tag===1&&p[0]<.30&&p[0]>-.4&&p[1]>-.08)body.push(p);if(tag===1&&p[0]<-.45)tail.push(p);if(tag===3)dorsal.push({p,root:g.v[k+9],slope:g.v[k+10]});if(tag===4)eyes.push(p);
  if(red)assert(tag===3||tag===5,'Red fins cannot use the silver body or emissive material channels');
  // Public mesh tags distinguish body (1), animated dorsal/crown (3), eyes
  // (4), and non-emissive static appendages (5). Inspect the actual coloured
  // appendage regions, independently of which tag the builder assigned.
  if(p[1]<-.17){assert.equal(tag,5,'Pelvic rays retain the static soft-tissue channel');pelvic.push(p);}
  if(p[0]>.32&&p[0]<.39&&Math.abs(p[2])>.02&&p[1]>-.04&&p[1]<.01){assert.equal(tag,5,'Pectoral fins retain the static soft-tissue channel');pectoral.push(p);}
  assert([1,3,4,5].includes(tag),'The original oarfish has no emissive geometry');
 }
 const bodyWidth=Math.max(...body.map(p=>p[2]))-Math.min(...body.map(p=>p[2])),bodyHeight=Math.max(...body.map(p=>p[1]))-Math.min(...body.map(p=>p[1]));
 assert(bodyWidth<.025&&bodyHeight>bodyWidth*3,'The silver body has a compressed ribbon cross section');
 assert(Math.max(...tail.map(p=>Math.abs(p[1])))<.012,'The tail end tapers instead of growing an ordinary fan tail');
 assert(dorsal.some(v=>v.p[1]>.15&&v.p[0]>.3),'Both LODs retain the long anterior crown');
 assert(dorsal.every(v=>v.root>=0&&v.root<.05&&v.p[1]>=v.root-.002&&Number.isFinite(v.slope)),'Each dorsal vertex carries its actual finite attachment curve for the shared rig');
 assert(eyes.some(p=>p[2]>.01)&&eyes.some(p=>p[2]<-.01),'Both eyes retain explicit real geometry');
 assert(pelvic.some(p=>p[2]>.015)&&pelvic.some(p=>p[2]<-.015),'Both long pelvic rays remain visible in each LOD');
 assert(pectoral.some(p=>p[2]>.02)&&pectoral.some(p=>p[2]<-.02),'Both static pectoral fins remain visible in each LOD');
 const mesh=current.get('indexGeometry')(g.v);bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
}
assert(high.v.length/36<=12000);assert(low.v.length<high.v.length*.6);assert(bytes<1024*1024);
console.log('PASS 42nd species retains all prior indexes; original 4 m near/far meshes are finite, nondegenerate and bounded: '+high.v.length/36+'/'+low.v.length/36+' triangles, '+bytes+' indexed bytes');
function loadScene(w){w.loadArchiveSpecies();w.get('obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals(renderer);');}
loadScene(previous);loadScene(current);const beforeCount=current.get('life.length');
assert.equal(current.get('typeof ensureOarfish'),'function','A compiled scene can append the encounter through its ordinary population entry point');
assert.equal(current.get('ensureOarfish(renderer)'),true);current.get('initializeIndividuals(renderer)');
assert.equal(current.get('life.length'),beforeCount+1);assert.equal(current.get('allLife.length'),previous.get('allLife.length')+1);
const fish=current.get('life.find(f=>f.oarfish)');assert.equal(fish.uid,'oarfish-001');assert.equal(fish.encounterId,'oarfish-pass');assert.deepEqual(Array.from(fish.home),[775,-480,-110]);assert.deepEqual(Array.from(fish.s),[4,4,4]);
assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.oarfish))'),previous.get('JSON.stringify(allLife)'),'Prior identities, genes, scales and authored positions remain unchanged');
assert.equal(current.renderer.batches.length,2);const [near,far]=current.renderer.batches;assert.equal(near.instances,far.instances);assert.equal(near.instances.length,1);assert.equal(near.kind,11);assert.equal(near.dynamic,true);assert.equal(far.shadow,false);assert.equal(near.maxDistance,far.minDistance);assert(near.maxDistance>=18);assert(far.maxDistance>=70);
assert.equal(current.get('ensureOarfish(renderer)'),false);assert.equal(current.get('life.length'),beforeCount+1);assert.equal(current.renderer.batches.length,2);
const serialized=JSON.parse(JSON.stringify(header));serialized.life=serialized.life.filter(i=>!serialized.nodes[i].oarfish);serialized.life.push(serialized.nodes.push(JSON.parse(JSON.stringify(fish)))-1);
const restored=world(true,serialized,true);loadScene(restored);assert.equal(restored.get('ensureOarfish(renderer)'),false);assert.equal(restored.renderer.batches.length,0);assert.equal(restored.get('life.filter(f=>f.oarfish).length'),1);assert.equal(restored.get('life.find(f=>f.oarfish).uid'),'oarfish-001');
console.log('PASS one stable actor and two shared LOD batches append once; serialised compiled residents retain identity without duplicate population');
const pose=current.get('faunaMotionPose'),snapshot=f=>JSON.stringify([f.p,f.yaw,f.pitch,f.bank,f.trenchBeat,f.faunaTime]);
pose(fish,0);const start=fish.p.slice(),initialPose=snapshot(fish);pose(fish,30);assert(Math.hypot(...fish.p.map((v,i)=>v-start[i]))>.1,'A real encounter moves slowly through the water');
assert(fish.pitch>.2,'Head-up suspension is part of the natural pose');assert(Number.isFinite(fish.trenchBeat)&&fish.trenchBeat>0,'Dorsal propulsion carries a finite natural cadence');
pose(fish,0);assert.equal(snapshot(fish),initialPose,'Revisiting simulation time is independent of prior frame history');
for(const time of [0,.016,1,10,120,7000,3,3]){
 previous.get('updateLife')(time);current.get('updateLife')(time);
 assert.equal(current.get('JSON.stringify(allLife.filter(f=>!f.oarfish))'),previous.get('JSON.stringify(allLife)'),'Every incumbent keeps its original motion at '+time);
 assert.equal(current.get('JSON.stringify(shoal)'),previous.get('JSON.stringify(shoal)'));
}
const pathResult=current.get(`(()=>{
 const f=life.find(f=>f.oarfish),b=SPECIES[f.species].modelBounds,previous=[0,0,0];faunaMotionPose(f,0,previous);
 let maxStep=0,minFloor=Infinity,minSolid=Infinity,minPitch=Infinity,maxPitch=-Infinity,maxRadius=0;
 for(let frame=1;frame<=180*120;frame++){
  const t=frame/120,p=faunaMotionPose(f,t);if(!p.every(Number.isFinite)||![f.yaw,f.pitch,f.bank,f.trenchBeat].every(Number.isFinite))throw Error('nonfinite pose');
  maxStep=Math.max(maxStep,V.dist(p,previous));previous.splice(0,3,...p);minPitch=Math.min(minPitch,f.pitch);maxPitch=Math.max(maxPitch,f.pitch);maxRadius=Math.max(maxRadius,Math.hypot(p[0]-f.home[0],p[2]-f.home[2]));
  if(frame%30)continue;
  // A conservative 2.7 m body sphere includes every orientation and the
  // shader's fin displacement; broad-phase solids must miss the entire body.
  if(OceanTrench.nearbySolids(p,2.7).length)throw Error('Whole moving body envelope reaches a region solid');
  const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),scale=f.s[0];
  for(let corner=0;corner<8;corner++){
   // Reserve another 0.25 m either side for the animated dorsal membrane.
   const x=(corner&1?b.max[0]:b.min[0])*scale,y=(corner&2?b.max[1]:b.min[1])*scale,z=(corner&4?b.max[2]*scale+.25:b.min[2]*scale-.25),a=x*cp-y*sp,q=[p[0]+cy*a+sy*z,p[1]+x*sp+y*cp,p[2]-sy*a+cy*z];
   minFloor=Math.min(minFloor,q[1]-groundHeight(q[0],q[2]));
   if(!OceanTrench.containsPosition(q))throw Error('Body left the trench water volume');
   for(const ob of obstacles){const distance=((q[0]-ob.p[0])/ob.s[0])**2+((q[1]-ob.p[1])/ob.s[1])**2+((q[2]-ob.p[2])/ob.s[2])**2;minSolid=Math.min(minSolid,distance);}
  }
 }
 return {maxStep,minFloor,minSolid,minPitch,maxPitch,maxRadius};
})()`);
assert(pathResult.maxStep<.002,'Dense 120 Hz motion must not teleport');assert(pathResult.minFloor>1,'Whole body and moving fins remain in open water');assert(pathResult.minSolid>=1);assert(pathResult.minPitch>.1&&pathResult.maxPitch>1&&pathResult.maxPitch-pathResult.minPitch>.5,'Head-up posture naturally varies without locking upright');assert(pathResult.maxRadius<3,'Encounter remains in its authored 3 m horizontal envelope');
const aquarium=JSON.parse(JSON.stringify(fish));aquarium.home=[2,5,-3];aquarium.center=aquarium.home.slice();aquarium.p=aquarium.home.slice();aquarium.radius=.6;const home=aquarium.home.slice();
for(const t of [0,1,20,180,7000]){pose(aquarium,t,aquarium.p,{exhibit:true,react:false});assert(Math.hypot(...aquarium.p.map((v,i)=>v-home[i]))<=.9,'Exhibit poses stay within their independent authored home');}
assert.deepEqual(aquarium.home,home);pose(fish,42);const undisturbed=snapshot(fish);pose(fish,42,fish.p,{observerPosition:[775,-480,-110],observerVelocity:[100,0,0]});assert.equal(snapshot(fish),undisturbed,'Player/camera changes cannot relocate the encounter');
console.log('PASS original simulation preserves prior fauna; 180 seconds at 120 Hz: '+JSON.stringify(pathResult)+'; independent aquarium homes and observer-independent motion');
vm.runInContext(source('features'),current.ctx);vm.runInContext(source('aquarium'),current.ctx);const aquariumAPI=current.get('oceanAquarium');
assert(aquariumAPI.planPlacement([{cell:0,species:'whale',level:1},{cell:1,species:'common_dolphin',level:1}],'oarfish',2),'An eligible oarfish can share the normal aquarium capacity with existing large exhibits');
for(let cell=0;cell<12;cell++)for(let level=0;level<3;level++){
 const layout=aquariumAPI.exhibitLayout({cell,level,species:'oarfish'});assert.equal(layout.scale,4,'Aquarium retains the physical four metre animal');
 const f={...JSON.parse(JSON.stringify(fish)),home:Array.from(layout.home),center:Array.from(layout.home),p:Array.from(layout.home),radius:layout.radius,homeYaw:0};
 for(let t=0;t<=360;t+=1.5){
  pose(f,t,f.p,{exhibit:true,react:false});const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sp=Math.sin(f.pitch);
  for(let corner=0;corner<8;corner++){
   const b=high.modelBounds,x=(corner&1?b.max[0]:b.min[0])*4,y=(corner&2?b.max[1]:b.min[1])*4,z=(corner&4?b.max[2]*4+.25:b.min[2]*4-.25),a=x*cp-y*sp,p=[f.p[0]+cy*a+sy*z,f.p[1]+x*sp+y*cp,f.p[2]-sy*a+cy*z];
   assert(p[0]>-21.8&&p[0]<21.8&&p[1]>-13.7&&p[1]<-.5&&p[2]>-16.8&&p[2]<16.8,'Head-up fish, crown and animated fins stay inside every authored aquarium cell and above its reef');
  }
 }
}
console.log('PASS full-scale aquarium capacity and all 36 cell/level layouts retain the entire moving animal inside water');
const proceduralBefore=world(false),proceduralAfter=world();proceduralBefore.get('addLife(renderer);initializeIndividuals(renderer)');proceduralAfter.get('addLife(renderer);initializeIndividuals(renderer)');
assert.equal(proceduralAfter.get('life.filter(f=>f.oarfish).length'),1,'Full procedural scene creation also owns exactly one encounter');
assert.equal(proceduralAfter.get('life.length'),proceduralBefore.get('life.length')+1);
assert.equal(proceduralAfter.get('JSON.stringify(allLife.filter(f=>!f.oarfish))'),proceduralBefore.get('JSON.stringify(allLife)'),'Full generation preserves every prior identity, home, appearance and path');
assert.equal(proceduralAfter.get('JSON.stringify(shoal)'),proceduralBefore.get('JSON.stringify(shoal)'));
assert.equal(proceduralAfter.renderer.batches.length,proceduralBefore.renderer.batches.length+2);assert.equal(proceduralAfter.get('ensureOarfish(renderer)'),false);
console.log('PASS complete procedural addLife appends only the one encounter and two LOD batches while retaining every incumbent');
