/* Original geological/architectural regions, in game metres, not surveyed sites.
 * The same immutable solids drive geometry, camera rays and collision in both
 * the generated and compiled worlds. No legacy random stream is consumed.
 * Loaded after open_world and fauna modules, before scene_cache. */
const OceanRegions=(()=>{
 const originalGround=groundHeight;
 const solids=[],points={},routes={},rockFaces=[];
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 const mixRegion=(a,b,t)=>a+(b-a)*t;
 const boxWeight=(x,z,x0,x1,z0,z1,feather)=>{
  const dx=Math.max(x0-x,0,x-x1),dz=Math.max(z0-z,0,z-z1);
  return 1-ease(Math.hypot(dx,dz)/feather);
 };
 const canyonX=z=>-156+13*ease((-z-284)/38);
 const canyonBed=z=>-66-28*ease((-z-253)/70);
 const padLocations=[[-156,-265],[-154.4,-293],[-143,-321]];
 function ground(x,z){
  let y=originalGround(x,z);
  const cave=boxWeight(x,z,-236,-212,-85,-38,10);
  if(cave)y=mixRegion(y,-29,cave);
  const ruins=boxWeight(x,z,155,199,-237,-194,12);
  if(ruins)y=mixRegion(y,-54,ruins);
  const cross=1-ease((Math.abs(x-canyonX(z))-6)/14),length=ease((-z-245)/11)*(1-ease((-z-327)/11));
  if(cross>0&&length>0)y=mixRegion(y,Math.min(y,canyonBed(z)),cross*length);
  // Small level foundations, wide enough for a sensor and a diver, are part of
  // the terrain itself. The 4.2m flat core covers the actual 64/22m terrain
  // triangle vertices under each 2.4m platform; their rim blends into the floor.
  for(const [px,pz] of padLocations){const weight=1-ease((Math.hypot(x-px,z-pz)-4.2)/2.7);if(weight>0)y=mixRegion(y,canyonBed(pz),weight);}
  return y;
 }
 function solid(region,role,id,min,max){const s={region,role,id,min,max};solids.push(s);return s;}
 const caveFloor=-29,ruinFloor=-54;
 // Shared triangular rock columns: the lower and upper faces are the exact
 // rendered surfaces. Their five convex planes also drive sweeps and collision.
 function rockColumn(region,id,lower,upper,edges){
  const vertices=lower.concat(upper),center=[0,1,2].map(k=>vertices.reduce((n,p)=>n+p[k],0)/6);
  const faces=[[lower[0],lower[2],lower[1]],[upper[0],upper[1],upper[2]]];
  for(let i=0;i<3;i++)faces.push([lower[i],lower[(i+1)%3],upper[(i+1)%3],upper[i]]);
  const planes=faces.map(face=>{let n=V.norm(V.cross(V.sub(face[1],face[0]),V.sub(face[2],face[0]))),d=V.dot(n,face[0]);if(V.dot(n,center)>d){n=V.mul(n,-1);d=-d;}return [...n,d];});
  const solid={region,role:'roof',id,min:[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k]))),planes,faces};
  if(region==='abyss')solid.role='wall';solids.push(solid);
  for(let i=0;i<2;i++)rockFaces.push({region,role:solid.role,layer:i?'outer':'inner',p:faces[i],normal:planes[i].slice(0,3)});
  for(let i=0;i<3;i++){
   const x=lower[i],y=lower[(i+1)%3],key=[x[0]+','+x[2],y[0]+','+y[2]].sort().join('/');
   if(edges.has(key))edges.delete(key);else edges.set(key,{region,role:solid.role,layer:'edge',p:faces[i+2],normal:planes[i+2].slice(0,3)});
  }
 }
 function rockGrid(region,id,rows,skip=()=>false){
  const edges=new Map();
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<rows[j].length-1;i++){
   const q=[rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]];if(skip(q))continue;
   const triangles=(i+j)%2?[[0,1,3],[1,2,3]]:[[0,1,2],[0,2,3]];
   for(let k=0;k<2;k++)rockColumn(region,id+'-'+j+'-'+i+'-'+k,triangles[k].map(n=>q[n].bottom),triangles[k].map(n=>q[n].top),edges);
  }
  rockFaces.push(...edges.values());
 }
 // A wave-cut main vault meets an offset chamber. Their union creates two
 // rounded connecting passages around a central remnant, not box doorways.
 const caveCenter=z=>-218+.55*Math.sin((z+61)*.10)+.15*Math.sin(z*.31);
 function caveUnderside(x,z){
  const width=4.85+.48*Math.sin(z*.13)+.22*Math.sin(z*.4),cross=(x-caveCenter(z))/width;
  const main=-29+(7.7+.55*Math.sin(z*.18))*Math.sqrt(Math.max(0,1-cross*cross));
  const cx=-227.7+.20*Math.sin(z*.3),q=((x-cx)/8.4)**2+((z+60)/12.0)**2;
  const chamber=-29+7.8*Math.sqrt(Math.max(0,1-q));
  const a=cross*cross<1?main:-31,b=q<1?chamber:-31,join=Math.max(0,1-Math.abs(a-b)/3);
  return a===-31&&b===-31?-31:Math.max(a,b)+.75*join*join;
 }
 function caveExterior(x,z,bottom){
  const cross=(x-(caveCenter(z)-1))/13,main=12.8*Math.sqrt(Math.max(0,1-cross*cross));
  const q=((x+228)/11.5)**2+((z+60)/16)**2,chamber=11.3*Math.sqrt(Math.max(0,1-q));
  return Math.max(bottom+.9,-30.8+Math.max(main,chamber)+.33*Math.sin(z*.31+x*.17));
 }
 const caveXs=Array.from({length:43},(_,i)=>-240.5+i*.75),caveZs=[];
 for(let z=-85;z<-38;z+=1.5)caveZs.push(z);caveZs.push(-38);
 const caveRows=caveZs.map(z=>caveXs.map(x=>{const y=caveUnderside(x,z);return {bottom:[x,y,z],top:[x,caveExterior(x,z,y),z]};}));
 rockGrid('cave','cave-vault',caveRows,q=>q.every(p=>p.bottom[0]>=-219.5&&p.bottom[0]<=-216.5&&p.bottom[2]>=-49&&p.bottom[2]<=-46));
 // The authored mineral relief remains attached to this surviving rock rib.
 solid('cave','wall','cave-mineral-rib',[-236,-31,-60.3],[-234,-23.7,-55.7]);
 // Small remnant pillars divide the two passages. Each is a tapered, irregular
 // hill from the same collidable surface representation as the canyon rock.
 function outcrop(id,cx,cz,rx,rz,height){
  const rows=[];for(let j=0;j<=8;j++){const row=[];for(let i=0;i<=8;i++){
   const x=cx+(i/4-1)*rx,z=cz+(j/4-1)*rz,r=Math.hypot((x-cx)/rx,(z-cz)/rz),y=-29+height*Math.pow(Math.max(0,1-r*r),.47);
   row.push({bottom:[x,-31,z],top:[x,Math.max(-29.1,y),z]});
  }rows.push(row);}rockGrid('cave',id,rows);
 }
 outcrop('cave-remnant',-222.7,-60.5,1.35,1.6,7.1);
 outcrop('cave-chamber-remnant',-229.1,-61.5,.95,1.35,5.9);
 // An original drowned tidal observatory: freestanding square piers, an open
 // dial court, a stepped gateway and an archive with two real door openings.
 for(let row=0;row<3;row++)for(let side=0;side<2;side++)for(let line=0;line<2;line++){
  const x=side?191+line*4:157+line*4,z=-198-row*8,height=[5.2,3.1,6.0][(row+line)%3];
  solid('ruins','column','ruin-pier-'+row+'-'+side+'-'+line,[x-.60,-54.2,z-.60],[x+.60,-54+height,z+.60]);
 }
 for(const [id,min,max] of [
  ['gate-west',[165.8,-54.2,-196.5],[168.2,-46.9,-193.5]],
  ['gate-east',[183.8,-54.2,-196.5],[186.2,-46.9,-193.5]],
  ['court-west',[154,-54.4,-237],[156,-51.8,-194]],
  ['court-north',[156,-54.4,-239],[181,-51.8,-237]],
  ['archive-west',[181,-54.5,-235],[183,-46.2,-215]],
  ['archive-back',[183,-54.5,-235],[197,-46.2,-233]],
  ['archive-east-north',[195,-54.5,-233],[197,-46.2,-224]],
  ['archive-east-south',[195,-54.5,-219],[197,-46.2,-215]],
  ['archive-front-west',[183,-54.5,-217],[185,-46.2,-215]],
  ['archive-front-east',[191,-54.5,-217],[195,-46.2,-215]]
 ])solid('ruins','wall','ruin-'+id,min,max);
 solid('ruins','roof','ruin-gateway-lintel',[165.5,-46.9,-196.8],[186.5,-45.7,-193.2]);
 solid('ruins','roof','ruin-archive-roof',[181,-47.2,-235],[197,-45.8,-217]);
 // Continuous weathered shoulders follow the canyon bend. Their narrow,
 // uneven crests and broad talus feet replace the repeated rectangular slabs.
 // The central ten-metre half-width stays open for authored animals/routes.
 for(const side of [-1,1]){
  const rows=[],across=[0,.10,.22,.34,.48,.65,.82,1];
  for(let j=0;j<=40;j++){
   const z=-251-j*2.1,center=canyonX(z),phase=side===1?1.8:0;
   const foot=10.7+.55*Math.sin(z*.17+phase)+.28*Math.sin(z*.43),width=12.8+1.8*Math.sin(z*.09+phase);
   const length=ease((j/40)/.10)*(1-ease((j/40-.88)/.12)),crest=8.8+2.7*Math.sin(z*.18+phase)+1.1*Math.sin(z*.49+phase);
   rows.push(across.map(t=>{
    const x=center+side*(foot+width*t),base=ground(x,z),profile=Math.pow(Math.sin(Math.PI*t),.82)*(1.13-.32*t),y=base+length*crest*profile;
    return {bottom:[x,base-2.2,z],top:[x,Math.max(base-.12,y),z]};
   }));
  }
  rockGrid('abyss','abyss-shoulder-'+side,rows);
 }
 for(let i=0;i<padLocations.length;i++){
  const [x,z]=padLocations[i],y=canyonBed(z);
  solid('abyss','pad','abyss-pad-'+i,[x-1.2,y-.20,z-1.2],[x+1.2,y+.14,z+1.2]);
 }
 // p/ look are the actual readable face. stance is a clear viewing location;
 // root narrative adds device meshes and interaction state using these keys.
 function point(id,region,name,p,stance){points[id]={id,region,name,p,look:p.slice(),stance};}
 point('cave-strata','cave','側室礦脈',[-233.76,-26.1,-58],[-231.5,-26.1,-58]);
 point('cave-light','cave','天窗下的光井',[-217.6,-28.72,-47.5],[-217.6,-26.2,-45.7]);
 point('ruin-tablet','ruins','檔案室石刻',[183.25,-50.8,-229],[185.55,-50.8,-229]);
 point('ruin-dial','ruins','中庭潮汐盤',[175,-53.55,-211],[175,-51.1,-208.9]);
 for(let i=0;i<padLocations.length;i++){
  const [x,z]=padLocations[i],y=canyonBed(z),id=['abyss-upper','abyss-middle','abyss-lower'][i];
  point(id,'abyss',['裂谷上層觀測台','裂谷中層觀測台','裂谷深層觀測台'][i],[x,y+.14,z],[x,y+2.8,z+1.8]);
 }
 const floorPoint=(x,z,clear=3)=>[x,ground(x,z)+clear,z];
 routes.cave=[floorPoint(-208,-29),[-218,-26,-35],[-218,-26,-44],[-218,-26,-55],[-227,-26,-55],[-231.5,-26,-58],[-231.5,-26,-65],[-218,-26,-65],[-218,-26,-77],[-218,-26,-88],floorPoint(-218,-98,4)];
 routes.ruins=[floorPoint(176,-178,5),floorPoint(176,-188,4),[176,-51,-198],[176,-51,-209],[176,-51,-221],[176,-51,-212],[188,-51,-212],[188,-51,-221],[185.55,-51,-229],[188,-51,-221],[201,-51,-221],floorPoint(208,-218,4)];
 routes.abyss=[floorPoint(-156,-249,5),floorPoint(-156,-259,4),points['abyss-upper'].stance.slice(),floorPoint(-156,-281,3.8),points['abyss-middle'].stance.slice(),floorPoint(-148,-309,4),points['abyss-lower'].stance.slice()];
 const definitions=[
  {id:'cave',name:'玄紋海蝕洞',landmark:'cave',entrance:routes.cave[0].slice(),interior:[-231.5,-26,-58],floor:caveFloor,origin:[-222,-25,-61],mooring:'west',points:['cave-light','cave-strata']},
  {id:'ruins',name:'沉潮觀測遺址',landmark:'ruins',entrance:routes.ruins[0].slice(),interior:[188,-51,-228],courtyard:[175,-51,-211],floor:ruinFloor,origin:[176,-51,-215],mooring:'east',points:['ruin-dial','ruin-tablet']},
  {id:'abyss',name:'無光裂谷',landmark:'abyss',entrance:routes.abyss[0].slice(),interior:points['abyss-lower'].stance.slice(),floor:-94,origin:[-151,-81,-289],mooring:'offshore',points:['abyss-upper','abyss-middle','abyss-lower']}
 ];
 const landmarks=definitions.map(d=>({id:d.landmark,name:d.name,en:{cave:'BASALT GROTTO',ruins:'DROWNED OBSERVATORY',abyss:'THE UNLIT CANYON'}[d.id],x:d.entrance[0],y:d.entrance[1],z:d.entrance[2],spawn:d.entrance.slice(),yaw:0,pitch:-.12,radius:12,text:{cave:'穿過光井，沿礦脈尋找另一側的出口。',ruins:'斷柱圍著潮汐盤，石刻仍留在有頂的檔案室。',abyss:'三座觀測台沿裂谷下降，記下光消失的位置。'}[d.id],note:'原創空間與路線；遊戲位置，不是真實潛水路線。'}));
 // Small x/z buckets bound all normal camera/contact queries. min/max stays
 // public for conservative animal hull planning; it is never the final collision
 // shape for the curved geology.
 const tileSize=6,tiles=new Map();
 for(const s of solids)for(let x=Math.floor(s.min[0]/tileSize);x<=Math.floor(s.max[0]/tileSize);x++)for(let z=Math.floor(s.min[2]/tileSize);z<=Math.floor(s.max[2]/tileSize);z++){
  const key=x+','+z;if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(s);
 }
 function candidates(a,b=a,r=0){
  const x0=Math.floor((Math.min(a[0],b[0])-r)/tileSize),x1=Math.floor((Math.max(a[0],b[0])+r)/tileSize),z0=Math.floor((Math.min(a[2],b[2])-r)/tileSize),z1=Math.floor((Math.max(a[2],b[2])+r)/tileSize),out=new Set();
  if((x1-x0+1)*(z1-z0+1)>160){for(const [key,list]of tiles){const [x,z]=key.split(',').map(Number);if(x>=x0&&x<=x1&&z>=z0&&z<=z1)for(const s of list)out.add(s);}}
  else for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const s of tiles.get(x+','+z)||[])out.add(s);
  return out;
 }
 const boxPlanes=s=>[[1,0,0,s.max[0]],[-1,0,0,-s.min[0]],[0,1,0,s.max[1]],[0,-1,0,-s.min[1]],[0,0,1,s.max[2]],[0,0,-1,-s.min[2]]];
 for(const s of solids)if(!s.planes)s.planes=boxPlanes(s);
 function triangleClosest(p,a,b,c){
  const ab=V.sub(b,a),ac=V.sub(c,a),ap=V.sub(p,a),d1=V.dot(ab,ap),d2=V.dot(ac,ap);if(d1<=0&&d2<=0)return a;
  const bp=V.sub(p,b),d3=V.dot(ab,bp),d4=V.dot(ac,bp);if(d3>=0&&d4<=d3)return b;
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return V.add(a,V.mul(ab,d1/(d1-d3)));
  const cp=V.sub(p,c),d5=V.dot(ab,cp),d6=V.dot(ac,cp);if(d6>=0&&d5<=d6)return c;
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return V.add(a,V.mul(ac,d2/(d2-d6)));
  const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return V.add(b,V.mul(V.sub(c,b),(d4-d3)/(d4-d3+d5-d6)));
  const sum=va+vb+vc;if(Math.abs(sum)<1e-20)return a;return V.add(a,V.add(V.mul(ab,vb/sum),V.mul(ac,vc/sum)));
 }
 function closest(s,p){
  if(!s.faces){const q=p.map((n,i)=>Math.max(s.min[i],Math.min(s.max[i],n)));return {p:q,d:V.dist(p,q)};}
  let q=null,d=Infinity;for(const f of s.faces)for(let i=1;i<f.length-1;i++){const a=triangleClosest(p,f[0],f[i],f[i+1]),distance=V.dist(p,a);if(distance<d){d=distance;q=a;}}return {p:q,d};
 }
 function contains(s,p,r=0){
  if(!p.every((n,i)=>n>=s.min[i]-r-1e-8&&n<=s.max[i]+r+1e-8))return false;
  if(!s.planes.every(n=>n[0]*p[0]+n[1]*p[1]+n[2]*p[2]<=n[3]+r+1e-8))return false;
  return r===0||s.planes.every(n=>n[0]*p[0]+n[1]*p[1]+n[2]*p[2]<=n[3]+1e-8)||closest(s,p).d<=r+1e-8;
 }
 function pointBlocked(p,r=0){for(const s of candidates(p,p,r))if(contains(s,p,r))return true;return false;}
 function interval(s,a,d,r=0,near=0,far=1){
  let normal=null;
  for(let i=0;i<3;i++){
   if(Math.abs(d[i])<1e-10){if(a[i]<s.min[i]-r-1e-8||a[i]>s.max[i]+r+1e-8)return null;continue;}
   let lo=(s.min[i]-r-a[i])/d[i],hi=(s.max[i]+r-a[i])/d[i];if(lo>hi)[lo,hi]=[hi,lo];if(lo>=near){near=lo;normal=[0,0,0];normal[i]=-Math.sign(d[i]);}far=Math.min(far,hi);if(near>far+1e-9)return null;
  }
  for(const n of s.planes){const q=n[3]+r-(n[0]*a[0]+n[1]*a[1]+n[2]*a[2]),v=n[0]*d[0]+n[1]*d[1]+n[2]*d[2];
   if(Math.abs(v)<1e-10){if(q< -1e-8)return null;continue;}
   const t=q/v;if(v>0)far=Math.min(far,t);else if(t>=near){near=t;normal=n.slice(0,3);}if(near>far+1e-9)return null;
  }return [near,far,normal];
 }
 function segmentBlocked(a,b,r=.13){
  const d=V.sub(b,a);for(const s of candidates(a,b,r)){
   if(a.some((v,i)=>Math.max(v,b[i])<s.min[i]-r||Math.min(v,b[i])>s.max[i]+r))continue;
   const hit=sphereInterval(s,a,d,r);if(hit&&hit[1]>1e-8&&hit[0]<1-1e-8)return true;
  }return false;
 }
 // Plane expansion only supplies an inexpensive conservative entry bracket.
 // Closest-point advancement then gives the rounded sphere/actual-polyhedron
 // contact, avoiding false vertical barriers on internal triangulation seams.
 function sphereInterval(s,a,d,r){
  const bracket=interval(s,a,d,r);if(!bracket||r===0)return bracket;
  const speed=V.len(d);if(speed<1e-10)return contains(s,a,r)?bracket:null;
  let t=Math.max(0,bracket[0]);
  for(let i=0;i<36&&t<=Math.min(1,bracket[1])+1e-9;i++){
   const p=V.add(a,V.mul(d,t)),near=closest(s,p);
   if(near.d<=r+1e-6){const normal=near.d>1e-8?V.mul(V.sub(p,near.p),1/near.d):bracket[2];return [t,bracket[1],normal];}
   if(s.planes.every(n=>V.dot(n,p)<=n[3]))return [t,bracket[1],bracket[2]];
   t+=Math.max(1e-8,(near.d-r)/speed);
  }
  // Near-tangent approaches can converge too slowly for the fast iteration
  // budget. Distance to a convex solid along a line is convex: bracket its
  // minimum, then bisect the first contact rather than miss a grazing sweep.
  const end=Math.min(1,bracket[1]);if(t>end)return null;
  const distanceAt=u=>{const p=V.add(a,V.mul(d,u));return s.planes.every(n=>V.dot(n,p)<=n[3])?0:closest(s,p).d;};
  let lo=t,hi=end;for(let i=0;i<30;i++){const left=(2*lo+hi)/3,right=(lo+2*hi)/3;if(distanceAt(left)<distanceAt(right))hi=right;else lo=left;}
  const minimum=(lo+hi)*.5;if(distanceAt(minimum)>r+1e-7)return null;
  lo=t;hi=minimum;for(let i=0;i<26;i++){const mid=(lo+hi)*.5;if(distanceAt(mid)<=r)hi=mid;else lo=mid;}
  const p=V.add(a,V.mul(d,hi)),near=closest(s,p);return [hi,bracket[1],near.d>1e-8?V.mul(V.sub(p,near.p),1/near.d):bracket[2]];
 }
 function pathClear(a,b,r=.4){if(segmentBlocked(a,b,r))return false;const steps=Math.max(1,Math.ceil(Math.hypot(...a.map((v,i)=>v-b[i]))/.6));for(let i=0;i<=steps;i++){const u=i/steps,x=mixRegion(a[0],b[0],u),y=mixRegion(a[1],b[1],u),z=mixRegion(a[2],b[2],u);if(y<ground(x,z)+r)return false;}return true;}
 function slide(from,to,r){
  let p=from.slice(),move=V.sub(to,from);const contacts=[];
  const clip=velocity=>{
   const choices=[velocity,[0,0,0]];for(const n of contacts)choices.push(V.sub(velocity,V.mul(n,V.dot(velocity,n))));
   for(let i=0;i<contacts.length;i++)for(let j=i+1;j<contacts.length;j++){const edge=V.cross(contacts[i],contacts[j]);if(V.len(edge)>1e-5){const n=V.norm(edge);choices.push(V.mul(n,V.dot(velocity,n)));}}
   let best=[0,0,0],distance=V.len(velocity);for(const q of choices)if(contacts.every(n=>V.dot(q,n)>=-1e-8)){const d=V.dist(q,velocity);if(d<distance){best=q;distance=d;}}return best;
  };
  for(let attempt=0;attempt<5&&V.len(move)>1e-7;attempt++){
   const end=V.add(p,move);let earliest=1,normal=null;
   for(const s of candidates(p,end,r)){const hit=sphereInterval(s,p,move,r);if(hit&&hit[2]&&hit[1]>0&&hit[0]>=0&&hit[0]<earliest&&V.dot(move,hit[2])< -1e-9){earliest=hit[0];normal=hit[2];}}
   // Only moving divers supply `from`. Sliding down a curved side wall must
   // also respect the existing .82m diver-to-terrain clearance from app.collide.
   const clearance=Math.max(.82,r),steps=Math.max(1,Math.ceil(V.len(move)*earliest/.5));let previous=0;
   for(let i=1;i<=steps;i++){
    const t=earliest*i/steps,q=V.add(p,V.mul(move,t));
    if(q[1]<ground(q[0],q[2])+clearance){let lo=previous,hi=t;for(let n=0;n<15;n++){const mid=(lo+hi)*.5,a=V.add(p,V.mul(move,mid));if(a[1]<ground(a[0],a[2])+clearance)hi=mid;else lo=mid;}earliest=lo;const a=V.add(p,V.mul(move,lo)),h=.03;normal=V.norm([(ground(a[0]-h,a[2])-ground(a[0]+h,a[2]))/(2*h),1,(ground(a[0],a[2]-h)-ground(a[0],a[2]+h))/(2*h)]);break;}
    previous=t;
   }
   if(!normal){p=end;break;}
   const fraction=Math.max(0,earliest-.00015/V.len(move));p=V.add(p,V.mul(move,fraction));const remaining=V.mul(move,1-fraction);
   if(!contacts.some(n=>V.dot(n,normal)>.999999))contacts.push(normal);
   // Project onto the feasible contact cone, including every pair of crease
   // directions. Picking only the first two planes can stick at a mesh seam.
   move=clip(remaining);
  }
  return p;
 }
 function nearbySolids(p,r=0){return Array.from(candidates(p,p,r)).filter(s=>p.every((n,i)=>n>=s.min[i]-r&&n<=s.max[i]+r));}
 function resolve(p,r=.4,from=null){
  if(!p||p.length!==3||!p.every(Number.isFinite))return p;
  r=Math.max(0,Math.min(4,Number.isFinite(r)?r:.4));
  if(from?.length===3&&from.every(Number.isFinite)&&!pointBlocked(from,r))p.splice(0,3,...slide(from,p,r));
  if(!pointBlocked(p,r))return p;
  // Merge exact line/convex intersections, including overlapping roof ribs.
  // Escaping their union cannot oscillate between adjacent triangular columns.
  let best=null,distance=Infinity;
  for(let axis=0;axis<3;axis++){
   const dir=[0,0,0];dir[axis]=1;const spans=[];
   for(const s of solids){if([0,1,2].some(k=>k!==axis&&(p[k]<s.min[k]-r||p[k]>s.max[k]+r)))continue;const hit=interval(s,p,dir,r,-Infinity,Infinity);if(hit)spans.push(hit);}
   let lo=0,hi=0,changed=true;while(changed){changed=false;for(const span of spans)if(span[0]<=hi+1e-8&&span[1]>=lo-1e-8){if(span[0]<lo){lo=span[0];changed=true;}if(span[1]>hi){hi=span[1];changed=true;}}}
   for(const edge of [lo-.0001,hi+.0001]){const q=p.slice();q[axis]+=edge;if(axis===1&&edge>0)q[1]=Math.max(q[1],ground(q[0],q[2])+Math.min(r,.82)+.0001);const d=V.dist(q,p);if(d<distance&&!pointBlocked(q,r)&&q[1]>=ground(q[0],q[2])+Math.min(r,.82)){distance=d;best=q;}}
  }
  if(best)p.splice(0,3,...best);return p;
 }
 function ceilingAt(x,z,fromY=-Infinity){
  const a=[x,Number.isFinite(fromY)?fromY:-150,z],d=[0,150-a[1],0];let y=0;
  for(const s of candidates(a))if(s.role==='roof'){const hit=interval(s,a,d);if(hit&&hit[1]>0&&hit[0]>=0)y=Math.min(y,a[1]+hit[0]*d[1]);}return y;
 }
 function coverage(p){return ceilingAt(p[0],p[2],p[1])<0?1:0;}
 // Chisel-cut stone with true bevels. Plane faces stay aligned with collision
 // bounds; bevel recesses are at most 12 cm and stay inside those solid bounds.
 function masonry(g,s,color,bevel=.12){
  const center=s.min.map((v,i)=>(v+s.max[i])*.5),half=s.min.map((v,i)=>(s.max[i]-v)*.5),b=Math.min(bevel,...half.map(v=>v*.2));
  for(const [axis,u,v] of [[0,1,2],[1,2,0],[2,0,1]])for(const sign of [-1,1]){
   const us=[-half[u],-half[u]+b,half[u]-b,half[u]],vs=[-half[v],-half[v]+b,half[v]-b,half[v]];
   const at=(a,c)=>{const p=[0,0,0];p[axis]=sign*half[axis];p[u]=a;p[v]=c;const q=p.map((n,k)=>Math.max(-half[k]+b,Math.min(half[k]-b,n))),d=p.map((n,k)=>n-q[k]),len=Math.hypot(...d)||1,n=d.map(a=>a/len);return {p:q.map((a,k)=>center[k]+a+n[k]*b),n};};
   const shade=.86+.12*(axis===1&&sign>0?1:axis===0?.5:.1),col=color.map(c=>c*shade);
   for(let j=0;j<3;j++)for(let i=0;i<3;i++){const p=[at(us[i],vs[j]),at(us[i+1],vs[j]),at(us[i+1],vs[j+1]),at(us[i],vs[j+1])];g.tri(p[0].p,p[1].p,p[2].p,col,[p[0].n,p[1].n,p[2].n]);g.tri(p[0].p,p[2].p,p[3].p,col,[p[0].n,p[2].n,p[3].n]);}
  }
 }
 // Smooth shading joins the same rendered triangles whose planes collide.
 // Inner/outer/rim normals remain separate at an actual cave mouth or skylight.
 function geologicalMesh(geometry){
  const normals=new Map(),key=(f,p)=>f.region+':'+f.layer+':'+p.join(',');
  for(const f of rockFaces)for(const p of f.p){const k=key(f,p),n=normals.get(k)||[0,0,0];for(let i=0;i<3;i++)n[i]+=f.normal[i];normals.set(k,n);}
  for(const f of rockFaces){const g=geometry(f.region,f.role),color=f.region==='cave'?[.55,.62,.59]:[.44,.52,.57];
   const ns=f.p.map(p=>V.norm(normals.get(key(f,p)))),colors=f.p.map(p=>{const bed=p[1]+.16*p[0]+.055*p[2],strata=.94+.065*Math.sin(bed*2.0)+.035*Math.sin(bed*5.1),mineral=.98+.025*Math.sin(p[0]*.71+p[2]*.43);return color.map(c=>c*strata*mineral);});
   for(let i=1;i<f.p.length-1;i++){const ids=[0,i,i+1],cross=V.cross(V.sub(f.p[i],f.p[0]),V.sub(f.p[i+1],f.p[0]));if(V.dot(cross,f.normal)<0)ids.reverse();g.tri(...ids.map(n=>f.p[n]),color,ids.map(n=>ns[n]),ids.map(n=>colors[n]));}
  }
 }
 function build(renderer){
  const groups=new Map();
  const geometry=(region,role,material=2)=>{const key=region+':'+role;if(!groups.has(key)){const g=new Geometry();g.material=material;g.shadow=true;groups.set(key,{g,region,role});}return groups.get(key).g;};
  geologicalMesh(geometry);
  for(const s of solids){if(s.id.startsWith('cave-vault-')||s.id.startsWith('cave-remnant-')||s.id.startsWith('cave-chamber-remnant-')||s.id.startsWith('abyss-shoulder-'))continue;const color=s.region==='cave'?[.63,.69,.67]:s.region==='ruins'?[.70,.72,.60]:[.49,.56,.60];masonry(geometry(s.region,s.role),s,color,s.role==='column'?.06:.12);}
  const cave=geometry('cave','strata',0);
  // Actual layered mineral face attached to the west wall; not a hovering icon.
  cave.box([-233.94,-26.1,-58],[.36,2.0,3.0],[.42,.46,.43]);
  for(let i=0;i<9;i++){const y=-26.9+i*.20,shade=i%3===0?[.56,.54,.39]:[.37,.44,.43];cave.tube([-233.754,y,-59.35],[-233.754,y+.055*Math.sin(i*1.7),-56.65],.025,.032,shade,6);}
  const well=geometry('cave','light-well',2);
  well.tube([-217.6,-29,-47.5],[-217.6,-28.72,-47.5],.80,.65,[.69,.73,.65],24);
  // Three parallel cuts on the cap are the visible story clue. Four low stone
  // banks leave 8cm channels, 6cm deep; the entire relief fits inside the cap.
  for(const x of [-.33,-.11,.11,.33])masonry(well,{min:[-217.6+x-.07,-28.72,-47.96],max:[-217.6+x+.07,-28.66,-47.04]},[.72,.75,.66],.012);
  for(const x of [-.22,0,.22])well.box([-217.6+x,-28.719,-47.5],[.074,.002,.84],[.35,.40,.35]);
  const ruin=geometry('ruins','relief',0);
  ruin.box([183.08,-50.8,-229],[.34,2.15,2.85],[.65,.66,.53]);
  // A tide-and-moon relief made from protruding stone, readable by side light.
  for(let row=0;row<5;row++)for(let i=0;i<9;i++){const z=-230.18+i*.285,y=-51.6+row*.35+.06*Math.sin(i*.8+row);ruin.box([183.258,y,z],[.035,.045,.18],[.37,.43,.37]);}
  ruin.tube([175,-54,-211],[175,-53.55,-211],1.35,1.25,[.65,.68,.55],48);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,b=(i+.65)/24*Math.PI*2,p=t=>[175+Math.cos(t)*1.04,-53.537,-211+Math.sin(t)*1.04];ruin.tube(p(a),p(b),.012,.012,[.29,.36,.31],4);}
  ruin.box([175,-53.51,-211],[.10,.08,1.72],[.39,.45,.36]);
  // Broken masonry and geological strata support the large silhouettes without
  // invoking existing random coral generators or adding hidden animal spawns.
  let localSeed=0x3c72a11;const rnd=()=>((localSeed=(Math.imul(localSeed,1664525)+1013904223)>>>0)/4294967296);
  for(const def of definitions){const g=geometry(def.id,'fragments');for(let i=0;i<24;i++){
   const side=i%2?1:-1,z=def.origin[2]+(rnd()-.5)*(def.id==='abyss'?62:36),x=def.id==='abyss'?canyonX(z)+side*(17+rnd()*3):def.origin[0]+side*(def.id==='cave'?16:24),y=ground(x,z),w=.35+rnd()*.8,h=.13+rnd()*.24;
   masonry(g,{min:[x-w,y-.12,z-w*.7],max:[x+w,y+h,z+w*.7]},def.id==='abyss'?[.40,.48,.52]:[.58,.62,.53],.05);
  }}
  for(const {g,region,role} of groups.values()){
   const origin=definitions.find(d=>d.id===region).origin;
   for(let i=0;i<g.v.length;i+=12){g.v[i]-=origin[0];g.v[i+1]-=origin[1];g.v[i+2]-=origin[2];}
   const batch=renderer.batch(g,[{p:origin.slice()}]);batch.maxDistance=420;batch.sceneRole='region:'+region;batch.regionRole=role;
  }
 }
 function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
 freeze(definitions);freeze(points);freeze(landmarks);freeze(solids);freeze(routes);
 return Object.freeze({definitions,landmarks,points,solids,groundHeight:ground,ceilingAt,coverage,resolve,pointBlocked,segmentBlocked,pathClear,nearbySolids,route:id=>(routes[id]||[]).map(p=>p.slice()),build});
})();
const buildBeforeRegions=buildReef;
buildReef=function(renderer){buildBeforeRegions(renderer);OceanRegions.build(renderer);};
groundHeight=OceanRegions.groundHeight;
