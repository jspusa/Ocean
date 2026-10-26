/* Authoritative terrain -> published archive. The recording renderer is the
 * public OceanTrench.build seam; all indexing uses the production function.
 * --archive permits checking a stale or candidate artifact without rewriting it.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=process.argv.indexOf('--archive');
assert(option<0||process.argv[option+1],'--archive requires a file path');
const archive=option<0?path.join(root,'assets/reef.mesh.gz'):path.resolve(process.argv[option+1]),raw=zlib.gunzipSync(fs.readFileSync(archive));
assert.equal(raw.readUInt32LE(0),0x35424652);const base=8+raw.readUInt32LE(4);assert(base<=raw.length&&base%4===0,'valid aligned archive header');
const header=JSON.parse(raw.subarray(8,base)),compiled=header.batches.filter(b=>b.sceneRole==='region:trench'),c=vm.createContext({console,Float32Array,Uint32Array,Math,Map,Set,Date});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),c,{filename:name+'.js'});
const {trench,indexGeometry}=vm.runInContext('({trench:OceanTrench,indexGeometry})',c),generated=[],plain=x=>JSON.parse(JSON.stringify(x));
trench.build({batch(geo,instances,kind=0,dynamic=false){const b={geo,instances,kind,dynamic};generated.push(b);return b;}});
assert.equal(generated.length,107,'exercise all authored depth/material batches');assert.equal(compiled.length,generated.length,'no missing or extra compiled trench batches');
let vertices=0,indices=0;
for(let i=0;i<generated.length;i++){
 const b=generated[i],mesh=indexGeometry(b.geo.v),saved=compiled[i],{vertexOffset,indexOffset,instanceIDs,...metadata}=saved;
 const expected={kind:b.kind,dynamic:b.dynamic,material:b.geo.material||0,species:b.geo.species??-1,visible:true,shadow:b.geo.shadow!==false,transparentShell:null,vertexFloats:mesh.vertices.length,indexCount:mesh.indices.length,radius:mesh.radius};
 for(const key of ['maxDistance','minDistance','shadowProxy','visible','sceneRole'])if(b[key]!==undefined)expected[key]=b[key];
 assert.deepEqual(metadata,plain(expected),'trench batch '+i+' geometry bounds, material and LOD metadata match source');
 const vb=Buffer.from(mesh.vertices.buffer,mesh.vertices.byteOffset,mesh.vertices.byteLength),ib=Buffer.from(mesh.indices.buffer,mesh.indices.byteOffset,mesh.indices.byteLength);
 assert(vb.equals(raw.subarray(base+vertexOffset,base+vertexOffset+vb.length)),'trench batch '+i+' complete vertex bytes differ from source');
 assert(ib.equals(raw.subarray(base+indexOffset,base+indexOffset+ib.length)),'trench batch '+i+' complete index bytes differ from source');
 assert.equal(instanceIDs.length,b.instances.length,'trench batch '+i+' instance count');
 for(let j=0;j<instanceIDs.length;j++){
  // Full-world initialization adds decorative genes after build. Transforms
  // remain owned by this public terrain seam and must match without tolerance.
  const {bioGenes,...instance}=header.nodes[instanceIDs[j]];
  assert(Array.isArray(bioGenes)&&bioGenes.length===4&&bioGenes.every(Number.isFinite),'compiled initialization retains finite genes');
  assert.deepEqual(instance,plain(b.instances[j]),'trench batch '+i+' exact source origin and transform');
 }
 vertices+=vb.length;indices+=ib.length;
}
console.log('PASS '+compiled.length+' compiled trench batches exactly match source vertices, indices, origins and LOD metadata ('+vertices+' vertex bytes; '+indices+' index bytes)');
