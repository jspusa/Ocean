/* INDIVIDUAL WATERS 0.6
 * Stable per-animal phenotype. Shape/pigment ranges are artistic constraints,
 * NOT a species population model, sex/age inference or local field observations.
 * Same object/genes are shared by all LODs, shadows, photographs and observation UI.
 */
function bioHash(n){n=(n^61)^(n>>>16);n=Math.imul(n,9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return n>>>0;}
function bioValue(id,channel){return bioHash((id^Math.imul(channel+1,0x9e3779b9))>>>0)/4294967296;}
const BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];
const fishObstacleBuckets=new Map(),NO_FISH_OBSTACLES=[];
let animalRockProfiles=new WeakMap(),animalRockMotion=new WeakMap();
let animalContactFrame=null;
const animalRockModels=new Map();
const animalTrajectoryFloors=new WeakMap();
// These catalogue species have explicit anchored/crawling support contracts.
// Do not turn a new generic "crawl" label into a blanket collision exemption.
const supportedWorldAnimals=new Set(['pygmy_seahorse','cinderella_slug','garden_eel','pistol_shrimp','frogfish','japanese_spider_crab','sea_pig','tripod_fish']);
function worldRockContact(){return typeof OceanRockContact!=='undefined'&&OceanRockContact.catalogue()?OceanRockContact:null;}
function supportedAnimal(f){return f.fauna&&supportedWorldAnimals.has(SPECIES[f.species]?.id);}
// Gameplay may replace a natural route with feeding or partner movement. Defer
// its stone query until those hooks finish, so every world actor gets one final
// contact solve. Direct updateLife/bake calls keep their existing contact path.
function updateLifeWithEffects(time,update,effects){
 if(!worldRockContact()||animalContactFrame){update(time);effects();return false;}
 const frame={time,intents:new Map()};animalContactFrame=frame;
 try{update(time);effects();}finally{animalContactFrame=null;}
 for(const f of allLife)contactAnimal(f,time,frame.intents.get(f));
 for(const f of shoal)contactAnimal(f,time,frame.intents.get(f));
 return true;
}
function setAnimalContactIntent(f,intent){if(animalContactFrame)animalContactFrame.intents.set(f,intent);}
function animalContactOrigin(f){
 const state=animalRockMotion.get(f),frame=animalContactFrame;
 return frame&&state&&state.catalogue===worldRockContact()?.catalogue()&&state.epoch===f.encounterEpoch&&frame.time>=state.time&&frame.time-state.time<=.25?state.p:f.p;
}
function initializeAnimalContact(r){
 animalRockProfiles=new WeakMap();animalRockMotion=new WeakMap();if(!worldRockContact())return;
 const actors=new Set([...allLife,...shoal]);
 for(const b of r.batches||[]){const radius=b.radius??b.mesh?.radius;if(!Number.isFinite(radius)||b.shadowProxy)continue;for(const f of b.instances||[]){if(!actors.has(f))continue;const old=animalRockProfiles.get(f);if(!old||radius>old.radius)animalRockProfiles.set(f,{radius,kind:b.kind});}}
}
function animalContactEnvelope(f){
 let profile=animalRockProfiles.get(f);const sp=SPECIES[f.species],m=f.bioMorph||[1,1,1,1];
 if(!profile){
  const key=sp?.id||(f.slot!==undefined?'shoal':'decor');profile=animalRockModels.get(key);
  if(!profile){
   const kind=sp?.renderKind||(f.species===8?2:f.species===9?4:f.species===10?6:f.species===11?7:1);let radius=0;
   if(sp?.modelBounds){const b=sp.modelBounds;radius=Math.hypot(...b.min.map((v,i)=>Math.max(Math.abs(v),Math.abs(b.max[i]))));}
   else{
    const geometry=f.species===8?turtleGeometry():f.species===9?rayGeometry():f.species===10?whaleGeometry():f.species===11&&typeof dolphinGeometry==='function'?dolphinGeometry():fishGeometry(sp||{id:key,height:.22,width:.075,color:0xbecfc9},true);
    for(let k=0;k<geometry.v.length;k+=12)radius=Math.max(radius,Math.hypot(geometry.v[k],geometry.v[k+1],geometry.v[k+2]));
   }
   profile={radius,kind};animalRockModels.set(key,profile);
  }profile={radius:profile.radius,kind:profile.kind};animalRockProfiles.set(f,profile);
 }
 const s=f.s;if(profile.envelope&&profile.sx===s[0]&&profile.sy===s[1]&&profile.sz===s[2]&&profile.mx===m[0]&&profile.my===m[1]&&profile.mz===m[2])return profile.envelope;
 // Rotation/bank preserve radius. Morph scaling and bounded swim/fin strokes
 // are included before maximum nonuniform instance scale. Kind 9 uses the
 // long body's radial slack: every compiled vertex is separately checked at
 // maximum tail bend plus full .82 pectoral/handshake excursion in parity QA.
 // An authored clearance can outlive a smaller visual outline. Keep established
 // routes and floor clearance while still allowing larger models to expand it.
 const kind=profile.kind,base=kind===13?oceanBarramundi.motion.localRadius:Math.max(profile.radius,sp?.contactRadius||0),morph=kind===1?Math.max(1,m[0]*Math.max(1,m[2]),m[1]):1;
 const bend=kind===13?0:kind===1?.1028+.025*base*morph:kind===2?Math.hypot(.37,.07):kind===4?.48*Math.pow(base/1.9,1.5):kind===6?.62:kind===7?.60:kind===9?.073+base*.10:kind===12?.035+base*.035:base*.15+.15;
 const scale=Math.max(...f.s),radius=(base*morph+bend)*scale+.012;
 const bodyY=sp?.modelBounds?Math.max(Math.abs(sp.modelBounds.min[1]),Math.abs(sp.modelBounds.max[1])):f.species===8?.31:f.species===9?.22:f.species===10?1:f.species===11?.6:sp?.height||.22;
 profile.sx=s[0];profile.sy=s[1];profile.sz=s[2];profile.mx=m[0];profile.my=m[1];profile.mz=m[2];
 return profile.envelope={radius,vertical:(bodyY*morph+bend)*scale+radius*.35,kind};
}
function animalContactFloor(f,hull,p){
 if(Number.isFinite(f.habitatFloor))return f.habitatFloor;if(f.fauna)return -Infinity;
 if(Number.isFinite(f.schoolFloor)&&f.schoolHome&&Number.isFinite(f.schoolSpan)&&Math.hypot(p[0]-f.schoolHome[0],p[2]-f.schoolHome[2])+hull.radius<=16*f.schoolSpan+.35)return f.schoolFloor+hull.vertical;
 const known=animalTrajectoryFloors.get(f);return (known&&Math.abs(p[0]-known.x)+Math.abs(p[2]-known.z)<1e-9?known.y:groundHeight(p[0],p[2]))+hull.vertical;
}
function animalContactSpeed(f){const sp=SPECIES[f.species];return f.slot!==undefined?.9:sp?.cetacean?cetaceanProfile(f).cruiseSpeed*1.8:f.fauna?Math.max(.25,(sp?.motionProfile?.speed||.15)*2+.15):Math.max(.25,Math.abs((f.speed||0)*(f.radius||0))*2.5+.35);}
function recoverAnimalContact(f,hull,raw,radius,api,ceiling=Number.isFinite(f.habitatCeiling)?f.habitatCeiling:-.06-hull.vertical){
 // Check the exact surface over a fixed, deterministic search. This only runs
 // on first placement/time discontinuities, never as the normal swim step.
 for(let ring=0;ring<4;ring++)for(let direction=0;direction<(ring?8:1);direction++){
  const a=direction*Math.PI/4,reach=ring*(radius*2+.5),p=[raw[0]+Math.cos(a)*reach,raw[1],raw[2]+Math.sin(a)*reach],top=api.topAt(p[0],p[2]);
  p[1]=Math.max(p[1],animalContactFloor(f,hull,p),Number.isFinite(top)?top+radius+.001:-Infinity);
  for(let up=0;up<6&&p[1]<=ceiling;up++,p[1]+=Math.max(.25,radius*.5))if(!api.overlaps(p,radius))return p;
 }
 return null;
}
function contactAnimal(f,time,intent=null){
 if(animalContactFrame)return;
 const api=worldRockContact();if(!api||supportedAnimal(f))return;
 const hull=animalContactEnvelope(f),radius=hull.radius,rx=f.p[0],ry=f.p[1],rz=f.p[2],catalogue=api.catalogue(),state=animalRockMotion.get(f),dt=state?time-state.time:Infinity,ceiling=intent?.allowSurface?Infinity:Number.isFinite(f.habitatCeiling)?f.habitatCeiling:-.06-hull.vertical;
 const continuous=state&&state.catalogue===catalogue&&state.radius===radius&&state.epoch===f.encounterEpoch&&state.schoolHome===f.schoolHome&&state.schoolGroup===f.schoolGroup&&state.schoolSpan===f.schoolSpan&&dt>=0&&dt<=.25;
 if(continuous&&dt===0&&(intent||Math.abs(rx-state.raw[0])+Math.abs(ry-state.raw[1])+Math.abs(rz-state.raw[2])<1e-9)){for(let i=0;i<3;i++)f.p[i]=state.p[i];f.yaw=state.yaw;f.pitch=state.pitch;f.bank=state.bank;return;}
 let desired=[rx,ry,rz],from=null,maxStep=Infinity;
 if(continuous){
  from=state.p;const origin=intent?from:state.raw,dx=rx-origin[0],dy=ry-origin[1],dz=rz-origin[2],decay=intent?0:1-Math.exp(-dt/2),ax=(state.raw[0]-from[0])*decay,ay=(state.raw[1]-from[1])*decay,az=(state.raw[2]-from[2])*decay,length=Math.hypot(ax,ay,az),limit=Math.max(.025*dt,Math.hypot(dx,dy,dz)*.65),w=length>limit?limit/length:1;
  let vx=dx+ax*w,vy=dy+ay*w,vz=dz+az*w;const n=state.normal,inward=n?vx*n[0]+vy*n[1]+vz*n[2]:0;
  if(inward<0){vx-=inward*n[0];vy-=inward*n[1];vz-=inward*n[2];}
  maxStep=(Number.isFinite(intent?.speed)?intent.speed:animalContactSpeed(f))*dt;const travel=Math.hypot(vx,vy,vz);if(travel>maxStep){const q=maxStep/travel;vx*=q;vy*=q;vz*=q;}
  desired[0]=from[0]+vx;desired[1]=from[1]+vy;desired[2]=from[2]+vz;
 }
 // Rock certificates cover stone only. The analytic seabed can rise while an
 // actor remains inside the same empty-rock ball, so retain its height guard.
 desired[1]=Math.max(desired[1],animalContactFloor(f,hull,desired));
 if(from&&Math.hypot(desired[0]-from[0],desired[1]-from[1],desired[2]-from[2])>maxStep+1e-7){desired[0]=from[0];desired[2]=from[2];desired[1]=clamp(desired[1],from[1]-maxStep,from[1]+maxStep);}
 const reserve=.12+Math.min(.13,radius*.08),clear=continuous&&state.clear&&Math.hypot(desired[0]-state.clear[0],desired[1]-state.clear[1],desired[2]-state.clear[2])<=reserve;
 let nextClear=clear?state.clear:null,normal=continuous?state.normal:null,goal=continuous?state.goal:null;
 if(!clear){
  const requested=desired.slice(),report={};let solvedReserve=reserve;
  if(goal){
   const distance=Math.hypot(goal.p[0]-from[0],goal.p[1]-from[1],goal.p[2]-from[2]),weight=Math.min(1,maxStep/Math.max(1e-10,distance));desired=from.map((v,i)=>v+(goal.p[i]-v)*weight);solvedReserve=0;api.resolve(desired,radius,from,report);
  }else api.resolve(desired,radius+reserve,from,report);
  // The prior body is safe, but it may no longer fit the larger comfort
  // sphere. Never let that cache refresh choose a distant medial exit.
  if(from&&Math.hypot(desired[0]-from[0],desired[1]-from[1],desired[2]-from[2])>maxStep+.002){
   if(solvedReserve>0&&report.valid&&desired[1]>=animalContactFloor(f,hull,desired)&&desired[1]<=ceiling){
    // Keep the certified wider solution as a short clearance goal. Move
    // toward it with a swept body-sized step instead of retrying two solves
    // forever while merely projecting away the inward route velocity.
    goal={p:desired.slice(),normal:report.normal||null};const distance=Math.hypot(desired[0]-from[0],desired[1]-from[1],desired[2]-from[2]),weight=Math.min(1,maxStep/distance);desired=from.map((v,i)=>v+(goal.p[i]-v)*weight);
   }else desired=requested;
   solvedReserve=0;api.resolve(desired,radius,from,report);
   if(Math.hypot(desired[0]-from[0],desired[1]-from[1],desired[2]-from[2])>maxStep+.002){desired=from.slice();report.valid=false;}
  }normal=report.normal||null;
  if(goal&&Math.hypot(desired[0]-goal.p[0],desired[1]-goal.p[1],desired[2]-goal.p[2])<1e-7){nextClear=goal.p.slice();normal=goal.normal;goal=null;}
  // Contact recovery may otherwise select the buried underside of a stone.
  // Continuous motion keeps its last safe pose; first/rewound poses recover
  // deterministically above the actual top, without random medial exits.
  const floor=animalContactFloor(f,hull,desired);
  if(desired[1]<floor||desired[1]>ceiling){
   if(from){desired=from.slice();nextClear=state.clear;normal=state.normal;goal=null;}
   else {const recovered=recoverAnimalContact(f,hull,[rx,ry,rz],radius+reserve,api,ceiling);if(recovered){desired=recovered;nextClear=recovered.slice();normal=null;}}
  }else if(!nextClear&&!goal&&(solvedReserve>0&&report.valid===true||!api.overlaps(desired,radius+reserve)))nextClear=desired.slice();
 }
 for(let i=0;i<3;i++)f.p[i]=desired[i];
 const altered=Math.abs(desired[0]-rx)+Math.abs(desired[1]-ry)+Math.abs(desired[2]-rz)>1e-7;
 if(continuous&&dt>0&&!intent?.preservePose&&(altered||state.altered)){const dx=desired[0]-from[0],dy=desired[1]-from[1],dz=desired[2]-from[2],horizontal=Math.hypot(dx,dz);if(horizontal>1e-6){f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,horizontal),-.29,.29);}else {f.yaw=state.yaw;f.pitch=state.pitch;}f.bank=clamp(f.bank||0,-.17,.17);}
 const next=state||{raw:[0,0,0],p:[0,0,0]};next.raw[0]=rx;next.raw[1]=ry;next.raw[2]=rz;for(let i=0;i<3;i++)next.p[i]=desired[i];next.catalogue=catalogue;next.radius=radius;next.time=time;next.clear=nextClear;next.normal=normal;next.goal=goal;next.yaw=f.yaw;next.pitch=f.pitch;next.bank=f.bank;next.altered=altered;next.epoch=f.encounterEpoch;next.schoolHome=f.schoolHome;next.schoolGroup=f.schoolGroup;next.schoolSpan=f.schoolSpan;animalRockMotion.set(f,next);
}
function initializeIndividuals(r){
 fishObstacleBuckets.clear();
 for(const ob of obstacles){if(worldRockContact()?.replacesLegacy(ob))continue;const rx=(ob.s[0]+.9)*1.613,rz=(ob.s[2]+.9)*1.613;
  for(let x=Math.floor((ob.p[0]-rx)/12);x<=Math.floor((ob.p[0]+rx)/12);x++)for(let z=Math.floor((ob.p[2]-rz)/12);z<=Math.floor((ob.p[2]+rz)/12);z++){
   const key=x+','+z;if(!fishObstacleBuckets.has(key))fishObstacleBuckets.set(key,[]);fishObstacleBuckets.get(key).push(ob);
  }
 }
 const counts=new Map();
 for(let k=0;k<allLife.length;k++){
  const f=allLife[k],sp=f.species??-1,index=counts.get(sp)||0;counts.set(sp,index+1);
  const id=bioHash((sp+11)*10007+index*101+62041);
  if(!f.bioBaseScale)f.bioBaseScale=f.s.slice();
  f.uid=(sp>=0?SPECIES[sp].id:'anthias')+'-'+String(index+1).padStart(3,'0');
  f.bioSeed=id;f.routeShape=[bioValue(id,12),bioValue(id,13)];f.bioMorph=[.90+bioValue(id,0)*.20,.89+bioValue(id,1)*.22,.89+bioValue(id,2)*.22,.82+bioValue(id,3)*.35];
  f.bioGenes=[bioValue(id,4),bioValue(id,5),bioValue(id,6),bioValue(id,7)];
  const pigment=.92+.12*bioValue(id,8),warm=(bioValue(id,9)-.5)*.045;
  f.tint=[pigment*(1+warm),pigment,pigment*(1-warm*.60)];
  f.finWear=bioValue(id,10)>.85?(bioValue(id,10)-.85)*3:0;
  f.effort=.6;f.bank=0;f.bioActive=true;
  // Short reef fish beat more often; large cruising animals keep their own deformation rig.
  if(sp>=0&&sp<8)f.bioMorph[3]*=[1.12,.90,.83,.81,1.08,1.28,.75,.94][sp];
  // These anatomical models use the catalogue's metre scale (including a 2.4 cm
  // sea horse). Individual identity may change pigment, never the animal's size.
  const scale=f.fauna?1:.91+.18*bioValue(id,11);for(let n=0;n<3;n++)f.s[n]=f.bioBaseScale[n]*scale;
 }
 for(let k=0;k<shoal.length;k++){
  const f=shoal[k],id=bioHash(k+82491),sc=.165+.078*bioValue(id,0);
  f.bioSeed=id;f.uid='shoal-'+String(k+1).padStart(3,'0');f.s=[sc,sc,sc];
  f.bioMorph=[.9+.2*bioValue(id,1),.9+.2*bioValue(id,2),.9+.15*bioValue(id,3),.82+.35*bioValue(id,4)];
  f.bioGenes=[bioValue(id,5),bioValue(id,6),bioValue(id,7),bioValue(id,8)];
  f.tint=[.90+.07*bioValue(id,9),.94+.06*bioValue(id,10),.96+.06*bioValue(id,11)];f.effort=.7;
  f.schoolOffset=[(bioValue(id,13)-.5)*2,(bioValue(id,14)-.5)*2,(bioValue(id,15)-.5)*2];
 }
 const done=new Set();let index=0;
 for(const batch of r.batches){for(const f of batch.instances){if(done.has(f))continue;done.add(f);if(f.bioGenes)continue;
  const id=bioHash(19721+(++index)*271);f.bioGenes=[bioValue(id,0),bioValue(id,1),bioValue(id,2),bioValue(id,3)];
  if([3,4,7,8].includes(batch.material)){
   // Adjacent colonies have constrained tone changes, not a rainbow of identical pots.
   const tone=.85+.17*bioValue(id,4);f.tint=[tone*(1+.035*bioValue(id,5)),tone,tone*(.95+.07*bioValue(id,6))];
  }
 }}
 r.individualCount=allLife.length+shoal.length;
 initializeAnimalContact(r);
}
// A continuously differentiable path, with a different route and pace per animal.
// No per-frame random numbers: revisiting time t produces exactly the same transform.
function animalTrajectory(f,t,out,includeHeight=true){
 const id=f.bioSeed||1,s0=f.routeShape?f.routeShape[0]:bioValue(id,12),s1=f.routeShape?f.routeShape[1]:bioValue(id,13),phase=f.orbit;
 // Analytically integrated burst/glide pace is continuous and never reverses a route.
 const cadence=.30+s0*.18,burst=f.species<8?(f.species===0?.67:.48):.13;
 const pulse=burst/cadence*Math.sin(t*cadence+f.bob);
 const a=phase+(t+pulse)*f.speed;
 const radius=f.radius*(.88+.13*Math.sin(a*1.71+s0*6.3)+.08*Math.sin(t*.063+s1*7));
 let x=f.center[0]+Math.cos(a)*radius+Math.sin(a*2.31+s1*6.3)*f.radius*.085;
 let z=f.center[2]+Math.sin(a)*radius*(.57+s1*.25)+Math.cos(a*1.83+s0*3)*f.radius*.11;
 // Banking reads only the previous sample's x/z. Its height and vertical
 // obstacle avoidance cannot affect either horizontal coordinate.
 if(!includeHeight){out[0]=x;out[2]=z;return;}
 const terrain=f.fixedDepth===undefined&&f.species!==0?groundHeight(x,z):null;
 if(terrain!==null&&out===f.p){let sample=animalTrajectoryFloors.get(f);if(!sample){sample={x,z,y:terrain};animalTrajectoryFloors.set(f,sample);}else{sample.x=x;sample.z=z;sample.y=terrain;}}
 let y=f.fixedDepth!==undefined?f.fixedDepth+Math.sin(t*(.19+s0*.09)+f.bob)*.20:
  f.species===0?f.center[1]+f.height+Math.sin(t*(.50+s1*.18)+f.bob)*.075:
  terrain+f.height+Math.sin(t*(.24+s1*.10)+f.bob)*.16;
 if(f.species!==0){
  // Smoothly anticipates a reef obstacle instead of suddenly jumping up at its edge.
  for(const ob of (fishObstacleBuckets.get(Math.floor(x/12)+','+Math.floor(z/12))||NO_FISH_OBSTACLES)){const dx=(x-ob.p[0])/(ob.s[0]+.9),dz=(z-ob.p[2])/(ob.s[2]+.9),d=dx*dx+dz*dz;
   if(d<2.6&&ob.p[1]+ob.s[1]>.2+y){const w=1-smooth01((d-.45)/2.15);y=Math.max(y,mix(y,ob.p[1]+ob.s[1]+.72,w));}
  }
 }
 out[0]=x;out[1]=Math.min(-1.05,y);out[2]=z;
}
const trajectoryTmp=[0,0,0],trajectoryPrev=[0,0,0];
// Habitat-relative paths are separate from the travelling reef fish. The root is
// supplied by world generation; benthic animals never sample a remote seabed or
// inherit a large circular fish route. All lengths are metres, not display units.
function faunaTrajectory(f,time,out){
 const home=f.home||f.center,sp=SPECIES[f.species],id=sp?.id,phase=f.phase??f.bob??0,size=f.s?.[0]||sp?.size||.1,yaw=f.homeYaw||0;
 const radius=Math.max(0,Number.isFinite(f.radius)?f.radius:size*1.5);let x=0,y=0,z=0;
 if(id==='cinderella_slug'){
  const r=Math.min(radius,size*.85),a=time*.018+phase;x=Math.sin(a)*r;z=Math.sin(a*.47)*r*.24;
 }else if(id==='pistol_shrimp'){
  // Leave the opening briefly, stop to forage, then withdraw along the same ledge.
  x=(.5+.5*Math.sin(time*.37+phase))*Math.min(radius,size*.65);
 }else if(id==='frogfish'){
  const beat=time/11+phase,step=Math.floor(beat)+smooth01(clamp((beat%1)/.17,0,1)),r=Math.min(radius,size*.45);
  x=Math.sin(step*.61)*r;z=Math.sin(step*.29)*r*.35;
 }else if(id==='lionfish'){
  const r=Math.min(radius,size*3),a=time*.10+phase;x=Math.sin(a)*r;z=Math.sin(a*.5)*r*.52;y=Math.sin(a*.73)*size*.14;
 }else if(id==='cuttlefish'){
  const r=Math.min(radius,size*.65),a=time*.18+phase;x=Math.sin(a)*r;z=Math.sin(a*.63)*r*.48;y=Math.sin(a*1.31)*size*.16;
 }else if(id==='nautilus'){
  // Integrated jet pulse: non-negative speed, with a long glide between pulses.
  const a=(time+.78*Math.sin(time*.72+phase))*.075+phase,r=Math.min(radius,size*2.4);
  x=Math.sin(a)*r;z=Math.sin(a*.61)*r*.58;y=Math.sin(a*.84)*size*.20;
 }
 const c=Math.cos(yaw),s=Math.sin(yaw);out[0]=home[0]+c*x+s*z;out[1]=home[1]+y;out[2]=home[2]-s*x+c*z;return out;
}
const faunaAhead=[0,0,0],faunaBehind=[0,0,0];
// Authored cruising/cadence differences, not measurements of captive or wild
// respiration. Anatomy remains metre-scaled; only the route and pose change.
const CETACEAN_MOTION={
 common_dolphin:{cruiseSpeed:2.5,beat:3.15,surfacePeriod:49,depthSwing:1.8},
 white_sided_dolphin:{cruiseSpeed:2.3,beat:2.85,surfacePeriod:57,depthSwing:2.2},
 commerson_dolphin:{cruiseSpeed:1.7,beat:3.45,surfacePeriod:43,depthSwing:1.2},
 orca:{cruiseSpeed:2.7,beat:1.55,surfacePeriod:83,depthSwing:3.4},
 beluga:{cruiseSpeed:1.35,beat:1.85,surfacePeriod:71,depthSwing:2.0},
 false_killer_whale:{cruiseSpeed:2.6,beat:2.05,surfacePeriod:77,depthSwing:3.1},
 rissos_dolphin:{cruiseSpeed:1.9,beat:2.35,surfacePeriod:67,depthSwing:2.7}
};
const cetaceanCandidates=new Set(),cetaceanAhead=[0,0,0],cetaceanBehind=[0,0,0];
function cetaceanProfile(f){const sp=SPECIES[f.species];return sp.motionProfile||CETACEAN_MOTION[sp.id]||CETACEAN_MOTION.common_dolphin;}
function cetaceanTrajectory(f,time,out,context){
 const sp=SPECIES[f.species],profile=cetaceanProfile(f),home=f.home||f.center,size=f.s[0],seed=f.bioSeed||1,phase=f.phase??f.bob??0,exhibit=!!context?.exhibit;
 const radius=exhibit?Math.max(.5,Math.min(2.4,f.radius||size*.6)):Math.max(size*1.8,f.radius||18);
 const pace=profile.cruiseSpeed*(.92+bioValue(seed,21)*.16)*(exhibit?.24:1),omega=pace/radius;
 const a=time*omega+phase+.10*Math.sin(time*.18+phase),aspect=.68+bioValue(seed,22)*.16;
 let x=Math.cos(a)*radius,z=Math.sin(a)*radius*aspect;
 const yaw=f.homeYaw||0,c=Math.cos(yaw),s=Math.sin(yaw);out[0]=home[0]+c*x+s*z;out[2]=home[2]-s*x+c*z;
 const modelHeight=Math.max(.18,sp.modelBounds?.max[1]||0,Math.abs(sp.modelBounds?.min[1]||0)),hullY=size*(modelHeight+.17)+.15,ceiling=-hullY-.12;
 let y=home[1]+Math.sin(time*(exhibit?.14:.061)+phase)*profile.depthSwing*(exhibit?.12:1);
 if(!exhibit){
  const surface=smooth01((Math.cos(time*6.283185/profile.surfacePeriod+phase)-.72)/.28);y=mix(y,ceiling,surface);
  // Conservative whole-body horizontal envelope. Nearby tall structures cause a
  // lateral detour; the broad influence fades before contact instead of teleporting.
  let candidates=context?.obstacles;
  if(!candidates){cetaceanCandidates.clear();const reach=Math.ceil((size*.55+3)/12)+1,cx=Math.floor(out[0]/12),cz=Math.floor(out[2]/12);for(let ix=cx-reach;ix<=cx+reach;ix++)for(let iz=cz-reach;iz<=cz+reach;iz++)for(const ob of fishObstacleBuckets.get(ix+','+iz)||NO_FISH_OBSTACLES)cetaceanCandidates.add(ob);candidates=cetaceanCandidates;}
  for(let pass=0;pass<2;pass++)for(const ob of candidates){
   if(ob.p[1]+ob.s[1]<y-hullY||ob.p[1]-ob.s[1]>y+hullY)continue;
   const rx=ob.s[0]+size*.55+.45,rz=ob.s[2]+size*.55+.45,dx=(out[0]-ob.p[0])/rx,dz=(out[2]-ob.p[2])/rz,d=Math.hypot(dx,dz);
   if(d>=1.9)continue;
   // A fixed outward detour direction avoids flipping across the obstacle when
   // the undeformed path happens to pass through its exact centre.
   const ox=(ob.p[0]-home[0])/rx,oz=(ob.p[2]-home[2])/rz,angle=Math.hypot(ox,oz)>.001?Math.atan2(oz,ox):phase+bioValue(seed,24)*6.283185,nx=Math.cos(angle),nz=Math.sin(angle),along=dx*nx+dz*nz,across=dx*nz-dz*nx;
   const edge=1.4*Math.exp(-.32*across*across),weight=1-smooth01((d-1.3)/.6),push=Math.max(0,edge-along)*weight;
   out[0]+=nx*rx*push;out[2]+=nz*rz*push;
  }
  // Broad, smooth repulsion from a shallowing bank toward the authored deep-water
  // home. Repeated bounded blends avoid a hard snap at the depth threshold.
  for(let pass=0;pass<6;pass++){const floor=groundHeight(out[0],out[2])+hullY+.35,weight=.92*smooth01((floor-ceiling+1.5)/3);if(weight===0)break;out[0]=mix(out[0],home[0],weight);out[2]=mix(out[2],home[2],weight);}
  y=Math.max(y,groundHeight(out[0],out[2])+hullY+.35);
 }else y=Math.max(-15+hullY,y);
 out[1]=Math.min(ceiling,y);return out;
}
// Public pose seam. context.exhibit isolates tank motion from world terrain and
// avoidance; context.obstacles supports deterministic isolated behavior checks.
function cetaceanMotionPose(f,time,out=f.p,context=null){
 const profile=cetaceanProfile(f),phase=f.phase??f.bob??0,seed=f.bioSeed||1;
 cetaceanTrajectory(f,time,out,context);cetaceanTrajectory(f,time+.08,cetaceanAhead,context);cetaceanTrajectory(f,time-.08,cetaceanBehind,context);
 const dx=cetaceanAhead[0]-cetaceanBehind[0],dy=cetaceanAhead[1]-cetaceanBehind[1],dz=cetaceanAhead[2]-cetaceanBehind[2],speed=Math.hypot(dx,dy,dz)/.16;
 f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.34,.34);
 const px=out[0]-cetaceanBehind[0],pz=out[2]-cetaceanBehind[2],nx=cetaceanAhead[0]-out[0],nz=cetaceanAhead[2]-out[2],turn=Math.atan2(px*nz-pz*nx,px*nx+pz*nz)/.08;
 f.bank=clamp(turn*.45,-.24,.24);f.effort=clamp(speed/profile.cruiseSpeed,.20,1);
 f.cetaceanBeat=profile.beat*(.94+bioValue(seed,23)*.12);f.partnerFinPulse=0;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
