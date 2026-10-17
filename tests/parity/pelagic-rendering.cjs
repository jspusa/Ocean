/* Execute the real render collector without a GPU. Shader compilation and
 * appearance remain browser checks; this covers pass selection and LOD masks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),context,{filename:'engine.js'});
const Renderer=vm.runInContext('Renderer',context),fragment=vm.runInContext('FS',context),stop=Symbol('colour batches collected');
const planes=Array.from({length:6},()=>[0,0,0,1]);
function batch(id,options={}){return {id,visible:true,dynamic:true,shadow:true,kind:12,material:6,species:36,instances:[{p:[0,0,0],bioMorph:[1,1,1,1],bioGenes:[.5,.5,.5,.5]}],data:new Float32Array(24),radius:8,count:3,vertexCount:3,...options};}
function collect(batches,distance,mobile=false,quality=2){
 const draws=[],uniforms={};let framebuffer;
 // Stub only GPU IO. Production render(), culling and instance encoding run.
 const gl=new Proxy({bindFramebuffer:(_,value)=>{framebuffer=value;},uniform3f:(name,...values)=>{uniforms[name]=values;}},{get:(object,key)=>object[key]||(()=>{})});
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,batches,mobile,quality,width:800,height:600,canvas:{width:800,height:600},shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:[],shadowFBO:'static',dynamicShadowFBO:'dynamic',sceneFBO:'colour',shadowProgram:{},program:{},skyProgram:{},waterProgram:{},forceShadow:true,frustum:()=>planes,uniform:(_,name)=>name,bindTex(){},speciesUniforms(){},common(program){if(program===this.waterProgram)throw stop;},drawBatch(b){draws.push({id:b.id,pass:framebuffer,count:b.drawCount,bounds:uniforms.uLODBounds?.slice()});}});
 try{renderer.render([0,0,distance],[0,0,-1],12);}catch(error){if(error!==stop)throw error;}
 return draws;
}
// Execute the production fragment shader's scalar LOD branch in JavaScript.
// This small GLSL subset has identical scalar arithmetic; no restated mask rule.
const begin=fragment.indexOf('void main(){')+'void main(){'.length,end=fragment.indexOf('float membrane=1.;',begin);
assert(begin>=12&&end>begin,'production fragment LOD entry exists');
const source=fragment.slice(begin,end).replace('float dither=','const dither=').replaceAll('discard;','return false;');
const keep=new Function('bounds','vLodDistance','pixel',`
 const uLODBounds={x:bounds[0],y:bounds[1],z:bounds[2]},gl_FragCoord={xy:pixel};
 const fract=x=>x-Math.floor(x),vec2=(x,y)=>[x,y],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const smoothstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
 ${source}
 return true;
`);
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
function pair(boundary,material=6){return [batch('high',{maxDistance:boundary,material}),batch('low',{minDistance:boundary,maxDistance:320,shadow:false,material})];}
check('whale sharks enter the real dynamic shadow pass, with no far-LOD duplicate',()=>{
 const near=batch('near',{maxDistance:25.5}),far=batch('far',{minDistance:25.5,maxDistance:320}),hidden=batch('hidden',{visible:false}),absent=batch('absent',{instances:[{p:[0,0,0],ecologyPresent:false}]}),disabled=batch('disabled',{shadow:false});
 const draws=collect([near,far,hidden,absent,disabled],25.5);
 assert.deepEqual(draws.filter(d=>d.pass==='dynamic').map(d=>d.id),['near']);
 assert.deepEqual(draws.filter(d=>d.pass==='colour').map(d=>d.id),['near','far','disabled']);
});
check('both pelagic LODs upload the same transition at every desktop and mobile quality',()=>{
 for(const mobile of [false,true])for(const quality of [0,1,2])for(const boundary of [25.5,38,78]){
  const scale=mobile?(quality===0?.64:.82):(quality===0?.75:1),distance=boundary*scale;
  const draws=collect(pair(boundary),distance,mobile,quality).filter(d=>d.pass==='colour');
  assert.equal(draws.length,2);assert.equal(draws[0].bounds[1],distance);assert.equal(draws[1].bounds[0],distance);assert.equal(draws[0].bounds[2],.6);assert.equal(draws[1].bounds[2],.6);
 }
});
check('the production fragment masks keep exactly one surface across the shared boundary',()=>{
 const pixels=[[0,0],[.5,.5],[1,1],[12.5,55.5],[799.5,599.5],[1099.5,739.5]];
 for(const mobile of [false,true])for(const quality of [0,1,2]){
  const scale=mobile?(quality===0?.64:.82):(quality===0?.75:1),boundary=78*scale;
  for(const offset of [-.601,-.6,-.599,-.3,0,.3,.599,.6,.601]){
   const distance=boundary+offset,draws=collect(pair(78),distance,mobile,quality).filter(d=>d.pass==='colour');
   for(const pixel of pixels)assert.equal(draws.filter(d=>keep(d.bounds,distance,pixel)).length,1,JSON.stringify({mobile,quality,offset,pixel}));
  }
 }
});
check('opaque terrain still selects one LOD and never receives an animal dither mask',()=>{
 for(const offset of [-.001,0,.001]){
  const draws=collect(pair(100,1),100+offset).filter(d=>d.pass==='colour');
  assert.equal(draws.length,1);assert.equal(draws[0].id,offset<0?'high':'low');assert.equal(draws[0].bounds[2],0);
 }
});
console.log(`${passed}/${passed} pelagic rendering checks passed`);
