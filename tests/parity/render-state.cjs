/* Execute production render passes; only GL IO is stubbed. Draw order and
 * material/species state must remain correct while redundant uniforms disappear. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8')+'\nconst BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];const SPECIES=[{materialProfile:{roughness:.4,subsurface:.2,patternScale:2,skin:"fish"},motionProfile:{type:"snailfish"}}];',context);
const Renderer=vm.runInContext('Renderer',context),stop=Symbol('colour complete'),open=Array.from({length:6},()=>[0,0,0,1]);
function fixture(){
 const calls=[],draws=[],programStates=new Map();let pass,uniforms={};
 const gl=new Proxy({bindFramebuffer(_,value){pass=value;},uniform1i(name,...values){calls.push({pass,name,values});uniforms[name]=values;},uniform3f(name,...values){calls.push({pass,name,values});uniforms[name]=values;},uniform4f(name,...values){calls.push({pass,name,values});uniforms[name]=values;}},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const batch=(id,material=1,species=-1)=>({id,kind:0,material,species,dynamic:false,visible:true,shadow:true,radius:1,instances:[{p:[0,0,0]}],data:new Float32Array(24),count:3,vertexCount:3});
 const batches=[batch('terrain-a'),batch('terrain-b'),batch('rock',2),batch('terrain-c'),batch('animal',6,0)];
 const renderer=Object.assign(Object.create(Renderer.prototype),{gl,batches,mobile:false,quality:2,width:800,height:600,canvas:{width:800,height:600},shadowSize:2048,dynamicShadowSize:1024,lighting:'day',textures:[],shadowFBO:'static',dynamicShadowFBO:'dynamic',sceneFBO:'colour',shadowProgram:{},program:{},skyProgram:{},waterProgram:{},forceShadow:true,frustum:()=>open,uniform:(_,name)=>name,bindTex(){},common(p){if(p===this.waterProgram)throw stop;if(!programStates.has(p))programStates.set(p,{});uniforms=programStates.get(p);},drawBatch(b){draws.push({pass,id:b.id,uniforms:JSON.parse(JSON.stringify(uniforms))});}});
 const render=()=>{try{renderer.render([0,0,5],[0,0,-1],8);}catch(e){if(e!==stop)throw e;}};
 return {renderer,batches,calls,draws,render};
}
const results=[];function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message);}}
// v45 reuses the formerly unused normal-map slot for turtle skin. Preserve the
// v0.17 recording; permit exactly this name change, only at the same unit 5.
function normalizeSlotFive(draws){
 const result=structuredClone(draws);
 for(const draw of result)if(Object.hasOwn(draw.uniforms,'uTurtleSkin')){
  assert.equal(draw.pass,'colour');assert(!Object.hasOwn(draw.uniforms,'uShellN'));assert.deepEqual(draw.uniforms.uTurtleSkin,[5]);
  draw.uniforms.uShellN=draw.uniforms.uTurtleSkin;delete draw.uniforms.uTurtleSkin;
 }return result;
}
check('every submitted mesh retains v0.17 state except the explicit same-unit turtle sampler rename',()=>{
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/render-state-v017.json'),'utf8')),f=fixture();f.render();
 const oldSlots=original.draws.filter(d=>Object.hasOwn(d.uniforms,'uShellN'));assert.equal(oldSlots.length,5);assert(oldSlots.every(d=>d.pass==='colour'&&d.uniforms.uShellN.length===1&&d.uniforms.uShellN[0]===5));
 if(vm.runInContext('FS.includes("uniform sampler2D uTurtleSkin;")',context))assert.equal(f.draws.filter(d=>Object.hasOwn(d.uniforms,'uTurtleSkin')).length,oldSlots.length,'every historical slot-5 write must remain present');
 assert.deepEqual(normalizeSlotFive(f.draws),original.draws);
});
check('slot normalization rejects unit changes, duplicate aliases and unrelated render-state drift',()=>{
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/render-state-v017.json'),'utf8')),f=fixture();f.render();
 const candidate=structuredClone(f.draws),draw=candidate.find(d=>d.pass==='colour');if(Object.hasOwn(draw.uniforms,'uShellN')){draw.uniforms.uTurtleSkin=draw.uniforms.uShellN;delete draw.uniforms.uShellN;}
 const wrongUnit=structuredClone(candidate);wrongUnit.find(d=>d.pass==='colour').uniforms.uTurtleSkin=[4];assert.throws(()=>normalizeSlotFive(wrongUnit));
 const duplicate=structuredClone(candidate);duplicate.find(d=>d.pass==='colour').uniforms.uShellN=[5];assert.throws(()=>normalizeSlotFive(duplicate));
 const wrongMaterial=structuredClone(candidate);wrongMaterial.find(d=>d.pass==='colour').uniforms.uMat=[99];assert.throws(()=>assert.deepEqual(normalizeSlotFive(wrongMaterial),original.draws));
 const wrongOrder=structuredClone(candidate);[wrongOrder[0],wrongOrder[1]]=[wrongOrder[1],wrongOrder[0]];assert.throws(()=>assert.deepEqual(normalizeSlotFive(wrongOrder),original.draws));
});
check('one pass updates each consecutive repeated material/species state only when needed',()=>{
 const f=fixture();f.render();const main=f.calls.filter(c=>c.pass==='colour');
 assert.equal(main.filter(c=>c.name==='uKind').length,1);assert.equal(main.filter(c=>c.name==='uMat').length,4);assert.equal(main.filter(c=>c.name==='uSpecies').length,2);assert.equal(main.filter(c=>c.name==='uLODBounds').length,1);assert.equal(main.filter(c=>c.name==='uSurfaceProfile').length,2);
});
check('draw ordering and every mesh material remain identical across all passes',()=>{
 const f=fixture();f.render();for(const pass of ['static','colour']){const draws=f.draws.filter(d=>d.pass===pass);assert.deepEqual(draws.map(d=>d.id),f.batches.map(b=>b.id));for(let i=0;i<draws.length;i++){assert.equal(draws[i].uniforms.uMat[0],f.batches[i].material);assert.equal(draws[i].uniforms.uSpecies[0],f.batches[i].species);assert.equal(draws[i].uniforms.uKind[0],0);}}
});
check('each frame and shader pass starts with fresh state after metadata changes',()=>{
 const f=fixture();f.render();f.calls.length=0;f.draws.length=0;f.renderer.forceShadow=true;f.batches[0].material=12;f.batches[0].species=3;f.render();for(const pass of ['static','colour']){const first=f.draws.find(d=>d.pass===pass);assert.equal(first.uniforms.uMat[0],12);assert.equal(first.uniforms.uSpecies[0],3);}
});
check('species surface and rig uniforms refresh after a profile changes between frames',()=>{
 const f=fixture();f.render();const animal=f.draws.find(d=>d.pass==='colour'&&d.id==='animal');assert.deepEqual(animal.uniforms.uSurfaceProfile,[.4,.2,2,0]);assert.deepEqual(animal.uniforms.uRigClass,[3]);
 vm.runInContext('SPECIES[0].materialProfile.roughness=.9;SPECIES[0].motionProfile.type="vampire";',context);f.draws.length=0;f.render();const updated=f.draws.find(d=>d.pass==='colour'&&d.id==='animal');assert.deepEqual(updated.uniforms.uSurfaceProfile,[.9,.2,2,0]);assert.deepEqual(updated.uniforms.uRigClass,[1]);
});
console.log(`${results.filter(Boolean).length}/${results.length} render state checks passed`);if(results.includes(false))process.exitCode=1;
