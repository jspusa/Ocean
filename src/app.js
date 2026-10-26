/* Application, input, local journal, photographs and original 3D field-guide renders. */
const STORE_KEY='return-blue.shilang.v1';
let followDistance=2.8,followViewAngle=0,cameraCut=true,cameraFollowLength=6.3,lastCameraThird=null;
const defaults={quality:matchMedia('(pointer:coarse)').matches?1:2,speed:1.15,sensitivity:.85,sound:false,hints:true,third:false,fov:69,lookLock:false,master:.72,music:.57,ambience:.65,breath:.80,lighting:'day',clarity:.88,lamp:false,startWithSound:true,adaptive:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
function uniquePhotos(photos){const seen=new Set();return photos.filter(p=>{if(!p||!Number.isFinite(p.date)||p.date<=0||seen.has(p.date))return false;seen.add(p.date);return true;});}
function nextPhotoDate(){return oceanPhotography.nextDate();}
let persistent={seen:[],photos:[],log:[],settings:{...defaults}},storageOK=true;
const journalStorage={loaded:false,source:null,recovered:false,error:null};
function readJournal(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('日誌資料格式無法讀取');
 if(raw.schema!==undefined&&raw.schema!==1)throw new Error('日誌版本不相容');
 if(!['seen','photos','log','settings'].some(key=>Object.hasOwn(raw,key)))throw new Error('日誌缺少可讀取的紀錄');
 for(const key of ['seen','photos','log'])if(raw[key]!==undefined&&!Array.isArray(raw[key]))throw new Error('日誌紀錄格式無法讀取');
 if(raw.settings!==undefined&&(!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)))throw new Error('日誌設定格式無法讀取');
 const journal={seen:[],photos:[],log:[],settings:{...defaults}};
 journal.seen=Array.isArray(raw.seen)?raw.seen.filter(x=>SPECIES.some(s=>s.id===x)):[];
 journal.photos=Array.isArray(raw.photos)?uniquePhotos(raw.photos.map(p=>{
  if(!p||typeof p!=='object'||Array.isArray(p))return null;
  const metadata=PhotographyRules.metadata(p);if(!metadata)return null;
  if(p.url!==undefined){try{PhotographyRules.jpegBlob(p.url);}catch(_){return null;}}
  return {...metadata,...(p.url===undefined?{}:{url:p.url})};
 })).slice(-PhotographyRules.limits.album):[];
 journal.log=Array.isArray(raw.log)?raw.log.filter(e=>e&&typeof e.text==='string'&&Number.isFinite(e.date)).slice(-60).map(e=>({text:e.text.slice(0,250),date:e.date})):[];
 for(let k of ['quality','speed','sensitivity'])if(Number.isFinite(raw.settings?.[k]))journal.settings[k]=clamp(raw.settings[k],k==='quality'?0:.4,k==='quality'?2:2.4);
 for(let k of ['master','music','ambience','breath'])if(Number.isFinite(raw.settings?.[k]))journal.settings[k]=clamp(raw.settings[k],0,1);
 for(const [key,min,max] of [['clarity',.5,1.5],['fov',55,90]])if(Number.isFinite(raw.settings?.[key]))journal.settings[key]=clamp(raw.settings[key],min,max);
 if(['day','late','blue'].includes(raw.settings?.lighting))journal.settings.lighting=raw.settings.lighting;
 for(let k of ['hints','third','reduced','lamp','adaptive','startWithSound','lookLock'])if(typeof raw.settings?.[k]==='boolean')journal.settings[k]=raw.settings[k];
 return journal;
}
function applyJournal(raw,source='import'){
 const journal=readJournal(raw);
 persistent.seen=journal.seen;persistent.photos=journal.photos.filter(p=>typeof p.url==='string').slice(-8);persistent.log=journal.log;Object.assign(settings,journal.settings);
 Object.assign(journalStorage,{loaded:true,source,recovered:source==='backup',error:null});storageOK=true;
 return journal;
}
function loadJournal(){
 let failure=null;
 for(const [key,source]of [[STORE_KEY,'primary'],[STORE_KEY+'.backup','backup']]){
  try{const raw=localStorage.getItem(key);if(raw===null)continue;applyJournal(JSON.parse(raw),source);return journalStorage;}
  catch(error){failure=error;}
 }
 if(failure){Object.assign(journalStorage,{loaded:false,source:'unavailable',recovered:false,error:failure.message});storageOK=false;}
 else applyJournal({seen:[],photos:[],log:[],settings:{}},'new');
 return journalStorage;
}

const settings=persistent.settings;settings.sound=false;
// The recovery action is a one-launch hint, including when storage is full.
function applyRecoveryGraphics(){const launchURL=new URL(location.href);if(launchURL.searchParams.has('safeGraphics')){settings.quality=0;settings.adaptive=true;launchURL.searchParams.delete('safeGraphics');history.replaceState(null,'',launchURL);}}
// Version updates preserve each player's camera and quality preferences.
let renderer,ready=false,active=false,modal=null,photoOpen=false,prevFocus=null,photoPrevFocus=null,t=0,lastTime=0,diveSeconds=0,frameCount=0,frameSum=0,perfSeconds=0,auto=false,autoT=0,follow=null,focusFish=null,focusSeconds=0,focusId=null,toastTimer=null,landmarkTimer=null,visited=new Set(),soundCtx=null,soundGain=null,eye=[0,-7.3,13.5],target=[0,-7,0];
const player={p:[0,-7.3,13.5],yaw:-.04,pitch:-.13,velocity:[0,0,0]},keys=new Set();
let selectedEntry=8,lookStick=[0,0],inputCleanup=[],stick=[0,0],verticalInput=0,lastArea=0,selectedPhoto=null,quizAnswer=null,quizIndex=0,quizScore=0;
let collisionNotice=0,saveWarned=false,animatedPanelTime=0,lastPhoto=0,welcomeTransition=null;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText=n=>new Date(n).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const timeText=n=>Math.floor(n/60).toString().padStart(2,'0')+':'+Math.floor(n%60).toString().padStart(2,'0');
function toast(s){clearTimeout(toastTimer);$('toast').textContent=s;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function persist(){
 try{
  if(typeof oceanSaveHealth!=='undefined'&&!oceanSaveHealth.readable())throw new Error('航程或日誌尚未安全讀取，請先還原備份');
  if(!journalStorage.loaded)throw new Error(journalStorage.error||'日誌尚未安全讀取，請先還原備份');
  oceanSaveGuard.check();const value=JSON.stringify(oceanPhotography.journalSnapshot(persistent));let old=localStorage.getItem(STORE_KEY);
  if(old!==null){try{readJournal(JSON.parse(old));}catch(_){old=null;}}
  // Only a readable primary may replace the fallback. A full optional backup
  // must not prevent Storage.setItem from preserving the latest primary.
  if(old!==null){try{oceanSaveGuard.write(STORE_KEY+'.backup',old);}catch(_){}}
  oceanSaveGuard.write(STORE_KEY,value);storageOK=true;journalStorage.error=null;saveWarned=false;return true;
 }catch(error){storageOK=false;journalStorage.error=error.message;if(!saveWarned&&active){saveWarned=true;toast('此視窗無法保存更多資料；請下載照片或匯出日誌。');}return false;}
 finally{if(typeof oceanSaveHealth!=='undefined')oceanSaveHealth.refresh();}
}
function log(text){persistent.log.push({text,date:Date.now()});persistent.log=persistent.log.slice(-60);persist();}
function setCount(){$('seenCount').textContent=persistent.seen.length+'/'+SPECIES.length;}
function resetInput(){cameraCut=true;simulationAccumulator=0;previousPhysicsPosition=null;keys.clear();stick=[0,0];lookStick=[0,0];verticalInput=0;inputCleanup.forEach(f=>f());if($('lookKnob'))$('lookKnob').style.transform='translate(0,0)';player.velocity=[0,0,0];$('stickKnob').style.transform='translate(0,0)';}
function handleFailure(e,{contextLost=false,saved=false}={}){
 console.error(e);const assetFailure=!contextLost&&e?.code==='OCEAN_ASSET_UNAVAILABLE';
 $('loading').classList.add('hidden');$('errorBox').classList.remove('hidden');
 $('errorTitle').textContent=contextLost?'顯示暫時中斷':assetFailure?'海洋素材未能載入':'這個視窗無法啟動 3D';
 $('errorMessage').textContent=contextLost?(saved?'航程已保存。可以先匯出備份，再以省電畫質重新啟動。':'航程尚未完整保存。請先匯出備份，再重新啟動。'):assetFailure?'部分素材未能完整下載或讀取。請確認網路連線，再按「重新嘗試」。':(e?.message||String(e));
 $('errorExportSave').hidden=!contextLost;$(assetFailure?'errorRetry':'errorSafeRestart').focus();
}
function restartLowPower(){const url=new URL(location.href);url.searchParams.set('safeGraphics','1');location.assign(url.href);}
async function exportRecoverySave(){
 const button=$('errorExportSave'),status=$('errorRecoveryStatus');button.disabled=true;status.textContent='正在整理航程與照片備份…';
 try{status.textContent=await exportSave()?'備份下載已建立，請確認檔案已儲存。':'完整備份未能匯出。請保留此視窗，稍後再試；目前進度尚未被替換。';}
 finally{button.disabled=false;}
}
function collide(pos,from=null){
 const bounds=OceanTrench.worldBounds;
 pos[0]=clamp(pos[0],bounds.left+.5,bounds.right-.5);pos[2]=clamp(pos[2],bounds.top+.5,bounds.bottom-.5);
 pos[1]=clamp(pos[1],groundHeight(pos[0],pos[2])+.82,-.65);
 let nearby=reefObstacleCandidates(pos);
 for(let n=0;n<nearby.length;n++){const id=nearby[n],ob=obstacles[id],sx=ob.s[0]+.4,sy=ob.s[1]+.4,sz=ob.s[2]+.4;let qx=(pos[0]-ob.p[0])/sx,qy=(pos[1]-ob.p[1])/sy,qz=(pos[2]-ob.p[2])/sz,d2=qx*qx+qy*qy+qz*qz;
  if(d2<1){if(d2<.0001)pos[1]=ob.p[1]+sy;else{const k=1/Math.sqrt(d2);pos[0]=ob.p[0]+qx*k*sx;pos[1]=ob.p[1]+qy*k*sy;pos[2]=ob.p[2]+qz*k*sz;}
   // A push can enter another cell. Preserve the original one-pass order:
   // discover later obstacles at the new position, never revisit earlier ones.
   nearby=reefObstacleCandidates(pos,pos,id);n=-1;
  }}
 pos[1]=clamp(pos[1],groundHeight(pos[0],pos[2])+.82,-.65);if(typeof OceanRegions!=='undefined')OceanRegions.resolve(pos,.4,from);return pos;
}
function reefObstacleCandidates(a,b=a,after=-1){
 // Scene-owned reef obstacles are immutable during play; boat movement changes
 // render batches, not these rocks. Length changes rebuild after load/generation.
 // Future same-length edits must call invalidate() before the next query.
 let cache=reefObstacleCandidates.cache;
 if(!cache||cache.count!==obstacles.length){
  const tiles=new Map(),bounds=[],ids=[];
  for(let i=0;i<obstacles.length;i++){
   // Expand slightly beyond the largest clearance to cover rounding at cell edges.
   const ob=obstacles[i],p=ob.p,s=ob.s,lo=p.map((v,k)=>v-s[k]-.40000001),hi=p.map((v,k)=>v+s[k]+.40000001);
   bounds.push({lo,hi});ids.push(i);
   for(let x=Math.floor(lo[0]/16);x<=Math.floor(hi[0]/16);x++)for(let y=Math.floor(lo[1]/16);y<=Math.floor(hi[1]/16);y++)for(let z=Math.floor(lo[2]/16);z<=Math.floor(hi[2]/16);z++){
    const key=x+','+y+','+z;if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(i);
   }
  }
  cache=reefObstacleCandidates.cache={count:obstacles.length,tiles,bounds,ids};
 }
 const lo=a.map((v,k)=>Math.min(v,b[k])),hi=a.map((v,k)=>Math.max(v,b[k]));
 if(!lo.every(Number.isFinite)||!hi.every(Number.isFinite))return cache.ids.filter(i=>i>after);
 const start=lo.map(v=>Math.floor(v/16)),end=hi.map(v=>Math.floor(v/16));
 let ids;
 // Huge chart/observation rays must not walk thousands of empty grid cells.
 if((end[0]-start[0]+1)*(end[1]-start[1]+1)*(end[2]-start[2]+1)>512)ids=cache.ids;
 else{
  const found=new Set();for(let x=start[0];x<=end[0];x++)for(let y=start[1];y<=end[1];y++)for(let z=start[2];z<=end[2];z++)for(const id of cache.tiles.get(x+','+y+','+z)||[])found.add(id);
  ids=Array.from(found).sort((x,y)=>x-y);
 }
 return ids.filter(i=>i>after&&cache.bounds[i].lo.every((v,k)=>v<=hi[k]&&cache.bounds[i].hi[k]>=lo[k]));
}
reefObstacleCandidates.invalidate=()=>{reefObstacleCandidates.cache=null;};
function dir(){return [Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)];}
function startDive(tour=false){if(!ready)return;oceanSwimActions.exit();oceanPerf.pause();oceanPerf.count=0;oceanPerf.cursor=0;
 // AudioContext is resumed directly by this user gesture, before any async work.
 settings.sound=$('welcomeAudio').checked;settings.startWithSound=settings.sound;
 if(settings.sound)oceanAudio.start().catch(e=>toast(e.message));
 closePanel();oceanSelection.clear();photoOpen=false;active=true;visited=new Set();diveSeconds=0;resetInput();
 const entry=LANDMARKS[selectedEntry];player.p=collide(entry.spawn.slice());player.yaw=entry.yaw;player.pitch=entry.pitch;
 auto=tour;follow=null;autoT=nearestPathIndex();setAutoUI();
 clearTimeout(welcomeTransition);$('welcome').classList.add('leaving');welcomeTransition=setTimeout(()=>{welcomeTransition=null;if(active)$('welcome').classList.add('hidden');},650);$('hud').classList.remove('hidden');
 document.body.classList.remove('cinematic');log('開始漫遊 · '+oceanNavigation.current().name+'（概念場景）');setCount();updateSoundUI();persist();
 $('ocean').focus({preventScroll:true});
 if(tour)toast('自動漫遊中；移動或拖曳即可接手。');else toast(matchMedia('(pointer:coarse)').matches?'左搖桿游動 · 拖曳環視 · 點一下生物觀察':'WASD 游動 · 拖曳環視 · 點一下附近的生物觀察');
}
function goHome(){oceanSwimActions.exit();clearTimeout(welcomeTransition);welcomeTransition=null;releaseMouseLook();oceanPerf.benchmark=null;oceanPerf.pause();oceanPerf.visible=false;$('perfPanel')?.classList.add('hidden');if(active&&diveSeconds>3)log('結束漫遊 · '+timeText(diveSeconds));active=false;auto=false;follow=null;oceanSelection.clear();oceanDiveUI.sync();resetInput();closePanel();$('hud').classList.add('hidden');$('welcome').classList.remove('hidden','leaving');document.body.classList.remove('cinematic');oceanAudio.mute();settings.sound=false;updateSoundUI();persist();}
function setAutoUI(){$('autoBtn').classList.toggle('active',auto);$('autoBtn').querySelector('span').textContent=auto?'接手探索':'自動漫遊';$('modeName').textContent=auto?(follow?'跟隨觀察':'自動漫遊'):'自由探索';}
function stopAuto(){if(auto){auto=false;follow=null;setAutoUI();}}
function jumpTo(index){oceanSwimActions.exit();let l=LANDMARKS[index];if(!active){selectedEntry=index;closePanel();startDive(false);return;}player.p=l.spawn.slice();player.yaw=l.yaw;player.pitch=l.pitch;resetInput();stopAuto();closePanel();$('flash').classList.add('on');setTimeout(()=>$('flash').classList.remove('on'),45);toast('已移至「'+l.name+'」· 遊戲示意位置');}
function viewingOffset(fish){let a=fish.yaw+followViewAngle,side=[Math.sin(a),0,Math.cos(a)],f=[Math.cos(a),0,-Math.sin(a)];return V.add(V.mul(side,followDistance),V.add(V.mul(f,followDistance*.12),[0,followDistance*.17,0]));}
// Choose once on entering observation; do not oscillate the camera every frame.
// Prefer a clear side-view instead of spawning the eye inside a neighbouring fish.
function chooseObservationSide(fish){let best=0,bestScore=Infinity;
 for(const angle of [0,Math.PI,.55,-.55,Math.PI-.55,Math.PI+.55,1.05,-1.05]){
  followViewAngle=angle;const camera=V.add(fish.p,viewingOffset(fish));let score=Math.abs(Math.sin(angle))*.09;
  if(camera[1]<groundHeight(camera[0],camera[2])+.45||blocked(camera,fish.p))score+=40;
  for(const other of life){if(other===fish)continue;const r=Math.max(...other.s)*.61+.15,d=V.dist(camera,other.p);if(d<r+.40)score+=Math.pow(r+.40-d,2)*25;
   const ab=V.sub(fish.p,camera),d2=V.dot(ab,ab),u=clamp(V.dot(V.sub(other.p,camera),ab)/Math.max(.0001,d2),0,1);
   if(u>.02&&u<.94){const off=V.dist(other.p,V.add(camera,V.mul(ab,u)));if(off<r)score+=(r-off)*8;}
  }
  if(score<bestScore){bestScore=score;best=angle;}
 }
 followViewAngle=best;
}
function findSpecies(index,specific=null){const fish=specific||life.find(x=>x.species===index);if(!fish||fish.ecologyPresent===false||!active)return;
 followDistance=speciesTraits(index).viewDistance;
 chooseObservationSide(fish);player.p=V.add(fish.p,viewingOffset(fish));collide(player.p);let v=V.sub(fish.p,player.p);player.yaw=Math.atan2(v[0],-v[2]);player.pitch=Math.atan2(v[1],Math.hypot(v[0],v[2]));resetInput();auto=true;follow=fish;setAutoUI();closePanel();toast('近距離觀察「'+SPECIES[index].name+'」· 移動即可接手');}
