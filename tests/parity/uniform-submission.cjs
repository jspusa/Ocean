/* Real render passes against program-specific uniform locations. Null locations
 * behave like WebGL no-ops; active values and per-draw state stay frozen. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8'),fixturePath=path.join(__dirname,'fixtures/uniform-state-v018.json');
// Keep the immutable pre-cache fixture. Normalize only the two deliberately
// authored 0.18.6 changes for its uniform-state comparison; real current passes
// still exercise location caching and null-call removal below. Lamp parameters
// are independently checked against actual surface/photo uniforms by trench-lighting.
const comparableSource=source.replace('outer:.62,inner:.98,strength:2.2,falloff:.024','outer:.76,inner:.987,strength:2.2,falloff:.055').replace('uniform sampler2D uVolumeShadow;','uniform sampler2D uVolumeShadow;uniform sampler2D uCaustic;');
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
  const row={pass,program:current.id,name:location?.name??null,method,values:values.map(value=>ArrayBuffer.isView(value)?Array.from(value):value)};calls.push(row);
  if(location!==null){assert.equal(location.program,current,'Uniform belongs to the active program');states.get(current)[location.name]={method,values:row.values};}
 };
 const record=(kind,count,instances=1)=>draws.push({pass,program:current.id,vao,kind,count,instances,state:digest(states.get(current))});
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
  frames.push({frame,allCalls:calls.length,nullCalls:calls.length-active.length,activeCalls:active.length,activeHash:digest(active),draws});
 }
 return {f,frames};
}
const {f,frames}=run();
const comparable=run(comparableSource).frames;
const original=JSON.parse(fs.readFileSync(fixturePath,'utf8')),results=[];
function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message);}}
check('apart from the authored lamp and removed volume atlas, uniform values/order match frozen passes',()=>{
 for(let i=0;i<comparable.length;i++){assert.equal(comparable[i].activeCalls,original.frames[i].activeCalls);assert.equal(comparable[i].activeHash,original.frames[i].activeHash,'Active submission sequence for frame '+i);assert.deepEqual(comparable[i].draws,original.frames[i].draws,'Draws and uniform state for frame '+i);assert.deepEqual(frames[i].draws.map(({state,...draw})=>draw),comparable[i].draws.map(({state,...draw})=>draw));}
});
check('no shader pass submits inactive uniform locations',()=>{
 console.log('WORK '+JSON.stringify(frames.map((row,i)=>({frame:i,before:original.frames[i].allCalls,after:row.allCalls,removed:original.frames[i].nullCalls}))));
 for(let i=0;i<frames.length;i++){assert.equal(frames[i].nullCalls,0);assert.equal(original.frames[i].allCalls-frames[i].allCalls,original.frames[i].nullCalls+1,'one additional inactive volume atlas location');assert.ok(original.frames[i].nullCalls>50,'Reference must expose no-op calls');}
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
