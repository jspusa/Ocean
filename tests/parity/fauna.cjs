/* Public model seam: real Geometry/indexGeometry, stable catalogue entries and
 * biological dimensions. GPU motion and microscopy are covered by integration QA. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
const context=vm.createContext({console});
vm.runInContext(read('engine.js')+'\n'+read('world.js')+'\n'+read('open_world.js').match(/const dolphinSpec=.*?\nSPECIES\.push\(dolphinSpec\);/s)[0],context);
const previous=vm.runInContext('JSON.stringify(SPECIES)',context);
vm.runInContext(read('fauna.js'),context);
const species=vm.runInContext('SPECIES',context),build=vm.runInContext('faunaGeometry',context),traits=vm.runInContext('speciesTraits',context),index=vm.runInContext('indexGeometry',context);
let count=0;const check=(name,fn)=>{fn();console.log('PASS '+name);count++};
check('a tiny seahorse remains metre-scaled and produces a drawable model without replacing legacy species',()=>{
 assert.equal(JSON.stringify(species.slice(0,12)),previous);
 const sp=species.find(s=>s.id==='pygmy_seahorse'),g=build(sp.id),mesh=index(g.v);
 assert(sp&&g.species===12&&mesh.indices.length>300);
 const ys=[];for(let i=1;i<g.v.length;i+=12)ys.push(g.v[i]*sp.size);
 assert(Math.max(...ys)-Math.min(...ys)<=.0241,'Bargibant maximum height is 24 mm, never a 6 cm display animal');
 assert(traits(sp.id).micro&&!traits(sp.id).grabbable);
 assert(mesh.vertices.every(Number.isFinite));assert(mesh.indices.every(i=>i<mesh.vertices.length/12));
});
check('a seahorse fin remains drawable from both sides of the animal',()=>{
 const g=build('pygmy_seahorse'),directions=new Set();
 for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===3&&Math.abs(g.v[k+5])>.25)directions.add(Math.sign(g.v[k+5]));
 assert(directions.has(-1)&&directions.has(1),'fin must have opposing surface normals, not two forward-facing copies');
});
for(const sp of species.filter(s=>s.fauna))check(sp.id+' has finite indexed detail, bounded LOD and a stable ground reference',()=>{
 const high=build(sp.id),low=build(sp,true);assert.equal(high.material,0);assert.equal(high.species,species.indexOf(sp));assert.equal(low.species,high.species);
 assert(high.v.length/36<12000&&low.v.length<high.v.length*.65,'mobile LOD must actually reduce geometry');
 for(const g of [high,low]){assert(g.v.every(Number.isFinite));for(let k=0;k<g.v.length;k+=12){const n=Math.hypot(...g.v.slice(k+3,k+6));assert(n>.98&&n<1.02,'lighting normal');assert(g.v.slice(k+6,k+9).every(c=>c>=0&&c<=1));assert([1,3,4,5,...(sp.id==='nautilus'?[7]:[])].includes(g.v[k+11]));}
  const m=index(g.v);assert(m.indices.every(i=>i<m.vertices.length/12));let visible=0;for(let k=0;k<m.indices.length;k+=3){const a=m.indices[k]*12,b=m.indices[k+1]*12,c=m.indices[k+2]*12;const ab=[0,1,2].map(j=>m.vertices[b+j]-m.vertices[a+j]),ac=[0,1,2].map(j=>m.vertices[c+j]-m.vertices[a+j]);if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>1e-10)visible++;}assert(visible>m.indices.length/3*.999,'indexed mesh does not collapse triangles');
 }
 const a=high.modelBounds,b=low.modelBounds;for(let i=0;i<3;i++)assert(Math.abs(a.size[i]-b.size[i])<.055,'LOD does not change silhouette scale');
 if(['crawl','attached','burrow'].includes(traits(sp.id).motion)){assert(Math.abs(a.min[1])<1e-8);assert.equal(traits(sp.id).floorOffset,0);}else assert(Math.abs(a.min[1]+traits(sp.id).floorOffset)<1e-8);
});
check('upright, crawling, spined and shelled animals have independently distinct physical silhouettes',()=>{
 const bounds=id=>build(id).modelBounds.size;const seahorse=bounds('pygmy_seahorse'),slug=bounds('cinderella_slug'),eel=bounds('garden_eel'),lion=bounds('lionfish'),cuttle=bounds('cuttlefish'),shell=bounds('nautilus');
 assert(seahorse[1]>seahorse[0]*1.4&&seahorse[1]>seahorse[2]*3);
 assert(slug[0]>slug[1]*2&&slug[0]>slug[2]*2);
 assert(eel[1]>eel[0]*3&&eel[1]>eel[2]*10);
 assert(lion[2]>lion[0]&&lion[1]>.6,'spread pectoral fan and long dorsal spines');
 assert(cuttle[2]>cuttle[1]*2,'broad flattened mantle');assert(shell[1]>.98&&shell[2]>.4,'solid shell, not a flat spiral decal');
 const n=build('nautilus'),body=[],arms=[];for(let k=0;k<n.v.length;k+=12)(n.v[k+11]===5?arms:body).push(n.v[k]);assert(Math.max(...arms)>Math.max(...body)+.15,'tentacles visibly extend from aperture');
});
check('legacy interaction permissions and camera framing survive the catalogue extension',()=>{
 for(let i=0;i<12;i++){const t=traits(i);assert.equal(t.feedable,i<8);assert.equal(t.grabbable,i>=8);assert.equal(t.micro,false);assert.equal(t.contactDistance,i===10?12:i===11?5.2:i>=8?4:2.8);assert.equal(t.observeDistance,i===10?80:20);assert.equal(t.viewDistance,i===10?24:i===11?5:i>=8?4:1.8);}
 for(const id of ['pygmy_seahorse','cinderella_slug','garden_eel','pistol_shrimp','frogfish'])assert(!traits(id).grabbable&&traits(id).micro);
 assert(!traits('cinderella_slug').feedable,'a sponge-feeding sea slug does not chase generic fish food');assert(traits('lionfish').feedable&&traits('cuttlefish').feedable);
});
check('field-guide drawings are distinct self-contained original SVGs',()=>{const thumb=vm.runInContext('faunaThumb',context),seen=new Set();for(const sp of species.filter(s=>s.fauna)){const url=thumb(sp.id);assert(url.startsWith('data:image/svg+xml'));const svg=decodeURIComponent(url.split(',').slice(1).join(','));assert(svg.includes('<svg')&&!/<(?:image|script|foreignObject)\b/.test(svg)&&!/(?:href|src)=/.test(svg));seen.add(url);assert.equal(thumb(species.indexOf(sp)),url);}assert.equal(seen.size,8);});
check('unknown catalogue IDs cannot fabricate interactive animals or geometry',()=>{for(const id of ['missing','__proto__',NaN,-1,999]){assert(!traits(id).feedable&&!traits(id).grabbable);assert.throws(()=>build(id),/Unknown fauna/);}});
check('model generation is deterministic and does not change world generation random state',()=>{const before=vm.runInContext('seed',context);for(const sp of species.filter(s=>s.fauna)){assert.equal(JSON.stringify(build(sp.id).v),JSON.stringify(build(sp).v));assert.equal(JSON.stringify(build(sp.id,true).v),JSON.stringify(build(sp,true).v));}assert.equal(vm.runInContext('seed',context),before);});
check('garden eel skin is mostly pale with spots instead of broad dark body bands',()=>{
 const g=build('garden_eel');let total=0,dark=0;
 for(let k=0;k<g.v.length;k+=36){const y=(g.v[k+1]+g.v[k+13]+g.v[k+25])/3;if(y<.2||y>.8||g.v[k+11]!==1)continue;const a=[0,1,2].map(i=>g.v[k+12+i]-g.v[k+i]),b=[0,1,2].map(i=>g.v[k+24+i]-g.v[k+i]),area=Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);total+=area;if((g.v[k+6]+g.v[k+7]+g.v[k+8])/3<.3)dark+=area;
 }assert(dark/total<.20,'spotted pale body, not a banded eel: '+dark/total);
});
check('body pigmentation cannot recolor either eye or its pupil',()=>{
 for(const sp of species.filter(s=>s.fauna&&s.id!=='cinderella_slug'))for(const low of [false,true]){const g=build(sp,low),eyes=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===4)eyes.push({z:g.v[k+2],tone:(g.v[k+6]+g.v[k+7]+g.v[k+8])/3});for(const side of [-1,1]){const half=eyes.filter(p=>p.z*side>0);assert(half.some(p=>p.tone<.1)&&half.some(p=>p.tone>.6),sp.id+' eye and pupil must both be isolated from body pigment');}}
 const eye=vm.runInContext('faunaArt.eye',context),g=vm.runInContext('new Geometry()',context);g.tag=5;eye(g,[.2,.2,.2],.02,false);assert.equal(g.tag,5,'eye helper restores the next appendage material tag');
});
check('curved appendages preserve their attachment points while rounding each bend',()=>{
 const curve=vm.runInContext('faunaArt.curvePoints',context),path=[[-.065,.34,0],[-.16,.23,0],[-.18,.115,0],[-.10,.045,0],[.025,.05,0],[.10,.135,0],[.045,.21,0],[-.015,.18,0]],copy=JSON.stringify(path);
 assert.equal(typeof curve,'function');const points=curve(path,4);assert.equal(points.length,(path.length-1)*4+1);assert.equal(JSON.stringify(path),copy);for(let i=0;i<path.length;i++)assert.deepEqual(Array.from(points[i*4]),path[i]);
 let turn=0;for(let i=1;i<points.length-1;i++){const a=points[i].map((v,k)=>v-points[i-1][k]),b=points[i+1].map((v,k)=>v-points[i][k]);turn=Math.max(turn,Math.acos(Math.min(1,Math.max(-1,a.reduce((n,v,k)=>n+v*b[k],0)/Math.hypot(...a)/Math.hypot(...b)))));}
 assert(turn<.65,'tail bends gradually instead of retaining the original angular corners');
 const low=curve(path,2);assert(low.length<points.length);assert.deepEqual(Array.from(low.at(-1)),path.at(-1),'tail gripping endpoint stays fixed');
});
console.log(count+' fauna model checks passed');
