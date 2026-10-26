/* Natural input and native RAF/render submission evidence. No pose, clock,
 * quality, progression or freeze writes. Run alone on native Chrome GPU.
 * Touch emulates a phone on this computer, not physical phone/power evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>{const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;};
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(__dirname,'../..',option('out','qa/parity/v01815-render-cadence-browser.json')),selected=option('profile','both');
assert(['both','desktop','touch'].includes(selected),'--profile must be both, desktop or touch');
assert(!new URL(url).searchParams.has('still'),'A frozen scene cannot prove native rendering cadence');
const profiles=[{id:'desktop',touch:false,viewport:{width:1280,height:800},dpr:2},{id:'touch',touch:true,viewport:{width:390,height:844},dpr:3}].filter(p=>selected==='both'||p.id===selected);
const checks=[],rows=[],errors=[];let fatal=null;
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};
const intervals=values=>values.slice(1).map((value,i)=>value-values[i]);
const stats=values=>{const a=values.slice().sort((a,b)=>a-b);return {count:a.length,mean:a.length?a.reduce((sum,n)=>sum+n,0)/a.length:null,p95:a.length?a[Math.min(a.length-1,Math.floor(a.length*.95))]:null,max:a.length?a.at(-1):null};};

async function capture(profile){
 // Each profile owns a separate browser and closes it before the next opens.
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});let context,page,cdp,contact=null;
 const row={profile,stages:[],inputs:[],completed:false};rows.push(row);
 try{
  context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,isMobile:profile.touch,hasTouch:profile.touch});
  page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',error=>errors.push(profile.id+': '+error.message));page.on('crash',()=>errors.push(profile.id+': renderer process crashed'));
  cdp=await context.newCDPSession(page);
  // One serialized native CDP contact stream avoids mixing pointer IDs with
  // Playwright's touch adapter. Desktop uses actual mouse/keyboard input.
  async function touchDown(x,y){assert(!contact);contact={id:1,x,y};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});}
  async function touchMove(x,y){assert(contact);contact={...contact,x,y};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact]});}
  async function touchUp(){assert(contact);contact=null;await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  async function press(selector){const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();if(profile.touch){const b=await node.boundingBox();assert(b);await touchDown(b.x+b.width/2,b.y+b.height/2);await touchUp();}else await node.click();}
  async function boot(){
   await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
   assert(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());
   await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
   await page.waitForFunction(()=>!renderer.sceneStream?.waitStarted&&(!renderer.sceneStream||renderer.sceneStream.jobs.size===0));
  }
  async function installProbe(){
   await page.evaluate(()=>{
    const nativeRAF=window.requestAnimationFrame.bind(window),originalRender=renderer.render,renderDescriptor=Object.getOwnPropertyDescriptor(renderer,'render'),originalLife=updateLife;
    const read=()=>({now:performance.now(),p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,eye:eye.slice(),target:target.slice(),t,diveSeconds,active,modal,photoOpen,adaptive:settings.adaptive,settingQuality:settings.quality,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],frame:renderer.frame,hidden:document.hidden,focused:document.hasFocus(),streamWaiting:!!renderer.sceneStream?.waitStarted,selected:oceanSelection.snapshot(),nameVisible:!$('focusCard').classList.contains('hidden'),animal:allLife[0]?.p.slice()});
    const probe={stage:null,alive:true,rafID:null,read};
    function wrappedRender(...args){
     const stage=probe.stage,frame=this.frame,dirty=this.dirty,at=performance.now();
     const result=Reflect.apply(originalRender,this,args);
     if(stage)stage.renderCalls.push({at,frameAdvance:this.frame-frame,returnedFalse:result===false,dirty,draws:this.drawCalls,triangles:this.submittedTriangles});
     return result;
    }
    function wrappedLife(...args){const result=Reflect.apply(originalLife,this,args);if(probe.stage)probe.stage.lifeCalls.push({at:performance.now(),time:args[0]});return result;}
    renderer.render=wrappedRender;updateLife=wrappedLife;
    const observe=at=>{if(!probe.alive)return;if(probe.stage)probe.stage.raf.push({at,t,diveSeconds,p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,frame:renderer.frame,hidden:document.hidden,focused:document.hasFocus()});probe.rafID=nativeRAF(observe);};
    probe.rafID=nativeRAF(observe);
    probe.begin=name=>{if(probe.stage)throw Error('Overlapping native samples');probe.stage={name,before:read(),raf:[],renderCalls:[],lifeCalls:[]};};
    probe.end=()=>{const stage=probe.stage;if(!stage)throw Error('No native sample');stage.after=read();probe.stage=null;return stage;};
    probe.restore=()=>{probe.alive=false;cancelAnimationFrame(probe.rafID);if(renderer.render===wrappedRender){if(renderDescriptor)Object.defineProperty(renderer,'render',renderDescriptor);else delete renderer.render;}if(updateLife===wrappedLife)updateLife=originalLife;};
    window.__cadenceProbe=probe;
   });
  }
  const state=()=>page.evaluate(()=>__cadenceProbe.read());
  async function sample(name,ms){
   await page.evaluate(name=>__cadenceProbe.begin(name),name);await page.waitForTimeout(ms);const stage=await page.evaluate(()=>__cadenceProbe.end());
   const seconds=(stage.after.now-stage.before.now)/1000,complete=stage.renderCalls.filter(call=>call.frameAdvance>0);
   stage.metrics={seconds,rawRAF:stage.raf.length,rawRAFHz:stage.raf.length/seconds,renderAttempts:stage.renderCalls.length,completeSubmissions:complete.length,submittedHz:complete.length/seconds,frameAdvance:stage.after.frame-stage.before.frame,lifeUpdates:stage.lifeCalls.length,lifeHz:stage.lifeCalls.length/seconds,dirtyCalls:stage.renderCalls.filter(call=>call.dirty).length,rafIntervalsMs:stats(intervals(stage.raf.map(f=>f.at))),renderIntervalsMs:stats(intervals(complete.map(f=>f.at))),clockAdvance:stage.after.t-stage.before.t,diveAdvance:stage.after.diveSeconds-stage.before.diveSeconds,distance:distance(stage.before.p,stage.after.p)};
   row.stages.push(stage);console.log(JSON.stringify({profile:profile.id,stage:name,...stage.metrics}));return stage;
  }
  function cadence(stage,cap){
   const m=stage.metrics,allowance=2; // Sampling endpoints/one immediate dirty frame.
   check(profile.id+'/'+stage.name+' counts actual completed frames separately from RAF',m.frameAdvance===m.completeSubmissions&&m.completeSubmissions<=m.renderAttempts&&stage.renderCalls.every(c=>c.frameAdvance===0||c.frameAdvance===1),m);
   check(profile.id+'/'+stage.name+' respects '+cap+' Hz full-scene budget',m.completeSubmissions>0&&m.completeSubmissions<=Math.ceil(m.seconds*cap)+allowance&&m.lifeUpdates<=Math.ceil(m.seconds*cap)+allowance,m);
   check(profile.id+'/'+stage.name+' remains visible, focused and automatic',stage.before.adaptive&&stage.after.adaptive&&stage.raf.every(f=>!f.hidden&&f.focused),{before:stage.before,after:stage.after});
  }
  async function settlePanel(){await page.locator('#panel').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));await page.waitForTimeout(100);}

  await page.goto(url);await boot();await installProbe();
  row.metadata=await page.evaluate(()=>{const gl=renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,adaptive:settings.adaptive,settingQuality:settings.quality};});
  check(profile.id+' native hardware and untouched default auto quality',row.metadata.adaptive&&row.metadata.renderer&&!/swiftshader|software|llvmpipe|softpipe/i.test(row.metadata.renderer),row.metadata);assert(checks.at(-1).pass);
  await page.waitForTimeout(800);
  const home=await sample('passive-home',3400);cadence(home,30);
  check(profile.id+' home animation remains live at its measured capped cadence',!home.after.active&&home.metrics.clockAdvance>.5&&home.metrics.lifeUpdates===home.metrics.completeSubmissions&&home.before.scale===home.after.scale&&home.before.settingQuality===home.after.settingQuality,{metrics:home.metrics,scale:[home.before.scale,home.after.scale]});
  // This observation is reported only when this host actually exposes enough
  // RAF opportunities. It is not a claim of 120/144 Hz physical hardware.
  row.homeSubmissionReduction={observed:home.metrics.rawRAFHz>45,rawRAF:home.metrics.rawRAF,submissions:home.metrics.completeSubmissions,ratio:home.metrics.completeSubmissions/Math.max(1,home.metrics.rawRAF)};
  if(row.homeSubmissionReduction.observed)check(profile.id+' passive home skips full work on available native RAF opportunities',row.homeSubmissionReduction.ratio<.75,row.homeSubmissionReduction);

  await press('#startBtn');await page.waitForFunction(()=>active&&!modal);await page.locator('#welcome').waitFor({state:'hidden'});await page.waitForTimeout(650);
  const activeStage=await sample('active-idle',3400);cadence(activeStage,60);
  check(profile.id+' active world and dive clocks follow real elapsed time',Math.abs(activeStage.metrics.clockAdvance-activeStage.metrics.seconds)<.25&&Math.abs(activeStage.metrics.diveAdvance-activeStage.metrics.seconds)<.25&&distance(activeStage.before.animal,activeStage.after.animal)>.001,{metrics:activeStage.metrics,animal:[activeStage.before.animal,activeStage.after.animal]});
  check(profile.id+' passive viewing never automatically displays a fish name',!activeStage.before.nameVisible&&!activeStage.after.nameVisible&&activeStage.after.selected.uid===null,{selected:activeStage.after.selected,nameVisible:activeStage.after.nameVisible});

  if(profile.touch){const b=await page.locator('#joystick').boundingBox();assert(b);await touchDown(b.x+b.width/2,b.y+b.height/2);await touchMove(b.x+b.width/2,b.y+b.height*.19);}else await page.keyboard.down('w');
  const moving=await sample('native-swimming',1500);
  if(profile.touch)await touchUp();else await page.keyboard.up('w');
  cadence(moving,60);row.inputs.push({type:profile.touch?'native touch joystick':'native keyboard W',stage:moving.name});
  check(profile.id+' native movement advances the real player and game clock',moving.metrics.distance>.5&&moving.metrics.clockAdvance>1&&Math.abs(moving.metrics.clockAdvance-moving.metrics.seconds)<.25&&Math.abs(moving.metrics.diveAdvance-moving.metrics.seconds)<.25,{metrics:moving.metrics,p:[moving.before.p,moving.after.p]});
  await page.waitForTimeout(800);const cameraBefore=await state();
  // The current mobile UI hides the old look pad. Both input profiles drag a
  // genuinely exposed canvas path, with touch starting on the right half.
  const drag={dx:90,dy:-20},point=await page.evaluate(({touch,dx,dy})=>{
   for(const cy of [.56,.46,.65,.37])for(const cx of touch?[.60,.70,.54]:[.40,.50,.60]){
    const x=innerWidth*cx,y=innerHeight*cy;
    if(x<12||x+dx>innerWidth-12||y+dy<80||y>innerHeight-130)continue;
    if([0,.5,1].every(u=>document.elementFromPoint(x+dx*u,y+dy*u)?.id==='ocean'))return {x,y};
   }return null;
  },{touch:profile.touch,...drag});assert(point,'A visible canvas drag area is required');
  if(profile.touch){await touchDown(point.x,point.y);await touchMove(point.x+drag.dx,point.y+drag.dy);await touchUp();}
  else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+drag.dx,point.y+drag.dy,{steps:6});await page.mouse.up();}
  await page.waitForTimeout(250);const cameraAfter=await state();row.inputs.push({type:profile.touch?'native touch canvas drag':'native mouse canvas drag',from:point,...drag,before:cameraBefore,after:cameraAfter});
  check(profile.id+' native camera input changes both yaw and rendered view',Math.abs(cameraAfter.yaw-cameraBefore.yaw)>.1&&distance(cameraAfter.target,cameraBefore.target)>.1&&!cameraAfter.nameVisible,{before:cameraBefore,after:cameraAfter});

  await press('#pauseBtn');await page.waitForFunction(()=>!!modal);await settlePanel();
  const paused=await sample('paused-menu',2000);
  check(profile.id+' visible pause stops simulation and full scene updates',paused.metrics.rawRAF>0&&paused.metrics.completeSubmissions===0&&paused.metrics.lifeUpdates===0&&paused.metrics.clockAdvance===0&&paused.metrics.diveAdvance===0&&paused.metrics.distance===0,paused.metrics);
  const beforeResume=await state();await press('#resumeBtn');await page.waitForFunction(()=>active&&!modal);
  const resumed=await sample('resumed',1600);cadence(resumed,60);
  const first=resumed.raf[0],resumeElapsed=(resumed.after.now-beforeResume.now)/1000;
  check(profile.id+' resume does not catch up paused seconds or jump the player',!!first&&distance(first.p,beforeResume.p)<.02&&distance(resumed.after.p,beforeResume.p)<.02&&resumed.after.t-beforeResume.t<resumeElapsed+.10&&resumed.after.diveSeconds-beforeResume.diveSeconds<resumeElapsed+.10&&resumed.metrics.clockAdvance>1,{before:beforeResume,first,after:resumed.after,resumeElapsed});

  await press('#pauseBtn');await settlePanel();await press('#menuHome');await page.waitForFunction(()=>!active&&!modal);await page.waitForTimeout(600);
  const returned=await sample('returned-home',2400);cadence(returned,30);
  check(profile.id+' home return preserves automatic quality preference and stored resume',returned.after.adaptive&&returned.after.settingQuality===row.metadata.settingQuality&&await page.locator('#shipContinue').isVisible(),{state:returned.after});
  row.beforeReload=await state();row.gl=await page.evaluate(()=>renderer.gl.getError());
  await page.evaluate(()=>__cadenceProbe.restore());await page.reload();await boot();await installProbe();row.afterReload=await state();
  check(profile.id+' normal reload preserves auto quality and visible continue entry',row.afterReload.adaptive&&row.afterReload.settingQuality===row.metadata.settingQuality&&await page.locator('#shipContinue').isVisible(),{before:row.beforeReload,after:row.afterReload});
  check(profile.id+' complete natural session has no GL error',row.gl===0,{gl:row.gl});
  row.completed=true;return row;
 }finally{
  if(page&&!page.isClosed()){
   if(contact)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});
   await page.keyboard.up('w').catch(()=>{});
   await page.evaluate(()=>window.__cadenceProbe?.restore()).catch(()=>{});
  }
  await context?.close().catch(()=>{});await browser.close();
 }
}

(async()=>{
 try{for(const profile of profiles)await capture(profile);}catch(error){fatal=error.stack||String(error);console.error(fatal);}
 finally{
  check('requested native profiles finish sequentially without page errors',rows.length===profiles.length&&rows.every(row=>row.completed)&&errors.length===0&&!fatal,{profiles:rows.map(row=>({id:row.profile.id,completed:row.completed})),errors,fatal});
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({url,status:checks.every(c=>c.pass)?'passed':'failed',method:'Visible normal home/start/pause/resume/home/reload controls and native keyboard/mouse or CDP touch. No world, camera, clock, quality, progression or freeze assignments. A separate native RAF observer reports callback opportunities; transparent renderer.render and updateLife wrappers preserve this, arguments and return values and report actual renderer.frame completion separately. Default adaptive quality remains enabled. Initial/dirty boundary allowance is two complete frames per sample. Each desktop/touch profile owns a separate sequential native Chrome process. Touch is emulation on this computer GPU, not physical phone acceptance, battery measurement or proof of a 120/144 Hz display. Deterministic high-refresh policy/physics is covered by the separate CPU suite.',checks,rows,errors,fatal},null,2));
  if(!checks.every(c=>c.pass))process.exitCode=1;
 }
})();
