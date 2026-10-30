/* CPU acceptance of the CURRENT source and actual archived turtle contact
 * bounds. Run after a complete build; a stale archive must fail mesh identity.
 * No browser/GPU/build. --out=<path> saves success or failure evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const out=path.resolve(root,option('out','qa/parity/v01850-turtle-atlas/contact-bounds.json'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const plain=value=>JSON.parse(JSON.stringify(value));
const names=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community','rock_contact'];
const ARCHIVE='assets/reef.mesh.gz',FLOAT_TOLERANCE=1e-6,STROKE=Math.hypot(.37,.07);
// Historical clearance policy, NOT measurements of the new body. The actual
// new static/deformed extents are calculated from both archived indexed meshes.
const CONTACT_FLOOR=1.719214937115194,LEGACY_BODY_Y=.31,RADIAL_PAD=.012,VERTICAL_RADIAL_SHARE=.35;
// Full VS was independently audited in v49. Pinning it prevents an extra
// kind-2 bank/deformation/transform from silently invalidating this derivation.
const AUDITED_VS_SHA256='ae1804acfeedc3f8a0c02d71172e4ef4f5a331ef462b32c3715b11b295baf19b';
const expectedUIDs=Array.from({length:6},(_,i)=>'turtle-'+String(i+1).padStart(3,'0'));
const times=[...Array.from({length:601},(_,i)=>i/60),60,180,300,600,7000,0];
const report={status:'running',scope:'CPU current-source/archive identity, continuous all-phase radial/vertical bounds and actual six-turtle world routes. Not GPU, visual, full horizontal terrain-footprint, interaction-route or physical-device acceptance.',
 identifiers:{test:{path:path.relative(root,__filename),sha256:sha(fs.readFileSync(__filename))},sources:{}},checks:[],batches:[],
 policy:{contactRadiusMinimum:CONTACT_FLOOR,historicalBodyYMinimum:LEGACY_BODY_Y,radialPad:RADIAL_PAD,verticalRadialShare:VERTICAL_RADIAL_SHARE,stroke:STROKE,
  floatAttributeTolerance:FLOAT_TOLERANCE,indexTolerance:0,positiveAndNegativeVerticalMargin:'strictly > 0',routeFloorAndSurfaceGap:'>= 0',naturalPitchMaximum:.29,bankMaximum:.17,angleRoundoffTolerance:1e-12},
 derivation:{phase:'Tag 2: abs(dx)<=.07*w, abs(dy)<=.37*w; w=smoothstep(.51,1.45,abs(z)). All other turtle tags have w=0.',
  radial:'For every phase, pitch and yaw, norm(p+stroke)<=norm(p)+hypot(.37,.07)*w. Positive nonuniform scale is bounded by max(sx,sy,sz).',
  naturalPitch:'For every phase and pitch in [-.29,.29], abs(Y)<=abs(x)*sin(.29)+abs(y)+.37*w+.07*w*sin(.29).',
  anyPitch:'For every phase and every real pitch, abs(Y)<=hypot(abs(x)+.07*w,abs(y)+.37*w). This is stronger than the natural-route pitch interval.',
  transforms:'The pinned current VS applies pitch before instance scale; yaw leaves Y unchanged. World vertical bounds are [-localBound*sy,+localBound*sy]. Kind 2 has no bank or phenotype position transform.',
  triangles:'Each rendered triangle is a convex combination of its three deformed indexed corners. A common closed sphere and vertical slab containing all corners contain the whole triangle.',
  staticBody:'Static minima/maxima and witnesses are computed from the current archived indexed vertices; no prior audit body extrema or margins are reused.'}};
function check(name,run){
 try{const result=run();report.checks.push({name,passed:true,detail:result});console.log('PASS '+name);return result;}
 catch(error){report.checks.push({name,passed:false,error:error.message});throw error;}
}
function meshAt(raw,base,b){
 for(const field of ['vertexOffset','vertexFloats','indexOffset','indexCount'])assert(Number.isInteger(b[field])&&b[field]>=0,'Invalid '+field);
 assert.equal(b.vertexOffset%4,0);assert.equal(b.indexOffset%4,0);assert.equal(b.vertexFloats%12,0);assert.equal(b.indexCount%3,0);
 const vb=base+b.vertexOffset,ib=base+b.indexOffset;
 assert(vb+b.vertexFloats*4<=raw.length&&ib+b.indexCount*4<=raw.length,'Mesh outside archive payload');
 return {vertices:new Float32Array(raw.buffer,raw.byteOffset+vb,b.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+ib,b.indexCount),radius:b.radius};
}
function compareMesh(stored,current){
 assert.equal(stored.vertices.length,current.vertices.length,'Stale/different vertex count');
 assert(bytes(stored.indices).equals(bytes(current.indices)),'Stale/different actual triangle indices');
 let maximumAttributeDelta=0,changedFloatWords=0,witness=null;
 for(let k=0;k<stored.vertices.length;k++){
  const a=stored.vertices[k],b=current.vertices[k];assert(Number.isFinite(a)&&Number.isFinite(b),'Nonfinite attribute '+k);
  const delta=Math.abs(a-b);if(delta){changedFloatWords++;if(delta>maximumAttributeDelta){maximumAttributeDelta=delta;witness={vertex:Math.floor(k/12),attribute:k%12,stored:a,source:b};}}
  if(k%12===11)assert.equal(a,b,'Material/rig tag changed');
  assert(delta<=FLOAT_TOLERANCE,'Current source differs from archive at attribute '+k+': '+delta);
 }
 assert(Number.isFinite(stored.radius)&&Math.abs(stored.radius-current.radius)<=FLOAT_TOLERANCE,'Stale/different stored radius');
 const refs=new Set();for(const id of stored.indices){assert(id<stored.vertices.length/12,'Invalid index');refs.add(id);}
 assert.equal(refs.size,stored.vertices.length/12,'Unreferenced vertex makes all-vertex coverage ambiguous');
 return {actualVertexSHA256:sha(bytes(stored.vertices)),sourceVertexSHA256:sha(bytes(current.vertices)),indexSHA256:sha(bytes(stored.indices)),indicesByteExact:true,
  verticesByteExact:bytes(stored.vertices).equals(bytes(current.vertices)),maximumAttributeDelta,changedFloatWords,witness,
  actualRadius:stored.radius,sourceRadius:current.radius,radiusDelta:Math.abs(stored.radius-current.radius),referencedVertices:refs.size};
}
function boundsFor(mesh){
 const bounds={static:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},local:{radial:0,pitch29:0,anyPitch:0},witnesses:{}};
 for(let id=0;id<mesh.vertices.length/12;id++){
  const k=id*12,[x,y,z]=mesh.vertices.subarray(k,k+3),tag=mesh.vertices[k+11];
  const u=Math.max(0,Math.min(1,(Math.abs(z)-.51)/.94)),w=tag>1.5&&tag<2.5?u*u*(3-2*u):0;
  for(let axis=0;axis<3;axis++){bounds.static.min[axis]=Math.min(bounds.static.min[axis],mesh.vertices[k+axis]);bounds.static.max[axis]=Math.max(bounds.static.max[axis],mesh.vertices[k+axis]);}
  const values={radial:Math.hypot(x,y,z)+STROKE*w,pitch29:Math.abs(x)*Math.sin(.29)+Math.abs(y)+.37*w+.07*w*Math.sin(.29),anyPitch:Math.hypot(Math.abs(x)+.07*w,Math.abs(y)+.37*w)};
  for(const key of Object.keys(values))if(values[key]>bounds.local[key]){bounds.local[key]=values[key];bounds.witnesses[key]={vertex:id,p:[x,y,z],tag,wing:w};}
 }
 return bounds;
}
function evaluateHull(hull,scale,bounds){
 assert.equal(hull.kind,2);assert(scale.length===3&&scale.every(s=>Number.isFinite(s)&&s>0));
 assert(Number.isFinite(hull.radius)&&Number.isFinite(hull.vertical));
 const maximumScale=Math.max(...scale),radiusFloor=(CONTACT_FLOOR+STROKE)*maximumScale+RADIAL_PAD;
 const verticalFloor=(LEGACY_BODY_Y+STROKE)*maximumScale+radiusFloor*VERTICAL_RADIAL_SHARE;
 assert(hull.radius>=radiusFloor,'Historical radius clearance shrank');
 assert(hull.vertical>=verticalFloor,'Historical vertical/floor clearance shrank');
 const radialMargin=hull.radius-bounds.local.radial*maximumScale;assert(radialMargin>0,'All-phase radial bound escapes hull');
 const vertical={};for(const key of ['pitch29','anyPitch']){
  const extent=bounds.local[key]*scale[1],min=-extent,max=extent,belowMargin=min-(-hull.vertical),aboveMargin=hull.vertical-max;
  assert(belowMargin>0&&aboveMargin>0,key+' positive/negative vertical envelope is insufficient');
  vertical[key]={min,max,belowMargin,aboveMargin};
 }
 return {maximumScale,legacyMinimum:{radius:radiusFloor,vertical:verticalFloor},radialMargin,vertical};
}
function run(){
 const context=vm.createContext({console}),sources={},get=expression=>vm.runInContext(expression,context);
 check('load current production sources and guard the audited kind-2 rig',()=>{
  for(const name of names){const file='src/'+name+'.js',text=fs.readFileSync(path.join(root,file),'utf8');sources[name]=text;report.identifiers.sources[file]=sha(text);vm.runInContext(text,context,{filename:file});}
  const vs=get('VS');report.identifiers.vertexShaderSHA256=sha(vs);
  assert.equal(sha(vs),AUDITED_VS_SHA256,'Vertex shader changed: independently rederive the kind-2 contract before accepting it');
  assert(sources.individuals.includes('f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.29,.29)'),'Natural pitch policy changed');
  return {sourceCount:names.length,vertexShaderSHA256:sha(vs)};
 });
 const species=get('SPECIES'),turtleIDs=Array.from(species,(s,i)=>s.id==='turtle'?i:-1).filter(i=>i>=0);
 check('the turtle species owns the historical contact-radius floor',()=>{
  assert.equal(turtleIDs.length,1);const turtle=species[turtleIDs[0]];
  assert(Number.isFinite(turtle.contactRadius)&&turtle.contactRadius>=CONTACT_FLOOR,'Turtle contactRadius is absent or below the historical floor');
  report.species={index:turtleIDs[0],id:turtle.id,contactRadius:turtle.contactRadius};return report.species;
 });
 const archiveBytes=fs.readFileSync(path.join(root,ARCHIVE)),raw=zlib.gunzipSync(archiveBytes);
 report.identifiers.archive={path:ARCHIVE,sha256:sha(archiveBytes),bytes:archiveBytes.length};
 assert.equal(raw.readUInt32LE(0),0x35424652,'Unsupported archive format');
 const base=8+raw.readUInt32LE(4);assert(base<=raw.length);const header=JSON.parse(raw.subarray(8,base));
 assert(header.rockContact,'Actual archived rock catalogue is required');
 const batches=header.batches.map((b,id)=>({b,id})).filter(({b})=>b.kind===2);
 let meshes;
 check('both actual indexed LODs match current source before any contact acceptance',()=>{
  assert.equal(batches.length,2,'Exactly two turtle LOD batches required');
  batches.sort((a,b)=>(a.b.minDistance||0)-(b.b.minDistance||0));
  assert.equal(batches[0].b.minDistance||0,0);assert(batches[1].b.minDistance>0);
  assert.equal(batches[0].b.maxDistance,batches[1].b.minDistance,'LOD ownership boundary differs');
  const seed=get('seed'),made=get('[indexGeometry(turtleGeometry().v),indexGeometry(distantTurtle().v)]');assert.equal(get('seed'),seed,'Geometry changed population RNG');
  meshes=batches.map(({b,id},lod)=>{
   assert(b.dynamic&&b.material===5);assert.deepEqual(b.instanceIDs.map(i=>header.nodes[i]?.uid),expectedUIDs);
   assert(b.instanceIDs.every(i=>header.nodes[i].species===turtleIDs[0]),'Batch contains another species');
   const mesh=meshAt(raw,base,b),identity=compareMesh(mesh,made[lod]),bounds=boundsFor(mesh);
   report.batches.push({batch:id,lod:lod?'low':'high',vertexCount:mesh.vertices.length/12,triangleCount:mesh.indices.length/3,identity,bounds,instances:[]});return mesh;
  });
  assert.deepEqual(batches[0].b.instanceIDs,batches[1].b.instanceIDs,'LODs do not share the same six actors');
  return report.batches.map(({batch,lod,vertexCount,triangleCount,identity})=>({batch,lod,vertexCount,triangleCount,identity}));
 });
 context.header=header;context.qaTurtleSpecies=turtleIDs[0];
 get('OceanRockContact.install(header.rockContact);obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>header.nodes[i])}))});');
 const actors=get('life.filter(f=>f.species===qaTurtleSpecies)'),envelope=get('animalContactEnvelope'),floor=get('animalContactFloor'),contactProfile=get('f=>animalRockProfiles.get(f)');
 check('six initialized identities use actual LOD profiles and retain all-phase signed bounds',()=>{
  assert.equal(actors.length,6);assert.deepEqual(Array.from(actors,f=>f.uid),expectedUIDs);
  const profileRadius=Math.max(...meshes.map(m=>m.radius));
  for(const row of report.batches)for(const f of actors){
   const profile=contactProfile(f);assert(profile&&profile.kind===2);assert.equal(profile.radius,profileRadius,'Actor did not receive the actual maximum LOD profile');
   const hull=envelope(f),proof=evaluateHull(hull,Array.from(f.s),row.bounds);
   row.instances.push({uid:f.uid,scale:Array.from(f.s),phase:f.phase,profile:{radius:profile.radius,kind:profile.kind},hull:plain(hull),...proof});
  }
  return {actors:actors.length,lods:report.batches.length,minimumRadialMargin:Math.min(...report.batches.flatMap(b=>b.instances.map(i=>i.radialMargin))),
   minimumSignedAnyPitchMargin:Math.min(...report.batches.flatMap(b=>b.instances.flatMap(i=>[i.vertical.anyPitch.belowMargin,i.vertical.anyPitch.aboveMargin])))};
 });
 // Initialize identities/scales/contact profiles against the COMPLETE archive,
 // then run just the six independent turtle routes. No neighbour-avoidance
 // claim: updateLife/contactAnimal use the actual shared stone catalogue.
 get('allLife=life.filter(f=>f.species===qaTurtleSpecies);shoal.length=0;');
 const identities=new Map(Array.from(actors,f=>[f.uid,JSON.stringify({uid:f.uid,s:f.s,base:f.bioBaseScale,seed:f.bioSeed})]));
 const summaries=new Map(Array.from(actors,f=>[f.uid,{uid:f.uid,minPitch:Infinity,maxPitch:-Infinity,minBank:Infinity,maxBank:-Infinity,minCenterFloorGap:Infinity,minCenterSurfaceGap:Infinity,samples:0}]));
 const samples=[];
 check('actual six-turtle world routes retain floor/surface signs through 607 poses each',()=>{
  assert.equal(times.length,607);
  for(const time of times){context.updateLife(time);for(const f of actors){
   const hull=envelope(f),row=summaries.get(f.uid),floorY=floor(f,hull,f.p),floorGap=f.p[1]-floorY,surfaceGap=-.06-hull.vertical-f.p[1];
   assert(f.p.every(Number.isFinite)&&[f.pitch,f.bank,f.yaw,floorY,floorGap,surfaceGap].every(Number.isFinite),'Nonfinite actual route');
   assert(Math.abs(f.pitch)<=.29+1e-12&&Math.abs(f.bank)<=.17+1e-12,'Actual pose escaped the audited natural range');
   assert(floorGap>=0,f.uid+' below its production floor at '+time+': '+floorGap);
   assert(surfaceGap>=0,f.uid+' above the production surface limit at '+time+': '+surfaceGap);
   assert.equal(JSON.stringify({uid:f.uid,s:f.s,base:f.bioBaseScale,seed:f.bioSeed}),identities.get(f.uid),'Identity or physical scale changed');
   for(const batch of report.batches)evaluateHull(hull,Array.from(f.s),batch.bounds);
   row.minPitch=Math.min(row.minPitch,f.pitch);row.maxPitch=Math.max(row.maxPitch,f.pitch);row.minBank=Math.min(row.minBank,f.bank);row.maxBank=Math.max(row.maxBank,f.bank);
   if(floorGap<row.minCenterFloorGap){row.minCenterFloorGap=floorGap;row.floorWitness={time,p:Array.from(f.p),floorY};}
   if(surfaceGap<row.minCenterSurfaceGap){row.minCenterSurfaceGap=surfaceGap;row.surfaceWitness={time,p:Array.from(f.p)};}
   row.samples++;samples.push({time,uid:f.uid,p:Array.from(f.p),pitch:f.pitch,bank:f.bank,yaw:f.yaw});
  }}
  for(const row of summaries.values())assert.equal(row.samples,607);assert.equal(samples.length,3642);
  report.route={times,posesPerTurtle:times.length,totalPoses:samples.length,poseSequenceSHA256:sha(JSON.stringify(samples)),summaries:[...summaries.values()],
   scope:'Actual production updateLife/contactAnimal with complete archived rocks and initialized profiles; only unrelated actors/routes are omitted. Analytic bounds, not these route samples, establish continuous phase and pitch coverage.'};
  return report.route;
 });
 check('source and actual archive identities remain unchanged throughout acceptance',()=>{
  for(const [file,hash]of Object.entries(report.identifiers.sources))assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,'Source changed during acceptance: '+file);
  assert.equal(sha(fs.readFileSync(path.join(root,ARCHIVE))),report.identifiers.archive.sha256,'Archive changed during acceptance');
  assert.equal(sha(fs.readFileSync(__filename)),report.identifiers.test.sha256,'Test changed during acceptance');
  return {sources:names.length,archiveSHA256:report.identifiers.archive.sha256};
 });
 report.status='passed-current-source-archive-contact-bounds';
}
try{run();}catch(error){
 report.status='failed-contact-bounds';report.error=error.message;process.exitCode=1;
 if(!report.checks.some(c=>!c.passed))report.checks.push({name:'acceptance execution',passed:false,error:error.message});
 console.error('FAIL '+error.message);
}
report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length,completed:report.status==='passed-current-source-archive-contact-bounds'};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,...report.summary,report:out}));
