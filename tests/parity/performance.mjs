// Real requestAnimationFrame collection on this machine, not a promised FPS.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const browser=await pw.chromium.launch({channel:'chrome',headless:true});const errors=[],results=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]||'http://127.0.0.1:8765/');await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});await page.evaluate(()=>$('welcomeAudio').checked=false);await page.locator('#startBtn').click();
 await page.evaluate(()=>{settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();stopAuto();player.p=[0,-8,7];player.velocity=[0,0,0];player.yaw=0;player.pitch=-.05;resetInput();});
 for(const scene of ['reef','microcosm']){
  if(scene==='microcosm'){
   const entered=await page.evaluate(()=>{const f=life.find(f=>SPECIES[f.species].id==='pygmy_seahorse'),aim=animalFocusPoint(f);player.p=[aim[0],aim[1]+.22,aim[2]+.8];player.velocity=[0,0,0];player.yaw=0;player.pitch=-.27;eye=player.p.slice();target=aim;renderer.render(eye,target,t);return oceanMicrocosm.enter(f.uid)});
   if(!entered)throw Error('Cannot enter actual near seahorse for performance fixture');
  }
  await page.waitForTimeout(1500);await page.evaluate(()=>{oceanPerf.lastResult=null;oceanPerf.start()});await page.waitForFunction(()=>!!oceanPerf.lastResult,{timeout:45000});
  const data=await page.evaluate(()=>({report:oceanPerf.lastResult,gl:renderer.gl.getError()}));results.push({scene,...data});console.log(scene+': '+data.report.averageFPS.toFixed(2)+' FPS, P95 '+data.report.p95FrameMs.toFixed(2)+' ms, GL '+data.gl);
 }
 if(errors.length||results.some(r=>r.gl))throw Error('Runtime rendering errors: '+errors.join(';'));
}finally{await browser.close();await mkdir('qa/parity',{recursive:true});await writeFile('qa/parity/performance-results.json',JSON.stringify({results,errors},null,2));}
