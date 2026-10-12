/* OPEN WATER 0.7 — original continuous-world art and landmarks.
   Game metres, NOT surveyed coordinates or a real dive plan.
   The old sculpted core is retained; new vistas are authored as linked destinations. */
const OPEN_WORLD={bounds:{x:270,z:295,centerZ:-90},boat:[-24,0,43],version:'0.7.0'};
const coreGroundHeight=groundHeight;
groundHeight=function(x,z){
 const core=coreGroundHeight(x,z);
 const c=Math.exp(-Math.pow(x/57,4)-Math.pow((z+22)/91,4));
 const shelf=-21-26*smooth01((-z-6)/170)-24*smooth01((-z-170)/125);
 const atoll=10*Math.exp(-((x+101)**2/3700+(z+79)**2/4800));
 const east=16*Math.exp(-((x-104)**2/4300+(z+105)**2/7500));
 const lagoon=11*Math.exp(-((x+35)**2/3200+(z-46)**2/2000));
 const contour=1.3*Math.sin(x*.039+z*.018)*Math.cos(z*.033)+.6*terrainNoise(x*.31,z*.28);
 const open=shelf+atoll+east+lagoon+contour;
 return Math.min(-5.2,mix(open,core,c));
};
LANDMARKS[0].spawn=[0,-7.6,23];LANDMARKS[0].yaw=.03;LANDMARKS[0].pitch=-.055;
LANDMARKS[2].spawn=[5,-17.5,-29];LANDMARKS[2].yaw=-.08;LANDMARKS[2].pitch=-.02;
LANDMARKS.push(
 {id:'gate',name:'環礁之門',en:'THE GREAT PASSAGE',x:-102,z:-76,spawn:[-96,-13,-49],yaw:-.15,pitch:-.09,text:'穿過石門，熟悉的礁庭已在身後。',note:'原創環礁地景；非綠島實測潛點。',radius:17},
 {id:'wings',name:'銀翼水道',en:'SILVERWING CHANNEL',x:101,z:-85,spawn:[90,-13,-66],yaw:.3,pitch:-.02,text:'留一段距離，看牠們乘著水流飛翔。',note:'原創開闊水道與動物配置。',radius:20},
 {id:'wreck',name:'眠海號',en:'THE SLEEPING VESSEL',x:99,z:-166,spawn:[98,-29,-142],yaw:-.05,pitch:-.1,text:'船不再遠行，卻成了另一個世界。',note:'原創開放式船殼；不是實際沉船或穿越訓練。',radius:18},
 {id:'pelagic',name:'遠洋迴廊',en:'BEYOND THE REEF',x:-10,z:-231,spawn:[-1,-31,-199],yaw:-.14,pitch:-.02,text:'遠方的回聲，終於有了輪廓。',note:'幻想大洋延伸區，不是鯨類出現預報。',radius:31},
 {id:'anchorage',name:'歸潮錨地',en:'HOME ON THE WATER',x:-24,z:43,spawn:[-18,-4.5,30],yaw:.03,pitch:-.05,text:'海面就在頭頂，船仍在等你。',note:'原創研究船與錨地。',radius:16}
);
// Shared terrain tiles. No terrain generation or asset fetching on the swimming hot path.
addGroundTiles=function(r){
 const span=64,count=10;
 for(let iz=0;iz<count;iz++)for(let ix=0;ix<count;ix++){
  const cx=(ix-4.5)*span,cz=(iz-4.5)*span-90;
  for(let lod=0;lod<2;lod++){
   const g=new Geometry();g.material=1;g.shadow=true;const N=lod?7:22;
   function pt(i,j){let x=cx+(i/N-.5)*span,z=cz+(j/N-.5)*span;return [x-cx,groundHeight(x,z),z-cz];}
   function norm(p){const x=p[0]+cx,z=p[2]+cz,e=.20;return V.norm([groundHeight(x-e,z)-groundHeight(x+e,z),2*e,groundHeight(x,z-e)-groundHeight(x,z+e)]);}
   for(let j=0;j<N;j++)for(let i=0;i<N;i++){let p=[pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)],n=p.map(norm);const col=[.90,.89,.83];g.tri(p[0],p[2],p[1],col,[n[0],n[2],n[1]]);g.tri(p[0],p[3],p[2],col,[n[0],n[3],n[2]]);}
   const b=r.batch(g,[{p:[cx,0,cz]}]);if(!lod){b.maxDistance=100;b.shadowProxy=true;}else {b.minDistance=100;b.maxDistance=520;b.shadow=false;}
  }
 }
};
// Cross-section hull. These meshes are authored here, not copied game assets.
function researchVessel(){
 const g=new Geometry();g.material=12;const white=[.88,.88,.82],navy=[.06,.16,.23],metal=[.53,.59,.58],teak=[.53,.35,.20];
 surface(g,(u,v)=>{const z=(u-.5)*15.8,angle=Math.PI*v,w=2.32*Math.pow(Math.sin(Math.PI*u),.32),y=.62-Math.sin(angle)*1.82;return [Math.cos(angle)*w,y,z];},54,16,(p,u,v)=>p[1]>.17?white:navy,1);
 g.box([0,.59,-.2],[3.65,.18,11.7],teak);
 g.box([0,1.42,-.8],[3.5,1.6,5.1],white);g.box([0,2.35,-.75],[4.05,.18,5.7],white);
 // Windows separated by actual mullions; cabin interior is intentionally opaque.
 for(let s of [-1,1])for(let z of [-2.35,-.85,.65])g.box([s*1.757,1.78,z],[.03,.65,1.26],[.055,.19,.23]);
 g.box([0,1.78,-3.362],[2.92,.70,.035],[.055,.19,.23]);g.box([0,1.30,1.764],[.81,1.5,.04],navy);
 for(let s of [-1,1]){
  for(let i=0;i<10;i++){const z=-6.1+i*1.35,w=1.87*Math.pow(Math.sin(Math.PI*(z/15.8+.5)),.32);g.tube([s*w,.67,z],[s*w,1.41,z],.027,.027,metal,6);if(i<9){const z1=z+1.35,w1=1.87*Math.pow(Math.sin(Math.PI*(z1/15.8+.5)),.32);g.tube([s*w,1.41,z],[s*w1,1.41,z1],.03,.03,metal,6);}}
  for(let z of [-3.1,2.8,4.5]){g.sphere([s*2.10,.2,z],[.20,.62,.22],[.05,.075,.082],12,9);g.tube([s*2.08,.9,z],[s*2.1,.40,z],.014,.014,[.63,.58,.44],5);}
 }
 g.tube([0,2.4,-.6],[0,4.7,-.6],.055,.04,metal,10);g.tube([-1,4.25,-.6],[1,4.25,-.6],.035,.035,metal,8);
 g.box([0,4.53,-.6],[1.35,.17,.28],white);g.box([.53,3.65,-.6],[.75,.46,.022],[.66,.19,.12]);
 // Rear swim platform and independent ladder rungs.
 g.box([0,.03,6.75],[3.7,.13,1.2],teak);for(let s of [-1,1])g.tube([s*.36,.1,7.31],[s*.36,-1.65,7.31],.032,.032,metal,8);
 for(let y=0;y>=-1.6;y-=.33)g.tube([-.36,y,7.31],[.36,y,7.31],.025,.025,metal,8);
 for(let s of [-1,1])for(let i=0;i<3;i++){g.tag=1;g.tube([s*1.33,.68,2.7+i*.65],[s*1.33,1.68,2.7+i*.65],.17,.14,[.56,.61,.57],12);}
 g.tag=0;return g;
}
function wreckVessel(){
 const g=new Geometry();g.material=13;const rusty=[.37,.34,.23],dark=[.16,.20,.17];
 // Broken, open ribs, not a blocked aquarium or a sealed cave.
 for(let k=0;k<18;k++){
  const z=-16+k*1.82,w=4.3*Math.pow(Math.sin(Math.PI*(k+.5)/18),.45);
  for(let j=0;j<10;j++){if((k===4||k===12)&&j>6)continue;const a=Math.PI*j/10,b=Math.PI*(j+1)/10;g.tube([Math.cos(a)*w,1.95-Math.sin(a)*2.25,z],[Math.cos(b)*w,1.95-Math.sin(b)*2.25,z],.13,.11,rusty,6);}
 }
 for(let side of [-1,1])for(let k=0;k<14;k++){if((k+side)%5===0)continue;let z=-14+k*2.05,w=3.8*Math.pow(Math.sin(Math.PI*(k+1)/16),.45);g.box([side*w,1.25,z],[.24,1.9,1.78],rusty);}
 g.box([0,-.08,0],[3.3,.26,24],dark);g.box([0,2.1,4.7],[5.0,.26,5.7],rusty);
 for(let x of [-1.9,1.9])for(let z of [2.6,6.8])g.tube([x,2.2,z],[x,5.1,z],.16,.11,rusty,7);
 g.box([0,5.04,4.7],[4.5,.18,4.9],rusty);g.tube([0,.3,-5],[1.5,5.7,-6],.20,.07,rusty,8);
 for(let i=0;i<12;i++){let z=-11+i*2;g.tube([-2,.15,z],[2,.15,z+.55],.11,.12,rusty,6);}
 return g;
}
function dolphinGeometry(low=false){
 const g=new Geometry();g.material=14;g.shadow=true;
 surface(g,(u,v)=>{const a=v*TAU,x=1.75-u*3.85,q=Math.pow(Math.sin(u*Math.PI),.68)*(1-.57*u);return [x,Math.cos(a)*q*.48,Math.sin(a)*q*.46];},low?22:58,low?12:28,(p)=>p[1]<-.06?[.72,.76,.73]:[.29,.38,.42],1);
 g.sphere([1.62,-.08,0],[.54,.14,.15],[.51,.58,.58],low?12:24,12);
 for(let s of [-1,1]){
  g.sphere([1.2,.02,s*.263],[.043,.037,.025],[.024,.034,.038],10,8);
  surface(g,(u,v)=>{let z=s*(.33+u*.77),x=.12-u*.5-(v-.5)*(.33*(1-u)+.04);return [x,-.13-u*.22+.035*Math.sin(v*TAU),z];},10,6,[.30,.40,.44],s);
  surface(g,(u,v)=>{let z=s*u*.94,x=-1.86-u*.19-(v-.5)*(.53*(1-u*.73));return [x,.01+.044*Math.sin(v*TAU),z];},14,6,[.28,.38,.42],s);
 }
 // Rounded dorsal fin instead of a free-floating triangle.
 for(let s of [-1,1])surface(g,(u,v)=>{const y=.29+u*.54,w=.51*(1-u);return [-.15+u*.13+(v-.5)*w,y,s*.026*Math.sin(v*Math.PI)*(1-u)];},12,8,[.29,.38,.42],s);
 return g;
}
const dolphinSpec={id:'dolphin',name:'瓶鼻海豚',latin:'Tursiops spp. · 原創類群模型',en:'BOTTLENOSE DOLPHIN',color:0x698a99,zone:5,height:.22,width:.11,size:1,hint:'流線身形、短吻與弧形背鰭。',detail:'本版的原創伴游海豚。動物行為為遊戲編排，不可用作接近真實野生動物的指引。'};
SPECIES.push(dolphinSpec);SPECIES[9].zone=5;SPECIES[10].zone=7;
const constructCore=buildReef;
buildReef=function(r){
 constructCore(r);
 const reefs=[[],[],[],[]],plates=[],branches=[],fans=[];
 const patches=[[-82,-63,12],[-112,-93,18],[-125,-52,14],[85,-73,13],[117,-96,15],[130,-127,15],[71,-136,11],[113,-186,10],[-67,-171,15],[38,-200,13],[-109,-234,19],[90,-257,16],[-140,2,19],[128,15,19],[-179,-120,20],[183,-160,19]];
 patches.forEach(([cx,cz,sz],idx)=>{
  for(let k=0;k<4;k++){const a=k*2.39996+idx,x=cx+Math.cos(a)*k*sz*.45,z=cz+Math.sin(a)*k*sz*.4;const sx=sz*rr(.43,.74),sy=sx*rr(.18,.31),sy0=groundHeight(x,z)-sy*.16;
   const ob={p:[x,sy0,z],s:[sx,sy,sx*rr(.75,1.15)],yaw:rr(0,6.28)};reefs[idx%4].push(ob);obstacles.push({p:ob.p.slice(),s:ob.s.map(n=>n*.86)});
   for(let j=0;j<9;j++){const a=j*2.39996,d=rr(.14,.64),px=x+Math.cos(a)*sx*d,pz=z+Math.sin(a)*sx*d;const py=rockTop(ob,idx%4,px,pz);if(!Number.isFinite(py))continue;const sc=rr(.55,1.65);const inst={p:[px,py-.04,pz],s:[sc,sc*.74,sc],yaw:a,phase:a};(j%4===0?fans:j%3===0?branches:plates).push(inst);}
  }
 });
 for(let k=0;k<4;k++){let hi=r.batch(rockGeometry(k),reefs[k]);hi.maxDistance=65;let lo=r.batch(rockGeometry(k,true),reefs[k]);lo.minDistance=65;lo.maxDistance=430;lo.shadowProxy=true;}
 for(const [make,items] of [[()=>tableCoral(0),plates],[()=>branchCoral(2),branches],[fanCoral,fans]]){reefDetailLevel=0;const hi=r.batch(make(),items);hi.maxDistance=32;const lo=r.batch(distantColony(make===fanCoral?6:3),items);lo.minDistance=32;lo.maxDistance=95;lo.shadow=false;}reefDetailLevel=1;
 // Wider, spatially legible passage. Same generated stone style, different scale/context.
 const gy=groundHeight(-102,-76);r.batch(archGeometry(),[{p:[-102,gy-3,-76],s:[3.25,3.1,2.6],yaw:.12}]).maxDistance=240;
 for(let k=0;k<11;k++){const a=.12+k/10*(Math.PI-.24);obstacles.push({p:[-102+Math.cos(a)*14.3,gy-3+Math.sin(a)*14.2,-76],s:[3.1,3.5,3.4]});}
 const piers=[-1,1].map(side=>{const x=-102+side*14.1,z=-76;return {p:[x,groundHeight(x,z)+.55,z],s:[4.1,2.8,3.8],yaw:side*.6};});r.batch(rockGeometry(1),piers).maxDistance=220;for(const a of piers)obstacles.push({p:a.p.slice(),s:a.s.map(v=>v*.86)});
 const wy=groundHeight(99,-166);r.batch(wreckVessel(),[{p:[99,wy+.10,-166],yaw:-.24}]).maxDistance=230;
 // Small research logger outside the hull. Interaction is read-only; no salvage mechanic.
 const logger=new Geometry();logger.material=12;logger.box([0,0,0],[.66,.48,.37],[.84,.64,.25]);logger.box([0,.08,.196],[.4,.17,.035],[.055,.17,.18]);logger.tube([0,-1.8,0],[0,0,0],.025,.025,[.58,.61,.56],8);
 r.batch(logger,[{p:[95,wy+3,-147]}]).maxDistance=70;
 // Above-water home base and distant islands are real meshes, not a wallpaper.
 const boat=r.batch(researchVessel(),[{p:OPEN_WORLD.boat.slice(),yaw:-.14}]);boat.maxDistance=600;
 for(let k=0;k<3;k++){const isles=[{p:[-235,-13,120],s:[76,63,61],yaw:.7},{p:[168,-10,168],s:[89,48,70],yaw:.2},{p:[225,-6,-10],s:[52,41,76],yaw:.5}];const g=rockGeometry(k,true);g.material=15;const b=r.batch(g,[isles[k]]);b.maxDistance=1000;b.shadow=false;}
};
const spawnCoreLife=addLife;
addLife=function(r){
 // Legacy generator enumerates all species; supply the existing 11 only, then append dolphins.
 const ds=SPECIES.pop();spawnCoreLife(r);SPECIES.push(ds);
 const rays=life.filter(f=>f.species===9);rays.forEach((f,i)=>{f.center=[101+i*2,0,-87-i*8];f.fixedDepth=-16-i*2;f.radius=15+i*3;f.speed=.022+i*.003;});
 const whale=life.find(f=>f.species===10);whale.center=[-10,0,-231];whale.fixedDepth=-34;whale.radius=26;whale.speed=.010;whale.s=[1.85,1.85,1.85];
 const dolphin=[];for(let i=0;i<3;i++){const f={p:[110,-7,-73],s:[.95+i*.08,.95+i*.08,.95+i*.08],yaw:0,pitch:0,phase:i*2.1,species:11,orbit:i*2.1,radius:19,center:[108,0,-83],fixedDepth:-8-i*1.5,height:10,speed:.065,bob:i*2.7,tint:[1,1,1]};life.push(f);dolphin.push(f);}
 const hi=r.batch(dolphinGeometry(),dolphin,7,true);hi.maxDistance=24;const lo=r.batch(dolphinGeometry(true),dolphin,7,true);lo.minDistance=24;lo.maxDistance=220;lo.shadow=false;
 // Share species geometry across newly populated destinations, preserving phenotype/LOD identity.
 for(let sp of [1,2,3,4,5,6,7,8]){const originals=life.filter(f=>f.species===sp),clones=[];const spots=[[-104,-69],[108,-82],[97,-157]];
  for(let k=0;k<(sp===5?42:sp===8?3:9);k++){const source=originals[k%originals.length],spot=spots[k%3];const f=JSON.parse(JSON.stringify(source));delete f.bioBaseScale;delete f.bioGenes;f.center=[spot[0]+rr(-6,6),0,spot[1]+rr(-7,7)];f.fixedDepth=undefined;f.height=sp===8?10:rr(3,7);f.radius=rr(3.2,9.2);f.orbit=rr(0,TAU);f.bob=rr(0,TAU);clones.push(f);life.push(f);}
  const arrays=new Set();for(const b of r.batches)if(b.dynamic&&b.instances.length&&b.instances[0].species===sp&&!arrays.has(b.instances)){arrays.add(b.instances);b.instances.push(...clones);}
 }
 allLife=life.concat(decorLife);
 if(r.gl){for(const b of r.batches){if(b.data.length<b.instances.length*24){b.data=new Float32Array(b.instances.length*24);r.gl.bindBuffer(r.gl.ARRAY_BUFFER,b.ib);r.gl.bufferData(r.gl.ARRAY_BUFFER,b.data.byteLength,r.gl.DYNAMIC_DRAW);}}}
};
