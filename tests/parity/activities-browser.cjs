/* Natural investigation through visible UI and native keyboard/touch. No state,
 * coordinate, clock or progression writes. Run alone on native Chrome GPU.
 * Touch profiles are desktop emulation, not physical phone acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url',process.argv.find(v=>/^https?:/.test(v))||'http://127.0.0.1:8765/');
const profile=option('profile','desktop'),touch=profile==='touch';
assert(['desktop','touch'].includes(profile));
assert(!new URL(url).searchParams.has('still'),'A frozen scene cannot prove field investigation');
const output=path.resolve(__dirname,'../..',option('out','qa/parity/activities-'+profile+'.json'));
fs.mkdirSync(path.dirname(output),{recursive:true});
const results=[],errors=[],traces=[],observations=[],inputs=[];let metadata=null,fatal=null;
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};

(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));let context,page,session;
 try{
  context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Renderer process crashed'));
  session=await context.newCDPSession(page);
  const contacts=new Map();let moving=false;
  // All touch interactions share one CDP stream. Mixing its pointer IDs with
  // Playwright tap() can suppress later synthetic taps in Chromium.
  const touchEvent=async(type)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:[...contacts.values()]});
  async function touchDown(id,x,y){contacts.set(id,{id,x,y});await touchEvent('touchStart');}
  async function touchMove(id,x,y){contacts.set(id,{id,x,y});await touchEvent('touchMove');}
  // Chromium's native pointer path releases the IDs listed in touchEnd, not
  // the remaining contacts. Sending the joystick here would lift the wrong
  // finger and leave the camera finger down (Chromium issue 569778218).
  async function touchUp(id){const ended=contacts.get(id);assert(ended,'Touch contact must exist before release');contacts.delete(id);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[ended]});}
  async function press(selector){
   const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();
   if(touch){const b=await node.boundingBox();assert(b,'Visible control has no hit box: '+selector);await touchDown(7,b.x+b.width/2,b.y+b.height/2);await touchUp(7);}
   else await node.click();
   await page.waitForTimeout(130);
  }
  async function boot(){
   await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
   assert(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
   await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  }
  async function swim(on){
   if(moving===on)return;moving=on;
   if(!touch){await page.keyboard[on?'down':'up']('w');return;}
   if(!on){await touchUp(1);return;}
   const b=await page.locator('#joystick').boundingBox();assert(b,'Visible touch joystick required');
   const x=b.x+b.width/2,y=b.y+b.height/2;await touchDown(1,x,y);await touchMove(1,x,y-b.width*.31);
  }
  async function aim(yaw,pitch=0){
   // Convert angle error to the same real pointer distance a player drags.
   // Read angles each time, because motion and camera state can change while
   // native input is dispatched. Neither the angle nor position is assigned.
   for(let i=0;i<28;i++){
    const r=await page.evaluate(()=>({yaw:player.yaw,pitch:player.pitch,sense:settings.sensitivity,w:innerWidth,h:innerHeight}));
    const delta=Math.atan2(Math.sin(yaw-r.yaw),Math.cos(yaw-r.yaw));
    let dx=delta/(.0037*r.sense),dy=(r.pitch-pitch)/(.0032*r.sense);
    if(Math.abs(delta)<.025&&Math.abs(r.pitch-pitch)<.025)return;
    const scale=Math.min(1,(r.w*.30)/Math.max(.01,Math.abs(dx)),(r.h*.22)/Math.max(.01,Math.abs(dy)));dx*=scale;dy*=scale;
    // A > 9 px drag is unambiguously camera input. The portrait selection card
    // can cover the nominal center after a fish is selected, so locate a real
    // exposed canvas start point instead of assuming a fixed safe coordinate.
    if(Math.hypot(dx,dy)<10)return;
    const from=await page.evaluate(({dx,dy})=>{
     for(const cy of [.56,.46,.65,.37])for(const cx of [.5,.70,.30]){
      const x=innerWidth*cx-dx/2,y=innerHeight*cy-dy/2;
      if(x<12||x>innerWidth-12||y<80||y>innerHeight-130||x+dx<12||x+dx>innerWidth-12||y+dy<80||y+dy>innerHeight-130)continue;
      if(document.elementFromPoint(x,y)?.id==='ocean')return {x,y};
     }return null;
    },{dx,dy});
    assert(from,'No exposed canvas point for the native camera drag');const {x,y}=from;
    if(touch){await touchDown(2,x,y);await touchMove(2,x+dx,y+dy);await touchUp(2);}
    else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:1});await page.mouse.up();}
    await page.waitForTimeout(35);
    if(touch&&moving)assert(await page.evaluate(()=>stick[1]<-.9),'Turning/releasing the camera finger must not lift the held joystick');
    inputs.push({action:'aim',at:new Date().toISOString(),iteration:i,yaw,pitch,from,dx,dy,before:{yaw:r.yaw,pitch:r.pitch},after:await page.evaluate(()=>({yaw:player.yaw,pitch:player.pitch,stick:stick.slice()}))});
   }
   throw Error('Native camera drag did not converge');
  }
  async function aimAt(point){const p=await page.evaluate(()=>player.p.slice()),v=point.map((n,k)=>n-p[k]);await aim(Math.atan2(v[0],-v[2]),Math.max(-1.2,Math.min(1.2,Math.atan2(v[1],Math.hypot(v[0],v[2])))));}
  async function state(){return page.evaluate(()=>({p:player.p.slice(),active,modal,t,story:oceanStory.snapshot(),context:oceanStory.context(),mode:voyage.state.mode,waypoint:voyage.state.waypoint,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,hidden:document.hidden,focused:document.hasFocus(),lost:renderer.gl.isContextLost(),gl:renderer.gl.getError()}));}
  async function shot(name){const file=output.replace(/\.json$/,'-'+name+'.png');await page.screenshot({path:file});return file;}
  async function layout(label,ids){
   const result=await page.evaluate(ids=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,rects:ids.map(id=>{const e=$(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e};})}),ids);
   check(label+' controls fit and receive input',!result.overflow&&result.rects.every(r=>r.visible&&r.hit&&r.w>=44&&r.h>=44&&r.x>=0&&r.y>=0&&r.right<=result.width&&r.bottom<=result.height),result);
  }
  async function openActivities(){if(await page.evaluate(()=>active)){await press('#fieldToolsBtn');await press('#diveRecords [data-feature="activities"]');}else await press('#welcomeActivities');await page.waitForFunction(()=>modal==='activities');
   // Read final geometry after the real 300 ms slide-in; a 130 ms input
   // settle still catches the intended transient translateX outside the edge.
   await page.locator('#panel').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
  }
  async function openStory(){await openActivities();await press('[data-activity-open="story"]');await page.waitForFunction(()=>modal==='story');}
  async function travel(goal,tolerance=.6){
   const start=Date.now(),initial=await state();let lastLog=0,reached=false;
   while(Date.now()-start<100000){
    const s=await state();assert(s.active&&!s.modal&&!s.hidden&&s.focused&&!s.lost,'Natural swimming stays live');
    const range=distance(s.p,goal);if(range<tolerance){reached=true;break;}
    await swim(false);await aimAt(goal);await swim(true);await page.waitForTimeout(Math.min(850,Math.max(70,(range-.35)/5*650)));
    if(Date.now()-lastLog>10000){lastLog=Date.now();console.log(JSON.stringify({travel:goal,p:s.p,range,seconds:(Date.now()-start)/1000}));}
   }
   await swim(false);await page.waitForTimeout(420);const end=await state();observations.push({route:{goal,initial:initial.p,end:end.p,seconds:(Date.now()-start)/1000}});assert(reached,'Native route did not reach '+JSON.stringify(goal));
  }
  async function record(point,expected){
   await aimAt(point);await page.waitForTimeout(500);await page.waitForFunction(()=>StoryRules.eligible(oceanStory.snapshot(),oceanStory.context()),null,{timeout:5000});
   const before=await state();await shot('field-'+expected);await press('#storyAction');
   await page.waitForFunction(step=>oceanStory.snapshot().step===step,expected,{timeout:15000});
   const after=await state();check('real continuous recording completes field step '+expected,after.story.step===expected&&after.t-before.t>=4.5,{before,after});
  }

  await page.goto(url);await boot();
  metadata=await page.evaluate(()=>{const gl=renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,adaptive:settings.adaptive};});
  check('native hardware rendering and default automatic quality',metadata.adaptive&&metadata.renderer&&!/swiftshader|software|llvmpipe/i.test(metadata.renderer),metadata);
  const entry=page.locator('#welcomeActivities');check('home exposes one secondary investigation entry',await entry.count()===1&&await entry.isVisible());assert(results.at(-1).pass,'Missing visible homepage investigation entry');
  await layout('home',['startBtn','welcomeActivities','shipSettings','welcomeAbout']);await shot('home');await openActivities();
  await page.keyboard.press('Tab');check('activity dialog retains keyboard focus',await page.evaluate(()=>$('panel').contains(document.activeElement)));
  await page.keyboard.press('Escape');check('closing the activity dialog restores the triggering home button',await page.evaluate(()=>!modal&&document.activeElement===$('welcomeActivities')));
  await openStory();await press('#storyBegin');
  check('visible invitation starts the actual first chapter in free exploration',(await state()).story.started&&(await state()).story.step===0&&(await state()).mode==='free');
  await press('#closePanel');await press('#startBtn');await page.waitForFunction(()=>active&&!modal);
  await openActivities();await shot('activities');
  check('first level activity summary shows the accepted current field step',(await page.locator('#panelBody').innerText()).includes('記錄側室的層理'));
  await press('[data-activity-open="story"]');const markBefore=await state();await press('#storyMark');const marked=await state();
  check('marking the target preserves position and progress',distance(markBefore.p,marked.p)<.001&&marked.waypoint==='study:cave-strata'&&marked.story.step===0,{before:markBefore,after:marked});
  const route=await page.evaluate(()=>({cave:OceanRegions.route('cave'),strata:OceanRegions.points['cave-strata'],light:OceanRegions.points['cave-light']}));
  // Travel above open terrain, descend outside the authored mouth, then follow
  // its real connected corridor. These are navigation targets, never poses.
  for(const p of [[-180,-5,0],[-203,-10,-23],route.cave[0],...route.cave.slice(1,6)])await travel(p);
  await aimAt(route.strata.p);await page.waitForTimeout(500);await press('#storyAction');await page.waitForTimeout(1100);await press('#pauseBtn');
  const cancelled=await state();check('visible pause cancels incomplete recording without awarding evidence',cancelled.story.step===0&&cancelled.story.elapsed===0,cancelled);
  await press('#resumeBtn');await page.waitForTimeout(900);check('closing pause does not silently restart recording',(await state()).story.elapsed===0);
  await record(route.strata.p,1);
  await press('#pauseBtn');await press('#menuHome');await page.reload();await boot();
  await openActivities();check('reloaded unfinished investigation exposes the remaining step',(await page.locator('#panelBody').innerText()).includes('觀察天窗下的切石')&&(await state()).story.step===1);
  await press('[data-activity-mark="story"]');check('the resumed activity marks its actual remaining investigation site',(await state()).waypoint==='study:cave-light'&&(await state()).story.step===1);
  await press('#shipContinue');await page.waitForFunction(()=>active&&!modal);
  for(const p of [route.cave[4],route.cave[3],route.cave[2],route.light.stance])await travel(p);
  await record(route.light.p,2);await openStory();check('field completion cannot report underwater',await page.locator('#storyReport').isDisabled()&&(await state()).story.reports===0);
  await press('#closePanel');await press('#pauseBtn');await press('#menuHome');await openActivities();await shot('ready');
  check('home activity summary exposes ready-to-report investigation',(await page.locator('#panelBody').innerText()).includes('回報'));
  await press('[data-activity-open="story"]');await press('#storyReport');
  const report=await state();check('report advances exactly one chapter',report.story.reports===1&&report.story.step===0);
  check('chapter interpretation is visible with default water captions disabled',await page.locator('#storyLastReport').isVisible()&&(await page.locator('#storyLastReport').innerText()).includes('層理在同一方向中斷'));
  await shot('report');await page.reload();await boot();await openActivities();
  const final=await state();check('reload preserves next chapter and automatic quality',final.story.reports===1&&final.story.step===0&&final.adaptive&&final.gl===0&&!final.lost&&(await page.locator('#panelBody').innerText()).includes('潮汐留下的字'),final);
  await press('[data-activity-open="mail"][data-activity-id="guest-garden"]');
  check('commission entry opens its actual visible letter',await page.locator('#mail-guest-garden').isVisible()&&await page.locator('[data-accept="guest-garden"]').isVisible());
  await page.waitForTimeout(100);check('the requested letter retains focus after deferred dialog initialization',await page.evaluate(()=>document.activeElement===$('mail-guest-garden')));
  await page.keyboard.press('Tab');check('the next keyboard action belongs to the requested letter',await page.evaluate(()=>document.activeElement?.dataset.accept==='guest-garden'));await press('[data-accept="guest-garden"]');
  await press('#closePanel');await openActivities();
  const guest=page.locator('.activity-card').filter({has:page.locator('[data-activity-id="guest-garden"]')});
  check('accepted guest summary reflects the outstanding destination and observation',await guest.getAttribute('data-activity-state')==='active'&&(await guest.innerText()).includes('共同觀察 0.0 /'));
  await press('[data-activity-open="mail"][data-activity-id="guest-garden"]');await press('[data-cancel="guest-garden"]');await press('#closePanel');await openActivities();
  check('cancelling the actual letter immediately removes stale accepted status',await guest.getAttribute('data-activity-state')==='available'&&await page.evaluate(()=>!voyage.state.features.expedition.mail['guest-garden']));
  await press('#closePanel');
  if(touch){for(const view of [{width:844,height:390,insets:{left:44,right:44,bottom:21,top:0}},{width:320,height:568,insets:{top:24,bottom:20,left:0,right:0}}]){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(400);
   await layout('touch '+view.width+'×'+view.height+' with native safe-area override',['startBtn','shipContinue','welcomeActivities','shipSettings','welcomeAbout']);await shot('home-layout-'+view.width);await openActivities();
   const fit=await page.evaluate(()=>{const e=$('panel'),r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});check('activity panel fits '+view.width+'×'+view.height,!fit.overflow&&fit.x>=0&&fit.right<=fit.width,fit);const close=await page.evaluate(()=>{const e=$('closePanel'),r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e};});
   check('dialog close remains usable inside '+view.width+'×'+view.height+' safe areas',close.hit&&close.width>=44&&close.height>=44&&close.left>=view.insets.left&&close.right<=view.width-view.insets.right&&close.top>=view.insets.top&&close.bottom<=view.height-view.insets.bottom,close);
   await shot('layout-'+view.width);await press('#closePanel');
  }}
  check('native investigation has no page errors',errors.length===0,errors);
 }catch(error){fatal=error.stack||String(error);console.error(fatal);try{observations.push({failure:await page.evaluate(()=>({p:player?.p,modal,active,story:typeof oceanStory==='undefined'?null:oceanStory.snapshot(),context:typeof oceanStory==='undefined'?null:oceanStory.context()}))});await page.screenshot({path:output.replace(/\.json$/,'-failure.png')});}catch(_){}process.exitCode=1;}
 finally{await browser.close();fs.writeFileSync(output,JSON.stringify({status:!fatal&&results.every(r=>r.pass)?'passed':'failed',url,profile,metadata,checks:results,errors,fatal,observations,inputs},null,2));}
 if(results.some(r=>!r.pass))process.exitCode=1;
})();
