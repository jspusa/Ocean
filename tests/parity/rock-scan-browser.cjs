/* Visual-only comparison of two rock texture pairs in the actual compiled world.
 * Root owns native-GPU scheduling. Do not run during another GPU experiment.
 * No shader, geometry, collision, actor, renderer method, or render-pass swap.
 * Desktop touch emulation is not physical-phone or performance evidence. */
'use strict';

const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(name,fallback)=>{
 const prefix='--'+name+'=',inline=process.argv.find(v=>v.startsWith(prefix)),i=process.argv.indexOf('--'+name);
 return inline?inline.slice(prefix.length):i>=0?process.argv[i+1]:fallback;
};
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const profileOption=option('profile','both'),profiles=profileOption==='both'?['desktop','touch']:[profileOption];
assert(profiles.every(p=>['desktop','touch'].includes(p)),'Choose desktop, touch or both');
const output=path.resolve(option('out','qa/parity/v01847-rock/visual/report.json'));
const baseURL=new URL(option('url','http://127.0.0.1:8765/'));
assert(baseURL.pathname.endsWith('/'),'--url must be a directory URL ending with /');
const requestedPairDirectory=option('pair-dir','qa/parity/v01847-rock/prepared');
assert(typeof requestedPairDirectory==='string'&&requestedPairDirectory.length,'--pair-dir requires a local QA directory');
const absolutePairDirectory=fs.realpathSync(path.resolve(root,requestedPairDirectory));
const qaRelative=path.relative(path.join(root,'qa'),absolutePairDirectory);
assert(qaRelative&&!qaRelative.startsWith('..'+path.sep)&&qaRelative!=='..'&&!path.isAbsolute(qaRelative),'--pair-dir must be inside this checkout\'s local qa/ tree so the preview server can serve the exact files');
const pairDirectory=path.relative(root,absolutePairDirectory).split(path.sep).join('/'),receiptPath=pairDirectory+'/receipt.json';
const receiptBytes=fs.readFileSync(path.join(root,receiptPath)),receipt=JSON.parse(receiptBytes);
const pairPaths=['assets/rock_diff.jpg','assets/rock_nor_gl.jpg'];
const candidatePaths=['rock_diff.jpg','rock_nor_gl.jpg'].map(name=>pairDirectory+'/'+name);
const candidateIdentity=candidatePaths.map((file,i)=>{
 const bytes=fs.readFileSync(path.join(root,file)),asset=receipt.assets[i];
 assert.equal(asset.role,i?'nor_gl':'Diffuse');
 assert.equal(sha(bytes),asset.candidate.sha256,'Prepared candidate differs from its receipt');
 assert.equal(bytes.length,asset.candidate.bytes);
 const dimensions=asset.candidate.dimensions;
 assert(Array.isArray(dimensions)&&dimensions.length===2&&dimensions.every(n=>Number.isInteger(n)&&n>0&&n<=2048),'Prepared dimensions must be positive integers no larger than 2048 in either axis');
 assert.equal(asset.candidate.encoding.subsampling,0);
 return {path:file,bytes:bytes.length,sha256:sha(bytes),receiptRole:asset.role,dimensions:dimensions.slice()};
});
assert.deepEqual(candidateIdentity[0].dimensions,candidateIdentity[1].dimensions,'Diffuse and normal must retain the same aligned width/height grid');

