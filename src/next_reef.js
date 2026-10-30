function sculptedColony(type,lod,mound=false){
 const mesh=SCULPTED_CORAL[lod],g=new Geometry();g.material=3;g.shadow=false;
 const colors=[[.64,.57,.43],[.48,.51,.56],[.47,.57,.49],[.65,.49,.40],[.57,.60,.43],[.63,.51,.49]],col=colors[type%colors.length];
 const colorsV=mesh.positions.map((v,i)=>{const facing=mesh.normals[i][1],tip=smooth01((v[1]-.64)/.20)*Math.max(0,facing);return col.map(c=>mix(c*.94,.92,tip*.65));});
 const positions=mound?mesh.positions.map(p=>[p[0]*(1.12+p[1]*.38),p[1]*.64,p[2]*(1.12+p[1]*.38)]):mesh.positions;const normals=mound?mesh.normals.map(n=>V.norm([n[0]/1.25,n[1]/.64,n[2]/1.25])):mesh.normals;for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3);g.tri(...ids.map(n=>positions[n]),col,ids.map(n=>normals[n]),ids.map(n=>colorsV[n]));}return g;
}
function smooth01(x){x=clamp(x,0,1);return x*x*(3-2*x);}
/* TIDELIGHT 0.5 — runtime-friendly LOD meshes and smoothly tiled terrain.
   These are authored approximations, not surveyed bathymetry or scanned animals. */
function distantFishGeometry(s){
 const g=new Geometry();g.material=6;g.species=SPECIES.findIndex(x=>x.id===s.id);g.tag=1;g.shadow=false;
 const H=s.height,W=s.width;
 surface(g,(u,v)=>{const a=v*TAU,x=.57-u*1.1,h=Math.pow(Math.sin(Math.PI*u),.72);return [x,Math.cos(a)*h*H,Math.sin(a)*h*W];},12,8,p=>fishColor(s,...p),1);
 g.tag=3;const tail=['tang','idol'].includes(s.id)?[.96,.78,.16]:rgb(s.color);g.tri([-.47,0,0],[-.81,H*.8,0],[-.72,0,0],tail);g.tri([-.47,0,0],[-.72,0,0],[-.81,-H*.8,0],tail);
 for(const sign of [-1,1]){g.tri([.22,sign*H*.9,0],[-.42,sign*H*.75,0],[-.2,sign*H*1.3,0],tail);}
 g.tag=4;for(const side of [-1,1])g.sphere([.39,.06,side*W*.77],[.025,.027,.013],[.019,.022,.027],6,4);
 return g;
}
function distantTurtle(){return turtleGeometry(true);}
function distantRay(){return rayGeometry(true);}
// One anatomy at both distances: the previous proxy changed body length, fin
// span and head shape at the LOD boundary, making an approaching whale pop.
function distantWhale(){return whaleGeometry(true);}
function addGroundTiles(r){
 const span=50,count=5;
 for(let iz=0;iz<count;iz++)for(let ix=0;ix<count;ix++){
  const cx=(ix-2)*span,cz=(iz-2)*span-42;const geo=new Geometry();geo.material=1;geo.shadow=true;
  const N=28;const p=(i,j)=>{let x=cx+(i/N-.5)*span,z=cz+(j/N-.5)*span;return [x-cx,groundHeight(x,z),z-cz];};
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let ps=[p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1)],ns=ps.map(q=>{const x=q[0]+cx,z=q[2]+cz;return V.norm([groundHeight(x-.12,z)-groundHeight(x+.12,z),.24,groundHeight(x,z-.12)-groundHeight(x,z+.12)]);});geo.tri(ps[0],ps[2],ps[1],[1,1,1],[ns[0],ns[2],ns[1]]);geo.tri(ps[0],ps[3],ps[2],[1,1,1],[ns[0],ns[3],ns[2]]);}
  let b=r.batch(geo,[{p:[cx,0,cz]}]);b.maxDistance=250;
 }
}
// Screen-projected caustics are already part of lighting, no baked shadow pictures.
// Crown-shaped branching colonies: curved stems, fine taper, rounded light growing tips.
function branchCoral(type=0){
 if(typeof SCULPTED_CORAL!=='undefined')return rootedBranchColony(sculptedColony(type,reefDetailLevel?'high':'medium'),'branch-'+type);
 const g=new Geometry();g.material=3;g.shadow=false;
 const palette=[[.82,.68,.44],[.48,.60,.76],[.48,.72,.66],[.87,.57,.49]],col=palette[type%4];
 const count=reefDetailLevel?64:12,sides=reefDetailLevel?6:4;
 if(!reefDetailLevel)g.sphere([0,.36,0],[.58,.28,.58],col.map(c=>c*.91),12,8,.075);
 for(let k=0;k<count;k++){
  const a=k*2.399963,r=Math.sqrt((k+.5)/count)*.72,h=.34+.43*Math.sqrt(1-r*r)+.035*Math.sin(k*3.7);
  const base=[Math.cos(a)*r*.47,.025,Math.sin(a)*r*.47];let prev=base;
  for(let j=1;j<=4;j++){const t=j/4,p=[Math.cos(a)*r*(.47+.53*t),h*t,Math.sin(a)*r*(.47+.53*t)];
   const shade=.72+.28*t;g.tube(prev,p,.039*(1-(j-1)/4*.61),.039*(1-t*.61),col.map(v=>v*shade),sides);prev=p;}
  const tip=col.map(v=>mix(v,.94,.45));g.sphere(prev,[.024,.037,.024],tip,sides,4);
  for(let b=0;b<2;b++){const a2=a+(b?-.8:.8),from=[Math.cos(a)*r*.88,h*.72,Math.sin(a)*r*.88],to=[prev[0]+Math.cos(a2)*.10,prev[1]-.035,prev[2]+Math.sin(a2)*.10];g.tube(from,to,.010,.005,tip,4);}
 }
 return rootedBranchColony(g,'branch-'+type);
}
// A narrow living holdfast, not a pedestal or collision proxy. Every branching
// LOD contains these same closed triangles. Its upper part overlaps the existing
// colony tissue; the original crown vertices and ecological random stream stay
// untouched. The independent root component avoids XOR parity at that overlap.
function rootedBranchColony(g,family,feet=null){
 const color=g.v.slice(6,9).map(c=>c*.82),root=new Geometry();root.material=3;root.tag=8.25;
 const ring=(y,r)=>Array.from({length:12},(_,i)=>[Math.cos(i/12*TAU)*r,y,Math.sin(i/12*TAU)*r]),rows=[ring(-.100,.050),ring(0,.080),ring(.065,.060)];
 for(let i=0;i<12;i++){const j=(i+1)%12;root.tri([0,-.130,0],rows[0][i],rows[0][j],color);for(let k=0;k<2;k++){root.tri(rows[k][i],rows[k+1][j],rows[k][j],color);root.tri(rows[k][i],rows[k+1][i],rows[k+1][j],color);}root.tri([0,.080,0],rows[2][j],rows[2][i],color);}
 g.v.push(...root.v);const tag=g.tag;g.tag=8.5;
 // The far mesh has separate low branch origins. Slim connecting branchlets
// meet each original stem above its open basal end, preserving its silhouette.
 if(feet)for(const {base,fork} of feet){const end=V.lerp(base,fork,.08);g.tube([0,.035,0],end,.025,.035,color,4);}
 g.tag=tag;g.reefGrowth=family;g.reefRoot={geometry:root,crownHeight:.10};return g;
}
function tableCoral(type=0){
 const g=new Geometry();g.material=3;g.shadow=false;const col=type?[.64,.69,.62]:[.80,.67,.45];
 const lobes=reefDetailLevel?3:2;
 for(let k=0;k<lobes;k++){
  const cx=k===0?0:Math.cos(k*3.5)*.46,cz=k===0?0:Math.sin(k*3.5)*.46,h=.26+k*.20,radius=1.02-k*.13;
  g.tube([0,.015,0],[cx,h-.055,cz],.065,.035,col.map(v=>v*.73),7);
  const rim=a=>radius*(.89+.07*Math.sin(a*5+k*3)+.04*Math.sin(a*11-k));
  const fn=(u,v,under=false)=>{let a=u*TAU,r=v*rim(a);return [cx+Math.cos(a)*r,h+v*v*.095+.022*Math.sin(a*6+k)*v*v+(under?-.018:0),cz+Math.sin(a)*r];};
  surface(g,(u,v)=>fn(u,v),reefDetailLevel?56:32,reefDetailLevel?9:4,(p,u,v)=>col.map(c=>mix(c,.91,Math.pow(v,18)*.42)),1);
  surface(g,(u,v)=>fn(u,v,true),reefDetailLevel?40:24,3,col.map(c=>c*.84),-1);
  for(let j=0;j<(reefDetailLevel?64:36);j++){const a=j/(reefDetailLevel?64:36),b=(j+1)/(reefDetailLevel?64:36),p=fn(a,1),q=fn(b,1),pu=fn(a,1,true),qu=fn(b,1,true);g.quad(p,pu,qu,q,col.map(c=>mix(c,.93,.45)));}
 }
 return g;
}
// Optical-scale limestone: flatter strata, cracks and asymmetric ridges, rather than inflated spheres.
function rockGeometry(variant=0,low=false){
 const g=new Geometry();g.material=2;
 const form=(u,v)=>{let a=u*TAU,b=v*Math.PI,s=Math.sin(b);const cube=q=>Math.sign(q)*Math.pow(Math.abs(q),.58);
  let x=cube(s*Math.cos(a)),y=cube(Math.cos(b)),z=cube(s*Math.sin(a));
  const n=ridgeNoise(x*2.4+variant*5.1,y*2.7+variant,z*2.4),layer=y+.12*geoNoise(x*2,y*3,z*2);
  let f=.84+n*.30-.026*Math.pow(Math.abs(Math.sin(layer*12+variant)),8);
  return [x*f+.075*Math.sin(z*2+y*2+variant),y*f+.045*Math.sin(x*3-z*2),z*f+.055*Math.sin(y*3+x*2+variant)];};
 surface(g,form,low?16:42,low?10:28,[.94,.94,.89],1);return g;
}
// The old grid is retained only for deterministic ecological layout decisions.
// Actual attachments use the cached rendered triangles through the contact API.
// These construction caches are released after the last offshore attachment.
const rockHeightCache=new Map(),placedReefRocks=[],reefGroundSurfaces=[];
function rockSurfaceMap(variant){
 if(rockHeightCache.has(variant))return rockHeightCache.get(variant);
 const geometry=rockGeometry(variant),data=geometry.v,N=64,span=2.7,h=new Float32Array(N*N);h.fill(-Infinity);
 for(let k=0;k<data.length;k+=36){const ax=data[k],az=data[k+2],bx=data[k+12],bz=data[k+14],cx=data[k+24],cz=data[k+26];const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(det)<1e-8)continue;
  const i0=clamp(Math.floor((Math.min(ax,bx,cx)/span+.5)*(N-1)),0,N-1),i1=clamp(Math.ceil((Math.max(ax,bx,cx)/span+.5)*(N-1)),0,N-1),j0=clamp(Math.floor((Math.min(az,bz,cz)/span+.5)*(N-1)),0,N-1),j1=clamp(Math.ceil((Math.max(az,bz,cz)/span+.5)*(N-1)),0,N-1);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i/(N-1)-.5)*span,z=(j/(N-1)-.5)*span,u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det,w=1-u-v;if(u>=-.005&&v>=-.005&&w>=-.005)h[j*N+i]=Math.max(h[j*N+i],data[k+1]*u+data[k+13]*v+data[k+25]*w);}}
 const result={geometry,h,N,span};rockHeightCache.set(variant,result);return result;
}
function rockLayoutTop(item,variant,x,z){const {h,N,span}=rockSurfaceMap(variant);const dx=x-item.p[0],dz=z-item.p[2],a=item.yaw||0,c=Math.cos(a),s=Math.sin(a),lx=(c*dx-s*dz)/item.s[0],lz=(s*dx+c*dz)/item.s[2];
 const i=Math.round((lx/span+.5)*(N-1)),j=Math.round((lz/span+.5)*(N-1));if(i<0||i>=N||j<0||j>=N)return -Infinity;return item.p[1]+h[j*N+i]*item.s[1];}
