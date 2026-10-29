/* Original creature interaction and dolphin-partner play. These are game mechanics,
 * not instructions for touching, feeding or riding real marine wildlife.
 * Six basic gestures and the three-command queue follow first-game contemporary
 * guides; exact unlock thresholds are authored. See WII-PARTNER-REFERENCE.md. */
const oceanEcology=(()=>{
 'use strict';
 const TRICKS={jump:{name:'躍出水面',duration:3.8,legacy:true},spin:{name:'旋轉跳躍',duration:4.2},frontflip:{name:'前空翻',duration:4.5},backflip:{name:'後空翻',duration:4.5},tailwalk:{name:'尾行',duration:5.2},sing:{name:'鳴唱',duration:4.6},handshake:{name:'握鰭',duration:4.2},doublefrontflip:{name:'雙前空翻',duration:5,base:'frontflip',level:3},doublebackflip:{name:'雙後空翻',duration:5,base:'backflip',level:3},corkscrew:{name:'螺旋跳躍',duration:5,base:'spin',level:3},triplefrontflip:{name:'三連前空翻',duration:5.8,base:'frontflip',level:5},triplebackflip:{name:'三連後空翻',duration:5.8,base:'backflip',level:5},supercorkscrew:{name:'超級螺旋跳躍',duration:5.8,base:'spin',level:5}};
 const profile=f=>typeof partnerTraits==='function'?partnerTraits(f.species):f.species===11?{mouth:[1.8,-.04,0],fin:[0,-.14,.65],ride:[-1.35,.45,0],length:4,swimSpeed:3.7,approachSpeed:12,turnRate:1}:null;
 const mastery=raw=>Object.fromEntries(Object.keys(TRICKS).map(k=>[k,Math.floor(num(raw?.[k],5))]));
 const initial=()=>({schema:2,field:{},individuals:{},partners:[],released:[],selected:null,accompany:false,dives:0});
 const runtime={tool:null,target:null,gesture:null,now:0,lastTime:null,food:[],foodBatch:null,foodNodes:[],reactions:new Map(),partnerPos:null,partnerUID:null,riding:false,grabbedUID:null,training:null,encounter:null,lastObserved:new Map(),lastStroke:new Map(),lastTap:new Map(),lastContact:new Map(),lastFeed:-100,uiClock:0,initialized:false};
 const num=(n,max=1e6)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
 const species=id=>SPECIES.find(s=>s.id===id);
 const partnerUID=uid=>knownUID(uid)&&!!profile(life.find(f=>f.uid===uid));
 const knownUID=uid=>typeof uid==='string'&&/^[a-z][a-z_]*-\d{3}$/.test(uid)&&life.some(f=>f.uid===uid&&SPECIES[f.species]?.id===uid.replace(/-\d{3}$/,''));
 const cleanName=name=>String(name||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'海之友';
 function sanitize(raw){
  const out=initial();if(!raw||typeof raw!=='object')return out;
  out.dives=Math.floor(num(raw.dives,100000));
  for(const sp of SPECIES){const r=raw.field?.[sp.id];if(r&&typeof r==='object')out.field[sp.id]={points:num(r.points,999),seconds:num(r.seconds,99999),encounters:Math.floor(num(r.encounters,9999)),photos:Math.floor(num(r.photos,9999))};}
  for(const [uid,r] of Object.entries(raw.individuals||{}).slice(0,600)){if(!knownUID(uid)||!r||typeof r!=='object')continue;out.individuals[uid]={trust:num(r.trust,100),strokes:Math.floor(num(r.strokes,9999)),feeds:Math.floor(num(r.feeds,9999)),seconds:num(r.seconds,99999)};}
  const seen=new Set();for(const p of Array.isArray(raw.partners)?raw.partners:[]){if(!p||!partnerUID(p.uid)||seen.has(p.uid)||out.partners.length>=3)continue;seen.add(p.uid);out.partners.push({uid:p.uid,name:cleanName(p.name),mastery:mastery(p.mastery),lastPerformance:p.lastPerformance?{height:num(p.lastPerformance.height,20),duration:num(p.lastPerformance.duration,120),count:Math.floor(num(p.lastPerformance.count,5))}:null});}
  out.released=[...new Set((Array.isArray(raw.released)?raw.released:[]).filter(uid=>partnerUID(uid)&&!seen.has(uid)))].slice(0,100);
  out.selected=seen.has(raw.selected)?raw.selected:out.partners[0]?.uid||null;out.accompany=!!out.selected&&raw.accompany===true;return out;
 }
 const state=()=>oceanFeatures.state('ecology');
 const node=id=>typeof document==='undefined'?null:document.getElementById(id);
 const save=()=>saveVoyage();
 const say=s=>{if(typeof toast==='function')toast(s);};
 const fishByUID=uid=>life.find(f=>f.uid===uid);
 const contactOrigin=f=>typeof animalContactOrigin==='function'?animalContactOrigin(f):f.p;
 const contactIntent=(f,intent)=>{if(typeof setAnimalContactIntent==='function')setAnimalContactIntent(f,intent);};
 const individual=f=>state().individuals[f.uid]||(state().individuals[f.uid]={trust:0,strokes:0,feeds:0,seconds:0});
 const field=f=>{const id=SPECIES[f.species].id;return state().field[id]||(state().field[id]={points:0,seconds:0,encounters:0,photos:0});};
 const partner=()=>state().partners.find(p=>p.uid===state().selected)||null;
 const knowledge=r=>!r||r.points<4?0:r.points>=30&&r.encounters>=3?3:r.points>=14&&r.encounters>=2?2:1;
 function addKnowledge(f,points){const r=field(f),old=knowledge(r);r.points=Math.min(999,r.points+points);const level=knowledge(r);if(level>old){say(SPECIES[f.species].name+' · 觀察筆記第 '+level+' 層');if(!persistent.seen.includes(SPECIES[f.species].id)){persistent.seen.push(SPECIES[f.species].id);if(typeof setCount==='function')setCount();}}}
 const inResearchVehicle=()=>typeof oceanDeepsea!=='undefined'&&oceanDeepsea.isActive();
 const playAllowed=()=>active&&!modal&&!photoOpen&&!voyage.photoMode&&!document.body.classList.contains?.('cinematic');
 function inRange(f,contact=false){
  if(!f||f.ecologyPresent===false||!f.uid||f.species<0||!SPECIES[f.species])return false;
  // A long ribbonfish can remain visibly selected while its centre is outside
  // the frame or behind a rock. Observation and photo credit share the same
  // revalidated body sightline; touching still requires the original limits.
  if(!contact&&SPECIES[f.species].id==='oarfish'&&typeof oceanSelection!=='undefined')return oceanSelection.valid(f);
  const point=animalFocusPoint(f);const traits=speciesTraits(f.species),limit=contact?traits.contactDistance:traits.observeDistance;if(f.retreat>.8||f.faunaVisibility<.8)return false;
  if(V.dist(player.p,point)>limit||V.dist(eye,point)>limit+V.dist(eye,player.p)+2||blocked(eye,point,SPECIES[f.species].fauna?.001:.13)||blocked(player.p,point,SPECIES[f.species].fauna?.001:.13))return false;
  const p=project(point,renderer.vp);return p.every(Number.isFinite)&&p[2]>0&&Math.abs(p[0])<.96&&Math.abs(p[1])<.92;
 }
 function chooseTarget(){
  if(!playAllowed()||inResearchVehicle())return null;const f=typeof oceanSelection!=='undefined'?oceanSelection.target():focusFish;
  return f&&inRange(f,true)?f:null;
 }
 function targetDisc(f){const c=renderer.canvas.getBoundingClientRect(),p=project(animalFocusPoint(f),renderer.vp),distance=V.dist(eye,animalFocusPoint(f)),size=speciesTraits(f.species).targetRadius;
  return {x:c.left+(p[0]*.5+.5)*c.width,y:c.top+(.5-p[1]*.5)*c.height,r:clamp(c.height*size/(Math.max(.006,distance)*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360)),34,140)};
 }
 function hit(f,x,y){if(!inRange(f,true))return false;const d=targetDisc(f);return Math.hypot(x-d.x,y-d.y)<=d.r;}
 function setTool(tool){if(typeof oceanGamepadPointer!=='undefined')oceanGamepadPointer.contextChanged();runtime.tool=runtime.tool===tool?null:tool;runtime.gesture=null;if(runtime.tool){releaseMouseLook();if(typeof oceanExploration!=='undefined')oceanExploration.setPen(null);}paintHUD();return runtime.tool;}
 function beginGesture(x,y,pointer=0){
  if(!playAllowed())return false;const f=chooseTarget();if(!f||!hit(f,x,y))return false;
  if(runtime.tool==='feed')return feedAt(f,x,y);
  if(runtime.tool!=='pet')return false;
  runtime.gesture={uid:f.uid,pointer,x,y,start:runtime.now,path:0,turns:0,direction:0,turnX:x};return true;
 }
 function moveGesture(x,y,pointer=0){
  const g=runtime.gesture;if(!g||g.pointer!==pointer||!playAllowed())return false;const f=fishByUID(g.uid);
  if(!f||!hit(f,x,y)){runtime.gesture=null;return false;}
  const dx=x-g.x,dy=y-g.y,step=Math.hypot(dx,dy);if(step>90){runtime.gesture=null;return false;}
  trackStroke(g,x,y);
  if(g.path>=80&&g.turns>=1&&runtime.now-g.start>=.55&&runtime.now-(runtime.lastStroke.get(f.uid)??-100)>=2.5){
   const r=individual(f);r.trust=Math.min(100,r.trust+6);r.strokes++;addKnowledge(f,2);runtime.lastStroke.set(f.uid,runtime.now);runtime.lastContact.set(f.uid,{kind:'stroke',time:runtime.now});g.completed=true;g.path=0;g.turns=0;g.start=runtime.now;save();say(SPECIES[f.species].name+'慢慢放鬆了 · 信任 '+Math.round(r.trust)+'%');return true;
  }return false;
 }
 function endGesture(cancel=false){
  const g=runtime.gesture;runtime.gesture=null;if(cancel||!g||g.completed||g.path>14||runtime.now-g.start>.5||!playAllowed())return false;
  const f=fishByUID(g.uid);if(!f||!hit(f,g.x,g.y))return false;
  const last=runtime.lastTap.get(f.uid)??-100;runtime.lastTap.set(f.uid,runtime.now);
  if(runtime.now-last>.7)return false;
  runtime.lastTap.set(f.uid,-100);const r=individual(f);r.trust=Math.min(100,r.trust+1);runtime.lastContact.set(f.uid,{kind:'tap',time:runtime.now});addKnowledge(f,.5);save();say(SPECIES[f.species].name+'回應了你的輕觸。');return true;
 }
 function feedAt(f,x,y){
  if(!playAllowed()||!f||!speciesTraits(f.species).feedable||!hit(f,x,y)||runtime.now-runtime.lastFeed<7)return false;
  runtime.lastFeed=runtime.now;const toward=V.norm(V.sub(player.p,f.p)),p=V.add(f.p,V.mul(toward,.42));runtime.food.push({p,born:runtime.now,uid:f.uid});runtime.food=runtime.food.slice(-2);
  const r=individual(f);r.feeds++;r.trust=Math.min(100,r.trust+4);addKnowledge(f,2);save();say('少量食物散開了；附近的小魚正游近。');return true;
 }
 function observeTarget(dt){
  const candidate=typeof oceanMicrocosm!=='undefined'&&oceanMicrocosm.isViewing()?oceanMicrocosm.target():focusFish;
  const f=candidate&&inRange(candidate)?candidate:null;
  if(!f){if(runtime.encounter)runtime.lastObserved.set(runtime.encounter.uid,runtime.now);runtime.encounter=null;return;}
  if(runtime.encounter?.uid!==f.uid){
   if(runtime.encounter)runtime.lastObserved.set(runtime.encounter.uid,runtime.now);
   const fresh=runtime.now-(runtime.lastObserved.get(f.uid)??-100)>18;
   runtime.encounter={uid:f.uid,points:0,seconds:0,discovered:false,fresh};if(fresh)field(f).encounters++;
  }
  const r=field(f);r.seconds+=dt;individual(f).seconds+=dt;runtime.encounter.seconds+=dt;
  if(runtime.encounter.fresh&&runtime.encounter.points<7){const earned=Math.min(dt*.9,7-runtime.encounter.points);runtime.encounter.points+=earned;addKnowledge(f,earned);}
 }
 function discover(f){
  if(!playAllowed()||!f||fishByUID(f.uid)!==f||!inRange(f))return false;
  const encounter=runtime.encounter;
  // Revisit cooldown limits repeat awards, not the first earned discovery.
  if(!encounter||encounter.uid!==f.uid||(!encounter.fresh&&knowledge(field(f))>=1)||encounter.seconds<1.2||encounter.discovered)return false;
  encounter.discovered=true;const points=Math.max(0,Math.min(4-field(f).points,7-encounter.points));
  if(points){encounter.points+=points;addKnowledge(f,points);}save();return true;
 }
 function retirePartner(uid){
  const s=state(),at=s.partners.findIndex(p=>p.uid===uid);if(at<0)return false;
  s.partners.splice(at,1);s.released=s.released||[];if(!s.released.includes(uid))s.released.push(uid);
  if(s.selected===uid){s.selected=s.partners[0]?.uid||null;s.accompany=!!s.selected;runtime.partnerPos=null;runtime.partnerUID=null;releaseGrab();runtime.training=null;}
  return true;
 }
 function releasePartner(uid){if(!retirePartner(uid))return false;save();paintHUD();say('已向這位夥伴告別。未來仍可認識同種的其他個體。');return true;}
 function befriend(uid,replaceUID=null){
  const f=fishByUID(uid),allowed=playAllowed()||(active&&modal==='partnerInvite');if(!allowed||!f||!profile(f)||!inRange(f,true))return false;const r=individual(f),s=state();
  if((s.released||[]).includes(uid)){say('你們已經告別；可以再去認識另一位朋友。');return false;}
  if(r.trust<18||r.seconds<6){say('先安靜觀察 6 秒，並輕撫建立 18% 信任。');return false;}
  if(s.partners.some(p=>p.uid===uid))return true;
  if(replaceUID&&!s.partners.some(p=>p.uid===replaceUID))return false;
  if(s.partners.some(p=>p.uid!==replaceUID&&fishByUID(p.uid)?.species===f.species)){say('已經有這一種夥伴了。若要換一位，可先在名冊告別。');return false;}
  if(s.partners.length>=3&&!replaceUID){say('夥伴名冊已滿，請選擇要告別的朋友。');return false;}
  if(replaceUID)retirePartner(replaceUID);
  releaseGrab();runtime.training=null;
  s.partners.push({uid,name:SPECIES[f.species].name,mastery:mastery(null),lastPerformance:null});s.selected=uid;s.accompany=true;runtime.partnerPos=f.p.slice();runtime.partnerUID=uid;runtime.partnerYaw=f.yaw;runtime.detour=null;save();say('牠願意同行了。回到夥伴名冊，可以替牠取名字。');return true;
 }
 function inviteTarget(){const uid=runtime.target;if(befriend(uid))return true;const f=fishByUID(uid);if(f&&profile(f)&&inRange(f,true)&&individual(f).trust>=18&&individual(f).seconds>=6&&!(state().released||[]).includes(uid)&&state().partners.length){runtime.inviteUID=uid;oceanFeatures.open('partnerInvite');}return false;}
 function selectPartner(uid){if(!state().partners.some(p=>p.uid===uid))return false;state().selected=uid;state().accompany=true;runtime.partnerPos=null;runtime.partnerUID=null;runtime.partnerYaw=null;runtime.detour=null;releaseGrab();runtime.training=null;save();paintHUD();return true;}
 function setName(uid,name){const p=state().partners.find(p=>p.uid===uid);if(!p)return false;p.name=cleanName(name);save();return true;}
 function releaseGrab(){runtime.riding=false;runtime.grabbedUID=null;}
 function grabAnimal(uid){
  const f=fishByUID(uid);if(!playAllowed()||inResearchVehicle()||!f||!speciesTraits(f.species).grabbable||!inRange(f,true))return false;
  const isPartner=partner()?.uid===uid&&state().accompany;
  if(isPartner&&individual(f).trust<24){say('同行夥伴需要 24% 信任，才願意帶你游泳。');return false;}
  stopAuto();runtime.grabbedUID=uid;runtime.riding=!!isPartner;runtime.tool=null;runtime.gesture=null;
  if(isPartner)runtime.partnerPos=f.p.slice();
  say(isPartner?'已抓住夥伴 · 環視帶牠轉向，E／Q 調整深度；按鬆手離開。':'已輕握並隨牠游動 · 再按鬆手即可離開。');return true;
 }
 function toggleRide(){
  if(runtime.grabbedUID||runtime.riding){releaseGrab();say('已鬆手，繼續自由探索。');return true;}
  const f=chooseTarget();if(f&&speciesTraits(f.species).grabbable)return grabAnimal(f.uid);
  say('靠近畫面中的大型生物，再抓握同行。');return false;
 }
 function whistle(){
  if(inResearchVehicle()){say('夥伴留在淺海等你，研究潛航結束後再一起游泳。');return false;}
  const p=partner(),f=p&&fishByUID(p.uid);if(!playAllowed()||!f){say('先選定一位已結識的夥伴，再在海中吹哨。');return false;}
  state().accompany=true;if(runtime.partnerUID!==p.uid||!runtime.partnerPos){runtime.partnerUID=p.uid;runtime.partnerPos=f.p.slice();runtime.partnerYaw=f.yaw;runtime.detour=null;}if(typeof oceanAudio!=='undefined')oceanAudio.cue('whistle');save();say(p.name+'聽見了呼喚，正在游向你。');return true;
 }
 function beginTraining(){
  if(active)return false;const p=partner(),f=p&&fishByUID(p.uid);if(!f){say('先在海裡結識一位鯨豚夥伴。');return false;}
  runtime.training={uid:p.uid,stage:'approach',trick:null,queue:[],strength:65,performance:null,gesture:null,lastTap:null,lastOutcome:'呼喚夥伴靠泊中…'};runtime.partnerPos=runtime.partnerUID===p.uid&&runtime.partnerPos?runtime.partnerPos:f.p.slice();runtime.partnerUID=p.uid;runtime.partnerYaw=f.yaw;runtime.detour=null;runtime.riding=false;renderer.dirty=true;return true;
 }
 const stagePoint=()=>[OPEN_WORLD.boat[0]+9,.30,OPEN_WORLD.boat[2]+6];
 function commandTrick(id){
  const tr=runtime.training;if(active||modal!=='training'||!tr||tr.stage!=='ready'||!TRICKS[id]||tr.performance||tr.queue.length>=3)return false;
  if(TRICKS[id].base&&num(partner()?.mastery[TRICKS[id].base],5)<TRICKS[id].level)return false;
  tr.queue.push(id);tr.lastOutcome='已排入 '+TRICKS[id].name+' · 調整強度後按 Go 開始。';renderer.dirty=true;paintTraining();return true;
 }
 function queueGesture(part,gesture){
  const mapping={mouth:{touch:'spin',stroke:'frontflip',grab:'backflip'},fin:{touch:'tailwalk',stroke:'sing',grab:'handshake'}};
  const id=mapping[part]?.[gesture];if(!id){if(runtime.training)runtime.training.lastOutcome='試試嘴部連點／按住，或鰭部來回輕撫。';return false;}return commandTrick(id);
 }
 function trainingPartPoint(part){
  const tr=runtime.training,f=tr&&fishByUID(tr.uid);if(!f)return null;
  const local=profile(f)?.[part];if(!local)return null;const scale=f.s||[1,1,1],cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch||0),sp=Math.sin(f.pitch||0),x=(local[0]*cp-local[1]*sp)*scale[0],y=(local[0]*sp+local[1]*cp)*scale[1],z=local[2]*scale[2];
  const p=V.add(f.p,[x*cy+z*sy,y,-x*sy+z*cy]);
  if(blocked(eye,p))return null;const projected=project(p,renderer.vp);if(projected[2]<=0)return null;
  const c=renderer.canvas.getBoundingClientRect();return {x:c.left+(projected[0]*.5+.5)*c.width,y:c.top+(.5-projected[1]*.5)*c.height};
 }
 function beginTrainingGesture(part,x,y,pointer=0){
  const tr=runtime.training,p=trainingPartPoint(part);if(active||modal!=='training'||!tr||tr.stage!=='ready'||tr.performance||!p||Math.hypot(x-p.x,y-p.y)>44)return false;
  tr.gesture={part,x,y,pointer,start:runtime.now,path:0,turns:0,direction:0,turnX:x};return true;
 }
 function trackStroke(g,x,y){
  // Measure reversal from the horizontal extreme, independent of event rate.
  const sweep=x-g.turnX;
  if(g.direction&&sweep*g.direction>0)g.turnX=x;
  else if(Math.abs(sweep)>2){const direction=Math.sign(sweep);if(g.direction&&direction!==g.direction)g.turns++;g.direction=direction;g.turnX=x;}
  g.path+=Math.hypot(x-g.x,y-g.y);g.x=x;g.y=y;
 }
 function moveTrainingGesture(x,y,pointer=0){
  const g=runtime.training?.gesture;if(!g||g.pointer!==pointer)return false;const p=trainingPartPoint(g.part);if(!p||Math.hypot(x-p.x,y-p.y)>65){runtime.training.gesture=null;return false;}
  trackStroke(g,x,y);return true;
 }
 function endTrainingGesture(cancel=false){
  const tr=runtime.training,g=tr?.gesture;if(!g)return false;tr.gesture=null;if(cancel)return false;
  const elapsed=runtime.now-g.start;if(g.path>=65&&g.turns>0&&elapsed>.4)return queueGesture(g.part,'stroke');
  if(g.path<15&&elapsed>=.65)return queueGesture(g.part,'grab');
  if(g.path<15&&elapsed<.45){const last=tr.lastTap;tr.lastTap={part:g.part,time:runtime.now};if(last?.part===g.part&&runtime.now-last.time<.7){tr.lastTap=null;return queueGesture(g.part,'touch');}}
  return false;
 }
 function startPerformance(strength){
  const tr=runtime.training;if(active||modal!=='training'||!tr||tr.stage!=='ready'||tr.performance||!tr.queue.length)return false;
  tr.strength=clamp(Number.isFinite(Number(strength))?Number(strength):tr.strength,10,100);
  const advanced={frontflip:['doublefrontflip','triplefrontflip'],backflip:['doublebackflip','triplebackflip'],spin:['corkscrew','supercorkscrew']},p=partner();
  const ids=tr.queue.splice(0).map(id=>{const choices=advanced[id],level=p?.mastery[id]||0;if(!choices)return id;return tr.strength>=85&&level>=5?choices[1]:tr.strength>=55&&level>=3?choices[0]:id;});
  tr.performance={ids,start:runtime.now,index:0,height:0,duration:0,strength:tr.strength/100};tr.gesture=null;startNextTrick();return true;
 }
 function startNextTrick(){
  const tr=runtime.training,pf=tr.performance,id=pf.ids[pf.index];tr.trick={id,start:runtime.now,duration:TRICKS[id].duration*(.72+pf.strength*.4),strength:pf.strength,rewarded:false};
  tr.lastOutcome='第 '+(pf.index+1)+' / '+pf.ids.length+' 個動作 · '+TRICKS[id].name;renderer.dirty=true;
 }
 function praiseTrick(){const tr=runtime.training,q=tr?.trick;if(!q)return false;const u=(runtime.now-q.start)/q.duration;
  if(u<.52||u>.84||q.rewarded){tr.lastOutcome=u<.52?'再等一下，留意牠躍起的時機。':'這次稍晚了，再試一次。';return false;}
  q.rewarded=true;const p=state().partners.find(p=>p.uid===tr.uid);if(!p)return false;p.mastery[q.id]=Math.min(5,(p.mastery[q.id]||0)+1);const f=fishByUID(p.uid);if(f)individual(f).trust=Math.min(100,individual(f).trust+2);tr.lastOutcome=TRICKS[q.id].name+' · 熟練 '+p.mastery[q.id]+' / 5';save();say(tr.lastOutcome);return true;
 }
 function moveToward(a,b,speed,dt){const delta=V.sub(b,a),length=V.len(delta);return length<.00001?b.slice():V.add(a,V.mul(delta,Math.min(1,speed*dt/length)));}
 // Steer the actual companion body around reefs. A clear end point is not a
 // clear route: test the lookahead segment against inflated reef ellipsoids.
 function partnerStep(old,goal,speed,dt,f,training){
  const length=profile(f)?.length||4,hull=length*.52+.25,vertical=length*.22+.2,delta=V.sub(goal,old),distance=V.len(delta);
  if(distance<.00001)return goal.slice();
  const direction=V.mul(delta,1/distance),look=Math.min(distance,Math.max(8,length*2)),ahead=V.add(old,V.mul(direction,look));let obstacle=null,nearest=Infinity;
  for(const ob of typeof obstacles==='undefined'?[]:obstacles){
   if(Math.max(old[1],ahead[1])+vertical<ob.p[1]-ob.s[1]||Math.min(old[1],ahead[1])-vertical>ob.p[1]+ob.s[1])continue;
   const rx=ob.s[0]+hull,rz=ob.s[2]+hull,a=[(old[0]-ob.p[0])/rx,(old[2]-ob.p[2])/rz],d=[(ahead[0]-old[0])/rx,(ahead[2]-old[2])/rz],den=d[0]*d[0]+d[1]*d[1];if(den<1e-8)continue;
   const u=clamp(-(a[0]*d[0]+a[1]*d[1])/den,0,1),q=(a[0]+u*d[0])**2+(a[1]+u*d[1])**2;
   if(q<1.45&&u<nearest){nearest=u;obstacle=ob;}
  }
  let aim=goal;
  if(obstacle){
   const ob=obstacle,dx=goal[0]-old[0],dz=goal[2]-old[2],flat=Math.hypot(dx,dz)||1,perp=[-dz/flat,dx/flat];
   if(runtime.detour?.ob!==ob){const side=(old[0]-ob.p[0])*perp[0]+(old[2]-ob.p[2])*perp[1];runtime.detour={ob,side:side<-.01?-1:1,axis:perp,forward:[dx/flat,dz/flat],phase:0};}
   const axis=runtime.detour.axis,sign=runtime.detour.side;
   const sidePoint=[ob.p[0]+sign*axis[0]*(ob.s[0]+hull)*1.5,clamp(goal[1],old[1]-2,old[1]+2),ob.p[2]+sign*axis[1]*(ob.s[2]+hull)*1.5];
   if(Math.hypot(old[0]-sidePoint[0],old[2]-sidePoint[2])<.7)runtime.detour.phase=1;
   aim=sidePoint;if(runtime.detour.phase){aim[0]+=runtime.detour.forward[0]*(ob.s[0]+hull)*1.5;aim[2]+=runtime.detour.forward[1]*(ob.s[2]+hull)*1.5;}
  }else runtime.detour=null;
  let next=moveToward(old,aim,speed,dt);
  const floor=groundHeight(next[0],next[2])+vertical+.15;
  if(next[1]<floor){const raised=[next[0],floor,next[2]];next=moveToward(old,raised,speed,dt);}
  for(const ob of typeof obstacles==='undefined'?[]:obstacles){
   if(next[1]+vertical<ob.p[1]-ob.s[1]||next[1]-vertical>ob.p[1]+ob.s[1])continue;
   const q=p=>((p[0]-ob.p[0])/(ob.s[0]+hull))**2+((p[2]-ob.p[2])/(ob.s[2]+hull))**2;
   // Imported/legacy poses can begin in an inflated envelope; allow only escape.
   if(q(next)<1.02&&q(next)<=q(old))return old.slice();
  }
  return next;
 }
 function movePartner(time,dt){
  if(inResearchVehicle()){releaseGrab();runtime.partnerPos=null;runtime.partnerUID=null;runtime.partnerYaw=null;runtime.detour=null;return;}
  const p=partner(),f=p&&fishByUID(p.uid);if(!f)return;
  const training=runtime.training&&runtime.training.uid===p.uid&&!active&&modal==='training';
  if(!training&&!state().accompany&&!runtime.partnerPos)return;
  if(runtime.partnerUID!==p.uid||!runtime.partnerPos){runtime.partnerUID=p.uid;runtime.partnerPos=contactOrigin(f).slice();runtime.partnerYaw=f.yaw;runtime.detour=null;}
  const old=runtime.partnerPos.slice();let desired=f.p.slice(),speed=profile(f)?.swimSpeed||3.7;const dimensions=profile(f)||{length:4},length=dimensions.length;
  if(training){desired=stagePoint();speed=dimensions.approachSpeed||12;
   if(V.dist(old,desired)<.4&&runtime.training.stage==='approach'){runtime.training.stage='ready';runtime.training.lastOutcome='已靠泊。請在畫面中的嘴部／鰭部下達指令。';}
   const q=runtime.training.trick;
   if(q){f.partnerFinPulse=0;const u=clamp((time-q.start)/q.duration,0,1),arc=Math.sin(u*Math.PI),lift=2.5+q.strength*2.8+(p.mastery[q.id]||0)*.10,base=TRICKS[q.id].base||q.id;
    let pitch=0,yaw=Math.PI+.5,bank=0;desired[1]+=arc*lift;
    if(base==='frontflip'||base==='backflip'){const turns=q.id.startsWith('triple')?3:q.id.startsWith('double')?2:1;pitch=.65*(1-arc)+(base==='frontflip'?1:-1)*u*TAU*turns;desired[2]+=(u-.5)*2.2*arc;}
    else if(base==='spin'){yaw+=u*TAU;pitch=.65+Math.sin(u*TAU)*.35;if(q.id!=='spin')bank=u*TAU*(q.id==='supercorkscrew'?3:2);}
    else if(base==='tailwalk'){pitch=.65+arc*(Math.PI*.47-.65);desired[1]=.3+arc*length*.30;desired[0]+=Math.sin(u*Math.PI)*1.7;desired[2]+=u*2.2*arc;}
    else if(base==='sing'){pitch=.65+arc*.35;desired[1]=.30+arc*.36;if(u>.18&&!q.sounded){q.sounded=true;if(typeof oceanAudio!=='undefined')oceanAudio.cue('partner-song');}}
    else if(base==='handshake'){pitch=.65-arc*.51;bank=Math.sin(u*Math.PI)*.14;f.partnerFinPulse=arc;desired[1]=.30+arc*.12;f.effort=.2;}
    else {pitch=.65+Math.sin(u*TAU)*.70;desired[0]+=Math.sin(u*TAU)*(.65+q.strength);}
    runtime.partnerPos=desired;f.p=desired.slice();f.yaw=yaw;f.pitch=pitch;f.bank=bank;f.effort=base==='sing'||base==='handshake'?.25:.9;contactIntent(f,{speed:Math.max(dimensions.approachSpeed||12,length*2),allowSurface:true,preservePose:true});
    const pf=runtime.training.performance;pf.height=Math.max(pf.height,Math.max(0,f.p[1]));pf.duration=time-pf.start;
    if(u>=1){pf.index++;runtime.training.trick=null;if(pf.index<pf.ids.length)startNextTrick();else {
     p.lastPerformance={height:Math.round(pf.height*100)/100,duration:Math.round(pf.duration*100)/100,count:pf.ids.length};runtime.training.lastOutcome='表演完成 · 最高離水 '+p.lastPerformance.height.toFixed(1)+' m · '+p.lastPerformance.duration.toFixed(1)+' 秒 · '+pf.ids.length+' 個動作';runtime.training.performance=null;save();
    }}return;
   }
  }else if(active&&state().accompany){
   const direction=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)],near=Math.max(1.3,speciesTraits(f.species).contactDistance-length*.06-.4);
   if(runtime.riding){const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-stick[1],depth=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+verticalInput;
    speed=clamp(2.8+forward*1.6,1.0,4.8);desired=V.add(old,V.add(V.mul(direction,speed),[0,depth*1.7,0]));
   }else desired=V.add(player.p,V.add(V.mul(direction,near*.88),V.add(V.mul(right,near*.12),[0,.2+Math.sin(time*.63)*.18,0])));
   desired[1]=clamp(desired[1],groundHeight(desired[0],desired[2])+Math.max(2.2,length*.3),-Math.max(1.2,length*.15));desired=collide(desired);
  }else if(!training&&!active){desired=stagePoint();desired[1]=-1.6;speed=8;}
  runtime.partnerPos=partnerStep(old,desired,speed,dt,f,training);f.p=runtime.partnerPos.slice();const delta=V.sub(f.p,old);
  if(V.len(delta)>.0001){const yaw=Math.atan2(-delta[2],delta[0]),prior=runtime.partnerYaw??f.yaw,turn=Math.atan2(Math.sin(yaw-prior),Math.cos(yaw-prior));f.yaw=prior+clamp(turn,-(dimensions.turnRate||1)*dt,(dimensions.turnRate||1)*dt);f.pitch=clamp(Math.atan2(delta[1],Math.hypot(delta[0],delta[2])),-.7,.7);}else if(training){f.yaw=Math.PI+.5;f.pitch=.65;}
  runtime.partnerYaw=f.yaw;f.bank=0;f.partnerFinPulse=0;f.effort=training?.4:.6;contactIntent(f,{speed,allowSurface:!!training,preservePose:!!training});
  if(!training&&!state().accompany&&V.dist(f.p,desired)<.1){runtime.partnerPos=null;runtime.partnerUID=null;}
 }
 function afterLife(time){
  const dt=clamp(time-(runtime.lastTime??time-1/60),0,.1);runtime.lastTime=time;runtime.now=time;
  if(runtime.food.length)runtime.food=runtime.food.filter(c=>time-c.born<8);
  // Without food or a returning animal, this pass has no pose/state effects.
  // Partner movement and contact responses below still run every update.
  if(runtime.food.length||runtime.reactions.size)for(const f of life){if(!speciesTraits(f.species).feedable)continue;let cloud=null,distance=7;
   const position=contactOrigin(f);for(const c of runtime.food){const d=V.dist(position,c.p);if(d<distance&&!blocked(position,c.p)){distance=d;cloud=c;}}
   let current=runtime.reactions.get(f.uid);
   if(cloud){current=current||position.slice();const phase=(f.bioSeed||1)%97+time*.7,target=V.add(cloud.p,[Math.sin(phase)*.48,-.08+Math.cos(phase*1.3)*.20,Math.cos(phase)*.48]);const next=moveToward(current,target,1.05,dt);runtime.reactions.set(f.uid,next);const d=V.sub(next,current);f.p=next.slice();if(V.len(d)>.0001)f.yaw=Math.atan2(-d[2],d[0]);f.effort=.82;contactIntent(f,{speed:1.05});
   }else if(current){const next=moveToward(current,f.p,1.4,dt);if(V.dist(next,f.p)<.04)runtime.reactions.delete(f.uid);else {runtime.reactions.set(f.uid,next);f.p=next.slice();contactIntent(f,{speed:1.4});}}
  }
  if(runtime.foodBatch){runtime.foodBatch.visible=runtime.food.length>0;for(let i=0;i<runtime.foodNodes.length;i++){const f=runtime.foodNodes[i],c=runtime.food[Math.floor(i/24)];if(!c){if(f.p[0]!==0||f.p[1]!==-500||f.p[2]!==0)f.p=[0,-500,0];continue;}const age=time-c.born,a=i*2.39996+age*.42,r=.06+((i%24)/24)*(.18+age*.038);f.p=[c.p[0]+Math.cos(a)*r,c.p[1]-.026*age+.09*Math.sin(a*1.4),c.p[2]+Math.sin(a)*r];}}
  movePartner(time,dt);
  for(const [uid,contact] of runtime.lastContact){const age=time-contact.time,f=fishByUID(uid);if(age>2.4||!f){runtime.lastContact.delete(uid);continue;}if(contact.kind==='stroke'){f.effort=.25;f.bank=Math.sin(age*3)*.06;}else {f.pitch=(f.pitch||0)+Math.sin(age*9)*.12*Math.exp(-age*3);f.effort=.7;}}

 }
 function afterLifeContact(){
  // Steering resumes from the position actually rendered after the one final
  // stone solve; stale food/partner targets must not re-enter the wall next frame.
  if(runtime.reactions.size)for(const f of life)if(runtime.reactions.has(f.uid))runtime.reactions.set(f.uid,f.p.slice());
  const f=runtime.partnerPos&&fishByUID(runtime.partnerUID);if(f){runtime.partnerPos=f.p.slice();runtime.partnerYaw=f.yaw;}
 }
 function paintHUD(){
  const hud=node('ecologyHUD');if(!hud)return;const f=chooseTarget();runtime.target=f?.uid||null;document.body.classList.toggle('ecology-tool',!!runtime.tool&&playAllowed());
  hud.classList.toggle('hidden',!playAllowed()||!(f||runtime.tool||runtime.grabbedUID||(!inResearchVehicle()&&state().accompany&&partner())));
  const name=node('ecologyTarget');name.textContent=f?(persistent.seen.includes(SPECIES[f.species].id)?SPECIES[f.species].name:'這位海洋訪客')+' · 信任 '+Math.round(individual(f).trust)+'%':'先點選附近的生物，再輕撫或餵食';
  node('ecologyPet').classList.toggle('active',runtime.tool==='pet');node('ecologyFeed').classList.toggle('active',runtime.tool==='feed');node('ecologyRide').textContent=runtime.grabbedUID?'鬆手':'抓握同行';node('ecologyRide').classList.toggle('hidden',!runtime.grabbedUID&&!(f&&speciesTraits(f.species).grabbable)&&!partner());
  node('ecologyBefriend').classList.toggle('hidden',!f||!profile(f)||(state().released||[]).includes(f.uid)||state().partners.some(p=>p.uid===f.uid));
  node('ecologyWhistle').classList.toggle('hidden',!partner()||inResearchVehicle());
  const disc=node('ecologyTouch');disc.classList.toggle('hidden',!f||!runtime.tool||!playAllowed());
  if(f&&runtime.tool){const p=targetDisc(f);disc.style.left=p.x+'px';disc.style.top=p.y+'px';disc.style.width=disc.style.height=p.r*2+'px';disc.textContent=runtime.tool==='pet'?'來回輕撫 · 連點觸碰':speciesTraits(f.species).feedable?'點一下餵食':'這位訪客不接受食物';}
 }
 function paintTraining(){
  const tr=runtime.training,show=!!tr&&modal==='training'&&!active;
  for(const part of ['mouth','fin']){const el=node('ecologyPart-'+part);if(!el)continue;const p=show&&tr.stage==='ready'&&!tr.performance?trainingPartPoint(part):null;el.classList.toggle('hidden',!p);if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';}}
  if(!show)return;const f=fishByUID(tr.uid),q=tr.trick,status=node('ecologyTrainingStatus');if(status)status.textContent=tr.stage==='approach'?'夥伴正游向船邊 · '+Math.ceil(V.dist(f.p,stagePoint()))+' m':tr.lastOutcome;
  const u=q?clamp((runtime.now-q.start)/q.duration,0,1):0,button=node('ecologyPraise');if(button){button.disabled=!q||q.rewarded||u<.52||u>.84;button.textContent=q?.rewarded?'已收到回饋':q&&u>=.52&&u<=.84?'現在！給予回饋':'留意動作時機';}
  const bar=node('ecologyTrainingBar');if(bar)bar.style.width=u*100+'%';const queue=node('ecologyQueue');if(queue)queue.textContent=tr.queue.length?tr.queue.map((id,i)=>(i+1)+'. '+TRICKS[id].name).join(' → '):'尚未排入動作（最多三個）';
  const go=node('ecologyGo');if(go)go.disabled=tr.stage!=='ready'||!!tr.performance||!tr.queue.length;const clear=node('ecologyClearQueue');if(clear)clear.disabled=!!tr.performance||!tr.queue.length;
 }
 function renderPanel(type){
  paintHUD();if(type!=='training'){runtime.training=null;paintTraining();if(typeof document!=='undefined')document.body.classList.remove('ecology-training');}if(!['ecology','partners','training','partnerInvite'].includes(type))return false;
  document.body.classList.toggle('ecology-training',type==='training'&&!active);const s=state();
  if(type==='ecology'){
   panelTitle('FIELD NOTES / THREE LAYERS','相遇，會留下更多細節');node('panelBody').innerHTML='<p class="panel-note">先點選附近的生物，再用畫面上的輕撫手勢，或在小魚旁撒下少量食物。再次點選使用中的工具即可收起。隔一段時間重新觀察，逐步揭開三層遊戲筆記。互動皆為原創遊戲設定。</p>'+(active?'<button id="ecologyActivate" class="primary">'+(runtime.tool?'收起互動工具':'開始輕撫互動')+'</button>':'')+SPECIES.map(sp=>{const r=s.field[sp.id],n=knowledge(r);return '<article class="ecology-record"><b>'+safe(sp.name)+' <small>'+n+' / 3</small></b><p>'+safe(n?sp.hint:'第一層：安靜觀察，留下辨識線索。')+'</p><p>'+safe(n>=2?sp.detail:'第二層：至少兩次相遇，累積 14 點互動記錄。')+'</p><p>'+safe(n>=3?'個人筆記：'+Math.round(r.seconds)+' 秒觀察 · '+r.encounters+' 次相遇 · '+r.photos+' 張照片。':'第三層：至少三次相遇，累積 30 點互動記錄。')+'</p></article>';}).join('');
   if(node('ecologyActivate'))node('ecologyActivate').onclick=()=>{closePanel();setTool(runtime.tool||'pet');};
   return true;
  }
  if(type==='partnerInvite'){
   const f=fishByUID(runtime.inviteUID);panelTitle('PARTNER INVITATION','讓一位新朋友加入');
   node('panelBody').innerHTML='<p class="panel-note">'+safe(f?SPECIES[f.species].name:'這位夥伴')+'想與你同行。選擇告別的朋友後，新夥伴會加入。告別會結束該個體的訓練關係。</p>'+s.partners.map(p=>'<button class="muted-btn" data-partner-replace="'+p.uid+'">告別 '+safe(p.name)+'，邀請新朋友</button>').join('');
   for(const b of node('panelBody').querySelectorAll('[data-partner-replace]'))b.onclick=()=>{if(befriend(runtime.inviteUID,b.dataset.partnerReplace))closePanel();else say('新朋友已游遠，或同種夥伴仍在名冊中。請重新靠近後邀請。');};return true;
  }
  if(type==='partners'){
   panelTitle('CETACEAN PARTNERS','每一位，都是不同的朋友');node('panelBody').innerHTML='<p class="panel-note">先觀察 6 秒，再輕撫建立 18% 信任，邀請身旁的鯨豚同行。名冊有三個席位，每種一位。告別會結束這位夥伴的訓練關係；可再認識同種的其他個體。</p>'+s.partners.map(p=>'<article class="ecology-record"><b>'+safe(p.name)+'</b><small> '+safe(SPECIES[fishByUID(p.uid)?.species]?.name||p.uid)+'</small><label>名字 <input maxlength="18" data-partner-name="'+p.uid+'" value="'+safe(p.name)+'"></label><button class="muted-btn" data-partner-select="'+p.uid+'">'+(s.selected===p.uid?'目前同行':'選為同行夥伴')+'</button><p>'+Object.entries(TRICKS).filter(([id,tr])=>!tr.legacy||p.mastery[id]).map(([id,tr])=>tr.name+' '+(p.mastery[id]||0)+'/5').join(' · ')+'</p><button class="muted-btn" data-partner-release="'+p.uid+'">告別這位夥伴</button></article>').join('')+(s.partners.length?'<button class="primary" id="ecologyAccompany">'+(s.accompany?'讓夥伴休息':'邀請選定夥伴同行')+'</button><button class="muted-btn" id="ecologyTrainingOpen">船邊訓練</button>':'<button class="primary" id="ecologyFindDolphin">標記銀翼水道</button>');
   if(inResearchVehicle())node('panelBody').insertAdjacentHTML('afterbegin','<p class="feature-result">研究潛航期間，夥伴會留在淺海。同行偏好與訓練紀錄都會保留。</p>');
   node('panelBody').insertAdjacentHTML('beforeend','<h3>尋找海上的朋友</h3><div class="partner-candidates">'+SPECIES.filter(sp=>typeof partnerTraits==='function'?partnerTraits(sp):sp.id==='dolphin').map(sp=>{const owned=s.partners.some(p=>SPECIES[fishByUID(p.uid)?.species]===sp),available=sp.wildHabitat!==false||owned;return '<button class="muted-btn" data-partner-habitat="'+sp.id+'"'+(available?'':' disabled')+'>'+safe(sp.name)+' · '+(available?sp.wildHabitat===false?'標記夥伴':'標記棲地':'此海域無野生分布')+'</button>';}).join('')+'</div>');
   for(const b of node('panelBody').querySelectorAll('[data-partner-habitat]'))if(!b.disabled)b.onclick=()=>markPlace(b.dataset.partnerHabitat==='dolphin'?'wings':'habitat:'+b.dataset.partnerHabitat);
   for(const input of node('panelBody').querySelectorAll('[data-partner-name]'))input.onchange=()=>setName(input.dataset.partnerName,input.value);
   for(const b of node('panelBody').querySelectorAll('[data-partner-select]'))b.onclick=()=>{selectPartner(b.dataset.partnerSelect);renderPanel('partners');};
   for(const b of node('panelBody').querySelectorAll('[data-partner-release]'))b.onclick=()=>{releasePartner(b.dataset.partnerRelease);renderPanel('partners');};
   if(node('ecologyAccompany'))node('ecologyAccompany').onclick=()=>{s.accompany=!s.accompany;releaseGrab();save();renderPanel('partners');};
   if(node('ecologyTrainingOpen'))node('ecologyTrainingOpen').onclick=()=>{if(active)say('返回研究船後，才能進行船邊訓練。');else oceanFeatures.open('training');};
   if(node('ecologyFindDolphin'))node('ecologyFindDolphin').onclick=()=>markPlace('wings');return true;
  }
  panelTitle('AT THE BOAT / PARTNER TRAINING','與夥伴一起練習');
  if(active||!partner()||!fishByUID(partner().uid)){node('panelBody').innerHTML='<p class="panel-note">先結識一位鯨豚夥伴，再返回研究船。訓練會在船旁的真實場景進行。</p><button id="ecologyPartnerOpen" class="primary">夥伴名冊</button>';node('ecologyPartnerOpen').onclick=()=>oceanFeatures.open('partners');return true;}
  if(!runtime.training||runtime.training.uid!==s.selected)beginTraining();
  node('panelBody').innerHTML='<details class="ecology-help"><summary>六種手勢與操作提示</summary><p class="panel-note">在 '+safe(partner().name)+' 身上的圓圈操作：嘴部連點＝旋轉跳躍，輕撫＝前空翻，按住＝後空翻；胸鰭連點＝尾行，輕撫＝鳴唱，按住＝握鰭。最多三個動作，再給 Go 訊號。</p></details><p id="ecologyTrainingStatus" aria-live="polite"></p><p id="ecologyQueue" class="panel-note"></p><label>指令強度 <input id="ecologyStrength" aria-label="指令強度" type="range" min="10" max="100" value="65"></label><div class="feature-toolbar"><button id="ecologyGo" class="primary">Go · 開始表演</button><button id="ecologyClearQueue" class="muted-btn">清除指令</button><button id="ecologyPraise" class="primary" disabled>留意動作時機</button></div><div class="ecology-training-progress"><i id="ecologyTrainingBar"></i></div><p class="panel-note">動作中適時回應，增加各自熟練度（各 5 級）。表演結束後記錄離水高度與時間。空翻／旋轉熟練 3 級後，中強度（55 起）可用雙翻／螺旋；5 級後強訊號（85 起）可用三翻／超級螺旋。這些數值是本作設定。</p>';
  node('ecologyGo').onclick=()=>startPerformance(Number(node('ecologyStrength').value));node('ecologyClearQueue').onclick=()=>{if(!runtime.training.performance)runtime.training.queue=[];paintTraining();};node('ecologyPraise').onclick=praiseTrick;paintTraining();return true;

 }
 function reset(){runtime.tool=null;runtime.gesture=null;runtime.food=[];runtime.reactions.clear();runtime.partnerPos=null;runtime.partnerUID=null;runtime.partnerYaw=null;runtime.detour=null;releaseGrab();runtime.training=null;runtime.encounter=null;runtime.lastObserved.clear();runtime.lastStroke.clear();runtime.lastTap.clear();runtime.lastContact.clear();runtime.lastTime=null;runtime.lastFeed=-100;paintTraining();if(runtime.foodBatch)runtime.foodBatch.visible=false;if(typeof document!=='undefined')document.body.classList.remove('ecology-training','ecology-tool');}
 function init(){
  if(runtime.initialized)return;runtime.initialized=true;voyage.state.companion=false;
  for(const id of persistent.seen)if(species(id)&&!state().field[id])state().field[id]={points:4,seconds:0,encounters:1,photos:0};
 const hud=document.createElement('div');hud.id='ecologyHUD';hud.className='hidden';hud.innerHTML='<span id="ecologyTarget"></span><button id="ecologyPet">輕撫</button><button id="ecologyFeed">餵食</button><button id="ecologyWhistle">哨子</button><button id="ecologyBefriend" class="hidden">邀請同行</button><button id="ecologyRide" class="hidden">抓握夥伴</button>';
  document.body.appendChild(hud);const touch=document.createElement('div');touch.id='ecologyTouch';touch.className='hidden';document.body.appendChild(touch);
  node('ecologyPet').onclick=()=>setTool('pet');node('ecologyFeed').onclick=()=>setTool('feed');node('ecologyBefriend').onclick=inviteTarget;node('ecologyRide').onclick=toggleRide;node('ecologyWhistle').onclick=whistle;
  const canvas=renderer.canvas;
  canvas.addEventListener('pointerdown',e=>{if(!runtime.tool||oceanFeatures.pointerCaptured())return;if(beginGesture(e.clientX,e.clientY,e.pointerId)){e.preventDefault();e.stopImmediatePropagation();oceanGamepadPointer.capture(canvas,e);}},true);
  canvas.addEventListener('pointermove',e=>{if(!runtime.gesture)return;e.preventDefault();e.stopImmediatePropagation();moveGesture(e.clientX,e.clientY,e.pointerId);},true);
  canvas.addEventListener('pointerup',()=>endGesture(),true);for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>endGesture(true),true);
  for(const part of ['mouth','fin']){const el=document.createElement('button');el.id='ecologyPart-'+part;el.className='ecology-part hidden';el.textContent=part==='mouth'?'嘴部':'胸鰭';el.setAttribute('aria-label',part==='mouth'?'嘴部：連點旋轉跳躍、輕撫前空翻、按住後空翻':'胸鰭：連點尾行、輕撫鳴唱、按住握鰭');document.body.appendChild(el);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(beginTrainingGesture(part,e.clientX,e.clientY,e.pointerId))oceanGamepadPointer.capture(el,e);});el.addEventListener('pointermove',e=>{e.preventDefault();moveTrainingGesture(e.clientX,e.clientY,e.pointerId);});el.addEventListener('pointerup',()=>endTrainingGesture());for(const event of ['pointercancel','lostpointercapture'])el.addEventListener(event,()=>endTrainingGesture(true));}
  const g=new Geometry();g.material=0;g.shadow=false;g.sphere([0,0,0],[.019,.019,.019],[.76,.66,.42],5,4);for(let i=0;i<48;i++)runtime.foodNodes.push({p:[0,-500,0],s:[1,1,1],yaw:0,phase:i});runtime.foodBatch=renderer.batch(g,runtime.foodNodes,0,true);runtime.foodBatch.visible=false;runtime.foodBatch.maxDistance=20;
  const oldPlayer=updatePlayer;updatePlayer=function(dt){
   if(!runtime.grabbedUID||!active||modal||oceanFeatures.pointerCaptured()){oldPlayer(dt);return;}
   if(Math.hypot(...lookStick)>.04){player.yaw+=lookStick[0]*dt*1.05*settings.sensitivity;player.pitch=clamp(player.pitch-lookStick[1]*dt*.83*settings.sensitivity,-1.30,1.28);}
   const f=fishByUID(runtime.grabbedUID);if(!f){releaseGrab();return;}const forward=[Math.cos(f.yaw),0,-Math.sin(f.yaw)],local=profile(f)?.ride,offset=local?[local[0]*f.s[0],local[1]*f.s[1]]:f.species===10?[-5,1.2]:[-1.35,.45],saddle=V.add(f.p,V.add(V.mul(forward,offset[0]),[0,offset[1],0])),old=player.p.slice();player.p=collide(moveToward(old,saddle,6,dt));player.velocity=V.mul(V.sub(player.p,old),1/Math.max(dt,.001));const distance=V.dist(old,player.p);if(distance<.3){voyage.state.distance+=distance;voyage.sessionDistance+=distance;}
  };
  const oldCamera=shipCamera;shipCamera=function(){if(runtime.training&&modal==='training'&&!active){
   const view=renderer.canvas.getBoundingClientRect(),wide=view.height<550&&view.width>view.height,portrait=view.width<=650,performing=!!runtime.training.performance,f=fishByUID(runtime.training.uid),factor=clamp((profile(f)?.length||4)/4,.34,2.3),stage=stagePoint(),distance=portrait?1.4:1;
   eye=V.add(stage,performing?[8*Math.max(1,factor),3.1*Math.max(1,factor),14*Math.max(1,factor)]:[3*factor*distance,1.9*factor*distance,6*factor*distance]);
   // Reserve the lower portrait area for controls and keep the whole body framed.
   target=V.add(stage,[wide?(performing?5:3)*factor:0,performing?1.2:portrait?-1.2*factor:.2,0]);diverBatch.visible=false;cameraCut=true;
  }else oldCamera();};
  if(node('companionBtn'))node('companionBtn').onclick=()=>oceanFeatures.open('partners');
  const oldSpecies=renderSpecies;renderSpecies=function(index){oldSpecies(index);const sp=SPECIES[index],record=state().field[sp.id],level=knowledge(record),rows=node('panelBody').querySelectorAll('.info-row');
   if(rows[0]&&level<1)rows[0].querySelector('p').textContent='靠近牠安靜觀察，解開第一層辨識線索。';
   if(rows[1]&&level<2)rows[1].querySelector('p').textContent='再次相遇，透過觀察與互動解開第二層筆記。';
   const note=document.createElement('div');note.className='ecology-record';note.innerHTML='<b>觀察筆記 '+level+' / 3</b><p>'+safe(level>=3?'你的紀錄：'+Math.round(record.seconds)+' 秒觀察、'+record.encounters+' 次相遇、'+record.photos+' 張照片。':'第一層 4 點；第二層 14 點與兩次相遇；第三層 30 點與三次相遇。')+'</p>';node('panelBody').appendChild(note);
  };

  oceanFeatures.addMenu({id:'ecology',label:'生物互動筆記',panel:'ecology'});oceanFeatures.addMenu({id:'partners',label:'鯨豚夥伴',panel:'partners'});oceanFeatures.addMenu({id:'training',label:'船邊訓練',panel:'training'});
 }
 const hooks={id:'ecology',initial,sanitize,init,renderPanel,reset,afterLife,afterLifeContact,
  panelChanged(type){if(type!=='training'){runtime.training=null;document.body.classList.remove('ecology-training');}paintHUD();paintTraining();},
  panelClosed(){runtime.training=null;document.body.classList.remove('ecology-training');paintHUD();paintTraining();},
  startDive(){runtime.training=null;releaseGrab();paintTraining();state().dives++;voyage.state.companion=false;runtime.encounter=null;runtime.lastObserved.clear();document.body.classList.remove('ecology-training');},
  endDive(){releaseGrab();runtime.tool=null;document.body.classList.remove('ecology-tool');runtime.gesture=null;runtime.encounter=null;runtime.food=[];node('ecologyHUD')?.classList.add('hidden');node('ecologyTouch')?.classList.add('hidden');save();},
  tick(dt){if(!playAllowed()){runtime.gesture=null;paintHUD();return;}observeTarget(dt);runtime.uiClock+=dt;if(runtime.uiClock>.12){runtime.uiClock=0;paintHUD();}},
  idleTick(){if(modal!=='training'&&runtime.training){runtime.training=null;document.body.classList.remove('ecology-training');}paintTraining();},
  shouldAnimate(){return !!runtime.training&&!active&&modal==='training';},
  escape(){if(runtime.grabbedUID){releaseGrab();return true;}if(runtime.tool){runtime.tool=null;runtime.gesture=null;paintHUD();return true;}return false;},
  pointerCaptured(){return !!runtime.gesture||!!runtime.training?.gesture;},
  onDiscovery(f){return discover(f);},
  photoMetadata(photo){const f=fishByUID(photo.individual);photo.knowledgeEligible=!!f&&inRange(f);},
  onPhoto(photo){const f=fishByUID(photo.individual);if(f&&(typeof photo.knowledgeEligible==='boolean'?photo.knowledgeEligible:inRange(f))){field(f).photos++;addKnowledge(f,1.5);save();}}
 };
 oceanFeatures.register(hooks);
 return {TRICKS,initial,sanitize,state,knowledge,inRange,discover,setTool,beginGesture,moveGesture,endGesture,feedAt,befriend,releasePartner,selectPartner,setName,toggleRide,grabAnimal,whistle,beginTraining,commandTrick,queueGesture,trainingPartPoint,beginTrainingGesture,moveTrainingGesture,endTrainingGesture,startPerformance,praiseTrick,afterLife,hooks,snapshot:()=>({tool:runtime.tool,food:runtime.food.length,target:runtime.target,riding:runtime.riding,grabbedUID:runtime.grabbedUID,training:runtime.training,partnerPosition:runtime.partnerPos?.slice(),now:runtime.now})};
})();
