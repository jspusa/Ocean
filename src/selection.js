/* Runtime-only point selection. A screen hit never awards knowledge or moves the diver. */
const SelectionRules={
 begin(id,x,y,time,type){return {id,x,y,lastX:x,lastY:y,time,type,distance:0,cancelled:false};},
 move(g,x,y){g.distance=Math.max(g.distance,Math.hypot(x-g.x,y-g.y));g.lastX=x;g.lastY=y;},
 tap(g,time){return !g.cancelled&&time-g.time<=650&&g.distance<=(g.type==='touch'?9:5);}
};
const oceanSelection=(()=>{
 let selected=null,hovered=null,pointer=null,source=null,lastFollow=null,lastHover=-Infinity,axisHits=new WeakMap();
 const canvas=()=>$('ocean');
 const exclusive=()=>!!(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())||oceanFeatures.pointerCaptured()||!!(typeof oceanExploration!=='undefined'&&oceanExploration.penMode);
 const allowed=()=>active&&!modal&&!photoOpen&&!voyage.photoMode&&!document.hidden&&!document.body.classList.contains('cinematic');
 function longAxis(f){
  const half=(SPECIES[f.species].bodyLength||1)*.5,pitch=f.pitch||0,yaw=f.yaw||0,x=Math.cos(pitch)*f.s[0]*half,y=Math.sin(pitch)*f.s[1]*half;
  const axis=[Math.cos(yaw)*x,y,-Math.sin(yaw)*x];
  // Clip before perspective division. An endpoint behind the eye must never
  // mirror onto the screen, nor reject the part that is still in visible water.
  const m=renderer.vp,ends=[-1,1].map(side=>{const point=V.add(f.p,V.mul(axis,side));return {point,clip:[0,1,2,3].map(r=>m[r]*point[0]+m[4+r]*point[1]+m[8+r]*point[2]+m[12+r])};});
  if(ends.some(a=>!a.clip.every(Number.isFinite)))return null;
  let start=0,end=1;
  for(const [component,sign]of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){
   const a=ends[0].clip[3]+sign*ends[0].clip[component],b=ends[1].clip[3]+sign*ends[1].clip[component];
   if(a<0&&b<0)return null;if(a<0)start=Math.max(start,a/(a-b));else if(b<0)end=Math.min(end,a/(a-b));
  }
  if(start>end)return null;
  const visible=[start,end].map(u=>{const point=V.lerp(ends[0].point,ends[1].point,u);return {point,p:project(point,renderer.vp),u};});
  return visible.every(a=>a.p.every(Number.isFinite)&&a.p[2]>0)?visible:null;
 }
 function projectedCandidate(f,fromLife=false){
  if(!f||!f.uid||(!fromLife&&life.find(x=>x.uid===f.uid)!==f)||f.assetReady===false||f.ecologyPresent===false||f.retreat>.8||(f.faunaVisibility??1)<.8)return null;
  const sp=SPECIES[f.species];if(!sp)return null;let point=animalFocusPoint(f);const traits=speciesTraits(f.species),distance=V.dist(eye,point);
  if(V.dist(player.p,point)>traits.observeDistance||distance>traits.observeDistance+V.dist(eye,player.p)+2)return null;
  const axis=sp.id==='oarfish'?longAxis(f):null;
  if(sp.id==='oarfish'){if(!axis)return null;point=V.lerp(axis[0].point,axis[1].point,.5);}
  const p=project(point,renderer.vp);if(!p.every(Number.isFinite)||p[2]<=0||!axis&&(Math.abs(p[0])>=1||Math.abs(p[1])>=1))return null;
  return {point,p,distance,traits,axis,animal:f,clearance:sp.fauna?.001:.13};
 }
 function clearSight(view){return !blocked(eye,view.point,view.clearance)&&!blocked(player.p,view.point,view.clearance);}
 function visibleView(view){
  if(!view)return null;if(!view.axis)return clearSight(view)?view:null;
  // A body may straddle a rock. Keep the marker on an exposed part without
  // allowing a click on the hidden part to borrow that line of sight.
  const [a,b]=view.axis,remembered=axisHits.get(view.animal),fraction=Number.isFinite(remembered)&&remembered>=a.u&&remembered<=b.u?(remembered-a.u)/Math.max(.000001,b.u-a.u):null;
  for(const u of [...(fraction===null?[]:[fraction]),.5,0,1,.25,.75,.125,.375,.625,.875]){
   const point=V.lerp(view.axis[0].point,view.axis[1].point,u),candidate={...view,point,p:project(point,renderer.vp)};
   if(V.dist(player.p,point)<=view.traits.observeDistance&&clearSight(candidate))return candidate;
  }
  return null;
 }
 function valid(f,fromLife=false){return !!visibleView(projectedCandidate(f,fromLife));}
 function disc(f,bounds=canvas().getBoundingClientRect(),view=null){
  if(!view&&SPECIES[f.species]?.id==='oarfish')view=visibleView(projectedCandidate(f));
  const point=view?view.point:animalFocusPoint(f),p=view?view.p:project(point,renderer.vp),distance=Math.max(.005,view?view.distance:V.dist(eye,point)),radius=(view?view.traits:speciesTraits(f.species)).targetRadius;
  // A narrow body capsule follows this ribbonfish's posed metre-scale axis.
  const bodyRadius=view?.axis?Math.max(...f.s)*.06:radius,physical=bounds.height*bodyRadius/(2*distance*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360));
  const screen=p=>({x:bounds.left+(p[0]*.5+.5)*bounds.width,y:bounds.top+(.5-p[1]*.5)*bounds.height});
  return {...screen(p),r:clamp(physical,matchMedia('(pointer:coarse)').matches?22:14,110),distance,...(view?.axis?{axis:view.axis.map(a=>({...screen(a.p),point:a.point,w:a.p[2],u:a.u}))}:{})};
 }
 function pick(x,y){
  if(!allowed()||exclusive())return null;let best=null,score=Infinity,bestAxis=null;
  const bounds=canvas().getBoundingClientRect();
  for(const f of life){const view=projectedCandidate(f,true);if(!view)continue;const d=disc(f,bounds,view);let dx=x-d.x,dy=y-d.y,hit=view,axisU=null;
   if(d.axis){const [a,b]=d.axis,vx=b.x-a.x,vy=b.y-a.y,u=clamp(((x-a.x)*vx+(y-a.y)*vy)/Math.max(.000001,vx*vx+vy*vy),0,1);dx=x-(a.x+vx*u);dy=y-(a.y+vy*u);
    // Screen interpolation is perspective-corrected before testing the real
    // world ray; otherwise an angled fish could be selected through a rock.
    const weight=(u/b.w)/((1-u)/a.w+u/b.w),point=V.lerp(a.point,b.point,weight);hit={...view,point};axisU=mix(a.u,b.u,weight);
    if(V.dist(player.p,point)>view.traits.observeDistance)continue;
   }
   const offset=Math.hypot(dx,dy);if(offset>d.r)continue;const value=offset/d.r+d.distance*.015;if(value<score&&clearSight(hit)){best=f;score=value;bestAxis=axisU;}}
  if(best&&bestAxis!==null)axisHits.set(best,bestAxis);
  return best;
 }
 function clear(){selected=null;hovered=null;source=null;axisHits=new WeakMap();focusFish=null;focusId=null;focusSeconds=0;$('focusCard')?.classList.add('hidden');$('selectionMarker')?.classList.add('hidden');}
 function select(uid,origin='pointer'){
  if(!allowed()||exclusive())return false;const f=life.find(x=>x.uid===uid);if(!valid(f))return false;
  if(origin!=='follow'&&auto)stopAuto();if(selected!==f){focusSeconds=0;focusId=null;}selected=f;source=origin;hovered=null;focusFish=f;paint();return true;
 }
 function target(){if(selected&&!valid(selected))clear();return selected;}
 function observationTarget(){
  if(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())return oceanMicrocosm.target();
  if(follow&&follow!==lastFollow&&valid(follow)){selected=follow;source='follow';focusId=null;focusSeconds=0;}lastFollow=follow;
  return target();
 }
 function hover(x,y){pointer={x,y};const now=performance.now();if(x>=0&&now-lastHover<50)return;lastHover=now;hovered=allowed()&&!exclusive()?pick(x,y):null;paint();}
 function suspend(){hovered=null;focusSeconds=0;focusId=null;$('selectionMarker')?.classList.add('hidden');$('focusCard')?.classList.add('hidden');}
 function paint(){
  const marker=$('selectionMarker');if(!marker)return;const f=allowed()&&!exclusive()?(target()||(settings.hints&&valid(hovered)?hovered:null)):null;
  marker.classList.toggle('hidden',!f);if(!f)return;const d=disc(f);marker.style.left=d.x+'px';marker.style.top=d.y+'px';marker.style.width=marker.style.height=Math.max(28,d.r*2)+'px';marker.classList.toggle('selected',f===selected);marker.dataset.state=f===selected?'selected':'hover';
  const text=$('selectionHint');if(text)text.textContent=f===selected?'':'點一下觀察';
 }
 function atPointer(){if(!allowed()||exclusive())return false;const r=canvas().getBoundingClientRect(),p=document.pointerLockElement===canvas()||!pointer?{x:r.left+r.width/2,y:r.top+r.height/2}:pointer;const f=pick(p.x,p.y);if(f)return select(f.uid,'key');clear();return false;}
 function atCenter(){if(!allowed()||exclusive())return false;const r=canvas().getBoundingClientRect(),f=pick(r.left+r.width/2,r.top+r.height/2);if(f)return select(f.uid,'key');clear();return false;}
 function init(){const close=$('clearSelection');if(close)close.onclick=()=>{if(follow)stopAuto();clear();};}
 return {init,pick,select,target,observationTarget,clear,suspend,hover,paint,atPointer,atCenter,valid,disc,allowed,exclusive,snapshot:()=>({uid:selected?.uid||null,source})};
})();
