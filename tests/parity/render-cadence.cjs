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
check('a steady 60 Hz display with coarse timestamps keeps its frames and automatic detail',()=>{
 const f=fixture({adaptive:true}),reference=fixture();
 for(let i=1;i<=900;i++){f.frame(Math.round(i*1000/60*10)/10);reference.frame(i*1000/60);}
 const evidence={frames:f.frames.length-1,scale:f.renderer.dynamicScale,resizes:f.resizes,fps:f.perf.stats().fps};
 assert.equal(evidence.frames,900,'timestamp rounding must not discard available display frames: '+JSON.stringify(evidence));
 assert.equal(evidence.scale,1,'clock rounding is not evidence of a slow device');assert.equal(evidence.resizes,0);
 assert.equal(f.poses.length,f.frames.length,'each presentation has its current world pose');
 const actual=f.state(),expected=reference.state();
 for(let axis=0;axis<3;axis++){assert(Math.abs(actual.p[axis]-expected.p[axis])<1e-9,'swimming position follows the same elapsed time');assert(Math.abs(actual.velocity[axis]-expected.velocity[axis])<1e-9,'swimming velocity follows the same elapsed time');}
 assert(Math.abs(actual.t-15)<1e-9);assert(Math.abs(actual.diveSeconds-15)<1e-9);
 return evidence;
});
check('coarse 120 Hz timestamps keep evenly spaced dive, home and live-viewer presentations',()=>{
 const rows=[];
 for(const mode of ['dive','home','viewer']){
  const f=fixture({active:mode==='dive',liveFeature:mode==='viewer',adaptive:true});
  if(mode==='viewer')f.c.modal='aquariumView';
  for(let i=1;i<=1800;i++)f.frame(Math.round(i*1000/120*10)/10);
  // Exclude the single immediate mode transition; inspect a whole steady
  // ten-second interval, including its right endpoint and excluding its left.
  const frames=f.frames.filter(frame=>frame.ms>5000&&frame.ms<=15000),times=frames.map(frame=>frame.ms),intervals=times.slice(1).map((ms,i)=>ms-times[i]);
  const count=mode==='home'?300:600,min=mode==='home'?33.3:16.6,max=mode==='home'?33.4:16.7;
  assert.equal(frames.length,count,mode+' keeps the existing presentation cap');
  assert(Math.min(...intervals)>=min-1e-9,mode+' must not bunch frames together');
  assert(Math.max(...intervals)<=max+1e-9,mode+' must not postpone a ready frame for another display tick');
  assert.equal(f.renderer.dynamicScale,1);assert.equal(f.resizes,0);
  if(mode!=='dive')assert.equal(f.perf.count,0,'home and viewer cadence do not enter diving diagnostics');
  rows.push({mode,frames:frames.length,min:Math.min(...intervals),max:Math.max(...intervals)});
 }
 return rows;
});
check('timestamp phase and bounded rounding jitter cannot turn a steady display into a slow device',()=>{
 const rows=[];
 // 0.1 ms clock bins, with a bounded +/- 0.025 ms input jitter. Floor/nearest/
 // ceil and different phases exercise both sides of a presentation deadline.
 for(const rounding of ['floor','round','ceil'])for(const jitter of [false,true])for(const phase of [0,.01,.03,.05,.08,.099]){
  const f=fixture({adaptive:true});let last=0;
  for(let i=1;i<=1800;i++){last=Math[rounding]((i*1000/60+phase+(jitter?[-.025,.025,0][i%3]:0))*10)/10;f.frame(last);}
  const frames=f.frames.filter(frame=>frame.ms>15000&&frame.ms<=30000),evidence={rounding,jitter,phase,frames:frames.length,scale:f.renderer.dynamicScale,resizes:f.resizes};
  assert(frames.length>=899&&frames.length<=900,'steady-window endpoints may omit one frame, never repeated ticks: '+JSON.stringify(evidence));
  assert.equal(evidence.scale,1,'bounded timestamp error cannot reduce detail: '+JSON.stringify(evidence));assert.equal(evidence.resizes,0);
  const state=f.state();assert(Math.abs(state.t-last/1000)<1e-8);assert(Math.abs(state.diveSeconds-last/1000)<1e-8);
  assert(Math.abs(f.observations.reduce((sum,dt)=>sum+dt,0)+state.observationClock-last/1000)<1e-8,'observation time remains the real accumulated elapsed time');
  rows.push(evidence);
 }
 return {cases:rows.length,frames:[Math.min(...rows.map(row=>row.frames)),Math.max(...rows.map(row=>row.frames))],scales:[...new Set(rows.map(row=>row.scale))]};
});
check('coarse clocks recover automatic detail without exceeding the presentation budget at other refresh rates',()=>{
 const rows=[];
 for(const hz of [60,60.01,60.1,61,63,65,75,90,120,144,165,240]){
  const f=fixture({adaptive:true});f.renderer.dynamicScale=.64;
  for(let i=1;i<=Math.floor(hz*30);i++)f.frame(Math.round(i*1000/hz*10)/10);
  const count=f.frames.length-1;
  assert(count>=1799&&count<=1800,`${hz} Hz quantized callbacks must stay within the thirty-second 60 Hz budget: ${count}`);
  assert(f.renderer.dynamicScale>.64,`${hz} Hz must restore detail after stable display windows`);
  assert.equal(f.renderer.quality,2);assert.equal(f.c.settings.adaptive,true);
  rows.push({hz,frames:count,scale:f.renderer.dynamicScale});
 }
 const slow=fixture({adaptive:true});for(let i=1;i<=300;i++)slow.frame(i*40);
 assert.equal(slow.frames.length-1,300,'each genuinely slow callback still submits a frame');
 assert(slow.renderer.dynamicScale<1,'the clock tolerance cannot hide real slow frames');assert.equal(slow.perf.stats().p95,40);
 return rows;
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
check('coarse-clock resumes discard paused time and retain prompt resize and stream recovery',()=>{
 const modes={menu:f=>f.c.modal='settings',background:f=>f.c.document.hidden=true,blur:f=>f.c.document.hasFocus=()=>false,stream:f=>f.renderer.sceneStream={waitStarted:1,update:()=>false}};
 for(const [mode,pause]of Object.entries(modes)){
  const f=fixture({adaptive:true});f.frame(16.7);f.frame(25);const before=f.state(),count=f.frames.length;pause(f);f.frame(1000);f.frame(4000);
  assert.equal(f.frames.length,count,mode+' keeps the completed picture');assert.equal(f.state().t,before.t);assert.deepEqual(f.state().p,before.p);
  f.c.modal=null;f.c.document.hidden=false;f.c.document.hasFocus=()=>true;
  if(mode==='stream'){f.renderer.pendingResize=true;f.renderer.sceneStream.update=()=>{f.renderer.sceneStream.waitStarted=0;return true;};}
  f.frame(4000.1);assert.equal(f.frames.length,count+1,mode+' resumes without waiting for an old deadline');assert(f.cameraTimes.at(-1)<.000101,'paused time cannot enter the resumed camera delta');
  if(mode==='stream')assert.equal(f.renderer.canvas.width,1200,'the first complete resumed view commits its pending resize');
  const resumed=f.frames.length;for(let i=1;i<=60;i++)f.frame(Math.round((4000.1+i*1000/60)*10)/10);
  assert.equal(f.frames.length-resumed,60,mode+' restores the display cadence');assert.equal(f.renderer.dynamicScale,1);assert.equal(f.resizes,0);
  assert(Math.abs(f.state().t-before.t-1.0001)<1e-8,'only real foreground time advances the world');
 }
 const resize=fixture();resize.frame(16.7);const before=resize.frames.length;resize.renderer.pendingResize=true;resize.frame(20.1);
 assert.equal(resize.frames.length,before+1,'an early explicit resize still presents immediately');assert.equal(resize.renderer.canvas.width,1200);
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
check('the coarse-clock benchmark exports the actual display intervals without smoothing them',()=>{
 const f=fixture({adaptive:true}),panel={classList:{remove(){}}},exportButton={disabled:true};f.c.document.getElementById=id=>id==='perfPanel'?panel:id==='perfExport'?exportButton:null;f.renderer.dynamicScale=.8;
 f.perf.start();for(let i=1;i<=1260;i++)f.frame(Math.round(i*1000/60*10)/10);
 const report=f.perf.lastResult;assert(report);assert.equal(f.renderer.dynamicScale,.8);assert.equal(f.renderer.quality,2);
 const submitted=f.frames.filter(frame=>frame.ms>0),intervals=submitted.slice(1,report.renderedFrames+1).map((frame,index)=>+(frame.ms-submitted[index].ms).toFixed(3));
 assert.deepEqual(Array.from(report.frameIntervalsMs),intervals,'reported intervals remain the real submitted timestamps');
 assert(intervals.includes(16.6)&&intervals.includes(16.7),'clock bins stay visible in the exported samples');
 assert(Math.abs(report.averageFPS-60)<.01);assert(report.p95FrameMs>=16.69&&report.p95FrameMs<=16.71);assert.equal(exportButton.disabled,false);
});
check('opening a photograph pauses even an otherwise live ship or aquarium view',()=>{
 const f=fixture({active:false,liveFeature:true});f.c.modal='aquariumView';f.frame(20);const before=f.state(),presentations=f.frames.length;f.c.photoOpen=true;f.frame(1000);
 assert.equal(f.frames.length,presentations);assert.equal(f.state().t,before.t,'a live viewer cannot keep advancing behind the photograph');f.c.photoOpen=false;f.frame(1008);assert.equal(f.frames.length,presentations+1);assert(f.cameraTimes.at(-1)<=.008+1e-9);
});
console.log(JSON.stringify({source:ref||'working tree',passed:results.filter(r=>r.pass).length,total:results.length,scope:'CPU production RAF/physics; no GPU or device power claim'}));if(results.some(r=>!r.pass))process.exitCode=1;
