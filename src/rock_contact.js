/* Immutable contact geometry is the actual rendered stone, with its full pose.
 * The catalogue is independent of GPU residency and quality. Mesh BVHs are built
 * once at load; queries visit bounded grid cells and intersecting BVH branches. */
const OceanRockContact=(()=>{
 const EPS=1e-5,CELL=16,FORMAT='return-blue/rock-contact/1';
 let meshes=[],instances=[],tiles=new Map(),large=[],legacy=new Set(),hasArch=false,current=null,worldMin=0,worldMax=0;
 let geometryCache=new WeakMap(),stats={builds:0,queries:0,candidates:0,nodes:0,triangles:0};
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>{const l=len(a);return l>1e-12?mul(a,1/l):[0,1,0];};
 const key=p=>p.map(v=>Math.round(v*1e6)).join(','),finite3=p=>p&&p.length===3&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Number.isFinite(p[2]);
 function compact(geometry){
  const indexed=geometry.indexed,source=indexed?indexed.vertices:geometry.v,index=indexed?indexed.indices:null;
  if(!source||source.length%12)throw Error('Invalid rock contact geometry');
  const positions=[],indices=[],seen=new Map(),remap=new Map();
  for(let i=0,n=index?index.length:source.length/12;i<n;i++){
   const sourceID=index?index[i]:i;let id=remap.get(sourceID);
   if(id===undefined){const p=[Math.fround(source[sourceID*12]),Math.fround(source[sourceID*12+1]),Math.fround(source[sourceID*12+2])],k=p.join(',');
    if(!p.every(Number.isFinite))throw Error('Nonfinite rock contact vertex');id=seen.get(k);if(id===undefined){id=positions.length/3;positions.push(...p);seen.set(k,id);}remap.set(sourceID,id);
   }indices.push(id);
  }
  return {positions,indices,closed:geometry.rockContact?.closed!==false,kind:geometry.rockContact?.kind||'rock'};
 }
 function vertex(m,id){const k=id*3;return [m.positions[k],m.positions[k+1],m.positions[k+2]];}
 function triangle(m,t){const k=t*3;return [vertex(m,m.indices[k]),vertex(m,m.indices[k+1]),vertex(m,m.indices[k+2])];}
 function makeMesh(data){
  if(!data||!Array.isArray(data.positions)||!Array.isArray(data.indices)||data.positions.length%3||data.positions.length>300000||data.indices.length%3||data.indices.length>300000||!data.positions.length||!data.indices.length||!data.positions.every(Number.isFinite)||data.indices.some(i=>!Number.isInteger(i)||i<0||i>=data.positions.length/3))throw Error('Invalid rock contact mesh');
  const m={positions:new Float32Array(data.positions),indices:new Uint32Array(data.indices),closed:data.closed!==false,kind:data.kind||'rock',nodes:[]},triangles=[];
  for(let t=0;t<m.indices.length/3;t++){
   const v=triangle(m,t),lo=[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),hi=[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k]));
   if(len(cross(sub(v[1],v[0]),sub(v[2],v[0])))>1e-12)triangles.push({t,lo,hi,c:lo.map((n,k)=>(n+hi[k])*.5)});
  }
  function build(list){const lo=[0,1,2].map(k=>Math.min(...list.map(x=>x.lo[k]))),hi=[0,1,2].map(k=>Math.max(...list.map(x=>x.hi[k]))),id=m.nodes.length,node={lo,hi};m.nodes.push(node);
   if(list.length<=8)node.triangles=list.map(x=>x.t);else{const span=hi.map((n,k)=>n-lo[k]),axis=span.indexOf(Math.max(...span));list.sort((a,b)=>a.c[axis]-b.c[axis]||a.t-b.t);const split=list.length>>1;node.left=build(list.slice(0,split));node.right=build(list.slice(split));}return id;}
  if(!triangles.length)throw Error('Empty rock contact surface');build(triangles);m.lo=m.nodes[0].lo;m.hi=m.nodes[0].hi;stats.builds++;return m;
 }
 function meshFor(geometry){let m=geometryCache.get(geometry);if(!m){m=makeMesh(compact(geometry));geometryCache.set(geometry,m);}return m;}
 function forward(p,i){const cp=i.cp,sp=i.sp,x=(cp*p[0]-sp*p[1])*i.s[0],y=(sp*p[0]+cp*p[1])*i.s[1],z=p[2]*i.s[2];return [i.p[0]+i.c*x+i.q*z,i.p[1]+y,i.p[2]-i.q*x+i.c*z];}
 function inverse(p,i){const v=sub(p,i.p),x=(i.c*v[0]-i.q*v[2])/i.s[0],y=v[1]/i.s[1],z=(i.q*v[0]+i.c*v[2])/i.s[2];return [i.cp*x+i.sp*y,-i.sp*x+i.cp*y,z];}
 function corners(lo,hi,fn){const p=[];for(let k=0;k<8;k++)p.push(fn([k&1?hi[0]:lo[0],k&2?hi[1]:lo[1],k&4?hi[2]:lo[2]]));return {lo:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi:[0,1,2].map(k=>Math.max(...p.map(v=>v[k])))};}
 function makeInstance(data,m){const p=data.p||[0,0,0],s=data.s||[1,1,1],yaw=data.yaw||0,pitch=data.pitch||0;
  if(!finite3(p)||!finite3(s)||s.some(v=>v<=0)||!Number.isFinite(yaw)||!Number.isFinite(pitch))throw Error('Invalid rock contact pose');
  const i={p:p.slice(),s:s.slice(),c:Math.cos(yaw),q:Math.sin(yaw),cp:Math.cos(pitch),sp:Math.sin(pitch),m,minScale:Math.min(...s)},bounds=corners(m.lo,m.hi,v=>forward(v,i));i.lo=bounds.lo;i.hi=bounds.hi;return i;
 }
 const intersects=(lo,hi,a,b)=>lo.every((v,k)=>v<=b[k]&&hi[k]>=a[k]);
 function walkBox(m,lo,hi,visit){const stack=[0];while(stack.length){const node=m.nodes[stack.pop()];stats.nodes++;if(!intersects(node.lo,node.hi,lo,hi))continue;if(node.triangles){for(const t of node.triangles){stats.triangles++;if(visit(t)===false)return;}}else stack.push(node.left,node.right);}}
 function rayBox(a,d,lo,hi,limit=Infinity){let near=0,far=limit;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-14){if(a[k]<lo[k]-EPS||a[k]>hi[k]+EPS)return false;continue;}let x=(lo[k]-a[k])/d[k],y=(hi[k]-a[k])/d[k];if(x>y)[x,y]=[y,x];near=Math.max(near,x);far=Math.min(far,y);if(far<near)return false;}return true;}
 function rayTriangle(a,d,v,minimum=EPS){const e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-12)return Infinity;const s=sub(a,v[0]),u=dot(s,h)/det;if(u< -1e-9||u>1+1e-9)return Infinity;const q=cross(s,e1),w=dot(d,q)/det;if(w< -1e-9||u+w>1+1e-9)return Infinity;const t=dot(e2,q)/det;return t>=minimum?t:Infinity;}
 function rayHits(m,a,d,limit=Infinity,minimum=EPS){const hits=[],stack=[0];while(stack.length){const n=m.nodes[stack.pop()];stats.nodes++;if(!rayBox(a,d,n.lo,n.hi,limit))continue;if(n.triangles){for(const t of n.triangles){stats.triangles++;const hit=rayTriangle(a,d,triangle(m,t),minimum);if(Number.isFinite(hit)&&hit<=limit)hits.push(hit);}}else stack.push(n.left,n.right);}hits.sort((a,b)=>a-b);return hits.filter((v,k)=>!k||Math.abs(v-hits[k-1])>1e-6);}
 function inside(i,p){if(!i.m.closed)return false;const local=inverse(p,i);if(!local.every((v,k)=>v>=i.m.lo[k]-EPS&&v<=i.m.hi[k]+EPS))return false;return rayHits(i.m,local,[.937,.221,.311]).length%2===1;}
 function closest(p,v){const [a,b,c]=v,ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
  const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return add(b,mul(sub(c,b),(d4-d3)/(d4-d3+d5-d6)));const den=1/(va+vb+vc);return add(a,add(mul(ab,vb*den),mul(ac,vc*den)));
 }
 function worldTriangle(i,t){return triangle(i.m,t).map(p=>forward(p,i));}
 function nearest(i,p,limit=Infinity){let best=limit*limit,result=null;const local=inverse(p,i),distance=n=>n.lo.reduce((sum,v,k)=>sum+Math.max(v-local[k],0,local[k]-n.hi[k])**2,0)*i.minScale*i.minScale,stack=[0];
  while(stack.length){const n=i.m.nodes[stack.pop()];stats.nodes++;if(distance(n)>best+EPS)continue;if(n.triangles){for(const t of n.triangles){stats.triangles++;const v=worldTriangle(i,t),q=closest(p,v),d=dot(sub(p,q),sub(p,q));if(d<best){best=d;result={point:q,distance:Math.sqrt(d),normal:unit(cross(sub(v[1],v[0]),sub(v[2],v[0])))};}}}else{const a=i.m.nodes[n.left],b=i.m.nodes[n.right];if(distance(a)<distance(b))stack.push(n.right,n.left);else stack.push(n.left,n.right);}}
  return result;
 }
 function candidates(a,b=a,r=0){stats.queries++;const lo=a.map((v,k)=>Math.min(v,b[k])-r-EPS),hi=a.map((v,k)=>Math.max(v,b[k])+r+EPS),from=lo.map(v=>Math.floor(v/CELL)),to=hi.map(v=>Math.floor(v/CELL)),count=to.reduce((n,v,k)=>n*(v-from[k]+1),1);let found;
  if(count>512)found=instances.map((_,i)=>i);else{const ids=new Set(large);for(let x=from[0];x<=to[0];x++)for(let y=from[1];y<=to[1];y++)for(let z=from[2];z<=to[2];z++)for(const id of tiles.get(x+','+y+','+z)||[])ids.add(id);found=Array.from(ids);}
  const selected=found.filter(id=>intersects(instances[id].lo,instances[id].hi,lo,hi));stats.candidates+=selected.length;return selected;
 }
 function overlaps(p,r=0){if(!finite3(p)||!Number.isFinite(r)||r<0)return true;for(const id of candidates(p,p,r)){const i=instances[id];if(inside(i,p))return true;if(r>0&&nearest(i,p,r-EPS))return true;}return false;}
 function inTriangle(p,v){const n=cross(sub(v[1],v[0]),sub(v[2],v[0]));return [0,1,2].every(k=>dot(cross(sub(v[(k+1)%3],v[k]),sub(p,v[k])),n)>=-1e-8);}
 function sphereTriangle(a,d,r,v,max){let hit=null;const offer=(t,normal,point)=>{if(t>=-1e-8&&t<=max&&dot(normal,d)<-1e-10){max=Math.max(0,t);hit={fraction:max,normal,point};}};
  const n=unit(cross(sub(v[1],v[0]),sub(v[2],v[0]))),distance=dot(n,sub(a,v[0])),speed=dot(n,d);
  if(Math.abs(speed)>1e-12)for(const side of [-1,1]){const t=(side*r-distance)/speed;if(t< -1e-8||t>max)continue;const p=add(a,mul(d,t)),q=sub(p,mul(n,side*r));if(inTriangle(q,v))offer(t,mul(n,side),q);}
  if(r<=0)return hit;
  for(let k=0;k<3;k++){
   const start=v[k],edge=sub(v[(k+1)%3],start),offset=sub(a,start),ee=dot(edge,edge),ed=dot(edge,d),eo=dot(edge,offset),dd=dot(d,d),od=dot(offset,d),oo=dot(offset,offset),A=ee*dd-ed*ed,B=ee*od-eo*ed,C=ee*oo-eo*eo-r*r*ee,disc=B*B-A*C;
   if(A>1e-16&&disc>=0){const t=(-B-Math.sqrt(disc))/A,y=eo+t*ed;if(t>=0&&t<=max&&y>=0&&y<=ee){const p=add(a,mul(d,t)),q=add(start,mul(edge,y/ee));offer(t,unit(sub(p,q)),q);}}
   const discriminant=od*od-dd*(oo-r*r);if(dd>1e-16&&discriminant>=0){const t=(-od-Math.sqrt(discriminant))/dd;if(t>=0&&t<=max)offer(t,unit(sub(add(a,mul(d,t)),start)),start);}
  }return hit;
 }
 function sweep(a,b,r=0){if(!finite3(a)||!finite3(b)||!Number.isFinite(r)||r<0)return {fraction:0,normal:[0,1,0],point:a.slice()};const delta=sub(b,a);let hit=null,max=1;
  for(const id of candidates(a,b,r)){const i=instances[id],isInside=inside(i,a),near=nearest(i,a,isInside?Infinity:r+EPS);
   if(isInside||near&&near.distance<r-EPS){const normal=isInside?unit(sub(near.point,a)):unit(sub(a,near.point));if(isInside||dot(normal,delta)<0||len(delta)<EPS){hit={fraction:0,normal,point:near.point};max=0;continue;}}
   if(len(delta)<EPS)continue;const bounds=corners(a.map((v,k)=>Math.min(v,b[k])-r),a.map((v,k)=>Math.max(v,b[k])+r),p=>inverse(p,i));
   walkBox(i.m,bounds.lo,bounds.hi,t=>{const contact=sphereTriangle(a,delta,r,worldTriangle(i,t),max);if(contact){hit=contact;max=contact.fraction;}});
  }return hit;
 }
 function segmentBlocked(a,b,r=0){return !!sweep(a,b,r);}
 function surface(i,x,z,ceiling=Infinity){const top=Math.min(i.hi[1]+1,ceiling),bottom=i.lo[1]-1;if(top<bottom||x<i.lo[0]-EPS||x>i.hi[0]+EPS||z<i.lo[2]-EPS||z>i.hi[2]+EPS)return -Infinity;
  const a=inverse([x,top,z],i),b=inverse([x,bottom,z],i),d=sub(b,a),hits=rayHits(i.m,a,d,1,0);return hits.length?top+(bottom-top)*hits[0]:-Infinity;
 }
 function topAt(x,z,ceiling=Infinity){if(!Number.isFinite(x)||!Number.isFinite(z)||Number.isNaN(ceiling))return -Infinity;let y=-Infinity;for(const id of candidates([x,worldMin-1,z],[x,Math.min(worldMax+1,ceiling),z]))y=Math.max(y,surface(instances[id],x,z,ceiling));return y;}
 function heightOn(geometry,pose,x,z,ceiling=Infinity){return surface(makeInstance(pose,meshFor(geometry)),x,z,ceiling);}
 function surfaceAt(geometry,x,z,ceiling=Infinity){return heightOn(geometry,{p:[0,0,0],s:[1,1,1]},x,z,ceiling);}
 function resolve(p,r=.4,from=null,report=null){if(report){report.normal=null;report.valid=false;}if(!finite3(p)||!Number.isFinite(r)||r<0)return p;let q=p.slice(),lastNormal=null;
  if(from&&finite3(from)&&len(sub(p,from))>EPS&&!overlaps(from,r)){
   q=from.slice();let remaining=sub(p,from);
   for(let pass=0;pass<4&&len(remaining)>EPS;pass++){const desired=add(q,remaining),hit=sweep(q,desired,r);if(!hit){q=desired;break;}
    lastNormal=hit.normal;const safe=Math.max(0,hit.fraction-EPS/Math.max(EPS,len(remaining)));q=add(q,mul(remaining,safe));remaining=mul(remaining,1-safe);const into=dot(remaining,hit.normal);if(into<0)remaining=sub(remaining,mul(hit.normal,into));q=add(q,mul(hit.normal,EPS*2));
   }
  }
  for(let pass=0;pass<6;pass++){let changed=false;for(const id of candidates(q,q,r)){const i=instances[id],isInside=inside(i,q),near=nearest(i,q,isInside?Infinity:r);if(!near)continue;if(isInside||near.distance<r-EPS){const normal=isInside?unit(sub(near.point,q)):unit(sub(q,near.point));q=add(near.point,mul(normal,r+EPS*2));lastNormal=normal;changed=true;}}if(!changed)break;}
  let valid=!overlaps(q,r);if(!valid){if(from&&finite3(from)&&!overlaps(from,r)){q=from.slice();valid=true;}else{const y=topAt(q[0],q[2]);if(Number.isFinite(y)){const above=[q[0],y+r+EPS*4,q[2]];if(!overlaps(above,r)){q=above;valid=true;lastNormal=[0,1,0];}}}}
  // Reuse the final clearance proof; callers may reuse this empty sphere while
  // a smaller body stays within its reserve. Reporting performs no new query.
  if(report){report.valid=valid;report.normal=lastNormal?lastNormal.slice():null;}
  for(let k=0;k<3;k++)p[k]=q[k];return p;
 }
 function reset(){meshes=[];instances=[];tiles=new Map();large=[];legacy=new Set();hasArch=false;current=null;worldMin=0;worldMax=0;}
 function install(catalogue){
  if(!catalogue||catalogue.format!==FORMAT||!Array.isArray(catalogue.meshes)||catalogue.meshes.length>64||!Array.isArray(catalogue.instances)||catalogue.instances.length>20000)throw Error('Invalid rock contact catalogue');
  // Validate/build off to the side: a bad streaming index cannot leave half a
  // collision world installed before the complete-scene fallback takes over.
  const nextMeshes=catalogue.meshes.map(makeMesh),nextInstances=catalogue.instances.map(p=>{if(!nextMeshes[p.mesh])throw Error('Invalid rock contact reference');return makeInstance(p,nextMeshes[p.mesh]);}),nextTiles=new Map(),nextLarge=[];
  for(let id=0;id<nextInstances.length;id++){const i=nextInstances[id],a=i.lo.map(v=>Math.floor(v/CELL)),b=i.hi.map(v=>Math.floor(v/CELL));if(b.reduce((n,v,k)=>n*(v-a[k]+1),1)>4096){nextLarge.push(id);continue;}
   for(let x=a[0];x<=b[0];x++)for(let y=a[1];y<=b[1];y++)for(let z=a[2];z<=b[2];z++){const k=x+','+y+','+z;let list=nextTiles.get(k);if(!list)nextTiles.set(k,list=[]);list.push(id);}}
  meshes=nextMeshes;instances=nextInstances;tiles=nextTiles;large=nextLarge;current=catalogue;legacy=new Set(catalogue.instances.filter(p=>nextMeshes[p.mesh].kind!=='arch').map(p=>key(p.p)));hasArch=nextMeshes.some(m=>m.kind==='arch');worldMin=instances.length?Math.min(...instances.map(i=>i.lo[1])):0;worldMax=instances.length?Math.max(...instances.map(i=>i.hi[1])):0;return true;
 }
 function createCatalogue(entries){const catalogue={format:FORMAT,meshes:[],instances:[]},byGeometry=new Map(),seenInstances=new Set();
  for(const entry of entries){const b=entry.batch||entry,g=entry.geometry;if(!g?.rockContact||b.dynamic||b.kind&&b.kind!==0||b.minDistance>0)continue;
   let mesh=byGeometry.get(g.rockContact.key||g);if(mesh===undefined){mesh=catalogue.meshes.length;catalogue.meshes.push(compact(g));byGeometry.set(g.rockContact.key||g,mesh);}
   for(const p of entry.instances||b.instances){if(seenInstances.has(p))continue;seenInstances.add(p);catalogue.instances.push({mesh,p:(p.p||[0,0,0]).slice(),s:(p.s||[1,1,1]).slice(),yaw:p.yaw||0,...(p.pitch?{pitch:p.pitch}:{})});}
  }return catalogue;
 }
 function captureBuild(build,renderer){const original=renderer.batch,entries=[];renderer.batch=function(geometry,items,kind=0,dynamic=false){const batch=original.call(this,geometry,items,kind,dynamic);if(geometry.rockContact)entries.push({geometry,instances:items,batch});return batch;};let result;try{result=build(renderer);}finally{renderer.batch=original;}install(createCatalogue(entries));return result;}
 return {sweep,resolve,segmentBlocked,overlaps,topAt,heightOn,surfaceAt,install,reset,createCatalogue,captureBuild,catalogue:()=>current,replacesLegacy:ob=>!!current&&(legacy.has(key(ob.p))||hasArch&&ob.rockContactLegacy===true),status:()=>({loaded:!!current,meshes:meshes.length,instances:instances.length,cells:tiles.size,large:large.length,...stats}),resetQueryStats:()=>{stats.queries=stats.candidates=stats.nodes=stats.triangles=0;}};
})();
// Installed after every world extension; capture works with the offline recorder
// and the normal renderer without retaining renderer/GPU-owned mesh buffers.
if(typeof buildReef==='function'){const buildBeforeRockContact=buildReef;buildReef=function(renderer){return OceanRockContact.captureBuild(buildBeforeRockContact,renderer);};}
