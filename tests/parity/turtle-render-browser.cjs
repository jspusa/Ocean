/* Controlled visual acceptance of the actual compiled turtle, material and rig.
 * This changes the camera/clock only for inspection; it is not a natural journey
 * or an FPS/physical-phone test. Root serializes native GPU work. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(k,f)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||f;
const profile=option('profile','desktop'),out=path.resolve(option('out','qa/parity/v01837-realism/turtle-'+profile+'.json'));
assert(['desktop','touch'].includes(profile));
const report={status:'running',profile,method:'Installed headless Chrome native GPU, actual compiled turtle-002 in its world. Default desktop/touch quality is recorded before freezing adaptation for controlled camera/clock inspection. No replacement animal geometry, isolated lighting, body scaling or material injection. Touch is computer emulation. PNGs require human visual review; motion readbacks are not performance measurements.',views:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const touch=profile==='touch';
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const url=new URL(option('url','http://127.0.0.1:8765/'));url.searchParams.set('still','');await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  report.initial=await page.evaluate(()=>{
   const gl=renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info'),f=life.find(f=>f.uid==='turtle-002'),batches=renderer.batches.filter(b=>b.instances.includes(f));
   if(!f||batches.length!==2)throw Error('Actual turtle and both LOD batches required');
   const generated=[turtleGeometry(),distantTurtle()].map(geometry=>indexGeometry(geometry.v)),counts=generated.map(g=>g.indices.length).sort((a,b)=>b-a),actual=batches.map(b=>b.count).sort((a,b)=>b-a);
   if(JSON.stringify(actual)!==JSON.stringify(counts))throw Error('Compiled turtle differs from current authored geometry: '+actual+' expected '+counts);
   const previous=gl.getParameter(gl.COPY_READ_BUFFER_BINDING),compiledGeometry=[];
   try{for(const b of batches){const expected=generated.find(g=>g.indices.length===b.count),vertices=new Float32Array(b.vertexCount*12),indices=b.indexType===gl.UNSIGNED_SHORT?new Uint16Array(b.count):new Uint32Array(b.count);
    gl.bindBuffer(gl.COPY_READ_BUFFER,b.vb);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,vertices);gl.bindBuffer(gl.COPY_READ_BUFFER,b.eb);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,indices);
    // Node and Chrome trig can differ at a pole by ~1e-15. Indices remain exact;
    // positional/normal tolerance is one millionth of a model-space unit.
    let maximumVertexError=0;for(let i=0;i<vertices.length;i++)maximumVertexError=Math.max(maximumVertexError,Math.abs(vertices[i]-expected.vertices[i]));
    const indexDifference=indices.findIndex((v,i)=>v!==expected.indices[i]);
    if(vertices.length!==expected.vertices.length||maximumVertexError>1e-6||!Number.isFinite(maximumVertexError)||indexDifference>=0)throw Error('Actual compiled/uploaded turtle differs: '+JSON.stringify({count:b.count,length:vertices.length,expectedLength:expected.vertices.length,maximumVertexError,indexDifference,indexActual:indices[indexDifference],indexExpected:expected.indices[indexDifference],gl:gl.getError()}));
    compiledGeometry.push({count:b.count,maximumVertexError,vertexTolerance:1e-6,indicesExact:true});
   }}finally{gl.bindBuffer(gl.COPY_READ_BUFFER,previous);}
   const initial={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,hardware:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,compiledGeometry,uid:f.uid,scaleActor:f.s.slice(),batches:batches.map(b=>({count:b.count,minDistance:b.minDistance||0,maxDistance:b.maxDistance,radius:b.radius}))};
   window.__freeze=true;settings.adaptive=false;active=false;document.getElementById('welcome').classList.add('hidden');document.getElementById('hud').classList.add('hidden');
   window.__turtleInspection={f,batches,initial};return initial;
  });
  assert(report.initial.hardware&&!/software|swiftshader|llvmpipe/i.test(report.initial.hardware));assert(report.initial.compiled&&report.initial.streamed&&report.initial.adaptive);assert.equal(report.initial.quality,touch?1:2);save();
  const configs=[
   {id:'oblique',offset:[3.3,1.6,3.6],fov:44,time:6},
   {id:'underside',offset:[2.5,-2,3.1],fov:44,time:6},
   {id:'front',offset:[4.5,.2,.15],fov:44,time:6},
   {id:'side',offset:[.2,.25,4.5],fov:44,time:6},
   {id:'dorsal',offset:[.6,4.1,.5],fov:44,time:6},
   {id:'stroke-raised',offset:[3.3,1.6,3.6],fov:44,time:7.7},
   {id:'far-oblique',offset:[12,6,13],fov:12,time:6}
  ];
  for(const original of configs){
   const config={...original,fov:touch?(original.id==='far-oblique'?24:84):original.fov};
   const image=await page.evaluate(async config=>{
    const {f,batches}=__turtleInspection;updateLife(config.time);renderer.photoFov=config.fov;renderer.photoNear=.08;
    const s=Math.sin(f.yaw),c=Math.cos(f.yaw),d=config.offset,at=[f.p[0]+c*d[0]+s*d[2],f.p[1]+d[1],f.p[2]-s*d[0]+c*d[2]];
    await renderer.sceneStream.ready(at);for(let i=0;i<3;i++)renderer.render(at,f.p,config.time);
    const g=renderer.gl,w=g.drawingBufferWidth,h=g.drawingBufferHeight,bytes=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,bytes);
    let sum=0,max=0;for(let i=0;i<bytes.length;i+=4){sum+=bytes[i]+bytes[i+1]+bytes[i+2];max=Math.max(max,bytes[i],bytes[i+1],bytes[i+2]);}
    return {id:config.id,time:config.time,eye:at,p:f.p.slice(),yaw:f.yaw,fov:config.fov,gl:g.getError(),cameraInRock:OceanRockContact.overlaps(at,.08),draws:batches.map(b=>b.drawCount),mean:sum/(w*h*3),max,png:renderer.canvas.toDataURL('image/png')};
   },config);
   const file=out.replace(/\.json$/, '')+'-'+config.id+'.png';fs.writeFileSync(file,Buffer.from(image.png.split(',')[1],'base64'));delete image.png;image.file=file;report.views.push(image);save();
   assert.equal(image.gl,0);assert.equal(image.cameraInRock,false,'Inspection camera inside rock');assert(image.mean>1&&image.max>30);assert(image.draws.some(n=>n>0),'Actual turtle was not submitted');console.log('PASS '+profile+' '+config.id);
  }
  report.motion=await page.evaluate(async()=>{
   const {f,batches}=__turtleInspection,g=renderer.gl,rows=[],period=2*Math.PI/1.45,intervals=Math.ceil(period*60);renderer.photoFov=renderer.mobile?84:44;
   for(let i=0;i<=intervals;i++){
    const time=9+i*period/intervals;updateLife(time);const s=Math.sin(f.yaw),c=Math.cos(f.yaw),at=[f.p[0]+c*3.3+s*3.6,f.p[1]+1.6,f.p[2]-s*3.3+c*3.6];
    await renderer.sceneStream.ready(at);const ok=renderer.render(at,f.p,time),size=32,bytes=new Uint8Array(size*size*4);g.readPixels(Math.floor(g.drawingBufferWidth/2)-16,Math.floor(g.drawingBufferHeight/2)-16,size,size,g.RGBA,g.UNSIGNED_BYTE,bytes);
    let max=0;for(let n=0;n<bytes.length;n+=4)max=Math.max(max,bytes[n],bytes[n+1],bytes[n+2]);rows.push({i,time,p:f.p.slice(),draws:batches.map(b=>b.drawCount),max,error:g.getError(),submitted:ok!==false});
   }return {frames:rows,period,intervals,stepSeconds:period/intervals,contextLost:g.isContextLost(),quality:renderer.quality,scale:renderer.dynamicScale};
  });
  assert(report.motion.frames.every(f=>f.submitted&&!f.error&&f.max>10&&f.draws.some(n=>n>0)));assert.equal(report.motion.contextLost,false);assert.equal(report.motion.quality,report.initial.quality);assert.deepEqual(report.errors,[]);
  assert.equal(report.motion.frames.length,report.motion.intervals+1);assert(Math.abs(report.motion.frames.at(-1).time-report.motion.frames[0].time-report.motion.period)<1e-12);
  report.status='passed-controlled-checks-visual-review-required';console.log('PASS '+profile+' '+report.motion.frames.length+' real-pose frames across one complete stroke cycle');
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();}
})();
