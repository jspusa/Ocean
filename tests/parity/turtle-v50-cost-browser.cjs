/* v50 material cost: exact v49 shader + skin versus current shader + atlas.
 * Root runs native GPU alone. Both arms use the same current geometry/world.
 * Swap the 2:5 program and slot-5 texture (with its immutable sampler state)
 * synchronously; never compile, decode, upload, or tune samples while timing.
 * No geometry-savings, FPS, physical-phone or battery claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),BASE_REF='11bec02d5507c01ae9cc7ecf4f7ad0ed7e5f3629',BASE_ENGINE_SHA='f86edf42af9c55594893216ae16ab2d7ebdff2f511f1b4c8940875a65ae50c87';
const option=(key,fallback)=>{const inline=process.argv.find(a=>a.startsWith('--'+key+'='));if(inline)return inline.slice(key.length+3);const at=process.argv.indexOf('--'+key);return at>=0?process.argv[at+1]:fallback;};
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
// Fixed before running: no adaptive warm-up, sample replacement or retry-until-
// favorable. Prewarm both shader arms equally before the measured ABBA blocks.
const sampling=Object.freeze({settleWarmFrames:180,blockWarmFrames:30,samplesPerBlock:100,arms:Object.freeze(['before','current','current','before'])});
const shaderValues=source=>vm.runInNewContext(source+'\n({VS,FS,specializer:surfaceShaderSource.toString()})',{console},{timeout:10000});
function jpegDimensions(bytes){
 assert.equal(bytes.readUInt16BE(0),0xffd8,'Expected JPEG');let at=2;
 while(at<bytes.length){while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xd9||marker===0xda)break;if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;const length=bytes.readUInt16BE(at);assert(length>=2&&at+length<=bytes.length,'Invalid JPEG segment');
  if([0xc0,0xc1,0xc2].includes(marker))return [bytes.readUInt16BE(at+5),bytes.readUInt16BE(at+3)];at+=length;
 }throw Error('JPEG size marker not found');
}
function prepareInputs(requireReady=false){
 const dir=path.join(root,'qa/parity/v01850-turtle-atlas/cost-baseline-v49');fs.mkdirSync(dir,{recursive:true});
 const engineBytes=cp.execFileSync('git',['show',BASE_REF+':src/engine.js'],{cwd:root,maxBuffer:8e6}),skinBytes=cp.execFileSync('git',['show',BASE_REF+':assets/turtle_skin_v45.jpg'],{cwd:root,maxBuffer:8e6});
 assert.equal(digest(engineBytes),BASE_ENGINE_SHA,'Pinned v49 engine differs');
 const persist=(name,bytes)=>{const file=path.join(dir,name);if(fs.existsSync(file))assert.equal(digest(fs.readFileSync(file)),digest(bytes),'Existing pinned QA input differs: '+file);else fs.writeFileSync(file,bytes);return file;};
 const savedEngine=persist('engine.js',engineBytes),skinPath=persist('turtle_skin_v45.jpg',skinBytes),baselinePath=path.resolve(option('baseline-engine',savedEngine)),baselineEngine=fs.readFileSync(baselinePath,'utf8');
 assert.equal(digest(baselineEngine),BASE_ENGINE_SHA,'Use exact pinned v49 engine');const baseline=shaderValues(baselineEngine);
 const candidatePath=path.join(root,'src/engine.js'),candidateEngine=fs.readFileSync(candidatePath,'utf8'),candidate=shaderValues(candidateEngine),candidateAsset='assets/turtle_atlas_v50.jpg',assetPath=path.join(root,candidateAsset),candidateBytes=fs.existsSync(assetPath)?fs.readFileSync(assetPath):null;
 assert.equal(candidate.VS,baseline.VS,'Material-only comparison requires unchanged VS');assert.equal(candidate.specializer,baseline.specializer,'Specialization builder must match');
 assert(/texture\s*\(\s*uTurtleSkin\b/.test(baseline.FS),'Pinned baseline must actually sample uTurtleSkin');
 const pending=[];if(candidate.FS===baseline.FS)pending.push('candidate fragment shader not integrated');if(!candidateEngine.includes("'turtle_atlas_v50'"))pending.push('candidate slot-5 loader name not integrated');if(!candidateBytes)pending.push('candidate atlas file missing');
 const dimensions=candidateBytes?jpegDimensions(candidateBytes):null;if(dimensions)assert.deepEqual(dimensions,[1024,1024],'Candidate atlas must be 1024-square');
 const provenance={baseline:{commit:BASE_REF,path:baselinePath,engineSHA256:BASE_ENGINE_SHA,VS:digest(baseline.VS),FS:digest(baseline.FS),texture:{path:skinPath,repositoryPath:'assets/turtle_skin_v45.jpg',bytes:skinBytes.length,sha256:digest(skinBytes),dimensions:jpegDimensions(skinBytes)}},candidate:{path:candidatePath,engineSHA256:digest(candidateEngine),VS:digest(candidate.VS),FS:digest(candidate.FS),texture:{path:assetPath,repositoryPath:candidateAsset,bytes:candidateBytes?.length??null,sha256:candidateBytes?digest(candidateBytes):null,dimensions}},ready:pending.length===0,pending};
 if(requireReady)assert(provenance.ready,'Candidate is not integrated; timing not started: '+pending.join('; '));
 return {baseline,candidate,baselineEngine,candidateEngine,baselineSkinDataURL:'data:image/jpeg;base64,'+skinBytes.toString('base64'),provenance};
}

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
 const {baseline,candidate,baselineSkinDataURL,provenance}=prepareInputs(true);
 const out=path.resolve(option('out','qa/parity/v01850-turtle-atlas/material-cost.json')),profiles=option('profile','both')==='both'?['desktop','touch']:[option('profile','both')];
 assert(profiles.every(p=>p==='desktop'||p==='touch'));
 const report={status:'running',sampling,...provenance,method:'Native installed Chrome, complete production-world render. Exact pinned v49 2:5 fragment and turtle_skin_v45.jpg/MIRRORED_REPEAT/full mip sampler are one arm; current production 2:5 fragment and actual loaded turtle_atlas_v50.jpg/CLAMP_TO_EDGE/aniso1/maxMip3 sampler are the other. uTurtleSkin=5 is checked in both. The program/texture pair switches synchronously with no intervening draw or await. Candidate geometry, every instance, camera/light/time/quality/resolution/MSAA, other programs/textures and render passes stay fixed. All compile, image decode, GPU upload and sampler setup precede 180 prewarm frames (ABBA, 45 per segment). Measured ABBA then uses 30 warm frames and 100 complete-world GPU queries per block, 400 retained samples/profile. No readPixels, screenshots, buffer readback or competing work while measuring. Invalid, disjoint and timed-out rows are retained; no retry, trimming or sample replacement. Any invalid row invalidates that comparison. Drift is reported without automatic acceptance. Finally restore original production pair and delete owned baseline resources. Material-pair diagnostic only: no geometry savings, overall FPS, phone or battery claim.',profiles:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profile of profiles){
   const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage(),profileReport={profile,scenes:[],network:{requestFailures:[],httpErrors:[],omitted:0}};report.profiles.push(profileReport);
   const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');
   const sourceJobs=[],sourceResponses=profileReport.sourceResponses=[],sourceErrors=profileReport.sourceErrors=[],expectedResponses={'src/engine.js':provenance.candidate.engineSHA256,[provenance.candidate.texture.repositoryPath]:provenance.candidate.texture.sha256};
   page.on('response',response=>{const u=new URL(response.url());if(!/^https?:$/.test(u.protocol)||u.origin!==url.origin)return;for(const [file,expected]of Object.entries(expectedResponses))if(u.pathname===new URL(file,url).pathname)sourceJobs.push(response.body().then(bytes=>{const actual=digest(bytes);sourceResponses.push({file,sha256:actual,bytes:bytes.length});if(actual!==expected)sourceErrors.push('Served source differs: '+file);}).catch(error=>sourceErrors.push('Source receipt failed: '+file+': '+error.message)));});
   const network=(kind,request,detail)=>{const url=diagnosticURL(request.url());if(!url||profileReport.network[kind].length>=64){profileReport.network.omitted++;return;}profileReport.network[kind].push({url,method:request.method(),resourceType:request.resourceType(),...detail});};
   page.on('requestfailed',request=>network('requestFailures',request,{error:String(request.failure()?.errorText||'unknown').slice(0,240)}));page.on('response',response=>{if(response.status()>=400)network('httpErrors',response.request(),{status:response.status()});});
   page.on('pageerror',error=>report.errors.push({profile,error:error.message}));page.on('console',message=>{if(message.type()==='error')report.errors.push({profile,error:message.text()});});
   try{
    const bootStart=Date.now();profileReport.boot={url:diagnosticURL(url.href),startedAtUTC:new Date(bootStart).toISOString()};
    try{
     profileReport.boot.phase='navigation';await page.goto(url.href);
     profileReport.boot.phase='application-ready';await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});profileReport.boot.applicationReady=true;
     // Boot deliberately only ensures the logical optional-fish actor. Its
     // asset load starts after a real dive/gallery action, neither of which
     // this stationary material comparison performs. Waiting for that idle
     // asset could never finish and is unrelated to turtle/UI readiness.
     profileReport.boot.phase='entry-ui';await page.waitForFunction(entryUIReady,null,{timeout:20000});
     profileReport.boot.ready=true;profileReport.boot.phase='complete';profileReport.boot.diagnostic=await bootDiagnostic(page);
    }catch(error){profileReport.boot.ready=false;profileReport.boot.failure=String(error.message).slice(0,600);profileReport.boot.diagnostic=await bootDiagnostic(page);throw error;}finally{profileReport.boot.wallMs=Date.now()-bootStart;save();}
    profileReport.initial=await page.evaluate(async({baseline,candidate,baselineSkinDataURL,provenance})=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
     if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Hardware GPU required: '+hardware);
     if(!g.getExtension('EXT_disjoint_timer_query_webgl2'))throw Error('Native GPU timer query unavailable');
     if(VS!==baseline.VS||VS!==candidate.VS||FS!==candidate.FS||surfaceShaderSource.toString()!==candidate.specializer)throw Error('Served shaders/builder differ from prepared sources');
     const initial={hardware,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,identicalVS:true,optionalBarramundi:oceanBarramundi.status(renderer)};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;
     if(initial.optionalBarramundi.state!=='idle')throw Error('Stationary material fixture expects optional fish idle');
     const currentTurtle=renderer.surfacePrograms.get('2:5');if(!currentTurtle)throw Error('Current 2:5 production program required');
     if(!ASSETS.turtle_atlas_v50||!new URL(ASSETS.turtle_atlas_v50,location.href).pathname.endsWith('/assets/turtle_atlas_v50.jpg'))throw Error('Production atlas asset mapping missing');
     const originalTextures=renderer.textures.slice(),textureArray=renderer.textures,currentTexture=originalTextures[5];
     if(originalTextures.length!==9||!currentTexture)throw Error('Expected nine actual textures with atlas at slot 5');
     const inspect=texture=>{const active=g.getParameter(g.ACTIVE_TEXTURE);g.activeTexture(g.TEXTURE0+5);const bound=g.getParameter(g.TEXTURE_BINDING_2D);try{g.bindTexture(g.TEXTURE_2D,texture);return {min:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER),mag:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER),wrapS:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_S),wrapT:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_T),baseLevel:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_BASE_LEVEL),maxLevel:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAX_LEVEL),minLOD:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_LOD),maxLOD:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAX_LOD),anisotropy:renderer.aniso?g.getTexParameter(g.TEXTURE_2D,renderer.aniso.TEXTURE_MAX_ANISOTROPY_EXT):null,samplerObjectBound:g.getParameter(g.SAMPLER_BINDING)!==null};}finally{g.bindTexture(g.TEXTURE_2D,bound);g.activeTexture(active);}};
     const state=window.__turtleV50Cost={beforeTurtle:null,currentTurtle,currentGeneric:renderer.program,beforeTexture:null,currentTexture,textures:originalTextures,textureArray,inspect,samplers:null};
     state.restore=()=>{renderer.surfacePrograms.set('2:5',currentTurtle);renderer.textures[5]=currentTexture;};
     state.cleanup=()=>{state.restore();const active=g.getParameter(g.ACTIVE_TEXTURE);g.activeTexture(g.TEXTURE0+5);g.bindTexture(g.TEXTURE_2D,currentTexture);g.activeTexture(active);if(state.beforeTurtle){if(g.getParameter(g.CURRENT_PROGRAM)===state.beforeTurtle.p)g.useProgram(currentTurtle.p);g.deleteProgram(state.beforeTurtle.p);}if(state.beforeTexture)g.deleteTexture(state.beforeTexture);return {pairRestored:renderer.surfacePrograms.get('2:5')===currentTurtle&&renderer.textures===textureArray&&originalTextures.every((t,i)=>renderer.textures[i]===t),baselineProgramDeleted:!state.beforeTurtle||!g.isProgram(state.beforeTurtle.p),baselineTextureDeleted:!state.beforeTexture||!g.isTexture(state.beforeTexture),candidateSamplerUnchanged:!state.samplers||JSON.stringify(inspect(currentTexture))===JSON.stringify(state.samplers.current),gl:g.getError()};};
     try{
      const expectedCurrent={min:g.LINEAR_MIPMAP_LINEAR,mag:g.LINEAR,wrapS:g.CLAMP_TO_EDGE,wrapT:g.CLAMP_TO_EDGE,baseLevel:0,maxLevel:3,minLOD:-1000,maxLOD:1000,anisotropy:renderer.aniso?1:null,samplerObjectBound:false},currentSampler=inspect(currentTexture);
      if(JSON.stringify(currentSampler)!==JSON.stringify(expectedCurrent))throw Error('Actual atlas sampler violates v50 contract: '+JSON.stringify(currentSampler));
      const attached=g.getAttachedShaders(currentTurtle.p)||[];if(!attached.some(s=>g.getShaderParameter(s,g.SHADER_TYPE)===g.VERTEX_SHADER&&g.getShaderSource(s)===VS)||!attached.some(s=>g.getShaderParameter(s,g.SHADER_TYPE)===g.FRAGMENT_SHADER&&g.getShaderSource(s)===surfaceShaderSource(candidate.FS,2,5)))throw Error('Actual linked candidate sources differ');
      state.beforeTurtle=renderer.makeProgram(VS,surfaceShaderSource(baseline.FS,2,5));
      const previousProgram=g.getParameter(g.CURRENT_PROGRAM);try{for(const program of [state.beforeTurtle,currentTurtle]){const location=g.getUniformLocation(program.p,'uTurtleSkin');if(location===null)throw Error('Both arms must actually consume uTurtleSkin');g.useProgram(program.p);g.uniform1i(location,5);if(g.getUniform(program.p,location)!==5)throw Error('Skin sampler must use unit 5');}}finally{g.useProgram(previousProgram);}
      const image=await new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>{img.onload=img.onerror=null;img.removeAttribute('src');reject(Error('Pinned baseline image decode timeout'));},12000);img.onload=()=>{clearTimeout(timer);img.onload=img.onerror=null;resolve(img);};img.onerror=()=>{clearTimeout(timer);img.onload=img.onerror=null;reject(Error('Pinned baseline image decode failed'));};img.src=baselineSkinDataURL;});
      if(image.width!==provenance.baseline.texture.dimensions[0]||image.height!==provenance.baseline.texture.dimensions[1])throw Error('Pinned baseline decode size differs');
      const texture=state.beforeTexture=g.createTexture();if(!texture)throw Error('Baseline texture allocation failed');
      const active=g.getParameter(g.ACTIVE_TEXTURE),bound=g.getParameter(g.TEXTURE_BINDING_2D),flip=g.getParameter(g.UNPACK_FLIP_Y_WEBGL);let source=image;
      try{g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);if(!renderer.textureFull&&image.width>1024){const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;canvas.getContext('2d').drawImage(image,0,0,1024,1024);source=canvas;}
       g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,source);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.MIRRORED_REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.MIRRORED_REPEAT);
       if(renderer.aniso)g.texParameterf(g.TEXTURE_2D,renderer.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,g.getParameter(renderer.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }finally{g.bindTexture(g.TEXTURE_2D,bound);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,flip);g.activeTexture(active);}
      const beforeSampler=inspect(texture),expectedBefore={...expectedCurrent,wrapS:g.MIRRORED_REPEAT,wrapT:g.MIRRORED_REPEAT,maxLevel:1000,anisotropy:renderer.aniso?Math.min(8,g.getParameter(renderer.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)):null};
      if(JSON.stringify(beforeSampler)!==JSON.stringify(expectedBefore))throw Error('Pinned baseline sampler differs from v49 policy');state.samplers={before:beforeSampler,current:currentSampler};
      state.armState=arm=>{const program=arm==='before'?state.beforeTurtle:currentTurtle,texture=arm==='before'?state.beforeTexture:currentTexture;return {programMatches:renderer.surfacePrograms.get('2:5')===program,textureMatches:renderer.textures[5]===texture,samplerMatches:JSON.stringify(inspect(texture))===JSON.stringify(state.samplers[arm]),skinSamplerUnit:g.getUniform(program.p,g.getUniformLocation(program.p,'uTurtleSkin'))};};
      initial.textureCount=originalTextures.length;initial.textureFull=renderer.textureFull;initial.samplers=state.samplers;initial.baselineUpload={dimensions:[source.width,source.height],format:'RGBA8',mipLevels:Math.floor(Math.log2(Math.max(source.width,source.height)))+1,source:'exact pinned v49 JPEG bytes from Node; same width>1024 mobile downscale policy'};
      const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');initial.currentShaderSHA256={VS:await hash(VS),FS:await hash(FS),turtleFS:await hash(surfaceShaderSource(FS,2,5))};initial.baselineTurtleFS=await hash(surfaceShaderSource(baseline.FS,2,5));
      if(g.getError())throw Error('Material-pair preparation GL error');return initial;
     }catch(error){state.cleanup();throw error;}
    },{baseline,candidate,baselineSkinDataURL,provenance});
    await Promise.all(sourceJobs);profileReport.sourceResponses=sourceResponses;assert.deepEqual(sourceErrors,[]);for(const file of Object.keys(expectedResponses))assert(sourceResponses.some(r=>r.file===file),'Missing served candidate source receipt: '+file);
    assert.equal(profileReport.initial.quality,touch?1:2);assert.equal(profileReport.initial.scale,1);assert(profileReport.initial.adaptive&&profileReport.initial.compiled&&profileReport.initial.streamed);assert.equal(profileReport.initial.textureCount,9);save();
    for(const scene of ['turtle']){
     const row=await page.evaluate(async({scene,touch,sampling})=>{
      const result={scene,blocks:[],checks:[],failure:null},g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),programs=window.__turtleV50Cost,raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RAF did not arrive within two seconds')),2000);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
      const unchangedPrograms=new Map([...renderer.surfacePrograms].filter(([key])=>key!=='2:5'));
      const passPrograms=Object.entries(renderer).filter(([key,value])=>/Program$/.test(key)&&value?.p);
      let targetBuffers=null,renderResources=null;
      const sharedStable=()=>renderer.program===programs.currentGeneric&&passPrograms.every(([key,value])=>renderer[key]===value)&&renderer.surfacePrograms.size===unchangedPrograms.size+1&&[...unchangedPrograms].every(([key,value])=>renderer.surfacePrograms.get(key)===value)&&renderer.textures.length===programs.textures.length&&renderer.textures===programs.textureArray&&programs.textures.every((value,i)=>i===5||renderer.textures[i]===value)&&(!renderResources||renderResources.every(([key,value])=>renderer[key]===value))&&(!targetBuffers||targetBuffers.every(r=>r.batch.vb===r.vb&&r.batch.eb===r.eb&&r.batch.vao===r.vao&&r.batch.ib===r.ib&&r.batch.instances===r.instances&&r.batch.count===r.count&&r.batch.vertexCount===r.vertexCount&&r.batch.radius===r.radius));
      let query=null,queryActive=false;
      const median=values=>values.length?values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]:null;
      const finishBlock=block=>{if(block.endedAtMs!==undefined)return;block.endedAtMs=performance.now();block.endedWallAtMs=Date.now();block.elapsedMs=block.endedAtMs-block.startedAtMs;block.wallMs=block.endedWallAtMs-block.startedWallAtMs;block.measuredWallMs=block.measuredWallAtMs===undefined?null:block.endedWallAtMs-block.measuredWallAtMs;const cpu=block.samples.map(s=>s.cpuMs).filter(Number.isFinite);block.cpu={measuredSamples:cpu.length,medianMs:median(cpu),totalMs:cpu.reduce((a,b)=>a+b,0),maxMs:cpu.length?Math.max(...cpu):null};block.sampleCount=block.samples.length;block.validSamples=block.samples.filter(s=>s.status==='valid').length;block.hiddenAtEnd=document.hidden;block.hasFocusAtEnd=document.hasFocus();};
      const restore=()=>programs.restore();
      try{
       restore();updateLife(6);const actor=life.find(f=>f.uid==='turtle-002');if(!actor||actor.ecologyPresent===false)throw Error('Actual present turtle-002 required');
       const batches=renderer.batches.filter(b=>!b.shadowProxy&&b.instances.includes(actor));if(batches.length!==2)throw Error('Both actual animal LODs are required');
       const offset=[3.3,1.6,3.6],fov=touch?84:44,near=.08;
       const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),camera=[actor.p[0]+c*offset[0]+s*offset[2],actor.p[1]+offset[1],actor.p[2]-s*offset[0]+c*offset[2]],target=actor.p.slice(),time=6;
       if(OceanRockContact.overlaps(camera,near))throw Error('Controlled inspection camera is inside actual rock');
       renderer.photoFov=fov;renderer.photoNear=near;renderer.lamp=false;renderer.lighting='day';renderer.forceShadow=true;
       await renderer.sceneStream.ready(camera);
       targetBuffers=batches.map(batch=>({batch,vb:batch.vb,eb:batch.eb,vao:batch.vao,ib:batch.ib,instances:batch.instances,count:batch.count,vertexCount:batch.vertexCount,radius:batch.radius}));
       if(targetBuffers.some(r=>!r.vb||!r.eb||!r.vao))throw Error('Actual uploaded turtle geometry is not resident');
       result.geometry=batches.map(b=>({count:b.count,vertexCount:b.vertexCount,radius:b.radius,minDistance:b.minDistance||0,maxDistance:b.maxDistance||0,kind:b.kind,material:b.material}));
       result.view={uid:actor.uid,species:SPECIES[actor.species].id,position:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,scale:actor.s.slice(),camera,target,time,fov,near,lighting:renderer.lighting,lamp:renderer.lamp};
       const instanceIdentity=()=>JSON.stringify([...allLife,...shoal].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.s,f.tint,f.phase,f.speed,f.genes,f.ecologyPresent]));
       const sceneIdentity=instanceIdentity();
       const actorSubmitted=b=>{const origin=renderer.renderOrigin||[0,0,0],p=actor.p.map((v,k)=>Math.fround(v-origin[k]));for(let i=0;i<b.drawCount;i++){const j=i*24;if(p.every((v,k)=>Math.abs(b.data[j+k]-v)<.00001)&&Math.abs(b.data[j+10]-Math.fround(actor.phase||0))<.00001)return true;}return false;};
       const stream=renderer.sceneStream;let settledResidency=null;
       const residency=()=>stream.meshes.filter(m=>m.resident).map(m=>m.id);
       const streamState=()=>{const {required,keep}=stream.neededRanges(camera);return {residentMeshes:stream.meshes.filter(m=>m.resident).length,outsideKeep:stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,pendingJobs:stream.jobs.size,queuedJobs:stream.queue.length,activeJobs:stream.active,requiredMissing:[...required].filter(id=>!stream.meshes[id].resident).length,forceShadow:!!renderer.forceShadow,shadowMapDirty:!!renderer._shadowMapDirty,staticShadowUpdates:renderer.staticShadowUpdates||0};};
       const stats=()=>({sharedProgramsAndTexturesUnchanged:sharedStable(),controls:{camera,target,time,fov:renderer.photoFov,near:renderer.photoNear,lighting:renderer.lighting,lamp:renderer.lamp,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog,fogDensity:renderer.fogDensity,aperture:renderer.photoAperture||0,focus:renderer.photoFocus||8,adaptive:settings.adaptive,active,freeze:window.__freeze,velocity:player.velocity},drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates||0,residencyMatches:JSON.stringify(residency())===settledResidency,stream:streamState(),submittedTriangles:renderer.submittedTriangles,submittedVertices:renderer.submittedVertices,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,selected:batches.map(b=>({kind:b.kind,material:b.material,species:b.species,minDistance:b.minDistance||0,count:b.count,drawCount:b.drawCount,actorSubmitted:actorSubmitted(b),program:renderer.surfaceProgram(b)===programs.beforeTurtle?'baseline-2:5':renderer.surfaceProgram(b)===programs.currentTurtle?'current-2:5':'unexpected'}))});
       const render=()=>renderer.render(camera,target,time),switchArm=arm=>{
        const expected=arm==='before'?programs.beforeTurtle:programs.currentTurtle;renderer.surfacePrograms.set('2:5',expected);renderer.textures[5]=arm==='before'?programs.beforeTexture:programs.currentTexture;
        const pair=programs.armState(arm);if(!pair.programMatches||!pair.textureMatches||!pair.samplerMatches||pair.skinSamplerUnit!==5)throw Error('Atomic material-pair selection failed: '+JSON.stringify(pair));
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
       renderResources=Object.entries(renderer).filter(([key,value])=>value&&/(?:FBO|VAO|Color|Depth|Texture|Sampler|Renderbuffer)$/.test(key)&&typeof value==='object'&&!Array.isArray(value)&&!ArrayBuffer.isView(value));
       result.fixedResources={passPrograms:passPrograms.map(([key])=>key),renderResources:renderResources.map(([key])=>key)};
       const invariantStats=stats=>({...stats,selected:stats.selected.map(({program,...draw})=>draw)});
       let invariant=null,abort=false;
       // Warm the complete production world, not a shader-only draw. Retain
       // every warm row and fail on a changed workload; do not wait for a
       // favorable timing result or remove slow frames from later samples.
       const warmFrame=async(arm,index,rows)=>{
        await raf();const row={index,arm,hidden:document.hidden,hasFocus:document.hasFocus(),startedAtMs:performance.now(),status:'pending'};rows.push(row);
        const begin=performance.now();row.submitted=render()!==false;row.cpuMs=performance.now()-begin;row.gl=g.getError();row.stats=stats();row.hiddenAtEnd=document.hidden;
        const expected=arm==='before'?'baseline-2:5':'current-2:5';row.programSelectionMatches=row.stats.sharedProgramsAndTexturesUnchanged&&row.stats.selected.every(b=>b.program===expected);
        row.materialPair=programs.armState(arm);row.skinSamplerUnit=row.materialPair.skinSamplerUnit;if(!row.materialPair.programMatches||!row.materialPair.textureMatches||!row.materialPair.samplerMatches||row.skinSamplerUnit!==5)row.programSelectionMatches=false;
        const signature=JSON.stringify(invariantStats(row.stats));if(invariant===null)invariant=signature;row.invariantsMatch=signature===invariant;
        row.status=!row.submitted?'frame-not-submitted':row.gl?'gl-error':!row.programSelectionMatches?'wrong-selected-program':!row.invariantsMatch?'render-invariant-changed':!row.stats.residencyMatches?'settled-residency-changed':!row.stats.selected.some(b=>b.actorSubmitted)?'target-actor-not-submitted':row.hidden||row.hiddenAtEnd?'hidden-during-warm':'valid';
        row.elapsedMs=performance.now()-row.startedAtMs;if(row.status!=='valid')throw Error('Invalid warm frame '+index+' ('+arm+'): '+row.status);
       };
       const segmentFrames=sampling.settleWarmFrames/sampling.arms.length;if(!Number.isInteger(segmentFrames))throw Error('Prewarm count must divide evenly across ABBA');
       result.prewarm={requestedFrames:sampling.settleWarmFrames,framesPerSegment:segmentFrames,arms:sampling.arms.slice(),startedAtMs:performance.now(),startedWallAtMs:Date.now(),frames:[]};
       try{for(const arm of sampling.arms){switchArm(arm);for(let i=0;i<segmentFrames;i++)await warmFrame(arm,result.prewarm.frames.length,result.prewarm.frames);}}
       finally{result.prewarm.elapsedMs=performance.now()-result.prewarm.startedAtMs;result.prewarm.wallMs=Date.now()-result.prewarm.startedWallAtMs;result.prewarm.completedFrames=result.prewarm.frames.filter(f=>f.status==='valid').length;}
       for(const [blockIndex,arm]of sampling.arms.entries()){
        switchArm(arm);const expectedProgram=arm==='before'?'baseline-2:5':'current-2:5',block={index:blockIndex,arm,expectedProgram,warmFrames:sampling.blockWarmFrames,warmSamples:[],startedAtMs:performance.now(),startedWallAtMs:Date.now(),hiddenAtStart:document.hidden,hasFocusAtStart:document.hasFocus(),samples:[]};result.blocks.push(block);
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
         sample.materialPair=programs.armState(arm);sample.skinSamplerUnit=sample.materialPair.skinSamplerUnit;if(!sample.materialPair.programMatches||!sample.materialPair.textureMatches||!sample.materialPair.samplerMatches||sample.skinSamplerUnit!==5)sample.programSelectionMatches=false;
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
       result.contentUnchanged=sceneIdentity===instanceIdentity();
       result.programSelection={exactV49ToV50MaterialPair:true,expected:{before:'baseline-2:5',current:'current-2:5'},unrelatedSurfacePrograms:[...unchangedPrograms.keys()],selected:result.blocks[0]?.samples[0]?.stats?.selected};
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
   }finally{try{profileReport.cleanup=await page.evaluate(()=>window.__turtleV50Cost?.cleanup()||{notInitialized:true});if(!profileReport.cleanup.notInitialized)assert(profileReport.cleanup.pairRestored&&profileReport.cleanup.baselineProgramDeleted&&profileReport.cleanup.baselineTextureDeleted&&profileReport.cleanup.candidateSamplerUnchanged&&!profileReport.cleanup.gl,'Material-pair cleanup failed');}catch(error){report.errors.push({profile,cleanup:error.message});}await context.close();save();}
  }
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-gpu-cost';
 }catch(error){report.status='failed-no-valid-comparison-for-incomplete-scenes';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
}
if(require.main===module){if(process.argv.includes('--check-source-only')){try{const prepared=prepareInputs(false),receipt={status:prepared.provenance.ready?'source-only-ready-native-not-run':'source-only-awaiting-candidate-integration',sampling,...prepared.provenance};const file=path.resolve(option('out','qa/parity/v01850-turtle-atlas/cost-source-only.json'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));}catch(error){console.error(error);process.exitCode=1;}}else main().catch(error=>{console.error(error);process.exitCode=1;});}
module.exports={entryUIReady,sampling,prepareInputs,jpegDimensions};
