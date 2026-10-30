/* QA shape comparison in the actual streamed world; root schedules native GPU.
 * Only turtle-002 changes geometry. Its five shared-batch neighbours retain
 * their original buffers, actor objects and order. This is not an atlas test,
 * an animation acceptance test, a benchmark, or physical-phone evidence. */
'use strict';

const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),qa='qa/parity/v01850-turtle-original';
const option=(key,fallback)=>{const prefix='--'+key+'=',arg=process.argv.find(v=>v.startsWith(prefix));return arg?arg.slice(prefix.length):fallback;};
const profile=option('profile','desktop'),output=path.resolve(option('out',qa+'/visual-'+profile+'/report.json'));
assert(['desktop','touch'].includes(profile),'Run one desktop or touch profile at a time');
assert(output.endsWith('.json'),'--out must name a JSON report');
const baseURL=new URL(option('url','http://127.0.0.1:8765/'));
assert(baseURL.pathname.endsWith('/'),'--url must end in /');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file));
const identity=file=>{const bytes=read(file);return {bytes:bytes.length,sha256:sha(bytes)};};
const extract=source=>{const start=source.indexOf('function turtleGeometry('),end=source.indexOf('// A closed, cambered eagle-ray body:',start);assert(start>=0&&end>start,'Turtle function boundary changed');return source.slice(start,end).trim();};

function preflight(){
 const seal=JSON.parse(read(qa+'/FILES.json'));
 for(const name of ['world-baseline.js','world-candidate.js','candidate-receipt.json']){
  const expected=seal.files.find(f=>f.file===name);assert(expected,'Missing sealed '+name);
  assert.deepEqual(identity(qa+'/'+name),{bytes:expected.bytes,sha256:expected.sha256},'QA candidate seal differs: '+name);
 }
 const baseline=read('src/world.js').toString(),candidate=read(qa+'/world-candidate.js').toString();
 assert.equal(baseline,read(qa+'/world-baseline.js').toString(),'Current world differs from the saved geometry/old-material baseline; do not silently test a new integration');
 const candidateFunction=extract(candidate),baselineFunction=extract(baseline);
 assert.equal(candidate.replace(candidateFunction,''),baseline.replace(baselineFunction,''),'Candidate changes more than turtleGeometry');
 assert.notEqual(candidateFunction,baselineFunction,'Candidate is identical to baseline');
 const cpu=vm.createContext({console});
 for(const file of ['src/engine.js','src/world.js','src/next_reef.js'])vm.runInContext(read(file).toString(),cpu,{filename:file});
 vm.runInContext('this.qaCandidate=('+candidateFunction+');',cpu);
 const before=vm.runInContext('seed',cpu),generated=vm.runInContext(`['baseline','candidate'].map(variant=>({variant,lods:[false,true].map(low=>{
  const g=variant==='baseline'?turtleGeometry(low):qaCandidate(low),m=indexGeometry(g.v);
  return {low,material:g.material,vertices:m.vertices,indices:m.indices,radius:m.radius};
 })}))`,cpu);
 assert.equal(vm.runInContext('seed',cpu),before,'Geometry consumes population RNG');
 const variants=generated.map(v=>({variant:v.variant,lods:v.lods.map(m=>{
  assert(m.vertices.every(Number.isFinite)&&m.indices.every(i=>i<m.vertices.length/12));
  assert.equal(m.material,5);assert.equal(m.indices.length%3,0);
  return {lod:m.low?'low':'high',vertices:m.vertices.length/12,triangles:m.indices.length/3,radius:m.radius,
   vertexSHA256:sha(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)),
   uint32IndexSHA256:sha(Buffer.from(m.indices.buffer,m.indices.byteOffset,m.indices.byteLength))};
 })}));
 for(let i=0;i<2;i++){
  assert(variants[1].lods[i].triangles<=variants[0].lods[i].triangles,'Candidate exceeds the sampling budget');
  assert(variants[1].lods[i].vertices<=variants[0].lods[i].vertices,'Candidate exceeds the indexed-vertex budget');
 }
 const index=JSON.parse(read('assets/scene/index.json')),node=index.nodes.findIndex(n=>n.uid==='turtle-002');
 assert(node>=0);const batches=index.batches.map((b,id)=>({...b,id})).filter(b=>b.kind===2&&b.instanceIDs.includes(node));
 assert.equal(batches.length,2);assert.deepEqual(batches.map(b=>b.minDistance||0).sort((a,b)=>a-b),[0,14]);
 const geometry=batches.map(b=>{
  const mesh=index.meshes[b.meshID],chunk=index.chunks[mesh.chunk],compressed=read('assets/scene/'+chunk.url);
  assert.equal(sha(compressed),chunk.sha256);const bytes=zlib.gunzipSync(compressed);
  const vertices=bytes.subarray(mesh.vertexOffset,mesh.vertexOffset+mesh.vertexFloats*4),raw=bytes.subarray(mesh.indexOffset,mesh.indexOffset+mesh.indexCount*4);
  const indices=new Uint32Array(raw.buffer,raw.byteOffset,mesh.indexCount),uses16=Array.from(indices).every(i=>i<=65535),gpu=uses16?new Uint16Array(indices):indices;
  const expected=variants[0].lods[b.minDistance?1:0];assert.equal(sha(vertices),expected.vertexSHA256);assert.equal(sha(raw),expected.uint32IndexSHA256);
  return {batch:b.id,mesh:b.meshID,lod:b.minDistance?'low':'high',radius:b.radius,vertexCount:mesh.vertexFloats/12,indexCount:mesh.indexCount,
   instanceIDs:b.instanceIDs,targetOffset:b.instanceIDs.indexOf(node),chunk:'assets/scene/'+chunk.url,
   vertexSHA256:sha(vertices),elementSHA256:sha(Buffer.from(gpu.buffer,gpu.byteOffset,gpu.byteLength)),indexBytes:gpu.BYTES_PER_ELEMENT};
 });
 const html=read('index.html').toString(),scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1].split('?')[0]).filter(p=>p.startsWith('src/'));
 const textures=['sand_diff','sand_nor_gl','rock_diff','rock_nor_gl','shell_diff','turtle_skin_v45','coral_diff','coral_nor_gl','caustics'].map(n=>'assets/'+n+'.jpg');
 const servedPaths=[...new Set(['index.html','assets/scene/index.json',...scripts,...textures,...geometry.map(g=>g.chunk)])];
 const sourcePaths=[...servedPaths,'VERSION',qa+'/world-candidate.js',qa+'/world-baseline.js',qa+'/candidate-receipt.json',qa+'/FILES.json','tests/parity/turtle-shape-candidate-browser.cjs'];
 return {candidateFunction,servedPaths,sourceIdentity:Object.fromEntries(sourcePaths.map(file=>[file,identity(file)])),variants,
  witness:{node,uid:'turtle-002',geometry,sourceArchiveSHA256:index.sourceArchiveSHA256,
   metadataSHA256:sha(JSON.stringify([index.meshes,index.batches,index.rockContact,index.sourceArchiveSHA256]))}};
}

