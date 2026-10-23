/* Real network and WebGL geographic residency. Small identical framebuffers
 * make lifecycle checks practical; these are not device FPS/power measurements. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/',rows=[],errors=[];
const sha=pixels=>crypto.createHash('sha256').update(Buffer.from(pixels,'base64')).digest('hex');
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),requests=[];let delayRegions=false;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('**/assets/scene/*.bin.gz',async route=>{if(delayRegions)await new Promise(resolve=>setTimeout(resolve,400));await route.continue();});
  await page.addInitScript(({mobile})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:mobile?1:2,adaptive:false,reduced:true,startWithSound:false}})),{mobile});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:180000});
  const initial=await page.evaluate(()=>{renderer.sceneStream.stats();return {...renderer.sceneLoad,totalChunks:renderer.sceneStream.index.chunks.length,totalMeshes:renderer.sceneStream.meshes.length,totalCompressed:renderer.sceneStream.index.chunks.reduce((sum,c)=>sum+c.bytes,0)};});
  assert.equal(initial.streamed,true);assert(initial.residentMeshes>0&&initial.residentMeshes<initial.totalMeshes);assert(initial.fetchedChunks<initial.totalChunks);assert(initial.fetchedBytes<initial.totalCompressed);assert(initial.residentGeometryBytes<46572870);
  assert(requests.some(r=>/assets\/scene\/index\.json/.test(r)));assert(requests.some(r=>/assets\/scene\/.*\.bin\.gz/.test(r)));assert(!requests.some(r=>/reef\.mesh\.gz/.test(r)),'Modular boot must not fetch the complete scene archive');
  await page.evaluate(async()=>{settings.third=false;settings.adaptive=false;await __prepareView([0,-8,7],[0,-8,-10],8);});
  await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0,null,{timeout:120000});
  const before=await page.evaluate(()=>{
   const gl=renderer.gl,pixels=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);renderer.render(eye,target,t);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   window.__streamPinned=renderer.sceneStream.meshes.filter(m=>m.pinned).map(m=>({m,vb:m.batches[0].vb,eb:m.batches[0].eb}));
   window.__streamOldStatic=renderer.sceneStream.meshes.filter(m=>m.resident&&!m.pinned).map(m=>({m,vao:m.batches[0].vao,vb:m.batches[0].vb,eb:m.batches[0].eb}));
   let text='';for(let i=0;i<pixels.length;i+=16384)text+=String.fromCharCode(...pixels.subarray(i,i+16384));return {pixels:btoa(text),geometryBytes:renderer.sceneLoad.residentGeometryBytes,pinned:__streamPinned.length};
  });
  // Delay a not-yet-loaded deep destination. The actual renderer must retain its
  // previous frame and pause simulation instead of displaying incomplete geometry.
  delayRegions=true;
  const gate=await page.evaluate(()=>{
   const gl=renderer.gl,read=()=>{const a=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};renderer.render(eye,target,t);const prior=read();
   const drawn=renderer.render([766,-7000,-120],[766,-7000,-145],t),after=read();
   const oldRAF=window.requestAnimationFrame,oldFocus=document.hasFocus;window.requestAnimationFrame=()=>0;document.hasFocus=()=>true;window.__freeze=false;eye=[766,-7000,-120];target=[766,-7000,-145];
   const position=player.p.slice(),time=t;keys.add('KeyW');animate(lastTime+1000/60);keys.clear();window.__freeze=true;window.requestAnimationFrame=oldRAF;document.hasFocus=oldFocus;
   return {drawn,priorNonblank:prior.some((v,i)=>i%4!==3&&v>20),held:prior.every((v,i)=>v===after[i]),wait:!!renderer.sceneStream.waitStarted,positionHeld:position.every((v,i)=>v===player.p[i]),timeHeld:time===t};
  });
  assert.equal(gate.drawn,false);assert.equal(gate.priorNonblank,true);assert.equal(gate.held,true);assert.equal(gate.wait,true);assert.equal(gate.positionHeld,true);assert.equal(gate.timeHeld,true);delayRegions=false;
  await page.evaluate(async()=>{await __prepareView([766,-7000,-120],[766,-7000,-145],8);});
  await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0,null,{timeout:120000});
  const deep=await page.evaluate(()=>{
   const stream=renderer.sceneStream,now=performance.now();for(const m of stream.meshes)if(!m.pinned)m.lastNeeded=now-6001;stream.lastTrim=0;stream.lastEye=null;stream.update(eye);stream.stats();
   const gl=renderer.gl,deleted=__streamOldStatic.filter(x=>!x.m.resident);return {...renderer.sceneLoad,deletedMeshes:deleted.length,deletedVAOs:deleted.every(x=>!gl.isVertexArray(x.vao)),deletedBuffers:deleted.every(x=>!gl.isBuffer(x.vb)&&!gl.isBuffer(x.eb)),pinnedIntact:__streamPinned.every(x=>x.m.resident&&gl.isBuffer(x.vb)&&gl.isBuffer(x.eb)),gl:gl.getError()};
  });
  assert(deep.deletedMeshes>0);assert.equal(deep.deletedVAOs,true);assert.equal(deep.deletedBuffers,true);assert.equal(deep.pinnedIntact,true);assert(deep.residentGeometryBytes<before.geometryBytes);assert.equal(deep.gl,0);
  await page.evaluate(async()=>{renderer.sceneStream.lastEye=null;await __prepareView([0,-8,7],[0,-8,-10],8);});
  const returned=await page.evaluate(()=>{const gl=renderer.gl;renderer.forceShadow=true;renderer.render(eye,target,t);const a=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);let text='';for(let i=0;i<a.length;i+=16384)text+=String.fromCharCode(...a.subarray(i,i+16384));return {pixels:btoa(text),gl:gl.getError(),pinnedIntact:__streamPinned.every(x=>x.m.resident&&gl.isBuffer(x.vb)&&gl.isBuffer(x.eb))};});
  assert.equal(sha(returned.pixels),sha(before.pixels),'Reacquired reef geometry must produce the same fixed-time pixels');assert.equal(returned.gl,0);assert.equal(returned.pinnedIntact,true);assert(!requests.some(r=>/reef\.mesh\.gz/.test(r)));
  const row={mobile,initial,reefGeometryBytes:before.geometryBytes,deep,gate,reefSHA256:sha(before.pixels),returnedSHA256:sha(returned.pixels),legacyArchiveRequests:requests.filter(r=>/reef\.mesh\.gz/.test(r)).length};rows.push(row);
  console.log('PASS '+(mobile?'touch':'desktop')+' streamed boot '+initial.fetchedBytes+' bytes; held incomplete destination, released '+deep.deletedMeshes+' far meshes, restored exact reef pixels');await context.close();
 }}finally{await browser.close();}
 assert.deepEqual(errors,[]);const out=path.resolve(__dirname,'../../qa/parity/scene-streaming-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({rows,errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
