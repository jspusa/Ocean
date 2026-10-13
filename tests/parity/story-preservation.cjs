/* Published 0.12.1 compiled identities versus the current compiled scene.
 * This immutable fixture predates the region bake; no browser or GPU involved. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0121-actors.json'),'utf8'));
const packed=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz')));
assert.equal(packed.subarray(0,4).toString(),'RFB5');
const header=JSON.parse(packed.subarray(8,8+packed.readUInt32LE(4))),groups=['life','decorLife','shoal'];
const actors=groups.flatMap(group=>header[group].map(index=>({group,...header.nodes[index]}))),byUID=new Map(actors.map(f=>[f.uid,f]));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('baseline is the published 0.12.1 scene and contains all 725 unique actors',()=>{
 assert.equal(baseline.sourceCommit,'50180d2');assert.equal(baseline.sourceVersion,'0.12.1');assert.equal(baseline.actors.length,725);assert.equal(new Set(baseline.actors.map(f=>f.uid)).size,725);
 assert.equal(baseline.meshSha256.length,64);
});
check('new scene never duplicates or removes a legacy actor UID',()=>{
 assert.equal(byUID.size,actors.length);for(const f of baseline.actors)assert(byUID.has(f.uid),'missing '+f.uid);
});
check('legacy species, home, initial position, scale and phenotype seed are preserved',()=>{
 for(const before of baseline.actors){const current=byUID.get(before.uid);for(const [key,value]of Object.entries(before))assert.deepEqual(current[key],value,before.uid+' changed '+key);}
});
check('legacy actor order stays stable within each public scene binding',()=>{
 const oldUIDs=new Set(baseline.actors.map(f=>f.uid));for(const group of groups)assert.deepEqual(actors.filter(f=>f.group===group&&oldUIDs.has(f.uid)).map(f=>f.uid),baseline.actors.filter(f=>f.group===group).map(f=>f.uid),group+' reordered');
});
console.log(passed+' compiled world preservation checks passed');
