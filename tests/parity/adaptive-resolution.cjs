/* Real Renderer.resize() and OceanPerformance.record() with a WebGL allocation
 * recorder. No canvas rasterization or real-device FPS claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
function fixture({width=3840,height=2160,dpr=2,mobile=false,quality=2,max=16384,samples=[4,2],adaptive=true}={}){
 const allocations=[];let id=0;
 const gl=new Proxy({FRAMEBUFFER_COMPLETE:2,NO_ERROR:0,getInternalformatParameter:()=>samples,checkFramebufferStatus:()=>2,getError:()=>0,
  createTexture:()=>++id,createFramebuffer:()=>++id,createRenderbuffer:()=>++id,
  texStorage2D(_target,_levels,_format,w,h){allocations.push({kind:'texture',w,h});},
  renderbufferStorageMultisample(_target,count,_format,w,h){allocations.push({kind:'multisample',w,h,count});}
 },{get:(o,k)=>k in o?o[k]:()=>{}});
 const context=vm.createContext({console,innerWidth:width,innerHeight:height,devicePixelRatio:dpr,performance:{now:()=>0},active:true,settings:{quality,adaptive},toast(){}});
 vm.runInContext(read('engine'),context,{filename:'engine.js'});const Renderer=vm.runInContext('Renderer',context);
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,canvas:{width:0,height:0},quality,mobile,dynamicScale:1,maxTextureSize:max,floatColor:false});
 context.renderer=renderer;renderer.resize();
 vm.runInContext(read('performance'),context,{filename:'performance.js'});const perf=vm.runInContext('oceanPerf',context);perf.paint=()=>{};
 return {renderer,perf,context,allocations,size:()=>[renderer.canvas.width,renderer.canvas.height],scale(value){renderer.dynamicScale=value;renderer.resize();return this.size();}};
}
const results=[];function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message);}}
check('scale one preserves the established desktop and phone framebuffers',()=>{
 for(const [options,expected] of [
  [{},[3771,2121]],
  [{width:2560,height:1440},[3771,2121]],
  [{width:1440,height:900},[2880,1800]],
  [{width:390,height:844,dpr:3,mobile:true,quality:1},[585,1266]],
  [{width:390,height:844,dpr:3,mobile:true,quality:0},[320,692]],
  [{width:1536,height:2048,dpr:3,mobile:true,quality:2},[1500,2000]]
 ])assert.deepEqual(fixture(options).size(),expected,JSON.stringify(options));
});
check('large high-DPR desktop reduces real pixel work at each adaptive step',()=>{
 const f=fixture(),base=f.size();
 for(const scale of [.8,.64])assert.deepEqual(f.scale(scale),base.map(n=>Math.round(n*scale)),'scale '+scale+' must act on the constrained framebuffer');
 assert(f.size()[0]*f.size()[1]<base[0]*base[1]*.42,'64% dimensions must reduce pixels to about41%');
});
check('large high-DPR touch viewport also scales below its existing pixel cap',()=>{
 const f=fixture({width:1536,height:2048,dpr:3,mobile:true,quality:2}),base=f.size();
 for(const scale of [.8,.64])assert.deepEqual(f.scale(scale),base.map(n=>Math.round(n*scale)));
});
check('texture-size constrained displays respond before reaching the adaptive floor',()=>{
 const f=fixture({max:2048}),base=f.size();
 assert.equal(base[0],2048);for(const scale of [.8,.64])assert.deepEqual(f.scale(scale),base.map(n=>Math.round(n*scale)));
});
check('ordinary phone and desktop retain proportional adaptive resolution',()=>{
 for(const options of [{width:1440,height:900,dpr:1},{width:390,height:844,dpr:3,mobile:true,quality:1},{width:390,height:844,dpr:3,mobile:true,quality:0}]){
  const f=fixture(options),base=f.size();for(const scale of [.8,.64])for(let k=0;k<2;k++)assert(Math.abs(f.scale(scale)[k]-base[k]*scale)<=1);
 }
});
check('extreme aspect ratios allocate legal nonzero framebuffer and post-process targets',()=>{
 for(const [width,height] of [[1000000,1],[1,1000000],[1,1],[1000000,1000000]])for(const mobile of [false,true]){
  const f=fixture({width,height,mobile,max:2048});f.scale(.64);
  for(const a of f.allocations)assert(Number.isInteger(a.w)&&Number.isInteger(a.h)&&a.w>=2&&a.h>=2&&a.w<=2048&&a.h<=2048,JSON.stringify({width,height,mobile,...a}));
  assert(f.size()[0]*f.size()[1]<=(mobile?3000000:8000000));
 }
});
check('unchanged resize reuses allocations and restoration keeps quality and antialiasing',()=>{
 for(const quality of [0,1,2]){
  const f=fixture({quality}),base=f.size(),count=f.allocations.length,aa=f.renderer.msaaSamples;
  f.renderer.resize();assert.equal(f.allocations.length,count);f.scale(.64);f.scale(1);
  assert.deepEqual(f.size(),base);assert.equal(f.renderer.quality,quality);assert.equal(f.context.settings.quality,quality);assert.equal(f.renderer.msaaSamples,aa);assert.equal(aa,[0,2,4][quality]);
 }
 assert.equal(fixture({quality:1,samples:[4]}).renderer.msaaSamples,4,'existing balanced 4x fallback remains');
});
check('production slow-frame controller actually lowers a capped high-DPR framebuffer',()=>{
 const f=fixture(),base=f.size();for(let i=1;i<=900;i++)f.perf.record(i*1000/30,1);
 assert.equal(f.renderer.dynamicScale,.64);assert(f.size()[0]*f.size()[1]<base[0]*base[1]*.42);assert.equal(f.renderer.quality,2);assert.equal(f.context.settings.quality,2);
});
check('manual adaptive-off preference cannot be overridden by slow samples',()=>{
 const f=fixture({adaptive:false}),base=f.size(),count=f.allocations.length;
 for(let i=1;i<=900;i++)f.perf.record(i*1000/30,1);
 assert.deepEqual(f.size(),base);assert.equal(f.renderer.dynamicScale,1);assert.equal(f.allocations.length,count);assert.equal(f.context.settings.adaptive,false);
});
check('benchmark samples retain their pinned resolution and do not invoke adaptation',()=>{
 const f=fixture(),base=f.size(),count=f.allocations.length;
 f.perf.benchmark={frames:[],activeMs:0,startQuality:f.renderer.quality,startScale:1,resolution:base};
 for(let i=1;i<=300;i++)f.perf.record(i*1000/30,1);
 assert.deepEqual(f.size(),base);assert.equal(f.renderer.dynamicScale,1);assert.equal(f.allocations.length,count);assert.equal(f.perf.benchmark.frames.length,299);
});
console.log(`${results.filter(Boolean).length}/${results.length} adaptive resolution checks passed (CPU allocation fixture, no GPU)`);if(results.includes(false))process.exitCode=1;
