/* Formal Renderer -> native WebGL boundary for Dumbo crown motion.
 * Behaviour is measured from GPU positions and differential surface tangents.
 * This does not establish whole-animal appearance or physical-phone performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const baselineCommit='b41784703a5c31b206d846964037c62d9ab6003a';
const source=fs.readFileSync(path.join(root,'src/engine.js'),'utf8');
const baseline=execFileSync('git',['show',baselineCommit+':src/engine.js'],{cwd:root,encoding:'utf8'});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const types=[null,'vampire','sea_pig','snailfish','oarfish','frilled_shark','barreleye','tripod_fish','dumbo_octopus'];
function productionShader(text){
 const ctx=vm.createContext({console,performance});vm.runInContext(text,ctx);
 vm.runInContext('const SPECIES='+JSON.stringify(types.map(type=>({motionProfile:{type}}))),ctx);
 const Renderer=vm.runInContext('Renderer',ctx),renderer=Object.create(Renderer.prototype),rigs=[];
 renderer.set1i=(p,key,value)=>{if(key==='uRigClass')rigs.push(value);};renderer.set4f=()=>{};
 for(let species=0;species<types.length;species++)renderer.speciesUniforms({}, {species});
 return {vs:vm.runInContext('VS',ctx),rigs};
}
const candidate=productionShader(source),previous=productionShader(baseline);
const output=path.resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/v01835-realism/dumbo-soft-motion.json');
const result={method:'Production speciesUniforms and vertex shaders in native WebGL transform feedback. Crown depth independence, finite-difference normals, pinned roots, bounded radial strain, and exact previous-rig output.',baselineCommit,engineSHA256:hash(source),baselineEngineSHA256:hash(baseline),status:'running',checks:[],errors:[]};
function check(name,fn){
 try{fn();result.checks.push({name,status:'passed'});}
 catch(error){result.checks.push({name,status:'failed',message:error.message});}
}
const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
const dot=(u,v)=>u.reduce((sum,n,i)=>sum+n*v[i],0);
const norm=v=>{const length=Math.hypot(...v);return v.map(n=>n/length);};

(async()=>{
 let browser;
 try{
  assert.deepEqual(candidate.rigs,[0,1,2,3,4,5,6,7,8]);assert.deepEqual(previous.rigs,candidate.rigs);
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const page=await browser.newPage();page.on('pageerror',error=>result.errors.push(error.message));
  await page.setContent('<canvas width="32" height="32"></canvas>');
  const normalDirections=[[0,0,1],[1,0,0],norm([.35,-.3,.65])];
  const normalLevels=[-.03,-.06,-.061,-.18,-.30,-.40,-.46,-.50];
  const differential=[];
  for(const y of normalLevels)for(let orientation=0;orientation<normalDirections.length;orientation++){
   const n=normalDirections[orientation],u=norm(cross(Math.abs(n[1])<.8?[0,1,0]:[1,0,0],n)),v=cross(n,u);
   const p=[.215,y,.14],epsilon=.0004,name='depth-'+y+'-normal-'+orientation;
   differential.push({name,p,n,tag:5});
   for(const tangent of [u,v])for(const sign of [-1,1])differential.push({name,p:p.map((value,i)=>value+sign*epsilon*tangent[i]),n,tag:5});
  }
  const crown=[
   {name:'root',p:[.17,-.06,.08],n:[0,0,1],tag:5,fixed:true},
   {name:'above-root',p:[.14,-.03,.12],n:[0,0,1],tag:5,fixed:true},
   {name:'upper',p:[.215,-.18,.10],n:[0,0,1],tag:5},
   {name:'lower',p:[.30,-.40,.14],n:[0,0,1],tag:5},
   ...[-.061,-.12,-.20,-.32,-.46,-.50].flatMap(y=>[0,1,2].map(angle=>({name:'bound-'+y+'-'+angle,p:[Math.cos(angle)*.36,y,Math.sin(angle)*.36],n:[0,0,1],tag:5})))
  ];
  const oldPoints=[[.23,.12,.18],[-.32,.22,-.26],[.53,.07,.48],[-.46,.02,.08],[0,.5,.20],[.27,.971,.043],[.50,1.25,.25]];
  const oldFixtures=oldPoints.flatMap((p,index)=>[1,3,4,5,7].map(tag=>({name:'previous-'+index+'-'+tag,p,n:norm([.31,.52,.79]),tag,transform:index%2?[.42,.72,1.3,.89]:[0,1,1,1]})));
  const preservedDumbo=[
   {name:'mantle',p:[0,.3,.1],n:norm([.2,.3,.8]),tag:1},
   {name:'eye',p:[.17,-.03,.12],n:[1,0,0],tag:4},
   {name:'ear-root',p:[0,.16,.17],n:[0,0,1],tag:3},
   {name:'ear-right',p:[0,.22,.48],n:norm([.1,.7,.3]),tag:3},
   {name:'ear-left',p:[0,.22,-.48],n:norm([.1,.7,-.3]),tag:3}
  ];
  const times=[0,.4,1.15,2.4,4.7,7.1];
  const gpu=await page.evaluate(({candidate,previous,oldFixtures,preservedDumbo,crown,differential,times})=>{
   const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 required');
   const debug=gl.getExtension('WEBGL_debug_renderer_info');
   const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
   const programs=[],shaders=[];
   function makeProgram(source){
    const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,source),fs=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');
    shaders.push(vs,fs);programs.push(program);gl.attachShader(program,vs);gl.attachShader(program,fs);
    gl.transformFeedbackVaryings(program,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniform=name=>gl.getUniformLocation(program,name),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    for(const name of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(name),false,identity);
    gl.uniform1i(uniform('uKind'),11);gl.uniform1i(uniform('uMat'),0);
    return {program,uniform};
   }
   const current=makeProgram(candidate.vs),old=makeProgram(previous.vs),buffer=gl.createBuffer();
   function capture(shader,rig,fixtures,time){
    gl.useProgram(shader.program);gl.uniform1i(shader.uniform('uRigClass'),rig);gl.uniform1f(shader.uniform('uTime'),time);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,fixtures.length*24,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
    gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
    for(const fixture of fixtures){
     gl.vertexAttrib3fv(0,fixture.p);gl.vertexAttrib3fv(1,fixture.n);gl.vertexAttrib3f(2,.5,.5,.5);
     gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4fv(4,fixture.transform||[0,1,1,1]);gl.vertexAttrib3f(5,1,1,1);
     gl.vertexAttrib2f(6,.35,0);gl.vertexAttrib2f(7,.21,.67);gl.vertexAttrib1f(8,fixture.tag);
     gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,0,0,rig===7?.6:1.1);
     gl.drawArrays(gl.POINTS,0,1);
    }
    gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
    const data=new Float32Array(fixtures.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);
    return {values:Array.from(data),bits:Array.from(new Uint32Array(data.buffer))};
   }
   const oldRigs=[];
   for(const rig of candidate.rigs.slice(0,8))for(const time of times)oldRigs.push({rig,time,current:capture(current,rig,oldFixtures,time),baseline:capture(old,rig,oldFixtures,time)});
   const preserved=times.map(time=>({time,current:capture(current,8,preservedDumbo,time),baseline:capture(old,8,preservedDumbo,time)}));
   const motion=times.map(time=>capture(current,8,crown,time)),normals=times.map(time=>capture(current,8,differential,time));
   const repeat=capture(current,8,crown,times[0]),error=gl.getError();
   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteBuffer(buffer);programs.forEach(program=>gl.deleteProgram(program));shaders.forEach(shader=>gl.deleteShader(shader));
   return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,error,oldRigs,preserved,motion,normals,repeat};
  },{candidate,previous,oldFixtures,preservedDumbo,crown,differential,times});
  result.renderer=gpu.renderer;result.times=times;result.glError=gpu.error;
  const point=(capture,index)=>capture.values.slice(index*6,index*6+3);
  const normal=(capture,index)=>capture.values.slice(index*6+3,index*6+6);
  check('Native WebGL completes without errors',()=>{assert(gpu.renderer&&!/swiftshader|llvmpipe|software/i.test(gpu.renderer));assert.equal(gpu.error,0);assert.deepEqual(result.errors,[]);});
  check('Previous rigs 0 through 7 retain bit-identical positions and normals',()=>{
   for(const row of gpu.oldRigs)assert.deepEqual(row.current.bits,row.baseline.bits,'rig '+row.rig+' at '+row.time);
  });
  result.preservedRigSamples=gpu.oldRigs.length*oldFixtures.length;
  result.preservedRigOutputSHA256=hash(Buffer.from(new Uint32Array(gpu.oldRigs.flatMap(row=>row.current.bits)).buffer));
  check('Dumbo mantle, eyes and both ear motions retain bit-identical output',()=>{
   for(const row of gpu.preserved)assert.deepEqual(row.current.bits,row.baseline.bits,'unchanged Dumbo anatomy at '+row.time);
  });
  check('Crown displacement is deterministic and every position and normal is finite',()=>{
   assert.deepEqual(gpu.motion[0].bits,gpu.repeat.bits);
   for(const group of [gpu.motion,gpu.normals])for(const frame of group)assert(frame.values.every(Number.isFinite));
  });
  check('Crown roots stay pinned, axial position stays fixed and radial strain never exceeds 4.5 percent',()=>{
   let maxStrain=0;
   for(const frame of gpu.motion)for(let i=0;i<crown.length;i++){
    const fixture=crown[i],p=point(frame,i),initial=fixture.p.map(Math.fround),radius=Math.hypot(initial[0],initial[2]);
    assert.equal(p[1],initial[1],fixture.name+' axial position');
    if(fixture.fixed){assert.deepEqual(p,initial,fixture.name+' position');assert.deepEqual(normal(frame,i),fixture.n,fixture.name+' normal');}
    const strain=Math.abs(Math.hypot(p[0],p[2])/radius-1);maxStrain=Math.max(maxStrain,strain);
    assert(strain<=.045001,fixture.name+' strain '+strain);
    assert(Math.abs(p[0]*initial[2]-p[2]*initial[0])<2e-8,fixture.name+' radial direction');
   }
   result.maximumObservedRadialStrain=maxStrain;
  });
  check('Different crown depths have independent motion timing instead of one scaled pulse',()=>{
   const series=name=>{const index=crown.findIndex(f=>f.name===name),p=crown[index].p.map(Math.fround),radius=Math.hypot(p[0],p[2]);return gpu.motion.map(frame=>{const p=point(frame,index);return Math.hypot(p[0],p[2])/radius-1;});};
   const upper=series('upper'),lower=series('lower'),scale=dot(upper,lower)/dot(upper,upper);
   const residual=lower.map((value,i)=>value-scale*upper[i]),relativeResidual=Math.hypot(...residual)/Math.hypot(...lower);
   result.crownMotion={upper,lower,relativeResidual};
   assert(Math.hypot(...upper)/Math.sqrt(times.length)>.001,'upper crown must move');assert(Math.hypot(...lower)/Math.sqrt(times.length)>.001,'lower crown must move');
   assert(relativeResidual>.12,'Depth motion is still proportional: normalized residual '+relativeResidual);
  });
  check('GPU normals follow independent finite-difference surface tangents at roots, crown depths and distal boundary',()=>{
   let minimumDot=1;
   for(const frame of gpu.normals)for(let i=0;i<differential.length;i+=5){
    const normalValue=normal(frame,i),u=point(frame,i+2).map((value,axis)=>value-point(frame,i+1)[axis]),v=point(frame,i+4).map((value,axis)=>value-point(frame,i+3)[axis]);
    assert(Math.abs(Math.hypot(...normalValue)-1)<1e-5,differential[i].name+' unit normal');
    const tangentNormal=norm(cross(u,v)),agreement=dot(tangentNormal,normalValue);minimumDot=Math.min(minimumDot,agreement);
    assert(agreement>.9999,differential[i].name+' normal/tangent dot '+agreement);
   }
   result.minimumDifferentialNormalDot=minimumDot;
  });
  result.status=result.checks.some(check=>check.status==='failed')?'failed':'passed';
  for(const item of result.checks)console.log(item.status.toUpperCase()+': '+item.name+(item.message?' — '+item.message:''));
  if(result.status==='failed')process.exitCode=1;
 }catch(error){result.status='failed';result.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{if(browser)await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})();
