/* CPU-only public pose/interaction regression against the shipped 0.18.4 source.
 * Actual catalogue geometry and compiled actors; explicitly isolated mutable
 * obstacle/terrain and contact fixtures. Counts are operations, not device FPS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),baseline='152a69c',read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),frozen=n=>cp.execFileSync('git',['show',baseline+':src/'+n+'.js'],{cwd:root,encoding:'utf8'}),plain=x=>JSON.parse(JSON.stringify(x));
const sourceRef=process.argv.indexOf('--source-ref'),candidate=n=>sourceRef<0?read(n):cp.execFileSync('git',['show',process.argv[sourceRef+1]+':src/'+n+'.js'],{cwd:root,encoding:'utf8'});
const header=JSON.parse(fs.readFileSync(path.join(root,'assets/scene/index.json'),'utf8')),results=[];
function check(name,run){try{const evidence=run();results.push({name,pass:true,evidence});console.log('PASS '+name+(evidence?' '+JSON.stringify(evidence):''));}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+'\n'+error.message);}}
function catalogue(ctx,reference){for(const n of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world'])vm.runInContext(read(n),ctx,{filename:n});vm.runInContext(reference?frozen('individuals'):candidate('individuals'),ctx,{filename:'individuals'});for(const n of ['pelagic_life','reef_fauna'])vm.runInContext(read(n),ctx,{filename:n});}
function motion(reference){
 const ctx=vm.createContext({console});catalogue(ctx,reference);
 const actors=plain(header.life.map(i=>header.nodes[i]).filter(f=>f.abyss));
 ctx.actors=actors;ctx.counts={envelope:0,queries:0,floor:0,roof:0};
 vm.runInContext(`
  const regionSolid=()=>({min:[-154,-85,-299],max:[-153,-65,-298]});
  function regionWorld(mutable=false,boxes=[regionSolid()]){
   const solids=mutable?boxes:Object.freeze(boxes.map(b=>Object.freeze({min:Object.freeze(b.min),max:Object.freeze(b.max)})));
   const world={solids,nearbySolids(p,r){counts.queries++;return solids.filter(b=>p.every((n,i)=>n>=b.min[i]-r&&n<=b.max[i]+r));},ceilingAt(){counts.roof++;return 0;}};
   return mutable?world:Object.freeze(world);
  }
  var OceanRegions=regionWorld();
  groundHeight=(x,z)=>{counts.floor++;return -96+Math.sin(x*.07)*.1+Math.cos(z*.04)*.1;};
 `,ctx);
 vm.runInContext('const originalEnvelope=abyssEnvelope;abyssEnvelope=function(f){counts.envelope++;return originalEnvelope(f);};',ctx);
 return {ctx,actors,run(code){return vm.runInContext(code,ctx);},snapshot(){return plain(actors);},step(t,context){ctx.sampleTime=t;ctx.sampleContext=context;vm.runInContext('for(const f of actors)faunaMotionPose(f,sampleTime,f.p,sampleContext);',ctx);}};
}
const original=motion(true),current=motion(false);
function pair(code){for(const w of [original,current])w.run(code);}
function equalPoses(times,contextFactory){for(const t of times){for(const w of [original,current])w.step(t,contextFactory?.(w));assert.deepEqual(current.snapshot(),original.snapshot(),'complete actor state at '+t);}}
check('all actual compiled abyss actors retain exact complete state through random-access time',()=>{assert.equal(current.actors.length,9);equalPoses([0,.016,.055,1,8,120,7000,3,3]);return {actors:current.actors.length,frames:9};});
check('warm public poses remove repeated envelope and obstacle queries but retain every terrain sample',()=>{
 pair('counts.envelope=counts.queries=counts.floor=counts.roof=0');equalPoses([7,7.016,7.032,7.048]);
 const before=plain(original.ctx.counts),after=plain(current.ctx.counts);
 assert.equal(before.envelope,108);assert.equal(before.queries,108);assert.equal(after.envelope,0);assert.equal(after.queries,0);assert.equal(after.floor,before.floor);assert.equal(after.roof,before.roof);return {before,after};
});
check('in-place home, scale, radius, model bounds and motion-profile edits invalidate static paths',()=>{
 const changes=['for(const f of actors)f.home[0]+=.17','for(const f of actors)f.home[1]-=.09','for(const f of actors)f.home[2]-=.23','for(const f of actors)f.s[0]*=.95','for(const f of actors)f.radius*=.8','for(const sp of ABYSS_SPECIES)sp.motionProfile.radius*=.7','for(const sp of ABYSS_SPECIES)sp.motionProfile.bob+=.07','for(const sp of ABYSS_SPECIES)sp.modelBounds.min[0]-=.03','for(const sp of ABYSS_SPECIES)sp.modelBounds.min[1]-=.03','for(const sp of ABYSS_SPECIES)sp.modelBounds.min[2]-=.03','for(const sp of ABYSS_SPECIES)sp.modelBounds.max[0]+=.02','for(const sp of ABYSS_SPECIES)sp.modelBounds.max[1]+=.02','for(const sp of ABYSS_SPECIES)sp.modelBounds.max[2]+=.02','for(const sp of ABYSS_SPECIES)sp.traits.motion=sp.traits.motion===\'crawl\'?\'hover\':\'crawl\''];
 for(const change of changes){pair(change);equalPoses([17,17.016]);}return {edits:changes.length,frames:changes.length*2};
});
check('time-dependent inputs and habitat floor/ceiling remain live after a path is cached',()=>{
 pair('for(const f of actors){f.phase+=.7;f.homeYaw-=.4;f.habitatFloor-=.2;f.habitatCeiling-=.1;}for(const sp of ABYSS_SPECIES){sp.motionProfile.speed*=1.2;sp.motionProfile.beat+=.3;}');equalPoses([18,180,1]);
 pair('groundHeight=(x,z)=>-74+Math.sin(x*.3);OceanRegions=regionWorld(false,[{min:[-156,-100,-310],max:[-148,-65,-280]}]);');equalPoses([18,19]);
});
check('explicit mutable contexts, empty solid overrides and exhibits retain reference behavior',()=>{
 const boxes=[{min:[-157,-100,-304],max:[-151,-60,-278]}],context={solids:boxes,groundHeight:()=>-100,ceilingAt:()=>-40};
 equalPoses([1,14],()=>context);boxes[0].min[0]=-100;boxes[0].max[0]=-90;equalPoses([14,15],()=>context);
 context.solids=[];equalPoses([14,14],()=>context);context.exhibit=true;equalPoses([2,20,2],()=>context);
});
check('mutable default worlds do not reuse stale solids or query implementations',()=>{
 pair('OceanRegions=regionWorld(true);');equalPoses([24]);pair('OceanRegions.solids.push({min:[-157,-100,-310],max:[-148,-60,-278]});');equalPoses([24]);
 pair('OceanRegions.solids[1].min[0]=-110;OceanRegions.solids[1].max[0]=-100;');equalPoses([24]);pair('OceanRegions.nearbySolids=()=>[];');equalPoses([24]);
});
check('shallow-frozen solid arrays cannot hide mutable box bounds from invalidation',()=>{
 pair('OceanRegions=regionWorld(true,[{min:[-157,-100,-310],max:[-148,-60,-278]}]);Object.freeze(OceanRegions.solids);Object.freeze(OceanRegions);');equalPoses([25]);
 pair('OceanRegions.solids[0].min[0]=-110;OceanRegions.solids[0].max[0]=-100;');equalPoses([25]);
});
check('changed species and centre fallback preserve the same public pose fields',()=>{
 pair('for(const f of actors){f.center=f.home.slice();delete f.home;}actors[0].species=actors[1].species;OceanRegions=regionWorld();');equalPoses([25,25.02]);
 pair('for(const f of actors){f.radius=NaN;f.center[0]+=.03;}');equalPoses([26,26.02]);
});
check('warm exhibit poses preserve the real late-loaded region fallback and explicit overrides',()=>{
 // A fresh process preserves the actual module-loading/JIT order. Recompiling
 // a new VM script per frame can mask an early missing-global lookup.
 const filename=path.join(root,'tests/parity/abyss-motion.cjs'),reference=sourceRef<0?null:process.argv[sourceRef+1];
 const script=`const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),Module=require('node:module');
  const filename=${JSON.stringify(filename)},root=${JSON.stringify(root)},reference=${JSON.stringify(reference)};
  globalThis.__testedMotionSource=reference?cp.execFileSync('git',['show',reference+':src/individuals.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'src/individuals.js'),'utf8');
  const source=fs.readFileSync(filename,'utf8').replace("fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')","(n==='individuals'?globalThis.__testedMotionSource:fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'))");
  const test=new Module(filename,module);test.filename=filename;test.paths=Module._nodeModulePaths(path.dirname(filename));test._compile(source,filename);`;
 const result=cp.spawnSync(process.execPath,['-e',script],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,(result.stdout||'')+(result.stderr||''));assert.match(result.stdout,/9 abyss motion checks passed/);return {realRegionChecks:9};
});
function ecology(reference){
 const elements=new Map(),classes=()=>({add(){},remove(){},toggle(){},contains(){return false;}}),element=()=>({style:{},dataset:{},classList:classes(),setAttribute(){},addEventListener(){},querySelectorAll(){return[];},appendChild(e){if(e.id)elements.set(e.id,e);}});
 const document={createElement:element,getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll:()=>[],body:element()};
 let feature,stored,saves=0,foodBatch;
 const counts={traits:0,foodWrites:0},ctx=vm.createContext({console,active:true,modal:null,photoOpen:false,focusFish:null,focusSeconds:0,focusId:null,follow:null,auto:false,settings:{hints:true},matchMedia:()=>({matches:false}),eye:[0,-5,0],player:{p:[0,-5,0],yaw:0,pitch:0,velocity:[0,0,0]},persistent:{seen:[]},voyage:{state:{},sessionDistance:0},document,blocked:()=>false,saveVoyage:()=>saves++,toast(){},releaseMouseLook(){},stopAuto(){},dir:()=>[0,0,-1],keys:new Set(),stick:[0,0],verticalInput:0,collide:p=>p,updatePlayer(){},shipCamera(){},renderSpecies(){},oceanFeatures:{register:m=>feature=m,state:()=>stored,pointerCaptured:()=>false,addMenu(){}}});
 ctx.renderer={canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1000,height:700}),addEventListener(){}},fov:69,batch(g,instances){foodBatch={instances,visible:true};for(const f of instances){let p=f.p;Object.defineProperty(f,'p',{enumerable:true,get:()=>p,set:v=>{counts.foodWrites++;p=v;}});}return foodBatch;}};
 elements.set('ocean',ctx.renderer.canvas);catalogue(ctx,reference);vm.runInContext(read('selection'),ctx);vm.runInContext(reference?frozen('ecology'):candidate('ecology'),ctx,{filename:'ecology'});
 const api=vm.runInContext('oceanEcology',ctx),actors=vm.runInContext('life',ctx),selection=vm.runInContext('oceanSelection',ctx);stored=feature.initial();
 actors.push(...plain(header.life.map(i=>header.nodes[i])));feature.init();
 ctx.counts=counts;vm.runInContext('const originalTraits=speciesTraits;speciesTraits=function(...args){counts.traits++;return originalTraits(...args);};groundHeight=()=>-20;renderer.vp=mm(perspective(69*Math.PI/180,1000/700,.1,1000),lookAt(eye,V.add(eye,[0,0,-1])));',ctx);
 const food=actors.find(f=>f.species===0),dolphin=actors.find(f=>f.species===11);food.p=[0,-5,-2];dolphin.p=[0,-5,-3];
 return {ctx,api,feature,actors,food,dolphin,selection,counts,get state(){return stored;},step:t=>api.afterLife(t),snapshot:()=>plain({actors,state:stored,runtime:api.snapshot(),foodNodes:foodBatch.instances,foodVisible:foodBatch.visible,saves})};
}
const oldEcology=ecology(true),newEcology=ecology(false);
function sameEcology(times){for(const t of times){oldEcology.step(t);newEcology.step(t);assert.deepEqual(newEcology.snapshot(),oldEcology.snapshot(),'complete ecology actor/state/node output at '+t);}}
check('idle public afterLife removes the no-food scan and already-hidden particle writes',()=>{
 sameEcology([0,.016,.032,.048]);const before=plain(oldEcology.counts),after=plain(newEcology.counts);assert.equal(before.traits,301*4);assert.equal(before.foodWrites,48*4);assert.equal(after.traits,0);assert.equal(after.foodWrites,0);return {actors:301,frames:4,before,after};
});
check('food clouds and return-to-route reactions keep exact actors, particles and saved state',()=>{
 for(const w of [oldEcology,newEcology])assert(w.api.feedAt(w.food,500,350));sameEcology([.1,.2,1,7,7.1]);
 for(const w of [oldEcology,newEcology]){w.food.p=[0,-5,-2];assert(w.api.feedAt(w.food,500,350));}sameEcology([7.2,7.5,8.1,9,15.2]);
 for(let i=0;i<25;i++){for(const w of [oldEcology,newEcology])w.food.p=[0,-5,-2];sameEcology([15.3+i*.1]);}
});
check('endDive and reset still clear previously visible food particles on the next pose update',()=>{
 for(const w of [oldEcology,newEcology]){w.food.p=[0,-5,-2];assert(w.api.feedAt(w.food,500,350));}sameEcology([18]);
 for(const w of [oldEcology,newEcology])w.feature.endDive();sameEcology([18.1,18.2]);
 for(const w of [oldEcology,newEcology]){w.step(30);w.food.p=[0,-5,-2];assert(w.api.feedAt(w.food,500,350));}sameEcology([30.1]);
 for(const w of [oldEcology,newEcology])w.feature.reset();sameEcology([30.2,30.3]);
});
check('food-free touch reactions and following partners still execute every public update',()=>{
 for(const w of [oldEcology,newEcology]){w.food.p=[0,-5,-2];w.api.setTool('pet');assert(w.selection.select(w.food.uid,'fixture-pointer'));assert(w.api.beginGesture(500,350));}sameEcology([30.4]);
 for(const w of [oldEcology,newEcology])assert.equal(w.api.endGesture(),false);
 for(const w of [oldEcology,newEcology])assert(w.api.beginGesture(500,350));sameEcology([30.5]);for(const w of [oldEcology,newEcology])assert(w.api.endGesture());sameEcology([30.6,30.7,31,33]);
 for(const w of [oldEcology,newEcology]){w.dolphin.p=[0,-5,-3];w.state.individuals[w.dolphin.uid]={trust:24,seconds:6,strokes:0,feeds:0};assert(w.api.befriend(w.dolphin.uid));}sameEcology([34,34.02,34.04,34.06,35]);
 assert(newEcology.api.snapshot().partnerPosition);assert.notEqual(newEcology.food.pitch,0);
});
console.log(JSON.stringify({baseline,scope:'CPU public state equivalence and operation counts only; no frame-time or device claim',passed:results.filter(r=>r.pass).length,total:results.length,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
