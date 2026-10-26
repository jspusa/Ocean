/* One authored encounter beside the existing 900 m fault wall. This appends
 * only a population and shared meshes; it never rebuilds or moves terrain. */
const FrilledSharkWorld={encounter:{id:'frilled-shark-pass',species:'frilled_shark',home:[784,-900,-110],gate:[766,-900,-90],station:'slope',radius:2.8,guide:true}};
function frilledSharkMotionPose(f,time,out=f.p,context=null){
 const profile=SPECIES[f.species].motionProfile,home=f.home||f.center,phase=f.phase||0,exhibit=!!context?.exhibit;
 const radius=clamp(Number.isFinite(f.radius)?f.radius:profile.radius,0,exhibit?.65:profile.radius),omega=profile.speed/Math.max(.5,radius),a=time*omega+phase,yaw=f.homeYaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
 const x=Math.sin(a)*radius,z=Math.cos(a)*radius*.36,bob=exhibit?.045:.12;
 out[0]=home[0]+c*x+s*z;out[1]=home[1]+Math.sin(a*.53)*bob;out[2]=home[2]-s*x+c*z;
 // A narrow, slow circuit follows its own velocity. The shader supplies the
 // lateral tail wave; neither body direction nor the route follows the camera.
 const vx=Math.cos(a)*radius*omega,vz=-Math.sin(a)*radius*.36*omega,dx=c*vx+s*vz,dz=-s*vx+c*vz,dy=Math.cos(a*.53)*bob*.53*omega;
 f.yaw=Math.hypot(dx,dz)>.000001?Math.atan2(-dz,dx):yaw;f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.07,.07);
 f.bank=0;f.effort=.30;f.trenchBeat=profile.beat;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeFrilledShark=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){return SPECIES[f.species]?.id==='frilled_shark'?frilledSharkMotionPose(f,time,out,context):poseBeforeFrilledShark(f,time,out,context);};
function ensureFrilledShark(renderer){
 if(life.some(f=>f.frilledShark||SPECIES[f.species]?.id==='frilled_shark'))return false;
 const sp=SPECIES.find(s=>s.id==='frilled_shark'),e=FrilledSharkWorld.encounter,high=faunaGeometry(sp),low=faunaGeometry(sp,true),home=e.home.slice();
 const f={fauna:true,frilledShark:true,encounterId:e.id,species:SPECIES.indexOf(sp),p:home.slice(),home,center:home.slice(),homeYaw:Math.PI/2,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:e.radius,phase:.35,orbit:.35,bob:.35,height:0,speed:sp.motionProfile.speed,yaw:Math.PI/2,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};
 frilledSharkMotionPose(f,0);const actors=[f];life.push(f);
 const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=22;hi.sceneRole='frilled-shark-encounter';
 const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=120;lo.shadow=false;lo.sceneRole='frilled-shark-encounter';
 allLife=life.concat(decorLife);return true;
}
const spawnBeforeFrilledShark=addLife;
addLife=function(renderer){spawnBeforeFrilledShark(renderer);ensureFrilledShark(renderer);};
