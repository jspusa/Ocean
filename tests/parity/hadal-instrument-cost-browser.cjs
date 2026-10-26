/* CONTROLLED RENDERING COST ONLY. This deliberately assigns a fixed camera,
 * time, quality and sanitized story fixtures. It is NOT natural quest evidence.
 * Run alone on native Chrome GPU; desktop and emulated touch use separate,
 * sequential browsers. No production test hooks or batch metadata are added. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>{const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(__dirname,'../..',option('out','qa/parity/hadal-instrument-cost.json'));
const fixedTime=8,profiles=[{id:'desktop',touch:false,viewport:{width:1280,height:800},dpr:1,quality:2},{id:'touch',touch:true,viewport:{width:390,height:844},dpr:2,quality:1}];
const checks=[],rows=[],errors=[];let fatal=null;
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};
const median=values=>{const v=values.slice().sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};

async function capture(profile){
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));let context;
 try{
  context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,isMobile:profile.touch,hasTouch:profile.touch});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(profile.id+': '+e.message));page.on('crash',()=>errors.push(profile.id+': renderer crashed'));
  await page.addInitScript(quality=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,third:false,lamp:true,startWithSound:false,reduced:true}})),profile.quality);
  const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);
  await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
  const data=await page.evaluate(async({profile,fixedTime})=>{
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|software|softpipe/i.test(hardware))throw Error('Native hardware renderer could not be verified: '+hardware);
   const clone=v=>JSON.parse(JSON.stringify(v)),original={story:clone(oceanStory.snapshot()),settings:clone(settings),quality:renderer.quality,scale:renderer.dynamicScale,p:clone(player),eye:eye.slice(),target:target.slice(),t,active,modal,photoOpen,freeze:window.__freeze};
   // The public renderer data identifies the existing single story instrument
   // batch. It is dynamic kind 0/material 0 at a 55 m maximum viewing distance.
   const matches=renderer.batches.filter(b=>b.dynamic&&b.kind===0&&b.material===0&&b.maxDistance===55);
   if(matches.length!==1)throw Error('Expected exactly one existing instrument batch, found '+matches.length);
   const sensor=matches[0],sensorIndex=renderer.batches.indexOf(sensor),capacity=sensor.data.length,initialBatchCount=renderer.batches.length;
   const anchor=OceanTrench.studyPoint('hadal-reference').p,camera=[anchor[0],anchor[1]+1.4,anchor[2]+2.6],aim=[anchor[0],anchor[1]+.55,anchor[2]];
   const ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const record=(id,point)=>({id,point,depth:-OceanTrench.studyPoint(point).p[1]});
   const deployed=[record('reference','hadal-reference')],recovered=[...deployed,record('rim','hadal-rim'),record('turn','hadal-turn'),record('bottom','hadal-bottom'),{id:'snailfish',species:'mariana_snailfish',uid:'mariana_snailfish-001'},record('recovery','hadal-reference')];
   const fixture=(phase,legacy)=>({schema:1,started:legacy,reports:legacy?4:0,step:0,investigation:'hadal',hadal:{schema:1,id:'hadal-fold',started:true,records:phase==='deployed'?deployed:phase==='recovered'?recovered:[],reported:false}});
   function installSpy(){
    const originals={},metrics={drawCalls:0,triangles:0,uniformCalls:0,uniforms:{},uploadCalls:0,uploadBytes:0,allocationCalls:0,allocationBytes:0,sensorUploadCalls:0,sensorUploadBytes:0,sensorDraws:[],otherDraws:[]};
    const batchByVAO=new Map(renderer.batches.filter(b=>b.vao).map((b)=>[b.vao,renderer.batches.indexOf(b)]));
    let vao=g.getParameter(g.VERTEX_ARRAY_BINDING),framebuffer=g.getParameter(g.DRAW_FRAMEBUFFER_BINDING),arrayBuffer=g.getParameter(g.ARRAY_BUFFER_BINDING);
    const wrap=(name,fn)=>{originals[name]=g[name];g[name]=function(...args){fn(...args);return originals[name].apply(this,args);};};
    const pass=()=>framebuffer===renderer.dynamicShadowFBO?'dynamic-shadow':framebuffer===renderer.shadowFBO?'static-shadow':framebuffer===(renderer.msaaFBO||renderer.sceneFBO)?'colour':'post';
    wrap('bindVertexArray',value=>{vao=value;});wrap('bindFramebuffer',(target,value)=>{if(target===g.FRAMEBUFFER||target===g.DRAW_FRAMEBUFFER)framebuffer=value;});wrap('bindBuffer',(target,value)=>{if(target===g.ARRAY_BUFFER)arrayBuffer=value;});
    const draw=(mode,count,instances=1)=>{const triangles=mode===g.TRIANGLES?count/3*instances:0,entry={batch:batchByVAO.get(vao)??-1,pass:pass(),mode,count,instances,triangles};metrics.drawCalls++;metrics.triangles+=triangles;(vao===sensor.vao?metrics.sensorDraws:metrics.otherDraws).push(entry);};
    wrap('drawArrays',(mode,first,count)=>draw(mode,count));wrap('drawElements',(mode,count)=>draw(mode,count));wrap('drawArraysInstanced',(mode,first,count,instances)=>draw(mode,count,instances));wrap('drawElementsInstanced',(mode,count,type,offset,instances)=>draw(mode,count,instances));
    wrap('bufferData',(target,data)=>{metrics.allocationCalls++;metrics.allocationBytes+=typeof data==='number'?data:data?.byteLength||0;});
    wrap('bufferSubData',(target,offset,data,sourceOffset=0,length)=>{const bytes=data?.BYTES_PER_ELEMENT?(length?length:data.length-sourceOffset)*data.BYTES_PER_ELEMENT:data?.byteLength||0;metrics.uploadCalls++;metrics.uploadBytes+=bytes;if(target===g.ARRAY_BUFFER&&arrayBuffer===sensor.ib){metrics.sensorUploadCalls++;metrics.sensorUploadBytes+=bytes;}});
    const uniformNames=new Set();for(let prototype=g;prototype;prototype=Object.getPrototypeOf(prototype))for(const name of Object.getOwnPropertyNames(prototype))if(/^uniform(?:[1-4]|Matrix)/.test(name)&&typeof g[name]==='function')uniformNames.add(name);
    for(const name of uniformNames)wrap(name,()=>{metrics.uniformCalls++;metrics.uniforms[name]=(metrics.uniforms[name]||0)+1;});
    return {metrics,restore(){for(const [name,fn]of Object.entries(originals))g[name]=fn;}};
   }
   const fixed=()=>({time:t,camera:eye.slice(),aim:target.slice(),quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,mobile:renderer.mobile,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples});
   const rendered=()=>{if(renderer.render(eye,target,t)===false)throw Error('Controlled frame was deferred by scene loading');};
   async function pixels(reference){rendered();const data=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,data);let differingChannels=0,maxDifference=0,min=255,max=0;for(let i=0;i<data.length;i++){if(i%4!==3){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}if(reference){const d=Math.abs(data[i]-reference[i]);if(d)differingChannels++;maxDifference=Math.max(maxDifference,d);}}const hash=await crypto.subtle.digest('SHA-256',data);return {data,report:{sha256:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join(''),range:max-min,differingChannels,maxDifference,channels:data.length}};}
   async function sample(){
    await raf();let query=null,timerStatus=ext?'pending':'unavailable',gpuMs=null;const spy=installSpy(),start=performance.now();let cpuMs;
    try{if(ext){query=g.createQuery();g.beginQuery(ext.TIME_ELAPSED_EXT,query);}try{rendered();cpuMs=performance.now()-start;}finally{if(query)g.endQuery(ext.TIME_ELAPSED_EXT);}}
    catch(error){if(query)g.deleteQuery(query);throw error;}finally{spy.restore();}
    if(query){try{g.flush();const deadline=performance.now()+2500;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)&&performance.now()<deadline)await raf();if(g.getParameter(ext.GPU_DISJOINT_EXT))timerStatus='disjoint';else if(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE))timerStatus='timeout';else{gpuMs=g.getQueryParameter(query,g.QUERY_RESULT)/1e6;timerStatus='available';}}finally{g.deleteQuery(query);}}
    return {...spy.metrics,cpuMs,gpuMs,timerStatus,rendererDraws:renderer.drawCalls,rendererTriangles:renderer.submittedTriangles,rendererShadowDraws:renderer.shadowDraws,gl:g.getError(),fixed:fixed()};
   }
   const stages=[];let referencePixels=null,restored=false;
   try{
    settings.adaptive=false;settings.third=false;settings.lamp=true;settings.quality=profile.quality;renderer.quality=profile.quality;renderer.dynamicScale=1;renderer.resize();window.__freeze=true;
    await __prepareView(camera,aim,fixedTime);if(renderer.sceneStream)await renderer.sceneStream.ready(eye);for(let i=0;i<3;i++){await raf();rendered();}
    for(const legacy of [false,true])for(const phase of ['before','deployed','recovered']){
     const transition=installSpy();try{voyage.state.features.story=oceanStory.feature.sanitize(fixture(phase,legacy));oceanStory.feature.reset();}finally{transition.restore();}
     // Settle the one intentional static-shadow invalidation separately from
     // steady recurring cost. The reset/upload cost above remains in the report.
     const firstFrame=await sample();for(let i=0;i<3;i++){await raf();rendered();}
     const frames=[];for(let i=0;i<8;i++)frames.push(await sample());
     const image=await pixels(referencePixels);if(!referencePixels)referencePixels=image.data;
     stages.push({id:(legacy?'legacy-three-':'')+phase,legacy,phase,story:clone(oceanStory.snapshot()),batch:{index:sensorIndex,shared:renderer.batches[sensorIndex]===sensor,totalBatches:renderer.batches.length,capacityFloats:sensor.data.length,meshTriangles:sensor.count/3,instances:clone(sensor.instances),visible:sensor.visible},transition:transition.metrics,firstFrame,frames,pixels:image.report});
    }
   }finally{
    voyage.state.features.story=original.story;oceanStory.feature.reset();Object.assign(settings,original.settings);renderer.quality=original.quality;renderer.dynamicScale=original.scale;renderer.resize();Object.assign(player,original.p);eye=original.eye;target=original.target;t=original.t;active=original.active;modal=original.modal;photoOpen=original.photoOpen;window.__freeze=original.freeze;restored=true;
   }
   return {hardware,timerExtension:!!ext,camera,aim,fixedTime,sensorIndex,capacity,initialBatchCount,stages,restored,restoredStory:clone(oceanStory.snapshot()),originalStory:original.story,gl:g.getError()};
  },{profile,fixedTime});
  return {profile,...data};
 }finally{try{if(context)await context.close();}finally{await browser.close();}}
}

function verify(row){
 const label=row.profile.id,first=row.stages[0].frames[0].fixed,expectedCounts=[0,1,0,3,4,3];
 check(label+' uses verified native hardware and restores its isolated state',!!row.hardware&&!/swiftshader|llvmpipe|software|softpipe/i.test(row.hardware)&&row.restored&&JSON.stringify(row.restoredStory)===JSON.stringify(row.originalStory)&&row.gl===0,{hardware:row.hardware});
 check(label+' all four instruments share one existing bounded instance buffer',row.capacity===96&&row.stages.every((s,i)=>s.batch.shared&&s.batch.index===row.sensorIndex&&s.batch.totalBatches===row.initialBatchCount&&s.batch.capacityFloats===96&&s.batch.instances.length===expectedCounts[i]),{counts:row.stages.map(s=>s.batch.instances.length),capacity:row.capacity});
 for(const s of row.stages){
  check(label+'/'+s.id+' camera, time, quality and framebuffer remain fixed',[s.firstFrame,...s.frames].every(f=>JSON.stringify(f.fixed)===JSON.stringify(first)&&f.gl===0)&&first.time===fixedTime&&!first.adaptive&&s.pixels.range>10,{fixed:first,pixelRange:s.pixels.range});
  check(label+'/'+s.id+' reset uploads at most four instances without allocating geometry',s.transition.allocationCalls===0&&s.transition.sensorUploadCalls<=1&&s.transition.sensorUploadBytes<=384,{uploads:s.transition.sensorUploadCalls,bytes:s.transition.sensorUploadBytes,allocations:s.transition.allocationCalls});
  const a=s.frames[0];check(label+'/'+s.id+' steady frame work is stable',s.frames.every(f=>['drawCalls','triangles','uniformCalls','uploadCalls','uploadBytes','rendererDraws','rendererTriangles','rendererShadowDraws'].every(k=>f[k]===a[k])&&f.allocationCalls===0),{draws:a.drawCalls,triangles:a.triangles,uniforms:a.uniformCalls,uploads:a.uploadCalls,uploadBytes:a.uploadBytes});
  s.timing={instrumentedCpuMedianMs:median(s.frames.map(f=>f.cpuMs)),gpuMedianMs:median(s.frames.filter(f=>f.timerStatus==='available').map(f=>f.gpuMs)),validGpuSamples:s.frames.filter(f=>f.timerStatus==='available').length,totalSamples:s.frames.length,statuses:[...new Set(s.frames.map(f=>f.timerStatus))]};
 }
 for(const offset of [0,3]){
  const [a,b,c]=row.stages.slice(offset,offset+3),before=a.frames[0],after=b.frames[0],recovered=c.frames[0],colour=after.sensorDraws.filter(d=>d.pass==='colour'),shadow=after.sensorDraws.filter(d=>/shadow/.test(d.pass));
  const sameOthers=JSON.stringify(before.otherDraws)===JSON.stringify(after.otherDraws)&&JSON.stringify(before.otherDraws)===JSON.stringify(recovered.otherDraws);
  check(label+'/'+a.id+' to deployment adds exactly one visible colour draw and at most one shadow draw',before.sensorDraws.length===0&&recovered.sensorDraws.length===0&&colour.length===1&&colour[0].instances===1&&shadow.length<=1&&shadow.every(d=>d.instances===1)&&after.sensorDraws.length===colour.length+shadow.length&&sameOthers,{sensorDraws:after.sensorDraws,otherDrawsUnchanged:sameOthers});
  const delta={draws:after.drawCalls-before.drawCalls,triangles:after.triangles-before.triangles,colourTriangles:after.rendererTriangles-before.rendererTriangles,uniforms:after.uniformCalls-before.uniformCalls,uploads:after.uploadCalls-before.uploadCalls,uploadBytes:after.uploadBytes-before.uploadBytes};
  check(label+'/'+a.id+' actual recurring GPU submissions stay within one instrument',delta.draws===after.sensorDraws.length&&delta.triangles===b.batch.meshTriangles*after.sensorDraws.length&&delta.colourTriangles===b.batch.meshTriangles&&delta.uniforms>=0&&delta.uniforms<=128&&delta.uploads===after.sensorUploadCalls&&delta.uploads<=2&&delta.uploadBytes===after.sensorUploadBytes&&delta.uploadBytes<=192,delta);
  check(label+'/'+a.id+' recovery removes the complete added render cost and pixels',['drawCalls','triangles','uniformCalls','uploadCalls','uploadBytes','rendererDraws','rendererTriangles','rendererShadowDraws'].every(k=>before[k]===recovered[k])&&a.pixels.sha256===c.pixels.sha256&&b.pixels.sha256!==a.pixels.sha256,{before:a.pixels.sha256,deployed:b.pixels.sha256,recovered:c.pixels.sha256});
 }
}

(async()=>{
 try{for(const profile of profiles){const row=await capture(profile);rows.push(row);verify(row);}}
 catch(error){fatal=error.stack||String(error);console.error(fatal);}
 finally{
  check('both sequential native profiles finish without page errors',rows.length===2&&errors.length===0&&!fatal,{profiles:rows.map(r=>r.profile.id),errors,fatal});
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({url,status:checks.every(c=>c.pass)?'passed':'failed',method:'CONTROLLED RENDERING COST ONLY. Each native Chrome profile uses one fixed camera/time/quality/framebuffer. Sanitized story fixtures plus the registered story reset lifecycle produce absent, deployed and recovered instruments, repeated with the three legacy instruments. Actual GL draw, triangle, uniform, upload and allocation calls are counted; reset/first-frame invalidation and eight steady frames are reported separately. Optional GPU timer queries report unavailable/disjoint/timeout explicitly. Instrumented CPU time is not FPS. Touch emulates a phone on this computer GPU, not physical-device power or performance. This does NOT prove natural quest completion; hadal-investigation-browser.cjs owns that evidence.',checks,rows,errors,fatal},null,2));
  if(!checks.every(c=>c.pass))process.exitCode=1;
 }
})();
