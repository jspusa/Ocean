/* Current visible UI, connected guided route and real pointer/touch selection.
 * Long travel uses the production 120Hz swimmer + 30Hz animals/camera and 12Hz
 * observation ticks, not position fixtures. A separate interval uses real RAF.
 * Screenshots use native WebGL and resident streamed meshes. Simulated touch is
 * not a physical-phone or frame-rate certification. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'../../qa/parity');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],journeys=[];
const modes=[{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
function check(mode,name,pass,detail){checks.push({mode:mode.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode.id+' '+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
async function press(page,mode,selector){if(mode.touch)await page.locator(selector).tap();else await page.locator(selector).click();}
async function point(page,mode,p){const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p);if(hit!=='ocean')throw Error('World pointer intercepted by '+hit+' '+JSON.stringify(p));if(mode.touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function travel(page,mode,id){
 await press(page,mode,'#fieldToolsBtn');
 check(mode,'main menu exposes deep sea without opening advanced tools ('+id+')',await page.locator('#diveRecords [data-feature="deepsea"]').isVisible());
 await press(page,mode,'#diveRecords [data-feature="deepsea"]');
 const button=page.locator('[data-deepsea-station="'+id+'"]');
 check(mode,'station card explains cancellable observation stops ('+id+')',(await button.locator('..').innerText()).includes('隨時接手探索'));
 await press(page,mode,'[data-deepsea-station="'+id+'"]');
 await page.waitForFunction(id=>oceanDeepsea.snapshot().travelTarget===id&&!modal,id);
}
async function run(browser,mode){
 const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,isMobile:mode.touch,hasTouch:mode.touch}),page=await context.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));
 const consoleErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{adaptive:true,startWithSound:false,reduced:true,third:false,lookLock:false}})));
 try{
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.bringToFront();
  await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());
  await page.locator('#loading').waitFor({state:'hidden'});await press(page,mode,'#startBtn');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
  check(mode,'normal start retains automatic quality and real compiled encounter population',await page.evaluate(()=>settings.adaptive&&renderer.sceneLoad.compiled&&renderer.sceneLoad.streamed&&OceanTrench.encounters.length===9&&OceanTrench.encounters.every(e=>life.some(f=>f.encounterId===e.id&&SPECIES[f.species].id===e.species))));
  await page.evaluate(()=>{
   window.__deepTick=0;window.__deepMetrics={seconds:0,distance:0,maxStep:0,maxApproachSpeed:0,holds:[]};window.__deepLastHold=null;
   // No player/camera/animal transform assignment: these are the actual runtime
   // update functions used by animate(), advanced at its documented cadence.
   window.__deepAdvance=(seconds=5)=>{for(let n=0;n<Math.ceil(seconds*120);n++){
    const before=player.p.slice(),approach=oceanDeepsea.snapshot().approaching;updatePlayer(1/120);t+=1/120;diveSeconds+=1/120;__deepTick++;
    const step=V.dist(before,player.p);__deepMetrics.seconds+=1/120;__deepMetrics.distance+=step;__deepMetrics.maxStep=Math.max(__deepMetrics.maxStep,step);if(approach)__deepMetrics.maxApproachSpeed=Math.max(__deepMetrics.maxApproachSpeed,V.len(player.velocity));
    if(__deepTick%4===0){updateLife(t);updateCamera(1/30);oceanFeatures.call('afterCamera',1/30);}
    if(__deepTick%10===0){observe(1/12);voyageTick(1/12);}
    const s=oceanDeepsea.snapshot();if(s.holding&&s.encounter!==__deepLastHold){__deepLastHold=s.encounter;__deepMetrics.holds.push({id:s.encounter,p:player.p.slice(),seconds:__deepMetrics.seconds});return s;}if(!s.travelTarget)return s;
   }return oceanDeepsea.snapshot();};
   window.__deepFrame=async()=>{updateCamera(1/30);oceanFeatures.call('afterCamera',0);applyVisualSettings();if(renderer.sceneStream)await renderer.sceneStream.ready(eye);renderer.forceShadow=true;if(renderer.render(eye,target,t)===false)throw Error('Resident deep scene render deferred');observe(.2);updateHUD();checkLandmarks();oceanDeepsea.feature.paintHUD();return {compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),lamp:renderer.lamp,eye:eye.slice(),p:player.p.slice()};};
   window.__deepSubject=id=>{const s=oceanDeepsea.snapshot(),candidates=s.holding?life.filter(f=>f.encounterId===s.encounter):life.filter(f=>SPECIES[f.species].trench&&OceanTrench.habitats[SPECIES[f.species].id].station===id);
    return candidates.map(f=>{const d=oceanSelection.disc(f),p=project(animalFocusPoint(f),renderer.vp),sp=SPECIES[f.species];return {uid:f.uid,encounter:f.encounterId||null,species:sp.id,name:sp.name,valid:oceanSelection.valid(f),picked:oceanSelection.pick(d.x,d.y)?.uid||null,ndc:p,x:d.x,y:d.y,distance:V.dist(player.p,animalFocusPoint(f)),bodyPixels:sp.size*innerHeight/(2*V.dist(eye,animalFocusPoint(f))*Math.tan((renderer.photoFov||renderer.fov)*Math.PI/360)),resident:renderer.batches.some(b=>b.instances.includes(f)&&b.visible!==false&&b.vao&&b.drawCount>0)};}).filter(f=>f.valid&&f.picked===f.uid).sort((a,b)=>a.distance-b.distance)[0]||null;
   };
  });
  await travel(page,mode,'midwater');
  const before=await page.evaluate(()=>({p:player.p.slice(),t,ready:renderer.sceneStream?.waitStarted||0}));
  await page.evaluate(()=>{lastTime=performance.now();window.__freeze=false;});
  await page.waitForFunction(b=>t>b.t+.5&&V.dist(b.p,player.p)>2,before,{timeout:30000});await page.waitForTimeout(700);
  const actual=await page.evaluate(b=>({distance:V.dist(b.p,player.p),seconds:t-b.t,travel:oceanDeepsea.snapshot().travelTarget,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,gl:renderer.gl.getError(),focus:document.hasFocus()}),before);
  check(mode,'actual RAF drives a continuous guided swim with streamed native rendering',actual.distance>2&&actual.seconds>.5&&actual.travel==='midwater'&&actual.compiled&&actual.streamed&&actual.gl===0&&actual.focus,actual);
  if(mode.touch)await press(page,mode,'#upBtn');else{await page.keyboard.down('KeyW');await page.waitForTimeout(120);await page.keyboard.up('KeyW');}
  await page.waitForFunction(()=>!auto&&!oceanDeepsea.snapshot().travelTarget);
  await page.evaluate(()=>{window.__freeze=true;});
  check(mode,'real manual movement immediately cancels the guided route',await page.evaluate(()=>!auto&&!oceanDeepsea.snapshot().travelTarget&&!follow));
  const encountered=new Set();
  for(const id of ['midwater','slope','hadal']){
   await travel(page,mode,id);await page.evaluate(()=>{__deepLastHold=null;__deepMetrics={seconds:0,distance:0,maxStep:0,maxApproachSpeed:0,holds:[]};});
   let sim=0;
   for(;sim<420;sim+=5){
    const s=await page.evaluate(()=>__deepAdvance(5));
    if(s.holding&&!encountered.has(s.encounter)){
     const frame=await page.evaluate(()=>__deepFrame()),fish=await page.evaluate(id=>__deepSubject(id),id);encountered.add(s.encounter);
     check(mode,'actual corridor stop is in-frame, selectable and streamed: '+s.encounter,!!fish&&fish.encounter===s.encounter&&fish.resident&&frame.gl===0&&!frame.lost,{frame,fish});
     check(mode,'guided stop leaves identification to the player: '+s.encounter,await page.evaluate(()=>!oceanSelection.target()&&!focusFish&&$('focusCard').classList.contains('hidden')));
     await page.screenshot({path:path.join(out,'deepsea-current-'+mode.id+'-'+s.encounter+'.png')});
    }
    if(!s.travelTarget)break;
   }
   const metrics=await page.evaluate(()=>JSON.parse(JSON.stringify(__deepMetrics)));journeys.push({mode:mode.id,station:id,...metrics});
   check(mode,'guided '+id+' finishes within a bounded continuous trip',sim<420&&metrics.maxStep<=260/120+.001&&metrics.maxApproachSpeed<=2.2+.001&&metrics.maxApproachSpeed>0,metrics);
   const frame=await page.evaluate(()=>__deepFrame()),fish=await page.evaluate(id=>__deepSubject(id),id);
   check(mode,'real '+id+' arrival is close enough to notice and select the original-sized animal',!!fish&&fish.resident&&fish.bodyPixels>=12&&frame.lamp&&frame.gl===0&&!frame.lost,{frame,fish});
   check(mode,'arrival has no automatic name card, selection, or unlocked subject',await page.evaluate(f=>!oceanSelection.target()&&!focusFish&&$('focusCard').classList.contains('hidden')&&!persistent.seen.includes(f.species),fish));
   await page.screenshot({path:path.join(out,'deepsea-current-'+mode.id+'-'+id+'-arrival.png')});
   await point(page,mode,fish);await page.evaluate(()=>{for(let i=0;i<18;i++){observe(.1);oceanEcology.hooks.tick(.1);}updateHUD();});
   check(mode,'actual '+(mode.touch?'tap':'click')+' selects '+id+' UID and records its ecology entry',await page.evaluate(f=>oceanSelection.target()?.uid===f.uid&&persistent.seen.includes(f.species)&&oceanEcology.knowledge(oceanEcology.state().field[f.species])>=1,fish));
   const layout=await page.evaluate(()=>{const r=$('focusCard').getBoundingClientRect();return {card:r.toJSON(),centre:document.elementFromPoint(innerWidth/2,innerHeight/2)?.id,visible:!$('focusCard').classList.contains('hidden')};});
   check(mode,'selected '+id+' card stays reachable without covering the viewing centre',layout.visible&&layout.centre==='ocean'&&layout.card.left>=0&&layout.card.right<=mode.width+1&&layout.card.top>=0&&layout.card.bottom<=mode.height+1,layout);
   await page.screenshot({path:path.join(out,'deepsea-current-'+mode.id+'-'+id+'-selected.png')});await press(page,mode,'#clearSelection');await page.evaluate(()=>observe(.2));
  }
  check(mode,'connected journeys actually stop at all three authored corridor encounters',['giant-squid-pass','pelican-pass','mud-fauna-pass'].every(id=>encountered.has(id)),[...encountered]);
  check(mode,'automatic quality remains enabled and final WebGL has no failures',await page.evaluate(()=>settings.adaptive&&renderer.sceneLoad.compiled&&renderer.sceneLoad.streamed&&renderer.gl.getError()===0&&!renderer.gl.isContextLost())&&!errors.some(e=>e.mode===mode.id)&&consoleErrors.length===0,consoleErrors);
 }catch(error){errors.push({mode:mode.id,message:error.stack});checks.push({mode:mode.id,name:'suite completed',pass:false,detail:error.message});console.error('FAIL '+mode.id+' '+error.message);await page.screenshot({path:path.join(out,'deepsea-current-'+mode.id+'-failure.png')}).catch(()=>{});await page.evaluate(()=>({p:player.p,t,active,modal,auto,freeze:window.__freeze,deep:oceanDeepsea.snapshot(),stream:{wait:renderer.sceneStream?.waitStarted,stats:renderer.sceneStream?.stats},console:!!renderer})).then(d=>fs.writeFileSync(path.join(out,'deepsea-current-'+mode.id+'-failure.json'),JSON.stringify(d,null,2))).catch(()=>{});
 }finally{await context.close();}
}
(async()=>{const browser=await pw.chromium.launch(require('./browser-launch.cjs')(true));try{for(const mode of modes)await run(browser,mode);}finally{await browser.close();fs.writeFileSync(path.join(out,'deepsea-current-browser.json'),JSON.stringify({url,gpuMode:'native Chrome',method:'Visible menu actions, actual RAF trip and real movement cancellation; long connected trips advance production 120Hz swimmer,30Hz life/camera,12Hz observation, without position fixtures; resident native WebGL screenshots and real pointer/taps. No physical phone or FPS claim.',checks,journeys,errors},null,2));}if(errors.length||checks.some(c=>!c.pass))process.exitCode=1;})().catch(error=>{console.error(error);process.exitCode=1;});
