/* Actual compiled actors plus the boot-time reef expansion. Compare all motion
 * state with the frozen original, and count terrain/obstacle work whose result
 * updateLife does not use. CPU-only: no renderer or device FPS claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4))),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const refIndex=process.argv.indexOf('--individuals-ref'),ref=refIndex<0?null:process.argv[refIndex+1];
if(refIndex>=0&&!ref)throw Error('--individuals-ref requires a git revision');
const candidateSource=ref?cp.execFileSync('git',['show',ref+':src/individuals.js'],{cwd:root,encoding:'utf8'}):read('individuals');
function world(reference=false){
 const ctx=vm.createContext({console,header:JSON.parse(JSON.stringify(header)),active:false,player:{p:[0,-8,7],velocity:[0,0,0]}});
 for(const name of ['engine','world','reef_detail','next_reef'])vm.runInContext(read(name),ctx,{filename:name});
 vm.runInContext(reference?fs.readFileSync(path.join(__dirname,'fixtures/individuals-motion-v017.js'),'utf8'):candidateSource,ctx,{filename:'individuals'});
 for(const name of ['open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna'])vm.runInContext(read(name),ctx,{filename:name});
 vm.runInContext(`obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);
  const motionRenderer={batches:[],batch(g,instances){const b={instances};this.batches.push(b);return b;}};ensureReefFish(motionRenderer);initializeIndividuals(motionRenderer);`,ctx);
 return {ctx,step:vm.runInContext('updateLife',ctx),snapshot:()=>structuredClone(vm.runInContext('[allLife,shoal]',ctx))};
}
const original=world(true),candidate=world(),results=[];
function check(name,run){try{const evidence=run();results.push({name,pass:true,evidence});console.log('PASS '+name+(evidence?' '+JSON.stringify(evidence):''));}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+'\n'+error.message);}}
check('boot fixture includes the 64 reef fish before individual initialization',()=>{
 const counts=vm.runInContext('({allLife:allLife.length,reef:allLife.filter(f=>f.reefFish).length,reefBatches:motionRenderer.batches.length,shoal:shoal.length})',candidate.ctx);
 // A full bake now already contains the reef expansion. Boot must reuse it.
 assert.equal(counts.allLife,header.life.length+header.decorLife.length);assert.equal(counts.reef,64);assert.equal(counts.reefBatches,0);return counts;
});
check('all animal and shoal state is exact across forward, repeated and rewound time',()=>{
 const times=[0,.008,.016,.055,.25,1,8,19,120,600,7000,3,3];
 for(const time of times){original.step(time);candidate.step(time);assert.deepEqual(candidate.snapshot(),original.snapshot(),'motion state at '+time);}
 return {frames:times.length};
});
check('fixed-depth trajectories perform no discarded terrain queries',()=>{
 const result=vm.runInContext(`(()=>{const actors=allLife.filter(f=>!f.fauna&&f.species!==0&&f.fixedDepth!==undefined),ground=groundHeight;let calls=0;try{groundHeight=(...a)=>{calls++;return ground(...a);};for(const f of actors)for(const time of [8,8.055,7.945])animalTrajectory(f,time,[0,0,0]);return {actors:actors.length,calls};}finally{groundHeight=ground;}})()`,candidate.ctx);
 assert(result.actors>0);assert.equal(result.calls,0,'fixed-depth terrain calls');return result;
});
check('authored route, fixed-depth and reactive fauna changes retain exact state',()=>{
 for(const w of [original,candidate])vm.runInContext(`active=true;player.p=[-4,-9,20];player.velocity=[1,0,1];
  for(let i=0;i<allLife.length;i+=7){const f=allLife[i];f.partnerFinPulse=.8;f.radius*=.91;f.bioSeed+=33;if(!f.fauna){f.center[0]+=.17;if(i%2)f.fixedDepth=-12;else delete f.fixedDepth;}}
  for(let i=0;i<shoal.length;i+=7){shoal[i].phase+=.17;shoal[i].rad*=.91;shoal[i].bioSeed+=33;}`,w.ctx);
 for(const time of [21,21.008,2,2,140]){original.step(time);candidate.step(time);assert.deepEqual(candidate.snapshot(),original.snapshot(),'edited motion state at '+time);}
});
check('public full trajectory and explicit exhibit overrides retain exact poses',()=>{
 const run=w=>structuredClone(vm.runInContext(`allLife.map(f=>{const out=[0,0,0];if(f.fauna)faunaMotionPose(f,17,out,{exhibit:true,react:false,groundHeight:()=>-25,floorAt:()=>-25,ceilingAt:()=>-1,solids:[],obstacles:[]});else animalTrajectory(f,17,out);return {out,f};})`,w.ctx));
 assert.deepEqual(run(candidate),run(original));
});
check('the previous horizontal sample performs no discarded height or obstacle work',()=>{
 const result=vm.runInContext(`(()=>{const actors=allLife,ground=groundHeight,get=fishObstacleBuckets.get;let terrain=0,buckets=0;try{allLife=[actors.find(f=>!f.fauna&&f.species!==0&&f.fixedDepth===undefined)];groundHeight=(...a)=>{terrain++;return ground(...a);};fishObstacleBuckets.get=function(...a){buckets++;return get.apply(this,a);};updateLife(8);return {terrain,buckets};}finally{allLife=actors;groundHeight=ground;fishObstacleBuckets.get=get;}})()`,candidate.ctx);
 assert.equal(result.terrain,2,'only the current and next poses require vertical terrain');assert.equal(result.buckets,2,'only the current and next poses require vertical obstacle avoidance');return result;
});
console.log(JSON.stringify({scope:'Exact compiled actor state plus boot-time reef fish; CPU operation counts, not device frame time',passed:results.filter(r=>r.pass).length,total:results.length,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
