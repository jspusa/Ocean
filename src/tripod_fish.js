/* Original Bathypterois grallator. +X anterior, +Y up, +Z lateral.
 * One model unit is standard length (SL): tail peduncle x=-.5 to snout x=.5.
 * The authored representative is .25 m SL; fins extend beyond that measure.
 * Sources and limits: docs/parity/TRIPOD-FISH-REFERENCE.md. */
const TripodFishArt=(()=>{
 // Authored charcoal pigment in display RGB, decoded to linear light by the
 // shared shader. A restrained belly gradient keeps black tissue readable
 // under the diver's lamp without emission or changing world illumination.
 const skin=[.160,.170,.180],belly=[.250,.255,.250];
 const paint=p=>{const ventral=cetaceanArt.soft(.99,.90,p[1]),grain=Math.sin(p[0]*141+p[2]*37)*Math.sin(p[1]*173-p[2]*83)*.002;return cetaceanArt.blend(skin,belly,ventral*.82).map(x=>x+grain);};
 const point=p=>Object.freeze(p),supports=Object.freeze([
  Object.freeze({id:'pelvic_left',fin:'pelvic',root:point([.025,.925,.026]),contact:point([.38,0,.48]),tag:7}),
  Object.freeze({id:'pelvic_right',fin:'pelvic',root:point([.025,.925,-.026]),contact:point([.38,0,-.48]),tag:7}),
  Object.freeze({id:'lower_caudal',fin:'lower_caudal',root:point([-.49,.953,0]),contact:point([-1.10,0,0]),tag:7})
 ]);
 function exterior(g,first){for(let k=first;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),n=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);if(V.dot(V.cross(V.sub(b,a),V.sub(c,a)),n)<0){const second=g.v.slice(k+12,k+24);for(let i=0;i<12;i++){g.v[k+12+i]=g.v[k+24+i];g.v[k+24+i]=second[i];}}}}
 function tube(g,points,radius,color,low){const first=g.v.length;faunaArt.tube(g,points,radius,color,low?4:6);exterior(g,first);}
 function ellipsoid(g,center,r,color,low){const first=g.v.length;faunaArt.ellipsoid(g,center,r,color,low?8:12,low?4:6);exterior(g,first);}
 function body(g,low){
  const rows=[[-.5,.96,0,0],[-.475,.96,.015,.012],[-.40,.96,.023,.017],[-.28,.96,.033,.024],[-.12,.96,.045,.032],[.06,.96,.056,.041],[.22,.96,.060,.044],[.33,.961,.048,.038],[.42,.96,.031,.027],[.48,.958,.017,.015],[.5,.958,0,0]];
  g.tag=1;cetaceanArt.skin(g,(u,v)=>{const x=mix(-.5,.5,u),r=cetaceanArt.profileAt(rows,x),a=v*TAU;return [x,r[1]+Math.cos(a)*r[2],Math.sin(a)*r[3]];},low?28:56,low?12:20,paint);
 }
 function stilts(g,low){
  g.tag=7;return supports.map(s=>{
   // Eight collinear intervals preserve the straight taper and every support
   // probe. Spend geometry on the visible fin surface rather than extra rings.
   const first=g.v.length/12,end=V.add(s.contact,[0,.008,0]),count=8,points=Array.from({length:count+1},(_,i)=>V.lerp(s.root,end,i/count));
   tube(g,points,t=>mix(.0055,.0028,t),[.068,.070,.063],low);
   // A thin, closely applied second pelvic ray ends halfway down the first.
   // It is not an extra leg and never adds a fourth substrate contact.
   if(s.fin==='pelvic'){const side=Math.sign(s.root[2]);tube(g,points.slice(0,Math.floor(count/2)+1).map((p,i)=>V.add(p,[-.004*i/count,0,side*.004*i/count])),t=>mix(.0022,.0008,t),[.075,.077,.069],low);}
   // The pad's lower pole is the actual declared y=0 contact vertex.
   ellipsoid(g,end,[.016,.008,.011],[.088,.087,.074],low);
   return Object.freeze({...s,range:Object.freeze({first,count:g.v.length/12-first})});
  });
 }
 function membrane(g,roots,tips,low){
  // Shared boundary vertices and normals make one thin surface. Independent
  // per-panel thickness offsets left a crack at every curved sensory ray.
  const intervals=roots.length-1,spanSteps=intervals*(low?1:2),chordSteps=low?2:3,thickness=.00055;
  const curve=(points,u)=>{const at=clamp(u,0,1)*intervals,i=Math.min(intervals-1,Math.floor(at)),t=at-i,a=points[i],b=points[i+1],before=points[Math.max(0,i-1)],after=points[Math.min(intervals,i+2)],t2=t*t,t3=t2*t;return a.map((x,k)=>clamp((2*t3-3*t2+1)*x+(t3-2*t2+t)*(b[k]-before[k])*.5+(-2*t3+3*t2)*b[k]+(t3-t2)*(after[k]-x)*.5,Math.min(x,b[k]),Math.max(x,b[k])));};
  const center=(u,v)=>V.lerp(curve(roots,u),curve(tips,u),v),delta=.0001;
  const reference=V.norm(V.cross(V.sub(tips[intervals],tips[0]),V.sub(tips[Math.floor(intervals/2)],roots[Math.floor(intervals/2)])));
  const side=Math.sign(roots[0][2]),bend=side?side*Math.sign(reference[2]):1,amplitude=g.tag===3?.010:.006;
  // Root and free edge remain anchored. The slight transverse bow is authored
  // tissue tension, not a measured specimen or a global lighting adjustment.
  const surface=(u,v)=>V.add(center(u,v),V.mul(reference,bend*amplitude*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)));
  const grid=Array.from({length:spanSteps+1},(_,i)=>Array.from({length:chordSteps+1},(_,j)=>{
   const u=i/spanSteps,v=j/chordSteps,p=surface(u,v),du=V.sub(surface(Math.min(1,u+delta),v),surface(Math.max(0,u-delta),v)),dv=V.sub(surface(u,Math.min(1,v+delta)),surface(u,Math.max(0,v-delta))),n=V.norm(V.cross(du,dv));
   return {p,n,front:V.add(p,V.mul(n,thickness)),back:V.sub(p,V.mul(n,thickness))};
  })),color=[.095,.104,.107];
  const face=(a,b,c,side)=>g.tri(a[side],b[side],c[side],color,[a,b,c].map(v=>side==='front'?v.n:V.mul(v.n,-1)));
  const rim=(a,b)=>{g.tri(a.front,a.back,b.back,color);g.tri(a.front,b.back,b.front,color);};
  for(let i=0;i<spanSteps;i++){for(let j=0;j<chordSteps;j++){const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1];face(a,b,c,'front');face(a,c,d,'front');face(a,c,b,'back');face(a,d,c,'back');}rim(grid[i][0],grid[i+1][0]);rim(grid[i+1][chordSteps],grid[i][chordSteps]);}
  for(let j=0;j<chordSteps;j++){rim(grid[0][j+1],grid[0][j]);rim(grid[spanSteps][j],grid[spanSteps][j+1]);}
  return surface;
 }
 function fin(g,roots,tips,low){
  const surface=membrane(g,roots,tips,low);
  for(let i=0;i<tips.length;i++)tube(g,i===0||i===tips.length-1?[roots[i],tips[i]]:[roots[i],surface(i/(tips.length-1),.5),tips[i]],t=>mix(.0015,.00065,t),[.205,.215,.220],low);
 }
 function ordinaryFins(g,low){
  g.tag=5;
  fin(g,[[-.23,.989,0],[-.15,1.003,0],[-.04,1.011,0],[.06,1.016,0],[.16,1.019,0]],[[-.23,1.012,0],[-.16,1.12,0],[-.04,1.19,0],[.06,1.14,0],[.16,1.022,0]],low);
  fin(g,[[-.38,.936,0],[-.30,.929,0],[-.22,.922,0],[-.12,.915,0],[-.035,.909,0]],[[-.42,.90,0],[-.35,.81,0],[-.24,.80,0],[-.12,.85,0],[-.035,.907,0]],low);
  fin(g,[[-.48,.97,0],[-.49,.965,0],[-.50,.96,0],[-.49,.953,0],[-.48,.948,0]],[[-.70,1.10,0],[-.65,1.027,0],[-.61,.96,0],[-.65,.84,0],[-.62,.75,0]],low);
  // Small paired pelvic membranes remain at the roots of the long supports.
  g.tag=7;
  for(const side of [-1,1])fin(g,[[.035,.93,side*.026],[-.025,.93,side*.025],[-.085,.93,side*.023]],[[.095,.75,side*.107],[.020,.79,side*.087],[-.080,.895,side*.035]],low);
 }
 function pectorals(g,low){
  g.tag=3;return [-1,1].map(side=>{
   const root=point([.27,.971,side*.039]),first=g.v.length/12,roots=[],tips=[];
   // A single continuous fan: the ray group is not split into long detached
   // antennae. The longest sensory rays are much shorter than the stilts.
   for(let i=0;i<13;i++){const u=i/12,a=mix(.18,1.15,u),length=.19+.31*Math.sin(Math.PI*(.13+.75*u)),tip=[root[0]+Math.cos(a)*length,root[1]+Math.sin(a)*length,side*(.043+.055+.07*Math.sin(Math.PI*u))];roots.push([root[0]-.018*u,root[1]-.012*u,root[2]]);tips.push(tip);}
   fin(g,roots,tips,low);
   return Object.freeze({side,root,tag:3,range:Object.freeze({first,count:g.v.length/12-first})});
  });
 }
 function face(g,low){
  for(const side of [-1,1]){
   g.tag=4;ellipsoid(g,[.442,.978,side*.023],[.006,.004,.0025],[.022,.025,.023],low);
   g.tag=5;tube(g,[[.495,.957,side*.003],[.465,.947,side*.014],[.425,.943,side*.023],[.391,.942,side*.028]],.0009,[.023,.026,.023],low);
   const points=Array.from({length:low?7:11},(_,i)=>{const t=i/(low?6:10),a=mix(.40,2.65,t);return [.283+.018*Math.sin(t*Math.PI),.96+Math.cos(a)*.054,side*(Math.sin(a)*.042+.001)];});
   tube(g,points,.00125,[.036,.039,.034],low);
  }
 }
 function build(g,low){body(g,low);const supportRanges=stilts(g,low);ordinaryFins(g,low);const sensory=pectorals(g,low);face(g,low);g.anatomy=Object.freeze({standardLength:Object.freeze({axis:0,length:1,posterior:point([-.5,.96,0]),anterior:point([.5,.958,0])}),supports:Object.freeze(supportRanges),sensoryPectorals:Object.freeze(sensory),supportPlaneY:0});g.tag=1;}
 return {build};
})();
faunaArt.builders.tripod_fish=TripodFishArt.build;
const TRIPOD_FISH_COLLECTION=[];
const TRIPOD_FISH_SPECIES=registerFauna({id:'tripod_fish',name:'三腳魚',latin:'Bathypterois grallator',en:'TRIPOD FISH',tripodFish:true,renderKind:11,zone:5,size:.25,measureAxis:0,modelUnitLength:1,bodyLength:1,color:0x11120f,naturalSize:'本作代表個體標準體長（SL）25 cm；不含伸出的尾鰭與支撐鰭條，非物種最大值',habitat:'自然棲於深海坡地與深淵平原；本作配置於約 2,400 m 的泥底。',hint:'兩支腹鰭與一支下尾鰭撐起身體；向前上方伸出的胸鰭是感覺器官。',detail:'三腳魚以延長的腹鰭和下尾鰭鰭條站在底泥上，朝向水流守候漂過的食物。黑色身體沒有脂鰭，感覺胸鰭與三個接地的支撐鰭分開。本作 25 cm 標準體長、站姿比例、位置及感覺鰭微動節奏為原創配置，並非野外個體的精密量測或完整攝食模擬。',source:'https://fishesofaustralia.net.au/home/species/2779',sourceLabel:'Museums Victoria · Tripod Spiderfish',traits:{motion:'crawl',micro:true,feedable:false,grabbable:false,observeDistance:3.5,contactDistance:.35,targetRadius:.19,viewDistance:.8},motionProfile:{type:'tripod_fish',speed:0,beat:.6,radius:0,bob:0},materialProfile:{skin:'fish',roughness:.43,subsurface:.015,patternScale:110},aquarium:{cost:2}},TRIPOD_FISH_COLLECTION);
TRIPOD_FISH_SPECIES.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#14232a"/><path d="M28 176Q214 170 394 176" fill="none" stroke="#67716b"/><path d="M107 77L80 53 88 86 107 82Q207 98 311 80L321 75 300 66Q201 62 107 77Z" fill="#343932"/><path d="M166 70L187 48 211 65M150 86L164 103 191 88" fill="#303932"/><g stroke="#62675b" stroke-width="2" fill="none"><path d="M187 88L244 174M185 86L200 174M104 82L42 174"/><path d="M265 72L320 36 316 47 304 59 291 66Z"/><path d="M262 75L316 50 310 62 290 70Z"/></g><circle cx="304" cy="72" r="2" fill="#141a16"/><text x="20" y="198" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#9ca99f">TRIPOD FISH · ORIGINAL ART</text></svg>');
