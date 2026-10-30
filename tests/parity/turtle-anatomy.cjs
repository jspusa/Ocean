/* Actual generated turtle geometry: observable exterior anatomy, no GPU. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),crypto=require('node:crypto');
const BASE='dbd54ec34adcdad177014d01d3536197ea21fb59',option=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d,ref=option('ref',null),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=(name,rev=ref)=>rev?cp.execFileSync('git',['show',rev+':src/'+name+'.js'],{encoding:'utf8',maxBuffer:8e6}):fs.readFileSync('src/'+name+'.js','utf8');
const c=vm.createContext({console});
for(const name of ['engine','world','next_reef'])vm.runInContext(read(name),c,{filename:name});
const baseline=vm.createContext({console});for(const name of ['engine','world'])vm.runInContext(read(name,BASE),baseline,{filename:name});
const build=vm.runInContext('turtleGeometry',c),distant=vm.runInContext('distantTurtle',c),prior=vm.runInContext('[turtleGeometry(),turtleGeometry(true)]',baseline),report={baseline:BASE,source:ref||'working tree',sourceSHA256:{world:sha(read('world')),engine:sha(read('engine'))},checks:[]};let checks=0;
function check(name,run){try{const detail=run();checks++;report.checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+' — '+e.message);}}
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
// Independent actual-triangle oracle promoted from the reviewed QA helper.
// It certifies a positive-radius ball inside both closed surfaces; preserving
// the old eye transform alone did not certify the old low-LOD attachment.
const contactOracle=(()=>{
const sub=(a,b)=>a.map((x,k)=>x-b[k]),add=(a,b)=>a.map((x,k)=>x+b[k]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),key=p=>p.map(x=>Math.round(x*1e7)).join(','),EPS=1e-9;
function triangles(g){const v=g.indexed?.vertices||g.vertices||g.v,ix=g.indexed?.indices||g.indices,out=[];for(let k=0,n=ix?ix.length:v.length/12;k<n;k+=3){const ids=[0,1,2].map(j=>ix?ix[k+j]:k+j),p=ids.map(i=>Array.from(v.slice(i*12,i*12+3))),tag=ids.map(i=>v[i*12+11]);out.push({p,tag,triangle:k/3});}return out;}
function components(ts){const parents=ts.map((_,i)=>i),find=i=>parents[i]===i?i:parents[i]=find(parents[i]),edge=new Map();for(let i=0;i<ts.length;i++)for(let j=0;j<3;j++){const a=key(ts[i].p[j]),b=key(ts[i].p[(j+1)%3]),k=[a,b].sort().join('|');if(edge.has(k))parents[find(i)]=find(edge.get(k));else edge.set(k,i);}const groups=new Map();for(let i=0;i<ts.length;i++){const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(ts[i]);}return [...groups.values()].map(prepare);}
function prepare(ts){const points=[...new Map(ts.flatMap(t=>t.p).map(p=>[key(p),p])).values()],lo=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...points.map(p=>p[k]))),edge=new Map();for(const t of ts)for(let j=0;j<3;j++){const a=key(t.p[j]),b=key(t.p[(j+1)%3]),k=[a,b].sort().join('|');if(!edge.has(k))edge.set(k,[]);edge.get(k).push(a<b?1:-1);}return {ts,points,lo,hi,center:lo.map((v,k)=>(v+hi[k])*.5),closed:[...edge.values()].every(e=>e.length===2),oriented:[...edge.values()].every(e=>e.length===2&&e[0]+e[1]===0)};}
function closest(p,[a,b,c]){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return add(b,mul(sub(c,b),(d4-d3)/(d4-d3+d5-d6)));const s=1/(va+vb+vc);return add(a,add(mul(ab,vb*s),mul(ac,vc*s)));}
function rayParity(mesh,o,d){if(o.some((x,k)=>x<mesh.lo[k]-EPS||x>mesh.hi[k]+EPS))return false;const hits=[];for(const {p:[a,b,c]}of mesh.ts){const e=sub(b,a),f=sub(c,a),h=cross(d,f),det=dot(e,h);if(Math.abs(det)<1e-14)continue;const s=sub(o,a),u=dot(s,h)/det;if(u<-1e-10||u>1+1e-10)continue;const q=cross(s,e),v=dot(d,q)/det;if(v<-1e-10||u+v>1+1e-10)continue;const t=dot(f,q)/det;if(t>EPS)hits.push(t);}hits.sort((a,b)=>a-b);return hits.filter((x,i)=>!i||Math.abs(x-hits[i-1])>1e-8).length%2===1;}
const directions=[[.937,.221,.311],[.173,.947,.269],[.327,.119,.937]];
function inside(m,p){return directions.every(d=>rayParity(m,p,d));}
function distance(m,p){return Math.min(...m.ts.map(t=>len(sub(p,closest(p,t.p)))));}
// A witness is accepted only after both closed actual triangle surfaces contain
// a point at a positive distance from every triangle; its ball is wholly inside.
function segmentTriangle(o,end,[a,b,c]){const d=sub(end,o),e=sub(b,a),f=sub(c,a),h=cross(d,f),det=dot(e,h);if(Math.abs(det)<1e-14)return null;const s=sub(o,a),u=dot(s,h)/det,q=cross(s,e),v=dot(d,q)/det,t=dot(f,q)/det;return u>=-EPS&&v>=-EPS&&u+v<=1+EPS&&t>=-EPS&&t<=1+EPS?add(o,mul(d,t)):null;}
function segmentGap(p1,q1,p2,q2){const d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2,d2),f=dot(d2,r),clamp=x=>Math.max(0,Math.min(1,x));let s=0,t=0;if(a<=1e-25&&e<=1e-25)return len(r);if(a<=1e-25)t=clamp(f/e);else{const c=dot(d1,r);if(e<=1e-25)s=clamp(-c/a);else{const b=dot(d1,d2),denom=a*e-b*b;if(denom>1e-25)s=clamp((b*f-c*e)/denom);t=(b*s+f)/e;if(t<0){t=0;s=clamp(-c/a);}else if(t>1){t=1;s=clamp((b-c)/a);}}}return len(sub(add(p1,mul(d1,s)),add(p2,mul(d2,t))));}
function surfaceRelation(a,b){let gap=Infinity,pair=null;const hits=[];for(const ta of a.ts)for(const tb of b.ts){const A=ta.p,B=tb.p;let bound=0;for(let k=0;k<3;k++){const alo=Math.min(...A.map(p=>p[k])),ahi=Math.max(...A.map(p=>p[k])),blo=Math.min(...B.map(p=>p[k])),bhi=Math.max(...B.map(p=>p[k]));bound+=Math.max(0,alo-bhi,blo-ahi)**2;}if(bound>gap*gap)continue;let d=Infinity;for(let j=0;j<3;j++){for(const [v,w,T]of [[A[j],A[(j+1)%3],B],[B[j],B[(j+1)%3],A]]){const hit=segmentTriangle(v,w,T);if(hit){hits.push({point:hit,ta,tb});d=0;}}d=Math.min(d,len(sub(A[j],closest(A[j],B))),len(sub(B[j],closest(B[j],A))));for(let k=0;k<3;k++)d=Math.min(d,segmentGap(A[j],A[(j+1)%3],B[k],B[(k+1)%3]));}if(d<gap){gap=d;pair=[ta.triangle,tb.triangle];}}return {gap,pair,hits};}
function overlapWitness(a,b){if(!a.closed||!b.closed)return {status:'unresolved-open-surface'};if(a.lo.some((v,k)=>v>=b.hi[k]||a.hi[k]<=b.lo[k]))return {status:'no-overlap',proof:'separated actual AABBs'};const small=a.points.length<b.points.length?a:b,other=small===a?b:a,candidates=[small.center,other.center,small.center.map((x,k)=>(x+other.center[k])*.5)];for(const p of small.points)if(rayParity(other,p,directions[0]))for(const amount of [.001,.01,.05,.2,.5])candidates.push(p.map((v,k)=>v+(small.center[k]-v)*amount));const certify=p=>{if(!inside(a,p)||!inside(b,p))return null;const da=distance(a,p),db=distance(b,p),r=Math.min(da,db)*.5;return r>EPS?{status:'positive-volume-overlap',point:p,clearanceA:da,clearanceB:db,interiorBallRadius:r,lowerVolume:4*Math.PI*r*r*r/3}:null;};for(const p of candidates){const answer=certify(p);if(answer)return answer;}
 const relation=surfaceRelation(a,b);for(const {point,ta,tb}of relation.hits){const na=cross(sub(ta.p[1],ta.p[0]),sub(ta.p[2],ta.p[0])),nb=cross(sub(tb.p[1],tb.p[0]),sub(tb.p[2],tb.p[0]));for(const sa of [-1,1])for(const sb of [-1,1]){const n=add(mul(na,sa/(len(na)||1)),mul(nb,sb/(len(nb)||1)));for(const step of [1e-6,1e-5,1e-4,.001]){const answer=certify(add(point,mul(n,step/(len(n)||1))));if(answer)return {...answer,fromTriangleIntersection:[ta.triangle,tb.triangle]};}}}
 if(relation.gap>1e-7&&!a.points.some(p=>inside(b,p))&&!b.points.some(p=>inside(a,p)))return {status:'no-overlap',proof:'All actual triangle pairs separated; neither closed connected component contained by the other.',minimumSurfaceGap:relation.gap,closestTrianglePair:relation.pair,trianglePairCount:a.ts.length*b.ts.length};
 return {status:'unresolved-no-witness',candidateCount:candidates.length,surfaceGap:relation.gap,intersectionCount:relation.hits.length};}
function translated(mesh,shift){return prepare(mesh.ts.map(t=>({...t,p:t.p.map(p=>add(p,shift))})));}
function analyzeTurtleContact(g,low=false){const ts=triangles(g),headParts=components(ts.filter(t=>t.tag.every(x=>x===2||x===3)&&t.p.every(p=>p[0]>.5&&Math.abs(p[2])<.3))),head=headParts.find(p=>p.hi[0]>1.309&&p.lo[0]<.59);if(!head)throw Error('Actual continuous head root/tip component absent');const adornments=components(ts.filter(t=>t.tag.every(x=>x===4))),rows=[];
 for(const side of [-1,1]){const specs=low?[['eye',[1.143,.041,side*.147],[.022,.024,.012]]]:[['lid',[1.14,.039,side*.137],[.022,.024,.012]],['eye',[1.143,.041,side*.147],[.014,.017,.005]],['highlight',[1.151,.047,side*.152],[.004,.004,.003]],['nostril',[1.255,.007,side*.043],[.007,.005,.005]]],parts={head};for(const [name,p,s]of specs){const matches=adornments.filter(m=>Math.abs(m.lo[0]-(p[0]-s[0]))<2e-6&&Math.abs(m.hi[0]-(p[0]+s[0]))<2e-6&&m.lo.every((v,k)=>v>=p[k]-s[k]-2e-6)&&m.hi.every((v,k)=>v<=p[k]+s[k]+2e-6));if(matches.length!==1)throw Error(name+' side '+side+' actual component count '+matches.length);parts[name]=matches[0];}
 const graph=low?[['head','eye']]:[['head','lid'],['lid','eye'],['eye','highlight'],['head','nostril']];for(const [a,b]of graph)rows.push({side,from:a,to:b,triangles:[parts[a].ts.length,parts[b].ts.length],...overlapWitness(parts[a],parts[b])});
 if(!low){const n=parts.nostril,relation=surfaceRelation(head,n),insideCount=n.points.filter(p=>inside(head,p)).length;rows.push({side,part:'nostril',centerInsideHead:inside(head,n.center),actualVertices:n.points.length,verticesInsideHead:insideCount,centerDistanceToHead:distance(head,n.center),minimumSurfaceGap:relation.gap,fullyBuriedClosedComponent:relation.gap>1e-7&&insideCount===n.points.length,note:'Every actual triangle pair is separated and the closed nostril component is inside head; attachment does not imply visible nostrils.'});}
 rows.push({side,negativeControl:'translate same actual eye 1 model unit outward',edge:(low?'head':'lid')+' to eye',...overlapWitness(low?head:parts.lid,translated(parts.eye,[0,0,side]))});
 }
 return {low,head:{triangles:head.ts.length,closed:head.closed,oriented:head.oriented,bounds:[head.lo,head.hi]},extraHeadSkinComponents:headParts.filter(m=>m!==head&&m.hi[0]>.95).map(m=>({triangles:m.ts.length,closed:m.closed,bounds:[m.lo,m.hi]})),rows};}
return {analyzeTurtleContact};
})();
const meshes=[['near',build()],['far',distant()]];
check('the near mouth crease is an actual recessed part of the head cross section',()=>{
 const mesh=vm.runInContext('indexGeometry',c)(meshes[0][1].v),rings=new Map(),witnesses=[];
 for(let k=0;k<mesh.vertices.length;k+=12){const p=Array.from(mesh.vertices.slice(k,k+12));if(![2,3].includes(p[11])||p[0]<1.22||p[0]>1.27)continue;const x=p[0],key=p.slice(0,3).join(',');if(!rings.has(x))rings.set(x,new Map());rings.get(x).set(key,p.slice(0,3));}
 for(const [x,ring] of rings){const ps=[...ring.values()],cy=ps.reduce((s,p)=>s+p[1],0)/ps.length;ps.sort((a,b)=>Math.atan2(a[2],a[1]-cy)-Math.atan2(b[2],b[1]-cy));for(let i=0;i<ps.length;i++){const a=ps[(i+ps.length-1)%ps.length],b=ps[i],d=ps[(i+1)%ps.length],turn=(b[1]-a[1])*(d[2]-b[2])-(b[2]-a[2])*(d[1]-b[1]);if(turn< -1e-9&&b[1]>-.08&&b[1]<-.01&&Math.abs(b[2])>.06)witnesses.push({x,point:b,signedTurn:turn});}}
 for(const side of [-1,1])assert(witnesses.some(w=>w.point[2]*side>0),'no actual inward oral corner on side '+side);return {witnesses,note:'Near-LOD geometric crease only; low LOD samples the same shape without claiming this subpixel detail is resolved.'};
});
for(const [lod,g] of meshes){
check(lod+': the pale plastron is the exposed underside, with the carapace above it',()=>{
 for(const x of [-.5,0,.3])for(const z of [-.2,0,.2]){
  const hits=verticalHits(g,x,z);assert(hits.length>=2,'closed body at '+[x,z]);
  assert.equal(hits[0].tag,3,'from below, belly must be visible at '+[x,z]+': '+JSON.stringify(hits[0]));
  assert.equal(hits.at(-1).tag,1,'from above, carapace must be visible at '+[x,z]);
 }
});
check(lod+': head neck and beak are one closed skin without a separate muzzle primitive',()=>{
 const head=p=>(p[11]===2&&p[0]>.5&&Math.abs(p[2])<.3)||(p[11]===3&&p[0]>.95);
 assert.equal(components(g,head),1,'a second head/beak component is a separate overlapping primitive');
 assert(edges(g,head).every(e=>e.count===2),'complete head/beak skin must be closed');
});
check(lod+': the actual eye attachment graph intersects the head with positive volume',()=>{
 const result=contactOracle.analyzeTurtleContact(vm.runInContext('indexGeometry',c)(g.v),lod==='far');
 assert(result.head.closed&&result.head.oriented,'actual indexed head must be one oriented closed skin');
 assert.equal(result.extraHeadSkinComponents.length,0,'extra head/beak skin components');
 for(const edge of result.rows){if(edge.to)assert.equal(edge.status,'positive-volume-overlap',JSON.stringify(edge));else if(edge.negativeControl)assert.equal(edge.status,'no-overlap','detached actual eye must fail contact');}
 return result;
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
check(lod+': caps share a single normal and every actual triangle corner faces outward',()=>{
 const skin=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===2)skin.push(g.v.slice(k,k+12));
 for(const [axis,end,sign] of [[0,1.31,1],[0,.58,-1],[2,1.70,1],[2,-1.70,-1],[2,.86,1],[2,-.86,-1]]){
  const all=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===2||g.v[k+11]===3)all.push(g.v.slice(k,k+12));
  const pole=all.filter(p=>Math.abs(p[axis]-end)<1e-8&&(axis===0?Math.abs(p[2])<.3:axis===2&&Math.abs(end)<1?p[0]<-.55:true));
  assert(pole.length>1,'a closed cap is represented');
  assert(pole.every(p=>p.slice(3,6).every((v,i)=>Math.abs(v-pole[0][3+i])<1e-8)),'cap copies disagree at '+[axis,end]);
 }
 let minimum=1,negative=0,witness=null;
 const mesh=vm.runInContext('indexGeometry',c)(g.v);
 for(let k=0;k<mesh.indices.length;k+=3){const ps=[0,1,2].map(i=>Array.from(mesh.vertices.slice(mesh.indices[k+i]*12,mesh.indices[k+i]*12+6))),a=ps[0],u=ps[1].slice(0,3).map((v,i)=>v-a[i]),v=ps[2].slice(0,3).map((v,i)=>v-a[i]),face=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...face);
  for(let i=0;i<3;i++){const dot=face.reduce((s,n,j)=>s+n*ps[i][3+j],0)/len;if(dot<minimum){minimum=dot;witness={triangle:k/3,corner:i,p:ps[i].slice(0,3),dot};}if(dot< -1e-6)negative++;}
 }
 assert.equal(negative,0,JSON.stringify({negative,minimum,witness}));return {minimum,negative};
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
 const rows=[];for(const [i,[lod,g]] of meshes.entries()){const mesh=index(g.v),triangles=g.v.length/36,bytes=mesh.vertices.byteLength+mesh.indices.byteLength;assert(triangles<=[14170,1122][i]);assert(bytes<=[529512,43656][i]);assert.equal(mesh.radius,1.719214937115194,'do not shrink the existing contact/cull radius');rows.push({lod,triangles,bytes,radius:mesh.radius});console.log('  '+lod+': '+triangles+' triangles, '+bytes+' indexed bytes');}return rows;
});
check('actual shell attributes, rear-head positions, four limbs and eye/nose geometry match fixed v44',()=>{
 const records=(g,accept,attributes)=>{const rows=[];for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+12);if(accept(p))rows.push(attributes.map(i=>p[i]));}return sha(JSON.stringify(rows));};
 const shell=p=>(p[11]===1||p[11]===3)&&p[0]<.9,neck=p=>p[11]===2&&p[0]>.5&&p[0]<=.95&&Math.abs(p[2])<.3,limb=p=>p[11]===2&&Math.abs(p[2])>.3;
 for(let i=0;i<2;i++){const g=meshes[i][1];assert.equal(records(g,shell,Array.from({length:12},(_,j)=>j)),records(prior[i],shell,Array.from({length:12},(_,j)=>j)),'shell vertex attributes/order changed');assert.equal(records(g,neck,[0,1,2]),records(prior[i],neck,[0,1,2]),'rear-head positions changed');assert.equal(records(g,limb,[0,1,2,6,7,8,9,10,11]),records(prior[i],limb,[0,1,2,6,7,8,9,10,11]),'limb shape/UV/tag changed');assert.equal(records(g,p=>p[11]===4&&p[1]>0,Array.from({length:12},(_,j)=>j)),records(prior[i],p=>p[11]===4&&p[1]>0,Array.from({length:12},(_,j)=>j)),'eye/nose source geometry changed');}
});
check('the complete kind-2 animation stays inside the unchanged conservative contact envelope for every phase',()=>{
 const radius=1.719214937115194,stroke=Math.hypot(.37,.07),rows=[];
 for(const [lod,g] of meshes){let rest=0,bound=0;for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+3),tag=g.v[k+11],u=tag>1.5&&tag<2.5?Math.max(0,Math.min(1,(Math.abs(p[2])-.51)/.94)):0,wing=u*u*(3-2*u),r=Math.hypot(...p);rest=Math.max(rest,r);bound=Math.max(bound,r+wing*stroke);if(p[0]>.5&&Math.abs(p[2])<.3)assert.equal(wing,0,'new head/beak must remain rigid in the existing rig');}assert.equal(rest,radius);assert(bound<=radius+stroke+1e-12);rows.push({lod,restRadius:rest,allPhaseTriangleInequalityBound:bound,unchangedContactLocalRadius:radius+stroke});}
 return rows;
});
check('the change is bounded to turtleGeometry and does not consume the population RNG',()=>{
 const omit=s=>s.slice(0,s.indexOf('function turtleGeometry('))+s.slice(s.indexOf('// A closed, cambered eagle-ray body:'));assert.equal(omit(read('world')),omit(read('world',BASE)),'world population or another model changed');
 const old=vm.runInContext('seed',c);build();build(true);assert.equal(vm.runInContext('seed',c),old);assert.equal(vm.runInContext('VS',c),vm.runInContext('VS',baseline),'actual animation/contact shader changed');
});
report.summary={passed:checks,failed:report.checks.filter(c=>!c.passed).length};report.status=report.summary.failed?'failed-turtle-anatomy-cpu':'passed-turtle-anatomy-cpu';
const out=option('out','qa/parity/v01845-turtle/anatomy-current.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,...report.summary,out}));if(report.summary.failed)process.exitCode=1;
