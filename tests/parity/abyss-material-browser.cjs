/* Native diagnostic of production abyss material arithmetic, not a beauty
 * render or device performance result. Root serializes all GPU execution.
 * Actual uploaded deep-animal triangles/instance metadata/textures are retained.
 * VS is unchanged; FS only returns base/n/geomN/vLocal/rough/rawColour before
 * lighting output. Camera and animal rotate together, so interior pixels refer to
 * the same anatomical point. No replacement material formula is evaluated. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;

// Choose one deterministic nondegenerate triangle per semantic tissue from the
// actual uploaded geometry. No colour/normal value is authored by this fixture.
function selectTriangle(vertices,indices,part,species){
 const tag={body:1,mouth:1,fin:3,eye:4,oral:2}[part];
 const target=part==='mouth'?[.44,-.03,.06]:part==='body'?(species==='coelacanth'?[-.04,.025,.065]:species==='pelican_eel'?[.28,-.015,.105]:[-.08,.04,.22]):part==='eye'?[.35,.055,.05]:part==='oral'?[.30,-.08,.07]:species==='coelacanth'?[.07,-.08,.17]:species==='pelican_eel'?[-.24,.015,.012]:[-.20,.12,.015];
 let best=null;
 for(let offset=0;offset<indices.length;offset+=3){
  const ids=[indices[offset],indices[offset+1],indices[offset+2]],p=ids.map(id=>Array.from(vertices.slice(id*12,id*12+3)));
  if(!ids.every(id=>Math.abs(vertices[id*12+11]-tag)<1e-6))continue;
  if(part==='body'&&species!=='coelacanth'&&ids.some(id=>Math.max(...vertices.slice(id*12+6,id*12+9))>.30))continue;
  // Original authored dark lip vertices label this tissue, independently of
  // the shader mask/output. Low LOD interpolates a third ordinary-skin corner.
  if(part==='mouth'&&(species!=='coelacanth'||!p.every(v=>v[0]>.36&&v[2]>.02)||ids.filter(id=>vertices[id*12+8]<.21).length<2||ids.reduce((sum,id)=>sum+vertices[id*12+8],0)/3>=.25))continue;
  const center=[0,1,2].map(k=>(p[0][k]+p[1][k]+p[2][k])/3),normal=[0,1,2].map(k=>ids.reduce((sum,id)=>sum+vertices[id*12+3+k],0)/3),length=Math.hypot(...normal);
  if(!length)continue;for(let k=0;k<3;k++)normal[k]/=length;
  const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],area=Math.hypot(...cross);
  const edgeSquared=Math.max(...[[0,1],[1,2],[2,0]].map(([i,j])=>p[i].reduce((sum,v,k)=>sum+(v-p[j][k])**2,0))),shape=area/edgeSquared;
  // Geometry-only selection: avoid near-degenerate strips, fin sidewalls and
  // the underside of an embedded eye. Identical rules apply to both LODs.
  if(area<1e-11||shape<.08)continue;
  if(part==='eye'&&normal[2]<.20)continue;
  if(part==='fin'&&species==='humpback_anglerfish'&&Math.abs(normal[2])<.60)continue;
  const score=center.reduce((sum,v,k)=>sum+(v-target[k])**2,0)+(part==='body'&&normal[2]<.35?.2:0);
  if(!best||score<best.score)best={part,tag,offset,ids,center,normal,area,shape,score};
 }
 if(!best)throw Error('No intact actual '+species+' '+part+' triangle');return best;
}

async function main(){
 const out=path.resolve(option('out','qa/parity/v01846-material/abyss-material.json'));
 const report={status:'running',method:'Installed Chrome native GPU. Actual uploaded coelacanth/pelican-eel/anglerfish high/low triangle records and original instance phenotype, production VS and FS/material 0, original loaded textures. Only pre-lighting diagnostic output is inserted. Matched camera/animal rigid rotations; samples are interior pixels with matching model-space coordinates. This is a numerical material regression, not beauty-render acceptance or a physical-phone/FPS claim.',checks:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let browser,page;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const context=await browser.newContext({viewport:{width:1000,height:700},deviceScaleFactor:1});page=await context.newPage();
  report.warnings=[];page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());else if(message.type()==='warning')report.warnings.push(message.text());});
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');
  await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.diagnostic=await page.evaluate(async({selector})=>{
   window.__freeze=true;settings.adaptive=false;active=false;
   const g=renderer.gl,ext=g.getExtension('WEBGL_debug_renderer_info'),hardware=ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/software|swiftshader|llvmpipe/i.test(hardware))throw Error('Native hardware WebGL is required: '+hardware);
   if(!g.getExtension('EXT_color_buffer_float'))throw Error('Float diagnostic readback requires EXT_color_buffer_float');
   await renderer.loaded;
   const identities=['coelacanth','pelican_eel','humpback_anglerfish'],actors=identities.map(id=>{const actor=life.find(f=>SPECIES[f.species]?.id===id);if(!actor)throw Error('Actual '+id+' actor missing');return {id,actor};});
   const select=new Function('return ('+selector+')')();
   const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
   const anchor=' vec3 albedo=pow(clamp(base,vec3(0.),vec3(1.)),vec3(2.2));';
   if(FS.split(anchor).length!==2)throw Error('Production pre-lighting diagnostic seam changed; review the harness');
   const diagnosticFS=FS.replace('out vec4 frag;','out vec4 frag;uniform int uMaterialDiagnostic;').replace(anchor,
    ' frag=vec4(uMaterialDiagnostic==0?base:uMaterialDiagnostic==1?n:uMaterialDiagnostic==2?geomN:uMaterialDiagnostic==3?vLocal:uMaterialDiagnostic==4?vec3(rough):vColor,1.);return;\n'+anchor);
   if(diagnosticFS===FS)throw Error('Diagnostic output was not inserted');
   const attachedOriginal=g.getAttachedShaders(renderer.program.p)||[];
   if(!attachedOriginal.some(s=>g.getShaderParameter(s,g.SHADER_TYPE)===g.VERTEX_SHADER&&g.getShaderSource(s)===VS)||!attachedOriginal.some(s=>g.getShaderParameter(s,g.SHADER_TYPE)===g.FRAGMENT_SHADER&&g.getShaderSource(s)===FS))throw Error('Loaded production generic shaders do not match their source');
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
   window.__abyssMaterialDiagnosticProgress={rows,geometry,current:null};
   renderer.renderOrigin=[0,0,0];g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.DITHER);g.disable(g.SCISSOR_TEST);g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);g.colorMask(true,true,true,true);
   const texturesBefore=renderer.textures.slice();
   const setup=(batch,time,eye,vp,quality,mode)=>{
    renderer.quality=quality;renderer.common(program,eye,vp,time);renderer.batchUniforms(program,batch,{});renderer.set1i(program,'uSamples',0);renderer.set1i(program,'uMaterialDiagnostic',mode);renderer.set3f(program,'uLODBounds',0,10000,0);
    for(const [i,name]of ['uSand','uSandN','uRock','uRockN','uShell','uTurtleSkin','uCoral','uCoralN'].entries()){renderer.bindTex(i,renderer.textures[i]);renderer.set1i(program,name,i);}
    // The final-profile seam follows visibility(), so shadow samplers remain
    // active even though the diagnostic output itself does not use lighting.
    // Retain production units; the default unit 0 aliases sampler2DShadow with
    // sampler2D and invalidates the draw before transform feedback can run.
    renderer.bindTex(8,renderer.shadowTexture);g.bindSampler(8,renderer.shadowSampler);renderer.set1i(program,'uShadow',8);
    renderer.bindTex(10,renderer.dynamicShadowTexture);g.bindSampler(10,renderer.shadowSampler);renderer.set1i(program,'uDynamicShadow',10);
    renderer.updateBatch(batch);if(batch.drawCount!==1)throw Error('Diagnostic instance not packed: '+JSON.stringify({drawCount:batch.drawCount,ecologyPresent:batch.instances[0].ecologyPresent,encounterPresent:batch.instances[0].encounterPresent,uid:batch.instances[0].uid}));g.bindVertexArray(batch.vao);
   };
   try{
    for(const {id,actor}of actors){
     await renderer.sceneStream?.ready(actor.p);
     const originalBatches=renderer.batches.filter(b=>!b.shadowProxy&&b.kind===10&&b.material===0&&b.instances.includes(actor)).sort((a,b)=>(a.minDistance||0)-(b.minDistance||0));
     if(originalBatches.length!==2||!originalBatches.every(b=>b.vb&&b.eb))throw Error('Both actual compiled '+id+' LOD buffers must be resident');
     if(Math.max(...actor.s)-Math.min(...actor.s)>1e-7)throw Error('Rigid witness requires existing uniform '+id+' instance scale');
    for(let lod=0;lod<originalBatches.length;lod++){
     const original=originalBatches[lod],vertices=new Float32Array(original.vertexCount*12),indices=original.indexType===g.UNSIGNED_SHORT?new Uint16Array(original.count):new Uint32Array(original.count);
     g.bindBuffer(g.COPY_READ_BUFFER,original.vb);g.getBufferSubData(g.COPY_READ_BUFFER,0,vertices);g.bindBuffer(g.COPY_READ_BUFFER,original.eb);g.getBufferSubData(g.COPY_READ_BUFFER,0,indices);g.bindBuffer(g.COPY_READ_BUFFER,null);
     const expected=indexGeometry(faunaGeometry(id,lod===1).v);
     let maxVertexError=0;for(let i=0;i<vertices.length;i++)maxVertexError=Math.max(maxVertexError,Math.abs(vertices[i]-expected.vertices[i]));
     if(vertices.length!==expected.vertices.length||indices.length!==expected.indices.length||!Number.isFinite(maxVertexError)||maxVertexError>1e-6||indices.some((value,i)=>value!==expected.indices[i]))throw Error('Uploaded '+id+' LOD '+lod+' differs from authored geometry');
     geometry.push({id,uid:actor.uid,scale:actor.s.slice(),lod,vertices:original.vertexCount,indices:original.count,indicesExact:true,maxVertexError});
     const tissues=[['body',0],['body',2.13],['fin',0],['fin',2.13],['eye',0],...(id!=='coelacanth'?[['oral',0]]:[['mouth',0]])];
     for(const [part,time]of tissues){
      window.__abyssMaterialDiagnosticProgress.current={id,lod,part,time};
      const selected=select(vertices,indices,part,id),triangle=new Float32Array(36);selected.ids.forEach((id,k)=>triangle.set(vertices.subarray(id*12,id*12+12),k*12));
      const pose={...actor,p:[0,0,0],yaw:0,pitch:0,s:actor.s.slice()},batch=renderer.batch({indexed:{vertices:triangle,indices:new Uint32Array([0,1,2]),radius:original.radius},material:original.material,species:original.species},[pose],original.kind,true);created.push(batch);
      // These 36 floats are exact copies of the original three vertex records.
      if(triangle.some((value,k)=>value!==vertices[selected.ids[Math.floor(k/12)]*12+k%12]))throw Error('Diagnostic triangle changed authored vertex attributes');
      const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);setup(batch,time,[0,0,4],identity,2,3);
      g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,feedback);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,feedbackBuffer);g.enable(g.RASTERIZER_DISCARD);g.beginTransformFeedback(g.TRIANGLES);g.drawArraysInstanced(g.TRIANGLES,0,3,1);g.endTransformFeedback();g.disable(g.RASTERIZER_DISCARD);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);
      const posed=new Float32Array(18);g.bindBuffer(g.COPY_READ_BUFFER,feedbackBuffer);g.getBufferSubData(g.COPY_READ_BUFFER,0,posed);g.bindBuffer(g.COPY_READ_BUFFER,null);
      const feedbackError=g.getError();if(feedbackError)throw Error('Transform feedback GL error '+feedbackError);if(!posed.every(Number.isFinite))throw Error('Nonfinite production VS pose');
      const points=[0,1,2].map(i=>Array.from(posed.slice(i*6,i*6+3))),normals=[0,1,2].map(i=>Array.from(posed.slice(i*6+3,i*6+6))),center=mul(add(add(points[0],points[1]),points[2]),1/3),edge=sub(points[1],points[0]);
      let normal=norm(cross(edge,sub(points[2],points[0])));if(dot(normal,add(add(normals[0],normals[1]),normals[2]))<0)normal=mul(normal,-1);
      // Fit to the same posed triangle at every scale, including millimetre
      // eyes, rather than using a whole-animal camera with empty pixel patches.
      const extent=Math.max(...points.map(p=>Math.hypot(...sub(p,center))))*1.35,eye=add(center,mul(normal,Math.max(extent*8,.02))),up=norm(edge);
      if(!Number.isFinite(extent)||extent<1e-8)throw Error('Production posed triangle collapsed');
      // Fit each view axis separately. Long thin fin triangles must retain
      // interior samples without replacing the authored geometry or weakening
      // the coverage gate. The same projection follows each rigid rotation.
      const right=norm(cross(up,normal)),extentX=Math.max(...points.map(p=>Math.abs(dot(sub(p,center),right))))*1.35,extentY=Math.max(...points.map(p=>Math.abs(dot(sub(p,center),up))))*1.35;
      if(Math.min(extentX,extentY)<1e-9)throw Error('Production triangle has no two-dimensional diagnostic extent');
      for(const quality of [0,1,2]){
       const renders=[];
       for(const rotation of [{id:'identity',yaw:0,pitch:0},{id:'yaw90',yaw:Math.PI/2,pitch:0},{id:'pitch90',yaw:0,pitch:Math.PI/2}]){
        pose.yaw=rotation.yaw;pose.pitch=rotation.pitch;const r=p=>rotate(p,rotation.yaw,rotation.pitch),at=r(eye),target=r(center),vp=mm(ortho(-extentX,extentX,-extentY,extentY,.01,3),lookAt(at,target,r(up))),outputs=[];
        for(let mode=0;mode<6;mode++){
         g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.viewport(0,0,size,size);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);setup(batch,time,at,vp,quality,mode);g.drawElementsInstanced(g.TRIANGLES,3,batch.indexType,0,1);
         const pixels=new Float32Array(size*size*4);g.readPixels(0,0,size,size,g.RGBA,g.FLOAT,pixels);const error=g.getError();if(error)throw Error('Diagnostic GL error '+error+' at '+part+'/'+rotation.id+'/'+mode);outputs.push(pixels);
        }
        renders.push({...rotation,outputs});
       }
       const reference=renders[0];
       for(const rotated of renders.slice(1)){
        const localErrors=[],baseErrors=[],roughErrors=[],normalErrors=[],geometryErrors=[],normalLengths=[],bumpLengths=[],protectedPigmentErrors=[],roughValues=[],mouthPigmentRatios=[],mouthAuthoredBlue=[];let witness=null;
        // A central 12x12 patch, eroded by two pixels, excludes all raster edges.
        // Coverage and vLocal agreement are independent prerequisites, so a
        // camera/raster mismatch cannot masquerade as a material regression.
        for(let y=size/2-6;y<size/2+6;y++)for(let x=size/2-6;x<size/2+6;x++){
         let interior=true;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const j=((y+dy)*size+x+dx)*4+3;if(reference.outputs[3][j]<.99||rotated.outputs[3][j]<.99)interior=false;}if(!interior)continue;
         const k=(y*size+x)*4,read=(render,mode)=>Array.from(render.outputs[mode].slice(k,k+3)),a=read(reference,3),b=read(rotated,3),localError=Math.max(...sub(a,b).map(Math.abs));localErrors.push(localError);
         const baseA=read(reference,0),baseB=read(rotated,0),nA=read(reference,1),nB=read(rotated,1),geoA=read(reference,2),geoB=read(rotated,2),normalExpected=rotate(nA,rotated.yaw,rotated.pitch),geoExpected=rotate(geoA,rotated.yaw,rotated.pitch);
         const values=[...a,...b,...baseA,...baseB,...nA,...nB,...geoA,...geoB];if(!values.every(Number.isFinite))throw Error('Nonfinite production material output');
         const colorError=Math.max(...sub(baseA,baseB).map(Math.abs)),normalError=Math.hypot(...sub(normalExpected,nB));baseErrors.push(colorError);normalErrors.push(normalError);geometryErrors.push(Math.hypot(...sub(geoExpected,geoB)));normalLengths.push(Math.abs(Math.hypot(...nA)-1),Math.abs(Math.hypot(...nB)-1));bumpLengths.push(Math.hypot(...sub(nA,geoA)));
         const roughA=read(reference,4)[0],roughB=read(rotated,4)[0],rawA=read(reference,5).map(v=>Math.max(v,.001));if(!Number.isFinite(roughA)||!Number.isFinite(roughB))throw Error('Nonfinite final roughness');roughErrors.push(Math.abs(roughA-roughB));roughValues.push(roughA,roughB);protectedPigmentErrors.push(Math.max(...sub(baseA,rawA).map(Math.abs)));
         if(part==='mouth'){const rawB=read(rotated,5).map(v=>Math.max(v,.001)),tintBlue=batch.data[9];mouthAuthoredBlue.push(rawA[2]/tintBlue,rawB[2]/tintBlue);for(let i=0;i<3;i++)mouthPigmentRatios.push(Math.abs(baseA[i]/rawA[i]-1),Math.abs(baseB[i]/rawB[i]-1));}
         if(!witness||colorError+normalError>witness.error)witness={pixel:[x,y],local:a,matchedLocal:b,baseA,baseB,normalA:nA,normalExpected,normalActual:nB,error:colorError+normalError};
        }
        if(localErrors.length<16)throw Error('Fewer than 16 interior anatomical samples: '+part+'/'+lod+'/'+rotated.id);
        rows.push({id,uid:actor.uid,lod,part,time,quality,rotation:rotated.id,triangle:{offset:selected.offset,ids:selected.ids,center:selected.center,normal:selected.normal,shape:selected.shape},projectionHalfExtents:[extentX,extentY],samples:localErrors.length,maximumLocalError:Math.max(...localErrors),maximumGeometryNormalError:Math.max(...geometryErrors),maximumUnitNormalError:Math.max(...normalLengths),baseP95:quantile(baseErrors,.95),normalP95:quantile(normalErrors,.95),roughP95:quantile(roughErrors,.95),roughRange:[Math.min(...roughValues),Math.max(...roughValues)],bumpMaximum:Math.max(...bumpLengths),bumpP95:quantile(bumpLengths,.95),protectedPigmentMaximum:Math.max(...protectedPigmentErrors),mouth:part==='mouth'?{maximumRelativePigmentChange:Math.max(...mouthPigmentRatios),authoredBlueRange:[Math.min(...mouthAuthoredBlue),Math.max(...mouthAuthoredBlue)]}:null,witness});
       }
      }
     }
    }
    }
    if(renderer.textures.length!==texturesBefore.length||renderer.textures.some((v,i)=>v!==texturesBefore[i]))throw Error('Material diagnostic changed production texture inventory');
    return {hardware,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,worldVersion:OPEN_WORLD.version,sourceSHA256:{VS:await digest(VS),FS:await digest(FS)},diagnostic:'base, world normal, geometry normal, model position, final roughness, raw vColor after material profiles and before lighting output; RGBA32F; no multisampling',geometry,textureCount:texturesBefore.length,rows};
   }finally{
    for(const batch of created){renderer.batches.splice(renderer.batches.indexOf(batch),1);g.deleteVertexArray(batch.vao);g.deleteBuffer(batch.vb);g.deleteBuffer(batch.eb);g.deleteBuffer(batch.ib);}
    renderer.renderOrigin=originalOrigin;renderer.quality=originalQuality;g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);g.deleteProgram(program.p);g.deleteBuffer(feedbackBuffer);g.deleteTransformFeedback(feedback);g.deleteFramebuffer(framebuffer);g.deleteTexture(color);
   }
  },{selector:selectTriangle.toString()});
  const d=report.diagnostic;assert(d.compiled&&d.streamed,'Use the actual compiled/streamed world');
  const record=(name,condition,evidence)=>report.checks.push({name,passed:!!condition,evidence});
  const expectedRows=216;
  record('all species, both LODs, tissue parts, poses and quality tiers have nonempty finite unit-normal coverage',d.geometry.length===6&&d.rows.length===expectedRows&&d.rows.every(r=>r.samples>=16&&r.maximumUnitNormalError<.0002),{expectedRows,rows:d.rows.length,maximumUnitNormalError:Math.max(...d.rows.map(r=>r.maximumUnitNormalError))});
  const expectedParts=id=>id!=='coelacanth'?['body','fin','eye','oral']:['body','fin','eye','mouth'];
  const missing=[];for(const id of ['coelacanth','pelican_eel','humpback_anglerfish'])for(const lod of [0,1])for(const part of expectedParts(id))for(const quality of [0,1,2])for(const rotation of ['yaw90','pitch90'])for(const time of ['body','fin'].includes(part)?[0,2.13]:[0])if(!d.rows.some(r=>r.id===id&&r.lod===lod&&r.part===part&&r.quality===quality&&r.rotation===rotation&&r.time===time))missing.push({id,lod,part,quality,rotation,time});
  record('the planned semantic matrix is complete, not only a row count',missing.length===0,missing);
  record('matched anatomical pixels and production geometric normals survive rigid transforms',d.rows.every(r=>r.maximumLocalError<.00003&&r.maximumGeometryNormalError<.0002),{maximumLocalError:Math.max(...d.rows.map(r=>r.maximumLocalError)),maximumGeometryNormalError:Math.max(...d.rows.map(r=>r.maximumGeometryNormalError))});
  record('model-local pigment and final roughness are invariant under matched rotations',d.rows.every(r=>r.baseP95<.008&&r.roughP95<.008),d.rows.filter(r=>r.baseP95>=.008||r.roughP95>=.008).map(r=>({id:r.id,lod:r.lod,part:r.part,time:r.time,quality:r.quality,rotation:r.rotation,baseP95:r.baseP95,roughP95:r.roughP95,witness:r.witness})));
  record('material normal perturbation rotates with the actual surface',d.rows.every(r=>r.normalP95<.008),d.rows.filter(r=>r.normalP95>=.008).map(r=>({id:r.id,lod:r.lod,part:r.part,time:r.time,quality:r.quality,rotation:r.rotation,normalP95:r.normalP95,witness:r.witness})));
  record('quality0 retains geometric normals without micro bump',d.rows.filter(r=>r.quality===0).every(r=>r.bumpMaximum<.00002),{maximum:Math.max(...d.rows.filter(r=>r.quality===0).map(r=>r.bumpMaximum))});
  const absent=[];for(const id of ['coelacanth','pelican_eel','humpback_anglerfish'])for(const lod of [0,1])for(const part of ['body','fin'])for(const quality of [1,2])if(!d.rows.some(r=>r.id===id&&r.lod===lod&&r.part===part&&r.quality===quality&&r.bumpP95>.00001))absent.push({id,lod,part,quality});
  record('high-quality body and fin material witnesses have a measurable nonzero micro-normal effect',absent.length===0,absent);
  const protectedRows=d.rows.filter(r=>r.part==='eye'||r.part==='oral');
  record('eyes and oral lining retain authored pigment and no skin bump',protectedRows.length===60&&protectedRows.every(r=>r.bumpMaximum<.00002&&r.protectedPigmentMaximum<.00002),protectedRows.filter(r=>r.bumpMaximum>=.00002||r.protectedPigmentMaximum>=.00002));
  record('final eye/lining roughness is the actual profile value, not an earlier temporary constant',protectedRows.every(r=>r.roughRange.every(v=>Math.abs(v-(r.part==='eye'?.12:r.id==='pelican_eel'?.72:.81))<.00002)),protectedRows.map(r=>({id:r.id,lod:r.lod,part:r.part,quality:r.quality,roughRange:r.roughRange})));
  const mouths=d.rows.filter(r=>r.part==='mouth');
  record('authored coelacanth mouth line survives blotches in both LODs and all quality tiers',mouths.length===12&&mouths.every(r=>r.samples>=16&&r.mouth.authoredBlueRange[1]<.265&&r.mouth.maximumRelativePigmentChange<.0176&&r.bumpMaximum<.00002),mouths.map(r=>({lod:r.lod,quality:r.quality,rotation:r.rotation,samples:r.samples,bumpMaximum:r.bumpMaximum,...r.mouth})));
  record('no native page or GL errors',report.errors.length===0,report.errors);
  report.status=report.checks.every(c=>c.passed)?'passed-material-diagnostic-visual-review-separate':'failed-material-diagnostic';save();
  for(const check of report.checks)console.log((check.passed?'PASS ':'FAIL ')+check.name);
  if(report.checks.some(c=>!c.passed))process.exitCode=1;
 }catch(error){report.status='failed-harness-or-runtime';report.failure=error.stack;if(page&&!page.isClosed())try{report.partial=await page.evaluate(()=>window.__abyssMaterialDiagnosticProgress||null);}catch(e){report.partialReadFailure=String(e);}console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
}
module.exports={selectTriangle};
if(require.main===module)main();
