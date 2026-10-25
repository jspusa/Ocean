/* Exercise production loadJournal/persist with real save-session, guard and
 * photography modules. Only browser Storage/LockManager/DOM boundaries vary. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync('src/'+name+'.js','utf8');
const app=read('app'),world=read('world'),engine=read('engine'),voyage=read('voyage');
const KEY='return-blue.shilang.v1',BACKUP=KEY+'.backup';
const original={seen:['chromis'],photos:[],log:[{text:'A saved discovery',date:123}],settings:{quality:0,adaptive:false,fov:82}};
const snapshot=JSON.stringify(original),plain=value=>JSON.parse(JSON.stringify(value));
async function fixture(storage=new Map(),failWrite=()=>false,failRead=()=>false){
 const elements=new Map(),writes=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,addEventListener(){},classList:{add(){},remove(){}},focus(){},showModal(){this.open=true;}});return elements.get(id);};
 const locks={request(name,options,callback){return Promise.resolve().then(()=>callback({name,mode:'exclusive'}));}};
 const context=vm.createContext({console,Blob,atob,matchMedia:()=>({matches:false}),navigator:{locks},
  window:{addEventListener(){}},document:{addEventListener(){},getElementById:element},
  setTimeout,clearTimeout,localStorage:{getItem(key){if(failRead(key))throw Object.assign(new Error('Storage is unavailable'),{name:'SecurityError'});return storage.get(key)??null;},setItem(key,value){if(failWrite(key))throw Object.assign(new Error('Storage is full'),{name:'QuotaExceededError'});storage.set(key,String(value));writes.push(key);},removeItem:key=>storage.delete(key)}
 });
 // These files are classic scripts. Load their real declarations without
 // booting WebGL; the public load/save functions are the subject of this suite.
 for(const source of [engine.slice(0,engine.indexOf('class Geometry')),world.slice(0,world.indexOf('const obstacles=')),read('save_session'),read('features'),app.slice(0,app.indexOf('function collide(')),voyage.match(/const VOYAGE_KEY=.*?;/)[0],read('photography'),read('save_session_ui')])vm.runInContext(source,context);
 const run=source=>vm.runInContext(source,context);
 // Acquire the real ownership lease directly: this suite exercises journal
 // loading/saving, not bootstrap's separate IndexedDB import recovery preflight.
 assert.equal(await run('oceanSaveSession.acquire()'),true);
 return {storage,writes,run,read:()=>plain(run('({seen:persistent.seen,photos:persistent.photos,log:persistent.log,settings,storageOK})'))};
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
 await check('corrupt journal reopens its saved discoveries and settings from backup',async()=>{
  const f=await fixture(new Map([[KEY,'{broken'],[BACKUP,snapshot]]));
  f.run('loadJournal()');
  assert.deepEqual(f.read().seen,['chromis']);assert.equal(f.read().settings.fov,82);assert.equal(f.read().settings.adaptive,false);
  assert.equal(f.storage.get(KEY),'{broken');assert.deepEqual(f.writes,[],'Loading never replaces either saved record');
 });
 await check('saving new preferences keeps the previous readable journal as recovery data',async()=>{
  const storage=new Map([[KEY,snapshot]]),f=await fixture(storage);
  f.run('loadJournal();settings.fov=75;persistent.seen.push("turtle")');
  assert.equal(f.run('persist()'),true);
  const reopened=await fixture(storage);reopened.run('loadJournal()');
  assert.equal(reopened.read().settings.fov,75);assert.deepEqual(reopened.read().seen,['chromis','turtle']);
  storage.set(KEY,'{broken');const recovered=await fixture(storage);recovered.run('loadJournal()');
  assert.equal(recovered.read().settings.fov,82);assert.deepEqual(recovered.read().seen,['chromis']);
 });
 await check('malformed rows do not discard valid observations, legacy photos or settings',async()=>{
  const jpeg='data:image/jpeg;base64,/9j/2Q==';
  const raw={...original,photos:[null,false,{date:12,url:'javascript:bad'},{date:22,url:'data:image/jpeg;base64,broken'},{date:23,url:'data:image/jpeg;base64,invalid!'},
   {date:20,species:'青雀鯛',grade:80,bytes:4},{date:21,species:'青雀鯛',url:jpeg,grade:81}],
   log:[null,42,{text:'Invalid date',date:'yesterday'},...original.log]};
  const f=await fixture(new Map([[KEY,JSON.stringify(raw)]]));f.run('globalThis.settingsBefore=settings;loadJournal()');
  assert.equal(f.read().settings.fov,82);assert.equal(f.read().settings.adaptive,false);assert.deepEqual(f.read().seen,['chromis']);
  assert.deepEqual(f.read().log,original.log);assert.equal(f.read().photos.length,1);assert.equal(f.read().photos[0].url,jpeg);
  assert.equal(f.run('settings===settingsBefore&&settings===persistent.settings'),true);
  const normalized=plain(f.run('readJournal(JSON.parse(localStorage.getItem(STORE_KEY)))'));
  assert.deepEqual(normalized.photos.map(p=>p.date),[20,21]);
  assert.equal(f.run('persist()'),true);assert.equal(f.storage.get(BACKUP),JSON.stringify(raw));
 });
 await check('invalid roots, schemas and containers cannot replace a compatible fallback',async()=>{
  for(const raw of [null,[],42,{}, {...original,schema:999},{...original,seen:{}},{...original,photos:{}},{...original,log:null},{...original,settings:[]}]){
   const invalid=JSON.stringify(raw),storage=new Map([[KEY,invalid],[BACKUP,snapshot]]),f=await fixture(storage,key=>key===KEY);
   const status=plain(f.run('loadJournal()'));assert.equal(f.read().settings.fov,82);assert.deepEqual(f.read().seen,['chromis']);
   assert.equal(status.source,'backup');assert.equal(status.recovered,true);assert.equal(status.loaded,true);
   assert.equal(f.run('persist()'),false);assert.equal(f.storage.get(BACKUP),snapshot);assert.equal(f.storage.get(KEY),invalid);
   const reopened=await fixture(storage);reopened.run('loadJournal()');assert.equal(reopened.read().settings.fov,82);
  }
 });
 await check('unrecoverable stored data stays untouched until an explicit valid journal is applied',async()=>{
  const storage=new Map([[KEY,'{broken'],[BACKUP,'[]']]),f=await fixture(storage);
  const status=plain(f.run('loadJournal()'));assert.equal(status.loaded,false);assert.equal(status.source,'unavailable');assert.equal(typeof status.error,'string');
  assert.equal(f.run('persist()'),false);assert.equal(f.read().storageOK,false);assert.deepEqual(f.writes,[]);
  assert.equal(f.storage.get(KEY),'{broken');assert.equal(f.storage.get(BACKUP),'[]');
  f.run('applyJournal('+snapshot+',"import")');assert.equal(f.run('persist()'),true);
  const reopened=await fixture(storage);reopened.run('loadJournal()');assert.deepEqual(reopened.read().seen,['chromis']);assert.equal(reopened.read().settings.fov,82);
 });
 await check('an empty browser starts a new journal without a corruption warning',async()=>{
  const storage=new Map(),f=await fixture(storage),status=plain(f.run('loadJournal()'));
  assert.deepEqual(status,{loaded:true,source:'new',recovered:false,error:null});assert.equal(f.read().storageOK,true);assert.deepEqual(f.writes,[]);
  f.run('settings.fov=78;persistent.seen.push("turtle")');assert.equal(f.run('persist()'),true);
  const reopened=await fixture(storage);reopened.run('loadJournal()');assert.equal(reopened.read().settings.fov,78);assert.deepEqual(reopened.read().seen,['turtle']);
 });
 await check('optional backup quota failure still saves the latest discoveries and preferences',async()=>{
  const older=JSON.stringify({...original,settings:{fov:60}}),storage=new Map([[KEY,snapshot],[BACKUP,older]]),f=await fixture(storage,key=>key===BACKUP);
  f.run('loadJournal();settings.fov=75;persistent.seen.push("turtle")');assert.equal(f.run('persist()'),true);assert.equal(f.read().storageOK,true);
  assert.equal(storage.get(BACKUP),older);
  const reopened=await fixture(storage);reopened.run('loadJournal()');assert.equal(reopened.read().settings.fov,75);assert.deepEqual(reopened.read().seen,['chromis','turtle']);
 });
 await check('failed primary replacement keeps the prior journal usable and reports failure',async()=>{
  for(const failBackup of [false,true]){
   const storage=new Map([[KEY,snapshot],[BACKUP,snapshot]]),f=await fixture(storage,key=>key===KEY||failBackup);
   f.run('loadJournal();settings.fov=75;persistent.seen.push("turtle")');assert.equal(f.run('persist()'),false);assert.equal(f.read().storageOK,false);assert.equal(typeof f.run('journalStorage.error'),'string');
   assert.equal(storage.get(KEY),snapshot);assert.equal(storage.get(BACKUP),snapshot);
   const reopened=await fixture(storage);reopened.run('loadJournal()');assert.equal(reopened.read().settings.fov,82);assert.deepEqual(reopened.read().seen,['chromis']);
  }
 });
 await check('recovered journal repairs its primary without sacrificing the known-good backup',async()=>{
  const storage=new Map([[KEY,'{broken'],[BACKUP,snapshot]]),f=await fixture(storage);f.run('loadJournal();settings.fov=75');
  assert.equal(f.run('persist()'),true);assert.equal(storage.get(BACKUP),snapshot);
  const reopened=await fixture(storage),status=plain(reopened.run('loadJournal()'));assert.equal(status.source,'primary');assert.equal(reopened.read().settings.fov,75);
 });
 await check('a Storage read error is distinct from a missing journal and can fall back safely',async()=>{
  const storage=new Map([[KEY,snapshot],[BACKUP,snapshot]]),f=await fixture(storage,()=>false,key=>key===KEY);
  assert.equal(f.run('loadJournal().source'),'backup');assert.equal(f.read().settings.fov,82);assert.deepEqual(f.writes,[]);
  const denied=await fixture(storage,()=>false,()=>true);assert.equal(denied.run('loadJournal().source'),'unavailable');assert.equal(denied.read().storageOK,false);
  assert.equal(denied.run('persist()'),false);assert.deepEqual(denied.writes,[]);assert.equal(storage.get(KEY),snapshot);assert.equal(storage.get(BACKUP),snapshot);
 });
 console.log(checks+' journal backup checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
