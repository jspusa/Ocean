/* Bounded, authored habitats for the new fauna. Game positions are not surveys.
 * The same actors and mesh instances are used by the live and baked scene. */
const FaunaWorldRules=(()=>{
 const sites={
  pygmy_seahorse:{count:3,anchor:[-4,8],height:.57,support:'fan',radius:0},
  cinderella_slug:{count:4,anchor:[5,12],height:.101,support:'rock',radius:.04},
  garden_eel:{count:9,anchor:[-2,20],height:.006,support:'hole',radius:0},
  pistol_shrimp:{count:3,anchor:[9,1],height:.004,support:'burrow',radius:.07},
  frogfish:{count:3,anchor:[-11,-20],height:.101,support:'rock',radius:.07},
  lionfish:{count:3,anchor:[-98,-64],height:2.4,support:null,radius:1.4},
  cuttlefish:{count:3,anchor:[104,-82],height:1.2,support:null,radius:.8},
  // Keep the published home origin stable when the shell anatomy changes.
  // Collision/focus still use the current model's measured bounds.
  nautilus:{count:3,anchor:[-2,-82],height:2.6,originOffset:.455,support:null,radius:.6}
 };
 // Immutable version-1 upper-slope pockets. These western-Pacific species are
 // documented at these depths; abundance and routes are original game design.
 // Centers sit seaward of the real x>=260 trench triangles. Complete animated
 // envelopes are certified at dive preparation, never by a center-height test.
 const slopeHabitats=Object.freeze([
  {id:'slope-butterfly',species:'longnose_butterfly',count:2,radius:.32,bodyRadius:.22,bob:.072,phase:.37,homeYaw:0,offsets:[[0,0,-.32],[0,0,.32]],homes:[[272,-62,-180],[272,-62,-174],[272,-62,-186]]},
  {id:'slope-lionfish-a',species:'lionfish',count:1,radius:.28,bodyRadius:.40,bob:.0392,phase:1.1,homeYaw:Math.PI/2,offsets:[[0,0,0]],homes:[[277,-81,-176],[277,-81,-182],[277,-81,-170]]},
  {id:'slope-lionfish-b',species:'lionfish',count:1,optional:true,radius:.28,bodyRadius:.40,bob:.0392,phase:2.4,homeYaw:Math.PI/2,offsets:[[0,0,0]],homes:[[277,-82,-194],[277,-82,-200],[277,-82,-188]]}
 ].map(d=>Object.freeze({...d,homes:Object.freeze(d.homes.map(p=>Object.freeze(p))),offsets:Object.freeze(d.offsets.map(p=>Object.freeze(p)))})));
 const slopeByID=new Map(slopeHabitats.map(d=>[d.id,d]));
 const slopeReach=d=>Math.hypot(d.radius,d.radius*(d.species==='lionfish'?.52:.58),d.bob);
 function constrainSlopePoint(f,p){
  const d=slopeByID.get(f.slopeHabitat);if(!d)return p;
  const home=f.home,dx=p[0]-home[0],dy=p[1]-home[1],dz=p[2]-home[2],distance=Math.hypot(dx,dy,dz),reach=slopeReach(d);
  if(distance>reach){const w=reach/distance;p[0]=home[0]+dx*w;p[1]=home[1]+dy*w;p[2]=home[2]+dz*w;}return p;
 }
 function appendSlopeActors(sp,actors){
  for(const d of slopeHabitats){if(d.species!==sp.id)continue;
   for(let slot=0;slot<d.count;slot++){
    const home=d.homes[0].map((v,i)=>v+d.offsets[slot][i]),bounds=sp.modelBounds;
    const f={fauna:true,species:SPECIES.indexOf(sp),slopeHabitat:d.id,slopeSlot:slot,p:home.slice(),home,center:home.slice(),homeYaw:d.homeYaw,modelCenter:bounds.min.map((v,i)=>(v+bounds.max[i])*.5),floorOffset:speciesTraits(sp).floorOffset,s:[sp.size,sp.size,sp.size],radius:d.radius,height:2,phase:d.phase,orbit:d.phase,bob:d.phase,speed:.04,yaw:d.homeYaw,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};
    if(sp.reefFish)f.reefFish=true;
    actors.push(f);life.push(f);
   }
  }
 }
 // Match the actual near-ground triangle grid, rather than its analytic height
 // function. A few centimetres of interpolation error is visible at macro scale.
 function surfaceHeight(x,z){
  const span=64,N=22,startX=Math.floor((x+320)/span)*span-320,startZ=Math.floor((z+410)/span)*span-410;
  const u=(x-startX)/span*N,v=(z-startZ)/span*N,i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,d=span/N;
  const h00=groundHeight(startX+i*d,startZ+j*d),h10=groundHeight(startX+(i+1)*d,startZ+j*d),h11=groundHeight(startX+(i+1)*d,startZ+(j+1)*d),h01=groundHeight(startX+i*d,startZ+(j+1)*d);
  return a>=b?h00+(h10-h00)*a+(h11-h10)*b:h00+(h11-h01)*a+(h01-h00)*b;
 }
 function clearSite(x,z){
  const y=groundHeight(x,z);
  return obstacles.every(o=>o.p[1]+o.s[1]<y+.05||((x-o.p[0])/(o.s[0]+1.2))**2+((z-o.p[2])/(o.s[2]+1.2))**2>1);
 }
 function place(def,index){
  const angle=index*2.399963,r=index?1.3+Math.sqrt(index)*.7:0;
  const base=[def.anchor[0]+Math.cos(angle)*r,def.anchor[1]+Math.sin(angle)*r];
  for(let i=0;i<1200;i++){
   const a=i*2.399963,step=i?Math.sqrt(i)*.65:0,x=base[0]+Math.cos(a)*step,z=base[1]+Math.sin(a)*step;
   if(!clearSite(x,z))continue;
   if(!def.support)return [x,groundHeight(x,z),z];
   const y=surfaceHeight(x,z),extent=def.support==='rock'?.37:.12,tolerance=def.support==='rock'?.055:.006;
   const flat=[[-extent,0],[extent,0],[0,-extent],[0,extent]].every(([dx,dz])=>Math.abs(surfaceHeight(x+dx,z+dz)-y)<=tolerance);
   // Physical collision and lens visibility still use analytic terrain. Select
   // compatible patches so neither the animal nor its lens sits underground.
   if(flat&&y>=groundHeight(x,z)-.001&&y-groundHeight(x,z)<.06)return [x,y,z];
  }
  throw new Error('No clear habitat near '+def.anchor.join(','));
 }
 return {sites,place,clearSite,surfaceHeight,slopeHabitats,slopeReach,constrainSlopePoint,appendSlopeActors};
})();
function animalFocusPoint(f){
 if(!f?.fauna||!Array.isArray(f.modelCenter))return f.p.slice();
 const v=f.modelCenter.slice(),visibility=Number.isFinite(f.faunaVisibility)?f.faunaVisibility:1;
 if(speciesTraits(f.species).motion==='burrow')v[1]*=visibility;
 const pitch=f.pitch||0,x=(v[0]*Math.cos(pitch)-v[1]*Math.sin(pitch))*f.s[0],y=(v[0]*Math.sin(pitch)+v[1]*Math.cos(pitch))*f.s[1],z=v[2]*f.s[2],a=f.yaw||0;
 return [f.p[0]+Math.cos(a)*x+Math.sin(a)*z,f.p[1]+y,f.p[2]-Math.sin(a)*x+Math.cos(a)*z];
}
function faunaHabitatGeometry(type){
 const g=new Geometry();g.material=0;g.shadow=true;
 if(type==='hole'){
  for(let i=0;i<28;i++){const a=i/28*TAU,b=(i+1)/28*TAU,p=(t,r)=>[Math.cos(t)*r,.006,Math.sin(t)*r];g.quad(p(a,.012),p(a,.026),p(b,.026),p(b,.012),[.55,.49,.36]);g.tri([0,.004,0],p(b,.014),p(a,.014),[.075,.081,.06]);}
 }else if(type==='burrow'){
  // An opening and a low shelter; the actor's anterior points out of the entrance.
  g.sphere([-.023,.002,0],[.035,.003,.021],[.055,.059,.046],20,10);
  for(let i=0;i<10;i++){const a=i/10*Math.PI,b=(i+1)/10*Math.PI;g.tube([-.027,.002+Math.sin(a)*.018,Math.cos(a)*.024],[-.027,.002+Math.sin(b)*.018,Math.cos(b)*.024],.006,.006,[.52,.50,.41],7);}
 }else if(type==='rock'){
  g.material=2;
  // A broad contact surface with a broken rim and a buried base. The animals'
  // feet keep contact over their short crawl paths, including their own width.
  for(let i=0;i<64;i++){
   const a=i/64*TAU,b=(i+1)/64*TAU,at=(t,r,y)=>[Math.cos(t)*r,y,Math.sin(t)*r*.92],edge=t=>.345+.018*Math.sin(t*5)+.009*Math.sin(t*11),col=[.72,.73,.64];
   const p=at(a,.235,.10),q=at(b,.235,.10),r=at(a,edge(a),-.035),v=at(b,edge(b),-.035),low=at(a,edge(a)*.9,-.16),low1=at(b,edge(b)*.9,-.16);
   g.tri([0,.10,0],q,p,col);g.quad(p,q,v,r,col);g.quad(r,v,low1,low,col);
  }
 }
 return g;
}
const spawnBeforeFauna=addLife;
addLife=function(r){
 spawnBeforeFauna(r);
 const supports=new Map();
 for(const sp of FAUNA_SPECIES){
  const def=FaunaWorldRules.sites[sp.id];if(!def)continue;
  const index=SPECIES.indexOf(sp),high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[];
  for(let k=0;k<def.count;k++){
   const base=FaunaWorldRules.place(def,k),home=[base[0],base[1]+def.height+(def.originOffset??speciesTraits(sp).floorOffset)*sp.size,base[2]],yaw=k*.63;
   const modelCenter=high.modelBounds.min.map((n,i)=>(n+high.modelBounds.max[i])*.5);
   const f={fauna:true,species:index,p:home.slice(),home:home.slice(),homeYaw:yaw,floorOffset:speciesTraits(sp).floorOffset,modelCenter,center:home.slice(),s:[sp.size,sp.size,sp.size],yaw,pitch:0,phase:k*2.1,orbit:k*2.1,radius:def.radius,height:def.height,speed:.04,bob:k*1.7,retreat:0,faunaVisibility:1,tint:[1,1,1]};
   actors.push(f);life.push(f);
   if(def.support){if(!supports.has(def.support))supports.set(def.support,[]);supports.get(def.support).push({p:base.slice(),s:[1,1,1],yaw,phase:0});}
  }
  FaunaWorldRules.appendSlopeActors(sp,actors);
  const hi=r.batch(high,actors,8,true);hi.maxDistance=sp.traits.micro?3:12;
  const lo=r.batch(low,actors,8,true);lo.minDistance=hi.maxDistance;lo.maxDistance=sp.traits.micro?22:120;lo.shadow=false;
 }
 for(const [type,instances] of supports){
  if(type==='fan'){
   // A compact original host gorgonian, with the tiny animal on the upper branch.
   const g=new Geometry();g.material=0;
   for(let i=0;i<7;i++){if(i===3)continue;const x=(i-3)*.065;g.tube([0,0,0],[x,.34,0],.009,.005,[.39,.21,.24],6);g.tube([x,.34,0],[x*.65,.60,.004],.005,.003,[.61,.32,.39],6);}
   g.tube([0,0,0],[0,.50,0],.010,.003,[.58,.30,.36],7);g.tube([0,.50,0],[0,.574,0],.0012,.00035,[.64,.35,.41],7);
   const b=r.batch(g,instances,0,false);b.maxDistance=40;
  }else{const b=r.batch(faunaHabitatGeometry(type),instances,0,false);b.maxDistance=type==='rock'?60:20;}
 }
 allLife=life.concat(decorLife);
};
