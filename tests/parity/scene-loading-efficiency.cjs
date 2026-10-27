/* Exercise the real compiled-scene loader with deterministic streams and a
 * recording renderer. Geometry identity is the renderer's sharing seam. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=['engine.js','scene_stream.js','scene_cache.js'].map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n');
const packed=fs.readFileSync(path.join(root,'assets/reef.mesh.gz')),decoded=zlib.gunzipSync(packed),base=8+decoded.readUInt32LE(4),originalHeader=JSON.parse(decoded.subarray(8,base));
function archive(header,payload=Buffer.alloc(0)){
 let data=Buffer.from(JSON.stringify(header));data=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4,32)]);
 const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(data.length,4);return zlib.gzipSync(Buffer.concat([prefix,data,payload]));
}
function chunked(data,size=65536){let offset=0;return new ReadableStream({pull(controller){if(offset>=data.length){controller.close();return;}controller.enqueue(data.subarray(offset,offset+size));offset+=size;}});}
async function load({body=chunked(packed),streamOnly=false,compression=DecompressionStream,status=200,ResponseImpl=Response}={}){
 const calls=[],warnings=[],stats={arrayBufferCalls:0},loadDetail={textContent:''},renderer={batches:[],batch(geo,instances,kind,dynamic){const b={geo,instances,kind,dynamic};calls.push(b);this.batches.push(b);return b;}};
 const response={ok:status===200,status,body,arrayBuffer:async()=>{stats.arrayBufferCalls++;if(streamOnly)throw Error('Do not materialize the compressed archive');return packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength);}};
 const context=vm.createContext({console:{warn:(...args)=>warnings.push(args)},performance,AbortController,setTimeout,clearTimeout,Response:ResponseImpl,Blob,ReadableStream,TransformStream,DecompressionStream:compression,DataView,TextDecoder,Uint8Array,Uint32Array,Float32Array,WORLD:'scene.gz',OPEN_WORLD:{version:originalHeader.sourceVersion},fetch:async()=>response,requestAnimationFrame:callback=>callback(0),document:{getElementById:id=>id==='loadDetail'?loadDetail:null},obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],allLife:[],diverBatch:null});
 vm.runInContext(source,context);const ok=await context.loadCompiledScene(renderer);return {ok,calls,warnings,stats,context,renderer};
}
const tests=[];function check(name,fn){tests.push({name,fn});}
check('compiled scene shares every byte-identical mesh without merging batches',async()=>{
 // The community adds four high/low meshes for two new species to the
 // previous 501 batches. All 48 shared uploads must still stay shared.
 const result=await load();assert.equal(result.ok,true);assert.equal(result.calls.length,505);
 const meshes=new Set(result.calls.map(b=>b.geo.indexed));assert.equal(meshes.size,457,'48 duplicate geometry uploads must reuse their canonical mesh');
 let bytes=0;for(const mesh of meshes)bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
 // Continuous sediment normals share adjacent top corners. The v0.18.35
 // tripod curves add exactly 49,968 indexed bytes; geometry payloads of the other 501 batches stay identical.
 assert.equal(bytes,50787492);assert.equal(result.renderer.sceneLoad.decodedBytes,57457392);
 const nodes=new Map();for(const [i,batch]of result.calls.entries()){
  const authored=originalHeader.batches[i],mesh=batch.geo.indexed;
  assert.equal(batch.kind,authored.kind);assert.equal(batch.dynamic,authored.dynamic);assert.equal(batch.geo.material,authored.material);assert.equal(batch.geo.species,authored.species);
  assert.deepEqual(Buffer.from(mesh.vertices.buffer,mesh.vertices.byteOffset,mesh.vertices.byteLength),decoded.subarray(base+authored.vertexOffset,base+authored.vertexOffset+authored.vertexFloats*4));
  assert.deepEqual(Buffer.from(mesh.indices.buffer,mesh.indices.byteOffset,mesh.indices.byteLength),decoded.subarray(base+authored.indexOffset,base+authored.indexOffset+authored.indexCount*4));
  for(const [j,id]of authored.instanceIDs.entries()){if(nodes.has(id))assert.equal(batch.instances[j],nodes.get(id));else nodes.set(id,batch.instances[j]);}
 }
 assert.equal(result.calls[201].geo.indexed,result.calls[277].geo.indexed);assert.notEqual(result.calls[201].geo.material,result.calls[277].geo.material);
 assert.equal(result.calls[227].geo.indexed,result.calls[244].geo.indexed);assert.notEqual(result.calls[227].kind,result.calls[244].kind);
 assert.equal(result.warnings.length,0);
});
check('compressed fetch is consumed as a stream without an archive ArrayBuffer',async()=>{
 const result=await load({streamOnly:true});assert.equal(result.ok,true);assert.equal(result.stats.arrayBufferCalls,0);
});
check('geometry comparison preserves negative zero bits and distinct indices',async()=>{
 const header={...originalHeader,nodes:[{p:[0,0,0]}],obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],diverBatch:0,batches:[]},parts=[];let offset=0;
 for(const [i,negative]of [false,false,true].entries()){
  const vertices=new Float32Array(36);vertices[0]=negative?-0:0;const indices=new Uint32Array(i===1?[0,2,1]:[0,1,2]),v=Buffer.from(vertices.buffer),ix=Buffer.from(indices.buffer);
  header.batches.push({kind:0,dynamic:false,material:0,species:-1,vertexOffset:offset,vertexFloats:36,indexOffset:offset+v.length,indexCount:3,radius:1,instanceIDs:[0]});parts.push(v,ix);offset+=v.length+ix.length;
 }
 const result=await load({body:chunked(archive(header,Buffer.concat(parts)),7),streamOnly:true});assert.equal(result.ok,true);
 assert.equal(new Set(result.calls.map(b=>b.geo.indexed)).size,3);assert(Object.is(result.calls[2].geo.indexed.vertices[0],-0));
});
check('oversized compressed stream fails before decoding or constructing batches',async()=>{
 const passThrough=class{constructor(){return new TransformStream();}},result=await load({body:chunked(new Uint8Array(24*1024*1024+1),1024*1024),streamOnly:true,compression:passThrough});assert.equal(result.ok,false);assert.equal(result.calls.length,0);assert.match(String(result.warnings[0]),/archive is oversized/);
});
check('oversized decoded stream stops before parsing or constructing batches',async()=>{
 // Produce one transient MiB per compressed byte and discard consumed chunks;
 // the guard sees its real 80 MiB limit without retaining a giant fixture.
 const expanding=class{constructor(){return new TransformStream({transform(chunk,controller){controller.enqueue(new Uint8Array(1024*1024));}});}};
 const discarding=class{constructor(stream){this.stream=stream;}async arrayBuffer(){for await(const chunk of this.stream){}return new ArrayBuffer(0);}};
 const result=await load({body:chunked(new Uint8Array(81),1),streamOnly:true,compression:expanding,ResponseImpl:discarding});
 assert.equal(result.ok,false);assert.equal(result.calls.length,0);assert.match(String(result.warnings[0]),/decoded scene is oversized/);
});
check('invalid gzip and HTTP failures preserve fallback generation',async()=>{
 for(const options of [{body:chunked(Buffer.from('invalid gzip')),streamOnly:true},{status:503}]){const result=await load(options);assert.equal(result.ok,false);assert.equal(result.calls.length,0);assert.equal(result.warnings.length,1);}
});
(async()=>{let failed=0;for(const test of tests){try{await test.fn();console.log('PASS '+test.name);}catch(error){failed++;console.error('FAIL '+test.name+': '+error.stack);}}console.log(`${tests.length-failed}/${tests.length} scene loading efficiency checks passed`);if(failed)process.exitCode=1;})();
