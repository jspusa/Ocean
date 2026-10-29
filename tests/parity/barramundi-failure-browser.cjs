/* Failure injection at the fetch boundary; actual entrance, guide and retry UI. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'qa/parity/v01843-textured-fauna/native-failures.json'),report={status:'running',cases:[]};
const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');let browser;
(async()=>{try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
 for(const [touch,fault,fromGallery]of [[false,'pending',false],[true,'http',false],[false,'pending',true]]){
  const row={profile:touch?'touch':'desktop',fault,fromGallery,checks:[]};report.cases.push(row);save();
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,isMobile:touch});
  try{
   await context.addInitScript(fault=>{const original=window.fetch;window.__fishFault=fault;window.fetch=function(url,...rest){if(String(url).includes('/barramundi/geometry.bin')||String(url).startsWith('assets/barramundi/geometry.bin')){if(window.__fishFault==='pending')return new Promise(()=>{});if(window.__fishFault==='http')return Promise.resolve(new Response('',{status:404}));}return original.call(this,url,...rest);};},fault);
   const page=await context.newPage(),cdp=await context.newCDPSession(page),read=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,userGesture:false,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;},press=s=>touch?page.locator(s).tap():page.locator(s).click();
   const check=(name,value)=>{row.checks.push({name,passed:!!value});save();assert(value,name);};
   await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});if(fromGallery){await read(`for(const id of ['clown','turtle','barramundi'])oceanEcology.state().field[id]={points:15,encounters:2,seconds:0,photos:0};oceanAquarium.state().slots=[{cell:0,species:'barramundi',level:1}];oceanAquarium.enterViewer()`);}else await press('#startBtn');await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'));
   check('fish fetch failure does not block actual entry',await read('ready&&$("loading").classList.contains("hidden")&&(active||oceanAquarium.snapshot().viewing)'));
   // Open the actual guide while the background owner is pending. This must
   // refresh itself after timeout, not leave two permanently disabled buttons.
   await read('openPanel("journal");renderSpecies(SPECIES.findIndex(s=>s.id==="barramundi"))');
   if(fault==='pending')check('pending fish has no actionable navigation',await read('$("findSpecies").disabled&&$("retryFishAsset").disabled'));
   await page.waitForFunction(()=>oceanBarramundi.status(renderer).state==='error',null,{timeout:16000});
   await page.waitForFunction(()=>document.getElementById('retryFishAsset')&&!document.getElementById('retryFishAsset').disabled,null,{timeout:2000});
   check('failed fish remains invisible and unselectable',await read('(()=>{const f=life.find(f=>f.barramundi);return !f.assetReady&&!oceanSelection.valid(f)&&!voyageDestination("habitat:barramundi")&&!oceanAquarium.eligible("barramundi")})()'));
   await read('window.__fishFault=null');await press('#retryFishAsset');await page.waitForFunction(()=>oceanBarramundi.status(renderer).ready,null,{timeout:16000});
   await page.waitForFunction(()=>!document.getElementById('findSpecies').disabled,null,{timeout:2000});
   check('real retry UI replaces failed fish once',await read('life.filter(f=>f.barramundi).length===1&&renderer.batches.filter(b=>b.importedGeometry).length===1&&renderer.gl.getError()===0'));
   row.status='passed';
  }catch(e){row.status='failed';row.failure=e.stack;}finally{await context.close();save();}
 }
 report.status=report.cases.every(r=>r.status==='passed')?'passed':'failed';save();console.log(JSON.stringify(report));if(report.status==='failed')process.exitCode=1;
}finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