// Exact catalogue fixture and CPU contact proof from rock-material-browser.cjs.
const indexPath='assets/scene/index.json',indexBytes=fs.readFileSync(path.join(root,indexPath));
const index=JSON.parse(indexBytes),position=[-10.916091154348962,-11.506344136714409,1.1098294701659324];
const node=index.nodes.findIndex(n=>n.p?.every((v,k)=>v===position[k]));
assert(node>=0,'Actual compiled home rock pose is missing');
const actor=index.nodes[node];
const contactID=index.rockContact.instances.findIndex(n=>n.p.every((v,k)=>v===actor.p[k])&&n.s.every((v,k)=>v===actor.s[k])&&n.yaw===actor.yaw);
assert(contactID>=0,'Actual home rock contact instance is missing');
const contact=index.rockContact.instances[contactID],contactMesh=index.rockContact.meshes[contact.mesh];
const batches=index.batches.map((b,id)=>({...b,id})).filter(b=>b.kind===0&&b.material===2&&!b.shadowProxy&&b.instanceIDs.includes(node));
assert.equal(batches.length,2,'Home fixture must retain its two production LOD batches');
const high=batches.find(b=>!b.minDistance),radius=index.meshes[high.meshID].radius*Math.max(...actor.s);
const homeViews=['near','oblique','far','blue-lamp'].map(id=>{
 const direction=id==='oblique'||id==='blue-lamp'?[1,.42,.6]:[1,.24,1];
 const distance=id==='far'?35:radius*3.1;
 return {id:'home-'+id,group:'home',eye:actor.p.map((v,k)=>v+direction[k]/Math.hypot(...direction)*distance),
  aim:actor.p.slice(),radius,distance,lighting:id==='blue-lamp'?'blue':'day',lamp:id==='blue-lamp',far:id==='far'};
});
const cpu=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(root,'src/rock_contact.js'),'utf8')+'\nthis.api=OceanRockContact',cpu);
cpu.api.install(index.rockContact);
for(const scene of homeViews){
 assert(!cpu.api.overlaps(scene.eye,.2)&&scene.eye[1]<-.5,'Fixed home camera is not clear underwater');
 scene.firstRockHit=cpu.api.sweep(scene.eye,scene.aim,0);
}
cpu.api.install({...index.rockContact,instances:[contact]});
for(const scene of homeViews){
 const hit=cpu.api.sweep(scene.eye,scene.aim,0);
 assert(hit&&scene.firstRockHit&&Math.abs(hit.fraction-scene.firstRockHit.fraction)<1e-6,'Another rock obscures the fixed home target');
}
const geometry=batches.map(b=>{
 const mesh=index.meshes[b.meshID],chunk=index.chunks[mesh.chunk];
 const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/scene',chunk.url)));
 return {batch:b.id,mesh:b.meshID,minDistance:b.minDistance||0,maxDistance:b.maxDistance,
  vertexFloats:mesh.vertexFloats,indexCount:mesh.indexCount,chunk:chunk.url,chunkSHA256:chunk.sha256,
  geometrySHA256:sha(Buffer.concat([bytes.subarray(mesh.vertexOffset,mesh.vertexOffset+mesh.vertexFloats*4),
   bytes.subarray(mesh.indexOffset,mesh.indexOffset+mesh.indexCount*4)]))};
});
const witness={node,actor,contactID,contactMeshSHA256:sha(JSON.stringify(contactMesh)),geometry,
 indexSHA256:sha(indexBytes),sourceArchiveSHA256:index.sourceArchiveSHA256,
 immutableMetadataSHA256:sha(JSON.stringify([index.meshes,index.batches,index.rockContact,index.sourceArchiveSHA256]))};

