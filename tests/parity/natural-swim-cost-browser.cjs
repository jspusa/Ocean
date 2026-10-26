/* Normal-input CPU/submission diagnosis. Run alone on native Chrome.
 * No injected time/pose/quality, forced stream residency or pixels; GPU elapsed queries are opt-in.
 * --mode=light is a collection-overhead control, not a fixed-workload A/B.
 * --checkpoints=final avoids bulk collection during both swimming legs.
 * --trace=PATH optionally records the outbound leg; it is not an FPS test.
 * --gpu=elapsed wraps each actual render, requires final checkpoints/no trace.
 * --gpu-scope=opaque selects only the observed sky-to-water opaque interval.
 * Scope timings may shift tile work; never add them or call them exclusive costs.
 * Acceptance: every attempt has a submission identity; only completed renders
 * with available, non-disjoint results enter GPU summaries. Pending/deferred/
 * invalid/overflow retain identities. Cleanup deletes only owned query objects. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const option=(key,fallback)=>process.argv.find(v=>v.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const root=path.resolve(__dirname,'../..'),url=option('url','http://127.0.0.1:8765/'),profile=option('profile','desktop'),mode=option('mode','full'),checkpointMode=option('checkpoints','final'),gpuMode=option('gpu','off'),gpuScope=option('gpu-scope','full');
const output=path.resolve(option('out','/tmp/ocean-natural-swim-'+profile+'-'+mode+'-'+checkpointMode+(gpuMode==='off'?'':'-gpu')+(gpuScope==='full'?'':'-opaque')+'.json'));
const tracePath=option('trace','')?path.resolve(option('trace','')):null;
assert(['desktop','touch'].includes(profile));assert(['full','light'].includes(mode));assert(['final','periodic'].includes(checkpointMode));assert(!new URL(url).searchParams.has('still'),'Frozen scenes cannot diagnose natural swimming');
assert(['off','elapsed'].includes(gpuMode),'Use --gpu=off|elapsed');
assert(['full','opaque'].includes(gpuScope),'Use --gpu-scope=full|opaque');
if(process.argv.some(v=>v.startsWith('--gpu-scope=')))assert.equal(gpuMode,'elapsed','Explicit GPU scope requires --gpu=elapsed');
if(gpuMode!=='off'){assert.equal(checkpointMode,'final','GPU collection requires final checkpoints');assert(!tracePath,'GPU collection and Chrome trace must run separately');}
if(tracePath){assert.equal(checkpointMode,'final','Trace requires final checkpoints to avoid bulk collection during swimming');assert.notEqual(tracePath,output);assert.notEqual(tracePath+'.meta.json',output);}
const hash=data=>crypto.createHash('sha256').update(data).digest('hex'),touch=profile==='touch';
const sourcePaths=['src/app.js','src/engine.js','src/performance.js','src/scene_stream.js','src/mobile-controls.js','src/voyage.js','tests/parity/browser-launch.cjs'];
if(process.argv.includes('--check-gpu-fixtures')){gpuFixtures();process.exit();}
const report={status:'running',url,profile,mode,checkpointMode,gpuMode,gpuScope,command:process.argv,startedAt:new Date().toISOString(),harnessSHA256:hash(fs.readFileSync(__filename)),
 local:{head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSHA256:Object.fromEntries(sourcePaths.map(p=>[p,hash(fs.readFileSync(path.join(root,p)))])),indexSHA256:hash(fs.readFileSync(path.join(root,'index.html')))},
 method:'Visible native Chrome, fresh context, normal start, 30 seconds forward and 30 seconds backward using real keyboard/CDP touch, then normal menu return. Actual clock, original simulation, natural streaming and default automatic quality remain active. No readPixels, screenshots, forced renders, pose/time/quality/save writes or synthetic frame samples. Passive RAF and actual renderer.frame increments measure callback opportunities and completed JS submissions, NOT GPU completion, compositor presentation or physical display refresh. Holds include waiting/menu boundaries; censoring is explicit. Full adds nested synchronous CPU and actual GL buffer submissions: ordinary render uploads aggregate per frame; frame-external/attach calls and ordinary calls over 1ms remain individual records. Slow raw calls flag inclusion in the aggregate, preventing double counting. Inclusive CPU durations must not be added together. Light omits detailed wrappers. RAF/render/event samples are retained. Final checkpoint mode collects at entry, after BOTH swimming legs have settled, and at the end: no bulk CDP drain/serialization during swimming. Periodic mode additionally collects every 10 seconds for failure diagnosis; its observed IPC/serialization stalls remain in the data and must not be mixed with final-mode results. Both modes attempt partial collection on failure; a browser crash can lose the uncollected tail. Full/light routes and adaptive resolutions can differ, so differences are diagnostic, not automatic performance wins. Touch uses this computer GPU, not a physical phone or battery measurement.',
 chunks:[],checkpoints:[],checks:[],errors:[],consoleErrors:[]};
if(gpuMode!=='off')report.gpu={scope:gpuScope,collectorSHA256:hash(createGpuTimer.toString()),method:'One non-overlapping TIME_ELAPSED query surrounds the complete actual Renderer.render call, including stream/resize commands it executes. No explicit flush, finish, blocking wait or forced frame. Poll only after at least four passive RAF callbacks; at most eight availability checks per callback, 128 outstanding queries. Capture submission and result as immutable events joined by render ID; invalid, deferred, overflow and pending at stop never become a guessed zero. GPU elapsed is not presentation latency or exclusive shader/pass time. Queries/polls/snapshots add observer cost; this run is diagnostic, not an automatic performance A/B. JS original-call CPU and query begin/end/poll CPU are separate. shadowDraws is the renderer total (static plus dynamic); staticShadowUpdates delta and shadow key identify cache refreshes without assigning a cause.',specification:'https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/'};
if(gpuMode==='elapsed'&&gpuScope==='opaque'){
 report.gpu.boundarySHA256=hash(createOpaqueScope.toString());
 report.gpu.method='One query per actual renderer attempt, only inside the observed main opaque interval after sky and before SAMPLE_ALPHA_TO_COVERAGE disable. Full-render query is disabled. All original draws, state changes and input/simulation remain intact; no renderer source rewriting. Boundaries require the pinned loaded renderer and exact observed order. Query close happens at the interval exit; the complete renderer return/throw later controls sample validity. Missing, invalid, deferred and skipped queries retain IDs and are never zero GPU time. Existing 4 RAF / 8 checks / 128 pending policy remains. Interval includes original texture setup and instance uploads as well as draws; tile GPU scheduling/store/load/resolve may shift with query boundaries. This is not exclusive material/fragment time, an additive share, or full-frame cost. cpuSubmitMs measures the instrumented renderer call, INCLUDING in-call scope observers; query API CPU is separately recorded but subtraction is not an exact uninstrumented cost. No flush, finish, extra framebuffer or forced draw. Source/position/quality/resolution and completed-frame association are retained.';
}
// Re-review the observed boundaries before accepting a different renderer body.
function acceptsOpaqueSource(source){return source.indexMatches===true&&source.engine==='8485d541e6f0587d155af47dfff53667cc8f415b56cc122a5cd52f900be16200'&&source.render==='7f43075ca39db8c68af9b938f82f6a4ebff290bb86fed304f156376208a117c6';}
let browser,context,page,cdp,contact=null,probeInstalled=false,traceCDP,traceDone,traceStarted=false,traceEndRequested=false,traceFinished=false;
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});assert(pass,name);};
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?{n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)}:null;};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

async function traceMark(label){
 const name='ocean-natural-swim-'+report.startedAt+'-'+label;
 return page.evaluate(name=>{performance.mark(name);const entry=performance.getEntriesByName(name,'mark').at(-1);return {name,startTime:entry.startTime,timeOrigin:performance.timeOrigin,now:performance.now(),frame:renderer.frame,p:player.p.slice(),stage:active?'dive':'home'};},name);
}
async function startTrace(){
 if(!tracePath)return;
 report.trace={status:'starting',path:tracePath,metadataPath:tracePath+'.meta.json',scope:'Normal outbound swimming leg only. Trace recording, markers and start/end flush can perturb CPU/GPU scheduling. Diagnostic evidence only; never a performance A/B or a promise of complete native-driver visibility. No screenshot, JS stack sampler, heap dump, system trace or CPU throttling. Bulk IO.read and file writes happen after both swimming legs, or after input cleanup on failure.',clock:'Trace ts/dur use the Chrome trace clock (microseconds). Find each named blink.user_timing mark in the trace and align its ts with marker.startTime (page performance.now milliseconds). Compare both offsets; do not subtract timeOrigin or Node timestamps from trace ts. timeOrigin is provenance only.',markers:[]};
 traceCDP=await browser.newBrowserCDPSession();
 const {categories}=await traceCDP.send('Tracing.getCategories'),requested=['toplevel','devtools.timeline','renderer.scheduler','v8','v8.execute','disabled-by-default-v8.gc','blink.user_timing','cc','gpu','viz','disabled-by-default-gpu.service'];
 // Chromium's GetCategories still has a Perfetto-service support TODO. An
 // empty successful inventory is unknown; the captured events are the proof.
 const inventoryKnown=categories.length>0,includedCategories=inventoryKnown?requested.filter(c=>categories.includes(c)):requested.slice();
 Object.assign(report.trace,{inventoryStatus:inventoryKnown?'reported':'unknown-empty',availableCategories:categories,requestedCategories:requested,includedCategories,missingCategories:inventoryKnown?requested.filter(c=>!categories.includes(c)):null});
 assert(includedCategories.includes('blink.user_timing')&&includedCategories.includes('devtools.timeline'),'Required timeline/clock categories unavailable');
 traceDone=new Promise(resolve=>traceCDP.once('Tracing.tracingComplete',resolve));
 const traceConfig={recordMode:'recordUntilFull',traceBufferSizeInKb:131072,enableSampling:false,enableSystrace:false,includedCategories,excludedCategories:['disabled-by-default-devtools.screenshot']};
 report.trace.config=traceConfig;
 await traceCDP.send('Tracing.start',{transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'none',traceConfig});traceStarted=true;report.trace.status='recording';
 report.trace.markers.push(await traceMark('outbound-start'));
}
async function endTrace(){
 if(!traceStarted||traceEndRequested)return;traceEndRequested=true;
 try{report.trace.markers.push(await traceMark('outbound-end'));}catch(error){report.trace.markerError=String(error);}
 await traceCDP.send('Tracing.end');report.trace.status='stopped-awaiting-stream';
}
async function finishTrace(){
 if(!traceStarted||traceFinished)return;traceFinished=true;
 let timer,handle,fd;const digest=crypto.createHash('sha256');
 try{
  const complete=await Promise.race([traceDone,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tracing completion timeout')),30000);})]);
  clearTimeout(timer);handle=complete.stream;report.trace.completion={...complete,stream:!!handle};assert(handle,'Chrome did not return a trace stream');
  fs.mkdirSync(path.dirname(tracePath),{recursive:true});fd=fs.openSync(tracePath,'w');report.trace.bytes=0;
  for(;;){const chunk=await traceCDP.send('IO.read',{handle,size:1048576}),bytes=Buffer.from(chunk.data,chunk.base64Encoded?'base64':'utf8');fs.writeSync(fd,bytes);digest.update(bytes);report.trace.bytes+=bytes.length;if(chunk.eof)break;}
  report.trace.sha256=digest.digest('hex');report.trace.status='captured';
  // Inspect only after the entire swimming route. Keep raw bytes even when
  // validation fails; a requested category is never called supported by fiat.
  const parsed=JSON.parse(fs.readFileSync(tracePath,'utf8')),events=parsed.traceEvents;assert(Array.isArray(events),'Trace JSON has no traceEvents array');
  const category=e=>String(e.cat||'').split(','),metadata=events.filter(e=>e.ph==='M'&&['thread_name','process_name'].includes(e.name));
  const observedCategories={};for(const e of events)for(const c of category(e))if(c)observedCategories[c]=(observedCategories[c]||0)+1;
  const markers=report.trace.markers.map(m=>({name:m.name,pageStartTimeMs:m.startTime,matches:events.filter(e=>category(e).includes('blink.user_timing')&&Number.isFinite(e.ts)&&(e.name===m.name||e.args?.data?.name===m.name||e.args?.name===m.name)).map(e=>({ts:e.ts,pid:e.pid,tid:e.tid,phase:e.ph,offsetMs:e.ts/1000-m.startTime})).sort((a,b)=>a.ts-b.ts)}));
  report.trace.validation={status:'checking',eventCount:events.length,observedCategories,requestedCategoryEvidence:Object.fromEntries(report.trace.requestedCategories.map(c=>[c,observedCategories[c]?'observed':'not-observed'])),metadata,markers,note:'Not-observed is not unsupported. Presence of GPU/viz/GC categories does not guarantee complete driver coverage; inspect raw events. Clock offsets are reported, not assumed equal.'};
  assert.equal(markers.length,2,'Both page clock marks must have been requested');assert(markers.every(m=>m.matches.length>0),'Actual trace must contain both named user-timing markers');
  const first=markers[0].matches[0],last=markers[1].matches[0];assert(last.ts>first.ts&&last.pid===first.pid&&last.tid===first.tid,'Clock marks must bound one actual renderer thread');
  const timeline=events.filter(e=>e.pid===first.pid&&e.tid===first.tid&&e.ts>=first.ts&&e.ts<=last.ts&&category(e).includes('devtools.timeline'));
  Object.assign(report.trace.validation,{timelineEventsBetweenMarkers:timeline.length,clockOffsetDifferenceMs:last.offsetMs-first.offsetMs});
  assert(timeline.length>0,'Actual renderer timeline events are required between clock markers');assert(metadata.some(e=>e.pid===first.pid&&e.tid===first.tid&&e.name==='thread_name'),'Actual renderer thread metadata is required');
  assert.equal(complete.dataLossOccurred,false,'Trace reports data loss; retain it as incomplete');assert(!report.trace.markerError,'Trace clock marker failed');
  report.trace.validation.status='passed';
 }catch(error){report.trace.status='failed';report.trace.failure=error.stack||String(error);throw error;}
 finally{clearTimeout(timer);if(fd!==undefined)fs.closeSync(fd);if(handle)try{await traceCDP.send('IO.close',{handle});}catch(error){report.trace.closeError=String(error);report.trace.status='failed';throw error;}}
}

// External WebGL/clock seam shared by browser collection and CPU fixtures.
// No flush/finish/wait loop: only AVAILABLE results after four observed RAFs.
function createGpuTimer(g,now,emit){
 const pending=new Map(),issues=[],limit=128,delay=4,readsPerRAF=8;
 let ext=null,serial=0,stopped=false,faulted=false,created=0,deleted=0,stopReceipt=null;
 const info={enabled:true,extension:'EXT_disjoint_timer_query_webgl2',supported:false,delayRAFs:delay,maxReadsPerRAF:readsPerRAF,maxPending:limit};
 const log=(kind,extra={})=>emit({kind,at:now(),rafSerial:serial,...extra});
 const fault=(where,error)=>{faulted=true;const row={where,error:String(error)};issues.push(row);log('error',row);};
 try{
  ext=g.getExtension(info.extension);if(!ext)info.reason='extension-unavailable';
  else{info.counterBits=g.getQuery(ext.TIME_ELAPSED_EXT,ext.QUERY_COUNTER_BITS_EXT);info.initialExternalQuery=!!g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);info.initialDisjoint=g.getParameter(ext.GPU_DISJOINT_EXT);info.supported=info.counterBits>0&&!info.initialExternalQuery&&!g.isContextLost();if(!info.supported)info.reason='counter-bits, initial ownership or context unavailable';}
 }catch(error){info.reason=String(error);fault('initialize',error);}
 const drop=ticket=>{
  if(!ticket.query)return;
  // Never end a foreign query, and never delete an object still active here.
  if(g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY)===ticket.query)throw Error('Owned query is still active');
  g.deleteQuery(ticket.query);pending.delete(ticket.query);deleted++;
 };
 const finish=(ticket,status,rawNs=null,extra={})=>{
  if(ticket.terminal)return;drop(ticket);ticket.terminal=true;
  log('result',{id:ticket.id,status,queryResultNs:rawNs,gpuMs:status==='valid'?rawNs/1e6:null,submissionOutcome:ticket.outcome??null,submittedRAF:ticket.serial,ageRAFs:serial-ticket.serial,...extra});
 };
 const close=ticket=>{
  if(!ticket||ticket.intervalClosed)return;const at=now();ticket.intervalClosed=true;
  try{
   if(ticket.query){const current=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);
    if(current===ticket.query){g.endQuery(ext.TIME_ELAPSED_EXT);if(g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY)===ticket.query)throw Error('Query end retained ownership');}
    else{ticket.status=g.isContextLost()?'context-lost':'ownership-lost';log('ownership-conflict',{id:ticket.id,point:'end',status:ticket.status});}
   }
  }catch(error){ticket.status='query-error';fault('end',error);}
  ticket.endCPUms=now()-at;
 };
 const poll=()=>{
  if(!info.supported||!pending.size)return;
  const at=now();let tested=0,ready=[],disjoint=false;
  try{
   if(g.isContextLost()){for(const ticket of [...pending.values()])finish(ticket,'context-lost');return;}
   disjoint=g.getParameter(ext.GPU_DISJOINT_EXT);
   if(!disjoint)for(const ticket of pending.values()){
    if(tested>=readsPerRAF||serial-ticket.serial<delay)break;
    tested++;if(!g.getQueryParameter(ticket.query,g.QUERY_RESULT_AVAILABLE))break;
    ready.push({ticket,ns:g.getQueryParameter(ticket.query,g.QUERY_RESULT)});
   }
   // A disjoint detected anywhere in this collection invalidates every query
   // still outstanding, including values just read but not yet accepted.
   disjoint=g.getParameter(ext.GPU_DISJOINT_EXT)||disjoint;
   if(disjoint){log('disjoint',{ids:[...pending.values()].map(t=>t.id)});for(const ticket of [...pending.values()])finish(ticket,'disjoint');}
   else for(const {ticket,ns} of ready)finish(ticket,ticket.outcome!=='complete'?ticket.outcome:Number.isSafeInteger(ns)&&ns>=0?'valid':'invalid-result',ns,{available:true});
  }catch(error){fault('poll',error);}
  finally{log('poll',{tested,ready:ready.length,pending:pending.size,disjoint,cpuMs:now()-at});}
 };
 return {
  info,
  begin(id,before){
   const at=now(),ticket={id,before,serial,query:null,status:'pending',terminal:false};
   try{
    if(stopped||faulted||!info.supported)ticket.status='collector-unavailable';
    else if(g.isContextLost())ticket.status='context-lost';
    else if(g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY)){ticket.status='external-query-active';log('ownership-conflict',{id});}
    else if(pending.size>=limit)ticket.status='overflow';
    else{ticket.query=g.createQuery();if(!ticket.query)throw Error('Query allocation failed');pending.set(ticket.query,ticket);created++;g.beginQuery(ext.TIME_ELAPSED_EXT,ticket.query);if(g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY)!==ticket.query)throw Error('Query begin did not establish ownership');}
   }catch(error){ticket.status='query-error';fault('begin',error);}
   ticket.beginCPUms=now()-at;return ticket;
  },
  close,
  skip(id,before,status){return {id,before,serial,query:null,status,terminal:false,beginCPUms:0};},
  end(ticket,submission,after){
   if(!ticket)return;ticket.outcome=submission.error?'render-error':submission.advance===1&&!submission.returnedFalse?'complete':submission.returnedFalse?'deferred':'no-frame';
   close(ticket);
   if(ticket.status==='pending'&&submission.scope?.status!=='captured'&&submission.scope&&!submission.error)ticket.status=submission.scope.status;
   if(after)submission={...submission,after:after()};
   log('submitted',{id:ticket.id,status:ticket.status,before:ticket.before,submission,beginCPUms:ticket.beginCPUms,endCPUms:ticket.endCPUms});
   if(ticket.status!=='pending')try{finish(ticket,ticket.status);}catch(error){fault('release-failed-query',error);}
  },
  tick(){if(!stopped){serial++;poll();}},
  stop(){
   if(!stopped){stopped=true;poll();stopReceipt={pending:[...pending.values()].map(t=>({id:t.id,submittedRAF:t.serial,ageRAFs:serial-t.serial,status:'pending-at-stop',submissionOutcome:t.outcome??null})),created,deleted,issues:issues.slice()};log('stopped',stopReceipt);}
   return stopReceipt;
  },
  restore(){
   this.stop();const failures=[],released=[],contextLost=g.isContextLost();let before=null,after=null,beforeOwned=false;
   try{
    if(ext){before=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);beforeOwned=!!before&&pending.has(before);if(beforeOwned)g.endQuery(ext.TIME_ELAPSED_EXT);
     for(const ticket of [...pending.values()])try{drop(ticket);released.push(ticket.id);if(g.isQuery(ticket.query))throw Error('Deleted query remains live');}catch(error){failures.push({id:ticket.id,error:String(error)});}
     after=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);
    }
   }catch(error){failures.push({error:String(error)});}
   const currentPreserved=beforeOwned?after===null:after===before;
   const glError=g.getError();return {ok:!contextLost&&!failures.length&&!pending.size&&currentPreserved&&glError===0,contextLost,glError,created,deleted,pending:[...pending.values()].map(t=>t.id),released,currentPreserved,failures,issues:issues.slice()};
  }
 };
}

// Observe the pinned renderer's existing call sequence. No GL state is added.
// Exit only closes the interval; the outer render's eventual return/throw owns
// whether its sample is usable. All original arguments/return values survive.
function createOpaqueScope(g,r,gpu,now,install){
 let frame=null;
 const reject=reason=>{if(!frame)return;frame.errors.push(reason);gpu.close(frame.ticket);frame.phase='invalid';};
 const observe=(owner,key,before,after)=>install(owner,key,original=>function(...args){
  if(frame&&before)before(args);const result=Reflect.apply(original,this,args);if(frame&&after)after(args);return result;
 });
 observe(g,'bindFramebuffer',args=>{if((args[0]===g.FRAMEBUFFER||args[0]===g.DRAW_FRAMEBUFFER)&&['scene','sky-program','sky-drawn','opaque'].includes(frame.phase))reject('Framebuffer changed inside sky-to-opaque boundaries');},args=>{
  if(args[0]!==g.FRAMEBUFFER&&args[0]!==g.DRAW_FRAMEBUFFER)return;
  if(args[1]!== (r.msaaFBO||r.sceneFBO))return;
  if(frame.phase!=='await-scene')return reject('Duplicate or misplaced scene framebuffer');
  frame.phase='scene';frame.boundaries.scene=true;
 });
 observe(r,'common',null,args=>{
  if(args[0]===r.skyProgram){if(frame.phase!=='scene')return reject('Misplaced sky program');frame.phase='sky-program';frame.boundaries.skyProgram=true;}
  else if(['scene','sky-program','sky-drawn'].includes(frame.phase))reject('Program changed before sky boundary');
 });
 observe(g,'drawArrays',null,args=>{
  if(frame.phase==='sky-program'){
   if(args.length!==3||args[0]!==g.TRIANGLES||args[1]!==0||args[2]!==3)return reject('Unexpected sky draw');
   frame.phase='sky-drawn';frame.boundaries.skyDraw=true;
  }else if(frame.phase==='scene'||frame.phase==='sky-drawn')reject('Misplaced draw before opaque');
 });
 observe(g,'depthFunc',null,args=>{
  if(frame.phase==='sky-drawn'){
   if(args[0]!==g.LESS)return reject('Missing LESS after sky');
   frame.boundaries.less=true;frame.intervalState={quality:r.quality,scale:r.dynamicScale,resolution:[r.canvas.width,r.canvas.height],msaa:r.msaaSamples};frame.startAt=now();frame.ticket=gpu.begin(frame.id,frame.before);frame.phase='opaque';
  }else if(args[0]===g.LESS&&['scene','sky-program','opaque','closed'].includes(frame.phase))reject('Misplaced LESS boundary');
 });
 observe(g,'disable',args=>{
  if(args[0]!==g.SAMPLE_ALPHA_TO_COVERAGE)return;
  if(frame.phase!=='opaque')return reject('Missing or duplicate opaque exit');
  frame.endAt=now();gpu.close(frame.ticket);frame.phase='closed';frame.boundaries.alphaDisable=true;
  // These are reset inside the opaque interval. drawCalls cannot be subtracted:
  // the preceding sky increments that counter AFTER depthFunc(LESS) returns.
  frame.triangles=r.submittedTriangles;frame.vertices=r.submittedVertices;
 },null);
 return {
  start(id,before){if(frame)throw Error('Nested renderer cannot use opaque scope');frame={id,before,phase:'await-scene',ticket:null,boundaries:{},errors:[],startAt:null,endAt:null,triangles:null,vertices:null};},
  finish(submission,after){
   if(!frame)return;const f=frame;frame=null;
   const captured=f.phase==='closed'&&!f.errors.length;
   const status=captured?'captured':submission.error?'render-error':submission.returnedFalse&&!f.ticket&&!f.errors.length?'deferred':f.phase==='await-scene'?'scope-missing':'scope-invalid';
   const scope={name:'opaque',status,startAt:f.startAt,endAt:f.endAt,boundaries:f.boundaries,triangles:f.triangles,vertices:f.vertices,intervalState:f.intervalState??null,errors:f.errors};
   gpu.end(f.ticket||gpu.skip(f.id,f.before,status),{...submission,scope},after);
  }
 };
}

// Lightweight fixtures exercise the real collector against the external WebGL
// boundary only. They do not render, launch Chrome or assert GPU performance.
function gpuFixtures(){
 const fixture=()=>{
  let current=null,ready=false,disjoint=false,lost=false,now=0,resultReads=0;const live=new Set(),deleted=[],rows=[];
  const g={CURRENT_QUERY:1,QUERY_RESULT_AVAILABLE:2,QUERY_RESULT:3,getExtension:()=>({TIME_ELAPSED_EXT:4,QUERY_COUNTER_BITS_EXT:5,GPU_DISJOINT_EXT:6}),
   getQuery:(target,key)=>key===5?64:current,getParameter:()=>{const v=disjoint;disjoint=false;return v;},isContextLost:()=>lost,
   createQuery:()=>{const q={};live.add(q);return q;},beginQuery:(target,q)=>{assert.equal(current,null);current=q;},endQuery:()=>{assert(current);current=null;},
   getQueryParameter:(q,key)=>{assert(live.has(q));if(key===2)return ready;assert(ready);resultReads++;return 1000000;},deleteQuery:q=>{assert.notEqual(current,q);assert(live.has(q));live.delete(q);deleted.push(q);},isQuery:q=>live.has(q),getError:()=>0};
  const timer=createGpuTimer(g,()=>++now,row=>rows.push(row)),submit=(id,advance=1)=>{const ticket=timer.begin(id,{p:[1,2,3],resolution:[80,60]});timer.end(ticket,{advance,returnedFalse:advance===0,error:null,cpuSubmitMs:2,after:{resolution:[80,60]}});return ticket;};
  return {g,timer,submit,rows,live,deleted,setReady:v=>ready=v,setDisjoint:()=>disjoint=true,setLost:()=>lost=true,setCurrent:q=>current=q,current:()=>current,resultReads:()=>resultReads};
 };
 const f=fixture();f.submit(1);f.setReady(true);for(let i=0;i<3;i++)f.timer.tick();assert.equal(f.resultReads(),0);f.timer.tick();assert.equal(f.rows.find(r=>r.kind==='result').gpuMs,1);assert.equal(f.rows.find(r=>r.kind==='result').status,'valid');assert.equal(f.live.size,0);
 const d=fixture();d.submit(1);d.submit(2,0);for(let i=0;i<4;i++)d.timer.tick();assert.equal(d.resultReads(),0);d.setDisjoint();d.timer.tick();d.setReady(true);d.timer.tick();assert.deepEqual(d.rows.filter(r=>r.kind==='result').map(r=>r.status),['disjoint','disjoint']);assert.equal(d.resultReads(),0);
 const e=fixture();e.submit(1,0);e.setReady(true);for(let i=0;i<4;i++)e.timer.tick();assert.equal(e.rows.find(r=>r.kind==='result').status,'deferred');assert.equal(e.rows.find(r=>r.kind==='result').gpuMs,null);
 const o=fixture();for(let i=1;i<=129;i++)o.submit(i);assert.equal(o.live.size,128);assert.equal(o.rows.find(r=>r.id===129&&r.kind==='result').status,'overflow');const pending=o.timer.stop();assert.equal(pending.pending.length,128);assert.equal(o.resultReads(),0);assert.equal(o.timer.restore().ok,true);assert.equal(o.live.size,0);
 const x=fixture(),foreign={};x.setCurrent(foreign);x.submit(1);assert.equal(x.rows.find(r=>r.kind==='result').status,'external-query-active');assert.equal(x.timer.restore().ok,true);assert.equal(x.current(),foreign);assert.equal(x.deleted.length,0);
 const y=fixture(),ticket=y.timer.begin(1,{});y.setCurrent(foreign);y.timer.end(ticket,{advance:1,returnedFalse:false,error:null});assert.equal(y.rows.find(r=>r.kind==='result').status,'ownership-lost');assert.equal(y.current(),foreign);assert.equal(y.timer.restore().ok,true);assert.equal(y.current(),foreign);
 const c=fixture();c.submit(1);c.setCurrent(foreign);assert.equal(c.timer.restore().ok,true);assert.equal(c.current(),foreign);assert.equal(c.deleted.length,1);
 const l=fixture();l.submit(1);l.setLost();l.timer.tick();assert.equal(l.rows.find(r=>r.kind==='result').status,'context-lost');assert.equal(l.resultReads(),0);assert.equal(l.timer.restore().ok,false);
 const b=fixture();for(let i=1;i<=12;i++)b.submit(i);b.setReady(true);for(let i=0;i<4;i++)b.timer.tick();assert.equal(b.resultReads(),8);b.timer.tick();assert.equal(b.resultReads(),12);
 const u=fixture();u.submit(1);const saved=JSON.stringify(u.rows);u.setReady(true);for(let i=0;i<4;i++)u.timer.tick();assert.equal(JSON.stringify(u.rows.slice(0,JSON.parse(saved).length)),saved,'Settling must not mutate previously drained events');
 const scopeFixture=()=>{
  const f=fixture(),calls=[],restores=[],g=f.g,r={sceneFBO:{},msaaFBO:null,skyProgram:{},canvas:{width:80,height:60},quality:2,dynamicScale:1,msaaSamples:0,submittedTriangles:0,submittedVertices:0};
  Object.assign(g,{FRAMEBUFFER:10,DRAW_FRAMEBUFFER:11,TRIANGLES:12,LESS:13,LEQUAL:14,SAMPLE_ALPHA_TO_COVERAGE:15});
  for(const key of ['bindFramebuffer','depthFunc','drawArrays','disable'])g[key]=function(...args){calls.push([key,...args]);return key;};
  r.common=function(...args){assert.equal(this,r);calls.push(['common',...args]);return 'common';};
  for(const key of ['beginQuery','endQuery']){const original=g[key];g[key]=function(...args){calls.push([key]);return Reflect.apply(original,this,args);};}
  const install=(owner,key,build)=>{const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key),wrapped=build(original);owner[key]=wrapped;restores.push(()=>{assert.equal(owner[key],wrapped);Object.defineProperty(owner,key,descriptor);assert.equal(owner[key],original);});};
  const scope=createOpaqueScope(g,r,f.timer,()=>calls.length,install),sky=()=>{g.bindFramebuffer(g.FRAMEBUFFER,r.msaaFBO||r.sceneFBO);assert.equal(r.common(r.skyProgram,1,2,3),'common');g.drawArrays(g.TRIANGLES,0,3);g.depthFunc(g.LESS);},finish=(result={advance:1,returnedFalse:false,error:null})=>{scope.finish(result,()=>({resolution:[80,60]}));f.setReady(true);for(let i=0;i<4;i++)f.timer.tick();return f.rows.find(e=>e.kind==='result');};
  return {...f,r,calls,scope,sky,finish,restore:()=>restores.reverse().forEach(f=>f())};
 };
 const a=scopeFixture();a.scope.start(1,{resolution:[80,60]});a.r.sceneFBO={};a.sky();a.r.submittedTriangles=7;a.r.submittedVertices=9;a.calls.push(['opaque-draw']);a.g.disable(a.g.SAMPLE_ALPHA_TO_COVERAGE);a.calls.push(['water-draw']);assert.equal(a.finish().status,'valid');assert.deepEqual(a.calls.map(c=>c[0]),['bindFramebuffer','common','drawArrays','depthFunc','beginQuery','opaque-draw','endQuery','disable','water-draw']);assert.equal(a.rows.find(e=>e.kind==='submitted').submission.scope.triangles,7);a.restore();
 const empty=scopeFixture();empty.scope.start(1,{});empty.sky();empty.g.disable(empty.g.SAMPLE_ALPHA_TO_COVERAGE);assert.equal(empty.finish().status,'valid');assert.equal(empty.rows.find(e=>e.kind==='submitted').submission.scope.triangles,0);empty.restore();
 const deferred=scopeFixture();deferred.scope.start(1,{});assert.equal(deferred.finish({advance:0,returnedFalse:true,error:null}).status,'deferred');assert.equal(deferred.calls.length,0);deferred.restore();
 const missing=scopeFixture();missing.scope.start(1,{});assert.equal(missing.finish().status,'scope-missing');missing.restore();
 const noEnd=scopeFixture();noEnd.scope.start(1,{});noEnd.sky();assert.equal(noEnd.finish().status,'scope-invalid');assert.equal(noEnd.current(),null);noEnd.restore();
 const duplicate=scopeFixture();duplicate.scope.start(1,{});duplicate.sky();duplicate.g.disable(duplicate.g.SAMPLE_ALPHA_TO_COVERAGE);duplicate.g.disable(duplicate.g.SAMPLE_ALPHA_TO_COVERAGE);assert.equal(duplicate.finish().status,'scope-invalid');assert.equal(duplicate.calls.filter(c=>c[0]==='endQuery').length,1);duplicate.restore();
 const switched=scopeFixture();switched.scope.start(1,{});switched.sky();switched.g.bindFramebuffer(switched.g.FRAMEBUFFER,{});switched.g.disable(switched.g.SAMPLE_ALPHA_TO_COVERAGE);assert.equal(switched.finish().status,'scope-invalid');switched.restore();
 for(const switchAt of ['scene','sky-program','sky-drawn']){const f=scopeFixture();f.scope.start(1,{});f.g.bindFramebuffer(f.g.FRAMEBUFFER,f.r.sceneFBO);if(switchAt==='scene')f.g.bindFramebuffer(f.g.DRAW_FRAMEBUFFER,{});f.r.common(f.r.skyProgram);if(switchAt==='sky-program')f.g.bindFramebuffer(f.g.DRAW_FRAMEBUFFER,{});f.g.drawArrays(f.g.TRIANGLES,0,3);if(switchAt==='sky-drawn')f.g.bindFramebuffer(f.g.DRAW_FRAMEBUFFER,{});f.g.depthFunc(f.g.LESS);f.g.disable(f.g.SAMPLE_ALPHA_TO_COVERAGE);assert.equal(f.finish().status,'scope-invalid','Pre-opaque FBO change at '+switchAt);assert.equal(f.calls.some(c=>c[0]==='beginQuery'),false);f.restore();}
 const late=scopeFixture();late.scope.start(1,{});late.sky();late.g.disable(late.g.SAMPLE_ALPHA_TO_COVERAGE);late.setCurrent(foreign);assert.equal(late.finish({advance:0,returnedFalse:false,error:'original render error'}).status,'render-error');assert.equal(late.current(),foreign);late.restore();assert.equal(late.timer.restore().ok,true);
 const badSky=scopeFixture();badSky.scope.start(1,{});badSky.g.bindFramebuffer(badSky.g.FRAMEBUFFER,badSky.r.sceneFBO);badSky.r.common(badSky.r.skyProgram);badSky.g.drawArrays(badSky.g.TRIANGLES,0,6);badSky.g.depthFunc(badSky.g.LESS);badSky.g.disable(badSky.g.SAMPLE_ALPHA_TO_COVERAGE);assert.equal(badSky.finish().status,'scope-invalid');assert.equal(badSky.calls.some(c=>c[0]==='beginQuery'),false);badSky.restore();
 const identity={indexMatches:true,engine:'8485d541e6f0587d155af47dfff53667cc8f415b56cc122a5cd52f900be16200',render:'7f43075ca39db8c68af9b938f82f6a4ebff290bb86fed304f156376208a117c6'};assert.equal(acceptsOpaqueSource(identity),true);for(const changed of [{indexMatches:false},{engine:'other source'},{render:'other loaded renderer'}])assert.equal(acceptsOpaqueSource({...identity,...changed}),false);
 console.log(JSON.stringify({status:'passed',fixtures:20,note:'External API fixtures only; no native GPU, timing or presentation evidence.'}));
}

function installProbe(options){
 const detail=options.detail;
 const g=renderer.gl,stream=renderer.sceneStream,restores=[],listeners=[],names=['raf','renders','holds','events','life','stream','resizes','attachments','uploads','allocations','appCPU',...(options.gpuFactory?['gpu']:[])];
 let data=Object.fromEntries(names.map(n=>[n,[]])),sequence=0,eventID=0,stage='installed',alive=true,rafID=null,currentFrame=null,currentUploads=null,currentAttach=null,currentResize=null,lastComplete=null,pendingRequests=[];
 const started=performance.now(),initialFrame=renderer.frame;
 // The same standalone external-API collector runs in fixtures and Chrome; no
 // production global or hook is installed. Default-off does not construct it.
 const gpu=options.gpuFactory?Function('return ('+options.gpuFactory+')')()(g,()=>performance.now(),row=>data.gpu.push(row)):null;
 const state=()=>({at:performance.now(),frame:renderer.frame,p:player.p.slice(),eye:eye.slice(),yaw:player.yaw,pitch:player.pitch,t,diveSeconds,active,modal,photoOpen,adaptive:settings.adaptive,quality:renderer.quality,settingQuality:settings.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,pendingResize:!!renderer.pendingResize,streamWaiting:!!stream?.waitStarted,jobs:stream?.jobs.size||0,queued:stream?.queue.length||0,loading:stream?.active||0,residentMeshes:renderer.sceneLoad?.residentMeshes??null,hidden:document.hidden,focused:document.hasFocus()});
 const event=(kind,extra={})=>{const row={id:++eventID,kind,at:performance.now(),stage,frame:currentFrame,...extra};data.events.push(row);return row;};
 const install=(owner,key,build)=>{
  const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key),wrapped=build(original);owner[key]=wrapped;
  restores.push(()=>{if(owner[key]!==wrapped)return {key,restored:false,reason:'wrapper ownership changed'};if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key];return {key,restored:owner[key]===original};});
 };
 const opaque=options.opaqueFactory?Function('return ('+options.opaqueFactory+')')()(g,renderer,gpu,()=>performance.now(),install):null;
 // Keep this wrapper small and identical in both collection modes.
 install(renderer,'render',original=>function(...args){
  if(!alive)return Reflect.apply(original,this,args);
  const at=performance.now(),before=this.frame,previous=currentFrame,previousUploads=currentUploads,id=++eventID;currentFrame=id;
  currentUploads=detail?{calls:0,bufferDataCalls:0,bufferSubDataCalls:0,uploadBytes:0,allocationBytes:0,cpuMs:0,maxCPUms:0}:null;let result,error=null;
  const shadowBefore=gpu?(this.staticShadowUpdates||0):null,gpuBefore=gpu?{...state(),stage,renderEye:args[0]?.slice(),renderTarget:args[1]?.slice(),renderTime:args[2],shadowKey:this._shadowKey??null,staticShadowUpdates:shadowBefore}:null;
  let ticket=null;if(opaque)opaque.start(id,gpuBefore);else if(gpu)ticket=gpu.begin(id,gpuBefore);const submitAt=gpu?performance.now():at;
  try{result=Reflect.apply(original,this,args);return result;}catch(e){error=String(e);throw e;}
  finally{
   const end=performance.now(),advance=this.frame-before,row={id,stage,at,end,cpuMs:end-at,frameBefore:before,frameAfter:this.frame,advance,returnedFalse:result===false,error};
   if(gpu){
    row.cpuSubmitMs=end-submitAt;
    const submission={stage,at:submitAt,end,cpuSubmitMs:row.cpuSubmitMs,cpuIncludesScopeObserver:!!opaque,frameBefore:before,frameAfter:this.frame,advance,returnedFalse:result===false,error},after=()=>({...state(),shadowKey:this._shadowKey??null,staticShadowUpdates:this.staticShadowUpdates||0,staticShadowUpdateDelta:(this.staticShadowUpdates||0)-shadowBefore,shadowDraws:advance===1?this.shadowDraws:null,draws:advance===1?this.drawCalls:null,triangles:advance===1?this.submittedTriangles:null,sunless:advance===1?!!this.sunless:null});
    if(opaque)opaque.finish(submission,after);else gpu.end(ticket,submission,after);
   }
   if(detail)Object.assign(row,{reportedInnerCPU:advance===1?this.cpuRenderMs:null,draws:advance===1?this.drawCalls:null,triangles:advance===1?this.submittedTriangles:null,staticShadowUpdates:this.staticShadowUpdates||0,bufferSubmissions:currentUploads});
   data.renders.push(row);
   if(advance>0){data.holds.push({from:lastComplete?.at??started,to:end,ms:end-(lastComplete?.at??started),fromFrame:lastComplete?.frame??initialFrame,toFrame:this.frame,fromStage:lastComplete?.stage??'installed',toStage:stage,censored:lastComplete?false:'left'});lastComplete={at:end,frame:this.frame,stage};}
   currentFrame=previous;currentUploads=previousUploads;
  }
 });
 if(detail){
  const life=updateLife,wrappedLife=function(...args){if(!alive)return Reflect.apply(life,this,args);const at=performance.now();try{return Reflect.apply(life,this,args);}finally{data.life.push({at,end:performance.now(),stage,time:args[0]});}};
  updateLife=wrappedLife;restores.push(()=>{const ok=updateLife===wrappedLife;if(ok)updateLife=life;return {key:'updateLife',restored:ok};});
  install(oceanPerf,'record',original=>function(...args){if(alive)data.appCPU.push({at:performance.now(),stage,rafTimestamp:args[0],cpuMs:args[1],rawRAFIntervalMs:args[2]});return Reflect.apply(original,this,args);});
  if(stream)install(stream,'update',original=>function(...args){
   if(!alive)return Reflect.apply(original,this,args);
   const at=performance.now(),before={waiting:!!this.waitStarted,jobs:this.jobs.size,active:this.active,queued:this.queue.length};let result,error=null;
   try{result=Reflect.apply(original,this,args);return result;}catch(e){error=String(e);throw e;}
   finally{data.stream.push({at,end:performance.now(),stage,frame:currentFrame,prefetch:args[1]!==false,ready:result===true,error,before,after:{waiting:!!this.waitStarted,jobs:this.jobs.size,active:this.active,queued:this.queue.length,requiredMissing:this.requiredMissing.size}});}
  });
  install(renderer,'resize',original=>function(...args){
   if(!alive)return Reflect.apply(original,this,args);
   const id=++eventID,at=performance.now(),before=state(),oldScene=this.sceneFBO,oldFailure=this.resizeFailure,prior=currentResize;currentResize=id;
   const commit=args[0]===true,requestIDs=commit?pendingRequests.slice():[];if(!commit)pendingRequests.push(id);
   let result,error=null;
   try{result=Reflect.apply(original,this,args);return result;}catch(e){error=String(e);throw e;}
   finally{
    const end=performance.now(),after=state(),outcome=error?'threw':this.pendingResize?'queued':this.sceneFBO!==oldScene?'replaced':result===false?this.resizeFailure===oldFailure?'backoff':'failed':'reused';
    data.resizes.push({id,at,end,stage,frame:currentFrame,commit,requestIDs,outcome,error,result:result??null,before,after,failure:this.resizeFailure?{...this.resizeFailure}:null});
    if(!this.pendingResize)pendingRequests=[];currentResize=prior;
   }
  });
  const batchIDs=new WeakMap(renderer.batches.map((b,i)=>[b,i]));
  install(renderer,'attachBatchMesh',original=>function(...args){
   if(!alive)return Reflect.apply(original,this,args);
   const b=args[0],id=++eventID,at=performance.now(),prior=currentAttach;currentAttach=id;let error=null;
   try{return Reflect.apply(original,this,args);}catch(e){error=String(e);throw e;}
   finally{data.attachments.push({id,at,end:performance.now(),stage,frame:currentFrame,batch:batchIDs.get(b)??null,mesh:b.streamMesh??null,chunk:stream?.meshes[b.streamMesh]?.meta.chunk??null,error});currentAttach=prior;}
  });
  // WebGL2 offsets/lengths are elements, while destination offsets are bytes.
  // length 0 (or omitted) means the remainder, not a zero-byte upload.
  const sourceBytes=(source,offset=0,length=0)=>{
   if(source==null)return 0;if(typeof source==='number')return null;
   const elementBytes=source.BYTES_PER_ELEMENT||1,total=source.length??source.byteLength;
   return (length>0?length:Math.max(0,total-offset))*elementBytes;
  };
  for(const name of ['bufferData','bufferSubData'])install(g,name,original=>function(...args){
   if(!alive)return Reflect.apply(original,this,args);
   const at=performance.now(),source=args[name==='bufferData'?1:2],bytes=sourceBytes(source,args[3]||0,args[4]||0);let error=null;
   try{return Reflect.apply(original,this,args);}catch(e){error=String(e);throw e;}
   finally{
    const end=performance.now(),cpuMs=end-at,uploadBytes=bytes??0,allocationBytes=name==='bufferData'?(typeof source==='number'?source:bytes):0,includedInFrameAggregate=currentFrame!==null&&currentAttach===null&&currentUploads!==null;
    if(includedInFrameAggregate){currentUploads.calls++;currentUploads[name+'Calls']++;currentUploads.uploadBytes+=uploadBytes;currentUploads.allocationBytes+=allocationBytes;currentUploads.cpuMs+=cpuMs;currentUploads.maxCPUms=Math.max(currentUploads.maxCPUms,cpuMs);}
    if(!includedInFrameAggregate||cpuMs>1||error)data.uploads.push({at,end,stage,frame:currentFrame,attachment:currentAttach,name,target:args[0],destinationOffset:name==='bufferSubData'?args[1]:0,sourceOffset:args[3]||0,sourceLength:args[4]??null,uploadBytes,allocationBytes,includedInFrameAggregate,error});
   }
  });
  for(const name of ['texStorage2D','renderbufferStorageMultisample','checkFramebufferStatus','getInternalformatParameter','getError','deleteFramebuffer','deleteRenderbuffer','deleteTexture'])install(g,name,original=>function(...args){
   if(!alive||currentResize===null)return Reflect.apply(original,this,args);
   const at=performance.now();let error=null;try{return Reflect.apply(original,this,args);}catch(e){error=String(e);throw e;}
   finally{data.allocations.push({at,end:performance.now(),stage,frame:currentFrame,resize:currentResize,name,args:args.map(v=>typeof v==='number'?v:null),error});}
  });
 }
 const listen=(owner,type,fn)=>{owner.addEventListener(type,fn,true);listeners.push(()=>owner.removeEventListener(type,fn,true));};
 for(const type of ['keydown','keyup','pointerdown','pointerup','pointercancel','click'])listen(window,type,e=>event('input',{type,code:e.code||null,target:e.target?.closest?.('[id]')?.id||null,trusted:e.isTrusted,timeStamp:e.timeStamp}));
 for(const type of ['blur','focus','pagehide','pageshow'])listen(window,type,()=>event(type,{hidden:document.hidden,focused:document.hasFocus()}));
 listen(document,'visibilitychange',()=>event('visibilitychange',{hidden:document.hidden,focused:document.hasFocus()}));
 const observe=timestamp=>{
  if(!alive)return;gpu?.tick();const now=performance.now();
  data.raf.push({timestamp,at:now,frame:renderer.frame,stage,p:player.p.slice(),t,active,modal,photoOpen,hidden:document.hidden,focused:document.hasFocus(),adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,width:renderer.canvas.width,height:renderer.canvas.height,streamWaiting:!!stream?.waitStarted,jobs:stream?.jobs.size||0,queued:stream?.queue.length||0,loading:stream?.active||0,completedFrameAgeMs:now-(lastComplete?.at??started),ageIsLowerBound:!lastComplete});
  rafID=requestAnimationFrame(observe);
 };
 rafID=requestAnimationFrame(observe);
 const initial=state();event('installed',{mode:detail?'full':'light'});
 window.__naturalSwimCost={
  mark(name){stage=name;return event('stage',{state:state()});},
  drain(){const at=performance.now(),rows=data;data=Object.fromEntries(names.map(n=>[n,[]]));return {sequence:++sequence,at,state:state(),rows};},
  stop(){if(alive){alive=false;cancelAnimationFrame(rafID);const at=performance.now();data.holds.push({from:lastComplete?.at??started,to:at,ms:at-(lastComplete?.at??started),fromFrame:lastComplete?.frame??initialFrame,toFrame:null,fromStage:lastComplete?.stage??'installed',toStage:stage,censored:lastComplete?'right':'both'});event('stopped');}return {started,initial,initialFrame,lastComplete,state:state(),...(gpu?{gpu:gpu.stop()}:{})};},
  restore(){this.stop();const results=restores.reverse().map(f=>{try{return f();}catch(e){return {restored:false,error:String(e)};}});listeners.forEach(f=>f());const gpuRestore=gpu?.restore();return {results,...(gpu?{gpu:gpuRestore}:{}),ok:results.every(r=>r.restored)&&(!gpu||gpuRestore.ok)};}
 };
 return {started,initial,mode:detail?'full':'light',...(gpu?{gpu:gpu.info}: {})};
}

async function checkpoint(label){
 const started=performance.now(),receipt={label,started,received:false};report.checkpoints.push(receipt);
 try{const chunk=await page.evaluate(()=>__naturalSwimCost.drain());report.chunks.push(chunk);Object.assign(receipt,{received:true,sequence:chunk.sequence,pageAt:chunk.at,roundTripMs:performance.now()-started});}
 catch(error){receipt.error=String(error);receipt.roundTripMs=performance.now()-started;report.possiblyMissingChunk={label,lastReceivedSequence:report.chunks.at(-1)?.sequence??0,reason:'Page drain may have completed before transport failed; later successful partial capture does not recover that chunk.'};throw error;}
 finally{save();}
}
async function touchDown(x,y){assert(!contact);contact={id:1,x,y};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});}
async function touchMove(x,y){assert(contact);contact={...contact,x,y};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact]});}
async function touchUp(){if(!contact)return;await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});contact=null;}
async function press(selector){const el=page.locator(selector);await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();if(touch){const b=await el.boundingBox();assert(b);await touchDown(b.x+b.width/2,b.y+b.height/2);await touchUp();}else await el.click();}
async function mark(name){await page.evaluate(name=>__naturalSwimCost.mark(name),name);}
async function swim(name,forward){
 await mark(name);
 try{
  if(touch){const b=await page.locator('#joystick').boundingBox();assert(b,'Visible joystick required');await touchDown(b.x+b.width/2,b.y+b.height/2);await touchMove(b.x+b.width/2,b.y+b.height*(forward?.19:.81));}
  else await page.keyboard.down(forward?'w':'s');
  const start=performance.now();for(let i=1;i<=3;i++){await page.waitForTimeout(Math.max(0,start+i*10000-performance.now()));if(checkpointMode==='periodic'&&i<3)await checkpoint(name+'-'+i);}
 }finally{if(touch)await touchUp();else await page.keyboard.up(forward?'w':'s');}
 if(checkpointMode==='periodic')await checkpoint(name+'-3');
 await mark(name+'-released');
}
function summarize(){
 const rows=name=>report.chunks.flatMap(c=>c.rows[name]||[]),raf=rows('raf'),renders=rows('renders'),holds=rows('holds'),events=rows('events'),uploads=rows('uploads');
 const intervals=values=>values.slice(1).map((v,i)=>v-values[i]),aggregates=renders.map(r=>r.bufferSubmissions).filter(Boolean),unaggregated=uploads.filter(r=>!r.includedInFrameAggregate);
 const stages=['entry','outbound','return','settle','home-return'];
 report.summary={rawRAFs:raf.length,renderAttempts:renders.length,completedSubmissions:renders.filter(r=>r.advance>0).length,deferredRenders:renders.filter(r=>r.returnedFalse).length,
  completedSubmissionIntervalsMs:stats(holds.filter(h=>!h.censored).map(h=>h.ms)),terminalCensoredHold:holds.find(h=>h.toFrame===null)||null,rawRAFIntervalsMs:stats(intervals(raf.map(r=>r.timestamp))),
  renderEntryCPU:stats(renders.map(r=>r.cpuMs)),lifeCPU:stats(rows('life').map(r=>r.end-r.at)),streamCPU:stats(rows('stream').map(r=>r.end-r.at)),resizeCPU:stats(rows('resizes').map(r=>r.end-r.at)),attachmentCPU:stats(rows('attachments').map(r=>r.end-r.at)),
  bufferSubmissions:{calls:aggregates.reduce((n,r)=>n+r.calls,0)+unaggregated.length,uploadBytes:[...aggregates,...unaggregated].reduce((n,r)=>n+r.uploadBytes,0),allocationBytes:[...aggregates,...unaggregated].reduce((n,r)=>n+r.allocationBytes,0),frameOutsideCalls:uploads.filter(r=>r.frame===null).length,rawSlowOrdinaryCalls:uploads.filter(r=>r.includedInFrameAggregate).length},
  stages:stages.map(name=>{const a=raf.filter(r=>r.stage===name),b=renders.filter(r=>r.stage===name),start=events.find(e=>e.kind==='stage'&&e.stage===name)?.state;return {name,samples:a.length,from:start||null,to:a.at(-1)||null,displacement:a.length&&start?distance(start.p,a.at(-1).p):null,rawRAFIntervalsMs:stats(intervals(a.map(r=>r.timestamp))),renderCPU:stats(b.map(r=>r.cpuMs)),completedFrameAgeMs:stats(a.map(r=>r.completedFrameAgeMs)),completeSubmissions:b.filter(r=>r.advance>0).length};})};
 if(gpuMode==='elapsed'){
  const events=rows('gpu'),submitted=events.filter(r=>r.kind==='submitted'),results=events.filter(r=>r.kind==='result'),terminal=new Map(results.map(r=>[r.id,r])),pending=report.end?.gpu?.pending||[];
  const statusCounts={};for(const s of submitted){const status=terminal.get(s.id)?.status||(pending.some(p=>p.id===s.id)?'pending-at-stop':'unresolved');statusCounts[status]=(statusCounts[status]||0)+1;}
  const valid=results.filter(r=>r.status==='valid');
  report.gpu.summary={attempts:submitted.length,results:results.length,statusCounts,validElapsedMs:stats(valid.map(r=>r.gpuMs)),cpuSubmitMs:stats(submitted.map(r=>r.submission.cpuSubmitMs)),queryBeginCPUms:stats(submitted.map(r=>r.beginCPUms)),queryEndCPUms:stats(submitted.map(r=>r.endCPUms)),pollCPUms:stats(events.filter(r=>r.kind==='poll').map(r=>r.cpuMs)),pendingAtStop:pending,errors:events.filter(r=>r.kind==='error'),ownershipConflicts:events.filter(r=>r.kind==='ownership-conflict'),scopeBoundaryFailures:submitted.filter(r=>['scope-missing','scope-invalid'].includes(r.submission.scope?.status)).map(r=>({id:r.id,scope:r.submission.scope})),stages:stages.map(stage=>{const attempts=submitted.filter(r=>r.submission.stage===stage),ids=new Set(attempts.map(r=>r.id)),samples=valid.filter(r=>ids.has(r.id));return {stage,attempts:attempts.length,valid:samples.length,elapsedMs:stats(samples.map(r=>r.gpuMs))};}),identityComplete:submitted.length===renders.length&&new Set(submitted.map(r=>r.id)).size===submitted.length&&submitted.every(s=>renders.some(r=>r.id===s.id))&&new Set(results.map(r=>r.id)).size===results.length&&results.every(r=>submitted.some(s=>s.id===r.id))&&submitted.every(s=>terminal.has(s.id)||pending.some(p=>p.id===s.id))};
 }
 return {raf,renders,events};
}

(async()=>{
 save();
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});report.browserVersion=browser.version();
  context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.setDefaultTimeout(30000);cdp=await context.newCDPSession(page);
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('crash',()=>report.errors.push('Renderer process crashed'));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  const response=await page.goto(url);assert(response?.ok(),'Navigation failed');report.document={url:response.url(),status:response.status(),sha256:hash(await response.body())};report.document.matchesLocalIndex=report.document.sha256===report.local.indexSHA256;
  await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  // Observe existing loading as-is: no ready()/request()/resident assignments.
  report.device=await page.evaluate(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,userAgent:navigator.userAgent,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,coarse:matchMedia('(pointer:coarse)').matches,adaptive:settings.adaptive,quality:renderer.quality,msaa:renderer.msaaSamples,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],compiled:renderer.sceneLoad?.compiled,streamed:renderer.sceneLoad?.streamed,gl:g.getError(),contextLost:g.isContextLost()};});
  const methods=await page.evaluate(()=>({render:renderer.render.toString(),resize:renderer.resize.toString(),attachBatchMesh:renderer.attachBatchMesh.toString(),updateLife:updateLife.toString(),performanceRecord:oceanPerf.record.toString(),streamUpdate:renderer.sceneStream?.update.toString(),streamLoad:renderer.sceneStream?.load.toString()}));
  report.loadedMethodSHA256=Object.fromEntries(Object.entries(methods).map(([k,v])=>[k,v?hash(v):null]));
  if(gpuScope==='opaque'){report.gpu.sourceGate={baseline:'b337564279219cbbff573a548c274c0e11393256',indexMatches:report.document.matchesLocalIndex,engine:report.local.sourceSHA256['src/engine.js'],render:report.loadedMethodSHA256.render};check('Opaque boundaries use the pinned actual renderer and source',acceptsOpaqueSource(report.gpu.sourceGate),report.gpu.sourceGate);}
  check('Native hardware and default adaptive quality',report.device.adaptive&&report.device.renderer&&!/swiftshader|software|llvmpipe|softpipe/i.test(report.device.renderer),report.device);
  check('Native WebGL starts without error',report.device.gl===0&&!report.device.contextLost);check('Production regional streaming is present',report.device.streamed===true);
  probeInstalled=true;report.probe=await page.evaluate(installProbe,{detail:mode==='full',gpuFactory:gpuMode==='elapsed'?createGpuTimer.toString():null,opaqueFactory:gpuScope==='opaque'?createOpaqueScope.toString():null});if(gpuMode==='elapsed')check('Native elapsed query is available and unowned',report.probe.gpu?.supported,report.probe.gpu);await mark('entry');
  await press('#startBtn');await page.waitForFunction(()=>active&&!modal);await page.locator('#welcome').waitFor({state:'hidden'});await checkpoint('entry');
  if(tracePath)await startTrace();
  await swim('outbound',true);
  if(tracePath)await endTrace();
  await page.waitForTimeout(300);await swim('return',false);
  await mark('settle');await page.waitForTimeout(1500);await checkpoint('settle');
  await mark('home-return');await press('#pauseBtn');await page.locator('#menuHome').waitFor({state:'visible'});await press('#menuHome');await page.waitForFunction(()=>!active&&!modal);await page.waitForTimeout(1000);
  report.end=await page.evaluate(()=>__naturalSwimCost.stop());await checkpoint('complete');
  const rows=summarize();check('Checkpoint sequences are complete',report.chunks.every((c,i)=>c.sequence===i+1));
  check('All recorded callbacks remain visible, focused and adaptive',rows.raf.length>0&&rows.raf.every(r=>!r.hidden&&r.focused&&r.adaptive));
  check('Render records distinguish completed and deferred attempts',rows.renders.length>0&&rows.renders.every(r=>!r.error&&(r.advance===0||r.advance===1)&&(!r.returnedFalse||r.advance===0)));
  for(const name of ['outbound','return']){const s=report.summary.stages.find(s=>s.name===name);check(name+' uses real movement and completes frames',s.samples>0&&s.displacement>.5&&s.completeSubmissions>0,s);}
  if(gpuMode==='elapsed'){const s=report.gpu.summary;check('GPU attempts retain complete identities and terminal or pending states',s.identityComplete,s.statusCounts);check('GPU collector has no API or ownership failures',!s.errors.length&&!s.ownershipConflicts.length,{errors:s.errors,ownershipConflicts:s.ownershipConflicts});if(gpuScope==='opaque')check('Every completed opaque interval has exact observed boundaries',!s.scopeBoundaryFailures.length,s.scopeBoundaryFailures);for(const stage of ['outbound','return'])check(stage+(gpuScope==='full'?' has available non-disjoint complete-render GPU samples':' has available opaque intervals associated with complete renders'),s.stages.find(r=>r.stage===stage)?.valid>0,s.stages.find(r=>r.stage===stage));}
  const outward=report.summary.stages.find(s=>s.name==='outbound'),back=report.summary.stages.find(s=>s.name==='return');
  report.route={scheduledOutboundSeconds:30,scheduledReturnSeconds:30,actualInputDurationNote:'Native input timestamps and actual stage times are retained. Each leg uses a monotonic 30-second deadline; periodic checkpoints, when requested, share that deadline. Transport latency is not subtracted from observations.',outboundDisplacement:outward.displacement,returnDisplacement:back.displacement,distanceFromStartAfterReturn:back.to&&outward.from?distance(back.to.p,outward.from.p):null,note:'Reverse input follows the original heading. Collision, terrain, acceleration and current may prevent an exact return; position is never corrected.'};
  report.finalGL=await page.evaluate(()=>({error:renderer.gl.getError(),contextLost:renderer.gl.isContextLost()}));check('Final WebGL is healthy',report.finalGL.error===0&&!report.finalGL.contextLost);
  check('Normal menu returns home',report.end.state.active===false&&!report.end.state.modal);check('No page errors',report.errors.length===0,report.errors);
  if(tracePath)await finishTrace();
  report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack||String(error);}
 finally{
  if(page&&!page.isClosed()&&probeInstalled){
   // First retain partial observations; input cleanup is a separate boundary.
   if(report.status!=='passed'){try{report.end??=await page.evaluate(()=>__naturalSwimCost.stop());await checkpoint('failure-partial');}catch(e){report.partialCaptureError=String(e);report.unretrievedTail=true;}}
   try{if(contact){await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});contact=null;}await page.keyboard.up('w');await page.keyboard.up('s');}catch(e){report.inputCleanupError=String(e);}
   try{report.restore=await page.evaluate(()=>__naturalSwimCost.restore());if(!report.restore.ok)report.status='failed';}catch(e){report.restore={ok:false,error:String(e)};report.status='failed';}
  }
  try{if(!report.summary&&report.chunks.length)summarize();}catch(e){report.summaryError=String(e);}
  if(tracePath){
   try{await endTrace();await finishTrace();}catch(error){report.status='failed';report.trace??={status:'failed',path:tracePath};report.trace.failure??=error.stack||String(error);}
   await traceCDP?.detach().catch(error=>{report.trace.detachError=String(error);});
   fs.mkdirSync(path.dirname(tracePath),{recursive:true});fs.writeFileSync(tracePath+'.meta.json',JSON.stringify({capturedAt:new Date().toISOString(),diagnosticReport:output,harnessSHA256:report.harnessSHA256,local:report.local,document:report.document,loadedMethodSHA256:report.loadedMethodSHA256,device:report.device,browserVersion:report.browserVersion,profile,mode,checkpointMode,trace:report.trace??{status:'not-started',path:tracePath}},null,2));
  }
  await context?.close().catch(e=>{report.contextCloseError=String(e);});await browser?.close().catch(e=>{report.browserCloseError=String(e);});
  report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,profile,mode,checkpointMode,chunks:report.chunks.length,output,failure:report.failure||null}));if(report.status!=='passed')process.exitCode=1;
 }
})().catch(error=>{report.status='failed';report.failure??=error.stack||String(error);save();console.error(error);process.exitCode=1;});
