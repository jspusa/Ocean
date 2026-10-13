/* Public ecology follow/whistle regression seam. Real catalogue, geometry,
 * projection, blocked() and collide(); explicit roster and flat-seabed fixtures.
 * No browser/GPU or natural encounter/recruitment claim.
 * Optional red baseline: --ecology-ref <git-ref> loads that ecology module only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),source=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const refAt=process.argv.indexOf('--ecology-ref'),ref=refAt<0?null:process.argv[refAt+1];
if(refAt>=0&&!ref)throw Error('--ecology-ref requires a git revision');
let state,now=0,saves=0,whistles=0;
const viewport={width:1440,height:900},context=vm.createContext({console,active:true,modal:null,photoOpen:false,focusFish:null,t:0,collisionNotice:0,eye:[0,-12,0],player:{p:[0,-12,0],yaw:0,pitch:0,velocity:[0,0,0]},renderer:{width:1440,height:900,canvas:{getBoundingClientRect:()=>({left:0,top:0,...viewport})},fov:69},settings:{fov:69,speed:.85},persistent:{seen:[]},voyage:{state:{},sessionDistance:0},saveVoyage(){saves++;return true},toast(){},releaseMouseLook(){},stopAuto(){},keys:new Set(),stick:[0,0],verticalInput:0,document:{getElementById:()=>null,body:{classList:{remove(){},contains:()=>false}}},oceanAudio:{cue(name){if(name==='whistle')whistles++}},oceanFeatures:{register(){},state:()=>state}});
for(const n of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','fauna_world'])vm.runInContext(source(n),context,{filename:n+'.js'});
const app=source('app');
vm.runInContext(app.slice(app.indexOf('function collide('),app.indexOf('function startDive(')),context,{filename:'app-collision-direction.js'});
vm.runInContext(app.slice(app.indexOf('function blocked('),app.indexOf('function observe(')),context,{filename:'app-line-of-sight.js'});
vm.runInContext('groundHeight=()=>-40;',context);
vm.runInContext(ref?cp.execFileSync('git',['show',ref+':src/ecology.js'],{cwd:root,encoding:'utf8'}):source('ecology'),context,{filename:ref?ref+':ecology.js':'ecology.js'});
const api=vm.runInContext('oceanEcology',context),species=vm.runInContext('SPECIES',context),actors=vm.runInContext('life',context),obstacles=vm.runInContext('obstacles',context),focus=vm.runInContext('animalFocusPoint',context),mesh=vm.runInContext('faunaGeometry',context),traits=vm.runInContext('partnerTraits',context);
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k])),plain=v=>JSON.parse(JSON.stringify(v));
function camera(){context.eye=context.player.p.slice();context.innerWidth=viewport.width;context.innerHeight=viewport.height;context.renderer.width=viewport.width;context.renderer.height=viewport.height;vm.runInContext('renderer.vp=mm(perspective(renderer.fov*Math.PI/180,renderer.width/renderer.height,.1,1000),lookAt(eye,V.add(eye,dir())))',context);}
function fresh(width=1440,height=900){state=api.initial();api.hooks.reset();actors.length=0;obstacles.length=0;now=0;saves=0;whistles=0;context.active=true;context.modal=null;context.player.p=[0,-12,0];context.player.yaw=0;context.player.pitch=0;context.player.velocity=[0,0,0];viewport.width=width;viewport.height=height;camera();api.afterLife(0);}
function actor(sp,position=[0,-12,-2]){const bounds=sp.modelBounds,f={uid:sp.id+'-001',species:species.indexOf(sp),fauna:true,p:position.slice(),home:position.slice(),s:[sp.size,sp.size,sp.size],yaw:0,pitch:0,bank:0,modelCenter:bounds.min.map((v,k)=>(v+bounds.max[k])*.5),retreat:0,faunaVisibility:1};actors.push(f);state.partners=[{uid:f.uid,name:sp.name,mastery:{},lastPerformance:null}];state.selected=f.uid;state.accompany=true;state.individuals[f.uid]={trust:30,seconds:8,strokes:5,feeds:0};return f;}
function tick(dt=.05){now+=dt;context.t=now;api.afterLife(now);camera();}
const results=[];
function check(name,run){try{const evidence=run();results.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+'\n  '+error.message);}finally{api.hooks.reset();actors.length=0;obstacles.length=0;context.active=false;context.modal=null;}}
for(const [label,w,h] of [['desktop',1440,900],['portrait',390,844]])for(const sp of species.filter(s=>s.cetacean))check(label+' '+sp.id+' remains visibly within contact reach after settling',()=>{
 fresh(w,h);const f=actor(sp),identity=plain([f.uid,f.home,f.s]);let maxDistance=0,unreachable=0,offscreen=0;
 for(let i=0;i<1200;i++){tick();if(i<400)continue;const d=distance(context.player.p,focus(f));maxDistance=Math.max(maxDistance,d);if(d>sp.traits.contactDistance+1e-6)unreachable++;if(!api.inRange(f,true))offscreen++;}
 assert.equal(unreachable,0,JSON.stringify({unreachable,maxDistance,contactDistance:sp.traits.contactDistance}));
 assert.equal(offscreen,0,'public inRange(contact=true) rejected '+offscreen+'/800 settled frames');
 assert.deepEqual(plain([f.uid,f.home,f.s]),identity,'following must not mutate size or home identity');
 return {maxDistance,contactDistance:sp.traits.contactDistance,frames:800};
});
function worldPoint(v,f){const cp=Math.cos(f.pitch||0),sp=Math.sin(f.pitch||0),cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),x=(v[0]*cp-v[1]*sp)*f.s[0],y=(v[0]*sp+v[1]*cp)*f.s[1],z=v[2]*f.s[2];return [f.p[0]+x*cy+z*sy,f.p[1]+y,f.p[2]-x*sy+z*cy];}
function obstacleQ(p,rock){return p.reduce((sum,n,i)=>sum+((n-rock.p[i])/rock.s[i])**2,0);}
for(const id of ['orca','commerson_dolphin'])for(const side of [1,-1])check(id+' whistle '+(side===1?'left-to-right':'right-to-left')+' detours around a large rock without teleporting and arrives in reach',()=>{
 fresh();context.player.p=[side*14,-12,0];camera();const sp=species.find(s=>s.id===id),f=actor(sp,[-side*14,-12,0]),identity=plain([f.uid,f.home,f.s]);
 const rock={p:[0,-12,0],s:[3,9,3]};obstacles.push(rock);state.accompany=false;
 const g=mesh(sp,true),unique=new Map();for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+3);unique.set(p.join(','),p);}const points=[...unique.values()];
 const before=f.p.slice();assert(api.whistle(),'selected partner must hear the whistle');assert.deepEqual(f.p,before,'whistle must not relocate the actor instantly');assert.equal(whistles,1);assert(saves>0);
 let maxStep=0,minCenterQ=Infinity,minMeshQ=Infinity,penetration=null,teleport=null;
 for(let i=0;i<1800;i++){const old=f.p.slice();tick();const step=distance(old,f.p);maxStep=Math.max(maxStep,step);if(step>traits(sp).approachSpeed*.05+1e-5&&!teleport)teleport={time:now,step,bound:traits(sp).approachSpeed*.05};const q=obstacleQ(f.p,rock);minCenterQ=Math.min(minCenterQ,q);if(q<1-1e-5&&!penetration)penetration={time:now,point:f.p.slice(),q};
  if(i%5===0)for(const local of points){const q=obstacleQ(worldPoint(local,f),rock);minMeshQ=Math.min(minMeshQ,q);if(q<1-1e-5&&!penetration)penetration={time:now,part:'visible model surface',q};}
 }
 assert.equal(teleport,null,'bounded movement violated: '+JSON.stringify(teleport));assert.equal(penetration,null,'actor entered rock: '+JSON.stringify(penetration));
 assert(distance(context.player.p,focus(f))<=sp.traits.contactDistance,'detour never arrived near player: '+JSON.stringify({position:f.p,distance:distance(context.player.p,focus(f)),contact:sp.traits.contactDistance,elapsed:now,maxStep,minCenterQ,minMeshQ}));assert(api.inRange(f,true),'arrived partner must be visible and interactable');assert.deepEqual(plain([f.uid,f.home,f.s]),identity);
 return {maxStep,minCenterQ,minMeshQ,finalDistance:distance(context.player.p,focus(f)),elapsed:now};
});
check('reset during a detour clears transient steering before the opposite-side call',()=>{
 fresh();context.player.p=[14,-12,0];camera();const sp=species.find(s=>s.id==='orca'),f=actor(sp,[-14,-12,0]),rock={p:[0,-12,0],s:[3,9,3]};obstacles.push(rock);assert(api.whistle());
 for(let i=0;i<65;i++)tick();assert(f.p[0]<0&&Math.abs(f.p[2])>1,'fixture must interrupt an actual detour');const saved=plain(state);
 api.hooks.reset();assert.equal(api.snapshot().partnerPosition,undefined);assert.equal(api.snapshot().grabbedUID,null);assert.equal(api.snapshot().training,null);assert.deepEqual(plain(state),saved,'cleanup preserves roster, name, knowledge and skills');
 // Same reef object, newly restored actor pose and reverse approach. A stale
 // side/forward waypoint must not leak into this resumed public whistle call.
 f.p=[14,-12,0];f.yaw=Math.PI;f.pitch=0;context.player.p=[-14,-12,0];camera();assert(api.whistle());let maxStep=0;
 for(let i=0;i<1800;i++){const old=f.p.slice();tick();maxStep=Math.max(maxStep,distance(old,f.p));assert(obstacleQ(f.p,rock)>=1-1e-5,'restored actor crossed the same rock');}
 assert(maxStep<=traits(sp).approachSpeed*.05+1e-5,'cleanup must not cause a jump');assert(api.inRange(f,true),'old detour direction leaked across reset');return {maxStep,finalDistance:distance(context.player.p,focus(f))};
});
console.log(JSON.stringify({scope:'CPU public API; explicit roster/flat-seabed fixtures; no GPU',ecologySource:ref||'working tree',passed:results.filter(r=>r.pass).length,total:results.length,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
