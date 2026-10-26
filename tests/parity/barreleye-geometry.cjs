/* Actual catalogue / faunaGeometry seam. Native transparency, motion and
 * player workflows have separate browser acceptance; this does not fake them. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark'])vm.runInContext(fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),ctx,{filename:n});
const get=s=>vm.runInContext(s,ctx),previous=get('JSON.stringify(SPECIES.map(s=>s.id))'),shallow=get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))');
const file=path.join(root,'src/barreleye.js');if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:'barreleye'});
const sp=get('SPECIES.find(s=>s.id==="barreleye")');let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function vertices(g,tag){const result=[];for(let k=0;k<g.v.length;k+=12)if(tag===undefined||g.v[k+11]===tag)result.push({p:g.v.slice(k,k+3),n:g.v.slice(k+3,k+6),c:g.v.slice(k+6,k+9),tag:g.v[k+11]});return result;}
function bounds(v){const min=[0,1,2].map(i=>Math.min(...v.map(q=>q.p[i]))),max=[0,1,2].map(i=>Math.max(...v.map(q=>q.p[i])));return {min,max,size:max.map((v,i)=>v-min[i])};}
function hits(g,o,d){const result=[];for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),e1=sub(g.v.slice(k+12,k+15),a),e2=sub(g.v.slice(k+24,k+27),a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-12)continue;const q=sub(o,a),u=dot(q,h)/det,v=dot(d,cross(q,e1))/det,t=dot(e2,cross(q,e1))/det;if(u>=0&&v>=0&&u+v<=1&&t>0)result.push({t,tag:g.v[k+11],p:o.map((n,i)=>n+t*d[i])});}return result.sort((a,b)=>a.t-b.t);}
check('new 14 cm barreleye appends without changing existing species or shallow population',()=>{
 assert(sp,'Barreleye must be registered through the real fauna catalogue');assert.equal(get('SPECIES.length'),44);assert.equal(get('JSON.stringify(SPECIES.slice(0,43).map(s=>s.id))'),previous);assert.equal(get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),shallow);
 assert.equal(sp.latin,'Macropinna microstoma');assert.equal(sp.size,.14);assert.equal(sp.modelUnitLength,1);assert.equal(sp.renderKind,11);assert.equal(sp.motionProfile.type,'barreleye');assert.equal(sp.traits.feedable,false);assert.equal(sp.traits.grabbable,false);assert(sp.thumb?.startsWith('data:image/svg+xml;charset=utf-8,'));
});
const hi=get('faunaGeometry("barreleye")'),lo=get('faunaGeometry("barreleye",true)');
check('public geometry is cached across ID, species and index without sharing LOD buffers',()=>{
 assert.strictEqual(hi,get('faunaGeometry("barreleye")'));assert.strictEqual(hi,get('faunaGeometry(SPECIES.find(s=>s.id==="barreleye"))'));assert.strictEqual(hi,get('faunaGeometry(SPECIES.findIndex(s=>s.id==="barreleye"))'));assert.strictEqual(lo,get('faunaGeometry("barreleye",true)'));assert.notStrictEqual(hi,lo);assert.notStrictEqual(hi.v,lo.v);
});
check('both levels retain total length, compact dark torso, small mouth and paired broad stabilizing fins',()=>{
 for(const g of [hi,lo]){
  const b=bounds(vertices(g)),body=vertices(g,1),fins=vertices(g,3),face=vertices(g,5);
  assert(Math.abs(b.size[0]-1)<1e-8);assert(Math.abs(b.size[0]*sp.size-.14)<1e-10);assert(b.size[1]>.35&&b.size[1]<.65);assert(b.size[2]>.5&&b.size[2]<.8);
  assert(body.some(v=>v.p[0]<-.2&&v.p[1]>.08));assert(body.every(v=>Math.max(...v.c)<.5),'Dark compact body');
  for(const side of [-1,1]){
   assert(fins.some(v=>v.p[0]<0&&v.p[1]<-.10&&side*v.p[2]>.28),'Wide paired pelvic stabilizers');
   assert(fins.some(v=>v.p[0]>.01&&v.p[1]>-.07&&side*v.p[2]>.22),'Separate paired pectorals');
   assert(face.some(v=>v.p[0]>.42&&v.p[1]>-.04&&side*v.p[2]>.035),'Paired anterior olfactory recesses');
  }
  assert(fins.some(v=>v.p[0]<-.4&&v.p[1]>.07)&&fins.some(v=>v.p[0]<-.4&&v.p[1]<-.07),'Caudal fan');
  assert(fins.some(v=>v.p[0]<0&&v.p[1]>.15),'Dorsal fin');assert(fins.some(v=>v.p[0]<0&&v.p[1]<-.18),'Anal fin');
  const mouth=face.filter(v=>v.p[0]>.485);assert(mouth.length>10);assert(bounds(mouth).size[1]<.045&&bounds(mouth).size[2]<.055,'Small terminal mouth, not an anglerfish jaw');
 }
});
check('paired silver eye tubes and green lenses sit inside the clear crown, separate from olfactory organs',()=>{
 for(const g of [hi,lo]){
  const eyes=vertices(g,4),cap=vertices(g,8),face=vertices(g,5);assert(eyes.length>100&&cap.length>100);
  for(const side of [-1,1]){
   const ocular=eyes.filter(v=>side*v.p[2]>0),b=bounds(ocular);assert(b.size[1]>.12&&b.size[0]<.13&&b.size[2]<.12,'Tall eye tube rather than external side eyeball');
   assert(ocular.some(v=>v.p[1]>.17&&v.c[1]>v.c[0]*1.5&&v.c[1]>v.c[2]*1.25),'Green upper lens');assert(ocular.some(v=>v.p[1]<.13&&Math.min(...v.c)>.35),'Silver lower ocular tube');
   const ray=hits(g,[.24,.5,side*.074],[0,-1,0]);assert.equal(ray[0]?.tag,8,'Clear cap is first above each eye');assert.equal(ray.find(h=>h.tag!==8)?.tag,4,'Opaque body does not cover the internal eye');
   const front=hits(g,[.7,-.017,side*.048],[-1,0,0]);assert.equal(front.find(h=>h.tag!==8)?.tag,5,'Forward dark recess is its own anatomical region');
  }
  const cb=bounds(cap),eb=bounds(eyes);for(let i=0;i<3;i++)assert(cb.min[i]<eb.min[i]&&cb.max[i]>eb.max[i]);assert(face.every(v=>v.tag!==4));
 }
});
check('last contiguous cap subrange retains full model bounds and outward convex surface normals',()=>{
 for(const g of [hi,lo]){
  const s=g.transparentShell;assert(s&&Number.isInteger(s.first)&&Number.isInteger(s.count));assert(s.first>0&&s.count>0);assert.equal(s.first%3,0);assert.equal(s.count%3,0);assert.equal(s.first+s.count,g.v.length/12);
  for(let i=0;i<g.v.length/12;i++)assert.equal(g.v[i*12+11]===8,i>=s.first,'Only cap triangles occupy the final draw range');
  for(const q of vertices(g,8)){assert(dot(q.n,sub(q.p,[.25,-.035,0]))>0,'Analytic exterior normals');assert(q.p[1]>=-.035-1e-10);}
  const b=bounds(vertices(g));for(let i=0;i<3;i++){assert(Math.abs(b.min[i]-g.modelBounds.min[i])<1e-10);assert(Math.abs(b.max[i]-g.modelBounds.max[i])<1e-10);}assert(g.modelBounds.max[1]>.27,'Bounds include top of cap');
 }
});
check('whole ocular assemblies remain beneath the actual convex cap throughout the authored eye turn',()=>{
 for(const g of [hi,lo]){
  const planes=[];for(let k=g.transparentShell.first*12;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),n=cross(sub(g.v.slice(k+12,k+15),a),sub(g.v.slice(k+24,k+27),a)),length=Math.hypot(...n);planes.push({a,n:n.map(v=>v/length)});}
  for(const degrees of [0,15,30,45,60])for(const q of vertices(g,4)){
   const angle=-degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),x=q.p[0]-.24,y=q.p[1]-.045,p=[.24+c*x-s*y,.045+s*x+c*y,q.p[2]];
   assert(p[1]>=-.035-1e-9,'Eye stays above the embedded cap opening');for(const plane of planes)assert(dot(plane.n,sub(p,plane.a))<=1e-7,'Eye assembly must not emerge through a cap facet at '+degrees+' degrees');
  }
 }
});
check('raw and indexed triangle streams are finite, nondegenerate, outward and nonemissive within budget',()=>{
 let bytes=0;for(const g of [hi,lo]){
  assert(g.v.every(Number.isFinite));assert.equal(g.v.length%36,0);
  for(const q of vertices(g)){assert(Math.abs(Math.hypot(...q.n)-1)<1e-6);assert(q.c.every(v=>v>=0&&v<=1));assert([1,3,4,5,8].includes(q.tag));}
  for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),face=cross(sub(b,a),sub(c,a)),n=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);assert(Math.hypot(...face)>1e-11,'No degenerate raw triangles');assert(dot(face,n)>0,'Source winding agrees with exterior normals, before indexGeometry repair');}
  const mesh=get('indexGeometry')(g.v);assert.equal(mesh.indices.length,g.v.length/12);assert(mesh.indices.every(i=>i<mesh.vertices.length/12));bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
  for(let i=0;i<mesh.indices.length;i+=3){const p=[0,1,2].map(j=>Array.from(mesh.vertices.slice(mesh.indices[i+j]*12,mesh.indices[i+j]*12+3)));assert(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11,'Index welding preserves every triangle');}
 }
 assert(hi.v.length/36<=12000);assert(lo.v.length<hi.v.length*.6);assert(bytes<1024*1024);for(let i=0;i<3;i++)assert(Math.abs(hi.modelBounds.size[i]-lo.modelBounds.size[i])<.01);
 console.log(JSON.stringify({highTriangles:hi.v.length/36,lowTriangles:lo.v.length/36,indexedBytes:bytes,highShell:hi.transparentShell,lowShell:lo.transparentShell,bounds:hi.modelBounds}));
});
console.log(checks+' barreleye geometry checks passed');