const fixtures=[
 {id:'oblique',offset:[3.3,1.6,3.6],fov:44,time:6},
 {id:'underside',offset:[2.5,-2,3.1],fov:44,time:6},
 {id:'front',offset:[4.5,.2,.15],fov:44,time:6},
 {id:'side',offset:[.2,.25,4.5],fov:44,time:6},
 {id:'dorsal',offset:[.6,4.1,.5],fov:44,time:6},
 {id:'stroke-raised',offset:[3.3,1.6,3.6],fov:44,time:7.7},
 {id:'far-oblique',offset:[12,6,13],fov:12,time:6},
 {id:'ordinary-camera',offset:[3.3,1.6,3.6],time:6,ordinary:true}
];
const report={status:'not-started',profile,views:[],errors:[],sourceResponses:[],fixtures,
 method:'Actual streamed turtle-002, original kind 2 rig and material 5, current old textures. Seven existing anatomy cameras plus one fixed oblique camera with normal game FOV/near plane. One production context, adaptive quality recorded then frozen. Original shared batches are split in original actor order only for the controls/candidate; neighbours reuse original VB/EB and all actors remain installed. Full-batch baseline -> split-baseline control -> target-only candidate -> original-restored. Both split control and restored RGBA must exactly equal baseline. Candidate culling uses the original conservative radius. No renderer method, shader, texture, light or animation replacement. Extra split draws are QA instrumentation, not a performance claim. Native Chrome required; touch is computer emulation. Geometry plus old material only; silhouette acceptance requires human review, and full-cycle rig/new atlas acceptance remains pending.'};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');};

