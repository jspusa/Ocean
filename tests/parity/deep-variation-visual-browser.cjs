/* Authoring: node --check tests/parity/deep-variation-visual-browser.cjs
 * Root alone runs native GPU jobs, one profile at a time. This enters through
 * the real button and then inspects untouched current animals with a camera.
 * It is not a natural journey, animation timing test, or phone FPS benchmark. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(v=>v.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const profile=option('profile','desktop'),out=path.resolve(root,option('out','qa/parity/v01845-deep-variation/visual-'+profile+'.json'));
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const ids=['coelacanth-002','pelican_eel-001','pelican_eel-002','pelican_eel-003','humpback_anglerfish-001','humpback_anglerfish-002'];
assert(['desktop','touch'].includes(profile),'Run exactly one desktop/touch profile per invocation');
const report={status:'running',profile,expectedVersion,method:'Installed headless Chrome native GPU; real #startBtn click/tap generates the saved new-dive seed. The first live gameplay frames establish animal poses before freezing existing simulation and adaptation for inspection. No actor, home, seed, scale, time, geometry, material, lighting preset, exposure or fog edits. Only inspection camera, photo FOV and lamp are selected. Touch is computer emulation, not a physical-phone or performance claim. PNGs require human review.',sourceSHA256:Object.fromEntries(['src/encounters.js','src/deepsea.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),views:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const touch=profile==='touch';
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push(error.message));
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.delete('still');report.url=url.href;save();
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'));
  report.initial=await page.evaluate(()=>{
   const gl=renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
   return {version:document.documentElement.dataset.version,ready,active,adaptive:settings.adaptive,quality:renderer.quality,dynamicScale:renderer.dynamicScale,resolution:[gl.drawingBufferWidth,gl.drawingBufferHeight],hardware:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,compiled:renderer.sceneLoad.compiled,streamed:!!renderer.sceneStream,seed:oceanEncounters.snapshot().seed,deepVersion:oceanEncounters.snapshot().deepVersion,dives:voyage.state.dives,time:t};
  });
  assert.equal(report.initial.version,expectedVersion);assert.equal(report.initial.active,false);assert.equal(report.initial.adaptive,true);
  assert.equal(report.initial.quality,touch?1:2);assert(report.initial.compiled&&report.initial.streamed,'Actual compiled regional scene is required');
  assert(report.initial.hardware&&!/software|swiftshader|llvmpipe/i.test(report.initial.hardware),'Native GPU is required');save();
  if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
  await page.waitForFunction(()=>active&&diveSeconds>.15&&document.getElementById('welcome').classList.contains('hidden'),null,{timeout:30000});
  report.entry=await page.evaluate(ids=>{
   const snapshot=oceanEncounters.snapshot();
   if(snapshot.deepVersion!==1)throw Error('Real new-dive entry did not enable deep version 1');
   if(!settings.adaptive)throw Error('Default auto quality was disabled before inspection');
   const record={seed:snapshot.seed,deepVersion:snapshot.deepVersion,dives:voyage.state.dives,time:t,diveSeconds,adaptiveBeforeFreeze:settings.adaptive,quality:renderer.quality,dynamicScale:renderer.dynamicScale,player:player.p.slice(),deep:snapshot.deep};
   // Freeze the current natural pose; do not set t or call updateLife/pose APIs.
   window.__freeze=true;settings.adaptive=false;
   const actors=ids.map(uid=>{
    const f=life.find(a=>a.uid===uid),choice=snapshot.deep.find(a=>a.uid===uid),catalogue=oceanEncounters.rules.deepHabitats.find(a=>a.uid===uid);
    if(!f||!choice||!catalogue||choice.choice<0||choice.fallback||f.encounterPresent===false||f.ecologyPresent===false)throw Error('New-dive actor unavailable: '+uid);
    const node=renderer.sceneStream.index.nodes.indexOf(f),batches=renderer.batches.filter(b=>b.instances.includes(f)),declared=renderer.sceneStream.index.batches.filter(b=>b.instanceIDs.includes(node));
    if(node<0||!renderer.sceneStream.index.life.includes(node)||!batches.length||declared.length!==batches.length)throw Error('Actor is not the actual compiled scene node: '+uid);
    for(const b of batches){const mesh=renderer.sceneStream.index.meshes[b.streamMesh];if(!b.dynamic||b.kind!==10||b.species!==f.species||!mesh||b.count!==mesh.indexCount||!renderer.sceneStream.meshes[b.streamMesh].batches.includes(b))throw Error('Actor batch does not match the compiled mesh: '+uid);}
    return {f,catalogue,batches,node,choice:choice.choice};
   });
   const signature=()=>JSON.stringify({seed:oceanEncounters.snapshot().seed,version:oceanEncounters.snapshot().deepVersion,time:t,player:player.p,actors:actors.map(({f})=>({uid:f.uid,p:f.p,home:f.home,center:f.center,s:f.s,yaw:f.yaw,pitch:f.pitch,phase:f.phase,orbit:f.orbit}))});
   window.__deepVariationInspection={actors,signature,original:signature(),entry:record};return record;
  },ids);
  assert.notEqual(report.entry.seed,report.initial.seed);assert.equal(report.entry.dives,report.initial.dives+1);assert.equal(report.entry.adaptiveBeforeFreeze,true);save();
  for(const uid of ids){
   const capture=await page.evaluate(async uid=>{
    const fixture=__deepVariationInspection,{f,catalogue,batches,node,choice}=fixture.actors.find(a=>a.f.uid===uid),sp=SPECIES[f.species],gl=renderer.gl;
    if(fixture.signature()!==fixture.original)throw Error('Actor/seed/time/player changed before inspection');
    const aim=animalFocusPoint(f).slice(),size=sp.modelBounds.size.map((v,i)=>v*f.s[i]),metres=Math.max(...size),near=Number.isFinite(renderer.photoNear)?clamp(renderer.photoNear,.002,.16):.16;
    const distance=Math.max(.55,metres*1.6,catalogue.bodyRadius+near+.12),aspect=renderer.width/renderer.height;
    const fov=clamp(2*Math.atan(metres/(2*distance*.72*Math.min(aspect,1)))*180/Math.PI,8,100),yaw=f.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),attempts=[];
    let camera=null;
    for(const vector of [[.28,.22,1],[.28,.35,-1],[.65,.5,1],[.65,.7,-1],[.1,1,.25]]){
     const d=V.mul(V.norm(vector),distance),at=[aim[0]+c*d[0]+s*d[2],aim[1]+d[1],aim[2]-s*d[0]+c*d[2]],bodyCollisions=[];
     for(const other of allLife){if(other.ecologyPresent===false||other.assetReady===false)continue;const separation=V.dist(at,other.p);if(separation>Math.max(...other.s)*4+4)continue;if(separation<=animalContactEnvelope(other).radius+.08)bodyCollisions.push(other.uid||'unnamed');}
     const evidence={camera:at,rock:OceanRockContact.overlaps(at,.08),region:OceanRegions.pointBlocked(at,.08),ground:!!OceanTrench.groundContact(at,.08),subjectNearClip:V.dist(at,f.p)<=catalogue.bodyRadius+near+.04,bodyCollisions,sightBlocked:blocked(at,aim,.001)||!OceanRegions.pathClear(at,aim,.001)};
     attempts.push(evidence);if(!evidence.rock&&!evidence.region&&!evidence.ground&&!evidence.subjectNearClip&&!bodyCollisions.length&&!evidence.sightBlocked){camera=at;break;}
    }
    if(!camera)throw Error('No legal near camera for '+uid+': '+JSON.stringify(attempts));
    renderer.photoFov=fov;renderer.lamp=true;renderer.forceShadow=true;
    await renderer.sceneStream.ready(camera);
    for(let pass=0;pass<3;pass++)if(renderer.render(camera,aim,t)===false)throw Error('Actual renderer did not finish '+uid+' pass '+pass);
    if(fixture.signature()!==fixture.original)throw Error('Inspection mutated actor/seed/time/player');
    const origin=renderer.renderOrigin||[0,0,0],batchRows=batches.map(b=>{
     const packed=[];for(let i=0;i<b.drawCount;i++){const at=i*24;if([0,1,2].every(k=>b.data[at+k]===Math.fround(f.p[k]-origin[k]))&&[0,1,2].every(k=>b.data[at+4+k]===Math.fround(f.s[k]))&&b.data[at+3]===Math.fround(f.yaw||0)&&b.data[at+10]===Math.fround(f.phase||0))packed.push(i);}
     return {streamMesh:b.streamMesh,compiledNode:node,count:b.count,vertexCount:b.vertexCount,drawCount:b.drawCount,packedActorIndices:packed,resident:!!b.vao,minDistance:b.minDistance||0,maxDistance:b.maxDistance,actorSubmittedTriangles:packed.length*b.count/3};
    });
    if(!batchRows.some(b=>b.resident&&b.drawCount>0&&b.packedActorIndices.length))throw Error('The actual target actor was not packed/submitted: '+uid);
    const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let sum=0,maximum=0;
    for(let i=0;i<bytes.length;i+=4){sum+=bytes[i]+bytes[i+1]+bytes[i+2];maximum=Math.max(maximum,bytes[i],bytes[i+1],bytes[i+2]);}
    const error=gl.getError();if(error||gl.isContextLost())throw Error('GL failure '+error+' while capturing '+uid);
    return {uid,species:sp.id,name:sp.name,home:f.home.slice(),p:f.p.slice(),choice,scale:f.s.slice(),yaw:f.yaw,pitch:f.pitch,phase:f.phase,time:t,metreBounds:size,camera,aim,distance:V.dist(camera,aim),near,fov,attempts,compiledNode:node,batches:batchRows,triangles:renderer.submittedTriangles,drawCalls:renderer.drawCalls,resolution:[width,height],quality:renderer.quality,dynamicScale:renderer.dynamicScale,lamp:renderer.lamp,lighting:renderer.lighting,exposure:renderer.exposure,clarity:renderer.clarity,mean:sum/(width*height*3),maximum,gl:error,contextLost:false,png:renderer.canvas.toDataURL('image/png')};
   },uid);
   const file=out.replace(/\.json$/,'')+'-'+uid+'.png';fs.writeFileSync(file,Buffer.from(capture.png.split(',')[1],'base64'));delete capture.png;capture.file=file;report.views.push(capture);save();
   assert.equal(capture.gl,0);assert(capture.triangles>0);assert(capture.maximum>10,'Frame has no visible content');assert.equal(capture.quality,report.entry.quality);assert.equal(capture.dynamicScale,report.entry.dynamicScale);console.log('PASS '+profile+' '+uid);
  }
  report.final=await page.evaluate(()=>({unchanged:__deepVariationInspection.signature()===__deepVariationInspection.original,seed:oceanEncounters.snapshot().seed,time:t,quality:renderer.quality,dynamicScale:renderer.dynamicScale,contextLost:renderer.gl.isContextLost(),gl:renderer.gl.getError()}));
  assert(report.final.unchanged);assert.equal(report.final.gl,0);assert.equal(report.final.contextLost,false);assert.deepEqual(report.errors,[]);
  report.status='passed-controlled-checks-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
})();
