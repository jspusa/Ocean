/* Real production entry and optional imported-fish integration in native Chrome.
 * The close-up and unlocked gallery are explicit disposable QA fixtures. Touch
 * emulation is not physical-phone testing; no frame-rate claim is made here. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),arg=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const url=arg('url','http://127.0.0.1:8765/'),out=path.resolve(root,arg('out','qa/parity/v01843-textured-fauna/native.json'));
const report={url,status:'running',method:'Native Chrome; ordinary click/tap entry and swim, then explicitly placed near-fish camera and unlocked-gallery QA fixtures. No physical-phone or performance claim.',cases:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
let browser;
(async()=>{try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
 for(const touch of [false,true]){
  if(arg('profile','all')!=='all'&&arg('profile')!==(touch?'touch':'desktop'))continue;
  const row={profile:touch?'touch':'desktop',checks:[],errors:[],views:[]};report.cases.push(row);save();
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  try{
   const page=await context.newPage(),cdp=await context.newCDPSession(page),requests=[];
   page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/assets/barramundi/'))requests.push(r.url());});
   const read=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,userGesture:false,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
   const check=(name,ok,detail)=>{row.checks.push({name,passed:!!ok,...(detail?{detail:JSON.parse(JSON.stringify(detail))}:{})});save();assert(ok,name);};
   const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
   await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
   row.boot=await read('({ready,active,asset:oceanBarramundi.status(renderer),audio:oceanAudio.ctx?.state||null,adaptive:settings.adaptive,uid:life.find(f=>f.barramundi)?.uid})');
   check('ready before optional audio or fish requests',!row.boot.active&&row.boot.audio===null&&row.boot.asset.state==='idle'&&requests.length===0,row.boot);
   check('default automatic quality retained',row.boot.adaptive);
   await press('#startBtn');await page.waitForFunction(()=>active);
   const before=await read('player.p.slice()');
   if(touch){const r=await page.locator('#joystick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height*.2}]});await page.waitForTimeout(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');}
   const after=await read('player.p.slice()');check('ordinary swim input moves player',Math.hypot(...after.map((v,i)=>v-before[i]))>.02);
   await page.waitForFunction(()=>['ready','error'].includes(oceanBarramundi.status(renderer).state),null,{timeout:20000});
   row.asset=await read('oceanBarramundi.status(renderer)');check('optional production mesh and three maps become ready',row.asset.ready,row.asset);
   check('only one complete texture profile requested',requests.length===4,requests);
   row.world=await read(`(()=>{const f=life.find(f=>f.barramundi),b=renderer.batches.find(b=>b.instances.includes(f));return {uid:f.uid,scale:f.s,kind:b.kind,material:b.material,triangles:b.count/3,radius:b.radius,contact:animalContactEnvelope(f),program:renderer.surfacePrograms.has('13:18'),shadow:!!renderer.importedShadowProgram,gl:renderer.gl.getError()}})()`);
   check('real source mesh uses optional material and bounded contact',row.world.uid==='barramundi-001'&&row.world.kind===13&&row.world.material===18&&row.world.triangles===3864&&row.world.contact.radius>=row.world.radius&&row.world.gl===0,row.world);
   // Camera fixture only; the animal keeps its actual authored world route.
   await read(`(async()=>{window.__freeze=true;stopAuto();settings.third=false;resetInput();t=40;updateLife(t);const f=life.find(f=>f.barramundi);player.p=[f.p[0],f.p[1]+.15,f.p[2]+1.8];const d=V.sub(f.p,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));cameraCut=true;updateCamera();await renderer.sceneStream?.ready(eye);for(let i=0;i<4;i++){await new Promise(r=>requestAnimationFrame(r));renderer.render(eye,target,t);}return true})()`);
   for(const delta of [0,.4,.8]){await read(`t=${40+delta};updateLife(t);renderer.render(eye,target,t)`);const file=out.replace(/\.json$/,`-${row.profile}-world-${delta}.png`);await page.screenshot({path:file});row.views.push(file);}
   const disc=await read('oceanSelection.disc(life.find(f=>f.barramundi))');
   if(touch)await page.touchscreen.tap(disc.x,disc.y);else await page.mouse.click(disc.x,disc.y);
   check('real pointer or touch selects visible new fish',await read('oceanSelection.target()?.uid')==='barramundi-001');
   await read('window.__freeze=false');await page.waitForTimeout(2600);await read('window.__freeze=true');check('selected observation records species',await read('persistent.seen.includes("barramundi")'));
   await read(`(()=>{const f=life.find(f=>f.barramundi);player.p=[f.p[0]+Math.sin(f.yaw)*1.5,f.p[1]+.12,f.p[2]+Math.cos(f.yaw)*1.5];const d=V.sub(f.p,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));cameraCut=true;updateCamera();renderer.render(eye,target,t)})()`);
   const grade=await read('(()=>{const p=gradePhoto();return {uid:p.subject?.uid,score:p.score}})()');check('photography identifies the rendered fish',grade.uid==='barramundi-001',grade);
   await press('#photoBtn');await page.waitForFunction(()=>!voyage.photoBusy);check('photo is saved with correct individual',await read('oceanFeatures.state("photography").film.some(p=>p.individual==="barramundi-001")'));
   // Explicit unlocked gallery fixture tests real pool/render ownership, not
   // earned progression. Actual world actor and its scale remain untouched.
   await read(`goHome();for(const id of ['clown','turtle','barramundi'])oceanEcology.state().field[id]={points:15,encounters:2,seconds:0,photos:0};oceanAquarium.place('barramundi',0);oceanAquarium.enterViewer();oceanAquarium.focus(0);updateLife(t);updateCamera();renderer.render(eye,target,t);`);
   row.gallery=await read(`(()=>{const a=life.find(f=>f.barramundi),world=renderer.batches.find(b=>b.instances.includes(a)),gallery=renderer.batches.find(b=>b.importedGeometry&&b.instances.some(f=>f.exhibit));return {snapshot:oceanAquarium.snapshot(),scale:gallery?.instances[0].s,shared:world?.vb===gallery?.vb&&world?.tb===gallery?.tb,refs:world?.importedGeometry.refs,gl:renderer.gl.getError()}})()`);
   check('gallery preserves metres and shares complete source geometry',row.gallery.shared&&row.gallery.refs===2&&row.gallery.scale.every(x=>x===1)&&row.gallery.gl===0,row.gallery);
   await page.waitForTimeout(250);await read('updateLife(t);updateCamera();renderer.render(eye,target,t)');
   const galleryFile=out.replace(/\.json$/,`-${row.profile}-gallery.png`);await page.screenshot({path:galleryFile});row.views.push(galleryFile);
   await read('oceanBarramundi.dispose(renderer);updateLife(t);renderer.render(eye,target,t)');
   check('disposal removes world and gallery imported batches',await read('renderer.batches.filter(b=>b.importedGeometry).length')===0);
   check('unavailable asset excluded from all interaction routes',await read('(()=>{const f=life.find(f=>f.barramundi);return !oceanSelection.valid(f)&&!oceanAquarium.eligible("barramundi")&&!voyageDestination("habitat:barramundi")&&gradePhoto().subject!==f})()'));
   await read('oceanBarramundi.retry(renderer)');await read('updateLife(t);updateCamera();renderer.render(eye,target,t)');
   check('retry rebuilds exactly one world and one gallery batch',await read('renderer.batches.filter(b=>b.importedGeometry).length')===2);
   await read('oceanAquarium.leaveViewer();saveVoyage()');await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
   check('saved gallery starts with optional fish idle',await read('oceanBarramundi.status(renderer).state')==='idle');
   await read('oceanAquarium.enterViewer()');await page.waitForFunction(()=>oceanBarramundi.status(renderer).ready,null,{timeout:16000});await page.waitForTimeout(400);
   check('saved exhibit loads from the ship without entering a dive',await read('!active&&oceanAquarium.snapshot().viewing&&renderer.batches.filter(b=>b.importedGeometry).length===2'));
   check('no page or GL errors',row.errors.length===0&&await read('renderer.gl.getError()===0&&!renderer.gl.isContextLost()'),row.errors);
   row.status='passed';
  }catch(e){row.status='failed';row.failure=e.stack;}finally{await context.close();save();}
 }
 report.status=report.cases.length&&report.cases.every(x=>x.status==='passed')?'passed':'failed';save();if(report.status!=='passed')process.exitCode=1;
}finally{await browser?.close();}console.log(JSON.stringify({status:report.status,cases:report.cases.map(x=>({profile:x.profile,status:x.status,failure:x.failure,checks:x.checks.length})),out},null,2));})().catch(e=>{report.status='failed';report.failure=e.stack;save();console.error(e);process.exitCode=1;});
