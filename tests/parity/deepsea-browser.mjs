/* Actual deployment, controls, selection, photos and durable restore. No pose,
 * discovery, calendar or clock fixtures; research stations are public entry UI.
 * Touch is Chrome emulation, not physical phone validation. Exclusive GPU. */
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {mkdir,writeFile,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/';
const modes=[{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
const checks=[],errors=[];const out='qa/parity';await mkdir(out,{recursive:true});const browser=await pw.chromium.launch({channel:'chrome',headless:true});
function check(m,name,pass,detail){checks.push({mode:m.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+m.id+' '+name);}
async function click(page,m,selector){const e=page.locator(selector);await e.scrollIntoViewIfNeeded();if(m.touch)await e.tap();else await e.click();}
async function ready(page){await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:90000});}
async function move(page,m,ms=700){
 if(!m.touch){await page.keyboard.down('w');await page.waitForTimeout(ms);await page.keyboard.up('w');}
 else{const box=await page.locator('#joystick').boundingBox();if(!box)throw Error('Visible movement joystick missing');const session=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-36,id:1}]});await page.waitForTimeout(ms);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
 await page.waitForTimeout(350);
}
async function ship(page,m){await click(page,m,'#homeBtn');await click(page,m,'#debriefClose');await page.waitForFunction(()=>!active);}
try{for(const m of modes){
 const context=await browser.newContext({viewport:{width:m.width,height:m.height},deviceScaleFactor:1,isMobile:m.touch,hasTouch:m.touch}),page=await context.newPage();page.on('pageerror',e=>errors.push({mode:m.id,message:e.message}));await page.goto(url);await ready(page);await page.locator('#welcomeAudio').uncheck();
 const original=await page.evaluate(()=>({uids:life.filter(f=>!f.trench).map(f=>f.uid),mooring:oceanNavigation.snapshot().mooring,quality:settings.adaptive}));
 for(const [station,species,depth] of [['midwater','vampire_squid',700],['slope','sea_pig',1400],['hadal','mariana_snailfish',7000]]){
  await click(page,m,'#shipResearch [data-feature="deepsea"]');await click(page,m,`[data-deepsea-station="${station}"]`);await page.waitForFunction(()=>active&&oceanDeepsea.isActive()&&document.getElementById('welcome').classList.contains('hidden'));
  const entry=await page.evaluate(()=>({p:player.p.slice(),gl:renderer.gl.getError(),compiled:renderer.sceneLoad.compiled,air:voyage.state.features.expedition.air,guest:voyage.state.features.expedition.guest,submersible:renderer.submersible,ui:$('depth').textContent,area:$('areaName').textContent,waypointHidden:$('waypointHUD').classList.contains('hidden'),selected:focusFish?.uid||null}));
  check(m,station+' deploys to actual metre depth',Math.abs(entry.p[1]+depth)<.05&&entry.compiled&&entry.gl===0,entry);check(m,station+' hides the shallow waypoint',entry.waypointHidden);check(m,station+' begins without automatic centre selection',entry.selected===null,entry.selected);check(m,station+' runs research vehicle without a guest',entry.submersible&&entry.guest===null);
  let sample;for(let tries=0;tries<16;tries++){
   sample=await page.evaluate(id=>{const f=life.find(f=>SPECIES[f.species].id===id),aim=animalFocusPoint(f),q=project(aim,renderer.vp);return {uid:f.uid,distance:V.dist(eye,aim),limit:speciesTraits(f.species).observeDistance,q,x:(q[0]*.5+.5)*innerWidth,y:(-.5*q[1]+.5)*innerHeight,p:player.p.slice(),clear:!blocked(eye,aim,.001)}},species);
   if(sample.distance<Math.min(sample.limit*.65,2.2))break;
   await move(page,m,Math.max(70,Math.min(450,(sample.distance-Math.min(sample.limit*.55,1.9))/5.2*1000)));
  }
  // Reframe using an actual drag: reading the live body point does not mutate
  // camera pose or grant selection. This is also how a player looks at the bed.
  for(let adjustment=0;adjustment<3;adjustment++){
   const delta=await page.evaluate(id=>{const f=life.find(f=>SPECIES[f.species].id===id),d=V.sub(animalFocusPoint(f),eye),yaw=Math.atan2(d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));let angle=yaw-player.yaw;while(angle>Math.PI)angle-=TAU;while(angle<-Math.PI)angle+=TAU;return {dx:angle/(.0037*settings.sensitivity),dy:(player.pitch-pitch)/(.0032*settings.sensitivity)};},species);
   if(Math.hypot(delta.dx,delta.dy)<(m.touch?10:6))break;
   const x=m.width*.60,y=m.height*.46,dx=Math.max(-100,Math.min(100,delta.dx)),dy=Math.max(-90,Math.min(90,delta.dy));
   if(m.touch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+dx,y:y+dy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy);await page.mouse.up();}
   await page.waitForTimeout(300);
  }
  check(m,station+' approaches animal using real movement',V_DIST(entry.p,sample.p)>1&&sample.distance<sample.limit&&sample.clear,sample);
  const beforePhoto=await page.evaluate(()=>({film:voyage.state.features.photography.film.length,seen:persistent.seen.length,air:voyage.state.features.expedition.air}));
  await click(page,m,'#photoBtn');await page.waitForFunction(n=>voyage.state.features.photography.film.length>n,beforePhoto.film,{timeout:15000});
  const shot=await page.evaluate(()=>{const p=voyage.state.features.photography.film.at(-1);return {individual:p.individual,species:p.species,grade:p.grade,air:voyage.state.features.expedition.air};});check(m,station+' captures actual animal without preselection',shot.individual===sample.uid,shot);check(m,station+' preserves scuba air',shot.air===entry.air,{before:entry.air,after:shot.air});
  // Obtain the current projected body point after natural motion, then act on
  // the visible canvas. No direct select/focus or discovery mutation is used.
  sample=await page.evaluate(id=>{const f=life.find(f=>SPECIES[f.species].id===id),q=project(animalFocusPoint(f),renderer.vp);return {uid:f.uid,x:(q[0]*.5+.5)*innerWidth,y:(-.5*q[1]+.5)*innerHeight}},species);
  const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,sample);check(m,station+' animal is reachable on the real canvas',hit==='ocean',hit);
  if(m.touch)await page.touchscreen.tap(sample.x,sample.y);else await page.mouse.click(sample.x,sample.y);
  await page.waitForTimeout(1500);const selected=await page.evaluate(id=>({uid:focusFish?.uid||null,seen:persistent.seen.includes(id),card:$('focusCard').className}),species);check(m,station+' explicit pointer selection records the chosen animal',selected.uid===sample.uid&&selected.seen,selected);
  await page.screenshot({path:`${out}/deepsea-${m.id}-${station}.png`,animations:'disabled'});
  if(station==='hadal'){
   await page.keyboard.press('KeyB');await page.waitForSelector('#exportSave');const pendingDownload=page.waitForEvent('download');await click(page,m,'#exportSave');const download=await pendingDownload,bytes=await readFile(await download.path()),exported=JSON.parse(bytes);check(m,'export contains exact deep position and discoveries',exported.voyage.resume.p[1]<-6900&&exported.voyage.features.deepsea.deployed&&exported.journal.seen.includes('mariana_snailfish'),{p:exported.voyage.resume.p});
   await page.reload();await ready(page);await click(page,m,'#shipContinue');await page.waitForFunction(()=>active&&oceanDeepsea.isActive());check(m,'reload restores the actual hadal position',await page.evaluate(p=>V.dist(player.p,p)<.08,exported.voyage.resume.p));
   await ship(page,m);await page.keyboard.press('Escape');await click(page,m,'#shipResearch [data-feature="deepsea"]');await click(page,m,'[data-deepsea-station="midwater"]');await page.waitForFunction(()=>active&&oceanDeepsea.isActive());
   await page.keyboard.press('KeyT');await click(page,m,'#panelBody [data-feature="deepsea"]');await click(page,m,'[data-deepsea-station="slope"]');await page.waitForTimeout(500);const traveling=await page.evaluate(()=>({target:oceanDeepsea.snapshot().travelTarget,p:player.p.slice()}));check(m,'inter-station travel follows changing real depth',traveling.target==='slope'&&traveling.p[1]<-700&&traveling.p[1]>-1400,traveling);await move(page,m,200);check(m,'manual movement takes over guided descent',await page.evaluate(()=>!auto&&!oceanDeepsea.snapshot().travelTarget));
   await page.keyboard.press('KeyT');await click(page,m,'#panelBody [data-feature="deepsea"]');await click(page,m,'[data-deepsea-station="midwater"]');await page.waitForFunction(()=>!oceanDeepsea.snapshot().travelTarget,null,{timeout:15000});check(m,'interrupted trip can return to its departure station',await page.evaluate(()=>V.dist(player.p,OceanTrench.stations[0].p)<.1));await page.keyboard.press('KeyT');await click(page,m,'#settingsBtn');await click(page,m,'#resetPosition');await click(page,m,'#debriefClose');check(m,'recovery button safely returns the research vehicle to ship',await page.evaluate(()=>!active&&!oceanDeepsea.isActive()&&!renderer.submersible&&$('deepseaStatus').classList.contains('hidden')));
   const fresh=await browser.newContext({viewport:{width:m.width,height:m.height},deviceScaleFactor:1,isMobile:m.touch,hasTouch:m.touch}),second=await fresh.newPage();second.on('dialog',dialog=>dialog.accept());second.on('pageerror',e=>errors.push({mode:m.id,message:e.message}));await second.goto(url);await ready(second);await second.locator('#welcomeAudio').uncheck();await click(second,m,'#startBtn');await second.waitForFunction(()=>active);await second.keyboard.press('KeyB');await second.locator('#importSave').setInputFiles({name:'deepsea-save.json',mimeType:'application/json',buffer:bytes});await second.waitForFunction(()=>!voyage.importing&&voyage.state.features.deepsea?.deployed&&!!voyage.state.resume);await click(second,m,'#shipContinue');await second.waitForFunction(()=>active&&oceanDeepsea.isActive());const restored=await second.evaluate(()=>({p:player.p.slice(),seen:persistent.seen.slice(),film:voyage.state.features.photography.film.length}));check(m,'fresh storage import restores deep position and photos',V_DIST(restored.p,exported.voyage.resume.p)<.08&&restored.film>=3&&restored.seen.includes('mariana_snailfish'),restored);await fresh.close();
  }else await ship(page,m);
 }
 const final=await page.evaluate(()=>({active,statusHidden:$('deepseaStatus').classList.contains('hidden'),mooring:oceanNavigation.snapshot().mooring,uids:life.filter(f=>!f.trench).map(f=>f.uid),quality:settings.adaptive,gl:renderer.gl.getError()}));check(m,'return preserves shallow identities, mooring and automatic quality',!final.active&&final.statusHidden&&final.mooring===original.mooring&&JSON.stringify(final.uids)===JSON.stringify(original.uids)&&final.quality===original.quality&&final.gl===0,final);
 await context.close();
}}catch(error){checks.push({name:'suite completed',pass:false,detail:error.stack});console.error(error.stack);}finally{await browser.close();await writeFile(`${out}/deepsea-${modes.map(m=>m.id).join('-')}-results.json`,JSON.stringify({url,checks,errors},null,2));}
function V_DIST(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]));}
if(errors.length||checks.some(c=>!c.pass))process.exitCode=1;