function observeNearest(){if(!oceanSelection.atPointer())toast('把指標移到附近的生物，再點一下觀察。');}
const path=[[0,-7,23],[-6,-8,3],[-25,-9,-21],[-65,-11,-43],[-101,-13,-67],[-106,-18,-106],[-53,-25,-156],[-12,-30,-204],[15,-30,-229],[70,-28,-201],[98,-31,-158],[101,-15,-95],[55,-10,-46],[8,-8,-15],[0,-7,23]];
function nearestPathIndex(){let best=0,dist=Infinity;path.forEach((p,i)=>{let d=V.dist(p,player.p);if(d<dist){dist=d;best=i;}});return best;}
function pathAt(s){let n=path.length,q=((s%n)+n)%n,i=Math.floor(q),f=q-i,p0=path[(i-1+n)%n],p1=path[i],p2=path[(i+1)%n],p3=path[(i+2)%n];return p1.map((_,k)=>.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f));}
function lerpAngle(a,b,f){let delta=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+delta*f;}
/* Nintendo's first-game manual p.7/9 establishes these actions. The browser
 * bindings and 1.25 m surface gate are authored here, not copied Wii values.
 * Surface look changes the camera only; the saved diver never leaves the water. */
const oceanSwimActions=(()=>{
 let surface=false;
 const head=()=>[player.p[0],.35,player.p[2]];
 const nearSurface=()=>active&&player.p[1]>=-1.25&&player.p[1]<=-.3;
 function canSurface(){
  if(!nearSurface())return false;
  const a=player.p,b=head();
  if(typeof OceanRegions!=='undefined'&&(OceanRegions.segmentBlocked(a,b,.22)||OceanRegions.pointBlocked(b,.22)))return false;
  // Sweep the camera's full clearance through deck/rock ellipsoids as well.
  for(const id of reefObstacleCandidates(a,b)){const ob=obstacles[id],s=ob.s.map(n=>n+.22),q=a.map((v,i)=>(v-ob.p[i])/s[i]),d=b.map((v,i)=>(v-a[i])/s[i]),length=V.dot(d,d),u=clamp(-V.dot(q,d)/Math.max(.000001,length),0,1),near=V.add(q,V.mul(d,u));if(V.dot(near,near)<1)return false;}
  return true;
 }
 function exit(){const was=surface;surface=false;if(was){cameraCut=true;renderer.dirty=true;renderer.forceShadow=true;}return was;}
 function allowed(){return active&&!modal&&!photoOpen&&!oceanFeatures.pointerCaptured();}
 function takeControl(){
  stopAuto();follow=null;
  if(typeof oceanEcology!=='undefined'&&oceanEcology.snapshot().grabbedUID)oceanEcology.toggleRide();
  resetInput();oceanSelection.clear();
 }
 function quickTurn(){
  if(!allowed())return false;takeControl();
  player.yaw=Math.atan2(Math.sin(player.yaw+Math.PI),Math.cos(player.yaw+Math.PI));
  if(Number.isFinite(player.targetYaw))player.targetYaw=player.yaw;
  cameraCut=true;renderer.dirty=true;updateCamera();saveVoyage();return true;
 }
 function toggleSurface(){
  if(!allowed())return false;
  if(surface){exit();updateCamera();return true;}
  if(!canSurface()){toast('先游到開闊水面下 1.2 公尺內，再環視海面。');return false;}
  takeControl();surface=true;player.pitch=0;cameraCut=true;renderer.dirty=true;renderer.forceShadow=true;updateCamera();saveVoyage();
  toast('水面環視 · 拖曳或右搖桿環視；游動或 Esc 回到水下。');return true;
 }
 function holdSurface(){
  if(!surface)return false;
  const move=Math.hypot(...stick)>.04||Math.abs(verticalInput)>.04||['KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(key=>keys.has(key));
  if(move||auto||!nearSurface()){exit();return false;}
  player.velocity=[0,0,0];return true;
 }
 function camera(){
  if(!surface)return false;
  if(!canSurface()||auto||oceanFeatures.pointerCaptured()||typeof oceanEcology!=='undefined'&&oceanEcology.snapshot().grabbedUID){exit();return false;}
  eye=head();target=V.add(eye,dir());diverBatch.visible=false;lastCameraThird=false;cameraCut=false;return true;
 }
 return {canSurface,quickTurn,toggleSurface,holdSurface,camera,exit,isSurface:()=>surface};
})();
function updatePlayer(dt){if(oceanFeatures.pointerCaptured()){player.velocity=[0,0,0];return;}if(Math.hypot(...lookStick)>.04){stopAuto();player.yaw+=lookStick[0]*dt*1.05*settings.sensitivity;player.pitch=clamp(player.pitch-lookStick[1]*dt*.83*settings.sensitivity,-1.30,1.28);}
 if(typeof oceanSwimActions!=='undefined'&&oceanSwimActions.holdSurface())return;
 if(auto){const before=player.p.slice();if(follow){let desired=V.add(follow.p,viewingOffset(follow));player.p=V.lerp(player.p,desired,1-Math.exp(-dt*1.3));let d=V.sub(follow.p,player.p);player.yaw=lerpAngle(player.yaw,Math.atan2(d[0],-d[2]),1-Math.exp(-dt*1.7));player.pitch=mix(player.pitch,Math.atan2(d[1],Math.hypot(d[0],d[2])),1-Math.exp(-dt*1.7));}else{autoT+=dt*.016*settings.speed;let p=pathAt(autoT),q=pathAt(autoT+.15),d=V.sub(q,p);player.p=V.lerp(player.p,p,1-Math.exp(-dt*.9));player.yaw=lerpAngle(player.yaw,Math.atan2(d[0],-d[2]),1-Math.exp(-dt*.6));player.pitch=mix(player.pitch,clamp(Math.atan2(d[1],Math.hypot(d[0],d[2]))-.07,-.38,.25),1-Math.exp(-dt*.6));}collide(player.p,before);player.velocity=V.lerp(player.velocity,V.mul(V.sub(player.p,before),1/Math.max(.0001,dt)),1-Math.exp(-dt*4));return;}
 const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick[1],side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick[0],up=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+verticalInput;let f=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)],wish=V.add(V.mul(f,forward),V.add(V.mul(right,side),[0,up,0]));let length=V.len(wish);if(length>1)wish=V.mul(wish,1/length);let speed=2.35*settings.speed*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.75:1);let desired=V.mul(wish,speed);player.velocity=V.lerp(player.velocity,desired,1-Math.exp(-dt*(length>.01?3.3:5.3)));player.p=collide(V.add(player.p,V.mul(player.velocity,dt)),player.p);}
