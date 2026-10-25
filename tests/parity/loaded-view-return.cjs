/* Production frame checkpoint, camera, regional residency and recovery action.
 * Network/render uploads are CPU adapters; this is not rendered-image evidence. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync('src/'+name+'.js','utf8'),app=read('app'),plain=x=>JSON.parse(JSON.stringify(x));
function fixture({third=false,follow=false,cold=true}={}){
 const nodes=new Map(),classes=()=>({add(){},remove(){},toggle(){},contains:()=>false});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,style:{},classList:classes(),setAttribute(){},append(){},addEventListener(){},hidden:false});return nodes.get(id);};
 let requests=0,frames=0;
 const c=vm.createContext({console,URL,AbortController,performance:{now:()=>1000},location:{href:'https://example.test/Ocean/'},fetch:()=>{requests++;return new Promise(()=>{});},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},
  document:{hidden:false,hasFocus:()=>true,getElementById:node,createElement:()=>node('status'),body:node('body')},window:{__statsAt:Infinity},$:node,
  active:true,ready:true,modal:null,photoOpen:false,auto:follow,follow:follow?{p:[0,-8,13]}:null,followDistance:2.8,followViewAngle:0,
  cameraCut:true,lastCameraThird:null,cameraFollowLength:6.3,eye:[0,-8,23],target:[0,-8,22],t:0,lastTime:100,diveSeconds:12,
  settings:{third,speed:1,sensitivity:1,reduced:true,lighting:'day',clarity:1,lamp:false,fov:69},
  player:{p:[0,-8,23],yaw:0,pitch:0,velocity:[0,0,0]},keys:new Set(),stick:[0,0],lookStick:[0,0],verticalInput:0,inputCleanup:[],notices:[],
  oceanPerf:{pause(){},record(){}},oceanFeatures:{pointerCaptured:()=>false,shouldAnimate:()=>false,call(){}},oceanSelection:{clear(){}},oceanDeepsea:{cancelTravel(){}},
  pollGamepad(){},setAutoUI(){},saveVoyage(){},updateLife(){},toast:message=>c.notices.push(message),voyage:{state:{distance:0},sessionDistance:0}
 });
 for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions','scene_stream'])vm.runInContext(read(name),c,{filename:name+'.js'});
 c.updateLife=()=>{};
 c.renderer={mobile:false,quality:2,batches:[],gl:{UNSIGNED_SHORT:5123},deferredBatch(meta,instances){const batch={...meta,instances,visible:true,indexType:5123};this.batches.push(batch);return batch;},render(eye){const ready=this.sceneStream.update(eye,false);if(ready)frames++;return ready;}};
 vm.runInContext('diverBatch={visible:false,instances:[{p:[0,0,0]}]};',c);
 for(const [start,end]of [['function resetInput(','function handleFailure('],['function collide(','function startDive('],['function stopAuto(','function jumpTo('],['function lerpAngle(','function blocked('],['function applyVisualSettings(','function releaseMouseLook('],['let simulationAccumulator=','function initAudio(']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),c,{filename:'app.js'});
 const Stream=vm.runInContext('SceneStream',c),index={nodes:[{p:[0,-8,23]},{p:[.4,-6.52,29.3]}],meshes:[{chunk:0,vertexFloats:0,indexCount:0},{chunk:1,vertexFloats:0,indexCount:0}],chunks:[{url:'loaded.gz',bytes:1,decodedBytes:1},{url:'cold.gz',bytes:1,decodedBytes:1}],batches:[0,1].map(id=>({meshID:id,instanceIDs:[id],visible:true,maxDistance:.1,dynamic:false,shadow:false}))};
 const stream=new Stream(c.renderer,index,'assets/scene/index.json');c.renderer.sceneStream=stream;stream.meshes[0].resident=true;stream.meshes[1].resident=!cold;
 const get=source=>vm.runInContext(source,c),checkpoint=()=>c.animate(100.001);
 return {c,get,stream,checkpoint,get requests(){return requests;},get frames(){return frames;}};
}
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+': '+error.message);}}
check('return from a cold third-person offset uses the previously rendered follow view without a new fetch',()=>{
 const f=fixture({third:true,follow:true});f.checkpoint();assert.equal(f.frames,1);const eye=f.c.eye.slice();f.c.player.p=[100,-8,23];f.stream.onReturn();
 assert.equal(f.requests,0,'Returning must not request the cold third-person camera region');assert.deepEqual(plain(f.c.eye),eye);assert.equal(f.c.auto,false);assert.equal(f.c.follow,null);assert.equal(f.c.settings.third,false);assert(f.c.notices.at(-1).includes('第一人稱'));
 assert.equal(f.c.renderer.render(f.c.eye),true);f.c.updateCamera(1/60);assert.equal(f.c.renderer.render(f.c.eye),true);assert.equal(f.requests,0);
});
check('return releases a grabbed animal before the next real ecology movement step',()=>{
 const f=fixture();f.checkpoint();const saved=f.c.player.p.slice();f.c.runtime={grabbedUID:'whale-001',riding:false};
 f.c.oceanEcology={snapshot:()=>({...f.c.runtime}),toggleRide(){f.c.runtime.grabbedUID=null;f.c.runtime.riding=false;return true;}};
 f.c.fishByUID=()=>({p:[100,-8,23],yaw:0,s:[1,1,1],species:10});f.c.profile=()=>null;
 f.c.moveToward=(a,b,speed,dt)=>{const d=Math.hypot(...a.map((v,i)=>b[i]-v)),u=Math.min(1,speed*dt/d);return a.map((v,i)=>v+(b[i]-v)*u);};
 f.c.releaseGrab=()=>{f.c.runtime.grabbedUID=null;};
 const ecology=read('ecology');vm.runInContext(ecology.slice(ecology.indexOf('const oldPlayer=updatePlayer;updatePlayer=function(dt){'),ecology.indexOf('  const oldCamera=shipCamera;')),f.c,{filename:'ecology-movement.js'});
 f.c.player.p=[50,-8,23];f.stream.onReturn();assert.equal(f.c.runtime.grabbedUID,null);f.c.updatePlayer(1/120);assert.deepEqual(plain(f.c.player.p),saved);assert.equal(f.requests,0);
});
check('ordinary first-person and resident third-person cameras retain their preference and exact rendered eye',()=>{
 for(const third of [false,true]){
  const f=fixture({third,cold:false});f.checkpoint();const eye=plain(f.c.eye),position=plain(f.c.player.p);f.c.player.p=[100,-8,23];f.c.player.yaw=2;f.c.player.pitch=.7;f.stream.onReturn();
  assert.equal(f.c.settings.third,third);assert.deepEqual(plain(f.c.eye),eye);assert.deepEqual(plain(f.c.player.p),position);assert.equal(f.c.renderer.render(f.c.eye),true);assert.equal(f.requests,0);
 }
});
check('surface viewing releases before returning to a normal submerged player camera',()=>{
 const f=fixture({third:true,cold:false});f.c.player.p=[0,-.8,23];const actions=f.get('oceanSwimActions');assert(actions.toggleSurface());f.checkpoint();assert(actions.isSurface());f.c.player.p=[100,-.8,23];f.stream.onReturn();
 assert.equal(actions.isSurface(),false);assert(f.c.player.p[1]<=-.65);assert(f.c.eye[1]<0);assert.equal(f.c.settings.third,true);assert.equal(f.requests,0);
});
check('return exits a macro view before its next camera hook can restore the failed lens',()=>{
 const f=fixture();f.checkpoint();const eye=plain(f.c.eye);let macro=true;
 f.c.oceanMicrocosm={isViewing:()=>macro,exit(){macro=false;}};
 f.c.oceanFeatures.call=name=>{if(name==='afterCamera'&&macro){f.c.eye=[100,-8,23];f.c.target=[100,-8,22];}};
 f.c.player.p=[100,-8,23];f.stream.onReturn();f.c.updateCamera(1/60);f.c.oceanFeatures.call('afterCamera',1/60);
 assert.equal(macro,false);assert.deepEqual(plain(f.c.eye),eye);assert.equal(f.c.renderer.render(f.c.eye),true);assert.equal(f.requests,0);
});
console.log(`${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
