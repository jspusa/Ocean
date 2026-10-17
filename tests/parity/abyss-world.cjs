'use strict';
/* Source-generated habitats and real metre-scale paths, independent of the bake. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,assert});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','fauna_world','cetacean_world','regions'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
vm.runInContext('addLife=function(){};',c);
vm.runInContext(fs.readFileSync('src/abyss_world.js','utf8'),c,{filename:'abyss_world'});
const r=vm.runInContext('AbyssWorldRules',c),ground=vm.runInContext('groundHeight',c),regions=vm.runInContext('OceanRegions',c),world=vm.runInContext('OceanTrench',c);let n=0;
function check(name,fn){fn();n++;console.log('PASS '+name)}
check('legacy deep-sea fauna occupy separate continental-slope depth layers instead of the shallow showcase',()=>{
 const ranges={coelacanth:[180,280],giant_squid:[600,850],pelican_eel:[900,1600],humpback_anglerfish:[550,1000],japanese_spider_crab:[180,300]};
 assert.equal(Object.keys(r.sites).length,5);
 for(const [id,d]of Object.entries(r.sites)){assert(d.homes.length>0);for(const h of d.homes){const [lo,hi]=ranges[id];assert(-h[1]>=lo&&-h[1]<=hi,id+' actual habitat depth '+(-h[1])+' m');assert(world.containsPosition(h));assert(h[1]>=ground(h[0],h[2])-.001,id+' below terrain');for(const entry of [[-22.6,-2.2,52.5],[0,-7.6,23]])assert(Math.hypot(...h.map((v,k)=>v-entry[k]))>250,id+' away from initial reef');}}
});
check('legacy chart indexes stay stable while the new habitat marks retain exact species depths',()=>{const landmarks=vm.runInContext('LANDMARKS',c);assert.equal(landmarks[8].id,'anchorage');assert.equal(landmarks[9].id,'cave');assert.equal(landmarks[10].id,'ruins');assert.equal(landmarks[11].id,'abyss');assert(landmarks.slice(9).every(l=>Number.isFinite(l.y)&&l.y<-15));});
vm.runInContext(`
const habitatRenderer={batches:[],batch(g,instances,kind,dynamic){const b={geo:g,instances,kind,dynamic};this.batches.push(b);return b;}};
addLife(habitatRenderer);initializeIndividuals(habitatRenderer);
`,c);
const actors=vm.runInContext('life',c),species=vm.runInContext('SPECIES',c),pose=vm.runInContext('faunaMotionPose',c),geometry=vm.runInContext('faunaGeometry',c);
check('all nine persistent animals retain their identities and physical sizes',()=>{
 assert.equal(actors.length,9);const expected=['coelacanth-001','coelacanth-002','giant_squid-001','pelican_eel-001','pelican_eel-002','humpback_anglerfish-001','humpback_anglerfish-002','japanese_spider_crab-001','japanese_spider_crab-002'];assert.deepEqual(Array.from(actors,f=>f.uid),expected);
 for(const f of actors){const sp=species[f.species];assert(f.s.every(s=>s===sp.size));assert(sp.habitat&&sp.habitat.includes('m'),'catalogue explains real world layer');}
});
check('full-body envelopes and sampled mesh vertices clear actual terrain over ten minutes of natural motion',()=>{
 for(const f of actors){const sp=species[f.species],g=geometry(sp,true),hull=vm.runInContext('abyssEnvelope',c)(f),unique=new Map();for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+3);unique.set(p.map(x=>x.toFixed(9)).join(','),p);}const saved=JSON.stringify([f.uid,f.home,f.s]);let previous=null,minY=Infinity,maxY=-Infinity;
  for(let t=0;t<=600;t+=1.87){pose(f,t,f.p);const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sn=Math.sin(f.pitch);minY=Math.min(minY,f.p[1]);maxY=Math.max(maxY,f.p[1]);
   // All floor-grid vertices covering the entire rotated body disk give an
   // upper bound on every planar terrain triangle beneath it. Grid coverage
   // deliberately rounds outwards, so this also includes boundary diagonals.
   let highest=-Infinity;for(let x=Math.floor((f.p[0]-hull.horizontal)/5)*5;x<=Math.ceil((f.p[0]+hull.horizontal)/5)*5;x+=5)for(let z=Math.floor((f.p[2]-hull.horizontal)/5)*5;z<=Math.ceil((f.p[2]+hull.horizontal)/5)*5;z+=5)highest=Math.max(highest,ground(x,z));
   assert(f.p[1]-hull.bottom>=highest-.008,sp.id+' full envelope clears every underlying terrain triangle at '+t);
   assert.equal(regions.nearbySolids(f.p,Math.max(hull.horizontal,hull.bottom,hull.top)).length,0,sp.id+' full envelope avoids region solids');
   // Sample the actual transformed low mesh too, independently of the bounds.
   if(t===0||Math.abs(t-199)<1||Math.abs(t-399)<1||t>598)for(const point of unique.values()){const x=(point[0]*cp-point[1]*sn)*sp.size,y=(point[0]*sn+point[1]*cp)*sp.size,z=point[2]*sp.size,p=[f.p[0]+cy*x+sy*z,f.p[1]+y,f.p[2]-sy*x+cy*z];assert(p[1]>=ground(p[0],p[2])-.008,sp.id+' body penetrates terrain at '+t);assert(!regions.pointBlocked(p,.001),sp.id+' body penetrates solid at '+t);}
   if(previous)assert(Math.hypot(...f.p.map((v,k)=>v-previous[k]))/1.87<sp.motionProfile.speed*1.15,sp.id+' route teleports');previous=f.p.slice();
  }
  pose(f,47,f.p);const p=f.p.slice();pose(f,599,f.p);pose(f,47,f.p);assert.deepEqual(f.p,p);assert.equal(JSON.stringify([f.uid,f.home,f.s]),saved);assert(maxY-minY<1.1,sp.id+' remains in authored depth layer');
  if(sp.traits.motion==='crawl'){assert(Math.abs(f.p[1]-ground(f.p[0],f.p[2]))<.003,'crab feet stay on sediment instead of floating above steep slope');}
 }
});
check('sediment bench is broad enough for full crab legs and preserves all three deeper research sites',()=>{
 for(const f of actors.filter(f=>species[f.species].traits.motion==='crawl'))for(let a=0;a<16;a++){const x=f.home[0]+Math.cos(a*Math.PI/8)*2.1,z=f.home[2]+Math.sin(a*Math.PI/8)*2.1;assert(Math.abs(ground(x,z)+220)<.001,'all walking supports meet the same real sediment surface');}
 for(const station of world.stations){assert(station.p[1]>ground(station.p[0],station.p[2])+.8);assert(!regions.pointBlocked(station.p,.4));}
});
// Exercise the production guide marker and story framing/recording seam at the
// relocated actors; progress is not tied to the old 94 m showcase region.
const voyageSource=fs.readFileSync('src/voyage.js','utf8');vm.runInContext('const voyage={state:{features:{ecology:{partners:[]}}}};'+voyageSource.slice(voyageSource.indexOf('function voyageDestination('),voyageSource.indexOf('function markPlace(')),c);
const storySource=fs.readFileSync('src/story.js','utf8');vm.runInContext(storySource.slice(0,storySource.indexOf('const oceanStory=')),c);
check('species guide marks and both story animal observations remain reachable without sailing or teleporting',()=>{
 const focus=vm.runInContext('animalFocusPoint',c),destination=vm.runInContext('voyageDestination',c),story=vm.runInContext('StoryRules',c),V=vm.runInContext('V',c),vp=(p,target)=>vm.runInContext('mm',c)(vm.runInContext('perspective',c)(69*Math.PI/180,1.5,.01,950),vm.runInContext('lookAt',c)(p,target));
 for(const f of actors){pose(f,0,f.p);const sp=species[f.species],mark=destination('habitat:'+sp.id),first=actors.find(a=>a.species===f.species),target=focus(f);assert.equal(mark.y,first.home[1]+.6);assert.equal(mark.x,first.home[0]);const r=Math.max(sp.traits.viewDistance,sp.size*1.1,1),eye=[target[0],target[1]+Math.max(.85,Math.min(1,r*.12)),target[2]+r];assert(eye[1]>ground(eye[0],eye[2])+.8);assert(!regions.pointBlocked(eye,.4));assert(regions.pathClear(eye,target,.04),sp.id+' clear observation ray');
  if(['coelacanth','giant_squid'].includes(sp.id)){assert(story.animalInFrame(f,sp,vp(eye,target)),sp.id+' fits observation frame');const state=story.initial();state.started=true;state.reports=4;state.step=sp.id==='coelacanth'?0:1;const context={active:true,paused:false,occluded:false,inFrame:true,speed:0,player:eye,target,minimum:Math.max(.5,sp.size*.8),maximum:sp.traits.observeDistance};assert(story.eligible(state,context));for(let i=0;i<80;i++)story.record(state,context,.1);assert.equal(state.step,sp.id==='coelacanth'?1:2);}
 }
});
console.log(n+' abyss world checks passed');
