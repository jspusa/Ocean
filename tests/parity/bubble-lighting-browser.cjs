/* Isolated native-GPU acceptance of the attached production bubble shaders.
 * The production Renderer.common/renderBubbles seams supply their uniforms and
 * motion. A black RGBA8 target, synthetic depth planes and fixed point fixtures
 * isolate lighting and occlusion; these are not natural gameplay, phone, FPS,
 * battery, physical scattering or full final-scene acceptance evidence.
 * Root serializes this runner with all other native GPU work.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(root,option('out','qa/parity/bubble-lighting-browser.json'));
const expectedVersion=option('expected-version',fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const report={url,expectedVersion,status:'running',checks:[],cases:[],errors:[],method:'Installed native Chrome. The actual renderer.bubbleProgram attached VS/FS must equal the production BUBBLE_VS/BUBBLE_FS. An isolated black RGBA8 framebuffer uses production SRC_ALPHA/ONE_MINUS_SRC_ALPHA blending and the production common-uniform seam, plus the post-sprite depth/resolution/exposure uniforms. Separate unblended reads retain raw shader RGBA. Synthetic open water / front / rear depth planes test the real shader sampler. Distance fixtures scale bubble radius with distance only to retain identical sprite coverage; their alpha plane must be byte-identical so a smaller point cannot impersonate light attenuation. A separate fixed-radius bubble uses the actual production renderBubbles update for rise and pause. No shader replacement, post-pass replacement, natural swimming, complete-scene, physical-phone or performance claim.'};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log((pass?'PASS ':'FAIL ')+name);save();};
const image=(id,kind,data)=>{assert(data?.startsWith('data:image/png;base64,'));const file=output.replace(/\.json$/,'')+'-'+id+'-'+kind+'.png',bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(file,bytes);return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};

async function run(){
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 let context,page,read;
 try{
  context=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:1});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('Renderer process crashed'));
  const cdp=await context.newCDPSession(page);
  read=async(fn,arg)=>{const response=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
  const target=new URL(url);target.searchParams.set('still','');await page.goto(target.href);await page.bringToFront();
  const until=Date.now()+120000;while(!await read(()=>window.__ocean?.ready)){if(Date.now()>until)throw Error('Production page did not become ready');await page.waitForTimeout(60);}
  report.metadata=await read(async()=>{
   if(!window.__freeze||active)throw Error('The isolated fixture requires the paused fresh welcome page');
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|softpipe|software/i.test(hardware))throw Error('Native hardware WebGL is required');
   const program=renderer.bubbleProgram,attached=type=>{const shader=(g.getAttachedShaders(program.p)||[]).find(s=>g.getShaderParameter(s,g.SHADER_TYPE)===type);if(!shader)throw Error('Attached production bubble shader is unavailable');return g.getShaderSource(shader);};
   if(attached(g.VERTEX_SHADER)!==BUBBLE_VS||attached(g.FRAGMENT_SHADER)!==BUBBLE_FS)throw Error('Bubble program must use the unmodified production sources');
   const width=256,height=256,projection=perspective(69*Math.PI/180,width/height,.01,100),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   const texture=g.createTexture(),depth=g.createTexture(),fbo=g.createFramebuffer(),pointVAO=g.createVertexArray(),pointBuffer=g.createBuffer();
   g.bindTexture(g.TEXTURE_2D,texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
   g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Isolated RGBA8 target is incomplete');
   g.bindTexture(g.TEXTURE_2D,depth);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
   g.bindVertexArray(pointVAO);g.bindBuffer(g.ARRAY_BUFFER,pointBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(4),g.DYNAMIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,4,g.FLOAT,false,16,0);
   // The prototype shares the production methods and actual program but owns
   // its small buffers/state, leaving the loaded world and save untouched.
   const fixture=Object.assign(Object.create(Renderer.prototype),{gl:g,canvas:{width,height},bubbleProgram:program,textures:[],quality:renderer.quality,msaaSamples:0,renderOrigin:[0,0,0],vp:projection,renderVP:projection,lightVP:identity,renderLightVP:identity,dynamicLightVP:identity,renderDynamicLightVP:identity,lightDir:renderer.lightDir.slice(),airLightDir:(renderer.airLightDir||renderer.lightDir).slice(),lightColor:renderer.lightColor.slice(),fog:renderer.fog.slice(),sun:1.12,lamp:false,cameraForward:[0,0,-1],exposure:1.11,submersible:false});
   fixture.setupBubbles();
   const captureCanvas=document.createElement('canvas');captureCanvas.width=width;captureCanvas.height=height;const ctx=captureCanvas.getContext('2d'),stateKeys=['seen','photos'];
   const initialSave=JSON.stringify(stateKeys.map(k=>window.__ocean[k]));
   const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   const depthValue=distance=>distance===null?1:((projection[10]*-distance+projection[14])/(projection[11]*-distance+projection[15]))*.5+.5;
   function prepare(config,blend){
    const eye=[0,-config.depth,0],distance=config.distance??.6,angle=(config.angle||0)*Math.PI/180,radius=config.radius??.03*(distance/.6);
    fixture.renderOrigin=eye.slice();fixture.lamp=!!config.lamp;fixture.sun=config.sun??1.12;fixture.exposure=config.exposure??1.11;fixture.cameraForward=[Math.sin(angle),0,-Math.cos(angle)];fixture.photoAperture=config.aperture||0;fixture.photoFocus=config.focus||8;
    g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.viewport(0,0,width,height);g.disable(g.SCISSOR_TEST);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.DITHER);g.colorMask(true,true,true,true);g.depthMask(false);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
    if(blend){g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);}else g.disable(g.BLEND);
    g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,depth);const plane=depthValue(config.wallDistance??null);g.texImage2D(g.TEXTURE_2D,0,g.R32F,1,1,0,g.RED,g.FLOAT,new Float32Array([plane]));
    fixture.common(program,eye,fixture.vp,config.time??1);fixture.set1f(program,'uHeight',height);fixture.set1i(program,'uDepth',1);fixture.set2f(program,'uResolution',width,height);fixture.set1f(program,'uExposure',fixture.exposure);
    return {eye,position:[0,-config.depth,-distance],radius,distance,plane};
   }
   async function pixels(){
    const rgba=new Uint8Array(width*height*4);g.readPixels(0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,rgba);const alpha=new Uint8Array(width*height),image=ctx.createImageData(width,height);
    let maxRGB=0,alphaPixels=0,nonzeroRGB=0,lumaSum=0,maxLuma=0,alphaSum=0;const rgbSum=[0,0,0];
    for(let i=0;i<rgba.length;i+=4){const a=rgba[i+3],y=Math.floor(i/4/width),x=i/4%width;alpha[i/4]=a;if(a)alphaPixels++;alphaSum+=a;const luma=rgba[i]*.2126+rgba[i+1]*.7152+rgba[i+2]*.0722;maxLuma=Math.max(maxLuma,luma);lumaSum+=luma;maxRGB=Math.max(maxRGB,rgba[i],rgba[i+1],rgba[i+2]);if(rgba[i]||rgba[i+1]||rgba[i+2])nonzeroRGB++;for(let c=0;c<3;c++){rgbSum[c]+=rgba[i+c];image.data[((height-1-y)*width+x)*4+c]=rgba[i+c];}image.data[((height-1-y)*width+x)*4+3]=255;}
    ctx.putImageData(image,0,0);const png=captureCanvas.toDataURL('image/png');return {width,height,maxRGB,maxLuma,lumaSum,rgbSum,alphaPixels,alphaSum,nonzeroRGB,rgbaSHA256:await hash(rgba),alphaSHA256:await hash(alpha),png,gl:g.getError()};
   }
   window.__bubbleLighting={
    async sample(config){
     const result={config,passes:{}};for(const blend of [false,true]){const conditions=prepare(config,blend);g.bindVertexArray(pointVAO);g.bindBuffer(g.ARRAY_BUFFER,pointBuffer);g.bufferSubData(g.ARRAY_BUFFER,0,new Float32Array([...conditions.position,conditions.radius]));g.drawArrays(g.POINTS,0,1);result.conditions=conditions;result.passes[blend?'blended':'raw']=await pixels();}return result;
    },
    async motion(){
     const config={depth:1400,lamp:false,distance:.6,radius:.03},conditions=prepare(config,true),bubble={p:conditions.position.slice(),r:.03,a:0,phase:.4};fixture.bubbles=[bubble];fixture.bubbleTime=0;fixture.lastBubbleTime=-1;
     const buffer=fixture.bubbleBuffer,array=fixture.bubbleData,frames=[];for(const time of [0,.1,.2,.3,.4,.5,.5]){prepare({...config,time},true);fixture.renderBubbles(conditions.eye,time);frames.push({time,p:bubble.p.slice(),age:bubble.a,radius:bubble.r,population:fixture.bubbles.length,bufferStable:fixture.bubbleBuffer===buffer&&fixture.bubbleData===array,pixels:await pixels()});}return {config,frames};
    },
    restore(){const saveUnchanged=JSON.stringify(stateKeys.map(k=>window.__ocean[k]))===initialSave;g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,null);g.disable(g.BLEND);g.depthMask(true);g.deleteBuffer(pointBuffer);g.deleteVertexArray(pointVAO);g.deleteBuffer(fixture.bubbleBuffer);g.deleteVertexArray(fixture.bubbleVAO);g.deleteFramebuffer(fbo);g.deleteTexture(texture);g.deleteTexture(depth);delete window.__bubbleLighting;return {saveUnchanged,gl:g.getError(),lost:g.isContextLost()};}
   };
   return {version:document.documentElement.dataset.version,hardware,userAgent:navigator.userAgent,sourceIdentity:'exact attached production VS / FS',vertexSHA256:await hash(new TextEncoder().encode(BUBBLE_VS)),fragmentSHA256:await hash(new TextEncoder().encode(BUBBLE_FS)),target:{width,height,format:'RGBA8',blackClear:[0,0,0,0],blending:'SRC_ALPHA, ONE_MINUS_SRC_ALPHA',depthTexture:'R32F nearest, actual uDepth sampler'},originalQuality:renderer.quality,originalAdaptive:settings.adaptive,afterPostFixture:true};
  });
  check('current page uses the actual production bubble program on native hardware',report.metadata.version===expectedVersion&&report.metadata.originalAdaptive,report.metadata);
  const configurations=[
   {id:'shallow-day-off',depth:2,lamp:false},
   ...[700,1400,7000].map(depth=>({id:'deep-'+depth+'-off',depth,lamp:false})),
   ...[700,1400,7000].map(depth=>({id:'deep-'+depth+'-on',depth,lamp:true})),
   {id:'deep-cone-middle',depth:1400,lamp:true,angle:35},
   {id:'deep-cone-outside',depth:1400,lamp:true,angle:70},
   {id:'deep-distance-middle',depth:1400,lamp:true,distance:1.8},
   {id:'deep-distance-far',depth:1400,lamp:true,distance:5.4},
   {id:'deep-exposure-low',depth:1400,lamp:true,exposure:.555},
   {id:'deep-exposure-high',depth:1400,lamp:true,exposure:2.22},
   {id:'deep-wall-front',depth:1400,lamp:true,wallDistance:.3},
   {id:'deep-wall-behind',depth:1400,lamp:true,wallDistance:1.2},
   {id:'shallow-wall-front',depth:2,lamp:false,wallDistance:.3},
   {id:'photo-in-focus',depth:1400,lamp:true,aperture:1.8,focus:.6},
   {id:'photo-defocus-wide',depth:1400,lamp:true,aperture:1.8,focus:1.2},
   {id:'photo-defocus-narrow',depth:1400,lamp:true,aperture:16,focus:1.2},
   {id:'photo-defocus-rear-wall',depth:1400,lamp:true,aperture:1.8,focus:1.2,wallDistance:20}
  ];
  for(const config of configurations){const row=await read(c=>__bubbleLighting.sample(c),config);for(const [kind,p]of Object.entries(row.passes)){p.image=image(config.id,kind,p.png);delete p.png;}report.cases.push(row);save();}
  const cases=Object.fromEntries(report.cases.map(c=>[c.config.id,c])),raw=id=>cases[id].passes.raw,blended=id=>cases[id].passes.blended,near=raw('deep-1400-on');
  check('all isolated draws retain GL health',report.cases.every(c=>Object.values(c.passes).every(p=>p.gl===0)));
  check('shallow daylight bubbles remain visible without a lamp',blended('shallow-day-off').maxRGB>=4&&blended('shallow-day-off').nonzeroRGB>=8,blended('shallow-day-off'));
  for(const depth of [700,1400,7000]){
   const off=blended('deep-'+depth+'-off'),on=blended('deep-'+depth+'-on');
   check(depth+' m lamp-off has no self-lit bubble RGB',off.maxRGB<=1&&raw('deep-'+depth+'-off').maxRGB<=1,{offMax:off.maxRGB,rawMax:raw('deep-'+depth+'-off').maxRGB});
   check(depth+' m lamp cone lights the actual bubble footprint',on.maxRGB>=4&&on.nonzeroRGB>=8&&raw('deep-'+depth+'-on').alphaPixels>8,{onMax:on.maxRGB,pixels:on.nonzeroRGB});
  }
  const middle=raw('deep-cone-middle'),outside=raw('deep-cone-outside');
  check('torch direction attenuates the same bubble and vanishes outside its cone',near.lumaSum>middle.lumaSum&&middle.lumaSum>outside.lumaSum&&outside.maxRGB<=1&&near.alphaSHA256===middle.alphaSHA256&&near.alphaSHA256===outside.alphaSHA256,{center:near.lumaSum,middle:middle.lumaSum,outside:outside.lumaSum});
  const distanceMiddle=raw('deep-distance-middle'),distanceFar=raw('deep-distance-far');
  check('distance attenuates light with identical projected coverage and alpha',near.alphaSHA256===distanceMiddle.alphaSHA256&&near.alphaSHA256===distanceFar.alphaSHA256&&near.lumaSum>distanceMiddle.lumaSum&&distanceMiddle.lumaSum>distanceFar.lumaSum,{near:near.lumaSum,middle:distanceMiddle.lumaSum,far:distanceFar.lumaSum,alphas:[near.alphaSHA256,distanceMiddle.alphaSHA256,distanceFar.alphaSHA256],note:'Synthetic angular-size fixture, not a physical bubble size or natural camera-distance claim'});
  check('production exposure affects bubble brightness without changing coverage',raw('deep-exposure-low').lumaSum<near.lumaSum&&near.lumaSum<raw('deep-exposure-high').lumaSum&&raw('deep-exposure-low').alphaSHA256===near.alphaSHA256&&raw('deep-exposure-high').alphaSHA256===near.alphaSHA256);
  check('rear-wall depth cannot recolor a nearer bubble',raw('deep-wall-behind').rgbaSHA256===near.rgbaSHA256&&blended('deep-wall-behind').rgbaSHA256===blended('deep-1400-on').rgbaSHA256);
  check('foreground depth occludes both lamp-lit and daylight bubbles', ['deep-wall-front','shallow-wall-front'].every(id=>raw(id).maxRGB===0&&raw(id).alphaPixels===0&&blended(id).maxRGB===0&&blended(id).alphaPixels===0));
  check('focused photograph retains the original bubble silhouette',raw('photo-in-focus').rgbaSHA256===near.rgbaSHA256);
  const wide=raw('photo-defocus-wide'),narrow=raw('photo-defocus-narrow');
  check('own-distance photo blur expands the bubble and responds to aperture',wide.alphaPixels>narrow.alphaPixels&&narrow.alphaPixels>near.alphaPixels&&wide.alphaSHA256!==narrow.alphaSHA256,{focused:near.alphaPixels,narrow:narrow.alphaPixels,wide:wide.alphaPixels});
  check('photographic bubble blur does not borrow the rear wall distance',wide.rgbaSHA256===raw('photo-defocus-rear-wall').rgbaSHA256);
  report.motion=await read(()=>__bubbleLighting.motion());
  for(const [i,frame]of report.motion.frames.entries()){frame.pixels.image=image('motion-'+i,'blended',frame.pixels.png);delete frame.pixels.png;}
  const motion=report.motion.frames,ascending=motion.slice(1,6).every((f,i)=>f.p[1]>motion[i].p[1]);
  check('formal production bubble update still rises and retains its bounded buffers',ascending&&motion.every(f=>f.population===1&&f.radius===.03&&f.bufferStable&&f.p.every(Number.isFinite)&&f.pixels.gl===0),motion.map(({time,p,age,population,bufferStable})=>({time,p,age,population,bufferStable})));
  check('repeated formal time freezes the same rising bubble',JSON.stringify(motion[5].p)===JSON.stringify(motion[6].p)&&motion[5].age===motion[6].age&&motion[5].pixels.rgbaSHA256===motion[6].pixels.rgbaSHA256);
  check('rising unlit deep bubbles do not emit light',motion.every(f=>f.pixels.maxRGB<=1));
  report.cleanup=await read(()=>__bubbleLighting.restore());check('isolated resources are released without changing player progress',report.cleanup.saveUnchanged&&report.cleanup.gl===0&&!report.cleanup.lost&&report.errors.length===0,report.cleanup);
  report.status=report.checks.every(c=>c.pass)?'passed':'failed';if(report.status!=='passed')process.exitCode=1;
 }catch(error){report.status='failed';report.failure=error.stack||String(error);process.exitCode=1;console.error(report.failure);if(read)try{report.cleanup=await read(()=>window.__bubbleLighting?.restore());}catch(_){} }
 finally{await context?.close();await browser.close();save();}
}
if(process.argv.includes('--check-source-only'))console.log(JSON.stringify({status:'options-valid-no-browser-or-gpu-run',url,output,expectedVersion}));
else run().catch(error=>{report.status='failed';report.failure=error.stack||String(error);save();console.error(error);process.exitCode=1;});
