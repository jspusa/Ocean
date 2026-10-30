/* v46 deep-fish shader cost. Same actual current world and meshes in both
 * arms; exact published v45 generic VS/FS versus current generic VS/FS.
 * Only the generic colour program changes. Shadows, specialized programs,
 * geometry, light and camera remain fixed. Root runs this alone. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const option=(key,fallback)=>{const inline=process.argv.find(a=>a.startsWith('--'+key+'='));if(inline)return inline.slice(key.length+3);const at=process.argv.indexOf('--'+key);return at>=0?process.argv[at+1]:fallback;};
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
// Fixed before running: no adaptive warm-up, sample replacement or retry-until-
// favorable. Prewarm both shader arms equally before the measured ABBA blocks.
const sampling=Object.freeze({settleWarmFrames:180,blockWarmFrames:30,samplesPerBlock:100,arms:Object.freeze(['before','current','current','before'])});
// Keep bounded public/loopback HTTP(S) diagnostics, never response bodies,
// credentials, query strings or fragments.
const diagnosticURL=value=>{try{const u=new URL(value),h=u.hostname.toLowerCase();if(!/^https?:$/.test(u.protocol))return null;const loopback=h==='localhost'||h==='127.0.0.1'||h==='[::1]';if(!loopback&&(!h.includes('.')||h.endsWith('.local')||h.includes(':')||/^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.)/.test(h)))return null;return (u.protocol+'//'+u.host+u.pathname).slice(0,350);}catch{return null;}};
function entryUIReady(){
 const start=document.getElementById('startBtn'),loading=document.getElementById('loading');
 if(!window.__ocean?.ready||!start||start.disabled||start.hidden)return false;
 if(['saveSessionGate','saveLoadGate'].some(id=>document.getElementById(id)?.open))return false;
 const box=start.getBoundingClientRect(),style=getComputedStyle(start);
 if(box.width<=0||box.height<=0||style.display==='none'||style.visibility==='hidden')return false;
 return !loading||loading.hidden||loading.classList.contains('gone')||loading.classList.contains('hidden');
}
async function bootDiagnostic(page){
 let timer;try{return await Promise.race([page.evaluate(()=>{
  const small=value=>String(value??'').slice(0,600),out={readyState:document.readyState,hidden:document.hidden,hasFocus:document.hasFocus(),visibilityState:document.visibilityState,bootText:small(document.getElementById('loading')?.textContent),loadDetail:small(document.getElementById('loadDetail')?.textContent),ocean:null,renderer:null};
  const element=id=>{const e=document.getElementById(id);if(!e)return {present:false};const style=getComputedStyle(e),box=e.getBoundingClientRect();return {present:true,classes:small(e.className),hidden:e.hidden,disabled:e.disabled,open:e.open,display:style.display,visibility:style.visibility,opacity:style.opacity,pointerEvents:style.pointerEvents,width:box.width,height:box.height};};
  out.ui={loading:element('loading'),start:element('startBtn'),welcome:element('welcome'),error:element('errorBox'),saveSessionGate:element('saveSessionGate'),saveLoadGate:element('saveLoadGate')};
  out.version=document.documentElement.dataset.version;out.frozen=window.__freeze===true;
  try{out.optionalBarramundi=typeof oceanBarramundi==='undefined'?null:oceanBarramundi.status(typeof renderer==='undefined'?undefined:renderer);}catch(error){out.optionalBarramundi={error:small(error.message)};}
  try{const o=window.__ocean;out.ocean=o?{present:true,ready:o.ready,active:o.active,speciesCount:o.speciesCount,creatureCount:o.creatureCount,view:o.view}:{present:false};}catch(error){out.ocean={error:small(error.message)};}
  try{const r=typeof renderer==='undefined'?null:renderer;if(r){const st=r.sceneStream;out.renderer={initialized:true,contextLost:r.gl?.isContextLost(),quality:r.quality,scale:r.dynamicScale,resolution:r.canvas?[r.canvas.width,r.canvas.height]:null,loadState:Object.fromEntries(Object.entries(r.sceneLoad||{}).filter(([,v])=>v===null||typeof v==='number'||typeof v==='boolean').slice(0,24)),stream:st?{pendingJobs:st.jobs?.size,queuedJobs:st.queue?.length,activeJobs:st.active,requiredMissing:st.requiredMissing?.size}:null};}else out.renderer={initialized:false};}catch(error){out.renderer={error:small(error.message)};}return out;
 }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Boot diagnostic exceeded 3 seconds')),3000);})]);}catch(error){return {diagnosticError:String(error.message).slice(0,600)};}finally{clearTimeout(timer);}
}
async function main(){
 const baselinePath=option('baseline-engine',null);if(!baselinePath)throw Error('Required: --baseline-engine=/absolute/path/to/baseline-engine.js');
 const baselineEngine=fs.readFileSync(path.resolve(baselinePath),'utf8'),shaderValues=source=>vm.runInNewContext(source+'\n({VS,FS,specializer:surfaceShaderSource.toString()})',{console},{timeout:10000}),baseline=shaderValues(baselineEngine);
 const baselineSHA256='a87f040ff2ec756173dfde595bd9147559870c6f0a1910c36783fc7cd8346304';
 assert.equal(digest(baselineEngine),baselineSHA256,'Use the exact published 5c43505 v0.18.45 engine');
 const candidatePath=path.resolve(__dirname,'../../src/engine.js'),candidateEngine=fs.readFileSync(candidatePath,'utf8'),candidate=shaderValues(candidateEngine);
 assert.equal(candidate.specializer,baseline.specializer,'Production specialization builder must match');
 const out=path.resolve(option('out','qa/parity/v01846-material/shader-cost.json')),profiles=option('profile','both')==='both'?['desktop','touch']:[option('profile','both')];
 assert(profiles.every(p=>p==='desktop'||p==='touch'));
 const report={status:'running',sampling,baseline:{path:path.resolve(baselinePath),engineSHA256:digest(baselineEngine),VS:digest(baseline.VS),FS:digest(baseline.FS)},candidate:{path:candidatePath,engineSHA256:digest(candidateEngine),VS:digest(candidate.VS),FS:digest(candidate.FS)},method:'Installed native Chrome complete world, fixed actual current geometry and resources. Exact published v45 generic VS/FS versus current generic VS/FS; specialized and shadow programs stay unchanged. Fixed 180 ABBA prewarm frames, then four blocks of 30 warm and 100 measured frames. Every sample retained; changed workload, GL errors or disjoint query invalidates the comparison. No screenshots/readPixels or competing CPU/GPU work during timing. Shader cost only, not geometry savings, phone FPS or battery evidence',profiles:[],errors:[]};
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
    try{
     profileReport.boot.phase='navigation';await page.goto(url.href);
     profileReport.boot.phase='application-ready';await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});profileReport.boot.applicationReady=true;
     // Boot deliberately only ensures the logical optional-fish actor. Its
     // asset load starts after a real dive/gallery action, neither of which
     // this stationary material comparison performs. Waiting for that idle
     // asset could never finish and is unrelated to entry UI readiness.
     profileReport.boot.phase='entry-ui';await page.waitForFunction(entryUIReady,null,{timeout:20000});
     profileReport.boot.ready=true;profileReport.boot.phase='complete';profileReport.boot.diagnostic=await bootDiagnostic(page);
    }catch(error){profileReport.boot.ready=false;profileReport.boot.failure=String(error.message).slice(0,600);profileReport.boot.diagnostic=await bootDiagnostic(page);throw error;}finally{profileReport.boot.wallMs=Date.now()-bootStart;save();}
    profileReport.initial=await page.evaluate(async({baseline,candidate})=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
     if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('Hardware GPU required: '+hardware);
     if(!g.getExtension('EXT_disjoint_timer_query_webgl2'))throw Error('Native GPU timer query extension is unavailable');
     if(VS!==candidate.VS||FS!==candidate.FS)throw Error('Served shaders differ from local candidate or baseline vertex arithmetic; rebuild before timing');
     if(surfaceShaderSource.toString()!==candidate.specializer)throw Error('Served production specialization builder changed');
     const initial={hardware,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,sameGeometry:true,optionalBarramundi:oceanBarramundi.status(renderer)};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;
     const beforeDeep=renderer.makeProgram(baseline.VS,baseline.FS),currentDeep=renderer.program;
     const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
     window.__deepV46Cost={beforeDeep,currentDeep,currentGeneric:renderer.program,textures:renderer.textures.slice()};
     initial.textureCount=renderer.textures.length;initial.currentShaderSHA256={VS:await hash(VS),FS:await hash(FS),genericFS:await hash(FS)};initial.baselineGenericFS=await hash(baseline.FS);return initial;
    },{baseline,candidate});
    assert.equal(profileReport.initial.quality,touch?1:2);assert.equal(profileReport.initial.scale,1);assert(profileReport.initial.adaptive&&profileReport.initial.compiled&&profileReport.initial.streamed);assert.equal(profileReport.initial.textureCount,9);save();
    for(const scene of ['coelacanth-002','pelican_eel-001','humpback_anglerfish-001']){
     const row=await page.evaluate(async({scene,touch,sampling})=>{
      const result={scene,blocks:[],checks:[],failure:null},g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),programs=window.__deepV46Cost,raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RAF did not arrive within two seconds')),2000);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
      const unchangedPrograms=new Map(renderer.surfacePrograms);
      let targetBuffers=null;
      const sharedStable=()=>[programs.currentDeep,programs.beforeDeep].includes(renderer.program)&&renderer.surfacePrograms.size===unchangedPrograms.size&&[...unchangedPrograms].every(([key,value])=>renderer.surfacePrograms.get(key)===value)&&renderer.textures.length===programs.textures.length&&programs.textures.every((value,i)=>renderer.textures[i]===value)&&(!targetBuffers||targetBuffers.every(r=>r.batch.vb===r.vb&&r.batch.eb===r.eb&&r.batch.vao===r.vao&&r.batch.count===r.count&&r.batch.vertexCount===r.vertexCount&&r.batch.radius===r.radius));
      let query=null,queryActive=false;
      const median=values=>values.length?values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]:null;
      const finishBlock=block=>{if(block.endedAtMs!==undefined)return;block.endedAtMs=performance.now();block.endedWallAtMs=Date.now();block.elapsedMs=block.endedAtMs-block.startedAtMs;block.wallMs=block.endedWallAtMs-block.startedWallAtMs;block.measuredWallMs=block.measuredWallAtMs===undefined?null:block.endedWallAtMs-block.measuredWallAtMs;const cpu=block.samples.map(s=>s.cpuMs).filter(Number.isFinite);block.cpu={measuredSamples:cpu.length,medianMs:median(cpu),totalMs:cpu.reduce((a,b)=>a+b,0),maxMs:cpu.length?Math.max(...cpu):null};block.sampleCount=block.samples.length;block.validSamples=block.samples.filter(s=>s.status==='valid').length;block.hiddenAtEnd=document.hidden;block.hasFocusAtEnd=document.hasFocus();};
      const restore=()=>renderer.program=programs.currentDeep;
      try{
       restore();updateLife(6);const actor=life.find(f=>f.uid===scene);if(!actor||actor.ecologyPresent===false)throw Error('Actual present deep actor required');
       const batches=renderer.batches.filter(b=>!b.shadowProxy&&b.instances.includes(actor));if(batches.length!==2)throw Error('Both actual animal LODs are required');
       const distance=scene.startsWith('coelacanth')?2.4:scene.startsWith('pelican')?1.2:.55,offset=[distance*.25,distance*.2,distance],fov=touch?60:35,near=.02;
       const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),camera=[actor.p[0]+c*offset[0]+s*offset[2],actor.p[1]+offset[1],actor.p[2]-s*offset[0]+c*offset[2]],target=actor.p.slice(),time=6;
       if(OceanRockContact.overlaps(camera,near))throw Error('Controlled inspection camera is inside actual rock');
       renderer.photoFov=fov;renderer.photoNear=near;renderer.lamp=true;renderer.lighting='day';renderer.forceShadow=true;
       await renderer.sceneStream.ready(camera);
       targetBuffers=batches.map(batch=>({batch,vb:batch.vb,eb:batch.eb,vao:batch.vao,count:batch.count,vertexCount:batch.vertexCount,radius:batch.radius}));
       if(!targetBuffers.some(r=>r.vb&&r.eb&&r.vao))throw Error('No actual uploaded deep geometry is resident');
       result.geometry=batches.map(b=>({count:b.count,vertexCount:b.vertexCount,radius:b.radius,minDistance:b.minDistance||0,maxDistance:b.maxDistance||0,kind:b.kind,material:b.material}));
       result.view={uid:actor.uid,species:SPECIES[actor.species].id,position:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,scale:actor.s.slice(),camera,target,time,fov,near,lighting:renderer.lighting,lamp:renderer.lamp};
       const sceneIdentity=JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.ecologyPresent]));
       const actorSubmitted=b=>{const origin=renderer.renderOrigin||[0,0,0],p=actor.p.map((v,k)=>Math.fround(v-origin[k]));for(let i=0;i<b.drawCount;i++){const j=i*24;if(p.every((v,k)=>Math.abs(b.data[j+k]-v)<.00001)&&Math.abs(b.data[j+10]-Math.fround(actor.phase||0))<.00001)return true;}return false;};
       const stream=renderer.sceneStream,keep=stream.neededRanges(camera).keep;let settledResidency=null;
       const residency=()=>stream.meshes.filter(m=>m.resident).map(m=>m.id);
       const streamState=()=>({residentMeshes:stream.meshes.filter(m=>m.resident).length,outsideKeep:stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,pendingJobs:stream.jobs.size,queuedJobs:stream.queue.length,activeJobs:stream.active,requiredMissing:stream.requiredMissing.size,forceShadow:!!renderer.forceShadow,shadowMapDirty:!!renderer._shadowMapDirty,staticShadowUpdates:renderer.staticShadowUpdates||0});
       const stats=()=>({sharedProgramsAndTexturesUnchanged:sharedStable(),drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates||0,residencyMatches:JSON.stringify(residency())===settledResidency,stream:streamState(),submittedTriangles:renderer.submittedTriangles,submittedVertices:renderer.submittedVertices,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,selected:batches.map(b=>({kind:b.kind,material:b.material,species:b.species,minDistance:b.minDistance||0,count:b.count,drawCount:b.drawCount,actorSubmitted:actorSubmitted(b),program:renderer.surfaceProgram(b)===programs.beforeDeep?'baseline-generic':renderer.surfaceProgram(b)===programs.currentDeep?'current-generic':'unexpected'}))});
       const render=()=>renderer.render(camera,target,time),switchArm=arm=>{
        const expected=arm==='before'?programs.beforeDeep:programs.currentDeep;renderer.program=expected;
        if(!sharedStable())throw Error('Unrelated production program or texture object changed');
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
       // Warm the complete production world, not a shader-only draw. Retain
       // every warm row and fail on a changed workload; do not wait for a
       // favorable timing result or remove slow frames from later samples.
       const warmFrame=async(arm,index,rows)=>{
        await raf();const row={index,arm,hidden:document.hidden,hasFocus:document.hasFocus(),startedAtMs:performance.now(),status:'pending'};rows.push(row);
        const begin=performance.now();row.submitted=render()!==false;row.cpuMs=performance.now()-begin;row.gl=g.getError();row.stats=stats();row.hiddenAtEnd=document.hidden;
        const expected=arm==='before'?'baseline-generic':'current-generic';row.programSelectionMatches=row.stats.sharedProgramsAndTexturesUnchanged&&row.stats.selected.every(b=>b.program===expected);
        const signature=JSON.stringify(invariantStats(row.stats));if(invariant===null)invariant=signature;row.invariantsMatch=signature===invariant;
        row.status=!row.submitted?'frame-not-submitted':row.gl?'gl-error':!row.programSelectionMatches?'wrong-selected-program':!row.invariantsMatch?'render-invariant-changed':!row.stats.residencyMatches?'settled-residency-changed':!row.stats.selected.some(b=>b.actorSubmitted)?'target-actor-not-submitted':row.hidden||row.hiddenAtEnd?'hidden-during-warm':'valid';
        row.elapsedMs=performance.now()-row.startedAtMs;if(row.status!=='valid')throw Error('Invalid warm frame '+index+' ('+arm+'): '+row.status);
       };
       const segmentFrames=sampling.settleWarmFrames/sampling.arms.length;if(!Number.isInteger(segmentFrames))throw Error('Prewarm count must divide evenly across ABBA');
       result.prewarm={requestedFrames:sampling.settleWarmFrames,framesPerSegment:segmentFrames,arms:sampling.arms.slice(),startedAtMs:performance.now(),startedWallAtMs:Date.now(),frames:[]};
       try{for(const arm of sampling.arms){switchArm(arm);for(let i=0;i<segmentFrames;i++)await warmFrame(arm,result.prewarm.frames.length,result.prewarm.frames);}}
       finally{result.prewarm.elapsedMs=performance.now()-result.prewarm.startedAtMs;result.prewarm.wallMs=Date.now()-result.prewarm.startedWallAtMs;result.prewarm.completedFrames=result.prewarm.frames.filter(f=>f.status==='valid').length;}
       for(const [blockIndex,arm]of sampling.arms.entries()){
        switchArm(arm);const expectedProgram=arm==='before'?'baseline-generic':'current-generic',block={index:blockIndex,arm,expectedProgram,warmFrames:sampling.blockWarmFrames,warmSamples:[],startedAtMs:performance.now(),startedWallAtMs:Date.now(),hiddenAtStart:document.hidden,hasFocusAtStart:document.hasFocus(),samples:[]};result.blocks.push(block);
        for(let i=0;i<sampling.blockWarmFrames;i++)await warmFrame(arm,i,block.warmSamples);
        const warmGL=g.getError();if(warmGL)throw Error('Warm render GL error '+warmGL);block.warmWallMs=Date.now()-block.startedWallAtMs;block.measuredWallAtMs=Date.now();
        for(let i=0;i<sampling.samplesPerBlock;i++){
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
         sample.programSelectionMatches=sample.stats.selected.every(b=>b.program===expectedProgram)&&sample.stats.sharedProgramsAndTexturesUnchanged;
         if(!sample.programSelectionMatches&&sample.status==='valid')sample.status='wrong-selected-program';
         const signature=JSON.stringify(invariantStats(sample.stats));if(invariant===null)invariant=signature;sample.invariantsMatch=signature===invariant;
         if(!sample.invariantsMatch&&sample.status==='valid')sample.status='render-invariant-changed';
         if(!sample.stats.residencyMatches&&sample.status==='valid')sample.status='settled-residency-changed';
         if(!sample.stats.selected.some(b=>b.actorSubmitted)&&sample.status==='valid')sample.status='target-actor-not-submitted';
         sample.elapsedMs=performance.now()-sample.startedAtMs;sample.wallMs=Date.now()-sample.startedWallAtMs;sample.hiddenAtEnd=document.hidden;
         if((sample.hidden||sample.hiddenAtEnd)&&sample.status==='valid')sample.status='hidden-during-sample';
         if(abort)break;
        }
        finishBlock(block);if(abort)break;
       }
       result.contentUnchanged=sceneIdentity===JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.ecologyPresent]));
       result.programSelection={exactV45ToV46GenericShaders:true,expected:{before:'baseline-generic',current:'current-generic'},unrelatedSurfacePrograms:[...unchangedPrograms.keys()],selected:result.blocks[0]?.samples[0]?.stats?.selected};
       const samples=result.blocks.flatMap(b=>b.samples),complete=result.prewarm.completedFrames===sampling.settleWarmFrames&&result.blocks.length===sampling.arms.length&&result.blocks.every(b=>b.warmSamples.length===sampling.blockWarmFrames&&b.warmSamples.every(f=>f.status==='valid')&&b.samples.length===sampling.samplesPerBlock),valid=complete&&result.contentUnchanged&&samples.every(s=>s.status==='valid'&&s.invariantsMatch&&s.programSelectionMatches);
       result.valid=valid;result.sampleCount=samples.length;result.invalidSamples=samples.filter(s=>s.status!=='valid').map(s=>({block:result.blocks.find(b=>b.samples.includes(s))?.index,index:s.index,status:s.status}));
       if(valid){const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)],before=result.blocks.filter(b=>b.arm==='before').flatMap(b=>b.samples.map(s=>s.gpuMs)),current=result.blocks.filter(b=>b.arm==='current').flatMap(b=>b.samples.map(s=>s.gpuMs)),a=median(before),b=median(current);result.comparison={beforeMedianGpuMs:a,currentMedianGpuMs:b,deltaGpuMs:b-a,deltaPercent:(b/a-1)*100};}
       else result.comparison=null;
      }catch(error){result.valid=false;result.failure=error.stack;result.comparison=null;}
      finally{if(queryActive)g.endQuery(ext.TIME_ELAPSED_EXT);if(query)g.deleteQuery(query);for(const block of result.blocks)finishBlock(block);restore();}
      const baselineBlock=index=>{const b=result.blocks.find(b=>b.index===index&&b.arm==='before');if(!b)return null;const complete=b.samples.length===sampling.samplesPerBlock&&b.samples.every(s=>s.status==='valid');return {block:index,sampleCount:b.samples.length,validSamples:b.validSamples,complete,medianGpuMs:complete?median(b.samples.map(s=>s.gpuMs)):null,medianCpuMs:b.cpu.medianMs,wallMs:b.wallMs,measuredWallMs:b.measuredWallMs};};
      const first=baselineBlock(0),last=baselineBlock(3),both=first?.complete&&last?.complete;
      result.baselineDrift={policy:'Diagnostic only. All samples retained; no outlier removal or automatic performance acceptance.',first,last,complete:!!both,deltaMedianGpuMs:both?last.medianGpuMs-first.medianGpuMs:null,medianGpuRatio:both?last.medianGpuMs/first.medianGpuMs:null,deltaMedianGpuPercent:both?(last.medianGpuMs/first.medianGpuMs-1)*100:null,deltaMedianCpuMs:both?last.medianCpuMs-first.medianCpuMs:null,measuredWallRatio:both?last.measuredWallMs/first.measuredWallMs:null};
      return result;
     },{scene,touch,sampling});
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
module.exports={entryUIReady,sampling};