function updateCamera(dt=1/60,renderPosition=null){
 if(typeof oceanSwimActions!=='undefined'&&oceanSwimActions.camera())return;
 const regionSafe=(a,b)=>{
  if(typeof OceanRegions==='undefined'||!OceanRegions.segmentBlocked(a,b,.22))return b;
  let low=0,high=1;for(let i=0;i<14;i++){const mid=(low+high)*.5;if(OceanRegions.segmentBlocked(a,V.lerp(a,b,mid),.22))high=mid;else low=mid;}
  return V.lerp(a,b,Math.max(0,low-.002));
 };
 if(active){const f=dir(),pp=renderPosition||player.p,third=settings.third&&!(auto&&follow);
  if(third){const right=[Math.cos(player.yaw),0,Math.sin(player.yaw)],anchor=V.add(pp,[0,.35,0]);let desired=V.add(pp,V.add(V.mul(f,-6.3),V.add(V.mul(right,.40),[0,1.48,0])));
   if(typeof OceanRegions!=='undefined')OceanRegions.resolve(anchor,.23);
   const ab=V.sub(desired,anchor);let safeFraction=V.dist(anchor,regionSafe(anchor,desired))/Math.max(.001,V.len(ab));
   // Analytic segment/ellipsoid sweep avoids the old twelve-step snapping camera.
   for(const id of reefObstacleCandidates(anchor,desired)){const ob=obstacles[id],sx=ob.s[0]+.20,sy=ob.s[1]+.20,sz=ob.s[2]+.20,x=(anchor[0]-ob.p[0])/sx,y=(anchor[1]-ob.p[1])/sy,z=(anchor[2]-ob.p[2])/sz,dx=ab[0]/sx,dy=ab[1]/sy,dz=ab[2]/sz;
    const A=dx*dx+dy*dy+dz*dz,B=2*(x*dx+y*dy+z*dz),C=x*x+y*y+z*z-1,disc=B*B-4*A*C;
    if(A>.00001&&disc>=0&&C>0){const hit=(-B-Math.sqrt(disc))/(2*A);if(hit>0&&hit<safeFraction)safeFraction=Math.max(.14,hit-.055);}}
   for(let i=1;i<=5;i++){const q=V.lerp(anchor,desired,i/5);if(q[1]<groundHeight(q[0],q[2])+.25){safeFraction=Math.min(safeFraction,Math.max(.14,(i-1)/5));break;}}
   const wanted=safeFraction*6.3;if(cameraCut||lastCameraThird!==third)cameraFollowLength=wanted;else cameraFollowLength=mix(cameraFollowLength,wanted,1-Math.exp(-dt*(wanted<cameraFollowLength?22:4.5)));
   desired=V.lerp(anchor,desired,cameraFollowLength/6.3);desired[1]=Math.min(-.35,desired[1]);const aim=V.add(pp,V.mul(f,6.6));
   if(cameraCut||lastCameraThird!==third||V.dist(eye,desired)>12){eye=desired;target=aim;}else{const k=1-Math.exp(-dt*14);eye=V.lerp(eye,desired,k);target=V.lerp(target,aim,k);}
   eye=regionSafe(anchor,eye);
   diverBatch.visible=true;const d=diverBatch.instances[0];d.p[0]=pp[0];d.p[1]=pp[1];d.p[2]=pp[2];d.yaw=-player.yaw;d.pitch=-player.pitch;d.phase=mix(d.phase||0,-stick[0]*.09,1-Math.exp(-dt*5));
  }else{eye=pp.slice();target=auto&&follow?follow.p.slice():V.add(eye,f);diverBatch.visible=false;}
  lastCameraThird=third;cameraCut=false;
 }else{const l=LANDMARKS[selectedEntry];eye=l.spawn.slice();eye[0]+=settings.reduced?0:Math.sin(t*.032)*.5;const yaw=l.yaw+(settings.reduced?0:Math.sin(t*.019)*.026);target=V.add(eye,[Math.sin(yaw)*10,Math.sin(l.pitch)*10,-Math.cos(yaw)*10]);diverBatch.visible=false;cameraCut=true;}
}
function blocked(a,b,clearance=.13){if(typeof OceanRegions!=='undefined'&&OceanRegions.segmentBlocked(a,b,clearance))return true;let ab=V.sub(b,a),d=V.len(ab);for(const id of reefObstacleCandidates(a,b)){const o=obstacles[id];let t=clamp(V.dot(V.sub(o.p,a),ab)/(d*d),0,1),p=V.add(a,V.mul(ab,t)),q=p.map((v,i)=>(v-o.p[i])/(o.s[i]*.93));if(t>.02&&t<.98&&V.dot(q,q)<1)return true;}for(let k=1;k<6;k++){let p=V.lerp(a,b,k/6);if(p[1]<groundHeight(p[0],p[2])+clearance)return true;}return false;}
function observe(dt){
 const rc=$('reticle'),card=$('focusCard');rc.classList.remove('focusing');
 if(!active||modal||photoOpen||voyage.photoMode||document.hidden||document.body.classList.contains('cinematic')){oceanSelection.suspend();return;}
 focusFish=oceanSelection.observationTarget();oceanSelection.paint();
 if(!focusFish){focusId=null;focusSeconds=0;card.classList.add('hidden');return;}
 if(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing()){card.classList.add('hidden');return;}
 const sp=SPECIES[focusFish.species];if(focusId!==focusFish.uid){focusSeconds=0;focusId=focusFish.uid;}focusSeconds+=dt;
 const seen=persistent.seen.includes(sp.id),progress=clamp(focusSeconds/1.2,0,1);card.classList.remove('hidden');
 $('focusEyebrow').textContent=seen?'相遇已記錄':'正在觀察';$('focusName').textContent=seen?sp.name:'這位海洋訪客';$('focusInfo').textContent=seen?(sp.trench||sp.oarfish||sp.barreleye||sp.id==='frilled_shark'?'慢慢靠近，用燈光觀察或拍照。':'可以拍照，或靠近後輕輕互動。'):'保持一點距離，安靜看一會兒。';
 $('focusProgress')?.style.setProperty('--progress',progress);if(progress>=1&&!seen)oceanEcology.discover(focusFish);
}
function checkLandmarks(){const offshore=typeof DeepseaRules!=='undefined'&&DeepseaRules.areaName(player.p);if(offshore){$('areaName').textContent=offshore;return;}let nearest=0,d=Infinity;for(let i=0;i<LANDMARKS.length;i++){let l=LANDMARKS[i],dd=(Number.isFinite(l.y)?V.dist(player.p,[l.x,l.y,l.z]):Math.hypot(player.p[0]-l.x,player.p[2]-l.z));if(dd<d){d=dd;nearest=i;}if(dd<7&&!visited.has(l.id)){visited.add(l.id);$('landmarkName').textContent=l.name;$('landmarkText').textContent=l.text;const banner=$('landmarkBanner');banner.classList.remove('hidden');banner.style.animation='none';void banner.offsetWidth;banner.style.animation='';clearTimeout(landmarkTimer);landmarkTimer=setTimeout(()=>banner.classList.add('hidden'),4900);log('抵達「'+l.name+'」示意區域');}}lastArea=nearest;$('areaName').textContent=LANDMARKS[nearest].name;}
function updateHUD(){paintIndividualUI();oceanDiveUI.sync();let dep=(-player.p[1]).toFixed(-player.p[1]>=1000?0:1);$('depth').textContent=dep.padStart(4,'0');$('diveTime').textContent=timeText(diveSeconds);let deg=((player.yaw*180/Math.PI)%360+360)%360,dirs=['N','NE','E','SE','S','SW','W','NW'];$('bearing').textContent=dirs[Math.round(deg/45)%8]+' '+Math.round(deg).toString().padStart(3,'0')+'°';$('gentleHint').style.visibility=settings.hints?'visible':'hidden';if($('depthFill'))$('depthFill').style.height=clamp(-player.p[1]/(typeof oceanDeepsea!=='undefined'&&oceanDeepsea.isActive()?7500:100)*100,0,100)+'%';if($('lampBtn'))$('lampBtn').classList.toggle('active',renderer.lamp);}
function applyVisualSettings(){renderer.lighting=settings.lighting;renderer.clarity=settings.clarity;renderer.lamp=settings.lamp||active&&(player.p[1]<-45||(typeof OceanRegions!=='undefined'&&OceanRegions.coverage(player.p)>.5));renderer.fov=settings.fov;}
function releaseMouseLook(){if(document.pointerLockElement=== $('ocean'))document.exitPointerLock?.();}
function turnCamera(dx,dy){stopAuto();player.yaw+=dx*.0037*settings.sensitivity;player.pitch=clamp(player.pitch-dy*.0032*settings.sensitivity,-1.30,1.28);}
function mouseLookUnavailable(){if(!settings.lookLock)return;settings.lookLock=false;persist();toast('自由環視未獲瀏覽器允許；已恢復按住畫面拖曳。');}
async function lockMouseLook(){if(!active||modal||photoOpen||!settings.lookLock||!$('ocean').requestPointerLock)return;try{await $('ocean').requestPointerLock();}catch(_){mouseLookUnavailable();}}
let simulationAccumulator=0,previousPhysicsPosition=null,hudClock=0,observationClock=0,lastCompleteView=null,lastResizeNotice=null;
let renderDeadline=0,pendingFrameTime=0,pendingFrameCPU=0,renderMode=null,renderClock=null;
function resetRenderCadence(){renderDeadline=0;pendingFrameTime=0;pendingFrameCPU=0;simulationAccumulator=0;previousPhysicsPosition=null;}
function returnToLoadedView(){
 if(!lastCompleteView||!active)return;
 const saved=lastCompleteView,stream=renderer.sceneStream;
 oceanDeepsea.cancelTravel();stopAuto();follow=null;oceanSwimActions.exit();
 if(typeof oceanEcology!=='undefined'&&oceanEcology.snapshot().grabbedUID)oceanEcology.toggleRide();
 if(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())oceanMicrocosm.exit();
 oceanSelection.clear();resetInput();
 player.p=saved.p.slice();player.yaw=saved.yaw;player.pitch=saved.pitch;
 eye=saved.eye.slice();target=saved.target.slice();cameraFollowLength=saved.cameraFollowLength;lastCameraThird=saved.cameraThird;cameraCut=false;updateCamera(0);
 // Clearing a follow camera can reveal a cold third-person offset. Inspect
 // residency before calling update(), which would otherwise enqueue new work.
 const resident=p=>!stream||[...stream.needed(p)].every(id=>stream.meshes[id].resident);
 let firstPerson=false;
 if(!resident(eye)){
  settings.third=false;firstPerson=true;player.p=saved.eye.slice();
  const direction=V.sub(saved.target,saved.eye);player.yaw=Math.atan2(direction[0],-direction[2]);player.pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
  cameraCut=true;updateCamera(0);
 }
 applyVisualSettings();renderer.dirty=true;stream?.update(eye,false);
 toast(firstPerson?'已回到剛才視野，切為第一人稱。探索進度保留。':'已回到剛才的位置，探索進度保留。');
}
function animate(ms){
 if(!ready)return;
 // Focus/visibility handlers also reset lastTime when the browser delivered
 // no suspended RAF. Do not carry a partially scheduled frame across that cut.
 if(renderClock!==null&&renderClock!==lastTime)resetRenderCadence();renderClock=ms;
 if(window.__freeze){lastTime=ms;oceanPerf.pause();resetRenderCadence();requestAnimationFrame(animate);return;}
 const realDt=Math.max(0,(ms-lastTime)/1000);let dt=Math.min(realDt,.10);lastTime=ms;
 if(document.hidden||(document.hasFocus&&!document.hasFocus())){oceanPerf.pause();resetRenderCadence();requestAnimationFrame(animate);return;}
 pollGamepad();
 const liveFeature=!active&&!photoOpen&&oceanFeatures.shouldAnimate();
 const mode=modal||photoOpen?liveFeature?'viewer':'paused':active?'dive':'home';
 if(mode!==renderMode){resetRenderCadence();renderMode=mode;oceanPerf.pause();}
 if((modal||photoOpen)&&!liveFeature){oceanPerf.pause();resetRenderCadence();dt=0;if(!renderer.dirty){requestAnimationFrame(animate);return;}}
 const begin=performance.now();let renderPosition=null;
 if(renderer.sceneStream?.waitStarted){updateCamera(0);oceanFeatures.call('afterCamera',0);applyVisualSettings();if(!renderer.sceneStream.update(eye,false)){oceanPerf.pause();resetRenderCadence();requestAnimationFrame(animate);return;}}
 if((!modal&&!photoOpen)||liveFeature){
  t+=dt;
  if(active){diveSeconds+=Math.min(realDt,1);simulationAccumulator+=dt;let steps=0;
   while(simulationAccumulator+1e-10>=1/120&&steps<12){previousPhysicsPosition=player.p.slice();updatePlayer(1/120);simulationAccumulator=Math.max(0,simulationAccumulator-1/120);steps++;}
  }
 }
 pendingFrameTime+=dt;
 const frameInterval=1000/(active||liveFeature?60:30);
 // RAF timestamps may be rounded to 0.1 ms. A just-early display tick must
 // not become a missed frame (and a false adaptive-quality downgrade).
 // Advance the original phase even for that early tick; only a forced resize
 // well before the deadline starts a fresh interval. Diagnostics keep raw time.
 // One clock bin plus 0.025 ms covers the bounded jitter without changing
 // the frame budget; an early submission consumes its original deadline.
 const deadlineTolerance=.125;
 if(!renderer.pendingResize&&ms+deadlineTolerance<renderDeadline){pendingFrameCPU+=performance.now()-begin;requestAnimationFrame(animate);return;}
 renderDeadline=renderDeadline>ms+deadlineTolerance?ms+frameInterval:renderDeadline+Math.max(1,Math.floor((ms-renderDeadline)/frameInterval)+1)*frameInterval;
 dt=pendingFrameTime;pendingFrameTime=0;
 if((!modal&&!photoOpen)||liveFeature){
  if(active&&previousPhysicsPosition&&!cameraCut)renderPosition=V.lerp(previousPhysicsPosition,player.p,simulationAccumulator*120);
  updateLife(t);
  if(!active)oceanFeatures.call('idleTick',dt);
 }
 updateCamera(dt,renderPosition);oceanFeatures.call('afterCamera',dt);applyVisualSettings();if(renderer.render(eye,target,t)===false){oceanPerf.pause();resetRenderCadence();requestAnimationFrame(animate);return;}
 if(active){lastCompleteView={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,eye:eye.slice(),target:target.slice(),cameraFollowLength,cameraThird:lastCameraThird};if(renderer.sceneStream)renderer.sceneStream.onReturn=returnToLoadedView;}
 if(renderer.resizeFailure&&renderer.resizeFailure!==lastResizeNotice){lastResizeNotice=renderer.resizeFailure;toast('目前畫面已保留，裝置暫時無法切換解析度。可在設定選擇省電畫質。');}
 if(active&&!modal&&!photoOpen){observationClock+=dt;hudClock+=dt;if(observationClock>=1/12){observe(observationClock);voyageTick(observationClock);observationClock=0;}if(hudClock>=.12){updateHUD();checkLandmarks();hudClock=0;}}
 if(modal==='map'&&ms-animatedPanelTime>180){drawMap();animatedPanelTime=ms;}
 if(active&&!modal&&!photoOpen){oceanPerf.record(ms,performance.now()-begin+pendingFrameCPU,realDt*1000);if(ms-(window.__statsAt||0)>400){window.__statsAt=ms;const v=oceanPerf.stats();window.__oceanStats={fps:+v.fps.toFixed(1),p95FrameMs:+v.p95.toFixed(2),cpuMs:renderer.cpuRenderMs,drawCalls:renderer.drawCalls,creatures:life.length+decorLife.length+shoal.length,submittedTriangles:Math.round(renderer.submittedTriangles),submittedVertices:renderer.submittedVertices,position:player.p.slice(),seen:persistent.seen.length,quality:renderer.quality,renderScale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],audio:oceanAudio.status};}}else oceanPerf.pause();
 pendingFrameCPU=0;
 requestAnimationFrame(animate);
}
function initAudio(){return oceanAudio.start();}
function updateSoundUI(){$('soundIcon').setAttribute('d',settings.sound?'M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14':'m16 9 5 6m0-6-5 6');$('soundBtn').setAttribute('aria-label',settings.sound?'關閉配樂與音效':'開啟配樂與音效');$('soundBtn').classList.toggle('audio-active',settings.sound);if($('musicPill'))$('musicPill').classList.toggle('muted',!settings.sound);}
function toggleSound(){if(settings.sound&&oceanAudio.ctx&&oceanAudio.ctx.state!=='running'){oceanAudio.resume();return;}settings.sound=!settings.sound;if(settings.sound)initAudio().catch(e=>toast(e.message));else oceanAudio.mute();settings.startWithSound=settings.sound;$('welcomeAudio').checked=settings.sound;updateSoundUI();persist();}
function takePhoto(){if(!active||photoOpen||modal||Date.now()-lastPhoto<900)return;lastPhoto=Date.now();const area=(typeof DeepseaRules!=='undefined'&&DeepseaRules.areaName(player.p))||LANDMARKS[lastArea].name;oceanAudio.cue();updateCamera();oceanFeatures.call('afterCamera',0);if(renderer.render(eye,target,t)===false)return;let c=document.createElement('canvas'),maxWidth=1920,ratio=renderer.canvas.height/renderer.canvas.width;c.width=Math.min(maxWidth,renderer.canvas.width);c.height=Math.round(c.width*ratio);let ctx=c.getContext('2d');ctx.drawImage(renderer.canvas,0,0,c.width,c.height);let grad=ctx.createLinearGradient(0,c.height-85,0,c.height);grad.addColorStop(0,'#05263800');grad.addColorStop(1,'#052638b0');ctx.fillStyle=grad;ctx.fillRect(0,c.height-85,c.width,85);ctx.fillStyle='#d9e6d7';ctx.font=`${Math.max(12,c.width*.011)}px sans-serif`;ctx.fillText('重返蔚藍  /  '+area+' · 原創場景',22,c.height-28);ctx.font=`${Math.max(9,c.width*.0075)}px sans-serif`;ctx.fillStyle='#b5cec4';ctx.fillText('RETURN TO THE BLUE · LIVING OCEAN',22,c.height-12);let photo={url:c.toDataURL('image/jpeg',.87),date:nextPhotoDate(),area,species:(focusFish||follow)?SPECIES[(focusFish||follow).species].name:'海底風景',individual:(focusFish||follow)?.uid||null};$('flash').classList.add('on');setTimeout(()=>$('flash').classList.remove('on'),70);return photo;}
function viewPhoto(photo){if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();releaseMouseLook();selectedPhoto=photo;photoOpen=true;oceanSelection.suspend();oceanDiveUI.sync();oceanFeatures.call('photoOpened');resetInput();$('photoImage').src=photo.url;$('photoViewer').classList.remove('hidden');photoPrevFocus=document.activeElement;setTimeout(()=>{if(photoOpen)$('closePhoto').focus();},40);}
function closePhoto(){if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();$('photoViewer').classList.add('hidden');photoOpen=false;oceanDiveUI.sync();(active&&!modal?$('ocean'):photoPrevFocus)?.focus?.({preventScroll:true});}
function download(data,name){let a=document.createElement('a');a.href=data;a.download=name;document.body.append(a);a.click();a.remove();}
function exportLog(){let payload={application:'重返蔚藍',version:OPEN_WORLD.version,scene:'歸潮海域（原創、非實測）',exportedAt:new Date().toISOString(),seen:persistent.seen.map(id=>SPECIES.find(s=>s.id===id)?.name),log:persistent.log,notice:'所有觀察均為遊戲紀錄，不是實地潛水日誌或生物出現紀錄。'};let url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));download(url,'重返蔚藍-遊戲日誌.json');setTimeout(()=>URL.revokeObjectURL(url),5000);}
function openPanel(type){if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();oceanDiveUI.restoreControls();releaseMouseLook();if(!modal)prevFocus=document.activeElement;modal=type;oceanSelection.suspend();oceanDiveUI.sync();oceanFeatures.call('panelChanged',type);resetInput();$('scrim').classList.remove('hidden');$('panel').classList.remove('hidden');$('panelBody').scrollTop=0;document.body.classList.remove('cinematic');if(type==='journal')renderJournal('species');else if(type==='map')renderMap();else if(type==='settings')renderSettings();else if(!oceanFeatures.renderPanel(type))renderAbout();setTimeout(()=>{if(modal===type&&!photoOpen&&!$('panel').contains(document.activeElement))$('closePanel').focus();},40);}
function closePanel(){if(!modal)return;if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();oceanDiveUI.restoreControls();modal=null;oceanDiveUI.sync();oceanFeatures.call('panelClosed');$('scrim').classList.add('hidden');$('panel').classList.add('hidden');resetInput();(active&&!photoOpen?$('ocean'):prevFocus)?.focus?.({preventScroll:true});}
function panelTitle(k,t){$('panelKicker').textContent=k;$('panelTitle').textContent=t;}
function renderJournal(tab='species'){panelTitle('YOUR OCEAN JOURNAL','海洋圖鑑');let head=`<div class="tabs"><button data-tab="species" class="${tab==='species'?'selected':''}">圖鑑 ${persistent.seen.length}/${SPECIES.length}</button><button data-tab="photos" class="${tab==='photos'?'selected':''}">相簿 ${persistent.photos.length}</button><button data-tab="log" class="${tab==='log'?'selected':''}">遊戲日誌</button><button data-tab="quiz" class="${tab==='quiz'?'selected':''}">認圖</button></div>`;let body='';if(tab==='species'){body='<p class="panel-note">'+SPECIES.length+' 類海洋訪客，等待與你相遇。點一下附近的生物，再安靜觀察，收藏屬於你的相遇筆記。</p><div class="species-grid">'+SPECIES.map((s,i)=>`<button class="species-card ${persistent.seen.includes(s.id)?'':'unseen'}" data-species="${i}"><img src="${s.thumb}" alt="${s.name}的原創辨識示意"><span class="seen-badge">${persistent.seen.includes(s.id)?'已觀察':'待相遇'}</span><div><b>${s.name}</b><small>${s.en}</small></div></button>`).join('')+'</div>';}
 else if(tab==='photos'){body='<p class="panel-note">沖印後的遊戲照片收藏在相簿；已投稿附件會保留。點照片可放大與另存。'+(storageOK?'僅保存在這個瀏覽器，清除網站資料會一併移除。':'目前無法持久保存，請另存需要的照片。')+'</p>';body+=persistent.photos.length?'<div class="photo-grid">'+persistent.photos.map((p,i)=>`<button class="photo-thumb" data-photo="${i}"><img src="${p.url}" alt="遊戲照片：${safe(p.species)}"><small>${safe(p.area)} · ${dateText(p.date)}</small></button>`).reverse().join('')+'</div>':'<div class="empty">還沒有照片。<br>回到海裡，按下相機留下第一張。</div>';}
 else if(tab==='log'){body='<p class="panel-note">這是遊戲紀錄，不是真實潛水日誌或生物分布資料。</p><button class="muted-btn" id="exportBtn">匯出 JSON 日誌 ↗</button>'+persistent.log.slice().reverse().map(l=>`<div class="log-row"><b>${safe(l.text)}</b><small>${dateText(l.date)}</small></div>`).join('');}
 else {body='<p class="panel-note">僅練習辨認本版的簡化模型，不可用來判定真實魚種或代替訓練。</p><div id="quizBody"></div>';}
 $('panelBody').innerHTML=head+body;$('panelBody').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderJournal(b.dataset.tab));$('panelBody').querySelectorAll('[data-species]').forEach(b=>b.onclick=()=>renderSpecies(+b.dataset.species));$('panelBody').querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>viewPhoto(persistent.photos[+b.dataset.photo]));if($('exportBtn'))$('exportBtn').onclick=exportLog;if(tab==='quiz')renderQuiz();}
