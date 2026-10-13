import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.slice(2).find(a=>!a.startsWith('--'))||'http://127.0.0.1:8765/';const mobile=process.argv.includes('--mobile');
const browser=await pw.chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true});
const ctx=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,acceptDownloads:true});
const page=await ctx.newPage();const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);};
const eq=async(name,expression)=>{try{check(name,await page.evaluate(expression))}catch(e){check(name,false,e.message)}};
await mkdir('qa/v08',{recursive:true});
try{
 await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),{timeout:90000});
 await eq('Compiled scene and shaders boot',()=>window.__ocean?.ready&&renderer.sceneLoad.compiled&&renderer.gl.getError()===0);
 await eq('Stable creature IDs and existing content',()=>SPECIES.length===27&&LANDMARKS.length===9&&new Set([...life,...decorLife,...shoal].map(f=>f.uid)).size===life.length+decorLife.length+shoal.length);
 await eq('New save uses immersive view and adaptive quality',()=>!settings.third&&settings.adaptive);
 await page.evaluate(()=>{window.__freeze=true;$('welcomeAudio').checked=false;});
 await page.locator('#shipSettings').click();await page.waitForFunction(()=>document.activeElement?.id==='closePanel');
 await page.locator('#fovRange').focus();await page.keyboard.press('Home');for(let i=0;i<27;i++)await page.keyboard.press('ArrowRight');await page.locator('#clarityRange').focus();await page.keyboard.press('Home');for(let i=0;i<13;i++)await page.keyboard.press('ArrowRight');
 await eq('View and water controls apply',()=>settings.fov===82&&renderer.fov===82&&settings.clarity===1.15&&renderer.clarity===1.15);
 await page.locator('[data-view="third"]').click();await page.locator('#closePanel').click();
 await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 await eq('View, clarity and FOV survive reload',()=>settings.third&&settings.fov===82&&settings.clarity===1.15);
 await page.evaluate(()=>{window.__freeze=true;settings.fov=69;settings.clarity=.88;settings.third=false;settings.sound=false;$('welcomeAudio').checked=false;});
 await page.locator('#startBtn').click();await page.waitForFunction(()=>document.getElementById('welcome').classList.contains('hidden'));
 await eq('Start dive at anchorage',()=>active&&V.dist(player.p,oceanNavigation.entry())<.01);
 await page.keyboard.down('w');const before=await page.evaluate(()=>player.p.slice());await page.evaluate(()=>{for(let i=0;i<120;i++)updatePlayer(1/120)});await page.keyboard.up('w');
 check('WASD moves the diver',(await page.evaluate(()=>player.p.slice())).some((x,i)=>Math.abs(x-before[i])>.2));
 await page.keyboard.press('Escape');await eq('Escape pauses',()=>modal==='pause');await page.locator('#resumeBtn').click();
 const oldYaw=await page.evaluate(()=>player.yaw);await page.mouse.move(600,450);await page.mouse.down();await page.mouse.move(710,490,{steps:6});await page.mouse.up();
 if(!mobile)check('Drag camera rotates',Math.abs(await page.evaluate(()=>player.yaw)-oldYaw)>.1);
 await page.keyboard.press('x');await eq('Photo lens activates',()=>voyage.photoMode&&renderer.photoFov===48);await page.keyboard.press('x');
 await page.evaluate(()=>{voyage.state.mode='free';t=18;updateLife(t);findSpecies(8);updateCamera();applyVisualSettings();renderer.render(eye,target,t);updateHUD();});
 await page.locator('#photoBtn').click();await page.waitForFunction(()=>!voyage.photoBusy&&voyage.state.features.photography.film.length===1);await eq('1920-limited film captures actual JPEG and score',async()=>{const archive=await oceanPhotography.exportArchive(),p=archive.images[0],m=archive.state.film[0];const image=new Image();image.src=p.url;await image.decode();return archive.state.film.length===1&&p.url.startsWith('data:image/jpeg;')&&Number.isFinite(m.grade)&&image.width<=1920});
 await eq('Capture has no WebGL error',()=>renderer.gl.getError()===0);
 const firstId=await page.evaluate(()=>follow.uid);await page.locator('#nextIndividual').click();check('Next individual changes subject',await page.evaluate(()=>follow.uid)!==firstId);
 await page.evaluate(()=>{stopAuto();voyage.state.mode='journey';player.p=LANDMARKS[0].spawn.slice();findSpecies(10)});
 await eq('Story mode preserves exploration gate',()=>!follow&&voyage.state.waypoint==='pelagic');
 await page.keyboard.press('j');check('All 27 guide cards include legacy and new fauna',await page.locator('.species-card').count()===27);await page.locator('#closePanel').click();
 for(const quality of [0,1,2])for(const light of ['day','late','blue']){
  await page.evaluate(({quality,light})=>{renderer.quality=quality;renderer.dynamicScale=1;renderer.resize();settings.lighting=light;settings.third=false;__renderView([0,-8,7],[0,-9,-1],18)}, {quality,light});
  await eq(`Shader render quality ${quality} / ${light}`,()=>renderer.gl.getError()===0);
 }
 await page.evaluate(mobile=>{renderer.quality=mobile?1:2;renderer.resize();settings.lighting='day';settings.adaptive=true;},mobile);
 // This fixture verifies recovery on a 60 Hz frame schedule; not a device FPS claim.
 await page.evaluate(()=>{oceanPerf.pause();oceanPerf.count=0;oceanPerf.cursor=0;oceanPerf.headroom=0;oceanPerf.lastAdaptive=0;oceanPerf.lastUI=1e9;renderer.dynamicScale=.70;renderer.resize();for(let i=1;i<=1500;i++)oceanPerf.record(i*1000/60,4)});
 await eq('Adaptive resolution recovers on 60 Hz',()=>renderer.dynamicScale>.70);
 // Existing story state-machine checks use controlled progress, not a human full playthrough.
 await page.evaluate(()=>{voyage.state=initialVoyage();voyage.state.distance=31;player.p=[LANDMARKS[0].x,-8,LANDMARKS[0].z];voyageTick(.1);persistent.seen=SPECIES.slice(0,3).map(s=>s.id);evaluateOrders();voyage.state.bestPhotos.turtle={score:80,date:Date.now(),individual:'fixture'};evaluateOrders();player.p=[-102,-10,-76];voyageTick(.1);});
 await eq('Arrival, guide, photo and passage objectives',()=>['arrival','naturalist','photographer','passage'].every(x=>voyage.state.completed.includes(x)));
 await eq('Remote logger denied',()=>{player.p=[0,-8,0];return !readLogger()&&!voyage.state.reading});
 await page.evaluate(()=>{player.p=[95,groundHeight(99,-166)+3,-147];readLogger()});await eq('Nearby logger opens story',()=>voyage.state.reading&&modal==='letter');await page.locator('#letterClose').click();
 await page.evaluate(()=>{voyage.state.mode='free';t=9;updateLife(t);findSpecies(10);updateCamera();renderer.render(eye,target,t);voyage.state.mode='journey';for(let i=0;i<42;i++)observeWhale(.1);evaluateOrders()});
 await eq('Actual whale observation completes memory',()=>voyage.state.whaleWatch>=4&&voyage.state.completed.includes('song'));
 await page.evaluate(()=>{togglePhotoMode();goHome()});await eq('Return to ship completes voyage and resets photo lens',()=>!active&&voyage.state.ended&&voyage.state.completed.length===6&&!voyage.photoMode&&!renderer.photoFov);
 await page.locator('#debriefClose').click();await page.evaluate(()=>openPanel('voyage'));
 const dl=page.waitForEvent('download');await page.locator('#exportSave').click();const download=await dl;await download.saveAs(`qa/v08/${mobile?'mobile':'desktop'}-save.json`);check('Save downloads successfully',download.suggestedFilename().endsWith('.json'));
 await eq('Imported settings are bounded, invalid IDs removed',()=>{const x=validateImport({format:'return-blue/save',version:1,voyage:{...initialVoyage(),completed:['BAD','arrival']},journal:{seen:['BAD','clown'],settings:{fov:200,clarity:-1},photos:[{url:'javascript:alert(1)'}]}});return x.state.completed.length===1&&x.settings.fov===90&&x.settings.clarity===.5&&x.photos.length===0&&x.seen.length===1});
 await page.locator('#closePanel').click();await page.evaluate(()=>{$('welcomeAudio').checked=false;startDive(false);$('welcome').classList.add('hidden');});
 for(const [w,h]of [[390,844],[844,390],[768,1024],[1440,900]]){
  await page.setViewportSize({width:w,height:h});await page.evaluate(()=>{resetInput();renderer.resize();updateCamera();renderer.render(eye,target,t)});
  await eq(`No horizontal overflow ${w}×${h}`,()=>document.documentElement.scrollWidth===innerWidth);
  if(mobile){
   await eq(`Touch controls fit ${w}×${h}`,()=>['joystick','lookpad','upBtn','downBtn','photoBtn','pauseBtn','voyageBtn'].every(id=>{let r=$(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5}));
   const overlaps=await page.evaluate(()=>{const elements=[...document.querySelectorAll('#hud button')].filter(x=>x.getBoundingClientRect().width&&x.getBoundingClientRect().height&&getComputedStyle(x).visibility!=='hidden');const bad=[];for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){const a=elements[i].getBoundingClientRect(),b=elements[j].getBoundingClientRect();if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)bad.push([elements[i].id,elements[j].id]);}return bad});check(`Touch button hit areas distinct ${w}×${h}`,!overlaps.length,overlaps);
  }
  if(mobile||w===1440)await page.screenshot({path:`qa/v08/${mobile?'mobile':'desktop'}-${w}x${h}.png`});
 }
 if(mobile){
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>resetInput());const cdp=await ctx.newCDPSession(page);
  const rects=await page.evaluate(()=>['joystick','lookpad'].map(id=>{const r=$(id).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}));
  const pts=rects.map((r,i)=>({...r,id:i+1}));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});pts[0].y-=22;pts[1].x+=20;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts});
  await eq('Concurrent two-finger movement and look',()=>stick[1]<-.3&&lookStick[0]>.3);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await eq('Touch cancellation releases controls',()=>Math.hypot(...stick,...lookStick)===0);
 }
 await page.evaluate(()=>{window.mockPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[mockPad]});mockPad.buttons[7].value=1;pollGamepad();mockPad.connected=false;pollGamepad();});
 await eq('Depth-only controller disconnect cannot leave diver moving',()=>verticalInput===0);
 if(!mobile){
  await page.evaluate(()=>{window.oldPointerLock=$('ocean').requestPointerLock;$('ocean').requestPointerLock=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));settings.lookLock=true;document.body.classList.remove('cinematic');});
  await page.locator('#ocean').click({position:{x:720,y:450}});await page.waitForFunction(()=>!settings.lookLock);
  const yaw=await page.evaluate(()=>player.yaw);await page.mouse.move(710,450);await page.mouse.down();await page.mouse.move(820,470);await page.mouse.up();
  check('Denied mouse lock restores drag fallback',Math.abs(await page.evaluate(()=>player.yaw)-yaw)>.1);
  await page.evaluate(()=>{$('ocean').requestPointerLock=oldPointerLock;});
 }

 await eq('No WebGL errors after interaction matrix',()=>renderer.gl.getError()===0);
 check('No uncaught browser errors',!errors.length,errors);
}catch(e){check('Suite completed',false,e.stack)}finally{
 await writeFile(`qa/v08/${mobile?'mobile':'desktop'}-regression.json`,JSON.stringify({mode:mobile?'Chromium touch emulation':'desktop Chromium',url,checks,errors},null,2));await browser.close();
}
console.log(`${checks.filter(x=>x.pass).length}/${checks.length} passed`);if(checks.some(x=>!x.pass))process.exitCode=1;
