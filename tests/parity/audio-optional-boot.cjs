/* Production boot dependency regression. UI, renderer and already-loaded scene
 * are fixture boundaries; OceanAudio and the whole boot function are real.
 * Native constructor failure is observed, not a simulated native hang. Browser
 * autoplay, first-frame pixels and acoustic output require the companion suite. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),audio=fs.readFileSync(path.join(root,'src/audio.js'),'utf8');
const start=app.indexOf('async function boot(){'),end=app.indexOf("window.addEventListener('error'",start);
assert(start>=0&&end>start,'The production boot seam must remain identifiable');
const boot=app.slice(start,end);

async function fixture({startWithSound,focused=true,hidden=false}){
 const events=[],elements=new Map();
 const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',disabled:true,classes:new Set(),classList:{add(...names){for(const name of names)elements.get(id).classes.add(name);},toggle(){}},setAttribute(){}});return elements.get(id);};
 const context={console:{warn(){}},URLSearchParams,location:{search:''},settings:{quality:1,startWithSound,sound:false,reduced:false},ready:false,active:false,lastTime:0,performance:{now:()=>0},SPECIES:[],life:[],decorLife:[],shoal:[],player:{p:[0,-10,0]},eye:[0,-10,0],target:[0,-10,-1],persistent:{seen:[],photos:[]},auto:false,modal:null,window:{},document:{hidden,hasFocus:()=>focused,body:{classList:{toggle(){}}}},$,matchMedia:()=>({matches:false}),
  // Timers are recorded; loading-overlay cleanup is irrelevant to first entry.
  setTimeout(fn,ms){events.push({event:'timer',ms,ready:context.ready});return events.length;},clearTimeout(){},
  requestAnimationFrame(fn){if(!context.ready)queueMicrotask(fn);},animate(){},
  oceanSaveGuard:{live:true,loaded(){}},oceanSaveHealth:{init(){events.push({event:'saveHealth',ready:context.ready});}},oceanFeatures:{async init(){}},oceanSelection:{init(){}},oceanDiveUI:{init(){}},loadCompiledScene:async()=>true,
  // The optional fish synchronously registers its logical actor. Its actual
  // loader/fault lifecycle is exercised by barramundi-owner-contract.cjs.
  oceanBarramundi:{ensure(){events.push({event:'ensureBarramundi',ready:context.ready});}},
  Renderer:class{constructor(){this.loaded=Promise.resolve();this.frame=0;}resize(){}render(){events.push({event:'firstRender',ready:context.ready});}},
  handleFailure(error){events.push({event:'failure',error:error.message});}
 };
 context.window.AudioContext=class{constructor(){events.push({event:'AudioContext',ready:context.ready,label:$('loadDetail').textContent,deadlineArmed:events.some(x=>x.event==='timer'&&x.ms===1500)});throw Error('Native constructor boundary is unavailable');}};
 for(const name of ['loadJournal','applyRecoveryGraphics','initializeIndividuals','makeThumb','setupControls','initIndividualUI','initVoyage','setCount','updateSoundUI','updateLife','updateCamera','applyVisualSettings'])context[name]=()=>{};
 vm.createContext(context);vm.runInContext(audio+'\n'+boot,context);await context.boot();
 return {context,events,$,audio:vm.runInContext('oceanAudio',context)};
}

(async()=>{
 const results=[];
 for(const config of [{startWithSound:true},{startWithSound:false},{startWithSound:true,focused:false},{startWithSound:true,hidden:true}]){
  const f=await fixture(config),name='Optional audio boot '+JSON.stringify(config);
  try{
   assert.equal(f.events.filter(x=>x.event==='AudioContext').length,0,'Boot must not touch the audio device before a real sound gesture: '+JSON.stringify(f.events));
   assert(f.context.ready&&f.context.window.__ocean.ready,'Production boot must publish readiness');
   assert(f.events.some(x=>x.event==='firstRender'&&x.ready),'The first renderer call must complete');
   assert.equal(f.$('startBtn').disabled,false);assert.equal(f.$('tourStart').disabled,false);
   assert(f.$('loading').classes.has('gone'),'The loading overlay must release entry');
   assert.equal(f.context.settings.startWithSound,config.startWithSound,'Boot preserves the saved sound preference');
   assert.equal(f.context.settings.sound,false);assert.equal(f.audio.ctx,null);assert.equal(f.audio.timer,null);assert.equal(f.audio.loading,null);assert.equal(f.audio.sources.length,0);
   assert(!f.events.some(x=>x.event==='failure'),'An optional sound device must not fail game boot');
   results.push({name,passed:true});
  }catch(error){results.push({name,passed:false,error:error.message});}
 }
 const report={scope:'CPU production boot dependency; controlled native constructor boundary, no native-hang or visual claim',passed:results.filter(x=>x.passed).length,total:results.length,results},out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
 if(out){const file=path.resolve(root,out);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
 if(results.some(x=>!x.passed))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
