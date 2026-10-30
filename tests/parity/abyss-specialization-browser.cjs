/* Root runs this native-GPU regression serially, after reviewing/building the
 * candidate. This file never generates, modifies, compiles or relinks a shader.
 * 120 controlled mesh fixtures + 3 actual habitats per profile, fixed ABBA.
 * Controlled fixtures copy the exact uploaded high/low geometry and phenotype;
 * they are isolated inspection, not ordinary LOD selection or exploration. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(v=>v.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const profile=option('profile','desktop'),out=path.resolve(root,option('out','qa/parity/abyss-specialization-'+profile+'.json'));
assert(['desktop','touch'].includes(profile),'Run one native profile at a time: desktop or touch');
const species=['coelacanth','giant_squid','pelican_eel','humpback_anglerfish','japanese_spider_crab'];
const habitatUIDs=['coelacanth-002','pelican_eel-001','humpback_anglerfish-001'];
const matrix=[];
for(const id of species)for(const lod of ['high','low'])for(const quality of [0,1,2])for(const depth of ['shallow','sunless'])for(const lamp of [false,true])matrix.push({scope:'isolated-uploaded-mesh',id:id+'-'+lod+'-q'+quality+'-'+depth+'-lamp'+Number(lamp),species:id,lod,quality,depth,lamp,time:8});
for(const uid of habitatUIDs)matrix.push({scope:'actual-habitat',id:'habitat-'+uid,uid,quality:profile==='touch'?1:2,lamp:true,time:8});
const report={status:'running',profile,expectedVersion:option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim()),matrix,fixtures:[],errors:[],failures:[],
 method:'Installed native Chrome, one profile per invocation. Same context, actual precompiled renderer.program versus actual precompiled surfacePrograms 10:0; only that Map entry is deleted/restored between arms. No replacement shader, material formula, compile or relink. All other program objects/textures and actual actor attributes must remain identical. Controlled matrix copies each of the five actual compiled species 27–31, both uploaded LOD meshes byte for byte, into a single-actor batch at 6 m and 7000 m. The 7000 m fixture must activate the actual oceanSunlessView branch; 1200 m does not satisfy its 4900 m camera-depth cutoff. Forced LOD inspection has explicit 0–10000 m bounds; it does not claim normal LOD switching. Three separate actual-habitat fixtures retain the complete world, original actors and normal LOD bounds. Blank-subject reference is an explicitly separate visibility witness; the actor is restored before every ABBA arm. Additional target-only non-writing occlusion draws use the same currently selected program and packed instance, never change the image, and are not timing evidence. No natural-journey, physical-phone, gameplay-FPS or battery claim.',
 acceptance:{sequence:['generic','specialized','specialized','generic'],finalRGBMaxByteDifference:1,finalAlphaDifference:0,linearRGBMaxStorageULPs:1,linearAlphaDifference:0,nonfinite:0,glErrors:0,shaderCreates:0,programLinks:0,
  rationale:'The unchanged shader arithmetic is compared before tone mapping in the actual RGBA16F scene target and after all production passes in RGBA8. One binary16 storage ULP (subnormal floor 2^-24) and one final 8-bit code value bound compiler/storage rounding; alpha is exact. Every changed channel and maximum error is recorded, including exact equality. No tolerance is inferred from observed failures.',
  nonvacuous:'Every row requires target-instance samples passing the real scene depth test. A meaningful color witness requires at least 16 pixels whose RGB differs from the blank-subject frame by at least 2 code values. A sunless/lamp-off row with less signal is explicitly visibility-only, never a standalone color-equivalence pass; its identical species/LOD/quality sunless lamp-on pair must have meaningful color. All other rows require meaningful color.'},
 sourceSHA256:Object.fromEntries(['src/engine.js','src/abyss_fauna.js','tests/parity/abyss-specialization-browser.cjs'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]))};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const writePNG=(data,label)=>{if(!data?.startsWith('data:image/png;base64,'))throw Error('Original synchronous PNG missing');const file=out.replace(/\.json$/,'')+'-'+label+'.png';fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));return file;};
(async()=>{let browser,page,read;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:640}:{width:640,height:480},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',error=>report.errors.push({type:'pageerror',message:error.message}));page.on('crash',()=>report.errors.push({type:'crash'}));page.on('console',message=>{if(message.type()==='error')report.errors.push({type:'console',message:message.text()});});
  const cdp=await context.newCDPSession(page);
  read=async(fn,arg)=>{const result=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');report.url=url.href;save();await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.setup=await read(async({species,habitatUIDs})=>{
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug&&g.getParameter(debug.UNMASKED_RENDERER_WEBGL);
   if(!hardware||/software|swiftshader|llvmpipe|softpipe/i.test(hardware))throw Error('Native hardware WebGL required');
   if(!renderer.floatColor||!g.getExtension('EXT_color_buffer_float'))throw Error('Actual RGBA16F scene readback is required');
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,active};
   window.__freeze=true;settings.adaptive=false;active=false;renderer.dynamicScale=1;await renderer.loaded;
   // A still fixture never clicks Start, so the optional imported owner may
   // legitimately still be idle. Complete its production load before taking
   // any world/program identity snapshots; renderer.loaded is textures only.
   const readiness=()=>({imported:oceanBarramundi.status(renderer),programKeys:[...(renderer.surfacePrograms?.keys()||[])].sort(),compileFailures:[...(renderer.surfaceProgramFailures||[])],actorReady:life.find(f=>f.barramundi)?.assetReady===true});
   window.__abyssSpecializationSetup={stage:'required-imported-readiness',before:readiness()};
   if(oceanBarramundi.status(renderer).state==='error')throw Error('Imported asset already failed: '+JSON.stringify(readiness()));
   let readinessTimer,importedLoaded;
   try{importedLoaded=await Promise.race([oceanBarramundi.load(renderer),new Promise((_,reject)=>{readinessTimer=setTimeout(()=>reject(Error('Imported readiness exceeded 16000 ms: '+JSON.stringify(readiness()))),16000);})]);}
   finally{clearTimeout(readinessTimer);window.__abyssSpecializationSetup.after=readiness();}
   if(!importedLoaded||!oceanBarramundi.status(renderer).ready||!readiness().actorReady)throw Error('Required imported asset failed: '+JSON.stringify(readiness()));
   window.__abyssSpecializationSetup.stage='program-source-gates';
   const key='10:0',map=renderer.surfacePrograms,production=map?.get(key),generic=renderer.program;
   if(!production||production===generic||map.size!==12||!map.has('13:18'))throw Error('Expected 11 base variants plus the imported variant, including actual 10:0: '+JSON.stringify(readiness()));
   const source=(p,type)=>{const s=(g.getAttachedShaders(p.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!s)throw Error('Attached shader source missing');return g.getShaderSource(s);};
   let expected=FS;for(const [name,value]of [['uKind',10],['uMat',0]]){const declaration='uniform int '+name+';';if(expected.split(declaration).length!==2)throw Error('Selector anchor changed');expected=expected.replace(declaration,'const int '+name+'='+value+';');}
   if(source(generic,g.VERTEX_SHADER)!==VS||source(production,g.VERTEX_SHADER)!==VS)throw Error('Both attached vertex shaders must be byte-exact original VS');
   if(source(generic,g.FRAGMENT_SHADER)!==FS||source(production,g.FRAGMENT_SHADER)!==expected)throw Error('Actual attached FS must differ only in the two selector declarations');
   const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),n=>n.toString(16).padStart(2,'0')).join('');
   const worldBatches=renderer.batches,stream=renderer.sceneStream,worldVisibility=worldBatches.map(b=>b.visible),worldInstances=worldBatches.map(b=>b.instances),worldTextures=renderer.textures.slice();
   if(!stream||!renderer.sceneLoad.compiled)throw Error('Actual compiled streamed world required');
   const worldActors=life.slice(),actorSignature=()=>JSON.stringify(worldActors.map(f=>({uid:f.uid,species:f.species,p:f.p,s:f.s,yaw:f.yaw,pitch:f.pitch,phase:f.phase,tint:f.tint,bioGenes:f.bioGenes,bioMorph:f.bioMorph,bank:f.bank,effort:f.effort,finWear:f.finWear,abyssBeat:f.abyssBeat,ecologyPresent:f.ecologyPresent,encounterPresent:f.encounterPresent}))),originalActors=actorSignature();
   const originalPrograms=new Map(Object.keys(renderer).filter(k=>k==='program'||/Program$/.test(k)).map(k=>[k,renderer[k]])),originalSurfaces=new Map(map),clones=[],subjects=[],geometry=[];
   for(const [offset,id]of species.entries()){
    const actor=life.find(f=>SPECIES[f.species]?.id===id);if(!actor||actor.species!==27+offset)throw Error('Actual species selector differs: '+id);
    await stream.ready(actor.p);const node=stream.index.nodes.indexOf(actor),batches=worldBatches.filter(b=>!b.shadowProxy&&b.kind===10&&b.material===0&&b.instances.includes(actor)).sort((a,b)=>(a.minDistance||0)-(b.minDistance||0));
    if(node<0||!stream.index.life.includes(node)||batches.length!==2||batches[0].maxDistance!==batches[1].minDistance)throw Error('Expected two adjoining compiled LODs: '+id);
    const entry={id,actor,node,batches,clones:[]};subjects.push(entry);
    for(const [lod,b]of batches.entries()){
     const meta=stream.index.meshes[b.streamMesh],owned=stream.meshes[b.streamMesh];
     if(!b.vb||!b.eb||!b.vao||!meta||!owned.batches.includes(b)||meta.indexCount!==b.count||meta.vertexFloats!==b.vertexCount*12)throw Error('Actual uploaded geometry ownership differs: '+id);
     const vertices=new Float32Array(b.vertexCount*12),indices=b.indexType===g.UNSIGNED_SHORT?new Uint16Array(b.count):new Uint32Array(b.count);
     g.bindBuffer(g.COPY_READ_BUFFER,b.vb);g.getBufferSubData(g.COPY_READ_BUFFER,0,vertices);g.bindBuffer(g.COPY_READ_BUFFER,b.eb);g.getBufferSubData(g.COPY_READ_BUFFER,0,indices);g.bindBuffer(g.COPY_READ_BUFFER,null);
     if(!vertices.every(Number.isFinite)||indices.some(i=>i>=b.vertexCount))throw Error('Nonfinite/out-of-range uploaded geometry: '+id);
     const pose={...actor,p:actor.p.slice(),s:actor.s.slice()},clone=renderer.batch({indexed:{vertices,indices,radius:b.radius},material:b.material,species:b.species,shadow:b.shadow},[pose],b.kind,b.dynamic);
     if(worldBatches.pop()!==clone)throw Error('Diagnostic batch ownership mismatch');clone.minDistance=0;clone.maxDistance=10000;clones.push(clone);entry.clones.push(clone);
     const uploaded=new Float32Array(vertices.length),uploadedIndices=new indices.constructor(indices.length);
     g.bindBuffer(g.COPY_READ_BUFFER,clone.vb);g.getBufferSubData(g.COPY_READ_BUFFER,0,uploaded);g.bindBuffer(g.COPY_READ_BUFFER,clone.eb);g.getBufferSubData(g.COPY_READ_BUFFER,0,uploadedIndices);g.bindBuffer(g.COPY_READ_BUFFER,null);
     const vertexSHA256=await sha(vertices),indexSHA256=await sha(indices);
     if(vertexSHA256!==await sha(uploaded)||indexSHA256!==await sha(uploadedIndices))throw Error('Copied diagnostic geometry changed actual uploaded attributes');
     geometry.push({species:id,index:actor.species,uid:actor.uid,compiledNode:node,lod:lod?'low':'high',streamMesh:b.streamMesh,vertices:b.vertexCount,indices:b.count,vertexSHA256,indexSHA256,attributesCopiedByteExactly:true,scale:actor.s.slice(),sourceBounds:{min:b.minDistance||0,max:b.maxDistance}});
    }
   }
   const habitatActors=habitatUIDs.map(uid=>{const f=life.find(a=>a.uid===uid);if(!f||f.ecologyPresent===false||f.encounterPresent===false)throw Error('Actual present habitat actor missing: '+uid);return f;});
   const original={chooser:renderer.surfaceProgram,draw:renderer.drawBatch,createShader:g.createShader,createProgram:g.createProgram,linkProgram:g.linkProgram,quality:renderer.quality,near:renderer.photoNear,fov:renderer.photoFov,lamp:renderer.lamp,stream,batches:worldBatches};
   const shaderCalls={createShader:0,createProgram:0,linkProgram:0};for(const name of Object.keys(shaderCalls))g[name]=function(...args){shaderCalls[name]++;return original[name].apply(this,args);};
   let fixture=null,reference=null,blank=null,useProduction=true,selected=[],queries=[],queryEnabled=false;
   const allQueries=new Set(),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const choose=enabled=>{useProduction=enabled;if(enabled)map.set(key,production);else map.delete(key);};
   const errors=()=>{const result=[];for(let i=0;i<16;i++){const error=g.getError();if(error===g.NO_ERROR)break;result.push(error);}return result;};
   const matches=(b,index,f)=>{const k=index*24,o=renderer.renderOrigin||[0,0,0];return [0,1,2].every(j=>b.data[k+j]===Math.fround(f.p[j]-o[j])&&b.data[k+4+j]===Math.fround(f.s[j]))&&b.data[k+3]===Math.fround(f.yaw||0)&&b.data[k+10]===Math.fround(f.phase||0);};
   renderer.surfaceProgram=function(b){const p=original.chooser.call(this,b);if(b.kind===10&&b.material===0){if(p!==(useProduction?production:generic))throw Error('Formal 10:0 route differs');selected.push({batch:worldBatches.indexOf(b),clone:clones.indexOf(b),species:b.species,drawCount:b.drawCount,indices:b.count});}return p;};
   renderer.drawBatch=function(b,...args){
    const result=original.draw.call(this,b,...args),colorTarget=g.getParameter(g.DRAW_FRAMEBUFFER_BINDING)===(this.msaaFBO||this.sceneFBO);
    if(queryEnabled&&colorTarget&&b.kind===10&&b.material===0&&b.instances.includes(fixture.f))for(let i=0;i<b.drawCount;i++)if(matches(b,i,fixture.f)){
     // Replay only the actual packed subject with the same active program.
     // LEQUAL admits the subject's existing depth. No color or depth is written.
     const q=g.createQuery(),mask=g.getParameter(g.COLOR_WRITEMASK),depthMask=g.getParameter(g.DEPTH_WRITEMASK),depthFunc=g.getParameter(g.DEPTH_FUNC),draws=this.drawCalls;allQueries.add(q);
     g.colorMask(false,false,false,false);g.depthMask(false);g.depthFunc(g.LEQUAL);let begun=false;
     try{g.beginQuery(g.ANY_SAMPLES_PASSED,q);begun=true;original.draw.call(this,b,'opaque',i);g.endQuery(g.ANY_SAMPLES_PASSED);begun=false;queries.push({q,batch:worldBatches.indexOf(b),clone:clones.indexOf(b),packedInstance:i});}
     finally{if(begun)g.endQuery(g.ANY_SAMPLES_PASSED);g.colorMask(...mask);g.depthMask(depthMask);g.depthFunc(depthFunc);this.drawCalls=draws;}
    }return result;
   };
   const restoreWorld=()=>{renderer.batches=worldBatches;renderer.sceneStream=stream;};
   const finite=(value,path,found=[])=>{if(typeof value==='number'&&!Number.isFinite(value))found.push(path);else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))finite(v,path+'.'+k,found);return found;};
   const state=()=>{
    const targetBatches=renderer.batches.filter(b=>b.instances.includes(fixture.f)),packed=targetBatches.map(b=>({lod:fixture.scope==='isolated-uploaded-mesh'?fixture.lod:(b.minDistance>0?'low':'high'),drawCount:b.drawCount,count:b.count,vertexCount:b.vertexCount,minDistance:b.minDistance||0,maxDistance:b.maxDistance,instances:Array.from(b.data.subarray(0,b.drawCount*24)),targetIndices:Array.from({length:b.drawCount},(_,i)=>i).filter(i=>matches(b,i,fixture.f))}));
    const value={quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,view:fixture.view,target:fixture.target,time:fixture.time,fov:renderer.photoFov,near:renderer.photoNear,origin:renderer.renderOrigin,sunless:renderer.sunless,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog,fogDensity:renderer.fogDensity,sun:renderer.sun,lightDir:renderer.lightDir,lightColor:renderer.lightColor,viewProjection:Array.from(renderer.renderVP),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,selected,packed,
     otherProgramsUnchanged:[...originalPrograms].every(([k,p])=>renderer[k]===p)&&renderer.surfacePrograms===map&&[...originalSurfaces].filter(([k])=>k!==key).every(([k,p])=>map.get(k)===p)&&map.size===originalSurfaces.size-(useProduction?0:1),
     originalAttributesUnchanged:worldBatches.length===worldVisibility.length&&worldBatches.every((b,i)=>b.visible===worldVisibility[i]&&b.instances===worldInstances[i])&&actorSignature()===originalActors,
     texturesUnchanged:renderer.textures.length===worldTextures.length&&renderer.textures.every((texture,i)=>texture===worldTextures[i]),shaderCalls:{...shaderCalls}};
    return {value,nonfinite:finite(value,'state')};
   };
   const render=()=>{selected=[];const before=renderer.frame,complete=renderer.render(fixture.view,fixture.target,fixture.time);if(complete===false||renderer.frame!==before+1)throw Error('Fixture frame was deferred');};
   const awaitQueries=async()=>{const result=[];for(const entry of queries){const start=performance.now();while(!g.getQueryParameter(entry.q,g.QUERY_RESULT_AVAILABLE)){if(performance.now()-start>5000)throw Error('Target visibility query timeout');await raf();}result.push({batch:entry.batch,clone:entry.clone,packedInstance:entry.packedInstance,visible:g.getQueryParameter(entry.q,g.QUERY_RESULT)});g.deleteQuery(entry.q);allQueries.delete(entry.q);}queries=[];return result;};
   const capture=async(witness=true)=>{
    queries=[];queryEnabled=witness;try{render();}finally{queryEnabled=false;}
    if(g.getParameter(g.FRAMEBUFFER_BINDING)!==null)throw Error('Final frame not presented');
    const width=g.drawingBufferWidth,height=g.drawingBufferHeight,rgba=new Uint8Array(width*height*4),linear=new Float32Array(rgba.length);
    g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,rgba);
    g.bindFramebuffer(g.READ_FRAMEBUFFER,renderer.sceneFBO);g.readPixels(0,0,width,height,g.RGBA,g.FLOAT,linear);g.bindFramebuffer(g.READ_FRAMEBUFFER,null);
    const glErrors=errors(),current=state();
    let changed=0,alphaDifferences=0,maxDifference=0,totalDifference=0,linearChanged=0,linearAlphaDifferences=0,maxLinearDifference=0,maxStorageULPs=0,linearOutsideTolerance=0,nonfinite=0,subjectSignalPixels=0,maxSubjectDelta=0;
    for(let i=0;i<rgba.length;i++){
     if(!Number.isFinite(linear[i]))nonfinite++;
     if(reference){const difference=Math.abs(rgba[i]-reference.rgba[i]),ld=Math.abs(linear[i]-reference.linear[i]);if(difference){changed++;if(i%4===3)alphaDifferences++;}maxDifference=Math.max(maxDifference,difference);totalDifference+=difference;
      if(ld){linearChanged++;if(i%4===3)linearAlphaDifferences++;
       const magnitude=Math.max(Math.abs(linear[i]),Math.abs(reference.linear[i])),ulp=Math.max(2**-24,2**(Math.floor(Math.log2(magnitude||2**-24))-10)),units=ld/ulp;
       maxStorageULPs=Math.max(maxStorageULPs,units);if(units>1)linearOutsideTolerance++;
      }maxLinearDifference=Math.max(maxLinearDifference,ld);
     }
     if(blank&&i%4===0){const d=Math.max(Math.abs(rgba[i]-blank.rgba[i]),Math.abs(rgba[i+1]-blank.rgba[i+1]),Math.abs(rgba[i+2]-blank.rgba[i+2]));if(d>=2)subjectSignalPixels++;maxSubjectDelta=Math.max(maxSubjectDelta,d);}
    }
    // Encode only reference/changed images, synchronously before any await can
    // release the preserveDrawingBuffer=false presentation. This is not timed.
    const png=witness&&(!reference||changed||linearChanged)?renderer.canvas.toDataURL('image/png'):null,visibility=await awaitQueries();
    return {rgba,linear,png,state:current.value,nonfiniteState:current.nonfinite,glErrors,visibility,pixels:{width,height,channels:rgba.length,sha256:await sha(rgba),linearSHA256:await sha(linear),differingChannels:changed,alphaDifferences,maxDifference,meanDifference:totalDifference/rgba.length,linearDifferingChannels:linearChanged,linearAlphaDifferences,maxLinearDifference,maxStorageULPs,linearOutsideTolerance,nonfinite,subjectSignalPixels,maxSubjectDelta,exact:changed===0&&linearChanged===0}};
   };
   const chooseHabitatCamera=f=>{
    const target=animalFocusPoint(f).slice(),span=Math.max(...SPECIES[f.species].modelBounds.size.map((v,i)=>v*f.s[i])),rule=oceanEncounters.rules.deepHabitats.find(a=>a.uid===f.uid),attempts=[];
    for(const distance of [Math.max(.55,span*1.6,(rule?.bodyRadius||0)+.16),Math.max(.35,span*.95,(rule?.bodyRadius||0)+.16)])for(const vector of [[.08,.18,1],[-.08,.34,1],[.25,.50,1],[.08,.18,-1],[-.08,.34,-1],[1,.30,.1],[-1,.30,.1]]){
     const v=V.mul(V.norm(vector),distance),c=Math.cos(f.yaw||0),s=Math.sin(f.yaw||0),camera=[f.p[0]+c*v[0]+s*v[2],f.p[1]+v[1],f.p[2]-s*v[0]+c*v[2]];
     const occupied=allLife.some(a=>a.ecologyPresent!==false&&a.assetReady!==false&&V.dist(camera,a.p)<=animalContactEnvelope(a).radius+.03);
     const evidence={camera,distance,rock:OceanRockContact.overlaps(camera,.03),region:OceanRegions.pointBlocked(camera,.03),ground:!!OceanTrench.groundContact(camera,.03),occupied,sight:blocked(camera,target,.001)||!OceanRegions.pathClear(camera,target,.001)};attempts.push(evidence);
     if(camera[1]<-.3&&!evidence.rock&&!evidence.region&&!evidence.ground&&!occupied&&!evidence.sight)return {view:camera,target,span,attempts};
    }throw Error('No legal actual habitat camera: '+JSON.stringify({uid:f.uid,attempts}));
   };
   window.__abyssSpecialization={
    async prepare(config){
     restoreWorld();choose(false);reference=null;blank=null;const beforeErrors=errors();if(beforeErrors.length)throw Error('Unconsumed GL errors: '+beforeErrors.join(','));
     renderer.quality=config.quality;renderer.dynamicScale=1;renderer.resize(true);renderer.lamp=config.lamp;renderer.photoNear=.02;
     if(config.scope==='isolated-uploaded-mesh'){
      const subject=subjects.find(s=>s.id===config.species),b=subject.clones[config.lod==='high'?0:1],f=b.instances[0];f.p=[0,config.depth==='shallow'?-6:-7000,0];f.ecologyPresent=true;
      const span=Math.max(...SPECIES[f.species].modelBounds.size.map((v,i)=>v*f.s[i])),target=animalFocusPoint(f).slice(),distance=Math.max(.4,span*1.15),v=V.mul(V.norm([.08,.20,1]),distance),c=Math.cos(f.yaw||0),s=Math.sin(f.yaw||0),view=[target[0]+c*v[0]+s*v[2],target[1]+v[1],target[2]-s*v[0]+c*v[2]];
      renderer.batches=[b];renderer.sceneStream=null;fixture={...config,f,view,target,span,sourceUID:subject.actor.uid};
     }else{const f=habitatActors.find(a=>a.uid===config.uid);fixture={...config,f,...chooseHabitatCamera(f),sourceUID:f.uid};await stream.ready(fixture.view);}
     const distance=V.dist(fixture.view,fixture.target);renderer.photoFov=clamp(2*Math.atan(fixture.span/(2*distance*.72*Math.min(renderer.width/renderer.height,1)))*180/Math.PI,8,100);
     renderer.forceShadow=true;render();render();
     if(config.scope==='isolated-uploaded-mesh'&&renderer.sunless!==(config.depth==='sunless'))throw Error('Requested sunless/shallow branch was not active: '+JSON.stringify({fixture:config.id,expectedSunless:config.depth==='sunless',actualSunless:renderer.sunless,eye:fixture.view,fov:renderer.photoFov,far:950,productionPredicate:oceanSunlessView(fixture.view[1],950,renderer.photoFov)}));
     // This one separate absence image measures whether this actual subject
     // contributes color; it is never an A/B arm and never changes the fixture.
     const owned=Object.prototype.hasOwnProperty.call(fixture.f,'ecologyPresent'),presence=fixture.f.ecologyPresent;
     try{fixture.f.ecologyPresent=false;blank=await capture(false);}finally{if(owned)fixture.f.ecologyPresent=presence;else delete fixture.f.ecologyPresent;}
     render();const image=await capture();reference={rgba:image.rgba,linear:image.linear,png:image.png};
     const result={config,sourceUID:fixture.sourceUID,camera:fixture.view,target:fixture.target,cameraAttempts:fixture.attempts||null,scope:config.scope,baseline:{state:image.state,pixels:image.pixels,glErrors:image.glErrors,nonfiniteState:image.nonfiniteState,visibility:image.visibility},blank:{glErrors:blank.glErrors,nonfinite:blank.pixels.nonfinite,nonfiniteState:blank.nonfiniteState},png:image.png};return result;
    },
    async arm(enabled){choose(enabled);render();const image=await capture();return {production:enabled,state:image.state,pixels:image.pixels,glErrors:image.glErrors,nonfiniteState:image.nonfiniteState,visibility:image.visibility,images:image.pixels.differingChannels||image.pixels.linearDifferingChannels?{generic:reference.png,current:image.png}:null};},
    restore(){choose(true);restoreWorld();renderer.surfaceProgram=original.chooser;renderer.drawBatch=original.draw;for(const name of Object.keys(shaderCalls))g[name]=original[name];for(const q of allQueries)g.deleteQuery(q);allQueries.clear();for(const b of clones){g.deleteVertexArray(b.vao);for(const k of ['vb','eb','ib'])g.deleteBuffer(b[k]);}renderer.quality=original.quality;renderer.photoNear=original.near;renderer.photoFov=original.fov;renderer.lamp=original.lamp;return {originalAttributesUnchanged:actorSignature()===originalActors,shaderCalls:{...shaderCalls},glErrors:errors(),contextLost:g.isContextLost()};}
   };
   window.__abyssSpecializationSetup.stage='ready';
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,initial,readiness:window.__abyssSpecializationSetup,surfacePrograms:map.size,originalVertexSourceExact:true,fragmentSelectorsOnly:true,vertexSHA256:await sha(VS),genericFragmentSHA256:await sha(FS),productionFragmentSHA256:await sha(expected),geometry,worldBatchCount:worldBatches.length};
  },{species,habitatUIDs});
  assert.equal(report.setup.version,report.expectedVersion);assert.equal(report.setup.surfacePrograms,12);assert.equal(report.setup.geometry.length,10);assert(report.setup.initial.adaptive);save();
  const assess=(sample,label,entry)=>{
   const fail=reason=>report.failures.push({fixture:entry.config.id,arm:label,reason});
   if(sample.glErrors.length)fail('GL errors: '+sample.glErrors.join(','));if(sample.nonfiniteState.length||sample.pixels.nonfinite)fail('Nonfinite state or linear output');
   if(!sample.visibility.some(v=>v.visible))fail('Actual packed target instance produced no visible samples');
   if(!sample.state.otherProgramsUnchanged||!sample.state.originalAttributesUnchanged||!sample.state.texturesUnchanged)fail('Unrelated program, texture or actor attributes changed');
   if(Object.values(sample.state.shaderCalls).some(Boolean))fail('Shader/program created or linked after setup');
   if(!sample.state.packed.some(b=>b.targetIndices.length))fail('Actual target is not packed in a submitted batch');
   if(sample.pixels.alphaDifferences||sample.pixels.maxDifference>1||sample.pixels.linearAlphaDifferences||sample.pixels.linearOutsideTolerance)fail('Fixed framebuffer equivalence tolerance exceeded');
  };
  for(const config of matrix){
   report.stage=config.id;save();let entry;
   try{
    entry=await read(config=>__abyssSpecialization.prepare(config),config);entry.arms=[];const png=entry.png;delete entry.png;report.fixtures.push(entry);assess(entry.baseline,'baseline',entry);
    if(entry.blank.glErrors.length||entry.blank.nonfinite||entry.blank.nonfiniteState.length)report.failures.push({fixture:config.id,arm:'blank-witness',reason:'GL error or nonfinite visibility witness'});
    const signal=entry.baseline.pixels.subjectSignalPixels>=16;entry.colorEvidence=signal?'meaningful-subject-color':config.depth==='sunless'&&!config.lamp?'visibility-only-dark-subject':'insufficient-subject-color';
    if(entry.colorEvidence==='insufficient-subject-color')report.failures.push({fixture:config.id,reason:'Target has insufficient color signal against the subject-absent frame'});
    if(config.scope==='actual-habitat'||config.lod==='high'&&config.quality===2&&config.depth==='shallow'&&config.lamp)entry.image=writePNG(png,config.id+'-generic');
    for(const production of [false,true,true,false]){
     const arm=await read(enabled=>__abyssSpecialization.arm(enabled),production),images=arm.images;delete arm.images;entry.arms.push(arm);assess(arm,entry.arms.length,entry);
     try{assert.deepEqual(arm.state,entry.baseline.state);}catch(error){report.failures.push({fixture:config.id,arm:entry.arms.length,reason:'A/B render state differs',detail:error.message});}
     // Save changed frames, even when the one-storage-step tolerance passes.
     if(images){arm.images={};for(const [label,data]of Object.entries(images))arm.images[label]=writePNG(data,config.id+'-arm'+entry.arms.length+'-'+label);}
     save();
    }
    console.log(JSON.stringify({fixture:config.id,colorEvidence:entry.colorEvidence,maxByteDifference:Math.max(...entry.arms.map(a=>a.pixels.maxDifference)),maxStorageULPs:Math.max(...entry.arms.map(a=>a.pixels.maxStorageULPs))}));
   }catch(error){report.failures.push({fixture:config.id,reason:error.stack});if(entry)entry.failure=error.stack;save();}
  }
  for(const entry of report.fixtures.filter(f=>f.colorEvidence==='visibility-only-dark-subject')){
   const c=entry.config,pair=report.fixtures.find(f=>f.config.scope===c.scope&&f.config.species===c.species&&f.config.lod===c.lod&&f.config.quality===c.quality&&f.config.depth===c.depth&&f.config.lamp);
   entry.requiredLitWitness=pair?.config.id||null;if(!pair||pair.colorEvidence!=='meaningful-subject-color'||pair.arms.length!==4||report.failures.some(f=>f.fixture===pair.config.id))report.failures.push({fixture:c.id,reason:'Dark row lacks a successful same-species/LOD/quality/depth lamp-on color witness'});
  }
  report.final=await read(()=>__abyssSpecialization.restore());
  if(!report.final.originalAttributesUnchanged||report.final.contextLost||report.final.glErrors.length||Object.values(report.final.shaderCalls).some(Boolean))report.failures.push({reason:'Final restoration/GL/program invariant failed',detail:report.final});
  if(report.fixtures.length!==123||report.fixtures.some(f=>f.arms.length!==4))report.failures.push({reason:'The fixed 123-case, four-arm matrix is incomplete'});
  report.summary={fixtures:report.fixtures.length,isolated:report.fixtures.filter(f=>f.config.scope==='isolated-uploaded-mesh').length,actualHabitats:report.fixtures.filter(f=>f.config.scope==='actual-habitat').length,meaningfulColorRows:report.fixtures.filter(f=>f.colorEvidence==='meaningful-subject-color').length,visibilityOnlyDarkRows:report.fixtures.filter(f=>f.colorEvidence==='visibility-only-dark-subject').length,errors:report.errors.length,failures:report.failures.length};
  report.status=report.failures.length||report.errors.length?'failed':'passed-controlled-framebuffer-equivalence';if(report.status==='failed')process.exitCode=1;
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;console.error(error);if(read)try{report.failedSetup=await read(()=>window.__abyssSpecializationSetup||null);}catch(readError){report.failedSetupReadError=readError.message;}}
 finally{if(read)try{if(!report.final)report.final=await read(()=>window.__abyssSpecialization?.restore());}catch(error){report.restoreError=error.message;}save();await browser?.close();}
})();
