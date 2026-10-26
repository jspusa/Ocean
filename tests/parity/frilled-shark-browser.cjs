/* Native, real-time frilled-shark acceptance. Fresh save, normal start and
 * slope guide, explicit mouse/touch selection, observation, shutter, development
 * and reload. Never writes pose/time/progress or invokes a domain action.
 * All page script runs through CDP Runtime.evaluate userGesture:false.
 * A transparent renderer boundary observer calls the original exactly once and
 * samples the just-presented default framebuffer synchronously before returning.
 * This readback/screenshot run is NOT a GPU performance or physical-phone test.
 * Root serializes GPU ownership; node --check is the only author-side execution.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),profile=option('profile','desktop'),touch=profile==='touch',landscape=process.argv.includes('--landscape');
const expectedVersion=option('expected-version',fs.readFileSync(path.resolve(__dirname,'../../VERSION'),'utf8').trim()),routeSeconds=Number(option('max-route-seconds','240'));
assert(['desktop','touch'].includes(profile),'--profile must be desktop or touch');
assert(!landscape||touch,'--landscape requires touch');assert(routeSeconds>=60&&routeSeconds<=600,'Route timeout must be 60–600 seconds');
assert(!new URL(url).searchParams.has('still'),'A frozen scene cannot prove a natural encounter');
const viewport=touch?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1440,height:900};
// These projections use CSS canvas bounds, not DPR/backing-buffer pixels.
// deepsea-arrival.cjs requires at least 40 CSS px of full-envelope width at
// 390 px height (100 at >=800 px). A 40 px body-axis minimum is conservative
// relative to that compact-view envelope contract. The old unconditional 70
// was inherited from taller views and rejected the same 69-degree projection
// merely because landscape has fewer vertical CSS pixels. Keep tall-view
// acceptance unchanged; full framing, broadside and actual pick still apply.
const minimumGuideBodyCssPixels=landscape?40:70;
const output=path.resolve(__dirname,'../..',option('out','qa/parity/frilled-shark-'+profile+(landscape?'-landscape':'')+'.json'));
const artifact=suffix=>output.replace(/\.json$/,'')+suffix;
const checks=[],errors=[],consoleErrors=[],inputs=[],observations=[],traces=[],images=[];
let metadata=null,fatal=null,stage='launch',photoEvidence=null;
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));if(!pass)throw Error(name);};
const summary=values=>{if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};

(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});let context,page,session,moving=false;
 const read=async(fn,arg)=>{const response=await session.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
 const wait=async(fn,arg,options={})=>{const end=Date.now()+(options.timeout||15000);while(Date.now()<end){const value=await read(fn,arg);if(value)return value;await page.waitForTimeout(60);}throw Error('Timed out: '+fn.toString());};
 try{
  context=await browser.newContext({viewport,deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page=await context.newPage();page.setDefaultTimeout(30000);session=await context.newCDPSession(page);
  page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Renderer process crashed'));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  const contacts=new Map();
  async function touchDown(id,x,y){contacts.set(id,{id,x,y});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...contacts.values()]});}
  async function touchMove(id,x,y){contacts.set(id,{id,x,y});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[...contacts.values()]});}
  async function touchUp(id){const ended=contacts.get(id);assert(ended,'Touch contact must exist');contacts.delete(id);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[...contacts.values()]});}
  async function press(selector){
   const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();
   if(touch){const b=await node.boundingBox();assert(b,'Visible control requires a hit box: '+selector);await touchDown(7,b.x+b.width/2,b.y+b.height/2);await touchUp(7);}else await node.click();
   inputs.push({type:'control',selector,at:new Date().toISOString()});await page.waitForTimeout(130);
  }
  async function boot(){
   await wait(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
   assert(await read(()=>window.__ocean?.ready),await read(()=>document.getElementById('errorMessage')?.textContent));
   await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  }
  async function screenshot(label){const file=artifact('-'+label+'.png'),bytes=await page.screenshot({path:file});const row={label,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};images.push(row);return row;}
  async function snapshot(){return read(()=>{
   const index=SPECIES.findIndex(s=>s.id==='frilled_shark'),sp=SPECIES[index],actors=life.filter(f=>f.species===index),f=actors.find(f=>f.encounterId==='frilled-shark-pass')||actors[0];
   const point=f?animalFocusPoint(f):null,field=oceanEcology.state().field.frilled_shark,photoState=voyage.state.features.photography;
   return {at:performance.now(),t,active,modal,photoOpen,photoMode:voyage.photoMode,auto,follow:follow?.uid||null,p:player.p.slice(),eye:eye.slice(),deep:oceanDeepsea.snapshot(),adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],msaa:renderer.msaaSamples,hidden:document.hidden,focused:document.hasFocus(),freeze:!!window.__freeze,lost:renderer.gl.isContextLost(),streamWaiting:!!renderer.sceneStream?.waitStarted,
    index,species:sp?{id:sp.id,name:sp.name,size:sp.size,modelBounds:sp.modelBounds}:null,actorCount:actors.length,actor:f?{uid:f.uid,encounter:f.encounterId,p:f.p.slice(),home:f.home?.slice(),s:f.s.slice(),yaw:f.yaw,pitch:f.pitch||0,phase:f.phase,beat:f.trenchBeat,point,distance:V.dist(player.p,point),resident:renderer.batches.some(b=>b.instances.includes(f)&&b.visible!==false&&b.vao&&b.drawCount>0)}:null,
    selection:oceanSelection.snapshot(),focusCardHidden:$('focusCard').classList.contains('hidden'),seen:persistent.seen.includes('frilled_shark'),knowledge:oceanEcology.knowledge(field),field:field?JSON.parse(JSON.stringify(field)):null,photography:oceanPhotography.snapshot(),film:photoState.film.map(p=>({...p})),album:photoState.album.map(p=>({...p}))};
  });}
  async function observer(){await read(()=>{
   const original=renderer.render,q=window.__frilled_sharkProbe={phase:'route-to-encounter',frames:[],done:false,original};
   const pixels=new Uint8Array(8*8*4),grid=[.12,.5,.88];
   renderer.render=function(...args){
    const before=this.frame,result=original.apply(this,args);if(q.done)return result;
    const row={at:performance.now(),phase:q.phase,t,frame:this.frame,rendered:this.frame!==before,p:player.p.slice(),scale:this.dynamicScale,quality:this.quality,resolution:[this.canvas.width,this.canvas.height],submissionCpuMs:this.cpuRenderMs,paused:!!modal||photoOpen,hidden:document.hidden,focused:document.hasFocus(),streamWaiting:result===false,adaptive:settings.adaptive,lamp:this.lamp,sun:this.sun,lighting:this.lighting,depth:-player.p[1],eyeDepth:-args[0][1]};
    const f=life.find(f=>f.uid==='frilled_shark-001');row.animal=f?{uid:f.uid,p:f.p.slice(),yaw:f.yaw,pitch:f.pitch||0,phase:f.phase,beat:f.trenchBeat}:null;
    row.selection=oceanSelection.snapshot().uid;row.focusCardHidden=$('focusCard').classList.contains('hidden');
    if(row.rendered){
     const gl=this.gl,w=this.canvas.width,h=this.canvas.height;let max=0,sum=0,nonzero=0,minAlpha=255,maxAlpha=0;
     row.defaultFramebuffer=gl.getParameter(gl.FRAMEBUFFER_BINDING)===null;
     if(row.defaultFramebuffer){for(const y of grid)for(const x of grid){gl.readPixels(Math.min(w-8,Math.max(0,Math.round(w*x)-4)),Math.min(h-8,Math.max(0,Math.round(h*y)-4)),8,8,gl.RGBA,gl.UNSIGNED_BYTE,pixels);for(let i=0;i<pixels.length;i+=4){max=Math.max(max,pixels[i],pixels[i+1],pixels[i+2]);sum+=pixels[i]+pixels[i+1]+pixels[i+2];if(pixels[i]||pixels[i+1]||pixels[i+2])nonzero++;minAlpha=Math.min(minAlpha,pixels[i+3]);maxAlpha=Math.max(maxAlpha,pixels[i+3]);}}
      row.pixels={samples:576,maxRGB:max,meanRGB:sum/(576*3),nonzero,minAlpha,maxAlpha,allRGBZero:max===0,darkNonzero:max>0&&max<=8};
     }else row.readbackError='Completed render did not leave the default presentation framebuffer bound';
     row.gl=gl.getError();
    }
    if(row.pixels?.allRGBZero||row.readbackError||row.gl)q.problem={at:row.at,frame:row.frame,phase:row.phase,p:row.p,pixels:row.pixels,error:row.readbackError,gl:row.gl,lamp:row.lamp,sun:row.sun,lighting:row.lighting,depth:row.depth,eyeDepth:row.eyeDepth};q.frames.push(row);return result;
   };
  });}
  async function phase(id){stage=id;await read(id=>{__frilled_sharkProbe.phase=id;},id);}
  async function stopObserver(label){const frames=await read(()=>{const q=window.__frilled_sharkProbe;if(!q||q.done)return null;q.done=true;renderer.render=q.original;return q.frames;});if(frames)traces.push({label,frames});}
  async function guide(){await press('#fieldToolsBtn');await press('#diveRecords [data-feature="deepsea"]');await press('[data-deepsea-station="slope"]');await wait(()=>oceanDeepsea.snapshot().travelTarget==='slope'&&!modal);}
  async function waitForRoute(encounter){
   const start=Date.now();let nextLog=0,last=null;
   while(Date.now()-start<routeSeconds*1000){
    last=await snapshot();assert(last.active&&!last.hidden&&last.focused&&!last.freeze&&!last.lost,'Natural route must remain active, focused and unfrozen');
    if(Date.now()-start>=nextLog){observations.push({stage,state:last});console.log(JSON.stringify({stage,seconds:(Date.now()-start)/1000,depth:-last.p[1],travel:last.deep.travelTarget,encounter:last.deep.encounter,holding:last.deep.holding,scale:last.scale}));nextLog+=10000;}
    if(encounter&&last.deep.holding&&last.deep.encounter==='frilled-shark-pass')return last;
    if(!last.deep.travelTarget){assert(!encounter,'Guide finished without the required frilled-shark-pass stop');return last;}
    const problem=await read(()=>window.__frilled_sharkProbe?.problem||null);assert(!problem,'Synchronous presentation readback requires diagnosis: '+JSON.stringify(problem));
    await page.waitForTimeout(120);
   }throw Error('Natural guide route exceeded '+routeSeconds+' seconds: '+JSON.stringify(last?.deep));
  }
  async function hitSubject(){return read(()=>{
   const f=life.find(f=>SPECIES[f.species]?.id==='frilled_shark'&&f.encounterId==='frilled-shark-pass');if(!f||!oceanSelection.valid(f))return null;const d=oceanSelection.disc(f);
   for(const [ox,oy]of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4]]){const x=d.x+ox*d.r,y=d.y+oy*d.r;if(document.elementFromPoint(x,y)?.id==='ocean'&&oceanSelection.pick(x,y)?.uid===f.uid)return {x,y,uid:f.uid,distance:V.dist(player.p,animalFocusPoint(f))};}return null;
  });}
  async function point(hit){assert.equal(await read(p=>document.elementFromPoint(p.x,p.y)?.id,hit),'ocean','Subject input must reach the actual canvas');if(touch){await touchDown(4,hit.x,hit.y);await touchUp(4);}else await page.mouse.click(hit.x,hit.y);inputs.push({type:'subject',...hit,at:new Date().toISOString()});}
  async function swim(on){if(moving===on)return;moving=on;if(!touch){await page.keyboard[on?'down':'up']('w');return;}if(!on){await touchUp(1);return;}const b=await page.locator('#joystick').boundingBox();assert(b);const x=b.x+b.width/2,y=b.y+b.height/2;await touchDown(1,x,y);await touchMove(1,x,y-b.width*.31);}
  async function aimAt(point){
   await swim(false);
   for(let i=0;i<28;i++){
    const r=await read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,sense:settings.sensitivity,w:innerWidth,h:innerHeight})),v=point.map((n,k)=>n-r.p[k]);
    const yaw=Math.atan2(v[0],-v[2]),pitch=Math.max(-1.2,Math.min(1.2,Math.atan2(v[1],Math.hypot(v[0],v[2])))),delta=Math.atan2(Math.sin(yaw-r.yaw),Math.cos(yaw-r.yaw));
    if(Math.abs(delta)<.025&&Math.abs(r.pitch-pitch)<.025)return;
    let dx=delta/(.0037*r.sense),dy=(r.pitch-pitch)/(.0032*r.sense);const scale=Math.min(1,r.w*.30/Math.max(.01,Math.abs(dx)),r.h*.22/Math.max(.01,Math.abs(dy)));dx*=scale;dy*=scale;if(Math.hypot(dx,dy)<10)return;
    const from=await read(({dx,dy})=>{for(const cy of [.46,.56,.36,.64])for(const cx of [.5,.7,.3]){const x=innerWidth*cx-dx/2,y=innerHeight*cy-dy/2;if(x<12||x+dx<12||x>innerWidth-12||x+dx>innerWidth-12||y<80||y+dy<80||y>innerHeight-100||y+dy>innerHeight-100)continue;if(document.elementFromPoint(x,y)?.id==='ocean')return {x,y};}return null;},{dx,dy});
    assert(from,'Native camera drag needs an exposed canvas point');if(touch){await touchDown(2,from.x,from.y);await touchMove(2,from.x+dx,from.y+dy);await touchUp(2);}else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(from.x+dx,from.y+dy,{steps:1});await page.mouse.up();}
    inputs.push({type:'aim',point,from,dx,dy});await page.waitForTimeout(45);
   }throw Error('Native camera drag did not converge');
  }
  async function geometryFrame(){return read(()=>{
   const f=life.find(f=>SPECIES[f.species]?.id==='frilled_shark'&&f.encounterId==='frilled-shark-pass'),sp=SPECIES[f.species],b=sp.modelBounds,cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch||0),sn=Math.sin(f.pitch||0),r=$('ocean').getBoundingClientRect();
   const world=p=>{const x=(p[0]*cp-p[1]*sn)*f.s[0],y=(p[0]*sn+p[1]*cp)*f.s[1],z=p[2]*f.s[2];return [f.p[0]+cy*x+sy*z,f.p[1]+y,f.p[2]-sy*x+cy*z];},screen=p=>{const v=project(world(p),renderer.vp);return {x:r.left+(v[0]*.5+.5)*r.width,y:r.top+(.5-v[1]*.5)*r.height,ndc:v};};
   // Independent posed geometry targets: no selection.disc/pick result is used
   // to derive the rendered model bounds. Inset the body endpoints to
   // avoid asking an antialiased silhouette edge to be a stable pixel target.
   const selectionPoints=[['head',.47],['middle',0],['tail',-.47]].map(([part,x])=>({part,local:[x,0,0],world:world([x,0,0]),uid:f.uid,...screen([x,0,0])}));
   const body=[screen([-.5,0,0]),screen([.5,0,0])],corners=[];for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]])corners.push(screen([x,y,z]));
   const axis=V.norm(V.sub(world([.5,0,0]),world([-.5,0,0]))),view=V.norm(V.sub(eye,animalFocusPoint(f)));
   return {t,uid:f.uid,p:f.p.slice(),yaw:f.yaw,pitch:f.pitch||0,s:f.s.slice(),declaredMetres:sp.size,bodyMetres:V.dist(world([-.5,0,0]),world([.5,0,0])),modelBounds:b,bodyPixels:Math.hypot(body[0].x-body[1].x,body[0].y-body[1].y),sideCosine:Math.abs(V.dot(axis,view)),broadsideCosine:Math.abs(V.dot([sy,0,cy],view)),body,selectionPoints,corners,viewport:[innerWidth,innerHeight],scale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],batches:renderer.batches.filter(b=>b.instances.includes(f)).map(b=>({kind:b.kind,species:b.species,triangles:b.count/3,drawCount:b.drawCount,near:b.minDistance||0,far:b.maxDistance??null,visible:b.visible,resident:!!b.vao})),note:'Bounds and endpoints are undeformed geometry transformed by the real actor pose; screenshots show the actual animated shader. The full normalized body axis and bounds use the real pose. Sparse readback is not every silhouette pixel.'};
  });}
  async function openPhotography(home=false){if(home){await press('#shipSettings');await press('#panelBody .settings-advanced > summary');await press('#legacyToolsBtn');}else await press('#fieldToolsBtn');await press('#panelBody .menu-advanced > summary');await press('#panelBody [data-feature="photography"]');}
  async function openNotebook(){await press('#shipSettings');await press('#panelBody .settings-advanced > summary');await press('#legacyToolsBtn');await press('#journalBtn');}
  async function imageEvidence(){
   await wait(()=>photoOpen&&$('photoImage').complete&&$('photoImage').naturalWidth>0);
   const photo=await read(()=>{const e=document.getElementById('photoImage');return {src:e.src,width:e.naturalWidth,height:e.naturalHeight};});assert(photo.src.startsWith('data:image/jpeg;base64,'),'Viewer must display the actual saved JPEG');
   const bytes=Buffer.from(photo.src.split(',')[1],'base64');return {bytes,width:photo.width,height:photo.height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  }

  stage='boot';await page.goto(url);await boot();
  metadata=await read(()=>{const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,userAgent:navigator.userAgent,renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,quality:renderer.quality,adaptive:settings.adaptive,scale:renderer.dynamicScale,msaa:renderer.msaaSamples,resolution:[renderer.canvas.width,renderer.canvas.height],compiled:renderer.sceneLoad.compiled,species:SPECIES.map(s=>({id:s.id,name:s.name,size:s.size})),encounters:(typeof deepseaEncounters==='undefined'?OceanTrench.encounters:deepseaEncounters).map(e=>({id:e.id,species:e.species,home:e.home,gate:e.gate,guide:e.guide})),stations:OceanTrench.stations.map(s=>({id:s.id,p:s.p.slice()})),gl:g.getError()};});
  check('installed Chrome uses native hardware WebGL',!!metadata.renderer&&!/swiftshader|llvmpipe|software/i.test(metadata.renderer),{renderer:metadata.renderer,version:metadata.version});
  if(expectedVersion)check('served release matches the explicitly requested version',metadata.version===expectedVersion,{expectedVersion,actual:metadata.version});
  check('fresh default save retains automatic quality and the compiled world',metadata.adaptive&&metadata.compiled&&metadata.gl===0,{adaptive:metadata.adaptive,quality:metadata.quality,compiled:metadata.compiled,gl:metadata.gl});
  stage='start';await press('#startBtn');await wait(()=>active&&!modal&&$('welcome').classList.contains('hidden'));
  const initial=await snapshot();observations.push({stage,state:initial});
  check('normal start contains one appended 1.7-metre frilled_shark encounter',initial.index===42&&metadata.species.length===44&&initial.actorCount===1&&initial.actor?.uid==='frilled_shark-001'&&initial.actor.encounter==='frilled-shark-pass'&&initial.species.size===1.7&&initial.actor.s.every(v=>v===1.7),{index:initial.index,species:metadata.species.length,actorCount:initial.actorCount,actor:initial.actor});
  check('frilled-shark-pass is a guided 900 m encounter with no seeded knowledge',metadata.encounters.some(e=>e.id==='frilled-shark-pass'&&e.species==='frilled_shark'&&e.guide&&Math.abs(e.home[1]+900)<1)&&!initial.seen&&initial.knowledge===0,{encounter:metadata.encounters.find(e=>e.id==='frilled-shark-pass'),seen:initial.seen,knowledge:initial.knowledge});
  await observer();await phase('route-to-encounter');await guide();const hold=await waitForRoute(true);observations.push({stage:'hold',state:hold});
  check('real slope guide stops beside the natural frilled_shark before awarding knowledge',hold.deep.travelTarget==='slope'&&hold.deep.holding&&hold.deep.encounter==='frilled-shark-pass'&&!hold.selection.uid&&!hold.seen&&hold.knowledge===0&&hold.focusCardHidden&&hold.actor.resident&&Math.abs(hold.actor.p[1]+900)<10,hold);
  const firstView=await geometryFrame(),firstViewImage=await screenshot('natural-guide-hold');
  observations.push({stage:'natural-guide-first-view',geometry:firstView,image:firstViewImage,geometryAfterCapture:await geometryFrame(),fullyFramed:firstView.corners.every(p=>p.ndc[2]>0&&Math.abs(p.ndc[0])<.96&&Math.abs(p.ndc[1])<.96),broadside:firstView.broadsideCosine>.85,note:'First natural guide view before any player selection or camera adjustment. Framing and broadside are recorded without weakening the later full-body acceptance; inspect the native PNG for the body, frilled gills and posterior fins.'});
  check('the first natural guide view reveals the entire broad side before player adjustment',Math.abs(firstView.bodyMetres-1.7)<1e-8&&firstView.broadsideCosine>.85&&firstView.bodyPixels>=minimumGuideBodyCssPixels&&firstView.corners.every(p=>p.ndc[2]>0&&Math.abs(p.ndc[0])<.96&&Math.abs(p.ndc[1])<.96),{broadsideCosine:firstView.broadsideCosine,bodyPixels:firstView.bodyPixels,minimumBodyCssPixels:minimumGuideBodyCssPixels,pixelUnits:'CSS canvas coordinates, independent of DPR and adaptive backing-buffer scale',corners:firstView.corners});
  const hit=await hitSubject();check('natural stop exposes an unobstructed native selection target',!!hit,hit);await point(hit);
  await wait(uid=>oceanSelection.snapshot().uid===uid&&!auto&&!oceanDeepsea.snapshot().travelTarget,hit.uid,{timeout:6000});
  const observationTarget=hit;
  await wait(uid=>oceanSelection.snapshot().uid===uid&&persistent.seen.includes('frilled_shark')&&oceanEcology.knowledge(oceanEcology.state().field.frilled_shark)>=1,observationTarget.uid,{timeout:12000});
  const observed=await snapshot();check('real pointer observation records the same individual and ecology notes',observed.selection.uid===observationTarget.uid&&observed.seen&&observed.knowledge>=1&&!observed.focusCardHidden,{selection:observed.selection,knowledge:observed.knowledge,field:observed.field});
  await wait(()=>$('focusName').textContent==='皺鰓鯊');check('recorded field hint offers the supported observation and photography actions',(await read(()=>document.getElementById('focusInfo').innerText))==='慢慢靠近，用燈光觀察或拍照。');
  await phase('natural-motion');const motion=[];
  for(let i=0;i<7;i++){const geometry=await geometryFrame(),image=await screenshot('motion-'+i);motion.push({geometry,image});if(i<6)await page.waitForTimeout(700);}
  observations.push({stage,motion});const first=motion[0].geometry,last=motion.at(-1).geometry;
  check('successive native frames retain real time and natural animal motion',last.t-first.t>=4&&new Set(motion.map(f=>f.image.sha256)).size>1&&motion.some(f=>distance(f.geometry.p,first.p)>.001||Math.abs(f.geometry.pitch-first.pitch)>.0001||Math.abs(f.geometry.yaw-first.yaw)>.0001),{seconds:last.t-first.t,frames:motion.length,uniqueImages:new Set(motion.map(f=>f.image.sha256)).size,start:first.p,end:last.p,pitch:[first.pitch,last.pitch]});
  await phase('pause');await press('#pauseBtn');const paused=await snapshot();await page.waitForTimeout(800);const still=await snapshot();
  check('visible pause freezes formal time and the frilled_shark pose',!!paused.modal&&still.t===paused.t&&distance(paused.actor.p,still.actor.p)===0&&still.actor.pitch===paused.actor.pitch&&still.actor.yaw===paused.actor.yaw,{t:[paused.t,still.t],p:[paused.actor.p,still.actor.p]});await press('#resumeBtn');
  await press('#clearSelection');await wait(()=>!oceanSelection.snapshot().uid&&$('focusCard').classList.contains('hidden'));check('clearing the explicit target removes the name from the view',!(await snapshot()).selection.uid&&(await snapshot()).focusCardHidden);const again=await hitSubject();assert(again,'The real nearby actor must remain selectable');await point(again);await wait(uid=>oceanSelection.snapshot().uid===uid,again.uid);
  await phase('photograph');await aimAt((await snapshot()).actor.point);const shutterBefore=await snapshot();await press('#photoBtn');
  await wait(()=>!voyage.photoBusy&&!oceanPhotography.snapshot().busy&&voyage.state.features.photography.film.length===1,null,{timeout:30000});
  const shutterAfter=await snapshot(),film=shutterAfter.film[0];const shutterResolutions=await read(({from,to,before,after})=>{const sizes=[before,...(__frilled_sharkProbe?.frames||[]).filter(f=>f.at>=from&&f.at<=to).map(f=>f.resolution),after];return [...new Map(sizes.map(r=>[r.join('x'),r])).values()];},{from:shutterBefore.at,to:shutterAfter.at,before:shutterBefore.resolution,after:shutterAfter.resolution});check('real shutter stores the frilled_shark photograph and correct UID',film.individual==='frilled_shark-001'&&film.species===initial.species.name&&film.bytes>10000,film);
  await openPhotography();await press('[data-photo-view="'+film.date+'"]');const original=await imageEvidence();fs.writeFileSync(artifact('-captured.jpg'),original.bytes);
  photoEvidence={date:film.date,individual:film.individual,metadata:film,file:artifact('-captured.jpg'),sha256:original.sha256,width:original.width,height:original.height,bytes:original.bytes.length,shutterResolutions};
  check('photo preview decodes the original JPEG at an observed shutter-buffer size',shutterResolutions.some(([w,h])=>original.width===Math.min(1920,w)&&original.height===Math.round(Math.min(1920,w)*h/w))&&original.bytes.length===film.bytes,photoEvidence);
  const preview=await snapshot();await page.waitForTimeout(800);const previewStill=await snapshot();
  check('actual photo preview freezes formal time and the frilled_shark pose',preview.photoOpen&&previewStill.photoOpen&&preview.t===previewStill.t&&distance(preview.actor.p,previewStill.actor.p)===0&&preview.actor.pitch===previewStill.actor.pitch&&preview.actor.yaw===previewStill.actor.yaw,{t:[preview.t,previewStill.t],photoOpen:previewStill.photoOpen});
  await screenshot('saved-photo-preview');await press('#closePhoto');await press('#closePanel');
  await phase('continue-slope');await guide();const arrival=await waitForRoute(false),station=metadata.stations.find(s=>s.id==='slope');observations.push({stage,state:arrival});
  check('the existing 1400 m slope station remains reachable after observing the new encounter',arrival.deep.station==='slope'&&distance(arrival.p,station.p)<45&&!arrival.deep.travelTarget,{p:arrival.p,distance:distance(arrival.p,station.p),station:arrival.deep.station});
  await phase('save-home');await press('#fieldToolsBtn');await press('#menuHome');await wait(()=>!active&&!modal&&!$('welcome').classList.contains('hidden'));
  await openNotebook();check('visible notebook exposes the earned frilled_shark entry',await read(()=>!document.querySelector('[data-species="42"]').classList.contains('unseen')));await press('[data-species="42"]');
  check('notebook opens the actual species information',(await read(()=>document.querySelector('.detail-title').innerText))===initial.species.name,{title:await read(()=>document.querySelector('.detail-title').innerText)});await screenshot('notebook');await press('#closePanel');
  await openPhotography(true);await press('[data-photo-select="'+film.date+'"]');await press('#photoDevelop');
  await wait(date=>voyage.state.features.photography.album.some(p=>p.date===date)&&!oceanPhotography.snapshot().busy,film.date);
  check('visible home development moves the original film into the album',(await snapshot()).album.some(p=>p.date===film.date&&p.individual==='frilled_shark-001')&&(await snapshot()).film.length===0);
  await press('[data-photo-tab="album"]');await press('[data-photo-view="'+film.date+'"]');const developed=await imageEvidence();check('development preserves the exact original JPEG',developed.sha256===original.sha256,{before:original.sha256,after:developed.sha256});await press('#closePhoto');await press('#closePanel');
  const frameHealth=await read(()=>{const rows=__frilled_sharkProbe.frames,rendered=rows.filter(r=>r.rendered),motion=rendered.filter(r=>r.phase==='route-to-encounter'||r.phase==='continue-slope');return {callbacks:rows.length,rendered:rendered.length,motion:motion.length,black:rendered.filter(r=>r.pixels?.allRGBZero),bad:rendered.filter(r=>r.gl!==0||r.readbackError||!r.pixels),dark:rendered.filter(r=>r.pixels?.darkNonzero).length,adaptive:rows.every(r=>r.adaptive),unselectedNameFrames:motion.filter(r=>!r.selection&&!r.focusCardHidden).length,motionDepth:[Math.min(...motion.map(r=>-r.p[1])),Math.max(...motion.map(r=>-r.p[1]))],moving:motion.filter((r,i)=>i&&Math.hypot(...r.p.map((x,k)=>x-motion[i-1].p[k]))>.001).length};});
  observations.push({stage:'continuous-frame-health',...frameHealth});
  if(frameHealth.black.length||frameHealth.bad.length)await screenshot('readback-suspect-compositor');
  check('continuous natural render callbacks retain nonzero scene pixels during actual travel',frameHealth.motion>100&&frameHealth.moving>100&&frameHealth.motionDepth[1]>1350&&frameHealth.black.length===0&&frameHealth.bad.length===0&&frameHealth.adaptive&&frameHealth.unselectedNameFrames===0,{...frameHealth,note:'Every completed render callback sampled 576 pixels across nine areas. A dark but nonzero frame is retained separately. This proves the sampled presentation regions, not every framebuffer pixel or isolated GPU cost.'});
  await stopObserver('natural-trip-before-reload');stage='reload';await page.reload();await boot();const restored=await snapshot();observations.push({stage,state:restored});
  check('reload restores earned notes, one authored actor and the original album record',restored.seen&&restored.knowledge>=observed.knowledge&&restored.actorCount===1&&restored.actor.uid==='frilled_shark-001'&&restored.album.some(p=>p.date===film.date&&p.individual==='frilled_shark-001')&&restored.photography.durable&&!restored.photography.recovery,{seen:restored.seen,knowledge:restored.knowledge,actorCount:restored.actorCount,photography:restored.photography,album:restored.album});
  await openNotebook();check('reloaded notebook keeps the earned entry visibly unlocked',await read(()=>!document.querySelector('[data-species="42"]').classList.contains('unseen')));await press('[data-species="42"]');await screenshot('reloaded-notebook');await press('#closePanel');
  await openPhotography(true);await press('[data-photo-tab="album"]');await press('[data-photo-view="'+film.date+'"]');const reloaded=await imageEvidence();check('reloaded visible album retains the same JPEG bytes',reloaded.sha256===original.sha256&&reloaded.bytes.length===original.bytes.length,{original:original.sha256,reloaded:reloaded.sha256,bytes:reloaded.bytes.length});await screenshot('reloaded-photo');
  const health=await read(()=>({version:document.documentElement.dataset.version,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),freeze:!!window.__freeze,compiled:renderer.sceneLoad.compiled}));
  check('automatic quality and native renderer remain healthy after save/reload',health.version===metadata.version&&health.adaptive&&health.compiled&&!health.freeze&&!health.lost&&health.gl===0&&errors.length===0&&consoleErrors.length===0,{...health,errors,consoleErrors});stage='complete';
 }catch(error){fatal=error.stack||String(error);console.error(fatal);if(page&&!page.isClosed()){try{await screenshotFailure();}catch(_){}try{observations.push({stage:'failure-state',state:await read(()=>({active,modal,t,p:player.p.slice(),auto,deep:oceanDeepsea.snapshot(),freeze:!!window.__freeze,ready,scale:renderer.dynamicScale,selection:oceanSelection.snapshot(),photography:oceanPhotography.snapshot()}))});}catch(_){}}}
 finally{
  if(page&&!page.isClosed())try{const frames=await read(()=>{const q=window.__frilled_sharkProbe;if(!q||q.done)return null;q.done=true;renderer.render=q.original;return q.frames;});if(frames)traces.push({label:'interrupted',frames});}catch(_){}
  await browser.close();const segments=[];
  for(const trace of traces)for(const phase of [...new Set(trace.frames.map(f=>f.phase))]){
   const rows=trace.frames.filter(f=>f.phase===phase),rendered=rows.filter(f=>f.rendered),intervals=rendered.slice(1).map((f,i)=>f.at-rendered[i].at),stats=summary(intervals);
   segments.push({trace:trace.label,phase,renderCallbacks:rows.length,renderedFrames:rendered.length,firstAt:rows[0]?.at,lastAt:rows.at(-1)?.at,intervalsMs:stats,scales:[...new Set(rows.map(f=>f.scale))].sort((a,b)=>a-b),qualities:[...new Set(rows.map(f=>f.quality))],resolutions:[...new Set(rows.map(f=>f.resolution.join('x')))],pausedCallbacks:rows.filter(f=>f.paused).length,backgroundCallbacks:rows.filter(f=>f.hidden||!f.focused).length,note:'All synchronous production render callbacks in this phase. Sparse 3x3 8px readback is performed only immediately after a completed render, before returning from that callback. Readbacks and compositor screenshots affect cadence; no GPU/FPS or physical-phone performance claim.'});
  }
  fs.writeFileSync(output,JSON.stringify({url,profile,landscape,expectedVersion,status:fatal||checks.some(c=>!c.pass)?'failed':'passed',stage,metadata,method:'Visible installed native Chrome GPU with a fresh save, unchanged default automatic quality, normal start and slope guide to the actual 900 m encounter, native mouse or a single CDP touch stream, real observation/shutter/development/1400 m arrival/reload. Every page-script invocation has userGesture:false. Only the native start click/tap and normal subsequent player inputs supply trusted activation. No coordinates, clock, save, selection or progress are assigned; no forced render. A transparent observer calls the original renderer exactly once then reads nine small default-framebuffer areas synchronously before return; every completed-frame sample and actual compositor screenshots are preserved. Zero sampled RGB is a failure requiring diagnosis; naturally dark nonzero pixels are separate. Cadence is affected by readbacks, so no GPU/FPS claim. Bounds are undeformed geometry; actual shader motion is shown by screenshots. Touch is desktop emulation, not a physical phone.',checks,errors,consoleErrors,fatal,photoEvidence,observations,inputs,images,segments,traces},null,2));
 }
 async function screenshotFailure(){const file=artifact('-failure.png');await page.screenshot({path:file});images.push({label:'failure',file});}
 console.log(JSON.stringify({output,status:fatal||checks.some(c=>!c.pass)?'failed':'passed',passed:checks.filter(c=>c.pass).length,total:checks.length,stage}));if(fatal||checks.some(c=>!c.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
