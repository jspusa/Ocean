/* Native IndexedDB + localStorage fault boundaries after actual file-input import.
 * Uses original in-engine JPEGs produced by photography-browser.mjs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(()=>openPanel('voyage'));await page.locator('#importSave').setInputFiles(path.resolve(__dirname,'../../qa/parity/photography-save.json'));
  await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。');
  const original=await page.evaluate(async()=>({voyage:JSON.parse(JSON.stringify(voyage.state)),photography:await oceanPhotography.exportArchive()}));
  assert(original.photography.images.length>0);assert(original.voyage.features.expedition.mail['editor-reef'].photoDate>0);
  const incoming=await page.evaluate(()=>{const state=initialVoyage();state.distance=999999;return {format:'return-blue/save',version:1,voyage:state,journal:{seen:[],log:[],settings:{adaptive:true}},photography:{schema:1,state:{schema:1,revision:0,film:[],album:[]},images:[]}};});
  await page.evaluate(()=>{
   window.__storageSet=Storage.prototype.setItem;window.__photoTransaction=IDBDatabase.prototype.transaction;window.__failRollback=false;
   Storage.prototype.setItem=function(key,value){if(key===VOYAGE_KEY&&JSON.parse(value).distance===999999){window.__failRollback=true;throw new DOMException('Injected primary save failure','QuotaExceededError');}return window.__storageSet.call(this,key,value);};
   IDBDatabase.prototype.transaction=function(...args){if(window.__failRollback&&args[1]==='readwrite')throw new DOMException('Injected rollback failure','UnknownError');return window.__photoTransaction.apply(this,args);};
  });
  await page.locator('#importSave').setInputFiles({name:'incoming.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
  await page.locator('#saveSessionGate').waitFor({state:'visible'});await page.waitForFunction(()=>!voyage.importing&&oceanSaveSession.status==='closed');
  assert.match(await page.locator('#saveSessionTitle').innerText(),/未能完整還原/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__storageSet;IDBDatabase.prototype.transaction=window.__photoTransaction;});
  const before=await page.evaluate(()=>[STORE_KEY,VOYAGE_KEY].map(k=>localStorage.getItem(k)));
  const download=page.waitForEvent('download');await page.locator('#saveSessionExport').click();const rescue=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));
  assert.deepEqual(rescue.voyage,original.voyage);assert.deepEqual(rescue.photography.state,original.photography.state);assert.deepEqual(rescue.photography.images,original.photography.images);
  assert.deepEqual(await page.evaluate(()=>[STORE_KEY,VOYAGE_KEY].map(k=>localStorage.getItem(k))),before);
  assert.equal(await page.evaluate(()=>oceanPhotography.snapshot().durable),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.resolve(__dirname,'../../qa/parity/save-import-recovery-touch.png')});
  console.log('PASS failed native import rollback exports exact pre-import voyage, mail and original JPEGs without rewriting storage');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
