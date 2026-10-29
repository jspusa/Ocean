/* Same-context ABBA complete-frame GPU diagnostic with the one new fish hidden
 * or visible. Run alone. It measures incremental rendering, not network/compile
 * admission, FPS, physical-phone performance, or battery use. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'qa/parity/v01843-textured-fauna/render-cost.json'),report={status:'running',method:'Native Chrome full scene, fixed camera/time/quality/residency, ABBA hidden/visible added fish. All query samples retained; no readback/screenshots during measurement. Touch is emulated.',profiles:[]};
const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');let browser;
(async()=>{try{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,hasTouch:touch,isMobile:touch}),page=await context.newPage();
  try{
   await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#startBtn').click();await page.waitForFunction(()=>oceanBarramundi.status(renderer).ready,null,{timeout:20000});
   const row=await page.evaluate(async()=>{
    window.__freeze=true;settings.adaptive=false;active=true;const gl=renderer.gl,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info'),raf=()=>new Promise(r=>requestAnimationFrame(r));
    if(!ext)throw Error('GPU timing unavailable');const hardware=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;if(!hardware||/swiftshader|software/i.test(hardware))throw Error('Native GPU required');
    t=40;updateLife(t);const f=life.find(f=>f.barramundi),batch=renderer.batches.find(b=>b.instances.includes(f)),camera=[f.p[0]+Math.sin(f.yaw)*1.8,f.p[1]+.2,f.p[2]+Math.cos(f.yaw)*1.8],aim=f.p.slice();player.p=camera.slice();renderer.photoFov=55;renderer.forceShadow=true;
    await renderer.sceneStream.ready(camera);const stream=renderer.sceneStream,keep=stream.neededRanges(camera).keep,started=performance.now();let stable=0,previous=null;
    const residency=()=>JSON.stringify(stream.meshes.filter(m=>m.resident).map(m=>m.id));
    while(stable<3){await raf();renderer.render(camera,aim,t);const current=residency(),pending=stream.jobs.size||stream.queue.length||stream.active||stream.requiredMissing.size||stream.meshes.some(m=>m.resident&&!m.pinned&&!keep.has(m.id));stable=!pending&&current===previous&&!renderer.forceShadow&&!renderer._shadowMapDirty?stable+1:0;previous=current;if(performance.now()-started>25000)throw Error('Scene did not settle');}
    const identity=residency(),result={hardware,asset:oceanBarramundi.status(renderer),resolution:[renderer.canvas.width,renderer.canvas.height],quality:renderer.quality,scale:renderer.dynamicScale,scene:{camera,aim,time:t,uid:f.uid,triangles:batch.count/3},blocks:[]};
    for(const visible of [false,true,true,false]){
     batch.visible=visible;for(let i=0;i<8;i++){await raf();renderer.render(camera,aim,t);}
     const block={visible,samples:[]};result.blocks.push(block);
     for(let i=0;i<25;i++){
      await raf();const q=gl.createQuery();let ended=false;
      try{gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const start=performance.now(),submitted=renderer.render(camera,aim,t),cpuMs=performance.now()-start;gl.endQuery(ext.TIME_ELAPSED_EXT);ended=true;const sample={cpuMs,submitted:submitted!==false,drawCalls:renderer.drawCalls,shadowDraws:renderer.shadowDraws,fishDrawCount:batch.drawCount,residencySame:residency()===identity,status:'pending'};block.samples.push(sample);const deadline=performance.now()+3000;while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)&&performance.now()<deadline)await raf();if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))sample.status='timeout';else if(gl.getParameter(ext.GPU_DISJOINT_EXT))sample.status='disjoint';else{sample.status='valid';sample.gpuMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;}if(!sample.submitted||!sample.residencySame||gl.getError())sample.status='invalid';}
      finally{if(!ended)gl.endQuery(ext.TIME_ELAPSED_EXT);gl.deleteQuery(q);}
     }
    }
    return result;
   });
   row.profile=touch?'touch':'desktop';report.profiles.push(row);save();const samples=row.blocks.flatMap(b=>b.samples);assert(samples.every(s=>s.status==='valid'),'Invalid GPU sample');
   const stats=visible=>{const values=row.blocks.filter(b=>b.visible===visible).flatMap(b=>b.samples.map(s=>s.gpuMs)).sort((a,b)=>a-b);return {n:values.length,medianMs:values[Math.floor(values.length/2)],p95Ms:values[Math.floor(values.length*.95)]};};row.hidden=stats(false);row.visible=stats(true);row.deltaMedianMs=row.visible.medianMs-row.hidden.medianMs;save();
  }finally{await context.close();}
 }
 report.status='passed';save();console.log(JSON.stringify({status:report.status,profiles:report.profiles.map(r=>({profile:r.profile,hidden:r.hidden,visible:r.visible,deltaMedianMs:r.deltaMedianMs}))}));
}finally{await browser?.close();}})().catch(e=>{report.status='failed';report.failure=e.stack;save();console.error(e);process.exitCode=1;});
