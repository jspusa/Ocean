/* Exercise production upload encoding and MSAA allocation without a GPU.
 * WebGL drawing and shader compatibility are covered by runtime-performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8'),context,{filename:'engine.js'});
vm.runInContext('const BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context);
const Renderer=vm.runInContext('Renderer',context),planes=Array.from({length:6},()=>[0,0,0,1]);
function fixture(dynamic=false){
 const uploads=[],renderer=Object.assign(Object.create(Renderer.prototype),{mobile:false,quality:2,renderOrigin:[0,0,0],gl:{ARRAY_BUFFER:1,bindBuffer(){},bufferSubData(_,offset,data,start,count){uploads.push(Array.from(data.slice(start,start+count)));}}});
 const batch={dynamic,material:3,kind:0,radius:1,instances:[{p:[0,0,0],tint:[.7,.8,.9]},{p:[10,0,0],tint:[.9,.8,.7]}],data:new Float32Array(48)};
 return {renderer,batch,uploads,update:(eye=[0,0,5],frustum=planes,shadow=false)=>renderer.updateBatch(batch,eye,frustum,shadow)};
}
const results=[];function check(name,fn){try{fn();results.push({name,pass:true});console.log('PASS '+name);}catch(error){results.push({name,pass:false});console.error('FAIL '+name+': '+error.message);}}
check('repeated static views upload identical instance data only once',()=>{
 const f=fixture();for(let i=0;i<120;i++)f.update();assert.equal(f.batch.drawCount,2);assert.equal(f.uploads.length,1,'unchanged static upload count over 120 frames');
});
check('static transforms and material genes invalidate the uploaded data',()=>{
 const f=fixture();f.update();f.batch.instances[0].p[0]=.75;f.update();assert.equal(f.uploads.at(-1)[0],.75);
 f.batch.instances[0].bioGenes=[.1,.2,.3,.4];f.update();assert.equal(f.uploads.at(-1)[16],Math.fround(.1));assert.equal(f.uploads.length,3);
});
check('shadow/color visibility packing never reuses the wrong instance prefix',()=>{
 const f=fixture();f.update();const right=[[-1,0,0,20],[1,0,0,-5],...planes.slice(2)];f.update([0,0,5],right,true);assert.equal(f.batch.drawCount,1);assert.equal(f.uploads.at(-1)[0],10);
 f.update();assert.equal(f.batch.drawCount,2);assert.equal(f.uploads.at(-1)[0],0);assert.equal(f.uploads.at(-1)[24],10);assert.equal(f.uploads.length,3);
});
check('deep-water render-origin changes refresh static instance offsets',()=>{
 const f=fixture();f.update();f.renderer.renderOrigin=[64,-1024,128];f.update();assert.deepEqual(f.uploads.at(-1).slice(0,3),[-64,1024,-128]);assert.equal(f.uploads.length,2);
});
check('empty visibility and reappearance preserve the GPU data',()=>{
 const f=fixture();f.update();f.batch.instances.forEach(i=>i.ecologyPresent=false);f.update();assert.equal(f.batch.drawCount,0);f.batch.instances.forEach(i=>i.ecologyPresent=true);f.update();assert.equal(f.batch.drawCount,2);assert.equal(f.uploads.length,1);
 f.batch.instances[1].p[1]=3;f.update();assert.equal(f.uploads.at(-1)[25],3);assert.equal(f.uploads.length,2);
});
check('resized data buffers and changed dynamic state invalidate the static cache',()=>{
 const f=fixture();f.update();f.batch.data=new Float32Array(48);f.update();assert.equal(f.uploads.length,2);
 f.batch.dynamic=true;f.batch.instances[0].p[0]=2;f.update();f.batch.dynamic=false;f.batch.instances[0].p[0]=0;f.update();assert.equal(f.uploads.at(-1)[0],0);assert.equal(f.uploads.length,4);
});
check('dynamic actor transforms continue uploading each changed pose',()=>{
 const f=fixture(true);for(let i=0;i<4;i++){f.batch.instances[0].p[0]=i;f.update();}assert.equal(f.uploads.length,4);assert.equal(f.uploads.at(-1)[0],3);
});
function multisampling(mobile,quality,supported){
 const allocations=[];let id=0;
 const gl=new Proxy({SAMPLES:1,FRAMEBUFFER_COMPLETE:2,NO_ERROR:0,getInternalformatParameter:()=>supported,checkFramebufferStatus:()=>2,getError:()=>0,createFramebuffer:()=>++id,createRenderbuffer:()=>++id,renderbufferStorageMultisample:(_,samples,...dimensions)=>allocations.push({samples,dimensions})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile,quality,floatColor:true});renderer.setupMultisampling(390,844);return {samples:renderer.msaaSamples,allocations};
}
check('mobile balanced quality uses existing FXAA without multisample buffers',()=>{
 const r=multisampling(true,1,[4,2]);assert.equal(r.samples,0);assert.equal(r.allocations.length,0);
});
check('balanced quality never silently escalates unsupported 2x MSAA to 4x',()=>{
 const r=multisampling(false,1,[4]);assert.equal(r.samples,0);assert.equal(r.allocations.length,0);
});
check('explicit high quality retains supported 4x antialiasing on either device',()=>{
 for(const mobile of [false,true])assert.equal(multisampling(mobile,2,[4,2]).samples,4);
});
console.log(`${results.filter(r=>r.pass).length}/${results.length} render efficiency checks passed`);if(results.some(r=>!r.pass))process.exitCode=1;
