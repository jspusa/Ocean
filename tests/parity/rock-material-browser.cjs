/* Actual compiled home rock, full production world. Root serializes native GPU
 * execution. Timing precedes PNG readback per profile. Touch is desktop browser
 * emulation; screenshots need human review, not a numeric realism threshold. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const option=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d,digest=s=>crypto.createHash('sha256').update(s).digest('hex'),root=path.resolve(__dirname,'../..');
const baselinePath=option('baseline-engine',null),out=path.resolve(option('out','qa/parity/v01839-realism/rock-material.json')),viewsOnly=process.argv.includes('--views-only');
assert(baselinePath,'Required: --baseline-engine=/absolute/path/to/baseline-engine.js');
const baselineText=fs.readFileSync(path.resolve(baselinePath),'utf8'),baseline=vm.runInNewContext(baselineText+'\n({VS,FS})',{console},{timeout:10000});
const profiles=option('profile','both')==='both'?['desktop','touch']:[option('profile','both')],views=option('views','near,oblique,far,blue-lamp').split(','),costViews=viewsOnly?[]:option('cost-views','near,oblique').split(',');
assert(profiles.every(p=>['desktop','touch'].includes(p)));assert([...views,...costViews].every(v=>['near','oblique','far','blue-lamp'].includes(v)));
const indexBytes=fs.readFileSync(path.join(root,'assets/scene/index.json')),index=JSON.parse(indexBytes),position=[-10.916091154348962,-11.506344136714409,1.1098294701659324];
const node=index.nodes.findIndex(n=>n.p?.every((v,k)=>v===position[k]));assert(node>=0,'Real home rock pose is missing');
const actor=index.nodes[node],contactID=index.rockContact.instances.findIndex(n=>n.p.every((v,k)=>v===actor.p[k])&&n.s.every((v,k)=>v===actor.s[k])&&n.yaw===actor.yaw);
assert(contactID>=0);const contact=index.rockContact.instances[contactID],contactMesh=index.rockContact.meshes[contact.mesh];
const batches=index.batches.map((b,id)=>({...b,id})).filter(b=>b.kind===0&&b.material===2&&!b.shadowProxy&&b.instanceIDs.includes(node));assert.equal(batches.length,2);
const high=batches.find(b=>!b.minDistance),radius=index.meshes[high.meshID].radius*Math.max(...actor.s),cameras={};
for(const view of new Set([...views,...costViews])){const d=view==='oblique'||view==='blue-lamp'?[1,.42,.6]:[1,.24,1],distance=view==='far'?35:radius*3.1;cameras[view]={eye:actor.p.map((v,k)=>v+d[k]/Math.hypot(...d)*distance),target:actor.p.slice(),distance,radius,time:6,near:.08,lighting:view==='blue-lamp'?'blue':'day',lamp:view==='blue-lamp'};}
// Verify these fixed views against actual catalogue triangles on the CPU. The
// browser never replaces/reinstalls collision data to obtain a convenient shot.
const cpu=vm.createContext({console});vm.runInContext(fs.readFileSync(path.join(root,'src/rock_contact.js'),'utf8')+'\nthis.api=OceanRockContact',cpu);cpu.api.install(index.rockContact);
for(const view of Object.values(cameras)){assert(!cpu.api.overlaps(view.eye,.2)&&view.eye[1]<-.5,'Canonical camera is not clear underwater');view.firstRockHit=cpu.api.sweep(view.eye,view.target,0);}
cpu.api.install({...index.rockContact,instances:[contact]});for(const view of Object.values(cameras)){const hit=cpu.api.sweep(view.eye,view.target,0);assert(hit&&view.firstRockHit&&Math.abs(hit.fraction-view.firstRockHit.fraction)<1e-6,'Another rock obscures selected rock');}
const geometry=batches.map(b=>{const m=index.meshes[b.meshID],chunk=index.chunks[m.chunk],bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/scene',chunk.url)));return {batch:b.id,mesh:b.meshID,minDistance:b.minDistance||0,maxDistance:b.maxDistance,vertexFloats:m.vertexFloats,indexCount:m.indexCount,chunk:chunk.url,chunkSHA256:chunk.sha256,geometrySHA256:digest(Buffer.concat([bytes.subarray(m.vertexOffset,m.vertexOffset+m.vertexFloats*4),bytes.subarray(m.indexOffset,m.indexOffset+m.indexCount*4)]))};});
const witness={node,contactID,actor,contactMeshSHA256:digest(JSON.stringify(contactMesh)),geometry,indexSHA256:digest(indexBytes),immutableMetadataSHA256:digest(JSON.stringify([index.meshes,index.batches,index.rockContact,index.sourceArchiveSHA256])),sourceArchiveSHA256:index.sourceArchiveSHA256};
const report={status:'running',viewsOnly,costViews,views,baseline:{path:path.resolve(baselinePath),engineSHA256:digest(baselineText),VS:digest(baseline.VS),FS:digest(baseline.FS)},witness,profiles:[],errors:[],method:'Native Chrome full production world; one real compiled home rock, exact pose/contact/source provenance. Default desktop quality 2 and touch quality 1; adaptation frozen only for inspection. Only 0:2 fragment program changes; its actual attached production vertex shader and all other programs remain identical. Each timed scene waits for actual streaming/eviction/shadow settlement, then same-context ABBA, 10 warm + 25 GPU queries per block. All invalid samples retained and invalidate that scene; baseline drift reported without trimming. All profile timing finishes before its PNG readback. Four actual-world views compare intentional material differences, not pixel parity. No FPS, phone hardware, battery or automatic aesthetic acceptance.'};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
async function main(){let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profile of profiles){
   const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage(),row={profile,sources:{},timings:[],views:[]},sourceJobs=[];report.profiles.push(row);
   page.on('response',response=>{const pathname=new URL(response.url()).pathname,key=['src/engine.js','assets/scene/index.json','assets/rock_diff.jpg','assets/rock_nor_gl.jpg'].find(k=>pathname.endsWith('/'+k));if(key)sourceJobs.push(response.body().then(b=>{row.sources[key]={pathname,sha256:digest(b),bytes:b.length};}).catch(e=>report.errors.push({profile,error:String(e.message)})));});
   page.on('pageerror',e=>report.errors.push({profile,error:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({profile,error:m.text()});});
   try{
    const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
    row.initial=await page.evaluate(async({baseline,witness,timing})=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
     if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('Native hardware GPU required: '+hardware);
     if(timing&&!g.getExtension('EXT_disjoint_timer_query_webgl2'))throw Error('GPU timer queries unavailable');
     const initial={hardware,version:document.documentElement.dataset.version,quality:renderer.quality,adaptive:settings.adaptive,scale:renderer.dynamicScale,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,textureFull:renderer.textureFull};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;updateLife(6);$('welcome').classList.add('hidden');$('hud').classList.add('hidden');
     const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),v=>v.toString(16).padStart(2,'0')).join(''),stream=renderer.sceneStream;
     const ix=stream.index;if(await hash(JSON.stringify([ix.meshes,ix.batches,ix.rockContact,ix.sourceArchiveSHA256]))!==witness.immutableMetadataSHA256)throw Error('Runtime scene differs from CPU witness');
     const actor=stream.index.nodes[witness.node],selected=renderer.batches.filter(b=>b.kind===0&&b.material===2&&!b.shadowProxy&&b.instances.includes(actor));
     if(selected.length!==2||JSON.stringify(actor)!==JSON.stringify(witness.actor))throw Error('Actual compiled rock identity changed');
     const current=renderer.surfacePrograms.get('0:2');if(!current||renderer.surfaceProgram(selected[0])!==current)throw Error('Production 0:2 specialization is missing');
     const shader=type=>g.getShaderSource(g.getAttachedShaders(current.p).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type)),vertex=shader(g.VERTEX_SHADER),fragment=shader(g.FRAGMENT_SHADER);
     if(VS!==baseline.VS||vertex!==surfaceShaderSource(VS,0,2)||fragment!==surfaceShaderSource(FS,0,2))throw Error('Actual production shader source differs from expected fragment-only seam');
     const beforeFragment=surfaceShaderSource(baseline.FS,0,2),before=renderer.makeProgram(vertex,beforeFragment);
     initial.shaderSHA256={sharedActualVS:await hash(vertex),currentFS:await hash(fragment),beforeFS:await hash(beforeFragment),currentFullFS:await hash(FS)};
     window.__rockMaterial={actor,selected,stream,current,before,generic:renderer.program,textures:renderer.textures.slice(),others:new Map([...renderer.surfacePrograms].filter(([k])=>k!=='0:2'))};return initial;
    },{baseline,witness,timing:costViews.length>0});
    assert(row.initial.adaptive&&row.initial.compiled&&row.initial.streamed);assert.equal(row.initial.quality,touch?1:2);assert.equal(row.initial.scale,1);
    await Promise.all(sourceJobs);assert.equal(row.sources['assets/scene/index.json']?.sha256,witness.indexSHA256,'Loaded manifest provenance mismatch');assert.equal(row.sources['src/engine.js']?.sha256,digest(fs.readFileSync(path.join(root,'src/engine.js'))),'Loaded engine provenance mismatch');
    for(const name of ['assets/rock_diff.jpg','assets/rock_nor_gl.jpg'])assert.equal(row.sources[name]?.sha256,digest(fs.readFileSync(path.join(root,name))),'Loaded rock texture provenance mismatch');save();
    // All cost scenes precede all screenshots in this profile/context.
    for(const [view,measure]of [...costViews.map(v=>[v,true]),...views.map(v=>[v,false])]){
     const result=await page.evaluate(async({view,measure,camera,touch})=>{
      const r={view,measure,blocks:[],images:[],valid:false,failure:null},f=window.__rockMaterial,g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),median=a=>a.length?a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)]:null;
      let query=null,queryActive=false,baselineStats=null,settledIDs=null;const identity=()=>JSON.stringify([[f.actor.p,f.actor.s,f.actor.yaw,f.actor.tint,f.actor.bioGenes],[...allLife,...shoal].map(n=>[n.uid,n.p,n.yaw,n.pitch,n.s,n.ecologyPresent])]),contentBefore=identity();
      const restore=()=>renderer.surfacePrograms.set('0:2',f.current),render=()=>renderer.render(camera.eye,camera.target,camera.time),residency=()=>f.stream.meshes.filter(m=>m.resident).map(m=>m.id),keep=f.stream.neededRanges(camera.eye).keep;
      const state=()=>({residentMeshes:f.stream.meshes.filter(m=>m.resident).length,outsideKeep:f.stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,pending:f.stream.jobs.size,queued:f.stream.queue.length,active:f.stream.active,missing:f.stream.requiredMissing.size,forceShadow:!!renderer.forceShadow,dirty:!!renderer._shadowMapDirty,shadowUpdates:renderer.staticShadowUpdates||0});
      const submitted=b=>{const p=f.actor.p.map((v,k)=>Math.fround(v-(renderer.renderOrigin||[0,0,0])[k]));for(let i=0;i<b.drawCount;i++)if(p.every((v,k)=>Math.abs(b.data[i*24+k]-v)<.00001)&&Math.abs(b.data[i*24+3]-Math.fround(f.actor.yaw))<.00001)return true;return false;};
      const stats=()=>({drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,submittedTriangles:renderer.submittedTriangles,submittedVertices:renderer.submittedVertices,resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,fov:renderer.photoFov,near:renderer.photoNear,lighting:renderer.lighting,lamp:renderer.lamp,stream:state(),residencyMatches:JSON.stringify(residency())===settledIDs,selected:f.selected.map(b=>({mesh:b.streamMesh,triangles:b.count/3,vertices:b.vertexCount,drawCount:b.drawCount,minDistance:b.minDistance||0,selectedSubmitted:submitted(b)}))});
      const arm=label=>{const expected=label==='before'?f.before:f.current;renderer.surfacePrograms.set('0:2',expected);return expected;};
      const programsMatch=expected=>renderer.program===f.generic&&renderer.surfacePrograms.size===f.others.size+1&&[...f.others].every(([k,p])=>renderer.surfacePrograms.get(k)===p)&&f.selected.every(b=>renderer.surfaceProgram(b)===expected)&&renderer.textures.length===f.textures.length&&renderer.textures.every((t,i)=>t===f.textures[i]);
      const validate=(s,expected)=>{const signature=JSON.stringify(s);if(baselineStats===null)baselineStats=signature;return {invariantsMatch:signature===baselineStats,programsMatch:programsMatch(expected),targetSubmitted:s.selected.some(b=>b.selectedSubmitted&&(view==='far'?b.minDistance>0:b.minDistance===0)),residencyMatches:s.residencyMatches};};
      const finish=b=>{if(b.endedWallAtMs!==undefined)return;b.endedWallAtMs=Date.now();b.wallMs=b.endedWallAtMs-b.startedWallAtMs;b.measuredWallMs=b.measuredWallAtMs?b.endedWallAtMs-b.measuredWallAtMs:null;b.validSamples=b.samples.filter(s=>s.status==='valid').length;b.medianGpuMs=b.validSamples===25?median(b.samples.map(s=>s.gpuMs)):null;b.medianCpuMs=median(b.samples.map(s=>s.cpuMs).filter(Number.isFinite));};
      try{
       restore();renderer.photoFov=touch?82:44;renderer.photoNear=camera.near;renderer.lighting=camera.lighting;renderer.lamp=camera.lamp;renderer.forceShadow=true;
       const hit=OceanRockContact.sweep(camera.eye,camera.target,0),inRock=OceanRockContact.overlaps(camera.eye,.2),available=Math.tan(renderer.photoFov*Math.PI/360)*Math.min(1,g.drawingBufferWidth/g.drawingBufferHeight),projected=camera.radius/Math.sqrt(camera.distance**2-camera.radius**2);
       r.camera={...camera,fov:renderer.photoFov,inRock,firstRockHit:hit,framing:{available,projected,fits:projected<=available}};
       if(inRock||!hit||Math.abs(hit.fraction-camera.firstRockHit.fraction)>1e-6||projected>available)throw Error('Actual camera/contact/framing invariant failed');
       await f.stream.ready(camera.eye);const start=performance.now();r.settling={frames:0,events:[]};let stable=0,last=null;
       while(stable<2){
        if(performance.now()-start>20000)throw Error('Actual streaming/shadow settling exceeded 20 seconds');await raf();const rendered=render(),s=state(),ids=residency(),signature=JSON.stringify([s,ids]);r.settling.frames++;
        if(g.getError())throw Error('Settling render GL error');if(signature!==last)r.settling.events.push({elapsedMs:performance.now()-start,...s});
        const ready=rendered!==false&&!s.outsideKeep&&!s.pending&&!s.queued&&!s.active&&!s.missing&&!s.forceShadow&&!s.dirty;stable=ready?(last===signature?stable+1:1):0;last=signature;
        if(stable===2){settledIDs=JSON.stringify(ids);r.settling.residentIDs=ids;r.settling.elapsedMs=performance.now()-start;}
       }
       let abort=false;
       if(measure)for(const [index,label]of ['before','current','current','before'].entries()){
        const expected=arm(label),block={index,arm:label,warmFrames:10,startedWallAtMs:Date.now(),samples:[]};r.blocks.push(block);
        for(let i=0;i<10;i++){await raf();if(render()===false)throw Error('Warm frame was not submitted');}if(g.getError())throw Error('Warm render GL error');block.measuredWallAtMs=Date.now();
        for(let i=0;i<25;i++){
         await raf();const s={index:i,status:'pending',startedWallAtMs:Date.now(),hidden:document.hidden,hasFocus:document.hasFocus(),disjointBefore:!!g.getParameter(ext.GPU_DISJOINT_EXT),gpuMs:null,cpuMs:null};block.samples.push(s);
         query=g.createQuery();if(!query){s.status='query-allocation-failed';abort=true;break;}g.beginQuery(ext.TIME_ELAPSED_EXT,query);queryActive=true;const begin=performance.now();const rendered=render();s.cpuMs=performance.now()-begin;g.endQuery(ext.TIME_ELAPSED_EXT);queryActive=false;g.flush();s.submitted=rendered!==false;s.gl=g.getError();s.stats=stats();Object.assign(s,validate(s.stats,expected));
         const wait=performance.now();while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()-wait>10000){s.status='query-timeout';abort=true;break;}await raf();}s.queryWaitMs=performance.now()-wait;s.disjointAfter=!!g.getParameter(ext.GPU_DISJOINT_EXT);
         if(s.status!=='query-timeout'){s.rawNanoseconds=g.getQueryParameter(query,g.QUERY_RESULT);s.status=s.disjointBefore||s.disjointAfter?'disjoint':!s.submitted?'frame-not-submitted':s.gl?'gl-error':!Number.isFinite(s.rawNanoseconds)||s.rawNanoseconds<=0?'invalid-duration':!s.programsMatch?'program-changed':!s.targetSubmitted?'target-not-submitted':!s.invariantsMatch||!s.residencyMatches?'render-invariant-changed':s.hidden||document.hidden?'hidden-document':'valid';if(s.status==='valid')s.gpuMs=s.rawNanoseconds/1e6;}
         g.deleteQuery(query);query=null;s.wallMs=Date.now()-s.startedWallAtMs;s.hiddenAtEnd=document.hidden;if(abort)break;
        }finish(block);if(abort)break;
       }
       if(!measure)for(const label of ['before','current']){const expected=arm(label);for(let i=0;i<3;i++){await raf();if(render()===false)throw Error('Visual frame not submitted');}const s=stats(),checks=validate(s,expected),error=g.getError();if(error||!Object.values(checks).every(Boolean))throw Error('Visual render invariant failed');r.images.push({arm:label,stats:s,checks,gl:error,png:renderer.canvas.toDataURL('image/png')});}
       r.contentUnchanged=contentBefore===identity();const samples=r.blocks.flatMap(b=>b.samples);r.invalidSamples=r.blocks.flatMap(b=>b.samples.filter(s=>s.status!=='valid').map(s=>({block:b.index,index:s.index,status:s.status})));
       r.valid=r.contentUnchanged&&(measure?r.blocks.length===4&&r.blocks.every(b=>b.samples.length===25)&&samples.every(s=>s.status==='valid'):r.images.length===2);
       if(measure&&r.valid){const before=median(r.blocks.filter(b=>b.arm==='before').flatMap(b=>b.samples.map(s=>s.gpuMs))),current=median(r.blocks.filter(b=>b.arm==='current').flatMap(b=>b.samples.map(s=>s.gpuMs)));r.comparison={beforeMedianGpuMs:before,currentMedianGpuMs:current,deltaGpuMs:current-before,deltaPercent:(current/before-1)*100};}
      }catch(e){r.valid=false;r.failure=e.stack;r.comparison=null;}finally{if(queryActive)g.endQuery(ext.TIME_ELAPSED_EXT);if(query)g.deleteQuery(query);r.blocks.forEach(finish);restore();}
      const a=r.blocks[0],b=r.blocks[3],complete=a?.validSamples===25&&b?.validSamples===25;r.baselineDrift=measure?{policy:'All samples retained; no outlier removal or automatic acceptance.',complete:!!complete,firstMedianGpuMs:a?.medianGpuMs??null,lastMedianGpuMs:b?.medianGpuMs??null,deltaGpuPercent:complete?(b.medianGpuMs/a.medianGpuMs-1)*100:null,firstMedianCpuMs:a?.medianCpuMs??null,lastMedianCpuMs:b?.medianCpuMs??null,firstMeasuredWallMs:a?.measuredWallMs??null,lastMeasuredWallMs:b?.measuredWallMs??null}:null;return r;
     },{view,measure,camera:cameras[view],touch});
     for(const image of result.images){const file=out.replace(/\.json$/,'')+'-'+profile+'-'+view+'-'+image.arm+'.png';fs.writeFileSync(file,Buffer.from(image.png.split(',')[1],'base64'));delete image.png;image.file=file;}
     row[measure?'timings':'views'].push(result);save();console.log(JSON.stringify({profile,view,measure,valid:result.valid,comparison:result.comparison,baselineDrift:result.baselineDrift,failure:result.failure}));assert(result.valid,'Invalid actual rock evidence; receipt retained: '+out);
    }
   }finally{await context.close();save();}
  }
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-invariants-visual-review-required';
 }catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;console.error(e);}finally{save();await browser?.close();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
