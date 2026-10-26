/* Production Renderer IO contract for water sprites. This uses the real render,
 * common, updateBatch, drawBatch and renderBubbles methods with only GL mocked.
 * It proves routing/state/budgets, not compiled shader pixels or GPU timing. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8');
const context=vm.createContext({console,performance});
vm.runInContext(source+`\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5],SPECIES=[];
var active=false;var player={velocity:[0,0,0]};`,context,{filename:'engine.js'});
const Renderer=vm.runInContext('Renderer',context);
const clone=value=>structuredClone(value);

function fixture({quality=2,msaa=4,width=800,height=600,eye=[0,-8,7],target=[0,-8,-10],submersible=false}={}){
 let currentProgram=null,drawFBO=null,readFBO=null,vao=null,textureUnit=0,buffer=null,viewport=[],depthWrite=true,blendFunction=[];
 const enabled=new Set(),uniforms=new Map(),textures=new Map(),events=[],allocations=[],uploads=[];
 const constants={FRAMEBUFFER:0x8d40,READ_FRAMEBUFFER:0x8ca8,DRAW_FRAMEBUFFER:0x8ca9,ARRAY_BUFFER:0x8892,
  TEXTURE0:0x84c0,TEXTURE_2D:0x0de1,TRIANGLES:4,POINTS:0,DEPTH_TEST:0x0b71,BLEND:0x0be2,
  SAMPLE_ALPHA_TO_COVERAGE:0x809e,POLYGON_OFFSET_FILL:0x8037,DEPTH_BUFFER_BIT:0x0100,COLOR_BUFFER_BIT:0x4000,
  SRC_ALPHA:0x0302,ONE_MINUS_SRC_ALPHA:0x0303,NEAREST:0x2600,LEQUAL:0x0203,LESS:0x0201,
  DYNAMIC_DRAW:0x88e8,FLOAT:0x1406,UNSIGNED_SHORT:0x1403};
 const set=(location,...values)=>{
  assert(location&&location.program===currentProgram,'uniform upload must target the active program');
  let state=uniforms.get(currentProgram);if(!state)uniforms.set(currentProgram,state={});
  state[location.name]=values.flatMap(value=>value&&typeof value==='object'?Array.from(value):[value]);
 };
 const record=(mode,count,instances=1)=>events.push({type:'draw',program:currentProgram.key,framebuffer:drawFBO,
  mode,count,instances,vao,viewport:viewport.slice(),depthWrite,depthTest:enabled.has(constants.DEPTH_TEST),
  blend:enabled.has(constants.BLEND),blendFunction:blendFunction.slice(),alphaCoverage:enabled.has(constants.SAMPLE_ALPHA_TO_COVERAGE),
  uniforms:clone(uniforms.get(currentProgram)||{}),textures:Object.fromEntries(textures)});
 const allocation=kind=>{const value=kind+'-'+allocations.length;allocations.push({kind,value});return value;};
 const gl=new Proxy({...constants,
  useProgram(program){currentProgram=program;},getUniformLocation(program,name){return {program,name};},
  uniform1i:set,uniform1f:set,uniform2f:set,uniform3f:set,uniform3fv:set,uniform4f:set,
  uniformMatrix4fv(location,transpose,value){assert.equal(transpose,false);set(location,value);},
  bindFramebuffer(binding,value){if(binding===constants.FRAMEBUFFER){drawFBO=value;readFBO=value;}else if(binding===constants.DRAW_FRAMEBUFFER)drawFBO=value;else if(binding===constants.READ_FRAMEBUFFER)readFBO=value;else assert.fail('unknown framebuffer binding');},
  bindVertexArray(value){vao=value;},bindBuffer(_,value){buffer=value;},
  bufferSubData(_,offset,data,start=0,count=data.length-start){uploads.push({buffer,offset,data:Array.from(data.subarray(start,start+count))});},
  activeTexture(unit){textureUnit=unit-constants.TEXTURE0;},bindTexture(_,texture){textures.set(textureUnit,texture);},
  viewport(...value){viewport=value;},enable(capability){enabled.add(capability);},disable(capability){enabled.delete(capability);},
  depthMask(value){depthWrite=value;},blendFunc(...value){blendFunction=value;},
  drawArrays(mode,start,count){assert.equal(start,0);record(mode,count);},
  drawElementsInstanced(mode,count,indexType,offset,instances){assert.equal(indexType,constants.UNSIGNED_SHORT);assert.equal(offset,0);record(mode,count,instances);},
  blitFramebuffer(...args){events.push({type:'resolve',read:readFBO,draw:drawFBO,args});},
  createVertexArray(){return allocation('vao');},createBuffer(){return allocation('buffer');},
  createFramebuffer(){return allocation('framebuffer');},createTexture(){return allocation('texture');},
  createRenderbuffer(){return allocation('renderbuffer');},createProgram(){return allocation('program');},
  createShader(){return allocation('shader');}
 },{get:(object,key)=>key in object?object[key]:(()=>{})});
 const programs={};
 for(const [property,key]of [['program','opaque'],['shadowProgram','shadow'],['skyProgram','sky'],['waterProgram','water'],
  ['pointProgram','points'],['bubbleProgram','bubbles'],['volumeProgram','volume'],['volumeFilterProgram','filter'],['postProgram','post'],['aaProgram','aa']])programs[property]={p:{key},u:{}};
 const batch={vao:'opaque-vao',ib:'opaque-instances',visible:true,dynamic:false,shadow:true,kind:0,material:2,species:-1,
  instances:[{p:[eye[0],eye[1],eye[2]-4],s:[1,1,1]}],data:new Float32Array(24),radius:1,count:3,vertexCount:3,indexType:constants.UNSIGNED_SHORT,minDistance:0,maxDistance:40};
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,batches:[batch],mobile:false,quality,
  width,height,canvas:{width,height},fog:[.0008,.005,.028],fogDensity:.034,clarity:.88,lamp:true,exposure:1.11,
  shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:Array.from({length:9},(_,i)=>'material-'+i),
  shadowSampler:'shadow-sampler',shadowFBO:'static-shadow',dynamicShadowFBO:'dynamic-shadow',sceneFBO:'scene',
  msaaFBO:msaa?'multisample':null,msaaSamples:msaa,volumeFBO:'volume',volumeFilteredFBO:'filter',aaFBO:'composite',
  volumeW:Math.ceil(width*.5),volumeH:Math.ceil(height*.5),waterCount:6,waterVAO:'water-vao',particleVAO:'particle-vao',postVAO:'post-vao',
  shadowTexture:'static-shadow-depth',dynamicShadowTexture:'dynamic-shadow-depth',sceneColor:'scene-colour',sceneDepth:'resolved-scene-depth',
  volumeColor:'volume-colour',volumeFilteredColor:'filtered-volume-colour',aaColor:'composite-colour',forceShadow:true,frame:0,submersible,...programs});
 renderer.setupBubbles();
 renderer.bubbles=[.012,.020,.030].map((r,i)=>({p:[eye[0]+.3+i*.05,eye[1]-.1,eye[2]-1],r,a:0,phase:i}));
 const initialAllocations=allocations.length;
 return {renderer,gl,events,uploads,allocations,initialAllocations,
  capture(nextEye=eye,nextTarget=target,time=8){events.length=0;uploads.length=0;renderer.render(nextEye,nextTarget,time);return events;}};
}
const draws=f=>f.events.filter(event=>event.type==='draw');
const one=(f,program)=>{const found=draws(f).filter(event=>event.program===program);assert.equal(found.length,1,'exactly one '+program+' draw');return found[0];};
const sequence=f=>f.events.filter(event=>event.type==='resolve'||event.program!=='shadow').map(event=>event.type==='resolve'?'resolve':event.program);
const results=[];
function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message);}}
console.log('ENGINE_SHA256 '+crypto.createHash('sha256').update(source).digest('hex'));

check('MSAA colour/depth resolves before volume, POST, both sprites and final AA',()=>{
 const f=fixture();f.capture();
 assert.deepEqual(sequence(f),['sky','opaque','water','resolve','volume','filter','post','points','bubbles','aa']);
 const resolve=f.events.find(event=>event.type==='resolve');assert.equal(resolve.read,'multisample');assert.equal(resolve.draw,'scene');
 assert.deepEqual(resolve.args,[0,0,800,600,0,0,800,600,f.gl.COLOR_BUFFER_BIT|f.gl.DEPTH_BUFFER_BIT,f.gl.NEAREST]);
 assert.equal(one(f,'opaque').framebuffer,'multisample');assert.equal(one(f,'water').framebuffer,'multisample');
 assert.equal(one(f,'volume').framebuffer,'volume');assert.equal(one(f,'filter').framebuffer,'filter');
 assert.equal(one(f,'post').framebuffer,'composite');assert.equal(one(f,'aa').framebuffer,null);
});
check('single-sample mode keeps the same post-sprite order without an extra resolve',()=>{
 const f=fixture({quality:0,msaa:0});f.capture();
 assert.deepEqual(sequence(f),['sky','opaque','water','volume','filter','post','points','bubbles','aa']);
 assert.equal(one(f,'opaque').framebuffer,'scene');assert.equal(f.events.filter(event=>event.type==='resolve').length,0);
});
check('sprites use resolved scene depth and alpha blending in the existing composite target',()=>{
 const f=fixture();f.capture();
 for(const name of ['points','bubbles']){const d=one(f,name);
  assert.equal(d.framebuffer,'composite',name+' must not be fogged using the background depth');
  assert.deepEqual(d.uniforms.uDepth,[1]);assert.equal(d.textures[d.uniforms.uDepth[0]],'resolved-scene-depth');
  assert.equal(d.depthTest,false,'sprite occlusion uses the resolved depth sampler');assert.equal(d.depthWrite,false);
  assert.equal(d.blend,true);assert.deepEqual(d.blendFunction,[f.gl.SRC_ALPHA,f.gl.ONE_MINUS_SRC_ALPHA]);
  assert.equal(d.alphaCoverage,false);assert.deepEqual(d.viewport,[0,0,800,600]);
 }
 const final=one(f,'aa');assert.equal(final.blend,false);assert.equal(final.depthTest,false);
 assert.equal(final.textures[final.uniforms.uImage[0]],'composite-colour');
});
check('sprite exposure, depth sampling dimensions and relative camera match the current completed view',()=>{
 const f=fixture({eye:[770,-6998,-121],target:[771,-6998,-138],width:585,height:1266,quality:1,msaa:2});
 f.renderer.exposure=.73;f.renderer.clarity=1.2;f.renderer.lighting='late';f.renderer.photoAperture=1.8;f.renderer.photoFocus=8;f.capture([770,-6998,-121],[771,-6998,-138],29);
 const post=one(f,'post');
 for(const name of ['points','bubbles']){const u=one(f,name).uniforms;
  assert.deepEqual(u.uCamera,[770,-6998,-121]);assert.deepEqual(u.uRenderOrigin,[768,-6976,-128]);
  assert.deepEqual(u.uVP,Array.from(f.renderer.renderVP));assert.deepEqual(u.uViewForward,Array.from(f.renderer.cameraForward));
  assert.deepEqual(u.uExposure,[.73]);assert.deepEqual(u.uExposure,post.uniforms.uExposure);
  assert.deepEqual(u.uResolution,[585,1266]);assert.deepEqual(u.uResolution,post.uniforms.uResolution);
  assert.deepEqual(u.uClarity,[1.2]);assert.deepEqual(u.uClarity,post.uniforms.uClarity);
  assert.deepEqual(u.uPhotoAperture,[1.8]);assert.deepEqual(u.uPhotoAperture,post.uniforms.uPhotoAperture);assert.deepEqual(u.uPhotoFocus,post.uniforms.uPhotoFocus);
  assert.deepEqual(u.uTime,[29]);assert.deepEqual(u.uQuality,[1]);assert.deepEqual(u.uTorch,[1]);
  assert.deepEqual(u.uLightDir,post.uniforms.uLightDir);assert.deepEqual(u.uLightColor,post.uniforms.uLightColor);assert.deepEqual(u.uSun,post.uniforms.uSun);
 }
 assert.deepEqual(post.uniforms.uEye,[2,-22,7]);
});
check('next frame refreshes sprite camera, light, exposure, quality and resized depth coordinates',()=>{
 const f=fixture();f.capture();const r=f.renderer;
 r.canvas.width=844;r.canvas.height=390;r.width=844;r.height=390;r.quality=0;r.exposure=1.8;r.clarity=.65;r.lamp=false;r.lighting='blue';
 f.capture([.4,-8,6.5],[1,-8,-12],8.02);
 for(const name of ['points','bubbles']){const u=one(f,name).uniforms;
  assert.deepEqual(u.uCamera,[.4,-8,6.5]);assert.deepEqual(u.uResolution,[844,390]);assert.deepEqual(u.uExposure,[1.8]);
  assert.deepEqual(u.uClarity,[.65]);assert.deepEqual(u.uTorch,[0]);assert.deepEqual(u.uQuality,[0]);assert.deepEqual(u.uTime,[8.02]);
  assert.deepEqual(u.uVP,Array.from(r.renderVP));assert.deepEqual(u.uSun,one(f,'post').uniforms.uSun);
 }
 assert.deepEqual(one(f,'points').uniforms.uScale,[390*.044]);assert.deepEqual(one(f,'bubbles').uniforms.uHeight,[390]);
});
check('quality tiers retain existing point counts, bubble payload and four post draws without new GPU resources',()=>{
 for(const quality of [0,1,2]){const f=fixture({quality,msaa:quality*2});f.capture();
  assert.equal(one(f,'points').count,quality===0?240:520);assert.equal(one(f,'points').mode,f.gl.POINTS);
  assert.equal(one(f,'bubbles').count,3);assert.equal(one(f,'bubbles').mode,f.gl.POINTS);
  for(const name of ['volume','filter','post','aa']){assert.equal(one(f,name).count,3);assert.equal(one(f,name).mode,f.gl.TRIANGLES);}
  assert.equal(draws(f).filter(d=>d.program!=='shadow').length,9,'no new colour/overlay draw');
  assert.equal(f.allocations.length,f.initialAllocations,'render may not create resources for sprite compositing');
  assert.equal(f.renderer.quality,quality);assert.deepEqual([f.renderer.canvas.width,f.renderer.canvas.height],[800,600]);
  const packed=f.uploads.filter(upload=>upload.buffer===f.renderer.bubbleBuffer);assert.equal(packed.length,1);assert.equal(packed[0].data.length,12);
  assert(packed[0].data.every(Number.isFinite));assert.equal(f.renderer.bubbleData.length,512*4);assert.equal(f.renderer.frame,1);
 }
});
check('above-water frames omit both sprites; submersibles omit bubbles while retaining marine particles',()=>{
 const above=fixture({eye:[0,1,7],target:[0,1,-10]});above.capture();assert(!draws(above).some(d=>d.program==='points'||d.program==='bubbles'));
 const sub=fixture({submersible:true});sub.capture();assert.equal(one(sub,'points').count,520);assert(!draws(sub).some(d=>d.program==='bubbles'));assert.equal(sub.renderer.bubbles.length,0);
});
check('streaming wait performs no partial resolve, sprite update or presentation draw',()=>{
 const f=fixture(),before=clone(f.renderer.bubbles);f.renderer.sceneStream={update:()=>false};f.capture();
 assert.deepEqual(f.events,[]);assert.deepEqual(f.renderer.bubbles,before);assert.equal(f.renderer.frame,0);assert.equal(f.renderer.dirty,true);
});
console.log(`${results.filter(Boolean).length}/${results.length} water sprite routing checks passed`);
if(results.includes(false))process.exitCode=1;
