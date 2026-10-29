/* Actual compiled body vertices anchor a controlled incoming-colour intervention.
 * Native mode probes the production FS immediately before lighting: identical
 * surface position, genes and footprint must not inherit polygon colour tiles.
 * Historical RED receipts retain the original broken shared-position seams;
 * a repaired mesh must not be required to keep those colour discontinuities.
 * This is a material-interface test, not natural-play or realism acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const out=path.resolve(root,option('out','qa/parity/v01838-material/reef-material.json')),cpu=process.argv.includes('--cpu'),baseline=option('baseline',null);
const engineRef=option('engine-ref',null);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex'),source=engineRef?require('node:child_process').execFileSync('git',['show',engineRef+':src/engine.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),context=vm.createContext({console});
const modules=JSON.parse('['+fs.readFileSync(path.join(root,'bake_scene.cjs'),'utf8').match(/for\(const n of \[([^\]]+)\]/)[1].replaceAll("'",'"')+']');
for(const name of modules)vm.runInContext(name==='engine.js'?source:fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
const species=vm.runInContext('SPECIES.map(s=>({id:s.id,renderKind:s.renderKind}))',context),fragment=vm.runInContext('FS',context);
const bytes=fs.readFileSync(path.join(root,'assets/reef.mesh.gz')),raw=zlib.gunzipSync(bytes),offset=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,offset));
const ids=['lyretail_anthias','banggai_cardinal','longnose_butterfly','fire_goby'],fixtures=[],witnesses=[];
const report={status:'running',method:'Actual compiled candidate body vertices anchor a controlled incoming vertex-colour intervention: keep local position, genes and footprint identical, change only incoming colour. The second colour is deliberately contrasting test input, not claimed to come from a broken candidate seam. Historical shared-position discontinuities are diagnostic only; repaired meshes need not retain them. The diagnostic varying vertex stage feeds the production fragment pigment boundary before lighting, not the complete production VS. No natural-play, GPU-cost or photorealism claim.',engineRef,engineSHA256:hash(source),fragmentSHA256:hash(fragment),archiveSHA256:hash(bytes),witnesses,checks:[]};
function check(name,fn){try{const detail=fn();report.checks.push({name,passed:true,detail});}catch(error){report.checks.push({name,passed:false,error:error.message});}}
const distance=(a,b)=>Math.max(...a.map((v,k)=>Math.abs(v-b[k])));
for(const id of ids){const index=species.findIndex(s=>s.id===id),batches=header.batches.filter(b=>b.species===index&&b.sceneRole==='reef-fish-expansion');
 assert.equal(batches.length,2,id+' has both compiled LODs');assert.equal(species[index].renderKind,1,id+' uses fish rig, not fauna kind 8');
 for(const [lod,b] of batches.entries()){
  assert.equal(b.kind,1);assert.equal(b.material,6);const vertices=new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats),seen=new Map();let best=null,sample=null;
  for(let k=0;k<vertices.length;k+=12){if(Math.abs(vertices[k+11]-1)>.0001)continue;const p=Array.from(vertices.slice(k,k+3)),color=Array.from(vertices.slice(k+6,k+9)),key=p.map(v=>Math.round(v*1e6)).join(','),previous=seen.get(key);
   const proximity=Math.hypot(p[0]-.08,p[1]-.02,p[2]-.08);if(!sample||proximity<sample.proximity)sample={p,color,vertex:k/12,proximity};
   if(previous){const delta=distance(previous.color,color);if(!best||delta>best.delta)best={p,colorA:previous.color,colorB:color,delta,vertexA:previous.vertex,vertexB:k/12};}else seen.set(key,{color,vertex:k/12});
  }
  assert(sample,id+' has an actual compiled body sample');const colorA=sample.color,colorB=colorA.map(v=>v>.5?.025:.975);assert(distance(colorA,colorB)>.45,'Intervention must change incoming colour substantially');const witness={id,index,lod:lod?'low':'high',p:sample.p,vertex:sample.vertex,colorA,colorB,delta:distance(colorA,colorB),intervention:'incoming-colour-only',largestBakedJump:best?.delta||0};witnesses.push(witness);
  for(const [suffix,color]of [['a',colorA],['b',colorB]])fixtures.push({name:id+'-'+witness.lod+'-'+suffix,id,index,kind:1,tag:1,p:sample.p,color});
 }
}
for(const [id,width]of [['clown',.14],['tang',.10]]){
 const index=species.findIndex(s=>s.id===id),p=[.22,-.018,width*.92],b=header.batches.find(b=>b.species===index&&b.kind===1&&b.material===6),v=new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats);let closest=null;
 for(let k=0;k<v.length;k+=12)if(Math.abs(v[k+11]-3)<.0001){const q=Array.from(v.slice(k,k+3)),d=distance(p,q);if(!closest||d<closest.d)closest={p:q,d,color:Array.from(v.slice(k+6,k+9))};}
 assert(closest&&closest.d<1e-6,id+' actual compiled pectoral attachment');
 fixtures.push({name:id+'-body-root',id,index,kind:1,tag:1,p:closest.p,color:closest.color},{name:id+'-fin-root',id,index,kind:1,tag:3,p:closest.p,color:closest.color});
}
for(const [id,kind]of [['ray',4],['dolphin',7],['oarfish',10]])for(const tag of [1,3,4])fixtures.push({name:'preserve-'+id+'-'+tag,id,index:species.findIndex(s=>s.id===id),kind,tag,p:[.12,-.025,.04],color:[.23,.41,.32]});
check('compiled witnesses cover exact production species mapping and both LODs',()=>({mapping:ids.map(id=>({id,index:species.findIndex(s=>s.id===id)})),witnesses:witnesses.length,largestBakedJump:Math.max(...witnesses.map(w=>w.largestBakedJump))}));
async function main(){let browser;
 try{
  if(cpu){report.status='witness-ready';return;}
  const anchor='vec3 albedo=pow(clamp(base,vec3(0.),vec3(1.)),vec3(2.2));';assert.equal(fragment.split(anchor).length,2,'one production pre-lighting material boundary');
  const fsProbe=fragment.replace(anchor,'frag=vec4(clamp(base,vec3(0.),vec3(1.)),1.);return;'+anchor);
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const page=await browser.newPage();await page.setContent('<canvas width="16" height="16"></canvas>');
  const result=await page.evaluate(({fragment,fixtures})=>{
   const gl=document.querySelector('canvas').getContext('webgl2',{antialias:false}),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const vertex=`#version 300 es
precision highp float;uniform vec3 uProbePosition;uniform vec3 uProbeColor;uniform float uProbeTag;
out vec3 vWorld;out vec3 vRelative;out vec3 vNormal;out vec3 vColor;out vec3 vLocal;out vec2 vUV;out float vTag;out float vSeed;out vec4 vShadow;out float vLodDistance;flat out vec4 vGenes;flat out vec3 vTint;out vec4 vDynamicShadow;
void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(q*2.-1.,0.,1.);vLocal=uProbePosition+(q-.5).xyx*vec3(.002,.002,0.);vWorld=vLocal+vec3(0.,-5.,0.);vRelative=vWorld;vNormal=vec3(0.,0.,1.);vColor=uProbeColor;vUV=vLocal.xz;vTag=uProbeTag;vSeed=.37;vShadow=vec4(0.);vDynamicShadow=vec4(0.);vLodDistance=1.;vGenes=vec4(.5);vTint=vec3(1.);}`;
   const compile=(type,s)=>{const shader=gl.createShader(type);gl.shaderSource(shader,s);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
   const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
   const at=name=>gl.getUniformLocation(p,name);gl.uniform1i(at('uMat'),6);gl.uniform3f(at('uCamera'),0,-5,2);gl.uniform4f(at('uSurfaceProfile'),-1,0,1,-1);gl.viewport(0,0,16,16);gl.bindVertexArray(gl.createVertexArray());
   // Some drivers retain dynamically unreachable sampler uniforms after the
   // diagnostic return. Different sampler types must never alias one unit.
   for(const unit of [0,1]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(unit){gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT16,1,1,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,new Uint16Array([65535]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);}
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
   }
   const samplers=[];for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);if(u.type===gl.SAMPLER_2D||u.type===gl.SAMPLER_2D_SHADOW){const unit=u.type===gl.SAMPLER_2D_SHADOW?1:0;gl.uniform1i(at(u.name),unit);samplers.push({name:u.name,type:u.type,unit});}}
   gl.validateProgram(p);if(!gl.getProgramParameter(p,gl.VALIDATE_STATUS))throw Error('Invalid production probe: '+gl.getProgramInfoLog(p));const setupError=gl.getError();if(setupError)throw Error('Probe setup GL error '+setupError);
   const pixels=[];for(const f of fixtures){gl.uniform1i(at('uKind'),f.kind);gl.uniform1i(at('uSpecies'),f.index);gl.uniform3fv(at('uProbePosition'),f.p);gl.uniform3fv(at('uProbeColor'),f.color);gl.uniform1f(at('uProbeTag'),f.tag);gl.drawArrays(gl.TRIANGLES,0,3);const drawError=gl.getError();if(drawError)throw Error(f.name+' draw GL error '+drawError);const color=new Uint8Array(4);gl.readPixels(8,8,1,1,gl.RGBA,gl.UNSIGNED_BYTE,color);const readError=gl.getError();if(readError)throw Error(f.name+' read GL error '+readError);if(color[3]!==255)throw Error(f.name+' did not cover the probe pixel');pixels.push({name:f.name,rgba:Array.from(color)});}
   if(!pixels.some(row=>row.rgba.slice(0,3).some(value=>value>20)))throw Error('All production pigment samples are black');
   return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,error:gl.getError(),validated:true,samplers,pixels};
  },{fragment:fsProbe,fixtures});Object.assign(report,result);
  check('production fragment probe runs on native GPU without errors',()=>{assert(result.renderer&&!/swiftshader|software|llvmpipe/i.test(result.renderer));assert.equal(result.error,0);});
  const pixels=new Map(result.pixels.map(x=>[x.name,x.rgba]));
  for(const w of witnesses)check(w.id+' '+w.lod+': same actual surface pigment is independent of incoming vertex colour',()=>{const a=pixels.get(w.id+'-'+w.lod+'-a'),b=pixels.get(w.id+'-'+w.lod+'-b'),delta=distance(a,b);assert(delta<=1,'Incoming colour changes the same surface by '+delta+'/255');return {a,b,delta};});
  for(const id of ['clown','tang'])check(id+': pectoral root has no separate paint seam',()=>{const body=pixels.get(id+'-body-root'),fin=pixels.get(id+'-fin-root'),delta=distance(body,fin);assert(delta<=26,'Attached root colour jump '+delta+'/255');return {body,fin,delta};});
  if(baseline){const old=JSON.parse(fs.readFileSync(path.resolve(root,baseline))),prior=new Map(old.pixels.map(x=>[x.name,x.rgba]));check('ray, dolphin and oarfish material-6 body/fin/eye behavior is unchanged',()=>{for(const row of result.pixels.filter(x=>x.name.startsWith('preserve-')))assert.deepEqual(row.rgba,prior.get(row.name),row.name);return {samples:9};});}
  report.status=report.checks.every(c=>c.passed)?'passed':'failed';
 }catch(error){report.status='failed';report.error=error.stack;}
 finally{await browser?.close();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');for(const c of report.checks)console.log((c.passed?'PASS ':'FAIL ')+c.name+(c.error?' '+c.error:''));console.log(JSON.stringify({status:report.status,out,passed:report.checks.filter(c=>c.passed).length,total:report.checks.length}));if(report.status==='failed')process.exitCode=1;}
}
main();
