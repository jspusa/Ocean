/* Real HTTP503 recovery during regional boot, preserving already uploaded GL
 * objects. Small software-WebGL buffers are diagnostic, not device FPS/power.
 * Run alone after the candidate is packed; this test never bakes the scene.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const out=path.resolve(root,option('out','qa/parity/scene-startup-retry-browser.json'));
const report={status:'running',url,expectedVersion,method:'Real streamed boot with only the second initially requested .bin.gz chunk fulfilled once as HTTP503/no-store, after another actual mesh is resident. Healthy requests and the retry continue unchanged. Existing stream/mesh/batch/GL object identities are held before the fault and checked at ready. No production source, required set, clock or request deadline is changed. Real start click/tap and two unfrozen application RAF/renderer/animal-motion frames follow, with held KeyW input fixture on both profiles. 128x96 software-WebGL diagnostic buffers, original desktop/touch quality2/1 and MSAA; touch is desktop emulation, not physical-phone movement/FPS/power evidence.',profiles:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const pathname=value=>new URL(value).pathname;
const chunkPattern=/\/assets\/scene\/[^/?]+\.bin\.gz(?:\?[^#]*)?$/;
const fullArchive=value=>/\/assets\/reef\.mesh\.gz$/.test(pathname(value));
function bounded(array,value,limit=64){if(array.length<limit)array.push(value);else array.overflow=(array.overflow||0)+1;}
(async()=>{let browser;
 try{
  save();browser=await chromium.launch(require('./browser-launch.cjs')());
  for(const touch of [false,true]){
   const row={profile:touch?'touch':'desktop',quality:touch?1:2,chunkRequests:[],httpErrors:[],requestFailures:[],consoleErrors:[],warnings:[],pageErrors:[],routeErrors:[],fullArchiveRequests:[],injection:null};report.profiles.push(row);save();
   const context=await browser.newContext({viewport:{width:128,height:96},deviceScaleFactor:1,isMobile:touch,hasTouch:touch}),page=await context.newPage();let ordinal=0,badPath=null,injected=false,closing=false;
   try{
    await page.addInitScript(({quality})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality,adaptive:false,startWithSound:false,reduced:true,third:false,lamp:false}})),{quality:row.quality});
    page.on('pageerror',error=>bounded(row.pageErrors,error.message));
    page.on('request',request=>{if(fullArchive(request.url()))bounded(row.fullArchiveRequests,{url:request.url(),at:Date.now()});});
    page.on('requestfailed',request=>{if(!closing)bounded(row.requestFailures,{url:request.url(),error:request.failure()?.errorText||null,at:Date.now()});});
    page.on('response',response=>{if(response.status()>=400)bounded(row.httpErrors,{url:response.url(),status:response.status(),at:Date.now()});});
    page.on('console',message=>{const item={text:message.text(),location:message.location(),at:Date.now()};if(message.type()==='error')bounded(row.consoleErrors,item);else if(message.type()==='warning')bounded(row.warnings,item);});
    // Only geographic chunk requests are routed. Index, textures, scripts,
    // complete archive and every unrelated request keep their normal behavior.
    await page.route(chunkPattern,async route=>{
     const request=route.request(),requestPath=pathname(request.url()),entry={ordinal:++ordinal,url:request.url(),path:requestPath,at:Date.now(),action:'continue'};bounded(row.chunkRequests,entry,600);
     try{
      if(entry.ordinal===2&&!injected){
       badPath=requestPath;
       // Stay inside the untouched 12-second production fetch budget. A first
       // actual upload must complete before the intended HTTP error is sent.
       await page.waitForFunction(()=>typeof renderer!=='undefined'&&renderer?.sceneStream?.meshes.some(mesh=>mesh.resident),null,{timeout:9000});
       row.beforeFault=await page.evaluate(()=>{
        const stream=renderer.sceneStream,g=renderer.gl,resident=stream.meshes.filter(m=>m.resident);
        window.__sceneStartupRetry={stream,fetchSceneData,ready:SceneStream.prototype.ready,request:SceneStream.prototype.request,needed:stream.needed,meshes:resident.map(mesh=>({mesh,batches:mesh.batches.map(batch=>({batch,vao:batch.vao,vb:batch.vb,eb:batch.eb,ib:batch.ib}))}))};
        return {ready:!!window.__ocean?.ready,streamDisposed:stream.disposed,residentMeshes:resident.length,meshIDs:resident.map(m=>m.id),residentBatches:resident.reduce((n,m)=>n+m.batches.length,0),glObjectsValid:resident.every(m=>m.batches.every(b=>g.isVertexArray(b.vao)&&g.isBuffer(b.vb)&&g.isBuffer(b.eb)&&g.isBuffer(b.ib))),pending:stream.jobs.size,at:performance.now()};
       });
       assert(row.beforeFault.residentMeshes>0&&row.beforeFault.glObjectsValid,'The fault must follow a real completed mesh upload');assert(!row.beforeFault.streamDisposed);assert(!row.beforeFault.ready,'The injection belongs to boot, not normal streaming');
       injected=true;entry.action='HTTP503';row.injection={url:request.url(),path:badPath,ordinal:entry.ordinal,status:503,sentAt:Date.now(),residentMeshes:row.beforeFault.residentMeshes};save();
       await route.fulfill({status:503,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8'},body:'scene-startup-retry-browser: one transient required-chunk HTTP503'});
      }else await route.continue();
     }catch(error){if(!closing)bounded(row.routeErrors,error.stack);await route.abort('failed').catch(()=>{});}
    });
    await page.goto(url+(url.includes('?')?'&':'?')+'still',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:180000});
    assert(await page.evaluate(()=>!!window.__ocean?.ready),'Boot must reach ready after the injected HTTP503');
    row.ready=await page.evaluate(()=>{
     const saved=window.__sceneStartupRetry,stream=renderer.sceneStream,g=renderer.gl;
     if(!saved)return {snapshotMissing:true};
     const retained=saved.meshes.map(entry=>({id:entry.mesh.id,meshIdentity:stream?.meshes[entry.mesh.id]===entry.mesh,resident:entry.mesh.resident,batches:entry.batches.map(ref=>({batchIdentity:entry.mesh.batches.includes(ref.batch),vaoSame:ref.batch.vao===ref.vao,vbSame:ref.batch.vb===ref.vb,ebSame:ref.batch.eb===ref.eb,ibSame:ref.batch.ib===ref.ib,vaoAlive:g.isVertexArray(ref.vao),vbAlive:g.isBuffer(ref.vb),ebAlive:g.isBuffer(ref.eb),ibAlive:g.isBuffer(ref.ib)}))}));
     return {version:document.documentElement.dataset.version,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed===true,sameStream:stream===saved.stream,streamDisposed:stream?.disposed,sourceMethodsUnchanged:fetchSceneData===saved.fetchSceneData&&SceneStream.prototype.ready===saved.ready&&SceneStream.prototype.request===saved.request&&stream?.needed===saved.needed,retained,allRetained:retained.every(m=>m.meshIdentity&&m.resident&&m.batches.every(b=>Object.values(b).every(Boolean))),residentMeshes:stream?.meshes.filter(m=>m.resident).length,totalMeshes:stream?.meshes.length,quality:renderer.quality,adaptive:settings.adaptive,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,actors:allLife.length,shoal:shoal.length,species:SPECIES.length,gl:g.getError(),contextLost:g.isContextLost(),frame:renderer.frame};
    });save();
    assert.equal(row.ready.version,expectedVersion);assert(row.ready.compiled&&row.ready.streamed,'Recovery must retain regional loading; full/procedural fallback is not acceptance');assert(row.ready.sameStream&&row.ready.allRetained,'Already resident mesh/batch/GL objects must retain identity and remain alive');assert(row.ready.sourceMethodsUnchanged);assert.equal(row.ready.streamDisposed,false);assert.equal(row.ready.quality,row.quality);assert.equal(row.ready.adaptive,false);assert.equal(row.ready.scale,1);assert.deepEqual(row.ready.resolution,[128,96]);assert.equal(row.ready.gl,0);assert(!row.ready.contextLost);assert(row.ready.residentMeshes>0&&row.ready.residentMeshes<row.ready.totalMeshes);
    await page.locator('#loading').waitFor({state:'hidden'});if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();await page.bringToFront();
    await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
    // Let normal start-entry requests settle before software rasterization.
    // This only reads the production needed set; it does not alter scheduling.
    await page.waitForFunction(()=>{const s=renderer.sceneStream;return !!s&&!s.jobs.size&&[...s.needed(eye)].every(id=>s.meshes[id].resident);},null,{timeout:120000});
    await page.evaluate(()=>{
     const frames=[],record=oceanPerf.record;window.__sceneStartupFrames={frames,record,start:{frame:renderer.frame,time:t,p:player.p.slice(),animal:allLife[0].p.slice(),focus:document.hasFocus()}};
     oceanPerf.record=function(...args){record.apply(this,args);frames.push({ms:args[0],time:t,frame:renderer.frame,p:player.p.slice(),animal:allLife[0].p.slice()});if(frames.length>=2){window.__freeze=true;keys.clear();}};
     resetInput();stopAuto();keys.add('KeyW');window.__freeze=false;lastTime=performance.now();
    });
    await page.waitForFunction(()=>window.__sceneStartupFrames?.frames.length>=2,null,{timeout:120000});
    row.live=await page.evaluate(()=>({start:__sceneStartupFrames.start,frames:__sceneStartupFrames.frames,version:document.documentElement.dataset.version,streamed:renderer.sceneLoad.streamed===true,sameStream:renderer.sceneStream===__sceneStartupRetry.stream,quality:renderer.quality,scale:renderer.dynamicScale,gl:renderer.gl.getError(),contextLost:renderer.gl.isContextLost()}));
    assert.equal(row.live.version,expectedVersion);assert(row.live.streamed&&row.live.sameStream);assert.equal(row.live.start.focus,true);assert.equal(row.live.frames.length,2);assert.equal(row.live.gl,0);assert(!row.live.contextLost);assert.equal(row.live.quality,row.quality);assert.equal(row.live.scale,1);
    for(let i=0;i<row.live.frames.length;i++){const f=row.live.frames[i],prior=i?row.live.frames[i-1]:row.live.start;assert(f.frame>prior.frame,'Actual renderer frames must advance');assert(f.time>prior.time,'Real application simulation must advance');if(i)assert(f.ms>prior.ms,'RAF timestamps must advance');}
    assert.notDeepEqual(row.live.frames.at(-1).animal,row.live.start.animal,'Actual world animals must animate');assert(Math.hypot(...row.live.frames.at(-1).p.map((v,i)=>v-row.live.start.p[i]))>.001,'Held input fixture must move the player');
    const attempts=row.chunkRequests.filter(r=>r.path===badPath);row.badChunkAttempts=attempts;assert.equal(attempts.length,2,'Only the transient required chunk needs one retry');assert.equal(attempts[0].action,'HTTP503');assert.equal(attempts[1].action,'continue');row.retryDelayMs=attempts[1].at-row.injection.sentAt;assert(row.retryDelayMs>=1900,'Retry must honor the existing approximately two-second backoff');
    assert.equal(row.fullArchiveRequests.length,0,'A single transient chunk must never download assets/reef.mesh.gz');assert.deepEqual(row.requestFailures,[]);assert.deepEqual(row.pageErrors,[]);assert.deepEqual(row.routeErrors,[]);
    row.expectedHTTP=row.httpErrors.filter(r=>pathname(r.url)===badPath&&r.status===503);row.unexpectedHTTP=row.httpErrors.filter(r=>!(pathname(r.url)===badPath&&r.status===503));assert.equal(row.expectedHTTP.length,1);assert.deepEqual(row.unexpectedHTTP,[]);
    row.expectedConsole=row.consoleErrors.filter(r=>r.location.url&&pathname(r.location.url)===badPath&&/503|Service Unavailable/i.test(r.text));row.unexpectedConsole=row.consoleErrors.filter(r=>!row.expectedConsole.includes(r));assert.deepEqual(row.unexpectedConsole,[],'Only the exact intentionally failed chunk HTTP503 console error is allowed');
    assert(!row.warnings.some(r=>/Regional scene unavailable|Compiled scene unavailable/i.test(r.text)),'Source fallback warnings must fail rather than be hidden');
    for(const name of ['chunkRequests','httpErrors','requestFailures','consoleErrors','warnings','pageErrors','routeErrors','fullArchiveRequests'])assert(!row[name].overflow,'Bounded '+name+' log overflow prevents acceptance');
    row.status='passed';save();console.log('PASS '+row.profile+' transient required-chunk HTTP503: same stream, '+row.beforeFault.residentMeshes+' retained meshes, exactly two attempts, no whole-world fetch, two real RAF/WebGL frames');
   }finally{closing=true;await page.evaluate(()=>{window.__freeze=true;keys.clear();const live=window.__sceneStartupFrames;if(live)oceanPerf.record=live.record;delete window.__sceneStartupFrames;delete window.__sceneStartupRetry;}).catch(()=>{});await context.close();save();}
  }
  report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{await browser?.close();save();console.log(JSON.stringify({status:report.status,out,failure:report.failure}));}
})();
