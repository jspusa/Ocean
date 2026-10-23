/* Real production third-person camera with regional solids and published reef
 * obstacles. CPU geometry seam only: these checks do not claim rendered QA. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const context=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),context,{filename:name+'.js'});
const raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)));context.actualObstacles=header.obstacles;
vm.runInContext(`obstacles.push(...actualObstacles);var active=true,settings={third:true},player={p:[0,-8,8],yaw:0,pitch:0},auto=false,follow=null,eye=[0,0,0],target=[0,0,0],cameraCut=true,lastCameraThird=false,cameraFollowLength=6.3,stick=[0,0];diverBatch={instances:[{p:[0,0,0]}]};function dir(){return [Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch)]}`,context);
const app=fs.readFileSync('src/app.js','utf8');
vm.runInContext(app.slice(app.indexOf('function reefObstacleCandidates('),app.indexOf('function dir(')),context);
vm.runInContext(app.slice(app.indexOf('function updateCamera('),app.indexOf('function blocked(')),context);
const R=vm.runInContext('OceanRegions',context),camera=vm.runInContext('updateCamera',context),clone=v=>JSON.parse(JSON.stringify(v));
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
function place(p,yaw=0,pitch=0){context.player.p=p.slice();context.player.yaw=yaw;context.player.pitch=pitch;context.cameraCut=true;camera(.1);}
function safe(label){const p=context.player.p,eye=context.eye;assert(!R.pointBlocked(p,.4),label+' diver must be in legitimate water');assert(eye.every(Number.isFinite),label+' non-finite camera');assert(!R.pointBlocked(eye,.01),label+' camera inside solid '+JSON.stringify(eye));assert(!R.segmentBlocked(p,eye,.01),label+' camera ray crossed region solid '+JSON.stringify({p,eye}));assert(Math.hypot(...eye.map((v,i)=>v-p[i]))<7,label+' camera displaced too far');}
check('third-person camera contracts before the cave roof',()=>{place([-218,-24,-70]);safe('north roof');});
check('third-person camera contracts before either corridor side wall',()=>{for(const yaw of [-Math.PI/2,Math.PI/2]){place([-218,-26,-70],yaw);safe('corridor side '+yaw);}});
check('camera stays within the chamber when looking away from its outer wall',()=>{place([-232,-26,-65],Math.PI/2);safe('chamber west wall');});
check('near-roof anchor does not place the camera above the legal diver clearance',()=>{for(const pitch of [-.4,0,.5]){place([-218,-23.45,-70],0,pitch);safe('near-roof pitch '+pitch);}});
check('smoothed orbit cannot cross a wall or roof between previously safe camera positions',()=>{place([-218,-24.8,-70]);for(let i=0;i<180;i++){context.player.yaw=-Math.PI+i*Math.PI*2/179;context.player.pitch=Math.sin(i*.09)*.4;context.cameraCut=false;camera(1/60);safe('orbit frame '+i);}});
check('archive room camera uses the same obstruction rule as the cave',()=>{for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){place([188,-48.1,-228],yaw,.15);safe('archive yaw '+yaw);}});
check('safe open water retains the established six-metre third-person offset',()=>{place([0,-6,23],0,0);assert.deepEqual(clone(context.eye),[.4,-4.52,29.3]);assert.deepEqual(clone(context.target),[0,-6,16.4]);});
// Exercise the production player movement entry points, not just resolve().
vm.runInContext(app.slice(app.indexOf('function collide('),app.indexOf('function dir(')),context);
vm.runInContext(app.slice(app.indexOf('function updatePlayer('),app.indexOf('function updateCamera(')),context);
Object.assign(context,{oceanFeatures:{pointerCaptured:()=>false},keys:new Set(),lookStick:[0,0],verticalInput:0,collisionNotice:0,t:0,toast:()=>{},stopAuto:()=>{},viewingOffset:()=>[0,0,0],lerpAngle:(a,b,f)=>a+(b-a)*f});
context.settings.speed=1;context.settings.sensitivity=1;
check('production manual swim sweeps a fast ascent before the thin cave roof',()=>{context.auto=false;context.player.p=[-218,-26,-70];context.player.velocity=[0,300,0];context.keys.clear();const from=context.player.p.slice();context.updatePlayer(.1);assert(context.player.p[1]<R.ceilingAt(context.player.p[0],context.player.p[2],-26)-.399,'endpoint beyond roof must not tunnel');assert(!R.pointBlocked(context.player.p,.399));assert(context.player.p[1]>from[1],'valid ascent still advances');});
check('production auto-follow carries the previous position into cave collision',()=>{context.auto=true;context.player.p=[-218,-26,-70];context.player.velocity=[0,0,0];context.follow={p:[-218,-5,-70]};context.updatePlayer(1);assert(context.player.p[1]<R.ceilingAt(context.player.p[0],context.player.p[2],-26)-.399,'follow must not cross the roof');assert(!R.pointBlocked(context.player.p,.399));context.auto=false;context.follow=null;});
check('intentional location changes remain endpoint-only rather than sweeping through intervening land',()=>{const destination=[-218,-5,-70];assert.deepEqual(clone(context.collide(destination.slice())),destination);});
// Boot the real navigation wrapper as the live app does; a direct app.collide
// test alone cannot catch a wrapper dropping the previous-position argument.
const navigationState={schema:1,mooring:'cave',moves:0};
Object.assign(context,{voyage:{state:{mode:'free',completed:[],visited:[],features:{},resume:null}},renderer:{batches:[{sceneRole:'research-vessel',instances:[{p:[-24,0,43]}]}]},jumpTo:()=>{},oceanFeatures:{pointerCaptured:()=>false,state:()=>navigationState,register(){},addMenu(){}}});
vm.runInContext(fs.readFileSync('src/navigation.js','utf8'),context,{filename:'navigation.js'});
vm.runInContext('oceanNavigation.feature.init()',context);
check('initialized navigation preserves movement sweep in free exploration and journey mode',()=>{
 for(const mode of ['free','journey']){context.voyage.state.mode=mode;context.auto=false;context.player.p=[-218,-26,-70];context.player.velocity=[0,300,0];context.keys.clear();context.updatePlayer(.1);assert(context.player.p[1]<R.ceilingAt(context.player.p[0],context.player.p[2],-26)-.399,mode+' navigation wrapper must carry from through the real collide entry');assert(!R.pointBlocked(context.player.p,.399));assert(context.player.p[1]>-26,'legitimate ascent still advances');}
 const destination=[-218,-5,-70];assert.deepEqual(clone(context.collide(destination.slice())),destination,'navigation keeps explicit location changes endpoint-only');
});
console.log(`${passed}/${passed+failed} regional camera checks passed`);if(failed)process.exitCode=1;
