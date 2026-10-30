/* Queued native GPU queries for one bounded kind10 fragment-specialization
 * candidate. Root serializes execution. No screenshots or pixel readbacks.
 * A/A is a cadence control; neither successful queries nor a negative delta
 * alone establish performance acceptance. All planned runs must be retained. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {entryUIReady}=require('./abyss-v46-cost-browser.cjs');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const baselineCommit='d6d8bc0253147623177f224300109cdea721f7c1';
const baselineEngineSHA='7f6f9657b32efd7a1c336e851b372fd636ecc14d5328763ddf0a63e1b2a119fb';
const sampling=Object.freeze({warmFrames:240,measuredFrames:400,maxPendingQueries:16,rafTimeoutMs:2000,drainTimeoutMs:10000,settleTimeoutMs:20000});
const actors=Object.freeze(['coelacanth-002','pelican_eel-001','humpback_anglerfish-001']);

async function main(){
 const mode=option('mode','ABBA'),chosenProfile=option('profile','both');
 assert(['control','ABBA','BAAB'].includes(mode),'--mode=control, ABBA or BAAB');
 assert(['desktop','touch','both'].includes(chosenProfile),'--profile=desktop, touch or both');
 const profiles=chosenProfile==='both'?['desktop','touch']:[chosenProfile];
 const order=mode==='BAAB'?['B','A','A','B']:['A','B','B','A'];
 const baselineText=option('baseline-engine',null)?fs.readFileSync(path.resolve(option('baseline-engine',null)),'utf8'):execFileSync('git',['show',baselineCommit+':src/engine.js'],{cwd:root,encoding:'utf8'});
 assert.equal(sha(baselineText),baselineEngineSHA,'The baseline must be the exact published v46 engine');
 const baseline=vm.runInNewContext(baselineText+'\n({VS,FS})',{console},{timeout:10000});
 const out=path.resolve(root,option('out','qa/parity/v01847-performance/cost-'+mode+'-'+chosenProfile+'.json'));
 const report={status:'running',mode,order,sampling,baseline:{commit:baselineCommit,engineSHA256:baselineEngineSHA,VS:sha(baseline.VS),FS:sha(baseline.FS)},method:'Installed native Chrome; unchanged actual world, generic v46 VS/FS and candidate kind10/material0 fragment specialization. Only the existing surfacePrograms 10:0 entry is switched. Fixed 240 warm and 400 measured frames, one render per RAF; bounded asynchronous GPU-query queue. Every row and invalid outcome is retained. Local ABBA/BAAB quartets, not pooled distant blocks, are the primary comparisons. Control maps both arms to the exact same generic program. No image readback, screenshots or other CPU/GPU test during timing. Fixed-scene GPU cost only: not natural gameplay FPS, physical-phone or battery evidence.',profiles:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profileName of profiles){
   const touch=profileName==='touch',record={profile:profileName,scenes:[],failure:null};report.profiles.push(record);save();
   const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({profile:profileName,error:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({profile:profileName,error:m.text()});});
   try{
    const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');
    record.stage='boot';save();await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.waitForFunction(entryUIReady,null,{timeout:20000});
    record.initial=await page.evaluate(async({baseline,touch})=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug&&g.getParameter(debug.UNMASKED_RENDERER_WEBGL);
     if(!hardware||/software|swiftshader|llvmpipe/i.test(hardware))throw Error('Native hardware WebGL required: '+hardware);
     if(!g.getExtension('EXT_disjoint_timer_query_webgl2'))throw Error('GPU timer queries unavailable');
     if(VS!==baseline.VS||FS!==baseline.FS)throw Error('Generic shader arithmetic changed from published v46');
     const generic=renderer.program,candidate=renderer.surfacePrograms.get('10:0');if(!candidate||candidate===generic)throw Error('Distinct candidate 10:0 specialization is required');
     const shaderSource=(p,type)=>(g.getAttachedShaders(p.p)||[]).filter(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type).map(s=>g.getShaderSource(s));
     if(shaderSource(generic,g.VERTEX_SHADER)[0]!==VS||shaderSource(generic,g.FRAGMENT_SHADER)[0]!==FS||shaderSource(candidate,g.VERTEX_SHADER)[0]!==VS||shaderSource(candidate,g.FRAGMENT_SHADER)[0]!==surfaceShaderSource(FS,10,0))throw Error('Attached generic/candidate shaders do not match the exact expected sources');
     if(renderer.quality!==(touch?1:2)||renderer.dynamicScale!==1||!settings.adaptive||!renderer.sceneLoad.compiled||!renderer.sceneLoad.streamed)throw Error('Default compiled/streamed automatic-quality entry differs');
     const optionalAsset=oceanBarramundi.status(renderer);if(optionalAsset.state!=='idle')throw Error('Fixed still-boot fixture requires idle optional fish: '+JSON.stringify(optionalAsset));
     const initial={version:document.documentElement.dataset.version,hardware,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,programKeys:[...renderer.surfacePrograms.keys()],optionalAsset};
     const before={frozen:window.__freeze,adaptive:settings.adaptive,active,photoFov:renderer.photoFov,photoNear:renderer.photoNear,lamp:renderer.lamp,lighting:renderer.lighting};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;
     const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),v=>v.toString(16).padStart(2,'0')).join('');
     initial.shaderSHA256={VS:await hash(VS),genericFS:await hash(FS),candidateFS:await hash(surfaceShaderSource(FS,10,0))};
     window.__abyssSpecializationCost={generic,candidate,before,programs:new Map(renderer.surfacePrograms),textures:renderer.textures.slice(),shadowProgram:renderer.shadowProgram,importedShadowProgram:renderer.importedShadowProgram,optionalAssetSignature:JSON.stringify(optionalAsset)};return initial;
    },{baseline,touch});save();
    for(const uid of actors){
     record.stage=uid;save();
     const result=await page.evaluate(async({uid,touch,mode,order,sampling})=>{
      const state=window.__abyssSpecializationCost,g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2');
      const result={uid,mode,order,warm:[],samples:[],quartets:[],valid:false,failure:null,disjointEvents:[],queuePeak:0,settling:{events:[],frames:0},phase:'setup'};
      let pending=[],activeQuery=null,measurementStarted=false,intervalDisjoint=false,expectedProgram=state.candidate,invariant=null,targetBuffers=null;
      const raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RAF timeout')),sampling.rafTimeoutMs);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
      const median=a=>{const s=a.slice().sort((x,y)=>x-y),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):null;};
      const restore=()=>renderer.surfacePrograms.set('10:0',state.candidate);
      const armProgram=arm=>mode==='control'||arm==='A'?state.generic:state.candidate;
      const switchArm=arm=>{expectedProgram=armProgram(arm);renderer.surfacePrograms.set('10:0',expectedProgram);};
      const stableResources=()=>renderer.program===state.generic&&renderer.shadowProgram===state.shadowProgram&&renderer.importedShadowProgram===state.importedShadowProgram&&renderer.surfacePrograms.size===state.programs.size&&[...state.programs].every(([key,p])=>renderer.surfacePrograms.get(key)===(key==='10:0'?expectedProgram:p))&&renderer.textures.length===state.textures.length&&state.textures.every((v,i)=>renderer.textures[i]===v)&&JSON.stringify(oceanBarramundi.status(renderer))===state.optionalAssetSignature&&(!targetBuffers||targetBuffers.every(r=>r.b.vb===r.vb&&r.b.eb===r.eb&&r.b.vao===r.vao&&r.b.count===r.count&&r.b.vertexCount===r.vertexCount));
      const checkDisjoint=where=>{const disjoint=!!g.getParameter(ext.GPU_DISJOINT_EXT);if(disjoint){result.disjointEvents.push({where,at:performance.now(),pending:pending.length});if(measurementStarted)intervalDisjoint=true;}return disjoint;};
      const collect=()=>{
       checkDisjoint('collect');const remaining=[];
       for(const item of pending){
        if(!g.getQueryParameter(item.query,g.QUERY_RESULT_AVAILABLE)){remaining.push(item);continue;}
        const row=item.row;row.resolvedAtMs=performance.now();row.queryLatencyMs=row.resolvedAtMs-row.startedAtMs;row.rawNanoseconds=g.getQueryParameter(item.query,g.QUERY_RESULT);row.gpuMs=Number.isFinite(row.rawNanoseconds)&&row.rawNanoseconds>0?row.rawNanoseconds/1e6:null;
        row.status=row.gpuMs===null?'invalid-duration':row.failure||'valid';g.deleteQuery(item.query);
       }pending=remaining;
      };
      try{
       if(g.isContextLost())throw Error('Context lost before scene');restore();expectedProgram=state.candidate;updateLife(6);
       const actor=life.find(f=>f.uid===uid);if(!actor||actor.ecologyPresent===false||actor.encounterPresent===false)throw Error('Actual present deep actor required');
       const batches=renderer.batches.filter(b=>!b.shadowProxy&&b.instances.includes(actor));if(batches.length!==2||batches.some(b=>b.kind!==10||b.material!==0))throw Error('Actual high/low kind10 animal batches required');
       const distance=uid.startsWith('coelacanth')?2.4:uid.startsWith('pelican')?1.2:.55,offset=[distance*.25,distance*.2,distance],c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),camera=[actor.p[0]+c*offset[0]+s*offset[2],actor.p[1]+offset[1],actor.p[2]-s*offset[0]+c*offset[2]],target=actor.p.slice(),time=6;
       if(OceanRockContact.overlaps(camera,.02)||OceanRegions.pointBlocked(camera,.02)||OceanTrench.groundContact(camera,.02))throw Error('Controlled camera intersects substrate');
       renderer.photoFov=touch?60:35;renderer.photoNear=.02;renderer.lamp=true;renderer.lighting='day';renderer.forceShadow=true;
       await renderer.sceneStream.ready(camera);targetBuffers=batches.map(b=>({b,vb:b.vb,eb:b.eb,vao:b.vao,count:b.count,vertexCount:b.vertexCount}));
       if(!targetBuffers.some(r=>r.vao&&r.vb&&r.eb))throw Error('Actual compiled animal mesh is not resident');
       const stream=renderer.sceneStream,keep=stream.neededRanges(camera).keep,residency=()=>stream.meshes.filter(m=>m.resident).map(m=>m.id);
       let settledResidency=null;
       const streamState=()=>({residentMeshes:stream.meshes.filter(m=>m.resident).length,outsideKeep:stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,pendingJobs:stream.jobs.size,queuedJobs:stream.queue.length,activeJobs:stream.active,requiredMissing:stream.requiredMissing.size,forceShadow:!!renderer.forceShadow,shadowMapDirty:!!renderer._shadowMapDirty,staticShadowUpdates:renderer.staticShadowUpdates||0});
       const submitted=b=>{const origin=renderer.renderOrigin||[0,0,0],p=actor.p.map((v,k)=>Math.fround(v-origin[k]));for(let i=0;i<b.drawCount;i++){const j=i*24;if(p.every((v,k)=>b.data[j+k]===v)&&b.data[j+10]===Math.fround(actor.phase||0))return true;}return false;};
       const stats=()=>({resourcesStable:stableResources(),drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,submittedTriangles:renderer.submittedTriangles,submittedVertices:renderer.submittedVertices,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,stream:streamState(),residencyMatches:JSON.stringify(residency())===settledResidency,selected:batches.map(b=>({minDistance:b.minDistance||0,count:b.count,vertexCount:b.vertexCount,drawCount:b.drawCount,actorSubmitted:submitted(b),programMatches:renderer.surfaceProgram(b)===expectedProgram}))});
       const render=()=>renderer.render(camera,target,time);
       result.view={uid,species:SPECIES[actor.species].id,position:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,scale:actor.s.slice(),camera,target,time,fov:renderer.photoFov,near:renderer.photoNear};
       const identity=()=>JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.ecologyPresent]));const originalIdentity=identity();
       result.phase='settling';const settleStart=performance.now();let stable=0,last=null;
       while(stable<2){
        if(performance.now()-settleStart>sampling.settleTimeoutMs)throw Error('Scene residency/shadow settling timeout');await raf();const rendered=render(),ss=streamState(),ids=residency(),signature=JSON.stringify([ss,ids]);result.settling.frames++;
        if(g.getError()||g.isContextLost())throw Error('GL failure during settling');
        if(signature!==last)result.settling.events.push({at:performance.now()-settleStart,...ss});
        const ready=rendered!==false&&!ss.pendingJobs&&!ss.queuedJobs&&!ss.activeJobs&&!ss.requiredMissing&&!ss.outsideKeep&&!ss.forceShadow&&!ss.shadowMapDirty;
        stable=ready?(signature===last?stable+1:1):0;last=signature;if(stable===2)settledResidency=JSON.stringify(ids);
       }result.settling.elapsedMs=performance.now()-settleStart;result.settling.residentIDs=JSON.parse(settledResidency);
       const inspect=row=>{
        row.stats=stats();row.gl=g.getError();row.hiddenAtEnd=document.hidden;row.lost=g.isContextLost();
        const signature=JSON.stringify(row.stats);if(invariant===null)invariant=signature;row.invariantsMatch=signature===invariant;
        row.failure=!row.submitted?'frame-not-submitted':row.gl?'gl-error':row.lost?'context-lost':!row.stats.resourcesStable?'resource-change':!row.stats.selected.every(b=>b.programMatches)?'program-routing-change':!row.invariantsMatch?'workload-change':!row.stats.residencyMatches?'residency-change':!row.stats.selected.some(b=>b.actorSubmitted)?'target-not-submitted':row.hidden||row.hiddenAtEnd?'hidden-frame':null;
       };
       result.phase='warm';
       for(let i=0;i<sampling.warmFrames;i++){
        await raf();const arm=order[i%4];switchArm(arm);const row={index:i,arm,startedAtMs:performance.now(),hidden:document.hidden};result.warm.push(row);const begin=performance.now();row.submitted=render()!==false;row.cpuMs=performance.now()-begin;inspect(row);row.status=row.failure||'valid';if(row.failure)throw Error('Warm '+i+': '+row.failure);
       }
       result.phase='measurement';measurementStarted=true;result.measurementStartedAtMs=performance.now();checkDisjoint('measurement-start');
       for(let i=0;i<sampling.measuredFrames;i++){
        await raf();collect();const arm=order[i%4];switchArm(arm);const row={index:i,quartet:Math.floor(i/4),arm,program:armProgram(arm)===state.generic?'generic':'specialized',startedAtMs:performance.now(),hidden:document.hidden,pendingBefore:pending.length,status:'pending',gpuMs:null};result.samples.push(row);
        if(pending.length>=sampling.maxPendingQueries){row.status='queue-overflow';throw Error('Bounded GPU query queue overflow');}
        activeQuery=g.createQuery();if(!activeQuery){row.status='query-allocation-failed';throw Error('GPU query allocation failed');}
        g.beginQuery(ext.TIME_ELAPSED_EXT,activeQuery);const begin=performance.now();row.submitted=render()!==false;row.cpuMs=performance.now()-begin;g.endQuery(ext.TIME_ELAPSED_EXT);
        pending.push({query:activeQuery,row});activeQuery=null;result.queuePeak=Math.max(result.queuePeak,pending.length);g.flush();inspect(row);checkDisjoint('after-render-'+i);
        if(row.failure)throw Error('Measured '+i+': '+row.failure);
       }
       result.measurementEndedAtMs=performance.now();result.phase='drain';const drainStart=performance.now();
       while(pending.length){collect();if(!pending.length)break;if(performance.now()-drainStart>sampling.drainTimeoutMs)throw Error('GPU query drain timeout');await raf();}
       result.drainMs=performance.now()-drainStart;result.contentUnchanged=identity()===originalIdentity;if(!result.contentUnchanged)throw Error('World actor state changed');
       result.phase='complete';
      }catch(error){result.failure=error.stack;}
      finally{
       if(activeQuery){try{g.endQuery(ext.TIME_ELAPSED_EXT);}catch{}g.deleteQuery(activeQuery);}
       for(const item of pending){item.row.status=item.row.failure||'unresolved-after-abort';g.deleteQuery(item.query);}pending=[];restore();
       result.routingRestored=renderer.surfacePrograms.get('10:0')===state.candidate&&renderer.program===state.generic;
      }
      result.intervalDisjoint=intervalDisjoint;
      if(intervalDisjoint)for(const row of result.samples){row.preDisjointStatus=row.status;row.status='interval-disjoint';}
      result.valid=!result.failure&&!intervalDisjoint&&result.routingRestored&&result.contentUnchanged&&result.warm.length===sampling.warmFrames&&result.warm.every(r=>r.status==='valid')&&result.samples.length===sampling.measuredFrames&&result.samples.every(r=>r.status==='valid');
      for(let i=0;i<Math.ceil(result.samples.length/4);i++){
       const rows=result.samples.slice(i*4,i*4+4),valid=result.valid&&rows.length===4&&rows.every(r=>r.status==='valid');
       const a=rows.filter(r=>r.arm==='A'),b=rows.filter(r=>r.arm==='B'),mean=x=>x.reduce((s,r)=>s+r.gpuMs,0)/x.length;
       result.quartets.push({index:i,frames:rows.map(r=>r.index),valid,meanA:valid?mean(a):null,meanB:valid?mean(b):null,deltaGpuMs:valid?mean(b)-mean(a):null,ratio:valid?mean(b)/mean(a):null});
      }
      result.summary=result.valid?{samples:result.samples.length,quartets:result.quartets.length,medianQuartetDeltaGpuMs:median(result.quartets.map(r=>r.deltaGpuMs)),medianQuartetRatio:median(result.quartets.map(r=>r.ratio)),armMedianA:median(result.samples.filter(r=>r.arm==='A').map(r=>r.gpuMs)),armMedianB:median(result.samples.filter(r=>r.arm==='B').map(r=>r.gpuMs)),medianStartIntervalMs:median(result.samples.slice(1).map((r,i)=>r.startedAtMs-result.samples[i].startedAtMs)),interpretation:mode==='control'?'A/A cadence control; both labels use the same generic program':'Valid paired timer data only; evaluate alongside A/A and the predeclared reverse-order confirmation'}:null;
      result.invalidRows=result.samples.filter(r=>r.status!=='valid').map(r=>({index:r.index,status:r.status,failure:r.failure||null}));return result;
     },{uid,touch,mode,order,sampling});
     record.scenes.push(result);save();console.log(JSON.stringify({profile:profileName,uid,mode,valid:result.valid,summary:result.summary,failure:result.failure,invalidRows:result.invalidRows}));
    }
   }catch(error){record.failure=error.stack;report.errors.push({profile:profileName,error:error.message});}
   finally{
    try{record.restored=await page.evaluate(()=>{const s=window.__abyssSpecializationCost;if(!s)return null;renderer.surfacePrograms.set('10:0',s.candidate);renderer.photoFov=s.before.photoFov;renderer.photoNear=s.before.photoNear;renderer.lamp=s.before.lamp;renderer.lighting=s.before.lighting;settings.adaptive=s.before.adaptive;active=s.before.active;window.__freeze=s.before.frozen;return renderer.surfacePrograms.get('10:0')===s.candidate&&renderer.program===s.generic;});}catch(e){record.restoreFailure=e.message;}
    for(const uid of actors)if(!record.scenes.some(r=>r.uid===uid))record.scenes.push({uid,valid:false,failure:'Not reached because the profile failed; no replacement run',samples:[]});
    await context.close();save();
   }
  }
  report.status=report.errors.length===0&&report.profiles.every(p=>!p.failure&&p.restored===true&&p.scenes.length===actors.length&&p.scenes.every(s=>s.valid))?'passed-query-data-performance-acceptance-separate':'failed-all-collected-data-retained';
 }catch(error){report.status='failed-all-collected-data-retained';report.failure=error.stack;console.error(error);}
 finally{save();await browser?.close();}
 if(report.status!=='passed-query-data-performance-acceptance-separate')process.exitCode=1;
}
module.exports={sampling,actors};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