async function install({candidateFunction,witness,variants}){
 const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
 if(!hardware||/software|swiftshader|llvmpipe|softpipe/i.test(hardware))throw Error('Native hardware GPU required: '+hardware);
 if(!window.__freeze)throw Error('Still entry did not freeze simulation');await renderer.loaded;
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),v=>v.toString(16).padStart(2,'0')).join('');
 const stream=renderer.sceneStream,ix=stream?.index,actor=life.find(f=>f.uid===witness.uid);
 if(!ix||actor!==ix.nodes[witness.node]||await hash(JSON.stringify([ix.meshes,ix.batches,ix.rockContact,ix.sourceArchiveSHA256]))!==witness.metadataSHA256)throw Error('Actual compiled target/world identity differs');
 const sourceBatches=renderer.batches.filter(b=>b.instances.includes(actor));
 if(sourceBatches.length!==2||sourceBatches.some(b=>b.kind!==2||!b.dynamic||b.material!==5||!b.vao||!stream.meshes[b.streamMesh]?.pinned))throw Error('Expected two resident pinned turtle batches');
 const methods=Object.getOwnPropertyNames(Renderer.prototype).filter(k=>k!=='constructor'&&typeof Renderer.prototype[k]==='function');
 if(methods.some(k=>Object.hasOwn(renderer,k)||renderer[k]!==Renderer.prototype[k]))throw Error('Renderer method override present');
 const originalArray=renderer.batches,originalOrder=originalArray.slice(),ownedBatches=[],ownedMeshes=[],borrowedMeshes=[],releasedGeometry=[],pairs=[];
 const textureArray=renderer.textures,textures=textureArray.slice(),surfacePrograms=new Map(renderer.surfacePrograms);
 const programs=Object.keys(renderer).filter(k=>renderer[k]?.p&&g.isProgram(renderer[k].p)).map(k=>[k,renderer[k]]);
 const saved={adaptive:settings.adaptive,active,freeze:window.__freeze,photoFov:renderer.photoFov,photoNear:renderer.photoNear,
  welcome:document.getElementById('welcome').className,hud:document.getElementById('hud').className};
 const initial={hardware,version:document.documentElement.dataset.version,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,
  compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,textureFull:renderer.textureFull,uid:actor.uid,
  fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),photoFov:renderer.photoFov??null,near:renderer.photoNear??null,
  actorScale:actor.s.slice(),optionalImportedFish:oceanBarramundi.status(renderer)};
 if(initial.photoFov!==null||initial.near!==null||initial.optionalImportedFish.state!=='idle')throw Error('Fresh default optics and idle optional fish required');
 const objectIDs=new WeakMap();let nextID=1;const id=value=>{if(!value)return null;if(!objectIDs.has(value))objectIDs.set(value,nextID++);return objectIDs.get(value);};
 const bufferRead=(buffer,Type,length)=>{const old=g.getParameter(g.COPY_READ_BUFFER_BINDING),data=new Type(length);try{g.bindBuffer(g.COPY_READ_BUFFER,buffer);g.getBufferSubData(g.COPY_READ_BUFFER,0,data);}finally{g.bindBuffer(g.COPY_READ_BUFFER,old);}return data;};
 const bufferRecord=async b=>({vao:id(b.vao),vb:id(b.vb),eb:id(b.eb),ib:id(b.ib),vertexCount:b.vertexCount,indexCount:b.count,
  vertexSHA256:await hash(bufferRead(b.vb,Float32Array,b.vertexCount*12)),elementSHA256:await hash(bufferRead(b.eb,b.indexType===g.UNSIGNED_SHORT?Uint16Array:Uint32Array,b.count))});
 const pointers=b=>[id(b),id(b.vao),id(b.vb),id(b.eb),id(b.ib),id(b.instances),...b.instances.map(id)];
 const originals=sourceBatches.map(b=>({batch:b,pointers:JSON.stringify(pointers(b)),instances:b.instances.slice()}));
 const restore=()=>{originalArray.splice(0,originalArray.length,...originalOrder);renderer.batches=originalArray;};
 const originalPointersMatch=()=>renderer.batches===originalArray&&renderer.batches.length===originalOrder.length&&renderer.batches.every((b,i)=>b===originalOrder[i])&&originals.every(o=>JSON.stringify(pointers(o.batch))===o.pointers&&o.instances.every((a,i)=>o.batch.instances[i]===a));
 const texturesMatch=()=>renderer.textures===textureArray&&textures.length===textureArray.length&&textures.every((t,i)=>textureArray[i]===t&&g.isTexture(t));
 const programsMatch=()=>programs.every(([k,p])=>renderer[k]===p)&&renderer.surfacePrograms.size===surfacePrograms.size&&[...surfacePrograms].every(([k,p])=>renderer.surfacePrograms.get(k)===p)&&methods.every(k=>!Object.hasOwn(renderer,k)&&renderer[k]===Renderer.prototype[k]);
 const cleanup=()=>{
  restore();g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,null);g.bindBuffer(g.COPY_READ_BUFFER,null);
  for(const b of ownedBatches){g.deleteVertexArray(b.vao);g.deleteBuffer(b.ib);}
  for(const mesh of ownedMeshes){const storage=renderer.meshBuffers.get(mesh);if(storage){releasedGeometry.push(storage);g.deleteBuffer(storage.vb);g.deleteBuffer(storage.eb);}renderer.meshBuffers.delete(mesh);}
  for(const mesh of borrowedMeshes)renderer.meshBuffers.delete(mesh);
  const state={originalPointersRestored:originalPointersMatch(),originalBuffersAlive:sourceBatches.every(b=>g.isBuffer(b.vb)&&g.isBuffer(b.eb)&&g.isBuffer(b.ib)&&g.isVertexArray(b.vao)),
   addedVAOsAndInstanceBuffersDeleted:ownedBatches.every(b=>!g.isVertexArray(b.vao)&&!g.isBuffer(b.ib)),
   candidateGeometryBuffersDeleted:releasedGeometry.every(storage=>!g.isBuffer(storage.vb)&&!g.isBuffer(storage.eb)),
   texturesUnchanged:texturesMatch(),programsAndMethodsUnchanged:programsMatch(),ownedBatchCount:ownedBatches.length,ownedMeshCount:ownedMeshes.length,gl:g.getError(),contextLost:g.isContextLost()};
  settings.adaptive=saved.adaptive;active=saved.active;window.__freeze=saved.freeze;
  if(saved.photoFov===undefined)delete renderer.photoFov;else renderer.photoFov=saved.photoFov;
  if(saved.photoNear===undefined)delete renderer.photoNear;else renderer.photoNear=saved.photoNear;
  document.getElementById('welcome').className=saved.welcome;document.getElementById('hud').className=saved.hud;return state;
 };
 window.__turtleShape={actor,stream,initial,pairs,originalOrder,originalArray,restore,originalPointersMatch,cleanup,hash,id,pointers,bufferRead,bufferRecord,texturesMatch,programsMatch,
  textureIDs:textures.map(id),programIDs:[...programs,...[...surfacePrograms].map(([k,p])=>['surface:'+k,p])].map(([name,p])=>({name,id:id(p.p)}))};
 try{
  settings.adaptive=false;active=false;document.getElementById('welcome').classList.add('hidden');document.getElementById('hud').classList.add('hidden');
  const candidateFactory=eval('('+candidateFunction+')'),seedBefore=seed;
  const generated=[false,true].map(low=>({baseline:indexGeometry(turtleGeometry(low).v),candidate:indexGeometry(candidateFactory(low).v)}));
  if(seed!==seedBefore)throw Error('Shape generation changes population RNG');
  const create=(source,mesh,instances)=>{
   const b=renderer.batch({indexed:mesh,material:source.material,species:source.species,shadow:source.shadow},instances,source.kind,source.dynamic);ownedBatches.push(b);
   if(renderer.batches.pop()!==b)throw Error('Unexpected batch insertion order');
   for(const key of ['visible','minDistance','maxDistance','shadowProxy','sceneRole'])if(source[key]!==undefined)b[key]=source[key];
   // Geometry comparison retains the old conservative culling/contact floor;
   // this harness does not install a new collision or animation-bound policy.
   b.radius=source.radius;return b;
  };
  for(const source of sourceBatches){
   const low=!!source.minDistance,expected=witness.geometry.find(m=>m.lod===(low?'low':'high')),record=await bufferRecord(source);
   if(!expected||record.vertexSHA256!==expected.vertexSHA256||record.elementSHA256!==expected.elementSHA256)throw Error('Actual uploaded geometry differs from the compiled witness');
   const original={vertices:bufferRead(source.vb,Float32Array,source.vertexCount*12),indices:bufferRead(source.eb,source.indexType===g.UNSIGNED_SHORT?Uint16Array:Uint32Array,source.count),radius:source.radius};
   const current=generated[low?1:0].baseline,candidate=generated[low?1:0].candidate;let maxError=0;
   if(current.vertices.length!==original.vertices.length||current.indices.length!==original.indices.length)throw Error('Authored/compiled baseline counts differ');
   for(let k=0;k<original.vertices.length;k++)maxError=Math.max(maxError,Math.abs(original.vertices[k]-current.vertices[k]));
   if(maxError>1e-6||!Number.isFinite(maxError)||original.indices.some((v,i)=>v!==current.indices[i]))throw Error('Authored/compiled baseline differs beyond trig tolerance');
   const spec=variants[1].lods[low?1:0];if(candidate.vertices.length/12!==spec.vertices||candidate.indices.length/3!==spec.triangles)throw Error('Candidate CPU/browser topology differs');
   // Borrow the actual immutable geometry storage; only VAOs/instance buffers
   // belong to these baseline/neighbor clones. Cleanup must not delete it.
   renderer.meshBuffers.set(original,{vb:source.vb,eb:source.eb,indexType:source.indexType});borrowedMeshes.push(original);ownedMeshes.push(candidate);
   const position=source.instances.indexOf(actor),before=source.instances.slice(0,position),after=source.instances.slice(position+1);
   if(position!==expected.targetOffset||source.instances.some((a,i)=>a!==ix.nodes[expected.instanceIDs[i]]))throw Error('Shared-batch actor order differs');
   const prefix=before.length?create(source,original,before):null,baseline=create(source,original,[actor]),suffix=after.length?create(source,original,after):null,target=create(source,candidate,[actor]);
   const uploaded=await bufferRecord(target),expectedVertex=await hash(candidate.vertices),gpuIndices=meshIndexData(candidate.indices),expectedElement=await hash(gpuIndices);
   if(uploaded.vertexSHA256!==expectedVertex||uploaded.elementSHA256!==expectedElement)throw Error('Candidate upload not byte-exact');
   pairs.push({source,baseline,candidate:target,prefix,suffix,mesh:candidate,lod:low?'low':'high',record:{lod:low?'low':'high',source:record,candidate:uploaded,
    authoredBaselineMaxError:maxError,authoredVertexTolerance:1e-6,candidateRadius:candidate.radius,retainedCullRadius:source.radius,
    instances:source.instances.map(a=>a.uid),targetOffset:position,baselineTargetPointers:pointers(baseline),neighborPointers:[prefix,suffix].filter(Boolean).map(pointers),candidateExpectedVertexSHA256:expectedVertex,candidateExpectedElementSHA256:expectedElement}});
  }
  if(!originalPointersMatch()||g.getError())throw Error('Preparation changed original batches or raised GL error');
  return {...initial,geometry:pairs.map(p=>p.record),textureIDs:window.__turtleShape.textureIDs,programIDs:window.__turtleShape.programIDs};
 }catch(error){window.__turtleShape.preparationCleanup=cleanup();throw error;}
}

