/* Original film/development workflow. Capacities are authored limits, not Wii values.
 * IndexedDB stores unchanged JPEG bytes and their manifest in one transaction.
 * Voyage/localStorage contains metadata only after durable migration succeeds. */
const PhotographyRules=(()=>{
 const limits=Object.freeze({film:20,album:120,bytes:96*1024*1024,imageBytes:8*1024*1024});
 const initial=()=>({schema:1,revision:0,film:[],album:[]});
 const finite=(n,a,b,f=0)=>Number.isFinite(n)?Math.max(a,Math.min(b,n)):f;
 function metadata(p){
  if(!p||!Number.isSafeInteger(p.date)||p.date<=0)return null;
  const m={date:p.date,area:String(p.area||'海域').slice(0,70),species:String(p.species||'海底風景').slice(0,60),individual:typeof p.individual==='string'?p.individual.slice(0,70):null,grade:Math.round(finite(p.grade,0,100)),bytes:Math.round(finite(p.bytes,0,limits.imageBytes))};
  if(p.pinned===true)m.pinned=true;if(typeof p.knowledgeEligible==='boolean')m.knowledgeEligible=p.knowledgeEligible;
  if(p.camera){const c=p.camera;m.camera={mode:['lens','macro'].includes(c.mode)?c.mode:'normal',zoom:finite(c.zoom,8,90,69),aperture:finite(c.aperture,0,16),focus:finite(c.focus,0,80),exposure:finite(c.exposure,-1.5,1.5)};}
  if(p.metrics){m.metrics={};for(const k of ['framing','scale','steady','light','distance'])if(Number.isFinite(p.metrics[k]))m.metrics[k]=finite(p.metrics[k],0,k==='distance'?110:100);}
  return m;
 }
 function jpegBlob(url){
  if(typeof url!=='string'||url.length>limits.imageBytes*4/3+64||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))throw new Error('照片不是支援的 JPEG 檔案');
  const binary=atob(url.slice(url.indexOf(',')+1));if(binary.length<4||binary.charCodeAt(0)!==255||binary.charCodeAt(1)!==216||binary.charCodeAt(binary.length-2)!==255||binary.charCodeAt(binary.length-1)!==217)throw new Error('JPEG 照片資料不完整');
  const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:'image/jpeg'});
 }
 function sanitize(raw){const s=initial(),seen=new Set();if(!raw||typeof raw!=='object')return s;s.revision=Math.floor(finite(raw.revision,0,1e12));for(const [key,max]of [['album',limits.album],['film',limits.film]])for(const p of (Array.isArray(raw[key])?raw[key]:[]).slice(0,max)){const m=metadata(p);if(m&&!seen.has(m.date)){seen.add(m.date);if(key==='film')delete m.pinned;s[key].push(m);}}return s;}
 function total(s){return [...s.film,...s.album].reduce((n,p)=>n+p.bytes,0);}
 function canCapture(s,bytes){return s.film.length<limits.film&&bytes>0&&bytes<=limits.imageBytes&&total(s)+bytes<=limits.bytes;}
 function developed(s,dates){const wanted=new Set(dates),chosen=s.film.filter(p=>wanted.has(p.date));if(!chosen.length||s.album.length+chosen.length>limits.album)return null;return {...s,revision:s.revision+1,film:s.film.filter(p=>!wanted.has(p.date)),album:[...s.album,...chosen]};}
 function removed(s,date,pinned){if(pinned.has(date)||s.album.some(p=>p.date===date&&p.pinned))return null;if(![...s.film,...s.album].some(p=>p.date===date))return null;return {...s,revision:s.revision+1,film:s.film.filter(p=>p.date!==date),album:s.album.filter(p=>p.date!==date)};}
 return {limits,initial,metadata,jpegBlob,sanitize,total,canCapture,developed,removed};
})();
const oceanPhotography=(()=>{
 'use strict';
 const R=PhotographyRules,DB_NAME='return-blue.photographs.1',STORE='records',RECOVERY_STORE='recovery',IMPORT_ID='@import',RESCUE_ID='@rescue';
 let db=null,initialized=false,initializing=null,durable=false,busy=false,pending=0,lastError='',recovery=null,recoveryStored=false,selection=new Set(),tab='film',queue=Promise.resolve(),cache=new Map();
 const state=()=>oceanFeatures.state('photography'),copy=value=>JSON.parse(JSON.stringify(value));
 const entries=s=>[...s.film,...s.album];
 const describe=error=>error?.name==='QuotaExceededError'?'裝置儲存空間不足':error?.name==='SecurityError'?'瀏覽器禁止照片資料庫':error?.message||'照片資料庫暫時無法使用';
 const serialize=fn=>{pending++;busy=true;const next=queue.then(fn).finally(()=>{pending--;busy=pending>0;});queue=next.catch(()=>{});return next;};
 function openDB(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(new Error('瀏覽器不支援照片資料庫'));return;}const request=indexedDB.open(DB_NAME,2);request.onupgradeneeded=()=>{try{oceanSaveSession.assertWritable();if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});if(!request.result.objectStoreNames.contains(RECOVERY_STORE))request.result.createObjectStore(RECOVERY_STORE,{keyPath:'id'});}catch(error){request.transaction.abort();reject(error);}};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('其他分頁正在使用照片資料庫，請關閉後重試'));request.onsuccess=()=>{db=request.result;db.onversionchange=()=>{db.close();db=null;durable=false;lastError='照片資料庫已在另一分頁更新，請重新載入';};resolve(db);};});}
 async function database(){if(!db)await openDB();return db;}
 async function readAll(){const connection=await database();return new Promise((resolve,reject)=>{const tx=connection.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error||new Error('照片讀取已取消'));});}
 async function readRecovery(id){const connection=await database();return new Promise((resolve,reject)=>{const tx=connection.transaction(RECOVERY_STORE,'readonly'),request=tx.objectStore(RECOVERY_STORE).get(id);let record;request.onsuccess=()=>{record=request.result;};request.onerror=()=>reject(request.error);tx.oncomplete=()=>resolve(record||null);tx.onabort=()=>reject(tx.error||new Error('匯入復原資料讀取已取消'));});}
 const readImport=()=>readRecovery(IMPORT_ID);
 function validateRescue(record){if(!record||record.id!==RESCUE_ID||!R.metadata(record.photo)||!(record.blob instanceof Blob)||record.blob.size<4||record.blob.size>R.limits.imageBytes)throw new Error('待救援原圖資料無效');return record;}
 function importKeys(){return [STORE_KEY,STORE_KEY+'.backup',VOYAGE_KEY,VOYAGE_KEY+'.backup'];}
 function validatePlan(plan){
  const keys=importKeys();for(const values of [plan?.before,plan?.after])if(!Array.isArray(values)||values.length!==keys.length||values.some((entry,index)=>!Array.isArray(entry)||entry.length!==2||entry[0]!==keys[index]||(entry[1]!==null&&typeof entry[1]!=='string')))throw new Error('匯入復原快照無效');
  return {before:plan.before.map(entry=>entry.slice()),after:plan.after.map(entry=>entry.slice())};
 }
 function validatePhotoState(photoState){
  if(!photoState||photoState.schema!==1||!Number.isSafeInteger(photoState.revision)||photoState.revision<0||!Array.isArray(photoState.film)||!Array.isArray(photoState.album)||photoState.film.length>R.limits.film||photoState.album.length>R.limits.album)throw new Error('匯入復原相簿索引無效');
  const dates=new Set();for(const photo of entries(photoState)){if(!R.metadata(photo)||dates.has(photo.date))throw new Error('匯入復原照片識別無效');dates.add(photo.date);}return photoState;
 }
 function validateMarker(marker){
  if(!marker||marker.id!==IMPORT_ID||marker.schema!==1||typeof marker.token!=='string'||!marker.token||!Number.isSafeInteger(marker.revision)||marker.revision<1||!Array.isArray(marker.records)||marker.records.length>R.limits.film+R.limits.album+1)throw new Error('匯入復原資料不完整或版本不相容');
  validatePlan(marker);const ids=new Set();let bytes=0;
  for(const record of marker.records){if(!record||typeof record.id!=='string'||ids.has(record.id))throw new Error('匯入復原照片識別無效');ids.add(record.id);if(record.id==='@library')validatePhotoState(record.state);
   else{if(!/^p-[1-9][0-9]*$/.test(record.id)||!(record.blob instanceof Blob)||record.blob.size<4||record.blob.size>R.limits.imageBytes)throw new Error('匯入復原原圖無效');bytes+=record.blob.size;}}
  if(bytes>R.limits.bytes)throw new Error('匯入復原原圖超過容量');return marker;
 }
 async function stageImport(s,puts,expected,plan,incomingRecovery){
  oceanSaveSession.assertWritable();const snapshots=validatePlan(plan),connection=await database();oceanSaveSession.assertWritable();
  const marker={id:IMPORT_ID,schema:1,token:crypto.randomUUID(),revision:s.revision,...snapshots,records:[]};
  const rescueRecord=incomingRecovery?{id:RESCUE_ID,photo:R.metadata(incomingRecovery),blob:toBlob(incomingRecovery.url)}:null;
  if(rescueRecord)rescueRecord.photo.bytes=rescueRecord.blob.size;
  return new Promise((resolve,reject)=>{
   const tx=connection.transaction([STORE,RECOVERY_STORE],'readwrite',{durability:'strict'}),records=tx.objectStore(STORE),recoveryStore=tx.objectStore(RECOVERY_STORE);
   const pending=recoveryStore.get(IMPORT_ID),rescue=recoveryStore.get(RESCUE_ID),original=records.getAll();let failure=null,remaining=3;
   const received=()=>{
    if(--remaining)return;
    try{
     oceanSaveSession.assertWritable();
     if(pending.result)throw new Error('先前匯入尚未完成復原');
     if(rescue.result)throw new Error('請先保存或下載並處理待救援照片，再匯入存檔');
     if((original.result.find(r=>r.id==='@library')?.state?.revision??null)!==expected)throw new Error('另一個分頁已更新相簿；無法套用匯入');
     if(marker.before.some(([key,value])=>localStorage.getItem(key)!==value))throw new Error('匯入前的航程快照已變更');
     marker.records=original.result;validateMarker(marker);
     records.clear();for(const record of puts)records.put(record);records.put({id:'@library',state:copy(s)});
     recoveryStore.put(marker);if(rescueRecord)recoveryStore.put(rescueRecord);
    }catch(error){failure=error;tx.abort();}
   };
   pending.onsuccess=received;rescue.onsuccess=received;original.onsuccess=received;
   tx.oncomplete=()=>resolve(marker);tx.onabort=()=>reject(failure||tx.error||new Error('匯入復原資料未能保存'));tx.onerror=()=>{};
  });
 }
 // `apply` is synchronous: it can enqueue requests in this transaction, never
 // await another API and accidentally let the transaction auto-commit.
 async function importTransaction(marker,mode,apply,{writable=false}={}){
  const assertOwnership=()=>writable?oceanSaveSession.assertWritable():oceanSaveSession.assertHeld();
  assertOwnership();validateMarker(marker);const connection=await database();assertOwnership();
  return new Promise((resolve,reject)=>{
   const tx=connection.transaction([STORE,RECOVERY_STORE],mode,mode==='readwrite'?{durability:'strict'}:{}),records=tx.objectStore(STORE),recoveryStore=tx.objectStore(RECOVERY_STORE);
   const pending=recoveryStore.get(IMPORT_ID),library=records.get('@library');let failure=null,remaining=2;
   const received=()=>{
    if(--remaining)return;
    try{
     assertOwnership();const current=validateMarker(pending.result);
     if(current.token!==marker.token||current.revision!==marker.revision)throw new Error('匯入復原紀錄已變更');
     if(library.result?.state?.revision!==marker.revision)throw new Error('另一個分頁已更新相簿；匯入尚未完成');
     apply({records,recoveryStore,current});
    }catch(error){failure=error;tx.abort();}
   };
   pending.onsuccess=received;library.onsuccess=received;
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure||tx.error||new Error('匯入復原資料未能更新'));tx.onerror=()=>{};
  });
 }
 function finishImport(marker){return importTransaction(marker,'readwrite',({recoveryStore})=>{
  if(marker.after.some(([key,value])=>localStorage.getItem(key)!==value))throw new Error('匯入航程尚未完整保存');
  recoveryStore.delete(IMPORT_ID);
 },{writable:true});}
 async function rollbackImport(marker){
  await importTransaction(marker,'readonly',()=>{});
  // The durable undo survives every local write. Only the final photographic
  // transaction removes it, so a second interruption repeats the same recovery.
  oceanSaveGuard.restoreImport(marker.before,marker.after);
  await importTransaction(marker,'readwrite',({records,recoveryStore,current})=>{
   if(marker.before.some(([key,value])=>localStorage.getItem(key)!==value))throw new Error('匯入前的航程尚未完整還原');
   records.clear();for(const record of current.records)records.put(record);
   recoveryStore.delete(IMPORT_ID);recoveryStore.delete(RESCUE_ID);
  });
 }
 function recoverImport(){return serialize(async()=>{oceanSaveSession.assertWritable();const marker=await readImport();if(!marker)return false;await rollbackImport(marker);return true;});}

 async function recoveryArchive(){
  const marker=validateMarker(await readImport()),before=new Map(marker.before);
  const parse=(key,fallback,read)=>{let present=false;for(const candidate of [key,key+'.backup'])try{const raw=before.get(candidate);if(raw!==null&&raw!==undefined){present=true;const value=JSON.parse(raw);read(value);return value;}}catch(_){}if(present)throw new Error('匯入前的航程或日誌快照無法讀取，無法產生完整備份');return fallback;};
  const journal=parse(STORE_KEY,{seen:[],photos:[],log:[],settings:{}},readJournal),voyageSnapshot=parse(VOYAGE_KEY,{schema:1,features:{}},readVoyage),stored=marker.records.find(r=>r.id==='@library')?.state;
  const photoState=copy(validatePhotoState(stored||voyageSnapshot.features?.photography||R.initial())),images=await hydrate(marker.records,photoState),legacy=new Map((Array.isArray(journal.photos)?journal.photos:[]).filter(p=>p&&typeof p.url==='string').map(p=>[p.date,p]));
  if(!stored&&!entries(photoState).length){photoState.album=[...legacy.values()].map(R.metadata);validatePhotoState(photoState);}
  const originals=[];for(const p of entries(photoState)){const image=images.get(p.date)||legacy.get(p.date);if(!image)throw new Error('匯入前的照片 '+p.date+' 原檔遺失，無法產生完整備份');toBlob(image.url);originals.push({date:p.date,url:image.url});}
  voyageSnapshot.features={...voyageSnapshot.features,photography:copy(photoState)};
  return {format:'return-blue/save',version:1,exported:new Date().toISOString(),voyage:voyageSnapshot,journal,photography:{schema:1,state:photoState,images:originals,recovery:null}};
 }

 async function write(s,puts=[],deletes=[],replace=false,expected=state().revision,clearRecovery=false){const assertOwnership=()=>oceanSaveSession.assertWritable();assertOwnership();const connection=await database();assertOwnership();return new Promise((resolve,reject)=>{
  const tx=connection.transaction([STORE,RECOVERY_STORE],'readwrite'),store=tx.objectStore(STORE);let failure=null;
  const apply=()=>{const request=store.get('@library');request.onsuccess=()=>{try{assertOwnership();const revision=request.result?.state?.revision??null;if(revision!==expected){const error=new Error('另一個分頁已更新相簿；請重新連接照片資料庫後重試');error.name='PhotoConflictError';durable=false;throw error;}if(replace)store.clear();for(const id of deletes)store.delete(id);for(const record of puts)store.put(record);store.put({id:'@library',state:copy(s)});if(clearRecovery)tx.objectStore(RECOVERY_STORE).delete(RESCUE_ID);}catch(error){failure=error;tx.abort();}};};
  {const pending=tx.objectStore(RECOVERY_STORE).get(IMPORT_ID);pending.onsuccess=()=>{try{assertOwnership();if(pending.result)throw new Error('先前匯入尚未完成復原');apply();}catch(error){failure=error;tx.abort();}};}
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure||tx.error||new Error('照片保存已取消'));tx.onerror=()=>{};
 });}

 const toBlob=R.jpegBlob;
 function toURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
 async function hydrate(records,s){const images=new Map(records.filter(r=>r.blob instanceof Blob).map(r=>[r.id,r.blob])),next=new Map();for(const p of entries(s)){const blob=images.get('p-'+p.date);if(blob)next.set(p.date,{...p,url:await toURL(blob)});}return next;}
 function adopt(s,images=cache){voyage.state.features.photography=s;cache=images;persistent.photos=s.album.map(p=>cache.get(p.date)).filter(Boolean);durable=true;}
 function saved(){const result={voyage:saveVoyage(),journal:persist()};if(!result.voyage||!result.journal)toast('照片原圖已保存；航程或圖鑑尚未完整保存，請保留此視窗並匯出備份。');return result;}
 function report(error){lastError=describe(error);toast(lastError+'。照片未被刪除；可在沖印桌重試或下載救援照片。');refresh();}
 function journalSnapshot(journal){return durable?{...journal,photos:state().album.map(p=>({...p}))}:journal;}
 function init(){
  if(initializing)return initializing;if(initialized)return Promise.resolve();
  // Migration and hydration participate in the same drain as captures, so the
  // session cannot release its lock while initialization still owns a write.
  initializing=serialize(async()=>{initialized=true;installUI();
  if(typeof oceanSaveHealth!=='undefined'&&!oceanSaveHealth.readable()){durable=false;lastError='航程或圖鑑尚未安全讀取，照片資料庫尚未載入；請先還原備份。';return;}
  const legacy=[],s=state();let invalidLegacy=false;for(const p of persistent.photos){if(!p?.url)continue;try{const m=R.metadata(p);if(!m)throw new Error('舊照片識別無效');toBlob(p.url);legacy.push(p);cache.set(m.date,{...m,url:p.url});}catch(_){invalidLegacy=true;}}
  try{if(await readImport())throw new Error('先前匯入尚未完成復原');const savedRescue=await readRecovery(RESCUE_ID);if(savedRescue)validateRescue(savedRescue);const records=await readAll(),stored=records.find(r=>r.id==='@library')?.state;let next=stored?R.sanitize(stored):R.sanitize(s),changed=false,puts=[];const ids=new Set(entries(next).map(p=>p.date)),storedImages=new Set(records.filter(r=>r.blob instanceof Blob).map(r=>r.id));
   // Old developed photographs stay developed, including all submitted attachments.
   for(const p of legacy){if(ids.has(p.date)){if(!storedImages.has('p-'+p.date)){const blob=toBlob(p.url),existing=entries(next).find(m=>m.date===p.date);if(R.total(next)-existing.bytes+blob.size>R.limits.bytes)throw new Error('舊相簿超過儲存上限，尚未搬移');existing.bytes=blob.size;puts.push({id:'p-'+p.date,blob});changed=true;}continue;}if(next.album.length>=R.limits.album)throw new Error('舊相簿超過容量，尚未搬移；請先匯出舊存檔');const blob=toBlob(p.url),m=R.metadata({...p,bytes:blob.size});if(!m)continue;if(R.total(next)+blob.size>R.limits.bytes)throw new Error('舊相簿超過儲存上限，尚未搬移');next.album.push(m);puts.push({id:'p-'+m.date,blob});ids.add(m.date);changed=true;}
   for(const p of next.album)if(oceanFeatures.retainedPhotoDates().has(p.date)&&!p.pinned){p.pinned=true;changed=true;}
   if(changed||!stored){next.revision++;await write(next,puts,[],false,stored?.revision??null);}
   const images=await hydrate([...records.filter(r=>!puts.some(p=>p.id===r.id)),...puts],next);adopt(next,images);if(savedRescue)recovery={...savedRescue.photo,url:await toURL(savedRescue.blob)};recoveryStored=!!savedRescue;lastError=entries(next).some(p=>!images.has(p.date))?'有照片原檔遺失；請匯入包含原圖的備份，缺失紀錄仍保留。':invalidLegacy?'部分舊照片資料損壞，已保留其餘可讀取的原圖。':'';saved();
  }catch(error){durable=false;lastError=describe(error);if(!entries(state()).length&&legacy.length)voyage.state.features.photography=R.sanitize({album:legacy});toast('舊照片保留原樣；'+lastError+'。');}
  }).finally(()=>{initializing=null;});return initializing;
 }
 function nextDate(){let date=Date.now();const used=new Set([...entries(state()).map(p=>p.date),...(recovery?[recovery.date]:[])]);while(used.has(date))date++;return date;}
 function blockedReason(){return recovery?'上一張照片尚未保存，請先到沖印桌救援':!durable?'照片資料庫未就緒，請到沖印桌重試保存':state().film.length>=R.limits.film?'20 張底片已滿，請回船沖印或整理':R.total(state())>=R.limits.bytes?'照片儲存容量已滿，請先整理':'';}
 function canCapture(){return !busy&&!blockedReason();}
 function capture(photo){return serialize(async()=>{
  if(recovery){toast('上一張尚未保存。請到沖印桌下載或重試，再拍下一張。');return false;}
  let blob,m;
  try{if(!durable)throw new Error('照片資料庫未就緒，請在沖印桌重新連接');blob=toBlob(photo.url);let date=photo.date;const used=new Set(entries(state()).map(p=>p.date));while(used.has(date))date++;photo.date=date;m=R.metadata({...photo,bytes:blob.size,pinned:false});if(!m)throw new Error('照片識別無效');if(!R.canCapture(state(),blob.size))throw new Error(state().film.length>=R.limits.film?'底片已滿，請回船沖印或整理':state().album.length>=R.limits.album?'相簿已滿，請先下載並整理':'照片儲存容量不足，請先整理');
   const s={...state(),revision:state().revision+1,film:[...state().film,m]};await write(s,[{id:'p-'+m.date,blob}],[],false,state().revision,true);cache.set(m.date,{...m,url:photo.url});adopt(s);recoveryStored=false;lastError='';let progressError=null;try{recordPhotoProgress(photo);}catch(error){progressError=error;console.error('Photograph progress update failed',error);}const progress=saved();if(progressError)toast('原圖已保存；航程進度更新失敗，請保留此視窗並匯出備份。');else if(progress.voyage&&progress.journal)toast('底片已保存 · 回研究船選片沖印');refresh();return true;
  }catch(error){recovery={...photo,...(m||{})};report(error);return false;}
 });}
 async function develop(dates){return serialize(async()=>{if(active){toast('回到研究船後才能沖印。');return false;}const s=R.developed(state(),dates);if(!s){toast('請選擇底片，並確認相簿有足夠空位。');return false;}if(dates.some(date=>!cache.has(date))){toast('選取照片缺少原檔，請先還原備份。');return false;}try{await write(s);adopt(s);selection.clear();lastError='';const progress=saved();if(progress.voyage&&progress.journal)toast('沖印完成 · 已收入相簿，可用於投稿');refresh();return true;}catch(error){report(error);return false;}});}
 function pin(date){return serialize(async()=>{if(!state().album.some(p=>p.date===date)||!cache.has(date)){toast('投稿照片缺少已沖印原檔。');return false;}const s={...state(),revision:state().revision+1,album:state().album.map(p=>p.date===date?{...p,pinned:true}:p)};try{await write(s);adopt(s);saved();return true;}catch(error){report(error);return false;}});}
 function erase(date){return serialize(async()=>{const s=R.removed(state(),date,oceanFeatures.retainedPhotoDates());if(!s){toast('已投稿的照片會保留為信件附件，不能刪除。');return false;}try{await write(s,[],['p-'+date]);cache.delete(date);adopt(s);selection.delete(date);saved();refresh();return true;}catch(error){report(error);return false;}});}
 function exportArchive(){return serialize(async()=>{
  // Export this document's coherent snapshot; a retired document must never
  // replace its remaining originals with another session's library.
  if(durable&&oceanSaveSession.writable){const records=await readAll(),manifest=records.find(r=>r.id==='@library')?.state;if(!manifest)throw new Error('照片資料庫缺少索引，請重新連接後重試');if(manifest.revision!==state().revision)throw new Error('另一個分頁已更新相簿；目前照片仍保留在此分頁，請先下載需要的原圖，再重新載入。');}
  const s=copy(state()),images=[];for(const p of entries(s)){const photo=cache.get(p.date);if(!photo)throw new Error('照片 '+p.date+' 缺少原檔，無法產生完整備份');images.push({date:p.date,url:photo.url});}return {schema:1,state:s,images,recovery:recovery?{...recovery}:null};
 });}
 async function prepareImport(archive,legacy=[],expected=null,requiredPins=[]){
  await queue;if(recovery)throw new Error('請先下載或保存待救援照片，再匯入存檔');let s,photos;
  if(archive){if(archive.schema!==1||!archive.state||!Array.isArray(archive.state.film)||!Array.isArray(archive.state.album)||!Array.isArray(archive.images))throw new Error('照片備份版本不相容');if(archive.images.length>R.limits.film+R.limits.album||archive.state.film?.length>R.limits.film||archive.state.album?.length>R.limits.album)throw new Error('照片備份超過本作容量');s=R.sanitize(archive.state);if(entries(s).length!==(archive.state.film?.length||0)+(archive.state.album?.length||0))throw new Error('照片備份含重複或無效識別');photos=archive.images;
  }else{if(expected&&entries(R.sanitize(expected)).length)throw new Error('存檔缺少照片原圖備份，沒有更動相簿');s=R.initial();photos=legacy.filter(p=>p?.url);if(photos.length>R.limits.album)throw new Error('舊相簿超過容量');s.album=photos.map(R.metadata);if(s.album.some(p=>!p))throw new Error('舊照片識別無效');}
  const byDate=new Map();for(const p of photos){if(byDate.has(p.date))throw new Error('照片備份含重複原檔');byDate.set(p.date,p);}
  for(const date of requiredPins){const p=s.album.find(p=>p.date===date);if(!p)throw new Error('存檔缺少已投稿的相簿附件');p.pinned=true;}
  if(byDate.size!==entries(s).length)throw new Error('照片索引與原圖數量不符');const puts=[],images=new Map();for(const p of entries(s)){const source=byDate.get(p.date);if(!source)throw new Error('照片備份缺少原圖');const blob=toBlob(source.url);if(globalThis.createImageBitmap){let decoded;try{decoded=await createImageBitmap(blob);if(!decoded.width||!decoded.height)throw new Error('empty');}catch{throw new Error('照片原圖無法解碼');}finally{decoded?.close();}}p.bytes=blob.size;puts.push({id:'p-'+p.date,blob});images.set(p.date,{...p,url:source.url});}if(R.total(s)>R.limits.bytes)throw new Error('照片備份超過 96 MiB 上限');
  let incomingRecovery=null;if(archive?.recovery){toBlob(archive.recovery.url);const m=R.metadata(archive.recovery);if(!m)throw new Error('救援照片識別無效');incomingRecovery={...m,url:archive.recovery.url};}
  const oldRecords=await readAll(),oldState=copy(state()),oldCache=new Map(cache),oldDurable=durable,oldManifest=oldRecords.find(r=>r.id==='@library')?.state;const expectedRevision=oldManifest?.revision??null;if(durable&&expectedRevision!==state().revision){durable=false;lastError='另一個分頁已更新相簿；請重新連接後再匯入';throw new Error(lastError);}s.revision=(expectedRevision??0)+1;let committed=false,importMarker=null;
  return {state:s,photos:s.album.map(p=>images.get(p.date)),async commit(plan){oceanSaveSession.assertWritable();importMarker=await stageImport(s,puts,expectedRevision,plan,incomingRecovery);committed=true;adopt(s,images);recovery=incomingRecovery;recoveryStored=!!incomingRecovery;selection.clear();lastError='';},async finish(){if(!committed)throw new Error('匯入尚未套用');await finishImport(importMarker);committed=false;},async rollback(){
   if(!committed)return;let restored=false;
   try{await rollbackImport(importMarker);restored=true;}
   finally{
    // The pre-import originals must remain exportable even when durable rollback
    // fails. Propagate that failure without mixing the old voyage with new photos.
    adopt(oldState,oldCache);durable=restored&&oldDurable;recovery=null;recoveryStored=false;committed=false;
    if(!restored)lastError='照片資料庫未能還原；原有照片仍保留在此分頁，請匯出備份後再重新載入。';
   }
  }};
 }
 function discardRecovery(){return serialize(async()=>{try{oceanSaveSession.assertWritable();if(recoveryStored)await write(copy(state()),[],[],false,state().revision,true);recovery=null;recoveryStored=false;lastError='';render();return true;}catch(error){report(error);return false;}});}
 async function retryStorage(){if(busy)return false;initialized=false;await init();refresh();return durable;}
 function refresh(){if(modal==='photography')render();}
 function view(date){const photo=cache.get(date);if(!photo){toast('這張照片的原檔遺失，請還原備份。');return false;}viewPhoto(photo);return true;}
 function saveImage(date){const photo=cache.get(date);if(!photo)return false;download(photo.url,'重返蔚藍-'+date+'.jpg');return true;}
 function render(){
  panelTitle('DARKROOM / PHOTOGRAPHIC ARCHIVE','把光，沖印成記憶');const s=state(),rows=s[tab],pinned=oceanFeatures.retainedPhotoDates();
  $('panelBody').innerHTML=`<p class="panel-note">${active?'海中先保存底片，回研究船後選擇沖印。':'選片沖印後收入相簿；已投稿照片會保留為信件附件。'}完整原圖存於這個瀏覽器，請定期匯出備份。</p><div class="photo-library-tabs"><button data-photo-tab="film" class="${tab==='film'?'selected':''}">底片 ${s.film.length} / ${R.limits.film}</button><button data-photo-tab="album" class="${tab==='album'?'selected':''}">相簿 ${s.album.length} / ${R.limits.album}</button></div><p class="photo-storage">${(R.total(s)/1048576).toFixed(1)} / 96 MiB · 原圖容量</p>${lastError?`<p class="feature-result" role="status">${safe(lastError)}</p>${!durable?'<button id="photoStorageRetry" class="muted-btn">重新連接照片資料庫</button>':''}`:''}${recovery?'<section class="photo-recovery"><b>一張照片尚未保存</b><p>請先下載原圖，或整理容量後重試。重新載入前請完成救援。</p><button id="photoRecoverDownload" class="primary">下載救援原圖</button><button id="photoRecoverRetry" class="muted-btn">重試保存</button><button id="photoRecoverDiscard" class="muted-btn">放棄這張</button></section>':''}${tab==='film'?`<div class="feature-toolbar"><button id="photoDevelop" class="primary" ${active||!selection.size?'disabled':''}>沖印選取的 ${selection.size} 張</button><button id="photoSelectAll" class="muted-btn" ${!rows.length?'disabled':''}>全選底片</button></div>`:''}<div class="photo-library-grid">${rows.slice().reverse().map(p=>{const image=cache.get(p.date),locked=tab==='album'&&(p.pinned||pinned.has(p.date));return `<article class="photo-library-item" data-photograph="${p.date}">${image?`<button class="photo-library-preview" data-photo-view="${p.date}"><img src="${image.url}" loading="lazy" alt="${safe(p.species)} · ${safe(p.area)}"></button>`:'<p class="photo-missing">原檔遺失 · 請還原備份</p>'}<div><b>${safe(p.species)}</b><small>${dateText(p.date)} · ${p.grade} 分</small>${tab==='film'?`<label class="photo-selection"><input type="checkbox" data-photo-select="${p.date}" ${selection.has(p.date)?'checked':''} ${!image?'disabled':''}> 選擇沖印</label>`:''}${locked?'<span class="feature-badge">已投稿 · 保留附件</span>':''}<div class="photo-item-actions"><button data-photo-download="${p.date}" ${!image?'disabled':''}>下載原圖</button><button data-photo-delete="${p.date}" ${locked?'disabled':''}>${tab==='film'?'捨棄底片':'刪除'}</button></div></div></article>`}).join('')||`<p class="empty">${tab==='film'?'在海裡按下快門，將第一道光留在底片上。':'回研究船，選擇底片並沖印收藏。'}</p>`}</div>`;
  $('panelBody').querySelectorAll('[data-photo-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.photoTab;render();});$('panelBody').querySelectorAll('[data-photo-view]').forEach(b=>b.onclick=()=>view(+b.dataset.photoView));$('panelBody').querySelectorAll('[data-photo-download]').forEach(b=>b.onclick=()=>saveImage(+b.dataset.photoDownload));$('panelBody').querySelectorAll('[data-photo-delete]').forEach(b=>b.onclick=async()=>{if(confirm('確定刪除這張照片？請先下載需要保留的原圖。'))await erase(+b.dataset.photoDelete);});$('panelBody').querySelectorAll('[data-photo-select]').forEach(input=>input.onchange=()=>{const date=+input.dataset.photoSelect;if(input.checked)selection.add(date);else selection.delete(date);const button=$('photoDevelop');button.disabled=active||!selection.size;button.textContent='沖印選取的 '+selection.size+' 張';});
  if($('photoDevelop'))$('photoDevelop').onclick=()=>develop([...selection]);if($('photoSelectAll'))$('photoSelectAll').onclick=()=>{selection=new Set(s.film.filter(p=>cache.has(p.date)).map(p=>p.date));render();};
  if($('photoStorageRetry'))$('photoStorageRetry').onclick=retryStorage;
  if(recovery){$('photoRecoverDownload').onclick=()=>download(recovery.url,'重返蔚藍-待保存-'+recovery.date+'.jpg');$('photoRecoverRetry').onclick=async()=>{const photo=recovery;recovery=null;await capture(photo);};$('photoRecoverDiscard').onclick=()=>{if(confirm('尚未保存的照片將無法復原，確定放棄？'))return discardRecovery();};}
 }
 function installUI(){
  if(document.getElementById('photographyStyle'))return;
  const style=document.createElement('style');style.id='photographyStyle';style.textContent='.photo-library-tabs{display:flex;gap:18px;border-bottom:1px solid #b6d2c433;margin:20px 0 12px}.photo-library-tabs button{padding:12px 3px;min-height:44px;font-size:13px;border-bottom:2px solid transparent}.photo-library-tabs button.selected{border-color:#d3ddae;color:#e1e7ce}.photo-storage{font:10px var(--mono);color:#92b5b6;line-height:1.8}.photo-library-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px}.photo-library-item{min-width:0;border-bottom:1px solid #b6d2c42e;padding-bottom:14px}.photo-library-preview{display:block;width:100%;padding:0;overflow:hidden;border-radius:4px}.photo-library-preview img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}.photo-library-item b{font:15px var(--serif);display:block;margin:10px 0 6px}.photo-library-item small{display:block;font-size:10px;color:#a2c0bd}.photo-selection{display:flex;align-items:center;gap:7px;min-height:44px;font-size:12px}.photo-selection input{width:19px;height:19px}.photo-item-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:7px}.photo-item-actions button{font-size:11px;min-height:44px}.photo-item-actions button:disabled{opacity:.45}.photo-missing{min-height:120px;display:grid;place-items:center;background:#082c36;color:#bdc6b8;font-size:12px}.photo-recovery{padding:18px 0;border-bottom:1px solid #d8bd70}.photo-recovery p{font-size:12px;line-height:1.7;color:#d3c9a3}.photo-recovery button{min-height:44px;margin:6px 8px 0 0}@media(max-width:420px){.photo-library-grid{gap:12px}.photo-library-item b{font-size:13px}.photo-item-actions{gap:9px}}';document.head.append(style);
  const oldJournal=renderJournal;renderJournal=function(type='species'){if(type==='photos'){oceanFeatures.open('photography');tab='album';render();return;}oldJournal(type);};oceanFeatures.addMenu({id:'photography',label:'沖印桌與相簿',panel:'photography'});
  window.addEventListener('beforeunload',event=>{if(recovery||busy){event.preventDefault();event.returnValue='';}});
 }
 const feature={id:'photography',retainPhotos(dates){for(const p of state().album)if(p.pinned)dates.push(p.date);},initial:R.initial,sanitize:R.sanitize,init,renderPanel(type){if(type!=='photography')return false;tab='film';render();return true;},endDive(){if(state().film.length)toast('回船了 · '+state().film.length+' 張底片等待選片沖印');},reset(){selection.clear();},};
 oceanFeatures.register(feature);
 return {feature,rules:R,capture,canCapture,blockedReason,nextDate,develop,pin,erase,view,saveImage,exportArchive,prepareImport,recoverImport,recoveryArchive,journalSnapshot,whenIdle:()=>queue,snapshot:()=>({durable,busy,error:lastError,recovery:!!recovery,film:state().film.length,album:state().album.length,images:cache.size}),get databaseName(){return DB_NAME}};
})();
