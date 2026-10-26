/* Natural continuation of a controller-earned dolphin voyage. All browser
 * actions pass through the runner's navigator input; read() only observes real
 * state/geometry/storage. No pose, clock, trust, knowledge or save fixture writes.
 * This helper is authored for serial native-browser execution, not a unit test. */
'use strict';
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');

module.exports=async function gamepadExplorationFlow({read,check,click,move,pointer,pad,neutral,press,wait,capture,approach,fishPoint,page,delay,report,save,openTool}){
 const record=async(label,detail)=>{report.snapshots.push({label,...detail});save();};
 const visible=selector=>read(selector=>{const el=document.querySelector(selector);if(!el||!el.getClientRects().length||el.closest('.hidden,[hidden]'))return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';},selector);
 const pointerOff=async()=>{await neutral();if(await visible('#gamepadCursor'))await press(8);await neutral();};
 // Scroll the real panel via the controller wheel while pointing at its padding.
 // Pointing at the chart itself would zoom the chart instead of scrolling UI.
 const expose=async(selector)=>{
  await pointer();
  for(let attempt=0;attempt<32;attempt++){
   const box=await read(selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();let parent=el.parentElement;
    while(parent){const s=getComputedStyle(parent);if(/auto|scroll/.test(s.overflowY)&&parent.scrollHeight>parent.clientHeight+1)break;parent=parent.parentElement;}
    const clip=parent?.getBoundingClientRect(),top=Math.max(12,clip?.top??12),bottom=Math.min(innerHeight-30,clip?.bottom??innerHeight-30),center=r.top+r.height/2;
    return {visible:r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('.hidden,[hidden]'),center,top,bottom,scroll:clip?{x:Math.min(innerWidth-8,clip.right-12),y:(top+bottom)/2}:null};
   },selector);
   assert(box?.visible,'The requested controller control must be visible: '+selector);
   if(box.center>=box.top+7&&box.center<=box.bottom-7)return;
   assert(box.scroll,'A visible controller target must be inside a scrollable panel: '+selector);
   await move(box.scroll);await pad({axes:[0,0,0,box.center<box.top?-1:1]});await delay(180);await neutral();
  }
  throw new Error('Controller could not reveal panel control: '+selector);
 };
 const tap=async(selector)=>{await expose(selector);await click(selector);await neutral();};
 const drag=async(from,to,{precision=true,pause=100}={})=>{
  const buttons=precision?[0,7]:[0];await move(from);await pad({buttons});try{await delay(pause);await move(to,{buttons});await delay(pause);}finally{await neutral();}
 };
 const canvasPoint=()=>read(()=>{const r=renderer.canvas.getBoundingClientRect();return {x:r.left+r.width*.52,y:r.top+r.height*.49};});
 const selectValue=async(selector,value)=>{
  await tap(selector);
  for(let attempt=0;attempt<48;attempt++){
   const state=await read(({selector,value})=>{const el=document.querySelector(selector),options=[...el.options],target=options.findIndex(o=>o.value===value&&!o.disabled&&!o.hidden&&!o.parentElement?.disabled);return {current:el.selectedIndex,target,value:el.value};},{selector,value});
   assert(state.target>=0,'Real select option must be unlocked: '+selector+' / '+value);
   if(state.value===value)return;
   await press(state.current<state.target?15:14);
  }
  throw new Error('Controller select did not reach '+value);
 };
 // Static salvage needs a world point instead of an actor UID. This is the same
 // feedback loop as approach(): read heading/position, then drive ordinary axes.
 const swimTo=async(destination,{stop=.45,timeout=150000,label='salvage'}={})=>{
  await pointerOff();const end=Date.now()+timeout,trace=[];let previous=null,stuck=0,escapes=0,lastRecord=0;
  const inverse=v=>Math.abs(v)<.025?0:Math.sign(v)*(.15+Math.min(1,Math.abs(v))*.85);
  try{
   while(Date.now()<end){
    const s=await read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,sensitivity:settings.sensitivity,active,modal,ground:groundHeight(player.p[0],player.p[2])}));
    assert(s.active&&!s.modal,'Natural route requires the active unpaused sea');
    const delta=destination.map((v,i)=>v-s.p[i]),distance=Math.hypot(...delta),horizontal=Math.hypot(delta[0],delta[2]);
    if(Date.now()-lastRecord>1000){trace.push({...s,distance});lastRecord=Date.now();}
    if(distance<=stop){await neutral();return;}
    const aimY=horizontal>18?Math.max(destination[1],-1.2):destination[1],yaw=Math.atan2(delta[0],-delta[2]),pitch=Math.atan2(aimY-s.p[1],Math.max(.01,horizontal));
    const yawError=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw)),pitchError=pitch-s.pitch;
    if(previous&&Math.hypot(...s.p.map((v,i)=>v-previous[i]))<.015&&distance>stop+.8)stuck++;else stuck=0;previous=s.p;
    if(stuck>=30){assert(++escapes<=4,'Natural salvage route remained blocked');await pad({buttons:[7],axes:[escapes%2?.8:-.8,0,0,0]});await delay(1000);await neutral();stuck=0;continue;}
    const forward=Math.abs(yawError)<.55?Math.min(.85,Math.max(0,(distance-stop*.55)*.75)):0;
    await pad({axes:[0,-inverse(forward),inverse(Math.max(-1,Math.min(1,yawError*1.7/(1.05*s.sensitivity)))),inverse(Math.max(-1,Math.min(1,-pitchError*1.9/(.83*s.sensitivity))))]});await delay(100);
   }
   throw new Error('Natural route timed out: '+label);
  }finally{await neutral();report.actions.push({type:'natural-static-route',label,destination,trace});save();}
 };

 const entry=await read(()=>({active,modal,adaptive:settings.adaptive,partners:voyage.state.features.ecology.partners.map(p=>p.uid),position:player.p.slice(),collected:voyage.state.features.exploration.collected.slice()}));
 check('exploration continuation uses the naturally earned partner and active default-quality sea',entry.active&&!entry.modal&&entry.adaptive&&entry.partners.length>0,entry);await record('exploration-entry',entry);

 await openTool('exploration');await tap('[data-explore-tab="chart"]');await tap('#explorationZoomIn');await tap('#explorationZoomIn');await expose('#explorationChart');
 const chartBefore=await read(()=>oceanExploration.chartView),chartCenter=await read(()=>{const r=document.getElementById('explorationChart').getBoundingClientRect(),p=document.getElementById('panelBody').getBoundingClientRect();return {x:r.left+r.width*.50,y:Math.min(innerHeight-100,p.bottom-70,Math.max(r.top+80,p.top+80))};});
 await drag(chartCenter,{x:chartCenter.x+46,y:chartCenter.y+29});
 const chartAfter=await read(()=>oceanExploration.chartView);check('controller drag pans the real zoomed exploration chart',chartAfter.scale>1&&Math.hypot(chartAfter.x-chartBefore.x,chartAfter.y-chartBefore.y)>12,{before:chartBefore,after:chartAfter});await capture('natural-chart-pan');
 await tap('#explorationZoomReset');await expose('#explorationChart');
 const landmark=await read(()=>{const canvas=document.getElementById('explorationChart'),r=canvas.getBoundingClientRect(),view=oceanExploration.chartView,clip=document.getElementById('panelBody').getBoundingClientRect();return LANDMARKS.map(l=>{const p=chartPoint(l.x,l.z,canvas.width,canvas.height);return {id:l.id,x:r.left+(view.x+p[0]*view.scale)/canvas.width*r.width,y:r.top+(view.y+p[1]*view.scale)/canvas.height*r.height};}).filter(p=>p.x>r.left+12&&p.x<r.right-12&&p.y>Math.max(r.top,clip.top)+12&&p.y<Math.min(r.bottom,clip.bottom,innerHeight-30)-12).sort((a,b)=>(a.id==='anchorage'?-1:b.id==='anchorage'?1:0))[0];});
 assert(landmark,'A real chart landmark must be visible after ordinary panel scrolling');await move(landmark);await press(0);await wait(id=>voyage.state.waypoint===id,landmark.id);
 check('controller chart tap marks the actual world landmark',await read(id=>voyage.state.waypoint===id,landmark.id),landmark);if(await read(()=>!!modal))await press(9);await neutral();

 const artifact=await read(()=>{const item=oceanExploration.listArtifacts().find(a=>a.id==='anchor_compass');if(!item||item.collected)return null;const candidates=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2,p=[item.p[0]+Math.sin(a)*2.15,item.p[1]+1.2,item.p[2]+Math.cos(a)*2.15];if(p[1]>groundHeight(p[0],p[2])+.85&&!blocked(p,item.p))candidates.push(p);}candidates.sort((a,b)=>V.dist(a,player.p)-V.dist(b,player.p));return {...item,approach:candidates[0]};});
 assert(artifact?.approach,'An uncollected real anchor compass and clear nearby water are required');await swimTo(artifact.approach,{label:'anchor_compass'});await pointer();await wait(()=>{const el=document.getElementById('explorationPickup');return el&&!el.classList.contains('hidden')&&el.textContent.includes('羅盤');},undefined,12000);await tap('#explorationPickup');
 check('controller pickup collects the naturally reached compass and hides its real mesh',await read(()=>{const a=oceanExploration.listArtifacts().find(a=>a.id==='anchor_compass'),saved=JSON.parse(localStorage.getItem(VOYAGE_KEY));return a.collected&&!a.visible&&saved.features.exploration.collected.includes(a.id);}));await capture('natural-salvage-collected');

 const feeder=await read(()=>life.filter(f=>f.ecologyPresent!==false&&speciesTraits(f.species).feedable&&!SPECIES[f.species].traits?.micro).sort((a,b)=>Number(speciesTraits(b.species).motion==='hover')-Number(speciesTraits(a.species).motion==='hover')||V.dist(animalFocusPoint(a),player.p)-V.dist(animalFocusPoint(b),player.p)).map(f=>({uid:f.uid,species:SPECIES[f.species].id,range:speciesTraits(f.species).contactDistance}))[0]);
 assert(feeder,'An actually present feedable fish is required');await approach(feeder.uid,Math.max(.8,feeder.range*.45),90000);await pointer();await move(await fishPoint(feeder.uid));await press(0);await wait(uid=>oceanSelection.snapshot().uid===uid,feeder.uid);await tap('#ecologyFeed');await wait(()=>oceanEcology.snapshot().tool==='feed');
 const feedsBefore=await read(uid=>voyage.state.features.ecology.individuals[uid]?.feeds||0,feeder.uid);
 for(let attempt=0;attempt<3;attempt++){
  await approach(feeder.uid,Math.max(.8,feeder.range*.45),45000);await pointer();
  if(!await read(uid=>oceanSelection.snapshot().uid===uid,feeder.uid)){
   if(await read(()=>oceanEcology.snapshot().tool==='feed'))await tap('#ecologyFeed');
   await move(await fishPoint(feeder.uid));await press(0);await wait(uid=>oceanSelection.snapshot().uid===uid,feeder.uid);await tap('#ecologyFeed');await wait(()=>oceanEcology.snapshot().tool==='feed');
   await approach(feeder.uid,Math.max(.8,feeder.range*.45),45000);await pointer();
  }
  if(!await read(uid=>oceanSelection.snapshot().uid===uid,feeder.uid)){report.actions.push({type:'feeding-target-naturally-departed',uid:feeder.uid,attempt});save();continue;}
  await move(await fishPoint(feeder.uid));await press(0);
  if(await read(({uid,before})=>(voyage.state.features.ecology.individuals[uid]?.feeds||0)>before,{uid:feeder.uid,before:feedsBefore}))break;
  report.actions.push({type:'feeding-contact-attempt',uid:feeder.uid,attempt,observed:await read(uid=>({record:structuredClone(voyage.state.features.ecology.individuals[uid]),target:oceanEcology.snapshot().target,tool:oceanEcology.snapshot().tool,distance:V.dist(player.p,animalFocusPoint(life.find(f=>f.uid===uid)))}),feeder.uid)});save();
 }
 check('controller feeding obeys real species eligibility, range and contact rules',await read(({uid,before})=>{const f=life.find(f=>f.uid===uid),row=voyage.state.features.ecology.individuals[uid];return speciesTraits(f.species).feedable&&row.feeds===before+1&&row.trust>=4&&oceanEcology.snapshot().food>0;},{uid:feeder.uid,before:feedsBefore}),feeder);await capture('natural-fish-feeding');await tap('#ecologyFeed');await wait(()=>!oceanEcology.snapshot().tool);

 const photoDates=[],observedUIDs=[];
 const micro=async(uid,{species,full=true,exclude=[]}={})=>{
  const range=await read(uid=>speciesTraits(life.find(f=>f.uid===uid).species).observeDistance,uid);
  await approach(uid,Math.min(range*.75,range<1.2?.83:1.15),120000);await openTool('microcosm');await tap('#microStart');
  const actual=await wait(({species,exclude})=>{const el=document.getElementById('microTarget'),uid=el?.dataset.uid,f=life.find(f=>f.uid===uid);return el&&!el.classList.contains('hidden')&&f&&SPECIES[f.species].id===species&&!exclude.includes(uid)?uid:false;},{species,exclude},15000);
  const before=await read(()=>({p:player.p.slice(),eye:eye.slice(),near:renderer.photoNear??null,fov:renderer.photoFov??null,aperture:renderer.photoAperture??null,exposure:renderer.exposure,film:oceanPhotography.snapshot().film}));
  await tap('#microTarget');await wait(uid=>oceanMicrocosm.isViewing()&&oceanMicrocosm.target()?.uid===uid,actual);await neutral();
  await wait(()=>oceanMicrocosm.snapshot().credited,undefined,12000);await delay(8000);
  const learned=await read(uid=>{const f=life.find(f=>f.uid===uid),id=SPECIES[f.species].id;return {uid,id,record:structuredClone(voyage.state.features.ecology.field[id]),individual:structuredClone(voyage.state.features.ecology.individuals[uid]),p:player.p.slice(),near:renderer.photoNear,credited:oceanMicrocosm.snapshot().credited};},actual);
  check('natural macro observation records '+species+' without relocating the diver',learned.credited&&learned.record.points>=4&&Math.hypot(...learned.p.map((v,i)=>v-before.p[i]))<.015&&learned.near===.003,learned);observedUIDs.push(actual);
  if(full){
   const orbitBefore=await read(()=>({eye:eye.slice(),p:player.p.slice()})),point=await canvasPoint();await drag(point,{x:point.x+38,y:point.y-15});
   check('controller canvas drag orbits the actual '+species+' lens',await read(before=>V.dist(eye,before.eye)>.001&&V.dist(player.p,before.p)<.015&&oceanMicrocosm.isViewing(),orbitBefore));
   await tap('#microZoom');const zoomBefore=await read(()=>Number(document.getElementById('microZoom').value));for(let i=0;i<4;i++)await press(14);
   const zoom=await read(()=>({value:Number(document.getElementById('microZoom').value),fov:renderer.photoFov,saved:JSON.parse(localStorage.getItem(VOYAGE_KEY)).features.microcosm.zoom}));
   check('controller D-pad changes and persists the real macro projection for '+species,zoom.value<zoomBefore&&zoom.fov===zoom.value&&zoom.saved===zoom.value,zoom);await capture('natural-macro-'+species);
   await tap('#microShutter');await wait(before=>!voyage.photoBusy&&oceanPhotography.snapshot().film===before+1,before.film,30000);
   const shot=await read(uid=>{const rows=voyage.state.features.photography.film;return structuredClone(rows.findLast(p=>p.individual===uid&&p.camera?.mode==='macro'));},actual);
   check('controller macro shutter stores the actual '+species+' subject and lens',shot?.individual===actual&&shot.camera?.mode==='macro'&&shot.camera.zoom===zoom.value&&shot.knowledgeEligible===true,shot);photoDates.push(shot.date);
  }
  await tap('#microExit');await wait(()=>!oceanMicrocosm.isViewing()&&!oceanMicrocosm.snapshot().scanning);
  check('macro exit restores the prior sea lens after '+species,await read(before=>(renderer.photoNear??null)===before.near&&(renderer.photoFov??null)===before.fov&&V.dist(player.p,before.p)<.015&&!oceanFeatures.pointerCaptured(),before));await record('macro-completed-'+actual,learned);return actual;
 };
 const firstSeahorse=await read(()=>life.find(f=>f.uid==='pygmy_seahorse-001'&&f.ecologyPresent!==false)?.uid);assert(firstSeahorse,'The real seahorse habitat must be present');const firstObserved=await micro(firstSeahorse,{species:'pygmy_seahorse'});
 const slug=await read(()=>life.filter(f=>SPECIES[f.species].id==='cinderella_slug'&&f.ecologyPresent!==false).sort((a,b)=>V.dist(a.p,player.p)-V.dist(b.p,player.p))[0]?.uid);assert(slug,'The real slug habitat must be present');await micro(slug,{species:'cinderella_slug'});
 const secondSeahorse=await read(excluded=>life.filter(f=>SPECIES[f.species].id==='pygmy_seahorse'&&f.ecologyPresent!==false&&f.uid!==excluded).sort((a,b)=>V.dist(a.p,player.p)-V.dist(b.p,player.p))[0]?.uid,firstObserved);assert(secondSeahorse,'A distinct real seahorse encounter is required');await micro(secondSeahorse,{species:'pygmy_seahorse',full:false,exclude:[firstObserved]});
 const aquariumEligibility=await read(()=>({unlocked:oceanAquarium.unlocked(),eligible:oceanAquarium.eligible('pygmy_seahorse'),field:structuredClone(voyage.state.features.ecology.field.pygmy_seahorse),known:SPECIES.filter(sp=>oceanEcology.knowledge(voyage.state.features.ecology.field[sp.id])>=1).map(sp=>sp.id)}));
 check('natural encounters unlock a populated aquarium without seeded knowledge',aquariumEligibility.unlocked&&aquariumEligibility.eligible&&aquariumEligibility.field.encounters>=2&&aquariumEligibility.field.points>=14,aquariumEligibility);

 await pointer();await tap('#pauseBtn');await wait(()=>modal==='diveMenu');await tap('#menuHome');await wait(()=>!active&&!modal);await openTool('aquarium');await tap('#aquariumAuto');
 const aquariumSlots=await read(()=>structuredClone(voyage.state.features.aquarium.slots));check('controller auto-arrangement includes the legitimately earned exhibit',aquariumSlots.some(s=>s.species==='pygmy_seahorse'),aquariumSlots);await tap('#aquariumEnter');await wait(()=>oceanAquarium.snapshot().viewing&&oceanAquarium.snapshot().instances>0);
 const aquariumBefore=await read(()=>({camera:structuredClone(voyage.state.features.aquarium.camera),eye:eye.slice(),p:player.p.slice(),slots:structuredClone(voyage.state.features.aquarium.slots)})),aquariumPoint=await canvasPoint();await drag(aquariumPoint,{x:aquariumPoint.x+55,y:aquariumPoint.y+22});await delay(700);
 check('controller drag changes the populated aquarium camera and saves the orbit',await read(before=>{const s=voyage.state.features.aquarium,saved=JSON.parse(localStorage.getItem(VOYAGE_KEY)).features.aquarium;return Math.abs(s.camera.azimuth-before.camera.azimuth)>.01&&V.dist(eye,before.eye)>.1&&V.dist(player.p,before.p)<.015&&JSON.stringify(saved.camera)===JSON.stringify(s.camera)&&renderer.gl.getError()===0;},aquariumBefore));await capture('natural-aquarium-orbit');
 const aquariumCamera=await read(()=>structuredClone(voyage.state.features.aquarium.camera));await tap('#aquariumExit');await wait(()=>!oceanAquarium.snapshot().viewing&&modal==='aquarium');await press(9);await neutral();

 await openTool('deck');await wait(()=>modal==='deck'&&oceanShip.snapshot().mode==='deck');const visitorBefore=await read(()=>structuredClone(oceanShip.state().visitor));check('the earned first dive naturally enables the seasonal deck visitor',!!visitorBefore.kind,visitorBefore);await selectValue('#shipStation','visitor');await tap('#shipGo');
 await wait(()=>{const s=oceanShip.snapshot(),station=oceanShip.stations.find(s=>s.id==='visitor');return s.route.length===0&&Math.hypot(s.p[0]-station.approach[0],s.p[1]-station.approach[1])<.20&&oceanShip.state().visited.includes('visitor');},undefined,45000);
 const visitorPoint=()=>read(()=>{const p=oceanShip.screenPoint(oceanShip.stations.find(s=>s.id==='visitor').p);return p?{...p,width:innerWidth,height:innerHeight}:null;});let visitorResponse=null;
 for(let attempt=0;attempt<3;attempt++){
  const p=await visitorPoint();assert(p&&p.x>35&&p.x<p.width-35&&p.y>35&&p.y<p.height-35,'The real visitor must be visibly framed');await move(p);await pad({buttons:[0,7]});try{await delay(180);await move({x:p.x+30,y:p.y},{buttons:[0,7]});await delay(150);await move({x:p.x-30,y:p.y},{buttons:[0,7]});await delay(120);await move(p,{buttons:[0,7]});}finally{await neutral();}
  visitorResponse=await read(()=>{const s=oceanShip.state(),batch=renderer.batches.find(b=>b.shipActor===s.visitor.kind);return {visitor:structuredClone(s.visitor),pitch:batch?.instances[0]?.pitch,visible:batch?.visible,saved:structuredClone(JSON.parse(localStorage.getItem(VOYAGE_KEY)).features.ship.visitor)};});
  if(visitorResponse.visitor.trust>visitorBefore.trust)break;await delay(2200);
 }
 check('controller visitor strokes earn and persist actual deck trust',visitorResponse.visitor.trust===visitorBefore.trust+1&&visitorResponse.saved.trust===visitorResponse.visitor.trust&&visitorResponse.visible,visitorResponse);await capture('natural-deck-visitor');await tap('#shipExit');await wait(()=>!modal&&!active);await neutral();

 const archiveDigest=dates=>read(async dates=>{const archive=await oceanPhotography.exportArchive(),rows=[];for(const date of dates){const image=archive.images.find(p=>p.date===date),photo=archive.state.film.find(p=>p.date===date);if(!image||!photo)return null;const bytes=Uint8Array.from(atob(image.url.split(',')[1]),c=>c.charCodeAt(0)),hash=await crypto.subtle.digest('SHA-256',bytes);rows.push({date,bytes:bytes.length,sha256:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join(''),photo});}return rows;},dates);
 const originals=await archiveDigest(photoDates);check('natural macro photos have real persisted JPEG originals',originals?.length===2&&originals.every(p=>p.bytes>10000&&p.sha256.length===64),originals?.map(({photo,...row})=>row));
 const saved=await read(()=>{const s=JSON.parse(localStorage.getItem(VOYAGE_KEY));return {collected:s.features.exploration.collected,field:s.features.ecology.field,individuals:s.features.ecology.individuals,partners:s.features.ecology.partners,aquarium:s.features.aquarium,visitor:s.features.ship.visitor,microcosm:s.features.microcosm,waypoint:s.waypoint,adaptive:settings.adaptive};});
 await record('natural-exploration-before-reload',{saved,photoDates,observedUIDs,aquariumCamera});await page.reload();await wait(()=>window.__ocean?.ready&&document.getElementById('loading')?.classList.contains('gone'),undefined,120000);
 const restored=await read(()=>{const s=voyage.state;return {collected:s.features.exploration.collected,field:s.features.ecology.field,individuals:s.features.ecology.individuals,partners:s.features.ecology.partners,aquarium:s.features.aquarium,visitor:s.features.ship.visitor,microcosm:s.features.microcosm,waypoint:s.waypoint,adaptive:settings.adaptive};});
 check('normal reload preserves naturally earned salvage, ecology, partner, aquarium and visitor state',isDeepStrictEqual(restored,saved),{collected:restored.collected,known:Object.keys(restored.field),visitor:restored.visitor,aquarium:restored.aquarium,adaptive:restored.adaptive});
 const restoredOriginals=await archiveDigest(photoDates);check('normal reload preserves both original macro JPEG bytes and subject metadata',isDeepStrictEqual(restoredOriginals,originals),restoredOriginals?.map(({photo,...row})=>row));
 check('natural exploration ends with default adaptive quality and no GL error',await read(()=>settings.adaptive&&renderer.gl.getError()===0&&oceanSaveSession.writable));await capture('natural-exploration-reloaded');await record('natural-exploration-complete',{photoDates,observedUIDs,feeder,aquariumCamera,visitor:restored.visitor});
};