function renderSpecies(index){let s=SPECIES[index],seen=persistent.seen.includes(s.id),region=LANDMARKS[s.zone];if(s.trench&&typeof OceanTrench!=='undefined'){region=OceanTrench.stations.find(station=>station.id===OceanTrench.habitats[s.id]?.station)||{name:'深海研究區'};}else if(s.fauna){const f=life.find(f=>f.species===index);if(f){const p=f.home||f.p;region=LANDMARKS.reduce((a,b)=>Math.hypot(b.x-p[0],b.z-p[2])<Math.hypot(a.x-p[0],a.z-p[2])?b:a);}}const ownedPartners=new Set((voyage.state.features?.ecology?.partners||[]).map(p=>p.uid)),available=s.wildHabitat!==false||life.some(f=>f.species===index&&ownedPartners.has(f.uid));$('panelBody').innerHTML=`<button class="back-button" id="backSpecies">← 回到圖鑑</button><img class="detail-art" src="${s.thumb}" alt="${s.name}原創模型示意"><h3 class="detail-title">${s.name}</h3><div class="latin">${s.latin}</div><div class="info-row"><label>畫面辨識線索</label><p>${s.hint}</p></div><div class="info-row"><label>觀察筆記</label><p>${s.detail}</p></div><div class="info-row"><label>${s.habitat?'自然棲地':'本版示意區域（不是現地座標）'}</label><p>${safe(s.habitat||region.name)}${!s.habitat&&s.fauna?'周邊 · 可標記棲地航向':''}</p></div>${oceanSeasons.guideHTML(s.id)}<div class="info-row"><label>本站資料狀態</label><p>未接入石朗現地觀測紀錄。形態、數量、尺度與出現位置皆不可用於潛水預測。</p></div><div class="detail-actions"><button id="findSpecies" class="primary" ${available?'':'disabled'}>${available?'觀察這個物種 ↗':'此海域無野生分布'}</button></div>${!available?'<p class="panel-note">這類生物生活在冷水海域，這片暖海不配置野生個體。</p>':''}<p class="panel-note">${s.fauna?'游近棲地，安靜觀察牠的輪廓與動作；微小生命可使用工具中的微觀探索。':'近距觀察時按「下一隻」，看看同類之間不同的體型、花紋與游動節奏。'}</p>${s.source?`<p class="panel-note">延伸閱讀：<a href="${s.source}" target="_blank" rel="noopener">${safe(s.sourceLabel||'物種參考資料')}</a></p>`:''}<p class="panel-note">${seen?'已記錄本次模型相遇。':'尚未在場景中辨識。'} 觀察就好，不追逐、不碰觸。</p>`;$('backSpecies').onclick=()=>renderJournal('species');$('findSpecies').onclick=()=>findSpecies(index);$('panelBody').scrollTop=0;}
function renderQuiz(){quizAnswer=Math.floor(random()*SPECIES.length);let opts=[quizAnswer];while(opts.length<3){let i=Math.floor(random()*SPECIES.length);if(!opts.includes(i))opts.push(i);}opts.sort(()=>random()-.5);$('quizBody').innerHTML=`<img class="detail-art" src="${SPECIES[quizAnswer].thumb}" alt="待辨識的遊戲生物模型"><p class="panel-note" style="margin-top:20px">這個遊戲模型是什麼？</p><div style="display:flex;flex-direction:column;gap:10px">${opts.map(i=>`<button class="muted-btn" data-answer="${i}">${SPECIES[i].name}</button>`).join('')}</div><p id="quizFeedback" class="panel-note" style="margin-top:20px">${quizIndex?`目前答對 ${quizScore} / ${quizIndex} 題`:''}</p><button id="quizNext" class="primary hidden">下一個模型 ↗</button>`;let answered=false;$('quizBody').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(answered)return;answered=true;quizIndex++;let ok=+b.dataset.answer===quizAnswer;if(ok)quizScore++;$('quizFeedback').textContent=(ok?'答對了。':'這個是「'+SPECIES[quizAnswer].name+'」。')+' '+SPECIES[quizAnswer].hint+'　'+quizScore+' / '+quizIndex;$('quizNext').classList.remove('hidden');});$('quizNext').onclick=renderQuiz;}
function renderMap(){panelTitle('EXPLORE THE REEF','這片海的風景');$('panelBody').innerHTML='<p class="panel-note">純遊戲示意圖，沒有真實經緯度。點選區域可快速移動；不可用作現地導航或下潛路線。</p><canvas id="mapCanvas" class="map-canvas" width="440" height="440" aria-label="遊戲地圖"></canvas>'+LANDMARKS.map((l,i)=>`<button class="map-place" data-place="${i}"><span><b><span class="place-number">0${i+1}</span>${l.name}</b><small>${l.en} · 示意區域</small></span><span>↗</span></button>`).join('');$('panelBody').querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>jumpTo(+b.dataset.place));drawMap();}
function drawMap(){let c=$('mapCanvas');if(!c)return;let ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#092e3a';ctx.fillRect(0,0,w,h);const to=(x,z)=>[(x+60)/120*w,(z+102)/120*h];for(let j=0;j<84;j++)for(let i=0;i<84;i++){let x=i/84*120-60,z=j/84*120-102,v=groundHeight(x,z),n=clamp((v+65)/58,0,1);ctx.fillStyle=`rgba(102,170,149,${.05+n*.12})`;ctx.fillRect(i*w/84,j*h/84,w/84+1,h/84+1);let q=Math.floor((v+30)*.75),qx=Math.floor((groundHeight(x+.7,z)+30)*.75);if(q!==qx){ctx.fillStyle='#70b19d21';ctx.fillRect(i*w/84,j*h/84,2,2);}}
 ctx.strokeStyle='#abc8b91a';ctx.lineWidth=1;for(let k=1;k<7;k++){ctx.beginPath();ctx.moveTo(k*w/7,0);ctx.lineTo(k*w/7,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,k*h/7);ctx.lineTo(w,k*h/7);ctx.stroke();}ctx.fillStyle='#9abcb0';ctx.font='9px sans-serif';ctx.fillText('遊戲示意 / NOT A DIVE MAP',17,22);ctx.fillText('N ↑',w-42,22);for(let [i,l] of LANDMARKS.entries()){let p=to(l.x,l.z);ctx.beginPath();ctx.arc(...p,7,0,TAU);ctx.fillStyle='#bed9bc';ctx.fill();ctx.fillStyle='#d8e3cd';ctx.font='11px sans-serif';ctx.fillText('0'+(i+1)+' '+l.name,p[0]+13,p[1]+4);}
 let p=to(player.p[0],player.p[2]);ctx.save();ctx.translate(...p);ctx.rotate(player.yaw);ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-6,7);ctx.lineTo(0,4);ctx.lineTo(6,7);ctx.closePath();ctx.fillStyle='#edf3d3';ctx.fill();ctx.strokeStyle='#173f46';ctx.stroke();ctx.restore();ctx.fillStyle='#a7c1b5';ctx.font='9px sans-serif';ctx.fillText('△ 你的位置',17,h-18);}
