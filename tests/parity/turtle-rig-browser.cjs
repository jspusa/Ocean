/* Actual high/low turtle vertices through the production WebGL vertex shader.
 * GPU contact/normal evidence is separate from complete visual acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console});
for(const name of ['engine','world','next_reef'])vm.runInContext(fs.readFileSync(path.join(root,'src/'+name+'.js'),'utf8'),c);
const vs=vm.runInContext('VS',c),out=path.resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/v01837-realism/turtle-rig.json');
const report={status:'running',method:'Actual authored high/low turtle vertices and production VS in headless native Chrome transform feedback; no physical-phone or whole-animal visual claim.',shaderSHA256:crypto.createHash('sha256').update(vs).digest('hex'),checks:[]};
const check=(name,fn)=>{try{fn();report.checks.push({name,passed:true});}catch(e){report.checks.push({name,passed:false,error:e.message});}};
const norm=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const fixtures=[];
for(const [lod,expression]of [['high','turtleGeometry()'],['low','distantTurtle()']]){
 const g=JSON.parse(JSON.stringify(vm.runInContext(expression,c))),all=[];for(let i=0;i<g.v.length;i+=12)all.push({p:g.v.slice(i,i+3),n:g.v.slice(i+3,i+6),tag:g.v[i+11],lod});
 for(const [name,predicate]of [['rigid',v=>v.tag!==2],['root',v=>v.tag===2&&Math.abs(v.p[2])<=.5100001],['fin',v=>v.tag===2&&Math.abs(v.p[2])>1.05]]){
  const rows=all.filter(predicate);assert(rows.length,lod+' '+name);const stride=Math.max(1,Math.floor(rows.length/60));
  for(let i=0;i<rows.length;i+=stride)fixtures.push({...rows[i],name});
 }
}
const differential=[],eps=.0004;
for(const z of [-1.7,-1.45,-.9,-.511,-.51,.48,.51,.511,.9,1.45,1.7])for(const n of [[0,1,0],norm([.4,.7,.2])]){
 const p=[.12,-.05,z],u=norm(cross(Math.abs(n[1])<.8?[0,1,0]:[1,0,0],n)),v=cross(n,u);
 differential.push({p,n,tag:2});for(const t of [u,v])for(const s of [-1,1])differential.push({p:p.map((x,i)=>x+s*eps*t[i]),n,tag:2});
}
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));const page=await browser.newPage();await page.setContent('<canvas width="16" height="16"></canvas>');
  const times=[0,.4,1.2,2.6,4.5],gpu=await page.evaluate(({vs,fixtures,differential,times})=>{
   const gl=document.querySelector('canvas').getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const p=gl.createProgram(),vertex=compile(gl.VERTEX_SHADER,vs),fragment=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');
   gl.attachShader(p,vertex);gl.attachShader(p,fragment);gl.transformFeedbackVaryings(p,['vWorld','vNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
   const uniform=k=>gl.getUniformLocation(p,k),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];for(const k of ['uVP','uLightVP','uDynamicLightVP'])gl.uniformMatrix4fv(uniform(k),false,identity);gl.uniform1i(uniform('uKind'),2);gl.uniform1i(uniform('uMat'),5);
   const buffer=gl.createBuffer();function capture(rows,time){
    gl.uniform1f(uniform('uTime'),time);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,rows.length*24,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);
    for(const f of rows){gl.vertexAttrib3fv(0,f.p);gl.vertexAttrib3fv(1,f.n);gl.vertexAttrib3f(2,.5,.5,.5);gl.vertexAttrib3f(3,0,0,0);gl.vertexAttrib4f(4,0,1,1,1);gl.vertexAttrib3f(5,1,1,1);gl.vertexAttrib2f(6,.35,0);gl.vertexAttrib2f(7,0,0);gl.vertexAttrib1f(8,f.tag);gl.vertexAttrib4f(9,1,1,1,1);gl.vertexAttrib4f(10,.5,.5,.5,.5);gl.vertexAttrib4f(11,0,0,0,0);gl.drawArrays(gl.POINTS,0,1);}
    gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);const a=new Float32Array(rows.length*6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,a);return Array.from(a);
   }
   const motion=times.map(t=>capture(fixtures,t)),normals=times.map(t=>capture(differential,t));return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,error:gl.getError(),motion,normals};
  },{vs,fixtures,differential,times});report.renderer=gpu.renderer;
  check('native WebGL produces finite positions and normals without errors',()=>{assert(gpu.renderer&&!/swiftshader|software|llvmpipe/i.test(gpu.renderer));assert.equal(gpu.error,0);assert([...gpu.motion,...gpu.normals].every(a=>a.every(Number.isFinite)));});
  check('shell, plastron, eyes, head and seated roots stay rigid at both LODs',()=>{
   for(let i=0;i<fixtures.length;i++)if(fixtures[i].name!=='fin')for(const f of gpu.motion){assert.deepEqual(f.slice(i*6,i*6+3),fixtures[i].p.map(Math.fround),fixtures[i].lod+' '+fixtures[i].name+' '+fixtures[i].p);assert.deepEqual(f.slice(i*6+3,i*6+6),gpu.motion[0].slice(i*6+3,i*6+6));}
  });
  check('both low and high flippers retain a visible bounded stroke',()=>{for(const lod of ['low','high']){let max=0;for(let i=0;i<fixtures.length;i++)if(fixtures[i].lod===lod&&fixtures[i].name==='fin')for(const f of gpu.motion){const d=Math.abs(f[i*6+1]-fixtures[i].p[1]);assert(d<=.370001);max=Math.max(max,d);}assert(max>.15,lod+' fin motion');}});
  check('animated normals follow independently measured surface tangents',()=>{let min=1;for(const frame of gpu.normals)for(let i=0;i<differential.length;i+=5){const at=k=>frame.slice((i+k)*6,(i+k)*6+3),a=at(1),b=at(2),d=at(3),e=at(4),expected=norm(cross(b.map((x,j)=>x-a[j]),e.map((x,j)=>x-d[j]))),n=frame.slice(i*6+3,i*6+6),dot=expected.reduce((s,x,j)=>s+x*n[j],0);min=Math.min(min,dot);assert(dot>.9999,'z='+differential[i].p[2]+' normal dot='+dot);}report.minimumNormalDot=min;});
  report.status=report.checks.every(x=>x.passed)?'passed':'failed';report.samples=fixtures.length;for(const c of report.checks)console.log((c.passed?'PASS ':'FAIL ')+c.name+(c.error?' '+c.error:''));if(report.status==='failed')process.exitCode=1;
 }catch(e){report.status='failed';report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await browser?.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));}
})();
