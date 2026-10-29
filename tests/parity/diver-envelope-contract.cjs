/* Actual archived diver triangles, analytic all-phase bounds, and independent
 * CPU evaluation of the unchanged kind-5 shader. No whole-world build or GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback,flag=key=>process.argv.includes('--'+key),sha=data=>crypto.createHash('sha256').update(data).digest('hex'),plain=value=>JSON.parse(JSON.stringify(value)),bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const BASELINE='91848fdf1fae4338408ee1dcbfd05565b1c63832',BASELINE_ARCHIVE='38cdd35e63955d01b4d7b86916c7736a6fee28afe4b5ed3046c3c69d073b8d10',CENTERS=[-.8,-.4,0,.4,.8,1.2,1.6,2],RADII=[.550,.600,.555,.457,.505,.560,.683,.746],MARGIN=.00001;
const out=path.resolve(root,option('out','qa/parity/v01844-player-contact/diver-envelope.json')),report={status:'running',scope:'CPU archived/source mesh identity and conservative full-triangle animated envelope; no collision-solver, native-render, GPU, FPS or real-device acceptance',baselineRef:BASELINE,validatorSHA256:sha(fs.readFileSync(__filename)),checks:[]};
function check(name,run){try{const detail=run();report.checks.push({name,passed:true,detail});return detail;}catch(error){report.checks.push({name,passed:false,error:error.message});return null;}}
function historical(file){return cp.execFileSync('git',['show',BASELINE+':'+file],{cwd:root,maxBuffer:128*1024*1024});}
function archive(packed){const raw=zlib.gunzipSync(packed);assert.equal(raw.readUInt32LE(0),0x35424652);const start=8+raw.readUInt32LE(4);assert(start<=raw.length);return {raw,start,header:JSON.parse(raw.subarray(8,start)),sha256:sha(packed),bytes:packed.length};}
function meshAt(a,b){
 for(const key of ['vertexOffset','vertexFloats','indexOffset','indexCount'])assert(Number.isInteger(b[key])&&b[key]>=0,key);
 assert.equal(b.vertexFloats%12,0);assert.equal(b.indexCount%3,0);assert.equal(b.vertexOffset%4,0);assert.equal(b.indexOffset%4,0);
 const vb=a.start+b.vertexOffset,ib=a.start+b.indexOffset;assert(vb+b.vertexFloats*4<=a.raw.length&&ib+b.indexCount*4<=a.raw.length);
 return {vertices:new Float32Array(a.raw.buffer,a.raw.byteOffset+vb,b.vertexFloats),indices:new Uint32Array(a.raw.buffer,a.raw.byteOffset+ib,b.indexCount),radius:b.radius};
}
function meshSHA(m){return sha(Buffer.concat([bytes(m.vertices),bytes(m.indices)]));}
function meshEqual(a,b){assert(bytes(a.vertices).equals(bytes(b.vertices)),'Actual vertex words changed');assert(bytes(a.indices).equals(bytes(b.indices)),'Actual triangle indices changed');assert.equal(a.radius,b.radius,'Actual mesh radius changed');}
function exactWorld(a,b){assert.deepEqual(b.header,a.header,'World metadata/nodes/species/contacts/instanceIDs changed');assert(a.raw.subarray(a.start).equals(b.raw.subarray(b.start)),'A scene mesh changed');}
function vertex(m,id){assert(Number.isInteger(id)&&id>=0&&id*12+11<m.vertices.length);const k=id*12,p=[m.vertices[k],m.vertices[k+1],m.vertices[k+2]],tag=m.vertices[k+11];assert([...p,tag].every(Number.isFinite));return {id,p,tag};}
// Different from the shader evaluation below: this encloses ALL real times and
// swim in [0,1], without assuming that the hip and knee extrema coincide.
function interval(v){
 const [x,y,z]=v.p;let dy=0,zLow=z,zHigh=z;
 if(v.tag>9.5&&v.tag<12){const leg=Math.max(0,z-.38);dy=Math.sin(.2)*leg+.13*Math.max(0,z-1.03);zLow=.38+Math.cos(.2)*leg;zHigh=.38+leg;}
 if(v.tag>11.5&&v.tag<14)dy+=.014;
 return {x,y,z,dy,zLow,zHigh};
}
function boundAt(e,z){return Math.hypot(e.x,Math.abs(e.y)+e.dy,Math.max(Math.abs(e.zLow-z),Math.abs(e.zHigh-z)));}
function derive(m){
 const rows=CENTERS.map(z=>({z,triangles:0,maximum:0,restMaximum:0,witness:null,refs:new Set()})),assignments=new Uint8Array(m.indices.length/3),intervals=Array.from({length:m.vertices.length/12},(_,id)=>interval(vertex(m,id)));
 for(let offset=0;offset<m.indices.length;offset+=3){
  const ids=Array.from(m.indices.subarray(offset,offset+3)),radii=CENTERS.map(z=>Math.max(...ids.map(id=>boundAt(intervals[id],z))));
  // Assign the WHOLE triangle to the most compact sphere; never cover only
  // separately assigned vertices, whose triangle interior could escape.
  const bin=radii.reduce((best,r,i)=>r<radii[best]?i:best,0),row=rows[bin];assignments[offset/3]=bin;row.triangles++;
  for(const id of ids){row.refs.add(id);const v=vertex(m,id),e=intervals[id],r=boundAt(e,row.z);row.restMaximum=Math.max(row.restMaximum,Math.hypot(v.p[0],v.p[1],v.p[2]-row.z));if(r>row.maximum){row.maximum=r;row.witness={triangle:offset/3,vertex:id,tag:v.tag,p:v.p,interval:e};}}
 }
 for(const row of rows)row.recommendedRadius=Math.ceil((row.maximum+MARGIN)*1000)/1000;
 return {rows,assignments,intervals};
}
function proveProfile(profile,proof){
 assert.equal(profile.length,8);let corners=0;
 for(let bin=0;bin<8;bin++){
  const sphere=profile[bin],row=proof.rows[bin];assert.equal(sphere.z,CENTERS[bin]);assert(Number.isFinite(sphere.r)&&sphere.r>0);
  for(const id of row.refs){const r=boundAt(proof.intervals[id],sphere.z);assert(r+MARGIN<=sphere.r,'Analytic vertex '+id+' exceeds bin '+bin);corners++;}
 }
 return {uniqueVertexBinPairs:corners,triangles:proof.assignments.length,margin:MARGIN,proof:'For every phase and swim in [0,1], each actual triangle corner lies inside one assigned sphere. Every rasterized triangle is a convex combination of its three transformed vertices, so the entire triangle is inside that same convex sphere. Roll about local Z fixes all sphere centers; uniform scale and yaw/pitch carry spheres to world space.'};
}
function shaderSection(source){const start=source.indexOf(' if(uKind==5){\n if(aTag>9.5'),end=source.indexOf(' vRelative=p+aOffset;',start);assert(start>=0&&end>start,'Actual kind-5 GLSL seam missing');return source.slice(start,end);}
function swimUniform(source){const assignments=source.match(/this\.set1f\(p,'uSwim',[^;]+;/g)||[];assert.equal(assignments.length,1,'Exactly one swim uniform owner is required');return assignments[0];}
// Literal CPU interpretation of the pinned production shader, not a call to
// the collision implementation. Pitch/yaw below are actual displayed angles.
function shaderPoint(v,time,swim,roll,pose){
 let [x,y,z]=v.p;
 if(v.tag>9.5&&v.tag<12){const side=v.tag<10.5?1:-1,ang=Math.sin(time*2.45+side*1.5708)*(.045+.155*swim),leg=Math.max(0,z-.38);y+=Math.sin(ang)*leg;z=.38+Math.cos(ang)*leg;const knee=Math.max(0,z-1.03);y+=Math.sin(time*2.45+side*1.5708+.60)*knee*(.03+.10*swim);}
 if(v.tag>11.5&&v.tag<14)y+=Math.sin(time*.7+v.tag)*.014;
 const rx=x*Math.cos(roll)-y*Math.sin(roll),ry=x*Math.sin(roll)+y*Math.cos(roll);x=rx;y=ry;
 const pitch=-pose.pitch,py=y*Math.cos(pitch)+z*Math.sin(pitch),pz=-y*Math.sin(pitch)+z*Math.cos(pitch);y=py;z=pz;
 x*=pose.scale;y*=pose.scale;z*=pose.scale;const yaw=-pose.yaw,c=Math.cos(yaw),s=Math.sin(yaw);
 return [c*x+s*z+pose.p[0],y+pose.p[1],-s*x+c*z+pose.p[2]];
}
function sampledCoverage(m,proof,profile,volumes){
 const poses=[{p:[0,0,0],yaw:0,pitch:0,scale:1},{p:[-12,-8,14],yaw:.83,pitch:.42,scale:.85},{p:[267,-6710,-180],yaw:-2.2,pitch:-1.25,scale:.85}],rolls=[-Math.PI,-.09,0,.09,Math.PI/2],swims=[0,.5,1];
 let checked=0,minimumSlack=Infinity,maximumDistance=0;const stride=proof.rows.map(row=>Array.from(row.refs,v=>vertex(m,v)));
 for(const pose of poses){const spheres=plain(volumes(pose));assert.equal(spheres.length,8);
  for(let sample=0;sample<=48;sample++){
   // Both arm (.7) and leg (2.45) phase families complete integer cycles.
   const time=sample/48*(4*Math.PI/.7);
   for(const swim of swims)for(const roll of rolls)for(let bin=0;bin<8;bin++){
    const sphere=spheres[bin];assert(sphere.p.every(Number.isFinite)&&Number.isFinite(sphere.r));assert(Math.abs(sphere.r-profile[bin].r*pose.scale)<1e-12);
    for(const v of stride[bin]){const p=shaderPoint(v,time,swim,roll,pose),distance=Math.hypot(...p.map((n,i)=>n-sphere.p[i])),slack=sphere.r-distance;assert(slack>=-1e-9,'Actual shader vertex '+v.id+' escapes world sphere '+bin);minimumSlack=Math.min(minimumSlack,slack);maximumDistance=Math.max(maximumDistance,distance);checked++;}
   }
  }
 }
 return {positions:checked,phases:49,swim:swims,roll:rolls,poses,minimumSlack,maximumDistance,note:'CPU shader interpretation; analytic proof covers unsampled phases. No GPU precision or solver-sweep claim.'};
}
function accessoryLoop(source){const marker="for(const part of ['head','hair','cap','badge'])",start=source.indexOf(marker),end=source.indexOf('\n }',start);assert(start>=0&&end>start&&source.indexOf(marker,start+1)<0,'Actual unique underwater constructor seam missing');return source.slice(start,end);}
function accessoryFunction(source,name){const start=source.indexOf(' function '+name+'('),end=source.indexOf('\n function ',start+1);assert(start>=0&&end>start,'Actual ship '+name+' owner seam missing');return source.slice(start,end);}
function accessoryFixture(source,engine){
 const runtime={initialized:true,mode:null,underwater:[]},appearance={skin:'warm',hair:'dark',accessory:'cap'},context=vm.createContext({console,runtime,active:true,settings:{third:true},persistent:{seen:[0,1,2]},voyage:{state:{features:{expedition:{mail:{fixture:{status:'complete'}}}}}},state:()=>({appearance}),paint:()=>{throw Error('Hidden ship UI must not paint');}});
 vm.runInContext(engine,context,{filename:'actual-engine.js'});const index=vm.runInContext('indexGeometry',context);
 context.renderer={batch:(geometry,instances,kind,dynamic)=>({mesh:index(geometry.v),instances,kind,dynamic,material:geometry.material,visible:true})};
 for(const name of ['skins','hairs']){const declaration=source.match(new RegExp(' const '+name+'=.+;'));assert(declaration,'Actual '+name+' declaration missing');vm.runInContext(declaration[0],context);}
 vm.runInContext(accessoryLoop(source),context,{filename:'actual-ship-underwater-loop'});
 vm.runInContext(accessoryFunction(source,'accessoryAllowed')+'\n'+accessoryFunction(source,'afterCamera'),context,{filename:'actual-ship-afterCamera'});
 return {context,runtime,appearance,parts:runtime.underwater};
}
function accessoryOwner(fixture,pose,roll,accessory){
 fixture.appearance.accessory=accessory;const owner={p:pose.p.slice(),yaw:-pose.yaw,pitch:-pose.pitch,phase:roll,s:[pose.scale,pose.scale,pose.scale]};fixture.context.diverBatch={visible:true,instances:[owner]};vm.runInContext('afterCamera()',fixture.context);
 for(const {part,batch} of fixture.parts){const visible=part==='head'||part==='hair'||part===accessory;assert.equal(batch.visible,visible,'Accessory visibility differs from actual outfit');if(!visible)continue;assert.equal(batch.kind,5,'Underwater part must use the diver pitch/roll shader');assert(batch.dynamic);assert.equal(batch.material,0);assert.equal(batch.instances.length,1);const f=batch.instances[0];for(const field of ['p','yaw','pitch','s'])assert.deepEqual(Array.isArray(f[field])?Array.from(f[field]):f[field],owner[field],part+' does not follow body '+field);assert.equal(f.phase,roll,part+' does not follow body roll');assert.notEqual(f.p,owner.p,'Part position must not alias mutable body position');assert.notEqual(f.s,owner.s,'Part scale must not alias mutable body scale');}
}
function accessoryCoverage(fixture,profile,volumes){
 const poses=[{p:[0,0,0],yaw:0,pitch:0,scale:1},{p:[-12,-8,14],yaw:.83,pitch:.42,scale:.85},{p:[267,-6710,-180],yaw:-2.2,pitch:-1.25,scale:.85}],rolls=[-Math.PI,-.09,0,.09,Math.PI/2],proofs=new Map();
 const parts=fixture.parts.map(({part,batch})=>{for(let id=0;id<batch.mesh.vertices.length/12;id++)assert.equal(vertex(batch.mesh,id).tag,0,'Ship accessories must not acquire a kick/arm animation tag');const proof=derive(batch.mesh),detail=proveProfile(profile,proof);proofs.set(part,proof);return {part,kind:batch.kind,material:batch.material,meshSHA256:meshSHA(batch.mesh),vertices:batch.mesh.vertices.length/12,triangles:batch.mesh.indices.length/3,assignmentSHA256:sha(bytes(proof.assignments)),bins:proof.rows.map(row=>({z:row.z,triangles:row.triangles,maximum:row.maximum})),...detail};});
 let checked=0,minimumSlack=Infinity;
 for(const pose of poses)for(const roll of rolls)for(const outfit of ['cap','badge']){
  accessoryOwner(fixture,pose,roll,outfit);const spheres=plain(volumes(pose));
  for(const {part,batch} of fixture.parts){if(!batch.visible)continue;const f=batch.instances[0],actualPose={p:f.p,yaw:-f.yaw,pitch:-f.pitch,scale:f.s[0]},proof=proofs.get(part);
   for(let bin=0;bin<8;bin++)for(const id of proof.rows[bin].refs){const p=shaderPoint(vertex(batch.mesh,id),.64,1,f.phase,actualPose),slack=spheres[bin].r-Math.hypot(...p.map((n,i)=>n-spheres[bin].p[i]));assert(slack>=-1e-9,part+' vertex '+id+' escapes assigned world sphere '+bin);minimumSlack=Math.min(minimumSlack,slack);checked++;}
  }
 }
 return {parts,positions:checked,minimumSlack,poses,rolls,outfits:['cap','badge'],method:'Actual four-part constructor and afterCamera owner executed verbatim. Every complete triangle has one assigned sphere; tag zero removes limb deformation, and shared kind-5 roll/pitch/yaw carries the analytic local proof into world space. No ship/world build or GPU.'};
}
function speciesEvidence(){
 const world=fs.readFileSync(path.join(root,'src/world.js'),'utf8'),prior=historical('src/world.js').toString(),registry=s=>s.slice(s.indexOf('const SPECIES=['),s.indexOf('const LANDMARKS=['));assert(registry(world).length>100);assert.equal(registry(world),registry(prior),'Base species registry changed');
 const files=['fauna.js','cetaceans.js','abyss_fauna.js','trench_fauna.js','pelagic_life.js','reef_fauna.js','oarfish.js','frilled_shark.js','barreleye.js','tripod_fish.js','dumbo_octopus.js','abyss_community.js','barramundi.js'];
 for(const name of files)assert(fs.readFileSync(path.join(root,'src',name)).equals(historical('src/'+name)),'Species module changed: '+name);
 return {baseRegistrySHA256:sha(registry(world)),unchangedRegistrationFiles:files};
}
try{
 const baseline=archive(historical('assets/reef.mesh.gz')),current=archive(fs.readFileSync(path.resolve(root,option('archive','assets/reef.mesh.gz'))));assert.equal(baseline.sha256,BASELINE_ARCHIVE,'Wrong immutable baseline');
 const h=current.header,id=h.diverBatch,b=h.batches[id];assert(b&&b.kind===5&&b.material===11&&b.species===-1);const m=meshAt(current,b),prior=meshAt(baseline,baseline.header.batches[baseline.header.diverBatch]);
 report.archives={baseline:{sha256:baseline.sha256,bytes:baseline.bytes},current:{sha256:current.sha256,bytes:current.bytes},identityScope:'Archive header contains scene semantics, not generator fingerprints. All header fields and decoded geometry remain exact; legal source-input provenance updates in external reef-growth/index files are not treated as geometry changes.'};
 report.mesh={batch:id,nodeIDs:b.instanceIDs,vertices:m.vertices.length/12,triangles:m.indices.length/3,sha256:meshSHA(m),instance:b.instanceIDs.map(id=>h.nodes[id])};
 check('actual prior/current diver VB IB and complete world/node/species identity',()=>{meshEqual(prior,m);exactWorld(baseline,current);return {nodes:h.nodes.length,batches:h.batches.length,kind5Batches:h.batches.filter(b=>b.kind===5).length};});
 const context=vm.createContext({console});for(const name of ['engine.js','world.js','reef_detail.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
 check('single current diver constructor exactly matches real archived mesh without building world',()=>{const before=vm.runInContext('seed',context),made=vm.runInContext('indexGeometry(diverGeometry().v)',context);meshEqual(m,made);assert.equal(vm.runInContext('seed',context),before);return {meshSHA256:meshSHA(made),sceneBuild:false};});
 const engine=fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),section=shaderSection(engine);
 check('actual kind5 deformation transforms and bounded swim uniform unchanged from fixed v43 shader',()=>{const priorEngine=historical('src/engine.js').toString();assert.equal(section,shaderSection(priorEngine));const uniform=swimUniform(engine);assert.equal(uniform,swimUniform(priorEngine));assert.equal(uniform,"this.set1f(p,'uSwim',typeof player==='undefined'?.4:Math.min(1,Math.hypot(...player.velocity)/1.6));");return {shaderSectionSHA256:sha(section),engineSHA256:sha(engine),swimUniform:uniform,swimRange:[0,1],assumption:'Finite player velocity; the actual hypot/min uniform owner clamps every finite velocity magnitude into [0,1].'};});
 check('all fauna registration sources and base species remain unchanged',speciesEvidence);
 const proof=derive(m),recommended=proof.rows.map(({z,recommendedRadius:r})=>({z,r}));report.bins=proof.rows.map(({refs,...row})=>({...row,uniqueVertices:refs.size}));report.assignmentSHA256=sha(bytes(proof.assignments));
 check('actual whole-triangle analytic intervals derive the reviewed eight radii',()=>{assert.deepEqual(recommended,CENTERS.map((z,i)=>({z,r:RADII[i]})));assert.equal(proof.rows.reduce((sum,row)=>sum+row.triangles,0),m.indices.length/3);return proveProfile(recommended,proof);});
 check('actual leg vertices below .38 include shader clamp displacement',()=>{const under=[];for(let i=0;i<m.vertices.length/12;i++){const v=vertex(m,i);if(v.tag>9.5&&v.tag<12&&v.p[2]<.38){const e=interval(v);assert.equal(e.zLow,.38);assert.equal(e.zHigh,.38);under.push(v.id);}}assert(under.length>0);return {vertices:under.length,firstWitness:vertex(m,under[0])};});
 let profile=recommended,volumes=pose=>profile.map(s=>{const p=shaderPoint({p:[0,0,s.z],tag:0},0,0,0,pose);return {p,r:s.r*pose.scale};});
 if(!flag('derive')){
  const file=path.resolve(root,option('production','src/player_contact.js'));assert(fs.existsSync(file),'Production profile missing; use --derive for explicitly limited evidence');const source=fs.readFileSync(file,'utf8');vm.runInContext(source,context,{filename:file});const api=vm.runInContext('OceanDiverContact',context);
  check('production exports frozen exact profile and all assigned triangles remain covered',()=>{assert(Object.isFrozen(api)&&Object.isFrozen(api.profile)&&Array.from(api.profile).every(Object.isFrozen));assert.deepEqual(plain(api.profile),recommended);return {productionSHA256:sha(source),...proveProfile(api.profile,proof)};});profile=api.profile;volumes=pose=>api.volumes(pose);
 }
 check('independent actual shader CPU samples fit production world spheres across kick arms roll yaw pitch scale',()=>sampledCoverage(m,proof,profile,volumes));
 const ship=fs.readFileSync(path.join(root,'src/ship.js'),'utf8'),oldShip=historical('src/ship.js').toString(),accessories=accessoryFixture(ship,engine),oldAccessories=accessoryFixture(oldShip,engine);
 check('all four actual underwater attachment meshes stay byte-exact while kind5 fixes the transform',()=>{assert.deepEqual(accessories.parts.map(p=>p.part),['head','hair','cap','badge']);assert.equal(oldAccessories.parts.length,4);for(let i=0;i<4;i++){const a=accessories.parts[i],b=oldAccessories.parts[i];assert.equal(a.part,b.part);meshEqual(a.batch.mesh,b.batch.mesh);assert.equal(a.batch.kind,5);assert.equal(b.batch.kind,0);}return {shipSHA256:sha(ship),loopSHA256:sha(accessoryLoop(ship)),afterCameraSHA256:sha(accessoryFunction(ship,'afterCamera')),unchangedMeshes:accessories.parts.map(({part,batch})=>({part,sha256:meshSHA(batch.mesh),triangles:batch.mesh.indices.length/3}))};});
 check('actual head hair cap and badge full triangles share the body envelope and exact pose owner',()=>accessoryCoverage(accessories,profile,volumes));
 check('attachment validation rejects wrong kind stale phase and an escaping complete triangle',()=>{
  const pose={p:[4,-10,9],yaw:.75,pitch:.42,scale:.85},roll=.9;assert.throws(()=>accessoryOwner(oldAccessories,pose,roll,'cap'),/diver pitch\/roll shader/);
  const stale=accessoryFixture(ship.replace('f.phase=d.phase||0;','f.phase=0;'),engine);assert.throws(()=>accessoryOwner(stale,pose,roll,'cap'),/body roll/);
  const wrongKind=accessoryFixture(ship.replace('s:[.85,.85,.85]}],5,true)','s:[.85,.85,.85]}],0,true)'),engine);assert.throws(()=>accessoryOwner(wrongKind,pose,roll,'cap'),/diver pitch\/roll shader/);
  const m=accessories.parts[0].batch.mesh,changed={...m,vertices:new Float32Array(m.vertices)};changed.vertices[changed.indices[0]*12]=4;assert.throws(()=>proveProfile(profile,derive(changed)),/exceeds bin/);
  return {controls:4,legacyWrongKind:true,currentWrongKind:true,staleRoll:true,escapingTriangle:true};
 });
 check('validator rejects radius shrink mesh/index/species mutation and wrong transform signs',()=>{
  let controls=0;for(let bin=0;bin<8;bin++){const small=recommended.map(s=>({...s}));small[bin].r=proof.rows[bin].maximum-1e-6;assert.throws(()=>proveProfile(small,proof));controls++;}
  const changed={vertices:new Float32Array(m.vertices),indices:new Uint32Array(m.indices),radius:m.radius};changed.vertices[3]+=.01;assert.throws(()=>meshEqual(m,changed));controls++;
  changed.vertices=new Float32Array(m.vertices);changed.indices[0]=(changed.indices[0]+1)%(m.vertices.length/12);assert.throws(()=>meshEqual(m,changed));controls++;
  const wrong=plain(current.header);wrong.nodes[h.life[0]].species++;assert.throws(()=>exactWorld(current,{...current,header:wrong}));controls++;
  const pose={p:[4,-10,9],yaw:.75,pitch:.42,scale:.85},actual=plain(volumes(pose));let bad=0;
  for(let i=0;i<8;i++){const expected=shaderPoint({p:[0,0,profile[i].z],tag:0},0,0,1.2,pose);assert(Math.hypot(...expected.map((v,j)=>v-actual[i].p[j]))<1e-10);const flipped=shaderPoint({p:[0,0,profile[i].z],tag:0},0,0,0,{...pose,yaw:-pose.yaw,pitch:-pose.pitch});if(Math.hypot(...flipped.map((v,j)=>v-actual[i].p[j]))>.1)bad++;}assert(bad>=6);controls++;
  return {controls,radiusShrink:8,normalMutation:true,indexMutation:true,speciesMutation:true,signReversalWitnesses:bad};
 });
 report.status=report.checks.every(c=>c.passed)?flag('derive')?'passed-derived-envelope-production-pending':'passed-actual-diver-envelope-cpu':'failed';
}catch(error){report.status='error';report.error=error.stack;}
report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,...report.summary,failures:report.checks.filter(c=>!c.passed),error:report.error,out},null,2));if(!report.status.startsWith('passed-'))process.exitCode=1;
