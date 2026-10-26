/* Native Chrome, natural RAF, standard-gamepad source boundary only.
 * No domain calls, fixture saves, pose/time/trust writes or synthetic activation.
 * The one native start click is explicit; all later input is navigator.getGamepads.
 * Controller input is simulated on desktop, not physical-controller evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{const prefix='--'+name+'=',value=process.argv.find(a=>a.startsWith(prefix));return value?value.slice(prefix.length):fallback;};
const url=option('url','http://127.0.0.1:8765/'),scenario=option('case','pen-entry'),out=path.resolve(root,option('out','qa/parity/gamepad-tools-browser.json'));
const viewportArg=option('viewport',scenario==='hint-layout'?'390x844':'1280x800');
assert(scenario==='hint-layout'?['390x844','844x390'].includes(viewportArg):viewportArg==='1280x800','Only hint-layout supports the 390x844 and 844x390 touch layouts');
const [viewportWidth,viewportHeight]=viewportArg.split('x').map(Number),touchSurface=scenario==='input-containment'||scenario==='hint-layout';
const profileArg=option('profile-dir',null),profileDir=profileArg?path.resolve(root,profileArg):null;
const priorReportArg=option('resume-from-report',null),priorReport=priorReportArg?JSON.parse(fs.readFileSync(path.resolve(root,priorReportArg),'utf8')):null;
if(profileDir)assert(/^\/tmp\/ocean-v01818-natural-profile-[a-zA-Z0-9_-]+$/.test(profileDir),'Persistent QA browser profiles must use a dedicated /tmp/ocean-v01818-natural-profile-* directory');
if(priorReport)assert(profileDir&&priorReport.browserProfile?.directory===profileDir,'Natural continuation must use the same actual browser profile as its prior report');
assert(!new URL(url).searchParams.has('still'),'Natural RAF is required');
assert(['pen-entry','pen-workflow','pen-lifecycle','input-containment','hint-layout','nature-training','nature-training-resume','nature-exploration'].includes(scenario),'Unknown --case');
const report={url,scenario,status:'running',checks:[],errors:[],captures:[],actions:[],snapshots:[],method:'Visible native Chrome. A fresh browser profile and unchanged default adaptive quality. Only navigator.getGamepads is replaced; controller buttons/axes pass through the production RAF and pollGamepad. Reads and source controls use CDP Runtime.evaluate with userGesture:false. One explicit native start click permits normal initial audio. No gameplay fixture, pose/time/progress/trust write, direct tool invocation or forced rendering. Desktop controller simulation, not physical-device certification.'};
report.browserProfile=profileDir?{directory:profileDir,existing:fs.existsSync(path.join(profileDir,'Default')),method:'Actual persistent Chrome profile, no storage-state or save injection'}:{method:'Fresh isolated browser context'};
if(priorReport)report.continuation={priorReport:path.resolve(root,priorReportArg),priorStatus:priorReport.status};
report.inputSurface=touchSurface?'Desktop Chrome touch/coarse-pointer emulation at '+viewportWidth+' x '+viewportHeight+', not a physical phone':'Desktop Chrome fine-pointer UI';
report.viewport={width:viewportWidth,height:viewportHeight};
if(profileDir)report.method=report.method.replace('A fresh browser profile','An isolated persistent QA browser profile containing only results of normal earlier game interaction');
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function installGamepadSource(){
 window.__gamepadToolsInput={id:'Ocean QA standard input boundary',index:0,mapping:'standard',connected:true,timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>__gamepadToolsInput.connected?[__gamepadToolsInput]:[]});
 window.__gamepadToolsEvents=[];
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click'])document.addEventListener(type,event=>{
  const rows=__gamepadToolsEvents;if(rows.length>=1200)rows.shift();
  rows.push({at:performance.now(),type,id:event.target?.id||null,pointerType:event.pointerType||null,pointerId:event.pointerId??null,trusted:event.isTrusted,x:event.clientX,y:event.clientY});
 },true);
}
async function run(){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const launch={...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']};
 let browser,context,page,cdp;
 const read=async(fn,arg)=>{const expression='('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')';const result=await cdp.send('Runtime.evaluate',{expression,userGesture:false,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});save();console.log((passed?'PASS ':'FAIL ')+name);assert(passed,name);};
 const wait=async(fn,arg,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=await read(fn,arg);if(value)return value;await delay(40);}throw new Error('Condition timed out: '+fn.toString());};
 const pad=async({buttons=[],axes=[0,0,0,0],values={},connected=true}={})=>{
  report.actions.push({type:'gamepad',at:Date.now(),buttons,axes,values,connected});
  await read(input=>{const pad=__gamepadToolsInput;pad.connected=input.connected;pad.timestamp=performance.now();pad.axes=input.axes.slice();for(let i=0;i<pad.buttons.length;i++){const pressed=input.buttons.includes(i),value=input.values[i]??(pressed?1:0);pad.buttons[i]={pressed,touched:value>0,value};}},{buttons,axes,values,connected});
 };
 const press=async(index,hold=100)=>{await pad();await delay(100);await pad({buttons:[index]});await delay(hold);await pad();await delay(180);};
 const visible=async(selector)=>read(selector=>{const node=document.querySelector(selector);if(!node||!node.getClientRects().length)return false;const style=getComputedStyle(node),r=node.getBoundingClientRect();return !node.closest('.hidden,[hidden]')&&style.visibility!=='hidden'&&style.display!=='none'&&r.width>0&&r.height>0;},selector);
 const pointer=async()=>{if(await visible('#gamepadCursor'))return;await press(8);await wait(()=>{const node=document.getElementById('gamepadCursor');if(!node)return false;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!node.closest('.hidden,[hidden]');},undefined,3000);};
 const capture=async(label)=>{const file=out.replace(/\.json$/,'.'+label+'.png');await page.screenshot({path:file});report.captures.push({label,file});save();};
 const snapshot=async(label)=>{const value=await read(()=>({active,modal,ready,time:t,position:player.p.slice(),adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,frame:renderer.frame,gl:renderer.gl.getError(),pen:oceanExploration.penMode,strokes:structuredClone(voyage.state.features.exploration.strokes),inkSegments:oceanExploration.inkSegments,inkBatches:renderer.batches.filter(b=>b.dynamic&&b.kind===0&&b.maxDistance===60&&!b.shadow).map(b=>({visible:b.visible,instances:b.instances.length,drawCount:b.drawCount,points:b.instances.map(i=>i.p.slice())})),film:oceanPhotography.snapshot().film,saveStatus:oceanSaveSession.status,saved:JSON.parse(localStorage.getItem(VOYAGE_KEY)),events:__gamepadToolsEvents.slice()}));report.snapshots.push({label,...value});save();return value;};
 // Closed-loop controller movement uses only the cursor and target DOM bounds.
 const move=async(target,{buttons=[]}={})=>{
  await pointer();const until=Date.now()+25000;
  while(Date.now()<until){
   const data=await read(target=>{const cursor=document.getElementById('gamepadCursor')?.getBoundingClientRect();let p=target;
    if(typeof target==='string'||target.selector){const node=document.querySelector(typeof target==='string'?target:target.selector);if(!node)return null;const r=node.getBoundingClientRect();if(!r.width||!r.height||node.closest('.hidden,[hidden]'))return null;p={x:r.left+r.width/2+(target.dx||0),y:r.top+r.height/2+(target.dy||0)};}
    return cursor?{x:cursor.left+cursor.width/2,y:cursor.top+cursor.height/2,target:p,width:innerWidth,height:innerHeight}:null;},target);
   assert(data,'Cursor and target must exist: '+target);const dx=data.target.x-data.x,dy=data.target.y-data.y,distance=Math.hypot(dx,dy);
   if(distance<5){await pad({buttons});await delay(80);return;}
   if(data.target.y<2||data.target.y>data.height-2){await pad({buttons,axes:[0,0,0,data.target.y<2?-1:1]});await delay(120);continue;}
   const speed=Math.min(.96,Math.max(.15,distance/95)),inverse=value=>Math.abs(value)<.006?0:Math.sign(value)*(.15+Math.abs(value)*.85);await pad({buttons,axes:[inverse(dx/distance*speed),inverse(dy/distance*speed),0,0]});await delay(55);
  }
  await pad();throw new Error('Controller did not reach target '+JSON.stringify(target));
 };
 const click=async(selector)=>{await move(selector);const hit=await read(()=>{const r=document.getElementById('gamepadCursor').getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {tag:el?.tagName,id:el?.id,ariaHidden:el?.closest('[aria-hidden="true"]')?.tagName,activation:el?.closest('button,input,select,a[href],summary,label,textarea,[contenteditable]')?.id};});report.actions.push({type:'pointer-click',target:selector,hit,at:Date.now()});console.log('CLICK '+(typeof selector==='string'?selector:JSON.stringify(selector))+' '+JSON.stringify(hit));await press(0);};
 const openTool=async(id)=>{
  await pointer();
  if(await read(()=>active))await click('#fieldToolsBtn');
  else {await click('#shipSettings');await pointer();await click('#panelBody .settings-advanced > summary');await click('#legacyToolsBtn');}
  await wait(()=>modal==='fieldTools');await pointer();await click('#panelBody .menu-advanced > summary');await click('#panelBody [data-feature="'+id+'"]');await wait(id=>modal===id,id);
 };
 const neutral=async()=>{await pad();await delay(220);};
 const pointerOff=async()=>{await neutral();if(await visible('#gamepadCursor'))await press(8);await neutral();};
 const approach=async(uid,stop=1.7,timeout=180000)=>{
  await pointerOff();const end=Date.now()+timeout,trace=[];let previous=null,stuck=0,escapes=0,lastRecord=0;
  const inverse=value=>Math.abs(value)<.025?0:Math.sign(value)*(.15+Math.min(1,Math.abs(value))*.85);
  while(Date.now()<end){
   const state=await read(uid=>{const f=life.find(f=>f.uid===uid);if(!f)return null;return {p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,sensitivity:settings.sensitivity,actor:animalFocusPoint(f),present:f.ecologyPresent!==false,ground:groundHeight(player.p[0],player.p[2]),velocity:player.velocity.slice(),active,modal,frame:renderer.frame};},uid);
   assert(state?.present&&state.active&&!state.modal,'Natural swimming requires an available actor and active sea');
   const delta=state.actor.map((v,i)=>v-state.p[i]),distance=Math.hypot(...delta),horizontal=Math.hypot(delta[0],delta[2]);
   if(Date.now()-lastRecord>1000){trace.push({...state,distance});lastRecord=Date.now();if(trace.length%5===0)console.log('SWIM '+JSON.stringify({uid,distance:Number(distance.toFixed(2)),p:state.p.map(n=>Number(n.toFixed(2))),actor:state.actor.map(n=>Number(n.toFixed(2))),yaw:state.yaw,pitch:state.pitch}));}
   let y=state.actor[1];if(horizontal>18)y=Math.max(state.actor[1],-1.2);
   const aim=[delta[0],y-state.p[1],delta[2]],yaw=Math.atan2(aim[0],-aim[2]),pitch=Math.atan2(aim[1],Math.max(.01,horizontal)),yawError=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw)),pitchError=pitch-state.pitch;
   if(distance<=stop&&Math.abs(yawError)<.10&&Math.abs(pitchError)<.12){await neutral();report.actions.push({type:'natural-approach',uid,trace,endedAt:Date.now()});save();return;}
   if(previous&&Math.hypot(...state.p.map((v,i)=>v-previous[i]))<.015&&distance>stop+2)stuck++;else stuck=0;previous=state.p;
   if(stuck>=35){if(++escapes>4)throw new Error('Natural route collision did not clear: '+JSON.stringify({uid,trace:trace.slice(-8)}));await pad({buttons:[7],axes:[escapes%2?.85:-.85,0,0,0]});await delay(1500);await neutral();stuck=0;continue;}
   const forward=distance>stop&&Math.abs(yawError)<.55?Math.max(.08,Math.min(1,(distance-stop*.55)*.35)):0;
   await pad({axes:[0,-inverse(forward),inverse(Math.max(-1,Math.min(1,yawError*1.7/(1.05*state.sensitivity)))),inverse(Math.max(-1,Math.min(1,-pitchError*1.9/(.83*state.sensitivity))))]});await delay(100);
  }
  await neutral();report.actions.push({type:'natural-approach-timeout',uid,trace});save();throw new Error('Natural approach timeout for '+uid);
 };
 const fishPoint=async(uid)=>read(uid=>{const f=life.find(f=>f.uid===uid),q=project(animalFocusPoint(f),renderer.vp),r=renderer.canvas.getBoundingClientRect();return {x:r.left+(q[0]*.5+.5)*r.width,y:r.top+(.5-q[1]*.5)*r.height,depth:q[2]};},uid);
 const naturalTraining=async()=>{
  const resumeOwned=scenario==='nature-training-resume',priorEcology=priorReport?.snapshots.findLast(s=>s.saved)?.saved?.features?.ecology,priorPartner=resumeOwned?priorEcology?.partners?.find(p=>p.uid===priorEcology.selected):null;
  if(resumeOwned)assert(priorPartner,'Training continuation requires the documented naturally recruited partner');
  const uid=await read(preferred=>preferred&&life.some(f=>f.uid===preferred)?preferred:life.filter(f=>SPECIES[f.species].id==='dolphin'&&f.ecologyPresent!==false).sort((a,b)=>V.dist(a.p,player.p)-V.dist(b.p,player.p))[0]?.uid,priorPartner?.uid);assert(uid,'A naturally present bottlenose dolphin is required');
  const origin=await read(uid=>({p:player.p.slice(),record:structuredClone(voyage.state.features.ecology.individuals[uid]||null),partners:voyage.state.features.ecology.partners.length,owned:structuredClone(voyage.state.features.ecology.partners.find(p=>p.uid===uid)||null)}),uid);
  if(resumeOwned){check('training resumes the exact partner and trust earned in the documented natural voyage',origin.partners===priorEcology.partners.length&&JSON.stringify(origin.owned)===JSON.stringify(priorPartner)&&['trust','strokes','feeds'].every(key=>origin.record?.[key]===priorEcology.individuals[uid]?.[key]),{origin,priorPartner});await capture('natural-earned-partner-restored');}
  else{
  if(priorReport&&origin.record){const prior=priorReport.snapshots.at(-1)?.saved?.features?.ecology?.individuals?.[uid];check('natural retry resumes only the documented normally earned observation record',origin.partners===0&&prior&&['trust','strokes','feeds'].every(key=>origin.record[key]===prior[key])&&origin.record.seconds>=prior.seconds&&origin.record.seconds<=prior.seconds+5,{origin,prior});}
  else check('natural recruitment starts without seeded trust or a pre-owned partner',origin.partners===0&&!origin.record,origin);
  await approach(uid,3.2);await pointer();await move(await fishPoint(uid));await press(0);await wait(uid=>oceanSelection.snapshot().uid===uid,uid);
  check('controller A explicitly selects the naturally approached dolphin',await read(uid=>oceanSelection.snapshot().uid===uid,uid));
  await approach(uid,1.6,45000);await pointer();const contact=await read(uid=>{const f=life.find(f=>f.uid===uid),p=animalFocusPoint(f),hud=document.getElementById('ecologyHUD'),button=document.getElementById('ecologyPet'),r=button.getBoundingClientRect();return {uid,species:f.species,traits:speciesTraits(f.species),position:player.p.slice(),eye:eye.slice(),actor:p,distance:V.dist(player.p,p),projection:project(p,renderer.vp),blockedEye:blocked(eye,p,.13),blockedPlayer:blocked(player.p,p,.13),retreat:f.retreat,faunaVisibility:f.faunaVisibility,ecology:oceanEcology.snapshot(),hud:{className:hud.className,display:getComputedStyle(hud).display},button:{x:r.x,y:r.y,width:r.width,height:r.height}};},uid);report.snapshots.push({label:'selected-contact-diagnostics',...contact});save();console.log('CONTACT '+JSON.stringify(contact));
  await click('#ecologyPet');await wait(()=>oceanEcology.snapshot().tool==='pet');
  for(let attempt=0;attempt<14;attempt++){
   const progress=await read(uid=>structuredClone(voyage.state.features.ecology.individuals[uid]||{}),uid);if(progress.trust>=24&&progress.seconds>=6)break;
   await approach(uid,2.8,45000);await pointer();
   // Selection is retained across pointer-mode changes; if the animal swam out
   // of observation range, explicitly point at its rendered body again.
   if(!await read(uid=>oceanSelection.snapshot().uid===uid,uid)){await move(await fishPoint(uid));await press(0);}
   if(!await read(()=>oceanEcology.snapshot().tool==='pet'))await click('#ecologyPet');
   let naturallyDeparted=false;try{await move('#ecologyTouch');await pad({buttons:[0]});await delay(180);await move({selector:'#ecologyTouch',dx:46},{buttons:[0]});await delay(180);await move({selector:'#ecologyTouch',dx:-46},{buttons:[0]});await move('#ecologyTouch',{buttons:[0]});}
   catch(error){if(!String(error).includes('Cursor and target must exist')||await visible('#ecologyTouch'))throw error;naturallyDeparted=true;}
   finally{await neutral();}await delay(450);
   const after=await read(uid=>structuredClone(voyage.state.features.ecology.individuals[uid]||{}),uid);report.actions.push({type:'natural-petting-attempt',attempt,uid,before:progress,after,naturallyDeparted});save();console.log('PET '+JSON.stringify({attempt,uid,after,naturallyDeparted}));
  }
  const earned=await read(uid=>structuredClone(voyage.state.features.ecology.individuals[uid]||{}),uid);check('real observation and repeated valid strokes earn recruitment and riding trust',earned.trust>=24&&earned.seconds>=6&&earned.strokes>=4,earned);await capture('natural-dolphin-trust');
  await approach(uid,3.2,45000);await pointer();await click('#ecologyBefriend');await wait(uid=>voyage.state.features.ecology.selected===uid,uid);
  check('visible invitation recruits the actual encountered individual',await read(uid=>voyage.state.features.ecology.partners.some(p=>p.uid===uid),uid));
  await click('#ecologyWhistle');await wait(()=>oceanEcology.snapshot().target!==null,undefined,20000);await click('#ecologyRide');await wait(()=>oceanEcology.snapshot().riding);
  const riding=await read(()=>({p:player.p.slice(),uid:oceanEcology.snapshot().grabbedUID}));await delay(700);check('grab follows the actual partner through normal physics',await read(before=>oceanEcology.snapshot().riding&&oceanEcology.snapshot().grabbedUID===before.uid&&V.dist(player.p,before.p)>.1,riding));await capture('natural-partner-ride');await click('#ecologyRide');await wait(()=>!oceanEcology.snapshot().grabbedUID);
  }
  await pointer();await click('#pauseBtn');await wait(()=>modal==='diveMenu');await pointer();await click('#menuHome');await wait(()=>!active&&!modal);await openTool('training');await wait(()=>oceanEcology.snapshot().training?.stage==='ready',undefined,90000);
  check('the naturally recruited partner arrives at the actual ship training stage',await read(uid=>oceanEcology.snapshot().training?.uid===uid,uid));await capture('natural-training-ready');
  const gesture=async(part,kind)=>{const selector='#ecologyPart-'+part;await pointer();await move(selector);if(kind==='double'){await press(0,65);await press(0,65);}else if(kind==='hold'){await pad({buttons:[0]});await delay(850);await neutral();}else{await pad({buttons:[0]});await delay(170);await move({selector,dx:32},{buttons:[0]});await delay(170);await move({selector,dx:-32},{buttons:[0]});await move(selector,{buttons:[0]});report.actions.push({type:'training-stroke-observation',part,gesture:await read(()=>structuredClone(oceanEcology.snapshot().training?.gesture||null))});save();await neutral();}};
  for(const [part,kind,trick]of [['mouth','double','spin'],['mouth','stroke','frontflip'],['mouth','hold','backflip'],['fin','double','tailwalk'],['fin','stroke','sing'],['fin','hold','handshake']]){
   await click('#ecologyClearQueue');await gesture(part,kind);const queue=await read(()=>oceanEcology.snapshot().training.queue.slice());check('actual '+part+' '+kind+' gesture queues '+trick,queue.length===1&&queue[0]===trick,queue);await capture('training-'+trick);
  }
  await gesture('mouth','double');await gesture('fin','stroke');check('three real gestures form the full three-command sequence',await read(()=>oceanEcology.snapshot().training.queue.join(',')==='handshake,spin,sing'));
  await gesture('mouth','hold');check('a fourth gesture cannot exceed the three-command limit',await read(()=>oceanEcology.snapshot().training.queue.length===3));
  await click('#ecologyStrength');const strength=await read(()=>Number(document.getElementById('ecologyStrength').value));for(let i=0;i<5;i++)await press(14);check('D-pad changes the selected training strength control',await read(before=>Number(document.getElementById('ecologyStrength').value)<before,strength));
  await click('#ecologyGo');await wait(()=>!!oceanEcology.snapshot().training?.performance);await move('#ecologyPraise');await wait(()=>{const tr=oceanEcology.snapshot().training,q=tr?.trick;return q&&(oceanEcology.snapshot().now-q.start)/q.duration>=.56;});await press(0,60);await capture('training-performance');
  await wait(()=>!oceanEcology.snapshot().training?.performance,undefined,30000);const outcome=await read(uid=>structuredClone(voyage.state.features.ecology.partners.find(p=>p.uid===uid)),uid);check('Go and timely feedback produce persistent real training outcomes',outcome.mastery.handshake>=1&&outcome.lastPerformance?.count===3,outcome);
  await press(9);await neutral();await page.reload();await wait(()=>window.__ocean?.ready&&document.getElementById('loading')?.classList.contains('gone'),undefined,120000);const restored=await read(uid=>structuredClone(voyage.state.features.ecology.partners.find(p=>p.uid===uid)),uid);check('normal reload preserves earned identity, mastery and completed performance',JSON.stringify(restored)===JSON.stringify(outcome),restored);await snapshot('natural-training-reloaded');await capture('natural-training-reloaded');
 };
 try{
  const contextOptions={viewport:{width:viewportWidth,height:viewportHeight},deviceScaleFactor:1,isMobile:touchSurface,hasTouch:touchSurface};
  if(profileDir){context=await chromium.launchPersistentContext(profileDir,{...launch,...contextOptions});browser=context.browser();}
  else{browser=await chromium.launch(launch);context=await browser.newContext(contextOptions);}
  await context.addInitScript(installGamepadSource);page=context.pages()[0]||await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));cdp=await context.newCDPSession(page);await page.bringToFront();await page.goto(url);
  await wait(()=>window.__ocean?.ready&&document.getElementById('loading')?.classList.contains('gone'),undefined,120000);
  const hardware=await read(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null;});
  check('native GPU and unchanged default adaptive quality',hardware&&!/swiftshader|llvmpipe|software/i.test(hardware)&&await read(()=>settings.adaptive),hardware);
  report.actions.push({type:'native-click',selector:'#startBtn',purpose:'Normal game entry and browser audio gesture'});await page.locator('#startBtn').click();await wait(()=>active&&!modal);
  const before=await snapshot('normal-entry');check('normal entry renders with a writable save owner',before.active&&before.frame>0&&before.gl===0&&before.saveStatus==='owned',before.position);
  await press(8);const cursorPresent=await visible('#gamepadCursor');check('View / Select opens the visible controller tool cursor',cursorPresent,{cursorPresent});
  check('pointer usage hint is visible',await visible('#gamepadPointerHint'));
  const hintLayout=await read(()=>{const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},hint=document.getElementById('gamepadPointerHint'),controls=['#joystick','#upBtn','#downBtn','#photoBtn','#boostBtn'].map(selector=>({selector,el:document.querySelector(selector)})).filter(({el})=>el&&!el.closest('.hidden,[hidden]')&&el.getClientRects().length&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden').map(({selector,el})=>({selector,...box(el)}));return {hint:box(hint),controls,viewport:{width:innerWidth,height:innerHeight},frame:renderer.frame};});
  report.snapshots.push({label:'pointer-hint-visible-layout',...hintLayout});
  check('the actual pointer hint bounds stay above the visible bottom controls',hintLayout.controls.length>0&&hintLayout.hint.width>0&&hintLayout.hint.height>0&&hintLayout.hint.left>=0&&hintLayout.hint.right<=hintLayout.viewport.width&&hintLayout.hint.top>=0&&hintLayout.hint.bottom<=Math.min(hintLayout.viewport.height*.5,...hintLayout.controls.map(c=>c.top)),hintLayout);
  if(scenario==='hint-layout')await capture('hint-visible');
  report.actions.push({type:'normal-wait',durationMs:5200,purpose:'Observe the production hint timeout without changing its clock or state'});await delay(5200);
  const hintHidden=!await visible('#gamepadPointerHint'),cursorRetained=await visible('#gamepadCursor');check('the hint hides after 5.2 real seconds while the tool cursor remains visible',hintHidden&&cursorRetained,{hintHidden,cursorRetained});
  if(scenario==='hint-layout'){const after=await snapshot('hint-auto-hidden');check('the touch-layout entry keeps rendering at default adaptive quality',after.frame>hintLayout.frame&&after.adaptive&&after.gl===0&&after.saveStatus==='owned',{frameBefore:hintLayout.frame,frameAfter:after.frame,adaptive:after.adaptive,gl:after.gl});await capture('hint-auto-hidden');check('no runtime errors',report.errors.length===0,report.errors);report.status='passed';return;}
  if(scenario==='nature-training'||scenario==='nature-training-resume'){await naturalTraining();check('no runtime errors',report.errors.length===0,report.errors);report.status='passed';return;}
  if(scenario==='nature-exploration'){await require('./helpers/gamepad-exploration-flow.cjs')({read,check,click,move,pointer,pad,neutral,press,wait,capture,approach,fishPoint,page,delay,report,save,openTool});check('no runtime errors',report.errors.length===0,report.errors);report.status='passed';return;}
  if(scenario==='input-containment'){
   check('the actual touch controls are visible on the emulated input surface',await visible('#upBtn')&&await visible('#downBtn')&&await visible('#joystick'));
   check('the legacy right joystick remains hidden in the current camera-drag UI',!await visible('#lookpad'));
   for(const selector of ['#upBtn','#downBtn','#joystick']){
    await move(selector);const origin=await read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch}));await pad({buttons:[0]});await delay(350);
    if(selector==='#joystick')await move({selector,dx:28,dy:-24},{buttons:[0]});await delay(350);
    const held=await read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,move:stick.slice(),look:lookStick.slice(),vertical:verticalInput}));await neutral();
    check('controller pointer holding '+selector+' cannot leak swimming or heading inputs',Math.hypot(...held.p.map((v,i)=>v-origin.p[i]))<.01&&Math.abs(held.yaw-origin.yaw)<.001&&Math.abs(held.pitch-origin.pitch)<.001&&held.move.every(n=>n===0)&&held.look.every(n=>n===0)&&held.vertical===0,{origin,held});
   }
   await capture('touch-controls-contained');const analogOrigin=await read(()=>player.p.slice());await pad({buttons:[1],values:{7:.3}});await delay(150);await pad({values:{7:.3}});await delay(750);check('a partial RT value cannot resume swimming until the exit input returns to neutral',await read(p=>verticalInput===0&&V.dist(player.p,p)<.01,analogOrigin));await neutral();await pad({values:{7:.3}});await delay(750);check('a fresh partial RT input works after a real neutral release',await read(p=>verticalInput>.25&&player.p[1]-p[1]>.1,analogOrigin));await neutral();
   await pointerOff();const origin=await read(()=>player.p.slice());await pad({axes:[0,-.85,0,0]});await delay(850);await neutral();check('normal controller swimming resumes after pointer exit',await read(p=>V.dist(player.p,p)>.25,origin));await snapshot('normal-swim-restored');
   await pointer();await neutral();const joystick=await read(()=>{const r=document.getElementById('joystick').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});report.actions.push({type:'native-touch',target:'#joystick',purpose:'Actual touch takeover after prior controller swimming and pointer mode'});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...joystick,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:joystick.x,y:joystick.y-32,id:1}]});await delay(300);const touchA=await read(()=>({p:player.p.slice(),move:stick.slice(),pointerHidden:document.getElementById('gamepadCursor').hidden}));await delay(450);const touchB=await read(()=>({p:player.p.slice(),move:stick.slice()}));
   check('native touch takeover continues moving across neutral-pad frames',touchA.pointerHidden&&touchA.move[1]<-.2&&touchB.move[1]<-.2&&Math.hypot(...touchB.p.map((v,i)=>v-touchA.p[i]))>.15,{touchA,touchB});await capture('native-touch-takeover');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(850);const stopped=await read(()=>player.p.slice());await delay(300);check('native touch release stops its own movement without stale controller input',await read(p=>stick.every(n=>n===0)&&lookStick.every(n=>n===0)&&verticalInput===0&&V.dist(player.p,p)<.035,stopped));
   check('no runtime errors',report.errors.length===0,report.errors);report.status='passed';return;
  }
  await click('#fieldToolsBtn');await wait(()=>modal==='fieldTools');await pointer();await click('#panelBody .menu-advanced > summary');
  await click('#panelBody [data-feature="exploration"]');await wait(()=>modal==='exploration');await pointer();await click('[data-explore-tab="ink"]');await click('#explorationStartPen');await wait(()=>oceanExploration.penMode==='draw'&&!modal);
  await pointer();await move({x:550,y:420});const strokeStart=await snapshot('before-stroke');
  await pad({buttons:[0]});await delay(140);await move({x:640,y:385},{buttons:[0]});await move({x:730,y:450},{buttons:[0]});await pad();await delay(350);
  const strokeEnd=await snapshot('after-stroke');
  check('holding A while moving the left stick draws a real world-space stroke',strokeEnd.strokes.length===strokeStart.strokes.length+1&&strokeEnd.strokes.at(-1).points.length>=3,strokeEnd.strokes.at(-1));
  check('natural rendering submits the actual ink segment instances',strokeEnd.inkSegments>0&&strokeEnd.frame>strokeStart.frame&&strokeEnd.inkBatches.some(b=>b.visible&&b.instances===strokeEnd.inkSegments&&b.drawCount>0),{segments:strokeEnd.inkSegments,batches:strokeEnd.inkBatches,frameBefore:strokeStart.frame,frameAfter:strokeEnd.frame});
  check('pointer drawing does not also swim or photograph',Math.hypot(...strokeEnd.position.map((v,i)=>v-strokeStart.position[i]))<.01&&strokeEnd.film===strokeStart.film,{before:strokeStart.position,after:strokeEnd.position});
  await capture('freehand');
  if(scenario==='pen-lifecycle'){
   const base=await snapshot('lifecycle-baseline');
   const draft=async(label)=>{await pointer();await move({x:540,y:455});await pad({buttons:[0]});await delay(140);await move({x:620,y:505},{buttons:[0]});const pending=await snapshot(label);check(label+' has real rendered draft segments without committing a stroke',pending.strokes.length===base.strokes.length&&pending.inkSegments>base.inkSegments,pending.inkSegments);};
   await draft('native-escape-draft');report.actions.push({type:'native-key',key:'Escape',purpose:'Real browser keyboard takeover cancels a controller-held tool gesture'});await page.keyboard.press('Escape');await delay(180);await neutral();const escaped=await snapshot('native-escape-cancelled');
   check('native Escape cancels the held draft without committing or taking a photograph',JSON.stringify(escaped.strokes)===JSON.stringify(base.strokes)&&escaped.film===base.film&&escaped.inkSegments===base.inkSegments);
   if(await read(()=>!!modal))await press(9);if(await read(()=>oceanExploration.penMode!==null)){await pointer();await click('#explorationPenDone');}
   await openTool('exploration');await pointer();await click('[data-explore-tab="ink"]');await click('#explorationStartPen');await wait(()=>oceanExploration.penMode==='draw'&&!modal);await draft('start-draft');
   await pad({buttons:[0,9]});await delay(180);const held=await snapshot('start-cancelled-still-held');await neutral();await wait(()=>modal==='diveMenu');const started=await snapshot('start-cancelled-released');
   check('Start cancels before opening the normal menu and A release cannot commit the old draft',JSON.stringify(held.strokes)===JSON.stringify(base.strokes)&&JSON.stringify(started.strokes)===JSON.stringify(base.strokes)&&started.film===base.film&&started.pen===null);
   check('cancelled controller gesture leaves no held swim or look axes',await read(()=>stick.every(n=>n===0)&&lookStick.every(n=>n===0)&&verticalInput===0));await capture('lifecycle-cancelled');
   await press(9);await wait(frame=>!modal&&renderer.frame>frame,started.frame);const resumed=await snapshot('lifecycle-resumed');check('the first resumed natural render removes cancelled draft geometry',resumed.inkSegments===base.inkSegments&&JSON.stringify(resumed.strokes)===JSON.stringify(base.strokes));await capture('lifecycle-resumed');
  }
  if(scenario==='pen-workflow'){
   const colors=await read(()=>[...document.querySelectorAll('#explorationPenBar [data-ink]')].map(node=>node.dataset.ink));
   check('five visible ink choices are present',colors.length===5,colors);
   for(let i=1;i<colors.length;i++){
    await click('[data-ink="'+colors[i]+'"]');await pointer();const x=440+i*75,y=470+i*22;await move({x,y});await pad({buttons:[0]});await delay(100);await move({x:x+45,y:y-18},{buttons:[0]});await move({x:x+80,y:y+16},{buttons:[0]});await pad();await delay(250);
    check(colors[i]+' selector changes the actual world stroke',await read(color=>voyage.state.features.exploration.strokes.at(-1)?.color===color,colors[i]));
   }
   const colored=await snapshot('five-colors');check('all five colors survive the world-stroke owner',new Set(colored.strokes.map(stroke=>stroke.color)).size===5,colored.strokes.map(stroke=>stroke.color));await capture('five-colors');
   await click('#explorationUndo');const undone=await snapshot('undo');check('undo removes exactly the most recent stroke',undone.strokes.length===colored.strokes.length-1&&JSON.stringify(undone.strokes)===JSON.stringify(colored.strokes.slice(0,-1)));
   const erasePoint=await read(()=>{const stroke=voyage.state.features.exploration.strokes[0],p=stroke.points[Math.floor(stroke.points.length/2)],q=project(p,renderer.vp),r=renderer.canvas.getBoundingClientRect();return {x:r.left+(q[0]*.5+.5)*r.width,y:r.top+(.5-q[1]*.5)*r.height};});
   await click('#explorationErase');await move(erasePoint);await press(0);const erased=await snapshot('erase');check('eraser hits the actual projected ink and removes its complete stroke',erased.strokes.length===undone.strokes.length-1&&!erased.strokes.some(stroke=>stroke.id===undone.strokes[0].id));
   await click('#explorationPenDone');await wait(()=>oceanExploration.penMode===null);const completed=await snapshot('completed');check('Done persists complete world coordinates through the formal save owner',JSON.stringify(completed.saved.features.exploration.strokes)===JSON.stringify(completed.strokes));
   await pointer();await click('#pauseBtn');await wait(()=>modal==='diveMenu');await pointer();await click('#menuHome');await wait(()=>!active&&!modal);await capture('saved-home');
   report.actions.push({type:'browser-reload',purpose:'Verify formal saved world strokes'});await page.reload();await wait(()=>window.__ocean?.ready&&document.getElementById('loading')?.classList.contains('gone'),undefined,120000);
   const reloaded=await snapshot('reloaded');check('normal reload restores identical complete world strokes',JSON.stringify(reloaded.strokes)===JSON.stringify(completed.strokes)&&reloaded.adaptive&&reloaded.saveStatus==='owned');await capture('reloaded');
  }
  check('no runtime errors',report.errors.length===0,report.errors);report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;if(page)try{await capture('failure');await snapshot('failure');}catch(captureError){report.captureError=String(captureError);}throw error;}
 finally{save();await context?.close();if(browser?.isConnected())await browser.close();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({scenario,url,out,profileDir,viewport:report.viewport,inputSurface:report.inputSurface,status:'options-valid-no-browser-run'}));
else run().catch(error=>{report.status='failed';report.failure=error.stack;save();console.error(error);process.exitCode=1;});
