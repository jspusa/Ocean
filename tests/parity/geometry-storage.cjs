/* Exercise production GPU buffer creation on the real compiled world. Index
 * width may change storage only: triangle order and fixed-restart semantics stay. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(root,'src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context);
const Renderer=vm.runInContext('Renderer',context);
function fixture(){
 let next=0;const uploads=[],draws=[],gl=new Proxy({ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,UNSIGNED_SHORT:3,UNSIGNED_INT:4,TRIANGLES:5,createBuffer:()=>++next,createVertexArray:()=>++next,bufferData(target,data){if(target===2)uploads.push(data);},drawElementsInstanced(...args){draws.push(args);}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile:false,quality:2,batches:[],drawCalls:0});
 return {renderer,uploads,draws};
}
const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),length=raw.readUInt32LE(4),base=8+length,header=JSON.parse(raw.subarray(8,base).toString()),f=fixture();let before=0,after=0;
for(const b of header.batches){
 const vertices=new Float32Array(raw.buffer,raw.byteOffset+base+b.vertexOffset,b.vertexFloats),indices=new Uint32Array(raw.buffer,raw.byteOffset+base+b.indexOffset,b.indexCount),batch=f.renderer.batch({indexed:{vertices,indices,radius:b.radius},material:b.material,species:b.species,shadow:b.shadow},b.instanceIDs.map(i=>header.nodes[i]),b.kind,b.dynamic),uploaded=f.uploads.at(-1);
 assert.equal(uploaded.length,indices.length);for(let i=0;i<indices.length;i++)assert.equal(uploaded[i],indices[i],'Every triangle index must remain exact');
 assert.equal(uploaded.BYTES_PER_ELEMENT,2,'The authored world fits exact 16-bit storage');assert.equal(batch.indexType,3);
 const drawsBefore=f.draws.length;f.renderer.drawBatch(batch);
 if(batch.drawCount){assert.equal(f.draws.length,drawsBefore+1);assert.equal(f.draws.at(-1)[2],3);assert.equal(f.draws.at(-1)[1],indices.length);}
 else assert.equal(f.draws.length,drawsBefore,'An empty instance batch has no GPU submission; its stored indices are still checked above');
 before+=indices.byteLength;after+=uploaded.byteLength;
}
assert.equal(after,before/2);console.log('PASS '+header.batches.length+' authored meshes preserve every index; GPU index bytes '+before+' -> '+after);
for(const max of [65534,65535,65536]){
 const f=fixture(),indices=new Uint32Array([0,1,max]),vertices=new Float32Array((max+1)*12),batch=f.renderer.batch({indexed:{vertices,indices,radius:1},material:6},[{p:[0,0,0]}],1,true),uploaded=f.uploads[0];
 assert.deepEqual(Array.from(uploaded),Array.from(indices));assert.equal(uploaded.BYTES_PER_ELEMENT,max<65535?2:4,'0xffff is a WebGL2 primitive-restart marker for UNSIGNED_SHORT');
 assert.equal(batch.indexType,max<65535?3:4);f.renderer.drawBatch(batch);assert.equal(f.draws[0][2],batch.indexType);
}
console.log('PASS exact 16-bit boundary and 32-bit fallback preserve primitive-restart semantics');
{
 const f=fixture(),mesh={vertices:new Float32Array(36),indices:new Uint32Array([0,1,2]),radius:1},a=f.renderer.batch({indexed:mesh,material:2},[{p:[0,0,0]}],0,false),b=f.renderer.batch({indexed:mesh,material:15},[{p:[4,0,0]}],3,true);
 assert.equal(f.uploads.length,1,'One immutable mesh needs one GPU index upload');assert.equal(a.vb,b.vb);assert.equal(a.eb,b.eb);
 assert.notEqual(a.vao,b.vao);assert.notEqual(a.ib,b.ib);assert.notEqual(a.data,b.data);assert.notEqual(a.instances,b.instances);
 assert.equal(a.material,2);assert.equal(b.material,15);assert.equal(a.kind,0);assert.equal(b.kind,3);assert.equal(a.dynamic,false);assert.equal(b.dynamic,true);
 assert.equal(a.data[0],0);assert.equal(b.data[0],4);assert(!Object.values(a).includes(mesh),'Batch must not retain decoded source mesh');
 console.log('PASS shared immutable geometry keeps independent material, actor, VAO and instance storage');
}
