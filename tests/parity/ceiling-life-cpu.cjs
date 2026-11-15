/* Repeatable CPU-only ceiling-ray A/B through the actual compiled animal world.
 * Only regions.js differs; both worlds use the current archive and other modules.
 * Timings are observations, never pass/fail thresholds or device FPS claims.
 * Run: node tests/parity/ceiling-life-cpu.cjs --before-ref=<commit-SHA>
 * Or:  node tests/parity/ceiling-life-cpu.cjs --before-source=<regions.js>
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),option=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const ref=option('before-ref'),sourcePath=option('before-source'),out=path.resolve(root,option('out')||'qa/parity/ceiling-life-cpu.json');
assert(!!ref!==!!sourcePath,'Provide exactly one explicit --before-ref=<commit-SHA> or --before-source=<regions.js>');
let before,baseline;
if(ref){
 assert(/^[a-f\d]{7,40}$/i.test(ref),'--before-ref must be an explicit commit SHA');
 const commit=cp.execFileSync('git',['rev-parse','--verify',ref+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
 before=cp.execFileSync('git',['show',commit+':src/regions.js'],{cwd:root,encoding:'utf8'});baseline={kind:'git',requested:ref,commit,path:'src/regions.js'};
}else{
 const filename=path.resolve(sourcePath);before=fs.readFileSync(filename,'utf8');baseline={kind:'source-file',path:filename};
}
const names=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community','rock_contact'];
const sources=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')])),after=sources.regions;
const indexBytes=fs.readFileSync(path.join(root,'assets/scene/index.json')),header=JSON.parse(indexBytes);
function world(source,hostMath){
 const ctx=vm.createContext({console,header:structuredClone(header),...(hostMath?{Math}:{})});
 for(const n of names)vm.runInContext(n==='regions'?source:sources[n],ctx,{filename:n+'.js'});
 vm.runInContext('OceanRockContact.install(header.rockContact);obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>header.nodes[i])}))});',ctx);
 return {step:vm.runInContext('updateLife',ctx),state:()=>vm.runInContext('JSON.stringify([allLife,shoal])',ctx),stats:vm.runInContext('OceanRockContact',ctx),actors:JSON.parse(vm.runInContext('JSON.stringify({animals:allLife.length,school:shoal.length})',ctx))};
}
const median=a=>a.slice().sort((a,b)=>a-b)[a.length>>1],rows=[];
for(const hostMath of [false,true]){
 const worlds={before:world(before,hostMath),after:world(after,hostMath)},samples={before:[],after:[]};
 assert.deepEqual(worlds.after.actors,worlds.before.actors,'actual archived actor inventory');
 for(let i=0;i<30;i++)for(const w of Object.values(worlds))w.step(10+i/60);
 assert.equal(worlds.after.state(),worlds.before.state(),'exact complete actor state after warmup');
 for(const w of Object.values(worlds))w.stats.resetQueryStats();
 for(let round=0;round<8;round++){
  for(const name of round%2?['after','before']:['before','after']){
   const w=worlds[name],start=performance.now();for(let i=0;i<60;i++)w.step(20+(round*60+i)/60);samples[name].push((performance.now()-start)/60);
  }
  assert.equal(worlds.after.state(),worlds.before.state(),'exact complete actor state at round '+round);
 }
 const contactWork=JSON.parse(JSON.stringify(worlds.after.stats.status()));
 assert.equal(JSON.stringify(contactWork),JSON.stringify(worlds.before.stats.status()),'timed contact work unchanged');
 for(const t of [17,17,600,7000,0]){for(const w of Object.values(worlds))w.step(t);assert.equal(worlds.after.state(),worlds.before.state(),'exact repeated/rewound complete actor state at '+t);}
 assert.equal(JSON.stringify(worlds.after.stats.status()),JSON.stringify(worlds.before.stats.status()),'contact work unchanged after repeated/rewound replay');
 const b=median(samples.before),a=median(samples.after),row={hostMath,actors:worlds.before.actors,samplesMsPerFrame:samples,beforeMedianMs:b,afterMedianMs:a,reductionPercent:(b-a)/b*100,contactWork,afterReplayContactWork:JSON.parse(JSON.stringify(worlds.after.stats.status())),stateSHA256:sha(worlds.after.state())};rows.push(row);console.log('PASS '+JSON.stringify(row));
}
const report={method:'CPU-only fresh before/after VM worlds; only regions.js is replaced from the explicit baseline. Both use the same current compiled scene index, modules, animal updates and contact owner. Per Math mode: 30 warmup updates, 8 alternating before/after rounds of 60 updates at 60 Hz virtual time, exact complete actor JSON after each round, then repeated/rewound 17, 17, 600, 7000, 0 replay and equal contact statistics. Both VM-default Math and explicit host Math are reported. Medians use the upper-middle sample. All timing samples are retained without thresholds; no rasterization, rendered FPS, physical-device or power claim.',baseline,regions:{before:{sha256:sha(before),bytes:Buffer.byteLength(before)},after:{path:'src/regions.js',sha256:sha(after),bytes:Buffer.byteLength(after)}},sceneIndex:{path:'assets/scene/index.json',sha256:sha(indexBytes),bytes:indexBytes.length},modules:names.map(n=>({path:'src/'+n+'.js',sha256:sha(sources[n])})),runtime:{node:process.version,platform:process.platform,arch:process.arch},rows};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('PASS exact full-world ceiling replay; report '+out);
