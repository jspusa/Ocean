/* Original creature interaction and dolphin-partner play. These are game mechanics,
 * not instructions for touching, feeding or riding real marine wildlife.
 * Level thresholds, three-partner capacity, mastery and gesture mappings except
 * mouth + grab = backflip are authored rules, not verified Nintendo values. */
const oceanEcology=(()=>{
 'use strict';
 const TRICKS={jump:{name:'躍出水面',duration:3.8},spin:{name:'空中轉身',duration:4.2},backflip:{name:'後空翻',duration:4.5}};
 const initial=()=>({schema:1,field:{},individuals:{},partners:[],selected:null,accompany:false,dives:0});
 const runtime={tool:null,target:null,gesture:null,now:0,lastTime:null,food:[],foodBatch:null,foodNodes:[],reactions:new Map(),partnerPos:null,partnerUID:null,riding:false,grabbedUID:null,training:null,encounter:null,lastObserved:new Map(),lastStroke:new Map(),lastTap:new Map(),lastContact:new Map(),lastFeed:-100,uiClock:0,initialized:false};
 const num=(n,max=1e6)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
 const species=id=>SPECIES.find(s=>s.id===id);
 const dolphinUID=uid=>typeof uid==='string'&&/^dolphin-\d{3}$/.test(uid)&&knownUID(uid);
 const knownUID=uid=>typeof uid==='string'&&/^[a-z]+-\d{3}$/.test(uid)&&life.some(f=>f.uid===uid&&SPECIES[f.species]?.id===uid.replace(/-\d{3}$/,''));
 const cleanName=name=>String(name||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'海之友';
 function sanitize(raw){
  const out=initial();if(!raw||typeof raw!=='object')return out;
  out.dives=Math.floor(num(raw.dives,100000));
  for(const sp of SPECIES){const r=raw.field?.[sp.id];if(r&&typeof r==='object')out.field[sp.id]={points:num(r.points,999),seconds:num(r.seconds,99999),encounters:Math.floor(num(r.encounters,9999)),photos:Math.floor(num(r.photos,9999))};}
  for(const [uid,r] of Object.entries(raw.individuals||{}).slice(0,600)){if(!knownUID(uid)||!r||typeof r!=='object')continue;out.individuals[uid]={trust:num(r.trust,100),strokes:Math.floor(num(r.strokes,9999)),feeds:Math.floor(num(r.feeds,9999)),seconds:num(r.seconds,99999)};}
  const seen=new Set();for(const p of Array.isArray(raw.partners)?raw.partners:[]){if(!p||!dolphinUID(p.uid)||seen.has(p.uid)||out.partners.length>=3)continue;seen.add(p.uid);out.partners.push({uid:p.uid,name:cleanName(p.name),mastery:Object.fromEntries(Object.keys(TRICKS).map(k=>[k,Math.floor(num(p.mastery?.[k],5))])),lastPerformance:p.lastPerformance?{height:num(p.lastPerformance.height,20),duration:num(p.lastPerformance.duration,120),count:Math.floor(num(p.lastPerformance.count,5))}:null});}
  out.selected=seen.has(raw.selected)?raw.selected:out.partners[0]?.uid||null;out.accompany=!!out.selected&&raw.accompany===true;return out;
 }
 const state=()=>oceanFeatures.state('ecology');
 const node=id=>typeof document==='undefined'?null:document.getElementById(id);
 const save=()=>saveVoyage();
 const say=s=>{if(typeof toast==='function')toast(s);};
 const fishByUID=uid=>life.find(f=>f.uid===uid);
 const individual=f=>state().individuals[f.uid]||(state().individuals[f.uid]={trust:0,strokes:0,feeds:0,seconds:0});
 const field=f=>{const id=SPECIES[f.species].id;return state().field[id]||(state().field[id]={points:0,seconds:0,encounters:0,photos:0});};
 const partner=()=>state().partners.find(p=>p.uid===state().selected)||null;
 const knowledge=r=>!r||r.points<4?0:r.points>=30&&r.encounters>=3?3:r.points>=14&&r.encounters>=2?2:1;
 function addKnowledge(f,points){const r=field(f),old=knowledge(r);r.points=Math.min(999,r.points+points);const level=knowledge(r);if(level>old){say(SPECIES[f.species].name+' · 觀察筆記第 '+level+' 層');if(!persistent.seen.includes(SPECIES[f.species].id)){persistent.seen.push(SPECIES[f.species].id);if(typeof setCount==='function')setCount();}}}
 const playAllowed=()=>active&&!modal&&!photoOpen&&!voyage.photoMode&&!document.body.classList.contains?.('cinematic');
 function inRange(f,contact=false){
  if(!f||!f.uid||f.species<0||!SPECIES[f.species])return false;
  const limit=contact?(f.species===10?12:f.species===11?5.2:f.species>=8?4:2.8):(f.species===10?80:20);
  if(V.dist(player.p,f.p)>limit||V.dist(eye,f.p)>limit+V.dist(eye,player.p)+2||blocked(eye,f.p)||blocked(player.p,f.p))return false;
  const p=project(f.p,renderer.vp);return p.every(Number.isFinite)&&p[2]>0&&Math.abs(p[0])<.96&&Math.abs(p[1])<.92;
 }
 function chooseTarget(){
  if(!playAllowed())return null;let target=null,best=Infinity;
  for(const f of life){if(!inRange(f,true))continue;const p=project(f.p,renderer.vp),score=Math.hypot(p[0],p[1])+.01*V.dist(player.p,f.p);if(score<best){target=f;best=score;}}
  return target;
 }
 function targetDisc(f){const c=renderer.canvas.getBoundingClientRect(),p=project(f.p,renderer.vp),distance=V.dist(eye,f.p),size=f.species===10?4:f.species===11?1.0:f.species>=8?.85:.35;
  return {x:c.left+(p[0]*.5+.5)*c.width,y:c.top+(.5-p[1]*.5)*c.height,r:clamp(c.height*size/(Math.max(1,distance)*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360)),34,140)};
 }
 function hit(f,x,y){if(!inRange(f,true))return false;const d=targetDisc(f);return Math.hypot(x-d.x,y-d.y)<=d.r;}
 function setTool(tool){runtime.tool=runtime.tool===tool?null:tool;runtime.gesture=null;if(runtime.tool){releaseMouseLook();if(typeof oceanExploration!=='undefined')oceanExploration.setPen(null);}paintHUD();return runtime.tool;}
 function beginGesture(x,y,pointer=0){
  if(!playAllowed())return false;const f=chooseTarget();if(!f||!hit(f,x,y))return false;
  if(runtime.tool==='feed')return feedAt(f,x,y);
  if(runtime.tool!=='pet')return false;
  runtime.gesture={uid:f.uid,pointer,x,y,start:runtime.now,path:0,turns:0,lastDx:0};return true;
 }
 function moveGesture(x,y,pointer=0){
  const g=runtime.gesture;if(!g||g.pointer!==pointer||!playAllowed())return false;const f=fishByUID(g.uid);
  if(!f||!hit(f,x,y)){runtime.gesture=null;return false;}
  const dx=x-g.x,dy=y-g.y,step=Math.hypot(dx,dy);if(step>90){runtime.gesture=null;return false;}
  if(Math.abs(dx)>2&&g.lastDx&&Math.sign(dx)!==Math.sign(g.lastDx))g.turns++;if(Math.abs(dx)>2)g.lastDx=dx;g.path+=step;g.x=x;g.y=y;
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
  if(!playAllowed()||!f||f.species>=8||!hit(f,x,y)||runtime.now-runtime.lastFeed<7)return false;
  runtime.lastFeed=runtime.now;const toward=V.norm(V.sub(player.p,f.p)),p=V.add(f.p,V.mul(toward,.42));runtime.food.push({p,born:runtime.now,uid:f.uid});runtime.food=runtime.food.slice(-2);
  const r=individual(f);r.feeds++;r.trust=Math.min(100,r.trust+4);addKnowledge(f,2);save();say('少量食物散開了；附近的小魚正游近。');return true;
 }
 function observeTarget(dt){
  const f=focusFish&&inRange(focusFish)?focusFish:null;
  if(!f){if(runtime.encounter)runtime.lastObserved.set(runtime.encounter.uid,runtime.now);runtime.encounter=null;return;}
  if(runtime.encounter?.uid!==f.uid){
   if(runtime.encounter)runtime.lastObserved.set(runtime.encounter.uid,runtime.now);
   const fresh=runtime.now-(runtime.lastObserved.get(f.uid)??-100)>18;
   runtime.encounter={uid:f.uid,points:0,fresh};if(fresh)field(f).encounters++;
  }
  const r=field(f);r.seconds+=dt;individual(f).seconds+=dt;
  if(runtime.encounter.fresh&&runtime.encounter.points<7){const earned=Math.min(dt*.9,7-runtime.encounter.points);runtime.encounter.points+=earned;addKnowledge(f,earned);}
 }
 function befriend(uid){
  const f=fishByUID(uid);if(!playAllowed()||!f||f.species!==11||!inRange(f,true))return false;const r=individual(f);
  if(r.trust<18||r.seconds<6){say('先安靜觀察 6 秒，並輕撫建立 18% 信任。');return false;}
  if(state().partners.some(p=>p.uid===uid))return true;if(state().partners.length>=3){say('已記錄三位海豚夥伴，可在夥伴名冊切換。');return false;}
  state().partners.push({uid,name:'海之友 '+(state().partners.length+1),mastery:{jump:0,spin:0,backflip:0}});state().selected=uid;state().accompany=true;runtime.partnerPos=f.p.slice();runtime.partnerUID=uid;save();say('牠願意同行了。回到夥伴名冊，可以替牠取名字。');return true;
 }
 function selectPartner(uid){if(!state().partners.some(p=>p.uid===uid))return false;state().selected=uid;state().accompany=true;runtime.partnerPos=null;runtime.partnerUID=null;releaseGrab();runtime.training=null;save();paintHUD();return true;}
 function setName(uid,name){const p=state().partners.find(p=>p.uid===uid);if(!p)return false;p.name=cleanName(name);save();return true;}
 function releaseGrab(){runtime.riding=false;runtime.grabbedUID=null;}
 function grabAnimal(uid){
  const f=fishByUID(uid);if(!playAllowed()||!f||f.species<8||!inRange(f,true))return false;
  const isPartner=partner()?.uid===uid&&state().accompany;
  if(isPartner&&individual(f).trust<24){say('同行夥伴需要 24% 信任，才願意帶你游泳。');return false;}
  stopAuto();runtime.grabbedUID=uid;runtime.riding=!!isPartner;runtime.tool=null;runtime.gesture=null;
  if(isPartner)runtime.partnerPos=f.p.slice();
  say(isPartner?'已抓住夥伴 · 環視帶牠轉向，E／Q 調整深度；按鬆手離開。':'已輕握並隨牠游動 · 再按鬆手即可離開。');return true;
 }
 function toggleRide(){
  if(runtime.grabbedUID||runtime.riding){releaseGrab();say('已鬆手，繼續自由探索。');return true;}
  const f=chooseTarget();if(f&&f.species>=8)return grabAnimal(f.uid);
  const p=partner();if(p&&grabAnimal(p.uid))return true;
  say('靠近畫面中的大型生物，再抓握同行。');return false;
 }
 function whistle(){
  const p=partner(),f=p&&fishByUID(p.uid);if(!playAllowed()||!f){say('先選定一位已結識的夥伴，再在海中吹哨。');return false;}
  state().accompany=true;if(runtime.partnerUID!==p.uid||!runtime.partnerPos){runtime.partnerUID=p.uid;runtime.partnerPos=f.p.slice();}if(typeof oceanAudio!=='undefined')oceanAudio.cue('whistle');save();say(p.name+'聽見了呼喚，正在游向你。');return true;
 }
 function beginTraining(){
  if(active)return false;const p=partner(),f=p&&fishByUID(p.uid);if(!f){say('先在海裡結識一位海豚夥伴。');return false;}
  runtime.training={uid:p.uid,stage:'approach',trick:null,queue:[],strength:65,performance:null,gesture:null,lastTap:null,lastOutcome:'呼喚夥伴靠泊中…'};runtime.partnerPos=runtime.partnerUID===p.uid&&runtime.partnerPos?runtime.partnerPos:f.p.slice();runtime.partnerUID=p.uid;runtime.riding=false;renderer.dirty=true;return true;
 }
 const stagePoint=()=>[OPEN_WORLD.boat[0]+9,.30,OPEN_WORLD.boat[2]+6];
 function commandTrick(id){
  const tr=runtime.training;if(active||modal!=='training'||!tr||tr.stage!=='ready'||!TRICKS[id]||tr.performance||tr.queue.length>=5)return false;
  tr.queue.push(id);tr.lastOutcome='已排入 '+TRICKS[id].name+' · 調整強度後按 Go 開始。';renderer.dirty=true;paintTraining();return true;
 }
 function queueGesture(part,gesture){
  const mapping={mouth:{touch:'jump',grab:'backflip'},fin:{stroke:'spin'}};
  const id=mapping[part]?.[gesture];if(!id){if(runtime.training)runtime.training.lastOutcome='試試嘴部連點／按住，或鰭部來回輕撫。';return false;}return commandTrick(id);
 }
 function trainingPartPoint(part){
  const tr=runtime.training,f=tr&&fishByUID(tr.uid);if(!f)return null;
  const local=part==='mouth'?[1.8,-.04,0]:[0,-.14,.65],scale=f.s||[1,1,1],cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch||0),sp=Math.sin(f.pitch||0),x=(local[0]*cp-local[1]*sp)*scale[0],y=(local[0]*sp+local[1]*cp)*scale[1],z=local[2]*scale[2];
  const p=V.add(f.p,[x*cy+z*sy,y,-x*sy+z*cy]);
  if(blocked(eye,p))return null;const projected=project(p,renderer.vp);if(projected[2]<=0)return null;
  const c=renderer.canvas.getBoundingClientRect();return {x:c.left+(projected[0]*.5+.5)*c.width,y:c.top+(.5-projected[1]*.5)*c.height};
 }
 function beginTrainingGesture(part,x,y,pointer=0){
  const tr=runtime.training,p=trainingPartPoint(part);if(active||modal!=='training'||!tr||tr.stage!=='ready'||tr.performance||!p||Math.hypot(x-p.x,y-p.y)>44)return false;
  tr.gesture={part,x,y,pointer,start:runtime.now,path:0,turns:0,lastDx:0};return true;
 }
 function moveTrainingGesture(x,y,pointer=0){
  const g=runtime.training?.gesture;if(!g||g.pointer!==pointer)return false;const p=trainingPartPoint(g.part);if(!p||Math.hypot(x-p.x,y-p.y)>65){runtime.training.gesture=null;return false;}
  const dx=x-g.x,dy=y-g.y;if(Math.abs(dx)>2&&g.lastDx&&Math.sign(dx)!==Math.sign(g.lastDx))g.turns++;if(Math.abs(dx)>2)g.lastDx=dx;g.path+=Math.hypot(dx,dy);g.x=x;g.y=y;return true;
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
  tr.performance={ids:tr.queue.splice(0),start:runtime.now,index:0,height:0,duration:0,strength:tr.strength/100};tr.gesture=null;startNextTrick();return true;
 }
 function startNextTrick(){
  const tr=runtime.training,pf=tr.performance,id=pf.ids[pf.index];tr.trick={id,start:runtime.now,duration:TRICKS[id].duration*(.72+pf.strength*.4),strength:pf.strength,rewarded:false};
  tr.lastOutcome='第 '+(pf.index+1)+' / '+pf.ids.length+' 個動作 · '+TRICKS[id].name;renderer.dirty=true;
 }
 function praiseTrick(){const tr=runtime.training,q=tr?.trick;if(!q)return false;const u=(runtime.now-q.start)/q.duration;
  if(u<.52||u>.84||q.rewarded){tr.lastOutcome=u<.52?'再等一下，留意牠躍起的時機。':'這次稍晚了，再試一次。';return false;}
  q.rewarded=true;const p=state().partners.find(p=>p.uid===tr.uid);if(!p)return false;p.mastery[q.id]=Math.min(5,p.mastery[q.id]+1);const f=fishByUID(p.uid);if(f)individual(f).trust=Math.min(100,individual(f).trust+2);tr.lastOutcome=TRICKS[q.id].name+' · 熟練 '+p.mastery[q.id]+' / 5';save();say(tr.lastOutcome);return true;
 }
 function moveToward(a,b,speed,dt){const delta=V.sub(b,a),length=V.len(delta);return length<.00001?b.slice():V.add(a,V.mul(delta,Math.min(1,speed*dt/length)));}
 function movePartner(time,dt){
  const p=partner(),f=p&&fishByUID(p.uid);if(!f)return;
  const training=runtime.training&&runtime.training.uid===p.uid&&!active&&modal==='training';
  if(!training&&!state().accompany&&!runtime.partnerPos)return;
  if(runtime.partnerUID!==p.uid||!runtime.partnerPos){runtime.partnerUID=p.uid;runtime.partnerPos=f.p.slice();}
  const old=runtime.partnerPos.slice();let desired=f.p.slice(),speed=3.7;
  if(training){desired=stagePoint();speed=12;
   if(V.dist(old,desired)<.4&&runtime.training.stage==='approach'){runtime.training.stage='ready';runtime.training.lastOutcome='已靠泊。請在畫面中的嘴部／鰭部下達指令。';}
   const q=runtime.training.trick;
   if(q){const u=clamp((time-q.start)/q.duration,0,1),arc=Math.sin(u*Math.PI),mastery=p.mastery[q.id],lift=2.5+q.strength*2.8+mastery*.10;
    desired[0]+=Math.sin(u*TAU)*(.65+q.strength);desired[1]+=arc*lift;desired[2]+=(u-.5)*2.2*arc;
    runtime.partnerPos=desired;f.p=desired.slice();f.yaw=q.id==='spin'?Math.PI+.5+u*TAU*2:Math.PI+.5;f.pitch=q.id==='backflip'?-u*TAU:Math.cos(u*Math.PI)*.70;f.effort=.9;
    const pf=runtime.training.performance;pf.height=Math.max(pf.height,Math.max(0,f.p[1]));pf.duration=time-pf.start;
    if(u>=1){pf.index++;runtime.training.trick=null;if(pf.index<pf.ids.length)startNextTrick();else {
     p.lastPerformance={height:Math.round(pf.height*100)/100,duration:Math.round(pf.duration*100)/100,count:pf.ids.length};runtime.training.lastOutcome='表演完成 · 最高離水 '+p.lastPerformance.height.toFixed(1)+' m · '+p.lastPerformance.duration.toFixed(1)+' 秒 · '+pf.ids.length+' 個動作';runtime.training.performance=null;save();
    }}return;
   }
  }else if(active&&state().accompany){
   const direction=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)];
   if(runtime.riding){const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-stick[1],depth=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+verticalInput;
    speed=clamp(2.8+forward*1.6,1.0,4.8);desired=V.add(old,V.add(V.mul(direction,speed),[0,depth*1.7,0]));
   }else desired=V.add(player.p,V.add(V.mul(direction,2.2),V.add(V.mul(right,2.8),[0,.2+Math.sin(time*.63)*.18,0])));
   desired[1]=clamp(desired[1],groundHeight(desired[0],desired[2])+2.2,-1.2);desired=collide(desired);
  }else if(!training&&!active){desired=stagePoint();desired[1]=-1.6;speed=8;}
  runtime.partnerPos=moveToward(old,desired,speed,dt);f.p=runtime.partnerPos.slice();const delta=V.sub(f.p,old);
  if(V.len(delta)>.0001){f.yaw=Math.atan2(-delta[2],delta[0]);f.pitch=clamp(Math.atan2(delta[1],Math.hypot(delta[0],delta[2])),-.7,.7);}else if(training){f.yaw=Math.PI+.5;f.pitch=.65;}
  f.effort=training?.4:.6;
  if(!training&&!state().accompany&&V.dist(f.p,desired)<.1){runtime.partnerPos=null;runtime.partnerUID=null;}
 }
 function afterLife(time){
  const dt=clamp(time-(runtime.lastTime??time-1/60),0,.1);runtime.lastTime=time;runtime.now=time;
  runtime.food=runtime.food.filter(c=>time-c.born<8);
  for(const f of life){if(f.species>=8)continue;let cloud=null,distance=7;
   for(const c of runtime.food){const d=V.dist(f.p,c.p);if(d<distance&&!blocked(f.p,c.p)){distance=d;cloud=c;}}
   let current=runtime.reactions.get(f.uid);
   if(cloud){current=current||f.p.slice();const phase=(f.bioSeed||1)%97+time*.7,target=V.add(cloud.p,[Math.sin(phase)*.48,-.08+Math.cos(phase*1.3)*.20,Math.cos(phase)*.48]);const next=moveToward(current,target,1.05,dt);runtime.reactions.set(f.uid,next);const d=V.sub(next,current);f.p=next.slice();if(V.len(d)>.0001)f.yaw=Math.atan2(-d[2],d[0]);f.effort=.82;
   }else if(current){const next=moveToward(current,f.p,1.4,dt);if(V.dist(next,f.p)<.04)runtime.reactions.delete(f.uid);else {runtime.reactions.set(f.uid,next);f.p=next.slice();}}
  }
  if(runtime.foodBatch){runtime.foodBatch.visible=runtime.food.length>0;for(let i=0;i<runtime.foodNodes.length;i++){const f=runtime.foodNodes[i],c=runtime.food[Math.floor(i/24)];if(!c){f.p=[0,-500,0];continue;}const age=time-c.born,a=i*2.39996+age*.42,r=.06+((i%24)/24)*(.18+age*.038);f.p=[c.p[0]+Math.cos(a)*r,c.p[1]-.026*age+.09*Math.sin(a*1.4),c.p[2]+Math.sin(a)*r];}}
  movePartner(time,dt);
  for(const [uid,contact] of runtime.lastContact){const age=time-contact.time,f=fishByUID(uid);if(age>2.4||!f){runtime.lastContact.delete(uid);continue;}if(contact.kind==='stroke'){f.effort=.25;f.bank=Math.sin(age*3)*.06;}else {f.pitch=(f.pitch||0)+Math.sin(age*9)*.12*Math.exp(-age*3);f.effort=.7;}}

 }
 function paintHUD(){
  const hud=node('ecologyHUD');if(!hud)return;const f=chooseTarget();runtime.target=f?.uid||null;document.body.classList.toggle('ecology-tool',!!runtime.tool&&playAllowed());
  hud.classList.toggle('hidden',!playAllowed()||!(f||runtime.tool||runtime.grabbedUID||(state().accompany&&partner())));
  const name=node('ecologyTarget');name.textContent=f?SPECIES[f.species].name+' · 信任 '+Math.round(individual(f).trust)+'%':'靠近一位生物，再選輕撫或餵食';
  node('ecologyPet').classList.toggle('active',runtime.tool==='pet');node('ecologyFeed').classList.toggle('active',runtime.tool==='feed');node('ecologyRide').textContent=runtime.grabbedUID?'鬆手':'抓握同行';node('ecologyRide').classList.toggle('hidden',!runtime.grabbedUID&&!(f&&f.species>=8)&&!partner());
  node('ecologyBefriend').classList.toggle('hidden',!f||f.species!==11||state().partners.some(p=>p.uid===f.uid));
  node('ecologyWhistle').classList.toggle('hidden',!partner());
  const disc=node('ecologyTouch');disc.classList.toggle('hidden',!f||!runtime.tool||!playAllowed());
  if(f&&runtime.tool){const p=targetDisc(f);disc.style.left=p.x+'px';disc.style.top=p.y+'px';disc.style.width=disc.style.height=p.r*2+'px';disc.textContent=runtime.tool==='pet'?'來回輕撫 · 連點觸碰':f.species<8?'點一下餵食':'這位訪客不接受食物';}
 }
 function paintTraining(){
  const tr=runtime.training,show=!!tr&&modal==='training'&&!active;
  for(const part of ['mouth','fin']){const el=node('ecologyPart-'+part);if(!el)continue;const p=show&&tr.stage==='ready'&&!tr.performance?trainingPartPoint(part):null;el.classList.toggle('hidden',!p);if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';}}
  if(!show)return;const f=fishByUID(tr.uid),q=tr.trick,status=node('ecologyTrainingStatus');if(status)status.textContent=tr.stage==='approach'?'夥伴正游向船邊 · '+Math.ceil(V.dist(f.p,stagePoint()))+' m':tr.lastOutcome;
  const u=q?clamp((runtime.now-q.start)/q.duration,0,1):0,button=node('ecologyPraise');if(button){button.disabled=!q||q.rewarded||u<.52||u>.84;button.textContent=q?.rewarded?'已收到回饋':q&&u>=.52&&u<=.84?'現在！給予回饋':'留意動作時機';}
  const bar=node('ecologyTrainingBar');if(bar)bar.style.width=u*100+'%';const queue=node('ecologyQueue');if(queue)queue.textContent=tr.queue.length?tr.queue.map((id,i)=>(i+1)+'. '+TRICKS[id].name).join(' → '):'尚未排入動作（最多五個）';
  const go=node('ecologyGo');if(go)go.disabled=tr.stage!=='ready'||!!tr.performance||!tr.queue.length;const clear=node('ecologyClearQueue');if(clear)clear.disabled=!!tr.performance||!tr.queue.length;
 }
 function renderPanel(type){
  paintHUD();if(type!=='training'){runtime.training=null;paintTraining();if(typeof document!=='undefined')document.body.classList.remove('ecology-training');}if(!['ecology','partners','training'].includes(type))return false;
  document.body.classList.toggle('ecology-training',type==='training'&&!active);const s=state();
  if(type==='ecology'){
   panelTitle('FIELD NOTES / THREE LAYERS','相遇，會留下更多細節');node('panelBody').innerHTML='<p class="panel-note">靠近生物後用畫面上的輕撫手勢，或在小魚旁撒下少量食物。再次點選使用中的工具即可收起。隔一段時間重新觀察，逐步揭開三層遊戲筆記。互動皆為原創遊戲設定。</p>'+(active?'<button id="ecologyActivate" class="primary">'+(runtime.tool?'收起互動工具':'開始輕撫互動')+'</button>':'')+SPECIES.map(sp=>{const r=s.field[sp.id],n=knowledge(r);return '<article class="ecology-record"><b>'+safe(sp.name)+' <small>'+n+' / 3</small></b><p>'+safe(n?sp.hint:'第一層：安靜觀察，留下辨識線索。')+'</p><p>'+safe(n>=2?sp.detail:'第二層：至少兩次相遇，累積 14 點互動記錄。')+'</p><p>'+safe(n>=3?'個人筆記：'+Math.round(r.seconds)+' 秒觀察 · '+r.encounters+' 次相遇 · '+r.photos+' 張照片。':'第三層：至少三次相遇，累積 30 點互動記錄。')+'</p></article>';}).join('');
   if(node('ecologyActivate'))node('ecologyActivate').onclick=()=>{closePanel();setTool(runtime.tool||'pet');};
   return true;
  }
  if(type==='partners'){
   panelTitle('DOLPHIN PARTNERS','每一位，都是不同的朋友');node('panelBody').innerHTML='<p class="panel-note">先在海裡觀察海豚 6 秒，輕撫建立 18% 信任，再在身旁邀請牠同行。最多記錄三位夥伴。</p>'+s.partners.map(p=>'<article class="ecology-record"><b>'+safe(p.name)+'</b><small> '+safe(p.uid)+'</small><label>名字 <input maxlength="18" data-partner-name="'+p.uid+'" value="'+safe(p.name)+'"></label><button class="muted-btn" data-partner-select="'+p.uid+'">'+(s.selected===p.uid?'目前同行':'選為同行夥伴')+'</button><p>'+Object.entries(TRICKS).map(([id,tr])=>tr.name+' '+p.mastery[id]+'/5').join(' · ')+'</p></article>').join('')+(s.partners.length?'<button class="primary" id="ecologyAccompany">'+(s.accompany?'讓夥伴休息':'邀請選定夥伴同行')+'</button><button class="muted-btn" id="ecologyTrainingOpen">船邊訓練</button>':'<button class="primary" id="ecologyFindDolphin">標記銀翼水道</button>');
   for(const input of node('panelBody').querySelectorAll('[data-partner-name]'))input.onchange=()=>setName(input.dataset.partnerName,input.value);
   for(const b of node('panelBody').querySelectorAll('[data-partner-select]'))b.onclick=()=>{selectPartner(b.dataset.partnerSelect);renderPanel('partners');};
   if(node('ecologyAccompany'))node('ecologyAccompany').onclick=()=>{s.accompany=!s.accompany;releaseGrab();save();renderPanel('partners');};
   if(node('ecologyTrainingOpen'))node('ecologyTrainingOpen').onclick=()=>{if(active)say('返回研究船後，才能進行船邊訓練。');else oceanFeatures.open('training');};
   if(node('ecologyFindDolphin'))node('ecologyFindDolphin').onclick=()=>markPlace('wings');return true;
  }
  panelTitle('AT THE BOAT / PARTNER TRAINING','看著牠，在對的時刻回應');
  if(active||!partner()||!fishByUID(partner().uid)){node('panelBody').innerHTML='<p class="panel-note">先結識一位海豚夥伴，再返回研究船。訓練會在船旁的真實場景進行。</p><button id="ecologyPartnerOpen" class="primary">夥伴名冊</button>';node('ecologyPartnerOpen').onclick=()=>oceanFeatures.open('partners');return true;}
  if(!runtime.training||runtime.training.uid!==s.selected)beginTraining();
  node('panelBody').innerHTML='<p class="panel-note">在 '+safe(partner().name)+' 身上的圓圈操作：嘴部連點＝躍出水面；嘴部按住片刻＝後空翻；鰭部左右輕撫＝旋轉。可排入多個動作，再給 Go 訊號。</p><p id="ecologyTrainingStatus" aria-live="polite"></p><p id="ecologyQueue" class="panel-note"></p><label>指令強度 <input id="ecologyStrength" aria-label="指令強度" type="range" min="10" max="100" value="65"></label><div class="feature-toolbar"><button id="ecologyGo" class="primary">Go · 開始表演</button><button id="ecologyClearQueue" class="muted-btn">清除指令</button></div><div class="ecology-training-progress"><i id="ecologyTrainingBar"></i></div><button id="ecologyPraise" class="primary" disabled>留意動作時機</button><p class="panel-note">動作中適時回應，增加各自熟練度（各 5 級）。表演結束後記錄離水高度與時間。此處門檻與手勢配置為本作設定。</p>';
  node('ecologyGo').onclick=()=>startPerformance(Number(node('ecologyStrength').value));node('ecologyClearQueue').onclick=()=>{if(!runtime.training.performance)runtime.training.queue=[];paintTraining();};node('ecologyPraise').onclick=praiseTrick;paintTraining();return true;

 }
 function reset(){runtime.tool=null;runtime.gesture=null;runtime.food=[];runtime.reactions.clear();runtime.partnerPos=null;runtime.partnerUID=null;releaseGrab();runtime.training=null;runtime.encounter=null;runtime.lastObserved.clear();runtime.lastStroke.clear();runtime.lastTap.clear();runtime.lastContact.clear();runtime.lastTime=null;runtime.lastFeed=-100;paintTraining();if(runtime.foodBatch)runtime.foodBatch.visible=false;if(typeof document!=='undefined')document.body.classList.remove('ecology-training','ecology-tool');}
 function init(){
  if(runtime.initialized)return;runtime.initialized=true;voyage.state.companion=false;
  for(const id of persistent.seen)if(species(id)&&!state().field[id])state().field[id]={points:4,seconds:0,encounters:1,photos:0};
  const style=document.createElement('style');style.textContent=`#ecologyHUD{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center;z-index:19;padding:8px 12px;border:1px solid #b8d8c235;border-radius:18px;background:#082b32dc;backdrop-filter:blur(12px);width:max-content;max-width:calc(100vw - 28px)}#ecologyHUD button{border:1px solid #b9d7c247;border-radius:10px;padding:9px 11px;background:#16434b;color:#e8f1df;white-space:nowrap}#ecologyHUD button.active{background:#bcd4a9;color:#173732}#ecologyTarget{font-size:11px;max-width:150px;line-height:1.6}#ecologyTouch{position:fixed;transform:translate(-50%,-50%);border:1px dashed #d8e6c5ab;border-radius:50%;z-index:18;display:flex;align-items:center;justify-content:center;color:#eaf0cf;font-size:12px;text-shadow:0 2px 4px #001b22;touch-action:none;user-select:none;pointer-events:none;background:#bce8a508}.ecology-record{padding:17px 0;border-bottom:1px solid #ffffff20}.ecology-record p{font-size:13px;line-height:1.8;color:#a5bfc0}.ecology-record label{display:block;margin:14px 0}.ecology-record input{max-width:190px;background:#102f37;border:1px solid #617c75;color:#e2eddb;padding:8px;border-radius:6px}.ecology-training-progress{height:5px;background:#294a4d;margin:15px 0}.ecology-training-progress i{display:block;height:100%;background:#d2d5a2}.ecology-tricks{display:flex;gap:7px;margin:16px 0}.ecology-part{position:fixed;transform:translate(-50%,-50%);width:44px;height:44px;border:1px dashed #e2eac2;border-radius:50%;background:#133a4777;color:#f1f0d9;z-index:32;touch-action:none;user-select:none;font-size:12px}.ecology-training #welcome{visibility:hidden;pointer-events:none}.ecology-training #scrim{background:transparent;backdrop-filter:none;pointer-events:none}body:has(#photoViewer:not(.hidden)) #ecologyHUD,body:has(#photoViewer:not(.hidden)) #ecologyTouch,body:has(#cameraFrame:not(.hidden)) #ecologyHUD,body:has(#cameraFrame:not(.hidden)) #ecologyTouch,body.cinematic #ecologyHUD,body.cinematic #ecologyTouch{display:none!important}.ecology-training #panel{width:min(390px,94vw)}@media(pointer:coarse){#ecologyHUD{bottom:291px;gap:4px;padding:6px}#ecologyHUD button{padding:8px;min-width:44px;min-height:44px;font-size:11px}#ecologyTarget{display:none}}body.ecology-tool #focusCard{visibility:hidden}@media(max-height:550px) and (orientation:landscape){#ecologyHUD{top:64px;bottom:auto;gap:4px;padding:6px}#ecologyHUD button{padding:8px;min-width:44px;min-height:44px;font-size:11px}#ecologyTarget{display:none}}@media(max-width:650px){.ecology-training #panel{top:auto;bottom:8px;max-height:37vh;left:3vw;right:auto;width:94vw}}`;
  document.head.appendChild(style);const hud=document.createElement('div');hud.id='ecologyHUD';hud.className='hidden';hud.innerHTML='<span id="ecologyTarget"></span><button id="ecologyPet">輕撫</button><button id="ecologyFeed">餵食</button><button id="ecologyWhistle">哨子</button><button id="ecologyBefriend" class="hidden">邀請同行</button><button id="ecologyRide" class="hidden">抓握夥伴</button>';
  document.body.appendChild(hud);const touch=document.createElement('div');touch.id='ecologyTouch';touch.className='hidden';document.body.appendChild(touch);
  node('ecologyPet').onclick=()=>setTool('pet');node('ecologyFeed').onclick=()=>setTool('feed');node('ecologyBefriend').onclick=()=>befriend(runtime.target);node('ecologyRide').onclick=toggleRide;node('ecologyWhistle').onclick=whistle;
  const canvas=renderer.canvas;
  canvas.addEventListener('pointerdown',e=>{if(!runtime.tool||oceanFeatures.pointerCaptured())return;if(beginGesture(e.clientX,e.clientY,e.pointerId)){e.preventDefault();e.stopImmediatePropagation();canvas.setPointerCapture(e.pointerId);}},true);
  canvas.addEventListener('pointermove',e=>{if(!runtime.gesture)return;e.preventDefault();e.stopImmediatePropagation();moveGesture(e.clientX,e.clientY,e.pointerId);},true);
  canvas.addEventListener('pointerup',()=>endGesture(),true);for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>endGesture(true),true);
  for(const part of ['mouth','fin']){const el=document.createElement('button');el.id='ecologyPart-'+part;el.className='ecology-part hidden';el.textContent=part==='mouth'?'嘴部':'胸鰭';el.setAttribute('aria-label',part==='mouth'?'嘴部：連點跳躍，按住後空翻':'胸鰭：左右輕撫旋轉');document.body.appendChild(el);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(beginTrainingGesture(part,e.clientX,e.clientY,e.pointerId))el.setPointerCapture(e.pointerId);});el.addEventListener('pointermove',e=>{e.preventDefault();moveTrainingGesture(e.clientX,e.clientY,e.pointerId);});el.addEventListener('pointerup',()=>endTrainingGesture());for(const event of ['pointercancel','lostpointercapture'])el.addEventListener(event,()=>endTrainingGesture(true));}
  const g=new Geometry();g.material=0;g.shadow=false;g.sphere([0,0,0],[.019,.019,.019],[.76,.66,.42],5,4);for(let i=0;i<48;i++)runtime.foodNodes.push({p:[0,-500,0],s:[1,1,1],yaw:0,phase:i});runtime.foodBatch=renderer.batch(g,runtime.foodNodes,0,true);runtime.foodBatch.visible=false;runtime.foodBatch.maxDistance=20;
  const oldPlayer=updatePlayer;updatePlayer=function(dt){
   if(!runtime.grabbedUID||!active||modal||oceanFeatures.pointerCaptured()){oldPlayer(dt);return;}
   if(Math.hypot(...lookStick)>.04){player.yaw+=lookStick[0]*dt*1.05*settings.sensitivity;player.pitch=clamp(player.pitch-lookStick[1]*dt*.83*settings.sensitivity,-1.30,1.28);}
   const f=fishByUID(runtime.grabbedUID);if(!f){releaseGrab();return;}const forward=[Math.cos(f.yaw),0,-Math.sin(f.yaw)],offset=f.species===10?[-5,1.2]:[-1.35,.45],saddle=V.add(f.p,V.add(V.mul(forward,offset[0]),[0,offset[1],0])),old=player.p.slice();player.p=collide(moveToward(old,saddle,6,dt));player.velocity=V.mul(V.sub(player.p,old),1/Math.max(dt,.001));const distance=V.dist(old,player.p);if(distance<.3){voyage.state.distance+=distance;voyage.sessionDistance+=distance;}
  };
  const oldCamera=shipCamera;shipCamera=function(){if(runtime.training&&modal==='training'&&!active){const view=renderer.canvas.getBoundingClientRect(),wide=view.height<550&&view.width>view.height,performing=!!runtime.training.performance;eye=performing?[OPEN_WORLD.boat[0]+17,3.4,OPEN_WORLD.boat[2]+20]:[OPEN_WORLD.boat[0]+12,2.2,OPEN_WORLD.boat[2]+12];target=[OPEN_WORLD.boat[0]+9+(wide?(performing?5:3):0),performing?1.5:.5,OPEN_WORLD.boat[2]+6];diverBatch.visible=false;cameraCut=true;}else oldCamera();};
  if(node('companionBtn'))node('companionBtn').onclick=()=>oceanFeatures.open('partners');
  const oldSpecies=renderSpecies;renderSpecies=function(index){oldSpecies(index);const sp=SPECIES[index],record=state().field[sp.id],level=knowledge(record),rows=node('panelBody').querySelectorAll('.info-row');
   if(rows[0]&&level<1)rows[0].querySelector('p').textContent='靠近牠安靜觀察，解開第一層辨識線索。';
   if(rows[1]&&level<2)rows[1].querySelector('p').textContent='再次相遇，透過觀察與互動解開第二層筆記。';
   const note=document.createElement('div');note.className='ecology-record';note.innerHTML='<b>觀察筆記 '+level+' / 3</b><p>'+safe(level>=3?'你的紀錄：'+Math.round(record.seconds)+' 秒觀察、'+record.encounters+' 次相遇、'+record.photos+' 張照片。':'第一層 4 點；第二層 14 點與兩次相遇；第三層 30 點與三次相遇。')+'</p>';node('panelBody').appendChild(note);
  };

  oceanFeatures.addMenu({id:'ecology',label:'生物互動筆記',panel:'ecology'});oceanFeatures.addMenu({id:'partners',label:'海豚夥伴',panel:'partners'});oceanFeatures.addMenu({id:'training',label:'船邊訓練',panel:'training'});
 }
 const hooks={id:'ecology',initial,sanitize,init,renderPanel,reset,afterLife,
  panelChanged(type){if(type!=='training'){runtime.training=null;document.body.classList.remove('ecology-training');}paintHUD();paintTraining();},
  panelClosed(){runtime.training=null;document.body.classList.remove('ecology-training');paintHUD();paintTraining();},
  startDive(){runtime.training=null;releaseGrab();paintTraining();state().dives++;voyage.state.companion=false;runtime.encounter=null;runtime.lastObserved.clear();document.body.classList.remove('ecology-training');},
  endDive(){releaseGrab();runtime.tool=null;document.body.classList.remove('ecology-tool');runtime.gesture=null;runtime.encounter=null;runtime.food=[];node('ecologyHUD')?.classList.add('hidden');node('ecologyTouch')?.classList.add('hidden');save();},
  tick(dt){if(!playAllowed()){runtime.gesture=null;paintHUD();return;}observeTarget(dt);runtime.uiClock+=dt;if(runtime.uiClock>.12){runtime.uiClock=0;paintHUD();}},
  idleTick(){if(modal!=='training'&&runtime.training){runtime.training=null;document.body.classList.remove('ecology-training');}paintTraining();},
  shouldAnimate(){return !!runtime.training&&!active&&modal==='training';},
  escape(){if(runtime.grabbedUID){releaseGrab();return true;}if(runtime.tool){runtime.tool=null;runtime.gesture=null;paintHUD();return true;}return false;},
  pointerCaptured(){return !!runtime.gesture||!!runtime.training?.gesture;},
  onPhoto(photo){const f=fishByUID(photo.individual);if(f&&inRange(f)){field(f).photos++;addKnowledge(f,1.5);save();}}
 };
 oceanFeatures.register(hooks);
 return {initial,sanitize,state,knowledge,inRange,setTool,beginGesture,moveGesture,endGesture,feedAt,befriend,selectPartner,setName,toggleRide,grabAnimal,whistle,beginTraining,commandTrick,queueGesture,trainingPartPoint,beginTrainingGesture,moveTrainingGesture,endTrainingGesture,startPerformance,praiseTrick,afterLife,hooks,snapshot:()=>({tool:runtime.tool,food:runtime.food.length,target:runtime.target,riding:runtime.riding,grabbedUID:runtime.grabbedUID,training:runtime.training,partnerPosition:runtime.partnerPos?.slice(),now:runtime.now})};
})();
