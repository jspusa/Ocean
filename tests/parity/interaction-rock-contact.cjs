/* Actual features.init wrapper -> updateLife -> ecology feeding/partner pipeline.
 * Compiled rock triangles and the independent mesh oracle come from rock-contact.
 * Actor route/save/camera state are explicit legal fixtures, not a natural-play claim.
 * DOM/GPU adapters implement initialization only; projection, feedAt, blocked,
 * collide, fish motion, feature ordering and contact all use production code. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');const root=path.resolve(__dirname,'../..');process.chdir(root);
const sourceSHA256=Object.fromEntries(['src/features.js','src/ecology.js','src/individuals.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
let prefix=fs.readFileSync('tests/parity/rock-contact.cjs','utf8');prefix=prefix.slice(0,prefix.indexOf('const results=[];'));
const f=new Function('require','__dirname',prefix+'return {context,api,header,penetration,mesh,inside,forward,witness,oracleRocks};')(require,path.resolve('tests/parity')),c=f.context;
c.initializeIndividuals({batches:f.header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>f.header.nodes[i])}))});
const actual=vm.runInContext("life.find(f=>f.uid==='chromis-001')",c),saved=structuredClone(actual),all=vm.runInContext('allLife',c),life=vm.runInContext('life',c),partner=vm.runInContext("life.find(f=>f.uid==='dolphin-001')",c),savedPartner=structuredClone(partner);vm.runInContext('shoal.length=0;decorLife.length=0;',c);
const elements=new Map();function element(){return {classList:{add(){},remove(){},toggle(){},contains(){return false;}},style:{},setAttribute(){},addEventListener(){},append(){},appendChild(){},querySelectorAll(){return []},querySelector(){return element()},getBoundingClientRect(){return {left:0,top:0,width:1000,height:700}}};}
const document={body:element(),createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelector(){return element()}};
Object.assign(c,{document,window:{addEventListener(){}},$:id=>document.getElementById(id),active:true,modal:null,photoOpen:false,focusFish:null,persistent:{seen:[]},voyage:{state:{features:{}},photoMode:false},saveVoyage(){},toast(){},releaseMouseLook(){},stopAuto(){},updatePlayer(){},shipCamera(){},renderSpecies(){},safe:s=>String(s),keys:new Set(),stick:[0,0],verticalInput:0,eye:[0,-5,0],player:{p:[0,-5,0],yaw:0,pitch:0},renderer:{fov:69,canvas:element(),batch(g,instances){return {instances}}}});
const app=fs.readFileSync('src/app.js','utf8');vm.runInContext(app.slice(app.indexOf('function dir('),app.indexOf('function startDive(')),c);vm.runInContext(app.slice(app.indexOf('function blocked('),app.indexOf('function observe(')),c);
for(const name of ['features','ecology'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});const ec=vm.runInContext('oceanEcology',c),features=vm.runInContext('oceanFeatures',c),directUpdate=c.updateLife;
function camera(p,target){c.player.p=p;c.eye=p.slice();c.lookTarget=target;vm.runInContext('renderer.vp=mm(perspective(69*Math.PI/180,1000/700,.1,1000),lookAt(eye,lookTarget))',c);}
const results=[],receipts=[];const plain=v=>JSON.parse(JSON.stringify(v)),distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
function check(name,fn){try{const evidence=fn();results.push({name,passed:true,evidence});}catch(error){results.push({name,passed:false,error:error.message});}}
function fresh(actor,snapshot){ec.hooks.reset();c.voyage.state.features={};Object.assign(actor,structuredClone(snapshot));life.splice(0,life.length,actor);all.splice(0,all.length,actor);c.active=true;c.modal=null;c.focusFish=null;c.initializeAnimalContact({batches:f.header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>f.header.nodes[i])}))});}
function routeAt(actor,p,start=0){actor.center=p.slice();actor.radius=0;actor.speed=0;actor.orbit=0;actor.fixedDepth=p[1]-Math.sin(start*(.19+actor.routeShape[0]*.09)+actor.bob)*.20;}
function feedingFixture(near=true){fresh(actual,saved);const radius=c.animalContactEnvelope(actual).radius,p=near?f.witness.from.map((v,k)=>v+f.witness.normal[k]*radius):[0,-3,0];routeAt(actual,p);c.updateLife(0);const before=actual.p.slice(),player=[before[0]-1.1,before[1]+.5,before[2]];camera(player,c.animalFocusPoint(actual));c.focusFish=actual;assert.equal(f.penetration(before,radius),null,'Prepared actor must begin with full-body clearance');assert.equal(f.penetration(player,.4),null,'Prepared diver must begin clear of stone');assert(ec.inRange(actual,true),'real distance/projection/LOS gate');assert(ec.feedAt(actual,500,350),'real feeding input must succeed');return {before,player,radius};}
(async()=>{await features.init();
check('actual feeding and recovery preserve final body clearance after the complete feature wrapper',()=>{
 const prepared=feedingFixture();let maximumStep=0;
 for(let i=1;i<=510;i++){const old=actual.p.slice(),time=i/60;c.updateLife(time);maximumStep=Math.max(maximumStep,distance(old,actual.p));const hit=f.penetration(actual.p,prepared.radius);
  if(hit){const evidence={uid:actual.uid,frame:i,time,...prepared,finalPosition:actual.p.slice(),hit};receipts.push(evidence);assert.fail('Final feature pose crosses actual archive triangles: '+JSON.stringify(evidence));}
 }
 assert(maximumStep<=1.4/60+.003,'feeding/recovery teleports: '+maximumStep);assert.equal(ec.snapshot().food,0,'food expires normally');assert.equal(ec.state().individuals[actual.uid].feeds,1);return {frames:510,maximumStep};
});
check('open-water feeding still moves once per frame and repeated timestamps preserve its pose',()=>{
 const prepared=feedingFixture(false);let travel=0,maxStep=0;
 for(let i=1;i<=60;i++){const old=actual.p.slice(),time=i/60;c.updateLife(time);travel+=distance(old,actual.p);maxStep=Math.max(maxStep,distance(old,actual.p));const once=plain([actual.p,actual.yaw,actual.pitch,actual.bank]);c.updateLife(time);assert.deepEqual(plain([actual.p,actual.yaw,actual.pitch,actual.bank]),once,'same timestamp changed final feeding pose');}
 assert(travel>.1,'food must attract an actual fish');assert(maxStep<=1.05/60+.003,'feeding exceeds its stated swim rate');assert.equal(ec.state().individuals[actual.uid].feeds,1);return {travel,maxStep};
});
check('selected partner following keeps the rendered pose and ecology follow anchor identical',()=>{
 fresh(partner,savedPartner);const radius=c.animalContactEnvelope(partner).radius;
 const p=f.witness.from.map((v,k)=>v+f.witness.normal[k]*(radius+.3));routeAt(partner,p);c.updateLife(0);const start=partner.p.slice();assert.equal(f.penetration(start,radius),null,'initial companion must be clear');
 const player=[start[0]-3,start[1]+.5,start[2]];camera(player,c.animalFocusPoint(partner));c.player.yaw=0;c.player.pitch=0;
 const state=ec.sanitize({partners:[{uid:partner.uid,name:'Prepared legal companion',mastery:{}}],individuals:{[partner.uid]:{trust:30,seconds:8,strokes:5,feeds:0}},selected:partner.uid,accompany:true});c.voyage.state.features.ecology=state;
 assert.equal(state.selected,partner.uid,'real saved roster must accept the actual actor');assert(ec.whistle(),'real selected partner responds to whistle');assert.deepEqual(plain(ec.snapshot().partnerPosition),plain(start));
 let maximumStep=0,travel=0;for(let i=1;i<=180;i++){const old=partner.p.slice(),time=i/60;c.updateLife(time);const step=distance(old,partner.p);maximumStep=Math.max(maximumStep,step);travel+=step;const hit=f.penetration(partner.p,radius);if(hit){receipts.push({kind:'partner',uid:partner.uid,frame:i,start,player,finalPosition:partner.p.slice(),radius,hit});assert.fail('Final partner pose crosses actual archive triangles: '+JSON.stringify(receipts.at(-1)));}
  assert.deepEqual(plain(ec.snapshot().partnerPosition),plain(partner.p),'follow anchor must adopt the contact-corrected render pose');const pose=plain([partner.p,partner.yaw,partner.pitch,partner.bank]);c.updateLife(time);assert.deepEqual(plain([partner.p,partner.yaw,partner.pitch,partner.bank]),pose,'same timestamp changed final partner pose');
 }
 assert(travel>.1,'partner following is not frozen');assert(maximumStep<=c.partnerTraits(partner.species).swimSpeed/60+.003,'partner teleports');return {frames:180,travel,maximumStep};
});
check('no-interaction wrapper retains direct world poses and exactly one contact pass',()=>{
 function run(update){fresh(actual,saved);const radius=c.animalContactEnvelope(actual).radius,p=f.witness.from.map((v,k)=>v+f.witness.normal[k]*(radius+.2));routeAt(actual,p);f.api.resetQueryStats();const poses=[];
  for(let i=0;i<=30;i++){update(i/60);poses.push(plain([actual.p,actual.yaw,actual.pitch,actual.bank,actual.effort]));}
  const work=f.api.status();return {poses,queries:work.queries,candidates:work.candidates,nodes:work.nodes,triangles:work.triangles};
 }
 const direct=run(directUpdate),wrapped=run(c.updateLife);assert.deepEqual(wrapped,direct,'feature wrapper duplicated or changed natural world contact');return {frames:31,queries:wrapped.queries,triangles:wrapped.triangles};
});
console.log(JSON.stringify({scope:'real feature wrapper / explicit lawful route and feeding fixtures / actual archive triangle oracle',sourceSHA256,passed:results.filter(r=>r.passed).length,total:results.length,receipts,results},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
