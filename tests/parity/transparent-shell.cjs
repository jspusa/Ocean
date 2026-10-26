/* Renderer → WebGL IO contract. Real Geometry indexing, buffer creation and
 * batch methods run against a small GL sink; shader pixels remain GPU gates. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context);
const Renderer=vm.runInContext('Renderer',context);
function fixture(){
 let allocations=0;const draws=[],attributes=[],bindings=[];
 const gl={ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,UNSIGNED_SHORT:3,UNSIGNED_INT:4,TRIANGLES:5,FLOAT:6,STATIC_DRAW:7,DYNAMIC_DRAW:8,
  createBuffer(){return ++allocations;},createVertexArray(){return ++allocations;},bindVertexArray(x){bindings.push(x);},bindBuffer(){},bufferData(){},bufferSubData(){},enableVertexAttribArray(){},vertexAttribDivisor(){},
  vertexAttribPointer(...args){attributes.push(args);},drawElementsInstanced(...args){draws.push(args);}};
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile:false,quality:2,batches:[],drawCalls:0});
 return {renderer,draws,attributes,bindings,get allocations(){return allocations;}};
}
function geometry(){return vm.runInContext(`(()=>{const g=new Geometry();g.tag=1;g.tri([0,0,0],[1,0,0],[0,1,0],[.2,.3,.4]);g.tag=8;g.tri([0,0,.1],[1,0,.1],[0,1,.1],[.7,.8,.8]);g.transparentShell={first:3,count:3};return g;})()`,context);}
const actors=()=>[{p:[0,-690,0],s:[.14,.14,.14]},{p:[1,-690,0],s:[.14,.14,.14]}],results=[];
function check(name,fn){try{fn();results.push({name,pass:true});console.log('PASS '+name);}catch(error){results.push({name,pass:false});console.error('FAIL '+name+': '+error.stack);}}
check('actual geometry retains a separately submitted shell while ordinary and shadow draws use only the opaque prefix',()=>{
 const f=fixture(),g=geometry(),b=f.renderer.batch(g,actors(),11,true);
 assert(b.transparentShell,'The submitted geometry must retain its transparent range');assert.deepEqual(JSON.parse(JSON.stringify(b.transparentShell)),{first:3,count:3});assert.equal(b.count,6,'The shared index buffer retains both surfaces');
 // Colour and shadow callers use the same default submission entrypoint.
 for(const pass of ['colour','shadow']){f.renderer.drawBatch(b);assert.deepEqual(f.draws.at(-1),[5,3,3,0,2],pass+' must not draw the transparent cap as opaque');}
 f.renderer.drawBatch(b,'shell',1);assert.deepEqual(f.draws.at(-1),[5,3,3,6,1],'Only the second packed actor is drawn, using 16-bit index-byte offset');
 const last=new Map();for(const a of f.attributes)last.set(a[0],a);for(const [location,offset]of [[3,0],[4,12],[5,28],[6,40],[9,48],[10,64],[11,80]])assert.equal(last.get(location)?.[5],offset,'Every instance attribute returns to the original first actor');
 assert(f.attributes.some(a=>a[0]===3&&a[5]===96),'The selected packed actor uses its own instance-record offset');
 f.renderer.drawBatch(b);assert.deepEqual(f.draws.at(-1),[5,3,3,0,2],'Later ordinary rendering still uses all original instances');
});
check('invalid shell ranges are rejected before GL allocation and cannot partially register a batch',()=>{
 for(const range of [{first:-3,count:9},{first:1,count:5},{first:3.5,count:2.5},{first:3,count:6},{first:3,count:0},{first:0,count:3},{first:NaN,count:3},{first:3,count:Infinity}]){
  const f=fixture(),g=geometry();g.transparentShell=range;
  assert.throws(()=>f.renderer.batch(g,actors(),11,true),/shell|range/i);assert.equal(f.allocations,0,JSON.stringify(range)+' allocates no GL object');assert.equal(f.renderer.batches.length,0);
 }
});
check('shell range uses the real 32-bit index width when a large mesh cannot use 16-bit indices',()=>{
 const f=fixture(),g={indexed:{vertices:new Float32Array(65536*12),indices:new Uint32Array([0,1,65535,0,65535,2]),radius:1},transparentShell:{first:3,count:3}},b=f.renderer.batch(g,actors(),11,true);
 assert.equal(b.indexType,4);f.renderer.drawBatch(b);assert.deepEqual(f.draws.at(-1),[5,3,4,0,2]);f.renderer.drawBatch(b,'shell',0);assert.deepEqual(f.draws.at(-1),[5,3,4,12,1]);
});
check('ordinary geometry remains a single unchanged draw and has no shell submission',()=>{
 const f=fixture(),g=geometry();delete g.transparentShell;const b=f.renderer.batch(g,actors(),11,true);f.renderer.drawBatch(b);assert.deepEqual(f.draws.at(-1),[5,6,3,0,2]);const count=f.draws.length;f.renderer.drawBatch(b,'shell',0);assert.equal(f.draws.length,count);
});
check('an entirely transparent mesh skips empty opaque submission without changing the draw counter',()=>{
 const f=fixture(),g=geometry();g.transparentShell={first:0,count:6};const b=f.renderer.batch(g,actors(),11,true);f.renderer.drawBatch(b);assert.equal(f.draws.length,0);assert.equal(f.renderer.drawCalls,0);f.renderer.drawBatch(b,'shell',0);assert.deepEqual(f.draws.at(-1),[5,6,3,0,1]);assert.equal(f.renderer.drawCalls,1);
});
check('out-of-range packed actors and unknown draw parts cannot reach WebGL',()=>{
 const f=fixture(),b=f.renderer.batch(geometry(),actors(),11,true);
 for(const index of [-1,.5,2,NaN,Infinity]){const n=f.draws.length;assert.throws(()=>f.renderer.drawBatch(b,'shell',index),/instance|index|range/i);assert.equal(f.draws.length,n);}
 assert.throws(()=>f.renderer.drawBatch(b,'unknown'),/part|draw|range/i);assert.equal(f.draws.length,0);
});
check('deferred mesh attachment and aquarium-style source cloning retain the same opaque and transparent ranges',()=>{
 const f=fixture(),g=geometry(),mesh=vm.runInContext('indexGeometry',context)(g.v),meta={kind:11,dynamic:true,material:0,species:43,indexCount:6,vertexFloats:mesh.vertices.length,radius:mesh.radius,transparentShell:{first:3,count:3},minDistance:0,maxDistance:4};
 const b=f.renderer.deferredBatch(meta,actors());assert(b.transparentShell,'Deferred geometry must preserve its transparent range before loading');assert.deepEqual(JSON.parse(JSON.stringify(b.transparentShell)),{first:3,count:3});assert.equal(f.allocations,0,'Deferred geometry owns no GL resources yet');
 f.renderer.attachBatchMesh(b,mesh);assert.equal(f.renderer.batches.length,1,'Attachment replaces the deferred storage without duplicating the logical batch');assert.deepEqual(JSON.parse(JSON.stringify(b.transparentShell)),{first:3,count:3});
 const clone={...b,instances:b.instances.slice(),data:b.data.slice()};f.renderer.drawBatch(clone);assert.deepEqual(f.draws.at(-1),[5,3,3,0,2]);f.renderer.drawBatch(clone,'shell',0);assert.deepEqual(f.draws.at(-1),[5,3,3,6,1]);
});
console.log(results.filter(r=>r.pass).length+'/'+results.length+' transparent-shell IO checks passed');if(results.some(r=>!r.pass))process.exitCode=1;
