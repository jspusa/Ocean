/* Current guided arrival: real navigation, collision, compiled UID, natural pose,
 * camera and pick. Geometry pixels/lighting still require browser verification. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../..'),read=n=>fs.readFileSync(root+'/src/'+n+'.js','utf8');
const elements=new Map(),classList=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x),toggle(x,on){on?s.add(x):s.delete(x)}}};
let viewport={width:1440,height:900,touch:false};const node=()=>({classList:classList(),style:{},dataset:{},append(){},querySelector(){return node()},querySelectorAll(){return []},getBoundingClientRect:()=>({left:0,top:0,width:viewport.width,height:viewport.height}),textContent:'',innerHTML:''});
const $=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
const c=vm.createContext({console,performance:{now:()=>1000},document:{createElement:node,getElementById:$,body:node(),hidden:false},$: $,matchMedia:()=>({matches:viewport.touch}),active:true,modal:null,photoOpen:false,auto:false,follow:null,focusFish:null,focusId:null,focusSeconds:0,t:0,eye:[0,0,0],target:[0,0,-1],player:{p:[-24,-2,43],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1.15,third:false,sensitivity:.85,hints:true},lookStick:[0,0],stick:[0,0],verticalInput:0,keys:new Set(),cameraCut:false,cameraFollowLength:6.3,lastCameraThird:null,collisionNotice:0,renderer:{fov:69,batches:[{sceneRole:'research-vessel',instances:[{p:[-24,0,43]}]}]},voyage:{state:{mode:'free',completed:[],visited:[],features:{expedition:{guest:null}},resume:null},awaitingResume:false},safe:s=>s,toast:s=>notes.push(s),radio(){},setAutoUI(){},resetInput(){c.player.velocity=[0,0,0]},closePanel(){c.modal=null},saveVoyage(){},currentOrder:()=>null});
const notes=[];c.stopAuto=()=>{c.auto=false;c.follow=null};c.startDive=()=>{c.active=true};c.jumpTo=()=>{};c.renderMap=()=>{};
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community','rock_contact','player_contact'])vm.runInContext(read(name),c,{filename:name+'.js'});
const get=s=>vm.runInContext(s,c);const bytes=zlib.gunzipSync(fs.readFileSync(root+'/assets/reef.mesh.gz'));const header=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4)));c.header=header;
get('life.push(...header.life.map(i=>header.nodes[i])); obstacles.push(...header.obstacles);diverBatch={visible:false,instances:[{p:[0,0,0]}]};');
get('OceanRockContact.install(header.rockContact);');
c.renderer.batch=function(g,instances,kind,dynamic){const batch={g,instances,kind,dynamic};this.batches.push(batch);return batch;};
get('ensureOarfish(renderer);ensureFrilledShark(renderer);allLife=life.concat(decorLife);initializeIndividuals(renderer);');
const app=read('app');for(const [start,end]of [['function collide(','function startDive('],['const path=','function updateCamera('],['function updateCamera(','function observe(dt)']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),c);
const features={},states={};c.oceanFeatures={register:f=>{features[f.id]=f;states[f.id]=f.initial()},state:id=>states[id],addMenu(){},pointerCaptured:()=>false};
for(const name of ['selection','navigation','deepsea'])vm.runInContext(read(name),c,{filename:name+'.js'});
features.navigation.init();features.deepsea.init();const T=get('OceanTrench'),deep=get('oceanDeepsea'),selection=get('oceanSelection'),V=get('V'),species=get('SPECIES'),actors=get('life'),trench=actors.filter(f=>species[f.species].trench),moving=actors.filter(f=>species[f.species].trench||f.encounterId),pose=get('faunaMotionPose');
const frameHz=Number(process.env.OCEAN_GUIDE_FRAME_HZ||60);assert([30,60].includes(frameHz),'guide frame cadence must be 30 or 60 Hz');
const frameSeconds=1/frameHz,physicsSteps=120/frameHz;
function gameFrame(){for(let step=0;step<physicsSteps;step++)c.updatePlayer(1/120);c.updateCamera(frameSeconds);features.deepsea.afterCamera(frameSeconds);c.t+=frameSeconds;}
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
for(const station of T.stations){
 c.auto=false;features.navigation.prepareDive({resume:false});features.deepsea.prepareDive({resume:false});features.deepsea.startDive();const departure=c.player.p.slice();assert(deep.travel(station.id));let frames=0,approachFrames=0,maxApproachSpeed=0,maxStep=0,approachSamples=[],holds=[],currentHold=null;const expected=get('DeepseaRules').itinerary(T.route('midwater',station.id,departure),get('deepseaEncounters'),(a,b)=>get('OceanRegions').pathClear(a,b,.4)).filter(l=>l.encounter).map(l=>l.encounter.id);
 // Preserve the existing travel-time budget and add only the time deliberately
 // spent at the now player-controlled stops. No timer may resume the guide.
 const frameBudget=(300+expected.length*15)*frameHz;
 for(;frames<frameBudget&&deep.snapshot().travelTarget;frames++){
  // A real game frame runs the body-contact owner from updateCamera after
  // navigation. Sampling the camera only at stops leaves its accepted pose
  // at the previous station and is no longer a valid simulation of a trip.
  const before=c.player.p.slice(),approaching=deep.snapshot().approaching;gameFrame();if(frames%(frameHz/10)===0)for(const f of moving)pose(f,c.t,f.p);const snapshot=deep.snapshot();
  if(snapshot.holding){
   assert.equal(snapshot.guideMode,'observing');assert.equal(snapshot.travelTarget,station.id);assert.equal(c.auto,false);
   if(!currentHold){
    assert(!holds.some(h=>h.id===snapshot.encounter),'Explicit continuation repeated a completed encounter');
    const f=actors.find(f=>f.encounterId===snapshot.encounter);
    currentHold={id:snapshot.encounter,at:c.t,p:c.player.p.slice(),samples:(()=>{const original={p:f.p.slice(),yaw:f.yaw,pitch:f.pitch},samples=[];for(const seconds of f.frilledShark?[0,2,4]:[0,30,60]){pose(f,c.t+seconds,f.p);for(const vp of viewports)samples.push({seconds,...viewSample(f,vp)});}f.p.splice(0,3,...original.p);f.yaw=original.yaw;f.pitch=original.pitch;return samples;})()};holds.push(currentHold);
   }
   assert(V.dist(c.player.p,currentHold.p)<1e-9,'Paused observation moved the swimmer');
   if(c.t-currentHold.at>=15){
    currentHold.heldSeconds=c.t-currentHold.at;const position=c.player.p.slice();assert(deep.resumeTravel(),'Public explicit continuation failed');assert(V.dist(c.player.p,position)<1e-9,'Continuing teleported the swimmer');assert.equal(deep.snapshot().travelTarget,station.id);assert.equal(deep.snapshot().guideMode,'traveling');currentHold=null;
   }
  }
  maxStep=Math.max(maxStep,V.dist(before,c.player.p));if(approaching){approachFrames++;maxApproachSpeed=Math.max(maxApproachSpeed,V.len(c.player.velocity));approachSamples.push({p:c.player.p.slice(),speed:V.len(c.player.velocity)});}
 }
 assert.equal(deep.snapshot().travelTarget,null);assert.equal(c.auto,false);
 const arrival={expected,holds,approachFrames,maxApproachSpeed,finalApproachSpeed:Math.max(0,...approachSamples.filter(x=>V.dist(x.p,c.player.p)<=4).map(x=>x.speed)),maxStep,footClearance:c.player.p[1]-T.floorAt(c.player.p[0],c.player.p[2],c.player.p[1]+.1),id:station.id,departure,p:c.player.p.slice(),yaw:c.player.yaw,pitch:c.player.pitch,seconds:frames/frameHz,notes:notes.splice(0),samples:[]};
 for(const seconds of [0,30,60])for(const vp of viewports){
  viewport=vp;c.updateCamera(1/60);get(`renderer.vp=mm(perspective(69*Math.PI/180,${vp.width}/${vp.height},.16,1200),lookAt(eye,target));`);
  const sample={seconds,viewport:[vp.width,vp.height],actors:[]};
  for(const f of trench.filter(f=>T.habitats[species[f.species].id].station===station.id)){
   get('faunaMotionPose')(f,c.t+seconds,f.p);const sp=species[f.species],point=get('animalFocusPoint')(f),ndc=get('project')(point,c.renderer.vp),dist=V.dist(point,c.player.p),disc=selection.disc(f);sample.actors.push({uid:f.uid,p:f.p.slice(),distance:dist,observeDistance:sp.traits.observeDistance,inFrame:ndc[2]>0&&Math.abs(ndc[0])<1&&Math.abs(ndc[1])<1,blocked:c.blocked(c.eye,point,.001),valid:selection.valid(f),picked:selection.pick(disc.x,disc.y)?.uid||null,bodyLengthPixels:sp.size*vp.height/(2*dist*Math.tan(69*Math.PI/360)),pointPixels:[disc.x,disc.y]});
  }
  arrival.samples.push(sample);
 }
 results.push(arrival);
}
const voyageSource=read('voyage');c.findSpecies=()=>{throw Error('distant guide entry must not teleport-follow')};
vm.runInContext(voyageSource.slice(voyageSource.indexOf('const legacyFind=findSpecies;'),voyageSource.indexOf('// Chart marks a real game-space')),c);
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function voyageDestination('),voyageSource.indexOf('renderMap=function()')),c);
features.navigation.prepareDive({resume:false});const guide=[];
for(const sp of species.filter(s=>s.abyss||s.trench)){const before=c.player.p.slice();c.findSpecies(species.indexOf(sp));const d=c.voyageDestination(),f=actors.find(a=>a.species===species.indexOf(sp));assert.equal(d.id,'habitat:'+sp.id);assert(V.dist(c.player.p,before)===0);assert(Math.abs(d.x-f.home[0])<1e-9&&Math.abs(d.y-f.home[1]-.6)<1e-9&&Math.abs(d.z-f.home[2])<1e-9);guide.push({species:sp.id,waypoint:d.id,target:[d.x,d.y,d.z],distance:V.dist(before,f.home),startsTravel:!!deep.snapshot().travelTarget});}
// A public guided trip, not a teleport-to-fish fixture. Rendering/brightness and
// true pointer events are deliberately left to the browser integration gate.
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name)}catch(error){failed++;console.error('FAIL '+name+': '+error.message)}}
for(const r of results){
 check(r.id+' route remains continuous and adds a slow final observation approach',()=>{assert(r.maxStep<=260/frameHz+.001);assert(r.approachFrames>0,'missing observation approach');assert(r.maxApproachSpeed<=2.2+.0001);assert(r.finalApproachSpeed<=.85+.0001);assert(r.footClearance>=.82-.002);});
 check(r.id+' real arrival leaves an in-frame selectable individual in all three viewports',()=>{for(const s of r.samples){const valid=s.actors.filter(a=>a.valid&&a.picked===a.uid);assert(valid.length>0,JSON.stringify({viewport:s.viewport,seconds:s.seconds,actors:s.actors.map(a=>({uid:a.uid,d:a.distance,max:a.observeDistance,blocked:a.blocked}))}));assert(valid.some(a=>a.bodyLengthPixels>=12),'animal remains too small at the actual approach endpoint');}});
}
check('actual compiled corridor actors are approached and held in every planned trip',()=>{assert.equal(T.encounters.length,9);for(const r of results){assert.deepEqual(r.holds.map(h=>h.id),Array.from(r.expected),r.id+' missed a real observation stop');for(const hold of r.holds)for(const s of hold.samples){assert(s.valid&&s.picked===s.uid,JSON.stringify({station:r.id,hold:hold.id,position:hold.p,sample:s}));assert(s.bodyLengthPixels>=12);}}});
check('every observation stop remains stationary for fifteen seconds until explicit public continuation',()=>{for(const r of results)for(const hold of r.holds)assert(hold.heldSeconds>=15,JSON.stringify({station:r.id,hold:hold.id,heldSeconds:hold.heldSeconds}));});
check('900 m frilled shark has a readable full-body side view in the first four seconds, then both deeper trips arrive',()=>{
 assert(!results.find(r=>r.id==='midwater').holds.some(h=>h.id==='frilled-shark-pass'));
 for(const id of ['slope','hadal']){const trip=results.find(r=>r.id===id),hold=trip.holds.find(h=>h.id==='frilled-shark-pass');assert(hold,id+' must visit the authored 900 m encounter');for(const s of hold.samples){assert(s.fullBodyInFrame,JSON.stringify({trip:id,sample:s}));assert(s.projectedWidthPixels>=(s.viewport[1]>=800?100:40),JSON.stringify({trip:id,sample:s}));assert(s.broadsideCosine>.85,JSON.stringify({trip:id,sample:s}));}assert(trip.notes.some(n=>n.includes('已到觀察區')||n.includes('已抵達')));}
});
check('guided giant squid observation remains within 12–18 metres across actual motion and all aspects',()=>{for(const r of results)for(const h of r.holds.filter(h=>h.id==='giant-squid-pass'))for(const s of h.samples){assert(s.distance>=12&&s.distance<=18,JSON.stringify({trip:r.id,seconds:s.seconds,viewport:s.viewport,distance:s.distance}));assert(s.valid&&s.picked===s.uid);}});
check('eight distant deep-guide entries retain true habitat coordinates without teleport',()=>{assert.equal(guide.length,8);assert(guide.every(g=>!g.startsTravel));});
check('guided arrival never automatically selects or identifies an animal',()=>{assert.equal(selection.snapshot().uid,null);assert.equal(c.focusFish,null);});
features.navigation.prepareDive({resume:false});deep.travel('slope');for(let i=0;i<200*frameHz&&deep.snapshot().travelTarget&&!deep.snapshot().approaching;i++)gameFrame();
check('the slow approach remains cancellable through the public travel action',()=>{assert(deep.snapshot().approaching);deep.cancelTravel();const before=c.player.p.slice();for(let i=0;i<60;i++)c.updatePlayer(1/60);assert.equal(deep.snapshot().travelTarget,null);assert.equal(c.auto,false);assert(V.dist(c.player.p,before)<.000001);});
check('guided itinerary visits actual corridor gates in travel order without omitting route corners',()=>{
 const rules=get('DeepseaRules'),route=T.route('midwater','hadal',[-22.6,-2.2,52.5]),encounters=[
 {id:'mud',species:'sea_pig',home:[763,-3602,-112],gate:[766,-3600,-90],guide:true},
 {id:'squid',species:'giant_squid',home:[775,-680,-114],gate:[766,-680,-90],guide:true},
 {id:'eel',species:'pelican_eel',home:[764,-2300,-114],gate:[766,-2300,-90],guide:true}
 ];
 const legs=rules.itinerary(route,encounters);assert.deepEqual(Array.from(legs.filter(l=>l.encounter),l=>l.encounter.id),['squid','eel','mud']);
 for(const e of encounters)assert(legs.some(l=>l.encounter?.id===e.id&&V.dist(l.route.at(-1),e.gate)<1e-9));
 for(const corner of route)assert(legs.some(l=>l.route.some(p=>V.dist(p,corner)<1e-9)),'lost original route corner');
 assert(V.dist(legs.at(-1).route.at(-1),T.stations.find(s=>s.id==='hadal').p)<1e-9);
 const ignored=rules.itinerary(route,[{...encounters[0],guide:false},{...encounters[1],gate:[NaN,-680,-90]},{...encounters[2],gate:[10000,-2300,-90]}]);assert.equal(ignored.length,1);
});
fs.mkdirSync(root+'/qa/parity',{recursive:true});fs.writeFileSync(root+'/qa/parity/deepsea-arrival.json',JSON.stringify({method:'CPU actual compiled actors, 120 Hz production navigation and full body acceptance at the chosen frame cadence; no GPU or raster visibility claim',frameHz,physicsHz:120,results,guide,passed,failed},null,2));
for(const r of results)console.log(r.id+': '+r.seconds.toFixed(1)+' simulated seconds, '+r.holds.length+' actual encounter stops');
console.log(`${passed}/${passed+failed} guided deep observation checks passed (CPU production navigation/projection/selection; no GPU)`);if(failed)process.exitCode=1;
