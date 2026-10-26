/* Controlled native GPU ABBA cost fixture, separate from natural UI acceptance.
 * Fixed camera/time/quality/resolution, real 900 m actor left at its authored
 * position. Only its two new instance batches are toggled during measurement.
 * No old content, shading tier, render scale or render frequency is reduced.
 * Root owns GPU scheduling. Author-side verification is syntax only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/?still'),output=path.resolve(root,option('out','qa/parity/frilled-shark-gpu-browser.json'));
const lowLOD=process.argv.includes('--low-lod');
const requested=option('profile','both'),names=requested==='both'?['desktop','touch']:[requested];
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
assert(names.every(n=>['desktop','touch'].includes(n)),'--profile must be desktop, touch or both');
const result={url,expectedVersion,status:'running',profiles:[],errors:[],method:'Controlled native Chrome GPU ABBA. Each block has ten completed warm renders, followed by 25 complete-render EXT_disjoint_timer_query_webgl2 samples. Actual 900 m frilled shark position, lamp=true from before warm-up, and the original default quality tier are retained; render scale is 1. Only the new high/low instance batches change visibility between blocks. Camera, formal sampled time, old batch visibility, viewport, DPR, MSAA, lamp, lighting, exposure, clarity and fog remain fixed. A synchronous animal-center readback must be visibly differentiated before any timing. Adaptive quality is disabled only inside this controlled fixture. No natural exploration, native-phone, gameplay FPS or pixel-equivalence claim.'};
if(lowLOD)result.method='Controlled low-LOD anatomy fixture only, no GPU timing. The actual actor is raised to 6 m depth over its existing deep-water x/z coordinate; a 36 m camera and diagnostic 18 degree lens select the production far batch and resolve its original geometry. This is an explicit open-water studio, not the natural 900 m habitat, observation, performance or physical-phone evidence.';
const median=values=>{const a=values.slice().sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
const stats=values=>{const a=values.slice().sort((a,b)=>a-b);return {count:a.length,min:a[0],p50:median(a),p95:a[Math.min(a.length-1,Math.floor(a.length*.95))],max:a.at(-1),mean:a.reduce((s,v)=>s+v,0)/a.length};};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));};
(async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 let context,page;
 try{for(const name of names){
  const touch=name==='touch';context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>result.errors.push({profile:name,error:e.message}));page.on('crash',()=>result.errors.push({profile:name,error:'Renderer process crashed'}));page.on('console',m=>{if(m.type()==='error')result.errors.push({profile:name,error:m.text()});});
  const cdp=await context.newCDPSession(page);
  const read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const wait=async(fn,arg,timeout=30000)=>{const until=Date.now()+timeout;while(Date.now()<until){const value=await read(fn,arg);if(value)return value;await page.waitForTimeout(40);}throw Error('Timed out: '+fn.toString());};
  await page.goto(url);await wait(()=>window.__ocean?.ready,undefined,120000);await page.bringToFront();
  const profile={name,blocks:[],images:[]};result.profiles.push(profile);save();
  profile.meta=await read(lowLOD=>{
   const fish=life.find(f=>f.uid==='frilled_shark-001');if(!fish)throw Error('Actual frilled shark missing');
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples};
   window.__freeze=true;settings.adaptive=false;settings.third=false;renderer.dynamicScale=1;renderer.resize();renderer.lamp=true;
   const originalHabitatPosition=fish.p.slice();if(lowLOD){fish.p[1]=-6;renderer.photoFov=18;renderer.lamp=true;}
   const center=animalFocusPoint(fish),range=lowLOD?36:SPECIES[fish.species].size*2.8,normal=[Math.sin(fish.yaw),0,Math.cos(fish.yaw)];
   const candidates=[1,-1].map(sign=>V.add(center,V.mul(normal,range*sign))).filter(p=>p[1]>groundHeight(p[0],p[2])+.5&&!blocked(p,center,.25)&&OceanRegions.pathClear(p,center,.25));
   if(!candidates.length)throw Error('No actual unobstructed habitat side view');const view=candidates[0];
   const gl=renderer.gl,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
   const batches=renderer.batches.filter(b=>b.species===fish.species&&b.sceneRole==='frilled-shark-encounter');
   if(batches.length!==2||!ext)throw Error('Two actual LOD batches and GPU timer extension are required');
   const others=renderer.batches.filter(b=>!batches.includes(b));
   window.__frilledSharkGPU={fish,center,view,batches,others,otherVisible:others.map(b=>b.visible),ext,time:t,query:null,initial};
   return {version:document.documentElement.dataset.version,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,initial,originalHabitatPosition,studio:lowLOD,diagnosticFov:renderer.photoFov||null,uid:fish.uid,index:fish.species,position:fish.p.slice(),home:fish.home.slice(),scaleMetres:fish.s.slice(),modelBounds:SPECIES[fish.species].modelBounds,range,camera:view.slice(),target:center.slice(),time:t,oldBatches:others.length,newBatches:batches.map(b=>({indices:b.count,vertices:b.vertexCount,role:b.sceneRole,near:b.minDistance||0,far:b.maxDistance??null,kind:b.kind}))};
  },lowLOD);
  assert(profile.meta.renderer&&!/swiftshader|llvmpipe|software/i.test(profile.meta.renderer),'Native hardware renderer is required');
  assert.equal(profile.meta.version,expectedVersion);assert.equal(profile.meta.index,42);assert.equal(profile.meta.initial.scale,1,'Fresh default full scale is required');assert.equal(profile.meta.initial.adaptive,true);
  assert(Math.abs(profile.meta.home[1]+900)<1);assert(profile.meta.scaleMetres.every(n=>n===1.7));
  const conditions=()=>read(()=>{const d=__frilledSharkGPU,others=renderer.batches.filter(b=>!d.batches.includes(b));return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,camera:d.view.slice(),target:d.center.slice(),time:d.time,position:d.fish.p.slice(),yaw:d.fish.yaw,pitch:d.fish.pitch||0,actorScale:d.fish.s.slice(),lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,fog:renderer.fog.slice(),fogDensity:renderer.fogDensity,lightDir:renderer.lightDir.slice(),lightColor:renderer.lightColor.slice(),sun:renderer.sun,oldBatchCount:others.length,oldVisibilityUnchanged:d.others.every((b,i)=>b.visible===d.otherVisible[i]),allOtherBatchReferencesUnchanged:others.length===d.others.length&&others.every((b,i)=>b===d.others[i]),adaptive:settings.adaptive};});
  const warm=async(enabled)=>read(enabled=>new Promise((resolve,reject)=>{
   const d=__frilledSharkGPU;for(const b of d.batches)b.visible=enabled;let count=0;const start=performance.now();
   function frame(){try{const rendered=renderer.render(d.view,d.center,d.time);if(rendered!==false)count++;if(count>=10)return resolve({count,seconds:(performance.now()-start)/1000});if(performance.now()-start>45000)return reject(Error('Fixed-scene streaming warm-up exceeded 45 seconds'));requestAnimationFrame(frame);}catch(error){reject(error);}}requestAnimationFrame(frame);
  }),enabled);
  await warm(false);profile.fixed=await conditions();
  assert.equal(profile.fixed.quality,profile.meta.initial.quality,'Do not lower the original quality tier');assert.equal(profile.fixed.scale,1);
  assert.equal(profile.fixed.lamp,true,'The real deep habitat must be illuminated before measuring');
  assert(profile.fixed.oldVisibilityUnchanged&&profile.fixed.allOtherBatchReferencesUnchanged,'Warming cannot hide or replace old batches');
  await warm(true);
  profile.readability=await read(()=>{const d=__frilledSharkGPU,g=renderer.gl;if(renderer.render(d.view,d.center,d.time)===false)throw Error('Incomplete readability frame');const bytes=new Uint8Array(32*32*4);g.readPixels(Math.floor(g.drawingBufferWidth/2)-16,Math.floor(g.drawingBufferHeight/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,bytes);let min=255,max=0,nonzero=0;for(let i=0;i<bytes.length;i+=4){min=Math.min(min,bytes[i],bytes[i+1],bytes[i+2]);max=Math.max(max,bytes[i],bytes[i+1],bytes[i+2]);if(bytes[i]||bytes[i+1]||bytes[i+2])nonzero++;}return {region:'32 x 32 pixels at the aimed body center, synchronous completed-render readback',minRGB:min,maxRGB:max,range:max-min,nonzeroPixels:nonzero,gl:g.getError(),lamp:renderer.lamp,drawn:d.batches.map(b=>b.drawCount)};});
  assert.equal(profile.readability.gl,0);assert(profile.readability.maxRGB>20&&profile.readability.range>4&&profile.readability.nonzeroPixels>32,'A lit, nonblack, visibly differentiated animal-center region is required before timing');
  assert.deepEqual(await conditions(),profile.fixed,'Readability capture cannot change the fixed conditions');save();
  for(const enabled of lowLOD?[]:[false,true,true,false]){
   const warmed=await warm(enabled),before=await conditions();assert.deepEqual(before,profile.fixed,'Every ABBA block has identical scene/camera/quality conditions');
   const block={enabled,warmed,before,samples:[]};profile.blocks.push(block);save();
   for(let i=0;i<25;i++){
    await read(()=>{const d=__frilledSharkGPU,g=renderer.gl;d.query=g.createQuery();g.beginQuery(d.ext.TIME_ELAPSED_EXT,d.query);const rendered=renderer.render(d.view,d.center,d.time);g.endQuery(d.ext.TIME_ELAPSED_EXT);if(rendered===false)throw Error('A streaming early return is not a valid GPU sample');});
    await wait(()=>renderer.gl.getQueryParameter(__frilledSharkGPU.query,renderer.gl.QUERY_RESULT_AVAILABLE));
    const row=await read(()=>{const d=__frilledSharkGPU,g=renderer.gl;const r={ms:g.getQueryParameter(d.query,g.QUERY_RESULT)/1e6,disjoint:g.getParameter(d.ext.GPU_DISJOINT_EXT),gl:g.getError(),draws:renderer.drawCalls,triangles:renderer.submittedTriangles,drawn:d.batches.map(b=>b.drawCount),visibility:d.batches.map(b=>b.visible)};g.deleteQuery(d.query);d.query=null;return r;});
    block.samples.push(row);assert.equal(row.gl,0);assert.equal(row.disjoint,false,'A disjoint run is invalid, never selectively dropped');assert(row.visibility.every(v=>v===enabled));if(enabled)assert(row.drawn.some(n=>n>0),'The added actor must actually be rendered');
   }
   block.after=await conditions();assert.deepEqual(block.after,profile.fixed);block.gpuMs=stats(block.samples.map(r=>r.ms));save();console.log(name+' '+(enabled?'with':'without')+' frilled shark '+block.gpuMs.p50.toFixed(3)+' ms');
  }
  if(!lowLOD){const without=profile.blocks.filter(b=>!b.enabled).flatMap(b=>b.samples.map(s=>s.ms)),withActor=profile.blocks.filter(b=>b.enabled).flatMap(b=>b.samples.map(s=>s.ms));
  profile.comparison={without:stats(without),with:stats(withActor),signedAddedMedianGpuMs:median(withActor)-median(without),note:'Signed paired-scene estimate; no arbitrary target, clamp-to-zero, discarded slow sample or physical-phone claim. ABBA limits order bias but cannot remove shared GPU or thermal noise.'};}
  await warm(true);
  const image=await read(()=>{const d=__frilledSharkGPU;renderer.render(d.view,d.center,d.time);return {data:renderer.canvas.toDataURL('image/png'),gl:renderer.gl.getError(),drawn:d.batches.map(b=>b.drawCount)};});
  assert.equal(image.gl,0);assert(image.drawn.some(n=>n>0));if(lowLOD)assert.deepEqual(image.drawn,[0,1],'Actual distance must select only the production low LOD');const file=output.replace(/\.json$/,'')+'-'+name+(lowLOD?'-low-lod-studio.png':'-fixed-habitat.png'),bytes=Buffer.from(image.data.split(',')[1],'base64');fs.writeFileSync(file,bytes);profile.images.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),drawn:image.drawn,note:lowLOD?'Controlled open-water low LOD studio, not wild habitat evidence.':'Controlled same-habitat side camera, not natural UI evidence.'});
  if(!lowLOD){
   // Diagnostic close-up follows all timed blocks, so it cannot affect ABBA.
   // Actor, geometry, time and original habitat remain unchanged. Camera/lamp
   // are explicit visual-fixture settings, never gameplay observations.
   const close=await read(()=>{const d=__frilledSharkGPU,f=d.fish,cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch||0),sp=Math.sin(f.pitch||0);const axis=[cy*cp,sp,-sy*cp],normal=[sy,0,cy],target=V.add(f.p,V.mul(axis,.36*f.s[0])),view=V.add(V.add(target,V.mul(normal,.65)),V.add(V.mul(axis,.33),[0,.09,0]));if(blocked(view,target,.1)||!OceanRegions.pathClear(view,target,.1))throw Error('Diagnostic head camera is occluded');renderer.lamp=true;const rendered=renderer.render(view,target,d.time);if(rendered===false)throw Error('Close-up cannot capture an incomplete frame');return {data:renderer.canvas.toDataURL('image/png'),camera:view,target,position:f.p.slice(),time:d.time,lamp:renderer.lamp,drawn:d.batches.map(b=>b.drawCount),gl:renderer.gl.getError()};});
   assert.equal(close.gl,0);assert(close.drawn[0]>0);const file=output.replace(/\.json$/,'')+'-'+name+'-oblique-head.png',bytes=Buffer.from(close.data.split(',')[1],'base64');fs.writeFileSync(file,bytes);delete close.data;profile.images.push({...close,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),note:'Actual high model, fixed 900 m habitat with a close oblique diagnostic camera after timing; no player zoom or natural input claim.'});
  }
  await context.close();context=null;save();
 }
 assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(error){result.status='failed';result.failure=error.stack;if(page&&!page.isClosed())try{await page.screenshot({path:output.replace(/\.json$/,'')+'-failure.png'});}catch(_){}throw error;}
 finally{if(context)await context.close();await browser.close();save();}
})().catch(error=>{console.error(error);process.exitCode=1;});
