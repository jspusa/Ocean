/* Real render passes against program-specific uniform locations. Null locations
 * behave like WebGL no-ops; active values and per-draw state stay frozen. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8'),fixturePath=path.join(__dirname,'fixtures/uniform-state-v018.json');
// Keep the immutable pre-cache fixture. The two 0.18.6 source normalizations
// remain exact and bounded. For 0.18.20 we record the REAL current submissions,
// check the authored additions/order, then project only those additions back
// to the old contract. Never regenerate or bless a new snapshot from the run.
function replaceOnce(text,from,to){assert.equal(text.split(from).length,2,'Exactly one authored normalization: '+from);return text.replace(from,to);}
const comparableSource=replaceOnce(replaceOnce(source,'outer:.62,inner:.98,strength:2.2,falloff:.024','outer:.76,inner:.987,strength:2.2,falloff:.055'),'uniform sampler2D uVolumeShadow;','uniform sampler2D uVolumeShadow;uniform sampler2D uCaustic;');
const addedUniforms=Object.freeze({program:['uSunless'],volumeProgram:['uSunless'],pointProgram:['uSun','uLightDir','uLightColor','uDepth','uResolution','uExposure','uClarity','uPhotoAperture','uPhotoFocus']});
const authoredAdditionCount=Object.values(addedUniforms).reduce((sum,names)=>sum+names.length,0);
const isAdded=row=>addedUniforms[row.program]?.includes(row.name)===true;
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(shaderSource=source){
 const context=vm.createContext({console,performance});
 vm.runInContext(shaderSource+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];const SPECIES=[{materialProfile:{roughness:.4,subsurface:.2,patternScale:2,skin:"fish"},motionProfile:{type:"snailfish"}}];globalThis.shaderPairs={program:[VS,FS],shadowProgram:[VS,SHADOW_FS],waterProgram:[WATER_VS,WATER_FS],pointProgram:[POINT_VS,POINT_FS],postProgram:[POST_VS,POST_FS],volumeProgram:[POST_VS,VOLUME_FS],volumeFilterProgram:[POST_VS,VOLUME_FILTER_FS],bubbleProgram:[BUBBLE_VS,BUBBLE_FS],aaProgram:[POST_VS,AA_FS],skyProgram:[POST_VS,SKY_FS]};',context);
 const Class=vm.runInContext('Renderer',context),calls=[],draws=[],programs={},states=new Map(),lookups=new Map();let pass,current,vao;
 for(const [id,parts] of Object.entries(context.shaderPairs)){
  const names=new Set([...parts.join('\n').matchAll(/uniform\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+(\w+)/g)].map(m=>m[1]));
  programs[id]={p:{id,names},u:{}};states.set(programs[id].p,{});
 }
 const io={getUniformLocation(program,name){const key=program.id+'/'+name;lookups.set(key,(lookups.get(key)||0)+1);return program.names.has(name)?{program,name}:null;},useProgram(program){current=program;},bindFramebuffer(_,framebuffer){pass=framebuffer;},bindVertexArray(value){vao=value;}};
 for(const method of ['uniform1i','uniform1f','uniform2f','uniform3f','uniform4f','uniform3fv','uniformMatrix4fv'])io[method]=(location,...values)=>{
  const row={pass,program:current.id,name:location?.name??null,method,values:values.map(value=>ArrayBuffer.isView(value)||Array.isArray(value)?Array.from(value):value)};calls.push(row);
  if(location!==null){assert.equal(location.program,current,'Uniform belongs to the active program');states.get(current)[location.name]={method,values:row.values};}
 };
 const record=(kind,count,instances=1)=>{const values=structuredClone(states.get(current));draws.push({pass,program:current.id,vao,kind,count,instances,state:digest(values),values});};
 io.drawElementsInstanced=(_,count,type,offset,instances)=>record('indexed',count,instances);io.drawArrays=(_,first,count)=>record('arrays',count);
 const gl=new Proxy(io,{get:(o,k)=>k in o?o[k]:(()=>{})});
 const batch=(id,material=1,species=-1,dynamic=false)=>({id,vao:id,ib:id,kind:dynamic?1:0,material,species,dynamic,visible:true,shadow:true,radius:1,instances:[{p:[0,-8,0]}],data:new Float32Array(24),count:3,vertexCount:3});
 const batches=[batch('terrain-a'),batch('terrain-b'),batch('rock',2),batch('terrain-c'),batch('animal',6,0,true)];
 const renderer=Object.assign(Object.create(Class.prototype),{gl,batches,mobile:false,quality:2,width:800,height:600,canvas:{width:800,height:600},shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:Array.from({length:9},(_,i)=>'texture'+i),shadowFBO:'static',dynamicShadowFBO:'dynamic',sceneFBO:'colour',volumeFBO:'volume',volumeFilteredFBO:'filter',aaFBO:'post',volumeW:400,volumeH:300,frame:0,shadowProgram:programs.shadowProgram,forceShadow:true,postVAO:'post-vao',waterVAO:'water-vao',waterCount:12,particleVAO:'particle-vao',exposure:1.11,clarity:1,fog:[.001,.005,.028],fogDensity:.034,frustum:()=>Array.from({length:6},()=>[0,0,0,1]),...programs});renderer.setupBubbles();
 return {context,renderer,batches,calls,draws,lookups};
}
function run(shaderSource=source){
 const f=fixture(shaderSource),frames=[];
 for(let frame=0;frame<3;frame++){
  const r=f.renderer,deep=frame===2;r.forceShadow=frame!==1;r.lighting=deep?'late':'day';r.lamp=deep;r.photoFov=deep?43:undefined;r.photoAperture=deep?.35:0;r.photoFocus=deep?3:8;
  if(deep){for(const b of f.batches)b.instances[0].p=[766,-7000,-120];vm.runInContext('SPECIES[0].materialProfile.roughness=.85;SPECIES[0].motionProfile.type="vampire"',f.context);}
  const beginCalls=f.calls.length,beginDraws=f.draws.length;r.render(deep?[766,-7000,-115]:[0,-8,5],deep?[766,-7000,-130]:[0,-8,-10],frame+8);
  const calls=f.calls.slice(beginCalls),active=calls.filter(row=>row.name!==null),draws=f.draws.slice(beginDraws);
  frames.push({frame,allCalls:calls.length,nullCalls:calls.length-active.length,activeCalls:active.length,activeHash:digest(active),active,draws});
 }
 return {f,frames};
}
const {f,frames}=run();
const comparable=run(comparableSource).frames;
const original=JSON.parse(fs.readFileSync(fixturePath,'utf8')),results=[];
function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message);}}
const metadata=({state,values,...draw})=>draw;
function legacyOrder(rows){
 const points=rows.filter(row=>row.program==='pointProgram'),others=rows.filter(row=>row.program!=='pointProgram');
 const volume=others.findIndex(row=>row.program==='volumeProgram');assert(volume>=0,'Legacy insertion requires the volume pass');
 return [...others.slice(0,volume),...points.map(row=>({...row,pass:'colour'})),...others.slice(volume)];
}
function projectedFrame(frame){
 const active=legacyOrder(frame.active.filter(row=>!isAdded(row)));
 const draws=legacyOrder(frame.draws).map(({values,...draw})=>{
  const legacyValues=Object.fromEntries(Object.entries(values).filter(([name])=>!isAdded({program:draw.program,name})));
  return {...draw,...(draw.program==='aaProgram'?{vao:'post-vao'}:{}),state:digest(legacyValues)};
 });
 return {activeCalls:active.length,activeHash:digest(active),draws};
}
check('the only presentation-order change is points after POST and before final AA',()=>{
 for(let i=0;i<frames.length;i++){
  const expected=original.frames[i].draws.map(metadata),index=expected.findIndex(row=>row.program==='pointProgram'),[point]=expected.splice(index,1);
  expected.splice(expected.findIndex(row=>row.program==='postProgram')+1,0,{...point,pass:'post'});
  // POST_VS uses gl_VertexID and has no attributes; the final draw retains
  // the current particle VAO instead of the earlier empty post VAO.
  expected.find(row=>row.program==='aaProgram').vao='particle-vao';
  assert.deepEqual(frames[i].draws.map(metadata),expected,'Actual production draws for frame '+i);
  assert.deepEqual(comparable[i].draws.map(metadata),expected,'Lamp-normalized draws for frame '+i);
  for(const frame of [frames[i],comparable[i]]){
   const blocks=frame.active.map(row=>row.program).filter((name,j,all)=>j===0||name!==all[j-1]);
   assert.deepEqual(blocks.slice(-5),['volumeProgram','volumeFilterProgram','postProgram','pointProgram','aaProgram'],'Actual submission order before projection');
  }
 }
});
check('exact authored new uniform names, values and counts are submitted on every legacy frame',()=>{
 assert.equal(authoredAdditionCount,11);
 for(let i=0;i<frames.length;i++)for(const frame of [frames[i],comparable[i]]){
  const additions=frame.active.filter(isAdded);assert.equal(additions.length,authoredAdditionCount);
  const one=(program,name)=>{const found=frame.active.filter(row=>row.program===program&&row.name===name);assert.equal(found.length,1,program+'/'+name+' must be written once this frame');return found[0];};
  for(const program of ['program','volumeProgram'])assert.deepEqual(one(program,'uSunless'),{pass:program==='program'?'colour':'volume',program,name:'uSunless',method:'uniform1i',values:[i===2?1:0]});
  const expected={uDepth:{method:'uniform1i',values:[1]},uResolution:{method:'uniform2f',values:[800,600]},uExposure:{method:'uniform1f',values:[1.11]},uClarity:{method:'uniform1f',values:[1]},uPhotoAperture:{method:'uniform1f',values:[i===2?.35:0]},uPhotoFocus:{method:'uniform1f',values:[i===2?3:8]}};
  for(const name of ['uSun','uLightDir','uLightColor']){const row=one('volumeProgram',name);expected[name]={method:row.method,values:row.values};}
  for(const [name,value] of Object.entries(expected))assert.deepEqual(one('pointProgram',name),{pass:'post',program:'pointProgram',name,...value});
 }
});
check('all other uniform values, submission order and draw states match the immutable v0.18 fixture',()=>{
 for(let i=0;i<comparable.length;i++){
  const projected=projectedFrame(comparable[i]);assert.equal(projected.activeCalls,original.frames[i].activeCalls);
  assert.equal(projected.activeHash,original.frames[i].activeHash,'Unchanged active submission sequence for frame '+i);
  assert.deepEqual(projected.draws,original.frames[i].draws,'Unchanged draw values and state for frame '+i);
 }
});
check('no shader pass submits inactive uniform locations',()=>{
 console.log('WORK '+JSON.stringify(frames.map((row,i)=>({frame:i,before:original.frames[i].allCalls,after:row.allCalls,removedNull:original.frames[i].nullCalls,removedAtlas:1,authoredActiveAdditions:authoredAdditionCount}))));
 for(let i=0;i<frames.length;i++){assert.equal(frames[i].nullCalls,0);assert.equal(original.frames[i].allCalls-frames[i].allCalls,original.frames[i].nullCalls+1-authoredAdditionCount,'Only authored active additions offset the removed null calls and volume atlas');assert.ok(original.frames[i].nullCalls>50,'Reference must expose no-op calls');}
});
check('both sprite programs refresh their own camera, optics and lighting through shallow/deep/shallow frames',()=>{
 const f=fixture(),r=f.renderer,configs=[
  {eye:[0,-8,5],target:[0,-8,-10],width:800,height:600,quality:2,exposure:1.11,clarity:1,aperture:0,focus:8,lamp:false,lighting:'day'},
  {eye:[766,-7000,-115],target:[766,-7000,-130],width:585,height:1266,quality:1,exposure:.73,clarity:1.2,aperture:1.8,focus:3,lamp:true,lighting:'late'},
  {eye:[.5,-8,4],target:[1,-8,-10],width:844,height:390,quality:0,exposure:1.8,clarity:.65,aperture:16,focus:.8,lamp:false,lighting:'blue'}
 ];
 configs.forEach((c,i)=>{
  Object.assign(r,{width:c.width,height:c.height,quality:c.quality,exposure:c.exposure,clarity:c.clarity,photoAperture:c.aperture,photoFocus:c.focus,lamp:c.lamp,lighting:c.lighting});r.canvas.width=c.width;r.canvas.height=c.height;
  for(const batch of f.batches)batch.instances[0].p=[c.eye[0],c.eye[1],c.eye[2]-5];
  r.bubbles=[{p:[c.eye[0]+.3,c.eye[1]-.1,c.eye[2]-1],r:.03,a:0,phase:0}];r.bubbleTime=i+8;
  const beginCalls=f.calls.length,beginDraws=f.draws.length;r.render(c.eye,c.target,i+8);
  const calls=f.calls.slice(beginCalls),draws=f.draws.slice(beginDraws),volume=draws.find(draw=>draw.program==='volumeProgram');
  assert.equal(calls.filter(row=>row.name===null).length,0);assert.deepEqual(draws.slice(-4).map(row=>row.program),['postProgram','pointProgram','bubbleProgram','aaProgram']);
  for(const program of ['pointProgram','bubbleProgram']){
   const found=draws.filter(draw=>draw.program===program);assert.equal(found.length,1);const draw=found[0];assert.equal(draw.pass,'post');
   const expected={uDepth:['uniform1i',[1]],uResolution:['uniform2f',[c.width,c.height]],uExposure:['uniform1f',[c.exposure]],uClarity:['uniform1f',[c.clarity]],uPhotoAperture:['uniform1f',[c.aperture]],uPhotoFocus:['uniform1f',[c.focus]],uCamera:['uniform3fv',[c.eye]],uRenderOrigin:['uniform3fv',[Array.from(r.renderOrigin)]],uViewForward:['uniform3fv',[Array.from(r.cameraForward)]],uTorch:['uniform1f',[c.lamp?1:0]],uTorchParams:['uniform4f',[.62,.98,2.2,.024]],uVP:['uniformMatrix4fv',[false,Array.from(r.renderVP)]]};
   for(const [name,[method,values]] of Object.entries(expected)){
    assert.deepEqual(draw.values[name],{method,values},program+'/'+name+' current draw');
    const submitted=calls.filter(row=>row.program===program&&row.name===name);assert.equal(submitted.length,1,program+'/'+name+' is refreshed exactly once');
    assert.deepEqual(submitted[0],{pass:'post',program,name,method,values});
   }
   for(const name of ['uSun','uLightDir','uLightColor'])assert.deepEqual(draw.values[name],volume.values[name],program+' uses current shared '+name);
  }
  for(const program of ['program','volumeProgram']){const writes=calls.filter(row=>row.program===program&&row.name==='uSunless');assert.equal(writes.length,1);assert.deepEqual(writes[0].values,[i===1?1:0],'Solar work restores on the returning shallow frame');}
 });
 assert([...f.lookups.values()].every(count=>count===1),'Sprite additions use the same active/null location cache');
});
check('active and null uniform locations are looked up only once per program/name',()=>{
 assert(f.lookups.size>100);assert([...f.lookups.values()].every(count=>count===1));
});
check('fixed arity setters keep zero locations valid and pass values without packing arrays',()=>{
 const context=vm.createContext({console,performance});vm.runInContext(source,context);const Class=vm.runInContext('Renderer',context),calls=[],lookups=[];
 const gl={getUniformLocation(program,name){lookups.push([program,name]);return name==='absent'?null:0;}};
 for(const method of ['uniform1i','uniform1f','uniform2f','uniform3f','uniform4f','uniform3fv','uniformMatrix4fv'])gl[method]=(...args)=>calls.push({method,args});
 const r=Object.assign(Object.create(Class.prototype),{gl}),p={p:{},u:{}},vector=new Float32Array([1,2,3]),matrix=new Float32Array(16);
 const setters=[['set1i',[2],'uniform1i'],['set1f',[.4],'uniform1f'],['set2f',[1,2],'uniform2f'],['set3f',[1,2,3],'uniform3f'],['set4f',[1,2,3,4],'uniform4f'],['set3fv',[vector],'uniform3fv'],['setMatrix4fv',[false,matrix],'uniformMatrix4fv']];
 for(const [setter,args,method] of setters){r[setter](p,'active',...args);r[setter](p,'absent',...args);const row=calls.at(-1);assert.equal(row.method,method);assert.equal(row.args[0],0);assert.deepEqual(row.args.slice(1),args);}
 assert.equal(calls.length,setters.length);assert.equal(lookups.length,2);assert.equal(calls.at(-1).args[2],matrix,'Matrix object is forwarded without a copy');assert.equal(calls.at(-2).args[1],vector,'Vector object is forwarded without a copy');
});
console.log(`${results.filter(Boolean).length}/${results.length} uniform submission checks passed`);if(results.includes(false))process.exitCode=1;
