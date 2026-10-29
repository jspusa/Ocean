/* Production player-body behavior against the real archive and real app camera.
 * CPU-only: this is not native/rendered acceptance or an FPS/power benchmark.
 * The independent all-triangle animation envelope proof lives separately. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),source=n=>read('src/'+n+'.js').toString(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/v01844-turtle/diver-contact.json';
const raw=zlib.gunzipSync(read('assets/reef.mesh.gz')),offset=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,offset));
const context=vm.createContext({console,header}),get=s=>vm.runInContext(s,context),inputs={};
for(const file of require(root+'/scene_inputs.cjs').MODULES){const bytes=read('src/'+file);inputs[file]=hash(bytes);vm.runInContext(bytes.toString(),context,{filename:file});}
if(get('typeof OceanDiverContact')==='undefined')vm.runInContext(source('player_contact'),context,{filename:'player_contact.js'});
inputs['player_contact.js']=hash(source('player_contact'));inputs['app.js']=hash(source('app'));
const rocks=get('OceanRockContact'),contact=get('OceanDiverContact'),regions=get('OceanRegions');rocks.install(header.rockContact);
get('obstacles.push(...header.obstacles);');
const app=source('app'),legacy=cp.execFileSync('git',['show','91848fdf1fae4338408ee1dcbfd05565b1c63832:src/app.js'],{cwd:root,encoding:'utf8'});
vm.runInContext(legacy.slice(legacy.indexOf('function collide('),legacy.indexOf('function dir(')).replace('function collide(','function legacyCollide('),context,{filename:'v43-app-collide'});
vm.runInContext(app.slice(app.indexOf('function dir('),app.indexOf('function startDive(')),context,{filename:'app-direction'});
vm.runInContext(app.slice(app.indexOf('function updateCamera('),app.indexOf('function blocked(')),context,{filename:'app-camera'});
const plain=x=>JSON.parse(JSON.stringify(x)),add=(a,b)=>a.map((v,k)=>v+b[k]),sub=(a,b)=>a.map((v,k)=>v-b[k]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0),dist=(a,b)=>Math.hypot(...sub(a,b)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mesh=b=>({vertices:new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+offset+b.indexOffset,b.indexCount)}),diver=mesh(header.batches[header.diverBatch]),originalDiver=header.nodes[header.batches[header.diverBatch].instanceIDs[0]];
const witness={from:[-9.26135443333204,-10.314916159002705,1.3035874453487086],normal:[.53459202150954,.8440941594690159,-.041429705389237924],rock:[-10.916091154348962,-11.506344136714409,1.1098294701659324]};
const yaw=Math.atan2(-witness.normal[0],witness.normal[2]),pitch=Math.asin(-witness.normal[1]),request=(p,y=yaw,q=pitch)=>({p:Array.from(p),yaw:y,pitch:q,scale:originalDiver.s[0]});
const rn=header.nodes.find(n=>n.p&&dist(n.p,witness.rock)<1e-8),rb=header.batches.find(b=>!b.minDistance&&b.material===2&&b.instanceIDs.some(i=>header.nodes[i]===rn)),rm=mesh(rb);
// Independent parity over every actual triangle of the witness rock; no BVH.
function bruteInside(p){const d=sub(p,rn.p),c=Math.cos(rn.yaw||0),s=Math.sin(rn.yaw||0),scale=rn.s||[1,1,1],o=[(c*d[0]-s*d[2])/scale[0],d[1]/scale[1],(s*d[0]+c*d[2])/scale[2]],direction=[.937,.221,.311],hits=[];
 for(let k=0;k<rm.indices.length;k+=3){const [a,b,c]=[0,1,2].map(j=>Array.from(rm.vertices.subarray(rm.indices[k+j]*12,rm.indices[k+j]*12+3))),e1=sub(b,a),e2=sub(c,a),h=cross(direction,e2),den=dot(e1,h);if(Math.abs(den)<1e-10)continue;const q=sub(o,a),u=dot(q,h)/den;if(u<0||u>1)continue;const v=cross(q,e1),w=dot(direction,v)/den;if(w<0||u+w>1)continue;const t=dot(e2,v)/den;if(t>1e-7)hits.push(t);}
 hits.sort((a,b)=>a-b);return hits.filter((v,k)=>!k||Math.abs(v-hits[k-1])>1e-6).length%2===1;
}
function modelPoint(id,pose,{time=0,swim=0,roll=0}={}){const k=id*12,tag=diver.vertices[k+11];let [x,y,z]=diver.vertices.subarray(k,k+3);
 if(tag>9.5&&tag<12){const side=tag<10.5?1:-1,ang=Math.sin(time*2.45+side*1.5708)*(.045+.155*swim),along=Math.max(0,z-.38);y+=Math.sin(ang)*along;z=.38+Math.cos(ang)*along;y+=Math.sin(time*2.45+side*1.5708+.60)*Math.max(0,z-1.03)*(.03+.10*swim);}
 if(tag>11.5&&tag<14)y+=Math.sin(time*.7+tag)*.014;
 const xx=x*Math.cos(roll)-y*Math.sin(roll),yy=x*Math.sin(roll)+y*Math.cos(roll),cp=Math.cos(-pose.pitch),sp=Math.sin(-pose.pitch),c=Math.cos(-pose.yaw),s=Math.sin(-pose.yaw),scale=pose.scale;
 x=xx*scale;y=(yy*cp+z*sp)*scale;z=(-yy*sp+z*cp)*scale;return [pose.p[0]+c*x+s*z,pose.p[1]+y,pose.p[2]-s*x+c*z];
}
// Independent barycentric height from the actual Float32 rendered trench bed.
// It does not call groundHeight, the contact owner, or the construction builder.
function archivedBedHeight(x,z){let highest=-Infinity,witness=null;for(const [bi,b] of header.batches.entries()){if(b.dynamic||b.material!==17||b.sceneRole!=='region:trench')continue;const m=mesh(b);
 for(const id of b.instanceIDs){const n=header.nodes[id],scale=n.s||[1,1,1],co=Math.cos(n.yaw||0),si=Math.sin(n.yaw||0),point=idx=>{const k=idx*12,px=m.vertices[k]*scale[0],py=m.vertices[k+1]*scale[1],pz=m.vertices[k+2]*scale[2];return [n.p[0]+co*px+si*pz,n.p[1]+py,n.p[2]-si*px+co*pz];};
  for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=[point(m.indices[i]),point(m.indices[i+1]),point(m.indices[i+2])];if(x<Math.min(a[0],b[0],c[0])-1e-7||x>Math.max(a[0],b[0],c[0])+1e-7||z<Math.min(a[2],b[2],c[2])-1e-7||z>Math.max(a[2],b[2],c[2])+1e-7)continue;const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-10)continue;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den,w=1-u-v;if(Math.min(u,v,w)<-1e-7)continue;const y=u*a[1]+v*b[1]+w*c[1];if(y>highest){highest=y;witness={batch:bi,node:id,triangle:i/3,points:[a,b,c]};}}
 }}return {height:highest,witness};}
function insideModel(pose,options={},rigid=false){const bad=[];let examined=0;for(let id=0;id<diver.vertices.length/12;id++){if(rigid&&diver.vertices[id*12+11]>9.5)continue;examined++;const p=modelPoint(id,pose,options);if(rocks.overlaps(p))bad.push({vertex:id,p});}return {examined,bad};}
function assertSafe(pose,label='body'){assert(pose,label+' has no accepted pose');for(const [i,s] of Array.from(contact.volumes(pose)).entries()){
 assert(s.p.every(Number.isFinite)&&Number.isFinite(s.r),label+' nonfinite volume');assert(!rocks.overlaps(s.p,s.r),label+' volume '+i+' overlaps real rock: '+JSON.stringify(s));assert(!regions.pointBlocked(s.p,s.r),label+' volume '+i+' overlaps a regional solid');assert(s.p[1]>=context.groundHeight(s.p[0],s.p[2])+s.r-1e-6,label+' volume '+i+' is below terrain');const ground=get('OceanTrench').groundContact(s.p,s.r);assert(!ground||ground.distance<1e-8,label+' volume '+i+' crosses actual slope plane: '+JSON.stringify(ground));
 }return pose;}
function interpolate(a,b,f){return {p:a.p.map((v,k)=>v+(b.p[k]-v)*f),yaw:a.yaw+(b.yaw-a.yaw)*f,pitch:a.pitch+(b.pitch-a.pitch)*f,scale:a.scale};}
function assertMotion(a,b,label){for(const f of [.2,.4,.6,.8,1])assertSafe(interpolate(a,b,f),label+' at '+f);}
function setupCamera(pose,third=true){const fixture=plain(originalDiver);fixture.p=pose.p.slice();fixture.phase=0;context.fixture={visible:false,instances:[fixture]};get('diverBatch=fixture;');Object.assign(context,{active:true,player:{p:pose.p.slice(),yaw:pose.yaw,pitch:pose.pitch,velocity:[0,0,0]},settings:{third,reduced:false},auto:false,follow:null,cameraCut:true,lastCameraThird:null,cameraFollowLength:6.3,eye:pose.p.slice(),target:add(pose.p,[0,0,-1]),stick:[0,0],selectedEntry:0,t:0});return fixture;}
function renderedPose(){const d=context.fixture.instances[0];return {p:d.p.slice(),yaw:-d.yaw,pitch:-d.pitch,scale:d.s[0]};}
const report={scope:'CPU real archived diver/rock, production body owner and app.updateCamera. No browser/GPU/rendered/FPS/mobile-power acceptance.',archiveSHA256:hash(read('assets/reef.mesh.gz')),legacyCommit:'91848fdf1fae4338408ee1dcbfd05565b1c63832',inputs,checks:[]};
function check(name,fn){const start=performance.now();try{const detail=fn();report.checks.push({name,passed:true,ms:performance.now()-start,detail});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,ms:performance.now()-start,error:e.message,stack:e.stack});console.log('FAIL '+name+' — '+e.message);}}
let oldPose,safePose;
check('v43 production collide reproduces clear player sphere with 3608 rigid mesh vertices inside the actual rock',()=>{
 let p=Array.from(context.legacyCollide(add(witness.from,mul(witness.normal,.55))));for(let step=0;step<14;step++)p=Array.from(context.legacyCollide(add(p,mul(witness.normal,-.07)),p));oldPose=request(p);assert(!rocks.overlaps(p,.4));const result=insideModel(oldPose,{},true);assert.equal(result.examined,7944);assert.equal(result.bad.length,3608);const first=result.bad.find(v=>bruteInside(v.p));assert(first,'Actual triangle oracle must independently confirm a body vertex');return {pose:oldPose,rigidVertices:result.examined,penetrating:result.bad.length,independentWitness:first};
});
check('current move and actual updateCamera recover the witness without locking the view',()=>{
 contact.reset();safePose=assertSafe(contact.move(oldPose),'recovered body');setupCamera(oldPose,true);contact.reset();context.updateCamera(1/60);assert(context.fixture.visible);assertSafe(renderedPose(),'actual rendered pose');assert.deepEqual(plain(context.player.p),plain(contact.snapshot().p));assert.equal(context.player.yaw,oldPose.yaw);assert.equal(context.player.pitch,oldPose.pitch);
 const actual=insideModel(renderedPose(),{},true);assert.equal(actual.bad.length,0);assert(!bruteInside(modelPoint(350,renderedPose())));safePose=plain(contact.snapshot());return {pose:safePose,rigidVertices:actual.examined,penetrating:0,positionCorrection:dist(oldPose.p,safePose.p)};
});
check('full archived mesh remains outside rock at representative maximum kick and arm phases',()=>{
 let samples=0;for(const time of [0,.64]){const result=insideModel(safePose,{time,swim:1,roll:time?-.09:.09});samples+=result.examined;assert.equal(result.bad.length,0,JSON.stringify(result.bad.slice(0,3)));}return {samples,swim:1,roll:[-.09,.09],note:'All-phase triangle envelope is independently proved by diver-envelope-contract.cjs.'};
});
check('stationary yaw and pitch requests sweep accepted intermediate body poses while camera aim stays free',()=>{
 contact.reset();let p=assertSafe(contact.move(oldPose));setupCamera(p,true);let limited=0,maxTranslation=0;
 for(let i=0;i<48;i++){const before=plain(contact.snapshot()),y=yaw+(i<24?Math.PI:-Math.PI*.65),q=i<24?1.28:-1.30;context.player.p=before.p.slice();context.player.yaw=y;context.player.pitch=q;context.updateCamera(.05);p=plain(contact.snapshot());assertMotion(before,p,'pure turn '+i);assertSafe(renderedPose());assert.equal(context.player.yaw,y);assert.equal(context.player.pitch,q);if(Math.abs(p.yaw-y)>.01||Math.abs(p.pitch-q)>.01)limited++;maxTranslation=Math.max(maxTranslation,dist(before.p,p.p));}
 assert(limited>0,'A near-rock body cannot instantly match every arbitrary look request');return {frames:48,intermediatePoses:240,limitedFrames:limited,maxTranslation};
});
check('seven independently found yaw and pitch arc regressions clear all 99 intermediate accepted poses',()=>{
 const fixtures=[
  {p:[402.5,-2384.631084169538,-52.5],yaw:Math.PI/2,pitch:-.06423669140132143,targetPitch:.21576330859867857},
  {p:[397.5,-2245.5842148673228,-47.5],yaw:1.4735319480573785,targetYaw:1.6735319480573787},
  {p:[397.5,-2244.641002963692,-42.5],yaw:1.4744665310134741,targetYaw:1.6744665310134743},
  {p:[402.5,-2383.6066405214588,-47.5],yaw:1.4738193697618396,targetYaw:1.6738193697618398},
  {p:[402.5,-2382.673120423808,-42.5],yaw:1.4745352810127281,targetYaw:1.6745352810127283},
  {p:[407.5,-2523.4567365127236,-47.5],yaw:1.474188866687426,targetYaw:1.6741888666874263},
  {p:[407.5,-2522.541622904896,-42.5],yaw:1.474651823284481,targetYaw:1.6746518232844811}
 ],rows=[];
 for(const [i,f]of fixtures.entries()){contact.reset();const initial={p:f.p.slice(),yaw:f.yaw,pitch:f.pitch||0,scale:.85},start=assertSafe(contact.move(initial),'arc initial '+i);assert.deepEqual(plain(start),initial,'Initial fixture must be physically valid without repair');const wanted={...initial,yaw:f.targetYaw??initial.yaw,pitch:f.targetPitch??initial.pitch},end=assertSafe(contact.move(wanted,.1),'arc end '+i);for(let sample=1;sample<100;sample++)assertSafe(interpolate(start,end,sample/100),'arc '+i+' sample '+sample);rows.push({initial,wanted,accepted:plain(end),samples:99});}
 return {rows,note:'Pitch witness independently failed 71/99 samples when only the enlarged-start arc guard was removed; yaw fixtures are from the independent Spec review. No full-mesh sweep in this bounded regression.'};
});
check('fast 5.5 m and 12 m translations both stop on the entry side rather than implying a teleport',()=>{
 const rows=[];for(const distance of [5.5,12]){contact.reset();const from=assertSafe(contact.move(request(add(witness.from,mul(witness.normal,2.8))))),target=add(from.p,mul(witness.normal,-distance)),to=assertSafe(contact.move(request(target),.1));assertMotion(from,to,'fast crossing '+distance);const advance=dot(sub(to.p,from.p),mul(witness.normal,-1));assert(advance<5.4,'A '+distance+' m request crossed the rock');assert(advance>=-.01,'Fast approach moved backward unexpectedly');rows.push({requested:distance,advance,from,to});}return rows;
});
check('actual steep continental-slope triangles do not cut through the accepted full diver',()=>{
 const home=[400,context.groundHeight(400,-50)+1,-50];contact.reset();const pose=assertSafe(contact.move(request(home,0,0))),bad=[];
 for(let id=0;id<diver.vertices.length/12;id++){const p=modelPoint(id,pose,{time:0,swim:1}),floor=context.groundHeight(p[0],p[2]),gap=p[1]-floor;if(gap<-.002)bad.push({vertex:id,p,floor,gap});}
 bad.sort((a,b)=>a.gap-b.gap);const point=bad[0]?.p||modelPoint(9293,pose,{time:0,swim:1}),actual=archivedBedHeight(point[0],point[2]);assert(Number.isFinite(actual.height),'Actual compiled bed triangle must cover the witness');assert(Math.abs(actual.height-context.groundHeight(point[0],point[2]))<.02,'Fixture height must match actual compiled geometry');
 const detail={home,pose:plain(pose),penetratingVertices:bad.length,worst:bad[0]||null,archivedHeight:actual.height,archivedGap:point[1]-actual.height,triangle:actual.witness};assert.equal(bad.length,0,'Body crosses actual slope: '+JSON.stringify(detail));assert(point[1]>=actual.height-.002);return detail;
});
check('unsafe small render interpolation and distant interpolation use a safe complete pose',()=>{
 contact.reset();let p=assertSafe(contact.move(oldPose));const offsets=[];for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1]){const n=Math.hypot(x,y,z);if(n)offsets.push([x/n*.079,y/n*.079,z/n*.079]);}
 const unsafe=()=>offsets.map(d=>add(p.p,d)).find(position=>Array.from(contact.volumes({...p,p:position})).some(s=>rocks.overlaps(s.p,s.r)||regions.pointBlocked(s.p,s.r)||s.p[1]<context.groundHeight(s.p[0],s.p[2])+s.r));let bad=unsafe(),approachSteps=0;
 while(!bad&&approachSteps++<60){p=assertSafe(contact.move({...p,p:add(p.p,mul(witness.normal,-.025))}));bad=unsafe();}
 assert(bad,'Fixture must include an actual unsafe render candidate within 8 cm');const rendered=assertSafe(contact.renderPose(bad));assert.deepEqual(plain(rendered.p),plain(p.p));assert.deepEqual(plain(contact.renderPose(add(p.p,[2,0,0]))),plain(p));setupCamera(p,true);context.updateCamera(1/60,bad);assertSafe(renderedPose(),'app interpolation');return {approachSteps,rejected:bad,rendered:rendered.p,app:renderedPose()};
});
check('first person, third person and follow-view toggles retain one safe body and safe camera',()=>{
 contact.reset();setupCamera(oldPose,false);const poses=[];for(const third of [false,true,false,true]){context.settings.third=third;context.updateCamera(1/60);assertSafe(contact.snapshot());assert(!rocks.overlaps(context.eye,.2),'camera inside stone');assert.equal(context.fixture.visible,third);if(third)assertSafe(renderedPose());poses.push(plain(contact.snapshot()));}
 assert(poses.every(p=>dist(p.p,poses[0].p)<.0001),'Mode toggle translated the player');context.auto=true;context.follow={p:add(context.player.p,[0,0,-2])};context.updateCamera(1/60);assert.equal(context.fixture.visible,false);assertSafe(contact.snapshot());context.auto=false;context.follow=null;return {toggles:4,pose:poses[0]};
});
check('real arch remains traversable by the full body with a narrow oriented envelope',()=>{
 const arch=header.rockContact.instances.find(n=>header.rockContact.meshes[n.mesh].kind==='arch');assert(arch);const co=Math.cos(arch.yaw||0),si=Math.sin(arch.yaw||0),scale=arch.s||[1,1,1],heading=-(arch.yaw||0),bodyPitch=-.4,localX=1.75;
 // The old centerline at localY=1.8 starts inside the actual seabed and has
 // no full-body clearance between its upward floor and the arch's underside.
 // This surveyed route stays inside the existing arch legs on its deeper
 // right side. Heights follow the bed with 2 cm envelope clearance; no mesh,
 // obstacle or collision volume is removed and no tolerance is relaxed.
 const at=(z,y)=>[arch.p[0]+co*localX*scale[0]+si*z*scale[2],y,arch.p[2]-si*localX*scale[0]+co*z*scale[2]],localZ=p=>(si*(p[0]-arch.p[0])+co*(p[2]-arch.p[2]))/scale[2];
 const floor=z=>Math.max(...Array.from(contact.volumes(request(at(z,0),heading,bodyPitch)),s=>context.groundHeight(s.p[0],s.p[2])+s.r-s.p[1]));
 const start=at(5,floor(5)+.02),end=at(-5,floor(-5)+.02);contact.reset();let p=assertSafe(contact.move(request(start,heading,bodyPitch))),frames=0,maxRequest=0,maxCorrection=0,bottleneck=null;assert(dist(p.p,start)<1e-8,'The passage must start at a legal pose without relocation');
 for(;frames<600&&localZ(p.p)>-4.999;frames++){const before=plain(p),z=Math.max(-5,localZ(before.p)-.025),target=at(z,floor(z)+.02);maxRequest=Math.max(maxRequest,dist(target,before.p));assert(dist(target,before.p)<.08,'Every movement is a small accumulated input, never a distant waypoint/teleport');p=assertSafe(contact.move(request(target,heading,bodyPitch)));maxCorrection=Math.max(maxCorrection,dist(target,p.p));if(frames%10===0)assertMotion(before,p,'arch '+frames);if(!bottleneck||Math.abs(localZ(p.p)+1.5)<Math.abs(localZ(bottleneck.p)+1.5))bottleneck=plain(p);assert(dist(p.p,before.p)>1e-7,'The physically valid passage became stuck at '+JSON.stringify({z,p}));}
 assert(localZ(p.p)<=-4.999&&dist(p.p,end)<.025,'Full body did not exit the actual arch');const rendered=insideModel(bottleneck,{time:.64,swim:1,roll:.09});assert.equal(rendered.bad.length,0,'Actual animated model intersects archived stone in the narrow passage');
 const surface=get('FaunaWorldRules.surfaceHeight');let minGroundGap=Infinity;for(let i=0;i<diver.vertices.length/12;i++){const v=modelPoint(i,bottleneck,{time:.64,swim:1,roll:.09});minGroundGap=Math.min(minGroundGap,v[1]-surface(v[0],v[2]));}assert(minGroundGap>0,'Actual model intersects the same near-terrain triangle lattice in the passage');
 return {arch:arch.p,localX,bodyPitch,start,end,actual:p.p,frames,maxRequest,maxCorrection,bottleneck,actualModelVertices:rendered.examined,actualStonePenetrations:0,minNearTerrainGap:minGroundGap,explicitResets:1,note:'Preserved failed centerline fixture in behavior-final.json and arch-route-diagnosis.json; this route crosses inside the real hole.'};
});
check('every authored entry and trench station initializes a finite safe body',()=>{
 const entries=get('LANDMARKS.filter(l=>l.spawn).map(l=>({id:l.id,p:l.spawn,yaw:l.yaw||0,pitch:l.pitch||0})).concat(OceanTrench.stations.map(s=>({id:"trench:"+s.id,p:s.p,yaw:0,pitch:0})))'),rows=[];
 for(const entry of entries){contact.reset();const p=assertSafe(contact.move(request(entry.p,entry.yaw,entry.pitch)),'entry '+entry.id);rows.push({id:entry.id,correction:dist(entry.p,p.p),pose:plain(p)});}return {entries:rows};
});
check('explicit placement reset and catalogue replacement initialize contact without a stale body certificate',()=>{
 contact.reset();assert.equal(contact.snapshot(),null);const first=assertSafe(contact.move(request([40,-5,40],0,0)));contact.reset();const far=assertSafe(contact.move(oldPose));assert(dist(first.p,far.p)>6);assert(dist(far.p,oldPose.p)<4,'Local entry recovery displaced the user too far');const oldCatalogue=rocks.catalogue();rocks.install(JSON.parse(JSON.stringify(oldCatalogue)));const refreshed=assertSafe(contact.move(oldPose));assert(dist(refreshed.p,oldPose.p)<4);return {first:plain(first),relocated:plain(far),reloaded:plain(refreshed)};
});
check('open-water idle and tiny motions reuse a valid certificate without rebuilding collision geometry',()=>{
 contact.reset();const start=assertSafe(contact.move(request([40,-5,40],0,0)));const builds=rocks.status().builds;rocks.resetQueryStats();const times=[];for(let i=0;i<240;i++){const p={...start,p:[start.p[0]+Math.sin(i*.08)*.005,start.p[1],start.p[2]],yaw:Math.sin(i*.07)*.002};const at=performance.now();contact.move(p);times.push(performance.now()-at);}const stats=rocks.status();assert.equal(stats.builds,builds);assert.equal(stats.queries,0,'Known empty body envelope should eliminate idle/tiny-motion rock queries');times.sort((a,b)=>a-b);return {frames:240,queries:stats.queries,triangles:stats.triangles,builds,p50ms:times[120],p95ms:times[228],maxMs:times[239],note:'CPU VM timing only; no rendered frame-time claim.'};
});
check('near-rock contact query work is bounded across a repeated moving/turning sequence',()=>{
 contact.reset();let p=assertSafe(contact.move(oldPose));const builds=rocks.status().builds;rocks.resetQueryStats();const times=[];for(let i=0;i<120;i++){const at=performance.now();p=contact.move({...p,p:add(p.p,mul(witness.normal,-.007)),yaw:yaw+Math.sin(i*.07)*.3,pitch:pitch+Math.sin(i*.09)*.14});times.push(performance.now()-at);}const stats=rocks.status();assert.equal(stats.builds,builds);assert(stats.queries<=120*180,'Contact queries grew beyond a bounded local solve');assert(stats.triangles<=120*60000,'Triangle traversal is not staying local');assertSafe(p);times.sort((a,b)=>a-b);return {frames:120,queries:stats.queries,triangles:stats.triangles,p50ms:times[60],p95ms:times[114],maxMs:times[119],limits:{queriesPerFrame:180,trianglesPerFrame:60000},note:'No oracle checks inside the measured loop; CPU VM timing only.'};
});
report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};report.status=report.summary.failed?'failed-cpu-diver-behavior':'passed-cpu-diver-behavior';report.validatorSHA256=hash(fs.readFileSync(__filename));fs.mkdirSync(path.dirname(path.resolve(root,out)),{recursive:true});fs.writeFileSync(path.resolve(root,out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,summary:report.summary,out}));if(report.summary.failed)process.exitCode=1;
