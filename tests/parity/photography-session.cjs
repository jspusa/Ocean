/* Exercise production photography and save-session modules through their public
 * APIs. Controlled browser boundaries provide IndexedDB/LockManager scheduling;
 * native browser transactions are covered by the browser suite. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/photography.js','utf8'),sessionSource=fs.readFileSync('src/save_session.js','utf8'),guardSource=fs.readFileSync('src/save_session_ui.js','utf8');
const appSource=fs.readFileSync('src/app.js','utf8'),voyageSource=fs.readFileSync('src/voyage.js','utf8'),featureSource=fs.readFileSync('src/features.js','utf8'),engineSource=fs.readFileSync('src/engine.js','utf8'),worldSource=fs.readFileSync('src/world.js','utf8');
// These production declarations validate archives without allocating WebGL.
const readers=[engineSource.slice(0,engineSource.indexOf('class Geometry')),worldSource.slice(0,worldSource.indexOf('const obstacles=')),appSource.slice(appSource.indexOf('const defaults='),appSource.indexOf('function nextPhotoDate(')),appSource.slice(appSource.indexOf('function readJournal('),appSource.indexOf('function applyJournal(')),voyageSource.slice(voyageSource.indexOf('const ORDERS='),voyageSource.indexOf('const LAYOUT_BOUNDS=')),voyageSource.slice(voyageSource.indexOf('const initialVoyage='),voyageSource.indexOf('const voyage=')),featureSource].join('\n');
const plain=value=>JSON.parse(JSON.stringify(value));
const jpeg='data:image/jpeg;base64,/9j/2Q==';
const photo=date=>({date,url:jpeg,area:'海溝',species:'深海訪客',individual:'test-'+date,grade:82});
const metadata=date=>({date,area:'海溝',species:'深海訪客',individual:'test-'+date,grade:82,bytes:4});
const STORE_KEY='return-blue.shilang.v1',VOYAGE_KEY='return-blue.voyage.1';
const saveKeys=[STORE_KEY,STORE_KEY+'.backup',VOYAGE_KEY,VOYAGE_KEY+'.backup'];
function plan(f){const before=saveKeys.map(key=>[key,f.context.localStorage.getItem(key)]),after=before.map(([key,value])=>[key,key===STORE_KEY?JSON.stringify({seen:['new'],photos:[],log:[],settings:{quality:0}}):key===VOYAGE_KEY?JSON.stringify({schema:1,distance:900,features:{photography:{schema:1,revision:5,film:[],album:[]}}}):value]);return{before,after};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function boundary(initial){
 let stores=new Map([['records',new Map(initial.map(record=>[record.id,record]))]]),version=initial.length?1:0;
 const counts={opens:0,reads:0,transactions:0,commits:0,aborts:0,upgrades:0},hooks={};
 const connection={objectStoreNames:{contains:name=>stores.has(name)},createObjectStore(name){counts.upgrades++;stores.set(name,new Map());},close(){},transaction(names,mode){
  counts.transactions++;const writable=mode==='readwrite',selected=Array.isArray(names)?names:[names],working=new Map(selected.map(name=>{if(!stores.has(name))throw new Error('unknown store '+name);return[name,new Map(stores.get(name))];}));let aborted=false,settled=false,pending=0,scheduled=false;
  if(writable&&hooks.writeFailure)throw new Error('injected write failure');
  const tx={error:null,abort(){if(aborted||settled)return;aborted=true;counts.aborts++;queueMicrotask(()=>tx.onabort?.());}};
  const finish=()=>{if(pending||scheduled||aborted||settled)return;scheduled=true;const complete=()=>queueMicrotask(()=>{scheduled=false;if(pending||aborted||settled)return;settled=true;if(writable){for(const[name,rows]of working)stores.set(name,rows);counts.commits++;}tx.oncomplete?.();});if(writable&&hooks.holdCommit)hooks.holdCommit(complete);else complete();};
  const request=(name,operation,key)=>{pending++;const req={};queueMicrotask(()=>{if(aborted)return;hooks.beforeRequest?.(mode,operation);
   if(hooks.readFailure){req.error=new Error('injected read failure');req.onerror?.();tx.error=req.error;tx.abort();return;}
   req.result=operation==='getAll'?[...working.get(name).values()]:working.get(name).get(key);req.onsuccess?.();pending--;finish();
  });return req;};
  tx.objectStore=name=>({get(key){counts.reads++;return request(name,'get',key);},getAll(){counts.reads++;return request(name,'getAll');},put(record){working.get(name).set(record.id,record);finish();},delete(id){working.get(name).delete(id);finish();},clear(){working.get(name).clear();finish();}});
  queueMicrotask(finish);return tx;
 }};
 return {counts,hooks,records:()=>stores.get('records'),recovery:()=>stores.get('recovery'),replace(recordsToUse){stores.set('records',new Map(recordsToUse.map(r=>[r.id,r])));},indexedDB:{open(name,requestedVersion){counts.opens++;const request={result:connection};queueMicrotask(()=>{
  if(requestedVersion<version){request.error=new Error('VersionError');request.onerror?.();return;}
  if(requestedVersion>version){let aborted=false;request.transaction={abort(){aborted=true;counts.aborts++;}};hooks.beforeUpgrade?.();request.onupgradeneeded?.();if(aborted){request.error=new Error('upgrade aborted');request.onerror?.();return;}version=requestedVersion;}
  request.onsuccess?.();
 });return request;}}};
}
async function fixture({empty=false,initialize=true,backing=null,productionSaves=false}={}){
 const state={schema:1,revision:4,film:[metadata(101)],album:[]},db=backing||boundary(empty?[]:[{id:'@library',state:plain(state)},{id:'p-101',blob:new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'})}]);
 const locks={request(name,options,callback){return Promise.resolve().then(()=>callback({name,mode:options.mode}));}};
 const calls={save:0,persist:0,progress:0},messages=[],elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',querySelectorAll:()=>[],classList:{add(){},remove(){}}});return elements.get(id);};
 const storage=backing?.storage||new Map([[STORE_KEY,JSON.stringify({seen:['old'],photos:[],log:[{text:'original journal',date:1}],settings:{quality:1}})],[VOYAGE_KEY,JSON.stringify({schema:1,distance:72,features:{photography:state,expedition:{mail:{submission:{status:'complete',photoDate:101}}}}})]]);
 const localStorage={getItem:key=>storage.get(key)??null,setItem(key,value){if(db.hooks.failLocalWrite?.(key))throw Object.assign(new Error('Storage is full'),{name:'QuotaExceededError'});storage.set(key,String(value));},removeItem(key){storage.delete(key);}};
 const context={STORE_KEY,VOYAGE_KEY,localStorage,matchMedia:()=>({matches:false}),confirm:()=>true,crypto:require('node:crypto').webcrypto,console,Blob,Uint8Array,atob,queueMicrotask,setTimeout,clearTimeout,indexedDB:db.indexedDB,navigator:{locks},
  FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{const complete=()=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload?.();};if(db.hooks.holdHydration)db.hooks.holdHydration(complete);else complete();},error=>{this.error=error;this.onerror?.();});}},
  voyage:{state:{features:{photography:empty?{schema:1,revision:0,film:[],album:[]}:plain(state)}}},persistent:{photos:[]},active:false,modal:null,
  document:{getElementById:element},$:element,panelTitle(){},safe:String,dateText:String,renderJournal(){},toast:message=>messages.push(message),saveVoyage(){calls.save++;return true;},persist(){calls.persist++;return true;},recordPhotoProgress(){calls.progress++;},OceanTrench:{worldBounds:{},stations:[]},life:[]
 };
 const declarations=productionSaves?[engineSource.slice(0,engineSource.indexOf('class Geometry')),worldSource.slice(0,worldSource.indexOf('const obstacles=')),featureSource,appSource.slice(0,appSource.indexOf('function collide(')),voyageSource.slice(0,voyageSource.indexOf('function radio(')),voyageSource.slice(voyageSource.indexOf('function currentOrder('),voyageSource.indexOf('function shipCamera(')),voyageSource.slice(voyageSource.indexOf('function recordPhotoProgress('),voyageSource.indexOf('const legacyPhoto='))].join('\n'):readers;
 vm.createContext(context);vm.runInContext(sessionSource+'\n'+declarations+'\n'+source+'\n'+guardSource+'\nthis.api=oceanPhotography;this.session=oceanSaveSession;this.guard=oceanSaveGuard;this.feature=oceanPhotography.feature;',context);
 const session=context.session;assert.equal(await session.acquire(),true);assert.equal(session.holdsLock,true);
 const run=code=>vm.runInContext(code,context);
 if(productionSaves)run('loadJournal();loadVoyage();');
 const result={...db,storage,session,calls,messages,elements,context,run,api:context.api,state:()=>plain(run('voyage.state.features.photography'))};
 if(initialize)await context.feature.init();return result;
}
let checks=0,failures=0;
async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
(async()=>{
 await check('a committed original keeps its warning visible when either local progress save fails',async()=>{
  for(const failedKeys of [[VOYAGE_KEY],[STORE_KEY],[VOYAGE_KEY,STORE_KEY]]){
   const f=await fixture({productionSaves:true});f.hooks.failLocalWrite=key=>failedKeys.includes(key);
   assert.equal(await f.api.capture(photo(202)),true,'Capture success describes the original-image commit');
   assert.equal((await f.api.exportArchive()).images.find(p=>p.date===202).url,jpeg);
   assert.equal(f.run('voyage.storageOK'),!failedKeys.includes(VOYAGE_KEY));
   assert.equal(f.run('storageOK'),!failedKeys.includes(STORE_KEY));
   assert.match(f.elements.get('toast').textContent,/航程.*(未|失敗|受限)/);
   assert.match(f.elements.get('toast').textContent,/原圖|照片|底片/);
  }
 });
 await check('developed originals remain available with a visible warning when either local progress save fails',async()=>{
  for(const failedKeys of [[VOYAGE_KEY],[STORE_KEY],[VOYAGE_KEY,STORE_KEY]]){
   const f=await fixture({productionSaves:true});f.hooks.failLocalWrite=key=>failedKeys.includes(key);
   assert.equal(await f.api.develop([101]),true,'Development success describes the photographic-library commit');
   const archive=await f.api.exportArchive();assert.equal(archive.state.film.length,0);assert.equal(archive.state.album[0].date,101);assert.equal(archive.images[0].url,jpeg);
   assert.match(f.elements.get('toast').textContent,/航程.*(未|失敗|受限)/);
  }
 });
 await check('the normal success message returns only after both progress stores can save again',async()=>{
  const f=await fixture({productionSaves:true});let failedKeys=[VOYAGE_KEY,STORE_KEY];f.hooks.failLocalWrite=key=>failedKeys.includes(key);
  assert.equal(await f.api.capture(photo(202)),true);assert.match(f.elements.get('toast').textContent,/尚未完整保存/);
  failedKeys=[STORE_KEY];assert.equal(await f.api.capture(photo(203)),true);assert.match(f.elements.get('toast').textContent,/尚未完整保存/);
  failedKeys=[];assert.equal(await f.api.capture(photo(204)),true);assert.equal(f.elements.get('toast').textContent,'底片已保存 · 回研究船選片沖印');
  assert.equal(f.run('voyage.storageOK&&storageOK'),true);const archive=await f.api.exportArchive();assert.deepEqual(plain(archive.images.map(p=>p.date)),[101,202,203,204]);assert(archive.images.every(p=>p.url===jpeg));
 });
 await check('unreadable voyage or journal stops photographic initialization before opening or migrating its database',async()=>{
  for(const key of [VOYAGE_KEY,STORE_KEY]){
   const f=await fixture({productionSaves:true,initialize:false}),original=f.storage.get(key);
   f.storage.set(key,'{broken');f.storage.set(key+'.backup','{also-broken');f.run('loadJournal();loadVoyage();');
   assert.equal(f.run('oceanSaveHealth.readable()'),false);const before={...f.counts},localBefore=[...f.storage];
   await f.context.feature.init();assert.equal(f.api.snapshot().durable,false);assert.equal(f.api.canCapture(),false);assert.match(f.api.snapshot().error,/航程|圖鑑|日誌/);
   assert.deepEqual(f.counts,before,'Unrecognized progress must not initiate database reads, upgrades or migration');assert.deepEqual([...f.storage],localBefore);
   f.storage.set(key,original);f.storage.delete(key+'.backup');f.run('loadJournal();loadVoyage();');assert.equal(f.run('oceanSaveHealth.readable()'),true);
   f.context.feature.renderPanel('photography');assert.equal(await f.elements.get('photoStorageRetry').onclick(),true);
   assert.equal((await f.api.exportArchive()).images[0].url,jpeg,'A readable retry hydrates the retained original through the normal API');
  }
 });
 await check('startup recovery without a pending import leaves originals untouched',async()=>{
  const f=await fixture({initialize:false});assert.equal(await f.api.recoverImport(),false);await f.context.feature.init();assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('staged import retains a complete durable backup independent of current runtime',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));
  f.context.voyage.state={features:{photography:{schema:1,revision:0,film:[],album:[]}}};f.context.persistent.photos=[];
  const archive=await f.api.recoveryArchive();assert.equal(archive.voyage.distance,72);assert.equal(archive.journal.log[0].text,'original journal');assert.equal(archive.photography.images[0].url,jpeg);assert.equal(archive.photography.state.film[0].date,101);
 });
 await check('pending import prevents ordinary photo mutations from consuming recovery data',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));
  assert.equal(await f.api.capture(photo(202)),false);assert.equal((await f.api.recoveryArchive()).photography.images[0].url,jpeg);
 });
 await check('import completion requires all new local snapshots before discarding durable rescue',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(f);await prepared.commit(snapshots);
  await assert.rejects(prepared.finish(),/航程|快照|完成/);assert.equal((await f.api.recoveryArchive()).photography.images[0].url,jpeg);
  for(const[key,value]of snapshots.after)f.context.guard.write(key,value);await prepared.finish();assert.equal(await f.api.recoverImport(),false);assert.equal((await f.api.exportArchive()).images.length,0);
 });
 await check('new runtime restores old local state and original images after interrupted import',async()=>{
  const old=await fixture(),prepared=await old.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(old);await prepared.commit(snapshots);old.context.guard.write(...snapshots.after[0]);old.session.close();
  const reopened=await fixture({initialize:false,backing:old});assert.equal(await reopened.api.recoverImport(),true);assert.deepEqual(saveKeys.map(key=>[key,reopened.context.localStorage.getItem(key)]),snapshots.before);assert.equal(await reopened.api.recoverImport(),false);await reopened.context.feature.init();assert.equal((await reopened.api.exportArchive()).images[0].url,jpeg);
 });
 await check('durable export refuses corrupt original snapshots instead of inventing an empty voyage',async()=>{
  const f=await fixture();f.context.localStorage.setItem(VOYAGE_KEY,'{broken');f.context.localStorage.setItem(VOYAGE_KEY+'.backup','{also-broken');const prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));await assert.rejects(f.api.recoveryArchive(),/航程|快照|備份/);
 });
 await check('external photo revision blocks recovery before any local snapshot changes',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(f);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)f.context.guard.write(key,value);f.replace([{id:'@library',state:{schema:1,revision:99,film:[],album:[]}}]);await assert.rejects(f.api.recoverImport(),/另一個分頁/);assert.deepEqual(saveKeys.map(key=>[key,f.context.localStorage.getItem(key)]),snapshots.after);assert.equal((await f.api.recoveryArchive()).photography.images[0].url,jpeg);
 });
 await check('imported pending rescue image survives commit and a fresh runtime',async()=>{
  const old=await fixture(),prepared=await old.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[],recovery:photo(202)}),snapshots=plan(old);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)old.context.guard.write(key,value);await prepared.finish();old.session.close();
  const reopened=await fixture({initialize:false,backing:old});assert.equal(await reopened.api.recoverImport(),false);await reopened.context.feature.init();assert.equal(reopened.api.snapshot().recovery,true);assert.equal((await reopened.api.exportArchive()).recovery.url,jpeg);
 });
 await check('saving an imported rescue image removes its durable pending copy',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[],recovery:photo(202)}),snapshots=plan(f);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)f.context.guard.write(key,value);await prepared.finish();f.context.feature.renderPanel('photography');await f.elements.get('photoRecoverRetry').onclick();assert.equal(f.state().film[0].date,202);f.session.close();
  const reopened=await fixture({backing:f});assert.equal(reopened.api.snapshot().recovery,false);assert.equal((await reopened.api.exportArchive()).images[0].date,202);
 });
 await check('discarding an imported rescue image stays discarded after reopening',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[],recovery:photo(202)}),snapshots=plan(f);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)f.context.guard.write(key,value);await prepared.finish();f.context.feature.renderPanel('photography');await f.elements.get('photoRecoverDiscard').onclick();f.session.close();const reopened=await fixture({backing:f});assert.equal(reopened.api.snapshot().recovery,false);
 });
 await check('staging rejects a stale local snapshot without replacing existing originals',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(f);f.context.localStorage.setItem(STORE_KEY,'external-progress');await assert.rejects(prepared.commit(snapshots),/快照|航程|變更/);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);assert.equal(await f.api.recoverImport(),false);
 });
 await check('corrupt undo metadata blocks recovery without normalizing away damaged entries',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(f);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)f.context.guard.write(key,value);f.recovery().get('@import').records.find(r=>r.id==='@library').state.film.push(metadata(101));await assert.rejects(f.api.recoverImport(),/索引|識別|復原/);await assert.rejects(f.api.recoveryArchive(),/索引|識別|復原/);assert.deepEqual(saveKeys.map(key=>[key,f.context.localStorage.getItem(key)]),snapshots.after);
 });
 await check('failed startup rollback retains durable rescue for a second restart',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}),snapshots=plan(f);await prepared.commit(snapshots);for(const[key,value]of snapshots.after)f.context.guard.write(key,value);f.session.close();
  const first=await fixture({initialize:false,backing:f});first.hooks.writeFailure=true;await assert.rejects(first.api.recoverImport(),/injected write failure/);assert.equal((await first.api.recoveryArchive()).photography.images[0].url,jpeg);first.session.close();first.hooks.writeFailure=false;
  const second=await fixture({initialize:false,backing:first});assert.equal(await second.api.recoverImport(),true);assert.deepEqual(saveKeys.map(key=>[key,second.context.localStorage.getItem(key)]),snapshots.before);await second.context.feature.init();assert.equal((await second.api.exportArchive()).images[0].url,jpeg);
 });
 await check('recovery lookup failure propagates before changing original local state',async()=>{
  const f=await fixture({initialize:false}),before=saveKeys.map(key=>[key,f.context.localStorage.getItem(key)]);f.hooks.readFailure=true;await assert.rejects(f.api.recoverImport(),/injected read failure/);assert.deepEqual(saveKeys.map(key=>[key,f.context.localStorage.getItem(key)]),before);
 });
 await check('shared JPEG validator preserves accepted bytes and rejects prefix-only malformed input',async()=>{
  const f=await fixture({initialize:false}),blob=f.api.rules.jpegBlob(jpeg);assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[255,216,255,217]);assert.throws(()=>f.api.rules.jpegBlob('data:image/jpeg;base64,broken'),/JPEG/);
 });
 await check('durable recovery export skips an unsupported journal primary and preserves valid raw backup',async()=>{
  const f=await fixture(),backup={schema:1,seen:['chromis'],photos:[],log:[{text:'backup journal',date:2}],settings:{quality:1},originalNote:'preserve this field'};f.context.localStorage.setItem(STORE_KEY,JSON.stringify({...backup,schema:999,log:[{text:'unsupported primary',date:3}]}));f.context.localStorage.setItem(STORE_KEY+'.backup',JSON.stringify(backup));
  const prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));assert.deepEqual(plain((await f.api.recoveryArchive()).journal),backup);
 });
 await check('a malformed legacy row cannot prevent valid stored and neighboring originals from loading',async()=>{
  const f=await fixture({initialize:false});f.context.persistent.photos.push(photo(202),{...photo(303),url:'data:image/jpeg;base64,broken'});await f.context.feature.init();assert.equal(f.api.snapshot().durable,true);const archive=await f.api.exportArchive();assert.deepEqual(plain(archive.images.map(p=>p.date)),[101,202]);assert.ok(archive.images.every(p=>p.url===jpeg));assert.match(f.api.snapshot().error,/舊照片|損壞/);
 });
 await check('owned export reads original bytes without saving or replacing in-memory state',async()=>{
  const f=await fixture(),before={...f.calls},identity=f.context.voyage.state.features.photography;
  const archive=await f.api.exportArchive();assert.equal(archive.images[0].url,jpeg);assert.deepEqual(f.calls,before);assert.equal(f.context.voyage.state.features.photography,identity);
 });
 await check('external revision causes export conflict without adopting or saving newer library',async()=>{
  const f=await fixture(),before=f.state(),saved={...f.calls};f.replace([{id:'@library',state:{schema:1,revision:5,film:[],album:[]}}]);
  await assert.rejects(f.api.exportArchive(),/另一個分頁|相簿.*更新/);assert.deepEqual(f.state(),before);assert.deepEqual(f.calls,saved);assert.equal(f.api.snapshot().images,1);
 });
 await check('retired export uses retained originals and recovery without touching external database',async()=>{
  const f=await fixture();f.session.retire();assert.equal(await f.api.capture(photo(202)),false);const before={...f.counts},saved={...f.calls};f.hooks.readFailure=true;
  const archive=await f.api.exportArchive();assert.deepEqual(f.counts,before);assert.deepEqual(f.calls,saved);assert.equal(archive.images[0].url,jpeg);assert.equal(archive.recovery.url,jpeg);assert.equal(archive.recovery.date,202);
 });
 await check('owned export continues to report a database read failure',async()=>{
  const f=await fixture(),saved={...f.calls};f.hooks.readFailure=true;await assert.rejects(f.api.exportArchive(),/injected read failure/);assert.deepEqual(f.calls,saved);assert.equal(f.api.snapshot().images,1);
 });
 await check('retired capture preserves rescue image without starting any write transaction',async()=>{
  const f=await fixture(),before={...f.counts},saved={...f.calls};f.session.retire();
  assert.equal(await f.api.capture(photo(202)),false);assert.deepEqual(f.counts,before);assert.deepEqual(f.calls,saved);assert.equal(f.api.snapshot().recovery,true);assert.equal(f.state().film.length,1);
 });
 await check('retirement during database await prevents transaction creation',async()=>{
  const f=await fixture(),before={...f.counts},capture=f.api.capture(photo(202));queueMicrotask(()=>f.session.retire());
  assert.equal(await capture,false);assert.equal(f.counts.transactions,before.transactions);assert.equal(f.api.snapshot().recovery,true);
 });
 await check('retirement before IndexedDB request callback aborts all queued writes',async()=>{
  const f=await fixture(),before={...f.counts};f.hooks.beforeRequest=(mode)=>{if(mode==='readwrite')f.session.retire();};
  assert.equal(await f.api.capture(photo(202)),false);assert.equal(f.counts.commits,before.commits);assert.equal(f.counts.aborts,before.aborts+1);assert.equal(f.records().has('p-202'),false);assert.equal(f.api.snapshot().recovery,true);
 });
 await check('retirement before a new database upgrade aborts schema mutation',async()=>{
  const f=await fixture({empty:true,initialize:false});f.hooks.beforeUpgrade=()=>f.session.retire();
  await f.context.feature.init();assert.equal(f.counts.upgrades,0);assert.equal(f.counts.aborts,1);assert.equal(f.api.snapshot().durable,false);
 });
 await check('prepared import commit refuses retirement and rollback refuses a released lock',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});
  f.session.retire();const before={...f.counts};await assert.rejects(prepared.commit(plan(f)),{name:'SaveSessionError',status:'retiring'});assert.deepEqual(f.counts,before);
  const closed=await fixture(),replacement=await closed.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await replacement.commit(plan(closed));closed.session.close();const committed={...closed.counts};await assert.rejects(replacement.rollback(),{name:'SaveSessionError',status:'closed'});assert.deepEqual(closed.counts,committed);assert.equal(closed.records().get('@library').state.film.length,0);
  assert.equal(closed.state().film[0]?.date,101);assert.equal(closed.api.snapshot().durable,false);assert.match(closed.api.snapshot().error,/未能還原/);assert.equal((await closed.api.exportArchive()).images[0].url,jpeg);
 });
 await check('retiring import rollback restores originals while the exclusive lock is still held',async()=>{
  const f=await fixture(),before=f.state(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));assert.equal(f.records().has('p-101'),false);
  f.session.retire();await prepared.rollback();assert.deepEqual(f.state(),before);assert.equal(f.records().has('p-101'),true);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('retiring rollback retains revision protection against an external library update',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit(plan(f));f.session.retire();
  const external={schema:1,revision:prepared.state.revision+1,film:[metadata(303)],album:[]};f.replace([{id:'@library',state:external},{id:'p-303',blob:new Blob([new Uint8Array([255,216,255,217])])}]);
  const commits=f.counts.commits;await assert.rejects(prepared.rollback(),/另一個分頁/);assert.equal(f.counts.commits,commits);assert.equal(f.records().get('@library').state,external);assert.equal(f.records().has('p-303'),true);
  assert.equal(f.state().film[0]?.date,101);assert.equal(f.api.snapshot().durable,false);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('failed database rollback retains coherent prior originals for rescue export',async()=>{
  const f=await fixture(),before=f.state(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[],recovery:photo(202)});await prepared.commit(plan(f));assert.equal(f.api.snapshot().recovery,true);
  f.hooks.writeFailure=true;const commits=f.counts.commits;await assert.rejects(prepared.rollback(),/injected write failure/);f.session.retire();assert.equal(f.counts.commits,commits);assert.equal(f.records().has('p-101'),false);
  assert.deepEqual(f.state(),before);assert.equal(f.api.snapshot().durable,false);assert.equal(f.api.snapshot().recovery,false);assert.match(f.api.snapshot().error,/未能還原/);const reads=f.counts.reads,archive=await f.api.exportArchive();assert.equal(f.counts.reads,reads);assert.equal(archive.images[0].url,jpeg);assert.equal(archive.state.film[0].date,101);
 });
 await check('retired development, pinning and deletion keep existing photos unchanged',async()=>{
  const film=await fixture(),beforeFilm=film.state();film.session.retire();const filmCounts={...film.counts};assert.equal(await film.api.develop([101]),false);assert.deepEqual(film.state(),beforeFilm);assert.deepEqual(film.counts,filmCounts);
  const album=await fixture();assert.equal(await album.api.develop([101]),true);const beforeAlbum=album.state();album.session.retire();const albumCounts={...album.counts};assert.equal(await album.api.pin(101),false);assert.equal(await album.api.erase(101),false);assert.deepEqual(album.state(),beforeAlbum);assert.deepEqual(album.counts,albumCounts);assert.equal(album.records().has('p-101'),true);
 });
 await check('busy remains true for queued work and becomes false only after it settles',async()=>{
  const f=await fixture();assert.equal(f.api.snapshot().busy,false);const first=f.api.capture(photo(202)),second=f.api.exportArchive();assert.equal(f.api.snapshot().busy,true);
  await Promise.all([first,second]);await tick();assert.equal(f.api.snapshot().busy,false);assert.equal(f.state().film.length,2);
 });
 await check('migration initialization keeps busy and idle drain pending through transaction and image hydration',async()=>{
  const f=await fixture({empty:true,initialize:false});f.context.persistent.photos.push(photo(101));let commit,hydrate,drained=false;
  f.hooks.holdCommit=complete=>{commit=complete;};f.hooks.holdHydration=complete=>{hydrate=complete;};
  const first=f.context.feature.init(),second=f.context.feature.init(),idle=f.api.whenIdle().then(()=>{drained=true;});await tick();
  assert.equal(f.api.snapshot().busy,true);assert.equal(drained,false);assert.equal(typeof commit,'function');assert.equal(first,second);
  commit();await tick();assert.equal(typeof hydrate,'function');assert.equal(f.api.snapshot().busy,true);assert.equal(drained,false);assert.equal(f.api.snapshot().images,1);
  hydrate();await Promise.all([first,second,idle]);assert.equal(f.api.snapshot().busy,false);assert.equal(drained,true);assert.equal(f.counts.commits,1);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('storage retry participates in busy and idle drain until migration settles',async()=>{
  const f=await fixture({empty:true,initialize:false});f.hooks.readFailure=true;await f.context.feature.init();assert.equal(f.api.snapshot().durable,false);
  f.context.feature.renderPanel('photography');f.hooks.readFailure=false;let commit,drained=false;f.hooks.holdCommit=complete=>{commit=complete;};
  const retry=f.elements.get('photoStorageRetry').onclick(),idle=f.api.whenIdle().then(()=>{drained=true;});await tick();assert.equal(f.api.snapshot().busy,true);assert.equal(drained,false);assert.equal(typeof commit,'function');
  commit();assert.equal(await retry,true);await idle;assert.equal(f.api.snapshot().busy,false);assert.equal(f.api.snapshot().durable,true);
 });
 console.log(`${checks}/${checks+failures} photography session checks passed`);if(failures)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
