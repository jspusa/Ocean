/* CPU-only regional broad phase regression: exact convex roof rays, ordered
 * general candidate Sets, deterministic query allocation/work counts. Timings
 * are a local pure-query benchmark, not browser FPS or a device guarantee. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console,performance}),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench'])vm.runInContext(read(n),c,{filename:n+'.js'});
const source=read('regions');vm.runInContext(source.replace('return Object.freeze({definitions,','return Object.freeze({__candidates:candidates,__roofColumns:roofColumns,definitions,'),c,{filename:'regions.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'fixtures/region-query-v018.js'),'utf8'),c);
vm.runInContext(`
 const querySamples=[],queryStats={sets:0,maps:0,mapGets:0};
 const RealSet=Set,realArrayMap=Array.prototype.map,realMapGet=Map.prototype.get;
 let queryCounting=false;
 Set=class extends RealSet {constructor(...args){super(...args);if(queryCounting)queryStats.sets++;}};
 Array.prototype.map=function(...args){if(queryCounting)queryStats.maps++;return realArrayMap.apply(this,args);};
 Map.prototype.get=function(...args){if(queryCounting)queryStats.mapGets++;return realMapGet.apply(this,args);};
 function countedQueries(fn,samples){queryStats.sets=queryStats.maps=queryStats.mapGets=0;queryCounting=true;try{for(const [x,z,y]of samples)fn(x,z,y);}finally{queryCounting=false;}return {...queryStats};}
 function timedQueries(fn,samples,rounds){let checksum=0;const start=performance.now();for(let round=0;round<rounds;round++)for(const [x,z,y]of samples)checksum+=fn(x,z,y);return {ms:performance.now()-start,queries:samples.length*rounds,checksum};}
 // Include roof-free reef/offshore queries as well as the actual cave,
 // archive and 1400m terrace. Y changes test the real directed convex ray.
 for(let i=0;i<256;i++){const u=i/255;querySamples.push([-20+u*60,-80+u*80,-10-u*15],[-235+u*30,-84+u*45,-29+u*5],[180+u*18,-235+u*20,-54+u*6],[752+u*29,-125+u*25,-1410+u*15],[740+u*65,-170+u*70,-7000+u*6300]);}
`,c);
const R=vm.runInContext('OceanRegions',c),old=vm.runInContext('originalRegionQueries',c),ids=value=>Array.from(value,s=>s.id),samples=vm.runInContext('querySamples',c);
for(const [x,z,y]of samples)assert.equal(R.ceilingAt(x,z,y),old.ceilingAt(x,z,y),'height '+JSON.stringify([x,z,y]));
for(const s of R.solids.filter(s=>s.role==='roof'))for(const [x,z]of [[s.min[0],s.min[2]],[s.max[0],s.max[2]],[(s.min[0]+s.max[0])*.5,(s.min[2]+s.max[2])*.5]])for(const y of [s.min[1]-.000001,s.min[1],s.max[1],s.max[1]+.000001])assert.equal(R.ceilingAt(x,z,y),old.ceilingAt(x,z,y),'roof boundary '+s.id);
for(const [x,z]of [[-240,-84],[-234,-60],[-218,-70],[-217.6,-47.5],[188,-228],[766,-113],[0,0],[900,-395]])for(const y of [undefined,NaN,Infinity,-Infinity,0,150,151,Number.MAX_VALUE,-Number.MAX_VALUE])assert.equal(R.ceilingAt(x,z,y),old.ceilingAt(x,z,y),'ray origin '+String(y));
for(const x of [-240,-234,-228,-222,-216,156,162,180,186,192,756,762,768])for(const dx of [0,-1e-12,1e-12])for(const z of [-84,-78,-72,-66,-60,-54,-48,-42,-240,-234,-228,-222,-216,-126,-120,-114,-108,-102])for(const dz of [0,-1e-12,1e-12])assert.equal(R.ceilingAt(x+dx,z+dz,-7100),old.ceilingAt(x+dx,z+dz,-7100),'negative/bucket edge');
for(const [x,z]of [[NaN,0],[0,NaN],[NaN,NaN]])assert.equal(R.ceilingAt(x,z),old.ceilingAt(x,z));
// The former infinite-coordinate bucket loop could never advance. A column
// lookup now safely misses these keys without touching normal numeric rays.
for(const [x,z]of [[Infinity,0],[-Infinity,0],[0,Infinity],[0,-Infinity]])assert.equal(R.ceilingAt(x,z),0);
for(const p of [[0,-8,7],[-218,-26,-70],[-240,-32,-84],[188,-51,-228],[766,-1402,-113],[766,-7000,-120],[NaN,-20,0],[0,NaN,0]])for(const r of [0,.01,.4,6,-.4])for(const b of [p,p.map((v,i)=>v+[1,30,-8][i]),p.map((v,i)=>v+[2000,7200,2000][i])]){
 const actual=R.__candidates(p,b,r);assert.equal(Object.prototype.toString.call(actual),'[object Set]');assert.deepEqual(ids(actual),ids(old.candidates(p,b,r)),'ordered candidates '+JSON.stringify({p,b,r}));
}
assert(R.solids.every(s=>Object.isFrozen(s)&&Object.isFrozen(s.min)&&Object.isFrozen(s.max)&&Object.isFrozen(s.planes)),'the index references immutable geometry');
const columns=Array.from(R.__roofColumns.values()),roofIndex={columns:columns.length,references:columns.reduce((sum,column)=>sum+column.length,0)};assert(roofIndex.columns<=128&&roofIndex.references<6000,'roof index keeps bounded references, not copied geometry');assert(columns.every(column=>Object.isFrozen(column)&&column.every(s=>s.role==='roof'&&R.solids.includes(s))));
const measurement=vm.runInContext(`(()=>{const before=countedQueries(originalRegionQueries.ceilingAt,querySamples),after=countedQueries(OceanRegions.ceilingAt,querySamples),ground=countedQueries(OceanRegions.groundHeight,querySamples);for(let i=0;i<3;i++){timedQueries(originalRegionQueries.ceilingAt,querySamples,1);timedQueries(OceanRegions.ceilingAt,querySamples,1);}return {samples:querySamples.length,before,after,ground,timing:{before:timedQueries(originalRegionQueries.ceilingAt,querySamples,4),after:timedQueries(OceanRegions.ceilingAt,querySamples,4),ground:timedQueries(OceanRegions.groundHeight,querySamples,4)}};})()`,c);
console.log(JSON.stringify({...measurement,roofIndex},null,2));
if(!process.argv.includes('--baseline')){
 assert.equal(measurement.after.sets,0,'RED: exact ceiling rays must reuse immutable column candidates without allocating Sets');
 assert.equal(measurement.after.maps,0,'RED: exact ceiling rays must not build per-query broad-phase arrays');
 assert(measurement.after.mapGets<=samples.length,'RED: each ceiling point must require at most one column lookup');
}
console.log('PASS exact roof rays, candidate Set/order, immutable geometry and deterministic regional query work');
