/* Actual renderer-process interruption at the browser storage boundary. The
 * original JPEG/archive fixture is produced by photography-browser.mjs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
const fixture=path.resolve(__dirname,'../../qa/parity/photography-save.json');
const timeout=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error(label+' timed out')),30000);timer.unref();})]);
async function ready(page){await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});}
async function exported(page){await page.evaluate(()=>openPanel('voyage'));const next=page.waitForEvent('download');await page.locator('#exportSave').click();return JSON.parse(fs.readFileSync(await(await next).path(),'utf8'));}
async function crash(page,cdp){const crashed=page.waitForEvent('crash');cdp.send('Page.crash').catch(()=>{});await timeout(crashed,'Renderer crash');await page.close();}
const imageHashes=archive=>archive.photography.images.map(p=>({date:p.date,sha256:crypto.createHash('sha256').update(p.url).digest('hex')}));
function sameVoyage(actual,expected){assert.deepEqual(actual.voyage,expected.voyage);assert.deepEqual(actual.journal,expected.journal);assert.deepEqual(actual.photography.state,expected.photography.state);assert.deepEqual(imageHashes(actual),imageHashes(expected));}
async function seed(browser){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();page.on('dialog',dialog=>dialog.accept());
 await page.goto(url);await ready(page);await page.evaluate(()=>openPanel('voyage'));await page.locator('#importSave').setInputFiles(fixture);
 await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。');
 const original=await exported(page),incoming=await page.evaluate(()=>{const s=initialVoyage();s.distance=999999;return {format:'return-blue/save',version:1,voyage:s,journal:{seen:[],log:[],settings:{adaptive:true}},photography:{schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}};});
 const cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');const paused=new Promise(resolve=>cdp.once('Debugger.paused',resolve));
 await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){const result=set.call(this,key,value);if(key===STORE_KEY)debugger;return result;};});
 await page.locator('#importSave').setInputFiles({name:'interrupted.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});await timeout(paused,'First interruption');await crash(page,cdp);
 return {context,original};
}
(async()=>{
 assert(fs.existsSync(fixture),'Run photography-browser.mjs first to create the original-photo archive');
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  for(const phase of ['before-journal','after-journal','after-journal-backup','after-voyage','after-voyage-backup','committed']){
  const context=await browser.newContext(),page=await context.newPage();page.on('dialog',dialog=>dialog.accept());
  await page.goto(url);await ready(page);await page.evaluate(()=>openPanel('voyage'));await page.locator('#importSave').setInputFiles(fixture);
  await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。');
  const original=await exported(page);assert(original.photography.images.length>0);assert(original.voyage.features.expedition.mail['editor-reef'].photoDate>0);
  const incoming=await page.evaluate(()=>{const state=initialVoyage();state.distance=999999;return {format:'return-blue/save',version:1,voyage:state,journal:{seen:['chromis'],log:[{text:'incoming voyage',date:100}],settings:{adaptive:true,fov:80}},photography:{schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}};});
  const cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');
  const paused=new Promise(resolve=>cdp.once('Debugger.paused',resolve));
  await page.evaluate(phase=>{
   if(phase==='committed'){const remove=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){const request=remove.call(this,key);if(this.name==='recovery'&&key==='@import')this.transaction.addEventListener('complete',()=>{debugger;},{once:true});return request;};return;}
   const target=phase.includes('journal')?STORE_KEY:VOYAGE_KEY,key=target+(phase.endsWith('-backup')?'.backup':''),set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){if(phase==='before-journal'&&name===key)debugger;const result=set.call(this,name,value);if(phase!=='before-journal'&&name===key)debugger;return result;};
  },phase);
  await page.locator('#importSave').setInputFiles({name:'incoming.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
  await timeout(paused,'Storage boundary');await crash(page,cdp);
  const reopened=await context.newPage();await reopened.goto(url);await ready(reopened);
  const recovered=await exported(reopened);
  if(phase==='committed'){assert.equal(recovered.voyage.distance,999999);assert.deepEqual(recovered.journal.seen,['chromis']);assert.equal(recovered.journal.settings.fov,80);assert.deepEqual(imageHashes(recovered),[]);}
  else sameVoyage(recovered,original);
  console.log('PASS renderer crash '+phase+' reopens one complete voyage, journal, attachments and exact originals');
  await context.close();
  }
  {
   const {context,original}=await seed(browser),page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');
   const paused=new Promise(resolve=>cdp.once('Debugger.paused',resolve));
   await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){const result=set.call(this,key,value);if(key==='return-blue.shilang.v1')debugger;return result;};});
   const navigation=page.goto(url).catch(()=>{});await timeout(paused,'Repeated recovery interruption');await crash(page,cdp);await navigation;
   const retry=await context.newPage();await retry.goto(url);await ready(retry);sameVoyage(await exported(retry),original);
   console.log('PASS a second renderer crash during recovery remains retryable with exact original data');await context.close();
  }
  {
   const {context,original}=await seed(browser),page=await context.newPage();
   await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='return-blue.shilang.v1')throw new DOMException('Injected recovery quota failure','QuotaExceededError');return set.call(this,key,value);};});
   await page.goto(url);await page.locator('#saveSessionGate').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>typeof renderer),'undefined');
   const download=page.waitForEvent('download');await page.locator('#saveSessionExport').click();sameVoyage(JSON.parse(fs.readFileSync(await(await download).path(),'utf8')),original);
   await page.screenshot({path:path.resolve(__dirname,'../../qa/parity/save-startup-recovery-touch.png')});await page.close();
   const retry=await context.newPage();await retry.goto(url);await ready(retry);sameVoyage(await exported(retry),original);
   console.log('PASS failed startup recovery allocates no renderer and exports durable originals before a successful retry');await context.close();
  }
  {
   const {context,original}=await seed(browser),writer=await context.newPage(),probe=new URL('__storage_test__',url).href;
   await writer.route(probe,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Storage boundary</title>'}));await writer.goto(probe);
   const external=JSON.stringify({schema:1,distance:717171,features:{}});await writer.evaluate(value=>localStorage.setItem('return-blue.voyage.1',value),external);await writer.close();
   const page=await context.newPage();await page.goto(url);await page.locator('#saveSessionGate').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>typeof renderer),'undefined');assert.equal(await page.evaluate(()=>localStorage.getItem('return-blue.voyage.1')),external);
   const download=page.waitForEvent('download');await page.locator('#saveSessionExport').click();sameVoyage(JSON.parse(fs.readFileSync(await(await download).path(),'utf8')),original);
   assert.equal(await page.evaluate(()=>localStorage.getItem('return-blue.voyage.1')),external);
   console.log('PASS unknown external data is not overwritten and the independent durable backup remains downloadable');await context.close();
  }
  {
   const {context,original}=await seed(browser),page=await context.newPage();
   await page.addInitScript(()=>{const transaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,mode,...args){const tx=transaction.call(this,stores,mode,...args);if(mode==='readonly'&&(stores==='recovery'||Array.isArray(stores)&&stores.includes('recovery'))&&!window.__heldPreflight){window.__heldPreflight=true;Object.defineProperty(tx,'oncomplete',{set(fn){tx.addEventListener('complete',event=>{window.__resumePreflight=()=>fn.call(tx,event);},{once:true});}});}return tx;};});
   await page.goto(url);await page.waitForFunction(()=>typeof window.__resumePreflight==='function');
   await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.evaluate(()=>oceanSaveSession.holdsLock),true);
   const other=await context.newPage();await other.goto(url);await other.locator('#saveSessionGate').waitFor({state:'visible'});assert.match(await other.locator('#saveSessionMessage').innerText(),/另一個分頁/);
   await page.evaluate(()=>window.__resumePreflight());await page.waitForFunction(()=>oceanSaveSession.status==='closed');assert.equal(await page.evaluate(()=>typeof renderer),'undefined');
   await other.locator('#saveSessionRetry').click();await ready(other);sameVoyage(await exported(other),original);
   console.log('PASS pagehide retains ownership while startup recovery drains; waiting tab then opens the original voyage');await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
