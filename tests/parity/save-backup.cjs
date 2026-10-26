/* Production save/load boundary with Storage failures. This does not certify
 * cross-tab ownership or atomicity across the separate journal/photo stores. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/voyage.js','utf8');
const saveSource=source.slice(0,source.indexOf('function radio('));
const sessionSource=fs.readFileSync('src/save_session.js','utf8'),guardSource=fs.readFileSync('src/save_session_ui.js','utf8');
const KEY='return-blue.voyage.1',BACKUP=KEY+'.backup';
const snapshot=JSON.stringify({schema:1,completed:['arrival','naturalist'],visited:['garden'],distance:1800,dives:4,totalSeconds:900,features:{}});
const plain=value=>JSON.parse(JSON.stringify(value));
async function session(storage,failWrite=()=>false,failRead=()=>false){
 const nodes=new Map(),writes=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',addEventListener(){},classList:{add(){}},focus(){},showModal(){this.open=true;}});return nodes.get(id);};
 const status=element('saveStatus');
 // Each reopened-save fixture has an independent browser service. Real multi-tab
 // lock arbitration is covered by save-session and the native browser tests.
 const locks={request(name,options,callback){return Promise.resolve().then(()=>callback({name,mode:'exclusive'}));}};
 const context=vm.createContext({
  console:{warn(){}},OceanTrench:{worldBounds:{},stations:[]},LANDMARKS:[{id:'garden'}],SPECIES:[{id:'chromis'}],
  oceanFeatures:{read:raw=>raw||{}},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),TAU:Math.PI*2,
  active:false,player:{p:[0,-7,0],yaw:0,pitch:0},diveSeconds:0,$:element,
  navigator:{locks},window:{addEventListener(){}},document:{addEventListener(){}},STORE_KEY:'return-blue.shilang.v1',
  localStorage:{getItem(key){if(failRead(key))throw new Error("Storage read unavailable");return storage.get(key)??null;},setItem(key,value){writes.push(key);if(failWrite(key))throw Object.assign(new Error('Storage is full'),{name:'QuotaExceededError'});storage.set(key,String(value));}}
 });
 vm.runInContext(sessionSource,context);vm.runInContext(saveSource,context);vm.runInContext(guardSource,context);
 // This suite covers voyage save/load, not bootstrap's IndexedDB preflight.
 assert.equal(await vm.runInContext('oceanSaveSession.acquire()',context),true);
 return {run:code=>vm.runInContext(code,context),status,writes};
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
await check('recoverable progress survives corrupt primary plus a failed replacement save',async()=>{
 const storage=new Map([[KEY,'{broken'],[BACKUP,snapshot]]),recovered=await session(storage,key=>key===KEY);
 recovered.run('loadVoyage()');
 assert.deepEqual(plain(recovered.run('voyage.state.completed')),['arrival','naturalist']);
 recovered.run('voyage.state.distance=2000');
 assert.equal(recovered.run('saveVoyage()'),false);
 assert.equal(recovered.run('voyage.storageOK'),false);
 assert.match(recovered.status.textContent,/儲存受限/);
 assert.equal(storage.get(BACKUP),snapshot,'A corrupt primary must never replace the good backup');
 const reopened=await session(storage);reopened.run('loadVoyage()');
 assert.equal(reopened.run('voyage.loaded'),true);
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(reopened.run('voyage.state.distance'),1800);
});
await check('an unavailable optional backup does not prevent saving current progress',async()=>{
 const storage=new Map([[KEY,snapshot],[BACKUP,snapshot]]),current=await session(storage,key=>key===BACKUP);
 current.run('loadVoyage();voyage.state.completed.push("photographer");voyage.state.distance=2000');
 assert.equal(current.run('saveVoyage()'),true);
 assert.equal(current.run('voyage.storageOK'),true);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=await session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist','photographer']);
 assert.equal(reopened.run('voyage.state.distance'),2000);
});
await check('failed primary and backup writes retain the prior playable save and report failure',async()=>{
 const older=JSON.stringify({schema:1,completed:['arrival'],features:{}});
 const storage=new Map([[KEY,snapshot],[BACKUP,older]]),current=await session(storage,()=>true);
 current.run('loadVoyage();voyage.state.completed.push("photographer")');
 assert.equal(current.run('saveVoyage()'),false);
 assert.equal(current.run('voyage.storageOK'),false);
 assert.match(current.status.textContent,/儲存受限/);
 assert.equal(storage.get(KEY),snapshot);
 assert.equal(storage.get(BACKUP),older);
 const reopened=await session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
});
await check('successful saves rotate a readable primary into a usable fallback',async()=>{
 const storage=new Map([[KEY,snapshot]]),current=await session(storage);
 current.run('loadVoyage();voyage.state.completed.push("photographer")');
 assert.equal(current.run('saveVoyage()'),true);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=await session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist','photographer']);
 storage.set(KEY,'{broken');
 const recovered=await session(storage);recovered.run('loadVoyage()');
 assert.deepEqual(plain(recovered.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(recovered.run('voyage.state.distance'),1800);
});
await check('an unreadable save schema cannot replace the last compatible backup',async()=>{
 const storage=new Map([[KEY,JSON.stringify({schema:999,completed:['archive']})],[BACKUP,snapshot]]),current=await session(storage,key=>key===KEY);
 current.run('loadVoyage()');
 assert.deepEqual(plain(current.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(current.run('saveVoyage()'),false);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=await session(storage);reopened.run('loadVoyage()');
 assert.equal(reopened.run('voyage.loaded'),true);
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
});
await check('unreadable primary and backup cannot be overwritten by an automatic save',async()=>{
 const storage=new Map([[KEY,'{broken primary'],[BACKUP,'{broken backup']]),before=[...storage];
 const current=await session(storage);current.run('loadVoyage()');
 assert.equal(current.run('saveVoyage()'),false,'Unreadable prior progress must not become a new empty voyage');
 assert.deepEqual([...storage],before,'Preserve the exact original bytes');
 assert.equal(current.writes.length,0);
});
await check('incompatible, empty and temporarily inaccessible records are not new voyages',async()=>{
 for(const raw of ['','null','[]',JSON.stringify({schema:2,distance:8800})]){
  const storage=new Map([[KEY,raw],[BACKUP,raw]]),f=await session(storage);f.run('loadVoyage()');
  assert.equal(f.run('saveVoyage()'),false);assert.equal(f.writes.length,0);assert.equal(storage.get(KEY),raw);
 }
 const storage=new Map([[KEY,snapshot]]);let blocked=true;
 const f=await session(storage,()=>false,()=>blocked);f.run('loadVoyage()');blocked=false;
 assert.equal(f.run('saveVoyage()'),false,'A later available Storage must not permit an unread initial snapshot to overwrite it');
 assert.equal(storage.get(KEY),snapshot);assert.equal(f.writes.length,0);
 f.run('loadVoyage()');assert.equal(f.run('saveVoyage()'),true);assert.equal(f.run('voyage.state.distance'),1800);
});
await check('a genuinely new browser can save and reopen its first voyage',async()=>{
 const storage=new Map(),f=await session(storage);f.run('loadVoyage();voyage.state.distance=37');
 assert.equal(f.run('saveVoyage()'),true);const reopened=await session(storage);reopened.run('loadVoyage()');assert.equal(reopened.run('voyage.state.distance'),37);
});
console.log(checks+' save backup checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