function renderSettings(){const previousAdvanced=$('panelBody').querySelector('.settings-advanced')?.open,focused=document.activeElement,focusID=focused?.id,focusLight=focused?.dataset?.light,focusView=focused?.dataset?.view;panelTitle('SETTINGS','設定');
 $('panelBody').innerHTML=`
 <section class="settings-section settings-essential">
 <label class="setting-row"><span>聲音</span><input id="audioToggle" type="checkbox" ${(active?settings.sound:settings.startWithSound)?'checked':''}></label>
 <label class="setting-row"><span>音量</span><input data-volume="master" type="range" min="0" max="1" step=".01" value="${settings.master}" aria-label="總音量"></label>
 <label class="setting-row"><span>畫質</span><select id="qualityPreset" aria-label="畫質"><option value="auto" ${settings.adaptive?'selected':''}>自動調整</option>${['省電','均衡','細緻'].map((name,i)=>`<option value="${i}" ${!settings.adaptive&&renderer.quality===i?'selected':''}>${name}</option>`).join('')}</select></label>
 </section>
 <details class="settings-advanced"><summary>進階設定</summary>
 <section class="settings-section"><h3>視角與操控</h3><div class="segmented"><button data-view="first" aria-pressed="${!settings.third}" class="${!settings.third?'selected':''}">第一人稱</button><button data-view="third" aria-pressed="${settings.third}" class="${settings.third?'selected':''}">跟隨潛水員</button></div>
 <label class="setting-row"><span>視野廣度</span><input id="fovRange" type="range" min="55" max="90" step="1" value="${settings.fov}" aria-label="視野廣度"></label>
 ${$('ocean').requestPointerLock&&!matchMedia('(pointer:coarse)').matches?`<label class="setting-row"><span>滑鼠自由環視<small>點畫面啟用，Esc 釋放</small></span><input id="lookLockToggle" type="checkbox" ${settings.lookLock?'checked':''}></label>`:''}
 <label class="setting-row"><span>游動速度</span><input id="speedRange" type="range" min=".5" max="2" step=".05" value="${settings.speed}" aria-label="游動速度"></label>
 <label class="setting-row"><span>環視靈敏度</span><input id="senseRange" type="range" min=".4" max="2" step=".05" value="${settings.sensitivity}" aria-label="環視靈敏度"></label>
 <label class="setting-row"><span>生物提示</span><input id="hintsToggle" type="checkbox" ${settings.hints?'checked':''}></label>
 <label class="setting-row"><span>減少動態效果</span><input id="motionToggle" type="checkbox" ${settings.reduced?'checked':''}></label></section>
 <section class="settings-section"><h3>光與水色</h3><div class="segmented">${[['day','日光'],['late','斜陽'],['blue','藍時']].map(([key,name])=>`<button data-light="${key}" aria-pressed="${settings.lighting===key}" class="${settings.lighting===key?'selected':''}">${name}</button>`).join('')}</div>
 <label class="setting-row"><span>水體濃度</span><input id="clarityRange" type="range" min=".5" max="1.5" step=".05" value="${settings.clarity}" aria-label="水體濃度"></label>
 <label class="setting-row"><span>潛水燈常亮<small>深海與洞內會自動亮起</small></span><input id="lampToggle" type="checkbox" ${settings.lamp?'checked':''}></label>
 <label class="setting-row"><span>自動調整解析度</span><input id="adaptiveToggle" type="checkbox" ${settings.adaptive?'checked':''}></label>
 <button class="muted-btn" id="benchSettings">測試裝置效能</button></section>
 <section class="settings-section audio-settings"><h3>聲音細節</h3>
 ${[['music','配樂'],['ambience','海流與遠方回聲'],['breath','呼吸']].map(([key,name])=>`<label class="setting-row"><span>${name}</span><input data-volume="${key}" type="range" min="0" max="1" step=".01" value="${settings[key]}" aria-label="${name}"></label>`).join('')}
 <label class="muted-btn local-file">本機音樂<input id="localMusic" type="file" accept="audio/*" hidden></label><button class="muted-btn" id="originalMusic">恢復原創配樂</button></section>
 <div class="settings-bottom"><button class="muted-btn" id="resetPosition">回到淺海</button><button class="muted-btn" id="cinematicBtn">只看風景</button><button class="muted-btn" id="aboutBtn">操作與關於</button><button class="muted-btn" id="legacyToolsBtn">照片、存檔與其他工具</button></div>
 </details>`;
 $('qualityPreset').onchange=e=>{settings.adaptive=e.target.value==='auto';settings.quality=settings.adaptive?(renderer.mobile?1:2):+e.target.value;renderer.quality=settings.quality;renderer.dynamicScale=1;renderer.dirty=true;renderer.forceShadow=true;oceanPerf.resetSamples();renderer.resize();if(renderer.quality===2&&!renderer.textureFull)renderer.upgradeTextures().catch(()=>toast('保留目前材質。'));persist();renderSettings();};
 $('panelBody').querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{settings.quality=+b.dataset.quality;renderer.quality=settings.quality;renderer.dynamicScale=1;renderer.dirty=true;renderer.forceShadow=true;oceanPerf.resetSamples();renderer.resize();if(renderer.quality===2&&!renderer.textureFull)renderer.upgradeTextures().then(()=>toast('細緻材質已載入。')).catch(()=>toast('高解析材質未載入，保留原材質。'));persist();renderSettings();});
 $('panelBody').querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>{settings.lighting=b.dataset.light;renderer.forceShadow=true;renderer.dirty=true;applyVisualSettings();persist();renderSettings();});
 $('panelBody').querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{settings.third=b.dataset.view==='third';renderer.dirty=true;persist();renderSettings();});
 $('panelBody').querySelectorAll('[data-volume]').forEach(b=>b.oninput=()=>{settings[b.dataset.volume]=+b.value;persist();oceanAudio.tick();});
 if($('benchSettings'))$('benchSettings').onclick=()=>oceanPerf.start();for(let [id,key] of [['adaptiveToggle','adaptive'],['lampToggle','lamp'],['hintsToggle','hints'],['motionToggle','reduced']])$(id).onchange=e=>{settings[key]=e.target.checked;document.body.classList.toggle('reduced-motion',settings.reduced);applyVisualSettings();renderer.dirty=true;persist();};
 for(const [id,key] of [['clarityRange','clarity'],['fovRange','fov']])$(id).oninput=e=>{settings[key]=+e.target.value;applyVisualSettings();renderer.dirty=true;persist();};
 if($('lookLockToggle'))$('lookLockToggle').onchange=e=>{settings.lookLock=e.target.checked;if(!settings.lookLock)releaseMouseLook();persist();};
 $('speedRange').oninput=e=>{settings.speed=+e.target.value;persist();};$('senseRange').oninput=e=>{settings.sensitivity=+e.target.value;persist();};
 $('audioToggle').onchange=e=>{if(active)toggleSound();else{settings.startWithSound=e.target.checked;$('welcomeAudio').checked=e.target.checked;persist();}};$('localMusic').onchange=e=>{const file=e.target.files?.[0];if(!file)return;settings.sound=true;settings.startWithSound=true;$('welcomeAudio').checked=true;updateSoundUI();persist();oceanAudio.loadLocal(file);};$('originalMusic').onclick=()=>{oceanAudio.resetMusic();toast('恢復隨深度變化的原創配樂。');};
 $('resetPosition').onclick=()=>jumpTo(8);$('cinematicBtn').onclick=()=>{closePanel();document.body.classList.add('cinematic');};$('aboutBtn').onclick=()=>openPanel('about');$('legacyToolsBtn').onclick=()=>openPanel('fieldTools');
 if(previousAdvanced)$('panelBody').querySelector('.settings-advanced').open=true;
 const restore=focusID?$(focusID):focusLight?$('panelBody').querySelector('[data-light="'+focusLight+'"]'):focusView?$('panelBody').querySelector('[data-view="'+focusView+'"]'):null;if(restore&&$('panelBody').contains(restore))restore.focus({preventScroll:true});
}
function renderAbout(){panelTitle('ABOUT THIS CONCEPT','先重溫，再走向真實');$('panelBody').innerHTML=`<div class="about-copy"><p>重返蔚藍 · 歸潮航程 <small>v${OPEN_WORLD.version} · LIVING OCEAN</small></p><p>一個附有離線單檔版的 3D 概念原型。以綠島石朗的珊瑚礁與海底郵筒為靈感，讓你先體驗自由探索、拍照與安靜觀察。</p><div class="note-box">本版沒有接入實測地形、真實座標或現地生物紀錄。地形、深度、比例、魚群、能見度與所有游動路線皆為示意，不能用作潛水導航、出現機率預測、技巧訓練或認證。</div><h3>怎麼游</h3><p>電腦：WASD 或方向鍵移動。按住滑鼠拖曳環視。E 上浮、Q 下潛、Shift 加速，空白鍵拍照。M 地圖、J 圖鑑、V 視角、F 選取指標下生物、H 隱藏介面、C 巡航、X 攝影取景、B 航程冊、Esc 暫停／關閉。</p><p>手機：左下搖桿移動，直接拖曳海景環視。↑ ↓ 改變深度，中央相機拍照。支援直向與橫向。多點觸控可以同時移動、環視與上下浮動。</p><p>標準手把：雙搖桿游動與環視，LT／RT 上下浮潛，A 拍照、B 主動觀察中央生物、X 地圖、Y 巡航、Start 選單。按 View／Select 開啟工具指標：左搖桿移動、A 點選或按住拖曳、右搖桿捲動、方向鍵調整選項、RT 精細移動；B／View 離開指標。可用於畫筆、生物互動及船上工具。</p><p>點選附近的生物後安靜觀察約 1.2 秒，可收錄這次相遇。拖曳畫面只會環視；點空白處可取消選取。也可以打開圖鑑，選「觀察這個物種」。自動漫遊沒有終點，隨時移動接手。</p><h3>本版資料與原創內容</h3><p>本版重建了材質、海床礁體、珊瑚、魚鰭與海龜。所有幾何、貼圖和插圖均為原創程序生成；單檔版將貼圖內嵌；網站版使用同目錄的材質、程式與音樂，不依賴第三方素材服務。未擷取《Endless Ocean》的素材、音樂、程式或模型。中文字型使用你的系統字型，不附字型檔。</p><p>石朗名稱、珊瑚礁與郵筒靈感：<br><a href="https://www.eastcoast-nsa.gov.tw/zh-tw/attractions/detail/66/" target="_blank" rel="noopener">交通部觀光署東部海岸國家風景區 · 石朗</a></p><p>綠蠵龜延伸資料：<br><a href="https://www.fisheries.noaa.gov/species/green-turtle" target="_blank" rel="noopener">NOAA Fisheries · Green turtle</a></p><p>參考資料查閱日期：2026-10-11。來源支持的是地點背景或一般生物資料，不構成本遊戲地形與物種配置的驗證。</p><h3>原創音樂</h3><p>「海，仍在這裡」與「微光之下」是本版原創的兩段同步 120 秒音軌，使用程序合成的柔和琴聲、無詞聲墊與弦音。隨模擬水深交融；氣泡、調節器、划水與遠方鯨鳴感回聲亦為合成音效，不是生物分布證據。未使用第三方錄音、歌曲旋律或任天堂音樂。</p><h3>保存與隱私</h3><p>底片最多 20 張、相簿最多 120 張，回船後選片沖印；已投稿附件會保留。原圖使用本機照片資料庫保存，總容量上限 96 MiB；觀察進度、設定與最近 60 筆日誌也保存在這個瀏覽器。清除資料、換裝置或無痕模式可能不保留。照片與個人存檔不會上傳，也沒有第三方追蹤。只有主動建立或申請雙人同游時，才向設定的連線服務傳送暫時名稱、位置、方向、工具狀態與預設訊息；離房即停止。請下載需要保留的照片與日誌。</p><h3>下一步走向實景</h3><p>這份程式已把渲染、場景、聲音與互動拆開。取得測繪、授權影像與當地教練核對後，可逐步替換程序地形和模型；在此之前，維持概念重建標示。</p></div>`;}
const guideImageFallbacks=new Map(),guideImageAttempts=new WeakSet();let guideImageFallbackBound=false;
function rememberGuideImage(s,preferred){
 if(typeof s.thumb!=='string'||!/^data:image\/svg\+xml[;,]/i.test(s.thumb))return;
 const url=new URL(preferred,document.baseURI),expected=new URL('assets/guide_'+s.id+'.jpg',document.baseURI);
 if(url.origin!==expected.origin||url.pathname!==expected.pathname)return;
 guideImageFallbacks.set(url.href,s.thumb);
 if(guideImageFallbackBound)return;guideImageFallbackBound=true;
 // Image errors do not bubble. One capture listener also covers replacement
 // journal/detail/quiz panels; photographs and unrelated images stay untouched.
 document.addEventListener('error',event=>{
  const img=event.target,panel=$('panelBody');if(img?.tagName!=='IMG'||guideImageAttempts.has(img)||!panel?.contains(img))return;
  const detail=img.classList.contains('detail-art')&&(img.parentElement===panel||img.parentElement===$('quizBody'));
  if(!img.closest('.species-card')&&!detail)return;
  let source;try{source=new URL(img.currentSrc||img.src,document.baseURI).href;}catch(_){return;}
  const fallback=guideImageFallbacks.get(source);if(!fallback)return;
  guideImageAttempts.add(img);img.src=fallback;
 },true);
}
function makeThumb(s){if(ASSETS['guide_'+s.id]){rememberGuideImage(s,ASSETS['guide_'+s.id]);s.thumb=ASSETS['guide_'+s.id];return;}if(s.fauna&&typeof faunaThumb==='function'){s.thumb=faunaThumb(s);return;}let c=document.createElement('canvas');c.width=420;c.height=210;let x=c.getContext('2d');x.translate(215,100);let col='#'+s.color.toString(16).padStart(6,'0');x.shadowColor='#021b2744';x.shadowBlur=15;
 if(s.id==='turtle'){x.save();x.rotate(-.18);x.fillStyle='#91a48b';for(let side of [-1,1]){x.beginPath();x.moveTo(22,side*25);x.bezierCurveTo(89,side*51,63,side*86,-4,side*66);x.lineTo(-20,side*28);x.closePath();x.fill();x.beginPath();x.ellipse(-60,side*43,32,15,-side*.5,0,TAU);x.fill();}x.beginPath();x.ellipse(81,0,26,18,0,0,TAU);x.fill();x.fillStyle='#79866c';x.beginPath();x.ellipse(-6,0,80,51,0,0,TAU);x.fill();x.strokeStyle='#b2b697';x.lineWidth=2;for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){let px=k*37,py=j*27;if(Math.hypot(px/75,py/48)>.84)continue;x.beginPath();for(let q=0;q<6;q++){let a=q/6*TAU;x.lineTo(px+Math.cos(a)*24,py+Math.sin(a)*21);}x.closePath();x.stroke();}x.fillStyle='#1a383b';x.beginPath();x.arc(94,-8,3,0,TAU);x.fill();x.restore();}
 else if(s.id==='ray'){x.fillStyle='#789490';x.beginPath();x.moveTo(56,0);x.bezierCurveTo(36,-15,-18,-42,-62,-80);x.quadraticCurveTo(-80,-38,-41,0);x.quadraticCurveTo(-80,38,-62,80);x.bezierCurveTo(-18,42,36,15,56,0);x.fill();x.strokeStyle='#91aaa0';x.lineWidth=3;x.beginPath();x.moveTo(-39,0);x.quadraticCurveTo(-111,-10,-173,8);x.stroke();x.fillStyle='#c6d2bb';for(let k=0;k<40;k++){let px=-56+random()*90,py=(random()-.5)*80;if(Math.abs(py)<(48-px*.7)){x.beginPath();x.arc(px,py,1.5,0,TAU);x.fill();}}}
 else {let h=s.height*160,w=86;x.fillStyle=s.id==='tang'||s.id==='idol'?'#d9ca7e':col;x.beginPath();x.moveTo(-61,0);x.lineTo(-116,-h*.8);x.lineTo(-100,0);x.lineTo(-116,h*.8);x.closePath();x.fill();x.fillStyle=col;x.beginPath();x.moveTo(-48,-h*.7);x.lineTo(-36,-h*1.32);x.lineTo(21,-h*1.06);x.lineTo(40,-h*.65);x.closePath();x.fill();x.save();x.beginPath();x.ellipse(0,0,w,h,0,0,TAU);x.clip();let gr=x.createLinearGradient(0,-h,0,h);gr.addColorStop(0,col);gr.addColorStop(1,col+'c0');x.fillStyle=gr;x.fillRect(-90,-h,180,h*2);if(s.id==='clown'){for(let pos of [-53,-7,48]){x.fillStyle='#293e43';x.fillRect(pos-8,-h,23,h*2);x.fillStyle='#e6e6cb';x.fillRect(pos-4,-h,15,h*2);}}if(s.id==='tang'){x.fillStyle='#243e60';x.beginPath();x.ellipse(-5,-h*.32,64,16,-.1,0,TAU);x.fill();x.fillRect(-37,-2,90,12);}if(s.id==='idol'||s.id==='butterfly'){x.fillStyle='#324644';x.fillRect(35,-h,16,h*2);if(s.id==='idol')x.fillRect(-44,-h,24,h*2);else {x.fillStyle='#e0dfc3';x.fillRect(-30,-h,27,h*2);}}if(s.id==='sergeant'){x.fillStyle='#304b4c';for(let k=-2;k<3;k++)x.fillRect(k*27-4,-h,10,h*2);}if(s.id==='parrot'||s.id==='wrasse'){x.strokeStyle='#cc929a99';x.lineWidth=3;for(let yy=-h+9;yy<h;yy+=12){x.beginPath();x.moveTo(-80,yy);x.quadraticCurveTo(0,yy-10,88,yy);x.stroke();}}x.restore();x.fillStyle='#d7dcb7';x.beginPath();x.arc(59,-11,8,0,TAU);x.fill();x.fillStyle='#162f36';x.beginPath();x.arc(61,-11,5,0,TAU);x.fill();x.fillStyle='#e7ecd4';x.beginPath();x.arc(63,-13,1.5,0,TAU);x.fill();if(s.id==='idol'){x.strokeStyle='#e7e2c7';x.lineWidth=3;x.beginPath();x.moveTo(19,-44);x.bezierCurveTo(-5,-128,-45,-83,-108,-86);x.stroke();}}
 s.thumb=c.toDataURL('image/png');}
