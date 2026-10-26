/* Exploration tools: authored salvage, persistent surveyed water and world-space ink.
 * Original objects and illustrations. Game coordinates, not a real dive survey.
 * GPU allocation is fixed at initialization; editing ink only changes instance data.
 */
const ExplorationRules=(()=>{
 const reefBounds={left:-285,right:285,top:-395,bottom:215},reefCols=30,rows=32;
 const bounds=typeof OceanTrench!=='undefined'&&OceanTrench.worldBounds?OceanTrench.worldBounds:reefBounds;
 const offshoreCols=Math.max(0,Math.ceil((bounds.right-reefBounds.right)/19)),cols=reefCols+offshoreCols,reefCells=reefCols*rows;
 const limits={strokes:48,points:64,segments:48*63,trail:1024,pickup:3.2,surveyRadius:25};
 const colors={mint:{name:'薄荷',hex:'#b5efd5',rgb:[.53,.91,.70]},amber:{name:'琥珀',hex:'#f5d080',rgb:[.98,.70,.24]},coral:{name:'珊瑚',hex:'#efa394',rgb:[.97,.40,.29]},blue:{name:'天空',hex:'#a8dcf5',rgb:[.41,.76,1]},white:{name:'珍珠',hex:'#edf4e4',rgb:[.96,.98,.84]}};
 const artifacts=[
  {id:'anchor_compass',name:'舊式航海羅盤',place:'anchorage',offset:[5,-8],shape:'compass',description:'一只失落的黃銅羅盤。外殼刻著研究船早期使用的潮汐記號；指針已停，歸途仍在。'},
  {id:'reef_ceramic',name:'青釉小罐',place:'garden',offset:[-4,9],shape:'jar',description:'薄薄的青色釉面仍藏在砂粒之下。瓶身上的海浪是這片原創海域的舊工坊紋樣。'},
  {id:'post_seal',name:'郵務封蠟章',place:'mailbox',offset:[6,3],shape:'seal',description:'木柄磨得圓潤，銅面刻著海燕。它曾為船上的信封留下一枚圓形印記。'},
  {id:'edge_scope',name:'折疊觀測鏡',place:'dropoff',offset:[8,5],shape:'scope',description:'一支被海水封住的折疊觀測鏡。綠色鏽痕沿著伸縮筒環生長，鏡片還映得出日光。'},
  {id:'valley_lantern',name:'風暴燈殼',place:'silence',offset:[7,7],shape:'lantern',description:'燈芯已消失，提環卻依然完整。原創航海故事裡，這種燈曾照亮研究船的夜間甲板。'},
  {id:'gate_medallion',name:'石門紀念章',place:'gate',offset:[-7,10],shape:'medallion',description:'厚實的紀念章上有一道拱門和六顆小星。這是船員留下的旅程紀念，不是古蹟或考古文物。'},
  {id:'channel_sextant',name:'小型六分儀',place:'wings',offset:[8,7],shape:'sextant',description:'黃銅弧面保留細小的刻線。這件原創道具記錄人們如何從星空尋找方向。'},
  {id:'wreck_bell',name:'眠海號船鐘',place:'wreck',offset:[-13,13],shape:'bell',description:'一座沉默的船鐘，邊緣可見磨損的船名。眠海號停止遠行後，鐘聲變成海裡的一段記憶。'},
  {id:'blue_capsule',name:'海流研究筒',place:'pelagic',offset:[12,10],shape:'capsule',description:'封閉的金屬研究筒，上面刻著手寫水流箭頭。遊戲裡的船員可把它放回收藏桌，接著記錄新的海。'}
 ];
 const ids=new Set(artifacts.map(a=>a.id)),finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
 const pointRegion=p=>!finitePoint(p)?null:typeof OceanTrench!=='undefined'&&OceanTrench.containsPosition(p)||p[0]>=reefBounds.left&&p[0]<=reefBounds.right&&p[1]>=-120&&p[1]<=-.18&&p[2]>=reefBounds.top&&p[2]<=reefBounds.bottom?'ocean':null;
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 // The first 960 IDs retain their original coordinates, preserving every old
 // survey cell without remapping a save. Eastern cells are appended after them.
 function cellBounds(i){const reef=i<reefCells,n=reef?i:i-reefCells,count=reef?reefCols:offshoreCols,left=reef?reefBounds.left:reefBounds.right,right=reef?reefBounds.right:bounds.right,width=(right-left)/count,height=(bounds.bottom-bounds.top)/rows,x=left+n%count*width,z=bounds.top+Math.floor(n/count)*height;return [x,z,x+width,z+height];}
 const center=i=>{if(i<reefCells)return [reefBounds.left+(i%reefCols+.5)/reefCols*(reefBounds.right-reefBounds.left),reefBounds.top+(Math.floor(i/reefCols)+.5)/rows*(reefBounds.bottom-reefBounds.top)];const [x,z,right,bottom]=cellBounds(i);return [(x+right)/2,(z+bottom)/2];};
 const eligible=i=>{if(i>=reefCells)return i<cols*rows;const [x,z]=center(i);return (x/268)**2+((z+90)/293)**2<=1;};
 const cells=Array.from({length:cols*rows},(_,i)=>i).filter(eligible),cellSet=new Set(cells);
 const initial=()=>({schema:1,survey:[],trail:[],found:[],collected:[],strokes:[],penColor:'mint',target:null,sequence:0});
 function sanitize(raw){
  const s=initial();if(!raw||typeof raw!=='object')return s;
  if(Array.isArray(raw.survey))s.survey=[...new Set(raw.survey.slice(0,cols*rows*2).filter(i=>Number.isInteger(i)&&cellSet.has(i)))];
  for(const key of ['found','collected'])if(Array.isArray(raw[key]))s[key]=[...new Set(raw[key].slice(0,64).filter(id=>ids.has(id)))];
  s.found=[...new Set([...s.found,...s.collected])];
  if(Array.isArray(raw.trail))for(const node of raw.trail.slice(-limits.trail)){
   if(!node||!pointRegion(node.p))continue;
   s.trail.push({p:node.p.map(n=>Math.round(n*10)/10),start:node.start===true||s.trail.length===0});
  }

  if(Object.hasOwn(colors,raw.penColor))s.penColor=raw.penColor;
  s.sequence=Number.isInteger(raw.sequence)&&raw.sequence>=0?Math.min(1e9,raw.sequence):0;
  const used=new Set();
  if(Array.isArray(raw.strokes))for(const stroke of raw.strokes.slice(-limits.strokes)){
   if(!stroke||!Number.isInteger(stroke.id)||stroke.id<1||stroke.id>1e9||used.has(stroke.id)||!Object.hasOwn(colors,stroke.color)||!Array.isArray(stroke.points))continue;
   const points=[];
   for(const p of stroke.points.slice(0,limits.points))if(pointRegion(p)&&(!points.length||dist(p,points.at(-1))>=.025&&dist(p,points.at(-1))<=24))points.push(p.map(n=>Math.round(n*1000)/1000));
   if(points.length<2)continue;used.add(stroke.id);s.strokes.push({id:stroke.id,color:stroke.color,points});s.sequence=Math.max(s.sequence,stroke.id);
  }
  const target=raw.target;
  if(target?.kind==='artifact'&&ids.has(target.id)&&s.found.includes(target.id)&&!s.collected.includes(target.id))s.target={kind:'artifact',id:target.id};
  if(target?.kind==='ink'&&s.strokes.some(stroke=>stroke.id===target.id))s.target={kind:'ink',id:target.id};
  return s;
 }
 function reveal(s,p,radius=limits.surveyRadius){
  if(!pointRegion(p)||!Number.isFinite(radius)||radius<=0)return 0;
  const known=new Set(s.survey),r=Math.min(35,radius),before=known.size;
  for(const i of cells){const c=center(i);if(Math.hypot(c[0]-p[0],c[1]-p[2])<=r)known.add(i);}
  if(known.size>before)s.survey=[...known];return known.size-before;
 }
 function recordTrail(s,p,start=false){
  if(!pointRegion(p))return false;
  const last=s.trail.at(-1),distance=last?dist(last.p,p):Infinity;
  if(last&&!start&&distance<4)return false;
  s.trail.push({p:p.map(n=>Math.round(n*10)/10),start:!last||start||distance>35});
  if(s.trail.length>limits.trail)s.trail.splice(0,s.trail.length-limits.trail);s.trail[0].start=true;return true;
 }
 function surveyStats(s){const count=s.survey.length,total=cells.length;return {count,total,percent:Math.min(100,Math.round(count/total*1000)/10)};}
 function canPickup(s,item,context){
  if(!item||!ids.has(item.id)||!finitePoint(item.p)||s.collected.includes(item.id)||!context.active||context.paused)return false;
  if(!finitePoint(context.player)||!finitePoint(context.eye)||dist(context.player,item.p)>limits.pickup)return false;
  return !context.blocked(context.player,item.p)&&!context.blocked(context.eye,item.p);
 }
 function collect(s,item,context){if(!canPickup(s,item,context))return false;s.collected.push(item.id);if(!s.found.includes(item.id))s.found.push(item.id);if(s.target?.kind==='artifact'&&s.target.id===item.id)s.target=null;return true;}
 function appendStroke(s,points,color){
  if(s.strokes.length>=limits.strokes||!Object.hasOwn(colors,color))return false;
  const candidate=sanitize({...s,strokes:[{id:s.sequence+1,color,points}]});if(candidate.strokes.length!==1)return false;
  const stroke=candidate.strokes[0];s.sequence=stroke.id;s.strokes.push(stroke);return stroke;
 }
 function segments(strokes){
  const lines=[];for(const stroke of strokes)for(let i=1;i<stroke.points.length;i++){
   const a=stroke.points[i-1],b=stroke.points[i],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=Math.hypot(dx,dy,dz);if(length<.025)continue;
   lines.push({p:a.slice(),s:[length,.022,.022],yaw:Math.atan2(-dz,dx),pitch:Math.asin(Math.max(-1,Math.min(1,dy/length))),tint:colors[stroke.color].rgb.slice()});
  }return lines.slice(0,limits.segments);
 }
 function screenRay(nx,ny,inverse){
  const point=z=>{const q=[nx,ny,z,1],r=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)r[row]+=inverse[col*4+row]*q[col];return r.slice(0,3).map(v=>v/r[3]);};
  const near=point(-1),far=point(1),len=dist(far,near);if(!finitePoint(near)||!finitePoint(far)||len<.0001)return null;
  return {origin:near,direction:far.map((v,i)=>(v-near[i])/len)};
 }
 function intersectPlane(ray,plane){if(!ray||!plane)return null;const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0),den=dot(ray.direction,plane.normal);if(Math.abs(den)<.05)return null;const length=dot(plane.point.map((n,i)=>n-ray.origin[i]),plane.normal)/den;if(length<.2||length>12)return null;return ray.origin.map((n,i)=>n+ray.direction[i]*length);}
 function segmentDistance(point,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,u=l?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/l)):0;return Math.hypot(point[0]-a[0]-u*dx,point[1]-a[1]-u*dy);}
 return {bounds,cols,rows,limits,colors,artifacts,initial,sanitize,reveal,recordTrail,surveyStats,canPickup,collect,appendStroke,segments,screenRay,intersectPlane,segmentDistance,center,cellBounds,eligible,cells,finitePoint,pointRegion};
})();

