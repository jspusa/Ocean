/* Public local-file selection/reset under real asynchronous read/decode races.
 * Audio nodes record routing and lifetime; no codec or acoustic claims. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/audio.js'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture({initialPending=false}={}){
 const control={initial:deferred(),decodes:new Map(),decodeCalls:[],reads:[],nodes:[],notices:[],contexts:0,resumes:0,failStart:false};
 if(!initialPending)control.initial.resolve({original:true});
 class Parameter{constructor(){this.value=0;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
 class Node{
  constructor(kind){this.kind=kind;this.connections=new Set();this.starts=0;this.stops=0;this.disconnects=0;for(const n of ['gain','frequency','Q','pan','threshold','knee','ratio','attack','release'])this[n]=new Parameter();control.nodes.push(this);}
  connect(n){this.connections.add(n);return n;}disconnect(){this.disconnects++;this.connections.clear();}
  start(){if(control.failStart){control.failStart=false;throw Error('start rejected');}this.starts++;}stop(){this.stops++;}
 }
 class AudioContext{
  constructor(){control.contexts++;this.currentTime=1;this.sampleRate=8;this.state='suspended';this.destination=new Node('destination');}
  createGain(){return new Node('gain');}createDynamicsCompressor(){return new Node('compressor');}createAnalyser(){return new Node('analyser');}createBiquadFilter(){return new Node('filter');}createBufferSource(){return new Node('source');}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  decodeAudioData(bytes){const id=new Uint8Array(bytes)[0];if(!id)return control.initial.promise;control.decodeCalls.push(id);if(!control.decodes.has(id))control.decodes.set(id,deferred());return control.decodes.get(id).promise;}
  async resume(){control.resumes++;this.state='running';}async suspend(){this.state='suspended';}
 }
 const settings={sound:true,master:.7,music:.5,ambience:0,breath:0},context=vm.createContext({console,window:{AudioContext},document:{hidden:false},settings,active:false,modal:null,photoOpen:false,renderer:{submersible:false},player:{p:[0,-8,0],velocity:[0,0,0]},MUSIC:{shallows:'data:audio/mpeg;base64,AA==',blue_silence:'data:audio/mpeg;base64,AA=='},atob,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),mix:(a,b,t)=>a+(b-a)*t,V:{len:v=>Math.hypot(...v)},$:()=>null,toast:n=>control.notices.push(n),setInterval:()=>1,setTimeout:()=>1});
 vm.runInContext(source,context);const audio=vm.runInContext('oceanAudio',context);
 const file=(id,read=null,size=1)=>({name:'track-'+id+'.mp3',size,arrayBuffer(){control.reads.push(id);return read?read.promise:Promise.resolve(new Uint8Array([id]).buffer);}});
 const resolve=(id)=>{assert(control.decodes.has(id),'expected local decode '+id);control.decodes.get(id).resolve({track:id});};
 return {audio,control,settings,context,file,resolve};
}
async function selected(f,id=1){const pending=f.audio.loadLocal(f.file(id));await flush();f.resolve(id);await pending;assert.equal(f.audio.custom.buffer.track,id);return f.audio.custom;}
const results=[];async function check(name,run){let timeout;try{await Promise.race([run(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('selection did not settle')),500);})]);results.push(true);console.log('PASS '+name);}catch(e){results.push(false);console.error('FAIL '+name+': '+e.message.split('\n').slice(0,2).join(' '));}finally{clearTimeout(timeout);}}
(async()=>{
 await check('last selection wins when older decode finishes after the newer one',async()=>{
  const f=fixture(),a=f.audio.loadLocal(f.file(1));await flush();const b=f.audio.loadLocal(f.file(2));await flush();f.resolve(2);await b;const winner=f.audio.custom;f.resolve(1);await a;
  assert.equal(f.audio.custom,winner);assert.equal(winner.buffer.track,2);assert.equal(winner.stops,0);assert.equal(f.audio.customName,'track-2.mp3');assert.equal(f.control.nodes.filter(n=>n.kind==='source'&&n.buffer?.track===1).length,0);
 });
 await check('reset cancels an in-flight decode without restoring custom music',async()=>{
  const f=fixture(),pending=f.audio.loadLocal(f.file(1));await flush();f.audio.resetMusic();f.resolve(1);await pending;assert.equal(f.audio.custom,null);assert(!f.audio.customName);assert.equal(f.control.nodes.filter(n=>n.buffer?.track===1).length,0);
 });
 await check('reset during audio initialization skips reading and decoding the old file',async()=>{
  const f=fixture({initialPending:true}),pending=f.audio.loadLocal(f.file(1));await flush();f.audio.resetMusic();f.control.initial.resolve({original:true});await pending;assert.deepEqual(f.control.reads,[]);assert.deepEqual(f.control.decodeCalls,[]);assert.equal(f.audio.custom,null);
 });
 await check('superseded file reads do not begin unnecessary decodes',async()=>{
  const f=fixture(),read=deferred(),a=f.audio.loadLocal(f.file(1,read));await flush();const b=f.audio.loadLocal(f.file(2));await flush();f.resolve(2);await b;read.resolve(new Uint8Array([1]).buffer);await a;assert.deepEqual(f.control.decodeCalls,[2]);assert.equal(f.audio.custom.buffer.track,2);
 });
 await check('failed decode leaves the currently playing track and graph intact',async()=>{
  const f=fixture(),old=await selected(f),pending=f.audio.loadLocal(f.file(2));await flush();assert.equal(f.audio.custom,old);f.control.decodes.get(2).reject(Error('not audio'));await pending;assert.equal(f.audio.custom,old);assert.equal(old.stops,0);assert.equal(old.disconnects,0);assert(old.connections.has(f.audio.music));
 });
 await check('new source start failure disconnects it without stopping the old song',async()=>{
  const f=fixture(),old=await selected(f),pending=f.audio.loadLocal(f.file(2));await flush();f.control.failStart=true;f.resolve(2);await pending;assert.equal(f.audio.custom,old);assert.equal(old.stops,0);assert.equal(old.disconnects,0);const failed=f.control.nodes.find(n=>n.buffer?.track===2);assert(failed);assert.equal(failed.connections.size,0);
 });
 await check('successful replacement stops and disconnects the previous source exactly once',async()=>{
  const f=fixture(),old=await selected(f),replacement=await selected(f,2);assert.equal(old.stops,1);assert.equal(old.disconnects,1);assert.equal(replacement.starts,1);assert(replacement.loop);assert(replacement.connections.has(f.audio.music));f.audio.resetMusic();assert.equal(replacement.stops,1);assert.equal(replacement.disconnects,1);assert.equal(f.audio.custom,null);assert(!f.audio.customName);
 });
 await check('oversized selection preserves playing music and cancels earlier pending work',async()=>{
  const f=fixture(),old=await selected(f),pending=f.audio.loadLocal(f.file(2));await flush();await f.audio.loadLocal(f.file(3,null,32*1024*1024+1));f.resolve(2);await pending;assert.equal(f.audio.custom,old);assert.equal(old.stops,0);assert(!f.control.reads.includes(3));assert(!f.control.decodeCalls.includes(3));
  const fresh=fixture();await fresh.audio.loadLocal(fresh.file(1,null,32*1024*1024+1));assert.equal(fresh.control.contexts,0);assert.deepEqual(fresh.control.reads,[]);
 });
 await check('finishing a decode does not undo a later mute or change sound settings',async()=>{
  const f=fixture(),pending=f.audio.loadLocal(f.file(1));await flush();f.audio.mute();f.settings.sound=false;const resumes=f.control.resumes;f.resolve(1);await pending;assert.equal(f.audio.enabled,false);assert.equal(f.settings.sound,false);assert.equal(f.audio.master.gain.value,0);assert.equal(f.control.resumes,resumes);
 });
 await check('obsolete decode failures do not replace the latest success notification',async()=>{
  const f=fixture(),a=f.audio.loadLocal(f.file(1));await flush();const b=f.audio.loadLocal(f.file(2));await flush();f.resolve(2);await b;const notices=f.control.notices.slice();f.control.decodes.get(1).reject(Error('old bad file'));await a;assert.deepEqual(f.control.notices,notices);assert.equal(f.audio.custom.buffer.track,2);
 });
 await check('read and initialization failures are handled without leaking a rejected selection',async()=>{
  const f=fixture(),old=await selected(f),read=deferred(),pending=f.audio.loadLocal(f.file(2,read));await flush();read.reject(Error('file unavailable'));await assert.doesNotReject(pending);assert.equal(f.audio.custom,old);assert.equal(old.stops,0);
  const fresh=fixture();fresh.context.window.AudioContext=null;await assert.doesNotReject(fresh.audio.loadLocal(fresh.file(3)));assert.equal(fresh.audio.custom,null);assert.equal(fresh.control.notices.length,1);
 });
 console.log(`${results.filter(Boolean).length}/${results.length} local music race checks passed`);if(results.includes(false))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
