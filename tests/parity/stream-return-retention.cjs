/* Public SceneStream readiness/update with real compressed response bytes and a
 * CPU upload adapter. Long pauses are simulated; this does not exercise a GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/scene_stream.js'),'utf8');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await new Promise(setImmediate);};
const drain=async()=>{for(let i=0;i<8;i++)await flush();};
function fixture(){
 let now=1000,nextTimer=1,online=false;const timers=new Map(),requests=[],uploads=[],released=[];
 const schedule=(fn,delay=0)=>{const id=nextTimer++;timers.set(id,{at:now+delay,fn});return id;};
 const raw=Buffer.alloc(156);new Uint32Array(raw.buffer,raw.byteOffset+144,3).set([0,1,2]);const compressed=zlib.gzipSync(raw);
 const positions=[[0,0,0],[50,0,0],[400,0,0]],index={nodes:positions.map(p=>({p})),meshes:[],chunks:[],batches:[]};
 for(let id=0;id<positions.length;id++){
  index.chunks.push({url:'region-'+id+'.gz',bytes:compressed.length,decodedBytes:raw.length});
  index.meshes.push({chunk:id,vertexOffset:0,vertexFloats:36,indexOffset:144,indexCount:3,radius:1});
  index.batches.push({meshID:id,instanceIDs:[id],visible:true,shadow:false,dynamic:false,kind:0,maxDistance:10});
 }
 const renderer={mobile:false,quality:2,batches:[],gl:{UNSIGNED_SHORT:5123,deleteBuffer(resource){if(resource)released.push(resource);},deleteVertexArray(){}},
  deferredBatch(meta,instances){const batch={...meta,instances,indexType:5123,drawCount:0};this.batches.push(batch);return batch;},
  attachBatchMesh(batch,mesh){batch.vb={id:batch.meshID,type:'vertex'};batch.eb={id:batch.meshID,type:'index'};batch.vao={};batch.ib={};batch.drawCount=mesh.indices.length;uploads.push(batch.meshID);}
 };
 const context=vm.createContext({console:{warn(){}},performance:{now:()=>now},location:{href:'https://example.test/Ocean/'},URL,Response,TransformStream,DecompressionStream,AbortController,
  fetch(url){const id=Number(String(url).match(/region-(\d+)/)[1]);requests.push(id);return Promise.resolve(id===2&&!online?new Response('',{status:404}):new Response(compressed));},
  setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>timers.delete(id)
 });
 vm.runInContext(source,context,{filename:'scene_stream.js'});const SceneStream=vm.runInContext('SceneStream',context),stream=new SceneStream(renderer,index,'assets/scene/index.json');
 async function advance(ms){const until=now+ms;await flush();for(;;){const due=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=until;await flush();}
 async function start(){await stream.ready(positions[0]);assert.equal(stream.update(positions[0]),true);await drain();assert.deepEqual(uploads,[0,1],'The home view and its nearby prefetch must have real uploaded bytes');}
 return {stream,renderer,requests,uploads,released,advance,start,online(){online=true;}};
}
const checks=[];
async function check(name,run){try{await run();checks.push(true);console.log('PASS '+name);}catch(error){checks.push(false);console.error('FAIL '+name+': '+error.stack);}}
(async()=>{
 await check('a failed camera cut after a long pause preserves return geometry without retaining unrelated prefetch',async()=>{
  const f=fixture();try{
   await f.start();const homeBuffer=f.renderer.batches[0].vb;await f.advance(30000);
   assert.equal(f.stream.update([400,0,0]),false);await drain();
   assert.equal(f.renderer.batches[0].drawCount,3,'The last complete view must survive an already-expired eviction age');
   assert.equal(f.renderer.batches[0].vb,homeBuffer);assert(!f.released.includes(homeBuffer));
   assert.equal(f.renderer.batches[1].drawCount,0,'Old unrelated prefetch must still be evicted');
   for(let i=0;i<6;i++){await f.advance(10000);assert.equal(f.stream.update([400,0,0]),false);await drain();}
   assert.equal(f.requests.filter(id=>id===2).length,3,'The exhausted region remains bounded while return stays available');
   const requestsBeforeReturn=f.requests.length;
   assert.equal(f.stream.update([0,0,0],false),true,'Returning must work without a successful replacement request');
   await drain();assert.equal(f.requests.length,requestsBeforeReturn);assert.equal(f.renderer.batches[0].vb,homeBuffer);
  }finally{f.stream.dispose();await drain();}
 });
 await check('successful arrival releases the old return geometry instead of pinning historical regions',async()=>{
  const f=fixture();try{
   await f.start();const homeBuffer=f.renderer.batches[0].vb;await f.advance(30000);
   assert.equal(f.stream.update([400,0,0]),false);await drain();
   f.online();f.stream.retry();await drain();assert.equal(f.stream.update([400,0,0]),true);
   await f.advance(6001);assert.equal(f.stream.update([400,0,0]),true);
   assert.equal(f.renderer.batches[2].drawCount,3);assert.equal(f.renderer.batches[0].drawCount,0);
   assert(f.released.includes(homeBuffer),'Only the current successful view should remain protected');
  }finally{f.stream.dispose();await drain();}
 });
 console.log(`${checks.filter(Boolean).length}/${checks.length} stream return retention checks passed`);if(checks.includes(false))process.exitCode=1;
})();
