/* Production static mesh collection, with only WebGL IO stubbed. Bounds must
 * reject offscreen geometry without rejecting any transformed visible vertex. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];',context);
const Renderer=vm.runInContext('Renderer',context),open=Array.from({length:6},()=>[0,0,0,1]);let serial=0;
const gl=new Proxy({createBuffer:()=>++serial,createVertexArray:()=>++serial},{get:(o,k)=>k in o?o[k]:(()=>{})});
function make(min,max,instance={},options={}){
 const vertices=new Float32Array(8*12),points=[];for(let k=0;k<8;k++){const p=[k&1?max[0]:min[0],k&2?max[1]:min[1],k&4?max[2]:min[2]];points.push(p);vertices.set(p,k*12);vertices[k*12+4]=1;}
 const radius=Math.max(...points.map(p=>Math.hypot(...p))),renderer=Object.assign(Object.create(Renderer.prototype),{gl,mobile:false,quality:2,batches:[],renderOrigin:[0,0,0]}),batch=renderer.batch({indexed:{vertices,indices:new Uint32Array([0,1,2,1,2,3,4,5,6,5,6,7]),radius},material:options.material||2},[{p:[0,0,0],...instance}],options.kind||0,!!options.dynamic);
 return {renderer,batch,points};
}
function count(f,planes,shadow=false){f.renderer.updateBatch(f.batch,[0,0,0],planes,shadow);return f.batch.drawCount;}
const results=[];function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message);}}
check('off-centre rigid geometry outside the actual frustum is not submitted',()=>{
 const f=make([50,-20,-20],[60,-10,-10]);assert.equal(count(f,[[-1,0,0,0],...open.slice(1)]),0);
});
check('thin trench geometry outside a side plane is not kept by its long radius',()=>{
 const f=make([-5,-73,-305],[5,73,305],{p:[50,0,0]});assert.equal(count(f,[[-1,0,0,0],...open.slice(1)],true),0);
});
check('pitch, yaw and nonuniform scale retain every box vertex on the visible side',()=>{
 for(const yaw of [0,.7,Math.PI/2,2.8])for(const pitch of [0,.6,-.8])for(const scale of [[1,1,1],[3,.4,2]]){
  const f=make([4,-7,-3],[9,-2,5],{yaw,pitch,s:scale}),c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),points=f.points.map(([x,y,z])=>{const a=(x*cp-y*sp)*scale[0],b=(x*sp+y*cp)*scale[1],d=z*scale[2];return [c*a+s*d,b,-s*a+c*d];});
  for(const normal of [[1,0,0],[0,1,0],[0,0,1],[.6,.4,.7]]){
   const extreme=Math.max(...points.map(p=>p.reduce((n,v,i)=>n+v*normal[i],0))),plane=[...normal,-extreme+.001];assert.equal(count(f,[plane,...open.slice(1)]),1,JSON.stringify({yaw,pitch,scale,normal}));
  }
 }
});
check('instance mutations and render-origin shifts cannot reuse stale world bounds',()=>{
 const f=make([50,-20,-20],[60,-10,-10]),planes=[[-1,0,0,0],...open.slice(1)];assert.equal(count(f,planes),0);f.batch.instances[0].p[0]=-80;assert.equal(count(f,planes),1);f.renderer.renderOrigin=[64,-7040,-128];assert.equal(count(f,planes),1);assert.equal(f.batch.data[0],-144);
});
check('animated and shader-deformed meshes keep their conservative original collection',()=>{
 for(const options of [{dynamic:true},{kind:3,material:9},{material:3},{material:4},{material:7},{material:8}]){
  const f=make([50,-20,-20],[60,-10,-10],{},options);assert.equal(count(f,[[-1,0,0,0],...open.slice(1)]),1);
 }
});
console.log(`${results.filter(Boolean).length}/${results.length} spatial culling checks passed`);if(results.includes(false))process.exitCode=1;
