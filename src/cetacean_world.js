/* Original authored open-water ranges. Coordinates are game metres, not surveys. */
const CetaceanWorldRules={
 common_dolphin:{anchor:[-78,-35],radius:18,depth:-8},
 white_sided_dolphin:{anchor:[-167,-105],radius:22,depth:-12},
 commerson_dolphin:{anchor:[-68,81],radius:13,depth:-7},
 orca:{anchor:[133,-223],radius:26,depth:-15},
 beluga:{anchor:[-145,44],radius:18,depth:-10},
 false_killer_whale:{anchor:[191,-93],radius:25,depth:-15},
 rissos_dolphin:{anchor:[39,-235],radius:22,depth:-17}
};
const spawnBeforeCetaceans=addLife;
addLife=function(r){
 spawnBeforeCetaceans(r);
 for(const sp of CETACEAN_SPECIES){
  const def=CetaceanWorldRules[sp.id],index=SPECIES.indexOf(sp),high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[];
  if(!def)throw Error('Missing cetacean range: '+sp.id);
  const hull=sp.size*(Math.max(.18,high.modelBounds.max[1],Math.abs(high.modelBounds.min[1]))+.17)+.15;
  for(let k=0;k<3;k++){
   const home=[def.anchor[0]+k*2,def.depth,def.anchor[1]+k*2];
   if(groundHeight(home[0],home[2])+hull+.35>=-hull-.12)throw Error('Cetacean range too shallow: '+sp.id);
   home[1]=clamp(home[1],groundHeight(home[0],home[2])+hull+.5,-hull-.3);
   const f={fauna:true,species:index,p:home.slice(),home:home.slice(),center:home.slice(),homeYaw:k*.3,modelCenter:high.modelBounds.min.map((n,i)=>(n+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],yaw:0,pitch:0,phase:k*2.1,orbit:k*2.1,radius:def.radius,height:0,speed:.1,bob:k*1.7,retreat:0,faunaVisibility:1,tint:[1,1,1]};
   life.push(f);actors.push(f);
  }
  const hi=r.batch(high,actors,9,true);hi.maxDistance=38;
  const lo=r.batch(low,actors,9,true);lo.minDistance=38;lo.maxDistance=210;lo.shadow=false;
 }
 allLife=life.concat(decorLife);
};
