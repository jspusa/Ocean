/* Controlled whole-game terrain comparison. Root serializes native GPU work.
 * Two unmodified production servers supply baseline/candidate; no shaders,
 * actors, terrain, draw methods or production sources are replaced here.
 * This is not normal-player FPS, physical-phone or battery evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const profile=option('profile','desktop'),pixelsOnly=process.argv.includes('--pixels-only'),timingOnly=process.argv.includes('--timing-only'),base=option('base','df7b1a7');
assert(!(pixelsOnly&&timingOnly),'Choose pixels-only or timing-only');
const output=path.resolve(option('out','/tmp/ocean-trench-surface-'+profile+'/report.json'));
const urls={baseline:option('baseline-url','http://127.0.0.1:8767/'),candidate:option('url','http://127.0.0.1:8765/')};
const samples=Number(option('samples','25')),fixedTime=8,orderName=option('order','ABBA');
assert(['ABBA','BAAB'].includes(orderName),'Order must be ABBA or BAAB');
const order=[...orderName].map(v=>v==='A'?'baseline':'candidate');
assert(['desktop','touch'].includes(profile),'Choose one desktop or touch profile');
assert(Number.isInteger(samples)&&samples>=1&&samples<=100,'Sample count must be 1–100');
const fixtureVersion=3,fixtures=[
 {id:'midwater',p:[760,-700,-90],aim:[770,-700,-100]},
 {id:'hadal-arrival',p:[766,-7000,-120],aim:[776,-7001.8,-130]},
 {id:'hadal-wall',p:[773.6,-7001.2,-142],aim:[768.8,-7001.2,-142],parallax:true},
 {id:'hadal-up',p:[773.6,-7001.2,-142],aim:[768.8,-6993,-142]},
 {id:'cut-bottom',p:[780,-7018.6,-145],aim:[769,-7018.6,-145],parallax:true},
 {id:'slope-arrival',p:[754,-1400,-103],aim:[763,-1402,-111]},
 {id:'slope-mud',p:[765,-1400.65,-109],aim:[766,-1402,-112.5]},
 {id:'reef',p:[0,-8,7],aim:[0,-8,-10],unchangedControl:true}
];
const requested=option('scenes','').split(',').filter(Boolean);
assert(requested.every(id=>fixtures.some(v=>v.id===id)),'Unknown --scenes entry');
const scenes=fixtures.filter(v=>!requested.length||requested.includes(v.id));
const device=profile==='touch'?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,quality:1}:{viewport:{width:1440,height:900},deviceScaleFactor:2,isMobile:false,hasTouch:false,quality:2};
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const stats=values=>{if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b);return {count:a.length,median:(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2,min:a[0],max:a.at(-1),mean:a.reduce((s,v)=>s+v,0)/a.length};};
const baseCommit=cp.execFileSync('git',['rev-parse',base+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
const expectedVersion={baseline:cp.execFileSync('git',['show',baseCommit+':VERSION'],{cwd:root,encoding:'utf8'}).trim(),candidate:option('expected-candidate-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim())};
const fixtureSHA256=sha(JSON.stringify({fixtureVersion,fixtures,fixedTime,device}));
const report={status:'running',profile,pixelsOnly,timingOnly,orderName,baseCommit,urls,expectedVersion,fixtureVersion,fixtureSHA256,fixtures:scenes,fixedTime,device,samplesPerBlock:samples,order,sourceIdentity:{},sessions:[],timingRuns:[],images:[],comparisons:[],errors:[],allTimingFinished:false,
 method:'Two actual production servers; pinned baseline files are verified against Git and candidate files against the current checkout. A fresh pair of native visible Chrome contexts is opened for each scene. Both complete views warm before counterbalanced ABBA or BAAB blocks, and the foreground page warms for at least 60 complete frames again before every block; the inactive page stays frozen. Each page is explicitly foregrounded before warm-up, timer sampling and capture. Fixed authored camera/aim/time, quality 2 desktop or 1 touch, scale 1, lamp on, no adaptive changes. Streamed keep-region residency settles before measuring. Queries enclose a complete production Renderer.render only; CPU submission and navigation-to-ready wall time are separate. Every timing scene finishes before any image readback. Separate image contexts capture the complete drawing buffer immediately after a synchronous render; PNG and readPixels occur in the same JavaScript task, before any await. Images include fixed-orientation lateral camera translations at -1/0/+1 metre for near-wall views. No production method is replaced. All signed timing differences and raw samples remain in the report. Baseline/candidate terrain changes are intentional; reef is a byte-exact unchanged control. Controlled touch dimensions run on the host GPU, not a physical phone.',
 startupEvidence:{isolatedCPUStartupMs:null,isolatedShaderCompileMs:null,note:'Only navigation-to-ready wall time is measured. It includes fetching, parsing, geometry construction, shader compilation, initialization and polling; it is not CPU-only or an isolated compilation cost.'}};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const evidenceFile=file=>/^src\/.*\.js$/.test(file)||/^assets\/(?:scene\/.*|reef\.mesh\.gz|(?:sand|rock|shell|coral)_(?:diff|nor_gl)\.jpg|caustics\.jpg)$/.test(file);
async function bytesAt(url,file){const response=await fetch(new URL(file,url),{cache:'no-store',signal:AbortSignal.timeout(30000)});assert(response.ok,'HTTP '+response.status+' for '+file);return Buffer.from(await response.arrayBuffer());}
async function sourcesAt(mode){
 const manifestBytes=await bytesAt(urls[mode],'MANIFEST.json'),manifest=JSON.parse(manifestBytes),files=[...new Set(['VERSION','index.html','assets/scene/index.json','assets/reef.mesh.gz',...manifest.files.filter(f=>evidenceFile(f.path)).map(f=>f.path)])].sort(),rows=[];
 assert.equal(manifest.version,expectedVersion[mode],'Run against a packed release manifest');
 for(const file of files){const bytes=await bytesAt(urls[mode],file),local=mode==='baseline'?cp.execFileSync('git',['show',baseCommit+':'+file],{cwd:root,maxBuffer:32*1024*1024}):fs.readFileSync(path.join(root,file));assert(bytes.equals(local),'Served '+mode+' source differs from its exact '+(mode==='baseline'?'Git baseline':'checkout')+': '+file);const entry=manifest.files.find(f=>f.path===file);rows.push({path:file,bytes:bytes.length,sha256:sha(bytes),matchesManifest:!!entry&&entry.bytes===bytes.length&&entry.sha256===sha(bytes)});}
 const version=(await bytesAt(urls[mode],'VERSION')).toString().trim();assert.equal(version,expectedVersion[mode]);
 assert(rows.every(r=>r.matchesManifest),'Pack before comparing: every observed source/scene/texture must match its manifest');
 return {version,manifestVersion:manifest.version,manifestSHA256:sha(manifestBytes),files:rows,sourceSnapshotSHA256:sha(JSON.stringify(rows)),manifestMatchesAllSourceFiles:rows.every(r=>r.matchesManifest)};
}
function parallaxViews(scene){
 if(!scene.parallax)return [{...scene,lateral:0}];
 const dx=scene.aim[0]-scene.p[0],dz=scene.aim[2]-scene.p[2],length=Math.hypot(dx,dz),right=[-dz/length,0,dx/length];
 return [-1,0,1].map(lateral=>({...scene,id:scene.id+'-'+(lateral<0?'left':lateral>0?'right':'center'),parent:scene.id,lateral,p:scene.p.map((v,k)=>v+right[k]*lateral),aim:scene.aim.map((v,k)=>v+right[k]*lateral)}));
}

async function run(){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 let browser;const live=new Set();
 async function close(session){if(!session)return;try{await session.context.close();live.delete(session);session.row.closed=true;}catch(error){session.row.cleanupError=error.message;report.errors.push('Context cleanup: '+error.message);}finally{save();}}
 async function open(mode,scene,phase){
  const row={mode,scene:scene.id,phase,status:'loading',errors:[],sourceResponses:[]};report.sessions.push(row);save();
  const {quality,...contextOptions}=device,context=await browser.newContext(contextOptions),page=await context.newPage(),session={context,page,row};live.add(session);
  const responseTasks=[];
  page.on('pageerror',error=>row.errors.push(error.stack||error.message));page.on('crash',()=>row.errors.push('Renderer process crashed'));page.on('console',message=>{if(message.type()==='error')row.errors.push(message.text());});
  page.on('response',response=>{const actual=new URL(response.url()),baseURL=new URL(urls[mode]);if(actual.origin!==baseURL.origin||!actual.pathname.startsWith(baseURL.pathname))return;const relative=actual.pathname.slice(baseURL.pathname.length);if(evidenceFile(relative))responseTasks.push(response.body().then(body=>{const loaded={url:actual.href,path:relative,bytes:body.length,sha256:sha(body)};row.sourceResponses.push(loaded);const expected=report.sourceIdentity[mode].files.find(f=>f.path===relative);if(!expected||expected.sha256!==loaded.sha256||expected.bytes!==loaded.bytes)row.errors.push('Actual URL response differs from pinned evidence: '+actual.href);}).catch(error=>row.errors.push('Source response: '+error.message)));});
  session.verifyResponses=async()=>{await Promise.all(responseTasks);assert.deepEqual(row.errors,[]);const scripts=row.sourceResponses.filter(f=>/^src\//.test(f.path));assert.equal(scripts.length,report.sourceIdentity[mode].files.filter(f=>/^src\//.test(f.path)).length,'Every production script must have exact URL response evidence');};
  const cdp=await context.newCDPSession(page);
  session.read=async(fn,arg)=>{const result=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  await page.addInitScript(quality=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,third:false,lamp:true,startWithSound:false,reduced:false}})),quality);
  await page.bringToFront();const targetURL=new URL(urls[mode]);targetURL.searchParams.set('still','');const started=performance.now();
  await page.goto(targetURL.href);await page.bringToFront();const deadline=Date.now()+120000;
  while(!await session.read(()=>window.__ocean?.ready)){if(Date.now()>deadline)throw Error('Boot timed out: '+mode+'/'+scene.id);const failure=await session.read(()=>{const box=document.getElementById('errorBox');return box&&!box.classList.contains('hidden')?document.getElementById('errorMessage').textContent:null;});if(failure)throw Error(failure);await page.waitForTimeout(50);}
  row.navigationToReadyWallMs=performance.now()-started;await session.verifyResponses();
  row.meta=await session.read(async({scene,quality,time,phase,mode})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Native hardware GPU required: '+hardware);
   if(phase==='timing'&&!ext)throw Error('EXT_disjoint_timer_query_webgl2 unavailable');
   if(renderer.quality!==quality||renderer.dynamicScale!==1||!window.__freeze)throw Error('Fixed initial quality/scale/freeze does not match fixture');
   const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof data==='string'?new TextEncoder().encode(data):data)),n=>n.toString(16).padStart(2,'0')).join('');
   const originalMethods=Object.getOwnPropertyNames(Renderer.prototype).filter(k=>k!=='constructor'&&typeof Renderer.prototype[k]==='function');
   if(originalMethods.some(k=>Object.hasOwn(renderer,k)||renderer[k]!==Renderer.prototype[k]))throw Error('Renderer method override present');
   const shaderIdentity=[],uniformReflection=[];
   for(const [slot,program]of [['generic',renderer.program],['shadow',renderer.shadowProgram],...Array.from(renderer.surfacePrograms||[],([key,p])=>['surface:'+key,p])]){
    if(!g.getProgramParameter(program.p,g.LINK_STATUS))throw Error('Unlinked program '+slot);
    const shaders=(g.getAttachedShaders(program.p)||[]).map(s=>({type:g.getShaderParameter(s,g.SHADER_TYPE),source:g.getShaderSource(s)}));
    for(const shader of shaders)shaderIdentity.push({slot,type:shader.type,sha256:await digest(shader.source)});
    if(slot==='generic'&&(shaders.find(s=>s.type===g.VERTEX_SHADER)?.source!==VS||shaders.find(s=>s.type===g.FRAGMENT_SHADER)?.source!==FS))throw Error('Generic program is not current production source');
    if(slot==='surface:0:17')for(let i=0;i<g.getProgramParameter(program.p,g.ACTIVE_UNIFORMS);i++){const uniform=g.getActiveUniform(program.p,i);uniformReflection.push({name:uniform.name,type:uniform.type,size:uniform.size});}
   }
   if(!renderer.surfacePrograms?.has('0:17'))throw Error('Production sediment specialization is absent');
   if(mode==='candidate'&&uniformReflection.some(u=>/^uRock(?:N)?(?:\[|$)/.test(u.name)))throw Error('Sediment specialization still has active rock texture samplers');
   settings.adaptive=false;settings.third=false;settings.lamp=true;settings.quality=quality;renderer.quality=quality;renderer.dynamicScale=1;
   renderer.photoFov=null;renderer.photoAperture=0;renderer.photoNear=null;renderer.photoFocus=8;
   await __prepareView(scene.p,scene.aim,time);if(renderer.sceneStream)await renderer.sceneStream.ready(eye);
   // Use exact optical coordinates after the public view setup. Camera smoothing
   // is not a terrain-comparison variable; the production renderer remains intact.
   eye=scene.p.slice();target=scene.aim.slice();renderer.lamp=true;renderer.lighting='day';renderer.exposure=1.11;renderer.clarity=1;
   const floor=OceanTrench.containsXZ(scene.p[0],scene.p[2])?OceanTrench.floorAt(scene.p[0],scene.p[2],scene.p[1]+.001):groundHeight(scene.p[0],scene.p[2]);
   const safety={floor,clearance:scene.p[1]-floor,pointBlocked:OceanRegions.pointBlocked(scene.p,.4),belowSurface:scene.p[1]<-.65};
   if(!Number.isFinite(floor)||safety.clearance<.81||safety.pointBlocked||!safety.belowSurface)throw Error('Unsafe fixed camera, no replacement chosen: '+JSON.stringify({scene:scene.id,p:scene.p,safety}));
   const actorIdentity=()=>JSON.stringify(life.map(f=>({uid:f.uid,species:f.species,p:f.p,s:f.s,home:f.home,yaw:f.yaw,pitch:f.pitch||0,phase:f.phase})));
   const actorBefore=actorIdentity(),solidJSON=JSON.stringify(OceanTrench.solids),solidIdentity={count:OceanTrench.solids.length,sha256:await digest(solidJSON),studyPoints:OceanTrench.studyPoints,stations:OceanTrench.stations};
   const stream=()=>{const s=renderer.sceneStream;if(!s)throw Error('Production streamed scene required');const keep=s.neededRanges(scene.p).keep;return {keep:[...keep].sort((a,b)=>a-b),resident:s.meshes.filter(m=>m.resident).map(m=>m.id),missing:[...keep].filter(i=>!s.meshes[i].resident),outside:s.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id),jobs:s.jobs.size,active:s.active,queued:s.queue.length};};
   const s=renderer.sceneStream;if(!s)throw Error('Production scene streamer absent');await Promise.all([...new Set(stream().missing.map(i=>s.meshes[i].meta.chunk))].map(id=>s.request(id,1)));
   const raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Animation frame timeout; page must remain foreground')),10000);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
   const render=()=>{const previous=renderer.frame,result=renderer.render(scene.p,scene.aim,time);if(result===false)return false;if(renderer.frame!==previous+1)throw Error('Incomplete production render');return true;};
   const strata=()=>renderer.batches.flatMap((b,index)=>b.sceneRole==='region:trench'||b.regionRole==='strata'?[{index,sceneRole:b.sceneRole||null,regionRole:b.regionRole||null,material:b.material,kind:b.kind,indices:b.count,vertices:b.vertexCount,triangles:b.count/3,drawCount:b.drawCount,submittedTriangles:b.visible&&b.vao?b.count/3*b.drawCount:0,visible:b.visible,resident:!!b.vao,maxDistance:b.maxDistance,minDistance:b.minDistance||0,radius:b.radius,instances:b.instances.map(i=>({p:i.p,s:i.s||null,yaw:i.yaw||0,pitch:i.pitch||0}))}]:[]);
   const conditions=()=>({camera:scene.p,aim:scene.aim,time,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,freeze:window.__freeze,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),aperture:renderer.photoAperture,near:renderer.photoNear,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volume:[renderer.volumeW,renderer.volumeH],viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,msaa:renderer.msaaSamples,floatColor:renderer.floatColor,clock:{day:oceanFeatures.state('expedition').day,minute:oceanFeatures.state('expedition').minute},catalogue:SPECIES.map(sp=>({id:sp.id,size:sp.size}))});
   const workload=()=>({draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,shellDraws:renderer.shellDraws||0,strata:strata(),stream:stream()});
   let fixed=null,work=null,batchRefs=null;const queries=new Set();
   const clean=()=>{const v=stream();if(document.hidden||!document.hasFocus()||g.isContextLost()||renderer.pendingResize||v.jobs||v.active||v.queued||v.missing.length||v.outside.length)throw Error('View is not foreground and canonically settled: '+JSON.stringify(v));};
   const unchanged=()=>{clean();if(JSON.stringify(conditions())!==fixed)throw Error('Optical/quality fixture changed');if(actorIdentity()!==actorBefore)throw Error('Real animal identity or pose changed');if(JSON.stringify(workload())!==work)throw Error('Controlled render workload changed');if(renderer.batches.length!==batchRefs.length||renderer.batches.some((b,i)=>b!==batchRefs[i]))throw Error('Batch identity changed');if(originalMethods.some(k=>Object.hasOwn(renderer,k)||renderer[k]!==Renderer.prototype[k]))throw Error('Production render method changed');};
   async function warm(){let stableAt=0,last='',completed=0,started=performance.now();while(completed<60||performance.now()-stableAt<550){await raf();const complete=render(),v=stream(),key=JSON.stringify([v.keep,v.resident]);if(complete&&!v.missing.length&&!v.outside.length&&!v.jobs&&!v.active&&!v.queued&&!renderer.pendingResize&&(!renderer.forceShadow||renderer.sunless)){if(key!==last){last=key;stableAt=performance.now();completed=0;}completed++;}else{stableAt=performance.now();completed=0;}if(performance.now()-started>60000)throw Error('Warm-up timeout: '+JSON.stringify(v));}
    clean();if(fixed===null){fixed=JSON.stringify(conditions());work=JSON.stringify(workload());batchRefs=renderer.batches.slice();}unchanged();const gl=g.getError();if(gl)throw Error('GL error warming: '+gl);return {completed,elapsedMs:performance.now()-started,conditions:JSON.parse(fixed),workload:JSON.parse(work)};
   }
   window.__trenchSurfaceHarness={
    warm,
    async sample(index){await raf();unchanged();const query=g.createQuery();if(!query)throw Error('GPU query allocation failed');queries.add(query);let opened=false;try{if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('GPU already disjoint before query');g.beginQuery(ext.TIME_ELAPSED_EXT,query);opened=true;const start=performance.now(),complete=render(),cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);opened=false;g.flush();if(!complete)throw Error('Timed render deferred');const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timed out');await raf();}const result={index,timeOriginMs:performance.timeOrigin,wallTimeMs:performance.now(),gpuMs:g.getQueryParameter(query,g.QUERY_RESULT)/1e6,cpuSubmitMs,disjoint:g.getParameter(ext.GPU_DISJOINT_EXT),gl:g.getError(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles};unchanged();return result;}finally{if(opened)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}},
    async capture(){if(phase!=='images')throw Error('Readback forbidden during timing phase');await raf();unchanged();if(!render())throw Error('Image render deferred');
     // Do not put an await between render and either readback. The default
     // framebuffer is allowed to clear at the next task boundary.
     const width=g.drawingBufferWidth,height=g.drawingBufferHeight,pixels=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,pixels);const png=renderer.canvas.toDataURL('image/png'),gl=g.getError();
     let maxRGB=0,nonzeroPixels=0;for(let i=0;i<pixels.length;i+=4){maxRGB=Math.max(maxRGB,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzeroPixels++;}
     const rgbaBase64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(new Blob([pixels]));});unchanged();return {width,height,png,rgbaBase64,rgbaSHA256:await digest(pixels),maxRGB,nonzeroPixels,gl};
    },
    async geometry(){if(phase!=='images')throw Error('GPU geometry readback forbidden during timing phase');unchanged();const saved=g.getParameter(g.COPY_READ_BUFFER_BINDING),buffers=new Map(),rows=[];try{for(const b of renderer.batches.filter(b=>b.sceneRole==='region:trench'||b.regionRole==='strata')){if(!b.vb||!b.eb)continue;const row={batch:renderer.batches.indexOf(b),indexCount:b.count,vertexCount:b.vertexCount};for(const [name,buffer]of [['vertices',b.vb],['indices',b.eb]]){if(!buffers.has(buffer)){g.bindBuffer(g.COPY_READ_BUFFER,buffer);const bytes=new Uint8Array(g.getBufferParameter(g.COPY_READ_BUFFER,g.BUFFER_SIZE));g.getBufferSubData(g.COPY_READ_BUFFER,0,bytes);buffers.set(buffer,{bytes:bytes.length,sha256:await digest(bytes)});}row[name]=buffers.get(buffer);}rows.push(row);}return {batches:rows,uniqueBuffers:buffers.size,gl:g.getError()};}finally{g.bindBuffer(g.COPY_READ_BUFFER,saved);}},
    finish(){unchanged();for(const q of queries)g.deleteQuery(q);queries.clear();return {gl:g.getError(),actorIdentityUnchanged:actorIdentity()===actorBefore,productionMethodsUnchanged:originalMethods.every(k=>!Object.hasOwn(renderer,k)),conditions:conditions(),workload:workload()};}
   };
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,timerExtension:!!ext,safety,shaderIdentity,sedimentUniformReflection:uniformReflection,solidIdentity,actorSHA256:await digest(actorBefore),actorCount:life.length,rendererSHA256:await digest(Renderer.toString()),sceneLoad:renderer.sceneLoad};
  },{scene,quality,time:fixedTime,phase,mode});
  assert.equal(row.meta.version,expectedVersion[mode]);assert.deepEqual(row.errors,[]);row.status='prepared';save();return session;
 }
 async function warm(session){await session.page.bringToFront();const warmed=await session.read(()=>__trenchSurfaceHarness.warm());await session.verifyResponses();session.row.warm=warmed;session.row.status='warmed';assert.equal(warmed.conditions.quality,device.quality);assert.equal(warmed.conditions.scale,1);save();return warmed;}
 function matched(a,b){assert.deepEqual(a.row.warm.conditions,b.row.warm.conditions,'Baseline/candidate must have identical optical/time/quality/content settings');assert.equal(a.row.meta.actorSHA256,b.row.meta.actorSHA256,'Terrain fixture must retain identical real animal identity and pose');}
 async function finish(session){await session.page.bringToFront();session.row.finished=await session.read(()=>__trenchSurfaceHarness.finish());await session.verifyResponses();assert.equal(session.row.finished.gl,0);assert.deepEqual(session.row.errors,[]);session.row.status='passed';save();}
 try{
  report.sourceIdentity.baseline=await sourcesAt('baseline');report.sourceIdentity.candidate=await sourcesAt('candidate');save();
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
  report.browserVersion=browser.version();
  if(!pixelsOnly)for(const scene of scenes){const pair={};try{
   for(const mode of ['baseline','candidate']){pair[mode]=await open(mode,scene,'timing');await warm(pair[mode]);}matched(pair.baseline,pair.candidate);
   for(const [block,mode]of order.entries()){
    const session=pair[mode];await session.page.bringToFront();const blockWarm=await warm(session);matched(pair.baseline,pair.candidate);const row={scene:scene.id,mode,block:block+1,blockWarm,samples:[],status:'running',workload:session.row.warm.workload};report.timingRuns.push(row);save();
    for(let i=0;i<samples;i++){await session.page.bringToFront();const sample=await session.read(index=>__trenchSurfaceHarness.sample(index),i);row.samples.push(sample);save();assert(!sample.disjoint&&!sample.gl&&Number.isFinite(sample.gpuMs)&&sample.gpuMs>0,'Invalid GPU sample retained in report');}
    row.gpu=stats(row.samples.map(s=>s.gpuMs));row.cpuSubmit=stats(row.samples.map(s=>s.cpuSubmitMs));row.status='passed';save();console.log(JSON.stringify({phase:'timing',scene:scene.id,mode,block:block+1,gpu:row.gpu,cpuSubmit:row.cpuSubmit}));
   }
   for(const mode of ['baseline','candidate'])await finish(pair[mode]);
  }finally{for(const mode of ['baseline','candidate'])await close(pair[mode]);}}
  report.allTimingFinished=true;save();
  for(const scene of scenes){const rows=report.timingRuns.filter(r=>r.scene===scene.id),a=stats(rows.filter(r=>r.mode==='baseline').flatMap(r=>r.samples.map(s=>s.gpuMs))),b=stats(rows.filter(r=>r.mode==='candidate').flatMap(r=>r.samples.map(s=>s.gpuMs)));if(a&&b)report.comparisons.push({scene:scene.id,gpu:{baseline:a,candidate:b,signedMedianMs:b.median-a.median,signedPercent:(b.median/a.median-1)*100},cpuSubmit:{baseline:stats(rows.filter(r=>r.mode==='baseline').flatMap(r=>r.samples.map(s=>s.cpuSubmitMs))),candidate:stats(rows.filter(r=>r.mode==='candidate').flatMap(r=>r.samples.map(s=>s.cpuSubmitMs)))}});}
  for(const original of timingOnly?[]:scenes)for(const scene of parallaxViews(original)){const pair={},captured={};try{
   for(const mode of ['baseline','candidate']){pair[mode]=await open(mode,scene,'images');await warm(pair[mode]);}matched(pair.baseline,pair.candidate);
   for(const mode of ['baseline','candidate']){const session=pair[mode];await session.page.bringToFront();const row={scene:scene.id,parent:original.id,lateral:scene.lateral,mode,images:[],workload:session.row.warm.workload,status:'running'};report.images.push(row);save();
    let reference=null;for(let repeat=0;repeat<2;repeat++){assert(report.allTimingFinished);await session.page.bringToFront();const capture=await session.read(()=>__trenchSurfaceHarness.capture()),rgba=Buffer.from(capture.rgbaBase64,'base64'),png=Buffer.from(capture.png.split(',')[1],'base64');delete capture.rgbaBase64;delete capture.png;assert.equal(sha(rgba),capture.rgbaSHA256);assert.equal(capture.gl,0);assert(capture.maxRGB>20&&capture.nonzeroPixels>200,'Expected meaningful lit terrain; a same-task capture is required');if(reference)assert(rgba.equals(reference),'Repeated frozen framebuffer differs');else{reference=rgba;captured[mode]=rgba;}capture.repeat=repeat;capture.path=path.join(path.dirname(output),path.basename(output,'.json')+'-'+scene.id+'-'+mode+'-'+repeat+'.png');capture.pngSHA256=sha(png);fs.writeFileSync(capture.path,png);row.images.push(capture);save();}
    row.geometry=await session.read(()=>__trenchSurfaceHarness.geometry());assert.equal(row.geometry.gl,0);await finish(session);row.status='passed';save();
   }
   const a=captured.baseline,b=captured.candidate;assert.equal(a.length,b.length);let changedPixels=0,changedChannels=0,maxChannelDifference=0,total=0;for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]-b[i+c]);if(d){changedChannels++;changed=true;}maxChannelDifference=Math.max(maxChannelDifference,d);total+=d;}if(changed)changedPixels++;}
   const difference={scene:scene.id,parent:original.id,lateral:scene.lateral,changedPixels,changedChannels,maxChannelDifference,meanAbsoluteChannelDifference:total/a.length,byteExact:changedChannels===0,unchangedControl:!!scene.unchangedControl};report.comparisons.push({pixels:difference});save();if(scene.unchangedControl)assert(difference.byteExact,'Unchanged reef pixels differ; retain evidence for investigation');
   console.log(JSON.stringify({phase:'images',...difference}));
  }finally{for(const mode of ['baseline','candidate'])await close(pair[mode]);}}
  for(const mode of ['baseline','candidate'])assert.deepEqual(await sourcesAt(mode),report.sourceIdentity[mode],'Served sources or manifest changed during experiment');
  assert.deepEqual(report.errors,[]);report.status=timingOnly?'passed-controlled-timing-only':'passed-controlled-checks-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack;report.errors.push(error.message);throw error;}
 finally{for(const session of [...live])try{await close(session);}catch(error){report.errors.push('Context cleanup: '+error.message);}if(browser)try{await browser.close();}catch(error){report.errors.push('Browser cleanup: '+error.message);}save();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'configuration-only-no-browser-or-GPU',baseCommit,expectedVersion,profile,pixelsOnly,timingOnly,orderName,fixtureVersion,fixtureSHA256,scenes,timingQueries:pixelsOnly?0:scenes.length*4*samples,imageViews:timingOnly?0:scenes.flatMap(parallaxViews).length,urls,output}));
else run().catch(error=>{console.error(error);process.exitCode=1;});
