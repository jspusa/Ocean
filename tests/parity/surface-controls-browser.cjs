/* Real browser input/camera/save integration. Near-surface positioning is an
 * explicit fixture; this is not a full swim from spawn or a physical-phone test. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
let pw;for(const name of [process.env.PLAYWRIGHT_PATH,'playwright','/opt/codex/cua_node/lib/node_modules/playwright'].filter(Boolean)){try{pw=require(name);break}catch{}}
if(!pw)throw Error('Playwright required');
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8000/';
const out=path.resolve(__dirname,'../../qa/parity');fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];const check=(name,value,detail)=>{results.push({name,pass:!!value,detail});console.log((value?'PASS ':'FAIL ')+name);if(!value)throw Error(name)};
const modes=[{id:'desktop',width:1100,height:740,touch:false},{id:'portrait',width:390,height:844,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait'].includes(a))||process.argv.includes('--'+m.id));
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mode of modes){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,isMobile:mode.touch,hasTouch:mode.touch}),page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',error=>errors.push({mode:mode.id,error:error.message}));
  await page.addInitScript(()=>{if(!localStorage.getItem('return-blue.shilang.v1'))localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:0,adaptive:false,startWithSound:false,reduced:true}}));});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});
  const click=selector=>mode.touch?page.locator(selector).tap():page.locator(selector).click();
  const paint=()=>page.evaluate(()=>{updateLife(t);updateCamera();oceanFeatures.call('afterCamera',0);applyVisualSettings();renderer.render(eye,target,t)});
  const place=()=>page.evaluate(()=>{oceanSwimActions.exit();resetInput();auto=false;follow=null;player.p=[0,-.8,23];player.yaw=.2;player.pitch=-.2;settings.third=true;cameraCut=true;updateCamera();});
  const menu=async()=>{await click('#pauseBtn');await click('.menu-advanced>summary')};
  await click('#startBtn');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
  await menu();check(mode.id+' deep gate is explained without adding a permanent control',await page.evaluate(()=>$('surfaceLookBtn').disabled&&$('surfaceLookBtn').closest('details').open&&!document.querySelector('#hud #surfaceLookBtn')));await click('#closePanel');
  await place();const before=await page.evaluate(()=>({p:player.p.slice(),yaw:player.yaw}));
  if(mode.touch){await menu();await click('#quickTurnBtn')}else await page.keyboard.press('z');
  check(mode.id+' real input quickly turns without moving or keeping follow',await page.evaluate(old=>Math.abs(Math.cos(player.yaw-old.yaw)+1)<1e-8&&V.dist(player.p,old.p)<1e-8&&!auto&&!follow,before));
  if(mode.touch){await menu();await click('#surfaceLookBtn')}else await page.keyboard.press('u');
  await paint();check(mode.id+' actual world camera looks above water while diver stays submerged',await page.evaluate(()=>oceanSwimActions.isSurface()&&eye[1]>.1&&player.p[1]<-.65&&settings.third&&!diverBatch.visible&&renderer.gl.getError()===0));
  await page.screenshot({path:path.join(out,'surface-look-'+mode.id+'.png'),timeout:90000});
  if(!mode.touch){
   const yaw=await page.evaluate(()=>player.yaw);await page.mouse.move(500,300);await page.mouse.down();await page.mouse.move(680,340,{steps:6});await page.mouse.up();await paint();
   check('desktop drag genuinely changes surface view',await page.evaluate(old=>oceanSwimActions.isSurface()&&Math.abs(player.yaw-old)>.1&&eye[1]>0,yaw));
   await page.keyboard.down('q');await page.evaluate(()=>updatePlayer(.2));await page.keyboard.up('q');await paint();check('keyboard down returns to normal underwater camera',await page.evaluate(()=>!oceanSwimActions.isSurface()&&eye[1]<0&&player.p[1]<-.8));
   await place();await page.evaluate(()=>{window.__surfacePad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__surfacePad]});window.__surfacePadPress=index=>{__surfacePad.buttons.forEach((b,i)=>{b.pressed=i===index;b.value=b.pressed?1:0});pollGamepad()}});
   const padYaw=await page.evaluate(()=>{__surfacePadPress(4);return player.yaw});await page.evaluate(()=>pollGamepad());check('real gamepad poll turns once on LB edge',await page.evaluate(yaw=>Math.abs(Math.cos(yaw-.2)+1)<1e-8&&player.yaw===yaw,padYaw));
   await page.evaluate(()=>{__surfacePadPress(-1);__surfacePadPress(5)});await paint();check('gamepad RB enters actual surface view',await page.evaluate(()=>oceanSwimActions.isSurface()&&eye[1]>0));
   const padLook=await page.evaluate(()=>player.yaw);await page.evaluate(()=>{__surfacePad.axes[2]=.6;pollGamepad();updatePlayer(.2);updateCamera()});check('gamepad right stick looks around without leaving surface',await page.evaluate(yaw=>oceanSwimActions.isSurface()&&player.yaw>yaw,padLook));
   await page.evaluate(()=>{__surfacePad.axes=[0,-.6,0,0];pollGamepad();updatePlayer(.2);updateCamera()});check('gamepad left stick recovers swimming',await page.evaluate(()=>!oceanSwimActions.isSurface()&&eye[1]<0));
   await page.evaluate(()=>{__surfacePad.axes=[0,0,0,0];__surfacePadPress(-1)});await place();await page.keyboard.press('u');await page.keyboard.press('z');
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('return-blue.voyage.1')).resume);check('save keeps diver pose instead of above-water camera coordinates',saved.p[1]<0&&saved.pitch===0,saved);
   await page.reload();await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});await click('#shipContinue');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
   check('reload restores heading and position in normal swimming mode',await page.evaluate(saved=>!oceanSwimActions.isSurface()&&V.dist(player.p,saved.p)<.001&&Math.abs(player.yaw-saved.yaw)<.001,saved));
  }else{
   // Native touch drag is last: CDP touch IDs can suppress later synthetic taps.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const session=await context.newCDPSession(page),yaw=await page.evaluate(()=>player.yaw);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:230,y:360,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:315,y:390,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await paint();
   check('native touch drag rotates actual surface camera',await page.evaluate(old=>oceanSwimActions.isSurface()&&Math.abs(player.yaw-old)>.1&&eye[1]>0,yaw));
   const button=await page.locator('#downBtn').boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2,id:2}]});await page.evaluate(()=>{updatePlayer(.2);updateCamera()});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   check('native touch depth button exits surface mode and resumes diving',await page.evaluate(()=>!oceanSwimActions.isSurface()&&player.p[1]<-.8&&eye[1]<0));await session.detach();
  }
  await context.close();
 }}finally{await browser.close();results.push({name:'no browser runtime errors',pass:errors.length===0,detail:errors});fs.writeFileSync(path.join(out,'surface-controls-browser.json'),JSON.stringify({results,errors,fixture:'Explicit near-surface positions and deterministic physics steps; actual DOM keyboard/touch and production gamepad poll. Not physical devices or a complete first-game comparison.'},null,2));}
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
