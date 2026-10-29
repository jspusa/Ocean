/* Authored moorings in one continuous sea. Boat position is shared by deck,
 * training, chart and dive entry. These are not replicas of Wii locations. */
const NavigationRules=(()=>{
 const range=Infinity,moorings=[
  {id:'home',name:'歸潮錨地',p:[-24,0,43],look:'garden',hint:'第一次下水的地方。淺礁與珊瑚花園就在船外。'},
  {id:'west',name:'西環礁泊位',p:[-94,0,-59],look:'gate',requires:'arrival',visited:'gate',hint:'完成「第一道光」，或親自抵達環礁之門後開放。'},
  {id:'east',name:'眠海東泊位',p:[98,0,-137],look:'wreck',requires:'passage',visited:'wreck',hint:'完成「熟悉之外」，或親自抵達眠海號後開放。'},
  {id:'offshore',name:'遠洋觀測泊位',p:[-10,0,-208],look:'pelagic',requires:'archive',visited:'pelagic',hint:'讀取眠海號的信，或親自抵達遠洋迴廊後開放。'},
  {id:'cave',name:'玄紋洞外泊位',p:[-211,0,-27],look:'cave',story:0,hint:'接下「回聲潮譜」調查後開放。洞口位於船南側的深處。'},
  {id:'ruins',name:'沉潮遺跡泊位',p:[176,0,-182],look:'ruins',story:1,hint:'回船回報洞窟調查後開放。向南下潛可見遺跡門廊。'},
  {id:'abyss',name:'西南深水泊位',p:[-154,0,-255],look:'abyss',story:3,hint:'完成刻文重讀與洞中核對，回船解讀後開放。'}
 ];
 const initial=()=>({schema:1,mooring:'home',moves:0});
 function sanitize(raw){return {schema:1,mooring:moorings.some(m=>m.id===raw?.mooring)?raw.mooring:'home',moves:Number.isFinite(raw?.moves)?Math.floor(Math.max(0,Math.min(1e7,raw.moves))):0};}
 function unlocked(){return true;}
 // Kept for old integrations: a boat no longer limits swimming range.
 function constrain(p){return p.slice();}
 return {range,moorings,initial,sanitize,unlocked,constrain};
})();
const oceanNavigation=(()=>{
 const R=NavigationRules,state=()=>oceanFeatures.state('navigation');let boat=null;
 const current=()=>R.moorings.find(m=>m.id===state().mooring)||R.moorings[0];
 function apply(){
  const m=current();OPEN_WORLD.boat.splice(0,3,...m.p);if(boat){boat.instances[0].p=m.p.slice();boat._lastVisible=null;}
  renderer.forceShadow=true;renderer.dirty=true;cameraCut=true;
  if(typeof oceanShip!=='undefined')oceanShip.boatMoved?.();
 }
 function move(id){
  if(active){toast('先返回研究船，再選擇下一個泊位。');return false;}
  const m=R.moorings.find(m=>m.id===id);if(!m||!R.unlocked(m,voyage.state)){toast('這個泊位尚未開放，先完成附近的探索。');return false;}
  if(m.id===state().mooring)return true;
  state().mooring=m.id;state().moves++;voyage.state.resume=null;apply();saveVoyage();renderShip();render();toast('研究船已停泊於「'+m.name+'」');return true;
 }
 function entry(){const p=OPEN_WORLD.boat;return collide([p[0]+1.4,-2.2,p[2]+9.5]);}
 function startDive({resume}){
  if(resume){player.p=collide(player.p);return;}
  player.p=entry();const m=current(),l=LANDMARKS.find(l=>l.id===m.look);player.yaw=Math.atan2(l.x-player.p[0],-(l.z-player.p[2]));player.pitch=-.09;autoT=nearestPathIndex();OceanDiverContact.reset();resetInput();cameraCut=true;
  const guest=voyage.state.features.expedition?.guest;if(guest)guest.p=collide(V.add(player.p,[1,0,1]));
  voyage.previousPosition=player.p.slice();
 }
 function drawMap(ctx,w,h){const p=chartPoint(...[OPEN_WORLD.boat[0],OPEN_WORLD.boat[2],w,h]);ctx.save();
  ctx.fillStyle='#efddaf';ctx.beginPath();ctx.moveTo(p[0],p[1]-8);ctx.lineTo(p[0]+5,p[1]+5);ctx.lineTo(p[0]-5,p[1]+5);ctx.closePath();ctx.fill();ctx.font='11px sans-serif';ctx.fillText('研究船',p[0]+9,p[1]-6);ctx.restore();
 }
 function render(){
  panelTitle('OPEN OCEAN','整片海，都能游過去');
  $('panelBody').innerHTML=`<p class="panel-note">淺礁、遠洋與海溝彼此相連，直接游動即可探索。研究船只是可選的入水地點。</p><button class="primary" id="navigationChart">打開海圖 ↗</button><details><summary>研究船停泊位置</summary><div class="navigation-moorings">${R.moorings.map(m=>{const selected=m.id===state().mooring;return `<article class="feature-section"><h3>${safe(m.name)}</h3><button class="muted-btn" data-mooring="${m.id}" ${active||selected?'disabled':''}>${selected?'目前停泊':'設為入水地點'}</button></article>`}).join('')}</div></details>`;
  $('panelBody').querySelectorAll('[data-mooring]').forEach(b=>b.onclick=()=>move(b.dataset.mooring));$('navigationChart').onclick=()=>openPanel('map');
 }
 function init(){
  boat=renderer.batches.find(b=>b.sceneRole==='research-vessel');if(!boat)throw new Error('研究船場景缺少定位資料');
  apply();oceanFeatures.addMenu({id:'navigation',label:'海圖與入水地點',panel:'navigation'});
  const oldJump=jumpTo;jumpTo=function(index){if(index===8&&active){player.p=entry();player.velocity=[0,0,0];OceanDiverContact.reset();resetInput();stopAuto();closePanel();cameraCut=true;toast('已回到研究船旁的入水處。');return;}oldJump(index);};
 }
 const feature={id:'navigation',initial:R.initial,sanitize:R.sanitize,init,prepareDive:startDive,drawMap,reset:apply,renderPanel(type){if(type!=='navigation')return false;render();return true;}};oceanFeatures.register(feature);
 return {rules:R,feature,current,move,entry,apply,snapshot:()=>({mooring:state().mooring,boat:OPEN_WORLD.boat.slice(),mesh:boat?.instances[0].p.slice(),range:R.range})};
})();
