/* Authored investigation sites at the public terrain, navigation and save
 * boundaries. CPU geometry evidence; natural native swimming is a separate gate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console}),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','regions'])vm.runInContext(read(n),c,{filename:n+'.js'});
const get=s=>vm.runInContext(s,c),T=get('OceanTrench'),R=get('OceanRegions'),V=get('V');
let passed=0;function check(name,run){run();passed++;console.log('PASS '+name);}
const expected={
 'hadal-reference':[781.4,-7002.5,-134],
 'hadal-rim':[780,-7003.555406555436,-138],
 'hadal-turn':[780,-7017.094328407728,-140],
 'hadal-bottom':[780,-7020.541031781157,-145]
};
check('the four named hadal sites are immutable real ground surfaces with distinct operation areas',()=>{
 assert(T.studyPoints,'RED: the investigation needs public authored terrain sites');assert.equal(typeof T.studyPoint,'function');
 assert.deepEqual(Object.keys(T.studyPoints),Object.keys(expected));assert(Object.isFrozen(T.studyPoints));
 for(const [id,p]of Object.entries(expected)){
  const site=T.studyPoint(id);assert.equal(site,T.studyPoints[id]);assert.equal(site.id,id);assert.equal(site.station,'hadal');assert(site.name);assert(Object.isFrozen(site)&&Object.isFrozen(site.p));
  for(let k=0;k<3;k++)assert(Math.abs(site.p[k]-p[k])<1e-8,id+' matches independently surveyed ground');
  assert(Math.abs(site.p[1]-T.floorAt(site.p[0],site.p[2],-6990))<1e-8);assert(T.containsPosition(site.p));
 }
 const sites=Object.values(T.studyPoints);for(let i=0;i<sites.length;i++)for(let j=0;j<i;j++)assert(V.dist(sites[i].p,sites[j].p)>4,'two-metre operation areas must not overlap');
 assert.equal(T.studyPoint('unknown'),null);assert.equal(T.studyPoint('__proto__'),null);assert.equal(T.studyPoint('constructor'),null);
});
check('the whole reference instrument footprint rests on the real floor without intersecting rock',()=>{
 const p=T.studyPoint('hadal-reference').p,min=[p[0]-.3,p[1],p[2]-.3],max=[p[0]+.3,p[1]+1.04,p[2]+.3];
 for(let i=0;i<=12;i++)for(let j=0;j<=12;j++)assert(Math.abs(T.floorAt(min[0]+i*.05,min[2]+j*.05,p[1]+.1)-p[1])<1e-8,'entire support footprint must be level');
 for(const s of R.nearbySolids([p[0],p[1]+.52,p[2]],1))assert(min.some((n,k)=>n>=s.max[k]||max[k]<=s.min[k]),'complete instrument box must clear rock, not just its origin');
});
check('manual descent follows clear ground-aware bends and can return to the same reference',()=>{
 const surface=T.studyPoint('hadal-reference').p,stance=p=>[p[0],p[1]+2,p[2]],route=[[766,-7000,-120],[779,-7000,-134],stance(surface)];
 for(let z=-135;z>=-145;z--)route.push([780,T.floorAt(780,z,-6990)+2,z]);
 for(const p of Object.values(T.studyPoints))assert(route.some(q=>V.dist(q,stance(p.p))<1e-8),'all four actual sites belong to the surveyed route');
 for(const direction of [route,route.slice().reverse()])for(let i=1;i<direction.length;i++){
  const a=direction[i-1],b=direction[i];assert(R.pathClear(a,b,.4),'swept swimmer clears the rendered rocks');assert.deepEqual(plain(R.resolve(b.slice(),.4,a)),b);
  const steps=Math.ceil(V.dist(a,b)/.05);for(let j=0;j<=steps;j++){const q=V.lerp(a,b,j/steps);assert(q[1]>=T.groundHeight(q[0],q[2])+.82,'continuous swimmer floor clearance');}
 }
 const a=route.find(p=>p[2]===-137),b=route.at(-1);let unsafe=false;for(let j=0;j<=100;j++){const p=V.lerp(a,b,j/100);unsafe ||= p[1]<T.groundHeight(p[0],p[2])+.82;}assert(unsafe,'the direct rim-to-bottom chord must remain excluded: it cuts through the real ground');
 assert(surface[1]-T.studyPoint('hadal-bottom').p[1]>18,'profile records the actual eighteen-metre incision');
});
check('both original snailfish keep their complete moving high/low bodies outside the instrument',()=>{
 const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4))),species=get('SPECIES'),sp=species.find(s=>s.id==='mariana_snailfish'),index=species.indexOf(sp),actors=header.life.map(i=>header.nodes[i]).filter(f=>f.species===index),geometry=get('faunaGeometry'),pose=get('faunaMotionPose');
 assert.equal(actors.length,2,'exercise the two real compiled residents');
 // All rotations preserve this sphere. The independent kind11 extrema include
 // the shader's full tail displacement (+/- .033) and fin lift (+/- .016), not
 // only sampled centre poses. The home orbit fits radius*hypot(1,.42) for all t.
 let modelRadius=0;for(const low of [false,true]){const g=geometry(sp,low);for(let k=0;k<g.v.length;k+=12)modelRadius=Math.max(modelRadius,Math.hypot(g.v[k],Math.abs(g.v[k+1])+.016,Math.abs(g.v[k+2])+.033));}
 const p=T.studyPoint('hadal-reference').p,boxDistance=q=>Math.hypot(Math.max(Math.abs(q[0]-p[0])-.3,0),Math.max(Math.abs(q[2]-p[2])-.3,0));let minimum=Infinity;
 for(const [i,f]of actors.entries()){
  assert.deepEqual(f.home,plain(T.habitats.mariana_snailfish.homes[i]));const before=plain({uid:f.uid,home:f.home,s:f.s,radius:f.radius}),bodyRadius=modelRadius*Math.max(...f.s),orbit=Math.min(f.radius,sp.motionProfile.radius)*Math.hypot(1,.42);
  const clearance=boxDistance(f.home)-orbit-bodyRadius;assert(clearance>.5,'full all-time animal envelope must miss the complete sensor box');minimum=Math.min(minimum,clearance);
  for(let time=0;time<=600;time+=.25){pose(f,time);assert(Math.hypot(f.p[0]-f.home[0],f.p[2]-f.home[2])<=orbit+1e-8);assert(boxDistance(f.p)>bodyRadius,'real motion stays inside the proven clear envelope');}
  assert.deepEqual(plain({uid:f.uid,home:f.home,s:f.s,radius:f.radius}),before,'study anchors never relocate, enlarge or freeze animals');
 }
 console.log('  conservative all-time sensor/fish clearance: '+minimum.toFixed(3)+' m');
});
const storage=new Map();Object.assign(c,{active:true,player:{p:[766,-7000,-120],yaw:.4,pitch:-.2},diveSeconds:42,localStorage:{getItem:key=>storage.get(key)||null},oceanSaveGuard:{check(){},write:(key,value)=>storage.set(key,value)},closePanel(){},toast(){}});
vm.runInContext(read('features'),c);vm.runInContext(read('deepsea').split('const oceanDeepsea=')[0],c);
const voyageSource=read('voyage');vm.runInContext(voyageSource.slice(0,voyageSource.indexOf('function radio(')),c);
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function voyageDestination('),voyageSource.indexOf('renderMap=function()')),c);
check('explicit study markers resolve and survive the real save/load boundary without moving the swimmer',()=>{
 get('loadVoyage()'); // Match normal startup before the first automatic save.
 const before=plain(c.player),mark=get('markPlace'),readSave=get('readVoyage'),destination=get('voyageDestination');
 for(const [id,site]of Object.entries({...R.points,...T.studyPoints})){
  const key='study:'+id;mark(key);assert.equal(get('voyage.state.waypoint'),key,'new and old markers are accepted');
  const saved=JSON.parse(storage.get('return-blue.voyage.1'));assert.equal(saved.waypoint,key);assert.equal(typeof saved.waypoint,'string');
  assert.equal(readSave(saved).waypoint,key,'RED: a hadal marker must not disappear during import/load');
  get('loadVoyage()');assert.equal(get('voyage.state.waypoint'),key);assert.deepEqual(plain(destination()),{id:key,name:site.name,x:site.p[0],y:site.p[1],z:site.p[2],radius:4});
  assert.deepEqual(plain(c.player),before,'marking only changes a heading');assert.deepEqual(saved.resume.p,before.p);
 }
 for(const key of ['study:unknown','study:__proto__','study:constructor','study:hadal-reference:extra','study:',{id:'study:hadal-reference',p:[0,0,0]}]){
  assert.equal(readSave({schema:1,waypoint:key}).waypoint,null);assert.equal(destination(key)??null,null);const last=get('voyage.state.waypoint');mark(key);assert.equal(get('voyage.state.waypoint'),last,'invalid marks cannot replace an existing destination');
 }
 for(const key of ['boat','garden','trench:hadal','habitat:mariana_snailfish'])assert.equal(readSave({schema:1,waypoint:key}).waypoint,key,'existing destinations keep their save semantics');
});
check('the ordinary objective card opens the accepted owner-selected investigation without changing progress',()=>{
 const nodes=new Map();let opened=null;const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll:()=>[]});return nodes.get(id);};
 Object.assign(c,{active:false,modal:null,photoOpen:false,eye:c.player.p.slice(),blocked:()=>false,document:{hidden:false,hasFocus:()=>true,getElementById:node,addEventListener(){}},window:{addEventListener(){}},renderer:{vp:get('mm(perspective(69*Math.PI/180,1,.16,950),lookAt([766,-7000,-120],[781.4,-7002,-134]))'),updateBatch(){}},safe:String,panelTitle(){},renderShip(){},radio(){},openPanel:id=>{opened=id;},toggleCruise(){},togglePhotoMode(){},readLogger(){},exportSave(){},validateImport(){},gradePhoto(){}});c.player.velocity=[0,0,0];
 vm.runInContext(read('story'),c,{filename:'story.js'});get('voyage.state=readVoyage({schema:1,features:{}})');storage.clear();
 vm.runInContext(voyageSource.slice(voyageSource.indexOf('function initVoyage(){')),c);get('initVoyage()');
 const story=get('oceanStory'),click=expected=>{const before=JSON.stringify(get('voyage.state'));opened=null;node('objectiveCard').onclick();assert.equal(opened,expected,'objective must route through the selected story owner');assert.equal(JSON.stringify(get('voyage.state')),before,'opening the objective never accepts or progresses an investigation');};
 click('voyage');assert(story.begin());click('story');assert(story.hadal.begin());click('hadal');story.openQuest('story');click('story');story.openQuest('hadal');click('hadal');
 get('voyage.state=readVoyage({schema:1,features:{}})');story.openQuest('hadal');click('voyage');assert(story.hadal.begin());click('hadal');
});
console.log(passed+' hadal study-point checks passed (CPU only)');
