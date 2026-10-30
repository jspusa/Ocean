/* Independent CPU contract for v50 source geometry, before/after integration.
 * Baseline: published v49 source, not a generated receipt or current mesh.
 * No browser, GPU, archive bake, texture generation or production writes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),BASE='11bec02d5507c01ae9cc7ecf4f7ad0ed7e5f3629';
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const worldPath=option('world','src/world.js'),out=path.resolve(root,option('out','qa/parity/v01850-turtle-atlas/geometry-current.json'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex'),read=file=>fs.readFileSync(path.resolve(root,file),'utf8');
const names=['engine','world','next_reef','individuals'];
const current=Object.fromEntries(names.map(name=>[name,read(name==='world'?worldPath:'src/'+name+'.js')]));
const baseline=Object.fromEntries(names.map(name=>[name,cp.execFileSync('git',['show',BASE+':src/'+name+'.js'],{cwd:root,encoding:'utf8',maxBuffer:8e6})]));
const CONTACT_FLOOR=1.719214937115194,STROKE=Math.hypot(.37,.07);
// Declared in TURTLE-ATLAS-v01850-SPEC.md; no values imported from candidate
// builders, current geometry, or uv-receipt.json are used as expected results.
const rects={carapace:[0,0,512,588,16],plastron:[512,0,512,588,16],head:[0,588,512,436,16],front:[512,588,512,171,16],rear:[512,759,512,126,16],tail:[512,885,512,139,16]};
const ranges=Object.fromEntries(Object.entries(rects).map(([name,[x,y,w,h,inset]])=>[name,[(x+inset)/1024,(x+w-inset)/1024,(y+inset)/1024,(y+h-inset)/1024]]));
const report={status:'running',baseline:BASE,world:worldPath,sourceSHA256:Object.fromEntries(Object.entries(current).map(([k,s])=>[k,sha(s)])),
 baselineSHA256:Object.fromEntries(Object.entries(baseline).map(([k,s])=>[k,sha(s)])),checks:[],lods:[],rects,
 testAtRun:{path:path.relative(root,__filename),sha256:sha(fs.readFileSync(__filename))},
 method:'Actual source Float64 emissions and production indexGeometry Float32 triangles; independent position-welded topology, face-normal, chart, seam, shape-landmark and production JS culling checks. Expected atlas layout/shape landmarks come from the reviewed specification; v49 source supplies only historical budgets and unchanged attributes. QA recipe/receipt hashes are provenance, not acceptance oracles. CPU-only, no visual/atlas-pixel/GPU/full-world/physical-device acceptance.',
 exceptions:{tag4:'Only eye/nose tag 4 is exempt from atlas area/rect checks; all 12 attributes must equal v49.',
  headPoles:'The two closed head poles can have multiple UVs at one position; every emitted indexed triangle must still have nonzero UV area. Non-pole ventral seam copies must be paired at local V=0 and V=1.',
  flipperPoles:'Closed tips can duplicate UV attributes; no emitted-triangle area exemption.',
  tailCap:'The unchanged terminal fan uses local U=.98 at its ring and U=1 at the center with sector-midpoint V. Its triangles must retain nonzero area; no blanket cap exemption.'},
 unverified:['native silhouette acceptance','actual texture pixels and GPU sampler/material','GPU whole-stroke rig and shadow rendering','compiled full-world collision and routes','physical phone performance']};
for(const file of ['docs/parity/TURTLE-ATLAS-v01850-SPEC.md','docs/parity/TURTLE-v01849-ORIGINAL-SHAPE-OPTION.md']){
 (report.referenceSHA256||(report.referenceSHA256={}))[file]=sha(read(file));
}
// QA work files are optional provenance, never an oracle or a dependency of
// the committed regression test in a clean checkout.
report.optionalQAProvenance=Object.fromEntries(['qa/parity/v01850-turtle-atlas/prepare-uv.cjs','qa/parity/v01850-turtle-atlas/uv-receipt.json']
 .map(file=>[file,fs.existsSync(path.join(root,file))?sha(read(file)):null]));
const check=(name,run)=>{try{const detail=run();report.checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+' — '+e.message);}};
function build(sources){
 const context=vm.createContext({console});for(const [name,source]of Object.entries(sources))vm.runInContext(source,context,{filename:name+'.js'});
 const before=vm.runInContext('seed',context),geometries=vm.runInContext('[turtleGeometry(),distantTurtle()]',context),index=vm.runInContext('indexGeometry',context);
 return {context,geometries,meshes:geometries.map(g=>index(g.v)),seedUnchanged:before===vm.runInContext('seed',context)};
}
const old=build(baseline),now=build(current),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const key=p=>p.slice(0,3).map(v=>Math.round(v*1e7)).join(','),approx=(a,b,e=2e-6)=>Math.abs(a-b)<=e;
const triangleList=mesh=>Array.from({length:mesh.indices.length/3},(_,i)=>({id:i,vs:[0,1,2].map(j=>Array.from(mesh.vertices.subarray(mesh.indices[i*3+j]*12,mesh.indices[i*3+j]*12+12)))}));
function part(triangle){
 const p=triangle.vs;if(p.every(v=>v[11]===4))return 'eye';
 if(p.every(v=>v[11]===1))return 'carapace';
 if(p.every(v=>v[11]===3&&v[0]<.9))return 'plastron';
 if(p.every(v=>[2,3].includes(v[11])&&v[0]>.5&&Math.abs(v[2])<.3))return 'head';
 if(p.every(v=>v[11]===2&&Math.abs(v[2])>.3&&v[0]>-.55))return 'front';
 if(p.every(v=>v[11]===2&&Math.abs(v[2])>.3&&v[0]<-.55))return 'rear';
 if(p.every(v=>v[11]===2&&v[0]<-1&&Math.abs(v[2])<.1))return 'tail';
 return 'unclassified';
}
function topology(triangles){
 const edges=new Map(),parents=triangles.map((_,i)=>i),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 for(let i=0;i<triangles.length;i++)for(let j=0;j<3;j++){
  const a=key(triangles[i].vs[j]),b=key(triangles[i].vs[(j+1)%3]),id=[a,b].sort().join('|');
  if(!edges.has(id))edges.set(id,{count:0,orientation:0,triangle:i});const edge=edges.get(id);parents[find(i)]=find(edge.triangle);edge.count++;edge.orientation+=a<b?1:-1;
 }
 return {triangles:triangles.length,components:new Set(parents.map((_,i)=>find(i))).size,openEdges:[...edges.values()].filter(e=>e.count===1).length,
  nonManifoldEdges:[...edges.values()].filter(e=>e.count!==2).length,orientationErrors:[...edges.values()].filter(e=>e.count===2&&e.orientation!==0).length};
}
const local=(v,chart)=>{const [u0,u1,v0,v1]=ranges[chart];return [(v[9]-u0)/(u1-u0),(v[10]-v0)/(v1-v0)];};
const contains=(v,chart)=>{const [u0,u1,v0,v1]=ranges[chart];return v[9]>=u0-1e-7&&v[9]<=u1+1e-7&&v[10]>=v0-1e-7&&v[10]<=v1+1e-7;};
const eyeSource=g=>{const values=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===4)values.push(...g.v.slice(k,k+12));return Buffer.from(new Float64Array(values).buffer);};
const eyeIndexed=mesh=>{const records=[];for(let k=0;k<mesh.vertices.length;k+=12)if(mesh.vertices[k+11]===4)records.push(Array.from(mesh.vertices.subarray(k,k+12)).join(','));return records.sort().join('|');};
const uniquePoints=triangles=>[...new Map(triangles.flatMap(t=>t.vs).map(p=>[key(p),p])).values()];

check('both source LOD builders leave population RNG unchanged',()=>assert(now.seedUnchanged&&old.seedUnchanged));
for(let lod=0;lod<2;lod++){
 const label=lod?'low':'high',g=now.geometries[lod],mesh=now.meshes[lod],prior=old.meshes[lod],triangles=triangleList(mesh),oldTriangles=triangleList(prior);
 const groups=Object.fromEntries(['carapace','plastron','head','front','rear','tail','eye','unclassified'].map(name=>[name,triangles.filter(t=>part(t)===name)]));
 const row={lod:label,triangles:triangles.length,indexedVertices:mesh.vertices.length/12,indexedBytes:mesh.vertices.byteLength+mesh.indices.byteLength,
  baselineIndexedBytes:prior.vertices.byteLength+prior.indices.byteLength,restRadius:mesh.radius,parts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))};
 row.indexedByteGrowth=row.indexedBytes/row.baselineIndexedBytes-1;report.lods.push(row);
 check(label+' fixed triangle counts and at most 12% indexed-byte growth',()=>{
  assert.equal(triangles.length,[12970,1074][lod]);assert.equal(g.v.length/36,[12970,1074][lod]);assert.equal(prior.indices.length/3,[12970,1074][lod]);
  assert(row.indexedBytes<=row.baselineIndexedBytes*1.12,JSON.stringify(row));return {triangles:row.triangles,indexedBytes:row.indexedBytes,baselineIndexedBytes:row.baselineIndexedBytes,growth:row.indexedByteGrowth};
 });
 row.surface={finiteSource:g.v.every(Number.isFinite),finiteIndexed:mesh.vertices.every(Number.isFinite),invalidIndices:0,normalMaximumUnitError:0,degenerateTriangles:0,negativeNormalCorners:0,minimumFaceNormalDot:1,witnesses:[]};
 const s=row.surface;for(const i of mesh.indices)if(!Number.isInteger(i)||i<0||i>=mesh.vertices.length/12)s.invalidIndices++;
 for(let k=0;k<mesh.vertices.length;k+=12)s.normalMaximumUnitError=Math.max(s.normalMaximumUnitError,Math.abs(Math.hypot(...mesh.vertices.subarray(k+3,k+6))-1));
 for(const t of triangles){const p=t.vs.map(v=>v.slice(0,3)),face=cross(sub(p[1],p[0]),sub(p[2],p[0])),length=Math.hypot(...face);if(length<=1e-12){s.degenerateTriangles++;if(s.witnesses.length<5)s.witnesses.push({triangle:t.id,reason:'degenerate'});continue;}
  for(const v of t.vs){const d=dot(face,v.slice(3,6))/length;s.minimumFaceNormalDot=Math.min(s.minimumFaceNormalDot,d);if(d< -1e-6){s.negativeNormalCorners++;if(s.witnesses.length<5)s.witnesses.push({triangle:t.id,dot:d});}}
 }
 check(label+' finite source/indexed attributes and actual indexed winding/normals',()=>{assert(s.finiteSource&&s.finiteIndexed);assert.equal(s.invalidIndices,0);assert(s.normalMaximumUnitError<2e-6);assert.equal(s.degenerateTriangles,0);assert.equal(s.negativeNormalCorners,0);return s;});
 check(label+' every triangle belongs to one expected anatomical part',()=>{assert.equal(groups.unclassified.length,0);for(const name of Object.keys(rects))assert(groups[name].length>0,'Missing '+name);});
 check(label+' eye and nose tag 4 retain all 12 v49 attributes',()=>{
  const source=eyeSource(g),expected=eyeSource(old.geometries[lod]);assert(source.length>0);assert.equal(sha(source),sha(expected));assert.equal(eyeIndexed(mesh),eyeIndexed(prior));
  return {sourceBytes:source.length,sourceSHA256:sha(source),indexedSHA256:sha(eyeIndexed(mesh))};
 });
 const shell=[...groups.carapace,...groups.plastron],shellPoints=uniquePoints(shell),shellGroups=new Map();
 for(const t of shell)for(const p of t.vs){const id=key(p);if(!shellGroups.has(id))shellGroups.set(id,[]);shellGroups.get(id).push(p);}
 const rim=[];for(const ps of shellGroups.values()){const top=ps.find(p=>p[11]===1),under=ps.find(p=>p[11]===3);if(top&&under)rim.push({p:top.slice(0,3),dot:dot(top.slice(3,6),under.slice(3,6))});}
 row.shell={...topology(shell),sharedRimPoints:rim.length,minimumSharedNormalDot:Math.min(...rim.map(r=>r.dot))};
 check(label+' shell is one closed oriented skin with shared smooth rim',()=>{assert.equal(row.shell.components,1);assert.equal(row.shell.openEdges,0);assert.equal(row.shell.nonManifoldEdges,0);assert.equal(row.shell.orientationErrors,0);assert.equal(rim.length,lod?32:80);assert(row.shell.minimumSharedNormalDot>1-2e-5);return row.shell;});
 row.head=topology(groups.head);
 check(label+' head/neck remains one closed skin without belly-tag triangles',()=>{assert.equal(row.head.components,1);assert.equal(row.head.openEdges,0);assert.equal(row.head.nonManifoldEdges,0);assert.equal(row.head.orientationErrors,0);assert(groups.head.every(t=>t.vs.every(p=>p[11]===2)),'Lower-jaw head skin still uses the shell plastron tag');return row.head;});
 check(label+' refined shell and front-flipper landmarks match the authored shape contract',()=>{
  // These are named art-control landmarks from ORIGINAL-SHAPE-OPTION, not
  // a claim about measured green-turtle proportions or visual acceptance.
  const crown=shellPoints.reduce((a,b)=>a[1]>b[1]?a:b),front=uniquePoints(groups.front),tips=[];
  assert(crown.slice(0,3).every((v,k)=>approx(v,[-.20,.275,0][k])),'Shell crown is still the old outline: '+crown.slice(0,3));
  assert(approx(Math.max(...shellPoints.map(p=>p[0])),.82));assert(approx(Math.min(...shellPoints.map(p=>p[0])),-1.17));
  for(const side of [-1,1]){const vertices=front.filter(p=>p[2]*side>0),extent=Math.max(...vertices.map(p=>p[2]*side)),tip=vertices.find(p=>approx(p[2]*side,extent));
   assert(tip.slice(0,3).every((v,k)=>approx(v,[-.39,-.10,1.67*side][k])),'Front flipper retains old leaf tip: '+tip.slice(0,3));
   const rootZ=Math.min(...vertices.map(p=>p[2]*side)),root=vertices.filter(p=>approx(p[2]*side,rootZ));assert(approx(rootZ,.49));
   assert(Math.max(...root.map(p=>p[1]))-Math.min(...root.map(p=>p[1]))>.09,'Shoulder root has not gained the authored thickness');tips.push(tip.slice(0,3));
  }return {crown:crown.slice(0,3),tips};
 });
 const uv=row.uv={atlasTriangles:0,eyeTriangles:groups.eye.length,invalidRectTriangles:0,zeroAreaTriangles:0,angularCrossings:0,minimumDoubleArea:Infinity,charts:{},witnesses:[]};
 for(const t of triangles){const chart=part(t);if(chart==='eye')continue;uv.atlasTriangles++;
  const valid=Object.hasOwn(rects,chart)&&t.vs.every(p=>contains(p,chart));if(!valid){uv.invalidRectTriangles++;if(uv.witnesses.length<5)uv.witnesses.push({triangle:t.id,part:chart,uv:t.vs.map(p=>p.slice(9,11))});}
  const [a,b,c]=t.vs,area=Math.abs((b[9]-a[9])*(c[10]-a[10])-(b[10]-a[10])*(c[9]-a[9]));uv.minimumDoubleArea=Math.min(uv.minimumDoubleArea,area);if(!Number.isFinite(area)||area<=1e-14)uv.zeroAreaTriangles++;
  if(Object.hasOwn(rects,chart)){const entry=uv.charts[chart]||(uv.charts[chart]={triangles:0,maxLocalVSpan:0});entry.triangles++;
   const vs=t.vs.map(p=>local(p,chart)[1]),span=Math.max(...vs)-Math.min(...vs);entry.maxLocalVSpan=Math.max(entry.maxLocalVSpan,span);
   if(['head','front','rear','tail'].includes(chart)){const segments=chart==='head'?(lod?8:24):chart==='rear'?(lod?6:14):(lod?6:18);if(span>1/segments+1e-6)uv.angularCrossings++;}
  }
 }
 check(label+' all six chart rects own their actual triangles with nonzero UV area',()=>{assert.equal(uv.invalidRectTriangles,0,JSON.stringify(uv.witnesses));assert.equal(uv.zeroAreaTriangles,0);assert.equal(uv.angularCrossings,0);assert.deepEqual(Object.keys(uv.charts).sort(),Object.keys(rects).sort());assert.equal(uv.atlasTriangles+uv.eyeTriangles,row.triangles);return uv;});
 check(label+' shell UV follows the common physical bounds and image orientation',()=>{
  const minX=Math.min(...shellPoints.map(p=>p[0])),maxX=Math.max(...shellPoints.map(p=>p[0])),minZ=Math.min(...shellPoints.map(p=>p[2])),maxZ=Math.max(...shellPoints.map(p=>p[2]));
  for(const t of shell)for(const p of t.vs){const [u,v]=local(p,part(t));assert(approx(u,(p[2]-minZ)/(maxZ-minZ),1e-6)&&approx(v,(maxX-p[0])/(maxX-minX),1e-6),'Shell UV is not the shared +Z-right/+X-up projection');}
  return {minX,maxX,minZ,maxZ};
 });
 const headPositions=new Map();for(const t of groups.head)for(const p of t.vs){const k=key(p);if(!headPositions.has(k))headPositions.set(k,{p,vs:[]});headPositions.get(k).vs.push(local(p,'head')[1]);}
 const seam=row.headSeam={pairedVentralPositions:0,unpairedVentralPositions:0,wrongSeamPositions:0,poleCopies:0,crownPositions:0,physicalUFailures:0};
 for(const t of groups.head)for(const p of t.vs)if(!approx(local(p,'head')[0],(p[0]-.58)/.73,1e-6))seam.physicalUFailures++;
 for(const {p,vs}of headPositions.values()){
  const pole=approx(p[0],.58)||approx(p[0],1.31),lo=vs.some(v=>approx(v,0,1e-6)),hi=vs.some(v=>approx(v,1,1e-6));
  if(pole){seam.poleCopies+=vs.length;continue;}
  if(lo||hi){if(lo&&hi)seam.pairedVentralPositions++;else seam.unpairedVentralPositions++;if(Math.abs(p[2])>2e-6||p[1]>=0)seam.wrongSeamPositions++;}
  if(Math.abs(p[2])<2e-6&&vs.some(v=>approx(v,.5,1e-6)))seam.crownPositions++;
 }
 const priorHead=oldTriangles.filter(t=>part(t)==='head'),expectedPairs=new Set(priorHead.flatMap(t=>t.vs.map(p=>Math.round(p[0]*1e7)))).size-2;
 check(label+' head has paired ventral seam, crown midpoint and physical axial U',()=>{assert.equal(seam.pairedVentralPositions,expectedPairs,'No complete paired V=0/1 ventral seam');assert.equal(seam.unpairedVentralPositions,0);assert.equal(seam.wrongSeamPositions,0);assert.equal(seam.physicalUFailures,0);assert(seam.crownPositions>0&&seam.poleCopies>0);return {...seam,expectedPairs};});
 check(label+' tail terminal fan has explicit nonzero-area chart space',()=>{
  const cap=groups.tail.filter(t=>t.vs.every(p=>Math.hypot(p[0]+1.32,p[1]+.15,p[2])<.011));assert.equal(cap.length,lod?6:18);
  for(const t of cap){const u=t.vs.map(p=>local(p,'tail')[0]);assert.equal(u.filter(v=>approx(v,1,1e-6)).length,1);assert.equal(u.filter(v=>approx(v,.98,1e-6)).length,2);}
  return {capTriangles:cap.length};
 });
}

const species=vm.runInContext('SPECIES',now.context),turtleIDs=species.map((s,i)=>s.id==='turtle'?i:-1).filter(i=>i>=0);assert.equal(turtleIDs.length,1,'Unique turtle species required');
const turtleIndex=turtleIDs[0],turtle=species[turtleIndex];report.contact={speciesIndex:turtleIndex,id:turtle.id,authoredContactRadius:turtle.contactRadius??null,requiredMinimum:CONTACT_FLOOR};
check('actual turtle species owns the historical contact-radius floor',()=>{assert(Number.isFinite(turtle.contactRadius)&&turtle.contactRadius>=CONTACT_FLOOR,'SPECIES turtle contactRadius is '+String(turtle.contactRadius)+'; a different species field is not evidence');return report.contact;});
check('unchanged kind-2 shader stroke supports the analytical CPU bound',()=>{
 const section=source=>{const start=source.indexOf(' if(uKind==2&&'),end=source.indexOf('\n }',start);assert(start>=0&&end>start,'Turtle deformation block missing');return source.slice(start,end+3);};
 assert.equal(section(current.engine),section(baseline.engine),'Kind 2 shader changed; update the rig/analytical contract separately');return {deformationSHA256:sha(section(current.engine)),allPhaseMaximumDisplacement:STROKE};
});
check('actual contact owner retains radial and local-vertical all-phase coverage',()=>{
 const envelopes=[];now.context.qaTurtleIndex=turtleIndex;
 for(const scale of [[1,1,1],[.7,1.4,.9]]){
  now.context.qaScale=scale;const h=vm.runInContext('animalContactEnvelope({species:qaTurtleIndex,s:qaScale,p:[0,0,0],bioMorph:[1,1,1,1]})',now.context),maximumScale=Math.max(...scale);
  assert.equal(h.kind,2);assert(h.radius>=(CONTACT_FLOOR+STROKE)*maximumScale+.012-1e-10,'Envelope shrank below historical clearance');let radial=0,vertical=0;
  for(const mesh of now.meshes)for(let k=0;k<mesh.vertices.length;k+=12){const p=Array.from(mesh.vertices.subarray(k,k+3)),tag=mesh.vertices[k+11],u=Math.max(0,Math.min(1,(Math.abs(p[2])-.51)/.94)),w=tag>1.5&&tag<2.5?u*u*(3-2*u):0;
   radial=Math.max(radial,(Math.hypot(...p)+w*STROKE)*maximumScale);vertical=Math.max(vertical,(Math.abs(p[1])+.37*w)*maximumScale);
  }
  assert(radial<=h.radius+1e-6);assert(vertical<=h.vertical+1e-6);envelopes.push({scale,radius:h.radius,vertical:h.vertical,analyticalRadial:radial,analyticalLocalVertical:vertical});
 }return {envelopes,scope:'Radial bound covers every phase/rotation by triangle inequality and maximum scale. Vertical check is the local-axis displacement bound only; full posed vertical/world-route acceptance remains a separate gate.'};
});
check('production JS culling retains exactly the v49 stroke inflation with outside controls',()=>{
 now.context.qaRadii=now.meshes.map(m=>m.radius);now.context.qaInflation=STROKE;
 const rows=vm.runInContext(`(()=>{
  const rows=[],owner={mobile:false,quality:2,renderOrigin:[0,0,0],gl:{ARRAY_BUFFER:34962,bindBuffer(){},bufferSubData(){}}};
  for(let lod=0;lod<qaRadii.length;lod++)for(const scale of [[1,1,1],[.7,1.4,.9]])for(const shadow of [false,true])for(let plane=0;plane<6;plane++)for(const outside of [false,true]){
   const radius=qaRadii[lod],edge=(radius+qaInflation)*Math.max(...scale),distance=edge+(outside?1e-5:-1e-5),planes=Array.from({length:6},()=>[0,0,0,1000]);
   planes[plane][Math.floor(plane/2)]=plane%2?-1:1;planes[plane][3]=-distance;
   const batch={radius,kind:2,dynamic:true,instances:[{p:[0,0,0],s:scale}],data:new Float32Array(24),ib:{},maxDistance:180};
   Renderer.prototype.updateBatch.call(owner,batch,[0,0,0],planes,shadow);rows.push({lod,scale,shadow,plane,outside,drawCount:batch.drawCount});
  }return rows;
 })()`,now.context);
 const failures=rows.filter(r=>r.drawCount!==(r.outside?0:1));assert.equal(failures.length,0,JSON.stringify(failures));return {cases:rows.length,retained:rows.filter(r=>!r.outside&&r.drawCount===1).length,outsideCulled:rows.filter(r=>r.outside&&r.drawCount===0).length,rows};
});
report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};
report.status=report.summary.failed?'failed-CPU-integration-contract':'passed-CPU-contract-native-acceptance-pending';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,...report.summary,report:out}));if(report.summary.failed)process.exitCode=1;
