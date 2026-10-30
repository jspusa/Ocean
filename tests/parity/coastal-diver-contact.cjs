/* Actual coastal terrain and visible-diver regression. CPU-only: this does not
 * certify pixels, native frame time, power consumption, or a physical phone.
 * The independent oracle reads archived Float32 triangles; it never asks the
 * terrain builder, groundHeight, or the contact owner whether terrain is clear.
 * All-phase mesh/envelope coverage is proved in diver-envelope-contract.cjs;
 * here that envelope and representative complete animated meshes meet terrain.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'qa/parity/v01851-environment/coastal-diver-contact.json';
const compressed=read('assets/reef.mesh.gz'),raw=zlib.gunzipSync(compressed),offset=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,offset));
const context=vm.createContext({console}),get=s=>vm.runInContext(s,context),inputs={};
for(const file of require(path.join(root,'scene_inputs.cjs')).MODULES){const bytes=read('src/'+file);inputs[file]=hash(bytes);vm.runInContext(bytes.toString(),context,{filename:file});}
if(get('typeof OceanDiverContact')==='undefined')vm.runInContext(read('src/player_contact.js').toString(),context,{filename:'player_contact.js'});
inputs['player_contact.js']=hash(read('src/player_contact.js'));inputs['app.js']=hash(read('src/app.js'));
const rocks=get('OceanRockContact'),contact=get('OceanDiverContact');rocks.install(header.rockContact);get('obstacles').push(...header.obstacles);
const app=read('src/app.js').toString(),collideStart=app.indexOf('function collide('),collideEnd=app.indexOf('function dir(',collideStart);
assert(collideStart>=0&&collideEnd>collideStart,'Production app.collide seam must remain identifiable');
vm.runInContext(app.slice(collideStart,collideEnd),context,{filename:'app-collide'});
const plain=x=>JSON.parse(JSON.stringify(x)),sub=(a,b)=>a.map((v,k)=>v-b[k]),add=(a,b)=>a.map((v,k)=>v+b[k]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0),distance=(a,b)=>Math.hypot(...sub(a,b));
const mesh=b=>({vertices:new Float32Array(raw.buffer,raw.byteOffset+offset+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+offset+b.indexOffset,b.indexCount)});
const diverBatch=header.batches[header.diverBatch],diver=mesh(diverBatch),diverNode=header.nodes[diverBatch.instanceIDs[0]],scale=diverNode.s[0],triangles=[],grid=new Map(),cell=8;
assert.equal(scale,.85,'The witnessed production diver scale changed; re-evaluate the physical fixture');
// Material 1 near terrain is the visible coastal surface. The actual archived
// trench edge is also included so a test can span both owners at x=260.
for(const [batch,b] of header.batches.entries()){
 if(b.dynamic||!((b.material===1&&!b.minDistance)||(b.material===17&&b.sceneRole==='region:trench')))continue;
 const m=mesh(b);
 for(const node of b.instanceIDs){const n=header.nodes[node],s=n.s||[1,1,1],cy=Math.cos(n.yaw||0),sy=Math.sin(n.yaw||0);
  assert(!n.pitch,'Terrain oracle must explicitly support any new pitch transform');
  const point=id=>{const k=id*12,x=m.vertices[k]*s[0],y=m.vertices[k+1]*s[1],z=m.vertices[k+2]*s[2];return [n.p[0]+cy*x+sy*z,n.p[1]+y,n.p[2]-sy*x+cy*z];};
  for(let k=0;k<m.indices.length;k+=3){const points=[0,1,2].map(j=>point(m.indices[k+j])),[a,b,c]=points,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-10)continue;
   const lo=[0,2].map(axis=>Math.min(...points.map(p=>p[axis]))),hi=[0,2].map(axis=>Math.max(...points.map(p=>p[axis]))),t={batch,node,triangle:k/3,points,den,lo,hi};triangles.push(t);
   for(let x=Math.floor(lo[0]/cell);x<=Math.floor(hi[0]/cell);x++)for(let z=Math.floor(lo[1]/cell);z<=Math.floor(hi[1]/cell);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(t);}
  }
 }
}
function candidates(x,z,r=0){const found=new Set();for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((z-r)/cell);j<=Math.floor((z+r)/cell);j++)for(const t of grid.get(i+','+j)||[])if(x+r>=t.lo[0]&&x-r<=t.hi[0]&&z+r>=t.lo[1]&&z-r<=t.hi[1])found.add(t);return found;}
function bed(x,z,coastalOnly=false){let best=null;for(const t of candidates(x,z)){if(coastalOnly&&header.batches[t.batch].material!==1)continue;const [a,b,c]=t.points,u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/t.den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/t.den,w=1-u-v;if(Math.min(u,v,w)<-1e-7)continue;const y=u*a[1]+v*b[1]+w*c[1];if(!best||y>best.y)best={y,batch:t.batch,node:t.node,triangle:t.triangle,points:t.points};}return best;}
// Closest point on a finite triangle, including its edges and vertices. This
// catches a sphere's side crossing a slope even with a clear center height.
function closest(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return add(b,mul(sub(c,b),(d4-d3)/(d4-d3+d5-d6)));
 const den=1/(va+vb+vc);return add(a,add(mul(ab,vb*den),mul(ac,vc*den)));
}
// Separate numerical formulation for the primitive checks: project to the
// plane and check barycentrics, then minimize over bounded edge segments.
// It does not call the production closest-point or analytic sweep primitive.
function triangleDistance(p,t){const [a,b,c]=t.points,ab=sub(b,a),ac=sub(c,a),n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],nn=dot(n,n),height=dot(sub(p,a),n),q=sub(p,mul(n,height/nn));
 const u=((b[2]-c[2])*(q[0]-c[0])+(c[0]-b[0])*(q[2]-c[2]))/t.den,v=((c[2]-a[2])*(q[0]-c[0])+(a[0]-c[0])*(q[2]-c[2]))/t.den;
 if(Math.min(u,v,1-u-v)>=-1e-12)return Math.abs(height)/Math.sqrt(nn);
 let nearest=Infinity;for(let k=0;k<3;k++){const a=t.points[k],b=t.points[(k+1)%3],edge=sub(b,a),f=Math.max(0,Math.min(1,dot(sub(p,a),edge)/dot(edge,edge)));nearest=Math.min(nearest,distance(p,add(a,mul(edge,f))));}return nearest;
}
function sphereDistance(p,r){let nearest=Infinity;for(const t of candidates(p[0],p[2],r))if(header.batches[t.batch].material===1)nearest=Math.min(nearest,triangleDistance(p,t));return nearest;}
function numericSweep(a,b,r){const delta=sub(b,a),mid=mul(add(a,b),.5),radius=Math.max(Math.abs(delta[0]),Math.abs(delta[2]))*.5+r;let earliest=null;
 for(const t of candidates(mid[0],mid[2],radius)){if(header.batches[t.batch].material!==1)continue;const at=f=>triangleDistance(add(a,mul(delta,f)),t);let low=0,high=1;
  // Distance to one finite convex triangle is convex along a straight path;
  // locate its minimum, then bisect the first radius crossing independently.
  for(let k=0;k<48;k++){const p=(low*2+high)/3,q=(low+high*2)/3;if(at(p)<at(q))high=q;else low=p;}
  const minimum=(low+high)*.5;if(at(minimum)>r-1e-8)continue;low=0;high=minimum;
  for(let k=0;k<48;k++){const f=(low+high)*.5;if(at(f)<=r)high=f;else low=f;}
  if(earliest===null||high<earliest)earliest=high;
 }return earliest;
}
function envelope(pose){let worst=null,count=0;for(const [sphere,s] of Array.from(contact.volumes(pose)).entries()){
 const floor=bed(s.p[0],s.p[2]);if(floor&&s.p[1]<floor.y-.00001){count++;worst={sphere,depth:floor.y-s.p[1]+s.r,center:s.p,radius:s.r,ground:floor,centerBelow:true};}
 for(const t of candidates(s.p[0],s.p[2],s.r)){const q=closest(s.p,...t.points),depth=s.r-distance(s.p,q);if(depth>.00001){count++;if(!worst||depth>worst.depth)worst={sphere,depth,center:s.p,radius:s.r,closest:q,ground:{batch:t.batch,node:t.node,triangle:t.triangle,points:t.points}};}}
 }return {count,worst};}
// Independent copy of the actual kind-5 vertex transform, not contact points.
function modelPoint(id,pose,{time=.64,swim=1,roll=.09}={}){const k=id*12,tag=diver.vertices[k+11];let [x,y,z]=diver.vertices.subarray(k,k+3);
 if(tag>9.5&&tag<12){const side=tag<10.5?1:-1,ang=Math.sin(time*2.45+side*1.5708)*(.045+.155*swim),along=Math.max(0,z-.38);y+=Math.sin(ang)*along;z=.38+Math.cos(ang)*along;y+=Math.sin(time*2.45+side*1.5708+.60)*Math.max(0,z-1.03)*(.03+.10*swim);}
 if(tag>11.5&&tag<14)y+=Math.sin(time*.7+tag)*.014;
 const xx=x*Math.cos(roll)-y*Math.sin(roll),yy=x*Math.sin(roll)+y*Math.cos(roll),cp=Math.cos(-pose.pitch),sp=Math.sin(-pose.pitch),cy=Math.cos(-pose.yaw),sy=Math.sin(-pose.yaw);x=xx*pose.scale;y=(yy*cp+z*sp)*pose.scale;z=(-yy*sp+z*cp)*pose.scale;return [pose.p[0]+cy*x+sy*z,pose.p[1]+y,pose.p[2]-sy*x+cy*z];
}
function body(pose,animation){let count=0,rigidCount=0,worst=null,worstRigid=null,covered=0;for(let id=0;id<diver.vertices.length/12;id++){const p=modelPoint(id,pose,animation),floor=bed(p[0],p[2]);if(!floor)continue;covered++;const depth=floor.y-p[1];if(depth>.00001){const item={vertex:id,tag:diver.vertices[id*12+11],p,depth,ground:floor};count++;if(!worst||depth>worst.depth)worst=item;if(item.tag<9.5){rigidCount++;if(!worstRigid||depth>worstRigid.depth)worstRigid=item;}}}return {vertices:diver.vertices.length/12,covered,count,rigidCount,worst,worstRigid};}
function request(p,yaw=Math.PI,pitch=0){return {p:Array.from(p),yaw,pitch,scale};}
function step(pose,p,angles={}){const target=context.collide(Array.from(p),pose.p);const accepted=contact.move({...pose,...angles,p:target},1/60);assert(accepted,'Movement must return an accepted body');assert(accepted.p.every(Number.isFinite),'Accepted body must remain finite');return plain(accepted);}
const fixture={x:-236.6060609817505,z:-36.666666666666664,yaw:Math.PI,pitch:0},report={scope:'CPU actual archive coastal/trench triangles, full production diver vertices and production app.collide then OceanDiverContact.move; no browser/GPU/performance acceptance.',archiveSHA256:hash(compressed),inputs,fixture,oracle:{terrainTriangles:triangles.length,diverVertices:diver.vertices.length/12,tolerance:.00001},checks:[]};
function check(name,fn){const row={name};try{row.detail=fn();row.passed=true;console.log('PASS '+name);}catch(error){row.passed=false;row.error=error.message;if(error.detail)row.detail=error.detail;console.log('FAIL '+name+' — '+error.message);}report.checks.push(row);}
function demand(condition,message,detail){if(!condition){const e=new Error(message);e.detail=detail;throw e;}}
function clearStart(){const floor=bed(fixture.x,fixture.z);assert(floor,'Witness must be covered by an actual archive triangle');const wanted=request([fixture.x,floor.y+4,fixture.z]);contact.reset();const pose=contact.move({...wanted,p:context.collide(wanted.p.slice())});assert(pose);assert(distance(pose.p,wanted.p)<1e-8,'Raised control must not need a body relocation');return plain(pose);}
function interpolated(a,b,f){return {...a,p:a.p.map((v,k)=>v+(b.p[k]-v)*f),yaw:a.yaw+(b.yaw-a.yaw)*f,pitch:a.pitch+(b.pitch-a.pitch)*f};}
function settledStart(){let pose=clearStart();for(let i=0;i<240;i++)pose=step(pose,[pose.p[0],pose.p[1]-.03,pose.p[2]]);return pose;}
function inspectMotion(before,pose,frame){for(const fraction of [.25,.5,.75,1]){const sample=interpolated(before,pose,fraction),shell=envelope(sample);if(shell.count)return {frame,fraction,pose:sample,envelope:shell};}return null;}
let downward=null;
check('coastal owner height matches actual archived Float32 vertices and triangle interiors',()=>{
 const owner=get('OceanCoastalGround'),vertices=new Map(),coast=triangles.filter(t=>header.batches[t.batch].material===1),failures=[];let samples=0,maxError=0;
 for(const t of coast)for(const p of t.points)vertices.set(p[0]+','+p[2],p);
 const verify=(p,triangle)=>{const actual=owner.height(p[0],p[2]),error=Math.abs(actual-p[1]);samples++;maxError=Math.max(maxError,error);if(!(error<1e-9)&&failures.length<8)failures.push({p,actual,error,triangle});};
 for(const p of vertices.values())verify(p,null);
 for(let i=0;i<coast.length;i+=29){const t=coast[i];for(const w of [[1/3,1/3,1/3],[.07,.29,.64]])verify([0,1,2].map(k=>t.points.reduce((s,p,j)=>s+p[k]*w[j],0)),{batch:t.batch,node:t.node,triangle:t.triangle});}
 const detail={vertices:vertices.size,samples,maxError,failures};demand(!failures.length,'Contact height diverges from the actual near-ground mesh',detail);return detail;
});
check('finite coastal sphere contacts agree with independent plane and edge distance without ghost surfaces',()=>{
 const owner=get('OceanCoastalGround'),coast=triangles.filter(t=>header.batches[t.batch].material===1),failures=[];let samples=0,hits=0,clear=0;
 const verify=(p,r)=>{const nearest=sphereDistance(p,r),expected=nearest<r-1e-6,actual=owner.contact(p,r);samples++;if(expected)hits++;else clear++;if(!!actual!==expected&&failures.length<8)failures.push({p,r,nearest,expected,actual});};
 for(let i=0;i<coast.length;i+=193){const t=coast[i],p=[0,1,2].map(k=>t.points.reduce((s,p)=>s+p[k]/3,0)),r=[.15,.47,.8][i%3];for(const factor of [.2,.9,1.7])verify([p[0],p[1]+r*factor,p[2]],r);}
 // Outside the finite eastern edge, an infinite slope plane is not a wall.
 for(const z of [-300,-200,-100,80,180])for(const offset of [.2,.5,.8]){const floor=bed(260,z,true);verify([260+offset,floor.y+.3,z],.6);}
 const detail={samples,hits,clear,failures};demand(!failures.length,'Finite sphere contact differs from independent archived triangles',detail);return detail;
});
check('coastal sweeps match independent convex-distance minimization and first-contact bisection',()=>{
 const owner=get('OceanCoastalGround'),coast=triangles.filter(t=>header.batches[t.batch].material===1),failures=[];let samples=0,hits=0,clear=0,maxFractionError=0;
 for(let i=0;i<coast.length;i+=1511){const t=coast[i],center=[0,1,2].map(k=>t.points.reduce((s,p)=>s+p[k]/3,0)),r=[.15,.47,.8][i%3];
  for(const delta of [[0,-4,0],[2.7,-4,-1.3],[2.7,0,-1.3]]){const a=[center[0],center[1]+2.1,center[2]],b=add(a,delta);if(sphereDistance(a,r)<r+1e-5)continue;const expected=numericSweep(a,b,r),actual=owner.sweep(a,b,r);samples++;if(expected!==null)hits++;else clear++;const difference=expected!==null&&actual?Math.abs(actual.fraction-expected):null;if(difference!==null)maxFractionError=Math.max(maxFractionError,difference);if(((expected!==null)!==!!actual||difference>1e-6)&&failures.length<8)failures.push({a,b,r,expected,actual,difference});}
 }
 const detail={samples,hits,clear,maxFractionError,failures};demand(!failures.length,'Coastal sweep differs from independent archived triangle first contact',detail);return detail;
});
check('raised control keeps the complete diver and animation envelope clear of archived terrain',()=>{const pose=clearStart(),full=body(pose),shell=envelope(pose);assert.equal(full.covered,full.vertices);demand(!full.count&&!shell.count,'Raised negative control is not clear',{pose,full,shell});return {pose,full,shell};});
check('continuous normal downward swimming never buries the accepted rigid body or animated envelope in near ground',()=>{
 let pose=clearStart(),maxStep=0,firstEnvelopeFailure=null;const frames=[];
 for(let frame=1;frame<=240;frame++){const before=pose;pose=step(pose,[pose.p[0],pose.p[1]-.03,pose.p[2]]);maxStep=Math.max(maxStep,distance(before.p,pose.p));const shell=envelope(pose);if(shell.count&&!firstEnvelopeFailure)firstEnvelopeFailure={frame,pose,shell};if(frame%20===0||frame===240)frames.push({frame,pose,body:body(pose),envelope:shell});}
 const phases=[{time:0,swim:1,roll:-.09},{time:.64,swim:1,roll:.09}].map(animation=>({animation,...body(pose,animation)}));downward={pose,frames,phases,maxStep,firstEnvelopeFailure,explicitResets:1};
 demand(!firstEnvelopeFailure&&frames.every(r=>!r.body.count)&&phases.every(r=>!r.count),'Continuous accepted swimmer intersects archived near-ground triangles',downward);return downward;
});
check('normal lateral and downward input crosses the coastal slope with a safe complete body',()=>{
 let pose=settledStart(),firstFailure=null,maxStep=0;const start=plain(pose),samples=[];
 for(let frame=1;frame<=180;frame++){const before=pose;pose=step(pose,[pose.p[0]+.025,pose.p[1]-.006,pose.p[2]-.01]);maxStep=Math.max(maxStep,distance(before.p,pose.p));firstFailure??=inspectMotion(before,pose,frame);if(frame%30===0)samples.push({frame,pose,body:body(pose)});}
 const advance=pose.p[0]-start.p[0],detail={start,end:pose,advance,maxStep,firstFailure,samples,explicitResets:1};
 demand(!firstFailure&&samples.every(s=>!s.body.count),'Accepted lateral slope motion intersects actual terrain',detail);demand(advance>1,'Valid coastal movement must not become stuck at the first contact',detail);return detail;
});
check('near-ground yaw and pitch requests keep every sampled accepted rotation arc outside the terrain',()=>{
 let pose=settledStart(),firstFailure=null,limited=0;const start=plain(pose),samples=[];
 for(let frame=1;frame<=48;frame++){const before=pose,angles=frame<=24?{yaw:Math.PI+.7,pitch:.6}:{yaw:Math.PI-.7,pitch:-.6};pose=step(pose,pose.p,angles);if(Math.abs(pose.yaw-angles.yaw)>.01||Math.abs(pose.pitch-angles.pitch)>.01)limited++;firstFailure??=inspectMotion(before,pose,frame);if(frame%12===0)samples.push({frame,pose,body:body(pose)});}
 const detail={start,end:pose,frames:48,arcSamples:192,limited,firstFailure,samples,explicitResets:1};demand(!firstFailure&&samples.every(s=>!s.body.count),'Accepted yaw/pitch arc intersects actual terrain',detail);return detail;
});
check('normal swimming carries the complete body across the x=260 coastal and trench ownership seam',()=>{
 // This surveyed route starts clear without relocation, crosses in both
 // directions, and holds depth. A lower route is separately documented as a
 // pre-existing conservative trench-edge barrier, not accepted as this route.
 const startPoint=[258,bed(258,-100).y+1.5,-100];contact.reset();let pose=contact.move(request(context.collide(startPoint.slice()),Math.PI/2));assert(pose);pose=plain(pose);assert(distance(pose.p,startPoint)<1e-8,'Seam route must begin clear without a placement correction');const start=plain(pose),samples=[];let firstFailure=null,maxStep=0,maxX=pose.p[0];
 for(let frame=1;frame<=400;frame++){const before=pose;pose=step(pose,[pose.p[0]+(frame<=200?.03:-.03),pose.p[1],pose.p[2]]);maxStep=Math.max(maxStep,distance(before.p,pose.p));maxX=Math.max(maxX,pose.p[0]);firstFailure??=inspectMotion(before,pose,frame);if(frame%40===0)samples.push({frame,pose,body:body(pose)});}
 const detail={start,end:pose,maxX,maxStep,firstFailure,samples,explicitResets:1,terrainOwners:['archived material 1 near mesh','archived material 17 region:trench mesh']};demand(!firstFailure&&samples.every(s=>s.body.covered===s.body.vertices&&!s.body.count),'Accepted body crosses archived ground at the coast/trench seam',detail);demand(maxX>263.9&&distance(pose.p,start.p)<.01,'The actual body must cross x=260 and return through accumulated movement',detail);return detail;
});
report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};report.status=report.summary.failed?'failed-cpu-coastal-diver-contact':'passed-cpu-coastal-diver-contact';report.validatorSHA256=hash(fs.readFileSync(__filename));fs.mkdirSync(path.dirname(path.resolve(root,out)),{recursive:true});fs.writeFileSync(path.resolve(root,out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,summary:report.summary,out}));if(report.summary.failed)process.exitCode=1;
