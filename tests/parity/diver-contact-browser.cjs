/* Native whole-world inspection. Entry uses real controls; the rock witness is
 * an explicit controlled placement, not a claim about a natural play session. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const option=(k,f)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||f;
const profile=option('profile','desktop'),legacy=process.argv.includes('--legacy'),out=path.resolve(option('out','qa/parity/v01844-diver/native-'+profile+'.json'));
const report={status:'running',profile,legacy,checks:[],errors:[],method:'Installed native Chrome GPU; real entry and keyboard/touch controls followed by an explicit actual-world rock placement. Camera-only screenshots, real compiled diver and animation. Touch is desktop emulation, not a physical phone or battery measurement.'};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const touch=profile==='touch';
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const required=['src/player_contact.js','src/app.js','src/voyage.js','src/ship.js','src/trench.js','assets/scene/index.json'],responses=[],loaded={};
  page.on('response',response=>{const name=required.find(p=>new URL(response.url()).pathname.endsWith('/'+p));if(name)responses.push(response.body().then(bytes=>{loaded[name]={bytes:bytes.length,sha256:sha(bytes)};}));});
  const url=new URL(option('url','http://127.0.0.1:8765/')),documentResponse=await page.goto(url.href);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  await Promise.all(responses);const documentBytes=await documentResponse.body();report.delivery={document:{bytes:documentBytes.length,sha256:sha(documentBytes)},loaded};
  if(!legacy){assert.equal(sha(documentBytes),sha(fs.readFileSync(path.join(root,'index.html'))),'actual HTTP document is the candidate');for(const file of required)assert.equal(loaded[file]?.sha256,sha(fs.readFileSync(path.join(root,file))),'actual loaded bytes '+file);}
  report.initial=await page.evaluate(()=>({adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,version:document.documentElement.dataset.version,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed}));
  assert(report.initial.adaptive&&report.initial.compiled&&report.initial.streamed);assert.equal(report.initial.quality,touch?1:2);
  const entry=page.locator('#startBtn');if(touch)await entry.tap();else await entry.click();
  await page.waitForFunction(()=>active);await page.waitForTimeout(800);
  report.checks.push({name:'Real entry is active with automatic quality',passed:await page.evaluate(()=>active&&settings.adaptive)});
  const before=await page.evaluate(()=>player.p.slice());
  if(touch){const cdp=await context.newCDPSession(page),box=await page.locator('#joystick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height*.2}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.keyboard.down('KeyW');await page.waitForTimeout(600);await page.keyboard.up('KeyW');}
  const after=await page.evaluate(()=>player.p.slice());assert(Math.hypot(...after.map((v,i)=>v-before[i]))>.02);report.checks.push({name:'Ordinary '+(touch?'touch joystick':'keyboard')+' swim input moves the player',passed:true,before,after});
  report.setup=await page.evaluate(async legacy=>{
   const g=renderer.gl,ext=g.getExtension('WEBGL_debug_renderer_info'),hardware=ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
   if(!hardware||/swiftshader|llvmpipe|software/i.test(hardware))throw Error('Native GPU required');
   window.__freeze=true;settings.third=true;auto=false;follow=null;resetInput();
   const normal=[.53459202150954,.8440941594690159,-.041429705389237924],from=[-9.26135443333204,-10.314916159002705,1.3035874453487086];
   player.yaw=Math.atan2(-normal[0],normal[2]);player.pitch=Math.asin(-normal[1]);
   player.p=collide(V.add(from,V.mul(normal,1.8)));if(!legacy)OceanDiverContact.reset();
   updateCamera(1/60);window.__diverWitness={normal,from,positions:[]};
   document.getElementById('welcome').classList.add('hidden');document.getElementById('hud').classList.add('hidden');
   return {hardware,count:diverBatch.count,vertexCount:diverBatch.vertexCount,scale:diverBatch.instances[0].s.slice(),position:player.p.slice()};
  },legacy);save();
  report.motion=await page.evaluate(async legacy=>{
   const w=window.__diverWitness,g=renderer.gl,frames=[];
   for(let i=0;i<120;i++){
    player.p=collide(V.add(player.p,V.mul(w.normal,-.07)),player.p);updateCamera(1/60);oceanFeatures.call('afterCamera',1/60);updateLife(6+i/60);
    await renderer.sceneStream.ready(eye);renderer.render(eye,target,6+i/60);
    const body=legacy?null:OceanDiverContact.snapshot(),spheres=body?OceanDiverContact.volumes(body):[];
    frames.push({i,p:player.p.slice(),visible:diverBatch.visible,gl:g.getError(),lost:g.isContextLost(),penetrating:spheres.filter(s=>OceanRockContact.overlaps(s.p,s.r)).length,body});
    await new Promise(r=>requestAnimationFrame(r));
   }
   return frames;
  },legacy);
  assert(report.motion.every(f=>f.gl===0&&!f.lost&&f.visible));if(!legacy)assert(report.motion.every(f=>f.body&&f.penetrating===0));
  report.checks.push({name:'120 actual-world approach frames submit the visible diver without GL faults'+(legacy?'':' or body penetration'),passed:true});save();
  report.inspect=await page.evaluate(async()=>{
   const camera=[-4.6,-7.7,6.0],aim=[-9.3,-9.9,1.1];renderer.photoFov=55;renderer.photoNear=.05;
   await renderer.sceneStream.ready(camera);for(let i=0;i<8;i++){renderer.render(camera,aim,7.9);await new Promise(r=>requestAnimationFrame(r));}
   return {camera,aim,p:player.p.slice(),diver:{p:diverBatch.instances[0].p.slice(),yaw:diverBatch.instances[0].yaw,pitch:diverBatch.instances[0].pitch},quality:renderer.quality,adaptive:settings.adaptive};
  });
  await page.screenshot({path:out.replace(/\.json$/,'.png')});
  if(!legacy){
   report.turn=await page.evaluate(async()=>{
    const frames=[];renderer.photoFov=null;renderer.photoNear=null;
    for(let i=0;i<90;i++){
     player.yaw+=.035;player.pitch=Math.max(-1.25,Math.min(1.25,player.pitch+.015));settings.third=i%20<10;
     updateCamera(1/60);oceanFeatures.call('afterCamera',1/60);const body=OceanDiverContact.snapshot();await renderer.sceneStream.ready(eye);renderer.render(eye,target,8+i/60);
     frames.push({lookYaw:player.yaw,bodyYaw:body.yaw,third:settings.third,visible:diverBatch.visible,penetrating:OceanDiverContact.volumes(body).filter(s=>OceanRockContact.overlaps(s.p,s.r)).length,gl:renderer.gl.getError()});
     await new Promise(r=>requestAnimationFrame(r));
    }return frames;
   });
   assert(report.turn.every(f=>f.penetrating===0&&f.gl===0&&f.visible===f.third));assert(report.turn.at(-1).lookYaw-report.turn[0].lookYaw>3);
   report.checks.push({name:'Camera remains free while safe body turns and first/third view switches',passed:true});
  }
  assert.deepEqual(report.errors,[]);assert(report.checks.every(c=>c.passed));report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
 finally{save();if(browser)await browser.close();console.log(JSON.stringify({status:report.status,checks:report.checks,failure:report.failure}));}
})();
