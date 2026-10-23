/* Full production residency updates against the established needed() selector.
 * The same live data must produce the same required/preload/keep sets and job
 * order, while a steady frame stops scanning it separately for each padding. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),manifest=fs.readFileSync(path.join(root,'assets/scene/index.json'),'utf8');
function fixture(){
 let clock=10000,reads=0;const context=vm.createContext({console,performance:{now:()=>clock},URL,location:{href:'http://localhost/'},manifest});
 for(const name of ['engine','scene_stream'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context,{filename:name+'.js'});
 vm.runInContext('const index=JSON.parse(manifest),renderer=Object.assign(Object.create(Renderer.prototype),{mobile:false,quality:2,batches:[],gl:{UNSIGNED_SHORT:2,deleteBuffer(){},deleteVertexArray(){}}});globalThis.stream=new SceneStream(renderer,index,"assets/scene/index.json");globalThis.indexData=index;',context);
 for(const f of context.indexData.nodes){let p=f.p;Object.defineProperty(f,'p',{get(){reads++;return p;},set(value){p=value;}});}
 const stream=context.stream,requests=[];let kept;
 for(const m of stream.meshes){m.resident=true;m.lastNeeded=clock;}
 stream.request=(id,priority)=>{requests.push([id,priority]);return Promise.resolve();};
 const trim=stream.trim;stream.trim=function(ids,now){kept=Array.from(ids);return trim.call(this,ids,now);};
 const preload=vm.runInContext('streamPreloadEyes',context);
 function frame(eye,{prefetch=true,advance=1000/60}={}){
  clock+=advance;requests.length=0;kept=undefined;
  const required=stream.needed(eye),ready=Array.from(required).every(id=>stream.meshes[id].resident),expectedRequests=Array.from(required).filter(id=>!stream.meshes[id].resident).map(id=>[stream.meshes[id].meta.chunk,0]);
  let expectedKeep;
  if(prefetch){
   const ahead=new Set(),keep=stream.needed(eye,128),points=preload(eye,stream.lastEye,(clock-stream.lastTime)/1000);
   for(const point of points)for(const id of stream.needed(point,48))ahead.add(id);
   if(ready)for(const id of ahead){keep.add(id);const m=stream.meshes[id];if(!m.resident)expectedRequests.push([m.meta.chunk,1]);}
   expectedKeep=Array.from(keep);
  }
  reads=0;const result=stream.update(eye,prefetch),actualReads=reads;
  assert.equal(result,ready);assert.deepEqual(requests,expectedRequests,'Chunk priorities and order must match the public selector');assert.deepEqual(kept,expectedKeep,'Retained mesh IDs and insertion order must match the public selector');
  return actualReads;
 }
 return {stream,renderer:stream.renderer,index:context.indexData,frame,get reads(){return reads;},reset(){reads=0;}};
}
const checks=[];function check(name,run){try{run();checks.push(true);console.log('PASS '+name);}catch(error){checks.push(false);console.error('FAIL '+name+': '+error.message);}}
check('steady production updates reduce repeated position reads without changing residency',()=>{
 for(const eye of [[0,-8,7],[390,-32,-184],[766,-7000,-120]]){
  const f=fixture();f.frame(eye);f.reset();f.stream.needed(eye);f.stream.needed(eye,48);f.stream.needed(eye,128);const before=f.reads,after=f.frame(eye);
  console.log('  position reads '+JSON.stringify(eye)+': '+before+' -> '+after);assert(after<before*.8,'A steady frame must avoid three separate current-eye scans');
 }
});
check('all live ranges preserve selectors across qualities, shadow centres and continuous travel',()=>{
 const views=[[0,-8,7],[-8.1,-8.1,-8.1],[-24.1,-24.1,-24.1],[390,-32,-184],[766,-7000,-120]];
 for(const mobile of [false,true])for(const quality of [0,1,2])for(const speed of [0,5,260]){
  const f=fixture();f.renderer.mobile=mobile;f.renderer.quality=quality;
  for(const p of views){f.frame(p);f.frame(p.map((v,k)=>v+(k===0?speed/60:0)));}
 }
});
check('visibility, ranges, pinned state, relocated and replaced instances invalidate naturally',()=>{
 const f=fixture(),views=[[0,-8,7],[-218,-26,-69],[390,-32,-184],[766,-7000,-120]];
 for(let i=0;i<18;i++){
  const b=f.renderer.batches[i*13],m=f.stream.meshes[b.streamMesh];b.visible=i%3!==0;b.maxDistance=[0,-100,1,420,1000][i%5];m.pinned=i%4===0;
  if(i%2)b.instances=b.instances.map(x=>({...x,p:x.p.map((v,k)=>v+(k===0?i*37:0))}));else if(b.instances.length)b.instances[0].p[1]-=i*31;
  for(const eye of views)f.frame(eye);
 }
});
check('missing required or preload geometry preserves request order and readiness gates',()=>{
 for(const ready of [false,true]){
  const f=fixture(),eye=[0,-8,7],required=f.stream.needed(eye);
  for(const m of f.stream.meshes)if(ready?!required.has(m.id):m.id%7===0)m.resident=false;
  f.frame(eye);f.frame([.08,-8,7]);
 }
});
check('non-prefetch updates retain the original readiness-only path',()=>{
 const f=fixture();for(const eye of [[0,-8,7],[766,-7000,-120]]){f.frame(eye,{prefetch:false});f.stream.meshes[0].resident=false;f.frame(eye,{prefetch:false});}
});
console.log(`${checks.filter(Boolean).length}/${checks.length} scene stream efficiency checks passed`);if(checks.includes(false))process.exitCode=1;
