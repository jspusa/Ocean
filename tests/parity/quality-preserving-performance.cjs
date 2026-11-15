/* Differential renderer regression against the original 0.17 release.
 * Run an original checkout on :8001 and the candidate on :8000. Small identical
 * framebuffers keep software-WebGL comparisons practical; this is not device FPS. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const originalURL=option('original','http://127.0.0.1:8001/'),candidateURL=option('candidate','http://127.0.0.1:8000/');
const out=option('out','qa/parity/quality-preserving-performance.json'),baselinePath=option('baseline','qa/parity/quality-original.json');
const existingOnly=process.argv.includes('--existing-content-only');
const unchangedWork=process.argv.includes('--unchanged-work');
// Specialization may increase uniforms; preserve geometry, pixels and cadence.
const sameGeometry=process.argv.includes('--same-geometry');
// Release pixel gates can reuse this differential without the historical
// cadence expectation. The default still runs and requires both cadence probes.
const pixelsOnly=process.argv.includes('--pixels-only');
const constructionOnly=process.argv.includes('--construction-only');
const constructionViews=process.argv.includes('--construction-views')||constructionOnly;
const smallViewports=process.argv.includes('--small-viewports');
const rejectedRunPath=option('rejected-run',null),priorRejectedRun=rejectedRunPath?JSON.parse(fs.readFileSync(rejectedRunPath,'utf8')):null;
// Native Metal constant folding can move the final 8-bit result by one step.
// Explicit opt-in only; historical exact-byte software checks remain exact.
const compilerRounding=process.argv.includes('--compiler-rounding');
assert(!compilerRounding||(process.env.NATIVE_GPU==='1'&&sameGeometry),'Compiler rounding requires native GPU and unchanged geometry');
assert(!(pixelsOnly&&compilerRounding),'The pixel-only release gate requires exact RGBA bytes');
assert.ok(!(unchangedWork&&sameGeometry),'Choose either unchanged-work or same-geometry');
const errors=[],captureDiagnostics=[],profiles=[{id:'desktop',mobile:false,quality:2},{id:'mobile',mobile:true,quality:1}];
const commonViews=[{id:'reef',p:[0,-8,7],aim:[0,-8,-10]},{id:'offshore',p:[390,-32,-184],aim:[390,-32,-210]},{id:'hadal',p:[766,-7000,-120],aim:[766,-7000,-145]}];
const desktopViews=[{id:'cave',p:[-218,-26,-69],aim:[-218,-25,-47.5]},{id:'ruins',p:[176,-49,-197],aim:[187,-51,-225]},{id:'reef-reversed',p:[0,-8,-10],aim:[0,-9,8]},{...commonViews[0],id:'reef-wide',viewport:{width:550,height:370}}];
const mobileViews=[{...commonViews[0],id:'reef-portrait',viewport:{width:195,height:422}}];
// These actual low-LOD meshes contain the cross-platform construction deltas.
// Their 14/12 m near limits require a distant view rather than a close portrait.
const constructionTargets=constructionViews?[{id:'turtle-construction-low',uid:'turtle-001',batchIndex:421},{id:'cuttlefish-construction-low',uid:'cuttlefish-001',batchIndex:444}]:[];
const viewsFor=profile=>constructionOnly?[commonViews[0],commonViews[2],...constructionTargets]:[...commonViews,...(profile.mobile?mobileViews:desktopViews),...constructionTargets];
const viewportFor=view=>smallViewports?(view.viewport?.height>view.viewport?.width?{width:96,height:128}:{width:128,height:96}):(view.viewport||{width:320,height:240});
const expectedViews=profiles.reduce((sum,profile)=>sum+viewsFor(profile).length,0);
const summarize=row=>{const {pixels,...rest}=row;return {...rest,pixelSHA256:crypto.createHash('sha256').update(Buffer.from(pixels,'base64')).digest('hex')};};
function requireCompleteFrames(rows,label){
 for(const row of rows){const frame=row.frameGate?.capture;assert.ok(frame?.result==='complete'&&frame.frameDelta===1&&!frame.pending&&!frame.missing.length,label+' '+row.profile+'/'+row.scene+' needs a verified complete frame; rerun without --reuse-baseline');if(row.scene==='reef'||row.scene==='hadal'||row.construction)assert.ok(row.frameGate?.placement?.accepted,label+' '+row.profile+'/'+row.scene+' needs verified actual diagnostic placement; rerun without --reuse-baseline');}
}
function requireConstructionCoverage(rows,label){
 if(!constructionViews)return;
 for(const profile of profiles)for(const target of constructionTargets){
  const row=rows.find(row=>row.profile===profile.id&&row.scene===target.id),draw=row?.affectedBatches?.find(b=>b.index===target.batchIndex);
  assert.ok(row?.construction?.uid===target.uid,label+' must resolve the actual '+target.uid);
  assert.ok(draw?.surfaceDraws>0&&draw?.targetPacked,label+' '+profile.id+' must submit changed array batch '+target.batchIndex+' and its target actor');
 }
}
async function capture(browser,url,label,referenceRows=null){
 const rows=[];
 for(const profile of profiles){
  const context=await browser.newContext({viewport:viewportFor({}),deviceScaleFactor:1,isMobile:profile.mobile,hasTouch:profile.mobile}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(label+': '+error.message));
  await page.addInitScript(({quality})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,startWithSound:false,reduced:true}})),profile);
  await page.goto(url+(url.includes('?')?'&':'?')+'still');
  await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert.ok(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
  for(const view of viewsFor(profile)){
   await page.setViewportSize(viewportFor(view));
   const referenceConstruction=referenceRows?.find(row=>row.profile===profile.id&&row.scene===view.id)?.construction||null;
   const row=await page.evaluate(async({view,profile,existingOnly,constructionViews,referenceConstruction})=>{
    settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=profile.quality;renderer.dynamicScale=1;renderer.resize();
    if(existingOnly)for(const b of renderer.batches)if(b.sceneRole==='reef-fish-expansion')b.visible=false;
    let construction=null,resolvedView=view;
    if(view.uid){
     window.__freeze=true;active=false;updateLife(8);const actor=allLife.find(f=>f.uid===view.uid);if(!actor)throw Error('Missing construction-view actor '+view.uid);
     const actorPose=actor.p.slice(),actorPoseFloat32=actorPose.map(Math.fround);
     if(referenceConstruction&&actorPoseFloat32.some((v,i)=>v!==referenceConstruction.actorPoseFloat32[i]))throw Error('Construction-view actor Float32 pose changed: '+view.uid);
     const p=referenceConstruction?.resolvedView.p||[actorPose[0]+18,actorPose[1]+.5,actorPose[2]+6],aim=referenceConstruction?.resolvedView.aim||actorPose.slice();
     resolvedView={p,aim};construction={uid:view.uid,speciesID:SPECIES[actor.species]?.id,actorPose,actorPoseFloat32,resolvedView:{p:p.slice(),aim:aim.slice()},expectedBatchIndex:view.batchIndex,time:8};
    }
    // Resolve the real helper's actual camera without submitting GPU work
    // while its new region requests are still in flight. A declined render is
    // never a usable capture, even if the old framebuffer looks plausible.
    const frameGate={resolvedWithoutRaster:true,attempts:[],frameBeforeResolve:renderer.frame};
    // This is explicit diagnostic placement, like the game's jump/return
    // actions. A previous swimming pose must not sweep the camera back across
    // kilometres of terrain when the fixture changes locations.
    if(typeof OceanDiverContact!=='undefined')OceanDiverContact.reset();cameraCut=true;if(typeof resetRenderCadence==='function')resetRenderCadence();
    const resolveRender=renderer.render;renderer.render=()=>false;
    try{__renderView(resolvedView.p,resolvedView.aim,8);}finally{renderer.render=resolveRender;}
    const positionError=Math.hypot(...eye.map((v,i)=>v-resolvedView.p[i])),depthError=Math.abs(eye[1]-resolvedView.p[1]);
    frameGate.placement={contactHistoryReset:typeof OceanDiverContact!=='undefined',requestedEye:resolvedView.p.slice(),requestedAim:resolvedView.aim.slice(),actualEye:eye.slice(),actualTarget:target.slice(),positionError,depthError,accepted:false};
    if((view.id==='reef'||view.id==='hadal')&&(positionError>1||depthError>1))throw Error('Diagnostic control camera did not reach its requested location: '+JSON.stringify(frameGate.placement));
    if(construction){const actor=allLife.find(f=>f.uid===view.uid),batch=renderer.batches[view.batchIndex],scale=renderer.mobile?(renderer.quality===0?.64:.82):(renderer.quality===0?.75:1),distance=Math.hypot(...eye.map((v,i)=>v-actor.p[i])),min=(batch.minDistance||0)*scale,max=(batch.maxDistance||220)*scale;
     construction.actualDistance=distance;construction.lowLODBand=[min,max];
     if(distance<=min+.6||distance>=max-.6)throw Error('Construction camera did not reach the actual actor low-LOD band: '+JSON.stringify({...frameGate.placement,uid:view.uid,distance,lowLODBand:[min,max]}));
    }
    frameGate.placement.accepted=true;
    const deadline=performance.now()+120000,raf=()=>new Promise(requestAnimationFrame),stream=renderer.sceneStream;
    const streamState=()=>({eye:eye.slice(),frame:renderer.frame,pending:stream?.jobs.size||0,required:stream?stream.needed(eye).size:0,missing:stream?[...stream.requiredMissing]:[],failures:stream?[...stream.failures]:[]});
    for(;;){
     if(performance.now()>deadline)throw Error('Actual-view readiness did not settle; no pixels captured: '+JSON.stringify({...frameGate,state:streamState()}));
     const ready=!stream||stream.update(eye,false);
     if(ready&&stream)stream.update(eye);
     if(stream&&[...stream.requiredMissing].some(id=>(stream.failures.get(id)||0)>=3))throw Error('Required actual-view geometry exhausted production retries; no pixels captured: '+JSON.stringify({...frameGate,state:streamState()}));
     // Keep production deadlines/required sets intact. Let all existing
     // fetch/decode/upload jobs finish before a software-GPU render can block
     // the browser thread and expire an otherwise healthy response body.
     if(!ready||stream?.jobs.size){await raf();continue;}
     const frame=renderer.frame,result=renderer.render(eye,target,t),delta=renderer.frame-frame;
     frameGate.attempts.push({result:result===false?'declined':'complete',frameDelta:delta,...streamState()});
     if(result!==false&&delta===1&&(!stream||stream.jobs.size===0))break;
     await raf();
    }
    const gl=renderer.gl,original=gl.bufferSubData;let uploadCalls=0,uploadBytes=0,uniformCalls=0;
    const affectedBatches=constructionViews?[421,444].map(index=>{const b=renderer.batches[index];return {index,meshID:b?.streamMesh??null,kind:b?.kind,material:b?.material,species:b?.species,minDistance:b?.minDistance||0,maxDistance:b?.maxDistance||220,surfaceDraws:0,drawCount:0,targetPacked:false};}):null;
    const originalUseProgram=gl.useProgram,originalDrawBatch=renderer.drawBatch;let activeProgram=null;
    if(constructionViews){
     gl.useProgram=function(p){activeProgram=p;return originalUseProgram.apply(this,arguments);};
     renderer.drawBatch=function(b){
      const record=affectedBatches.find(row=>renderer.batches[row.index]===b);
      if(record&&activeProgram===renderer.surfaceProgram(b)?.p){record.surfaceDraws++;record.drawCount+=b.drawCount;
       const actor=view.uid&&b.instances.find(f=>f.uid===view.uid),origin=renderer.renderOrigin||[0,0,0];
       if(actor)for(let i=0;i<b.drawCount;i++)if([0,1,2].every(k=>b.data[i*24+k]===Math.fround(actor.p[k]-origin[k])))record.targetPacked=true;
      }
      return originalDrawBatch.apply(this,arguments);
     };
    }
    const uniformOriginals={},uniformCallsByMethod={};
    for(const name of ['uniform1i','uniform1f','uniform2f','uniform2fv','uniform3f','uniform3fv','uniform4f','uniform4fv','uniformMatrix4fv']){
     uniformOriginals[name]=gl[name];uniformCallsByMethod[name]=0;
     gl[name]=function(){uniformCalls++;uniformCallsByMethod[name]++;return uniformOriginals[name].apply(this,arguments);};
    }
    gl.bufferSubData=function(target,offset,data,srcOffset,length){uploadCalls++;uploadBytes+=(length??data.length)*data.BYTES_PER_ELEMENT;return original.apply(this,arguments);};
    const captureFrame=renderer.frame;let captureResult;
    try{captureResult=renderer.render(eye,target,t);}finally{gl.bufferSubData=original;for(const name in uniformOriginals)gl[name]=uniformOriginals[name];if(constructionViews){gl.useProgram=originalUseProgram;renderer.drawBatch=originalDrawBatch;}}
    frameGate.capture={result:captureResult===false?'declined':'complete',frameDelta:renderer.frame-captureFrame,...streamState()};
    if(captureResult===false||frameGate.capture.frameDelta!==1||frameGate.capture.pending||frameGate.capture.missing.length)throw Error('Incomplete actual-view render rejected before readPixels: '+JSON.stringify(frameGate));
    const pixels=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let encoded='';for(let i=0;i<pixels.length;i+=16384)encoded+=String.fromCharCode(...pixels.subarray(i,i+16384));
    const topBatches=renderer.batches.map((b,index)=>({index,role:b.sceneRole||null,kind:b.kind,material:b.material,species:b.species,dynamic:!!b.dynamic,triangles:b.visible?b.count/3*b.drawCount:0,drawCount:b.drawCount,meshTriangles:b.count/3,radius:b.radius,instances:b.instances.length,examplePosition:b.instances[0]?.p,minDistance:b.minDistance||0,maxDistance:b.maxDistance||220})).filter(b=>b.triangles>0).sort((a,b)=>b.triangles-a.triangles).slice(0,12);
    return {profile:profile.id,scene:view.id,quality:renderer.quality,mobile:renderer.mobile,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaaSamples:renderer.msaaSamples,triangles:renderer.submittedTriangles,drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,uploadCalls,uploadBytes,uniformCalls,uniformCallsByMethod,topBatches,frameGate,...(constructionViews?{construction,affectedBatches,actualEye:eye.slice(),actualTarget:target.slice()}:{}),pixels:btoa(encoded),gl:gl.getError()};
   },{view,profile,existingOnly,constructionViews,referenceConstruction});
   rows.push(row);captureDiagnostics.push({label,...summarize(row)});console.log(label+' '+profile.id+' '+view.id+': '+row.triangles+' triangles, '+row.drawCalls+' draws, '+row.uploadCalls+' uploads, MSAA '+row.msaaSamples+', complete frame +'+row.frameGate.capture.frameDelta);
  }
  // Exercise the real application loop on a controlled 120 Hz display. Only
  // rendering is spied: swimming, simulation, HUD and feature hooks stay real.
  if(!pixelsOnly){const cadence=await page.evaluate(()=>{
   const originalRAF=window.requestAnimationFrame,originalRender=renderer.render,originalFocus=document.hasFocus;
   window.requestAnimationFrame=()=>0;document.hasFocus=()=>true;window.__freeze=false;
   let rendered=0,virtualMs=100000;renderer.render=function(){this.dirty=false;rendered++;};
   const schedule=(name,{playing=true,quality=0,hidden=false,panel=null}={})=>{
    active=playing;modal=panel;photoOpen=false;settings.adaptive=false;settings.quality=quality;renderer.quality=quality;renderer.dirty=false;
    Object.defineProperty(document,'hidden',{configurable:true,value:hidden});lastTime=virtualMs;rendered=0;
    t=0;simulationAccumulator=0;previousPhysicsPosition=null;hudClock=0;observationClock=0;player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=0;cameraCut=true;resetInput();keys.add('KeyW');
    for(let i=1;i<=120;i++)animate(virtualMs+i*1000/120);virtualMs+=1000;
    keys.clear();return {name,frames:rendered,simulationSeconds:t,position:player.p.slice()};
   };
   try{return [schedule('low-120hz'),schedule('high-120hz',{quality:2}),schedule('home-120hz',{playing:false}),schedule('paused-120hz',{panel:'settings'}),schedule('hidden-120hz',{hidden:true})];}
   finally{window.__freeze=true;window.requestAnimationFrame=originalRAF;renderer.render=originalRender;document.hasFocus=originalFocus;delete document.hidden;}
  });
  rows.find(row=>row.profile===profile.id).cadence=cadence;
  console.log(label+' '+profile.id+' cadence: '+cadence.map(row=>row.name+'='+row.frames).join(', '));
  }
  await context.close();
 }
 return rows;
}
(async()=>{
 const browser=await pw.chromium.launch(require('./browser-launch.cjs')());
 let original,candidate;
 try{
  original=process.argv.includes('--reuse-baseline')?JSON.parse(fs.readFileSync(baselinePath)).rows:await capture(browser,originalURL,'original');
  assert.equal(original.length,expectedViews,'Baseline must contain every view; rerun without --reuse-baseline');
  requireCompleteFrames(original,'Original');
  if(!pixelsOnly)assert.equal(original.filter(row=>row.cadence).length,2,'Baseline must contain both cadence probes; rerun without --reuse-baseline');
  requireConstructionCoverage(original,'Original');
  if(!process.argv.includes('--reuse-baseline')){fs.mkdirSync(path.dirname(baselinePath),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify({url:originalURL,rows:original},null,2));}
  if(process.argv.includes('--baseline-only')){assert.equal(errors.length,0,errors.join('; '));assert.ok(original.every(row=>row.gl===0),'Original rendering must have no GL errors');return;}
  candidate=await capture(browser,candidateURL,'candidate',original);requireCompleteFrames(candidate,'Candidate');requireConstructionCoverage(candidate,'Candidate');
 }finally{await browser.close();}
 assert.equal(candidate.length,original.length,'Both versions must capture the same views');
 const comparisons=original.map(before=>{
  const after=candidate.find(row=>row.profile===before.profile&&row.scene===before.scene),a=Buffer.from(before.pixels,'base64'),b=Buffer.from(after.pixels,'base64');
  assert.equal(a.length,b.length,'Framebuffer byte count changed');let differingChannels=0,maxDifference=0,sumDifference=0,min=255,max=0;
  for(let i=0;i<a.length;i++){if(i%4!==3){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}const delta=Math.abs(a[i]-b[i]);if(delta)differingChannels++;maxDifference=Math.max(maxDifference,delta);sumDifference+=delta;}
  return {profile:before.profile,scene:before.scene,before:summarize(before),after:summarize(after),pixels:{differingChannels,maxDifference,meanDifference:sumDifference/a.length,originalRange:max-min}};
 });
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({existingContentOnly:existingOnly,unchangedWork,sameGeometry,compilerRounding,...(pixelsOnly?{pixelsOnly:true}:{}),...(constructionViews?{constructionViews:true}:{}),...(constructionOnly?{constructionOnly:true}:{}),...(smallViewports?{diagnosticFramebuffers:{landscape:[128,96],portrait:[96,128],gameQualityUnchanged:true}}:{}),...(priorRejectedRun?{priorRejectedRun}:{}),gpuMode:process.env.NATIVE_GPU==='1'?'native':'software',method:(pixelsOnly?'Pixel-only release gate: same fixed camera/time, quality, MSAA and framebuffer; exact readPixels and existing work-count checks. Historical cadence probe is explicitly skipped; work counts are not FPS or power measurements.':'Same fixed camera/time, quality, MSAA and framebuffer. Exact readPixels comparison on the selected WebGL renderer, plus real animate() at controlled 120 Hz with a render spy. Work counts are not FPS or power measurements.')+' Diagnostic placement explicitly resets diver contact history/camera cadence, verifies requested control locations and actual actor low-LOD distances. Every captured frame advances renderer.frame exactly once after actual-eye required geometry and all prefetch jobs settle; an unmeasured complete frame precedes capture. Declined/stale frames are rejected before readPixels. Production deadlines and required sets are unchanged.'+(smallViewports?' Explicit diagnostic framebuffers are128x96 (portrait96x128), matched before/after; game quality, MSAA and normal-play graphics are unchanged.':'')+(constructionOnly?' Focused set: reef, hadal and both changed low-LOD actors on each profile.':'')+(constructionViews?' Additional real turtle-001/cuttlefish-001 views use baseline-resolved cameras at time8 and require the changed low-LOD array batches421/444 to submit their target actors on both profiles.':'')+(existingOnly?' New reef-fish-expansion batches are hidden for the pre-existing content comparison; new fish require separate visual verification.':''),comparisons,errors},null,2));
 assert.equal(errors.length,0,errors.join('; '));
 for(const row of comparisons){
  assert.equal(row.before.gl,0);assert.equal(row.after.gl,0);assert.ok(row.pixels.originalRange>20,'Original image must contain visible contrast');
  for(const key of ['profile','scene','quality','msaaSamples','resolution','volumeResolution'])assert.deepEqual(row.after[key],row.before[key],key+' must remain unchanged');
  if(compilerRounding){assert(row.pixels.maxDifference<=1,'Native compiler delta exceeds 1/255');assert(row.pixels.differingChannels/(row.after.resolution[0]*row.after.resolution[1]*4)<.0001,'Native compiler rounding affects too many channels');}
  else assert.equal(row.pixels.differingChannels,0,'Rendered pixels must remain identical: '+row.profile+'/'+row.scene);
  assert.ok(row.after.uploadCalls<=row.before.uploadCalls,'GPU upload calls must not increase');
  if(!sameGeometry)assert.ok(row.after.uniformCalls<=row.before.uniformCalls,'GPU uniform calls must not increase');
  if(sameGeometry)for(const key of ['triangles','drawCalls','shadowDraws','uploadCalls','uploadBytes'])assert.equal(row.after[key],row.before[key],key+' must remain unchanged for shader specialization');
  if(unchangedWork)for(const key of ['triangles','drawCalls','shadowDraws','uploadCalls','uploadBytes','uniformCalls'])assert.equal(row.after[key],row.before[key],key+' must be unchanged for a CPU-only optimization');
  if(constructionViews){assert.deepEqual(row.after.affectedBatches,row.before.affectedBatches,'Affected mesh submissions must match');if(row.before.construction){assert.deepEqual(row.after.construction.actorPoseFloat32,row.before.construction.actorPoseFloat32,'Construction actor Float32 pose must match');assert.deepEqual(row.after.construction.resolvedView,row.before.construction.resolvedView,'Construction cameras must match the baseline');}}
  if(!pixelsOnly&&row.before.cadence){
   assert.deepEqual(row.after.cadence,row.before.cadence,'Animation cadence, elapsed time and swimming must match the original');
   for(const sample of row.after.cadence){
    const paused=sample.name==='paused-120hz'||sample.name==='hidden-120hz';
    assert.equal(sample.frames,paused?0:120,'Do not cap frames or render while paused: '+sample.name);
    assert.ok(Math.abs(sample.simulationSeconds-(paused?0:1))<1e-9,'Preserve elapsed simulation time: '+sample.name);
   }
   console.log('PASS unchanged cadence and swimming '+row.profile);
  }
  console.log('PASS '+(compilerRounding?'bounded native rounding ('+row.pixels.differingChannels+' channels)':'identical pixels')+' '+row.profile+'/'+row.scene+'; uploads '+row.before.uploadCalls+' -> '+row.after.uploadCalls);
 }
 if(!unchangedWork&&!sameGeometry)assert.ok(comparisons.some(row=>row.after.uploadCalls<row.before.uploadCalls),'Expected a measured reduction in redundant uploads');
})().catch(error=>{const failurePath=out.replace(/\.json$/,'-failure.json');fs.mkdirSync(path.dirname(failurePath),{recursive:true});fs.writeFileSync(failurePath,JSON.stringify({status:'failed',error:error.stack,originalURL,candidateURL,pixelsOnly,constructionOnly,smallViewports,priorRejectedRun,captureDiagnostics,errors},null,2));console.error(error);console.error('Failed capture diagnostics: '+failurePath);process.exitCode=1;});
