/* Actual rendered triangle contact for the anemone and wreck growth. CPU only.
 * Default exercises the production construction seams using published reef rocks;
 * --compiled verifies the shipped meshes. No analytic seabed or collider proxy. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const compiled=process.argv.includes('--compiled'),c=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','rock_contact'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
const get=s=>vm.runInContext(s,c),raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),base=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,base)),cache=new Map();
function geometry(batch){if(cache.has(batch))return cache.get(batch);const g={indexed:{vertices:new Float32Array(raw.buffer,raw.byteOffset+base+batch.vertexOffset,batch.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+base+batch.indexOffset,batch.indexCount)}};cache.set(batch,g);return g;}
function world(p,n){const s=n.s||[1,1,1],a=n.yaw||0,cos=Math.cos(a),sin=Math.sin(a);return [n.p[0]+cos*p[0]*s[0]+sin*p[2]*s[2],n.p[1]+p[1]*s[1],n.p[2]-sin*p[0]*s[0]+cos*p[2]*s[2]];}
function vertices(g){return g.indexed?.vertices||g.v;}
// Independent brute-force barycentric oracle, rounded exactly as GPU vertices.
function triangleSurface(g,n){const v=vertices(g),ix=g.indexed?.indices,triangles=[];for(let k=0,count=ix?ix.length:v.length/12;k<count;k+=3){const p=[0,1,2].map(j=>{const at=(ix?ix[k+j]:k+j)*12;return world([0,1,2].map(a=>Math.fround(v[at+a])),n);});triangles.push({p,minX:Math.min(...p.map(x=>x[0])),maxX:Math.max(...p.map(x=>x[0])),minZ:Math.min(...p.map(x=>x[2])),maxZ:Math.max(...p.map(x=>x[2]))});}return triangles;}
function height(triangles,x,z,ceiling=Infinity){let top=-Infinity;for(const {p:[a,b,c],minX,maxX,minZ,maxZ} of triangles){if(x<minX-1e-8||x>maxX+1e-8||z<minZ-1e-8||z>maxZ+1e-8)continue;const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-12)continue;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,w=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,q=1-u-w;if(Math.min(u,w,q)<-1e-7)continue;const y=u*a[1]+w*b[1]+q*c[1];if(y<=ceiling+1e-7)top=Math.max(top,y);}return top;}
const rocks=header.batches.filter(b=>b.material===2&&b.maxDistance===30&&!b.minDistance).flatMap(b=>b.instanceIDs.map(id=>({geometry:geometry(b),instance:header.nodes[id]})));
assert.equal(rocks.length,91,'Actual central rock instances are available');
const localRocks=rocks.filter(({instance:n})=>Math.abs(n.p[0]+5.6)<n.s[0]*1.7+1&&Math.abs(n.p[2]-1)<n.s[2]*1.7+1),stone=localRocks.flatMap(s=>triangleSurface(s.geometry,s.instance));
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
let anemone,plain;
if(compiled){const b=header.batches.find(b=>b.sceneRole==='reef-anemone')||header.batches.find(b=>b.material===3&&b.kind===3&&b.maxDistance===12);assert(b,'Published anemone exists');anemone={geometry:geometry(b),instance:header.nodes[b.instanceIDs[0]]};}
else{c.rocks=rocks;get('seed=84643');plain=get('anemoneGeometry()');get('seed=84643');anemone=get('reefAnemoneHabitat(rocks)');}
check('anemone holdfast vertices touch actual rendered stone',()=>{
 const v=vertices(anemone.geometry),original=plain?.v;let min=Infinity,max=-Infinity,count=0;
 const roots=[];
 if(compiled){
  // Indexing retains authored triangle order (only winding may reverse).
  // Each tube side starts with pa on its lower ring; unlike a global minimum,
  // these ten points identify every foot at its own independent rock height.
  const ix=anemone.geometry.indexed.indices,authoredCount=get('anemoneGeometry().v.length/12'),stride=authoredCount/180;assert.equal(ix.length,authoredCount);assert(Number.isInteger(stride));anemone.roots=[];
  for(let tentacle=0;tentacle<180;tentacle++){const ring=[];for(let side=0;side<10;side++){const k=ix[tentacle*stride+side*9]*12;roots.push(k);ring.push([v[k],v[k+1],v[k+2]]);}
   const center=[0,1,2].map(a=>ring.reduce((s,p)=>s+p[a],0)/10),angle=tentacle*2.39996,radius=Math.sqrt(tentacle/180)*.75;
   assert(Math.abs(center[0]-Math.cos(angle)*radius)<1e-5&&Math.abs(center[2]-Math.sin(angle)*radius)<1e-5,'Indexed ring must match its authored tentacle root');anemone.roots.push(world(center,anemone.instance));
  }assert.equal(anemone.roots.length,180);assert.equal(roots.length,1800);
 }else for(let k=0;k<v.length;k+=12)if(original[k+1]<=.025)roots.push(k);
 for(const k of roots){const p=world([v[k],v[k+1],v[k+2]],anemone.instance),top=height(stone,p[0],p[2],p[1]+2),gap=p[1]-top;assert(Number.isFinite(top),'Every foot has a real supporting rock triangle');min=Math.min(min,gap);max=Math.max(max,gap);count++;}
 console.log('  '+JSON.stringify({mode:compiled?'compiled':'source',tentacles:180,vertices:count,minGap:min,maxGap:max}));assert(count>=1800,'All 180 separate tentacle roots are tested');assert(max<=.035,'Anemone floating root gap '+max+' m');assert(min>=-.055,'Anemone roots buried '+(-min)+' m');
});
if(!compiled){
 check('all 180 tentacles translate rigidly and retain normals and RNG use',()=>{
  const a=plain.v,b=anemone.geometry.v,stride=a.length/180;assert(Number.isInteger(stride)&&stride%12===0);assert.equal(a.length,b.length);assert.equal(anemone.roots.length,180);
  for(let k=0;k<a.length;k+=12){const start=Math.floor(k/stride)*stride,dy=b[start+1]-a[start+1];assert(Math.abs(b[k+1]-a[k+1]-dy)<1e-12);for(const axis of [0,2,3,4,5])assert(Math.abs(a[k+axis]-b[k+axis])<1e-12,'position/normal changed outside vertical translation');if(a[k+1]<=.025)assert(b[k+1]<=0,'Root must stay outside the kind-3 sway zone');}
  get('seed=84643');const unchanged=get('anemoneGeometry()'),after=get('seed');get('seed=84643');const zero=get('anemoneGeometry(()=>0)');assert.equal(get('seed'),after);assert.deepEqual(Array.from(zero.v),Array.from(unchanged.v));
 });
 check('clownfish habitat comes from the same supported patch',()=>{
  assert(Math.abs(anemone.home[1]-Math.max(...anemone.roots.map(p=>p[1])))<1e-8);assert(anemone.home[1]<-10,'No stale floating habitat height');
  c.home=anemone.home;c.rows=[];get(`reefAnemoneHome=home;const savedFishGeometry=fishGeometry;fishGeometry=()=>new Geometry();const savedTurtle=turtleGeometry;turtleGeometry=()=>new Geometry();const savedRay=rayGeometry;rayGeometry=()=>new Geometry();const savedWhale=whaleGeometry;whaleGeometry=()=>new Geometry();const probeRecorder={batches:[],batch(g,instances){const b={instances};this.batches.push(b);return b;}};spawnCoreLife(probeRecorder);fishGeometry=savedFishGeometry;turtleGeometry=savedTurtle;rayGeometry=savedRay;whaleGeometry=savedWhale;`);
  get('initializeIndividuals(probeRecorder)');const clowns=get('life.filter(f=>f.species===0)');assert.equal(clowns.length,4);for(const f of clowns)assert.deepEqual(Array.from(f.center),Array.from(anemone.home));assert.deepEqual(Array.from(clowns,f=>f.uid),['clown-001','clown-002','clown-003','clown-004']);
 });
}
let batches;
if(compiled)batches=header.batches.filter(b=>['wreck-hull','wreck-fans','wreck-sponges','wreck-plates'].includes(b.sceneRole)).map(b=>({...b,geometry:geometry(b),instances:b.instanceIDs.map(id=>header.nodes[id])}));
else{c.recorded=[];get('buildWreckHabitat({batch(geometry,instances,kind=0){const b={geometry,instances,kind};recorded.push(b);return b;}},groundHeight(99,-166))');batches=c.recorded;}
if(compiled&&!batches.length){const hull=header.batches.find(b=>b.material===13&&b.instanceIDs.some(id=>header.nodes[id].p[0]===99));const at=header.batches.indexOf(hull);batches=header.batches.slice(at,at+4).map((b,k)=>({...b,sceneRole:['wreck-hull','wreck-fans','wreck-sponges','wreck-plates'][k],geometry:geometry(b),instances:b.instanceIDs.map(id=>header.nodes[id])}));}
const hull=batches.find(b=>b.sceneRole==='wreck-hull'),ship=triangleSurface(hull.geometry,hull.instances[0]);
check('all 28 wreck colonies have roots on actual intact hull/deck triangles',()=>{
 let count=0,max=-Infinity,min=Infinity;const counts={};
 for(const b of batches.filter(b=>b!==hull)){counts[b.sceneRole]=b.instances.length;const v=vertices(b.geometry);let bottom=Infinity;for(let k=1;k<v.length;k+=12)bottom=Math.min(bottom,v[k]);
  for(const n of b.instances){count++;let roots=0;for(let k=0;k<v.length;k+=12){if(v[k+1]>bottom+.035)continue;const p=world([v[k],v[k+1],v[k+2]],n),top=height(ship,p[0],p[2],n.p[1]+.20),gap=p[1]-top;assert(Number.isFinite(top),b.sceneRole+' root projects into a hull gap');max=Math.max(max,gap);min=Math.min(min,gap);roots++;assert(gap<=.035,b.sceneRole+' floating root '+gap+' m');assert(gap>=-.09,b.sceneRole+' buried root '+gap+' m');}assert(roots>0);}
 }
 assert.equal(count,28);assert.deepEqual(counts,{'wreck-fans':6,'wreck-sponges':8,'wreck-plates':14});console.log('  '+JSON.stringify({colonies:count,minGap:min,maxGap:max}));
});
check('support remains visible across every colony distance/quality range',()=>{
 for(const b of batches.filter(b=>b!==hull)){assert.equal(b.minDistance||0,0);assert(b.maxDistance<hull.maxDistance);assert.equal(b.instances.length,new Set(b.instances).size);for(const n of b.instances)assert(Math.hypot(...n.p.map((v,k)=>v-hull.instances[0].p[k]))<(hull.maxDistance-b.maxDistance)*.64);}
 assert(anemone.instance.s[0]===.78&&anemone.instance.s[1]===.84&&anemone.instance.s[2]===.82);
 for(const p of anemone.roots||[anemone.instance.p]){let support=null,top=-Infinity;for(const s of localRocks){const y=height(triangleSurface(s.geometry,s.instance),p[0],p[2]);if(y>top){top=y;support=s.instance;}}assert(support);assert(Math.hypot(...p.map((v,k)=>v-support.p[k]))<(30-12)*.64,'Anemone cannot outlive the matching high-detail support');}
});
check('arch geometry is an open exact-contact mesh',()=>{const a=get('archGeometry()');assert.equal(a.rockContact.kind,'arch');assert.equal(a.rockContact.closed,false);});

if(process.argv.includes('--local-neighbours'))check('regenerated local reef leaves the anemone footprint clear of other colonies',()=>{
 const near=vm.createContext({console,SCULPTED_CORAL:JSON.parse(fs.readFileSync('assets/coral_forms.json','utf8'))}),bake=fs.readFileSync('bake_scene.cjs','utf8'),files=JSON.parse('['+bake.match(/for\(const n of \[([^\]]+)\]/)[1].replaceAll("'",'"')+']');
 for(const file of files)vm.runInContext(fs.readFileSync('src/'+file,'utf8'),near,{filename:file});
 // Terrain generation has no random/state side effects. This is only the reef
 // component, not a full world build, bake, browser run or GPU residency test.
 vm.runInContext(`addGroundTiles=()=>{};const localRecorder={batches:[],batch(geometry,instances,kind=0,dynamic=false){const b={geometry,instances,kind,dynamic};this.batches.push(b);return b;}};constructCore(localRecorder);globalThis.localReef=localRecorder.batches;`,near);
 const set=near.localReef,a=set.find(b=>b.sceneRole==='reef-anemone');assert(a);
 function bounds(g,n){const v=vertices(g),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<v.length;k+=12){const p=world([v[k],v[k+1],v[k+2]],n);for(let j=0;j<3;j++){min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j]);}}return {min,max};}
 const target=bounds(a.geometry,a.instances[0]),overlaps=[];
 for(const b of set){if(b===a||b.dynamic||b.minDistance||![3,7,8].includes(b.geometry.material)||b.geometry.v[11]===22)continue;for(const n of b.instances){if(Math.hypot(n.p[0]+5.6,n.p[2]-1)>4)continue;const other=bounds(b.geometry,n);if(target.min.every((v,k)=>v<=other.max[k]&&target.max[k]>=other.min[k]))overlaps.push(n.p);}}
 assert.deepEqual(overlaps,[],'Tentacles intersect neighbouring colony bounds: '+JSON.stringify(overlaps));
});

console.log(checks+' habitat attachment checks passed ('+(compiled?'compiled':'source')+')');
