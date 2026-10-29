/* The visible diver is longer than the first-person eye clearance. These eight
 * convex volumes cover every full production triangle, including the complete
 * kick/arm animation range. See diver-envelope-contract.cjs for the mesh proof.
 * Camera aim is independent: a blocked body turn never locks mouse/touch look. */
const OceanDiverContact=(()=>{
 const profile=Object.freeze([[-.8,.550],[-.4,.600],[0,.555],[.4,.457],[.8,.505],[1.2,.560],[1.6,.683],[2,.746]].map(([z,r])=>Object.freeze({z,r})));
 const margin=.035,epsilon=.00005;
 let previous=null,certificate=null,catalogue=null;
 const add=(a,b)=>a.map((v,k)=>v+b[k]),sub=(a,b)=>a.map((v,k)=>v-b[k]),mul=(a,s)=>a.map(v=>v*s),length=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
 const copy=p=>({p:p.p.slice(),yaw:p.yaw,pitch:p.pitch,scale:p.scale||.85});
 const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function volumes(pose){
  const scale=pose.scale||.85,cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
  // kind 5 applies negative player pitch then negative player yaw. Roll is
  // around this local Z axis and leaves every covering sphere invariant.
  return profile.map(({z,r})=>({p:add(pose.p,[-sy*cp*z*scale,-sp*z*scale,cy*cp*z*scale]),r:r*scale}));
 }
 function limits(p,r){
  const b=OceanTrench.worldBounds;
  return p[0]>=b.left+r&&p[0]<=b.right-r&&p[2]>=b.top+r&&p[2]<=b.bottom-r&&p[1]>=groundHeight(p[0],p[2])+r&&p[1]<=-.05-r&&!OceanTrench.groundContact(p,r)&&
   (typeof OceanRegions==='undefined'||!OceanRegions.pointBlocked(p,r));
 }
 function clear(pose,extra=0){return volumes(pose).every(s=>limits(s.p,s.r+extra)&&!OceanRockContact.overlaps(s.p,s.r+extra));}
 function certified(pose,arc=0){
  // Rock/region distance clearance is spatial; the height-field constraint is
  // not. A small horizontal step can reach a steep trench wall, so recheck it.
  return certificate&&volumes(pose).every((s,i)=>limits(s.p,s.r)&&s.r===certificate[i].r&&length(sub(s.p,certificate[i].p))+arc<=margin);
 }
 function remember(pose){
  previous=copy(pose);certificate=clear(pose,margin)?volumes(pose):null;return copy(pose);
 }
 function repair(pose){
  if(clear(pose))return copy(pose);
  const q=copy(pose),b=OceanTrench.worldBounds,offsets=volumes({...pose,p:[0,0,0]});
  for(let pass=0;pass<8;pass++){
   let moved=false;
   for(const offset of offsets){
    const s={p:add(q.p,offset.p),r:offset.r};
    const p=s.p.slice();p[0]=Math.max(b.left+s.r,Math.min(b.right-s.r,p[0]));p[2]=Math.max(b.top+s.r,Math.min(b.bottom-s.r,p[2]));
    p[1]=Math.max(groundHeight(p[0],p[2])+s.r+epsilon,Math.min(-.05-s.r-epsilon,p[1]));
    const floor=OceanTrench.groundContact(p,s.r);if(floor)for(let k=0;k<3;k++)p[k]+=floor.normal[k]*(floor.distance+epsilon);
    if(typeof OceanRegions!=='undefined')OceanRegions.resolve(p,s.r);
    OceanRockContact.resolve(p,s.r);
    const d=sub(p,s.p);if(length(d)>epsilon*.1){q.p=add(q.p,d);moved=true;}
   }
   if(clear(q))return q;if(!moved)break;
  }
  return null;
 }
 function sweep(a,b,extra=0){
  const start=volumes(a),end=volumes(b);let hit=null;
  for(let i=0;i<start.length;i++){
   const s=start[i],e=end[i],r=s.r+extra,rock=OceanRockContact.sweep(s.p,e.p,r);
   // A rotation's chord may point outward while the true arc first moves
   // inward. Its enlarged start must be clear; depenetration exceptions are
   // valid for straight translation only, not for this curved-path proof.
   if(extra>0&&(!limits(s.p,r)||OceanRockContact.overlaps(s.p,r)))return {fraction:0,normal:null};
   if(rock&&(!hit||rock.fraction<hit.fraction))hit=rock;
   const floor=OceanTrench.groundSweep(s.p,e.p,r);if(floor&&(!hit||floor.fraction<hit.fraction))hit=floor;
   if(typeof OceanRegions!=='undefined'&&OceanRegions.segmentBlocked(s.p,e.p,r)){
    let low=0,high=1;for(let j=0;j<12;j++){const mid=(low+high)*.5;if(OceanRegions.segmentBlocked(s.p,add(s.p,mul(sub(e.p,s.p),mid)),r))high=mid;else low=mid;}
    if(!hit||low<hit.fraction)hit={fraction:low,normal:null};
   }
  }
  return hit;
 }
 function translate(from,target){
  let q=copy(from),remaining=sub(target,from.p);
  for(let pass=0;pass<4&&length(remaining)>epsilon;pass++){
   const desired={...q,p:add(q.p,remaining)},hit=sweep(q,desired);
   if(!hit){q=desired;break;}
   const fraction=Math.max(0,hit.fraction-epsilon/length(remaining));q.p=add(q.p,mul(remaining,fraction));remaining=mul(remaining,1-fraction);
   if(!hit.normal)break;const into=dot(remaining,hit.normal);if(into<0)remaining=sub(remaining,mul(hit.normal,into));else break;
  }
  return q;
 }
 function reset(){previous=certificate=null;}
 function move(request,dt=1/60){
  if(catalogue!==OceanRockContact.catalogue()){reset();catalogue=OceanRockContact.catalogue();}
  const target=copy(request);
  if(!previous||target.scale!==previous.scale){
   const recovered=repair(target);
   if(recovered)return remember(recovered);
   // A crowded relocation must not discard the last verified body pose.
   return previous?copy(previous):null;
  }
  const speed=Math.max(0,Math.min(.1,dt))*2.8,dy=Math.max(-speed,Math.min(speed,angle(target.yaw-previous.yaw))),dp=Math.max(-speed,Math.min(speed,target.pitch-previous.pitch));
  if(length(sub(target.p,previous.p))<=epsilon&&dy===0&&dp===0)return copy(previous);
  const desired={...target,yaw:previous.yaw+dy,pitch:previous.pitch+dp};
  // The center path under yaw/pitch is curved. The bound also covers their
  // composition; inflate chord sweeps instead of checking rotation endpoints.
  const arc=2*target.scale*(Math.abs(dy)+Math.abs(dp))**2/8;
  if(certified(previous,arc)&&certified(desired,arc)){previous=copy(desired);return copy(desired);}
  let q=translate(previous,target.p);
  if(length(sub(q.p,previous.p))>epsilon){
   if(!clear(q)){const fixed=repair(q);q=fixed?translate(previous,fixed.p):copy(previous);if(!clear(q))q=copy(previous);}
  }else q=copy(previous);
  if(dy===0&&dp===0&&q.p.every((v,k)=>v===previous.p[k]))return copy(previous);
  const turn={...q,yaw:desired.yaw,pitch:desired.pitch},hit=sweep(q,turn,arc);
  const fraction=hit?Math.max(0,hit.fraction-.002):1;
  const rotated={...q,yaw:q.yaw+dy*fraction,pitch:q.pitch+dp*fraction};
  if(clear(rotated))q=rotated;
  return remember(q);
 }
 // Interpolation is optional. If its body crosses a corner, render the exact
 // physics pose instead; never independently push one visual limb or the eye.
 function renderPose(position){
  if(!previous)return null;const q={...previous,p:position.slice()};
  if(length(sub(q.p,previous.p))>.08)return copy(previous);
  return certified(q)||!sweep(previous,q)&&clear(q)?copy(q):copy(previous);
 }
 return Object.freeze({profile,volumes,move,renderPose,reset,snapshot:()=>previous?copy(previous):null});
})();
