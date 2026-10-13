const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ids=['clown','tang','butterfly','idol','sergeant','chromis','parrot','wrasse','turtle','ray','whale','dolphin','pygmy_seahorse','cinderella_slug','garden_eel','pistol_shrimp','frogfish','lionfish','cuttlefish','nautilus'];
const sizes=[...Array(12).fill(1),.024,.065,.4,.028,.2,.28,.45,.22];
const ctx=vm.createContext({console,Math,SPECIES:ids.map((id,i)=>({id,size:sizes[i]})),allLife:[],shoal:[],obstacles:[],buildReef(){},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),smooth01:x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},mix:(a,b,t)=>a+(b-a)*t,active:false});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/individuals.js'),'utf8'),ctx);
const pose=ctx.faunaMotionPose;
function actor(i){return {uid:ids[i]+'-001',species:i,fauna:true,home:[20,-8,15],center:[20,-8,15],homeYaw:.4,floorOffset:0,p:[20,-8,15],s:[sizes[i],sizes[i],sizes[i]],phase:.6,bob:.6,radius:i<17?.08:.5};}
const plain=x=>JSON.parse(JSON.stringify(x));let passed=0;function check(label,fn){fn();passed++;console.log('PASS '+label)}
check('public fauna pose seam exists',()=>assert.equal(typeof pose,'function'));
check('attached sea horse keeps its anchor and exact body size across repeated updates',()=>{const f=actor(12),before=plain({s:f.s,home:f.home,uid:f.uid});for(let t=0;t<90;t+=.17){pose(f,t,f.p,{react:false});assert.deepEqual(f.p,f.home);assert.equal(f.faunaVisibility,1);}assert.deepEqual(plain({s:f.s,home:f.home,uid:f.uid}),before);assert.equal(f.s[0],.024)});
check('reef crawlers stay supported and bounded instead of inheriting a swimming orbit',()=>{for(const i of [13,16]){const f=actor(i),points=[];for(const t of [0,2,10,100,900]){pose(f,t,f.p,{react:false});assert.equal(f.p[1],f.home[1]);assert.ok(Math.hypot(f.p[0]-f.home[0],f.p[2]-f.home[2])<.25);points.push(f.p.slice());assert.ok(Number.isFinite(f.yaw));}assert.notDeepEqual(points[0],points.at(-1));}});
check('motion without reactions is deterministic and never accumulates scale changes',()=>{for(let i=12;i<20;i++){const f=actor(i),size=f.s.slice();pose(f,37,f.p,{react:false});const expected=plain({p:f.p,yaw:f.yaw,pitch:f.pitch,visibility:f.faunaVisibility});for(let t=100;t>0;t-=.37)pose(f,t,f.p,{react:false});pose(f,37,f.p,{react:false});assert.deepEqual(plain({p:f.p,yaw:f.yaw,pitch:f.pitch,visibility:f.faunaVisibility}),expected);assert.deepEqual(f.s,size)}});
check('garden eel retreats rapidly from a fast close swimmer and re-emerges only after calm',()=>{const f=actor(14),fast={react:true,observerPosition:[20.1,-7.8,15],observerVelocity:[2,0,0]},calm={...fast,observerVelocity:[0,0,0]};pose(f,0,f.p,calm);for(let t=.05;t<.65;t+=.05)pose(f,t,f.p,fast);assert.ok(f.retreat>.98);assert.ok(f.faunaVisibility<.03);assert.equal(f.faunaVisible,false);pose(f,1,f.p,calm);assert.ok(f.faunaVisibility<.03);for(let t=1.05;t<12;t+=.05)pose(f,t,f.p,calm);assert.ok(f.faunaVisibility>.98);assert.equal(f.faunaVisible,true);assert.deepEqual(f.p,f.home);assert.deepEqual(f.s,[.4,.4,.4]);});
check('a distant fast swimmer does not disturb a burrow',()=>{const f=actor(14);for(let t=0;t<3;t+=.1)pose(f,t,f.p,{react:true,observerPosition:[40,-8,15],observerVelocity:[4,0,0]});assert.equal(f.retreat,0);assert.equal(f.faunaVisibility,1)});
check('shrimp naturally alternates between its burrow and exposed entrance',()=>{const f=actor(15),seen=[];for(let t=0;t<90;t+=.3){pose(f,t,f.p,{react:false});seen.push(f.faunaVisibility);assert.equal(f.p[1],f.home[1]);assert.ok(Math.hypot(f.p[0]-f.home[0],f.p[2]-f.home[2])<.1);}assert.ok(Math.min(...seen)<.15);assert.ok(Math.max(...seen)>.95)});
check('hovering and swimming species keep finite modest movement around the supplied habitat',()=>{for(const i of [17,18,19]){const f=actor(i);for(let t=0;t<300;t+=.4){pose(f,t,f.p,{react:false});assert.ok(f.p.every(Number.isFinite));assert.ok(Math.abs(f.p[1]-f.home[1])<.18);assert.ok(Math.hypot(f.p[0]-f.home[0],f.p[2]-f.home[2])<1);assert.ok(Number.isFinite(f.pitch));assert.ok(Number.isFinite(f.effort));}}});
check('world update routes attached fauna through its habitat pose without seabed access',()=>{const f=actor(12);ctx.allLife.push(f);ctx.updateLife(12);assert.deepEqual(f.p,f.home);assert.equal(f.yaw,f.homeYaw);ctx.allLife.length=0;});
check('phenotype initialization preserves micro body scale and stable identity',()=>{const f=actor(12);ctx.allLife.push(f);ctx.initializeIndividuals({batches:[]});const uid=f.uid;ctx.initializeIndividuals({batches:[]});assert.deepEqual(f.s,[.024,.024,.024]);assert.equal(f.uid,uid);ctx.allLife.length=0;});
// Exercise the actual instance encoder without creating a WebGL context. This
// checks data passed to both passes, including the smallest mobile-tier actor.
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine.js'),'utf8'),ctx);
const encode=vm.runInContext('Renderer.prototype.updateBatch',ctx);
check('renderer retains near micro animals on every quality tier and encodes withdrawal without shrinking',()=>{
 const f=actor(12);f.faunaVisibility=.2;const b={instances:[f],data:new Float32Array(24),kind:8,radius:1,minDistance:0,maxDistance:10},gl={bindBuffer(){},bufferSubData(){}};
 for(const mobile of [false,true])for(const quality of [0,1,2]){encode.call({mobile,quality,gl},b,[20,-8,15.04],Array.from({length:6},()=>[0,0,0,1]));assert.equal(b.drawCount,1);assert.ok(Math.abs(b.data[23]-.8)<1e-6);assert.ok(Math.abs(b.data[4]-.024)<1e-7);}
 b.kind=1;encode.call({mobile:false,quality:2,gl},b);assert.equal(b.data[23],0);
});
let aquariumState,aquariumFeature;
ctx.oceanFeatures={register:x=>aquariumFeature=x,state:()=>aquariumState};ctx.oceanEcology={state:()=>({field:{}}),knowledge:()=>2};ctx.renderer={};ctx.saveVoyage=()=>true;
ctx.speciesTraits=id=>{const sp=typeof id==='number'?ctx.SPECIES[id]:ctx.SPECIES.find(s=>s.id===id),i=ctx.SPECIES.indexOf(sp);return {motion:i===12?'attached':i===13||i===15||i===16?'crawl':i===14?'burrow':'hover',micro:i>=12&&i<=15}};
for(let i=12;i<20;i++)ctx.SPECIES[i].fauna=true;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/aquarium.js'),'utf8'),ctx);const aquarium=vm.runInContext('oceanAquarium',ctx);aquariumState=aquariumFeature.initial();
check('aquarium uses actual new animal scale and supported micro habitats',()=>{
 for(let i=12;i<20;i++){const slot={species:ids[i],cell:i-12,level:1},layout=aquarium.exhibitLayout(slot);assert.equal(layout.scale,sizes[i]);assert.equal(layout.supported,i<=16);if(i===12){assert.equal(layout.support,'attached');assert.ok(layout.home[1]>layout.base[1]);}if(i===14||i===15)assert.equal(layout.support,'burrow');}
 assert.equal(aquarium.exhibitLayout({species:'whale',cell:0,level:1}).scale,null);
});
check('micro aquarium focus, pinch zoom and sub-metre camera survive save import',()=>{
 aquariumState.slots=[{species:ids[12],cell:0,level:1}];assert.equal(aquarium.focus(0),true);assert.ok(aquariumState.camera.distance<.1);aquarium.adjust(0,0,-.4);const restored=aquarium.sanitize(plain(aquariumState));assert.deepEqual(plain(restored),plain(aquariumState));aquarium.adjust(0,0,-100);assert.ok(aquariumState.camera.distance>=.018);aquarium.focus(-1);assert.equal(aquariumState.camera.distance,36);
});
check('removing or replacing a focused micro exhibit cannot leave the overview inside the display',()=>{
 aquariumState.slots=[{species:ids[12],cell:0,level:1}];aquarium.focus(0);assert.equal(aquarium.place('whale',0),true);assert.equal(aquariumState.camera.distance,11);assert.equal(aquarium.place(ids[12],0),true);assert.ok(aquariumState.camera.distance<.1);aquarium.remove(0);assert.equal(aquariumState.camera.focus,-1);assert.equal(aquariumState.camera.distance,36);
});
console.log(`${passed} fauna motion checks passed.`);
