/* Real browser Storage faults and player recovery UI. Touch is emulation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/';
const output=process.env.EVIDENCE_DIR||'qa/parity/v01826-evidence/save-health';fs.mkdirSync(output,{recursive:true});
const voyageKey='return-blue.voyage.1',journalKey='return-blue.shilang.v1';
const keys=[voyageKey,voyageKey+'.backup',journalKey,journalKey+'.backup'];
const stored=p=>p.evaluate(keys=>keys.map(k=>[k,localStorage.getItem(k)]),keys);
const downloadJSON=async(page,button)=>{const event=page.waitForEvent('download');await page.locator(button).click();return JSON.parse(fs.readFileSync(await(await event).path(),'utf8'));};
const loaded=async p=>{await p.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await p.locator('#loading').waitFor({state:'hidden'});};
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs')(true)),checks=[];
try{for(const touch of process.env.PROFILE==='touch'?[true]:process.env.PROFILE==='desktop'?[false]:[false,true]){
 const profile=touch?(process.env.LANDSCAPE==='1'?'touch-landscape':'touch'):'desktop',context=await browser.newContext({viewport:touch?(process.env.LANDSCAPE==='1'?{width:844,height:390}:{width:390,height:844}):{width:1200,height:800},hasTouch:touch,isMobile:touch}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({voyageKey,journalKey})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(voyageKey,'{broken primary');localStorage.setItem(voyageKey+'.backup','{broken backup');localStorage.setItem(journalKey,JSON.stringify({seen:['chromis'],photos:[],log:[],settings:{}}));sessionStorage.setItem('seeded','1');}},{voyageKey,journalKey});
 await page.goto(url);await loaded(page);
 assert.equal(await page.locator('#saveLoadGate').isVisible(),true,'Unreadable old progress needs a visible recovery gate');
 const snapshot=await stored(page);assert.equal(snapshot[0][1],'{broken primary');assert.equal(snapshot[1][1],'{broken backup');
 assert.deepEqual(await page.evaluate(()=>[saveVoyage(),persist()]),[false,false]);assert.deepEqual(await stored(page),snapshot);
 assert.equal(await page.evaluate(()=>exportSave()),false,'Defaults must not be exported as the unreadable voyage');
 await page.screenshot({path:path.join(output,profile+'-unreadable.png')});checks.push(profile+' unreadable data protected and recovery visible');
 const raw=await downloadJSON(page,'#saveLoadRaw');assert.equal(raw.format,'return-blue/storage-rescue');assert.equal(raw.includesPhotoOriginals,false);assert.deepEqual(raw.records.map(r=>[r.key,r.raw]),snapshot);assert.deepEqual(await stored(page),snapshot);
 await page.evaluate(key=>{window.__getItem=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(this===localStorage&&k===key)throw new DOMException('Injected read failure','SecurityError');return window.__getItem.call(this,k);};},voyageKey);
 const partialRaw=await downloadJSON(page,'#saveLoadRaw');assert.equal(partialRaw.records[0].status,'unavailable');assert.equal(Object.hasOwn(partialRaw.records[0],'raw'),false);assert.match(await page.locator('#saveLoadStatus').innerText(),/部分/);
 await page.evaluate(()=>{Storage.prototype.getItem=window.__getItem;});
 const imported={format:'return-blue/save',version:1,voyage:{schema:1,distance:321,features:{}},journal:{seen:['chromis'],photos:[],log:[],settings:{adaptive:true}}};
 const importFile=()=>page.locator('#saveLoadImport').setInputFiles({name:'valid-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 // Fail once after photo commit. Rollback must retain raw bytes and the load gate.
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key){Storage.prototype.setItem=original;throw new DOMException('Injected primary failure','QuotaExceededError');}return original.call(this,k,v);};},voyageKey);
 await importFile();await page.waitForFunction(()=>!voyage.importing);assert.equal(await page.locator('#saveLoadGate').isVisible(),true);assert.deepEqual(await stored(page),snapshot);assert.equal(await page.evaluate(()=>oceanSaveHealth.readable()),false);
 await importFile();await page.waitForFunction(()=>!voyage.importing&&oceanSaveHealth.readable());assert.equal(await page.locator('#saveLoadGate').isVisible(),false);assert.equal(await page.evaluate(()=>voyage.state.distance),321);
 await page.reload();await loaded(page);assert.equal(await page.evaluate(()=>voyage.state.distance),321);assert.equal(await page.locator('#saveHealthNotice').isVisible(),false);checks.push(profile+' raw rescue, failed-import rollback and validated import survive reload');
 for(const failed of [[voyageKey],[journalKey],[voyageKey,journalKey]]){
  await page.locator('#startBtn').click();await page.waitForFunction(()=>active);
  const before=await page.evaluate(()=>voyage.state.features.photography.film.length);
  await page.evaluate(keys=>{window.__saveFailures=keys;window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&window.__saveFailures.includes(k))throw new DOMException('Injected full storage','QuotaExceededError');return window.__originalSetItem.call(this,k,v);};},failed);
  await page.locator('#photoBtn').click();await page.waitForFunction(n=>!voyage.photoBusy&&voyage.state.features.photography.film.length===n+1,before);
  const message=await page.locator('#toast').innerText();assert.match(message,/已保存/);assert.match(message,/未保存|受限|未完整/);
  assert.equal(await page.locator('#saveHealthNotice').isVisible(),true);
  const labels=await page.locator('#saveHealthLabel').innerText();assert.equal(labels.includes('航程'),failed.includes(voyageKey));assert.equal(labels.includes('圖鑑'),failed.includes(journalKey));
  await page.waitForTimeout(3800);assert.equal(await page.locator('#saveHealthNotice').isVisible(),true,'Save failure must outlive any toast');
  const box=await page.locator('#saveHealthNotice').boundingBox();assert(box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=page.viewportSize().width);
  const photoBox=await page.locator('#photoResult').boundingBox();assert(photoBox,'Photographic result must remain visible during the notice check');assert(box.x+box.width<=photoBox.x||photoBox.x+photoBox.width<=box.x||box.y+box.height<=photoBox.y||photoBox.y+photoBox.height<=box.y,'Save notice must not cover the photographic result');
  await page.screenshot({path:path.join(output,profile+'-pending-'+failed.length+'-'+failed[0].split('.').at(-1)+'.png')});
  await page.locator('#saveHealthNotice').click();assert.equal(await page.locator('#saveHealthDetail').isVisible(),true);
  const saved=await downloadJSON(page,'#exportSave');assert.equal(saved.format,'return-blue/save');assert(saved.photography.images.length>0);const original=saved.photography.images.at(-1);assert.match(original.url,/^data:image\/jpeg;base64,/);
  await page.evaluate(()=>{window.__saveFailures=[];});await page.locator('#saveHealthRetry').click();assert.equal(await page.locator('#saveHealthNotice').isVisible(),false);assert.doesNotMatch(await page.locator('#saveStatus').innerText(),/受限|未保存/,'Homepage must clear its stale save warning after retry');
  await page.reload();await loaded(page);const archive=await page.evaluate(()=>oceanPhotography.exportArchive());assert.equal(archive.images.find(p=>p.date===original.date).url,original.url,'The actual captured JPEG must remain exact after retry and reload');
  assert.equal(await page.evaluate(()=>settings.adaptive),true);assert.equal(await page.locator('#saveHealthNotice').isVisible(),false);checks.push(profile+' actual shutter, failure notice, full export, retry and exact JPEG reload '+failed.join(','));
 }
 await context.close();assert.deepEqual(errors,[]);
}fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({url,checks},null,2));console.log(JSON.stringify({checks}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
