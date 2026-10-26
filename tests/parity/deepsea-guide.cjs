/* Resumable deep-sea guide contract: production init/wrappers with DOM IO.
 * SPEC.md's 0.16 override removes vehicle deployment/forced recovery. Guided
 * arrival/creature visibility has its own compiled-scene suite; this checks
 * cancellation, lifecycle and catalogue/HUD routing without browser or GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const nodes=new Map();
function node(){
 const classes=new Set(),children=new Map();
 return {focus(){ctx.document.activeElement=this;},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},append(child){if(child?.id)nodes.set(child.id,child);},querySelector(x){if(!children.has(x))children.set(x,node());return children.get(x);},querySelectorAll(){return []},style:{},textContent:'',innerHTML:''};
}
const ctx=vm.createContext({console,document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,body:node()},active:true,modal:null,photoOpen:false,auto:false,follow:null,t:1,player:{p:[760,-3000,-90],velocity:[0,0,0],yaw:0,pitch:0},settings:{speed:1,third:false},cameraCut:false,renderer:{batch(g,instances){return {g,instances};}},voyage:{state:{mode:'free',completed:[],features:{expedition:{guest:null}},resume:null,companion:true},awaitingResume:false},persistent:{seen:[]},safe:s=>s,toast(){},radio(){},setAutoUI(){},resetInput(){ctx.manualAxis=0;},closePanel(){},saveVoyage(){},currentOrder:()=>null});
ctx.stopAuto=()=>{ctx.auto=false;ctx.follow=null;};ctx.startDive=()=>{ctx.active=true;};ctx.collide=p=>p;ctx.updatePlayer=dt=>{ctx.player.p[0]+=(ctx.manualAxis||0)*dt;};ctx.updateCamera=()=>{};ctx.renderMap=()=>{};
let jumps=0,homes=0,findCalls=0,opened=null;ctx.jumpTo=()=>jumps++;ctx.findSpecies=()=>findCalls++;
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(read(name),ctx,{filename:name+'.js'});
vm.runInContext(read('app').match(/function lerpAngle[^\n]+/)[0],ctx);
const app=read('app');vm.runInContext(app.slice(app.indexOf('function reefObstacleCandidates('),app.indexOf('function startDive(')),ctx);
vm.runInContext(app.match(/function blocked[^\n]+/)[0],ctx);
let feature,state;ctx.oceanFeatures={register:f=>feature=f,state:()=>state,addMenu(){},pointerCaptured:()=>false,open:id=>opened=id};
vm.runInContext(read('deepsea'),ctx,{filename:'deepsea.js'});state=feature.sanitize({deployed:true,station:'slope',visited:['midwater']});
ctx.goHome=()=>{homes++;feature.endDive();ctx.active=false;};feature.init();
const get=s=>vm.runInContext(s,ctx),deep=get('oceanDeepsea'),plain=x=>JSON.parse(JSON.stringify(x));let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i])),station=id=>get('OceanTrench').stations.find(s=>s.id===id);
check('old saves have no guide; only known destinations and unique authored stops survive round-trip',()=>{
 const legacy=feature.sanitize({schema:1,station:'slope',visited:['midwater']});
 assert.equal(legacy.guide,null);
 const loaded=feature.sanitize({schema:2,station:'slope',guide:{target:'hadal',passed:['pelican-pass','pelican-pass','missing',{},'mud-fauna-pass'],route:[[0,0,0]],auto:true}});
 assert.deepEqual(plain(loaded.guide),{target:'hadal',passed:['pelican-pass','mud-fauna-pass']});
 assert.deepEqual(plain(feature.sanitize(plain(loaded))),plain(loaded));
 for(const guide of [null,[],true,{}, {target:'missing'}, {target:'hadal',passed:42}]){
  const result=feature.sanitize({guide}).guide;
  assert.deepEqual(plain(result),guide?.target==='hadal'?{target:'hadal',passed:[]}:null);
 }
});
check('manual takeover keeps the destination and current input; resume replans from the real position',()=>{
 ctx.active=true;ctx.player.p=[760,-3000,-90];state=feature.initial();state.station='slope';
 assert(deep.travel('hadal'));for(let i=0;i<60;i++)ctx.updatePlayer(1/60);
 const before=plain(ctx.player.p);ctx.stopAuto();ctx.manualAxis=1;ctx.updatePlayer(.5);
 assert.equal(deep.snapshot().travelTarget,'hadal');assert.equal(deep.snapshot().guideMode,'paused');
 assert.equal(ctx.player.p[0],before[0]+.5,'takeover consumed the movement input');
 assert.deepEqual(plain(state.guide),{target:'hadal',passed:[]});
 const resumeFrom=plain(ctx.player.p);assert(deep.resumeTravel());
 assert.deepEqual(plain(ctx.player.p),resumeFrom,'resume teleported');assert.equal(ctx.manualAxis,0);
 ctx.updatePlayer(1/60);assert(distance(resumeFrom,ctx.player.p)>0);assert(distance(resumeFrom,ctx.player.p)<=260/60+.001);
 assert.equal(deep.snapshot().guideMode,'traveling');deep.cancelTravel();
 assert.equal(state.guide,null);assert.equal(deep.snapshot().travelTarget,null);assert.equal(ctx.auto,false);
});
get(`
SPECIES.push({id:'guide-contract-animal',size:1,traits:{observeDistance:10,viewDistance:2,micro:false}});
life.push({species:SPECIES.length-1,uid:'guide-contract-001',encounterId:'giant-squid-pass',p:[775,-680,-114],radius:.4,yaw:0});
function animalFocusPoint(f){return f.p;}
function speciesTraits(i){return SPECIES[i].traits;}
`);
check('an encountered animal remains a voluntary stop beyond fifteen seconds and is skipped only after explicit continuation',()=>{
 state=feature.initial();ctx.player.p=[766,-650,-90];assert(deep.travel('midwater'));
 for(let i=0;i<9000&&!deep.snapshot().holding;i++){ctx.t+=1/60;ctx.updatePlayer(1/60);}
 assert(deep.snapshot().holding);const at=plain(ctx.player.p),visited=plain(state.visited);
 for(let i=0;i<1200;i++){ctx.t+=1/60;ctx.updatePlayer(1/60);}
 assert.deepEqual(plain(ctx.player.p),at,'left the animal without player consent');
 assert.equal(deep.snapshot().guideMode,'observing');assert.equal(ctx.auto,false);
 assert.deepEqual(plain(state.guide),{target:'midwater',passed:['giant-squid-pass']});
 assert.deepEqual(plain(state.visited),visited);assert.deepEqual(ctx.persistent.seen,[]);
 assert(deep.resumeTravel());assert.deepEqual(plain(ctx.player.p),at);
 for(let i=0;i<9000&&deep.snapshot().travelTarget;i++){ctx.t+=1/60;ctx.updatePlayer(1/60);assert(!deep.snapshot().holding,'revisited the completed stop');}
 assert.equal(deep.snapshot().travelTarget,null);assert.equal(state.guide,null);assert(distance(ctx.player.p,station('midwater').p)<.001);
});
check('home, sanitized reload and resume retain the destination without moving until requested; new dive and cancel clear it',()=>{
 ctx.active=true;ctx.player.p=[760,-3000,-90];state=feature.sanitize({station:'slope',guide:{target:'hadal',passed:['pelican-pass']}});
 assert(deep.resumeTravel());ctx.updatePlayer(1/60);const at=plain(ctx.player.p),saved=plain(state.guide);
 feature.endDive();ctx.active=false;assert.deepEqual(plain(state.guide),saved);assert.equal(ctx.auto,false);
 state=feature.sanitize(plain(state));feature.reset();feature.prepareDive({resume:true});ctx.active=true;feature.startDive();
 assert.equal(deep.snapshot().guideMode,'paused');for(let i=0;i<1200;i++)ctx.updatePlayer(1/60);
 assert.deepEqual(plain(ctx.player.p),at);assert.deepEqual(plain(state.guide),saved);assert.equal(ctx.auto,false);
 assert(deep.resumeTravel());ctx.updatePlayer(1/60);assert(distance(at,ctx.player.p)>0);
 feature.endDive();feature.prepareDive({resume:false});assert.equal(state.guide,null);assert.equal(deep.snapshot().travelTarget,null);
});
check('opening a panel or camera pauses; only the explicit guide control resumes and camera mode is exited',()=>{
 ctx.active=true;ctx.player.p=[760,-3000,-90];state=feature.initial();state.station='slope';
 assert(deep.travel('hadal'));feature.panelChanged('diveMenu');assert.equal(ctx.auto,false);assert.equal(deep.snapshot().guideMode,'paused');
 assert(deep.resumeTravel());feature.cameraModeChanged(true);assert.equal(ctx.auto,false);assert.equal(deep.snapshot().guideMode,'paused');
 ctx.voyage.photoMode=true;let cameraExit=0;ctx.togglePhotoMode=()=>{ctx.voyage.photoMode=!ctx.voyage.photoMode;cameraExit++;};
 assert(deep.resumeTravel());assert.equal(ctx.voyage.photoMode,false);assert.equal(cameraExit,1);
 feature.beforePhoto();assert.equal(ctx.auto,false);assert.equal(deep.snapshot().travelTarget,'hadal');
 const status=nodes.get('deepseaStatus');feature.paintHUD();assert(!status.classList.contains('hidden'));
 assert.equal(status.querySelector('#deepseaContinue').textContent,'繼續前往');
 ctx.document.activeElement=status.querySelector('#deepseaContinue');status.querySelector('#deepseaContinue').onclick();assert.equal(ctx.auto,true);assert.equal(ctx.document.activeElement,nodes.get('ocean'),'continue must return keyboard control to swimming');
 ctx.document.activeElement=status.querySelector('#deepseaContinue');status.querySelector('#deepseaContinue').onclick();assert.equal(ctx.auto,false);assert.equal(ctx.document.activeElement,nodes.get('ocean'),'pause must return keyboard control to swimming');
 ctx.document.activeElement=status.querySelector('#deepseaCancel');status.querySelector('#deepseaCancel').onclick();assert.equal(ctx.document.activeElement,nodes.get('ocean'),'cancel must return keyboard control to swimming');assert.equal(state.guide,null);assert(status.classList.contains('hidden'));
});
check('unreachable departure retains a paused guide; switching destination resets only its stop history',()=>{
 ctx.active=true;ctx.player.p=[763,-1405,-111];state=feature.sanitize({station:'slope',visited:['slope'],guide:{target:'hadal',passed:['pelican-pass']}});feature.reset();
 const before=plain(ctx.player.p),saved=plain(state);assert(get('OceanRegions').pointBlocked(before,.4),'fixture must be inside actual terrain');
 assert.equal(deep.resumeTravel(),false);assert.deepEqual(plain(ctx.player.p),before);assert.deepEqual(plain(state),saved);assert.equal(ctx.auto,false);
 ctx.player.p=[760,-3000,-90];assert(deep.travel('midwater'));assert.deepEqual(plain(state.guide),{target:'midwater',passed:[]});assert.deepEqual(plain(state.visited),['slope']);deep.cancelTravel();
});
check('manually reaching the destination can finish the paused guide without a spurious route failure',()=>{
 ctx.active=true;ctx.player.p=plain(station('midwater').p);state=feature.sanitize({station:'midwater',guide:{target:'midwater',passed:['giant-squid-pass']}});feature.reset();
 const at=plain(ctx.player.p);assert(deep.resumeTravel());assert.deepEqual(plain(ctx.player.p),at);assert.equal(state.guide,null);assert.equal(ctx.auto,false);assert(state.visited.includes('midwater'));
});
console.log(`${count}/${count} resumable guide checks passed (production feature lifecycle, CPU IO fixture)`);
