/* Geometry/catalogue seam; no renderer, habitat, or browser claims. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context);
const before=vm.runInContext('JSON.stringify(SPECIES)',context),groups=vm.runInContext('JSON.stringify([FAUNA_SPECIES.map(s=>s.id),CETACEAN_SPECIES.map(s=>s.id)])',context);
const file=path.join(root,'src/abyss_fauna.js');if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),context);
const species=vm.runInContext('SPECIES',context),model=vm.runInContext('faunaGeometry',context),index=vm.runInContext('indexGeometry',context);
let checks=0;function check(name,run){run();checks++;console.log('PASS '+name);}
check('a metre-scaled coelacanth is drawable with paired fleshy fins and a third tail lobe',()=>{
 const sp=species.find(s=>s.id==='coelacanth');assert(sp,'new species must be registered');assert.equal(sp.size,1.5);const g=model(sp),indexed=index(g.v);assert(indexed.vertices.every(Number.isFinite)&&indexed.indices.length>1000);assert.equal(g.species,27);assert.equal(g.material,0);
 const points=Array.from({length:g.v.length/12},(_,i)=>g.v.slice(i*12,i*12+12));for(const side of [-1,1])assert(points.some(p=>p[11]===3&&p[2]*side>.20),'paired lobed fin silhouette');
 assert(points.some(p=>p[0]<-.44&&Math.abs(p[1])<.035),'projecting central caudal lobe');for(const side of [-1,1])assert(points.some(p=>p[0]<-.32&&p[1]*side>.12),'upper/lower caudal lobes');
 assert(Math.abs(g.modelBounds.size[0]-1)<.025);assert.equal(JSON.stringify(species.slice(0,27)),before);assert.equal(vm.runInContext('JSON.stringify([FAUNA_SPECIES.map(s=>s.id),CETACEAN_SPECIES.map(s=>s.id)])',context),groups);
});
check('giant squid has eight shorter arms plus two separately clubbed feeding tentacles',()=>{
 const sp=species.find(s=>s.id==='giant_squid');assert(sp,'giant squid registered');const g=model(sp),p=[];for(let k=0;k<g.v.length;k+=12)p.push(g.v.slice(k,k+12));assert.equal(sp.size,8);assert(Math.abs(g.modelBounds.size[0]-1)<.02);
 for(const side of [-1,1]){assert(p.some(v=>v[11]===3&&v[0]<-.35&&v[2]*side>.06),'posterior mantle fin');assert(p.some(v=>v[11]===4&&v[2]*side>.04),'large lateral eye');assert(p.some(v=>v[11]===5&&v[0]>.40&&v[2]*side>.03),'two long feeding clubs');}
 for(let i=0;i<8;i++){const angle=i/8*Math.PI*2,tip=[.11+(i%2)*.025,Math.cos(angle)*.050,Math.sin(angle)*.079];assert(p.some(v=>v[11]===5&&Math.hypot(...tip.map((x,k)=>x-v[k]))<.035),'eight discrete shorter arm tips');}
});
check('pelican eel has a hollow expanded mouth, tiny lateral eyes and an independently tagged tail light',()=>{
 const sp=species.find(s=>s.id==='pelican_eel');assert(sp,'pelican eel registered');const g=model(sp),tags=new Set();let jaw=0,tail=0,light=0;for(let k=0;k<g.v.length;k+=12){const [x,y,z]=g.v.slice(k,k+3);tags.add(g.v[k+11]);if(x>.2&&Math.abs(z)>.10)jaw++;if(x<-.2&&Math.abs(z)<.012)tail++;if(g.v[k+11]===6&&x<-.45)light++;}assert(jaw>100&&tail>100&&light>20);assert(tags.has(4));assert(sp.size<=.8);
});
check('small female angler has inward teeth and an eye-independent luminous esca above the head',()=>{
 const sp=species.find(s=>s.id==='humpback_anglerfish');assert(sp,'angler registered');const g=model(sp);assert.equal(sp.size,.09);assert(sp.traits.micro);let lure=0,teeth=0,eyes=0;for(let k=0;k<g.v.length;k+=12){const [x,y,z]=g.v.slice(k,k+3),tag=g.v[k+11];if(tag===6&&y>.4&&x>.2)lure++;if(tag===1&&x>.25&&Math.abs(z)<.16&&g.v[k+6]>.5)teeth++;if(tag===4)eyes++;}assert(lure>30&&teeth>50&&eyes>30);assert(g.modelBounds.size[1]>.6);
});
check('spider crab uses true legspan metres and retains eight ground-reaching legs plus two claws',()=>{
 const sp=species.find(s=>s.id==='japanese_spider_crab');assert(sp,'crab registered');const g=model(sp);assert.equal(sp.measureAxis,2);assert.equal(sp.size,3);assert(Math.abs(g.modelBounds.size[2]-1)<.01);assert.equal(g.modelBounds.min[1],0);
 for(const side of [-1,1])for(const x of [-.18,-.07,.055,.19]){let found=false;for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===5&&g.v[k+2]*side>.43&&g.v[k+1]<.03&&Math.abs(g.v[k]-x)<.065)found=true;assert(found,'walking leg contact '+x+' '+side);}
 for(const side of [-1,1])assert(g.v.some((v,k)=>k%12===11&&v===5&&g.v[k-11]>.35&&g.v[k-9]*side>.12),'forward articulated cheliped');
});
for(const sp of species.slice(27))check(sp.id+' high/low meshes keep their scale, finite normals, drawable topology and original thumbnail',()=>{
 const high=model(sp),low=model(sp,true);assert(high.v.length/36<14000);assert(low.v.length<high.v.length*.53);assert.equal(high.material,0);assert.equal(high.species,species.indexOf(sp));
 for(const g of [high,low]){const indexed=index(g.v);assert(indexed.vertices.every(Number.isFinite));assert(indexed.indices.every(v=>v<indexed.vertices.length/12));for(let k=0;k<g.v.length;k+=12){assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<.001,'unit normal');assert(g.v.slice(k+6,k+9).every(v=>v>=0&&v<=1));assert([1,3,4,5,6].includes(g.v[k+11]));}for(let k=0;k<g.v.length;k+=36){const a=[0,1,2].map(i=>g.v[k+12+i]-g.v[k+i]),b=[0,1,2].map(i=>g.v[k+24+i]-g.v[k+i]);assert(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-11,'no collapsed triangles');}}
 for(let a=0;a<3;a++)assert(Math.abs(high.modelBounds.size[a]-low.modelBounds.size[a])<.025,'LOD preserves proportions');assert(sp.thumb.startsWith('data:image/svg+xml'));assert(!/<(?:image|script|foreignObject)\b/.test(decodeURIComponent(sp.thumb)));assert(!sp.traits.feedable&&!sp.traits.grabbable);assert.equal(sp.renderKind,10);
 console.log('  triangles '+high.v.length/36+' / '+low.v.length/36+'; bounds '+high.modelBounds.size.map(v=>v.toFixed(3)).join(','));
});
check('deep-water registry is independent and stable across the appended catalogue',()=>{assert.deepEqual(Array.from(species.slice(27),s=>s.id),['coelacanth','giant_squid','pelican_eel','humpback_anglerfish','japanese_spider_crab']);assert.equal(vm.runInContext('ABYSS_SPECIES.length',context),5);assert.equal(JSON.stringify(species.slice(0,27)),before);assert.equal(vm.runInContext('JSON.stringify([FAUNA_SPECIES.map(s=>s.id),CETACEAN_SPECIES.map(s=>s.id)])',context),groups);});
check('mouth-neck refinement joins the angler head without changing any reviewed model envelope',()=>{
 const g=model('humpback_anglerfish');assert(g.v.some((v,k)=>k%12===0&&v>.32&&v<.36&&Math.abs(g.v[k+2])>.13),'mouth outer collar remains broad beyond the head, rather than a pinched cone');
 assert(g.v.some((v,k)=>k%12===0&&v>.38&&v<.42&&Math.abs(g.v[k+2])>.163&&g.v[k+6]>.085),'painted head cheeks reach the oral rim rather than ending at a closed posterior point');
 const saved=[[-.51,-.178,-.2764812627917636,.49,.22895583067378894,.2764812627917636],[-.49975877746916697,-.07729693900020555,-.1041910895284383,.5002412225308329,.07703567793565862,.1041910895284383],[-.5219164118246686,-.1691221677044579,-.14261859991648648,.47808358817533125,.13036563581183808,.14261859991648648],[-.562685093780849,-.26087085458494524,-.31738903101728744,.4373149062191511,.48721767802778754,.31738903101728744],[-.1897348418834901,0,-.5,.40740162396994073,.2573132093937881,.5]];
 species.slice(27).forEach((sp,i)=>{const b=model(sp).modelBounds;[...b.min,...b.max].forEach((v,j)=>assert(Math.abs(v-saved[i][j])<1e-9,sp.id+' preserves prior bound '+j));});
});
check('raised three-quarter crab guide camera frames the actual mesh with separated lateral legs',()=>{
 const sp=species.find(s=>s.id==='japanese_spider_crab'),g=model(sp),V=vm.runInContext('V',context),b=g.modelBounds,c=b.min.map((v,i)=>(v+b.max[i])*.5*sp.size),offset=V.mul(V.norm([.70,.48,.70]),sp.size*1.27),eye=V.add(c,offset),vp=vm.runInContext('mm',context)(vm.runInContext('perspective',context)(40*Math.PI/180,640/360,.002,700),vm.runInContext('lookAt',context)(eye,c)),project=vm.runInContext('project',context);let maxX=0,maxY=0;
 for(let k=0;k<g.v.length;k+=12){const p=project(g.v.slice(k,k+3).map(x=>x*sp.size),vp);assert(p[2]>.002);maxX=Math.max(maxX,Math.abs(p[0]));maxY=Math.max(maxY,Math.abs(p[1]));}assert(maxX<.94&&maxY<.94,'whole unscaled anatomy fits');assert(maxX>.35,'guide does not waste most of its width');
});
console.log(checks+' abyss fauna model checks passed');
