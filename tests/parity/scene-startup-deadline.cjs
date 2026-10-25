/* Full-scene startup and the shared request boundary under deterministic IO.
 * No GPU, real waiting, or production-state overrides are used. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {getEventListeners}=require('node:events');
const root=path.resolve(__dirname,'../..'),source=['scene_stream.js','scene_cache.js'].map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await new Promise(setImmediate);};
function archive(change=()=>{}){
 const header={format:'return-blue/indexed-scene/1',sourceVersion:'deadline-fixture',nodes:[{p:[0,-8,0]}],batches:[{vertexOffset:0,vertexFloats:36,indexOffset:144,indexCount:3,radius:1,instanceIDs:[0],kind:0}],obstacles:[{p:[0,-10,0],s:[1,1,1]}],reefPatches:[],life:[0],decorLife:[],shoal:[],diverBatch:0};
 change(header);
 let json=Buffer.from(JSON.stringify(header));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const prefix=Buffer.alloc(8),payload=Buffer.alloc(156);prefix.writeUInt32LE(0x35424652,0);prefix.writeUInt32LE(json.length,4);payload.writeUInt32LE(1,148);payload.writeUInt32LE(2,152);
 return zlib.gzipSync(Buffer.concat([prefix,json,payload]));
}
const packed=archive();
function fixture(network,{compression=DecompressionStream,response=Response,regional=false}={}){
 let now=1000,nextTimer=0;const timers=new Map(),requests=[],warnings=[],uploads=[];
 const renderer={batches:[],batch(geometry,instances,kind,dynamic){const batch={geometry,instances,kind,dynamic};uploads.push(batch);this.batches.push(batch);return batch;}};
 const context=vm.createContext({console:{warn:(...args)=>warnings.push(args)},performance:{now:()=>now},AbortController,Response:response,ReadableStream,TransformStream,DecompressionStream:compression,DataView,TextDecoder,Uint8Array,Uint32Array,Float32Array,
  setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>queueMicrotask(()=>fn(now)),
  WORLD:'scene.gz',...(regional?{WORLD_STREAM:'index.json'}:{}),OPEN_WORLD:{version:'deadline-fixture'},$:()=>({textContent:''}),obstacles:[],reefPatches:[],life:[],decorLife:[],shoal:[],allLife:[],diverBatch:null,
  fetch(url,options={}){const request={url:String(url),signal:options.signal,at:now};requests.push(request);return network(request);}});
 vm.runInContext(source,context,{filename:'scene-startup.js'});
 function observe(promise){const result={state:'pending'};result.promise=promise.then(value=>{result.state='resolved';result.value=value;},error=>{result.state='rejected';result.error=error;});return result;}
 async function advance(ms){const until=now+ms;await flush();for(;;){const next=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=until;await flush();}
 return {context,renderer,requests,warnings,uploads,timers,advance,jump:ms=>{now+=ms;},observe,load:()=>observe(context.loadCompiledScene(renderer)),snapshot:()=>JSON.stringify({batches:renderer.batches,sceneLoad:renderer.sceneLoad,obstacles:context.obstacles,life:context.life,decorLife:context.decorLife,shoal:context.shoal,allLife:context.allLife,diverBatch:context.diverBatch})};
}
const checks=[];async function check(name,run){try{await run();checks.push(true);console.log('PASS '+name);}catch(error){checks.push(false);console.error('FAIL '+name+': '+error.stack);}}
(async()=>{
 await check('complete-scene stalled headers release fallback at sixty seconds without waiting for fetch to honor abort',async()=>{
  const f=fixture(()=>new Promise(()=>{})),before=f.snapshot(),op=f.load();await f.advance(59999);assert.equal(op.state,'pending');await f.advance(1);
  assert.equal(op.state,'resolved','a stalled full archive must release startup to procedural fallback');assert.equal(op.value,false);assert.equal(f.requests.length,1);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);assert.equal(f.snapshot(),before);assert.equal(f.warnings.length,1);assert.match(String(f.warnings[0]),/timed out/);
 });
 await check('expired headers are rejected before reading when the deadline callback has not run',async()=>{
  let deliver,reads=0;const f=fixture(()=>new Promise(resolve=>{deliver=resolve;})),before=f.snapshot(),op=f.load();await flush();f.jump(60000);assert.equal(f.timers.size,1);assert.equal(f.requests[0].signal.aborted,false);
  deliver({ok:true,status:200,get body(){reads++;return new Response(packed).body;}});await op.promise;
  assert.equal(op.value,false,'elapsed deadline must win over late headers even before the timer callback');assert.equal(reads,0);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);assert.equal(f.snapshot(),before);assert.match(String(f.warnings[0]),/timed out/);
 });
 await check('an expired valid body cannot upload when IO finishes before the suspended deadline callback',async()=>{
  let body,reads=0;const observedResponse=class extends Response{async arrayBuffer(){const value=await super.arrayBuffer();reads++;return value;}};
  const f=fixture(()=>Promise.resolve(new Response(new ReadableStream({start(controller){body=controller;}}))),{response:observedResponse}),before=f.snapshot(),op=f.load();await flush();f.jump(60001);assert.equal(f.timers.size,1);assert.equal(f.requests[0].signal.aborted,false);
  body.enqueue(packed);body.close();await op.promise;
  assert.equal(reads,1,'valid body and decompression must finish before the deadline callback is serviced');assert.equal(op.value,false,'late body completion must release fallback without committing the scene');assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);assert.equal(f.snapshot(),before);assert.equal(f.uploads.length,0);assert.match(String(f.warnings[0]),/timed out/);
 });
 await check('valid body completion just before the elapsed deadline remains successful',async()=>{
  let body;const f=fixture(()=>Promise.resolve(new Response(new ReadableStream({start(controller){body=controller;}})))),op=f.load();await flush();f.jump(59999);assert.equal(f.timers.size,1);
  body.enqueue(packed);body.close();await op.promise;
  assert.equal(op.value,true);assert.equal(f.uploads.length,1);assert.equal(f.requests[0].signal.aborted,false);assert.equal(f.timers.size,0);assert.equal(f.warnings.length,0);
 });
 await check('body timeout releases startup and a late complete archive cannot upload or change the world',async()=>{
  let body,reads=0;const observedResponse=class extends Response{async arrayBuffer(){const value=await super.arrayBuffer();reads++;return value;}};
  const f=fixture(()=>Promise.resolve(new Response(new ReadableStream({start(controller){body=controller;}}))),{response:observedResponse}),before=f.snapshot(),op=f.load();
  await f.advance(59999);assert.equal(op.state,'pending');await f.advance(1);assert.equal(op.state,'resolved');assert.equal(op.value,false);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);assert.equal(f.snapshot(),before);
  // This transport deliberately ignores abort and delivers a valid archive late.
  body.enqueue(packed);body.close();for(let i=0;i<12;i++)await flush();assert.equal(reads,1,'the late arrayBuffer must actually finish');assert.equal(f.snapshot(),before);assert.equal(f.uploads.length,0);assert.equal(f.warnings.length,1);
 });
 await check('the complete-scene deadline includes asynchronous decompression and its late completion',async()=>{
  let release,decoding=false,reads=0;const decoded=zlib.gunzipSync(packed),compression=class{constructor(){return new TransformStream({transform(_chunk,out){out.enqueue(decoded);},flush(){decoding=true;return new Promise(resolve=>{release=resolve;});}});}},observedResponse=class extends Response{async arrayBuffer(){const value=await super.arrayBuffer();reads++;return value;}};
  const f=fixture(()=>Promise.resolve(new Response(packed)),{compression,response:observedResponse}),before=f.snapshot(),op=f.load();for(let i=0;i<6;i++)await flush();assert(decoding);assert.equal(reads,0);await f.advance(60000);
  assert.equal(op.state,'resolved');assert.equal(op.value,false);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.snapshot(),before);release();for(let i=0;i<8;i++)await flush();assert.equal(reads,1);assert.equal(f.snapshot(),before);assert.equal(f.uploads.length,0);assert.equal(f.timers.size,0);
 });
 await check('a valid full archive can stream beyond twelve seconds and completes once without a later abort',async()=>{
  let body,archiveReads=0;const f=fixture(()=>Promise.resolve({ok:true,status:200,body:new ReadableStream({start(controller){body=controller;}}),arrayBuffer(){archiveReads++;throw Error('compressed archive must remain streamed');}})),op=f.load();
  await f.advance(12001);assert.equal(op.state,'pending');assert.equal(f.requests[0].signal.aborted,false);const split=Math.floor(packed.length/2);body.enqueue(packed.subarray(0,split));await f.advance(10000);assert.equal(op.state,'pending');body.enqueue(packed.subarray(split));body.close();await op.promise;
  assert.equal(op.value,true);assert.equal(archiveReads,0);assert.equal(f.uploads.length,1);assert.equal(f.context.life.length,1);assert.equal(f.context.obstacles.length,1);assert.equal(f.context.life[0],f.uploads[0].instances[0]);assert.deepEqual(Array.from(f.uploads[0].geometry.indexed.indices),[0,1,2]);assert.equal(f.renderer.sceneLoad.compiled,true);assert.equal(f.timers.size,0);assert.equal(f.warnings.length,0);
  const after=f.snapshot();await f.advance(60000);assert.equal(f.snapshot(),after);assert.equal(f.requests[0].signal.aborted,false);
 });
 await check('parent cancellation settles header and body waits and removes its deadline and abort listener',async()=>{
  for(const phase of ['headers','body']){
   const f=fixture(()=>phase==='headers'?new Promise(()=>{}):Promise.resolve(new Response(new ReadableStream({})))),parent=new AbortController();
   const op=f.observe(f.context.fetchSceneData('request.gz',response=>response.arrayBuffer(),parent.signal,60000));await flush();assert.equal(getEventListeners(parent.signal,'abort').length,1);parent.abort();await flush();
   assert.equal(op.state,'rejected',phase);assert.match(op.error.message,/cancelled/);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);assert.equal(getEventListeners(parent.signal,'abort').length,0);await f.advance(60000);assert.equal(f.requests.length,1);
  }
 });
 await check('default regional requests retain their twelve-second budget',async()=>{
  const f=fixture(()=>new Promise(()=>{})),op=f.observe(f.context.fetchSceneData('region.gz',response=>response.arrayBuffer()));await f.advance(11999);assert.equal(op.state,'pending');await f.advance(1);
  assert.equal(op.state,'rejected');assert.match(op.error.message,/timed out/);assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.timers.size,0);
 });
 await check('a timed-out regional index falls through to the independent full-scene budget',async()=>{
  const f=fixture(()=>new Promise(()=>{}),{regional:true}),before=f.snapshot(),op=f.load();await f.advance(11999);assert.equal(f.requests.length,1);await f.advance(1);
  assert.equal(f.requests.length,2);assert.equal(f.requests[0].url,'index.json');assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.requests[1].url,'scene.gz');assert.equal(f.requests[1].at,13000);assert.equal(f.requests[1].signal.aborted,false);
  await f.advance(59999);assert.equal(op.state,'pending');await f.advance(1);assert.equal(op.state,'resolved');assert.equal(op.value,false);assert.equal(f.requests[1].signal.aborted,true);assert.equal(f.snapshot(),before);assert.equal(f.timers.size,0);assert.equal(f.warnings.length,2);
 });
 await check('late response headers cannot upload their archive after fallback has already started',async()=>{
  let deliver;const f=fixture(()=>new Promise(resolve=>{deliver=resolve;})),before=f.snapshot(),op=f.load();await f.advance(60000);assert.equal(op.value,false);deliver(new Response(packed));for(let i=0;i<12;i++)await flush();assert.equal(op.value,false);assert.equal(f.snapshot(),before);assert.equal(f.uploads.length,0);assert.equal(f.warnings.length,1);
 });
 await check('all mesh ranges and instance references are validated before the first upload',async()=>{
  for(const change of [b=>{b.vertexOffset=1;},b=>{b.instanceIDs=[99];}]){
   const bad=archive(header=>{const second=JSON.parse(JSON.stringify(header.batches[0]));change(second);header.batches.push(second);}),f=fixture(()=>Promise.resolve(new Response(bad))),before=f.snapshot(),op=f.load();await op.promise;
   assert.equal(op.value,false);assert.equal(f.uploads.length,0);assert.equal(f.snapshot(),before);assert.equal(f.timers.size,0);assert.equal(f.warnings.length,1);assert.match(String(f.warnings[0]),/invalid (mesh range|instance reference)/);
  }
 });
 console.log(`${checks.filter(Boolean).length}/${checks.length} scene startup deadline checks passed`);if(checks.includes(false))process.exitCode=1;
})();
