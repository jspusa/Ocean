/* Native normal input after an explicit reproducible coastal placement.
 * CPU coastal-diver-contact supplies the independent archived-triangle oracle;
 * this companion checks real rendering, residency and desktop/touch controls. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),arg=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const out=path.resolve(root,arg('out','qa/parity/v01851-environment/coastal-swim.json')),url=arg('url','http://127.0.0.1:8765/');
const report={status:'running',url,method:'Installed native Chrome; ordinary UI entry and sustained keyboard/touch descent after explicit diagnostic placement. Default adaptive quality. Touch is emulation, not physical-phone or battery evidence. Independent archived mesh checks are in coastal-diver-contact.cjs.',profiles:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const touch of [false,true]){
   const row={profile:touch?'touch':'desktop',errors:[]};report.profiles.push(row);save();
   const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
   try{
    const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
    await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});await page.locator('#loading').waitFor({state:'hidden'});
    row.home=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.welcome-bottom button')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};})}));
    assert(row.home.scrollWidth<=row.home.width);
    assert.deepEqual(row.home.controls.map(r=>r.id),['welcomeNavigation','welcomeActivities','welcomeMultiplayer','shipSettings','welcomeAbout']);
    assert(row.home.controls.every(r=>r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=row.home.width&&r.bottom<=row.home.height),'homepage footer remains readable and touchable inside the viewport');
    await page.screenshot({path:out.replace(/\.json$/,'-'+row.profile+'-home.png')});
    if(touch)await page.locator('#welcomeNavigation').tap();else await page.locator('#welcomeNavigation').click();
    await page.locator('#panel').waitFor({state:'visible'});
    assert.equal(await page.locator('#panelTitle').innerText(),'整片海，都能游過去');
    assert.equal(await page.locator('#panelBody [data-mooring="ruins"]').count(),1);
    if(touch)await page.locator('#closePanel').tap();else await page.locator('#closePanel').click();
    if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
    await page.waitForFunction(()=>active&&document.getElementById('welcome').classList.contains('hidden'));
    row.initial=await page.evaluate(async()=>{
     const g=renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');
     window.__freeze=true;resetInput();auto=false;follow=null;settings.third=true;
     player.p=[-236.6060609817505,-23.5,-36.666666666666664];player.yaw=Math.PI;player.pitch=0;OceanDiverContact.reset();updateCamera();
     await renderer.sceneStream.ready(eye);renderer.render(eye,target,t);
     const frames=[],render=renderer.render;
     window.__coastFrames=frames;renderer.render=function(...args){const start=performance.now(),before=this.frame,result=render.apply(this,args),d=diverBatch.instances[0],body=d&&{p:d.p.slice(),yaw:-d.yaw,pitch:-d.pitch,scale:d.s[0]};
      if(result!==false&&this.frame>before&&active&&diverBatch.visible&&body&&frames.length<1200){const volumes=OceanDiverContact.volumes(body),near=this.batches.filter(b=>b.material===1&&!b.minDistance&&b.instances.some(f=>volumes.some(s=>Math.abs(s.p[0]-f.p[0])<32+s.r&&Math.abs(s.p[2]-f.p[2])<32+s.r)));
       frames.push({at:start,cpuMs:performance.now()-start,p:body.p.slice(),penetrating:volumes.filter(s=>OceanCoastalGround.contact(s.p,s.r)).length,stonePenetration:window.__archInput?volumes.filter(s=>OceanRockContact.overlaps(s.p,s.r)).length:0,nearTiles:near.length,nearDraws:near.reduce((n,b)=>n+b.drawCount,0),requiredNearResident:near.length>0&&near.every(b=>!!b.vao),bodyDraws:diverBatch.drawCount,quality:this.quality,scale:this.dynamicScale,triangles:this.submittedTriangles,draws:this.drawCalls,frame:this.frame});}
      return result;
     };
     const metadata={hardware:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null,adaptive:settings.adaptive,quality:renderer.quality,p:player.p.slice(),version:document.documentElement.dataset.version};
     window.__freeze=false;lastTime=performance.now();return metadata;
    });
    assert(row.initial.adaptive);assert.equal(row.initial.quality,touch?1:2);assert(typeof row.initial.hardware==='string'&&row.initial.hardware.length>0&&!/swiftshader|llvmpipe|software/i.test(row.initial.hardware));
    if(touch){const cdp=await context.newCDPSession(page),b=await page.locator('#downBtn').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.waitForTimeout(6500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    else{await page.keyboard.down('KeyQ');await page.waitForTimeout(6500);await page.keyboard.up('KeyQ');}
    row.result=await page.evaluate(()=>({p:player.p.slice(),body:OceanDiverContact.snapshot(),nearBed:OceanDiverContact.volumes(OceanDiverContact.snapshot()).some(s=>OceanCoastalGround.contact(s.p,s.r+.03)),frames:__coastFrames,adaptive:settings.adaptive,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),visible:diverBatch.visible,active,ready}));
    assert(row.result.active&&row.result.ready&&row.result.visible&&row.result.adaptive);assert.equal(row.result.gl,0);assert(!row.result.lost);
    assert(row.result.frames.length>30);assert(row.initial.p[1]-row.result.p[1]>1,'real input must descend');
    assert(row.result.frames.filter(f=>f.bodyDraws>0).length>10,'the diver must actually be submitted in completed descent frames');
    assert(row.result.frames.every(f=>f.penetrating===0&&f.requiredNearResident&&f.nearDraws>0),'every completed frame must display the full body above resident coastal terrain');
    assert(row.result.nearBed,'held descent must reach the actual seabed; sliding along a slope is allowed');
    row.view=await page.evaluate(async()=>{
     window.__freeze=true;const p=player.p.slice(),camera=[p[0]+4,p[1]+2.8,p[2]+4];renderer.photoFov=55;renderer.photoNear=.05;
     await renderer.sceneStream.ready(camera);for(let i=0;i<6;i++){renderer.render(camera,p,t);await new Promise(requestAnimationFrame);}
     return {camera,target:p,scale:renderer.dynamicScale,quality:renderer.quality};
    });
    await page.screenshot({path:out.replace(/\.json$/,'-'+row.profile+'.png')});
    row.archStart=await page.evaluate(async()=>{
     window.__freeze=true;resetInput();renderer.photoFov=null;renderer.photoNear=null;
     // This start is independently surveyed from the final visible scour;
     // after placement, only a real forward input drives the route.
     player.p=[2.2883146756100934,-13.480550873459338,-17.722331536681573];player.yaw=-.11;player.pitch=-.4;
     OceanDiverContact.reset();updateCamera();await renderer.sceneStream.ready(eye);renderer.render(eye,target,t);
     __coastFrames.length=0;window.__archInput=true;window.__freeze=false;lastTime=performance.now();return player.p.slice();
    });
    if(touch){const cdp=await context.newCDPSession(page),b=await page.locator('#joystick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height*.17}]});await page.waitForTimeout(7500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    else{await page.keyboard.down('KeyW');await page.waitForTimeout(7500);await page.keyboard.up('KeyW');}
    row.arch=await page.evaluate(()=>({p:player.p.slice(),localZ:Math.sin(.11)*player.p[0]+Math.cos(.11)*(player.p[2]+22.5),frames:__coastFrames,adaptive:settings.adaptive,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost()}));
    assert(row.arch.localZ< -5,'ordinary forward input must leave the far side of the actual stone arch');
    assert(row.arch.frames.filter(f=>f.bodyDraws>0).length>10,'the diver must actually be submitted during the passage');
    const opening=row.arch.frames.filter(f=>Math.abs(Math.sin(.11)*f.p[0]+Math.cos(.11)*(f.p[2]+22.5))<4);
    assert(opening.length>10&&opening.every(f=>Math.abs(Math.cos(.11)*f.p[0]-Math.sin(.11)*(f.p[2]+22.5)-1.75)<.4),'the full passage must use the surveyed opening, not go around the columns');
    assert(row.arch.frames.length>30&&row.arch.frames.every(f=>f.penetrating===0&&f.stonePenetration===0&&f.requiredNearResident&&f.nearDraws>0));assert.equal(row.arch.gl,0);assert(!row.arch.lost&&row.arch.adaptive);
    await page.screenshot({path:out.replace(/\.json$/,'-'+row.profile+'-arch.png')});
    assert.deepEqual(row.errors,[]);row.status='passed';console.log('PASS '+row.profile+' normal coastal descent and complete rendered body');
   }finally{save();await context.close();}
  }
  report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{save();await browser?.close();console.log(JSON.stringify({status:report.status,failure:report.failure}));}
})();
