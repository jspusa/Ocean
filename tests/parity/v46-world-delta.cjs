/* The v46 exception is a fixed set of existing owners, not a new baseline.
 * This validates source ownership/unchanged world data. The separate compiled
 * branch-root fixture proves attachment/crown clearance; no spatial claim here. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const REF='5c43505718075b164e05039d3ad926df02d869b6',ARCHIVE_SHA='58e4ece5ba9755bad441d887f6786cbf1a8d00091c42393e595df0a4e81ae12c';
const ROOT_BATCHES=[209,210,211,212,213,214,215,216,217,233,234,235,236,237,238,239,240,241,269,270],DEEP_BATCHES=[465,466,469,470,471,472,483,484];
const plain=x=>JSON.parse(JSON.stringify(x));
function createContract({root,archive,meshAt,meshEqual,meshSHA,packedLayout}){
 const prior=archive(cp.execFileSync('git',['show',REF+':assets/reef.mesh.gz'],{cwd:root,maxBuffer:128*1024*1024}));assert.equal(prior.sha256,ARCHIVE_SHA,'Wrong frozen v45 bridge archive');
 const read=(file,old)=>old?cp.execFileSync('git',['show',REF+':'+file],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}):fs.readFileSync(path.join(root,file),'utf8');
 const context=old=>{const c=vm.createContext({console,SCULPTED_CORAL:JSON.parse(read('assets/coral_forms.json',old))});for(const f of ['engine','world','reef_detail','next_reef','individuals','open_world','fauna','cetaceans','abyss_fauna'])vm.runInContext(read('src/'+f+'.js',old),c,{filename:f+'.js'});return c;};
 const before=context(true),now=context(false),run=(c,source)=>vm.runInContext(source,c),owners=new Map(),centers=new Map();
 function add(expression,label,detail){const old=run(before,expression),g=run(now,expression),a=run(before,'indexGeometry')(old.v),b=run(now,'indexGeometry')(g.v),key=meshSHA(a);assert(!owners.has(key),'Duplicate constructor owner '+label);owners.set(key,{label,...detail,before:a,current:b,old,g});return {old,g,a,b};}
 for(const type of [0,1,2,8,9,10])for(const lod of ['high','middle','far']){
  for(const c of [before,now])run(c,'reefDetailLevel='+(lod==='high'?1:0));
  const expression=lod==='far'?`distantColony(${type})`:type>=9?`cauliflowerCoral(${type-9})`:`branchCoral(${type===8?3:type})`;
  const {old,g}=add(expression,'root/'+type+'/'+lod,{category:'root',type,lod});assert.deepEqual(plain(g.v.slice(0,old.v.length)),plain(old.v),'Root owner altered original crown '+expression);assert(g.v.length>old.v.length,'Root owner must add actual basal tissue');assert((g.v.length-old.v.length)/36<=(lod==='far'?288:72),'Root addition exceeds fixed geometry budget');
 }
 for(const [id,species]of [['coelacanth',27],['pelican_eel',29],['humpback_anglerfish',30]])for(const low of [false,true]){
  const {g,a,b}=add(`faunaGeometry('${id}',${low})`,'deep/'+id+'/'+(low?'low':'high'),{category:'deep',id,species,low});
  if(!low)centers.set(species,g.modelBounds.min.map((v,i)=>(v+g.modelBounds.max[i])*.5));
  if(species!==30){assert(b.vertices.byteLength+b.indices.byteLength<=a.vertices.byteLength+a.indices.byteLength,'Deep rewrite increases indexed geometry budget');assert(b.indices.length<=a.indices.length,'Deep rewrite increases triangle budget');}
  else{assert.equal(a.vertices.length,b.vertices.length);assert.deepEqual(Array.from(b.indices),Array.from(a.indices));for(let i=0;i<a.vertices.length;i++)if(i%12!==11)assert.equal(b.vertices[i],a.vertices[i],'Angler edit outside oral tag');else assert(b.vertices[i]===a.vertices[i]||a.vertices[i]===1&&b.vertices[i]===2,'Angler edit outside 1-to-2 oral tag');}
 }
 const expected=new Map(),rootNodes=new Map(),deepNodes=new Set();
 for(const [i,b]of prior.header.batches.entries()){
  const owner=owners.get(meshSHA(meshAt(prior,b)));if(!owner)continue;expected.set(i,owner);
  if(owner.category==='root')for(const node of b.instanceIDs){const family=owner.g.reefGrowth;if(rootNodes.has(node))assert.equal(rootNodes.get(node),family);rootNodes.set(node,family);}else for(const node of b.instanceIDs)deepNodes.add(node);
 }
 assert.deepEqual([...expected].filter(([,o])=>o.category==='root').map(([i])=>i),ROOT_BATCHES);assert.deepEqual([...expected].filter(([,o])=>o.category==='deep').map(([i])=>i),DEEP_BATCHES);assert.equal(rootNodes.size,473);assert.equal(deepNodes.size,8);
 const pose=n=>({p:n.p,s:n.s||[1,1,1],yaw:n.yaw||0,pitch:n.pitch||0}),without=(n,fields)=>{const copy={...n};for(const k of fields)delete copy[k];return copy;};
 function replayFor(current){
  const r=require('../../scene_inputs.cjs').verifyGrowthReplay(root);assert.equal(r.sceneArchiveSHA256,current.sha256,'Root replay does not own this candidate archive');assert.equal(r.failed.length,0);const map=new Map();for(const a of r.actors){assert(!map.has(a.node),'Duplicate replay node');map.set(a.node,a);}return map;
 }
 function validate(current){
  const a=prior.header,b=current.header;assert.equal(b.batches.length,a.batches.length);assert.equal(b.nodes.length,a.nodes.length);
  assert.deepEqual(without(b,['batches','nodes']),without(a,['batches','nodes']),'Unrelated world metadata or rock/contact authority changed');
  const oldBytes=packedLayout(prior),newBytes=packedLayout(current),replay=replayFor(current),changedNodes=[];
  for(let i=0;i<a.nodes.length;i++){
   const old=a.nodes[i],node=b.nodes[i];
   if(rootNodes.has(i)){
    assert.deepEqual(without(node,['p','yaw','pitch','reefGrowthFit']),without(old,['p','yaw','pitch','reefGrowthFit']),'Root node '+i+' changed outside its pose');
    const r=replay.get(i);assert(r&&r.family===rootNodes.get(i),'Root replay owner '+i);assert.deepEqual(r.from,pose(old),'Root replay original pose '+i);assert.deepEqual(r.to,pose(node),'Root replay final pose '+i);assert.deepEqual(node.reefGrowthFit||null,r.fit||null,'Root fit metadata differs '+i);
    assert(node.p.every(Number.isFinite)&&Number.isFinite(node.yaw||0)&&Number.isFinite(node.pitch||0),'Nonfinite root pose');const delta=node.p.map((v,k)=>v-old.p[k]);assert(Math.hypot(delta[0],delta[2])<=3.300001&&Math.abs(delta[1])<=2.500001,'Root pose exceeds fixed search limits');
    if(JSON.stringify(node)!==JSON.stringify(old)){assert(r.fit&&(r.fit.reason?.root||r.fit.reason?.crown),'Changed root lacks a fitting reason');changedNodes.push(i);}
   }else if(deepNodes.has(i)){
    assert.deepEqual(without(node,['modelCenter']),without(old,['modelCenter']),'Deep node '+i+' changed outside source-owned model center');assert.deepEqual(node.modelCenter,plain(centers.get(node.species)),'Deep model center differs from its high-LOD constructor');
   }else assert.deepEqual(node,old,'Unrelated node '+i+' changed');
  }
  const geometry=[];for(let i=0;i<a.batches.length;i++){
   const owner=expected.get(i),skip=['vertexOffset','indexOffset',...(owner?['vertexFloats','indexCount','radius']:[])];assert.deepEqual(without(b.batches[i],skip),without(a.batches[i],skip),'Batch '+i+' semantic metadata/LOD/instances changed');const m=meshAt(current,b.batches[i]);
   if(owner){meshEqual(m,owner.current);geometry.push({batch:i,owner:owner.label,meshSHA256:meshSHA(m),vertices:m.vertices.length/12,triangles:m.indices.length/3,radius:m.radius});}else try{meshEqual(meshAt(prior,a.batches[i]),m);}catch(e){throw Error('Unrelated batch '+i+': '+e.message);}
  }
  return {baselineRef:REF,baselineArchiveSHA256:prior.sha256,exactUnrelatedBatches:a.batches.length-expected.size,exactUnrelatedNodes:a.nodes.length-rootNodes.size-deepNodes.size,rootActors:rootNodes.size,deepActors:deepNodes.size,changedRootNodes:changedNodes,sourceOwnedGeometry:geometry,payloadByteDelta:newBytes-oldBytes,scope:'Exact unchanged world plus constructor-owned geometry and bounded replay-backed root poses. Attachment and crown clearance require the separate compiled branch-root-contact fixture.'};
 }
 function negativeControls(current){
  validate(current); // A failing positive fixture cannot make every mutation appear rejected.
  const corruptHeader=change=>{const h=plain(current.header);change(h);assert.throws(()=>validate({...current,header:h}));};
  const rootNode=[...rootNodes.keys()][0],deepNode=[...deepNodes][0];corruptHeader(h=>h.nodes[rootNode].p[0]+=.001);corruptHeader(h=>h.nodes[rootNode].bioGenes[0]+=.001);corruptHeader(h=>h.nodes[deepNode].home[0]+=.001);corruptHeader(h=>h.nodes[deepNode].modelCenter[0]+=.001);corruptHeader(h=>h.batches[ROOT_BATCHES[0]].maxDistance++);corruptHeader(h=>h.batches[DEEP_BATCHES[0]].instanceIDs.reverse());
  for(const i of [ROOT_BATCHES[0],DEEP_BATCHES[0]]){const raw=Buffer.from(current.raw),at=current.start+current.header.batches[i].vertexOffset,word=raw.readUInt32LE(at);raw.writeUInt32LE((word^1)>>>0,at);assert.throws(()=>validate({...current,raw}),'Unowned allowed geometry must fail');}
  return {controls:8,rootPoseReplay:1,rootGenes:1,deepHome:1,deepModelCenter:1,rootLOD:1,deepOwnership:1,unownedRootAndDeepMesh:2};
 }
 return {prior,validate,negativeControls};
}
module.exports={createContract};
