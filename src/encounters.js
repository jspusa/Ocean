/* A saved dive arrangement, independent of animal identity and phenotype.
 * Only real new-dive entry samples entropy. Replay/import/resume reuse the seed;
 * no per-frame randomness, new actors, geometry, or audio work is introduced. */
const oceanEncounters=(()=>{
 'use strict';
 const DEFAULT_SEED=0x4f434541,initial=()=>({schema:2,seed:DEFAULT_SEED,protection:null,deepVersion:0});
 function cleanProtection(raw){
  if(!raw||!Array.isArray(raw.species)||!Array.isArray(raw.uids))return null;
  const species=new Set(SPECIES.map(s=>s.id)),uids=new Set(life.map(f=>f.uid));
  return {species:[...new Set(raw.species.slice(0,600).filter(id=>species.has(id)))].sort(),uids:[...new Set(raw.uids.slice(0,600).filter(uid=>uids.has(uid)))].sort()};
 }
 function sanitize(raw){const out=initial();if(Number.isInteger(raw?.seed)&&raw.seed>0&&raw.seed<=0xffffffff){out.seed=raw.seed;if(raw.schema===2){out.protection=cleanProtection(raw.protection);out.deepVersion=raw.deepVersion===1?1:0;}}return out;}
 const state=()=>oceanFeatures.state('encounters'),baseline=new WeakMap();
 const hash=n=>{n=(n^61)^(n>>>16);n=Math.imul(n,9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return n>>>0;};
 const word=s=>{let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return n>>>0;};
 const value=(seed,id,channel=0)=>hash(seed^word(id)^Math.imul(channel+1,0x9e3779b9))/4294967296;
 // Version 1 is immutable save geography: only these free swimmers move.
 // Guide gates, story representatives, station residents and benthic support
 // remain authored. Bounds enclose the real animated mesh at every heading.
 const deepHabitats=Object.freeze([
  {uid:'coelacanth-002',species:'coelacanth',radius:1,bodyRadius:1.05,homes:[[300,-217,-247],[302,-217,-251],[302,-217,-245]]},
  {uid:'pelican_eel-001',species:'pelican_eel',radius:.8,bodyRadius:.5,homes:[[402,-1050,-67],[410,-1050,-63],[406,-1050,-70]]},
  {uid:'pelican_eel-002',species:'pelican_eel',radius:.8,bodyRadius:.5,homes:[[461,-1450,-218],[469,-1450,-222],[465,-1450,-225]]},
  {uid:'pelican_eel-003',species:'pelican_eel',radius:.4,bodyRadius:.5,homes:[[769,-1120,-108],[772,-1120,-113],[768,-1120,-117]]},
  {uid:'humpback_anglerfish-001',species:'humpback_anglerfish',radius:.14,bodyRadius:.10,homes:[[351,-580,-74],[357,-580,-78],[354,-580,-81]]},
  {uid:'humpback_anglerfish-002',species:'humpback_anglerfish',radius:.14,bodyRadius:.10,homes:[[413,-910,-216],[419,-910,-220],[416,-910,-223]]}
 ].map(d=>Object.freeze({...d,homes:Object.freeze(d.homes.map(p=>Object.freeze(p)))})));
 const deepByUID=new Map(deepHabitats.map(d=>[d.uid,d]));let deepAnchors=[],deepLayout=[];
 function deepSafe(home,definition,sp){
  const radius=definition.bodyRadius+Math.hypot(definition.radius,definition.radius*.42,sp.motionProfile.bob)+.03;
  return typeof OceanRockContact!=='undefined'&&!!OceanRockContact.catalogue()&&typeof OceanTrench!=='undefined'&&OceanTrench.containsPosition(home)&&!OceanTrench.groundContact(home,radius)&&!OceanRegions.pointBlocked(home,radius)&&!OceanRockContact.overlaps(home,radius);
 }
 const schools=Object.freeze([
  {id:'reef',home:[1,-6.7,-12],count:140,span:.28},
  {id:'west-passage',home:[-57,-11,-43],count:48,span:.24},
  {id:'east-passage',home:[58,-12,-60],count:48,span:.24},
  {id:'wreck-approach',home:[101,-23,-132],count:48,span:.28},
  {id:'outer-shelf',home:[-14,-28,-183],count:48,span:.25},
  {id:'open-water',home:[321,-19,-36],count:48,span:.27}
 ]);
 const envelope=span=>({horizontal:16*span+.35,vertical:1.44*span+.35});
 let lastCatalogue=null,rockBounds=[],layout=[];
 function stoneBounds(){
  const catalogue=typeof OceanRockContact==='undefined'?null:OceanRockContact.catalogue();if(!catalogue)return null;if(catalogue===lastCatalogue)return rockBounds;
  const bounds=catalogue.meshes.map(m=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<m.positions.length;k+=3)for(let a=0;a<3;a++){min[a]=Math.min(min[a],m.positions[k+a]);max[a]=Math.max(max[a],m.positions[k+a]);}return {min,max};});
  rockBounds=catalogue.instances.map(n=>{const b=bounds[n.mesh],s=n.s||[1,1,1],c=Math.cos(n.yaw||0),q=Math.sin(n.yaw||0),cp=Math.cos(n.pitch||0),sp=Math.sin(n.pitch||0),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let k=0;k<8;k++){const x=k&1?b.max[0]:b.min[0],y=k&2?b.max[1]:b.min[1],z=k&4?b.max[2]:b.min[2],px=(cp*x-sp*y)*s[0],py=(sp*x+cp*y)*s[1],pz=z*s[2],p=[n.p[0]+c*px+q*pz,n.p[1]+py,n.p[2]-q*px+c*pz];for(let a=0;a<3;a++){min[a]=Math.min(min[a],p[a]);max[a]=Math.max(max[a],p[a]);}}return {min,max};
  });lastCatalogue=catalogue;return rockBounds;
 }
 function terrainCeiling(x,z,radius){
  let highest=-Infinity;
  // Every coast triangle uses vertices from the 22-segment near lattice or
  // 7-segment far lattice. Include a whole surrounding cell on both, so their
  // maximum bounds the rendered piecewise-linear surface throughout the box.
  for(const [step,ox,oz] of x-radius>=260?[[5,260,-395]]:[[64/22,-320,-410],[64/7,-320,-410]]){
   for(let i=Math.floor((x-radius-ox)/step);i<=Math.ceil((x+radius-ox)/step);i++)for(let j=Math.floor((z-radius-oz)/step);j<=Math.ceil((z+radius-oz)/step);j++){
    const px=ox+i*step,pz=oz+j*step,y=groundHeight(px,pz);if(Number.isFinite(y))highest=Math.max(highest,y);
   }
  }
  return highest;
 }
 function supportCeiling(x,z,radius,bounds){
  let highest=terrainCeiling(x,z,radius);
  const intersects=b=>x+radius>=b.min[0]&&x-radius<=b.max[0]&&z+radius>=b.min[2]&&z-radius<=b.max[2];
  // These bounds enclose actual rendered rock vertices, not old ellipsoids.
  for(const b of bounds)if(intersects(b))highest=Math.max(highest,b.max[1]);
  for(const system of [typeof OceanRegions==='undefined'?null:OceanRegions,typeof OceanTrench==='undefined'?null:OceanTrench])for(const b of system?.solids||[])if(intersects(b))highest=Math.max(highest,b.max[1]);
  return highest;
 }
 function schoolLayout(seed){
  const bounds=stoneBounds();if(!bounds)return [];
  return schools.map((s,group)=>{
   const span=s.span*(.92+.08*value(seed,s.id,2)),size=envelope(span),x=s.home[0]+(value(seed,s.id,0)-.5)*4,z=s.home[2]+(value(seed,s.id,1)-.5)*4,floor=supportCeiling(x,z,size.horizontal,bounds),y=Math.max(s.home[1],floor+size.vertical+.9);
   // Authored corridors have headroom; fail closed on a future incompatible
   // terrain edit instead of materializing a school inside rock or above water.
   if(!Number.isFinite(floor)||y+size.vertical>-.75)return null;
   return {id:s.id,group,home:[x,y,z],span,count:s.count,floor,...size};
  });
 }
 function original(f){let b=baseline.get(f);if(!b){b={phase:f.phase,orbit:f.orbit};if(deepByUID.has(f.uid))Object.assign(b,{home:f.home.slice(),center:f.center.slice(),homeYaw:f.homeYaw,radius:f.radius,habitatFloor:f.habitatFloor,habitatCeiling:f.habitatCeiling});baseline.set(f,b);}return b;}
 function deepApply(f,b,sp,saved,protectedActor){
  const d=deepByUID.get(f.uid);if(!d||d.species!==sp.id)return;
  const before=f.home.slice();f.home=b.home.slice();f.center=b.center.slice();for(const key of ['homeYaw','radius','habitatFloor','habitatCeiling'])f[key]=b[key];
  let choice=-1;
  if(saved.deepVersion===1&&!protectedActor){
   const first=Math.floor(value(saved.seed,f.uid,20)*d.homes.length);
   for(let k=0;k<d.homes.length;k++){const i=(first+k)%d.homes.length;if(deepSafe(d.homes[i],d,sp)){choice=i;break;}}
   if(choice>=0){const home=d.homes[choice],delta=home.map((v,i)=>v-b.home[i]);f.home=home.slice();f.center=b.center.map((v,i)=>v+delta[i]);f.homeYaw=(b.homeYaw||0)+(value(saved.seed,f.uid,21)-.5)*Math.PI*1.5;f.radius=d.radius;f.phase=b.phase+value(saved.seed,f.uid,22)*Math.PI*2;f.orbit=b.orbit+value(saved.seed,f.uid,22)*Math.PI*2;f.habitatFloor=b.habitatFloor+delta[1];f.habitatCeiling=b.habitatCeiling+delta[1];}
  }
  // Do not sweep from the previous dive's home. Ordinary frame motion keeps
  // its own continuous cache; only an actual arrangement move invalidates it.
  if(before.some((v,i)=>v!==f.home[i])&&typeof animalRockMotion!=='undefined')animalRockMotion.delete(f);
  deepLayout.push({uid:f.uid,choice,home:f.home.slice(),fallback:saved.deepVersion===1&&!protectedActor&&choice<0});
 }
 function protectedSpecies(){
  const ids=new Set(),features=voyage.state.features||{},mail=features.expedition?.mail||{};
  if(typeof oceanExpedition!=='undefined')for(const r of oceanExpedition.requests)if(['accepted','ready'].includes(mail[r.id]?.status))ids.add(r.species);
  const waypoint=voyage.state.waypoint;if(typeof waypoint==='string'&&waypoint.startsWith('habitat:'))ids.add(waypoint.slice(8));
  return ids;
 }
 function captureProtection(){return cleanProtection({species:[...protectedSpecies()],uids:(voyage.state.features?.ecology?.partners||[]).map(p=>p.uid)});}
 function apply(){
  const saved=state();
  // A dive's routes and attendance depend on its saved protection snapshot,
  // never later waypoint/mail/partner edits. Seed-only saves migrate once from
  // their saved context; only a genuinely new dive refreshes these inputs.
  if(!saved.protection)saved.protection=captureProtection();
  const seed=saved.seed,protectedIDs=new Set(saved.protection.species),owned=new Set(saved.protection.uids),groups=new Map();deepLayout=[];deepAnchors=[];
  for(const f of life){
   const b=original(f),sp=SPECIES[f.species],id=sp?.id||'',protectedActor=owned.has(f.uid)||protectedIDs.has(id),mobile=id==='barramundi'||f.species>0&&f.species<12||sp?.pelagic||sp?.cetacean||f.reefFish&&!['fire_goby','banggai_cardinal'].includes(id);
   f.encounterPresent=true;f.encounterEpoch=seed;
   if(Number.isFinite(b.phase))f.phase=b.phase;if(Number.isFinite(b.orbit))f.orbit=b.orbit;
   deepApply(f,b,sp,saved,protectedActor);
   if(sp?.abyss||sp?.trench||f.oarfish||f.frilledShark||f.barreleye||f.abyssCommunity)deepAnchors.push(f.home||f.center);
   if(mobile&&!protectedActor){const offset=value(seed,f.uid,3)*Math.PI*2;if(Number.isFinite(b.phase))f.phase=b.phase+offset;if(Number.isFinite(b.orbit))f.orbit=b.orbit+offset;}
   // Only common swimming reef-fish pools vary attendance. Attached animals,
   // unique encounters and all deep-water routes remain continuously available.
   if(!protectedActor&&(f.species>0&&f.species<8||f.reefFish&&['lyretail_anthias','longnose_butterfly'].includes(id))){const p=f.home||f.center,key=id+':'+Math.floor(p[0]/40)+':'+Math.floor(p[2]/40);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
  }
  for(const [key,members] of groups){const minimum=Math.min(members.length,Math.max(2,Math.ceil(members.length*.70))),count=minimum+Math.floor(value(seed,key,4)*(members.length-minimum+1));members.sort((a,b)=>value(seed,a.uid,5)-value(seed,b.uid,5));for(let i=count;i<members.length;i++)members[i].encounterPresent=false;}
  layout=schoolLayout(seed);let at=0;
  for(let group=0;group<schools.length;group++){const site=layout[group];for(let k=0;k<schools[group].count&&at<shoal.length;k++,at++){const f=shoal[at],b=original(f);if(!site){delete f.schoolHome;delete f.schoolGroup;delete f.schoolSpan;delete f.schoolFloor;f.phase=b.phase;continue;}f.schoolHome=site.home;f.schoolGroup=group;f.schoolSpan=site.span;f.schoolFloor=site.floor;f.phase=b.phase+value(seed,f.uid,6)*Math.PI*2;f.encounterEpoch=seed;}}
  if(typeof oceanSeasons!=='undefined')oceanSeasons.sync(true);
  if(typeof renderer!=='undefined'&&renderer){renderer.dirty=true;renderer.forceShadow=true;}
 }
 function newSeed(previous){let seed=0;try{const n=new Uint32Array(1);globalThis.crypto?.getRandomValues(n);seed=n[0];}catch(_){}if(!seed||seed===previous)seed=hash(previous+0x9e3779b9)||1;return seed===previous?(previous%0xffffffff)+1:seed;}
 function prepareDive({resume=false}={}){if(!resume){const saved=state();saved.seed=newSeed(saved.seed);saved.protection=captureProtection();saved.deepVersion=1;}apply();}
 const feature={id:'encounters',initial,sanitize,init:apply,reset:apply,prepareDive};oceanFeatures.register(feature);
 return {initial,sanitize,feature,deepHomes:()=>deepAnchors,rules:{schools,envelope,terrainCeiling,deepHabitats},snapshot:()=>({seed:state().seed,deepVersion:state().deepVersion,deep:deepLayout.map(d=>({...d,home:d.home.slice()})),life:life.length,shoal:shoal.length,present:life.filter(f=>f.encounterPresent!==false).length,schools:layout.map(s=>s?{...s,home:s.home.slice()}:null)})};
})();
