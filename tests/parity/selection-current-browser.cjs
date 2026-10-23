/* Current minimal-home UI -> real pointer/touch -> production selection.
 * Two existing clownfish and a camera station are controlled fixtures; animation
 * is frozen and observation uses explicit steps. Not an unassisted journey,
 * device performance measurement or physical-phone certification. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'../../qa/parity'),checks=[],errors=[];fs.mkdirSync(out,{recursive:true});
const modes=[{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
function check(mode,name,pass,detail){checks.push({mode:mode.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode.id+' '+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
async function press(page,mode,selector){if(mode.touch)await page.locator(selector).tap();else await page.locator(selector).click();}
async function point(page,mode,p){const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p);if(hit!=='ocean')throw Error('Actual world input intercepted by '+hit+' at '+JSON.stringify(p));if(mode.touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function drag(page,mode,start,end,back=false){
 if(!mode.touch){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});if(back)await page.mouse.move(start.x,start.y,{steps:6});await page.mouse.up();return;}
 const cdp=await page.context().newCDPSession(page);
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...start}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:start.x+(end.x-start.x)*i/6,y:start.y+(end.y-start.y)*i/6}]});if(back)for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:end.x+(start.x-end.x)*i/6,y:end.y+(start.y-end.y)*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await cdp.detach();}
}
async function run(browser,mode){
 const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,isMobile:mode.touch,hasTouch:mode.touch}),page=await context.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));
 await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{adaptive:false,startWithSound:false,reduced:true,third:false,lookLock:false}})));
 try{
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});
  await press(page,mode,'#startBtn');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
  check(mode,'visible start button enters current unrestricted swimming',await page.evaluate(()=>voyage.state.mode==='free'&&renderer.sceneLoad.compiled&&!modal));
  await page.evaluate(async()=>{
   window.__freeze=true;stopAuto();resetInput();settings.third=false;settings.lookLock=false;settings.hints=true;
   await __prepareView([-80,-5,30],[-80,-5,27.5],8);
   window.__pickActors=life.filter(f=>SPECIES[f.species].id==='clown').slice(0,2);if(__pickActors.length!==2)throw Error('Fixture requires two existing clownfish');
   window.__pickRender=()=>{updateCamera(.1);oceanFeatures.call('afterCamera',0);applyVisualSettings();if(renderer.render(eye,target,t)===false)throw Error('Selection fixture geometry is not resident');updateHUD();};
   window.__pickFixture=()=>{oceanSelection.clear();oceanEcology.setTool(null);stopAuto();resetInput();player.p=[-80,-5,30];player.yaw=0;player.pitch=0;for(const f of life)f.p=[1000,-100,1000];__pickActors[0].p=[-80,-5,27.5];__pickActors[1].p=[-79.4,-5,27.5];for(const f of __pickActors){f.ecologyPresent=true;f.retreat=0;f.faunaVisibility=1;}cameraCut=true;__pickRender();};
   window.__pickStep=seconds=>{for(let i=0;i<Math.ceil(seconds/.1);i++){observe(.1);oceanEcology.hooks.tick(.1);}__pickRender();};
   window.__pickPoint=index=>{const p=project(animalFocusPoint(__pickActors[index]),renderer.vp),r=$('ocean').getBoundingClientRect();return {x:r.left+(p[0]*.5+.5)*r.width,y:r.top+(.5-p[1]*.5)*r.height};};
   __pickFixture();if(!__pickActors.every(f=>oceanSelection.valid(f)))throw Error('Fixture must retain production range and unobstructed sight gates');__pickStep(2);
  });
  check(mode,'ordinary gaze never selects, displays a name, or awards knowledge',await page.evaluate(()=>!focusFish&&!oceanSelection.target()&&!oceanEcology.state().field.clown&&!persistent.seen.includes('clown')&&$('focusCard').classList.contains('hidden')));
  if(!mode.touch){const p=await page.evaluate(()=>__pickPoint(0));await page.mouse.move(p.x,p.y);await page.evaluate(()=>__pickStep(1));check(mode,'real desktop hover remains a hint with no selection or knowledge',await page.evaluate(()=>!oceanSelection.target()&&!oceanEcology.state().field.clown&&$('focusCard').classList.contains('hidden')&&!$('selectionMarker').classList.contains('hidden')));}
  const before=await page.evaluate(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch}));await point(page,mode,await page.evaluate(()=>__pickPoint(0)));
  check(mode,'real pointer selects the intended existing UID without moving the swimmer',await page.evaluate(b=>oceanSelection.target()?.uid===__pickActors[0].uid&&V.dist(b.p,player.p)===0&&b.yaw===player.yaw&&b.pitch===player.pitch,before));
  await page.evaluate(()=>__pickStep(1.6));check(mode,'selected observation reaches the original ecology record',await page.evaluate(()=>persistent.seen.includes('clown')&&oceanEcology.knowledge(oceanEcology.state().field.clown)>=1&&oceanEcology.snapshot().target===__pickActors[0].uid));
  const layout=await page.evaluate(()=>{const r=$('focusCard').getBoundingClientRect(),p=__pickPoint(0);return {card:r.toJSON(),centreHit:document.elementFromPoint(innerWidth/2,innerHeight/2)?.id,subjectHit:document.elementFromPoint(p.x,p.y)?.id,visible:!$('focusCard').classList.contains('hidden')};});
  check(mode,'selected card stays on screen and leaves centre and subject directly clickable',layout.visible&&layout.centreHit==='ocean'&&layout.subjectHit==='ocean'&&layout.card.left>=0&&layout.card.right<=mode.width+1&&layout.card.top>=0&&layout.card.bottom<=mode.height+1,layout);
  await page.screenshot({path:path.join(out,'selection-current-'+mode.id+'.png')});
  await press(page,mode,'#clearSelection');await page.evaluate(()=>__pickStep(.2));check(mode,'actual close button clears observation and interaction targets',await page.evaluate(()=>!focusFish&&!oceanSelection.target()&&!oceanEcology.snapshot().target));
  await point(page,mode,await page.evaluate(()=>__pickPoint(1)));check(mode,'second same-species tap selects its distinct UID',await page.evaluate(()=>oceanSelection.target()?.uid===__pickActors[1].uid));
  const blank=await page.evaluate(()=>{for(const y of [.52,.60,.68])for(const x of [.15,.85,.30,.70]){const p={x:innerWidth*x,y:innerHeight*y};if(document.elementFromPoint(p.x,p.y)?.id==='ocean'&&!oceanSelection.pick(p.x,p.y))return p;}throw Error('No unobstructed blank fixture input point');});
  await point(page,mode,blank);await page.evaluate(()=>__pickStep(.2));check(mode,'actual blank-water tap cancels rather than selecting a nearby fish',await page.evaluate(()=>!focusFish&&!oceanSelection.target()));
  // A visible temporary rock and its matching production collision object.
  // Do not replace blocked(), force valid(), or fabricate a selection.
  const occlusion=await page.evaluate(()=>{__pickFixture();const p=[-80,-5,28.75],s=[.22,.22,.22],g=new Geometry();g.material=2;g.sphere([0,0,0],s,[.33,.37,.34],16,10);window.__pickRock=renderer.batch(g,[{p,s:[1,1,1],yaw:0}],0,false);obstacles.push({p,s});reefObstacleCandidates.invalidate();renderer.forceShadow=true;__pickRender();return {blocked:blocked(eye,animalFocusPoint(__pickActors[0])),valid:oceanSelection.valid(__pickActors[0])};});
  await point(page,mode,await page.evaluate(()=>__pickPoint(0)));check(mode,'real tap cannot select the individual hidden by the matching rock and collider',occlusion.blocked&&!occlusion.valid&&await page.evaluate(()=>!oceanSelection.target()),occlusion);
  await page.evaluate(()=>{obstacles.pop();reefObstacleCandidates.invalidate();__pickRock.visible=false;renderer.forceShadow=true;__pickFixture();});await point(page,mode,await page.evaluate(()=>__pickPoint(0)));await page.evaluate(()=>__pickStep(.2));check(mode,'removing the obstruction restores the same actual UID',await page.evaluate(()=>oceanSelection.target()?.uid===__pickActors[0].uid));await press(page,mode,'#clearSelection');
  if(mode.touch){const controls=await page.evaluate(()=>['joystick','upBtn','downBtn','photoBtn','boostBtn'].map(id=>({id,...$(id).getBoundingClientRect().toJSON()})));check(mode,'current single-stick, depth, camera and boost controls remain reachable',controls.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=mode.width&&r.top>=0&&r.bottom<=mode.height),controls);}
  // UI checks allow the unchanged 120ms ecology paint interval.
  // Raw CDP touch drags are last: mixing their IDs can suppress later
  // Playwright taps in Chrome. No synthetic selection calls replace input.
  await page.evaluate(()=>__pickFixture());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const start=await page.evaluate(()=>__pickPoint(0));await drag(page,mode,start,{x:start.x+55,y:start.y},true);await page.evaluate(()=>__pickStep(.2));check(mode,'real out-and-back drag never becomes a click on release',await page.evaluate(()=>!oceanSelection.target()));
  await page.evaluate(()=>__pickFixture());const yaw=await page.evaluate(()=>player.yaw);await drag(page,mode,start,{x:start.x+55,y:start.y});check(mode,'real one-way drag rotates the camera and selects nothing',await page.evaluate(y=>Math.abs(player.yaw-y)>.02&&!oceanSelection.target(),yaw));
  check(mode,'compiled native WebGL stays healthy',await page.evaluate(()=>renderer.sceneLoad.compiled&&renderer.gl.getError()===0&&!renderer.gl.isContextLost())&&!errors.some(e=>e.mode===mode.id));
 }catch(error){errors.push({mode:mode.id,message:error.stack});checks.push({mode:mode.id,name:'suite completed',pass:false,detail:error.message});console.error('FAIL '+mode.id+' '+error.message);await page.screenshot({path:path.join(out,'selection-current-'+mode.id+'-failure.png')}).catch(()=>{});}finally{await context.close();}
}
(async()=>{const browser=await pw.chromium.launch(require('./browser-launch.cjs')(true));try{for(const mode of modes)await run(browser,mode);}finally{await browser.close();fs.writeFileSync(path.join(out,'selection-current-browser.json'),JSON.stringify({url,gpuMode:'native Chrome',method:'Actual mouse/touch events with two existing actors, frozen scene, explicit observation steps and a temporary visible obstruction fixture. No real-phone or FPS claim.',checks,errors},null,2));}if(errors.length||checks.some(c=>!c.pass))process.exitCode=1;})().catch(error=>{console.error(error);process.exitCode=1;});