// New deep-water catalogue uses small, habitat-bounded paths, never the
// cetaceans' surfacing cycle. Bounds include all tentacles/legs at metre scale.
const abyssAhead=[0,0,0],abyssBehind=[0,0,0];
// Both depth-clearance sweeps use the same authored ring, including its centre
// sample. Reuse the exact directions instead of recomputing them per pose.
const faunaFloorDirections=Array.from({length:9},(_,i)=>{const a=i*(Math.PI*2)/8;return [Math.cos(a),Math.sin(a)];});
function abyssEnvelope(f){const sp=SPECIES[f.species],b=sp.modelBounds,s=f.s[0],hx=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),hz=Math.max(Math.abs(b.min[2]),Math.abs(b.max[2])),crawl=sp.traits.motion==='crawl',bend=crawl?0:s*(hx*.10+.018);return {horizontal:s*Math.hypot(hx,hz)+.025+s*.02,bottom:Math.max(0,-b.min[1]*s)+bend,top:b.max[1]*s+bend};}
const abyssPathCache=new WeakMap(),abyssStaticWorlds=new WeakMap();
function abyssPath(f,context=null){
 const sp=SPECIES[f.species],profile=sp.motionProfile,home=f.home||f.center,b=sp.modelBounds,scale=f.s[0],requested=Number.isFinite(f.radius)?f.radius:profile.radius,crawl=sp.traits.motion==='crawl',exhibit=!!context?.exhibit;
 // Preserve the original lazy fallback: isolated contexts/exhibits must not
 // resolve a region module that may not have been loaded yet.
 const world=!exhibit&&!context?.solids&&typeof OceanRegions!=='undefined'?OceanRegions:null;
 // Explicit contexts may supply changing solids or callbacks. Only the deeply
 // frozen world catalogue can share its home-centred avoidance calculation.
 let cacheable=!context;
 if(cacheable&&world){let fixed=abyssStaticWorlds.get(world);if(fixed===undefined){fixed=Object.isFrozen(world)&&Object.isFrozen(world.solids)&&Array.isArray(world.solids)&&world.solids.every(box=>Object.isFrozen(box)&&Object.isFrozen(box.min)&&Object.isFrozen(box.max));abyssStaticWorlds.set(world,fixed);}cacheable=fixed;}
 const cached=cacheable&&abyssPathCache.get(f);
 if(cached&&cached.world===world&&cached.species===sp&&cached.x===home[0]&&cached.y===home[1]&&cached.z===home[2]&&cached.scale===scale&&cached.requested===requested&&cached.limit===profile.radius&&cached.bob===profile.bob&&cached.crawl===crawl&&cached.minX===b.min[0]&&cached.minY===b.min[1]&&cached.minZ===b.min[2]&&cached.maxX===b.max[0]&&cached.maxY===b.max[1]&&cached.maxZ===b.max[2])return cached;
 const hull=abyssEnvelope(f);let radius=Math.max(0,Math.min(requested,profile.radius));
 if(exhibit)radius=Math.min(radius,crawl?.30:1.15);
 else{
  const reach=Math.max(radius+hull.horizontal+.04,hull.bottom+.04,hull.top+profile.bob+.04);
  const solids=context?.solids||(world?(world.nearbySolids?world.nearbySolids(home,reach):world.solids):[]);
  // Reserve a circle around the home for every heading, including the entire
  // eight-metre squid. Keeping a single safe radius avoids obstacle teleports.
  for(const box of solids||[]){if(box.max[1]<=home[1]-hull.bottom-.04||box.min[1]>=home[1]+hull.top+profile.bob+.04)continue;const dx=Math.max(box.min[0]-home[0],0,home[0]-box.max[0]),dz=Math.max(box.min[2]-home[2],0,home[2]-box.max[2]);radius=Math.min(radius,Math.max(0,Math.hypot(dx,dz)-hull.horizontal-.04));}
 }
 const path={world,species:sp,x:home[0],y:home[1],z:home[2],scale,requested,limit:profile.radius,bob:profile.bob,crawl,minX:b.min[0],minY:b.min[1],minZ:b.min[2],maxX:b.max[0],maxY:b.max[1],maxZ:b.max[2],radius,hull};if(cacheable)abyssPathCache.set(f,path);return path;
}
function abyssTrajectory(f,time,out,context=null){
 const sp=SPECIES[f.species],profile=sp.motionProfile,home=f.home||f.center,phase=f.phase??f.bob??0,exhibit=!!context?.exhibit,{hull,radius}=abyssPath(f,context),crawl=sp.traits.motion==='crawl';
 const omega=profile.speed/Math.max(.2,radius)*(exhibit?.40:1),a=time*omega+phase,x=Math.sin(a)*radius,z=Math.sin(a*.73)*radius*.42,yaw=f.homeYaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
 out[0]=home[0]+c*x+s*z;out[2]=home[2]-s*x+c*z;
 let y=home[1]+(crawl?0:Math.sin(a*.61+phase)*profile.bob*(exhibit?.45:1));
 if(!exhibit){
  const floorFn=context?.groundHeight||(typeof groundHeight==='function'?groundHeight:null),roofFn=context?.ceilingAt||(typeof OceanRegions!=='undefined'?OceanRegions.ceilingAt:null);
  let floor=Number.isFinite(f.habitatFloor)?f.habitatFloor:-Infinity,roof=Number.isFinite(f.habitatCeiling)?f.habitatCeiling:0;
  // Sample the full horizontal envelope. Root-supplied habitat limits are
  // centre-height limits, already reduced by the authored model clearance.
  for(let i=0;i<9;i++){const d=faunaFloorDirections[i],r=i===8?0:hull.horizontal,px=out[0]+d[0]*r,pz=out[2]+d[1]*r;if(floorFn)floor=Math.max(floor,floorFn(px,pz)+hull.bottom+(crawl?0:.025));if(roofFn)roof=Math.min(roof,roofFn(px,pz,home[1])-hull.top-.025);}
  if(floor<=roof)y=clamp(y,floor,roof);else {out[0]=home[0];out[2]=home[2];y=home[1];}
 }
 out[1]=y;return out;
}
function abyssMotionPose(f,time,out=f.p,context=null){
 const sp=SPECIES[f.species],profile=sp.motionProfile;abyssTrajectory(f,time,out,context);abyssTrajectory(f,time+.06,abyssAhead,context);abyssTrajectory(f,time-.06,abyssBehind,context);
 const dx=abyssAhead[0]-abyssBehind[0],dy=abyssAhead[1]-abyssBehind[1],dz=abyssAhead[2]-abyssBehind[2],speed=Math.hypot(dx,dy,dz)/.12;
 f.yaw=Math.hypot(dx,dz)>.00001?Math.atan2(-dz,dx):(f.homeYaw||0);f.pitch=sp.traits.motion==='crawl'?0:clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.10,.10);f.bank=0;f.effort=clamp(speed/Math.max(.01,profile.speed),.08,1);f.abyssBeat=profile.beat;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
