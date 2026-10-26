/* Production Renderer -> WebGL IO contract. No renderer method is replaced;
 * the GL adapter records complete frames and checks every submitted matrix.
 * This proves work/state routing, not native pixels or GPU/phone performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5],SPECIES=[];var active=false;',context);
const Renderer=vm.runInContext('Renderer',context);
const shallow=[0,-8,7],deep=[776,-7000,-125];
function fixture(){
 let framebuffer=null,program=null,vao=null,colorMask=[true,true,true,true];
 const events=[],uniforms=new Map();
 const constants={FRAMEBUFFER:0x8d40,ARRAY_BUFFER:0x8892,TEXTURE0:0x84c0,TEXTURE_2D:0x0de1,TRIANGLES:4,POINTS:0,
  DEPTH_TEST:0x0b71,BLEND:0x0be2,SAMPLE_ALPHA_TO_COVERAGE:0x809e,POLYGON_OFFSET_FILL:0x8037,
  DEPTH_BUFFER_BIT:0x0100,COLOR_BUFFER_BIT:0x4000,UNSIGNED_SHORT:0x1403};
 const set=(location,...values)=>{assert.equal(location.program,program);uniforms.get(program)[location.name]=values.flatMap(v=>v&&typeof v==='object'?Array.from(v):[v]);};
 const draw=(mode,count,instances=1)=>events.push({type:'draw',framebuffer,program:program.key,vao,mode,count,instances,colorMask:colorMask.slice(),uniforms:structuredClone(uniforms.get(program))});
 const gl=new Proxy({...constants,
  useProgram(value){program=value;if(!uniforms.has(value))uniforms.set(value,{});},getUniformLocation:(program,name)=>({program,name}),
  uniform1i:set,uniform1f:set,uniform2f:set,uniform3f:set,uniform3fv:set,uniform4f:set,
  uniformMatrix4fv(location,transpose,value){assert.equal(transpose,false);assert(ArrayBuffer.isView(value),'matrix must be a typed GPU upload');assert.equal(value.length,16);assert(Array.from(value).every(Number.isFinite),'all submitted matrices must be finite');set(location,value);},
  bindFramebuffer(target,value){assert.equal(target,constants.FRAMEBUFFER);framebuffer=value;events.push({type:'bind',framebuffer});},
  clear(mask){events.push({type:'clear',framebuffer,mask});},colorMask(...value){colorMask=value;},bindVertexArray(value){vao=value;},
  drawArrays(mode,start,count){assert.equal(start,0);draw(mode,count);},drawElementsInstanced(mode,count,type,offset,instances){assert.equal(type,constants.UNSIGNED_SHORT);assert.equal(offset,0);draw(mode,count,instances);}
 },{get:(object,key)=>key in object?object[key]:(()=>{})});
 const programs=Object.fromEntries(['program','shadowProgram','skyProgram','waterProgram','pointProgram','bubbleProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'].map(key=>[key,{p:{key},u:{}}]));
 const batch=(id,p,dynamic)=>({vao:id,ib:id+'-instances',visible:true,dynamic,shadow:true,kind:0,material:2,species:-1,
  instances:[{p:p.slice(),s:[1,1,1]}],data:new Float32Array(24),radius:1,count:3,vertexCount:3,indexType:constants.UNSIGNED_SHORT,maxDistance:40});
 const batches=[batch('shallow-rock',[0,-8,0],false),batch('shallow-animal',[1,-8,0],true),batch('deep-rock',[776,-7000,-132],false),batch('deep-animal',[777,-7000,-132],true)];
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,...programs,batches,mobile:false,quality:2,dynamicScale:1,
  width:800,height:600,canvas:{width:800,height:600},fog:[.0008,.005,.028],fogDensity:.034,clarity:.88,lamp:true,exposure:1.11,
  shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:Array.from({length:9},(_,i)=>'material-'+i),
  shadowFBO:'static-shadow',dynamicShadowFBO:'dynamic-shadow',sceneFBO:'scene',volumeFBO:'volume',volumeFilteredFBO:'filter',aaFBO:'aa',
  volumeW:400,volumeH:300,waterCount:6,waterVAO:'water',particleVAO:'particles',postVAO:'post',
  shadowTexture:'static-depth',dynamicShadowTexture:'dynamic-depth',sceneColor:'colour',sceneDepth:'depth',
  volumeColor:'volume-colour',volumeFilteredColor:'filtered-volume',aaColor:'aa-colour',forceShadow:true,frame:0,submersible:true,bubbles:[],
  // Constructor's existing initial world-space matrix; relative matrices do
  // not exist before the first call to render(), including a deep saved game.
  lightVP:vm.runInContext('mm(ortho(-51,51,-51,51,.1,180),lookAt([-42,84,14],[0,-12,-12]))',context)});
 return {renderer,events,batches,capture(eye=deep,time=8,target=[eye[0],eye[1],eye[2]-15]){events.length=0;renderer.render(eye,target,time);return events;}};
}
const shadowWork=f=>f.events.filter(event=>event.framebuffer==='static-shadow'||event.framebuffer==='dynamic-shadow');
const draws=f=>f.events.filter(event=>event.type==='draw');
const one=(f,key)=>{const found=draws(f).filter(event=>event.program===key);assert.equal(found.length,1,'one '+key+' draw');return found[0];};
const results=[];
function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.stack);}}

check('a first frame loaded at 7000 m submits the complete image without any solar shadow work',()=>{
 const f=fixture();f.capture();assert.deepEqual(shadowWork(f),[],'sunless receivers never read these shadow maps');
 assert.deepEqual(draws(f).map(d=>d.program),['skyProgram','program','program','waterProgram','volumeProgram','volumeFilterProgram','postProgram','pointProgram','aaProgram']);
 assert.equal(one(f,'volumeProgram').uniforms.uSunless[0],1);assert.equal(one(f,'postProgram').uniforms.uLamp[0],1);
 assert.equal(one(f,'aaProgram').framebuffer,null);assert(draws(f).every(d=>d.colorMask.every(Boolean)));
 assert.deepEqual([f.renderer.canvas.width,f.renderer.canvas.height,f.renderer.quality,f.renderer.dynamicScale],[800,600,2,1]);
});

check('a view leaving the sunless eligibility rule rebuilds both maps before its first colour draw',()=>{
 const f=fixture();f.capture();
 // An out-of-contract wide photo FOV conservatively enables the existing
 // solar path even at this same position/cell. A skipped map cannot be valid.
 f.renderer.photoFov=91;f.capture();
 assert.equal(one(f,'volumeProgram').uniforms.uSunless[0],0);
 const image=draws(f),firstColour=image.findIndex(d=>d.framebuffer==='scene');
 for(const target of ['static-shadow','dynamic-shadow']){
  const index=image.findIndex(d=>d.framebuffer===target);assert(index>=0&&index<firstColour,target+' must be ready on the first eligible frame');
 }
 f.capture();assert(!shadowWork(f).some(e=>e.framebuffer==='static-shadow'),'unchanged eligible view reuses its now-valid static map');
});

check('sunless motion across shadow cells and relative origins retains pending refresh without touching either map',()=>{
 const f=fixture();f.capture(shallow);f.renderer.forceShadow=true;
 for(const [eye,lighting]of [[[31.999,-7000,-120],'day'],[[32.001,-7000,-120],'late'],[[766,-7007.999,-120],'blue'],[[766,-7008.001,-120],'day'],[[766,-7000,-95.999],'late'],[[766,-7000,-96.001],'blue']]){
  f.renderer.lighting=lighting;f.capture(eye);
  assert.equal(shadowWork(f).length,0);assert.equal(f.renderer.forceShadow,true,'deferred geometry refresh remains pending');
  const volume=one(f,'volumeProgram'),water=one(f,'waterProgram');
  assert.equal(volume.uniforms.uSunless[0],1);assert.deepEqual(volume.uniforms.uLightVP,water.uniforms.uLightVP);
  assert.deepEqual(volume.uniforms.uRenderOrigin,water.uniforms.uRenderOrigin);assert.equal(one(f,'aaProgram').framebuffer,null);
 }
});

check('return to the original shallow cell rebuilds current geometry and preserves the complete colour submissions',()=>{
 const f=fixture();f.capture(shallow);f.capture(deep);
 f.renderer.forceShadow=true;f.batches[0].visible=false;f.renderer.lighting='late';f.capture(deep,9);
 f.renderer.lighting='day';f.capture(shallow,10);
 const image=draws(f),firstColour=image.findIndex(d=>d.framebuffer==='scene');
 for(const target of ['static-shadow','dynamic-shadow']){
  const bind=f.events.findIndex(e=>e.type==='bind'&&e.framebuffer===target),clear=f.events.findIndex(e=>e.type==='clear'&&e.framebuffer===target);
  assert(bind>=0&&clear>bind);assert(clear<f.events.indexOf(image[firstColour]),'shadow target must be complete before colour');
 }
 assert(!image.some(d=>d.framebuffer==='static-shadow'&&d.vao==='shallow-rock'),'removed geometry is not retained in the rebuilt map');
 assert(image.some(d=>d.framebuffer==='dynamic-shadow'&&d.vao==='shallow-animal'));assert.equal(f.renderer.forceShadow,false);
 const fresh=fixture();fresh.batches[0].visible=false;fresh.capture(shallow,10);
 assert.deepEqual(image.filter(d=>d.program!=='shadowProgram'),draws(fresh).filter(d=>d.program!=='shadowProgram'),'returning frame equals a fresh render of this same scene');
 f.capture(shallow,11);assert(!shadowWork(f).some(e=>e.framebuffer==='static-shadow'));assert(shadowWork(f).some(e=>e.framebuffer==='dynamic-shadow'));
});

check('deep photography and lamp changes preserve optics, geometry and quality without waking solar maps',()=>{
 for(const quality of [0,1,2]){
  const f=fixture(),r=f.renderer;r.quality=quality;r.photoFov=46;r.photoAperture=1.8;r.photoFocus=3;r.exposure=.73;r.clarity=1.2;
  for(const lamp of [false,true]){r.lamp=lamp;f.capture(deep,9);
   assert.equal(shadowWork(f).length,0);const volume=one(f,'volumeProgram'),post=one(f,'postProgram'),points=one(f,'pointProgram');
   assert.deepEqual(volume.uniforms.uLamp,[lamp?1:0]);assert.deepEqual(points.uniforms.uTorch,[lamp?1:0]);
   for(const d of [volume,post,points]){assert.deepEqual(d.uniforms.uPhotoAperture,[1.8]);assert.deepEqual(d.uniforms.uPhotoFocus,[3]);assert.deepEqual(d.uniforms.uExposure,[.73]);assert.deepEqual(d.uniforms.uClarity,[1.2]);}
   assert.equal(points.count,quality===0?240:520);assert.deepEqual(draws(f).filter(d=>d.program==='program').map(d=>d.vao),['deep-rock','deep-animal']);
   assert.deepEqual([r.canvas.width,r.canvas.height,r.quality,r.dynamicScale],[800,600,quality,1]);
  }
 }
});

check('the unchanged 4900 m boundary restores both shadow targets on its first shallower frame',()=>{
 const f=fixture();f.capture([776,-4900,-125]);assert.equal(shadowWork(f).length,0);assert.equal(one(f,'volumeProgram').uniforms.uSunless[0],1);
 f.capture([776,-4899.999,-125]);assert.equal(one(f,'volumeProgram').uniforms.uSunless[0],0);
 for(const target of ['static-shadow','dynamic-shadow'])assert(shadowWork(f).some(e=>e.type==='clear'&&e.framebuffer===target));
 f.capture([776,-4900,-125]);assert.equal(shadowWork(f).length,0);
});

check('streaming waits preserve pending deep refresh and submit no partial frame before returning shallow',()=>{
 const f=fixture();f.capture(deep);const frames=f.renderer.frame;
 f.renderer.sceneStream={update:()=>false};f.capture(shallow);assert.deepEqual(f.events,[]);assert.equal(f.renderer.frame,frames);assert.equal(f.renderer.forceShadow,true);
 f.renderer.sceneStream=null;f.capture(shallow);assert.equal(f.renderer.frame,frames+1);
 for(const target of ['static-shadow','dynamic-shadow'])assert(shadowWork(f).some(e=>e.type==='draw'&&e.framebuffer===target));
 assert.equal(one(f,'aaProgram').framebuffer,null);
});

console.log(`${results.filter(Boolean).length}/${results.length} sunless shadow routing checks passed`);
if(results.includes(false))process.exitCode=1;
