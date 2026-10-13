/* Original miniature habitats, not a reconstruction of natural depth ranges. */
const AbyssWorldRules={sites:{
 coelacanth:{homes:[[-155,-72,-282],[-151,-81,-301]],radius:1.8},
 giant_squid:{homes:[[-151,-73,-310]],radius:3.0},
 pelican_eel:{homes:[[-153,-81,-298],[-146,-88,-318]],radius:1.0},
 humpback_anglerfish:{homes:[[-145,-88,-312],[-157,-77,-289]],radius:.15},
 japanese_spider_crab:{homes:[[166,-53.99,-221],[169,-53.99,-228]],radius:.30}
}};
// Keep old chart indices stable; region entrances carry an actual underwater y.
for(const l of OceanRegions.landmarks)LANDMARKS.push({...l,y:l.spawn[1]});
for(const sp of ABYSS_SPECIES)sp.zone=sp.id==='japanese_spider_crab'?10:11;
const spawnBeforeAbyss=addLife;
addLife=function(r){
 spawnBeforeAbyss(r);
 for(const sp of ABYSS_SPECIES){
  const def=AbyssWorldRules.sites[sp.id],index=SPECIES.indexOf(sp),high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[];
  for(const [k,home]of def.homes.entries()){
   const scale=sp.size,body=high.modelBounds,modelCenter=body.min.map((n,i)=>(n+body.max[i])*.5),bottom=Math.max(0,-body.min[1])*scale,top=Math.max(0,body.max[1])*scale;
   const floor=sp.traits.motion==='crawl'?groundHeight(home[0],home[2])+bottom:home[1]-.55;
   const ceiling=sp.traits.motion==='crawl'?floor+.02:Math.min(-1-top,home[1]+.55);
   const f={fauna:true,abyss:true,species:index,p:home.slice(),home:home.slice(),center:home.slice(),homeYaw:k*.6,modelCenter,s:[scale,scale,scale],yaw:0,pitch:0,phase:k*2.1,orbit:k*2.1,radius:def.radius,height:0,speed:sp.motionProfile.speed,bob:k*1.7,retreat:0,faunaVisibility:1,habitatFloor:floor,habitatCeiling:ceiling,tint:[1,1,1]};
   life.push(f);actors.push(f);
  }
  const hi=r.batch(high,actors,10,true);hi.maxDistance=sp.traits.micro?3:sp.id==='giant_squid'?50:22;
  const lo=r.batch(low,actors,10,true);lo.minDistance=hi.maxDistance;lo.maxDistance=sp.traits.micro?14:140;lo.shadow=false;
 }
 allLife=life.concat(decorLife);
};
