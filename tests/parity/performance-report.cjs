/* Exercise production recording, finish and JSON download. Browser IO is
 * stubbed; no renderer, real device timing, filesystem download or upload. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/performance.js'),'utf8');
function fixture(version='0.18.2-test'){
 const exports=[],urls=[],revoked=[],timers=[],messages=[],sideEffects=[];
 const nodes={perfPanel:{classList:{remove(){}}},perfExport:{disabled:true}};
 const renderer={quality:2,dynamicScale:1,canvas:{width:1100,height:740},msaaSamples:4,individualCount:807,gl:{getExtension:()=>({UNMASKED_RENDERER_WEBGL:1}),getParameter:()=>'fixture renderer'}};
 const document={documentElement:version===null?{}:{dataset:version===undefined?{}:{version}}};
 const context=vm.createContext({console,document,renderer,active:true,settings:{adaptive:false},OPEN_WORLD:{version:'0.17.0'},navigator:{userAgent:'report regression fixture',sendBeacon(){sideEffects.push('beacon');}},performance:{now:()=>1000},Blob,
  $:id=>nodes[id]||null,toast:message=>messages.push(message),closePanel(){},fetch(){sideEffects.push('fetch');},localStorage:{setItem(){sideEffects.push('storage');}},
  URL:{createObjectURL(blob){const url='blob:report-'+urls.length;urls.push({url,blob});return url;},revokeObjectURL:url=>revoked.push(url)},
  download:(url,name)=>exports.push({url,name}),setTimeout(callback,delay){timers.push({callback,delay});}
 });
 vm.runInContext(source,context,{filename:'performance.js'});const perf=vm.runInContext('oceanPerf',context);
 function finish(){
  perf.start();let now=1000;perf.record(now,0);
  // 200 positive finite intervals in reverse order; p99 differs from max.
  for(let i=0;i<200;i++){now+=(200-i)/2;perf.record(now,i%5+1);}
  perf.finish();return perf.lastResult;
 }
 return {perf,finish,document,renderer,exports,urls,revoked,timers,messages,nodes,sideEffects};
}
const results=[];
async function check(name,run){try{await run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message);}}
(async()=>{
 await check('finished report distinguishes the application release from geometry version',()=>{
  const f=fixture(),report=f.finish();assert.equal(report.version,'0.18.2-test');assert.equal(report.worldVersion,'0.17.0');assert.equal(f.perf.benchmark,null);assert.equal(f.nodes.perfExport.disabled,false);
 });
 await check('p50, p95 and p99 use the sorted valid rendered intervals while preserving older fields',()=>{
  const f=fixture(),report=f.finish();assert.equal(report.renderedFrames,200);assert.equal(report.durationMs,10050);assert.equal(report.averageFPS,1000*200/10050);
  assert.equal(report.p50FrameMs,50.5);assert.equal(report.p95FrameMs,95.5);assert.equal(report.p99FrameMs,99.5);assert.equal(report.meanCPUFrameMs,3);
  assert.deepEqual(Array.from(report.frameIntervalsMs),Array.from({length:200},(_,i)=>(200-i)/2),'export preserves chronological interval order');
  assert.deepEqual(Array.from(report.renderResolution),[1100,740]);assert.equal(report.msaaSamples,4);assert.equal(report.individuals,807);assert.equal(report.renderScale,1);assert.equal(report.quality,2);assert.equal(report.renderer,'fixture renderer');assert.equal(report.userAgent,'report regression fixture');assert(Number.isFinite(Date.parse(report.capturedAt)));assert.equal(report.scene,'Shilang concept, not a survey');assert.match(report.note,/No GPU-time claim/);
 });
 await check('actual JSON export and filename use the app release and revoke their temporary URL',async()=>{
  const f=fixture();f.finish();f.perf.export();assert.equal(f.exports.length,1);assert.equal(f.exports[0].name,'Ocean-v0.18.2-test-device-benchmark.json');assert.equal(f.exports[0].url,f.urls[0].url);assert.equal(f.urls[0].blob.type,'application/json');
  const report=JSON.parse(await f.urls[0].blob.text());assert.deepEqual(report,JSON.parse(JSON.stringify(f.perf.lastResult)));assert.equal(report.version,'0.18.2-test');assert.equal(report.worldVersion,'0.17.0');assert.equal(report.p99FrameMs,99.5);
  assert.equal(f.timers.length,1);assert.equal(f.timers[0].delay,3000);f.timers[0].callback();assert.deepEqual(f.revoked,[f.urls[0].url]);assert.deepEqual(f.sideEffects,[]);
 });
 await check('absent or empty application version is explicitly unknown in report and filename',async()=>{
  for(const version of [null,'']){const f=fixture(version),report=f.finish();assert.equal(report.version,'unknown');assert.equal(report.worldVersion,'0.17.0');f.perf.export();assert.equal(f.exports[0].name,'Ocean-vunknown-device-benchmark.json');assert.equal(JSON.parse(await f.urls[0].blob.text()).version,'unknown');}
  const f=fixture();delete f.document.documentElement.dataset.version;assert.equal(f.finish().version,'unknown');
 });
 await check('insufficient samples cannot create or export a report',()=>{
  const f=fixture();f.perf.start();f.perf.record(1000,1);f.perf.record(1016,1);f.perf.finish();f.perf.export();assert.equal(f.perf.lastResult,null);assert.equal(f.exports.length,0);assert.equal(f.nodes.perfExport.disabled,true);
 });
 console.log(`${results.filter(Boolean).length}/${results.length} performance report checks passed`);if(results.includes(false))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
