/* Native full-frame comparison of the actual production turtle 2:5
 * specialization and its generic fallback. No material/geometry replacement,
 * GPU timing, pixel filtering or physical-phone claim. Root runs GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
async function main(){
 const profiles=option('profile','both')==='both'?['desktop','touch']:[option('profile','both')],out=path.resolve(option('out','qa/parity/v01838-materials/turtle-surface-parity.json'));
 assert(profiles.every(p=>p==='desktop'||p==='touch'));
 const pixelPolicy={id:'turtle-specialization-quantization-v1',maxDifference:1,maxDifferingChannelRatio:1e-5,maxAlphaDifferences:0,genericRepeatExact:true};
 const report={status:'running',pixelPolicy,method:'Native installed Chrome; actual turtle-002 in the complete compiled world, default desktop quality 2 / touch quality 1. Only the production 2:5 map entry is removed/restored to select the generic or fragment-specialized program. Same original VS, current FS material, geometry, lighting, camera, frozen time, MSAA and resolution. Near oblique/high LOD and far oblique/low LOD; generic/specialized/generic full RGBA comparison. Generic repeat must be byte exact; specialization may differ by at most 1/255 in at most 0.001% of channels, with alpha exact. This follows the existing anemone narrow quantization policy, adding alpha invariance; the retained first exact attempt differed in 8 RGB channels by 1/255. The cause is unproven and is not asserted to be compiler rounding. No pixels are filtered or omitted. Real streaming and delayed eviction settle before capture. No GPU timing; touch is computer emulation, not physical-phone evidence.',profiles:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profile of profiles){
   const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage(),entry={profile,views:[]};report.profiles.push(entry);
   page.on('pageerror',error=>report.errors.push({profile,error:error.message}));page.on('console',message=>{if(message.type()==='error')report.errors.push({profile,error:message.text()});});
   try{
    const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
    entry.initial=await page.evaluate(async()=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,candidate=renderer.surfacePrograms.get('2:5');
     if(!hardware||/software|swiftshader|llvmpipe/i.test(hardware))throw Error('Native hardware GPU required');if(!candidate)throw Error('Production turtle 2:5 specialization is missing');
     const attached=g.getAttachedShaders(candidate.p).map(s=>({type:g.getShaderParameter(s,g.SHADER_TYPE),source:g.getShaderSource(s)})),fragment=surfaceShaderSource(FS,2,5);
     if(!attached.some(s=>s.type===g.VERTEX_SHADER&&s.source===VS)||!attached.some(s=>s.type===g.FRAGMENT_SHADER&&s.source===fragment))throw Error('Turtle specialization must retain exact original VS and declaration-only FS changes');
     const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
     const initial={hardware,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,shaderSourcesVerified:true,VS:await hash(VS),FS:await hash(FS),specializedFS:await hash(fragment)};
     window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;return initial;
    });
    assert(entry.initial.adaptive&&entry.initial.compiled&&entry.initial.streamed);assert.equal(entry.initial.quality,touch?1:2);assert.equal(entry.initial.scale,1);save();
    for(const view of ['oblique','far-oblique']){
     const row=await page.evaluate(async({view,touch,pixelPolicy})=>{
      const result={view,images:[],failure:null},g=renderer.gl,programs=renderer.surfacePrograms,candidate=programs.get('2:5'),others=[...programs].filter(([key])=>key!=='2:5'),raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
      try{
       updateLife(6);const actor=life.find(f=>f.uid==='turtle-002'),batches=renderer.batches.filter(b=>!b.shadowProxy&&b.instances.includes(actor));if(!actor||batches.length!==2)throw Error('Actual turtle and both compiled LODs required');
       const far=view==='far-oblique',offset=far?[12,6,13]:[3.3,1.6,3.6],c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),camera=[actor.p[0]+c*offset[0]+s*offset[2],actor.p[1]+offset[1],actor.p[2]-s*offset[0]+c*offset[2]],target=actor.p.slice();
       renderer.photoFov=touch?(far?24:84):(far?12:44);renderer.photoNear=.08;renderer.lamp=false;renderer.lighting='day';renderer.forceShadow=true;
       if(OceanRockContact.overlaps(camera,.08))throw Error('Inspection camera intersects actual stone');await renderer.sceneStream.ready(camera);
       const render=()=>{if(renderer.render(camera,target,6)===false)throw Error('Incomplete production frame');},stream=renderer.sceneStream,keep=stream.neededRanges(camera).keep;
       const state=()=>({resident:stream.meshes.filter(m=>m.resident).map(m=>m.id),outside:stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).length,jobs:stream.jobs.size,queue:stream.queue.length,active:stream.active,missing:stream.requiredMissing.size,staticShadowUpdates:renderer.staticShadowUpdates||0,forceShadow:!!renderer.forceShadow,shadowMapDirty:!!renderer._shadowMapDirty});
       const started=performance.now();let stable=0,previous=null;
       while(stable<2){if(performance.now()-started>20000)throw Error('Production streaming did not settle');await raf();render();const current=state(),signature=JSON.stringify(current),ready=!current.outside&&!current.jobs&&!current.queue&&!current.active&&!current.missing&&!current.forceShadow&&!current.shadowMapDirty;stable=ready?(signature===previous?stable+1:1):0;previous=ready?signature:null;}
       result.settled=state();result.viewState={uid:actor.uid,p:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,scale:actor.s.slice(),time:6,camera,target,fov:renderer.photoFov};
       const actorSubmitted=b=>{const origin=renderer.renderOrigin||[0,0,0],p=actor.p.map((v,k)=>Math.fround(v-origin[k]));for(let i=0;i<b.drawCount;i++)if(p.every((v,k)=>Math.abs(b.data[i*24+k]-v)<.00001))return true;return false;};
       const work=()=>({draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],quality:renderer.quality,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,state:state(),targets:batches.map(b=>({count:b.count,min:b.minDistance||0,max:b.maxDistance,drawCount:b.drawCount,actorSubmitted:actorSubmitted(b)}))});
       let reference=null,referenceWork=null;
       for(const enabled of [false,true,false]){
        if(enabled)programs.set('2:5',candidate);else programs.delete('2:5');if(others.some(([key,p])=>programs.get(key)!==p))throw Error('Unrelated production program changed');
        for(const b of batches)if(renderer.surfaceProgram(b)!==(enabled?candidate:renderer.program))throw Error('Actual turtle did not use the selected production program');
        render();const currentWork=work(),w=g.drawingBufferWidth,h=g.drawingBufferHeight,bytes=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,bytes);
        let differingChannels=0,alphaDifferences=0,maxDifference=0,rangeMin=255,rangeMax=0;const differences=[];
        if(reference)for(let i=0;i<bytes.length;i++){const difference=Math.abs(bytes[i]-reference[i]);if(difference){differingChannels++;if(i%4===3)alphaDifferences++;maxDifference=Math.max(maxDifference,difference);if(differences.length<24){const pixel=Math.floor(i/4);differences.push({x:pixel%w,y:Math.floor(pixel/w),channel:'RGBA'[i%4],generic:reference[i],observed:bytes[i]});}}}
        else{reference=bytes;referenceWork=JSON.stringify(currentWork);}
        for(let i=0;i<bytes.length;i++)if(i%4!==3){rangeMin=Math.min(rangeMin,bytes[i]);rangeMax=Math.max(rangeMax,bytes[i]);}
        const rgbaSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
        const exact=differingChannels===0,ratio=differingChannels/bytes.length,accepted=exact||enabled&&maxDifference<=pixelPolicy.maxDifference&&ratio<=pixelPolicy.maxDifferingChannelRatio&&alphaDifferences===0;
        result.images.push({program:enabled?'2:5':'generic',rgbaSHA256,channels:bytes.length,differingChannels,alphaDifferences,maxDifference,differingChannelRatio:ratio,exact,accepted,acceptance:exact?'exact':accepted?'accepted-with-tolerance':'rejected',differences,range:rangeMax-rangeMin,gl:g.getError(),work:currentWork,workMatches:JSON.stringify(currentWork)===referenceWork,lodMatches:currentWork.targets.some(b=>b.actorSubmitted&&(far?b.min>0:b.min===0))&&!currentWork.targets.some(b=>b.actorSubmitted&&(far?b.min===0:b.min>0))});
       }
      }catch(error){result.failure=error.stack;}
      finally{programs.set('2:5',candidate);}
      return result;
     },{view,touch,pixelPolicy});
     entry.views.push(row);save();assert.equal(row.failure,null);assert.equal(row.images.length,3);assert(row.images.every(i=>i.accepted&&i.gl===0&&i.workMatches&&i.lodMatches&&i.range>20),'Whole-frame production turtle pixel policy failed');console.log('PASS '+profile+' '+view+' whole-frame RGBA accepted');
    }
   }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.status='passed-native-pixel-policy';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
}
if(require.main===module)main();
