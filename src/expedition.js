/* Original research mail, guest dives, camera controls and expedition clock. */
const oceanExpedition=(()=>{
 const AIR_SECONDS=1200;
 const requests=[
  {id:'editor-reef',kind:'photo',title:'編輯來信：光裡的青雀鯛',from:'禾 · 海岸季刊',body:'新一期要從一條小魚開始。請拍攝青雀鯛，讓牠的輪廓完整留在畫面裡；你可以在研究船檢查照片，再選一張投稿。',species:'chromis',minimum:60,reward:'珊瑚橘潛水衣',outfit:'coral'},
  {id:'guest-garden',kind:'guide',title:'帶路委託：初次見海',from:'葉子 · 訪客',body:'第一次在海裡看見海龜，是什麼感覺？我會在船邊等你。請慢慢帶我游向珊瑚花園，和我一起觀察綠蠵龜。',species:'turtle',place:'garden',seconds:4,reward:'海草綠潛水衣',outfit:'kelp'},
  {id:'editor-ray',kind:'photo',title:'編輯來信：展開的翅膀',from:'禾 · 海岸季刊',body:'這次想記錄鷹魟完整展翼的瞬間。請不要讓輪廓超出相框，照片達 70 分後寄回研究船。',species:'ray',minimum:70,after:'editor-reef',reward:'深海紫潛水衣',outfit:'violet'},
  {id:'guest-gate',kind:'guide',title:'帶路委託：石門另一側',from:'北辰 · 訪客',body:'我想沿西側礁緣游到環礁之門，也想在路上看清鸚哥魚的顏色。請讓我跟得上，再一起回船。',species:'parrot',place:'gate',seconds:5,after:'guest-garden',reward:'夕照金潛水衣',outfit:'gold'},
  {id:'editor-whale',kind:'photo',title:'編輯來信：海的尺度',from:'禾 · 海岸季刊',body:'最後一張跨頁留給大翅鯨。退遠一些，讓長胸鰭與尾部一起入鏡。需要一張 75 分以上的紀錄。',species:'whale',minimum:75,after:'editor-ray',reward:'遠洋攝影紀念章'},
  {id:'guest-wreck',kind:'guide',title:'帶路委託：眠海號',from:'青嵐 · 訪客',body:'帶我去看看那艘沉船吧。我也想見到常在礁緣游動的隆頭魚。抵達後不用急著離開，一起好好看看。',species:'wrasse',place:'wreck',seconds:5,after:'guest-gate',reward:'航路引導紀念章'}
 ];
 const palettes={blue:{name:'海藍',tint:[1,1,1]},coral:{name:'珊瑚橘',tint:[2.1,.80,.57]},kelp:{name:'海草綠',tint:[.86,1.33,.75]},violet:{name:'深海紫',tint:[1.58,.84,1.65]},gold:{name:'夕照金',tint:[1.90,1.47,.56]}};
 const initial=()=>({day:1,minute:540,air:AIR_SECONDS,inDive:false,lowAir:false,clockAuto:false,mail:{},outfit:'blue',camera:{zoom:48,aperture:8,focus:8,exposure:0},guest:null});
 const finite=(v,a,b,f)=>Number.isFinite(v)?clamp(v,a,b):f;
 function guestPoint(p){
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))return null;
  const b=OceanTrench.worldBounds;return [clamp(p[0],b.left+.5,b.right-.5),clamp(p[1],OceanTrench.bounds.min[1],-.65),clamp(p[2],b.top+.5,b.bottom-.5)];
 }
 function sanitize(raw){
  const s=initial();if(!raw||typeof raw!=='object')return s;
  s.day=Math.floor(finite(raw.day,1,9999,1));s.minute=finite(raw.minute,0,1439.999,540);s.air=finite(raw.air,0,AIR_SECONDS,AIR_SECONDS);s.inDive=raw.inDive===true;s.lowAir=raw.lowAir===true;s.clockAuto=raw.clockAuto===true;
  for(const r of requests){const m=raw.mail?.[r.id];if(!m||typeof m!=='object')continue;const status=['accepted','ready','complete'].includes(m.status)?m.status:'accepted';s.mail[r.id]={status,acceptedAt:finite(m.acceptedAt,0,1e15,0),progress:finite(m.progress,0,r.seconds||1,0),visited:m.visited===true,photoDate:finite(m.photoDate,0,1e15,0),read:m.read===true};}
  s.outfit=palettes[raw.outfit]&&unlockedOutfit(s,raw.outfit)?raw.outfit:'blue';
  const c=raw.camera||{};s.camera={zoom:finite(c.zoom,25,75,48),aperture:finite(c.aperture,1.8,16,8),focus:finite(c.focus,.8,80,8),exposure:finite(c.exposure,-1.5,1.5,0)};
  const g=raw.guest;if(g&&requests.some(r=>r.id===g.id&&r.kind==='guide')&&s.mail[g.id]?.status==='accepted'&&guestPoint(g.p)){
   s.guest={id:g.id,p:guestPoint(g.p),route:[]};
   if(Array.isArray(g.route)){const route=g.route.slice(0,256).map(guestPoint);if(route.every(Boolean))s.guest.route=route;}
  }
  return s;
 }
 const state=()=>oceanFeatures.state('expedition');
 const unlocked=(r,s=state())=>!r.after||s.mail[r.after]?.status==='complete';
 function unlockedOutfit(s,id){return id==='blue'||requests.some(r=>r.outfit===id&&s.mail[r.id]?.status==='complete')}
 let guestHUD,lastGuestHUD=-Infinity,guestBatch,guestNode={p:[0,-1000,0],s:[.83,.83,.83],yaw:0,pitch:0,phase:0,tint:[1.9,1.3,.70]},lastTime=null,lastHud=0;
 function accept(id){const r=requests.find(r=>r.id===id),s=state();if(active||!r||!unlocked(r)||s.mail[id])return false;if(r.kind==='guide'&&requests.some(q=>q.kind==='guide'&&['accepted','ready'].includes(s.mail[q.id]?.status))){toast('先完成或取消目前的帶路委託。');return false;}s.mail[id]={status:'accepted',acceptedAt:Date.now(),progress:0,visited:false,photoDate:0,read:true};saveVoyage();toast(r.kind==='guide'?'訪客已在船上等候，下一次下水會與你同行。':'已接下攝影委託；拍攝後回船選片投稿。');return true;}
 function cancel(id){const s=state();if(active||!s.mail[id]||s.mail[id].status==='complete')return false;delete s.mail[id];if(s.guest?.id===id)s.guest=null;saveVoyage();return true;}
 function matchingPhotos(r){return persistent.photos.filter(p=>p.species===SPECIES.find(sp=>sp.id===r.species)?.name&&p.grade>=r.minimum&&p.individual&&/^data:image\/jpeg;base64,/.test(p.url));}
 async function submitPhoto(id,date){const r=requests.find(r=>r.id===id),s=state(),m=s.mail[id];if(active||!r||r.kind!=='photo'||!m||m.status==='complete')return false;const p=matchingPhotos(r).find(p=>p.date===date);if(!p||!await oceanPhotography.pin(p.date))return false;if(state()!==s||s.mail[id]!==m||m.status==='complete')return false;m.photoDate=p.date;m.status='complete';saveVoyage();toast('投稿已收件 · 解鎖 '+r.reward);return true;}
 function collectReward(id){const r=requests.find(r=>r.id===id),m=state().mail[id];if(active||!r||r.kind!=='guide'||m?.status!=='ready')return false;m.status='complete';saveVoyage();toast('訪客來信 · 解鎖 '+r.reward);return true;}
 function wear(id){if(!palettes[id]||!unlockedOutfit(state(),id))return false;state().outfit=id;applyOutfit();saveVoyage();return true;}
 function applyOutfit(){if(diverBatch?.instances[0])diverBatch.instances[0].tint=palettes[state().outfit].tint.slice();renderer&&(renderer.dirty=true);}
 function clockLabel(){const s=state();return OceanSeasonRules.label(s.day)+' · '+OceanSeasonRules.clock(s.minute);}
 function applyClock(){if(!state().clockAuto)return;const hour=state().minute/60;settings.lighting=hour>=7&&hour<16?'day':hour>=16&&hour<19?'late':'blue';applyVisualSettings();renderer.dirty=true;}
 function rest(minute){if(active||!Number.isFinite(minute)||minute<0||minute>=1440)return false;const s=state(),nextDay=s.day+(minute<=s.minute?1:0);if(nextDay>OceanSeasonRules.MAX_DAY)return false;s.day=nextDay;s.minute=minute;finishRest();return true;}
 function restDays(days){if(active||!Number.isInteger(days)||days<1||days>366)return false;const s=state();if(s.day+days>OceanSeasonRules.MAX_DAY)return false;s.day+=days;s.minute=540;finishRest();return true;}
 function finishRest(){state().clockAuto=true;applyClock();oceanSeasons.sync(true);saveVoyage();persist();}
 function camera(){const c=state().camera;renderer.photoFov=voyage.photoMode?c.zoom:null;renderer.photoAperture=voyage.photoMode?c.aperture:0;renderer.photoFocus=c.focus;renderer.exposure=1.11*Math.pow(2,voyage.photoMode?c.exposure:0);if($('cameraFrame'))$('cameraFrame').querySelector('small').textContent=`PHOTO / ${Math.round(c.zoom)}° · f/${c.aperture.toFixed(1)} · ${c.focus.toFixed(1)} m · X 退出`;renderer.dirty=true;}
 function setCamera(key,value){const limits={zoom:[25,75],aperture:[1.8,16],focus:[.8,80],exposure:[-1.5,1.5]};if(!limits[key]||!Number.isFinite(value))return false;state().camera[key]=clamp(value,...limits[key]);camera();saveVoyage();return true;}
 // Old saves may contain a guest clamped underneath the current seabed. Repair
 // only at load/continue, using the same collisions as the diver; ordinary
 // frames must never relocate a stuck guest or bypass its recorded turns.
 function restoreGuest(){
  const s=state(),g=s.guest;if(!g)return;
  if(s.mail[g.id]?.status!=='accepted'){s.guest=null;return;}
  const repaired=collide(g.p.slice()),moved=V.dist(repaired,g.p)>.000001;
  if(moved)g.p=repaired;
  if(moved||g.route?.some(p=>V.dist(collide(p.slice()),p)>.000001))g.route=[];
 }
 function startDive({resume}){const s=state();lastTime=null;lastGuestHUD=-Infinity;if(!resume||!s.inDive){s.air=AIR_SECONDS;s.lowAir=false;}if(!resume||!s.guest){const r=requests.find(r=>r.kind==='guide'&&s.mail[r.id]?.status==='accepted');s.guest=r?{id:r.id,p:collide(V.add(player.p,V.mul(dir(),-3)))}:null;}else restoreGuest();s.inDive=true;applyClock();oceanSeasons.sync(true);camera();}
 function endDive(){const s=state();for(const r of requests)if(r.kind==='guide'&&s.mail[r.id]?.status==='accepted'){const m=s.mail[r.id];if(m.visited&&m.progress>=r.seconds)m.status='ready';}s.inDive=false;if(s.guest&&s.mail[s.guest.id]?.status!=='accepted')s.guest=null;guestBatch.visible=false;paintGuestHUD();}
 function tick(dt){
  if(!active||modal||photoOpen||document.hidden||(document.hasFocus&&!document.hasFocus()))return;const s=state();dt=clamp(dt,0,.5);s.minute+=dt*.25;if(s.minute>=1440){if(s.day<OceanSeasonRules.MAX_DAY){s.minute-=1440;s.day++;}else s.minute=1439.999;}if(s.clockAuto)applyClock();
  // Free exploration has no air countdown or forced return. Legacy air is retained in saves.

  const g=s.guest;if(g&&!(typeof oceanDeepsea!=='undefined'&&oceanDeepsea.isActive())){const r=requests.find(r=>r.id===g.id),m=s.mail[g.id],distance=V.dist(g.p,player.p);if(r&&m?.status==='accepted'&&distance<12){const l=LANDMARKS.find(l=>l.id===r.place);if(l&&Math.hypot(player.p[0]-l.x,player.p[2]-l.z)<(l.radius||16))m.visited=true;const f=focusFish||follow;if(f&&SPECIES[f.species]?.id===r.species&&V.dist(player.p,f.p)<20&&!blocked(g.p,f.p)){const before=m.progress;m.progress=Math.min(r.seconds,m.progress+dt);if(before<r.seconds&&m.progress>=r.seconds)radio('看見了！謝謝你停下來等我。到目的地後，我們就能一起回船。',r.from);}}}
  if(t-lastHud>.2){lastHud=t;const span=document.querySelector('.stats .dive-time>span');if(span){span.textContent='自由探索';span.style.color='';}}
 }
 // Preserve the diver's actual turns. Following a safe endpoint alone can cut
 // through a reef, especially when a deep-water current covers metres per frame.
 function guestClear(a,b,work,move=false){
  const delta=V.sub(b,a),length=V.len(delta);if(length>128)return false;
  const steps=Math.max(1,Math.ceil(length/.5));if(work.ground+steps+1>(move?384:64))return false;work.ground+=steps+1;
  if(typeof OceanRegions!=='undefined'&&OceanRegions.segmentBlocked(a,b,.4))return false;
  for(const id of reefObstacleCandidates(a,b)){
   const ob=obstacles[id],start=a.map((v,k)=>(v-ob.p[k])/(ob.s[k]+.4)),ray=delta.map((v,k)=>v/(ob.s[k]+.4)),den=V.dot(ray,ray),u=den?clamp(-V.dot(start,ray)/den,0,1):0;
   const q=V.add(start,V.mul(ray,u));if(V.dot(q,q)<1-.000001)return false;
  }
  for(let i=0;i<=steps;i++){const p=V.lerp(a,b,i/steps);if(p[1]<groundHeight(p[0],p[2])+.80)return false;}
  return true;
 }
 function recordGuestRoute(g,work){
  if(!Array.isArray(g.route))g.route=[];const p=player.p.slice(),last=g.route.at(-1);
  if(last&&V.dist(last,p)<.12)return;
  if(g.route.length>1){
   const before=g.route.at(-2),line=V.sub(p,before),den=V.dot(line,line),u=den?clamp(V.dot(V.sub(last,before),line)/den,0,1):0;
   if(V.dist(last,V.add(before,V.mul(line,u)))<.06&&guestClear(before,p,work)){g.route[g.route.length-1]=p;return;}
  }
  // A distant or corrupt path never grows without bound or discards its next
 // safe turn. Once the guest catches up, new positions can be recorded again.
  if(g.route.length<256)g.route.push(p);
 }
 function followGuest(g,dt,work){
  const route=g.route;if(!route.length)return;
  // Only remove a turn when the whole shortcut has diver clearance.
  for(let i=route.length-1,tries=0;i>0&&tries<4;i--,tries++)if(guestClear(g.p,route[i],work)){route.splice(0,i);break;}
  while(route.length>1&&V.dist(g.p,route[0])<.08)route.shift();
  const goal=route[0],delta=V.sub(goal,g.p),distance=V.len(delta),gap=route.length===1?3.4:0;
  if(distance<=gap+.02)return;
  const velocity=Array.isArray(player.velocity)&&player.velocity.every(Number.isFinite)?V.len(player.velocity):0;
  const speed=Math.min(1200,Math.max(2.3,velocity+Math.max(0,distance-gap-2)*1.8)),step=Math.min(distance-gap,dt*speed),next=V.add(g.p,V.mul(delta,step/distance));
  if(!guestClear(g.p,next,work,true))return;
  const resolved=collide(next.slice(),g.p);if(V.dist(resolved,next)>.005)return;
  g.p=resolved;guestNode.yaw=-Math.atan2(delta[0],-delta[2]);guestNode.pitch=-Math.atan2(delta[1],Math.hypot(delta[0],delta[2]));
 }
 function afterLife(time){
  oceanSeasons.sync();if(!guestBatch)return;const s=state();guestBatch.visible=!!(active&&s.inDive&&s.guest);
  const elapsed=Number.isFinite(time)&&Number.isFinite(lastTime)?time-lastTime:0;lastTime=Number.isFinite(time)?time:null;
  if(!guestBatch.visible)return;
  const g=s.guest;guestNode.p=g.p.slice();
  if(modal||photoOpen||document.hidden||(document.hasFocus&&!document.hasFocus()))return;
  const work={ground:0};recordGuestRoute(g,work);if(elapsed>0)followGuest(g,Math.min(elapsed,.1),work);
  guestNode.p=g.p.slice();guestNode.phase=Number.isFinite(time)?time:0;
 }

 function paintGuestHUD(){
  if(!guestHUD)return;const s=state(),g=s.guest;guestHUD.hidden=!active||!s.inDive||!g||!!modal||photoOpen||!!voyage.photoMode;
  if(guestHUD.hidden){lastGuestHUD=-Infinity;return;}if(t-lastGuestHUD<.25)return;lastGuestHUD=t;
  const request=requests.find(r=>r.id===g.id),name=request?.from.split(' · ')[0]||'訪客',distance=V.dist(g.p,player.p),text=(distance<12?name+'同行':'請等'+name)+' · '+Math.ceil(distance).toLocaleString()+' m';
  if(guestHUD.textContent!==text)guestHUD.textContent=text;
 }
 function renderMail(){const s=state();panelTitle('SHIP MAIL / RESEARCH REQUESTS','船上信箱');$('panelBody').innerHTML=`<p class="panel-note">${clockLabel()} · 收信、接下委託，再帶著照片與故事回船。${active?'下水時可閱讀；接件與交件請回船。':''}</p>`+requests.filter(r=>unlocked(r)).map(r=>{const m=s.mail[r.id],status=!m?'新來信':m.status==='complete'?'已完成':m.status==='ready'?'等候領取':'進行中';return `<article class="feature-section"><span class="feature-badge">${status} · ${r.kind==='photo'?'攝影投稿':'帶路委託'}</span><h3>${safe(r.title)}</h3><p>${safe(r.body)}</p><p class="feature-muted">${safe(r.from)}<br>紀念：${safe(r.reward)}</p>${r.kind==='photo'?`<p>目標：${safe(SPECIES.find(s=>s.id===r.species).name)} · ${r.minimum} 分以上</p>`:`<p>目的地：${safe(LANDMARKS.find(l=>l.id===r.place).name)} · ${m?.visited?'已抵達':'待抵達'}<br>共同觀察：${(m?.progress||0).toFixed(1)} / ${r.seconds} 秒</p>`}<div class="feature-toolbar">${!m?`<button class="primary" data-accept="${r.id}" ${active?'disabled':''}>接下委託</button>`:m.status==='ready'?`<button class="primary" data-reward="${r.id}" ${active?'disabled':''}>閱讀感謝信與領取紀念</button>`:m.status==='accepted'?`<button class="muted-btn" data-cancel="${r.id}" ${active?'disabled':''}>取消這封委託</button>`:''}${r.place?`<button class="muted-btn" data-destination="${r.place}">標記目的地</button>`:''}</div>${r.kind==='photo'&&m?.status==='complete'?(()=>{const p=persistent.photos.find(p=>p.date===m.photoDate);return p?`<button class="muted-btn" data-mail-attachment="${p.date}">檢視已投稿照片 ↗</button>`:'<p class="feature-muted">這份舊存檔未保留投稿附件。</p>';})():''}${r.kind==='photo'&&m&&m.status!=='complete'?`<div class="mail-photo-list">${matchingPhotos(r).map(p=>`<button data-submit="${r.id}" data-date="${p.date}" ${active?'disabled':''}><img src="${p.url}" alt="可投稿的${safe(p.species)}照片"><span>${p.grade} 分 · 投稿這張</span></button>`).join('')||'<p class="feature-muted">相簿尚無符合條件的照片。</p>'}</div>`:''}</article>`}).join('');
  for(const [selector,action]of [['accept',accept],['reward',collectReward],['cancel',cancel]])$('panelBody').querySelectorAll('[data-'+selector+']').forEach(b=>b.onclick=()=>{action(b.dataset[selector]);renderMail()});$('panelBody').querySelectorAll('[data-mail-attachment]').forEach(b=>b.onclick=()=>{const p=persistent.photos.find(p=>p.date===+b.dataset.mailAttachment);if(p)viewPhoto(p)});$('panelBody').querySelectorAll('[data-submit]').forEach(b=>b.onclick=async()=>{b.disabled=true;await submitPhoto(b.dataset.submit,+b.dataset.date);if(modal==='mail')renderMail()});$('panelBody').querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>markPlace(b.dataset.destination));
 }
 function renderResearch(){const s=state();panelTitle('RESEARCH DESK / CABIN','研究船工作桌');const guest=s.guest&&requests.find(r=>r.id===s.guest.id);$('panelBody').innerHTML=`<p class="panel-note">${clockLabel()}</p><section class="feature-section"><h3>下一次下水</h3><p>整片海自由游動，沒有氣量倒數，也不必移船。</p><p>${active?`目前氣量 ${Math.ceil(s.air/AIR_SECONDS*100)}%`:'氣瓶已準備好。'}${guest?`<br>${safe(guest.from)} · 距離 ${V.dist(s.guest.p,player.p).toFixed(1)} m`:''}</p><div class="feature-toolbar"><button class="muted-btn" data-rest="540" ${active?'disabled':''}>休息到早晨</button><button class="muted-btn" data-rest="1050" ${active?'disabled':''}>等待夕照</button><button class="muted-btn" data-rest="1290" ${active?'disabled':''}>準備夜潛</button></div><label class="setting-row"><span>隨航程時間改變光照</span><input id="expClock" type="checkbox" ${s.clockAuto?'checked':''}></label></section>${oceanSeasons.panelHTML()}<section class="feature-section"><h3>你的潛水衣</h3><p>完成信箱委託可獲得新配色。切換第三人稱可看見穿著。</p><div class="feature-toolbar">${Object.entries(palettes).map(([id,p])=>`<button class="muted-btn" data-outfit="${id}" ${!unlockedOutfit(s,id)?'disabled':''}>${s.outfit===id?'✓ ':''}${p.name}${unlockedOutfit(s,id)?'':' · 未解鎖'}</button>`).join('')}</div></section><button id="researchMail" class="primary">打開船上信箱 ↗</button>`;$('panelBody').querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>{rest(+b.dataset.rest);renderResearch()});$('panelBody').querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{wear(b.dataset.outfit);renderResearch()});$('expClock').onchange=e=>{s.clockAuto=e.target.checked;applyClock();saveVoyage()};$('researchMail').onclick=()=>oceanFeatures.open('mail');oceanSeasons.bindPanel();
 }
 function renderCamera(){const c=state().camera;panelTitle('CAMERA / OPTICS','水下相機');$('panelBody').innerHTML=`<p class="panel-note">調整視角、光圈與對焦距離。小光圈讓不同距離的景物清楚，大光圈讓焦點前後柔化。曝光補償改變相片亮度。</p>${[['zoom','視角','25','75','1','°'],['aperture','光圈','1.8','16','.2',''],['focus','對焦距離','.8','80','.2',' m'],['exposure','曝光補償','-1.5','1.5','.1',' EV']].map(([id,label,min,max,step,suffix])=>`<label class="setting-row"><span>${label}<small id="camera-${id}-value">${c[id].toFixed(1)}${suffix}</small></span><input id="camera-${id}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${c[id]}"></label>`).join('')}<div class="feature-toolbar"><button id="cameraAutofocus" class="muted-btn" ${!active?'disabled':''}>對焦目前觀察對象</button><button id="cameraEnter" class="primary" ${!active?'disabled':''}>回到海中取景 ↗</button></div>`;for(const key of ['zoom','aperture','focus','exposure'])$('camera-'+key).oninput=e=>{setCamera(key,+e.target.value);$('camera-'+key+'-value').textContent=(+e.target.value).toFixed(1)};$('cameraAutofocus').onclick=()=>{const f=focusFish||follow;if(!f){toast('先觀察畫面中的一隻生物。');return;}setCamera('focus',V.dist(eye,f.p));renderCamera()};$('cameraEnter').onclick=()=>{closePanel();if(!voyage.photoMode)togglePhotoMode();camera()};}
 function init(){
  restoreGuest();guestHUD=document.createElement('div');guestHUD.id='guestEscortStatus';guestHUD.hidden=true;guestHUD.setAttribute('aria-label','同行訪客');$('hud').append(guestHUD);
  const guestStyle=document.createElement('style');guestStyle.textContent='#guestEscortStatus{position:absolute;right:var(--hud-edge);bottom:calc(var(--hud-bottom) + 82px);max-width:170px;padding:6px 9px;border-radius:6px;background:#082a34c9;color:#d9e6d7;font-size:11px;line-height:1.5;pointer-events:none}#guestEscortStatus[hidden]{display:none}@media(pointer:coarse){#guestEscortStatus{bottom:calc(var(--hud-bottom) + 62px);max-width:150px;font-size:10px;padding:5px 8px}}';document.head.append(guestStyle);
  guestBatch=renderer.batch(diverGeometry(),[guestNode],5,true);guestBatch.visible=false;guestBatch.maxDistance=90;const style=document.createElement('style');style.textContent='.mail-photo-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.mail-photo-list button{padding:0;overflow:hidden;background:#0b2c38;border:1px solid #c4dace33;border-radius:8px;color:#dcebdd;text-align:left}.mail-photo-list img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}.mail-photo-list span{display:block;padding:10px;font-size:12px}.feature-section button:disabled{opacity:.42;cursor:default}@media(pointer:coarse){.stats .dive-time>span{display:block;font-size:8px;letter-spacing:0}}';document.head.append(style);for(const [id,label,panel]of [['mail','船上信箱','mail'],['research','船艙與換裝','research'],['camera','相機設定','camera']])oceanFeatures.addMenu({id,label,panel});const oldToggle=togglePhotoMode;togglePhotoMode=function(){oldToggle();camera()};applyOutfit();oceanSeasons.sync(true);}
 const system={id:'expedition',retainPhotos(dates){for(const r of requests){const m=state().mail[r.id];if(r.kind==='photo'&&m?.status==='complete'&&m.photoDate>0)dates.push(m.photoDate);}},initial,sanitize,init,startDive,endDive,tick,afterLife,paintHUD:paintGuestHUD,photoMetadata(photo){photo.camera={mode:voyage.photoMode?'lens':'normal',zoom:renderer.photoFov||renderer.fov||69,aperture:renderer.photoAperture||0,focus:renderer.photoAperture?renderer.photoFocus:0,exposure:voyage.photoMode?state().camera.exposure:0}},reset(){restoreGuest();guestBatch.visible=false;lastTime=null;lastGuestHUD=-Infinity;paintGuestHUD();oceanSeasons.sync(true);applyOutfit();camera()},renderPanel(type){if(type==='mail')renderMail();else if(type==='research')renderResearch();else if(type==='camera')renderCamera();else return false;return true;}};
 oceanFeatures.register(system);
 return {requests,initial,sanitize,accept,cancel,submitPhoto,collectReward,wear,rest,restDays,setCamera,clockLabel,get airSeconds(){return AIR_SECONDS}};
})();
