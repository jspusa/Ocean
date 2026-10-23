/* Production program selection and full render routing with GL IO mocked.
 * These checks prove source/CPU state equivalence, not shader compilation,
 * pixels or GPU speed; browser framebuffer comparisons cover those separately. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine.js'),'utf8')+`
 const BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];
 const SPECIES=[{materialProfile:{roughness:.4,subsurface:.2,patternScale:2,skin:'fish'},motionProfile:{type:'snailfish'}},{materialProfile:{roughness:.7,subsurface:.1,patternScale:7,skin:'shell'},motionProfile:{type:'vampire'}}];
 var player={velocity:[.2,.1,0]};`,context,{filename:'engine.js'});
const Renderer=vm.runInContext('Renderer',context),VS=vm.runInContext('VS',context),FS=vm.runInContext('FS',context),keys=['0:2','0:3','1:6'];
function shaderProgram(vertex,fragment,key){
 const source=vertex+'\n'+fragment,uniforms=new Set([...source.matchAll(/uniform\s+(?:highp\s+)?\w+\s+(\w+)/g)].map(m=>m[1]));
 return {p:{key,uniforms,kind:Number(source.match(/const int uKind\s*=\s*(\d+)\s*;/)?.[1]??NaN),material:Number(source.match(/const int uMat\s*=\s*(\d+)\s*;/)?.[1]??NaN)},u:{},vertex,fragment};
}
function fixture(specialized=true){
 let currentProgram=null,pass=null,arrayBuffer=null,textureUnit=0;
 const compiled=[],deleted=[],invalid=[],values=new Map(),uploads=new Map(),textures=new Map(),samplers=new Map(),records=[];
 const set=(location,...args)=>{
  if(!location||location.program!==currentProgram){invalid.push(location?.name||'missing location');throw Error('uniform written to an inactive program: '+location?.name);}
  let state=values.get(currentProgram);if(!state)values.set(currentProgram,state={});
  state[location.name]=args.flatMap(value=>value&&typeof value==='object'?Array.from(value):[value]);
 };
 const gl=new Proxy({ARRAY_BUFFER:1,TEXTURE0:100,TEXTURE_2D:2,
  bindFramebuffer(_,value){pass=value;},useProgram(program){currentProgram=program;},
  getUniformLocation(program,name){return program.uniforms.has(name)?{program,name}:null;},
  uniform1i:set,uniform1f:set,uniform2f:set,uniform3f:set,uniform3fv:set,uniform4f:set,
  uniformMatrix4fv(location,transpose,value){assert.equal(transpose,false);set(location,value);},
  bindBuffer(target,buffer){if(target===1)arrayBuffer=buffer;},
  bufferSubData(_,offset,data,start,count){assert.equal(offset,0);uploads.set(arrayBuffer,Array.from(data.slice(start,start+count)));},
  activeTexture(unit){textureUnit=unit-100;},bindTexture(_,texture){textures.set(textureUnit,texture);},bindSampler(unit,sampler){samplers.set(unit,sampler);},
  deleteProgram(program){deleted.push(program);}
 },{get:(object,key)=>key in object?object[key]:(()=>{})});
 const programs={program:shaderProgram(VS,FS,'fallback')};
 for(const [name,vertex,fragment]of [['shadowProgram','VS','SHADOW_FS'],['skyProgram','POST_VS','SKY_FS'],['waterProgram','WATER_VS','WATER_FS'],['pointProgram','POINT_VS','POINT_FS'],['volumeProgram','POST_VS','VOLUME_FS'],['volumeFilterProgram','POST_VS','VOLUME_FILTER_FS'],['postProgram','POST_VS','POST_FS'],['aaProgram','POST_VS','AA_FS']])programs[name]=shaderProgram(vm.runInContext(vertex,context),vm.runInContext(fragment,context),name);
 const batches=[[0,2],[0,3],[1,6],[0,1],[0,2],[3,3],[1,6],[0,3],[0,17]].map(([kind,material],id)=>({
  id,vao:'vao'+id,ib:'ib'+id,visible:true,dynamic:kind!==0,shadow:true,kind,material,species:id%3-1,
  instances:[{p:[id,-8,-5],s:[1,.8,1.2],yaw:id*.1,bioGenes:[.1,.2,.3,.4],bank:.02},{p:[id+1,-8,-6],s:[.8,1,.9],ecologyPresent:id%3!==0}],
  data:new Float32Array(72).fill(NaN),radius:1,count:3,vertexCount:3,minDistance:id%2?1:0,maxDistance:40+id
 }));
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,batches,mobile:false,quality:2,width:800,height:600,canvas:{width:800,height:600},fog:[.0008,.005,.028],fogDensity:.034,clarity:1,lamp:false,exposure:1.11,shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:Array.from({length:9},(_,i)=>'texture'+i),shadowSampler:'shadowSampler',shadowFBO:'static',dynamicShadowFBO:'dynamic',sceneFBO:'colour',volumeFBO:'volume',volumeFilteredFBO:'filter',aaFBO:'aa',volumeW:400,volumeH:300,waterCount:3,shadowTexture:'shadowTexture',dynamicShadowTexture:'dynamicShadowTexture',sceneColor:'sceneColor',sceneDepth:'sceneDepth',volumeColor:'volumeColor',volumeFilteredColor:'volumeFilteredColor',aaColor:'aaColor',forceShadow:true,frustum:()=>Array.from({length:6},()=>[0,0,0,1]),renderBubbles(){},...programs,
  makeProgram(vertex,fragment){const program=shaderProgram(vertex,fragment,'variant'+compiled.length);compiled.push(program);return program;},
  drawBatch(batch){
   const state=structuredClone(values.get(currentProgram));
   if(Number.isFinite(currentProgram.kind))state.uKind=[currentProgram.kind];
   if(Number.isFinite(currentProgram.material))state.uMat=[currentProgram.material];
   const prefix=uploads.get(batch.ib)?.slice(0,batch.drawCount*24);
   assert.deepEqual(prefix,Array.from(batch.data.slice(0,batch.drawCount*24)),'draw must use its current packed GPU prefix');
   records.push({pass,id:batch.id,uniforms:state,data:prefix,drawCount:batch.drawCount,textures:[...textures],samplers:[...samplers],program:currentProgram});
  }
 });
 if(specialized)renderer.setupSurfacePrograms();
 return {renderer,batches,compiled,deleted,invalid,records,values,capture(eye=[0,-8,7],target=[0,-8,-10],time=8){records.length=0;renderer.forceShadow=true;renderer.render(eye,target,time);return records.map(({program,...draw})=>structuredClone(draw));}};
}
const results=[];
function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message);}}
check('only three audited programs compile, once, with exactly two constant substitutions',()=>{
 const f=fixture();f.renderer.setupSurfacePrograms();assert.equal(f.compiled.length,3);
 for(const key of keys){const [kind,material]=key.split(':').map(Number),program=f.renderer.surfaceProgram({kind,material});assert.notEqual(program,f.renderer.program);assert(f.compiled.includes(program));
  for(const [actual,original]of [[program.vertex,VS],[program.fragment,FS]]){
   assert(actual.includes('const int uKind='+kind+';'));assert(actual.includes('const int uMat='+material+';'));
   assert.equal(actual.replace('const int uKind='+kind+';','uniform int uKind;').replace('const int uMat='+material+';','uniform int uMat;'),original,'all remaining shader source, including LOD discard, must be unchanged');
  }
 }
 for(let kind=-1;kind<15;kind++)for(let material=0;material<20;material++){const b={kind,material},program=f.renderer.surfaceProgram(b);if(!keys.includes(kind+':'+material))assert.equal(program,f.renderer.program);}
 f.renderer.surfacePrograms.set('3:3',f.compiled[0]);assert.equal(f.renderer.surfaceProgram({kind:3,material:3}),f.renderer.program,'unknown pairs cannot opt into cached variants');
 for(const b of [{kind:0,material:2.5},{kind:'0',material:2},{kind:NaN,material:2},{}])assert.equal(f.renderer.surfaceProgram(b),f.renderer.program);
 assert.equal(f.compiled.length,3,'selection may not compile unbounded variants');
 const source=vm.runInContext('surfaceShaderSource',context);assert.throws(()=>source(VS,3,3),/Unsupported surface/);assert.throws(()=>source(VS.replace('uniform int uMat;',''),0,2),/Missing surface shader uniform/);
});
check('interleaved variants preserve every pass, draw order, uniform, sampler and current instance prefix',()=>{
 const original=fixture(false),candidate=fixture();assert.deepEqual(candidate.capture(),original.capture());
 const draws=candidate.records.filter(d=>d.pass==='colour');assert.deepEqual(draws.map(d=>d.id),candidate.batches.map(b=>b.id));
 for(const draw of draws){const batch=candidate.batches[draw.id];assert.deepEqual(draw.uniforms.uKind,[batch.kind]);assert.deepEqual(draw.uniforms.uMat,[batch.material]);assert.deepEqual(draw.uniforms.uSpecies,[batch.species]);assert.equal(draw.data.length,draw.drawCount*24);assert(draw.data.every(Number.isFinite));assert.equal(draw.program,candidate.renderer.surfaceProgram(batch).p);}
 for(const draw of candidate.records.filter(d=>d.pass!=='colour'))assert.equal(draw.program,candidate.renderer.shadowProgram.p,'shadow programs remain unchanged');
 assert.equal(candidate.invalid.length,0);
});
check('program state refreshes after next-frame metadata, pose, quality, lighting and deep-origin changes',()=>{
 const original=fixture(false),candidate=fixture();original.capture();candidate.capture();
 for(const f of [original,candidate]){const r=f.renderer;r.mobile=true;r.quality=0;r.lighting='late';r.lamp=true;r.fogDensity=.055;r.fog=[.002,.009,.03];r.shadowSize=1024;r.dynamicShadowSize=512;
  f.batches[0].material=3;f.batches[1].kind=2;f.batches[1].material=6;f.batches[2].species=1;f.batches[3].visible=false;f.batches[4].instances[0].ecologyPresent=false;f.batches[5].minDistance=4;f.batches[6].maxDistance=80;
  for(const batch of f.batches)for(const actor of batch.instances){actor.p=[768+actor.p[0],-7000,-128+actor.p[2]];actor.bank=.11;actor.bioGenes=[.6,.5,.4,.3];}
 }
 vm.runInContext('SPECIES[1].materialProfile.roughness=.91;SPECIES[1].motionProfile.type="sea_pig";player.velocity=[.9,.2,.1];',context);
 const eye=[770,-6998,-121],target=[770,-6998,-138];assert.deepEqual(candidate.capture(eye,target,29),original.capture(eye,target,29));
 const draws=candidate.records.filter(d=>d.pass==='colour');assert(draws.length>=7,'deep-origin fixture must still render its interleaved batches');
 for(const d of draws){assert.deepEqual(d.uniforms.uTime,[29]);assert.deepEqual(d.uniforms.uQuality,[0]);assert.deepEqual(d.uniforms.uTorch,[1]);assert.deepEqual(d.uniforms.uFogDensity,[.055]);assert.deepEqual(d.uniforms.uRenderOrigin,[768,-6976,-128]);}
 const changed=draws.find(d=>d.id===2);assert.deepEqual(changed.uniforms.uRigClass,[2]);assert.deepEqual(changed.uniforms.uSurfaceProfile,[.91,.1,7,4]);
 assert.equal(candidate.compiled.length,3);assert.equal(candidate.invalid.length,0);
});
check('one failed variant falls back without recompiling or removing successful programs',()=>{
 const candidate=fixture(false),original=fixture(false),make=candidate.renderer.makeProgram;let attempts=0;
 candidate.renderer.makeProgram=function(vertex,fragment){attempts++;if(fragment.includes('const int uMat=3;'))throw Error('simulated device compiler rejection');return make.call(this,vertex,fragment);};
 candidate.renderer.setupSurfacePrograms();candidate.renderer.setupSurfacePrograms();assert.equal(attempts,3);assert.equal(candidate.compiled.length,2);assert.equal(candidate.deleted.length,0);
 assert.equal(candidate.renderer.surfaceProgram({kind:0,material:3}),candidate.renderer.program);assert.match(candidate.renderer.surfaceProgramFailures.get('0:3'),/simulated device compiler rejection/);assert.equal(candidate.renderer.surfaceProgramFailures.size,1);
 assert.deepEqual(candidate.capture(),original.capture());assert.equal(attempts,3,'rendering failed pairs must retain fallback without retrying');assert.equal(candidate.invalid.length,0);
 candidate.renderer.surfacePrograms=null;assert.deepEqual(candidate.capture(),original.capture());assert.equal(attempts,3,'diagnostic fallback must not compile during rendering');
});
check('production compilation releases every temporary shader and failed program exactly once',()=>{
 for(const failure of ['vertex','fragment','link',null]){
  const shaders=[],programs=[],deletedShaders=[],deletedPrograms=[];
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
   createShader(type){const shader={type};shaders.push(shader);return shader;},shaderSource(){},compileShader(){},
   getShaderParameter(shader){return !(failure==='vertex'&&shader.type===1||failure==='fragment'&&shader.type===2);},getShaderInfoLog:()=>String(failure)+' compile failed',deleteShader(shader){deletedShaders.push(shader);},
   createProgram(){const program={};programs.push(program);return program;},attachShader(){},linkProgram(){},getProgramParameter:()=>failure!=='link',getProgramInfoLog:()=>String(failure)+' failed',deleteProgram(program){deletedPrograms.push(program);}
  };
  const renderer=Object.assign(Object.create(Renderer.prototype),{gl});
  if(failure)assert.throws(()=>renderer.makeProgram(VS,FS),/failed/);else assert.equal(renderer.makeProgram(VS,FS).p,programs[0]);
  assert.equal(new Set(deletedShaders).size,deletedShaders.length,'no shader double deletion');assert.deepEqual(new Set(deletedShaders),new Set(shaders));
  assert.equal(shaders.length,failure==='vertex'?1:2);assert.equal(programs.length,failure==='vertex'||failure==='fragment'?0:1);assert.equal(deletedPrograms.length,failure==='link'?1:0);if(failure==='link')assert.equal(deletedPrograms[0],programs[0]);
 }
});
console.log(`${results.filter(Boolean).length}/${results.length} surface program checks passed`);
if(results.includes(false))process.exitCode=1;