/* Presentation state keeps the user's existing subtitle and guidance preferences. */
const oceanDiveUI=(()=>{
 const key='return-blue.ui.v1',controls=['mapBtn','journalBtn','voyageBtn','objectiveCard','viewBtn','observeBtn','autoBtn','cruiseBtn','photoModeBtn','lampBtn','companionBtn','settingsBtn','soundBtn','musicPill'];
 let prefs={captions:false,guidance:true,taught:false},vehicleLabel='',initialized=false;
 try{const old=JSON.parse(localStorage.getItem(key)||'null');if(old&&typeof old==='object')for(const name of ['captions','guidance','taught'])if(typeof old[name]==='boolean')prefs[name]=old[name];}catch(_){}
 const save=()=>{try{oceanSaveGuard.write(key,JSON.stringify(prefs));}catch(_){}};
 function restoreControls(){const shelf=$('diveToolShelf');if(!shelf)return;for(const id of controls){const element=$(id);if(element&&element.parentElement!==shelf)shelf.append(element);}}
 function sync(){
  document.body.classList.toggle('dive-paused',!!modal||photoOpen);document.body.classList.toggle('dive-active',active);
  document.body.classList.toggle('dive-captions',prefs.captions);document.body.classList.toggle('dive-guidance',prefs.guidance);
  const notices=$('diveNotices'),status=$('deepseaStatus');if(notices&&status&&status.parentElement!==notices)notices.prepend(status);
  $('fieldToolsBtn')?.setAttribute('aria-expanded',String(['diveMenu','fieldTools'].includes(modal)));
  const air=$('airStatus');if(air&&vehicleLabel){air.textContent=vehicleLabel;air.style.color='';}
  const next=$('nextIndividual');if(next)next.classList.toggle('hidden',!follow||!oceanSelection.target());
 }
 function mount(ids,container){for(const id of ids){const button=$(id);if(!button)continue;if(id==='companionBtn'&&button.classList.contains('hidden'))continue;container.append(button);}}
 function renderMenu(type,menus){
  if(!['diveMenu','fieldTools'].includes(type))return false;restoreControls();
  panelTitle('探索選單',active?'慢慢看，海就在這裡':'準備下一次探索');
  $('panelBody').innerHTML='<p class="menu-summary">'+safe(active?$('areaName').textContent+' · '+$('depth').textContent+' m · 已暫停':'進度保存在這個瀏覽器。')+'</p>'+(active?'<button id="resumeBtn" class="primary">繼續探索 <span>↗</span></button>':'')+'<div id="diveRecords" class="dive-menu-grid"></div><div id="diveSettings" class="dive-menu-grid"></div><details class="menu-advanced"><summary>更多探索工具</summary><div id="diveActions" class="dive-menu-grid"></div><div id="diveArchive" class="dive-menu-grid"></div><div class="feature-menu">'+menus.filter(m=>m.panel!=='deepsea').map(m=>'<button class="muted-btn" data-feature="'+safe(m.panel)+'">'+safe(m.label)+' <span>↗</span></button>').join('')+'</div><label class="setting-row"><span>故事字幕</span><input id="diveCaptions" type="checkbox" '+(prefs.captions?'checked':'')+'></label><label class="setting-row"><span>目的地方向</span><input id="diveGuidance" type="checkbox" '+(prefs.guidance?'checked':'')+'></label></details><p class="menu-help">'+(matchMedia('(pointer:coarse)').matches?'左搖桿游動，滑動畫面環視。↑ ↓ 上浮與下潛。':'WASD 游動 · 拖曳環視 · E／Q 上下 · Shift 加速')+'</p>'+(active?'<button id="menuHome" class="textbtn">儲存並回首頁</button>':'');
  mount(['mapBtn','journalBtn'],$('diveRecords'));
  const activities=document.createElement('button');activities.className='pill-btn';activities.dataset.feature='activities';activities.textContent='調查與委託 ↗';$('diveRecords').append(activities);
  const deepsea=document.createElement('button');deepsea.className='pill-btn';deepsea.dataset.feature='deepsea';deepsea.textContent='海溝與深海生物 ↗';$('diveRecords').append(deepsea);
  mount(['voyageBtn','objectiveCard'],$('diveArchive'));
  mount(['viewBtn','observeBtn','autoBtn','cruiseBtn','photoModeBtn','lampBtn','companionBtn'],$('diveActions'));
  mount(['settingsBtn'],$('diveSettings'));
  $('menuHome')?.addEventListener('click',goHome);
  $('viewBtn').textContent=settings.third?'改為第一人稱':vehicleLabel?'跟隨潛航器視角':'跟隨潛水員視角';$('observeBtn').textContent='選取指標下生物';
  for(const button of $('diveActions').querySelectorAll('button'))button.disabled=!active;
  const turn=document.createElement('button');turn.id='quickTurnBtn';turn.className='pill-btn';turn.textContent='快速轉身';turn.title='Z · 手把左肩鍵（LB）';turn.setAttribute('aria-keyshortcuts','Z');turn.disabled=!active;turn.onclick=()=>{closePanel();oceanSwimActions.quickTurn();};$('diveActions').append(turn);
  const surface=document.createElement('button');surface.id='surfaceLookBtn';surface.className='pill-btn';surface.textContent=oceanSwimActions.isSurface()?'回到水下':'水面環視';surface.title='U · 手把右肩鍵（RB）';surface.setAttribute('aria-keyshortcuts','U');surface.setAttribute('aria-pressed',String(oceanSwimActions.isSurface()));surface.disabled=!active||!oceanSwimActions.isSurface()&&!oceanSwimActions.canSurface();surface.onclick=()=>{closePanel();oceanSwimActions.toggleSurface();};$('diveActions').append(surface);
  const help=document.createElement('p');help.className='menu-help';help.textContent='手把 View／Select：工具指標，A 點選或按住拖曳，B 離開。Z／左肩鍵：快速轉身。U／右肩鍵：水面環視，需在開闊水面下 1.2 m 內。環視時仍可拖曳、拍照；游動即可回到水下。';$('diveActions').after(help);
  $('resumeBtn')?.addEventListener('click',closePanel);
  for(const name of ['captions','guidance'])$('dive'+(name==='captions'?'Captions':'Guidance')).onchange=e=>{prefs[name]=e.target.checked;save();sync();};
  return true;
 }
 function init(){if(initialized)return;initialized=true;
  $('pauseBtn').onclick=()=>openPanel('diveMenu');$('fieldToolsBtn').onclick=()=>openPanel('fieldTools');
  $('focusActions').append($('nextIndividual'));$('selectionPanel').append($('ecologyHUD'));
  // Moving each original control preserves its wrapped camera / voyage handler.
  for(const id of ['viewBtn','observeBtn','autoBtn','cruiseBtn','photoModeBtn','lampBtn','companionBtn'])$(id).addEventListener('click',()=>{if(modal&&$(id).closest('#panel'))closePanel();},true);
  restoreControls();sync();window.__oceanUI=Object.freeze({revision:'point-and-explore-2',get mode(){return 'friendly';},get touch(){return matchMedia('(pointer:coarse)').matches;}});
 }
 return {init,sync,renderMenu,restoreControls,setVehicleLabel(text=''){vehicleLabel=String(text);sync();},preferences:()=>({...prefs})};
})();

