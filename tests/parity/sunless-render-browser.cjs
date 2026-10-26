/* Controlled native-GPU comparison, not natural gameplay or a physical phone.
 * Default reference replaces the production FS/VOLUME_FS declaration
 * `uniform int uSunless;` with `const int uSunless=0;`. --uniform-reference
 * instead reuses the exact production programs and overrides only uSunless
 * through the formal set1i seam, isolating path selection from compilation.
 * All production passes,
 * VS arithmetic, eight surface variants, visibility, geometry and resolution
 * remain intact. This script must run alone in a scheduled native GPU window. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const url=option('url','http://127.0.0.1:8765/?still'),output=path.resolve(root,option('out','qa/parity/sunless-render-browser.json'));
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const requestedProfile=option('profile','both'),names=requestedProfile==='both'?['desktop','touch']:[requestedProfile],pixelsOnly=process.argv.includes('--pixels-only');
const uniformReference=process.argv.includes('--uniform-reference'),referenceMode=uniformReference?'uniform':'constant';
assert(names.every(n=>['desktop','touch'].includes(n)),'--profile must be desktop, touch or both');
const fixedTime=8,depths=[8,700,900,1400,4900,7000],views=[{lighting:'day',orientation:'horizontal'},{lighting:'late',orientation:'up'},{lighting:'blue',orientation:'horizontal'}];
const fixtures=depths.flatMap(depth=>views.map(v=>({id:'depth-'+depth+'-'+v.lighting+'-'+v.orientation,depth,...v,scene:'wall',lamp:true,time:fixedTime,timed:false})));
fixtures.push(
 {id:'boundary-before',depth:4899.999,lighting:'day',orientation:'horizontal',scene:'wall',lamp:true,time:fixedTime,timed:false},
 {id:'boundary-after',depth:4900.001,lighting:'day',orientation:'horizontal',scene:'wall',lamp:true,time:fixedTime,timed:false},
 {id:'frilled-shark-900',depth:900,lighting:'day',orientation:'subject',scene:'frilled',lamp:true,time:fixedTime,timed:false},
 {id:'hadal-reference-7000',depth:7000,lighting:'day',orientation:'study-point',scene:'hadal',lamp:true,time:fixedTime,timed:!pixelsOnly},
 {id:'hadal-up-max-exposure',depth:7000,lighting:'blue',orientation:'up',scene:'wall',lamp:true,time:fixedTime,exposure:1.11*2**1.5,timed:false}
);
assert(names.length*fixtures.length<=64,'Keep the representative matrix bounded');
const referenceMethods={constant:'The reference only changes the single uSunless uniform declaration to const 0 in FS and VOLUME_FS; generic, volume and all eight production surface variants are precompiled once. Swap only renderer.program, renderer.volumeProgram and renderer.surfacePrograms; production render/classification and other passes remain unchanged. This compares separately compiled programs and can include compilation differences.',uniform:'Reference and production share the exact same ten original production program objects, attached shader sources and surface Map. No reference shader is created or compiled. The formal renderer.set1i seam overrides only uSunless to 0 for reference frames, including both common and post-uniform calls; production frames forward the actual CPU classification unchanged. The route is latched afresh before every frame. Capture-frame WebGL uniform readback verifies the effective values outside timed queries. This isolates the branch switch in the same compiled code.'};
const report={url,expectedVersion,status:'running',pixelsOnly,referenceMode,uniformReference,profiles:[],errors:[],pixelFailures:[],expectedHardware:'Apple M3 Max',caseCount:names.length*fixtures.length,
 method:'Controlled visible native Chrome. Desktop 1440x900 DPR2 then emulated touch 390x844 DPR3 in separate browsers. CDP Runtime.evaluate always userGesture:false. Fresh default quality, scale 1, fixed time and actual unchanged terrain/animals. '+referenceMethods[referenceMode]+' Representative depth/light/orientation coverage, not a Cartesian sweep. Every fixture compares four full final RGBA images in reference/production/production/reference order. One actual 7000 m lit mud-terrace scene per profile uses ten warm frames and 25 full-render GPU queries per block. Raw samples retained; even-length median is the mean of the two middle values. No natural swimming, physical-phone, battery or gameplay FPS claim.',
 pixelAcceptance:{mode:'byte-exact',differentChannels:0,maxDifference:0,alphaDifferences:0,policy:'Collect every requested pixel case even after a mismatch. Save the complete lossless images and gzip-compressed raw bottom-up RGBA for every differing block. Never relax tolerance or discard differences.'}};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const median=values=>{const a=values.slice().sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null;};
const stem=output.endsWith('.json')?output.slice(0,-5):output;
function artifact(profile,fixture,label,base64,raw=false){
 const bytes=Buffer.from(raw?base64:base64.replace(/^data:image\/png;base64,/,''),'base64');
 if(!raw)assert(base64.startsWith('data:image/png;base64,'),'Expected original synchronous canvas PNG');
 const file=stem+'-'+profile+'-'+fixture+'-'+label+(raw?'.rgba.gz':'.png');
 fs.writeFileSync(file,raw?zlib.gzipSync(bytes):bytes);return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),uncompressedBytes:bytes.length,...(raw?{format:'RGBA8, bottom-up rows, width/height in pixels report, gzip'}:{})};
}
async function runProfile(name){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});let context,page;
 const touch=name==='touch',viewport=touch?{width:390,height:844}:{width:1440,height:900},dpr=touch?3:2,profile={name,viewport,dpr,physicalPhone:false,fixtures:[]};report.profiles.push(profile);save();
 try{
  context=await browser.newContext({viewport,deviceScaleFactor:dpr,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({profile:name,error:e.message}));page.on('crash',()=>report.errors.push({profile:name,error:'Renderer process crashed'}));page.on('console',m=>{if(m.type()==='error')report.errors.push({profile:name,error:m.text()});});
  const cdp=await context.newCDPSession(page),read=async(fn,arg)=>{const r=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);let ready=false;const deadline=Date.now()+120000;
  while(Date.now()<deadline){if(await read(()=>window.__ocean?.ready)){ready=true;break;}await page.waitForTimeout(50);}assert(ready,'Ocean boot timed out');await page.bringToFront();
  profile.meta=await read(async({pixelsOnly,time,uniformReference})=>{
   const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware)||(!pixelsOnly&&!ext))throw Error('Native GPU and timer extension are required');
   const initial={quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive};if(!initial.adaptive||initial.scale!==1)throw Error('Fresh default-quality context required');
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();t=time;updateLife(time);
   const original={program:renderer.program,volumeProgram:renderer.volumeProgram,surfacePrograms:renderer.surfacePrograms},fixedPrograms=new Map(['shadowProgram','waterProgram','pointProgram','rayProgram','postProgram','volumeFilterProgram','bubbleProgram','aaProgram','skyProgram'].map(k=>[k,renderer[k]]));
   const pairs=[[0,1],[0,2],[0,3],[1,6],[0,12],[0,16],[0,17],[11,0]],keys=pairs.map(([k,m])=>k+':'+m),declaration='uniform int uSunless;';
   if(original.surfacePrograms.size!==8||keys.some(k=>!original.surfacePrograms.has(k))||renderer.surfaceProgramFailures.size)throw Error('All eight production surface variants are required');
   const source=(p,type)=>{const shader=(g.getAttachedShaders(p.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!shader)throw Error('Attached shader unavailable');return g.getShaderSource(shader);};
   const checked=(p,vs,fs)=>{if(source(p,g.VERTEX_SHADER)!==vs||source(p,g.FRAGMENT_SHADER)!==fs)throw Error('Attached shader source differs from its declared production/reference source');};
   const forced=src=>{if(src.split(declaration).length!==2)throw Error('Expected exactly one uSunless declaration');return src.replace(declaration,'const int uSunless=0;');};
   const surfaceVS=(kind,material)=>kind===11&&material===0||kind===0&&[12,16,17].includes(material)?VS:surfaceShaderSource(VS,kind,material);
   const referenceFS=uniformReference?FS:forced(FS),referenceVolumeFS=uniformReference?VOLUME_FS:forced(VOLUME_FS),compiled=[];
   const compile=(v,f)=>{const p=renderer.makeProgram(v,f);compiled.push(p);checked(p,v,f);return p;};
   let referencePrograms;
   try{
    checked(original.program,VS,FS);checked(original.volumeProgram,POST_VS,VOLUME_FS);
    for(const [kind,material]of pairs)checked(original.surfacePrograms.get(kind+':'+material),surfaceVS(kind,material),surfaceShaderSource(FS,kind,material));
    if(uniformReference)referencePrograms=original;
    else{
     referencePrograms={program:compile(VS,referenceFS),volumeProgram:compile(POST_VS,referenceVolumeFS),surfacePrograms:new Map()};
     for(const [kind,material]of pairs)referencePrograms.surfacePrograms.set(kind+':'+material,compile(surfaceVS(kind,material),surfaceShaderSource(referenceFS,kind,material)));
    }
   }catch(error){for(const p of compiled)g.deleteProgram(p.p);throw error;}
   const allBatches=renderer.batches.slice(),visible=allBatches.map(b=>b.visible),actorPositions=life.map(f=>({f,p:f.p.slice(),s:f.s.slice(),yaw:f.yaw,pitch:f.pitch||0})),originalMakeProgram=renderer.makeProgram,originalSet1i=renderer.set1i;
   let lateCompiles=0;renderer.makeProgram=function(...args){lateCompiles++;return originalMakeProgram.apply(this,args);};
   const queries=new Set(),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));let fixture=null,production=false,reference=null,referencePNG=null,frameControl=null;
   const programLabels=new Map();for(const set of [original,referencePrograms]){programLabels.set(set.program,'generic');programLabels.set(set.volumeProgram,'volume');for(const [key,p]of set.surfacePrograms)programLabels.set(p,'surface:'+key);}
   renderer.set1i=function(p,name,value){
    if(name!=='uSunless')return originalSet1i.call(this,p,name,value);
    if(!frameControl)throw Error('uSunless write outside an explicitly latched fixture frame');
    const calculated=this.sunless?1:0;if(value!==calculated)throw Error('Formal uSunless write must match the current production classification');
    const forwarded=uniformReference&&!frameControl.production?0:value;
    const result=originalSet1i.call(this,p,name,forwarded);
    if(programLabels.has(p))frameControl.writes.set(p,{program:programLabels.get(p),requested:value,forwarded});return result;
   };
   const choose=enabled=>{production=enabled;const p=enabled?original:referencePrograms;renderer.program=p.program;renderer.volumeProgram=p.volumeProgram;renderer.surfacePrograms=p.surfacePrograms;};
   const render=()=>{
    // Reset before even a streaming retry: no previous block's route or
    // observed uniform writes can be reused as this frame's evidence.
    frameControl={production,writes:new Map()};const before=renderer.frame,result=renderer.render(fixture.view,fixture.target,fixture.time);if(result===false)return false;
    if(renderer.frame!==before+1)throw Error('Expected one full production renderer frame');if(!frameControl.writes.has(renderer.volumeProgram))throw Error('The volume pass did not write uSunless this frame');return true;
   };
   const controlReadback=()=>{
    const calculated=renderer.sunless?1:0,expected=frameControl.production?calculated:0;
    const writes=[...frameControl.writes].map(([p,write])=>{const location=renderer.uniform(p,'uSunless'),active=location!==null,actual=active?g.getUniform(p.p,location):null;
     // A const-reference program has no active uSunless location. In uniform
     // mode all active values must be genuinely read back as the chosen route.
     if(write.requested!==calculated)throw Error('Stale production classification at capture');
     if(uniformReference&&write.forwarded!==expected)throw Error('Stale uniform override at capture');
     if(active&&actual!==expected)throw Error('Actual WebGL uSunless differs from the requested route');
     return {...write,active,actual,effective:active?actual:!frameControl.production&&!uniformReference?0:null};
    });
    if(uniformReference&&!writes.some(w=>w.program==='volume'&&w.active&&w.actual===expected))throw Error('Uniform reference requires an active verified volume uniform');
    return {mode:uniformReference?'uniform':'constant',production:frameControl.production,cpuCalculated:calculated,expectedEffective:expected,mechanism:uniformReference?'same-program-set1i':frameControl.production?'production-uniform':'compiled-constant',writes};
   };
   const state=()=>({quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,camera:fixture.view.slice(),target:fixture.target.slice(),time:fixture.time,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,sun:renderer.sun,sunless:renderer.sunless,lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,staticShadowUpdates:renderer.staticShadowUpdates,adaptive:settings.adaptive,lateCompiles,
    drawn:allBatches.filter(b=>b.visible&&b.drawCount>0).map(b=>({index:allBatches.indexOf(b),kind:b.kind,material:b.material,species:b.species,instances:b.drawCount,triangles:b.count/3*b.drawCount,role:b.sceneRole||null})),
    batchReferencesUnchanged:renderer.batches.length===allBatches.length&&allBatches.every((b,i)=>renderer.batches[i]===b&&b.visible===visible[i]),actorsUnchanged:actorPositions.every(a=>a.f.p.every((n,k)=>n===a.p[k])&&a.f.s.every((n,k)=>n===a.s[k])&&a.f.yaw===a.yaw&&(a.f.pitch||0)===a.pitch),otherProgramsUnchanged:[...fixedPrograms].every(([k,p])=>renderer[k]===p),routeReferencesCorrect:Object.entries(production?original:referencePrograms).every(([k,p])=>renderer[k]===p)});
   const outside=()=>{const stream=renderer.sceneStream;if(!stream)return [];const keep=stream.neededRanges(fixture.view).keep;return stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id);};
   const clean=()=>{if(document.hidden||!document.hasFocus())throw Error('Controlled fixture lost focus');if(g.isContextLost()||renderer.pendingResize||renderer.sceneStream?.jobs.size||outside().length||renderer.forceShadow)throw Error('Fixed workload is not settled');};
   const cameraClear=p=>{const floor=OceanTrench.containsXZ(p[0],p[2])?OceanTrench.floorAt(p[0],p[2],p[1]+.12):groundHeight(p[0],p[2]);return p[1]<-.3&&p[1]>=floor+.13&&!OceanRegions.pointBlocked(p,.12);};
   function wallCamera(depth,orientation){
    // Find the actual rendered convex front face at this exact depth. Its
    // intersection with the horizontal plane is the subject; never invent a
    // wall or move a production mesh to make an otherwise black test pass.
    const y=-depth,candidates=[];
    for(const solid of OceanTrench.solids){if(!solid.id.startsWith('trench-wall-1-')||solid.min[1]>y||solid.max[1]<y)continue;
     for(let faceIndex=0;faceIndex<solid.faces.length;faceIndex++){const face=solid.faces[faceIndex],normal=solid.planes[faceIndex].slice(0,3);if(normal[0]>-.7)continue;const hits=[];
      for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length];if(Math.abs(a[1]-y)<1e-8)hits.push(a.slice());if((a[1]-y)*(b[1]-y)<0)hits.push(V.lerp(a,b,(y-a[1])/(b[1]-a[1])));}
      if(hits.length<2)continue;const aim=[0,1,2].map(k=>hits.reduce((n,p)=>n+p[k],0)/hits.length);aim[1]=y;
      const view=[aim[0]+normal[0]*5,y,aim[2]+normal[2]*5];if(!cameraClear(view))continue;
      const target=aim.slice();if(orientation==='up')target[1]+=3;
      candidates.push({view,target,evidence:{type:'actual-convex-wall',solid:solid.id,faceIndex,normal,intersection:aim,depth},score:Math.abs(aim[2]+110)});
     }
    }
    candidates.sort((a,b)=>a.score-b.score);if(!candidates.length)throw Error('No legal authored wall view at '+depth+' m');return candidates[0];
   }
   function camera(config){
    if(config.scene==='frilled'){
     const f=life.find(f=>SPECIES[f.species]?.id==='frilled_shark');if(!f)throw Error('Current frilled shark is required');const target=animalFocusPoint(f),trials=[];
     for(const angle of [0,Math.PI,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){const view=[target[0]+Math.sin(f.yaw+angle)*6,-config.depth,target[2]+Math.cos(f.yaw+angle)*6],clear=cameraClear(view)&&!blocked(view,target,.001)&&OceanRegions.pathClear(view,target,.001);trials.push({view,clear});if(clear)return {view,target,evidence:{type:'actual-frilled-shark',uid:f.uid,position:f.p.slice(),species:f.species,trials}};}
     throw Error('No unobstructed frilled camera: '+JSON.stringify(trials));
    }
    if(config.scene==='hadal'){const site=OceanTrench.studyPoint('hadal-reference');if(!site)throw Error('Actual hadal-reference study point missing');return {view:[779,-config.depth,-134],target:[site.p[0],site.p[1]+.55,site.p[2]],evidence:{type:'actual-hadal-study-point',id:site.id,p:site.p.slice()}};}
    if(config.depth===8){const view=[0,-8,12],target=config.orientation==='up'?[0,-2,2]:[0,-8,-10];return {view,target,evidence:{type:'original-reef',ground:groundHeight(view[0],view[2])}};}
    return wallCamera(config.depth,config.orientation);
   }
   const base64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);};
   const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   async function capture(){
    if(!render())throw Error('Cannot capture incomplete render');if(g.getParameter(g.FRAMEBUFFER_BINDING)!==null)throw Error('Production render did not present default framebuffer');
    const width=g.drawingBufferWidth,height=g.drawingBufferHeight,data=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,data);
    let differingChannels=0,differingPixels=0,alphaDifferences=0,maxDifference=0,minRGB=255,maxRGB=0,nonzeroPixels=0;const bounds=[width,height,-1,-1];let firstDifference=null;
    for(let i=0;i<data.length;i+=4){let changed=false;minRGB=Math.min(minRGB,data[i],data[i+1],data[i+2]);maxRGB=Math.max(maxRGB,data[i],data[i+1],data[i+2]);if(data[i]||data[i+1]||data[i+2])nonzeroPixels++;
     if(reference)for(let c=0;c<4;c++){const difference=Math.abs(data[i+c]-reference[i+c]);if(difference){changed=true;differingChannels++;if(c===3)alphaDifferences++;maxDifference=Math.max(maxDifference,difference);if(!firstDifference)firstDifference={x:(i/4)%width,y:Math.floor(i/4/width),channel:c,reference:reference[i+c],production:data[i+c]};}}
     if(changed){differingPixels++;const x=(i/4)%width,y=Math.floor(i/4/width);bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}
    }
    // Capture the PNG before the first await: preserveDrawingBuffer is false.
    const png=!reference||differingChannels?renderer.canvas.toDataURL('image/png'):null;
    const raw=differingChannels?{baseline:base64(reference),current:base64(data)}:null;
    const control=controlReadback();
    const pixels={width,height,channels:data.length,sha256:await sha(data),differingChannels,differingPixels,alphaDifferences,maxDifference,minRGB,maxRGB,range:maxRGB-minRGB,nonzeroPixels,bounds:differingPixels?bounds:null,firstDifference};return {data,pixels,png,raw,control};
   }
   window.__sunlessRender={
    async prepare(config){choose(false);const chosen=camera(config);if(!cameraClear(chosen.view))throw Error('Camera intersects actual terrain: '+JSON.stringify(chosen));fixture={...config,...chosen};renderer.lamp=config.lamp;renderer.lighting=config.lighting;renderer.exposure=config.exposure??1.11;reference=null;referencePNG=null;
     const started=performance.now();let stable=0;while(stable<3){if(performance.now()-started>60000)throw Error('Scene streaming did not settle');await raf();const complete=render();stable=complete&&!outside().length&&!renderer.sceneStream?.jobs.size&&!renderer.pendingResize&&!renderer.forceShadow?stable+1:0;}
     clean();const image=await capture();reference=image.data;referencePNG=image.png;const fixed=state();
     if(config.scene==='frilled'&&!fixed.drawn.some(b=>b.species===chosen.evidence.species&&b.kind===11&&b.instances>0))throw Error('Actual frilled shark is not drawn');
     if(config.depth>8&&!fixed.drawn.some(b=>b.kind===0&&[16,17].includes(b.material)))throw Error('Deep view must draw real trench terrain');
     return {id:config.id,depth:config.depth,lighting:config.lighting,orientation:config.orientation,scene:config.scene,timed:config.timed,cameraEvidence:chosen.evidence,baseline:fixed,baselineControl:image.control,baselinePixels:image.pixels,png:image.png,gl:g.getError()};
    },
    async block(enabled){choose(enabled);for(let i=0;i<(fixture.timed?10:2);i++){await raf();clean();if(!render())throw Error('Incomplete warm frame');}const samples=[];
     for(let i=0;i<(fixture.timed?25:0);i++){await raf();clean();const query=g.createQuery();queries.add(query);let begun=false;
      try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);begun=true;const start=performance.now();if(!render())throw Error('Incomplete timed frame');const cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);begun=false;g.flush();const until=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>until)throw Error('GPU query timeout');await raf();}if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU query');const gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6;if(!Number.isFinite(gpuMs)||gpuMs<=0)throw Error('Invalid GPU sample');samples.push({gpuMs,cpuSubmitMs});}
      finally{if(begun)g.endQuery(ext.TIME_ELAPSED_EXT);g.deleteQuery(query);queries.delete(query);}
     }
     const image=await capture();clean();return {production:enabled,samples,pixels:image.pixels,state:state(),control:image.control,gl:g.getError(),images:image.pixels.differingChannels?{baseline:referencePNG,current:image.png}:null,raw:image.raw};
    },
    restore(){Object.assign(renderer,original);renderer.makeProgram=originalMakeProgram;renderer.set1i=originalSet1i;frameControl=null;for(const q of queries)g.deleteQuery(q);queries.clear();for(const p of compiled)g.deleteProgram(p.p);reference=null;referencePNG=null;}
   };
   const textSHA=s=>sha(new TextEncoder().encode(s));return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,initial,sourceVerified:true,referenceMode:uniformReference?'uniform':'constant',sameProductionProgramObjects:referencePrograms===original,productionSurfaceKeys:keys,referenceCompiledPrograms:compiled.length,fragmentSHA256:await textSHA(FS),referenceFragmentSHA256:await textSHA(referenceFS),volumeSHA256:await textSHA(VOLUME_FS),referenceVolumeSHA256:await textSHA(referenceVolumeFS),vertexSHA256:await textSHA(VS),postVertexSHA256:await textSHA(POST_VS),fixedTime:time,sceneCompiled:renderer.sceneLoad?.compiled??null};
  },{pixelsOnly,time:fixedTime,uniformReference});
  assert.equal(profile.meta.version,expectedVersion);assert.match(profile.meta.hardware,/Apple M3 Max/i,'Use the original native hardware for this benchmark');assert.equal(profile.meta.initial.quality,touch?1:2);assert.equal(profile.meta.referenceCompiledPrograms,uniformReference?0:10);assert.equal(profile.meta.sameProductionProgramObjects,uniformReference);assert.equal(profile.meta.referenceMode,referenceMode);if(uniformReference){assert.equal(profile.meta.referenceFragmentSHA256,profile.meta.fragmentSHA256);assert.equal(profile.meta.referenceVolumeSHA256,profile.meta.volumeSHA256);}save();
  try{for(const config of fixtures){
   const entry=await read(config=>__sunlessRender.prepare(config),config),png=entry.png;delete entry.png;entry.blocks=[];profile.fixtures.push(entry);entry.image=artifact(name,config.id,'baseline-reference',png);save();
   assert.equal(entry.gl,0);assert.equal(entry.baseline.quality,profile.meta.initial.quality);assert.equal(entry.baseline.scale,1);assert.equal(entry.baseline.sunless,config.depth>=4900);assert.equal(entry.baseline.lateCompiles,0);assert.equal(entry.baselineControl.production,false);assert.equal(entry.baselineControl.expectedEffective,0);
   for(const invariant of ['batchReferencesUnchanged','actorsUnchanged','otherProgramsUnchanged','routeReferencesCorrect'])assert(entry.baseline[invariant],invariant);
   assert(entry.baselinePixels.range>20&&entry.baselinePixels.nonzeroPixels>100,'A meaningful nonblack rendered scene is required: '+config.id);
   for(const production of [false,true,true,false]){
    const block=await read(enabled=>__sunlessRender.block(enabled),production),images=block.images,raw=block.raw;delete block.images;delete block.raw;entry.blocks.push(block);const label='block-'+entry.blocks.length+'-'+(production?'production':'reference');
    if(images){block.images={};for(const [kind,data]of Object.entries(images))block.images[kind]=artifact(name,config.id,label+'-'+kind,data);}
    if(raw){block.raw={};for(const [kind,data]of Object.entries(raw))block.raw[kind]=artifact(name,config.id,label+'-'+kind,data,true);}
    block.medianGpuMs=median(block.samples.map(s=>s.gpuMs));save();assert.equal(block.gl,0);assert.deepEqual(block.state,entry.baseline,'Fixed scene conditions changed: '+config.id);assert.equal(block.control.mode,referenceMode);assert.equal(block.control.production,production);assert.equal(block.control.cpuCalculated,config.depth>=4900?1:0);assert.equal(block.control.expectedEffective,production&&config.depth>=4900?1:0);
    if(block.pixels.differingChannels||block.pixels.maxDifference||block.pixels.alphaDifferences||block.pixels.sha256!==entry.baselinePixels.sha256)report.pixelFailures.push({profile:name,fixture:config.id,block:entry.blocks.length,production,pixels:block.pixels,images:block.images,raw:block.raw});
    save();console.log(JSON.stringify({profile:name,fixture:config.id,referenceMode,production,sunless:block.state.sunless,effectiveSunless:block.control.expectedEffective,differingChannels:block.pixels.differingChannels,maxDifference:block.pixels.maxDifference,medianGpuMs:block.medianGpuMs}));
   }
   if(config.timed){const values=production=>entry.blocks.filter(b=>b.production===production).flatMap(b=>b.samples.map(s=>s.gpuMs));const reference=values(false),production=values(true);assert.equal(reference.length,50);assert.equal(production.length,50);entry.comparison={referenceMedianGpuMs:median(reference),productionMedianGpuMs:median(production),medianConvention:'Mean of the two middle sorted values for an even count',samplesPerRoute:50};entry.comparison.signedSavedGpuMs=entry.comparison.referenceMedianGpuMs-entry.comparison.productionMedianGpuMs;entry.comparison.reductionPercent=100*(1-entry.comparison.productionMedianGpuMs/entry.comparison.referenceMedianGpuMs);entry.comparison.note='100 complete-frame queries in one controlled real 7000 m lit scene. Raw samples and signed difference retained without noise clamp; not gameplay FPS or physical-mobile performance.';save();}
  }}finally{await read(()=>window.__sunlessRender?.restore()).catch(()=>{});}
 }catch(error){if(page&&!page.isClosed())try{await page.screenshot({path:stem+'-'+name+'-failure.png'});}catch(_){}throw error;}
 finally{await context?.close();await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-gpu-run',referenceMode,referenceMethod:referenceMethods[referenceMode],referenceCompiledPrograms:uniformReference?0:10,profiles:names,fixtures,pixelCases:names.length*fixtures.length,timedCases:pixelsOnly?0:names.length}));
else(async()=>{try{for(const name of names)await runProfile(name);assert.deepEqual(report.errors,[]);assert.deepEqual(report.pixelFailures,[],'Exact RGBA acceptance failed; every requested pixel case was collected');report.status='passed';}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{save();}})().catch(error=>{console.error(error);process.exitCode=1;});