// A deep-station animal stays in its real vertical layer. The 1400 m terrace
// is not the bottom returned by global groundHeight, and exhibits use their
// own support plane rather than any geographic floor.
const trenchPathCache=new WeakMap();
function trenchPath(f,context=null){
 const sp=SPECIES[f.species],profile=sp.motionProfile,home=f.home||f.center,scale=f.s[0],requested=Number.isFinite(f.radius)?f.radius:profile.radius,exhibit=!!context?.exhibit;
 const cached=!context&&trenchPathCache.get(f);if(cached&&cached.home.every((v,i)=>v===home[i])&&cached.scale===scale&&cached.requested===requested)return cached;
 const b=sp.modelBounds,crawl=sp.traits.motion==='crawl',hx=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),hz=Math.max(Math.abs(b.min[2]),Math.abs(b.max[2])),margin=crawl?0:scale*.045;
 const hull={horizontal:scale*(Math.hypot(hx,hz)+.065)+.006,bottom:Math.max(0,-b.min[1]*scale)+margin,top:b.max[1]*scale+margin};let radius=clamp(requested,0,profile.radius);
 if(exhibit)radius=Math.min(radius,crawl?.065:.55);
 else{
  const reach=Math.max(radius+hull.horizontal+.025,hull.bottom+.025,hull.top+profile.bob+.025),world=typeof OceanTrench!=='undefined'?OceanTrench:null,solids=context?.solids??(world?.nearbySolids?world.nearbySolids(home,reach):world?.solids)??[];
  for(const box of solids){if(box.max[1]<=home[1]-hull.bottom+.003||box.min[1]>=home[1]+hull.top+profile.bob+.025)continue;const dx=Math.max(box.min[0]-home[0],0,home[0]-box.max[0]),dz=Math.max(box.min[2]-home[2],0,home[2]-box.max[2]);radius=Math.min(radius,Math.max(0,Math.hypot(dx,dz)-hull.horizontal-.025));}
 }
 const result={home:home.slice(),scale,requested,radius,hull};if(!context)trenchPathCache.set(f,result);return result;
}
function trenchMotionPose(f,time,out=f.p,context=null){
 const sp=SPECIES[f.species],profile=sp.motionProfile,home=f.home||f.center,phase=f.phase||0,crawl=sp.traits.motion==='crawl',exhibit=!!context?.exhibit,{radius,hull}=trenchPath(f,context),omega=profile.speed/Math.max(.08,radius)*(exhibit?.65:1),a=time*omega+phase,yaw=f.homeYaw||0,c=Math.cos(yaw),s=Math.sin(yaw),x=Math.sin(a)*radius,z=Math.sin(a*.73)*radius*.42;
 out[0]=home[0]+c*x+s*z;out[2]=home[2]-s*x+c*z;out[1]=home[1]+(crawl?0:Math.sin(a*.61+phase)*profile.bob);
 let floor=Number.isFinite(f.habitatFloor)?f.habitatFloor:-Infinity,ceiling=Number.isFinite(f.habitatCeiling)?f.habitatCeiling:0;
 if(!exhibit){const world=typeof OceanTrench!=='undefined'?OceanTrench:null,floorAt=context?.floorAt||(context?.groundHeight?((x,z)=>context.groundHeight(x,z)):world?.floorAt),roofAt=context?.ceilingAt;
  if(floorAt)for(let i=0;i<9;i++){const d=faunaFloorDirections[i],r=i===8?0:hull.horizontal,px=out[0]+d[0]*r,pz=out[2]+d[1]*r,h=floorAt(px,pz,home[1]+hull.top+.1);if(Number.isFinite(h))floor=Math.max(floor,h+hull.bottom+(crawl?0:.015));if(roofAt){const roof=roofAt(px,pz,home[1]);if(Number.isFinite(roof))ceiling=Math.min(ceiling,roof-hull.top-.015);}}
  if(floor<=ceiling)out[1]=crawl&&Number.isFinite(floor)?floor:clamp(out[1],floor,ceiling);else {out[0]=home[0];out[1]=home[1];out[2]=home[2];}
 }
 const vx=Math.cos(a)*radius*omega,vz=Math.cos(a*.73)*radius*.42*.73*omega,dx=c*vx+s*vz,dz=-s*vx+c*vz,dy=crawl?0:Math.cos(a*.61+phase)*profile.bob*.61*omega;
 f.yaw=Math.hypot(dx,dz)>.000001?Math.atan2(-dz,dx):yaw;f.pitch=crawl?0:clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.04,.04);f.bank=0;f.effort=clamp(Math.hypot(dx,dy,dz)/Math.max(.001,profile.speed),.08,1);f.trenchBeat=profile.beat;f.feedingPhase=((time*(crawl?.06:.045)+phase)%1+1)%1;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
