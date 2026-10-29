/* Precompiled scene: decode off the hot path and upload bounded slices to WebGL.
   Original generation remains as a fallback; no server, CDN or API key needed. */
async function loadCompiledScene(renderer){
 if(typeof WORLD_STREAM!=='undefined'&&await loadStreamedScene(renderer,WORLD_STREAM))return true;
 if(typeof DecompressionStream==='undefined'||typeof WORLD==='undefined')return false;
 const started=performance.now();let bytes,header,base;
 try{
  // Bound both sides while streaming. Avoid retaining the compressed archive
  // and a Blob copy alongside the decoded scene during startup on phones.
  const bounded=(limit,message)=>{let length=0;return new TransformStream({transform(chunk,controller){length+=chunk.byteLength;if(length>limit)throw new Error(message);controller.enqueue(chunk);}});};
  // The complete archive is larger than a region. Its one-minute budget also
  // covers body consumption and decompression, not only response headers.
  bytes=await fetchSceneData(WORLD,response=>{
   const stream=response.body.pipeThrough(bounded(24*1024*1024,'scene archive is oversized')).pipeThrough(new DecompressionStream('gzip')).pipeThrough(bounded(80*1024*1024,'decoded scene is oversized'));
   return new Response(stream).arrayBuffer();
  },undefined,60000);const view=new DataView(bytes);
  if(bytes.byteLength<8||bytes.byteLength>80*1024*1024||view.getUint32(0,true)!==0x35424652)throw new Error('invalid scene header');
  const length=view.getUint32(4,true);base=8+length;if(base>bytes.byteLength||base%4)throw new Error('invalid scene offsets');
  header=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,8,length)));
  if(header.sourceVersion!==OPEN_WORLD.version||header.format!=='return-blue/indexed-scene/1'||header.batches.length>600||header.nodes.length>20000)throw new Error('unsupported scene');
  if(typeof OceanRockContact!=='undefined')OceanRockContact.install(header.rockContact);
  for(const b of header.batches){
   if(b.vertexOffset%4||b.indexOffset%4||b.vertexFloats%12||b.indexCount%3||base+b.vertexOffset+b.vertexFloats*4>bytes.byteLength||base+b.indexOffset+b.indexCount*4>bytes.byteLength||!Number.isFinite(b.radius))throw new Error('invalid mesh range');
   transparentShellRange(b.transparentShell,b.indexCount);
   if(b.instanceIDs.some(i=>!Number.isInteger(i)||i<0||i>=header.nodes.length))throw new Error('invalid instance reference');
  }
 }catch(error){if(typeof OceanRockContact!=='undefined')OceanRockContact.reset();console.warn('Compiled scene unavailable; generating original scene instead.',error);return false;}
 const pause=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 // Keep canonical meshes local to this load. Renderer may share their immutable
 // GPU buffers, but must not retain the CPU views (which own the whole archive).
 const meshes=new Map(),sameBits=(a,b)=>{
  const x=new Uint32Array(a.buffer,a.byteOffset,a.byteLength/4),y=new Uint32Array(b.buffer,b.byteOffset,b.byteLength/4);
  for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;
 };
 for(let i=0;i<header.batches.length;i++){
  const b=header.batches[i],candidate={vertices:new Float32Array(bytes,base+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(bytes,base+b.indexOffset,b.indexCount),radius:b.radius};
  const key=b.vertexFloats+':'+b.indexCount+':'+b.radius;let bucket=meshes.get(key);if(!bucket)meshes.set(key,bucket=[]);
  const found=bucket.find(mesh=>sameBits(mesh.vertices,candidate.vertices)&&sameBits(mesh.indices,candidate.indices)),mesh=found||candidate;if(!found)bucket.push(mesh);
  const batch=renderer.batch({indexed:mesh,material:b.material,species:b.species,shadow:b.shadow,transparentShell:b.transparentShell},b.instanceIDs.map(n=>header.nodes[n]),b.kind,b.dynamic);
  for(const k of ['minDistance','maxDistance','shadowProxy','visible','sceneRole'])if(b[k]!==undefined)batch[k]=b[k];
  if(i%12===0){$('loadDetail').textContent='展開礁體 · '+Math.round(i/header.batches.length*100)+'%';await pause();}
 }
 obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.map(n=>header.nodes[n]));decorLife.push(...header.decorLife.map(n=>header.nodes[n]));shoal.push(...header.shoal.map(n=>header.nodes[n]));allLife=life.concat(decorLife);diverBatch=renderer.batches[header.diverBatch];
 renderer.sceneLoad={compiled:true,elapsedMs:performance.now()-started,decodedBytes:bytes.byteLength,meshes:header.batches.length};return true;
}
