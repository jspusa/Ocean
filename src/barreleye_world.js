/* One original 14 cm midwater encounter on the existing descent. The model,
 * population and motion append without changing baked terrain or earlier UIDs. */
const BarreleyeWorld={encounter:{id:'barreleye-pass',species:'barreleye',home:[768,-690,-96],gate:[766,-690,-90],station:'midwater',radius:.055,guide:true}};
function barreleyeMotionPose(f,time,out=f.p,context=null){
 const profile=SPECIES[f.species].motionProfile,home=f.home||f.center,phase=f.phase||0,yaw=f.homeYaw||0;
 const radius=clamp(Number.isFinite(f.radius)?f.radius:profile.radius,0,profile.radius),a=time*.06+phase,c=Math.cos(yaw),s=Math.sin(yaw);
 // An authored six-hundredths radian phase rate describes small hovering
 // corrections, not cruising speed. Exhibits use their own local home too.
 const x=Math.sin(a)*radius,z=Math.cos(a*.71)*radius*.4;
 out[0]=home[0]+c*x+s*z;out[1]=home[1]+Math.sin(a*.83)*profile.bob;out[2]=home[2]-s*x+c*z;
 f.yaw=yaw+Math.sin(a*.37)*.12;f.pitch=Math.sin(a*.51)*.035;f.bank=0;f.effort=.15;
 f.trenchBeat=profile.beat;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeBarreleye=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){return SPECIES[f.species]?.id==='barreleye'?barreleyeMotionPose(f,time,out,context):poseBeforeBarreleye(f,time,out,context);};
function ensureBarreleye(renderer){
 if(life.some(f=>f.barreleye||SPECIES[f.species]?.id==='barreleye'))return false;
 const sp=SPECIES.find(s=>s.id==='barreleye'),e=BarreleyeWorld.encounter,high=faunaGeometry(sp),low=faunaGeometry(sp,true),home=e.home.slice();
 const f={fauna:true,barreleye:true,encounterId:e.id,species:SPECIES.indexOf(sp),p:home.slice(),home,center:home.slice(),homeYaw:0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:e.radius,phase:.35,orbit:.35,bob:.35,height:0,speed:sp.motionProfile.speed,yaw:0,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};
 barreleyeMotionPose(f,0);const actors=[f];life.push(f);
 const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=4;hi.sceneRole='barreleye-encounter';
 const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=32;lo.shadow=false;lo.sceneRole='barreleye-encounter';
 allLife=life.concat(decorLife);return true;
}
const spawnBeforeBarreleye=addLife;
addLife=function(renderer){spawnBeforeBarreleye(renderer);ensureBarreleye(renderer);};
