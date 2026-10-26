/* Controlled same-context shader comparison. Root serializes native GPU work.
 * Author validation is syntax/options only; this is not a natural-play test. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const base='7b4961e7979593cf6e88b4236b601a5530284587',url=option('url','http://127.0.0.1:8765/'),name=option('profile','desktop'),pixelsOnly=process.argv.includes('--pixels-only');
const output=path.resolve(root,option('out','/tmp/ocean-snailfish-light-'+Date.now()+'/report.json'));
const baseline=cp.execFileSync('git',['show',base+':src/engine.js'],{cwd:root,encoding:'utf8'}),candidate=fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),expectedVersion=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
const allScenes=[
 {id:'snailfish-side-t8',species:'mariana_snailfish',angle:0,time:8,timed:true},
 {id:'snailfish-oblique-t8',species:'mariana_snailfish',angle:Math.PI/4,time:8},
 {id:'snailfish-side-t23',species:'mariana_snailfish',angle:0,time:23},
 {id:'snailfish-oblique-t23',species:'mariana_snailfish',angle:Math.PI/4,time:23},
 {id:'sea-pig-t8',species:'sea_pig',angle:0,time:8},
 {id:'vampire-squid-t8',species:'vampire_squid',angle:0,time:8},
 {id:'cinderella-slug-t8',species:'cinderella_slug',angle:0,time:8},
 {id:'nautilus-t8',species:'nautilus',angle:0,time:8},
 {id:'reef-t8',species:null,angle:0,time:8,timed:true}
];
assert(['desktop','touch'].includes(name),'Run one --profile=desktop or --profile=touch per invocation');
const ids=option('scenes',allScenes.map(s=>s.id).join(',')).split(',');
assert(ids.length&&new Set(ids).size===ids.length&&ids.every(id=>allScenes.some(s=>s.id===id)),'--scenes must select unique declared scene IDs');
const scenes=ids.map(id=>({...allScenes.find(s=>s.id===id),timed:!pixelsOnly&&!!allScenes.find(s=>s.id===id).timed,lighting:id==='nautilus-t8'?'blue':'day',minute:id==='nautilus-t8'?1290:540}));
// Daytime timing and pixel fixtures finish before the night-only control. This
// avoids advancing the calendar back to morning between a timed fixture and its
// image revisit, while preserving the real expedition schedule for every case.
const imageScenes=[...scenes.filter(s=>s.minute===540),...scenes.filter(s=>s.minute===1290)];
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const median=values=>{const a=values.slice().sort((x,y)=>x-y);assert(a.length);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
const stats=values=>({count:values.length,median:median(values),min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length});
const geometrySources=['src/trench_fauna.js','src/fauna.js','src/individuals.js','src/world.js'].map(file=>{
 const old=cp.execFileSync('git',['show',base+':'+file],{cwd:root}),now=fs.readFileSync(path.join(root,file));
 assert(old.equals(now),'This shader-only comparison requires unchanged authored geometry/motion input: '+file);return {file,sha256:hash(now),matchesBaseline:true};
});
const report={url,base,expectedVersion,pixelsOnly,status:'running',sourceSHA256:{baseline:hash(baseline),candidate:hash(candidate)},geometrySources,profile:{name,scenes:[],clockPreparations:[],imageOrder:imageScenes.map(s=>s.id)},errors:[],
 method:'One visible installed native Chrome context. Compile the pinned baseline generic, eight surface variants and shadow program through its original Renderer makeProgram/setupSurfacePrograms; current programs are the actual original renderer programs. Verify every attached VS/FS against its source generator. Swap only those program slots. All other programs, resources, actual actors, body size, geometry and batch visibility remain unchanged within each fixture. Fixed time 8 or 23; legal original-habitat side/oblique camera, default initial quality and scale 1. Preload canonical keep chunks through the actual scene loader and require a stable complete residency signature. Ten warm renders, then 25 complete-render GPU timer queries in each ABBA block for close snailfish and reef only. Finish every timed scene before any image readback. Revisit timed fixtures with identical conditions; prepare untimed image fixtures after all timing, with night-only nautilus last. Keep the actual expedition clock at 09:00 for day fixtures, then use the existing ship Prepare Night Dive UI at 21:30 for nautilus; disable automatic clock lighting through its existing checkbox. Each fixture uses its matching day/blue light. Retain full PNG/RGBA hashes and signed pixel/timing differences. Changed-object pixel differences are diagnostic, not a byte-exact acceptance claim. This is not natural gameplay, physical-phone, battery or gameplay-FPS evidence.',
 pixelAcceptance:{policy:'Collect every requested matched scene; report every changed channel without a winner threshold. Fail invalid GL, unavailable subject, changed workload, black lit images or non-repeatable same-program RGBA. Unaffected-control acceptance is reviewed against the final production scope.'}};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const imagePath=(scene,mode)=>output.replace(/\.json$/,'')+'-'+name+'-'+scene+'-'+mode+'.png';

async function run(){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 let context,page,read;const profile=report.profile;save();
 try{
  const touch=name==='touch';context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({error:e.message}));page.on('crash',()=>report.errors.push({error:'Renderer process crashed'}));page.on('console',m=>{if(m.type()==='error')report.errors.push({error:m.text()});});
  await page.route('**/src/engine.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:candidate}));
  const cdp=await context.newCDPSession(page);
  read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await page.bringToFront();
  const readyDeadline=Date.now()+120000;while(!await read(()=>window.__ocean?.ready)){if(Date.now()>readyDeadline)throw Error('Ocean boot timeout');await page.waitForTimeout(50);}
  profile.meta=await read(async({baselineSource,candidateSource,pixelsOnly})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'';
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware)||(!pixelsOnly&&!ext))throw Error('Native hardware GPU and timer extension required');
   const exports='\n;return {Renderer,surfaceShaderSource,VS,FS,SHADOW_FS,POINT_VS,POINT_FS,BUBBLE_VS,BUBBLE_FS,RAY_VS,RAY_FS,VOLUME_FS,POST_VS,POST_FS,AA_FS,WATER_VS,WATER_FS,SKY_FS,VOLUME_FILTER_FS};';
   const old=Function(baselineSource+exports)(),disk=Function(candidateSource+exports)();
   const current={Renderer,surfaceShaderSource,VS,FS,SHADOW_FS,POINT_VS,POINT_FS,BUBBLE_VS,BUBBLE_FS,RAY_VS,RAY_FS,VOLUME_FS,POST_VS,POST_FS,AA_FS,WATER_VS,WATER_FS,SKY_FS,VOLUME_FILTER_FS};
   for(const key of Object.keys(current).filter(key=>!['Renderer','surfaceShaderSource'].includes(key)))if(current[key]!==disk[key])throw Error('Current shader differs from working tree: '+key);
   for(const key of Object.keys(current).filter(key=>!['Renderer','surfaceShaderSource','VS'].includes(key)))if(current[key]!==old[key])throw Error('VS-only comparison found another shader change: '+key);
   if(current.surfaceShaderSource.toString()!==disk.surfaceShaderSource.toString())throw Error('Current surface generator differs from working tree');
   if(current.surfaceShaderSource.toString()!==old.surfaceShaderSource.toString())throw Error('VS-only comparison requires the unchanged production surface generator');
   for(const method of ['makeProgram','setupSurfacePrograms','surfaceProgram','render','common','updateBatch','drawBatch','batchUniforms']){
    if(Object.hasOwn(renderer,method)||renderer[method]!==current.Renderer.prototype[method])throw Error('Unexpected renderer method override: '+method);
    if(current.Renderer.prototype[method].toString()!==old.Renderer.prototype[method].toString())throw Error('Shader comparison cannot include rendering-method changes: '+method);
   }
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,freeze:window.__freeze,third:settings.third,active};
   if(!initial.adaptive||initial.scale!==1)throw Error('Fresh automatic full-scale initial state required');
   const candidatePrograms={program:renderer.program,surfacePrograms:renderer.surfacePrograms,shadowProgram:renderer.shadowProgram};
   if(candidatePrograms.surfacePrograms?.size!==8||renderer.surfaceProgramFailures?.size)throw Error('Eight actual surface variants required');
   const untouchedKeys=['pointProgram','bubbleProgram','rayProgram','volumeProgram','postProgram','aaProgram','waterProgram','skyProgram','volumeFilterProgram'];
   const untouched=Object.fromEntries(untouchedKeys.map(key=>[key,renderer[key]]));
   const compiler=Object.create(old.Renderer.prototype);compiler.gl=g;
   compiler.program=compiler.makeProgram(old.VS,old.FS);compiler.setupSurfacePrograms();compiler.shadowProgram=compiler.makeProgram(old.VS,old.SHADOW_FS);
   const baselinePrograms={program:compiler.program,surfacePrograms:compiler.surfacePrograms,shadowProgram:compiler.shadowProgram};
   const owned=[compiler.program,...compiler.surfacePrograms.values(),compiler.shadowProgram];
   if(compiler.surfacePrograms.size!==8||compiler.surfaceProgramFailures.size)throw Error('Pinned baseline surface compilation failed: '+JSON.stringify([...compiler.surfaceProgramFailures]));
   const attached=(program,type)=>{const shader=(g.getAttachedShaders(program.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!shader)throw Error('Attached GPU shader unavailable');return g.getShaderSource(shader);};
   const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
   const sourceEvidence=[];
   for(const [mode,source,programs]of [['baseline',old,baselinePrograms],['candidate',disk,candidatePrograms]]){
    const entries=[['generic',programs.program,source.VS,source.FS],['shadow',programs.shadowProgram,source.VS,source.SHADOW_FS]];
    for(const [key,program]of programs.surfacePrograms){const [kind,material]=key.split(':').map(Number);entries.push(['surface-'+key,program,kind===11&&material===0||kind===0&&[12,16,17].includes(material)?source.VS:source.surfaceShaderSource(source.VS,kind,material),source.surfaceShaderSource(source.FS,kind,material)]);}
    for(const [slot,program,vs,fs]of entries){if(!g.getProgramParameter(program.p,g.LINK_STATUS)||attached(program,g.VERTEX_SHADER)!==vs||attached(program,g.FRAGMENT_SHADER)!==fs)throw Error('Actual attached source mismatch: '+mode+' '+slot);sourceEvidence.push({mode,slot,vertexSHA256:await sha(vs),fragmentSHA256:await sha(fs),linked:true});}
   }
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();
   const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),queries=new Set();
   let fixture=null,selected=null,baselinePixels=null,modePixels=new Map(),restored=false;
   function select(mode){if(!['baseline','candidate'].includes(mode))throw Error('Unknown program selection');Object.assign(renderer,mode==='baseline'?baselinePrograms:candidatePrograms);renderer._shadowKey=null;renderer.forceShadow=true;selected=mode;}
   const render=()=>{const before=renderer.frame,result=renderer.render(fixture.camera,fixture.aim,fixture.time);if(result===false)return false;if(renderer.frame!==before+1)throw Error('Expected one completed production render');return true;};
   const streamState=()=>{const s=renderer.sceneStream;if(!s)return {keep:[],resident:[],outsideKeep:[],missingKeep:[],pinned:[],pendingChunks:[],active:0,queued:0};const keep=s.neededRanges(fixture.camera).keep;return {keep:[...keep].sort((a,b)=>a-b),resident:s.meshes.filter(m=>m.resident).map(m=>m.id),outsideKeep:s.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id),missingKeep:[...keep].filter(id=>!s.meshes[id].resident).sort((a,b)=>a-b),pinned:s.meshes.filter(m=>m.pinned).map(m=>m.id),pendingChunks:[...s.jobs.keys()].sort((a,b)=>a-b),active:s.active,queued:s.queue.length};};
   const preloadKeep=async()=>{const s=renderer.sceneStream,before=streamState(),chunkIDs=s?[...new Set(before.missingKeep.map(id=>s.meshes[id].meta.chunk))].sort((a,b)=>a-b):[];const record={policy:'canonical-loaded-keep',before,chunkIDs};window.__snailfishLight.lastPreparation={id:fixture.id,phase:'loading-keep',canonical:record};if(s)await Promise.all(chunkIDs.map(id=>s.request(id,1)));record.after=streamState();window.__snailfishLight.lastPreparation.phase='settling';return record;};
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Controlled page lost focus');const s=streamState();if(g.isContextLost()||renderer.pendingResize||s.pendingChunks.length||s.active||s.queued||s.outsideKeep.length||s.missingKeep.length||(renderer.forceShadow&&!renderer.sunless))throw Error('Fixed workload did not settle');};
   const clockState=()=>{const s=oceanFeatures.state('expedition');return {day:s.day,minute:s.minute,clockAuto:s.clockAuto};};
   const conditions=()=>({voyageClock:clockState(),camera:fixture.camera.slice(),aim:fixture.aim.slice(),time:fixture.time,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,floatColor:renderer.floatColor,photoFov:renderer.photoFov||null,photoAperture:renderer.photoAperture||0,photoFocus:renderer.photoFocus||8,photoNear:renderer.photoNear||null,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),sun:renderer.sun,adaptive:settings.adaptive,freeze:window.__freeze,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,batchCount:renderer.batches.length,bubbles:renderer.bubbles.map(b=>({p:b.p.slice(),r:b.r,a:b.a,phase:b.phase})),animalPoses:life.map(f=>({uid:f.uid,p:f.p.slice(),yaw:f.yaw,pitch:f.pitch||0,s:f.s.slice(),ecologyPresent:f.ecologyPresent??null,faunaVisibility:f.faunaVisibility??null})),residentMeshes:streamState().resident});
   const resourceKeys=['sceneFBO','sceneColor','sceneDepth','msaaFBO','volumeFBO','volumeFilteredFBO','aaFBO','aaColor','particleVAO','bubbleVAO','bubbleBuffer'];
   const mark=()=>{fixture.conditions=conditions();fixture.batches=renderer.batches.slice();fixture.visibility=renderer.batches.map(b=>b.visible);fixture.meshes=renderer.batches.map(b=>[b.vao,b.vb,b.eb,b.ib,b.count,b.vertexCount]);fixture.resources=Object.fromEntries(resourceKeys.map(key=>[key,renderer[key]]));};
   const unchanged=()=>{if(!same(conditions(),fixture.conditions))throw Error('Fixed camera/content/quality conditions changed');if(renderer.batches.length!==fixture.batches.length||renderer.batches.some((b,i)=>b!==fixture.batches[i]||b.visible!==fixture.visibility[i]||[b.vao,b.vb,b.eb,b.ib,b.count,b.vertexCount].some((value,k)=>value!==fixture.meshes[i][k])))throw Error('Batch/geometry identity or visibility changed');for(const [key,value]of Object.entries(fixture.resources))if(renderer[key]!==value)throw Error('Render resource replaced: '+key);for(const [key,value]of Object.entries(untouched))if(renderer[key]!==value)throw Error('Untouched program changed: '+key);const chosen=selected==='baseline'?baselinePrograms:candidatePrograms;for(const key of Object.keys(chosen))if(renderer[key]!==chosen[key])throw Error('Selected program slot changed: '+key);};
   const warm=async(count=10,settle=false)=>{let complete=0,total=0,stableSince=null,signature=null,stableMs=0,last=null;const begin=performance.now();while(complete<count||(settle&&stableMs<550)){await raf();total++;const rendered=render(),now=performance.now();if(settle){last=streamState();const next=JSON.stringify({keep:last.keep,resident:last.resident,pinned:last.pinned}),quiet=rendered&&!renderer.pendingResize&&(!renderer.forceShadow||renderer.sunless)&&!last.pendingChunks.length&&!last.active&&!last.queued&&!last.outsideKeep.length&&!last.missingKeep.length;if(quiet){if(signature!==next||stableSince===null){signature=next;stableSince=now;complete=0;}stableMs=now-stableSince;complete++;}else{stableSince=null;signature=null;stableMs=0;complete=0;}window.__snailfishLight.lastPreparation.stream=last;window.__snailfishLight.lastPreparation.stableMs=stableMs;}else if(rendered&&!renderer.pendingResize&&!renderer.sceneStream?.jobs.size)complete++;else complete=0;if(now-begin>60000)throw Error('Warm/stream settle exceeded 60 seconds: '+JSON.stringify(last));}clean();return {completed:complete,total,elapsedMs:performance.now()-begin,...(settle?{stableMs,requiredStableMs:550,stream:last}:{})};};
   const subjectState=()=>{
    if(!fixture.f)return null;
    const f=fixture.f,sp=SPECIES[f.species],focus=animalFocusPoint(f),q=project(focus,renderer.vp),forward=[Math.cos(f.yaw),0,-Math.sin(f.yaw)],look=V.norm(V.sub(fixture.camera,focus));
    // The original reef-fauna builder uses kind 8; trench entries declare 11.
    // Check the subject's packed instance, not merely another animal of its species.
    const expectedKind=sp.renderKind??(FAUNA_SPECIES.includes(sp)?8:null),expectedProgramSlot=expectedKind===11?'surface-11:0':'generic',origin=renderer.renderOrigin||[0,0,0];
    if(!Number.isInteger(expectedKind))throw Error('Missing authored render route: '+sp.id);
    const packedPosition=f.p.map((value,index)=>Math.fround(value-origin[index]));
    const actualBatches=renderer.batches.flatMap((b,index)=>{
     if(b.species!==f.species||!b.instances.includes(f))return [];
     let subjectSubmitted=false;
     for(let i=0;i<b.drawCount;i++)if(packedPosition.every((value,axis)=>value===b.data[i*24+axis])){subjectSubmitted=true;break;}
     const chosen=renderer.surfaceProgram(b),programSlot=chosen===renderer.program?'generic':([...renderer.surfacePrograms].find(([,program])=>program===chosen)?.[0]||'unknown');
     return [{index,species:b.species,kind:b.kind,material:b.material,visible:b.visible,drawCount:b.drawCount,subjectSubmitted,programSlot:programSlot==='generic'?programSlot:'surface-'+programSlot,count:b.count,vertexCount:b.vertexCount,minDistance:b.minDistance||0,maxDistance:b.maxDistance||null}];
    });
    return {uid:f.uid,species:sp.id,index:f.species,ecologyPresent:f.ecologyPresent??null,faunaVisibility:f.faunaVisibility??null,expectedKind,expectedProgramSlot,nominalSizeMetres:sp.size,scaleMetres:f.s.slice(),position:f.p.slice(),focus,distance:V.len(V.sub(fixture.camera,focus)),longAxisViewCosine:Math.abs(V.dot(forward,look)),screenFocus:q,actualBatches};
   };
   const state=()=>({mode:selected,solarCulled:renderer.sunless??false,draws:renderer.drawCalls,shadowDraws:renderer.shadowDraws,subject:subjectState(),gl:g.getError()});
   window.__snailfishLight={
    async prepare(config){
     const clock=clockState();if(clock.minute!==config.minute||clock.clockAuto||settings.lighting!==config.lighting)throw Error('Fixture clock/lighting must be prepared by the actual ship UI before rendering: '+JSON.stringify({config,clock,lighting:settings.lighting}));
     select('candidate');renderer.photoFov=48;renderer.photoAperture=0;renderer.photoFocus=8;
     // Use the public preparation boundary to establish the actual time-based
     // actor pose. No actor position, scale, visibility or population is edited.
     await __prepareView([0,-8,7],[0,-8,-10],config.time);
     let camera=[0,-8,7],aim=[0,-8,-10],f=null,cameraEvidence=null;
     if(config.species){
      f=life.find(f=>SPECIES[f.species]?.id===config.species);if(!f)throw Error('Actual species missing: '+config.species);
      const sp=SPECIES[f.species],range=Math.max(.40,sp.size*2.8),sightClearance=.001,cameraClearance=.12;
      aim=animalFocusPoint(f);const trials=[];camera=null;
      // Preserve the requested angle. A terrain-safe opposite side is legal;
      // silently replacing a side view with an end-on view is not.
      outer:for(const height of [.04,.12,.25,.45,.7,1.1])for(const opposite of [0,Math.PI]){
       const angle=f.yaw+config.angle+opposite,p=V.add(V.add(aim,V.mul([Math.sin(angle),0,Math.cos(angle)],range)),[0,height,0]);
       const floor=OceanTrench.containsXZ(p[0],p[2])?OceanTrench.floorAt(p[0],p[2],p[1]+cameraClearance):groundHeight(p[0],p[2]);
       const floorClearance=p[1]-floor,inWater=p[1]<-.3,cameraClear=floorClearance>=cameraClearance+.01&&!OceanRegions.pointBlocked(p,cameraClearance),sightClear=!blocked(p,aim,sightClearance),pathClear=OceanRegions.pathClear(p,aim,sightClearance);
       trials.push({position:p,relativeAngle:config.angle+opposite,height,floor,floorClearance,inWater,cameraClear,sightClear,pathClear});
       if(inWater&&cameraClear&&sightClear&&pathClear){camera=p;break outer;}
      }
      cameraEvidence={range,sightClearance,cameraClearance,trials};if(!camera)throw Error('No legal camera: '+config.id+' '+JSON.stringify(cameraEvidence));
     }
     await __prepareView(camera,aim,config.time);renderer.photoFov=48;renderer.photoAperture=0;renderer.photoFocus=f?V.len(V.sub(camera,aim)):8;renderer.lamp=!!f;renderer.lighting=config.lighting;renderer.exposure=1.11;renderer.clarity=1;
     fixture={...config,camera,aim,f,cameraEvidence};baselinePixels=null;modePixels=new Map();select('baseline');const canonical=await preloadKeep(),warmed=await warm(10,true);warmed.canonical=canonical;mark();window.__snailfishLight.lastPreparation.phase='ready';
     const snapshot=state();if(snapshot.gl)throw Error('GL error preparing fixture '+snapshot.gl);if(f&&!snapshot.subject.actualBatches.some(b=>b.visible&&b.subjectSubmitted&&b.kind===snapshot.subject.expectedKind&&b.programSlot===snapshot.subject.expectedProgramSlot))throw Error('Actual subject not submitted through its authored render route: '+config.species+' '+JSON.stringify(snapshot.subject));
     return {id:config.id,species:config.species,time:config.time,timed:config.timed,lighting:config.lighting,minute:config.minute,cameraEvidence,warmed,conditions:fixture.conditions,state:snapshot};
    },
    async block(mode){select(mode);const warmed=await warm();unchanged();const before=state();if(before.gl)throw Error('GL error before block '+before.gl);const samples=[],record={mode,warmed,before,samples};window.__snailfishLight.lastBlock=record;
     for(let index=0;index<25;index++){await raf();clean();const query=g.createQuery();if(!query)throw Error('GPU query allocation failed');queries.add(query);let open=false;
      try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);open=true;const begin=performance.now(),completed=render(),cpuSubmitMs=performance.now()-begin;g.endQuery(ext.TIME_ELAPSED_EXT);open=false;g.flush();if(!completed)throw Error('Incomplete timed render');const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}const disjoint=g.getParameter(ext.GPU_DISJOINT_EXT),gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6,error=g.getError();samples.push({index,gpuMs,cpuSubmitMs,disjoint,gl:error});if(disjoint||error||!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid GPU sample: '+JSON.stringify(samples.at(-1)));}
      finally{if(open)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}
     }clean();unchanged();record.after=state();return record;
    },
    async capture(mode){select(mode);await warm(3);unchanged();if(!render())throw Error('Incomplete image render');if(g.getParameter(g.FRAMEBUFFER_BINDING)!==null)throw Error('Expected presented default framebuffer');
     const width=g.drawingBufferWidth,height=g.drawingBufferHeight,pixels=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,pixels);const png=renderer.canvas.toDataURL('image/png');
     let min=255,max=0,nonzero=0,differingChannels=0,differingPixels=0,alphaDifferences=0,maxDifference=0,absoluteDifference=0,repeatDifferentChannels=0;
     if(mode==='baseline'&&!baselinePixels)baselinePixels=pixels.slice();if(!baselinePixels)throw Error('Capture baseline first');const previous=modePixels.get(mode);
     for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i],pixels[i+1],pixels[i+2]);max=Math.max(max,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzero++;let pixelDiff=false;for(let c=0;c<4;c++){const d=Math.abs(pixels[i+c]-baselinePixels[i+c]);if(d){differingChannels++;pixelDiff=true;if(c===3)alphaDifferences++;}maxDifference=Math.max(maxDifference,d);absoluteDifference+=d;if(previous&&pixels[i+c]!==previous[i+c])repeatDifferentChannels++;}if(pixelDiff)differingPixels++;}
     modePixels.set(mode,pixels.slice());const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),v=>v.toString(16).padStart(2,'0')).join('');
     return {mode,width,height,minRGB:min,maxRGB:max,nonzeroPixels:nonzero,rgbaSHA256:sha256,differingChannels,differingPixels,alphaDifferences,maxDifference,meanAbsoluteDifference:absoluteDifference/pixels.length,repeated:!!previous,repeatDifferentChannels,state:state(),png};
    },
    restore(){if(restored)return {restored:true,alreadyRestored:true,deletedPrograms:0};restored=true;Object.assign(renderer,candidatePrograms);renderer.forceShadow=true;for(const query of queries)g.deleteQuery(query);queries.clear();for(const program of owned)g.deleteProgram(program.p);settings.adaptive=initial.adaptive;settings.third=initial.third;window.__freeze=initial.freeze;active=initial.active;return {restored:true,deletedPrograms:owned.length};}
   };
   return {hardware,version:document.documentElement.dataset.version,userAgent:navigator.userAgent,initial,floatColor:renderer.floatColor,baselinePrograms:owned.length,baselineSurfaceKeys:[...baselinePrograms.surfacePrograms.keys()],currentSurfaceKeys:[...candidatePrograms.surfacePrograms.keys()],sourceEvidence,unchangedOtherShaders:true};
  },{baselineSource:baseline,candidateSource:candidate,pixelsOnly});
  assert.equal(profile.meta.version,expectedVersion);assert.equal(profile.meta.initial.quality,touch?1:2);assert.equal(profile.meta.baselinePrograms,10);assert.equal(profile.meta.sourceEvidence.length,20);save();
  const press=async selector=>{const node=page.locator(selector);await node.waitFor({state:'visible',timeout:15000});await node.scrollIntoViewIfNeeded();if(touch)await node.tap();else await node.click();};
  const clockSnapshot=()=>({clock:oceanSeasons.snapshot(),clockAuto:oceanFeatures.state('expedition').clockAuto,lighting:settings.lighting,active,nautilus:life.filter(f=>SPECIES[f.species]?.id==='nautilus').map(f=>({uid:f.uid,ecologyPresent:f.ecologyPresent??null,scheduled:f.ecologyScheduled??null,faunaVisibility:f.faunaVisibility??null}))});
  async function prepareClock(config){
   const before=await read(clockSnapshot);
   if(before.clock.minute!==config.minute||before.clockAuto||before.lighting!==config.lighting){
    if(before.active){await press('#pauseBtn');await press('#menuHome');assert(await read(()=>!active&&!modal),'Actual return-home action failed');}
    await page.locator('#loading').waitFor({state:'hidden',timeout:15000});
    await press('#shipSettings');await press('#panelBody .settings-advanced > summary');await press('#legacyToolsBtn');await press('#panelBody .menu-advanced > summary');await press('#panelBody [data-feature="research"]');
    await press('[data-rest="'+config.minute+'"]');
    assert(await read(()=>oceanFeatures.state('expedition').clockAuto),'Rest action must enable the actual clock');
    await press('#expClock');await press('#closePanel');
    const after=await read(clockSnapshot);assert.equal(after.clock.minute,config.minute);assert.equal(after.clockAuto,false);assert.equal(after.lighting,config.lighting);
    if(config.species==='nautilus')assert(after.nautilus.length&&after.nautilus.every(f=>f.ecologyPresent&&f.scheduled),'Night preparation must naturally admit every actual nautilus actor');
    profile.clockPreparations.push({fixture:config.id,method:'Native UI: return home, research desk, actual rest button, disable automatic clock lighting',restMinute:config.minute,before,after});save();
   }else{profile.clockPreparations.push({fixture:config.id,method:'Existing actual clock and lighting already match; no mutation',before,after:before});save();}
  }
  const validatePrepared=scene=>{assert.equal(scene.conditions.scale,1);assert.equal(scene.conditions.quality,profile.meta.initial.quality);assert.equal(scene.conditions.adaptive,false);assert.equal(scene.conditions.freeze,true);assert.equal(scene.conditions.voyageClock.minute,scene.minute);assert.equal(scene.conditions.voyageClock.clockAuto,false);assert.equal(scene.conditions.lighting,scene.lighting);};
  // Complete every GPU timer query before any PNG encoding or framebuffer read.
  // Untimed scenes do not need an initial visit; their baseline/candidate images
  // share the same prepared state in the later capture phase.
  for(const config of scenes.filter(s=>s.timed)){
   await prepareClock(config);const prepared=await read(config=>__snailfishLight.prepare(config),config),scene={...prepared,blocks:[],images:[]};profile.scenes.push(scene);save();validatePrepared(scene);
   for(const mode of ['baseline','candidate','candidate','baseline']){const block=await read(mode=>__snailfishLight.block(mode),mode);scene.blocks.push(block);block.gpu=stats(block.samples.map(s=>s.gpuMs));block.cpuSubmit=stats(block.samples.map(s=>s.cpuSubmitMs));save();console.log(JSON.stringify({profile:name,scene:scene.id,block:scene.blocks.length,mode,medianGpuMs:block.gpu.median}));}
   const a=scene.blocks.filter(b=>b.mode==='baseline').flatMap(b=>b.samples.map(s=>s.gpuMs)),b=scene.blocks.filter(b=>b.mode==='candidate').flatMap(b=>b.samples.map(s=>s.gpuMs));scene.comparison={baseline:stats(a),candidate:stats(b),signedGpuChangeMs:median(b)-median(a),changePercent:(median(b)/median(a)-1)*100};save();
  }
  profile.allTimingFinished=true;save();
  for(const config of imageScenes){
   await prepareClock(config);const prepared=await read(config=>__snailfishLight.prepare(config),config);let scene=profile.scenes.find(s=>s.id===config.id);
   if(scene){assert.deepEqual(prepared.conditions,scene.conditions,'Image revisit changed timed camera, actual actors, geometry, quality or calendar');scene.imagePreparation=prepared.warmed;}
   else{scene={...prepared,blocks:[],images:[]};profile.scenes.push(scene);}
   validatePrepared(scene);save();
   for(const [index,mode]of ['baseline','candidate','candidate','baseline'].entries()){const capture=await read(mode=>__snailfishLight.capture(mode),mode),png=Buffer.from(capture.png.split(',')[1],'base64');delete capture.png;if(index<2){capture.image={path:imagePath(scene.id,mode),pngSHA256:hash(png),bytes:png.length};fs.writeFileSync(capture.image.path,png);}else capture.repeatedPNGSHA256=hash(png);scene.images.push(capture);save();assert.equal(capture.state.gl,0);assert(capture.maxRGB>20&&capture.nonzeroPixels>200,'Meaningful nonblack lit image required: '+scene.id);assert.equal(capture.repeatDifferentChannels,0,'Same-program full RGBA is not repeatable: '+scene.id+' '+mode);console.log(JSON.stringify({profile:name,scene:scene.id,image:index+1,mode,changedChannels:capture.differingChannels,maxDifference:capture.maxDifference,repeatDifferentChannels:capture.repeatDifferentChannels}));}
  }
  profile.restored=await read(()=>__snailfishLight.restore());save();
 }catch(error){if(read){profile.partialBlock=await read(()=>window.__snailfishLight?.lastBlock||null).catch(()=>null);profile.partialPreparation=await read(()=>window.__snailfishLight?.lastPreparation||null).catch(()=>null);await read(()=>window.__snailfishLight?.restore()).catch(()=>{});}if(page&&!page.isClosed())await page.screenshot({path:output.replace(/\.json$/,'')+'-'+name+'-failure.png'}).catch(()=>{});throw error;}
 finally{await context?.close();await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-gpu-run',profile:name,scenes:scenes.map(s=>s.id),queries:scenes.filter(s=>s.timed).length*4*25,sourceSHA256:report.sourceSHA256,geometrySources}));
else(async()=>{try{await run();assert.deepEqual(report.errors,[]);report.status='passed';}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{save();}})().catch(error=>{console.error(error);process.exitCode=1;});
