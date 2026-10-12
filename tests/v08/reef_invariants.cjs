/** Procedural geometry and deterministic animation contracts. Does not bake or write assets. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..');
const ctx=vm.createContext({console,Float32Array,Uint32Array,Math,Map,Set,Date,SCULPTED_CORAL:JSON.parse(fs.readFileSync(path.join(root,'assets/coral_forms.json'),'utf8'))});
for(const name of ['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),ctx,{filename:name});
const result=vm.runInContext(`(()=>{
 const checks=[];
 function mesh(name,g,maxTriangles){
  if(!g.v.every(Number.isFinite))throw Error(name+' has non-finite coordinates');
  if(g.v.length%36)throw Error(name+' has incomplete triangle');
  if(g.v.length/36>maxTriangles)throw Error(name+' exceeds triangle budget');
  let bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]],badNormal=0;
  for(let i=0;i<g.v.length;i+=12){for(let a=0;a<3;a++){bounds[0][a]=Math.min(bounds[0][a],g.v[i+a]);bounds[1][a]=Math.max(bounds[1][a],g.v[i+a]);}const n=Math.hypot(...g.v.slice(i+3,i+6));if(n<.25||n>1.01)badNormal++;}
  if(badNormal>g.v.length/12*.015)throw Error(name+' has degenerate normal field');
  checks.push({name,triangles:g.v.length/36,bounds});return g;
 }
 for(const s of SPECIES.slice(0,8)){
  mesh(s.id+' high',fishGeometry(s),8000);mesh(s.id+' low',fishGeometry(s,true),1500);
  for(let t=0;t<=1;t+=.01){const p=fishContour(s,t);if(p.width<0||p.height<0||!Number.isFinite(p.offset))throw Error('Invalid fish contour');}
 }
 mesh('eagle ray high',rayGeometry(),8000);mesh('eagle ray low',rayGeometry(true),1600);
 mesh('dolphin high',dolphinGeometry(),9000);mesh('dolphin low',dolphinGeometry(true),2500);
 mesh('sea fan high',seaFanGeometry(),3600);mesh('sea fan low',seaFanGeometry(true),2300);
 mesh('sponge high',spongeGeometry(),4300);mesh('sponge low',spongeGeometry(true),1000);
 mesh('brain coral',brainCoral(),3000);mesh('seagrass',grass(),700);
 for(let i=0;i<11;i++)mesh('reef LOD '+i,distantColony(i),2200);
 for(const s of SPECIES.slice(0,8)){
  const f={species:SPECIES.indexOf(s),height:4,speed:.11,radius:4,orbit:.71,bob:1.2,center:[0,-8,8],bioSeed:421};
  for(let t=0;t<80;t+=.17){const a=[],b=[],c=[];animalTrajectory(f,t,a);animalTrajectory(f,t,b);animalTrajectory(f,t+.001,c);if(a.some((v,i)=>v!==b[i]||!Number.isFinite(v)))throw Error('Nondeterministic trajectory');if(V.dist(a,c)>.015)throw Error('Discontinuous trajectory');}
 }
 for(let i=0;i<32;i++)shoal.push({slot:i,phase:i*2.39996,rad:Math.sqrt((i+.5)/32),p:[0,0,0],schoolOffset:[Math.sin(i),Math.cos(i),Math.sin(i*.7)]});
 updateReefSchool(17);const snapshot=JSON.stringify(shoal);updateReefSchool(17);if(snapshot!==JSON.stringify(shoal))throw Error('Nondeterministic school');
 const headings=shoal.map(f=>f.yaw);if(Math.max(...headings)-Math.min(...headings)>.25)throw Error('School is not coherently aligned');
 return checks;
})()`,ctx,{timeout:120000});
const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4)).toString());
assert(header.life.length>=130,'Existing animal scene is available for compatibility review');
assert.equal(new Set(header.life.map(id=>header.nodes[id].uid)).size,header.life.length,'Existing observed animal IDs are unique');
console.log(JSON.stringify({pass:true,geometryChecks:result.length,triangles:result.map(x=>({name:x.name,triangles:x.triangles})),motionSamples:3768,existingAnimalIDs:header.life.length},null,2));
