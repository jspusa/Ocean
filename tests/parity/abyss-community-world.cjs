/* Real compiled population / geometry / pose boundary. Browser play and actual
 * shader deformation have separate acceptance, never inferred from this file. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))),header=JSON.parse(bytes.subarray(8,8+bytes.readUInt32LE(4)));
const modules=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world'];
function world(expansion){
 const ctx=vm.createContext({console,header:JSON.parse(JSON.stringify(header))}),get=s=>vm.runInContext(s,ctx);
 for(const name of modules)vm.runInContext(read(name),ctx,{filename:name});
 if(expansion)for(const name of ['tripod_fish','dumbo_octopus','abyss_community'])if(fs.existsSync(path.join(root,'src',name+'.js')))vm.runInContext(read(name),ctx,{filename:name});
 const renderer={batches:[],batch(g,instances,kind,dynamic){const b={g,instances,kind,dynamic};this.batches.push(b);return b;}};ctx.renderer=renderer;
 get('obstacles.push(...header.obstacles);reefPatches.push(...header.reefPatches);life.push(...header.life.map(i=>header.nodes[i]).filter(f=>!f.abyssCommunity));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals(renderer)');
 return {ctx,get,renderer};
}
const before=world(false),after=world(true),clone=v=>JSON.parse(JSON.stringify(v));
assert.equal(after.get('typeof ensureAbyssCommunity'),'function','Compiled loading must append both real deep-sea encounters');
assert.equal(after.get('ensureAbyssCommunity(renderer)'),true);after.get('initializeIndividuals(renderer)');
assert.equal(after.get('SPECIES.length'),46);assert.equal(after.get('JSON.stringify(SPECIES.slice(0,44).map(s=>s.id))'),before.get('JSON.stringify(SPECIES.map(s=>s.id))'));
assert.equal(after.get('JSON.stringify(life.filter(f=>!f.abyssCommunity))'),before.get('JSON.stringify(life)'));
assert.equal(after.get('JSON.stringify(shoal)'),before.get('JSON.stringify(shoal)'));
assert.deepEqual(clone(after.get('life.filter(f=>f.abyssCommunity).map(f=>f.uid)')),['tripod_fish-001','dumbo_octopus-001']);
assert.equal(after.renderer.batches.length,4);for(let i=0;i<4;i+=2){const hi=after.renderer.batches[i],lo=after.renderer.batches[i+1];assert.equal(hi.instances,lo.instances);assert.equal(hi.kind,11);assert.equal(hi.instances.length,1);assert.equal(hi.maxDistance,lo.minDistance);assert.equal(lo.shadow,false);assert(lo.maxDistance<=55);}
assert.equal(after.get('ensureAbyssCommunity(renderer)'),false);assert.equal(after.renderer.batches.length,4);
console.log('PASS two stable individuals append once, four shared LOD batches, all 44 incumbent catalogue/actors/UIDs unchanged');
const dumboView=after.get(`(()=>{
 // An independently framed version of the authored gate approach. Use actual
 // ear-tip/eye vertices and real poses: a side-on animal must fail even when
 // its position, size and generic observation-distance assertions all pass.
 const f=JSON.parse(JSON.stringify(life.find(f=>SPECIES[f.species].id==='dumbo_octopus'))),sp=SPECIES[f.species],g=faunaGeometry(sp),gate=AbyssCommunity.encounters.find(e=>e.species===sp.id).gate;
 const groups={left:[],right:[],eyes:[]};
 for(let k=0;k<g.v.length;k+=12){const p=g.v.slice(k,k+3),tag=g.v[k+11];if(tag===3&&Math.abs(p[2])>.50)groups[p[2]<0?'left':'right'].push(p);if(tag===4)groups.eyes.push(p);}
 const mean=rows=>rows.reduce((sum,p)=>V.add(sum,p),[0,0,0]).map(n=>n/rows.length),tips=[mean(groups.left),mean(groups.right)],eyes=mean(groups.eyes);
 faunaMotionPose(f,0);const focus=animalFocusPoint(f),away=V.norm([gate[0]-focus[0],0,gate[2]-focus[2]]),camera=V.add(V.add(focus,V.mul(away,1.5)),[0,.27,0]),forward=V.norm(V.sub(focus,camera)),right=V.norm(V.cross(forward,[0,1,0]));
 const projectX=p=>{const offset=V.sub(p,camera);return V.dot(offset,right)/V.dot(offset,forward);},rows=[];
 for(let time=0;time<=240;time+=2){
  faunaMotionPose(f,time);const c=Math.cos(f.yaw),s=Math.sin(f.yaw),world=p=>[f.p[0]+sp.size*(c*p[0]+s*p[2]),f.p[1]+sp.size*p[1],f.p[2]+sp.size*(-s*p[0]+c*p[2])],center=animalFocusPoint(f),x=projectX(center),projected=tips.map(p=>projectX(world(p))-x),eyeFacing=V.dot(V.norm(V.sub(world(eyes),f.p)),V.norm(V.sub(camera,f.p)));
  for(const [width,height]of [[1440,900],[390,844],[844,390]])rows.push({time,viewport:[width,height],oppositeSides:projected[0]*projected[1]<0,separationPixels:Math.abs(projected[0]-projected[1])*height/(2*Math.tan(69*Math.PI/360)),eyeFacing});
 }
 return {vertexCounts:Object.fromEntries(Object.entries(groups).map(([id,rows])=>[id,rows.length])),camera,rows};
})()`);
assert(Object.values(dumboView.vertexCounts).every(n=>n>0),'Facing evidence must use both actual ear tips and the model eyes');
assert(dumboView.rows.every(r=>r.oppositeSides&&r.separationPixels>=30&&r.eyeFacing>.85),'Authored dumbo observation must reveal separated ear fins and a viewer-facing eye pair throughout its bounded hover: '+JSON.stringify(dumboView.rows.find(r=>!r.oppositeSides||r.separationPixels<30||r.eyeFacing<=.85)));
console.log('PASS authored dumbo view separates both real ear tips and faces its eyes toward the viewer throughout 240 seconds of bounded motion');
const envelope=after.get(`(()=>{
 const result=[];
 for(const f of life.filter(f=>f.abyssCommunity)){
  const sp=SPECIES[f.species],g=faunaGeometry(sp),fixed=JSON.stringify([f.uid,f.home,f.s]),first=f.p.slice();let floorGap=Infinity,motion=0;
  for(let time=0;time<=240;time+=2){
   faunaMotionPose(f,time);motion=Math.max(motion,V.dist(f.p,first));const c=Math.cos(f.yaw),s=Math.sin(f.yaw);
   for(let k=0;k<g.v.length;k+=12){
    const q=g.v.slice(k,k+3),x=q[0]*sp.size,z=q[2]*sp.size,p=[f.p[0]+c*x+s*z,f.p[1]+q[1]*sp.size,f.p[2]-s*x+c*z];
    // Conservative rig displacement bounds from this release's fixed spec:
    // pectorals 0.018 model units; ears 0.09; arms 4.5 percent radial pulse.
    const pad=sp.id==='dumbo_octopus'?.025:g.v[k+11]===3?.005:0;
    floorGap=Math.min(floorGap,p[1]-pad-OceanTrench.floorAt(p[0],p[2],f.home[1]+.5));
    if(!OceanTrench.containsPosition(p))throw Error('Whole animal leaves water');
    if(pad&&OceanRegions.pointBlocked(p,pad))throw Error('Animated appendage intersects rock');
   }
   if(sp.id==='tripod_fish')for(const support of g.anatomy.supports){const q=support.contact,x=q[0]*sp.size,z=q[2]*sp.size,p=[f.p[0]+c*x+s*z,f.p[1]+q[1]*sp.size,f.p[2]-s*x+c*z];if(Math.abs(p[1]-OceanTrench.floorAt(p[0],p[2],p[1]+.1))>1e-6)throw Error('A declared support ray is floating or buried');}
   if(JSON.stringify([f.uid,f.home,f.s])!==fixed)throw Error('Motion changed saved identity/home/scale');
  }
  faunaMotionPose(f,17);const a=JSON.stringify([f.p,f.yaw,f.pitch]);faunaMotionPose(f,100);faunaMotionPose(f,17,f.p,{observerPosition:[0,0,0]});if(JSON.stringify([f.p,f.yaw,f.pitch])!==a)throw Error('Pose depends on camera or frame history');
  result.push({id:sp.id,floorGap,motion});
 }
 return result;
})()`);
assert(envelope[0].floorGap>=-1e-6&&envelope[0].motion===0,'Three feet plant the static body without burying any geometry');
assert(envelope[1].floorGap>3&&envelope[1].motion>.1&&envelope[1].motion<.35,'Whole octopus hovers above the actual 3602 m mud platform');
console.log('PASS 240 seconds of whole-model floor envelopes, three physical contacts, stable identity and deterministic motion: '+JSON.stringify(envelope));
after.get('const oceanFeatures={register(){},state(){return {}}};');vm.runInContext(read('aquarium'),after.ctx);
const aquarium=after.get(`(()=>{const rows=[];for(const id of ['tripod_fish','dumbo_octopus']){const sp=SPECIES.find(s=>s.id===id),f=JSON.parse(JSON.stringify(life.find(f=>SPECIES[f.species].id===id)));for(let cell=0;cell<12;cell++)for(let level=0;level<3;level++){const layout=oceanAquarium.exhibitLayout({species:id,cell,level});f.home=layout.home.slice();f.p=f.home.slice();f.radius=layout.radius;for(const time of [0,5,90,240]){faunaMotionPose(f,time,f.p,{exhibit:true});if(V.dist(f.p,f.home)>.18)throw Error('Exhibit escaped local home');if(id==='tripod_fish'){if(!layout.supported||f.p[1]!==layout.base[1])throw Error('Exhibit tripod has no support');for(const point of faunaGeometry(sp).anatomy.supports.map(s=>s.contact)){if(Math.abs(point[0]*sp.size)>layout.pad/2||Math.abs(point[2]*sp.size)>layout.pad/2)throw Error('Foot misses actual support pad');}}}if(layout.scale!==sp.size)throw Error('Exhibit changes biological scale');}rows.push(id);}return rows;})()`);
assert.equal(aquarium.length,2);console.log('PASS all 36 exhibit layouts preserve scale, local motion and three-foot support');
for(const time of [0,1,20,240]){before.get('updateLife('+time+')');after.get('updateLife('+time+')');assert.equal(after.get('JSON.stringify(life.filter(f=>!f.abyssCommunity))'),before.get('JSON.stringify(life)'));}
console.log('PASS incumbent actors keep their original motion through the shared fauna boundary');
