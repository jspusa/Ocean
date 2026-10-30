/* Root-only native correctness diagnostic; not a beauty or timing acceptance.
 * Actual compiled/uploaded triangle attributes and the production shaders are
 * retained. Only the pre-lighting output changes. The extra texture below is
 * a temporary fault control, never a production resource or performance arm. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const charts=Object.freeze({carapace:[0,0,512,588],plastron:[512,0,512,588],head:[0,588,512,436],front:[512,588,512,171],rear:[512,759,512,126],tail:[512,885,512,139]});

// Selection reads intact index triples, not regenerated or synthetic geometry.
// A shape penalty avoids poles/slivers; UV distance picks an interior witness.
function selectTriangle(vertices,indices,part,rects){
 const rect=rects[part],target=part==='head'?[.65,.47]:['front','rear','tail'].includes(part)?[.45,.25]:[.54,.48];
 let best=null;
 for(let offset=0;offset<indices.length;offset+=3){
  const ids=Array.from(indices.slice(offset,offset+3)),p=ids.map(id=>Array.from(vertices.slice(id*12,id*12+3))),uv=ids.map(id=>[vertices[id*12+9],vertices[id*12+10]]),tags=ids.map(id=>vertices[id*12+11]);
  if(part==='eyes'){if(!tags.every(t=>t===4))continue;}
  else{
   if(tags.some(t=>t===4)||!uv.every(q=>q[0]>=(rect[0]+16)/1024-1e-7&&q[0]<=(rect[0]+rect[2]-16)/1024+1e-7&&q[1]>=(rect[1]+16)/1024-1e-7&&q[1]<=(rect[1]+rect[3]-16)/1024+1e-7))continue;
   if(Math.abs((uv[1][0]-uv[0][0])*(uv[2][1]-uv[0][1])-(uv[1][1]-uv[0][1])*(uv[2][0]-uv[0][0]))<1e-14)continue;
  }
  const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]),face=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],area=Math.hypot(...face),longest=Math.max(...p.map((q,i)=>q.reduce((s,v,k)=>s+(v-p[(i+1)%3][k])**2,0)));
  if(area<1e-9||area/longest<.12)continue;
  const center=[0,1,2].map(k=>p.reduce((s,q)=>s+q[k],0)/3),normal=[0,1,2].map(k=>ids.reduce((s,id)=>s+vertices[id*12+3+k],0)/3),length=Math.hypot(...normal);
  if(length<1e-8)continue;for(let k=0;k<3;k++)normal[k]/=length;
  let distance;
  if(part==='eyes'){
   // Select the existing side eye, excluding the terminal nose.
   if(center[0]<1.08||center[0]>1.23||center[2]<.08)continue;
   distance=center.reduce((s,v,k)=>s+(v-[1.143,.041,.155][k])**2,0)*300;
  }else{const mean=[0,1].map(k=>uv.reduce((s,q)=>s+q[k],0)/3),local=[(mean[0]*1024-rect[0]-16)/(rect[2]-32),(mean[1]*1024-rect[1]-16)/(rect[3]-32)];distance=local.reduce((s,v,k)=>s+(v-target[k])**2,0);}
  const score=distance+.015*longest/area;
  if(!best||score<best.score)best={part,offset,ids,points:p,uv,tags,center,normal,area,shape:area/longest,score};
 }
 if(!best)throw Error('No intact actual '+part+' triangle');return best;
}

// This deliberately narrow source contract is not a general GLSL proof. A
// changed layout fails for review rather than waiving divergent derivatives.
function inspectMaterialSource(source){
 const clean=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,''),match=/if\s*\(\s*uMat\s*==\s*5\s*\)\s*\{/.exec(clean);
 if(!match)throw Error('Material 5 source seam missing');
 const start=match.index+match[0].length;let depth=1,end=start;
 for(;end<clean.length&&depth;end++){if(clean[end]==='{')depth++;if(clean[end]==='}')depth--;}
 if(depth)throw Error('Unclosed material 5 branch');const body=clean.slice(start,end-1),normalCalls=[...body.matchAll(/\bmaterialSurfaceNormal\s*\(/g)],fetches=[...body.matchAll(/\btexture(?:Grad|Lod)?\s*\(\s*uTurtleSkin\b/g)];
 if(normalCalls.length!==1||fetches.length!==1)throw Error('Atlas requires exactly one fetch callsite and one converged normal callsite');
 let callDepth=0;for(const c of body.slice(0,normalCalls[0].index)){if(c==='{')callDepth++;if(c==='}')callDepth--;}
 if(callDepth!==0)throw Error('Normal derivative call is nested inside a material sub-branch; review convergence explicitly');
 const before=body.slice(0,normalCalls[0].index),lastVaryingIf=Math.max(before.lastIndexOf('vTag'),before.lastIndexOf('vUV'));
 return {singleAtlasFetch:true,normalCalls:1,normalCallBraceDepth:callDepth,lastVaryingReferenceBeforeNormal:lastVaryingIf,materialBody:body,limitation:'Structural guard requires the normal call at material-body scope (a braceless uniform quality gate is allowed). Native rotation checks supplement this; they do not prove arbitrary GLSL control flow.'};
}

async function main(){
 const out=path.resolve(option('out','qa/parity/v01850-turtle-atlas/material-native.json'));
 const report={status:'running',charts,insetPixels:16,method:'Installed Chrome native GPU, actual compiled/uploaded turtle-002 high/low LOD triangles, production VS/FS and original instance phenotype. Pre-lighting RGBA32F diagnostic only; camera and animal rotate together. Six charts plus tag-4 eye negative control, quality 0/1/2, two front-fin poses. A temporary fault texture tests atlas dependence, cross-chart isolation and >=8-base-pixel footprint fallback. Not full-body art, performance or physical-phone acceptance.',checks:[],errors:[]};
 const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const context=await browser.newContext({viewport:{width:1000,height:700},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.diagnostic=await page.evaluate(async({selector,sourceInspector,charts})=>{
   window.__freeze=true;settings.adaptive=false;active=false;await renderer.loaded;
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/software|swiftshader|llvmpipe/i.test(hardware))throw Error('Native hardware GPU required');if(!g.getExtension('EXT_color_buffer_float'))throw Error('RGBA32F readback unavailable');
   const actor=life.find(f=>f.uid==='turtle-002');if(!actor)throw Error('Actual turtle-002 missing');await renderer.sceneStream?.ready(actor.p);
   const originals=renderer.batches.filter(b=>!b.shadowProxy&&b.kind===2&&b.material===5&&b.instances.includes(actor)).sort((a,b)=>(a.minDistance||0)-(b.minDistance||0));
   if(originals.length!==2||!originals.every(b=>b.vb&&b.eb))throw Error('Both actual compiled turtle LOD buffers required');if(Math.max(...actor.s)-Math.min(...actor.s)>1e-7)throw Error('Witness requires current uniform actor scale');
   const select=new Function('return ('+selector+')')(),inspect=new Function('return ('+sourceInspector+')')(),sourceContract=inspect(FS);
   const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof data==='string'?new TextEncoder().encode(data):data)),n=>n.toString(16).padStart(2,'0')).join('');
   const attached=g.getAttachedShaders(renderer.surfacePrograms.get('2:5').p).map(s=>({type:g.getShaderParameter(s,g.SHADER_TYPE),source:g.getShaderSource(s)}));
   if(!attached.some(s=>s.type===g.VERTEX_SHADER&&s.source===VS)||!attached.some(s=>s.type===g.FRAGMENT_SHADER&&s.source===surfaceShaderSource(FS,2,5)))throw Error('Attached production turtle shader identity differs');
   const anchor=' vec3 L=normalize(vWorld.y<0.?uLightDir:uAirLightDir);';if(FS.split(anchor).length!==2)throw Error('Pre-lighting diagnostic seam changed');
   const diagnosticFS=FS.replace('out vec4 frag;','out vec4 frag;uniform int uMaterialDiagnostic;').replace(anchor,`
 float qaFootprint=max(length(dFdx(vUV)),length(dFdy(vUV)))*1024.;
 if(uMaterialDiagnostic==4)frag=vec4(vUV,qaFootprint,1.);
 else if(uMaterialDiagnostic==5)frag=vec4(vec2(textureSize(uTurtleSkin,0)),vTag,1.);
 else frag=vec4(uMaterialDiagnostic==0?base:uMaterialDiagnostic==1?n:uMaterialDiagnostic==2?geomN:vLocal,1.);
 return;\n`+anchor);
   const program=renderer.makeProgram(VS,diagnosticFS);g.transformFeedbackVaryings(program.p,['vWorld','vNormal'],g.INTERLEAVED_ATTRIBS);g.linkProgram(program.p);if(!g.getProgramParameter(program.p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program.p));program.u={};
   const size=97,middle=Math.floor(size/2),framebuffer=g.createFramebuffer(),color=g.createTexture(),textureReadFBO=g.createFramebuffer(),probeTexture=g.createTexture(),feedback=g.createTransformFeedback(),feedbackBuffer=g.createBuffer();
   g.bindTexture(g.TEXTURE_2D,color);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,size,size);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,color,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Incomplete diagnostic FBO');
   g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,feedbackBuffer);g.bufferData(g.TRANSFORM_FEEDBACK_BUFFER,3*6*4,g.STREAM_READ);g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,null);
   const originalOrigin=renderer.renderOrigin,originalQuality=renderer.quality,originalTextures=renderer.textures.slice(),originalProgramEntries=[...renderer.surfacePrograms],originalGeometry=originals.map(b=>({b,vb:b.vb,eb:b.eb,vao:b.vao,ib:b.ib,count:b.count,vertexCount:b.vertexCount,radius:b.radius})),created=[],rows=[],controls=[],geometry=[];
   const originalUnpackFlip=g.getParameter(g.UNPACK_FLIP_Y_WEBGL),originalUnpackAlignment=g.getParameter(g.UNPACK_ALIGNMENT),originalUnpackPremultiply=g.getParameter(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL),aniso=g.getExtension('EXT_texture_filter_anisotropic');
   let atlasPixels=null;const cleanup={};
   const add=(a,b)=>a.map((v,k)=>v+b[k]),sub=(a,b)=>a.map((v,k)=>v-b[k]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),norm=a=>mul(a,1/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
   const rotate=(p,yaw,pitch)=>{const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),x=p[0]*cp-p[1]*sp,y=p[0]*sp+p[1]*cp;return [cy*x+sy*p[2],y,-sy*x+cy*p[2]];};
   const quantile=(v,q)=>v.slice().sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(q*v.length))],maximumError=(a,b)=>Math.max(...a.map((v,k)=>Math.abs(v-b[k])));
   const invariant=()=>renderer.textures.length===9&&originalTextures.every((t,i)=>i===5||renderer.textures[i]===t)&&originalProgramEntries.length===renderer.surfacePrograms.size&&originalProgramEntries.every(([k,p])=>renderer.surfacePrograms.get(k)===p)&&originalGeometry.every(r=>r.b.vb===r.vb&&r.b.eb===r.eb&&r.b.vao===r.vao&&r.b.ib===r.ib&&r.b.count===r.count&&r.b.vertexCount===r.vertexCount&&r.b.radius===r.radius);
   const setup=(batch,time,eye,vp,quality,mode)=>{renderer.quality=quality;renderer.common(program,eye,vp,time);renderer.batchUniforms(program,batch,{});renderer.set1i(program,'uSamples',0);renderer.set1i(program,'uMaterialDiagnostic',mode);renderer.set3f(program,'uLODBounds',0,10000,0);for(const [i,name]of ['uSand','uSandN','uRock','uRockN','uShell','uTurtleSkin','uCoral','uCoralN'].entries()){renderer.bindTex(i,renderer.textures[i]);renderer.set1i(program,name,i);}renderer.bindTex(5,renderer.textures[5]);if(g.getUniform(program.p,g.getUniformLocation(program.p,'uTurtleSkin'))!==5||g.getParameter(g.TEXTURE_BINDING_2D)!==renderer.textures[5]||g.getParameter(g.SAMPLER_BINDING)!==null)throw Error('Actual diagnostic sampler must use texture unit 5 without an overriding sampler object');renderer.updateBatch(batch);g.bindVertexArray(batch.vao);};
   const render=(batch,time,eye,vp,quality,mode)=>{g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.viewport(0,0,size,size);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);setup(batch,time,eye,vp,quality,mode);g.drawElementsInstanced(g.TRIANGLES,3,batch.indexType,0,1);const pixels=new Float32Array(size*size*4);g.readPixels(0,0,size,size,g.RGBA,g.FLOAT,pixels);const error=g.getError();if(error)throw Error('Diagnostic GL error '+error);if(!invariant())throw Error('Unrelated textures/programs changed');return pixels;};
   const centerSample=pixels=>{const k=(middle*size+middle)*4;if(pixels[k+3]<.99)throw Error('Actual triangle does not cover its centered diagnostic pixel');const value=Array.from(pixels.slice(k,k+3));if(!value.every(Number.isFinite))throw Error('Nonfinite center sample');return value;};
   const uploadProbe=keepChart=>{
    const bytes=new Uint8Array(atlasPixels.length),rect=keepChart&&charts[keepChart];for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const k=(y*1024+x)*4;if(rect&&x>=rect[0]&&x<rect[0]+rect[2]&&y>=rect[1]&&y<rect[1]+rect[3])bytes.set(atlasPixels.subarray(k,k+4),k);else{bytes[k]=255;bytes[k+1]=0;bytes[k+2]=255;bytes[k+3]=255;}}
    g.bindTexture(g.TEXTURE_2D,probeTexture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.pixelStorei(g.UNPACK_ALIGNMENT,1);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,1024,1024,0,g.RGBA,g.UNSIGNED_BYTE,bytes);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAX_LEVEL,3);if(aniso)g.texParameterf(g.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,1);renderer.textures[5]=probeTexture;
   };
   const uvAtLocal=(selected,p)=>{const a=selected.points[0],v0=sub(selected.points[1],a),v1=sub(selected.points[2],a),v2=sub(p,a),d00=dot(v0,v0),d01=dot(v0,v1),d11=dot(v1,v1),d20=dot(v2,v0),d21=dot(v2,v1),den=d00*d11-d01*d01,w1=(d11*d20-d01*d21)/den,w2=(d00*d21-d01*d20)/den;return [0,1].map(k=>selected.uv[0][k]*(1-w1-w2)+selected.uv[1][k]*w1+selected.uv[2][k]*w2);};
   let result;
   try{
    renderer.renderOrigin=[0,0,0];g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.DITHER);g.disable(g.SCISSOR_TEST);g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);g.colorMask(true,true,true,true);
    renderer.bindTex(5,originalTextures[5]);const sampler={productionTextureCount:renderer.textures.length,boundSlot5:g.getParameter(g.TEXTURE_BINDING_2D)===originalTextures[5],wrapS:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_S),wrapT:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_T),minFilter:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER),magFilter:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER),baseLevel:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_BASE_LEVEL),maxLevel:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAX_LEVEL),anisotropy:aniso?g.getTexParameter(g.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT):null,anisotropyExtension:!!aniso,unpackFlipAtInspection:originalUnpackFlip};
    if(sampler.productionTextureCount!==9||!sampler.boundSlot5||sampler.wrapS!==g.CLAMP_TO_EDGE||sampler.wrapT!==g.CLAMP_TO_EDGE||sampler.minFilter!==g.LINEAR_MIPMAP_LINEAR||sampler.magFilter!==g.LINEAR||sampler.baseLevel!==0||sampler.maxLevel!==3||(aniso&&sampler.anisotropy!==1))throw Error('Production atlas sampler contract failed: '+JSON.stringify(sampler));
    // RGBA8 texture attachment reads the actual uploaded pixels, without
    // decoding another image or trusting a URL to identify GPU contents.
    g.bindFramebuffer(g.FRAMEBUFFER,textureReadFBO);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,originalTextures[5],0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Atlas mip0 readback unavailable');atlasPixels=new Uint8Array(1024*1024*4);g.readPixels(0,0,1024,1024,g.RGBA,g.UNSIGNED_BYTE,atlasPixels);if(g.getError())throw Error('Atlas readback failed');g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,null,0);
    const atlasRGBA8SHA256=await digest(atlasPixels);
    for(let lod=0;lod<originals.length;lod++){
     const original=originals[lod],vertices=new Float32Array(original.vertexCount*12),indices=original.indexType===g.UNSIGNED_SHORT?new Uint16Array(original.count):new Uint32Array(original.count);
     g.bindBuffer(g.COPY_READ_BUFFER,original.vb);g.getBufferSubData(g.COPY_READ_BUFFER,0,vertices);g.bindBuffer(g.COPY_READ_BUFFER,original.eb);g.getBufferSubData(g.COPY_READ_BUFFER,0,indices);g.bindBuffer(g.COPY_READ_BUFFER,null);
     const expected=indexGeometry((lod===0?turtleGeometry():distantTurtle()).v);let maxVertexError=0;for(let i=0;i<vertices.length;i++)maxVertexError=Math.max(maxVertexError,Math.abs(vertices[i]-expected.vertices[i]));if(vertices.length!==expected.vertices.length||indices.length!==expected.indices.length||!Number.isFinite(maxVertexError)||maxVertexError>1e-6||indices.some((v,i)=>v!==expected.indices[i]))throw Error('Uploaded LOD differs from production source');
     geometry.push({lod,vertices:original.vertexCount,indices:original.count,indicesExact:true,maxVertexError,vertexSHA256:await digest(vertices),indexSHA256:await digest(indices)});
     for(const [part,time]of [...Object.keys(charts).map(p=>[p,6]),['eyes',6],['front',7.7]]){
      const selected=select(vertices,indices,part,charts),triangle=new Float32Array(36);selected.ids.forEach((id,k)=>triangle.set(vertices.subarray(id*12,id*12+12),k*12));
      const pose={...actor,p:[0,0,0],yaw:0,pitch:0,s:actor.s.slice()},batch=renderer.batch({indexed:{vertices:triangle,indices:new Uint32Array([0,1,2]),radius:original.radius},material:original.material,species:original.species},[pose],original.kind,true);created.push(batch);
      if(triangle.some((v,k)=>v!==vertices[selected.ids[Math.floor(k/12)]*12+k%12]))throw Error('Triangle attributes changed');
      const feedbackStage={part,lod,time,indexOffset:selected.offset,ids:selected.ids,sourcePoints:selected.points,sourceArea:selected.area,sourceShape:selected.shape,scale:pose.s,drawCount:batch.drawCount};
      // Atlas readback detached its texture, leaving textureReadFBO incomplete.
      // Rasterizer discard is not a substitute for a valid draw framebuffer.
      // Bind the complete diagnostic FBO before transform-feedback submission.
      g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);const feedbackFramebufferStatus=g.checkFramebufferStatus(g.FRAMEBUFFER),feedbackPriorError=g.getError();
      if(feedbackFramebufferStatus!==g.FRAMEBUFFER_COMPLETE||feedbackPriorError!==g.NO_ERROR)throw Error('Transform-feedback precondition failed: '+JSON.stringify({...feedbackStage,framebufferStatus:feedbackFramebufferStatus,priorGL:feedbackPriorError}));
      const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);setup(batch,time,[0,0,4],identity,2,3);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,feedback);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,feedbackBuffer);g.enable(g.RASTERIZER_DISCARD);g.beginTransformFeedback(g.TRIANGLES);g.drawArraysInstanced(g.TRIANGLES,0,3,1);const feedbackDrawError=g.getError();g.endTransformFeedback();const feedbackEndError=g.getError();g.disable(g.RASTERIZER_DISCARD);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);
      if(feedbackDrawError!==g.NO_ERROR||feedbackEndError!==g.NO_ERROR)throw Error('Transform-feedback draw failed: '+JSON.stringify({...feedbackStage,drawGL:feedbackDrawError,endGL:feedbackEndError}));
      const posed=new Float32Array(18);g.bindBuffer(g.COPY_READ_BUFFER,feedbackBuffer);g.getBufferSubData(g.COPY_READ_BUFFER,0,posed);const feedbackReadError=g.getError();g.bindBuffer(g.COPY_READ_BUFFER,null);if(feedbackReadError!==g.NO_ERROR||!posed.every(Number.isFinite))throw Error('Transform-feedback readback failed: '+JSON.stringify({...feedbackStage,readGL:feedbackReadError,posed:Array.from(posed)}));
      const points=[0,1,2].map(i=>Array.from(posed.slice(i*6,i*6+3))),normals=[0,1,2].map(i=>Array.from(posed.slice(i*6+3,i*6+6))),center=mul(add(add(points[0],points[1]),points[2]),1/3),edge=sub(points[1],points[0]);let normal=norm(cross(edge,sub(points[2],points[0])));if(dot(normal,add(add(normals[0],normals[1]),normals[2]))<0)normal=mul(normal,-1);
      const extent=Math.max(...points.map(p=>Math.hypot(...sub(p,center))))*1.35,eye=add(center,normal),up=norm(edge);if(!Number.isFinite(extent)||extent<1e-5)throw Error('Collapsed posed triangle: '+JSON.stringify({...feedbackStage,points,normals,center,extent,drawGL:feedbackDrawError,readGL:feedbackReadError}));
      for(const quality of [0,1,2]){
       const renders=[];
       for(const rotation of [{id:'identity',yaw:0,pitch:0},{id:'yaw90',yaw:Math.PI/2,pitch:0},{id:'pitch90',yaw:0,pitch:Math.PI/2}]){
        pose.yaw=rotation.yaw;pose.pitch=rotation.pitch;const r=p=>rotate(p,rotation.yaw,rotation.pitch),at=r(eye),vp=mm(ortho(-extent,extent,-extent,extent,.01,3),lookAt(at,r(center),r(up))),outputs=[];
        for(let mode=0;mode<6;mode++)outputs.push(render(batch,time,at,vp,quality,mode));renders.push({...rotation,outputs});
       }
       const reference=renders[0];
       for(const rotated of renders.slice(1)){
        const localErrors=[],baseErrors=[],normalErrors=[],geometryErrors=[],normalLengths=[],uvErrors=[],footprintErrors=[];let witness=null;
        for(let y=middle-6;y<middle+6;y++)for(let x=middle-6;x<middle+6;x++){
         let interior=true;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const j=((y+dy)*size+x+dx)*4+3;if(reference.outputs[3][j]<.99||rotated.outputs[3][j]<.99)interior=false;}if(!interior)continue;
         const k=(y*size+x)*4,read=(r,m)=>Array.from(r.outputs[m].slice(k,k+3)),a=read(reference,3),b=read(rotated,3),baseA=read(reference,0),baseB=read(rotated,0),nA=read(reference,1),nB=read(rotated,1),geoA=read(reference,2),geoB=read(rotated,2),uvA=read(reference,4),uvB=read(rotated,4),dimA=read(reference,5),dimB=read(rotated,5);
         if(![...a,...b,...baseA,...baseB,...nA,...nB,...geoA,...geoB,...uvA,...uvB,...dimA,...dimB].every(Number.isFinite))throw Error('Nonfinite material output');if(dimA[0]!==1024||dimA[1]!==1024||dimB[0]!==1024||dimB[1]!==1024)throw Error('Actual shader atlas dimensions are not 1024 square');
         const colorError=maximumError(baseA,baseB),normalError=Math.hypot(...sub(rotate(nA,rotated.yaw,rotated.pitch),nB));localErrors.push(maximumError(a,b));baseErrors.push(colorError);normalErrors.push(normalError);geometryErrors.push(Math.hypot(...sub(rotate(geoA,rotated.yaw,rotated.pitch),geoB)));normalLengths.push(Math.abs(Math.hypot(...nA)-1),Math.abs(Math.hypot(...nB)-1));uvErrors.push(maximumError(uvA.slice(0,2),uvAtLocal(selected,a)),maximumError(uvB.slice(0,2),uvAtLocal(selected,b)));footprintErrors.push(Math.abs(uvA[2]-uvB[2]));
         if(!witness||colorError+normalError>witness.error)witness={pixel:[x,y],local:a,matchedLocal:b,uvA,uvB,baseA,baseB,normalA:nA,normalExpected:rotate(nA,rotated.yaw,rotated.pitch),normalActual:nB,error:colorError+normalError};
        }
        if(localErrors.length<16)throw Error('Fewer than 16 interior anatomical samples: '+part+'/'+lod+'/'+rotated.id);
        rows.push({lod,part,time,quality,rotation:rotated.id,triangle:selected,samples:localErrors.length,maximumLocalError:Math.max(...localErrors),maximumGeometryNormalError:Math.max(...geometryErrors),maximumUnitNormalError:Math.max(...normalLengths),maximumUVError:Math.max(...uvErrors),maximumFootprintRotationError:Math.max(...footprintErrors),baseP95:quantile(baseErrors,.95),normalP95:quantile(normalErrors,.95),witness});
       }
      }
      if(time!==6)continue;
      pose.yaw=0;pose.pitch=0;
      // A fixed oblique direction observes a real triangle. One declared
      // calibration converts the measured derivative to 12 base pixels; it is
      // not a quality/performance search. The odd target centers the tiny far
      // triangle on an actual pixel. These center probes are separate from the
      // eroded >=16-pixel rigid-rotation comparisons above.
      const sideways=norm(cross(normal,up)),oblique=norm(add(mul(normal,.35),mul(sideways,Math.sqrt(1-.35*.35)))),obliqueEye=add(center,oblique),vpFor=e=>mm(ortho(-e,e,-e,e,.01,3),lookAt(obliqueEye,center,up));
      renderer.textures[5]=originalTextures[5];const calibration=centerSample(render(batch,time,obliqueEye,vpFor(extent),2,4)),nearExtent=calibration[2]>2?extent*2/calibration[2]:extent,nearVP=vpFor(nearExtent),nativeUV=centerSample(render(batch,time,obliqueEye,nearVP,2,4)),nativeBase=centerSample(render(batch,time,obliqueEye,nearVP,2,0)),nativeNormal=centerSample(render(batch,time,obliqueEye,nearVP,2,1));
      if(!Number.isFinite(calibration[2])||calibration[2]<1e-7||nativeUV[2]>=4)throw Error('Near control does not resolve actual texture detail');
      const row={lod,part,triangle:selected,probeQuality:2,near:{uv:nativeUV.slice(0,2),footprint:nativeUV[2],base:nativeBase,normal:nativeNormal},policy:{source:'actual GPU mip0',outsideChart:'all other chart pixels become solid magenta; own full rectangle retained',sentinel:'entire atlas becomes solid magenta',farTargetFootprint:12,minimumFarFootprint:8,farCoverage:'center pixel only; finite coverage retained separately from rigid oracle'}};
      uploadProbe(null);const sentinelBase=centerSample(render(batch,time,obliqueEye,nearVP,2,0)),sentinelNormal=centerSample(render(batch,time,obliqueEye,nearVP,2,1));row.near.sentinelBase=sentinelBase;row.near.sentinelBaseDifference=maximumError(nativeBase,sentinelBase);row.near.sentinelNormalDifference=Math.hypot(...sub(nativeNormal,sentinelNormal));
      if(part!=='eyes'){
       uploadProbe(part);const isolatedBase=centerSample(render(batch,time,obliqueEye,nearVP,2,0)),isolatedNormal=centerSample(render(batch,time,obliqueEye,nearVP,2,1));row.near.otherChartsBaseDifference=maximumError(nativeBase,isolatedBase);row.near.otherChartsNormalDifference=Math.hypot(...sub(nativeNormal,isolatedNormal));
       const farExtent=extent*12/calibration[2],farVP=vpFor(farExtent);renderer.textures[5]=originalTextures[5];const farPixels=render(batch,time,obliqueEye,farVP,2,4),farUV=centerSample(farPixels),farBase=centerSample(render(batch,time,obliqueEye,farVP,2,0)),farNormal=centerSample(render(batch,time,obliqueEye,farVP,2,1));let covered=0;for(let i=3;i<farPixels.length;i+=4)if(farPixels[i]>.99)covered++;
       uploadProbe(null);const farSentinelBase=centerSample(render(batch,time,obliqueEye,farVP,2,0)),farSentinelNormal=centerSample(render(batch,time,obliqueEye,farVP,2,1));row.far={uv:farUV.slice(0,2),footprint:farUV[2],coveredPixels:covered,base:farBase,sentinelBase:farSentinelBase,sentinelBaseDifference:maximumError(farBase,farSentinelBase),sentinelNormalDifference:Math.hypot(...sub(farNormal,farSentinelNormal))};
      }
      renderer.textures[5]=originalTextures[5];controls.push(row);
     }
    }
    result={hardware,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,worldVersion:OPEN_WORLD.version,uid:actor.uid,actorScale:actor.s.slice(),sourceSHA256:{VS:await digest(VS),FS:await digest(FS),specializedFS:await digest(surfaceShaderSource(FS,2,5)),diagnosticFS:await digest(diagnosticFS)},sourceContract,sampler,atlasRGBA8SHA256,diagnostic:'production pre-lighting base/normal/geometry normal/local/UV+UV-footprint/textureSize+tag; actual uploaded indexed triangles; RGBA32F 97x97',geometry,rows,controls,cleanup,temporaryResources:'One additional RGBA8 1024-square probe texture plus diagnostic FBO resources; renderer.textures stays at nine. Not timing or production-memory evidence.',limitations:['Representative intact triangles only; the separate full-geometry UV check covers every triangle and documented seam/pole exceptions.','Far fade uses a centered finite pixel witness, not the >=16 eroded pixels required by the rigid-rotation oracle.','Pixel color dependence and chart isolation do not certify anatomical artwork, no visible seams on the whole body, or visual quality under normal lighting.']};
   }finally{
    renderer.textures[5]=originalTextures[5];for(const b of created){const i=renderer.batches.indexOf(b);if(i>=0)renderer.batches.splice(i,1);g.deleteVertexArray(b.vao);g.deleteBuffer(b.vb);g.deleteBuffer(b.eb);g.deleteBuffer(b.ib);}
    renderer.renderOrigin=originalOrigin;renderer.quality=originalQuality;g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,originalUnpackFlip);g.pixelStorei(g.UNPACK_ALIGNMENT,originalUnpackAlignment);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,originalUnpackPremultiply);g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);g.disable(g.RASTERIZER_DISCARD);g.deleteProgram(program.p);g.deleteBuffer(feedbackBuffer);g.deleteTransformFeedback(feedback);g.deleteFramebuffer(framebuffer);g.deleteFramebuffer(textureReadFBO);g.deleteTexture(color);g.deleteTexture(probeTexture);renderer.bindTex(5,originalTextures[5]);cleanup.originalTexturesRestored=originalTextures.every((t,i)=>renderer.textures[i]===t);cleanup.unrelatedProgramsPreserved=invariant();cleanup.addedGeometryReleased=created.every(b=>!g.isBuffer(b.vb)&&!g.isBuffer(b.eb)&&!g.isBuffer(b.ib)&&!g.isVertexArray(b.vao));cleanup.probeTextureDeleted=!g.isTexture(probeTexture);cleanup.gl=g.getError();cleanup.contextLost=g.isContextLost();
   }
   return result;
  },{selector:selectTriangle.toString(),sourceInspector:inspectMaterialSource.toString(),charts});
  const d=report.diagnostic,record=(name,passed,evidence)=>report.checks.push({name,passed:!!passed,evidence});
  record('actual compiled/uploaded high and low turtle geometry',d.compiled&&d.streamed&&d.geometry.length===2&&d.geometry.every(x=>x.indicesExact&&x.maxVertexError<=1e-6),d.geometry);
  record('all six charts and tag4 across qualities, rotations and fin poses',d.rows.length===96&&d.rows.every(r=>r.samples>=16&&r.maximumUnitNormalError<.0002),{rows:d.rows.length,parts:[...new Set(d.rows.map(r=>r.part))],maximumUnitNormalError:Math.max(...d.rows.map(r=>r.maximumUnitNormalError))});
  record('anatomical positions and geometric normals match rigid rotation',d.rows.every(r=>r.maximumLocalError<.00003&&r.maximumGeometryNormalError<.0002),d.rows.filter(r=>r.maximumLocalError>=.00003||r.maximumGeometryNormalError>=.0002));
  record('actual UV varying interpolates original uploaded triangle attributes',d.rows.every(r=>r.maximumUVError<.00003),{maximumUVError:Math.max(...d.rows.map(r=>r.maximumUVError))});
  record('anatomical material base retains the original .008 rotation threshold',d.rows.every(r=>r.baseP95<.008),d.rows.filter(r=>r.baseP95>=.008));
  record('material normal retains the original .008 rotation threshold',d.rows.every(r=>r.normalP95<.008),d.rows.filter(r=>r.normalP95>=.008));
  const body=d.controls.filter(r=>r.part!=='eyes'),eyes=d.controls.filter(r=>r.part==='eyes');
  record('every near body chart really depends on the single atlas',body.length===12&&body.every(r=>r.near.footprint<4&&r.near.sentinelBaseDifference>1e-4),body.map(r=>({lod:r.lod,part:r.part,...r.near})));
  record('other atlas charts cannot contaminate resolved oblique samples',body.every(r=>r.near.otherChartsBaseDifference<1e-6&&r.near.otherChartsNormalDifference<.0002),body.map(r=>({lod:r.lod,part:r.part,baseDifference:r.near.otherChartsBaseDifference,normalDifference:r.near.otherChartsNormalDifference})));
  record('tag4 eyes ignore the atlas in both LODs',eyes.length===2&&eyes.every(r=>r.near.sentinelBaseDifference<1e-6&&r.near.sentinelNormalDifference<.0002),eyes);
  record('>=8-pixel actual oblique footprint has texture-independent color and normal',body.every(r=>r.far.footprint>=8&&r.far.coveredPixels>0&&r.far.sentinelBaseDifference<1e-6&&r.far.sentinelNormalDifference<.0002),body.map(r=>({lod:r.lod,part:r.part,...r.far})));
  record('temporary GPU resources released and original slots restored',d.cleanup.originalTexturesRestored&&d.cleanup.unrelatedProgramsPreserved&&d.cleanup.addedGeometryReleased&&d.cleanup.probeTextureDeleted&&d.cleanup.gl===0&&!d.cleanup.contextLost,d.cleanup);
  record('no native page or console errors',report.errors.length===0,report.errors);report.status=report.checks.every(c=>c.passed)?'passed-atlas-material-diagnostic-art-review-separate':'failed-atlas-material-diagnostic';save();for(const c of report.checks)console.log((c.passed?'PASS ':'FAIL ')+c.name);if(report.checks.some(c=>!c.passed))process.exitCode=1;
 }catch(error){report.status='failed-harness-or-runtime';report.failure=error.stack;console.error(error);process.exitCode=1;}finally{save();await browser?.close();}
}
module.exports={main,selectTriangle,inspectMaterialSource,charts};
if(require.main===module)main();
