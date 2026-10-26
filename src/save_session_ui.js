/* One live document owns the voyage, journal and photographic library together.
 * Web Locks exclude current builds; snapshots detect cooperating storage changes
 * from old builds, which cannot themselves be made lock-aware after publication. */
const oceanSaveGuard=(()=>{
 const tracked=[STORE_KEY,STORE_KEY+'.backup',VOYAGE_KEY,VOYAGE_KEY+'.backup'],known=new Map();
 let live=false,started=false,ending=null,conflicted=false,preflight=null;
 const gate=()=>$('saveSessionGate');
 function show(reason){
  const startup=reason==='startup',recovery=reason==='recovery',conflict=reason==='conflict',unsupported=reason==='unavailable',retired=reason==='retired';
  $('loading').classList.add('hidden');
  $('saveSessionTitle').textContent=recovery?'匯入未能完整還原':conflict?'航程已在其他分頁變更':unsupported?'這個瀏覽器無法保護航程':retired?'重新讀取航程，再繼續探索':'航程正在另一個分頁使用';
  $('saveSessionMessage').textContent=recovery?'已在本頁保留匯入前的航程與照片。請先匯出本頁備份，確認下載後再重新讀取；瀏覽器中的存檔尚未完整還原。':conflict?'已停止本頁保存，避免覆蓋其他分頁的進度。請先匯出本頁備份，再關閉其他 Ocean 分頁並重新讀取。':unsupported?'請使用最新版 Chrome、Safari 或 Firefox 開啟正式網站，再重新嘗試。本頁尚未更動你的存檔。':retired?'這個分頁已暫停使用存檔。重新讀取會取得最新進度；若有待保存照片，請先匯出備份。':'請先關閉另一個分頁，再按「重新讀取航程」。這個分頁尚未載入遊戲，也不會覆蓋你的進度。更新版本後也請關閉舊版分頁。';
  if(startup){$('saveSessionTitle').textContent='暫時無法讀取航程';$('saveSessionMessage').textContent='目前無法確認存檔是否完整，已暫停載入以保護進度。請重新讀取再試；若有未完成的匯入紀錄，也可以先下載匯入前的完整備份。';}
  $('saveSessionExport').hidden=!started&&!startup;
  $('saveSessionRetry').onclick=()=>location.reload();
  $('saveSessionExport').onclick=async()=>{const button=$('saveSessionExport'),status=$('saveSessionStatus');button.disabled=true;status.textContent='正在整理備份…';try{if(startup){downloadSaveArchive(await oceanPhotography.recoveryArchive());status.textContent='匯入前的備份下載已建立，請確認檔案已儲存。';}else status.textContent=await exportSave()?'備份下載已建立，請確認檔案已儲存。':'完整備份未能匯出，請保留這個分頁再試。';}catch(error){status.textContent='完整備份未能匯出：'+error.message;}finally{button.disabled=false;}};
  if(!gate().open)gate().showModal();
  $('saveSessionRetry').focus();
 }
 function stop(){
  if(typeof oceanFeatures!=='undefined')oceanFeatures.call('sessionEnded');
  if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.disconnect();
  live=false;
  if(active)voyage.state.resume={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,seconds:diveSeconds};
  ready=false;active=false;
  if(started){resetInput();releaseMouseLook();oceanAudio.pause();}
 }
 function drain(){return Promise.allSettled([preflight,oceanPhotography.whenIdle(),voyage.importDone]).then(()=>oceanSaveSession.close());}
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
 function snapshot(){check();return tracked.map(key=>[key,localStorage.getItem(key)]);}
 function restoreImport(before,after){
  oceanSaveSession.assertHeld();
  const valid=rows=>Array.isArray(rows)&&rows.length===tracked.length&&tracked.every(key=>rows.filter(row=>Array.isArray(row)&&row.length===2&&row[0]===key&&(row[1]===null||typeof row[1]==='string')).length===1);
  if(!valid(before)||!valid(after))throw new Error('匯入恢復紀錄不完整');
  const old=new Map(before),next=new Map(after);
  for(const key of tracked){const value=localStorage.getItem(key);if((known.has(key)&&known.get(key)!==value)||(value!==old.get(key)&&value!==next.get(key)))throw new SaveSessionError('conflict');}
  for(const [key,value]of before){oceanSaveSession.assertHeld();if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);known.set(key,value);}
 }
 function leave(){
  if(ending)return;
  if(!started){stop();if(preflight)ending=drain();else oceanSaveSession.close();return;}
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
  live=true;
  try{preflight=oceanPhotography.recoverImport();await preflight;}
  catch(error){stop();oceanSaveSession.retire();show('startup');$('saveSessionStatus').textContent=error.name==='QuotaExceededError'?'裝置儲存空間不足，請先下載備份，再清出空間後重試。':error.name==='SecurityError'?'瀏覽器目前禁止讀取本機資料，請確認網站儲存權限後重試。':error.message;ending=drain();return false;}
  finally{preflight=null;}
  return live;
 }
 return {start,check,write,snapshot,restoreImport,leave,recoveryFailed(){stop();oceanSaveSession.retire();show('recovery');ending=drain();},get live(){return live;},loaded(){started=true;}};
})();

