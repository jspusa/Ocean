/* Fixed-resolution native complete-frame timing of the changed coastal LOD
 * policy. ABBA separate contexts; no physical-phone/FPS/battery claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arg=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const urls={before:arg('before','http://127.0.0.1:8765/qa/parity/v01851-environment/baseline-v50/'),after:arg('after','http://127.0.0.1:8765/')};
const out=path.resolve(__dirname,'../..',arg('out','qa/parity/v01851-environment/coastal-render-cost.json'));
const report={status:'running',urls,method:'Installed native Chrome GPU; fixed actual camera/time/resolution/MSAA/quality. ABBA contexts with 90 warm and 48 complete-frame timer queries per view. Actual streaming residency and submitted triangles included. Touch is emulation on this computer, not phone FPS/power.',rows:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const profile of [{id:'desktop',touch:false,quality:2},{id:'touch',touch:true,quality:1},{id:'touch-low',touch:true,quality:0}])for(const variant of ['before','after','after','before']){
   const context=await browser.newContext({viewport:profile.touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:profile.touch?3:2,isMobile:profile.touch,hasTouch:profile.touch});
   try{
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(urls[variant]+'?still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
    await page.evaluate(q=>{settings.adaptive=false;settings.quality=q;renderer.quality=q;renderer.dynamicScale=1;renderer.resize();},profile.quality);
    const rows=await page.evaluate(async()=>{
     const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info');if(!ext)throw Error('Native GPU timer unavailable');
     const hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('Hardware GPU required');
     const raf=()=>new Promise(requestAnimationFrame),rows=[];
     for(const view of [{id:'shallow-witness',x:-236.606,z:-36.667},{id:'deep-coastal-floor',x:-149.333,z:-327.576},{id:'reef-control',p:[0,-8,7],aim:[0,-8,-10]}]){
      const p=view.p||[view.x,groundHeight(view.x,view.z)+4,view.z],aim=view.aim||[view.x,groundHeight(view.x,view.z+8)+.7,view.z+8];
      await __prepareView(p,aim,8);while(renderer.sceneStream.jobs.size)await raf();
      const actualEye=eye.slice(),actualTarget=target.slice();
      const renderFrame=()=>{const before=renderer.frame,result=renderer.render(eye,target,8);if(result===false||renderer.frame!==before+1)throw Error('Incomplete streamed render cannot be a timing sample');};
      for(let i=0;i<90;i++){renderFrame();await raf();}
      const gpuMs=[],cpuMs=[];for(let i=0;i<48;i++){
       await raf();const query=g.createQuery();g.beginQuery(ext.TIME_ELAPSED_EXT,query);const start=performance.now();renderFrame();cpuMs.push(performance.now()-start);g.endQuery(ext.TIME_ELAPSED_EXT);g.flush();
       const end=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>end)throw Error('GPU query did not complete');await raf();}
       if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU sample');gpuMs.push(g.getQueryParameter(query,g.QUERY_RESULT)/1e6);g.deleteQuery(query);
      }
      rows.push({view:view.id,p,aim,actualEye,actualTarget,version:document.documentElement.dataset.version,hardware,gpuMs,cpuMs,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,draws:renderer.drawCalls,triangles:renderer.submittedTriangles,groundNear:renderer.batches.filter(b=>b.material===1&&!b.minDistance&&b.drawCount).length,residentGeometryBytes:renderer.sceneLoad.residentGeometryBytes,gl:g.getError(),lost:g.isContextLost()});
     }return rows;
    });
    for(const row of rows){assert.equal(row.version,variant==='before'?'0.18.50':'0.18.51');assert.equal(row.gl,0);assert(!row.lost);assert.equal(row.scale,1);report.rows.push({profile:profile.id,variant,...row});}
    console.log('PASS native coastal cost '+profile.id+' '+variant);save();
   }finally{await context.close();}
  }
  const median=a=>a.slice().sort((a,b)=>a-b)[a.length>>1];report.summary=[];
  for(const profile of ['desktop','touch','touch-low'])for(const view of ['shallow-witness','deep-coastal-floor','reef-control']){
   const rows=report.rows.filter(r=>r.profile===profile&&r.view===view),a=rows[0];for(const row of rows)for(const key of ['p','aim','actualEye','actualTarget','resolution','quality','scale','msaa'])assert.deepEqual(row[key],a[key],key+' must be matched');
   const summarize=variant=>{const group=rows.filter(r=>r.variant===variant);return {gpuMedianMs:median(group.flatMap(r=>r.gpuMs)),cpuMedianMs:median(group.flatMap(r=>r.cpuMs)),triangles:group.map(r=>r.triangles),residentGeometryBytes:group.map(r=>r.residentGeometryBytes)};};
   report.summary.push({profile,view,before:summarize('before'),after:summarize('after')});
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{save();await browser?.close();console.log(JSON.stringify({status:report.status,failure:report.failure}));}
})();
