/* Actual Renderer.render IO with destructive invalidation semantics. No GPU:
 * this proves attachment lifetime/order, not pixels or tile-store savings.
 * The immutable v54 render trace must change by only the new discard command.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),sourcePath=process.argv.find(a=>a.startsWith('--source='))?.slice(9)||path.join(root,'src/engine.js');
const source=fs.readFileSync(sourcePath,'utf8'),baselineCommit='dbac61c9de3d61031f8358f75af5b138972ad4c7';
const baseline=cp.execFileSync('git',['show',baselineCommit+':src/engine.js'],{cwd:root,encoding:'utf8'});
const K=Object.freeze({FRAMEBUFFER:0x8d40,READ_FRAMEBUFFER:0x8ca8,DRAW_FRAMEBUFFER:0x8ca9,COLOR_ATTACHMENT0:0x8ce0,DEPTH_ATTACHMENT:0x8d00,COLOR_BUFFER_BIT:0x4000,DEPTH_BUFFER_BIT:0x100,DEPTH_TEST:0xb71,BLEND:0xbe2,SCISSOR_TEST:0xc11,POLYGON_OFFSET_FILL:0x8037,SAMPLE_ALPHA_TO_COVERAGE:0x809e,CULL_FACE:0xb44,TRIANGLES:4,POINTS:0,LEQUAL:0x203,LESS:0x201,NEAREST:0x2600,TEXTURE0:0x84c0,TEXTURE_2D:0xde1,SRC_ALPHA:0x302,ONE_MINUS_SRC_ALPHA:0x303,RENDERBUFFER:0x8d41});
const masks=K.COLOR_BUFFER_BIT|K.DEPTH_BUFFER_BIT;
function fixture(engine=source,{samples=4,sunless=false,photo=false,resizeFailure=false}={}){
 const context=vm.createContext({console,performance,Math,innerWidth:800,innerHeight:600,devicePixelRatio:1});
 vm.runInContext(engine,context,{filename:'engine.js'});const Renderer=vm.runInContext('Renderer',context),events=[],live=new Map(),textures=new Map(),uniforms=new Map(),caps=new Set();
 const targets=new Map([['msaa',{color:'msaa-color',depth:'msaa-depth'}],['scene',{color:'scene-color',depth:'scene-depth'}],['static-shadow',{depth:'static-depth'}],['dynamic-shadow',{depth:'dynamic-depth'}],['volume',{color:'volume-color'}],['filtered',{color:'filtered-color'}],['aa',{color:'aa-color'}],[null,{color:'presented-canvas'}]]);
 for(const attachments of targets.values())for(const image of Object.values(attachments))live.set(image,image.endsWith('-depth')&&image.includes('shadow'));
 let draw=null,read=null,current=null,unit=0,colorMask=[true,true,true,true],depthMask=true,scissor=[0,0,128,96],declined=false;
 const record=(op,args=[],extra={})=>{const event={op,args:structuredClone(args),...extra};events.push(event);return event;};
 // WebGL consumes an IDL sequence; copy values into this recorder's realm,
 // rather than retaining a VM Array prototype as part of the trace evidence.
 const attached=framebuffer=>targets.get(framebuffer)||{},images=(framebuffer,attachments)=>Array.from(attachments,a=>attached(framebuffer)[a===K.COLOR_ATTACHMENT0?'color':a===K.DEPTH_ATTACHMENT?'depth':'unknown']);
 const requireLive=image=>assert(live.get(image),'A draw/read cannot consume undefined attachment '+image);
 const gl={...K,
  enable(cap){caps.add(cap);record('enable',[cap]);},disable(cap){caps.delete(cap);record('disable',[cap]);},
  colorMask(...value){colorMask=value;record('colorMask',value);},depthMask(value){depthMask=value;record('depthMask',[value]);},
  scissor(...value){scissor=value;record('scissor',value);},
  bindFramebuffer(target,framebuffer){if(target===K.FRAMEBUFFER||target===K.DRAW_FRAMEBUFFER)draw=framebuffer;if(target===K.FRAMEBUFFER||target===K.READ_FRAMEBUFFER)read=framebuffer;record('bindFramebuffer',[target,framebuffer]);},
  clear(mask){record('clear',[mask],{draw,colorMask:colorMask.slice(),depthMask,scissorEnabled:caps.has(K.SCISSOR_TEST),scissor:scissor.slice()});if(!caps.has(K.SCISSOR_TEST)){if(mask&K.COLOR_BUFFER_BIT&&colorMask.every(Boolean)&&attached(draw).color)live.set(attached(draw).color,true);if(mask&K.DEPTH_BUFFER_BIT&&depthMask&&attached(draw).depth)live.set(attached(draw).depth,true);}},
  blitFramebuffer(...args){record('blitFramebuffer',args,{read,draw});for(const [mask,key]of [[K.COLOR_BUFFER_BIT,'color'],[K.DEPTH_BUFFER_BIT,'depth']])if(args[8]&mask){requireLive(attached(read)[key]);live.set(attached(draw)[key],true);}},
  invalidateFramebuffer(target,attachments){const framebuffer=target===K.READ_FRAMEBUFFER?read:draw,affected=images(framebuffer,attachments);record('invalidateFramebuffer',[target,Array.from(attachments)],{read,draw,framebuffer,affected});for(const image of affected){assert(image,'Only attached images may be discarded in this fixture');live.set(image,false);}},
  useProgram(program){current=program.id;record('useProgram',[current]);},
  getUniformLocation(program,name){record('getUniformLocation',[program.id,name]);return {program:program.id,name};},
  activeTexture(value){unit=value-K.TEXTURE0;record('activeTexture',[value]);},bindTexture(target,image){assert(!['msaa-color','msaa-depth'].includes(image),'Multisample renderbuffers are not resolved texture inputs');textures.set(unit,image);record('bindTexture',[target,image]);},
  drawArrays(...args){
   const sampled=[];if(['volumeProgram','volumeFilterProgram','postProgram','pointProgram'].includes(current)){assert.equal(textures.get(1),'scene-depth','Post/sprite depth must be the resolved texture');sampled.push('scene-depth');}
   if(['volumeProgram','volumeFilterProgram','postProgram'].includes(current)){assert.equal(textures.get(0),'scene-color');sampled.push('scene-color');}
   if(current==='volumeFilterProgram')sampled.push(textures.get(3));if(current==='postProgram')sampled.push(textures.get(3));if(current==='aaProgram')sampled.push(textures.get(0));for(const image of sampled)requireLive(image);
   record('drawArrays',args,{draw,program:current,sampled});if(colorMask.every(Boolean)&&attached(draw).color)live.set(attached(draw).color,true);
  },
  createTexture(){record('createTexture');return null;},
  getError(){record('getError');return 0;},finish(){record('finish');},flush(){record('flush');}
 };
 for(const method of ['viewport','clearColor','depthFunc','polygonOffset','bindSampler','bindVertexArray','blendFunc','bindRenderbuffer','deleteFramebuffer','deleteTexture','deleteRenderbuffer'])gl[method]=(...args)=>record(method,args);
 for(const method of ['uniform1i','uniform1f','uniform2f','uniform3f','uniform4f','uniform3fv','uniformMatrix4fv'])gl[method]=(location,...values)=>{uniforms.set(location.program+'/'+location.name,structuredClone(values));record(method,[location.program,location.name,...(method==='uniformMatrix4fv'?[values[0],Array.from(values[1])]:values)]);};
 const programs={};for(const id of ['program','shadowProgram','skyProgram','waterProgram','pointProgram','bubbleProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'])programs[id]={p:{id},u:{}};
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,batches:[],mobile:samples===2,quality:samples===2?1:2,width:128,height:96,canvas:{width:128,height:96},maxTextureSize:4096,shadowSize:1024,dynamicShadowSize:512,lighting:'day',textures:Array.from({length:9},(_,i)=>'loaded-texture-'+i),shadowTexture:'static-depth',dynamicShadowTexture:'dynamic-depth',shadowFBO:'static-shadow',dynamicShadowFBO:'dynamic-shadow',shadowSampler:'shadow-sampler',sceneFBO:'scene',sceneColor:'scene-color',sceneDepth:'scene-depth',msaaFBO:samples?'msaa':null,msaaColor:samples?'msaa-color':null,msaaDepth:samples?'msaa-depth':null,msaaSamples:samples,volumeFBO:'volume',volumeFilteredFBO:'filtered',volumeColor:'volume-color',volumeFilteredColor:'filtered-color',volumeW:64,volumeH:48,aaFBO:'aa',aaColor:'aa-color',postVAO:'post-vao',waterVAO:'water-vao',waterCount:3,particleVAO:'particle-vao',fog:[.001,.005,.028],fogDensity:.034,clarity:1,exposure:1.11,dynamicScale:1,lastQuality:2,frame:0,pendingResize:resizeFailure,sceneStream:{update:()=>!declined},renderBubbles(){},...programs});
 if(photo)Object.assign(renderer,{photoFov:43,photoNear:.03,photoAperture:8,photoFocus:2.5,lamp:true});
 for(const image of renderer.textures)live.set(image,true);
 const eye=sunless?[766,-7000,-115]:[0,-8,5],target=sunless?[766,-7000,-130]:[0,-8,-10];
 return {renderer,events,live,uniforms,decline(value){declined=value;},run(){const start=events.length,before=renderer.frame,returned=renderer.render(eye,target,8);return {events:events.slice(start),before,after:renderer.frame,returned,live:Object.fromEntries(live),samples,photo,sunless};}};
}
function assertFrame(frame){
 assert.notEqual(frame.returned,false,'A complete render is required');assert.equal(frame.after,frame.before+1);
 const events=frame.events,discards=events.filter(e=>e.op==='invalidateFramebuffer'),blits=events.filter(e=>e.op==='blitFramebuffer'),target=frame.samples?'msaa':'scene';
 if(frame.samples){
  assert.equal(blits.length,1,'Exactly one resolve');const blit=blits[0];assert.equal(blit.read,'msaa');assert.equal(blit.draw,'scene');assert.deepEqual(blit.args,[0,0,128,96,0,0,128,96,masks,K.NEAREST]);
  assert.equal(discards.length,1,'RED: the completed MSAA source must be invalidated exactly once after resolve');const discard=discards[0];
  assert.equal(discard.args[0],K.READ_FRAMEBUFFER,'Only the read source can be invalidated');assert.deepEqual(discard.args[1],[K.COLOR_ATTACHMENT0,K.DEPTH_ATTACHMENT]);assert.equal(discard.framebuffer,'msaa');assert.equal(discard.read,'msaa');assert.equal(discard.draw,'scene');assert.deepEqual(discard.affected,['msaa-color','msaa-depth']);
  assert.equal(events.indexOf(discard),events.indexOf(blit)+1,'Discard must immediately follow the completed resolve');assert.equal(frame.live['msaa-color'],false);assert.equal(frame.live['msaa-depth'],false);
 }else{assert.equal(blits.length,0);assert.equal(discards.length,0,'The direct single-sample scene remains live');}
 const firstDraw=events.findIndex(e=>e.op==='drawArrays'&&e.draw===target),clears=events.slice(0,firstDraw).filter(e=>e.op==='clear'&&e.draw===target);assert(firstDraw>=0);assert.equal(clears.length,1,'Attachment reuse starts with one full clear');
 const clear=clears[0];assert.equal(clear.args[0],masks);assert.deepEqual(clear.colorMask,[true,true,true,true]);assert.equal(clear.depthMask,true);assert.equal(clear.scissorEnabled,false,'A partial scissor cannot define invalidated samples');
 for(const image of ['scene-color','scene-depth','aa-color','presented-canvas'])assert.equal(frame.live[image],true,'Retain live resolved/presented resource '+image);
 const depthReaders=events.filter(e=>e.op==='drawArrays'&&e.sampled.includes('scene-depth'));assert(depthReaders.some(e=>e.program==='volumeProgram'));assert(depthReaders.some(e=>e.program==='postProgram'));assert(depthReaders.every(e=>e.draw!=='msaa'));
 for(const method of ['finish','flush','getError'])assert(!events.some(e=>e.op===method),'Discard must not introduce a blocking/diagnostic '+method);
}
const results=[];function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message);}}
check('4x MSAA resolves both live images before destructively invalidating only its source',()=>assertFrame(fixture().run()));
check('2x MSAA preserves the same source/destination lifetime',()=>assertFrame(fixture(source,{samples:2}).run()));
check('single-sample rendering keeps its resolved attachments and issues no discard',()=>assertFrame(fixture(source,{samples:0}).run()));
check('next completed frame fully redefines discarded samples before reusing MSAA',()=>{const f=fixture();assertFrame(f.run());assert.equal(f.live.get('msaa-color'),false);assertFrame(f.run());});
check('a declined stream frame preserves the presented scene without touching undefined MSAA storage',()=>{const f=fixture();assertFrame(f.run());const presented=f.live.get('presented-canvas');f.decline(true);const waiting=f.run();assert.equal(waiting.returned,false);assert.equal(waiting.after,waiting.before);assert.deepEqual(waiting.events,[]);assert.equal(f.live.get('presented-canvas'),presented);f.decline(false);assertFrame(f.run());});
check('a real resize allocation failure retains and fully clears the previous MSAA target',()=>{const f=fixture(source,{resizeFailure:true}),msaa=f.renderer.msaaFBO,scene=f.renderer.sceneFBO;assertFrame(f.run());assert(f.renderer.resizeFailure);assert.equal(f.renderer.msaaFBO,msaa);assert.equal(f.renderer.sceneFBO,scene);assert.deepEqual([f.renderer.canvas.width,f.renderer.canvas.height],[128,96]);assert(!f.events.some(e=>e.op==='deleteFramebuffer'&&[msaa,scene].includes(e.args[0])));});
check('first sunless frame still clears, resolves and discards correctly without a shadow update',()=>{const frame=fixture(source,{sunless:true}).run();assertFrame(frame);assert(!frame.events.some(e=>e.op==='clear'&&e.draw==='static-shadow'));});
check('photographic optics and later depth consumers retain the resolved depth image',()=>{const f=fixture(source,{photo:true});assertFrame(f.run());for(const program of ['volumeProgram','volumeFilterProgram','postProgram']){assert.deepEqual(f.uniforms.get(program+'/uPhotoAperture'),[8]);assert.deepEqual(f.uniforms.get(program+'/uPhotoFocus'),[2.5]);}assert.equal(f.live.get('scene-depth'),true);});
check('all remaining GL IO matches immutable v54, including waiting and retained-resize paths',()=>{
 for(const options of [{},{samples:2},{samples:0},{sunless:true},{photo:true},{resizeFailure:true}]){
  const old=fixture(baseline,options),candidate=fixture(source,options);
  for(let frame=0;frame<2;frame++){const expected=old.run(),actual=candidate.run();assertFrame(actual);assert.deepEqual(actual.events.filter(e=>e.op!=='invalidateFramebuffer'),expected.events,'Only one discard command may be added to the historical render IO');}
  old.decline(true);candidate.decline(true);assert.deepEqual(candidate.run().events,old.run().events);
 }
});
check('lifetime oracle rejects wrong target, early/duplicate discard, missing depth and partial clears',()=>{
 const original=fixture().run();assertFrame(original);
 const reject=mutate=>{const changed=structuredClone(original);mutate(changed.events);assert.throws(()=>assertFrame(changed));};
 reject(events=>{const e=events.find(e=>e.op==='invalidateFramebuffer');e.args[0]=K.FRAMEBUFFER;e.framebuffer='scene';e.affected=['scene-color','scene-depth'];});
 reject(events=>{const at=events.findIndex(e=>e.op==='invalidateFramebuffer'),[e]=events.splice(at,1);events.splice(events.findIndex(e=>e.op==='blitFramebuffer'),0,e);});
 reject(events=>events.push(structuredClone(events.find(e=>e.op==='invalidateFramebuffer'))));
 reject(events=>events.find(e=>e.op==='invalidateFramebuffer').args[1].pop());
 reject(events=>{events.find(e=>e.op==='clear'&&e.draw==='msaa').depthMask=false;});
 reject(events=>{events.find(e=>e.op==='clear'&&e.draw==='msaa').scissorEnabled=true;});
 reject(events=>events.splice(events.findIndex(e=>e.op==='invalidateFramebuffer'),0,{op:'finish',args:[]}));
});
console.log(`${results.filter(Boolean).length}/${results.length} MSAA resolve lifetime checks passed (CPU IO model, not GPU/pixel or bandwidth evidence)`);if(results.includes(false))process.exitCode=1;
