/* Real terrain, spawn and motion seams. These checks do not establish visual
 * quality: native rendered arrival and torch views remain a separate gate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console}),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),plain=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','regions','pelagic_life','reef_fauna'])vm.runInContext(read(n),c,{filename:n+'.js'});
const get=s=>vm.runInContext(s,c),T=get('OceanTrench'),R=get('OceanRegions'),V=get('V'),S=get('SPECIES'),pose=get('faunaMotionPose');
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}}
check('hadal approach faces a real descending groove while the original animal cores remain level',()=>{
 const s=T.stations.find(s=>s.id==='hadal'),values=[];for(let r=4;r<=26;r++)for(let deg=-30;deg<=30;deg+=5){const a=-Math.PI/4+deg*Math.PI/180,x=s.p[0]+Math.cos(a)*r,z=s.p[2]+Math.sin(a)*r;values.push(T.groundHeight(x,z));}
 assert(Math.max(...values)-Math.min(...values)>12,'forward 26m sector lacks a 12m physical descent');
 for(const p of T.habitats.mariana_snailfish.homes)for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)assert(Math.abs(T.groundHeight(p[0]+x,p[2]+z)+7002.5)<1e-7);
});
check('each station has a nearby rendered rock face across multiple swimmer heights',()=>{
 for(const s of T.stations){let visible=0;const f=V.norm([s.look[0]-s.p[0],0,s.look[2]-s.p[2]]);for(let a=-Math.PI/3;a<=Math.PI/3;a+=Math.PI/60){const d=[f[0]*Math.cos(a)-f[2]*Math.sin(a),0,f[0]*Math.sin(a)+f[2]*Math.cos(a)];let levels=0;for(const dy of [-8,0,8]){const p=[s.p[0],s.p[1]+dy,s.p[2]],end=V.add(p,V.mul(d,18));if(R.segmentBlocked(p,end,0))levels++;}if(levels===3)visible++;}assert(visible>=2,s.id+' has no near 16m-tall rock silhouette inside forward view');}
});
const batches=[],renderer={batches,batch(g,instances,kind=0,dynamic=false){const b={g,instances,kind,dynamic};batches.push(b);return b;}};
// An immutable published archive fixture must not acquire the newly appended
// encounters after a rebuild. Exercise the real wrapper and UID initializer.
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0185-actors.json'),'utf8')),old=baseline.actors.filter(f=>f.group==='life');assert.equal(baseline.sourceCommit,'bc68a543368585f2b576c58cf3a5b6e8165554db');assert.equal(baseline.actors.length,807);assert.equal(baseline.runtimeAppend.count,64);c.old=plain(old);get('life.push(...old.filter(f=>!f.trench));addLife=function(){};');vm.runInContext(read('trench_world'),c);get('addLife')(renderer);get('initializeIndividuals')(renderer);const life=get('life'),encounterActors=life.filter(f=>f.encounterId);
check('new encounter actors append without changing incumbent IDs, home, scale or phenotype',()=>{
 const now=new Map(life.map(f=>[f.uid,f]));for(const f of old){const n=now.get(f.uid);assert(n,'missing '+f.uid);for(const k of ['home','s','bioSeed'])assert.deepEqual(plain(n[k]),plain(f[k]),f.uid+' '+k);}
});
check('three guided encounters join true-depth open water and muddy seabed populations',()=>{
 assert(Array.isArray(T.encounters),'missing public encounter configuration');const guides=T.encounters.filter(e=>e.guide);assert.equal(guides.length,3);assert.deepEqual(Array.from(guides,e=>e.species),['giant_squid','pelican_eel','sea_pig']);assert(encounterActors.length>=7&&encounterActors.length<=10);
 const ranges={giant_squid:[500,1000],pelican_eel:[500,3000],sea_pig:[1000,6000]};for(const e of T.encounters){const f=encounterActors.find(f=>f.encounterId===e.id);assert(f,e.id+' missing actual actor');const sp=S[f.species],[min,max]=ranges[e.species];assert(-f.home[1]>=min&&-f.home[1]<=max,e.id+' outside referenced depth range');assert.equal(f.s[0],sp.size);assert(!R.pointBlocked(e.gate,.4));assert(R.pathClear(e.gate,[f.home[0],f.home[1]+(sp.traits.motion==='crawl'?1:0),f.home[2]],.4),e.id+' blocked access');}
});
check('extra finite terraces support actual walking sea pigs above the distant bottom',()=>{
 for(const f of encounterActors.filter(f=>S[f.species].id==='sea_pig')){const saved=plain({home:f.home,s:f.s,uid:f.uid});for(const t of [0,37,90,300,600]){pose(f,t,f.p);assert(Math.abs(f.p[1]-f.home[1])<.002);assert(Math.abs(T.floorAt(f.p[0],f.p[2],f.home[1]+.1)-f.home[1])<.002);assert(f.p[1]-T.groundHeight(f.p[0],f.p[2])>1000);}assert.deepEqual(plain({home:f.home,s:f.s,uid:f.uid}),saved);}
 assert(encounterActors.some(f=>S[f.species].id==='sea_pig'),'no walking population exercised');
});
check('new real animal paths keep every low-mesh vertex clear of terrain and solids',()=>{
 assert(encounterActors.length>0);for(const f of encounterActors){const sp=S[f.species],g=get('faunaGeometry')(sp,true),unique=new Map();for(let k=0;k<g.v.length;k+=12){const v=g.v.slice(k,k+3);unique.set(v.join(','),v);}const saved=plain({home:f.home,s:f.s,uid:f.uid});
  for(let t=0;t<=300;t+=17){pose(f,t,f.p);const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch);for(const v of unique.values()){const x=(v[0]*cp-v[1]*sn)*sp.size,y=(v[0]*sn+v[1]*cp)*sp.size,z=v[2]*sp.size,p=[f.p[0]+cy*x+sy*z,f.p[1]+y,f.p[2]-sy*x+cy*z];assert(p[1]>=T.floorAt(p[0],p[2],f.home[1]+1)-.002,f.encounterId+' foot/body below surface');for(const box of R.nearbySolids(p,0))assert(!box.planes.every(q=>V.dot(q,p)<q[3]-.001),f.encounterId+' body inside rock');}}
  assert.deepEqual(plain({home:f.home,s:f.s,uid:f.uid}),saved);
 }
});
check('new terrain stays within the existing local-origin geometry budget',()=>{const terrain=[];T.build({batch(g,instances){const b={g,instances};terrain.push(b);return b}});const tris=terrain.reduce((n,b)=>n+b.g.v.length/36,0);assert(tris<100000);assert(terrain.length<=120);for(const b of terrain)for(let k=1;k<b.g.v.length;k+=12)assert(Math.abs(b.g.v[k])<170);console.log(JSON.stringify({terrainTriangles:tris,batches:terrain.length,encounters:encounterActors.length}));});
if(process.argv.includes('--compiled'))check('rebuilt archive retains all 807 incumbent identities, including boot-appended reef fish, and adds nine encounters',()=>{
 const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),h=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4))),actors=['life','decorLife','shoal'].flatMap(group=>h[group].map(i=>({group,...h.nodes[i]}))),byUID=new Map(actors.map(f=>[f.uid,f])),known=new Set(baseline.actors.map(f=>f.uid));assert.equal(byUID.size,actors.length);assert.equal(actors.length,816);assert.equal(actors.filter(f=>f.encounterId).length,9);
 for(const f of baseline.actors){const n=byUID.get(f.uid);assert(n,'missing '+f.uid);for(const [key,value]of Object.entries(f)){
  // A clean native rebuild changes three shoal x positions by <=4.45e-16m.
  // Allow only arithmetic noise in initial p; home/scale/seed/ID stay exact.
  if(key==='p')assert(value.every((v,i)=>Math.abs(v-n.p[i])<=1e-12),f.uid+' initial position');else assert.deepEqual(n[key],value,f.uid+' '+key);
 }}for(const group of ['life','decorLife','shoal'])assert.deepEqual(actors.filter(f=>f.group===group&&known.has(f.uid)).map(f=>f.uid),baseline.actors.filter(f=>f.group===group).map(f=>f.uid));
 for(const e of T.encounters){const f=actors.find(f=>f.encounterId===e.id);assert(f,'missing compiled '+e.id);assert.equal(S[f.species].id,e.species);assert.deepEqual(f.home,plain(e.home));const index=h.nodes.findIndex(n=>n.uid===f.uid),bindings=h.batches.filter(b=>b.instanceIDs.includes(index));assert.equal(bindings.length,2,'shared high/low binding');assert(bindings.every(b=>b.kind===(S[f.species].abyss?10:11)));}
});
console.log(`${passed}/${passed+failed} trench exploration checks passed (CPU; visual gate pending)`);if(failed)process.exitCode=1;
