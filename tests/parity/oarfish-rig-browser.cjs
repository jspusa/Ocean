/* Execute the production vertex shader on the native GPU. These small authored
 * vertex fixtures isolate attachment/motion semantics; they are not screenshots
 * of a complete animal or evidence of natural play / physical phone performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console,performance});
const enginePath=process.argv.find(a=>a.startsWith('--engine='))?.slice(9)||path.join(root,'src/engine.js');
vm.runInContext(fs.readFileSync(enginePath,'utf8'),ctx);
const vertexSource=vm.runInContext('VS',ctx),Renderer=vm.runInContext('Renderer',ctx);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(root,process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/oarfish-rig-browser.json');
const result={method:'Production VS transform feedback on native Chrome GPU, independent body/root/fin/eye fixtures; no whole-animal or gameplay claim.',checks:[],errors:[]};
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.setContent('<canvas width="32" height="32"></canvas>');
  result.gpu=await page.evaluate(source=>{
   const gl=document.querySelector('canvas').getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
   if(!gl)throw Error('WebGL2 required');
   const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,source));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}'));
   gl.transformFeedbackVaryings(p,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
   const uniform=(name)=>gl.getUniformLocation(p,name),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   for(const name of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(name),false,identity);
   gl.uniform3f(uniform('uRenderOrigin'),0,-480,0);gl.uniform3f(uniform('uCamera'),0,-480,5);gl.uniform1i(uniform('uKind'),11);gl.uniform1i(uniform('uMat'),6);gl.uniform1i(uniform('uSpecies'),41);gl.uniform1i(uniform('uRigClass'),4);
   const fixtures=[{name:'body',p:[-.2,.03,0],normal:[0,0,1],tag:1},{name:'root',p:[-.2,.035,0],normal:[0,0,1],tag:3},{name:'edge',p:[-.2,.08,0],normal:[0,0,1],tag:3},{name:'eye',p:[.47,.018,.009],normal:[0,0,1],tag:4},{name:'pelvic',p:[.296,-.213,.021],normal:[0,0,1],tag:5}];
   const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,fixtures.length*6*4,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   const capture=time=>{
    gl.uniform1f(uniform('uTime'),time);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
    for(const f of fixtures){
     gl.vertexAttrib3fv(0,f.p);gl.vertexAttrib3fv(1,f.normal);gl.vertexAttrib3f(2,.8,.8,.8);gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4f(4,0,4,4,4);gl.vertexAttrib3f(5,1,1,1);gl.vertexAttrib2f(6,0,0);gl.vertexAttrib2f(7,.035,.012);gl.vertexAttrib1f(8,f.tag);gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,.2,0,3.2);gl.drawArrays(gl.POINTS,0,1);
    }
    gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);const data=new Float32Array(fixtures.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);return fixtures.map((f,i)=>({name:f.name,p:Array.from(data.slice(i*6,i*6+3)),n:Array.from(data.slice(i*6+3,i*6+6))}));
   };
   const a=capture(.2),b=capture(.7),again=capture(.2),error=gl.getError();gl.deleteBuffer(buffer);gl.deleteProgram(p);return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,a,b,again,error};
  },vertexSource);
  const check=(name,fn)=>{fn();result.checks.push(name);console.log('PASS '+name);};
  const g=result.gpu;assert(g.renderer&&!/swiftshader|llvmpipe|software/i.test(g.renderer));assert.equal(g.error,0);
  for(const rows of [g.a,g.b,g.again])for(const r of rows){assert(r.p.concat(r.n).every(Number.isFinite),'valid native transform fixture');assert(Math.abs(Math.hypot(...r.n)-1)<1e-5);}
  check('long dorsal edge moves while body, eyes and attached root remain fixed',()=>{
   for(const name of ['body','root','eye','pelvic'])assert.deepEqual(g.a.find(x=>x.name===name),g.b.find(x=>x.name===name),name+' must remain attached and steady');
   const a=g.a.find(x=>x.name==='edge'),b=g.b.find(x=>x.name==='edge');assert(Math.abs(a.p[2]-b.p[2])>.015,'four-metre animal needs real bounded fin displacement');assert(Math.abs(a.p[2])<.06&&Math.abs(b.p[2])<.06);assert.notDeepEqual(a.n,b.n,'deformed fin normals must follow the surface');
  });
  check('the same formal time reproduces the frozen fin pose',()=>assert.deepEqual(g.a,g.again));
  check('all captured geometry and normals stay finite and normalized',()=>{for(const rows of [g.a,g.b,g.again])for(const r of rows){assert(r.p.concat(r.n).every(Number.isFinite));assert(Math.abs(Math.hypot(...r.n)-1)<1e-5);}});
  check('normal render submission selects the oarfish rig and reflective skin only for that species',()=>{
   vm.runInContext('const SPECIES=[{motionProfile:{type:"oarfish"},materialProfile:{roughness:.34,subsurface:.02,patternScale:45,skin:"silver"}},{motionProfile:{type:"snailfish"},materialProfile:{roughness:.56,subsurface:.6,patternScale:14,skin:"gelatinous"}}];',ctx);
   const calls=[],renderer=Object.create(Renderer.prototype);renderer.set1i=(p,k,v)=>calls.push([k,v]);renderer.set4f=(p,k,...values)=>calls.push([k,...values]);renderer.speciesUniforms({}, {species:0});assert.deepEqual(calls[0],['uRigClass',4]);assert.equal(calls[1].at(-1),6);calls.length=0;renderer.speciesUniforms({}, {species:1});assert.deepEqual(calls[0],['uRigClass',3]);assert.equal(calls[1].at(-1),5);
  });
  assert.deepEqual(result.errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.failure=e.stack;throw e;}
 finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
