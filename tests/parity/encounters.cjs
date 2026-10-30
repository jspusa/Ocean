/* Real voyage feature hooks and published actor/mesh data. UI-only lifecycle
 * adapters avoid DOM/GPU setup; feature sanitization, reset, preparation,
 * seasonal rules, animal motion and actual terrain/contact data remain real. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=n=>fs.readFileSync('src/'+n+'.js','utf8'),raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),offset=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,offset));
const originalActors=new Map(header.life.map(i=>[header.nodes[i].uid,JSON.parse(JSON.stringify(header.nodes[i]))]));
const files=require('../../scene_inputs.cjs').MODULES;
let entropyCalls=0;const c=vm.createContext({console,header,active:false,renderer:{},player:{p:[0,-5,0],velocity:[0,0,0]},eye:[0,-5,0],t:0,modal:null,photoOpen:false,persistent:{photos:[{individual:'tang-001',date:123,grade:90}]},voyage:{state:{features:{expedition:{day:1,minute:540,mail:{}},ecology:{partners:[]}},waypoint:null}},crypto:{getRandomValues(a){a[0]=[123456789,987654321,231567891,831235677][entropyCalls++%4];return a;}},collide:p=>p,resetInput(){},nearestPathIndex:()=>0,stopAuto(){},document:{body:{classList:{remove(){}}}},$:()=>null});
for(const file of files)vm.runInContext(fs.readFileSync('src/'+file,'utf8'),c,{filename:file});
const get=s=>vm.runInContext(s,c),api=get('OceanRockContact'),mesh=b=>({vertices:new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+offset+b.indexOffset,b.indexCount)});
if(header.rockContact)api.install(header.rockContact);
else{
 const hash=m=>crypto.createHash('sha256').update(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)).update(Buffer.from(m.indices.buffer,m.indices.byteOffset,m.indices.byteLength)).digest('hex'),known=new Map();
 for(let v=0;v<4;v++)for(const low of [false,true]){const g=c.rockGeometry(v,low);known.set(hash(c.indexGeometry(g.v)),g.rockContact);}const arch=c.archGeometry();known.set(hash(c.indexGeometry(arch.v)),arch.rockContact);
 const entries=[];for(const b of header.batches){const actual=mesh(b),meta=known.get(hash(actual));if(meta)entries.push({...b,geometry:{indexed:actual,rockContact:meta},instances:b.instanceIDs.map(id=>header.nodes[id])});}api.install(api.createCatalogue(entries));
}
get('obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:[]});');
for(const name of ['player_contact','seasons','features'])vm.runInContext(source(name),c,{filename:name});
get('const registered=[];const registration=oceanFeatures.register;oceanFeatures.register=function(module){registered.push(module);return registration(module)};');
for(const name of ['encounters','ecology','expedition','navigation','deepsea'])vm.runInContext(source(name),c,{filename:name});
// The real state readers/sanitizers and prepareDive hooks are retained. These
// other init/reset functions only build UI or reset UI-only runtime objects.
get('for(const module of registered)if(module.id!=="encounters"){module.init=undefined;module.reset=undefined;}voyage.state.features=oceanFeatures.read(voyage.state.features);oceanEncounters.feature.init();');
get('const variableDeepUIDs=new Set(["coelacanth-002","pelican_eel-001","pelican_eel-002","pelican_eel-003","humpback_anglerfish-001","humpback_anglerfish-002"]);');
// v51 slope residents also own versioned routes. Their identity/scales/genes
// remain invariant; slope-encounters.cjs verifies every allowed moved home.
get('const variableEncounterUIDs=new Set([...variableDeepUIDs,...life.filter(f=>f.slopeHabitat).map(f=>f.uid)]);');
const plain=x=>JSON.parse(JSON.stringify(x)),arrangement=()=>get('JSON.stringify({life:life.map(f=>[f.uid,f.home,f.center,f.phase,f.orbit,f.encounterPresent]),shoal:shoal.map(f=>[f.uid,f.phase,f.schoolHome,f.schoolGroup,f.schoolSpan])})'),identities=()=>get('JSON.stringify([...life,...decorLife,...shoal].map(f=>[f.uid,f.species,f.s,f.bioSeed,f.bioMorph,f.bioGenes,...(variableEncounterUIDs.has(f.uid)?[]:[f.home,f.center])]))'),initialIdentities=identities(),initialPhotos=JSON.stringify(c.persistent.photos);
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const dive=resume=>get('oceanFeatures.call("prepareDive",{resume:'+resume+',tour:false})');
// Use production waypoint, storage writer/reader and voyage sanitization. Only
// DOM feedback and the storage backend are adapters; saved bytes are real JSON.
const voyageSource=source('voyage'),storage=new Map();
Object.assign(c,{localStorage:{getItem:k=>storage.get(k)??null},oceanSaveGuard:{check(){},write:(k,v)=>storage.set(k,v)},diveSeconds:0,closePanel(){},toast(){}});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('const VOYAGE_KEY='),voyageSource.indexOf('const voyage=')),c,{filename:'voyage-state'});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function saveVoyage(){'),voyageSource.indexOf('function radio(')),c,{filename:'voyage-storage'});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function voyageDestination('),voyageSource.indexOf('renderMap=function(){')),c,{filename:'voyage-waypoint'});
get('voyage.state={...initialVoyage(),...voyage.state};voyage.storageLoaded=true;player.yaw=0;player.pitch=0;');
check('init has no entropy or actor/mesh growth',()=>{assert.equal(entropyCalls,0);assert.equal(get('life.length'),header.life.length);assert.equal(get('shoal.length'),380);assert.equal(identities(),initialIdentities);});
let savedSeed,savedArrangement,savedFeatures;
check('two real fresh-dive preparation chains produce distinct saved arrangements',()=>{dive(false);const a=arrangement(),first=get('oceanEncounters.snapshot().seed');dive(false);savedArrangement=arrangement();savedSeed=get('oceanEncounters.snapshot().seed');savedFeatures=get('JSON.stringify(voyage.state.features)');assert.notEqual(first,savedSeed);assert.notEqual(a,savedArrangement);assert.equal(entropyCalls,2);});
check('resume and feature reset/import replay the same arrangement without entropy',()=>{dive(true);assert.equal(arrangement(),savedArrangement);assert.equal(entropyCalls,2);get('oceanFeatures.reset()');assert.equal(arrangement(),savedArrangement);dive(false);assert.notEqual(arrangement(),savedArrangement);c.savedFeatures=savedFeatures;get('voyage.state.features=JSON.parse(savedFeatures);oceanFeatures.reset()');assert.equal(get('oceanEncounters.snapshot().seed'),savedSeed);assert.equal(arrangement(),savedArrangement);assert.equal(entropyCalls,3);});
check('actual mid-dive habitat mark and saved continue/reload preserve the same arrangement',()=>{
 const before=arrangement(),seed=get('oceanEncounters.snapshot().seed'),entropy=entropyCalls,digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 c.active=true;get('markPlace("habitat:tang")');assert.equal(get('voyage.state.waypoint'),'habitat:tang');assert.equal(get('voyage.storageOK'),true);assert.equal(arrangement(),before,'Marking a real destination never rearranges wildlife');
 const saved=storage.get('return-blue.voyage.1');assert.equal(JSON.parse(saved).features.encounters.seed,seed);dive(true);
 console.log('  '+JSON.stringify({seed,before:digest(before),continued:digest(arrangement()),waypoint:JSON.parse(saved).waypoint}));
 assert.equal(digest(arrangement()),digest(before),'Same-seed continue must not reread changed waypoint as arrangement input');
 get('voyage.state=initialVoyage();loadVoyage();oceanFeatures.reset()');assert.equal(get('voyage.loaded'),true);assert.equal(arrangement(),before,'Real saved voyage reload must reproduce the established arrangement');dive(true);assert.equal(arrangement(),before);assert.equal(entropyCalls,entropy);
 c.active=false;get('voyage.state.waypoint=null');
});
check('state sanitization bounds malformed seeds and deterministic old-save migration',()=>{const r=get('oceanEncounters');for(const seed of [-1,0,NaN,Infinity,1.5,0x100000000,'123'])assert.deepEqual(plain(r.sanitize({seed})),plain(r.initial()));for(const seed of [1,123456789,0xffffffff])assert.equal(r.sanitize({seed}).seed,seed);
 const clean=r.sanitize({schema:2,seed:123,protection:{species:['tang','tang','unknown',null],uids:['tang-001','tang-001','unknown-001']}});assert.deepEqual(plain(clean.protection),{species:['tang'],uids:['tang-001']});assert.equal(r.sanitize({schema:1,seed:123,protection:clean.protection}).protection,null);assert.equal(r.sanitize({schema:2,seed:123,protection:{species:[]}}).protection,null);
});
check('every common species/habitat retains at least 70 percent and two residents',()=>{
 const groups=new Map();for(const f of get('life')){const sp=get('SPECIES')[f.species];if(!(f.species>0&&f.species<8||f.reefFish&&['lyretail_anthias','longnose_butterfly'].includes(sp.id)))continue;const p=f.home||f.center,key=sp.id+':'+Math.floor(p[0]/40)+':'+Math.floor(p[2]/40);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
 let absent=0;for(const a of groups.values()){const present=a.filter(f=>f.encounterPresent!==false).length;absent+=a.length-present;assert(present>=Math.min(a.length,Math.max(2,Math.ceil(a.length*.7))));}assert(absent>0,'A dive actually changes common-fish attendance');
});
check('unique and deep encounters remain present, attached fauna keep their pose parameters',()=>{
 const actors=get('life'),species=get('SPECIES'),original=originalActors,fixed=['clown','pygmy_seahorse','garden_eel','pistol_shrimp','cinderella_slug','frogfish','japanese_spider_crab','sea_pig','tripod_fish','fire_goby','banggai_cardinal'];
 for(const f of actors){const sp=species[f.species];if(sp.abyss||sp.trench||sp.pelagic||actors.filter(a=>a.species===f.species).length===1)assert.equal(f.encounterPresent,true);if(fixed.includes(sp.id)){const old=original.get(f.uid);assert.equal(f.phase,old.phase);assert.equal(f.orbit,old.orbit);assert.deepEqual(plain(f.home||f.center),plain(old.home||old.center));}}
});
check('owned companions override both encounter attendance and wild seasonal exclusion',()=>{
 const routes=get('JSON.stringify(life.map(f=>[f.uid,f.phase,f.orbit]))');
 get('voyage.state.features.ecology.partners=[{uid:"beluga-001",name:"Known companion",mastery:{}}];oceanFeatures.reset();const retained=life.find(f=>f.uid==="beluga-001");retained.encounterPresent=false;oceanSeasons.sync(true);');assert.equal(get('JSON.stringify(life.map(f=>[f.uid,f.phase,f.orbit]))'),routes,'A newly owned companion must not change established route parameters');assert.equal(get('retained.ecologyPresent'),true);assert.equal(get('life.find(f=>f.uid==="white_sided_dolphin-001").ecologyPresent'),false);
 get('voyage.state.features.ecology.partners=[];oceanFeatures.reset()');assert.equal(get('retained.ecologyPresent'),false);
});
check('night windows AND attendance and never turn an absent actor into a daytime arrival',()=>{
 get('const night=life.find(f=>SPECIES[f.species].id==="nautilus");voyage.state.features.expedition.minute=1200;night.encounterPresent=false;oceanSeasons.sync(true)');assert.equal(get('night.ecologyPresent'),false);get('night.encounterPresent=true;oceanSeasons.sync(true)');assert.equal(get('night.ecologyPresent'),true);get('voyage.state.features.expedition.minute=540;oceanSeasons.sync(true)');assert.equal(get('night.ecologyPresent'),false);
});
check('accepted guide/photo species and selected habitat targets remain available',()=>{
 get('voyage.state.features.expedition.mail={"editor-reef":{status:"accepted"},"guest-gate":{status:"accepted"}};voyage.state.waypoint="habitat:tang";');dive(false);
 for(const id of ['chromis','parrot','tang'])assert(get(`life.filter(f=>SPECIES[f.species].id===${JSON.stringify(id)}).every(f=>f.encounterPresent&&f.ecologyPresent)`));
 get('voyage.state.features.expedition.mail={};voyage.state.waypoint=null');
});
check('real request changes preserve the current dive and refresh protection only on a new dive',()=>{
 const before=arrangement(),entropy=entropyCalls;assert.equal(get('oceanExpedition.accept("editor-reef")'),true);dive(true);assert.equal(arrangement(),before);get('loadVoyage();oceanFeatures.reset()');assert.equal(arrangement(),before);assert.equal(entropyCalls,entropy);
 dive(false);assert(get('voyage.state.features.encounters.protection.species.includes("chromis")'));const accepted=arrangement();assert.equal(get('oceanExpedition.cancel("editor-reef")'),true);dive(true);assert.equal(arrangement(),accepted);assert(get('voyage.state.features.encounters.protection.species.includes("chromis")'));
 dive(false);assert.equal(get('voyage.state.features.encounters.protection.species.includes("chromis")'),false);
});
check('seed-only saves capture their saved protection once and persist that migration',()=>{
 const restore=get('JSON.stringify(voyage.state)'),entropy=entropyCalls;
 get('voyage.state.features.encounters={schema:1,seed:246813579};setVoyageWaypoint("habitat:tang");voyage.state.features.expedition.mail={"editor-reef":{status:"accepted"}};voyage.state.features.ecology.partners=[{uid:"beluga-001",name:"Known companion",mastery:{}}];saveVoyage();loadVoyage()');
 assert.equal(get('voyage.state.features.encounters.schema'),2);assert.equal(get('voyage.state.features.encounters.protection'),null);get('oceanFeatures.reset()');
 assert.deepEqual(plain(get('voyage.state.features.encounters.protection')),{species:['chromis','tang'],uids:['beluga-001']});const migrated=arrangement();
 get('setVoyageWaypoint(null);voyage.state.features.expedition.mail={};voyage.state.features.ecology.partners=[];saveVoyage();loadVoyage();oceanFeatures.reset()');assert.equal(arrangement(),migrated);assert.equal(get('voyage.state.features.encounters.seed'),246813579);assert.equal(entropyCalls,entropy);
 assert.deepEqual(JSON.parse(storage.get('return-blue.voyage.1')).features.encounters.protection,{species:['chromis','tang'],uids:['beluga-001']});
 c.restore=restore;get('voyage.state=readVoyage(JSON.parse(restore));oceanFeatures.reset()');
});
check('six coherent schools reuse exactly 380 stable UIDs and occupy authored nonreef corridors',()=>{const s=plain(get('oceanEncounters.snapshot()'));assert.equal(s.schools.length,6);assert(s.schools.every(Boolean));assert.deepEqual(s.schools.map(x=>x.count),[140,48,48,48,48,48]);assert.equal(s.schools.reduce((n,g)=>n+g.count,0),380);assert(s.schools.slice(1).every(g=>Math.hypot(g.home[0],g.home[2])>55));assert.equal(get('new Set(shoal.map(f=>f.uid)).size'),380);console.log('  '+JSON.stringify(s.schools));});
// Independently inspect actual compiled terrain/rock/wreck triangles. The
// production entry guard uses conservative mesh bounds and generator lattices.
function world(p,n){const s=n.s||[1,1,1],co=Math.cos(n.yaw||0),si=Math.sin(n.yaw||0);return [n.p[0]+co*p[0]*s[0]+si*p[2]*s[2],n.p[1]+p[1]*s[1],n.p[2]-si*p[0]*s[0]+co*p[2]*s[2]];}
check('complete school envelopes clear actual rendered ground and structures in all LODs',()=>{
 const groups=plain(get('oceanEncounters.snapshot().schools')),maxima=groups.map(()=>-Infinity);
 for(const b of header.batches){if(b.dynamic||![1,2,13,15,16,17].includes(b.material))continue;const m=mesh(b),v=m.vertices,ix=m.indices,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<v.length;k+=12)for(let a=0;a<3;a++){min[a]=Math.min(min[a],v[k+a]);max[a]=Math.max(max[a],v[k+a]);}
  for(const n of b.instanceIDs.map(id=>header.nodes[id])){const corners=Array.from({length:8},(_,k)=>world([k&1?max[0]:min[0],k&2?max[1]:min[1],k&4?max[2]:min[2]],n)),lo=[0,1,2].map(a=>Math.min(...corners.map(p=>p[a]))),hi=[0,1,2].map(a=>Math.max(...corners.map(p=>p[a]))),near=groups.map((g,i)=>({g,i})).filter(({g})=>g.home[0]+g.horizontal>=lo[0]&&g.home[0]-g.horizontal<=hi[0]&&g.home[2]+g.horizontal>=lo[2]&&g.home[2]-g.horizontal<=hi[2]);if(!near.length)continue;
   for(let k=0;k<ix.length;k+=3){const points=[0,1,2].map(j=>{const at=ix[k+j]*12;return world([v[at],v[at+1],v[at+2]],n);}),lowX=Math.min(...points.map(p=>p[0])),highX=Math.max(...points.map(p=>p[0])),lowZ=Math.min(...points.map(p=>p[2])),highZ=Math.max(...points.map(p=>p[2])),top=Math.max(...points.map(p=>p[1]));for(const {g,i} of near)if(g.home[0]+g.horizontal>=lowX&&g.home[0]-g.horizontal<=highX&&g.home[2]+g.horizontal>=lowZ&&g.home[2]-g.horizontal<=highZ)maxima[i]=Math.max(maxima[i],top);}
  }
 }
 for(const [i,g] of groups.entries()){assert(Number.isFinite(maxima[i]));assert(g.home[1]-g.vertical>maxima[i]+.5,g.id+' full school below actual support '+maxima[i]);assert(g.home[1]+g.vertical<-.75,g.id+' surface clearance');}
});
check('actual school motion stays inside those verified full-body envelopes without new randomness',()=>{
 const before=entropyCalls;for(const time of [0,3,30,120,500]){c.time=time;get('updateReefSchool(time)');const groups=get('oceanEncounters.snapshot().schools');for(const f of get('shoal')){const g=groups[f.schoolGroup];assert(Math.hypot(f.p[0]-g.home[0],f.p[2]-g.home[2])+.35<=g.horizontal+.0001);assert(Math.abs(f.p[1]-g.home[1])+.35<=g.vertical+.0001);assert.equal(api.overlaps(Array.from(f.p),.35),false,f.uid+' body intersects rock');}}assert.equal(entropyCalls,before);
});
check('64 independent saved seeds retain every school corridor without sampling new entropy',()=>{
 const before=entropyCalls,seed=get('oceanEncounters.snapshot().seed');for(let i=1;i<=64;i++){c.nextSeed=Math.imul(i,0x9e3779b9)>>>0;get('voyage.state.features.encounters.seed=nextSeed;oceanEncounters.feature.reset()');const s=plain(get('oceanEncounters.snapshot()'));assert.equal(s.schools.length,6);assert(s.schools.every(Boolean),'No authored habitat falls back into the central reef');for(const g of s.schools){assert(g.home[1]-g.vertical>=g.floor+.899);assert(g.home[1]+g.vertical<=-.75);}}
 c.nextSeed=seed;get('voyage.state.features.encounters.seed=nextSeed;oceanEncounters.feature.reset()');assert.equal(entropyCalls,before);
});
check('an unavailable entropy provider still gives a new bounded seed without blocking entry',()=>{const previous=get('oceanEncounters.snapshot().seed'),provider=c.crypto.getRandomValues;c.crypto.getRandomValues=()=>{throw Error('Unavailable entropy provider');};try{dive(false);const next=get('oceanEncounters.snapshot().seed');assert(Number.isInteger(next)&&next>0&&next<=0xffffffff);assert.notEqual(next,previous);}finally{c.crypto.getRandomValues=provider;}});
check('identity, scales, nonvariable homes and saved photo references survive every variation',()=>{assert.equal(identities(),initialIdentities);assert.equal(JSON.stringify(c.persistent.photos),initialPhotos);for(const d of get('oceanEncounters.rules.deepHabitats')){const f=get('life').find(f=>f.uid===d.uid),old=originalActors.get(d.uid);assert([old.home,...d.homes].some(home=>home.every((v,i)=>v===f.home[i])),'Only certified deep homes may change: '+d.uid);}});
console.log(checks+' encounter checks passed');
