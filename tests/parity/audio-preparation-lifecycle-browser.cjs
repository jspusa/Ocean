/* HISTORICAL v0.18.17–35 prewarm contract; run against an archived build only.
 * Current entry uses audio-optional-boot-browser.cjs and audio-entry-browser.cjs.
 * Pre-gesture graph assertions below intentionally describe the retired design. */
/* Native Web Audio lifecycle/fault evidence at the existing browser/system seam.
 * Only Web Audio construction/node/suspend/close boundaries are fault-controlled.
 * Gameplay, save ownership, camera, simulation time and quality are untouched.
 * Every read uses CDP userGesture:false; real focus comes from Chrome windows.
 * Desktop Chrome touch emulation is not physical-device/audio-quality evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(root,option('out','qa/parity/v01817-audio-lifecycle.json'));
assert(!new URL(url).searchParams.has('still'),'Natural animation is required');
const profiles=[{id:'desktop',viewport:{width:1280,height:800},dpr:2,touch:false},{id:'touch',viewport:{width:390,height:844},dpr:3,touch:true}].filter(p=>option('profile','desktop')==='all'||p.id===option('profile','desktop'));
const cases=['background-boot','pending-suspend-blur','constructor-fallback','constructor-failure','graph-failure','suspend-throw','suspend-reject','suspend-hang-late','close-hang'].filter(id=>option('case','all')==='all'||id===option('case','all'));assert(profiles.length&&cases.length,'Invalid profile/case');
const headless=process.argv.includes('--headless');
assert(!headless||cases.every(id=>!['background-boot','pending-suspend-blur','close-hang'].includes(id)),'Native focus-switch cases require visible Chrome');
const report={url,runnerSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),status:'running',method:'Native visible Chrome, strict document-user-activation-required policy verified from actual command line. Real Chrome focus emulation is disabled; on macOS an exact-browser-PID NSRunningApplication activation returns OS focus after the auxiliary window closes, without dispatching DOM events. All observations and fault controls use CDP Runtime.evaluate with userGesture:false. Only the named Web Audio system boundary is fault-controlled; real UI activates entry and the native resumed output path. For unfocused boot only, the unchanged bootstrap script response is held at the network boundary until a separate native window has focus. Background RAF limitations are inconclusive rather than a fabricated pass. No gameplay/save/ownership/pose/time/quality mutation.',cases:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
report.presentation=headless?'headless native Chrome; no native window/focus-switch cases':'visible native Chrome';
if(headless)report.method=report.method.replace('Native visible Chrome','Native headless Chrome');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function installBoundary(fault){
 const trace=window.__audioLifecycle={fault,constructors:[],operations:[],connections:[],events:[],fetches:[],held:false,released:false,closeHeld:false},ids=new WeakMap(),contexts=[];let sequence=0,ctorAttempts=0,graphFaults=0,suspendFaults=0,closeFaults=0,releaseHold=null;
 const id=value=>{if(!value)return null;if(!ids.has(value))ids.set(value,++sequence);return ids.get(value);};
 const state=()=>({at:performance.now(),hidden:document.hidden,focused:document.hasFocus(),activation:navigator.userActivation?.isActive??null,everActivated:navigator.userActivation?.hasBeenActive??null,loading:!document.getElementById('loading')?.classList.contains('gone'),ready:!!window.__ocean?.ready});
 trace.identify=id;trace.nativeContexts=()=>contexts.map(c=>({id:id(c),state:c.state}));
 trace.releaseSuspend=()=>{if(!releaseHold)throw Error('No pending injected suspend');trace.released=true;releaseHold();releaseHold=null;};
 for(const name of ['visibilitychange'])document.addEventListener(name,e=>trace.events.push({type:name,trusted:e.isTrusted,...state()}));
 for(const name of ['focus','blur','pageshow','pagehide'])window.addEventListener(name,e=>trace.events.push({type:name,trusted:e.isTrusted,...state()}));
 for(const name of ['pointerdown','touchstart','click'])document.addEventListener(name,e=>trace.events.push({type:name,trusted:e.isTrusted,target:e.target?.closest?.('[id]')?.id||null,...state()}),true);
 const originalFetch=window.fetch;window.fetch=function(...args){const address=typeof args[0]==='string'?args[0]:args[0]?.url||String(args[0]);if(/\/music\/|\.(?:mp3|m4a|wav)(?:\?|$)/i.test(address))trace.fetches.push({url:address,...state()});return Reflect.apply(originalFetch,this,args);};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...args){const result=Reflect.apply(connect,this,args);trace.connections.push({from:id(this),to:id(args[0]),fromType:this.constructor.name,toType:args[0]?.constructor.name,context:id(this.context)});return result;};
 const wrapped=new Set(),proxies=new Map();
 for(const name of ['AudioContext','webkitAudioContext']){
  const Native=window[name];if(!Native)continue;
  if(!wrapped.has(Native.prototype)){
   wrapped.add(Native.prototype);
   const gain=Native.prototype.createGain;Native.prototype.createGain=function(...args){if(fault==='graph-failure'&&graphFaults++===0){trace.operations.push({method:'createGain',injected:true,context:id(this),...state()});throw Error('Injected first Web Audio graph failure');}return Reflect.apply(gain,this,args);};
   for(const method of ['suspend','resume','close']){
    const original=Native.prototype[method];Native.prototype[method]=function(...args){const row={method,context:id(this),stateBefore:this.state,...state()};trace.operations.push(row);let result;
     try{
      const first=method==='suspend'&&suspendFaults++===0;
      if(first&&fault==='suspend-throw'){row.injected=true;throw Error('Injected first synchronous suspend failure');}
      if(first&&fault==='suspend-reject'){row.injected=true;result=Promise.reject(Error('Injected first asynchronous suspend failure'));}
      else{
       result=Reflect.apply(original,this,args);
       if(first&&['pending-suspend-blur','suspend-hang-late','close-hang'].includes(fault)){row.injected=true;trace.held=true;const held=new Promise(resolve=>{releaseHold=resolve;});result=Promise.resolve(result).then(()=>{row.nativeSettled=state();return held;});}
       if(method==='close'&&fault==='close-hang'&&closeFaults++===0){row.injected=true;result=Promise.resolve(result).then(()=>{row.nativeSettled=state();trace.closeHeld=true;return new Promise(()=>{});});}
      }
      Promise.resolve(result).then(()=>{row.settled=state();row.stateAfter=this.state;},error=>{row.settled=state();row.error=String(error);row.stateAfter=this.state;});return result;
     }catch(error){row.error=String(error);throw error;}
    };
   }
  }
  if(!proxies.has(Native)){let Observed;Observed=new Proxy(Native,{construct(Target,args,newTarget){const row={attempt:++ctorAttempts,options:args[0]||null,...state()};trace.constructors.push(row);try{if((fault==='constructor-fallback'&&ctorAttempts===1)||(fault==='constructor-failure'&&ctorAttempts<=2)){row.injected=true;throw Error('Injected AudioContext construction failure');}const context=Reflect.construct(Target,args,newTarget===Observed?Target:newTarget);contexts.push(context);row.context=id(context);row.state=context.state;return context;}catch(error){row.error=String(error);throw error;}}});proxies.set(Native,Observed);}
  window[name]=proxies.get(Native);
 }
}

async function read(session,expression){const result=await session.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:false});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function waitFor(session,expression,label,timeout=30000){const end=Date.now()+timeout;let value;do{value=await read(session,expression);if(value)return value;await sleep(100);}while(Date.now()<end);throw Error('Timed out: '+label+'; last observation '+JSON.stringify(value));}
const snapshotExpression=`(()=>{const a=typeof oceanAudio==='undefined'?null:oceanAudio,e=window.__audioLifecycle;let rms=null;if(a?.analyser){const data=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length);}return {at:performance.now(),version:document.documentElement.dataset.version||null,ready:!!window.__ocean?.ready,active:!!window.__ocean?.active,hidden:document.hidden,focused:document.hasFocus(),activation:navigator.userActivation?.isActive??null,everActivated:navigator.userActivation?.hasBeenActive??null,loadingVisible:!document.getElementById('loading')?.classList.contains('gone'),context:a?.ctx?.state||null,contextID:a?.ctx?e.identify(a.ctx):null,enabled:a?.enabled,timer:a?.timer,loadingIsNull:a?.loading===null,musicReady:a?.ready,sources:a?.sources?.length,masterGain:a?.master?.gain.value??null,masterID:a?.master?e.identify(a.master):null,limiterID:a?.limiter?e.identify(a.limiter):null,destinationID:a?.ctx?e.identify(a.ctx.destination):null,analyserID:a?.analyser?e.identify(a.analyser):null,rms,preference:typeof settings==='undefined'?null:settings.startWithSound,sound:typeof settings==='undefined'?null:settings.sound,adaptive:typeof settings==='undefined'?null:settings.adaptive,guard:typeof oceanSaveGuard==='undefined'?null:oceanSaveGuard.live,frame:typeof renderer==='undefined'?null:renderer?.frame,gl:typeof renderer==='undefined'?null:renderer?.gl?.getError(),nativeContexts:e?.nativeContexts()||[]};})()`;
const rawExpression=`(()=>{const {identify,nativeContexts,releaseSuspend,...trace}=window.__audioLifecycle;return {...trace,nativeContexts:nativeContexts()};})()`;

async function runCase(browser,browserCDP,profile,caseID){
 const row={profile:profile.id,case:caseID,status:'running',checks:[],snapshots:[],errors:[]};report.cases.push(row);save();
 const check=(name,condition,detail)=>{row.checks.push({name,passed:!!condition,detail});save();assert(condition,profile.id+' '+caseID+': '+name);console.log('PASS '+profile.id+' '+caseID+' '+name);};
 let context,page,other,session;
 try{
  context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,isMobile:profile.touch,hasTouch:profile.touch});await context.addInitScript(installBoundary,caseID);
  page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));session=await context.newCDPSession(page);await session.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  const snap=async label=>{const data=await read(session,snapshotExpression);row.snapshots.push({label,...data});save();return data;};
  const shiftAway=async()=>{const ownerTarget=await session.send('Target.getTargetInfo'),created=context.waitForEvent('page');
   await browserCDP.send('Target.createTarget',{url:'about:blank',newWindow:true,browserContextId:ownerTarget.targetInfo.browserContextId});other=await created;
   const otherCDP=await context.newCDPSession(other);await otherCDP.send('Emulation.setFocusEmulationEnabled',{enabled:false});await session.send('Emulation.setFocusEmulationEnabled',{enabled:false});
   const otherTarget=await otherCDP.send('Target.getTargetInfo');
   const ownerWindow=await browserCDP.send('Browser.getWindowForTarget',{targetId:ownerTarget.targetInfo.targetId}),otherWindow=await browserCDP.send('Browser.getWindowForTarget',{targetId:otherTarget.targetInfo.targetId});row.windows={owner:ownerWindow,other:otherWindow};
   // Keep the owner at least partly visible, so real unfocused loading can run.
   assert.notEqual(ownerWindow.windowId,otherWindow.windowId,'Lifecycle control must use a separate native window');
   await browserCDP.send('Browser.setWindowBounds',{windowId:otherWindow.windowId,bounds:{left:1150,top:60,width:300,height:240,windowState:'normal'}});
   await other.bringToFront();await waitFor(session,'document.hasFocus()===false','real owner blur',5000);return snap('actually-unfocused');};
  const returnOwner=async()=>{if(other){await other.close();other=null;}const target=await session.send('Target.getTargetInfo');await browserCDP.send('Target.activateTarget',{targetId:target.targetInfo.targetId});await page.bringToFront();
   if(process.platform==='darwin'){const processes=(await browserCDP.send('SystemInfo.getProcessInfo')).processInfo,browserProcess=processes.find(p=>p.type==='browser');assert(browserProcess&&Number.isSafeInteger(browserProcess.id),'Native Chrome browser PID must be known');const pid=browserProcess.id,result=require('node:child_process').execFileSync('osascript',['-l','JavaScript','-e',`ObjC.import('AppKit'); var app=$.NSRunningApplication.runningApplicationWithProcessIdentifier(${pid}); app.activateWithOptions(3);`],{timeout:10000,encoding:'utf8'}).trim();row.nativeFocusAdapter={kind:'macOS NSRunningApplication activation by exact browser PID',pid,activationReturned:result==='true',rawResult:result,at:Date.now(),doesNotDispatchDOMEvents:true};}
   // Some macOS Chrome versions leave the surviving window non-key after the
   // auxiliary window closes. Restore that native window without a page click.
   if(!await read(session,'document.hasFocus()')){const owner=await browserCDP.send('Browser.getWindowForTarget',{targetId:target.targetInfo.targetId});await browserCDP.send('Browser.setWindowBounds',{windowId:owner.windowId,bounds:{windowState:'minimized'}});await browserCDP.send('Browser.setWindowBounds',{windowId:owner.windowId,bounds:{windowState:'normal'}});await page.bringToFront();row.nativeWindowRestored=true;}
   await waitFor(session,'document.hasFocus()','real owner focus after auxiliary window closes',5000);const trace=await read(session,rawExpression);check('return is a trusted native focus event',trace.events.some(e=>e.type==='focus'&&e.trusted&&e.focused),trace.events);};
  if(caseID==='background-boot'){
   let releaseBootstrap,requestArrived;const arrived=new Promise(resolve=>{requestArrived=resolve;}),held=new Promise(resolve=>{releaseBootstrap=resolve;});
   await page.route('**/src/bootstrap.js*',async route=>{row.bootstrapGate={url:route.request().url(),heldAt:Date.now()};requestArrived();await held;row.bootstrapGate.releasedAt=Date.now();await route.continue();});
   const navigation=page.goto(url,{waitUntil:'domcontentloaded'});navigation.catch(()=>{});let gateDeadline;try{await Promise.race([arrived,new Promise((_,reject)=>{gateDeadline=setTimeout(()=>reject(Error('Bootstrap request did not reach native IO timing gate')),30000);})]);}finally{clearTimeout(gateDeadline);}
   try{await shiftAway();}finally{releaseBootstrap();}await navigation;
   await session.send('Emulation.setFocusEmulationEnabled',{enabled:false});await waitFor(session,'document.hasFocus()===false','background page remains genuinely unfocused',5000);
   try{await waitFor(session,'!!window.__ocean?.ready','unfocused boot completes',90000);}catch(error){row.raw=await read(session,rawExpression);row.status='inconclusive';row.limitation='This native browser did not finish unfocused boot within 90 seconds. Background RAF may be suspended; no document visibility/focus or RAF was forged.';row.failure=String(error);await snap('unfocused-boot-timeout');return;}
   const home=await snap('unfocused-ready-home');row.raw=await read(session,rawExpression);check('genuinely unfocused boot reaches ready without audio construction or music IO',home.ready&&!home.focused&&home.context===null&&row.raw.constructors.length===0&&row.raw.fetches.length===0&&!home.everActivated,home);
   await returnOwner();await sleep(800);const returned=await snap('focused-ready-home');check('returning to interactive home does not schedule late preparation',returned.context===null&&!returned.enabled&&returned.timer===null&&returned.loadingIsNull,returned);
  }else{
   await page.bringToFront();await page.goto(url,{waitUntil:'domcontentloaded'});
   if(caseID==='suspend-hang-late'||caseID==='close-hang'){
    if(caseID==='close-hang'){
     await waitFor(session,'window.__audioLifecycle?.held&&window.__audioLifecycle.operations.some(x=>x.method==="suspend"&&x.nativeSettled&&!x.settled)','native suspend is pending before actual focus loss',120000);
     const pending=await snap('pending-before-close-hang-blur');
     check('preparation is still loading silently before the real blur',!pending.ready&&pending.loadingVisible&&!pending.enabled&&!pending.everActivated&&pending.context==='suspended',pending);
     await shiftAway();await read(session,'window.__audioLifecycle.releaseSuspend(); true');
    }
    const suspend=caseID==='suspend-hang-late',method=suspend?'suspend':'close';
    await waitFor(session,'window.__audioLifecycle?.operations.some(x=>x.method==='+JSON.stringify(method)+'&&x.injected&&x.nativeSettled&&!x.settled)','native '+method+' is held at its unresolved system boundary',120000);
    const held=await snap('unresolved-'+method);row.raw=await read(session,rawExpression);
    check('audio boundary is unresolved without a user gesture',!held.everActivated&&!held.enabled&&row.raw.operations.some(x=>x.method===method&&x.injected&&x.nativeSettled&&!x.settled),held);
    // This five-second allowance starts only after the audio fault is reached;
    // scene loading time cannot hide an infinite audio preparation wait.
    await waitFor(session,'!!window.__ocean?.ready','unresolved '+method+' cannot block playable home',5000);
    const recovered=await snap('ready-with-unresolved-'+method);row.raw=await read(session,rawExpression);
    const operation=row.raw.operations.find(x=>x.method===method&&x.injected);
    check('home is ready with the unused graph detached while the promise stays unresolved',recovered.ready&&!recovered.loadingVisible&&recovered.context===null&&!recovered.enabled&&recovered.timer===null&&recovered.loadingIsNull&&operation&&!operation.settled,{recovered,operation,elapsedMs:recovered.at-operation.at});
    if(caseID==='close-hang'){
     check('pending close follows actual focus loss and a successful preparation result',!recovered.focused&&row.raw.events.some(e=>e.type==='blur'&&e.trusted&&!e.focused)&&row.raw.operations.some(x=>x.method==='suspend'&&x.injected&&x.settled&&!x.error)&&!operation.focused,{recovered,operations:row.raw.operations,events:row.raw.events});
     await returnOwner();
    }
   }else if(caseID==='pending-suspend-blur'){
    await waitFor(session,'window.__audioLifecycle?.held&&window.__audioLifecycle.operations.some(x=>x.method==="suspend"&&x.nativeSettled)','native suspend settles while its boundary promise is held',120000);
    const pending=await snap('preparation-pending');check('preparation waits silently inside loading before any user activation',!pending.ready&&pending.loadingVisible&&pending.context==='suspended'&&pending.masterGain===0&&!pending.enabled&&!pending.everActivated,pending);
    await shiftAway();await read(session,'window.__audioLifecycle.releaseSuspend(); true');await waitFor(session,'!!window.__ocean?.ready','pending preparation finishes after true blur',30000);
    const released=await snap('released-after-blur');row.raw=await read(session,rawExpression);check('unactivated context is actually closed and detached after focus is lost',released.ready&&!released.focused&&released.context===null&&!released.enabled&&released.timer===null&&released.nativeContexts.length===1&&released.nativeContexts[0].state==='closed'&&row.raw.operations.some(x=>x.method==='close'&&x.settled),released);
    check('focus loss was a trusted native lifecycle event',row.raw.events.some(e=>e.type==='blur'&&e.trusted&&!e.focused),row.raw.events);
    await returnOwner();
   }else await waitFor(session,'!!window.__ocean?.ready','fault does not prevent ready',120000);
   const home=await snap('ready-after-boundary-case');row.raw=await read(session,rawExpression);
   check('ready home remains unactivated, silent and free of music IO',home.ready&&!home.everActivated&&!home.sound&&!home.enabled&&home.timer===null&&home.loadingIsNull&&home.sources===0&&row.raw.fetches.length===0&&!row.raw.operations.some(o=>o.method==='resume'),home);
   if(caseID==='constructor-fallback')check('options constructor failure succeeds through the native fallback without a gesture',row.raw.constructors.length===2&&row.raw.constructors[0].injected&&row.raw.constructors[0].options?.sampleRate===24000&&row.raw.constructors[1].options===null&&!row.raw.constructors[1].error&&home.context==='suspended'&&home.masterGain===0,row.raw.constructors);
   if(caseID==='constructor-failure')check('both constructor attempts fail safely before later UI retry',row.raw.constructors.length===2&&row.raw.constructors.every(c=>c.injected)&&home.context===null,row.raw.constructors);
   if(caseID==='graph-failure'||caseID==='suspend-throw'||caseID==='suspend-reject'){
    await waitFor(session,'window.__audioLifecycle.nativeContexts().every(x=>x.state==="closed")','failed prepared context closes');const cleaned=await snap('failed-context-cleaned');check('injected boundary failure releases its graph before gesture retry',row.raw.operations.some(o=>o.injected)&&cleaned.context===null&&cleaned.nativeContexts.length===1&&cleaned.nativeContexts[0].state==='closed',cleaned);
   }
  }
  await waitFor(session,'document.getElementById("loading")?.classList.contains("hidden")','loading overlay clears');const before=await snap('before-trusted-entry');
  check('observations have not manufactured user activation',before.everActivated===false&&before.activation===false,before);
  if(profile.touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
  await waitFor(session,'!!window.__ocean?.active&&typeof renderer!=="undefined"&&renderer.frame>'+JSON.stringify(before.frame||0),'normal UI produces an active renderer submission');
  await waitFor(session,`(()=>{const a=oceanAudio;if(a.ctx?.state!=='running'||!a.enabled||!settings.sound||!a.ready||a.sources.length!==2||!a.analyser)return false;const d=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,n)=>s+n*n,0)/d.length)>1e-6;})()`,'native resumed original two-stem output',30000);
  const after=await snap('trusted-entry-output');row.raw=await read(session,rawExpression);
  check('normal trusted entry resumes under real user activation',row.raw.events.some(e=>e.type==='click'&&e.target==='startBtn'&&e.trusted&&e.activation)&&row.raw.operations.some(o=>o.method==='resume'&&o.activation&&o.at>=before.at),row.raw.operations);
  check('native running context produces both original stems and nonzero analyser output',after.active&&after.context==='running'&&after.enabled&&after.musicReady&&after.sources===2&&after.rms>1e-6,after);
  const edge=(from,to)=>row.raw.connections.some(x=>x.from===from&&x.to===to);
  check('native master output is connected through limiter to real destination',edge(after.masterID,after.limiterID)&&edge(after.limiterID,after.destinationID)&&edge(after.masterID,after.analyserID),{master:after.masterID,limiter:after.limiterID,destination:after.destinationID,analyser:after.analyserID,connections:row.raw.connections});
  check('released or failed contexts are not reused by the successful gesture',caseID==='constructor-fallback'?after.contextID===before.contextID:after.contextID!==before.contextID&&after.contextID!==null,{before:before.contextID,after:after.contextID,native:after.nativeContexts});
  if(caseID==='suspend-hang-late'){
   const old=row.raw.operations.find(x=>x.method==='suspend'&&x.injected);
   check('entry has recovered before the original preparation promise is released',old&&!old.settled&&!row.raw.released&&after.contextID!==old.context,{old,after});
   await read(session,'window.__audioLifecycle.releaseSuspend(); true');
   await waitFor(session,'window.__audioLifecycle.operations.some(x=>x.method==="suspend"&&x.injected&&x.settled)','original suspended preparation resolves late',5000);
   await sleep(250);const late=await snap('after-late-suspend-resolution');row.raw=await read(session,rawExpression);
   check('late preparation completion cannot close or replace the new playing graph',late.ready&&late.active&&late.contextID===after.contextID&&late.context==='running'&&late.enabled&&late.musicReady&&late.sources===2&&late.rms>1e-6&&!row.raw.operations.some(x=>x.method==='close'&&x.context===after.contextID),{late,operations:row.raw.operations});
  }
  if(caseID==='close-hang'){
   const close=row.raw.operations.find(x=>x.method==='close'&&x.injected);
   check('entry and original music recover while old close remains unresolved',close&&!close.settled&&row.raw.closeHeld&&after.contextID!==close.context,{close,after});
  }
  if(caseID==='suspend-hang-late'||caseID==='close-hang'){
   const position=await read(session,'__ocean.position');
   if(profile.touch){
    const box=await page.locator('#joystick').boundingBox();assert(box,'Touch joystick is visible');const point={id:1,x:box.x+box.width/2,y:box.y+box.height/2};let touching=false;
    try{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});touching=true;point.y-=box.height*.4;await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});await sleep(700);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touching=false;}finally{if(touching)await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}
   }else{await page.keyboard.down('w');try{await sleep(700);}finally{await page.keyboard.up('w');}}
   const moved=await read(session,'({position:__ocean.position,input:__ocean.input})');
   check('normal swimming controls work after the audio preparation failure',Math.hypot(...moved.position.map((v,i)=>v-position[i]))>.1&&moved.input.move.every(v=>v===0)&&moved.input.look.every(v=>v===0)&&moved.input.vertical===0,{before:position,after:moved});
  }
  row.hardware=await read(session,`(()=>{const gl=renderer.gl,extension=gl.getExtension('WEBGL_debug_renderer_info');return extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null;})()`);
  check('default adaptive quality and valid native renderer remain available',after.adaptive&&row.snapshots.every(s=>s.gl==null||s.gl===0)&&row.hardware&&!/swiftshader|llvmpipe|software/i.test(row.hardware),{snapshot:after,hardware:row.hardware});
  check('no uncaught page errors',row.errors.length===0,row.errors);row.status='passed';
 }catch(error){row.status='failed';row.failure=error.stack;console.error(error);}
 finally{if(session)try{row.final=await read(session,snapshotExpression);row.raw=await read(session,rawExpression);}catch(error){row.finalReadError=String(error);}save();await context?.close();}
}

if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-browser-run',profiles:profiles.map(p=>p.id),cases,url,output}));
else(async()=>{let browser;try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const launch=require('./browser-launch.cjs')(true);browser=await chromium.launch({...launch,headless,args:[...(launch.args||[]),'--enable-automation','--autoplay-policy=document-user-activation-required'],ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const session=await browser.newBrowserCDPSession();report.commandLine=(await session.send('Browser.getBrowserCommandLine')).arguments;
 assert(report.commandLine.includes('--autoplay-policy=document-user-activation-required')&&!report.commandLine.some(a=>a.includes('no-user-gesture-required')),'Actual Chrome command line must require a document gesture');
 for(const profile of profiles)for(const id of cases)await runCase(browser,session,profile,id);
 report.status=report.cases.some(r=>r.status==='failed')?'failed':report.cases.some(r=>r.status==='inconclusive')?'incomplete':'passed';if(report.status!=='passed')process.exitCode=1;console.log(report.status.toUpperCase()+' '+output);
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;console.error(error);}finally{save();await browser?.close();}})();
