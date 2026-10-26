/* Execute the production colour/shadow vertex programs on native Chrome GPU.
 * Authored transform-feedback points test motion and surface tangents only;
 * they do not stand in for a complete animal, natural play or phone hardware. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console,performance});
const enginePath=process.argv.find(a=>a.startsWith('--engine='))?.slice(9)||path.join(root,'src/engine.js');vm.runInContext(fs.readFileSync(enginePath,'utf8'),ctx);
// Use the renderer's actual routing decision. Kind 11 uses the default vertex
// program; it is not one of surfaceShaderSource's supported specializations.
const sources=vm.runInContext('(()=>{const renderer=Object.create(Renderer.prototype),generic={vertex:VS};renderer.program=generic;renderer.surfacePrograms=new Map();const colour=renderer.surfaceProgram({kind:11,material:0});if(colour!==generic)throw Error("Unexpected frilled-shark surface routing");return {colour:colour.vertex,shadow:VS,shadowFragment:SHADOW_FS};})()',ctx);
if(process.argv.includes('--prepare-only')){console.log('PASS production kind-11 colour/shadow source preparation: '+sources.colour.length+'/'+sources.shadow.length+' characters');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(root,process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/frilled-shark-rig-browser.json');
const result={method:'Native GPU default colour program selected by Renderer.surfaceProgram and shared shadow vertex shader; authored input points and independent finite-difference surface normals. No whole-animal or gameplay claim.',checks:[],errors:[]};
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.setContent('<canvas width="32" height="32"></canvas>');
  result.gpu=await page.evaluate(sources=>{
   const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 required');const debug=gl.getExtension('WEBGL_debug_renderer_info');
   const compile=(type,text)=>{const shader=gl.createShader(type);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
   const center=[-.18,.015,.015],eps=.001,fixtures=[{name:'head',p:[.40,.025,.035],tag:1},{name:'eye',p:[.35,.028,.038],tag:4},{name:'tooth',p:[.47,.012,.013],tag:5},{name:'tail',p:[-.42,.01,0],tag:1},{name:'body',p:center,tag:1},...[[1,'skin'],[3,'fin'],[4,'eyeAttachment'],[5,'gill']].map(([tag,name])=>({name,p:[-.2,.023,.014],tag})),{name:'xPlus',p:[center[0]+eps,center[1],center[2]],tag:1},{name:'xMinus',p:[center[0]-eps,center[1],center[2]],tag:1},{name:'yPlus',p:[center[0],center[1]+eps,center[2]],tag:1},{name:'yMinus',p:[center[0],center[1]-eps,center[2]],tag:1}];
   const times=[0,.4,1.8,3.2,4.5,6.0,7.2],runs={};
   for(const pass of ['colour','shadow']){
    const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,sources[pass]),fs=compile(gl.FRAGMENT_SHADER,pass==='shadow'?sources.shadowFragment:'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.transformFeedbackVaryings(program,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const uniform=n=>gl.getUniformLocation(program,n),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);for(const n of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(n),false,identity);
    gl.uniform3f(uniform('uRenderOrigin'),0,0,0);gl.uniform3f(uniform('uCamera'),0,0,5);gl.uniform1i(uniform('uKind'),11);gl.uniform1i(uniform('uMat'),0);gl.uniform1i(uniform('uSpecies'),42);gl.uniform1i(uniform('uRigClass'),5);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,fixtures.length*6*4,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
    const capture=time=>{
     gl.uniform1f(uniform('uTime'),time);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
     for(const f of fixtures){gl.vertexAttrib3fv(0,f.p);gl.vertexAttrib3f(1,0,0,1);gl.vertexAttrib3f(2,.34,.255,.19);gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4f(4,0,1.7,1.7,1.7);gl.vertexAttrib3f(5,1,1,1);gl.vertexAttrib2f(6,.37,0);gl.vertexAttrib2f(7,0,0);gl.vertexAttrib1f(8,f.tag);gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,.2,0,1.35);gl.drawArrays(gl.POINTS,0,1);}
     gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);const data=new Float32Array(fixtures.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);return fixtures.map((f,i)=>({name:f.name,p:Array.from(data.slice(i*6,i*6+3)),n:Array.from(data.slice(i*6+3,i*6+6))}));
    };
    runs[pass]={frames:times.map(t=>({t,points:capture(t)})),again:capture(0)};gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
   }
   return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,fixtures,times,runs,error:gl.getError()};
  },sources);
  const check=(name,run)=>{run();result.checks.push(name);console.log('PASS '+name);},gpu=result.gpu,point=(f,name)=>f.points.find(p=>p.name===name),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  assert(gpu.renderer&&!/swiftshader|llvmpipe|software/i.test(gpu.renderer),'Native hardware renderer');assert.equal(gpu.error,0);
  check('head, eyes and teeth stay steady while the rear body and tail alternate laterally within the physical envelope',()=>{
   for(const run of Object.values(gpu.runs)){
    for(const name of ['head','eye','tooth'])for(const frame of run.frames)assert.deepEqual(point(frame,name),point(run.frames[0],name),name+' remains steady');
    const tail=run.frames.map(f=>point(f,'tail').p[2]);assert(Math.min(...tail)<-.025&&Math.max(...tail)>.025,'Tail travels to both sides');assert(Math.max(...tail)-Math.min(...tail)>.10,'Visible lateral tail motion');assert(tail.every(z=>Math.abs(z)<.125),'Less than 12.5 cm of physical lateral motion');
    for(const frame of run.frames){const p=point(frame,'body').p;assert(Math.abs(p[2]-.015*1.7)<.08,'Mid-body motion remains bounded');}
    assert(distance(point(run.frames[0],'body').p,point(run.frames[3],'body').p)>.01,'Rear trunk participates in propulsion');
   }
  });
  check('all attachments share exactly the moving body surface instead of separating at their roots',()=>{for(const run of Object.values(gpu.runs))for(const frame of run.frames)for(const name of ['fin','eyeAttachment','gill']){const a=point(frame,'skin'),b=point(frame,name);assert.deepEqual(a.p,b.p);assert.deepEqual(a.n,b.n);}});
  check('normal transformation agrees with independently sampled GPU surface tangents',()=>{
   for(const run of Object.values(gpu.runs))for(const frame of run.frames){
    const dx=point(frame,'xPlus').p.map((v,i)=>v-point(frame,'xMinus').p[i]),dy=point(frame,'yPlus').p.map((v,i)=>v-point(frame,'yMinus').p[i]),cross=[dx[1]*dy[2]-dx[2]*dy[1],dx[2]*dy[0]-dx[0]*dy[2],dx[0]*dy[1]-dx[1]*dy[0]],len=Math.hypot(...cross),normal=point(frame,'body').n;
    assert(cross.reduce((n,v,i)=>n+v/len*normal[i],0)>.99999,'Normal follows the actual deformed tangent plane');
    for(const p of frame.points){assert(p.p.concat(p.n).every(Number.isFinite));assert(Math.abs(Math.hypot(...p.n)-1)<1e-5);}
   }
  });
  check('formal time freezes deterministically and colour and shadow passes use identical animation',()=>{
   for(const run of Object.values(gpu.runs))assert.deepEqual(run.again,run.frames[0].points);
   assert.deepEqual(gpu.runs.colour,gpu.runs.shadow,'Default colour and shadow transforms agree');
  });
  assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.failure=e.stack;throw e;}
 finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
