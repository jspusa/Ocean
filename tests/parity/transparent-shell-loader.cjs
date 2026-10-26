/* Verification gap: exercise the real compiled and regional loader boundaries
 * through gzip/response streams into actual Renderer batches and a small GL IO
 * sink. This is not native GPU, full-world bake or new RED/GREEN evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),sources=['engine.js','scene_stream.js','scene_cache.js'].map(name=>fs.readFileSync(path.join(root,'src',name),'utf8')).join('\n');
const version='transparent-shell-loader-fixture',origin='https://example.test/Ocean/',archiveURL=origin+'scene.gz',indexURL=origin+'scene/index.json',chunkURL=origin+'scene/part.gz';
const plain=value=>JSON.parse(JSON.stringify(value));
function archive(header,payload){
 let json=Buffer.from(JSON.stringify(header));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652);prefix.writeUInt32LE(json.length,4);return zlib.gzipSync(Buffer.concat([prefix,json,payload]));
}
function stream(bytes){let offset=0;return new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}const end=Math.min(bytes.length,offset+11);controller.enqueue(bytes.subarray(offset,end));offset=end;}});}
function fixture({regional=false,invalidRange=null,legacy=false}={}){
 const warnings=[],requests=[],draws=[],attributes=new Map(),resources=new Map(),uploads=[],loadDetail={textContent:''};let allocations=0,boundVAO=null,boundArray=null,boundElement=null,compressedArrayBuffers=0;
 const gl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,UNSIGNED_SHORT:5123,UNSIGNED_INT:5125,TRIANGLES:4,FLOAT:5126,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,
  createBuffer(){return {type:'buffer',id:++allocations};},createVertexArray(){return {type:'vao',id:++allocations};},
  bindVertexArray(vao){boundVAO=vao;},bindBuffer(target,buffer){if(target===this.ARRAY_BUFFER)boundArray=buffer;else boundElement=buffer;},
  bufferData(target,value){const buffer=target===this.ARRAY_BUFFER?boundArray:boundElement;assert(buffer,'Buffer upload requires a bound IO object');const bytes=typeof value==='number'?new Uint8Array(value):new Uint8Array(value.buffer,value.byteOffset,value.byteLength).slice();resources.set(buffer,bytes);uploads.push({buffer,bytes:bytes.length});},
  bufferSubData(target,offset,value,start=0,length=value.length){assert.equal(target,this.ARRAY_BUFFER);const bytes=new Uint8Array(value.buffer,value.byteOffset+start*value.BYTES_PER_ELEMENT,length*value.BYTES_PER_ELEMENT);resources.get(boundArray).set(bytes,offset);},
  enableVertexAttribArray(){},vertexAttribDivisor(){},vertexAttribPointer(location,size,type,normalized,stride,offset){assert(boundVAO,'Attributes belong to the actual batch VAO');if(!attributes.has(boundVAO))attributes.set(boundVAO,new Map());attributes.get(boundVAO).set(location,{buffer:boundArray,size,type,normalized,stride,offset});},
  drawElementsInstanced(mode,count,type,offset,instances){draws.push({vao:boundVAO,mode,count,type,offset,instances,attributes:new Map(attributes.get(boundVAO))});},
  deleteVertexArray(){},deleteBuffer(buffer){resources.delete(buffer);}};
 const network=new Map();
 const context=vm.createContext({console:{warn:(...args)=>warnings.push(args.map(String).join(' '))},performance,URL,location:{href:origin},AbortController,setTimeout,clearTimeout,Response,ReadableStream,TransformStream,DecompressionStream,DataView,TextDecoder,Uint8Array,Uint32Array,Float32Array,
  WORLD:archiveURL,OPEN_WORLD:{version},fetch:async(url,options)=>{const key=String(url);requests.push({url:key,signal:options?.signal});assert(options?.signal instanceof AbortSignal,'Production fetchSceneData must provide its cancellation signal');assert(network.has(key),'Unexpected fetch: '+key);const resource=network.get(key),response=new Response(stream(resource.bytes),{status:200,headers:{'content-type':resource.type}});if(resource.type==='application/gzip')response.arrayBuffer=async()=>{compressedArrayBuffers++;throw Error('Compressed input must be consumed through the production response stream');};return response;},
  requestAnimationFrame(callback){return setTimeout(()=>callback(performance.now()),0);},cancelAnimationFrame:clearTimeout,document:{getElementById:id=>id==='loadDetail'?loadDetail:null},obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],allLife:[],diverBatch:null});
 vm.runInContext(sources+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context,{filename:'actual-engine-and-loaders'});
 const Renderer=vm.runInContext('Renderer',context),renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile:false,quality:2,batches:[],drawCalls:0});
 const mesh=vm.runInContext(`(()=>{const g=new Geometry();g.tag=1;g.tri([0,0,0],[1,0,0],[0,1,0],[.2,.3,.4]);g.tag=8;g.tri([0,0,.1],[1,0,.1],[0,1,.1],[.6,.7,.8]);return indexGeometry(g.v);})()`,context);
 const vertices=Buffer.from(mesh.vertices.buffer,mesh.vertices.byteOffset,mesh.vertices.byteLength),indices=Buffer.from(mesh.indices.buffer,mesh.indices.byteOffset,mesh.indices.byteLength),payload=Buffer.concat([vertices,indices]);
 const descriptor={vertexOffset:0,vertexFloats:mesh.vertices.length,indexOffset:vertices.length,indexCount:mesh.indices.length,radius:mesh.radius};
 const common={...descriptor,kind:11,dynamic:true,material:0,species:43,instanceIDs:[0,1],transparentShell:{first:3,count:3}};
 const header={format:'return-blue/indexed-scene/1',sourceVersion:version,nodes:[{uid:'fixture-a',p:[0,-690,0],s:[.14,.14,.14]},{uid:'fixture-b',p:[1,-690,0],s:[.14,.14,.14]}],obstacles:[{id:'fixture-obstacle'}],reefPatches:[],life:[0,1],decorLife:[],shoal:[1],diverBatch:0,batches:[{...common,minDistance:0,maxDistance:4,sceneRole:'fixture-near'},{...common,minDistance:4,maxDistance:32,shadow:false,sceneRole:'fixture-far'}]};
 if(legacy)for(const batch of header.batches)delete batch.transparentShell;
 // A late bad batch must be rejected before even the first valid batch uploads.
 if(invalidRange)header.batches[1].transparentShell=invalidRange;
 network.set(archiveURL,{bytes:archive(header,payload),type:'application/gzip'});
 const chunk=zlib.gzipSync(payload),regionalIndex={...header,format:'return-blue/streamed-scene/1',batches:header.batches.map(batch=>({...batch,meshID:0})),meshes:[{...descriptor,chunk:0}],chunks:[{url:'part.gz',bytes:chunk.length,decodedBytes:payload.length}]};
 network.set(indexURL,{bytes:Buffer.from(JSON.stringify(regionalIndex)),type:'application/json'});network.set(chunkURL,{bytes:chunk,type:'application/gzip'});
 if(regional)context.WORLD_STREAM=indexURL;
 return {context,renderer,gl,warnings,requests,draws,attributes,uploads,header,payload,load:()=>context.loadCompiledScene(renderer),loadRegional:()=>context.loadStreamedScene(renderer,indexURL),get allocations(){return allocations;},get compressedArrayBuffers(){return compressedArrayBuffers;}};
}
function loadedIdentity(f){
 const {renderer:r,context:c}=f;assert.equal(r.batches.length,2);assert.equal(c.life.length,2);assert.equal(c.allLife.length,2);assert.equal(c.shoal[0],c.life[1]);assert.equal(c.diverBatch,r.batches[0]);
 assert.deepEqual(plain(c.life.map(a=>({uid:a.uid,p:a.p,s:a.s}))),f.header.nodes);
 for(const b of r.batches){assert.equal(b.instances[0],c.life[0]);assert.equal(b.instances[1],c.life[1]);assert.equal(b.kind,11);assert.equal(b.species,43);assert.equal(b.dynamic,true);assert.equal(b.drawCount,2);assert.equal(b.count,6);}
 const [near,far]=r.batches;assert.equal(near.vb,far.vb,'Canonical immutable vertex buffer is shared');assert.equal(near.eb,far.eb,'Canonical immutable index buffer is shared');assert.notEqual(near.vao,far.vao);assert.notEqual(near.ib,far.ib,'Each logical batch owns its packed instance buffer');assert.equal(near.maxDistance,4);assert.equal(far.minDistance,4);assert.equal(far.maxDistance,32);assert.equal(far.shadow,false);assert.equal(near.sceneRole,'fixture-near');assert.equal(far.sceneRole,'fixture-far');
 assert.deepEqual(plain(c.obstacles),f.header.obstacles);assert.equal(f.compressedArrayBuffers,0);assert.deepEqual(f.warnings,[]);
}
function drawRanges(f){
 const {renderer:r,gl}=f;
 for(const b of r.batches){
  assert.deepEqual(plain(b.transparentShell),{first:3,count:3});
  // Actual ordinary-colour and shadow callers both use this default entrypoint.
  for(const pass of ['colour','shadow']){r.drawBatch(b);const d=f.draws.at(-1);assert.deepEqual([d.mode,d.count,d.type,d.offset,d.instances],[gl.TRIANGLES,3,gl.UNSIGNED_SHORT,0,2],pass+' excludes the shell');}
  r.drawBatch(b,'shell',1);const d=f.draws.at(-1);assert.deepEqual([d.mode,d.count,d.type,d.offset,d.instances],[gl.TRIANGLES,3,gl.UNSIGNED_SHORT,6,1]);
  for(const [location,offset]of [[3,0],[4,12],[5,28],[6,40],[9,48],[10,64],[11,80]]){assert.equal(d.attributes.get(location).offset,offset+96,'Only the second packed actor is submitted');assert.equal(f.attributes.get(b.vao).get(location).offset,offset,'Original packed offsets are restored');}
 }
}
function rejected(f){assert.equal(f.allocations,0,'Invalid metadata must be rejected before any GPU-object IO');assert.equal(f.uploads.length,0);assert.equal(f.draws.length,0);assert.equal(f.renderer.batches.length,0);assert.equal(f.context.life.length,0);assert.equal(f.context.allLife.length,0);assert.equal(f.context.obstacles.length,0);assert.equal(f.context.diverBatch,null);assert.equal(f.warnings.length,1);assert.match(f.warnings[0],/Invalid transparent shell index range/);}
const checks=[];function check(name,run){checks.push({name,run});}
check('actual gzip compiled loader preserves shell ranges, shared actor identity and separate draw subranges',async()=>{
 const f=fixture();assert.equal(await f.load(),true);loadedIdentity(f);drawRanges(f);assert.equal(f.renderer.sceneLoad.compiled,true);assert.equal(f.renderer.sceneLoad.meshes,2);assert.deepEqual(f.requests.map(r=>r.url),[archiveURL]);
});
check('actual compiled loader rejects late invalid shell ranges before any batch allocation or world mutation',async()=>{
 for(const range of [{first:1,count:5},{first:3,count:6},{first:-3,count:9},{first:3,count:0}]){const f=fixture({invalidRange:range});assert.equal(await f.load(),false);rejected(f);assert.deepEqual(f.requests.map(r=>r.url),[archiveURL]);}
});
check('legacy compiled meshes without shell metadata keep their complete ordinary draw',async()=>{
 const f=fixture({legacy:true});assert.equal(await f.load(),true);loadedIdentity(f);for(const b of f.renderer.batches){assert.equal(b.transparentShell,null);f.renderer.drawBatch(b);assert.equal(f.draws.at(-1).count,6);const before=f.draws.length;f.renderer.drawBatch(b,'shell',0);assert.equal(f.draws.length,before);}
});
check('actual compiled entrypoint dispatches through regional JSON and gzip upload while retaining shell metadata',async()=>{
 const f=fixture({regional:true});try{assert.equal(await f.load(),true);loadedIdentity(f);drawRanges(f);assert.equal(f.renderer.sceneLoad.compiled,true);assert.equal(f.renderer.sceneLoad.streamed,true);assert.equal(f.renderer.sceneLoad.residentMeshes,1);assert.equal(f.renderer.sceneLoad.fetchedChunks,1);assert.deepEqual(f.requests.map(r=>r.url),[indexURL,chunkURL]);}finally{f.renderer.sceneStream?.dispose();}
});
check('actual regional loader rejects an invalid shell range before requesting or allocating geometry',async()=>{
 const f=fixture({invalidRange:{first:3,count:6}});assert.equal(await f.loadRegional(),false);rejected(f);assert.equal(f.renderer.sceneStream,null);assert.deepEqual(f.requests.map(r=>r.url),[indexURL]);
});
(async()=>{let failed=0;for(const test of checks){try{await test.run();console.log('PASS '+test.name);}catch(error){failed++;console.error('FAIL '+test.name+': '+error.stack);}}console.log(`${checks.length-failed}/${checks.length} transparent-shell loader checks passed`);if(failed)process.exitCode=1;})();
