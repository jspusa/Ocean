'use strict';
/* Real public mesh/measurement seam, independent of generator helpers. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),ctx);
const before=vm.runInContext('JSON.stringify(SPECIES)',ctx),file=path.join(root,'src/trench_fauna.js');if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const species=vm.runInContext('SPECIES',ctx),build=vm.runInContext('faunaGeometry',ctx),index=vm.runInContext('indexGeometry',ctx),points=g=>Array.from({length:g.v.length/12},(_,i)=>g.v.slice(i*12,i*12+12));let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
check('vampire squid is a drawable metre-scaled webbed animal with eight arms and two fine collecting filaments',()=>{
 const sp=species.find(s=>s.id==='vampire_squid');assert(sp,'registered playable species');const g=build(sp),mesh=index(g.v),p=points(g);assert(mesh.indices.length>2000&&mesh.vertices.every(Number.isFinite));assert.equal(sp.size,.28);assert.equal(sp.renderKind,11);
 for(const side of [-1,1]){assert(p.some(v=>v[11]===3&&v[0]<0&&v[2]*side>.22),'separate mantle fins');assert(p.some(v=>v[11]===4&&v[2]*side>.10),'large eyes');assert(p.some(v=>v[11]===5&&v[0]>.48&&v[2]*side>.27),'two thin feeding filaments');}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;assert(p.some(v=>v[11]===5&&v[0]>.35&&Math.hypot(v[1]-.18*Math.cos(a),v[2]-.18*Math.sin(a))<.065),'eight distinct arms around webbed crown');}
 assert(p.some(v=>v[11]===3&&v[0]>.19&&Math.abs(v[1])>.06&&Math.abs(v[2])>.06),'actual membrane spans between arms');
 assert.equal(JSON.stringify(species.slice(0,32)),before,'legacy catalogue remains byte-for-byte data-compatible');
});
check('sea pig stands above sediment on long paired tube feet rather than sliding its body through the floor',()=>{
 const sp=species.find(s=>s.id==='sea_pig');assert(sp,'registered sea-pig species');assert.equal(sp.size,.14);const g=build(sp),p=points(g),body=p.filter(v=>v[11]===1),feet=p.filter(v=>v[11]===5);
 assert(Math.abs(g.modelBounds.min[1])<1e-8);assert(Math.min(...body.map(v=>v[1]))>.08,'body is lifted above foot contacts');
 for(const side of [-1,1])for(const x of [-.30,-.15,0,.15,.30])assert(feet.some(v=>v[2]*side>.19&&v[1]<.022&&Math.abs(v[0]-x)<.06),'five separated supports on each side');
 assert(p.some(v=>v[11]===5&&v[1]>.50),'dorsal sensory papillae');assert(!p.some(v=>v[11]===4),'no invented fish-like eyes on a sea cucumber');
});
check('Mariana snailfish retains small eyes, a ventral disk, divided pectoral lobes and a continuous tail-fin silhouette',()=>{
 const sp=species.find(s=>s.id==='mariana_snailfish');assert(sp,'registered original hadal addition');assert.equal(sp.size,.20);const g=build(sp),p=points(g);
 for(const side of [-1,1]){assert(p.some(v=>v[11]===3&&v[2]*side>.18&&v[1]>.015),'upper pectoral lobe');assert(p.some(v=>v[11]===3&&v[2]*side>.12&&v[1]<-.12),'separate lower pectoral lobe');}
 const eyes=p.filter(v=>v[11]===4);assert(eyes.length>50&&Math.max(...eyes.map(v=>v[1]))-Math.min(...eyes.map(v=>v[1]))<.03,'eyes remain small relative to soft body');
 assert(p.some(v=>v[11]===5&&v[0]>.15&&v[0]<.33&&v[1]<-.12&&Math.abs(v[2])<.05),'pelvic disk beneath head');
 for(const side of [-1,1])assert(p.some(v=>v[11]===3&&v[0]<-.20&&v[1]*side>.065),'dorsal and anal membranes follow tapering tail');
 assert(g.modelBounds.size[0]<1.04&&g.modelBounds.size[0]>.98);assert(sp.originalAddition,'2017 species must not claim to be the exact 2007 Wii fish');
});
for(const sp of species.slice(32))check(sp.id+' high and low models keep physical bounds, unit normals and reduced drawable detail',()=>{
 const hi=build(sp),lo=build(sp,true);assert(hi.v.length/36<16000&&lo.v.length<hi.v.length*.60);
 for(const g of [hi,lo]){const m=index(g.v);assert(m.vertices.every(Number.isFinite));assert(m.indices.every(v=>v<m.vertices.length/12));for(let k=0;k<g.v.length;k+=12){assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-3);assert(g.v.slice(k+6,k+9).every(v=>v>=0&&v<=1));assert([1,3,4,5,6].includes(g.v[k+11]));}for(let k=0;k<g.v.length;k+=36){const a=[0,1,2].map(i=>g.v[k+12+i]-g.v[k+i]),b=[0,1,2].map(i=>g.v[k+24+i]-g.v[k+i]);assert(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-11,'no collapsed triangle');}}
 for(let a=0;a<3;a++)assert(Math.abs(hi.modelBounds.size[a]-lo.modelBounds.size[a])<.035,'LOD does not enlarge the physical animal');
 assert(!sp.traits.feedable&&!sp.traits.grabbable);console.log('  '+hi.v.length/36+'/'+lo.v.length/36+' triangles; '+JSON.stringify(hi.modelBounds));
});
check('all original catalogue collections survive the three additions independently',()=>{assert.deepEqual(Array.from(species.slice(32),s=>s.id),['vampire_squid','sea_pig','mariana_snailfish']);assert.deepEqual(Array.from(vm.runInContext('[FAUNA_SPECIES.length,CETACEAN_SPECIES.length,ABYSS_SPECIES.length,TRENCH_SPECIES.length]',ctx)),[8,7,5,3]);assert.equal(JSON.stringify(species.slice(0,32)),before);});
function firstSurface(g,o,d){const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];let first=null;for(let k=0;k<g.v.length;k+=36){if(![1,4].includes(g.v[k+11]))continue;const a=g.v.slice(k,k+3),e1=sub(g.v.slice(k+12,k+15),a),e2=sub(g.v.slice(k+24,k+27),a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-11)continue;const q=sub(o,a),u=dot(q,h)/det;if(u<0||u>1)continue;const v=dot(d,cross(q,e1))/det;if(v<0||u+v>1)continue;const t=dot(e2,cross(q,e1))/det;if(t>0&&(!first||t<first.t))first={t,tag:g.v[k+11]};}return first;}
check('both small snailfish eyes are the visible surface ahead of the head skin',()=>{for(const low of [false,true])for(const side of [-1,1]){const hit=firstSurface(build('mariana_snailfish',low),[.406,.040,side],[0,0,-side]);assert.equal(hit?.tag,4,'a side view reaches the eye before opaque body skin');}});
check('closed anterior skin has a coherent outward pole normal instead of a bright central dent',()=>{for(const sp of species.slice(32))for(const low of [false,true]){const p=points(build(sp,low)).filter(v=>v[11]===1&&Math.abs(v[0]-(sp.id==='vampire_squid'?.15:.5))<1e-8);assert(p.length>4);assert(p.every(v=>v[3]>.999&&Math.abs(v[4])+Math.abs(v[5])<1e-6),'each duplicate pole shares the anterior normal');}});
console.log(checks+' trench fauna checks passed');
