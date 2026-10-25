/* Run the production regional loader against a deterministic network clock.
 * Fetch, renderer uploads and timers are boundaries; no WebGL/GPU is used. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {getEventListeners}=require('node:events');
const source=fs.readFileSync('src/scene_stream.js','utf8');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await new Promise(setImmediate);};
function fixture(network,{positions=[[0,0,0]],meshesPerChunk=1,uploadMilliseconds=0}={}){
 let now=1000,nextTimer=1,catchCalls=0,cancelledFrames=0;const timers=new Map(),frames=new Set(),requests=[],uploads=[];
 class ObservedPromise extends Promise{catch(...args){catchCalls++;return super.catch(...args);}}
 const schedule=(fn,delay=0)=>{const id=nextTimer++;timers.set(id,{at:now+Math.max(0,Number(delay)||0),fn});return id;};
 const raw=Buffer.alloc(156);new Uint32Array(raw.buffer,raw.byteOffset+144,3).set([0,1,2]);const compressed=zlib.gzipSync(raw);
 const index={meshes:[],chunks:positions.map((_,id)=>({url:'region-'+id+'.gz',bytes:compressed.length,decodedBytes:raw.length})),nodes:positions.map(p=>({p})),batches:[]};
 for(let chunk=0;chunk<positions.length;chunk++)for(let copy=0;copy<meshesPerChunk;copy++){const meshID=index.meshes.length;index.meshes.push({chunk,vertexOffset:0,vertexFloats:36,indexOffset:144,indexCount:3,radius:1});index.batches.push({meshID,instanceIDs:[chunk],visible:true,shadow:false,dynamic:false,kind:0,maxDistance:10});}
 const renderer={mobile:false,quality:2,batches:[],gl:{UNSIGNED_SHORT:5123,deleteBuffer(){},deleteVertexArray(){}},deferredBatch(meta,instances){const b={...meta,instances,visible:meta.visible!==false,drawCount:0,indexType:5123};this.batches.push(b);return b;},attachBatchMesh(batch,mesh){batch.mesh=mesh;batch.drawCount=mesh.indices.length;uploads.push(batch);now+=uploadMilliseconds;}};
 const fetch=(url,options={})=>{const request={url:String(url),id:Number(String(url).match(/region-(\d+)/)?.[1]),signal:options.signal,at:now};requests.push(request);return network(request,{compressed,Response,ReadableStream});};
 const context=vm.createContext({console:{warn(){}},performance:{now:()=>now},location:{href:'https://example.test/Ocean/'},URL,fetch,Response,TransformStream,DecompressionStream,ReadableStream,AbortController,DOMException,Promise:ObservedPromise,setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){const id=schedule(()=>{frames.delete(id);fn();},16);frames.add(id);return id;},cancelAnimationFrame(id){if(frames.delete(id))cancelledFrames++;timers.delete(id);}});
 vm.runInContext(source,context,{filename:'scene_stream.js'});const SceneStream=vm.runInContext('SceneStream',context),stream=new SceneStream(renderer,index,'assets/scene/index.json');
 async function advance(milliseconds){const until=now+milliseconds;await flush();for(;;){const due=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=Math.max(now,until);await flush();}
 return {stream,renderer,requests,uploads,advance,get catchCalls(){return catchCalls;},get pendingFrames(){return frames.size;},get cancelledFrames(){return cancelledFrames;}};
}
function hangingHeaders(request){return new Promise((resolve,reject)=>{request.signal?.addEventListener('abort',()=>reject(request.signal.reason||new DOMException('aborted','AbortError')),{once:true});});}
const successful=(_request,{compressed})=>Promise.resolve(new Response(compressed));
async function drain(){for(let i=0;i<8;i++)await flush();}
const checks=[];
async function check(name,run){try{await run();checks.push(true);console.log('PASS '+name);}catch(error){checks.push(false);console.error('FAIL '+name+': '+error.message);}}
(async()=>{
 await check('initial readiness rejects stalled response headers after the 12 second deadline',async()=>{
  const f=fixture(hangingHeaders);let outcome='pending';const ready=f.stream.ready([0,0,0]).then(()=>{outcome='resolved';},()=>{outcome='rejected';});
  await f.advance(11999);assert.equal(outcome,'pending');
  await f.advance(2);assert.equal(outcome,'rejected','A stalled region must release readiness instead of waiting forever');
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].signal.aborted,true);
  f.stream.dispose();await ready;
 });
 await check('response headers cannot hide a stalled body from the same deadline',async()=>{
  // Deliberately never settle this adapter on abort: the loader's deadline must
  // release its own readiness/job even for an uncooperative body reader.
  const f=fixture(()=>Promise.resolve(new Response(new ReadableStream({start(){}}))));let outcome='pending';
  const ready=f.stream.ready([0,0,0]).then(()=>{outcome='resolved';},()=>{outcome='rejected';});
  await f.advance(11999);assert.equal(outcome,'pending');
  await f.advance(2);assert.equal(outcome,'rejected');assert.equal(f.requests[0].signal.aborted,true);
  f.stream.stats();assert.equal(f.renderer.sceneLoad.pendingChunks,0);assert.equal(f.uploads.length,0);
  f.stream.dispose();await ready;
 });
 await check('timed out fetches release concurrency for another queued region',async()=>{
  const f=fixture((request,context)=>request.id<3?hangingHeaders(request):successful(request,context),{positions:[[0,0,0],[0,0,1],[0,0,2],[0,0,3]]});
  const ready=f.stream.ready([0,0,0]).catch(()=>{});await flush();assert.equal(f.requests.length,3);
  await f.advance(12001);await drain();
  assert.equal(f.requests.length,4,'The fourth region must get a released request slot');
  assert.equal(f.requests[3].at,13000);assert.equal(f.uploads.length,1);
  assert.equal(f.renderer.batches[3].drawCount,3);assert.equal(f.requests.slice(0,3).every(request=>request.signal.aborted),true);
  f.stream.stats();assert.equal(f.renderer.sceneLoad.pendingChunks,0);f.stream.dispose();await ready;
 });
 await check('404 retries wait two seconds and stop automatically after three attempts',async()=>{
  const f=fixture(()=>Promise.resolve(new Response('',{status:404})));
  assert.equal(f.stream.update([0,0,0],false),false);await flush();assert.equal(f.requests.length,1);
  await f.advance(1999);f.stream.update([0,0,0],false);await flush();assert.equal(f.requests.length,1);
  await f.advance(1);f.stream.update([0,0,0],false);await flush();assert.equal(f.requests.length,2);
  await f.advance(2000);f.stream.update([0,0,0],false);await flush();assert.equal(f.requests.length,3);
  for(let frame=0;frame<300;frame++){await f.advance(100);assert.equal(f.stream.update([0,0,0],false),false);}
  assert.equal(f.requests.length,3,'A permanent 404 must not retry forever');
  assert.deepEqual(f.requests.map(request=>request.at),[1000,3000,5000]);
  f.stream.stats();assert.equal(f.renderer.sceneLoad.pendingChunks,0);f.stream.dispose();
 });
 await check('explicit retry restores only the required region without resetting distant failure budgets',async()=>{
  let online=false;const f=fixture((request,context)=>online?successful(request,context):Promise.resolve(new Response('',{status:404})),{positions:[[0,0,0],[200,0,0]]});
  async function exhaust(eye){f.stream.update(eye,false);await flush();for(let retry=0;retry<2;retry++){await f.advance(2000);f.stream.update(eye,false);await flush();}}
  await exhaust([0,0,0]);await exhaust([200,0,0]);assert.equal(f.requests.length,6);
  f.stream.update([0,0,0],false);online=true;f.stream.retry();await drain();
  assert.equal(f.requests.length,7);assert.equal(f.requests[6].id,0);assert.equal(f.stream.update([0,0,0],false),true);
  f.stream.retry();await flush();assert.equal(f.requests.length,7,'Retry with no missing required region must do nothing');
  await f.advance(2000);assert.equal(f.stream.update([200,0,0],false),false);await flush();
  assert.equal(f.requests.length,7,'The distant failed region still needs its own explicit retry');
  f.stream.retry();await drain();assert.equal(f.requests.length,8);assert.equal(f.requests[7].id,1);
  assert.equal(f.stream.update([200,0,0],false),true);f.stream.dispose();
 });
 await check('waiting for a failed nearby region keeps already uploaded geometry intact',async()=>{
  const f=fixture((request,context)=>request.id===0?successful(request,context):Promise.resolve(new Response('',{status:404})),{positions:[[0,0,0],[25,0,0]]});
  await f.stream.ready([0,0,0]);const visible=f.renderer.batches[0],mesh=visible.mesh;
  for(let frame=0;frame<120;frame++){assert.equal(f.stream.update([25,0,0]),false);await f.advance(100);assert.equal(visible.drawCount,3);assert.equal(visible.mesh,mesh);}
  assert.equal(f.requests.filter(request=>request.id===1).length,3);assert.equal(f.uploads.length,1);
  assert.equal(f.stream.update([0,0,0],false),true,'Returning to resident scenery must not need a successful new fetch');f.stream.dispose();
 });
 await check('dispose aborts active transfers, rejects readiness, drains queued work and releases geometry',async()=>{
  const f=fixture((request,context)=>request.id===0?successful(request,context):hangingHeaders(request),{positions:[[0,0,0],[200,0,0],[200,0,1],[200,0,2],[200,0,3]]});
  await f.stream.ready([0,0,0]);assert.equal(f.uploads.length,1);let outcome='pending';
  const ready=f.stream.ready([200,0,0]).then(()=>{outcome='resolved';},()=>{outcome='rejected';});await flush();
  assert.equal(f.requests.length,4);f.stream.dispose();await drain();
  assert.equal(outcome,'rejected');assert.equal(f.requests.slice(1).every(request=>request.signal.aborted),true);
  assert.equal(f.renderer.batches[0].drawCount,0);f.stream.stats();assert.equal(f.renderer.sceneLoad.pendingChunks,0);
  await f.advance(30000);f.stream.update([200,0,0],false);f.stream.retry();await flush();
  assert.equal(f.requests.length,4,'Neither queued work nor future updates may start fetches after disposal');await ready;
 });
 await check('dispose cancels a post-download upload yield without needing another animation frame',async()=>{
  const f=fixture(successful,{meshesPerChunk:3,uploadMilliseconds:5});let outcome='pending';
  const ready=f.stream.ready([0,0,0]).then(()=>{outcome='resolved';},()=>{outcome='rejected';});await drain();
  const signal=f.stream.jobs.get(0).controller.signal;
  assert.equal(f.uploads.length,1);assert.equal(f.pendingFrames,1);assert.equal(outcome,'pending');
  f.stream.dispose();await drain();
  assert.equal(outcome,'rejected','Disposal must settle readiness while a hidden document supplies no RAF');
  assert.equal(f.pendingFrames,0);assert.equal(f.cancelledFrames,1);assert.equal(getEventListeners(signal,'abort').length,0);
  assert.equal(f.stream.active,0);assert.equal(f.stream.jobs.size,0);assert.equal(f.renderer.batches[0].drawCount,0);
  await f.advance(30000);assert.equal(f.uploads.length,1,'No canceled upload may resume later');
  await assert.rejects(f.stream.ready([0,0,0]),/disposed/);await ready;
 });
 await check('completed upload yields release cancellation listeners and finish normally',async()=>{
  const f=fixture(successful,{meshesPerChunk:3,uploadMilliseconds:5});let outcome='pending';
  const ready=f.stream.ready([0,0,0]).then(()=>{outcome='resolved';});await drain();
  const signal=f.stream.jobs.get(0).controller.signal;assert.equal(f.pendingFrames,1);
  await f.advance(64);assert.equal(outcome,'resolved');assert.equal(f.uploads.length,3);
  assert.equal(f.pendingFrames,0);assert.equal(f.cancelledFrames,0);assert.equal(getEventListeners(signal,'abort').length,0);
  assert.equal(f.stream.active,0);assert.equal(f.stream.jobs.size,0);f.stream.dispose();await ready;
 });
 await check('dispose at a completed chunk handoff cannot report readiness success',async()=>{
  const f=fixture(successful);const chunk=f.stream.request(0);chunk.then(()=>f.stream.dispose());
  let outcome='pending';const ready=f.stream.ready([0,0,0]).then(()=>{outcome='resolved';},()=>{outcome='rejected';});await drain();
  assert.equal(f.uploads.length,1);assert.equal(outcome,'rejected');assert.equal(f.stream.jobs.size,0);await ready;
 });
 await check('thousands of pending frames share one request observer for meshes in the same chunk',async()=>{
  const f=fixture(hangingHeaders,{meshesPerChunk:4});f.stream.update([0,0,0],false);const initial=f.catchCalls;
  for(let frame=0;frame<1000;frame++)assert.equal(f.stream.update([0,0,0],false),false);
  assert.equal(f.requests.length,1);assert(initial<=1,'A shared chunk needs at most one rejection observer');
  assert.equal(f.catchCalls,initial,'Waiting frames must not retain new catch callbacks on the pending promise');
  f.stream.dispose();await flush();
 });
 console.log(`${checks.filter(Boolean).length}/${checks.length} scene stream recovery checks passed`);if(checks.includes(false))process.exitCode=1;
})();
