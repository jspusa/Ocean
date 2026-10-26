/* Native-GPU differential diagnosis, not natural play or a physical-phone test.
 * Centres/attributes come from both real public snailfish LOD meshes. Local
 * tangent probes are constructed from each centre's authored smooth normal;
 * they are not the polygon's face normal or a duplicate of the swimming rig.
 * The oracle uses only positions emitted by the attached production shaders.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const enginePath=path.resolve(option('engine',path.join(root,'src/engine.js'))),output=path.resolve(root,option('out','qa/parity/snailfish-rig-browser.json'));
const files=['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna','trench_fauna'];
const sources=files.map(name=>({name,text:fs.readFileSync(name==='engine'?enginePath:path.join(root,'src',name+'.js'),'utf8')}));
const code=sources.map(s=>s.text).join('\n'),ctx=vm.createContext({console,performance});vm.runInContext(code,ctx);
const build=vm.runInContext('faunaGeometry',ctx),species=vm.runInContext("SPECIES.find(s=>s.id==='mariana_snailfish')",ctx),speciesIndex=vm.runInContext('SPECIES.indexOf(TRENCH_SPECIES.find(s=>s.id===\'mariana_snailfish\'))',ctx);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(...a);assert(l>1e-12);return a.map(v=>v/l);};
const distance=(a,b)=>Math.hypot(...sub(a,b)),sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const epsilon=.001,cosineTolerance=2e-6,convergenceTolerance=5e-7,times=[0,.4,1.1,1.8,2.7,3.8,5.2,6.4],fixtures=[],meshes=[];
// A 1 mm model-space probe is 0.2 mm on the real 20 cm animal. At a
// <= 0.2 m origin-centred output, float32 position ULP is <= 1.5e-8 m;
// the half-step central difference spans 2e-4 m. The 2e-6 absolute cosine
// allowance (~0.115 degrees) exceeds that cancellation error conservatively.
// Each run also measures half-step convergence and an undeformed control:
// neither a bad probe nor existing mesh-normal interpolation may count as RED.
for(const low of [false,true]){
 const g=build(species,low),lod=low?'low':'high',triangles=[];
 for(let k=0;k<g.v.length;k+=36){
  const vertices=[0,12,24].map(i=>Array.from(g.v.slice(k+i,k+i+12))),mean=offset=>[0,1,2].map(i=>vertices.reduce((s,v)=>s+v[offset+i],0)/3);
  const p=mean(0),normal=unit(mean(3)),tag=vertices[0][11],color=mean(6),uv=[9,10].map(i=>vertices.reduce((s,v)=>s+v[i],0)/3);
  assert(vertices.every(v=>v[11]===tag),'A public mesh face must retain one material tag');
  triangles.push({triangle:k/36,p,normal,tag,color,uv});
 }
 meshes.push({lod,triangles:g.v.length/36,material:g.material,species:g.species,bounds:g.modelBounds,vertexSHA256:sha(JSON.stringify(g.v))});
 const select=(name,target,predicate)=>{
  // Keep every probe away from rig branch/envelope endpoints, poles, and z=0.
  const candidates=triangles.filter(f=>predicate(f)&&[-.5,.05,.1].every(x=>Math.abs(f.p[0]-x)>epsilon*4)&&[0,.1,.25].every(z=>Math.abs(Math.abs(f.p[2])-z)>epsilon*4));
  candidates.sort((a,b)=>distance(a.p,target)-distance(b.p,target)||a.triangle-b.triangle);assert(candidates.length,'Missing actual mesh region '+lod+'/'+name);
  const f=candidates[0],axis=Math.abs(f.normal[2])<.85?[0,0,1]:[0,1,0],u=unit(cross(axis,f.normal)),v=unit(cross(f.normal,u));
  const inputCosine=dot(unit(cross(u,v)),f.normal);assert(inputCosine>1-1e-12&&Math.abs(dot(u,f.normal))<1e-12&&Math.abs(dot(v,f.normal))<1e-12,'Probe plane must match the actual interpolated input normal');
  fixtures.push({id:lod+'/'+name,lod,name,...f,u,v,inputCosine});
 };
 for(const side of [-1,1]){
  const suffix=side<0?'left':'right',skin=f=>f.tag===1&&f.color[0]>.7&&f.p[2]*side>.012&&f.normal[2]*side>.4;
  select('tail-'+suffix,[-.35,.02,side*.025],f=>skin(f)&&f.p[0]>-.43&&f.p[0]<-.27);
  select('body-'+suffix,[-.16,.01,side*.052],f=>skin(f)&&f.p[0]>-.24&&f.p[0]<-.11);
  select('head-'+suffix,[.38,.035,side*.09],f=>skin(f)&&f.p[0]>.32&&f.p[0]<.43);
  const membrane=f=>f.tag===3&&f.color[0]>.9&&f.p[0]>.11&&f.p[0]<.30&&f.p[2]*side>.12&&f.p[2]*side<.235&&f.normal[2]*side>0&&Math.abs(f.normal[1])>.2;
  select('pectoral-upper-'+suffix,[.18,.035,side*.20],f=>membrane(f)&&f.p[1]>-.025);
  select('pectoral-lower-'+suffix,[.24,-.14,side*.15],f=>membrane(f)&&f.p[1]<-.10);
 }
}
assert.equal(fixtures.length,20);assert.equal(species.size,.20);assert.equal(species.renderKind,11);
const input={fixtures,epsilon,times,speciesIndex,size:species.size,beat:species.motionProfile.beat};
const result={status:'prepared',method:'Isolated native Chrome WebGL2 context. Actual Renderer.makeProgram/setupSurfacePrograms/surfaceProgram build and choose production colour and shadow programs. Their attached vertex/fragment sources are copied unchanged into transform-feedback programs. Actual public high/low snailfish meshes supply centres and interpolated vertex attributes; an orthonormal plane matching the input normal supplies local probes. The normal oracle is the cross-product of GPU-emitted central position differences, at epsilon and epsilon/2. No displacement equation is reproduced. Rig-class-zero controls separate fixture/numeric errors from swimming errors. All requested cases and raw outputs are retained after assertion failures. Not whole-animal pixels, natural play, performance or physical-device acceptance.',
 enginePath,engineSHA256:sha(sources[0].text),sourceSHA256:Object.fromEntries(sources.map(s=>[s.name,sha(s.text)])),species:{id:species.id,index:speciesIndex,size:species.size,beat:species.motionProfile.beat},meshes,fixtures,times,
 acceptance:{epsilon,cosineTolerance,minOrientedCosine:1-cosineTolerance,maxAngleDegrees:Math.acos(1-cosineTolerance)*180/Math.PI,convergenceTolerance,precision:'Output positions remain near the origin at the real 0.20 m scale. A float32 ULP <= 1.5e-8 m is small relative to the 2e-4 m half-step central span. Absolute oriented cosine error <= 2e-6 (~0.115 deg), with an independent static control and epsilon/2 convergence gate. No baseline-relative tolerance.'},checks:[],cases:[],errors:[]};
if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({status:result.status,engineSHA256:result.engineSHA256,meshes,fixtureCount:fixtures.length,fixtures:fixtures.map(f=>({id:f.id,triangle:f.triangle,p:f.p,normal:f.normal,inputCosine:f.inputCosine})),acceptance:result.acceptance},null,2));process.exit(0);}
const check=(name,pass,detail)=>{result.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log((pass?'PASS ':'FAIL ')+name);};
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));page.on('crash',()=>result.errors.push('Renderer process crashed'));
  await page.setContent('<canvas width="32" height="32"></canvas>');await page.addScriptTag({content:code});await page.bringToFront();
  result.gpu=await page.evaluate(input=>{
   const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 required');
   const debug=gl.getExtension('WEBGL_debug_renderer_info'),r=Object.assign(Object.create(Renderer.prototype),{gl});
   // Use the same production program setup and routing as Renderer.constructor;
   // no world, actor, clock, player, quality or saved-state mutation is needed.
   r.program=r.makeProgram(VS,FS);r.setupSurfacePrograms();r.shadowProgram=r.makeProgram(VS,SHADOW_FS);
   const colour=r.surfaceProgram({kind:11,material:0,species:input.speciesIndex}),shadow=r.shadowProgram;
   if(colour!==r.surfacePrograms.get('11:0')||r.surfaceProgramFailures.size)throw Error('Production kind11 colour specialization must be available');
   const attached=(p,type)=>{const s=(gl.getAttachedShaders(p.p)||[]).find(s=>gl.getShaderParameter(s,gl.SHADER_TYPE)===type);if(!s)throw Error('Missing actual attached shader');return gl.getShaderSource(s);};
   const actualSources=Object.fromEntries(Object.entries({colour,shadow}).map(([pass,p])=>[pass,{vertex:attached(p,gl.VERTEX_SHADER),fragment:attached(p,gl.FRAGMENT_SHADER)}]));
   if(actualSources.colour.vertex!==VS||actualSources.shadow.vertex!==VS)throw Error('Attached colour/shadow source must be the unmodified production VS');
   const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),runs={},passSetup={},productionSetupError=gl.getError();
   const probes=input.fixtures.flatMap(f=>[
    {fixture:f.id,role:'center',p:f.p},
    ...[['u',f.u],['v',f.v]].flatMap(([axis,tangent])=>[1,.5].flatMap(step=>[-1,1].map(sign=>({fixture:f.id,role:axis+(sign>0?'Plus':'Minus')+(step===1?'':'Half'),p:f.p.map((v,i)=>v+tangent[i]*input.epsilon*step*sign)}))))
   ].map(p=>({...p,normal:f.normal,color:f.color,uv:f.uv,tag:f.tag})));
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);
   for(const pass of ['colour','shadow']){
    const source=actualSources[pass],program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,source.vertex),fs=compile(gl.FRAGMENT_SHADER,source.fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.transformFeedbackVaryings(program,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const p={p:program,u:{}},uniform=n=>gl.getUniformLocation(program,n);for(const name of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(name),false,identity);
    gl.uniform3f(uniform('uRenderOrigin'),0,0,0);gl.uniform3f(uniform('uCamera'),0,0,1);gl.uniform1i(uniform('uKind'),11);gl.uniform1i(uniform('uMat'),0);gl.uniform1i(uniform('uSpecies'),input.speciesIndex);
    r.speciesUniforms(p,{species:input.speciesIndex});const rig=gl.getUniform(program,uniform('uRigClass'));if(rig!==3)throw Error('Actual speciesUniforms must select the snailfish rig');
    // RASTERIZER_DISCARD still validates active fragment samplers. Preserve
    // the attached real FS, but give every active sampler a distinct valid
    // texture unit; sampler2D and sampler2DShadow may never alias unit zero.
    // These 1x1 resources only make the differential fixture draw-valid.
    const textures=[],samplers=[],maxUnits=gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
     const info=gl.getActiveUniform(program,i);if(![gl.SAMPLER_2D,gl.SAMPLER_2D_SHADOW].includes(info.type))continue;
     if(info.size!==1||samplers.length>=maxUnits)throw Error('Unsupported active sampler layout '+info.name);
     const unit=samplers.length,shadowSampler=info.type===gl.SAMPLER_2D_SHADOW,texture=gl.createTexture();textures.push(texture);
     gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(unit,null);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
     if(shadowSampler){gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT16,1,1,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,new Uint16Array([65535]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);}
     else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
     gl.uniform1i(uniform(info.name),unit);samplers.push({name:info.name,type:shadowSampler?'sampler2DShadow':'sampler2D',unit,readback:gl.getUniform(program,uniform(info.name))});
    }
    const feedback=gl.createTransformFeedback(),buffer=gl.createBuffer();gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,probes.length*6*4,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
    gl.validateProgram(program);passSetup[pass]={samplers,valid:!!gl.getProgramParameter(program,gl.VALIDATE_STATUS),validationLog:gl.getProgramInfoLog(program),error:gl.getError()};
    const capture=(time,rigClass)=>{
     const glStages={before:gl.getError()};
     gl.uniform1f(uniform('uTime'),time);gl.uniform1i(uniform('uRigClass'),rigClass);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
     glStages.begin=gl.getError();for(let i=0;i<probes.length;i++){const f=probes[i];
      gl.vertexAttrib3fv(0,f.p);gl.vertexAttrib3fv(1,f.normal);gl.vertexAttrib3fv(2,f.color);gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4f(4,.43,input.size,input.size,input.size);gl.vertexAttrib3f(5,1,1,1);gl.vertexAttrib2f(6,.37,.18);gl.vertexAttrib2fv(7,f.uv);gl.vertexAttrib1f(8,f.tag);gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,.2,0,input.beat);gl.drawArrays(gl.POINTS,0,1);
      if(i===0)glStages.firstDraw=gl.getError();
     }
     glStages.remainingDraws=gl.getError();gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);glStages.end=gl.getError();const data=new Float32Array(probes.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);glStages.readback=gl.getError();
     return {time,rigClass,points:probes.map((f,i)=>({fixture:f.fixture,role:f.role,p:Array.from(data.slice(i*6,i*6+3)),n:Array.from(data.slice(i*6+3,i*6+6))})),glStages,error:Object.values(glStages).find(code=>code!==0)||0};
    };
    runs[pass]={staticControl:capture(0,0),frames:input.times.map(time=>capture(time,3)),again:capture(input.times[0],3)};
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteTransformFeedback(feedback);gl.deleteBuffer(buffer);for(const texture of textures)gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
   }
   gl.bindVertexArray(null);gl.deleteVertexArray(vao);for(const p of new Set([r.program,r.shadowProgram,...r.surfacePrograms.values()]))gl.deleteProgram(p.p);
   return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,actualSources,sourceRoute:'Renderer.surfaceProgram → precompiled 11:0; Renderer.shadowProgram',size:input.size,transform:{yaw:.43,pitch:.18,phase:.37,scale:input.size,origin:[0,0,0]},productionSetupError,passSetup,runs,error:gl.getError()};
  },input);
  const gpu=result.gpu;gpu.attachedSourceSHA256=Object.fromEntries(Object.entries(gpu.actualSources).map(([pass,s])=>[pass,{vertex:sha(s.vertex),fragment:sha(s.fragment),vertexLength:s.vertex.length,fragmentLength:s.fragment.length}]));delete gpu.actualSources;
  check('native hardware executes the actual attached production colour/shadow shaders',!!gpu.renderer&&!/swiftshader|llvmpipe|softpipe|software/i.test(gpu.renderer)&&gpu.error===0,{renderer:gpu.renderer,error:gpu.error,sourceRoute:gpu.sourceRoute,attachedSourceSHA256:gpu.attachedSourceSHA256});
  check('real fragment samplers have valid distinct units before transform feedback',gpu.productionSetupError===0&&Object.values(gpu.passSetup).every(p=>p.valid&&p.error===0&&p.samplers.every(s=>s.unit===s.readback)&&new Set(p.samplers.map(s=>s.unit)).size===p.samplers.length),{productionSetupError:gpu.productionSetupError,passes:gpu.passSetup});
  const point=(frame,id,role)=>frame.points.find(p=>p.fixture===id&&p.role===role),oracle=(frame,id,half=false)=>{
   const suffix=half?'Half':'',du=sub(point(frame,id,'uPlus'+suffix).p,point(frame,id,'uMinus'+suffix).p),dv=sub(point(frame,id,'vPlus'+suffix).p,point(frame,id,'vMinus'+suffix).p),normal=unit(cross(du,dv));
   return {normal,du,dv};
  };
  const controls=new Map();
  for(const [pass,run]of Object.entries(gpu.runs)){
   for(const [mode,frames]of [['static',[run.staticControl]],['swimming',run.frames]])for(const frame of frames)for(const f of fixtures){
    const row={pass,mode,fixture:f.id,time:frame.time,gl:frame.error,passResult:false};
    try{
     const center=point(frame,f.id,'center'),whole=oracle(frame,f.id),half=oracle(frame,f.id,true),normal=unit(center.n),cosine=dot(normal,half.normal),wholeCosine=dot(normal,whole.normal),convergenceCosine=dot(whole.normal,half.normal),finite=frame.points.filter(p=>p.fixture===f.id).every(p=>p.p.concat(p.n).every(Number.isFinite)&&Math.abs(Math.hypot(...p.n)-1)<2e-6);
     Object.assign(row,{cosine,wholeCosine,cosineError:1-cosine,angleDegrees:Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI,convergenceCosine,finite,center,oracle:half.normal});
     row.fixtureValid=finite&&frame.error===0&&convergenceCosine>=1-convergenceTolerance&&(mode==='static'||controls.get(pass+'/'+f.id)===true);
     row.passResult=row.fixtureValid&&cosine>=1-cosineTolerance&&wholeCosine>=1-cosineTolerance;
     row.failureReason=row.passResult?null:!row.fixtureValid?'numeric or static-control failure; cannot attribute to swimming':'emitted normal disagrees with emitted-position tangent plane';
    }catch(error){row.failureReason='Invalid emitted fixture: '+error.message;}
    if(mode==='static')controls.set(pass+'/'+f.id,row.passResult);result.cases.push(row);
    check(pass+' '+mode+' '+f.id+' t='+frame.time,row.passResult,row);
   }
   check(pass+' same formal time repeats exactly',JSON.stringify(run.again)===JSON.stringify(run.frames[0]));
   for(const f of fixtures){const positions=run.frames.map(frame=>point(frame,f.id,'center').p),travel=Math.max(...positions.map(p=>distance(p,positions[0])));
    check(pass+' '+f.id+' '+(f.name.startsWith('head-')?'head remains steady':'surface actually moves'),f.name.startsWith('head-')?travel===0:travel>1e-5,{travel});
   }
  }
  check('colour and shadow emit exactly the same swimming positions and normals',JSON.stringify(gpu.runs.colour)===JSON.stringify(gpu.runs.shadow));
  check('no browser errors',result.errors.length===0,result.errors);
  result.status=result.checks.every(c=>c.pass)?'passed':'failed';
 }catch(error){result.status='failed';result.failure=error.stack||String(error);console.error(result.failure);}
 finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
 console.log(JSON.stringify({status:result.status,checks:result.checks.length,failed:result.checks.filter(c=>!c.pass).length,cases:result.cases.length,output}));if(result.status!=='passed')process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
