/* One connected ocean. The old deployment field is retained only so existing
 * save files load; depth and position determine the underwater environment. */
// Compose runtime additions without mutating the immutable baked trench.
const deepseaEncounters=Object.freeze([...(OceanTrench.encounters||[]),...(typeof OarfishWorld==='undefined'?[]:[OarfishWorld.encounter]),...(typeof FrilledSharkWorld==='undefined'?[]:[FrilledSharkWorld.encounter])]);
const DeepseaRules=(()=>{
 const initial=()=>({schema:1,deployed:false,station:'midwater',visited:[]});
 const station=id=>OceanTrench.stations.find(s=>s.id===id);
 function areaName(p){
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||!OceanTrench.containsXZ(p[0],p[2]))return null;
  const near=OceanTrench.stations.find(s=>V.dist(p,s.p)<45);if(near)return near.name;
  const depth=-p[1];return depth<200?'外海大陸坡':depth<500?'大陸坡岩礁':depth<1000?'深海中層':depth<6000?'深海':'海溝深處';
 }
 function sanitize(raw){const s=initial();if(!raw||typeof raw!=='object')return s;const found=station(raw.station);if(found)s.station=found.id;if(Array.isArray(raw.visited))s.visited=[...new Set(raw.visited.filter(id=>station(id)))];return s;}
 function canResume(raw,p){const b=OceanTrench.worldBounds;return Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=b.left&&p[0]<=b.right&&p[2]>=b.top&&p[2]<=b.bottom&&p[1]>=OceanTrench.bounds.min[1]&&p[1]<=-.65;}
 function advance(position,route,index,budget){
  let p=position.slice(),i=Math.max(0,Math.min(route.length,index));
  if(!Number.isFinite(budget)||budget<0)return {p,index:i,done:i>=route.length};
  while(i<route.length&&budget>=0){const q=route[i],d=Math.hypot(...q.map((v,k)=>v-p[k]));if(d<1e-7){i++;continue;}if(d<=budget){p=q.slice();budget-=d;i++;}else{p=p.map((v,k)=>v+(q[k]-v)*budget/d);break;}}
  return {p,index:i,done:i>=route.length};
 }
 // Currents make the open ocean traversable, then gently release the swimmer
 // near an animal or the seabed. Fine observation always keeps normal speed.
 function swimScale(p){
  const depth=Math.max(0,-p[1]),floor=groundHeight(p[0],p[2]),clearance=Math.max(0,p[1]-floor);
  let nearest=clearance;
  for(const habitat of Object.values(OceanTrench.habitats))for(const home of habitat.homes)nearest=Math.min(nearest,V.dist(p,home));
  for(const encounter of deepseaEncounters)nearest=Math.min(nearest,V.dist(p,encounter.home));
  if(typeof AbyssWorldRules!=='undefined')for(const habitat of Object.values(AbyssWorldRules.sites))for(const home of habitat.homes)nearest=Math.min(nearest,V.dist(p,home));
  const open=smooth01((nearest-12)/145),deep=smooth01((depth-80)/500);
  return mix(2.2,72,open*deep);
 }
 // Split the already validated transit path at optional observation gates.
 // Original corners are preserved; every detour rejoins the same corridor.
 function itinerary(route,encounters=[],clear=()=>true){
  const cumulative=[0];for(let i=1;i<route.length;i++)cumulative.push(cumulative[i-1]+V.dist(route[i-1],route[i]));
  const stops=[],seen=new Set(),minY=Math.min(...route.map(p=>p[1])),maxY=Math.max(...route.map(p=>p[1]));
  for(const e of encounters){
   if(!e||e.guide===false||typeof e.id!=='string'||seen.has(e.id)||!Array.isArray(e.gate)||e.gate.length!==3||!e.gate.every(Number.isFinite)||e.gate[1]<minY||e.gate[1]>maxY)continue;
   let closest=null;
   for(let i=1;i<route.length;i++){const a=route[i-1],ab=V.sub(route[i],a),length=V.len(ab),u=clamp(V.dot(V.sub(e.gate,a),ab)/Math.max(.000001,length*length),0,1),point=V.add(a,V.mul(ab,u)),distance=V.dist(point,e.gate);if(!closest||distance<closest.distance)closest={point,distance,at:cumulative[i-1]+length*u};}
   if(closest&&closest.distance<=28&&closest.at>.1&&clear(closest.point,e.gate)){stops.push({...closest,encounter:e});seen.add(e.id);}
  }
  stops.sort((a,b)=>a.at-b.at);const legs=[];let cursor=0,segment=[route[0].slice()];
  const append=p=>{if(V.dist(segment.at(-1),p)>.00001)segment.push(p.slice());};
  for(const stop of stops){while(cursor+1<route.length&&cumulative[cursor+1]<=stop.at+.00001)append(route[++cursor]);append(stop.point);append(stop.encounter.gate);legs.push({route:segment,encounter:stop.encounter});segment=[stop.encounter.gate.slice()];append(stop.point);}
  while(cursor+1<route.length)append(route[++cursor]);legs.push({route:segment,encounter:null});return legs;
 }
 return {initial,sanitize,station,areaName,canResume,advance,swimScale,itinerary};
})();
const oceanDeepsea=(()=>{
 const R=DeepseaRules,state=()=>oceanFeatures.state('deepsea');let transit=null,patrol=null,journey=null,lastHUD=0;
 const isActive=()=>active&&OceanTrench.containsXZ(player.p[0],player.p[2])&&player.p[1]<-160;
 const current=()=>R.station(state().station)||OceanTrench.stations[0];
 function clearMotion(){transit=null;patrol=null;journey=null;stopAuto();resetInput();}
 function aimAt(p){const d=V.sub(p,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2);cameraCut=true;}
 function deploy(id){
  if(!R.station(id))return false;
  if(!active){voyage.awaitingResume=false;startDive(false);}
  return travel(id);
 }
 // Stations are transit landmarks. The final metres lead to a real nearby
 // animal at its natural size, without selecting it or granting knowledge.
 function observationTarget(id){
  const species=typeof SPECIES==='undefined'?[]:SPECIES;
  const candidates=typeof life==='undefined'?[]:life.filter(f=>f.ecologyPresent!==false&&(f.faunaVisibility??1)>=.8&&(f.retreat||0)<.8&&species[f.species]?.trench&&OceanTrench.habitats[species[f.species].id]?.station===id);
  return candidates.reduce((best,f)=>!best||V.dist(player.p,f.p)<V.dist(player.p,best.p)?f:best,null);
 }
 function approachRoute(id,fish=observationTarget(id)){
  if(!fish)return null;
  const point=animalFocusPoint(fish),traits=speciesTraits(fish.species),sp=SPECIES[fish.species],size=sp.size,ribbon=sp.id==='oarfish',frilled=sp.id==='frilled_shark',sideView=ribbon||frilled;
  const drift=Number.isFinite(fish.radius)?Math.max(0,fish.radius):Math.max(0,SPECIES[fish.species].motionProfile?.radius||0);
  // Leave room for both sides of the natural orbit in a narrow portrait view.
  const distance=Math.min(traits.observeDistance*.72,Math.max(traits.viewDistance,size*2,ribbon?size*2.25:frilled?drift*2.6:drift*7,traits.micro?1.05:1.5));
  const away=V.sub(player.p,point),normal=[Math.sin(fish.yaw||0),0,Math.cos(fish.yaw||0)];
  // Approach elongated animals from their nearer broad side. The frilled
  // shark's framing also reserves its slow circuit during the normal dwell;
  // only the swimmer moves, and the animal keeps its own position and pose.
  const angle=sideView?(fish.yaw||0)+(V.dot(away,normal)<0?Math.PI:0):Math.atan2(away[0],away[2]);
  for(const turn of sideView?[0,Math.PI,.22,-.22]:[0,.55,-.55,1.1,-1.1,Math.PI]){
   const a=angle+turn,p=[point[0]+Math.sin(a)*distance,point[1]+Math.max(.15,Math.min(.45,distance*.18)),point[2]+Math.cos(a)*distance];
   const floor=OceanTrench.floorAt(p[0],p[2],p[1]+.1);if(Number.isFinite(floor))p[1]=Math.max(p[1],floor+.82);
   if(V.dist(p,point)>traits.observeDistance*.9||OceanRegions.pointBlocked(p,.4)||!OceanRegions.pathClear(player.p,p,.4)||blocked(p,point,.001))continue;
   const resolved=collide(p.slice());if(V.dist(resolved,p)>.01)continue;
   return {target:id,route:[player.p.slice(),p],index:1,approaching:true,observationUID:fish.uid};
  }
  return null;
 }
 function nextLeg(){
  const leg=journey?.legs.shift();if(!leg)return false;
  transit={target:journey.target,route:leg.route,index:1,encounter:leg.encounter};paintHUD();return true;
 }
 function encounterAnimal(encounter){return life.find(f=>f.encounterId===encounter.id&&f.ecologyPresent!==false&&(f.faunaVisibility??1)>=.8);}
 function completeLeg(trip){
  if(trip.returning){nextLeg();return;}
  if(trip.approaching){
   if(trip.encounter){transit.hold=4;player.velocity=[0,0,0];const f=life.find(f=>f.uid===trip.observationUID);if(f)aimAt(animalFocusPoint(f));paintHUD();return;}
   finishArrival(trip.target,trip.observationUID);return;
  }
  const fish=trip.encounter?encounterAnimal(trip.encounter):observationTarget(trip.target),approach=approachRoute(trip.target,fish);
  if(approach){transit={...approach,encounter:trip.encounter,returnTo:player.p.slice()};paintHUD();return;}
  if(trip.encounter)nextLeg();else finishArrival(trip.target);
 }
 function finishArrival(id,uid=null){
  const fish=uid&&life.find(f=>f.uid===uid);state().station=id;
  if(!state().visited.includes(id))state().visited.push(id);clearMotion();
  aimAt(fish?animalFocusPoint(fish):R.station(id).look);saveVoyage();
  toast(fish?'已到觀察區 · 點一下附近生物，慢慢觀察。':'已抵達 '+R.station(id).name+' · 游近後點一下生物。');
 }
 function travel(id){
  const target=R.station(id);if(!active||!target||V.dist(player.p,target.p)<2&&!transit)return false;
  const route=OceanTrench.route(state().station,id,player.p);
  if(!Array.isArray(route)||route.length<2){toast('先游到開闊水域，再跟著海流前往。');return false;}
  closePanel();clearMotion();if(typeof oceanSelection!=='undefined')oceanSelection.clear();
  journey={target:id,legs:R.itinerary(route,deepseaEncounters,(a,b)=>OceanRegions.pathClear(a,b,.4))};nextLeg();auto=true;setAutoUI();renderer.dirty=true;paintHUD();return true;
 }
 function cancelTravel(){if(!transit&&!patrol)return;clearMotion();paintHUD();toast('自由游動中。');}
 function constrain(p,from=null){
  const b=OceanTrench.worldBounds;p[0]=clamp(p[0],b.left+.8,b.right-.8);p[2]=clamp(p[2],b.top+.8,b.bottom-.8);
  p[1]=clamp(p[1],groundHeight(p[0],p[2])+.82,-.65);
  OceanRegions.resolve(p,.4,from);return p;
 }
 function prepareDive(){state().deployed=false;renderer.submersible=false;transit=null;patrol=null;journey=null;renderer.forceShadow=true;renderer.dirty=true;}
 function start(){voyage.previousPosition=player.p.slice();paintHUD();}
 function end(){clearMotion();$('deepseaStatus')?.classList.add('hidden');state().deployed=false;renderer.submersible=false;document.body.classList.remove('deepsea-active');if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel('');}
 function paintHUD(){
  const enabled=isActive();document.body.classList.toggle('deepsea-active',enabled);if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel('');
  const label=$('deepseaStatus');if(label){label.classList.toggle('hidden',!transit||!!modal||photoOpen);label.querySelector('span').textContent=transit?(transit.hold>0?'停一會，留意身旁的身影 · ':transit.approaching?'放慢速度，接近觀察區 · ':'順著海流 · ')+R.station(transit.target).name:current().name;label.querySelector('button').classList.toggle('hidden',!transit&&!patrol);}
  const area=active&&R.areaName(player.p);if(area)$('areaName').textContent=area;
  if(enabled){const air=$('airStatus');if(air)air.textContent='自由探索';}
 }
 function tick(){
  if(isActive()){
   const nearest=OceanTrench.stations.reduce((best,s)=>V.dist(player.p,s.p)<V.dist(player.p,best.p)?s:best,OceanTrench.stations[0]);state().station=nearest.id;
   if(V.dist(player.p,nearest.p)<35&&!state().visited.includes(nearest.id)){state().visited.push(nearest.id);saveVoyage();}
  }
  if(t-lastHUD>.25){lastHUD=t;paintHUD();}
 }
 function render(){
  panelTitle('THE DEEP','從微光，游向深藍');
  $('panelBody').innerHTML=`<p class="panel-note">沿東方大陸坡，直接游入 7,000 公尺海溝。開闊處的海流會加快游動，靠近生物時自然放慢。</p><div class="deepsea-stations">${OceanTrench.stations.map(s=>`<article class="feature-section"><span class="feature-badge">${s.depth.toLocaleString()} m${state().visited.includes(s.id)?' · 已探索':''}</span><h3>${safe(s.name)}</h3><p>${s.id==='midwater'?'在微光水層尋找緩緩浮游的身影。':s.id==='slope'?'沿岩壁降到軟泥平台，低頭留意細小管足。':'下降至海溝底部，觀察泥床上方的柔軟魚影。'}</p><p class="feature-muted">沿途會在生物棲地放慢，短暫停留後繼續前進。點選生物、移動或拖曳，隨時接手探索。</p><button class="muted-btn" data-deepsea-station="${s.id}" ${active&&V.dist(player.p,s.p)<2&&!transit?'disabled':''}>${active&&V.dist(player.p,s.p)<2&&!transit?'目前位置':'跟著海流前往'} ↗</button></article>`).join('')}</div><p class="panel-note">移動或拖曳，就能隨時接手。</p>`;
  $('panelBody').querySelectorAll('[data-deepsea-station]').forEach(b=>b.onclick=()=>deploy(b.dataset.deepseaStation));
 }
 function init(){
  oceanFeatures.addMenu({id:'deepsea',label:'深海與海溝',panel:'deepsea'});
  const status=document.createElement('div');status.id='deepseaStatus';status.className='hidden';status.innerHTML='<span></span><button type="button">自由游動</button>';status.querySelector('button').onclick=cancelTravel;$('hud').append(status);
  const oldCollide=collide;collide=function(p,from=null){return OceanTrench.containsXZ(p[0],p[2])?constrain(p,from):oldCollide(p,from);};
  const oldPlayer=updatePlayer;updatePlayer=function(dt){
   if(!auto&&(transit||patrol)){transit=null;patrol=null;journey=null;paintHUD();}
   if(auto&&!follow&&!oceanFeatures.pointerCaptured()&&(transit||isActive())){
    if(!transit&&!patrol){const route=current().route||[current().p,current().look,current().p];patrol={route:[player.p.slice(),...route.map(p=>p.slice())],index:1};}
    if(transit?.hold>0){const trip=transit;trip.hold=Math.max(0,trip.hold-dt);player.velocity=[0,0,0];const f=life.find(f=>f.uid===trip.observationUID);if(f)aimAt(animalFocusPoint(f));if(trip.hold===0){transit={target:trip.target,route:[player.p.slice(),trip.returnTo],index:1,returning:true};paintHUD();}return;}
    const trip=transit||patrol,before=player.p.slice(),remaining=V.dist(before,trip.route.at(-1));
    const speed=transit?.approaching?(remaining>4?mix(.85,2.2,smooth01((remaining-4)/8)):mix(.28,.85,smooth01((remaining-.3)/3.7))):transit?.returning?3.2:transit?mix(8,260,smooth01((remaining-12)/180)):2.2,next=R.advance(before,trip.route,trip.index,dt*speed);
    player.p=collide(next.p,before);const d=V.sub(player.p,before);player.velocity=V.mul(d,1/Math.max(.0001,dt));
    if(V.len(d)>.001){player.yaw=lerpAngle(player.yaw,Math.atan2(d[0],-d[2]),1-Math.exp(-dt*3));player.pitch=mix(player.pitch,clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2),1-Math.exp(-dt*3));}
    if(V.dist(player.p,next.p)>.25){clearMotion();toast('前方有岩壁，請自行游過。');return;}
    trip.index=next.index;if(next.done){if(transit)completeLeg(transit);else{patrol.index=1;patrol.route=[player.p.slice(),...(current().route||[current().p,current().look,current().p]).map(p=>p.slice())];}}return;
   }
   const speed=settings.speed;settings.speed=speed*R.swimScale(player.p);try{oldPlayer(dt);}finally{settings.speed=speed;}
  };
  renderer.submersible=false;
 }
 const feature={id:'deepsea',initial:R.initial,sanitize:R.sanitize,init,prepareDive,startDive:start,endDive:end,tick,paintHUD,photoMetadata(photo){const area=R.areaName(player.p);if(area)photo.area=area+' · '+Math.round(-player.p[1]).toLocaleString()+' m';},shipRender(){if(voyage.state.resume&&R.canResume(state(),voyage.state.resume.p)&&voyage.state.resume.p[1]<-160)$('shipContinue').textContent='繼續深海探索';},reset(){transit=null;patrol=null;journey=null;renderer.submersible=false;},renderPanel(type){if(type!=='deepsea')return false;render();return true;}};
 oceanFeatures.register(feature);return {isActive,deploy,travel,cancelTravel,current,feature,snapshot:()=>({deployed:false,freeSwimming:true,deep:isActive(),station:state().station,travelTarget:transit?.target||null,approaching:transit?.approaching===true,encounter:transit?.encounter?.id||null,holding:transit?.hold>0,vehicle:false,position:player.p.slice()})};
})();
