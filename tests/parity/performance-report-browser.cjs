/* Real UI and Blob download with controlled interval samples. This tests report
 * identity/percentiles/export, not hardware FPS or a real 20-second benchmark. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[],errors=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:touch,hasTouch:touch,acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,startWithSound:false,reduced:true}})));
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
  const initial=await page.evaluate(()=>{window.__freeze=true;settings.adaptive=false;return {version:document.documentElement.dataset.version,worldVersion:OPEN_WORLD.version,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],frame:renderer.frame};});
  await page.locator('#pauseBtn').click();await page.locator('#panelBody #settingsBtn').click();
  await page.locator('.settings-advanced > summary').click();await page.locator('#benchSettings').click();
  assert.equal(await page.evaluate(()=>oceanPerf.benchmark!==null),true,'The existing settings action must begin recording');
  assert.equal(await page.locator('#perfPanel').isVisible(),true);
  const controlled=await page.evaluate(()=>{
   let now=performance.now();oceanPerf.record(now,1.25);
   for(let i=0;i<100;i++){now+=i===99?299:199;oceanPerf.record(now,1.25);}
   return {report:oceanPerf.lastResult,finished:oceanPerf.benchmark===null,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],frame:renderer.frame,gl:renderer.gl.getError()};
  });
  assert.equal(controlled.finished,true);assert.equal(controlled.gl,0);assert.equal(controlled.frame,initial.frame,'Report generation may not render extra frames');
  for(const key of ['quality','scale','resolution'])assert.deepEqual(controlled[key],initial[key],key+' must remain unchanged');
  const report=controlled.report;assert.equal(report.version,initial.version);assert.equal(report.worldVersion,initial.worldVersion);assert.notEqual(report.version,report.worldVersion);
  assert.equal(report.renderedFrames,100);assert.equal(report.durationMs,20000);assert.equal(report.p50FrameMs,199);assert.equal(report.p95FrameMs,199);assert.equal(report.p99FrameMs,299);
  assert.equal(report.meanCPUFrameMs,1.25);assert.deepEqual(report.frameIntervalsMs,[...Array(99).fill(199),299]);
  const pending=page.waitForEvent('download');await page.locator('#perfExport').click();const download=await pending;
  assert.equal(download.suggestedFilename(),'Ocean-v'+initial.version+'-device-benchmark.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),report,'Actual downloaded Blob must contain the complete report');
  rows.push({touch,initial,filename:download.suggestedFilename(),report});console.log('PASS '+(touch?'touch':'desktop')+' actual benchmark UI/download: app '+report.version+', world '+report.worldVersion+', controlled P99 '+report.p99FrameMs+' ms');await context.close();
 }}finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/performance-report-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({url,method:'Real DOM controls and Blob downloads; controlled synthetic intervals only, not physical-device FPS or a timed play session.',rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
