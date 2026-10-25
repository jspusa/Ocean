/* Native context loss and the player's recovery buttons. Touch emulation is
 * layout/input coverage, not evidence from a physical phone GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true)),results=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},hasTouch:touch,isMobile:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
  await page.waitForFunction(()=>window.__ocean?.active);
  const before=await page.evaluate(()=>{const ext=renderer.gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('Native context-loss test extension unavailable');const p=player.p.slice();ext.loseContext();return p;});
  await page.locator('#errorBox').waitFor({state:'visible'});
  assert.equal(await page.locator('#errorSafeRestart').count(),1,'Context-loss screen needs a usable low-power restart');
  assert.match(await page.locator('#errorMessage').innerText(),/已保存/);
  // A real IndexedDB API failure must be visible above the opaque recovery UI.
  await page.evaluate(()=>{window.__savedGetAll=IDBObjectStore.prototype.getAll;IDBObjectStore.prototype.getAll=function(){throw new DOMException('Injected unavailable photograph store','InvalidStateError');};});
  await page.locator('#errorExportSave').click();
  await page.waitForFunction(()=>document.getElementById('errorRecoveryStatus')?.textContent.includes('未能匯出'),null,{timeout:5000});
  assert(await page.locator('#errorRecoveryStatus').isVisible());
  await page.screenshot({path:path.resolve(__dirname,'../../qa/parity/recovery-'+(touch?'touch':'desktop')+'.png')});
  await page.evaluate(()=>{IDBObjectStore.prototype.getAll=window.__savedGetAll;delete window.__savedGetAll;});
  const download=page.waitForEvent('download');await page.locator('#errorExportSave').click();const exported=await download;
  const save=JSON.parse(fs.readFileSync(await exported.path(),'utf8'));assert.equal(save.format,'return-blue/save');assert(save.voyage.resume.p.every(Number.isFinite));
  await page.locator('#errorSafeRestart').click();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  const after=await page.evaluate(()=>({quality:renderer.quality,adaptive:settings.adaptive,position:voyage.state.resume.p,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),url:location.href}));
  assert.equal(after.quality,0);assert.equal(after.adaptive,true);assert.equal(after.gl,0);assert.equal(after.lost,false);assert(!after.url.includes('safeGraphics'),'One-launch fallback flag must be consumed');
  assert(Math.hypot(...after.position.map((v,i)=>v-before[i]))<1,'Recovery preserves the last swimming position');
  assert.deepEqual(errors,[]);results.push({touch,before,after,exportedBytes:fs.statSync(await exported.path()).size});await context.close();
 }
 }finally{await browser.close();fs.mkdirSync(path.resolve(__dirname,'../../qa/parity'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../qa/parity/display-recovery.json'),JSON.stringify(results,null,2));}
 console.log('PASS desktop and touch context-loss save export and automatic low-power restart');
})().catch(error=>{console.error(error);process.exitCode=1;});