/* Event-driven save feedback. Read failures retain the ownership lease so a
 * validated import can repair them through the existing transaction. */
const oceanSaveHealth=(()=>{
 let mounted=false;
 const readable=()=>!(typeof voyage!=='undefined'&&voyage.storageLoaded===false)&&!(typeof journalStorage!=='undefined'&&journalStorage.loaded===false);
 function pending(){const parts=[];if(typeof voyage!=='undefined'&&!voyage.storageOK)parts.push('航程');if(typeof storageOK!=='undefined'&&!storageOK)parts.push('圖鑑與設定');return parts;}
 function refresh(){
  if(!mounted)return;
  const blocked=!readable(),parts=pending(),notice=$('saveHealthNotice'),gate=$('saveLoadGate');
  notice.hidden=blocked||!parts.length;
  const message=parts.length?parts.join('、')+'尚未保存':'';
  if($('saveHealthLabel').textContent!==message)$('saveHealthLabel').textContent=message;
  const footer=blocked?'舊航程尚未讀取 · 原檔已保留':message||'自動保存在此瀏覽器 · 可匯出備份';
  if($('saveStatus').textContent!==footer)$('saveStatus').textContent=footer;
  const detail=$('saveHealthDetail');if(detail){detail.hidden=!parts.length;$('saveHealthDetailText').textContent=message+'。本頁仍保留最新成果，請重試保存或匯出完整存檔後再離開。';}
  if(blocked&&!gate.open&&!voyage.importing){gate.showModal();$('saveLoadRetry').focus();}
  if(!blocked&&gate.open)gate.close();
 }
 function mountPanel(){
  const section=document.createElement('section');section.id='saveHealthDetail';section.className='save-health-detail';
  section.innerHTML='<h3>本頁有尚未保存的成果</h3><p id="saveHealthDetailText" role="status"></p><button id="saveHealthRetry" class="muted-btn">重試保存</button>';
  $('panelBody').prepend(section);
  $('saveHealthRetry').onclick=()=>{const a=saveVoyage(),b=persist();refresh();toast(a&&b?'本頁航程與圖鑑已保存。':'仍未完整保存；請匯出完整存檔後再離開。');};refresh();
 }
 function downloadRaw(){
  const records=[VOYAGE_KEY,VOYAGE_KEY+'.backup',STORE_KEY,STORE_KEY+'.backup'].map(key=>{
   try{const raw=localStorage.getItem(key);return {key,status:raw===null?'missing':'read',raw};}
   catch(error){return {key,status:'unavailable',error:{name:error.name,message:error.message}};}
  });
  const data={format:'return-blue/storage-rescue',version:1,exported:new Date().toISOString(),includesPhotoOriginals:false,records};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  try{download(url,'Return-to-the-Blue-raw-storage.json');$('saveLoadStatus').textContent=records.some(r=>r.status==='unavailable')?'已建立部分原始資料下載；無法讀取的項目已標示。不含照片原圖。':'已建立原始資料下載。不含照片原圖，也不是可直接匯入的完整存檔。';}
  finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
 }
 function init(){
  mounted=true;
  $('saveHealthNotice').onclick=()=>{openPanel('voyage');$('saveHealthRetry')?.focus();};
  $('saveLoadGate').addEventListener('cancel',event=>event.preventDefault());
  $('saveLoadRetry').onclick=()=>location.reload();
  $('saveLoadRaw').onclick=()=>{try{downloadRaw();}catch(error){$('saveLoadStatus').textContent='下載未能建立：'+error.message;}};
  $('saveLoadChoose').onclick=()=>$('saveLoadImport').click();
  $('saveLoadImport').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;await importSaveFile(file);refresh();if(!readable())$('saveLoadStatus').textContent=$('toast').textContent;};
  refresh();
 }
 return {readable,refresh,mountPanel,init};
})();