// Unmodified fixture coordinates from trench-surface-browser.cjs, fixture v3.
const trenchViews=[
 {id:'hadal-wall',eye:[773.6,-7001.2,-142],aim:[768.8,-7001.2,-142]},
 {id:'cut-bottom',eye:[780,-7018.6,-145],aim:[769,-7018.6,-145]},
 {id:'slope-arrival',eye:[754,-1400,-103],aim:[763,-1402,-111]},
 {id:'slope-mud',eye:[765,-1400.65,-109],aim:[766,-1402,-112.5]}
].map(scene=>({...scene,group:'trench',lighting:'day',lamp:true}));
const fixtures=[...homeViews,...trenchViews],requested=option('scenes','').split(',').filter(Boolean);
assert(requested.every(id=>fixtures.some(s=>s.id===id)),'Unknown --scenes entry');
const scenes=fixtures.filter(s=>!requested.length||requested.includes(s.id));
const sourcePaths=[...new Set(['VERSION','index.html',indexPath,...pairPaths,...candidatePaths,receiptPath,
 ...[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
  .map(m=>m[1].split('?')[0]).filter(file=>file.startsWith('src/')),
 ...index.chunks.map(chunk=>'assets/scene/'+chunk.url)])];
const sourceIdentity=Object.fromEntries(sourcePaths.map(file=>{
 const data=fs.readFileSync(path.join(root,file));return [file,{bytes:data.length,sha256:sha(data)}];
}));
const report={status:'not-started',purpose:'visual-comparison-only',profiles:[],errors:[],fixtures:scenes,
 fixedTime:6,witness,sourceIdentity,candidateIdentity,pairDirectory,receiptSHA256:sha(receiptBytes),
 candidateCompressedByteBudget:receipt.compressed_bytes,
 method:'One actual production context per desktop/touch profile. Only renderer.textures[2] and [3] switch between loaded originals and the receipt-verified local QA pair. Existing textureFull/mobile size policy, RGBA8, repeat wrap, trilinear mip filters, anisotropy and unflipped normal convention are retained. Source dimensions may differ from production, so original and candidate GPU upload dimensions/mip chains are recorded separately: a 1536-square full upload stays 1536, while the existing non-full width>1024 policy produces 1024-square. A passive pre-boot observer forwards native texImage2D/generateMipmap calls unchanged and records actual upload-source dimensions plus their generated mip chain; it creates no GPU resource and changes no Renderer method. Dimensions describe successful upload calls, not a direct GL allocation-size query or measured memory. Default game FOV, near plane, exposure and clarity remain unchanged; time is 6. Actual home/contact and trench fixture locations are fixed. The full world stays installed. Frozen views settle streaming/shadows before each original/candidate/original-restored sequence. Native hardware Chrome only. Same-task full-frame capture is visual evidence; no timer queries, FPS, CPU cost, phone-hardware, battery or automatic realism acceptance. Original texture pointers and observed native methods are restored and added textures are deleted even after failure.'};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');};

async function main(){
 let browser;
 try{
  report.status='running';save();
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false});
  report.browserVersion=browser.version();
  for(const profile of profiles){
   const touch=profile==='touch',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},
    deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
   // Observe the original production uploads too, before any game code runs.
   // WebGL exposes sampler parameters but no texture-width query. Keep the
   // native calls/arguments and derive each mip chain from its real base upload.
   await page.addInitScript(()=>{
    const prototype=WebGL2RenderingContext.prototype,nativeImage=prototype.texImage2D,nativeMipmap=prototype.generateMipmap,records=new WeakMap();
    const snapshot=texture=>{const record=records.get(texture);return record?JSON.parse(JSON.stringify(record)):null;};
    const image=function(...args){
     const result=nativeImage.apply(this,args);
     if(args[0]===this.TEXTURE_2D){
      const texture=this.getParameter(this.TEXTURE_BINDING_2D),source=args.length===6?args[5]:null;
      const width=source?source.width:args[3],height=source?source.height:args[4],level=args[1];
      if(texture&&Number.isInteger(width)&&Number.isInteger(height)&&Number.isInteger(level)){
       const record=records.get(texture)||{uploads:0,mipmapCalls:0,levels:[]};record.uploads++;
       const value={level,width,height,internalFormat:args[2],origin:'texImage2D'};
       if(level===0){record.dimensions=[width,height];record.levels=[value];record.mipmapsGenerated=false;}else record.levels[level]=value;
       records.set(texture,record);
      }
     }return result;
    };
    const mipmap=function(...args){
     const result=nativeMipmap.apply(this,args);
     if(args[0]===this.TEXTURE_2D){const texture=this.getParameter(this.TEXTURE_BINDING_2D),record=records.get(texture);
      if(record?.dimensions){const [width,height]=record.dimensions;record.mipmapCalls++;record.mipmapsGenerated=true;
       record.levels=Array.from({length:Math.floor(Math.log2(Math.max(width,height)))+1},(_,level)=>({level,width:Math.max(1,Math.floor(width/2**level)),height:Math.max(1,Math.floor(height/2**level)),internalFormat:record.levels[0].internalFormat,origin:level?'generateMipmap':'texImage2D'}));
      }
     }return result;
    };
    prototype.texImage2D=image;prototype.generateMipmap=mipmap;
    window.__rockTextureUploads={snapshot,active:()=>prototype.texImage2D===image&&prototype.generateMipmap===mipmap,
     restore(){if(prototype.texImage2D===image)prototype.texImage2D=nativeImage;if(prototype.generateMipmap===mipmap)prototype.generateMipmap=nativeMipmap;return prototype.texImage2D===nativeImage&&prototype.generateMipmap===nativeMipmap;}};
   });
   const row={profile,status:'loading',sourceResponses:[],errors:[],views:[]},sourceJobs=[];
   report.profiles.push(row);save();
   page.on('pageerror',e=>row.errors.push(e.stack||e.message));
   page.on('crash',()=>row.errors.push('Renderer process crashed'));
   page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});
   page.on('response',response=>{
    const url=new URL(response.url());
    if(url.origin!==baseURL.origin||!url.pathname.startsWith(baseURL.pathname))return;
    const file=decodeURIComponent(url.pathname.slice(baseURL.pathname.length)),expected=sourceIdentity[file];
    if(!expected)return;
    sourceJobs.push(response.body().then(bytes=>{
     const observed={path:file,url:url.href,bytes:bytes.length,sha256:sha(bytes)};row.sourceResponses.push(observed);
     if(observed.bytes!==expected.bytes||observed.sha256!==expected.sha256)row.errors.push('Actual loaded source differs from checkout: '+file);
    }).catch(error=>row.errors.push('Response evidence failed: '+file+': '+error.message)));
   });
   const verifyResponses=async()=>{
    await Promise.all(sourceJobs);assert.deepEqual(row.errors,[]);
    for(const file of [indexPath,...sourcePaths.filter(file=>file.startsWith('src/')),...pairPaths,...candidatePaths])
     assert(row.sourceResponses.some(item=>item.path===file),'Missing actual response evidence: '+file);
   };
   try{
    await page.bringToFront();const url=new URL(baseURL);url.searchParams.set('still','');
    await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
    await page.bringToFront();
    row.initial=await page.evaluate(async({witness,candidateURLs,candidateDimensions})=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info');
     const hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
     if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Native hardware GPU required: '+hardware);
     if(!window.__freeze)throw Error('Still-view entry did not freeze the world');
     await renderer.loaded;
     const initial={hardware,version:document.documentElement.dataset.version,quality:renderer.quality,
      adaptive:settings.adaptive,scale:renderer.dynamicScale,textureFull:renderer.textureFull,mobile:renderer.mobile,
      compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,
      fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),photoFov:renderer.photoFov??null,
      near:renderer.photoNear??null,exposure:renderer.exposure,clarity:renderer.clarity,
      resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,
      optionalImportedFish:oceanBarramundi.status(renderer)};
     if(initial.photoFov!==null||initial.near!==null)throw Error('Fresh entry unexpectedly uses photo optics');
     if(initial.optionalImportedFish.state!=='idle')throw Error('Still entry must retain the optional imported fish idle; no explicit load is needed for this preview');
     if(renderer.textureFull!==(!renderer.mobile||renderer.quality===2))throw Error('Unexpected original texture resolution policy');
     settings.adaptive=false;active=false;
     const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),v=>v.toString(16).padStart(2,'0')).join('');
     const stream=renderer.sceneStream,ix=stream?.index;
     if(!ix||await hash(JSON.stringify([ix.meshes,ix.batches,ix.rockContact,ix.sourceArchiveSHA256]))!==witness.immutableMetadataSHA256)
      throw Error('Runtime world differs from CPU catalogue witness');
     const actor=ix.nodes[witness.node],selected=renderer.batches.filter(b=>b.kind===0&&b.material===2&&!b.shadowProxy&&b.instances.includes(actor));
     if(selected.length!==2||JSON.stringify(actor)!==JSON.stringify(witness.actor))throw Error('Actual compiled home-rock identity changed');
     const methods=Object.getOwnPropertyNames(Renderer.prototype).filter(k=>k!=='constructor'&&typeof Renderer.prototype[k]==='function');
     if(methods.some(k=>Object.hasOwn(renderer,k)||renderer[k]!==Renderer.prototype[k]))throw Error('Production renderer method override present');
     const textureArray=renderer.textures,original=textureArray.slice(),added=[],surfacePrograms=new Map(renderer.surfacePrograms);
     const programKeys=Object.keys(renderer).filter(k=>renderer[k]?.p&&g.isProgram(renderer[k].p));
     const programs=programKeys.map(k=>[k,renderer[k]]),shaderIdentity=[];
     for(const [slot,program]of [...programs,...[...surfacePrograms].map(([k,p])=>['surface:'+k,p])]){
      if(!g.getProgramParameter(program.p,g.LINK_STATUS))throw Error('Unlinked production program: '+slot);
      for(const shader of g.getAttachedShaders(program.p)||[])shaderIdentity.push({slot,type:g.getShaderParameter(shader,g.SHADER_TYPE),sha256:await hash(g.getShaderSource(shader))});
     }
     const inspectTexture=texture=>{
      const binding=g.getParameter(g.TEXTURE_BINDING_2D);
      try{g.bindTexture(g.TEXTURE_2D,texture);return {
       min:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER),mag:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER),
       wrapS:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_S),wrapT:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_WRAP_T),
       anisotropy:renderer.aniso?g.getTexParameter(g.TEXTURE_2D,renderer.aniso.TEXTURE_MAX_ANISOTROPY_EXT):null
      };}finally{g.bindTexture(g.TEXTURE_2D,binding);}
     };
     const textureParameters=original.slice(2,4).map(inspectTexture),uploadObserver=window.__rockTextureUploads;
     if(!uploadObserver?.active())throw Error('Passive native upload observer is missing');
     const originalTextureUploads=original.map(uploadObserver.snapshot),originalUploads=originalTextureUploads.slice(2,4),candidateUploads=[];
     if(originalUploads.some(record=>!record?.mipmapsGenerated||record.levels[0].internalFormat!==g.RGBA8))throw Error('Original production RGBA8/mipmap upload was not observed');
     const texturePairGPU=arm=>(arm==='candidate'?added:original.slice(2,4)).map((texture,i)=>({slot:i+2,...uploadObserver.snapshot(texture)}));
     const originalGPU=texturePairGPU('original');
     const restore=()=>{renderer.textures[2]=original[2];renderer.textures[3]=original[3];};
     const cleanup=()=>{
      restore();const pointersRestored=renderer.textures===textureArray&&renderer.textures.length===original.length&&renderer.textures.every((tex,i)=>tex===original[i]);
      for(const tex of added)g.deleteTexture(tex);
      return {pointersRestored,addedTexturesDeleted:added.every(tex=>!g.isTexture(tex)),nativeUploadMethodsRestored:uploadObserver.restore(),gl:g.getError()};
     };
     window.__rockScan={textureArray,original,added,actor,selected,stream,methods,programs,surfacePrograms,initial,hash,restore,cleanup,uploadObserver,texturePairGPU,originalGPU,candidateGPU:null,originalTextureUploads};
     // Match Renderer.loadTextures exactly, without replacing that method or
     // reloading unrelated textures. The existing textureFull policy owns size.
     try{
      for(let i=0;i<candidateURLs.length;i++){
       const image=await new Promise((resolve,reject)=>{
        const img=new Image(),timer=setTimeout(()=>{img.onload=img.onerror=null;img.removeAttribute('src');reject(Error('Candidate image timeout'));},12000);
        img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('Candidate image load failed: '+candidateURLs[i]));};img.src=candidateURLs[i];
       });
       if(image.width!==candidateDimensions[0]||image.height!==candidateDimensions[1])throw Error('Decoded candidate dimensions differ from the aligned receipt grid');
       const texture=g.createTexture();if(!texture)throw Error('Candidate texture allocation failed');added.push(texture);
       const binding=g.getParameter(g.TEXTURE_BINDING_2D),flip=g.getParameter(g.UNPACK_FLIP_Y_WEBGL);
       try{
        g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);let source=image;
        if(!renderer.textureFull&&image.width>1024){const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;canvas.getContext('2d').drawImage(image,0,0,1024,1024);source=canvas;}
        g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,source);g.generateMipmap(g.TEXTURE_2D);
        g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
        g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.REPEAT);
        if(renderer.aniso)g.texParameterf(g.TEXTURE_2D,renderer.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,g.getParameter(renderer.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        if(JSON.stringify(inspectTexture(texture))!==JSON.stringify(textureParameters[i]))throw Error('Original/candidate sampler parameters differ');
        const uploaded=uploadObserver.snapshot(texture),expectedDimensions=!renderer.textureFull&&image.width>1024?[1024,1024]:[image.width,image.height];
        if(!uploaded?.mipmapsGenerated||JSON.stringify(uploaded.dimensions)!==JSON.stringify(expectedDimensions)||uploaded.levels[0].internalFormat!==g.RGBA8)throw Error('Actual candidate upload differs from the production size/mipmap policy');
        candidateUploads.push(uploaded);
       }finally{g.bindTexture(g.TEXTURE_2D,binding);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,flip);}
      }
      if(g.getError())throw Error('Candidate texture upload GL error');
     }catch(error){cleanup();throw error;}
     window.__rockScan.candidateGPU=texturePairGPU('candidate');
     return {...initial,shaderIdentity,textureParameters,originalUpload:{count:2,format:'RGBA8',textures:originalUploads},candidateUpload:{count:added.length,format:'RGBA8',
      sourceDimensions:candidateDimensions,dimensions:candidateUploads[0].dimensions,textures:candidateUploads,mips:true,normalFlip:false,onlySlots:[2,3]},
      textureDimensionsChanged:originalUploads.some((record,i)=>JSON.stringify(record.dimensions)!==JSON.stringify(candidateUploads[i].dimensions))};
    },{witness,candidateURLs:candidatePaths.map(file=>new URL(file,baseURL).href),candidateDimensions:candidateIdentity[0].dimensions});
    assert(row.initial.adaptive&&row.initial.compiled&&row.initial.streamed,'Fresh default world/adaptive entry required');
    assert.equal(row.initial.quality,touch?1:2);assert.equal(row.initial.scale,1);
    await verifyResponses();row.status='prepared';save();
    for(const scene of scenes){
     await page.bringToFront();
     const result=await page.evaluate(async({scene,time})=>{
      const f=window.__rockScan,g=renderer.gl,result={scene:scene.id,valid:false,images:[]};
      const raf=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Foreground animation frame timed out')),10000);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
      const render=()=>{const previous=renderer.frame,ok=renderer.render(scene.eye,scene.aim,time);if(ok===false)return false;if(renderer.frame!==previous+1)throw Error('Incomplete production render');return true;};
      const population=()=>JSON.stringify([...allLife,...shoal].map(n=>({uid:n.uid,species:n.species,p:n.p,s:n.s,yaw:n.yaw,pitch:n.pitch,phase:n.phase,home:n.home,ecologyPresent:n.ecologyPresent,bioGenes:n.bioGenes})));
      const immutable=()=>JSON.stringify([f.stream.index.meshes,f.stream.index.batches,f.stream.index.nodes,f.stream.index.rockContact,f.stream.index.sourceArchiveSHA256,OceanTrench.solids]);
      const programsMatch=()=>f.programs.every(([k,p])=>renderer[k]===p)&&renderer.surfacePrograms.size===f.surfacePrograms.size&&[...f.surfacePrograms].every(([k,p])=>renderer.surfacePrograms.get(k)===p)&&f.methods.every(k=>!Object.hasOwn(renderer,k)&&renderer[k]===Renderer.prototype[k]);
      const texturesMatch=arm=>renderer.textures===f.textureArray&&renderer.textures.length===f.original.length&&renderer.textures.every((tex,i)=>tex===(i===2||i===3?(arm==='candidate'?f.added[i-2]:f.original[i]):f.original[i]));
      const streamState=()=>{const {required,preload,keep}=f.stream.neededRanges(scene.eye);return {
       resident:f.stream.meshes.filter(m=>m.resident).map(m=>m.id),missing:[...required].filter(id=>!f.stream.meshes[id].resident),
       preloadMissing:[...preload].filter(id=>!f.stream.meshes[id].resident),
       outside:f.stream.meshes.filter(m=>m.resident&&!m.pinned&&!keep.has(m.id)).map(m=>m.id),jobs:f.stream.jobs.size,queued:f.stream.queue.length,active:f.stream.active,
       shadowUpdates:renderer.staticShadowUpdates||0,forceShadow:!!renderer.forceShadow,shadowDirty:!!renderer._shadowMapDirty};};
      const homeSubmitted=b=>{
       if(!b.visible||!b.vao)return false;
       const p=f.actor.p.map((v,k)=>Math.fround(v-(renderer.renderOrigin||[0,0,0])[k]));
       for(let i=0;i<b.drawCount;i++)if(p.every((v,k)=>Math.abs(b.data[i*24+k]-v)<.00001)&&Math.abs(b.data[i*24+3]-Math.fround(f.actor.yaw))<.00001)return true;
       return false;
      };
      const targets=()=>{
       const selected=scene.group==='home'?f.selected:renderer.batches.filter(b=>b.sceneRole==='region:trench'||b.regionRole==='strata');
       return selected.map(b=>({batch:renderer.batches.indexOf(b),mesh:b.streamMesh??null,kind:b.kind,material:b.material,
        minDistance:b.minDistance||0,visible:b.visible,resident:!!b.vao,indexCount:b.count,vertexCount:b.vertexCount,drawCount:b.drawCount,
        submittedTriangles:b.visible&&b.vao?b.count/3*b.drawCount:0,selectedActorSubmitted:scene.group==='home'?homeSubmitted(b):null}));
      };
      const conditions=()=>({camera:scene.eye,aim:scene.aim,time,fov:renderer.photoFov||renderer.fov||(renderer.width<renderer.height?67:69),
       photoFov:renderer.photoFov??null,near:renderer.photoNear??null,exposure:renderer.exposure,clarity:renderer.clarity,
       lamp:renderer.lamp,lighting:renderer.lighting,quality:renderer.quality,scale:renderer.dynamicScale,adaptive:settings.adaptive,
       textureFull:renderer.textureFull,freeze:window.__freeze,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],msaa:renderer.msaaSamples,
       volume:[renderer.volumeW,renderer.volumeH],player:{p:player.p,yaw:player.yaw,pitch:player.pitch,velocity:player.velocity},
       optionalImportedFish:oceanBarramundi.status(renderer),clock:{day:oceanFeatures.state('expedition').day,minute:oceanFeatures.state('expedition').minute}});
      const workload=()=>({draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,
       shadowDraws:renderer.shadowDraws,shellDraws:renderer.shellDraws||0,targets:targets(),stream:streamState()});
      const clean=()=>{const state=streamState();if(document.hidden||!document.hasFocus()||g.isContextLost()||renderer.pendingResize||state.missing.length||state.outside.length||state.jobs||state.queued||state.active)throw Error('View is not foreground/settled');};
      try{
       f.restore();settings.lamp=scene.lamp;settings.lighting=scene.lighting;
       await __prepareView(scene.eye,scene.aim,time);eye=scene.eye.slice();target=scene.aim.slice();
       renderer.lamp=scene.lamp;renderer.lighting=scene.lighting;
       $('welcome').classList.add('hidden');$('hud').classList.add('hidden');
       if(renderer.photoFov!=null||renderer.photoNear!=null||renderer.exposure!==f.initial.exposure||renderer.clarity!==f.initial.clarity||
          (renderer.fov||(renderer.width<renderer.height?67:69))!==f.initial.fov||
          JSON.stringify(oceanBarramundi.status(renderer))!==JSON.stringify(f.initial.optionalImportedFish))
        throw Error('Default optics/exposure/clarity changed');
       if(scene.group==='home'){
        const hit=OceanRockContact.sweep(scene.eye,scene.aim,0),blocked=OceanRockContact.overlaps(scene.eye,.2);
        const available=Math.tan(conditions().fov*Math.PI/360)*Math.min(1,g.drawingBufferWidth/g.drawingBufferHeight);
        const projected=scene.radius/Math.sqrt(scene.distance**2-scene.radius**2);
        result.contact={blocked,firstHit:hit,expected:scene.firstRockHit};
        result.framing={available,projected,fits:projected<=available,policy:'Exact fixture camera and default FOV retained, including partial portrait framing.'};
        if(blocked||!hit||Math.abs(hit.fraction-scene.firstRockHit.fraction)>1e-6)throw Error('Actual home-rock contact fixture changed');
       }else{
        const floor=OceanTrench.containsXZ(scene.eye[0],scene.eye[2])?OceanTrench.floorAt(scene.eye[0],scene.eye[2],scene.eye[1]+.001):groundHeight(scene.eye[0],scene.eye[2]);
        result.safety={floor,clearance:scene.eye[1]-floor,pointBlocked:OceanRegions.pointBlocked(scene.eye,.4),belowSurface:scene.eye[1]<-.65};
        if(!Number.isFinite(floor)||result.safety.clearance<.81||result.safety.pointBlocked||!result.safety.belowSurface)throw Error('Fixed trench camera is unsafe; no replacement chosen');
       }
       await f.stream.ready(scene.eye);const deadline=performance.now()+30000;let stable=0,last='';
       while(stable<3){
        await raf();const complete=render(),state=streamState(),signature=JSON.stringify(workload());
        const settled=complete&&!state.missing.length&&!state.outside.length&&!state.jobs&&!state.queued&&!state.active&&!renderer.pendingResize&&(renderer.sunless||(!state.forceShadow&&!state.shadowDirty));
        stable=settled?(signature===last?stable+1:1):0;last=signature;
        if(g.getError())throw Error('Settling render GL error');
        if(performance.now()>deadline)throw Error('Scene did not settle');
       }
       clean();const fixed=JSON.stringify(conditions()),work=JSON.stringify(workload()),actors=population(),world=immutable(),batchRefs=renderer.batches.slice();
       const validate=arm=>{
        clean();const checks={opticsUnchanged:JSON.stringify(conditions())===fixed,workloadUnchanged:JSON.stringify(workload())===work,
         actorsUnchanged:population()===actors,worldUnchanged:immutable()===world,programsAndMethodsUnchanged:programsMatch(),
         batchReferencesUnchanged:renderer.batches.length===batchRefs.length&&renderer.batches.every((b,i)=>b===batchRefs[i]),texturePairIdentity:texturesMatch(arm),
         textureUploadRecordUnchanged:f.uploadObserver.active()&&JSON.stringify(f.texturePairGPU(arm))===JSON.stringify(arm==='candidate'?f.candidateGPU:f.originalGPU),
         otherTextureUploadsUnchanged:f.original.every((texture,i)=>i===2||i===3||JSON.stringify(f.uploadObserver.snapshot(texture))===JSON.stringify(f.originalTextureUploads[i]))};
        const submitted=targets();checks.targetSubmitted=scene.group==='home'
         ?submitted.some(b=>b.selectedActorSubmitted&&(scene.far?b.minDistance>0:b.minDistance===0))
         :submitted.some(b=>[16,17].includes(b.material)&&b.submittedTriangles>0);
        if(!Object.values(checks).every(Boolean))throw Error('Comparison invariant failed: '+JSON.stringify(checks));
        return checks;
       };
       result.conditions=JSON.parse(fixed);result.workload=JSON.parse(work);result.actorSHA256=await f.hash(actors);result.worldSHA256=await f.hash(world);
       for(const arm of ['original','candidate','original-restored']){
        renderer.textures[2]=arm==='candidate'?f.added[0]:f.original[2];renderer.textures[3]=arm==='candidate'?f.added[1]:f.original[3];
        for(let i=0;i<3;i++){await raf();if(!render())throw Error('Visual frame deferred');}
        const checks=validate(arm);if(!render())throw Error('Capture frame deferred');
        // Preserve the default framebuffer: both readbacks occur synchronously
        // after the complete production render and before any await.
        const width=g.drawingBufferWidth,height=g.drawingBufferHeight,pixels=new Uint8Array(width*height*4);
        g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,pixels);
        const png=renderer.canvas.toDataURL('image/png'),error=g.getError();let maxRGB=0,nonzeroPixels=0;
        for(let i=0;i<pixels.length;i+=4){maxRGB=Math.max(maxRGB,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzeroPixels++;}
        if(error||maxRGB<=20||nonzeroPixels<=200)throw Error('Empty/dark/invalid capture; retain a failed visual receipt');
        result.images.push({arm,width,height,png,rgbaSHA256:await f.hash(pixels),maxRGB,nonzeroPixels,gl:error,checks,targets:targets(),texturePairGPU:f.texturePairGPU(arm)});
        validate(arm);
       }
       result.restoredPixelsMatch=result.images[0].rgbaSHA256===result.images[2].rgbaSHA256;
       if(!result.restoredPixelsMatch)throw Error('Original framebuffer was not restored byte-exactly');
       result.changedPixelsObserved=result.images[0].rgbaSHA256!==result.images[1].rgbaSHA256;
       result.valid=true;
      }catch(error){result.failure=error.stack||error.message;}
      finally{f.restore();result.originalPointersRestored=texturesMatch('original');}
      return result;
     },{scene,time:6});
     for(const image of result.images){
      const bytes=Buffer.from(image.png.split(',')[1],'base64');delete image.png;
      image.file=path.join(path.dirname(output),profile+'-'+scene.id+'-'+image.arm+'.png');image.pngSHA256=sha(bytes);fs.writeFileSync(image.file,bytes);
     }
     row.views.push(result);await verifyResponses();save();
     assert(result.valid&&result.originalPointersRestored,'Invalid visual comparison; evidence retained: '+scene.id);
    }
    row.status='passed-controlled-invariants-visual-review-required';
   }finally{
    try{row.cleanup=await page.evaluate(()=>window.__rockScan?.cleanup()||{notInitialized:true});
     if(!row.cleanup.notInitialized)assert(row.cleanup.pointersRestored&&row.cleanup.addedTexturesDeleted&&row.cleanup.nativeUploadMethodsRestored&&!row.cleanup.gl,'Texture/observer cleanup failed');
    }catch(error){row.errors.push('Cleanup: '+error.message);report.errors.push('Cleanup: '+error.message);}
    await context.close();await Promise.all(sourceJobs);save();
   }
   assert.deepEqual(row.errors,[]);
  }
  for(const [file,expected]of Object.entries(sourceIdentity))assert.deepEqual({bytes:fs.statSync(path.join(root,file)).size,sha256:sha(fs.readFileSync(path.join(root,file)))},expected,'Local source changed during preview: '+file);
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-invariants-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack||error.message;process.exitCode=1;console.error(error);}
 finally{await browser?.close();save();}
}

// Configuration inspection is deliberately opt-in and never launches a browser.
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'source-only-no-browser-or-GPU',profiles,fixtures:scenes,
 witness,candidateIdentity,output,sourceFiles:sourcePaths.length,purpose:report.purpose},null,2));
else if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
