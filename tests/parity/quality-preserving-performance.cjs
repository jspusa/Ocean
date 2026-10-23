/* Differential renderer regression against the original 0.17 release.
 * Run an original checkout on :8001 and the candidate on :8000. Small identical
 * framebuffers keep software-WebGL comparisons practical; this is not device FPS. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const originalURL=option('original','http://127.0.0.1:8001/'),candidateURL=option('candidate','http://127.0.0.1:8000/');
const out=option('out','qa/parity/quality-preserving-performance.json'),baselinePath=option('baseline','qa/parity/quality-original.json');
const errors=[],profiles=[{id:'desktop',mobile:false,quality:2},{id:'mobile',mobile:true,quality:1}];
const commonViews=[{id:'reef',p:[0,-8,7],aim:[0,-8,-10]},{id:'offshore',p:[390,-32,-184],aim:[390,-32,-210]},{id:'hadal',p:[766,-7000,-120],aim:[766,-7000,-145]}];
const desktopViews=[{id:'cave',p:[-218,-26,-69],aim:[-218,-25,-47.5]},{id:'ruins',p:[176,-49,-197],aim:[187,-51,-225]},{id:'reef-reversed',p:[0,-8,-10],aim:[0,-9,8]},{...commonViews[0],id:'reef-wide',viewport:{width:550,height:370}}];
const mobileViews=[{...commonViews[0],id:'reef-portrait',viewport:{width:195,height:422}}];
const expectedViews=commonViews.length*profiles.length+desktopViews.length+mobileViews.length;
const summarize=row=>{const {pixels,...rest}=row;return {...rest,pixelSHA256:crypto.createHash('sha256').update(Buffer.from(pixels,'base64')).digest('hex')};};
async function capture(browser,url,label){
 const rows=[];
 for(const profile of profiles){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:profile.mobile,hasTouch:profile.mobile}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(label+': '+error.message));
  await page.addInitScript(({quality})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,startWithSound:false,reduced:true}})),profile);
  await page.goto(url+(url.includes('?')?'&':'?')+'still');
  await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert.ok(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
  for(const view of [...commonViews,...(profile.mobile?mobileViews:desktopViews)]){
   await page.setViewportSize(view.viewport||{width:320,height:240});
   const row=await page.evaluate(async({view,profile})=>{
    settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=profile.quality;renderer.dynamicScale=1;renderer.resize();
    if(window.__prepareView)await __prepareView(view.p,view.aim,8);else __renderView(view.p,view.aim,8);
    const gl=renderer.gl,original=gl.bufferSubData;let uploadCalls=0,uploadBytes=0,uniformCalls=0;
    const uniformOriginals={},uniformCallsByMethod={};
    for(const name of ['uniform1i','uniform1f','uniform2f','uniform2fv','uniform3f','uniform3fv','uniform4f','uniform4fv','uniformMatrix4fv']){
     uniformOriginals[name]=gl[name];uniformCallsByMethod[name]=0;
     gl[name]=function(){uniformCalls++;uniformCallsByMethod[name]++;return uniformOriginals[name].apply(this,arguments);};
    }
    gl.bufferSubData=function(target,offset,data,srcOffset,length){uploadCalls++;uploadBytes+=(length??data.length)*data.BYTES_PER_ELEMENT;return original.apply(this,arguments);};
    try{renderer.render(eye,target,t);}finally{gl.bufferSubData=original;for(const name in uniformOriginals)gl[name]=uniformOriginals[name];}
    const pixels=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let encoded='';for(let i=0;i<pixels.length;i+=16384)encoded+=String.fromCharCode(...pixels.subarray(i,i+16384));
    const topBatches=renderer.batches.map((b,index)=>({index,role:b.sceneRole||null,kind:b.kind,material:b.material,species:b.species,dynamic:!!b.dynamic,triangles:b.visible?b.count/3*b.drawCount:0,drawCount:b.drawCount,meshTriangles:b.count/3,radius:b.radius,instances:b.instances.length,examplePosition:b.instances[0]?.p,minDistance:b.minDistance||0,maxDistance:b.maxDistance||220})).filter(b=>b.triangles>0).sort((a,b)=>b.triangles-a.triangles).slice(0,12);
    return {profile:profile.id,scene:view.id,quality:renderer.quality,mobile:renderer.mobile,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaaSamples:renderer.msaaSamples,triangles:renderer.submittedTriangles,drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,uploadCalls,uploadBytes,uniformCalls,uniformCallsByMethod,topBatches,pixels:btoa(encoded),gl:gl.getError()};
   },{view,profile});
   rows.push(row);console.log(label+' '+profile.id+' '+view.id+': '+row.triangles+' triangles, '+row.drawCalls+' draws, '+row.uploadCalls+' uploads, MSAA '+row.msaaSamples);
  }
  // Exercise the real application loop on a controlled 120 Hz display. Only
  // rendering is spied: swimming, simulation, HUD and feature hooks stay real.
  const cadence=await page.evaluate(()=>{
   const originalRAF=window.requestAnimationFrame,originalRender=renderer.render,originalFocus=document.hasFocus;
   window.requestAnimationFrame=()=>0;document.hasFocus=()=>true;window.__freeze=false;
   let rendered=0,virtualMs=100000;renderer.render=function(){this.dirty=false;rendered++;};
   const schedule=(name,{playing=true,quality=0,hidden=false,panel=null}={})=>{
    active=playing;modal=panel;photoOpen=false;settings.adaptive=false;settings.quality=quality;renderer.quality=quality;renderer.dirty=false;
    Object.defineProperty(document,'hidden',{configurable:true,value:hidden});lastTime=virtualMs;rendered=0;
    t=0;simulationAccumulator=0;previousPhysicsPosition=null;hudClock=0;observationClock=0;player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=0;cameraCut=true;resetInput();keys.add('KeyW');
    for(let i=1;i<=120;i++)animate(virtualMs+i*1000/120);virtualMs+=1000;
    keys.clear();return {name,frames:rendered,simulationSeconds:t,position:player.p.slice()};
   };
   try{return [schedule('low-120hz'),schedule('high-120hz',{quality:2}),schedule('home-120hz',{playing:false}),schedule('paused-120hz',{panel:'settings'}),schedule('hidden-120hz',{hidden:true})];}
   finally{window.__freeze=true;window.requestAnimationFrame=originalRAF;renderer.render=originalRender;document.hasFocus=originalFocus;delete document.hidden;}
  });
  rows.find(row=>row.profile===profile.id).cadence=cadence;
  console.log(label+' '+profile.id+' cadence: '+cadence.map(row=>row.name+'='+row.frames).join(', '));
  await context.close();
 }
 return rows;
}
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let original,candidate;
 try{
  original=process.argv.includes('--reuse-baseline')?JSON.parse(fs.readFileSync(baselinePath)).rows:await capture(browser,originalURL,'original');
  assert.equal(original.length,expectedViews,'Baseline must contain every view; rerun without --reuse-baseline');
  assert.equal(original.filter(row=>row.cadence).length,2,'Baseline must contain both cadence probes; rerun without --reuse-baseline');
  if(!process.argv.includes('--reuse-baseline')){fs.mkdirSync(path.dirname(baselinePath),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify({url:originalURL,rows:original},null,2));}
  if(process.argv.includes('--baseline-only')){assert.equal(errors.length,0,errors.join('; '));assert.ok(original.every(row=>row.gl===0),'Original rendering must have no GL errors');return;}
  candidate=await capture(browser,candidateURL,'candidate');
 }finally{await browser.close();}
 assert.equal(candidate.length,original.length,'Both versions must capture the same views');
 const comparisons=original.map(before=>{
  const after=candidate.find(row=>row.profile===before.profile&&row.scene===before.scene),a=Buffer.from(before.pixels,'base64'),b=Buffer.from(after.pixels,'base64');
  assert.equal(a.length,b.length,'Framebuffer byte count changed');let differingChannels=0,maxDifference=0,sumDifference=0,min=255,max=0;
  for(let i=0;i<a.length;i++){if(i%4!==3){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}const delta=Math.abs(a[i]-b[i]);if(delta)differingChannels++;maxDifference=Math.max(maxDifference,delta);sumDifference+=delta;}
  return {profile:before.profile,scene:before.scene,before:summarize(before),after:summarize(after),pixels:{differingChannels,maxDifference,meanDifference:sumDifference/a.length,originalRange:max-min}};
 });
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({method:'Same fixed camera/time, quality, MSAA and framebuffer. Exact readPixels comparison on one software WebGL renderer, plus real animate() at controlled 120 Hz with a render spy. Work counts are not FPS or power measurements.',comparisons,errors},null,2));
 assert.equal(errors.length,0,errors.join('; '));
 for(const row of comparisons){
  assert.equal(row.before.gl,0);assert.equal(row.after.gl,0);assert.ok(row.pixels.originalRange>20,'Original image must contain visible contrast');
  for(const key of ['profile','scene','quality','msaaSamples','resolution','volumeResolution'])assert.deepEqual(row.after[key],row.before[key],key+' must remain unchanged');
  assert.equal(row.pixels.differingChannels,0,'Rendered pixels must remain identical: '+row.profile+'/'+row.scene);
  assert.ok(row.after.uploadCalls<=row.before.uploadCalls,'GPU upload calls must not increase');
  assert.ok(row.after.uniformCalls<=row.before.uniformCalls,'GPU uniform calls must not increase');
  if(row.before.cadence){
   assert.deepEqual(row.after.cadence,row.before.cadence,'Animation cadence, elapsed time and swimming must match the original');
   for(const sample of row.after.cadence){
    const paused=sample.name==='paused-120hz'||sample.name==='hidden-120hz';
    assert.equal(sample.frames,paused?0:120,'Do not cap frames or render while paused: '+sample.name);
    assert.ok(Math.abs(sample.simulationSeconds-(paused?0:1))<1e-9,'Preserve elapsed simulation time: '+sample.name);
   }
   console.log('PASS unchanged cadence and swimming '+row.profile);
  }
  console.log('PASS identical pixels '+row.profile+'/'+row.scene+'; uploads '+row.before.uploadCalls+' -> '+row.after.uploadCalls);
 }
 assert.ok(comparisons.some(row=>row.after.uploadCalls<row.before.uploadCalls),'Expected a measured reduction in redundant uploads');
})().catch(error=>{console.error(error);process.exitCode=1;});
