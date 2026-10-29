/* Actual generated turtle geometry: observable exterior anatomy, no GPU. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console});
for(const name of ['engine','world','next_reef'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
const build=vm.runInContext('turtleGeometry',c),distant=vm.runInContext('distantTurtle',c);let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
// Orthographic rays use triangle barycentrics, independently of the builders.
function verticalHits(g,x,z){
 const hits=[];
 for(let k=0;k<g.v.length;k+=36){
  const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),d=g.v.slice(k+24,k+27);
  const den=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2]);
  if(Math.abs(den)<1e-12)continue;
  const u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/den;
  const v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/den;
  if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)hits.push({y:u*a[1]+v*b[1]+(1-u-v)*d[1],tag:g.v[k+11]});
 }
 return hits.sort((a,b)=>a.y-b.y);
}
function components(g,accept){
 const parents=[],ids=new Map(),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 for(let k=0;k<g.v.length;k+=36){const vertices=[0,12,24].map(o=>g.v.slice(k+o,k+o+12));if(!vertices.every(accept))continue;
  const triangle=vertices.map(p=>{const key=p.slice(0,3).map(v=>Math.round(v*1e7)).join(',');if(!ids.has(key)){ids.set(key,parents.length);parents.push(parents.length);}return ids.get(key);});
  for(let j=1;j<3;j++)parents[find(triangle[j])]=find(triangle[0]);
 }
 return new Set(parents.map((_,i)=>find(i))).size;
}
function edges(g,accept){
 const edges=new Map(),key=p=>p.slice(0,3).map(v=>Math.round(v*1e7)).join(',');
 for(let k=0;k<g.v.length;k+=36){const p=[0,12,24].map(o=>g.v.slice(k+o,k+o+12));if(!p.every(accept))continue;
  for(let j=0;j<3;j++){const a=p[j],b=p[(j+1)%3],ka=key(a),kb=key(b);if(ka===kb)continue;const id=[ka,kb].sort().join('|');if(edges.has(id))edges.get(id).count++;else edges.set(id,{a,b,count:1});}
 }
 return [...edges.values()];
}
function boundaryEdges(g,accept){return edges(g,accept).filter(e=>e.count===1);}
function silhouette(g,d){
 const size=288,mask=new Uint8Array(size*size),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>a.map(v=>v/Math.hypot(...a));
 const z=norm(d),x=norm(cross(Math.abs(z[1])>.95?[0,0,1]:[0,1,0],z)),y=cross(z,x),points=[];
 // Existing 14 m LOD handover, largest existing adult scale, desktop 69 deg
 // vertical FOV and 1080 px viewport: one pixel is an actual screen tolerance.
 const focal=1080/(2*Math.tan(69*Math.PI/360)),scale=1.12;
 for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+3),f=focal*scale/(14-dot(p,z)*scale);points.push([144+dot(p,x)*f,144+dot(p,y)*f]);}
 for(let k=0;k<points.length;k+=3){const [a,b,c]=points.slice(k,k+3),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-10)continue;
  const left=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),right=Math.min(size-1,Math.ceil(Math.max(a[0],b[0],c[0]))),top=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),bottom=Math.min(size-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){const u=((b[1]-c[1])*(px+.5-c[0])+(c[0]-b[0])*(py+.5-c[1]))/den,v=((c[1]-a[1])*(px+.5-c[0])+(a[0]-c[0])*(py+.5-c[1]))/den;if(u>=0&&v>=0&&u+v<=1)mask[py*size+px]=1;}
 }
 return {mask,size};
}
const meshes=[['near',build()],['far',distant()]];
for(const [lod,g] of meshes){
check(lod+': the pale plastron is the exposed underside, with the carapace above it',()=>{
 for(const x of [-.5,0,.3])for(const z of [-.2,0,.2]){
  const hits=verticalHits(g,x,z);assert(hits.length>=2,'closed body at '+[x,z]);
  assert.equal(hits[0].tag,3,'from below, belly must be visible at '+[x,z]+': '+JSON.stringify(hits[0]));
  assert.equal(hits.at(-1).tag,1,'from above, carapace must be visible at '+[x,z]);
 }
});
check(lod+': the head and neck form one connected skin instead of overlapping primitives',()=>{
 assert.equal(components(g,p=>p[11]===2&&p[0]>.5&&Math.abs(p[2])<.3),1);
});
check(lod+': all four flipper tips are closed skins rather than open rings',()=>{
 for(const side of [-1,1])for(const rear of [false,true]){
  const accept=p=>p[11]===2&&p[2]*side>.3&&(rear?p[0]<-.55:p[0]>-.55);
  let tip=-Infinity;for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+12);if(accept(p))tip=Math.max(tip,p[2]*side);}
  const holes=boundaryEdges(g,accept).filter(e=>Math.abs(e.a[2]*side-tip)<1e-7&&Math.abs(e.b[2]*side-tip)<1e-7);
  assert.equal(holes.length,0,(rear?'rear':'front')+' flipper on side '+side+' has an open tip');
 }
});
check(lod+': the complete open flipper roots are seated inside the shell, not exposed collars',()=>{
 let roots=0;
 for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+12),front=p[0]>-.55,root=front?.51:.48;
  if(p[11]!==2||Math.abs(Math.abs(p[2])-root)>1e-8)continue;
  const hits=verticalHits(g,p[0],p[2]).filter(h=>h.tag===1||h.tag===3);roots++;
  assert(hits.length>=2&&p[1]>hits[0].y&&p[1]<hits.at(-1).y,'flipper attachment is exposed at '+p.slice(0,3));
 }
 assert(roots>0,'actual limb attachments were inspected');
});
check(lod+': the exported surface has finite unit normals and no collapsed triangles',()=>{
 assert(g.v.every(Number.isFinite));
 for(let k=0;k<g.v.length;k+=12)assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-5,'unit vertex normal');
 for(let k=0;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),u=g.v.slice(k+12,k+15).map((v,i)=>v-a[i]),v=g.v.slice(k+24,k+27).map((v,i)=>v-a[i]);
  assert(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12,'nonzero triangle area at tag '+g.v[k+11]);
 }
});
check(lod+': shared cap vertices have one outward normal, without radial pinwheel highlights',()=>{
 const skin=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===2)skin.push(g.v.slice(k,k+12));
 for(const [axis,end,sign] of [[0,1.31,1],[0,.58,-1],[2,1.70,1],[2,-1.70,-1],[2,.86,1],[2,-.86,-1]]){
  const pole=skin.filter(p=>Math.abs(p[axis]-end)<1e-8&&(axis===0?Math.abs(p[2])<.3:axis===2&&Math.abs(end)<1?p[0]<-.55:true));
  assert(pole.length>1,'a closed cap is represented');
  assert(pole.every(p=>p[3+axis]*sign>.999999),'one outward normal at '+[axis,end]);
 }
});
check(lod+': carapace and plastron form one watertight shell with a smooth joined rim',()=>{
 const shell=p=>(p[11]===1||p[11]===3)&&p[0]<.9;
 assert.equal(components(g,shell),1);assert(edges(g,shell).every(e=>e.count===2),'every shell edge has exactly two faces');
 const positions=new Map();for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+12);if(!shell(p))continue;const key=p.slice(0,3).map(v=>Math.round(v*1e7)).join(',');if(!positions.has(key))positions.set(key,[]);positions.get(key).push(p);}
 let joins=0;for(const vertices of positions.values()){const upper=vertices.find(p=>p[11]===1),lower=vertices.find(p=>p[11]===3);if(!upper||!lower)continue;joins++;assert(upper.slice(3,6).reduce((dot,v,i)=>dot+v*lower[3+i],0)>.99999,'one smooth rim normal');}assert(joins>0);
});
}
check('the distant anatomy preserves the visible silhouette within one pixel at the LOD handover',()=>{
 const [hi,lo]=meshes.map(([,g])=>g);
 for(const d of [[0,.1,1],[1,.1,.15],[.7,.25,.7],[0,1,0],[0,-.7,1]]){const a=silhouette(hi,d),b=silhouette(lo,d);let bad=0,union=0,intersection=0;
  for(let i=0;i<a.mask.length;i++){union+=Boolean(a.mask[i]||b.mask[i]);intersection+=Boolean(a.mask[i]&&b.mask[i]);}
  for(const [from,to] of [[a,b],[b,a]])for(let i=0;i<from.mask.length;i++){if(!from.mask[i]||to.mask[i])continue;const x=i%a.size,y=Math.floor(i/a.size);let nearby=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<a.size&&y+dy>=0&&y+dy<a.size&&to.mask[(y+dy)*a.size+x+dx])nearby=true;if(!nearby)bad++;}
  assert.equal(bad,0,'view '+d+' moves the outline by more than one pixel; IoU '+intersection/union);
  console.log('  silhouette '+d+' IoU '+(intersection/union).toFixed(4));
 }
});
check('both generated detail levels stay within the existing geometry and indexed-memory budgets',()=>{
 const index=vm.runInContext('indexGeometry',c);
 for(const [i,[lod,g]] of meshes.entries()){const mesh=index(g.v),triangles=g.v.length/36,bytes=mesh.vertices.byteLength+mesh.indices.byteLength;assert(triangles<=[18026,1338][i]);assert(bytes<=[664584,48408][i]);console.log('  '+lod+': '+triangles+' triangles, '+bytes+' indexed bytes');}
});
console.log(checks+' turtle anatomy checks passed');