function rootLayoutHeight(x,z){let y=groundHeight(x,z);for(const a of placedReefRocks){if(Math.abs(x-a.item.p[0])>a.item.s[0]*1.7||Math.abs(z-a.item.p[2])>a.item.s[2]*1.7)continue;y=Math.max(y,rockLayoutTop(a.item,a.variant,x,z));}return y+.035;}
function rockTop(item,variant,x,z){return OceanRockContact.heightOn(rockSurfaceMap(variant).geometry,item,x,z);}
function addRootGround(r){
 reefGroundSurfaces.length=0;const original=r.batch;
 r.batch=function(geometry,instances,kind=0,dynamic=false){const batch=original.call(this,geometry,instances,kind,dynamic);
  if(geometry.material===1&&!dynamic&&kind===0){const v=geometry.v,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<v.length;i+=12)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[i+k]);hi[k]=Math.max(hi[k],v[i+k]);}
   for(const instance of instances){const sc=instance.s||[1,1,1],yaw=instance.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(instance.pitch||0),sp=Math.sin(instance.pitch||0),corners=[];for(let k=0;k<8;k++){const x=((k&1?hi[0]:lo[0])*cp-(k&2?hi[1]:lo[1])*sp)*sc[0],z=(k&4?hi[2]:lo[2])*sc[2];corners.push([instance.p[0]+c*x+s*z,instance.p[2]-s*x+c*z]);}reefGroundSurfaces.push({geometry,instance,batch,lo:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1]))],hi:[Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))]});}
  }return batch;};
 try{addGroundTiles(r);}catch(error){reefGroundSurfaces.length=0;throw error;}finally{r.batch=original;}
}
function reefGroundTop(x,z){let y=-Infinity;for(const s of reefGroundSurfaces){if(s.batch.minDistance>0||x<s.lo[0]||x>s.hi[0]||z<s.lo[1]||z>s.hi[1])continue;y=Math.max(y,OceanRockContact.heightOn(s.geometry,s.instance,x,z));}return y;}
function rootHeight(x,z){let y=reefGroundTop(x,z);for(const a of placedReefRocks){if(Math.abs(x-a.item.p[0])>a.item.s[0]*1.7||Math.abs(z-a.item.p[2])>a.item.s[2]*1.7)continue;y=Math.max(y,rockTop(a.item,a.variant,x,z));}if(!Number.isFinite(y))throw Error('Reef attachment has no rendered substrate');return y;}
// Fit only roots that fail their real substrates or crown clearance. The
// bounded search is deterministic and consumes no ecological random numbers.
// These records/queries exist during construction, never while swimming.
// Three measured legacy shelf colonies were embedded in terrain/rock. These
// authored local relocations keep their complete original identity and scale.
// Only these exact poses may exceed the general 3.3 m horizontal search limit;
// each still passes the same actual root/crown gates before it is applied.
// BEGIN REEF_GROWTH_AUTHORED_RELOCATIONS
const REEF_GROWTH_AUTHORED_RELOCATIONS=Object.freeze([{"id":"cliff-west-foliose-deep","family":"foliose-0","original":{"p":[-8.89,-31.779999999999998,-36.9],"s":[1.6,1.1,1.3],"yaw":5.758895537343366},"to":{"p":[-7.0264659668386535,-29.461165188047723,-41.00078117371262],"s":[1.6,1.1,1.3],"yaw":-3.009123068254678,"pitch":1.2280672539936592},"limits":{"horizontal":4.6,"vertical":2.5}},{"id":"cliff-west-fan-deep","family":"fan","original":{"p":[-7.890000000000001,-31.879999999999995,-36.3],"s":[1.3,1.7,1.3],"yaw":0.3,"phase":4.578102364204824},"to":{"p":[-6.925324261120462,-29.571765545828395,-40.44715354871727],"s":[1.3,1.7,1.3],"yaw":-3.009123068254678,"pitch":1.3853635331089347},"limits":{"horizontal":4.6,"vertical":2.5}},{"id":"cliff-east-fan-inner","family":"fan","original":{"p":[14.43,-30.619999999999997,-51.3],"s":[1.3,1.7,1.3],"yaw":0.3,"phase":4.527393917553127},"to":{"p":[10.31883549671305,-30.120208696343123,-51.61727736326162],"s":[1.3,1.7,1.3],"yaw":0.1150624192558181,"pitch":1.5958737229723918},"limits":{"horizontal":4.6,"vertical":2.5}}]);
// END REEF_GROWTH_AUTHORED_RELOCATIONS
function reefGrowthAuthoredRelocation(family,n){
 const equal=(a,b)=>typeof a==='number'||typeof b==='number'?Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10:a===null||b===null||typeof a!=='object'||typeof b!=='object'?a===b:Array.isArray(a)!==Array.isArray(b)?false:Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
 return REEF_GROWTH_AUTHORED_RELOCATIONS.find(r=>r.family===family&&equal(r.original,n))||null;
}
function reefGrowthContentStamp(entries){
 // Actual Float32 XYZ in triangle order plus support poses/LOD metadata. This
 // deterministic content fingerprint complements the build's source SHA-256;
 // it is a stale-result check, not a substitute for cryptographic provenance.
 // The same captured world differs by at most 2.8422e-14 in Node/WebKit
 // construction poses. Canonicalize the stamp only to 1e-10 world units/radians;
 // actual poses, recorded corrections and Float32 XYZ remain unrounded.
 const poseNumber=x=>Math.round(x*1e10)/1e10;
 const cache=new WeakMap();let a=2166136261,b=2654435769;const word=w=>{a=Math.imul(a^w,16777619)>>>0;b=Math.imul(b^w,2246822519)>>>0;b=(b^(b>>>13))>>>0;},text=s=>{for(let i=0;i<s.length;i++)word(s.charCodeAt(i));word(0x9e3779b9);};
 for(const e of entries){const g=e.geometry;let shape=cache.get(g);if(!shape){const before=[a,b];a=2166136261;b=2654435769;const values=new Float32Array(g.v),bits=new Uint32Array(values.buffer);for(let i=0;i<bits.length;i+=12)for(let k=0;k<3;k++)word(values[i+k]===0?0:bits[i+k]);shape=bits.length/12+':'+a.toString(16)+':'+b.toString(16);cache.set(g,shape);[a,b]=before;}text(shape);text(JSON.stringify([g.material||0,g.reefGrowth||'',g.rockContact?.kind||'',g.rockContact?.closed!==false,e.batch.kind||0,e.batch.minDistance||0,e.batch.maxDistance||220,e.batch.sceneRole||'',e.instances.map(n=>[n.p.map(poseNumber),(n.s||[1,1,1]).map(poseNumber),poseNumber(n.yaw||0),poseNumber(n.pitch||0)])]));}
 return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');
}
function replayReefGrowth(entries,payload,expectedSHA256){
 if(!/^[a-f0-9]{64}$/.test(expectedSHA256||'')||payload?.sourceSHA256!==expectedSHA256||payload.format!=='return-blue/reef-growth/1'||!Array.isArray(payload.actors)||!Array.isArray(payload.failed)||payload.failed.length||!Array.isArray(payload.batchLimits))throw Error('Reef growth replay is missing or stale');
 if(payload.contentStamp!==reefGrowthContentStamp(entries))throw Error('Reef growth replay actual geometry or substrate differs');
 const actors=new Map(),batches=new Set();for(const e of entries)if(e.geometry.reefGrowth&&!e.batch.sceneRole?.startsWith('wreck-')){batches.add(e.batch);for(const n of e.instances)if(!actors.has(n))actors.set(n,{pose:n,family:e.geometry.reefGrowth});}
 if(actors.size!==payload.actors.length)throw Error('Reef growth replay actor count differs');const list=[...actors.values()];let moved=0,maxHorizontal=0,maxVertical=0;
 // Validate the complete replay before changing any actor or batch. The tiny
 // absolute pose tolerance matches the documented stamp precision above; it
 // never changes offline from/to records or permits a different root mesh.
 const sameNumber=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10,sameVector=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every((v,k)=>sameNumber(v,b[k])),samePose=(a,b)=>!!a&&!!b&&sameVector(a.p,b.p)&&sameVector(a.s,b.s)&&sameNumber(a.yaw,b.yaw)&&sameNumber(a.pitch,b.pitch);
 for(let i=0;i<list.length;i++){const a=list[i],r=payload.actors[i],n=a.pose,from={p:n.p,s:n.s||[1,1,1],yaw:n.yaw||0,pitch:n.pitch||0},to=r.to;if(a.family!==r.family||!samePose(from,r.from)||!to||!Array.isArray(to.p)||to.p.length!==3||!to.p.every(Number.isFinite)||!Number.isFinite(to.yaw)||!Number.isFinite(to.pitch)||!sameVector(to.s,from.s))throw Error('Reef growth replay source pose differs at '+i);const authored=reefGrowthAuthoredRelocation(a.family,n),id=r.fit?.authoredRelocation;if(id&&(!authored||authored.id!==id||r.fit.reason?.authoredRelocation!==id||JSON.stringify(to)!==JSON.stringify(authored.to)||JSON.stringify(r.from)!==JSON.stringify({p:authored.original.p,s:authored.original.s,yaw:authored.original.yaw||0,pitch:authored.original.pitch||0})||JSON.stringify(r.fit.limits)!==JSON.stringify(authored.limits)))throw Error('Reef growth replay authored correction differs at '+i);if(!id&&r.fit?.reason?.authoredRelocation)throw Error('Reef growth replay authored reason differs at '+i);const horizontal=Math.hypot(to.p[0]-r.from.p[0],to.p[2]-r.from.p[2]),vertical=Math.abs(to.p[1]-r.from.p[1]),changed=!samePose(r.from,to);if(horizontal>(id?authored.limits.horizontal:3.3)+1e-6||vertical>2.500001||changed&&(!r.fit||!r.fit.reason?.root&&!r.fit.reason?.crown))throw Error('Reef growth replay exceeds its measured correction at '+i);if(changed)moved++;maxHorizontal=Math.max(maxHorizontal,horizontal);maxVertical=Math.max(maxVertical,vertical);}
 const limits=new Set();for(const item of payload.batchLimits){const e=entries[item.entry];if(!Number.isInteger(item.entry)||limits.has(item.entry)||!e?.geometry.reefGrowth||(e.batch.maxDistance??null)!==item.from||!Number.isFinite(item.to)||item.to<=(e.batch.minDistance||0)||item.to>(item.from||220))throw Error('Reef growth replay visibility differs');limits.add(item.entry);}
 for(let i=0;i<list.length;i++){const n=list[i].pose,r=payload.actors[i];if(r.fit){n.p=r.to.p.slice();n.yaw=r.to.yaw;if(r.to.pitch)n.pitch=r.to.pitch;else delete n.pitch;n.reefGrowthFit=r.fit;}}
 for(const item of payload.batchLimits)entries[item.entry].batch.maxDistance=item.to;
 return {mode:'verified-replay',actors:list.length,moved,maxHorizontal,maxVertical,failed:[]};
}
// Predict the unchanged static initializer's IDs without writing genes/tints or
// consuming the ecological RNG. Future batches only append after this prefix.
function reefBranchGeneMap(batches){
 const assigned=new Set([...(typeof allLife==='undefined'?[]:allLife),...(typeof shoal==='undefined'?[]:shoal)]),seen=new Set(),genes=new Map();let index=0;
 for(const b of batches)for(const n of b.instances){if(seen.has(n))continue;seen.add(n);if(n.bioGenes){genes.set(n,n.bioGenes[0]);continue;}if(n.bioSeed!==undefined||assigned.has(n))continue;const id=bioHash(19721+(++index)*271);genes.set(n,bioValue(id,0));}return genes;
}
// Same vertex positions as material 3 in VS, before pitch/scale/yaw. Bake the
// posed vertices first: analytically unbending a point would incorrectly treat
// each GPU triangle as a curved surface rather than its actual linear face.
function reefBranchPosition(p,gene){
 const x=Math.fround(p[0]),y=Math.fround(p[1]),z=Math.fround(p[2]),g=Math.fround(gene),h=Math.max(0,y),hh=h*h;
 return [Math.fround(x+(g-.5)*.20*hh),y,Math.fround(z+Math.sin(g*19)*.065*hh)];
}
function reefBranchCrown(g){
 const m=indexGeometry(g.v),points=Array.from({length:m.vertices.length/12},(_,i)=>Array.from(m.vertices.subarray(i*12,i*12+3))),originalCount=points.length,faces=[],edges=[],edgeIDs=new Map(),height=g.reefRoot.crownHeight;
 for(let k=0;k<m.indices.length;k+=3){const input=Array.from(m.indices.subarray(k,k+3)),polygon=[];let a=input[2];for(const b of input){const da=points[a][1]-height,db=points[b][1]-height;if((da>=0)!==(db>=0)){const key=Math.min(a,b)+':'+Math.max(a,b);let id=edgeIDs.get(key);if(id===undefined){const t=da/(da-db);id=points.length;points.push(V.lerp(points[a],points[b],t));edges.push({id,a,b,t});edgeIDs.set(key,id);}polygon.push(id);}if(db>=0)polygon.push(b);a=b;}for(let j=1;j+1<polygon.length;j++){const face=[polygon[0],polygon[j],polygon[j+1]];if(V.len(V.cross(V.sub(points[face[1]],points[face[0]]),V.sub(points[face[2]],points[face[0]])))>1e-12)faces.push(face);}}
 const ids=[...new Set(faces.flat())],sample=ids.filter((_,i)=>i%Math.max(1,Math.floor(ids.length/48))===0);return {points,faces,ids,sample,geometry:g,originalCount,edges};
}
function reefBranchPosedCrown(c,gene){
 const points=c.points.slice(0,c.originalCount).map(p=>reefBranchPosition(p,gene));for(const e of c.edges)points[e.id]=V.lerp(points[e.a],points[e.b],e.t);
 const root={...c.geometry.reefRoot.geometry,v:c.geometry.reefRoot.geometry.v.slice()};for(let k=0;k<root.v.length;k+=12){const p=reefBranchPosition(root.v.slice(k,k+3),gene);for(let j=0;j<3;j++)root.v[k+j]=p[j];}
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of c.ids)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],points[i][k]);hi[k]=Math.max(hi[k],points[i][k]);}
 return {...c,points,geometry:{...c.geometry,reefRoot:{...c.geometry.reefRoot,geometry:root}},rootProbe:null,bounds:{lo,hi}};
}
function fitReefGrowth(entries,live=false,batches=null){
 if(live)return replayReefGrowth(entries,typeof REEF_GROWTH_REPLAY==='undefined'?null:REEF_GROWTH_REPLAY,typeof REEF_GROWTH_SOURCE_SHA256==='undefined'?null:REEF_GROWTH_SOURCE_SHA256);
 const contentStamp=reefGrowthContentStamp(entries),branchGenes=reefBranchGeneMap(batches||[]);
 const poses=new Map(),geometryBounds=new Map(),crownMeshes=new Map(),surfaces=[],groups=new Map(),limitXZ=3.3,limitY=2.5;
 const transform=(p,n)=>{const sc=n.s||[1,1,1],cp=Math.cos(n.pitch||0),sp=Math.sin(n.pitch||0),c=Math.cos(n.yaw||0),s=Math.sin(n.yaw||0),x=(p[0]*cp-p[1]*sp)*sc[0],y=(p[0]*sp+p[1]*cp)*sc[1],z=p[2]*sc[2];return [n.p[0]+x*c+z*s,n.p[1]+y,n.p[2]-x*s+z*c];};
 const inverse=(p,n)=>{const sc=n.s||[1,1,1],c=Math.cos(n.yaw||0),s=Math.sin(n.yaw||0),cp=Math.cos(n.pitch||0),sp=Math.sin(n.pitch||0),dx=p[0]-n.p[0],dy=p[1]-n.p[1],dz=p[2]-n.p[2],x=(c*dx-s*dz)/sc[0],y=dy/sc[1],z=(s*dx+c*dz)/sc[2];return [x*cp+y*sp,-x*sp+y*cp,z];};
 const bounds=g=>{let b=geometryBounds.get(g);if(b)return b;b={lo:[Infinity,Infinity,Infinity],hi:[-Infinity,-Infinity,-Infinity]};for(let i=0;i<g.v.length;i+=12)for(let k=0;k<3;k++){b.lo[k]=Math.min(b.lo[k],g.v[i+k]);b.hi[k]=Math.max(b.hi[k],g.v[i+k]);}geometryBounds.set(g,b);return b;};
 const probe=s=>s.probe||(s.probe=OceanRockContact.surfaceProbe(s.geometry,s.pose));
 for(const e of entries){const b=e.batch,g=e.geometry;
  if(g.reefGrowth&&!b.sceneRole?.startsWith('wreck-')){const key=g.reefGrowth+'/'+g.v.length;let crown=crownMeshes.get(key);if(!crown){if(g.reefRoot)crown=reefBranchCrown(g);else{const m=indexGeometry(g.v),points=Array.from({length:m.vertices.length/12},(_,i)=>Array.from(m.vertices.subarray(i*12,i*12+3))),faces=[],used=new Set();for(let k=0;k<m.indices.length;k+=3){const ids=Array.from(m.indices.subarray(k,k+3)),center=[0,1,2].map(j=>ids.reduce((sum,i)=>sum+points[i][j],0)/3);if(g.reefGrowth==='fan'?center[1]<.12:Math.hypot(center[0],center[2])<.16||center[1]<.08)continue;faces.push(ids);ids.forEach(i=>used.add(i));}const ids=[...used],sample=ids.filter((_,i)=>i%Math.max(1,Math.floor(ids.length/48))===0);crown={points,faces,ids,sample,geometry:g};}crownMeshes.set(key,crown);}for(const n of e.instances){let a=poses.get(n);if(!a)poses.set(n,a={pose:n,family:g.reefGrowth,crowns:new Set(),batches:new Set()});a.crowns.add(crown);a.batches.add(b);}}
  if(b.dynamic||b.kind||!(g.rockContact||g.material===1||b.sceneRole==='wreck-hull'))continue;
  const bb=bounds(g);for(const n of e.instances){const corners=[];for(let k=0;k<8;k++)corners.push(transform([k&1?bb.hi[0]:bb.lo[0],k&2?bb.hi[1]:bb.lo[1],k&4?bb.hi[2]:bb.lo[2]],n));const s={geometry:g,pose:n,batch:b,entry:entries.indexOf(e),batchIndex:e.batchIndex,instance:e.instances.indexOf(n),lo:[0,1,2].map(k=>Math.min(...corners.map(p=>p[k]))),hi:[0,1,2].map(k=>Math.max(...corners.map(p=>p[k])))};surfaces.push(s);const key=(g.material||0)+'/'+JSON.stringify([n.p,n.s||[1,1,1],n.yaw||0,n.pitch||0]);let group=groups.get(key);if(!group)groups.set(key,group=[]);group.push(s);}
 }
 const heights=(x,z,near)=>{let lower=-Infinity,upper=-Infinity;for(const group of near){if(group[0].geometry.rockContact?.kind==='arch')continue;let lo=Infinity,hi=-Infinity;for(const s of group){const h=x<s.lo[0]||x>s.hi[0]||z<s.lo[2]||z>s.hi[2]?-Infinity:probe(s).height(x,z);lo=Math.min(lo,h);hi=Math.max(hi,h);}lower=Math.max(lower,lo);upper=Math.max(upper,hi);}return {lower,upper};};
 const clear=(a,n,relevant,full)=>{for(const crown of a.crowns){let candidates=relevant;if(crown.bounds){const corners=[];for(let k=0;k<8;k++)corners.push(transform([k&1?crown.bounds.hi[0]:crown.bounds.lo[0],k&2?crown.bounds.hi[1]:crown.bounds.lo[1],k&4?crown.bounds.hi[2]:crown.bounds.lo[2]],n));const lo=[0,1,2].map(k=>Math.min(...corners.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...corners.map(p=>p[k])));candidates=relevant.filter(s=>lo[0]<=s.hi[0]&&hi[0]>=s.lo[0]&&lo[2]<=s.hi[2]&&hi[2]>=s.lo[2]&&lo[1]<=s.hi[1]&&(s.geometry.material===1||hi[1]>=s.lo[1]));if(!candidates.length)continue;}
   const pointBlocked=(p,s)=>s.geometry.material===1?p[0]>=s.lo[0]&&p[0]<=s.hi[0]&&p[2]>=s.lo[2]&&p[2]<=s.hi[2]&&probe(s).height(p[0],p[2])>p[1]+1e-5:!p.some((v,k)=>v<s.lo[k]||v>s.hi[k])&&probe(s).contains(p);
   const faceBounds=triangle=>({lo:[0,1,2].map(k=>Math.min(...triangle.map(p=>p[k]))),hi:[0,1,2].map(k=>Math.max(...triangle.map(p=>p[k])))}),faceBlocked=(triangle,s,box=null)=>{const {lo,hi}=box||faceBounds(triangle);return !lo.some((v,k)=>v>s.hi[k]||hi[k]<s.lo[k])&&probe(s).intersectsTriangle(triangle);};
   const remember=(type,index,s)=>{if(!crown.bounds)return;const recent=crown.rejections||(crown.rejections=[]);if(!recent.some(r=>r.type===type&&r.index===index&&r.surface===s)){recent.unshift({type,index,surface:s});if(recent.length>8)recent.pop();}};
   // Failed witnesses are exact and candidate-specific, never a positive
   // clearance cache. Re-test with the same production predicates before
   // rejecting; if the witness clears, the full original gate still runs.
   for(const r of crown.rejections||[]){if(!candidates.includes(r.surface))continue;const blocked=r.type==='point'?pointBlocked(transform(crown.points[r.index],n),r.surface):faceBlocked(r.index.map(i=>transform(crown.points[i],n)),r.surface);if(blocked)return false;}
   const wp=full?crown.points.map(p=>transform(p,n)):null;
   for(const i of full?crown.ids:crown.sample){const p=wp?wp[i]:transform(crown.points[i],n);for(const s of candidates)if(pointBlocked(p,s)){remember('point',i,s);return false;}}
   if(full)for(const ids of crown.faces){const triangle=ids.map(i=>wp[i]),box=faceBounds(triangle);for(const s of candidates)if(faceBlocked(triangle,s,box)){remember('face',ids,s);return false;}}
  }return true;};
 const supportFor=(a,n,near,side=null)=>{let best=null;for(const group of side?[side]:near){if(group[0].geometry.rockContact?.kind==='arch')continue;let end=0;for(const s of group.slice().sort((a,b)=>(a.batch.minDistance||0)-(b.batch.minDistance||0))){if((s.batch.minDistance||0)>end)break;end=Math.max(end,s.batch.maxDistance||220);}const pivotDistance=V.dist(n.p,group[0].pose.p),cap=end-(pivotDistance+1.2)/.64,required=Math.max(...[...a.batches].map(b=>b.maxDistance&&b.maxDistance!==220?b.maxDistance:0));if(cap<required||best&&cap<=best.maxDistance)continue;let good=true;
  for(const s of group){const q=probe(s).nearest(n.p);if(!q||q.distance>.20*Math.max(...(n.s||[1,1,1]))){good=false;break;}const center=[0,1,2].map(k=>q.triangle.reduce((sum,p)=>sum+p[k],0)/3),d=V.dist(center,q.point),t=Math.min(.001,.0005/Math.max(1e-9,d)),point=q.point.map((v,k)=>mix(v,center[k],t)),local=inverse(point,n);if(local[1]>(a.family==='fan'?.06:.08)){good=false;break;}
   for(const c of a.crowns){const p=c.rootProbe||(c.rootProbe=OceanRockContact.surfaceProbe(c.geometry.reefRoot?.geometry||c.geometry,{p:[0,0,0]}));if(!p.contains(local)||p.nearest(local).distance<=1e-6){good=false;break;}}if(!good)break;
  }if(good)best={surfaces:group.map(s=>({entry:s.entry,batch:s.batchIndex,instance:s.instance})),maxDistance:cap,pivotDistance,minimumScale:.64,fadeAllowance:1.2};
 }return best;};
 const failed=[],moved=[];
 for(const a of poses.values()){const unposedCrowns=a.crowns;if([...a.crowns].every(c=>!!c.geometry.reefRoot)){const gene=a.pose.bioGenes?.[0]??branchGenes.get(a.pose);if(!Number.isFinite(gene))throw Error('Branch growth needs the complete static batch sequence');a.crowns=new Set([...a.crowns].map(c=>reefBranchPosedCrown(c,gene)));}const n=a.pose,authored=reefGrowthAuthoredRelocation(a.family,n),reach=authored?authored.limits.horizontal:limitXZ,from={p:n.p.slice(),s:(n.s||[1,1,1]).slice(),yaw:n.yaw||0,pitch:n.pitch||0},extent=Math.max(...[...a.crowns].map(c=>Math.max(...c.points.map(p=>Math.hypot(...p)))))*Math.max(...from.s),near=[...groups.values()].filter(g=>g.some(s=>from.p[0]+reach+extent>=s.lo[0]&&from.p[0]-reach-extent<=s.hi[0]&&from.p[2]+reach+extent>=s.lo[2]&&from.p[2]-reach-extent<=s.hi[2]));
  const relevant=surfaces.filter(s=>from.p[0]+reach+extent>=s.lo[0]&&from.p[0]-reach-extent<=s.hi[0]&&from.p[2]+reach+extent>=s.lo[2]&&from.p[2]-reach-extent<=s.hi[2]);
  a.from=from;const branching=[...a.crowns].every(c=>!!c.geometry.reefRoot),validRoot=h=>Number.isFinite(h.lower)&&Number.isFinite(h.upper)&&h.upper-h.lower<=(branching?.10:.045)*from.s[1],crownFits=clear(a,n,relevant,false)&&clear(a,n,relevant,true);
  a.support=supportFor(a,n,near);if(a.support&&crownFits){a.crowns=unposedCrowns;continue;}const reason={root:!a.support,crown:!crownFits};let found=null;
  if(authored){const candidate={...n,p:authored.to.p.slice(),yaw:authored.to.yaw,pitch:authored.to.pitch};if(clear(a,candidate,relevant,false)&&clear(a,candidate,relevant,true)){const support=supportFor(a,candidate,near);if(support){found=candidate;a.support=support;reason.authoredRelocation=authored.id;}}}
  if(!authored)for(const radius of [0,.08,.16,.28,.44,.64,.90,1.20,1.55,2,2.6,limitXZ]){const count=radius?16:1;for(let i=0;i<count;i++){const angle=(i/count)*TAU+(n.yaw||0),x=from.p[0]+Math.cos(angle)*radius,z=from.p[2]+Math.sin(angle)*radius,h=heights(x,z,near);if(!validRoot(h))continue;for(const lift of branching?[0,.035,.060,.085]:[0]){const y=(h.lower+h.upper)*.5+lift*from.s[1];if(Math.abs(y-from.p[1])>limitY)continue;const candidate={...n,p:[x,y,z]},rootSupport=branching?supportFor(a,candidate,near):null;if((!branching||rootSupport)&&clear(a,candidate,relevant,false)&&clear(a,candidate,relevant,true)){const support=rootSupport||supportFor(a,candidate,near);if(support){found=candidate;a.support=support;break;}}}if(found)break;}if(found)break;}
  // Cliff shelves can be wholly inside a vertical buttress. Seek its nearby
  // actual outer face, not its much higher roof. Grow along the measured normal
  // while the real basal tissue crosses that same single-LOD rock triangle.
  if(!found&&!authored){const side=near.filter(g=>g.length===1&&g[0].geometry.rockContact?.kind==='rock');const choices=[];for(const vertical of [0,.24,-.24,.55,-.55,.95,-.95])for(const group of side){const s=group[0],q=probe(s).nearest([from.p[0],from.p[1]+vertical,from.p[2]]);if(!q)continue;const delta=q.point.map((v,k)=>v-from.p[k]);if(Math.hypot(delta[0],delta[2])>limitXZ||Math.abs(delta[1])>limitY)continue;let normal=q.normal;if(probe(s).contains(q.point.map((v,k)=>v+normal[k]*.01)))normal=normal.map(v=>-v);if(normal[1]<-.25)continue;const horizontal=Math.hypot(normal[0],normal[2]),yaw=horizontal>1e-5?Math.atan2(normal[2],-normal[0]):from.yaw,pitch=Math.atan2(horizontal*from.s[1],normal[1]*from.s[0]);choices.push({candidate:{...n,p:q.point.slice(),yaw,pitch},distance:Math.hypot(...delta),group});}choices.sort((a,b)=>a.distance-b.distance);for(const q of choices)if(clear(a,q.candidate,relevant,false)&&clear(a,q.candidate,relevant,true)){const support=supportFor(a,q.candidate,near,q.group);if(support){found=q.candidate;a.support=support;reason.sideSurface=true;break;}}}
  if(found){n.p=found.p;n.yaw=found.yaw||0;if(found.pitch)n.pitch=found.pitch;else delete n.pitch;n.reefGrowthFit={from,delta:n.p.map((v,k)=>v-from.p[k]),limits:authored?{...authored.limits}:{horizontal:limitXZ,vertical:limitY},reason,...(authored?{authoredRelocation:authored.id}:{})};moved.push(n.reefGrowthFit);}else failed.push({family:a.family,p:from.p,reason});
  a.crowns=unposedCrowns;
 }
 const limits=new Map();for(const a of poses.values())if(a.support)for(const b of a.batches)if(a.support.maxDistance<(b.maxDistance||220)){const cap=Math.min(limits.get(b)?.to??Infinity,a.support.maxDistance);limits.set(b,{entry:entries.findIndex(e=>e.batch===b),batch:entries.find(e=>e.batch===b).batchIndex,from:b.maxDistance??null,to:cap});}const batchLimits=[...limits.values()];for(const item of batchLimits)entries[item.entry].batch.maxDistance=item.to;
 const report={actors:poses.size,moved:moved.length,maxHorizontal:Math.max(0,...moved.map(m=>Math.hypot(m.delta[0],m.delta[2]))),maxVertical:Math.max(0,...moved.map(m=>Math.abs(m.delta[1]))),failed,batchLimits,replay:{format:'return-blue/reef-growth/1',contentStamp,failed,batchLimits,actors:[...poses.values()].map(a=>({family:a.family,from:a.from,to:{p:a.pose.p.slice(),s:(a.pose.s||[1,1,1]).slice(),yaw:a.pose.yaw||0,pitch:a.pose.pitch||0},fit:a.pose.reefGrowthFit||null,support:a.support||null}))}};
 Object.defineProperty(report,'actorRefs',{value:[...poses.values()].map(a=>a.pose),enumerable:false});return report;
}
// Silhouette-first reef LODs preserve open branches, scallops and sponge cavities.
function distantColony(type){
 const g=new Geometry();g.shadow=false;g.material=3;const feet=[];
 const colors=[[.61,.54,.43],[.49,.53,.52],[.45,.53,.47],[.60,.51,.37],[.53,.56,.46],[.66,.59,.42],[.69,.42,.30],[.42,.35,.40],[.61,.49,.41],[.55,.56,.45],[.57,.49,.46]],col=colors[type];
 if(type===3||type===4){return tableCoral(type===4?1:0,'far');}
 else if(type===5){return brainCoral(true);}
 else if(type===7){return spongeGeometry(true);}
 else if(type===6){return seaFanGeometry(true,true);}
 else{
  const mound=type>8,branches=mound?18:15;
  for(let k=0;k<branches;k++){
   const a=k*2.39996,r=Math.sqrt((k+.5)/branches)*.65,h=(.51+.22*Math.sqrt(1-r*r))*(mound?.76:1),base=[Math.cos(a)*r*.42,.015,Math.sin(a)*r*.42],fork=[Math.cos(a)*r*.80,h*.69,Math.sin(a)*r*.80];
   feet.push({base,fork});
   g.tube(base,fork,.043,.028,col.map(c=>c*.83),4);
   for(let j=0;j<2;j++){const az=a+(j?-.62:.62),tip=[Math.cos(a)*r+Math.cos(az)*.052,h+Math.sin(k*3.1)*.035,Math.sin(a)*r+Math.sin(az)*.052];g.tube(fork,tip,.027,.016,col,4);}
  }
 }
 return feet.length?rootedBranchColony(g,type>8?'cauliflower-'+(type-9):'branch-'+(type===8?3:type),feet):g;
}
// Real curved branches and connecting branchlets form this open fan. There is
// no perforated film: water and light pass through actual geometric openings.
const seaFanGeometryCache=new Map();
function seaFanGeometry(low=false,distant=false){
 const lod=distant?'far':low?'middle':'high';if(seaFanGeometryCache.has(lod))return seaFanGeometryCache.get(lod);
 const g=new Geometry();g.material=7;g.shadow=false;g.tag=0;g.reefGrowth='fan';const color=[.54,.30,.35];
 const at=(x,y)=>[x,y,.045*y*y+(.065*Math.sin(x*3.8+y*1.6)+.023*Math.sin(x*8.7-y*3))*Math.max(0,y-.12)];
 const bezier=points=>t=>{const s=1-t;return [0,1,2].map(k=>s*s*s*points[0][k]+3*s*s*t*points[1][k]+3*s*t*t*points[2][k]+t*t*t*points[3][k]);};
 const emit=(a,b,c,col)=>{const face=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(face)<1e-12)return;if(V.dot(face,V.add(a.n,V.add(b.n,c.n)))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,col,[a.n,b.n,c.n]);};
 function branch(path,r0,r1,steps,sides,col){
  const points=Array.from({length:steps+1},(_,i)=>path(i/steps)),length=points.slice(1).reduce((s,p,i)=>s+V.dist(points[i],p),0),slope=(r1-r0)/Math.max(.001,length),tangents=[];
  const rings=points.map((p,i)=>{const t=i/steps,d=V.norm(V.sub(path(Math.min(1,t+.0001)),path(Math.max(0,t-.0001)))),u=V.norm(V.cross(d,[0,0,1])),v=V.cross(d,u),r=mix(r0,r1,t);tangents.push(d);return Array.from({length:sides},(_,j)=>{const a=j/sides*TAU,radial=V.add(V.mul(u,Math.cos(a)),V.mul(v,Math.sin(a)));return {p:V.add(p,V.mul(radial,r)),n:V.norm(V.sub(radial,V.mul(d,slope)))};});});
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const next=(j+1)%sides,a=rings[i][j],b=rings[i][next],c=rings[i+1][next],d=rings[i+1][j];emit(a,b,c,col);emit(a,c,d,col);}
  const a={p:points[0],n:V.mul(tangents[0],-1)},b={p:points[steps],n:tangents[steps]};for(let j=0;j<sides;j++){emit(a,{p:rings[0][j].p,n:a.n},{p:rings[0][(j+1)%sides].p,n:a.n},col);emit(b,{p:rings[steps][j].p,n:b.n},{p:rings[steps][(j+1)%sides].p,n:b.n},col);}
 }
 // A compact closed holdfast is continuous with the trunk. The exact y=0
 // twelve-gon is shared at both LODs and remains below the sway displacement.
 const profile=[[-.025,.034],[0,.045],[.06,.030],[.15,.026],[.25,.020]],root=profile.map(([y,r],i)=>{
  const before=profile[Math.max(0,i-1)],after=profile[Math.min(profile.length-1,i+1)],slope=(after[1]-before[1])/(after[0]-before[0]),x=y>0?.012*(y/.25)**2:0,z=y>0?.008*(y/.25)**2:0;
  return Array.from({length:12},(_,j)=>{const a=j/12*TAU;return {p:[x+Math.cos(a)*r,y,z+Math.sin(a)*r],n:V.norm([Math.cos(a),-slope,Math.sin(a)])};});
 });
 const foot={p:[0,-.04,0],n:[0,-1,0]},trunk={p:[.012,.25,.008],n:[0,1,0]};for(let j=0;j<12;j++){const next=(j+1)%12;emit(foot,root[0][j],root[0][next],color);for(let i=0;i<root.length-1;i++){emit(root[i][j],root[i][next],root[i+1][next],color);emit(root[i][j],root[i+1][next],root[i+1][j],color);}emit(trunk,root[root.length-1][j],root[root.length-1][next],color);}
 // NSU G. ventalina photo study: deep irregular clefts and broad lobes surround
 // a few large veins; the visible tissue between them is a dense short net.
 // These are actual three-dimensional struts, never a fragment-discard card.
 const outline=[[0,.16],[-.18,.23],[-.45,.29],[-.72,.46],[-.98,.66],[-1.00,.85],[-.92,.99],[-.78,.88],[-.76,1.12],[-.58,1.26],[-.42,1.32],[-.34,1.10],[-.24,1.38],[-.07,1.58],[.10,1.63],[.21,1.43],[.15,1.16],[.36,1.34],[.59,1.44],[.76,1.39],[.91,1.24],[.76,1.10],[1.04,1.12],[1.13,.98],[1.06,.73],[.88,.59],[.67,.43],[.38,.30],[.17,.20]];
 const inside=(x,y)=>{let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 // Integer keys keep construction identical across JS engines. In particular,
 // never feed derived trigonometric positions back into a pseudo-random hash.
 const hash=(x,y,k=0)=>{let n=(Math.imul(x|0,73856093)^Math.imul(y|0,19349663)^Math.imul(k|0,83492791))>>>0;n=(n^61)^(n>>>16);n=Math.imul(n,9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);return (n^(n>>>15))>>>0;},noise=(x,y,k=0)=>hash(x,y,k)/4294967296;
 const edgeSeed=key=>{let n=2166136261;for(let i=0;i<key.length;i++)n=Math.imul(n^key.charCodeAt(i),16777619);return n>>>0;};
 const cell=distant?.145:low?.085:.038,dy=Math.sqrt(3)*cell/2,vertices=new Map(),edges=new Map(),considered=new Set();
 const node=(ix,iy)=>{const key=ix+','+iy;if(!vertices.has(key)){let x=ix*cell/2,y=iy*dy;x+=cell*(noise(ix,iy)-.5)*.55+.052*Math.sin(y*5+x*2)+.032*Math.sin(x*4-y*2);y+=cell*(noise(ix,iy,2)-.5)*.55+.040*Math.sin(x*5+y*4);vertices.set(key,{key,p:at(x,y),links:[],in:inside(x,y)});}return vertices.get(key);};
 const link=(a,b,fine=false)=>{const key=a.key<b.key?a.key+'/'+b.key:b.key+'/'+a.key;if(edges.has(key))return;edges.set(key,[a,b,fine,edgeSeed(key)]);a.links.push(b);b.links.push(a);};
 const offsets=[[2,0],[1,1],[-1,1],[-2,0],[-1,-1],[1,-1]],qx=Math.ceil(1.2/(cell*1.5)),ry=Math.ceil(1.75/(dy*2));
 for(let q=-qx;q<=qx;q++)for(let r=-ry;r<=ry;r++){
  const hex=offsets.map(([x,y])=>node(3*q+x,2*r+q+y));
  for(let j=0;j<6;j++){const a=hex[j],b=hex[(j+1)%6];if(!a.in||!b.in)continue;const key=a.key<b.key?a.key+'/'+b.key:b.key+'/'+a.key;if(considered.has(key))continue;considered.add(key);if(noise(q,r,j+11)<.075)continue;link(a,b);}
  // Local fine branching divides some cells into several short irregular
  // openings while neighbouring regions remain broader. This breaks the
  // single-scale wire-fence pattern without uniformly adding another grid.
  if(hex.every(n=>n.in)){
   const x=hex.reduce((s,n)=>s+n.p[0],0)/6,y=hex.reduce((s,n)=>s+n.p[1],0)/6,density=.46+.27*Math.sin(x*5.2+y*3.1);
   if(noise(q,r,25)<density){const p=at(x+cell*(noise(q,r,26)-.5)*.7,y+cell*(noise(q,r,27)-.5)*.7),key='growth:'+q+','+r,n={key,p,links:[],in:true};vertices.set(key,n);const phase=noise(q,r,28)>.5?1:0;for(let j=phase;j<6;j+=2)link(n,hex[j],true);}
  }
 }
 // Remove any isolated rim fragments, then connect the actual retained net to
 // the same rooted attachment. No construction result changes the scene RNG.
 const candidates=[...vertices.values()].filter(v=>v.in&&v.links.length),origin=[.004,.18,.003],nearest=candidates.reduce((a,b)=>V.dist(a.p,origin)<V.dist(b.p,origin)?a:b),retained=new Set([nearest]),queue=[nearest];
 for(let i=0;i<queue.length;i++)for(const next of queue[i].links)if(!retained.has(next)){retained.add(next);queue.push(next);}
 const fineColor=[.55,.36,.42],fineRadius=cell*.105;
 for(const [a,b,fine,seed] of edges.values())if(retained.has(a)&&retained.has(b)){
  const dx=b.p[0]-a.p[0],dy=b.p[1]-a.p[1],len=Math.hypot(dx,dy),bend=len*(noise(seed,0,5)-.5)*.42,curved=!low&&noise(seed,0,8)>.62;
  const path=t=>{const p=V.lerp(a.p,b.p,t),w=Math.sin(Math.PI*t)*bend;return [p[0]-dy/len*w,p[1]+dx/len*w,p[2]+w*.3];};
  const radius=fineRadius*(fine?.58:1)*(.66+.68*noise(seed,0,6)),r0=a.links.length===1?radius*.10:radius,r1=b.links.length===1?radius*.10:radius*(.77+.31*noise(seed,0,4));branch(path,r0,r1,curved?2:1,3,fineColor);
 }
 branch(t=>V.lerp(origin,nearest.p,t),.017,fineRadius,2,4,color);
 const veins=[],vein=(end,parent=-1,t=.4)=>{const p=parent<0?origin:veins[parent](t),[x,y]=end,path=bezier([p,at(mix(p[0],x,.22),mix(p[1],y,.31)),at(mix(p[0],x,.73)-.035, mix(p[1],y,.83)),at(x,y)]);branch(path,parent<0?.020:.0105,.0038,low?5:11,low?4:5,color);veins.push(path);};
 vein([-.92,.80]);vein([-.55,1.18],0,.43);vein([-.07,1.49]);vein([.13,1.13],2,.52);vein([.62,1.31]);vein([1.01,.99],4,.35);vein([.91,.72],5,.39);
 g.indexed=indexGeometry(g.v);seaFanGeometryCache.set(lod,g);return g;
}
function fanCoral(){return seaFanGeometry(!reefDetailLevel);}
function fanColonyLods(r,items,role){
 const result=[];for(const [geometry,min,max,suffix] of [[seaFanGeometry(false),0,5.5,'near'],[seaFanGeometry(true),5.5,20,'middle'],[seaFanGeometry(true,true),20,220,'far']]){
  const b=r.batch(geometry,items,3);if(min)b.minDistance=min;b.maxDistance=max;b.sceneRole=role+'-'+suffix;result.push(b);
 }return result;
}
// Barrel walls, rim and dark inner bowl are actual geometry, visible from above.
function spongeGeometry(low=false){
 const g=new Geometry();g.material=8;g.shadow=true;
 const cups=[[0,0,.82,.32],[-.42,.12,.63,.20],[.31,-.31,.48,.15]],ns=low?12:28,nv=low?6:15;
 for(let k=0;k<cups.length;k++){
  const [cx,cz,h,rad]=cups[k],col=k===0?[.43,.35,.27]:[.48,.39,.29];
  const rim=a=>1+.045*Math.sin(a*9+k)+.035*Math.sin(a*4-k);
  const top=a=>h*(1+.031*Math.sin(a*5+k)+.021*Math.cos(a*8));
  const outside=(a,v)=>{const r=rad*(.79+.34*Math.sin(v*Math.PI*.82))*rim(a);return [cx+Math.cos(a)*r+.08*v*v,top(a)*v,cz+Math.sin(a)*r];};
  surface(g,(u,v)=>outside(u*TAU,v),ns,nv,(p,u,v)=>col.map(c=>c*(.76+.22*v+.06*Math.sin(u*TAU*7))),-1);
  surface(g,(u,v)=>{const a=u*TAU,t=.35+v*.65,r=rad*(.79+.34*Math.sin(t*Math.PI*.82))*rim(a)*.77;return [cx+Math.cos(a)*r+.08*t*t,top(a)*t,cz+Math.sin(a)*r];},ns,low?3:8,(p,u,v)=>col.map(c=>c*(.25+.29*v)),1);
  for(let j=0;j<ns;j++){
   const a=j/ns*TAU,b=(j+1)/ns*TAU,outerA=outside(a,1),outerB=outside(b,1),inner=p=>[cx+.08+(p[0]-cx-.08)*.77,p[1],cz+(p[2]-cz)*.77];
   g.quad(outerA,outerB,inner(outerB),inner(outerA),col.map(c=>c*1.08));
   const bottom=a=>[cx+Math.cos(a)*rad*.72+.010,h*.35,cz+Math.sin(a)*rad*.72];
   g.tri([cx+.010,h*.31,cz],bottom(a),bottom(b),col.map(c=>c*.24));
  }
 }
 return g;
}
function brainCoral(low=false){
 const g=new Geometry();g.material=4;g.shadow=true;
 surface(g,(u,v)=>{const a=u*TAU,b=v*Math.PI,sy=Math.sin(b),x=Math.cos(a)*sy,z=Math.sin(a)*sy;
  const f=1+.06*Math.sin(a*5)*sy*sy+.036*Math.sin(a*9+b*3);return [x*.73*f,.20+Math.cos(b)*.60*f,z*.68*f];
 },low?18:46,low?12:30,[.64,.58,.39],1);return g;
}
// Ribbon leaves have a tapered tip and twisted midrib; anchored roots stay still.
function grass(){
 const g=new Geometry();g.material=9;g.shadow=false;
 for(let k=0;k<20;k++){
  const a=k*2.39996,h=.30+.51*random(),r=.035+.17*random(),curl=.18+.28*random(),width=.016+.014*random();
  const cx=Math.cos(a)*r,cz=Math.sin(a)*r,col=[.25+random()*.06,.36+random()*.08,.20+random()*.045];
  surface(g,(u,v)=>{const angle=a+v*.55,leaf=(u-.5)*width*Math.pow(1-v,.55),lean=v*v*curl;
   return [cx+Math.cos(a)*lean+Math.cos(angle)*leaf,h*v-.08*v*v,cz+Math.sin(a)*lean+Math.sin(angle)*leaf];
  },2,8,(p,u,v)=>col.map(c=>c*(.69+.31*v)),1);
 }
 return g;
}
