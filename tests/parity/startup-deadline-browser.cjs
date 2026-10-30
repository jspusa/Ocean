/* Native Chrome + real HTTP bodies that stop mid-transfer. No fake clock,
 * production method replacement, coordinates, saves or quality overrides. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'qa/parity'),rows=[],errors=[];
const prefix=process.env.QA_PREFIX||'v01813-startup-native';
const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.json':'application/json','.gz':'application/octet-stream'};
let mode='healthy',requests=[],held=[];
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 if(mode==='scene-body'&&pathname==='/assets/scene/index.json'){res.writeHead(503);res.end('fixture: stream index unavailable');return;}
 const stallImage=mode==='image-body'&&pathname==='/assets/turtle_atlas_v50.jpg';
 const stallScene=mode==='scene-body'&&pathname==='/assets/reef.mesh.gz';
 if(stallImage||stallScene){
  const row={url:req.url,kind:stallImage?'image':'scene',started:Date.now(),closed:null,complete:false};requests.push(row);held.push(res);
  res.on('close',()=>{row.closed=Date.now();row.complete=res.writableFinished;});
  const bytes=fs.readFileSync(file);res.writeHead(200,{'Content-Type':type[path.extname(file)],'Content-Length':bytes.length,'Cache-Control':'no-store'});res.write(bytes.subarray(0,64));
  console.log('HTTP partial body held: '+req.url);return;
 }
 res.writeHead(200,{'Content-Type':type[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
function release(){for(const res of held)if(!res.destroyed)res.destroy();held=[];}
async function move(page,touch){
 const before=await page.evaluate(()=>__ocean.position);
 if(touch){const cdp=await page.context().newCDPSession(page);let contact=false;try{const b=await page.locator('#joystick').boundingBox();assert(b);const p={id:1,x:b.x+b.width/2,y:b.y+b.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});contact=true;p.y-=b.height*.4;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await page.waitForTimeout(900);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});contact=false;}finally{try{if(contact)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}finally{await cdp.detach();}}}
 else{await page.keyboard.down('w');try{await page.waitForTimeout(900);}finally{await page.keyboard.up('w');}}
 const after=await page.evaluate(()=>__ocean.position),input=await page.evaluate(()=>__ocean.input);assert(Math.hypot(...after.map((x,i)=>x-before[i]))>.1,'Normal controls must move the diver');assert.deepEqual(input,{move:[0,0],look:[0,0],vertical:0});return {before,after,input};
}
async function start(page,touch){
 await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:180000});await page.locator('#loading').waitFor({state:'hidden'});
 if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
 await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
 const movement=await move(page,touch),state=await page.evaluate(()=>({version:document.documentElement.dataset.version,adaptive:settings.adaptive,quality:renderer.quality,compiled:renderer.sceneLoad.compiled,streamed:!!renderer.sceneLoad.streamed,species:SPECIES.length,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),mode:voyage.state.mode,focus:!!focusFish}));
 assert(state.adaptive);assert.equal(state.quality,touch?1:2);assert.equal(state.gl,0);assert.equal(state.lost,false);assert.equal(state.mode,'free');assert.equal(state.focus,false);return {state,movement};
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  if(!process.argv.includes('--scene-only'))for(const touch of [false,true]){
   mode='image-body';requests=[];const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1000,height:700},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#errorBox').waitFor({state:'visible',timeout:55000});
   const failure=await page.evaluate(()=>({title:$('errorTitle').textContent,message:$('errorMessage').textContent,focused:document.activeElement.id,exportHidden:$('errorExportSave').hidden,ready:!!window.__ocean?.ready}));
   assert.match(failure.title,/素材/);assert.match(failure.message,/重新嘗試/);assert.equal(failure.focused,'errorRetry');assert(failure.exportHidden);assert(!failure.ready);
   assert.equal(requests.length,3);assert.equal(new Set(requests.map(r=>r.url)).size,3);
   // Let the network process deliver close notifications, without releasing
   // fixture responses: cancellation must originate from the game itself.
   for(let n=0;n<20&&requests.some(r=>!r.closed);n++)await page.waitForTimeout(50);
   assert(requests.every(r=>r.closed&&!r.complete&&r.closed-r.started>=11000&&r.closed-r.started<16000),'Each image body must be canceled at its real deadline');
   const attempts=JSON.parse(JSON.stringify(requests));await page.screenshot({path:path.join(out,prefix+'-'+(touch?'touch':'desktop')+'-error.png')});
   mode='healthy';if(touch)await page.locator('#errorRetry').tap();else await page.locator('#errorRetry').click();
   const recovered=await start(page,touch);assert(recovered.state.compiled&&recovered.state.streamed);
   await page.screenshot({path:path.join(out,prefix+'-'+(touch?'touch':'desktop')+'-recovered.png')});
   rows.push({case:'image partial-body timeout, retry and natural swimming',touch,attempts,failure,...recovered});console.log('PASS '+(touch?'touch':'desktop')+' real image deadline, source cancellation, visible retry and swimming');
   await context.close();release();
  }
  if(!process.argv.includes('--images-only')){
   mode='scene-body';requests=[];const context=await browser.newContext({viewport:{width:800,height:600},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});const fallback=await start(page,false);
   assert.equal(requests.length,1);assert(requests[0].closed&&!requests[0].complete);assert(requests[0].closed-requests[0].started>=59000);assert(requests[0].closed-requests[0].started<70000);
   assert.equal(fallback.state.compiled,false);assert.equal(fallback.state.streamed,false);assert.equal(fallback.state.species,42);
   await page.screenshot({path:path.join(out,prefix+'-procedural.png')});rows.push({case:'complete scene partial-body timeout to playable procedural world',attempts:requests,...fallback});console.log('PASS full scene real 60-second body deadline and playable procedural fallback');
   await context.close();release();
  }
  assert.deepEqual(errors,[]);
 }finally{
  await browser.close();release();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify({method:'Native Chrome real HTTP partial bodies and wall time, real UI retry and keyboard/CDP touch swimming. Desktop touch emulation; not physical-phone or FPS evidence.',browser:browser.version(),rows,errors},null,2));
 }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();release();});
