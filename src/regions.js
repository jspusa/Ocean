/* Original geological/architectural regions, in game metres, not surveyed sites.
 * The same immutable solids drive geometry, camera rays and collision in both
 * the generated and compiled worlds. No legacy random stream is consumed.
 * Loaded after open_world and fauna modules, before scene_cache. */
const OceanRegions=(()=>{
 const originalGround=groundHeight;
 const solids=[],points={},routes={};
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
 // Basalt fissure: two sea entrances, a continuous roof and a west chamber
 // reached through two separate openings around a central rock pier.
 for(const [id,min,max] of [
  ['east',[-214,-31,-84],[-210,-20,-38]],
  ['west-north',[-226,-31,-85],[-222,-20,-69]],
  ['west-south',[-226,-31,-51],[-222,-20,-38]],
  ['chamber-west',[-239,-31,-72],[-234,-20,-48]],
  ['chamber-north',[-234,-31,-73],[-222,-20,-69]],
  ['chamber-south',[-234,-31,-51],[-222,-20,-47]],
  ['partition',[-224,-31,-61.8],[-222,-20,-59.2]],
  ['chamber-pier',[-230,-29,-62.5],[-228.6,-22,-60.5]]
 ])solid('cave','wall','cave-'+id,min,max);
 for(const [id,min,max] of [
  ['north',[-226,-23,-85],[-210,-19.8,-49]],
  ['south',[-226,-23,-46],[-210,-19.8,-38]],
  ['skylight-west',[-226,-23,-49],[-219.5,-19.8,-46]],
  ['skylight-east',[-216.5,-23,-49],[-210,-19.8,-46]],
  ['chamber',[-239,-23,-73],[-222,-19.8,-47]]
 ])solid('cave','roof','cave-roof-'+id,min,max);
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
 // Canyon shoulders are separate rock masses with a clear central descent.
 // The terrain is excavated below them rather than hidden under a floor plane.
 for(let i=0;i<7;i++){
  const z=-259-i*10,x=canyonX(z),bed=canyonBed(z),rise=9+i*.7;
  for(const side of [-1,1]){
   const xx=x+side*(11.6+(i%2)*1.4),half=2.3+(i%3)*.5;
   solid('abyss','wall','abyss-buttress-'+i+'-'+side,[xx-half,bed-2,z-3.9],[xx+half,Math.min(-59,bed+rise),z+3.9]);
  }
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
 function contains(s,p,r=0){return p[0]>s.min[0]-r&&p[0]<s.max[0]+r&&p[1]>s.min[1]-r&&p[1]<s.max[1]+r&&p[2]>s.min[2]-r&&p[2]<s.max[2]+r;}
 function pointBlocked(p,r=0){return solids.some(s=>contains(s,p,r));}
 function segmentBlocked(a,b,r=.13){
  for(const s of solids){let near=0,far=1,hit=true;for(let k=0;k<3;k++){
   const d=b[k]-a[k],lo=s.min[k]-r,hi=s.max[k]+r;
   if(Math.abs(d)<1e-10){if(a[k]<=lo||a[k]>=hi){hit=false;break;}continue;}
   let x=(lo-a[k])/d,y=(hi-a[k])/d;if(x>y)[x,y]=[y,x];near=Math.max(near,x);far=Math.min(far,y);if(near>=far){hit=false;break;}
  }if(hit&&far>0&&near<1)return true;}return false;
 }
 function pathClear(a,b,r=.4){if(segmentBlocked(a,b,r))return false;const steps=Math.max(1,Math.ceil(Math.hypot(...a.map((v,i)=>v-b[i]))/.6));for(let i=0;i<=steps;i++){const u=i/steps,x=mixRegion(a[0],b[0],u),y=mixRegion(a[1],b[1],u),z=mixRegion(a[2],b[2],u);if(y<ground(x,z)+r)return false;}return true;}
 function resolve(p,r=.4){
  if(!p||p.length!==3||!p.every(Number.isFinite))return p;
  r=Math.max(0,Math.min(4,Number.isFinite(r)?r:.4));
  if(!pointBlocked(p,r))return p;
  // Merge overlapping intervals along each escape axis. A roof/wall junction
  // resolves out of the whole union, never oscillates between adjacent boxes.
  let best=null,distance=Infinity;
  for(let axis=0;axis<3;axis++){
   const spans=solids.filter(s=>[0,1,2].every(k=>k===axis||p[k]>s.min[k]-r&&p[k]<s.max[k]+r)).map(s=>[s.min[axis]-r,s.max[axis]+r]);
   let lo=p[axis],hi=p[axis],changed=true;while(changed){changed=false;for(const span of spans)if(span[0]<hi+1e-8&&span[1]>lo-1e-8){if(span[0]<lo){lo=span[0];changed=true;}if(span[1]>hi){hi=span[1];changed=true;}}}
   for(const edge of [lo-.0001,hi+.0001]){const q=p.slice();q[axis]=edge;const d=Math.abs(edge-p[axis]);if(d<distance&&!pointBlocked(q,r)&&q[1]>=ground(q[0],q[2])+Math.min(r,.82)){distance=d;best=q;}}
  }
  if(best)p.splice(0,3,...best);return p;
 }
 function ceilingAt(x,z,fromY=-Infinity){let y=0;for(const s of solids)if(s.role==='roof'&&x>=s.min[0]&&x<=s.max[0]&&z>=s.min[2]&&z<=s.max[2]&&s.min[1]>=fromY)y=Math.min(y,s.min[1]);return y;}
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
 // Eroded rock stays strictly inside the existing collision boxes. Roof edges
 // remain fixed, sealing adjoining slabs while the underside gains real relief.
 function rockwork(g,s,color){
  const center=s.min.map((n,i)=>(n+s.max[i])*.5),half=s.min.map((n,i)=>(s.max[i]-n)*.5),roof=s.role==='roof',abyss=s.region==='abyss',inner=center[0]<canyonX(center[2])?1:-1;
  let id=0;for(const c of s.id)id=(Math.imul(id,31)+c.charCodeAt(0))>>>0;const phase=(id%997)*.013,cell=abyss?1.15:1.35;
  const wave=(p,k)=>.5+.25*Math.sin(p[0]*.91+Math.sin(p[2]*.63)+phase+k)+.17*Math.sin(p[1]*3.4+p[2]*.39+p[0]*.28+k*.7)+.08*Math.sin(p[0]*2.2-p[2]*1.7+phase*.3-k);
  const coord=(axis,i,n)=>i===0?-half[axis]:i===n?half[axis]:-half[axis]+2*half[axis]*(i+.12*Math.sin(i*2.31+axis+phase))/n;
  for(const [axis,u,v] of [[0,1,2],[1,2,0],[2,0,1]])for(const sign of [-1,1]){
   const nu=Math.max(2,Math.ceil(half[u]*2/cell)),nv=Math.max(2,Math.ceil(half[v]*2/cell));
   const point=(a,b)=>{
    const p=[0,0,0];p[axis]=sign*half[axis];p[u]=a;p[v]=b;const world=p.map((n,i)=>n+center[i]);
    if(roof){const edge=ease((half[u]-Math.abs(a))/.7)*ease((half[v]-Math.abs(b))/.7),amplitude=axis===1&&sign>0?.06+.29*wave(world,axis):.025+.13*wave(world,axis);p[axis]-=sign*edge*amplitude;}
    else{
     // Swimmable canyon faces retain a <20cm match to collision. Stronger
     // rounding is confined to outer shoulders and their exposed top ridges.
     const protectedEdge=Math.max(ease((inner*p[0]/half[0]+.15)/1.15),ease((Math.abs(p[2])/half[2]-.72)/.28)),bevel=Math.min(abyss?mixRegion(1.15,.04,protectedEdge):.035,...half.map(n=>n*.42)),q=p.map((n,i)=>Math.max(-half[i]+bevel,Math.min(half[i]-bevel,n))),d=p.map((n,i)=>n-q[i]),len=Math.hypot(...d)||1;
     for(let i=0;i<3;i++){p[i]=q[i]+d[i]/len*bevel;const amount=abyss?(i===0&&p[0]*inner>0||i===2?.025+.125*wave(world,i):.20+.60*wave(world,i)):.025+.11*wave(world,i);p[i]-=p[i]/half[i]*amount;}
     // Preserve the mineral panel's attachment face rather than leave a plaque
     // hovering in front of an eroded recess.
     if(s.id==='cave-chamber-west'){const patch=1-ease(Math.hypot(Math.max(0,Math.abs(world[1]+26.1)-1.2),Math.max(0,Math.abs(world[2]+58)-1.6))/.65);if(world[0]>center[0])p[0]=mixRegion(p[0],half[0],patch);}
    }
    return p.map((n,i)=>center[i]+Math.max(-half[i],Math.min(half[i],n)));
   };
   const vertex=(a,b)=>{const p=point(a,b),du=V.sub(point(Math.min(half[u],a+.002),b),point(Math.max(-half[u],a-.002),b)),dv=V.sub(point(a,Math.min(half[v],b+.002)),point(a,Math.max(-half[v],b-.002)));let n=V.norm(V.cross(du,dv));if(n[axis]*sign<0)n=V.mul(n,-1);const band=.94+.055*Math.sin(p[1]*2.7+p[0]*.19+Math.sin(p[2]*.42)*.6)+.035*Math.sin(p[2]*1.4+p[0]*.7+phase);return {p,n,col:color.map(c=>c*band)};};
   const rows=Array.from({length:nv+1},(_,j)=>Array.from({length:nu+1},(_,i)=>vertex(coord(u,i,nu),coord(v,j,nv))));
   for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const p=[rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]];g.tri(p[0].p,p[1].p,p[2].p,color,[p[0].n,p[1].n,p[2].n],[p[0].col,p[1].col,p[2].col]);g.tri(p[0].p,p[2].p,p[3].p,color,[p[0].n,p[2].n,p[3].n],[p[0].col,p[2].col,p[3].col]);}
  }
 }
 function build(renderer){
  const groups=new Map();
  const geometry=(region,role,material=2)=>{const key=region+':'+role;if(!groups.has(key)){const g=new Geometry();g.material=material;g.shadow=true;groups.set(key,{g,region,role});}return groups.get(key).g;};
  for(const s of solids){const color=s.region==='cave'?[.63,.69,.67]:s.region==='ruins'?[.70,.72,.60]:[.49,.56,.60];if((s.region==='cave'||s.region==='abyss')&&(s.role==='wall'||s.role==='roof'))rockwork(geometry(s.region,s.role),s,color);else masonry(geometry(s.region,s.role),s,color,s.role==='column'?.06:.12);}
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
 return Object.freeze({definitions,landmarks,points,solids,groundHeight:ground,ceilingAt,coverage,resolve,pointBlocked,segmentBlocked,pathClear,route:id=>(routes[id]||[]).map(p=>p.slice()),build});
})();
const buildBeforeRegions=buildReef;
buildReef=function(renderer){buildBeforeRegions(renderer);OceanRegions.build(renderer);};
groundHeight=OceanRegions.groundHeight;
