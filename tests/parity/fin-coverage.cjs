/* Native emitted-alpha diagnostic; deliberately not a full draw-pipeline test.
 * Actual indexed scene triangles feed an explicitly synthetic clip-space VS.
 * Both production fragment shaders are unmodified, including their final alpha.
 * Real 0/2/4-sample targets are used, but blending and alpha-to-coverage are off
 * so readback measures emitted alpha rather than driver sample-mask patterns.
 * Separate actual-world views must preserve production quality and draw state. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),option=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const out=path.resolve(root,option('out','qa/parity/v01840-realism/fin-coverage.json')),engineRef=option('engine-ref',null),baselineRef=option('baseline-ref','cffbc44'),archive=path.resolve(root,option('archive','assets/reef.mesh.gz'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const report={status:'running',method:'Native emitted-alpha diagnostic on actual indexed compiled triangles. The declared synthetic fixture VS maps one actual triangle to the probe viewport, retaining its position, normal, colour, UV and tag attributes plus one actual instance tint/genes. It does not run production deformation, projection, depth, or sample coverage. The complete production FS and its production kind-1/material-6 specialization are unmodified. Matching real 0/2/4-sample RGBA8 targets resolve into RGBA8; blend, depth, dither and alpha-to-coverage are disabled to read emitted RGBA. Every actual material-6 fin tag (2.5 < tag < 3.5), across all actual kinds, must emit full alpha. Fin RGB and non-fin RGBA are compared with the pinned baseline FS. Actual-world visual quality and draw-state preservation require separate evidence.',engineRef,baselineRef,fixtures:[],checks:[]};
function check(name,fn){try{const detail=fn();report.checks.push({name,passed:true,detail});}catch(error){report.checks.push({name,passed:false,error:error.message});}}
function shaders(ref){
 const source=ref?cp.execFileSync('git',['show',ref+':src/engine.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'src/engine.js'),'utf8');
 const ctx=vm.createContext({console});vm.runInContext(source,ctx,{filename:ref?ref+':src/engine.js':'src/engine.js'});
 return {sourceSHA256:hash(source),fragment:vm.runInContext('FS',ctx),fishFragment:vm.runInContext('surfaceShaderSource(FS,1,6)',ctx)};
}
function fixturesFromArchive(){
 const packed=fs.readFileSync(archive),raw=zlib.gunzipSync(packed),start=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,start));report.archiveSHA256=hash(packed);
 const fixtures=[];
 for(const [batch,b]of header.batches.entries()){
  if(b.material!==6)continue;
  const v=new Float32Array(raw.buffer,raw.byteOffset+start+b.vertexOffset,b.vertexFloats),ix=new Uint32Array(raw.buffer,raw.byteOffset+start+b.indexOffset,b.indexCount),byTag=new Map();
  for(let k=0;k<ix.length;k+=3){
   const indices=Array.from(ix.subarray(k,k+3)),rows=indices.map(i=>Array.from(v.subarray(i*12,i*12+12))),tag=rows[0][11];
   if(!rows.every(row=>row.every(Number.isFinite)&&Math.abs(row[11]-tag)<1e-6))continue;
   const u=rows[1].slice(0,3).map((x,i)=>x-rows[0][i]),w=rows[2].slice(0,3).map((x,i)=>x-rows[0][i]);
   const area=Math.hypot(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]);
   if(area>1e-10&&(!byTag.has(tag)||area>byTag.get(tag).area))byTag.set(tag,{indices,rows,tag,area,triangle:k/3});
  }
  const instance=header.nodes[b.instanceIDs[0]];assert(instance,'Actual instance is required for batch '+batch);
  for(const picked of byTag.values())fixtures.push({name:'batch-'+batch+'-tag-'+picked.tag,kind:b.kind,species:b.species,batch,lod:(b.minDistance||0)>0?'far':'near',tag:picked.tag,triangle:picked.triangle,indices:picked.indices,vertices:picked.rows.flat(),tint:instance.tint||[1,1,1],genes:instance.bioGenes||[.5,.5,.5,.5],instanceUID:instance.uid||null,fin:picked.tag>2.5&&picked.tag<3.5});
 }
 assert(fixtures.some(f=>f.kind===1&&f.fin),'Actual kind-1 fins required');
 assert(fixtures.some(f=>f.kind!==1&&f.fin),'Actual non-kind-1 material-6 fin required to cover the shared material contract');
 for(const species of [37,38,39,40])for(const lod of ['near','far']){
  const rows=fixtures.filter(f=>f.species===species&&f.kind===1&&f.lod===lod);assert(rows.some(f=>Math.abs(f.tag-1)<1e-6),'Actual reef body missing');
  for(const tag of [3,3.1,3.2])assert(rows.some(f=>Math.abs(f.tag-tag)<1e-5),'Actual reef fin tag missing: '+[species,lod,tag]);
 }
 return fixtures;
}
async function main(){let browser;
 try{
  const current=shaders(engineRef),baseline=shaders(baselineRef),fixtures=fixturesFromArchive();report.fixtures=fixtures;
  report.baselineCommit=cp.execFileSync('git',['rev-parse',baselineRef+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
  report.sources={current:{engineSHA256:current.sourceSHA256,fragmentSHA256:hash(current.fragment),fishFragmentSHA256:hash(current.fishFragment)},baseline:{engineSHA256:baseline.sourceSHA256,fragmentSHA256:hash(baseline.fragment),fishFragmentSHA256:hash(baseline.fishFragment)}};
  check('actual archive covers all four reef species, both LODs and every present material-6 kind',()=>({fixtures:fixtures.length,material6Fins:fixtures.filter(f=>f.fin).length,finKinds:[...new Set(fixtures.filter(f=>f.fin).map(f=>f.kind))],nonFinKinds:[...new Set(fixtures.filter(f=>!f.fin).map(f=>f.kind))]}));
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const page=await browser.newPage();await page.setContent('<canvas width="16" height="16"></canvas>');
  const result=await page.evaluate(({current,baseline,fixtures})=>{
   const gl=document.querySelector('canvas').getContext('webgl2',{antialias:false});if(!gl)throw Error('WebGL2 unavailable');
   const ext=gl.getExtension('WEBGL_debug_renderer_info'),renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,size=16;
   if(!renderer||/software|swiftshader|llvmpipe/i.test(renderer))throw Error('Native GPU required: '+renderer);
   const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;layout(location=3) in vec2 aUV;layout(location=4) in float aTag;
uniform vec3 uFixtureTint;uniform vec4 uFixtureGenes;
out vec3 vWorld;out vec3 vRelative;out vec3 vNormal;out vec3 vColor;out vec3 vLocal;out vec2 vUV;out float vTag;out float vSeed;out vec4 vShadow;out float vLodDistance;flat out vec4 vGenes;flat out vec3 vTint;out vec4 vDynamicShadow;
void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(q*2.-1.,0.,1.);vLocal=aPosition;vWorld=aPosition+vec3(0.,-5.,0.);vRelative=vWorld;vNormal=normalize(aNormal);vColor=aColor*uFixtureTint;vUV=aUV;vTag=aTag;vSeed=.37;vShadow=vec4(2.,2.,2.,1.);vDynamicShadow=vShadow;vLodDistance=1.;vGenes=uFixtureGenes;vTint=uFixtureTint;}`;
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const vertexShader=compile(gl.VERTEX_SHADER,vertex),programs={};
   for(const [label,source]of Object.entries({current,baseline}))for(const specialized of [false,true]){
    const p=gl.createProgram(),frag=compile(gl.FRAGMENT_SHADER,specialized?source.fishFragment:source.fragment);gl.attachShader(p,vertexShader);gl.attachShader(p,frag);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));programs[label+(specialized?'-fish':'-generic')]=p;
   }
   // Valid separate colour and comparison textures prevent sampler-type aliasing.
   for(const unit of [0,1]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(unit){gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT16,1,1,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,new Uint16Array([65535]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);}
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([192,192,192,255]));
   }
   for(const p of Object.values(programs)){gl.useProgram(p);const at=n=>gl.getUniformLocation(p,n);
    for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);if(u.type===gl.SAMPLER_2D||u.type===gl.SAMPLER_2D_SHADOW)gl.uniform1i(at(u.name),u.type===gl.SAMPLER_2D_SHADOW?1:0);}
    for(const [n,v]of [['uMat',6],['uQuality',2],['uSunless',0]])gl.uniform1i(at(n),v);
    for(const [n,v]of [['uTime',6],['uTorch',0],['uSun',1],['uShadows',0],['uShadowTexel',1/1024]])gl.uniform1f(at(n),v);
    gl.uniform3f(at('uCamera'),0,-5,4);gl.uniform3f(at('uRenderOrigin'),0,0,0);gl.uniform3f(at('uLightDir'),.36,1,.3);gl.uniform3f(at('uAirLightDir'),.36,1,.3);gl.uniform3f(at('uLightColor'),1.05,1.02,.93);gl.uniform3f(at('uViewForward'),0,0,-1);gl.uniform3f(at('uLODBounds'),0,0,0);gl.uniform4f(at('uSurfaceProfile'),-1,0,1,-1);gl.uniform4f(at('uTorchParams'),.62,.98,2.2,.024);
    gl.validateProgram(p);if(!gl.getProgramParameter(p,gl.VALIDATE_STATUS))throw Error('Invalid probe: '+gl.getProgramInfoLog(p));
   }
   const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   for(const [loc,n,offset]of [[0,3,0],[1,3,12],[2,3,24],[3,2,36],[4,1,44]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,48,offset);}
   gl.activeTexture(gl.TEXTURE2);const color=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,color);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   const resolve=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,resolve);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Resolve FBO incomplete');
   gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.DITHER);gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.disable(gl.SAMPLE_COVERAGE);gl.viewport(0,0,size,size);
   const support=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA8,gl.SAMPLES)||[]),configurations=[],pixels=[];
   for(const samples of [0,2,4]){
    if(samples&&!support.includes(samples))throw Error('Required actual RGBA8 MSAA count unavailable: '+samples+'; supported '+support);
    let target=resolve,rb=null;
    if(samples){target=gl.createFramebuffer();rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.RGBA8,size,size);const actual=gl.getRenderbufferParameter(gl.RENDERBUFFER,gl.RENDERBUFFER_SAMPLES);if(actual!==samples)throw Error('MSAA count differs: '+actual);gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,rb);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('MSAA FBO incomplete');}
    configurations.push({samples,alphaToCoverage:gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE),blend:gl.isEnabled(gl.BLEND),dither:gl.isEnabled(gl.DITHER)});
    for(const [label]of Object.entries({current,baseline}))for(const f of fixtures){
     const p=programs[label+(f.kind===1?'-fish':'-generic')],at=n=>gl.getUniformLocation(p,n);gl.useProgram(p);gl.uniform1i(at('uKind'),f.kind);gl.uniform1i(at('uSpecies'),f.species);gl.uniform1i(at('uSamples'),samples);gl.uniform3fv(at('uFixtureTint'),f.tint);gl.uniform4fv(at('uFixtureGenes'),f.genes);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(f.vertices),gl.STREAM_DRAW);
     gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.clearColor(1,0,1,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
     if(samples){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,target);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,resolve);gl.blitFramebuffer(0,0,size,size,0,0,size,size,gl.COLOR_BUFFER_BIT,gl.NEAREST);}
     gl.bindFramebuffer(gl.READ_FRAMEBUFFER,resolve);const bytes=new Uint8Array(4*4*4);gl.readPixels(6,6,4,4,gl.RGBA,gl.UNSIGNED_BYTE,bytes);const error=gl.getError();if(error)throw Error(label+' '+f.name+' GL error '+error);
     const alpha=Array.from({length:16},(_,i)=>bytes[i*4+3]);pixels.push({label,name:f.name,samples,uSamples:at('uSamples')===null?null:gl.getUniform(p,at('uSamples')),alphaMin:Math.min(...alpha),alphaMax:Math.max(...alpha),rgba:Array.from(bytes)});
    }
    if(rb){gl.deleteRenderbuffer(rb);gl.deleteFramebuffer(target);}
   }
   return {renderer,supportedSamples:support,configurations,fixtureVertexSource:vertex,pixels,error:gl.getError()};
  },{current,baseline,fixtures});
  Object.assign(report,result);check('native GPU, actual 0/2/4-sample targets and unmodified production FS execute without GL errors',()=>{assert.equal(result.error,0);assert.deepEqual(result.configurations.map(c=>c.samples),[0,2,4]);assert(result.configurations.every(c=>!c.alphaToCoverage&&!c.blend&&!c.dither));return {renderer:result.renderer,configurations:result.configurations};});
  const pixels=new Map(result.pixels.map(p=>[[p.label,p.name,p.samples].join('|'),p]));
  for(const f of fixtures)for(const samples of [0,2,4]){
   const now=pixels.get(['current',f.name,samples].join('|')),old=pixels.get(['baseline',f.name,samples].join('|'));
   if(f.fin){
    check(f.name+' samples '+samples+': material-6 fin emits full coverage',()=>{assert.equal(now.alphaMin,255,'Minimum emitted alpha '+now.alphaMin+'/255');assert.equal(now.alphaMax,255);return {kind:f.kind,alphaMin:now.alphaMin,alphaMax:now.alphaMax,baselineAlpha:[old.alphaMin,old.alphaMax]};});
    check(f.name+' samples '+samples+': fin RGB matches pinned baseline',()=>{const delta=Math.max(...now.rgba.map((v,i)=>i%4===3?0:Math.abs(v-old.rgba[i])));assert(delta<=1,'Fin RGB changed by '+delta+'/255');return {kind:f.kind,maxRGBDelta:delta};});
   }else check(f.name+' samples '+samples+': non-fin RGBA matches pinned baseline',()=>{assert.equal(now.alphaMin,old.alphaMin);assert.equal(now.alphaMax,old.alphaMax);const delta=Math.max(...now.rgba.map((v,i)=>Math.abs(v-old.rgba[i])));assert(delta<=1,'RGBA changed by '+delta+'/255');return {kind:f.kind,alpha:[now.alphaMin,now.alphaMax],maxRGBADelta:delta};});
  }
  report.status=report.checks.every(c=>c.passed)?'passed':'failed';
 }catch(error){report.status='failed';report.error=error.stack;}
 finally{await browser?.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');for(const c of report.checks)if(!c.passed)console.log('FAIL '+c.name+': '+c.error);console.log(JSON.stringify({status:report.status,out,passed:report.checks.filter(c=>c.passed).length,total:report.checks.length,error:report.error}));if(report.status==='failed')process.exitCode=1;}
}
main();
