/* Original deep-station populations. Added after all existing animals so their
 * ordering, deterministic identities and saved discoveries remain unchanged. */
const spawnBeforeTrench=addLife;
addLife=function(renderer){
 spawnBeforeTrench(renderer);
 for(const sp of TRENCH_SPECIES){
  const habitat=OceanTrench.habitats[sp.id],index=SPECIES.indexOf(sp),high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[];
  for(const [k,position] of habitat.homes.entries()){
   const body=high.modelBounds,scale=sp.size,home=position.slice(),bottom=Math.max(0,-body.min[1])*scale,top=Math.max(0,body.max[1])*scale;
   const crawl=sp.traits.motion==='crawl';if(crawl)home[1]=OceanTrench.floorAt(home[0],home[2],home[1]+.1)+bottom;
   const modelCenter=body.min.map((v,i)=>(v+body.max[i])*.5);
   const f={fauna:true,trench:true,species:index,p:home.slice(),home,center:home.slice(),homeYaw:k*.55,modelCenter,s:[scale,scale,scale],yaw:0,pitch:0,phase:k*2.1,orbit:k*2.1,radius:habitat.radius,height:0,speed:sp.motionProfile.speed,bob:k*1.7,retreat:0,faunaVisibility:1,habitatFloor:crawl?home[1]:home[1]-.55,habitatCeiling:crawl?home[1]+.025:home[1]+.55,tint:[1,1,1]};
   life.push(f);actors.push(f);
  }
  const hi=renderer.batch(high,actors,sp.renderKind||11,true);hi.maxDistance=10;
  const lo=renderer.batch(low,actors,sp.renderKind||11,true);lo.minDistance=hi.maxDistance;lo.maxDistance=70;lo.shadow=false;
 }
 // Append, never insert into incumbent per-species populations: UID counters,
 // saved encounters and the original six true-depth individuals stay stable.
 // These share existing high/low meshes and rigs at their original metre scale.
 for(const id of [...new Set(OceanTrench.encounters.map(e=>e.species))]){
  const sp=SPECIES.find(s=>s.id===id),index=SPECIES.indexOf(sp),high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[];
  for(const [k,e]of OceanTrench.encounters.filter(e=>e.species===id).entries()){
   const body=high.modelBounds,scale=sp.size,home=e.home.slice(),crawl=sp.traits.motion==='crawl',bottom=Math.max(0,-body.min[1])*scale;
   if(crawl)home[1]=OceanTrench.floorAt(home[0],home[2],home[1]+.1)+bottom;
   const f={fauna:true,trench:!!sp.trench,abyss:!!sp.abyss,encounterId:e.id,species:index,p:home.slice(),home,center:home.slice(),homeYaw:k*.55,modelCenter:body.min.map((v,i)=>(v+body.max[i])*.5),s:[scale,scale,scale],yaw:0,pitch:0,phase:k*2.1,orbit:k*2.1,radius:e.radius,height:0,speed:sp.motionProfile.speed,bob:k*1.7,retreat:0,faunaVisibility:1,habitatFloor:crawl?home[1]:home[1]-.55,habitatCeiling:crawl?home[1]+.025:home[1]+.55,tint:[1,1,1]};
   life.push(f);actors.push(f);
  }
  const hi=renderer.batch(high,actors,sp.renderKind||(sp.abyss?10:11),true);hi.maxDistance=sp.abyss?(id==='giant_squid'?50:22):10;
  const lo=renderer.batch(low,actors,sp.renderKind||(sp.abyss?10:11),true);lo.minDistance=hi.maxDistance;lo.maxDistance=sp.abyss?140:70;lo.shadow=false;
 }
 allLife=life.concat(decorLife);
};
