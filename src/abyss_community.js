/* Two sparse, original encounters append to the existing continuous trench.
 * Fixed support and centimetre-scale hovering share the world/exhibit pose
 * boundary. No terrain regeneration, camera-following motion or extra pass. */
const AbyssCommunity={encounters:[
 {id:'tripod-fish-pass',species:'tripod_fish',home:[764,-2402,-112],gate:[766,-2400,-90],station:'hadal',radius:0,guide:true},
 {id:'dumbo-octopus-pass',species:'dumbo_octopus',home:[766,-3598.7,-114],homeYaw:-Math.PI/2,gate:[766,-3598,-90],station:'hadal',radius:.16,guide:true}
]};
function abyssCommunityMotionPose(f,time,out=f.p){
 const sp=SPECIES[f.species],home=f.home||f.center,profile=sp.motionProfile,phase=f.phase||0,yaw=f.homeYaw||0;
 if(sp.id==='tripod_fish'){
  // The three support rays remain planted. Only the sensory pectorals flex
  // in the vertex rig; neither the body nor the contact triangle walks/bobs.
  out[0]=home[0];out[1]=home[1];out[2]=home[2];f.yaw=yaw;
 }else{
  const radius=clamp(Number.isFinite(f.radius)?f.radius:profile.radius,0,profile.radius),a=time*.07+phase,x=Math.sin(a)*radius,z=Math.cos(a*.73)*radius*.40;
  out[0]=home[0]+Math.cos(yaw)*x+Math.sin(yaw)*z;out[2]=home[2]-Math.sin(yaw)*x+Math.cos(yaw)*z;
  out[1]=home[1]+Math.sin(a*.81)*profile.bob;f.yaw=yaw+Math.sin(a*.37)*.12;
 }
 f.pitch=0;f.bank=0;f.effort=.15;f.trenchBeat=profile.beat;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeAbyssCommunity=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){const id=SPECIES[f.species]?.id;return id==='tripod_fish'||id==='dumbo_octopus'?abyssCommunityMotionPose(f,time,out):poseBeforeAbyssCommunity(f,time,out,context);};
function ensureAbyssCommunity(renderer){
 let added=false;
 for(const e of AbyssCommunity.encounters){
  if(life.some(f=>f.encounterId===e.id||SPECIES[f.species]?.id===e.species))continue;
  const sp=SPECIES.find(s=>s.id===e.species),high=faunaGeometry(sp),low=faunaGeometry(sp,true),home=e.home.slice();
  if(e.species==='tripod_fish')home[1]=OceanTrench.floorAt(home[0],home[2],home[1]+.5);
  const f={fauna:true,abyssCommunity:true,encounterId:e.id,species:SPECIES.indexOf(sp),p:home.slice(),home,center:home.slice(),homeYaw:e.homeYaw||0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:e.radius,phase:.35,orbit:.35,bob:.35,height:0,speed:sp.motionProfile.speed,yaw:0,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};
  abyssCommunityMotionPose(f,0);const actors=[f];life.push(f);
  const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=6;hi.sceneRole='abyss-community';
  const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=45;lo.shadow=false;lo.sceneRole='abyss-community';added=true;
 }
 if(added)allLife=life.concat(decorLife);return added;
}
const spawnBeforeAbyssCommunity=addLife;
addLife=function(renderer){spawnBeforeAbyssCommunity(renderer);ensureAbyssCommunity(renderer);};
