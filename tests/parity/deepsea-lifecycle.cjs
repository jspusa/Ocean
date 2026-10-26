/* Current connected-ocean lifecycle: production init/wrappers with DOM IO.
 * SPEC.md's 0.16 override removes vehicle deployment/forced recovery. Guided
 * arrival/creature visibility has its own compiled-scene suite; this checks
 * cancellation, lifecycle and catalogue/HUD routing without browser or GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const nodes=new Map();
function node(){
 const classes=new Set(),children=new Map();
 return {classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},append(child){if(child?.id)nodes.set(child.id,child);},querySelector(x){if(!children.has(x))children.set(x,node());return children.get(x);},querySelectorAll(){return []},style:{},textContent:'',innerHTML:''};
}
const ctx=vm.createContext({console,document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,body:node()},active:true,modal:null,photoOpen:false,auto:false,follow:null,t:1,player:{p:[760,-3000,-90],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1,third:false},cameraCut:false,renderer:{batch(g,instances){return {g,instances};}},voyage:{state:{mode:'free',completed:[],features:{expedition:{guest:null}},resume:null,companion:true},awaitingResume:false},persistent:{seen:[]},safe:s=>s,toast(){},radio(){},setAutoUI(){},resetInput(){},closePanel(){},saveVoyage(){},currentOrder:()=>null});
ctx.stopAuto=()=>{ctx.auto=false;ctx.follow=null;};ctx.startDive=()=>{ctx.active=true;};ctx.collide=p=>p;ctx.updatePlayer=()=>{};ctx.updateCamera=()=>{};ctx.renderMap=()=>{};
let jumps=0,homes=0,findCalls=0,opened=null;ctx.jumpTo=()=>jumps++;ctx.findSpecies=()=>findCalls++;
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(read(name),ctx,{filename:name+'.js'});
vm.runInContext(read('app').match(/function lerpAngle[^\n]+/)[0],ctx);
let feature,state;ctx.oceanFeatures={register:f=>feature=f,state:()=>state,addMenu(){},pointerCaptured:()=>false,open:id=>opened=id};
vm.runInContext(read('deepsea'),ctx,{filename:'deepsea.js'});state=feature.sanitize({deployed:true,station:'slope',visited:['midwater']});
ctx.goHome=()=>{homes++;feature.endDive();ctx.active=false;};feature.init();
const get=s=>vm.runInContext(s,ctx),deep=get('oceanDeepsea'),plain=x=>JSON.parse(JSON.stringify(x));let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i])),station=id=>get('OceanTrench').stations.find(s=>s.id===id);
function runTrip(id){assert(deep.travel(id));let steps=0;for(;steps<12000&&deep.snapshot().travelTarget;steps++){const before=ctx.player.p.slice();ctx.updatePlayer(1/60);assert(ctx.player.p.every(Number.isFinite));assert(distance(before,ctx.player.p)<=260/60+.001,'guide teleported instead of swimming');}assert.equal(deep.snapshot().travelTarget,null,'guide failed to finish within the current finite simulation budget');assert(distance(ctx.player.p,station(id).p)<.001);assert.equal(ctx.auto,false);assert.equal(deep.snapshot().vehicle,false);assert.equal(deep.snapshot().deployed,false);assert(state.visited.includes(id));return steps;}
check('legacy deployment flags migrate to free swimming without losing station history',()=>{
 assert.equal(state.deployed,false);assert.equal(state.station,'slope');assert.deepEqual(plain(state.visited),['midwater']);assert.equal(ctx.renderer.submersible,false);assert(deep.isActive());
});
check('cancelled descent can continuously return to the previous station in both voyage modes',()=>{
 for(const mode of ['journey','free']){ctx.voyage.state.mode=mode;ctx.player.p=[760,-3000,-90];state.station='slope';ctx.active=true;assert(deep.travel('hadal'));for(let i=0;i<120;i++)ctx.updatePlayer(1/60);assert(deep.snapshot().travelTarget);deep.cancelTravel();const stopped=ctx.player.p.slice();for(let i=0;i<60;i++)ctx.updatePlayer(1/60);assert.deepEqual(ctx.player.p,stopped);assert.equal(ctx.auto,false);assert.equal(deep.snapshot().travelTarget,null);runTrip('slope');}
});
check('same-depth manual displacement can route back to the actual station',()=>{
 ctx.player.p=plain(station('slope').p).map((n,i)=>n+(i===0?8:i===2?8:0));state.station='slope';runTrip('slope');assert.deepEqual(plain(ctx.player.p),plain(station('slope').p));assert.equal(state.station,'slope');assert.equal(deep.travel('slope'),false);
});
check('ending guided swimming stops motion but retains its destination, position and visits',()=>{
 assert(deep.travel('hadal'));ctx.updatePlayer(1/60);const before=plain(ctx.player.p),visited=plain(state.visited);ctx.goHome();assert.equal(homes,1);assert.equal(jumps,0);assert(!state.deployed&&!ctx.renderer.submersible&&!ctx.active);assert.equal(deep.snapshot().travelTarget,'hadal');assert.equal(deep.snapshot().guideMode,'paused');assert.equal(ctx.auto,false);assert.deepEqual(plain(ctx.player.p),before);assert.deepEqual(plain(state.visited),visited);
});
check('resume retains a paused destination and a new dive clears it without moving the swimmer',()=>{
 ctx.renderer.submersible=true;state.deployed=true;const before=plain(ctx.player.p),visited=plain(state.visited);feature.prepareDive({resume:true});ctx.active=true;feature.startDive();
 assert.equal(deep.snapshot().travelTarget,'hadal');assert.equal(deep.snapshot().guideMode,'paused');assert.equal(ctx.auto,false);for(let i=0;i<60;i++)ctx.updatePlayer(1/60);
 assert.deepEqual(plain(ctx.player.p),before);assert.equal(state.deployed,false);assert.equal(ctx.renderer.submersible,false);assert(deep.isActive());assert.deepEqual(plain(state.visited),visited);
 feature.prepareDive({resume:false});assert.equal(deep.snapshot().travelTarget,null);assert.equal(deep.snapshot().guideMode,null);assert.deepEqual(plain(ctx.player.p),before);assert.deepEqual(plain(state.visited),visited);ctx.player.p=[0,-8,0];assert.equal(deep.isActive(),false);
});
const source=read('voyage');
vm.runInContext(source.slice(source.indexOf('function voyageDestination('),source.indexOf('function markPlace(')),ctx);
vm.runInContext(source.slice(source.indexOf('function paintVoyageHUD('),source.indexOf('const legacyLifeUpdate=')),ctx);
vm.runInContext(`
const testIndex=SPECIES.length;
SPECIES.push({id:'sea_pig',name:'海豬',fauna:true,trench:true,traits:{micro:true,observeDistance:2,viewDistance:.8}},{id:'mariana_snailfish',name:'馬里亞納獅子魚',fauna:true,trench:true,traits:{micro:false,observeDistance:6,viewDistance:1.1}});
life.push({species:0,uid:'test-clown',home:[0,-8,0],p:[0,-8,0]},{species:testIndex,uid:'test-pig',home:[763,-1402,-111],p:[763,-1402,-111]},{species:testIndex+1,uid:'test-snailfish',home:[776,-7001.8,-130],p:[776,-7001.8,-130]});
renderer.vp=mm(perspective(69*Math.PI/180,1,.16,950),lookAt([754,-1400,-103],[763,-1402,-111]));
function animalFocusPoint(f){return f.p;}
function speciesTraits(i){return SPECIES[i].traits||{observeDistance:20,viewDistance:3};}
function chooseObservationSide(){}function viewingOffset(){return [0,0,1.1];}
let followDistance=1;
`,ctx);
check('connected-ocean HUD keeps both shallow and deep destinations available',()=>{
 ctx.active=true;ctx.player.p=plain(station('slope').p);state.station='slope';
 for(const id of ['garden','habitat:sea_pig','boat']){ctx.voyage.state.waypoint=id;get('paintVoyageHUD()');feature.paintHUD();assert.equal(nodes.get('waypointHUD').classList.contains('hidden'),false,id);assert.match(nodes.get('waypointDistance').textContent,/^\d+ m$/);}
 ctx.active=false;get('paintVoyageHUD()');assert(nodes.get('waypointHUD').classList.contains('hidden'));ctx.active=true;
});
ctx.markPlace=id=>{ctx.voyage.state.waypoint=id;};
check('guide status remains available while paused and hides when the dive ends',()=>{
 ctx.active=true;feature.paintHUD();const status=nodes.get('deepseaStatus');assert(status.classList.contains('hidden'));assert(deep.travel('hadal'));feature.paintHUD();assert(!status.classList.contains('hidden'));
 ctx.stopAuto();ctx.updatePlayer(1/60);feature.paintHUD();assert(!status.classList.contains('hidden'));assert.equal(deep.snapshot().guideMode,'paused');assert.equal(deep.snapshot().travelTarget,'hadal');
 feature.endDive();ctx.active=false;assert(status.classList.contains('hidden'));assert(!state.deployed);assert.equal(deep.snapshot().travelTarget,'hadal');assert.equal(deep.snapshot().guideMode,'paused');
 // The following catalogue checks start a fresh dive, not a resumed guide.
 feature.prepareDive({resume:false});feature.startDive();ctx.active=true;assert.equal(deep.snapshot().travelTarget,null);
});
vm.runInContext(source.slice(source.indexOf('const legacyFind=findSpecies;'),source.indexOf('// Chart marks a real game-space')),ctx);
check('distant shallow observation only marks its habitat from deep water',()=>{
 ctx.voyage.state.mode='free';ctx.player.p=plain(station('slope').p);ctx.follow=null;const before=ctx.player.p.slice();ctx.findSpecies(0);assert.deepEqual(ctx.player.p,before);assert.equal(ctx.follow,null);assert.equal(findCalls,0);assert.equal(ctx.voyage.state.waypoint,'habitat:clown');assert.equal(deep.snapshot().travelTarget,null);
});
check('cross-station catalogue observation marks the actual habitat without automatic travel',()=>{
 const before=ctx.player.p.slice();opened=null;ctx.findSpecies(get('testIndex+1'));assert.deepEqual(ctx.player.p,before);assert.equal(ctx.follow,null);assert.equal(findCalls,0);assert.equal(opened,null);assert.equal(ctx.voyage.state.waypoint,'habitat:mariana_snailfish');assert.equal(deep.snapshot().travelTarget,null);
});
check('nearby same-region observation still reaches the production follow path',()=>{
 ctx.player.p=[776,-7001.8,-129];state.station='hadal';ctx.findSpecies(get('testIndex+1'));assert.equal(findCalls,1);assert.equal(ctx.follow.uid,'test-snailfish');assert(ctx.auto);
});
check('nearby trench catalogue observation at home never moves or follows a swimmer',()=>{
 ctx.active=false;state.deployed=false;ctx.follow=null;ctx.auto=false;ctx.player.p=[776,-7001.8,-128];opened=null;const before=plain(ctx.player.p);ctx.voyage.state.resume={p:before.slice(),yaw:0,pitch:0,seconds:42};ctx.voyage.state.waypoint=null;const resume=plain(ctx.voyage.state.resume);ctx.findSpecies(get('testIndex+1'));assert.deepEqual(plain(ctx.player.p),before);assert.equal(ctx.follow,null);assert.equal(ctx.auto,false);assert.equal(ctx.active,false);assert.deepEqual(plain(ctx.voyage.state.resume),resume);assert.equal(opened,null);assert.equal(findCalls,1);assert.equal(ctx.voyage.state.waypoint,'habitat:mariana_snailfish');assert.equal(deep.snapshot().travelTarget,null);
});
console.log(`${count}/${count} deepsea lifecycle checks passed (CPU DOM fixture; no GPU)`);
