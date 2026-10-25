/* Verify the shipped portable HTML still boots under the real file origin. */
'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs')(true));try{
 const page=await browser.newPage({viewport:{width:900,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../standalone.html')).href);
 await page.waitForFunction(()=>window.__ocean?.ready||document.getElementById('saveSessionGate')?.open||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
 const state=await page.evaluate(()=>({ready:window.__ocean?.ready,session:oceanSaveSession.status,message:document.getElementById('saveSessionMessage').textContent,error:document.getElementById('errorMessage').textContent}));
 assert.equal(state.ready,true,JSON.stringify(state));await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();await page.waitForFunction(()=>active);
 assert.equal(await page.evaluate(()=>oceanSaveSession.writable&&saveVoyage()),true);assert.deepEqual(errors,[]);
 console.log('PASS portable file-origin game starts and saves under exclusive ownership');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
