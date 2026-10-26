/* Compare real compiled-world motion against the frozen 0.17 implementation.
 * Operation counts target repeated invariant math, not device FPS or power. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4))),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
function world(reference=false,track=true){
 const math=Object.create(Math),calls={sin:0,cos:0},ctx=vm.createContext({console,Math:math,header:JSON.parse(JSON.stringify(header))});
 if(track)for(const name of ['sin','cos'])math[name]=(...a)=>{calls[name]++;return Math[name](...a);};
 for(const name of ['engine','world','reef_detail','next_reef'])vm.runInContext(read(name),ctx,{filename:name});
 vm.runInContext(reference?fs.readFileSync(path.join(__dirname,'fixtures/individuals-motion-v017.js'),'utf8'):read('individuals'),ctx,{filename:'individuals'});
 for(const name of ['open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world'])vm.runInContext(read(name),ctx,{filename:name});
 vm.runInContext('obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:[]});',ctx);
 return {ctx,calls,reset(){calls.sin=0;calls.cos=0;},step:vm.runInContext('updateLife',ctx),snapshot:()=>vm.runInContext('JSON.stringify([allLife,shoal])',ctx)};
}
const original=world(true),candidate=world();
const frames=[0,.008,.016,.055,.25,1,8,19,120,600,7000,3,3];let poses=0;
for(const time of frames){original.step(time);candidate.step(time);assert.equal(candidate.snapshot(),original.snapshot(),'exact pose/state at '+time);poses++;}
console.log('PASS compiled-world animal and shoal state exactly match at '+poses+' frame times');
// Changing authored inputs must invalidate per-animal cached values.
for(const w of [original,candidate])vm.runInContext('for(let i=0;i<shoal.length;i+=7){const f=shoal[i];f.phase+=.17;f.rad*=.91;f.bioSeed+=33;}',w.ctx);
for(const time of [21,21.008,2]){original.step(time);candidate.step(time);assert.equal(candidate.snapshot(),original.snapshot(),'authored parameter edit at '+time);}
console.log('PASS phase, radius and identity edits retain exact poses');
original.reset();candidate.reset();
for(let i=0;i<12;i++){original.step(30+i/120);candidate.step(30+i/120);}
const before=original.calls.sin+original.calls.cos,after=candidate.calls.sin+candidate.calls.cos;
console.log('sin/cos calls across 12 full-world updates: '+before+' -> '+after);
assert(after<before,'Full-world motion must reuse invariant trigonometry');
console.log('PASS full-world updates perform less invariant trigonometry with unchanged state');
if(process.argv.includes('--timings')){
 const worlds=[world(true,false),world(false,false)],samples=[[],[]];
 for(const w of worlds)for(let i=0;i<60;i++)w.step(50+i/120);
 for(let round=0;round<8;round++)for(const index of round%2?[1,0]:[0,1]){const started=performance.now();for(let i=0;i<30;i++)worlds[index].step(70+(round*30+i)/120);samples[index].push((performance.now()-started)/30);}
 const median=a=>a.sort((x,y)=>x-y)[a.length>>1];
 console.log('Native CPU full-world motion median ms/frame (not device FPS): '+median(samples[0]).toFixed(3)+' -> '+median(samples[1]).toFixed(3));
}