// Public seam used by the world, aquarium and tests. It updates only pose/state;
// home, uid and s are immutable. react:false is a deterministic exhibit playback.
function faunaMotionPose(f,time,out=f.p,context=null){
 if(SPECIES[f.species]?.id==='barramundi')return oceanBarramundi.motionPose(f,time,out,context);
 if(SPECIES[f.species]?.trench)return trenchMotionPose(f,time,out,context);
 if(SPECIES[f.species]?.abyss)return abyssMotionPose(f,time,out,context);
 if(SPECIES[f.species]?.cetacean||SPECIES[f.species]?.traits?.motion==='cetacean')return cetaceanMotionPose(f,time,out,context);
 const id=SPECIES[f.species]?.id,phase=f.phase??f.bob??0,home=f.home||f.center;
 faunaTrajectory(f,time,out);faunaTrajectory(f,time+.055,faunaAhead);faunaTrajectory(f,time-.055,faunaBehind);
 const dx=faunaAhead[0]-faunaBehind[0],dy=faunaAhead[1]-faunaBehind[1],dz=faunaAhead[2]-faunaBehind[2],speed=Math.hypot(dx,dy,dz)/.11;
 const anchored=id==='pygmy_seahorse'||id==='garden_eel'||id==='pistol_shrimp';
 f.yaw=anchored||speed<.00001?(f.homeYaw||0):Math.atan2(-dz,dx);
 if(id==='frogfish'){
  const beat=time/11+phase,step=Math.floor(beat)+smooth01(clamp((beat%1)/.17,0,1));
  // Keep facing the last step during a pause, without relying on frame history.
  f.yaw=(f.homeYaw||0)+Math.atan2(-Math.cos(step*.29)*.29*.35,Math.cos(step*.61)*.61);
 }
 f.pitch=anchored||id==='cinderella_slug'||id==='frogfish'?0:clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.12,.12);
 f.bank=0;f.effort=clamp(speed/Math.max(.001,f.s?.[0]||.1),.08,.65);
 const react=context?context.react!==false:typeof active!=='undefined'&&active;
 const observer=context?.observerPosition||(react&&typeof player!=='undefined'?player.p:null),velocity=context?.observerVelocity||(react&&typeof player!=='undefined'?player.velocity:null);
 const delta=Number.isFinite(f.faunaTime)?clamp(time-f.faunaTime,0,.25):0;
 if(!react||time<(f.faunaTime??time)){f.retreat=0;f.faunaAlarmUntil=0;}
 if(react&&(id==='garden_eel'||id==='pistol_shrimp')){
  const distance=observer?Math.hypot(observer[0]-home[0],observer[1]-home[1],observer[2]-home[2]):Infinity;
  if(velocity&&Math.hypot(...velocity)>.55&&distance<(id==='garden_eel'?1.25:.65))f.faunaAlarmUntil=time+3.2;
  const alarm=time<(f.faunaAlarmUntil||0),target=alarm?1:0;
  f.retreat=(f.retreat||0)+(target-(f.retreat||0))*(1-Math.exp(-delta*(alarm?15:.78)));
 }else f.retreat=0;
 const natural=id==='pistol_shrimp'?smooth01((Math.sin(time*.37+phase)-.35)/.55):0;
 f.faunaVisibility=clamp(1-Math.max(f.retreat,natural),0,1);f.faunaVisible=f.faunaVisibility>.12;f.faunaTime=time;return out;
}
function updateLife(t){
 updateReefSchool(t);
 for(const f of allLife){
  if(f.fauna){faunaMotionPose(f,t,f.p);contactAnimal(f,t);continue;}
  f.partnerFinPulse=0;
  animalTrajectory(f,t,f.p);animalTrajectory(f,t+.055,trajectoryTmp);animalTrajectory(f,t-.055,trajectoryPrev,false);
  const dx=trajectoryTmp[0]-f.p[0],dy=trajectoryTmp[1]-f.p[1],dz=trajectoryTmp[2]-f.p[2];
  f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.29,.29);
  const px=f.p[0]-trajectoryPrev[0],pz=f.p[2]-trajectoryPrev[2];
  const turn=Math.atan2(px*dz-pz*dx,px*dx+pz*dz)/.055;
  f.bank=clamp(turn*.23,-.17,.17);f.effort=clamp(Math.hypot(dx,dy,dz)/.055/(f.s[0]*1.8),.22,1.);
  contactAnimal(f,t);
 }
}
const reefSchoolMotion=new WeakMap();
const reefSchoolGroups=new Map();
function updateReefSchool(t){
 // One current-following shoal. Turns travel along its body instead of every fish
 // endlessly orbiting the same point like particles in a decorative vortex.
 for(const f of shoal){
  const id=f.bioSeed||bioHash(f.slot+1),q=f.schoolOffset||[0,0,0];
  // Phase, radial placement and identity are stable during play. Keep them out
  // of the frame math, while allowing authored edits to invalidate this entry.
  let fixed=reefSchoolMotion.get(f);
  if(!fixed||fixed.id!==id||fixed.phase!==f.phase||fixed.rad!==f.rad){fixed={id,phase:f.phase,rad:f.rad,delay:bioValue(id,17)*1.6,along:Math.cos(f.phase)*f.rad*5.3,spread:Math.sin(f.phase)*f.rad*1.65,vertical:Math.sin(f.phase*1.91)*f.rad*.48};reefSchoolMotion.set(f,fixed);}
  const tt=t-fixed.delay,a=tt*.044,grouped=f.schoolHome&&Number.isFinite(f.schoolGroup)&&Number.isFinite(f.schoolSpan);let sinA,cx,cz,heading,c,s,vertical,span=1;
  if(grouped){
   const home=f.schoolHome,groupID=f.schoolGroup;span=f.schoolSpan;let group=reefSchoolGroups.get(groupID);
   if(!group||group.time!==t||group.epoch!==f.encounterEpoch||group.home[0]!==home[0]||group.home[1]!==home[1]||group.home[2]!==home[2]||group.span!==span){
    const phase=bioValue(bioHash(groupID+7141+(f.encounterEpoch||0)),17)*TAU,angle=t*.044+phase,sa=Math.sin(angle),h=Math.atan2(Math.sin(angle*.79)*.191,Math.cos(angle)*.374);
    group={time:t,epoch:f.encounterEpoch,home:home.slice(),span,sin:sa,x:home[0]+sa*8.5*span,z:home[2]-Math.cos(angle*.79)*5.5*span,y:home[1]+Math.sin(t*.07+phase)*.38*span,heading:h,c:Math.cos(h),s:Math.sin(h)};reefSchoolGroups.set(groupID,group);
   }
   sinA=group.sin;cx=group.x;cz=group.z;vertical=group.y;heading=group.heading;c=group.c;s=group.s;
  }else{
   sinA=Math.sin(a);cx=1+sinA*8.5;cz=-12-Math.cos(a*.79)*5.5;
   const dx=Math.cos(a)*.374,dz=Math.sin(a*.79)*.191;heading=Math.atan2(dz,dx);c=Math.cos(heading);s=Math.sin(heading);vertical=-6.7+Math.sin(tt*.07)*.38;
  }
  const along=fixed.along,spread=fixed.spread;
  const ripplePhase=Math.sin(tt*.72+along*.65+f.phase),breathing=1+.12*Math.sin(tt*.27),ripple=.12*ripplePhase;
  if(grouped){f.p[0]=cx+(c*along-s*(spread*breathing+ripple)+q[0]*.14)*span;f.p[1]=vertical+(q[1]*.58+fixed.vertical)*span;f.p[2]=cz+(s*along+c*(spread*breathing+ripple)+q[2]*.12)*span;}
  else{f.p[0]=cx+c*along-s*(spread*breathing+ripple)+q[0]*.14;f.p[1]=-6.7+Math.sin(tt*.07)*.38+q[1]*.58+fixed.vertical;f.p[2]=cz+s*along+c*(spread*breathing+ripple)+q[2]*.12;}
  f.yaw=-heading+.06*ripplePhase;
  f.pitch=Math.cos(tt*.07)*.022;f.bank=.025*sinA;f.effort=.53+.15*Math.sin(tt*.72+f.phase);
  contactAnimal(f,t);
 }
}
/* Species contour remains identical across high and low detail meshes. */
function fishContour(s,t){
 const shape=Math.pow(Math.max(.000001,Math.sin(t*Math.PI)),.72)*(1.11-.23*t)*(1-.24*Math.exp(-Math.pow((t-.91)/.095,2)));
 let height=shape,width=shape,offset=0;
 if(s.id==='butterfly'||s.id==='idol'){
  height*=1+.12*Math.exp(-Math.pow((t-.40)/.23,2));
  const snout=1-.43*Math.exp(-Math.pow((t-.10)/.10,2));height*=snout;width*=snout;
 }else if(s.id==='parrot'){
  height*=1+.14*Math.exp(-Math.pow((t-.17)/.12,2));width*=1+.12*Math.exp(-Math.pow((t-.20)/.16,2));offset=.018*Math.sin(t*Math.PI);
 }else if(s.id==='wrasse'){height*=.93;offset=.009*Math.sin(t*Math.PI);}
 else if(s.id==='chromis'||s.id==='decor'||s.id==='silver')height*=.93;
 else if(s.id==='tang')height*=1+.05*Math.sin(t*Math.PI);
 return {height:height*s.height,width:width*s.width,offset};
}
function fishGeometry(s,lod=false){
 const g=new Geometry();g.material=6;g.species=SPECIES.findIndex(x=>x.id===s.id);g.shadow=!lod;g.tag=1;
 const H=s.height,W=s.width,round=s.id==='clown',slender=['wrasse','chromis','decor','silver'].includes(s.id);
 surface(g,(u,v)=>{const a=u*TAU,t=clamp(v,0,1),p=fishContour(s,t);return [.57-t*1.1,Math.cos(a)*p.height+p.offset,Math.sin(a)*p.width];},lod?12:32,lod?20:46,p=>fishColor(s,...p),-1);
 g.tag=2;g.sphere([.535,-.026,0],[s.id==='parrot'?.034:.020,.014,.027],fishColor(s,.51,-.02,0),lod?8:18,lod?5:10);
 if(!lod)g.sphere([.555,-.027,0],[.007,.0018,.022],[.07,.055,.045],14,6);
 for(const side of [-1,1]){
  const eyeWidth=fishContour(s,(.57-.385)/1.1).width*.96;
  g.tag=4;g.sphere([.385,.056,side*eyeWidth],[.0188,.020,.009],round?[.30,.28,.19]:[.37,.39,.31],lod?8:18,lod?5:12);
  g.sphere([.390,.057,side*(eyeWidth+.007)],[.0125,.0138,.006],[.009,.014,.019],lod?6:16,lod?4:10);
  g.tag=3;const fin=round?[.57,.27,.075]:rgb(s.color).map(x=>x*.86);
  surface(g,(u,v)=>{const span=Math.sin(Math.PI*u),tip=.77+.23*span;
   return [.22-v*(.12+.13*span),-.018+v*(.042-.165*u)*tip,side*(W*.92+v*(.012+.12*span))];
  },lod?8:20,lod?4:10,(p,u,v)=>{const c=s.id==='tang'?[.45,.57,.52]:fin;return c.map(x=>x*(.85+.13*v));},side>0?1:-1);
  // Paired pelvic fins contribute a separate, swept silhouette below the body.
  surface(g,(u,v)=>{const span=Math.sin(Math.PI*u),root=fishContour(s,.43);return [.10-v*(.11+span*.10),-root.height*.80-v*H*(.14+span*.12),side*(W*.25+span*v*.045)];},lod?4:9,lod?2:4,fin,side>0?1:-1);
  if(!lod){let prev=null;g.tag=1.2;for(let j=0;j<20;j++){const a=-.67+j/19*1.32,pt=[.27-.045*Math.cos(a*1.8),a*H*.71,side*W*.93*Math.sqrt(Math.max(.1,1-a*a))];if(prev)g.tube(prev,pt,.0021,.0021,[.17,.19,.19],4);prev=pt;}}
 }
 g.tag=3.1;const tail=['tang','idol'].includes(s.id)?[.74,.65,.31]:rgb(s.color).map(v=>v*.90);
 surface(g,(u,v)=>{const a=(u-.5)*2,edge=1-Math.abs(a),fork=round?-.022:edge*(slender?.19:.12);
  // A rounded caudal edge with a regular shoulder patch; retain the full root.
  if(round){const angle=a*Math.PI*.5,rootY=a*H*.82*.20,endX=-.73-.122*Math.cos(angle),endY=H*.82*Math.sin(angle);
   return [-.49+v*(endX+.49),rootY+(endY-rootY)*v*(1.75-.75*v),Math.sin(u*Math.PI)*.004];}
  return [-.49-v*(.34-fork),a*H*(slender?.96:.82)*(.20+.80*v),Math.sin(u*Math.PI)*.004];},lod?10:24,lod?3:8,(p,u,v)=>round&&Math.min(u,1-u,1-v)<.06?[.10,.09,.08]:tail,1);
 g.tag=3.2;for(const sign of [-1,1])surface(g,(u,v)=>{const x=.30-u*.73,p=fishContour(s,(.57-x)/1.10);
  const crest=Math.sin(Math.PI*u)*(sign>0?(s.id==='butterfly'?.34:.23):.18)*H;
  const ray=lod?0:.004*Math.sin(u*TAU*15)*Math.pow(v,6);
  return [x,p.offset+sign*(p.height*.96+v*crest+ray),.003*Math.sin(Math.PI*u)];},lod?12:36,lod?3:7,(p,u,v)=>round&&v>.87?[.10,.09,.09]:fishColor(s,p[0],p[1],0),sign>0?1:-1);
 if(s.id==='idol'){const pts=[[.15,.32,0],[.10,.53,0],[-.06,.73,0],[-.34,.82,0],[-.61,.81,0],[-.79,.85,0]];for(let i=0;i<pts.length-1;i++)g.tube(pts[i],pts[i+1],.014-i*.0022,.011-i*.0018,[.89,.89,.80],lod?4:8);}
 return g;
}
function distantFishGeometry(s){return fishGeometry(s,true);}
// Foliose growth is a continuous folded lamina rising from a common basal
// attachment. These are original growth-form studies, not species scans.
const FolioseArt=(()=>{
 // COTW photo studies 0255_C01_02 / 0255_C01_01 / 0255_C04_02: broad
 // incomplete funnels, saddle folds and smaller central whorls arise from a
 // low shared growth region. There is no tall exposed support axis.
 // Each row is [core side, height, reach, sweep, lift, fold phase].
 const leaves=[
  [[0,.126,1.05,-.20,.23,.4],[2,.181,1.12,.25,.27,2.1],[1,.236,.94,-.14,.19,4.6],[3,.291,.83,.30,.25,1.3],[0,.346,.56,.38,.24,3.7],[2,.401,.36,-.31,.26,.2]],
  [[1,.126,1.03,.20,.30,1.1],[3,.181,1.12,-.15,.24,3.8],[0,.236,.94,.36,.31,5.2],[2,.291,.86,.12,.27,2.3],[1,.346,.59,-.25,.30,.1],[3,.401,.36,.33,.24,4.1]]
 ];
 const center=y=>[.065*Math.sin(y*7),y,.045*Math.sin(y*11)];
 function mid(type,leaf,t,u){
  const [side,height,reach,sweep,lift,phase]=leaf,ease=t*t*(3-2*t),spread=Math.PI/4+((type?1.39:1.53)-Math.PI/4)*Math.sin(Math.PI*.5*t);
  const angleU=mix(u,Math.sin(u*Math.PI/2),ease),a=(side+.5)*Math.PI/2+sweep*.6*ease+angleU*spread;
  const taper=Math.min(.18,Math.max(.04,(reach-.26)*.65)),edgeScale=Math.min(1,(reach-.26)/.25),scallop=(.012*Math.sin(u*9+phase)+.006*Math.sin(u*13-phase))*edgeScale,r=(.26+(reach-.26)*t)*(1-taper*u*u*ease)+scallop*t*t;
  const c=center(height),x=c[0]+Math.cos(a)*r,z=c[2]+Math.sin(a)*r,rad=Math.hypot(x,z),az=Math.atan2(z,x),root=.5*(rad-.18+Math.sqrt((rad-.18)**2+.0004));
  // Shared broad growth curvature lets neighbouring laminae overlap without
  // cutting through one another. Individual small relief stays below the
  // separation between growth layers. Smooth angular sampling rounds the
  // shelf corners instead of ending each radial edge in a straight knife cut.
  const folds=(.085*Math.sin(az*2+.4+type)+.034*Math.sin(az*4+rad*.3+type*.7)+.008*Math.sin(az*10+rad*.7))*rad*rad/(rad+.20);
  const y=height+.026+.27*root+folds+.003*Math.sin(u*3+phase)*t;
  return [x,y,z];
 }
 function build(type,lod){
  type=type?1:0;const g=new Geometry();g.material=3;g.shadow=lod!=='far';g.reefGrowth='foliose-'+type;
  const color=type?[.53,.56,.46]:[.60,.51,.37],nw=lod==='high'?48:lod==='middle'?24:12,nt=lod==='high'?5:lod==='middle'?3:2;
  const vertices=[],faces=[],vertex=(p,c)=>{vertices.push({p,c,n:[0,0,0]});return vertices.length-1;};
  const tri=(a,b,c)=>{const n=V.cross(V.sub(vertices[b].p,vertices[a].p),V.sub(vertices[c].p,vertices[a].p));if(V.len(n)<1e-12)return;faces.push([a,b,c]);for(const i of [a,b,c])vertices[i].n=V.add(vertices[i].n,n);};
  const tone=(t,under,u=0)=>color.map(c=>mix(c*(under?.96:.93+.03*t),.76,Math.max(Math.pow(t,18),Math.abs(u)**22)*(under?.09:.13)));
  // The basal section stays byte-for-byte in the same position at every LOD.
  // Above it a low, broad common growth region has actual openings sewn to
  // the laminae. Small folded leaves cover its crown instead of exposing a pole.
  const rootColor=tone(0,true),bottom=vertex([0,-.06,0],rootColor),root=[[-.04,.065],[0,.10],[.08,.12]].map(([y,r])=>Array.from({length:12},(_,i)=>vertex([Math.cos(i/12*TAU)*r,y,Math.sin(i/12*TAU)*r],rootColor)));
  for(let i=0;i<12;i++){const next=(i+1)%12;tri(bottom,root[0][i],root[0][next]);for(let j=0;j<root.length-1;j++){tri(root[j][i],root[j+1][next],root[j][next]);tri(root[j][i],root[j+1][i],root[j+1][next]);}}
  const levels=[.095,...leaves[type].flatMap(l=>[l[1]-.016,l[1]+.016])],core=levels.map(y=>Array.from({length:12},(_,i)=>{const c=center(y),r=.235-.12*(y/.43);return vertex([c[0]+Math.cos(i/12*TAU)*r,y,c[2]+Math.sin(i/12*TAU)*r],rootColor);}));
  const base=root[root.length-1];for(let j=0;j<12;j++){const n=(j+1)%12;tri(base[j],core[0][n],base[n]);tri(base[j],core[0][j],core[0][n]);}
  for(let k=0;k<core.length-1;k++)for(let j=0;j<12;j++){if(k%2===1&&Math.floor(j/3)===leaves[type][(k-1)/2][0])continue;const next=(j+1)%12;tri(core[k][j],core[k+1][next],core[k][next]);tri(core[k][j],core[k+1][j],core[k+1][next]);}
  const cap=vertex(center(levels[levels.length-1]+.012),tone(0,false));for(let j=0;j<12;j++)tri(cap,core[core.length-1][(j+1)%12],core[core.length-1][j]);
  for(let k=0;k<leaves[type].length;k++){
   const leaf=leaves[type][k],nv=leaf[2]<.45?Math.max(nt,5):nt,s=leaf[0]*3,next=(s+3)%12,ll=core[k*2+1][s],lr=core[k*2+1][next],ul=core[k*2+2][s],ur=core[k*2+2][next];
   // Keeping matching X/Z samples on the two sides preserves a thin closed
   // edge even at coarse LOD; independently offset smooth normals can invert
   // a concave edge when its triangulation becomes much coarser.
   const sheet=[-1,1].map(side=>Array.from({length:nv+1},(_,j)=>Array.from({length:nw+1},(_,i)=>{const t=j/nv,u=i/nw*2-1,p=mid(type,leaf,t,u),halfThickness=.0045-.0017*t;return vertex([p[0],p[1]+side*halfThickness,p[2]],tone(t,side<0,u));})));
   for(let side=0;side<2;side++)for(let j=0;j<nv;j++)for(let i=0;i<nw;i++){const a=sheet[side][j][i],b=sheet[side][j][i+1],c=sheet[side][j+1][i+1],d=sheet[side][j+1][i];if(side){tri(a,b,c);tri(a,c,d);}else{tri(a,c,b);tri(a,d,c);}}
   const lo=sheet[0][0],hi=sheet[1][0];for(let part=0;part<3;part++){const a=core[k*2+2][(s+part)%12],b=core[k*2+2][(s+part+1)%12],c=core[k*2+1][(s+part)%12],d=core[k*2+1][(s+part+1)%12],start=part*nw/3,end=(part+1)*nw/3;tri(a,b,hi[end]);tri(c,lo[end],d);for(let i=start;i<end;i++){tri(a,hi[i+1],hi[i]);tri(c,lo[i],lo[i+1]);}}
   tri(ll,ul,hi[0]);tri(ll,hi[0],lo[0]);tri(lr,lo[nw],hi[nw]);tri(lr,hi[nw],ur);
   for(let j=0;j<nv;j++){const a=sheet[0][j],b=sheet[1][j],c=sheet[0][j+1],d=sheet[1][j+1];tri(a[0],b[0],d[0]);tri(a[0],d[0],c[0]);tri(a[nw],c[nw],d[nw]);tri(a[nw],d[nw],b[nw]);}
   for(let i=0;i<nw;i++){const lo=sheet[0][nv],hi=sheet[1][nv];tri(hi[i],hi[i+1],lo[i+1]);tri(hi[i],lo[i+1],lo[i]);}
  }
  for(const v of vertices)v.n=V.norm(v.n);
  for(const face of faces){const v=face.map(i=>vertices[i]),n=faceNormal(...v.map(p=>p.p));g.tri(...v.map(p=>p.p),color,v.map(p=>V.dot(n,p.n)>1e-6?p.n:n),v.map(p=>p.c));}
  return g;
 }
 return {build};
})();
function tableCoral(type=0,lod=null){return FolioseArt.build(type,lod||(reefDetailLevel?'high':'middle'));}
// Runtime observation interface: inspect another real instance, no representative clone.
function initIndividualUI(){
 const panel=document.createElement('div');panel.id='individualCard';panel.className='hidden';panel.innerHTML='<div><small>THIS ENCOUNTER</small><b id="individualLabel"></b><span id="individualTraits"></span></div><button id="nextIndividual" title="觀察同種下一隻">下一隻 ↗</button>';$('hud').appendChild(panel);
 $('nextIndividual').onclick=()=>{if(!follow)return;const set=life.filter(f=>f.species===follow.species&&f.ecologyPresent!==false&&f.assetReady!==false);const i=set.indexOf(follow);findSpecies(follow.species,set[(i+1)%set.length]);paintIndividualUI();};
}
function paintIndividualUI(){
 const panel=$('individualCard');if(!panel)return;panel.classList.toggle('hidden',!follow||!active||!!modal);
 if(!follow||!active)return;const set=life.filter(f=>f.species===follow.species&&f.ecologyPresent!==false&&f.assetReady!==false),i=set.indexOf(follow)+1;
 $('individualLabel').textContent=SPECIES[follow.species].name+' · '+String(i).padStart(2,'0')+' / '+String(set.length).padStart(2,'0');
 $('individualTraits').textContent='固定個體 '+follow.uid+' · 體型／花紋／泳姿各有差異';
 $('nextIndividual').disabled=set.length<2;
}

