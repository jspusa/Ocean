/* Renderer -> WebGL regression: execute production batching and transparent
 * submission against a recording GL sink. This does not execute shader pixels,
 * prove foreground appearance, or measure GPU cost. --engine replays a retained
 * source snapshot; default uses the current production source without rewriting it. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const args=process.argv.slice(2),option=name=>{const at=args.indexOf(name);return at<0?null:args[at+1];};
const enginePath=path.resolve(option('--engine')||path.join(__dirname,'../../src/engine.js')),source=fs.readFileSync(enginePath,'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const context=vm.createContext({console,performance});
vm.runInContext(source+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];const SPECIES=[{motionProfile:{type:"barreleye"}}];',context,{filename:enginePath});
const Renderer=vm.runInContext('Renderer',context),perspective=vm.runInContext('perspective',context);
const openPlanes=Array.from({length:6},()=>[0,0,0,1]);
const clone=value=>JSON.parse(JSON.stringify(value));

function fixture({width=256,height=192,scratchWidth=128,scratchHeight=96,scissor=null}={}){
 let next=0,boundArray=null,vao=null,program=null,throwFilter=false;
 const events=[],buffers=new Map(),attributes=new Map(),uniforms=new Map(),attachments=new Map(),drawBuffers=new Map();
 const state={framebuffer:'aa',viewport:[0,0,width,height],scissor:scissor||[2,3,width-4,height-6],enabled:new Set(['BLEND',...(scissor?['SCISSOR_TEST']:[])]),blend:['SRC_ALPHA','ONE_MINUS_SRC_ALPHA']};
 const snapshot=()=>({framebuffer:state.framebuffer,viewport:[...state.viewport],scissor:[...state.scissor],scissorEnabled:state.enabled.has('SCISSOR_TEST'),blendEnabled:state.enabled.has('BLEND'),blend:[...state.blend]});
 const gl={};
 for(const key of ['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','UNSIGNED_SHORT','UNSIGNED_INT','TRIANGLES','FLOAT','STATIC_DRAW','DYNAMIC_DRAW','FRAMEBUFFER','COLOR_ATTACHMENT0','COLOR_ATTACHMENT1','TEXTURE_2D','COLOR','BLEND','CULL_FACE','BACK','ONE','ONE_MINUS_SRC_ALPHA','SRC_ALPHA','SCISSOR_TEST','SCISSOR_BOX','VIEWPORT'])gl[key]=key;
 Object.assign(gl,{
  createBuffer(){const id='buffer-'+(++next);buffers.set(id,[]);return id;},createVertexArray(){const id='vao-'+(++next);attributes.set(id,new Map());return id;},
  bindBuffer(target,id){if(target===gl.ARRAY_BUFFER)boundArray=id;},bufferData(){},bufferSubData(target,offset,data,start=0,length=data.length){buffers.set(boundArray,Array.from(data).slice(start,start+length));},
  bindVertexArray(value){vao=value;},enableVertexAttribArray(){},vertexAttribDivisor(){},vertexAttribPointer(location,size,type,normalized,stride,offset){attributes.get(vao).set(location,{buffer:boundArray,offset,stride});},
  bindFramebuffer(target,id){state.framebuffer=id;},framebufferTexture2D(target,attachment,type,texture){attachments.set(state.framebuffer+':'+attachment,texture);},drawBuffers(values){drawBuffers.set(state.framebuffer,Array.from(values));},
  viewport(...values){state.viewport=values;},scissor(...values){state.scissor=values;},enable(key){state.enabled.add(key);},disable(key){state.enabled.delete(key);},isEnabled(key){return state.enabled.has(key);},getParameter(key){if(key===gl.SCISSOR_BOX)return new Int32Array(state.scissor);if(key===gl.VIEWPORT)return new Int32Array(state.viewport);throw new Error('Unexpected GL query: '+key);},
  cullFace(){},blendFunc(...values){state.blend=values;},useProgram(value){program=value;},
  clearBufferfv(target,attachment,value){events.push({type:'clear',attachment,value:Array.from(value),...snapshot()});},
  drawElementsInstanced(mode,count,type,offset,instances){const attribute=attributes.get(vao).get(3),record=attribute.offset/4,payload=buffers.get(attribute.buffer);events.push({type:'source',vao,program,count,instances,packedIndex:attribute.offset/96,position:payload.slice(record,record+3),uniforms:clone(uniforms.get(program)||{}),...snapshot()});},
  drawArrays(mode,first,count){events.push({type:'filter',count,uniforms:clone(uniforms.get(program)||{}),...snapshot()});if(throwFilter){throwFilter=false;throw new Error('Injected filter submission failure');}},
 });
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile:false,quality:2,batches:[],drawCalls:0,submittedTriangles:0,submittedVertices:0,canvas:{width,height},volumeW:scratchWidth,volumeH:scratchHeight,volumeFBO:'scratch',aaFBO:'aa',volumeColor:'scratch-color',volumeFilteredColor:'scratch-depth',sceneDepth:'scene-depth',postVAO:'post-vao',shellProgram:{p:'shell'},shellImageProgram:{p:'shell-image'},shellFilterProgram:{p:'filter'},cameraForward:[0,0,-1],vp:perspective(Math.PI/4,width/height,.01,950),renderOrigin:[0,0,0],photoAperture:2,photoFocus:20,photoNear:.01,floatColor:false,exposure:1.11,clarity:1,
  common(p){gl.useProgram(p.p);},batchUniforms(){},bindTex(){},
 });
 for(const name of ['set1i','set1f','set2f','set3f','set4f'])renderer[name]=(p,key,...values)=>{if(!uniforms.has(p.p))uniforms.set(p.p,{});uniforms.get(p.p)[key]=values;};
 function addBatch(actors,{min=0,max=220}={}){
  const geometry=vm.runInContext('(()=>{const g=new Geometry();g.species=0;g.tag=1;g.tri([-.1,0,0],[.1,0,0],[0,.1,0],[.1,.1,.1]);g.tag=8;g.tri([-.1,-.1,-.05],[.1,-.1,.05],[0,.1,0],[.5,.5,.5]);g.transparentShell={first:3,count:3};return g;})()',context);
  const batch=renderer.batch(geometry,actors,11,true);batch.minDistance=min;batch.maxDistance=max;renderer.updateBatch(batch,[0,0,0],openPlanes);return batch;
 }
 function render(){events.length=0;renderer.renderTransparentShells([0,0,0],3);return events;}
 return {renderer,gl,events,state,attachments,drawBuffers,addBatch,render,snapshot,injectFilterFailure(){throwFilter=true;}};
}

const actor=(z=-3,x=0)=>({uid:'deliberately-duplicate-uid',p:[x,0,z],s:[1,1,1]});
function restoresCaller(f,initial){
 assert.deepEqual(f.snapshot(),initial,'Caller framebuffer, viewport, blend and scissor state must be restored');
 assert(!f.state.enabled.has('CULL_FACE'),'The enclosing shell pass must restore culling for subsequent sprites');
 assert.equal(f.attachments.get('scratch:COLOR_ATTACHMENT1'),null,'Temporary second attachment must be detached');
 assert.deepEqual(f.drawBuffers.get('scratch'),['COLOR_ATTACHMENT0'],'Scratch returns to its original single color attachment');
}
function filterGroups(events){const groups=[];let sources=[];for(const event of events){if(event.type==='source')sources.push(event);if(event.type==='filter'){groups.push({sources,filter:event});sources=[];}}assert.equal(sources.length,0,'Every submitted scratch image must be consumed');return groups;}
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+': '+error.message);}}

check('small shell clears only its local scratch region and restores the normal caller state',()=>{
 const f=fixture();f.addBatch([actor()]);const initial=f.snapshot();f.render();
 const clears=f.events.filter(e=>e.type==='clear'),filters=f.events.filter(e=>e.type==='filter');assert(clears.length&&filters.length);
 for(const clear of clears){assert.equal(clear.framebuffer,'scratch');assert(clear.scissorEnabled,'Clearing an entire scratch target is not local work');const [x,y,w,h]=clear.scissor;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=f.renderer.volumeW&&y+h<=f.renderer.volumeH,'Clear stays inside scratch');assert(w*h<f.renderer.volumeW*f.renderer.volumeH/2,'A small crown may not clear most of the scratch image');assert.deepEqual(clear.value,[0,0,0,0]);}
 for(const filter of filters){assert.equal(filter.framebuffer,'aa');assert.deepEqual(filter.blend,['ONE','ONE_MINUS_SRC_ALPHA']);assert(filter.blendEnabled);if(filter.scissorEnabled)assert.deepEqual(filter.scissor,filter.viewport,'Composite scissor must cover exactly the output tile');}
 restoresCaller(f,initial);return {clearRects:clears.map(e=>e.scissor),filterRects:filters.map(e=>e.viewport)};
});

check('an existing caller scissor clips the composite and is restored even after a submission failure',()=>{
 const box=[125,93,5,7],evidence=[];
 for(const fail of [false,true]){const f=fixture({scissor:box});f.addBatch([actor()]);const initial=f.snapshot();if(fail)f.injectFilterFailure();if(fail)assert.throws(()=>f.render(),/Injected filter submission failure/);else f.render();
  const filter=f.events.find(e=>e.type==='filter');assert(filter);assert(filter.scissorEnabled);const [x,y,w,h]=filter.viewport,[sx,sy,sw,sh]=filter.scissor;const expected=[Math.max(x,box[0]),Math.max(y,box[1])];expected.push(Math.max(0,Math.min(x+w,box[0]+box[2])-expected[0]),Math.max(0,Math.min(y+h,box[1]+box[3])-expected[1]));assert.deepEqual([sx,sy,sw,sh],expected,'Composite respects the original clipping region');restoresCaller(f,initial);evidence.push({injectedFailure:fail,compositeScissor:filter.scissor});
 }return evidence;
});

check('a completely behind-camera shell submits no source, filter or scratch clear',()=>{
 const f=fixture();f.addBatch([actor(3)]);f.render();assert.equal(f.events.length,0,'Behind-camera projection may not turn into a full-screen tiled pass');return {submittedEvents:f.events.length};
});

check('tiny scratch targets keep every active filter sample in range with normalized finite weights',()=>{
 const evidence=[];
 for(const [scratchWidth,scratchHeight]of [[1,1],[2,3],[3,2],[5,5],[7,9],[20,20]]){
  const f=fixture({width:9,height:7,scratchWidth,scratchHeight});f.addBatch([actor(-1)]);const initial=f.snapshot();f.render();const filters=f.events.filter(e=>e.type==='filter');assert(filters.length>0,'A visible crown may not disappear for a small canvas');assert(filters.length<=9*7,'Work is bounded by the output pixel count');
  for(const filter of filters){const u=filter.uniforms,offsets=u.uOffsets,weights=u.uWeights,center=u.uCenterWeight[0],origin=u.uTileOrigin;assert([...offsets,...weights,center,...origin].every(Number.isFinite));assert(weights.every(w=>w>=0)&&center>0);assert(Math.abs(center+2*weights.reduce((s,v)=>s+v,0)-1)<1e-12,'The surviving one-dimensional kernel remains unit sum');
   const active=[0,...offsets.filter((_,i)=>weights[i]>0).flatMap(v=>[-v,v])];const [x,y,w,h]=filter.viewport;
   for(const dx of active)for(const dy of active){const minX=x+.5-origin[0]+dx,maxX=x+w-.5-origin[0]+dx,minY=y+.5-origin[1]+dy,maxY=y+h-.5-origin[1]+dy;assert(minX>=.5-1e-9&&maxX<=scratchWidth-.5+1e-9&&minY>=.5-1e-9&&maxY<=scratchHeight-.5+1e-9,'An active bilinear sample may not rely on clamping outside the tiny scratch image');}
  }
  for(const clear of f.events.filter(e=>e.type==='clear')){assert(clear.scissorEnabled);const [x,y,w,h]=clear.scissor;assert(x>=0&&y>=0&&x+w<=scratchWidth&&y+h<=scratchHeight,'Tiny scratch clear fits the real texture');}
  restoresCaller(f,initial);evidence.push({scratch:[scratchWidth,scratchHeight],filterDraws:filters.length,weights:filters[0].uniforms.uWeights,center:filters[0].uniforms.uCenterWeight});
 }return evidence;
});

check('packed visibility keeps one actor LOD pair together while separate actors with the same UID stay separate',()=>{
 const f=fixture(),hidden=actor(-2,30),near=actor(-3),far=actor(-4,.2),previouslyCulled=actor(-100);hidden.ecologyPresent=false;
 const high=f.addBatch([hidden,near,far,previouslyCulled],{max:4.5}),low=f.addBatch([previouslyCulled,far,hidden,near],{min:2,max:5});
 function verify(expected){f.render();const groups=filterGroups(f.events);assert.equal(groups.length,expected.length,'Each physical actor gets one complete source image and one filter');
  groups.forEach((group,index)=>{assert.equal(group.sources.length,2,'Both complementary LOD surfaces must be submitted before filtering');assert.deepEqual(new Set(group.sources.map(e=>e.vao)),new Set([high.vao,low.vao]));for(const source of group.sources){assert.equal(source.framebuffer,'scratch');assert.equal(source.blendEnabled,false,'Complementary LOD samples populate one source image without double alpha-over');assert.equal(source.instances,1);source.position.forEach((v,axis)=>assert(Math.abs(v-expected[index].p[axis])<1e-6,'Packed culling must retain the correct actor identity'));}});return groups.map(group=>({positions:group.sources.map(e=>e.position),packedIndices:group.sources.map(e=>e.packedIndex)}));}
 const first=verify([far,near]);near.ecologyPresent=false;far.p=[.1,0,-3.2];previouslyCulled.p=[0,0,-3.3];for(const batch of [high,low])f.renderer.updateBatch(batch,[0,0,0],openPlanes);const repacked=verify([previouslyCulled,far]);
 for(const a of [far,previouslyCulled])a.ecologyPresent=false;for(const batch of [high,low])f.renderer.updateBatch(batch,[0,0,0],openPlanes);f.render();assert.equal(f.events.length,0,'No stale packed actor survives a fully hidden frame');return {first,repacked};
});

check('distinct co-located actor objects with identical UIDs are never merged into one filtered surface',()=>{
 const f=fixture(),a=actor(),b=actor();assert.notEqual(a,b);assert.equal(a.uid,b.uid);f.addBatch([a,b],{max:4});f.addBatch([b,a],{min:2,max:5});f.render();const groups=filterGroups(f.events);assert.equal(groups.length,2);assert(groups.every(group=>group.sources.length===2),'Object identity, not UID or pose equality, identifies a physical LOD pair');return {groups:groups.length,sourceDraws:groups.map(group=>group.sources.length)};
});

check('a spread-cloned batch owns its packed actor identities after interleaved source and clone updates',()=>{
 const f=fixture(),wild=actor(-3),exhibit=actor(-4,.2),sourceBatch=f.addBatch([wild]),g=f.gl;
 // Aquarium clones the mesh metadata, then replaces its VAO, instance buffer,
 // packed data and actors. Exercise that actual shape without naming or
 // pre-clearing any renderer-owned actor-reference cache in this test.
 const copy={...sourceBatch,vao:g.createVertexArray(),ib:g.createBuffer(),data:new Float32Array(24),instances:[],drawCount:0};
 copy.instances.push(exhibit);f.renderer.batches.push(copy);
 function verify(order){for(const batch of order)f.renderer.updateBatch(batch,[0,0,0],openPlanes);f.render();const groups=filterGroups(f.events);
  assert.equal(groups.length,2,'Updating a clone must not merge distinct source and exhibit actors into one filtered surface');
  for(const [index,batch]of [copy,sourceBatch].entries()){const group=groups[index];assert.equal(group.sources.length,1,'Each physical actor keeps a separate source image');assert.equal(group.sources[0].vao,batch.vao);group.sources[0].position.forEach((value,axis)=>assert(Math.abs(value-batch.instances[0].p[axis])<1e-6,'Interleaved packing must preserve each batch actor payload'));}
  return groups.map(group=>({vao:group.sources[0].vao,position:group.sources[0].position,sourceDraws:group.sources.length}));
 }
 const sourceThenClone=verify([sourceBatch,copy]);wild.p=[-.1,0,-3.1];exhibit.p=[.1,0,-4.2];const cloneThenSource=verify([copy,sourceBatch]);
 return {sourceThenClone,cloneThenSource};
});

check('focused LODs retain direct shell draws without scratch clears or image filtering',()=>{
 const f=fixture(),a=actor();f.addBatch([a],{max:4});f.addBatch([a],{min:2,max:5});f.renderer.photoAperture=0;f.render();assert.equal(f.events.length,2);assert(f.events.every(e=>e.type==='source'&&e.framebuffer==='aa'&&e.program===f.renderer.shellProgram.p));return {directDraws:f.events.length};
});

const report={schema:'transparent-photo-state-v1',enginePath,engineSHA256:sha(source),testSHA256:sha(fs.readFileSync(__filename)),passed:results.every(r=>r.pass),passedCount:results.filter(r=>r.pass).length,totalCount:results.length,results,limits:'Production CPU renderer and WebGL-call boundary only; no shader pixel, foreground-appearance, GPU performance or physical-phone claim.'};
if(option('--out')){const out=path.resolve(option('--out'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(`${report.passedCount}/${report.totalCount} transparent photo state checks passed`);if(!report.passed)process.exitCode=1;
