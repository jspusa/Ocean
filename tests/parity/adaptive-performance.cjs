/* Drive the production controller with deterministic rendered-frame times.
 * No browser/GPU claim: these regressions cover adaptation and pause policy. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/performance.js'),'utf8');
const app=fs.readFileSync(path.resolve(__dirname,'../../src/app.js'),'utf8');
// Run the actual production frame gate against simulated display refresh ticks.
const frameGate=app.slice(app.indexOf('let nextRenderAt=0,renderRate=0;'),app.indexOf(' const realDt=Math.max',app.indexOf('let nextRenderAt=0,renderRate=0;')));
assert(frameGate.includes('oceanPerf.target=active?rate:60;'),'production frame scheduler found');
function scheduled(h,refreshHz,seconds){
 Object.assign(h.context,{ready:true,window:{},document:{hidden:false,hasFocus:()=>true},lastTime:0,modal:false,photoOpen:false,simulationAccumulator:0,requestAnimationFrame(){},pollGamepad(){},oceanFeatures:{shouldAnimate:()=>false}});
 vm.runInContext(frameGate+' oceanPerf.record(ms,1);renderer.dirty=false;lastTime=ms;}',h.context);
 const animate=vm.runInContext('animate',h.context);
 for(let i=1;i<=refreshHz*seconds;i++)animate(i*1000/refreshHz);
}
function harness({quality=2,scale=1,adaptive=true,target=60,preference=quality}={}){
 const settings={adaptive,quality:preference},renderer={quality,dynamicScale:scale,canvas:{width:800,height:600},resizes:0,resize(){this.resizes++;}};
 const context=vm.createContext({console,settings,renderer,active:true,toast(){}});
 vm.runInContext(source,context,{filename:'performance.js'});
 const perf=vm.runInContext('oceanPerf',context);perf.paint=()=>{};perf.target=target;
 let now=1;perf.record(now,1);
 return {perf,settings,renderer,context,get now(){return now;},frames(interval,count){for(let i=0;i<count;i++){now+=interval;perf.record(now,1);}},skip(ms){now+=ms;}};
}
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.message);}}
check('sustained 5 FPS reduces work within three active seconds',()=>{
 const h=harness();h.frames(200,15);
 assert(h.renderer.dynamicScale<1,`after 3s at 5 FPS: scale=${h.renderer.dynamicScale}, quality=${h.renderer.quality}`);
});
check('pressure at the resolution floor lowers runtime effects without changing the saved preference',()=>{
 const h=harness({scale:.64});h.frames(200,15);
 assert(h.renderer.quality<2,`after 3s at the floor: quality=${h.renderer.quality}`);
 assert.equal(h.settings.quality,2);assert.equal(h.settings.adaptive,true);
});
check('severe pressure can reach power-saving effects within seven seconds',()=>{
 const h=harness();h.frames(200,35);
 assert.equal(h.renderer.quality,0);assert(h.renderer.dynamicScale>=.64);assert.equal(h.settings.quality,2);
});
check('an isolated stall does not reduce quality or resolution',()=>{
 const h=harness();h.frames(1000/60,30);h.frames(1000,1);h.frames(1000/60,180);
 assert.equal(h.renderer.resizes,0);assert.equal(h.renderer.dynamicScale,1);
});
check('manual quality never adapts under sustained pressure',()=>{
 const h=harness({adaptive:false});h.frames(200,150);
 assert.equal(h.renderer.dynamicScale,1);assert.equal(h.renderer.quality,2);assert.equal(h.renderer.resizes,0);
});
check('benchmark keeps resolution and quality locked',()=>{
 const h=harness();h.perf.benchmark={startQuality:2,startScale:1,resolution:[800,600],frames:[],activeMs:0};h.frames(200,70);
 assert.equal(h.renderer.dynamicScale,1);assert.equal(h.renderer.quality,2);assert.equal(h.renderer.resizes,0);assert.equal(h.perf.benchmark.activeMs,14000);
});
check('30 FPS power-saving target is healthy at its scheduled cadence',()=>{
 const h=harness({quality:0,target:30});h.frames(1000/30,900);
 assert.equal(h.renderer.dynamicScale,1);assert.equal(h.renderer.quality,0);assert.equal(h.renderer.resizes,0);
});
check('pause excludes the background interval from frame and benchmark samples',()=>{
 const h=harness();h.perf.benchmark={startQuality:2,startScale:1,resolution:[800,600],frames:[],activeMs:0};h.frames(1000/60,30);
 const activeMs=h.perf.benchmark.activeMs,count=h.perf.benchmark.frames.length;
 h.perf.pause();h.skip(60000);h.frames(1000/60,1);
 assert.equal(h.perf.benchmark.activeMs,activeMs);assert.equal(h.perf.benchmark.frames.length,count);
 h.frames(1000/60,1);assert(Math.abs(h.perf.benchmark.activeMs-activeMs-1000/60)<1e-8);
});
check('homepage rendering cannot consume active recovery time or contaminate resumed samples',()=>{
 const h=harness();h.frames(200,7);const activeTime=h.perf.activeTime,scale=h.renderer.dynamicScale,resizes=h.renderer.resizes;
 h.context.active=false;h.frames(1000/15,900);
 assert.equal(h.perf.activeTime,activeTime,'homepage is not active recovery time');
 h.context.active=true;h.frames(1000/60,1);assert.equal(h.perf.activeTime,activeTime,'first resumed frame starts a fresh interval');
 h.frames(1000/60,180);assert.equal(h.renderer.dynamicScale,scale);assert.equal(h.renderer.resizes,resizes);assert(h.perf.stats().p95<18,'homepage cadence does not survive in live samples');
});
check('reset and pause discard partial overload evidence',()=>{
 const h=harness();h.frames(200,4);h.perf.resetSamples();h.frames(1000/60,180);
 assert.equal(h.renderer.resizes,0);h.frames(200,4);h.perf.pause();h.skip(60000);h.frames(1000/60,180);
 assert.equal(h.renderer.resizes,0);
});
check('recovery is gradual, waits for active stable time, and never exceeds device preference',()=>{
 const h=harness({quality:1,preference:1});h.frames(200,7);
 assert(h.renderer.dynamicScale<1);const reduced=h.renderer.dynamicScale;
 h.perf.pause();h.skip(60000);h.frames(1000/60,180);
 assert.equal(h.renderer.dynamicScale,reduced,'background time cannot count as stable headroom');
 h.frames(1000/60,720);assert(h.renderer.dynamicScale>reduced,'stable active rendering restores resolution');
 assert(h.renderer.dynamicScale<1,'recovery does not jump to maximum');
 h.frames(1000/60,12000);assert.equal(h.renderer.dynamicScale,1);assert.equal(h.renderer.quality,1);assert.equal(h.settings.quality,1);
});
check('an unsuccessful quality recovery probe backs off instead of rapidly oscillating',()=>{
 const h=harness({quality:0,preference:1,target:30});h.frames(1000/30,360);
 assert.equal(h.renderer.quality,1,'stable reduced tier eventually probes the preferred tier');
 h.perf.target=60;h.frames(200,15);const reduced=h.renderer.quality,resizes=h.renderer.resizes;
 assert.equal(reduced,0,'failed effect probe returns to the safe tier');
 h.perf.target=30;h.frames(1000/30,300);
 assert.equal(h.renderer.quality,0);assert.equal(h.renderer.resizes,resizes,'no repeated quality probes during backoff');
});
for(const hz of [60,65,75,90,120,144])check(`healthy capped rendering recovers on a ${hz} Hz display`,()=>{
 const h=harness({scale:.8});scheduled(h,hz,120);
 assert.equal(h.renderer.dynamicScale,1,`${hz} Hz / 60 FPS scale stayed at ${h.renderer.dynamicScale}`);
 assert.equal(h.renderer.quality,2);assert.equal(h.renderer.resizes,6,'only gradual upward adjustments, no oscillation');
});
check('30 FPS cap also recovers on a non-divisible refresh rate',()=>{
 const h=harness({quality:0,preference:0,target:30,scale:.8});scheduled(h,75,120);
 assert.equal(h.renderer.dynamicScale,1);assert.equal(h.renderer.quality,0);assert.equal(h.renderer.resizes,6);
});
check('a healthy average alone does not recover detail during repeated long stalls',()=>{
 const h=harness({scale:.8});for(let i=0;i<2400;i++){h.frames(5,1);h.frames(1000/30-5,1);}
 assert.equal(h.renderer.dynamicScale,.8);assert.equal(h.renderer.resizes,0);
});
console.log(`${passed}/${passed+failed} adaptive performance checks passed`);if(failed)process.exitCode=1;
