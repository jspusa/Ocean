/* Published 0.12.1 identities plus the explicitly authorized 0.17.0 offshore
 * relocation (README 0.17 / TEST_REPORT.md). Both fixtures are immutable release
 * data: only six animals' home/center/p use the newer baseline. No browser/GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0121-actors.json'),'utf8'));
const offshore=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0170-offshore-relocations.json'),'utf8')),relocated=new Map(offshore.actors.map(f=>[f.uid,f])),coordinates=new Set(['home','center','p']);
const packed=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz')));
assert.equal(packed.subarray(0,4).toString(),'RFB5');
const header=JSON.parse(packed.subarray(8,8+packed.readUInt32LE(4))),groups=['life','decorLife','shoal'];
const actors=groups.flatMap(group=>header[group].map(index=>({group,...header.nodes[index]}))),byUID=new Map(actors.map(f=>[f.uid,f]));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('baseline is the published 0.12.1 scene and contains all 725 unique actors',()=>{
 assert.equal(baseline.sourceCommit,'50180d2');assert.equal(baseline.sourceVersion,'0.12.1');assert.equal(baseline.actors.length,725);assert.equal(new Set(baseline.actors.map(f=>f.uid)).size,725);
 assert.equal(baseline.meshSha256.length,64);
});
check('coordinate migration is pinned to the six released 0.17.0 offshore cetaceans',()=>{
 assert.equal(offshore.sourceCommit,'948c046a67fb5b7c7b8f77466b4b24171e75be9d');assert.equal(offshore.sourceVersion,'0.17.0');assert.equal(offshore.meshSha256,'719cee472608b570784271d4004ea47cf3d5c4427eff84d86d00bed72f6d96a6');
 assert.equal(offshore.actors.length,6);assert.equal(relocated.size,6);assert.deepEqual([...relocated.keys()],['orca-001','orca-002','orca-003','false_killer_whale-001','false_killer_whale-002','false_killer_whale-003']);
 for(const f of offshore.actors){assert.deepEqual(Object.keys(f).sort(),['center','home','p','uid']);assert(baseline.actors.some(old=>old.uid===f.uid));for(const key of coordinates)assert(f[key].length===3&&f[key].every(Number.isFinite));}
});
check('new scene never duplicates or removes a legacy actor UID',()=>{
 assert.equal(byUID.size,actors.length);for(const f of baseline.actors)assert(byUID.has(f.uid),'missing '+f.uid);
});
check('all legacy fields stay exact except six pinned offshore coordinate migrations',()=>{
 for(const before of baseline.actors){const current=byUID.get(before.uid),migration=relocated.get(before.uid);for(const [key,value]of Object.entries(before)){const expected=migration&&coordinates.has(key)?migration[key]:value;assert.deepEqual(current[key],expected,before.uid+' changed '+key);}}
});
check('only the authorized six animals change their old coordinates, with exact new homes and poses',()=>{
 const changed=[];for(const before of baseline.actors){const current=byUID.get(before.uid);if([...coordinates].some(key=>JSON.stringify(current[key])!==JSON.stringify(before[key])))changed.push(before.uid);}
 assert.deepEqual(changed,[...relocated.keys()]);for(const [uid,expected]of relocated)for(const key of coordinates)assert.deepEqual(byUID.get(uid)[key],expected[key],uid+' moved outside the released offshore route');
});
check('legacy actor order stays stable within each public scene binding',()=>{
 const oldUIDs=new Set(baseline.actors.map(f=>f.uid));for(const group of groups)assert.deepEqual(actors.filter(f=>f.group===group&&oldUIDs.has(f.uid)).map(f=>f.uid),baseline.actors.filter(f=>f.group===group).map(f=>f.uid),group+' reordered');
});
console.log(passed+' compiled world preservation checks passed');
