/* Production save/load boundary with Storage failures. This does not certify
 * cross-tab ownership or atomicity across the separate journal/photo stores. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/voyage.js','utf8');
const saveSource=source.slice(0,source.indexOf('function radio('));
const KEY='return-blue.voyage.1',BACKUP=KEY+'.backup';
const snapshot=JSON.stringify({schema:1,completed:['arrival','naturalist'],visited:['garden'],distance:1800,dives:4,totalSeconds:900,features:{}});
const plain=value=>JSON.parse(JSON.stringify(value));
function session(storage,failWrite=()=>false){
 const status={textContent:''},writes=[];
 const context=vm.createContext({
  console:{warn(){}},OceanTrench:{worldBounds:{},stations:[]},LANDMARKS:[{id:'garden'}],SPECIES:[{id:'chromis'}],
  oceanFeatures:{read:raw=>raw||{}},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),TAU:Math.PI*2,
  active:false,player:{p:[0,-7,0],yaw:0,pitch:0},diveSeconds:0,$:()=>status,
  localStorage:{getItem:key=>storage.get(key)??null,setItem(key,value){writes.push(key);if(failWrite(key))throw Object.assign(new Error('Storage is full'),{name:'QuotaExceededError'});storage.set(key,String(value));}}
 });
 vm.runInContext(saveSource,context);
 return {run:code=>vm.runInContext(code,context),status,writes};
}
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('recoverable progress survives corrupt primary plus a failed replacement save',()=>{
 const storage=new Map([[KEY,'{broken'],[BACKUP,snapshot]]),recovered=session(storage,key=>key===KEY);
 recovered.run('loadVoyage()');
 assert.deepEqual(plain(recovered.run('voyage.state.completed')),['arrival','naturalist']);
 recovered.run('voyage.state.distance=2000');
 assert.equal(recovered.run('saveVoyage()'),false);
 assert.equal(recovered.run('voyage.storageOK'),false);
 assert.match(recovered.status.textContent,/儲存受限/);
 assert.equal(storage.get(BACKUP),snapshot,'A corrupt primary must never replace the good backup');
 const reopened=session(storage);reopened.run('loadVoyage()');
 assert.equal(reopened.run('voyage.loaded'),true);
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(reopened.run('voyage.state.distance'),1800);
});
check('an unavailable optional backup does not prevent saving current progress',()=>{
 const storage=new Map([[KEY,snapshot],[BACKUP,snapshot]]),current=session(storage,key=>key===BACKUP);
 current.run('loadVoyage();voyage.state.completed.push("photographer");voyage.state.distance=2000');
 assert.equal(current.run('saveVoyage()'),true);
 assert.equal(current.run('voyage.storageOK'),true);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist','photographer']);
 assert.equal(reopened.run('voyage.state.distance'),2000);
});
check('failed primary and backup writes retain the prior playable save and report failure',()=>{
 const older=JSON.stringify({schema:1,completed:['arrival'],features:{}});
 const storage=new Map([[KEY,snapshot],[BACKUP,older]]),current=session(storage,()=>true);
 current.run('loadVoyage();voyage.state.completed.push("photographer")');
 assert.equal(current.run('saveVoyage()'),false);
 assert.equal(current.run('voyage.storageOK'),false);
 assert.match(current.status.textContent,/儲存受限/);
 assert.equal(storage.get(KEY),snapshot);
 assert.equal(storage.get(BACKUP),older);
 const reopened=session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
});
check('successful saves rotate a readable primary into a usable fallback',()=>{
 const storage=new Map([[KEY,snapshot]]),current=session(storage);
 current.run('loadVoyage();voyage.state.completed.push("photographer")');
 assert.equal(current.run('saveVoyage()'),true);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=session(storage);reopened.run('loadVoyage()');
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist','photographer']);
 storage.set(KEY,'{broken');
 const recovered=session(storage);recovered.run('loadVoyage()');
 assert.deepEqual(plain(recovered.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(recovered.run('voyage.state.distance'),1800);
});
check('an unreadable save schema cannot replace the last compatible backup',()=>{
 const storage=new Map([[KEY,JSON.stringify({schema:999,completed:['archive']})],[BACKUP,snapshot]]),current=session(storage,key=>key===KEY);
 current.run('loadVoyage()');
 assert.deepEqual(plain(current.run('voyage.state.completed')),['arrival','naturalist']);
 assert.equal(current.run('saveVoyage()'),false);
 assert.equal(storage.get(BACKUP),snapshot);
 const reopened=session(storage);reopened.run('loadVoyage()');
 assert.equal(reopened.run('voyage.loaded'),true);
 assert.deepEqual(plain(reopened.run('voyage.state.completed')),['arrival','naturalist']);
});
console.log(checks+' save backup checks passed');
