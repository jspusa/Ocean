/* OPEN WATER 0.8 — original continuous-world art and landmarks.
   Game metres, NOT surveyed coordinates or a real dive plan.
   The old sculpted core is retained; new vistas are authored as linked destinations. */
const OPEN_WORLD={bounds:{x:270,z:295,centerZ:-90},boat:[-24,0,43],version:'0.17.0'};
const coreGroundHeight=groundHeight;
const archBedCos=Math.cos(REEF_ARCH.yaw),archBedSin=Math.sin(REEF_ARCH.yaw);
groundHeight=function(x,z){
 const core=coreGroundHeight(x,z);
 const c=Math.exp(-Math.pow(x/57,4)-Math.pow((z+22)/91,4));
 const shelf=-21-26*smooth01((-z-6)/170)-24*smooth01((-z-170)/125);
 const atoll=10*Math.exp(-((x+101)**2/3700+(z+79)**2/4800));
 const east=16*Math.exp(-((x-104)**2/4300+(z+105)**2/7500));
 const lagoon=11*Math.exp(-((x+35)**2/3200+(z-46)**2/2000));
 const contour=1.3*Math.sin(x*.039+z*.018)*Math.cos(z*.033)+.6*terrainNoise(x*.31,z*.28);
 const open=shelf+atoll+east+lagoon+contour;
 let floor=Math.min(-5.2,mix(open,core,c));
 // A visible, shallow scour through the stone passage gives the complete
 // swimmer room above the real seabed. The 22-grid support vertices stay in
 // the 30 cm central depression; a compact smooth rim rejoins the old floor.
 const dx=x-REEF_ARCH.p[0],dz=z-REEF_ARCH.p[2];
 if(Math.abs(dx)<12&&Math.abs(dz)<14){
  const across=Math.abs(archBedCos*dx-archBedSin*dz),along=Math.abs(archBedSin*dx+archBedCos*dz);
  if(across<9&&along<12)floor-=.30*(1-smooth01((across-6)/3))*(1-smooth01((along-9)/3));
 }
 return floor;
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
// The visible coastal grid and its contact owner share samples and topology.
// Samples are prepared after all regional ground extensions have registered;
// the cache is independent of graphics quality and downloaded mesh residency.
const OceanCoastalGround=(()=>{
 const span=64,segments=22,count=10,tiles=new Map(),edge=260;
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 function tile(ix,iz){
  const key=iz*count+ix;let t=tiles.get(key);if(t)return t;
  const cx=(ix-4.5)*span,cz=(iz-4.5)*span-90,x=[],z=[],heights=new Float64Array((segments+1)**2);
  for(let i=0;i<=segments;i++){x.push(Math.min(edge,cx+(i/segments-.5)*span));z.push(cz+(i/segments-.5)*span);}
  for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++)heights[j*(segments+1)+i]=groundHeight(x[i],z[j]);
  t={cx,cz,x,z,heights,renderX:x.map(v=>cx+Math.fround(v-cx)),renderZ:z.map(v=>cz+Math.fround(v-cz))};tiles.set(key,t);return t;
 }
 function prepare(){for(let iz=0;iz<count;iz++)for(let ix=0;ix<count;ix++)tile(ix,iz);}
 function point(ix,iz,i,j,n=segments){
  const t=tile(ix,iz);if(n===segments)return [t.x[i]-t.cx,t.heights[j*(segments+1)+i],t.z[j]-t.cz];
  const x=Math.min(edge,t.cx+(i/n-.5)*span),z=t.cz+(j/n-.5)*span;return [x-t.cx,groundHeight(x,z),z-t.cz];
 }
 const index=(v,start,n)=>Math.max(0,Math.min(n-1,Math.floor((v-start)/span)));
 function visit(minX,maxX,minZ,maxZ,lowest,fn){
  if(maxX< -320||minX>edge||maxZ< -410||minZ>230)return;
  for(let iz=index(minZ,-410,count);iz<=index(maxZ,-410,count);iz++)for(let ix=index(minX,-320,count);ix<=index(maxX,-320,count);ix++){
   const t=tile(ix,iz),cell=(v,start)=>Math.max(0,Math.min(segments-1,Math.floor((v-start)/span*segments)));
   const i0=cell(minX-.00001,t.cx-32),i1=cell(maxX+.00001,t.cx-32),j0=cell(minZ-.00001,t.cz-32),j1=cell(maxZ+.00001,t.cz-32);
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const x0=t.renderX[i],x1=t.renderX[i+1],z0=t.renderZ[j],z1=t.renderZ[j+1];if(x0===x1)continue;
    const at=j*(segments+1)+i,h00=Math.fround(t.heights[at]),h10=Math.fround(t.heights[at+1]),h01=Math.fround(t.heights[at+segments+1]),h11=Math.fround(t.heights[at+segments+2]);
    // Most swimming queries end here, before allocating triangle vectors.
    if(lowest>Math.max(h00,h10,h01,h11))continue;
    const a=[x0,h00,z0],b=[x1,h10,z0],c=[x1,h11,z1],d=[x0,h01,z1];fn([a,c,b]);fn([a,d,c]);
   }
  }
 }
 function height(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x< -320||x>edge||z< -410||z>230)return -Infinity;
  const ix=index(x,-320,count),iz=index(z,-410,count),t=tile(ix,iz),cell=(v,start)=>Math.max(0,Math.min(segments-1,Math.floor((v-start)/span*segments)));
  let i=cell(x,t.cx-32),j=cell(z,t.cz-32);while(i>0&&t.renderX[i]===t.renderX[i+1])i--;
  // Float32 local coordinates can differ slightly from the analytic grid.
  while(i>0&&x<t.renderX[i])i--;while(i<segments-1&&x>t.renderX[i+1])i++;
  while(j>0&&z<t.renderZ[j])j--;while(j<segments-1&&z>t.renderZ[j+1])j++;
  const u=(x-t.renderX[i])/(t.renderX[i+1]-t.renderX[i]),v=(z-t.renderZ[j])/(t.renderZ[j+1]-t.renderZ[j]),k=j*(segments+1)+i;
  const a=Math.fround(t.heights[k]),b=Math.fround(t.heights[k+1]),c=Math.fround(t.heights[k+segments+2]),d=Math.fround(t.heights[k+segments+1]);
  return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
 }
 function penetration(p,r,v){
  const [a,b,c]=v,ab=sub(b,a),ac=sub(c,a),n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...n);for(let k=0;k<3;k++)n[k]/=length;
  // Below the solid seabed, recover through its upward face. For an ordinary
  // above-ground sphere use the finite triangle, including edges and corners.
  const signed=dot(sub(p,a),n),verticalInside=[0,1,2].every(k=>{const u=v[k],w=v[(k+1)%3];return (w[0]-u[0])*(p[2]-u[2])-(w[2]-u[2])*(p[0]-u[0])<=1e-8;});
  if(signed<0&&verticalInside)return {normal:n,distance:r-signed};
  const q=OceanTriangleContact.closest(p,v),delta=sub(p,q),distance=Math.hypot(...delta);
  if(distance>=r-.000001)return null;
  return {normal:distance>1e-12?delta.map(v=>v/distance):n,distance:r-distance};
 }
 function contact(p,r=0){
  if(!p.every(Number.isFinite)||!Number.isFinite(r)||r<0)return null;let best=null;
  visit(p[0]-r,p[0]+r,p[2]-r,p[2]+r,p[1]-r,v=>{const hit=penetration(p,r,v);if(hit&&(!best||hit.distance>best.distance))best=hit;});return best;
 }
 function sweep(a,b,r=0){
  if(!a.every(Number.isFinite)||!b.every(Number.isFinite)||!Number.isFinite(r)||r<0)return null;
  const delta=sub(b,a);if(Math.hypot(...delta)<1e-12)return null;let best=null;
  visit(Math.min(a[0],b[0])-r,Math.max(a[0],b[0])+r,Math.min(a[2],b[2])-r,Math.max(a[2],b[2])+r,Math.min(a[1],b[1])-r,v=>{
   const inside=penetration(a,r,v);let hit;
   if(inside){if(dot(inside.normal,delta)>=-1e-10)return;hit={fraction:0,normal:inside.normal};}
   else hit=OceanTriangleContact.sweep(a,delta,r,v,best?.fraction??1);
   if(hit&&(!best||hit.fraction<best.fraction))best=hit;
  });return best;
 }
 return Object.freeze({prepare,point,height,contact,sweep});
})();
function contactGroundHeight(x,z){const y=OceanCoastalGround.height(x,z);return Number.isFinite(y)?y:groundHeight(x,z);}
// Shared terrain tiles. No terrain generation or asset fetching on the swimming hot path.
addGroundTiles=function(r){
 const span=64,count=10;
 for(let iz=0;iz<count;iz++)for(let ix=0;ix<count;ix++){
  const cx=(ix-4.5)*span,cz=(iz-4.5)*span-90;
  for(let lod=0;lod<2;lod++){
   const g=new Geometry();g.material=1;g.shadow=true;const clipped=cx+span/2>260,coarse=lod&&!clipped,N=coarse?7:22;
   // The continuous trench slope owns terrain east of x=260. Collapse the
   // outer tile strip onto that shared coast instead of drawing a shelf over it.
   function pt(i,j,n=N){return OceanCoastalGround.point(ix,iz,i,j,n);}
   function norm(p){const x=p[0]+cx,z=p[2]+cz,e=.20;return V.norm([groundHeight(x-e,z)-groundHeight(x+e,z),2*e,groundHeight(x,z-e)-groundHeight(x,z+e)]);}
   // The four-metre coast strip has only 88 triangles at full resolution.
   // Keep those samples in both LODs so its new eastern edge cannot crack.
   const start=coarse?1:0,end=coarse?N-1:N;
   for(let j=start;j<end;j++)for(let i=start;i<end;i++){let p=[pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)],n=p.map(norm);if(p[0][0]===p[1][0])continue;const col=[.90,.89,.83];g.tri(p[0],p[2],p[1],col,[n[0],n[2],n[1]]);g.tri(p[0],p[3],p[2],col,[n[0],n[3],n[2]]);}
   if(coarse){
    // Every tile/LOD shares the near mesh's exact 22-segment perimeter. A
    // triangulated ring joins it to the coarse interior without vertical skirts
    // or mismatched edge heights on steep terrain. The near mesh is unchanged.
    const outer=22,inner=N-2;
    const ring=(side,i,n,inset)=>{const a=i+inset,b=n+inset,k=inset,ij=[[a,k],[b,a],[b-a+k,b],[k,b-a+k]][side];return pt(ij[0],ij[1],n+2*inset);};
    const put=(a,b,c)=>{const face=V.cross(V.sub(b,a),V.sub(c,a));if(V.len(face)<1e-9)return;if(face[1]<0)[b,c]=[c,b];g.tri(a,b,c,[.90,.89,.83],[norm(a),norm(b),norm(c)]);};
    for(let side=0;side<4;side++){
     const a=Array.from({length:outer+1},(_,i)=>ring(side,i,outer,0)),b=Array.from({length:inner+1},(_,i)=>ring(side,i,inner,1));let i=0,j=0;
     while(i<outer||j<inner){if(j===inner||(i<outer&&(i+1)/outer<=(j+1)/inner)){put(a[i],a[i+1],b[j]);i++;}else{put(a[i],b[j+1],b[j]);j++;}}
    }
   }
   const b=r.batch(g,[{p:[cx,0,cz]}]);if(!lod){b.maxDistance=100;b.shadowProxy=true;}else {b.minDistance=100;b.maxDistance=520;b.shadow=false;}
  }
 }
};
// Cross-section hull. These meshes are authored here, not copied game assets.
function researchVessel(){
 const g=new Geometry();g.material=12;const white=[.88,.88,.82],navy=[.06,.16,.23],metal=[.53,.59,.58],teak=[.53,.35,.20];
 surface(g,(u,v)=>{const z=(u-.5)*15.8,angle=Math.PI*v,w=3.20*Math.pow(Math.sin(Math.PI*u),.32),y=.62-Math.sin(angle)*1.82;return [Math.cos(angle)*w,y,z];},54,16,(p,u,v)=>p[1]>.17?white:navy,1);
 // A connected deck and side passages, matching oceanShip's boat-local bounds.
 const deckWidth=z=>2.95*Math.pow(Math.sin(Math.PI*(z/15.8+.5)),.32);
 for(let i=0;i<44;i++){const z=-6.55+i*12.7/44,z1=z+12.7/44,w=deckWidth(z),w1=deckWidth(z1);g.quad([-w,.68,z],[-w1,.68,z1],[w1,.68,z1],[w,.68,z],teak);g.quad([-w,.50,z],[w,.50,z],[w1,.50,z1],[-w1,.50,z1],teak);for(const s of [-1,1])g.quad([s*w,.50,z],[s*w,.68,z],[s*w1,.68,z1],[s*w1,.50,z1],white);}
 g.box([0,1.42,-.8],[3.5,1.6,5.1],white);g.box([0,2.35,-.75],[4.05,.18,5.7],white);
 // Windows separated by actual mullions; cabin interior is intentionally opaque.
 for(let s of [-1,1])for(let z of [-2.35,-.85,.65])g.box([s*1.757,1.78,z],[.03,.65,1.26],[.055,.19,.23]);
 g.box([0,1.78,-3.362],[2.92,.70,.035],[.055,.19,.23]);g.box([0,1.30,1.764],[.81,1.5,.04],navy);
 for(let s of [-1,1]){
  for(let i=0;i<10;i++){const z=-6.1+i*1.35,w=2.85*Math.pow(Math.sin(Math.PI*(z/15.8+.5)),.32);g.tube([s*w,.67,z],[s*w,1.41,z],.027,.027,metal,6);if(i<9){const z1=z+1.35,w1=2.85*Math.pow(Math.sin(Math.PI*(z1/15.8+.5)),.32);g.tube([s*w,1.41,z],[s*w1,1.41,z1],.03,.03,metal,6);}}
  for(let z of [-3.1,2.8,4.5]){const w=3.16*Math.pow(Math.sin(Math.PI*(z/15.8+.5)),.32);g.sphere([s*w,.2,z],[.20,.62,.22],[.05,.075,.082],12,9);g.tube([s*(w-.03),.9,z],[s*w,.40,z],.014,.014,[.63,.58,.44],5);}
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
 g.growthSurfaces={panels:[],decks:[]};
 // Broken, open ribs, not a blocked aquarium or a sealed cave.
 for(let k=0;k<18;k++){
  const z=-16+k*1.82,w=4.3*Math.pow(Math.sin(Math.PI*(k+.5)/18),.45);
  for(let j=0;j<10;j++){if((k===4||k===12)&&j>6)continue;const a=Math.PI*j/10,b=Math.PI*(j+1)/10;g.tube([Math.cos(a)*w,1.95-Math.sin(a)*2.25,z],[Math.cos(b)*w,1.95-Math.sin(b)*2.25,z],.13,.11,rusty,6);}
 }
 for(let side of [-1,1])for(let k=0;k<14;k++){if((k+side)%5===0)continue;let z=-14+k*2.05,w=3.8*Math.pow(Math.sin(Math.PI*(k+1)/16),.45);const p=[side*w,1.25,z],s=[.24,1.9,1.78];g.box(p,s,rusty);g.growthSurfaces.panels.push({p,s,side});}
 g.box([0,-.08,0],[3.3,.26,24],dark);
 const lowerDeck={p:[0,2.1,4.7],s:[5.0,.26,5.7]};g.box(lowerDeck.p,lowerDeck.s,rusty);g.growthSurfaces.decks.push(lowerDeck);
 for(let x of [-1.9,1.9])for(let z of [2.6,6.8])g.tube([x,2.2,z],[x,5.1,z],.16,.11,rusty,7);
 const upperDeck={p:[0,5.04,4.7],s:[4.5,.18,4.9]};g.box(upperDeck.p,upperDeck.s,rusty);g.growthSurfaces.decks.push(upperDeck);g.tube([0,.3,-5],[1.5,5.7,-6],.20,.07,rusty,8);
 for(let i=0;i<12;i++){let z=-11+i*2;g.tube([-2,.15,z],[2,.15,z+.55],.11,.12,rusty,6);}
 return g;
}
// Two original deck colonies intersect the forward posts with the wider leaf
// form. Their reviewed moves stay on the same actual deck with unchanged
// height, scale and yaw; the full source identities make the exception local.
// BEGIN WRECK_PLATE_CLEARANCE_RELOCATIONS
const WRECK_PLATE_CLEARANCE_RELOCATIONS=Object.freeze([{"id":"wreck-port-forward-plate-clearance","original":{"p":[96.5679588916619,-33.94441215240233,-163.63429671189442],"s":[0.40876262421719733,0.5342414341625346,0.40876262421719733],"yaw":0.45999999999999996,"phase":0.84},"to":{"p":[96.60554865100615,-33.94441215240233,-163.28632112368103],"s":[0.40876262421719733,0.5342414341625346,0.40876262421719733],"yaw":0.45999999999999996,"pitch":0}},{"id":"wreck-starboard-forward-plate-clearance","original":{"p":[100.06477560112921,-33.94441215240233,-162.77856725675673],"s":[0.5091726643312723,0.6338445240675619,0.5091726643312723],"yaw":-0.94,"phase":6.72},"to":{"p":[99.84302725150567,-33.94441215240233,-162.44565935742233],"s":[0.5091726643312723,0.6338445240675619,0.5091726643312723],"yaw":-0.94,"pitch":0}}]);
// END WRECK_PLATE_CLEARANCE_RELOCATIONS
function buildWreckHabitat(r,wy){
 const geometry=wreckVessel(),pose={p:[99,wy+.10,-166],yaw:-.24},wreck=r.batch(geometry,[pose]);wreck.maxDistance=230;wreck.sceneRole='wreck-hull';
 const wreckFans=[],wreckSponges=[],wreckPlates=[],{panels,decks}=geometry.growthSurfaces;let fan=0,deckPlant=0;
 const toWreck=(x,y,z)=>{const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);return [pose.p[0]+c*x+s*z,pose.p[1]+y,pose.p[2]-s*x+c*z];};
 for(let k=0;k<28;k++){
  const isFan=k%5===0,side=k%2?1:-1,scale=.40+.28*random();let x,z,support;
  if(isFan){support=panels[Math.floor(fan++*panels.length/6)];x=support.p[0];z=support.p[2];}
  else{const cell=Math.floor(deckPlant/2);support=decks[deckPlant++%2];x=support.p[0]+[-.72,-.24,.24,.72][cell%4]*support.s[0]/2;z=support.p[2]+[-.64,0,.64][Math.floor(cell/4)]*support.s[2]/2;}
  // The ceiling selects this actual panel/deck, rather than a roof above it.
  // Broken hull gaps have no attachment sites; broad colonies use intact decks.
  const y=OceanRockContact.surfaceAt(geometry,x,z,support.p[1]+support.s[1]/2+.05);
  if(!Number.isFinite(y))throw Error('Wreck growth has no rendered support');
  const inst={p:toWreck(x,y-.012,z),s:[scale,scale*(1.1+random()*.30),scale],yaw:pose.yaw+side*.70,phase:k*.84};
  (isFan?wreckFans:k%3===0?wreckSponges:wreckPlates).push(inst);
 }
 // Match every original field. The same 1e-10 construction arithmetic allowance
 // used by reef replay accommodates JS engines without rounding stored poses.
 const same=(a,b)=>typeof a==='number'||typeof b==='number'?Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10:a===null||b===null||typeof a!=='object'||typeof b!=='object'?a===b:Array.isArray(a)!==Array.isArray(b)?false:Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
 for(const entry of WRECK_PLATE_CLEARANCE_RELOCATIONS){const matches=wreckPlates.filter(n=>same(entry.original,n));if(matches.length!==1)throw Error('Wreck plate clearance source identity differs: '+entry.id);const n=matches[0];if(!same([entry.to.s,entry.to.yaw,entry.to.pitch,entry.to.p[1]],[n.s,n.yaw,n.pitch||0,n.p[1]]))throw Error('Wreck plate clearance changes its deck attachment');n.p=entry.to.p.slice();}
 const wf=r.batch(fanCoral(),wreckFans,3);wf.maxDistance=65;wf.sceneRole='wreck-fans';
 const ws=r.batch(spongeGeometry(true),wreckSponges);ws.maxDistance=48;ws.sceneRole='wreck-sponges';
 reefDetailLevel=0;const wp=r.batch(tableCoral(1),wreckPlates);wp.maxDistance=50;wp.sceneRole='wreck-plates';reefDetailLevel=1;
}
function dolphinGeometry(low=false){
 const g=new Geometry();g.material=14;g.shadow=true;
 surface(g,(u,v)=>{const a=v*TAU,x=1.75-u*3.85,q=Math.pow(Math.sin(u*Math.PI),.65)*(1-.55*u)*(1+.10*Math.exp(-Math.pow((u-.15)/.12,2)));return [x,Math.cos(a)*q*.48,Math.sin(a)*q*.46];},low?22:58,low?12:28,(p)=>p[1]<-.06?[.72,.76,.73]:[.29,.38,.42],1);
 // A narrow tapered rostrum and jaw line connect to the rounded melon.
 surface(g,(u,v)=>{const a=v*TAU,w=.126*(1-.58*u)+.008*Math.sin(u*Math.PI);return [1.28+u*.86,-.096+Math.cos(a)*w*.65,Math.sin(a)*w];},low?14:26,low?8:16,[.51,.58,.58],-1);
 g.sphere([2.125,-.096,0],[.035,.035,.054],[.51,.58,.58],low?10:18,low?6:10);
 if(!low)for(const side of [-1,1]){let prev=null;for(let i=0;i<16;i++){const t=i/15,p=[1.30+t*.83,-.098,side*(.127*(1-.58*t))];if(prev)g.tube(prev,p,.0028,.002,[.18,.25,.26],4);prev=p;}}
 g.sphere([1.10,.308,0],[.034,.003,.021],[.12,.20,.22],low?8:14,6);
 for(let s of [-1,1]){
  g.sphere([1.2,.02,s*.300],[.043,.037,.025],[.024,.034,.038],10,8);
  surface(g,(u,v)=>{let z=s*(.33+u*.77),x=.12-u*.5-(v-.5)*(.33*(1-u)+.04);return [x,-.13-u*.22+.035*Math.sin(v*TAU),z];},10,6,[.30,.40,.44],s);
  surface(g,(u,v)=>{let z=s*u*.94,x=-1.86-u*.19-(v-.5)*(.53*(1-u*.73));return [x,.01+.044*Math.sin(v*TAU),z];},14,6,[.28,.38,.42],s);
 }
 // Rounded dorsal fin instead of a free-floating triangle.
 for(let s of [-1,1])surface(g,(u,v)=>{const y=.29+u*.54,w=.55*Math.pow(1-u,.78);return [-.15-u*.30+.11*Math.sin(u*Math.PI)+(v-.5)*w,y,s*.030*Math.sin(v*Math.PI)*(1-u)];},12,8,[.29,.38,.42],s);
 return g;
}
const dolphinSpec={id:'dolphin',name:'瓶鼻海豚',latin:'Tursiops spp. · 原創類群模型',en:'BOTTLENOSE DOLPHIN',color:0x698a99,zone:5,height:.22,width:.11,size:1,hint:'流線身形、短吻與弧形背鰭。',detail:'本版的原創伴游海豚。動物行為為遊戲編排，不可用作接近真實野生動物的指引。'};
SPECIES.push(dolphinSpec);SPECIES[9].zone=5;SPECIES[10].zone=7;
const constructCore=buildReef;
let reefGrowthFitReport=null;
buildReef=function(r){
 reefGrowthFitReport=null;
 const rootBatch=r.batch,rootEntries=[];r.batch=function(geometry,instances,kind=0,dynamic=false){const batch=rootBatch.call(this,geometry,instances,kind,dynamic);if(geometry.reefGrowth||geometry.rockContact||geometry.material===1||geometry.material===13)rootEntries.push({geometry,instances,batch,batchIndex:r.batches?.indexOf(batch)??-1});return batch;};
 try{
 constructCore(r);
 const reefs=[[],[],[],[]],plates=[],branches=[],fans=[];
 const patches=[[-82,-63,12],[-112,-93,18],[-125,-52,14],[85,-73,13],[117,-96,15],[130,-127,15],[71,-136,11],[113,-186,10],[-67,-171,15],[38,-200,13],[-109,-234,19],[90,-257,16],[-140,2,19],[128,15,19],[-179,-120,20],[183,-160,19]];
 patches.forEach(([cx,cz,sz],idx)=>{
  for(let k=0;k<4;k++){const a=k*2.39996+idx,x=cx+Math.cos(a)*k*sz*.45,z=cz+Math.sin(a)*k*sz*.4;const sx=sz*rr(.43,.74),sy=sx*rr(.18,.31),sy0=groundHeight(x,z)-sy*.16;
   const ob={p:[x,sy0,z],s:[sx,sy,sx*rr(.75,1.15)],yaw:rr(0,6.28)};reefs[idx%4].push(ob);obstacles.push({p:ob.p.slice(),s:ob.s.map(n=>n*.86)});
   for(let j=0;j<9;j++){const a=j*2.39996,d=rr(.14,.64),px=x+Math.cos(a)*sx*d,pz=z+Math.sin(a)*sx*d;const py=rockLayoutTop(ob,idx%4,px,pz);if(!Number.isFinite(py))continue;const sc=rr(.55,1.65);const inst={p:[px,py-.04,pz],s:[sc,sc*.74,sc],yaw:a,phase:a};(j%4===0?fans:j%3===0?branches:plates).push(inst);}
  }
 });
 for(let k=0;k<4;k++){let hi=r.batch(rockGeometry(k),reefs[k]);hi.maxDistance=65;let lo=r.batch(rockGeometry(k,true),reefs[k]);lo.minDistance=65;lo.maxDistance=430;lo.shadowProxy=true;}
 for(const [make,items,type] of [[()=>tableCoral(0),plates,3],[()=>branchCoral(2),branches,2],[fanCoral,fans,6]]){reefDetailLevel=0;const hi=r.batch(make(),items,type===6?3:0);hi.maxDistance=32;const lo=r.batch(distantColony(type),items,type===6?3:0);lo.minDistance=32;lo.maxDistance=95;lo.shadow=false;}reefDetailLevel=1;
 // Wider, spatially legible passage. Same generated stone style, different scale/context.
 const gy=groundHeight(-102,-76);r.batch(archGeometry(),[{p:[-102,gy-3,-76],s:[3.25,3.1,2.6],yaw:.12}]).maxDistance=240;
 for(let k=0;k<11;k++){const a=.12+k/10*(Math.PI-.24);obstacles.push({p:[-102+Math.cos(a)*14.3,gy-3+Math.sin(a)*14.2,-76],s:[3.1,3.5,3.4],rockContactLegacy:true});}
 const piers=[-1,1].map(side=>{const x=-102+side*14.1,z=-76;return {p:[x,groundHeight(x,z)+.55,z],s:[4.1,2.8,3.8],yaw:side*.6};});r.batch(rockGeometry(1),piers).maxDistance=220;for(const a of piers)obstacles.push({p:a.p.slice(),s:a.s.map(v=>v*.86)});
 const wy=groundHeight(99,-166);buildWreckHabitat(r,wy);

 // Small research logger outside the hull. Interaction is read-only; no salvage mechanic.
 const logger=new Geometry();logger.material=12;logger.box([0,0,0],[.66,.48,.37],[.84,.64,.25]);logger.box([0,.08,.196],[.4,.17,.035],[.055,.17,.18]);logger.tube([0,-1.8,0],[0,0,0],.025,.025,[.58,.61,.56],8);
 r.batch(logger,[{p:[95,wy+3,-147]}]).maxDistance=70;
 // Above-water home base and distant islands are real meshes, not a wallpaper.
 const boat=r.batch(researchVessel(),[{p:OPEN_WORLD.boat.slice(),yaw:-.14}]);boat.maxDistance=600;boat.sceneRole='research-vessel';
 for(let k=0;k<3;k++){const isles=[{p:[-235,-13,120],s:[76,63,61],yaw:.7},{p:[168,-10,168],s:[89,48,70],yaw:.2},{p:[225,-6,-10],s:[52,41,76],yaw:.5}];const g=rockGeometry(k,true);g.material=15;const b=r.batch(g,[isles[k]]);b.maxDistance=1000;b.shadow=false;}
 reefGrowthFitReport=fitReefGrowth(rootEntries,!!r.gl,r.batches);
 // Attachment work is construction-only; no full source terrain/rock arrays
 // or query cache are retained for gameplay after their GPU/archive upload.
 }finally{r.batch=rootBatch;reefGroundSurfaces.length=0;rockHeightCache.clear();}
};
const spawnCoreLife=addLife;
addLife=function(r){
 // Core generator owns its eleven original entries; later species are appended separately.
 spawnCoreLife(r);
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
