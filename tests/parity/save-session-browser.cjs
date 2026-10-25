/* Real shared-origin tabs and the player's retry UI. Isolated browser profile;
 * touch is layout/input simulation, not physical-device certification. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
async function loaded(page){await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});}
const keys=['return-blue.voyage.1','return-blue.shilang.v1','return-blue.voyage.1.backup'];
const stored=page=>page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),keys);
async function exported(page,button){const download=page.waitForEvent('download');await page.locator(button).click();return JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));}
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true)),results=[];
 const check=(name)=>{results.push(name);console.log('PASS '+name);};
 try{
  for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},hasTouch:touch,isMobile:touch}),owner=await context.newPage(),other=await context.newPage(),errors=[];
  for(const page of [owner,other]){page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());}
  await owner.goto(url);await loaded(owner);await owner.locator('#startBtn').click();await owner.waitForFunction(()=>active);await owner.locator('#pauseBtn').click();
  await owner.evaluate(()=>{voyage.state.distance=1234;persistent.seen=['chromis'];saveVoyage();persist();});
  const initial=await stored(owner);
  await other.goto(url);await other.locator('#saveSessionGate').waitFor({state:'visible',timeout:10000});
  assert.match(await other.locator('#saveSessionMessage').innerText(),/另一個分頁/);
  assert.equal(await other.evaluate(()=>typeof renderer==='undefined'),true,'A second tab must not allocate a second renderer');
  assert.deepEqual(await stored(other),initial);
  assert.deepEqual(await other.evaluate(()=>[saveVoyage(),persist()]),[false,false]);
  assert.deepEqual(await stored(other),initial);
  await other.screenshot({path:path.resolve(__dirname,'../../qa/parity/save-session-'+(touch?'touch':'desktop')+'.png')});
  const layout=await other.locator('#saveSessionRetry').boundingBox();assert(layout.width>=44&&layout.height>=44&&layout.x>=0&&layout.y>=0);
  check((touch?'touch':'desktop')+' second tab waits without loading or writing');

  // Export includes current in-memory progress without mutating either saved key.
  await owner.evaluate(()=>{openPanel('voyage');voyage.state.distance=2345;});
  const beforeExport=await stored(owner),backup=await exported(owner,'#exportSave');
  assert.equal(backup.voyage.distance,2345);assert.deepEqual(await stored(owner),beforeExport);
  await owner.close();await other.locator('#saveSessionRetry').click();await loaded(other);
  assert.equal(await other.evaluate(()=>voyage.state.distance),2345);
  assert.deepEqual(await other.evaluate(()=>persistent.seen),['chromis']);
  assert.equal(await other.evaluate(()=>settings.adaptive),true);
  check('read-only export and close/retry preserve latest voyage and discoveries');

  // A legacy build ignores Web Locks. Simulate its actual storage write from a
  // second document; current code must stop saving and retain its rescue state.
  const legacy=await context.newPage();await legacy.goto(url);await legacy.locator('#saveSessionGate').waitFor({state:'visible'});
  await legacy.evaluate(()=>{const s=JSON.parse(localStorage.getItem(VOYAGE_KEY));s.distance=7654;localStorage.setItem(VOYAGE_KEY,JSON.stringify(s));});
  await other.locator('#saveSessionGate').waitFor({state:'visible'});
  assert.match(await other.locator('#saveSessionTitle').innerText(),/其他分頁變更/);
  assert.deepEqual(await other.evaluate(()=>[saveVoyage(),persist()]),[false,false]);
  const external=await stored(other),rescue=await exported(other,'#saveSessionExport');
  assert.equal(rescue.voyage.distance,2345);assert.deepEqual(await stored(other),external);
  assert.equal(JSON.parse(external[0]).distance,7654);
  await other.close();await legacy.close();
  check('external writer is detected; retained export does not overwrite it');

  const pending=await context.newPage();pending.on('dialog',d=>d.accept());await pending.goto(url);await loaded(pending);
  await pending.evaluate(()=>{window.__finishRead=null;const text=new Promise(resolve=>{window.__finishRead=resolve;});window.__import=importSaveFile({size:100,text:()=>text});window.dispatchEvent(new PageTransitionEvent('pagehide'));});
  assert.equal(await pending.evaluate(()=>exportSave()),false,'Export cannot mix state from an unfinished import');
  const waiting=await context.newPage();await waiting.goto(url);await waiting.locator('#saveSessionGate').waitFor({state:'visible'});
  assert.equal(await pending.evaluate(()=>oceanSaveSession.writable),true,'In-flight import retains its lock while finishing');
  await pending.evaluate(async()=>{const state=JSON.parse(JSON.stringify(voyage.state));state.distance=8765;window.__finishRead(JSON.stringify({format:'return-blue/save',version:1,voyage:state,journal:{seen:['chromis'],settings:{adaptive:true}},photography:await oceanPhotography.exportArchive()}));await window.__import;});
  await pending.waitForFunction(()=>oceanSaveSession.status==='closed');
  await waiting.locator('#saveSessionRetry').click();await loaded(waiting);
  assert.equal(await waiting.evaluate(()=>voyage.state.distance),8765);
  assert.equal(await pending.evaluate(()=>saveVoyage()),false);
  // A bfcache-style resume may show the existing screen, but never old authority.
  await pending.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  assert.equal(await pending.evaluate(()=>oceanSaveSession.writable),false);
  await pending.locator('#saveSessionGate').waitFor({state:'visible'});
  check('pending import finishes before release; cached document cannot resume writes');
  await pending.close();await waiting.close();
  assert.deepEqual(errors,[]);
  await context.close();
  }
  const unsupported=await browser.newContext();await unsupported.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));
  const page=await unsupported.newPage();await page.goto(url);await page.locator('#saveSessionGate').waitFor({state:'visible'});
  assert.match(await page.locator('#saveSessionTitle').innerText(),/無法保護/);assert.equal(await page.evaluate(()=>typeof renderer==='undefined'),true);assert.deepEqual(await stored(page),[null,null,null]);
  check('unavailable Web Locks fails visibly without touching saves');await unsupported.close();
  const race=await browser.newContext(),tabs=await Promise.all([race.newPage(),race.newPage()]);
  await Promise.all(tabs.map(p=>p.goto(url)));
  await Promise.all(tabs.map(p=>p.waitForFunction(()=>typeof oceanSaveSession!=='undefined'&&['owned','blocked'].includes(oceanSaveSession.status))));
  const ownership=await Promise.all(tabs.map(p=>p.evaluate(()=>oceanSaveSession.writable)));assert.equal(ownership.filter(Boolean).length,1);
  const winner=tabs[ownership.indexOf(true)],waiter=tabs[ownership.indexOf(false)];await loaded(winner);
  assert.equal(await waiter.evaluate(()=>typeof renderer==='undefined'),true);
  await winner.evaluate(()=>{voyage.state.distance=9876;saveVoyage();});await waiter.close();
  assert.deepEqual(await winner.evaluate(()=>{oceanSaveSession.close();return {saved:saveVoyage(),ready,active};}),{saved:false,ready:false,active:false},'Lost ownership stops simulation and rejects the next save');
  await winner.goto('about:blank');await winner.goBack();
  await winner.waitForFunction(()=>window.__ocean?.ready||document.getElementById('saveSessionGate')?.open,null,{timeout:120000});
  if(await winner.locator('#saveSessionGate').isVisible())await winner.locator('#saveSessionRetry').click();
  await loaded(winner);assert.equal(await winner.evaluate(()=>voyage.state.distance),9876);
  check('simultaneous native startup has one owner; browser Back reopens latest save');await race.close();
 }finally{await browser.close();fs.mkdirSync(path.resolve(__dirname,'../../qa/parity'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../qa/parity/save-session-browser.json'),JSON.stringify({url,results},null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
