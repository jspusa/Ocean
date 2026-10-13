// Controlled public UI scenarios, actual models/rendering/storage. Not an
// unassisted campaign or physical-phone test. Run one GPU process at a time.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {projectedPartnerBounds} from './projected-partner.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const touch=process.argv.includes('--touch'),landscape=process.argv.includes('--landscape'),mode=touch?(landscape?'landscape':'touch'):'desktop',viewport=touch?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1440,height:900};
const url=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:8765/?v=0.12.0';
const browser=await chromium.launch({channel:'chrome',headless:true});let count=0;const errors=[],captures=[];
try{
 const c=await browser.newContext({viewport,isMobile:touch,hasTouch:touch}),page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));
 const check=(name,ok)=>{assert(ok,name);count++;console.log('PASS '+name)};
 const press=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 async function advance(dt){await page.evaluate(dt=>{t+=dt;oceanEcology.afterLife(t);updateCamera();renderer.render(eye,target,t);oceanFeatures.call('idleTick',dt)},dt);}
 async function gesture(part,kind){const r=await page.locator('#ecologyPart-'+part).boundingBox();assert(r);const x=r.x+r.width/2,y=r.y+r.height/2;
  if(touch){const dev=await c.newCDPSession(page);await dev.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});if(kind==='stroke'){await advance(.3);for(let d=5;d<=35;d+=5)await dev.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+d,y,id:1}]});await advance(.35);for(let d=30;d>=-25;d-=5)await dev.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+d,y,id:1}]});}else await advance(kind==='grab'?.75:.1);await dev.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await dev.detach();}
  else{await page.mouse.move(x,y);await page.mouse.down();if(kind==='stroke'){await advance(.3);await page.mouse.move(x+35,y,{steps:7});await advance(.35);await page.mouse.move(x-25,y,{steps:12});}else await advance(kind==='grab'?.75:.1);await page.mouse.up();}
  if(kind==='touch'){await advance(.12);await gesture(part,'single');}
 }
 await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 await page.evaluate(()=>{window.__freeze=true;settings.sound=false;settings.third=false;settings.reduced=true;settings.lookLock=false;window.partnerFixture={};startDive(false);$('welcome').classList.add('hidden');});
 const ids=await page.evaluate(()=>CETACEAN_SPECIES.map(s=>s.id));check('All seven new species actually loaded',ids.length===7);
 for(const id of ids){
  await page.evaluate(id=>{if(modal)closePanel();active=true;const s=oceanFeatures.state('ecology');s.partners=[];s.selected=null;s.released=[];s.accompany=false;oceanEcology.hooks.reset();const f=life.find(f=>SPECIES[f.species]?.id===id);window.partnerFixture.actor=f;player.p=[-215,-12,100];player.yaw=0;player.pitch=0;f.p=[-215,-12,97];f.yaw=.15;f.pitch=0;f.bank=0;s.individuals[f.uid]={trust:24,seconds:6,strokes:4,feeds:0};cameraCut=true;updateCamera();renderer.render(eye,target,t);oceanFeatures.call('tick',.2);},id);
  await press('#ecologyBefriend');
  check(id+' can be invited with the visible interaction control',await page.evaluate(()=>oceanFeatures.state('ecology').selected===partnerFixture.actor.uid));
  await page.evaluate(()=>{goHome();$('debrief').classList.add('hidden');$('welcome').classList.add('hidden');const f=partnerFixture.actor;f.p=[OPEN_WORLD.boat[0]+9,.30,OPEN_WORLD.boat[2]+6];oceanEcology.selectPartner(f.uid);oceanFeatures.open('training');t+=.1;oceanEcology.afterLife(t);updateCamera();renderer.render(eye,target,t);oceanFeatures.call('idleTick',.1);});
  const targets=await page.evaluate(()=>['mouth','fin'].map(part=>{const el=$('ecologyPart-'+part),r=el.getBoundingClientRect();return {part,x:r.x,y:r.y,w:r.width,h:r.height,visible:!el.classList.contains('hidden'),top:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id}}));
  check(id+' mouth and flipper are visible usable targets',targets.every(a=>a.visible&&a.x>=0&&a.y>=0&&a.x+a.w<=viewport.width&&a.y+a.h<=viewport.height&&a.top==='ecologyPart-'+a.part)&&!(Math.min(targets[0].x+44,targets[1].x+44)-Math.max(targets[0].x,targets[1].x)>1&&Math.min(targets[0].y+44,targets[1].y+44)-Math.max(targets[0].y,targets[1].y)>1));
  await gesture('mouth','grab');check(id+' actual mouth hold queues a backflip',await page.evaluate(()=>oceanEcology.snapshot().training.queue.join(',')==='backflip'));
  await page.waitForFunction(()=>Number(getComputedStyle($('panel')).opacity)>.99);
  const bounds=await page.evaluate(projectedPartnerBounds);
  check(id+' full animated mesh fits beside the training controls '+JSON.stringify(bounds),bounds.gl===0&&!bounds.behind&&bounds.vertices>100&&bounds.left>=8&&bounds.top>=8&&bounds.right<=bounds.limitRight-8&&bounds.bottom<=bounds.limitBottom-8);
  if(id==='orca'||id==='commerson_dolphin'){await mkdir('qa/parity',{recursive:true});const file='qa/parity/partner-'+id+'-'+mode+'.png';await page.waitForFunction(()=>Number(getComputedStyle($('panel')).opacity)>.99);await page.evaluate(()=>{$('toast').classList.remove('show');$('radioBox').classList.remove('visible')});await page.screenshot({path:file,animations:'disabled'});captures.push(file);}
 }
 // Six gestures on the same real body; clear between commands through actual UI.
 for(const [part,kind,id] of [['mouth','touch','spin'],['mouth','stroke','frontflip'],['mouth','grab','backflip'],['fin','touch','tailwalk'],['fin','stroke','sing'],['fin','grab','handshake']]){
  await press('#ecologyClearQueue');await gesture(part,kind);check(part+' '+kind+' queues '+id,await page.evaluate(id=>oceanEcology.snapshot().training.queue.join(',')===id,id));
 }
 await page.locator('#ecologyStrength').fill('40');await press('#ecologyGo');await page.evaluate(()=>{const q=oceanEcology.snapshot().training.trick;t=q.start+q.duration*.60;updateLife(t);updateCamera();renderer.render(eye,target,t);oceanFeatures.call('idleTick',.1);});
 check('Handshake raises a real flipper in the shared actor and renderer',await page.evaluate(()=>partnerFixture.actor.partnerFinPulse>.5&&renderer.batches.some(b=>b.kind===9&&b.instances.includes(partnerFixture.actor)&&b.drawCount>0)&&renderer.gl.getError()===0));
 await press('#ecologyPraise');await page.evaluate(()=>{const q=oceanEcology.snapshot().training.trick;t=q.start+q.duration+.01;updateLife(t);oceanFeatures.call('idleTick',.1);oceanFeatures.open('partners');});
 await page.locator('[data-partner-name]').fill('潮聲');await page.locator('[data-partner-name]').press('Tab');
 check('Completed training and name survive save sanitation',await page.evaluate(()=>{const s=oceanEcology.sanitize(oceanFeatures.state('ecology'));return s.partners[0].name==='潮聲'&&s.partners[0].mastery.handshake===1&&s.partners[0].lastPerformance.count===1}));
 await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 check('Actual reload preserves the selected new species and learned action',await page.evaluate(()=>{const s=oceanFeatures.state('ecology');return s.partners[0].name==='潮聲'&&s.partners[0].mastery.handshake===1&&s.selected.startsWith('rissos_dolphin-')}));
 await page.evaluate(()=>openPanel('voyage'));const downloadEvent=page.waitForEvent('download');await press('#exportSave');const downloaded=await downloadEvent,saveFile='qa/parity/partners-'+mode+'-save.json';await downloaded.saveAs(saveFile);
 check('Complete backup is downloaded through the actual voyage control',downloaded.suggestedFilename().endsWith('.json'));
 await page.evaluate(()=>oceanFeatures.open('partners'));
 check('All eight candidates have a reachable habitat button',await page.locator('[data-partner-habitat]').count()===8);
 await press('[data-partner-habitat="orca"]');check('Candidate button sets the actual orca range as destination',await page.evaluate(()=>voyage.state.waypoint==='habitat:orca'&&!!voyageDestination('habitat:orca')));
 await page.evaluate(()=>oceanFeatures.open('partners'));await press('[data-partner-release]');
 check('Visible goodbye control frees the slot and persists released identity',await page.evaluate(()=>oceanFeatures.state('ecology').partners.length===0&&oceanFeatures.state('ecology').released[0].startsWith('rissos_dolphin-')));
 await page.evaluate(()=>openPanel('voyage'));page.once('dialog',d=>d.accept());await page.locator('#importSave').setInputFiles(saveFile);await page.waitForFunction(()=>!voyage.importing&&oceanFeatures.state('ecology').partners[0]?.name==='潮聲');
 check('Downloaded archive restores new identity, name, skills and performance through file import',await page.evaluate(()=>{const s=oceanFeatures.state('ecology');return s.selected.startsWith('rissos_dolphin-')&&s.partners[0].mastery.handshake===1&&s.partners[0].lastPerformance.count===1&&!s.released.includes(s.selected)}));
 await page.evaluate(()=>{closePanel();oceanFeatures.open('partners')});await press('[data-partner-release]');await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 check('Goodbye survives actual reload and does not resurrect a retired partner',await page.evaluate(()=>oceanFeatures.state('ecology').partners.length===0&&oceanFeatures.state('ecology').released[0].startsWith('rissos_dolphin-')));
 await page.evaluate(()=>{window.__freeze=true;settings.sound=false;settings.third=false;settings.lookLock=false;startDive(false);$('welcome').classList.add('hidden');const s=oceanFeatures.state('ecology');s.partners=['dolphin','common_dolphin','beluga'].map(id=>{const f=life.find(f=>SPECIES[f.species].id===id);f.p=[30,-20,-160];return {uid:f.uid,name:id,mastery:{}}});s.selected=s.partners[0].uid;s.accompany=false;oceanEcology.hooks.reset();const f=life.find(f=>SPECIES[f.species].id==='orca');window.replacementUID=f.uid;player.p=[-215,-12,100];player.yaw=0;player.pitch=0;f.p=[-215,-12,97];f.yaw=0;f.pitch=0;f.bank=0;s.individuals[f.uid]={trust:24,seconds:6,strokes:4,feeds:0};updateCamera();renderer.render(eye,target,t);oceanFeatures.call('tick',.2);});
 await press('#ecologyBefriend');check('Full roster invitation opens an explicit replacement choice',await page.locator('[data-partner-replace]').count()===3);
 await press('[data-partner-replace^="common_dolphin-"]');
 check('Actual replacement choice frees exactly one seat and retains other partners',await page.evaluate(()=>{const s=oceanFeatures.state('ecology');return s.partners.length===3&&s.selected===replacementUID&&s.partners.some(p=>p.uid.startsWith('dolphin-'))&&s.partners.some(p=>p.uid.startsWith('beluga-'))&&s.released.some(uid=>uid.startsWith('common_dolphin-'))&&!oceanEcology.snapshot().riding}));
 check('No browser runtime errors',errors.length===0);
 await writeFile('qa/parity/partners-'+mode+'.json',JSON.stringify({count,mode,viewport,errors,captures,scope:'controlled real UI scenarios, not physical device or full campaign'},null,2));
 console.log(count+' partner browser checks passed '+mode);
}finally{await browser.close();}
