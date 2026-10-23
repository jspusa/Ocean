/* Region eligibility must be a conservative superset of actual rendering.
 * Exercise the authored world and the production instance collector without GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),selectorPath=path.join(root,'src/scene_stream.js'),context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(root,'src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context);
assert(fs.existsSync(selectorPath),'The streamed-scene eligibility seam must exist');vm.runInContext(fs.readFileSync(selectorPath,'utf8'),context,{filename:'scene_stream.js'});
assert.equal(vm.runInContext('typeof streamBatchNear',context),'function');
const near=vm.runInContext('streamBatchNear',context),preload=vm.runInContext('streamPreloadEyes',context),Renderer=vm.runInContext('Renderer',context),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)));
const open=Array.from({length:6},()=>[0,0,0,1]),center=p=>[Math.round(p[0]/16)*16,Math.round(p[1]/16)*16-4,Math.round(p[2]/16)*16-12],batches=header.batches.map(meta=>({...meta,visible:meta.visible!==false,instances:meta.instanceIDs.map(id=>header.nodes[id]),data:new Float32Array(meta.instanceIDs.length*24)}));
const views=[[18,-10.5,28],[0,-8,7],[-8.1,-8.1,-8.1],[-24.1,-24.1,-24.1],[-218,-26,-69],[176,-49,-197],[390,-32,-184],[766,-7000,-120],[300,-1400,-230],[870,-6200,-100]];
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('every real color or static-shadow instance remains eligible across qualities and regions',()=>{
 let compared=0,accepted=0;
 for(const mobile of [false,true])for(const quality of [0,1,2]){
  const renderer=Object.assign(Object.create(Renderer.prototype),{gl:{ARRAY_BUFFER:1,bindBuffer(){},bufferSubData(){}},mobile,quality,renderOrigin:[0,0,0]}),scale=mobile?(quality===0?.64:.82):(quality===0?.75:1);
  for(const eye of views)for(const b of batches){
   if(!b.visible)continue;renderer.updateBatch(b,eye,open);compared++;
   if(b.drawCount){accepted++;assert.equal(near(b,eye,0,scale),true,'color '+JSON.stringify({eye,mobile,quality,kind:b.kind,max:b.maxDistance}));}
   if(!b.dynamic&&b.shadow!==false&&b.kind!==3){renderer.updateBatch(b,center(eye),open,true);compared++;
    if(b.drawCount){accepted++;assert.equal(near(b,eye,0,scale),true,'shadow '+JSON.stringify({eye,mobile,quality,kind:b.kind,max:b.maxDistance}));}}
  }
 }
 assert(accepted>1000);console.log('  production collector comparisons: '+compared+', nonempty draws: '+accepted);
});
check('visibility, exact distance boundary and maxDistance above 220 retain their semantics',()=>{
 const b={visible:true,shadow:false,kind:0,instances:[{p:[1000.6,0,0]}],maxDistance:1000};
 assert.equal(near(b,[0,0,0]),true);b.instances[0].p[0]+=1e-6;assert.equal(near(b,[0,0,0]),false);
 b.instances[0].p=[300,0,0];b.maxDistance=420;assert.equal(near(b,[0,0,0]),true);assert.equal(near(b,[0,0,0],0,.64),false);
 b.visible=false;assert.equal(near(b,[300,0,0],10000),false);
});
check('shadow eligibility uses original rounded center, negative coordinates and pass exclusions',()=>{
 for(const eye of [[0,0,0],[-8.1,-8.1,-8.1],[-24.1,-24.1,-24.1]]){
  const b={visible:true,shadow:true,dynamic:false,kind:0,maxDistance:1,instances:[{p:center(eye)}]};assert.equal(near(b,eye),true);
  b.shadow=false;assert.equal(near(b,eye),false);b.shadow=true;b.dynamic=true;assert.equal(near(b,eye),false);b.dynamic=false;b.kind=3;assert.equal(near(b,eye),false);
 }
});
check('live instance relocation and replacement never reuse stale regional bounds',()=>{
 const b={visible:true,shadow:false,sceneRole:'research-vessel',kind:0,maxDistance:600,instances:[{p:[900,0,0]}]};
 assert.equal(near(b,[0,0,0]),false);b.instances[0].p=[1,0,0];assert.equal(near(b,[0,0,0]),true);
 b.instances=[{p:[-2000,0,0]}];assert.equal(near(b,[0,0,0]),false);assert.equal(near(b,[-2000,0,0]),true);
});
check('directional preload predicts the real three-second destination at 60 and 120 Hz',()=>{
 for(const hz of [60,120])for(const speed of [0,5,260])for(const eye of [[0,-8,7],[300,-1400,-230],[766,-7000,-120]])for(const direction of [[1,0,0],[0,-1,0],[.6,0,.8]]){
  const previous=eye.map((v,i)=>v-direction[i]*speed/hz),points=preload(eye,previous,1/hz),destination=eye.map((v,i)=>v+direction[i]*speed*3);
  assert(points.length>=1);assert.equal(points[0],eye);assert(Math.hypot(...points.at(-1).map((v,i)=>v-destination[i]))<1e-8,'High-refresh displays must not underestimate travel velocity');
  for(const point of points)for(const b of batches)if(near(b,point,0,1))assert.equal(points.some(p=>near(b,p,48,1)),true,'Sampled future draw must be in the actual preload set');
 }
});
check('camera cuts and unavailable velocity never preload a giant surrounding map',()=>{
 const eye=[0,-8,7];for(const [previous,seconds]of [[null,1/60],[[-1000,-8,7],1/60],[eye,0]])assert.equal(preload(eye,previous,seconds).length,1);
 const points=preload(eye,[-260/120,-8,7],1/120),side={visible:true,shadow:false,kind:0,maxDistance:5.5,instances:[{p:[0,-8,107]}]},behind={...side,instances:[{p:[-100,-8,7]}]};
 assert.equal(points.some(p=>near(side,p,48,1)),false);assert.equal(points.some(p=>near(behind,p,48,1)),false);
});
check('actual 48 m directional preload covers draws at every 10 m along the travel path',()=>{
 let futureDraws=0;
 for(const hz of [60,120])for(const speed of [0,5,260])for(const eye of [[0,-8,7],[300,-1400,-230],[766,-7000,-120]])for(const direction of [[1,0,0],[0,-1,0],[.6,0,.8]]){
  const previous=eye.map((v,i)=>v-direction[i]*speed/hz),points=preload(eye,previous,1/hz),steps=Math.max(1,Math.ceil(speed*3/10));
  for(let step=0;step<=steps;step++){
   const seconds=step/steps*3,future=eye.map((v,i)=>v+direction[i]*speed*seconds);
   for(const b of batches)if(near(b,future,0,1)){futureDraws++;assert.equal(points.some(p=>near(b,p,48,1)),true,'continuous path has a preload gap '+JSON.stringify({hz,speed,eye,direction,seconds,max:b.maxDistance}));}
   // Tiny colonies expose gaps that distant terrain's larger range can hide.
   const tiny={visible:true,shadow:false,kind:0,maxDistance:5.5,instances:[{p:future}]};assert.equal(points.some(p=>near(tiny,p,48,1)),true);
  }
 }
 console.log('  continuous-path future draw checks: '+futureDraws);
});
check('distant static world is actually excluded rather than loading the full map',()=>{
 const staticWorld=batches.filter(b=>!b.dynamic),required=p=>staticWorld.filter(b=>near(b,p,0,1)).length,home=required(views[0]),hadal=required([766,-7000,-120]);
 assert(home<staticWorld.length);assert(hadal<home);console.log('  static batch candidates: home '+home+', hadal '+hadal+' of '+staticWorld.length);
});
console.log(checks+' streaming region eligibility checks passed');
