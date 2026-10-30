/* Actual archived models + production construction/motion/save hooks. The
 * source-only mode appends the four new actors into their existing model
 * batches; a full scene rebuild makes that adapter unnecessary. No GPU. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),offset=8+raw.readUInt32LE(4),archive=JSON.parse(raw.subarray(8,offset)),plain=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function fixture(saved){
 let entropy=0;const storage=new Map(),header=plain(archive),c=vm.createContext({console,header,active:false,renderer:{},eye:[272,-62,-180],player:{p:[272,-62,-180],velocity:[0,0,0],yaw:0,pitch:0},t:0,modal:null,photoOpen:false,persistent:{photos:[]},voyage:{state:{features:saved||{},waypoint:null}},crypto:{getRandomValues(a){a[0]=[123456789,987654321][entropy++%2];return a;}},collide:p=>p,stopAuto(){},resetInput(){},nearestPathIndex:()=>0,document:{body:{classList:{remove(){}}}},$:()=>null,localStorage:{getItem:k=>storage.get(k)??null},oceanSaveGuard:{check(){},write:(k,v)=>storage.set(k,v)},diveSeconds:0,closePanel(){},toast(){}}),get=s=>vm.runInContext(s,c);
 for(const file of require('../../scene_inputs.cjs').MODULES)vm.runInContext(fs.readFileSync('src/'+file,'utf8'),c,{filename:file});
 get('OceanRockContact.install(header.rockContact);obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));const testBatches=header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>header.nodes[i])}));');
 const sourceOnly=!header.life.some(i=>header.nodes[i].slopeHabitat);
 if(sourceOnly)get('if(typeof FaunaWorldRules.appendSlopeActors==="function")for(const id of ["lionfish","longnose_butterfly"]){const sp=SPECIES.find(s=>s.id===id),original=life.find(f=>SPECIES[f.species].id===id),added=[];FaunaWorldRules.appendSlopeActors(sp,added);for(const b of testBatches)if(b.instances.includes(original))b.instances.push(...added);}');
 get('allLife=life.concat(decorLife);initializeIndividuals({batches:testBatches});');
 for(const name of ['player_contact','seasons','features'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
 get('const registered=[];const registration=oceanFeatures.register;oceanFeatures.register=function(module){registered.push(module);return registration(module)};');
 for(const name of ['encounters','ecology','expedition','navigation','deepsea'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
 get('for(const module of registered)if(module.id!=="encounters"){module.init=undefined;module.reset=undefined;}voyage.state.features=oceanFeatures.read(voyage.state.features);oceanEncounters.feature.init();');
 const voyage=fs.readFileSync('src/voyage.js','utf8');
 for(const [a,b]of [['const VOYAGE_KEY=','const voyage='],['function saveVoyage(){','function radio('],['function voyageDestination(','renderMap=function(){']])vm.runInContext(voyage.slice(voyage.indexOf(a),voyage.indexOf(b)),c,{filename:'voyage-production-seam'});
 get('voyage.state={...initialVoyage(),...voyage.state};voyage.storageLoaded=true;voyage.state.features.expedition.minute=540;oceanSeasons.sync(true);');
 const rows=()=>plain(get('life.filter(f=>f.slopeHabitat).map(f=>({uid:f.uid,species:SPECIES[f.species].id,habitat:f.slopeHabitat,slot:f.slopeSlot,home:f.home,center:f.center,phase:f.phase,orbit:f.orbit,radius:f.radius,s:f.s,bioSeed:f.bioSeed,present:f.encounterPresent,ecology:f.ecologyPresent}))'));
 return {c,get,rows,sourceOnly,storage,entropy:()=>entropy,dive:resume=>get('oceanFeatures.call("prepareDive",{resume:'+resume+'})')};
}
const checks=[];function check(name,fn){try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.stack});}}
const f=fixture();
check('ordinary daylight update contains a slope butterfly pair and one or two lionfish at their real depths',()=>{
 f.dive(false);f.get('updateLife(0)');const rows=plain(f.get('life.filter(f=>f.slopeHabitat&&f.encounterPresent!==false&&f.ecologyPresent!==false).map(f=>({species:SPECIES[f.species].id,p:f.p}))'));
 assert(rows.length>=3&&rows.length<=4,'Three to four real residents must be present through production prepareDive and updateLife');
 assert.equal(rows.filter(r=>r.species==='longnose_butterfly'&&r.p[1]<-55&&r.p[1]>-75).length,2);
 assert(rows.filter(r=>r.species==='lionfish'&&r.p[1]<-75&&r.p[1]>-110).length>=1);
});
let savedRows,savedFeatures;const proof=[];
check('new dives vary pocket/attendance and production save, continue, import and fresh reload retain arrangement',()=>{
 const first=f.rows();f.dive(false);savedRows=f.rows();assert.notDeepEqual(savedRows,first);
 assert(first.some(a=>savedRows.some(b=>a.uid===b.uid&&JSON.stringify(a.home)!==JSON.stringify(b.home))),'Different new dives must choose different homes');
 f.c.active=true;f.get('markPlace("mesophotic-slope")');assert.equal(f.get('voyage.state.waypoint'),'mesophotic-slope');
 assert.deepEqual(f.rows(),savedRows,'Marking the real chart destination does not rearrange fish');
 const saved=f.storage.get('return-blue.voyage.1');assert(saved);savedFeatures=JSON.parse(saved).features;
 f.dive(true);assert.deepEqual(f.rows(),savedRows);f.get('voyage.state=initialVoyage();loadVoyage();oceanFeatures.reset()');assert.deepEqual(f.rows(),savedRows);assert.equal(f.get('voyage.state.waypoint'),'mesophotic-slope');
 assert.deepEqual(fixture(savedFeatures).rows(),savedRows);assert.equal(f.entropy(),2);f.c.active=false;
});
check('32 saved seeds retain each habitat, paired motion and cover all pockets and both optional attendance states',()=>{
 const seen=new Map(f.rows().map(a=>[a.uid,new Set()])),attendance=new Set();
 for(let i=1;i<=32;i++){f.c.nextSeed=Math.imul(i,0x9e3779b9)>>>0;f.get('voyage.state.features.encounters.seed=nextSeed;voyage.state.features.encounters.protection={species:[],uids:[]};oceanFeatures.reset()');
  const rows=f.rows(),pair=rows.filter(a=>a.species==='longnose_butterfly'),lions=rows.filter(a=>a.species==='lionfish'&&a.present&&a.ecology);
  assert.equal(pair.length,2);assert(pair.every(a=>a.present&&a.ecology));assert.equal(pair[0].phase,pair[1].phase);assert(Math.abs(Math.hypot(...pair[0].home.map((v,k)=>v-pair[1].home[k]))-.64)<1e-9);assert(lions.length>=1&&lions.length<=2);attendance.add(lions.length);
  for(const a of rows)seen.get(a.uid).add(JSON.stringify(a.home));f.get('oceanFeatures.reset()');assert.deepEqual(f.rows(),rows);
 }
 for(const [uid,homes]of seen)assert.equal(homes.size,3,uid+' must use all certified pockets');assert.deepEqual([...attendance].sort(),[1,2]);assert.equal(f.entropy(),2);
});
check('legacy saves retain authored pockets and invalid arrangement versions are sanitized',()=>{
 const old=fixture({encounters:{schema:2,seed:987654321,protection:{species:[],uids:[]}}});const rows=old.rows();old.dive(true);assert.deepEqual(old.rows(),rows);assert.equal(old.entropy(),0);assert.equal(old.get('oceanEncounters.snapshot().slopeVersion'),0);
 for(const v of [null,-1,2,'1',true]){f.c.invalid=v;assert.equal(f.get('oceanEncounters.sanitize({schema:2,seed:123,slopeVersion:invalid}).slopeVersion'),0);}
});
check('existing individuals and geometry batches remain intact; new residents share their actual high/low models',()=>{
 const actors=f.get('life'),batches=f.get('testBatches');assert.equal(actors.filter(a=>a.slopeHabitat).length,4);assert.equal(new Set(actors.map(a=>a.uid)).size,actors.length);assert.equal(batches.length,archive.batches.length);
 for(const i of archive.life){const old=archive.nodes[i],now=actors.find(a=>a.uid===old.uid);assert(now);assert.deepEqual(plain(now.s),old.s);assert.equal(now.bioSeed,old.bioSeed);if(!old.slopeHabitat&&!f.get('oceanEncounters.rules.deepHabitats').some(d=>d.uid===old.uid))assert.deepEqual(plain(now.home),old.home);}
 for(const actor of actors.filter(a=>a.slopeHabitat)){const bs=batches.filter(b=>b.instances.includes(actor));assert.equal(bs.length,2);assert(bs.every(b=>b.instances.some(a=>a.species===actor.species&&!a.slopeHabitat)));assert.equal(bs[0].kind,actor.reefFish?1:8);}
});
check('both actual archived LODs fit independently derived all-phase animated body bounds',()=>{
 const engine=fs.readFileSync('src/engine.js','utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 for(const [a,b,sha]of [[' if(uKind==1){',' // Attached, asymmetric','938df843d8dc30e5702e3ceaf9625b43794158b297a54a4460eb36c66e279f94'],[' if(uKind==8){',' if(uKind==11){','2eafdba9fc8247abf96ed65a3f360363bc95ee32ac46b6ba21a1c4c464836484']])assert.equal(hash(engine.slice(engine.indexOf(a),engine.indexOf(b,engine.indexOf(a)))),sha,'Audited deformation changed; revise its continuous proof');
 for(const actor of f.get('life').filter(a=>a.slopeHabitat)){const d=f.get('FaunaWorldRules.slopeHabitats').find(d=>d.id===actor.slopeHabitat);let radius=0,vertices=0;
  for(const b of f.get('testBatches').filter(b=>b.instances.includes(actor))){const v=new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats);for(let k=0;k<v.length;k+=12){let x=Math.abs(v[k]),y=Math.abs(v[k+1]),z=Math.abs(v[k+2]);
    // Independent coordinate bounds: all sin/cos <=1, eff<=1, fin wear only
    // shrinks y. Pitch/yaw/bank preserve the sphere before positive scale.
    if(actor.reefFish){y*=actor.bioMorph[0]*Math.max(1,actor.bioMorph[2]);z=z*actor.bioMorph[1]+.096+.025*y+.0028;}
    else{z=(z+.035)*1.035;y+=.012*z;}
    radius=Math.max(radius,Math.hypot(x,y,z)*Math.max(...actor.s)+.012);vertices++;
   }}
  assert(radius<=d.bodyRadius,actor.uid+' animated mesh exceeds reserved body');f.c.actor=actor;assert(f.get('animalContactEnvelope(actor).radius')<=d.bodyRadius,actor.uid+' runtime contact exceeds reserved body');proof.push({uid:actor.uid,vertices,allPhaseBodyRadius:radius,reserved:d.bodyRadius});
 }
});
check('every complete trajectory and feeding envelope clears actual trench triangles, regional solids and real rocks',()=>{
 for(const d of f.get('FaunaWorldRules.slopeHabitats'))for(const home of d.homes)for(const offset of d.offsets){const p=home.map((v,k)=>v+offset[k]),radius=d.bodyRadius+Math.hypot(d.radius,d.radius*(d.species==='lionfish'?.52:.58),d.bob)+.04;f.c.point=p;f.c.fullRadius=radius;
  assert.equal(f.get('OceanTrench.groundContact(point,fullRadius)'),null,d.id+' continuous swept body reaches floor');assert.equal(f.get('OceanRegions.pointBlocked(point,fullRadius)'),false);assert.equal(f.get('OceanRockContact.overlaps(point,fullRadius)'),false);
 }
});
check('real updateLife preserves paired spacing and every posed full body across normal frames and time jumps',()=>{
 for(const time of [...Array.from({length:31},(_,i)=>i/30),30,120,600]){f.c.time=time;f.get('updateLife(time)');const pair=f.get('life').filter(a=>a.slopeHabitat==='slope-butterfly');assert(Math.abs(Math.hypot(...pair[0].p.map((v,k)=>v-pair[1].p[k]))-.64)<1e-7);
  for(const actor of f.get('life').filter(a=>a.slopeHabitat)){const d=f.get('FaunaWorldRules.slopeHabitats').find(d=>d.id===actor.slopeHabitat),reach=Math.hypot(d.radius,d.radius*(d.species==='lionfish'?.52:.58),d.bob);assert(Math.hypot(...actor.p.map((v,k)=>v-actor.home[k]))<=reach+1e-7);f.c.actor=actor;assert.equal(f.get('OceanTrench.groundContact(actor.p,animalContactEnvelope(actor).radius)'),null);}
 }
});
check('normal chart destination and a full-diver open-water approach reach both habitats without teleporting',()=>{
 const dest=f.get('voyageDestination("mesophotic-slope")');assert.equal(dest.name,'東岸微光岩坡');assert.equal(dest.y,-62);const scale=archive.nodes[archive.batches[archive.diverBatch].instanceIDs[0]].s[0];
 for(const d of f.get('FaunaWorldRules.slopeHabitats'))for(const home of d.homes){const target=[home[0]+2,home[1],home[2]],start=[target[0]+12,target[1]+10,target[2]],volumes=f.get('OceanDiverContact').volumes({p:target,yaw:Math.PI/2,pitch:0,scale});
  for(const body of volumes){f.c.a=body.p.map((v,k)=>v+start[k]-target[k]);f.c.b=body.p;f.c.r=body.r;assert.equal(f.get('OceanTrench.groundSweep(a,b,r)'),null,d.id+' diver floor approach');assert.equal(f.get('OceanRegions.segmentBlocked(a,b,r)'),false);assert.equal(f.get('OceanRockContact.segmentBlocked(a,b,r)'),false);}
 }
});
check('marked species protection retains the whole butterfly pair and mid-dive edits cannot reroll',()=>{
 const p=fixture();p.get('voyage.state.waypoint="habitat:longnose_butterfly"');p.dive(false);const pair=p.rows().filter(a=>a.species==='longnose_butterfly');assert.equal(pair[0].home[2],-180.32);assert.equal(pair[1].home[2],-179.68);
 const before=p.rows();p.get('voyage.state.waypoint=null');p.dive(true);assert.deepEqual(p.rows(),before);assert.equal(p.entropy(),1);
});
let feeding;check('real pointer feeding and the production afterLife/contact sequence keep fish inside certified slope volumes',()=>{
 const p=fixture();p.dive(false);p.c.active=true;
 p.get('persistent.seen=[];globalThis.blocked=(a,b,r=.13)=>!!OceanTrench.groundSweep(a,b,r)||OceanRegions.segmentBlocked(a,b,r)||OceanRockContact.segmentBlocked(a,b,r);updateLife(0);const fedActor=life.find(f=>f.slopeHabitat==="slope-butterfly");const focus=animalFocusPoint(fedActor);player.p=[focus[0]-.85,focus[1],focus[2]];eye=player.p.slice();renderer.canvas={getBoundingClientRect:()=>({left:0,top:0,width:640,height:480})};renderer.vp=mm(perspective(69*Math.PI/180,640/480,.05,950),lookAt(eye,focus));');
 assert.equal(p.get('oceanEcology.inRange(fedActor,true)'),true);assert.equal(p.get('oceanEcology.feedAt(fedActor,320,240)'),true);assert.equal(p.get('oceanEcology.snapshot().food'),1);
 const initial=p.get('fedActor.p.slice()');let maximumExcursion=0,atLimit=false;
 for(let i=1;i<=60;i++){p.c.time=i*.1;p.get('if(updateLifeWithEffects(time,updateLife,()=>oceanFeatures.call("afterLife",time)))oceanFeatures.call("afterLifeContact",time)');
  for(const actor of p.get('life').filter(a=>a.slopeHabitat)){const d=p.get('FaunaWorldRules.slopeHabitats').find(d=>d.id===actor.slopeHabitat),reach=Math.hypot(d.radius,d.radius*(d.species==='lionfish'?.52:.58),d.bob),distance=Math.hypot(...actor.p.map((v,k)=>v-actor.home[k]));assert(distance<=reach+1e-6,actor.uid+' food response escaped certified terrain clearance');p.c.actor=actor;assert.equal(p.get('OceanTrench.groundContact(actor.p,animalContactEnvelope(actor).radius)'),null);if(actor.uid===p.get('fedActor.uid')){maximumExcursion=Math.max(maximumExcursion,distance);if(Math.abs(distance-reach)<1e-5)atLimit=true;}}
 }
 assert(atLimit,'Actual food response must exercise the bounded habitat edge');assert(Math.hypot(...p.get('fedActor.p').map((v,k)=>v-initial[k]))>.01);feeding={frames:60,maximumExcursion,boundExercised:atLimit};
});
let cost;check('repeated arrangement replay performs no new slope safety queries or model construction',()=>{
 const rock=f.get('OceanRockContact'),before=rock.status().builds;rock.resetQueryStats();const start=performance.now();for(let i=0;i<10;i++)f.get('oceanEncounters.feature.reset()');const count=rock.status().queries;
 // Existing six deep residents perform <=18 queries/apply. Every slope pocket
 // was certified in the seed loop and must now use the static cache.
 assert(count<=180);assert.equal(rock.status().builds,before);cost={reset10Ms:performance.now()-start,rockQueries:count,geometryBuilds:rock.status().builds-before};
});
const report={passed:checks.filter(c=>c.passed).length,total:checks.length,sourceOnly:f.sourceOnly,archiveSHA256:crypto.createHash('sha256').update(fs.readFileSync('assets/reef.mesh.gz')).digest('hex'),proof,feeding,cost,checks};
const out=process.argv.find(s=>s.startsWith('--out='))?.slice(6);if(out){fs.mkdirSync(require('path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));if(checks.some(c=>!c.passed))process.exitCode=1;
