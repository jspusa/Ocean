/* Same-scene work and scheduler probe. SwiftShader timing is diagnostic only;
 * touch emulation is not a physical phone benchmark. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';
const baseline=process.argv.includes('--baseline');
const output=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'qa/parity/runtime-performance.json';
const results=[],errors=[];
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true].filter(value=>!process.argv.includes('--mobile')||value)){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:740},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:0,adaptive:false,startWithSound:false,reduced:true}})));
  await page.goto(url+'?still');
  await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert.ok(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
  const data=await page.evaluate(()=>{
   const snapshots=[],g=renderer.gl,originalUpload=g.bufferSubData.bind(g);let uploadCalls=0,uploadBytes=0;
   g.bufferSubData=function(target,offset,data,srcOffset,length){uploadCalls++;uploadBytes+=(length??data.length)*data.BYTES_PER_ELEMENT;return originalUpload(...arguments);};
   const views=[{id:'reef',quality:0,p:[0,-8,7],aim:[0,-8,-10]},{id:'offshore',quality:0,p:[390,-32,-184],aim:[390,-32,-210]},{id:'hadal',quality:0,p:[766,-7000,-120],aim:[766,-7000,-145]},{id:'reef-balanced',quality:1,p:[0,-8,7],aim:[0,-8,-10]}];
   for(const view of views){
    renderer.quality=view.quality;renderer.resize();
    __renderView(view.p,view.aim,8);uploadCalls=0;uploadBytes=0;
    const begin=performance.now();renderer.render(eye,target,t);g.finish();
    snapshots.push({scene:view.id,quality:renderer.quality,drawCalls:renderer.drawCalls,triangles:renderer.submittedTriangles,shadowDraws:renderer.shadowDraws,uploadCalls,uploadBytes,cpuRenderMs:renderer.cpuRenderMs,submissionFrameMs:performance.now()-begin,resolution:[renderer.canvas.width,renderer.canvas.height],msaaSamples:renderer.msaaSamples,volumeResolution:[renderer.volumeW,renderer.volumeH],gl:g.getError()});
   }
   g.bufferSubData=originalUpload;
   // Control timestamps at the real app loop. Spy on rendering so this scheduler
   // assertion does not depend on a particular GPU or monitor refresh rate.
   const originalRAF=window.requestAnimationFrame,originalRender=renderer.render,originalFocus=document.hasFocus;
   window.requestAnimationFrame=()=>0;document.hasFocus=()=>true;window.__freeze=false;
   let rendered=0,virtualMs=100000;renderer.render=function(){this.dirty=false;rendered++;};
   const schedule=(name,{playing=true,quality=0,hidden=false,panel=null}={})=>{
    active=playing;modal=panel;photoOpen=false;settings.adaptive=false;renderer.quality=quality;renderer.dirty=false;
    Object.defineProperty(document,'hidden',{configurable:true,value:hidden});lastTime=virtualMs;rendered=0;
    t=0;simulationAccumulator=0;previousPhysicsPosition=null;player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=0;cameraCut=true;resetInput();keys.add('KeyW');
    const start=player.p.slice();
    for(let i=1;i<=120;i++)animate(virtualMs+i*1000/120);virtualMs+=1000;
    keys.clear();return {name,frames:rendered,simulationSeconds:t,movement:V.dist(start,player.p)};
   };
   const cadence=[schedule('low-120hz'),schedule('high-120hz',{quality:2}),schedule('home-120hz',{playing:false}),schedule('paused-120hz',{panel:'settings'}),schedule('hidden-120hz',{hidden:true})];
   window.__freeze=true;window.requestAnimationFrame=originalRAF;renderer.render=originalRender;document.hasFocus=originalFocus;delete document.hidden;
   return {mobile:renderer.mobile,snapshots,cadence};
  });results.push(data);console.log(JSON.stringify(data));
  if(process.argv.includes('--screenshots')){
   await page.evaluate(()=>{renderer.quality=0;renderer.resize();__renderView([0,-8,7],[0,-8,-10],8);});
   fs.mkdirSync('qa/parity',{recursive:true});await page.screenshot({path:'qa/parity/performance-'+(mobile?'mobile':'desktop')+'.png',timeout:120000});
  }
  await context.close();
 }}finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({method:'Fixed real-renderer camera views plus controlled 120 Hz RAF cadence. Timing uses software GPU and is not device FPS.',results,errors},null,2));}
 assert.equal(errors.length,0,errors.join('; '));
 for(const result of results){
  assert.ok(result.snapshots.every(s=>s.gl===0),'Rendering must remain valid');
  if(!baseline){
   const cadence=Object.fromEntries(result.cadence.map(x=>[x.name,x]));
   assert.ok(cadence['low-120hz'].frames>=28&&cadence['low-120hz'].frames<=31,'Power-saving preset should render about 30 frames/second');
   assert.ok(cadence['high-120hz'].frames>=58&&cadence['high-120hz'].frames<=61,'High quality should render about 60 frames/second');
   assert.ok(cadence['home-120hz'].frames>=13&&cadence['home-120hz'].frames<=16,'Home background should render about 15 frames/second');
   for(const name of ['low-120hz','high-120hz','home-120hz'])assert.ok(cadence[name].simulationSeconds>.9&&cadence[name].simulationSeconds<1.1,'Throttling must retain elapsed simulation time: '+name);
   assert.ok(cadence['low-120hz'].movement>.5&&Math.abs(cadence['low-120hz'].movement/cadence['high-120hz'].movement-1)<.05,'Low quality must preserve swimming speed');
   assert.equal(cadence['paused-120hz'].frames,0);assert.equal(cadence['hidden-120hz'].frames,0);
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
