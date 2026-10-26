/* Same-context cost isolation of the pinned release and current water renderer.
 * Only production prototypes/programs are selected; no candidate shader is made.
 * Root schedules this native GPU runner. Author validation is syntax only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(root,option('out','/tmp/ocean-water-cost-isolation-'+Date.now()+'/report.json'));
const base='268dd3c4594a5465d05d9a642a1e09fc9e422fd4',baseline=cp.execFileSync('git',['show',base+':src/engine.js'],{cwd:root,encoding:'utf8'}),candidate=fs.readFileSync(path.join(root,'src/engine.js'),'utf8');
const requested=option('profile','touch'),profiles=[requested];
const scenes=option('scenes','reef,slope,hadal').split(','),modes=option('modes','allCurrent,spritesOnly,surfacesOnly').split(',');
assert(['touch','desktop'].includes(requested),'Run one --profile=touch or --profile=desktop per invocation; all timing must precede every image readback');
assert(scenes.length&&new Set(scenes).size===scenes.length&&scenes.every(s=>['reef','slope','hadal'].includes(s)),'--scenes must select unique reef,slope,hadal cases');
assert(modes.length&&new Set(modes).size===modes.length&&modes.every(m=>['allCurrent','spritesOnly','surfacesOnly'].includes(m)),'--modes must select unique allCurrent,spritesOnly,surfacesOnly modes');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const median=values=>{const a=values.slice().sort((x,y)=>x-y);assert(a.length);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
const stats=values=>({count:values.length,median:median(values),min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length});
const report={url,base,status:'running',sourceSHA256:{baseline:hash(baseline),candidate:hash(candidate)},profiles:[],errors:[],
 streamPreparation:{id:'canonical-loaded-keep',stableMilliseconds:550,description:'Preparation only: official sceneStream.request loads every current neededRanges.keep chunk. Normal render/stream update then naturally trims non-pinned residents outside keep. Complete keep/resident signatures must remain stable for at least 550 ms. Initial timing and image revisit use the identical policy; no direct residency/resource writes or timed-block extra requests. This deliberately preloaded workload is controlled rendering evidence, not natural streaming performance.'},
 modes:{baseline:'Old prototype + old generic/eight surface variants + old point/bubble/volume programs.',allCurrent:'Actual current prototype and actual current programs.',spritesOnly:'Current prototype/render/common and point/bubble programs + old generic/eight surface/volume programs. This isolates the prototype/routing/sprite bundle, not just fragment sprite cost.',surfacesOnly:'Old prototype/render/common and point/bubble programs + actual current generic/eight surface/volume programs. uSunless is explicitly reset to 0 because old common never writes this newly added uniform; this isolates new shader work with the old controller, including inactive dynamic-branch overhead.'},
 method:'One visible native Chrome context and the same renderer/GL/geometry/resources for every mode within each profile. Pinned production engine evaluated with Function only to recover its real class and shader strings. Baseline programs compiled once using the old real makeProgram/setupSurfacePrograms. Current actual prototype/programs are retained. Switching changes Object.setPrototypeOf plus five program slots and surfacePrograms, never shader text. Frozen formal time 8, original quality tier, scale 1, viewport/DPR/MSAA, actual reef/900m-frilled/7000m-study geometry and camera. Per scene and comparison: baseline/mode/mode/baseline, ten completed warm frames then 25 complete-render GPU queries per block. All raw samples and signed differences retained; even-count median averages the middle two values. Every timed block across all requested scenes finishes before any PNG/full RGBA readback; image capture then revisits the same controlled scenes in the same context and rechecks their full conditions. Outputs default to /tmp to avoid triggering workspace cloud image sync during timing. No gameplay FPS, natural UI, physical-phone or battery claim.'};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const imagePath=(profile,scene,mode)=>output.replace(/\.json$/,'')+'-'+profile+'-'+scene+'-'+mode+'.png';

async function runProfile(name){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 let context,page,read;const profile={name,scenes:[]};report.profiles.push(profile);save();
 try{
  const touch=name==='touch';context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push({profile:name,error:e.message}));page.on('crash',()=>report.errors.push({profile:name,error:'Renderer process crashed'}));
  await page.route('**/src/engine.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:candidate}));
  const cdp=await context.newCDPSession(page);
  read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await page.bringToFront();
  const readyDeadline=Date.now()+120000;while(!await read(()=>window.__ocean?.ready)){if(Date.now()>readyDeadline)throw Error('Ocean boot timeout');await page.waitForTimeout(50);}
  profile.meta=await read(async baselineSource=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'';
   if(!ext||!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Native hardware GPU and timer extension required');
   if(Object.getPrototypeOf(renderer)!==Renderer.prototype)throw Error('Unexpected renderer prototype');
   for(const method of ['render','common','updateBatch','drawBatch','renderBubbles','surfaceProgram'])if(Object.hasOwn(renderer,method))throw Error('Unexpected renderer method override: '+method);
   const current={Renderer,VS,FS,POINT_VS,POINT_FS,BUBBLE_VS,BUBBLE_FS,VOLUME_FS,POST_VS,POST_FS,AA_FS,WATER_VS,WATER_FS,SHADOW_FS,SKY_FS,VOLUME_FILTER_FS};
   const old=Function(baselineSource+'\n;return {Renderer,VS,FS,POINT_VS,POINT_FS,BUBBLE_VS,BUBBLE_FS,VOLUME_FS,POST_VS,POST_FS,AA_FS,WATER_VS,WATER_FS,SHADOW_FS,SKY_FS,VOLUME_FILTER_FS};')();
   for(const key of ['VS','POST_VS','POST_FS','AA_FS','WATER_VS','WATER_FS','SHADOW_FS','SKY_FS','VOLUME_FILTER_FS'])if(old[key]!==current[key])throw Error('Shared production shader changed; expand the isolation contract explicitly: '+key);
   const slots=['program','surfacePrograms','pointProgram','bubbleProgram','volumeProgram'],newPrograms=Object.fromEntries(slots.map(key=>[key,renderer[key]]));
   if(newPrograms.surfacePrograms?.size!==8||renderer.surfaceProgramFailures?.size)throw Error('Eight actual current surface variants must be available');
   const untouched=Object.fromEntries(['postProgram','aaProgram','waterProgram','skyProgram','shadowProgram','volumeFilterProgram'].map(key=>[key,renderer[key]]));
   const owned=[],compile=(vertex,fragment)=>{const p=old.Renderer.prototype.makeProgram.call(renderer,vertex,fragment);owned.push(p);return p;};
   const holder=Object.assign(Object.create(old.Renderer.prototype),{gl:g});
   holder.makeProgram=(vertex,fragment)=>compile(vertex,fragment);holder.setupSurfacePrograms();
   if(holder.surfacePrograms.size!==8||holder.surfaceProgramFailures.size)throw Error('Eight actual baseline surface variants must compile');
   const oldPrograms={program:compile(old.VS,old.FS),surfacePrograms:holder.surfacePrograms,pointProgram:compile(old.POINT_VS,old.POINT_FS),bubbleProgram:compile(old.BUBBLE_VS,old.BUBBLE_FS),volumeProgram:compile(old.POST_VS,old.VOLUME_FS)};
   const attached=(p,type)=>{const s=(g.getAttachedShaders(p.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!s)throw Error('Actual linked shader source unavailable');return g.getShaderSource(s);};
   for(const [program,vertex,fragment]of [['program','VS','FS'],['pointProgram','POINT_VS','POINT_FS'],['bubbleProgram','BUBBLE_VS','BUBBLE_FS'],['volumeProgram','POST_VS','VOLUME_FS']])for(const [set,src]of [[oldPrograms,old],[newPrograms,current]])if(attached(set[program],g.VERTEX_SHADER)!==src[vertex]||attached(set[program],g.FRAGMENT_SHADER)!==src[fragment])throw Error('Linked source differs from actual production '+program);
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,freeze:window.__freeze,third:settings.third,active};
   if(!initial.adaptive||initial.scale!==1)throw Error('Fresh automatic full-scale initial state required');
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();
   const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),queries=new Set();
   let fixture=null,selected=null,baselinePixels=null,restored=false;
   const newSurfacePrograms=[newPrograms.program,...newPrograms.surfacePrograms.values(),newPrograms.volumeProgram];
   function select(mode){
    const modern=mode==='allCurrent'||mode==='spritesOnly';Object.setPrototypeOf(renderer,modern?current.Renderer.prototype:old.Renderer.prototype);
    const surfaces=mode==='allCurrent'||mode==='surfacesOnly'?newPrograms:oldPrograms,sprites=modern?newPrograms:oldPrograms;
    renderer.program=surfaces.program;renderer.surfacePrograms=surfaces.surfacePrograms;renderer.volumeProgram=surfaces.volumeProgram;
    renderer.pointProgram=sprites.pointProgram;renderer.bubbleProgram=sprites.bubbleProgram;
    // Old common never writes the new uniform. Clear it before every block so
    // surfacesOnly cannot inherit the previous hadal allCurrent fast path.
    for(const p of newSurfacePrograms){const location=g.getUniformLocation(p.p,'uSunless');if(location!==null){g.useProgram(p.p);g.uniform1i(location,0);}}
    if(!modern)renderer.sunless=false;
    renderer._shadowKey=null;renderer.forceShadow=true;selected=mode;
   }
   const render=()=>{const before=renderer.frame,result=renderer.render(fixture.camera,fixture.aim,8);if(result===false)return false;if(renderer.frame!==before+1)throw Error('Expected one completed production render');return true;};
   const streamState=()=>{
    const s=renderer.sceneStream;if(!s)return {keep:[],resident:[],outsideKeep:[],missingKeep:[],pinned:[],pendingChunks:[],active:0,queued:0};
    const keep=s.neededRanges(fixture.camera).keep;
    return {keep:[...keep].sort((a,b)=>a-b),resident:s.meshes.filter(m=>m.resident).map(m=>m.id),
     outsideKeep:s.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id),
     missingKeep:[...keep].filter(id=>!s.meshes[id].resident).sort((a,b)=>a-b),pinned:s.meshes.filter(m=>m.pinned).map(m=>m.id),
     pendingChunks:[...s.jobs.keys()].sort((a,b)=>a-b),active:s.active,queued:s.queue.length};
   };
   const preloadKeep=async()=>{
    const s=renderer.sceneStream,before=streamState(),chunkIDs=s?[...new Set(before.missingKeep.map(id=>s.meshes[id].meta.chunk))].sort((a,b)=>a-b):[];
    const record={policy:'canonical-loaded-keep',keepIDs:before.keep.slice(),keepCount:before.keep.length,missingMeshIDs:before.missingKeep.slice(),
     residentBefore:before.resident.slice(),pinnedIDs:before.pinned.slice(),requestCount:chunkIDs.length,
     requests:chunkIDs.map(id=>({chunkID:id,alreadyPending:s.jobs.has(id),url:s.index.chunks[id].url,bytes:s.index.chunks[id].bytes,meshIDs:s.chunkMeshes[id].map(m=>m.id)}))};
    window.__waterCostIsolation.lastPreparation={id:fixture.id,camera:fixture.camera.slice(),aim:fixture.aim.slice(),phase:'loading-keep',canonical:record};
    // Keep is intentionally wider than preload. A boot-resident mesh can stay
    // in that hysteresis band forever, yet be absent after a long excursion.
    // Request its original chunk through the actual loader; do not mutate
    // resident flags, delete mesh 307, force trim, or weaken state comparison.
    if(s)await Promise.all(chunkIDs.map(id=>s.request(id,1)));
    record.afterRequests=streamState();window.__waterCostIsolation.lastPreparation.phase='settling';return record;
   };
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Controlled page lost focus');if(g.isContextLost()||renderer.pendingResize||renderer.sceneStream?.jobs.size||renderer.forceShadow)throw Error('Workload did not settle');};
   const conditions=()=>({camera:fixture.camera.slice(),aim:fixture.aim.slice(),time:8,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
    quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,
    lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,
    lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),sun:renderer.sun,adaptive:settings.adaptive,freeze:window.__freeze,
    triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,batchCount:renderer.batches.length,bubbles:renderer.bubbles.map(b=>({p:b.p.slice(),r:b.r,a:b.a,phase:b.phase})),
    animalPoses:life.map(f=>({uid:f.uid,p:f.p.slice(),yaw:f.yaw,pitch:f.pitch||0,s:f.s.slice()})),residentMeshes:renderer.sceneStream?.meshes.filter(m=>m.resident).map(m=>m.id)||[]});
   const resourceKeys=['sceneFBO','sceneColor','sceneDepth','msaaFBO','volumeFBO','volumeFilteredFBO','aaFBO','aaColor','particleVAO','bubbleVAO','bubbleBuffer'];
   const mark=()=>{fixture.conditions=conditions();fixture.batches=renderer.batches.slice();fixture.visibility=renderer.batches.map(b=>b.visible);fixture.meshes=renderer.batches.map(b=>[b.vao,b.vb,b.eb,b.ib,b.count,b.vertexCount]);fixture.resources=Object.fromEntries(resourceKeys.map(key=>[key,renderer[key]]));};
   const unchanged=()=>{
    if(!same(conditions(),fixture.conditions))throw Error('Fixed camera/content/quality conditions changed');
    if(renderer.batches.some((b,i)=>b!==fixture.batches[i]||b.visible!==fixture.visibility[i]||[b.vao,b.vb,b.eb,b.ib,b.count,b.vertexCount].some((value,k)=>value!==fixture.meshes[i][k])))throw Error('Batch/geometry identity or visibility changed');
    for(const [key,value]of Object.entries(fixture.resources))if(renderer[key]!==value)throw Error('Render resource replaced: '+key);
    for(const [key,value]of Object.entries(untouched))if(renderer[key]!==value)throw Error('Untouched program changed: '+key);
   };
   const warm=async(count=10,settle=false)=>{
    let complete=0,total=0,stableSince=null,signature=null,stableMs=0,last=null;const begin=performance.now();
    while(complete<count||(settle&&stableMs<550)){
     await raf();total++;const rendered=render(),now=performance.now();
     if(settle){last=streamState();const next=JSON.stringify({keep:last.keep,resident:last.resident,pinned:last.pinned});
      const quiet=rendered&&!renderer.pendingResize&&!renderer.forceShadow&&!last.pendingChunks.length&&!last.active&&!last.queued&&!last.outsideKeep.length&&!last.missingKeep.length;
      if(quiet){if(signature!==next||stableSince===null){signature=next;stableSince=now;complete=0;}stableMs=now-stableSince;complete++;}
      else{stableSince=null;signature=null;stableMs=0;complete=0;}
      window.__waterCostIsolation.lastPreparation.stream=last;window.__waterCostIsolation.lastPreparation.stableMs=stableMs;
     }else if(rendered&&!renderer.pendingResize&&!renderer.sceneStream?.jobs.size)complete++;else complete=0;
     if(now-begin>60000)throw Error('Warm/stream settle exceeded 60 seconds: '+JSON.stringify(last));
    }
    clean();return {completed:complete,total,elapsedMs:performance.now()-begin,...(settle?{stableMs,requiredStableMs:550,stream:last}:{})};
   };
   const state=()=>({mode:selected,solarCulled:renderer.sunless??false,draws:renderer.drawCalls,shadowDraws:renderer.shadowDraws,
    sunlessUniforms:newSurfacePrograms.map((p,i)=>{const location=g.getUniformLocation(p.p,'uSunless');return {program:i,value:location===null?null:g.getUniform(p.p,location)};}),gl:g.getError()});
   window.__waterCostIsolation={
    async prepare(id){
     select('allCurrent');let camera,aim;
     if(id==='reef'){camera=[0,-8,7];aim=[0,-8,-10];}
     else if(id==='slope'){
      // Establish the formal pose at time 8 even when this scene is requested alone.
      await __prepareView([0,-8,7],[0,-8,-10],8);const f=life.find(f=>f.uid==='frilled_shark-001');if(!f)throw Error('Actual frilled actor missing');
      aim=animalFocusPoint(f);const n=[Math.sin(f.yaw),0,Math.cos(f.yaw)],range=SPECIES[f.species].size*2.8;
      camera=[1,-1].map(sign=>V.add(aim,V.mul(n,range*sign))).find(p=>!blocked(p,aim,.12)&&OceanRegions.pathClear(p,aim,.12));
      if(!camera)throw Error('Actual 900m side camera is obstructed');
     }else{const p=OceanTrench.studyPoint('hadal-reference').p;camera=V.add(p,[0,1.4,2.6]);aim=V.add(p,[0,.55,0]);}
     await __prepareView(camera,aim,8);renderer.lamp=true;renderer.lighting='day';renderer.exposure=1.11;renderer.clarity=1;
     const forward=V.norm(V.sub(aim,camera)),right=V.norm(V.cross(forward,[0,1,0]));
     renderer.bubbles=[.20,.40].map((side,i)=>({p:V.add(camera,V.add(V.mul(forward,1.4+i*.6),V.mul(right,side))),r:.024+i*.006,a:0,phase:i}));renderer.bubbleTime=8;renderer.lastBubbleTime=8;
     fixture={id,camera,aim};baselinePixels=null;select('baseline');const canonical=await preloadKeep(),warmed=await warm(10,true);warmed.canonical=canonical;mark();
     window.__waterCostIsolation.lastPreparation.phase='ready';
     return {id,warmed,conditions:fixture.conditions,state:state()};
    },
    async block(mode){
     select(mode);const warmed=await warm();unchanged();const before=state();if(before.gl)throw Error('GL error before block '+before.gl);
     if(mode==='surfacesOnly'&&before.sunlessUniforms.some(item=>item.value!==null&&item.value!==0))throw Error('surfacesOnly inherited a current sunless value');
     const samples=[],record={mode,warmed,before,samples};window.__waterCostIsolation.lastBlock=record;
     for(let index=0;index<25;index++){
      await raf();clean();const query=g.createQuery();if(!query)throw Error('GPU query allocation failed');queries.add(query);let open=false;
      try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);open=true;const begin=performance.now(),completed=render(),cpuSubmitMs=performance.now()-begin;g.endQuery(ext.TIME_ELAPSED_EXT);open=false;g.flush();if(!completed)throw Error('Incomplete timed render');
       const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}
       const disjoint=g.getParameter(ext.GPU_DISJOINT_EXT),gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6,error=g.getError();
       samples.push({index,gpuMs,cpuSubmitMs,disjoint,gl:error});if(disjoint||error||!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid GPU sample: '+JSON.stringify(samples.at(-1)));
      }finally{if(open)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}
     }
     clean();unchanged();record.after=state();return record;
    },
    async capture(mode){
     select(mode);await warm(3);unchanged();if(!render())throw Error('Incomplete image render');
     const width=g.drawingBufferWidth,height=g.drawingBufferHeight,pixels=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,pixels);
     // Save PNG before awaiting digest: preserveDrawingBuffer is false.
     const png=renderer.canvas.toDataURL('image/png');let min=255,max=0,nonzero=0,differingChannels=0,maxDifference=0,absoluteDifference=0;
     for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i],pixels[i+1],pixels[i+2]);max=Math.max(max,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzero++;}
     if(mode==='baseline')baselinePixels=pixels.slice();if(!baselinePixels)throw Error('Capture baseline first');
     for(let i=0;i<pixels.length;i++){const d=Math.abs(pixels[i]-baselinePixels[i]);if(d)differingChannels++;maxDifference=Math.max(maxDifference,d);absoluteDifference+=d;}
     const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),v=>v.toString(16).padStart(2,'0')).join('');
     return {mode,width,height,minRGB:min,maxRGB:max,nonzeroPixels:nonzero,rgbaSHA256:sha256,differingChannels,maxDifference,meanAbsoluteDifference:absoluteDifference/pixels.length,state:state(),png};
    },
    restore(){
     if(restored)return {restored:true,alreadyRestored:true,deletedPrograms:0};restored=true;
     Object.setPrototypeOf(renderer,current.Renderer.prototype);Object.assign(renderer,newPrograms);renderer.forceShadow=true;
     for(const query of queries)g.deleteQuery(query);queries.clear();for(const program of owned)g.deleteProgram(program.p);
     settings.adaptive=initial.adaptive;settings.third=initial.third;window.__freeze=initial.freeze;active=initial.active;
     return {restored:true,deletedPrograms:owned.length};
    }
   };
   return {hardware,version:document.documentElement.dataset.version,initial,baselinePrograms:owned.length,baselineSurfaceKeys:[...oldPrograms.surfacePrograms.keys()],currentSurfaceKeys:[...newPrograms.surfacePrograms.keys()],sharedShaderEquality:true};
  },baseline);
  assert.equal(profile.meta.initial.quality,touch?1:2);assert.equal(profile.meta.baselinePrograms,12);save();
  for(const sceneID of scenes){
   const prepared=await read(id=>__waterCostIsolation.prepare(id),sceneID),scene={...prepared,pairs:[],images:[]};profile.scenes.push(scene);save();
   assert.equal(scene.conditions.scale,1);assert.equal(scene.conditions.quality,profile.meta.initial.quality);assert.equal(scene.conditions.adaptive,false);assert.equal(scene.conditions.freeze,true);
   for(const mode of modes){const pair={mode,blocks:[]};scene.pairs.push(pair);save();
    for(const selected of ['baseline',mode,mode,'baseline']){const block=await read(mode=>__waterCostIsolation.block(mode),selected);pair.blocks.push(block);block.gpu=stats(block.samples.map(s=>s.gpuMs));block.cpuSubmit=stats(block.samples.map(s=>s.cpuSubmitMs));save();console.log(JSON.stringify({profile:name,scene:sceneID,pair:mode,block:pair.blocks.length,mode:selected,medianGpuMs:block.gpu.median,solarCulled:block.after.solarCulled}));}
    const a=pair.blocks.filter(b=>b.mode==='baseline').flatMap(b=>b.samples.map(s=>s.gpuMs)),b=pair.blocks.filter(b=>b.mode===mode).flatMap(b=>b.samples.map(s=>s.gpuMs));
    pair.comparison={baseline:stats(a),candidate:stats(b),signedGpuChangeMs:median(b)-median(a),changePercent:(median(b)/median(a)-1)*100};save();
   }
  }
  // Never put a screenshot, readPixels or PNG encode between timed scenes.
  // Revisit only after all GPU sample collection has finished in this context.
  profile.allTimingFinished=true;save();
  for(const scene of profile.scenes){const sceneID=scene.id,prepared=await read(id=>__waterCostIsolation.prepare(id),sceneID);
   assert.deepEqual(prepared.conditions,scene.conditions,'Image revisit must retain the timed camera, geometry, actor poses and quality');scene.imagePreparation=prepared.warmed;
   for(const mode of ['baseline',...modes]){const capture=await read(mode=>__waterCostIsolation.capture(mode),mode),png=Buffer.from(capture.png.split(',')[1],'base64');delete capture.png;
    capture.image={path:imagePath(name,sceneID,mode),pngSHA256:hash(png),bytes:png.length};fs.writeFileSync(capture.image.path,png);scene.images.push(capture);save();
    assert.equal(capture.state.gl,0);assert(capture.maxRGB>20&&capture.nonzeroPixels>200,'Meaningful nonblack lit image required');
   }
  }
  profile.restored=await read(()=>__waterCostIsolation.restore());save();
 }catch(error){if(read){profile.partialBlock=await read(()=>window.__waterCostIsolation?.lastBlock||null).catch(()=>null);profile.partialPreparation=await read(()=>window.__waterCostIsolation?.lastPreparation||null).catch(()=>null);await read(()=>window.__waterCostIsolation?.restore()).catch(()=>{});}if(page&&!page.isClosed())await page.screenshot({path:output.replace(/\.json$/,'')+'-'+name+'-failure.png'}).catch(()=>{});throw error;}
 finally{await context?.close();await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-gpu-run',profiles,scenes,modes,queriesPerProfile:scenes.length*modes.length*4*25,sourceSHA256:report.sourceSHA256}));
else(async()=>{try{for(const profile of profiles)await runProfile(profile);assert.deepEqual(report.errors,[]);report.status='passed';}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{save();}})().catch(error=>{console.error(error);process.exitCode=1;});
