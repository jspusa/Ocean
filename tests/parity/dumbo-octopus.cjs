/* Public catalogue and actual drawable geometry. Native rig/appearance and
 * player encounters are verified separately; this suite creates no GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','barreleye'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),ctx,{filename:name});
const get=s=>vm.runInContext(s,ctx),before=get('JSON.stringify(SPECIES.map(s=>s.id))'),shallow=get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),file=path.join(root,'src/dumbo_octopus.js');
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:'dumbo_octopus'});
const sp=get('SPECIES.find(s=>s.id==="dumbo_octopus")');let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
check('a genus-level 20 cm dumbo octopus appends without replacing any existing species or shallow population',()=>{
 assert(sp,'Dumbo octopus is registered');assert.equal(get('JSON.stringify(SPECIES.slice(0,44).map(s=>s.id))'),before);assert.equal(get('SPECIES.length'),45);assert.equal(get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),shallow);
 assert.equal(sp.latin,'Grimpoteuthis sp.');assert.equal(sp.size,.20);assert.equal(sp.measureAxis,1);assert.equal(sp.modelUnitLength,1);assert.equal(sp.renderKind,11);assert.equal(sp.motionProfile.type,'dumbo_octopus');assert.equal(sp.traits.motion,'hover');assert.equal(sp.traits.observeDistance,6);assert.equal(sp.traits.viewDistance,.9);assert.equal(sp.traits.targetRadius,.12);assert(!sp.traits.feedable&&!sp.traits.grabbable);
 assert(sp.naturalSize.includes('代表')&&sp.naturalSize.includes('腕冠')&&sp.naturalSize.includes('非'));assert(sp.thumb?.startsWith('data:image/svg+xml;charset=utf-8,'));
});
const vertices=(g,tag)=>{const out=[];for(let k=0;k<g.v.length;k+=12)if(tag===undefined||g.v[k+11]===tag)out.push({p:g.v.slice(k,k+3),n:g.v.slice(k+3,k+6),c:g.v.slice(k+6,k+9)});return out;};
check('both drawable levels have an upright mantle, two broad ear fins and eight separate arms connected by actual web surfaces',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("dumbo_octopus",'+low+')'),body=vertices(g,1),fins=vertices(g,3),arms=vertices(g,5);
  assert(Math.abs(g.modelBounds.size[1]-1)<.005,'Resting mantle plus arm crown is one unit tall');assert(g.modelBounds.size[0]>.6&&g.modelBounds.size[0]<.9);assert(g.modelBounds.size[2]>1&&g.modelBounds.size[2]<1.3);
  assert(body.some(v=>v.p[1]>.49)&&body.some(v=>v.p[0]>.18&&v.p[1]>.1),'Upright full mantle');assert(body.every(v=>v.p[1]>-.16),'Body does not fill the open arm crown');
  for(const side of [-1,1]){const ear=fins.filter(v=>side*v.p[2]>.25);assert(ear.length>100,'Both ears contain actual broad surfaces');assert(ear.some(v=>side*v.p[2]>.5));assert(Math.max(...ear.map(v=>v.p[0]))-Math.min(...ear.map(v=>v.p[0]))>.2,'Ear is a broad foil, not a filament');}
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,along=p=>p[0]*Math.cos(angle)+p[2]*Math.sin(angle),across=p=>-p[0]*Math.sin(angle)+p[2]*Math.cos(angle);
   assert(arms.some(v=>v.p[1]<-.47&&along(v.p)>.33&&Math.abs(across(v.p))<.012),'Every arm reaches its own distal tip');
   const between=angle+Math.PI/8;assert(arms.some(v=>v.p[1]<-.20&&v.p[1]>-.39&&Math.abs(Math.atan2(Math.sin(Math.atan2(v.p[2],v.p[0])-between),Math.cos(Math.atan2(v.p[2],v.p[0])-between)))<.025),'A membrane spans each arm gap');
  }
  assert(!vertices(g).some(v=>Math.abs(v.p[0])>.5||v.p[1]<-.51),'No long vampire-squid collecting filaments');
 }
});
check('both actual ear foils retain a readable frontal area outside the mantle in each mesh level',()=>{
 // Front is +X. Clip to the exposed part beyond the mantle, then sum only
 // front-facing triangle areas. A wide foil hidden edge-on must fail even
 // though a top-view width or bounding-box test calls it broad.
 const clip= (points,side)=>{const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],da=side*a[2]-.25,db=side*b[2]-.25;if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;};
 const evidence=[];
 for(const low of [false,true])for(const side of [-1,1]){
  const g=get('faunaGeometry("dumbo_octopus",'+low+')');let frontArea=0,topArea=0;
  for(let k=0;k<g.v.length;k+=36){if(g.v[k+11]!==3)continue;const p=clip([g.v.slice(k,k+3),g.v.slice(k+12,k+15),g.v.slice(k+24,k+27)],side);
   for(let j=1;j+1<p.length;j++){const a=p[j].map((v,i)=>v-p[0][i]),b=p[j+1].map((v,i)=>v-p[0][i]);frontArea+=Math.max(0,a[1]*b[2]-a[2]*b[1])*.5;topArea+=Math.max(0,a[2]*b[0]-a[0]*b[2])*.5;}
  }
  evidence.push({low,side,frontArea,topArea,frontToTop:frontArea/topArea});
 }
 console.log(JSON.stringify({frontalEarAreas:evidence}));
 for(const row of evidence){assert(row.frontArea>.025&&row.frontToTop>.45,'An exposed ear must read as a foil from the face: '+JSON.stringify(row));}
 for(const low of [false,true]){const ears=evidence.filter(r=>r.low===low);assert(Math.abs(ears[0].frontArea-ears[1].frontArea)<1e-8,'Both ear poses keep bilateral frontal area');}
});
check('the open crown contains a single central sucker row and paired filament-like cirri on all eight arms, with two separate nonluminous eyes',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("dumbo_octopus",'+low+')'),arms=vertices(g,5),eyes=vertices(g,4),suckers=arms.filter(v=>Math.abs(v.c[0]-.78)<1e-7),cirri=arms.filter(v=>Math.abs(v.c[0]-.83)<1e-7);
  assert(suckers.length>100&&cirri.length>100,'Suckers and cirri are real geometry in both LODs');
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,across=p=>-p[0]*Math.sin(a)+p[2]*Math.cos(a),along=p=>p[0]*Math.cos(a)+p[2]*Math.sin(a),sector=vs=>vs.filter(v=>along(v.p)>.18&&Math.abs(across(v.p))<.06);
   const cups=sector(suckers);assert(cups.length>30);assert(cups.every(v=>Math.abs(across(v.p))<.013),'One narrow central row, not two lateral rows');
   for(const side of [-1,1])assert(sector(cirri).some(v=>across(v.p)*side>.025),'Fine projections extend to both sides of each sucker row');
  }
  for(const side of [-1,1])assert(eyes.some(v=>v.p[0]>.18&&v.p[1]>-.07&&v.p[1]<.06&&side*v.p[2]>.14),'Paired eyes sit ahead of the mantle');
  assert(eyes.every(v=>Math.max(...v.c)<.4),'Eyes are dark tissue, not glow organs');
 }
});
check('the mantle reaches the web attachment ring instead of leaving a floating arm crown',()=>{
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
 for(const low of [false,true])for(let arm=0;arm<8;arm++){
  const g=get('faunaGeometry("dumbo_octopus",'+low+')'),a=arm*Math.PI/4,o=[0,-.06,0],d=[Math.cos(a),0,Math.sin(a)],hits=[];
  for(let k=0;k<g.v.length;k+=36){if(g.v[k+11]!==1)continue;const p=g.v.slice(k,k+3),e1=sub(g.v.slice(k+12,k+15),p),e2=sub(g.v.slice(k+24,k+27),p),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-12)continue;const s=sub(o,p),u=dot(s,h)/det,v=dot(d,cross(s,e1))/det,t=dot(e2,cross(s,e1))/det;if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8&&t>0)hits.push(t);}
  assert(hits.some(t=>t>=.172&&t<.22),'Each actual mantle surface must overlap the 0.17-unit web root');
 }
});
check('the two real mesh levels stay cached, finite, outward, nonemissive and inside the small-animal draw budget',()=>{
 const hi=get('faunaGeometry("dumbo_octopus")'),lo=get('faunaGeometry("dumbo_octopus",true)'),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);let bytes=0;
 assert.strictEqual(hi,get('faunaGeometry(SPECIES.find(s=>s.id==="dumbo_octopus"))'));assert.strictEqual(hi,get('faunaGeometry(SPECIES.findIndex(s=>s.id==="dumbo_octopus"))'));assert.notStrictEqual(hi.v,lo.v);
 for(const g of [hi,lo]){
  assert(g.v.length>0&&g.v.length%36===0&&g.v.every(Number.isFinite));
  for(let k=0;k<g.v.length;k+=12){assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-6,'Unit surface normals');assert(g.v.slice(k+6,k+9).every(v=>v>=0&&v<=1));assert([1,3,4,5].includes(g.v[k+11]),'No luminous or transparent-shell tags');}
  for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),face=cross(sub(g.v.slice(k+12,k+15),a),sub(g.v.slice(k+24,k+27),a)),normal=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);assert(Math.hypot(...face)>1e-11,'No collapsed source triangles');assert(dot(face,normal)>0,'Source winding agrees with surface normals before indexing');}
  const mesh=get('indexGeometry')(g.v);assert.equal(mesh.indices.length,g.v.length/12);assert(mesh.indices.every(i=>i<mesh.vertices.length/12));bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
  for(let k=0;k<mesh.indices.length;k+=3){const p=[0,1,2].map(i=>Array.from(mesh.vertices.slice(mesh.indices[k+i]*12,mesh.indices[k+i]*12+3)));assert(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11,'Welding preserves thin oral details');}
 }
 assert(hi.v.length/36<10000);assert(lo.v.length/36<3000);assert(lo.v.length<hi.v.length*.5);assert(bytes<800000);
 for(let i=0;i<3;i++)assert(Math.abs(hi.modelBounds.size[i]-lo.modelBounds.size[i])<.012,'LOD keeps the animal silhouette and measurement');
 console.log(JSON.stringify({highTriangles:hi.v.length/36,lowTriangles:lo.v.length/36,indexedBytes:bytes,bounds:hi.modelBounds,physicalBounds:{min:hi.modelBounds.min.map(v=>v*sp.size),max:hi.modelBounds.max.map(v=>v*sp.size)}}));
});
console.log(checks+' dumbo octopus geometry checks passed');
