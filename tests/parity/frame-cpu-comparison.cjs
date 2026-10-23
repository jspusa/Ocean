/* Actual foreground animate() CPU comparison, without GPU rasterization.
 * The render spy isolates simulation/control/feature work; virtual 60 Hz
 * callbacks do not measure rendered FPS or phone performance. Run two fixed
 * checkouts on different local ports, then --before=URL --after=URL.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const urls={before:option('before','http://127.0.0.1:8002/'),after:option('after','http://127.0.0.1:8000/')};
const out=option('out',path.resolve(__dirname,'../../qa/parity/frame-cpu-comparison.json'));
const median=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pages={},contexts=[],errors=[],rows=[];
 try{
  for(const [label,url]of Object.entries(urls)){
   const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1}),page=await context.newPage();contexts.push(context);pages[label]=page;
   page.on('pageerror',e=>errors.push(label+': '+e.message));
   await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,startWithSound:false,reduced:true,third:false}})));
   await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn').click();
   await page.evaluate(()=>{
    window.requestAnimationFrame=()=>0;document.hasFocus=()=>true;window.__freeze=true;
    window.__cpuTime=100000;renderer.render=function(){this.dirty=false;};
    window.__cpuScene=p=>{closePanel();resetInput();stopAuto();active=true;photoOpen=false;modal=null;settings.adaptive=false;player.p=p.slice();player.velocity=[0,0,0];player.yaw=0;player.pitch=0;t=8;lastTime=__cpuTime;simulationAccumulator=0;previousPhysicsPosition=null;cameraCut=true;observationClock=0;hudClock=0;oceanPerf.resetSamples();};
    window.__cpuRun=frames=>{window.__freeze=false;const start=performance.now();for(let i=0;i<frames;i++)animate(__cpuTime+=1000/60);const elapsed=performance.now()-start;window.__freeze=true;return {msPerFrame:elapsed/frames,frames,t,position:player.p.slice()};};
    window.__cpuState=()=>JSON.stringify({t,p:player.p,life:allLife.map(f=>[f.uid,f.p,f.yaw,f.pitch,f.bank,f.effort,f.retreat,f.faunaVisibility]),shoal:shoal.map(f=>[f.uid,f.p,f.yaw,f.pitch,f.bank,f.effort])});
   });
   const meta=await page.evaluate(()=>({compiled:renderer.sceneLoad.compiled,species:SPECIES.length,animals:allLife.length,shoal:shoal.length}));
   assert.equal(meta.compiled,true);assert.equal(meta.species,41);assert.equal(meta.animals,427);assert.equal(meta.shoal,380);
  }
  for(const [scene,p]of [['reef',[0,-8,7]],['offshore',[390,-32,-184]],['hadal',[766,-7000,-120]]]){
   for(const page of Object.values(pages)){await page.evaluate(p=>__cpuScene(p),p);await page.evaluate(()=>__cpuRun(240));}
   const samples={before:[],after:[]};
   for(let round=0;round<8;round++)for(const label of (round%2?['after','before']:['before','after']))samples[label].push((await pages[label].evaluate(()=>__cpuRun(240))).msPerFrame);
   const states={};for(const [label,page]of Object.entries(pages))states[label]=await page.evaluate(()=>__cpuState());
   assert.equal(states.after,states.before,'Exact actor/physics state after '+scene+' frame replay');
   const before=median(samples.before),after=median(samples.after),row={scene,before,after,reductionPercent:(before-after)/before*100,samples,stateSHA256:crypto.createHash('sha256').update(states.before).digest('hex')};rows.push(row);
   console.log('PASS exact '+scene+' state; simulation CPU median '+before.toFixed(3)+' -> '+after.toFixed(3)+' ms/frame ('+row.reductionPercent.toFixed(1)+'% reduction)');
  }
 }finally{for(const c of contexts)await c.close();await browser.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({method:'Two real foreground browser contexts, actual animate(), fixed 60 Hz virtual steps and a render spy. All actors/features/physics retained; alternating 8 rounds after warmup. CPU costs only; no rendered FPS, GPU-time or physical-device claim.',urls,rows,errors},null,2));}
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
