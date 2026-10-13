/** Offline scene compiler. Original procedural sources -> compressed indexed geometry.
 * Node.js >= 18; no npm packages. Deployment uses the already-compiled artifact.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const R=__dirname,ctx=vm.createContext({console,Float32Array,Uint32Array,Math,Map,Set,Date,SCULPTED_CORAL:JSON.parse(fs.readFileSync(path.join(R,'assets/coral_forms.json'),'utf8'))});
for(const n of ['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','fauna.js','fauna_world.js'])vm.runInContext(fs.readFileSync(path.join(R,'src',n),'utf8'),ctx,{filename:n});
vm.runInContext(`
const recorder={batches:[],batch(geo,instances,kind=0,dynamic=false){const b={mesh:indexGeometry(geo.v),instances,kind,dynamic,material:geo.material||0,species:geo.species??-1,visible:true,shadow:geo.shadow!==false};this.batches.push(b);if(this.batches.length%20===0)console.log("baked",this.batches.length);return b;}};
buildReef(recorder);addLife(recorder);initializeIndividuals(recorder);updateLife(0);
const nodeList=[],nodeMap=new Map();function nodeID(n){if(!nodeMap.has(n)){nodeMap.set(n,nodeList.length);nodeList.push(n);}return nodeMap.get(n);}
const meshList=recorder.batches.map(b=>{let meta={};for(const k of ['kind','dynamic','material','species','visible','shadow','maxDistance','minDistance','shadowProxy','sceneRole'])if(b[k]!==undefined)meta[k]=b[k];return {meta,instanceIDs:b.instances.map(nodeID),mesh:b.mesh};});
globalThis.capture={meshList,header:{format:'return-blue/indexed-scene/1',sourceVersion:OPEN_WORLD.version,nodes:nodeList,obstacles,reefPatches,life:life.map(nodeID),decorLife:decorLife.map(nodeID),shoal:shoal.map(nodeID),diverBatch:recorder.batches.indexOf(diverBatch)}};
`,ctx,{timeout:300000});
const {meshList,header}=ctx.capture,chunks=[];let offset=0;
header.batches=meshList.map(({meta,instanceIDs,mesh})=>{if(!mesh.vertices.every(Number.isFinite))throw new Error("Non-finite mesh vertex; fix source geometry before publishing");const v=Buffer.from(mesh.vertices.buffer,mesh.vertices.byteOffset,mesh.vertices.byteLength),i=Buffer.from(mesh.indices.buffer,mesh.indices.byteOffset,mesh.indices.byteLength);const item={...meta,instanceIDs,vertexOffset:offset,vertexFloats:mesh.vertices.length,indexOffset:offset+v.length,indexCount:mesh.indices.length,radius:mesh.radius};chunks.push(v,i);offset+=v.length+i.length;return item;});
let h=Buffer.from(JSON.stringify(header));const pad=(4-h.length%4)%4;h=Buffer.concat([h,Buffer.alloc(pad,32)]);const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(h.length,4);
const raw=Buffer.concat([prefix,h,...chunks]);const gz=zlib.gzipSync(raw,{level:9});fs.writeFileSync(path.join(R,'assets','reef.mesh.gz'),gz);
console.log(`Scene: ${header.batches.length} indexed meshes, ${header.nodes.length} shared instances. ${raw.length} decoded bytes -> ${gz.length} gzip bytes.`);
