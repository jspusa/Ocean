/* Public generated geometry, independent of baked assets, habitats and GPU. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),c=vm.createContext({console});
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life'])vm.runInContext(fs.readFileSync('src/'+n+'.js','utf8'),c,{filename:n});
const art=vm.runInContext('pelagicArt',c),build=vm.runInContext('faunaGeometry',c),whale=vm.runInContext('whaleGeometry',c),profile=vm.runInContext('marineProfile',c);let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
function vertices(g,tag){const out=[];for(let k=0;k<g.v.length;k+=12)if(tag===undefined||g.v[k+11]===tag)out.push(g.v.slice(k,k+12));return out;}
function components(g,tag){const parents=[],lookup=new Map(),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);for(let k=0;k<g.v.length;k+=36){if(g.v[k+11]!==tag)continue;const ids=[0,12,24].map(o=>{const key=g.v.slice(k+o,k+o+3).map(v=>Math.round(v*1e7)).join(',');if(!lookup.has(key)){lookup.set(key,parents.length);parents.push(parents.length);}return lookup.get(key);});for(let j=1;j<3;j++)parents[find(ids[j])]=find(ids[0]);}return new Set(parents.map((_,i)=>find(i))).size;}
function silhouette(g,d,width=160,height=112){const length=Math.hypot(...d),z=d.map(v=>v/length),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],x0=cross([0,1,0],z),xn=Math.hypot(...x0),x=x0.map(v=>v/xn),y=cross(z,x),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),p=[];for(let k=0;k<g.v.length;k+=12){const v=g.v.slice(k,k+3);p.push([dot(v,x)*130+80,dot(v,y)*130+56]);}const mask=new Uint8Array(width*height);for(let i=0;i<p.length;i+=3){const a=p[i],b=p[i+1],d=p[i+2],den=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1]);if(Math.abs(den)<1e-10)continue;const left=Math.max(0,Math.floor(Math.min(a[0],b[0],d[0]))),right=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],d[0]))),top=Math.max(0,Math.floor(Math.min(a[1],b[1],d[1]))),bottom=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],d[1])));for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){const u=((b[1]-d[1])*(px+.5-d[0])+(d[0]-b[0])*(py+.5-d[1]))/den,v=((d[1]-a[1])*(px+.5-d[0])+(a[0]-d[0])*(py+.5-d[1]))/den;if(u>=0&&v>=0&&u+v<=1)mask[py*width+px]=1;}}return mask;}
for(const id of ['blue_whale','whale_shark'])check(id+' has one continuous skin with seated anatomy and coherent high/low silhouettes',()=>{
 const hi=build(id),lo=build(id,true);assert.equal(components(hi,1),1,'body is one connected skin, without mouth ropes or nasal lumps');assert.equal(components(lo,1),1);
 for(const g of [hi,lo]){assert(g.v.every(Number.isFinite));assert(Math.abs(g.modelBounds.size[0]-1)<1e-8);for(const p of vertices(g))assert(Math.abs(Math.hypot(...p.slice(3,6))-1)<1e-3);for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),u=g.v.slice(k+12,k+15).map((v,j)=>v-a[j]),v=g.v.slice(k+24,k+27).map((v,j)=>v-a[j]);assert(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12,'no collapsed pole triangles');}}
 for(const g of [hi,lo]){const body=vertices(g,1),nose=Math.max(...body.map(p=>p[0])),pole=body.filter(p=>Math.abs(p[0]-nose)<1e-8);assert(pole.length>10&&pole.every(p=>p[3]>.999&&Math.abs(p[4])+Math.abs(p[5])<1e-8),'closed nose has one outward axial normal');}
 assert(lo.v.length<hi.v.length*.30);
 for(const d of [[0,.1,1],[1,.1,.15],[.7,.25,.7],[-.7,.15,.7]]){const a=silhouette(hi,d),b=silhouette(lo,d);let union=0,intersection=0;for(let i=0;i<a.length;i++){union+=a[i]||b[i];intersection+=a[i]&&b[i];}assert(intersection/union>.975,'view '+d+' silhouette agreement '+intersection/union);}
 for(const side of [-1,1])assert(vertices(hi,3).some(p=>p[0]>.12&&p[0]<.24&&p[2]*side>.025&&p[2]*side<.035),'pectoral roots start beneath body skin');
});
check('rounded foreheads preserve tangent continuity at the body-cap join',()=>{
 for(const [rows,cap,flatten]of [[art.whale.body,.46,0],[art.sharkRows,.465,.18]]){c.rows=rows;c.cap=cap;c.flatten=flatten;const point=vm.runInContext('marineBody(new Geometry(),rows,true,[.3,.4,.4],cap,flatten)',c),min=rows[0][0],max=rows.at(-1)[0],sample=(x,v)=>point(Math.acos(1-2*(x-min)/(max-min))/Math.PI,v),e=1e-6;
  for(const v of [.05,.18,.32,.45,.68,.85]){const a=sample(cap-e,v),b=sample(cap,v),d=sample(cap+e,v),left=a.map((n,k)=>(b[k]-n)/e),right=b.map((n,k)=>(d[k]-n)/e);assert(Math.hypot(...left.map((n,k)=>n-right[k]))<.003,'no hard cap ring');}
  const a=sample(max-.0001,0),b=sample(max-.0002,0),center=profile(rows,cap)[1],ratio=(a[1]-center)/(b[1]-center);assert(ratio>.68&&ratio<.74,'rounded elliptical nose rather than conical closure');
 }
});
check('whale flukes form one notched horizontal surface and shark tail forms one asymmetric vertical surface',()=>{
 for(const low of [false,true]){const blue=vertices(build('blue_whale',low),3),shark=vertices(build('whale_shark',low),3);assert(blue.some(p=>p[0]<-.43&&p[2]>.145)&&blue.some(p=>p[0]<-.43&&p[2]<-.145));assert(shark.some(p=>p[0]<-.46&&p[1]>.19)&&shark.some(p=>p[0]<-.46&&p[1]<-.12));assert(!shark.some(p=>p[0]<-.36&&Math.abs(p[2])>.02),'caudal tail stays in the vertical plane');}
});
check('humpback keeps one smooth skin and matching visible head and fin bounds at both LODs',()=>{
 const hi=whale(false),lo=whale(true);assert.equal(components(hi,1),1);assert.equal(components(lo,1),1);const bounds=g=>[0,1,2].map(a=>{const v=vertices(g).map(p=>p[a]);return [Math.min(...v),Math.max(...v)];}),a=bounds(hi),b=bounds(lo);for(let k=0;k<3;k++)for(let j=0;j<2;j++)assert(Math.abs(a[k][j]-b[k][j])<.04);assert(lo.v.length<hi.v.length*.30);
});
console.log(checks+' large-animal geometry checks passed');
