/* Same-context native regression of the actual kind11/material0 specialization.
 * Full RGBA equality: four real species, two times, desktop/touch, real lit
 * deep habitat plus explicit 6 m studio with lamp off/on. Only the first
 * deep-lit frilled case per profile is timed (ABBA 25 queries/block).
 * Never builds a candidate shader or changes the natural player save. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/?still'),output=path.resolve(root,option('out','qa/parity/frilled-shark-surface-browser.json'));
const requestedProfile=option('profile','both'),names=requestedProfile==='both'?['desktop','touch']:[requestedProfile],pixelsOnly=process.argv.includes('--pixels-only');
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
assert(names.every(n=>['desktop','touch'].includes(n)),'--profile must be desktop, touch or both');
const species=['frilled_shark','vampire_squid','sea_pig','mariana_snailfish'],times=[8,23],habitats=[{id:'deep-lit',studio:false,lamp:true},{id:'studio-unlit',studio:true,lamp:false},{id:'studio-lit',studio:true,lamp:true}];
const report={url,expectedVersion,status:'running',pixelsOnly,profiles:[],errors:[],pixelFailures:[],method:'Visible installed native Chrome; every page-script call is CDP Runtime.evaluate userGesture:false. Actual precompiled renderer.surfacePrograms key 11:0 versus the existing generic renderer.program. Only that Map key is temporarily removed/restored; every other production program, geometry, batch visibility and rendering pass remains unchanged. Attached VS must be byte-identical to original VS; actual FS differs only in the uKind/uMat constants. Exact full final RGBA is compared in same-context ABBA for four species at times 8 and 23, real deep lit habitat and an explicitly prepared 6 m open-water studio with lamp off/on. Studio preparation moves only the actual subject actor before comparison; camera, actor pose, time, lighting, default quality tier, scale 1, resolution and MSAA are then fixed. Timed ABBA applies only to the first deep-lit frilled fixture per profile: ten warm renders and 25 complete-render queries per block. All other fixtures use two warm frames plus full RGBA capture without GPU timing. No native-phone, natural exploration, battery or gameplay FPS claim.',pixelAcceptance:{mode:'byte-exact',differentChannels:0,maxDifference:0,alphaDifferences:0,policy:'Every requested pixel case is collected. Any changed channel fails final acceptance; no tolerance, threshold relaxation, failed-image discard or alternate shader candidate.'}};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const median=a=>{const v=a.slice().sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};
const writePNG=(profile,fixture,label,data)=>{assert(data?.startsWith('data:image/png;base64,'),'Expected the synchronous original canvas PNG');const file=output.replace(/\.json$/,'')+'-'+profile+'-'+fixture+'-'+label+'.png',bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(file,bytes);return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
async function runProfile(name){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});let context,page;
 const profile={name,fixtures:[]};report.profiles.push(profile);save();
 try{
  const touch=name==='touch';context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({profile:name,error:e.message}));page.on('crash',()=>report.errors.push({profile:name,error:'Renderer process crashed'}));page.on('console',m=>{if(m.type()==='error')report.errors.push({profile:name,error:m.text()});});
  const cdp=await context.newCDPSession(page),read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const wait=async(fn,timeout=120000)=>{const until=Date.now()+timeout;while(Date.now()<until){const value=await read(fn);if(value)return value;await page.waitForTimeout(50);}throw Error('Condition timed out: '+fn.toString());};
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await wait(()=>window.__ocean?.ready);await page.bringToFront();
  profile.meta=await read(async({species,pixelsOnly})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware)||(!pixelsOnly&&!ext))throw Error('Native GPU and timer extension are required');
   const initial={quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive};
   if(!initial.adaptive||initial.scale!==1)throw Error('A fresh default-quality context is required');window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();
   const key='11:0',surfaceMap=renderer.surfacePrograms,production=surfaceMap?.get(key),generic=renderer.program,originalChooser=renderer.surfaceProgram;
   if(!production||production===generic)throw Error('Actual production kind11/material0 program is missing');
   let expected=FS;for(const [name,value]of [['uKind',11],['uMat',0]]){const declaration='uniform int '+name+';';if(expected.split(declaration).length!==2)throw Error('Expected one '+name+' declaration');expected=expected.replace(declaration,'const int '+name+'='+value+';');}
   const source=(program,type)=>{const shader=(g.getAttachedShaders(program.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!shader)throw Error('Attached production shader source is unavailable');return g.getShaderSource(shader);};
   if(source(production,g.VERTEX_SHADER)!==VS||source(generic,g.VERTEX_SHADER)!==VS)throw Error('The generic and production VS must be the original byte-identical VS');
   if(source(production,g.FRAGMENT_SHADER)!==expected||source(generic,g.FRAGMENT_SHADER)!==FS)throw Error('Only FS uKind/uMat constants may differ');
   const originalSurfaces=new Map(surfaceMap),programs=new Map(['program','waterProgram','shadowProgram','skyProgram','pointProgram','bubbleProgram','rayProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'].map(k=>[k,renderer[k]]));
   const subjects=species.map(id=>{const f=life.find(f=>SPECIES[f.species]?.id===id);if(!f)throw Error('Missing actual subject '+id);return {id,f,p:f.p.slice(),s:f.s.slice(),yaw:f.yaw,pitch:f.pitch||0};});
   const allBatches=renderer.batches.slice(),visible=allBatches.map(b=>b.visible),queries=new Set(),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   let useProduction=false,selected=[],fixture=null,reference=null,referencePNG=null,capturedDifference=new Set();
   renderer.surfaceProgram=function(batch){const chosen=originalChooser.call(this,batch);if(batch.kind===11&&batch.material===0){if(chosen!==(useProduction?production:generic))throw Error('Formal surfaceProgram chose the wrong route');selected.push({batch:renderer.batches.indexOf(batch),species:batch.species,kind:batch.kind,material:batch.material,instances:batch.drawCount,triangles:batch.count/3*batch.drawCount,role:batch.sceneRole||null});}return chosen;};
   const choose=enabled=>{useProduction=enabled;if(enabled)surfaceMap.set(key,production);else surfaceMap.delete(key);};
   const render=()=>{selected=[];const before=renderer.frame,result=renderer.render(fixture.view,fixture.target,fixture.time);if(result===false)return false;if(renderer.frame!==before+1)throw Error('Expected one completed render');return true;};
   const state=()=>({quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,camera:fixture.view.slice(),target:fixture.target.slice(),time:fixture.time,position:fixture.f.p.slice(),scaleMetres:fixture.f.s.slice(),yaw:fixture.f.yaw,pitch:fixture.f.pitch||0,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,sun:renderer.sun,lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates,selected:selected.slice(),adaptive:settings.adaptive,oldVisibilityUnchanged:allBatches.every((b,i)=>b.visible===visible[i]),batchReferencesUnchanged:renderer.batches.length===allBatches.length&&allBatches.every((b,i)=>renderer.batches[i]===b),otherProgramsUnchanged:[...programs].every(([k,p])=>renderer[k]===p)&&renderer.surfacePrograms===surfaceMap&&[...originalSurfaces].filter(([k])=>k!==key).every(([k,p])=>surfaceMap.get(k)===p)&&surfaceMap.size===originalSurfaces.size-(useProduction?0:1)});
   const outside=()=>{const stream=renderer.sceneStream;if(!stream)return [];const keep=stream.neededRanges(fixture.view).keep;return stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id);};
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Controlled fixture lost focus');if(g.isContextLost()||renderer.pendingResize||renderer.sceneStream?.jobs.size||outside().length||renderer.forceShadow)throw Error('Fixed workload has not settled');};
   const capture=async()=>{
    if(!render())throw Error('Cannot capture an incomplete frame');if(g.getParameter(g.FRAMEBUFFER_BINDING)!==null)throw Error('Completed render must present the default framebuffer');
    const width=g.drawingBufferWidth,height=g.drawingBufferHeight,data=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,data);
    let differingChannels=0,alphaDifferences=0,maxDifference=0,minRGB=255,maxRGB=0,nonzeroPixels=0,subjectMax=0,subjectMin=255;
    const q=project(animalFocusPoint(fixture.f),renderer.vp),cx=Math.round((q[0]*.5+.5)*width),cy=Math.round((q[1]*.5+.5)*height);
    for(let i=0;i<data.length;i+=4){const x=(i/4)%width,y=Math.floor(i/4/width),r=data[i],gr=data[i+1],b=data[i+2];minRGB=Math.min(minRGB,r,gr,b);maxRGB=Math.max(maxRGB,r,gr,b);if(r||gr||b)nonzeroPixels++;if(Math.abs(x-cx)<=16&&Math.abs(y-cy)<=16){subjectMax=Math.max(subjectMax,r,gr,b);subjectMin=Math.min(subjectMin,r,gr,b);}if(reference)for(let c=0;c<4;c++){const difference=Math.abs(data[i+c]-reference[i+c]);if(difference){differingChannels++;if(c===3)alphaDifferences++;}maxDifference=Math.max(maxDifference,difference);}}
    // Preserve the presented PNG synchronously too: awaiting the digest may
    // yield beyond the lifetime of a preserveDrawingBuffer=false back buffer.
    const png=!reference||differingChannels?renderer.canvas.toDataURL('image/png'):null;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');
    const pixels={width,height,channels:data.length,sha256:hash,differingChannels,alphaDifferences,maxDifference,minRGB,maxRGB,range:maxRGB-minRGB,nonzeroPixels,subjectCenter:{x:cx,y:cy,minRGB:subjectMin,maxRGB:subjectMax,range:subjectMax-subjectMin}};
    return {data,pixels,png};
   };
   window.__frilledSurface={
    async prepare(config){
     choose(false);for(const s of subjects)s.f.p=s.p.slice();const subject=subjects.find(s=>s.id===config.species),f=subject.f;if(config.studio)f.p[1]=-6;
     renderer.lamp=config.lamp;const sp=SPECIES[f.species],target=animalFocusPoint(f),range=Math.max(.85,sp.size*2.8),rise=Math.max(.12,sp.size*.16);
     // The formal fauna selector uses a 1 mm sight ray. An 8 cm sphere at
     // the focus of a 14 cm sea pig intersects its occupied mud terrace even
     // from a legal camera; that was an invalid fixture clearance, not a
     // reason to lift the actor or omit the terrain/solid visibility tests.
     const sightClearance=sp.fauna?.001:.13,cameraClearance=.12,angles=[0,Math.PI,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4],heights=[rise,Math.max(rise,.25),Math.max(rise,.45),Math.max(rise,.7),Math.max(rise,1.1)],cameraTrials=[];
     let view=null;
     outer:for(const height of [...new Set(heights)])for(const angle of angles){
      const p=V.add(V.add(target,V.mul([Math.sin(f.yaw+angle),0,Math.cos(f.yaw+angle)],range)),[0,height,0]);
      const occupiedFloor=OceanTrench.containsXZ(p[0],p[2])?OceanTrench.floorAt(p[0],p[2],p[1]+cameraClearance):groundHeight(p[0],p[2]);
      const floorClearance=p[1]-occupiedFloor,inWater=p[1]<-.3,cameraClear=floorClearance>=cameraClearance+.01&&!OceanRegions.pointBlocked(p,cameraClearance),solidAndTerrainSightClear=!blocked(p,target,sightClearance),regionalPathClear=OceanRegions.pathClear(p,target,sightClearance);
      const trial={position:p,angle,height,occupiedFloor,floorClearance,inWater,cameraClear,solidAndTerrainSightClear,regionalPathClear};cameraTrials.push(trial);
      if(inWater&&cameraClear&&solidAndTerrainSightClear&&regionalPathClear){view=p;break outer;}
     }
     const cameraEvidence={sightClearance,cameraClearance,originalPosition:subject.p.slice(),actorPosition:f.p.slice(),target:target.slice(),trials:cameraTrials};
     if(!view)throw Error('No unobstructed '+config.id+' camera: '+JSON.stringify(cameraEvidence));fixture={...config,f,target,view,time:config.time,cameraEvidence};reference=null;referencePNG=null;capturedDifference=new Set();
     const started=performance.now();let stable=0;while(stable<3){if(performance.now()-started>60000)throw Error('Fixture streaming did not settle');await raf();const complete=render();stable=complete&&!outside().length&&!renderer.sceneStream?.jobs.size&&!renderer.pendingResize&&!renderer.forceShadow?stable+1:0;}
     clean();if(!selected.some(b=>b.species===f.species&&b.instances>0))throw Error('Actual subject is not drawn through kind11/material0');const image=await capture();reference=image.data;referencePNG=image.png;
     return {id:config.id,species:config.species,time:config.time,studio:config.studio,lamp:config.lamp,timed:config.timed,originalPosition:subject.p.slice(),cameraEvidence,baseline:state(),baselinePixels:image.pixels,png:image.png,gl:g.getError()};
    },
    async block(enabled){choose(enabled);for(let i=0;i<(fixture.timed?10:2);i++){await raf();clean();if(!render())throw Error('Incomplete warm frame');}const samples=[];
     for(let i=0;i<(fixture.timed?25:0);i++){await raf();clean();const query=g.createQuery();queries.add(query);let begun=false;
      try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);begun=true;const start=performance.now();if(!render())throw Error('Incomplete timed frame');const cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);begun=false;g.flush();const until=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>until)throw Error('GPU query timeout');await raf();}if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU sample');const gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6;if(!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid elapsed time');samples.push({gpuMs,cpuSubmitMs});}
      finally{if(begun)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}
     }
     const image=await capture();clean();let images=null;if(image.pixels.differingChannels&&!capturedDifference.has(enabled)){capturedDifference.add(enabled);images={baseline:referencePNG,current:image.png};}return {production:enabled,samples,pixels:image.pixels,state:state(),gl:g.getError(),images};
    },
    restore(){surfaceMap.set(key,production);renderer.surfaceProgram=originalChooser;for(const s of subjects)s.f.p=s.p.slice();for(const query of queries)g.deleteQuery(query);queries.clear();reference=null;referencePNG=null;}
   };
   const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,initial,precompiledSurfacePrograms:originalSurfaces.size,actualAttachedSourcesVerified:true,genericFragmentSHA256:await sha(FS),productionFragmentSHA256:await sha(expected),vertexSHA256:await sha(VS),subjects:subjects.map(s=>({id:s.id,uid:s.f.uid,index:s.f.species,position:s.p,scale:s.s}))};
  },{species,pixelsOnly});
  assert.equal(profile.meta.version,expectedVersion);assert.equal(profile.meta.precompiledSurfacePrograms,8);save();
  try{for(const id of species)for(const time of times)for(const habitat of habitats){
   const fixtureID=id+'-t'+time+'-'+habitat.id,config={...habitat,id:fixtureID,species:id,time,timed:!pixelsOnly&&id==='frilled_shark'&&time===times[0]&&habitat.id==='deep-lit'};
   const entry=await read(config=>__frilledSurface.prepare(config),config),png=entry.png;delete entry.png;entry.blocks=[];profile.fixtures.push(entry);entry.image=writePNG(name,fixtureID,'baseline-generic',png);save();
   assert.equal(entry.gl,0);assert(entry.baseline.oldVisibilityUnchanged&&entry.baseline.batchReferencesUnchanged&&entry.baseline.otherProgramsUnchanged);assert.equal(entry.baseline.quality,profile.meta.initial.quality);assert.equal(entry.baseline.scale,1);
   assert(entry.baselinePixels.range>20&&entry.baselinePixels.nonzeroPixels>100&&entry.baselinePixels.subjectCenter.maxRGB>20,'A meaningful nonblack animal-center image is required: '+fixtureID);
   for(const production of [false,true,true,false]){
    const block=await read(enabled=>__frilledSurface.block(enabled),production),images=block.images;delete block.images;entry.blocks.push(block);
    if(images){block.images={};for(const [kind,data]of Object.entries(images))block.images[kind]=writePNG(name,fixtureID,(production?'production':'generic')+'-'+kind+'-difference',data);}
    save();assert.equal(block.gl,0);assert.deepEqual(block.state,entry.baseline,'Fixed same-scene conditions changed: '+fixtureID);
    const reasons=[];if(block.pixels.differingChannels||block.pixels.maxDifference||block.pixels.alphaDifferences)reasons.push('Full final RGBA differs from generic baseline');if(block.pixels.sha256!==entry.baselinePixels.sha256)reasons.push('Full RGBA SHA256 differs');
    if(reasons.length)report.pixelFailures.push({profile:name,fixture:fixtureID,block:entry.blocks.length,production,pixels:block.pixels,reasons,images:block.images||null});
    block.medianGpuMs=median(block.samples.map(s=>s.gpuMs));save();console.log(JSON.stringify({profile:name,fixture:fixtureID,production,changedChannels:block.pixels.differingChannels,maxDifference:block.pixels.maxDifference,medianGpuMs:block.medianGpuMs}));
   }
   if(config.timed){entry.comparison={genericMedianGpuMs:median(entry.blocks.filter(b=>!b.production).flatMap(b=>b.samples.map(s=>s.gpuMs))),productionMedianGpuMs:median(entry.blocks.filter(b=>b.production).flatMap(b=>b.samples.map(s=>s.gpuMs)))};entry.comparison.signedSavedGpuMs=entry.comparison.genericMedianGpuMs-entry.comparison.productionMedianGpuMs;entry.comparison.reductionPercent=100*(1-entry.comparison.productionMedianGpuMs/entry.comparison.genericMedianGpuMs);entry.comparison.note='One fixed frilled scene per profile, ABBA 100 complete-render queries. Raw values retained; no noise clamp or cross-device extrapolation.';save();}
  }}finally{await read(()=>window.__frilledSurface?.restore()).catch(()=>{});}
 }catch(error){if(page&&!page.isClosed())try{await page.screenshot({path:output.replace(/\.json$/,'')+'-'+name+'-failure.png'});}catch(_){}throw error;}
 finally{await context?.close();await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-gpu-run',profiles:names,species,times,habitats,pixelCases:names.length*species.length*times.length*habitats.length,timedCases:pixelsOnly?0:names.length}));
else(async()=>{try{for(const name of names)await runProfile(name);assert.deepEqual(report.errors,[]);assert.deepEqual(report.pixelFailures,[],'Exact RGBA acceptance failed; all requested pixel cases were collected');report.status='passed';}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{save();}})().catch(error=>{console.error(error);process.exitCode=1;});