// All gameplay modules share keyboard ownership. Native controls and editable
// descendants keep their keys; canvas/body focus retains gameplay shortcuts.
const oceanKeyboard=Object.freeze({
 control:event=>[...(event.composedPath?.()||[]),event.target,document.activeElement].some(el=>el?.isContentEditable||el?.closest?.('button,a[href],summary,input,textarea,select')),
 browser:event=>!!(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey),
 reserved(event){return this.browser(event)||this.control(event);}
});
function setupControls(){initPerformance(); $('viewBtn').onclick=()=>{settings.third=!settings.third;stopAuto();persist();toast(settings.third?(renderer.submersible?'第三人稱 · 跟隨潛航器':'第三人稱 · 跟隨潛水員'):'第一人稱 · 沉浸視角');};$('observeBtn').onclick=observeNearest;$('cinematicExit').onclick=()=>document.body.classList.remove('cinematic');const on=(id,f)=>$(id).addEventListener('click',f);on('startBtn',()=>startDive(false));on('tourStart',()=>startDive(true));on('homeBtn',goHome);on('autoBtn',()=>{auto=!auto;autoT=nearestPathIndex();follow=null;resetInput();setAutoUI();});on('photoBtn',takePhoto);on('journalBtn',()=>openPanel('journal'));on('settingsBtn',()=>openPanel('settings'));on('mapBtn',()=>openPanel('map'));on('soundBtn',toggleSound);on('musicPill',()=>openPanel('settings'));on('lampBtn',()=>{settings.lamp=!settings.lamp;renderer.dirty=true;applyVisualSettings();updateHUD();persist();});on('welcomeAbout',()=>openPanel('about'));on('closePanel',closePanel);on('scrim',closePanel);on('closePhoto',closePhoto);on('savePhoto',()=>{if(selectedPhoto)download(selectedPhoto.url,'重返蔚藍-'+selectedPhoto.date+'.jpg');});
 const keyboardControl=oceanKeyboard.control,browserKeyboard=oceanKeyboard.browser;
 // Tab away from the sea must release keyboard movement without canceling
 // independently held touch pointers. Keyup remains unconditional below.
 window.addEventListener('focusin',event=>{if(keyboardControl(event))keys.clear();});
 window.addEventListener('keydown',event=>{if(!['KeyZ','KeyU'].includes(event.code)||!active||modal||photoOpen||browserKeyboard(event)||keyboardControl(event))return;event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)(event.code==='KeyZ'?oceanSwimActions.quickTurn:oceanSwimActions.toggleSurface)();},true);
 window.addEventListener('keydown',e=>{if(browserKeyboard(e))return;if(e.code==='Tab'&&(modal||photoOpen)){let box=photoOpen?$('photoViewer'):$('panel'),focusable=[...box.querySelectorAll('button,a,input,select,summary')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!focusable.length)return;let first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}return;}if(e.code==='Escape'){e.preventDefault();if(photoOpen)closePhoto();else if(modal)closePanel();else if(active)openPanel('diveMenu');return;}if(!active||modal||photoOpen||keyboardControl(e))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ'].includes(e.code))e.preventDefault();if(e.repeat&&['Space','KeyP','KeyM','KeyJ','KeyV','KeyH','KeyF','KeyL'].includes(e.code))return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))stopAuto();keys.add(e.code);if(e.code==='Space'||e.code==='KeyP')takePhoto();if(e.code==='KeyM')openPanel('map');if(e.code==='KeyJ')openPanel('journal');if(e.code==='KeyF')observeNearest();if(e.code==='KeyV'){settings.third=!settings.third;persist();toast(settings.third?(renderer.submersible?'跟隨潛航器視角':'跟隨潛水員視角'):'第一人稱視角');}if(e.code==='KeyH')document.body.classList.toggle('cinematic');if(e.code==='KeyL'){settings.lamp=!settings.lamp;applyVisualSettings();persist();}});window.addEventListener('keyup',e=>keys.delete(e.code));
 // Hidden pages can suspend RAF immediately. Cut the measurement interval at
 // lifecycle events too, so returning never counts background time as a frame.
 window.addEventListener('blur',()=>{oceanPerf.pause();oceanSelection.suspend();resetInput();lastTime=performance.now();oceanAudio.pause();});
 window.addEventListener('focus',()=>{oceanPerf.pause();lastTime=performance.now();if(settings.sound&&oceanSaveGuard.live)oceanAudio.resume();});
 document.addEventListener('visibilitychange',()=>{oceanPerf.pause();oceanSelection.suspend();resetInput();lastTime=performance.now();if(document.hidden){if(!voyage.importing)persist();oceanAudio.pause();}else if(settings.sound&&oceanSaveGuard.live)oceanAudio.resume();});
 let lookGesture=null;const canvasPointers=new Set();inputCleanup.push(()=>{lookGesture=null;canvasPointers.clear();});const canvas=$('ocean');
 canvas.addEventListener('pointerdown',e=>{
  if(!active||modal||photoOpen||oceanFeatures.pointerCaptured()||e.button>0)return;
  canvasPointers.add(e.pointerId);if(canvasPointers.size>1){if(lookGesture)lookGesture.cancelled=true;return;}
  if(e.pointerType==='mouse'&&settings.lookLock&&canvas.requestPointerLock){lockMouseLook();return;}
  lookGesture=SelectionRules.begin(e.pointerId,e.clientX,e.clientY,performance.now(),e.pointerType);oceanGamepadPointer.capture(canvas,e);
 });
 canvas.addEventListener('pointermove',e=>{
  if(document.pointerLockElement===canvas)return;
  if(!lookGesture){if(e.pointerType!=='touch')oceanSelection.hover(e.clientX,e.clientY);return;}
  if(e.pointerId!==lookGesture.id||!active||modal||photoOpen||oceanFeatures.pointerCaptured())return;
  const dx=e.clientX-lookGesture.lastX,dy=e.clientY-lookGesture.lastY;SelectionRules.move(lookGesture,e.clientX,e.clientY);
  if(lookGesture.distance>(e.pointerType==='touch'?9:5)){lookGesture.cancelled=true;turnCamera(dx,dy);}
 });
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&active&&!modal&&!photoOpen&&!oceanFeatures.pointerCaptured())turnCamera(e.movementX,e.movementY);});
 document.addEventListener('pointerlockerror',mouseLookUnavailable);document.addEventListener('pointerlockchange',()=>{oceanSelection.suspend();if(document.pointerLockElement!==canvas)resetInput();});
 const endLook=e=>{canvasPointers.delete(e.pointerId);if(e.pointerId!==lookGesture?.id)return;const gesture=lookGesture;lookGesture=null;
  if(e.type==='pointerup'&&SelectionRules.tap(gesture,performance.now())&&oceanSelection.allowed()&&!oceanSelection.exclusive()){
   const fish=oceanSelection.pick(e.clientX,e.clientY);if(fish)oceanSelection.select(fish.uid,'pointer');else {if(follow)stopAuto();oceanSelection.clear();}
  }
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endLook);
 canvas.addEventListener('pointerleave',()=>{if(!lookGesture)oceanSelection.hover(-1000,-1000);});
 window.addEventListener('keydown',event=>{if(event.code!=='Escape'||!active||photoOpen||modal||browserKeyboard(event)||keyboardControl(event))return;event.preventDefault();event.stopImmediatePropagation();if(!oceanSwimActions.exit()&&!oceanFeatures.some('escape'))openPanel('diveMenu');},true);

 let joyPointer=null;inputCleanup.push(()=>{joyPointer=null;});let joy=$('joystick');const moveJoy=e=>{let r=joy.getBoundingClientRect(),max=r.width*.30,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=len>max?max/len:1;dx*=scale;dy*=scale;const mag=Math.hypot(dx,dy)/max,dead=.10,gain=mag>dead?(mag-dead)/((1-dead)*mag):0;stick=[dx/max*gain,dy/max*gain];$('stickKnob').style.transform=`translate(${dx}px,${dy}px)`;};joy.addEventListener('pointerdown',e=>{if(!active||modal||photoOpen||joyPointer!==null)return;e.preventDefault();stopAuto();joyPointer=e.pointerId;oceanGamepadPointer.capture(joy,e);moveJoy(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e);});const endJoy=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;stick=[0,0];$('stickKnob').style.transform='translate(0,0)';};joy.addEventListener('pointerup',endJoy);joy.addEventListener('pointercancel',endJoy);joy.addEventListener('lostpointercapture',endJoy);
 const heldDepth=new Map();inputCleanup.push(()=>heldDepth.clear());for(let [id,value] of [['upBtn',1],['downBtn',-1]]){let b=$(id);b.addEventListener('pointerdown',e=>{if(!active||modal||photoOpen)return;e.preventDefault();stopAuto();heldDepth.set(e.pointerId,value);verticalInput=[...heldDepth.values()].reduce((a,b)=>a+b,0);oceanGamepadPointer.capture(b,e);});let end=e=>{heldDepth.delete(e.pointerId);verticalInput=[...heldDepth.values()].reduce((a,b)=>a+b,0);};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);}
 const lookPad=$('lookpad');let lookPadPointer=null;
 inputCleanup.push(()=>{lookPadPointer=null;});
 const moveLookPad=e=>{const r=lookPad.getBoundingClientRect(),max=r.width*.29;let x=(e.clientX-r.left-r.width/2)/max,y=(e.clientY-r.top-r.height/2)/max,mag=Math.hypot(x,y);if(mag>1){x/=mag;y/=mag;}lookStick=mag<.12?[0,0]:[x,y];$('lookKnob').style.transform=`translate(${x*max}px,${y*max}px)`;};
 lookPad.addEventListener('pointerdown',e=>{if(!active||modal||photoOpen||lookPadPointer!==null)return;e.preventDefault();stopAuto();lookPadPointer=e.pointerId;oceanGamepadPointer.capture(lookPad,e);moveLookPad(e);});
 lookPad.addEventListener('pointermove',e=>{if(e.pointerId===lookPadPointer)moveLookPad(e);});
 const stopLookPad=e=>{if(e.pointerId!==lookPadPointer)return;lookPadPointer=null;lookStick=[0,0];$('lookKnob').style.transform='translate(0,0)';};for(const ev of ['pointerup','pointercancel','lostpointercapture'])lookPad.addEventListener(ev,stopLookPad);
 document.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{selectedEntry=+b.dataset.entry;document.querySelectorAll('[data-entry]').forEach(x=>x.classList.toggle('selected',x===b));renderer.dirty=true;});
 $('welcomeAudio').checked=settings.startWithSound;
 window.visualViewport?.addEventListener('resize',()=>{if(renderer){renderer.resize();resetInput();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();oceanSelection.clear();resetInput();const voyageSaved=typeof saveVoyage==='function'&&saveVoyage(),journalSaved=persist();oceanAudio.pause();ready=false;handleFailure(new Error('WebGL context lost'),{contextLost:true,saved:voyageSaved&&journalSaved});});canvas.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('resize',()=>{if(renderer){renderer.resize();resetInput();}});}
