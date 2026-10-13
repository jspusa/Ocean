/* Public original-region geometry/collision contract. CPU only, no visual claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console});
for(const file of ['engine','world','reef_detail','next_reef','individuals','open_world','fauna','cetaceans'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
const baseGround=vm.runInContext('groundHeight',context),seedBefore=vm.runInContext('seed',context),landmarksBefore=vm.runInContext('JSON.stringify(LANDMARKS)',context);
const source=path.join(root,'src/regions.js');assert.ok(fs.existsSync(source),'RED: public spatial region module must exist');
vm.runInContext(fs.readFileSync(source,'utf8'),context);
const R=vm.runInContext('OceanRegions',context),plain=v=>JSON.parse(JSON.stringify(v));
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
check('public contract contains three authored regions with distinct connected routes',()=>{
 assert.deepEqual(Array.from(R.definitions,r=>r.id),['cave','ruins','abyss']);
 for(const region of R.definitions){assert(R.route(region.id).length>=5);assert(R.landmarks.some(l=>l.id===region.landmark));assert(R.route(region.id).every(p=>p.length===3&&p.every(Number.isFinite)));}
 assert.notDeepEqual(plain(R.route('cave')),plain(R.route('ruins')));
});
check('route segments have diver clearance and remain inside the existing world bounds',()=>{
 for(const region of R.definitions){const points=R.route(region.id);for(let i=0;i<points.length;i++){
  const p=points[i];assert(Math.hypot(p[0]/270,(p[2]+90)/295)<1,region.id+' world edge');
  assert(p[1]>R.groundHeight(p[0],p[2])+.9,region.id+' terrain clearance');
  assert.deepEqual(plain(R.resolve(p.slice(),.4)),plain(p),region.id+' safe route point');
  if(i){assert.equal(R.segmentBlocked(points[i-1],p,.4),false,region.id+' route segment '+i);assert(R.pathClear(points[i-1],p,.4),region.id+' sampled terrain route '+i);}
 }}
});
check('cave has real roof coverage, blocked roof and walls, and open entrances',()=>{
 const region=R.definitions.find(r=>r.id==='cave'),p=region.interior;
 assert(R.coverage(p)>.9,'inside cave is roofed');assert.equal(R.coverage(region.entrance),0,'outside approach has open sky');
 assert(R.segmentBlocked(p,[p[0],p[1]+12,p[2]],.13),'cannot see through roof');
 const roof=R.solids.find(s=>s.region==='cave'&&s.role==='roof'),center=roof.min.map((v,i)=>(v+roof.max[i])*.5),resolved=R.resolve(center.slice(),.4);
 assert(R.pointBlocked(center,.4));assert(!R.pointBlocked(resolved,.3999),'roof collision exits solid');
 assert(R.solids.some(s=>s.region==='cave'&&s.role==='wall'));
});
check('ruin complex has door passages, an open courtyard, and a covered archive chamber',()=>{
 const r=R.definitions.find(r=>r.id==='ruins');assert.equal(R.coverage(r.courtyard),0);assert(R.coverage(r.interior)>.9);
 assert(R.solids.filter(s=>s.region==='ruins'&&s.role==='column').length>=8);assert(R.solids.some(s=>s.region==='ruins'&&s.role==='roof'));
});
check('abyss route descends meaningfully with a navigable open canyon floor',()=>{
 const p=R.route('abyss');assert(p[0][1]-p[p.length-1][1]>17);assert(R.groundHeight(p.at(-1)[0],p.at(-1)[2])<-88);
 assert(p.every(q=>R.coverage(q)===0));assert(R.solids.filter(s=>s.region==='abyss').length>=6);
});
check('collision is deterministic, finite, bounded and does not shift safe water',()=>{
 for(const s of R.solids){const p=s.min.map((v,i)=>(v+s.max[i])*.5),a=R.resolve(p.slice(),.4),b=R.resolve(p.slice(),.4);assert(a.every(Number.isFinite));assert.deepEqual(plain(a),plain(b));assert(!R.pointBlocked(a,.399),'resolved point '+s.id);}
 for(const p of [[0,-8,7],[99,-28,-166],[-10,-30,-230]])assert.deepEqual(plain(R.resolve(p.slice())),p);
 assert.equal(R.segmentBlocked([0,-8,7],[0,-8,-4]),false);
});
check('registration and geometry never consume the legacy random stream or alter existing landmarks',()=>{
 assert.equal(vm.runInContext('seed',context),seedBefore);assert.equal(vm.runInContext('JSON.stringify(LANDMARKS)',context),landmarksBefore);
 const before=vm.runInContext('seed',context),a=[],b=[],record=items=>({batch(g,instances,kind=0,dynamic=false){const batch={g,instances,kind,dynamic};items.push(batch);return batch;}});
 R.build(record(a));R.build(record(b));assert.equal(vm.runInContext('seed',context),before);assert(a.length>6&&a.length<35);
 assert.deepEqual(a.map(m=>m.g.v),b.map(m=>m.g.v));assert(a.every(m=>m.g.v.length>0&&m.g.v.every(Number.isFinite)&&m.g.shadow!==false));
 const bytes=a.reduce((n,m)=>n+m.g.v.length*4,0);assert(bytes<6*1024*1024,'unindexed regional geometry budget');
 const index=vm.runInContext('indexGeometry',context),packed=a.map(m=>index(m.g.v));assert(packed.reduce((n,m)=>n+m.vertices.byteLength+m.indices.byteLength,0)<2*1024*1024,'indexed regional geometry remains below 2 MiB');
 assert(a.some(m=>m.sceneRole==='region:cave'));assert(a.some(m=>m.sceneRole==='region:ruins'));assert(a.some(m=>m.sceneRole==='region:abyss'));
});
check('geological wall and roof meshes have inward relief while keeping every original solid envelope',()=>{
 const batches=[];R.build({batch(g,instances){const b={g,instances};batches.push(b);return b;}});
 const geo=batches.filter(b=>['wall','roof'].includes(b.regionRole)&&['region:cave','region:abyss'].includes(b.sceneRole));assert.equal(geo.length,3,'RED: explicitly identify the three geological surface batches');
 let varied=0;for(const b of geo){const solids=R.solids.filter(s=>'region:'+s.region===b.sceneRole&&s.role===b.regionRole),origin=b.instances[0].p;for(let k=0;k<b.g.v.length;k+=12){const p=b.g.v.slice(k,k+3).map((n,i)=>n+origin[i]),n=b.g.v.slice(k+3,k+6),axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),distance=s=>Math.min(p[axis]-s.min[axis],s.max[axis]-p[axis]),s=solids.filter(s=>p.every((n,i)=>n>=s.min[i]-1e-6&&n<=s.max[i]+1e-6)).sort((a,b)=>distance(a)-distance(b))[0];assert(s,'actual rock vertex leaves its unchanged collision envelope');const interior=[0,1,2].filter(i=>i!==axis).every(i=>p[i]>s.min[i]+.4&&p[i]<s.max[i]-.4);if(interior&&Math.max(...n.map(Math.abs))<.995)varied++;
  if(interior){const inner=s.id.endsWith('-1')&&!s.id.endsWith('--1')?-1:1,protectedFace=s.region==='cave'&&!(s.role==='roof'&&axis===1&&n[1]>0)||s.region==='abyss'&&(axis===2||axis===0&&n[0]*inner>0);if(protectedFace)assert(Math.min(p[axis]-s.min[axis],s.max[axis]-p[axis])<=.20,'swimmable face retreats more than 20cm from collision '+JSON.stringify({id:s.id,p,n,axis}));}
 }}
 assert(varied>500,'RED: broad rock faces need real normal variation, not only bevelled box corners');
 const roof=geo.find(b=>b.regionRole==='roof'),origin=roof.instances[0].p;for(const s of R.solids.filter(s=>s.region==='cave'&&s.role==='roof'))for(let mask=0;mask<8;mask++){const corner=s.min.map((n,i)=>mask&(1<<i)?s.max[i]:n);assert(roof.g.v.some((_,k)=>k%12===0&&corner.every((n,i)=>Math.abs(roof.g.v[k+i]+origin[i]-n)<1e-6)),'cave roof boundary corners must remain sealed');}
});
check('investigation surfaces have usable sight lines and region-depth landmarks',()=>{
 for(const [id,p] of Object.entries(R.points)){assert.deepEqual(plain(p.look),plain(p.p));assert(!R.pointBlocked(p.stance,.4),id+' clear stance');const target=p.p.slice();if(id.startsWith('abyss-'))target[1]+=.55;assert(!R.segmentBlocked(p.stance,target,.13),id+' inspectable surface');}
 for(const l of R.landmarks)assert.equal(l.y,l.spawn[1]);
 assert.equal(R.ceilingAt(-231.5,-58,-26),-23);assert.equal(R.ceilingAt(-217.6,-47.5,-26),0,'real skylight');assert.equal(R.ceilingAt(188,-228,-51),-47.2);assert.equal(R.ceilingAt(-143,-321,-90),0);
});
check('the skylight stone has three real parallel recessed channels within its existing footprint',()=>{
 const batches=[];R.build({batch(g,instances){const b={g,instances};batches.push(b);return b;}});
 const target=R.points['cave-light'].p;
 const stones=batches.filter(b=>b.sceneRole==='region:cave'&&b.g.v.every((n,k)=>k%12!==0||Math.hypot(n+b.instances[0].p[0]-target[0],b.g.v[k+2]+b.instances[0].p[2]-target[2])<=.80001));assert.equal(stones.length,1);
 const b=stones[0],v=b.g.v,origin=b.instances[0].p;
 const height=(x,z)=>{x+=target[0]-origin[0];z+=target[2]-origin[2];let top=-Infinity;for(let k=0;k<v.length;k+=36){const a=[v[k],v[k+2]],c=[v[k+12],v[k+14]],d=[v[k+24],v[k+26]],det=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1]);if(Math.abs(det)<1e-10)continue;const u=((c[1]-d[1])*(x-d[0])+(d[0]-c[0])*(z-d[1]))/det,w=((d[1]-a[1])*(x-d[0])+(a[0]-d[0])*(z-d[1]))/det;if(u>=-1e-8&&w>=-1e-8&&u+w<=1+1e-8)top=Math.max(top,u*v[k+1]+w*v[k+13]+(1-u-w)*v[k+25]+origin[1]);}return top;};
 for(const z of [-.35,0,.35])for(const x of [-.22,0,.22]){const floor=height(x,z),left=height(x-.11,z),right=height(x+.11,z);assert(left-floor>.045&&right-floor>.045,'RED: each visible groove needs two raised stone banks and a recessed floor');assert(floor>=target[1]-.001&&Math.max(left,right)<=target[1]+.065);}
 assert.deepEqual(plain(target),[-217.6,-28.72,-47.5]);assert(!R.segmentBlocked(R.points['cave-light'].stance,target,.13));
});
check('routes clear the actual near terrain triangles and each proposed mooring range',()=>{
 function triangle(x,z){const N=22,d=64/N,startX=Math.floor((x+320)/64)*64-320,startZ=Math.floor((z+410)/64)*64-410,u=(x-startX)/d,v=(z-startZ)/d,i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,h=(di,dj)=>R.groundHeight(startX+(i+di)*d,startZ+(j+dj)*d),h00=h(0,0),h10=h(1,0),h11=h(1,1),h01=h(0,1);return a>=b?h00+(h10-h00)*a+(h11-h10)*b:h00+(h11-h01)*a+(h01-h00)*b;}
 const moorings={west:[-94,-59],east:[98,-137],offshore:[-10,-208]};
 for(const region of R.definitions){const points=R.route(region.id),boat=moorings[region.mooring];for(let i=1;i<points.length;i++)for(let k=0;k<=20;k++){const p=points[i-1].map((n,j)=>n+(points[i][j]-n)*k/20);assert(p[1]>triangle(p[0],p[2])+.82,region.id+' visible terrain route '+i);assert(Math.hypot(p[0]-boat[0],p[2]-boat[1])<180,region.id+' voyage radius');}}
});
check('all three sensor platforms sit above the actual near-ground triangles at every corner',()=>{
 function triangle(x,z){const d=64/22,sx=Math.floor((x+320)/64)*64-320,sz=Math.floor((z+410)/64)*64-410,u=(x-sx)/d,v=(z-sz)/d,i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,h=(di,dj)=>R.groundHeight(sx+(i+di)*d,sz+(j+dj)*d),h00=h(0,0),h10=h(1,0),h11=h(1,1),h01=h(0,1);return a>=b?h00+(h10-h00)*a+(h11-h10)*b:h00+(h11-h01)*a+(h01-h00)*b;}
 for(const p of Object.values(R.points).filter(p=>p.id.startsWith('abyss-')))for(const [x,z] of [[-1.2,-1.2],[1.2,1.2],[-1.2,1.2],[1.2,-1.2],[0,0]]){const top=p.p[1],floor=triangle(p.p[0]+x,p.p[2]+z);assert(top-floor>=.1,p.id+' platform buried in terrain');assert(top-floor<=.25,p.id+' platform floats over terrain');}
});
check('all 725 existing actors retain identity, dimensions and sampled original movement',()=>{
 const packed=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(packed.subarray(8,8+packed.readUInt32LE(4))),ids=[...header.life,...header.decorLife,...header.shoal];const actual=ids.map(n=>header.nodes[n]).filter(f=>!Number.isInteger(f.species)||f.species<27);assert.equal(actual.length,725);
 for(const f of actual){const p=f.home||f.center;if(p)assert.equal(R.groundHeight(p[0],p[2]),baseGround(p[0],p[2]),f.uid||'legacy home');}
 const animal=vm.runInContext('animalTrajectory',context),fauna=vm.runInContext('faunaMotionPose',context);
 for(const original of actual.filter(f=>Number.isInteger(f.species))){for(const time of [0,17,71,139,283]){
  const a=plain(original),b=plain(original);context.groundHeight=baseGround;
  if(a.fauna)fauna(a,time,a.p,{react:false,obstacles:[]});else animal(a,time,a.p);
  context.groundHeight=R.groundHeight;if(b.fauna)fauna(b,time,b.p,{react:false,obstacles:[]});else animal(b,time,b.p);
  assert.deepEqual(plain(b.p),plain(a.p),original.uid+' trajectory at '+time);assert.deepEqual(b.s,original.s);assert.equal(b.uid,original.uid);
 }}
 for(const [x,z] of [[0,0],[-100,-76],[99,-166],[-10,-231],[108,-83]])assert.equal(R.groundHeight(x,z),baseGround(x,z));
});
console.log(passed+' region geometry and route checks passed');
