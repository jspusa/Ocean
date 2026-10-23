/* Original reef fish integration: real software WebGL, pointer selection,
 * discovery, shutter/IndexedDB reload and independent aquarium exhibits.
 * Camera fixtures visit actual authored habitats; no actors are relocated.
 * This is deterministic browser QA, not a physical-device performance claim. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let pw;for(const candidate of [process.env.PLAYWRIGHT_PATH,'playwright','/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)){try{pw=require(candidate);break;}catch{}}
if(!pw)throw Error('Playwright is required');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'qa/parity'),url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';fs.mkdirSync(out,{recursive:true});
const ids=['lyretail_anthias','banggai_cardinal','longnose_butterfly','fire_goby'],results=[],errors=[];
const check=(mode,name,pass,detail)=>{results.push({mode,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode+' '+name);assert.ok(pass,name+' '+JSON.stringify(detail));};
(async()=>{const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const mode of (process.argv.includes('--buffers-only')?[{id:'buffers',width:384,height:288,touch:false}]:[{id:'desktop',width:720,height:540,touch:false},{id:'touch',width:390,height:640,touch:true}])){
 const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,isMobile:mode.touch,hasTouch:mode.touch}),page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));
 try{
  await page.addInitScript(()=>{if(!localStorage.getItem('return-blue.shilang.v1'))localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,startWithSound:false,reduced:true,lookLock:false,third:false}}));});
  await page.goto(url+'?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#startBtn')[mode.touch?'tap':'click']();
  check(mode.id,'old streamed world loads with exactly four species / 64 authored reef fish',await page.evaluate(()=>renderer.sceneLoad.compiled&&SPECIES.length===41&&life.filter(f=>f.reefFish).length===64&&renderer.batches.filter(b=>b.sceneRole==='reef-fish-expansion').length===8));
  const buffers=await page.evaluate(()=>{const gl=renderer.gl,oldVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING),unique=new Set(),result={vertices:0,indices:0,instances:0,batches:[]};gl.bindVertexArray(null);for(const b of renderer.batches.filter(b=>b.sceneRole==='reef-fish-expansion')){const row={species:SPECIES[b.species].id,lod:b.minDistance?'far':'near'};for(const [key,target,total]of [['vb',gl.ARRAY_BUFFER,'vertices'],['eb',gl.ELEMENT_ARRAY_BUFFER,'indices'],['ib',gl.ARRAY_BUFFER,'instances']]){if(unique.has(b[key]))continue;unique.add(b[key]);gl.bindBuffer(target,b[key]);row[key]=gl.getBufferParameter(target,gl.BUFFER_SIZE);result[total]+=row[key];}result.batches.push(row);}gl.bindVertexArray(oldVAO);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);result.geometry=result.vertices+result.indices;result.total=result.geometry+result.instances;result.gl=gl.getError();return result;});
  check(mode.id,'new mesh GPU buffers are measured without GL error',buffers.gl===0&&buffers.batches.length===8&&buffers.geometry>0&&buffers.total<3*1024*1024,buffers);
  if(process.argv.includes('--buffers-only')){
   const lod=await page.evaluate(ids=>{settings.third=false;settings.lookLock=false;settings.lamp=false;const rows=[];for(const id of ids){updateLife(8);const f=life.find(f=>SPECIES[f.species].id===id),bs=renderer.batches.filter(b=>b.sceneRole==='reef-fish-expansion'&&b.instances.includes(f)),near=bs.find(b=>!b.minDistance),far=bs.find(b=>b.minDistance);for(const d of [7.2,7.9,8.1,8.8]){const p=V.add(f.p,[0,0,d]);__renderView(p,f.p,8);const planes=renderer.frustum(renderer.vp);renderer.updateBatch(near,eye,planes);renderer.updateBatch(far,eye,planes);const has=b=>Array.from({length:b.drawCount},(_,i)=>i*24).some(i=>Math.hypot(b.data[i]-(f.p[0]-renderer.renderOrigin[0]),b.data[i+1]-(f.p[1]-renderer.renderOrigin[1]),b.data[i+2]-(f.p[2]-renderer.renderOrigin[2]))<.0001);rows.push({id,d,near:has(near),far:has(far),gl:renderer.gl.getError()});}}return rows;},ids);
   check(mode.id,'all original new meshes render across near/far transition without a submission gap',lod.every(r=>r.gl===0&&(r.near||r.far))&&ids.every(id=>lod.some(r=>r.id===id&&r.d===7.2&&r.near&&!r.far)&&lod.some(r=>r.id===id&&r.d===8.8&&!r.near&&r.far)),lod);
   continue;
  }
  await page.evaluate(()=>{
   settings.third=false;settings.lookLock=false;settings.sound=false;settings.lamp=false;stopAuto();resetInput();
   window.__reefFrame=()=>{cameraCut=true;updateCamera(.1);applyVisualSettings();renderer.forceShadow=true;renderer.render(eye,target,t);updateHUD();};
   window.__reefStep=seconds=>{for(let i=0;i<Math.ceil(seconds/.1);i++){t+=.1;observe(.1);oceanFeatures.call('tick',.1);}__reefFrame();};
   window.__reefView=async id=>{
    oceanSelection.clear();oceanEcology.setTool(null);renderer.photoFov=30;renderer.photoNear=.01;updateLife(8);t=8;
    const candidates=life.filter(f=>SPECIES[f.species].id===id);let chosen;
    for(const f of candidates){const aim=animalFocusPoint(f),distance=Math.max(.38,SPECIES[f.species].size*2.8);for(const side of [1,-1]){
     const p=V.add(aim,[Math.sin(f.yaw)*distance*side,distance*.12,Math.cos(f.yaw)*distance*side]);
     if(!chosen&&p[1]<-.5&&p[1]>groundHeight(p[0],p[2])+.05&&!blocked(p,aim,.001))chosen={f,p,aim};
    }}if(!chosen)throw Error('No clear authored habitat view '+id);
    await __prepareView(chosen.p,chosen.aim,8);__reefFrame();window.__reefActor=chosen.f;
    return {uid:chosen.f.uid,id,p:chosen.f.p,home:chosen.f.home,eye:eye.slice(),ground:groundHeight(chosen.f.p[0],chosen.f.p[2]),gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),size:chosen.f.s[0]};
   };
   window.__reefPoint=()=>{const p=project(animalFocusPoint(__reefActor),renderer.vp);return{x:(p[0]*.5+.5)*innerWidth,y:(.5-p[1]*.5)*innerHeight};};
  });
  for(const id of ids){
   const view=await page.evaluate(id=>__reefView(id),id);check(mode.id,id+' actual habitat/model renders without GL error',view.gl===0&&!view.lost,view);
   const point=await page.evaluate(()=>__reefPoint());if(mode.touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   const selected=await page.evaluate(()=>({id:SPECIES[oceanSelection.target()?.species]?.id,uid:oceanSelection.target()?.uid}));check(mode.id,id+' real pointer selects a new fish',selected.id===id,selected);
   await page.evaluate(()=>__reefStep(1.7));const learned=await page.evaluate(id=>({seen:persistent.seen.includes(id),level:oceanEcology.knowledge(oceanEcology.state().field[id])}),id);check(mode.id,id+' real observation unlocks journal/field record',learned.seen&&learned.level>=1,learned);
   await page.screenshot({path:path.join(out,'reef-fish-'+mode.id+'-'+id+'.png'),timeout:90000});
  }
  await page.evaluate(()=>{$('photoResult').classList.add('hidden');lastPhoto=0;});const before=await page.evaluate(()=>oceanPhotography.snapshot().film);await page.locator('#photoBtn')[mode.touch?'tap':'click']();await page.waitForFunction(n=>!voyage.photoBusy&&oceanPhotography.snapshot().film===n+1,before);
  const photo=await page.evaluate(()=>oceanFeatures.state('photography').film.at(-1));check(mode.id,'real shutter saves new fish UID and graded photograph',photo.individual?.startsWith('fire_goby-')&&photo.grade>0,photo);
  check(mode.id,'saved JPEG bytes decode',await page.evaluate(async()=>{const a=await oceanPhotography.exportArchive(),p=a.images.at(-1),im=new Image();im.src=p.url;await im.decode();return im.width>0&&im.height>0&&p.url.startsWith('data:image/jpeg;base64,');}));
  await page.evaluate(()=>{oceanSelection.clear();saveVoyage();persist();});await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  check(mode.id,'reload preserves all four field discoveries and unchanged photo identity',await page.evaluate(({ids,date,uid})=>ids.every(id=>persistent.seen.includes(id)&&oceanEcology.knowledge(oceanEcology.state().field[id])>=1)&&oceanFeatures.state('photography').film.some(p=>p.date===date&&p.individual===uid),{ids,date:photo.date,uid:photo.individual}));
  // Aquarium eligibility is a labelled fixture: level two is injected only
  // after the real first discoveries above, to exercise all four source meshes.
  const aquarium=await page.evaluate(ids=>{for(const id of ids)oceanEcology.state().field[id]={points:14,encounters:2,seconds:20,photos:0};const homes=life.filter(f=>f.reefFish).map(f=>({uid:f.uid,home:f.home.slice(),p:f.p.slice()}));const placed=ids.map((id,i)=>oceanAquarium.place(id,i));const entered=oceanAquarium.enterViewer();t=24;updateLife(t);oceanAquarium.focus(1);updateCamera();oceanFeatures.call('afterCamera',0);applyVisualSettings();renderer.render(eye,target,t);return{placed,entered,snapshot:oceanAquarium.snapshot(),sameWorld:homes.every(row=>{const f=life.find(f=>f.uid===row.uid);return row.home.every((v,i)=>v===f.home[i]);}),gl:renderer.gl.getError()};},ids);
  check(mode.id,'all four species create independent, rendered aquarium exhibits',aquarium.placed.every(Boolean)&&aquarium.entered&&aquarium.snapshot.instances===4&&aquarium.sameWorld&&aquarium.gl===0,aquarium);
  await page.waitForTimeout(350);await page.evaluate(()=>{updateCamera();oceanFeatures.call('afterCamera',0);renderer.render(eye,target,t);});await page.screenshot({path:path.join(out,'reef-fish-'+mode.id+'-aquarium.png'),timeout:90000});
 }catch(e){errors.push({mode:mode.id,message:e.stack});try{await page.screenshot({path:path.join(out,'reef-fish-'+mode.id+'-failure.png'),timeout:30000});}catch{}throw e;}finally{await context.close();}
}}finally{await browser.close();fs.writeFileSync(path.join(out,process.argv.includes('--buffers-only')?'reef-fish-buffers-lod.json':'reef-fish-browser.json'),JSON.stringify({results,errors},null,2));}
assert.equal(errors.length,0,'browser runtime errors');console.log('PASS all original reef-fish browser integration checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
