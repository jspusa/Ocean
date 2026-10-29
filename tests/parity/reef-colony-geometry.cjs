/* Actual production foliose and sea-fan meshes, before and after compilation.
 * Topology, material contract, actual geometric branch contact and resource
 * bounds are witnesses; anatomical beauty remains a native visual review. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const reference=option('source-ref',null),sourceDirectory=option('source-dir',null),out=path.resolve(root,option('out','qa/parity/v01840-realism/reef-colony-geometry.json')),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={status:'running',reference:reference||sourceDirectory||'working-tree',method:'Calls the actual currently active tableCoral/distantColony/seaFanGeometry builders after production load order, then production indexGeometry. Position welding at 1e-6 excludes zero-area triangles from topology (they are independently rejected by the finite geometry check). Every plate must be one closed outward skin connecting the actual basal y=0 cross-section to all laminae. Every pair of foliose triangles with overlapping bounding boxes is tested for transverse or positive-area coplanar intersection, excluding only shared edges/vertices as contacts. Fan triangle components must reach the actual basal component via Euclidean triangle contact; no authored branch graph is trusted. The old shader-film tag contract is disallowed. Compiled mode requires exact indexed vertex and index bytes in the shipped archive. Per-model bounds are authoring limits for the controlled prototype, not scene-performance or art acceptance. Native visual review and measured whole-scene cost remain separate.',sources:{},weldTolerance:1e-6,intersectionTolerance:1e-7,meshes:[],checks:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
function check(name,run){try{const detail=run();report.checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(error){report.checks.push({name,passed:false,error:error.message});console.log('FAIL '+name+': '+error.message);}}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function topology(mesh,accept){
 const points=[],parents=[],idsByPosition=new Map(),triangles=[],edges=new Map(),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 const vertex=id=>Array.from(mesh.vertices.subarray(id*12,id*12+12));
 const weld=v=>{const key=v.slice(0,3).map(x=>Math.round(x/report.weldTolerance)).join(',');let id=idsByPosition.get(key);if(id===undefined){id=points.length;idsByPosition.set(key,id);points.push(v.slice(0,3));parents.push(id);}return id;};
 for(let k=0;k<mesh.indices.length;k+=3){const v=Array.from(mesh.indices.subarray(k,k+3),vertex);if(!v.every(accept)||Math.hypot(...cross(sub(v[1].slice(0,3),v[0].slice(0,3)),sub(v[2].slice(0,3),v[0].slice(0,3))))<1e-12)continue;const t=v.map(weld);t.sourceIndex=k/3;t.points=v.map(p=>p.slice(0,3));triangles.push(t);for(let j=1;j<3;j++)parents[find(t[j])]=find(t[0]);
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=Math.min(a,b)+':'+Math.max(a,b),edge=edges.get(key)||{count:0,balance:0};edge.count++;edge.balance+=a<b?1:-1;edges.set(key,edge);}
 }
 const components=new Map();for(const t of triangles){const key=find(t[0]),part=components.get(key)||{triangles:0,vertices:new Set(),faces:[],signedVolume:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};part.triangles++;part.faces.push({points:t.points,sourceIndex:t.sourceIndex,...bounds(t.points)});part.signedVolume+=dot(points[t[0]],cross(points[t[1]],points[t[2]]))/6;for(const id of t){part.vertices.add(id);for(let k=0;k<3;k++){part.min[k]=Math.min(part.min[k],points[id][k]);part.max[k]=Math.max(part.max[k],points[id][k]);}}components.set(key,part);}
 const parts=[...components.values()].sort((a,b)=>b.triangles-a.triangles),result={vertices:points.length,triangles:triangles.length,components:parts.map(({faces,vertices,...p})=>({...p,vertices:vertices.size})),boundaryEdges:[...edges.values()].filter(e=>e.count===1).length,nonmanifoldEdges:[...edges.values()].filter(e=>e.count!==2).length,orientationMismatches:[...edges.values()].filter(e=>e.count===2&&e.balance!==0).length,collapsedWeldedTriangles:triangles.filter(t=>new Set(t).size!==3).length};
 Object.defineProperty(result,'parts',{value:parts});return result;
}
const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,s)=>a.map(v=>v*s),lengthSquared=a=>dot(a,a),clamp01=x=>Math.min(1,Math.max(0,x));
function bounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
function boxDistanceSquared(a,b){let d=0;for(let k=0;k<3;k++){const gap=Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k]);d+=gap*gap;}return d;}
// Independent Euclidean geometry: no colony profile, branch control points or rig
// equation is used here. Every retained witness names actual indexed faces.
function pointTriangleDistanceSquared(p,[a,b,c]){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return lengthSquared(ap);
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return lengthSquared(bp);
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return lengthSquared(sub(p,add(a,mul(ab,d1/(d1-d3)))));
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return lengthSquared(cp);
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return lengthSquared(sub(p,add(a,mul(ac,d2/(d2-d6)))));
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return lengthSquared(sub(p,add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))))));
 const n=cross(ab,ac),n2=lengthSquared(n);return n2>1e-24?dot(ap,n)**2/n2:Math.min(lengthSquared(ap),lengthSquared(bp),lengthSquared(cp));
}
function segmentDistanceSquared(a,b,c,d){
 const u=sub(b,a),v=sub(d,c),w=sub(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);let s=0,t=0;
 if(aa<=1e-24&&cc<=1e-24)return lengthSquared(w);
 if(aa<=1e-24)t=clamp01(ee/cc);else if(cc<=1e-24)s=clamp01(-dd/aa);else{const den=aa*cc-bb*bb;s=den>1e-24?clamp01((bb*ee-cc*dd)/den):0;t=(bb*s+ee)/cc;if(t<0){t=0;s=clamp01(-dd/aa);}else if(t>1){t=1;s=clamp01((bb-dd)/aa);}}
 return lengthSquared(sub(add(a,mul(u,s)),add(c,mul(v,t))));
}
function segmentTriangleHit(a,b,[p,q,r]){
 const d=sub(b,a),e1=sub(q,p),e2=sub(r,p),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-15)return null;
 const inv=1/det,s=sub(a,p),u=dot(s,h)*inv;if(u< -1e-9||u>1+1e-9)return null;const v=dot(d,cross(s,e1))*inv;if(v< -1e-9||u+v>1+1e-9)return null;const t=dot(e2,cross(s,e1))*inv;return t>=-1e-9&&t<=1+1e-9?t:null;
}
function triangleDistanceSquared(a,b){
 for(let i=0;i<3;i++)if(segmentTriangleHit(a[i],a[(i+1)%3],b)!==null||segmentTriangleHit(b[i],b[(i+1)%3],a)!==null)return 0;
 let d=Infinity;for(const p of a)d=Math.min(d,pointTriangleDistanceSquared(p,b));for(const p of b)d=Math.min(d,pointTriangleDistanceSquared(p,a));for(let i=0;i<3;i++)for(let j=0;j<3;j++)d=Math.min(d,segmentDistanceSquared(a[i],a[(i+1)%3],b[j],b[(j+1)%3]));return d;
}
// Complete triangle-pair narrow phase, independent of the builder's leaf IDs,
// parametric equations and radial sampling. Coplanar positive-area overlap is
// a crossing too; ordinary shared triangle edges/vertices are valid contacts.
function triangleCrossing(a,b){
 const eps=report.intersectionTolerance,na=cross(sub(a[1],a[0]),sub(a[2],a[0])),nb=cross(sub(b[1],b[0]),sub(b[2],b[0])),la=Math.hypot(...na),lb=Math.hypot(...nb);if(la<1e-12||lb<1e-12)return null;
 const n=mul(na,1/la),other=mul(nb,1/lb),common=a.filter(p=>b.some(q=>lengthSquared(sub(p,q))<=eps*eps*4));
 if(Math.hypot(...cross(n,other))<1e-7&&b.every(p=>Math.abs(dot(sub(p,a[0]),n))<=eps)){
  const drop=[0,1,2].reduce((best,k)=>Math.abs(n[k])>Math.abs(n[best])?k:best,0),axes=[0,1,2].filter(k=>k!==drop),project=p=>axes.map(k=>p[k]),pa=a.map(project),pb=b.map(project),orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]),sign=Math.sign(orient(...pb));let polygon=pa;
  for(let k=0;k<3&&polygon.length;k++){const p=pb[k],q=pb[(k+1)%3],next=[];for(let j=0;j<polygon.length;j++){const u=polygon[j],v=polygon[(j+1)%polygon.length],du=orient(p,q,u)*sign,dv=orient(p,q,v)*sign;if(du>=0)next.push(u);if((du<0)!==(dv<0)){const t=du/(du-dv);next.push(u.map((x,i)=>x+(v[i]-x)*t));}}polygon=next;}
  let twiceArea=0;for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length];twiceArea+=p[0]*q[1]-p[1]*q[0];}const area=Math.abs(twiceArea)/2;
  if(area>eps*eps*16){const projected=axes.map((_,k)=>polygon.reduce((sum,p)=>sum+p[k],0)/polygon.length),point=[0,0,0];axes.forEach((k,i)=>point[k]=projected[i]);point[drop]=a[0][drop]-(n[axes[0]]*(point[axes[0]]-a[0][axes[0]])+n[axes[1]]*(point[axes[1]]-a[0][axes[1]]))/n[drop];return {kind:'coplanar-area',point,projectedArea:area};}return null;
 }
 if(common.length>=2)return null;
 for(let k=0;k<3;k++)for(const [p,q] of [[a,b],[b,a]]){const t=segmentTriangleHit(p[k],p[(k+1)%3],q);if(t===null)continue;const point=add(p[k],mul(sub(p[(k+1)%3],p[k]),clamp01(t)));if(!common.some(v=>lengthSquared(sub(point,v))<=eps*eps*16))return {kind:'transverse',point};}return null;
}
function actualFaces(mesh){return Array.from({length:mesh.indices.length/3},(_,i)=>{const points=Array.from(mesh.indices.subarray(i*3,i*3+3),id=>Array.from(mesh.vertices.subarray(id*12,id*12+3)));return {sourceIndex:i,points,...bounds(points)};});}
function selfIntersections(mesh){
 const faces=actualFaces(mesh).sort((a,b)=>a.min[0]-b.min[0]),work={xPairs:0,boxPairs:0,trianglePairs:0},examples=[],regionExamples={root:[],inner:[],outer:[]},byRegion={root:0,inner:0,outer:0},allPairs=process.argv.includes('--all-intersections')?[]:null;let crossings=0,coplanar=0,transverse=0;
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length&&faces[j].min[0]<=faces[i].max[0]+report.intersectionTolerance;j++){
  if(++work.xPairs>20000000)throw Error('Self-intersection oracle exceeded 20 million broad-phase pairs');const a=faces[i],b=faces[j];work.boxPairs++;if(boxDistanceSquared(a,b)>report.intersectionTolerance**2)continue;work.trianglePairs++;const hit=triangleCrossing(a.points,b.points);if(!hit)continue;crossings++;if(hit.kind==='coplanar-area')coplanar++;else transverse++;const evidence={triangleA:a.sourceIndex,triangleB:b.sourceIndex,...hit},radius=Math.hypot(hit.point[0],hit.point[2]),region=radius<.16?'root':radius<.30?'inner':'outer';byRegion[region]++;if(examples.length<12)examples.push(evidence);if(regionExamples[region].length<8)regionExamples[region].push({...evidence,pointsA:a.points,pointsB:b.points});if(allPairs)allPairs.push(evidence);
 }
 return {triangles:faces.length,crossingPairs:crossings,coplanarPairs:coplanar,transversePairs:transverse,tolerance:report.intersectionTolerance,work,examples,byRegion,regionExamples,...(allPairs?{allPairs}:{})};
}
function crossingControls(mesh){
 const f=actualFaces(mesh).find(f=>Math.hypot(...cross(sub(f.points[1],f.points[0]),sub(f.points[2],f.points[0])))>1e-4&&f.points.every(p=>Math.hypot(p[0],p[2])>.3));assert(f,'nondegenerate actual lamina face for controls');const p=f.points,center=mul(p.reduce(add,[0,0,0]),1/3),axis=mul(sub(p[1],p[0]),1/Math.hypot(...sub(p[1],p[0]))),rotated=p.map(v=>{const q=sub(v,center);return add(center,add(cross(axis,q),mul(axis,dot(axis,q))));});
 assert(triangleCrossing(p,rotated),'the transformed actual triangle must cross its source face');assert.equal(triangleCrossing(p,rotated.map(v=>add(v,[3,3,3]))),null,'translated actual triangle must not cross');return {sourceTriangle:f.sourceIndex,crossing:triangleCrossing(p,rotated),separatedOffset:[3,3,3]};
}
function surfaceContact(a,b,tolerance,work){
 const limit=tolerance*tolerance;if(boxDistanceSquared(a,b)>limit)return null;
 for(const fa of a.faces)for(const fb of b.faces){work.boxPairs++;if(boxDistanceSquared(fa,fb)>limit)continue;work.trianglePairs++;if(work.trianglePairs>2000000)throw Error('Fan-contact oracle exceeded its two-million candidate-pair bound');const d=triangleDistanceSquared(fa.points,fb.points);if(d<=limit)return {kind:d<1e-20?'triangle-intersection':'triangle-distance',distance:Math.sqrt(d),triangleA:fa.sourceIndex,triangleB:fb.sourceIndex};}
 return null;
}
function translatedParts(fins,offset){return {parts:fins.parts.map(p=>({...p,min:add(p.min,offset),max:add(p.max,offset),faces:p.faces.map(f=>({...f,min:add(f.min,offset),max:add(f.max,offset),points:f.points.map(v=>add(v,offset))}))}))};}
function geometryMetrics(mesh){
 let nonfinite=0,maxNormalError=0,collapsedTriangles=0,invertedNormalTriangles=0,minDoubleArea=Infinity;const tags=new Set(),bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(let i=0;i<mesh.vertices.length;i++){if(!Number.isFinite(mesh.vertices[i]))nonfinite++;}
 for(let i=0;i<mesh.vertices.length;i+=12){maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(...mesh.vertices.subarray(i+3,i+6))-1));tags.add(mesh.vertices[i+11]);for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],mesh.vertices[i+k]);bounds.max[k]=Math.max(bounds.max[k],mesh.vertices[i+k]);}}
 for(let i=0;i<mesh.indices.length;i+=3){const offsets=Array.from(mesh.indices.subarray(i,i+3),v=>v*12),p=offsets.map(k=>Array.from(mesh.vertices.subarray(k,k+3))),normal=cross(sub(p[1],p[0]),sub(p[2],p[0])),area=Math.hypot(...normal),averaged=[0,1,2].map(k=>offsets.reduce((s,o)=>s+mesh.vertices[o+3+k],0));minDoubleArea=Math.min(minDoubleArea,area);if(area<1e-12)collapsedTriangles++;if(dot(normal,averaged)<-area*1e-5)invertedNormalTriangles++;}
 return {vertices:mesh.vertices.length/12,triangles:mesh.indices.length/3,indexedBytes:mesh.vertices.byteLength+mesh.indices.byteLength,nonfinite,maxNormalError,collapsedTriangles,invertedNormalTriangles,minDoubleArea,bounds,tags:[...tags].sort((a,b)=>a-b)};
}

// Slice actual indexed triangles at the attachment plane, including triangles
// whose real edge lies on the plane. No root formula or generated sample list.
function basalSlice(mesh){
 const points=[],edges=new Map(),ids=new Map(),vertex=i=>Array.from(mesh.vertices.subarray(i*12,i*12+3)),id=p=>{const key=[p[0],p[2]].map(v=>Math.round(v*1e6)).join(',');if(!ids.has(key)){ids.set(key,points.length);points.push([p[0],p[2]]);}return ids.get(key);};
 for(let k=0;k<mesh.indices.length;k+=3){const t=Array.from(mesh.indices.subarray(k,k+3),vertex),hits=[];for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if(Math.abs(a[1])<1e-8)hits.push(a);if(a[1]*b[1]<0){const q=-a[1]/(b[1]-a[1]);hits.push(a.map((v,i)=>v+(b[i]-v)*q));}}const unique=[...new Set(hits.map(id))];if(unique.length===2){const e=unique.sort((a,b)=>a-b);edges.set(e.join(':'),e);}}
 const links=points.map(()=>[]);for(const [a,b] of edges.values()){links[a].push(b);links[b].push(a);}let area=0,count=0,closed=points.length>=3&&links.every(a=>a.length===2);if(closed){let previous=-1,current=0;do{const next=links[current].find(n=>n!==previous);area+=points[current][0]*points[next][1]-points[next][0]*points[current][1];previous=current;current=next;count++;}while(current!==0&&count<=points.length);closed=count===points.length&&current===0;}
 return {vertices:points.length,edges:edges.size,closed,area:Math.abs(area)*.5,maxRadius:Math.max(0,...points.map(p=>Math.hypot(...p))),key:points.map(p=>p.map(v=>Math.round(v*1e6)).join(',')).sort().join('|')};
}
// Independently intersect the real branch tubes with a horizontal plane and
// count disjoint X intervals. This witnesses a broad branched crown rather
// than demanding an arbitrary number of disconnected tube components.
function fanSections(mesh,y){
 const intervals=[];
 for(let k=0;k<mesh.indices.length;k+=3){const hits=[],t=Array.from(mesh.indices.subarray(k,k+3),id=>Array.from(mesh.vertices.subarray(id*12,id*12+3)));for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if((a[1]-y)*(b[1]-y)<0){const w=(y-a[1])/(b[1]-a[1]);hits.push(a[0]+(b[0]-a[0])*w);}}if(hits.length===2)intervals.push([Math.min(...hits),Math.max(...hits)]);}
 intervals.sort((a,b)=>a[0]-b[0]);const merged=[];for(const p of intervals){const last=merged[merged.length-1];if(last&&p[0]<=last[1]+1e-6)last[1]=Math.max(last[1],p[1]);else merged.push(p.slice());}return {y,intervals:merged,count:merged.length,width:merged.length?merged[merged.length-1][1]-merged[0][0]:0,covered:merged.reduce((s,p)=>s+p[1]-p[0],0)};
}
function laminarSections(mesh){
 const faces=[];for(let k=0;k<mesh.indices.length;k+=3){const t=Array.from(mesh.indices.subarray(k,k+3),id=>Array.from(mesh.vertices.subarray(id*12,id*12+3))),n=cross(sub(t[1],t[0]),sub(t[2],t[0]));if(Math.abs(n[1])>1e-10)faces.push({t,n,...bounds(t)});}
 const thickness=[],overlap=[],crossed=[];let covered=0;
 for(let ix=-26;ix<=26;ix++)for(let iz=-26;iz<=26;iz++){
  const x=ix*.04+.007,z=iz*.04+.011;if(Math.hypot(x,z)<.30)continue;const hits=[];
  for(const f of faces){if(x<f.min[0]||x>f.max[0]||z<f.min[2]||z>f.max[2])continue;const [a,b,c]=f.t,det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]),u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;if(u<-1e-8||v<-1e-8||u+v>1+1e-8)continue;hits.push({y:u*a[1]+v*b[1]+(1-u-v)*c[1],up:f.n[1]>0});}
  hits.sort((a,b)=>a.y-b.y);const unique=hits.filter((h,i)=>!i||Math.abs(h.y-hits[i-1].y)>1e-6);if(!unique.length)continue;covered++;let levels=0;
  if(unique.length%2||unique.some((h,i)=>h.up!==(i%2===1))){crossed.push({x,z,hits:unique});continue;}
  for(let i=0;i<unique.length;i+=2){thickness.push(unique[i+1].y-unique[i].y);levels++;}if(levels>=2)overlap.push({x,z,levels,heights:unique.map(h=>h.y)});
 }
 thickness.sort((a,b)=>a-b);return {sampleStep:.04,covered,overlappingRays:overlap.length,maximumLayers:Math.max(0,...overlap.map(o=>o.levels)),medianVerticalThickness:thickness[Math.floor(thickness.length*.5)],p90VerticalThickness:thickness[Math.floor(thickness.length*.9)],crossingRays:crossed.length,crossedExamples:crossed.slice(0,5),overlapExamples:overlap.slice(0,5)};
}
function fanContact(parts){
 const work={boxPairs:0,trianglePairs:0,rayTriangleTests:0},roots=parts.map((p,i)=>p.min[1]<-.02&&p.max[1]>.06?i:-1).filter(i=>i>=0),anchored=new Set(roots),edges=[];let pending=true;
 while(pending){pending=false;for(let i=0;i<parts.length;i++)if(!anchored.has(i)){for(const j of anchored){const contact=surfaceContact(parts[i],parts[j],.002,work);if(contact){anchored.add(i);edges.push({from:i,to:j,...contact});pending=true;break;}}}}
 return {components:parts.length,roots,anchored:[...anchored],unanchored:parts.map((p,i)=>i).filter(i=>!anchored.has(i)),edges,work};
}
try{
 const context=vm.createContext({console}),modules=['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','rock_contact.js'];
 assert(!(reference&&sourceDirectory),'Choose --source-ref OR --source-dir');
 for(const file of modules){const bytes=reference?cp.execFileSync('git',['show',reference+':src/'+file],{cwd:root}):fs.readFileSync(sourceDirectory?path.resolve(root,sourceDirectory,file):path.join(root,'src',file));report.sources[file]=hash(bytes);if(reference&&process.argv.includes('--save-reference')){const dir=path.join(path.dirname(out),'baseline-sources');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,file),bytes);}vm.runInContext(bytes.toString(),context,{filename:file});}
 const get=s=>vm.runInContext(s,context),index=get('indexGeometry');let archive=null;
 if(process.argv.includes('--compiled')){const packed=fs.readFileSync(path.join(root,option('archive','assets/reef.mesh.gz'))),raw=zlib.gunzipSync(packed),offset=8+raw.readUInt32LE(4);archive={raw,offset,header:JSON.parse(raw.subarray(8,offset))};report.archiveSHA256=hash(packed);}
 function inspect(label,g,budget){const mesh=index(g.v),metrics=geometryMetrics(mesh),row={label,material:g.material,authoringTriangleLimit:budget.triangles,geometrySHA256:hash(Buffer.from(mesh.vertices.buffer)),indicesSHA256:hash(Buffer.from(mesh.indices.buffer)),...metrics};report.meshes.push(row);
  check(label+': finite noncollapsed geometry with unit, face-aligned normals',()=>{assert.equal(metrics.nonfinite,0);assert(metrics.maxNormalError<2e-5,'normal error '+metrics.maxNormalError);assert.equal(metrics.collapsedTriangles,0,'zero-area triangles');assert.equal(metrics.invertedNormalTriangles,0);return {triangles:metrics.triangles,vertices:metrics.vertices,maxNormalError:metrics.maxNormalError};});
  check(label+': within the controlled authoring bound; scene cost remains separate',()=>{assert(metrics.triangles<=budget.triangles,metrics.triangles+' > '+budget.triangles);return {bytes:metrics.indexedBytes,triangles:metrics.triangles,authoringTriangleLimit:budget.triangles,acceptance:'Not a GPU, battery, whole-scene cost or art verdict'};});
  if(archive)check(label+': exact source mesh exists in the actual compiled scene',()=>{const expectedV=Buffer.from(mesh.vertices.buffer),expectedI=Buffer.from(mesh.indices.buffer),matches=[];for(let i=0;i<archive.header.batches.length;i++){const b=archive.header.batches[i];if(b.material!==g.material||b.vertexFloats!==mesh.vertices.length||b.indexCount!==mesh.indices.length)continue;const v=archive.raw.subarray(archive.offset+b.vertexOffset,archive.offset+b.vertexOffset+expectedV.length),ix=archive.raw.subarray(archive.offset+b.indexOffset,archive.offset+b.indexOffset+expectedI.length);if(v.equals(expectedV)&&ix.equals(expectedI))matches.push(i);}assert(matches.length,'No compiled mesh matches source vertex AND index bytes');row.compiledBatches=matches;return matches;});return {mesh,row};}
 const plateBudget={high:{triangles:12000},middle:{triangles:4000},far:{triangles:1600}},footprints=[];
 for(const type of [0,1])for(const lod of ['high','middle','far']){get('reefDetailLevel='+(lod==='high'?1:0));const seedBefore=get('seed'),g=lod==='far'?get('distantColony('+(type+3)+')'):get('tableCoral('+type+')'),seedAfter=get('seed'),label='foliose '+type+' '+lod,{mesh,row}=inspect(label,g,plateBudget[lod]);row.skin=topology(mesh,()=>true);row.basal=basalSlice(mesh);footprints.push(row.basal.key);
  check(label+': building the colony preserves RNG state',()=>{assert.equal(seedAfter,seedBefore);return seedAfter;});
  check(label+': every lamina and attachment belong to one closed outward skin',()=>{const t=row.skin;assert.equal(g.material,3);assert.equal(t.components.length,1,'separate tissue components '+t.components.length);assert.equal(t.boundaryEdges,0,'open edges');assert.equal(t.nonmanifoldEdges,0,'nonmanifold edges');assert.equal(t.orientationMismatches,0,'inconsistent winding');assert.equal(t.collapsedWeldedTriangles,0);assert(t.components[0].min[1]<0&&t.components[0].max[1]>.20,'skin must span the real root and crown');assert(t.components[0].signedVolume>0);return {components:1,boundaryEdges:0,signedVolume:t.components[0].signedVolume};});
  check(label+': the actual basal plane is a compact closed nonzero tissue section',()=>{assert(row.basal.closed,'actual y=0 section must be a closed loop');assert(row.basal.area>.015&&row.basal.area<.05,'basal tissue area '+row.basal.area);assert(row.basal.maxRadius<=.12001);assert(row.bounds.min[1]<-.02&&row.bounds.max[1]>.08);return row.basal;});
  row.laminae=laminarSections(mesh); // Diagnostic only: vertical thickness is not normal tissue thickness on a curved blade.
  check(label+': actual non-adjacent triangles have no transverse or coplanar crossing',()=>{const intersections=selfIntersections(mesh);row.selfIntersections=intersections;assert.equal(intersections.crossingPairs,0,'actual triangle crossings '+JSON.stringify(intersections.examples));return intersections;});
  check(label+': crossing oracle detects transformed actual geometry and rejects separation',()=>crossingControls(mesh));
 }
 check('both plate variants and all LODs share the exact actual attachment section',()=>{assert(footprints.every(p=>p&&p===footprints[0]));return {crossSection:footprints[0]};});
 for(const type of [0,1])check('foliose '+type+': middle and far retain the actual high-LOD extent and attachment height',()=>{const hi=report.meshes[type*3],span=Math.max(...hi.bounds.max.map((v,i)=>v-hi.bounds.min[i])),limit=span*.035;const result=[];for(const row of report.meshes.slice(type*3+1,type*3+3)){const delta=Math.max(...row.bounds.min.map((v,i)=>Math.abs(v-hi.bounds.min[i])),...row.bounds.max.map((v,i)=>Math.abs(v-hi.bounds.max[i])));assert(delta<=limit,'LOD extent drift '+delta+' > '+limit);assert.equal(row.bounds.min[1],hi.bounds.min[1]);result.push({label:row.label,maximumExtentDelta:delta,limit});}return result;});
 check('the two plate variants differ in actual positions, not only their pigment',()=>{const a=report.meshes[0],b=report.meshes[3];assert(a.bounds.max.some((v,i)=>Math.abs(v-b.bounds.max[i])>.01)||a.bounds.min.some((v,i)=>Math.abs(v-b.bounds.min[i])>.01));return {type0:a.bounds,type1:b.bounds};});
 const fanRows=[];
 for(const form of [{lod:'high',call:'seaFanGeometry(false)',triangles:30000},{lod:'middle',call:'seaFanGeometry(true)',triangles:6000},{lod:'far',call:'seaFanGeometry(true,true)',triangles:2500}]){const seedBefore=get('seed'),g=get(form.call),seedAfter=get('seed'),label='sea fan '+form.lod,{mesh,row}=inspect(label,g,{triangles:form.triangles});row.constructor=form.call;row.parts=topology(mesh,()=>true);row.basal=basalSlice(mesh);fanRows.push(row);
  check(label+': building the fan preserves RNG state',()=>{assert.equal(seedAfter,seedBefore);return seedAfter;});
  check(label+': physical geometry uses the branch material without the shader-perforated film',()=>{assert.equal(g.material,7);assert(!row.tags.some(t=>t>20),'actual film-tag vertices remain');const sections=[.72,1.02,1.25].map(y=>fanSections(mesh,y));row.openSectionDiagnostic=sections;return {triangles:row.triangles,tags:row.tags,sections,acceptance:'Diagnostic openings only; count and density do not establish biological appearance'};});
  check(label+': every physical branch surface is closed and consistently oriented',()=>{assert.equal(row.parts.boundaryEdges,0);assert.equal(row.parts.nonmanifoldEdges,0);assert.equal(row.parts.orientationMismatches,0);assert.equal(row.parts.collapsedWeldedTriangles,0);assert(row.parts.components.every(c=>c.signedVolume>0));return {components:row.parts.components.length,boundaryEdges:0,orientationMismatches:0};});
  check(label+': every physical branch reaches the actual holdfast through geometric contact',()=>{const graph=fanContact(row.parts.parts);row.attachment=graph;assert.equal(graph.roots.length,1,'one actual holdfast component');assert.deepEqual(graph.unanchored,[],'unattached physical branches');assert(row.basal.closed&&row.basal.area>.003&&row.basal.maxRadius<.065,'holdfast actual cross-section');return graph;});
  check(label+': translated actual branches are rejected by the contact oracle',()=>{const parts=row.parts.parts,roots=parts.map((p,i)=>p.min[1]<-.02&&p.max[1]>.06?i:-1).filter(i=>i>=0),moved=translatedParts({parts},[3,0,0]).parts;for(const i of roots)moved[i]=parts[i];const graph=fanContact(moved);assert.equal(graph.anchored.length,roots.length);assert.equal(graph.unanchored.length,parts.length-roots.length);return {offset:[3,0,0],unanchored:graph.unanchored.length};});
 }
 check('all three sea-fan LODs share the exact actual holdfast section',()=>{const high=fanRows[0];assert(high.basal.key&&fanRows.every(row=>row.basal.key===high.basal.key));return {constructors:fanRows.map(row=>row.constructor),area:high.basal.area,maxRadius:high.basal.maxRadius};});
 check('fan LOD helper shares cached geometry and the same actors across a continuous 0–220 m range',()=>{
  const seedBefore=get('seed'),calls=[],items=[Object.freeze({uid:'contract-fan-a',p:Object.freeze([1,2,3])}),Object.freeze({uid:'contract-fan-b',p:Object.freeze([4,5,6])})],before=JSON.stringify(items),renderer={batch(geometry,instances,kind){const b={geometry,instances,kind};calls.push(b);return b;}},build=get('fanColonyLods'),expected=[get('seaFanGeometry(false)'),get('seaFanGeometry(true)'),get('seaFanGeometry(true,true)')],first=build(renderer,items,'contract-fans'),second=build(renderer,items,'contract-fans-again');
  assert.equal(calls.length,6);assert.equal(first.length,3);assert.equal(second.length,3);assert.equal(get('seed'),seedBefore);assert.equal(JSON.stringify(items),before);
  const ranges=[[0,5.5],[5.5,20],[20,220]],roles=['near','middle','far'];for(let i=0;i<3;i++){for(const b of [first[i],second[i]]){assert.equal(b.instances,items,'original instance-array reference');assert.equal(b.kind,3);assert.equal(b.geometry,expected[i],'cached geometry reference');assert(b.geometry.indexed,'cached indexed mesh');assert.equal(b.minDistance||0,ranges[i][0]);assert.equal(b.maxDistance,ranges[i][1]);}assert.equal(first[i].geometry.indexed,second[i].geometry.indexed,'shared indexed buffers');assert.equal(first[i].sceneRole,'contract-fans-'+roles[i]);}
  return {calls:6,actorsPerBatch:items.length,ranges,sharedActorReference:true,sharedGeometryReference:true,sharedIndexedReference:true,rngBefore:seedBefore,rngAfter:get('seed'),scope:'Calls the actual helper with a recording batch adapter; actual world actor counts and visible draw cost require the compiled-scene and native gates'};
 });
 report.combinedIndexedBytes=report.meshes.reduce((s,m)=>s+m.indexedBytes,0);report.status=report.checks.every(c=>c.passed)?'passed-cpu-geometry-native-art-separate':'failed';
}catch(error){report.status='failed-harness';report.failure=error.stack;console.error(error);}
finally{save();console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length,combinedIndexedBytes:report.combinedIndexedBytes,out}));if(report.status!=='passed-cpu-geometry-native-art-separate')process.exitCode=1;}
