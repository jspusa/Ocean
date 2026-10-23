/* Real texture transaction with deterministic Image/network/timer and WebGL
 * IO fixtures. No GPU is used; browser fault injection verifies actual fetches. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/engine.js'),'utf8'),names=['sand_diff','sand_nor_gl','rock_diff','rock_nor_gl','shell_diff','shell_nor_gl','coral_diff','coral_nor_gl','caustics'];
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture({mobile=false,quality=2,assets={},failUpload=false}={}){
 const images=[],requests=[],timers=new Map(),timerDelays=[],textures=[],deleted=[],calls=[],canvases=[];let timerId=0,bound=null;
 class ImageFixture{constructor(){this.onload=null;this.onerror=null;this.width=this.height=2048;images.push(this);}set src(value){this._src=value;requests.push({image:this,url:value});}get src(){return this._src;}}
 const ASSETS=Object.fromEntries(names.map(name=>[name,assets[name]||'assets/'+name+'.jpg?v=0.18.3&color=a%20b#reef'])),originalAssets={...ASSETS};
 const g={TEXTURE_2D:1,UNPACK_FLIP_Y_WEBGL:2,RGBA8:3,RGBA:4,UNSIGNED_BYTE:5,TEXTURE_MIN_FILTER:6,LINEAR_MIPMAP_LINEAR:7,TEXTURE_MAG_FILTER:8,LINEAR:9,TEXTURE_WRAP_S:10,TEXTURE_WRAP_T:11,REPEAT:12,
  createTexture(){const texture={id:textures.length,deleted:false};textures.push(texture);return texture;},
  bindTexture(_,texture){calls.push(['bind',texture.id]);assert(!texture.deleted,'no callback may bind deleted texture');bound=texture;},pixelStorei(...args){calls.push(['pixelStorei',...args]);},
  texImage2D(...args){calls.push(['upload',bound.id,args.at(-1)]);assert(!bound.deleted);if(failUpload)throw Error('simulated upload failure');},generateMipmap(...args){calls.push(['mipmap',...args]);},texParameteri(...args){calls.push(['parameter',...args]);},texParameterf(...args){calls.push(['anisotropy',...args]);},getParameter:()=>16,
  deleteTexture(texture){assert(!texture.deleted,'each texture deleted exactly once');if(texture.pending){assert.equal(timers.size,0,'cancel retry timers before GPU cleanup');assert(images.every(image=>image.onload===null&&image.onerror===null),'detach every image before GPU cleanup');}texture.deleted=true;deleted.push(texture);calls.push(['delete',texture.id]);}
 };
 const document={createElement(tag){assert.equal(tag,'canvas');const canvas={width:0,height:0,getContext:()=>({drawImage(...args){calls.push(['downsample',...args]);}})};canvases.push(canvas);return canvas;}};
 const context=vm.createContext({console,performance,Image:ImageFixture,ASSETS,document,setTimeout(callback,delay){const id=++timerId;timers.set(id,callback);timerDelays.push(delay);return id;},clearTimeout(id){timers.delete(id);}});vm.runInContext(source,context);
 const Renderer=vm.runInContext('Renderer',context),old=[g.createTexture(),g.createTexture()],renderer=Object.assign(Object.create(Renderer.prototype),{gl:g,mobile,quality,textures:old,textureFull:false,dirty:false,aniso:{TEXTURE_MAX_ANISOTROPY_EXT:13,MAX_TEXTURE_MAX_ANISOTROPY_EXT:14}});
 const begin=(upgrade=false)=>{const promise=upgrade?renderer.upgradeTextures():renderer.loadTextures();for(const texture of textures)if(!old.includes(texture))texture.pending=true;const status={state:'pending'};promise.then(()=>{status.state='fulfilled';},error=>{status.state='rejected';status.error=error;});return{promise,status};};
 const emit=(image,event)=>{const handler=image[event];if(handler)handler();};
 const nextTimer=()=>{const [id,callback]=timers.entries().next().value||[];assert(callback,'retry timer must exist');timers.delete(id);callback();return images.at(-1);};
 const succeedInitial=except=>{for(const image of images.slice(0,9))if(image!==except)emit(image,'onload');};
 return{renderer,old,g,images,requests,timers,timerDelays,textures,deleted,calls,canvases,ASSETS,originalAssets,begin,emit,nextTimer,succeedInitial};
}
let passed=0,failed=0;async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
(async()=>{
 await check('a transient HTTP image failure retries twice and preserves version/query/hash and original texture quality',async()=>{
  const f=fixture(),op=f.begin(),initial=f.images[5],stale=initial.onload;assert.equal(f.images.length,9);assert.equal(f.requests[5].url,f.ASSETS.shell_nor_gl);
  f.emit(initial,'onerror');await flush();assert.equal(op.status.state,'pending');assert.equal(f.timers.size,1,'RED: transient image errors must retry');const before=f.calls.length;stale();assert.equal(f.calls.length,before,'stale failed-attempt load must not touch GL');
  const second=f.nextTimer();assert.notEqual(second,initial);f.emit(second,'onerror');await flush();const third=f.nextTimer();assert.notEqual(third,second);
  const urls=f.requests.filter(request=>request.url.includes('shell_nor_gl')).map(request=>request.url);assert.equal(urls.length,3);assert.equal(new Set(urls).size,3);
  for(const url of urls){const parsed=new URL(url,'https://example.test/Ocean/');assert.equal(parsed.searchParams.get('v'),'0.18.3');assert.equal(parsed.searchParams.get('color'),'a b');assert.equal(parsed.hash,'#reef');assert(url.includes('color=a%20b'));}
  assert(f.timerDelays.every(delay=>delay>0&&delay<=1000));f.succeedInitial(initial);f.emit(third,'onload');await op.promise;
  assert.equal(op.status.state,'fulfilled');assert.equal(f.renderer.textures.length,9);assert.equal(f.renderer.textureFull,true);assert.equal(f.renderer.dirty,true);assert.deepEqual(f.deleted,f.old);assert.equal(f.calls.filter(call=>call[0]==='upload').length,9);assert.equal(f.calls.filter(call=>call[0]==='mipmap').length,9);assert.equal(f.calls.filter(call=>call[0]==='anisotropy'&&call.at(-1)===8).length,9);assert.equal(f.canvases.length,0);assert.deepEqual(f.ASSETS,f.originalAssets);
 });
 await check('exhausted retry atomically cancels queued images and timers before deleting pending GPU textures',async()=>{
  const f=fixture(),op=f.begin(true),initial=f.images[5];f.emit(initial,'onerror');await flush();assert.equal(op.status.state,'pending');const second=f.nextTimer();f.emit(second,'onerror');await flush();const third=f.nextTimer();
  const late=f.images.filter(image=>image.onload).map(image=>image.onload);f.emit(f.images[0],'onerror');assert.equal(f.timers.size,1);f.emit(third,'onerror');await assert.rejects(op.promise,/無法載入材質 shell_nor_gl/);await flush();
  assert.equal(op.status.state,'rejected');assert.equal(f.requests.filter(r=>r.url.includes('shell_nor_gl')).length,3);assert.equal(f.timers.size,0);assert.equal(f.deleted.length,9);assert(f.old.every(texture=>!texture.deleted));assert.equal(f.renderer.textures,f.old);assert.equal(f.renderer.textureFull,false);assert.equal(f.renderer._textureUpgrade,null);
  const before=f.calls.length;for(const callback of late)assert.doesNotThrow(callback);assert.equal(f.calls.length,before,'late queued callbacks must short-circuit before every GL operation');
 });
 await check('embedded data/blob image failures do not retry or append network query strings',async()=>{
  for(const url of ['data:image/jpeg;base64,bad','blob:https://example.test/bad']){const f=fixture({assets:{sand_diff:url}}),op=f.begin();f.emit(f.images[0],'onerror');await assert.rejects(op.promise,/無法載入材質 sand_diff/);assert.equal(f.requests.filter(r=>r.image===f.images[0]).length,1);assert.equal(f.requests[0].url,url);assert.equal(f.timers.size,0);assert.equal(f.deleted.length,9);}
 });
 await check('an asynchronous image upload exception rejects and cleans the whole batch without an uncaught callback',async()=>{
  const f=fixture({failUpload:true}),op=f.begin();assert.doesNotThrow(()=>f.emit(f.images[2],'onload'));await flush();assert.equal(op.status.state,'rejected','RED: an upload exception must reject instead of leaving startup pending');assert.match(op.status.error.message,/simulated upload failure/);assert.equal(f.deleted.length,9);assert.equal(f.renderer.textures,f.old);assert(f.old.every(texture=>!texture.deleted));
 });
 await check('successful mobile balanced loads preserve the exact existing downsample and sampler settings',async()=>{
  const f=fixture({mobile:true,quality:1}),op=f.begin();f.succeedInitial();await op.promise;assert.equal(f.renderer.textureFull,false);assert.equal(f.canvases.length,8);assert(f.canvases.every(canvas=>canvas.width===1024&&canvas.height===1024));const uploads=f.calls.filter(call=>call[0]==='upload');assert.equal(uploads.length,9);assert.equal(uploads.at(-1)[2],f.images[8],'caustic atlas retains original resolution');assert.equal(f.deleted.length,2);assert.equal(f.timers.size,0);
 });
 await check('concurrent upgrades coalesce and a failed full upgrade can be retried without losing the old texture set',async()=>{
  const f=fixture({mobile:true,quality:1}),op=f.begin(true);assert.equal(f.renderer.upgradeTextures(),op.promise);const initial=f.images[1];f.emit(initial,'onerror');await flush();assert.equal(op.status.state,'pending');const second=f.nextTimer();f.emit(second,'onerror');await flush();f.emit(f.nextTimer(),'onerror');await assert.rejects(op.promise);assert.equal(f.renderer._textureUpgrade,null);assert.equal(f.renderer.textures,f.old);assert.equal(f.renderer.textureFull,false);
  const at=f.images.length,next=f.begin(true);assert.notEqual(next.promise,op.promise);for(const image of f.images.slice(at))f.emit(image,'onload');await next.promise;assert.equal(f.renderer.textureFull,true);assert.equal(f.renderer.textures.length,9);assert.equal(f.renderer._textureUpgrade,null);assert(f.old.every(texture=>texture.deleted));assert.equal(new Set(f.deleted).size,f.deleted.length);
 });
 console.log(`${passed}/${passed+failed} texture loading checks passed`);if(failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
