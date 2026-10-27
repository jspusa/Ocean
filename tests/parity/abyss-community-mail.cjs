/* Request/sanitizer public boundary with explicit photo-storage fixtures.
 * Real JPEG capture, decoding and normal mail UI are native browser tests. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let feature,state;const species=[{id:'tripod_fish',name:'三腳魚'},{id:'dumbo_octopus',name:'小飛象章魚'}];
const ctx=vm.createContext({console,clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),oceanFeatures:{register:f=>feature=f,state:()=>state},SPECIES:species,LANDMARKS:[],active:false,persistent:{photos:[]},saveVoyage:()=>{},toast:()=>{},oceanPhotography:{pin:async()=>true},Date});
vm.runInContext(fs.readFileSync('src/expedition.js','utf8'),ctx);const api=vm.runInContext('oceanExpedition',ctx);state=api.initial();
(async()=>{
 for(const [id,sp] of [['editor-tripod',species[0]],['editor-dumbo',species[1]]]){
  assert.equal(api.accept(id),true,'New deep-sea commission is available without reef progression');assert.equal(state.mail[id].status,'accepted');
  assert.equal(await api.submitPhoto(id,100),false,'Accepting or seeing a spawned animal never completes a request');
  const photo={date:100,species:sp.name,individual:sp.id+'-001',grade:80,url:'data:image/jpeg;base64,AAA='};ctx.persistent.photos=[photo];
  assert.equal(await api.submitPhoto(id,100),false,'Legacy or far-away photo without near-observation metadata is ineligible');
  photo.knowledgeEligible=false;assert.equal(await api.submitPhoto(id,100),false);
  photo.knowledgeEligible=true;ctx.oceanPhotography.pin=async()=>false;assert.equal(await api.submitPhoto(id,100),false,'Durable attachment failure leaves request pending');assert.equal(state.mail[id].status,'accepted');
  ctx.oceanPhotography.pin=async()=>true;ctx.active=true;assert.equal(await api.submitPhoto(id,100),false);ctx.active=false;
  assert.equal(await api.submitPhoto(id,100),true);assert.equal(await api.submitPhoto(id,100),false,'Rewards are idempotent');
  const saved=api.sanitize(JSON.parse(JSON.stringify(state)));assert.equal(saved.mail[id].status,'complete');assert.equal(saved.mail[id].photoDate,100);
  console.log('PASS '+id+' only accepts a near-observation photograph durably attached on the ship, persists and rewards once');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
