import {createRequire} from 'node:module';import {homedir} from 'node:os';import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const mobile=process.argv.includes('--mobile'),url=process.argv.slice(2).find(x=>!x.startsWith('--'))||'http://127.0.0.1:8765/';
const browser=await pw.chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1}),page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name)};const eq=async(name,fn)=>check(name,await page.evaluate(fn));
try{
 await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});await page.evaluate(()=>{window.__freeze=true;$('welcomeAudio').checked=false});
 await eq('one actual named research vessel loads from compiled scene',()=>renderer.sceneLoad.compiled&&renderer.batches.filter(b=>b.sceneRole==='research-vessel').length===1);
 await page.locator('#shipResearch [data-feature="navigation"]').click();check('new journey offers home and six gated destinations',await page.locator('[data-mooring]').count()===7&&await page.locator('[data-mooring="east"]').isDisabled());
 await eq('locked mooring rejects direct request too',()=>!oceanNavigation.move('east')&&oceanNavigation.snapshot().mooring==='home');
 await page.evaluate(()=>{voyage.state.completed=['arrival'];oceanNavigation.feature.renderPanel('navigation')});await page.locator('[data-mooring="west"]').click();
 await eq('move updates actual original mesh, shared origin and stored selection',()=>{const s=oceanNavigation.snapshot();return s.mooring==='west'&&s.boat[0]===-94&&JSON.stringify(s.mesh)===JSON.stringify(s.boat)&&JSON.parse(localStorage.getItem(VOYAGE_KEY)).features.navigation.mooring==='west'});
 await eq('ship camera follows actual moved boat',()=>{shipCamera();return V.dist(target,OPEN_WORLD.boat)<4&&V.dist(eye,OPEN_WORLD.boat)<28});
 await page.locator('#closePanel').click();await page.locator('#startBtn').click();await page.waitForFunction(()=>$('welcome').classList.contains('hidden'));
 await eq('dive begins next to chosen vessel rather than the old anchorage',()=>Math.hypot(player.p[0]+94,player.p[2]+59)<12&&player.p[1]<0);
 await eq('exploration trail begins at the selected boat without recording the old spawn',()=>{const trail=voyage.state.features.exploration.trail;return trail.length>0&&V.dist(trail.at(-1).p,player.p)<.01});
 await eq('cannot move boat during an active dive',()=>!oceanNavigation.move('home')&&oceanNavigation.snapshot().mooring==='west');
 await eq('journey boundary is centered on selected mooring',()=>{const p=collide([OPEN_WORLD.boat[0]+210,-5,OPEN_WORLD.boat[2]]);return Math.hypot(p[0]-OPEN_WORLD.boat[0],p[2]-OPEN_WORLD.boat[2])<=180.001});
 await eq('reset position uses current boat entry',()=>{player.p=collide([30,-9,-30]);jumpTo(8);return V.dist(player.p,oceanNavigation.entry())<.01&&!auto});
 await page.evaluate(()=>{updateCamera();oceanFeatures.call('afterCamera',0);applyVisualSettings();renderer.render(eye,target,t);openPanel('map')});await eq('actual sea chart renders moved vessel and range',()=>{drawMap();return !!$('mapCanvas')&&renderer.gl.getError()===0});await page.waitForTimeout(350);await page.screenshot({path:`qa/parity/${mobile?'touch':'desktop'}-navigation-map.png`});await page.locator('#closePanel').click();
 await page.evaluate(()=>{voyage.state.mode='free'});await eq('free mode preserves unrestricted continuous sea',()=>{const p=collide([150,-5,-59]);return Math.abs(p[0]-150)<1&&Math.hypot(p[0]-OPEN_WORLD.boat[0],p[2]-OPEN_WORLD.boat[2])>180});
 await page.locator('#homeBtn').click();await page.locator('#debriefClose').click();await page.locator('#shipResearch [data-feature="navigation"]').click();await page.locator('[data-mooring="offshore"]').click();
 await eq('free mode moves to offshore without forged story rewards',()=>oceanNavigation.snapshot().mooring==='offshore'&&!voyage.state.completed.includes('archive'));
 await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});await page.evaluate(()=>{window.__freeze=true;$('welcomeAudio').checked=false});
 await eq('reload restores boat transform, shared origin and saved camera view',()=>{shipCamera();return oceanNavigation.snapshot().mooring==='offshore'&&OPEN_WORLD.boat[2]===-208&&oceanNavigation.snapshot().mesh[2]===-208&&V.dist(target,OPEN_WORLD.boat)<4});
 await eq('completed voyage return target follows the offshore boat and survives save parsing',()=>{voyage.state.completed=ORDERS.slice(0,-1).map(o=>o.id);voyage.state.whaleWatch=4;evaluateOrders();paintVoyageHUD();const destination=voyageDestination();return voyage.state.waypoint==='boat'&&destination.z===-208&&$('waypointName').textContent==='研究船'&&readVoyage(voyage.state).waypoint==='boat'&&LANDMARKS.find(l=>l.id==='anchorage').z===43});
 await page.locator('#shipResearch [data-feature="navigation"]').click();await page.locator('[data-mooring="home"]').click();await page.locator('#closePanel').click();await page.locator('#startBtn').click();await page.waitForFunction(()=>$('welcome').classList.contains('hidden'));
 await eq('return journey entry remains consistent after multiple moves',()=>Math.hypot(player.p[0]+24,player.p[2]-43)<12&&oceanNavigation.snapshot().mesh[0]===-24);
 await eq('navigation does not create duplicate vessel geometry',()=>renderer.batches.filter(b=>b.sceneRole==='research-vessel').length===1&&renderer.gl.getError()===0);
 check('no uncaught errors',errors.length===0,errors);
}catch(e){check('suite completed',false,e.stack)}finally{await mkdir('qa/parity',{recursive:true});await writeFile(`qa/parity/${mobile?'touch':'desktop'}-navigation.json`,JSON.stringify({url,mobile,checks,errors},null,2));await browser.close()}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);if(checks.some(c=>!c.pass))process.exitCode=1;
