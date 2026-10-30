/* Natural desktop acceptance: visible home/mooring/map UI, physical keyboard
 * and mouse drag only. All page-script observations use CDP userGesture:false.
 * Do not replace these inputs with player/seed/time/quality writes, __prepareView,
 * pose calls, a frozen clock, or journal auto-follow. Root serializes native GPU.
 * Submission + pointer discovery is behavioral evidence; screenshots still need
 * visual review. This test makes no physical-phone or frame-rate claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/');
const out=path.resolve(root,option('out','qa/parity/v01851-environment/slope-native-desktop.json'));
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const travelSeconds=Number(option('deadline-seconds','360')),butterflyOnly=process.argv.includes('--butterfly-only');
assert(Number.isFinite(travelSeconds)&&travelSeconds>=30&&travelSeconds<=900,'Bound travel deadline to 30–900 seconds');
assert(!new URL(url).searchParams.has('still'),'Normal advancing simulation clock required');
assert(option('profile','desktop')==='desktop','This harness covers desktop only; do not label it phone acceptance');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const report={status:'running',profile:'desktop',url,expectedVersion,travelSeconds,butterflyOnly,
 method:'Fresh native Chrome context. Visible homepage 海圖與泊位 → ruins mooring → new dive → ordinary chart marker; live keyboard swimming and mouse drag with read-only position feedback. Pointer selection, archived instance submission and earned field notes. Normal save/home/continue. Default automatic quality and live simulation remain enabled. No game-state writes or auto-follow. Screenshots require visual review; no phone/FPS/power claim.',
 checks:[],inputs:[],checkpoints:[],trajectory:[],animals:[],images:[],errors:[],consoleErrors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const check=(name,pass,detail)=>{report.checks.push({name,passed:!!pass,detail});save();assert(pass,name);console.log('PASS '+name);};
const input=(kind,data)=>report.inputs.push({kind,...data,at:new Date().toISOString()});

(async()=>{let browser,page,cdp,travelUntil=Infinity;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const launch=require('./browser-launch.cjs')(true);
  if(process.argv.includes('--headed'))launch.headless=false;
  browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:2,isMobile:false,hasTouch:false});
  page=await context.newPage();cdp=await context.newCDPSession(page);page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('crash',()=>report.errors.push('Renderer process crashed'));
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  const read=async(fn,arg=null)=>{
   const r=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+JSON.stringify(arg)+')',returnByValue:true,userGesture:false});
   if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
   return r.result.value;
  };
  const wait=async(fn,arg=null,timeout=30000)=>{
   const until=Date.now()+timeout;
   while(Date.now()<until){const result=await read(fn,arg);if(result)return result;await delay(100);}
   throw Error('Timed out observing '+fn.toString());
  };
  async function press(selector){
   const control=page.locator(selector);await control.waitFor({state:'visible'});await control.scrollIntoViewIfNeeded();
   assert(await control.isEnabled(),'Enabled ordinary control: '+selector);await control.click();input('button',{selector});
  }
  async function key(name){await page.keyboard.press(name);input('key',{name});}
  async function shot(label){
   const file=out.replace(/\.json$/,'')+'-'+label+'.png',bytes=await page.screenshot({path:file,timeout:30000});
   report.images.push({label,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});save();
  }
  async function status(label){
   const row=await read(()=>{
    const stored=JSON.parse(localStorage.getItem(VOYAGE_KEY)||'null'),s=oceanEncounters.snapshot();
    const g=renderer.gl,extension=g.getExtension('WEBGL_debug_renderer_info');
    return {version:document.documentElement.dataset.version,active,modal,time:t,frame:renderer.frame,p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,
     adaptive:settings.adaptive,settingQuality:settings.quality,quality:renderer.quality,dynamicScale:renderer.dynamicScale,freeze:!!window.__freeze,
     compiled:renderer.sceneLoad?.compiled,streamed:renderer.sceneLoad?.streamed,hardware:extension?g.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,gl:g.getError(),lost:g.isContextLost(),
     arrangement:{seed:s.seed,slopeVersion:s.slopeVersion,slope:s.slope},dives:voyage.state.dives,minute:voyage.state.features.expedition?.minute,
     waypoint:voyage.state.waypoint,storedWaypoint:stored?.waypoint??null,storedSeed:stored?.features?.encounters?.seed??null,storedSlopeVersion:stored?.features?.encounters?.slopeVersion??null,
     saveOK:voyage.storageOK,resume:!!voyage.state.resume,storedResume:!!stored?.resume,mooring:oceanNavigation.snapshot().mooring};
   });
   row.label=label;row.arrangementHash=hash(row.arrangement);report.checkpoints.push(row);save();
   check(label+': current compiled native scene keeps automatic quality and a live healthy context',row.version===expectedVersion&&row.compiled&&row.streamed&&row.adaptive&&!row.freeze&&!row.lost&&row.gl===0&&!!row.hardware&&!/swiftshader|software|llvmpipe/i.test(row.hardware),{version:row.version,quality:row.quality,dynamicScale:row.dynamicScale,hardware:row.hardware});
   return row;
  }
  function retained(label,expected,actual){
   check(label,actual.arrangementHash===expected.arrangementHash&&actual.dives===expected.dives&&actual.saveOK&&actual.storedSeed===expected.arrangement.seed&&actual.storedSlopeVersion===1&&actual.storedResume,
    {seed:actual.arrangement.seed,arrangementHash:actual.arrangementHash,dives:actual.dives});
  }
  const pose=()=>read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,sensitivity:settings.sensitivity,velocity:player.velocity.slice(),
   active,modal,adaptive:settings.adaptive,freeze:!!window.__freeze,lookLock:settings.lookLock,third:settings.third,cruise:voyage.state.cruise,time:t,frame:renderer.frame}));
  function deadline(){assert(Date.now()<travelUntil,'Natural travel deadline exceeded; retain the partial route for diagnosis');}
  async function cruise(enabled){if(!!(await pose()).cruise!==enabled)await key('c');}
  async function aim(point){
   for(let attempt=0;attempt<14;attempt++){
    deadline();const p=await pose();assert(p.active&&!p.modal&&p.adaptive&&!p.freeze&&!p.lookLock&&!p.third,'Normal active first-person drag controls and adaptive quality remain enabled');
    const d=point.map((n,i)=>n-p.p[i]),yaw=Math.atan2(d[0],-d[2]),pitch=clamp(Math.atan2(d[1],Math.hypot(d[0],d[2])),-1.15,1.15);
    const dyaw=wrap(yaw-p.yaw),dpitch=pitch-p.pitch;
    if(Math.abs(dyaw)<.025&&Math.abs(dpitch)<.025)return;
    const dx=clamp(dyaw/(.0037*p.sensitivity),-260,260),dy=clamp(-dpitch/(.0032*p.sensitivity),-180,180);
    // A single real drag crosses the normal 5 px look threshold; all points
    // stay inside the exposed canvas. Never call turnCamera directly.
    const start={x:640,y:360},end={x:start.x+dx,y:start.y+dy};
    assert(await read(a=>document.elementFromPoint(a.x,a.y)?.id==='ocean',start),'Mouse-look starts on exposed water');
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:1});await page.mouse.up();
    input('drag',{from:start,to:end});await delay(40);
   }
   throw Error('Mouse-look did not converge using normal drag inputs');
  }
  async function hold(name,milliseconds,boost){
   if(boost)await page.keyboard.down('Shift');await page.keyboard.down(name);
   try{await delay(milliseconds);}finally{await page.keyboard.up(name);if(boost)await page.keyboard.up('Shift');}
   input('swim',{key:name,milliseconds,shift:boost});
  }
  async function swim(label,target,tolerance=.45){
   let best=Infinity,lastProgress=Date.now();const began=Date.now();
   for(let n=0;n<1000;n++){
    deadline();const before=await pose(),d=distance(before.p,target);
    assert(before.active&&!before.modal,'Swimming remains in the normal playable state');
    if(d<=tolerance){await cruise(false);await delay(300);const after=await pose();if(distance(after.p,target)<=tolerance+.25){report.trajectory.push({label,target,arrived:true,...after,elapsedMs:Date.now()-began});save();return after;}}
    if(d<best-.08){best=d;lastProgress=Date.now();}assert(Date.now()-lastProgress<25000,'No swimming progress toward '+label+'; possible collision or UI obstruction');
    const fast=d>5;await cruise(fast);
    const delta=target.map((v,i)=>v-before.p[i]),horizontal=Math.hypot(delta[0],delta[2]);
    let name='w';
    if(horizontal<.35&&Math.abs(delta[1])>.25)name=delta[1]>0?'e':'q';else await aim(target);
    const milliseconds=clamp((d-tolerance)*1000/(fast?12:4),50,fast?800:250);
    await hold(name,milliseconds,fast);
    if(n%4===0){report.trajectory.push({label,target,remaining:d,...await pose()});save();}
   }
   throw Error('Too many normal input steps toward '+label);
  }
  async function animal(uid){return read(id=>{
   const f=life.find(a=>a.uid===id);if(!f)return null;
   const point=animalFocusPoint(f),clip=project(point,renderer.vp),r=renderer.canvas.getBoundingClientRect(),x=r.left+(clip[0]*.5+.5)*r.width,y=r.top+(.5-clip[1]*.5)*r.height;
   const origin=renderer.renderOrigin||[0,0,0],batches=renderer.batches.filter(b=>b.instances.includes(f)).map(b=>{
    const packed=[];
    for(let i=0;i<b.drawCount;i++){const j=i*24,a=b.data;if(!a)continue;
     if(Math.hypot(...f.p.map((v,k)=>a[j+k]+origin[k]-v))<.12&&f.s.every((v,k)=>a[j+4+k]===Math.fround(v))&&a[j+10]===Math.fround(f.phase||0))packed.push(i);}
    return {streamMesh:b.streamMesh,kind:b.kind,material:b.material,resident:!!b.vao,visible:b.visible,drawCount:b.drawCount,packed};
   });
   const sp=SPECIES[f.species],field=voyage.state.features.ecology?.field?.[sp.id];
   return {uid:id,species:sp.id,home:f.home.slice(),p:f.p.slice(),focus:point,screen:{x,y,w:clip[2],ndc:clip.slice(0,2),exposed:document.elementFromPoint(x,y)?.id==='ocean'},
    distance:V.dist(player.p,point),observeDistance:speciesTraits(f.species).observeDistance,present:f.ecologyPresent!==false&&f.encounterPresent!==false,
    assetReady:f.assetReady!==false,clear:!blocked(eye,point,.001)&&!blocked(player.p,point,.001),
    archivedNode:renderer.sceneStream?.index.nodes.indexOf(f)??-1,batches,selected:oceanSelection.snapshot(),seen:persistent.seen.includes(sp.id),field:field?{...field}:null,time:t,frame:renderer.frame};
  },uid);}
  async function observe(uid,label){
   await cruise(false);let evidence;
   for(let attempt=0;attempt<3;attempt++){
    deadline();const initial=await animal(uid);assert(initial?.present,'Present real encounter actor '+uid);await aim(initial.focus);await delay(300);
    const candidate=await animal(uid),s=candidate.screen;
    check(label+': ordinary viewpoint has a nearby unobstructed projected animal',candidate.distance<=candidate.observeDistance&&candidate.clear&&s.w>0&&s.ndc.every(n=>Math.abs(n)<1)&&s.exposed,candidate);
    await page.mouse.click(s.x,s.y);input('animal-pointer',{uid,x:s.x,y:s.y});
    const until=Math.min(travelUntil,Date.now()+8000);
    while(Date.now()<until){evidence=await animal(uid);if(evidence.selected.uid===uid&&evidence.seen&&evidence.field?.points>=4)break;await delay(150);}
    if(evidence.selected.uid===uid&&evidence.seen&&evidence.field?.points>=4)break;
   }
   check(label+': normal pointer selection earns a saved first field observation',evidence?.selected.uid===uid&&evidence.selected.source==='pointer'&&evidence.seen&&evidence.field?.points>=4,evidence);
   const previous=evidence;await delay(300);evidence=await animal(uid);
   const submitted=a=>a.archivedNode>=0&&a.assetReady&&a.batches.some(b=>b.resident&&b.visible&&b.drawCount>0&&b.packed.length>0);
   check(label+': actual archived fish is submitted in two advancing rendered frames',submitted(previous)&&submitted(evidence)&&evidence.frame>previous.frame&&evidence.time>previous.time,{previous,evidence});
   report.animals.push({label,...evidence});await shot(label);return evidence;
  }

  await page.goto(url);
  await wait(()=>window.__ocean?.ready||!document.getElementById('errorBox')?.classList.contains('hidden'),null,120000);
  assert(await read(()=>!!window.__ocean?.ready),await read(()=>document.getElementById('errorMessage')?.textContent));
  await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  const fresh=await status('fresh-home');check('fresh browser has no resumed voyage',!fresh.resume&&fresh.dives===0);
  await press('#welcomeNavigation');await press('#panelBody details > summary');await press('[data-mooring="ruins"]');await press('#closePanel');
  check('visible homepage mooring control selects the ruins boat',await read(()=>oceanNavigation.snapshot().mooring==='ruins'));
  await press('#startBtn');await wait(()=>active&&!modal&&$('welcome').classList.contains('hidden'));
  const entered=await status('entered-at-ruins');
  check('new daytime dive contains the compiled pair and one or two lionfish',entered.dives===1&&entered.minute>=480&&entered.minute<1080&&entered.arrangement.slopeVersion===1&&entered.arrangement.slope.length===4&&entered.arrangement.slope.filter(a=>a.present).length>=3&&entered.arrangement.slope.filter(a=>a.habitat==='slope-butterfly'&&a.present).length===2,{minute:entered.minute,...entered.arrangement});
  // Clicking water is a normal way to leave button focus before keyboard use.
  await page.mouse.click(640,360);input('canvas-focus',{x:640,y:360});await key('m');await press('[data-mark="mesophotic-slope"]');await wait(()=>active&&!modal);
  const marked=await status('chart-marked');retained('ordinary chart marking keeps the saved placement',entered,marked);
  check('visible chart marks the discoverable slope without teleporting',marked.waypoint==='mesophotic-slope'&&marked.storedWaypoint===marked.waypoint&&distance(marked.p,entered.p)<1,{before:entered.p,after:marked.p});
  const pair=marked.arrangement.slope.find(a=>a.habitat==='slope-butterfly'&&a.present),lion=marked.arrangement.slope.find(a=>a.habitat==='slope-lionfish-a'&&a.present);
  assert(pair&&lion,'Both normal habitat groups are present');travelUntil=Date.now()+travelSeconds*1000;
  report.route={butterflyUID:pair.uid,lionfishUID:lion.uid,waypoints:[[265,-15,pair.home[2]],[285,-42,pair.home[2]],[pair.home[0]+2,pair.home[1],pair.home[2]]],travelStarted:new Date().toISOString()};save();
  await swim('eastward-open-water',report.route.waypoints[0],1.2);
  await swim('seaward-descent',report.route.waypoints[1],.7);
  await swim('butterfly-near-view',report.route.waypoints[2],.3);
  await observe(pair.uid,'longnose-butterfly');
  if(!butterflyOnly){await swim('lionfish-seaward-descent',[281,-72,lion.home[2]],.7);await swim('lionfish-near-view',[lion.home[0]+2,lion.home[1],lion.home[2]],.3);await observe(lion.uid,'lunulate-lionfish');}
  const found=await status('naturally-discovered');retained('normal exploration preserves the per-dive arrangement',entered,found);
  await press('#pauseBtn');await press('#menuHome');await wait(()=>!active&&!modal&&!$('welcome').classList.contains('hidden'));
  retained('save and home retain slope locations and attendance',entered,await status('saved-home'));
  await press('#shipContinue');await wait(()=>active&&!modal&&$('welcome').classList.contains('hidden'));
  retained('ordinary continue restores the same slope layout',entered,await status('continued'));await shot('continued');
  check('ordinary UI route completed without page or console errors',report.errors.length===0&&report.consoleErrors.length===0,{errors:report.errors,consoleErrors:report.consoleErrors});
  report.status=butterflyOnly?'passed-butterfly-natural-input-checks-visual-review-required':'passed-natural-input-checks-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;
  if(page&&!page.isClosed()){try{const file=out.replace(/\.json$/,'')+'-failure.png';await page.screenshot({path:file,timeout:10000});report.images.push({label:'failure',file});}catch(e){report.captureFailure=e.message;}}
 }finally{
  if(page&&!page.isClosed())for(const name of ['w','q','e','Shift'])try{await page.keyboard.up(name);}catch{}
  try{await page?.mouse.up();}catch{}save();await browser?.close();console.log(JSON.stringify({out,status:report.status,passed:report.checks.filter(c=>c.passed).length,total:report.checks.length}));
 }
})();
