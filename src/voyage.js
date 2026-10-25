/* OPEN WATER / playable vertical slice, v0.8.
 * Offline-first progression, photos with geometric scoring, chart, ship debrief.
 * The benchmark is a product target; neither this file nor its UI claims Wii parity.
 * All places/behaviours are authored fiction, not field measurements.
 */
const VOYAGE_KEY='return-blue.voyage.1';
const ORDERS=[
 {id:'arrival',title:'第一道光',en:'A QUIET ARRIVAL',description:'從錨地游進珊瑚花園，並累積游動 30 公尺。',place:'garden',reward:'航程起點',test:s=>s.visited.includes('garden')&&s.distance>=30},
 {id:'naturalist',title:'認識這片海',en:'FIRST ENCOUNTERS',description:'停下來觀察，將 3 類不同生物收錄圖鑑。',place:'garden',reward:'自然觀察筆記',test:s=>persistent.seen.length>=3},
 {id:'photographer',title:'留住一個瞬間',en:'A FRAME OF BLUE',description:'拍下一張 60 分以上的生物照片；留意取景、大小與遮擋。',place:'garden',reward:'攝影明信片',test:s=>Object.values(s.bestPhotos).some(p=>p.score>=60)},
 {id:'passage',title:'熟悉之外',en:'BEYOND THE FAMILIAR',description:'自己游到西側「環礁之門」，從開闊水域辨認石門。',place:'gate',reward:'環礁篇章',test:s=>s.visited.includes('gate')},
 {id:'archive',title:'眠海號的信',en:'A LETTER BELOW',description:'抵達沉船旁的黃色記錄器，靠近後讀取最後一頁。',place:'wreck',reward:'航海手記',test:s=>s.reading},
 {id:'song',title:'聽見遠方',en:'THE DISTANT SONG',description:'前往遠洋迴廊，在視野中觀察大翅鯨 4 秒；不必靠得很近。',place:'pelagic',reward:'遠洋回聲',test:s=>s.whaleWatch>=4}
];
const LAYOUT_BOUNDS=OceanTrench.worldBounds;
const initialVoyage=()=>({schema:1,mode:'free',completed:[],visited:[],distance:0,whaleWatch:0,reading:false,bestPhotos:{},photoCredits:[],waypoint:null,dives:0,totalSeconds:0,ended:false,finishedAt:null,companion:false,cruise:false,resume:null,features:{}});
function readVoyage(raw){
 if(!raw||raw.schema!==1)throw new Error('存檔版本不相容');const s=initialVoyage();
 s.mode='free';
 s.completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(id=>ORDERS.some(o=>o.id===id)))]:[];
 s.visited=Array.isArray(raw.visited)?[...new Set(raw.visited.filter(id=>LANDMARKS.some(l=>l.id===id)))]:[];
 for(const key of ['distance','whaleWatch','dives','totalSeconds'])if(Number.isFinite(raw[key]))s[key]=clamp(raw[key],0,1e8);
 for(const key of ['reading','ended','companion'])s[key]=raw[key]===true;
 s.finishedAt=typeof raw.finishedAt==='string'?raw.finishedAt.slice(0,50):null;
 s.waypoint=(typeof raw.waypoint==='string'&&OceanTrench.stations.some(st=>'trench:'+st.id===raw.waypoint))||raw.waypoint==='boat'||(typeof raw.waypoint==='string'&&raw.waypoint.startsWith('study:')&&typeof OceanRegions!=='undefined'&&Object.hasOwn(OceanRegions.points,raw.waypoint.slice(6)))||(typeof raw.waypoint==='string'&&raw.waypoint.startsWith('habitat:')&&SPECIES.some(sp=>'habitat:'+sp.id===raw.waypoint))||LANDMARKS.some(l=>l.id===raw.waypoint)?raw.waypoint:null;
 s.photoCredits=Array.isArray(raw.photoCredits)?[...new Set(raw.photoCredits.filter(n=>Number.isSafeInteger(n)&&n>0))].slice(-160):[];
 if(s.completed.length===ORDERS.length&&s.waypoint==='anchorage'&&!raw.features?.navigation)s.waypoint='boat';
 if(raw.bestPhotos&&typeof raw.bestPhotos==='object')for(const sp of SPECIES){let p=raw.bestPhotos[sp.id];if(p&&Number.isFinite(p.score))s.bestPhotos[sp.id]={score:Math.round(clamp(p.score,0,100)),individual:String(p.individual||'').slice(0,70),date:Number(p.date)||0};}
 const q=raw.resume;if(q&&Array.isArray(q.p)&&q.p.length===3&&q.p.every(Number.isFinite)&&Number.isFinite(q.yaw)&&Number.isFinite(q.pitch))s.resume={p:typeof DeepseaRules!=='undefined'&&DeepseaRules.canResume(raw.features?.deepsea,q.p)?q.p.slice():[clamp(q.p[0],-260,260),clamp(q.p[1],-120,-.65),clamp(q.p[2],-370,180)],yaw:q.yaw%TAU,pitch:clamp(q.pitch,-1.2,1.2),seconds:clamp(Number(q.seconds)||0,0,100000)};
 s.features=oceanFeatures.read(raw.features);
 return s;
}
const voyage={state:initialVoyage(),storageOK:true,loaded:false,lastSave:0,lastTick:0,sessionDistance:0,sessionSeen:0,sessionStart:0,sessionFirst:true,hasFinished:false,previousPosition:null,awaitingResume:false,gamepadButtons:[],gamepadAttached:false,photoMode:false,radioTimer:null,lastWhale:0,goalFlash:0};
function saveVoyage(){
 if(active)voyage.state.resume={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,seconds:diveSeconds};
 try{
  oceanSaveGuard.check();const value=JSON.stringify(voyage.state);let old=localStorage.getItem(VOYAGE_KEY);
  // A recovered good backup must survive even if replacing a corrupt primary fails.
  if(old){try{readVoyage(JSON.parse(old));}catch(_){old=null;}}
  // Backup capacity is optional; Storage.setItem keeps the old primary on failure.
  if(old){try{oceanSaveGuard.write(VOYAGE_KEY+'.backup',old);}catch(_){}}
  oceanSaveGuard.write(VOYAGE_KEY,value);voyage.storageOK=true;return true;
 }
 catch(e){voyage.storageOK=false;$('saveStatus')&&($('saveStatus').textContent='本機儲存受限 · 請匯出存檔');return false;}
}
function loadVoyage(){
 for(const key of [VOYAGE_KEY,VOYAGE_KEY+'.backup']){try{const raw=localStorage.getItem(key);if(raw){voyage.state=readVoyage(JSON.parse(raw));voyage.loaded=true;break;}}catch(e){console.warn('Voyage save unavailable',key,e.message);}}
}
function radio(text,who='澄 · 研究船'){clearTimeout(voyage.radioTimer);$('radioWho').textContent=who;$('radioText').textContent=text;$('radioBox').classList.add('visible');voyage.radioTimer=setTimeout(()=>$('radioBox').classList.remove('visible'),7500);}
function currentOrder(){return ORDERS.find(o=>!voyage.state.completed.includes(o.id))||null;}
function evaluateOrders(){
 let changed=false;
 for(const o of ORDERS)if(!voyage.state.completed.includes(o.id)&&o.test(voyage.state)){
  voyage.state.completed.push(o.id);changed=true;if(active&&voyage.state.mode==='journey'){toast('航程記憶 · '+o.title);oceanAudio.cue('found');}
 }
 if(changed)saveVoyage();
 if(changed&&voyage.state.mode==='journey'){const o=currentOrder();if(o)voyage.state.waypoint=o.place;else {voyage.state.waypoint='boat';if(active)radio('你已把這一趟海記下來了。慢慢回船吧，留意這一瓶的剩餘氣量。');}saveVoyage();}
 return changed;
}
function shipCamera(){
 const u=settings.reduced?0:Math.sin(t*.022)*.035;
 eye=[18+Math.sin(u)*8,-10.5,28];target=[3,-11,-20];diverBatch.visible=false;cameraCut=true;
}
function renderShip(){
 const s=voyage.state,completed=s.completed.length;
 $('shipProgress').textContent=String(completed).padStart(2,'0')+' / 06';
 $('shipProgressLine').style.width=(completed/6*100)+'%';
 $('shipModeJourney').classList.toggle('selected',s.mode==='journey');$('shipModeFree').classList.toggle('selected',s.mode==='free');
 const order=currentOrder();$('shipOrderName').textContent=order?order.title:s.ended?'海，是你的一部分。':'把海帶回去';
 $('shipOrderDescription').textContent=s.mode==='free'?'不必接委託，也不會有倒數。整片海自由探索。':order?order.description:'本航程的六段記憶已完成。回船整理成自己的海洋日誌。';
 $('shipContinue').classList.toggle('hidden',!s.resume);
 $('shipContinue').textContent='繼續上次潛水 · '+timeText(s.resume?.seconds||0);
 $('shipStats').textContent=`${s.dives} 次航程 · ${persistent.seen.length} / ${SPECIES.length} 類生物 · ${s.visited.length} / ${LANDMARKS.length} 個地標`;
 $('shipCards').innerHTML=ORDERS.map((o,i)=>`<button class="ship-memory ${s.completed.includes(o.id)?'complete':''}" data-order="${o.id}" title="${o.title}"><span>${s.completed.includes(o.id)?'✓':String(i+1).padStart(2,'0')}</span><b>${o.title}</b></button>`).join('');
 $('shipCards').querySelectorAll('button').forEach(b=>b.onclick=()=>{voyage.state.waypoint=ORDERS.find(o=>o.id===b.dataset.order).place;openPanel('voyage');});
 $('saveStatus').textContent=(!storageOK||!voyage.storageOK)?'瀏覽器儲存受限 · 請匯出存檔':voyage.loaded?'航程已讀取 · 自動保存在此瀏覽器':'自動保存在此瀏覽器 · 可匯出備份';
 $('shipFinal').classList.toggle('hidden',!s.ended);oceanFeatures.call('shipRender');
}
function toggleCruise(){if(!active||modal)return;if(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())oceanMicrocosm.exit('cruise');voyage.state.cruise=!voyage.state.cruise;stopAuto();$('cruiseBtn').classList.toggle('active',voyage.state.cruise);toast(voyage.state.cruise?'巡航推進已開啟 · 移動速度提高，不自動駕駛':'已回到緩慢觀察速度');}
function togglePhotoMode(){if(!active)return;if(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())oceanMicrocosm.exit('camera');voyage.photoMode=!voyage.photoMode;renderer.photoFov=voyage.photoMode?48:null;$('cameraFrame').classList.toggle('hidden',!voyage.photoMode);$('photoModeBtn').classList.toggle('active',voyage.photoMode);renderer.dirty=true;}
function readLogger(){
 const p=[95,groundHeight(99,-166)+3,-147];if(V.dist(player.p,p)>8){toast('先靠近沉船旁的黃色記錄器。');return false;}
 voyage.state.reading=true;evaluateOrders();saveVoyage();
 openPanel('letter');return true;
}
function observeWhale(dt){const f=life.find(f=>f.species===10);if(!f)return;const distance=V.dist(eye,f.p),p=project(f.p,renderer.vp);
 if(distance>=12&&distance<=85&&p[2]>0&&Math.abs(p[0])<.88&&Math.abs(p[1])<.75&&!blocked(eye,f.p)){voyage.state.whaleWatch=Math.min(5,voyage.state.whaleWatch+dt);if(voyage.lastWhale===0){radio('先停一下。那個影子會自己游進光裡。');voyage.lastWhale=t;}}
}
function gradePhoto(){
 let chosen=null,best=Infinity;const macro=typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing()?oceanMicrocosm.target():null;
 for(const fish of macro?[macro]:life){if(fish.ecologyPresent===false)continue;const aim=animalFocusPoint(fish),p=project(aim,renderer.vp),dist=V.dist(eye,aim);if(p[2]<=0||Math.abs(p[0])>.97||Math.abs(p[1])>.95||dist>110||fish.retreat>.8||fish.faunaVisibility<.8||blocked(eye,aim,fish.fauna?.001:.13))continue;
  if(fish.fauna&&dist>speciesTraits(fish.species).observeDistance*2)continue;
  const ctr=Math.hypot(p[0],p[1]);if(ctr<best){chosen={fish,p,dist};best=ctr;}}
 if(!chosen)return {score:0,subject:null,breakdown:'風景留念 · 畫面內沒有可評分的生物',metrics:{}};
 const {fish,p,dist}=chosen;const size=Math.max(...fish.s)*(fish.fauna?(SPECIES[fish.species].bodyLength||1):fish.species===10?9.5:fish.species===11?4.0:fish.species>=8?2.7:1.2),coverage=size/(Math.max(fish.fauna?.004:.3,dist)*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360));
 const ambient=eye[1]<-200?0:clamp(1+eye[1]/85,.3,1),lamp=renderer.lamp?torchIllumination(animalFocusPoint(fish),eye,renderer.cameraForward||V.sub(target,eye)):0;
 const framing=Math.max(0,1-best*.60)*30,scale=clamp(coverage/.24,0,1)*30,steady=(1-clamp(Math.hypot(...player.velocity)/6,0,1))*20,light=Math.max(ambient,lamp)*20;
 const safeDistance=fish.fauna?Math.max(.01,size*.8):fish.species===10?12:fish.species>=8?2.5:1;
 let score=Math.round(framing+scale+steady+light);if(dist<safeDistance)score=Math.min(score,49);if(coverage>1.4)score=Math.min(score,49);
 return {score,subject:fish,breakdown:dist<safeDistance?'再退開一些，給生物留出空間。':coverage>1.4?'輪廓超出畫面，退後一點再取景。':score>=80?'輪廓清楚、取景穩定，留下了一次完整相遇。':score>=60?'已取得清晰紀錄。放慢移動，可讓下一張更好。':'把生物放進畫面中央，等牠自然游近。',metrics:{framing:Math.round(framing),scale:Math.round(scale),steady:Math.round(steady),light:Math.round(light),distance:+dist.toFixed(2)}};
}
function recordPhotoProgress(photo){
 const s=voyage.state;if(!Number.isSafeInteger(photo.date)||photo.date<=0)return false;
 if(!Array.isArray(s.photoCredits))s.photoCredits=[];if(s.photoCredits.includes(photo.date))return false;
 const fish=life.find(f=>f.uid===photo.individual),score=clamp(Number(photo.grade)||0,0,100);
 if(fish){const id=SPECIES[fish.species].id,old=s.bestPhotos[id];if(!old||score>old.score)s.bestPhotos[id]={score,individual:fish.uid,date:photo.date};}
 s.photoCredits.push(photo.date);s.photoCredits=s.photoCredits.slice(-160);
 oceanFeatures.call('onPhoto',photo);evaluateOrders();log('拍下「'+photo.species+'」・底片已保存');persist();saveVoyage();return true;
}
const legacyPhoto=takePhoto;
takePhoto=async function(){
 if(!active||modal||photoOpen||voyage.photoBusy||voyage.importing||Date.now()-lastPhoto<900)return;
 if(!oceanPhotography.canCapture()){toast(oceanPhotography.blockedReason());return;}
 voyage.photoBusy=true;
 try{
  if(renderer.sceneStream){updateCamera();oceanFeatures.call('afterCamera',0);await renderer.sceneStream.ready(eye);if(!active||modal||photoOpen)return;}
  const photo=legacyPhoto();if(!photo)return;const grade=gradePhoto();
  photo.grade=grade.score;photo.metrics=grade.metrics;photo.species=grade.subject?SPECIES[grade.subject.species].name:'海底風景';photo.individual=grade.subject?.uid||null;
  oceanFeatures.call('photoMetadata',photo);
  if(!await oceanPhotography.capture(photo))return;
  $('photoScore').textContent=grade.subject?String(grade.score).padStart(2,'0'):'—';$('photoSubject').textContent=photo.species;$('photoFeedback').textContent=grade.breakdown;$('photoResult').classList.remove('hidden');clearTimeout(voyage.photoTimer);voyage.photoTimer=setTimeout(()=>$('photoResult').classList.add('hidden'),6200);
  return photo;
 }catch(error){toast('這次拍攝未完成：'+error.message);}
 finally{voyage.photoBusy=false;}
};
const legacyStart=startDive;
startDive=function(tour=false){
 if(!ready)return;voyage.state.mode='free';const resume=voyage.awaitingResume?voyage.state.resume:null;voyage.awaitingResume=false;
 legacyStart(tour);if(!active)return;
 if(resume){player.p=collide(resume.p.slice());player.yaw=resume.yaw;player.pitch=resume.pitch;diveSeconds=resume.seconds;resetInput();}
 oceanFeatures.call('prepareDive',{resume:!!resume,tour});
 voyage.sessionStart=diveSeconds;voyage.sessionDistance=0;voyage.sessionSeen=persistent.seen.length;voyage.previousPosition=player.p.slice();voyage.state.cruise=false;
 $('cruiseBtn').classList.remove('active');$('photoResult').classList.add('hidden');$('debrief').classList.add('hidden');
 document.body.classList.toggle('free-voyage',voyage.state.mode==='free');
 if(!resume)voyage.state.dives++;
 oceanFeatures.call('startDive',{resume:!!resume,tour});renderer.forceShadow=true;saveVoyage();
};
const legacyHome=goHome;
goHome=function(){
 if(!active){legacyHome();renderShip();return;}
 saveVoyage();const savedPosition=voyage.state.resume;
 oceanFeatures.call('endDive');
 const s=voyage.state;s.totalSeconds+=Math.max(0,diveSeconds-voyage.sessionStart);
 if(voyage.photoMode)togglePhotoMode();legacyHome();s.resume=savedPosition;saveVoyage();renderShip();renderer.forceShadow=true;renderer.dirty=true;
 $('debrief').classList.add('hidden');

};
const legacyCamera=updateCamera;
updateCamera=function(dt=1/60,renderPosition=null){if(!active){shipCamera();return;}legacyCamera(dt,renderPosition);};
const legacyPlayer=updatePlayer;
updatePlayer=function(dt){
 const before=player.p.slice(),old=settings.speed;if(voyage.state.cruise&&!auto)settings.speed=old*1.9;
 legacyPlayer(dt);settings.speed=old;
 const d=V.dist(before,player.p);if(Number.isFinite(d)&&d<Math.max(2,V.len(player.velocity)*dt+1)){voyage.state.distance+=d;voyage.sessionDistance+=d;}
};
const legacyFind=findSpecies;
findSpecies=function(index,specific=null){
 const deep=typeof oceanDeepsea!=='undefined'&&oceanDeepsea.isActive();
 const candidates=life.filter(f=>f.species===index&&f.ecologyPresent!==false);let fish=specific||candidates.reduce((a,f)=>!a||V.dist(f.p,player.p)<V.dist(a.p,player.p)?f:a,null);
 if(!fish||fish.ecologyPresent===false){const sp=SPECIES[index];if(sp.fauna&&sp.wildHabitat!==false)markPlace('habitat:'+sp.id);toast(oceanSeasons.hint(sp.id));return;}
 if(V.dist(animalFocusPoint(fish),player.p)>speciesTraits(index).observeDistance){markPlace('habitat:'+SPECIES[index].id);toast('已標記棲地，直接游近就能觀察。');return;}
 if(SPECIES[index].traits?.micro){closePanel();if(typeof oceanMicrocosm!=='undefined'&&V.dist(animalFocusPoint(fish),player.p)<=speciesTraits(index).observeDistance){oceanMicrocosm.enter(fish.uid);}else{markPlace('habitat:'+SPECIES[index].id);toast('已標記棲地；游近後開啟微觀探索，尋找細小的身影。');}return;}
 if(voyage.state.mode==='journey'&&V.dist(fish.p,player.p)>(index===10?85:20)){
  const sp=SPECIES[index],place=sp.fauna?'habitat:'+sp.id:LANDMARKS[sp.zone].id;markPlace(place);toast('已標記棲地。先親自游近，再觀察這位訪客。');return;}
 legacyFind(index,fish);
 followDistance=speciesTraits(index).viewDistance;
 chooseObservationSide(fish);player.p=collide(V.add(fish.p,viewingOffset(fish)));resetInput();auto=true;follow=fish;setAutoUI();
};
// Chart marks a real game-space destination, never teleports from a route button.
function voyageDestination(id=voyage.state.waypoint){
 if(typeof id==='string'&&id.startsWith('trench:')){const station=OceanTrench.stations.find(st=>id==='trench:'+st.id);return station?{id,name:station.name,x:station.p[0],y:station.p[1],z:station.p[2],radius:20}:null;}
 if(typeof id==='string'&&id.startsWith('study:')&&typeof OceanRegions!=='undefined'){const a=OceanRegions.points[id.slice(6)];return a?{id,name:a.name,x:a.p[0],y:a.p[1],z:a.p[2],radius:4}:null;}
 if(typeof id==='string'&&id.startsWith('habitat:')){
  const sp=SPECIES.find(s=>'habitat:'+s.id===id),owned=voyage.state.features?.ecology?.partners||[],f=sp&&life.find(f=>SPECIES[f.species]===sp&&(sp.wildHabitat!==false||owned.some(p=>p.uid===f.uid)));if(!f)return null;
  const companion=sp.wildHabitat===false,p=companion||sp.pelagic?f.p:f.home||f.center||f.p;return {id,name:sp.name+(companion?'夥伴':sp.pelagic?'巡游方位':'棲地'),x:p[0],y:p[1]+.6,z:p[2],radius:sp.pelagic?Math.max(8,Math.min(18,sp.size*.6)):3};
 }
 return id==='boat'?{id:'boat',name:'研究船',x:OPEN_WORLD.boat[0],z:OPEN_WORLD.boat[2],radius:12}:LANDMARKS.find(l=>l.id===id);}
