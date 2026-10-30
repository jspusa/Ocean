/* Bounded whole-animal native inspection. Root runs this after the full build,
 * separately from GPU timing. Cameras move; actual compiled animals do not. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(v=>v.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const profile=option('profile','desktop'),out=path.resolve(root,option('out','qa/parity/v01846-material/whole-'+profile+'.json'));
const ids=['coelacanth-002','pelican_eel-001','humpback_anglerfish-001'];
assert(['desktop','touch'].includes(profile),'Run one native profile at a time');
const report={status:'running',profile,expectedVersion:option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim()),method:'Normal new-dive click/tap followed by frozen current-world inspection. Existing compiled animals, seed, time, homes, scales and geometry stay unchanged. Only camera, photographic FOV/near plane and lamp are selected. Six views per animal: side, front, opposite side, identical side with lamp off, and actual LOD boundary minus/plus 0.7 m. Far black skin may naturally be dark; no brightness gate, exposure increase or isolation of the scene is used. One additional angler macro fixture explicitly positions only the player/camera at a clear nearby approach, then uses the production microcosm and visible orbit/zoom controls. This is controlled inspection, not a natural journey, GPU timing or physical-phone evidence. PNGs require visual review.',sourceSHA256:Object.fromEntries(['src/engine.js','src/abyss_fauna.js','src/microcosm.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),views:[],micro:null,errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const imageFile=(data,label)=>{const file=out.replace(/\.json$/,'')+'-'+label+'.png';fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));return file;};
(async()=>{let browser,page;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const touch=profile==='touch';
  page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.delete('still');report.url=url.href;save();
  await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  report.initial=await page.evaluate(()=>({version:document.documentElement.dataset.version,active,adaptive:settings.adaptive,quality:renderer.quality,compiled:renderer.sceneLoad.compiled,streamed:!!renderer.sceneStream,seed:oceanEncounters.snapshot().seed,dives:voyage.state.dives}));
  assert.equal(report.initial.version,report.expectedVersion);assert.equal(report.initial.active,false);assert(report.initial.adaptive&&report.initial.compiled&&report.initial.streamed);assert.equal(report.initial.quality,touch?1:2);
  if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
  await page.waitForFunction(()=>active&&diveSeconds>.15&&document.getElementById('welcome').classList.contains('hidden'));
  report.entry=await page.evaluate(ids=>{
   const gl=renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info'),snapshot=oceanEncounters.snapshot();
   if(!settings.adaptive||snapshot.deepVersion!==1)throw Error('Normal entry did not retain auto quality and new-dive deep encounters');
   const entry={seed:snapshot.seed,dives:voyage.state.dives,time:t,adaptive:settings.adaptive,quality:renderer.quality,dynamicScale:renderer.dynamicScale,player:player.p.slice(),hardware:ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)};
   window.__freeze=true;settings.adaptive=false;
   const actors=ids.map(uid=>{
    const f=life.find(a=>a.uid===uid),choice=snapshot.deep.find(a=>a.uid===uid),rule=oceanEncounters.rules.deepHabitats.find(a=>a.uid===uid);
    if(!f||!rule||!choice||choice.choice<0||choice.fallback||f.encounterPresent===false||f.ecologyPresent===false)throw Error('Actual present encounter missing: '+uid);
    const node=renderer.sceneStream.index.nodes.indexOf(f),batches=renderer.batches.filter(b=>b.instances.includes(f)),declared=renderer.sceneStream.index.batches.filter(b=>b.instanceIDs.includes(node));
    if(node<0||!renderer.sceneStream.index.life.includes(node)||batches.length!==2||declared.length!==batches.length)throw Error('Actual compiled animal ownership differs: '+uid);
    for(const b of batches){const mesh=renderer.sceneStream.index.meshes[b.streamMesh];if(!b.dynamic||b.kind!==10||b.species!==f.species||!mesh||b.count!==mesh.indexCount||!renderer.sceneStream.meshes[b.streamMesh].batches.includes(b))throw Error('Actual compiled batch differs: '+uid);}
    const high=batches.find(b=>!(b.minDistance>0)),low=batches.find(b=>b.minDistance>0);if(!high||!low||high.maxDistance!==low.minDistance)throw Error('Expected two adjoining real animal LODs');
    return {f,rule,node,batches,high,low,choice:choice.choice};
   });
   const signature=()=>JSON.stringify({seed:oceanEncounters.snapshot().seed,time:t,actors:actors.map(({f})=>({uid:f.uid,p:f.p,home:f.home,center:f.center,s:f.s,yaw:f.yaw,pitch:f.pitch,phase:f.phase,orbit:f.orbit,encounterPresent:f.encounterPresent,ecologyPresent:f.ecologyPresent})),lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,quality:renderer.quality,scale:renderer.dynamicScale});
   const original=signature(),originalPlayer=JSON.stringify(player.p),near=.02;
   const worldCamera=(a,vector,distance)=>{const v=V.mul(V.norm(vector),distance),c=Math.cos(a.f.yaw||0),s=Math.sin(a.f.yaw||0);return [a.f.p[0]+c*v[0]+s*v[2],a.f.p[1]+v[1],a.f.p[2]-s*v[0]+c*v[2]];};
   const cameraEvidence=(a,camera)=>{
    const aim=animalFocusPoint(a.f),bodies=[];for(const f of allLife){if(f.ecologyPresent===false||f.assetReady===false||V.dist(camera,f.p)>Math.max(...f.s)*4+4)continue;if(V.dist(camera,f.p)<=animalContactEnvelope(f).radius+.03)bodies.push(f.uid||'unnamed');}
    return {camera,rock:OceanRockContact.overlaps(camera,.03),region:OceanRegions.pointBlocked(camera,.03),ground:!!OceanTrench.groundContact(camera,.03),nearClip:V.dist(camera,a.f.p)<=a.rule.bodyRadius+near+.04,bodies,sightBlocked:blocked(camera,aim,.001)||!OceanRegions.pathClear(camera,aim,.001)};
   };
   const legal=e=>!e.rock&&!e.region&&!e.ground&&!e.nearClip&&!e.bodies.length&&!e.sightBlocked;
   const choose=(a,vectors,distances)=>{const attempts=[];for(const vector of vectors){const group=distances.map(d=>cameraEvidence(a,worldCamera(a,vector,d)));attempts.push({vector,group});if(group.every(legal))return {vector,cameras:group.map(e=>e.camera),attempts};}throw Error('No legal requested camera for '+a.f.uid+': '+JSON.stringify(attempts));};
   const packed=a=>{const origin=renderer.renderOrigin||[0,0,0];return a.batches.map(b=>{const indices=[];for(let i=0;i<b.drawCount;i++){const k=i*24;if([0,1,2].every(j=>b.data[k+j]===Math.fround(a.f.p[j]-origin[j])&&b.data[k+4+j]===Math.fround(a.f.s[j]))&&b.data[k+3]===Math.fround(a.f.yaw||0)&&b.data[k+10]===Math.fround(a.f.phase||0))indices.push(i);}return {lod:b===a.high?'high':'low',streamMesh:b.streamMesh,compiledNode:a.node,indexCount:b.count,vertexCount:b.vertexCount,resident:!!b.vao,drawCount:b.drawCount,packedActorIndices:indices,minDistance:b.minDistance||0,maxDistance:b.maxDistance};});};
   const capture=async(a,name,camera,lamp,extra={})=>{
    if(signature()!==original)throw Error('Animal/time/seed/material settings changed before '+name);
    const aim=animalFocusPoint(a.f).slice(),bounds=SPECIES[a.f.species].modelBounds.size.map((v,i)=>v*a.f.s[i]),distance=V.dist(camera,aim),span=Math.max(...bounds),aspect=renderer.width/renderer.height;
    renderer.photoNear=near;renderer.photoFov=clamp(2*Math.atan(span/(2*distance*.72*Math.min(aspect,1)))*180/Math.PI,8,100);renderer.lamp=lamp;renderer.forceShadow=true;
    await renderer.sceneStream.ready(camera);for(let i=0;i<3;i++)if(renderer.render(camera,aim,t)===false)throw Error('Frame deferred '+name);
    const batches=packed(a);if(!batches.some(b=>b.resident&&b.packedActorIndices.length))throw Error('Actual target not submitted: '+a.f.uid+'/'+name);
    const error=gl.getError();if(error||gl.isContextLost())throw Error('Native GL failure '+error+' at '+name);
    if(signature()!==original||JSON.stringify(player.p)!==originalPlayer)throw Error('Whole view changed actor/world/player');
    return {uid:a.f.uid,name,camera,aim,actorDistance:V.dist(camera,a.f.p),focusDistance:distance,fov:renderer.photoFov,near,lamp,batches,quality:renderer.quality,dynamicScale:renderer.dynamicScale,resolution:[gl.drawingBufferWidth,gl.drawingBufferHeight],time:t,gl:error,png:renderer.canvas.toDataURL('image/png'),...extra};
   };
   window.__abyssWhole={actors,signature,original,originalPlayer,worldCamera,cameraEvidence,legal,choose,packed,capture,near,plans:new Map()};return entry;
  },ids);
  assert(report.entry.hardware&&!/software|swiftshader|llvmpipe/i.test(report.entry.hardware));assert.notEqual(report.entry.seed,report.initial.seed);assert.equal(report.entry.dives,report.initial.dives+1);save();
  for(const uid of ids){
   const names=await page.evaluate(uid=>{
    const f=__abyssWhole,a=f.actors.find(a=>a.f.uid===uid),size=Math.max(...SPECIES[a.f.species].modelBounds.size.map((v,i)=>v*a.f.s[i])),distance=Math.max(.55,size*1.6,a.rule.bodyRadius+f.near+.12),plans=new Map();
    // Keep each named anatomical side. A nearer legal camera is preferable
    // to changing an opposite/front view into another side after an obstacle.
    const chooseNear=vectors=>{const attempts=[];for(const d of [distance,Math.max(.35,size*.95,a.rule.bodyRadius+f.near+.12)])for(const vector of vectors){const evidence=f.cameraEvidence(a,f.worldCamera(a,vector,d));attempts.push({vector,distance:d,evidence});if(f.legal(evidence))return {vector,cameras:[evidence.camera],attempts};}throw Error('No legal anatomical near view '+uid+': '+JSON.stringify(attempts));};
    const side=chooseNear([[.08,.18,1],[-.08,.34,1],[.25,.50,1]]),front=chooseNear([[1,.06,.02],[1,.18,.06],[1,.32,-.07]]),opposite=chooseNear([[.08,.18,-1],[-.08,.34,-1],[.25,.50,-1]]);
    for(const [name,choice]of [['side',side],['front',front],['opposite',opposite]])plans.set(name,{camera:choice.cameras[0],lamp:true,extra:{cameraChoice:choice}});
    plans.set('lamp-off',{camera:side.cameras[0],lamp:false,extra:{sameCameraAs:'side'}});
    const scale=renderer.mobile?(renderer.quality===0?.64:.82):(renderer.quality===0?.75:1),boundary=a.high.maxDistance*scale,vectors=[];
    for(const y of [.2,.6,1.0])for(let i=0;i<12;i++){const angle=i*Math.PI/6;vectors.push([Math.sin(angle),y,Math.cos(angle)]);}
    const choice=f.choose(a,vectors,[boundary-.7,boundary+.7]);
    for(const [i,name]of ['lod-below','lod-above'].entries()){
     plans.set(name,{camera:choice.cameras[i],lamp:true,extra:{boundary,lodScale:scale,cameraChoice:choice,expectedLOD:i?'low':'high'}});
    }
    f.plans.set(uid,plans);return [...plans.keys()];
   },uid);
   for(const name of names){
    report.stage=uid+'/'+name;save();const row=await page.evaluate(async({uid,name})=>{const f=__abyssWhole,a=f.actors.find(a=>a.f.uid===uid),p=f.plans.get(uid).get(name);return f.capture(a,name,p.camera,p.lamp,p.extra);},{uid,name});
    row.file=imageFile(row.png,row.uid+'-'+row.name);delete row.png;report.views.push(row);save();
    if(row.expectedLOD){const drawn=row.batches.filter(b=>b.packedActorIndices.length);assert.equal(drawn.length,1,'Exactly one real LOD must be submitted');assert.equal(drawn[0].lod,row.expectedLOD,'Actual LOD submission differs');}
   }
   console.log('PASS '+profile+' '+uid+' six whole-animal views');
  }
  report.stage='macro-entry';save();report.micro=await page.evaluate(async()=>{
   const f=__abyssWhole,a=f.actors.find(a=>a.f.uid==='humpback_anglerfish-001'),aim=animalFocusPoint(a.f).slice(),attempts=[];let pose=null;
   // This explicit player-only approach fixture is separate from the camera-
   // only views above. Check the complete diver envelope before positioning it.
   for(const distance of [1.45,1.60]){for(const vector of [[.28,.22,1],[.28,.22,-1],[1,.22,.15],[-1,.22,.15],[.2,.5,1]]){
    const p=f.worldCamera(a,vector,distance),d=V.sub(aim,p),candidate={p,yaw:Math.atan2(d[0],-d[2]),pitch:Math.atan2(d[1],Math.hypot(d[0],d[2])),scale:diverBatch?.instances[0]?.s?.[0]||.85},volumes=OceanDiverContact.volumes(candidate),clear=volumes.every(s=>s.p[1]>=groundHeight(s.p[0],s.p[2])+s.r&&s.p[1]<=-.05-s.r&&!OceanTrench.groundContact(s.p,s.r)&&!OceanRegions.pointBlocked(s.p,s.r)&&!OceanRockContact.overlaps(s.p,s.r));
    const evidence=f.cameraEvidence(a,p);attempts.push({pose:candidate,bodyClear:clear,camera:evidence});if(clear&&f.legal(evidence)&&V.dist(p,aim)<=speciesTraits(a.f.species).observeDistance){pose=candidate;break;}
   }if(pose)break;}
   if(!pose)throw Error('No clear full-diver angler macro approach');
   const before={p:player.p.slice(),yaw:player.yaw,pitch:player.pitch};player.p=pose.p.slice();player.yaw=pose.yaw;player.pitch=pose.pitch;player.velocity=[0,0,0];OceanDiverContact.reset();resetInput();stopAuto();eye=pose.p.slice();target=aim.slice();renderer.photoNear=.02;renderer.photoFov=35;renderer.lamp=true;
   await renderer.sceneStream.ready(eye);if(renderer.render(eye,target,t)===false)throw Error('Macro approach frame deferred');
   if(!oceanMicrocosm.start()||!oceanMicrocosm.enter(a.f.uid))throw Error('Production microcosm refused actual nearby angler');
   oceanMicrocosm.feature.afterCamera(0);await renderer.sceneStream.ready(eye);if(renderer.render(eye,target,t)===false)throw Error('Macro lens frame deferred');
   if(f.signature()!==f.original)throw Error('Macro entry changed real fish/world identity');
   const originalPlayer=JSON.stringify({p:player.p,yaw:player.yaw,pitch:player.pitch});
   window.__abyssMacro={a,originalPlayer,before};return {scope:'Controlled player-only approach; production microcosm start/enter and native lens. This is not a continuous swim to the animal.',approach:pose,attempts,playerBefore:before,initial:{snapshot:oceanMicrocosm.snapshot(),eye:eye.slice(),target:target.slice(),fov:renderer.photoFov,exposure:renderer.exposure,batches:f.packed(a),gl:renderer.gl.getError()},png:renderer.canvas.toDataURL('image/png')};
  });
  report.micro.initial.file=imageFile(report.micro.png,'angler-micro-initial');delete report.micro.png;save();
  report.stage='macro-controls';save();
  await page.locator('#microLensControls').waitFor({state:'visible'});
  if(touch)await page.locator('#microOrbitRight').tap();else await page.locator('#microOrbitRight').click();
  const slider=await page.locator('#microZoom').boundingBox();assert(slider&&slider.width>=44&&slider.height>=44,'Visible zoom slider must remain usable');
  if(touch)await page.touchscreen.tap(slider.x+slider.width*.2,slider.y+slider.height*.5);else await page.mouse.click(slider.x+slider.width*.2,slider.y+slider.height*.5);
  report.micro.controls=await page.evaluate(async()=>{
   const f=__abyssWhole,m=__abyssMacro;oceanMicrocosm.feature.afterCamera(0);await renderer.sceneStream.ready(eye);if(renderer.render(eye,target,t)===false)throw Error('Macro control frame deferred');
   if(f.signature()!==f.original||JSON.stringify({p:player.p,yaw:player.yaw,pitch:player.pitch})!==m.originalPlayer)throw Error('Macro controls moved the fish or diver');
   return {snapshot:oceanMicrocosm.snapshot(),eye:eye.slice(),target:target.slice(),fov:renderer.photoFov,exposure:renderer.exposure,batches:f.packed(m.a),gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),controls:[...document.querySelectorAll('#microLensControls button,#microLensControls input')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),viewport:[innerWidth,innerHeight],png:renderer.canvas.toDataURL('image/png')};
  });
  const m=report.micro;assert.equal(m.initial.gl,0);assert.equal(m.controls.gl,0);assert.equal(m.controls.lost,false);assert.equal(m.controls.snapshot.uid,'humpback_anglerfish-001');assert.notDeepEqual(m.controls.eye,m.initial.eye,'Visible orbit control did not move the production lens');assert(m.controls.fov>=12&&m.controls.fov<=55&&m.controls.fov!==m.initial.fov,'Visible zoom control did not change the production FOV');assert.equal(m.controls.exposure,m.initial.exposure);
  for(const step of [m.initial,m.controls])assert(step.batches.some(b=>b.resident&&b.packedActorIndices.length),'Macro actor was not actually submitted');
  if(touch)assert(m.controls.controls.every(c=>c.width>=44&&c.height>=44&&c.left>=0&&c.top>=0&&c.right<=m.controls.viewport[0]+1&&c.bottom<=m.controls.viewport[1]+1),'Macro touch controls exceed viewport');
  m.controls.file=imageFile(m.controls.png,'angler-micro-controls');delete m.controls.png;const ui=out.replace(/\.json$/,'')+'-angler-micro-ui.png';await page.screenshot({path:ui});m.uiFile=ui;
  report.stage='macro-exit';save();if(touch)await page.locator('#microExit').tap();else await page.locator('#microExit').click();
  report.final=await page.evaluate(()=>({unchanged:__abyssWhole.signature()===__abyssWhole.original,microClosed:!oceanMicrocosm.isViewing(),gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),seed:oceanEncounters.snapshot().seed,time:t}));
  assert(report.final.unchanged&&report.final.microClosed);assert.equal(report.final.gl,0);assert.equal(report.final.lost,false);assert.equal(report.views.length,18);assert.deepEqual(report.errors,[]);report.status='passed-controlled-whole-views-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;save();if(page&&!page.isClosed())try{const file=out.replace(/\.json$/,'')+'-failure.png';await page.screenshot({path:file,timeout:3000});report.failureImage=file;}catch(e){report.failureCaptureError=e.message;}}
 finally{save();await browser?.close();}
})();
