/* Production reef-fish geometry, indexed exactly as the renderer receives it.
 * These CPU witnesses establish topology and resource bounds, not visual
 * realism, native shader behavior or physical-device performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const reference=option('reef-ref',null),out=path.resolve(root,option('out','qa/parity/v01839-realism/reef-anatomy.json'));
const ids=['lyretail_anthias','banggai_cardinal','longnose_butterfly','fire_goby'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={status:'running',reference:reference||'working-tree',method:'Actual faunaGeometry and production indexGeometry, both LODs. Position-only welding at 1e-6 normalized body lengths ignores pigments and normal splits; tag 1 must be a single closed oriented skin. Fin components must connect to that skin by actual triangle contact or containment, directly or through another anchored fin; all components are included. Eyes and explicit mouth/gill accents may use their established separate tags. The test does not reconstruct the new body equation or infer anatomical beauty from a passing count. Native views, moving contact bounds and public delivery remain separate.',sources:{},weldTolerance:1e-6,finContactTolerance:.002,meshes:[],checks:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
function check(name,run){try{const detail=run();report.checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(error){report.checks.push({name,passed:false,error:error.message});console.log('FAIL '+name+': '+error.message);}}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function topology(mesh,accept){
 const points=[],parents=[],idsByPosition=new Map(),triangles=[],edges=new Map(),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 const vertex=id=>Array.from(mesh.vertices.subarray(id*12,id*12+12));
 const weld=v=>{const key=v.slice(0,3).map(x=>Math.round(x/report.weldTolerance)).join(',');let id=idsByPosition.get(key);if(id===undefined){id=points.length;idsByPosition.set(key,id);points.push(v.slice(0,3));parents.push(id);}return id;};
 for(let k=0;k<mesh.indices.length;k+=3){const v=Array.from(mesh.indices.subarray(k,k+3),vertex);if(!v.every(accept))continue;const t=v.map(weld);t.sourceIndex=k/3;t.points=v.map(p=>p.slice(0,3));triangles.push(t);for(let j=1;j<3;j++)parents[find(t[j])]=find(t[0]);
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=Math.min(a,b)+':'+Math.max(a,b),edge=edges.get(key)||{count:0,balance:0};edge.count++;edge.balance+=a<b?1:-1;edges.set(key,edge);}
 }
 const components=new Map();for(const t of triangles){const key=find(t[0]),part=components.get(key)||{triangles:0,vertices:new Set(),faces:[],signedVolume:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};part.triangles++;part.faces.push({points:t.points,sourceIndex:t.sourceIndex,...bounds(t.points)});part.signedVolume+=dot(points[t[0]],cross(points[t[1]],points[t[2]]))/6;for(const id of t){part.vertices.add(id);for(let k=0;k<3;k++){part.min[k]=Math.min(part.min[k],points[id][k]);part.max[k]=Math.max(part.max[k],points[id][k]);}}components.set(key,part);}
 const parts=[...components.values()].sort((a,b)=>b.triangles-a.triangles),result={vertices:points.length,triangles:triangles.length,components:parts.map(({faces,vertices,...p})=>({...p,vertices:vertices.size})),boundaryEdges:[...edges.values()].filter(e=>e.count===1).length,nonmanifoldEdges:[...edges.values()].filter(e=>e.count!==2).length,orientationMismatches:[...edges.values()].filter(e=>e.count===2&&e.balance!==0).length,collapsedWeldedTriangles:triangles.filter(t=>new Set(t).size!==3).length};
 Object.defineProperty(result,'parts',{value:parts});return result;
}
const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,s)=>a.map(v=>v*s),lengthSquared=a=>dot(a,a),clamp01=x=>Math.min(1,Math.max(0,x));
function bounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
function boxDistanceSquared(a,b){let d=0;for(let k=0;k<3;k++){const gap=Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k]);d+=gap*gap;}return d;}
// Independent Euclidean geometry: no fish profile, fin control points or rig
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
function containedPoint(p,body,work){
 if(p.some((v,k)=>v<body.min[k]-1e-8||v>body.max[k]+1e-8))return false;
 const span=Math.max(...body.max.map((v,k)=>v-body.min[k]))+1,end=add(p,mul([1,.371390676,.592118073],span*4)),hits=[];
 for(const face of body.faces){work.rayTriangleTests++;const t=segmentTriangleHit(p,end,face.points);if(t!==null)hits.push(t);}
 hits.sort((a,b)=>a-b);let unique=0,previous=-Infinity;for(const t of hits)if(t-previous>1e-8){unique++;previous=t;}return unique%2===1;
}
function surfaceContact(a,b,tolerance,work){
 const limit=tolerance*tolerance;if(boxDistanceSquared(a,b)>limit)return null;
 for(const fa of a.faces)for(const fb of b.faces){work.boxPairs++;if(boxDistanceSquared(fa,fb)>limit)continue;work.trianglePairs++;if(work.trianglePairs>2000000)throw Error('Fin-contact oracle exceeded its two-million candidate-pair bound');const d=triangleDistanceSquared(fa.points,fb.points);if(d<=limit)return {kind:d<1e-20?'triangle-intersection':'triangle-distance',distance:Math.sqrt(d),triangleA:fa.sourceIndex,triangleB:fb.sourceIndex};}
 return null;
}
function finAttachments(skin,fins){
 const work={boxPairs:0,trianglePairs:0,rayTriangleTests:0},nodes=fins.parts.map((p,id)=>({id,triangles:p.triangles,min:p.min,max:p.max,bodyContacts:[]})),edges=[],tolerance=report.finContactTolerance;
 for(let i=0;i<fins.parts.length;i++)for(let j=0;j<skin.parts.length;j++){const fin=fins.parts[i],body=skin.parts[j];let contact=surfaceContact(fin,body,tolerance,work);if(!contact&&containedPoint(fin.faces[0].points[0],body,work))contact={kind:'inside-closed-body',point:fin.faces[0].points[0],triangle:fin.faces[0].sourceIndex};if(contact){nodes[i].bodyContacts.push({bodyComponent:j,...contact});break;}}
 for(let i=0;i<fins.parts.length;i++)for(let j=0;j<i;j++){const contact=surfaceContact(fins.parts[i],fins.parts[j],tolerance,work);if(contact)edges.push({from:i,to:j,...contact});}
 const anchored=new Set(nodes.filter(n=>n.bodyContacts.length).map(n=>n.id));let changed=true;while(changed){changed=false;for(const e of edges)if(anchored.has(e.from)!==anchored.has(e.to)){anchored.add(e.from);anchored.add(e.to);changed=true;}}
 return {tolerance,bodyComponents:skin.parts.length,finComponents:nodes.length,nodes,edges,anchored:[...anchored].sort((a,b)=>a-b),unanchored:nodes.filter(n=>!anchored.has(n.id)).map(n=>n.id),work};
}
function translatedFinParts(fins,offset){return {parts:fins.parts.map(p=>({...p,min:add(p.min,offset),max:add(p.max,offset),faces:p.faces.map(f=>({...f,min:add(f.min,offset),max:add(f.max,offset),points:f.points.map(v=>add(v,offset))}))}))};}
function geometryMetrics(mesh){
 let nonfinite=0,maxNormalError=0,collapsedTriangles=0,invertedNormalTriangles=0,minDoubleArea=Infinity;const tags=new Set(),bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(let i=0;i<mesh.vertices.length;i++){if(!Number.isFinite(mesh.vertices[i]))nonfinite++;}
 for(let i=0;i<mesh.vertices.length;i+=12){maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(...mesh.vertices.subarray(i+3,i+6))-1));tags.add(mesh.vertices[i+11]);for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],mesh.vertices[i+k]);bounds.max[k]=Math.max(bounds.max[k],mesh.vertices[i+k]);}}
 for(let i=0;i<mesh.indices.length;i+=3){const offsets=Array.from(mesh.indices.subarray(i,i+3),v=>v*12),p=offsets.map(k=>Array.from(mesh.vertices.subarray(k,k+3))),normal=cross(sub(p[1],p[0]),sub(p[2],p[0])),area=Math.hypot(...normal),averaged=[0,1,2].map(k=>offsets.reduce((s,o)=>s+mesh.vertices[o+3+k],0));minDoubleArea=Math.min(minDoubleArea,area);if(area<1e-12)collapsedTriangles++;if(dot(normal,averaged)<-area*1e-5)invertedNormalTriangles++;}
 return {vertices:mesh.vertices.length/12,triangles:mesh.indices.length/3,indexedBytes:mesh.vertices.byteLength+mesh.indices.byteLength,nonfinite,maxNormalError,collapsedTriangles,invertedNormalTriangles,minDoubleArea,bounds,tags:[...tags].sort((a,b)=>a-b)};
}
try{
 const context=vm.createContext({console}),bake=fs.readFileSync(path.join(root,'bake_scene.cjs'),'utf8'),modules=JSON.parse('['+bake.match(/for\(const n of \[([^\]]+)\]/)[1].replaceAll("'",'"')+']');
 for(const file of modules){const bytes=file==='reef_fauna.js'&&reference?cp.execFileSync('git',['show',reference+':src/'+file],{cwd:root}):fs.readFileSync(path.join(root,'src',file));report.sources[file]=hash(bytes);vm.runInContext(bytes.toString(),context,{filename:file});}
 const species=vm.runInContext('SPECIES',context),build=vm.runInContext('faunaGeometry',context),index=vm.runInContext('indexGeometry',context);let archive=null;
 if(process.argv.includes('--compiled')){const archivePath=option('archive','assets/reef.mesh.gz'),packed=fs.readFileSync(path.resolve(root,archivePath)),raw=zlib.gunzipSync(packed),offset=8+raw.readUInt32LE(4);archive={raw,offset,header:JSON.parse(raw.subarray(8,offset))};report.archive={path:archivePath,sha256:hash(packed),sourceIdentityRequired:true};}
 check('the actual four reef species retain their catalogue positions and fish renderer',()=>{const mapping=ids.map(id=>({id,index:species.findIndex(s=>s.id===id),kind:species.find(s=>s.id===id)?.renderKind}));assert.deepEqual(mapping.map(s=>s.index),[37,38,39,40]);assert(mapping.every(s=>s.kind===1));return mapping;});
 for(const id of ids)for(const low of [false,true]){
  const g=build(id,low),mesh=index(g.v),metrics=geometryMetrics(mesh),skin=topology(mesh,p=>Math.abs(p[11]-1)<1e-6),fins=topology(mesh,p=>p[11]>2.5&&p[11]<3.5),row={id,lod:low?'low':'high',material:g.material,geometrySHA256:hash(Buffer.from(mesh.vertices.buffer)),...metrics,skin,fins};report.meshes.push(row);const label=id+' '+row.lod;
  if(archive)check(label+': compiled production mesh exactly matches the inspected generated geometry',()=>{const batches=archive.header.batches.filter(b=>b.species===species.findIndex(s=>s.id===id)&&b.sceneRole==='reef-fish-expansion');assert.equal(batches.length,2);const b=batches.find(b=>!!b.minDistance===low);assert(b,'actual near/far LOD metadata');assert.equal(b.kind,1);assert.equal(b.material,6);const vertices=new Float32Array(archive.raw.buffer,archive.raw.byteOffset+archive.offset+b.vertexOffset,b.vertexFloats),indices=new Uint32Array(archive.raw.buffer,archive.raw.byteOffset+archive.offset+b.indexOffset,b.indexCount);assert(Buffer.from(vertices.buffer,vertices.byteOffset,vertices.byteLength).equals(Buffer.from(mesh.vertices.buffer)),'generated and compiled vertex bytes differ');assert(Buffer.from(indices.buffer,indices.byteOffset,indices.byteLength).equals(Buffer.from(mesh.indices.buffer)),'generated and compiled index bytes differ');return {vertexBytes:vertices.byteLength,indexBytes:indices.byteLength};});
  check(label+': finite noncollapsed indexed geometry and unit normals',()=>{assert.equal(metrics.nonfinite,0);assert(metrics.maxNormalError<2e-5,'maximum normal length error '+metrics.maxNormalError);assert.equal(metrics.collapsedTriangles,0);assert.equal(metrics.invertedNormalTriangles,0);assert.equal(g.material,6);return {triangles:metrics.triangles,maxNormalError:metrics.maxNormalError};});
  check(label+': normalized whole-animal length remains one unit',()=>{const length=metrics.bounds.max[0]-metrics.bounds.min[0];assert(Math.abs(length-1)<2e-6,'actual indexed length '+length);assert(Math.abs(g.modelBounds.size[0]-1)<1e-10);return {length,bounds:metrics.bounds};});
  check(label+': body, peduncle and jaws form one connected primary skin',()=>{assert(skin.triangles>100,'actual main skin required');assert.equal(skin.components.length,1,'disconnected skin components '+skin.components.length);return {components:skin.components.length,triangles:skin.triangles};});
  check(label+': primary skin is closed and consistently oriented',()=>{assert.equal(skin.collapsedWeldedTriangles,0,'welding collapsed a skin triangle');assert.equal(skin.boundaryEdges,0,'open primary skin edges');assert.equal(skin.nonmanifoldEdges,0,'nonmanifold skin edges');assert.equal(skin.orientationMismatches,0,'adjacent primary skin winding');assert(skin.components.every(c=>c.signedVolume>0),'outward closed primary skin required');return {boundaryEdges:skin.boundaryEdges,orientationMismatches:skin.orientationMismatches};});
  check(label+': thin fin components are closed and consistently oriented',()=>{assert.equal(fins.collapsedWeldedTriangles,0,'welding collapsed a fin triangle');assert.equal(fins.boundaryEdges,0,'open fin edges');assert.equal(fins.nonmanifoldEdges,0,'nonmanifold fin edges');assert.equal(fins.orientationMismatches,0,'adjacent fin winding');assert(fins.components.length&&fins.components.every(c=>c.signedVolume>0),'outward closed fin components required');return {components:fins.components.length,boundaryEdges:fins.boundaryEdges,orientationMismatches:fins.orientationMismatches,minimumComponentVolume:Math.min(...fins.components.map(c=>c.signedVolume))};});
  check(label+': every actual fin component reaches the body through geometric contact',()=>{assert.equal(skin.nonmanifoldEdges,0,'closed primary components required for containment');row.finAttachments=finAttachments(skin,fins);assert(row.finAttachments.finComponents>0,'actual fins required');assert.deepEqual(row.finAttachments.unanchored,[],'unanchored actual fin components');return row.finAttachments;});
  check(label+': deliberately detached actual fins are rejected by the contact oracle',()=>{const detached=finAttachments(skin,translatedFinParts(fins,[2,0,0]));assert.equal(detached.anchored.length,0,'translated fins must have no body anchor');assert.equal(detached.unanchored.length,fins.parts.length);return {translation:[2,0,0],components:detached.finComponents,anchored:detached.anchored.length,work:detached.work};});
 }
 report.combinedIndexedBytes=report.meshes.reduce((sum,m)=>sum+m.indexedBytes,0);
 check('eight shared LOD meshes remain within the existing reef resource ceiling',()=>{assert(report.combinedIndexedBytes<3*1024*1024);return {bytes:report.combinedIndexedBytes,ceiling:3*1024*1024};});
 const budget=Number(option('max-bytes','0'));if(budget>0)check('combined geometry stays within the explicitly supplied original byte budget',()=>{assert(report.combinedIndexedBytes<=budget,report.combinedIndexedBytes+' bytes exceed '+budget);return {bytes:report.combinedIndexedBytes,budget};});
 report.status=report.checks.every(c=>c.passed)?'passed-cpu-topology-visual-acceptance-separate':'failed';
}catch(error){report.status='failed-harness';report.failure=error.stack;console.error(error);}
finally{save();console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length,combinedIndexedBytes:report.combinedIndexedBytes,out}));if(report.status!=='passed-cpu-topology-visual-acceptance-separate')process.exitCode=1;}
