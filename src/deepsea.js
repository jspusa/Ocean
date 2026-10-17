/* One connected ocean. The old deployment field is retained only so existing
 * save files load; depth and position determine the underwater environment. */
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
  if(typeof AbyssWorldRules!=='undefined')for(const habitat of Object.values(AbyssWorldRules.sites))for(const home of habitat.homes)nearest=Math.min(nearest,V.dist(p,home));
  const open=smooth01((nearest-12)/145),deep=smooth01((depth-80)/500);
  return mix(2.2,72,open*deep);
 }
 return {initial,sanitize,station,areaName,canResume,advance,swimScale};
})();
const oceanDeepsea=(()=>{
 const R=DeepseaRules,state=()=>oceanFeatures.state('deepsea');let transit=null,patrol=null,lastHUD=0;
 const isActive=()=>active&&OceanTrench.containsXZ(player.p[0],player.p[2])&&player.p[1]<-160;
 const current=()=>R.station(state().station)||OceanTrench.stations[0];
 function clearMotion(){transit=null;patrol=null;stopAuto();resetInput();}
 function aimAt(p){const d=V.sub(p,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2);cameraCut=true;}
 function deploy(id){
  if(!R.station(id))return false;
  if(!active){voyage.awaitingResume=false;startDive(false);}
  return travel(id);
 }
 function travel(id){
  const target=R.station(id);if(!active||!target||V.dist(player.p,target.p)<2&&!transit)return false;
  const route=OceanTrench.route(state().station,id,player.p);
  if(!Array.isArray(route)||route.length<2){toast('先游到開闊水域，再跟著海流前往。');return false;}
  closePanel();clearMotion();if(typeof oceanSelection!=='undefined')oceanSelection.clear();
  transit={target:id,route:[player.p.slice(),...route.map(p=>p.slice())],index:1};auto=true;setAutoUI();renderer.dirty=true;paintHUD();return true;
 }
 function cancelTravel(){if(!transit&&!patrol)return;clearMotion();paintHUD();toast('自由游動中。');}
 function constrain(p,from=null){
  const b=OceanTrench.worldBounds;p[0]=clamp(p[0],b.left+.8,b.right-.8);p[2]=clamp(p[2],b.top+.8,b.bottom-.8);
  p[1]=clamp(p[1],groundHeight(p[0],p[2])+.82,-.65);
  OceanRegions.resolve(p,.4,from);return p;
 }
 function prepareDive(){state().deployed=false;renderer.submersible=false;transit=null;patrol=null;renderer.forceShadow=true;renderer.dirty=true;}
 function start(){voyage.previousPosition=player.p.slice();paintHUD();}
 function end(){clearMotion();$('deepseaStatus')?.classList.add('hidden');state().deployed=false;renderer.submersible=false;document.body.classList.remove('deepsea-active');if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel('');}
 function paintHUD(){
  const enabled=isActive();document.body.classList.toggle('deepsea-active',enabled);if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel('');
  const label=$('deepseaStatus');if(label){label.classList.toggle('hidden',!transit||!!modal||photoOpen);label.querySelector('span').textContent=transit?'順著海流 · '+R.station(transit.target).name:current().name;label.querySelector('button').classList.toggle('hidden',!transit&&!patrol);}
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
  $('panelBody').innerHTML=`<p class="panel-note">沿東方大陸坡，直接游入 7,000 公尺海溝。開闊處的海流會加快游動，靠近生物時自然放慢。</p><div class="deepsea-stations">${OceanTrench.stations.map(s=>`<article class="feature-section"><span class="feature-badge">${s.depth.toLocaleString()} m${state().visited.includes(s.id)?' · 已探索':''}</span><h3>${safe(s.name)}</h3><button class="muted-btn" data-deepsea-station="${s.id}" ${active&&V.dist(player.p,s.p)<2&&!transit?'disabled':''}>${active&&V.dist(player.p,s.p)<2&&!transit?'目前位置':'跟著海流前往'} ↗</button></article>`).join('')}</div><p class="panel-note">移動或拖曳，就能隨時接手。</p>`;
  $('panelBody').querySelectorAll('[data-deepsea-station]').forEach(b=>b.onclick=()=>deploy(b.dataset.deepseaStation));
 }
 function init(){
  oceanFeatures.addMenu({id:'deepsea',label:'深海與海溝',panel:'deepsea'});
  const status=document.createElement('div');status.id='deepseaStatus';status.className='hidden';status.innerHTML='<span></span><button type="button">自由游動</button>';status.querySelector('button').onclick=cancelTravel;$('hud').append(status);
  const oldCollide=collide;collide=function(p,from=null){return OceanTrench.containsXZ(p[0],p[2])?constrain(p,from):oldCollide(p,from);};
  const oldPlayer=updatePlayer;updatePlayer=function(dt){
   if(!auto&&(transit||patrol)){transit=null;patrol=null;paintHUD();}
   if(auto&&!follow&&!oceanFeatures.pointerCaptured()&&(transit||isActive())){
    if(!transit&&!patrol){const route=current().route||[current().p,current().look,current().p];patrol={route:[player.p.slice(),...route.map(p=>p.slice())],index:1};}
    const trip=transit||patrol,before=player.p.slice(),remaining=V.dist(before,trip.route.at(-1));
    const speed=transit?mix(8,260,smooth01((remaining-12)/180)):2.2,next=R.advance(before,trip.route,trip.index,dt*speed);
    player.p=collide(next.p,before);const d=V.sub(player.p,before);player.velocity=V.mul(d,1/Math.max(.0001,dt));
    if(V.len(d)>.001){player.yaw=lerpAngle(player.yaw,Math.atan2(d[0],-d[2]),1-Math.exp(-dt*3));player.pitch=mix(player.pitch,clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2),1-Math.exp(-dt*3));}
    if(V.dist(player.p,next.p)>.25){clearMotion();toast('前方有岩壁，請自行游過。');return;}
    trip.index=next.index;if(next.done){if(transit){state().station=transit.target;if(!state().visited.includes(transit.target))state().visited.push(transit.target);clearMotion();aimAt(current().look);saveVoyage();toast('已抵達 '+current().name);}else{patrol.index=1;patrol.route=[player.p.slice(),...(current().route||[current().p,current().look,current().p]).map(p=>p.slice())];}}return;
   }
   const speed=settings.speed;settings.speed=speed*R.swimScale(player.p);try{oldPlayer(dt);}finally{settings.speed=speed;}
  };
  renderer.submersible=false;
 }
 const feature={id:'deepsea',initial:R.initial,sanitize:R.sanitize,init,prepareDive,startDive:start,endDive:end,tick,paintHUD,photoMetadata(photo){const area=R.areaName(player.p);if(area)photo.area=area+' · '+Math.round(-player.p[1]).toLocaleString()+' m';},shipRender(){if(voyage.state.resume&&R.canResume(state(),voyage.state.resume.p)&&voyage.state.resume.p[1]<-160)$('shipContinue').textContent='繼續深海探索';},reset(){transit=null;patrol=null;renderer.submersible=false;},renderPanel(type){if(type!=='deepsea')return false;render();return true;}};
 oceanFeatures.register(feature);return {isActive,deploy,travel,cancelTravel,current,feature,snapshot:()=>({deployed:false,freeSwimming:true,deep:isActive(),station:state().station,travelTarget:transit?.target||null,vehicle:false,position:player.p.slice()})};
})();
