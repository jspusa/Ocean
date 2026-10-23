/* Static seabed sampling must retain the authored surface without recomputing
 * its procedural noise during swimming. No timing threshold or GPU claims. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),math=Object.create(Math);let expensiveCalls=0;
for(const name of ['sin','cos','pow','exp'])math[name]=(...args)=>{expensiveCalls++;return Math[name](...args);};
const context=vm.createContext({console,Math:math});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context,{filename:name+'.js'});
const terrain=vm.runInContext('OceanTrench',context),samples=[];
expensiveCalls=0;
for(let i=0;i<10000;i++)samples.push(terrain.groundHeight(260.01+((i*117)%63999)/100,-394.99+((i*193)%60999)/100));
assert(samples.every(Number.isFinite));
// Authored 0.18.6 connected cut/sampling grid. trench-geometry.cjs separately
// checks these queried heights against the actual rendered triangles.
assert.equal(crypto.createHash('sha256').update(JSON.stringify(samples)).digest('hex'),'31bca39cad75474ce53a7a24456a861e6e9a8d72ad62e6cb23bc8dd0d7283309');
assert.deepEqual(samples.slice(0,5),[-70.87619672294771,-71.85808896802216,-72.83998121309656,-73.80442075998036,-74.74420837066981]);
assert.equal(terrain.groundHeight(259,0),null);assert.equal(terrain.groundHeight(901,0),null);
assert.equal(terrain.groundHeight(NaN,0),null);assert.equal(terrain.groundHeight(800,Infinity),null);
assert.equal(expensiveCalls,0,'Runtime interpolation must not regenerate fixed seabed samples');
console.log('PASS 10,000 exact-surface queries without procedural math; boundary behavior preserved');
