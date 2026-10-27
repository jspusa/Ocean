/* Agreed seams: appended catalogue registration and the real faunaGeometry /
 * indexGeometry streams. Habitat, animation and native appearance are separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','barreleye'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),ctx,{filename:name});
const get=s=>vm.runInContext(s,ctx),before=get('JSON.stringify(SPECIES.map(s=>s.id))'),oldCollection=get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),file=path.join(root,'src/tripod_fish.js');
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:'tripod_fish'});
const sp=get('SPECIES.find(s=>s.id==="tripod_fish")');let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
function vertices(g,tag){const result=[];for(let k=0;k<g.v.length;k+=12)if(tag===undefined||g.v[k+11]===tag)result.push({p:g.v.slice(k,k+3),n:g.v.slice(k+3,k+6),c:g.v.slice(k+6,k+9),tag:g.v[k+11]});return result;}
function bounds(v){const min=[0,1,2].map(a=>Math.min(...v.map(q=>q.p[a]))),max=[0,1,2].map(a=>Math.max(...v.map(q=>q.p[a])));return {min,max,size:max.map((x,i)=>x-min[i])};}
check('tripod fish appends the 45th species without changing the prior 44 identities or shallow population list',()=>{
 assert(sp,'Tripod fish is registered');assert.equal(get('SPECIES.length'),45);assert.equal(get('SPECIES.indexOf(TRIPOD_FISH_SPECIES)'),44);
 assert.equal(get('JSON.stringify(SPECIES.slice(0,44).map(s=>s.id))'),before);assert.equal(get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),oldCollection);
 assert.equal(sp.latin,'Bathypterois grallator');assert.equal(sp.renderKind,11);assert.equal(sp.motionProfile.type,'tripod_fish');assert.equal(sp.traits.motion,'crawl');assert.equal(sp.traits.feedable,false);assert.equal(sp.traits.grabbable,false);
 assert.equal(sp.size,.25);assert.equal(sp.modelUnitLength,1);assert.equal(sp.measureAxis,0);assert.match(sp.naturalSize,/SL/);
 for(const low of [false,true]){const g=get('faunaGeometry("tripod_fish",'+low+')'),b=bounds(vertices(g,1));assert(g.v.length>1000);assert(g.v.every(Number.isFinite));assert(Math.abs(b.min[0]+.5)<1e-9);assert(Math.abs(b.max[0]-.5)<1e-9);assert(b.size[1]<.16&&b.size[2]<.12,'SL measures the slim body from tail peduncle to snout, not the extended fins');}
});
check('three actual fin supports hold the body above one substrate plane at both drawable levels',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("tripod_fish",'+low+')'),a=g.anatomy;assert(a&&a.supports,'Public geometry exposes contact anatomy');assert.equal(a.supports.length,3);assert.equal(a.standardLength.axis,0);assert.equal(a.standardLength.length,1);
  const fins=a.supports.map(s=>s.fin);assert.equal(fins.filter(s=>s==='pelvic').length,2);assert.equal(fins.filter(s=>s==='lower_caudal').length,1);
  assert.equal(g.modelBounds.min[1],0);assert(bounds(vertices(g,1)).min[1]>.88,'The body is supported well above the ground');
  for(const support of a.supports){
   assert.equal(support.contact[1],0);assert.equal(support.tag,7);assert.equal(support.range.first%3,0);assert.equal(support.range.count%3,0);
   const range=[];for(let i=support.range.first;i<support.range.first+support.range.count;i++){const k=i*12;assert.equal(g.v[k+11],7,'Support draw range remains entirely static');range.push(g.v.slice(k,k+3));}
   assert(range.length>80);assert(range.some(p=>Math.hypot(...p.map((x,i)=>x-support.contact[i]))<1e-9),'A real contact vertex touches the declared ground point');
   const length=Math.hypot(...support.root.map((x,i)=>x-support.contact[i]));assert(length>1&&length<1.34,'Pelvic and lower caudal supports are long relative to standard length');
   for(let step=0;step<=8;step++){const t=step/8,probe=support.root.map((x,i)=>x+(support.contact[i]-x)*t);assert(range.some(p=>Math.hypot(...p.map((x,i)=>x-probe[i]))<.08),'Actual fin surface extends all the way from anatomical root to substrate');}
  }
  const [left,right,tail]=a.supports.map(s=>s.contact);assert(left[2]>.4&&right[2]<-.4&&tail[0]<-.9&&Math.abs(tail[2])<1e-9,'Paired pelvic rays and one rear tail ray form a wide triangle');
  const area=(right[0]-left[0])*(tail[2]-left[2])-(right[2]-left[2])*(tail[0]-left[0]);assert(Math.abs(area)>.9,'Contacts are not collinear');
  const bodyOrigin=[0,0];for(const [p,q] of [[left,right],[right,tail],[tail,left]]){const edge=(q[0]-p[0])*(bodyOrigin[1]-p[2])-(q[2]-p[2])*(bodyOrigin[0]-p[0]);assert(edge*area>0,'Body projection lies inside support triangle');}
 }
});
check('sensory pectorals are paired forward fans above the body, separate from the three ground supports',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("tripod_fish",'+low+')'),a=g.anatomy,sensory=vertices(g,3);assert(sensory.length>100,'Pectorals are real fin surfaces');assert.equal(a.sensoryPectorals.length,2);
  assert(sensory.every(q=>q.p[1]>.90&&q.p[0]>.20),'Only sensory pectorals occupy the animated fin tag, never the tail or ground supports');
  for(const side of [-1,1]){const v=sensory.filter(q=>q.p[2]*side>0);assert(v.some(q=>q.p[0]>.56&&q.p[1]>1.19));assert(bounds(v).size[2]>.08,'Pectoral fan has breadth rather than one antenna');const p=a.sensoryPectorals.find(p=>p.side===side);assert(p);assert.equal(p.tag,3);assert(p.root[0]>.20&&p.root[1]>.9);assert(p.range.count>50);}
  const ordinary=vertices(g,5);assert(ordinary.some(q=>q.p[1]>1.15&&q.p[0]>-.2&&q.p[0]<.1),'Single ordinary dorsal fin');assert(!ordinary.some(q=>q.p[0]<-.25&&q.p[0]>-.47&&q.p[1]>1.025),'No posterior adipose fin');assert(ordinary.some(q=>q.p[0]<-.28&&q.p[1]<.86),'Separate anal fin');assert(ordinary.some(q=>q.p[0]<-.65&&q.p[1]>1.04),'Upper caudal lobe stays outside standard length');
  assert(g.modelBounds.min[0]<-.9&&g.modelBounds.max[0]>.56,'Extended fins are not normalized into the .25 m SL');
 }
});
function hits(g,o,d){const result=[],sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),e=sub(g.v.slice(k+12,k+15),a),f=sub(g.v.slice(k+24,k+27),a),h=cross(d,f),det=dot(e,h);if(Math.abs(det)<1e-11)continue;const s=sub(o,a),u=dot(s,h)/det,v=dot(d,cross(s,e))/det,t=dot(f,cross(s,e))/det;if(u>=0&&v>=0&&u+v<=1&&t>0)result.push({t,tag:g.v[k+11]});}return result.sort((a,b)=>a.t-b.t);}
check('pelvic and sensory pectoral attachments enter the actual body surface without a root gap',()=>{
 for(const low of [false,true]){const g=get('faunaGeometry("tripod_fish",'+low+')');for(const p of [...g.anatomy.supports.filter(p=>p.fin==='pelvic'),...g.anatomy.sensoryPectorals]){const side=Math.sign(p.root[2]),outward=hits(g,p.root,[0,0,side]).find(h=>h.tag===1);assert(outward&&outward.t<.03,'An outward ray from the anatomical root must exit real body tissue: '+(p.id||'sensory_'+side));}}
});
check('the black fish retains small visible eyes and a terminal mouth without luminous or bright decorative organs',()=>{
 for(const low of [false,true]){const g=get('faunaGeometry("tripod_fish",'+low+')'),eyes=vertices(g,4),face=vertices(g,5).filter(q=>q.p[0]>.37);assert(eyes.length>30);assert(face.length>20,'Terminal mouth has actual geometry');for(const side of [-1,1]){const b=bounds(eyes.filter(q=>q.p[2]*side>0));assert(b.size[0]<.018&&b.size[1]<.012,'Small reduced eyes');const hit=hits(g,[(b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,side],[0,0,-side])[0];assert.equal(hit?.tag,4,'The eye lies on the visible surface');}assert(vertices(g).every(q=>Math.max(...q.c)<.30),'Authored dark charcoal palette; biological sources do not specify an RGB ceiling');assert(vertices(g,1).every(q=>Math.max(...q.c)-Math.min(...q.c)<.06),'Body stays neutral charcoal rather than a vivid decorative marking');}
 assert(sp.thumb.startsWith('data:image/svg+xml;charset=utf-8,'),'Original catalogue thumbnail exists');assert(sp.source.startsWith('https://fishesofaustralia.net.au/'));
});
check('source and indexed meshes are finite, nondegenerate, outward, nonemissive and inside both detail budgets',()=>{
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),levels=[get('faunaGeometry("tripod_fish")'),get('faunaGeometry("tripod_fish",true)')];let bytes=0;
 for(const g of levels){
  assert.equal(g.v.length%36,0);assert(g.v.every(Number.isFinite));
  for(const q of vertices(g)){assert(Math.abs(Math.hypot(...q.n)-1)<1e-6,'Unit surface normal');assert(q.c.every(v=>v>=0&&v<=1));assert([1,3,4,5,7].includes(q.tag),'No luminous or transparent shell channel');}
  for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),f=cross(sub(g.v.slice(k+12,k+15),a),sub(g.v.slice(k+24,k+27),a)),n=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);assert(Math.hypot(...f)>1e-11,'No degenerate raw triangle');assert(dot(f,n)>0,'Source winding agrees with outward normals');}
  const mesh=get('indexGeometry')(g.v);assert.equal(mesh.indices.length,g.v.length/12);assert(mesh.indices.every(i=>i<mesh.vertices.length/12));bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
  for(let i=0;i<mesh.indices.length;i+=3){const p=[0,1,2].map(j=>Array.from(mesh.vertices.slice(mesh.indices[i+j]*12,mesh.indices[i+j]*12+3)));assert(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11,'Welding preserves real triangles');}
  const b=bounds(vertices(g));for(let i=0;i<3;i++){assert(Math.abs(b.min[i]-g.modelBounds.min[i])<1e-10);assert(Math.abs(b.max[i]-g.modelBounds.max[i])<1e-10);}assert(Object.isFrozen(g.anatomy));assert(Object.isFrozen(g.anatomy.supports));
 }
 const [hi,lo]=levels;console.log('  '+hi.v.length/36+'/'+lo.v.length/36+' triangles; '+bytes+' indexed bytes; '+JSON.stringify(hi.modelBounds));
 assert(hi.v.length/36<9000);assert(lo.v.length/36<3000);assert(lo.v.length<hi.v.length*.65);assert(bytes<700000);for(let i=0;i<3;i++)assert(Math.abs(hi.modelBounds.size[i]-lo.modelBounds.size[i])<.004,'Both LODs keep the same supported silhouette');
});
console.log(checks+' tripod-fish checks passed');