async function inspectView(config){
 const f=window.__turtleShape,g=renderer.gl,result={id:config.id,valid:false,images:[]};let fixed,world,actors,streamFixed,nonTarget,instancePayloads;
 const raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Foreground frame timed out')),10000);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
 const population=()=>JSON.stringify([...allLife,...shoal].map(a=>({uid:a.uid,species:a.species,p:a.p,s:a.s,yaw:a.yaw,pitch:a.pitch,phase:a.phase,
  tint:a.tint,bioMorph:a.bioMorph,bioGenes:a.bioGenes,bank:a.bank,effort:a.effort,finWear:a.finWear,partnerFinPulse:a.partnerFinPulse,
  faunaVisibility:a.faunaVisibility,retreat:a.retreat,cetaceanBeat:a.cetaceanBeat,abyssBeat:a.abyssBeat,trenchBeat:a.trenchBeat,home:a.home,ecologyPresent:a.ecologyPresent})));
 const immutable=()=>JSON.stringify([f.stream.index.meshes,f.stream.index.batches,f.stream.index.rockContact,f.stream.index.sourceArchiveSHA256,OceanTrench.solids]);
 const state=()=>{const {required,preload,keep}=f.stream.neededRanges(result.eye);return {resident:f.stream.meshes.filter(m=>m.resident).map(m=>m.id),
  missing:[...required].filter(id=>!f.stream.meshes[id].resident),preloadMissing:[...preload].filter(id=>!f.stream.meshes[id].resident),
  outside:f.stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id),jobs:f.stream.jobs.size,queued:f.stream.queue.length,active:f.stream.active,
  shadowUpdates:renderer.staticShadowUpdates||0,forceShadow:!!renderer.forceShadow,shadowDirty:!!renderer._shadowMapDirty};};
 const conditions=()=>({eye:result.eye,aim:result.aim,time:config.time,fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),photoFov:renderer.photoFov??null,near:renderer.photoNear??null,
  exposure:renderer.exposure,clarity:renderer.clarity,lamp:renderer.lamp,lighting:renderer.lighting,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,
  textureFull:renderer.textureFull,freeze:window.__freeze,active,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],msaa:renderer.msaaSamples,volume:[renderer.volumeW,renderer.volumeH],
  player:{p:player.p,yaw:player.yaw,pitch:player.pitch,velocity:player.velocity},clock:{day:oceanFeatures.state('expedition').day,minute:oceanFeatures.state('expedition').minute},optionalImportedFish:oceanBarramundi.status(renderer)});
 const draw=()=>{const frame=renderer.frame,complete=renderer.render(result.eye,result.aim,config.time);if(complete===false)return false;if(renderer.frame!==frame+1)throw Error('Production frame incomplete');return true;};
 const chunks=(p,arm)=>arm==='candidate'?[p.prefix,p.candidate,p.suffix].filter(Boolean):[p.prefix,p.baseline,p.suffix].filter(Boolean);
 const apply=arm=>{
  f.restore();if(arm==='baseline'||arm==='restored')return;
  const replacement=f.originalOrder.flatMap(b=>{const p=f.pairs.find(p=>p.source===b);return p?chunks(p,arm):[b];});
  f.originalArray.splice(0,f.originalArray.length,...replacement);
 };
 const packed=list=>Array.from(list.flatMap(b=>Array.from(b.data.subarray(0,b.drawCount*24))));
 const originalSources=new Set(f.pairs.map(p=>p.source));
 const otherBatches=()=>f.originalOrder.filter(b=>!originalSources.has(b)).map(b=>({pointers:f.pointers(b),visible:b.visible,drawCount:b.drawCount,count:b.count,material:b.material,kind:b.kind,radius:b.radius}));
 const targets=arm=>f.pairs.map(p=>{
  const split=arm==='candidate'||arm==='split-baseline',draws=split?chunks(p,arm):[p.source],target=split?(arm==='candidate'?p.candidate:p.baseline):p.source;
  const expected=f.actor.p.map((v,k)=>Math.fround(v-(renderer.renderOrigin||[0,0,0])[k]));
  let submitted=false;for(let i=0;i<target.drawCount;i++)if(expected.every((v,k)=>target.data[i*24+k]===v)&&target.data[i*24+3]===Math.fround(f.actor.yaw))submitted=true;
  return {lod:p.lod,drawCounts:draws.map(b=>b.drawCount),targetSubmitted:submitted,targetPointers:f.pointers(target),targetVertices:target.vertexCount,targetIndices:target.count};
 });
 const validate=arm=>{
  const split=arm==='candidate'||arm==='split-baseline',expectedOrder=f.originalOrder.flatMap(b=>{const p=f.pairs.find(p=>p.source===b);return split&&p?chunks(p,arm):[b];});
  const checks={conditionsFixed:JSON.stringify(conditions())===fixed,actorsFixed:population()===actors,worldFixed:immutable()===world,streamFixed:JSON.stringify(state())===streamFixed,
   otherBatchResourcesAndDrawsFixed:JSON.stringify(otherBatches())===nonTarget,programsAndMethodsFixed:f.programsMatch(),texturesFixed:f.texturesMatch(),
   batchOrderExact:renderer.batches===f.originalArray&&renderer.batches.length===expectedOrder.length&&renderer.batches.every((b,i)=>b===expectedOrder[i]),
   originalPairPointersFixed:f.pairs.every(p=>p.source.vb!==p.candidate.vb&&p.baseline.vb===p.source.vb&&p.baseline.eb===p.source.eb),
   sharedInstancePayloadsExact:f.pairs.every((p,i)=>JSON.stringify(packed(split?chunks(p,arm):[p.source]))===instancePayloads[i]),
   targetSubmitted:targets(arm).some(t=>t.targetSubmitted),foreground:!document.hidden&&document.hasFocus(),contextAlive:!g.isContextLost(),noResize:!renderer.pendingResize};
  if(!Object.values(checks).every(Boolean))throw Error('Comparison invariant failed: '+JSON.stringify(checks));return checks;
 };
 try{
  f.restore();updateLife(config.time);
  if(config.ordinary){delete renderer.photoFov;delete renderer.photoNear;}else{renderer.photoFov=config.fov;renderer.photoNear=.08;}
  const s=Math.sin(f.actor.yaw),c=Math.cos(f.actor.yaw),d=config.offset;
  result.eye=[f.actor.p[0]+c*d[0]+s*d[2],f.actor.p[1]+d[1],f.actor.p[2]-s*d[0]+c*d[2]];result.aim=f.actor.p.slice();
  result.actor={uid:f.actor.uid,p:f.actor.p.slice(),yaw:f.actor.yaw,pitch:f.actor.pitch,s:f.actor.s.slice(),phase:f.actor.phase};
  result.cameraInRock=OceanRockContact.overlaps(result.eye,config.ordinary?.16:.08);if(result.cameraInRock)throw Error('Fixed inspection camera is inside rock; no substitute chosen');
  await f.stream.ready(result.eye);const deadline=performance.now()+30000;let stable=0,previous='';
  while(stable<3){await raf();const complete=draw(),current=state(),signature=JSON.stringify([current,renderer.drawCalls,renderer.shadowDraws,renderer.submittedTriangles]);
   const settled=complete&&!current.missing.length&&!current.preloadMissing.length&&!current.outside.length&&!current.jobs&&!current.queued&&!current.active&&!renderer.pendingResize&&!current.forceShadow&&!current.shadowDirty;
   stable=settled?(signature===previous?stable+1:1):0;previous=signature;if(g.getError())throw Error('Settling GL error');if(performance.now()>deadline)throw Error('Scene did not settle');
  }
  fixed=JSON.stringify(conditions());world=immutable();actors=population();streamFixed=JSON.stringify(state());nonTarget=JSON.stringify(otherBatches());
  instancePayloads=f.pairs.map(p=>JSON.stringify(packed([p.source])));
  result.conditions=JSON.parse(fixed);result.stream=JSON.parse(streamFixed);result.actorSHA256=await f.hash(actors);result.worldSHA256=await f.hash(world);result.nonTargetBatchSHA256=await f.hash(nonTarget);
  result.sharedInstancePayloadSHA256=await Promise.all(instancePayloads.map(f.hash));
  for(const arm of ['baseline','split-baseline','candidate','restored']){
   apply(arm);for(let i=0;i<3;i++){await raf();if(!draw())throw Error('Production frame deferred');}
   validate(arm);if(!draw())throw Error('Capture frame deferred');const checks=validate(arm),width=g.drawingBufferWidth,height=g.drawingBufferHeight,pixels=new Uint8Array(width*height*4);
   // Both framebuffer readbacks are synchronous in this task. Do not await a
   // hash, animation frame or screenshot after render and before these calls.
   g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,pixels);const png=renderer.canvas.toDataURL('image/png'),gl=g.getError();
   let maxRGB=0,nonzeroPixels=0;for(let i=0;i<pixels.length;i+=4){maxRGB=Math.max(maxRGB,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzeroPixels++;}
   if(gl||maxRGB<=30||nonzeroPixels<=200)throw Error('Empty/dark/invalid capture');
   const row={arm,width,height,png,rgbaSHA256:await f.hash(pixels),maxRGB,nonzeroPixels,gl,checks,targets:targets(arm),frame:renderer.frame,
    workload:{draws:renderer.drawCalls,shadowDraws:renderer.shadowDraws,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices},
    geometry:await Promise.all(f.pairs.map(async p=>({lod:p.lod,original:await f.bufferRecord(p.source),target:await f.bufferRecord(arm==='candidate'?p.candidate:arm==='split-baseline'?p.baseline:p.source)})))};
   result.images.push(row);validate(arm);
   for(let i=0;i<f.pairs.length;i++){
    const p=f.pairs[i],expected=p.record.source,actual=row.geometry[i].original,chosen=arm==='candidate'?p.record.candidate:expected;
    if(JSON.stringify(actual)!==JSON.stringify(expected)||row.geometry[i].target.vertexSHA256!==chosen.vertexSHA256||row.geometry[i].target.elementSHA256!==chosen.elementSHA256)throw Error('Original/candidate buffer identity drift');
   }
   if(arm==='split-baseline'){
    result.splitBaselinePixelsMatch=result.images[0].rgbaSHA256===row.rgbaSHA256;
    if(!result.splitBaselinePixelsMatch)throw Error('Splitting the original shared batches changes pixels; candidate comparison is invalid');
   }
  }
  result.restoredPixelsMatch=result.images[0].rgbaSHA256===result.images[3].rgbaSHA256;
  result.candidatePixelsDiffer=result.images[0].rgbaSHA256!==result.images[2].rgbaSHA256;
  if(!result.restoredPixelsMatch)throw Error('Original framebuffer was not restored byte-exactly');
  if(!result.candidatePixelsDiffer)throw Error('Candidate has no observable pixel change in this fixed view');
  result.valid=true;
 }catch(error){result.failure=error.stack||error.message;}
 finally{f.restore();result.originalPointersRestored=f.originalPointersMatch();result.finalGL=g.getError();}
 return result;
}

