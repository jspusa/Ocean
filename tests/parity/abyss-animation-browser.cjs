/* Controlled real-scene motion inspection, not a natural journey or FPS test.
 * Root runs native GPU jobs in sequence. No animal relocation or mesh swap. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),arg=(k,d)=>process.argv.find(v=>v.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const profile=arg('profile','desktop'),out=path.resolve(root,arg('out','qa/parity/v01846-material/motion-'+profile+'.json'));
assert(['desktop','touch'].includes(profile));
const report={status:'running',profile,scope:'Normal new-dive entry followed by controlled current-world animation. Production updateLife and renderer execute at 60 fixed times spanning six seconds. Camera follows the real actor without changing homes, size or geometry. Central framebuffer reads reject a fully black center and record color variation on every frame; a nonblack clear/fog frame can still pass, so this is not full-screen flash detection. Screenshots need visual review. This is not GPU timing, a natural journey or physical-phone evidence.',actors:[],errors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));const touch=profile==='touch';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(arg('url','http://127.0.0.1:8765/'));
  await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
  if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
  await page.waitForFunction(()=>active&&diveSeconds>.15);
  report.entry=await page.evaluate(()=>{const g=renderer.gl,ext=g.getExtension('WEBGL_debug_renderer_info'),r={version:document.documentElement.dataset.version,adaptive:settings.adaptive,compiled:renderer.sceneLoad.compiled,streamed:!!renderer.sceneStream,quality:renderer.quality,hardware:ext&&g.getParameter(ext.UNMASKED_RENDERER_WEBGL),seed:oceanEncounters.snapshot().seed,time:t};window.__freeze=true;settings.adaptive=false;return r;});
  assert.equal(report.entry.version,fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());assert(report.entry.adaptive&&report.entry.compiled&&report.entry.streamed);assert(report.entry.hardware&&!/swiftshader|software|llvmpipe/i.test(report.entry.hardware));save();
  for(const [actorIndex,uid] of ['coelacanth-002','pelican_eel-001','humpback_anglerfish-001'].entries()){
   const row=await page.evaluate(async({uid,start,touch})=>{
    const actor=life.find(f=>f.uid===uid),rule=oceanEncounters.rules.deepHabitats.find(r=>r.uid===uid),g=renderer.gl;
    if(!actor||!rule||actor.encounterPresent===false||actor.ecologyPresent===false)throw Error('Actual encounter unavailable: '+uid);
    const batches=renderer.batches.filter(b=>b.instances.includes(actor)),identity=JSON.stringify({home:actor.home,scale:actor.s,uid:actor.uid}),frames=[],images=[];
    const distance=uid.startsWith('coel')?2.4:uid.startsWith('pelican')?1.2:.55;
    renderer.photoNear=.02;renderer.photoFov=touch?60:35;renderer.lamp=true;
    let first=null;
    for(let i=0;i<60;i++){
     const time=start+i/10;updateLife(time);
     if(JSON.stringify({home:actor.home,scale:actor.s,uid:actor.uid})!==identity)throw Error('Animation changed identity/home/size');
     const aim=animalFocusPoint(actor).slice(),c=Math.cos(actor.yaw||0),s=Math.sin(actor.yaw||0),d=[distance*.28,distance*.22,distance],camera=[aim[0]+c*d[0]+s*d[2],aim[1]+d[1],aim[2]-s*d[0]+c*d[2]];
     if(OceanRockContact.overlaps(camera,.02)||OceanRegions.pointBlocked(camera,.02)||OceanTrench.groundContact(camera,.02))throw Error('Inspection camera intersects substrate');
     await renderer.sceneStream.ready(camera);
     if(renderer.render(camera,aim,time)===false)throw Error('Frame not presented');
     const origin=renderer.renderOrigin||[0,0,0],submitted=batches.some(b=>{for(let j=0;j<b.drawCount;j++)if([0,1,2].every(k=>b.data[j*24+k]===Math.fround(actor.p[k]-origin[k])))return true;return false;});
     if(!submitted)throw Error('Actual actor not submitted at '+i);
     const pixels=new Uint8Array(32*32*4);g.readPixels(Math.floor(g.drawingBufferWidth/2)-16,Math.floor(g.drawingBufferHeight/2)-16,32,32,g.RGBA,g.UNSIGNED_BYTE,pixels);
     let sum=0,max=0;const colors=new Set();for(let j=0;j<pixels.length;j+=4){sum+=pixels[j]+pixels[j+1]+pixels[j+2];max=Math.max(max,pixels[j],pixels[j+1],pixels[j+2]);colors.add(pixels[j]*65536+pixels[j+1]*256+pixels[j+2]);}
     const gl=g.getError(),lost=g.isContextLost();if(gl||lost||max<3)throw Error('Fully black center or failed lit frame '+i+' gl='+gl+' max='+max);
     frames.push({frame:i,time,p:actor.p.slice(),yaw:actor.yaw,pitch:actor.pitch,mean:sum/(32*32*3),maximum:max,centralColors:colors.size,gl,lost,submitted});
     if(i===0)first=actor.p.slice();
     if([0,30,59].includes(i))images.push({frame:i,png:renderer.canvas.toDataURL('image/png')});
    }
    return {uid,frames,images,moved:V.dist(first,actor.p),unchangedIdentity:JSON.stringify({home:actor.home,scale:actor.s,uid:actor.uid})===identity,quality:renderer.quality,seed:oceanEncounters.snapshot().seed};
   },{uid,start:report.entry.time+actorIndex*6,touch});
   for(const capture of row.images){const file=out.replace(/\.json$/,'')+'-'+uid+'-'+capture.frame+'.png';fs.writeFileSync(file,Buffer.from(capture.png.split(',')[1],'base64'));delete capture.png;capture.file=file;}
   report.actors.push(row);save();assert.equal(row.frames.length,60);assert(row.moved>0);assert(row.unchangedIdentity);assert.equal(row.seed,report.entry.seed);console.log('PASS '+profile+' '+uid+' 60 actual animated frames');
  }
  assert.deepEqual(report.errors,[]);report.status='passed-controlled-motion-visual-review-required';
 }catch(e){report.status='failed';report.failure=e.stack;console.error(e);process.exitCode=1;}
 finally{save();await browser?.close();}
})();
