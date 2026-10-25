/* Production resize/render target allocation with fault-injected WebGL IO.
 * Verifies resource lifetime and canvas preservation, not GPU memory capacity. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8');
function fixture(initialized=true){
 let next=0,checks=0,failAt=0,createCalls=0,nullAt=0,now=1000;const live=new Set(),deleted=[],writes=[];
 const create=kind=>{if(++createCalls===nullAt)return null;const resource={kind,id:++next};live.add(resource);return resource;};
 const remove=resource=>{if(resource){assert(live.delete(resource),'resource disposed twice');deleted.push(resource);}};
 const gl=new Proxy({FRAMEBUFFER_COMPLETE:1,NO_ERROR:0,createTexture:()=>create('texture'),createFramebuffer:()=>create('framebuffer'),createRenderbuffer:()=>create('renderbuffer'),deleteTexture:remove,deleteFramebuffer:remove,deleteRenderbuffer:remove,
  checkFramebufferStatus:()=>++checks===failAt?0:1,getError:()=>0,getInternalformatParameter:()=>[4,2]},
 {get:(o,k)=>k in o?o[k]:()=>{}});
 const context=vm.createContext({console,performance:{now:()=>now},innerWidth:800,innerHeight:600,devicePixelRatio:1});vm.runInContext(source,context);const Renderer=vm.runInContext('Renderer',context);
 const canvas={_w:0,_h:0,get width(){return this._w},get height(){return this._h},set width(v){this._w=v;writes.push(['width',v]);},set height(v){this._h=v;writes.push(['height',v]);}};
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,canvas,frame:0,quality:2,mobile:false,dynamicScale:1,maxTextureSize:16384,floatColor:true});
 if(initialized){renderer.resize();renderer.frame=1;}
 return {renderer,context,live,deleted,writes,get created(){return next;},size:()=>[canvas.width,canvas.height],advance(ms){now+=ms;},fail(n){checks=0;failAt=n;},nullResource(n){createCalls=0;nullAt=n;},request(w=1200,h=800){context.innerWidth=w;context.innerHeight=h;renderer.resize();return renderer.resize(true);}};
}
const results=[];function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.stack);}}
check('failed replacement keeps the previously complete canvas and all its live targets',()=>{
 const f=fixture(),before=f.size(),resources=new Set(f.live),writes=f.writes.length,scene=f.renderer.sceneFBO;
 f.fail(1);
 assert.doesNotThrow(()=>f.request(),'a failed resize with a viable old frame must not stop animation');
 assert.deepEqual(f.size(),before);assert.equal(f.writes.length,writes,'canvas setters erase the last presented frame');
 assert.equal(f.renderer.sceneFBO,scene);assert.deepEqual(f.live,resources,'every candidate must be freed, every old resource retained');
 assert.equal(f.renderer.pendingResize,false);assert(f.renderer.resizeFailure?.message);assert.deepEqual(Array.from(f.renderer.resizeFailure.retained),before);
});
check('failure at every required framebuffer preserves old targets and releases partial allocations',()=>{
 for(const stage of [1,3,4,5]){
  const f=fixture(),resources=new Set(f.live),size=f.size(),writes=f.writes.length;f.fail(stage);
  assert.equal(f.request(),false,'stage '+stage);assert.deepEqual(f.live,resources);assert.deepEqual(f.size(),size);assert.equal(f.writes.length,writes);
 }
});
check('same failed request backs off while a smaller request and later recovery remain usable',()=>{
 const f=fixture();f.fail(1);f.request();const allocated=f.created;
 for(let i=0;i<60;i++)f.request();assert.equal(f.created,allocated,'repeated resize events must not allocate every frame');
 f.fail(0);assert.equal(f.request(640,480),true);assert.deepEqual(f.size(),[640,480]);assert.equal(f.renderer.resizeFailure,null);
 f.fail(1);f.request(1200,800);f.advance(10001);f.fail(0);assert.equal(f.request(1200,800),true);assert.deepEqual(f.size(),[1200,800]);
});
check('successful replacement disposes previous targets only after all validation and commits once',()=>{
 const f=fixture(),old=new Set(f.live),writes=f.writes.length;
 assert.equal(f.request(),true);assert.deepEqual(f.size(),[1200,800]);assert.equal(f.writes.length,writes+2);
 for(const resource of old)assert(!f.live.has(resource));assert.equal(f.live.size,old.size);assert.equal(f.renderer.msaaSamples,4);
 const created=f.created;f.request();assert.equal(f.created,created,'same dimensions reuse all targets');
});
check('initial allocation failure reports boot failure without leaking candidates or clearing canvas',()=>{
 const f=fixture(false);f.fail(1);assert.throws(()=>f.renderer.resize());assert.equal(f.live.size,0);assert.equal(f.writes.length,0);
});
check('null WebGL resources never become falsely complete targets',()=>{
 // Required scene/AA/volume resources; MSAA is an optional fallback tested below.
 for(const resource of [1,2,3,7,8,9,10,11,12]){
  const f=fixture(),old=new Set(f.live),size=f.size();f.nullResource(resource);
  assert.equal(f.request(),false,'resource '+resource);assert.deepEqual(f.live,old);assert.deepEqual(f.size(),size);
 }
});
check('optional MSAA resource failure uses a valid fallback without leaking candidates',()=>{
 for(const resource of [4,5,6]){
  const f=fixture();f.nullResource(resource);assert.equal(f.request(),true);
  assert(f.renderer.msaaSamples===0||f.renderer.msaaFBO&&f.renderer.msaaColor&&f.renderer.msaaDepth,'sample count requires all buffers');
  assert.equal(f.live.size,f.renderer.msaaSamples?12:9,'no orphan MSAA allocation');
 }
});
check('production render continues with retained targets after a queued resize allocation fails',()=>{
 const f=fixture(),r=f.renderer,before=f.size(),writes=f.writes.length;
 Object.assign(r,{textures:[],batches:[],lighting:'day',shadowSize:2048,dynamicShadowSize:1024,waterCount:0,postVAO:{},waterVAO:{},exposure:1,clarity:1});
 for(const name of ['program','shadowProgram','skyProgram','waterProgram','pointProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'])r[name]={p:{},u:{}};
 f.context.innerWidth=1200;f.context.innerHeight=800;r.resize();f.fail(1);
 assert.doesNotThrow(()=>r.render([0,1,5],[0,1,0],1));assert.equal(r.frame,2);assert.deepEqual(f.size(),before);assert.equal(f.writes.length,writes);
 const created=f.created;assert.doesNotThrow(()=>r.render([0,1,4.9],[0,1,0],2));assert.equal(r.frame,3);assert.equal(f.created,created);
});
check('an exception during optional multisample allocation releases partial renderbuffers',()=>{
 const f=fixture();f.renderer.gl.renderbufferStorageMultisample=()=>{throw Error('multisample allocation rejected');};
 assert.equal(f.request(),true);assert.equal(f.renderer.msaaSamples,0);assert.equal(f.live.size,9);
});
console.log(`${results.filter(Boolean).length}/${results.length} resize allocation checks passed`);if(results.includes(false))process.exitCode=1;
