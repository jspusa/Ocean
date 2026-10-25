/* Native Chrome window focus lifecycle, no synthetic DOM events or clock edits.
 * Chrome may keep background RAF alive: zero-RAF suspension is covered by the
 * separate production-listener CPU regression, not claimed by this test. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),out=option('out','qa/parity/v01812-performance-browser.json');
const checks=[],errors=[];let fatal=null;
(async()=>{const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  // Playwright forces every page to remain focused/visible by default. Disable
  // that adapter override before measuring real Chrome tab lifecycle events.
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});await page.bringToFront();
  const press=async s=>touch?page.locator(s).tap():page.locator(s).click();await press('#startBtn');await page.waitForFunction(()=>active&&!modal);await press('#fieldToolsBtn');await press('#settingsBtn');await press('.settings-advanced > summary');await press('#benchSettings');await page.waitForTimeout(1700);
  await page.evaluate(()=>{window.__lifecycleEvidence={frames:0,events:[]};const read=()=>{__lifecycleEvidence.frames++;requestAnimationFrame(read)};requestAnimationFrame(read);for(const type of ['visibilitychange','freeze','resume'])document.addEventListener(type,e=>__lifecycleEvidence.events.push({type:e.type,trusted:e.isTrusted,at:performance.now(),hidden:document.hidden}));for(const type of ['blur','focus'])window.addEventListener(type,e=>__lifecycleEvidence.events.push({type:e.type,trusted:e.isTrusted,at:performance.now(),hidden:document.hidden}));});
  const snapshot=()=>page.evaluate(()=>({now:performance.now(),frames:__lifecycleEvidence.frames,events:__lifecycleEvidence.events.slice(),benchmark:oceanPerf.benchmark?{activeMs:oceanPerf.benchmark.activeMs,frames:oceanPerf.benchmark.frames.length,max:Math.max(0,...oceanPerf.benchmark.frames.map(x=>x.ms))}:null,result:oceanPerf.lastResult,scale:renderer.dynamicScale,adaptive:settings.adaptive,hidden:document.hidden,focused:document.hasFocus(),gl:renderer.gl.getError()}));
  const before=await snapshot(),other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
  await other.waitForTimeout(7000);await page.bringToFront();await page.waitForTimeout(650);
  const after=await snapshot();checks.push({name:(touch?'touch':'desktop')+' lifecycle raw observation',before,after});console.log(JSON.stringify({profile:touch?'touch':'desktop',before,after}));assert(after.benchmark,'Returning must not complete 20 active seconds');
  assert(after.benchmark.activeMs-before.benchmark.activeMs<2000,'Background time must not enter active benchmark');assert(after.benchmark.max<2000,'Trace must not contain seven-second suspension');assert(after.adaptive&&after.scale===before.scale);assert.equal(after.gl,0);
  const blur=after.events.find(e=>e.type==='blur'&&e.trusted),focus=after.events.find(e=>e.type==='focus'&&e.trusted);assert(blur&&focus&&focus.at-blur.at>=6500,'Real window departure and return must span the inactive interval');
  checks.push({name:(touch?'touch':'desktop')+' native background/resume excludes suspended benchmark time',pass:true,before,after});console.log('PASS '+checks.at(-1).name);
  await page.waitForFunction(()=>!!oceanPerf.lastResult,null,{timeout:35000});const final=await snapshot();assert(final.result.durationMs>=20000&&final.result.durationMs<22000);assert(final.result.frameIntervalsMs.every(ms=>ms<2000));assert(final.adaptive&&final.gl===0);checks.push({name:(touch?'touch':'desktop')+' finishes the full active benchmark after resume',pass:true,final});console.log('PASS '+checks.at(-1).name);await context.close();
 }}catch(error){fatal=error.stack||String(error);console.error(fatal);process.exitCode=1;}finally{await browser.close();fs.writeFileSync(out,JSON.stringify({status:fatal?'failed':'passed',url,checks,errors,fatal},null,2));}assert.deepEqual(errors,[]);
})();
