/* A walkable, original research boat. Coordinates are relative to the actual
 * researchVessel mesh; no duplicate boat, image backdrop or underwater teleport.
 * Walking speed, visitor schedule and accessory unlocks are authored game rules. */
const oceanShip=(()=>{
 'use strict';
 const YAW=-.14,FLOOR=.68,RADIUS=.29,SPEED=1.65;
 const skins={warm:[.70,.49,.34],light:[.87,.68,.51],deep:[.35,.22,.16]};
 const hairs={dark:[.065,.045,.031],brown:[.25,.13,.063],silver:[.58,.60,.59]};
 const builds={slim:.88,regular:1,broad:1.13};
 const stations=[
  {id:'cabin',name:'船艙',p:[0,1.45,1.84],approach:[0,2.15]},
  {id:'companion',name:'船伴 澄',p:[-.66,1.75,2.80],approach:[0,2.85]},
  {id:'notice',name:'告示板',p:[-1.08,1.40,1.88],approach:[-1.03,2.11]},
  {id:'collection',name:'收藏箱',p:[-1.3,1.05,4.78],approach:[-.36,4.35]},
  {id:'chair',name:'躺椅',p:[1.25,1.07,4.91],approach:[.28,4.60]},
  {id:'visitor',name:'動物訪客',p:[-.90,1.25,-4.65],approach:[.52,-4.55]},
  {id:'dive',name:'下水平台',p:[0,.75,6.03],approach:[0,5.55]}
 ];
 // Collision covers visible cabin, cylinders, furniture, NPC and visitor berth.
 const obstacles=[[-1.75,1.75,-3.35,1.75],[-1.81,-.79,4.40,5.17],[.69,1.80,4.25,5.65],[-.90,-.42,2.55,3.03],[-1.52,-.29,-5.12,-4.17]];
 for(const s of [-1,1])for(let i=0;i<3;i++)obstacles.push([s*1.33-.17,s*1.33+.17,2.7+i*.65-.17,2.7+i*.65+.17]);
 const width=z=>2.85*Math.pow(Math.max(0,Math.sin(Math.PI*(z/15.8+.5))),.32);
 function walkable(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[1]>=-6.05&&p[1]<=5.84&&Math.abs(p[0])<=width(p[1])-.32&&!obstacles.some(b=>p[0]>b[0]-RADIUS&&p[0]<b[1]+RADIUS&&p[1]>b[2]-RADIUS&&p[1]<b[3]+RADIUS);}
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 function clearLine(a,b){const n=Math.ceil(distance(a,b)/.06);for(let i=0;i<=n;i++)if(!walkable([mix(a[0],b[0],n?i/n:0),mix(a[1],b[1],n?i/n:0)]))return false;return true;}
 function planRoute(from,to){
  if(!walkable(from)||!walkable(to))return null;if(clearLine(from,to))return [to.slice()];
  const nodes=[from.slice(),to.slice()];
  for(const b of obstacles)for(const x of [b[0]-RADIUS-.025,b[1]+RADIUS+.025])for(const z of [b[2]-RADIUS-.025,b[3]+RADIUS+.025])if(walkable([x,z]))nodes.push([x,z]);
  const n=nodes.length,cost=Array(n).fill(Infinity),previous=Array(n).fill(-1),done=Array(n).fill(false);cost[0]=0;
  for(let step=0;step<n;step++){let at=-1;for(let i=0;i<n;i++)if(!done[i]&&(at<0||cost[i]<cost[at]))at=i;if(at<0||!Number.isFinite(cost[at]))break;if(at===1){const route=[];for(let i=1;i!==0;i=previous[i])route.unshift(nodes[i]);return route;}done[at]=true;
   for(let j=1;j<n;j++)if(!done[j]){const next=cost[at]+distance(nodes[at],nodes[j]);if(next<cost[j]&&clearLine(nodes[at],nodes[j])){cost[j]=next;previous[j]=at;}}
  }return null;
 }
 function toWorld(p){const c=Math.cos(YAW),s=Math.sin(YAW),b=OPEN_WORLD.boat;return [b[0]+p[0]*c+p[2]*s,b[1]+p[1],b[2]-p[0]*s+p[2]*c];}
 function toLocal(p){const b=OPEN_WORLD.boat,x=p[0]-b[0],z=p[2]-b[2],c=Math.cos(YAW),s=Math.sin(YAW);return [x*c-z*s,p[1]-b[1],x*s+z*c];}
 const initial=()=>({schema:1,p:[0,4.10],yaw:Math.PI,appearance:{name:'海的旅人',skin:'warm',hair:'dark',build:'regular',accessory:'none'},visited:[],talks:[],distance:0,visitor:{day:0,kind:null,trust:0}});
 const number=(v,hi=1e6)=>Number.isFinite(v)?clamp(v,0,hi):0;
 const name=v=>String(v||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,18)||'海的旅人';
 function sanitize(raw){const s=initial();if(!raw||typeof raw!=='object')return s;
  if(walkable(raw.p))s.p=raw.p.slice();s.yaw=Number.isFinite(raw.yaw)?raw.yaw%TAU:Math.PI;s.distance=number(raw.distance);
  const a=raw.appearance||{};s.appearance={name:name(a.name),skin:Object.hasOwn(skins,a.skin)?a.skin:'warm',hair:Object.hasOwn(hairs,a.hair)?a.hair:'dark',build:Object.hasOwn(builds,a.build)?a.build:'regular',accessory:['none','cap','badge'].includes(a.accessory)?a.accessory:'none'};
  for(const key of ['visited','talks'])s[key]=Array.isArray(raw[key])?[...new Set(raw[key].filter(id=>(key==='visited'?stations.map(s=>s.id):['welcome','next','mail']).includes(id)))]:[];
  const v=raw.visitor||{};s.visitor={day:Math.floor(number(v.day,9999)),kind:['seal','penguin'].includes(v.kind)?v.kind:null,trust:Math.floor(number(v.trust,20))};return s;
 }
 const state=()=>oceanFeatures.state('ship'),node=id=>typeof document==='undefined'?null:document.getElementById(id);
 const runtime={initialized:false,mode:null,route:[],pending:null,elapsed:0,step:0,turn:0,gesture:null,visitorReply:-100,restIdle:false,camera:null,parts:[],props:null,cabin:null,seal:null,penguin:null,underwater:[],arrow:null};
 const save=()=>saveVoyage(),say=text=>{if(typeof toast==='function')toast(text)};
 function accessoryAllowed(id){return id==='none'||id==='cap'&&persistent.seen.length>=3||id==='badge'&&Object.values(voyage.state.features?.expedition?.mail||{}).some(m=>m.status==='complete');}
 function setAppearance(key,value){if(active)return false;const a=state().appearance;if(key==='name')a.name=name(value);else if(key==='skin'&&Object.hasOwn(skins,value)||key==='hair'&&Object.hasOwn(hairs,value)||key==='build'&&Object.hasOwn(builds,value)||key==='accessory'&&accessoryAllowed(value))a[key]=value;else return false;save();syncActors();return true;}
 function syncVisitor(){const s=state(),day=voyage.state.features?.expedition?.day||1,kind=voyage.state.dives>0?(day%2?'seal':'penguin'):null;if(s.visitor.day!==day||s.visitor.kind!==kind){s.visitor={day,kind,trust:0};save();}return s.visitor;}
 const modeAllowed=()=>!active&&runtime.mode&&['deck','cabin','shipRest','shipAppearance','shipDialogue','shipNotice'].includes(modal);
 function leave(){
  const was=runtime.mode;runtime.mode=null;runtime.route=[];runtime.pending=null;runtime.gesture=null;runtime.restIdle=false;
  if(runtime.camera){Object.assign(renderer,runtime.camera);runtime.camera=null;renderer.dirty=true;cameraCut=true;}
  for(const item of runtime.parts)item.batch.visible=false;for(const b of [runtime.cabin,runtime.seal,runtime.penguin,runtime.arrow])if(b)b.visible=false;
  for(const id of ['shipWalkUI','shipRestUI','shipPoint','shipBackCabin'])node(id)?.classList.add('hidden');
  if(typeof document!=='undefined')document.body.classList.remove('ship-view','ship-deck','ship-cabin','ship-rest','ship-appearance','ship-idle');
  if(was)save();
 }
 function enter(mode){if(active)return false;leave();runtime.mode=mode;runtime.camera={photoFov:renderer.photoFov,photoAperture:renderer.photoAperture,photoFocus:renderer.photoFocus,exposure:renderer.exposure};renderer.photoAperture=0;renderer.photoFov=mode==='cabin'?67:mode==='appearance'?48:58;renderer.dirty=true;cameraCut=true;syncVisitor();
  if(!walkable(state().p))state().p=[0,4.10];if(runtime.initialized){document.body.classList.add('ship-view','ship-'+mode);syncActors();paint();}return true;
 }
 function walkTo(p,station=null){if(runtime.mode!=='deck'||active||modal!=='deck')return false;const route=planRoute(state().p,p);if(!route){say('這裡無法落腳，請選甲板上的空位。');return false;}runtime.route=route;runtime.pending=station;runtime.gesture=null;paint();return true;}
 function walkToStation(id){const station=stations.find(s=>s.id===id);if(!station||id==='visitor'&&!state().visitor.kind)return false;return walkTo(station.approach,id);}
 function arrived(){const id=runtime.pending;runtime.pending=null;save();if(id)interact(id);}
 function advance(dt){if(!modeAllowed())return;dt=clamp(dt,0,.1);runtime.elapsed+=dt;
  if(runtime.mode==='deck'&&runtime.route.length){let budget=SPEED*dt;while(budget>0&&runtime.route.length){const s=state(),goal=runtime.route[0],d=distance(s.p,goal),step=Math.min(d,budget);if(d>.0001){s.yaw=Math.atan2(-(goal[1]-s.p[1]),goal[0]-s.p[0]);s.p=[mix(s.p[0],goal[0],step/d),mix(s.p[1],goal[1],step/d)];s.distance+=step;runtime.step+=step*7;}budget-=step;if(d<=step+.00001)runtime.route.shift();else break;}if(!runtime.route.length)arrived();}
  syncActors();paint();
 }
 function mark(id){if(!state().visited.includes(id)){state().visited.push(id);save();}}
 function openFromCabin(type,tab,returnTo='cabin'){openPanel(type);if(tab)renderJournal(tab);const back=node('shipBackCabin');if(back){back.textContent=returnTo==='deck'?'← 回到甲板':'← 回到船艙';back.classList.remove('hidden');back.onclick=()=>oceanFeatures.open(returnTo);}}
 function interact(id){const st=stations.find(s=>s.id===id);if(runtime.mode!=='deck'||active||!st||distance(state().p,st.approach)>.20)return false;mark(id);
  if(id==='cabin')oceanFeatures.open('cabin');else if(id==='companion')oceanFeatures.open('shipDialogue');else if(id==='notice')oceanFeatures.open('shipNotice');else if(id==='collection'){openFromCabin('exploration',null,'deck');node('panelBody').querySelector('[data-explore-tab="salvage"]')?.click();}else if(id==='chair')oceanFeatures.open('shipRest');else if(id==='visitor'){if(!state().visitor.kind)return false;say('試著在訪客身上來回輕撫，看看牠的回應。');}else if(id==='dive'){closePanel();startDive(false);}return true;
 }
 function screenPoint(local){if(!renderer.vp||!renderer.canvas)return null;const p=project(toWorld(local),renderer.vp),r=renderer.canvas.getBoundingClientRect();return p[2]>0?{x:r.left+(p[0]*.5+.5)*r.width,y:r.top+(.5-p[1]*.5)*r.height}:null;}
 function deckPoint(x,y){if(!renderer.vp||!renderer.canvas)return null;const r=renderer.canvas.getBoundingClientRect(),px=(x-r.left)/r.width*2-1,py=1-(y-r.top)/r.height*2,m=inverse4(renderer.vp);
  const unproject=z=>{const w=m[3]*px+m[7]*py+m[11]*z+m[15];return [(m[0]*px+m[4]*py+m[8]*z+m[12])/w,(m[1]*px+m[5]*py+m[9]*z+m[13])/w,(m[2]*px+m[6]*py+m[10]*z+m[14])/w]};
  const a=unproject(-1),b=unproject(1),dy=b[1]-a[1];if(Math.abs(dy)<1e-8)return null;const u=(OPEN_WORLD.boat[1]+FLOOR-a[1])/dy;if(u<0)return null;const p=toLocal(V.lerp(a,b,u));return walkable([p[0],p[2]])?[p[0],p[2]]:null;
 }
 function beginVisitor(x,y,pointer){const st=stations.find(s=>s.id==='visitor'),p=screenPoint(st.p);if(runtime.mode!=='deck'||!state().visitor.kind||distance(state().p,st.approach)>.7||!p||Math.hypot(x-p.x,y-p.y)>65)return false;runtime.gesture={pointer,x,y,path:0,turns:0,dx:0,start:runtime.elapsed};return true;}
 function moveVisitor(x,y,pointer){const g=runtime.gesture,p=screenPoint(stations.find(s=>s.id==='visitor').p);if(!g||g.pointer!==pointer||!p||Math.hypot(x-p.x,y-p.y)>90){runtime.gesture=null;return false;}const dx=x-g.x,step=Math.hypot(dx,y-g.y);if(step>80){runtime.gesture=null;return false;}if(Math.abs(dx)>2&&g.dx&&Math.sign(dx)!==Math.sign(g.dx))g.turns++;if(Math.abs(dx)>2)g.dx=dx;g.path+=step;g.x=x;g.y=y;
  if(g.path>=60&&g.turns>0&&runtime.elapsed-g.start>.45&&runtime.elapsed-runtime.visitorReply>2){state().visitor.trust=Math.min(20,state().visitor.trust+1);runtime.visitorReply=runtime.elapsed;runtime.gesture=null;save();say(state().visitor.kind==='seal'?'海豹抬起頭，輕輕拍了拍前鰭。':'企鵝搖了搖身體，張開了短短的翅膀。');return true;}return false;
 }
 function avatarMeshes(){
  const make=fn=>{const g=new Geometry();g.material=0;fn(g);return g;},white=[1,1,1];
  return {
   suit:make(g=>{g.sphere([0,1.10,0],[.17,.32,.27],white,16,12);g.sphere([0,.80,0],[.16,.15,.24],white,12,9);}),
   head:make(g=>{g.sphere([0,1.56,0],[.16,.21,.16],white,20,14);g.sphere([.145,1.55,0],[.04,.035,.045],white,10,6);for(const s of [-1,1]){g.sphere([.126,1.60,s*.095],[.026,.022,.026],[.028,.032,.031],8,6);g.sphere([0,1.57,s*.155],[.040,.065,.035],white,10,7);}}),
   hair:make(g=>g.sphere([-.045,1.68,0],[.145,.112,.168],white,16,10)),
   leg:make(g=>{g.tube([0,0,0],[0,-.61,0],.10,.068,white,10);g.sphere([.052,-.65,0],[.16,.07,.09],[.035,.058,.062],12,8);}),
   arm:make(g=>g.tube([0,0,0],[0,-.46,0],.065,.047,white,10)),
   hand:make(g=>g.sphere([0,-.49,0],[.06,.075,.055],white,10,7)),
   cap:make(g=>{g.sphere([0,1.74,0],[.19,.07,.20],white,16,8);g.box([.18,1.72,0],[.22,.018,.33],white);}),
   badge:make(g=>{g.box([.157,1.18,-.11],[.014,.14,.10],white);g.sphere([.17,1.19,-.11],[.012,.038,.035],[.96,.89,.58],8,6);})
  };
 }
 function visitorGeometry(kind){const g=new Geometry();g.material=0;const dark=[.075,.092,.093],light=[.80,.79,.72];
  if(kind==='seal'){const gray=[.40,.44,.43];g.sphere([0,.34,0],[.60,.28,.30],gray,24,16);g.sphere([.49,.47,0],[.23,.24,.24],gray,20,14);g.sphere([.68,.44,0],[.11,.09,.13],[.54,.55,.51],14,9);g.sphere([.755,.48,0],[.022,.026,.047],dark,9,6);for(const s of [-1,1]){g.sphere([.60,.55,s*.166],[.03,.03,.017],dark,10,7);g.sphere([.1,.17,s*.34],[.25,.045,.16],gray,14,8);g.sphere([-.60,.18,s*.13],[.22,.046,.13],gray,14,8);for(let i=0;i<3;i++)g.tube([.68,.445,s*.07],[.79,.45+(i-1)*.015,s*(.20+i*.035)],.002,.001,light,3);}}
  else {g.sphere([0,.51,0],[.24,.44,.25],dark,24,16);g.sphere([.147,.51,0],[.115,.32,.20],light,20,12);g.sphere([.015,.95,0],[.20,.20,.20],dark,20,14);g.sphere([.185,.91,0],[.13,.065,.07],[.77,.43,.15],14,8);for(const s of [-1,1]){g.sphere([.139,.998,s*.102],[.025,.027,.02],[.88,.90,.83],10,7);g.sphere([.152,.998,s*.114],[.012,.014,.01],dark,8,6);g.sphere([-.03,.53,s*.252],[.13,.32,.047],dark,14,10);g.sphere([.10,.085,s*.135],[.19,.045,.10],[.73,.40,.15],14,8);}}
  return g;
 }
 function propGeometry(){const g=new Geometry();g.material=12;const wood=[.35,.26,.17],cream=[.79,.82,.72],metal=[.26,.37,.36];
  g.box([-1.30,.91,4.78],[1,.46,.74],wood);g.box([-1.30,1.17,4.78],[1.06,.06,.79],cream);for(const x of [-1.70,-.9])g.box([x,.91,5.17],[.045,.40,.018],metal);g.box([-1.30,.99,5.18],[.15,.10,.045],[.72,.61,.37]);
  g.box([1.24,.91,4.84],[.80,.08,1.28],cream);g.box([1.24,1.19,4.29],[.80,.64,.09],cream);for(const x of [.90,1.60])for(const z of [4.39,5.38])g.tube([x,FLOOR,z],[x,.95,z],.024,.024,metal,7);for(const z of [4.46,4.68,4.90,5.12,5.34])g.box([1.24,.958,z],[.72,.015,.06],[.23,.43,.46]);
  g.box([-1.09,1.39,1.814],[.85,.66,.055],wood);g.box([-1.09,1.39,1.848],[.72,.54,.015],[.76,.74,.57]);for(let i=0;i<3;i++)g.box([-1.12,1.57-i*.16,1.862],[.46,.025,.01],[.29,.40,.38]);
  // Cabin desks remain physically inside the existing cabin walls and roof.
  return g;
 }
 const cabinObjects=[
  {id:'navigation',name:'航海圖',detail:'選擇停泊海域',p:[-1.10,1.15,-2.5]},
  {id:'appearance',name:'衣櫃',detail:'外觀與裝備',p:[1.28,1.18,-2.55]},
  {id:'photography',name:'沖印桌',detail:'選片沖印收藏',p:[-1.10,1.15,-1.5]},
  {id:'album',name:'相簿',detail:'重看已收藏照片',p:[1.10,1.15,-1.5]},
  {id:'clock',name:'時鐘',detail:'晨光、夕照與夜潛',p:[-.8,1.70,-3.30]},
  {id:'mail',name:'信箱',detail:'收信與回覆委託',p:[1.10,1.15,-.5]},
  {id:'guide',name:'圖鑑',detail:'查看觀察筆記',p:[-1.10,1.15,-.5]},
  {id:'save',name:'航海日誌',detail:'手動保存航程',p:[0,1.15,-2.6]}
 ];
 function cabinGeometry(){
  const g=new Geometry();g.material=12;const wood=[.35,.24,.16],paper=[.79,.81,.69],navy=[.10,.23,.28],brass=[.59,.43,.20];
  for(const x of [-1.22,1.22]){g.box([x,1.0,-1.1],[.79,.10,3.25],wood);for(const z of [-2.5,.15])g.box([x,.80,z],[.60,.45,.10],wood);}
  for(const o of cabinObjects){const [x,y,z]=o.p;
   if(o.id==='appearance'){g.box([x,1.36,z],[.64,1.35,.50],[.20,.34,.33]);g.box([x,1.36,z+.256],[.59,1.25,.015],wood);for(const side of [-1,1])g.sphere([x+side*.06,1.32,z+.285],[.018,.045,.016],brass,8,6);}
   else if(o.id==='clock'){g.sphere([x,y,z+.018],[.245,.245,.023],brass,24,16);g.sphere([x,y,z+.043],[.211,.211,.012],paper,24,16);for(let n=0;n<12;n++){const a=n*TAU/12;g.sphere([x+Math.sin(a)*.18,y+Math.cos(a)*.18,z+.058],[.01,.01,.005],navy,6,4);}g.tube([x,y,z+.063],[x+.11,y+.02,z+.063],.012,.009,navy,6);g.tube([x,y,z+.065],[x-.035,y+.14,z+.065],.009,.006,navy,6);}
   else if(o.id==='navigation'){g.box([x,1.066,z],[.61,.024,.60],paper);for(const side of [-1,1])g.tube([x+side*.30,1.08,z-.31],[x+side*.30,1.08,z+.31],.035,.035,paper,12);for(let i=0;i<5;i++){g.tube([x-.23,1.080,z-.22+i*.10],[x+.22,1.080,z-.12+i*.07],.007,.007,[.16,.44,.47],4);}g.sphere([x+.18,1.088,z+.18],[.035,.004,.035],brass,12,6);}
   else if(o.id==='photography'){g.box([x,1.09,z],[.61,.07,.43],navy);g.box([x,1.13,z],[.54,.025,.36],[.22,.45,.46]);g.box([x-.07,1.153,z],[.30,.012,.22],paper);g.box([x+.07,1.24,z-.27],[.27,.20,.13],navy);g.tube([x+.07,1.24,z-.22],[x+.07,1.24,z-.12],.078,.072,[.08,.10,.11],16);g.sphere([x+.07,1.24,z-.11],[.064,.064,.012],[.19,.47,.52],12,8);}
   else if(o.id==='album'){g.box([x,1.105,z],[.55,.09,.57],[.22,.33,.47]);g.box([x,1.154,z],[.51,.013,.53],paper);for(const side of [-1,1])for(const row of [-1,1]){g.box([x+side*.125,1.166,z+row*.125],[.205,.007,.20],[.12,.32,.37]);g.box([x+side*.125,1.173,z+row*.125],[.165,.005,.14],[.31,.58,.58]);}g.tube([x,1.17,z-.255],[x,1.17,z+.255],.009,.009,wood,6);}
   else if(o.id==='mail'){g.box([x,1.22,z-.15],[.49,.35,.07],[.48,.22,.15]);for(let n=0;n<3;n++){g.box([x,1.10+n*.095,z+.025-n*.035],[.48,.025,.31],wood);g.box([x+.02,1.13+n*.095,z-.015-n*.035],[.34,.022,.25],paper);}g.box([x+.09,1.346,z-.095],[.07,.005,.07],[.65,.20,.12]);}
   else if(o.id==='guide'){for(let n=0;n<4;n++){g.box([x-.20+n*.135,1.29,z],[.105,.46,.32],[[.19,.40,.37],[.29,.44,.51],[.49,.35,.20],[.48,.29,.26]][n]);g.box([x-.20+n*.135,1.29,z+.167],[.065,.11,.014],paper);}}
   else {g.box([x,1.105,z],[.48,.08,.50],[.26,.16,.11]);g.box([x,1.153,z],[.43,.014,.46],paper);for(let n=0;n<5;n++)g.box([x,1.164,z-.16+n*.07],[.31,.004,.008],navy);g.tube([x+.28,1.065,z-.23],[x+.20,1.065,z+.22],.012,.008,brass,7);}
  }
  g.box([0,1.04,-2.65],[.75,.09,.65],wood);for(const x of [-.28,.28])g.box([x,.79,-2.65],[.07,.5,.50],wood);return g;
 }
 function createActors(){const meshes=avatarMeshes();for(const [part,g] of Object.entries(meshes)){const instances=[];for(let a=0;a<2;a++)for(let side=0;side<(['leg','arm','hand'].includes(part)?2:1);side++)instances.push({p:[0,-1000,0],s:[1,1,1],yaw:0,actor:a,side:side?1:-1});const batch=renderer.batch(g,instances,0,true);batch.visible=false;batch.shipActor='avatar-'+part;runtime.parts.push({part,batch});}
  runtime.props=renderer.batch(propGeometry(),[{p:OPEN_WORLD.boat.slice(),yaw:YAW}],0,true);runtime.props.shipAttachment=true;
  runtime.cabin=renderer.batch(cabinGeometry(),[{p:OPEN_WORLD.boat.slice(),yaw:YAW}],0,true);runtime.cabin.visible=false;
  for(const kind of ['seal','penguin']){runtime[kind]=renderer.batch(visitorGeometry(kind),[{p:[0,-1000,0],yaw:YAW,s:[1,1,1]}],0,true);runtime[kind].visible=false;runtime[kind].shipActor=kind;}
  const marker=new Geometry();marker.material=0;marker.sphere([0,0,0],[.09,.02,.09],[.89,.79,.39],12,6);runtime.arrow=renderer.batch(marker,[{p:[0,-1000,0]}],0,true);runtime.arrow.visible=false;
  for(const part of ['head','hair','cap','badge']){const g=new Geometry();g.material=0;
   if(part==='head'){g.sphere([0,.05,-.86],[.225,.225,.245],[1,1,1],20,14);g.box([0,.07,-1.11],[.39,.17,.035],[.25,.55,.59]);}
   if(part==='hair')g.sphere([0,.09,-.72],[.215,.18,.15],[1,1,1],16,10);
   if(part==='cap'){g.sphere([0,.14,-.87],[.23,.13,.25],[1,1,1],16,10);g.box([0,.11,-1.10],[.36,.025,.19],[1,1,1]);}
   if(part==='badge')g.box([-.31,.11,-.32],[.13,.05,.11],[.88,.71,.29]);
   const b=renderer.batch(g,[{p:[0,-1000,0],s:[.85,.85,.85]}],0,true);b.visible=false;runtime.underwater.push({part,batch:b});}
 }
 function syncActors(){if(!runtime.initialized)return;const visible=!!runtime.mode&&!active,s=state(),outfit=typeof oceanExpedition==='undefined'?[1,1,1]:(oceanExpedition.palettes?.[voyage.state.features.expedition.outfit]?.tint||diverBatch?.instances[0]?.tint||[1,1,1]);
  for(const {part,batch} of runtime.parts){batch.visible=visible&&runtime.mode!=='cabin'&&runtime.mode!=='rest';for(const f of batch.instances){const npc=f.actor===1,p=npc?[-.66,2.80]:runtime.mode==='appearance'?[0,5.55]:s.p,a=s.appearance,base=npc?[-.66,FLOOR,2.80]:[p[0],FLOOR,p[1]],yaw=npc?Math.atan2(-(s.p[1]-p[1]),s.p[0]-p[0]):runtime.mode==='appearance'?-Math.PI/2:s.yaw,side=f.side,walk=!npc&&runtime.route.length>0?Math.sin(runtime.step)*.50:0,offset=part==='leg'?[0,.75,side*.15]:part==='arm'||part==='hand'?[0,1.28,side*.23]:[0,0,0];
    const c=Math.cos(yaw),sn=Math.sin(yaw);f.p=toWorld([base[0]+offset[0]*c+offset[2]*sn,base[1]+offset[1],base[2]-offset[0]*sn+offset[2]*c]);f.yaw=YAW+yaw;f.pitch=part==='leg'?walk*side:part==='arm'||part==='hand'?-walk*side:0;const scale=npc?1:builds[a.build];f.s=[scale,1,scale];f.tint=part==='head'||part==='hand'?(npc?skins.light:skins[a.skin]):part==='hair'?(npc?hairs.silver:hairs[a.hair]):part==='suit'||part==='leg'||part==='arm'?(npc?[.72,.58,.34]:[.12*outfit[0],.27*outfit[1],.31*outfit[2]]):part==='cap'?[.54,.72,.70]:[.89,.73,.39];
    if(npc&&runtime.mode==='appearance'||part==='cap'&&(npc||a.accessory!=='cap'||!accessoryAllowed('cap'))||part==='badge'&&(npc||a.accessory!=='badge'||!accessoryAllowed('badge')))f.p[1]=-1000;
   }}
  runtime.props.instances[0].p=OPEN_WORLD.boat.slice();runtime.cabin.instances[0].p=OPEN_WORLD.boat.slice();runtime.cabin.visible=visible&&runtime.mode==='cabin';
  for(const kind of ['seal','penguin']){const b=runtime[kind];b.visible=visible&&runtime.mode!=='cabin'&&s.visitor.kind===kind;const age=runtime.elapsed-runtime.visitorReply,q=age<2?Math.sin(age*7)*Math.exp(-age*1.4):0;b.instances[0].p=toWorld([-.90,FLOOR+(kind==='penguin'?Math.abs(q)*.12:0),-4.65]);b.instances[0].yaw=YAW+Math.sin(runtime.elapsed*.65)*.1;b.instances[0].pitch=kind==='seal'?q*.13:q*.08;b.instances[0].s=[1,1+Math.sin(runtime.elapsed*1.2)*.012,1];}
  runtime.arrow.visible=visible&&runtime.mode==='deck'&&runtime.route.length>0;if(runtime.arrow.visible){const p=runtime.route.at(-1);runtime.arrow.instances[0].p=toWorld([p[0],FLOOR+.025,p[1]]);}
 }
 function afterCamera(){if(!runtime.initialized)return;const a=state().appearance,d=typeof diverBatch!=='undefined'&&diverBatch?.instances[0];for(const {part,batch} of runtime.underwater){batch.visible=!!d&&active&&settings.third&&diverBatch.visible&&(part==='head'||part==='hair'||a.accessory===part&&accessoryAllowed(part));if(batch.visible){const f=batch.instances[0];f.p=d.p.slice();f.yaw=d.yaw;f.pitch=d.pitch;f.s=d.s?.slice()||[.85,.85,.85];f.tint=part==='head'?skins[a.skin]:part==='hair'?hairs[a.hair]:[.54,.72,.70];}}if(runtime.mode)paint();}
 function boatMoved(){if(!runtime.initialized)return;syncActors();renderer.dirty=true;cameraCut=true;}
 function camera(){const mode=runtime.mode;if(!mode||active)return false;let a,b;const portrait=renderer.canvas.clientWidth<renderer.canvas.clientHeight;
  if(mode==='cabin'){a=[0,1.95,1.44];b=[0,1.18,-2.1];}
  else if(mode==='rest'){const u=settings.reduced?0:Math.sin(runtime.elapsed*.035)*.12;a=[1.24,1.48,4.8];b=[11+Math.sin(u)*7,.7,16];}
  else if(mode==='appearance'){const shift=renderer.canvas.clientHeight<550?1.35:.75;a=portrait?[0,3.2,11.3]:[shift,2.25,8.8];b=portrait?[0,.25,5.55]:[shift,1.65,5.55];}
  else if(distance(state().p,stations.find(s=>s.id==='visitor').approach)<1.1){a=[3.5,4.5,-8.8];b=[-.40,1.18,-4.55];}
  else if(modal==='shipDialogue'){a=[3.9,4.1,7.2];b=[-.65,1.50,2.80];}
  else {const angle=runtime.turn,a0=portrait?[3.4,12.8,13.7]:[6.7,12.8,12.4];a=[a0[0]*Math.cos(angle)+a0[2]*Math.sin(angle),a0[1],-a0[0]*Math.sin(angle)+a0[2]*Math.cos(angle)];b=[0,.85,.1];}
  eye=toWorld(a);target=toWorld(b);diverBatch.visible=false;cameraCut=true;return true;
 }
 function paint(){if(!runtime.initialized)return;const deck=runtime.mode==='deck'&&!active&&modal==='deck',rest=runtime.mode==='rest'&&!active&&modal==='shipRest';node('shipWalkUI').classList.toggle('hidden',!deck);node('shipRestUI').classList.toggle('hidden',!rest);node('shipPoint').classList.add('hidden');
  if(deck){const s=state(),near=stations.filter(st=>st.id!=='visitor'||s.visitor.kind).find(st=>distance(s.p,st.approach)<.21),moving=runtime.route.length>0;node('shipWalkStatus').textContent=moving?'沿甲板走向目的地…':near?near.id==='visitor'?'在訪客身上來回輕撫，牠會回應。':near.name+' · 點下方按鈕互動':'點選甲板空位行走，或選擇要靠近的物件。';node('shipInteract').disabled=!near||moving;node('shipInteract').textContent=near?(near.id==='visitor'?'觀察訪客':near.name):'靠近物件';node('shipInteract').onclick=()=>near&&interact(near.id);const option=node('shipStation').querySelector('option[value="visitor"]');if(option)option.disabled=!s.visitor.kind;
   const selected=runtime.pending&&stations.find(s=>s.id===runtime.pending)||near,p=selected&&screenPoint(selected.p);if(p){const e=node('shipPoint');e.classList.remove('hidden');e.style.left=p.x+'px';e.style.top=p.y+'px';e.textContent=selected.name;}}
 }
 function returnButton(){return '<button class="muted-btn" id="shipReturnDeck">← 返回甲板</button>';}
 function activateCabin(id){if(active||runtime.mode!=='cabin'||modal!=='cabin'||!cabinObjects.some(o=>o.id===id))return false;if(id==='save'){save();say(voyage.storageOK===false?'本機儲存受限，請在航程冊匯出備份。':'航海日誌已保存。');return;}if(id==='appearance')oceanFeatures.open('shipAppearance');else if(id==='album')openFromCabin('journal','photos');else openFromCabin({clock:'research',guide:'journal'}[id]||id);return true;}
 function renderPanel(type){if(!['deck','cabin','shipRest','shipAppearance','shipDialogue','shipNotice'].includes(type))return false;
  if(active){panelTitle('RESEARCH VESSEL','先返回研究船');node('panelBody').innerHTML='<p class="panel-note">甲板行走、船艙與休憩在返航後開放。</p>';return true;}
  if(type==='deck'){enter('deck');panelTitle('RESEARCH VESSEL','甲板漫步');node('panelBody').innerHTML='';node('shipExit').focus();return true;}
  if(type==='shipRest'){enter('rest');panelTitle('AT EASE','坐下，聽海');node('panelBody').innerHTML='';node('shipStand').focus();return true;}
  if(type==='cabin'){enter('cabin');mark('cabin');panelTitle('CABIN / EIGHT OBJECTS','研究船的日常');node('panelBody').innerHTML='<p class="panel-note">點選眼前的艙內物件，或從下方選擇，整理下一次航程。</p><div class="ship-cabin-objects">'+cabinObjects.map(o=>'<button class="muted-btn" data-cabin="'+o.id+'"><b>'+o.name+'</b><small>'+o.detail+'</small></button>').join('')+'</div>'+returnButton();node('panelBody').querySelectorAll('[data-cabin]').forEach(b=>b.onclick=()=>activateCabin(b.dataset.cabin));}
  else if(type==='shipAppearance'){enter('appearance');panelTitle('YOUR DIVER','海上的你');const a=state().appearance;node('panelBody').innerHTML='<p class="panel-note">修改會立即呈現在甲板角色；髮色、膚色與配件也會出現在第三人稱潛水員。配件門檻為本作設定。</p><label class="setting-row"><span>名字</span><input id="shipName" maxlength="18" value="'+safe(a.name)+'"></label>'+[['skin','膚色',Object.keys(skins),['暖膚','淺膚','深膚']],['hair','髮色',Object.keys(hairs),['深髮','棕髮','銀髮']],['build','體型',Object.keys(builds),['纖細','標準','寬肩']],['accessory','配件',['none','cap','badge'],['不配戴','遮陽帽 · 觀察三類生物','研究徽章 · 完成一封委託']]].map(([key,label,ids,names])=>'<label class="setting-row"><span>'+label+'</span><select data-appearance="'+key+'">'+ids.map((id,i)=>'<option value="'+id+'" '+(a[key]===id?'selected':'')+(key==='accessory'&&!accessoryAllowed(id)?' disabled':'')+'>'+names[i]+'</option>').join('')+'</select></label>').join('')+'<button id="shipSuit" class="muted-btn">潛水衣配色與已解鎖裝備</button>'+returnButton();node('shipName').onchange=e=>setAppearance('name',e.target.value);node('panelBody').querySelectorAll('[data-appearance]').forEach(e=>e.onchange=()=>setAppearance(e.dataset.appearance,e.value));node('shipSuit').onclick=()=>openFromCabin('research');}
  else {enter('deck');document.body.classList.remove('ship-deck');node('shipWalkUI').classList.add('hidden');panelTitle(type==='shipDialogue'?'CHENG / SHIPMATE':'NOTICE BOARD',type==='shipDialogue'?'澄，正在等你回來':'下一頁，由海帶路');const order=currentOrder();node('panelBody').innerHTML=type==='shipDialogue'?'<p class="panel-note">澄看了看你帶回來的記錄，將下一頁航海圖攤在桌上。</p><div class="feature-toolbar"><button class="muted-btn" data-talk="welcome">聊聊這艘船</button><button class="muted-btn" data-talk="next">下一步往哪裡？</button><button class="muted-btn" data-talk="mail">有新的研究委託嗎？</button></div><p id="shipDialogueText" class="feature-result">歡迎回來。先慢慢走走，艙內可以整理照片、挑下一個停泊點。</p>'+returnButton():'<h3>'+safe(order?.title||'把海，帶回來')+'</h3><p class="panel-note">'+safe(order?.description||'前導航程已完成，更多海域與故事仍在製作。')+'</p><button id="shipNoticeMark" class="primary">把這條線索記在海圖上</button>'+returnButton();
   if(type==='shipDialogue')node('panelBody').querySelectorAll('[data-talk]').forEach(b=>b.onclick=()=>{const id=b.dataset.talk;if(!state().talks.includes(id))state().talks.push(id);node('shipDialogueText').textContent=id==='welcome'?'這艘船是我們的小據點。前甲板偶爾有動物來訪；走過側道時，留意牠們的動靜。':id==='mail'?'信箱裡有攝影和帶路委託。接下之後再出發，回來時記得讀回信。':order?order.description:'你已走過前導航程的六段記憶。這片海仍能自由重遊。';if(id==='next'&&order)voyage.state.waypoint=order.place;save();});
   else node('shipNoticeMark').onclick=()=>{if(order)voyage.state.waypoint=order.place;save();say('線索已記在海圖。');};
  }
  if(node('shipReturnDeck'))node('shipReturnDeck').onclick=()=>oceanFeatures.open('deck');return true;
 }
 function init(){if(runtime.initialized)return;runtime.initialized=true;createActors();
  const style=document.createElement('style');style.textContent=`.ship-view #welcome{visibility:hidden;pointer-events:none}.ship-view #scrim{background:transparent;backdrop-filter:none;pointer-events:none}.ship-deck #panel,.ship-rest #panel{visibility:hidden;pointer-events:none}.ship-view #radioBox{visibility:hidden}.ship-view #panel{width:min(370px,94vw)}#shipWalkUI,#shipRestUI{position:fixed;inset:0;pointer-events:none;z-index:33;color:#edf1d7}#shipWalkUI button,#shipWalkUI select,#shipRestUI button,#shipRestUI label,#shipRestUI input{pointer-events:auto;min-height:44px;border:1px solid #b5cdb650;border-radius:10px;background:#0b2e38ed;color:#edf1df;padding:9px 14px;font:inherit;font-size:12px}#shipWalkUI select{max-width:160px}#shipWalkUI button:disabled{opacity:.5}#shipWalkTop,#shipRestTop{position:absolute;top:16px;left:16px;right:16px;display:flex;gap:8px;align-items:center;justify-content:space-between}#shipWalkBottom,#shipRestBottom{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 28px);display:flex;flex-wrap:wrap;justify-content:center;gap:8px;align-items:center;padding:10px;border-radius:14px;background:#092b35e8}#shipWalkStatus{width:100%;text-align:center;font-size:12px;line-height:1.6;margin:0 0 3px}#shipPoint{position:fixed;transform:translate(-50%,-120%);z-index:32;pointer-events:none;background:#133f46d9;padding:5px 10px;border:1px solid #e2dfae55;border-radius:6px;font-size:12px;color:#f0eccd}#shipRestBottom input[type=range]{padding:0;max-width:140px}#shipRestBottom label{display:flex;align-items:center;gap:8px}.ship-idle #shipRestBottom,.ship-idle #shipRestCaption{display:none}.ship-cabin-objects{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:18px 0}.ship-cabin-objects button{text-align:left;min-height:64px}.ship-cabin-objects small{display:block;margin-top:7px;color:#a8c3bd;font-size:10px}.ship-view select,.ship-view input{max-width:180px;background:#12343d;color:#e2ebda;border:1px solid #76918b;padding:8px;border-radius:6px}#shipBackCabin{margin:8px 0 12px}.ship-view .back-button{min-height:44px}@media(max-width:650px){.ship-view:not(.ship-deck):not(.ship-rest) #panel{top:auto;bottom:8px;left:3vw;right:auto;width:94vw;max-height:47vh}.ship-view #panel .panel-head{padding:18px 20px}.ship-view #panelBody{padding:18px 20px}.ship-view #panelTitle{font-size:25px}#shipWalkTop,#shipRestTop{top:10px;left:10px;right:10px}#shipRestBottom{font-size:11px}}@media(max-height:550px) and (orientation:landscape){#shipWalkBottom{bottom:8px;padding:7px}#shipWalkStatus{display:none}#shipWalkTop,#shipRestTop{top:8px}#shipRestBottom{bottom:8px}}`;
  document.head.append(style);const walk=document.createElement('div');walk.id='shipWalkUI';walk.className='hidden';walk.innerHTML='<div id="shipWalkTop"><button id="shipExit">← 船上選單</button><button id="shipTurn">轉動視角</button></div><div id="shipWalkBottom"><p id="shipWalkStatus" aria-live="polite"></p><select id="shipStation" aria-label="選擇甲板互動點"><option value="">選擇船上物件</option>'+stations.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')+'</select><button id="shipGo">走過去</button><button id="shipInteract" disabled>靠近物件</button></div>';document.body.append(walk);
  const rest=document.createElement('div');rest.id='shipRestUI';rest.className='hidden';rest.innerHTML='<div id="shipRestTop"><button id="shipStand">起身 · 返回甲板</button><span id="shipRestCaption">坐下，聽海</span><button id="shipIdle">閒置欣賞</button></div><div id="shipRestBottom"><button id="shipSound">聲音</button><label>本機 MP3<input id="shipLocalMusic" type="file" accept="audio/mpeg,audio/mp3,audio/*" hidden></label><label>音量<input id="shipMusicVolume" aria-label="休憩音樂音量" type="range" min="0" max="1" step=".01" value="'+settings.music+'"></label><button id="shipOriginalMusic">原創配樂</button></div>';document.body.append(rest);
  const point=document.createElement('span');point.id='shipPoint';point.className='hidden';document.body.append(point);const back=document.createElement('button');back.id='shipBackCabin';back.className='back-button hidden';back.textContent='← 回到船艙';node('panelBody').before(back);
  node('shipExit').onclick=closePanel;node('shipTurn').onclick=()=>{runtime.turn+=Math.PI/2;renderer.dirty=true;};node('shipGo').onclick=()=>walkToStation(node('shipStation').value);node('shipStand').onclick=()=>oceanFeatures.open('deck');node('shipIdle').onclick=()=>{runtime.restIdle=!runtime.restIdle;document.body.classList.toggle('ship-idle',runtime.restIdle);node('shipIdle').textContent=runtime.restIdle?'顯示控制':'閒置欣賞';};node('shipSound').onclick=toggleSound;node('shipMusicVolume').oninput=e=>{settings.music=Number(e.target.value);persist();oceanAudio.tick();};node('shipLocalMusic').onchange=e=>{settings.sound=true;updateSoundUI();oceanAudio.loadLocal(e.target.files?.[0]);};node('shipOriginalMusic').onclick=()=>oceanAudio.resetMusic();
  const canvas=renderer.canvas;let down=null,tap=null;
  canvas.addEventListener('pointerdown',e=>{if(!['deck','cabin'].includes(runtime.mode)||!['deck','cabin'].includes(modal)||active||e.button>0)return;e.preventDefault();e.stopImmediatePropagation();tap=null;down={x:e.clientX,y:e.clientY,id:e.pointerId,mode:runtime.mode};down.visitor=beginVisitor(e.clientX,e.clientY,e.pointerId);canvas.setPointerCapture(e.pointerId);},true);
  canvas.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();if(runtime.gesture)moveVisitor(e.clientX,e.clientY,e.pointerId);},true);
  // Activate on the completed canvas click. Opening a panel on pointer-up would
  // let the same touch's synthesized click press a newly exposed panel button.
  canvas.addEventListener('pointerup',e=>{if(!down||down.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const d=down;down=null;runtime.gesture=null;tap=!d.visitor&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<=12?{x:e.clientX,y:e.clientY,mode:d.mode}:null;},true);
  canvas.addEventListener('click',e=>{const hitTap=tap;tap=null;if(!hitTap||active||runtime.mode!==hitTap.mode||!['deck','cabin'].includes(modal)||Math.hypot(e.clientX-hitTap.x,e.clientY-hitTap.y)>12)return;e.preventDefault();e.stopImmediatePropagation();if(runtime.mode==='cabin'){let found=null,best=44;for(const o of cabinObjects){const p=screenPoint(o.p),d=p?Math.hypot(e.clientX-p.x,e.clientY-p.y):Infinity;if(d<best){found=o;best=d;}}if(found)activateCabin(found.id);return;}let hit=null,best=32;for(const st of stations){if(st.id==='visitor'&&!state().visitor.kind)continue;const p=screenPoint(st.p),dist=p?Math.hypot(e.clientX-p.x,e.clientY-p.y):Infinity;if(dist<best){best=dist;hit=st;}}if(hit)walkToStation(hit.id);else {const p=deckPoint(e.clientX,e.clientY);if(p)walkTo(p);}},true);
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{if(down)tap=null;down=null;runtime.gesture=null;},true);
  const oldCamera=shipCamera;shipCamera=function(){if(!camera())oldCamera();};
  window.addEventListener('keydown',e=>{if(!runtime.mode)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(runtime.mode==='rest')oceanFeatures.open('deck');else closePanel();return;}if(e.key==='Tab'&&['deck','rest'].includes(runtime.mode)&&['deck','shipRest'].includes(modal)){const root=node(runtime.mode==='deck'?'shipWalkUI':'shipRestUI'),buttons=[...root.querySelectorAll('button,select,input:not([type=file])')].filter(e=>!e.disabled&&e.getClientRects().length);if(buttons.length){const i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();e.preventDefault();e.stopImmediatePropagation();}}},true);
  oceanFeatures.addMenu({id:'ship',label:'甲板漫步',panel:'deck'});boatMoved();
 }
 const feature={id:'ship',initial,sanitize,init,renderPanel,afterCamera,idleTick:advance,shouldAnimate:()=>!!runtime.mode&&!active,panelChanged(){leave();},panelClosed:leave,startDive(){leave();afterCamera();},endDive(){for(const {batch} of runtime.underwater)batch.visible=false;},reset(){leave();if(runtime.initialized){for(const {batch} of runtime.underwater)batch.visible=false;boatMoved();}},escape(){if(!runtime.mode)return false;if(runtime.mode==='rest')oceanFeatures.open('deck');else closePanel();return true;},pointerCaptured:()=>!!runtime.gesture};
 oceanFeatures.register(feature);
 return {state,initial,sanitize,walkable,planRoute,toWorld,toLocal,stations,cabinObjects,walkTo,walkToStation,interact,advance,deckPoint,screenPoint,beginVisitor,moveVisitor,setAppearance,syncVisitor,boatMoved,afterCamera,feature,snapshot:()=>({mode:runtime.mode,p:state().p.slice(),route:runtime.route.map(p=>p.slice()),pending:runtime.pending,visitor:state().visitor,elapsed:runtime.elapsed,batches:runtime.parts.map(p=>p.batch.visible),underwater:runtime.underwater.map(p=>p.batch.visible)})};
})();
