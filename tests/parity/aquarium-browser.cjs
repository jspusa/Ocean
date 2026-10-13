/* Run from any working directory. Start the local game server separately.
 * node tests/parity/aquarium-browser.cjs [URL] [--touch]
 * Knowledge is seeded as a controlled fixture; this verifies aquarium interaction,
 * real WebGL rendering and lifecycle, not the full process of earning knowledge.
 */
const fs=require('node:fs');
const path=require('node:path');
const {homedir}=require('node:os');
let playwright;
try{playwright=require('playwright')}catch{
 playwright=require(process.env.PLAYWRIGHT_PATH||path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const {chromium}=playwright;
const out=path.resolve(__dirname,'../../qa/parity');
fs.mkdirSync(out,{recursive:true});
const args=process.argv.slice(2),mobile=args.includes('--touch');
const url=new URL(args.find(arg=>!arg.startsWith('--'))||'http://127.0.0.1:8765/');
url.searchParams.set('still','');
(async()=>{
 const checks=[],errors=[];
 const check=(name,ok,detail)=>{checks.push({name,pass:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name,detail||'')};
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const eq=async(name,fn)=>check(name,await page.evaluate(fn));
await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'));await eq('aquarium module registered without GL error',()=>!!voyage.state.features.aquarium&&renderer.gl.getError()===0);await page.locator('#shipResearch [data-feature="aquarium"]').click();check('new game locks enter button',await page.locator('#aquariumEnter').isDisabled());
await page.evaluate(()=>{for(const sp of SPECIES)oceanEcology.state().field[sp.id]={points:14,encounters:2,seconds:20,photos:0};saveVoyage();oceanFeatures.open('aquarium')});await page.locator('#aquariumSpecies').selectOption('tang');await page.locator('#aquariumLevel').selectOption('0');await page.locator('#aquariumPlace').click();await eq('manual species and layer placement through UI',()=>oceanAquarium.state().slots[0].species==='tang'&&oceanAquarium.state().slots[0].level===0);await page.locator('[data-aquarium-cell="5"]').click();await page.locator('#aquariumSpecies').selectOption('ray');await page.locator('#aquariumPlace').click();await eq('placement chooses a different cell',()=>oceanAquarium.state().slots.some(s=>s.cell===5&&s.species==='ray'));await page.locator('#aquariumAuto').click();await eq('auto arrangement obeys actual eligible catalogue and capacity',()=>oceanAquarium.state().slots.length===12&&oceanAquarium.capacity(oceanAquarium.state().slots)===12&&oceanAquarium.state().slots.some(s=>s.species==='pygmy_seahorse'));
await page.evaluate(()=>{window.__beforeWorld=renderer.batches.map(b=>b.visible);window.__beforeWorldCount=renderer.batches.length;window.__beforeFish=life.map(f=>[f.uid,JSON.stringify(f.s),JSON.stringify(f.bioGenes)])});await page.locator('#aquariumEnter').click();await page.waitForTimeout(90);
await page.evaluate(()=>{t=24;updateLife(t);updateCamera();applyVisualSettings();renderer.render(eye,target,t)});await eq('actual scene contains independent exhibit instances and hides world',()=>{const own=renderer.batches.slice(__beforeWorldCount);return oceanAquarium.snapshot().instances===12&&renderer.batches.slice(0,__beforeWorldCount).every(b=>b.visible===false)&&own.filter(b=>b.dynamic).every(b=>b.instances.every(f=>!life.includes(f)))&&renderer.submittedTriangles>100&&renderer.gl.getError()===0});await page.screenshot({path:`${out}/aquarium-${mobile?'touch':'desktop'}-overview.png`});
const animation=await page.evaluate(()=>{const own=renderer.batches.slice(__beforeWorldCount).find(b=>b.dynamic&&b.instances.length),before=own.instances[0].p.slice();updateLife(t+1);return V.dist(before,own.instances[0].p)});check('exhibit fish actually swim',animation>.001,animation);
await page.keyboard.press('Tab');check('Tab stays in visible viewer controls',await page.evaluate(()=>!!document.activeElement.closest('#aquariumViewer')));await page.keyboard.press('Shift+Tab');check('Shift Tab stays in visible viewer controls',await page.evaluate(()=>!!document.activeElement.closest('#aquariumViewer')));
await page.locator('#aquariumFocus').selectOption('0');await page.evaluate(()=>{updateCamera();renderer.render(eye,target,t)});await page.screenshot({path:`${out}/aquarium-${mobile?'touch':'desktop'}-focus.png`});
if(!mobile){const before=await page.evaluate(()=>({...oceanAquarium.state().camera}));await page.mouse.move(650,500);await page.mouse.down();await page.mouse.move(800,550,{steps:6});await page.mouse.up();await page.mouse.wheel(0,-80);const after=await page.evaluate(()=>({...oceanAquarium.state().camera}));check('mouse orbit and wheel change actual viewing camera',after.azimuth!==before.azimuth&&after.distance<before.distance,{before,after});}else{const cdp=await context.newCDPSession(page);const before=await page.evaluate(()=>({...oceanAquarium.state().camera}));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:420,id:1},{x:245,y:420,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:420,id:1},{x:290,y:420,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const after=await page.evaluate(()=>({...oceanAquarium.state().camera}));check('two touch pointers pinch to zoom',after.distance<before.distance,{before,after});}
await page.locator('#aquariumExit').click();await eq('leaving viewer immediately restores every original batch flag',()=>!oceanAquarium.snapshot().viewing&&renderer.batches.slice(0,__beforeWorldCount).every((b,i)=>b.visible===__beforeWorld[i])&&renderer.batches.slice(__beforeWorldCount).every(b=>!b.visible));await eq('world fish traits remain unmodified',()=>life.every((f,i)=>JSON.stringify([f.uid,JSON.stringify(f.s),JSON.stringify(f.bioGenes)])===JSON.stringify(__beforeFish[i])));
await page.evaluate(()=>{oceanAquarium.enterViewer();openPanel('settings')});await eq('panel switch restores scene before another frame',()=>!oceanAquarium.snapshot().viewing&&modal==='settings'&&renderer.batches.slice(0,__beforeWorldCount).every((b,i)=>b.visible===__beforeWorld[i]));await page.evaluate(()=>{oceanAquarium.enterViewer();closePanel()});await eq('closePanel restores scene synchronously',()=>!oceanAquarium.snapshot().viewing&&modal===null&&renderer.batches.slice(0,__beforeWorldCount).every((b,i)=>b.visible===__beforeWorld[i]));
const repeat=await page.evaluate(()=>{const count=renderer.batches.length;for(let i=0;i<5;i++){oceanAquarium.enterViewer();closePanel()}return {before:count,after:renderer.batches.length,error:renderer.gl.getError()}});check('repeated visits do not allocate extra GPU batches',repeat.before===repeat.after&&repeat.error===0,repeat);
await page.evaluate(()=>{oceanAquarium.enterViewer();voyage.state.features.aquarium={schema:1,slots:[{cell:3,species:'whale',level:1}],camera:{azimuth:0,elevation:.1,distance:36,focus:-1}};oceanFeatures.reset()});await eq('reset/import releases aquarium isolation',()=>!oceanAquarium.snapshot().viewing&&renderer.batches.slice(0,__beforeWorldCount).every((b,i)=>b.visible===__beforeWorld[i]));await page.evaluate(()=>{oceanFeatures.open('aquarium');saveVoyage()});await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'));await eq('layout and ecology eligibility survive real reload',()=>oceanAquarium.state().slots[0].species==='whale'&&oceanAquarium.state().slots[0].cell===3&&oceanAquarium.eligible('whale'));
await page.evaluate(()=>{oceanAquarium.enterViewer();oceanAquarium.focus(3);updateLife(t);updateCamera();renderer.render(eye,target,t)});await page.screenshot({path:`${out}/aquarium-${mobile?'touch':'desktop'}-whale.png`});await page.locator('#aquariumFocus').focus();await page.keyboard.press('Escape');await eq('Escape exits viewer even from species select',()=>!oceanAquarium.snapshot().viewing&&modal==='aquarium');await page.locator('#aquariumClear').click();await eq('clear UI persists empty layout',()=>oceanAquarium.state().slots.length===0&&JSON.parse(localStorage.getItem(VOYAGE_KEY)).features.aquarium.slots.length===0);await eq('no overflow at current viewport',()=>document.documentElement.scrollWidth===innerWidth);check('no uncaught browser errors',errors.length===0,errors);
 }catch(error){
  check('browser suite completed',false,error.stack);
 }finally{
  // Always close Chrome, including context/page creation and report-write failures.
  try{
   fs.writeFileSync(path.join(out,`aquarium-${mobile?'touch':'desktop'}-results.json`),JSON.stringify({url:url.href,touch:mobile,checks,errors},null,2));
  }finally{await browser.close()}
 }
 console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
 if(checks.some(c=>!c.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
