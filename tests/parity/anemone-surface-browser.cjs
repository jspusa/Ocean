'use strict';
// Actual production programs, same-context full-render ABBA and full RGBA validation.
// Run alone; fixed scenes diagnose rendering, not natural gameplay or battery.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const opt=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const profile=opt('profile','desktop'),touch=profile==='touch',out=path.resolve(opt('out',path.join(root,'qa/parity/anemone-surface-'+profile+'.json'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pixelsOnly=process.argv.includes('--pixels-only'),failAfterQuery=process.argv.includes('--fail-after-query'),quality=opt('quality','default'),lighting=opt('lighting','day');
assert(!failAfterQuery||!pixelsOnly,'--fail-after-query requires timing mode');
assert(['desktop','touch'].includes(profile));assert(['default','0'].includes(quality));assert(['day','late','blue'].includes(lighting));
const pixelPolicy={id:'accepted-with-tolerance-v1',maxDifference:1,maxDifferingChannelRatio:1e-5,exactControls:'baseline repeat, zero target draws, and default quality/day',diffCoordinates:'Framebuffer lower-left origin; A is first baseline, B is current image'};
const views=[{id:'peak',p:[-13.25069968,-6.14165072,9.83454219],aim:[-13.03751449,-6.23152927,8.86167328],t:9.4667},{id:'near',p:[-5.6,-9,3.2],aim:[-5.6,-9.3,1],t:9.4667}];
const report={status:'running',profile,pixelsOnly,failAfterQuery,quality,lighting,pixelPolicy,engineSHA256:hash(fs.readFileSync(path.join(root,'src/engine.js'))),harnessSHA256:hash(fs.readFileSync(__filename)),views:[],errors:[],method:'Actual kind3/material3 production fragment program versus the production generic fallback selected by temporarily removing only its map entry. Original vertex shader, geometry, all other programs, camera, frozen time, quality, resolution and MSAA retained. Canonical keep preloaded before measurement, no timed loading. Actual complete-render queries in ABBA order, 25 samples per block, at least four RAF before availability polling. All views timed before any pixel readback. This is controlled rendering evidence, not natural streaming, display FPS or physical-phone evidence. Failed blocks retain completed samples and their failed row; query/map/settings cleanup is attempted and reported separately. --fail-after-query deliberately fails immediately after beginning the second sample query, preserving the first completed sample. Image policy accepted-with-tolerance-v1 permits only candidate max delta 1 and differing-channel ratio at most 1e-5; baseline repeat, zero target draws and default/day remain exact. No pixels are changed or filtered by this comparison. Compiler rounding is a possible explanation for small differences, not a proven cause.'};