const oceanExploration=(()=>{
 const R=ExplorationRules;let initialized=false,items=[],inkBatch=null,penMode=null,draft=null,penPointer=null,penPlane=null,inkDirty=true,dirty=false,saveClock=0,currentPickup=null,lastState=null;
 const chartView={scale:1,x:0,y:0};
 const state=()=>oceanFeatures.state('exploration');
 function changed(){dirty=true;inkDirty=true;renderer.dirty=true;}
 function persistNow(){dirty=false;saveClock=0;saveVoyage();}
 function placeArtifact(def){
  const place=LANDMARKS.find(l=>l.id===def.place),base=[place.x+def.offset[0],place.z+def.offset[1]],restHeight=({scope:.52,capsule:.52,sextant:.49,compass:.53,medallion:.53})[def.shape]||.56;
  // Search authored destination surroundings for open sand, never inside collision rocks.
  for(let i=0;i<96;i++){
   const radius=i?1.6+Math.floor((i-1)/12)*1.7:0,angle=i*2.399963,x=base[0]+Math.cos(angle)*radius,z=base[1]+Math.sin(angle)*radius,y=groundHeight(x,z)+restHeight;
   const clear=obstacles.every(o=>((x-o.p[0])/(o.s[0]+1.05))**2+((y-o.p[1])/(o.s[1]+.85))**2+((z-o.p[2])/(o.s[2]+1.05))**2>1);
   if(clear)return [x,y,z];
  }
  const x=base[0],z=base[1];let y=groundHeight(x,z)+restHeight;
  for(const o of obstacles)if(Math.hypot((x-o.p[0])/o.s[0],(z-o.p[2])/o.s[2])<1.2)y=Math.max(y,o.p[1]+o.s[1]+restHeight);
  return [x,y,z];
 }
 function ring(g,r,y,color,thickness=.035){for(let i=0;i<28;i++){const a=i/28*TAU,b=(i+1)/28*TAU;g.tube([Math.cos(a)*r,y,Math.sin(a)*r],[Math.cos(b)*r,y,Math.sin(b)*r],thickness,thickness,color,6);}}
 function artifactGeometry(shape){
  const g=new Geometry();g.material=0;const brass=[.60,.43,.18],patina=[.20,.40,.34],dark=[.17,.22,.20],ceramic=[.39,.67,.59],ivory=[.72,.73,.56];
  if(shape==='jar'){
   g.sphere([0,-.16,0],[.37,.46,.37],ceramic,22,14);g.tube([0,.10,0],[0,.38,0],.23,.15,ceramic,24);ring(g,.16,.39,ivory,.025);g.tube([0,-.55,0],[0,-.47,0],.22,.27,dark,20);
   for(let s of [-1,1]){g.tube([s*.16,.30,0],[s*.40,.17,0],.048,.048,ceramic,8);g.tube([s*.40,.17,0],[s*.31,-.15,0],.048,.048,ceramic,8);}
  }else if(shape==='bell'){
   g.tube([0,-.54,0],[0,.28,0],.48,.19,brass,32);g.sphere([0,.25,0],[.20,.16,.20],patina,20,10);ring(g,.48,-.50,patina,.045);g.tube([0,.29,0],[0,.49,0],.07,.07,brass,10);g.sphere([0,-.44,0],[.09,.14,.09],dark,12,8);
  }else if(shape==='scope'||shape==='capsule'){
   g.tube([-.52,-.30,0],[.51,-.19,0],.17,.22,shape==='scope'?brass:patina,24);g.sphere([.52,-.19,0],[.035,.18,.18],dark,16,12);g.tube([-.54,-.30,0],[-.32,-.28,0],.21,.21,brass,24);g.box([-.06,-.38,0],[.32,.12,.39],dark);
  }else if(shape==='lantern'){
   g.tube([0,-.55,0],[0,-.43,0],.34,.34,brass,24);g.tube([0,.32,0],[0,.42,0],.24,.08,brass,24);g.sphere([0,-.05,0],[.20,.37,.20],[.53,.69,.60],20,12);
   for(let i=0;i<4;i++){const a=i/4*TAU;g.tube([Math.cos(a)*.25,-.48,Math.sin(a)*.25],[Math.cos(a)*.19,.33,Math.sin(a)*.19],.03,.025,patina,7);}g.tube([-.13,.40,0],[-.13,.62,0],.026,.026,brass,7);g.tube([.13,.40,0],[.13,.62,0],.026,.026,brass,7);g.tube([-.13,.62,0],[.13,.62,0],.026,.026,brass,7);
  }else if(shape==='sextant'){
   g.tube([-.43,-.43,-.23],[.39,-.43,-.23],.05,.05,brass,8);g.tube([-.43,-.43,-.23],[0,-.43,.43],.04,.04,patina,8);g.tube([.39,-.43,-.23],[0,-.43,.43],.04,.04,patina,8);g.tube([0,-.40,-.22],[0,-.40,.43],.03,.03,brass,8);g.box([0,-.32,.27],[.16,.13,.19],dark);for(let i=0;i<10;i++)g.box([-.36+i*.077,-.38,-.24],[.009,.05,.05],ivory);
  }else if(shape==='seal'){
   g.tube([0,-.55,0],[0,-.41,0],.28,.28,brass,24);g.tube([0,-.40,0],[0,.12,0],.10,.10,[.35,.24,.13],16);g.sphere([0,.18,0],[.19,.17,.19],[.37,.27,.16],20,12);ring(g,.21,-.40,patina,.018);
  }else{
   g.tube([0,-.52,0],[0,-.39,0],.44,.44,brass,32);g.tube([0,-.385,0],[0,-.37,0],.35,.35,shape==='compass'?ivory:patina,32);ring(g,.41,-.36,brass,.036);
   if(shape==='compass'){g.box([0,-.34,0],[.022,.02,.56],dark);g.box([0,-.335,0],[.43,.02,.018],dark);g.tri([-.035,-.31,0],[.035,-.31,0],[0,-.31,-.25],[.76,.32,.16]);}
   else{g.box([0,-.32,0],[.06,.03,.42],ivory);g.box([0,-.32,-.15],[.28,.03,.05],ivory);}
   for(let i=0;i<12;i++){const a=i/12*TAU;g.sphere([Math.cos(a)*.32,-.33,Math.sin(a)*.32],[.014,.012,.014],dark,6,4);}
  }
  return g;
 }
 function initGeometry(){
  items=R.artifacts.map((def,index)=>{const p=placeArtifact(def),batch=renderer.batch(artifactGeometry(def.shape),[{p,yaw:index*.61}],0,false);batch.maxDistance=48;return {...def,p,batch};});
  const penGeo=new Geometry();penGeo.material=0;penGeo.shadow=false;penGeo.tube([0,0,0],[1,0,0],1,1,[1,1,1],6);
  const capacity=Array.from({length:R.limits.segments},()=>({p:[0,-200,0],s:[.1,.01,.01]}));inkBatch=renderer.batch(penGeo,capacity,0,true);inkBatch.maxDistance=60;inkBatch.instances=[];inkBatch.drawCount=0;inkBatch.shadow=false;syncGeometry();
 }
 function syncGeometry(){
  const s=state();for(const item of items)item.batch.visible=!s.collected.includes(item.id);
  if(inkBatch&&inkDirty){const strokes=draft?.points.length>1?[...s.strokes,draft]:s.strokes;inkBatch.instances=R.segments(strokes);inkBatch.visible=inkBatch.instances.length>0;renderer.updateBatch(inkBatch);inkDirty=false;}
 }
 function targetPosition(){const s=state();if(s.target?.kind==='artifact')return items.find(a=>a.id===s.target.id&&!s.collected.includes(a.id))?.p||null;if(s.target?.kind==='ink')return s.strokes.find(a=>a.id===s.target.id)?.points[0]||null;return null;}
 function targetLabel(){const s=state();return s.target?.kind==='artifact'?items.find(a=>a.id===s.target.id)?.name:'水中筆記';}
 function pickupContext(){return {active,paused:!!modal||photoOpen||!!penMode,player:player.p,eye,blocked};}
 function nearestPickup(){const s=state(),context=pickupContext();return items.filter(item=>R.canPickup(s,item,context)).sort((a,b)=>V.dist(a.p,player.p)-V.dist(b.p,player.p))[0]||null;}
 function collectNearest(){
  const item=nearestPickup();if(!item)return false;
  if(!R.collect(state(),item,pickupContext()))return false;
  item.batch.visible=false;renderer.forceShadow=true;renderer.dirty=true;currentPickup=null;persistNow();paintHUD();oceanAudio.cue('found');toast('已打撈：'+item.name+' · 船上收藏已更新');return true;
 }
 function paintHUD(){
  const pickup=$('explorationPickup');if(!pickup)return;currentPickup=active&&!modal&&!photoOpen&&!penMode?nearestPickup():null;pickup.classList.toggle('hidden',!currentPickup);if(currentPickup){pickup.textContent='打撈 '+currentPickup.name+' · R';pickup.setAttribute('aria-label','打撈'+currentPickup.name);}
  const badge=$('explorationTarget'),p=targetPosition();badge.classList.toggle('hidden',!active||!!modal||photoOpen||!p||!!penMode||R.pointRegion(p)!==R.pointRegion(player.p));if(p&&active&&!modal){const q=project(p,renderer.vp),behind=q[2]<=0;badge.style.left=clamp((behind?-q[0]:q[0])*.5+.5,.12,.88)*100+'%';badge.style.top=clamp((behind?q[1]:-q[1])*.5+.5,.28,.70)*100+'%';badge.textContent=(behind?'↶ ':'◇ ')+targetLabel()+' · '+Math.round(V.dist(player.p,p))+' m';}
 }
 function tick(dt){
  if(penMode&&!penAllowed())setPen(null);
  const s=state();if(!active||modal||photoOpen)return;
  if(R.reveal(s,player.p))dirty=true;if(R.recordTrail(s,player.p))dirty=true;
  for(const item of items)if(!s.found.includes(item.id)&&V.dist(player.p,item.p)<18&&!blocked(eye,item.p)){
   const q=project(item.p,renderer.vp);if(q[2]>0&&Math.abs(q[0])<1&&Math.abs(q[1])<1){s.found.push(item.id);dirty=true;toast('發現可打撈物：'+item.name+' · 靠近後按 R');}
  }
  if(penMode){resetInput();player.velocity=[0,0,0];}
  saveClock+=dt;if(dirty&&saveClock>=5)persistNow();paintHUD();
 }
 function rayAt(event){const rect=renderer.canvas.getBoundingClientRect();return R.screenRay((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2,inverse4(renderer.vp));}
 function penPoint(event){const p=R.intersectPlane(rayAt(event),penPlane);if(!p||p[1]>=-.2||p[1]<groundHeight(p[0],p[2])+.09||blocked(eye,p))return null;return p;}
 function eraseAt(event){
  const s=state(),rect=renderer.canvas.getBoundingClientRect(),cursor=[event.clientX-rect.left,event.clientY-rect.top];let best=null,distance=26;
  for(const stroke of s.strokes)for(let i=1;i<stroke.points.length;i++){
   const a=stroke.points[i-1],b=stroke.points[i];if(V.dist(eye,a)>12||blocked(eye,a))continue;const p=project(a,renderer.vp),q=project(b,renderer.vp);if(p[2]<=0||q[2]<=0)continue;
   const d=R.segmentDistance(cursor,[(p[0]*.5+.5)*rect.width,(-p[1]*.5+.5)*rect.height],[(q[0]*.5+.5)*rect.width,(-q[1]*.5+.5)*rect.height]);if(d<distance){distance=d;best=stroke;}
  }
  if(!best)return false;s.strokes=s.strokes.filter(stroke=>stroke.id!==best.id);if(s.target?.kind==='ink'&&s.target.id===best.id)s.target=null;changed();persistNow();updatePenUI();return true;
 }
 function startStroke(event){
  if(penMode&&!penAllowed())setPen(null);
  if(!penMode||event.button>0)return;
  event.preventDefault();event.stopImmediatePropagation();if(penPointer!==null)return;resetInput();player.velocity=[0,0,0];penPointer=event.pointerId;oceanGamepadPointer.capture(renderer.canvas,event);
  if(penMode==='erase'){eraseAt(event);return;}
  if(state().strokes.length>=R.limits.strokes){toast('已達 48 筆上限，請先擦除或撤銷筆記。');return;}
  const normal=V.norm(V.sub(target,eye));penPlane={normal,point:V.add(eye,V.mul(normal,4))};const p=penPoint(event);draft=p?{id:state().sequence+1,color:state().penColor,points:[p]}:null;
 }
 function moveStroke(event){
  if(penMode&&!penAllowed())setPen(null);
  if(!penMode||penPointer!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();
  if(penMode==='erase'){eraseAt(event);return;}
  if(!draft||draft.points.length>=R.limits.points)return;const p=penPoint(event);if(!p)return;
  const previous=draft.points.at(-1),distance=V.dist(p,previous);if(distance<.075||blocked(previous,p))return;
  const steps=Math.min(8,Math.ceil(distance/.18),R.limits.points-draft.points.length);for(let i=1;i<=steps;i++)draft.points.push(V.lerp(previous,p,i/steps));inkDirty=true;renderer.dirty=true;
 }
 function finishStroke(event,cancel=false){
  if(event&&event.pointerId!==penPointer)return;if(event){event.preventDefault();event.stopImmediatePropagation();}
  const releasedPointer=penPointer;penPointer=null;
  if(releasedPointer!==null&&oceanGamepadPointer.hasCapture(renderer.canvas,releasedPointer))oceanGamepadPointer.release(renderer.canvas,releasedPointer);
  penPlane=null;if(draft&&!cancel&&draft.points.length>1){R.appendStroke(state(),draft.points,draft.color);dirty=true;}
  draft=null;inkDirty=true;renderer.dirty=true;if(dirty)persistNow();updatePenUI();
 }
 function penAllowed(){return active&&!modal&&!photoOpen&&!voyage.photoMode&&!document.body.classList.contains('cinematic');}
 function setPen(mode){
  if(mode&&(!active||modal&&modal!=='exploration')){toast('先開始潛水，再使用水中筆。');return false;}
  if(mode&&!['draw','erase'].includes(mode))return false;
  if(mode&&(photoOpen||voyage.photoMode||document.body.classList.contains('cinematic'))){toast('先離開攝影取景或觀賞模式，再使用水中筆。');return false;}
  if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();
  if(mode){if(modal)closePanel();if(typeof oceanEcology!=='undefined'){oceanEcology.setTool(null);if(oceanEcology.snapshot().grabbedUID)oceanEcology.toggleRide();}releaseMouseLook();stopAuto();resetInput();player.velocity=[0,0,0];}
  finishStroke(null,false);penMode=mode||null;document.body.classList.toggle('exploration-pen',!!penMode);$('explorationPenBar')?.classList.toggle('hidden',!penMode);renderer.canvas.style.cursor=penMode==='erase'?'cell':penMode?'crosshair':'';updatePenUI();paintHUD();return true;
 }
 function updatePenUI(){const dock=$('explorationPenBar');if(!dock)return;dock.querySelectorAll('[data-ink]').forEach(button=>{button.classList.toggle('selected',state().penColor===button.dataset.ink);button.setAttribute('aria-pressed',String(state().penColor===button.dataset.ink));});$('explorationErase').classList.toggle('selected',penMode==='erase');$('explorationErase').setAttribute('aria-pressed',String(penMode==='erase'));$('explorationInkCount').textContent=state().strokes.length+' / '+R.limits.strokes+' 筆';}
 function undo(){const s=state();if(!s.strokes.length)return;const last=s.strokes.pop();if(s.target?.kind==='ink'&&s.target.id===last.id)s.target=null;changed();persistNow();updatePenUI();}
 function initUI(){
  const css=document.createElement('style');css.id='explorationStyle';css.textContent=`
  .exploration-summary{display:flex;align-items:baseline;gap:12px;padding:6px 0 18px;border-bottom:1px solid var(--line)}.exploration-summary b{font:34px var(--mono);color:#dce6c9}.exploration-summary small{font-size:11px;color:#b0c9c7}.exploration-tabs{display:flex;gap:12px;margin:20px 0}.exploration-tabs button{min-height:44px;padding:9px 8px;border-bottom:1px solid transparent;font-size:12px}.exploration-tabs button.selected{border-color:#d6e4c7;color:#e3ebd5}.exploration-progress{height:3px;background:#b5cfc21d;margin:15px 0}.exploration-progress i{display:block;height:100%;background:#c7dcbc}.exploration-items{display:grid;gap:0}.exploration-item{padding:17px 0;border-bottom:1px solid var(--line)}.exploration-item header{display:flex;justify-content:space-between;gap:14px;align-items:center}.exploration-item h3{font:19px var(--serif);margin:0}.exploration-item p{font-size:12px;color:#b3cfc7;line-height:1.85}.exploration-item small{font-size:10px;color:#b7c9b3}.exploration-item button{min-height:44px;margin-top:7px}.exploration-item.unfound{opacity:.66}.exploration-ink-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.exploration-ink-row>i{width:13px;height:13px;display:block;border-radius:50%}.exploration-ink-row>span{font-size:11px;flex:1}.exploration-ink-row button{min-height:44px;font-size:11px}.exploration-mini-chart{width:100%;height:auto;aspect-ratio:600/530;border:1px solid var(--line);border-radius:3px;touch-action:none;cursor:grab}.exploration-mini-chart:active{cursor:grabbing}.exploration-zoom{display:flex;align-items:center;gap:9px;margin:12px 0}.exploration-zoom button{min-height:44px;min-width:44px;border:1px solid var(--line);border-radius:3px;padding:9px 12px;font-size:12px}.exploration-zoom output{min-width:54px;font:11px var(--mono);text-align:center}.exploration-zoom button:last-child{margin-left:auto}.exploration-legend{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#b0c8c2;margin:12px 0 22px}.exploration-pickup{position:absolute;left:50%;top:64%;transform:translateX(-50%);pointer-events:auto;max-width:85vw;font-size:11px}.exploration-target{position:absolute;transform:translate(-50%,-50%);text-shadow:0 2px 5px #021d29;color:#ecdcaf;font-size:11px;text-align:center;max-width:220px;pointer-events:none}.exploration-pen-bar{position:fixed;z-index:16;left:50%;top:105px;transform:translateX(-50%);padding:10px 12px;background:#052532f2;border:1px solid #bdd6c549;backdrop-filter:blur(10px);max-width:calc(100vw - 24px);width:390px;box-shadow:0 5px 30px #001a2930;border-radius:4px}.exploration-pen-bar>p{font-size:10px;color:#b4cec6;line-height:1.7;margin:0 0 8px}.exploration-pen-controls{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.exploration-pen-controls button{min-height:40px;min-width:40px;font-size:10px;border:1px solid #bcd6c52a;border-radius:3px;padding:6px}.exploration-pen-controls button.selected{border-color:#e0e9cc;background:#aac3ad21}.exploration-pen-controls button[data-ink]:before{content:'';display:block;width:17px;height:17px;border-radius:50%;margin:auto;background:var(--ink-color)}.exploration-pen-meta{display:flex;justify-content:space-between;align-items:center;font-size:9px;margin-top:8px;color:#c3d7ca}.exploration-pen-meta button{min-height:34px;font-size:11px;color:#e1e9d1}.exploration-pen #hud .objective-card,.exploration-pen #hud .view-tools,.exploration-pen #hud #lampBtn,.exploration-pen #hud #individualCard,.exploration-pen #hud #reticle,.exploration-pen #hud #focusCard,.exploration-pen #hud #joystick,.exploration-pen #hud #lookpad,.exploration-pen #hud #vertical{visibility:hidden;pointer-events:none!important}body.cinematic .exploration-pickup,body.cinematic .exploration-target{visibility:hidden} @media(pointer:coarse){.exploration-pen-bar{top:82px}.exploration-pen-controls button{min-width:38px;min-height:42px}.exploration-pickup{top:52%;padding:12px 15px;min-height:44px}.exploration-target{font-size:10px}}@media(max-height:550px) and (orientation:landscape){.exploration-pen-bar{top:71px;width:370px}.exploration-pen-bar>p{display:none}.exploration-pen-meta{margin-top:3px}.exploration-pickup{top:56%;min-height:42px;font-size:10px}}
  `;document.head.append(css);
  const pickup=document.createElement('button');pickup.id='explorationPickup';pickup.className='primary exploration-pickup hidden';pickup.onclick=collectNearest;$('hud').append(pickup);
  const marker=document.createElement('div');marker.id='explorationTarget';marker.className='exploration-target hidden';$('hud').append(marker);
  const dock=document.createElement('aside');dock.id='explorationPenBar';dock.className='exploration-pen-bar hidden';dock.setAttribute('aria-label','水中筆工具');dock.innerHTML='<p>拖曳留下固定在海裡的筆記。擦除會移除碰到的整筆；Esc 收起。</p><div class="exploration-pen-controls">'+Object.entries(R.colors).map(([key,c])=>`<button data-ink="${key}" style="--ink-color:${c.hex}" title="${c.name}" aria-label="${c.name}水中筆"></button>`).join('')+'<button id="explorationErase">擦除</button><button id="explorationUndo">撤銷</button></div><div class="exploration-pen-meta"><span id="explorationInkCount"></span><button id="explorationPenDone">完成 · 繼續潛水</button></div>';document.body.append(dock);
  dock.querySelectorAll('[data-ink]').forEach(button=>button.onclick=()=>{state().penColor=button.dataset.ink;penMode='draw';persistNow();updatePenUI();});$('explorationErase').onclick=()=>{finishStroke(null);penMode=penMode==='erase'?'draw':'erase';updatePenUI();};$('explorationUndo').onclick=undo;$('explorationPenDone').onclick=()=>setPen(null);
  const canvas=renderer.canvas;canvas.addEventListener('pointerdown',startStroke,true);canvas.addEventListener('pointermove',moveStroke,true);canvas.addEventListener('pointerup',event=>finishStroke(event),true);canvas.addEventListener('pointercancel',event=>finishStroke(event,true),true);canvas.addEventListener('lostpointercapture',event=>{if(penPointer===event.pointerId)finishStroke(event,true)},true);
  window.addEventListener('blur',()=>{if(penMode)finishStroke(null,true)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&penMode)finishStroke(null,true)});
  window.addEventListener('keydown',event=>{if(oceanKeyboard.reserved(event)||modal||photoOpen)return;if(penMode&&['KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyV','KeyC','KeyF'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();return;}if(active&&!penMode&&event.code==='KeyR'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();collectNearest();}},true);
 }
 let panelTab='chart';
 function renderPanel(type){
  if(type!=='exploration')return false;setPen(null);panelTitle('FIELD EXPLORATION','海圖・水中筆・打撈');const s=state(),survey=R.surveyStats(s);
  $('panelBody').innerHTML=`<div class="exploration-summary"><b>${survey.percent.toFixed(1)}%</b><small>已航行測記 · ${survey.count} / ${survey.total} 格</small></div><div class="exploration-progress"><i style="width:${survey.percent}%"></i></div><div class="exploration-tabs">${[['chart','探索海圖'],['ink','水中筆'],['salvage','打撈收藏']].map(([id,label])=>`<button data-explore-tab="${id}" class="${panelTab===id?'selected':''}">${label}</button>`).join('')}</div><div id="explorationBody"></div>`;
  $('panelBody').querySelectorAll('[data-explore-tab]').forEach(button=>button.onclick=()=>{panelTab=button.dataset.exploreTab;renderPanel('exploration');});
  const body=$('explorationBody');
  if(panelTab==='chart'){
   body.innerHTML='<p class="panel-note">你實際游過的水域會逐格亮起，航跡隨存檔保存。可放大並拖曳海圖；細線是走過的路，虛線是目的地方向。</p><canvas id="explorationChart" class="exploration-mini-chart" width="600" height="530" aria-label="已探索水域與遊戲目的地"></canvas><div class="exploration-zoom"><button id="explorationZoomOut" aria-label="縮小海圖">−</button><output id="explorationZoomValue" aria-live="polite">100%</output><button id="explorationZoomIn" aria-label="放大海圖">＋</button><button id="explorationZoomReset">完整海域</button></div><div class="exploration-legend"><span>深色：未測記 · 細線：航跡</span><span>◇：打撈物</span></div><div class="feature-toolbar"><button id="explorationFullMap" class="muted-btn">開啟海域地圖</button><button id="explorationClearTarget" class="muted-btn">清除工具標記</button></div>';
   const canvas=$('explorationChart');bindChart(canvas);drawPreview(canvas);$('explorationFullMap').onclick=()=>openPanel('map');$('explorationClearTarget').onclick=()=>{s.target=null;persistNow();renderPanel('exploration');};
  }else if(panelTab==='ink'){
   body.innerHTML='<p class="panel-note">在眼前約 4 公尺的位置，用手指或滑鼠畫下路標。線條會留在三維海域中，轉身、游遠或重新載入後仍在原位。每筆最多 64 個取樣點，最多保存 48 筆。</p><div class="feature-toolbar"><button id="explorationStartPen" class="primary">使用水中筆 ↗</button><button id="explorationStartErase" class="muted-btn">使用橡皮擦</button></div><p class="panel-note inset-note">'+(active?'描繪時先停止游動；完成後恢復操控。':'進入海中即可使用水中筆。')+'</p><div id="explorationInkList">'+(s.strokes.length?s.strokes.map(stroke=>`<div class="exploration-ink-row"><i style="background:${R.colors[stroke.color].hex}"></i><span>筆記 ${stroke.id} · 深度 ${(-stroke.points[0][1]).toFixed(1)} m</span><button data-ink-mark="${stroke.id}">標記位置 ↗</button></div>`).join(''):'<p class="empty">海裡還沒有留下筆記。</p>')+'</div>';
   $('explorationStartPen').disabled=!active;$('explorationStartErase').disabled=!active;$('explorationStartPen').onclick=()=>setPen('draw');$('explorationStartErase').onclick=()=>setPen('erase');body.querySelectorAll('[data-ink-mark]').forEach(button=>button.onclick=()=>markTarget('ink',+button.dataset.inkMark));
  }else{
   body.innerHTML=`<p class="panel-note">已帶回 ${s.collected.length} / ${R.artifacts.length} 件原創航海收藏。先在海中發現物件，靠近到 ${R.limits.pickup} 公尺內、確認沒有礁體遮擋，再按 R 或「打撈」。</p><div class="exploration-items">`+items.map(item=>{const collected=s.collected.includes(item.id),found=s.found.includes(item.id),place=LANDMARKS.find(l=>l.id===item.place);return `<article class="exploration-item ${found?'':'unfound'}"><header><h3>${found?item.name:'未發現的航海物件'}</h3><small>${collected?'已收藏':found?'已發現':'線索'}</small></header><p>${collected?item.description:found?'物件仍在海裡。前往標記，親自靠近並打撈。':'在'+place.name+'附近的海床仔細尋找。'}</p>${found&&!collected?`<button class="muted-btn" data-artifact-mark="${item.id}">標記 ${item.name} ↗</button>`:''}</article>`;}).join('')+'</div>';
   body.querySelectorAll('[data-artifact-mark]').forEach(button=>button.onclick=()=>markTarget('artifact',button.dataset.artifactMark));
  }
  return true;
 }
 function markTarget(kind,id){const s=state();if(!['artifact','ink'].includes(kind)||kind==='artifact'&&(!s.found.includes(id)||s.collected.includes(id))||kind==='ink'&&!s.strokes.some(stroke=>stroke.id===id))return;s.target={kind,id};persistNow();closePanel();paintHUD();toast('已標記 '+targetLabel()+' · 游向海中的菱形標誌');}
 function drawMap(ctx,w,h){
  const s=state(),known=new Set(s.survey);ctx.save();
  for(let i=0;i<R.cols*R.rows;i++){if(known.has(i))continue;const [left,top,right,bottom]=R.cellBounds(i),a=chartPoint(left,top,w,h),b=chartPoint(right,bottom,w,h);ctx.fillStyle=R.eligible(i)?'rgba(1,14,25,.89)':'rgba(1,12,21,.96)';ctx.fillRect(a[0],a[1],b[0]-a[0]+.5,b[1]-a[1]+.5);}
  ctx.strokeStyle='rgba(193,225,212,.72)';ctx.lineWidth=1.4;ctx.beginPath();
  for(const node of s.trail){const p=chartPoint(node.p[0],node.p[2],w,h);if(node.start)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();
  for(const stroke of s.strokes){ctx.strokeStyle=R.colors[stroke.color].hex;ctx.lineWidth=2;ctx.beginPath();stroke.points.forEach((p,i)=>{const q=chartPoint(p[0],p[2],w,h);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke();}
  for(const item of items)if(s.found.includes(item.id)&&!s.collected.includes(item.id)){const p=chartPoint(item.p[0],item.p[2],w,h);ctx.strokeStyle='#eed299';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p[0],p[1]-5);ctx.lineTo(p[0]+5,p[1]);ctx.lineTo(p[0],p[1]+5);ctx.lineTo(p[0]-5,p[1]);ctx.closePath();ctx.stroke();}
  const destination=targetPosition();if(destination&&R.pointRegion(destination)){const end=chartPoint(destination[0],destination[2],w,h),origin=active?player.p:voyage.state.resume?.p;if(origin){const start=chartPoint(origin[0],origin[2],w,h);ctx.strokeStyle='#f2d990';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...end);ctx.stroke();ctx.setLineDash([]);}ctx.strokeStyle='#f4e0a9';ctx.beginPath();ctx.arc(...end,9,0,TAU);ctx.stroke();}
  ctx.restore();
 }
 function drawPreview(canvas){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.save();ctx.clearRect(0,0,w,h);ctx.translate(chartView.x,chartView.y);ctx.scale(chartView.scale,chartView.scale);ctx.fillStyle='#153c45';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#c5dac024';for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(i*w/8,0);ctx.lineTo(i*w/8,h);ctx.moveTo(0,i*h/8);ctx.lineTo(w,i*h/8);ctx.stroke();}drawMap(ctx,w,h);
  oceanNavigation.feature.drawMap(ctx,w,h);ctx.font='11px sans-serif';for(const l of LANDMARKS){const p=chartPoint(l.x,l.z,w,h);ctx.fillStyle=voyage.state.visited.includes(l.id)?'#d4e9d0':'#90acae';ctx.beginPath();ctx.arc(...p,3.5,0,TAU);ctx.fill();ctx.fillText(l.name,p[0]+7,p[1]+3);}
  if(typeof OceanTrench!=='undefined'){const p=chartPoint(760,-90,w,h);ctx.fillStyle='#b9d5c6';ctx.fillText('海溝 · 700–7,000 m',p[0]+8,p[1]-9);}if(active){const p=chartPoint(player.p[0],player.p[2],w,h);ctx.save();ctx.translate(...p);ctx.rotate(player.yaw);ctx.fillStyle='#eef6e1';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,6);ctx.lineTo(5,6);ctx.closePath();ctx.fill();ctx.restore();}ctx.fillStyle='#b9d5c6';ctx.fillText('N ↑',w-35,20);ctx.restore();if($('explorationZoomValue'))$('explorationZoomValue').textContent=Math.round(chartView.scale*100)+'%';
 }
 function bindChart(canvas){
  const pointers=new Map();let drag=null,pinch=null,moved=false;
  const point=event=>{const r=canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*canvas.width,(event.clientY-r.top)/r.height*canvas.height]};
  const constrain=()=>{chartView.x=clamp(chartView.x,canvas.width*(1-chartView.scale),0);chartView.y=clamp(chartView.y,canvas.height*(1-chartView.scale),0);};
  const zoom=(factor,anchor=[canvas.width/2,canvas.height/2])=>{const old=chartView.scale,next=clamp(old*factor,1,4);chartView.x=anchor[0]-(anchor[0]-chartView.x)/old*next;chartView.y=anchor[1]-(anchor[1]-chartView.y)/old*next;chartView.scale=next;constrain();drawPreview(canvas);};
  const select=cursor=>{
   const world=[(cursor[0]-chartView.x)/chartView.scale,(cursor[1]-chartView.y)/chartView.scale];let closest=null,distance=18/chartView.scale;
   for(const item of items)if(state().found.includes(item.id)&&!state().collected.includes(item.id)){const p=chartPoint(item.p[0],item.p[2],canvas.width,canvas.height),d=Math.hypot(p[0]-world[0],p[1]-world[1]);if(d<distance){closest={kind:'artifact',id:item.id};distance=d;}}
   for(const l of LANDMARKS){const p=chartPoint(l.x,l.z,canvas.width,canvas.height),d=Math.hypot(p[0]-world[0],p[1]-world[1]);if(d<distance){closest={kind:'landmark',id:l.id};distance=d;}}
   if(closest?.kind==='artifact')markTarget('artifact',closest.id);else if(closest)markPlace(closest.id);
  };
  $('explorationZoomIn').onclick=()=>zoom(1.4);$('explorationZoomOut').onclick=()=>zoom(1/1.4);$('explorationZoomReset').onclick=()=>{chartView.scale=1;chartView.x=chartView.y=0;drawPreview(canvas);};
  canvas.addEventListener('wheel',event=>{event.preventDefault();zoom(Math.exp(-event.deltaY*.0016),point(event));},{passive:false});
  canvas.addEventListener('pointerdown',event=>{if(event.button>0)return;event.preventDefault();oceanGamepadPointer.capture(canvas,event);const p=point(event);pointers.set(event.pointerId,p);if(pointers.size===1){drag={p,x:chartView.x,y:chartView.y};moved=false;}else if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a[0]-b[0],a[1]-b[1]),scale:chartView.scale,x:chartView.x,y:chartView.y,center:[(a[0]+b[0])/2,(a[1]+b[1])/2]};moved=true;}});
  canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;event.preventDefault();const p=point(event);pointers.set(event.pointerId,p);if(pointers.size>=2&&pinch){const [a,b]=[...pointers.values()],center=[(a[0]+b[0])/2,(a[1]+b[1])/2],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);const scale=clamp(pinch.scale*distance/Math.max(1,pinch.distance),1,4);chartView.scale=scale;chartView.x=center[0]-(pinch.center[0]-pinch.x)/pinch.scale*scale;chartView.y=center[1]-(pinch.center[1]-pinch.y)/pinch.scale*scale;constrain();drawPreview(canvas);}else if(drag){const dx=p[0]-drag.p[0],dy=p[1]-drag.p[1];if(Math.hypot(dx,dy)>6)moved=true;if(moved){chartView.x=drag.x+dx;chartView.y=drag.y+dy;constrain();drawPreview(canvas);}}});
  const release=(event,cancel)=>{if(!pointers.has(event.pointerId))return;const p=point(event),tap=!moved&&!cancel&&pointers.size===1;pointers.delete(event.pointerId);if(oceanGamepadPointer.hasCapture(canvas,event.pointerId))oceanGamepadPointer.release(canvas,event.pointerId);if(pointers.size===1){const next=[...pointers.values()][0];drag={p:next,x:chartView.x,y:chartView.y};pinch=null;moved=true;}else if(!pointers.size){drag=null;pinch=null;}if(tap)select(p);};
  canvas.addEventListener('pointerup',event=>release(event,false));canvas.addEventListener('pointercancel',event=>release(event,true));canvas.addEventListener('lostpointercapture',event=>release(event,true));
 }
 function reset(){setPen(null);currentPickup=null;lastState=state();inkDirty=true;dirty=false;saveClock=0;syncGeometry();renderer.forceShadow=true;paintHUD();}
 const feature={id:'exploration',initial:R.initial,sanitize:R.sanitize,
  init(){if(initialized)return;initialized=true;initGeometry();initUI();lastState=state();oceanFeatures.addMenu({id:'exploration',label:'海圖・水中筆・打撈',panel:'exploration'});},
  startDive({resume}={}){setPen(null);if(R.reveal(state(),player.p))dirty=true;if(R.recordTrail(state(),player.p,!resume))dirty=true;syncGeometry();paintHUD();},endDive(){setPen(null);if(dirty)persistNow();paintHUD();},tick,
  afterLife(){if(!initialized)return;if(penMode&&!penAllowed())setPen(null);if(lastState!==state()){lastState=state();inkDirty=true;renderer.forceShadow=true;}syncGeometry();},
  panelChanged(){if(penMode)setPen(null);},
  renderPanel,drawMap,reset,pointerCaptured:()=>!!penMode&&penAllowed(),escape(){if(!penMode)return false;setPen(null);return true;}
 };
 return {feature,surveyStats:()=>R.surveyStats(state()),setPen,collectNearest,markTarget,get penMode(){return penMode},get chartView(){return {...chartView}},get mapTarget(){return targetPosition()?.slice()||null},listArtifacts:()=>items.map(item=>({id:item.id,name:item.name,place:item.place,p:item.p.slice(),visible:item.batch.visible,collected:state().collected.includes(item.id)})),get inkSegments(){return inkBatch?.instances.length||0}};
})();
oceanFeatures.register(oceanExploration.feature);
