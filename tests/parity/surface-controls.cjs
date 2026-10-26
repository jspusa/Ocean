/* Production camera/actions/input/save tests; CPU only, no rendered claims. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('src/app.js','utf8'),voyageSource=fs.readFileSync('src/voyage.js','utf8');
const storage=new Map(),nodes=new Map();
const c=vm.createContext({console,performance:{now:()=>100},STORE_KEY:'return-blue.shilang.v1',window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name+'.js'});
Object.assign(c,{active:true,modal:null,photoOpen:false,auto:false,follow:null,cameraCut:true,lastCameraThird:false,cameraFollowLength:6.3,eye:[0,-.8,23],target:[0,-.8,22],t:0,diveSeconds:12,simulationAccumulator:0,previousPhysicsPosition:null,inputCleanup:[],stick:[0,0],lookStick:[0,0],verticalInput:0,keys:new Set(),capture:false,player:{p:[0,-.8,23],yaw:.2,pitch:-.1,velocity:[0,0,0]},settings:{third:true,reduced:true,sensitivity:1,speed:1},renderer:{dirty:false,forceShadow:false},selectionClears:0,notices:[],opened:[],navigator:{getGamepads:()=>c.pad?[c.pad]:[]}});
c.$=id=>{if(!nodes.has(id))nodes.set(id,{style:{},addEventListener(){},classList:{add(){},remove(){},toggle(){}}});return nodes.get(id)};
c.document={getElementById:c.$,addEventListener(){}};
c.navigator.locks={request(name,options,callback){return Promise.resolve().then(()=>callback({name,mode:options.mode}));}};
vm.runInContext(fs.readFileSync('src/save_session.js','utf8'),c,{filename:'save_session.js'});
c.oceanFeatures={pointerCaptured:()=>c.capture,read:x=>x||{},register(){}};
c.oceanSelection={clear:()=>c.selectionClears++};c.toast=text=>c.notices.push(text);
c.stopAuto=()=>{c.auto=false;c.follow=null};c.openPanel=type=>{c.modal=type;c.opened.push(type)};c.closePanel=()=>{c.modal=null};
c.toggleCruise=()=>{};c.takePhoto=()=>{};c.observeNearest=()=>{};
vm.runInContext('diverBatch={visible:false,instances:[{p:[0,0,0]}]};',c);
vm.runInContext(voyageSource.slice(voyageSource.indexOf('const VOYAGE_KEY='),voyageSource.indexOf('function loadVoyage(')),c);
vm.runInContext(app.slice(app.indexOf('function resetInput('),app.indexOf('function handleFailure(')),c);
vm.runInContext(app.slice(app.indexOf('function collide('),app.indexOf('function startDive(')),c);
vm.runInContext(app.slice(app.indexOf('function lerpAngle('),app.indexOf('function blocked(')),c);
vm.runInContext(fs.readFileSync('src/gamepad_ui.js','utf8'),c,{filename:'gamepad_ui.js'});
vm.runInContext(fs.readFileSync('src/gamepad_pointer.js','utf8'),c,{filename:'gamepad_pointer.js'});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function disconnectGamepad('),voyageSource.indexOf('function initVoyage(')),c);
// An empty, existing IndexedDB recovery store is the I/O boundary. The real
// photography preflight and save guard must make the controller session live.
let recoveryReads=0;
c.indexedDB={open(name,version){
 assert.equal(name,'return-blue.photographs.1');assert.equal(version,2);
 const connection={close(){},transaction(store,mode){
  assert.equal(store,'recovery');assert.equal(mode,'readonly');
  const transaction={objectStore(selected){assert.equal(selected,store);return {get(key){assert.equal(key,'@import');recoveryReads++;const request={result:undefined};queueMicrotask(()=>{request.onsuccess?.();queueMicrotask(()=>transaction.oncomplete?.());});return request;}};}};
  return transaction;
 }};
 const request={result:connection};queueMicrotask(()=>request.onsuccess?.());return request;
}};
vm.runInContext(fs.readFileSync('src/photography.js','utf8'),c,{filename:'photography.js'});
vm.runInContext(fs.readFileSync('src/save_session_ui.js','utf8'),c,{filename:'save_session_ui.js'});
const get=s=>vm.runInContext(s,c),actions=get('oceanSwimActions'),clone=v=>JSON.parse(JSON.stringify(v));
let count=0;
function check(name,test){test();count++;console.log('PASS '+name)}
function fresh(p=[0,-.8,23]){actions.exit();c.active=true;c.modal=null;c.photoOpen=false;c.capture=false;c.auto=false;c.follow=null;c.player.p=p.slice();c.player.yaw=.2;c.player.pitch=-.1;c.player.velocity=[0,0,0];c.settings.third=true;c.resetInput();get('obstacles.length=0;voyage.gamepadButtons=[];');}
(async()=>{
assert.equal(await get('oceanSaveGuard.start()'),true);
assert.equal(get('oceanSaveSession.writable && oceanSaveGuard.live'),true);
assert.equal(recoveryReads,1,'The real save guard must complete startup recovery before controller input');
check('deep water rejects surface view without teleporting or cancelling a route',()=>{fresh([0,-8,23]);c.auto=true;c.follow={p:[0,-8,24]};const p=clone(c.player.p);assert.equal(actions.toggleSurface(),false);assert.deepEqual(clone(c.player.p),p);assert(c.auto);assert(c.follow);assert(!actions.isSurface());});
check('surface view changes the real camera above water without moving the diver or changing preferred view',()=>{fresh();const p=clone(c.player.p);assert(actions.toggleSurface());assert.deepEqual(clone(c.player.p),p);assert(c.eye[1]>0);assert.equal(c.target[1],c.eye[1]);assert.equal(c.settings.third,true);assert.equal(get('diverBatch.visible'),false);});
check('right-stick look changes surface direction while position remains fixed',()=>{fresh();actions.toggleSurface();const p=clone(c.player.p),yaw=c.player.yaw;c.lookStick=[.5,-.25];c.updatePlayer(.2);c.updateCamera();assert(c.player.yaw>yaw);assert(c.target[1]>c.eye[1]);assert.deepEqual(clone(c.player.p),p);assert(actions.isSurface());});
check('keyboard swimming exits surface view and immediately resumes normal physics',()=>{fresh();actions.toggleSurface();const p=clone(c.player.p);c.keys.add('KeyW');c.updatePlayer(.2);c.updateCamera();assert(!actions.isSurface());assert(get('V.dist(player.p,previousTest)>0.05'.replace('previousTest',JSON.stringify(p))));assert(c.eye[1]<0);});
check('touch movement and depth controls each return to swimming',()=>{for(const input of ['stick','vertical']){fresh();actions.toggleSurface();const p=clone(c.player.p);if(input==='stick')c.stick=[.7,-.5];else c.verticalInput=-1;c.updatePlayer(.2);assert(!actions.isSurface());assert(get('V.dist(player.p,'+JSON.stringify(p)+')>.05'));}});
check('surface clearance rejects a boat or rock overhead, including a blocked camera endpoint',()=>{fresh();get('obstacles.push({p:[0,.25,23],s:[.8,.15,.8]});');assert.equal(actions.canSurface(),false);assert.equal(actions.toggleSurface(),false);assert(c.player.p[1]<0);});
check('underwater roof does not become a path to the surface',()=>{fresh([-218,-26,-70]);assert.equal(actions.canSurface(),false);assert.equal(actions.toggleSurface(),false);assert.deepEqual(clone(c.player.p),[-218,-26,-70]);});
check('leaving the depth gate cancels a stale surface camera',()=>{fresh();actions.toggleSurface();c.player.p[1]=-4;c.updateCamera();assert(!actions.isSurface());assert(c.eye[1]<0);});
check('quick turnaround cancels follow, stops velocity and flips actual camera heading without teleport',()=>{fresh([0,-8,23]);c.settings.third=false;c.auto=true;c.follow={p:[0,-8,18]};c.player.velocity=[2,1,3];c.player.targetYaw=.2;const p=clone(c.player.p),yaw=c.player.yaw,pitch=c.player.pitch;assert(actions.quickTurn());assert(!c.auto);assert.equal(c.follow,null);assert.deepEqual(clone(c.player.p),p);assert.deepEqual(clone(c.player.velocity),[0,0,0]);assert(Math.abs(Math.cos(c.player.yaw-yaw)+1)<1e-10);assert.equal(c.player.targetYaw,c.player.yaw);assert.equal(c.player.pitch,pitch);assert(Math.abs(Math.atan2(c.target[0]-c.eye[0],-(c.target[2]-c.eye[2]))-c.player.yaw)<1e-10);});
check('paused, photo-viewing and captured-pointer tools reject camera actions',()=>{for(const state of ['modal','photoOpen','capture']){fresh();c[state]=state==='modal'?'settings':true;const yaw=c.player.yaw;assert.equal(actions.quickTurn(),false);assert.equal(actions.toggleSurface(),false);assert.equal(c.player.yaw,yaw);}});
check('existing save schema stores actual submerged position and heading, not the transient surface camera',()=>{fresh();actions.toggleSurface();actions.quickTurn();const saved=JSON.parse(storage.get('return-blue.voyage.1'));assert.deepEqual(saved.resume.p,clone(c.player.p));assert(saved.resume.p[1]<0);assert.equal(saved.resume.yaw,c.player.yaw);assert.equal(saved.resume.pitch,0);c.saved=saved;const restored=get('readVoyage(saved)');assert.deepEqual(clone(restored.resume),saved.resume);assert(!Object.hasOwn(saved,'surface'));actions.exit();assert(!actions.isSurface());});
function pad(button){return {connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===button,value:i===button?1:0}))}}
check('actual gamepad poll maps LB to one turn per press and RB to surface toggle',()=>{fresh();c.pad=pad(4);const yaw=c.player.yaw;c.pollGamepad();const turned=c.player.yaw;assert(Math.abs(Math.cos(turned-yaw)+1)<1e-10);c.pollGamepad();assert.equal(c.player.yaw,turned);c.pad=pad(-1);c.pollGamepad();c.pad=pad(5);c.pollGamepad();assert(actions.isSurface());c.pollGamepad();assert(actions.isSurface());c.pad=pad(-1);c.pollGamepad();c.pad=pad(5);c.pollGamepad();assert(!actions.isSurface());});
check('gamepad menu exits surface view first, then opens the same minimal pause menu',()=>{fresh();actions.toggleSurface();c.pad=pad(9);c.pollGamepad();assert(!actions.isSurface());assert.equal(c.modal,null);c.pad=pad(-1);c.pollGamepad();c.pad=pad(9);c.pollGamepad();assert.equal(c.modal,'diveMenu');});
check('a gamepad service failure releases previous swimming, look and held-depth input',()=>{
 fresh([0,-8,23]);c.pad=pad(7);c.pad.axes=[.6,-.4,.5,-.3];c.pollGamepad();
 assert(c.stick.some(Boolean));assert(c.lookStick.some(Boolean));assert.equal(c.verticalInput,1);
 const readPads=c.navigator.getGamepads;c.navigator.getGamepads=()=>{throw new Error('Gamepad service unavailable');};
 try{c.pollGamepad();assert.deepEqual(clone(c.stick),[0,0]);assert.deepEqual(clone(c.lookStick),[0,0]);assert.equal(c.verticalInput,0);assert.equal(get('voyage.gamepadAttached || voyage.gamepadDepth'),false);assert.deepEqual(clone(get('voyage.gamepadButtons')),[]);}finally{c.navigator.getGamepads=readPads;}
});
check('an absent or unavailable unused gamepad cannot cancel independent native movement',()=>{
 fresh([0,-8,23]);c.pad=null;c.pollGamepad();c.stick=[.7,-.4];c.lookStick=[.2,.1];c.verticalInput=-1;c.pollGamepad();
 const readPads=c.navigator.getGamepads;c.navigator.getGamepads=()=>{throw new Error('Gamepad service unavailable');};
 try{c.pollGamepad();assert.deepEqual(clone(c.stick),[.7,-.4]);assert.deepEqual(clone(c.lookStick),[.2,.1]);assert.equal(c.verticalInput,-1);}finally{c.navigator.getGamepads=readPads;}
});
console.log(`${count}/${count} surface control checks passed`);
get('oceanSaveSession.close()');
})().catch(error=>{console.error(error);process.exitCode=1;});
