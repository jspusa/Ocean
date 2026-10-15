/* Runtime-only point selection. A screen hit never awards knowledge or moves the diver. */
const SelectionRules={
 begin(id,x,y,time,type){return {id,x,y,lastX:x,lastY:y,time,type,distance:0,cancelled:false};},
 move(g,x,y){g.distance=Math.max(g.distance,Math.hypot(x-g.x,y-g.y));g.lastX=x;g.lastY=y;},
 tap(g,time){return !g.cancelled&&time-g.time<=650&&g.distance<=(g.type==='touch'?9:5);}
};
const oceanSelection=(()=>{
 let selected=null,hovered=null,pointer=null,source=null,lastFollow=null,lastHover=-Infinity;
 const canvas=()=>$('ocean');
 const exclusive=()=>!!(typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing())||oceanFeatures.pointerCaptured()||!!(typeof oceanExploration!=='undefined'&&oceanExploration.penMode);
 const allowed=()=>active&&!modal&&!photoOpen&&!voyage.photoMode&&!document.hidden&&!document.body.classList.contains('cinematic');
 function valid(f,fromLife=false){
  if(!f||!f.uid||(!fromLife&&life.find(x=>x.uid===f.uid)!==f)||f.ecologyPresent===false||f.retreat>.8||(f.faunaVisibility??1)<.8)return false;
  const sp=SPECIES[f.species];if(!sp)return false;const point=animalFocusPoint(f),traits=speciesTraits(f.species),distance=V.dist(player.p,point),clearance=sp.fauna?.001:.13;
  if(distance>traits.observeDistance||V.dist(eye,point)>traits.observeDistance+V.dist(eye,player.p)+2||blocked(eye,point,clearance)||blocked(player.p,point,clearance))return false;
  const p=project(point,renderer.vp);return p.every(Number.isFinite)&&p[2]>0&&Math.abs(p[0])<1&&Math.abs(p[1])<1;
 }
 function disc(f){
  const bounds=canvas().getBoundingClientRect(),point=animalFocusPoint(f),p=project(point,renderer.vp),distance=Math.max(.005,V.dist(eye,point)),radius=speciesTraits(f.species).targetRadius;
  const physical=bounds.height*radius/(2*distance*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360));
  return {x:bounds.left+(p[0]*.5+.5)*bounds.width,y:bounds.top+(.5-p[1]*.5)*bounds.height,r:clamp(physical,matchMedia('(pointer:coarse)').matches?22:14,110),distance};
 }
 function pick(x,y){
  if(!allowed()||exclusive())return null;let best=null,score=Infinity;
  for(const f of life){if(!valid(f,true))continue;const d=disc(f),offset=Math.hypot(x-d.x,y-d.y);if(offset>d.r)continue;const value=offset/d.r+d.distance*.015;if(value<score){best=f;score=value;}}
  return best;
 }
 function clear(){selected=null;hovered=null;source=null;focusFish=null;focusId=null;focusSeconds=0;$('focusCard')?.classList.add('hidden');$('selectionMarker')?.classList.add('hidden');}
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
 function init(){const close=$('clearSelection');if(close)close.onclick=()=>{if(follow)stopAuto();clear();};}
 return {init,pick,select,target,observationTarget,clear,suspend,hover,paint,atPointer,valid,disc,allowed,exclusive,snapshot:()=>({uid:selected?.uid||null,source})};
})();
