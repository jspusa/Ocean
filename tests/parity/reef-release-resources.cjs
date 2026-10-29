/* Byte-level compiled/streamed release contract against the pinned v0.18.39
 * public baseline. The only exceptions are the reviewed tissue meshes, four
 * shared fan LOD headers, the source-bound bounded placement replay, and two
 * exact source-authored wreck-deck clearances that remain outside that replay.
 * This does not certify art, actual root/crown contact, or runtime GPU cost. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{isDeepStrictEqual:equal}=require('node:util');
const root=path.resolve(__dirname,'../..'),arg=(k,d)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const beforeRoot=path.resolve(root,arg('baseline-root','qa/parity/v01840-realism/baseline-public')),out=path.resolve(root,arg('out','qa/parity/v01840-realism/resource-audit.json'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
const PINNED_INDEX='e1ab52a49e374686bb4fc3b83911a3ee94c831715a1e808d33c143d228cc3bdd',PINNED_ARCHIVE='aa19c0136a14d9d483217d1fb9b8dbf4af995c69b8bb33ef4c3546823c2ce700';
const AUTHORED_IDS=['cliff-west-foliose-deep','cliff-west-fan-deep','cliff-east-fan-inner'],AUTHORED_SHA256='d424f27574ed4189cb4453d66890059b6b4481deceb2cacc29c8dcf612d99802';
const WRECK_IDS=['wreck-port-forward-plate-clearance','wreck-starboard-forward-plate-clearance'],WRECK_SHA256='9446e74742e2e6f07aa69aa2435e682de4616cf3fb5762e4c183631be5de92e9';
const GEOMETRY_FIELDS=new Set(['vertexOffset','indexOffset','vertexFloats','indexCount','radius','meshID']);
const BUDGETS={
 'foliose-0':{high:{triangles:7440,bytes:292704},middle:{triangles:2984,bytes:121632},far:{triangles:1476,bytes:61152}},
 'foliose-1':{high:{triangles:7440,bytes:294432},middle:{triangles:2984,bytes:122928},far:{triangles:1476,bytes:61152}},
 fan:{high:{triangles:28734,bytes:1787064},middle:{triangles:4548,bytes:297840},far:{triangles:1860,bytes:115056}}
};
const report={status:'running',checks:[],changedGeometry:[],changedNodes:[],changedMetadata:[],method:'Exact immutable baseline and every archive/chunk byte. Semantic batch matching tolerates only the four shared fan LOD headers. Actor exceptions require exact baseline from, compiled to and reviewed bounded receipt, or one of two exact source-authored deck translations. Source-table hashes use JSON with recursively sorted object keys. Separate anatomy, root/crown, browser and world-cost tests remain required.'};
function check(name,fn){try{const detail=fn();report.checks.push({name,passed:true,...(detail===undefined?{}:{detail})});}catch(error){report.checks.push({name,passed:false,error:error.message});}}
const pose=n=>({p:n.p,s:n.s||[1,1,1],yaw:n.yaw||0,pitch:n.pitch||0});
const withoutPose=n=>Object.fromEntries(Object.entries(n).filter(([k])=>!['p','yaw','pitch','reefGrowthFit'].includes(k)));
const metadata=b=>Object.fromEntries(Object.entries(b).filter(([key])=>!GEOMETRY_FIELDS.has(key)));
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
function onlyKeys(value,keys,label){assert(value&&typeof value==='object'&&!Array.isArray(value),label);assert.deepEqual(Object.keys(value).sort(),keys.slice().sort(),label+' fields');}
function exactPose(value,label){onlyKeys(value,['p','s','yaw','pitch'],label);for(const key of ['p','s'])assert(Array.isArray(value[key])&&value[key].length===3&&value[key].every(Number.isFinite),label+' '+key);assert(value.s.every(x=>x>0)&&Number.isFinite(value.yaw)&&Number.isFinite(value.pitch),label+' finite scale/angles');}
// initializeIndividuals adds only these two fields to the three static source
// actors. They remain exact in the separate whole compiled-identity check.
const originalIdentity=n=>Object.fromEntries(Object.entries(n).filter(([k])=>!['bioGenes','tint'].includes(k)));
function readAuthoredTable(source=fs.readFileSync(path.join(root,'src/next_reef.js'),'utf8')){
 const begin='// BEGIN REEF_GROWTH_AUTHORED_RELOCATIONS\n',end='// END REEF_GROWTH_AUTHORED_RELOCATIONS';assert.equal(source.split(begin).length,2,'One authored source table');assert.equal(source.split(end).length,2,'One authored source table end');const text=source.split(begin)[1].split(end)[0].trim(),literal=text.match(/^const REEF_GROWTH_AUTHORED_RELOCATIONS=Object\.freeze\((\[.*\])\);$/s);assert(literal,'Authored table is pure JSON; no scene construction or arbitrary evaluation');const rows=JSON.parse(literal[1]);
 assert.deepEqual(rows.map(r=>r.id),AUTHORED_IDS,'Only the three independently reviewed relocation identities');assert.equal(hash(canonical(rows)),AUTHORED_SHA256,'Exact reviewed authored original/destination table');
 for(const row of rows){onlyKeys(row,['id','family','original','to','limits'],'authored source row');exactPose(pose(row.original),'Authored original pose');exactPose(row.to,'Authored destination');assert.deepEqual(row.limits,{horizontal:4.6,vertical:2.5});assert.deepEqual(row.original.s,row.to.s,'Authored scale is fixed');assert(Math.hypot(row.to.p[0]-row.original.p[0],row.to.p[2]-row.original.p[2])<=4.6&&Math.abs(row.to.p[1]-row.original.p[1])<=2.5,'Authored correction envelope');}
 return rows;
}
function authoredNodes(rows,before,expectedActors){
 const byNode=new Map();for(const row of rows){const matches=before.index.nodes.flatMap((node,id)=>equal(originalIdentity(node),row.original)?[id]:[]);assert.equal(matches.length,1,'Unique complete immutable source identity '+row.id);const node=matches[0];assert.equal(expectedActors.get(node),row.family,'Only the intended actual growth family');assert(!byNode.has(node),'Three distinct authored actors');byNode.set(node,row);}return byNode;
}
function readWreckTable(source=fs.readFileSync(path.join(root,'src/open_world.js'),'utf8')){
 const begin='// BEGIN WRECK_PLATE_CLEARANCE_RELOCATIONS\n',end='// END WRECK_PLATE_CLEARANCE_RELOCATIONS';assert.equal(source.split(begin).length,2,'One wreck clearance table');assert.equal(source.split(end).length,2,'One wreck clearance table end');const text=source.split(begin)[1].split(end)[0].trim(),literal=text.match(/^const WRECK_PLATE_CLEARANCE_RELOCATIONS=Object\.freeze\((\[.*\])\);$/s);assert(literal,'Wreck clearance table is pure JSON');const rows=JSON.parse(literal[1]);assert.deepEqual(rows.map(r=>r.id),WRECK_IDS,'Only the two reviewed deck-clearance actors');assert.equal(hash(canonical(rows)),WRECK_SHA256,'Exact reviewed deck-clearance table');
 for(const row of rows){onlyKeys(row,['id','original','to'],'wreck source row');exactPose(row.to,'Wreck destination');assert.deepEqual({...row.to,p:row.original.p},pose(row.original),'Wreck scale and angles are unchanged');assert.equal(row.to.p[1],row.original.p[1],'Wreck deck height is fixed');assert(Math.hypot(row.to.p[0]-row.original.p[0],row.to.p[2]-row.original.p[2])<=.4+1e-9,'Only a local deck translation');}return rows;
}
function wreckNodes(rows,before,expectedActors){
 const plates=new Set(before.index.batches.filter(b=>b.sceneRole==='wreck-plates').flatMap(b=>b.instanceIDs)),byNode=new Map();for(const row of rows){const matches=before.index.nodes.flatMap((node,id)=>equal(originalIdentity(node),row.original)?[id]:[]);assert.equal(matches.length,1,'Unique complete immutable wreck identity '+row.id);const node=matches[0];assert(plates.has(node)&&!expectedActors.has(node)&&!byNode.has(node),'Only two distinct original wreck plates outside the growth replay');byNode.set(node,row);}return byNode;
}
function validateWreckActor(row,a,b){
 assert.deepEqual(originalIdentity(a),row.original,'Exact original wreck identity, including phase');assert.deepEqual(pose(b),row.to,'Exact authored deck-clearance destination');assert.deepEqual(b,{...a,p:row.to.p},'Only wreck p may change; every scale, angle, gene and phase remains exact');assert.equal(b.p[1],a.p[1],'Actual deck height is unchanged');const delta=b.p.map((v,k)=>v-a.p[k]);assert(Math.hypot(delta[0],delta[2])<=.4+1e-9,'Authored deck translation bound');return {family:'foliose-1',changed:true,delta,horizontal:Math.hypot(delta[0],delta[2]),vertical:0,authoredWreckClearance:row.id};
}
function validateActor(r,a,b,family,authored=null){
 onlyKeys(r,['family','from','to','fit','support','node'],'actor receipt');assert.equal(r.family,family,'Recorded family');exactPose(r.from,'Recorded from');exactPose(r.to,'Recorded to');
 assert.deepEqual(r.from,pose(a),'Replay from must equal the actual immutable source pose');assert.deepEqual(r.to,pose(b),'Replay to must equal the actual compiled pose');assert.deepEqual(withoutPose(b),withoutPose(a),'Scale, genes, phase, tint and all non-pose identity');assert.deepEqual(r.to.s,r.from.s,'Scale is fixed');
 const changed=!equal(r.from,r.to),delta=r.to.p.map((v,k)=>v-r.from.p[k]),expectedLimits=authored?authored.limits:{horizontal:3.3,vertical:2.5};
 if(authored){assert.deepEqual(originalIdentity(a),authored.original,'Exact authored source identity, including phase');assert.equal(family,authored.family);assert.deepEqual(r.from,pose(authored.original));assert.deepEqual(r.to,authored.to,'Only the exact reviewed authored destination');assert.equal(r.fit?.authoredRelocation,authored.id,'Exact source-owned authored reason ID');assert.equal(r.fit?.reason?.authoredRelocation,authored.id,'Matching recorded authored reason');assert(changed,'The three authored corrections must be explicitly applied');}
 assert(Math.hypot(delta[0],delta[2])<=expectedLimits.horizontal+1e-9,'Measured horizontal fit bound');assert(Math.abs(delta[1])<=2.5+1e-9,'Measured vertical fit bound');
 if(changed){
  onlyKeys(r.fit,['from','delta','limits','reason',...(authored?['authoredRelocation']:[])],'fit evidence');assert.deepEqual(r.fit.from,r.from);assert.deepEqual(r.fit.delta,delta);assert.deepEqual(r.fit.limits,expectedLimits);
  assert(r.fit.reason&&Object.entries(r.fit.reason).every(([k,v])=>k==='authoredRelocation'?!!authored&&v===authored.id:['root','crown','sideSurface'].includes(k)&&typeof v==='boolean'),'Only measured root/crown/side reasons or the exact authored ID');assert(r.fit.reason.root||r.fit.reason.crown,'A changed actor must have a failing original root/crown');
  if(!authored&&(r.to.yaw!==r.from.yaw||r.to.pitch!==r.from.pitch))assert.equal(r.fit.reason.sideSurface,true,'Rotation requires a measured side-facet fit');assert.deepEqual(b.reefGrowthFit,r.fit,'Exact compiled fit evidence');
 }else{assert.equal(r.fit,null,'Unchanged actors cannot have unexplained fit metadata');assert(!Object.hasOwn(b,'reefGrowthFit'),'No compiled fit metadata without a changed pose');assert.deepEqual(b,a,'An unfitted actor must remain byte-structurally identical');}
 return {node:r.node,family,changed,delta,horizontal:Math.hypot(delta[0],delta[2]),vertical:Math.abs(delta[1]),...(authored?{authoredRelocation:authored.id}:{})};
}
function geometry(raw,start,b){return Buffer.concat([raw.subarray(start+b.vertexOffset,start+b.vertexOffset+b.vertexFloats*4),raw.subarray(start+b.indexOffset,start+b.indexOffset+b.indexCount*4)]);}
function load(folder){
 const packed=fs.readFileSync(path.join(folder,'assets/reef.mesh.gz')),raw=zlib.gunzipSync(packed);assert.equal(raw.readUInt32LE(0),0x35424652,'Compiled archive magic');const start=8+raw.readUInt32LE(4),archive=JSON.parse(raw.subarray(8,start)),indexBytes=fs.readFileSync(path.join(folder,'assets/scene/index.json')),index=JSON.parse(indexBytes),chunks=[];
 assert.equal(hash(packed),index.sourceArchiveSHA256,'Archive provenance');
 for(const c of index.chunks){const bytes=fs.readFileSync(path.join(folder,'assets/scene',c.url));assert.equal(hash(bytes),c.sha256,c.url);assert.equal(bytes.length,c.bytes,c.url);const decoded=zlib.gunzipSync(bytes);assert.equal(decoded.length,c.decodedBytes,c.url+' decoded bytes');chunks.push(decoded);}
 assert.equal(index.batches.length,archive.batches.length);
 const verifiedMeshes=new Set(),geometries=index.batches.map((b,id)=>{const m=index.meshes[b.meshID],streamed=geometry(chunks[m.chunk],0,m),compiled=geometry(raw,start,archive.batches[id]);assert(streamed.equals(compiled),'Stream/archive geometry differs for batch '+id);assert.deepEqual(metadata(b),metadata(archive.batches[id]),'Every stream/archive batch field '+id);for(const key of ['vertexFloats','indexCount','radius']){assert.equal(b[key],archive.batches[id][key],key+' '+id);assert.equal(b[key],m[key],'Shared mesh '+key+' '+id);}
  if(!verifiedMeshes.has(b.meshID)){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let radius=0;for(let offset=0;offset<m.vertexFloats*4;offset+=48){const point=[0,4,8].map(k=>compiled.readFloatLE(offset+k));assert(point.every(Number.isFinite));for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],point[k]);hi[k]=Math.max(hi[k],point[k]);}radius=Math.max(radius,Math.hypot(...point));}assert.deepEqual(m.bounds,{center:lo.map((v,k)=>(v+hi[k])*.5),half:lo.map((v,k)=>(hi[k]-v)*.5)},'Stream culling bounds derive from actual vertices');assert(Math.abs(radius-m.radius)<=2e-6*Math.max(1,radius),'Compiled double radius agrees with Float32 vertices');verifiedMeshes.add(b.meshID);}
  return {hash:hash(compiled),bytes:compiled.length,triangles:b.indexCount/3};});
 for(const key of ['nodes','rockContact','obstacles','reefPatches','life','decorLife','shoal','diverBatch'])assert.deepEqual(index[key],archive[key],key+' stream/archive metadata');
 return {archive,index,geometries,receipt:{archiveSHA256:hash(packed),indexSHA256:hash(indexBytes),archiveBytes:packed.length,decodedArchiveBytes:raw.length,streamBytes:index.chunks.reduce((n,c)=>n+c.bytes,0),decodedUniqueBytes:index.chunks.reduce((n,c)=>n+c.decodedBytes,0),chunks:index.chunks.length,batches:index.batches.length,nodes:index.nodes.length,meshes:index.meshes.length}};
}
function familyCatalogue(before){
 // These are witnessed original colony positions, not mutable candidate IDs.
 // The baseline index hash fixes their identity and every derived mesh hash.
 const anchors={'foliose-0':[-8.784490362838863,-.9366063533456204],'foliose-1':[26.90673101463244,-8.753408925293556],fan:[-9.342263284637786,6.5733367655071415]},catalogue=new Map();
 for(const [family,xz] of Object.entries(anchors)){
  const ids=before.index.nodes.flatMap((n,id)=>n.p[0]===xz[0]&&n.p[2]===xz[1]?[id]:[]);assert.equal(ids.length,1,'Unique immutable '+family+' anchor');
  const batches=before.index.batches.flatMap((b,id)=>b.instanceIDs.includes(ids[0])?[id]:[]);assert.equal(batches.length,3,'Original three-LOD '+family+' family');
  for(const id of batches){const b=before.index.batches[id],lod=(b.minDistance||0)>=20?'far':(b.minDistance||0)>0?'middle':'high',key=before.geometries[id].hash;let entry=catalogue.get(key);if(!entry)catalogue.set(key,entry={family,lods:new Set()});assert.equal(entry.family,family);entry.lods.add(lod);}
 }
 return catalogue;
}
function lodOf(entry,b){return entry.lods.size===1?[...entry.lods][0]:(b.minDistance||0)>=20?'far':'middle';}
function fitLimits(replay,index,expectedActors){
 const limits=new Map(),entries=new Map();
 for(const r of replay.batchLimits){
  onlyKeys(r,['entry','batch','from','to'],'visibility receipt');assert(Number.isInteger(r.entry)&&r.entry>=0&&Number.isInteger(r.batch)&&r.batch>=0,'Visibility receipt indices');assert(!limits.has(r.batch)&&!entries.has(r.entry),'Duplicate visibility receipt');
  const b=index.batches[r.batch];assert(b&&b.instanceIDs.length&&b.instanceIDs.every(id=>expectedActors.has(id)),'Only fitted colony visibility may change');assert(r.from===null||Number.isFinite(r.from)&&r.from>0,'Original visibility');assert(Number.isFinite(r.to)&&r.to>(b.minDistance||0)&&r.to<(r.from??220),'Only a strict bounded range reduction');assert.equal(b.maxDistance,r.to,'Compiled visibility must equal receipt');limits.set(r.batch,r);entries.set(r.entry,r.batch);
 }
 return {limits,entries};
}
function restoreRange(b,id,limits){const result=metadata(b),r=limits.get(id);if(r){if(r.from===null)delete result.maxDistance;else result.maxDistance=r.from;}return result;}
function validateSupport(r,index,entries){
 const s=r.support;onlyKeys(s,['surfaces','maxDistance','pivotDistance','minimumScale','fadeAllowance'],'support evidence');assert(Array.isArray(s.surfaces)&&s.surfaces.length>0,'Actual support surfaces required');assert.equal(s.minimumScale,.64);assert.equal(s.fadeAllowance,1.2);assert(Number.isFinite(s.maxDistance)&&Number.isFinite(s.pivotDistance)&&s.pivotDistance>=0);
 const seen=new Set(),surfaces=s.surfaces.map(v=>{
  onlyKeys(v,['entry','batch','instance'],'support surface');for(const k of ['entry','batch','instance'])assert(Number.isInteger(v[k])&&v[k]>=0,'Support surface index');const key=v.batch+'/'+v.instance;assert(!seen.has(key),'Duplicate support surface');seen.add(key);
  if(entries.has(v.entry))assert.equal(entries.get(v.entry),v.batch,'A captured entry maps to one actual batch');else entries.set(v.entry,v.batch);
  const b=index.batches[v.batch],node=index.nodes[b?.instanceIDs[v.instance]];assert(b&&node&&!b.dynamic&&(b.kind||0)===0&&([1,2].includes(b.material)||b.sceneRole==='wreck-hull'),'Support must be actual static rendered substrate');
  if(b.material===2)assert(index.rockContact.instances.some(x=>index.rockContact.meshes[x.mesh].kind==='rock'&&equal(pose(x),pose(node))),'Rock support must exist in the unchanged actual contact catalogue');
  return {b,node};
 });
 for(const surface of surfaces)assert.deepEqual(pose(surface.node),pose(surfaces[0].node),'Support LODs must share one actual substrate pose');
 const distance=Math.hypot(...r.to.p.map((v,k)=>v-surfaces[0].node.p[k]));assert(Math.abs(distance-s.pivotDistance)<1e-10,'Recorded support pivot distance');
 let end=0;for(const surface of surfaces.slice().sort((a,b)=>(a.b.minDistance||0)-(b.b.minDistance||0))){if((surface.b.minDistance||0)>end)break;end=Math.max(end,surface.b.maxDistance||220);}
 const cap=end-(distance+1.2)/.64;assert(Math.abs(cap-s.maxDistance)<1e-10,'Support visibility derived from actual contiguous LOD coverage');
 for(const b of index.batches.filter(b=>b.instanceIDs.includes(r.node)))assert((b.maxDistance||220)<=cap+1e-10,'Colony cannot outlive its recorded support interval');
 return {node:r.node,surfaces:s.surfaces.length,cap};
}
function selfTest(){
 const a={p:[1,-10,2],s:[1,1,1],yaw:.4,phase:2,tint:[1,.9,.8],bioGenes:[.1,.2,.3,.4]},to={p:[1.2,-9.7,2.1],s:[1,1,1],yaw:.4,pitch:0},r={node:0,family:'foliose-0',from:pose(a),to,fit:{from:pose(a),delta:to.p.map((v,k)=>v-a.p[k]),limits:{horizontal:3.3,vertical:2.5},reason:{root:true,crown:false}},support:null},b={...a,p:to.p,reefGrowthFit:r.fit};
 check('small receipt fixture accepts the exact bounded correction',()=>validateActor(r,a,b,'foliose-0'));
 for(const [name,mutate] of [
  ['an unexplained source height',(q,x,y)=>{q.from.p[1]-=.1;}],
  ['a compiled position outside its receipt',(q,x,y)=>{y.p[0]+=.01;}],
  ['a changed non-pose gene',(q,x,y)=>{y.bioGenes[0]+=.01;}],
  ['an unexplained rotation',(q,x,y)=>{q.to.yaw+=.1;y.yaw=q.to.yaw;}],
  ['an oversized horizontal move',(q,x,y)=>{q.to.p[0]=x.p[0]+3.4;y.p=q.to.p;q.fit.delta=q.to.p.map((v,k)=>v-x.p[k]);}],
  ['missing original root/crown failure',(q,x,y)=>{q.fit.reason={root:false,crown:false};y.reefGrowthFit=q.fit;}],
  ['extra receipt fields',(q)=>{q.arbitraryAllowance=true;}],
 ])check('small receipt fixture rejects '+name,()=>{const q=clone(r),x=clone(a),y=clone(b);mutate(q,x,y);assert.throws(()=>validateActor(q,x,y,'foliose-0'));});
 const authored=readAuthoredTable()[1],original={...clone(authored.original),bioGenes:[.1,.2,.3,.4],tint:[1,1,1]},authoredFit={from:pose(original),delta:authored.to.p.map((v,k)=>v-original.p[k]),limits:authored.limits,reason:{root:true,crown:true,authoredRelocation:authored.id},authoredRelocation:authored.id},authoredRecord={node:0,family:authored.family,from:pose(original),to:clone(authored.to),fit:authoredFit,support:null},authoredCompiled={...clone(original),...clone(authored.to),reefGrowthFit:clone(authoredFit)};
 check('exact source-owned authored correction is accepted by the narrow guard',()=>validateActor(authoredRecord,original,authoredCompiled,authored.family,authored));
 for(const [name,mutate] of [
  ['a nearby but unauthored destination',(q,x,y)=>{q.to.p[0]+=.0001;y.p=q.to.p;q.fit.delta=q.to.p.map((v,k)=>v-x.p[k]);y.reefGrowthFit=q.fit;}],
  ['another original phase with the same pose',(q,x,y)=>{x.phase+=.001;y.phase=x.phase;}],
  ['the wrong authored reason ID',(q,x,y)=>{q.fit.authoredRelocation='unreviewed';y.reefGrowthFit=q.fit;}],
 ])check('authored guard rejects '+name,()=>{const q=clone(authoredRecord),x=clone(original),y=clone(authoredCompiled);mutate(q,x,y);assert.throws(()=>validateActor(q,x,y,authored.family,authored));});
 check('authored allowance cannot be borrowed without matching the source table',()=>assert.throws(()=>validateActor(authoredRecord,original,authoredCompiled,authored.family)));
 const tableSource=rows=>'// BEGIN REEF_GROWTH_AUTHORED_RELOCATIONS\nconst REEF_GROWTH_AUTHORED_RELOCATIONS=Object.freeze('+JSON.stringify(rows)+');\n// END REEF_GROWTH_AUTHORED_RELOCATIONS';
 check('the source table cannot silently add a fourth exception',()=>{const rows=readAuthoredTable();rows.push({...clone(rows[0]),id:'unreviewed-fourth'});assert.throws(()=>readAuthoredTable(tableSource(rows)));});
 check('the source table cannot silently change an approved destination',()=>{const rows=readAuthoredTable();rows[0].to.p[0]+=.01;assert.throws(()=>readAuthoredTable(tableSource(rows)),/Exact reviewed authored/);});
 const wreck=readWreckTable()[0],wreckOriginal={...clone(wreck.original),bioGenes:[.1,.2,.3,.4],tint:[1,1,1]},wreckCompiled={...clone(wreckOriginal),p:clone(wreck.to.p)};
 check('exact authored wreck clearance is accepted without joining the fit replay',()=>validateWreckActor(wreck,wreckOriginal,wreckCompiled));
 for(const [name,mutate] of [
  ['an unauthored nearby position',(a,b)=>{b.p[0]+=.0001;}],
  ['a changed deck height',(a,b)=>{b.p[1]+=.01;}],
  ['a changed colony yaw',(a,b)=>{b.yaw+=.01;}],
  ['another original phase',(a,b)=>{a.phase+=.01;b.phase=a.phase;}],
 ])check('wreck guard rejects '+name,()=>{const a=clone(wreckOriginal),b=clone(wreckCompiled);mutate(a,b);assert.throws(()=>validateWreckActor(wreck,a,b));});
 check('the deck-clearance source table cannot add a third exception',()=>{const rows=readWreckTable();rows.push({...clone(rows[0]),id:'unreviewed-third'});const source='// BEGIN WRECK_PLATE_CLEARANCE_RELOCATIONS\nconst WRECK_PLATE_CLEARANCE_RELOCATIONS=Object.freeze('+JSON.stringify(rows)+');\n// END WRECK_PLATE_CLEARANCE_RELOCATIONS';assert.throws(()=>readWreckTable(source));});
 report.status=report.checks.every(c=>c.passed)?'passed-isolated-contract-guards':'failed';report.method='Small explicit malformed-receipt guard fixtures only; no scene, contact, art, runtime or release acceptance.';
}
function main(){
 const before=load(beforeRoot),current=load(root);report.before=before.receipt;report.current=current.receipt;
 assert.equal(before.receipt.indexSHA256,PINNED_INDEX,'Use the immutable publicly verified v0.18.39 baseline');assert.equal(before.receipt.archiveSHA256,PINNED_ARCHIVE);assert.notEqual(fs.realpathSync(beforeRoot),fs.realpathSync(root),'Candidate cannot be its own baseline');
 const replay=require(path.join(root,'scene_inputs.cjs')).verifyGrowthReplay(root);report.replay={sha256:hash(fs.readFileSync(path.join(root,'assets/reef-growth.json'))),sourceSHA256:replay.sourceSHA256,actors:replay.actors.length,batchLimits:replay.batchLimits};
 const catalogue=familyCatalogue(before),expectedActors=new Map(),familyByBatch=new Map();
 before.index.batches.forEach((b,id)=>{const f=catalogue.get(before.geometries[id].hash);if(!f)return;familyByBatch.set(id,{family:f.family,lod:lodOf(f,b)});if(!b.sceneRole?.startsWith('wreck-'))for(const node of b.instanceIDs){if(expectedActors.has(node))assert.equal(expectedActors.get(node),f.family);expectedActors.set(node,f.family);}});
 const authored=authoredNodes(readAuthoredTable(),before,expectedActors);report.authoredRelocations={source:'src/next_reef.js#REEF_GROWTH_AUTHORED_RELOCATIONS',canonicalSHA256:AUTHORED_SHA256,actors:[...authored].map(([node,row])=>({node,...row})),generalActorCount:expectedActors.size-authored.size};
 const wreckAuthored=wreckNodes(readWreckTable(),before,expectedActors);report.authoredWreckRelocations={source:'src/open_world.js#WRECK_PLATE_CLEARANCE_RELOCATIONS',canonicalSHA256:WRECK_SHA256,actors:[...wreckAuthored].map(([node,row])=>({node,...row}))};
 const {limits,entries}=fitLimits(replay,current.index,expectedActors),replayByNode=new Map();
 for(const r of replay.actors){assert(Number.isInteger(r.node)&&expectedActors.has(r.node)&&!replayByNode.has(r.node),'Unique actual expected replay node');replayByNode.set(r.node,r);}assert.deepEqual([...replayByNode.keys()].sort((a,b)=>a-b),[...expectedActors.keys()].sort((a,b)=>a-b),'Replay must cover exactly every non-wreck foliose/fan actor');
 check('both archives and every streamed chunk preserve exact content and metadata',()=>assert(before&&current));
 check('four shared fan LOD headers add no individuals',()=>{assert.equal(current.index.batches.length,before.index.batches.length+4);assert.equal(current.index.nodes.length,before.index.nodes.length);});
 check('rock contacts, obstacles, habitats and all animal memberships remain exact',()=>{for(const k of ['sourceVersion','rockContact','obstacles','reefPatches','life','decorLife','shoal'])assert.deepEqual(current.index[k],before.index[k],k);});
 check('only the recorded replay asset joins unchanged texture, guide and music files',()=>{
  const files=folder=>['assets','music'].flatMap(dir=>fs.readdirSync(path.join(folder,dir),{withFileTypes:true}).filter(e=>e.isFile()&&!['reef.mesh.gz','reef-growth.json'].includes(e.name)).map(e=>dir+'/'+e.name)).sort();const old=files(beforeRoot),now=files(root);assert.deepEqual(now,old);for(const file of old)assert(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(beforeRoot,file))),file);assert(!fs.existsSync(path.join(beforeRoot,'assets/reef-growth.json')));report.unchangedSupportingFiles=old.length;
 });
 const pairs=[],added=[],used=new Set(),replacedOld=new Set();
 check('hero and cliff fans reuse exactly their original actors and three shared LODs',()=>{
  for(const [role,count,originalKind] of [['hero-fans',2,0],['cliff-fans',9,3]]){
   const old=before.index.batches.flatMap((b,id)=>familyByBatch.get(id)?.family==='fan'&&familyByBatch.get(id)?.lod==='high'&&b.instanceIDs.length===count&&b.kind===originalKind&&!b.maxDistance&&!b.sceneRole?[id]:[]);assert.equal(old.length,1,'Unique original '+role+' population');const original=before.index.batches[old[0]];replacedOld.add(old[0]);
   for(const [suffix,lod,min,max] of [['near','high',0,5.5],['middle','middle',5.5,20],['far','far',20,220]]){
    const found=current.index.batches.flatMap((b,id)=>b.sceneRole===role+'-'+suffix?[id]:[]);assert.equal(found.length,1,'One '+role+'-'+suffix+' batch');const id=found[0],b=current.index.batches[id],expected={...metadata(original),kind:3,maxDistance:max,sceneRole:role+'-'+suffix};if(min)expected.minDistance=min;assert.deepEqual(restoreRange(b,id,limits),expected,'Only explicit shared fan LOD metadata');assert.deepEqual(b.instanceIDs,original.instanceIDs);used.add(id);pairs.push({old:old[0],current:id,family:'fan',lod,added:suffix!=='near'});if(suffix!=='near')added.push(id);
   }
  }assert.equal(added.length,4);
 });
 const byKey=new Map();current.index.batches.forEach((b,id)=>{if(used.has(id))return;const key=canonical(restoreRange(b,id,limits));if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(id);});
 check('every other batch matches unchanged semantic metadata and actual instances',()=>{
  for(let old=0;old<before.index.batches.length;old++){
   if(replacedOld.has(old))continue;const a=before.index.batches[old],key=canonical(metadata(a)),candidates=(byKey.get(key)||[]).filter(id=>!used.has(id));assert(candidates.length,'No equivalent actual batch for original '+old);let selected=candidates.find(id=>current.geometries[id].hash===before.geometries[old].hash);if(selected===undefined){assert(familyByBatch.has(old),'Unauthorized geometry change for original batch '+old);assert.equal(candidates.length,1,'Ambiguous changed tissue batch '+old);selected=candidates[0];}used.add(selected);pairs.push({old,current:selected,...familyByBatch.get(old)});
  }assert.equal(used.size,current.index.batches.length,'No unaccounted batch may be added');assert.equal(pairs.find(p=>p.old===before.index.diverBatch)?.current,current.index.diverBatch,'Diver points to the same semantic batch after header insertion');
 });
 for(const p of pairs){const a=before.geometries[p.old],b=current.geometries[p.current];if(a.hash!==b.hash)report.changedGeometry.push({...p,before:a,current:b});const am=metadata(before.index.batches[p.old]),bm=metadata(current.index.batches[p.current]);if(!equal(am,bm))report.changedMetadata.push({...p,before:am,current:bm});}
 check('only reviewed foliose/fan geometries change within their explicit shared LOD envelopes',()=>{
  assert(report.changedGeometry.length>0);for(const p of pairs){const a=before.geometries[p.old],b=current.geometries[p.current];if(!p.family){assert.deepEqual(b,a,'Unaffected mesh '+p.old);assert.equal(current.index.batches[p.current].radius,before.index.batches[p.old].radius,'Unchanged culling radius '+p.old);continue;}const cap=BUDGETS[p.family][p.lod];assert(b.triangles<=cap.triangles&&b.bytes<=cap.bytes,p.family+'/'+p.lod+' explicit envelope');}
  for(const family of Object.keys(BUDGETS))for(const lod of ['high','middle','far']){const ids=pairs.filter(p=>p.family===family&&p.lod===lod).map(p=>p.current);assert(ids.length,'Actual '+family+'/'+lod+' population');assert.equal(new Set(ids.map(id=>current.geometries[id].hash)).size,1,'One shared '+family+'/'+lod+' geometry');assert.equal(new Set(ids.map(id=>current.index.batches[id].meshID)).size,1,'One streamed '+family+'/'+lod+' mesh');}
  report.geometryEnvelopes=BUDGETS;
 });
 const animals=new Set([...before.index.life,...before.index.decorLife,...before.index.shoal]);
 check('only exact bounded replay and the two authored deck poses change; all other actors stay exact',()=>{
  assert.equal(current.index.nodes.length,before.index.nodes.length);for(let id=0;id<before.index.nodes.length;id++){
   const a=before.index.nodes[id],b=current.index.nodes[id],r=replayByNode.get(id);if(r){assert(!animals.has(id),'Animal cannot be a growth exception');const result=validateActor(r,a,b,expectedActors.get(id),authored.get(id));if(result.changed)report.changedNodes.push(result);}else if(wreckAuthored.has(id)){assert(!animals.has(id));report.changedNodes.push({node:id,...validateWreckActor(wreckAuthored.get(id),a,b)});}else assert.deepEqual(b,a,'Unreceipted node change '+id);
  }return {replayed:replayByNode.size,changed:report.changedNodes.length};
 });
 check('every target has actual support references and visibility derives from their intervals',()=>{report.support=Array.from(replayByNode.values(),r=>validateSupport(r,current.index,entries));for(const [id,r] of limits){const actors=current.index.batches[id].instanceIDs.map(node=>replayByNode.get(node));assert(actors.every(Boolean));const cap=Math.min(...actors.map(a=>a.support.maxDistance));assert(Math.abs(r.to-cap)<1e-10,'Batch cap is exactly its tightest actor support '+id);}return {supports:report.support.length,limits:limits.size};});
 report.batchMapping=pairs;report.status=report.checks.every(c=>c.passed)?'passed-resource-contract':'failed';
}
try{if(process.argv.includes('--self-test'))selfTest();else main();}catch(error){report.status='failed';report.failure=error.stack;}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:report.checks,geometryChanges:report.changedGeometry.length,placementChanges:report.changedNodes.length,out},null,2));if(!report.status.startsWith('passed'))process.exitCode=1;
