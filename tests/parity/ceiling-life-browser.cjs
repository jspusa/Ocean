/* Full-world browser CPU differential. Run serially after the parent
 * releases GPU ownership. Only ordinary boot/optional asset preparation draws;
 * all timed work is the real updateLife with RAF/rendering explicitly frozen.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const arg=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const urls={before:arg('before','http://127.0.0.1:8766/'),after:arg('after','http://127.0.0.1:8765/')};
const out=path.resolve(arg('out',path.resolve(__dirname,'../../qa/parity/ceiling-life-browser.json')));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const report={status:'running',urls,method:'Real browser native Math and actual booted complete-world updateLife; software WebGL is used only for boot and identical optional Barramundi preparation. RAF is frozen by ?still, player inactive/reactive behavior off, renderer is guarded and frame count must remain unchanged during CPU fixtures. Exact complete allLife/shoal own-state snapshots at forward/repeated/rewound times, regional roof field/boundary queries, and separately fetched src/regions.js bytes matched to the actual loaded script response. CPU wall-time inside synchronous updateLife only: two warm rounds then six alternating A/B rounds of120 updates, each round replays identical20+i/60 timestamps. No GPU raster, display FPS, real-phone or battery claim.',rounds:6,steps:120,contexts:{},parity:[],timing:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const median=a=>a.slice().sort((a,b)=>a-b)[a.length>>1];
(async()=>{let browser;const worlds={};
 try{
  save();browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const variant of ['before','after']){
   const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:false,hasTouch:false}),page=await context.newPage();worlds[variant]={context,page};
   const sources=[],sourceReads=[];
   page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/src/regions.js'))sourceReads.push((async()=>{const bytes=await response.body();sources.push({url:response.url(),status:response.status(),bytes:bytes.length,sha256:hash(bytes),text:bytes.toString('utf8')});})());});
   page.on('pageerror',error=>report.errors.push({variant,type:'pageerror',message:error.message}));
   page.on('console',message=>{if(message.type()==='error')report.errors.push({variant,type:'console',message:message.text()});});
   await page.addInitScript(()=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:2,adaptive:false,startWithSound:false,reduced:true,third:false,lamp:false}})));
   await page.goto(urls[variant]+(urls[variant].includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
   // The optional species is normally requested on dive entry, not by boot.
   // Explicitly request/coalesce the same preparation on both sides, then wait
   // for its real bounded ready/error terminal state before any comparison.
   await page.evaluate(()=>{window.__freeze=true;active=false;player.velocity=[0,0,0];settings.adaptive=false;void oceanBarramundi.load(renderer);});
   await page.waitForFunction(()=>['ready','error'].includes(oceanBarramundi.status(renderer).state),null,{timeout:45000});
   await Promise.all(sourceReads);assert.equal(sources.length,1,'one actual regions script must be loaded');assert.equal(sources[0].status,200);
   const fetched=await page.request.get(new URL('src/regions.js?ceiling_browser_source='+Date.now(),urls[variant]).href),bytes=await fetched.body();assert.equal(fetched.status(),200);assert.equal(hash(bytes),sources[0].sha256,'separate fetch must match actual loaded regions bytes');
   const sourceProof=await page.evaluate(()=>({ceiling:OceanRegions.ceilingAt.toString(),nativeMath:['sin','cos','atan2','hypot','sqrt'].every(name=>/\[native code\]/.test(Math[name].toString()))}));
   assert(sources[0].text.includes(sourceProof.ceiling),'executing ceilingAt must be from the loaded source');assert(sourceProof.nativeMath,'browser fixture must use native Math rather than a VM host wrapper');
   const metadata=await page.evaluate(()=>{
    const g=renderer.gl,debug=g.getExtension('WEBGL_debug_renderer_info');
    const canonical=value=>{
     if(value===undefined)return {$number:'undefined'};
     if(typeof value==='number'){if(Number.isNaN(value))return {$number:'NaN'};if(value===Infinity)return {$number:'Infinity'};if(value===-Infinity)return {$number:'-Infinity'};if(Object.is(value,-0))return {$number:'-0'};return value;}
     if(value===null||typeof value!=='object')return value;
     if(Array.isArray(value))return value.map(canonical);
     if(ArrayBuffer.isView(value))return {$typed:value.constructor.name,values:Array.from(value,canonical)};
     const out={};for(const key of Object.keys(value).sort())out[key]=canonical(value[key]);return out;
    };
    window.__ceilingLife={canonical,render:renderer.render,frame:renderer.frame,renderCalls:0};
    renderer.render=function(){__ceilingLife.renderCalls++;throw Error('Rendering is forbidden during the CPU fixture');};
    return {version:document.documentElement.dataset.version,worldVersion:OPEN_WORLD.version,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,actors:allLife.length,life:life.length,decor:decorLife.length,shoal:shoal.length,species:SPECIES.map(s=>s.id),actorUIDs:allLife.map(f=>f.uid??null),shoalUIDs:shoal.map(f=>f.uid??null),barramundi:oceanBarramundi.status(renderer),quality:renderer.quality,scale:renderer.dynamicScale,renderer:debug?g.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent,nativeMath:true,active,freeze:window.__freeze,frame:renderer.frame,roofSolids:OceanRegions.solids.filter(s=>s.role==='roof').length,ceilingFunction:OceanRegions.ceilingAt.toString()};
   });
   assert(metadata.compiled&&metadata.streamed);assert(!metadata.active&&metadata.freeze);assert(metadata.actors>0&&metadata.shoal>0&&metadata.roofSolids>0);
   const functionSha=hash(metadata.ceilingFunction);delete metadata.ceilingFunction;
   report.contexts[variant]={metadata,source:{loaded:{...sources[0],text:undefined},separateFetch:{url:fetched.url(),bytes:bytes.length,sha256:hash(bytes)},executingCeilingSHA256:functionSha}};save();
   console.log('READY '+variant+' actual full world: '+metadata.actors+' actors, '+metadata.shoal+' shoal; optional '+metadata.barramundi.state);
  }
  // Release versions/source hashes may differ. World content, optional asset
  // outcome, quality and complete actor identities must match dynamically.
  const keys=['worldVersion','compiled','streamed','actors','life','decor','shoal','species','actorUIDs','shoalUIDs','barramundi','quality','scale','roofSolids'];
  for(const key of keys)assert.deepEqual(report.contexts.after.metadata[key],report.contexts.before.metadata[key],'metadata '+key+' differs');
  const states={before:[],after:[]},times=[0,.008,.016,.055,.25,1,8,19,120,600,7000,3,3];
  for(const time of times){
   const snapshots={};
   for(const variant of ['before','after'])snapshots[variant]=await worlds[variant].page.evaluate(time=>{updateLife(time);return JSON.stringify(__ceilingLife.canonical({allLife,shoal}));},time);
   assert.deepEqual(JSON.parse(snapshots.after),JSON.parse(snapshots.before),'exact complete actor state at '+time);
   for(const variant of ['before','after'])states[variant].push({time,state:JSON.parse(snapshots[variant])});
   report.parity.push({time,sha256:hash(snapshots.before),bytes:Buffer.byteLength(snapshots.before),equal:true});save();
  }
  for(const variant of ['before','after']){const file=out.replace(/\.json$/,`-${variant}-states.json.gz`);fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(states[variant])));report.contexts[variant].stateArtifact={path:file,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file))};}
  const roofs={};
  for(const variant of ['before','after'])roofs[variant]=await worlds[variant].page.evaluate(()=>{
   const roofs=OceanRegions.solids.filter(s=>s.role==='roof'),queries=[],seen=new Set(),add=(x,z,y,omit=false)=>{const q=omit?[x,z]:[x,z,y],key=JSON.stringify(__ceilingLife.canonical(q));if(!seen.has(key)){seen.add(key);queries.push(q);}};
   const ys=[-Infinity,-150,-28.9,-26,0,150,150-1e-11,150+1e-11,151,Infinity,NaN];
   for(let x=-241;x<=-209;x+=2)for(let z=-86;z<=-36;z+=2.5){add(x,z,undefined,true);for(const y of ys)add(x,z,y);}
   const chosen=[];for(let i=0;i<roofs.length;i+=Math.max(1,Math.floor(roofs.length/96)))chosen.push(roofs[i]);if(chosen.at(-1)!==roofs.at(-1))chosen.push(roofs.at(-1));
   for(const s of chosen){const [x0,y0,z0]=s.min,[x1,y1,z1]=s.max,xm=(x0+x1)*.5,zm=(z0+z1)*.5;
    for(const [x,z]of [[x0,z0],[x1,z1],[x0,z1],[x1,z0],[xm,zm],[x0-1e-8,zm],[x1+1e-8,zm],[xm,z0-1e-8],[xm,z1+1e-8]])for(const y of [-Infinity,y0-.001,y0,y1,y1+.001,150,150-1e-11,150+1e-11])add(x,z,y);
   }
   for(const [x,z]of [[0,0],[-217.6,-47.5],[188,-228],[-143,-321],[Infinity,0],[NaN,-60],[-218,Infinity]])for(const y of ys)add(x,z,y);
   const values=queries.map(q=>q.length===2?OceanRegions.ceilingAt(q[0],q[1]):OceanRegions.ceilingAt(q[0],q[1],q[2]));
   return JSON.stringify(__ceilingLife.canonical({roofSolids:roofs.length,boundarySolids:chosen.length,queries,values}));
  });
  assert.deepEqual(JSON.parse(roofs.after),JSON.parse(roofs.before),'roof field, bound and near-horizontal/zero-ray results differ');
  const roofData=JSON.parse(roofs.before),roofFile=out.replace(/\.json$/,'-roof-queries.json.gz');fs.writeFileSync(roofFile,zlib.gzipSync(roofs.before));report.roofs={equal:true,queries:roofData.queries.length,roofSolids:roofData.roofSolids,boundarySolids:roofData.boundarySolids,sha256:hash(roofs.before),artifact:roofFile};save();
  // Every timed round uses exactly the same timestamp sequence. Snapshot
  // collection, source IO, warmup and GPU startup are outside these intervals.
  const batch=async variant=>worlds[variant].page.evaluate(steps=>{const start=performance.now();for(let i=0;i<steps;i++)updateLife(20+i/60);const elapsedMs=performance.now()-start;return {elapsedMs,meanMs:elapsedMs/steps,steps,firstTime:20,lastTime:20+(steps-1)/60,frame:renderer.frame,renderCalls:__ceilingLife.renderCalls,actors:allLife.length,shoal:shoal.length,active,freeze:window.__freeze};},report.steps);
  report.warm=[];for(let warm=0;warm<2;warm++)for(const variant of ['before','after'])report.warm.push({warm,variant,...await batch(variant)});
  for(let round=0;round<report.rounds;round++)for(const variant of round%2?['after','before']:['before','after']){const sample={round,variant,...await batch(variant)};report.timing.push(sample);assert.equal(sample.renderCalls,0);assert.equal(sample.frame,report.contexts[variant].metadata.frame);assert(!sample.active&&sample.freeze);save();console.log('CPU '+variant+' round'+round+' '+sample.meanMs.toFixed(4)+' ms/update');}
  // Both final states must still agree after all repeated timing trajectories.
  const end={};for(const variant of ['before','after'])end[variant]=await worlds[variant].page.evaluate(()=>JSON.stringify(__ceilingLife.canonical({allLife,shoal})));
  assert.deepEqual(JSON.parse(end.after),JSON.parse(end.before),'final actor state after CPU rounds');report.finalState={equal:true,sha256:hash(end.before)};
  const before=report.timing.filter(x=>x.variant==='before').map(x=>x.meanMs),after=report.timing.filter(x=>x.variant==='after').map(x=>x.meanMs);report.summary={beforeMedianMs:median(before),afterMedianMs:median(after),reductionPercent:100*(1-median(after)/median(before)),beforeRoundMs:before,afterRoundMs:after,nativeBrowserCPU:true,gpuRasterTiming:false};
  for(const variant of ['before','after']){report.contexts[variant].final=await worlds[variant].page.evaluate(()=>({frame:renderer.frame,expectedFrame:__ceilingLife.frame,renderCalls:__ceilingLife.renderCalls,gl:renderer.gl.getError(),contextLost:renderer.gl.isContextLost(),active,freeze:window.__freeze}));const f=report.contexts[variant].final;assert.equal(f.frame,f.expectedFrame);assert.equal(f.renderCalls,0);assert.equal(f.gl,0);assert(!f.contextLost);}
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{for(const {context,page}of Object.values(worlds)){await page.evaluate(()=>{if(window.__ceilingLife){renderer.render=__ceilingLife.render;delete window.__ceilingLife;}}).catch(()=>{});await context.close().catch(()=>{});}await browser?.close();save();console.log(JSON.stringify({status:report.status,out,summary:report.summary,failure:report.failure}));}
})();
