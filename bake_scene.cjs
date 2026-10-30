/** Offline scene compiler. Original procedural sources -> compressed indexed geometry.
 * Node.js >= 18; no npm packages. Deployment uses the already-compiled artifact.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {MODULES,fingerprint}=require('./scene_inputs.cjs'),inputs=fingerprint(__dirname);
const R=__dirname,ctx=vm.createContext({console,Float32Array,Uint32Array,Math,Map,Set,Date,SCULPTED_CORAL:JSON.parse(fs.readFileSync(path.join(R,'assets/coral_forms.json'),'utf8'))});
for(const n of MODULES)vm.runInContext(fs.readFileSync(path.join(R,'src',n),'utf8'),ctx,{filename:n});
// Give each offline phase its own bounded guard and a visible completion
// record. The shared context and statement order are unchanged; no stage may
// skip the final source, pose, contact or archive validation below.
function phase(name,source,timeout=300000){
 const start=Date.now(),cpu=process.cpuUsage();let passed=false;console.log('phase start:',name);
 try{vm.runInContext(source,ctx,{timeout,filename:'bake:'+name});passed=true;}
 finally{const elapsed=process.cpuUsage(cpu);console.log('phase '+(passed?'complete:':'failed:'),name,JSON.stringify({wallMs:Date.now()-start,cpuMs:(elapsed.user+elapsed.system)/1000}));}
}
phase('recorder',`
const recorder={batches:[],batch(geo,instances,kind=0,dynamic=false){const b={mesh:indexGeometry(geo.v),instances,kind,dynamic,material:geo.material||0,species:geo.species??-1,visible:true,shadow:geo.shadow!==false,transparentShell:transparentShellRange(geo.transparentShell,geo.v.length/12)};this.batches.push(b);if(this.batches.length%20===0)console.log("baked",this.batches.length);return b;}};
`);
// Posed crown/root fitting is construction-only; gameplay loads its verified
// archive/replay. Subsequent smaller phases retain five-minute guards.
phase('world and root fitting','buildReef(recorder)',1800000);
phase('animal meshes','addLife(recorder)');
phase('individual identities','initializeIndividuals(recorder)');
phase('initial animal motion','updateLife(0)');
phase('archive capture',`
const nodeList=[],nodeMap=new Map();function nodeID(n){if(!nodeMap.has(n)){nodeMap.set(n,nodeList.length);nodeList.push(n);}return nodeMap.get(n);}
const meshList=recorder.batches.map(b=>{let meta={};for(const k of ['kind','dynamic','material','species','visible','shadow','maxDistance','minDistance','shadowProxy','sceneRole','transparentShell'])if(b[k]!==undefined)meta[k]=b[k];return {meta,instanceIDs:b.instances.map(nodeID),mesh:b.mesh};});
const growth=reefGrowthFitReport?.replay,growthRefs=reefGrowthFitReport?.actorRefs;
if(!growth||growthRefs?.length!==growth.actors.length)throw Error('Reef growth compiler references are incomplete');
const growthReplay={...growth,actors:growth.actors.map((actor,i)=>{const n=growthRefs[i],node=nodeMap.get(n);if(node===undefined)throw Error('Reef growth actor is absent from compiled batches');const pose={p:n.p,s:n.s||[1,1,1],yaw:n.yaw||0,pitch:n.pitch||0};if(JSON.stringify(pose)!==JSON.stringify(actor.to))throw Error('Reef growth pose changed after fitting');return {...actor,node};})};
globalThis.capture={meshList,growthReplay,header:{format:'return-blue/indexed-scene/1',sourceVersion:OPEN_WORLD.version,nodes:nodeList,rockContact:OceanRockContact.catalogue(),obstacles,reefPatches,life:life.map(nodeID),decorLife:decorLife.map(nodeID),shoal:shoal.map(nodeID),diverBatch:recorder.batches.indexOf(diverBatch)}};
`);
const {meshList,header,growthReplay}=ctx.capture,chunks=[];let offset=0;
if(!growthReplay||growthReplay.format!=='return-blue/reef-growth/1'||!Array.isArray(growthReplay.failed)||growthReplay.failed.length||!growthReplay.actors?.length||!/^[a-f0-9]{16}$/.test(growthReplay.contentStamp||'')){
 const failures=growthReplay?.failed;
 throw Error('Reef growth fit is incomplete; refusing to overwrite the compiled scene. '+JSON.stringify({actors:growthReplay?.actors?.length,failed:failures?.length,firstFailures:failures?.slice(0,12)}));
}
if(fingerprint(R).sourceSHA256!==inputs.sourceSHA256)throw Error('Scene inputs changed during compilation; refusing a mixed build');
header.batches=meshList.map(({meta,instanceIDs,mesh})=>{if(!mesh.vertices.every(Number.isFinite))throw new Error("Non-finite mesh vertex; fix source geometry before publishing");const v=Buffer.from(mesh.vertices.buffer,mesh.vertices.byteOffset,mesh.vertices.byteLength),i=Buffer.from(mesh.indices.buffer,mesh.indices.byteOffset,mesh.indices.byteLength);const item={...meta,instanceIDs,vertexOffset:offset,vertexFloats:mesh.vertices.length,indexOffset:offset+v.length,indexCount:mesh.indices.length,radius:mesh.radius};chunks.push(v,i);offset+=v.length+i.length;return item;});
let h=Buffer.from(JSON.stringify(header));const pad=(4-h.length%4)%4;h=Buffer.concat([h,Buffer.alloc(pad,32)]);const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(h.length,4);
const raw=Buffer.concat([prefix,h,...chunks]);const gz=zlib.gzipSync(raw,{level:9});
const replay={...growthReplay,sourceSHA256:inputs.sourceSHA256,sourceInputs:inputs.files,sceneArchiveSHA256:crypto.createHash('sha256').update(gz).digest('hex')};
fs.writeFileSync(path.join(R,'assets','reef.mesh.gz'),gz);
fs.writeFileSync(path.join(R,'assets','reef-growth.json'),JSON.stringify(replay)+'\n');
console.log(`Scene: ${header.batches.length} indexed meshes, ${header.nodes.length} shared instances. ${raw.length} decoded bytes -> ${gz.length} gzip bytes.`);