function markPlace(id){const l=voyageDestination(id);if(!l)return;voyage.state.waypoint=id;saveVoyage();closePanel();toast('已標記：'+l.name+' · 跟隨方位前進');}
renderMap=function(){
 panelTitle('YOUR EXPEDITION CHART','海，比眼前更遠');
 $('panelBody').innerHTML=`<p class="panel-note">連續海域 · ${voyage.state.visited.length}/${LANDMARKS.length} 個地標。點選地標標記航向，不會直接傳送。所有距離皆為遊戲尺度。</p><canvas id="mapCanvas" class="map-canvas" width="600" height="530" aria-label="可點選地標的遊戲海圖"></canvas><div class="chart-places">${PELAGIC_SPECIES.map(sp=>`<button class="chart-place" data-mark="habitat:${sp.id}"><small>≈</small><span>${sp.name}巡游海域</span><em>${sp.size} m</em></button>`).join('')}${OceanTrench.stations.map(st=>`<button class="chart-place" data-mark="trench:${st.id}"><small>↓</small><span>${st.name}</span><em>${Math.round(-st.p[1])} m</em></button>`).join('')}${LANDMARKS.map((l,i)=>`<button class="chart-place ${voyage.state.visited.includes(l.id)?'known':''}" data-mark="${l.id}"><small>${String(i+1).padStart(2,'0')}</small><span>${l.name}</span><em>${voyage.state.visited.includes(l.id)?'已發現':'待探索'}</em></button>`).join('')}</div><p class="panel-note">這是原創海域，沒有真實經緯度；不是現場路線圖。所有海域都能直接游到；沒有氣量倒數。</p><button id="chartHome" class="muted-btn">儲存並回首頁</button>`;
 $('panelBody').querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>markPlace(b.dataset.mark));$('chartHome').onclick=()=>{closePanel();goHome();};
 $('mapCanvas').onclick=e=>{const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*600,y=(e.clientY-rect.top)/rect.height*530;for(const l of LANDMARKS){const p=chartPoint(l.x,l.z,600,530);if(Math.hypot(p[0]-x,p[1]-y)<24){markPlace(l.id);return;}}};drawMap();
};
function chartPoint(x,z,w,h){const b=LAYOUT_BOUNDS;return [(x-b.left)/(b.right-b.left)*w,(z-b.top)/(b.bottom-b.top)*h];}
let chartTerrain=null;
drawMap=function(){
 const c=$('mapCanvas');if(!c)return;const x=c.getContext('2d'),w=c.width,h=c.height;
 if(!chartTerrain){chartTerrain=document.createElement('canvas');chartTerrain.width=600;chartTerrain.height=530;const ctx=chartTerrain.getContext('2d');ctx.fillStyle='#092532';ctx.fillRect(0,0,600,530);
  for(let j=0;j<106;j++)for(let i=0;i<120;i++){const gx=LAYOUT_BOUNDS.left+i/120*(LAYOUT_BOUNDS.right-LAYOUT_BOUNDS.left),gz=LAYOUT_BOUNDS.top+j/106*(LAYOUT_BOUNDS.bottom-LAYOUT_BOUNDS.top),d=groundHeight(gx,gz),a=clamp((d+86)/80,0,1);ctx.fillStyle=`rgba(112,185,177,${a*.21})`;ctx.fillRect(i*5,j*5,5,5);if(Math.floor(-d/6)!==Math.floor(-groundHeight(gx+4.8,gz)/6)){ctx.fillStyle='#7ab3ae4a';ctx.fillRect(i*5,j*5,1.2,5);}}
  ctx.strokeStyle='#b1d7d41c';for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(i*75,0);ctx.lineTo(i*75,530);ctx.moveTo(0,i*66);ctx.lineTo(600,i*66);ctx.stroke();}
 }
 x.drawImage(chartTerrain,0,0,w,h);oceanFeatures.drawMap(x,w,h);
 x.font='10px sans-serif';x.fillStyle='#9abfbd';x.fillText('N ↑',w-35,22);x.fillText('歸潮海域 / ORIGINAL CONCEPT',17,22);
 if(active){const p=chartPoint(player.p[0],player.p[2],w,h),to=voyageDestination();if(to){const q=chartPoint(to.x,to.z,w,h);x.strokeStyle='#d6ca9e65';x.setLineDash([4,7]);x.beginPath();x.moveTo(...p);x.lineTo(...q);x.stroke();x.setLineDash([]);}x.save();x.translate(...p);x.rotate(player.yaw);x.fillStyle='#edf5e8';x.beginPath();x.moveTo(0,-8);x.lineTo(-5,6);x.lineTo(5,6);x.closePath();x.fill();x.restore();}
 const habitat=voyageDestination();if(habitat?.id.startsWith('habitat:')){const p=chartPoint(habitat.x,habitat.z,w,h);x.strokeStyle='#e4cc91';x.fillStyle='#e4cc91';x.beginPath();x.arc(...p,6,0,TAU);x.stroke();x.font='11px sans-serif';x.fillText(habitat.name,p[0]+10,p[1]-9);}
 const trenchMarker=chartPoint(766,-110,w,h);x.fillStyle='#a6d8df';x.beginPath();x.arc(...trenchMarker,6,0,TAU);x.fill();x.font='11px sans-serif';x.textAlign='right';x.fillText('海溝 · 700–7,000 m',trenchMarker[0]-11,trenchMarker[1]-10);x.textAlign='left';
 LANDMARKS.forEach((l,i)=>{const p=chartPoint(l.x,l.z,w,h),known=voyage.state.visited.includes(l.id),sel=voyage.state.waypoint===l.id;x.strokeStyle=sel?'#e4cc91':known?'#a5d9d0':'#6b969e';x.fillStyle=known?'#a5d9d0':'#0d3040';x.beginPath();x.arc(...p,sel?8:5,0,TAU);x.fill();x.stroke();x.fillStyle=sel?'#e4cc91':known?'#d3e9e2':'#8babaf';x.font='11px sans-serif';x.fillText(String(i+1).padStart(2,'0')+' '+l.name,p[0]+12,p[1]+4);});
};
function renderVoyagePanel(){
 panelTitle('THE FIRST EXPEDITION','第一航程 · 歸潮');const s=voyage.state;
 $('panelBody').innerHTML=`<p class="panel-note">你是這趟研究航程的攝影記錄者。沒有評分倒數，也不必依順序完成；一個地標、一位訪客，慢慢留下六段記憶。</p><div class="order-list">${ORDERS.map((o,i)=>`<article class="order ${s.completed.includes(o.id)?'done':''}"><header><small>${String(i+1).padStart(2,'0')} / ${o.en}</small><b>${s.completed.includes(o.id)?'✓ 已記錄':'待完成'}</b></header><h3>${o.title}</h3><p>${o.description}</p><button data-dest="${o.place}" class="muted-btn">標記航向 ↗</button></article>`).join('')}</div><section class="order"><h3>把海帶回去</h3><p>六段記憶完成後返回研究船，完成第一航程。已發現的海域仍能自由重遊。</p><button class="muted-btn" id="voyageHome">返回研究船</button></section><div class="save-actions"><button class="muted-btn" id="exportSave">匯出完整存檔</button><label class="muted-btn">匯入存檔<input id="importSave" type="file" accept="application/json,.json" hidden></label></div><p class="panel-note">存檔包含航程、設定、圖鑑、全部底片及相簿原圖；只在本機處理。不會上傳資料。新存檔匯入後會替換此瀏覽器的進度。</p>`;
 $('panelBody').querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>markPlace(b.dataset.dest));$('voyageHome').onclick=goHome;$('exportSave').onclick=exportSave;$('importSave').onchange=e=>importSaveFile(e.target.files[0]);
}
async function exportSave(){
 if(voyage.importing||voyage.exporting){toast('存檔正在處理中，請完成後再匯出備份。');return false;}
 voyage.exporting=true;
 try{const photography=await oceanPhotography.exportArchive();const snapshot=JSON.parse(JSON.stringify(voyage.state));if(active)snapshot.resume={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,seconds:diveSeconds};const data={format:'return-blue/save',version:1,exported:new Date().toISOString(),voyage:snapshot,journal:oceanPhotography.journalSnapshot(persistent),photography};const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));download(url,'Return-to-the-Blue-save.json');setTimeout(()=>URL.revokeObjectURL(url),10000);return true;}
 catch(error){toast('無法匯出完整存檔：'+error.message);return false;}
 finally{voyage.exporting=false;}
}
function readPhotoMetadata(raw){
 const result={};if(typeof raw.knowledgeEligible==='boolean')result.knowledgeEligible=raw.knowledgeEligible;
 if(raw.camera&&typeof raw.camera==='object'){
  const c=raw.camera,finite=(v,a,b,f)=>Number.isFinite(v)?clamp(v,a,b):f;
  result.camera={mode:['lens','macro'].includes(c.mode)?c.mode:'normal',zoom:finite(c.zoom,8,90,69),aperture:finite(c.aperture,0,16,0),focus:finite(c.focus,0,80,0),exposure:finite(c.exposure,-1.5,1.5,0)};
 }
 if(raw.metrics&&typeof raw.metrics==='object'){result.metrics={};for(const k of ['framing','scale','steady','light','distance'])if(Number.isFinite(raw.metrics[k]))result.metrics[k]=clamp(raw.metrics[k],0,k==='distance'?110:100);}
 return result;
}
function validateImport(data){
 if(data?.format!=='return-blue/save'||data.version!==1)throw new Error('不是本遊戲支援的存檔');const state=readVoyage(data.voyage),j=data.journal||{};
 const seen=Array.isArray(j.seen)?[...new Set(j.seen.filter(id=>SPECIES.some(s=>s.id===id)))]:[];
 const photos=uniquePhotos(Array.isArray(j.photos)?j.photos.slice(-64).filter(p=>p&&typeof p.url==='string'&&p.url.length<1600000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.url)).map(p=>({url:p.url,...readPhotoMetadata(p),date:Number.isFinite(p.date)?p.date:0,area:String(p.area||'海域').slice(0,70),species:String(p.species||'海底風景').slice(0,60),individual:String(p.individual||'').slice(0,70),grade:clamp(Number(p.grade)||0,0,100)})):[]).slice(-8);
 const importedSettings={...settings,sound:false};
 for(const key of ['quality','speed','sensitivity'])if(Number.isFinite(j.settings?.[key]))importedSettings[key]=key==='quality'?Math.round(clamp(j.settings[key],0,2)):clamp(j.settings[key],.4,2.4);
 for(const key of ['master','music','ambience','breath'])if(Number.isFinite(j.settings?.[key]))importedSettings[key]=clamp(j.settings[key],0,1);
 for(const key of ['hints','third','reduced','lamp','adaptive','startWithSound','lookLock'])if(typeof j.settings?.[key]==='boolean')importedSettings[key]=j.settings[key];
 if(['day','late','blue'].includes(j.settings?.lighting))importedSettings.lighting=j.settings.lighting;
 if(Number.isFinite(j.settings?.fov))importedSettings.fov=clamp(j.settings.fov,55,90);
 if(Number.isFinite(j.settings?.clarity))importedSettings.clarity=clamp(j.settings.clarity,.5,1.5);
 const entries=Array.isArray(j.log)?j.log.slice(-60).filter(e=>e&&typeof e.text==='string'&&Number.isFinite(e.date)).map(e=>({text:e.text.slice(0,250),date:e.date})):[];
 return {state,seen,photos,settings:importedSettings,log:entries};
}
async function importSaveFile(file){
 if(!file||voyage.importing)return;if(voyage.exporting){toast('正在匯出備份，請完成後再匯入存檔。');return;}if(file.size>144*1024*1024){toast('存檔超過 144 MiB 上限。');return;}
 voyage.importing=true;let finishImport;voyage.importDone=new Promise(resolve=>{finishImport=resolve;});let prepared,backup,storageBackup,applied=false;
 try{
  oceanSaveGuard.check();const data=JSON.parse(await file.text()),checked=validateImport(data);oceanSaveGuard.check();
  if(!confirm('匯入後會替換目前航程、圖鑑、底片與相簿。確定繼續？'))return;
  prepared=await oceanPhotography.prepareImport(data.photography,checked.photos,checked.state.features.photography,Object.values(checked.state.features.expedition.mail).filter(m=>m.status==='complete'&&m.photoDate>0).map(m=>m.photoDate));
  if(data.photography){const developed=new Set(prepared.state.album.map(p=>p.date));for(const mail of Object.values(checked.state.features.expedition.mail))if(mail.status==='complete'&&mail.photoDate>0&&!developed.has(mail.photoDate))throw new Error('存檔缺少已投稿的相簿附件');}
  oceanSaveGuard.check();if(active){closePanel();goHome();$('debrief').classList.add('hidden');}
  backup={state:JSON.parse(JSON.stringify(voyage.state)),journal:{...persistent,seen:persistent.seen.slice(),photos:persistent.photos.slice(),log:persistent.log.slice(),settings:{...settings}}};
  storageBackup=[STORE_KEY,VOYAGE_KEY,VOYAGE_KEY+'.backup'].map(key=>[key,localStorage.getItem(key)]);
  await prepared.commit();applied=true;oceanSaveGuard.check();
  checked.state.features.photography=prepared.state;voyage.state=checked.state;persistent.seen=checked.seen;persistent.photos=prepared.photos;persistent.log=checked.log;Object.assign(settings,checked.settings);
  oceanFeatures.reset();renderer.quality=settings.quality;renderer.resize();applyVisualSettings();oceanAudio.tick();
  if(!persist()||!saveVoyage())throw new Error('瀏覽器無法保存匯入的航程');
  renderShip();setCount();toast('存檔已匯入。');
 }catch(error){
  let restored=true;
  if(applied){
   try{await prepared.rollback();}catch(rollbackError){restored=false;console.error('Photo restoration failed',rollbackError);}
   // The rescue export must describe one coherent pre-import snapshot even if
   // durable rollback failed. Photography retains its matching original cache.
   voyage.state=backup.state;persistent.seen=backup.journal.seen;persistent.photos=backup.journal.photos;persistent.log=backup.journal.log;Object.assign(settings,backup.journal.settings);
   try{if(restored&&oceanSaveSession.writable)for(const[key,value]of storageBackup)oceanSaveGuard.write(key,value);oceanFeatures.reset();renderer.quality=settings.quality;renderer.resize();applyVisualSettings();renderShip();setCount();}catch(rollbackError){restored=false;console.error('Save restoration failed',rollbackError);}
   if(!restored)oceanSaveGuard.recoveryFailed();
  }
  toast(restored?'未套用新存檔：'+error.message:'還原存檔時儲存失敗，請保留此視窗並下載備份。');
 }finally{voyage.importing=false;finishImport();voyage.importDone=null;}
}
function renderPause(){panelTitle('PAUSE / CONTINUE','在海裡，休息一下');$('panelBody').innerHTML=`<div class="pause-actions"><button class="primary" id="resumeBtn">繼續潛水 ↗</button><button class="muted-btn" id="pauseChart">海域地圖</button><button class="muted-btn" id="pauseVoyage">航程與存檔</button><button class="muted-btn" id="pauseSettings">畫面與聲音</button><button class="muted-btn" id="pauseBoat">儲存並回首頁</button></div><p class="panel-note">此時已暫停游動、動物與航程計時；音樂可以繼續播放。</p>`;$('resumeBtn').onclick=closePanel;$('pauseChart').onclick=()=>openPanel('map');$('pauseVoyage').onclick=()=>openPanel('voyage');$('pauseSettings').onclick=()=>openPanel('settings');$('pauseBoat').onclick=goHome;}
const legacyPanel=openPanel;
openPanel=function(type){
 legacyPanel(type);document.body.classList.toggle('wide-chart',type==='map');
 if(type==='voyage')renderVoyagePanel();if(type==='pause')renderPause();
 if(type==='letter'){panelTitle('LOG 018 / THE SLEEPING VESSEL','給下一位來到這裡的人');$('panelBody').innerHTML=`<div class="letter"><p>我以為最後一趟航行，會有一個很明確的終點。</p><p>後來，海把甲板收了回去。魚群穿過我們走過的地方，光落在曾經放著餐桌的角落。</p><p>你不需要帶走什麼。替我們記下，這艘船後來的樣子。</p><p class="signature">眠海號 · 原創航程故事</p></div><button class="primary" id="letterClose">把故事留在這裡 ↗</button>`;$('letterClose').onclick=closePanel;}
};
const legacyClose=closePanel;closePanel=function(){legacyClose();document.body.classList.remove('wide-chart');};
function paintVoyageHUD(){
 const s=voyage.state,o=currentOrder(),name=s.mode==='free'?'自由重遊':o?o.title:'把海帶回去';$('objectiveName').textContent=name;$('objectiveCount').textContent=s.mode==='free'?'OPEN WATER':s.completed.length+' / 6';
 $('objectiveDetail').textContent=s.mode==='free'?'沒有任務倒數，去你想去的地方。':o?o.description:'返回研究船，整理這次航程。';
 const l=voyageDestination();$('waypointHUD').classList.toggle('hidden',!l||!active||modal!==null||document.body.classList.contains('cinematic'));
 if(l){const pos=[l.x,Number.isFinite(l.y)?l.y:l.id==='boat'?0:groundHeight(l.x,l.z)+12,l.z],p=project(pos,renderer.vp);const dist=Number.isFinite(l.y)?V.dist(player.p,pos):Math.hypot(player.p[0]-l.x,player.p[2]-l.z);const back=p[2]<0;const px=clamp((back?-p[0]:p[0])*.5+.5,.10,.9),py=clamp((back?p[1]:-p[1])*.5+.5,.22,.72);const el=$('waypointHUD');el.style.left=px*100+'%';el.style.top=py*100+'%';$('waypointName').textContent=l.name;$('waypointDistance').textContent=Math.round(dist)+' m';el.classList.toggle('behind',back);el.classList.toggle('arrived',dist<(l.radius||12));}
 const logger=[95,groundHeight(99,-166)+3,-147];$('interactBtn').classList.toggle('hidden',V.dist(player.p,logger)>8||s.reading);
 $('companionBtn').classList.toggle('hidden',!persistent.seen.includes('dolphin'));$('companionBtn').classList.toggle('active',s.companion);
}
const legacyLifeUpdate=updateLife;
updateLife=function(time){legacyLifeUpdate(time);if(typeof voyage==='undefined'||!voyage.state.companion||!active||(typeof oceanDeepsea!=='undefined'&&oceanDeepsea.isActive()))return;const f=life.find(f=>f.species===11);if(!f)return;
 const step=clamp(time-(f._followTime??time-1/60),0,.1);f._followTime=time;const d=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)];const target=V.add(player.p,V.add(V.mul(d,6),V.add(V.mul(right,4.4),[0,.8+Math.sin(time*.7)*.4,0])));target[1]=Math.min(-2,Math.max(groundHeight(target[0],target[2])+2,target[1]));
 f._followPoint=f._followPoint||f.p.slice();const old=f._followPoint.slice();f._followPoint=V.lerp(old,target,1-Math.exp(-step*1.34));f.p=f._followPoint.slice();const delta=V.sub(f.p,old);f.yaw=Math.atan2(-delta[2],delta[0]);f.pitch=Math.atan2(delta[1],Math.hypot(delta[0],delta[2]));
};
function voyageTick(dt){
 if(!active||modal||photoOpen)return;
 for(const l of LANDMARKS){const d=Number.isFinite(l.y)?V.dist(player.p,[l.x,l.y,l.z]):Math.hypot(player.p[0]-l.x,player.p[2]-l.z);if(d<(l.radius||12)&&!voyage.state.visited.includes(l.id)){voyage.state.visited.push(l.id);saveVoyage();}}
 observeWhale(dt);evaluateOrders();oceanFeatures.call('tick',dt);if(!active)return;paintVoyageHUD();oceanFeatures.call('paintHUD');
 if(t-voyage.lastSave>8){voyage.lastSave=t;saveVoyage();}
}
function pollGamepad(){
 let g;try{g=navigator.getGamepads?.()?.find(p=>p?.connected);}catch(_){return;}
 if(!g){if(typeof oceanGamepadUI!=='undefined')oceanGamepadUI.disconnect();if(voyage.gamepadAttached||voyage.gamepadDepth){resetInput();voyage.gamepadAttached=false;voyage.gamepadDepth=false;}voyage.gamepadButtons=[];return;}
 if(typeof oceanGamepadUI!=='undefined'&&oceanGamepadUI.poll(g,voyage.gamepadButtons)){voyage.gamepadButtons=g.buttons.map(b=>b.pressed);return;}
 const dead=v=>Math.abs(v)<.15?0:Math.sign(v)*(Math.abs(v)-.15)/.85;
 if(active&&!modal&&!photoOpen){const move=[dead(g.axes[0]||0),dead(g.axes[1]||0)],look=[dead(g.axes[2]||0),dead(g.axes[3]||0)];if(move.some(v=>v)||look.some(v=>v)){stopAuto();voyage.gamepadAttached=true;stick=move;lookStick=look;}else if(voyage.gamepadAttached){stick=move;lookStick=look;}
  const vertical=(g.buttons[7]?.value||0)-(g.buttons[6]?.value||0);if(Math.abs(vertical)>.04||voyage.gamepadDepth){verticalInput=vertical;voyage.gamepadDepth=Math.abs(vertical)>.04;}
 }
 const press=i=>g.buttons[i]?.pressed&&!voyage.gamepadButtons[i];
 if(press(9)){if(modal)closePanel();else if(active&&!oceanSwimActions.exit())openPanel('diveMenu');}
 if(active&&!modal&&!photoOpen){if(press(0))takePhoto();if(press(1))observeNearest();if(press(2))openPanel('map');if(press(3))toggleCruise();if(press(4))oceanSwimActions.quickTurn();if(press(5))oceanSwimActions.toggleSurface();}
 voyage.gamepadButtons=g.buttons.map(b=>b.pressed);
}
function initVoyage(){
 loadVoyage();renderShip();
 $('voyageBtn').onclick=()=>openPanel('voyage');$('objectiveCard').onclick=()=>openPanel(voyage.state.features.story?.started?'story':'voyage');$('pauseBtn').onclick=()=>openPanel('pause');$('cruiseBtn').onclick=toggleCruise;$('photoModeBtn').onclick=()=>togglePhotoMode();$('interactBtn').onclick=readLogger;
 $('shipModeJourney').onclick=()=>{voyage.state.mode='journey';saveVoyage();renderShip();};$('shipModeFree').onclick=()=>{voyage.state.mode='free';saveVoyage();renderShip();};
 $('shipContinue').onclick=()=>{voyage.awaitingResume=true;startDive(false);};$('shipLog').onclick=()=>openPanel('voyage');$('shipChart').onclick=()=>openPanel('map');$('shipGallery').onclick=()=>openPanel('journal');$('shipSettings').onclick=()=>openPanel('settings');
 $('debriefClose').onclick=()=>$('debrief').classList.add('hidden');$('debriefExport').onclick=exportSave;
 $('companionBtn').onclick=()=>{voyage.state.companion=!voyage.state.companion;saveVoyage();paintVoyageHUD();toast(voyage.state.companion?'海豚會保持距離，與你一起游動。':'海豚回到自己的航線。');};
 // Capture shortcuts before the old nearest-animal shortcut; no duplicate input actions.
 window.addEventListener('keydown',e=>{if(oceanKeyboard.reserved(e))return;
  if(e.code==='Escape'&&oceanFeatures.some('escape')){e.preventDefault();e.stopImmediatePropagation();return;}
  if(e.code==='Escape'&&active&&!modal&&!photoOpen){e.preventDefault();e.stopImmediatePropagation();openPanel('pause');}
  if(active&&!modal&&!photoOpen&&!e.repeat){if(e.code==='KeyF'&&!$('interactBtn').classList.contains('hidden')){e.preventDefault();e.stopImmediatePropagation();readLogger();}if(e.code==='KeyC'){toggleCruise();}if(e.code==='KeyX'){togglePhotoMode();}if(e.code==='KeyB'){openPanel('voyage');}}
 },true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!voyage.importing)saveVoyage();});
 window.__voyage={get state(){return JSON.parse(JSON.stringify(voyage.state))},get objectives(){return ORDERS.map(o=>({id:o.id,complete:o.test(voyage.state)}))},validateImport,gradePhoto,exportSave};
}
