/* CPU audio-routing regression: real OceanAudio start/loadLocal/tick and graph.
 * Web Audio primitives record connections and gain targets; no codec, waveform,
 * acoustic playback, browser autoplay, or gradual fade timing is simulated. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/audio.js'),'utf8');

class Parameter {
 constructor(value=0){this.value=value;}
 setTargetAtTime(value){this.value=value;}
 setValueAtTime(value){this.value=value;}
 linearRampToValueAtTime(value){this.value=value;}
 exponentialRampToValueAtTime(value){this.value=value;}
}
class Node {
 constructor(kind){
  this.kind=kind;this.connections=new Set();this.started=false;this.stopped=false;
  for(const key of ['gain','frequency','Q','pan','threshold','knee','ratio','attack','release'])this[key]=new Parameter(key==='gain'?1:0);
 }
 connect(node){this.connections.add(node);return node;}
 disconnect(){this.connections.clear();}
 start(){this.started=true;}
 stop(){this.stopped=true;}
}
class AudioContext {
 constructor(){this.currentTime=1;this.sampleRate=24000;this.state='suspended';this.nodes=[];this.destination=this.node('destination');}
 node(kind){const node=new Node(kind);this.nodes.push(node);return node;}
 createGain(){return this.node('gain');}
 createDynamicsCompressor(){return this.node('compressor');}
 createAnalyser(){return this.node('analyser');}
 createBiquadFilter(){return this.node('filter');}
 createBufferSource(){return this.node('bufferSource');}
 createOscillator(){return this.node('oscillator');}
 createStereoPanner(){return this.node('panner');}
 createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:index=>data[index]};}
 async decodeAudioData(){return {decodedFixture:true};}
 async resume(){this.state='running';}
 async suspend(){this.state='suspended';}
 async close(){this.state='closed';}
}
// Follow the graph built by production start()/loadLocal(), rather than assuming
// which master/music node a source is connected to. Filters pass control gain;
// this is a routing assertion, not measured audio amplitude or human audibility.
function outputGain(source,destination,seen=new Set()){
 if(source.stopped||seen.has(source))return 0;
 if(source===destination)return 1;
 const visited=new Set(seen);visited.add(source);
 const downstream=[...source.connections].reduce((sum,node)=>sum+outputGain(node,destination,visited),0);
 return (source.kind==='gain'?source.gain.value:1)*downstream;
}
async function fixture(start=true){
 const notices=[],settings={sound:true,master:.7,music:.5,ambience:.6,breath:.8};
 const context=vm.createContext({console,window:{AudioContext},document:{hidden:false},settings,
  active:false,modal:'shipRest',photoOpen:false,shipMode:'rest',training:null,renderer:{submersible:false},surface:false,
  player:{p:[0,0,0],velocity:[0,0,0]},MUSIC:{shallows:'data:audio/mpeg;base64,AA==',blue_silence:'data:audio/mpeg;base64,AA=='},
  atob,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),mix:(a,b,t)=>a+(b-a)*t,V:{len:v=>Math.hypot(...v)},
  $:()=>null,toast:value=>notices.push(value),setInterval:()=>1,setTimeout:()=>1});
 vm.runInContext('const oceanShip={snapshot:()=>({mode:shipMode})};const oceanEcology={snapshot:()=>({training})};const oceanSwimActions={isSurface:()=>surface};'+source,context);
 const audio=vm.runInContext('oceanAudio',context);if(start){await audio.start();audio.tick();}
 return {context,audio,settings,notices,musicGain:()=>[...audio.sources,...(audio.custom?[audio.custom]:[])].reduce((sum,node)=>sum+outputGain(node,audio.ctx.destination),0)};
}
async function local(f){await f.audio.loadLocal({name:'private-song.mp3',size:1,arrayBuffer:async()=>new Uint8Array([0]).buffer});f.audio.tick();return f.audio.custom;}
const results=[];
async function check(name,run,start=true){try{await run(await fixture(start));results.push({name,pass:true});console.log('PASS '+name);}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+'\n  '+error.message);}}

(async()=>{
 await check('Loading can prepare a suspended silent graph before the first sound gesture',async f=>{
  await f.audio.prepare();
  assert.equal(f.audio.status.context,'suspended');assert.equal(f.audio.enabled,false);
  assert.equal(f.audio.loading,null);assert.equal(f.audio.ready,false);assert.equal(f.audio.sources.length,0);
  assert.equal(f.audio.timer,null);assert.equal(f.audio.master.gain.value,0);
  const ctx=f.audio.ctx;await f.audio.prepare();assert.equal(f.audio.ctx,ctx);
  await f.audio.start();assert.equal(f.audio.ctx,ctx);assert.equal(f.audio.status.context,'running');
  assert.equal(f.audio.sources.length,2);assert(f.musicGain()>0);
 },false);
 await check('An unused loading graph can be released without closing a playing graph',async f=>{
  await f.audio.prepare();const prepared=f.audio.ctx;
  assert.equal(await f.audio.releasePrepared(),true);assert.equal(prepared.state,'closed');
  assert.equal(f.audio.ctx,null);assert.equal(f.audio.noise,null);assert.equal(f.audio.timer,null);
  await f.audio.start();const running=f.audio.ctx;assert.notEqual(running,prepared);
  assert.equal(await f.audio.releasePrepared(),false);assert.equal(f.audio.ctx,running);
  assert.equal(running.state,'running');assert(f.musicGain()>0);
 },false);
 await check('Original music at the deckchair has an open route to the destination',f=>{
  assert.equal(f.audio.sources.length,2);assert(f.audio.sources.every(s=>s.started));
  assert(f.musicGain()>0,'decoded and started stems must not end at a zero-gain master');
 });
 await check('A local song replaces the original stems and reaches the rest output',async f=>{
  const selected=await local(f);assert(selected.started);assert.equal(f.audio.customName,'private-song.mp3');
  assert(outputGain(selected,f.audio.ctx.destination)>0,'local-file status alone does not prove an open output');
  assert(f.audio.sources.every(s=>outputGain(s,f.audio.ctx.destination)===0),'original score must be muted while a custom song plays');
 });
 await check('Idle rest keeps the same song and route without reloading it',async f=>{
  const selected=await local(f);f.context.restIdle=true;f.audio.tick();
  assert.equal(f.audio.custom,selected);assert.equal(f.context.modal,'shipRest');assert(f.musicGain()>0);
 });
 await check('Leaving rest closes music on the deck, cabin and ordinary ship menus',async f=>{
  const selected=await local(f);
  for(const modal of ['deck','cabin','partners','settings',null]){
   f.context.modal=modal;f.context.shipMode=modal==='deck'?'deck':modal==='cabin'?'cabin':null;f.audio.tick();
   assert.equal(f.musicGain(),0,'music must not leak after rest closes: '+modal);assert.equal(f.audio.custom,selected);
  }
 });
 await check('Re-entering rest reopens the existing local song without duplicating sources',async f=>{
  const selected=await local(f),count=f.audio.ctx.nodes.filter(n=>n.kind==='bufferSource').length;
  f.context.modal='deck';f.context.shipMode='deck';f.audio.tick();assert.equal(f.musicGain(),0);
  f.context.modal='shipRest';f.context.shipMode='rest';f.audio.tick();
  assert(f.musicGain()>0);assert.equal(f.audio.custom,selected);assert.equal(f.audio.ctx.nodes.filter(n=>n.kind==='bufferSource').length,count);
 });
 await check('Rest does not enable diver breathing, bubbles or kicking sounds',f=>{
  f.audio.ctx.currentTime=4.5;f.context.player.velocity=[1,0,0];f.audio.tick();
  assert.equal(outputGain(f.audio.breath,f.audio.ctx.destination),0);assert.equal(f.audio.effectsEmitted,0);
 });
 await check('Diving keeps music and breath through the existing shared controls',async f=>{
  await local(f);f.context.active=true;f.context.modal=null;f.context.shipMode=null;f.audio.ctx.currentTime+=1;f.audio.lastWhale=f.audio.ctx.currentTime;f.audio.tick();
  assert(f.musicGain()>0);assert(outputGain(f.audio.breath,f.audio.ctx.destination)>0);
 });
 await check('Only real training keeps its existing music path open on the ship',async f=>{
  await local(f);f.context.modal='training';f.context.shipMode=null;f.context.training={stage:'ready'};f.audio.tick();
  assert(f.musicGain()>0);assert.equal(outputGain(f.audio.breath,f.audio.ctx.destination),0);
  f.context.training=null;f.audio.tick();assert.equal(f.musicGain(),0);
 });
 await check('Surface look fades underwater ambience and breathing; diving restores the same audio graph',f=>{
  f.context.active=true;f.context.modal=null;f.context.player.p=[0,-.8,0];f.audio.ctx.currentTime=2;f.audio.lastWhale=2;f.audio.tick();
  const underwater=f.audio.environment.gain.value,breath=f.audio.breath.gain.value,nodes=f.audio.ctx.nodes.length;assert(breath>0);
  f.context.surface=true;f.audio.tick();assert.equal(f.audio.breath.gain.value,0);assert(f.audio.environment.gain.value<underwater*.4);
  f.audio.ctx.currentTime=4.5;f.context.player.velocity=[1,0,0];f.audio.tick();assert.equal(f.audio.ctx.nodes.length,nodes,'surface emits no underwater bubble/kick/whale effects');
  f.context.surface=false;f.audio.ctx.currentTime=2;f.context.player.velocity=[0,0,0];f.audio.tick();assert.equal(f.audio.breath.gain.value,breath);assert.equal(f.audio.environment.gain.value,underwater);
 });
 await check('Sound setting and audio mute each close local music at rest',async f=>{
  await local(f);f.settings.sound=false;f.audio.tick();assert.equal(f.musicGain(),0);
  f.settings.sound=true;f.audio.tick();assert(f.musicGain()>0);f.audio.mute();assert.equal(f.musicGain(),0);
  f.audio.tick();assert.equal(f.musicGain(),0);
 });
 await check('Hidden rest stays silent and visible rest resumes only if enabled',async f=>{
  await local(f);f.context.document.hidden=true;f.audio.tick();assert.equal(f.musicGain(),0);
  f.context.document.hidden=false;f.audio.tick();assert(f.musicGain()>0);
  f.audio.mute();f.context.document.hidden=true;f.audio.tick();f.context.document.hidden=false;f.audio.tick();assert.equal(f.musicGain(),0);
 });
 await check('Music zero and master zero independently silence either music source',async f=>{
  for(const custom of [false,true]){
   if(custom)await local(f);f.settings.music=0;f.audio.tick();assert.equal(f.musicGain(),0);
   f.settings.music=.5;f.settings.master=0;f.audio.tick();assert.equal(f.musicGain(),0);
   f.settings.master=.7;f.audio.tick();assert(f.musicGain()>0);
  }
 });
 await check('Returning to the original score disconnects custom music and restores rest output',async f=>{
  const selected=await local(f);f.audio.resetMusic();assert(selected.stopped);assert.equal(selected.connections.size,0);
  assert.equal(f.audio.custom,null);assert(f.musicGain()>0);
 });
 console.log(JSON.stringify({scope:'CPU production audio graph and control-gain targets; no browser, codec or acoustic playback',passed:results.filter(r=>r.pass).length,total:results.length,failures:results.filter(r=>!r.pass)},null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
