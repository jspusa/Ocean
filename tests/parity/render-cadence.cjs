/* The shipped animate/RAF boundary, production swimming and performance policy.
 * Time, DOM visibility and the renderer submission boundary are adapters. These
 * are deterministic scheduling/physics checks, not GPU speed or battery data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),refAt=process.argv.indexOf('--source-ref'),ref=refAt<0?null:process.argv[refAt+1];
const read=name=>ref?cp.execFileSync('git',['show',ref+':src/'+name+'.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const app=read('app');
function fixture({active=true,liveFeature=false,adaptive=false}={}){
 let now=0,padPolls=0,live=liveFeature,renderFails=false,resizeCount=0;const scheduled=[],frames=[],poses=[],observations=[],idle=[],cameraTimes=[],messages=[],focusListeners=[];
 const canvas={width:1000,height:700},renderer={canvas,quality:2,dynamicScale:1,dirty:true,sceneStream:null,cpuRenderMs:0,drawCalls:0,submittedTriangles:0,submittedVertices:0,individualCount:0,msaaSamples:0,gl:{getExtension:()=>null},
  render(eye,target,time){frames.push({ms:now,time,eye:[...eye],target:[...target],p:[...c.player.p],complete:!renderFails});if(renderFails)return false;if(this.pendingResize){canvas.width=1200;this.pendingResize=false;}this.dirty=false;},resize(){resizeCount++;this.dirty=true;}};
 const c=vm.createContext({console,performance:{now:()=>now},window:{__statsAt:1e9,addEventListener(type,fn){if(type==='focus')focusListeners.push(fn);}},document:{hidden:false,hasFocus:()=>true,documentElement:{dataset:{version:'cadence-fixture'}}},requestAnimationFrame:callback=>scheduled.push(callback),ready:true,active,modal:null,photoOpen:false,lastTime:0,t:0,diveSeconds:0,eye:[0,-5,0],target:[0,-5,-1],cameraCut:true,cameraFollowLength:6.3,lastCameraThird:null,player:{p:[0,-5,0],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1,third:false,sensitivity:1,reduced:true,adaptive},keys:new Set(['KeyW']),stick:[0,0],lookStick:[0,0],verticalInput:0,auto:false,follow:null,renderer,diverBatch:{visible:false},LANDMARKS:[{spawn:[0,-5,0],yaw:0,pitch:0}],selectedEntry:0,
  pollGamepad(){padPolls++;},oceanFeatures:{pointerCaptured:()=>false,shouldAnimate:()=>live,call(name,dt){if(name==='idleTick')idle.push(dt);if(name==='afterCamera')cameraTimes.push(dt);}},collide:p=>p,stopAuto(){c.auto=false;},updateLife:time=>poses.push(time),applyVisualSettings(){},observe:dt=>observations.push(dt),voyageTick(){},updateHUD(){},checkLandmarks(){},drawMap(){},animatedPanelTime:0,$:()=>null,toast:message=>messages.push(message),closePanel(){c.modal=null;},OPEN_WORLD:{version:'fixture'},navigator:{userAgent:'deterministic RAF fixture'},life:[],decorLife:[],shoal:[],persistent:{seen:[]},oceanAudio:{status:'silent'}});
 vm.runInContext(read('engine'),c,{filename:'engine.js'});
 vm.runInContext(read('performance'),c,{filename:'performance.js'});
 vm.runInContext(app.slice(app.indexOf('function dir('),app.indexOf('function startDive(')),c);
 vm.runInContext(app.slice(app.indexOf('function updatePlayer('),app.indexOf('function observe(')),c);
 vm.runInContext(app.slice(app.indexOf('let simulationAccumulator='),app.indexOf('function animate(')),c);
 vm.runInContext(app.slice(app.indexOf('function animate('),app.indexOf('function initAudio(')),c);
 vm.runInContext(app.split('\n').find(line=>line.includes("window.addEventListener('focus',")),c);
 const perf=vm.runInContext('oceanPerf',c);perf.lastUI=1e9;
 function frame(ms){now=ms;const callback=scheduled.shift();assert(callback,'the production loop must schedule its next RAF');callback(ms);assert.equal(scheduled.length,1,'one RAF must remain scheduled');}
 c.animate(0);
 return {c,perf,renderer,frames,poses,observations,idle,cameraTimes,messages,frame,focusAt(ms){now=ms;for(const fn of focusListeners)fn();},get polls(){return padPolls;},get resizes(){return resizeCount;},get now(){return now;},set live(value){live=value;},set failRender(value){renderFails=value;},run(hz,seconds=1){const start=now;for(let i=1;i<=Math.round(hz*seconds);i++)frame(start+i*1000/hz);},state(){return vm.runInContext('({t,diveSeconds,simulationAccumulator,observationClock,hudClock,p:player.p.slice(),velocity:player.velocity.slice()})',c);}};
}
const results=[];function check(name,run){try{const evidence=run();results.push({name,pass:true,evidence});console.log('PASS '+name+(evidence?' '+JSON.stringify(evidence):''));}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+'\n'+error.stack);}}
check('60, 120 and 144 Hz RAF submit at most 60 active frames and 30 idle home frames per second',()=>{
 const rows=[];for(const hz of [60,120,144])for(const active of [true,false]){
  const f=fixture({active}),initialFrames=f.frames.length,initialPoses=f.poses.length;f.run(hz,2);
  const count=f.frames.length-initialFrames,poses=f.poses.length-initialPoses,budget=active?120:60;
  assert(count<=budget,`${hz} Hz ${active?'diving':'idle home'} submitted ${count} frames, budget ${budget}`);assert(count>=budget-1,'scheduler must not unnecessarily undershoot its cadence');assert.equal(poses,count,'one world pose update per submitted active frame');
  assert.equal(f.polls,hz*2+1,'input polling remains responsive on every RAF');rows.push({hz,active,frames:count,poses});
 }return rows;
});
check('skipped presentation frames retain 120 Hz swimming, animation and observation time',()=>{
 const reference=fixture();assert.equal(reference.state().t,0,'the initial zero-time presentation cannot invent simulation time');
 for(let i=0;i<240;i++)reference.c.updatePlayer(1/120);
 const expected=reference.state();
 for(const hz of [60,120,144]){const f=fixture();f.run(hz,2);const state=f.state();
  for(let axis=0;axis<3;axis++){assert(Math.abs(state.p[axis]-expected.p[axis])<1e-9,`${hz} Hz swimming distance`);assert(Math.abs(state.velocity[axis]-expected.velocity[axis])<1e-9,`${hz} Hz velocity`);}
  assert(Math.abs(state.t-2)<1e-9,`${hz} Hz animation clock`);assert(Math.abs(state.diveSeconds-2)<1e-9,`${hz} Hz dive clock`);
  assert(Math.abs(f.observations.reduce((sum,dt)=>sum+dt,0)+state.observationClock-2)<1e-9,`${hz} Hz observation time`);
 }
 const f=fixture();f.frame(1000/120);assert.equal(f.frames.length,1,'the intermediate physics step must not submit another full frame');assert(f.c.player.p[2]<0,'input must advance on the intermediate 120 Hz physics step');
 f.frame(1000/60);assert.equal(f.frames.length,2);assert(f.frames.at(-1).eye[2]>f.c.player.p[2],'the rendered camera must retain existing one-step interpolation');
 return {seconds:2,position:[...expected.p]};
});
check('freeze, background, blur, menu and photo pauses discard unsent presentation time',()=>{
 const modes={freeze:f=>f.c.window.__freeze=true,background:f=>f.c.document.hidden=true,blur:f=>f.c.document.hasFocus=()=>false,menu:f=>f.c.modal='settings',photo:f=>f.c.photoOpen=true};
 for(const [name,pause]of Object.entries(modes)){const f=fixture();f.frame(1000/120);const before=f.state();pause(f);f.frame(1000);f.frame(4000);
  assert.equal(f.frames.length,1,name+' must keep the last complete presentation');assert.equal(f.state().t,before.t,name+' animation paused');assert.deepEqual(f.state().p,before.p,name+' swimming paused');
  f.c.window.__freeze=false;f.c.document.hidden=false;f.c.document.hasFocus=()=>true;f.c.modal=null;f.c.photoOpen=false;f.frame(4000+1000/120);
  assert.equal(f.frames.length,2,name+' resume must present promptly');assert(f.cameraTimes.at(-1)<=1/120+1e-9,name+' must not replay old presentation time');assert(f.state().t-before.t<=1/120+1e-9,name+' no paused-time catch-up');
 }
 const f=fixture();f.frame(1000/120);f.c.modal='settings';f.renderer.dirty=true;const before=f.state();f.frame(1000);
 assert.equal(f.frames.length,2,'a dirty paused menu may present settings immediately');assert.equal(f.cameraTimes.at(-1),0,'the paused presentation must have zero animation delta');assert.equal(f.state().t,before.t);
});
check('mode changes present promptly while routine dirty flags cannot defeat the frame budget',()=>{
 const f=fixture({active:false});f.frame(8);f.c.active=true;f.frame(12);assert.equal(f.frames.length,2,'starting a dive must not wait for the home deadline');
 f.c.active=false;f.c.modal='aquariumView';f.live=true;f.frame(14);assert.equal(f.frames.length,3,'opening a live viewer presents immediately');
 const before=f.frames.length;f.run(144,2);assert.equal(f.frames.length-before,120,'interactive viewers run at 60 Hz');f.frame(2050);assert(Math.abs(f.idle.reduce((sum,dt)=>sum+dt,0)-2.038)<1e-8,'all viewer time from the previous 12 ms RAF to the 2050 ms presentation is preserved');
 for(const hz of [120,144]){const g=fixture();for(let i=1;i<=hz;i++){g.renderer.dirty=true;g.frame(i*1000/hz);}assert.equal(g.frames.length-1,60,'routine world/camera invalidation must not make '+hz+' full frames');}
});
check('stream waiting and declined frames preserve presentation and defer resize without replaying wait time',()=>{
 const f=fixture();f.frame(8);const before=f.state();f.renderer.sceneStream={waitStarted:1,update:()=>false};f.renderer.pendingResize=true;f.renderer.dirty=true;
 f.frame(1000);f.frame(4000);assert.equal(f.frames.length,1,'no renderer submission while the stream is known to be waiting');assert.equal(f.renderer.canvas.width,1000,'waiting must not commit a pending resize');assert.equal(f.state().t,before.t);assert.deepEqual(f.state().p,before.p);
 f.renderer.sceneStream.update=()=>{f.renderer.sceneStream.waitStarted=0;return true;};f.frame(4008);
 assert.equal(f.frames.length,2,'the ready scene can commit the pending resize immediately');assert.equal(f.renderer.canvas.width,1200);assert(f.cameraTimes.at(-1)<=.008+1e-9,'wait time and prior unsent time are discarded');assert.equal(f.perf.count,0,'stream wait is excluded from frame diagnostics');
 const g=fixture();g.frame(8);g.failRender=true;g.renderer.pendingResize=true;g.frame(12);assert.equal(g.frames.at(-1).complete,false);assert.equal(g.renderer.canvas.width,1000,'a declined frame leaves the previous presentation dimensions intact');assert.equal(g.perf.count,0);
 g.failRender=false;g.frame(16);assert.equal(g.frames.at(-1).complete,true);assert.equal(g.renderer.canvas.width,1200);assert(g.cameraTimes.at(-1)<=.004+1e-9,'retry must not replay the declined frame');
});
check('intentional 30 Hz home rendering never enters adaptive or benchmark frame samples',()=>{
 const f=fixture({active:false,adaptive:true});f.run(144,10);assert.equal(f.perf.count,0,'home presentation is not a slow-device sample');assert.equal(f.renderer.dynamicScale,1);assert.equal(f.resizes,0);
 f.c.active=true;f.run(144,5);assert.equal(f.renderer.dynamicScale,1,'starting after a slow intentional home cadence must not downgrade quality');assert(Math.abs(f.perf.stats().fps-60)<.01);assert.equal(f.frames.filter(frame=>frame.ms>10000).length,301,'one immediate mode transition plus 300 scheduled presentations');
});
check('adaptive detail recovers under scheduled RAF quantization but still reduces genuine slow visible frames',()=>{
 const rows=[];for(const hz of [60,63,65,75,90,120,144]){const f=fixture({adaptive:true});f.renderer.dynamicScale=.64;f.run(hz,15);
  assert(f.renderer.dynamicScale>.64,`${hz} Hz stable paced rendering must recover detail`);assert(Math.abs(f.perf.stats().fps-60)<.1,'reported rendered FPS remains the actual paced interval');rows.push({hz,scale:f.renderer.dynamicScale,p95:f.perf.stats().p95});
 }
 const slow=fixture({adaptive:true});slow.run(25,12);assert(slow.renderer.dynamicScale<1,'real 40 ms foreground frames still reduce quality');assert.equal(slow.perf.stats().p95,40);return rows;
});
check('the real focus listener resets pending time even when no RAF runs during suspension',()=>{
 const f=fixture();f.frame(8);const before=f.state();f.focusAt(60000);f.frame(60008);
 assert.equal(f.frames.length,2);assert(f.cameraTimes.at(-1)<=.008+1e-9,'pre-suspension presentation time must be discarded');assert(Math.abs(f.state().t-before.t-.008)<1e-9);assert.equal(f.perf.count,0);
});
check('the public 20 second benchmark exports actual paced intervals and preserves fixed quality',()=>{
 const f=fixture({adaptive:true}),panel={classList:{remove(){}}},exportButton={disabled:true};f.c.document.getElementById=id=>id==='perfPanel'?panel:id==='perfExport'?exportButton:null;f.renderer.dynamicScale=.8;
 f.perf.start();f.run(144,21);const report=f.perf.lastResult;assert(report,'the visible benchmark must finish');assert.equal(f.renderer.dynamicScale,.8);assert.equal(report.quality,2);assert.deepEqual(Array.from(report.renderResolution),[1000,700]);assert(report.durationMs>=20000&&report.durationMs<20030);
 const submitted=f.frames.filter(frame=>frame.ms>0),intervals=submitted.slice(1,report.renderedFrames+1).map((frame,index)=>+(frame.ms-submitted[index].ms).toFixed(3));
 assert.deepEqual(Array.from(report.frameIntervalsMs),intervals,'no synthesized 60 Hz samples or skipped RAF entries');assert(intervals.includes(13.889)&&intervals.includes(20.833),'real 144 Hz quantization remains in the export');assert.equal(exportButton.disabled,false);
});
check('opening a photograph pauses even an otherwise live ship or aquarium view',()=>{
 const f=fixture({active:false,liveFeature:true});f.c.modal='aquariumView';f.frame(20);const before=f.state(),presentations=f.frames.length;f.c.photoOpen=true;f.frame(1000);
 assert.equal(f.frames.length,presentations);assert.equal(f.state().t,before.t,'a live viewer cannot keep advancing behind the photograph');f.c.photoOpen=false;f.frame(1008);assert.equal(f.frames.length,presentations+1);assert(f.cameraTimes.at(-1)<=.008+1e-9);
});
console.log(JSON.stringify({source:ref||'working tree',passed:results.filter(r=>r.pass).length,total:results.length,scope:'CPU production RAF/physics; no GPU or device power claim'}));if(results.some(r=>!r.pass))process.exitCode=1;
