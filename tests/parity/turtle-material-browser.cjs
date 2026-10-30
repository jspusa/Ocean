/* Native diagnostic of production turtle material arithmetic, not a beauty
 * render or device performance result. Root serializes all GPU execution.
 * Actual uploaded turtle triangles/instance metadata/textures are retained.
 * VS is unchanged; FS only returns base/n/geomN/vLocal immediately before
 * lighting. Camera and animal rotate together, so interior pixels refer to
 * the same anatomical point. No replacement material formula is evaluated. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;

// Select intact, nondegenerate triangles from the real uploaded index buffer.
// Head samples exclude the eye/beak/caps; flippers exclude their collapsed tips.
function selectTriangle(vertices,indices,part){
 const target=part==='head'?[.95,.075,.095]:part==='flipper'?[.05,-.07,1.06]:[-.25,.24,.25];
 let best=null;
 for(let offset=0;offset<indices.length;offset+=3){
  const ids=[indices[offset],indices[offset+1],indices[offset+2]],p=ids.map(id=>Array.from(vertices.slice(id*12,id*12+3))),tags=ids.map(id=>vertices[id*12+11]);
  if(!tags.every(tag=>Math.abs(tag-(part==='shell'?1:2))<1e-6))continue;
  const center=[0,1,2].map(k=>(p[0][k]+p[1][k]+p[2][k])/3),normal=[0,1,2].map(k=>ids.reduce((sum,id)=>sum+vertices[id*12+3+k],0)/3);
  const length=Math.hypot(...normal);if(!length)continue;for(let k=0;k<3;k++)normal[k]/=length;
  if(part==='head'&&!(center[0]>.84&&center[0]<1.09&&center[1]>.015&&center[2]>.035&&normal[1]>.50&&normal[1]<.88&&Math.abs(normal[0])<.35))continue;
  if(part==='flipper'&&!(center[0]>-.4&&center[0]<.4&&center[2]>.85&&center[2]<1.35&&normal[1]>.55))continue;
  if(part==='shell'&&!(center[0]>-.65&&center[0]<.3&&center[1]>.12&&center[2]>.08&&center[2]<.5&&normal[1]>.65))continue;
  const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],area=Math.hypot(...cross);
  if(area<1e-7)continue;
  const score=center.reduce((sum,v,k)=>sum+(v-target[k])**2,0);
  if(!best||score<best.score)best={part,offset,ids,center,normal,area,score};
 }
 if(!best)throw Error('No intact actual turtle '+part+' triangle found');return best;
}

async function main(){
 const out=path.resolve(option('out','qa/parity/v01838-material/turtle-material.json'));
 const report={status:'running',method:'Installed Chrome native GPU. Actual uploaded turtle-002 high/low triangle records and original instance phenotype, production VS and FS/material 5, original loaded textures. Only pre-lighting diagnostic output is inserted. Matched camera/animal rigid rotations; samples are interior pixels with matching model-space coordinates. This is a numerical material regression, not beauty-render acceptance or a physical-phone/FPS claim.',checks:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const context=await browser.newContext({viewport:{width:1000,height:700},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');
  await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.diagnostic=await page.evaluate(async({selector})=>{
   window.__freeze=true;settings.adaptive=false;active=false;
   const g=renderer.gl,ext=g.getExtension('WEBGL_debug_renderer_info'),hardware=ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/software|swiftshader|llvmpipe/i.test(hardware))throw Error('Native hardware WebGL is required: '+hardware);
   if(!g.getExtension('EXT_color_buffer_float'))throw Error('Float diagnostic readback requires EXT_color_buffer_float');
   const actor=life.find(f=>f.uid==='turtle-002');if(!actor)throw Error('Actual turtle-002 is required');
   await renderer.loaded;await renderer.sceneStream?.ready(actor.p);
   const originalBatches=renderer.batches.filter(b=>b.kind===2&&b.material===5&&b.instances.includes(actor)).sort((a,b)=>(a.minDistance||0)-(b.minDistance||0));
   if(originalBatches.length!==2||!originalBatches.every(b=>b.vb&&b.eb))throw Error('Both actual compiled turtle LOD buffers must be resident');
   if(Math.max(...actor.s)-Math.min(...actor.s)>1e-7)throw Error('This rigid-rotation witness requires the existing uniform turtle instance scale');
   const select=new Function('return ('+selector+')')();
   const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
   const anchor=' vec3 L=normalize(vWorld.y<0.?uLightDir:uAirLightDir);';
   if(FS.split(anchor).length!==2)throw Error('Production pre-lighting diagnostic seam changed; review the harness');
   const diagnosticFS=FS.replace('out vec4 frag;','out vec4 frag;uniform int uMaterialDiagnostic;').replace(anchor,
    ' frag=vec4(uMaterialDiagnostic==0?base:uMaterialDiagnostic==1?n:uMaterialDiagnostic==2?geomN:vLocal,1.);return;\n'+anchor);
   if(diagnosticFS===FS)throw Error('Diagnostic output was not inserted');
   const program=renderer.makeProgram(VS,diagnosticFS);
   // Link transform feedback to the very same production VS. Its actual posed
   // triangle supplies the diagnostic camera; no CPU copy of the fin rig is used.
   g.transformFeedbackVaryings(program.p,['vWorld','vNormal'],g.INTERLEAVED_ATTRIBS);g.linkProgram(program.p);
   if(!g.getProgramParameter(program.p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program.p));program.u={};
   const size=96,framebuffer=g.createFramebuffer(),color=g.createTexture();
   g.bindTexture(g.TEXTURE_2D,color);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,size,size);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
   g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,color,0);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Incomplete float diagnostic target');
   const feedback=g.createTransformFeedback(),feedbackBuffer=g.createBuffer();g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,feedbackBuffer);g.bufferData(g.TRANSFORM_FEEDBACK_BUFFER,3*6*4,g.STREAM_READ);g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,null);
   const add=(a,b)=>a.map((v,k)=>v+b[k]),sub=(a,b)=>a.map((v,k)=>v-b[k]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((sum,v,k)=>sum+v*b[k],0),norm=a=>mul(a,1/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
   const rotate=(p,yaw,pitch)=>{const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),x=p[0]*cp-p[1]*sp,y=p[0]*sp+p[1]*cp;return [cy*x+sy*p[2],y,-sy*x+cy*p[2]];};
   const quantile=(values,q)=>values.slice().sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(q*values.length))];
   const originalOrigin=renderer.renderOrigin,originalQuality=renderer.quality,created=[],rows=[],geometry=[];
   renderer.renderOrigin=[0,0,0];g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.DITHER);g.disable(g.SCISSOR_TEST);g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);g.colorMask(true,true,true,true);
   const skinSampler={textures:renderer.textures.length};
   renderer.bindTex(5,renderer.textures[5]);skinSampler.wrapS=g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_S);skinSampler.wrapT=g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_T);skinSampler.minFilter=g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER);
   if(skinSampler.textures!==9||skinSampler.wrapS!==g.MIRRORED_REPEAT||skinSampler.wrapT!==g.MIRRORED_REPEAT||skinSampler.minFilter!==g.LINEAR_MIPMAP_LINEAR)throw Error('Skin sampler must reuse one of the nine mipmapped slots with continuous mirror boundaries');
   const setup=(batch,time,eye,vp,quality,mode)=>{
    renderer.quality=quality;renderer.common(program,eye,vp,time);renderer.batchUniforms(program,batch,{});renderer.set1i(program,'uSamples',0);renderer.set1i(program,'uMaterialDiagnostic',mode);renderer.set3f(program,'uLODBounds',0,10000,0);
    for(const [i,name]of ['uSand','uSandN','uRock','uRockN','uShell','uTurtleSkin','uCoral','uCoralN'].entries()){renderer.bindTex(i,renderer.textures[i]);renderer.set1i(program,name,i);}
    renderer.updateBatch(batch);g.bindVertexArray(batch.vao);
   };
   try{
    for(let lod=0;lod<originalBatches.length;lod++){
     const original=originalBatches[lod],vertices=new Float32Array(original.vertexCount*12),indices=original.indexType===g.UNSIGNED_SHORT?new Uint16Array(original.count):new Uint32Array(original.count);
     g.bindBuffer(g.COPY_READ_BUFFER,original.vb);g.getBufferSubData(g.COPY_READ_BUFFER,0,vertices);g.bindBuffer(g.COPY_READ_BUFFER,original.eb);g.getBufferSubData(g.COPY_READ_BUFFER,0,indices);g.bindBuffer(g.COPY_READ_BUFFER,null);
     const expected=indexGeometry((lod===0?turtleGeometry():distantTurtle()).v);
     let maxVertexError=0;for(let i=0;i<vertices.length;i++)maxVertexError=Math.max(maxVertexError,Math.abs(vertices[i]-expected.vertices[i]));
     if(vertices.length!==expected.vertices.length||indices.length!==expected.indices.length||!Number.isFinite(maxVertexError)||maxVertexError>1e-6||indices.some((value,i)=>value!==expected.indices[i]))throw Error('Uploaded turtle LOD '+lod+' differs from authored geometry');
     geometry.push({lod,vertices:original.vertexCount,indices:original.count,indicesExact:true,maxVertexError});
     for(const [part,time]of [['head',6],['flipper',6],['flipper',7.7],['shell',6]]){
      const selected=select(vertices,indices,part),triangle=new Float32Array(36);selected.ids.forEach((id,k)=>triangle.set(vertices.subarray(id*12,id*12+12),k*12));
      const pose={...actor,p:[0,0,0],yaw:0,pitch:0,s:actor.s.slice()},batch=renderer.batch({indexed:{vertices:triangle,indices:new Uint32Array([0,1,2]),radius:original.radius},material:original.material,species:original.species},[pose],original.kind,true);created.push(batch);
      // These 36 floats are exact copies of the original three vertex records.
      if(triangle.some((value,k)=>value!==vertices[selected.ids[Math.floor(k/12)]*12+k%12]))throw Error('Diagnostic triangle changed authored vertex attributes');
      const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);setup(batch,time,[0,0,4],identity,2,3);
      g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,feedback);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,feedbackBuffer);g.enable(g.RASTERIZER_DISCARD);g.beginTransformFeedback(g.TRIANGLES);g.drawArraysInstanced(g.TRIANGLES,0,3,1);g.endTransformFeedback();g.disable(g.RASTERIZER_DISCARD);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);
      const posed=new Float32Array(18);g.bindBuffer(g.COPY_READ_BUFFER,feedbackBuffer);g.getBufferSubData(g.COPY_READ_BUFFER,0,posed);g.bindBuffer(g.COPY_READ_BUFFER,null);
      if(!posed.every(Number.isFinite))throw Error('Nonfinite production VS pose');
      const points=[0,1,2].map(i=>Array.from(posed.slice(i*6,i*6+3))),normals=[0,1,2].map(i=>Array.from(posed.slice(i*6+3,i*6+6))),center=mul(add(add(points[0],points[1]),points[2]),1/3),edge=sub(points[1],points[0]);
      let normal=norm(cross(edge,sub(points[2],points[0])));if(dot(normal,add(add(normals[0],normals[1]),normals[2]))<0)normal=mul(normal,-1);
      const extent=Math.max(...points.map(p=>Math.hypot(...sub(p,center))))*1.35,eye=add(center,mul(normal,1)),up=norm(edge);
      if(!Number.isFinite(extent)||extent<1e-5)throw Error('Production posed triangle collapsed');
      for(const quality of [0,1,2]){
       const renders=[];
       for(const rotation of [{id:'identity',yaw:0,pitch:0},{id:'yaw90',yaw:Math.PI/2,pitch:0},{id:'pitch90',yaw:0,pitch:Math.PI/2}]){
        pose.yaw=rotation.yaw;pose.pitch=rotation.pitch;const r=p=>rotate(p,rotation.yaw,rotation.pitch),at=r(eye),target=r(center),vp=mm(ortho(-extent,extent,-extent,extent,.01,3),lookAt(at,target,r(up))),outputs=[];
        for(let mode=0;mode<4;mode++){
         g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.viewport(0,0,size,size);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);setup(batch,time,at,vp,quality,mode);g.drawElementsInstanced(g.TRIANGLES,3,batch.indexType,0,1);
         const pixels=new Float32Array(size*size*4);g.readPixels(0,0,size,size,g.RGBA,g.FLOAT,pixels);const error=g.getError();if(error)throw Error('Diagnostic GL error '+error+' at '+part+'/'+rotation.id+'/'+mode);outputs.push(pixels);
        }
        renders.push({...rotation,outputs});
       }
       const reference=renders[0];
       for(const rotated of renders.slice(1)){
        const localErrors=[],baseErrors=[],normalErrors=[],geometryErrors=[],normalLengths=[],nyBefore=[],nyAfter=[];let witness=null;
        // A central 12x12 patch, eroded by two pixels, excludes all raster edges.
        // Coverage and vLocal agreement are independent prerequisites, so a
        // camera/raster mismatch cannot masquerade as a material regression.
        for(let y=size/2-6;y<size/2+6;y++)for(let x=size/2-6;x<size/2+6;x++){
         let interior=true;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const j=((y+dy)*size+x+dx)*4+3;if(reference.outputs[3][j]<.99||rotated.outputs[3][j]<.99)interior=false;}if(!interior)continue;
         const k=(y*size+x)*4,read=(render,mode)=>Array.from(render.outputs[mode].slice(k,k+3)),a=read(reference,3),b=read(rotated,3),localError=Math.max(...sub(a,b).map(Math.abs));localErrors.push(localError);
         const baseA=read(reference,0),baseB=read(rotated,0),nA=read(reference,1),nB=read(rotated,1),geoA=read(reference,2),geoB=read(rotated,2),normalExpected=rotate(nA,rotated.yaw,rotated.pitch),geoExpected=rotate(geoA,rotated.yaw,rotated.pitch);
         const values=[...a,...b,...baseA,...baseB,...nA,...nB,...geoA,...geoB];if(!values.every(Number.isFinite))throw Error('Nonfinite production material output');
         const colorError=Math.max(...sub(baseA,baseB).map(Math.abs)),normalError=Math.hypot(...sub(normalExpected,nB));baseErrors.push(colorError);normalErrors.push(normalError);geometryErrors.push(Math.hypot(...sub(geoExpected,geoB)));normalLengths.push(Math.abs(Math.hypot(...nA)-1),Math.abs(Math.hypot(...nB)-1));nyBefore.push(Math.abs(geoA[1]));nyAfter.push(Math.abs(geoB[1]));
         if(!witness||colorError+normalError>witness.error)witness={pixel:[x,y],local:a,matchedLocal:b,baseA,baseB,normalA:nA,normalExpected,normalActual:nB,error:colorError+normalError};
        }
        if(localErrors.length<16)throw Error('Fewer than 16 interior anatomical samples: '+part+'/'+lod+'/'+rotated.id);
        rows.push({lod,part,time,quality,rotation:rotated.id,triangle:{offset:selected.offset,ids:selected.ids,center:selected.center,normal:selected.normal},samples:localErrors.length,maximumLocalError:Math.max(...localErrors),maximumGeometryNormalError:Math.max(...geometryErrors),maximumUnitNormalError:Math.max(...normalLengths),baseP95:quantile(baseErrors,.95),normalP95:quantile(normalErrors,.95),oldProjectionBoundary:{before:[Math.min(...nyBefore),Math.max(...nyBefore)],after:[Math.min(...nyAfter),Math.max(...nyAfter)]},witness});
       }
      }
     }
    }
    return {hardware,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,worldVersion:OPEN_WORLD.version,uid:actor.uid,actorScale:actor.s.slice(),sourceSHA256:{VS:await digest(VS),FS:await digest(FS)},diagnostic:'base, world normal, geometry normal, model position before lighting; RGBA32F; no multisampling',geometry,skinSampler,rows};
   }finally{
    for(const batch of created){renderer.batches.splice(renderer.batches.indexOf(batch),1);g.deleteVertexArray(batch.vao);g.deleteBuffer(batch.vb);g.deleteBuffer(batch.eb);g.deleteBuffer(batch.ib);}
    renderer.renderOrigin=originalOrigin;renderer.quality=originalQuality;g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);g.deleteProgram(program.p);g.deleteBuffer(feedbackBuffer);g.deleteTransformFeedback(feedback);g.deleteFramebuffer(framebuffer);g.deleteTexture(color);
   }
  },{selector:selectTriangle.toString()});
  const d=report.diagnostic;assert(d.compiled&&d.streamed,'Use the actual compiled/streamed world');
  const record=(name,condition,evidence)=>report.checks.push({name,passed:!!condition,evidence});
  record('all LODs and quality tiers execute finite unit normals on actual head, shell and both fin poses',d.geometry.length===2&&d.rows.length===48&&d.rows.every(r=>r.samples>=16&&r.maximumUnitNormalError<.0002),{rows:d.rows.length,maximumUnitNormalError:Math.max(...d.rows.map(r=>r.maximumUnitNormalError))});
  record('matched anatomical pixels and production geometric normals survive the rigid transform',d.rows.every(r=>r.maximumLocalError<.00003&&r.maximumGeometryNormalError<.0002),{maximumLocalError:Math.max(...d.rows.map(r=>r.maximumLocalError)),maximumGeometryNormalError:Math.max(...d.rows.map(r=>r.maximumGeometryNormalError))});
  const head=d.rows.filter(r=>r.part==='head'&&r.rotation==='pitch90');
  record('actual head witness crosses the historical world-normal projection boundary',head.length===6&&head.every(r=>r.oldProjectionBoundary.before[0]>.42&&r.oldProjectionBoundary.after[1]<.42),head.map(r=>({lod:r.lod,quality:r.quality,...r.oldProjectionBoundary})));
  record('anatomical material base is invariant under matched animal/camera rotation',d.rows.every(r=>r.baseP95<.008),d.rows.filter(r=>r.baseP95>=.008).map(r=>({lod:r.lod,part:r.part,time:r.time,quality:r.quality,rotation:r.rotation,baseP95:r.baseP95,witness:r.witness})));
  record('material normal perturbation rotates with the turtle surface',d.rows.every(r=>r.normalP95<.008),d.rows.filter(r=>r.normalP95>=.008).map(r=>({lod:r.lod,part:r.part,time:r.time,quality:r.quality,rotation:r.rotation,normalP95:r.normalP95,witness:r.witness})));
  record('no native page or GL errors',report.errors.length===0,report.errors);
  report.status=report.checks.every(c=>c.passed)?'passed-material-diagnostic-visual-review-separate':'failed-material-diagnostic';save();
  for(const check of report.checks)console.log((check.passed?'PASS ':'FAIL ')+check.name);
  if(report.checks.some(c=>!c.passed))process.exitCode=1;
 }catch(error){report.status='failed-harness-or-runtime';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
}
module.exports={selectTriangle};
if(require.main===module)main();
