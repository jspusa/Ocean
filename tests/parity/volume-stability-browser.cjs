/* Native GPU regression for swimming light: production VOLUME_FS, compared
 * with the SAME shader at 128/256 steps. No CPU mirror of the light equations.
 * --legacy proves the released shader RED; --quick is the three q2 views.
 * --perf instead measures legacy/current ABBA complete-frame GPU queries.
 * Run alone; touch is desktop emulation, never physical-phone performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../..'),url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8765/';
const legacy=process.argv.includes('--legacy'),quick=process.argv.includes('--quick'),perf=process.argv.includes('--perf'),touch=process.argv.includes('--touch');
const source=fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),oldSource=cp.execFileSync('git',['show','bc68a54:src/engine.js'],{cwd:root,encoding:'utf8'});
function shader(text){const context=vm.createContext({console,performance});vm.runInContext(text,context);return vm.runInContext('VOLUME_FS',context);}
const current=shader(source),released=shader(oldSource),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const report={url,legacy,quick,perf,touch,sourceSHA256:hash(source),currentShaderSHA256:hash(current),legacyShaderSHA256:hash(released),rows:[],errors:[]};
const output=path.join(root,'qa/parity',`volume-${perf?'gpu-performance':'stability'}-${legacy?'legacy':'current'}-${touch?'touch':'desktop'}.json`);
(async()=>{
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));
 try{
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1200,height:800},deviceScaleFactor:perf?(touch?3:2):1,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  await page.evaluate(async()=>{settings.adaptive=false;settings.third=false;settings.lamp=false;renderer.renderBubbles=()=>{};await __prepareView([0,-8,7],[0,-8,-10],12.98);});
  await page.waitForFunction(()=>!renderer.sceneStream||renderer.sceneStream.jobs.size===0,null,{timeout:120000});
  Object.assign(report,await page.evaluate(async({current,released,legacy,quick,perf,touch})=>{
   if(VOLUME_FS!==current)throw Error('Served VOLUME_FS differs from local source; refresh/build before testing');
   const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',original=renderer.volumeProgram;
   if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('This regression requires native GPU; refusing a software fallback');
   const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),owned=[],rows=[];
   const compile=fs=>{const p=renderer.makeProgram(POST_VS,fs);owned.push(p);return p;};
   const fixedSteps=(fs,n)=>{
    const a=fs.replace(/int steps\s*=\s*uQuality==2\?12:uQuality==1\?8:4;/,`int steps=${n};`);
    if(a===fs)throw Error('Production step declaration changed; update the reference adapter explicitly');
    const b=a.replace(/for\(int i=0;i<12;i\+\+\)/,`for(int i=0;i<${n};i++)`);
    if(a===b)throw Error('Production march loop changed; reference adapter cannot silently proceed');return b;
   };
   const render=program=>{renderer.volumeProgram=program;if(renderer.render(eye,target,t)===false)throw Error('Streaming wait during a measured frame');};
   const pixels=program=>{render(program);g.bindFramebuffer(g.FRAMEBUFFER,null);const p=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);g.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);return p;};
   const meta=()=>({quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,draws:renderer.drawCalls,triangles:renderer.submittedTriangles,gl:g.getError()});
   let maskFBO=null,maskTexture=null;
   try{
    if(perf){
     const ext=g.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('Complete-frame GPU timer unavailable');
     const variants={legacy:compile(released),current:compile(current)};
     for(const mode of ['legacy','current','current','legacy']){
      for(let i=0;i<10;i++){await raf();render(variants[mode]);}
      const gpuMs=[],cpuSubmitMs=[];
      for(let i=0;i<25;i++){
       await raf();const query=g.createQuery();
       try{
        g.beginQuery(ext.TIME_ELAPSED_EXT,query);const begin=performance.now();render(variants[mode]);cpuSubmitMs.push(performance.now()-begin);g.endQuery(ext.TIME_ELAPSED_EXT);g.flush();
        const deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('GPU query timeout');await raf();}
        if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU timer sample; no timing claim');gpuMs.push(g.getQueryParameter(query,g.QUERY_RESULT)/1e6);
       }finally{g.deleteQuery(query);}
      }
      rows.push({mode,gpuMs,cpuSubmitMs,...meta()});
     }
     return {hardware,rows,method:'Native hardware, fixed camera/time/content/resolution/MSAA; only VOLUME_FS toggled. ABBA; 10 warm frames and 25 single-query complete frames per block. No per-draw queries. No physical-phone or battery claim.'};
    }
    const fs=legacy?released:current,programs={actual:compile(fs),ref128:compile(fixedSteps(fs,128)),ref256:compile(fixedSteps(fs,256))};
    // Render a scene-depth mask with actual texture coordinates. Five taps
    // exclude geometry silhouettes; CPU ROI never silently admits edges.
    const maskProgram=compile(`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;uniform sampler2D uDepth;uniform vec2 uPixel;
void main(){float clear=1.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)clear*=step(.9999,texture(uDepth,uv+vec2(float(x),float(y))*uPixel*3.).r);frag=vec4(clear,clear,clear,1.);}`);
    const mask=()=>{
     const w=renderer.canvas.width,h=renderer.canvas.height;
     if(maskFBO)g.deleteFramebuffer(maskFBO);if(maskTexture)g.deleteTexture(maskTexture);
     maskTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,maskTexture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA8,w,h);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
     maskFBO=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,maskFBO);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,maskTexture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Mask FBO incomplete');
     g.viewport(0,0,w,h);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.useProgram(maskProgram.p);renderer.bindTex(0,renderer.sceneDepth);renderer.set1i(maskProgram,'uDepth',0);renderer.set2f(maskProgram,'uPixel',1/w,1/h);g.bindVertexArray(renderer.postVAO);g.drawArrays(g.TRIANGLES,0,3);
     const p=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,p);g.bindFramebuffer(g.FRAMEBUFFER,null);return p;
    };
    const stats=(a,b,m,roi)=>{
     const w=renderer.canvas.width,h=renderer.canvas.height,hist=new Uint32Array(511);let sum=0,max=0,n=0;
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(roi&&(x/w<.15||x/w>.85||y/h<.48||y/h>.72||m[i]<250))continue;
      for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);sum+=d*d;max=Math.max(max,d);hist[Math.min(510,Math.round(d))]++;n++;}}
     let accumulated=0,p95=0;for(let d=0;d<hist.length;d++){accumulated+=hist[d];if(accumulated>=n*.95){p95=d;break;}}return {channels:n,rms:Math.sqrt(sum/Math.max(1,n)),p95,max};
    };
    const cases=[{id:'a',p:[0,-8,7],aim:[0,-8,-10],time:12.98},{id:'forward',p:[0,-8,6.4],aim:[0,-8,-10.6],time:12.98},{id:'down',p:[0,-8.6,7],aim:[0,-8.6,-10],time:12.98}];
    if(!quick)cases.push({id:'time0',p:[0,-8,7],aim:[0,-8,-10],time:0},{id:'time90',p:[0,-8,7],aim:[0,-8,-10],time:90});
    for(const quality of quick?[2]:[2,1,0]){
     renderer.quality=quality;renderer.dynamicScale=1;renderer.resize();let anchor=null;
     for(const view of cases){
      await __prepareView(view.p,view.aim,view.time);while(renderer.sceneStream?.jobs.size)await raf();renderer.lamp=false;
      const actual=pixels(programs.actual),reference=pixels(programs.ref256),convergence=pixels(programs.ref128),m=mask(),error=new Int16Array(actual.length);
      for(let i=0;i<error.length;i++)error[i]=actual[i]-reference[i];
      const row={id:view.id,time:view.time,p:view.p,aim:view.aim,...meta(),water:stats(actual,reference,m,true),wholeFrame:stats(actual,reference,m,false),referenceConvergence:stats(reference,convergence,m,true)};
      if(view.id==='a')anchor={error,mask:m};else if(view.id==='forward'||view.id==='down'){
       const intersection=m.map((v,i)=>i%4===0?Math.min(v,anchor.mask[i]):v);row.motionResidual=stats(error,anchor.error,intersection,true);
      }
      rows.push(row);
     }
    }
    return {hardware,rows,method:'Production VOLUME_FS compiled through Renderer.makeProgram; only march count/loop bound changed for 128/256-step reference. Same final native RGBA pipeline; scene-depth-eroded open-water ROI x=.15..85, y=.48..72. Geometry edges/full frame reported separately. Bubbles disabled, floor caustics/AO/filter/shadows preserved. Fixed world/time camera translations isolate quadrature error from true radiance changes.'};
   }finally{
    renderer.volumeProgram=original;for(const p of owned)g.deleteProgram(p.p);if(maskFBO)g.deleteFramebuffer(maskFBO);if(maskTexture)g.deleteTexture(maskTexture);g.bindFramebuffer(g.FRAMEBUFFER,null);
   }
  },{current,released,legacy,quick,perf,touch}));
  await context.close();
 }finally{await browser.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));}
 assert.deepEqual(report.errors,[]);assert(report.rows.length>0);
 if(perf){
  for(const row of report.rows){assert.equal(row.gl,0);for(const k of ['quality','scale','resolution','volumeResolution','msaa','draws','triangles'])assert.deepEqual(row[k],report.rows[0][k],k+' must remain fixed');}
  const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)],before=median(report.rows.filter(r=>r.mode==='legacy').flatMap(r=>r.gpuMs)),after=median(report.rows.filter(r=>r.mode==='current').flatMap(r=>r.gpuMs));
  report.comparison={legacyMedianGpuMs:before,currentMedianGpuMs:after,reductionPercent:100*(1-after/before)};fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.comparison));
 }else{
  const failures=[],limits={2:{rms:1,p95:2,max:4,motion:1},1:{rms:1.6,p95:3,max:6,motion:1.6},0:{rms:3,p95:6,max:10,motion:3}};
  for(const row of report.rows){const label=`q${row.quality} ${row.id}`,limit=limits[row.quality];if(row.gl!==0)failures.push(label+' GL '+row.gl);if(row.water.channels<1000)failures.push(label+' insufficient actual clear-water coverage');if(row.referenceConvergence.rms>.6||row.referenceConvergence.p95>1)failures.push(label+' 128/256 reference is not converged');for(const k of ['rms','p95','max'])if(row.water[k]>limit[k])failures.push(`${label} water ${k} ${row.water[k].toFixed(3)} > ${limit[k]}`);if(row.motionResidual&&row.motionResidual.rms>limit.motion)failures.push(`${label} camera residual ${row.motionResidual.rms.toFixed(3)} > ${limit.motion}`);}
  report.failures=failures;fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.rows.map(r=>({quality:r.quality,id:r.id,water:r.water,motion:r.motionResidual,reference:r.referenceConvergence}))));assert.deepEqual(failures,[]);
 }
 console.log('PASS '+output);
})().catch(error=>{console.error(error);process.exitCode=1;});
