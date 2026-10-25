/* Native, real-time guest commission acceptance. Every gameplay action uses a
 * visible control, native keyboard, or CDP touch. Runtime reads and an isolated
 * RAF observer only measure the result: no save seeding, coordinate assignment,
 * simulation calls, artificial clock, direct selection, or awarded mail flags.
 * Run serially, without another GPU test. Touch is desktop Chrome emulation.
 * Example: PLAYWRIGHT_PATH=... node tests/parity/guest-escort-browser.cjs
 *   --url=https://jspusa.github.io/Ocean/ --profile=desktop --out=qa/parity/escort-red.json
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url',process.argv.find(v=>/^https?:/.test(v))||'http://127.0.0.1:8765/');
const profile=option('profile','desktop'),touch=profile==='touch';
const layoutOnly=process.argv.includes('--layout-only');
assert(['desktop','touch'].includes(profile),'--profile must be desktop or touch');
assert(!layoutOnly||touch,'--layout-only requires --profile=touch');
assert(!new URL(url).searchParams.has('still'),'A frozen scene cannot prove actual guest swimming');
const output=path.resolve(__dirname,'../..',option('out','qa/parity/guest-escort-'+profile+'.json'));
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
  async function openMailFromHome(){
   await press('#shipSettings');await press('#panelBody .settings-advanced > summary');await press('#legacyToolsBtn');
   await press('#panelBody .menu-advanced > summary');await press('#panelBody [data-feature="mail"]');
   await page.waitForFunction(()=>modal==='mail');
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
  async function snapshot(){return page.evaluate(()=>{
   const s=voyage.state.features.expedition,g=s.guest;
   return {p:player.p.slice(),guest:g?JSON.parse(JSON.stringify(g)):null,distance:g?V.dist(g.p,player.p):null,mail:JSON.parse(JSON.stringify(s.mail['guest-garden']||null)),active,modal,photoOpen,t,diveSeconds,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),freeze:!!window.__freeze,hidden:document.hidden,focused:document.hasFocus(),input:{keys:[...keys],stick:stick.slice()},cruise:voyage.state.cruise};
  });}
  async function observer(){await page.evaluate(()=>{
   // Independent read-only sampling. Production functions are not replaced.
   window.__guestEscortProbe={phase:'idle',frames:[],last:null,done:false};
   const sample=now=>{
    const q=window.__guestEscortProbe;if(q.done)return;
    const g=voyage.state.features?.expedition?.guest;
    if(active&&g&&g.p?.every(Number.isFinite)){
     const p=player.p.slice(),gp=g.p.slice(),prev=q.last,dt=prev?(now-prev.time)/1000:0;
     let rockMinimum=Infinity,groundMinimum=Infinity,regionHit=false;
     const previous=prev?.phase===q.phase?prev.g:gp;
     // Analytic segment/ellipsoid test against actual authored rock volumes.
     // The 0.35 m inset is slightly smaller than production's 0.4 m clearance;
     // it tolerates floating-point contact without accepting actual crossings.
     for(const ob of obstacles){
      const a=previous.map((v,k)=>(v-ob.p[k])/(ob.s[k]+.35)),d=gp.map((v,k)=>(v-previous[k])/(ob.s[k]+.35));
      const dd=d.reduce((n,v)=>n+v*v,0),u=dd?Math.max(0,Math.min(1,-a.reduce((n,v,k)=>n+v*d[k],0)/dd)):0;
      rockMinimum=Math.min(rockMinimum,a.reduce((n,v,k)=>n+(v+d[k]*u)**2,0));
     }
     for(let i=0;i<=4;i++){const a=previous.map((v,k)=>v+(gp[k]-v)*i/4);groundMinimum=Math.min(groundMinimum,a[1]-groundHeight(a[0],a[2]));}
     if(typeof OceanRegions!=='undefined')regionHit=OceanRegions.segmentBlocked(previous,gp,.35)||OceanRegions.pointBlocked(gp,.35);
     q.frames.push({at:now,phase:q.phase,dt,p,g:gp,distance:V.dist(p,gp),guestStep:prev?V.dist(prev.g,gp):0,playerStep:prev?V.dist(prev.p,p):0,rockMinimum,groundMinimum,regionHit,routeLength:g.route?.length??null,paused:!!modal||photoOpen,hidden:document.hidden,focused:document.hasFocus(),t});
     q.last={time:now,g:gp,p,phase:q.phase};
    }else q.last=null;
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });}
  async function phase(id){await page.evaluate(id=>{__guestEscortProbe.phase=id;__guestEscortProbe.last=null;},id);}
  async function checkTouchLayout(label){
   const detail=await page.evaluate(()=>{
    const rect=id=>{const e=$(id),b=e.getBoundingClientRect();return {id,left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height,hidden:e.hidden,text:e.textContent.trim()};};
    const guest=rect('guestEscortStatus'),toast=rect('toast'),controls=['joystick','upBtn','downBtn','photoBtn','boostBtn'].map(rect);
    const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const toastVisible=getComputedStyle($('toast')).opacity!=='0'&&!$('toast').classList.contains('hidden');
    return {viewport:[innerWidth,innerHeight],guest,toast,toastVisible,toastOverlaps:toastVisible?controls.filter(c=>overlap(toast,c)).map(c=>c.id):[],controls,overlaps:controls.filter(c=>overlap(guest,c)).map(c=>c.id),center:document.elementFromPoint(innerWidth/2,innerHeight/2)?.id,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   check(label+' keeps guest status and touch controls visible without overlapping',!detail.guest.hidden&&detail.guest.width>0&&detail.guest.left>=0&&detail.guest.right<=detail.viewport[0]&&detail.guest.top>=0&&detail.guest.bottom<=detail.viewport[1]&&!detail.overlaps.length&&!detail.toastOverlaps.length&&!detail.overflow&&detail.center==='ocean'&&detail.controls.every(c=>c.width>=44&&c.height>=44&&c.left>=0&&c.top>=0&&c.right<=detail.viewport[0]&&c.bottom<=detail.viewport[1]),detail);
   await page.screenshot({path:output.replace(/\.json$/,'-'+label+'.png')});
  }
  async function saveTrace(label){const data=await page.evaluate(()=>{__guestEscortProbe.done=true;return __guestEscortProbe.frames;});traces.push({label,frames:data});}
  async function swimCircuit(id,boost){
   await phase(id);await aim(Math.PI/2,0);
   if(boost&&touch)await press('#boostBtn');
   // A held Shift accelerates desktop swimming; touch has the visible, latched
   // boost button. Do not lower quality or speed to hide a dropped guest.
   if(boost&&!touch)await page.keyboard.down('Shift');
   await swim(true);const started=Date.now();
   assert(await page.evaluate(touch=>touch?stick[1]<-.9:keys.has('KeyW'),touch),'The native input must reach the real movement control');
   for(let leg=0;leg<4;leg++){
    if(leg)await aim(Math.PI/2+leg*Math.PI/2,0);
    const due=started+(leg+1)*7500;while(Date.now()<due)await page.waitForTimeout(Math.max(1,Math.min(500,due-Date.now())));
   }
   await swim(false);if(boost){if(touch)await press('#boostBtn');else await page.keyboard.up('Shift');}
   const motion=await page.evaluate(id=>__guestEscortProbe.frames.filter(f=>f.phase===id),id),middle=motion.filter(f=>f.at-motion[0].at>2000);
   const detail={wallSeconds:(Date.now()-started)/1000,samples:motion.length,travel:motion.reduce((n,f)=>n+f.playerStep,0),maxGuestGap:Math.max(...middle.map(f=>f.distance)),maxGuestStep:Math.max(...motion.map(f=>f.guestStep)),invalidSweeps:motion.filter(f=>f.rockMinimum<.999||f.groundMinimum<.72||f.regionHit).length,maxRoute:Math.max(0,...motion.map(f=>f.routeLength||0)),start:motion[0]?.p,end:motion.at(-1)?.p,stationaryFraction:middle.filter(f=>f.playerStep<.001).length/Math.max(1,middle.length)};
   check(id+' uses 30 wall-clock seconds of real native movement',detail.wallSeconds>=30&&motion.length>=150&&detail.travel>(boost?125:85),detail);
   check(id+' motion is not a stalled swimmer pushing into a wall',detail.stationaryFraction<.15,{stationaryFraction:detail.stationaryFraction});
   check(id+' keeps guest within the 12 m shared-observation radius',detail.maxGuestGap<12,detail);
   check(id+' guest moves continuously through turns',motion.every(f=>f.guestStep<=Math.max(.7,f.playerStep*1.8+f.dt*18)),{maxGuestStep:detail.maxGuestStep});
   check(id+' sampled guest sweeps do not enter rock, terrain or region solids',detail.invalidSweeps===0,{invalidSweeps:detail.invalidSweeps});
   check(id+' route state stays bounded',detail.maxRoute<=256,{maxRoute:detail.maxRoute});
   await phase(id+'-settle');await page.waitForTimeout(5000);const settled=await snapshot();
   check(id+' guest settles back into company after movement ends',settled.distance!==null&&settled.distance<6,{distance:settled.distance});
  }
  async function goTo(point,seconds=45,radius=3){
   const until=Date.now()+seconds*1000;let last=null;
   while(Date.now()<until){
    last=await snapshot();if(distance(last.p,point)<radius){await swim(false);await page.waitForTimeout(450);return {reached:true,last};}
    await swim(false);await aimAt(point);await swim(true);await page.waitForTimeout(Math.min(700,Math.max(150,distance(last.p,point)/6*600)));
   }
   await swim(false);return {reached:false,last:await snapshot()};
  }

  await page.goto(url);await boot();
  metadata=await page.evaluate(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,userAgent:navigator.userAgent,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,adaptive:settings.adaptive,quality:renderer.quality,species:SPECIES.length,programs:renderer.surfacePrograms.size,viewport:[innerWidth,innerHeight]};});
  assert(metadata.renderer&&!/swiftshader|llvmpipe|software/i.test(metadata.renderer),'Installed native hardware GPU required');assert(metadata.adaptive,'Use the product default automatic quality');
  await openMailFromHome();await press('[data-accept="guest-garden"]');
  check('visible home settings/tools/mail path accepts the actual guest commission',(await snapshot()).mail?.status==='accepted');
  await press('#closePanel');await press('#startBtn');await page.waitForFunction(()=>active&&!modal&&$('welcome').classList.contains('hidden'));await observer();
  const start=await snapshot();check('real dive starts with an accepted guest nearby',start.guest?.id==='guest-garden'&&start.distance<6&&start.mail.progress===0,start);
  if(touch){
   await page.waitForTimeout(500);await checkTouchLayout('portrait');await page.setViewportSize({width:844,height:390});await page.waitForTimeout(700);await checkTouchLayout('landscape');
   if(layoutOnly){
    // Explicit UI layout stress fixture, not a physical-phone or natural-input
    // claim: real CSS safe-area environment and a long production toast.
    await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{left:44,right:44,bottom:21}});
    for(const width of [844,568]){await page.setViewportSize({width,height:390});await page.evaluate(()=>toast('已標記棲地，直接游近就能觀察。請帶著同行訪客一起探索，保持在能共同觀察的距離。'));await page.waitForTimeout(250);assert(await page.locator('#toast').evaluate(e=>e.classList.contains('show')));await checkTouchLayout('landscape-safe-area-'+width);}
    await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{}});
   }
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
  }
  if(!layoutOnly){
  await swimCircuit('ordinary',false);await swimCircuit('accelerated',true);
  check('swimming alone does not award common-observation progress',(await snapshot()).mail.progress===0);
  await press('#pauseBtn');await phase('paused');const paused=await snapshot();await page.waitForTimeout(2200);const pausedAfter=await snapshot();
  check('pause leaves guest and player exactly still',distance(paused.guest.p,pausedAfter.guest.p)<1e-8&&distance(paused.p,pausedAfter.p)<1e-8,{before:paused.guest.p,after:pausedAfter.guest.p});
  await press('#menuHome');const home=await snapshot();check('save and home preserves the accepted commission',!home.active&&home.mail.status==='accepted'&&home.mail.progress===0,home.mail);
  check('home preserves the unfinished guest position and remaining turns',!!home.guest&&distance(home.guest.p,paused.guest.p)<1e-6&&JSON.stringify(home.guest.route)===JSON.stringify(paused.guest.route),{before:paused.guest,after:home.guest});
  await press('#shipContinue');await page.waitForFunction(()=>active&&!modal&&$('welcome').classList.contains('hidden'));await phase('continued');await page.waitForTimeout(700);const continued=await snapshot();
  check('continue returns both diver and guest to a reasonable saved location',distance(continued.p,paused.p)<1&&continued.distance!==null&&continued.distance<8,{playerDrift:distance(continued.p,paused.p),guestGap:continued.distance});
  check('continue does not respawn a legal saved guest beside the diver',!!continued.guest&&distance(continued.guest.p,paused.guest.p)<.08,{before:paused.guest.p,after:continued.guest?.p});
  await press('#pauseBtn');const beforeReload=await snapshot();await saveTrace('before-reload');await page.reload();await boot();
  const reloaded=await snapshot();check('reload keeps commission identity and progress',JSON.stringify(reloaded.mail)===JSON.stringify(beforeReload.mail),{before:beforeReload.mail,after:reloaded.mail});
  await press('#shipContinue');await page.waitForFunction(()=>active&&!modal&&$('welcome').classList.contains('hidden'));await observer();await phase('reloaded');await page.waitForTimeout(700);const resumed=await snapshot();
  check('reload/continue retains actual diver and guest positions',distance(resumed.p,beforeReload.p)<1&&resumed.distance!==null&&resumed.distance<8&&distance(resumed.guest.p,beforeReload.guest.p)<3,{playerDrift:distance(resumed.p,beforeReload.p),guestDrift:resumed.guest?distance(resumed.guest.p,beforeReload.guest.p):null,guestGap:resumed.distance});

  // Navigate back using actual swimming. Read-only scene coordinates aim input;
  // the chart, a testing hook, and findSpecies() are never used to relocate us.
  await phase('garden-approach');const garden=await page.evaluate(()=>{const l=LANDMARKS.find(l=>l.id==='garden');return [l.x,-6,l.z];});
  const approach=await goTo(garden,65,4);check('actual controls reach the garden commission destination',approach.reached,{position:approach.last.p,target:garden});
  await phase('joint-observation');let completed=false;
  const until=Date.now()+90000;
  while(Date.now()<until){
   const state=await snapshot();if(state.mail.progress>=4&&state.mail.visited){completed=true;break;}
   const candidate=await page.evaluate(()=>{
    const fish=life.filter(f=>SPECIES[f.species]?.id==='turtle'&&f.ecologyPresent!==false).sort((a,b)=>V.dist(a.p,player.p)-V.dist(b.p,player.p))[0];
    if(!fish)return null;const point=animalFocusPoint(fish),p=project(point,renderer.vp),b=$('ocean').getBoundingClientRect();
    const x=b.left+(p[0]*.5+.5)*b.width,y=b.top+(.5-p[1]*.5)*b.height;
    return {uid:fish.uid,point,distance:V.dist(point,player.p),valid:oceanSelection.valid(fish),screen:[x,y],clearCanvas:p[2]>0&&document.elementFromPoint(x,y)?.id==='ocean',selected:oceanSelection.snapshot().uid===fish.uid};
   });
   observations.push({at:new Date().toISOString(),player:state.p,guestGap:state.distance,mail:state.mail,candidate});
   if(!candidate){await page.waitForTimeout(1000);continue;}
   await swim(false);await aimAt(candidate.point);
   if(candidate.distance>10){await swim(true);await page.waitForTimeout(650);continue;}
   // Recompute after aiming: a previous screen projection is stale.
   const hit=await page.evaluate(uid=>{
    const f=life.find(f=>f.uid===uid);if(!f||!oceanSelection.valid(f))return null;
    const d=oceanSelection.disc(f);
    // Other fish can overlap the turtle's screen center. Verify the actual
    // hit-test winner at a few points within its real target disc, then perform
    // the native click. Calling pick() reads the scene; it does not select.
    for(const [ox,oy]of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4],[.3,.3],[-.3,-.3]]){
     const x=d.x+ox*d.r,y=d.y+oy*d.r;
     if(document.elementFromPoint(x,y)?.id==='ocean'&&oceanSelection.pick(x,y)?.uid===uid)return {x,y};
    }return null;
   },candidate.uid);
   if(hit){if(touch){await touchDown(4,hit.x,hit.y);await touchUp(4);}else await page.mouse.click(hit.x,hit.y);await page.waitForTimeout(100);observations.at(-1).nativeHit={...hit,selected:await page.evaluate(()=>oceanSelection.snapshot().uid)};await page.waitForTimeout(1000);}
   else{await swim(true);await page.waitForTimeout(250);}
  }
  await swim(false);const observed=await snapshot();
  check('real pointer/touch observation with nearby guest earns the garden commission',completed,{mail:observed.mail,guestGap:observed.distance,attempts:observations.length,lastAttempt:observations.at(-1)});
  await page.screenshot({path:output.replace(/\.json$/,'.png')});
  if(completed){
   await press('#pauseBtn');await press('#menuHome');await openMailFromHome();
   check('returning home exposes the earned thank-you letter',(await snapshot()).mail.status==='ready'&&await page.locator('[data-reward="guest-garden"]').isVisible());
   await press('[data-reward="guest-garden"]');check('visible reward action completes the same commission',(await snapshot()).mail.status==='complete');
  }
  const final=await snapshot();check('automatic quality and usable native renderer remain enabled',final.adaptive&&!final.lost&&final.gl===0&&!final.freeze&&errors.length===0,{adaptive:final.adaptive,quality:final.quality,scale:final.scale,gl:final.gl,errors});
  await saveTrace('after-reload');
  }
  assert.deepEqual(errors,[],'Native browser must not report application errors');
 }catch(error){fatal=error.stack||String(error);console.error(fatal);if(page&&!page.isClosed())try{await page.screenshot({path:output.replace(/\.json$/,'-failure.png')});}catch(_){};}
 finally{
  if(page&&!page.isClosed())try{const frames=await page.evaluate(()=>{const q=window.__guestEscortProbe;if(!q||q.done)return null;q.done=true;return q.frames;});if(frames)traces.push({label:'interrupted',frames});}catch(_){}
  await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({url,profile,layoutOnly,metadata,method:layoutOnly?'Native touch layout check after visible UI accepts and starts a guest commission, plus explicit CDP safe-area and long-toast UI stress fixtures; no swimming, reward or physical-phone claim.':'Native installed Chrome and real wall-clock RAF. Visible UI accepts the commission; native keyboard/CDP touch swims and drags the camera. Runtime coordinates/projection are read only. No source hook, save fixture, position assignment, manual simulation, direct creature selection or mail progression. Per-frame sweeps cover only the actual sampled route; this is not exhaustive rock geometry or physical phone acceptance.',results,errors,fatal,observations,inputs,traces},null,2));
 }
 console.log(JSON.stringify({output,passed:results.filter(r=>r.pass).length,total:results.length,fatal:!!fatal}));
 if(fatal||results.some(r=>!r.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
