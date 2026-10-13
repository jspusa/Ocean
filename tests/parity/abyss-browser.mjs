/* GPU / public UI seam. Habitat fixtures reposition only the diver/camera; every
 * animal retains its real compiled UID, home, pose and metre scale. Dwell uses
 * deterministic game ticks, not an uninterrupted boat-to-abyss playthrough.
 * Aquarium eligibility alone is explicitly seeded to isolate display behavior.
 * Run only when allocated the exclusive GPU slot; always closes its browser.
 * node tests/parity/abyss-browser.mjs [URL] [--desktop|--portrait|--landscape]
 */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/';
const modes=[{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
const ids=['coelacanth','giant_squid','pelican_eel','humpback_anglerfish','japanese_spider_crab'],checks=[],errors=[];
const output='qa/parity',browser=await pw.chromium.launch({channel:'chrome',headless:true});
await mkdir(output,{recursive:true});
function check(mode,name,pass,detail){checks.push({mode:mode.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode.id+' '+name);}
async function click(page,mode,selector){const item=page.locator(selector);await item.scrollIntoViewIfNeeded();if(mode.touch)await item.tap();else await item.click();}
async function shot(page,mode,name){await page.evaluate(()=>{for(const id of ['toast','radioBox','flash']){const el=$(id);if(el)el.style.visibility='hidden';}});await page.screenshot({path:`${output}/abyss-${mode.id}-${name}.png`,animations:'disabled'});}
async function ready(page){
 await page.waitForFunction(()=>window.__ocean?.ready&&typeof ABYSS_SPECIES!=='undefined',null,{timeout:90000});
 await page.evaluate(()=>{
  window.__freeze=true;$('welcomeAudio').checked=false;settings.adaptive=false;settings.third=false;settings.hints=true;settings.sound=false;
  window.__abyssFrame=(dt=.1)=>{t+=dt;updateLife(t);updateCamera(dt);oceanFeatures.call('afterCamera',dt);applyVisualSettings();renderer.render(eye,target,t);if(active&&!modal&&!photoOpen){observe(dt);voyageTick(dt);updateHUD();}};
  window.__abyssFace=aim=>{const d=V.sub(aim,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));cameraCut=true;};
  window.__abyssApproach=id=>{
   oceanMicrocosm.exit();if(modal)closePanel();stopAuto();resetInput();player.velocity=[0,0,0];document.body.classList.remove('cinematic');renderer.photoNear=null;renderer.photoFov=null;renderer.photoAperture=0;
   updateLife(t);const f=life.find(f=>SPECIES[f.species].id===id),sp=SPECIES[f.species],aim=animalFocusPoint(f),aspect=innerWidth/innerHeight,b=sp.modelBounds.size;
   const distance=sp.traits.micro?.82:Math.max(1.5,sp.size*Math.max(b[1],b[0]/Math.max(.48,aspect),b[2])*1.5),distances=sp.traits.micro?[distance,1.1,1.35]:[distance,distance*1.12,distance*.88];
   let chosen=null;approach:for(const distance of distances)for(const height of [.15,.45,-.12])for(const angle of [f.yaw, f.yaw+Math.PI/2,f.yaw-Math.PI/2,f.yaw+Math.PI,.5,1.0,-.5,-1]){const p=V.add(aim,[Math.sin(angle)*distance,height,Math.cos(angle)*distance]);p[1]=Math.max(p[1],groundHeight(p[0],p[2])+.86);if(V.dist(collide(p.slice()),p)<.01&&!blocked(p,aim,.001)&&V.dist(p,aim)<sp.traits.observeDistance){chosen=p;break approach;}}
   if(!chosen)throw Error('No collision-safe real habitat view for '+id);player.p=chosen;__abyssFace(aim);__abyssFrame(.001);
   return {id,uid:f.uid,home:f.home.slice(),p:f.p.slice(),player:player.p.slice(),size:sp.size,scale:f.s.slice(),distance:V.dist(eye,aim),blocked:blocked(eye,aim,.001),gl:renderer.gl.getError()};
  };
  window.__abyssWorldPoints=f=>{const b=SPECIES[f.species].modelBounds,points=[],c=Math.cos(f.yaw),s=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch);for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){const px=(x*cp-y*sn)*f.s[0],py=(x*sn+y*cp)*f.s[1],pz=z*f.s[2];points.push([f.p[0]+c*px+s*pz,f.p[1]+py,f.p[2]-s*px+c*pz]);}return points;};
  window.__abyssBatchHas=(b,f)=>{if(!b||!b.visible)return false;for(let i=0;i<b.drawCount;i++)if(Math.hypot(b.data[i*24]-f.p[0],b.data[i*24+1]-f.p[1],b.data[i*24+2]-f.p[2])<.001)return true;return false;};
  window.__abyssPixels=()=>{const c=document.createElement('canvas');c.width=160;c.height=100;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(renderer.canvas,0,0,c.width,c.height);return Array.from(x.getImageData(0,0,c.width,c.height).data);};
  window.__abyssLampPair=()=>{const position=eye.slice(),aim=target.slice(),time=t;renderer.lamp=false;renderer.forceShadow=true;renderer.render(position,aim,time);const off=__abyssPixels(),offPNG=renderer.canvas.toDataURL('image/png');renderer.lamp=true;renderer.forceShadow=true;renderer.render(position,aim,time);const on=__abyssPixels(),onPNG=renderer.canvas.toDataURL('image/png');let center=0,outer=0,cn=0,onum=0,changed=0,delta=[0,0,0];for(let y=0;y<100;y++)for(let x=0;x<160;x++){const k=(y*160+x)*4,d=[0,1,2].map(c=>on[k+c]-off[k+c]),gain=d[0]*.2126+d[1]*.7152+d[2]*.0722;if(gain>2)changed++;if(x>60&&x<100&&y>35&&y<65){center+=gain;cn++;for(let c=0;c<3;c++)delta[c]+=d[c];}if(x<18||x>142||y<10||y>90){outer+=gain;onum++;}}return {centerGain:center/cn,outerGain:outer/onum,changed,centerRGB:delta.map(v=>v/cn),eye:position,target:aim,time,offPNG,onPNG,gl:renderer.gl.getError()};};
 });
}
async function lampPair(page,mode,name){const result=await page.evaluate(()=>__abyssLampPair());await writeFile(`${output}/abyss-${mode.id}-${name}-off.png`,Buffer.from(result.offPNG.split(',')[1],'base64'));await writeFile(`${output}/abyss-${mode.id}-${name}-on.png`,Buffer.from(result.onPNG.split(',')[1],'base64'));delete result.offPNG;delete result.onPNG;return result;}
async function worldAndModels(page,mode){
 await click(page,mode,'#shipModeFree');check(mode,'actual free-exploration entry opens the remote habitat region',await page.evaluate(()=>voyage.state.mode==='free'));await click(page,mode,'#startBtn');await page.waitForFunction(()=>active&&!modal);await page.evaluate(()=>__abyssFrame(.1));
 for(const id of ids){
  const setup=await page.evaluate(id=>__abyssApproach(id),id);
  const high=await page.evaluate(id=>{const f=life.find(f=>SPECIES[f.species].id===id),b=renderer.batches.find(b=>b.kind===10&&b.species===f.species&&!(b.minDistance>0)),points=__abyssWorldPoints(f).map(p=>project(p,renderer.vp));return {drawn:__abyssBatchHas(b,f),count:b.drawCount,triangles:b.count/3,gl:renderer.gl.getError(),inside:points.every(p=>p[2]>0&&Math.abs(p[0])<1&&Math.abs(p[1])<1),uid:f.uid};},id);
  check(mode,id+' real habitat submits its high-detail kind10 model at unchanged metres',high.drawn&&high.gl===0&&setup.scale.every(v=>v===setup.size)&&!setup.blocked,{setup,high});
  if(id!=='humpback_anglerfish')check(mode,id+' full model bounds fit the habitat observation camera',high.inside,high);
  await shot(page,mode,id+'-habitat');
  const low=await page.evaluate(id=>{const f=life.find(f=>SPECIES[f.species].id===id),sp=SPECIES[f.species],hi=renderer.batches.find(b=>b.kind===10&&b.species===f.species&&!(b.minDistance>0)),lo=renderer.batches.find(b=>b.kind===10&&b.species===f.species&&b.minDistance>0),aim=animalFocusPoint(f),d=hi.maxDistance*(renderer.mobile?.82:1)*1.32;
   // Free-camera LOD fixture at the unchanged real habitat; no claim that this
   // far camera position was reached by swimming or is unoccluded natural play.
   const e=V.add(aim,[0,d*.10,d]);renderer.photoNear=.003;renderer.photoFov=40;renderer.render(e,aim,t);return {drawn:__abyssBatchHas(lo,f),high:__abyssBatchHas(hi,f),gl:renderer.gl.getError(),triangles:lo.count/3,scale:f.s.slice(),size:sp.size};},id);
  check(mode,id+' actual low-detail batch draws across its distance threshold',low.drawn&&!low.high&&low.gl===0&&low.triangles<high.triangles&&low.scale.every(v=>v===low.size),low);
 }
}
async function microAngler(page,mode){
 const setup=await page.evaluate(()=>__abyssApproach('humpback_anglerfish')),before=await page.evaluate(()=>({player:player.p.slice(),size:life.find(f=>SPECIES[f.species].id==='humpback_anglerfish').s.slice(),near:renderer.photoNear,fov:renderer.photoFov}));
 await click(page,mode,'#fieldToolsBtn');await click(page,mode,'#panelBody [data-feature="microcosm"]');await click(page,mode,'#microStart');await page.evaluate(()=>__abyssFrame(.1));
 check(mode,'real nearby nine-centimetre angler becomes a visible touch target through the tool menu',await page.locator('#microTarget').isVisible()&&await page.evaluate(uid=>oceanMicrocosm.snapshot().candidate===uid,setup.uid),setup);
 await click(page,mode,'#microTarget');await page.evaluate(()=>{for(let i=0;i<25;i++)__abyssFrame(.1)});
 const observed=await page.evaluate(before=>{const f=oceanMicrocosm.target(),field=oceanEcology.state().field.humpback_anglerfish;return {viewing:oceanMicrocosm.isViewing(),uid:f?.uid,scale:f?.s.slice(),sameDiver:V.dist(player.p,before.player)===0,near:renderer.photoNear,points:field?.points||0,seen:persistent.seen.includes('humpback_anglerfish'),record:oceanEcology.state().individuals[f?.uid],gl:renderer.gl.getError()};},before);
 check(mode,'actual macro dwell discovers the real angler UID without scaling or moving the diver',observed.viewing&&observed.uid===setup.uid&&observed.scale.every(n=>n===.09)&&observed.sameDiver&&observed.near===.003&&observed.points>=4&&observed.record?.seconds>=1.5&&observed.seen&&observed.gl===0,observed);
 await shot(page,mode,'humpback_anglerfish-macro');await click(page,mode,'#microOrbitRight');await page.evaluate(()=>__abyssFrame(.1));
 check(mode,'macro orbit and controls remain usable inside current viewport',await page.evaluate(()=>[...$('microLensControls').querySelectorAll('button,input')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.width>=44&&r.height>=44})&&renderer.gl.getError()===0));
 await click(page,mode,'#microShutter');await page.waitForFunction(()=>!voyage.photoBusy&&oceanPhotography.snapshot().film>0);
 const archive=await page.evaluate(async()=>{const a=await oceanPhotography.exportArchive(),p=a.state.film.at(-1),image=a.images.find(i=>i.date===p.date);return {photo:p,image:image?.url};});
 check(mode,'macro shutter stores the actual angler photo and camera metadata',archive.photo.individual===setup.uid&&archive.photo.camera.mode==='macro'&&archive.image?.startsWith('data:image/jpeg'),{photo:archive.photo,bytes:archive.image?.length});if(archive.image)await writeFile(`${output}/abyss-${mode.id}-angler-photo.jpg`,Buffer.from(archive.image.split(',')[1],'base64'));
 await click(page,mode,'#microExit');check(mode,'macro exit restores lens and releases pointer control',await page.evaluate(before=>!oceanMicrocosm.isViewing()&&!oceanFeatures.pointerCaptured()&&renderer.photoNear===before.near&&renderer.photoFov===before.fov,before));
 await page.evaluate(()=>{saveVoyage();persist()});await page.reload();await ready(page);
 check(mode,'reload retains real angler knowledge, individual record, photograph and physical size',await page.evaluate(async uid=>{const f=life.find(f=>f.uid===uid),a=await oceanPhotography.exportArchive();return f?.s.every(n=>n===.09)&&persistent.seen.includes('humpback_anglerfish')&&oceanEcology.state().field.humpback_anglerfish.points>=4&&oceanEcology.state().individuals[uid].seconds>=1.5&&a.state.film.some(p=>p.individual===uid&&p.camera.mode==='macro');},setup.uid));
}
async function regionLighting(page,mode){
 if(!await page.evaluate(()=>active)){await click(page,mode,'#startBtn');await page.waitForFunction(()=>active&&!modal);}
 for(const [region,point]of [['cave','cave-strata'],['ruins','ruin-tablet'],['abyss','abyss-lower']]){
  const site=await page.evaluate(point=>{oceanMicrocosm.exit();stopAuto();resetInput();const q=OceanRegions.points[point];player.p=q.stance.slice();const aim=q.p.slice();if(point.startsWith('abyss-'))aim[1]+=.55;__abyssFace(aim);renderer.photoFov=null;renderer.photoNear=null;return {p:player.p.slice(),aim,safe:V.dist(collide(player.p.slice()),player.p)<.01};},point);
  check(mode,region+' lighting evidence uses its authored collision-safe stance',site.safe,site);
  for(const lighting of ['day','blue']){await page.evaluate(lighting=>{settings.lighting=lighting;__abyssFrame(.001);document.body.classList.add('cinematic');},lighting);const pair=await lampPair(page,mode,region+'-'+lighting);check(mode,region+' '+lighting+' torch changes rendered surfaces at the same camera and time',pair.gl===0&&pair.changed>30&&pair.centerGain>.5,pair);}
 }
 // Wide, real route views document the spaces around the close-up study props.
 for(const [region,from,to]of [['cave',1,3],['ruins',1,4],['abyss',2,4]]){
  const site=await page.evaluate(({region,from,to})=>{const route=OceanRegions.route(region);player.p=route[from].slice();__abyssFace(route[to]);renderer.photoFov=null;renderer.photoNear=null;settings.lighting='day';__abyssFrame(.001);return {safe:V.dist(collide(player.p.slice()),player.p)<.01,p:player.p.slice(),aim:route[to],gl:renderer.gl.getError()};},{region,from,to});
  check(mode,region+' overview renders from its real collision-safe route',site.safe&&site.gl===0,site);await shot(page,mode,region+'-overview');
 }
 const distances=[];
 for(const distance of [2.4,4.8]){await page.evaluate(distance=>{const q=OceanRegions.points['cave-strata'],direction=V.norm(V.sub(q.stance,q.p)),p=V.add(q.p,V.mul(direction,distance));if(V.dist(collide(p.slice()),p)>.01)throw Error('Torch distance fixture crosses cave solid');player.p=p;__abyssFace(q.p);settings.lighting='blue';__abyssFrame(.001);},distance);distances.push(await lampPair(page,mode,'cave-distance-'+distance));}
 check(mode,'same cave wall receives less central torch illumination with greater distance',distances[0].centerGain>distances[1].centerGain*1.04,{near:distances[0],far:distances[1]});
 await page.evaluate(()=>{document.body.classList.remove('cinematic');settings.lighting='day';goHome();$('debrief').classList.add('hidden')});
}
async function aquarium(page,mode){
 // Controlled eligibility fixture: aquarium placement/rendering is tested here;
 // earning the second knowledge level was verified separately in ecology suites.
 await page.evaluate(()=>{for(const id of ['coelacanth','giant_squid','japanese_spider_crab'])oceanEcology.state().field[id]={points:14,encounters:2,seconds:20,photos:0};saveVoyage();window.__abyssWorldIdentity=life.map(f=>JSON.stringify([f.uid,f.home,f.s]));});
 await click(page,mode,'#shipResearch [data-feature="aquarium"]');if(await page.locator('#aquariumClear').isEnabled())await click(page,mode,'#aquariumClear');
 for(const [cell,id]of [[0,'giant_squid'],[6,'japanese_spider_crab']]){await click(page,mode,`[data-aquarium-cell="${cell}"]`);await page.locator('#aquariumSpecies').selectOption(id);await page.locator('#aquariumLevel').selectOption('1');await click(page,mode,'#aquariumPlace');}
 check(mode,'actual aquarium selectors place squid and crab within capacity',await page.evaluate(()=>oceanAquarium.state().slots.length===2&&oceanAquarium.capacity(oceanAquarium.state().slots)===11));
 await page.evaluate(()=>{window.__abyssOriginalBatches=renderer.batches.length;window.__abyssVisibility=renderer.batches.map(b=>b.visible);window.__abyssOptics={photoNear:renderer.photoNear,photoFov:renderer.photoFov,exposure:renderer.exposure};});await click(page,mode,'#aquariumEnter');
 for(const [cell,id,size]of [[0,'giant_squid',8],[6,'japanese_spider_crab',3]]){
  await page.locator('#aquariumFocus').selectOption(String(cell));await page.evaluate(()=>__abyssFrame(.1));
  const data=await page.evaluate(id=>{const sp=SPECIES.find(s=>s.id===id),b=renderer.batches.slice(__abyssOriginalBatches).find(b=>b.kind===10&&b.species===SPECIES.indexOf(sp)),f=b.instances[0],points=__abyssWorldPoints(f),projected=points.map(p=>project(p,renderer.vp)),layout=oceanAquarium.exhibitLayout(f.exhibit);let room=true;for(const time of [0,9,30,61,120]){oceanAquarium.hooks.afterLife(time);const p=__abyssWorldPoints(f);if(p.some(v=>v[0]<-21.8||v[0]>21.8||v[1]<-16||v[1]>0||v[2]<-16.9||v[2]>17))room=false;}oceanAquarium.hooks.afterLife(t);updateCamera(.1);renderer.render(eye,target,t);return {id,size:sp.size,scale:f.s.slice(),drawn:b.drawCount,independent:!life.includes(f),room,frame:projected.every(p=>p[2]>0&&Math.abs(p[0])<1&&Math.abs(p[1])<1),support:layout.supported,feetAboveBed:Math.abs(f.p[1]-layout.base[1])<.001,pad:layout.pad,radius:layout.radius,gl:renderer.gl.getError()};},id);
  check(mode,id+' aquarium uses an independent true-metre actor inside the room',data.scale.every(v=>v===size)&&data.independent&&data.room&&data.drawn>0&&data.gl===0,data);check(mode,id+' complete exhibit fits the focus camera',data.frame,data);
  if(id==='japanese_spider_crab')check(mode,'three-metre crab feet stay on their correctly sized supported bed',data.support&&data.feetAboveBed&&data.pad*.5>=size*.5+data.radius,data);
  await shot(page,mode,id+'-aquarium');
 }
 const controls=await page.evaluate(()=>({rects:[...$('aquariumViewer').querySelectorAll('button,select')].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom}}),width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));check(mode,'viewer controls remain touch-sized and inside the viewport',controls.rects.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.top>=0&&r.right<=controls.width+1&&r.bottom<=controls.height+1)&&controls.scroll===controls.width,controls);
 await click(page,mode,'#aquariumExit');
 check(mode,'exhibit exit restores world visibility, identity and lens without actor leaks',await page.evaluate(()=>!oceanAquarium.snapshot().viewing&&renderer.batches.slice(0,__abyssOriginalBatches).every((b,i)=>b.visible===__abyssVisibility[i])&&renderer.batches.slice(__abyssOriginalBatches).every(b=>!b.visible)&&life.every((f,i)=>JSON.stringify([f.uid,f.home,f.s])===__abyssWorldIdentity[i])&&Object.keys(__abyssOptics).every(k=>renderer[k]===__abyssOptics[k])));
}
async function run(mode){
 const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,hasTouch:mode.touch,isMobile:mode.touch}),page=await context.newPage();page.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));page.on('dialog',d=>d.accept());
 try{await page.goto(url);await ready(page);check(mode,'compiled 32-species catalogue boots with real nine abyss actors and valid shader programs',await page.evaluate(()=>SPECIES.length===32&&ABYSS_SPECIES.length===5&&life.filter(f=>SPECIES[f.species]?.abyss).length===9&&renderer.sceneLoad.compiled&&renderer.gl.getError()===0));
  await page.evaluate(()=>openPanel('journal'));check(mode,'all 32 catalogue cards are actual player-visible entries',await page.locator('.species-card').count()===32);await click(page,mode,'#closePanel');
  await worldAndModels(page,mode);await microAngler(page,mode);await regionLighting(page,mode);await aquarium(page,mode);check(mode,'no uncaught errors in this viewport',!errors.some(e=>e.mode===mode.id),errors.filter(e=>e.mode===mode.id));
 }catch(error){check(mode,'suite completed',false,error.stack);try{await shot(page,mode,'failure')}catch{}}finally{await context.close();}
}
try{for(const mode of modes)await run(mode);}finally{try{await writeFile(`${output}/abyss-browser-${modes.map(m=>m.id).join('-')}.json`,JSON.stringify({url,evidenceBoundary:'World animals never relocated. Diver approach, distant LOD camera and deterministic time are explicit fixtures. Macro discovery and photo use real controls. Aquarium eligibility is seeded only for isolated placement checks. Draw counts and pixel differences require separate screenshot inspection; no physical-phone or photorealism claim.',checks,errors},null,2));}finally{await browser.close();}}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} abyss browser checks passed`);if(checks.some(c=>!c.pass))process.exitCode=1;
