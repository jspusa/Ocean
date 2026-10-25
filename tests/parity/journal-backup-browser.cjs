/* Native startup, real journal backups and file-input restoration. Each row
 * owns an isolated browser profile; touch is simulation, not physical-device QA. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(arg=>/^https?:/.test(arg))||'http://127.0.0.1:8765/';
const KEY='return-blue.shilang.v1',BACKUP=KEY+'.backup';
const fixturePath=path.resolve(__dirname,'../../qa/parity/photography-save.json');
const output=path.resolve(__dirname,'../../qa/parity/journal-backup-browser.json');
async function loaded(page){
 await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
 await page.locator('#loading').waitFor({state:'hidden'});
}
async function session(browser,touch=false){
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},hasTouch:touch,isMobile:touch});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('dialog',dialog=>dialog.accept());
 return {context,page,errors};
}
async function seedOnce(context,records){
 // Only real browser Storage is seeded. Application modules and startup remain
 // untouched, including the native lock and photographic recovery preflight.
 await context.addInitScript(rows=>{
  if(sessionStorage.getItem('journal-test-seeded'))return;
  for(const [key,value]of rows)localStorage.setItem(key,value);
  sessionStorage.setItem('journal-test-seeded','1');
 },records);
}
const stored=page=>page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[KEY,BACKUP]);
(async()=>{
 assert(fs.existsSync(fixturePath),'Run photography-browser.mjs first to generate the real JPEG save fixture');
 const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
 assert(fixture.photography.images.length>0,'The import fixture must contain original in-engine photographs');
 const browser=await chromium.launch(require('./browser-launch.cjs')(true)),results=[];
 const passed=(name,detail)=>{results.push({name,...detail});console.log('PASS '+name);};
 try{
  {
   const {context,page,errors}=await session(browser);
   try{
    await page.goto(url);await loaded(page);
    assert.equal(await page.evaluate(()=>{
     persistent.seen=['chromis','turtle'];settings.fov=82;settings.adaptive=false;settings.quality=0;
     return persist()&&persist();
    }),true);
    const backup=JSON.parse((await stored(page))[1]);
    assert.deepEqual(backup.seen,['chromis','turtle']);assert.equal(backup.settings.fov,82);
    // Corrupt only the next document's primary, after ordinary page-exit saves
    // have finished and before that document's real startup reads either key.
    await context.addInitScript(key=>{
     if(sessionStorage.getItem('journal-corrupt-next')!=='1')return;
     sessionStorage.removeItem('journal-corrupt-next');localStorage.setItem(key,'{broken');
    },KEY);
    await page.evaluate(()=>sessionStorage.setItem('journal-corrupt-next','1'));
    await page.reload();await loaded(page);
    const recovered=await page.evaluate(()=>({seen:persistent.seen,settings:{fov:settings.fov,adaptive:settings.adaptive},status:{...journalStorage},ok:storageOK}));
    assert.deepEqual(recovered.seen,['chromis','turtle']);assert.equal(recovered.settings.fov,82);assert.equal(recovered.settings.adaptive,false);
    assert.equal(recovered.status.source,'backup');assert.equal(recovered.status.recovered,true);assert.equal(recovered.ok,true);
    assert.equal(JSON.parse((await stored(page))[0]).settings.fov,82,'Normal photographic initialization repairs the primary from the loaded fallback');
    await page.reload();await loaded(page);
    assert.deepEqual(await page.evaluate(()=>({seen:persistent.seen,fov:settings.fov,source:journalStorage.source})),{seen:['chromis','turtle'],fov:82,source:'primary'});
    assert.deepEqual(errors,[]);passed('native startup restores an automatically saved journal backup and preserves it across another reload',{device:'desktop'});
   }finally{await context.close();}
  }
  {
   const {context,page,errors}=await session(browser,true);
   try{
    const broken=['{broken','[]'];await seedOnce(context,[[KEY,broken[0]],[BACKUP,broken[1]]]);
    await page.goto(url);await loaded(page);
    assert.equal(await page.evaluate(()=>journalStorage.source),'unavailable');
    assert.equal(await page.evaluate(()=>oceanPhotography.snapshot().durable),true,'The real photographic migration has finished');
    assert.deepEqual(await stored(page),broken,'Photographic initialization must not replace unreadable journal data');
    await page.locator('#startBtn').click();await page.waitForFunction(()=>active);
    await page.locator('#pauseBtn').click();
    assert.equal(await page.evaluate(()=>persist()),false);
    assert.deepEqual(await stored(page),broken,'Starting a dive and its automatic journal saves must preserve unreadable records');
    await page.evaluate(()=>openPanel('voyage'));
    await page.locator('#importSave').setInputFiles(fixturePath);
    await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。',null,{timeout:30000});
    assert.equal(await page.evaluate(()=>journalStorage.loaded&&storageOK),true);
    assert.equal(await page.evaluate(()=>oceanPhotography.snapshot().images),fixture.photography.images.length);
    assert.equal(await page.evaluate(()=>{persistent.seen=['turtle'];settings.fov=77;return persist();}),true);
    await page.reload();await loaded(page);
    assert.deepEqual(await page.evaluate(()=>({seen:persistent.seen,fov:settings.fov,source:journalStorage.source,ok:storageOK})),{seen:['turtle'],fov:77,source:'primary',ok:true});
    assert.equal(await page.evaluate(()=>oceanPhotography.snapshot().images),fixture.photography.images.length);
    assert.deepEqual(errors,[]);passed('unreadable journals survive migration and autosaves until a real file import restores normal saving',{device:'touch',originalImages:fixture.photography.images.length});
   }finally{await context.close();}
  }
  {
   const {context,page,errors}=await session(browser);
   try{
    const log={text:'保留這筆觀察紀錄',date:123456};
    const journal={seen:['chromis'],photos:[],log:[null,42,{text:'invalid date',date:'unknown'},log],settings:{quality:0,adaptive:false,fov:81}};
    await seedOnce(context,[[KEY,JSON.stringify(journal)]]);
    await page.goto(url);await loaded(page);
    const recovered=await page.evaluate(()=>({seen:persistent.seen,log:persistent.log,fov:settings.fov,adaptive:settings.adaptive,source:journalStorage.source,identity:settings===persistent.settings}));
    assert.deepEqual(recovered,{seen:['chromis'],log:[log],fov:81,adaptive:false,source:'primary',identity:true});
    await page.reload();await loaded(page);
    assert.deepEqual(await page.evaluate(()=>({seen:persistent.seen,log:persistent.log,fov:settings.fov,adaptive:settings.adaptive})),{seen:['chromis'],log:[log],fov:81,adaptive:false});
    assert.deepEqual(errors,[]);passed('malformed individual log entries cannot erase valid discoveries or settings during native startup',{device:'desktop'});
   }finally{await context.close();}
  }
  {
   const {context,page,errors}=await session(browser);
   try{
    await page.goto(url);await loaded(page);await page.evaluate(()=>openPanel('voyage'));
    await page.locator('#importSave').setInputFiles(fixturePath);
    await page.waitForFunction(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。',null,{timeout:30000});
    const original=await page.evaluate(()=>oceanPhotography.exportArchive());
    assert.equal(original.images.length,fixture.photography.images.length);
    const sample=original.images[0],metadata=[...original.state.film,...original.state.album].find(photo=>photo.date===sample.date);
    const legacyDate=Math.max(...original.images.map(photo=>photo.date))+1000,badDate=legacyDate+1;
    const journal=JSON.parse((await stored(page))[0]);
    journal.seen=['chromis'];journal.settings={...journal.settings,quality:0,fov:80};
    journal.photos.push({...metadata,date:badDate,url:'data:image/jpeg;base64,broken',pinned:false},{...metadata,date:legacyDate,url:sample.url,pinned:false});
    const raw=JSON.stringify(journal);
    // Existing originals remain in the real IndexedDB library. Only the legacy
    // journal payload is seeded before the next startup reads it.
    await context.addInitScript(({key,raw})=>{
     if(sessionStorage.getItem('journal-legacy-next')!=='1')return;
     sessionStorage.removeItem('journal-legacy-next');localStorage.setItem(key,raw);
    },{key:KEY,raw});
    await page.evaluate(()=>sessionStorage.setItem('journal-legacy-next','1'));
    await page.reload();await loaded(page);
    const state=await page.evaluate(()=>({photo:oceanPhotography.snapshot(),seen:persistent.seen,fov:settings.fov}));
    assert.equal(state.photo.durable,true);assert.equal(state.photo.error,'');assert.deepEqual(state.seen,['chromis']);assert.equal(state.fov,80);
    assert.equal((await stored(page))[1],raw,'The first successful migration save retains the original malformed row in its raw backup');
    const migrated=await page.evaluate(()=>oceanPhotography.exportArchive()),images=new Map(migrated.images.map(photo=>[photo.date,photo.url]));
    assert.equal(images.size,original.images.length+1);assert.equal(images.get(legacyDate),sample.url);assert.equal(images.has(badDate),false);
    for(const photo of original.images)assert.equal(images.get(photo.date),photo.url,'Existing IndexedDB originals survive legacy migration');
    assert.equal(await page.evaluate(()=>oceanPhotography.canCapture()),true,'A malformed legacy neighbor must not disable future photographs');
    await page.reload();await loaded(page);
    const reopened=await page.evaluate(()=>oceanPhotography.exportArchive());
    assert.deepEqual(reopened.images,migrated.images);
    assert.deepEqual(errors,[]);passed('a malformed legacy JPEG is isolated while adjacent valid JPEGs migrate and existing originals survive',{device:'desktop',originalImages:original.images.length,migratedImages:migrated.images.length});
   }finally{await context.close();}
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({url,results},null,2)+'\n');
  console.log(results.length+' native journal recovery groups passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
