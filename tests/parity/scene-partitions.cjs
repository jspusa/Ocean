/* Reconstruct every partitioned model and compare all bytes to the legacy
 * archive. Chunk partitioning may alter transport only, never world content. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'assets/scene'),index=JSON.parse(fs.readFileSync(path.join(folder,'index.json'))),packed=fs.readFileSync(path.join(root,'assets/reef.mesh.gz')),raw=zlib.gunzipSync(packed),base=8+raw.readUInt32LE(4),legacy=JSON.parse(raw.subarray(8,base));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
assert.equal(index.format,'return-blue/streamed-scene/1');assert.equal(index.sourceVersion,legacy.sourceVersion);assert.equal(index.sourceArchiveSHA256,sha(packed));
for(const key of ['nodes','obstacles','reefPatches','life','decorLife','shoal','diverBatch'])assert.deepEqual(index[key],legacy[key],key+' must keep all world state and stable node IDs');
const chunks=index.chunks.map(chunk=>{
 assert.match(chunk.url,/^chunk-[a-f0-9]{20}\.bin\.gz$/);const packed=fs.readFileSync(path.join(folder,chunk.url));assert.equal(packed.length,chunk.bytes);assert.equal(sha(packed),chunk.sha256);const bytes=zlib.gunzipSync(packed);assert.equal(bytes.length,chunk.decodedBytes);return bytes;
});
for(let i=0;i<chunks.length;i++)if(chunks[i].length>1024*1024)assert.equal(index.meshes.filter(mesh=>mesh.chunk===i).length,1,'Only a single indivisible authored mesh may exceed the chunk target');
assert.equal(index.batches.length,legacy.batches.length);assert.equal(index.meshes.length,439);
for(let i=0;i<legacy.batches.length;i++){
 const before=legacy.batches[i],after=index.batches[i],mesh=index.meshes[after.meshID],bytes=chunks[mesh.chunk];
 const {vertexOffset,indexOffset,...meta}=before,{meshID,...actualMeta}=after;assert.deepEqual(actualMeta,meta,'batch ordering, materials, species, LOD and instances');
 assert.deepEqual(bytes.subarray(mesh.vertexOffset,mesh.vertexOffset+mesh.vertexFloats*4),raw.subarray(base+before.vertexOffset,base+before.vertexOffset+before.vertexFloats*4));
 assert.deepEqual(bytes.subarray(mesh.indexOffset,mesh.indexOffset+mesh.indexCount*4),raw.subarray(base+before.indexOffset,base+before.indexOffset+before.indexCount*4));
 assert.equal(mesh.radius,before.radius);assert.equal(mesh.vertexFloats,before.vertexFloats);assert.equal(mesh.indexCount,before.indexCount);
}
console.log('PASS '+index.batches.length+' batches and '+index.meshes.length+' meshes reconstruct byte-identical geometry, metadata and node state across '+index.chunks.length+' bounded partitions');
