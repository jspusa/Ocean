/* Natural investigation through visible UI and native keyboard/touch. No state,
 * coordinate, clock or progression writes. Run alone on native Chrome GPU.
 * Touch profiles are desktop emulation, not physical phone acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url',process.argv.find(v=>/^https?:/.test(v))||'http://127.0.0.1:8765/');
const profile=option('profile','desktop'),touch=profile==='touch';
const shadowAudit=process.argv.includes('--shadow-audit');
assert(['desktop','touch'].includes(profile));
assert(!new URL(url).searchParams.has('still'),'A frozen scene cannot prove field investigation');
const output=path.resolve(__dirname,'../..',option('out','qa/parity/hadal-investigation-'+profile+'.json'));
fs.mkdirSync(path.dirname(output),{recursive:true});
const results=[],errors=[],traces=[],observations=[],inputs=[];let metadata=null,fatal=null,shadowEpoch=0,shadowReturns=0,shadowPhoto=null;
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};

(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));let context,page,session;const contacts=new Map();
 try{
  context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Renderer process crashed'));
  session=await context.newCDPSession(page);
  let moving=false;
  // All touch interactions share one CDP stream. Mixing its pointer IDs with
  // Playwright tap() can suppress later synthetic taps in Chromium.
  const touchEvent=async(type)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:[...contacts.values()]});
  async function touchDown(id,x,y){contacts.set(id,{id,x,y});await touchEvent('touchStart');}
  async function touchMove(id,x,y){contacts.set(id,{id,x,y});await touchEvent('touchMove');}
  // This runner serializes look, movement, and taps: exactly one contact at a
  // time. CDP touchEnd must use an empty list; finally only cancels live input.
  async function touchUp(id){assert(contacts.has(id));assert.equal(contacts.size,1);contacts.delete(id);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  async function press(selector){
   const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();
   if(/^#hadal|^#storyAction$/.test(selector))await layout('native action '+selector,[selector.slice(1)]);
   if(touch){const b=await node.boundingBox();assert(b,'Visible control has no hit box: '+selector);await touchDown(7,b.x+b.width/2,b.y+b.height/2);await touchUp(7);}
   else await node.click();
   await page.waitForTimeout(130);
  }
  async function boot(){
   await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
   assert(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
   await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
   if(shadowAudit)await page.evaluate(epoch=>{
    const original=renderer.render,matrixNames=['lightVP','renderLightVP','dynamicLightVP','renderDynamicLightVP'];
    const audit=window.__hadalShadowAudit={epoch,completedFrames:0,deepFrames:0,sunlitFrames:0,shallowDiveFrames:0,restorations:0,transitionCount:0,
     deepShadowViolations:0,invalidMatrixFrames:0,restorationViolations:0,observerErrors:0,transitions:[],failures:[],lastComplete:null};
    const retained=(r,view)=>({frame:r.frame,sunless:r.sunless===true,staticShadowUpdates:r.staticShadowUpdates||0,shadowDraws:r.shadowDraws,
     forceShadow:r.forceShadow===true,origin:r.renderOrigin,view,matrices:matrixNames.map(name=>r[name])});
    const details=s=>({...s,origin:s.origin?Array.from(s.origin):null,view:s.view?Array.from(s.view):null,
     matrices:Object.fromEntries(matrixNames.map((name,i)=>[name,s.matrices[i]?Array.from(s.matrices[i]):null]))});
    renderer.render=function(...args){
     // Read-only observer: the original receiver, arguments, exceptions and
     // return value are preserved. No player/render/clock setting is changed.
     const before=retained(this,audit.lastComplete?.eye);const result=original.apply(this,args);
     try{if(result!==false&&this.frame>before.frame){
      audit.completedFrames++;const after=retained(this,args[0]);
      const invalid=matrixNames.filter((name,i)=>{const m=after.matrices[i];if(!m||m.length!==16)return true;for(let k=0;k<16;k++)if(!Number.isFinite(m[k]))return true;return false;});
      if(after.sunless){audit.deepFrames++;if(after.shadowDraws!==0)audit.deepShadowViolations++;}else audit.sunlitFrames++;
      if(active&&!modal&&!after.sunless&&args[0][1]>-160)audit.shallowDiveFrames++;
      if(invalid.length)audit.invalidMatrixFrames++;
      const restoring=before.sunless&&!after.sunless,staticDelta=after.staticShadowUpdates-before.staticShadowUpdates;
      if(restoring){audit.restorations++;if(staticDelta<1)audit.restorationViolations++;}
      if(before.sunless!==after.sunless){audit.transitionCount++;if(audit.transitions.length<48)audit.transitions.push({completedFrame:audit.completedFrames,kind:restoring?'sunlight-restored':'entered-sunless',staticDelta,before:details(before),after:details(after)});}
      if((invalid.length||after.sunless&&after.shadowDraws!==0||restoring&&staticDelta<1)&&audit.failures.length<12)audit.failures.push({completedFrame:audit.completedFrames,invalid,restoring,staticDelta,before:details(before),after:details(after)});
      audit.lastComplete={frame:after.frame,eye:args[0].slice(),sunless:after.sunless,shadowDraws:after.shadowDraws,staticShadowUpdates:after.staticShadowUpdates,
       forceShadow:after.forceShadow,matrixValid:invalid.length===0,origin:after.origin?.slice(),active,modal,adaptive:settings.adaptive,
       quality:this.quality,scale:this.dynamicScale,resolution:[this.canvas.width,this.canvas.height]};
     }}catch(error){audit.observerErrors++;if(audit.failures.length<12)audit.failures.push({observerError:String(error?.message||error)});}
     return result;
    };
   },++shadowEpoch);
  }
  async function collectShadowAudit(label,{deep=false,restored=false}={}){
   const audit=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__hadalShadowAudit)));
   observations.push({shadowAudit:{label,...audit}});
   check('shadow audit '+label,audit.completedFrames>0&&(!deep||audit.deepFrames>0)&&(!restored||audit.restorations>0)&&
    audit.deepShadowViolations===0&&audit.invalidMatrixFrames===0&&audit.restorationViolations===0&&audit.observerErrors===0,
   {epoch:audit.epoch,completedFrames:audit.completedFrames,deepFrames:audit.deepFrames,restorations:audit.restorations,transitionCount:audit.transitionCount,
    deepShadowViolations:audit.deepShadowViolations,invalidMatrixFrames:audit.invalidMatrixFrames,restorationViolations:audit.restorationViolations,observerErrors:audit.observerErrors});
   assert(results.at(-1).pass,'Completed-frame shadow audit failed: '+label);return audit;
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
  async function state(){return page.evaluate(()=>({p:player.p.slice(),floor:groundHeight(player.p[0],player.p[2]),active,modal,t,story:oceanStory.snapshot(),hadal:oceanStory.hadal.snapshot(),context:oceanStory.hadal.context(),selected:oceanSelection.snapshot(),deepsea:oceanDeepsea.snapshot(),drawCalls:renderer.drawCalls,triangles:renderer.submittedTriangles,referenceSensorCount:renderer.batches.filter(b=>b.dynamic).flatMap(b=>b.instances).filter(i=>i.p.every((n,k)=>Math.abs(n-OceanTrench.studyPoints['hadal-reference'].p[k])<.0001)).length,mode:voyage.state.mode,waypoint:voyage.state.waypoint,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,hidden:document.hidden,focused:document.hasFocus(),lost:renderer.gl.isContextLost(),gl:renderer.gl.getError()}));}
  async function shot(name){const file=output.replace(/\.json$/,'-'+name+'.png');await page.screenshot({path:file});return file;}
  async function layout(label,ids,insets={top:0,right:0,bottom:0,left:0}){
   const result=await page.evaluate(ids=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,rects:ids.map(id=>{const e=$(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e};})}),ids);
   check(label+' controls fit and receive input',!result.overflow&&result.rects.every(r=>r.visible&&r.hit&&r.w>=44&&r.h>=44&&r.x>=insets.left&&r.y>=insets.top&&r.right<=result.width-insets.right&&r.bottom<=result.height-insets.bottom),{...result,insets});
  }
  async function openActivities(){if(await page.evaluate(()=>active)){await press('#fieldToolsBtn');await press('#diveRecords [data-feature="activities"]');}else await press('#welcomeActivities');await page.waitForFunction(()=>modal==='activities');
   // Read final geometry after the real 300 ms slide-in; a 130 ms input
   // settle still catches the intended transient translateX outside the edge.
   await page.locator('#panel').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
  }
  async function openHadal(){await openActivities();await press('[data-activity-open="hadal"]');await page.waitForFunction(()=>modal==='hadal');}
  async function vertical(delta){
   const before=await page.evaluate(()=>({p:player.p.slice(),velocity:player.velocity.slice(),keys:[...keys]})),ms=Math.min(150,Math.max(70,Math.abs(delta)*100));
   if(touch){const b=await page.locator(delta>0?'#upBtn':'#downBtn').boundingBox();assert(b);await touchDown(3,b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(ms);await touchUp(3);}
   else{const key=delta>0?'e':'q';await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
   await page.waitForTimeout(220);inputs.push({action:'vertical',delta,ms,before,after:await page.evaluate(()=>({p:player.p.slice(),velocity:player.velocity.slice(),keys:[...keys],vertical:verticalInput}))});
  }
  async function travel(goal,tolerance=.6){
   const start=Date.now(),initial=await state();let lastLog=0,reached=false,axisPlan=null;
   while(Date.now()-start<100000){
    const s=await state();assert(s.active&&!s.modal&&!s.hidden&&s.focused&&!s.lost,'Natural swimming stays live');
    const range=distance(s.p,goal),horizontal=Math.hypot(goal[0]-s.p[0],goal[2]-s.p[2]),dy=goal[1]-s.p[1];if(range<tolerance){reached=true;break;}
    // A capped dive angle plus a pulse based on the large vertical distance
    // overshoots XZ, turns 180 degrees and swims back into the higher floor.
    // Plan a level approach using the actual terrain, then use native rise/
    // descend controls. Reading a waypoint never assigns game coordinates.
    if(!axisPlan&&Math.abs(dy)>Math.max(.7,horizontal*1.5)){
     axisPlan=await page.evaluate(({from,goal})=>{
      const samples=Math.max(1,Math.ceil(Math.hypot(goal[0]-from[0],goal[2]-from[2])/.05));let maxFloor=-Infinity;
      for(let i=0;i<=samples;i++){const u=i/samples;maxFloor=Math.max(maxFloor,groundHeight(from[0]+(goal[0]-from[0])*u,from[2]+(goal[2]-from[2])*u));}
      const cruiseY=Math.max(from[1],goal[1],maxFloor+1.05),raised=[from[0],cruiseY,from[2]],overGoal=[goal[0],cruiseY,goal[2]];
      return {cruiseY,maxFloor,samples,raised,overGoal,aligned:false,riseClear:OceanRegions.pathClear(from,raised,.4),levelClear:OceanRegions.pathClear(raised,overGoal,.4)};
     },{from:s.p,goal});
     assert(Number.isFinite(axisPlan.cruiseY)&&axisPlan.riseClear&&axisPlan.levelClear,'A steep native route requires a clear rise and level approach: '+JSON.stringify(axisPlan));
     inputs.push({action:'travel-axis-plan',at:new Date().toISOString(),goal:goal.slice(),from:s.p.slice(),...axisPlan});
    }
    // Once aligned, keep the vertical leg: descending must never trigger a
    // return to cruise height. Any horizontal drift reopens the level leg.
    if(axisPlan)axisPlan.aligned=horizontal<.12&&goal[1]>=s.floor+.9;
    let phase='direct',pulseMs=null,inputTarget=goal.slice();
    if(axisPlan&&!axisPlan.aligned&&s.p[1]<axisPlan.cruiseY-.12){phase='rise-before-level';inputTarget=[s.p[0],axisPlan.cruiseY,s.p[2]];await vertical(axisPlan.cruiseY-s.p[1]);}
    else if(horizontal<.12&&Math.abs(dy)>.35&&goal[1]>=s.floor+.9){phase='vertical-at-goal';await vertical(dy);}
    else{
     if(axisPlan){
      phase='level-align';inputTarget=[goal[0],s.p[1],goal[2]];
      // Keep a full .82 m swimmer clearance along the real horizontal leg.
      // If native settling left us lower than its safe corridor, rise first.
      const level=await page.evaluate(({from,to})=>{
       const n=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[2]-from[2])/.05));let floor=-Infinity;
       for(let i=0;i<=n;i++){const u=i/n;floor=Math.max(floor,groundHeight(from[0]+(to[0]-from[0])*u,from[2]+(to[2]-from[2])*u));}
       return {floor,clear:OceanRegions.pathClear(from,to,.4)};
      },{from:s.p,to:inputTarget});
      assert(level.clear&&s.p[1]>=level.floor+.82,'Level native approach must clear the existing floor and solids');
      pulseMs=Math.min(180,Math.max(20,horizontal*160));
     }else pulseMs=Math.min(600,Math.max(70,range*300));
     await aimAt(inputTarget);await swim(true);await page.waitForTimeout(pulseMs);await swim(false);
    }
    // Release before judging arrival. On a steep slope the remaining inertia
    // can move XZ onto higher ground, raising Y well outside the sampling zone.
    // Short near-target pulses plus settled endpoint checks use normal inputs;
    // they do not change the game's range, collision or motion rules.
    await page.waitForFunction(()=>Math.hypot(...player.velocity)<.02,null,{timeout:5000});
    await page.waitForTimeout(120);
    const settled=await state();inputs.push({action:'travel-step',at:new Date().toISOString(),phase,goal:goal.slice(),inputTarget,pulseMs,horizontal,before:s.p.slice(),after:settled.p.slice(),rangeBefore:range,rangeAfter:distance(settled.p,goal)});
    if(Date.now()-lastLog>10000){lastLog=Date.now();console.log(JSON.stringify({travel:goal,phase,p:settled.p,range:distance(settled.p,goal),seconds:(Date.now()-start)/1000}));}
   }
   await swim(false);const end=await state();observations.push({route:{goal,initial:initial.p,end:end.p,seconds:(Date.now()-start)/1000}});assert(reached&&distance(end.p,goal)<tolerance,'Native route did not settle at '+JSON.stringify(goal));
  }
  async function record(point,expected,seconds=4){
   await aimAt(point);await page.waitForTimeout(550);
   await page.waitForFunction(()=>HadalStoryRules.eligible(oceanStory.hadal.snapshot(),oceanStory.hadal.context()),null,{timeout:5000});
   const before=await state();await shot('field-'+expected);await press('#storyAction');
   await page.waitForFunction(n=>oceanStory.hadal.snapshot().records.length===n,expected,{timeout:18000});
   const after=await state();check('continuous real-time field operation '+expected,after.hadal.records.length===expected&&after.t-before.t>=seconds-.25,{before,after});assert(results.at(-1).pass);
   const next=[null,'study:hadal-rim','study:hadal-turn','study:hadal-bottom','habitat:mariana_snailfish','study:hadal-reference',null][expected];check('explicit tracking advances after field operation '+expected,after.story.tracking==='hadal'&&after.waypoint===next,{tracking:after.story.tracking,waypoint:after.waypoint,next});
  }
  async function returnHome(){
   const before=shadowAudit?await page.evaluate(()=>({completedFrames:__hadalShadowAudit.completedFrames,restorations:__hadalShadowAudit.restorations,lastComplete:__hadalShadowAudit.lastComplete})):null;
   await press('#pauseBtn');await press('#menuHome');await page.waitForFunction(()=>!active&&!modal);
   if(shadowAudit){
    assert(before.lastComplete?.sunless,'The normal return must begin from a completed sunless frame');
    await page.waitForFunction(before=>{const a=window.__hadalShadowAudit,s=a?.lastComplete;return !active&&!modal&&a.completedFrames>before.completedFrames&&a.restorations>before.restorations&&s&&!s.active&&!s.sunless&&s.eye[1]>-160;},before,{timeout:30000});
    const after=await collectShadowAudit('normal-home-return-'+(++shadowReturns),{deep:true,restored:true});
    const restored=after.transitions.find(row=>row.kind==='sunlight-restored'&&row.completedFrame>before.completedFrames);
    check('first completed shallow home frame rebuilds static shadows and resumes sunlit draw work '+shadowReturns,
     !!restored&&restored.staticDelta>=1&&restored.after.sunless===false&&restored.after.shadowDraws>0&&after.lastComplete.matrixValid&&after.lastComplete.adaptive,{before,restored,lastComplete:after.lastComplete});
    assert(results.at(-1).pass);
   }
  }
  function oldState(s){const {hadal,investigation,...old}=s.story;return old;}

  await page.goto(url);await boot();
  metadata=await page.evaluate(()=>{const gl=renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,adaptive:settings.adaptive};});
  check('native hardware and default automatic quality',metadata.adaptive&&metadata.renderer&&!/swiftshader|software|llvmpipe/i.test(metadata.renderer),metadata);
  await openActivities();await press('[data-activity-open="story"]');await press('#storyBegin');
  const legacy=oldState(await state());await press('#closePanel');await openHadal();
  if(touch)for(const view of [{width:844,height:390,insets:{left:44,right:44,bottom:21,top:0}},{width:320,height:568,insets:{top:24,bottom:20,left:0,right:0}}]){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(450);await page.locator('#hadalBegin').scrollIntoViewIfNeeded();await layout('invitation '+view.width+'x'+view.height,['hadalBegin'],view.insets);await page.keyboard.press('Tab');check('hadal dialog keeps keyboard focus '+view.width,await page.evaluate(()=>$('panel').contains(document.activeElement)));await shot('invitation-layout-'+view.width);
  }
  if(touch){await page.setViewportSize({width:390,height:844});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,right:0,bottom:0,left:0}});await page.waitForTimeout(450);}
  await press('#hadalBegin');
  check('visible independent hadal invitation preserves the accepted original story',JSON.stringify(oldState(await state()))===JSON.stringify(legacy)&&(await state()).hadal.started);
  await shot('invitation');
  if(touch)for(const view of [{width:844,height:390,insets:{left:44,right:44,bottom:21,top:0}},{width:320,height:568,insets:{top:24,bottom:20,left:0,right:0}}]){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(450);for(const id of ['hadalMark','hadalNavigation','hadalRecord']){await page.locator('#'+id).scrollIntoViewIfNeeded();await layout('journal controls '+view.width+'x'+view.height,[id],view.insets);}await shot('controls-layout-'+view.width);
  }
  if(touch){await page.setViewportSize({width:390,height:844});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,right:0,bottom:0,left:0}});await page.waitForTimeout(450);}
  await press('#hadalMark');check('visible journal explicitly enables tracking',(await state()).story.tracking==='hadal'&&(await state()).waypoint==='study:hadal-reference');await openHadal();
  await press('#hadalNavigation');await press('[data-deepsea-station="hadal"]');
  let arrived=false;const transitStart=Date.now();
  while(Date.now()-transitStart<240000){await page.waitForTimeout(1000);const s=await state();traces.push({at:Date.now(),p:s.p,target:s.deepsea.travelTarget,records:s.hadal.records.length,scale:s.scale,gl:s.gl});if(!s.deepsea.travelTarget&&s.p[1]<-6990){arrived=true;break;}if(traces.length%15===0)console.log(JSON.stringify({transit:s.deepsea,seconds:(Date.now()-transitStart)/1000}));}
  assert(arrived,'The visible existing current must reach the actual 7 km habitat');
  const arrival=await state();check('continuous normal current reaches 7 km without granting records',arrival.p[1]<-6990&&arrival.hadal.records.length===0&&arrival.adaptive,arrival);await shot('hadal-arrival');
  const surveyed=await page.evaluate(()=>({points:OceanTrench.studyPoints,route:Array.from({length:11},(_,i)=>{const z=-135-i;return [780,OceanTrench.floorAt(780,z,-6990)+2,z];})}));
  const P=surveyed.points,aimPoint=id=>P[id].p.map((n,k)=>n+(k===1?(id==='hadal-reference'?.55:.35):0)),stance=id=>P[id].p.map((n,k)=>n+(k===1?1.6:0));
  await travel([779,-7000,-134]);await travel(stance('hadal-reference'),.35);
  await aimAt(aimPoint('hadal-reference'));await page.waitForTimeout(600);await press('#storyAction');await page.waitForTimeout(1100);await press('#pauseBtn');
  const cancelled=await state();check('pause cancels unfinished deployment',cancelled.hadal.records.length===0&&cancelled.hadal.elapsed===0,cancelled);await press('#resumeBtn');await page.waitForTimeout(500);
  await record(aimPoint('hadal-reference'),1);check('one physical instrument exists after deployment',(await state()).referenceSensorCount===1);
  for(const p of surveyed.route.filter(p=>p[2]>=-138))await travel(p,.45);
  await travel(stance('hadal-rim'),.35);await record(aimPoint('hadal-rim'),2);
  const saved=await state();await returnHome();
  if(shadowAudit)await collectShadowAudit('before-mid-investigation-reload',{deep:true,restored:true});
  await page.reload();await boot();await openHadal();
  check('mid-investigation reload preserves deployed instrument and next step',(await state()).hadal.records.length===2&&(await state()).referenceSensorCount===1&&(await page.locator('#panelBody').innerText()).includes('記錄坡面轉折'),{before:saved,after:await state()});
  check('reload preserves tracked remaining slope site',(await state()).story.tracking==='hadal'&&(await state()).waypoint==='study:hadal-turn');await press('#closePanel');await press('#shipContinue');await page.waitForFunction(()=>active&&!modal);
  for(const p of surveyed.route.filter(p=>p[2]<-138&&p[2]>=-140))await travel(p,.45);
  await travel(stance('hadal-turn'),.35);await record(aimPoint('hadal-turn'),3);
  for(const p of surveyed.route.filter(p=>p[2]<-140))await travel(p,.45);
  await travel(stance('hadal-bottom'),.35);await record(aimPoint('hadal-bottom'),4);
  await openHadal();check('profile displays the actual deeper terrain',await page.locator('#hadalProfile').isVisible()&&(await page.locator('#hadalProfile').innerText()).includes('18.0 m'));
  await shot('profile');await press('#closePanel');
  for(const p of surveyed.route.slice().reverse())await travel(p,.45);
  await travel([780,-7000,-134],.45);
  const fish=await page.evaluate(()=>{const f=life.find(f=>f.uid==='mariana_snailfish-001');return {home:f.home.slice(),p:f.p.slice(),uid:f.uid};});
  const fishStance=[fish.home[0],fish.home[1]+.65,fish.home[2]+1.6];await travel(fishStance,.4);
  for(let tries=0;tries<4;tries++){
   const point=await page.evaluate(()=>animalFocusPoint(life.find(f=>f.uid==='mariana_snailfish-001')));await aimAt(point);await page.waitForTimeout(500);
   const screen=await page.evaluate(()=>{const f=life.find(f=>f.uid==='mariana_snailfish-001'),d=oceanSelection.disc(f);return {x:d.x,y:d.y,valid:oceanSelection.valid(f),uid:f.uid,front:document.elementFromPoint(d.x,d.y)?.id};});assert(screen.valid&&screen.front==='ocean','Natural fish hit must be visible on the canvas: '+JSON.stringify(screen));
   if(touch){await touchDown(7,screen.x,screen.y);await touchUp(7);}else await page.mouse.click(screen.x,screen.y);await page.waitForTimeout(250);if((await state()).selected.uid===fish.uid)break;
  }
  assert.equal((await state()).selected.uid,fish.uid,'Native click/tap must select the original individual');
  await record(await page.evaluate(()=>animalFocusPoint(oceanSelection.target())),5,6);
  check('observation records the deliberately selected original individual',(await state()).hadal.records[4].uid===fish.uid);
  if(shadowAudit){
   await aimAt(await page.evaluate(()=>animalFocusPoint(oceanSelection.target())));
   const before=await page.evaluate(()=>({film:JSON.parse(JSON.stringify(voyage.state.features.photography.film)),storage:oceanPhotography.snapshot(),selected:oceanSelection.snapshot().uid,
    species:SPECIES[oceanSelection.target().species].name,frame:window.__hadalShadowAudit.lastComplete}));
   assert.equal(before.selected,fish.uid,'The real shutter must retain the deliberately selected original individual');
   assert(!before.storage.busy,'The photo store must be idle before the real shutter');
   await press('#photoBtn');
   await page.waitForFunction(count=>!voyage.photoBusy&&!oceanPhotography.snapshot().busy&&voyage.state.features.photography.film.length===count+1,before.film.length,{timeout:30000});
   const after=await page.evaluate(()=>({film:JSON.parse(JSON.stringify(voyage.state.features.photography.film)),storage:oceanPhotography.snapshot(),frame:window.__hadalShadowAudit.lastComplete}));
   const added=after.film.filter(p=>!before.film.some(old=>old.date===p.date)),photo=added[0];
   observations.push({shadowPhotoCapture:{before,after}});
   check('normal deep-water shutter saves the original selected individual',added.length===1&&photo.individual===fish.uid&&photo.species===before.species&&photo.bytes>10000&&after.storage.durable&&!after.storage.error&&!after.storage.recovery,{photo,storage:after.storage});
   assert(results.at(-1).pass);
   await press('#fieldToolsBtn');await press('#panelBody .menu-advanced > summary');await press('#panelBody [data-feature="photography"]');await press('[data-photo-view="'+photo.date+'"]');
   await page.waitForFunction(()=>photoOpen&&$('photoImage').complete&&$('photoImage').naturalWidth>0);
   const image=await page.evaluate(()=>{const e=$('photoImage');return {src:e.src,width:e.naturalWidth,height:e.naturalHeight};});
   assert(image.src.startsWith('data:image/jpeg;base64,'),'The normal viewer must display the saved original JPEG');
   const bytes=Buffer.from(image.src.split(',')[1],'base64'),file=output.replace(/\.json$/,'-hadal-photo.jpg');fs.writeFileSync(file,bytes);
   shadowPhoto={date:photo.date,individual:photo.individual,metadata:photo,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:image.width,height:image.height,bytes:bytes.length};
   check('normal photo viewer decodes the saved JPEG with matching byte count',bytes.length===photo.bytes&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9&&image.width>0&&image.height>0,shadowPhoto);
   assert(results.at(-1).pass);await shot('hadal-photo-preview');await press('#closePhoto');await press('#closePanel');
   await collectShadowAudit('after-normal-deep-photo',{deep:true});
  }
  await travel([780,-7000,-134],.45);await travel(stance('hadal-reference'),.35);await record(aimPoint('hadal-reference'),6);check('recovery removes the same physical instrument',(await state()).referenceSensorCount===0);
  await openHadal();check('finished underwater survey cannot report',await page.locator('#hadalReport').isDisabled()&&!(await state()).hadal.reported);await press('#closePanel');await returnHome();await openHadal();
  if(touch)for(const view of [{width:844,height:390,insets:{left:44,right:44,bottom:21,top:0}},{width:320,height:568,insets:{top:24,bottom:20,left:0,right:0}}]){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(450);await page.locator('#hadalReport').scrollIntoViewIfNeeded();await layout('report '+view.width+'x'+view.height,['hadalReport'],view.insets);
  }
  if(touch){await page.setViewportSize({width:390,height:844});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,right:0,bottom:0,left:0}});await page.waitForTimeout(450);}
  await press('#hadalReport');check('home report ends tracking and clears the completed route',(await state()).story.tracking===null&&(await state()).waypoint===null);
  check('home report preserves complete profile and individual',await page.locator('#hadalReportReply').isVisible()&&await page.locator('#hadalIndividual').isVisible()&&(await state()).hadal.reported);
  await shot('report');
  if(shadowAudit)await collectShadowAudit('before-completed-report-reload',{deep:true,restored:true});
  await page.reload();await boot();await openHadal();
  const final=await state();check('reload keeps report, old story and automatic quality',final.hadal.reported&&final.hadal.records.length===6&&JSON.stringify(oldState(final))===JSON.stringify(legacy)&&final.adaptive&&final.gl===0&&!final.lost,final);
  check('report stays readable without a second report control',await page.locator('#hadalReportReply').isVisible()&&await page.locator('#hadalReport').count()===0);
  if(touch)for(const view of [{width:844,height:390,insets:{left:44,right:44,bottom:21,top:0}},{width:320,height:568,insets:{top:24,bottom:20,left:0,right:0}}]){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(450);
   const fit=await page.evaluate(()=>{const p=$('panel').getBoundingClientRect(),c=$('closePanel').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,left:p.left,right:p.right,close:{left:c.left,right:c.right,top:c.top,bottom:c.bottom,width:c.width,height:c.height,hit:document.elementFromPoint(c.x+c.width/2,c.y+c.height/2)?.closest('button')===$('closePanel')}};});
   check('hadal journal fits safe area '+view.width+'x'+view.height,!fit.overflow&&fit.left>=0&&fit.right<=view.width&&fit.close.hit&&fit.close.width>=44&&fit.close.height>=44&&fit.close.left>=view.insets.left&&fit.close.right<=view.width-view.insets.right&&fit.close.top>=view.insets.top&&fit.close.bottom<=view.height-view.insets.bottom,fit);await shot('layout-'+view.width);
  }
  await press('#closePanel');
  if(shadowAudit){
   const stored=await page.evaluate(date=>({photo:voyage.state.features.photography.film.find(p=>p.date===date)||null,storage:oceanPhotography.snapshot()}),shadowPhoto.date);
   check('reload retains the deep photograph and original individual',stored.photo?.individual===fish.uid&&stored.photo.bytes===shadowPhoto.bytes&&stored.storage.durable&&!stored.storage.error&&!stored.storage.recovery,stored);
   assert(results.at(-1).pass);
   if(touch){await page.setViewportSize({width:390,height:844});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,right:0,bottom:0,left:0}});await page.waitForTimeout(450);}
   await press('#shipSettings');await press('#panelBody .settings-advanced > summary');await press('#legacyToolsBtn');
   await press('#panelBody .menu-advanced > summary');await press('#panelBody [data-feature="photography"]');await press('[data-photo-view="'+shadowPhoto.date+'"]');
   await page.waitForFunction(()=>photoOpen&&$('photoImage').complete&&$('photoImage').naturalWidth>0);
   const reloadedImage=await page.evaluate(()=>{const e=$('photoImage');return {src:e.src,width:e.naturalWidth,height:e.naturalHeight};});
   assert(reloadedImage.src.startsWith('data:image/jpeg;base64,'),'The normal reloaded viewer must display the saved original JPEG');
   const reloadedBytes=Buffer.from(reloadedImage.src.split(',')[1],'base64'),file=output.replace(/\.json$/,'-hadal-photo-reloaded.jpg');fs.writeFileSync(file,reloadedBytes);
   const reloadedPhoto={date:shadowPhoto.date,file,sha256:crypto.createHash('sha256').update(reloadedBytes).digest('hex'),bytes:reloadedBytes.length,width:reloadedImage.width,height:reloadedImage.height};
   observations.push({shadowPhotoReload:reloadedPhoto});
   check('normal photo viewer after reload decodes the identical original JPEG',reloadedPhoto.sha256===shadowPhoto.sha256&&reloadedPhoto.bytes===shadowPhoto.bytes&&reloadedPhoto.width===shadowPhoto.width&&reloadedPhoto.height===shadowPhoto.height,{original:shadowPhoto,reloaded:reloadedPhoto});
   assert(results.at(-1).pass);await shot('hadal-photo-reloaded-preview');await press('#closePhoto');await press('#closePanel');
   const before=await page.evaluate(()=>({completedFrames:window.__hadalShadowAudit.completedFrames,shallowDiveFrames:window.__hadalShadowAudit.shallowDiveFrames}));await press('#startBtn');
   await page.waitForFunction(before=>{const a=window.__hadalShadowAudit,s=a?.lastComplete;return active&&!modal&&player.p[1]>-160&&a.shallowDiveFrames>=before.shallowDiveFrames+30&&s?.active&&!s.sunless&&s.eye[1]>-160;},before,{timeout:30000});
   const shallow=await state(),audit=await collectShadowAudit('post-reload-normal-shallow-dive');
   check('normal start after report reload completes 30 shallow dive frames with automatic quality',shallow.active&&!shallow.modal&&shallow.p[1]>-160&&shallow.adaptive&&shallow.gl===0&&!shallow.lost&&errors.length===0&&audit.lastComplete.matrixValid&&audit.shallowDiveFrames>=before.shallowDiveFrames+30,{before,afterCompletedFrames:audit.completedFrames,afterShallowDiveFrames:audit.shallowDiveFrames,lastComplete:audit.lastComplete,shallow});
   assert(results.at(-1).pass);await shot('post-reload-shallow-dive');
  }
  check('native input is released',await page.evaluate(()=>keys.size===0&&stick.every(v=>v===0)&&lookStick.every(v=>v===0)&&verticalInput===0));
  check('no native page errors',errors.length===0,errors);
 }catch(error){fatal=error.stack||String(error);console.error(fatal);if(shadowAudit)try{observations.push({shadowAudit:{label:'failure-before-close',...await page.evaluate(()=>JSON.parse(JSON.stringify(window.__hadalShadowAudit||null)))}});}catch(_){}try{observations.push({failure:await page.evaluate(()=>({p:player?.p,modal,active,story:typeof oceanStory==='undefined'?null:oceanStory.snapshot(),context:typeof oceanStory==='undefined'?null:oceanStory.hadal.context()}))});await page.screenshot({path:output.replace(/\.json$/,'-failure.png')});}catch(_){}process.exitCode=1;}
 finally{if(session){try{if(contacts.size)await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}catch(_){}await session.detach().catch(()=>{});}await browser.close();fs.writeFileSync(output,JSON.stringify({status:!fatal&&results.every(r=>r.pass)?'passed':'failed',url,profile,metadata,checks:results,errors,fatal,traces,observations,inputs,...(shadowAudit?{shadowAudit:{enabled:true,epochs:shadowEpoch,homeReturns:shadowReturns,photo:shadowPhoto}}:{})},null,2));}
 if(results.some(r=>!r.pass))process.exitCode=1;
})();
