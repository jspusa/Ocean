/* One live document owns the voyage, journal and photographic library together.
 * Web Locks exclude current builds; snapshots detect cooperating storage changes
 * from old builds, which cannot themselves be made lock-aware after publication. */
const oceanSaveGuard=(()=>{
 const tracked=[STORE_KEY,VOYAGE_KEY,VOYAGE_KEY+'.backup'],known=new Map();
 let live=false,started=false,ending=null,conflicted=false;
 const gate=()=>$('saveSessionGate');
 function show(reason){
  const recovery=reason==='recovery',conflict=reason==='conflict',unsupported=reason==='unavailable',retired=reason==='retired';
  $('loading').classList.add('hidden');
  $('saveSessionTitle').textContent=recovery?'匯入未能完整還原':conflict?'航程已在其他分頁變更':unsupported?'這個瀏覽器無法保護航程':retired?'重新讀取航程，再繼續探索':'航程正在另一個分頁使用';
  $('saveSessionMessage').textContent=recovery?'已在本頁保留匯入前的航程與照片。請先匯出本頁備份，確認下載後再重新讀取；瀏覽器中的存檔尚未完整還原。':conflict?'已停止本頁保存，避免覆蓋其他分頁的進度。請先匯出本頁備份，再關閉其他 Ocean 分頁並重新讀取。':unsupported?'請使用最新版 Chrome、Safari 或 Firefox 開啟正式網站，再重新嘗試。本頁尚未更動你的存檔。':retired?'這個分頁已暫停使用存檔。重新讀取會取得最新進度；若有待保存照片，請先匯出備份。':'請先關閉另一個分頁，再按「重新讀取航程」。這個分頁尚未載入遊戲，也不會覆蓋你的進度。更新版本後也請關閉舊版分頁。';
  $('saveSessionExport').hidden=!started;
  $('saveSessionRetry').onclick=()=>location.reload();
  $('saveSessionExport').onclick=async()=>{const button=$('saveSessionExport'),status=$('saveSessionStatus');button.disabled=true;status.textContent='正在整理本頁備份…';try{status.textContent=await exportSave()?'備份下載已建立，請確認檔案已儲存。':'完整備份未能匯出，請保留這個分頁再試。';}finally{button.disabled=false;}};
  if(!gate().open)gate().showModal();
  $('saveSessionRetry').focus();
 }
 function stop(){
  live=false;
  if(active)voyage.state.resume={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,seconds:diveSeconds};
  ready=false;active=false;
  if(started){resetInput();releaseMouseLook();oceanAudio.pause();}
 }
 function drain(){return Promise.all([oceanPhotography.whenIdle(),voyage.importDone]).then(()=>oceanSaveSession.close(),()=>oceanSaveSession.close());}
 function conflict(){
  if(conflicted)return;
  conflicted=true;stop();oceanSaveSession.retire();show('conflict');ending=drain();
 }
 function check(){
  if(!oceanSaveSession.writable){if(started&&!ending){stop();show('retired');ending=drain();}oceanSaveSession.assertWritable();}
  for(const key of tracked)if(known.has(key)&&localStorage.getItem(key)!==known.get(key)){
   conflict();throw new SaveSessionError('conflict');
  }
 }
 function write(key,value){
  check();if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
  if(tracked.includes(key))known.set(key,value===null?null:String(value));
 }
 function leave(){
  if(ending)return;
  if(!started){stop();oceanSaveSession.close();return;}
  // Already-started import/photo work keeps the lock until its final rollback or
  // metadata save. A frozen task may wait; never transfer ownership on a timer.
  if(!voyage.importing){saveVoyage();persist();}
  stop();ending=drain();
 }
 async function start(){
  gate().addEventListener('cancel',event=>event.preventDefault());
  window.addEventListener('pagehide',leave);
  document.addEventListener('freeze',leave);
  window.addEventListener('pageshow',event=>{if(event.persisted){stop();show('retired');}});
  document.addEventListener('resume',()=>{if(ending){stop();show('retired');}});
  if(!await oceanSaveSession.acquire()){show(oceanSaveSession.status);return false;}
  try{for(const key of tracked)known.set(key,localStorage.getItem(key));}catch(_){/* Existing storage failure UI remains authoritative. */}
  window.addEventListener('storage',event=>{if(oceanSaveSession.writable&&(event.key===null||tracked.includes(event.key)))try{check();}catch(_){};});
  live=true;return true;
 }
 return {start,check,write,leave,recoveryFailed(){stop();oceanSaveSession.retire();show('recovery');ending=drain();},get live(){return live;},loaded(){started=true;}};
})();