async function main(){
 let browser,page,context;const jobs=[];
 try{
  const inputs=preflight();report.sourceIdentity=inputs.sourceIdentity;report.cpuVariants=inputs.variants;report.witness=inputs.witness;
  if(process.argv.includes('--preflight')){report.status='passed-cpu-preflight-only';save();console.log('PASS CPU preflight only; no browser/GPU/build: '+output);return;}
  report.status='running';save();const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});report.browserVersion=browser.version();const touch=profile==='touch';
  context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('response',response=>{
   const url=new URL(response.url());if(url.origin!==baseURL.origin||!url.pathname.startsWith(baseURL.pathname))return;
   let file=decodeURIComponent(url.pathname.slice(baseURL.pathname.length));if(!file)file='index.html';if(!inputs.servedPaths.includes(file))return;
   jobs.push((async()=>{const bytes=await response.body(),record={path:file,status:response.status(),bytes:bytes.length,sha256:sha(bytes)};report.sourceResponses.push(record);
    assert.equal(record.status,200,'Unexpected HTTP status: '+file);assert.deepEqual({bytes:record.bytes,sha256:record.sha256},inputs.sourceIdentity[file],'Served source differs: '+file);
   })().catch(error=>report.errors.push(error.message)));
  });
  await page.bringToFront();const url=new URL(baseURL);url.searchParams.set('still','');await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.initial=await page.evaluate(install,{candidateFunction:inputs.candidateFunction,witness:inputs.witness,variants:inputs.variants});
  assert(report.initial.compiled&&report.initial.streamed&&report.initial.adaptive);assert.equal(report.initial.quality,touch?1:2);assert.equal(report.initial.scale,1);
  for(const original of fixtures){
   await page.bringToFront();const config={...original,...(!original.ordinary&&touch?{fov:original.id==='far-oblique'?24:84}:{})};
   const result=await page.evaluate(inspectView,config);
   for(const image of result.images){const bytes=Buffer.from(image.png.split(',')[1],'base64');delete image.png;image.file=path.join(path.dirname(output),profile+'-'+result.id+'-'+image.arm+'.png');image.pngSHA256=sha(bytes);fs.writeFileSync(image.file,bytes);}
   result.splitBaselinePNGBytesMatch=result.images.length>=2&&result.images[0].pngSHA256===result.images[1].pngSHA256;
   result.restoredPNGBytesMatch=result.images.length===4&&result.images[0].pngSHA256===result.images[3].pngSHA256;
   report.views.push(result);await Promise.all(jobs);save();assert(result.valid&&result.originalPointersRestored&&!result.finalGL,'Invalid view; retained receipt: '+result.id);assert.deepEqual(report.errors,[]);
   assert(result.splitBaselinePNGBytesMatch&&result.restoredPNGBytesMatch,'PNG bytes differ despite the RGBA control; retained receipt: '+result.id);
   console.log('PASS '+profile+' '+result.id+' split-control and restored RGBA byte-exact');
  }
  await Promise.all(jobs);for(const file of inputs.servedPaths)assert(report.sourceResponses.some(r=>r.path===file),'Missing actual response: '+file);
  for(const [file,expected]of Object.entries(inputs.sourceIdentity))assert.deepEqual(identity(file),expected,'Local input changed during comparison: '+file);
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-invariants-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack||error.message;process.exitCode=1;console.error(error);}
 finally{
  if(page)try{report.cleanup=await page.evaluate(()=>window.__turtleShape?.cleanup()||{notInitialized:true});
   if(!report.cleanup.notInitialized)assert(report.cleanup.originalPointersRestored&&report.cleanup.originalBuffersAlive&&report.cleanup.addedVAOsAndInstanceBuffersDeleted&&report.cleanup.candidateGeometryBuffersDeleted&&report.cleanup.texturesUnchanged&&report.cleanup.programsAndMethodsUnchanged&&!report.cleanup.gl&&!report.cleanup.contextLost,'QA resource cleanup failed');
  }catch(error){report.status='failed';report.errors.push('Cleanup: '+error.message);process.exitCode=1;}
  await context?.close();await browser?.close();await Promise.all(jobs);save();
 }
}
main();
