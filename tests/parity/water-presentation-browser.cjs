/* Full-render ABBA of the pinned release and current source, not gameplay FPS.
 * Each block loads one fresh context, then identical controlled camera/time,
 * actual habitat geometry, original quality and representative breath points.
 * Serial native GPU only; fixed touch is desktop emulation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),opt=(n,d)=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3)||d;
const url=opt('url','http://127.0.0.1:8765/'),output=path.resolve(root,opt('out','qa/parity/water-presentation-browser.json'));
const base='268dd3c4594a5465d05d9a642a1e09fc9e422fd4',baseline=cp.execFileSync('git',['show',base+':src/engine.js'],{cwd:root,encoding:'utf8'});
const candidate=fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),profile=opt('profile','both'),profiles=profile==='both'?['desktop','touch']:[profile];
const report={url,base,status:'running',profiles:[],errors:[],method:'ABBA whole renderer: pinned v0.18.19 source versus current local engine.js, route-fulfilled before boot. One native context at a time. Fixed production quality, scale 1, camera, time, real habitat, lamp and breath points; no removed fauna. Twenty-five complete GPU render samples after ten warm frames per block and case. Readbacks and PNG capture occur outside timed samples. Median is the mean of the two middle sorted samples for even counts. These are controlled comparisons, not natural exploration or native-phone performance.'};
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const median=a=>{a=a.slice().sort((x,y)=>x-y);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
(async()=>{const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch(require('./browser-launch.cjs')(true));let context;
 try{for(const name of profiles){const touch=name==='touch',row={name,blocks:[]};report.profiles.push(row);
  for(const [block,production]of [false,true,true,false].entries()){
   context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('renderer crash'));
   await page.route('**/src/engine.js?*',route=>route.fulfill({status:200,contentType:'text/javascript',body:production?candidate:baseline}));
   const targetURL=new URL(url);targetURL.searchParams.set('still','');await page.goto(targetURL.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.bringToFront();
   const entry={block,production,cases:[]};row.blocks.push(entry);save();
   for(const id of ['reef','slope','hadal']){
    const result=await page.evaluate(async id=>{
     const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info'),hardware=debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',ext=g.getExtension('EXT_disjoint_timer_query_webgl2');
     if(!hardware||/swiftshader|software|llvmpipe/i.test(hardware)||!ext)throw Error('Native GPU and timer required');
     const original={adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale};
     settings.adaptive=false;settings.third=false;window.__freeze=true;renderer.dynamicScale=1;renderer.resize();
     let camera,aim;
     if(id==='reef'){camera=[0,-8,7];aim=[0,-8,-10];}
     else if(id==='slope'){const f=life.find(f=>f.uid==='frilled_shark-001');aim=animalFocusPoint(f);const n=[Math.sin(f.yaw),0,Math.cos(f.yaw)];camera=V.add(aim,V.mul(n,SPECIES[f.species].size*2.8));if(blocked(camera,aim,.12))camera=V.add(aim,V.mul(n,-SPECIES[f.species].size*2.8));}
     else{const p=OceanTrench.studyPoint('hadal-reference').p;camera=V.add(p,[0,1.4,2.6]);aim=V.add(p,[0,.55,0]);}
     await __prepareView(camera,aim,8);renderer.lamp=true;renderer.lighting='day';renderer.exposure=1.11;renderer.clarity=1;
     const forward=V.norm(V.sub(aim,camera)),right=V.norm(V.cross(forward,[0,1,0]));
     renderer.bubbles=[.20,.40].map((side,i)=>({p:V.add(camera,V.add(V.mul(forward,1.4+i*.6),V.mul(right,side))),r:.024+i*.006,a:0,phase:i}));renderer.bubbleTime=8;renderer.lastBubbleTime=8;
     const raf=()=>new Promise(r=>requestAnimationFrame(r)),draw=()=>renderer.render(camera,aim,8);let warm=0,deadline=performance.now()+60000;
     while(warm<10){await raf();if(draw()!==false&&!renderer.sceneStream?.jobs.size&&!renderer.pendingResize)warm++;else warm=0;if(performance.now()>deadline)throw Error('Warm-up timed out');}
     const samples=[];
     for(let k=0;k<25;k++){await raf();const query=g.createQuery();try{g.beginQuery(ext.TIME_ELAPSED_EXT,query);const start=performance.now();if(draw()===false)throw Error('Incomplete timed frame');const cpuSubmitMs=performance.now()-start;g.endQuery(ext.TIME_ELAPSED_EXT);g.flush();deadline=performance.now()+10000;while(!g.getQueryParameter(query,g.QUERY_RESULT_AVAILABLE)){if(performance.now()>deadline)throw Error('Query timeout');await raf();}if(g.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint sample');samples.push({gpuMs:g.getQueryParameter(query,g.QUERY_RESULT)/1e6,cpuSubmitMs});}finally{g.deleteQuery(query);}}
     draw();const pixels=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,pixels);let max=0,nonzero=0;for(let i=0;i<pixels.length;i+=4){max=Math.max(max,pixels[i],pixels[i+1],pixels[i+2]);if(pixels[i]||pixels[i+1]||pixels[i+2])nonzero++;}
     return {id,hardware,original,camera,aim,time:8,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],volumeResolution:[renderer.volumeW,renderer.volumeH],msaa:renderer.msaaSamples,lamp:renderer.lamp,exposure:renderer.exposure,clarity:renderer.clarity,lighting:renderer.lighting,triangles:renderer.submittedTriangles,draws:renderer.drawCalls,shadowDraws:renderer.shadowDraws,bubbles:renderer.bubbles.length,solarCulled:renderer.sunless??false,samples,max,nonzero,png:renderer.canvas.toDataURL('image/png'),gl:g.getError()};
    },id);
    assert.equal(result.gl,0);assert.equal(result.scale,1);assert.equal(result.quality,touch?1:2);assert(result.max>20&&result.nonzero>200,'Meaningful lit scene required');
    const image=output.replace(/\.json$/,'')+'-'+name+'-'+id+'-'+block+(production?'-current':'-baseline')+'.png';fs.writeFileSync(image,Buffer.from(result.png.split(',')[1],'base64'));delete result.png;result.image=image;entry.cases.push(result);save();console.log(name+' '+id+' '+(production?'current':'baseline')+' '+median(result.samples.map(s=>s.gpuMs)).toFixed(3)+' ms');
   }
   await context.close();context=null;
  }
  row.comparisons=['reef','slope','hadal'].map(id=>{const cases=row.blocks.map(b=>({production:b.production,...b.cases.find(c=>c.id===id)})),fixed=c=>({camera:c.camera,aim:c.aim,time:c.time,quality:c.quality,scale:c.scale,resolution:c.resolution,volumeResolution:c.volumeResolution,msaa:c.msaa,lamp:c.lamp,exposure:c.exposure,clarity:c.clarity,lighting:c.lighting,triangles:c.triangles,draws:c.draws,shadowDraws:c.shadowDraws,bubbles:c.bubbles});for(const c of cases)assert.deepEqual(fixed(c),fixed(cases[0]),'All ABBA conditions must match');const a=median(cases.filter(c=>!c.production).flatMap(c=>c.samples.map(s=>s.gpuMs))),b=median(cases.filter(c=>c.production).flatMap(c=>c.samples.map(s=>s.gpuMs)));return {id,baselineMedianGpuMs:a,currentMedianGpuMs:b,changePercent:(b/a-1)*100};});save();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{await context?.close();await browser.close();save();}
})().catch(e=>{console.error(e);process.exitCode=1;});
