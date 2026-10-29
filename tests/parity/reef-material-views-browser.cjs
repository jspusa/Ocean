/* Controlled actual-world visual evidence, not natural-play or FPS acceptance.
 * No replacement geometry/material. Both actual LODs and lamp are photographed.
 * Root serializes native GPU execution. Touch remains computer emulation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const option=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d,root=path.resolve(__dirname,'../..'),profile=option('profile','desktop'),touch=profile==='touch',out=path.resolve(option('out','qa/parity/v01838-materials/reef-views.json'));
assert(['desktop','touch'].includes(profile));
const flatMicro=process.argv.includes('--flat-micro');
const pigmentOnly=process.argv.includes('--pigment-only');
assert([flatMicro,pigmentOnly,process.argv.includes('--fixed-bandwidth')].filter(Boolean).length<=1,'Choose only one diagnostic ablation');
const report={status:'running',profile,flatMicroDiagnostic:flatMicro,engineSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/engine.js'))).digest('hex'),method:'Real compiled fish in their world, fixed inspection camera/time. Actual shader, geometry and default profile quality; adaptation is frozen only for controlled visual inspection. Optional flat-micro is a declared normal-detail ablation, not production acceptance. PNGs require visual review, not an automatic realism verdict.',views:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(option('url','http://127.0.0.1:8765/?still'));await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.initial=await page.evaluate(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info'),initial={hardware:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,quality:renderer.quality,adaptive:settings.adaptive,scale:renderer.dynamicScale,compiled:renderer.sceneLoad.compiled};window.__freeze=true;settings.adaptive=false;active=false;$('welcome').classList.add('hidden');$('hud').classList.add('hidden');return initial;});
  assert(report.initial.adaptive&&report.initial.compiled&&report.initial.hardware&&!/software|swiftshader|llvmpipe/i.test(report.initial.hardware));assert.equal(report.initial.quality,touch?1:2);
  if(flatMicro)await page.evaluate(()=>{const anchor='if(uKind==1)n=materialSurfaceNormal(n,fishScaleHeight,fishScaleFade);';if(FS.split(anchor).length!==2)throw Error('Micro-normal ablation seam changed');const shader=FS.replace(anchor,'');renderer.surfacePrograms.set('1:6',renderer.makeProgram(surfaceShaderSource(VS,1,6),surfaceShaderSource(shader,1,6)));});
  if(pigmentOnly){report.pigmentOnlyDiagnostic=true;await page.evaluate(()=>{const anchor=' vec3 L=normalize(vWorld.y<0.?uLightDir:uAirLightDir);';if(FS.split(anchor).length!==2)throw Error('Pigment diagnostic seam changed');const shader=FS.replace(anchor,'frag=vec4(base,1.);return;'+anchor);renderer.surfacePrograms.set('1:6',renderer.makeProgram(surfaceShaderSource(VS,1,6),surfaceShaderSource(shader,1,6)));});}
  if(process.argv.includes('--fixed-bandwidth')){report.fixedBandwidthDiagnostic=true;await page.evaluate(()=>{const anchor='float w=max(fwidth(value)*.8,.0005);';if(FS.split(anchor).length!==2)throw Error('Bandwidth ablation seam changed');const shader=FS.replace(anchor,'float w=.0005;');renderer.surfacePrograms.set('1:6',renderer.makeProgram(surfaceShaderSource(VS,1,6),surfaceShaderSource(shader,1,6)));});}
  for(const id of option('species','clown,tang,lyretail_anthias,banggai_cardinal,longnose_butterfly,fire_goby').split(','))for(const view of option('views','side,oblique,front,far-oblique,lamp').split(',')){
   const result=await page.evaluate(async({id,view,touch})=>{
    updateLife(6);const f=life.find(f=>SPECIES[f.species]?.id===id),batches=renderer.batches.filter(b=>b.instances.includes(f));if(!f||batches.length!==2)throw Error('Expected actual fish and two LODs: '+id);
    const high=batches.find(b=>!b.minDistance),scale=Math.max(...f.s),radius=Math.max(...batches.map(b=>b.radius))*scale,far=view==='far-oblique';
    const distance=far?high.maxDistance+Math.max(2,radius*2):Math.max(.35,radius*3.5),d=view==='front'?[1,.04,.03]:view==='side'?[.04,.08,1]:[.75,.32,1],length=Math.hypot(...d),c=Math.cos(f.yaw),s=Math.sin(f.yaw),local=d.map(v=>v/length*distance),at=[f.p[0]+c*local[0]+s*local[2],f.p[1]+local[1],f.p[2]-s*local[0]+c*local[2]];
    renderer.photoFov=2*Math.atan(radius*(touch?2.8:1.30)/distance)*180/Math.PI;renderer.photoNear=.002;renderer.lamp=view==='lamp';renderer.lighting=view==='lamp'?'blue':'day';renderer.forceShadow=true;
    await renderer.sceneStream.ready(at);for(let i=0;i<3;i++)renderer.render(at,f.p,6);const g=renderer.gl;
    return {id,view,uid:f.uid,p:f.p.slice(),eye:at,scale:f.s.slice(),time:6,yaw:f.yaw,fov:renderer.photoFov,light:renderer.lighting,lamp:renderer.lamp,gl:g.getError(),inRock:OceanRockContact.overlaps(at,.002),draws:batches.map(b=>({count:b.drawCount,min:b.minDistance||0,max:b.maxDistance,triangles:b.count/3})),png:renderer.canvas.toDataURL('image/png')};
   },{id,view,touch});
   const file=out.replace(/\.json$/,'')+'-'+id+'-'+view+'.png';fs.writeFileSync(file,Buffer.from(result.png.split(',')[1],'base64'));delete result.png;result.file=file;report.views.push(result);save();
   assert.equal(result.gl,0);assert(result.draws.some(b=>b.count>0),'No actual fish submitted');assert.equal(result.inRock,false,'Inspection camera inside rock: '+id+' '+view);console.log('PASS '+id+' '+view);
  }
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-checks-visual-review-required';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}finally{save();await browser?.close();}
})();
