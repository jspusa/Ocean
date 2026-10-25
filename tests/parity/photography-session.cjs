/* Exercise production photography and save-session modules through their public
 * APIs. Controlled browser boundaries provide IndexedDB/LockManager scheduling;
 * native browser transactions are covered by the browser suite. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/photography.js','utf8'),sessionSource=fs.readFileSync('src/save_session.js','utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const jpeg='data:image/jpeg;base64,/9j/2Q==';
const photo=date=>({date,url:jpeg,area:'海溝',species:'深海訪客',individual:'test-'+date,grade:82});
const metadata=date=>({date,area:'海溝',species:'深海訪客',individual:'test-'+date,grade:82,bytes:4});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function boundary(initial){
 let records=new Map(initial.map(record=>[record.id,record])),created=initial.length>0;
 const counts={opens:0,reads:0,transactions:0,commits:0,aborts:0,upgrades:0},hooks={};
 const connection={objectStoreNames:{contains:()=>created},createObjectStore(){counts.upgrades++;created=true;},close(){},transaction(name,mode){
  counts.transactions++;const writable=mode==='readwrite',working=new Map(records);let aborted=false;
  if(writable&&hooks.writeFailure)throw new Error('injected write failure');
  const tx={error:null,abort(){if(aborted)return;aborted=true;counts.aborts++;queueMicrotask(()=>tx.onabort?.());}};
  const finish=()=>{const complete=()=>queueMicrotask(()=>{if(aborted)return;if(writable){records=working;counts.commits++;}tx.oncomplete?.();});if(writable&&hooks.holdCommit)hooks.holdCommit(complete);else complete();};
  const request=operation=>{const req={};queueMicrotask(()=>{if(aborted)return;hooks.beforeRequest?.(mode,operation);
   if(operation==='getAll'&&hooks.readFailure){req.error=new Error('injected read failure');req.onerror?.();return;}
   req.result=operation==='getAll'?[...working.values()]:working.get('@library');req.onsuccess?.();finish();
  });return req;};
  tx.objectStore=()=>({get(){counts.reads++;return request('get');},getAll(){counts.reads++;return request('getAll');},put(record){working.set(record.id,record);},delete(id){working.delete(id);},clear(){working.clear();}});
  return tx;
 }};
 return {counts,hooks,records:()=>records,replace(recordsToUse){records=new Map(recordsToUse.map(r=>[r.id,r]));},indexedDB:{open(){counts.opens++;const request={result:connection};queueMicrotask(()=>{
  if(!created){let aborted=false;request.transaction={abort(){aborted=true;counts.aborts++;}};hooks.beforeUpgrade?.();request.onupgradeneeded?.();if(aborted){request.error=new Error('upgrade aborted');request.onerror?.();return;}}
  request.onsuccess?.();
 });return request;}}};
}
async function fixture({empty=false,initialize=true}={}){
 const state={schema:1,revision:4,film:[metadata(101)],album:[]},db=boundary(empty?[]:[{id:'@library',state:plain(state)},{id:'p-101',blob:new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'})}]);
 const locks={request(name,options,callback){return Promise.resolve().then(()=>callback({name,mode:options.mode}));}};
 const calls={save:0,persist:0,progress:0},messages=[],elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',querySelectorAll:()=>[]});return elements.get(id);};
 const context={console,Blob,Uint8Array,atob,queueMicrotask,setTimeout,clearTimeout,indexedDB:db.indexedDB,navigator:{locks},
  FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{const complete=()=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload?.();};if(db.hooks.holdHydration)db.hooks.holdHydration(complete);else complete();},error=>{this.error=error;this.onerror?.();});}},
  voyage:{state:{features:{photography:empty?{schema:1,revision:0,film:[],album:[]}:plain(state)}}},persistent:{photos:[]},active:false,modal:null,
  document:{getElementById:element},$:element,panelTitle(){},safe:String,dateText:String,renderJournal(){},toast:message=>messages.push(message),saveVoyage(){calls.save++;return true;},persist(){calls.persist++;return true;},recordPhotoProgress(){calls.progress++;},
  oceanFeatures:{register(feature){context.feature=feature;},state(){return context.voyage.state.features.photography;},retainedPhotoDates:()=>new Set()}
 };
 vm.createContext(context);vm.runInContext(sessionSource+'\n'+source+'\nthis.api=oceanPhotography;this.session=oceanSaveSession;',context);
 const session=context.session;assert.equal(await session.acquire(),true);assert.equal(session.holdsLock,true);
 const result={...db,session,calls,messages,elements,context,api:context.api,state:()=>plain(context.voyage.state.features.photography)};
 if(initialize)await context.feature.init();return result;
}
let checks=0,failures=0;
async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
(async()=>{
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
  f.session.retire();const before={...f.counts};await assert.rejects(prepared.commit(),{name:'SaveSessionError',status:'retiring'});assert.deepEqual(f.counts,before);
  const closed=await fixture(),replacement=await closed.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await replacement.commit();closed.session.close();const committed={...closed.counts};await assert.rejects(replacement.rollback(),{name:'SaveSessionError',status:'closed'});assert.deepEqual(closed.counts,committed);assert.equal(closed.records().get('@library').state.film.length,0);
  assert.equal(closed.state().film[0]?.date,101);assert.equal(closed.api.snapshot().durable,false);assert.match(closed.api.snapshot().error,/未能還原/);assert.equal((await closed.api.exportArchive()).images[0].url,jpeg);
 });
 await check('retiring import rollback restores originals while the exclusive lock is still held',async()=>{
  const f=await fixture(),before=f.state(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit();assert.equal(f.records().has('p-101'),false);
  f.session.retire();await prepared.rollback();assert.deepEqual(f.state(),before);assert.equal(f.records().has('p-101'),true);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('retiring rollback retains revision protection against an external library update',async()=>{
  const f=await fixture(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]});await prepared.commit();f.session.retire();
  const external={schema:1,revision:prepared.state.revision+1,film:[metadata(303)],album:[]};f.replace([{id:'@library',state:external},{id:'p-303',blob:new Blob([new Uint8Array([255,216,255,217])])}]);
  const commits=f.counts.commits;await assert.rejects(prepared.rollback(),/另一個分頁/);assert.equal(f.counts.commits,commits);assert.equal(f.records().get('@library').state,external);assert.equal(f.records().has('p-303'),true);
  assert.equal(f.state().film[0]?.date,101);assert.equal(f.api.snapshot().durable,false);assert.equal((await f.api.exportArchive()).images[0].url,jpeg);
 });
 await check('failed database rollback retains coherent prior originals for rescue export',async()=>{
  const f=await fixture(),before=f.state(),prepared=await f.api.prepareImport({schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[],recovery:photo(202)});await prepared.commit();assert.equal(f.api.snapshot().recovery,true);
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