const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));};
const stats=a=>{a=a.slice().sort((x,y)=>x-y);return {n:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
(async()=>{let browser,context,page;try{
 browser=await pw.chromium.launch({...require(path.join(root,'tests/parity/browser-launch.cjs'))(true),headless:false});
 context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(({quality,lighting,touch})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:quality==='0'?0:touch?1:2,lighting,adaptive:true,third:false,lamp:false,startWithSound:false,reduced:true}})),{quality,lighting,touch});
 await page.goto('http://127.0.0.1:8765/?still');await page.bringToFront();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
 report.meta=await page.evaluate(({failAfterQuery,pixelPolicy,requireExact})=>{
  const g=renderer.gl,ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),debug=g.getExtension('WEBGL_debug_renderer_info');if(!ext)throw Error('GPU timer unavailable');
  const initial={adaptive:settings.adaptive,third:settings.third,lamp:settings.lamp,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],msaa:renderer.msaaSamples};
  const original=renderer.surfaceProgram,programs=renderer.surfacePrograms,candidate=programs.get('3:3'),fragment=FS.replace('uniform int uKind;','const int uKind=3;').replace('uniform int uMat;','const int uMat=3;');
  if(programs.size!==9||!candidate||renderer.surfaceProgramFailures.size)throw Error('All nine production programs must compile');
  const attached=g.getAttachedShaders(candidate.p).map(s=>({type:g.getShaderParameter(s,g.SHADER_TYPE),source:g.getShaderSource(s)}));
  if(!attached.some(s=>s.type===g.VERTEX_SHADER&&s.source===VS)||!attached.some(s=>s.type===g.FRAGMENT_SHADER&&s.source===fragment))throw Error('Production shaders differ from the original vertex and declaration-only fragment');
  const others=[...programs].filter(([key])=>key!=='3:3');
  const select=enabled=>{if(enabled)programs.set('3:3',candidate);else programs.delete('3:3');if(others.some(([key,p])=>programs.get(key)!==p))throw Error('Other programs changed');};
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const stream=()=>{const s=renderer.sceneStream,k=s.neededRanges(eye).keep;return {jobs:s.jobs.size,active:s.active,queue:s.queue.length,resident:s.meshes.filter(m=>m.resident).map(m=>m.id),keep:[...k].sort((a,b)=>a-b),outside:s.meshes.filter(m=>m.resident&&!m.pinned&&!k.has(m.id)).map(m=>m.id),missingKeep:[...k].filter(id=>!s.meshes[id].resident)};};
  const work=()=>({draws:renderer.drawCalls,triangles:renderer.submittedTriangles,vertices:renderer.submittedVertices,shadowDraws:renderer.shadowDraws,targets:renderer.batches.filter(b=>b.kind===3&&b.material===3).map(b=>({count:b.count,drawn:b.drawCount,visible:b.visible}))});
  const conditions=()=>({eye:eye.slice(),target:target.slice(),t,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[g.drawingBufferWidth,g.drawingBufferHeight],msaa:renderer.msaaSamples,lamp:renderer.lamp,lighting:renderer.lighting,stream:stream()});
  const render=()=>{check(!document.hidden&&document.hasFocus(),'Foreground lost');check(renderer.render(eye,target,t)!==false,'Incomplete render');check(!renderer.pendingResize,'Pending resize');};
  let queryID=0,faultInjected=false;
  const releaseQuery=owned=>{
   const receipt={id:owned.id,ended:false,deleted:false,currentPreserved:false,contextLost:g.isContextLost(),gl:null,errors:[]};let before=null;
   try{
    before=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);if(before===owned.query){g.endQuery(ext.TIME_ELAPSED_EXT);receipt.ended=true;}
    const current=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);check(current!==owned.query,'Owned query is still active');
    g.deleteQuery(owned.query);receipt.deleted=!g.isQuery(owned.query);
    const after=g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY);receipt.currentPreserved=before===owned.query?after===null:after===before;
    if(receipt.deleted&&api.lastQuery===owned)api.lastQuery=null;
   }catch(error){receipt.errors.push(String(error));}
   try{receipt.gl=g.getError();}catch(error){receipt.errors.push(String(error));}
   receipt.ok=!receipt.contextLost&&receipt.deleted&&receipt.currentPreserved&&receipt.gl===0&&!receipt.errors.length;return receipt;
  };
  const api=window.__variant={lastBlock:null,lastQuery:null,lastPreparation:null,lastImages:null,
   async prepare(v){
    const started=performance.now();api.lastPreparation={view:v,phase:'prepare',started};
    select(false);await __prepareView(v.p,v.aim,v.t);const s=renderer.sceneStream,needed=s.neededRanges(eye);
    api.lastPreparation={view:v,phase:'request-keep',started,at:performance.now(),state:stream()};
    await Promise.all([...new Set([...needed.keep].filter(id=>!s.meshes[id].resident).map(id=>s.meshes[id].meta.chunk))].map(id=>s.request(id,1)));
    let previous='',stableAt=performance.now();
    for(;;){await raf();render();const now=performance.now(),state=stream(),key=JSON.stringify(state);
     if(key!==previous||state.jobs||state.active||state.queue||state.outside.length||state.missingKeep.length){stableAt=now;previous=key;}
     api.lastPreparation={view:v,phase:'settling',started,at:now,elapsedMs:now-started,stableMs:now-stableAt,state};
     check(now-started<120000,'Streaming did not settle within 120 seconds');if(now-stableAt>600)break;
    }
    api.lastPreparation.phase='ready';return {conditions:conditions(),work:work(),preparation:api.lastPreparation};
   },
   async block(mode){
    const block=api.lastBlock={mode,status:'running',before:null,work:null,samples:[],error:null};
    try{
     select(mode);for(let i=0;i<15;i++){await raf();render();}
     const before=block.before=conditions(),expected=JSON.stringify(before),w=block.work=work();
     for(let i=0;i<25;i++){
      await raf();const row={index:i,status:'pending',phase:'create',queryId:null,gpuMs:null,disjoint:null,gl:null,work:null,error:null,cleanup:null};block.samples.push(row);let owned=null;
      try{
       check(!g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY),'External elapsed query is active');
       const q=g.createQuery();check(q,'Query allocation failed');owned=api.lastQuery={id:++queryID,query:q};row.queryId=owned.id;row.phase='begin';
       g.beginQuery(ext.TIME_ELAPSED_EXT,q);
       if(failAfterQuery&&!faultInjected&&i===1){faultInjected=true;throw Error('Injected failure after query begin (sample 2)');}
       render();check(g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY)===q,'Elapsed query ownership changed');g.endQuery(ext.TIME_ELAPSED_EXT);row.phase='await-result';
       const deadline=performance.now()+10000;for(let n=0;n<4;n++)await raf();
       while(!g.getQueryParameter(q,g.QUERY_RESULT_AVAILABLE)){check(performance.now()<deadline,'GPU timeout');await raf();}
       Object.assign(row,{gpuMs:g.getQueryParameter(q,g.QUERY_RESULT)/1e6,disjoint:g.getParameter(ext.GPU_DISJOINT_EXT),gl:g.getError(),work:work(),phase:'validate'});
       check(!row.disjoint&&row.gl===0,'Invalid GPU sample');check(JSON.stringify(conditions())===expected,'Conditions changed '+JSON.stringify({before,after:conditions()}));check(JSON.stringify(row.work)===JSON.stringify(w),'Work changed');
       row.status='valid';row.phase='complete';
      }catch(error){row.status='failed';row.error=error.stack||String(error);throw error;}
      finally{if(owned){row.cleanup=releaseQuery(owned);if(!row.cleanup.ok&&!row.error){row.status='failed';row.error='Query cleanup failed';throw Error(row.error);}}}
     }
     block.status='passed';
    }catch(error){block.status='failed';block.error=error.stack||String(error);}
    return block;
   },
   async pixels(view){
    let reference=null;const rows=api.lastImages=[],expected=conditions(),expectedWork=work(),expectedDimensions=expected.resolution;
    for(const mode of [false,true,false]){
     select(mode);render();const dimensions=[g.drawingBufferWidth,g.drawingBufferHeight],bytes=new Uint8Array(dimensions[0]*dimensions[1]*4);
     g.readPixels(0,0,dimensions[0],dimensions[1],g.RGBA,g.UNSIGNED_BYTE,bytes);
     let diff=0,max=0;const differences=[];
     if(reference)for(let i=0;i<bytes.length;i++){const d=Math.abs(bytes[i]-reference[i]);if(d){diff++;if(differences.length<32){const pixel=Math.floor(i/4);differences.push({x:pixel%dimensions[0],y:Math.floor(pixel/dimensions[0]),channel:'RGBA'[i%4],a:reference[i],b:bytes[i]});}}max=Math.max(max,d);}else reference=bytes;
     const actualConditions=conditions(),actualWork=work(),drawn=actualWork.targets.some(target=>target.drawn>0),exact=diff===0&&bytes.length===reference.length,ratio=diff/bytes.length,requiresExact=!mode||requireExact||!drawn;
     const accepted=exact||!requiresExact&&max<=pixelPolicy.maxDifference&&ratio<=pixelPolicy.maxDifferingChannelRatio;
     const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
     const row={mode,dimensions,channelCount:bytes.length,differingChannels:diff,maxDifference:max,differingChannelRatio:ratio,exact,requiresExact,accepted,acceptance:exact?'exact':accepted?'accepted-with-tolerance':'rejected',policy:pixelPolicy.id,differences,rgbaSHA256:digest,gl:g.getError(),conditions:actualConditions,work:actualWork,conditionsMatch:JSON.stringify(actualConditions)===JSON.stringify(expected),workMatches:JSON.stringify(actualWork)===JSON.stringify(expectedWork),dimensionsMatch:JSON.stringify(dimensions)===JSON.stringify(expectedDimensions)};rows.push(row);
     check(row.conditionsMatch&&row.workMatches&&row.dimensionsMatch,'Image conditions, work or dimensions changed');check(view.id!=='near'||drawn,'Near view must draw the anemone');
    }
    return rows;
   },
   snapshot(){return {lastBlock:api.lastBlock,lastQuery:api.lastQuery?{id:api.lastQuery.id}:null,lastPreparation:api.lastPreparation,lastImages:api.lastImages};},
   restore(){
    const receipt={restored:false,query:null,map:false,settings:false,gl:null,contextLost:g.isContextLost(),errors:[]};
    if(api.lastQuery)receipt.query=releaseQuery(api.lastQuery);
    try{select(true);receipt.map=renderer.surfaceProgram===original&&programs.size===9&&programs.get('3:3')===candidate;}catch(error){receipt.errors.push(String(error));}
    try{check(!g.getQuery(ext.TIME_ELAPSED_EXT,g.CURRENT_QUERY),'Cannot render during external query');render();}catch(error){receipt.errors.push(String(error));}
    finally{settings.adaptive=initial.adaptive;settings.third=initial.third;settings.lamp=initial.lamp;receipt.settings=settings.adaptive===initial.adaptive&&settings.third===initial.third&&settings.lamp===initial.lamp;}
    try{receipt.gl=g.getError();}catch(error){receipt.errors.push(String(error));}
    receipt.restored=receipt.map&&receipt.settings&&!api.lastQuery&&!receipt.contextLost&&receipt.gl===0&&!receipt.errors.length&&(!receipt.query||receipt.query.ok);return receipt;
   }
  };settings.adaptive=false;settings.third=false;settings.lamp=false;
  return {initial,programs:programs.size,shaderSourcesVerified:true,hardware:debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
 },{failAfterQuery,pixelPolicy,requireExact:quality==='default'&&lighting==='day'});assert(report.meta.hardware&&!/swiftshader|software|llvmpipe/i.test(report.meta.hardware));assert.equal(report.meta.initial.quality,quality==='0'?0:touch?1:2,'Actual initial quality must match CLI');assert.equal(report.meta.initial.scale,1,'Initial scale must be 1');assert.equal(report.meta.initial.adaptive,true,'Initial adaptive setting must be enabled');save();
 for(const view of views){const row={view,prepared:await page.evaluate(v=>__variant.prepare(v),view),blocks:[]};report.views.push(row);assert.equal(row.prepared.conditions.lighting,lighting,'Actual prepared lighting must match CLI');for(const mode of pixelsOnly?[]:[false,true,true,false]){const block=await page.evaluate(m=>__variant.block(m),mode);block.gpuMs=stats(block.samples.filter(s=>s.status==='valid').map(s=>s.gpuMs));row.blocks.push(block);save();if(block.status!=='passed')throw Error(block.error||'Timing block failed');console.log(view.id+' '+mode+' '+JSON.stringify(block.gpuMs));}if(!pixelsOnly)row.comparison={original:stats(row.blocks.filter(b=>!b.mode).flatMap(b=>b.samples.map(s=>s.gpuMs))),candidate:stats(row.blocks.filter(b=>b.mode).flatMap(b=>b.samples.map(s=>s.gpuMs)))};if(!pixelsOnly){assert.deepEqual(row.blocks.map(b=>b.work),Array(4).fill(row.blocks[0].work));assert.deepEqual(row.blocks.map(b=>b.before),Array(4).fill(row.blocks[0].before));}}
 for(const row of report.views){row.imagePreparation=await page.evaluate(v=>__variant.prepare(v),row.view);assert.equal(row.imagePreparation.conditions.lighting,lighting,'Actual image lighting must match CLI');row.images=await page.evaluate(v=>__variant.pixels(v),row.view);assert(row.images.every(i=>i.accepted&&i.gl===0),'Pixel policy rejected image difference');save();}
 assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack||String(error);}
 finally{
  if(page&&!page.isClosed()){
   if(report.status!=='passed')try{report.partial=await page.evaluate(()=>window.__variant?.snapshot()||null);}catch(error){report.partialCaptureError=String(error);}
   try{report.restore=await page.evaluate(()=>window.__variant?__variant.restore():{restored:true,notInstalled:true});if(!report.restore.restored){report.status='failed';report.failure??='Harness restoration failed';}}catch(error){report.restore={restored:false,error:String(error)};report.status='failed';report.failure??=String(error);}
  }
  try{if(context)await context.close();}catch(error){report.contextCloseError=String(error);report.status='failed';report.failure??=String(error);}
  try{if(browser)await browser.close();}catch(error){report.browserCloseError=String(error);report.status='failed';report.failure??=String(error);}
  save();if(report.status!=='passed'){console.error(report.failure);process.exitCode=1;}
 }
})().catch(error=>{report.status='failed';report.failure??=error.stack||String(error);save();console.error(error);process.exitCode=1;});