async function boot(){try{loadJournal();applyRecoveryGraphics();window.__freeze=new URLSearchParams(location.search).has('still');const pause=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await pause();if(!oceanSaveGuard.live)return;renderer=new Renderer($('ocean'),Math.round(settings.quality));renderer.quality=Math.round(settings.quality);renderer.resize();await renderer.loaded;if(!oceanSaveGuard.live)return;$('loadDetail').textContent='鋪展高密度礁體與材質';await pause();if(!await loadCompiledScene(renderer)){buildReef(renderer);$('loadDetail').textContent='讓魚群與海龜回到水裡';await pause();addLife(renderer);renderer.sceneLoad={compiled:false};}if(!oceanSaveGuard.live)return;if(typeof ensureReefFish!=='undefined')ensureReefFish(renderer);if(typeof ensureOarfish!=='undefined')ensureOarfish(renderer);if(typeof ensureFrilledShark!=='undefined')ensureFrilledShark(renderer);if(typeof ensureBarreleye!=='undefined')ensureBarreleye(renderer);initializeIndividuals(renderer);SPECIES.forEach(makeThumb);setupControls();initIndividualUI();initVoyage();oceanSaveGuard.loaded();await oceanFeatures.init();if(!oceanSaveGuard.live)return;oceanSelection.init();oceanDiveUI.init();setCount();updateSoundUI();document.body.classList.toggle('reduced-motion',settings.reduced);if(matchMedia('(pointer:coarse)').matches)$('introControls').textContent='左搖桿游動 · 拖曳環視 · ↑↓ 浮潛';updateLife(0);updateCamera();applyVisualSettings();if(renderer.sceneStream)await renderer.sceneStream.ready(eye);if(!oceanSaveGuard.live)return;
 // Keep one-time audio device work inside loading, never in an idle-home task.
 if(settings.startWithSound&&!document.hidden&&document.hasFocus()){
  $('loadDetail').textContent='準備海底聲景';await pause();
  if(oceanSaveGuard.live&&!document.hidden&&document.hasFocus()){
   // Audio is optional: native suspend/close can remain pending indefinitely.
   // Detach an unused graph before retrying on the next real sound gesture.
   let preparationTimer;
   try{await Promise.race([oceanAudio.prepare(),new Promise((_,reject)=>{preparationTimer=setTimeout(()=>reject(new Error('Audio preparation timed out')),1500);})]);if(!oceanSaveGuard.live||document.hidden||!document.hasFocus())oceanAudio.releasePrepared().catch(()=>{});}
   catch(error){oceanAudio.releasePrepared().catch(()=>{});console.warn('Audio preparation unavailable; retry on sound gesture',error);}
   finally{clearTimeout(preparationTimer);}
  }
 }
 if(!oceanSaveGuard.live)return;ready=true;oceanSaveHealth.init();renderer.render(eye,target,0);$('startBtn').disabled=false;$('tourStart').disabled=false;$('loading').classList.add('gone');setTimeout(()=>$('loading').classList.add('hidden'),700);lastTime=performance.now();requestAnimationFrame(animate);
 // Read-only diagnostics for browser testing; no network or analytics.
 window.__ocean={get ready(){return ready},get active(){return active},get speciesCount(){return SPECIES.length},get creatureCount(){return life.length+decorLife.length+shoal.length},get position(){return player.p.slice()},get auto(){return auto},get seen(){return persistent.seen.slice()},get photos(){return persistent.photos.length},get modal(){return modal},get view(){return settings.third?'third':'first'},get audio(){return oceanAudio.status},get input(){return {move:stick.slice(),look:lookStick.slice(),vertical:verticalInput}},get lighting(){return settings.lighting}};
 }catch(e){handleFailure(e);}}
window.addEventListener('error',e=>{if(!ready)handleFailure(e.error||new Error(e.message));});

window.__renderView=(p,aim,time=8)=>{window.__freeze=true;t=time;active=true;player.p=p.slice();let f=V.sub(aim,p);player.yaw=Math.atan2(f[0],-f[2]);player.pitch=Math.atan2(f[1],Math.hypot(f[0],f[2]));updateLife(t);updateCamera();applyVisualSettings();renderer.forceShadow=true;renderer.render(eye,target,t);$('welcome').classList.add('hidden');$('hud').classList.remove('hidden');visited=new Set(LANDMARKS.map(x=>x.id));checkLandmarks();updateHUD();return {submittedTriangles:Math.round(renderer.submittedTriangles||0),batches:renderer.batches.length};};
window.__prepareView=async(p,aim,time=8)=>{window.__renderView(p,aim,time);if(renderer.sceneStream)await renderer.sceneStream.ready(eye);return window.__renderView(p,aim,time);};
