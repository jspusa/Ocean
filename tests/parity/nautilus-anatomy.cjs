/* Public triangle-mesh behaviour: an anatomical shell is hollow at its real
 * aperture, not a painted black oval; photos/renders can look into this volume. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','open_world','fauna'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),ctx);
const build=vm.runInContext('faunaGeometry',ctx),sp=vm.runInContext("SPECIES.find(s=>s.id==='nautilus')",ctx);
function hits(g,origin,direction,tag){const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],out=[];for(let k=0;k<g.v.length;k+=36){if(tag!==undefined&&g.v[k+11]!==tag)continue;const a=g.v.slice(k,k+3),e1=sub(g.v.slice(k+12,k+15),a),e2=sub(g.v.slice(k+24,k+27),a),h=cross(direction,e2),det=dot(e1,h);if(Math.abs(det)<1e-11)continue;const d=sub(origin,a),u=dot(d,h)/det;if(u<0||u>1)continue;const q=cross(d,e1),v=dot(direction,q)/det;if(v<0||u+v>1)continue;const t=dot(e2,q)/det;if(t>1e-6)out.push({p:origin.map((v,i)=>v+t*direction[i]),t,n:g.v.slice(k+3,k+6)});}return out.sort((a,b)=>a.t-b.t);}
let checks=0;function check(name,run){run();checks++;console.log('PASS '+name);}
check('nautilus front aperture leads into a recessed shell wall from three viewing angles',()=>{
 for(const low of [false,true]){const g=build(sp,low);for(const side of [-1,0,1]){const ray=hits(g,[1,-.22,side*.075],[-1,0,-side*.045],7);assert(ray.length>1,'shell has actual outer and inner walls');assert(ray[0].p[0]<.16,'view enters opening before reaching inner shell, not a capped oval');}const top=hits(g,[1,.29,0],[-1,0,0],7);assert(top.length&&top[0].p[0]>.05,'upper whorl remains a solid shell around the opening');}
});
check('live fauna generation preserves each published nautilus home while focusing the new shell and tentacles',()=>{
 const zlib=require('node:zlib'),raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4))),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0121-actors.json'),'utf8')).actors.filter(f=>f.uid.startsWith('nautilus-'));
 ctx.sceneObstacles=header.obstacles;vm.runInContext('obstacles.push(...sceneObstacles);addLife=()=>{};',ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/fauna_world.js'),'utf8'),ctx);vm.runInContext('addLife({batch(){return {};}});',ctx);
 const actors=vm.runInContext("life.filter(f=>SPECIES[f.species].id==='nautilus')",ctx);assert.equal(actors.length,baseline.length);
 for(let i=0;i<actors.length;i++){assert.deepEqual(JSON.parse(JSON.stringify(actors[i].home)),baseline[i].home);assert.deepEqual(JSON.parse(JSON.stringify(actors[i].s)),baseline[i].s);const g=build(sp),expected=g.modelBounds.min.map((v,j)=>(v+g.modelBounds.max[j])*.5);assert.deepEqual(Array.from(actors[i].modelCenter),Array.from(expected),'focus derives from actual revised bounds');}
});
check('hood pigmentation is continuous across adjacent triangles rather than face-colour squares',()=>{for(const low of [false,true]){const g=build(sp,low),seen=new Map();let shared=0;for(let k=0;k<g.v.length;k+=12){if(g.v[k+11]!==1||g.v[k+1]<-.09||g.v[k]<.14)continue;const key=g.v.slice(k,k+6).map(v=>v.toFixed(7)).join(','),color=g.v.slice(k+6,k+9),previous=seen.get(key);if(previous){shared++;assert(Math.hypot(...color.map((v,i)=>v-previous[i]))<1e-7,'identical hood vertex carries identical pigment');}else seen.set(key,color);}assert(shared>100);}});
console.log(checks+' nautilus anatomy checks passed');
