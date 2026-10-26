/* Production render() cache lifecycle, with GL IO mocked. A fixed world point
 * must address the same shadow texel via public and actual GPU coordinates.
 * This tests coordinates and invalidation, not pixels or visual performance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine.js'),'utf8'),context,{filename:'engine.js'});
const Renderer=vm.runInContext('Renderer',context);
function fixture(){
 let program=null;const matrices=[];
 const gl=new Proxy({
  useProgram(p){program=p;},getUniformLocation:(_,name)=>name,
  uniformMatrix4fv(name,transpose,matrix){assert.equal(transpose,false);matrices.push({program,name,matrix:Array.from(matrix)});}
 },{get:(o,k)=>k in o?o[k]:()=>{}});
 const programs=Object.fromEntries(['program','shadowProgram','skyProgram','waterProgram','pointProgram','volumeProgram','volumeFilterProgram','postProgram','aaProgram'].map(name=>[name,{p:name,u:{}}]));
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,...programs,batches:[],mobile:false,quality:2,width:800,height:600,canvas:{width:800,height:600},
  shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:[],fog:[.0008,.005,.028],fogDensity:.034,clarity:1,exposure:1.11,
  shadowFBO:'static',dynamicShadowFBO:'dynamic',sceneFBO:'scene',volumeFBO:'volume',volumeFilteredFBO:'filter',aaFBO:'aa',volumeW:400,volumeH:300,
  waterCount:3,bubbles:[],submersible:true,frame:0});
 return {renderer,matrices,render(eye,time=8){matrices.length=0;return renderer.render(eye,[eye[0],eye[1],eye[2]-15],time);}};
}
function pixel(p,m,size){const w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [0,1].map(i=>((m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i])/w*.5+.5)*size);}
function projectionError(renderer,point){
 const world=pixel(point,renderer.lightVP,renderer.shadowSize),relative=pixel(point.map((v,i)=>v-renderer.renderOrigin[i]),renderer.renderLightVP,renderer.shadowSize);
 return Math.max(...world.map((v,i)=>Math.abs(v-relative[i])));
}
const checks=[];
function check(name,run){try{run();checks.push(true);console.log('PASS '+name);}catch(error){checks.push(false);console.error('FAIL '+name+': '+error.message);}}
const boundaries=[
 [[0,-499.999,7],[0,-500.001,7]],
 // 0.18.23 omits solar maps at 7000 m. Exercise the same three origin
 // boundaries at 2000 m, where these shadow projections are still consumed.
 [[31.999,-2000,-120],[32.001,-2000,-120]],
 [[766,-2015.999,-120],[766,-2016.001,-120]],
 [[766,-2000,-95.999],[766,-2000,-96.001]]
];
check('entering and leaving relative-origin boundaries rebuilds the actual static shadow projection',()=>{
 for(const boundary of boundaries)for(const reverse of [false,true]){
  const [start,end]=reverse?boundary.slice().reverse():boundary,f=fixture(),r=f.renderer;f.render(start);const beforeOrigin=r.renderOrigin.slice();
  f.render(end);assert.notDeepEqual(Array.from(r.renderOrigin),Array.from(beforeOrigin),'fixture must change origin');
  for(const offset of [[3,-8,-12],[-6,2,-18],[12,-2,4]]){
   const p=end.map((v,i)=>v+offset[i]),error=projectionError(r,p);
   assert(error<.01,`origin ${start} -> ${end}: GPU/public shadow mismatch ${error} texels`);
  }
  assert.equal(r.staticShadowUpdates,2,'changed origin invalidates the map once');
 }
});
check('surface and volume programs receive the rebuilt relative light matrix in the same frame',()=>{
 const f=fixture(),r=f.renderer;f.render(boundaries[2][0]);f.render(boundaries[2][1]);
 assert.equal(r.staticShadowUpdates,2);
 for(const name of ['shadowProgram','skyProgram','waterProgram','volumeProgram','postProgram']){
  const upload=f.matrices.find(x=>x.program===name&&x.name==='uLightVP');assert(upload,'missing upload for '+name);
  assert.deepEqual(upload.matrix,Array.from(r.renderLightVP));
 }
});
check('continuous motion within one origin and shadow cell retains the static map',()=>{
 const f=fixture(),r=f.renderer;f.render([766,-2000,-120]);const initial=Array.from(r.renderLightVP);
 for(let i=1;i<=60;i++){const eye=[766+i*.005,-2000+i*.005,-120+i*.005];f.render(eye,8+i/60);assert.equal(r.staticShadowUpdates,1);assert.deepEqual(Array.from(r.renderLightVP),initial);assert(projectionError(r,[776,-2002,-130])<.01);}
});
check('shadow-cell movement, lighting edits and explicit refresh still invalidate independently',()=>{
 const f=fixture(),r=f.renderer;f.render([7.999,-8,7]);f.render([8.001,-8,7]);assert.equal(r.staticShadowUpdates,2);
 r.lighting='late';f.render([8.001,-8,7]);assert.equal(r.staticShadowUpdates,3);
 r.forceShadow=true;f.render([8.001,-8,7]);assert.equal(r.staticShadowUpdates,4);assert.equal(r.forceShadow,false);
 f.render([8.001,-8,7]);assert.equal(r.staticShadowUpdates,4);
});
console.log(`${checks.filter(Boolean).length}/${checks.length} shadow origin checks passed`);
if(checks.includes(false))process.exitCode=1;
