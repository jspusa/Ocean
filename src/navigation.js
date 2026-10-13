/* Authored moorings in one continuous sea. Boat position is shared by deck,
 * training, chart and dive entry. These are not replicas of Wii locations. */
const NavigationRules=(()=>{
 const range=180,moorings=[
  {id:'home',name:'歸潮錨地',p:[-24,0,43],look:'garden',hint:'第一次下水的地方。淺礁與珊瑚花園就在船外。'},
  {id:'west',name:'西環礁泊位',p:[-94,0,-59],look:'gate',requires:'arrival',visited:'gate',hint:'完成「第一道光」，或親自抵達環礁之門後開放。'},
  {id:'east',name:'眠海東泊位',p:[98,0,-137],look:'wreck',requires:'passage',visited:'wreck',hint:'完成「熟悉之外」，或親自抵達眠海號後開放。'},
  {id:'offshore',name:'遠洋觀測泊位',p:[-10,0,-208],look:'pelagic',requires:'archive',visited:'pelagic',hint:'讀取眠海號的信，或親自抵達遠洋迴廊後開放。'}
 ];
 const initial=()=>({schema:1,mooring:'home',moves:0});
 function sanitize(raw){return {schema:1,mooring:moorings.some(m=>m.id===raw?.mooring)?raw.mooring:'home',moves:Number.isFinite(raw?.moves)?Math.floor(Math.max(0,Math.min(1e7,raw.moves))):0};}
 function unlocked(m,v){return m.id==='home'||v.mode==='free'||v.completed.includes(m.requires)||v.visited.includes(m.visited);}
 function constrain(p,origin){const dx=p[0]-origin[0],dz=p[2]-origin[2],d=Math.hypot(dx,dz);return d>range?[origin[0]+dx/d*range,p[1],origin[2]+dz/d*range]:p.slice();}
 return {range,moorings,initial,sanitize,unlocked,constrain};
})();
const oceanNavigation=(()=>{
 const R=NavigationRules,state=()=>oceanFeatures.state('navigation');let boat=null,lastWarning=-Infinity;
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
  player.p=entry();const m=current(),l=LANDMARKS.find(l=>l.id===m.look);player.yaw=Math.atan2(l.x-player.p[0],-(l.z-player.p[2]));player.pitch=-.09;autoT=nearestPathIndex();resetInput();cameraCut=true;
  const guest=voyage.state.features.expedition?.guest;if(guest)guest.p=collide(V.add(player.p,[1,0,1]));
  voyage.previousPosition=player.p.slice();
 }
 function drawMap(ctx,w,h){const p=chartPoint(...[OPEN_WORLD.boat[0],OPEN_WORLD.boat[2],w,h]);ctx.save();
  if(voyage.state.mode==='journey'){ctx.strokeStyle='#dec58b77';ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(p[0],p[1],R.range/(LAYOUT_BOUNDS.right-LAYOUT_BOUNDS.left)*w,R.range/(LAYOUT_BOUNDS.bottom-LAYOUT_BOUNDS.top)*h,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='#efddaf';ctx.beginPath();ctx.moveTo(p[0],p[1]-8);ctx.lineTo(p[0]+5,p[1]+5);ctx.lineTo(p[0]-5,p[1]+5);ctx.closePath();ctx.fill();ctx.font='11px sans-serif';ctx.fillText('研究船',p[0]+9,p[1]-6);ctx.restore();
 }
 function render(){
  panelTitle('MOORING / DIVE AREA','下一片海，從船邊開始');
  $('panelBody').innerHTML=`<p class="panel-note">目前停泊：${safe(current().name)}。${active?'回船後可以移動泊位。':'選擇泊位後，研究船與下次入水點會一起移動。'}航程模式以船為中心探索 ${R.range} 公尺；自由探索模式可漫遊整片海域。</p><div class="navigation-moorings">${R.moorings.map(m=>{const can=R.unlocked(m,voyage.state),selected=m.id===state().mooring;return `<article class="feature-section"><h3>${safe(m.name)} ${selected?'<span class="feature-badge">目前停泊</span>':''}</h3><p>${safe(m.hint)}</p><button class="muted-btn" data-mooring="${m.id}" ${active||!can||selected?'disabled':''}>${selected?'已停泊':can?'移船至此 ↗':'探索後開放'}</button></article>`}).join('')}</div><button class="muted-btn" id="navigationChart">展開海域地圖 ↗</button>`;
  $('panelBody').querySelectorAll('[data-mooring]').forEach(b=>b.onclick=()=>move(b.dataset.mooring));$('navigationChart').onclick=()=>openPanel('map');
 }
 function init(){
  boat=renderer.batches.find(b=>b.sceneRole==='research-vessel');if(!boat)throw new Error('研究船場景缺少定位資料');
  // Old saves may resume far from the original anchorage. Match the closest
  // reachable mooring before applying the new journey boundary.
  const s=state(),v=voyage.state;if(v.resume&&V.dist(v.resume.p,current().p)>R.range){const candidates=R.moorings.filter(m=>R.unlocked(m,v)).sort((a,b)=>V.dist(a.p,v.resume.p)-V.dist(b.p,v.resume.p));if(candidates.length)s.mooring=candidates[0].id;}
  apply();oceanFeatures.addMenu({id:'navigation',label:'航海圖與移船',panel:'navigation'});
  const oldCollide=collide;collide=function(p){oldCollide(p);if(active&&voyage.state.mode==='journey'){
    const next=R.constrain(p,OPEN_WORLD.boat),hit=next[0]!==p[0]||next[2]!==p[2];if(hit){p.splice(0,3,...next);oldCollide(p);const final=R.constrain(p,OPEN_WORLD.boat);p.splice(0,3,...final);stopAuto();if(t-lastWarning>8){lastWarning=t;toast('已到本泊位的探索邊界。回船移泊，可從另一側繼續探索。');}}
   }return p;};
  const oldJump=jumpTo;jumpTo=function(index){if(index===8&&active){player.p=entry();player.velocity=[0,0,0];resetInput();stopAuto();closePanel();cameraCut=true;toast('已回到研究船旁的入水處。');return;}oldJump(index);};
 }
 const feature={id:'navigation',initial:R.initial,sanitize:R.sanitize,init,prepareDive:startDive,drawMap,reset:apply,renderPanel(type){if(type!=='navigation')return false;render();return true;}};oceanFeatures.register(feature);
 return {rules:R,feature,current,move,entry,apply,snapshot:()=>({mooring:state().mooring,boat:OPEN_WORLD.boat.slice(),mesh:boat?.instances[0].p.slice(),range:R.range})};
})();
