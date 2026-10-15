/* UI/calendar -> real world -> shutter -> persistence integration.
 * Fixtures: deterministic simulation ticks; travel to real actor homes; initial
 * earned-knowledge/owned-partner records; one Dec 31 boundary. These do not claim
 * an unassisted playthrough or that the fixture partner was earned in this run.
 * No GPU/performance claim: run only with the coordinator's exclusive GPU slot. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;
try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/';
const focusOnly=process.argv.includes('--focus-only');
const modes=[{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
const checks=[],errors=[],limitations=[];await mkdir('qa/parity',{recursive:true});
function check(mode,name,pass,detail){checks.push({mode:mode.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode.id+' '+name)}
async function click(page,mode,selector){const el=page.locator(selector);await el.scrollIntoViewIfNeeded();if(mode.touch)await el.tap();else await el.click()}
async function close(page,mode){if(await page.evaluate(()=>photoOpen))await click(page,mode,'#closePhoto');const current=await page.evaluate(()=>modal);if(current==='deck')await click(page,mode,'#shipExit');else if(current)await click(page,mode,'#closePanel')}
async function open(page,mode,panel){await close(page,mode);if(await page.evaluate(()=>active)){await click(page,mode,'#fieldToolsBtn');await click(page,mode,'#panelBody [data-feature="'+panel+'"]')}else await click(page,mode,'#shipResearch [data-feature="'+panel+'"]')}
async function dive(page,mode){await close(page,mode);await click(page,mode,'#startBtn');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));await page.evaluate(()=>__seasonStep(.1))}
async function boat(page,mode){await close(page,mode);await click(page,mode,'#homeBtn');await page.waitForFunction(()=>!active);if(await page.locator('#debriefClose').isVisible())await click(page,mode,'#debriefClose')}
async function install(page){
 await page.waitForFunction(()=>window.__ocean?.ready&&typeof oceanSeasons!=='undefined',null,{timeout:90000});
 await page.evaluate(()=>{
  window.__freeze=true;$('welcomeAudio').checked=false;settings.sound=false;settings.third=false;settings.adaptive=false;
  window.__seasonRender=()=>{updateCamera(.1);oceanFeatures.call('afterCamera',.1);applyVisualSettings();renderer.render(eye,target,t);if(active)updateHUD()};
  window.__seasonStep=(seconds,move=false)=>{for(let n=0;n<Math.ceil(seconds/.1);n++){if(active&&!modal&&!photoOpen&&!document.hidden){t+=.1;if(move)updatePlayer(.1);updateLife(t);__seasonRender();observe(.1);voyageTick(.1);}else if(!active)oceanFeatures.call('idleTick',.1);}__seasonRender();return oceanSeasons.snapshot()};
  window.__seasonFish=id=>life.find(f=>SPECIES[f.species].id===id);
  window.__seasonApproach=(id,distance=1.2)=>{stopAuto();oceanMicrocosm.exit();resetInput();player.velocity=[0,0,0];updateLife(t);const f=__seasonFish(id),aim=animalFocusPoint(f),positions=[[0,.15,distance],[distance,.15,0],[0,.15,-distance],[-distance,.15,0]].map(v=>{const p=V.add(aim,v);p[1]=Math.max(p[1],groundHeight(p[0],p[2])+.85);return p});const p=positions.find(p=>V.dist(collide(p.slice()),p)<.01&&!blocked(p,aim,.001));if(!p)throw Error('No reachable animal stance for '+id);player.p=p;const d=V.sub(aim,p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));cameraCut=true;__seasonRender();return {uid:f.uid,p:f.p.slice(),home:f.home.slice(),distance:V.dist(eye,aim)};};
  window.__seasonClock=()=>{const s=oceanFeatures.state('expedition');return {day:s.day,minute:s.minute,date:OceanSeasonRules.date(s.day)}};
  window.__seasonDrawn=id=>{const f=__seasonFish(id);return renderer.batches.filter(b=>b.instances.includes(f)&&b.visible).reduce((n,b)=>n+b.drawCount,0)};
 });
}
async function clock(page,mode){await open(page,mode,'research');await page.locator('#seasonCalendar').scrollIntoViewIfNeeded()}
async function waitSeason(page,mode){await click(page,mode,'#seasonCalendar button:has-text("等待下一季")')}
async function turn(page,mode,reverse=false){const y=mode.height*(mode.width>mode.height&&mode.touch?.4:.46),x1=mode.width*(reverse?.18:.82),x2=mode.width*(reverse?.82:.18);const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {id:el?.id,tag:el?.tagName}}, {x:x1,y});if(hit.id!=='ocean')throw Error('Camera gesture starts on '+JSON.stringify(hit));if(mode.touch){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/8,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach()}else{await page.mouse.move(x1,y);await page.mouse.down();await page.mouse.move(x2,y,{steps:8});await page.mouse.up()}await page.evaluate(()=>__seasonStep(.2))}
async function photograph(page,mode){const before=await page.evaluate(()=>oceanPhotography.snapshot().film);await page.evaluate(()=>{lastPhoto=0;__seasonRender()});await click(page,mode,'#photoBtn');await page.waitForFunction(n=>!voyage.photoBusy&&oceanPhotography.snapshot().film===n+1,before);return await page.evaluate(()=>oceanFeatures.state('photography').film.at(-1))}
async function calendarCheck(page,mode,name,expected){const c=await page.evaluate(()=>__seasonClock());check(mode,name,Object.entries(expected).every(([k,v])=>(k==='day'||k==='minute'?c[k]:c.date[k])===v),c)}
async function screenshot(page,mode,name){await page.evaluate(()=>__seasonRender());await page.screenshot({path:'qa/parity/seasons-'+mode.id+'-'+name+'.png'})}
async function pausedFrames(page){await page.evaluate(()=>{window.__freeze=false});await page.waitForTimeout(350);await page.evaluate(()=>{window.__freeze=true})}
async function visibleBlur(browser,page,mode){
 // A second native window in the SAME Chrome process is needed: an ordinary tab
 // switch also hides the game and would not exercise the visible-blur defect.
 // Never override document.hasFocus/hidden or dispatch synthetic focus events.
 let browserCDP,pageCDP,popupId,mainId;
 const read=()=>page.evaluate(()=>({focused:document.hasFocus(),hidden:document.hidden,minute:oceanFeatures.state('expedition').minute,air:oceanFeatures.state('expedition').air,seconds:diveSeconds,simulation:t,events:window.__seasonFocusEvents?.slice()}));
 const limit=(reason,state)=>{limitations.push({mode:mode.id,test:'visible-but-blurred native window',reason,state});console.log('LIMIT '+mode.id+' visible blur: '+reason)};
 try{
  await page.bringToFront();await page.evaluate(()=>{window.__seasonFocusEvents=[];for(const type of ['blur','focus'])window.addEventListener(type,()=>window.__seasonFocusEvents.push({type,hidden:document.hidden,focused:document.hasFocus()}));window.__freeze=false});
  const initial=await read();if(!initial.focused||initial.hidden){limit('Chrome did not expose an initially focused visible game window',initial);return}
  await page.waitForTimeout(450);const running=await read();check(mode,'focused live RAF advances both voyage time and journey air',running.minute>initial.minute&&running.air<initial.air,{initial,running});
  browserCDP=await browser.newBrowserCDPSession();pageCDP=await page.context().newCDPSession(page);const {targetInfo}=await pageCDP.send('Target.getTargetInfo');mainId=targetInfo.targetId;
  const created=await browserCDP.send('Target.createTarget',{url:'about:blank',newWindow:true,background:false,...(targetInfo.browserContextId?{browserContextId:targetInfo.browserContextId}:{})});popupId=created.targetId;
  await browserCDP.send('Target.activateTarget',{targetId:popupId});await page.waitForTimeout(200);const blurred=await read();
  if(blurred.focused||blurred.hidden||!blurred.events.some(e=>e.type==='blur'&&!e.hidden)){limit('Native activation did not produce visible-but-blurred state; no synthetic substitute used',blurred);return}
  await page.waitForTimeout(650);const still=await read();
  check(mode,'real visible window blur pauses time, air and simulation',!still.focused&&!still.hidden&&still.minute===blurred.minute&&still.air===blurred.air&&still.seconds===blurred.seconds&&still.simulation===blurred.simulation,{blurred,still});
  await browserCDP.send('Target.activateTarget',{targetId:mainId});await page.bringToFront();
  try{await page.waitForFunction(()=>document.hasFocus()&&!document.hidden,null,{timeout:3000})}catch{limit('Chrome did not restore native game focus',await read());return}
  const resumed=await read();await page.waitForTimeout(450);const after=await read();check(mode,'real focus resumes without charging the blurred interval',after.focused&&!after.hidden&&after.minute>resumed.minute&&after.air<resumed.air&&blurred.air-after.air<1.5&&after.events.some(e=>e.type==='focus'),{resumed,after});
 }catch(error){limit('Native separate-window focus operation unavailable: '+error.message,await read())}
 finally{await page.evaluate(()=>{window.__freeze=true});if(popupId)await browserCDP?.send('Target.closeTarget',{targetId:popupId}).catch(()=>{});await page.bringToFront();await pageCDP?.detach();await browserCDP?.detach()}
}
async function run(browser,mode){
 let context=await browser.newContext({viewport:{width:mode.width,height:mode.height},hasTouch:mode.touch,isMobile:mode.touch,deviceScaleFactor:1,acceptDownloads:true});let page=await context.newPage();
 const watch=p=>{p.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));p.on('dialog',d=>d.accept())};watch(page);
 try{
  await page.goto(url);await install(page);
  if(focusOnly){await click(page,mode,'#shipModeJourney');await dive(page,mode);await visibleBlur(browser,page,mode);check(mode,'focus run leaves renderer and runtime healthy',await page.evaluate(()=>renderer.gl.getError()===0&&!renderer.gl.isContextLost())&&!errors.some(e=>e.mode===mode.id));return;}
  const identity=await page.evaluate(()=>life.map(f=>({uid:f.uid,species:SPECIES[f.species].id,home:f.home?.slice(),size:f.s.slice()})));
  await clock(page,mode);await calendarCheck(page,mode,'fresh calendar starts at authored voyage year 1 June 1', {day:1,minute:540,year:1,month:6,season:'summer'});
  check(mode,'calendar UI names all three scheduled encounters and their next windows',(await page.locator('#seasonCalendar').innerText()).includes('鸚鵡螺')&&(await page.locator('#seasonCalendar').innerText()).includes('12 月 1 日'));
  await click(page,mode,'[data-wait-days="1"]');await calendarCheck(page,mode,'actual one-day button advances calendar without diving',{day:2,minute:540});
  await click(page,mode,'[data-wait-days="7"]');await calendarCheck(page,mode,'actual seven-day button preserves the one shared clock',{day:9,minute:540});
  await click(page,mode,'[data-rest="1050"]');await calendarCheck(page,mode,'actual evening control advances to the same-day sunset',{day:9,minute:1050});
  await click(page,mode,'[data-rest="1290"]');await calendarCheck(page,mode,'actual night control advances to the same-night dive',{day:9,minute:1290});
  await click(page,mode,'[data-rest="540"]');await calendarCheck(page,mode,'actual morning control crosses midnight once',{day:10,minute:540});
  const calendarRect=await page.evaluate(()=>{const panel=$('panel').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,panel:{left:panel.left,right:panel.right},controls:[...document.querySelectorAll('#seasonCalendar button')].map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width}))}});
  check(mode,'calendar is horizontally contained and all new touch targets are at least44px',calendarRect.scroll<=calendarRect.width&&calendarRect.panel.left>=0&&calendarRect.panel.right<=calendarRect.width+1&&calendarRect.controls.every(r=>r.height>=44&&r.width>=44),calendarRect);
  await screenshot(page,mode,'calendar');
  for(const [season,day]of [['autumn',93],['winter',184],['spring',274],['summer',366]]){
   await waitSeason(page,mode);await calendarCheck(page,mode,'actual next-season control enters '+season,{season,day,minute:540});
   check(mode,'real wild population matches '+season+' schedule',await page.evaluate(()=>{const s=__seasonClock();return ['beluga','white_sided_dolphin','nautilus'].every(id=>life.filter(f=>SPECIES[f.species].id===id).every(f=>f.ecologyPresent===OceanSeasonRules.available(id,s.day,s.minute)))}));
  }
  check(mode,'waiting never invents a dive or observation',await page.evaluate(()=>voyage.state.dives===0&&persistent.seen.length===0));
  await open(page,mode,'deck');await page.locator('#shipStation').selectOption('cabin');await click(page,mode,'#shipGo');await page.evaluate(()=>__seasonStep(22));
  check(mode,'actual deck route reaches the cabin clock controls',await page.evaluate(()=>modal==='cabin'&&oceanShip.state().visited.includes('cabin')&&oceanShip.state().distance>0));
  await click(page,mode,'[data-cabin="clock"]');const cabinDay=await page.evaluate(()=>__seasonClock().day);await click(page,mode,'[data-wait-days="1"]');
  check(mode,'waiting from the cabin clock preserves the real return control',await page.evaluate(day=>modal==='research'&&__seasonClock().day===day+1&&!$('shipBackCabin').classList.contains('hidden'),cabinDay));
  await click(page,mode,'#shipBackCabin');check(mode,'actual return control re-enters the cabin after calendar redraw',await page.evaluate(()=>modal==='cabin'&&oceanShip.snapshot().mode==='cabin'&&document.querySelectorAll('[data-cabin]').length===8));
  // Boundary fixture only; the transition itself is through the player's button.
  await close(page,mode);await page.evaluate(()=>{const s=oceanFeatures.state('expedition');s.day=214;s.minute=1290;oceanSeasons.sync(true);saveVoyage()});await clock(page,mode);await click(page,mode,'[data-wait-days="1"]');await calendarCheck(page,mode,'one-day UI crosses year1 December31 to year2 January1',{day:215,year:2,month:1,minute:540});
  await close(page,mode);await click(page,mode,'#shipModeJourney');await dive(page,mode);await visibleBlur(browser,page,mode);await boat(page,mode);await click(page,mode,'#shipModeFree');
  await open(page,mode,'deck');check(mode,'winter brings a real penguin to the deck after a dive',await page.evaluate(()=>oceanShip.snapshot().visitor.kind==='penguin'&&renderer.batches.some(b=>b.shipActor==='penguin'&&b.visible)));
  await page.evaluate(()=>{oceanShip.state().visitor.trust=3;saveVoyage()});await close(page,mode);await open(page,mode,'deck');check(mode,'re-entering the same visit preserves existing trust fixture',await page.evaluate(()=>oceanShip.snapshot().visitor.trust===3));
  await clock(page,mode);await waitSeason(page,mode);await open(page,mode,'deck');check(mode,'spring replaces deck visitor with actual seal model',await page.evaluate(()=>oceanShip.snapshot().visitor.kind==='seal'&&renderer.batches.some(b=>b.shipActor==='seal'&&b.visible)&&!renderer.batches.some(b=>b.shipActor==='penguin'&&b.visible)));
  await clock(page,mode);await click(page,mode,'[data-rest="540"]');await dive(page,mode);
  const subject=await page.evaluate(()=>__seasonApproach('nautilus'));await page.evaluate(()=>__seasonStep(2));
  check(mode,'daytime actual nautilus UID is absent from draw submission and cannot focus',await page.evaluate(uid=>{const f=life.find(f=>f.uid===uid);return f.ecologyPresent===false&&__seasonDrawn('nautilus')===0&&focusFish!==f&&!oceanEcology.inRange(f)&&!persistent.seen.includes('nautilus')},subject.uid));
  const absentPhoto=await photograph(page,mode);
  check(mode,'real daytime shutter cannot award the invisible nautilus',absentPhoto.individual!==subject.uid&&await page.evaluate(()=>!voyage.state.bestPhotos.nautilus&&!persistent.seen.includes('nautilus')),absentPhoto);
  await page.evaluate(()=>{settings.lighting='blue';applyVisualSettings();__seasonRender()});check(mode,'visual night preset cannot override actual daytime biological schedule',await page.evaluate(()=>!__seasonFish('nautilus').ecologyPresent&&__seasonClock().minute<1080));
  await open(page,mode,'research');check(mode,'underwater clock controls are disabled and public mutation refuses',await page.evaluate(()=>{const before=JSON.stringify(__seasonClock());const buttons=[...document.querySelectorAll('[data-rest],[data-wait-days]')];return buttons.length===6&&buttons.every(b=>b.disabled)&&!oceanExpedition.rest(1290)&&!oceanExpedition.restDays(1)&&JSON.stringify(__seasonClock())===before}));
  const paused=await page.evaluate(()=>__seasonClock());await pausedFrames(page);check(mode,'open clock panel pauses actual RAF calendar progression',JSON.stringify(await page.evaluate(()=>__seasonClock()))===JSON.stringify(paused));
  await click(page,mode,'[data-season-species="nautilus"]');check(mode,'actual guide shows encounter window without revealing a free discovery',(await page.locator('#panelBody').innerText()).includes('18:00')&&await page.evaluate(()=>!persistent.seen.includes('nautilus')));
  const from=await page.evaluate(()=>player.p.slice());await click(page,mode,'#findSpecies');check(mode,'inactive guide marks real habitat without teleporting to absent actor',await page.evaluate(p=>V.dist(p,player.p)===0&&follow?.ecologyPresent!==false&&voyage.state.waypoint==='habitat:nautilus',from));
  await close(page,mode);await click(page,mode,'#pauseBtn');const pause=await page.evaluate(()=>__seasonClock());await pausedFrames(page);check(mode,'actual pause menu freezes shared calendar across live RAF frames',JSON.stringify(await page.evaluate(()=>__seasonClock()))===JSON.stringify(pause));await click(page,mode,'#resumeBtn');
  await boat(page,mode);await clock(page,mode);await click(page,mode,'[data-rest="1290"]');await dive(page,mode);await page.evaluate(()=>__seasonApproach('nautilus'));await page.evaluate(()=>__seasonStep(3));
  check(mode,'same stable nautilus UID is actually drawn and discovered at night',await page.evaluate(uid=>{const f=life.find(f=>f.uid===uid);return f.ecologyPresent===true&&__seasonDrawn('nautilus')>0&&focusFish?.uid===uid&&persistent.seen.includes('nautilus')&&oceanEcology.knowledge(oceanEcology.state().field.nautilus)>=1},subject.uid));
  await screenshot(page,mode,'night-nautilus');const realPhoto=await photograph(page,mode);
  check(mode,'real night shutter records actual visible individual and ecology eligibility',realPhoto.individual===subject.uid&&realPhoto.knowledgeEligible===true&&realPhoto.grade>0,realPhoto);
  const image=await page.evaluate(async date=>{const a=await oceanPhotography.exportArchive(),p=a.images.find(p=>p.date===date);if(!p)throw Error('Captured original missing');const img=new Image();img.src=p.url;await img.decode();return {date,url:p.url,width:img.naturalWidth,height:img.naturalHeight}},realPhoto.date);
  check(mode,'seasonal encounter contains an actual decodable engine JPEG',image.width>0&&image.height>0&&image.url.startsWith('data:image/jpeg;base64,'),{width:image.width,height:image.height});
  await open(page,mode,'photography');await click(page,mode,'[data-photo-view="'+image.date+'"]');const viewingClock=await page.evaluate(()=>__seasonClock());await pausedFrames(page);check(mode,'actual original-photo viewer freezes voyage time across live RAF frames',await page.evaluate(before=>photoOpen&&JSON.stringify(__seasonClock())===JSON.stringify(before),viewingClock));await close(page,mode);
  const beforeMove=await page.evaluate(()=>player.p.slice());if(mode.touch){const rect=await page.locator('#joystick').boundingBox(),session=await context.newCDPSession(page),x=rect.x+rect.width/2,y=rect.y+rect.height/2;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-30}]});await page.evaluate(()=>__seasonStep(.4,true));await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach()}else{await page.keyboard.down('KeyW');await page.evaluate(()=>__seasonStep(.4,true));await page.keyboard.up('KeyW')}
  check(mode,'real '+(mode.touch?'touch stick':'keyboard')+' still moves the diver near seasonal habitat',await page.evaluate(p=>V.dist(p,player.p)>.05,beforeMove));await page.evaluate(()=>__seasonApproach('nautilus'));
  // Arrival/departure fixtures accelerate only the clock boundary, not discovery.
  await page.evaluate(()=>{const s=oceanFeatures.state('expedition');s.minute=359.99;oceanSeasons.sync();__seasonStep(1)});
  check(mode,'observed nocturnal actor remains visible while dawn boundary passes',await page.evaluate(()=>{const f=__seasonFish('nautilus');return !f.ecologyScheduled&&f.ecologyPresent&&oceanSeasons.hint('nautilus').includes('停留')}));
  await page.evaluate(()=>{stopAuto();player.p=collide(V.add(__seasonFish('nautilus').p,[0,10,85]));cameraCut=true;__seasonStep(.2);updateLife(t);__seasonRender();observe(.1)});
  check(mode,'leaving the encounter completes departure with no ghost focus or grading',await page.evaluate(uid=>{const f=life.find(f=>f.uid===uid);return !f.ecologyPresent&&focusFish!==f&&gradePhoto().subject!==f&&__seasonDrawn('nautilus')===0},subject.uid));
  await page.evaluate(()=>{__seasonApproach('nautilus');oceanFeatures.state('expedition').minute=1079.99;__seasonStep(.3);updateLife(t);__seasonRender()});
  check(mode,'arrival boundary defers the watched actor instead of popping it into view',await page.evaluate(()=>{const f=__seasonFish('nautilus');return f.ecologyScheduled&&!f.ecologyPresent}));
  const arrivalYaw=await page.evaluate(()=>player.yaw),turns=[];for(let i=0;i<4;i++){await turn(page,mode);const state=await page.evaluate(()=>{const f=__seasonFish('nautilus');return {yaw:player.yaw,present:f.ecologyPresent,projection:project(animalFocusPoint(f),renderer.vp)}});turns.push(state);if(state.present)break;}
  check(mode,'actual camera gestures allow fully out-of-view arrival without a60m detour',Math.abs(turns.at(-1).yaw-arrivalYaw)>.5&&turns.at(-1).present,{arrivalYaw,turns});for(let i=0;i<turns.length;i++)await turn(page,mode,true);const returned=await page.evaluate(()=>{const f=__seasonFish('nautilus');return {uid:f.uid,yaw:player.yaw,drawn:__seasonDrawn('nautilus'),p:project(animalFocusPoint(f),renderer.vp)}});check(mode,'actual reverse camera gestures see the same newly arrived actor submitted',returned.uid===subject.uid&&returned.drawn>0&&returned.p[2]>0&&Math.abs(returned.p[0])<1&&Math.abs(returned.p[1])<1,returned);
  // A hidden-micro fixture verifies the shared exclusion seam; nautilus itself
  // is not a micro species, so claiming it tested scanner eligibility would lie.
  const micro=await page.evaluate(()=>{const f=__seasonFish('pygmy_seahorse');__seasonApproach('pygmy_seahorse',.55);f.ecologyPresent=false;return f.uid});await open(page,mode,'microcosm');await click(page,mode,'#microStart');check(mode,'controlled absent-micro actor is excluded by scanner and lens entry',await page.evaluate(uid=>oceanMicrocosm.snapshot().candidate!==uid&&!oceanMicrocosm.enter(uid)&&!oceanMicrocosm.isViewing(),micro));await click(page,mode,'#microScanExit');await page.evaluate(()=>oceanSeasons.sync(true));
  const boundaryKnown=await page.evaluate(()=>JSON.stringify(oceanEcology.state().field.nautilus));await page.evaluate(()=>{for(let i=0;i<6;i++){oceanSeasons.sync(true);updateLife(t)}});check(mode,'presence recomputation does not grant new ecology encounters',await page.evaluate(before=>JSON.stringify(oceanEcology.state().field.nautilus)===before,boundaryKnown));
  await boat(page,mode);
  // Preserve a previously earned partner/knowledge fixture across a real season UI change.
  const owned=await page.evaluate(()=>{const f=__seasonFish('beluga'),s=oceanEcology.state();s.partners=[{uid:f.uid,name:'跨季同行',mastery:{},lastPerformance:null}];s.selected=f.uid;s.accompany=true;for(const id of ['beluga','nautilus','chromis'])s.field[id]={points:14,encounters:2,seconds:20,photos:id==='nautilus'?1:0};persistent.seen=[...new Set([...persistent.seen,'beluga','chromis'])];const clock=oceanFeatures.state('expedition');clock.day=184;clock.minute=540;oceanSeasons.sync(true);saveVoyage();persist();return f.uid});
  await open(page,mode,'aquarium');await page.locator('#aquariumSpecies').selectOption('beluga');await click(page,mode,'#aquariumPlace');await clock(page,mode);await waitSeason(page,mode);
  check(mode,'owned beluga remains available after real winter-to-spring wait; wild peers leave',await page.evaluate(uid=>life.filter(f=>SPECIES[f.species].id==='beluga').every(f=>f.ecologyPresent===(f.uid===uid))&&oceanEcology.state().selected===uid,owned));
  await open(page,mode,'training');check(mode,'out-of-season owned partner can enter actual ship training',await page.evaluate(uid=>oceanEcology.snapshot().training?.uid===uid,owned));await close(page,mode);
  await open(page,mode,'aquarium');await click(page,mode,'#aquariumEnter');await page.evaluate(()=>{updateLife(t);__seasonRender()});check(mode,'out-of-season aquarium exhibit is independent and drawn',await page.evaluate(()=>oceanAquarium.snapshot().viewing&&oceanAquarium.state().slots.some(s=>s.species==='beluga')&&renderer.batches.some(b=>b.visible&&b.dynamic&&b.species===SPECIES.findIndex(s=>s.id==='beluga')&&b.drawCount>0&&b.instances.every(f=>!life.includes(f)))));await screenshot(page,mode,'retained-aquarium');await click(page,mode,'#aquariumExit');
  check(mode,'calendar transitions preserve every existing UID, home, scale and population order',await page.evaluate(before=>life.length===before.length&&life.every((f,i)=>f.uid===before[i].uid&&SPECIES[f.species].id===before[i].species&&JSON.stringify(f.home)===JSON.stringify(before[i].home)&&JSON.stringify(f.s)===JSON.stringify(before[i].size)),identity));
  await close(page,mode);await click(page,mode,'#shipLog');const downloadEvent=page.waitForEvent('download');await click(page,mode,'#exportSave');const backup=await downloadEvent,path='qa/parity/seasons-'+mode.id+'-save.json';await backup.saveAs(path);const exported=JSON.parse(await readFile(path,'utf8'));
  check(mode,'actual export has one calendar authority and preserves original photograph',!Object.hasOwn(exported.voyage.features,'seasons')&&exported.photography.images.some(p=>p.date===image.date&&p.url===image.url));
  const savedClock=await page.evaluate(()=>__seasonClock());await page.reload();await install(page);check(mode,'calendar and partner survive actual reload',await page.evaluate(({clock,uid})=>JSON.stringify(__seasonClock())===JSON.stringify(clock)&&oceanEcology.state().selected===uid&&__seasonFish('nautilus').ecologyPresent===false,{clock:savedClock,uid:owned}));
  await context.close();context=await browser.newContext({viewport:{width:mode.width,height:mode.height},hasTouch:mode.touch,isMobile:mode.touch,deviceScaleFactor:1,acceptDownloads:true});page=await context.newPage();watch(page);await page.goto(url);await install(page);await click(page,mode,'#shipLog');await page.locator('#importSave').setInputFiles(path);await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。');
  check(mode,'actual import into fresh storage restores date, partner, knowledge and layout',await page.evaluate(({clock,uid})=>JSON.stringify(__seasonClock())===JSON.stringify(clock)&&oceanEcology.state().selected===uid&&oceanEcology.knowledge(oceanEcology.state().field.nautilus)>=2&&oceanAquarium.state().slots.some(s=>s.species==='beluga'),{clock:savedClock,uid:owned}));
  check(mode,'import retains exact JPEG bytes and photo identity',await page.evaluate(async p=>{const a=await oceanPhotography.exportArchive();return a.images.some(q=>q.date===p.date&&q.url===p.url)},image));
  const legacy=structuredClone(exported);legacy.voyage.features.expedition.day=1;legacy.voyage.features.expedition.minute=540;delete legacy.voyage.features.seasons;const legacyPath='qa/parity/seasons-'+mode.id+'-legacy-clock.json';await writeFile(legacyPath,JSON.stringify(legacy));await page.locator('#importSave').setInputFiles(legacyPath);await page.waitForFunction(()=>!voyage.importing&&oceanFeatures.state('expedition').day===1);
  check(mode,'legacy-shaped day/minute fixture imports without new season state or loss',await page.evaluate(uid=>__seasonClock().date.month===6&&!Object.hasOwn(voyage.state.features,'seasons')&&oceanEcology.state().selected===uid&&oceanPhotography.snapshot().film===2,owned));
  await page.reload();await install(page);check(mode,'imported legacy calendar remains deterministic after reload',await page.evaluate(()=>__seasonClock().day===1&&__seasonClock().minute===540&&__seasonClock().date.year===1));
  check(mode,'renderer context is healthy after calendar, captures and exhibition',await page.evaluate(()=>renderer.gl.getError()===0&&!renderer.gl.isContextLost()));
  check(mode,'no uncaught browser errors',!errors.some(e=>e.mode===mode.id),errors.filter(e=>e.mode===mode.id));
 }catch(error){check(mode,'browser integration completed',false,error.stack)}
 finally{await context.close();await writeFile('qa/parity/seasons-'+mode.id+(focusOnly?'-focus':'')+'-results.json',JSON.stringify({url,mode,headed:process.argv.includes('--headed'),fixtures:focusOnly?[]:['deterministic ticks','travel to actual homes','December31 boundary','previous partner/knowledge','legacy-shaped import'],checks:checks.filter(c=>c.mode===mode.id),errors:errors.filter(e=>e.mode===mode.id),limitations:limitations.filter(l=>l.mode===mode.id)},null,2))}
}
const browser=await pw.chromium.launch({channel:'chrome',headless:!process.argv.includes('--headed')});
try{for(const mode of modes)await run(browser,mode)}finally{await browser.close()}
console.log(checks.filter(c=>c.pass).length+'/'+checks.length+' passed');if(checks.some(c=>!c.pass))process.exitCode=1;