// The branch scaffold is continuously deformed per variant before indexing.
// Its surface normals use the cofactor Jacobian of that deformation; LODs agree.
function sculptedColony(type,lod,mound=false){
 const source=SCULPTED_CORAL[lod],g=new Geometry();g.material=3;g.shadow=true;
 const palette=[[.61,.54,.43],[.49,.53,.52],[.45,.53,.47],[.61,.49,.41],[.55,.56,.45],[.57,.49,.46]],color=palette[type%6];
 const phase=type*1.83, deform=p=>{const x=p[0],y=p[1],z=p[2];
  const radial=1+.17*Math.sin(x*4.7+phase+z*2.2)+.09*Math.cos(z*7.4-phase);
  const growth=.86+.19*Math.sin(x*3.4+phase)+.12*Math.cos(z*4.2-phase*1.4);
  return [x*radial*(mound?1.18:1)+y*y*.085*Math.sin(phase),y*growth*(mound?.63:1)-.11,z*(1+.10*Math.cos(x*3.1+z*4.4+phase))*(mound?1.18:1)];};
 const points=[],normals=[],colors=[];
 for(let i=0;i<source.positions.length;i++){
  const p=source.positions[i],n=source.normals[i],q=deform(p);points.push(q);
  const columns=[];for(let k=0;k<3;k++){const a=p.slice(),b=p.slice();a[k]+=.0002;b[k]-=.0002;columns.push(V.mul(V.sub(deform(a),deform(b)),2500));}
  const nx=V.cross(columns[1],columns[2]),ny=V.cross(columns[2],columns[0]),nz=V.cross(columns[0],columns[1]);
  normals.push(V.norm(V.add(V.mul(nx,n[0]),V.add(V.mul(ny,n[1]),V.mul(nz,n[2])))));
  const tip=smooth01((p[1]-.70)/.15)*Math.max(0,n[1]),tone=.85+.14*geoNoise(p[0]*7+phase,p[1]*7,p[2]*7);
  colors.push(color.map(c=>mix(c*tone,.81,tip*.43)));
 }
 for(let i=0;i<source.indices.length;i+=3){const ids=source.indices.slice(i,i+3);g.tri(...ids.map(k=>points[k]),color,ids.map(k=>normals[k]),ids.map(k=>colors[k]));}
 return g;
}
// Rounded erosion, slanted bedding and cross fractures break the old stacked-block outline.
function rockGeometry(variant=0,low=false){
 const g=new Geometry();g.material=2;g.shadow=true;g.rockContact={kind:'rock',closed:true,key:'rock:'+variant+':'+(low?'low':'high')};
 const form=(u,v)=>{const a=u*TAU,b=v*Math.PI,s=Math.sin(b),cube=x=>Math.sign(x)*Math.pow(Math.abs(x),.70);
  const x=cube(s*Math.cos(a)),y=cube(Math.cos(b)),z=cube(s*Math.sin(a)),phase=variant*5.31;
  const warp=geoNoise(x*2+phase,y*2.2,z*2)-.5;
  let f=.78+ridgeNoise(x*3.3+phase,y*3.6+variant,z*3.3-phase)*.42;
  const bedding=y+x*.19-z*.12+warp*.13;
  f-=.047*Math.exp(-Math.pow((bedding-.18)/.065,2.))+.036*Math.exp(-Math.pow((bedding+.48)/.054,2.));
  f-=.035*Math.exp(-Math.pow((x+z*.47+y*.24-.24)/.05,2.))*(1-y*y*.65);
  return [x*f+.11*(geoNoise(z*2+phase,y*2,x*2)-.5),y*f+.10*warp+.045*x,z*f+.08*(geoNoise(y*2,x*3+phase,z*2)-.5)];};
 surface(g,form,low?20:56,low?16:38,(p,u,v)=>{const n=geoNoise(p[0]*3+variant,p[1]*4,p[2]*3),shade=.86+.12*n;return [.92*shade,.91*shade,.83*shade];},1);return g;
}
// Crusting tissue and old fragments bridge colony roots instead of leaving isolated "pots".
const buildLivingReef=buildReef;
buildReef=function(r){
 placedReefRocks.length=0;rockHeightCache.clear();buildLivingReef(r);
 const types=[[],[],[]];const bases=placedReefRocks.slice();
 for(let k=0;k<bases.length;k++){const {item,variant}=bases[k];for(let j=0;j<8;j++){
  const id=bioHash(k*113+j*37+812),a=bioValue(id,0)*TAU,rad=.15+.69*bioValue(id,1),x=item.p[0]+Math.cos(a)*item.s[0]*rad,z=item.p[2]+Math.sin(a)*item.s[2]*rad;
  const layoutY=rockLayoutTop(item,variant,x,z);if(!Number.isFinite(layoutY))continue;
  if(rootLayoutHeight(x,z)-layoutY>.14)continue;const y=layoutY,sc=.13+.25*bioValue(id,2);
  types[j%3].push({p:[x,y+.008,z],s:[sc,.20+bioValue(id,3)*.18,sc*(.75+bioValue(id,4)*.6)],yaw:a,phase:a});
 }}
 for(let type=0;type<3;type++){
  const g=new Geometry();g.material=3;g.shadow=true;g.tag=22;
  const color=[[.47,.48,.33],[.56,.37,.39],[.48,.44,.31]][type];
  surface(g,(u,v)=>{const a=u*TAU,r=v*(.82+.14*Math.sin(a*5+type)+.06*Math.sin(a*11));return [Math.cos(a)*r,.026+.13*Math.sin(v*Math.PI)+.017*Math.sin(a*8)*v,Math.sin(a)*r];},24,5,color,1);
  const b=r.batch(g,types[type]);b.maxDistance=17;
 }
}
