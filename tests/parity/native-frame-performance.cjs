/* Actual application RAF / simulation / WebGL at fixed resolution, separate
 * from GPU timer queries. Touch is emulation on this host's GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(key,fallback)=>process.argv.find(x=>x.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const beforeURL=option('before','http://127.0.0.1:8766/'),afterURL=option('after','http://127.0.0.1:8765/');
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true)),rows=[],errors=[];
 try{for(const touch of [false,true])for(const variant of ['before','after','after','before']){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto((variant==='before'?beforeURL:afterURL)+'?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
  await page.evaluate(async()=>{settings.adaptive=false;await __prepareView([0,-8,7],[0,-8,-10],8);});await page.waitForFunction(()=>renderer.sceneStream.jobs.size===0);await page.bringToFront();
  const row=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],old=oceanPerf.record,start=performance.now(),animal=allLife[0].p.slice(),initialFrame=renderer.frame;
   oceanPerf.record=function(ms,cpu){old.call(this,ms,cpu);if(performance.now()-start<2000)return;frames.push({ms,cpu});if(performance.now()-start<12000)return;
    window.__freeze=true;oceanPerf.record=old;const times=frames.slice(1).map((f,i)=>f.ms-frames[i].ms),sorted=times.slice().sort((a,b)=>a-b),cpus=frames.map(f=>f.cpu).sort((a,b)=>a-b),mean=times.reduce((s,x)=>s+x,0)/times.length,g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info');
    resolve({frames:times.length,meanFrameMs:mean,averageFPS:1000/mean,p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],cpuMedian:cpus[Math.floor(cpus.length*.5)],cpuP95:cpus[Math.floor(cpus.length*.95)],frameAdvance:renderer.frame-initialFrame,animalMoved:V.dist(animal,allLife[0].p)>.001,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,gl:g.getError(),renderer:debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',frameIntervalsMs:times});
   };window.__freeze=false;lastTime=performance.now();
  }));
  assert.equal(row.gl,0);assert.equal(row.scale,1);assert(row.animalMoved);assert(row.frameAdvance>100);assert(!/swiftshader|llvmpipe|software/i.test(row.renderer));
  rows.push({touch,variant,...row});console.log(JSON.stringify({touch,variant,fps:row.averageFPS,p95:row.p95,p99:row.p99,cpuMedian:row.cpuMedian}));await context.close();
 }
 for(const touch of [false,true]){const group=rows.filter(r=>r.touch===touch);for(const row of group)for(const key of ['resolution','msaa','quality','scale'])assert.deepEqual(row[key],group[0][key]);}
 }finally{await browser.close();const out=path.resolve(__dirname,'../../qa/parity/native-frame-performance.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({beforeURL,afterURL,method:'Actual unfrozen game RAF with native GPU, fixed reef camera start, full animal/simulation updates, adaptive off. ABBA new-context runs per profile; 2s warmup then 10s sampling. No GPU timer instrumentation. Touch emulates a phone viewport on the same computer; no physical phone/battery claim.',rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
