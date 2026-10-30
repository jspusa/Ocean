/* Public terrain meshes: shared LOD boundaries, preserved near geometry, no GPU. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console,URL,location:{href:'http://localhost/'},performance:{now:()=>10000}});
// Match the production coast owner: regions consults the already initialized
// trench heightfield at x260, including the clipped reef strip's eastern edge.
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions','scene_stream'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context,{filename:name+'.js'});
const ground=vm.runInContext('groundHeight',context),Geometry=vm.runInContext('Geometry',context),V=vm.runInContext('V',context),seed=vm.runInContext('seed',context),batches=[];
vm.runInContext('addGroundTiles',context)({batch(geometry,instances){const b={geometry,instances};batches.push(b);return b;}});
const tiles=new Map();for(let i=0;i<batches.length;i+=2){const [x,,z]=batches[i].instances[0].p;tiles.set(x+','+z,{x,z,high:batches[i],low:batches[i+1]});}
let passed=0,failed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);}}
function edge(batch,side){const axis=side<2?0:2,along=axis===0?2:0,origin=batch.instances[0].p,bound=side===1?Math.min(32,260-origin[0]):side%2?32:-32,out=new Map(),v=batch.geometry.v;for(let i=0;i<v.length;i+=12)if(Math.abs(v[i+axis]-bound)<1e-8)out.set(v[i+along]+origin[along],v[i+1]);return [...out].sort((a,b)=>a[0]-b[0]);}
function at(points,x){let i=0;while(i<points.length-2&&x>points[i+1][0])i++;const [a,b]=[points[i],points[i+1]],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
function edgeCount(tile,side){return side>=2&&tile.x+32>260?3:23;}
function equalEdge(a,b,label,count=23){assert.equal(a.length,count,label+' canonical perimeter samples');assert.equal(b.length,a.length,label+' both LODs use the same samples');for(let i=0;i<a.length;i++)for(let k=0;k<2;k++)assert(Math.abs(a[i][k]-b[i][k])<1e-9,label+' different edge vertex '+i);}
check('full tiles keep 22-segment perimeters and clipped tiles share the x260 boundary',()=>{assert.equal(tiles.size,100);for(const tile of tiles.values())for(let side=0;side<4;side++){equalEdge(edge(tile.high,side),edge(tile.low,side),tile.x+','+tile.z+' side '+side,edgeCount(tile,side));if(tile.x+32>260&&side===1)for(const batch of [tile.high,tile.low]){const v=batch.geometry.v;for(let i=0;i<v.length;i+=12)assert(v[i]+tile.x<=260,'reef never overlaps slope');}}});
check('all adjacent high/low combinations meet on exactly the same height curve',()=>{for(const tile of tiles.values())for(const [dx,dz,side,other]of [[64,0,1,0],[0,64,3,2]]){const next=tiles.get((tile.x+dx)+','+(tile.z+dz));if(!next)continue;for(const a of ['high','low'])for(const b of ['high','low'])equalEdge(edge(tile[a],side),edge(next[b],other),a+'/'+b+' neighbour',edgeCount(tile,side));}});
check('the photographed mobile abyss seam has no 45 cm height discontinuity',()=>{const a=tiles.get('-160,-250'),b=tiles.get('-160,-314'),near=edge(a.high,2),far=edge(b.low,3),eye=[-156,-63.5,-261];assert(Math.hypot(a.x-eye[0],-eye[1],a.z-eye[2])<82);assert(Math.hypot(b.x-eye[0],-eye[1],b.z-eye[2])>82);let gap=0;for(let x=-191.99;x<-128;x+=.02)gap=Math.max(gap,Math.abs(at(near,x)-at(far,x)));assert(gap<1e-9,'actual public mesh seam is '+gap+' metres');});
check('full near tiles preserve the original 22 by 22 triangulation',()=>{for(const tile of tiles.values()){if(tile.x+32>260)continue;const g=new Geometry(),N=22,pt=(i,j)=>{const x=tile.x+(i/N-.5)*64,z=tile.z+(j/N-.5)*64;return [x-tile.x,ground(x,z),z-tile.z];},norm=p=>{const x=p[0]+tile.x,z=p[2]+tile.z,e=.20;return V.norm([ground(x-e,z)-ground(x+e,z),2*e,ground(x,z-e)-ground(x,z+e)]);};for(let j=0;j<N;j++)for(let i=0;i<N;i++){const p=[pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)],n=p.map(norm),col=[.90,.89,.83];g.tri(p[0],p[2],p[1],col,[n[0],n[2],n[1]]);g.tri(p[0],p[3],p[2],col,[n[0],n[3],n[2]]);}assert.deepEqual(g.v,tile.high.geometry.v,'high geometry changed at '+tile.x+','+tile.z);}});
check('far triangulation covers its whole clipped footprint without degenerate faces',()=>{for(const tile of tiles.values()){const v=tile.low.geometry.v;assert(v.length/36<=320,'bounded far mesh budget');let area=0;for(let k=0;k<v.length;k+=36){const a=v.slice(k,k+3),b=v.slice(k+12,k+15),c=v.slice(k+24,k+27),normal=V.cross(V.sub(b,a),V.sub(c,a));assert(normal[1]>1e-8,'nondegenerate upward terrain triangle');area+=normal[1]*.5;for(let j=0;j<36;j++)assert(Number.isFinite(v[k+j]));}const expected=(Math.min(tile.x+32,260)-(tile.x-32))*64;assert(Math.abs(area-expected)<1e-7,'tile footprint has missing or doubled area');if(tile.x+32>260)assert.deepEqual(tile.high.geometry.v,v,'narrow coast strip keeps identical near and far geometry');}});
check('terrain construction retains LOD bounds, shadows, material and legacy random stream',()=>{assert.equal(vm.runInContext('seed',context),seed);for(const {high,low}of tiles.values()){assert.equal(high.maxDistance,100);assert.equal(high.shadowProxy,true);assert.equal(low.minDistance,100);assert.equal(low.maxDistance,520);assert.equal(low.shadow,false);assert.equal(high.geometry.material,1);assert.equal(low.geometry.material,1);}});
const Renderer=vm.runInContext('Renderer',context),SceneStream=vm.runInContext('SceneStream',context),encode=Renderer.prototype.updateBatch,openPlanes=Array.from({length:6},()=>[0,0,0,1]);
const qualities=[0,1,2,3],scaleAt=(mobile,quality)=>mobile?(quality===0?.64:.82):(quality===0?.75:1);
function submitted(material,mobile,quality,distance,shadowPass=false,depth=0){const renderer={mobile,quality,gl:{bindBuffer(){},bufferSubData(){}}},batch={material,kind:0,instances:[{p:[0,0,0]}],data:new Float32Array(24),radius:100,maxDistance:100},far={...batch,data:new Float32Array(24),minDistance:100,maxDistance:520};encode.call(renderer,batch,[0,depth,distance],openPlanes,shadowPass);encode.call(renderer,far,[0,depth,distance],openPlanes,shadowPass);return [batch.drawCount,far.drawCount];}
check('terrain submits exactly one LOD at every distance and quality boundary regardless of depth',()=>{for(const mobile of [false,true])for(const quality of qualities){const scale=scaleAt(mobile,quality),boundary=100*scale;for(const depth of [0,-8,-63.5,-150])for(const distance of [0,31,62,...[-.601,-.5062,-.001,0,.001,.5062,.601].map(d=>boundary+d),200*scale,519*scale]){const actual=submitted(1,mobile,quality,distance,false,depth);assert.deepEqual(actual,distance<boundary?[1,0]:[0,1],'overlapping, missing or noncanonical terrain at '+JSON.stringify({mobile,quality,depth,distance,actual}));}}});
check('nonterrain batches retain their existing overlapping 3D LOD transition',()=>{for(const mobile of [false,true])for(const quality of qualities){const scale=scaleAt(mobile,quality);assert.deepEqual(submitted(3,mobile,quality,100*scale),[1,1]);assert.deepEqual(submitted(3,mobile,quality,0,false,100*scale),[1,1]);assert.deepEqual(submitted(3,mobile,quality,62,false,-150),[0,1]);}});
check('terrain shadow proxy retains 3D distance and its existing boundary allowance',()=>{for(const mobile of [false,true])for(const quality of qualities){const scale=scaleAt(mobile,quality);assert.deepEqual(submitted(1,mobile,quality,100*scale,true),[1,1]);assert.deepEqual(submitted(1,mobile,quality,0,true,100*scale),[1,1]);assert.deepEqual(submitted(1,mobile,quality,62,true,-150),[0,1]);}});

// Decode the delivered archive independently: a helper-created 22x22 surface
// alone cannot prove that the mesh selected in normal play is that surface.
const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),base=8+raw.readUInt32LE(4),archive=JSON.parse(raw.subarray(8,base)),index=JSON.parse(fs.readFileSync(path.join(root,'assets/scene/index.json'),'utf8'));
const archivedTiles=new Map();for(const meta of archive.batches.filter(b=>b.material===1)){const p=archive.nodes[meta.instanceIDs[0]].p,key=p[0]+','+p[2];if(!archivedTiles.has(key))archivedTiles.set(key,{p});archivedTiles.get(key)[meta.minDistance?'low':'high']=meta;}
check('delivered high triangles and low boundaries match the canonical meshes including coast strips',()=>{
 assert.equal(archivedTiles.size,tiles.size);
 for(const [key,tile]of tiles)for(const lod of ['high','low']){const meta=archivedTiles.get(key)?.[lod];assert(meta,'missing archived '+lod+' tile '+key);assert.equal(meta.indexCount*12,tile[lod].geometry.v.length);
  for(let k=0;k<meta.indexCount;k++){const vertex=raw.readUInt32LE(base+meta.indexOffset+k*4);for(let c=0;c<12;c++)assert.equal(raw.readFloatLE(base+meta.vertexOffset+(vertex*12+c)*4),Math.fround(tile[lod].geometry.v[k*12+c]),'compiled '+lod+' geometry differs at '+key+' vertex '+k+' component '+c);}
 }
});
function tileFixture(key,mobile,quality){
 const source=index.batches.filter(b=>b.material===1&&index.nodes[b.instanceIDs[0]].p[0]+','+index.nodes[b.instanceIDs[0]].p[2]===key).sort((a,b)=>(a.minDistance||0)-(b.minDistance||0));assert.equal(source.length,2);
 const renderer=Object.assign(Object.create(Renderer.prototype),{mobile,quality,batches:[],gl:{bindBuffer(){},bufferSubData(){}}});
 const local={nodes:index.nodes,chunks:index.chunks,meshes:source.map(b=>index.meshes[b.meshID]),batches:source.map((b,meshID)=>({...b,meshID}))};
 const stream=new SceneStream(renderer,local,'assets/scene/index.json'),requested=[];stream.enqueue=(id,priority)=>requested.push([id,priority]);stream.status=()=>{};
 for(const m of stream.meshes){m.resident=true;m.lastNeeded=10000;for(const b of m.batches)b.vao={};}
 const draw=(eye,shadow=false)=>renderer.batches.map(b=>{renderer.updateBatch(b,eye,openPlanes,shadow);return b.drawCount;});
 return {renderer,stream,requested,draw,p:renderer.batches[0].instances[0].p};
}
check('every actual tile stays on canonical high geometry beneath the diver and a 6.3m third camera',()=>{
 let views=0,maxHorizontal=0;const bounds=vm.runInContext('OceanTrench.worldBounds',context),visited=new Set();
 for(const [key,tile]of tiles)for(const mobile of [false,true])for(const quality of qualities){const f=tileFixture(key,mobile,quality),x0=tile.x-32,x1=Math.min(tile.x+32,260);
  for(const x of [x0,(x0+x1)/2,x1])for(const z of [tile.z-32,tile.z,tile.z+32])for(const camera of [[0,0,0],[6.3,0,0],[-6.3,0,0],[0,0,6.3],[0,0,-6.3],[0,6.3,0],[4.2,2.1,4.2]]){
   if(x<bounds.left||x>bounds.right||z<bounds.top||z>bounds.bottom)continue;
   const eye=[x+camera[0],ground(x,z)+1.2+camera[1],z+camera[2]],horizontal=Math.hypot(eye[0]-f.p[0],eye[2]-f.p[2]);maxHorizontal=Math.max(maxHorizontal,horizontal);assert(horizontal<62,'camera fixture exceeds the promised contact neighbourhood');
   assert.deepEqual(f.draw(eye),[1,0],'near contact changed mesh '+JSON.stringify({key,mobile,quality,eye}));
   const ranges=f.stream.neededRanges(eye);assert(f.stream.needed(eye).has(0)&&ranges.required.has(0),'renderer-selected ground is not required for residency '+JSON.stringify({key,mobile,quality,eye}));views++;visited.add(key);
  }
 }
 assert.equal(visited.size,tiles.size,'every archived tile has a reachable footprint witness');
 console.log('  canonical contact-camera views: '+views+', largest XZ offset: '+maxHorizontal.toFixed(6)+'m');
});
check('62m mobile-low deep-water witness requires its real high mesh before the frame is ready',()=>{
 const f=tileFixture('-160,-250',true,0),eye=[f.p[0],ground(f.p[0],f.p[2]+62)+1.2,f.p[2]+62];assert(eye[1]<-40,'witness must be a real deep reef location');assert.deepEqual(f.draw(eye),[1,0]);assert(f.stream.needed(eye).has(0));assert(f.stream.neededRanges(eye).required.has(0));
 f.stream.meshes[0].resident=false;f.renderer.batches[0].vao=null;
 assert.equal(f.stream.update(eye,false),false,'readiness-only path skipped the visible near mesh');assert(f.requested.some(([id,priority])=>id===f.stream.meshes[0].meta.chunk&&priority===0));
 f.requested.length=0;assert.equal(f.stream.update(eye,true),false,'prefetch path skipped the visible near mesh');assert(f.requested.some(([id,priority])=>id===f.stream.meshes[0].meta.chunk&&priority===0));
 f.stream.meshes[0].resident=true;f.renderer.batches[0].vao={};assert.equal(f.stream.update(eye,true),true);assert.deepEqual(f.draw(eye),[1,0]);
});
check('nonterrain residency keeps vertical separation in all public selectors',()=>{
 for(const mobile of [false,true])for(const quality of qualities){const f=tileFixture('-160,-250',mobile,quality);for(const b of f.renderer.batches){b.material=3;b.shadow=false;}const eye=[f.p[0],-150,f.p[2]+62];
  assert.deepEqual(f.draw(eye),[0,1]);assert.equal(f.stream.needed(eye).has(0),false);assert.equal(f.stream.neededRanges(eye).required.has(0),false);assert.equal(f.stream.update(eye,true),true);
 }
});
check('terrain color required, preload and retention ranges agree at all four qualities',()=>{
 // Isolate color padding here: the preserved rounded shadow center may
 // legitimately retain a tile beyond the color-only 128m keep boundary.
 for(const mobile of [false,true])for(const quality of qualities){const f=tileFixture('-160,-250',mobile,quality),boundary=100*scaleAt(mobile,quality);for(const b of f.renderer.batches)b.shadow=false;
  for(const [distance,expected]of [[62,[true,true,true]],[boundary+20,[false,true,true]],[boundary+100,[false,false,true]],[boundary+130,[false,false,false]]])for(const depth of [0,-63.5,-150]){
   const eye=[f.p[0],depth,f.p[2]+distance],ranges=f.stream.neededRanges(eye);
   for(const [i,[name,padding]]of [['required',0],['preload',48],['keep',128]].entries()){assert.equal(f.stream.needed(eye,padding).has(0),expected[i],name+' selector lost terrain '+JSON.stringify({mobile,quality,distance,depth}));assert.equal(ranges[name].has(0),expected[i],name+' one-pass selector differs');}
   const drawn=f.draw(eye);assert.equal(drawn.reduce((a,b)=>a+b,0),1,'residency range exercise has a missing or doubled terrain LOD');for(let i=0;i<drawn.length;i++)if(drawn[i])assert(ranges.required.has(i),'a rendered mesh is absent from required residency');
  }
 }
});
console.log('Measured high/low triangles per tile:',batches[0].geometry.v.length/36,batches[1].geometry.v.length/36);
console.log(`${passed}/${passed+failed} terrain LOD checks passed`);if(failed)process.exitCode=1;
