/* Public selection behavior versus frozen 0.18.4, with real projection and
 * reef/terrain obstruction. CPU-only; pointer event routing remains a browser check. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const baseline=fs.readFileSync(path.join(__dirname,'fixtures/selection-v0184.js'),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(source=read('selection'),touch=false){
 let rects=0,rays=0,now=100;const elements=new Map(),bounds={left:37,top:19,width:1000,height:700};
 const classes=()=>{const values=new Set();return {contains:x=>values.has(x),add:x=>values.add(x),remove:x=>values.delete(x),toggle(x,on){on?values.add(x):values.delete(x)}}};
 const node=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:classes(),textContent:'',getBoundingClientRect(){rects++;return bounds;}});return elements.get(id);};
 const traits=[{observeDistance:20,targetRadius:.04},{observeDistance:1.1,targetRadius:.012},{observeDistance:32,targetRadius:1.5}];
 const c=vm.createContext({console,performance:{now:()=>now},active:true,modal:null,photoOpen:false,follow:null,auto:false,focusFish:null,focusId:null,focusSeconds:0,
  player:{p:[0,-5,0]},eye:[0,-5,0],renderer:{fov:69},settings:{hints:true},voyage:{photoMode:false},life:[],SPECIES:[{}, {fauna:true},{}],obstacles:[],groundHeight:()=>-1000,
  animalFocusPoint:f=>f.focus||f.p,speciesTraits:i=>traits[i],$:node,matchMedia:()=>({matches:touch}),document:{hidden:false,getElementById:node,body:{classList:classes()}},
  oceanFeatures:{pointerCaptured:()=>false},stopAuto(){c.auto=false;}});
 vm.runInContext(read('engine'),c,{filename:'engine.js'});
 const app=read('app');vm.runInContext(app.slice(app.indexOf('function reefObstacleCandidates('),app.indexOf('function dir(')),c);
 vm.runInContext(app.slice(app.indexOf('function blocked('),app.indexOf('function observe(dt)')),c);
 const exactBlocked=c.blocked;c.blocked=(...args)=>{rays++;return exactBlocked(...args)};
 vm.runInContext(source,c,{filename:source===baseline?'selection-v0184.js':'selection.js'});
 const api=vm.runInContext('oceanSelection',c);
 const updateView=()=>vm.runInContext('renderer.vp=mm(perspective((renderer.photoFov||renderer.fov)*Math.PI/180,1000/700,.1,1000),lookAt(eye,V.add(eye,[0,0,-1])))',c);updateView();
 const actor=(uid,p=[0,-5,-3],extra={})=>{const f={uid,species:0,p:p.slice(),...extra};c.life.push(f);return f};
 return {c,api,node,bounds,actor,updateView,counts:()=>({rects,rays}),resetCounts(){rects=rays=0},advance(ms){now+=ms}};
}
const results=[];function check(name,run){try{run();results.push(true);console.log('PASS '+name);}catch(error){results.push(false);console.error('FAIL '+name+': '+error.message)}};
check('blank screen space does not trace visibility rays through unrelated nearby animals',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.actor('fish-'+i,[(i%5-2)*.2,-5+Math.floor(i/5)*.15,-3]);
 assert.equal(f.api.pick(42,24),null);assert.equal(f.counts().rays,0);assert.equal(f.counts().rects,1);
});
check('one canvas layout read serves all projected candidates in one public pick',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.actor('fish-'+i,[i*.05,-5,-3]);
 assert.equal(f.api.pick(537,369)?.uid,'fish-0');assert.equal(f.counts().rects,1);
});
check('overlap ranking and exact ties retain the original stable actor UID',()=>{
 const f=fixture();f.actor('far',[0,-5,-5]);f.actor('near',[0,-5,-2]);f.actor('near-tie',[0,-5,-2]);
 assert.equal(f.api.pick(537,369)?.uid,'near');f.c.life.reverse();assert.equal(f.api.pick(537,369)?.uid,'near-tie');
});
check('a blocked nearer candidate cannot hide a farther unobstructed candidate',()=>{
 const f=fixture();f.actor('blocked',[0,-5,-2]);f.actor('clear',[.10,-5,-5]);f.c.obstacles.push({p:[0,-5,-1],s:[.012,.1,.1]});
 assert.equal(f.api.pick(537,369)?.uid,'clear');assert(f.counts().rays>0);
});
check('touch hit expansion remains44px and public disc output is unchanged',()=>{
 for(const touch of [false,true]){
  const f=fixture(undefined,touch),old=fixture(baseline,touch),a=f.actor('fish'),b=old.actor('fish');
  assert.deepEqual(plain(f.api.disc(a)),plain(old.api.disc(b)));assert.equal(f.api.pick(555,369)?.uid||null,touch?'fish':null);
 }
});
check('public validity keeps exact world occlusion, terrain, identity and eligibility gates',()=>{
 const f=fixture(),a=f.actor('fish');assert(f.api.valid(a));assert(!f.api.valid({...a}));
 for(const [key,value] of [['ecologyPresent',false],['retreat',.9],['faunaVisibility',.7],['p',[0,-5,-40]],['p',[0,-5,3]],['p',[NaN,-5,-3]]]){
  const before=a[key];a[key]=value;assert(!f.api.valid(a),key);a[key]=before;
 }
 f.c.obstacles.push({p:[0,-5,-1.5],s:[.3,.3,.3]});assert(!f.api.valid(a));f.c.obstacles.length=0;f.c.groundHeight=()=>-4;assert(!f.api.valid(a));
});
check('pointer results match frozen production across desktop/touch, lenses, obstacles and actor states',()=>{
 let comparisons=0;
 for(const touch of [false,true])for(const lens of [28,69,90]){
  const f=fixture(undefined,touch),old=fixture(baseline,touch);
  for(const q of [f,old]){
   q.c.renderer.photoFov=lens;q.c.eye=[.3,-4.8,.6];q.updateView();
   for(let i=0;i<28;i++)q.actor('actor-'+i,[(i%7-3)*.30,-5+(Math.floor(i/7)-1)*.22,-1.2-(i%5)],i%9===0?{ecologyPresent:false}:i%11===0?{faunaVisibility:.2}:{});
   q.actor('tiny',[.1,-5,-.6],{species:1});q.actor('big',[-3,-5,-14],{species:2});q.actor('behind',[0,-5,3]);q.actor('unknown',[0,-5,-2],{species:99});
   q.c.obstacles.push({p:[.3,-4.9,-2],s:[.11,.22,.2]});
  }
  const pointers=[[42,24],[537,369],[555,369]];
  for(const a of old.c.life.filter(a=>a.species<3)){const d=old.api.disc(a);for(const offset of [0,-.9,.9,1.1])pointers.push([d.x+d.r*offset,d.y]);}
  for(const p of pointers){assert.equal(f.api.pick(...p)?.uid||null,old.api.pick(...p)?.uid||null,JSON.stringify({touch,lens,p}));comparisons++;}
 }
 assert(comparisons>=700);
 console.log('MATCH '+comparisons+' public pick UID results against frozen0.18.4');
});
check('paused, hidden and exclusive-tool picks perform no layout or visibility work',()=>{
 for(const mode of ['modal','photo','hidden','inactive','exclusive']){
  const f=fixture();f.actor('fish');if(mode==='modal')f.c.modal='settings';if(mode==='photo')f.c.photoOpen=true;if(mode==='hidden')f.c.document.hidden=true;if(mode==='inactive')f.c.active=false;if(mode==='exclusive')f.c.oceanFeatures.pointerCaptured=()=>true;
  assert.equal(f.api.pick(537,369),null);assert.deepEqual(f.counts(),{rects:0,rays:0});
 }
});
check('hover keeps its50ms throttle and never selects or moves the player',()=>{
 const f=fixture();f.actor('fish');const before=plain(f.c.player);f.api.hover(42,24);const first=f.counts();
 f.advance(49);f.api.hover(43,24);assert.deepEqual(f.counts(),first);f.advance(1);f.api.hover(43,24);assert(f.counts().rects>first.rects);
 assert.equal(f.api.snapshot().uid,null);assert.deepEqual(plain(f.c.player),before);
});
console.log(`${results.filter(Boolean).length}/${results.length} selection efficiency checks passed (CPU, no GPU)`);if(results.includes(false))process.exitCode=1;
