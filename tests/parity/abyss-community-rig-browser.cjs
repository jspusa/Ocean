/* Formal Renderer -> native WebGL boundary. Authored probe points test pinned
 * anatomy and inverse-transpose normals; full models and normal play are separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console,performance});
const source=fs.readFileSync(path.join(root,'src/engine.js'),'utf8');vm.runInContext(source,ctx);
vm.runInContext('const SPECIES=[{motionProfile:{type:"tripod_fish"}},{motionProfile:{type:"dumbo_octopus"}}]',ctx);
const Renderer=vm.runInContext('Renderer',ctx),renderer=Object.create(Renderer.prototype),rigs=[];
renderer.set1i=(p,key,value)=>{if(key==='uRigClass')rigs.push(value);};renderer.set4f=()=>{};for(let species=0;species<2;species++)renderer.speciesUniforms({}, {species});
const output=path.resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/v01834-community/rig.json');
const result={method:'Formal production speciesUniforms and VS transform feedback on native Chrome. Independent anatomical probes and finite-difference surface tangents; not whole-animal images, normal play or physical-phone evidence.',engineSHA256:crypto.createHash('sha256').update(source).digest('hex'),rigs,status:'running',checks:[],errors:[]};
(async()=>{
 let browser;
 try{
  assert.deepEqual(rigs,[7,8],'Formal renderer must select the two real new rigs');
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.setContent('<canvas width="32" height="32"></canvas>');
  result.gpu=await page.evaluate(({source,rigs})=>{
   const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 required');const debug=gl.getExtension('WEBGL_debug_renderer_info');
   const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,source),fs=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.transformFeedbackVaryings(program,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const uniform=n=>gl.getUniformLocation(program,n),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);for(const n of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(n),false,identity);gl.uniform1i(uniform('uKind'),11);gl.uniform1i(uniform('uMat'),0);
   const fixtures=[
    {name:'tripod-body',rig:7,p:[.2,.96,0],tag:1,fixed:true},
    ...[[.38,0,.48],[.38,0,-.48],[-1.1,0,0]].map((p,i)=>({name:'support-'+i,rig:7,p,tag:7,fixed:true})),
    {name:'sensory-root',rig:7,p:[.27,.971,.043],tag:3,fixed:true},
    {name:'sensory-edge',rig:7,p:[.50,1.25,.25],tag:3},
    {name:'dumbo-mantle',rig:8,p:[0,.3,.1],tag:1,fixed:true},
    {name:'dumbo-eye',rig:8,p:[.17,-.03,.12],tag:4,fixed:true},
    {name:'ear-root',rig:8,p:[0,.16,.17],tag:3,fixed:true},
    {name:'ear-edge',rig:8,p:[0,.22,.48],tag:3},
    {name:'web-root',rig:8,p:[.13,-.06,.05],tag:5,fixed:true},
    {name:'web-arm',rig:8,p:[.28,-.36,.18],tag:5}
   ];
   const probes=[];for(const f of fixtures){probes.push({...f,n:[0,0,1]});for(const k of [0,1])for(const sign of [-1,1]){const p=f.p.slice();p[k]+=sign*.0005;probes.push({...f,p,n:[0,0,1]});}}
   const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,probes.length*24,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   const capture=time=>{gl.uniform1f(uniform('uTime'),time);const result=[];
    // A uniform cannot change within active transform feedback. Capture each
    // species separately into the same range and retain its matching probes.
    for(const rig of rigs){gl.uniform1i(uniform('uRigClass'),rig);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
     for(const f of probes){gl.vertexAttrib3fv(0,f.p);gl.vertexAttrib3fv(1,f.n);gl.vertexAttrib3f(2,.5,.5,.5);gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4f(4,0,1,1,1);gl.vertexAttrib3f(5,1,1,1);gl.vertexAttrib2f(6,.35,0);gl.vertexAttrib2f(7,0,0);gl.vertexAttrib1f(8,f.tag);gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,0,0,rig===7?.6:1.1);gl.drawArrays(gl.POINTS,0,1);}
     gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);const data=new Float32Array(probes.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);
     for(let i=0;i<fixtures.length;i++){const f=fixtures[i];if(f.rig!==rig)continue;const points=Array.from({length:5},(_,j)=>Array.from(data.slice((i*5+j)*6,(i*5+j)*6+3)));result.push({...f,p:points[0],n:Array.from(data.slice(i*30+3,i*30+6)),points});}
    }return result;};
   const times=[.2,.7,2,5],frames=times.map(capture),again=capture(.2),error=gl.getError();gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,times,frames,again,error};
  },{source:vm.runInContext('VS',ctx),rigs});
  const g=result.gpu;assert(g.renderer&&!/swiftshader|llvmpipe|software/i.test(g.renderer));assert.equal(g.error,0);assert.deepEqual(g.frames[0],g.again);
  for(const f of g.frames[0]){const rows=g.frames.map(frame=>frame.find(r=>r.name===f.name));if(f.fixed)for(const r of rows)assert.deepEqual(r.p,f.p,f.name+' remains attached');else assert(rows.some(r=>Math.hypot(...r.p.map((v,i)=>v-f.p[i]))>.002),f.name+' must visibly move');}
  result.checks.push('Support triangle, body, eyes and attachment roots stay fixed; sensory pectorals, ears and webbed arms animate deterministically');
  for(const frame of g.frames)for(const row of frame){assert(row.p.concat(row.n).every(Number.isFinite));assert(Math.abs(Math.hypot(...row.n)-1)<1e-5);const u=row.points[2].map((v,i)=>v-row.points[1][i]),v=row.points[4].map((n,i)=>n-row.points[3][i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...cross),dot=cross.reduce((s,n,i)=>s+n/length*row.n[i],0);assert(dot>.9999,row.name+' inverse-transpose normal follows its actual GPU deformed surface');}
  result.checks.push('Every native normal matches independent finite-difference deformed surface tangents');assert.deepEqual(result.errors,[]);result.status='passed';console.log(result.checks.join('\n'));
 }catch(e){result.status='failed';result.failure=e.stack;throw e;}
 finally{if(browser)await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
