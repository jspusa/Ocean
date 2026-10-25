/* Short, serial native-GPU diagnosis. Actual UI start and normal-speed guide
 * travel; no coordinate edits or accelerated clock. Quality 2 / scale .64 /
 * adaptive off are explicit diagnostic controls, not normal player defaults.
 * CPU profiling and three timer queries can perturb these diagnostic samples. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','https://jspusa.github.io/Ocean/?v=0.18.9'),station=option('station','slope'),seconds=Number(option('seconds','15'));
const expectedVersion=option('expected-version','0.18.9'),output=path.resolve(__dirname,'../..',option('out','qa/parity/native-scene-diagnostic.json'));
assert(['midwater','slope'].includes(station),'Choose --station=midwater or --station=slope');
assert(Number.isFinite(seconds)&&seconds>=10&&seconds<=60,'Duration must be 10–60 seconds per stationary probe');
const summary=values=>{if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
const result={url,station,requestedSeconds:seconds,controls:{viewport:[1440,900],deviceScaleFactor:2,quality:2,scale:.64,adaptive:false},method:'Installed Chrome hardware GPU, isolated save, real UI dive and guide route, unmodified RAF/simulation. Stationary reef and destination probes have CPU sampling profiles and at most three complete-render GPU queries. Transit is recorded without profiling or GPU queries. Query availability/disjoint and GL errors are read only at probe boundaries. No physical-phone, battery, input-latency or uninstrumented FPS claim.',errors:[],profiles:[],probes:[],routeSamples:[]};
let browser,page,cdp,profiling=false;
function summarizeSegment(segment){
 const continuous=segment.frames.filter(f=>f.continuous).map(f=>f.intervalMs),mean=summary(continuous);
 return {...segment,continuousFrameMs:mean,continuousFPS:mean?1000/mean.mean:null,cpuFrameMs:summary(segment.frames.map(f=>f.cpuMs)),rendererCallMs:summary(segment.frames.map(f=>f.rendererCallMs)),streamMsSinceRenderedFrame:summary(segment.frames.map(f=>f.streamMsSinceRenderedFrame)),gpuFrameMs:summary(segment.gpu.filter(q=>q.status==='available').map(q=>q.ms))};
}
async function beginSegment(label,gpu=false){await page.evaluate(({label,gpu,seconds})=>{
 if(document.hidden||!document.hasFocus())throw Error('Diagnostic probe must start in the foreground');
 const d=window.__sceneDiagnostic;d.current={label,start:performance.now(),position:player.p.slice(),frames:[],gpu:[],gpuEnabled:gpu,nextQuery:performance.now(),querySpacing:seconds*1000/3,queries:0};d.segments.push(d.current);d.previous=0;d.streamMs=0;d.staticUpdates=renderer.staticShadowUpdates||0;
},{label,gpu,seconds});}
async function endSegment(){return page.evaluate(()=>{
 const d=window.__sceneDiagnostic,s=d.current;if(!s)return null;s.elapsedMs=performance.now()-s.start;s.finalPosition=player.p.slice();s.resolution=[renderer.canvas.width,renderer.canvas.height];s.msaa=renderer.msaaSamples;s.quality=renderer.quality;s.scale=renderer.dynamicScale;s.adaptive=settings.adaptive;
 if(d.ext&&d.pending.length){const disjoint=d.gl.getParameter(d.ext.GPU_DISJOINT_EXT);for(const q of d.pending){const available=d.gl.getQueryParameter(q.query,d.gl.QUERY_RESULT_AVAILABLE);s.gpu.push({atMs:q.atMs,status:disjoint?'disjoint':available?'available':'not-ready',...(available&&!disjoint?{ms:d.gl.getQueryParameter(q.query,d.gl.QUERY_RESULT)/1e6}:{})});d.gl.deleteQuery(q.query);}d.pending=[];}
 s.gl=d.gl.getError();s.contextLost=d.gl.isContextLost();s.foreground=!document.hidden&&document.hasFocus();d.current=null;return s;
});}
async function probe(label){
 const profilePath=output.replace(/\.json$/,'')+'-'+label+'.cpuprofile';let segment;
 await cdp.send('Profiler.start');profiling=true;
 try{await beginSegment(label,true);await page.waitForTimeout(seconds*1000);segment=await endSegment();}
 finally{const {profile}=await cdp.send('Profiler.stop');profiling=false;fs.writeFileSync(profilePath,JSON.stringify(profile));result.profiles.push({label,path:profilePath});}
 const row=summarizeSegment(segment);result.probes.push(row);
 assert.equal(row.gl,0);assert.equal(row.contextLost,false);assert.equal(row.foreground,true);assert.equal(row.quality,2);assert.equal(row.scale,.64);assert.equal(row.adaptive,false);assert(row.frames.length>=2,'Not enough rendered frames to diagnose');
 console.log(JSON.stringify({probe:label,seconds:row.elapsedMs/1000,fps:row.continuousFPS,frameP95:row.continuousFrameMs?.p95,cpuP50:row.cpuFrameMs?.p50,cpuP95:row.cpuFrameMs?.p95,gpu:row.gpuFrameMs,resolution:row.resolution}));
}
(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 try{
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});page=await context.newPage();
  page.on('pageerror',error=>result.errors.push(error.message));page.on('crash',()=>result.errors.push('Renderer process crashed'));
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  await page.locator('#startBtn').click();await page.waitForFunction(()=>active&&!modal);await page.bringToFront();
  result.metadata=await page.evaluate(()=>{
   const gl=renderer.gl,debug=gl.getExtension('WEBGL_debug_renderer_info');settings.adaptive=false;settings.quality=2;renderer.quality=2;renderer.dynamicScale=.64;renderer.resize();oceanPerf.resetSamples();
   return {version:document.documentElement.dataset.version,userAgent:navigator.userAgent,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,compiled:renderer.sceneLoad.compiled,position:player.p.slice()};
  });
  assert.equal(result.metadata.version,expectedVersion);assert(result.metadata.compiled);assert(result.metadata.renderer&&!/swiftshader|llvmpipe|software/i.test(result.metadata.renderer),'Native hardware GPU required');
  await page.waitForFunction(()=>!renderer.pendingResize&&!renderer.sceneStream?.waitStarted);await page.waitForTimeout(2000);
  cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
  result.timerAvailable=await page.evaluate(()=>{
   const gl=renderer.gl,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),record=oceanPerf.record,render=renderer.render,stream=renderer.sceneStream,update=stream?.update;
   const d=window.__sceneDiagnostic={gl,ext,current:null,segments:[],pending:[],previous:0,streamMs:0,renderMs:0,staticUpdates:renderer.staticShadowUpdates||0};
   if(stream)stream.update=function(...args){const start=performance.now();try{return update.apply(this,args);}finally{d.streamMs+=performance.now()-start;}};
   renderer.render=function(...args){
    const start=performance.now(),s=d.current,query=ext&&s?.gpuEnabled&&s.queries<3&&start>=s.nextQuery?gl.createQuery():null;let rendered=false;
    if(query){gl.beginQuery(ext.TIME_ELAPSED_EXT,query);s.queries++;s.nextQuery=start+s.querySpacing;}
    try{const value=render.apply(this,args);rendered=value!==false;return value;}
    finally{d.renderMs=performance.now()-start;if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);if(rendered)d.pending.push({query,atMs:start-s.start});else gl.deleteQuery(query);}}
   };
   oceanPerf.record=function(ms,cpu){
    const continuous=this.previous>0;record.call(this,ms,cpu);const s=d.current;if(!s)return;
    const updates=renderer.staticShadowUpdates||0;
    if(d.previous)s.frames.push({atMs:ms-s.start,intervalMs:ms-d.previous,continuous,cpuMs:cpu,rendererCallMs:d.renderMs,streamMsSinceRenderedFrame:d.streamMs,staticShadowUpdates:updates-d.staticUpdates,shadowDraws:renderer.shadowDraws,drawCalls:renderer.drawCalls,triangles:renderer.submittedTriangles,pendingChunks:stream?.jobs.size||0,position:player.p.slice()});
    d.previous=ms;d.streamMs=0;d.staticUpdates=updates;
   };
   return !!ext;
  });
  await probe('reef');
  await beginSegment('transit');
  await page.locator('#fieldToolsBtn').click();await page.locator('#diveRecords [data-feature="deepsea"]').click();await page.locator('[data-deepsea-station="'+station+'"]').click();
  await page.waitForFunction(id=>oceanDeepsea.snapshot().travelTarget===id&&!modal,station);
  const travelStart=Date.now();let lastReport=-1;
  while(true){
   const state=await page.evaluate(id=>({elapsedMs:performance.now()-__sceneDiagnostic.current.start,deep:oceanDeepsea.snapshot(),position:player.p.slice(),stationDistance:V.dist(player.p,DeepseaRules.station(id).p),active,modal,focus:document.hasFocus(),hidden:document.hidden,waiting:!!renderer.sceneStream?.waitStarted,pendingChunks:renderer.sceneStream?.jobs.size||0,failedChunks:renderer.sceneStream?.failures.size||0,quality:renderer.quality,scale:renderer.dynamicScale}),station);
   result.routeSamples.push(state);assert(state.active&&!state.hidden&&state.focus,'Route must stay active and foreground');
   if(Math.floor(state.elapsedMs/15000)>lastReport){lastReport=Math.floor(state.elapsedMs/15000);console.log(JSON.stringify({route:station,seconds:state.elapsedMs/1000,depth:-state.position[1],pending:state.pendingChunks,waiting:state.waiting}));}
   if(!state.deep.travelTarget&&!state.waiting&&!state.modal){assert.equal(state.deep.station,station);assert(state.stationDistance<50,'Guide must arrive at the actual station');break;}
   assert(Date.now()-travelStart<420000,'Normal-speed guide route exceeded seven minutes');await page.waitForTimeout(1000);
  }
  result.transit=summarizeSegment(await endSegment());await page.waitForTimeout(2000);await probe(station);assert.deepEqual(result.errors,[]);result.status='complete';
 }catch(error){result.status='failed';result.failure=error.stack;throw error;}
 finally{
  if(profiling&&cdp)try{const {profile}=await cdp.send('Profiler.stop');const file=output.replace(/\.json$/,'')+'-interrupted.cpuprofile';fs.writeFileSync(file,JSON.stringify(profile));result.profiles.push({label:'interrupted',path:file});}catch(_){}
  if(result.status!=='complete'&&page&&!page.isClosed())try{result.interruptedSegments=await page.evaluate(()=>window.__sceneDiagnostic?.segments.map(({gpuEnabled,nextQuery,querySpacing,...s})=>s)||[]);}catch(_){}
  await browser?.close();fs.writeFileSync(output,JSON.stringify(result,null,2));console.log('Diagnostic artifact: '+output);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
