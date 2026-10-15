/* Independent integration regression: production init/wrappers with a minimal
 * DOM and no GL. This is CPU behavior evidence, not browser gesture evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const nodes=new Map();
function node(){
 const classes=new Set(),children=new Map();
 return {classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},append(){},querySelector(x){if(!children.has(x))children.set(x,node());return children.get(x);},querySelectorAll(){return []},style:{},textContent:'',innerHTML:''};
}
const ctx=vm.createContext({console,document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,body:node()},active:true,modal:null,photoOpen:false,auto:false,follow:null,t:1,player:{p:[760,-3000,-90],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1,third:false},cameraCut:false,renderer:{batch(g,instances){return {g,instances};}},voyage:{state:{mode:'free',completed:[],features:{expedition:{guest:null}},resume:null,companion:true},awaitingResume:false},persistent:{seen:[]},safe:s=>s,toast(){},radio(){},setAutoUI(){},resetInput(){},closePanel(){},saveVoyage(){},currentOrder:()=>null});
ctx.stopAuto=()=>{ctx.auto=false;ctx.follow=null;};ctx.startDive=()=>{ctx.active=true;};ctx.collide=p=>p;ctx.updatePlayer=()=>{};ctx.updateCamera=()=>{};ctx.renderMap=()=>{};
let jumps=0,homes=0,findCalls=0,opened=null;ctx.jumpTo=()=>jumps++;ctx.findSpecies=()=>findCalls++;
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(read(name),ctx,{filename:name+'.js'});
vm.runInContext(read('app').match(/function lerpAngle[^\n]+/)[0],ctx);
let feature,state;ctx.oceanFeatures={register:f=>feature=f,state:()=>state,addMenu(){},pointerCaptured:()=>false,open:id=>opened=id};
vm.runInContext(read('deepsea'),ctx,{filename:'deepsea.js'});state=feature.initial();state.deployed=true;state.station='slope';
ctx.goHome=()=>{homes++;feature.endDive();ctx.active=false;};feature.init();
const get=s=>vm.runInContext(s,ctx),deep=get('oceanDeepsea'),plain=x=>JSON.parse(JSON.stringify(x));let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
function runTrip(id){assert(deep.travel(id));for(let i=0;i<1000&&deep.snapshot().travelTarget;i++)ctx.updatePlayer(1/60);assert.equal(deep.snapshot().travelTarget,null);}
check('cancelled descent can return to the previous station in both voyage modes',()=>{
 for(const mode of ['journey','free']){ctx.voyage.state.mode=mode;ctx.player.p=[760,-3000,-90];state.station='slope';state.deployed=true;ctx.active=true;runTrip('slope');assert(Math.hypot(...ctx.player.p.map((x,i)=>x-[754,-1400,-103][i]))<.001);assert.equal(ctx.auto,false);assert(state.deployed);}
});
check('same-depth manual displacement can route back to the actual station',()=>{
 ctx.player.p=[768,-1400,-112];state.station='slope';runTrip('slope');assert.deepEqual(plain(ctx.player.p),[754,-1400,-103]);assert.equal(state.station,'slope');assert.equal(deep.travel('slope'),false);
});
check('recovery invokes goHome and clears research mode instead of shallow teleport',()=>{
 ctx.renderer.submersible=true;ctx.jumpTo(8);assert.equal(homes,1);assert.equal(jumps,0);assert(!state.deployed&&!ctx.renderer.submersible&&!ctx.active);
});
check('shallow jump remains delegated after recovery',()=>{ctx.jumpTo(8);assert.equal(jumps,1);});
const source=read('voyage');
vm.runInContext(source.slice(source.indexOf('function voyageDestination('),source.indexOf('function markPlace(')),ctx);
vm.runInContext(source.slice(source.indexOf('function paintVoyageHUD('),source.indexOf('const legacyLifeUpdate=')),ctx);
vm.runInContext(`
const testIndex=SPECIES.length;
SPECIES.push({id:'sea_pig',name:'海豬',fauna:true,trench:true,traits:{micro:true,observeDistance:2,viewDistance:.8}},{id:'mariana_snailfish',name:'馬里亞納獅子魚',fauna:true,trench:true,traits:{micro:false,observeDistance:6,viewDistance:1.1}});
life.push({species:testIndex,uid:'test-pig',home:[763,-1402,-111],p:[763,-1402,-111]},{species:testIndex+1,uid:'test-snailfish',home:[776,-7001.8,-130],p:[776,-7001.8,-130]});
renderer.vp=mm(perspective(69*Math.PI/180,1,.16,950),lookAt([754,-1400,-103],[763,-1402,-111]));
function animalFocusPoint(f){return f.p;}
function speciesTraits(i){return SPECIES[i].traits||{observeDistance:20,viewDistance:3};}
function chooseObservationSide(){}function viewingOffset(){return [0,0,1.1];}
let followDistance=1;
`,ctx);
check('the final deep HUD keeps a real habitat waypoint and hides shallow destinations',()=>{
 ctx.active=true;state.deployed=true;state.station='slope';
 for(const [id,hidden]of [['garden',true],['habitat:sea_pig',false],['boat',true]]){ctx.voyage.state.waypoint=id;get('paintVoyageHUD()');feature.paintHUD();assert.equal(nodes.get('waypointHUD').classList.contains('hidden'),hidden,id);}
});
ctx.markPlace=id=>{ctx.voyage.state.waypoint=id;};
check('research status is removed when recovery ends the dive',()=>{
 ctx.active=true;state.deployed=true;feature.paintHUD();const status=nodes.get('deepseaStatus');assert(!status.classList.contains('hidden'));
 feature.endDive();assert(status.classList.contains('hidden'));assert(!state.deployed);state.deployed=true;
});
vm.runInContext(source.slice(source.indexOf('const legacyFind=findSpecies;'),source.indexOf('// Chart marks a real game-space')),ctx);
check('free-mode shallow observation never moves a deployed vehicle or changes its follow target',()=>{
 ctx.voyage.state.mode='free';ctx.player.p=[754,-1400,-103];ctx.follow=null;const before=ctx.player.p.slice();ctx.findSpecies(0);assert.deepEqual(ctx.player.p,before);assert.equal(ctx.follow,null);assert.equal(findCalls,0);
});
check('free-mode cross-station observation opens routing without teleport-follow',()=>{
 const before=ctx.player.p.slice();opened=null;ctx.findSpecies(get('testIndex+1'));assert.deepEqual(ctx.player.p,before);assert.equal(ctx.follow,null);assert.equal(findCalls,0);assert.equal(opened,'deepsea');assert.equal(ctx.voyage.state.waypoint,'habitat:mariana_snailfish');
});
check('nearby same-region observation still reaches the production follow path',()=>{
 ctx.player.p=[776,-7001.8,-129];state.station='hadal';ctx.findSpecies(get('testIndex+1'));assert.equal(findCalls,1);assert.equal(ctx.follow.uid,'test-snailfish');assert(ctx.auto);
});
check('trench observation from the ship opens deployment without changing position',()=>{
 ctx.active=false;state.deployed=false;ctx.follow=null;opened=null;const before=plain(ctx.player.p);ctx.findSpecies(get('testIndex+1'));assert.deepEqual(plain(ctx.player.p),before);assert.equal(ctx.follow,null);assert.equal(opened,'deepsea');assert.equal(findCalls,1);
});
console.log(`${count}/${count} deepsea lifecycle checks passed (CPU DOM fixture; no GPU)`);
