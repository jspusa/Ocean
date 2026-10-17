/* Depth-stratified habitats on the continuous continental slope. Positions are
 * authored game geography; species no longer share the shallow rift showcase. */
const AbyssWorldRules={sites:{
 coelacanth:{homes:[[304,-216,-210],[305,-217,-249]],radius:1.8,habitat:'大陸坡岩礁邊緣；本海域約 216–217 m。'},
 giant_squid:{homes:[[390,-680,-170]],radius:3.0,habitat:'深海中層的開放水域；本海域約 680 m。'},
 pelican_eel:{homes:[[406,-1050,-65],[465,-1450,-220]],radius:1.0,habitat:'深海中下層的開放水域；本海域約 1,050–1,450 m。'},
 humpback_anglerfish:{homes:[[354,-580,-76],[416,-910,-218]],radius:.15,habitat:'光線微弱的深海中層；本海域約 580–910 m。靠近微光後可用微觀探索觀察。'},
 japanese_spider_crab:{homes:[[298,-220,-219],[300,-220,-241]],radius:.30,habitat:'大陸坡的砂泥底；本海域約 220 m，沿沉積台地緩慢行走。'}
}};
// Keep old chart indices stable; region entrances carry an actual underwater y.
for(const l of OceanRegions.landmarks)LANDMARKS.push({...l,y:l.spawn[1]});
for(const sp of ABYSS_SPECIES){sp.zone=sp.id==='japanese_spider_crab'?10:11;sp.habitat=AbyssWorldRules.sites[sp.id].habitat;}
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
