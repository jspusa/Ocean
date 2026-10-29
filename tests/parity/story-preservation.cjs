/* Published 0.12.1 identities plus the authorized 0.17.0 offshore relocation.
 * Historical fixtures remain immutable. A rendered pose is transient: v0.18.37
 * corrects rock penetration and seats exactly four clownfish on their anemone.
 * Identity/genes/scales/routes stay pinned separately from contact poses. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0121-actors.json'),'utf8'));
const offshore=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0170-offshore-relocations.json'),'utf8')),relocated=new Map(offshore.actors.map(f=>[f.uid,f])),coordinates=new Set(['home','center','p']);
const routeCoordinates=['home','center'],clownUIDs=['clown-001','clown-002','clown-003','clown-004'],clowns=new Set(clownUIDs);
const packed=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz')));
assert.equal(packed.subarray(0,4).toString(),'RFB5');
const binaryStart=8+packed.readUInt32LE(4),header=JSON.parse(packed.subarray(8,binaryStart)),groups=['life','decorLife','shoal'];
const actors=groups.flatMap(group=>header[group].map(index=>({group,...header.nodes[index]}))),byUID=new Map(actors.map(f=>[f.uid,f]));
const contactContext=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'src/rock_contact.js'),'utf8'),contactContext);
const contact=vm.runInContext('OceanRockContact',contactContext);assert(header.rockContact,'Compiled exact rock catalogue is required');contact.install(header.rockContact);
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('baseline is the published 0.12.1 scene and contains all 725 unique actors',()=>{
 assert.equal(baseline.sourceCommit,'50180d2');assert.equal(baseline.sourceVersion,'0.12.1');assert.equal(baseline.actors.length,725);assert.equal(new Set(baseline.actors.map(f=>f.uid)).size,725);
 assert.equal(baseline.meshSha256.length,64);
});
check('coordinate migration is pinned to the six released 0.17.0 offshore cetaceans',()=>{
 assert.equal(offshore.sourceCommit,'948c046a67fb5b7c7b8f77466b4b24171e75be9d');assert.equal(offshore.sourceVersion,'0.17.0');assert.equal(offshore.meshSha256,'719cee472608b570784271d4004ea47cf3d5c4427eff84d86d00bed72f6d96a6');
 assert.equal(offshore.actors.length,6);assert.equal(relocated.size,6);assert.deepEqual([...relocated.keys()],['orca-001','orca-002','orca-003','false_killer_whale-001','false_killer_whale-002','false_killer_whale-003']);
 for(const f of offshore.actors){assert.deepEqual(Object.keys(f).sort(),['center','home','p','uid']);assert(baseline.actors.some(old=>old.uid===f.uid));for(const key of coordinates)assert(f[key].length===3&&f[key].every(Number.isFinite));}
});
check('new scene never duplicates or removes a legacy actor UID',()=>{
 assert.equal(byUID.size,actors.length);for(const f of baseline.actors)assert(byUID.has(f.uid),'missing '+f.uid);
});
check('legacy identity, scale and route data remain exact apart from pinned homes and four anemone heights',()=>{
 for(const before of baseline.actors){const current=byUID.get(before.uid),migration=relocated.get(before.uid);for(const [key,value]of Object.entries(before)){
  if(key==='p')continue; // Runtime contact corrects rendered position, never the authored route.
  const expected=migration&&routeCoordinates.includes(key)?migration[key]:value;
  if(key==='center'&&clowns.has(before.uid)){assert.deepEqual([current.center[0],current.center[2]],[value[0],value[2]],before.uid+' changed anemone x/z');continue;}
  assert.deepEqual(current[key],expected,before.uid+' changed '+key);
 }}
});
check('only six released offshore routes and exactly four supported clownfish change historical anchors',()=>{
 const changed=[];for(const before of baseline.actors){const current=byUID.get(before.uid);if(routeCoordinates.some(key=>JSON.stringify(current[key])!==JSON.stringify(before[key])))changed.push(before.uid);}
 assert.deepEqual(changed,[...clownUIDs,...relocated.keys()]);for(const [uid,expected]of relocated)for(const key of routeCoordinates)assert.deepEqual(byUID.get(uid)[key],expected[key],uid+' moved outside the released offshore route');
});
check('all 821 released actors retain their exact genes, route parameters and non-pose state',()=>{
 // Canonical SHA-256 from immutable commit 2451003:assets/reef.mesh.gz
 // (compressed SHA-256 7351879d6af65ec8d026aa4ceded842fc1702da4a50c9f95e0cfb4bfd477ad3b).
 // This protects fields absent from the older 725-actor fixture: phase, orbit,
 // routeShape, speed, bioGenes, bioMorph, homeYaw, habitat bounds, etc. No Git
 // history is needed in CI. Only pose/effort and four proven center.y values
 // are normalized; a new or removed field/actor also changes the digest.
 const transient=new Set(['p','yaw','pitch','bank','effort']);
 const stable=actors.map(f=>Object.fromEntries(Object.keys(f).sort().filter(key=>!transient.has(key)).map(key=>[key,key==='center'&&clowns.has(f.uid)?[f.center[0],-9.1,f.center[2]]:f[key]])));
 assert.equal(actors.length,821);assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex'),'486ee479b910a4207a99539c4403cacfa1fdededc10221906d20f7d6b34c550d','Released identity/route/genes state changed');
});
check('four clownfish anchor heights follow the actual compiled anemone and supporting rock triangles',()=>{
 const batches=header.batches.filter(b=>b.sceneRole==='reef-anemone');assert.equal(batches.length,1);const b=batches[0];assert.equal(b.instanceIDs.length,1);
 const n=header.nodes[b.instanceIDs[0]],v=new Float32Array(packed.buffer,packed.byteOffset+binaryStart+b.vertexOffset,b.vertexFloats),ix=new Uint32Array(packed.buffer,packed.byteOffset+binaryStart+b.indexOffset,b.indexCount),stride=ix.length/180;
 assert(Number.isInteger(stride));assert.equal(n.yaw||0,0);let highest=-Infinity;
 for(let tentacle=0;tentacle<180;tentacle++){
  // Each authored tube starts with ten lower-ring vertices, one per side.
  // Averaging those vertices recovers the root center without a collider proxy.
  const local=[0,0,0];for(let side=0;side<10;side++){const at=ix[tentacle*stride+side*9]*12;for(let axis=0;axis<3;axis++)local[axis]+=v[at+axis]/10;}
  const angle=tentacle*2.39996,radius=Math.sqrt(tentacle/180)*.75;assert(Math.abs(local[0]-Math.cos(angle)*radius)<1e-5&&Math.abs(local[2]-Math.sin(angle)*radius)<1e-5,'Wrong compiled tentacle root');
  const p=local.map((value,axis)=>n.p[axis]+value*n.s[axis]),surface=contact.topAt(p[0],p[2]);assert(Number.isFinite(surface));
  // Authored base is .015 above the .022 inset: recover the support plane.
  const support=p[1]+(.022-.015)*n.s[1];assert(Math.abs(support-surface)<2e-6,'Compiled anemone root is detached from stone');highest=Math.max(highest,support);
 }
 for(const uid of clownUIDs){const f=byUID.get(uid);assert.equal(f.species,0);assert.deepEqual([f.center[0],f.center[2]],[n.p[0],n.p[2]]);assert(Math.abs(f.center[1]-highest)<2e-6,uid+' retains a floating or unrelated habitat height');}
});
check('compiled contact poses are finite and outside actual stone, including the historical tang penetration',()=>{
 // Continuous full-body/stroke clearance is covered by animal-rock-contact.cjs;
 // this gate also checks the actual baked first frame, before a runtime update.
 const oldTang=baseline.actors.find(f=>f.uid==='tang-006');assert(contact.overlaps(oldTang.p),'Historical penetration witness disappeared');assert(!contact.overlaps(byUID.get(oldTang.uid).p),'Baked tang remains inside the wall');
 for(const f of actors){assert(f.p.length===3&&f.p.every(Number.isFinite),f.uid+' invalid compiled position');for(const key of ['yaw','pitch','bank'])if(key in f)assert(Number.isFinite(f[key]),f.uid+' invalid '+key);assert(!contact.overlaps(f.p),f.uid+' compiled center is inside stone');}
});
check('legacy actor order stays stable within each public scene binding',()=>{
 const oldUIDs=new Set(baseline.actors.map(f=>f.uid));for(const group of groups)assert.deepEqual(actors.filter(f=>f.group===group&&oldUIDs.has(f.uid)).map(f=>f.uid),baseline.actors.filter(f=>f.group===group).map(f=>f.uid),group+' reordered');
});
console.log(passed+' compiled world preservation checks passed');
