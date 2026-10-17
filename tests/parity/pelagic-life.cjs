/* Real mesh, population and deterministic movement seams; no browser or build. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const c=vm.createContext({console,assert});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
const before=vm.runInContext('SPECIES.map(s=>s.id)',c);
const packed=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),header=JSON.parse(packed.subarray(8,8+packed.readUInt32LE(4)));
c.header=header;
vm.runInContext(`
// Preserve the already published population while exercising the new spawn seam.
addLife=function(){obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]).filter(f=>f.species<35));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));};
`,c);
vm.runInContext(fs.readFileSync('src/pelagic_life.js','utf8'),c,{filename:'pelagic_life'});
const species=vm.runInContext('SPECIES',c),build=vm.runInContext('faunaGeometry',c);let count=0;
function check(name,run){run();count++;console.log('PASS '+name);}
check('new encounters append to the catalogue without renumbering existing animals',()=>{assert.deepEqual(Array.from(species.slice(0,before.length),s=>s.id),Array.from(before));assert.deepEqual(Array.from(species.slice(before.length),s=>s.id),['blue_whale','whale_shark']);});
for(const id of ['blue_whale','whale_shark'])check(id+' has metre-scaled, finite, reduced-detail meshes with a stable silhouette',()=>{
 const sp=species.find(s=>s.id===id),hi=build(sp),lo=build(sp,true);assert(hi.v.length>5000&&lo.v.length<hi.v.length*.6);assert.equal(sp.size,id==='blue_whale'?26:8.5);
 for(const g of [hi,lo]){assert(g.v.every(Number.isFinite));assert(Math.abs(g.modelBounds.size[0]-1)<1e-8);for(let k=0;k<g.v.length;k+=12)assert(Math.abs(Math.hypot(...g.v.slice(k+3,k+6))-1)<1e-3);}
 for(let a=1;a<3;a++)assert(Math.abs(hi.modelBounds.size[a]-lo.modelBounds.size[a])<.02,'LOD silhouette remains stable');assert(sp.thumb.startsWith('data:image/svg+xml'));
});
check('the original humpback keeps its head, body length and fins when changing LOD',()=>{
 const high=vm.runInContext('whaleGeometry()',c),low=vm.runInContext('distantWhale()',c),bounds=g=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<g.v.length;k+=12)for(let a=0;a<3;a++){min[a]=Math.min(min[a],g.v[k+a]);max[a]=Math.max(max[a],g.v[k+a]);}return {min,max};};
 const a=bounds(high),b=bounds(low);for(let k=0;k<3;k++){assert(Math.abs(a.min[k]-b.min[k])<.06);assert(Math.abs(a.max[k]-b.max[k])<.06);}assert(low.v.length<high.v.length*.35);
});
check('vampire squid photophores are separate from eyes and body',()=>{for(const low of [false,true]){const g=build('vampire_squid',low),lights=[];for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===6)lights.push(g.v.slice(k,k+3));assert(lights.length>30);assert(lights.some(p=>p[2]<-.08)&&lights.some(p=>p[2]>.08));assert(lights.every(p=>p[0]<-.3));}});
vm.runInContext(`
const recorder={batches:[],batch(geo,instances,kind,dynamic){const b={geo,instances,kind,dynamic};this.batches.push(b);return b;}};
addLife(recorder);const original=life.filter(f=>f.species<35).map(f=>[f.uid,JSON.stringify(f.bioBaseScale)]);initializeIndividuals(recorder);
assert(original.every(([uid,scale])=>life.some(f=>f.uid===uid&&JSON.stringify(f.bioBaseScale)===scale)),'existing per-animal identities/scales survive');
const newcomers=life.filter(f=>SPECIES[f.species]?.pelagic);assert.equal(newcomers.length,3);
for(const sp of PELAGIC_SPECIES){const pair=recorder.batches.filter(b=>b.geo.species===SPECIES.indexOf(sp));assert.equal(pair.length,2);assert.strictEqual(pair[0].instances,pair[1].instances);assert.equal(pair[0].maxDistance,pair[1].minDistance);assert(pair.every(b=>b.kind===sp.renderKind&&b.dynamic));}
for(const f of newcomers){const sp=SPECIES[f.species],saved=JSON.stringify([f.s,f.home,f.uid]),bend=sp.id==='blue_whale'?.075:0,hull=sp.size*(Math.max(sp.modelBounds.max[1],Math.abs(sp.modelBounds.min[1]))+bend)+.15,horizontal=sp.size*.56;let previous=null;
 for(let t=0;t<=600;t+=.5){faunaMotionPose(f,t);assert([...f.p,f.pitch,f.yaw,f.bank].every(Number.isFinite));let floor=groundHeight(f.p[0],f.p[2]);for(let j=0;j<16;j++)floor=Math.max(floor,groundHeight(f.p[0]+Math.cos(j/16*TAU)*horizontal,f.p[2]+Math.sin(j/16*TAU)*horizontal));for(const ob of obstacles)if(((f.p[0]-ob.p[0])/(ob.s[0]+horizontal))**2+((f.p[2]-ob.p[2])/(ob.s[2]+horizontal))**2<1)floor=Math.max(floor,ob.p[1]+ob.s[1]);assert(f.p[1]-hull>=floor+.1,sp.id+' full body above terrain and rocks '+t);assert(f.p[1]+hull<=-.1,sp.id+' below surface '+t);if(previous)assert(V.dist(f.p,previous)/.5<sp.motionProfile.cruiseSpeed*1.1,sp.id+' smooth speed without obstacle jumps '+t);previous=f.p.slice();}
 faunaMotionPose(f,12);const first=f.p.slice();faunaMotionPose(f,98);faunaMotionPose(f,12);assert.deepEqual(f.p,first);assert.equal(JSON.stringify([f.s,f.home,f.uid]),saved);
}
const blue=newcomers.find(f=>SPECIES[f.species].id==='blue_whale'),shark=newcomers.find(f=>SPECIES[f.species].id==='whale_shark');faunaMotionPose(blue,0);faunaMotionPose(shark,0);assert(V.dist([0,-7.6,23],blue.p)<90);assert(V.dist([0,-7.6,23],shark.p)<55);
`,c);
count++;console.log('PASS persistent encounters share LOD objects, swim finite ten-minute routes, and begin within swimming reach');
console.log(count+' pelagic encounter checks passed');
