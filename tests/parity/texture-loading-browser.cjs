/* Real WebGL texture loading with injected transient/permanent HTTP failures.
 * Checks recovery and failed-upgrade cleanup without changing visual quality. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';
const rows=[],errors=[],digest=s=>crypto.createHash('sha256').update(Buffer.from(s,'base64')).digest('hex');
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));let phase='boot';const requests=[],releases=[];
  await page.route('**/assets/*.jpg*',async route=>{
   const request=new URL(route.request().url()),target=request.pathname.endsWith('/shell_nor_gl.jpg');
   if(target){requests.push({phase,url:request.href});if(phase==='upgrade'||requests.filter(r=>r.phase==='boot').length===1){await route.fulfill({status:503,contentType:'text/plain',body:'injected temporary texture failure'});return;}}
   if(phase==='upgrade'){
    await new Promise(resolve=>releases.push(resolve));
    try{await route.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.resolve(__dirname,'../../assets',path.basename(request.pathname)))});}catch(error){if(!/closed|canceled|cancelled|handled/i.test(error.message))throw error;}
   }else await route.continue();
  });
  await page.addInitScript(({quality})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,startWithSound:false,reduced:true}})),{quality:mobile?1:2});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert.equal(await page.evaluate(()=>!!window.__ocean?.ready),true,'One HTTP 503 must recover automatically: '+await page.locator('#errorMessage').textContent());
  assert.equal(requests.filter(r=>r.phase==='boot').length,2,'A successful retry must stop further attempts');
  assert.notEqual(requests[0].url,requests[1].url,'Retry must bypass a cached HTTP failure');
  const version=await page.evaluate(()=>document.documentElement.dataset.version);for(const r of requests)assert.equal(new URL(r.url).searchParams.get('v'),version);
  await page.evaluate(async()=>{await __prepareView([0,-8,7],[0,-8,-10],8);});await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0,null,{timeout:120000});
  const capture=()=>page.evaluate(()=>{const g=renderer.gl;renderer.forceShadow=true;renderer.render(eye,target,t);const a=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);g.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);let s='';for(let i=0;i<a.length;i+=16384)s+=String.fromCharCode(...a.subarray(i,i+16384));return {pixels:btoa(s),gl:g.getError(),quality:renderer.quality,scale:renderer.dynamicScale,full:renderer.textureFull};});
  const before=await capture();assert.equal(before.gl,0);phase='upgrade';
  await page.evaluate(()=>{
   // Decoded Image memory caches can bypass a second network request. Give
   // this upgrade fresh fixture URLs so the delayed responses are real.
   window.__oldTextureURLs={};for(const n of ['sand_diff','sand_nor_gl','rock_diff','rock_nor_gl','shell_diff','shell_nor_gl','coral_diff','coral_nor_gl','caustics']){__oldTextureURLs[n]=ASSETS[n];ASSETS[n]+='&_texture_upgrade_fixture=1';}
   window.__oldTextureSet=renderer.textures;window.__oldTextureFull=renderer.textureFull;window.__textureFailure=null;renderer.loadTextures(true).then(()=>{__textureFailure={failed:false};},error=>{__textureFailure={failed:true,message:error.message};});
  });
  await page.waitForFunction(()=>window.__textureFailure!==null,null,{timeout:10000});
  const failure=await page.evaluate(()=>({result:__textureFailure,sameSet:renderer.textures===__oldTextureSet,sameFull:renderer.textureFull===__oldTextureFull,oldAlive:__oldTextureSet.every(t=>renderer.gl.isTexture(t))}));
  assert.equal(failure.result.failed,true);assert.equal(failure.sameSet,true);assert.equal(failure.sameFull,true);assert.equal(failure.oldAlive,true);
  assert.equal(requests.filter(r=>r.phase==='upgrade').length,3,'Permanent failure must stop after initial plus two retries');
  assert(releases.length>0,'Other image responses must still be pending at cleanup');for(const release of releases)release();await page.waitForLoadState('networkidle',{timeout:15000});
  await page.evaluate(()=>{Object.assign(ASSETS,__oldTextureURLs);});
  const after=await capture();assert.equal(after.gl,0,'Late image callbacks may not use deleted GPU textures');
  assert.equal(digest(after.pixels),digest(before.pixels),'Failed upgrade must retain the full original image');
  for(const key of ['quality','scale','full'])assert.equal(after[key],before[key]);
  rows.push({mobile,version,requests,failure,quality:after.quality,scale:after.scale,textureFull:after.full,beforeSHA256:digest(before.pixels),afterSHA256:digest(after.pixels),gl:after.gl});
  console.log('PASS '+(mobile?'touch':'desktop')+' transient503 recovery, bounded failure, late callbacks GL0, exact retained reef');await context.close();
 }}finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/texture-loading-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,method:'Injected actual image HTTP503 responses; real WebGL boot recovery and failed upgrade with delayed other images; full RGBA identity after failure. Not device FPS.',rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
