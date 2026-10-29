/* Controlled native whole-frame GPU cost of the production animal material
 * change. Root runs this alone. ABBA stays in one context per profile; only
 * production animal material/program variants change. No screenshots/readPixels,
 * fabricated geometry, isolated lighting, FPS or physical-phone claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const option=(key,fallback)=>{const inline=process.argv.find(a=>a.startsWith('--'+key+'='));if(inline)return inline.slice(key.length+3);const at=process.argv.indexOf('--'+key);return at>=0?process.argv[at+1]:fallback;};
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
// Keep bounded public/loopback HTTP(S) diagnostics, never response bodies,
// credentials, query strings or fragments.
const diagnosticURL=value=>{try{const u=new URL(value),h=u.hostname.toLowerCase();if(!/^https?:$/.test(u.protocol))return null;const loopback=h==='localhost'||h==='127.0.0.1'||h==='[::1]';if(!loopback&&(!h.includes('.')||h.endsWith('.local')||h.includes(':')||/^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.)/.test(h)))return null;return (u.protocol+'//'+u.host+u.pathname).slice(0,350);}catch{return null;}};
async function bootDiagnostic(page){
 let timer;try{return await Promise.race([page.evaluate(()=>{
  const small=value=>String(value??'').slice(0,600),out={readyState:document.readyState,hidden:document.hidden,hasFocus:document.hasFocus(),visibilityState:document.visibilityState,bootText:small(document.getElementById('loading')?.textContent),loadDetail:small(document.getElementById('loadDetail')?.textContent),ocean:null,renderer:null};
  try{const o=window.__ocean;out.ocean=o?{present:true,ready:o.ready,active:o.active,speciesCount:o.speciesCount,creatureCount:o.creatureCount,view:o.view}:{present:false};}catch(error){out.ocean={error:small(error.message)};}
  try{const r=typeof renderer==='undefined'?null:renderer;if(r){const st=r.sceneStream;out.renderer={initialized:true,contextLost:r.gl?.isContextLost(),quality:r.quality,scale:r.dynamicScale,resolution:r.canvas?[r.canvas.width,r.canvas.height]:null,loadState:Object.fromEntries(Object.entries(r.sceneLoad||{}).filter(([,v])=>v===null||typeof v==='number'||typeof v==='boolean').slice(0,24)),stream:st?{pendingJobs:st.jobs?.size,queuedJobs:st.queue?.length,activeJobs:st.active,requiredMissing:st.requiredMissing?.size}:null};}else out.renderer={initialized:false};}catch(error){out.renderer={error:small(error.message)};}return out;
 }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Boot diagnostic exceeded 3 seconds')),3000);})]);}catch(error){return {diagnosticError:String(error.message).slice(0,600)};}finally{clearTimeout(timer);}
}
async function main(){
 const baselinePath=option('baseline-engine',null);if(!baselinePath)throw Error('Required: --baseline-engine=/absolute/path/to/baseline-engine.js');
 const baselineEngine=fs.readFileSync(path.resolve(baselinePath),'utf8'),baseline=vm.runInNewContext(baselineEngine+'\n({VS,FS})',{console},{filename:baselinePath,timeout:10000});
 const out=path.resolve(option('out','qa/parity/v01838-materials/cost-specialized.json')),profiles=option('profile','both')==='both'?['desktop','touch']:[option('profile','both')];
 assert(profiles.every(p=>p==='desktop'||p==='touch'));
 const report={status:'running',baseline:{path:path.resolve(baselinePath),engineSHA256:digest(baselineEngine),VS:digest(baseline.VS),FS:digest(baseline.FS)},method:'Native installed Chrome, full production-world render, fixed real turtle/Banggai oblique camera, content, simulation time, light, framebuffer and default desktop quality 2 / touch quality 1. Before measuring, real rendering/streaming must naturally finish pending loads and delayed eviction of nonpinned meshes outside the fixed keep range, then retain identical residency/shadow counters for two frames (20s bound). No forced per-frame shadows or streaming bypass. Per scene/profile: same-context ABBA; 10 warm frames then 25 complete-frame GPU timer queries per block. Both scenes compare the complete material candidate: before uses baseline generic/1:6 fragment programs with no 2:5 entry; current uses current generic/1:6 programs and the production 2:5 turtle specialization. Current VS and specialization builder are shared by both arms; other programs remain unchanged. Program selection is independently asserted on every sample. Only its expected generic-to-2:5 label difference is excluded from strict draw/geometry/residency invariants. All invalid/timeout/disjoint samples remain in the receipt and invalidate its comparison. No pixel readback or screenshots; no FPS, physical-phone or battery claim.',profiles:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profile of profiles){
   const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage(),profileReport={profile,scenes:[],network:{requestFailures:[],httpErrors:[],omitted:0}};report.profiles.push(profileReport);
   const network=(kind,request,detail)=>{const url=diagnosticURL(request.url());if(!url||profileReport.network[kind].length>=64){profileReport.network.omitted++;return;}profileReport.network[kind].push({url,method:request.method(),resourceType:request.resourceType(),...detail});};
   page.on('requestfailed',request=>network('requestFailures',request,{error:String(request.failure()?.errorText||'unknown').slice(0,240)}));page.on('response',response=>{if(response.status()>=400)network('httpErrors',response.request(),{status:response.status()});});
   page.on('pageerror',error=>report.errors.push({profile,error:error.message}));page.on('console',message=>{if(message.type()==='error')report.errors.push({profile,error:message.text()});});
   try{
    const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');const bootStart=Date.now();profileReport.boot={url:diagnosticURL(url.href),startedAtUTC:new Date(bootStart).toISOString()};
    try{await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});profileReport.boot.ready=true;}catch(error){profileReport.boot.ready=false;profileReport.boot.failure=String(error.message).slice(0,600);profileReport.boot.diagnostic=await bootDiagnostic(page);throw error;}finally{profileReport.boot.wallMs=Date.now()-bootStart;save();}
    profileReport.initial=await page.evaluate(async baseline=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
     if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('Hardware GPU required: '+hardware);
     if(!g.getExtension('EXT_disjoint_timer_query_webgl2'))throw Error('Native GPU timer query extension is unavailable');
     if(VS!==baseline.VS)throw Error('Baseline VS differs: this test permits fragment-only changes');
     const initial={hardware,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,identicalVS:true};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;
     if(!renderer.surfacePrograms.has('1:6')||!renderer.surfacePrograms.has('2:5'))throw Error('Actual fish 1:6 and turtle 2:5 production specializations are required');
     const beforeGeneric=renderer.makeProgram(VS,baseline.FS),beforeFish=renderer.makeProgram(surfaceShaderSource(VS,1,6),surfaceShaderSource(baseline.FS,1,6));
     const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
     window.__animalMaterialCost={beforeGeneric,beforeFish,currentGeneric:renderer.program,currentFish:renderer.surfacePrograms.get('1:6'),currentTurtle:renderer.surfacePrograms.get('2:5')};
     initial.currentShaderSHA256={VS:await hash(VS),FS:await hash(FS),fishFS:await hash(surfaceShaderSource(FS,1,6)),turtleFS:await hash(surfaceShaderSource(FS,2,5))};initial.baselineFishFS=await hash(surfaceShaderSource(baseline.FS,1,6));return initial;
    },baseline);
    assert.equal(profileReport.initial.quality,touch?1:2);assert.equal(profileReport.initial.scale,1);assert(profileReport.initial.adaptive&&profileReport.initial.compiled&&profileReport.initial.streamed);save();
    for(const scene of ['turtle','banggai']){
     const row=await page.evaluate(async({scene,touch})=>{
      const result={scene,blocks:[],checks:[],failure:null},g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),programs=window.__animalMaterialCost,raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
      const unchangedPrograms=new Map([...renderer.surfacePrograms].filter(([key])=>key!=='1:6'&&key!=='2:5'));
      let query=null,queryActive=false;
      const median=values=>values.length?values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]:null;
      const finishBlock=block=>{if(block.endedAtMs!==undefined)return;block.endedAtMs=performance.now();block.endedWallAtMs=Date.now();block.elapsedMs=block.endedAtMs-block.startedAtMs;block.wallMs=block.endedWallAtMs-block.startedWallAtMs;block.measuredWallMs=block.measuredWallAtMs===undefined?null:block.endedWallAtMs-block.measuredWallAtMs;const cpu=block.samples.map(s=>s.cpuMs).filter(Number.isFinite);block.cpu={measuredSamples:cpu.length,medianMs:median(cpu),totalMs:cpu.reduce((a,b)=>a+b,0),maxMs:cpu.length?Math.max(...cpu):null};block.sampleCount=block.samples.length;block.validSamples=block.samples.filter(s=>s.status==='valid').length;block.hiddenAtEnd=document.hidden;block.hasFocusAtEnd=document.hasFocus();};
      const restore=()=>{renderer.program=programs.currentGeneric;renderer.surfacePrograms.set('1:6',programs.currentFish);renderer.surfacePrograms.set('2:5',programs.currentTurtle);};
      try{
       restore();updateLife(6);const actor=scene==='turtle'?life.find(f=>f.uid==='turtle-002'):life.find(f=>SPECIES[f.species]?.id==='banggai_cardinal');if(!actor||actor.ecologyPresent===false)throw Error('Actual present '+scene+' actor required');
       const batches=renderer.batches.filter(b=>!b.shadowProxy&&b.instances.includes(actor));if(batches.length!==2)throw Error('Both actual animal LODs are required');
       let offset,fov,near;
       if(scene==='turtle'){offset=[3.3,1.6,3.6];fov=touch?84:44;near=.08;}
       else{const radius=Math.max(...batches.map(b=>b.radius))*Math.max(...actor.s),distance=Math.max(.35,radius*3.5),direction=[.75,.32,1],length=Math.hypot(...direction);offset=direction.map(v=>v/length*distance);fov=2*Math.atan(radius*(touch?2.8:1.30)/distance)*180/Math.PI;near=.002;}
       const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),camera=[actor.p[0]+c*offset[0]+s*offset[2],actor.p[1]+offset[1],actor.p[2]-s*offset[0]+c*offset[2]],target=actor.p.slice(),time=6;
       if(OceanRockContact.overlaps(camera,near))throw Error('Controlled inspection camera is inside actual rock');
       renderer.photoFov=fov;renderer.photoNear=near;renderer.lamp=false;renderer.lighting='day';renderer.forceShadow=true;
       await renderer.sceneStream.ready(camera);
       result.view={uid:actor.uid,species:SPECIES[actor.species].id,position:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,scale:actor.s.slice(),camera,target,time,fov,near,lighting:renderer.lighting,lamp:renderer.lamp};
       const sceneIdentity=JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.ecologyPresent]));
       const actorSubmitted=b=>{const origin=renderer.renderOrigin||[0,0,0],p=actor.p.map((v,k)=>Math.fround(v-origin[k]));for(let i=0;i<b.drawCount;i++){const j=i*24;if(p.every((v,k)=>Math.abs(b.data[j+k]-v)<.00001)&&Math.abs(b.data[j+10]-Math.fround(actor.phase||0))<.00001)return true;}return false;};
       const stream=renderer.sceneStream,keep=stream.neededRanges(camera).keep;let settledResidency=null;
       const residency=()=>stream.meshes.filter(m=>m.resident).map(m=>m.id);
       const streamState=()=>({residentMeshes:stream.meshes.filter(m=>m.resident).length,outsideKeep:stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,pendingJobs:stream.jobs.size,queuedJobs:stream.queue.length,activeJobs:stream.active,requiredMissing:stream.requiredMissing.size,forceShadow:!!renderer.forceShadow,shadowMapDirty:!!renderer._shadowMapDirty,staticShadowUpdates:renderer.staticShadowUpdates||0});
       const stats=()=>({drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates||0,residencyMatches:JSON.stringify(residency())===settledResidency,stream:streamState(),submittedTriangles:renderer.submittedTriangles,submittedVertices:renderer.submittedVertices,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,selected:batches.map(b=>({kind:b.kind,material:b.material,species:b.species,minDistance:b.minDistance||0,count:b.count,drawCount:b.drawCount,actorSubmitted:actorSubmitted(b),program:renderer.surfaceProgram(b)===renderer.program?'generic':renderer.surfaceProgram(b)===renderer.surfacePrograms.get('1:6')?'1:6':renderer.surfaceProgram(b)===renderer.surfacePrograms.get('2:5')?'2:5':'unexpected'}))});
       const render=()=>renderer.render(camera,target,time),switchArm=arm=>{
        renderer.program=arm==='before'?programs.beforeGeneric:programs.currentGeneric;
        renderer.surfacePrograms.set('1:6',arm==='before'?programs.beforeFish:programs.currentFish);
        if(arm==='before')renderer.surfacePrograms.delete('2:5');else renderer.surfacePrograms.set('2:5',programs.currentTurtle);
        for(const [key,program]of unchangedPrograms)if(renderer.surfacePrograms.get(key)!==program)throw Error('Unrelated surface program changed: '+key);
        const expected=scene==='turtle'?(arm==='before'?renderer.program:programs.currentTurtle):renderer.surfacePrograms.get('1:6');
        for(const b of batches)if(renderer.surfaceProgram(b)!==expected)throw Error('Selected animal uses an unswapped program: '+scene+' kind='+b.kind+' material='+b.material);
       };
       // ready() covers required meshes only. A loaded chunk also contains
       // distant meshes, and the production streamer evicts these after five
       // seconds, invalidating the static shadow cache. Let that real lifecycle
       // finish before ABBA rather than dropping its expensive measured frame.
       const settleStart=performance.now();result.settling={frames:0,events:[],elapsedMs:null,residentIDs:null};let stable=0,previousState=null,previousReady=null;
       while(stable<2){
        if(performance.now()-settleStart>20000)throw Error('Real scene residency/shadow settling exceeded 20 seconds');
        await raf();const submitted=render();result.settling.frames++;const state=streamState(),ids=residency(),signature=JSON.stringify([state,ids]),error=g.getError();
        if(error)throw Error('Settling render GL error '+error);
        if(signature!==previousState){result.settling.events.push({elapsedMs:Math.round((performance.now()-settleStart)*10)/10,...state});previousState=signature;}
        const ready=submitted!==false&&!state.pendingJobs&&!state.queuedJobs&&!state.activeJobs&&!state.requiredMissing&&!state.outsideKeep&&!state.forceShadow&&!state.shadowMapDirty;
        stable=ready?(signature===previousReady?stable+1:1):0;previousReady=ready?signature:null;
        if(stable===2){settledResidency=JSON.stringify(ids);result.settling.residentIDs=ids;result.settling.elapsedMs=performance.now()-settleStart;}
       }
       const invariantStats=stats=>({...stats,selected:stats.selected.map(({program,...draw})=>draw)});
       let invariant=null,abort=false;
       for(const [blockIndex,arm]of ['before','current','current','before'].entries()){
        switchArm(arm);const expectedProgram=scene==='turtle'?(arm==='before'?'generic':'2:5'):'1:6',block={index:blockIndex,arm,expectedProgram,warmFrames:10,startedAtMs:performance.now(),startedWallAtMs:Date.now(),hiddenAtStart:document.hidden,hasFocusAtStart:document.hasFocus(),samples:[]};result.blocks.push(block);
        for(let i=0;i<10;i++){await raf();if(render()===false)throw Error('A warm frame was not submitted');}
        const warmGL=g.getError();if(warmGL)throw Error('Warm render GL error '+warmGL);block.warmWallMs=Date.now()-block.startedWallAtMs;block.measuredWallAtMs=Date.now();
        for(let i=0;i<25;i++){
         await raf();const sample={index:i,status:'pending',startedAtMs:performance.now(),startedWallAtMs:Date.now(),hidden:document.hidden,hasFocus:document.hasFocus(),gpuMs:null,cpuMs:null,rawNanoseconds:null,disjointBefore:!!g.getParameter(ext.GPU_DISJOINT_EXT)};block.samples.push(sample);
         query=g.createQuery();if(!query){sample.status='query-allocation-failed';sample.wallMs=Date.now()-sample.startedWallAtMs;abort=true;break;}
         g.beginQuery(ext.TIME_ELAPSED_EXT,query);queryActive=true;const begin=performance.now();const submitted=render();sample.cpuMs=performance.now()-begin;g.endQuery(ext.TIME_ELAPSED_EXT);queryActive=false;g.flush();sample.submitted=submitted!==false;sample.stats=stats();sample.gl=g.getError();
         const queryWaitStart=performance.now(),deadline=queryWaitStart+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline){sample.status='query-timeout';abort=true;break;}await raf();}
         sample.queryWaitMs=performance.now()-queryWaitStart;sample.disjointAfter=!!g.getParameter(ext.GPU_DISJOINT_EXT);
         if(sample.status!=='query-timeout'){
          sample.rawNanoseconds=g.getQueryParameter(query,g.QUERY_RESULT);const ns=sample.rawNanoseconds;
          sample.status=sample.disjointBefore||sample.disjointAfter?'disjoint':!sample.submitted?'frame-not-submitted':sample.gl?'gl-error':!Number.isFinite(ns)||ns<=0?'invalid-duration':'valid';
          if(sample.status==='valid')sample.gpuMs=ns/1e6;
         }
         g.deleteQuery(query);query=null;
         sample.programSelectionMatches=sample.stats.selected.every(b=>b.program===expectedProgram);
         if(!sample.programSelectionMatches&&sample.status==='valid')sample.status='wrong-selected-program';
         const signature=JSON.stringify(invariantStats(sample.stats));if(invariant===null)invariant=signature;sample.invariantsMatch=signature===invariant;
         if(!sample.invariantsMatch&&sample.status==='valid')sample.status='render-invariant-changed';
         if(!sample.stats.residencyMatches&&sample.status==='valid')sample.status='settled-residency-changed';
         if(!sample.stats.selected.some(b=>b.actorSubmitted)&&sample.status==='valid')sample.status='target-actor-not-submitted';
         sample.elapsedMs=performance.now()-sample.startedAtMs;sample.wallMs=Date.now()-sample.startedWallAtMs;sample.hiddenAtEnd=document.hidden;
         if(abort)break;
        }
        finishBlock(block);if(abort)break;
       }
       result.contentUnchanged=sceneIdentity===JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.ecologyPresent]));
       result.programSelection={bothScenesCompareCompleteCandidate:true,expected:scene==='turtle'?{before:'generic',current:'2:5'}:{before:'1:6',current:'1:6'},unrelatedSurfacePrograms:[...unchangedPrograms.keys()],selected:result.blocks[0]?.samples[0]?.stats?.selected};
       const samples=result.blocks.flatMap(b=>b.samples),complete=result.blocks.length===4&&result.blocks.every(b=>b.samples.length===25),valid=complete&&result.contentUnchanged&&samples.every(s=>s.status==='valid'&&s.invariantsMatch&&s.programSelectionMatches);
       result.valid=valid;result.sampleCount=samples.length;result.invalidSamples=samples.filter(s=>s.status!=='valid').map(s=>({block:result.blocks.find(b=>b.samples.includes(s))?.index,index:s.index,status:s.status}));
       if(valid){const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)],before=result.blocks.filter(b=>b.arm==='before').flatMap(b=>b.samples.map(s=>s.gpuMs)),current=result.blocks.filter(b=>b.arm==='current').flatMap(b=>b.samples.map(s=>s.gpuMs)),a=median(before),b=median(current);result.comparison={beforeMedianGpuMs:a,currentMedianGpuMs:b,deltaGpuMs:b-a,deltaPercent:(b/a-1)*100};}
       else result.comparison=null;
      }catch(error){result.valid=false;result.failure=error.stack;result.comparison=null;}
      finally{if(queryActive)g.endQuery(ext.TIME_ELAPSED_EXT);if(query)g.deleteQuery(query);for(const block of result.blocks)finishBlock(block);restore();}
      const baselineBlock=index=>{const b=result.blocks.find(b=>b.index===index&&b.arm==='before');if(!b)return null;const complete=b.samples.length===25&&b.samples.every(s=>s.status==='valid');return {block:index,sampleCount:b.samples.length,validSamples:b.validSamples,complete,medianGpuMs:complete?median(b.samples.map(s=>s.gpuMs)):null,medianCpuMs:b.cpu.medianMs,wallMs:b.wallMs,measuredWallMs:b.measuredWallMs};};
      const first=baselineBlock(0),last=baselineBlock(3),both=first?.complete&&last?.complete;
      result.baselineDrift={policy:'Diagnostic only. All samples retained; no outlier removal or automatic performance acceptance.',first,last,complete:!!both,deltaMedianGpuMs:both?last.medianGpuMs-first.medianGpuMs:null,medianGpuRatio:both?last.medianGpuMs/first.medianGpuMs:null,deltaMedianGpuPercent:both?(last.medianGpuMs/first.medianGpuMs-1)*100:null,deltaMedianCpuMs:both?last.medianCpuMs-first.medianCpuMs:null,measuredWallRatio:both?last.measuredWallMs/first.measuredWallMs:null};
      return result;
     },{scene,touch});
     profileReport.scenes.push(row);save();console.log(JSON.stringify({profile,scene,valid:row.valid,comparison:row.comparison,baselineDrift:row.baselineDrift,failure:row.failure,invalidSamples:row.invalidSamples}));
     assert(row.valid,'Invalid '+profile+' '+scene+' material timing; all collected samples retained in '+out);
    }
   }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-gpu-cost';
 }catch(error){report.status='failed-no-valid-comparison-for-incomplete-scenes';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
