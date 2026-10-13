// Real rendered requestAnimationFrame intervals on this machine, not promised FPS.
// node tests/parity/performance.mjs [URL] [--touch]
// Four consecutive 20 s scenes; the last two leave automatic resolution active.
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const touch=process.argv.includes('--touch'),url=new URL(process.argv.slice(2).find(a=>!a.startsWith('--'))||'http://127.0.0.1:8765/');
url.searchParams.delete('still');
const out=resolve(dirname(fileURLToPath(import.meta.url)),'../../qa/parity');
const browser=await pw.chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
 const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1440,height:900},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
 await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'));
 await page.evaluate(()=>$('welcomeAudio').checked=false);await page.locator('#startBtn').click();
 await page.evaluate(()=>{voyage.state.mode='free';settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();stopAuto();player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=-.05;resetInput();});
 for(const scene of ['reef','microcosm','cetacean-adaptive','reef-adaptive']){
  const adaptive=scene.endsWith('-adaptive');
  let fixture={};
  if(scene==='microcosm'){
   const entered=await page.evaluate(()=>{const f=life.find(f=>SPECIES[f.species].id==='pygmy_seahorse'),aim=animalFocusPoint(f);player.p=[aim[0],aim[1]+.22,aim[2]+.8];player.velocity=[0,0,0];player.yaw=0;player.pitch=-.27;eye=player.p.slice();target=aim;renderer.render(eye,target,t);return oceanMicrocosm.enter(f.uid)});
   if(!entered)throw Error('Cannot enter actual near seahorse for performance fixture');
  }else if(adaptive){
   fixture=await page.evaluate(scene=>{
    oceanMicrocosm.exit();closePanel();stopAuto();resetInput();settings.adaptive=true;
    if(window.__freeze||!active)throw Error('Adaptive measurement requires the active animation loop');
    if(scene==='cetacean-adaptive'){
     const actors=life.filter(f=>SPECIES[f.species].id==='orca');if(actors.length!==3)throw Error('Expected three real world orcas');
     const home=[0,1,2].map(i=>actors.reduce((sum,f)=>sum+f.home[i],0)/actors.length);
     // Fit the whole authored patrol range in a stationary ordinary dive camera.
     // Portrait needs more distance; no actor, batch, LOD or water effect is hidden.
     const radius=Math.max(...actors.map(f=>f.radius+SPECIES[f.species].size*.6));
     const aspect=renderer.width/renderer.height,tanY=Math.tan((renderer.fov||69)*Math.PI/360),tanX=tanY*aspect;
     const distance=radius+radius/Math.min(tanX,tanY)*1.06;
     player.p=[home[0],Math.min(-2,home[1]+4),home[2]+distance];player.velocity=[0,0,0];
     const delta=home.map((v,i)=>v-player.p[i]);player.yaw=Math.atan2(delta[0],-delta[2]);player.pitch=Math.atan2(delta[1],Math.hypot(delta[0],delta[2]));cameraCut=true;
     return {kind:'natural world orca patrol',actors:actors.map(f=>({uid:f.uid,home:f.home.slice(),size:SPECIES[f.species].size,radius:f.radius})),camera:player.p.slice(),aim:home,allWorldBatchesPreserved:true};
    }
    player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=-.05;cameraCut=true;
    return {kind:'reef dive',camera:player.p.slice(),allWorldBatchesPreserved:true};
   },scene);
  }
  await page.waitForTimeout(1500);
  const data=await page.evaluate(({adaptive,scene})=>new Promise((resolve,reject)=>{
   const originalRecord=oceanPerf.record,originalPause=oceanPerf.pause,frames=[],batchFlags=renderer.batches.map(b=>b.visible);
   const orcaIndex=SPECIES.findIndex(s=>s.id==='orca'),orcaBatches=renderer.batches.filter(b=>b.kind===9&&b.species===orcaIndex);
   const actors=life.filter(f=>f.species===orcaIndex),ext=renderer.gl.getExtension('WEBGL_debug_renderer_info');
   const snapshot=()=>({adaptive:settings.adaptive,quality:renderer.quality,dynamicScale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaaSamples:renderer.msaaSamples,drawCalls:renderer.drawCalls,submittedTriangles:renderer.submittedTriangles,shadowDraws:renderer.shadowDraws,simulationTime:t,position:player.p.slice(),renderer:ext?renderer.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'not disclosed',glVersion:renderer.gl.getParameter(renderer.gl.VERSION)});
   let previous=0,elapsed=0,done=false,initial,timeout;
   const restore=()=>{oceanPerf.record=originalRecord;oceanPerf.pause=originalPause;clearTimeout(timeout);};
   const fail=error=>{if(done)return;done=true;restore();reject(error);};
   const finish=()=>{
    if(done)return;done=true;restore();
    const times=frames.map(f=>f.ms).sort((a,b)=>a-b),sum=times.reduce((a,b)=>a+b,0);
    const report=adaptive?{version:OPEN_WORLD.version,capturedAt:new Date().toISOString(),durationMs:sum,renderedFrames:frames.length,averageFPS:1000*frames.length/sum,p50FrameMs:times[Math.floor(times.length*.5)],p95FrameMs:times[Math.floor(times.length*.95)],meanCPUFrameMs:frames.reduce((n,f)=>n+f.cpu,0)/frames.length,frameIntervalsMs:frames.map(f=>+f.ms.toFixed(3)),note:'Rendered requestAnimationFrame intervals. Automatic resolution remains active; no benchmark lock, no animation freeze, no GPU timer claim.'}:oceanPerf.lastResult;
    resolve({report,adaptive,initial,final:snapshot(),samples:frames,allBatchFlagsPreserved:renderer.batches.length===batchFlags.length&&renderer.batches.every((b,i)=>b.visible===batchFlags[i]),gl:renderer.gl.getError()});
   };
   // The app's benchmark intentionally locks resolution. Use its unchanged method
   // for the original two baselines; observe live RAF records for adaptive scenes.
   if(adaptive){if(oceanPerf.benchmark||!settings.adaptive){reject(Error('Adaptive controller is locked'));return;}}
   else{oceanPerf.lastResult=null;oceanPerf.start();}
   initial=snapshot();
   oceanPerf.pause=function(){previous=0;return originalPause.call(this)};
   oceanPerf.record=function(ms,cpu){
    try{
     const dt=previous?ms-previous:0;
     const row={ms:dt,cpu:Number.isFinite(cpu)?cpu:0,quality:renderer.quality,scale:renderer.dynamicScale,width:renderer.canvas.width,height:renderer.canvas.height,drawCalls:renderer.drawCalls,submittedTriangles:renderer.submittedTriangles,shadowDraws:renderer.shadowDraws,simulationTime:t};
     if(scene==='cetacean-adaptive'){
      row.orcaSubmitted=orcaBatches.reduce((n,b)=>n+(b.visible?b.drawCount:0),0);
      row.orcaCentersInFrame=actors.reduce((n,f)=>{const p=project(animalFocusPoint(f),renderer.vp);return n+(p[2]>0&&Math.abs(p[0])<=1&&Math.abs(p[1])<=1?1:0)},0);
     }
     originalRecord.call(this,ms,cpu);previous=ms;
     if(dt>0&&Number.isFinite(dt)){frames.push(row);elapsed+=dt;}
     if(adaptive){if(!settings.adaptive||this.benchmark)throw Error('Adaptive collection lost its live controller');if(elapsed>=20000)finish();}
     else if(this.lastResult)finish();
    }catch(error){fail(error);}
   };
   timeout=setTimeout(()=>fail(Error('No complete 20 s rendered interval collection')),45000);
  }),{adaptive,scene});
  results.push({scene,fixture,...data});
  if(!data.report||data.report.renderedFrames<2||data.final.simulationTime<=data.initial.simulationTime||!data.allBatchFlagsPreserved)throw Error('Incomplete live scene: '+scene);
  console.log(scene+': '+data.report.averageFPS.toFixed(2)+' FPS, P95 '+data.report.p95FrameMs.toFixed(2)+' ms, GL '+data.gl+', adaptive '+data.adaptive+', quality '+data.initial.quality+' → '+data.final.quality+', scale '+data.initial.dynamicScale.toFixed(3)+' → '+data.final.dynamicScale.toFixed(3));
 }
 if(errors.length||results.some(r=>r.gl))throw Error('Runtime rendering errors: '+errors.join(';'));
}catch(error){errors.push(error.stack);throw error}
finally{await browser.close();await mkdir(out,{recursive:true});await writeFile(resolve(out,touch?'performance-touch-results.json':'performance-results.json'),JSON.stringify({url:url.href,mode:touch?'touch browser emulation, not a physical phone':'desktop browser',method:'20 s rendered requestAnimationFrame intervals per scene; CPU time reported separately; no GPU timer query or Wii comparison. Ordinary world batch visibility is retained. Submitted instances and projected centres are not an occlusion/visibility verdict.',results,errors},null,2));}
