/* Controlled native GPU experiment, not natural gameplay/FPS evidence.
 * Only WATER_FS is switched in one context. Candidate choices preserve the
 * original optical expressions: skip unused sky, or explicitly unroll waves.
 * Run alone; desktop and touch-emulation browsers are strictly sequential. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const url=option('url',process.argv.find(v=>/^https?:/.test(v))||'http://127.0.0.1:8765/');
const pixelsOnly=process.argv.includes('--pixels-only'),profileID=option('profile','all'),candidateID=option('candidate','tir'),viewID=option('view','all');
assert(['tir','unroll'].includes(candidateID),'--candidate must be tir or unroll');
const output=path.resolve(root,option('out','qa/parity/water-reflection-gpu-'+candidateID+(pixelsOnly?'-pixels':'')+'.json'));
const source=fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),context=vm.createContext({console,performance});
vm.runInContext(source,context);
const originalShader=vm.runInContext('WATER_FS',context),vertexShader=vm.runInContext('WATER_VS',context);
const transmission=' vec3 transmitted=skyRadiance(airRay/max(length(airRay),.001));';
assert.equal(originalShader.split(transmission).length,2,'Expected exactly one original transmission expression; update the adapter explicitly if production changes');
let candidateShader;
if(candidateID==='tir')candidateShader=originalShader.replace(transmission,' if(window<.5){frag=vec4(max(reflected,vec3(0.)),1.);return;}\n'+transmission);
else{
 const iteration=`angle=k*2.399963+.37;vec2 direction=vec2(cos(angle),sin(angle));
  float frequency=oceanWaveNumber(k),phase=oceanPhase(p,time,k,direction);
  float filtered=1.-smoothstep(.55,2.5,footprint*frequency);
  float slope=.023/(1.+k*.18)*filtered;
  result.xy+=direction*cos(phase)*slope;
  result.z+=sin(phase)*slope/frequency;`;
 const loop=' for(int i=0;i<10;i++){float k=float(i),'+iteration+'\n }';
 assert.equal(originalShader.split(loop).length,2,'Expected exactly one original ten-wave loop; update the adapter explicitly if production changes');
 // Preserve every iteration expression and accumulation order. Only the loop
 // counter becomes a scoped literal, and WATER_VS stays entirely untouched.
 const unrolled=Array.from({length:10},(_,k)=>' {const float k='+k+'.;float '+iteration+'\n }').join('\n');
 candidateShader=originalShader.replace(loop,unrolled);
}
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sourceIdentity={baselineCommit:'07ac078ca0e2a72e70d005888836725aec1a9882',candidate:candidateID,engineSHA256:hash(source),originalWaterSHA256:hash(originalShader),candidateWaterSHA256:hash(candidateShader),vertexSHA256:hash(vertexShader)};
// Pin the verified original shader. Otherwise, after promoting the candidate,
// this experiment could silently compare the optimization against itself.
assert.equal(sourceIdentity.originalWaterSHA256,'c67556acdec54924a15a53ec35080bde7a1e6f032d9d44d6945413d4a72adb58','Original water shader changed; supply an explicit baseline fixture before rerunning');
assert.equal(sourceIdentity.vertexSHA256,'9cfbffc88c8f3d23b6ace4b0edeb1fec0d804d3e2867f23717c0c219c0a0a296','Water geometry shader changed; refresh the experiment explicitly');
const profiles=[{id:'desktop',touch:false,viewport:{width:1280,height:800},dpr:2,quality:2},{id:'touch',touch:true,viewport:{width:390,height:844},dpr:3,quality:1}].filter(p=>profileID==='all'||p.id===profileID);
assert(profiles.length,'--profile must be all, desktop or touch');
const fixedTime=Number(option('time','8')),yaw=.2157207325621963,spawn=[-22.6,-2.2,52.5];
assert(Number.isFinite(fixedTime),'--time must be finite');
const direction=(pitch,viewYaw)=>[Math.sin(viewYaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(viewYaw)*Math.cos(pitch)];
const view=(id,p,pitch,coverage,viewYaw=yaw)=>({id,p,aim:p.map((v,i)=>v+direction(pitch,viewYaw)[i]),pitch,yaw:viewYaw,coverage});
// Offshore avoids the ship/shore foreground; the day sun direction determines
// a downward mirror view containing reflected sky and the sun highlight.
const abovePitch=-Math.atan2(.86,Math.hypot(.36,.34)),aboveYaw=Math.atan2(-.36,.34);
const views=[view('initial-spawn',spawn,-.09,'tir'),view('below-window',spawn,.15,'tir'),view('up-through-window',spawn,1.20,'transmission'),view('down-at-reef',spawn,-1.20,null),view('above-surface',[390,2.2,-184],abovePitch,'air',aboveYaw)].filter(v=>viewID==='all'||v.id===viewID);
assert(views.length,'--view must be all or one of the named fixture views');
const candidateDescription=candidateID==='tir'?'a total-reflection early return before the unused sky expression':'explicit scoped constants k=0 through9 replacing the exact ten-wave loop in its original accumulation order';
const result={url,pixelsOnly,fixedTime,selectedViews:views.map(v=>v.id),sourceIdentity,status:'running',profiles:[],errors:[],method:'Controlled visible native Chrome. Selected fixed optical views; __prepareView fixes time/camera/content and adaptive quality is disabled for comparison. Streaming downloads and real deferred eviction of previous-view geometry must settle before the baseline. Same context, production WATER_FS versus '+candidateDescription+'. WATER_VS is unchanged. ABBA per view, 10 warm frames and 25 complete-render GPU queries per block (pixels-only: 2 warm frames and no timer queries). No nested/per-pass timing queries. Full final RGBA comparison allows at most 1/255 difference in fewer than 0.01% of channels; observed differences are reported without assuming their cause. Visible water branches are verified separately using GPU occlusion queries against the actual original multisample scene depth when present, otherwise its single-sample scene depth, with color/depth writes disabled. This proves branch presence, not a coverage percentage. Geometry, draw count, MSAA, quality and framebuffer must remain fixed. A passed experiment does not establish a speed benefit. No gameplay FPS, physical-phone, battery or per-pass GPU attribution claim.'};
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:null;};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));};

async function capture(profile){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});let browserContext;
 const row={profile,views:[]};result.profiles.push(row);
 try{
  browserContext=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,isMobile:profile.touch,hasTouch:profile.touch});
  const page=await browserContext.newPage();page.on('pageerror',e=>result.errors.push(profile.id+': '+e.message));page.on('crash',()=>result.errors.push(profile.id+': renderer crashed'));
  await page.addInitScript(quality=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,third:false,lamp:false,startWithSound:false,reduced:true}})),profile.quality);
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await page.bringToFront();
  await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  row.meta=await page.evaluate(({originalShader,candidateShader,vertexShader,pixelsOnly,profile,fixedTime})=>{
   if(WATER_FS!==originalShader||WATER_VS!==vertexShader)throw Error('Served water shaders differ from local source; rebuild before testing');
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Native hardware renderer required, found '+hardware);
   const ext=g.getExtension('EXT_disjoint_timer_query_webgl2');if(!pixelsOnly&&!ext)throw Error('Complete-frame timer queries unavailable; no timing claim');
   settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=profile.quality;renderer.dynamicScale=1;renderer.resize();
   const original=renderer.waterProgram,owned=[],queries=new Set(),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const compile=fragment=>{const program=renderer.makeProgram(vertexShader,fragment);owned.push(program);return program;};
   const candidate=compile(candidateShader);
   // Discards are inserted into the ORIGINAL optical shader. The rasterizer,
   // displaced mesh, wave normals and Snell decision remain actual GPU work.
   const masks={};
   for(const kind of ['tir','transmission','air']){
    let fragment=originalShader.replace('void main(){','void main(){\n if('+(kind==='air'?'uCamera.y<=-.18':'uCamera.y>-.18')+')discard;');
    const anchor='float window=step(.001,dot(airRay,airRay));';
    if(fragment.split(anchor).length!==2)throw Error('Water mask adapter cannot locate the original Snell decision');
    if(kind!=='air')fragment=fragment.replace(anchor,anchor+'if(window'+(kind==='tir'?'>.5':'<=.5')+')discard;');
    masks[kind]=compile(fragment);
   }
   const state=()=>({quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates,waterVertices:renderer.waterCount,eye:eye.slice(),target:target.slice(),time:t,adaptive:settings.adaptive});
   const render=mode=>{renderer.waterProgram=mode==='candidate'?candidate:original;const before=renderer.frame;if(renderer.render(eye,target,t)===false||renderer.frame!==before+1)throw Error('Incomplete streamed frame is not a sample');};
   const deferredEvictions=()=>{const stream=renderer.sceneStream;if(!stream)return [];const keep=stream.neededRanges(eye).keep;return stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id);};
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Benchmark lost foreground focus');if(renderer.pendingResize||renderer.sceneStream?.jobs.size)throw Error('Resize or streaming work remains inside a fixed sample');};
   const waitQuery=async query=>{const deadline=performance.now()+10000;g.flush();while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}return g.getQueryParameter(query,g.QUERY_RESULT);};
   const deleteQuery=query=>{g.deleteQuery(query);queries.delete(query);};
   const image=async(mode,reference)=>{
    render(mode);g.bindFramebuffer(g.FRAMEBUFFER,null);const data=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,data);
    let differingChannels=0,maxDifference=0,min=255,max=0;
    for(let i=0;i<data.length;i++){if(i%4!==3){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}if(reference){const d=Math.abs(data[i]-reference[i]);if(d)differingChannels++;maxDifference=Math.max(maxDifference,d);}}
    const digest=await crypto.subtle.digest('SHA-256',data);
    return {data,pixels:{channels:data.length,differingChannels,maxDifference,range:max-min,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')}};
   };
   const coverage=async()=>{
    render('original');const result={depthTarget:renderer.msaaFBO?'original-multisample':'single-sample',samples:renderer.msaaSamples||1};
    try{
     // Reuse the ORIGINAL depth samples. A resolved MSAA depth can be nearer
     // than the pixel center on a sloping surface and falsely reject this draw.
     // LEQUAL now compares the same sample positions; no buffers are modified.
     g.bindFramebuffer(g.FRAMEBUFFER,renderer.msaaFBO||renderer.sceneFBO);g.viewport(0,0,renderer.canvas.width,renderer.canvas.height);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthMask(false);g.disable(g.BLEND);g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);g.colorMask(false,false,false,false);
     for(const [kind,program]of Object.entries(masks)){
      const query=g.createQuery();queries.add(query);
      try{renderer.common(program,eye,renderer.vp,t);g.bindVertexArray(renderer.waterVAO);g.beginQuery(g.ANY_SAMPLES_PASSED,query);g.drawArrays(g.TRIANGLES,0,renderer.waterCount);g.endQuery(g.ANY_SAMPLES_PASSED);result[kind]=!!await waitQuery(query);}finally{deleteQuery(query);}
     }
     result.gl=g.getError();return result;
    }finally{g.colorMask(true,true,true,true);g.depthMask(true);g.depthFunc(g.LESS);g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);}
   };
   window.__waterReflectionProbe={
    async prepare(view){
     renderer.waterProgram=original;await __prepareView(view.p,view.aim,fixedTime);
     // jobs===0 alone misses the five-second retention window of the previous
     // camera's meshes. Their later release invalidates the static shadow map.
     // Let the real trim path finish; never delete meshes or suppress shadows.
     const started=performance.now(),stream=renderer.sceneStream,residentBefore=stream?.meshes.filter(m=>m.resident).map(m=>m.id)||[];
     const readiness={jobsBefore:stream?.jobs.size||0,deferredBefore:deferredEvictions(),staticShadowUpdatesBefore:renderer.staticShadowUpdates};let stableFrames=0;
     while(stableFrames<3){
      if(performance.now()-started>120000)throw Error('Streaming or deferred mesh eviction did not settle');
      await raf();render('original');
      stableFrames=!stream?.jobs.size&&!deferredEvictions().length&&!renderer.pendingResize&&!renderer.forceShadow?stableFrames+1:0;
     }
     clean();const residentAfter=new Set(stream?.meshes.filter(m=>m.resident).map(m=>m.id)||[]);
     Object.assign(readiness,{elapsedMs:performance.now()-started,jobsAfter:stream?.jobs.size||0,deferredAfter:deferredEvictions(),retiredMeshes:residentBefore.filter(id=>!residentAfter.has(id)),staticShadowUpdatesAfter:renderer.staticShadowUpdates});
     const a=await image('original');this.reference=a.data;return {readiness,baselinePixels:a.pixels,coverage:await coverage(),state:state()};
    },
    async block(mode){
     for(let i=0;i<(pixelsOnly?2:10);i++){await raf();clean();render(mode);}
     const samples=[];
     for(let i=0;i<(pixelsOnly?0:25);i++){
      await raf();clean();const query=g.createQuery();queries.add(query);let begun=false;
      try{
       g.beginQuery(ext.TIME_ELAPSED_EXT,query);begun=true;const start=performance.now();render(mode);const cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);begun=false;
       const nanoseconds=await waitQuery(query);if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU sample; timing is invalid');
       const gpuMs=nanoseconds/1e6;if(!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid GPU elapsed time');samples.push({gpuMs,cpuSubmitMs});
      }finally{if(begun)g.endQuery(ext.TIME_ELAPSED_EXT);deleteQuery(query);}
     }
     const capture=await image(mode,this.reference);clean();return {mode,samples,pixels:capture.pixels,state:state(),gl:g.getError()};
    },
    restore(){renderer.waterProgram=original;for(const query of queries)g.deleteQuery(query);queries.clear();for(const program of owned)g.deleteProgram(program.p);this.reference=null;}
   };
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,timerAvailable:!!ext,quality:renderer.quality,requestedDPR:profile.dpr,viewport:profile.viewport};
  },{originalShader,candidateShader,vertexShader,pixelsOnly,profile,fixedTime});
  try{for(const fixture of views){
   const prepared=await page.evaluate(view=>__waterReflectionProbe.prepare(view),fixture),entry={fixture,...prepared,blocks:[]};row.views.push(entry);save();
   assert.equal(prepared.coverage.gl,0);if(fixture.coverage)assert.equal(prepared.coverage[fixture.coverage],true,profile.id+'/'+fixture.id+' must contain visible '+fixture.coverage+' water samples');
   for(const mode of ['original','candidate','candidate','original']){
    const block=await page.evaluate(mode=>__waterReflectionProbe.block(mode),mode);entry.blocks.push(block);save();
    assert.equal(block.gl,0);assert(block.pixels.range>20,'Controlled image must contain visible detail');
    assert(block.pixels.maxDifference<=1,'RGBA difference exceeds the predefined 8-bit tolerance');assert(block.pixels.differingChannels/block.pixels.channels<.0001,'Too many changed final RGBA channels');
    for(const key of Object.keys(prepared.state))assert.deepEqual(block.state[key],prepared.state[key],profile.id+'/'+fixture.id+' changed '+key);
   }
   if(!pixelsOnly){const original=entry.blocks.filter(b=>b.mode==='original').flatMap(b=>b.samples.map(s=>s.gpuMs)),candidate=entry.blocks.filter(b=>b.mode==='candidate').flatMap(b=>b.samples.map(s=>s.gpuMs));entry.comparison={originalMedianGpuMs:median(original),candidateMedianGpuMs:median(candidate)};entry.comparison.reductionPercent=100*(1-entry.comparison.candidateMedianGpuMs/entry.comparison.originalMedianGpuMs);}
   console.log(JSON.stringify({profile:profile.id,view:fixture.id,coverage:entry.coverage,comparison:entry.comparison||null,pixelDifferences:entry.blocks.map(b=>b.pixels.differingChannels)}));save();
  }}finally{await page.evaluate(()=>window.__waterReflectionProbe?.restore()).catch(()=>{});}
 }finally{await browserContext?.close();await browser.close();}
}

if(process.argv.includes('--check-source-only')){
 console.log(JSON.stringify({status:'source-adapter-valid',...sourceIdentity,fixedTime,profiles:profiles.map(p=>p.id),views:views.map(v=>v.id)}));
}else(async()=>{
 try{for(const profile of profiles)await capture(profile);assert.deepEqual(result.errors,[]);result.status='passed';console.log('PASS '+output);}
 catch(error){result.status='failed';result.failure=error.stack;throw error;}
 finally{save();}
})().catch(error=>{console.error(error);process.exitCode=1;});
