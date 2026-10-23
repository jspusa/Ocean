/* Differential checks against the published 0.17 collision rules. Real scene
 * obstacles and regional solids; CPU work counts, not an FPS/GPU benchmark. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const c=vm.createContext({console}),read=n=>fs.readFileSync('src/'+n+'.js','utf8');
for(const n of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(read(n),c,{filename:n+'.js'});
const raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)));
const app=read('app'),baseline=fs.readFileSync('tests/parity/fixtures/reef-collision-v017.js','utf8');
const part=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
vm.runInContext(part(app,'function collide(','function dir('),c);
vm.runInContext(part(app,'function blocked(','function observe('),c);
vm.runInContext(baseline.replace('function collide(','function originalCollide(').replace('function blocked(','function originalBlocked('),c);
const obstacles=vm.runInContext('obstacles',c),plain=x=>JSON.parse(JSON.stringify(x));
function replace(list){obstacles.length=0;obstacles.push(...list);c.reefObstacleCandidates?.invalidate();}
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);}}
replace(header.obstacles);
const points=[[0,-8,7],[-24,-4.5,43],[-218,-26,-70],[390,-32,-210],[766,-7000,-120]];
let state=19453;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
for(let i=0;i<500;i++)points.push([-280+random()*1180,-1-random()*90,-390+random()*600]);
for(const o of header.obstacles)for(const offset of [[0,0,0],[.9,0,0],[-.9,.1,.1],[.3,.8,-.3],[1,0,0],[-1+Number.EPSILON,0,0]])points.push(o.p.map((v,k)=>v+offset[k]*(o.s[k]+.4)));
check('real world collision is identical for open water, rock interiors and boundaries',()=>{
 for(const p of points)assert.deepEqual(plain(c.collide(p.slice())),plain(c.originalCollide(p.slice())),JSON.stringify(p));
});
check('real world line of sight is identical for local, cross-region and zero-length rays',()=>{
 for(let i=0;i<points.length;i++){const a=points[i],b=i%11===0?a:points[(i*17+5)%points.length];assert.equal(c.blocked(a,b),c.originalBlocked(a,b),JSON.stringify({a,b}));}
});
check('regional swept collision remains identical through cave walls and deep ledges',()=>{
 for(const [a,b] of [[[-218,-26,-70],[-218,-5,-70]],[[188,-51,-221],[205,-51,-221]],[[766,-1390,-111],[766,-1415,-111]],[[766,-7000,-120],[780,-7010,-120]]])assert.deepEqual(plain(c.collide(b.slice(),a)),plain(c.originalCollide(b.slice(),a)));
});
check('point/segment working sets exclude distant reef obstacles',()=>{
 assert.equal(typeof c.reefObstacleCandidates,'function','spatial query must exist');
 for(const p of [[390,-32,-210],[766,-7000,-120]]){assert.equal(c.reefObstacleCandidates(p).length,0);assert.equal(c.reefObstacleCandidates(p,[p[0],p[1],p[2]-10]).length,0);}
 const local=c.reefObstacleCandidates([0,-8,7],[0,-8,-3]);assert(local.length<10,'local query must not traverse the 185-obstacle world');
 console.log(JSON.stringify({worldObstacles:obstacles.length,reefSegmentCandidates:local.length,offshoreCandidates:0,hadalCandidates:0}));
});
check('repeated distant collision avoids all obstacle narrow-phase property reads',()=>{
 let reads=0;const instrumented=header.obstacles.map(o=>({get p(){reads++;return o.p;},s:o.s}));replace(instrumented);
 const p=[766,-7000,-120];c.collide(p.slice());reads=0;for(let i=0;i<120;i++)c.collide(p.slice());const indexedReads=reads;
 reads=0;for(let i=0;i<120;i++)c.originalCollide(p.slice());const originalReads=reads;
 assert(originalReads>=185*120);assert.equal(indexedReads,0);console.log(JSON.stringify({originalReads,indexedReads,physicsSteps:120}));
 replace(header.obstacles);
});
check('a push across cells discovers later obstacles in original order',()=>{
 const originalGround=c.groundHeight;c.groundHeight=()=>-1000;
 try{
  replace([{p:[-15,-20,0],s:[18,2,2]},{p:[4.5,-20,0],s:[2,2,2]},{p:[-18,-20,0],s:[2,2,2]}]);
  assert(!c.reefObstacleCandidates([-14,-20,0]).includes(1),'later rock starts outside the original working set');
  const moved=c.collide([-14,-20,0]);assert(Math.abs(moved[0]-2.1)<1e-12,'later rock must be discovered after the first push crosses a cell');
  for(const p of [[-14,-20,0],[-14.99,-20,0],[-15,-20,0],[-16,-20,.01]])assert.deepEqual(plain(c.collide(p.slice())),plain(c.originalCollide(p.slice())));
 }finally{c.groundHeight=originalGround;replace(header.obstacles);}
});
check('negative cell edges and long segments retain every intersecting obstacle',()=>{
 assert.equal(typeof c.reefObstacleCandidates,'function');
 for(const [a,b] of [[[-1000,-20,-1000],[1000,-20,1000]],[[-16,-20,-16],[-16,-20,-16]],[[0,-20,0],[-100000,-20,-100000]]]){
  const ids=c.reefObstacleCandidates(a,b);assert.deepEqual([...ids].sort((x,y)=>x-y),[...ids]);assert.equal(new Set(ids).size,ids.length);
  assert.equal(c.blocked(a,b),c.originalBlocked(a,b));
 }
});
check('scene replacement and explicit invalidation rebuild moved static obstacles',()=>{
 assert.equal(typeof c.reefObstacleCandidates?.invalidate,'function');
 const moving={p:[0,-20,0],s:[1,1,1]};replace([moving]);assert.deepEqual([...c.reefObstacleCandidates([0,-20,0])],[0]);
 moving.p=[100,-20,100];c.reefObstacleCandidates.invalidate();assert.equal(c.reefObstacleCandidates([0,-20,0]).length,0);assert.deepEqual([...c.reefObstacleCandidates([100,-20,100])],[0]);
 obstacles.push({p:[0,-20,0],s:[1,1,1]});assert.deepEqual([...c.reefObstacleCandidates([0,-20,0])],[1]);
 obstacles.length=0;obstacles.push({p:[-16,-20,-16],s:[1,1,1]},{p:[-32,-20,-32],s:[1,1,1]});c.reefObstacleCandidates.invalidate();assert.deepEqual([...c.reefObstacleCandidates([-32,-20,-32])],[1]);assert.equal(c.reefObstacleCandidates([100,-20,100]).length,0);replace(header.obstacles);
});
console.log(`${passed}/${passed+failed} spatial collision checks passed`);if(failed)process.exitCode=1;
