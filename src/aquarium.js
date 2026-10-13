/* A configurable, original digital aquarium. Unlock, capacity, placement grid and
 * display scales are authored game rules; original Wii numerical limits are unknown.
 * World vertex/index buffers are shared read-only; every exhibit has its own VAO,
 * instance buffer and animal objects. No world animal or observation progress is reused. */
const oceanAquarium=(()=>{
 'use strict';
 const limits=Object.freeze({cells:12,capacity:16,unlockSpecies:3,knowledge:2});
 // Isolation already hides every world batch. Keep this independent scene near
 // the origin so 24 mm models retain float precision in their close-up cameras.
 const costs={turtle:2,ray:2,dolphin:3,whale:8},ORIGIN=[0,0,0];
 const initial=()=>({schema:1,slots:[],camera:{azimuth:0,elevation:.12,distance:36,focus:-1}});
 const number=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 const species=id=>SPECIES.find(sp=>sp.id===id);
 const traits=id=>typeof speciesTraits==='function'?speciesTraits(id):{motion:'swim',micro:false};
 const cost=id=>{const sp=species(id);return sp?Math.round(number(sp.aquarium?.cost,1,limits.capacity,costs[id]||1)):0;};
 const capacity=slots=>slots.reduce((sum,s)=>sum+cost(s.species),0);
 function sanitize(raw){
  const out=initial();if(!raw||typeof raw!=='object')return out;
  const occupied=new Set();let used=0;
  for(const slot of (Array.isArray(raw.slots)?raw.slots:[]).slice(0,128)){
   if(!slot||!species(slot.species)||!Number.isInteger(slot.cell)||slot.cell<0||slot.cell>=limits.cells||occupied.has(slot.cell))continue;
   const weight=cost(slot.species);if(used+weight>limits.capacity)continue;
   out.slots.push({cell:slot.cell,species:slot.species,level:Math.round(number(slot.level,0,2,1))});occupied.add(slot.cell);used+=weight;
  }
  out.slots.sort((a,b)=>a.cell-b.cell);const c=raw.camera||{};
  const focused=Number.isInteger(c.focus)?out.slots.find(s=>s.cell===c.focus):null;
  out.camera={azimuth:number(c.azimuth,-.9,.9,0),elevation:number(c.elevation,-.18,.42,.12),distance:number(c.distance,minimumDistance(focused),68,36),focus:focused?c.focus:-1};return out;
 }
 function planPlacement(slots,id,cell,level=1){
  if(!species(id)||!Number.isInteger(cell)||cell<0||cell>=limits.cells)return null;
  const next=slots.filter(slot=>slot.cell!==cell).map(slot=>({...slot}));next.push({cell,species:id,level:Math.round(number(level,0,2,1))});
  if(capacity(next)>limits.capacity)return null;return next.sort((a,b)=>a.cell-b.cell);
 }
 function arrange(ids){
  const selected=[...new Set(ids)].filter(id=>species(id)).sort((a,b)=>cost(a)-cost(b));const slots=[];let used=0;
  for(const id of selected){if(slots.length>=limits.cells||used+cost(id)>limits.capacity)continue;slots.push({cell:slots.length,species:id,level:slots.length%3});used+=cost(id);}return slots;
 }
 const state=()=>oceanFeatures.state('aquarium');
 const knowledge=id=>oceanEcology.knowledge(oceanEcology.state().field[id]);
 const unlocked=()=>SPECIES.filter(sp=>knowledge(sp.id)>=1).length>=limits.unlockSpecies;
 const eligible=id=>!!species(id)&&knowledge(id)>=limits.knowledge;
 const node=id=>typeof document==='undefined'?null:document.getElementById(id);
 const runtime={initialized:false,viewing:false,pools:new Map(),supports:new Map(),owned:new Set(),savedVisibility:new Map(),savedOptics:null,selected:null,cell:0,level:1,pointers:new Map(),pinch:null,lastTime:0,saveDue:false,saveClock:0};
 const save=()=>saveVoyage();
 const say=text=>{if(typeof toast==='function')toast(text);};
 const canEdit=()=>!active&&unlocked();
 function place(id,cell=runtime.cell,level=runtime.level){
  if(!canEdit()||!eligible(id))return false;const next=planPlacement(state().slots,id,cell,level);if(!next){say('展示容量不足；先移除一位住客，再配置。');return false;}
  state().slots=next;syncExhibits();if(state().camera.focus===cell)focus(cell);save();return true;
 }
 function remove(cell){if(active)return false;const before=state().slots.length;state().slots=state().slots.filter(s=>s.cell!==cell);if(before===state().slots.length)return false;if(state().camera.focus===cell)focus(-1);syncExhibits();save();return true;}
 function clear(){if(active)return false;state().slots=[];focus(-1);syncExhibits();save();return true;}
 function autoArrange(){if(!canEdit())return false;state().slots=arrange(SPECIES.filter(sp=>eligible(sp.id)).map(sp=>sp.id));focus(-1);syncExhibits();save();return true;}
 function center(cell,level=1){return [ORIGIN[0]+(cell%4-1.5)*8,-5-level*3,ORIGIN[2]+(Math.floor(cell/4)-1)*8];}
 function minimumDistance(slot){const sp=slot&&species(slot.species),span=sp?.modelBounds?Math.max(...sp.modelBounds.size):1;return sp?.fauna?Math.max(.018,sp.size*span*.9):3;}
 // A pure layout seam keeps physical scale and support placement reviewable.
 // Older large-animal exhibits retain their established presentation scale.
 function exhibitLayout(slot){
  const sp=species(slot.species),type=traits(slot.species),base=center(slot.cell,slot.level),home=base.slice(),size=sp?.size||1;
  const support=sp?.id==='pistol_shrimp'?'burrow':type.motion,supported=sp?.fauna&&['attached','crawl','burrow'].includes(support),pad=Math.max(.13,size*(support==='burrow'?1.6:3));
  if(support==='attached'){home[0]+=.009;home[1]+=.042;}
  return {home,base,supported:!!supported,support,pad,scale:sp?.fauna?size:null,radius:support==='crawl'?size*.45:support==='burrow'?size*.35:size*1.6};
 }
 function cloneMesh(source){
  const gl=renderer.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,source.vb);
  for(const [loc,size,offset]of [[0,3,0],[1,3,12],[2,3,24],[7,2,36],[8,1,44]])renderer.attr(loc,size,48,offset);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,source.eb);const ib=gl.createBuffer(),data=new Float32Array(limits.cells*24);gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
  for(const [loc,size,offset]of [[3,3,0],[4,4,12],[5,3,28],[6,2,40],[9,4,48],[10,4,64],[11,4,80]])renderer.attr(loc,size,96,offset,1);
  const b={...source,vao,ib,data,instances:[],dynamic:true,minDistance:0,maxDistance:300,visible:false,shadow:false,shadowProxy:false,drawCount:0,_lastVisible:null};renderer.batches.push(b);runtime.owned.add(b);gl.bindVertexArray(null);return b;
 }
 function own(geometry,instances,kind=0,dynamic=false){const batch=renderer.batch(geometry,instances,kind,dynamic);batch.visible=false;batch.maxDistance=300;runtime.owned.add(batch);return batch;}
 function createSupports(){
  const add=(id,g,kind=0)=>{g.shadow=false;const b=own(g,Array.from({length:limits.cells},()=>({p:ORIGIN.slice()})),kind,true);b.instances=[];runtime.supports.set(id,b);};
  const stand=new Geometry();stand.material=0;stand.box([0,-.5,0],[.024,1,.024],[.19,.31,.30]);add('stand',stand);
  const bed=new Geometry();bed.material=2;bed.box([0,-.10,0],[1,.20,1],[.70,.65,.54]);add('bed',bed);
  const burrow=new Geometry();burrow.material=0;
  // A square ledge with an actual open annulus, a deep dark well and thick sides.
  for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16,point=(t,r)=>[Math.cos(t)*r,0,Math.sin(t)*r],outer=t=>point(t,.5/Math.max(Math.abs(Math.cos(t)),Math.abs(Math.sin(t))));
   const ia=point(a,.07),ib=point(b,.07),oa=outer(a),ob=outer(b),da=[ia[0],-.18,ia[2]],db=[ib[0],-.18,ib[2]];
   burrow.tri(ia,oa,ob,[.64,.59,.45]);burrow.tri(ia,ob,ib,[.64,.59,.45]);burrow.tri(ia,ib,db,[.18,.17,.12]);burrow.tri(ia,db,da,[.13,.14,.11]);burrow.tri([0,-.18,0],da,db,[.025,.036,.028]);
  }
  for(const side of [-1,1]){burrow.box([side*.475,-.10,0],[.05,.20,1],[.56,.54,.43]);burrow.box([0,-.10,side*.475],[1,.20,.05],[.56,.54,.43]);}add('burrow',burrow);
  const fan=new Geometry();fan.material=0;fan.tube([0,0,0],[0,.048,0],.0012,.0008,[.50,.28,.34],7);
  for(let i=0;i<7;i++){const x=(i-3)*.011,y=.056-Math.abs(i-3)*.004;fan.tube([0,.016,0],[x,y,0],.00075,.00035,[.63,.35,.42],6);for(let j=1;j<4;j++)fan.tube([x*j/4,.016+(y-.016)*j/4,0],[x*j/4+.009,.023+(y-.016)*j/4,0],.00045,.00023,[.66,.39,.45],5);}add('fan',fan);
 }
 function createScene(){
  if(runtime.owned.size)return;
  // Select the highest-detail existing mesh for each catalogue entry. Future species
  // participate automatically when their normal scene batch and catalogue entry exist.
  const sourceBatches=renderer.batches.slice();
  SPECIES.forEach((sp,index)=>{
   const candidates=sourceBatches.filter(b=>b.dynamic&&b.instances.some(f=>f.species===index));const source=candidates.sort((a,b)=>(a.minDistance||0)-(b.minDistance||0)||b.count-a.count)[0];if(!source)return;
   const representative=source.instances.find(f=>f.species===index),batch=cloneMesh(source);runtime.pools.set(sp.id,{batch,representative,radius:source.radius});
  });
  const floor=new Geometry();floor.material=1;floor.box([0,-16.5,0],[45,.7,35],[.78,.82,.76]);own(floor,[{p:ORIGIN.slice()}]);
  const walls=new Geometry();walls.material=0;walls.shadow=false;const dark=[.095,.21,.24],stone=[.27,.38,.37],metal=[.38,.47,.43];
  walls.box([0,-8.1,-17.3],[45,16.8,.65],dark);walls.box([-22.2,-8.1,0],[.65,16.8,35],dark);walls.box([22.2,-8.1,0],[.65,16.8,35],dark);
  for(const z of [-17.6,17.6]){walls.box([0,-16.1,z],[45,.8,.7],stone);walls.box([0,.15,z],[45,.5,.7],metal);for(const x of [-22.2,22.2])walls.box([x,-8,z],[.65,16.5,.65],stone);}
  for(const x of [-14,-7,0,7,14])walls.box([x,-8.1,-16.9],[.14,16,.16],[.20,.34,.35]);
  own(walls,[{p:ORIGIN.slice()}]);
  const reef=new Geometry();reef.material=2;reef.shadow=false;
  for(let i=0;i<12;i++){const c=center(i),x=c[0]-ORIGIN[0],z=c[2]-ORIGIN[2],h=1.0+(i%3)*.40;reef.sphere([x-1.6,-16+h*.35,z-.7],[1.6,h,1.35],[.62,.63,.51],14,9,.18);reef.sphere([x-.5,-15.7,z-.4],[1.15,.55,1.1],[.54,.58,.47],12,8,.15);}
  own(reef,[{p:ORIGIN.slice()}]);
  const coral=new Geometry();coral.material=3;coral.shadow=false;
  for(let i=0;i<12;i++){const c=center(i),x=c[0]-ORIGIN[0]-1.7,z=c[2]-ORIGIN[2]-.7;for(let j=0;j<5;j++){const a=j*Math.PI*.4;coral.tube([x,-14.8,z],[x+Math.cos(a)*.65,-13.8-(j%2)*.25,z+Math.sin(a)*.55],.072,.032,[.52,.64,.53],7);}}
  own(coral,[{p:ORIGIN.slice()}]);createSupports();syncExhibits();
  // Detailed reef colonies retain their original meshes and colours. Save/restore the
  // procedural seed so visiting the gallery cannot change any later world generation.
  const previousSeed=seed;
  try{const tables=tableCoral(0),fans=fanCoral();own(tables,[-1,1].flatMap(side=>[0,1,2].map(row=>({p:[ORIGIN[0]+side*(11+row%2*3),-14.7,ORIGIN[2]-9+row*8],s:[2.2,2.0,2.2],yaw:side*.6+row*.7}))));own(fans,[-1,1].flatMap(side=>[0,1,2].map(row=>({p:[ORIGIN[0]+side*(17-row),-15.3,ORIGIN[2]-10+row*9],s:[2.4,2.9,2.4],yaw:side*.65,phase:row}))),3);}finally{seed=previousSeed;}
 }
 function syncExhibits(){
  if(!runtime.pools.size)return;
  for(const pool of runtime.pools.values())pool.batch.instances=[];
  for(const batch of runtime.supports.values())batch.instances=[];
  for(const slot of state().slots){const pool=runtime.pools.get(slot.species);if(!pool||!eligible(slot.species))continue;const base=pool.representative;
   const sp=species(slot.species),layout=exhibitLayout(slot),displayRadius=cost(slot.species)>=8?2.6:cost(slot.species)>=2?1.4:.95,scale=layout.scale??displayRadius/Math.max(.05,pool.radius);
   pool.batch.instances.push({p:layout.home.slice(),home:layout.home.slice(),center:layout.home.slice(),homeYaw:0,floorOffset:0,radius:layout.radius,fauna:!!sp.fauna,species:SPECIES.indexOf(sp),modelCenter:base.modelCenter?.slice(),s:[scale,scale,scale],yaw:0,pitch:0,phase:slot.cell*.71,effort:.4,bank:0,tint:(base.tint||[1,1,1]).slice(),bioMorph:(base.bioMorph||[1,1,1,1]).slice(),bioGenes:(base.bioGenes||[.5,.5,.5,.5]).slice(),finWear:base.finWear||0,exhibit:{...slot}});
   if(layout.supported){
    const put=(id,item)=>runtime.supports.get(id)?.instances.push(item);
    // Stop the pier inside the substrate, not coplanar with its visible top.
    // Otherwise its small teal cap z-fights with the bed in a macro camera.
    const pierTop=layout.base[1]-layout.pad*.18;
    put('stand',{p:[layout.base[0],pierTop,layout.base[2]],s:[1,16+pierTop,1]});
    put(layout.support==='burrow'?'burrow':'bed',{p:layout.base.slice(),s:[layout.pad,layout.pad,layout.pad]});
    if(layout.support==='attached')put('fan',{p:layout.base.slice()});
   }
  }
  for(const pool of runtime.pools.values())pool.batch.visible=runtime.viewing&&pool.batch.instances.length>0;
  for(const batch of runtime.supports.values())batch.visible=runtime.viewing&&batch.instances.length>0;
  if(typeof renderer!=='undefined'&&renderer){renderer.dirty=true;renderer.forceShadow=true;}
 }
 function isolateScene(){
  for(const batch of renderer.batches){if(runtime.owned.has(batch))continue;if(!runtime.savedVisibility.has(batch))runtime.savedVisibility.set(batch,batch.visible);batch.visible=false;}
  for(const batch of runtime.owned)batch.visible=!batch.dynamic||batch.instances.length>0;
 }
 function releasePointers(){for(const id of runtime.pointers.keys())try{renderer.canvas.releasePointerCapture(id)}catch(_){}runtime.pointers.clear();runtime.pinch=null;}
 function leaveViewer(){
  if(!runtime.viewing)return false;runtime.viewing=false;releasePointers();
  for(const [batch,visible]of runtime.savedVisibility)batch.visible=visible;runtime.savedVisibility.clear();for(const batch of runtime.owned)batch.visible=false;
  if(runtime.savedOptics){Object.assign(renderer,runtime.savedOptics);runtime.savedOptics=null;}renderer.forceShadow=true;renderer.dirty=true;document.body.classList.remove('aquarium-view');node('aquariumViewer')?.classList.add('hidden');
  if(runtime.saveDue){runtime.saveDue=false;save();}return true;
 }
 function enterViewer(){
  if(active||!unlocked()){say(active?'先回研究船，再進入水族館。':'先為三類生物留下第一層觀察筆記。');return false;}
  oceanFeatures.open('aquariumView');return runtime.viewing;
 }
 function beginViewer(){
  if(runtime.viewing)return;createScene();runtime.viewing=true;runtime.savedOptics={photoFov:renderer.photoFov,photoAperture:renderer.photoAperture,photoFocus:renderer.photoFocus,photoNear:renderer.photoNear,exposure:renderer.exposure};
  resetInput();releaseMouseLook();syncExhibits();isolateScene();document.body.classList.add('aquarium-view');node('aquariumViewer').classList.remove('hidden');runtime.lastTime=t;paintViewer();renderer.forceShadow=true;renderer.dirty=true;setTimeout(()=>{if(runtime.viewing)node('aquariumExit').focus()},60);
 }
 function focus(cell){const s=state(),slot=s.slots.find(slot=>slot.cell===cell);if(cell!==-1&&!slot)return false;s.camera.focus=cell;const sp=slot&&species(slot.species),weight=slot?cost(slot.species):0,span=sp?.modelBounds?Math.max(...sp.modelBounds.size):1;s.camera.distance=cell===-1?36:sp.fauna?Math.max(.065,sp.size*span*2.65):weight>=8?11:weight>=2?6:4.6;s.camera.azimuth=0;s.camera.elevation=.10;runtime.saveDue=true;runtime.saveClock=0;renderer.dirty=true;paintViewer();return true;}
 function camera(){
  const c=state().camera,slot=state().slots.find(s=>s.cell===c.focus),fish=slot?runtime.pools.get(slot.species)?.batch.instances.find(f=>f.exhibit.cell===slot.cell):null,fauna=fish?.fauna,aim=fish?(fauna&&typeof animalFocusPoint==='function'?animalFocusPoint(fish):fish.p.slice()):slot?center(slot.cell,slot.level):[ORIGIN[0],-9,ORIGIN[2]],portrait=renderer.width<renderer.height,dist=c.distance*(portrait?(slot?1.16:1.48):1);
  eye=[aim[0]+Math.sin(c.azimuth)*dist,Math.min(-.7,aim[1]+Math.sin(c.elevation)*dist),aim[2]+Math.cos(c.azimuth)*dist];target=aim;diverBatch.visible=false;cameraCut=true;renderer.photoFov=fauna?46:56;renderer.photoNear=fauna?.003:.16;renderer.photoAperture=0;renderer.exposure=1.14;
 }
 function afterLife(time){
  if(!runtime.viewing)return;if(active||modal!=='aquariumView'){leaveViewer();return;}runtime.lastTime=time;
  for(const pool of runtime.pools.values())for(const f of pool.batch.instances){if(f.fauna&&typeof faunaMotionPose==='function'){faunaMotionPose(f,time,f.p,{react:false});continue;}const s=f.exhibit,c=center(s.cell,s.level),a=time*(cost(s.species)>=2?.13:.22)+s.cell*.73,r=cost(s.species)>=8?.8:1.1;f.p=[c[0]+Math.cos(a)*r,c[1]+Math.sin(a*.7+s.cell)*.30,c[2]+Math.sin(a)*r*.55];f.yaw=Math.atan2(-Math.cos(a)*.55,-Math.sin(a));f.pitch=Math.cos(a*.7+s.cell)*.03;f.bank=Math.sin(a)*.025;f.effort=.37;}
  isolateScene();paintCaption();
 }
 function idleTick(dt){if(!runtime.viewing)return;if(active||modal!=='aquariumView'){leaveViewer();return;}if(runtime.saveDue){runtime.saveClock+=dt;if(runtime.saveClock>.5&&!runtime.pointers.size){runtime.saveDue=false;save();}}}
 function adjust(azimuth=0,elevation=0,zoom=0){const c=state().camera,slot=state().slots.find(s=>s.cell===c.focus);c.azimuth=number(c.azimuth+azimuth,-.9,.9,0);c.elevation=number(c.elevation+elevation,-.18,.42,.12);c.distance=number(c.distance*Math.exp(zoom),minimumDistance(slot),68,36);runtime.saveDue=true;runtime.saveClock=0;renderer.dirty=true;}
 function paintViewer(){
  const menu=node('aquariumFocus');if(!menu)return;const s=state();menu.innerHTML='<option value="-1">整座展示館</option>'+s.slots.filter(slot=>eligible(slot.species)).map(slot=>`<option value="${slot.cell}">${slot.cell+1} · ${safe(species(slot.species).name)}</option>`).join('');menu.value=String(s.camera.focus);node('aquariumViewCount').textContent=`${s.slots.filter(slot=>eligible(slot.species)).length} 位住客 · 拖曳環視，雙指或滾輪靠近`;paintCaption();
 }
 function paintCaption(){
  const caption=node('aquariumViewer')?.querySelector('.aquarium-caption');if(!caption)return;const slot=state().slots.find(row=>row.cell===state().camera.focus),f=slot&&runtime.pools.get(slot.species)?.batch.instances.find(f=>f.exhibit.cell===slot.cell);
  const label=slot&&traits(slot.species).micro?'微觀展示鏡頭放大 · 保留生物尺寸':slot&&species(slot.species).fauna?'近距離展示鏡頭 · 保留生物尺寸':'ORIGINAL DIGITAL EXHIBIT · 展示比例經調整';
  const text=label+(f?.faunaVisibility<.2?' · 牠暫時躲在洞裡，稍候會再探出。':'');if(caption.textContent!==text)caption.textContent=text;
 }
 function renderPanel(type){
  if(type!=='aquarium'&&type!=='aquariumView')return false;
  if(type==='aquariumView'&&!active&&unlocked()){panelTitle('YOUR LIVING AQUARIUM','海中的收藏館');beginViewer();return true;}
  if(runtime.viewing)leaveViewer();const s=state(),open=unlocked(),known=SPECIES.filter(sp=>knowledge(sp.id)>=1).length;panelTitle('AQUARIUM / YOUR COLLECTION','海中的收藏館');
  const current=s.slots.find(slot=>slot.cell===runtime.cell);if(!runtime.selected||!eligible(runtime.selected))runtime.selected=SPECIES.find(sp=>eligible(sp.id))?.id||null;
  node('panelBody').innerHTML=`<p class="panel-note">${open?'收藏你的相遇，再走進水光裡欣賞。':`先讓 ${limits.unlockSpecies} 類生物達到第一層筆記，即可開館。目前 ${known} / ${limits.unlockSpecies}。`}<br>達到第二層筆記的生物可加入展示。${active?'配置與觀賞請先回船。':''}</p><div class="aquarium-summary"><b>${capacity(s.slots)} / ${limits.capacity}</b><span>展示容量 · ${s.slots.length} / ${limits.cells} 個位置</span></div><div class="aquarium-grid" aria-label="展示位置">${Array.from({length:limits.cells},(_,cell)=>{const slot=s.slots.find(row=>row.cell===cell);return `<button data-aquarium-cell="${cell}" class="${cell===runtime.cell?'selected':''}"><small>${String(cell+1).padStart(2,'0')}</small><span>${slot?safe(species(slot.species).name):'空位'}</span>${slot?`<i>${['上層','中層','下層'][slot.level]}</i>`:''}</button>`}).join('')}</div><section class="feature-section"><h3>位置 ${runtime.cell+1}${current?' · '+safe(species(current.species).name):''}</h3><label class="aquarium-field">選擇住客<select id="aquariumSpecies">${SPECIES.map(sp=>`<option value="${safe(sp.id)}" ${eligible(sp.id)?'':'disabled'} ${runtime.selected===sp.id?'selected':''}>${safe(sp.name)} · ${cost(sp.id)} 格${eligible(sp.id)?'':` · 筆記 ${knowledge(sp.id)}/2`}</option>`).join('')}</select></label><label class="aquarium-field">活動水層<select id="aquariumLevel">${['上層','中層','下層'].map((label,index)=>`<option value="${index}" ${runtime.level===index?'selected':''}>${label}</option>`).join('')}</select></label><div class="feature-toolbar"><button class="primary" id="aquariumPlace" ${!canEdit()||!runtime.selected?'disabled':''}>${current?'更換配置':'加入展示'}</button><button class="muted-btn" id="aquariumRemove" ${active||!current?'disabled':''}>移除此位</button></div></section><div class="feature-toolbar"><button class="muted-btn" id="aquariumAuto" ${!canEdit()?'disabled':''}>自動配置</button><button class="muted-btn" id="aquariumClear" ${active||!s.slots.length?'disabled':''}>全部移除</button><button class="primary" id="aquariumEnter" ${active||!open?'disabled':''}>進入 3D 觀賞 ↗</button></div><p class="panel-note">展示館有 ${limits.cells} 個位置與 ${limits.capacity} 格容量，較大的住客需要更多格。配置會隨航程保存；住客是依照相遇紀錄建立的數位展示，觀賞比例經過調整。</p>`;
  node('panelBody').querySelectorAll('[data-aquarium-cell]').forEach(button=>button.onclick=()=>{runtime.cell=+button.dataset.aquariumCell;const slot=s.slots.find(row=>row.cell===runtime.cell);if(slot){runtime.selected=slot.species;runtime.level=slot.level;}renderPanel('aquarium');});
  node('aquariumSpecies').onchange=e=>{runtime.selected=e.target.value};node('aquariumLevel').onchange=e=>{runtime.level=+e.target.value};
  for(const [id,action]of [['aquariumPlace',()=>place(runtime.selected)],['aquariumRemove',()=>remove(runtime.cell)],['aquariumAuto',autoArrange],['aquariumClear',clear]])node(id).onclick=()=>{action();renderPanel('aquarium')};node('aquariumEnter').onclick=enterViewer;return true;
 }
 function init(){
  if(runtime.initialized)return;runtime.initialized=true;
  const style=document.createElement('style');style.textContent=`.aquarium-summary{display:flex;gap:15px;align-items:baseline;padding:0 0 17px}.aquarium-summary b{font:28px var(--mono);color:#dce4c7}.aquarium-summary span{font-size:11px;color:#a8c8c2}.aquarium-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.aquarium-grid button{min-height:78px;border:1px solid #99c1b530;padding:9px 4px;border-radius:5px;background:#0a2d37;text-align:center}.aquarium-grid button.selected{border-color:#d5ddb2;background:#b5cfa51c}.aquarium-grid small,.aquarium-grid i{display:block;font-size:9px;color:#87afac;font-style:normal}.aquarium-grid span{display:block;font-size:11px;margin:7px 0}.aquarium-field{display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:12px;margin:15px 0}.aquarium-field select{max-width:74%;padding:10px;color:#dce9dc;background:#0c333c;border:1px solid #6b8e8580;border-radius:5px}.aquarium-view #welcome,.aquarium-view #panel,.aquarium-view #debrief{visibility:hidden;pointer-events:none}.aquarium-view #scrim{background:transparent;backdrop-filter:none;pointer-events:none}.aquarium-view #ecologyHUD,.aquarium-view #ecologyTouch,.aquarium-view #radioBox{display:none!important}#aquariumViewer{position:fixed;inset:0;z-index:44;pointer-events:none;color:#deebdb}#aquariumViewer .aquarium-top{position:absolute;top:max(22px,env(safe-area-inset-top));left:26px;right:26px;display:flex;align-items:flex-start;justify-content:space-between;gap:15px}#aquariumViewer h2{font:29px var(--serif);margin:5px 0}#aquariumViewCount{font-size:11px;line-height:1.8;color:#b3d2cd}#aquariumViewer button,#aquariumViewer select{pointer-events:auto;min-height:44px;padding:11px 15px;border:1px solid #bed6c64f;border-radius:7px;background:#07303ae8;color:#e4eddd;backdrop-filter:blur(10px);font:12px var(--sans)}#aquariumViewer .aquarium-controls{position:absolute;bottom:max(23px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:7px;align-items:center;justify-content:center;width:max-content;max-width:calc(100vw - 28px);flex-wrap:wrap}#aquariumViewer select{max-width:220px}#aquariumViewer .aquarium-caption{position:absolute;left:26px;bottom:85px;font-size:9px;letter-spacing:1.4px;color:#a1c3bd}@media(max-width:650px){#aquariumViewer .aquarium-top{left:17px;right:17px}#aquariumViewer h2{font-size:23px}#aquariumViewCount{max-width:230px;font-size:10px}.aquarium-grid button{min-height:73px}#aquariumViewer .aquarium-caption{left:17px;bottom:125px}.aquarium-field select{max-width:70%}}`;document.head.appendChild(style);
  const hud=document.createElement('div');hud.id='aquariumViewer';hud.className='hidden';hud.innerHTML='<div class="aquarium-top"><div><small>YOUR LIVING AQUARIUM</small><h2>海中的收藏館</h2><div id="aquariumViewCount"></div></div><button id="aquariumExit">回到配置 ↗</button></div><div class="aquarium-caption">ORIGINAL DIGITAL EXHIBIT · 展示比例經調整</div><div class="aquarium-controls"><select id="aquariumFocus" aria-label="觀賞對象"></select><button id="aquariumNear" aria-label="靠近觀賞">＋</button><button id="aquariumFar" aria-label="拉遠觀賞">−</button><button id="aquariumReset">全景</button></div>';document.body.appendChild(hud);
  node('aquariumExit').onclick=()=>oceanFeatures.open('aquarium');node('aquariumFocus').onchange=e=>focus(+e.target.value);node('aquariumNear').onclick=()=>adjust(0,0,-.15);node('aquariumFar').onclick=()=>adjust(0,0,.15);node('aquariumReset').onclick=()=>focus(-1);
  const oldCamera=shipCamera;shipCamera=function(){if(runtime.viewing&&!active&&modal==='aquariumView')camera();else oldCamera();};
  const canvas=renderer.canvas,pinchDistance=()=>{const [a,b]=[...runtime.pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;};
  canvas.addEventListener('pointerdown',e=>{if(!runtime.viewing||e.button>0)return;e.preventDefault();e.stopImmediatePropagation();runtime.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);runtime.pinch=pinchDistance();},true);
  canvas.addEventListener('pointermove',e=>{const old=runtime.pointers.get(e.pointerId);if(!runtime.viewing||!old)return;e.preventDefault();e.stopImmediatePropagation();runtime.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const distance=pinchDistance();if(distance&&runtime.pinch){adjust(0,0,Math.log(runtime.pinch/Math.max(1,distance)));runtime.pinch=distance;}else adjust((e.clientX-old.x)*-.004,(e.clientY-old.y)*.003,0);},true);
  const finish=e=>{if(!runtime.pointers.has(e.pointerId))return;runtime.pointers.delete(e.pointerId);runtime.pinch=pinchDistance();if(!runtime.pointers.size&&runtime.saveDue){runtime.saveDue=false;save();}};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,finish,true);
  canvas.addEventListener('wheel',e=>{if(!runtime.viewing)return;e.preventDefault();e.stopImmediatePropagation();adjust(0,0,Math.max(-.25,Math.min(.25,e.deltaY*.0015)));},{passive:false,capture:true});
  window.addEventListener('keydown',e=>{if(!runtime.viewing)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();oceanFeatures.open('aquarium');return;}if(e.code==='Tab'){const controls=[...hud.querySelectorAll('button,select')],at=controls.indexOf(document.activeElement),next=e.shiftKey?(at<=0?controls.length-1:at-1):(at+1)%controls.length;e.preventDefault();e.stopImmediatePropagation();controls[next].focus();return;}if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const actions={ArrowLeft:[-.06,0,0],ArrowRight:[.06,0,0],ArrowUp:[0,.04,0],ArrowDown:[0,-.04,0],Equal:[0,0,-.10],Minus:[0,0,.10]};if(actions[e.code]){e.preventDefault();e.stopImmediatePropagation();adjust(...actions[e.code]);}},true);
  oceanFeatures.addMenu({id:'aquarium',label:'水族館配置與觀賞',panel:'aquarium'});
 }
 const hooks={id:'aquarium',initial,sanitize,init,renderPanel,afterLife,idleTick,startDive:leaveViewer,panelChanged(type){if(type!=='aquariumView')leaveViewer();},panelClosed:leaveViewer,reset(){const wasViewing=runtime.viewing;leaveViewer();if(wasViewing&&modal==='aquariumView')closePanel();runtime.selected=null;runtime.cell=0;syncExhibits();},shouldAnimate:()=>runtime.viewing&&!active&&modal==='aquariumView',pointerCaptured:()=>runtime.viewing,escape(){if(!runtime.viewing)return false;oceanFeatures.open('aquarium');return true;}};
 oceanFeatures.register(hooks);
 return {initial,sanitize,limits,cost,capacity,planPlacement,arrange,exhibitLayout,state,unlocked,eligible,place,remove,clear,autoArrange,enterViewer,leaveViewer,focus,adjust,hooks,snapshot:()=>({viewing:runtime.viewing,batches:runtime.owned.size,instances:[...runtime.pools.values()].reduce((sum,p)=>sum+p.batch.instances.length,0),supports:[...runtime.supports.values()].reduce((sum,b)=>sum+b.instances.length,0),camera:{...state().camera},savedVisibilities:runtime.savedVisibility.size})};
})();
