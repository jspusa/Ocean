/* Actual streamed -> complete-scene startup path under deterministic fake IO.
 * A transient nearby chunk must not load the entire world or discard an already
 * uploaded region. CPU-only: no WebGL, browser, rendered FPS or device claim.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {getEventListeners}=require('node:events');
const root=path.resolve(__dirname,'../..'),source=['engine.js','scene_stream.js','scene_cache.js'].map(name=>fs.readFileSync(path.join(root,'src',name),'utf8')).join('\n');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await new Promise(setImmediate);};
function fixture({indexFailures=0,chunkFailures=1,status=503,networkError=false,invalidIndex=false,invalidChunk=false,uploadError=false,timeout=false}={}){
 let now=1000,timerID=0,indexRequests=0,chunkOneRequests=0,firstUpload,firstFailure;
 const uploaded=new Promise(resolve=>{firstUpload=resolve;}),failed=new Promise(resolve=>{firstFailure=resolve;}),timers=new Map(),requests=[],warnings=[],uploads=[],deleted=[];
 const raw=Buffer.alloc(156);new Float32Array(raw.buffer,raw.byteOffset,36).set([0,0,0,0,0,1,.5,.6,.7,0,0,0,1,0,0,0,0,1,.5,.6,.7,1,0,0,0,1,0,0,0,1,.5,.6,.7,0,1,0]);new Uint32Array(raw.buffer,raw.byteOffset+144,3).set([0,1,2]);
 const compressed=zlib.gzipSync(raw),nodes=[[0,-8,0],[5,-8,0],[1000,-8,0]].map(p=>({p})),batches=nodes.map((_,i)=>({meshID:i,instanceIDs:[i],visible:true,shadow:false,dynamic:false,kind:0,material:1,species:-1,maxDistance:10}));
 const index={format:'return-blue/streamed-scene/1',sourceVersion:'startup-retry-fixture',nodes,batches,meshes:nodes.map((_,chunk)=>({chunk,vertexOffset:0,vertexFloats:36,indexOffset:144,indexCount:3,radius:1})),chunks:nodes.map((_,i)=>({url:'chunk-'+i+'.gz',bytes:compressed.length,decodedBytes:raw.length})),obstacles:[],reefPatches:[],life:[0],decorLife:[],shoal:[],diverBatch:0};
 const fullHeader={...index,format:'return-blue/indexed-scene/1',batches:batches.map(({meshID,...b},i)=>({...b,vertexOffset:i*156,vertexFloats:36,indexOffset:i*156+144,indexCount:3,radius:1}))};delete fullHeader.meshes;delete fullHeader.chunks;
 let json=Buffer.from(JSON.stringify(fullHeader));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const prefix=Buffer.alloc(8);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(json.length,4);const full=zlib.gzipSync(Buffer.concat([prefix,json,raw,raw,raw]));
 const renderer={mobile:true,quality:1,batches:[],gl:{UNSIGNED_SHORT:5123,deleteBuffer:v=>deleted.push(v),deleteVertexArray:v=>deleted.push(v)},deferredBatch(meta,instances){const batch={...meta,instances,indexType:5123,drawCount:0};this.batches.push(batch);return batch;},attachBatchMesh(batch,mesh){if(uploadError&&batch===this.batches[1])throw new TypeError('fixture upload failure');batch.mesh=mesh;batch.drawCount=mesh.indices.length;batch.vb={};batch.eb={};batch.ib={};batch.vao={};uploads.push(batch);if(batch===this.batches[0])firstUpload();},batch(geometry,instances,kind,dynamic){const batch={geometry,instances,kind,dynamic};this.batches.push(batch);uploads.push(batch);return batch;}};
 const failure=()=>{firstFailure();if(networkError)throw new TypeError('fixture network failure');return new Response('',{status});};
 const context=vm.createContext({console:{warn:(...args)=>warnings.push(args)},performance:{now:()=>now},location:{href:'https://example.test/Ocean/'},URL,AbortController,Response,ReadableStream,TransformStream,DecompressionStream,DataView,TextDecoder,Uint8Array,Uint32Array,Float32Array,
  setTimeout(fn,delay){const id=++timerID;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>queueMicrotask(()=>fn(now)),cancelAnimationFrame(){},
  WORLD_STREAM:'assets/scene/index.json',WORLD:'assets/reef.mesh.gz',OPEN_WORLD:{version:index.sourceVersion},eye:[0,-8,0],document:{getElementById:id=>id==='loadDetail'?{textContent:''}:null},obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],allLife:[],diverBatch:null,
  fetch(url,options={}){const pathname=new URL(String(url),'https://example.test/Ocean/').pathname;requests.push({url:pathname,signal:options.signal,at:now});
   if(pathname.endsWith('/index.json')){indexRequests++;if(indexRequests<=indexFailures)return Promise.resolve().then(failure);return Promise.resolve(new Response(invalidIndex==='json'?'{':JSON.stringify(invalidIndex?{...index,format:'invalid'}:index),{headers:{'Content-Type':'application/json'}}));}
   if(pathname.endsWith('/reef.mesh.gz'))return Promise.resolve(new Response(full));
   if(pathname.endsWith('/chunk-0.gz'))return Promise.resolve(new Response(compressed));
   if(pathname.endsWith('/chunk-1.gz')){chunkOneRequests++;if(timeout)return uploaded.then(()=>{firstFailure();return new Promise(()=>{});});if(chunkOneRequests<=chunkFailures)return uploaded.then(failure);if(invalidChunk)return uploaded.then(()=>new Response(invalidChunk==='size'?zlib.gzipSync(raw.subarray(0,100)):Buffer.from('not gzip')));return Promise.resolve(new Response(compressed));}
   throw Error('Startup must not request the distant chunk: '+pathname);
  }});
 vm.runInContext(source,context,{filename:'actual-scene-startup.js'});
 async function advance(ms){const until=now+ms;await flush();for(;;){const due=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=until;await flush();}
 return {context,renderer,requests,warnings,uploads,deleted,timers,failed,advance,get now(){return now;}};
}
const count=(f,suffix)=>f.requests.filter(r=>r.url.endsWith(suffix)).length;
function load(f){const op={state:'pending'};op.promise=f.context.loadCompiledScene(f.renderer).then(value=>{op.state='resolved';op.value=value;},error=>{op.state='rejected';op.error=error;});return op;}
async function done(op){await op.promise;if(op.error)throw op.error;assert.equal(op.value,true,'Startup should recover a usable compiled scene');}
function regional(f){
 assert.equal(f.renderer.sceneLoad.streamed,true,'RED: one transient nearby chunk HTTP503 must recover regional startup');
 assert.equal(count(f,'/reef.mesh.gz'),0,'Transient regional failure must not fetch/buffer the whole world');assert.equal(count(f,'/chunk-0.gz'),1,'The uploaded healthy region must not download again');
 assert.equal(f.deleted.length,0,'Recovery must not roll back already uploaded geometry');assert.equal(f.uploads.length,2);assert.equal(f.renderer.batches.length,3);assert.equal(f.context.life.length,1);assert.equal(f.context.life[0],f.renderer.batches[0].instances[0]);assert.equal(f.renderer.batches[2].drawCount,0,'Distant geometry remains deferred');assert.equal(f.timers.size,0);
}
let checks=0,failedChecks=0;async function check(name,run){try{await run();checks++;console.log('PASS '+name);}catch(error){failedChecks++;console.error('FAIL '+name+'\n'+error.stack);}}
(async()=>{
 await check('one startup chunk HTTP503 retries after 2s without replacing partial geometry or requesting the whole world',async()=>{
  const f=fixture(),op=load(f);await f.failed;await flush();const stream=f.renderer.sceneStream,healthy=f.renderer.batches[0],mesh=healthy.mesh,job=stream.jobs.get(1);
  assert.equal(stream.request(1),job.promise,'Other callers coalesce with the same startup job during backoff');assert.equal(getEventListeners(job.controller.signal,'abort').length,1);await f.advance(1999);assert.equal(count(f,'/chunk-1.gz'),1);assert.equal(healthy.mesh,mesh);await f.advance(1);await done(op);regional(f);
  assert.equal(count(f,'/chunk-1.gz'),2);assert.equal(healthy.mesh,mesh);assert.deepEqual(f.requests.filter(r=>r.url.endsWith('/chunk-1.gz')).map(r=>r.at),[1000,3000]);assert.equal(getEventListeners(job.controller.signal,'abort').length,0);await flush();assert.equal(stream.jobs.size,0);assert.equal(stream.active,0);
 });
 await check('transient index HTTP503 retries before constructing regional batches or fetching the complete scene',async()=>{
  const f=fixture({indexFailures:1,chunkFailures:0}),op=load(f);await f.failed;await flush();assert.equal(f.renderer.batches.length,0);await f.advance(1999);assert.equal(count(f,'/index.json'),1);await f.advance(1);await done(op);regional(f);assert.equal(count(f,'/index.json'),2);assert.equal(count(f,'/chunk-1.gz'),1);
 });
 await check('HTTP408,429,500,599 and fetch TypeError recover while preserving transport error messages',async()=>{
  for(const options of [{status:408},{status:429},{status:500},{status:599},{networkError:true}]){const f=fixture(options),op=load(f);await f.failed;await flush();await f.advance(2000);await done(op);regional(f);assert.equal(count(f,'/chunk-1.gz'),2);}
  for(const networkError of [false,true]){const f=fixture({indexFailures:Infinity,networkError});await assert.rejects(f.context.fetchSceneData('assets/scene/index.json',response=>response.json()),error=>networkError?error.code==='OCEAN_SCENE_NETWORK'&&error.message==='fixture network failure'&&error.cause.name==='TypeError':error.code==='OCEAN_SCENE_HTTP'&&error.status===503&&error.message==='region HTTP 503');assert.equal(f.timers.size,0);}
 });
 await check('permanent transient chunk failures stop after exactly 3 attempts then clean up before fallback',async()=>{
  const f=fixture({chunkFailures:Infinity}),op=load(f);await f.failed;await flush();await f.advance(2000);await f.advance(2000);await done(op);assert.equal(count(f,'/chunk-1.gz'),3);assert.equal(count(f,'/chunk-0.gz'),1);assert.equal(count(f,'/reef.mesh.gz'),1);assert.equal(f.deleted.length,4);assert.equal(f.renderer.sceneStream,null);assert.equal(f.renderer.sceneLoad.streamed,undefined);assert.equal(f.timers.size,0);await f.advance(60000);assert.equal(count(f,'/chunk-1.gz'),3);
 });
 await check('permanent transient index failures stop after 3 attempts without requesting any region',async()=>{
  const f=fixture({indexFailures:Infinity,chunkFailures:0}),op=load(f);await f.failed;await flush();await f.advance(4000);await done(op);assert.equal(count(f,'/index.json'),3);assert.equal(count(f,'/reef.mesh.gz'),1);assert.equal(count(f,'/chunk-0.gz')+count(f,'/chunk-1.gz'),0);assert.equal(f.timers.size,0);
 });
 await check('404, invalid manifests, corrupt chunks and upload TypeErrors fall back promptly without retries',async()=>{
  for(const options of [{indexFailures:Infinity,chunkFailures:0,status:404},{invalidIndex:true,chunkFailures:0},{invalidIndex:'json',chunkFailures:0},{invalidChunk:true,chunkFailures:0},{invalidChunk:'size',chunkFailures:0},{uploadError:true,chunkFailures:0}]){const f=fixture(options),op=load(f);await done(op);assert.equal(count(f,'/index.json'),1);assert.equal(count(f,'/reef.mesh.gz'),1);assert(count(f,'/chunk-1.gz')<=1);assert.equal(f.now,1000,'Nontransient failures must not spend a retry backoff');assert.equal(f.timers.size,0);}
 });
 await check('a stalled startup chunk keeps its existing 12s deadline and falls back without retrying timeouts',async()=>{
  const f=fixture({timeout:true,chunkFailures:0}),op=load(f);await f.failed;await flush();await f.advance(11999);assert.equal(op.state,'pending');await f.advance(1);await done(op);assert.equal(count(f,'/chunk-1.gz'),1);assert.equal(count(f,'/reef.mesh.gz'),1);assert.equal(f.requests.find(r=>r.url.endsWith('/chunk-1.gz')).signal.aborted,true);assert.equal(f.timers.size,0);
 });
 await check('disposal during retry backoff cancels startup without later retries, uploads or full-world fallback',async()=>{
  const f=fixture(),op=load(f);await f.failed;await flush();const stream=f.renderer.sceneStream,job=stream.jobs.get(1);assert.equal(f.uploads.length,1);stream.dispose();await op.promise;assert.equal(op.state,'rejected');assert.match(op.error.message,/cancelled|disposed/);await flush();await f.advance(60000);assert.equal(count(f,'/chunk-1.gz'),1);assert.equal(count(f,'/reef.mesh.gz'),0);assert.equal(f.uploads.length,1);assert.equal(f.renderer.batches.length,0);assert.equal(stream.active,0);assert.equal(stream.jobs.size,0);assert.equal(f.timers.size,0);assert.equal(getEventListeners(job.controller.signal,'abort').length,0);
 });
 console.log(`${checks}/${checks+failedChecks} scene startup retry checks passed`);if(failedChecks)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
