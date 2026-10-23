/* Geographic geometry residency. Simulation and collision data remain complete;
 * only immutable map buffers are loaded ahead and released behind the camera. */
function streamBatchNear(b,eye,padding=0,lodScale=1){
 if(!b.visible)return false;
 const reach=(b.maxDistance||220)*lodScale+.6+padding,limit=reach*reach;
 const shadow=b.shadow&&!b.dynamic&&b.kind!==3,cx=Math.round(eye[0]/16)*16,cy=Math.round(eye[1]/16)*16-4,cz=Math.round(eye[2]/16)*16-12;
 for(const f of b.instances){const p=f.p;let x=p[0]-eye[0],y=p[1]-eye[1],z=p[2]-eye[2];if(x*x+y*y+z*z<=limit)return true;
  if(shadow){x=p[0]-cx;y=p[1]-cy;z=p[2]-cz;if(x*x+y*y+z*z<=limit)return true;}}
 return false;
}
function streamPreloadEyes(eye,previous,seconds){
 const points=[eye];if(!previous||seconds<=0)return points;
 const velocity=eye.map((v,i)=>(v-previous[i])/Math.max(.001,seconds)),speed=Math.hypot(...velocity);
 // Camera cuts are not travel velocity. The readiness gate loads their actual
 // destination; continuous currents get three seconds of directional lookahead.
 if(speed>320||speed<.01)return points;
 const steps=Math.max(1,Math.ceil(speed*3/64));
 for(let step=1;step<=steps;step++)points.push(eye.map((v,i)=>v+velocity[i]*3*step/steps));return points;
}
class SceneStream{
 constructor(renderer,index,url){
  this.renderer=renderer;this.index=index;this.url=new URL(url,location.href);this.queue=[];this.jobs=new Map();this.retryAfter=new Map();this.active=0;this.downloaded=0;this.fetched=new Set();this.disposed=false;this.lastEye=null;this.lastTime=0;this.padding=48;
  this.meshes=index.meshes.map((meta,id)=>({id,meta,batches:[],pinned:false,resident:false,lastNeeded:0}));
  this.chunkMeshes=index.chunks.map(()=>[]);for(const m of this.meshes)this.chunkMeshes[m.meta.chunk].push(m);
  for(const meta of index.batches){const instances=meta.instanceIDs.map(id=>index.nodes[id]),b=renderer.deferredBatch(meta,instances),m=this.meshes[meta.meshID];b.streamMesh=meta.meshID;m.batches.push(b);if(b.dynamic||b.sceneRole==='research-vessel')m.pinned=true;}
 }
 scale(){const r=this.renderer;return r.mobile?(r.quality===0?.64:.82):(r.quality===0?.75:1);}
 needed(eye,padding=0){const ids=new Set(),scale=this.scale();for(const m of this.meshes)if(m.pinned||m.batches.some(b=>streamBatchNear(b,eye,padding,scale)))ids.add(m.id);return ids;}
 neededRanges(eye){
  // The current view uses three paddings. Classify them in one live traversal,
  // so moved instances, visibility and quality edits cannot leave stale bounds.
  const required=new Set(),preload=new Set(),keep=new Set(),scale=this.scale(),cx=Math.round(eye[0]/16)*16,cy=Math.round(eye[1]/16)*16-4,cz=Math.round(eye[2]/16)*16-12;
  for(const m of this.meshes){let matches=m.pinned?7:0;
   if(!m.pinned)for(const b of m.batches){
    if(!b.visible)continue;const reach=(b.maxDistance||220)*scale+.6,required2=reach*reach,preload2=(reach+48)**2,keep2=(reach+128)**2,shadow=b.shadow&&!b.dynamic&&b.kind!==3;
    for(const f of b.instances){const p=f.p;let x=p[0]-eye[0],y=p[1]-eye[1],z=p[2]-eye[2],distance=x*x+y*y+z*z;
     if(shadow){x=p[0]-cx;y=p[1]-cy;z=p[2]-cz;distance=Math.min(distance,x*x+y*y+z*z);}
     if(distance<=required2)matches|=1;if(distance<=preload2)matches|=2;if(distance<=keep2)matches|=4;
     if(matches===7)break;
    }
    if(matches===7)break;
   }
   if(matches&1)required.add(m.id);if(matches&2)preload.add(m.id);if(matches&4)keep.add(m.id);
  }
  return {required,preload,keep};
 }
 request(id,priority=0){
  if((this.retryAfter.get(id)||0)>performance.now())return Promise.reject(new Error('region retry pending'));
  if(this.jobs.has(id)){const job=this.jobs.get(id);job.priority=Math.min(job.priority,priority);return job.promise;}
  const job={id,priority};job.promise=new Promise((resolve,reject)=>{job.resolve=resolve;job.reject=reject;});this.jobs.set(id,job);this.queue.push(job);this.pump();return job.promise;
 }
 pump(){
  while(!this.disposed&&this.active<3&&this.queue.length){this.queue.sort((a,b)=>a.priority-b.priority);const job=this.queue.shift();this.active++;
   this.load(job.id).then(job.resolve,error=>{this.retryAfter.set(job.id,performance.now()+2000);job.reject(error);}).finally(()=>{this.active--;this.jobs.delete(job.id);this.pump();});}
 }
 async load(id){
  const chunk=this.index.chunks[id],response=await fetch(new URL(chunk.url,this.url));if(!response.ok)throw Error('region HTTP '+response.status);
  const cap=(limit)=>{let size=0;return new TransformStream({transform(part,out){size+=part.byteLength;if(size>limit)throw Error('region exceeds manifest size');out.enqueue(part);}});};
  const bytes=await new Response(response.body.pipeThrough(cap(chunk.bytes)).pipeThrough(new DecompressionStream('gzip')).pipeThrough(cap(chunk.decodedBytes))).arrayBuffer();
  if(bytes.byteLength!==chunk.decodedBytes)throw Error('incomplete region');if(this.disposed)return;
  // Count unique content, including HTTP-cache revisits only once. This is not
  // a wire-transfer or bandwidth meter.
  if(!this.fetched.has(id)){this.fetched.add(id);this.downloaded+=chunk.bytes;}
  let started=performance.now();
  for(const m of this.chunkMeshes[id]){if(m.resident)continue;const d=m.meta,mesh={vertices:new Float32Array(bytes,d.vertexOffset,d.vertexFloats),indices:new Uint32Array(bytes,d.indexOffset,d.indexCount),radius:d.radius};
   for(const b of m.batches)this.renderer.attachBatchMesh(b,mesh);
   m.resident=true;m.lastNeeded=performance.now();this.renderer.forceShadow=true;
   if(performance.now()-started>4){await new Promise(resolve=>requestAnimationFrame(resolve));started=performance.now();}if(this.disposed)return;
  }
  this.renderer.dirty=true;this.stats();
 }
 stats(){const loaded=this.meshes.filter(m=>m.resident),r=this.renderer;r.sceneLoad={...(r.sceneLoad||{}),compiled:true,streamed:true,meshes:this.index.batches.length,residentMeshes:loaded.length,residentGeometryBytes:loaded.reduce((sum,m)=>sum+m.meta.vertexFloats*4+m.meta.indexCount*(m.batches[0].indexType===r.gl.UNSIGNED_SHORT?2:4),0),fetchedChunks:this.fetched.size,fetchedBytes:this.downloaded,pendingChunks:this.jobs.size};}
 release(m){
  const gl=this.renderer.gl,vb=m.batches[0].vb,eb=m.batches[0].eb;
  // Delete every VAO referencing these buffers before deleting the buffers.
  for(const b of m.batches){gl.deleteVertexArray(b.vao);gl.deleteBuffer(b.ib);b.vao=b.vb=b.eb=b.ib=null;b.drawCount=0;b._uploadedData=null;}
  gl.deleteBuffer(vb);gl.deleteBuffer(eb);m.resident=false;this.renderer.forceShadow=true;
 }
 trim(keep,now){
  for(const m of this.meshes)if(keep.has(m.id))m.lastNeeded=now;
  if(now-(this.lastTrim||0)<500)return;this.lastTrim=now;
  for(const m of this.meshes)if(m.resident&&!m.pinned&&!keep.has(m.id)&&now-m.lastNeeded>5000)this.release(m);
  this.stats();
 }
 update(eye,prefetch=true){
  const now=performance.now(),ranges=prefetch?this.neededRanges(eye):null,required=ranges?ranges.required:this.needed(eye);let ready=true;
  for(const id of required){const m=this.meshes[id];if(!m.resident){ready=false;this.request(m.meta.chunk,0).catch(error=>this.failed(error));}}
  if(prefetch){
   const points=streamPreloadEyes(eye,this.lastEye,(now-this.lastTime)/1000);
   this.lastEye=eye.slice();this.lastTime=now;
   const ahead=ranges.preload,keep=ranges.keep;for(let point=1;point<points.length;point++)for(const id of this.needed(points[point],48))ahead.add(id);
   if(ready)for(const id of ahead){keep.add(id);const m=this.meshes[id];if(!m.resident)this.request(m.meta.chunk,1).catch(error=>this.failed(error));}
   this.trim(keep,now);
  }
  if(ready){this.waitStarted=0;this.status(false);}else{if(!this.waitStarted)this.waitStarted=now;if(now-this.waitStarted>250)this.status(true);}
  return ready;
 }
 failed(error){if(this.disposed)return;if(!this.lastError||performance.now()-this.lastError>5000){console.warn('Nearby ocean geometry is retrying.',error);this.lastError=performance.now();}}
 status(show){if(typeof document==='undefined')return;let el=document.getElementById('sceneStreamingStatus');if(!el&&!show)return;if(!el){el=document.createElement('div');el.id='sceneStreamingStatus';el.setAttribute('role','status');el.textContent='正在準備前方海域…';el.style.cssText='position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:9px 14px;border-radius:16px;background:#062b39dc;color:#e3efe6;font:12px sans-serif;z-index:70;pointer-events:none';document.body.append(el);}el.hidden=!show;}
 async ready(eye){
  while(!this.disposed){const ids=this.needed(eye),chunks=new Set();for(const id of ids){const m=this.meshes[id];if(!m.resident)chunks.add(m.meta.chunk);}if(!chunks.size){this.status(false);this.stats();return;}
   await Promise.all([...chunks].map(id=>this.request(id,0)));}
 }
 dispose(){this.disposed=true;for(const m of this.meshes)if(m.resident)this.release(m);for(const job of this.queue)job.resolve();this.queue.length=0;this.status(false);}
}
async function loadStreamedScene(renderer,url){
 const first=renderer.batches.length;let stream;
 try{
  const response=await fetch(url);if(!response.ok)throw Error('scene index HTTP '+response.status);const index=await response.json();
  if(index.format!=='return-blue/streamed-scene/1'||index.sourceVersion!==OPEN_WORLD.version||index.batches.length>600||index.meshes.length>600||index.nodes.length>20000||index.chunks.length>600)throw Error('unsupported regional scene');
  for(const b of index.batches)if(!index.meshes[b.meshID]||b.instanceIDs.some(id=>!index.nodes[id]))throw Error('invalid regional batch');
  for(const m of index.meshes){const c=index.chunks[m.chunk];if(!c||m.vertexOffset<0||m.indexOffset<0||m.vertexOffset%4||m.indexOffset%4||m.vertexFloats%12||m.indexCount%3||m.vertexOffset+m.vertexFloats*4>c.decodedBytes||m.indexOffset+m.indexCount*4>c.decodedBytes||!Number.isFinite(m.radius))throw Error('invalid regional mesh');}
  stream=new SceneStream(renderer,index,url);renderer.sceneStream=stream;await stream.ready(typeof eye==='undefined'?[0,-7.3,13.5]:eye);
  obstacles.push(...index.obstacles);reefPatches.push(...index.reefPatches);life.push(...index.life.map(id=>index.nodes[id]));decorLife.push(...index.decorLife.map(id=>index.nodes[id]));shoal.push(...index.shoal.map(id=>index.nodes[id]));allLife=life.concat(decorLife);diverBatch=renderer.batches[first+index.diverBatch];stream.stats();return true;
 }catch(error){stream?.dispose();renderer.batches.splice(first);renderer.sceneStream=null;console.warn('Regional scene unavailable; using the complete scene.',error);return false;}
}
