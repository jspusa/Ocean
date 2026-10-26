/* Guided shark arrival at the browser failure phase, using the real compiled
 * actor, public travel, collision, fixed physics, camera and selection seams.
 * Formal clock inputs are deterministic; GPU appearance remains a browser gate. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../..'),read=n=>fs.readFileSync(root+'/src/'+n+'.js','utf8');
const elements=new Map(),classList=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x),toggle(x,on){on?s.add(x):s.delete(x)}}};
let viewport={width:1440,height:900,touch:false};const node=()=>({classList:classList(),style:{},dataset:{},append(){},querySelector(){return node()},querySelectorAll(){return []},getBoundingClientRect:()=>({left:0,top:0,width:viewport.width,height:viewport.height}),textContent:'',innerHTML:''});
const $=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
const c=vm.createContext({console,performance:{now:()=>1000},document:{createElement:node,getElementById:$,body:node(),hidden:false},$: $,matchMedia:()=>({matches:viewport.touch}),active:true,modal:null,photoOpen:false,auto:false,follow:null,focusFish:null,focusId:null,focusSeconds:0,t:0,eye:[0,0,0],target:[0,0,-1],player:{p:[-24,-2,43],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1.15,third:false,sensitivity:.85,hints:true},lookStick:[0,0],stick:[0,0],verticalInput:0,keys:new Set(),cameraCut:false,cameraFollowLength:6.3,lastCameraThird:null,collisionNotice:0,renderer:{fov:69,batches:[{sceneRole:'research-vessel',instances:[{p:[-24,0,43]}]}]},voyage:{state:{mode:'free',completed:[],visited:[],features:{expedition:{guest:null}},resume:null},awaitingResume:false},safe:s=>s,toast:s=>notes.push(s),radio(){},setAutoUI(){},resetInput(){c.player.velocity=[0,0,0]},closePanel(){c.modal=null},saveVoyage(){},currentOrder:()=>null});
const notes=[];c.stopAuto=()=>{c.auto=false;c.follow=null};c.startDive=()=>{c.active=true};c.jumpTo=()=>{};c.renderMap=()=>{};
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world'])vm.runInContext(read(name),c,{filename:name+'.js'});
const get=s=>vm.runInContext(s,c);const bytes=zlib.gunzipSync(fs.readFileSync(root+'/assets/reef.mesh.gz'));const header=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4)));c.header=header;
get('life.push(...header.life.map(i=>header.nodes[i])); obstacles.push(...header.obstacles);diverBatch={visible:false,instances:[{p:[0,0,0]}]};');
c.renderer.batch=function(g,instances,kind,dynamic){const batch={g,instances,kind,dynamic};this.batches.push(batch);return batch;};
get('ensureOarfish(renderer);ensureFrilledShark(renderer);allLife=life.concat(decorLife);initializeIndividuals(renderer);');
const app=read('app');for(const [start,end]of [['function collide(','function startDive('],['const path=','function updateCamera('],['function updateCamera(','function observe(dt)']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),c);
const features={},states={};c.oceanFeatures={register:f=>{features[f.id]=f;states[f.id]=f.initial()},state:id=>states[id],addMenu(){},pointerCaptured:()=>false};
for(const name of ['selection','navigation','deepsea'])vm.runInContext(read(name),c,{filename:name+'.js'});
features.navigation.init();features.deepsea.init();const T=get('OceanTrench'),deep=get('oceanDeepsea'),selection=get('oceanSelection'),V=get('V'),species=get('SPECIES'),actors=get('life'),trench=actors.filter(f=>species[f.species].trench),moving=actors.filter(f=>species[f.species].trench||f.encounterId),pose=get('faunaMotionPose');
const results=[],viewports=[{width:1440,height:900,touch:false},{width:390,height:844,touch:true},{width:844,height:390,touch:true}];
function viewSample(f,vp){
 viewport=vp;c.updateCamera(1/60);get(`renderer.vp=mm(perspective(69*Math.PI/180,${vp.width}/${vp.height},.16,1200),lookAt(eye,target));`);
 const point=get('animalFocusPoint')(f),disc=selection.disc(f),sp=species[f.species],sample={viewport:[vp.width,vp.height],valid:selection.valid(f),picked:selection.pick(disc.x,disc.y)?.uid||null,uid:f.uid,point:Array.from(point),distance:V.dist(c.player.p,point),bodyLengthPixels:sp.size*vp.height/(2*V.dist(c.eye,point)*Math.tan(69*Math.PI/360))};
 if(sp.id==='frilled_shark'){
  const b=sp.modelBounds,cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch),project=get('project'),corners=[];
  for(let i=0;i<8;i++){const x=(i&1?b.max[0]:b.min[0])*f.s[0],y=(i&2?b.max[1]:b.min[1])*f.s[1],z=((i&4?b.max[2]:b.min[2])+(i&4?.08:-.08))*f.s[2],a=x*cp-y*sn;corners.push(Array.from(project([f.p[0]+cy*a+sy*z,f.p[1]+x*sn+y*cp,f.p[2]-sy*a+cy*z],c.renderer.vp)));}
  sample.broadsideCosine=Math.abs(V.dot([sy,0,cy],V.norm(V.sub(c.eye,f.p))));sample.fullBodyInFrame=corners.every(p=>p[2]>0&&Math.abs(p[0])<.95&&Math.abs(p[1])<.95);sample.projectedWidthPixels=(Math.max(...corners.map(p=>p[0]))-Math.min(...corners.map(p=>p[0])))*vp.width/2;
 }
 return sample;
}

const fish=actors.find(f=>f.encounterId==='frilled-shark-pass'),phaseResults=[];
// The native failure reached [766,-900,-90] at 94.757 s, then first held at
// 113.025 s with broadside cosine .7208703. Start on the public corridor one
// metre above the gate and let the real navigation complete its approach.
const phases=[{name:'native-desktop-red',start:93.132},...Array.from({length:12},(_,i)=>({name:'circuit-phase-'+i,start:i*2*Math.PI*2.8/.1/12}))];
for(const phase of phases){
 deep.cancelTravel();features.deepsea.prepareDive();c.player.p=[754,-899,-90];c.player.velocity=[0,0,0];c.t=phase.start;pose(fish,c.t,fish.p);assert(deep.travel('slope'));
 let gateTime=null,arrivalTime=null,position=null,maxSpeed=0,maxStep=0,held=0,changedAnimal=false;const samples=[];
 for(let frame=0;frame<3600;frame++){
  c.t+=1/60;
  for(let step=0;step<2;step++){
   const before=c.player.p.slice(),animalBefore=JSON.stringify(fish),wasApproaching=deep.snapshot().approaching;c.updatePlayer(1/120);
   changedAnimal ||= JSON.stringify(fish)!==animalBefore;
   if(wasApproaching){maxSpeed=Math.max(maxSpeed,V.len(c.player.velocity));maxStep=Math.max(maxStep,V.dist(before,c.player.p));}
  }
  pose(fish,c.t,fish.p);const snap=deep.snapshot();
  if(snap.approaching&&snap.encounter==='frilled-shark-pass'&&gateTime===null)gateTime=c.t;
  if(snap.holding&&snap.encounter==='frilled-shark-pass'){
   if(arrivalTime===null){arrivalTime=c.t;position=c.player.p.slice();}
   assert(V.dist(position,c.player.p)<1e-9,'Observation must keep a fixed swimmer endpoint');
   if(held%30===0||held===239)for(const vp of viewports)samples.push({seconds:held/60,...viewSample(fish,vp)});
   held++;
  }else if(arrivalTime!==null)break;
 }
 phaseResults.push({...phase,gateTime,arrivalTime,position,maxSpeed,maxStep,held,changedAnimal,samples});
}
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name)}catch(error){failed++;console.error('FAIL '+name+': '+error.message)}}
check('native browser failure phase is reproduced through the public corridor',()=>{assert(Math.abs(phaseResults[0].gateTime-94.757)<.03,JSON.stringify(phaseResults[0]));});
for(const r of phaseResults)check(r.name+' gives a stationary, safe full broadside throughout the four-second dwell in every aspect',()=>{
 assert(r.arrivalTime!==null&&r.held>=239,'Missing complete guided shark stop');assert(!r.changedAnimal,'Guidance must not mutate the actual fish');assert(r.maxSpeed<=2.2+1e-9&&r.maxStep<=2.2/120+1e-9);
 assert(!get('OceanRegions').pointBlocked(r.position,.4),'Actual observation endpoint intersects rock');
 for(const s of r.samples){assert(s.fullBodyInFrame&&s.valid&&s.picked===s.uid,JSON.stringify(s));assert(s.projectedWidthPixels>=(s.viewport[1]>=800?100:40),JSON.stringify(s));assert(s.broadsideCosine>.85,JSON.stringify(s));}
});
const output={method:'CPU public guided travel, compiled shark, unchanged natural time pose, production collision/camera/selection; no GPU or native-input claim',phases:phaseResults,passed,failed};
fs.mkdirSync(root+'/qa/parity',{recursive:true});fs.writeFileSync(root+'/qa/parity/frilled-shark-arrival.json',JSON.stringify(output,null,2));
for(const r of phaseResults)console.log(JSON.stringify({phase:r.name,gateTime:r.gateTime,arrivalTime:r.arrivalTime,held:r.held,minBroadside:Math.min(...r.samples.map(s=>s.broadsideCosine)),minWidth:Math.min(...r.samples.map(s=>s.projectedWidthPixels)),position:r.position}));
console.log(`${passed}/${passed+failed} guided shark phase checks passed`);if(failed)process.exitCode=1;
