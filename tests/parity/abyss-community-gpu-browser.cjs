/* Controlled native GPU ABBA cost fixture, separate from natural UI acceptance.
 * Fixed camera/time/quality/resolution, real deep-sea actor left at its authored
 * position. Only its two new instance batches are toggled during measurement.
 * No old content, shading tier, render scale or render frequency is reduced.
 * Root owns GPU scheduling. Author-side verification is syntax only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const speciesID=option('species','tripod_fish');assert(['tripod_fish','dumbo_octopus'].includes(speciesID));
const url=option('url','http://127.0.0.1:8765/?still'),output=path.resolve(root,option('out','qa/parity/v01834-community/gpu-'+speciesID+'.json'));
const lowLOD=process.argv.includes('--low-lod'),pixelsOnly=process.argv.includes('--pixels-only');
const requestedTime=option('time',null),sampleTime=requestedTime===null?null:Number(requestedTime);
assert(sampleTime===null||Number.isFinite(sampleTime)&&sampleTime>=0&&sampleTime<=3600,'--time must be 0..3600 seconds');
const headless=process.argv.includes('--headless');
const requested=option('profile','both'),names=requested==='both'?['desktop','touch']:[requested];
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
assert(names.every(n=>['desktop','touch'].includes(n)),'--profile must be desktop, touch or both');
const result={url,expectedVersion,speciesID,pixelsOnly,status:'running',profiles:[],errors:[],method:'Controlled native Chrome GPU ABBA. Each block has ten completed warm renders, followed by 25 complete-render EXT_disjoint_timer_query_webgl2 samples. Actual approximately 2400 / 3600 m deep-sea animal position, lamp=true from before warm-up, and the original default quality tier are retained; render scale is 1. Only the new high/low instance batches change visibility between blocks. Camera, formal sampled time, old batch visibility, viewport, DPR, MSAA, lamp, lighting, exposure, clarity and fog remain fixed. A synchronous animal-center readback must be visibly differentiated before any timing. Adaptive quality is disabled only inside this controlled fixture. No natural exploration, native-phone, gameplay FPS or pixel-equivalence claim.'};
if(lowLOD)result.method='Controlled low-LOD anatomy fixture only, no GPU timing. The actual actor is raised to 6 m depth over its existing deep-water x/z coordinate; a 8 m camera and diagnostic 3 degree lens select the production far batch and resolve its original geometry. This is an explicit open-water studio, not the natural deep-sea habitat, observation, performance or physical-phone evidence.';
if(sampleTime!==null)result.method+=' Explicit sampled time '+sampleTime+' seconds applies the production subject pose before camera placement; other initial actors remain in their loaded poses.';
if(pixelsOnly)result.method+=' Explicit --pixels-only disables every timer block; captures are visual diagnostics only.';
result.method+=' Body diagnostics project tag-1 triangles from the selected production faunaGeometry LOD at the actual rigid body pose, conservatively exclude nonbody anatomy including its animation envelope, and intersect that mask with a synchronous actor-on/off image difference. Display-RGB luma statistics describe those pixels only; no scientific reflectance or quality threshold is inferred. The original center patch can include the seabed and is not body-readability proof.';
const median=values=>{const a=values.slice().sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
const stats=values=>{const a=values.slice().sort((a,b)=>a-b);return {count:a.length,min:a[0],p50:median(a),p95:a[Math.min(a.length-1,Math.floor(a.length*.95))],max:a.at(-1),mean:a.reduce((s,v)=>s+v,0)/a.length};};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));};
result.presentation=headless?'headless native Chrome':'visible native Chrome';
(async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 let context,page;
 try{for(const name of names){
  const touch=name==='touch';context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>result.errors.push({profile:name,error:e.message}));page.on('crash',()=>result.errors.push({profile:name,error:'Renderer process crashed'}));page.on('console',m=>{if(m.type()==='error')result.errors.push({profile:name,error:m.text()});});
  const cdp=await context.newCDPSession(page);
  const read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const wait=async(fn,arg,timeout=30000)=>{const until=Date.now()+timeout;while(Date.now()<until){const value=await read(fn,arg);if(value)return value;await page.waitForTimeout(40);}throw Error('Timed out: '+fn.toString());};
  await page.goto(url);await wait(()=>window.__ocean?.ready,undefined,120000);await page.bringToFront();
  const profile={name,blocks:[],images:[]};result.profiles.push(profile);save();
  profile.meta=await read(({lowLOD,speciesID,sampleTime})=>{
   const fish=life.find(f=>f.uid===speciesID+'-001');if(!fish)throw Error('Actual new deep-sea animal missing');
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples};
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();renderer.lamp=true;
   const formalTime=sampleTime===null?t:sampleTime;if(sampleTime!==null)faunaMotionPose(fish,formalTime);
   const originalHabitatPosition=fish.p.slice();if(lowLOD){fish.p[1]=-6;renderer.photoFov=3;renderer.lamp=true;}
   const center=animalFocusPoint(fish);if(speciesID==='tripod_fish'&&!lowLOD)center[1]+=.075;const range=lowLOD?8:1;
   const encounter=AbyssCommunity.encounters.find(e=>e.species===speciesID);
   if(!encounter)throw Error('Actual authored encounter gate is required');
   const normal=speciesID==='dumbo_octopus'?V.norm([encounter.gate[0]-fish.home[0],0,encounter.gate[2]-fish.home[2]]):[Math.sin(fish.yaw),0,Math.cos(fish.yaw)];
   const candidates=(speciesID==='dumbo_octopus'?[1]:[1,-1]).map(sign=>V.add(V.add(center,V.mul(normal,range*sign)),[0,lowLOD?0:speciesID==='tripod_fish'?.65:.15,0])).filter(p=>p[1]>groundHeight(p[0],p[2])+.5&&!OceanRegions.pointBlocked(p,.4)&&!blocked(p,center,.001)&&OceanRegions.pathClear(p,center,.001));
   if(!candidates.length)throw Error('No actual unobstructed habitat diagnostic view');const view=candidates[0];
   const gl=renderer.gl,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
   const batches=renderer.batches.filter(b=>b.species===fish.species&&b.sceneRole==='abyss-community');
   if(batches.length!==2||!ext)throw Error('Two actual LOD batches and GPU timer extension are required');
   const others=renderer.batches.filter(b=>!batches.includes(b));
   window.__abyssCommunityGPU={fish,center,view,batches,others,otherVisible:others.map(b=>b.visible),ext,time:formalTime,query:null,initial};
   return {version:document.documentElement.dataset.version,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,initial,originalHabitatPosition,studio:lowLOD,diagnosticFov:renderer.photoFov||null,uid:fish.uid,index:fish.species,position:fish.p.slice(),home:fish.home.slice(),scaleMetres:fish.s.slice(),modelBounds:SPECIES[fish.species].modelBounds,range,viewpointBasis:speciesID==='dumbo_octopus'?'horizontal direction from authored encounter gate toward animal':'anatomical side view',authoredGate:encounter.gate.slice(),camera:view.slice(),target:center.slice(),time:formalTime,oldBatches:others.length,newBatches:batches.map(b=>({indices:b.count,vertices:b.vertexCount,role:b.sceneRole,near:b.minDistance||0,far:b.maxDistance??null,kind:b.kind}))};
  },{lowLOD,speciesID,sampleTime});
  assert(profile.meta.renderer&&!/swiftshader|llvmpipe|software/i.test(profile.meta.renderer),'Native hardware renderer is required');
  assert.equal(profile.meta.version,expectedVersion);assert.equal(profile.meta.index,speciesID==='tripod_fish'?44:45);assert.equal(profile.meta.initial.scale,1,'Fresh default full scale is required');assert.equal(profile.meta.initial.adaptive,true);
  assert(Math.abs(profile.meta.home[1]+(speciesID==='tripod_fish'?2402:3598.7))<.001);assert(profile.meta.scaleMetres.every(n=>n===(speciesID==='tripod_fish'?.25:.20)));
  const conditions=()=>read(()=>{const d=__abyssCommunityGPU,others=renderer.batches.filter(b=>!d.batches.includes(b));return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,camera:d.view.slice(),target:d.center.slice(),time:d.time,position:d.fish.p.slice(),yaw:d.fish.yaw,pitch:d.fish.pitch||0,actorScale:d.fish.s.slice(),lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),sun:renderer.sun,oldBatchCount:others.length,oldVisibilityUnchanged:d.others.every((b,i)=>b.visible===d.otherVisible[i]),allOtherBatchReferencesUnchanged:others.length===d.others.length&&others.every((b,i)=>b===d.others[i]),adaptive:settings.adaptive};});
  const warm=async(enabled)=>read(enabled=>new Promise((resolve,reject)=>{
   const d=__abyssCommunityGPU;for(const b of d.batches)b.visible=enabled;let count=0;const start=performance.now();
   function frame(){try{const rendered=renderer.render(d.view,d.center,d.time);if(rendered!==false)count++;if(count>=10)return resolve({count,seconds:(performance.now()-start)/1000});if(performance.now()-start>45000)return reject(Error('Fixed-scene streaming warm-up exceeded 45 seconds'));requestAnimationFrame(frame);}catch(error){reject(error);}}requestAnimationFrame(frame);
  }),enabled);
  await warm(false);profile.fixed=await conditions();
  assert.equal(profile.fixed.quality,profile.meta.initial.quality,'Do not lower the original quality tier');assert.equal(profile.fixed.scale,1);
  assert.equal(profile.fixed.lamp,true,'The real deep habitat must be illuminated before measuring');
  assert(profile.fixed.oldVisibilityUnchanged&&profile.fixed.allOtherBatchReferencesUnchanged,'Warming cannot hide or replace old batches');
  await warm(true);
  profile.readability=await read(()=>{const d=__abyssCommunityGPU,g=renderer.gl;if(renderer.render(d.view,d.center,d.time)===false)throw Error('Incomplete readability frame');const bytes=new Uint8Array(32*32*4);g.readPixels(Math.floor(g.drawingBufferWidth/2)-16,Math.floor(g.drawingBufferHeight/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,bytes);let min=255,max=0,nonzero=0;for(let i=0;i<bytes.length;i+=4){min=Math.min(min,bytes[i],bytes[i+1],bytes[i+2]);max=Math.max(max,bytes[i],bytes[i+1],bytes[i+2]);if(bytes[i]||bytes[i+1]||bytes[i+2])nonzero++;}return {region:'32 x 32 pixels at the aimed center; may include seabed/background, not body-only proof',minRGB:min,maxRGB:max,range:max-min,nonzeroPixels:nonzero,gl:g.getError(),lamp:renderer.lamp,drawn:d.batches.map(b=>b.drawCount)};});
  assert.equal(profile.readability.gl,0);assert(profile.readability.maxRGB>20&&profile.readability.range>4&&profile.readability.nonzeroPixels>32,'A lit, nonblack, visibly differentiated animal-center region is required before timing');
  assert.deepEqual(await conditions(),profile.fixed,'Readability capture cannot change the fixed conditions');
  profile.bodyReadability=await read(()=>{
   const d=__abyssCommunityGPU,g=renderer.gl,fish=d.fish,sp=SPECIES[fish.species],low=d.batches[0].drawCount===0;
   const geometry=faunaGeometry(sp,low),vertices=geometry.v,origin=renderer.renderOrigin||[0,0,0],matrix=renderer.renderVP;
   const width=g.drawingBufferWidth,height=g.drawingBufferHeight,cy=Math.cos(fish.yaw||0),sy=Math.sin(fish.yaw||0),cp=Math.cos(fish.pitch||0),sn=Math.sin(fish.pitch||0);
   // Both new rigs leave tag-1 body positions rigid. Use the exact production
   // pose order: pitch, scale, yaw, relative-origin translation, projection.
   const project=point=>{const x=(point[0]*cp-point[1]*sn)*fish.s[0],y=(point[0]*sn+point[1]*cp)*fish.s[1],z=point[2]*fish.s[2];const p=[cy*x+sy*z+fish.p[0]-origin[0],y+fish.p[1]-origin[1],-sy*x+cy*z+fish.p[2]-origin[2]];const q=[0,1,2,3].map(r=>matrix[r]*p[0]+matrix[4+r]*p[1]+matrix[8+r]*p[2]+matrix[12+r]);if(q[3]<=0)throw Error('Body diagnostic geometry crosses the camera plane');return [(q[0]/q[3]*.5+.5)*width,(q[1]/q[3]*.5+.5)*height];};
   const body=[];let minX=width,minY=height,maxX=0,maxY=0;
   for(let k=0;k<vertices.length;k+=36){if(vertices[k+11]!==1)continue;const tri=[0,12,24].map(o=>project(vertices.slice(k+o,k+o+3)));body.push(tri);for(const p of tri){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}}
   const left=Math.max(0,Math.floor(minX)),bottom=Math.max(0,Math.floor(minY)),right=Math.min(width,Math.ceil(maxX)),top=Math.min(height,Math.ceil(maxY)),w=right-left,h=top-bottom;
   if(!body.length||w<=0||h<=0)throw Error('No projected tag-1 body region');
   const bodyMask=new Uint8Array(w*h),excluded=new Uint8Array(w*h),edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
   for(const tri of body){const [a,b,c]=tri,area=edge(a,b,c[0],c[1]);if(Math.abs(area)<1e-9)continue;const x0=Math.max(left,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(right,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(bottom,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(top,Math.ceil(Math.max(a[1],b[1],c[1])));for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(edge(a,b,x+.5,y+.5)*area>=0&&edge(b,c,x+.5,y+.5)*area>=0&&edge(c,a,x+.5,y+.5)*area>=0)bodyMask[(y-bottom)*w+x-left]=1;}
   // Conservatively remove every possible nonbody overlap, even anatomy behind
   // the body. Bounds cover the full rig excursion, not an invented static fin.
   let excludedTriangles=0;
   for(let k=0;k<vertices.length;k+=36){const tag=vertices[k+11];if(tag===1)continue;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const offset of [0,12,24]){const p=vertices.slice(k+offset,k+offset+3),delta=sp.id==='tripod_fish'&&tag===3?[0,0,.018]:sp.id==='dumbo_octopus'&&tag===3?[0,.09,0]:sp.id==='dumbo_octopus'&&tag===5?[Math.abs(p[0])*.045,0,Math.abs(p[2])*.045]:[0,0,0];
     for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const q=project([p[0]+x*delta[0],p[1]+y*delta[1],p[2]+z*delta[2]]);x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}}
    x0=Math.max(left,Math.floor(x0)-1);x1=Math.min(right,Math.ceil(x1)+1);y0=Math.max(bottom,Math.floor(y0)-1);y1=Math.min(top,Math.ceil(y1)+1);if(x1>x0&&y1>y0)excludedTriangles++;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)excluded[(y-bottom)*w+x-left]=1;
   }
   const capture=enabled=>{for(const b of d.batches)b.visible=enabled;renderer.forceShadow=true;if(renderer.render(d.view,d.center,d.time)===false)throw Error('Incomplete differential body frame');const pixels=new Uint8Array(w*h*4);g.readPixels(left,bottom,w,h,g.RGBA,g.UNSIGNED_BYTE,pixels);const error=g.getError();if(error!==0)throw Error('Body readPixels WebGL error '+error);return pixels;};
   let without,withActor;try{without=capture(false);withActor=capture(true);}finally{for(const b of d.batches)b.visible=true;}
   const luminance=[],difference=[],threshold=2;let bodyPixels=0,conservativePixels=0;
   for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!bodyMask[i])continue;bodyPixels++;if(excluded[i]||[-w-1,-w,-w+1,-1,1,w-1,w,w+1].some(offset=>!bodyMask[i+offset]))continue;conservativePixels++;
    const k=i*4,delta=Math.max(...[0,1,2].map(c=>Math.abs(withActor[k+c]-without[k+c])));if(delta<threshold)continue;
    luminance.push(withActor[k]*.2126+withActor[k+1]*.7152+withActor[k+2]*.0722);difference.push(delta);
   }
   const summarize=values=>{if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b);return {min:a[0],p10:a[Math.floor((a.length-1)*.10)],p90:a[Math.floor((a.length-1)*.90)],max:a.at(-1),range:a.at(-1)-a[0],mean:a.reduce((sum,x)=>sum+x,0)/a.length};};
   return {method:'Tag-1 production geometry projected at the rigid body pose; one-pixel silhouette erosion; conservative removal of nonbody triangle bounds plus full animation excursion; actor-on/off final-image difference excludes unchanged background. Two extra diagnostic frames use the unchanged complete production renderer; no diagnostic shader or renderer pass is added.',source:'faunaGeometry('+sp.id+', '+low+')',selectedLOD:low?'far':'near',bodyTriangles:body.length,excludedNonbodyTriangles:excludedTriangles,roi:{left,bottom,width:w,height:h,origin:'WebGL lower-left'},projectedBodyPixels:bodyPixels,conservativeBodyPixels:conservativePixels,identifiedBodyPixels:luminance.length,differenceThresholdDisplayRGB:threshold,lumaUnits:'weighted final display RGB code values 0..255; not linear radiance',luma:summarize(luminance),maxChannelDifference:summarize(difference),gl:g.getError(),note:'Conservative exclusion may omit visible body parts. Metrics characterize identified body pixels; they do not certify realism or photographic quality.'};
  });
  assert.equal(profile.bodyReadability.gl,0);assert(profile.bodyReadability.identifiedBodyPixels>=8,'At least eight independently identified body pixels are required to report body statistics');
  assert.deepEqual(await conditions(),profile.fixed,'Differential body capture cannot change the fixed conditions');save();
  for(const enabled of (lowLOD||pixelsOnly)?[]:[false,true,true,false]){
   const warmed=await warm(enabled),before=await conditions();assert.deepEqual(before,profile.fixed,'Every ABBA block has identical scene/camera/quality conditions');
   const block={enabled,warmed,before,samples:[]};profile.blocks.push(block);save();
   for(let i=0;i<25;i++){
    await read(()=>{const d=__abyssCommunityGPU,g=renderer.gl;d.query=g.createQuery();g.beginQuery(d.ext.TIME_ELAPSED_EXT,d.query);const rendered=renderer.render(d.view,d.center,d.time);g.endQuery(d.ext.TIME_ELAPSED_EXT);if(rendered===false)throw Error('A streaming early return is not a valid GPU sample');});
    await wait(()=>renderer.gl.getQueryParameter(__abyssCommunityGPU.query,renderer.gl.QUERY_RESULT_AVAILABLE));
    const row=await read(()=>{const d=__abyssCommunityGPU,g=renderer.gl;const r={ms:g.getQueryParameter(d.query,g.QUERY_RESULT)/1e6,disjoint:g.getParameter(d.ext.GPU_DISJOINT_EXT),gl:g.getError(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,drawn:d.batches.map(b=>b.drawCount),visibility:d.batches.map(b=>b.visible)};g.deleteQuery(d.query);d.query=null;return r;});
    block.samples.push(row);assert.equal(row.gl,0);assert.equal(row.disjoint,false,'A disjoint run is invalid, never selectively dropped');assert(row.visibility.every(v=>v===enabled));if(enabled)assert(row.drawn.some(n=>n>0),'The added actor must actually be rendered');
   }
   block.after=await conditions();assert.deepEqual(block.after,profile.fixed);block.gpuMs=stats(block.samples.map(r=>r.ms));save();console.log(name+' '+(enabled?'with':'without')+' deep-sea animal '+block.gpuMs.p50.toFixed(3)+' ms');
  }
  if(!lowLOD&&!pixelsOnly){const without=profile.blocks.filter(b=>!b.enabled).flatMap(b=>b.samples.map(s=>s.ms)),withActor=profile.blocks.filter(b=>b.enabled).flatMap(b=>b.samples.map(s=>s.ms));
  profile.comparison={without:stats(without),with:stats(withActor),signedAddedMedianGpuMs:median(withActor)-median(without),note:'Signed paired-scene estimate; no arbitrary target, clamp-to-zero, discarded slow sample or physical-phone claim. ABBA limits order bias but cannot remove shared GPU or thermal noise.'};}
  await warm(true);
  const image=await read(()=>{const d=__abyssCommunityGPU;renderer.render(d.view,d.center,d.time);return {data:renderer.canvas.toDataURL('image/png'),gl:renderer.gl.getError(),drawn:d.batches.map(b=>b.drawCount)};});
  assert.equal(image.gl,0);assert(image.drawn.some(n=>n>0));if(lowLOD)assert.deepEqual(image.drawn,[0,1],'Actual distance must select only the production low LOD');const file=output.replace(/\.json$/,'')+'-'+name+(lowLOD?'-low-lod-studio.png':'-fixed-habitat.png'),bytes=Buffer.from(image.data.split(',')[1],'base64');fs.writeFileSync(file,bytes);profile.images.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),drawn:image.drawn,note:lowLOD?'Controlled open-water low LOD studio, not wild habitat evidence.':'Controlled same-habitat diagnostic camera, not natural UI evidence.'});
  await context.close();context=null;save();
 }
 assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(error){result.status='failed';result.failure=error.stack;if(page&&!page.isClosed())try{await page.screenshot({path:output.replace(/\.json$/,'')+'-failure.png'});}catch(_){}throw error;}
 finally{if(context)await context.close();await browser.close();save();}
})().catch(error=>{console.error(error);process.exitCode=1;});
