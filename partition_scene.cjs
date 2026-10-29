/** Deterministic, lossless network partitions of the legacy offline scene.
 * Geometry remains byte-identical. Runtime chooses which chunks to request. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=__dirname,folder=path.join(root,'assets/scene'),packed=fs.readFileSync(path.join(root,'assets/reef.mesh.gz'));
const raw=zlib.gunzipSync(packed),base=8+raw.readUInt32LE(4),original=JSON.parse(raw.subarray(8,base)),hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const meshes=[],byHash=new Map(),groups=new Map(),batches=[];
for(const b of original.batches){
 const vertices=raw.subarray(base+b.vertexOffset,base+b.vertexOffset+b.vertexFloats*4),indices=raw.subarray(base+b.indexOffset,base+b.indexOffset+b.indexCount*4),key=hash(Buffer.concat([vertices,indices]))+':'+b.radius;
 let id=byHash.get(key);
 if(id===undefined){
  id=meshes.length;byHash.set(key,id);
  const points=new Float32Array(vertices.buffer,vertices.byteOffset,vertices.byteLength/4),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<points.length;i+=12)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],points[i+axis]);max[axis]=Math.max(max[axis],points[i+axis]);}
  const bounds={center:min.map((v,i)=>(v+max[i])*.5),half:min.map((v,i)=>(max[i]-v)*.5)},node=original.nodes[b.instanceIDs[0]],p=node?.p||[0,0,0];
  const region=(b.dynamic?'actors':'map')+':'+p.map(v=>Math.floor(v/128)).join(':');
  const mesh={vertexFloats:b.vertexFloats,indexCount:b.indexCount,radius:b.radius,bounds};meshes.push(mesh);
  if(!groups.has(region))groups.set(region,[]);groups.get(region).push({id,vertices,indices});
 }
 const {vertexOffset,indexOffset,...meta}=b;batches.push({...meta,meshID:id});
}
fs.mkdirSync(folder,{recursive:true});const chunks=[],keep=new Set();
function emit(items){
 if(!items.length)return;let offset=0;const parts=[],id=chunks.length;
 for(const item of items){const mesh=meshes[item.id];mesh.chunk=id;mesh.vertexOffset=offset;mesh.indexOffset=offset+item.vertices.length;parts.push(item.vertices,item.indices);offset+=item.vertices.length+item.indices.length;}
 const bytes=zlib.gzipSync(Buffer.concat(parts),{level:9}),sha256=hash(bytes),url='chunk-'+sha256.slice(0,20)+'.bin.gz';keep.add(url);fs.writeFileSync(path.join(folder,url),bytes);chunks.push({url,bytes:bytes.length,decodedBytes:offset,sha256});
}
for(const items of groups.values()){
 let pending=[],bytes=0;
 for(const item of items){const size=item.vertices.length+item.indices.length;if(bytes&&bytes+size>1024*1024){emit(pending);pending=[];bytes=0;}pending.push(item);bytes+=size;}
 emit(pending);
}
// The complete contact catalogue stays in metadata when GPU chunks unload.
if(original.rockContact?.format!=='return-blue/rock-contact/1')throw Error('Rebake the scene with actual stone contacts before partitioning');
const index={...original,format:'return-blue/streamed-scene/1',sourceArchiveSHA256:hash(packed),batches,meshes,chunks};
fs.writeFileSync(path.join(folder,'index.json'),JSON.stringify(index)+'\n');
for(const name of fs.readdirSync(folder))if(/^chunk-[a-f0-9]{20}\.bin\.gz$/.test(name)&&!keep.has(name))fs.unlinkSync(path.join(folder,name));
console.log('Streamed scene: '+batches.length+' batches, '+meshes.length+' unique meshes, '+chunks.length+' chunks; '+fs.statSync(path.join(folder,'index.json')).size+' metadata bytes; '+chunks.reduce((sum,c)=>sum+c.bytes,0)+' compressed geometry bytes.');
