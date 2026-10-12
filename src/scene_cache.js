/* Precompiled scene: decode off the hot path and upload bounded slices to WebGL.
   Original generation remains as a fallback; no server, CDN or API key needed. */
async function loadCompiledScene(renderer){
 if(typeof DecompressionStream==='undefined'||typeof WORLD==='undefined')return false;
 const started=performance.now();let bytes,header,base;
 try{
  const response=await fetch(WORLD);if(!response.ok)throw new Error('scene HTTP '+response.status);
  const packed=await response.arrayBuffer();if(packed.byteLength>24*1024*1024)throw new Error('scene archive is oversized');
  const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
  bytes=await new Response(stream).arrayBuffer();const view=new DataView(bytes);
  if(bytes.byteLength<8||bytes.byteLength>80*1024*1024||view.getUint32(0,true)!==0x35424652)throw new Error('invalid scene header');
  const length=view.getUint32(4,true);base=8+length;if(base>bytes.byteLength||base%4)throw new Error('invalid scene offsets');
  header=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,8,length)));
  if(header.sourceVersion!=='0.7.0'||header.format!=='return-blue/indexed-scene/1'||header.batches.length>600||header.nodes.length>20000)throw new Error('unsupported scene');
  for(const b of header.batches){
   if(b.vertexOffset%4||b.indexOffset%4||b.vertexFloats%12||b.indexCount%3||base+b.vertexOffset+b.vertexFloats*4>bytes.byteLength||base+b.indexOffset+b.indexCount*4>bytes.byteLength||!Number.isFinite(b.radius))throw new Error('invalid mesh range');
   if(b.instanceIDs.some(i=>!Number.isInteger(i)||i<0||i>=header.nodes.length))throw new Error('invalid instance reference');
  }
 }catch(error){console.warn('Compiled scene unavailable; generating original scene instead.',error);return false;}
 const pause=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 for(let i=0;i<header.batches.length;i++){
  const b=header.batches[i];const mesh={vertices:new Float32Array(bytes,base+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(bytes,base+b.indexOffset,b.indexCount),radius:b.radius};
  const batch=renderer.batch({indexed:mesh,material:b.material,species:b.species,shadow:b.shadow},b.instanceIDs.map(n=>header.nodes[n]),b.kind,b.dynamic);
  for(const k of ['minDistance','maxDistance','shadowProxy','visible'])if(b[k]!==undefined)batch[k]=b[k];
  if(i%12===0){$('loadDetail').textContent='展開礁體 · '+Math.round(i/header.batches.length*100)+'%';await pause();}
 }
 obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.map(n=>header.nodes[n]));decorLife.push(...header.decorLife.map(n=>header.nodes[n]));shoal.push(...header.shoal.map(n=>header.nodes[n]));allLife=life.concat(decorLife);diverBatch=renderer.batches[header.diverBatch];
 renderer.sceneLoad={compiled:true,elapsedMs:performance.now()-started,decodedBytes:bytes.byteLength,meshes:header.batches.length};return true;
}
