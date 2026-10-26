/* Original fauna at the agreed catalogue and real mesh seams. Appearance and
 * native shader execution are checked separately in browser acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),ctx,{filename:name});
const get=s=>vm.runInContext(s,ctx),before=get('JSON.stringify(SPECIES.map(s=>s.id))'),oldCollection=get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),file=path.join(root,'src/frilled_shark.js');
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:'frilled_shark'});
const sp=get('SPECIES.find(s=>s.id==="frilled_shark")');let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
check('43rd catalogue entry owns a real 1.7 m eel-shaped shark without changing prior indexes or shallow populations',()=>{
 assert(sp,'Frilled shark is registered');assert.equal(get('SPECIES.length'),43);assert.equal(get('SPECIES.indexOf(FRILLED_SHARK_SPECIES)'),42);
 assert.equal(get('JSON.stringify(SPECIES.slice(0,42).map(s=>s.id))'),before);assert.equal(get('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))'),oldCollection);
 assert.equal(sp.size,1.7);assert.equal(sp.latin,'Chlamydoselachus anguineus');assert.equal(sp.renderKind,11);assert.equal(sp.motionProfile.type,'frilled_shark');assert.equal(sp.traits.feedable,false);assert.equal(sp.traits.grabbable,false);
 const g=get('faunaGeometry("frilled_shark")');assert(g.v.length>1000&&g.v.every(Number.isFinite));assert(Math.abs(g.modelBounds.size[0]-1)<1e-8);assert(g.modelBounds.size[1]<.25&&g.modelBounds.size[2]<.22,'The animal remains long and narrow');
 assert(sp.thumb.startsWith('data:image/svg+xml;charset=utf-8,'));
});
check('both drawable levels retain six separated pairs of projecting gill frills and the first throat connection',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("frilled_shark",'+low+')'),p=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===5)p.push(g.v.slice(k,k+3));
  for(const side of [-1,1])for(const x of [.286,.260,.234,.208,.182,.156])assert(p.some(v=>Math.abs(v[0]-x)<.012&&v[2]*side>.038&&v[1]>-.026&&v[1]<.04),'All six real frills project from each side in both LODs');
  assert(p.some(v=>v[0]>.273&&v[0]<.288&&Math.abs(v[2])<.004&&v[1]<-.05),'The first pair joins continuously beneath the throat');
 }
});
check('high and low silhouettes retain a posterior single dorsal, anal, paired pectoral and pelvic fins and tapering tail',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("frilled_shark",'+low+')'),fins=[],eyes=[];for(let k=0;k<g.v.length;k+=12){if(g.v[k+11]===3)fins.push(g.v.slice(k,k+3));if(g.v[k+11]===4)eyes.push(g.v.slice(k,k+3));}
  assert(fins.some(p=>p[0]<-.22&&p[1]>.070),'Single low posterior dorsal has real height');assert(!fins.some(p=>p[0]>-.15&&p[1]>.065),'No ordinary anterior shark dorsal');assert(fins.some(p=>p[0]<-.27&&p[1]<-.085),'Posterior anal fin remains larger than dorsal');
  for(const side of [-1,1]){assert(fins.some(p=>p[0]>.015&&p[2]*side>.085),'Both paddle-shaped pectorals');assert(fins.some(p=>p[0]<-.12&&p[0]>-.24&&p[2]*side>.055),'Both posterior pelvic fins');assert(eyes.some(p=>p[2]*side>.03),'Both eyes are actual lateral geometry');}
  assert(fins.filter(p=>p[0]<-.47).every(p=>Math.abs(p[1])<.025),'Tail tapers without an ordinary forked lower lobe');
 }
});
function firstSurface(g,o,d){let nearest=null;const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),e1=sub(g.v.slice(k+12,k+15),a),e2=sub(g.v.slice(k+24,k+27),a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-11)continue;const q=sub(o,a),u=dot(q,h)/det,v=dot(d,cross(q,e1))/det,t=dot(e2,cross(q,e1))/det;if(u>=0&&v>=0&&u+v<=1&&t>0&&(!nearest||t<nearest.t))nearest={t,tag:g.v[k+11],p:o.map((n,i)=>n+t*d[i])};}return nearest;}
check('the short terminal mouth is a real recess with separate three-cusped upper and lower tooth crowns',()=>{
 for(const low of [false,true]){
  const g=get('faunaGeometry("frilled_shark",'+low+')'),teeth=[];for(let k=0;k<g.v.length;k+=36)if(g.v[k+11]===5&&g.v[k+6]>.6)teeth.push([0,12,24].map(i=>g.v.slice(k+i,k+i+3)));
  assert(teeth.length>400,'Small solid teeth, not a mouth texture');
  const links=new Map(),key=p=>p.map(x=>x.toFixed(7)).join(',');for(const tri of teeth){const keys=tri.map(key);for(const k of keys){if(!links.has(k))links.set(k,new Set());for(const v of keys)links.get(k).add(v);}}
  const groups=[];while(links.size){const queue=[links.keys().next().value],component=[];while(queue.length){const k=queue.pop(),next=links.get(k);if(!next)continue;links.delete(k);component.push(k.split(',').map(Number));for(const v of next)queue.push(v);}groups.push(component);}
  assert.equal(groups.length,54,'Eighteen tooth crowns each contain three distinct narrow cusps');
  for(const side of [-1,1])assert.equal(groups.filter(c=>c.every(p=>p[0]>.485&&p[1]*side>0)).length,3,'A central crown has three actual cusp meshes in each jaw');
  for(const c of groups){const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i])),far=p=>c.reduce((a,b)=>distance(p,a)>distance(p,b)?a:b),a=far(c[0]),b=far(a),d=b.map((x,i)=>x-a[i]),length=Math.hypot(...d);assert(length>.012,'Each cusp projects into the mouth');for(const p of c){const q=p.map((x,i)=>x-a[i]),t=q.reduce((v,x,i)=>v+x*d[i],0)/(length*length);assert(Math.hypot(...q.map((x,i)=>x-t*d[i]))<.003,'Cusps remain narrow even when angled diagonally');}}
  const hit=firstSurface(g,[.7,-.004,0],[-1,0,0]);assert(hit&&hit.p[0]<.36&&hit.p[0]>.29,'The centre ray reaches the recessed throat instead of an opaque front cap');
 }
});
check('near and far meshes are finite, nondegenerate, nonemissive, anatomically bounded and fit the additional geometry budget',()=>{
 const hi=get('faunaGeometry("frilled_shark")'),lo=get('faunaGeometry("frilled_shark",true)');let bytes=0;
 for(const g of [hi,lo]){
  assert.equal(g.v.length%36,0);assert(g.v.every(Number.isFinite));assert(Math.abs(g.modelBounds.size[0]-1)<1e-8);
  for(let k=0;k<g.v.length;k+=12){assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-6,'Unit normals');assert(g.v.slice(k+6,k+9).every(v=>v>=0&&v<=1));assert([1,3,4,5].includes(g.v[k+11]),'No luminous-organ channel');}
  for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),u=g.v.slice(k+12,k+15).map((x,i)=>x-a[i]),v=g.v.slice(k+24,k+27).map((x,i)=>x-a[i]);assert(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-11,'No collapsed triangle');}
  const mesh=get('indexGeometry')(g.v);assert(mesh.indices.every(i=>i<mesh.vertices.length/12));bytes+=mesh.vertices.byteLength+mesh.indices.byteLength;
  for(const side of [-1,1]){const eye=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===4&&g.v[k+2]*side>0)eye.push(g.v.slice(k,k+3));const center=[0,1].map(i=>(Math.min(...eye.map(p=>p[i]))+Math.max(...eye.map(p=>p[i])))*.5),hit=firstSurface(g,[...center,side],[0,0,-side]);assert.equal(hit?.tag,4,'The visible eyes sit ahead of the opaque head surface');}
 }
 console.log('  '+hi.v.length/36+'/'+lo.v.length/36+' triangles; '+bytes+' indexed bytes; '+JSON.stringify(hi.modelBounds));
 assert(hi.v.length/36<=12000);assert(lo.v.length<hi.v.length*.60);assert(bytes<1024*1024);for(let i=0;i<3;i++)assert(Math.abs(hi.modelBounds.size[i]-lo.modelBounds.size[i])<.01);
});
check('ordinary colour and shadow batch submission selects only the new shark rig without changing incumbent rigs',()=>{
 const Renderer=get('Renderer'),renderer=Object.create(Renderer.prototype),calls=[];renderer.gl={getUniformLocation:(p,n)=>n,uniform1i:(n,x)=>calls.push([n,x]),uniform4f:(n,...v)=>calls.push([n,...v])};
 for(const [id,expected]of [['frilled_shark',5],['oarfish',4],['mariana_snailfish',3],['sea_pig',2],['vampire_squid',1],['coelacanth',0]])for(const pass of ['colour','shadow']){
  calls.length=0;renderer.batchUniforms({p:pass,u:{}},{kind:11,material:0,species:get('SPECIES.findIndex(s=>s.id==='+JSON.stringify(id)+')')},{});
  assert.deepEqual(calls.find(c=>c[0]==='uRigClass'),['uRigClass',expected],id+' '+pass);
  if(id==='frilled_shark'){const surface=calls.find(c=>c[0]==='uSurfaceProfile');assert(surface[1]>.5&&surface[2]<.1&&surface[4]===0,'Brown rough fish tissue, not a luminous or silver skin');}
 }
});
console.log(checks+' frilled-shark model checks passed');
