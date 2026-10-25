/* Real browser rendering after an injected GL allocation failure and real
 * region requests returning 404. Fault injection is not a physical OOM claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs')(true)),rows=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},hasTouch:touch,isMobile:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();await page.waitForFunction(()=>window.__ocean?.active&&lastCompleteView);
  // A focused native button must activate through Space, without taking a photo.
  const photos=await page.evaluate(()=>oceanFeatures.state('photography').film.length);await page.locator('#pauseBtn').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!!window.__ocean.modal);assert.equal(await page.evaluate(()=>oceanFeatures.state('photography').film.length),photos);await page.keyboard.press('Escape');
  const allocation=await page.evaluate(async()=>{
   await __prepareView([0,-8,7],[0,-8,-10],8);settings.adaptive=false;renderer.render(eye,target,t);
   const g=renderer.gl,old=[renderer.canvas.width,renderer.canvas.height],frame=renderer.frame,check=g.checkFramebufferStatus.bind(g);let attempts=0;
   g.checkFramebufferStatus=(...args)=>++attempts===1?g.FRAMEBUFFER_UNSUPPORTED:check(...args);
   renderer.dynamicScale=.8;renderer.resize();let rendered;
   try{rendered=renderer.render(eye,target,t);}finally{g.checkFramebufferStatus=check;}
   const pixels=new Uint8Array(32*32*4);g.bindFramebuffer(g.FRAMEBUFFER,null);g.readPixels(Math.floor(renderer.canvas.width/2)-16,Math.floor(renderer.canvas.height/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,pixels);
   const failure={rendered,old,retained:[renderer.canvas.width,renderer.canvas.height],advanced:renderer.frame-frame,max:Math.max(...pixels.filter((_,i)=>i%4!==3)),error:g.getError(),diagnostic:!!renderer.resizeFailure};
   renderer.dynamicScale=.7;renderer.resize();renderer.render(eye,target,t);failure.recovered={size:[renderer.canvas.width,renderer.canvas.height],failure:!!renderer.resizeFailure,error:g.getError()};window.__freeze=false;return failure;
  });
  assert.deepEqual(allocation.retained,allocation.old);assert(allocation.advanced>0&&allocation.max>10&&allocation.diagnostic);assert.equal(allocation.error,0);assert.equal(allocation.recovered.failure,false);assert.equal(allocation.recovered.error,0);assert.notDeepEqual(allocation.recovered.size,allocation.old);
  await page.waitForFunction(()=>lastCompleteView&&Math.hypot(...lastCompleteView.p.map((v,i)=>v-[0,-8,7][i]))<1);
  const stable=await page.evaluate(()=>window.__ocean.position),requests=new Map();let offline=true;
  await page.route('**/assets/scene/chunk-*.bin.gz',async route=>{if(!offline)return route.continue();const u=route.request().url();requests.set(u,(requests.get(u)||0)+1);return route.fulfill({status:404,body:'unavailable'});});
  const cold=await page.evaluate(()=>{
   const options=[[600,-8,-90],[766,-700,-90],[766,-7000,-120]],p=options.find(p=>[...renderer.sceneStream.needed(p)].some(id=>!renderer.sceneStream.meshes[id].resident));if(!p)throw Error('No cold region available');__renderView(p,[p[0],p[1],p[2]-10],8);window.__freeze=false;return p;
  });
  await page.locator('#sceneStreamingRetry').waitFor({state:'visible',timeout:30000});assert(requests.size>0);assert(Math.max(...requests.values())<=3);
  await page.locator('#sceneStreamingReturn').click();await page.waitForFunction(()=>!renderer.sceneStream.waitStarted);const returned=await page.evaluate(()=>window.__ocean.position);assert(Math.hypot(...returned.map((v,i)=>v-stable[i]))<1);
  // Revisit the failed area, then repair the actual network and use its button.
  await page.evaluate(p=>{__renderView(p,[p[0],p[1],p[2]-10],8);window.__freeze=false;},cold);await page.locator('#sceneStreamingRetry').waitFor({state:'visible'});offline=false;await page.locator('#sceneStreamingRetry').click();await page.waitForFunction(()=>!renderer.sceneStream.waitStarted,null,{timeout:120000});
  const resumed=await page.evaluate(()=>({position:window.__ocean.position,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),frame:renderer.frame}));assert.equal(resumed.gl,0);assert.equal(resumed.lost,false);assert(Math.abs(resumed.position[0]-cold[0])<1);assert.deepEqual(errors,[]);
  rows.push({touch,allocation,failedChunks:requests.size,maxAutomaticAttempts:Math.max(...requests.values()),stable,returned,cold,resumed});await context.close();
 }}finally{await browser.close();fs.mkdirSync(path.resolve(__dirname,'../../qa/parity'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../qa/parity/swimming-recovery.json'),JSON.stringify(rows,null,2));}
 console.log('PASS desktop/touch native Space, retained GL pixels, allocation recovery, failed-region return and retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
