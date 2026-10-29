/* One optional, source-textured coastal species. Its asset work never joins boot.
   Microsoft Barramundi Fish, CC0; the supplied mesh has no animation. */
const oceanBarramundi=(()=>{
 const ID='barramundi',TIMEOUT_MS=12000;
 const bounds=Object.freeze({min:Object.freeze([-.32155561447143555,-.14375337958335876,-.07145179808139801]),max:Object.freeze([.32155561447143555,.14375337958335876,.07145179808139801]),size:Object.freeze([.6431112289428711,.28750675916671753,.14290359616279602])});
 const geometryInfo=Object.freeze({magic:'BRMFISH1',bytes:128224,vertices:2188,indices:11592,triangles:3864,restRadius:.3231050751007446,sha256:'3bef66e5a231ee6429832c6b0be1b1a56022dd21ea2f379a440f41598aa563c9',bounds});
 const motion=Object.freeze({headAnchorX:.12,blendLength:.44,amplitudeMax:.025,amplitudeDefault:.025,frequencyHz:1.1,angularFrequency:6.911503837897546,phaseLag:1.6,boundMargin:.00001,localRadius:.34811507510074463});
 const maps=Object.freeze({
  512:Object.freeze([{key:'baseColor512',sha:'ba3e6d6bfec74ec0a184f9d221f19e0edfe2ccf60558bde7395813acea981834',bytes:337265},{key:'orm512',sha:'c663baca84c5e535d6205a82aff066200ef7214a6ff5c0a38688af60a4e39aed',bytes:250166},{key:'normal512',sha:'0edda1a26c6a6e8efcd26ec63dea4976e131aa329241693d27cbf9fbea85071e',bytes:245310}]),
  1024:Object.freeze([{key:'baseColor1024',sha:'8113c3829a6af3f28b316187acefa24b56f5dcc288d326a0b0c19d85502df992',bytes:1234001},{key:'orm1024',sha:'e260f2241dc5f0ae6824cbd657d30b6a63765c345b44244bc1b4399a1129ff65',bytes:925661},{key:'normal1024',sha:'6da8c248158c116d2ac5ade0b4fb589def0abd1f5c154cae3827476eec910b3d',bytes:863789}])
 });
 const species=registerFauna({id:ID,name:'金目鱸',latin:'Lates calcarifer',en:'BARRAMUNDI',color:0xa8a78a,zone:0,size:bounds.size[0],bodyLength:bounds.size[0],renderKind:13,modelBounds:bounds,height:bounds.size[1],width:bounds.size[2],modelMetres:true,
  naturalSize:'此模型全長約 64 cm；不是量測標本或物種最大體長',
  hint:'完整銀灰魚身、大口、明顯鰓蓋，以及連續鱗片與圓尾。',
  detail:'尖吻鱸，俗稱金目鱸，活動於近岸、潟湖與河口等環境。本站沿岸相遇與游動為作者設定；模型由 Microsoft 提供、以 CC0 釋出，游動是本站另加的簡化動畫。',
  habitat:'近岸潟湖、河口與岩石／泥沙過渡帶；本版位置不是現地觀測。',source:'https://fishdb.sinica.edu.tw/taxon/381561-fishdb',sourceLabel:'臺灣魚類資料庫',artCredit:'Microsoft · CC0-1.0',artAlt:'金目鱸來源模型示意（Microsoft，CC0）',
  traits:{motion:'swim',micro:false,feedable:false,grabbable:false,observeDistance:8,contactDistance:2,targetRadius:.34,viewDistance:1.5},motionProfile:{speed:.20,radius:3,bob:.08}
 },[]);
 // The guide image may arrive separately; this small neutral drawing is not a
 // photograph or a claim that the source model was authored by this project.
 species.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 210"><rect width="360" height="210" rx="18" fill="#133d4b"/><path d="M80 106L45 72V140L80 116Q136 46 245 88L294 111L255 134Q143 163 80 116" fill="#9ba9a1"/><path d="M227 88Q208 114 236 139M95 110L263 112" fill="none" stroke="#536d69" stroke-width="3"/><circle cx="260" cy="105" r="5" fill="#152a2e"/><text x="180" y="188" text-anchor="middle" font-size="18" fill="#d6e5e6">金目鱸 · Lates calcarifer</text></svg>');
 const owners=new WeakMap();let actor=null,lastRenderer=null;
 function failure(code){const error=new Error(code);error.code=code;return error;}
 function owner(renderer){
  lastRenderer=renderer;let state=owners.get(renderer);
  if(!state){state={state:'idle',generation:0,profile:null,errorCode:null,promise:null,controller:null,material:null,batch:null,listeners:null};owners.set(renderer,state);}
  if(!state.listeners){
   const lost=()=>dispose(renderer),hidden=event=>{if(!event?.persisted)dispose(renderer);};state.listeners={lost,hidden};
   renderer.canvas?.addEventListener?.('webglcontextlost',lost);globalThis.addEventListener?.('pagehide',hidden);
  }
  return state;
 }
 function ensure(renderer){
  owner(renderer);
  if(actor)return actor;
  const existing=life.find(f=>SPECIES[f.species]?.id===ID);
  if(existing){actor=existing;actor.assetReady=false;return actor;}
  const home=[-38,groundHeight(-38,46)+1.8,46];
  actor={fauna:true,barramundi:true,species:SPECIES.indexOf(species),p:home.slice(),home,center:home.slice(),modelCenter:[0,0,0],s:[1,1,1],radius:3,height:1.8,phase:.37,orbit:.37,bob:.37,speed:.20,yaw:0,pitch:0,homeYaw:0,tint:[1,1,1],retreat:0,faunaVisibility:1,faunaVisible:true,assetReady:false};
  motionPose(actor,0);life.push(actor);allLife=life.concat(decorLife);return actor;
 }
 function motionPose(f,time,out=f.p,context=null){
  const home=f.home||f.center,exhibit=!!context?.exhibit,radius=exhibit?Math.min(f.radius||.7,.7):(f.radius??3),omega=.20/Math.max(.1,radius),a=time*omega+(f.phase||0),c=Math.cos(a),s=Math.sin(a);
  out[0]=home[0]+c*radius;out[2]=home[2]+s*radius*.58;out[1]=home[1]+Math.sin(a*.7)*.08;
  if(!exhibit){
   // A small terrain footprint bounds the whole body; actual rock clearance is
   // still solved by the existing contactAnimal path after this desired pose.
   const floorAt=context?.groundHeight||groundHeight;let floor=-Infinity;
   for(let k=0;k<9;k++){const angle=k*Math.PI/4,r=k===8?0:.4;floor=Math.max(floor,floorAt(out[0]+Math.cos(angle)*r,out[2]+Math.sin(angle)*r)+.4);}
   f.habitatFloor=floor;f.habitatCeiling=-.45;
   if(floor<=f.habitatCeiling)out[1]=Math.max(floor,Math.min(f.habitatCeiling,out[1]));else {out[0]=home[0];out[1]=home[1];out[2]=home[2];}
  }
  const dx=-s*radius*omega,dz=c*radius*.58*omega,dy=Math.cos(a*.7)*.08*.7*omega;
  f.yaw=Math.atan2(-dz,dx);f.pitch=Math.max(-.12,Math.min(.12,Math.atan2(dy,Math.hypot(dx,dz))));f.bank=0;f.effort=.48;f.retreat=0;f.faunaVisibility=1;f.faunaVisible=true;f.faunaTime=time;return out;
 }
 function decodeGeometry(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==geometryInfo.bytes)throw failure('geometry-size');
  const data=new DataView(buffer);for(let i=0;i<8;i++)if(data.getUint8(i)!==geometryInfo.magic.charCodeAt(i))throw failure('geometry-header');
  if(data.getUint32(8,true)!==geometryInfo.vertices||data.getUint32(12,true)!==geometryInfo.indices)throw failure('geometry-count');
  let offset=16;
  const floats=count=>{const out=new Float32Array(count);for(let i=0;i<count;i++,offset+=4){const value=data.getFloat32(offset,true);if(!Number.isFinite(value))throw failure('geometry-finite');out[i]=value;}return out;};
  const positions=floats(2188*3),normals=floats(2188*3),uv=floats(2188*2),tangents=floats(2188*4),indices=new Uint16Array(11592),vertices=new Float32Array(2188*12);
  for(let i=0;i<indices.length;i++,offset+=2){const value=data.getUint16(offset,true);if(value>=2188)throw failure('geometry-index');indices[i]=value;}
  for(let i=0;i<2188;i++){
   if(Math.abs(tangents[i*4+3])!==1)throw failure('geometry-handedness');
   vertices.set(positions.subarray(i*3,i*3+3),i*12);vertices.set(normals.subarray(i*3,i*3+3),i*12+3);vertices.set([1,1,1],i*12+6);vertices.set(uv.subarray(i*2,i*2+2),i*12+9);vertices[i*12+11]=1;
  }
  return {positions,normals,uv,tangents,indices,indexed:{vertices,indices,tangents,radius:geometryInfo.restRadius}};
 }
 function abortable(promise,signal,late=null){
  return new Promise((resolve,reject)=>{
   let done=false;
   const abort=()=>{if(done)return;done=true;signal.removeEventListener('abort',abort);reject(failure('aborted'));};
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
   Promise.resolve(promise).then(value=>{if(done){late?.(value);return;}done=true;signal.removeEventListener('abort',abort);resolve(value);},error=>{if(done)return;done=true;signal.removeEventListener('abort',abort);reject(error);});
  });
 }
 async function fetchExact(url,bytes,expected,signal){
  if(signal.aborted)throw failure('aborted');
  if(typeof url!=='string'||!url)throw failure('asset-url');
  const response=await abortable(fetch(url,{signal}),signal);
  if(!response.ok)throw failure('asset-http');
  const buffer=await abortable(response.arrayBuffer(),signal);if(buffer.byteLength!==bytes)throw failure('asset-size');
  if(!globalThis.crypto?.subtle)throw failure('asset-integrity-unavailable');
  const digest=await abortable(globalThis.crypto.subtle.digest('SHA-256',buffer),signal),actual=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(actual!==expected)throw failure('asset-integrity');return buffer;
 }
 function uploadTexture(renderer,bitmap,baseColor){
  const gl=renderer.gl,texture=gl.createTexture();if(!texture)throw failure('texture-allocation');
  const active=gl.getParameter(gl.ACTIVE_TEXTURE),binding=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),conversion=gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);
  try{
   gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
   gl.texImage2D(gl.TEXTURE_2D,0,baseColor?gl.SRGB8_ALPHA8:gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
   if(renderer.aniso)gl.texParameterf(gl.TEXTURE_2D,renderer.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(renderer.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   if(gl.getError()!==gl.NO_ERROR)throw failure('texture-upload');return texture;
  }catch(error){gl.deleteTexture(texture);throw error;}
  finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,conversion);gl.activeTexture(active);gl.bindTexture(gl.TEXTURE_2D,binding);}
 }
 function releaseMaterial(renderer,material){
  if(!material||material.disposed)return;material.ready=false;material.disposed=true;
  for(const batch of renderer.batches.slice())if(batch.importedMaterial===material)renderer.releaseImportedBatch(batch);
  for(const texture of material.textures)renderer.gl.deleteTexture(texture);material.textures.length=0;
 }
 function status(renderer=lastRenderer){const state=renderer&&owners.get(renderer);return state?{state:state.state,generation:state.generation,profile:state.profile,errorCode:state.errorCode,ready:state.state==='ready'}:{state:'idle',generation:0,profile:null,errorCode:null,ready:false};}
 function assetReady(f){return SPECIES[f?.species]?.id!==ID||!!(actor?.assetReady&&status().ready);}
 function load(renderer){
  const state=owner(renderer);ensure(renderer);if(state.state==='ready')return Promise.resolve(true);if(state.promise)return state.promise;
  const generation=++state.generation,controller=new AbortController();state.controller=controller;state.state='loading';state.errorCode=null;actor.assetReady=false;
  // Select once per owner. Adaptive quality must not cause texture downloads in
  // the swimming loop; missing device-memory information takes the small set.
  if(state.profile===null)state.profile=!renderer.mobile&&renderer.quality===2&&(globalThis.navigator?.deviceMemory||0)>=8?1024:512;
  const profile=state.profile,material={textures:[],ready:false,normalStrength:1,motionAmplitude:motion.amplitudeDefault};let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},TIMEOUT_MS),current=()=>{if(controller.signal.aborted||state.generation!==generation)throw failure('aborted');};
  state.promise=Promise.resolve().then(async()=>{
   try{
    current();
    if(!renderer.prepareImportedMaterial())throw failure('material-unavailable');
    const urls=typeof BARRAMUNDI_ASSETS!=='undefined'?BARRAMUNDI_ASSETS:{},buffer=await fetchExact(urls.geometry,geometryInfo.bytes,geometryInfo.sha256,controller.signal);current();
    const geometry=decodeGeometry(buffer);
    for(const [index,map] of maps[profile].entries()){
     const bytes=await fetchExact(urls[map.key],map.bytes,map.sha,controller.signal);current();
     const bitmap=await abortable(createImageBitmap(new Blob([bytes],{type:'image/png'}),{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'}),controller.signal,late=>late.close());
     try{current();if(bitmap.width!==profile||bitmap.height!==profile)throw failure('texture-dimensions');material.textures.push(uploadTexture(renderer,bitmap,index===0));}finally{bitmap.close();}
    }
    current();material.ready=true;
    const batch=renderer.batch({indexed:geometry.indexed,material:18,species:SPECIES.indexOf(species),shadow:true,importedMaterial:material},[actor],13,true);
    batch.maxDistance=60;batch.sceneRole='barramundi';batch.importedMaterial=material;
    state.batch=batch;state.material=material;state.state='ready';actor.assetReady=true;renderer.dirty=true;renderer.forceShadow=true;return true;
   }catch(error){
    releaseMaterial(renderer,material);
    if(state.generation===generation){state.state='error';state.errorCode=timedOut?'timeout':error.code||'asset-failed';actor.assetReady=false;}
    return false;
   }finally{clearTimeout(timeout);if(state.generation===generation){state.promise=null;state.controller=null;}}
  });return state.promise;
 }
 function dispose(renderer=lastRenderer){
  if(!renderer)return;const state=owners.get(renderer);if(!state)return;
  state.generation++;state.controller?.abort();state.controller=null;state.promise=null;
  if(state.listeners){renderer.canvas?.removeEventListener?.('webglcontextlost',state.listeners.lost);globalThis.removeEventListener?.('pagehide',state.listeners.hidden);state.listeners=null;}
  releaseMaterial(renderer,state.material);state.material=null;state.batch=null;state.state='disposed';state.errorCode=null;if(actor)actor.assetReady=false;renderer.dirty=true;renderer.forceShadow=true;
 }
 function retry(renderer=lastRenderer){if(!renderer)return Promise.resolve(false);dispose(renderer);return load(renderer);}
 return {ensure,load,retry,dispose,status,assetReady,motionPose,decodeGeometry,species,geometryInfo,motion};
})();
