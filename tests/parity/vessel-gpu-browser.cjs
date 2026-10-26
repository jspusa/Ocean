/* Controlled native regression for the actual production vessel specialization.
 * Deck/cabin invoke the real feature and camera, then freeze its current view.
 * Other fixtures use __prepareView. These are not natural gameplay evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{const prefix='--'+name+'=',x=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return x?x.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const url=option('url','http://127.0.0.1:8765/'),pixelsOnly=process.argv.includes('--pixels-only'),boundedPixels=process.argv.includes('--bounded-pixels'),output=path.resolve(root,option('out','qa/parity/vessel-gpu'+(pixelsOnly?'-pixels':'')+(boundedPixels?'-bounded':'')+'.json')),profileID=option('profile','all'),viewID=option('view','all'),fixedTime=Number(option('time','8'));
assert(Number.isFinite(fixedTime),'--time must be finite');
const profiles=[{id:'desktop',touch:false,viewport:{width:1280,height:800},dpr:2,quality:2},{id:'touch',touch:true,viewport:{width:390,height:844},dpr:3,quality:1}].filter(p=>profileID==='all'||p.id===profileID);assert(profiles.length,'Invalid --profile');
const views=['initial','hull-up','deck','cabin','logger'].filter(id=>viewID==='all'||id===viewID);assert(views.length,'Invalid --view');
const pixelAcceptance=boundedPixels?{mode:'explicit-bounded',maxChannelDifference:1,changedRGBAFractionStrictlyLessThan:.0001,maxAlphaDifferences:0,genericFramesMustEqualBaselineSHA256:true,productionFramesMustRepeatSHA256:true,policy:'Opt-in limit declared before full collection: production max1/255 and strictly fewer than0.01% changed RGBA channels, alpha exact; generic A1/A2 must equal baseline, production B1/B2 must repeat. This is not byte-exact parity or proof of a rounding cause.'}:{mode:'byte-exact',maxDifferingChannels:0,maxChannelDifference:0,maxAlphaDifferences:0,genericFramesMustEqualBaselineSHA256:true,productionFramesMustRepeatSHA256:true,policy:'Default byte-exact; collect all pixel failures, then fail the run. GL, range and fixed-workload checks still fail immediately.'};
const report={url,fixedTime,pixelsOnly,boundedPixels,selectedViews:views,status:'running',profiles:[],errors:[],imageDifferences:[],pixelFailures:[],pixelAcceptance,localEngineSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/engine.js'))).digest('hex'),method:'Controlled native visible Chrome, fixed time/quality/MSAA. Actual production kind0/material12 surfaceProgram versus forced generic renderer.program ONLY for those same batches, in one context. Attached shader sources must prove production FS equals generic FS with only uKind/uMat constants0/12, and both VS sources must equal original VS. No candidate is compiled by this test. Water, shadows and every other surface/program remain unchanged. Initial/hull/logger use __prepareView; deck/cabin open real oceanFeatures and use their actual camera, then hold the view. Real streaming and old-view eviction settle before baseline. ABBA10warm+15 complete-frame queries per block; pixels-only uses2warm and no timing. Fixed workload unchanged; pixel acceptance is explicitly recorded above and defaults to byte-exact. Every nonzero image difference is reported even when it meets the opt-in bound. Failures are accumulated through all views/profiles and fail the final assertion. First differing block per mode/fixture saves original full-canvas PNGs synchronously after readPixels, outside timing. These controlled fixtures do not prove natural gameplay, physical-phone FPS, battery life or per-pass GPU cost.'};
const median=v=>{const a=v.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;},save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};

async function capture(profile){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});let context;
 const row={profile,views:[]};report.profiles.push(row);
 try{
  context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,isMobile:profile.touch,hasTouch:profile.touch});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(profile.id+': '+e.message));page.on('crash',()=>report.errors.push(profile.id+': crash'));
  await page.addInitScript(quality=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,third:false,lamp:false,startWithSound:false,reduced:true}})),profile.quality);
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await page.bringToFront();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  row.meta=await page.evaluate(async({profile,fixedTime,pixelsOnly})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware)||!pixelsOnly&&!ext)throw Error('Native hardware and, for timing, complete-frame timer required');
   settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=profile.quality;renderer.dynamicScale=1;renderer.resize();
   let expected=FS;for(const [name,value]of [['uKind',0],['uMat',12]]){const declaration='uniform int '+name+';';if(expected.split(declaration).length!==2)throw Error('Expected one original '+name+' declaration');expected=expected.replace(declaration,'const int '+name+'='+value+';');}
   const production=renderer.surfacePrograms?.get('0:12'),generic=renderer.program,originalChooser=renderer.surfaceProgram;
   if(!production||production===generic)throw Error('Production kind0/material12 specialization missing');
   const shaderSource=(program,type)=>{const shader=(g.getAttachedShaders(program.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!shader)throw Error('Attached shader unavailable');return g.getShaderSource(shader);};
   if(shaderSource(production,g.VERTEX_SHADER)!==VS||shaderSource(generic,g.VERTEX_SHADER)!==VS)throw Error('Both paths must use the original byte-identical VS');
   if(shaderSource(production,g.FRAGMENT_SHADER)!==expected||shaderSource(generic,g.FRAGMENT_SHADER)!==FS)throw Error('Actual production/generic FS does not match the required exact specialization');
   const unchanged=new Map(['program','waterProgram','shadowProgram','skyProgram','pointProgram','bubbleProgram','rayProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'].map(key=>[key,renderer[key]])),surfaceMap=renderer.surfacePrograms,surfaces=new Map(surfaceMap);
   const queries=new Set(),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));let specialized=false,counts=new Map(),selected=[];
   renderer.surfaceProgram=function(batch){
    const key=batch.kind+':'+batch.material,entry=counts.get(key)||{kind:batch.kind,material:batch.material,batches:0,instances:0,triangles:0};entry.batches++;entry.instances+=batch.drawCount;entry.triangles+=batch.count/3*batch.drawCount;counts.set(key,entry);
    const chosen=originalChooser.call(this,batch);
    if(batch.kind===0&&batch.material===12){if(chosen!==production)throw Error('Production chooser did not select its real0:12 program');selected.push({index:renderer.batches.indexOf(batch),dynamic:!!batch.dynamic,sceneRole:batch.sceneRole||null,shipAttachment:!!batch.shipAttachment,maxDistance:batch.maxDistance||null,instances:batch.drawCount,triangles:batch.count/3*batch.drawCount,positions:batch.instances.map(i=>i.p.slice())});return specialized?chosen:generic;}
    return chosen;
   };
   const render=()=>{counts=new Map();selected=[];const before=renderer.frame;if(renderer.render(eye,target,t)===false||renderer.frame!==before+1)throw Error('Incomplete streamed frame');};
   const state=()=>({quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates,eye:eye.slice(),target:target.slice(),time:t,adaptive:settings.adaptive,active,modal,shipMode:oceanShip.snapshot().mode,photoFov:renderer.photoFov||null,photoAperture:renderer.photoAperture||0,lamp:renderer.lamp,unchangedPrograms:[...unchanged].every(([key,program])=>renderer[key]===program)&&renderer.surfacePrograms===surfaceMap&&surfaceMap.size===surfaces.size&&[...surfaces].every(([key,program])=>surfaceMap.get(key)===program),selectedBatches:selected,colorBatches:[...counts.values()].sort((a,b)=>a.kind-b.kind||a.material-b.material)});
   const outside=()=>{const stream=renderer.sceneStream;if(!stream)return [];const keep=stream.neededRanges(eye).keep;return stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id);};
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Lost focus');if(g.isContextLost()||renderer.pendingResize||renderer.sceneStream?.jobs.size||outside().length||renderer.forceShadow)throw Error('Unsettled fixed workload');};
   const pixels=async(reference)=>{render();g.bindFramebuffer(g.FRAMEBUFFER,null);const data=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,data);let differingChannels=0,alphaDifferences=0,maxDifference=0,min=255,max=0;for(let i=0;i<data.length;i++){if(i%4!==3){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}if(reference){const d=Math.abs(data[i]-reference[i]);if(d){differingChannels++;if(i%4===3)alphaDifferences++;}maxDifference=Math.max(maxDifference,d);}}const png=!reference||differingChannels?renderer.canvas.toDataURL('image/png'):null;const digest=await crypto.subtle.digest('SHA-256',data);return {data,png,report:{channels:data.length,differingChannels,alphaDifferences,maxDifference,range:max-min,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')}};};
   window.__vesselProbe={
    async prepare(id){
     specialized=false;window.__freeze=true;closePanel();
     let loggerIndex=null;
     if(id==='deck'||id==='cabin'){
      if(active)goHome();t=fixedTime;oceanFeatures.open(id);oceanFeatures.call('idleTick',0);updateLife(t);updateCamera(0);oceanFeatures.call('afterCamera',0);applyVisualSettings();
      if(active||modal!==id||oceanShip.snapshot().mode!==id)throw Error('Real ship feature/camera did not open: '+id);
      if(renderer.sceneStream)await renderer.sceneStream.ready(eye);renderer.forceShadow=true;
     }else{
      const p=[-22.6,-2.2,52.5],yaw=.2157207325621963,pitch=id==='hull-up'?.15:-.09;let aim=[p[0]+Math.sin(yaw)*Math.cos(pitch),p[1]+Math.sin(pitch),p[2]-Math.cos(yaw)*Math.cos(pitch)];
      if(id==='logger'){
       const matches=renderer.batches.filter(b=>b.kind===0&&b.material===12&&b.maxDistance===70&&b.instances.some(i=>Math.abs(i.p[0]-95)<.001&&Math.abs(i.p[2]+147)<.001));
       if(matches.length!==1)throw Error('Expected one actual wreck logger batch');const logger=matches[0],at=logger.instances.find(i=>Math.abs(i.p[0]-95)<.001&&Math.abs(i.p[2]+147)<.001).p;loggerIndex=renderer.batches.indexOf(logger);p.splice(0,3,at[0]+.8,at[1]+.35,at[2]+2.8);aim=at.slice();
      }
      await __prepareView(p,aim,fixedTime);
     }
     // Hold the actual feature camera/poses. The global still flag prevents
     // normal RAF from advancing deck actors or calling an alternate camera.
     const begin=performance.now(),readiness={outsideBefore:outside(),jobsBefore:renderer.sceneStream?.jobs.size||0};let stable=0;
     while(stable<3){if(performance.now()-begin>120000)throw Error('Readiness timeout');await raf();render();stable=!outside().length&&!renderer.sceneStream?.jobs.size&&!renderer.pendingResize&&!renderer.forceShadow?stable+1:0;}
     Object.assign(readiness,{elapsedMs:performance.now()-begin,outsideAfter:outside(),jobsAfter:renderer.sceneStream?.jobs.size||0});clean();if(!selected.length)throw Error('No actual kind0/material12 draw');if(loggerIndex!==null&&!selected.some(b=>b.index===loggerIndex))throw Error('Actual logger not drawn');
     const baseline=await pixels();this.reference=baseline.data;this.referencePNG=baseline.png;this.capturedModes=new Set();return {id,loggerIndex,readiness,baseline:state(),baselinePixels:baseline.report};
    },
    async block(useProduction){specialized=useProduction;for(let i=0;i<(pixelsOnly?2:10);i++){await raf();clean();render();}const samples=[];
     for(let i=0;i<(pixelsOnly?0:15);i++){await raf();clean();const query=g.createQuery();queries.add(query);let begun=false;
      try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);begun=true;const start=performance.now();render();const cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);begun=false;g.flush();const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU sample');const gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6;if(!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid elapsed time');samples.push({gpuMs,cpuSubmitMs});}finally{if(begun)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}
     }
     const image=await pixels(this.reference);clean();let images=null;if(image.report.differingChannels&&!this.capturedModes.has(useProduction)){this.capturedModes.add(useProduction);images={baseline:this.referencePNG,current:image.png};}return {production:useProduction,samples,pixels:image.report,state:state(),gl:g.getError(),images};
    },
    restore(){renderer.surfaceProgram=originalChooser;for(const query of queries)g.deleteQuery(query);queries.clear();this.reference=null;this.referencePNG=null;this.capturedModes=null;}
   };
   const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,genericFragmentSHA256:await sha(FS),productionFragmentSHA256:await sha(expected),vertexSHA256:await sha(VS),actualAttachedSourcesVerified:true};
  },{profile,fixedTime,pixelsOnly});save();
  try{for(const id of views){
   const fixture=await page.evaluate(id=>__vesselProbe.prepare(id),id),entry={...fixture,blocks:[]};row.views.push(entry);save();assert.equal(entry.baseline.unchangedPrograms,true);
   for(const production of [false,true,true,false]){
    const block=await page.evaluate(enabled=>__vesselProbe.block(enabled),production),images=block.images;delete block.images;
    if(images){const prefix=output.replace(/\.json$/i,'')+'-'+profile.id+'-'+id,mode=production?'production':'generic';block.pixelArtifacts={};for(const [name,data]of Object.entries(images)){assert(data?.startsWith('data:image/png;base64,'),'Expected original canvas PNG');const imagePath=prefix+'-'+(name==='baseline'?'baseline-generic':mode+'-first-difference')+'.png';fs.writeFileSync(imagePath,Buffer.from(data.slice('data:image/png;base64,'.length),'base64'));block.pixelArtifacts[name]=path.relative(root,imagePath);}}
    entry.blocks.push(block);save();assert.equal(block.gl,0);assert(block.pixels.range>20);assert.deepEqual(block.state,entry.baseline,'Fixed workload changed');
    const difference={profile:profile.id,view:id,block:entry.blocks.length,production,differingChannels:block.pixels.differingChannels,channels:block.pixels.channels,alphaDifferences:block.pixels.alphaDifferences,maxDifference:block.pixels.maxDifference,pixelArtifacts:block.pixelArtifacts||null},reasons=[];
    if(block.pixels.differingChannels)report.imageDifferences.push(difference);
    if(!production&&block.pixels.sha256!==entry.baselinePixels.sha256)reasons.push('Generic frame must equal the original baseline SHA256');
    if(production){if(entry.productionReferenceSHA256&&entry.productionReferenceSHA256!==block.pixels.sha256)reasons.push('Production B1/B2 SHA256 must repeat exactly');else entry.productionReferenceSHA256=block.pixels.sha256;}
    if(block.pixels.alphaDifferences)reasons.push('Alpha channels must remain exact');
    if(boundedPixels){if(block.pixels.maxDifference>1||block.pixels.differingChannels*10000>=block.pixels.channels)reasons.push('Production image exceeds max1/255 or strictly fewer than0.01% changed RGBA channels');}
    else if(block.pixels.differingChannels)reasons.push('Default full final RGBA must remain byte-exact');
    if(reasons.length)report.pixelFailures.push({...difference,reasons});
    block.medianGpuMs=median(block.samples.map(s=>s.gpuMs));save();console.log(JSON.stringify({profile:profile.id,view:id,production,medianGpuMs:block.medianGpuMs,pixels:block.pixels.differingChannels,maxDifference:block.pixels.maxDifference,selectedBatches:block.state.selectedBatches}));
   }
   if(!pixelsOnly){const generic=entry.blocks.filter(b=>!b.production).flatMap(b=>b.samples.map(s=>s.gpuMs)),production=entry.blocks.filter(b=>b.production).flatMap(b=>b.samples.map(s=>s.gpuMs));entry.comparison={genericMedianGpuMs:median(generic),productionMedianGpuMs:median(production)};entry.comparison.reductionPercent=100*(1-entry.comparison.productionMedianGpuMs/entry.comparison.genericMedianGpuMs);console.log(JSON.stringify({profile:profile.id,view:id,comparison:entry.comparison}));}save();
  }}finally{await page.evaluate(()=>window.__vesselProbe?.restore()).catch(()=>{});}
 }finally{await context?.close();await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({root,profiles:profiles.map(p=>p.id),views,fixedTime,pixelsOnly,boundedPixels,pixelAcceptance,status:'options-valid-no-gpu-run'}));
else(async()=>{try{for(const profile of profiles)await capture(profile);assert.deepEqual(report.errors,[]);assert.deepEqual(report.pixelFailures,[],pixelAcceptance.mode+' pixel acceptance failed; all requested cases were collected');report.status='passed';console.log('PASS '+output);}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{save();}})().catch(error=>{console.error(error);process.exitCode=1;});
