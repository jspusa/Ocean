/* Public catalogue / geometry / partner-contact seam; no GPU fixtures. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),context=vm.createContext({console});
for(const n of ['engine','world','reef_detail','next_reef','open_world','fauna'])vm.runInContext(read(n),context);
const before=vm.runInContext('JSON.stringify(SPECIES)',context),microBefore=vm.runInContext('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))',context);
vm.runInContext(read('cetaceans'),context);
const species=vm.runInContext('SPECIES',context),models=vm.runInContext('faunaGeometry',context),traits=vm.runInContext('partnerTraits',context),index=vm.runInContext('indexGeometry',context);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('orca is a metre-scaled drawable partner with a tall dorsal fin and actual mouth/fin targets',()=>{
 const sp=species.find(s=>s.id==='orca'),g=models(sp),m=index(g.v),p=traits(sp);
 assert(sp.cetacean&&sp.size>=6&&sp.size<=8);assert.equal(sp.bodyLength,1);assert(g.modelBounds.size[0]>.98&&g.modelBounds.size[0]<1.02);assert(g.modelBounds.max[1]>.27,'tall adult male dorsal silhouette');
 assert(m.indices.length>1000&&m.vertices.every(Number.isFinite));assert(sp.traits.grabbable&&!sp.traits.feedable&&!sp.traits.micro);assert.equal(sp.traits.motion,'cetacean');
 for(const key of ['mouth','fin']){const point=p[key],distance=Math.min(...Array.from({length:g.v.length/12},(_,i)=>Math.hypot(...point.map((v,k)=>v-g.v[i*12+k]))));assert(distance<.035,key+' target must sit on visible animal geometry');}
 assert.equal(p.length,sp.size);assert(p.approachSpeed>p.swimSpeed&&p.turnRate>0);
 assert.equal(JSON.stringify(species.slice(0,20)),before);assert.equal(vm.runInContext('JSON.stringify(FAUNA_SPECIES.map(s=>s.id))',context),microBefore,'new partners do not enter micro habitat registry');
});
check('both sides of paired flippers and the dorsal fin have outward facing surfaces',()=>{
 const g=models('orca'),volumes=[0,0,0];for(let k=0;k<g.v.length;k+=36){if(g.v[k+11]!==3)continue;const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),z=(a[2]+b[2]+c[2])/3,y=(a[1]+b[1]+c[1])/3;volumes[Math.abs(z)<.025&&y>.09?0:z>0?1:2]+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}
 assert(volumes.every(v=>v>0),'signed fin volume must be outward on both mirrored sides: '+volumes);
});
check('all eight partner types resolve stable anatomy without expanding the microfauna registry',()=>{
 const ids=['common_dolphin','white_sided_dolphin','commerson_dolphin','orca','beluga','false_killer_whale','rissos_dolphin'];assert.deepEqual(Array.from(species.slice(20),s=>s.id),ids);
 assert.equal(vm.runInContext('CETACEAN_SPECIES.length',context),7);assert.equal(vm.runInContext('FAUNA_SPECIES.length',context),8);
 for(const id of ['dolphin',...ids]){const sp=species.find(s=>s.id===id),a=traits(id);assert.equal(traits(species.indexOf(sp)),a);assert.equal(traits(sp),a);for(const k of ['mouth','fin','ride'])assert(a[k].length===3&&a[k].every(Number.isFinite));assert(a.length>1&&a.swimSpeed>0&&a.approachSpeed>a.swimSpeed&&a.turnRate>0);}
 for(const value of ['whale','turtle','pygmy_seahorse','missing',-1,NaN,null])assert.equal(traits(value),null);assert.equal(traits('dolphin').swimSpeed,3.7);assert.equal(traits('dolphin').approachSpeed,12);
});
for(const sp of species.filter(s=>s.cetacean))check(sp.id+' retains physical scale, smooth finite geometry and usable contact points at both detail levels',()=>{
 const high=models(sp),low=models(sp,true);assert.equal(high.material,0);assert.equal(high.species,species.indexOf(sp));assert.equal(low.species,high.species);assert(high.v.length/36<14000&&low.v.length<high.v.length*.5);
 for(const g of [high,low]){const m=index(g.v);assert(m.vertices.every(Number.isFinite)&&m.indices.every(i=>i<m.vertices.length/12));let visible=0;for(let k=0;k<g.v.length;k+=12){const n=Math.hypot(...g.v.slice(k+3,k+6));assert(n>.99&&n<1.01,sp.id+' finite unit normals');assert(g.v.slice(k+6,k+9).every(c=>c>=0&&c<=1));assert([1,3,4].includes(g.v[k+11]));}for(let k=0;k<g.v.length;k+=36){const a=[0,1,2].map(j=>g.v[k+12+j]-g.v[k+j]),b=[0,1,2].map(j=>g.v[k+24+j]-g.v[k+j]);if(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-11)visible++;}assert(visible>g.v.length/36*.999,'no collapsed triangles');
  for(const side of [-1,1])assert(g.v.some((v,k)=>k%12===11&&v===4&&g.v[k-9]*side>0),'both visible eyes retained');
  for(const key of ['mouth','fin']){const p=traits(sp)[key];let d=Infinity;for(let k=0;k<g.v.length;k+=12)d=Math.min(d,Math.hypot(...p.map((v,i)=>v-g.v[k+i])));assert(d<.035,sp.id+' '+key+' contact misses body');}
 }
 assert(Math.abs(high.modelBounds.size[0]-1)<.015,'bodyLength1 matches whole mesh');for(let a=0;a<3;a++)assert(Math.abs(high.modelBounds.size[a]-low.modelBounds.size[a])<.02,'LOD keeps silhouette scale');assert.equal(sp.traits.floorOffset,-high.modelBounds.min[1]);
});
check('the seven partners have anatomical differences beyond recoloring a shared body',()=>{
 const b=id=>models(id).modelBounds,frontWidth=id=>{const g=models(id),zs=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===1&&g.v[k]>.42)zs.push(Math.abs(g.v[k+2]));return Math.max(...zs)*2};
 assert(b('beluga').max[1]<.15,'beluga has a low ridge, not a dolphin dorsal fin');assert(b('rissos_dolphin').max[1]>.22);assert(b('orca').max[1]>b('commerson_dolphin').max[1]*1.6);assert(frontWidth('commerson_dolphin')>frontWidth('common_dolphin')*1.8,'blunt Commerson head differs from long common-dolphin rostrum');assert(b('orca').size[2]>b('false_killer_whale').size[2]*1.15,'orca has broad paddle flippers');
 const silhouettes=new Set(species.filter(s=>s.cetacean).map(s=>{const g=models(s);return JSON.stringify(g.v.filter((v,k)=>k%12<3))}));assert.equal(silhouettes.size,7);
});
check('body pigment interpolates across triangles instead of assigning one color per face',()=>{
 for(const id of ['orca','common_dolphin','white_sided_dolphin','beluga']){const g=models(id);let varied=0;for(let k=0;k<g.v.length;k+=36)if(g.v[k+11]===1&&Math.hypot(...[6,7,8].map(j=>g.v[k+j]-g.v[k+12+j]))>1e-4)varied++;assert(varied>100,id+' continuously sampled surface color');}
});
check('all catalogue entries have a self-contained original thumbnail fallback',()=>{const urls=new Set();for(const sp of species.filter(s=>s.cetacean)){assert(sp.thumb?.startsWith('data:image/svg+xml'));const svg=decodeURIComponent(sp.thumb.slice(sp.thumb.indexOf(',')+1));assert(!/<(?:image|script|foreignObject)\b/.test(svg)&&!/(?:href|src)=/.test(svg));urls.add(sp.thumb);}assert.equal(urls.size,7)});
console.log(checks+' cetacean model checks passed');
