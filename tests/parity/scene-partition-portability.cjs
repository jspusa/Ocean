/* Run the actual partitioner on tiny archives while a preload simulates gzip
 * OS markers from Unix (3), Darwin (19) and unknown (255). RFC1952 assigns 255
 * to unknown; transport hashes must not change merely with the build host.
 * No project assets are written by this CPU-only fixture.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ocean-partition-portability-')),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const partitioner=path.join(root,'partition_scene.cjs'),preload=path.join(temp,'force-gzip-os.cjs');
function fixture(changed=false){
 const nodes=[{p:[0,0,0]},{p:[150,0,0]}],parts=[],batches=[],meshes=[];let offset=0;
 for(let mesh=0;mesh<2;mesh++){
  const vertices=new Float32Array(36),indices=new Uint32Array([0,1,2]);
  for(let vertex=0;vertex<3;vertex++){const k=vertex*12;vertices[k]=(vertex===1?1:0)+mesh*.25;vertices[k+1]=vertex===2?1:0;vertices[k+5]=1;vertices[k+6]=.2+mesh*.1;vertices[k+7]=.6;vertices[k+8]=.8;vertices[k+9]=vertex===1?1:0;vertices[k+10]=vertex===2?1:0;vertices[k+11]=mesh;}
  if(changed&&mesh===1)vertices[0]+=.125;
  const v=Buffer.from(vertices.buffer),i=Buffer.from(indices.buffer);meshes.push({vertices:v,indices:i});batches.push({kind:0,dynamic:false,material:1,species:-1,visible:true,shadow:true,instanceIDs:[mesh],vertexOffset:offset,vertexFloats:vertices.length,indexOffset:offset+v.length,indexCount:indices.length,radius:2});parts.push(v,i);offset+=v.length+i.length;
 }
 const header={format:'return-blue/indexed-scene/1',sourceVersion:'portability-fixture',nodes,rockContact:{format:'return-blue/rock-contact/1',meshes:[],instances:[]},obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],diverBatch:0,batches};
 let json=Buffer.from(JSON.stringify(header));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(json.length,4);
 const packed=zlib.gzipSync(Buffer.concat([prefix,json,...parts]),{level:9});packed[9]=255;return {packed,header,meshes};
}
function run(marker,input,label){
 const folder=path.join(temp,label);fs.mkdirSync(path.join(folder,'assets'),{recursive:true});fs.writeFileSync(path.join(folder,'assets/reef.mesh.gz'),input.packed);fs.copyFileSync(partitioner,path.join(folder,'partition_scene.cjs'));
 cp.execFileSync(process.execPath,['--require',preload,path.join(folder,'partition_scene.cjs')],{cwd:folder,env:{...process.env,OCEAN_TEST_GZIP_OS:String(marker)},stdio:'pipe'});
 const injected=JSON.parse(fs.readFileSync(path.join(folder,'gzip-os-injection.json'),'utf8'));assert.deepEqual(injected,{marker,calls:2},'the real gzipSync calls must receive each simulated host marker');
 const scene=path.join(folder,'assets/scene'),index=JSON.parse(fs.readFileSync(path.join(scene,'index.json'),'utf8'));assert.equal(index.sourceArchiveSHA256,sha(input.packed));assert.equal(index.chunks.length,2);assert.equal(index.meshes.length,2);assert.equal(index.batches.length,2);
 for(const key of ['nodes','rockContact','obstacles','reefPatches','life','decorLife','shoal','diverBatch'])assert.deepEqual(index[key],input.header[key],key+' metadata must remain lossless');
 const files=index.chunks.map(chunk=>{
  const bytes=fs.readFileSync(path.join(scene,chunk.url));assert.equal(bytes.length,chunk.bytes);assert.equal(sha(bytes),chunk.sha256);assert.equal(chunk.url,'chunk-'+chunk.sha256.slice(0,20)+'.bin.gz');assert.equal(bytes[0],0x1f);assert.equal(bytes[1],0x8b);assert.equal(bytes[2],8);
  const decoded=zlib.gunzipSync(bytes);assert.equal(decoded.length,chunk.decodedBytes);return {bytes,decoded};
 });
 for(let i=0;i<2;i++){
  const {vertexOffset,indexOffset,...expected}=input.header.batches[i],{meshID,...actual}=index.batches[i],mesh=index.meshes[meshID],decoded=files[mesh.chunk].decoded;assert.deepEqual(actual,expected,'authored batch metadata and instance order');
  assert.equal(mesh.vertexFloats,input.header.batches[i].vertexFloats);assert.equal(mesh.indexCount,input.header.batches[i].indexCount);assert.equal(mesh.radius,input.header.batches[i].radius);
  assert.deepEqual(decoded.subarray(mesh.vertexOffset,mesh.vertexOffset+mesh.vertexFloats*4),input.meshes[i].vertices,'exact decoded Float32 geometry');assert.deepEqual(decoded.subarray(mesh.indexOffset,mesh.indexOffset+mesh.indexCount*4),input.meshes[i].indices,'exact decoded index order');
 }
 return {marker,index,files};
}
try{
 fs.writeFileSync(preload,"'use strict';const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),gzip=zlib.gzipSync,marker=Number(process.env.OCEAN_TEST_GZIP_OS);let calls=0;zlib.gzipSync=function(...args){const bytes=gzip.apply(this,args);bytes[9]=marker;calls++;return bytes;};process.on('exit',()=>fs.writeFileSync(path.join(process.cwd(),'gzip-os-injection.json'),JSON.stringify({marker,calls})));\n");
 const input=fixture(),cases=[3,19,255].map(marker=>run(marker,input,'host-'+marker));
 console.log(JSON.stringify({simulatedMarkers:cases.map(c=>c.marker),outputMarkers:cases.map(c=>c.files.map(f=>f.bytes[9])),urls:cases.map(c=>c.index.chunks.map(chunk=>chunk.url))}));
 for(const result of cases){assert.deepEqual(result.index,cases[0].index,'RED: identical geometry must retain exact chunk URLs, SHA and metadata across gzip build hosts');for(let i=0;i<result.files.length;i++){assert.equal(result.files[i].bytes[9],255,'canonical gzip OS must be unknown (RFC1952)');assert.deepEqual(result.files[i].bytes,cases[0].files[i].bytes,'canonical compressed chunks are byte-identical across build hosts');}}
 const changed=run(19,fixture(true),'changed-geometry'),original=cases[0];
 assert.equal(changed.index.chunks[0].url,original.index.chunks[0].url,'untouched geometry retains its cached URL');assert.notEqual(changed.index.chunks[1].url,original.index.chunks[1].url,'changed geometry must receive a new content URL');assert.notEqual(changed.index.chunks[1].sha256,original.index.chunks[1].sha256);assert(changed.files.every(f=>f.bytes[9]===255));
 console.log('PASS actual partitioner: canonical gzip markers, exact URLs/SHA/metadata/decoded geometry across 3 build hosts, and a changed-geometry cache invalidation control');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
