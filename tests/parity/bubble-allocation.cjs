/* Compare real bubble updates and Float32 uploads with the original renderer.
 * Stable workspace must remove per-frame packing/filter arrays, not bubbles. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/engine.js'),'utf8'),reference=fs.readFileSync(path.join(__dirname,'fixtures/bubbles-v017.js'),'utf8');
function fixture(original=false){
 let typedAllocations=0;const uploads=[],draws=[],sources=[];
 const CountingFloat32=new Proxy(Float32Array,{construct(target,args){typedAllocations++;return Reflect.construct(target,args);}});
 const context=vm.createContext({console,performance,Float32Array:CountingFloat32});
 vm.runInContext(source+'\n'+reference+'\nlet active=true,follow=null;const settings={third:false},player={p:[2,-8,4],yaw:.3};const oceanAudio={enabled:false,ctx:null,startedAt:0};function dir(){return [.2,0,-.98];}let filters=0,slices=0;const arrayFilter=Array.prototype.filter,arraySlice=Array.prototype.slice;Array.prototype.filter=function(){filters++;return arrayFilter.apply(this,arguments)};Array.prototype.slice=function(){slices++;return arraySlice.apply(this,arguments)};',context);
 const Class=vm.runInContext(original?'ReferenceBubbles':'Renderer',context);
 const gl=new Proxy({bufferSubData(target,offset,data,start=0,count=data.length-start){uploads.push(Array.from(data.subarray(start,start+count)));sources.push(data);},drawArrays(mode,start,count){draws.push(count);}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const renderer=Object.assign(Object.create(Class.prototype),{gl,attr(){},common(){},uniform(){},canvas:{height:240},vp:[]});renderer.setupBubbles();
 return {context,renderer,uploads,draws,sources,resetCounts(){typedAllocations=0;vm.runInContext('filters=0;slices=0',context);},counts:()=>({typedAllocations,...vm.runInContext('({filters,slices})',context)})};
}
const snapshot=f=>JSON.parse(JSON.stringify({bubbles:f.renderer.bubbles,last:f.renderer.lastBubbleTime,time:f.renderer.bubbleTime,uploads:f.uploads,draws:f.draws}));
function run(f,scenario){
 const r=f.renderer;
 if(scenario==='cap')r.bubbles=Array.from({length:750},(_,i)=>({p:[i*.01,i%7===0?-.11:-2-i*.002,1],r:.02,a:i%9===0?9:8.95,phase:i*.03}));
 if(scenario==='boundary')r.bubbles=[{p:[1,-.121,2],r:.03,a:8.99,phase:.3},{p:[2,-3,4],r:.02,a:9,phase:1}];
 const frames=scenario==='cap'||scenario==='boundary'?6:1200;
 for(let i=0;i<frames;i++){
  if(scenario==='third')vm.runInContext('settings.third=true',f.context);
  if(scenario==='audio')vm.runInContext('oceanAudio.enabled=true;oceanAudio.ctx={currentTime:'+i/90+'}',f.context);
  if(scenario==='submersible'){r.submersible=i>=400&&i<700;}
  if(scenario==='inactive')vm.runInContext('active=false',f.context);
  r.renderBubbles([0,-8,0],i*(scenario==='boundary'?.1:1/120));
 }
 return snapshot(f);
}
const results=[];function check(name,fn){try{fn();results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message);}}
for(const scenario of ['first','third','audio','cap','boundary','submersible','inactive'])check('original bubble state, order and Float32 payload: '+scenario,()=>{
 assert.deepEqual(run(fixture(),scenario),run(fixture(true),scenario));
});
check('underwater frames reuse one packed buffer without filter/slice allocations',()=>{
 const current=fixture(),original=fixture(true);
 for(const f of [current,original]){f.renderer.bubbles=vm.runInContext('[{p:[0,-8,0],r:.02,a:0,phase:.5}]',f.context);f.resetCounts();for(let i=0;i<120;i++)f.renderer.renderBubbles([0,-8,0],i/120);}
 const before=original.counts(),after=current.counts();
 console.log('WORK '+JSON.stringify({frames:120,before,after}));
 assert.deepEqual(after,{typedAllocations:0,filters:0,slices:0});
 assert.equal(new Set(current.sources).size,1,'All uploads use the same packed workspace');
 assert.equal(current.sources[0].length,512*4,'Workspace matches existing GPU allocation');
 assert.ok(before.typedAllocations>=120&&before.filters===120&&before.slices===120,'Reference detects original per-frame churn');
});
console.log(`${results.filter(Boolean).length}/${results.length} bubble allocation checks passed`);if(results.includes(false))process.exitCode=1;
