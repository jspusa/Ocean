/* Research submersible missions. Positions remain real world metres; the
 * shallow voyage, its mooring and its progress are not replaced by deployment. */
const DeepseaRules=(()=>{
 const initial=()=>({schema:1,deployed:false,station:'midwater',visited:[]});
 const station=id=>OceanTrench.stations.find(s=>s.id===id);
 function sanitize(raw){const s=initial();if(!raw||typeof raw!=='object')return s;const found=station(raw.station);if(found){s.station=found.id;s.deployed=raw.deployed===true;}if(Array.isArray(raw.visited))s.visited=[...new Set(raw.visited.filter(id=>station(id)))];return s;}
 const canResume=(raw,p)=>raw?.deployed===true&&!!station(raw.station)&&OceanTrench.containsPosition(p)&&p[1]<=-600;
 function advance(position,route,index,budget){
  let p=position.slice(),i=Math.max(0,Math.min(route.length,index));
  if(!Number.isFinite(budget)||budget<0)return {p,index:i,done:i>=route.length};
  while(i<route.length&&budget>=0){const q=route[i],d=Math.hypot(...q.map((v,k)=>v-p[k]));if(d<1e-7){i++;continue;}if(d<=budget){p=q.slice();budget-=d;i++;}else{p=p.map((v,k)=>v+(q[k]-v)*budget/d);break;}}
  return {p,index:i,done:i>=route.length};
 }
 return {initial,sanitize,station,canResume,advance};
})();
const oceanDeepsea=(()=>{
 const R=DeepseaRules,state=()=>oceanFeatures.state('deepsea');let pending=null,transit=null,patrol=null,vehicle=null,vehicleNode=null,lastHUD=0;
 const isActive=()=>active&&state().deployed;
 const current=()=>R.station(state().station)||OceanTrench.stations[0];
 function validResume(){return R.canResume(state(),voyage.state.resume?.p);}
 function clearMotion(){transit=null;patrol=null;stopAuto();resetInput();}
 function aimAt(p){const d=V.sub(p,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2);cameraCut=true;}
 function deploy(id){
  const station=R.station(id);if(!station)return false;
  if(active){if(isActive())return travel(id);toast('先返回研究船，再部署深海潛航器。');return false;}
  pending=id;state().deployed=true;state().station=id;voyage.awaitingResume=false;startDive(false);return isActive();
 }
 function travel(id){
  if(!isActive()||!R.station(id)||V.dist(player.p,R.station(id).p)<2&&!transit)return false;
  const route=OceanTrench.route(state().station,id,player.p);if(!Array.isArray(route)||route.length<2)return false;
  closePanel();clearMotion();if(typeof oceanSelection!=='undefined')oceanSelection.clear();
  // Route begins at the current position and a clear departure corridor. The
  // same collision sweep is used for travel and manual control.
  transit={target:id,route:[player.p.slice(),...route.map(p=>p.slice())],index:1};auto=true;setAutoUI();renderer.dirty=true;return true;
 }
 function cancelTravel(){if(!transit&&!patrol)return;clearMotion();toast('已接手潛航器。');}
 function constrain(p,from=null){
  const b=OceanTrench.bounds;p[0]=clamp(p[0],b.left+.8,b.right-.8);p[2]=clamp(p[2],b.top+.8,b.bottom-.8);
  p[1]=clamp(p[1],OceanTrench.groundHeight(p[0],p[2])+.82,-600);
  OceanRegions.resolve(p,.4,from);return p;
 }
 function prepareDive({resume}){
  if(!pending&&!resume){state().deployed=false;renderer.submersible=false;return;}
  if(resume&&!state().deployed)return;
  if(resume&&!OceanTrench.containsPosition(player.p)){state().deployed=false;renderer.submersible=false;return;}
  if(pending){const station=R.station(pending);player.p=constrain(station.p.slice());aimAt(station.look);state().station=station.id;pending=null;}
  clearMotion();renderer.submersible=true;renderer.forceShadow=true;renderer.dirty=true;
 }
 function start(){
  if(!isActive())return;const s=state();if(!s.visited.includes(s.station))s.visited.push(s.station);
  voyage.state.features.expedition.guest=null;voyage.previousPosition=player.p.slice();
  if(typeof oceanSelection!=='undefined')oceanSelection.clear();paintHUD();
  radio('研究潛航器已抵達 '+Math.round(-player.p[1]).toLocaleString()+' 公尺。慢慢靠近岩壁，用燈光尋找生命。','澄 · 深海研究');
 }
 function end(){clearMotion();$('deepseaStatus')?.classList.add('hidden');state().deployed=false;renderer.submersible=false;if(vehicle)vehicle.visible=false;document.body.classList.remove('deepsea-active');if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel('');}
 function paintHUD(){
  const enabled=isActive();document.body.classList.toggle('deepsea-active',enabled);if(typeof oceanDiveUI!=='undefined')oceanDiveUI.setVehicleLabel(enabled?'研究潛航':'');
  const label=$('deepseaStatus');if(!label)return;label.classList.toggle('hidden',!enabled||!!modal||photoOpen);
  if(enabled){label.querySelector('span').textContent=transit?'前往 '+R.station(transit.target).depth.toLocaleString()+' m · 移動即可接手':current().name;label.querySelector('button').classList.toggle('hidden',!transit&&!patrol);}
  if(enabled){const destination=voyageDestination();if(!destination||!OceanTrench.containsPosition([destination.x,destination.y,destination.z]))$('waypointHUD').classList.add('hidden');$('areaName').textContent=current().name;const air=$('airStatus');if(air)air.textContent='研究潛航';}
 }
 function tick(){if(!isActive())return;if(t-lastHUD>.25){lastHUD=t;paintHUD();}}
 function vehicleGeometry(){
  const g=new Geometry();g.material=2;const metal=[.48,.52,.51],yellow=[.78,.60,.23],dark=[.035,.055,.065];
  g.sphere([0,.12,0],[.60,.36,.88],yellow,20,12);g.box([0,-.20,0],[1.25,.12,1.6],metal);
  for(const side of [-1,1]){g.tube([side*.66,-.34,-.8],[side*.66,-.34,.8],.055,.055,metal,8);g.tube([side*.52,-.20,-.6],[side*.66,-.34,-.6],.04,.04,metal,6);g.tube([side*.52,-.20,.6],[side*.66,-.34,.6],.04,.04,metal,6);g.sphere([side*.48,.10,-.74],[.15,.14,.11],[.80,.89,.86],12,8);g.tube([side*.78,.06,.25],[side*.78,.06,.58],.18,.18,dark,12);}
  g.sphere([0,.07,-.83],[.17,.15,.12],dark,14,10);g.sphere([0,.07,-.925],[.095,.09,.035],[.19,.38,.42],12,8);g.tube([-.24,.38,.20],[-.24,.65,.20],.025,.025,metal,6);return g;
 }
 function render(){
  panelTitle('DEEP OCEAN / RESEARCH','深海與海溝');const deployed=isActive();
  $('panelBody').innerHTML=`<p class="panel-note">搭乘研究潛航器，從中層水到 7,000 公尺海溝。用原本的方向控制探索；探照燈、觀察和拍照都可以使用。${deployed?'切換研究站會沿深度路線航行，移動或拖曳可隨時接手。':'在研究船上選一站部署，完成後可隨時回收返船。'}</p><div class="deepsea-stations">${OceanTrench.stations.map(s=>`<article class="feature-section"><span class="feature-badge">${s.depth.toLocaleString()} m${state().visited.includes(s.id)?' · 已探索':''}</span><h3>${safe(s.name)}</h3><p>${safe(s.description||'沿岩層與沉積地形尋找深海生命。')}</p><button class="primary" data-deepsea-station="${s.id}" ${active&&!deployed||deployed&&V.dist(player.p,s.p)<2&&!transit?'disabled':''}>${deployed?(V.dist(player.p,s.p)<2&&!transit?'所在研究站':'前往這一站'):'部署潛航器'} ↗</button></article>`).join('')}</div>${deployed?'<button id="deepseaHome" class="muted-btn">回收潛航器 · 返回研究船</button>':''}${active&&!deployed?'<p class="panel-note">結束這次潛水並回船後，即可部署。</p>':''}<p class="panel-note">三站地形與相遇位置為本作原創；生物尺度與自然深度的來源可在圖鑑查閱。</p>`;
  $('panelBody').querySelectorAll('[data-deepsea-station]').forEach(b=>b.onclick=()=>deploy(b.dataset.deepseaStation));if($('deepseaHome'))$('deepseaHome').onclick=goHome;
 }
 function renderChart(){
  panelTitle('DEEP OCEAN / ROUTE','深海航線');$('panelBody').innerHTML='<p class="panel-note">深度以海面為零。按下「選擇研究站」查看與前往；潛航途中可隨時接手。</p><canvas id="deepseaChart" width="600" height="530" class="map-canvas" aria-label="深海三站與目前深度"></canvas><button id="deepseaRouteOpen" class="primary">選擇研究站 ↗</button>';
  const c=$('deepseaChart'),ctx=c.getContext('2d');ctx.fillStyle='#061c27';ctx.fillRect(0,0,600,530);ctx.strokeStyle='#779b9955';ctx.beginPath();ctx.moveTo(120,40);ctx.lineTo(120,485);ctx.stroke();
  const y=depth=>45+(depth-600)/6500*420;
  for(const s of OceanTrench.stations){ctx.fillStyle='#b8dad0';ctx.beginPath();ctx.arc(120,y(s.depth),6,0,TAU);ctx.fill();ctx.font='17px sans-serif';ctx.fillText(s.name,145,y(s.depth)-3);ctx.font='13px sans-serif';ctx.fillText(s.depth.toLocaleString()+' m',145,y(s.depth)+18);}
  ctx.fillStyle='#edd7a3';ctx.beginPath();ctx.arc(120,y(-player.p[1]),9,0,TAU);ctx.strokeStyle='#edd7a3';ctx.stroke();ctx.font='13px sans-serif';ctx.fillText('目前 '+(-player.p[1]).toFixed(1)+' m',330,y(-player.p[1])+4);$('deepseaRouteOpen').onclick=()=>oceanFeatures.open('deepsea');
 }
 function init(){
  oceanFeatures.addMenu({id:'deepsea',label:'深海與海溝 · 研究潛航',panel:'deepsea'});
  vehicleNode={p:[760,-700,-90],s:[1,1,1],yaw:0,pitch:0,tint:[1,1,1]};vehicle=renderer.batch(vehicleGeometry(),[vehicleNode],0,true);vehicle.maxDistance=30;vehicle.sceneRole='vehicle:research';vehicle.visible=false;
  const status=document.createElement('div');status.id='deepseaStatus';status.className='hidden';status.innerHTML='<span></span><button type="button">接手操控</button>';status.querySelector('button').onclick=cancelTravel;$('hud').append(status);
  const oldStart=startDive;startDive=function(tour=false){if(!pending&&!voyage.awaitingResume)state().deployed=false;oldStart(tour);};
  const oldCollide=collide;collide=function(p,from=null){return OceanTrench.containsXZ(p[0],p[2])||isActive()?constrain(p,from):oldCollide(p,from);};
  const oldPlayer=updatePlayer;updatePlayer=function(dt){
   if(!isActive()){oldPlayer(dt);return;}
   if(!auto&&(transit||patrol)){transit=null;patrol=null;paintHUD();}
   if(auto&&!follow&&!oceanFeatures.pointerCaptured()){
    if(!transit&&!patrol){const route=current().route||[current().p,current().look,current().p];patrol={route:[player.p.slice(),...route.map(p=>p.slice())],index:1};}
    const trip=transit||patrol,before=player.p.slice(),next=R.advance(before,trip.route,trip.index,dt*(transit?320:2.2));
    player.p=constrain(next.p,before);const d=V.sub(player.p,before);player.velocity=V.mul(d,1/Math.max(.0001,dt));
    if(V.len(d)>.001){player.yaw=lerpAngle(player.yaw,Math.atan2(d[0],-d[2]),1-Math.exp(-dt*3));player.pitch=mix(player.pitch,clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.2,1.2),1-Math.exp(-dt*3));}
    if(V.dist(player.p,next.p)>.25){clearMotion();toast('航線前方有岩壁，已切回手動操控。');return;}
    trip.index=next.index;if(next.done){if(transit){state().station=transit.target;if(!state().visited.includes(transit.target))state().visited.push(transit.target);clearMotion();aimAt(current().look);saveVoyage();toast('已抵達 '+current().name);}else{patrol.index=1;patrol.route=[player.p.slice(),...(current().route||[current().p,current().look,current().p]).map(p=>p.slice())];}}return;
   }
   const speed=settings.speed;settings.speed=speed*2.6;oldPlayer(dt);settings.speed=speed;
  };
  const oldCamera=updateCamera;updateCamera=function(dt=1/60,p=null){oldCamera(dt,p);vehicle.visible=isActive()&&settings.third&&!(auto&&follow);if(isActive())diverBatch.visible=false;if(vehicle.visible){vehicleNode.p=(p||player.p).slice();vehicleNode.yaw=player.yaw;vehicleNode.pitch=-player.pitch;}renderer.submersible=isActive();};
  const oldJump=jumpTo;jumpTo=function(index){if(isActive()){goHome();toast('研究潛航器已回收至研究船，探索紀錄已保存。');return;}oldJump(index);};
  const oldMap=renderMap;renderMap=function(){if(isActive())renderChart();else oldMap();};
  renderer.submersible=false;
 }
 const feature={id:'deepsea',initial:R.initial,sanitize:R.sanitize,init,prepareDive,startDive:start,endDive:end,tick,paintHUD,photoMetadata(photo){if(isActive())photo.area=current().name+' · '+Math.round(-player.p[1]).toLocaleString()+' m';},shipRender(){if(validResume())$('shipContinue').textContent='繼續深海潛航 · '+Math.round(-voyage.state.resume.p[1]).toLocaleString()+' m';},reset(){pending=null;transit=null;patrol=null;renderer.submersible=false;if(vehicle)vehicle.visible=false;},renderPanel(type){if(type!=='deepsea')return false;render();return true;}};
 oceanFeatures.register(feature);return {isActive,deploy,travel,cancelTravel,current,feature,snapshot:()=>({deployed:isActive(),station:state().station,travelTarget:transit?.target||null,vehicle:!!vehicle?.visible,position:player.p.slice()})};
})();
