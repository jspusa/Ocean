/* Production DOM lifecycle listeners and rendered-interval reporting, with a
 * deterministic clock. A suspended page receives no hidden RAF at all. This is
 * CPU regression coverage, not browser scheduling or device performance data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),source=fs.readFileSync(path.join(root,'src/performance.js'),'utf8');
function fixture({adaptive=false}={}){
 let now=1000,resizeCount=0;const messages=[],nodes=new Map();
 function target(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},dispatch(type){for(const fn of listeners.get(type)||[])fn({type});}};}
 function node(){return Object.assign(target(),{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},querySelector(){return node();},querySelectorAll:()=>[],getContext:()=>({clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}),width:240,height:56});}
 const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const document=Object.assign(target(),{hidden:false,documentElement:{dataset:{version:'lifecycle-fixture'}},body:node(),createElement:node,querySelectorAll:()=>[]}),window=target();
 const renderer={quality:1,dynamicScale:1,canvas:{width:390,height:844},submittedTriangles:200,drawCalls:4,msaaSamples:2,individualCount:42,gl:{getExtension:()=>null},resize(){resizeCount++;}};
 const noop=()=>{},context=vm.createContext({console,window,document,performance:{now:()=>now},renderer,active:true,modal:null,photoOpen:false,settings:{adaptive,sound:false},lastTime:now,keys:new Set(),inputCleanup:[],player:{velocity:[0,0,0]},simulationAccumulator:0,previousPhysicsPosition:null,cameraCut:false,stick:[0,0],lookStick:[0,0],verticalInput:0,
  voyage:{importing:false},oceanSelection:{suspend:noop},oceanSaveGuard:{live:true},oceanAudio:{pause:noop,resume:noop},OPEN_WORLD:{version:'fixture'},navigator:{userAgent:'deterministic lifecycle regression'},$,toast:text=>messages.push(text),persist:noop,
  observeNearest:noop,goHome:noop,takePhoto:noop,toggleSound:noop,closePanel:noop,closePhoto:noop,mouseLookUnavailable:noop});
 vm.runInContext(source,context,{filename:'performance.js'});
 vm.runInContext(app.slice(app.indexOf('function resetInput('),app.indexOf('function handleFailure(')),context,{filename:'app-input.js'});
 vm.runInContext(app.slice(app.indexOf('const oceanKeyboard='),app.indexOf('async function boot(')),context,{filename:'app-controls.js'});
 vm.runInContext('setupControls()',context);
 const perf=vm.runInContext('oceanPerf',context);
 return {perf,renderer,window,document,messages,get resizes(){return resizeCount;},advance(ms){now+=ms;},frame(ms=20){now+=ms;perf.record(now,1);},event(type){(type==='visibilitychange'?document:window).dispatch(type);}};
}
const results=[];function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.stack);}}
check('background suspension with no hidden frame preserves the full 20 seconds of visible benchmark time',()=>{
 const f=fixture();f.perf.start();f.frame();f.frame();f.frame();
 f.document.hidden=true;f.event('visibilitychange');f.advance(60000);f.document.hidden=false;f.event('visibilitychange');f.frame();
 assert(f.perf.benchmark,'returning from a background tab must not finish a 20 second benchmark');
 assert.equal(f.perf.benchmark.activeMs,40,'only the two rendered 20 ms intervals count');
 for(let i=0;i<998;i++)f.frame();
 assert.equal(f.perf.benchmark,null);assert.equal(f.perf.lastResult.durationMs,20000);assert.equal(f.perf.lastResult.renderedFrames,1000);assert.equal(f.perf.lastResult.averageFPS,50);assert.equal(f.perf.lastResult.p99FrameMs,20);
 assert(f.perf.lastResult.frameIntervalsMs.every(value=>value===20),'the exported trace must exclude suspended time');
});
check('switching to another window without a visibility event pauses benchmark time at blur and focus',()=>{
 const f=fixture();f.perf.start();f.frame();f.frame();f.frame();
 f.event('blur');f.advance(60000);f.event('focus');f.frame();
 assert(f.perf.benchmark,'window focus changes must not complete a benchmark using unfocused time');
 assert.equal(f.perf.benchmark.activeMs,40);f.frame();assert.equal(f.perf.benchmark.activeMs,60);
});
check('resuming a suspended page does not falsely reduce automatic resolution',()=>{
 for(const mode of ['visibility','focus']){
  const f=fixture({adaptive:true});for(let i=0;i<241;i++)f.frame(1000/60);
  assert.equal(f.renderer.dynamicScale,1);assert.equal(f.resizes,0);
  if(mode==='visibility'){f.document.hidden=true;f.event('visibilitychange');}else f.event('blur');
  f.advance(60000);
  if(mode==='visibility'){f.document.hidden=false;f.event('visibilitychange');}else f.event('focus');
  for(let i=0;i<100;i++)f.frame(1000/60);
  assert.equal(f.renderer.dynamicScale,1,mode+' resume must preserve an otherwise smooth resolution');assert.equal(f.resizes,0);
  assert(Math.abs(f.perf.stats().fps-60)<.001);
 }
});
check('a long frame while the page remains visible is fully retained in the exported benchmark',()=>{
 const f=fixture();f.perf.start();f.frame();f.frame();f.frame();f.frame(60000);
 const report=f.perf.lastResult;assert(report);assert.equal(report.durationMs,60040);assert.equal(report.renderedFrames,3);assert.equal(report.p99FrameMs,60000);
 assert.deepEqual(Array.from(report.frameIntervalsMs),[20,20,60000],'visible stalls must never be clamped or filtered as suspended time');
});
check('automatic quality still reduces render scale for genuinely slow visible frames',()=>{
 const f=fixture({adaptive:true});for(let i=0;i<300;i++)f.frame(40);
 assert(f.renderer.dynamicScale<1,'visible 25 FPS must still trigger quality adaptation');assert(f.resizes>0);assert(f.renderer.dynamicScale>=.64);
});
console.log(`${results.filter(Boolean).length}/${results.length} performance lifecycle checks passed`);if(results.includes(false))process.exitCode=1;
