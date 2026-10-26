/* Sustained real RAF/WebGL exploration using the player's visible controls.
 * No accelerated simulation, teleport, fixed-camera loop or synthetic FPS.
 * Run alone; touch mode still uses this computer's GPU, not a physical phone.
 * The default run is 20 wall-clock minutes after the real start action. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','https://jspusa.github.io/Ocean/'),seconds=Number(option('seconds','1200')),touch=option('profile','desktop')==='touch';
assert(Number.isFinite(seconds)&&seconds>=30&&seconds<=3600,'Duration must be 30–3600 seconds');
const root=path.resolve(__dirname,'../..'),output=path.resolve(root,option('out','qa/parity/native-exploration-endurance-'+(touch?'touch':'desktop')+'.json'));
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const errors=[],journeys=[],samples=[];let result=null,metadata=null;
function summary(values){if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b),sum=a.reduce((n,x)=>n+x,0);return {count:a.length,mean:sum/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};}
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Renderer process crashed'));
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  await press('#startBtn');await page.waitForFunction(()=>active&&!modal);await page.bringToFront();
  metadata=await page.evaluate(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,userAgent:navigator.userAgent,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,adaptive:settings.adaptive,quality:renderer.quality,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,position:player.p.slice(),species:SPECIES.length,compiled:renderer.sceneLoad.compiled,stations:OceanTrench.stations.map(s=>({id:s.id,p:s.p.slice()}))};});
  assert(metadata.renderer&&!/swiftshader|llvmpipe|software/i.test(metadata.renderer),'Native hardware GPU required');assert.equal(metadata.version,expectedVersion,'The intended release must actually be served');assert.equal(metadata.adaptive,true);assert.equal(metadata.compiled,true);
  await page.evaluate(()=>{
   const original=oceanPerf.record,first=performance.now();
   window.__endurance={first,previous:0,frames:[],distance:0,previousPosition:player.p.slice()};
   oceanPerf.record=function(ms,cpu){
    const continuous=this.previous>0;original.call(this,ms,cpu);const s=window.__endurance;
    // Keep both uninterrupted-render intervals and all visible intervals. The
    // latter includes streaming and the short menus used to choose each route.
    if(s.previous)s.frames.push([ms-first,ms-s.previous,cpu,continuous?1:0,renderer.dynamicScale]);
    s.previous=ms;s.distance+=V.dist(s.previousPosition,player.p);s.previousPosition=player.p.slice();
   };
  });
  const began=Date.now();let station=0,travelStarted=0,lastSample=-1,lastMinute=-1,observation=null;
  const stations=['midwater','slope','hadal','slope','midwater'];
  while(Date.now()-began<seconds*1000){
   const state=await page.evaluate(()=>({elapsed:(performance.now()-__endurance.first)/1000,active,modal,ready,focus:document.hasFocus(),hidden:document.hidden,deep:oceanDeepsea.snapshot(),p:player.p.slice(),scale:renderer.dynamicScale,quality:renderer.quality,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,lost:renderer.gl.isContextLost(),streamWaiting:!!renderer.sceneStream?.waitStarted,failedChunks:renderer.sceneStream?.failures.size||0,lastStreamErrorAt:renderer.sceneStream?.lastError||null,stats:window.__oceanStats||null,heap:performance.memory?.usedJSHeapSize??null,frames:__endurance.frames.length,distance:__endurance.distance}));
   assert(state.ready&&state.active&&!state.lost,'The actual dive must remain playable');assert(!state.hidden&&state.focus,'A background/unfocused run is not valid endurance evidence');
   if(Math.floor(state.elapsed/10)>lastSample){lastSample=Math.floor(state.elapsed/10);samples.push(state);}
   if(Math.floor(state.elapsed/60)>lastMinute){lastMinute=Math.floor(state.elapsed/60);console.log(JSON.stringify({minute:lastMinute,depth:Math.round(-state.p[1]),frames:state.frames,scale:state.scale,fps:state.stats?.fps,heap:state.heap,travel:state.deep.travelTarget}));}
   if(state.deep.holding&&!state.modal&&!state.streamWaiting){
    const trip=journeys.at(-1);assert(travelStarted&&trip,'An observation stop must belong to a requested journey');
    assert.equal(state.deep.guideMode,'observing');assert.equal(state.deep.travelTarget,trip.station);
    if(!observation){
     assert(!trip.stops.some(s=>s.encounter===state.deep.encounter),'Continuation must not repeat a completed encounter in the same journey');
     observation={encounter:state.deep.encounter,startedAtSeconds:state.elapsed,position:state.p};trip.stops.push(observation);
    }
    assert.equal(state.deep.encounter,observation.encounter,'The encounter must remain until the player continues');
    if(state.elapsed-observation.startedAtSeconds>=15){
     // Use a real click/tap after an actual wall-clock observation interval.
     // The current guide has no automatic dwell timeout or injected resume.
     await press('#deepseaContinue');
     await page.waitForFunction(id=>oceanDeepsea.snapshot().travelTarget===id&&oceanDeepsea.snapshot().guideMode==='traveling'&&!modal,trip.station);
     observation.continuedAtSeconds=await page.evaluate(()=>(performance.now()-__endurance.first)/1000);observation=null;
    }
   }
   if(!state.deep.travelTarget&&!state.modal&&!state.streamWaiting){
    assert.equal(observation,null,'An observation cannot end without explicit continuation');
    if(travelStarted){
     const trip=journeys.at(-1),target=metadata.stations.find(s=>s.id===trip.station);
     assert(target,'Requested station must exist in the loaded world');
     const arrivalDistance=Math.hypot(...state.p.map((v,i)=>v-target.p[i]));
     // The nearest-station label changes during transit; it alone is not proof
     // of arrival. Require the actual position inside the 45 m station area.
     assert.equal(state.deep.station,trip.station,'The arrival station classification must match the requested station');
     assert(arrivalDistance<45,'A cleared route must reach the requested observation area, not stop or cancel en route');
     trip.arrivedAtSeconds=state.elapsed;trip.arrival=state.p;trip.arrivalStation=state.deep.station;trip.arrivalDistance=arrivalDistance;
     assert(state.elapsed-travelStarted<420,'A guide route must finish rather than silently stop moving');travelStarted=0;
    }
    const id=stations[station++%stations.length];
    await press('#fieldToolsBtn');await press('#diveRecords [data-feature="deepsea"]');await press('[data-deepsea-station="'+id+'"]');
    await page.waitForFunction(id=>oceanDeepsea.snapshot().travelTarget===id&&oceanDeepsea.snapshot().guideMode==='traveling'&&!modal,id);
    journeys.push({station:id,startedAtSeconds:state.elapsed,from:state.p,stops:[]});travelStarted=state.elapsed;
   }
   if(travelStarted)assert(state.elapsed-travelStarted<420,'Real-time guide route exceeded seven minutes');
   await page.waitForTimeout(1000);
  }
  const raw=await page.evaluate(()=>({elapsedMs:performance.now()-__endurance.first,frames:__endurance.frames,distance:__endurance.distance,position:player.p.slice(),adaptive:settings.adaptive,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost()}));
  const continuous=raw.frames.filter(f=>f[3]).map(f=>f[1]),visible=raw.frames.map(f=>f[1]);
  result={...raw,continuousFrameMs:summary(continuous),visibleIntervalMs:summary(visible),recordedFrameIntervalsPerSecond:raw.frames.length*1000/raw.elapsedMs,averageVisibleFPS:visible.length?visible.length*1000/visible.reduce((a,b)=>a+b,0):null,cpuFrameMs:summary(raw.frames.map(f=>f[2])),averageContinuousFPS:continuous.length?1000/(continuous.reduce((a,b)=>a+b,0)/continuous.length):null,completedRoutes:journeys.filter(j=>j.arrivedAtSeconds!==undefined).length};
  assert(result.elapsedMs>=seconds*1000);assert(result.frames.length>seconds*5,'Too few actually rendered frames');assert(result.distance>100,'The player must actually travel through the world');assert(result.adaptive);assert.equal(result.gl,0);assert.equal(result.lost,false);assert.deepEqual(errors,[]);
  if(seconds>=1200){assert(result.completedRoutes>=3,'Twenty-minute run must traverse all three depth bands');assert(samples.some(s=>s.p[1]<-6900),'The real route must reach the hadal zone');}
  await page.screenshot({path:output.replace(/\.json$/,'.png')});
  console.log('STABLE '+seconds+' seconds of real native exploration (no FPS target asserted): '+result.frames.length+' rendered frames, '+result.completedRoutes+' completed guide routes');
 }finally{
  await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({url,requestedSeconds:seconds,touchEmulation:touch,method:'Installed Chrome native GPU; isolated new save; visible start/guide/continue controls and unmodified real RAF/simulation. Each encounter waits at least fifteen wall-clock seconds before a real continuation click/tap. No coordinate or clock advancement. Continuous frame intervals exclude explicit app pause and sampling reset boundaries, including adaptive-resolution resets; visible intervals include menu and streaming gaps. Focus, visibility and stream failures are sampled about once per second; GL errors are read at the final boundary only. Successful completion asserts continuity, not a smoothness/FPS target. No input-latency, temperature, battery or physical-phone claim.',metadata,journeys,samples,result,errors},null,2));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
