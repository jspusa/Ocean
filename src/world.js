/* Scene is an original, procedural interpretation, NOT a measured reconstruction. */
const SPECIES=[
 // Retain the established caudal clearance after rounding the visual fin.
 {id:'clown',name:'小丑魚',latin:'Amphiprion spp. · 類群示意',en:'ANEMONEFISH',color:0xe78b42,height:.29,width:.14,contactRadius:0.8845636438380226,zone:0,hint:'橘色身體，白色直帶，深色鰭緣。',detail:'本版以橘色海葵魚造型呈現。停在珊瑚花園附近，慢慢觀察牠轉身時的條帶。模型未經物種鑑定，不作種級辨識依據。',size:.43},
 {id:'tang',name:'藍倒吊',latin:'Paracanthurus hepatus · 簡化模型',en:'BLUE TANG',color:0x3b79d7,height:.33,width:.10,zone:0,hint:'藍色側身、深色花紋與黃色尾部。',detail:'本版以鮮明的藍、黑、黃配色提供觀察線索。你可在遊戲的珊瑚平台旁遇見牠；這不是石朗的現場出現紀錄。',size:.53},
 {id:'butterfly',name:'蝴蝶魚',latin:'Chaetodontidae · 類群示意',en:'BUTTERFLYFISH',color:0xe6ce76,height:.40,width:.085,zone:1,hint:'側扁的輪廓、黃色尾側與深色眼帶。',detail:'這是蝴蝶魚類的合成造型，不對應某一特定物種。可練習觀察輪廓和條帶，不能用本模型判斷真實魚種。',size:.47},
 {id:'idol',name:'角鐮魚',latin:'Zanclus cornutus · 簡化模型',en:'MOORISH IDOL',color:0xe5dcaa,height:.39,width:.09,zone:1,hint:'黑白黃配色，以及向後延伸的長背鰭。',detail:'本版刻意保留長背鰭的剪影，方便從不同方向觀看。模型形態、尺寸與游動行為皆有簡化。',size:.56},
 {id:'sergeant',name:'條紋豆娘魚',latin:'Abudefduf spp. · 類群示意',en:'SERGEANT MAJOR',color:0xc5d3b5,height:.27,width:.095,zone:1,hint:'淺色身體上，排列著數道深色直帶。',detail:'先看身形，再看條帶，比只記顏色更有趣。本版是條紋豆娘魚類的視覺示意，不是完整物種分類教材。',size:.42},
 {id:'chromis',name:'青雀鯛',latin:'Chromis spp. · 類群示意',en:'REEF CHROMIS',color:0x73cfbd,height:.19,width:.08,zone:0,hint:'青綠色的小型身影，成群穿梭。',detail:'本版讓小魚在珊瑚上方集體轉向。魚群數量、密度與游動路徑是遊戲設定，不是生態調查數據。',size:.33},
 {id:'parrot',name:'鸚哥魚',latin:'Scaridae · 類群示意',en:'PARROTFISH',color:0x60ae9a,height:.31,width:.16,zone:2,hint:'厚實的身形、青綠色側身與粉色花紋。',detail:'本版使用青綠色的合成鸚哥魚造型。真實物種與不同生命階段可能有不同外觀，本模型不提供種級判定。',size:.85},
 {id:'wrasse',name:'隆頭魚',latin:'Labridae · 類群示意',en:'REEF WRASSE',color:0x78b68e,height:.20,width:.10,zone:2,hint:'修長輪廓，身體帶有彩色橫向紋路。',detail:'這是隆頭魚類的合成視覺造型。沿著遊戲中的礁緣游動，可以留意這種細長輪廓。',size:.68},
 {id:'turtle',contactRadius:1.719214937115194,name:'綠蠵龜',latin:'Chelonia mydas · 簡化模型',en:'GREEN SEA TURTLE',color:0x88946c,zone:0,hint:'褐綠色龜殼，四肢像槳一樣划動。',detail:'綠蠵龜資料可參考 NOAA Fisheries。本版的龜殼、體型與游動已簡化；牠在遊戲中的路線不代表現地海龜位置。觀察時不追逐、不碰觸。',size:1,source:'https://www.fisheries.noaa.gov/species/green-turtle'},
 {id:'ray',name:'鷹魟',latin:'Aetobatus spp. · 類群示意',en:'EAGLE RAY',color:0x718b85,zone:2,hint:'展開的菱形胸鰭，細長的尾巴。',detail:'本版以斑點鷹魟類群的輪廓表現安靜滑翔。出現在藍色斷崖是遊戲編排，不表示石朗有固定觀察點或保證能遇見。',size:1},
 {id:'whale',name:'大翅鯨',latin:'Megaptera novaeangliae · 景觀模型',en:'HUMPBACK WHALE',color:0x536978,zone:3,height:.4,width:.18,hint:'長胸鰭、寬尾鰭與喉腹部的縱向褶溝。',detail:'為營造大洋尺度而加入的原創大翅鯨景觀模型。這是幻想深水延伸場景，不是石朗鯨類目擊、活動水深或出現季節的資料。',size:1.25}
];
const LANDMARKS=[
 {id:'garden',name:'珊瑚花園',en:'CORAL GARDEN',x:-10,z:-5,spawn:[.3,-10.3,6.8],yaw:-.16,pitch:-.025,text:'光落在珊瑚上，小魚正穿過枝椏。',note:'原創礁體與魚群配置；未經現地測繪。'},
 {id:'mailbox',name:'海底郵筒',en:'UNDERWATER POST',x:12,z:-17,spawn:[15,-9,-8],yaw:-.35,pitch:-.2,text:'寄給海的一封信，留在這片藍裡。',note:'以石朗地標為靈感；造型、尺度與位置均為示意。'},
 {id:'dropoff',name:'藍色斷崖',en:'THE BLUE EDGE',x:0,z:-37,spawn:[3,-18,-31],yaw:-.12,pitch:-.09,text:'世界慢慢變藍，只剩呼吸與遠方。',note:'原創地形，不是現場斷崖、導航或下潛路線。'},
 {id:'silence',name:'微光深谷',en:'THE QUIET BELOW',x:-3,z:-77,spawn:[0,-43,-68],yaw:-.10,pitch:.03,text:'當光線走遠，海還在呼吸。',note:'幻想深水延伸場景；水深不是潛水建議。'}
];
// Deterministic analytic terrain and original high-density reef assets. Not a survey.
function terrainNoise(x,z){return Math.sin(x*.38+Math.sin(z*.22))*Math.cos(z*.28+x*.13);}
function groundHeight(x,z){
 const edge=-20+4.0*Math.sin(x*.071)+2.2*Math.sin(x*.18);
 let q=clamp((edge-z)/42,0,1),drop=q*q*(3-2*q);
 let shelf=3.0*Math.exp(-((x+11)**2/42+(z+5)**2/400))+2.7*Math.exp(-((x-12)**2/34+(z+9)**2/380));
 let geology=.40*terrainNoise(x*.6,z*.8)+.18*terrainNoise(x*1.4,z*1.6);
 let dune=.23*Math.sin(z*.42+x*.08)*Math.exp(-x*x/95)*(1-drop);
 return -14-49*drop+shelf+geology+dune;
}
const obstacles=[],life=[],decorLife=[];let allLife=[];let diverBatch;
function makeGround(){let g=new Geometry();g.material=1;g.shadow=true;let N=168,span=250;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const p=(u,v)=>{let x=(u/N-.5)*span,z=(v/N-.5)*span-42;return [x,groundHeight(x,z),z];};let ps=[p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1)],ns=ps.map(p=>V.norm([groundHeight(p[0]-.1,p[2])-groundHeight(p[0]+.1,p[2]),.2,groundHeight(p[0],p[2]-.1)-groundHeight(p[0],p[2]+.1)]));let col=ps.map(p=>{let dark=.91+.06*terrainNoise(p[0]*.4,p[2]*.4);return [dark,dark*.99,dark*.98];});g.tri(ps[0],ps[2],ps[1],col[0],[ns[0],ns[2],ns[1]],[col[0],col[2],col[1]]);g.tri(ps[0],ps[3],ps[2],col[0],[ns[0],ns[3],ns[2]],[col[0],col[3],col[2]]);}return g;}
// Surface meshes have per-vertex normals, not flat painted primitives.
function surface(g,fn,nu,nv,col,orientation=1){let pts=[];for(let j=0;j<=nv;j++){let row=[];for(let i=0;i<=nu;i++){let u=i/nu,v=j/nv,p=fn(u,v),du=V.sub(fn(Math.min(1,u+.0001),clamp(v,.0001,.9999)),fn(Math.max(0,u-.0001),clamp(v,.0001,.9999))),dv=V.sub(fn(clamp(u,.0001,.9999),Math.min(1,v+.0001)),fn(clamp(u,.0001,.9999),Math.max(0,v-.0001))),n=V.mul(V.norm(V.cross(du,dv)),orientation);row.push({p,n,c:typeof col==='function'?col(p,u,v):col});}pts.push(row);}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){let a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i+1],d=pts[j+1][i];let order=orientation===1?[[a,b,c],[a,c,d]]:[[a,c,b],[a,d,c]];for(let tri of order)g.tri(...tri.map(p=>p.p),tri[0].c,tri.map(p=>p.n),tri.map(p=>p.c));}}
function rockGeometry(variant=0,low=false){let g=new Geometry();g.material=2;const form=(u,v)=>{let a=u*TAU,b=v*Math.PI,s=Math.sin(b),nx=s*Math.cos(a),ny=Math.cos(b),nz=s*Math.sin(a);let f=1+.12*Math.sin(nx*4.3+nz*3.6+variant)+.09*Math.cos(ny*7.5-nz*3.1+variant*2)+.072*Math.sin(nx*13+nz*8+ny*8)+.045*Math.sin(ny*21+nz*3);return [nx*f,ny*f*(.97+.03*Math.sin(a*7))+Math.sin(a*3+variant)*s*.08,nz*f];};surface(g,form,low?12:36,low?10:24,[.83,.78,.65],-1);return g;}
function branchCoral(type=0){let g=new Geometry();g.material=3;let palette=[[.76,.71,.43],[.45,.35,.57],[.60,.60,.43],[.83,.70,.56]],base=palette[type%4];
 function branch(p,d,len,r,depth){let end=V.add(p,V.mul(d,len));let col=base.map(v=>v*(.74+depth*.047));g.tube(p,end,r,r*.61,col,7);if(depth===0){g.sphere(end,[r*.7,r*.85,r*.7],type===1?[.71,.65,.81]:[.85,.83,.68],7,5);return;}
  let count=depth>=3?3:2;for(let k=0;k<count;k++){let a=k/count*TAU+rr(-.6,.6)+p[1]*4.3,sp=depth===3?.58:.40;let nd=V.norm([d[0]*.57+Math.cos(a)*sp,rr(.64,1.05),d[2]*.57+Math.sin(a)*sp]);branch(end,nd,len*rr(.59,.79),r*.62,depth-1);}}
 for(let k=0;k<11;k++){let a=k/11*TAU;branch([Math.cos(a)*.08,0,Math.sin(a)*.08],V.norm([Math.cos(a)*.66,rr(.75,1.2),Math.sin(a)*.66]),rr(.30,.55),rr(.045,.064),3);}return g;}
function tableCoral(type=0){let g=new Geometry();g.material=3;let col=type?[.54,.48,.62]:[.75,.67,.46];g.tube([0,0,0],[0,.62,0],.10,.05,col,9);
 let layers=type?3:2;for(let k=0;k<layers;k++){let radius=1.05-k*.23,h=.38+k*.33,cx=k%2?-.24:.06,cz=k*.13;
  surface(g,(u,v)=>{let a=u*TAU,r=v*radius*(1+.10*Math.sin(a*3+k)+.04*Math.sin(a*11));let y=h+.05*Math.sin(a*8+k)*v+.08*Math.pow(v,4)+Math.sin(v*18+a*3)*.015;return [cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];},72,10,(p,u,v)=>col.map((c,i)=>mix(c*(.57+.26*v),i===0?.88:i===1?.82:.71,Math.pow(v,14)*.78)),-1);
  for(let i=0;i<12;i++){let a=i/12*TAU,rad=rr(.28,.8)*radius,x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad;g.tube([x,h-.015,z],[x,h+rr(.006,.014),z],.006,.004,col.map(v=>v*1.08),6);}}
 return g;}
function fanCoral(){let g=new Geometry();g.material=7;let base=[.79,.38,.20];
 function limb(p,a,len,r,depth){let end=[p[0]+Math.sin(a)*len,p[1]+Math.cos(a)*len,p[2]+Math.sin(a*3+p[1]*2)*.014];g.tube(p,end,r,r*.61,base,5);if(depth){limb(end,a+rr(.12,.36),len*.75,r*.65,depth-1);limb(end,a-rr(.12,.36),len*.76,r*.64,depth-1);}}
 for(let k=0;k<9;k++)limb([0,0,0],(k/8-.5)*2.5,.40,.034,5);return g;}
function brainCoral(){let g=new Geometry();g.material=4;g.sphere([0,.24,0],[.76,.65,.65],[.72,.64,.41],54,36,.18);return g;}
function spongeGeometry(){let g=new Geometry();g.material=8;let col=[.42,.30,.46];for(let k=0;k<5;k++){let a=k/5*TAU,cx=Math.cos(a)*.26,cz=Math.sin(a)*.26,h=rr(.60,1.25),r=rr(.13,.22);
 surface(g,(u,v)=>{let a=u*TAU,r1=r*(.78+.22*v)*(1+.08*Math.sin(a*9+v*11)),y=v*h;return [cx+Math.cos(a)*r1+.12*v*v,y,cz+Math.sin(a)*r1];},28,12,(p,u,v)=>col.map((c,i)=>c*(.73+v*.40)),1);
 surface(g,(u,v)=>{let a=u*TAU,rad=r*(.74+.26*v),y=h-.22+.22*v;return [cx+Math.cos(a)*rad*.75+.12,y,cz+Math.sin(a)*rad*.75];},28,8,col.map(v=>v*.38),-1);
 for(let j=0;j<28;j++){let a=j/28*TAU,b=(j+1)/28*TAU,p=(t,s)=>[cx+Math.cos(t)*r*s+.12,h,cz+Math.sin(t)*r*s];g.quad(p(a,.75),p(b,.75),p(b,1),p(a,1),col.map(v=>v*1.18));}}
 return g;}
function grass(){let g=new Geometry();g.material=9;g.shadow=false;for(let k=0;k<15;k++){let a=k/15*TAU,h=rr(.22,.65),c=[Math.cos(a)*.17,0,Math.sin(a)*.17];surface(g,(u,v)=>[c[0]+Math.cos(a)*v*v*.30+(u-.5)*.020*(1-v),h*v,c[2]+Math.sin(a)*v*v*.3],1,5,[.26,.41,.31],1);}return g;}
function anemoneGeometry(baseHeight=null){let g=new Geometry();g.material=3;for(let k=0;k<180;k++){let a=k*2.39996,r=Math.sqrt(k/180)*.75,lift=baseHeight?baseHeight(Math.cos(a)*r,Math.sin(a)*r):0,base=[Math.cos(a)*r,.015+lift,Math.sin(a)*r],h=rr(.23,.47)*(1-.3*r),prev=base;for(let j=1;j<=8;j++){let p=[base[0]+Math.sin(a+j*.25)*j*.012,lift+h*j/8,base[2]+Math.cos(a+j*.38)*j*.009],rad=.016*(1-j*.025);g.tube(prev,p,rad+.0004,rad,[.66,.53,.57],10);prev=p;}g.sphere(prev,[.017,.025,.017],[.75,.64,.66],12,8);}return g;}
const reefPatches=[];
function buildReef(r){r.batch(makeGround(),[{p:[0,0,0]}]);let rocks=[[],[],[]],groups=[[],[],[],[],[],[],[],[],[]],grasses=[],rubble=[];
 // Designed, uneven reef corridors: a continuous reef instead of objects scattered on a plane.
 let clusters=[[-8,6,2.0],[-10,-1,2.3],[-8,-9,2.4],[-12,-17,2.2],[8,3,2.25],[11,-6,2.35],[9,-16,2.2],[18,-21,2.6],[-19,-27,2.0],[18,8,2.0],[-18,11,1.7],[23,-9,2.3],[-24,-12,2.1],[12,-31,2.5],[-11,-32,2.0]];
 for(let [cx,cz,size] of clusters){for(let k=0;k<9;k++){let a=k*2.39996,spread=k===0?0:Math.sqrt(k)*1.20,x=cx+Math.cos(a)*spread,z=cz+Math.sin(a)*spread,y=groundHeight(x,z),sx=size*rr(.52,1.08),sy=sx*rr(.40,.77),sz=sx*rr(.75,1.28);let item={p:[x,y+.07,z],s:[sx,sy,sz],yaw:rr(0,TAU),tint:[rr(.86,1.05),rr(.90,1.04),rr(.88,1.02)],phase:rr(0,TAU)};rocks[k%3].push(item);obstacles.push({p:item.p.slice(),s:[sx*.87,sy*.93,sz*.89]});reefPatches.push({x,z,y:y+sy*.86,rx:sx*.73,rz:sz*.73});
 // dense colonies on reef tops, with space for sand corridors.
 let count=k===0?7:4;for(let j=0;j<count;j++){let a=j/count*TAU+rr(-.5,.5),dist=j===0?0:rr(.24,.73),px=x+Math.cos(a)*sx*dist,pz=z+Math.sin(a)*sz*dist,py=y+sy*Math.sqrt(1-dist*dist)*.92;let type=Math.floor(rr(0,9));let sc=rr(.56,1.06);if(type===5)sc*=1.14;if(type===6)sc*=.77;
 groups[type].push({p:[px,py,pz],s:[sc,sc*rr(.8,1.2),sc],yaw:rr(0,TAU),phase:rr(0,TAU),tint:[rr(.84,1.1),rr(.85,1.05),rr(.9,1.12)]});}
 }}
 // Smaller fragments knit the colonies and sand together.
 for(let i=0;i<520;i++){let cluster=clusters[i%clusters.length],a=rr(0,TAU),rad=rr(2,7.5),x=cluster[0]+Math.cos(a)*rad,z=cluster[1]+Math.sin(a)*rad;let s=rr(.06,.29);rubble.push({p:[x,groundHeight(x,z)+.03,z],s:[s,s*rr(.4,1),s*rr(.7,1.5)],yaw:rr(0,TAU),tint:[.83,.91,.87]});}
 for(let k=0;k<3;k++)r.batch(rockGeometry(k),rocks[k]);let debris=rockGeometry(2,true);debris.shadow=false;r.batch(debris,rubble);
 r.batch(branchCoral(0),groups[0]);r.batch(branchCoral(1),groups[1]);r.batch(branchCoral(2),groups[2]);r.batch(tableCoral(),groups[3]);r.batch(tableCoral(1),groups[4]);r.batch(brainCoral(),groups[5]);r.batch(fanCoral(),groups[6],3);r.batch(spongeGeometry(),groups[7]);r.batch(branchCoral(3),groups[8]);
 for(let i=0;i<150;i++){let x=rr(-28,28),z=rr(-30,22);grasses.push({p:[x,groundHeight(x,z)+.025,z],s:[rr(.5,1.3),rr(.5,1.3),rr(.5,1.3)],yaw:rr(0,TAU),phase:rr(0,TAU)});}r.batch(grass(),grasses,3);
 // Hand-placed hero reef details close to the initial camera.
 r.batch(brainCoral(),[{p:[-4.3,groundHeight(-4.3,7)+.18,7],s:[1.55,1.25,1.4]},{p:[4.6,groundHeight(4.6,4)+.22,4],s:[1.35,1,1.4]}]);
 r.batch(anemoneGeometry(),[{p:[-5.6,-9.55,1.0],s:[1.0,1,1],phase:1}],3);
 // A real change of scale: eroded buttresses fall from the bright reef into a blue canyon.
 const walls=[
 {p:[-14,-27,-37],s:[7.3,15.2,10.1],yaw:.3,tint:[.85,.91,.98]},
 {p:[-20,-39,-51],s:[8.6,19,11],yaw:-.15,tint:[.83,.86,.89]},
 {p:[-26,-45,-69],s:[10.2,24,13],yaw:.5,tint:[.76,.85,.98]},
 {p:[20,-39,-52],s:[8,19.7,11],yaw:.8,tint:[.88,.90,.99]},
 {p:[30,-49,-76],s:[12,21.6,15],yaw:-.9,tint:[.78,.86,.94]},
 {p:[-21,-60,-108],s:[12,21,14],yaw:.4,tint:[.78,.88,.98]},
 {p:[16,-64,-116],s:[13,25,16],yaw:-.3,tint:[.8,.89,.95]},
 {p:[-40,-55,-85],s:[11,25,19],yaw:.5,tint:[.8,.8,.9]}];
 r.batch(rockGeometry(1),walls);for(let ob of walls)obstacles.push({p:ob.p.slice(),s:ob.s.map(v=>v*.84)});
 const ledges=[],gorgonians=[],plates=[],knuckles=[];
 for(const wall of walls.slice(0,5)){
  for(let j=0;j<5;j++){let yy=wall.p[1]+wall.s[1]*(.82-j*.29);let x=wall.p[0]+(wall.p[0]<0?1:-1)*wall.s[0]*.70,z=wall.p[2]+(j%2)*1.9;
  let sy=.6+random()*.3;ledges.push({p:[x,yy,z],s:[2.5,sy,3.4],yaw:wall.yaw+j*.5,tint:[.72,.77,.82]});
  if(yy>-35){for(let k=0;k<3;k++){let pp=[x+(k-1)*1.2,yy+sy*.8,z+(k%2)*.8];plates.push({p:pp,s:[.76, .82, .94],yaw:rr(0,TAU),tint:[.84,.87,.96]});
   if(k===0)gorgonians.push({p:[pp[0]+1,pp[1],pp[2]+.5],s:[1.0,1.4,1],yaw:rr(0,TAU),phase:rr(0,TAU),tint:[1.06,.91,.87]});}}
 }
 }
 r.batch(rockGeometry(2),ledges);r.batch(tableCoral(),plates);r.batch(fanCoral(),gorgonians,3);
 const hero=[{p:[-6.9,-21.8,-28.8],s:[3.1,4.6,5.0],yaw:.1},{p:[9.7,-28.1,-38.0],s:[3.9,5.8,4.0],yaw:-.5}];
 r.batch(rockGeometry(0),hero);for(const ob of hero)obstacles.push({p:ob.p.slice(),s:ob.s.map(v=>v*.84)});
 const gardenTop=[{p:[-6.1,-17.5,-27],s:[1.6,1.0,1.5],yaw:.8,tint:[.8,.86,1.]},{p:[-7.5,-17.7,-26],s:[1.0,1.2,1.1],tint:[.85,.96,1.]},{p:[9.1,-22.7,-36.3],s:[1.1,1,1.2],tint:[.83,.89,.94]}];
 r.batch(tableCoral(),gardenTop);r.batch(branchCoral(2),[{p:[-5.3,-18.6,-28],s:[1.1,1.2,1.1]}]);
 r.batch(fanCoral(),[{p:[-7.4,-17.4,-26.7],s:[1.05,1.25,1.0],yaw:1.0,phase:2.0},{p:[10.0,-22.7,-37],s:[1,1.5,1],yaw:.7,phase:1}],3);
 const post=new Geometry();post.material=0;let cream=rgb(0xc5d5b7),green=rgb(0x326d69),black=rgb(0x1c4043);post.tube([0,0,0],[0,.17,0],.88,.86,rgb(0x8a9c89),40);post.tube([0,.17,0],[0,.6,0],.14,.14,green,20);post.tube([0,.55,0],[0,1.65,0],.4,.4,cream,44);post.tube([0,1.64,0],[0,1.8,0],.46,.42,green,40);post.sphere([0,1.83,0],[.41,.13,.41],green,32,12);post.box([0,1.4,.394],[.36,.07,.035],black);post.box([0,.84,.401],[.31,.20,.025],green);post.tube([0,1.91,0],[0,2.22,0],.07,.05,rgb(0xcdb87b),12);post.sphere([0,2.29,0],[.12,.19,.08],rgb(0xcdb87b),16,12);post.tube([.02,2.38,0],[.17,2.39,0],.057,.035,rgb(0xcdb87b),12);r.batch(post,[{p:[12,groundHeight(12,-17),-17],yaw:.22}]);obstacles.push({p:[12,groundHeight(12,-17)+1,-17],s:[.6,1.2,.6]});
}
function fishColor(s,x,y,z){let c=rgb(s.color);if(s.id==='clown'){let band=Math.min(Math.abs(x-.27+y*.10),Math.abs(x+.08-y*.05),Math.abs(x+.40));if(band<.063)c=[.94,.92,.86];else if(band<.084)c=[.08,.085,.10];}
 if(s.id==='tang'){let pattern=((x+.06)**2/.15+(y-.10)**2/.05);if((pattern<1&&y>.025)||(x>-.33&&x<.28&&Math.abs(y+.025)<.04))c=[.025,.04,.08];}
 if(s.id==='butterfly'){if(x>.18&&x<.275)c=[.09,.10,.12];else if(x>-.29)c=[.91,.88,.63];}
 if(s.id==='idol'){if((x>.13&&x<.29)||(x<-.16&&x>-.34))c=[.08,.09,.10];else if(x<-.35)c=[.91,.77,.22];else c=[.95,.92,.79];}
 if(s.id==='sergeant'){if(Math.abs(Math.sin((x+.56)*16.5))<.5)c=[.10,.14,.17];else if(y>.1)c=[.88,.82,.39];}
 if(s.id==='parrot'){if(x>.27&&y<.06)c=[.61,.36,.42];c=c.map(v=>v*(.95+.05*Math.sin(x*30+Math.floor(y*23)*1.4)));}
 if(s.id==='wrasse'&&Math.abs(Math.sin(y*38+x*4))<.32)c=[.75,.40,.46];
 let counter=clamp(y/(s.height||.2)*.15+.90,.67,1.04);return c.map(v=>v*counter);}
function fishGeometry(s,lod=false){if(lod)return distantFishGeometry(s);let g=new Geometry();g.material=6;g.shadow=!lod && ['parrot','tang','sergeant'].includes(s.id);g.species=SPECIES.findIndex(x=>x.id===s.id);g.tag=1;let H=s.height,W=s.width;
 const form=(u,v)=>{let a=u*TAU,t=clamp(v,0,1),x=.57-t*1.10,shape=Math.pow(Math.max(.00001,Math.sin(t*Math.PI)),.64)*(1.08-.20*t)*(1-.27*Math.exp(-Math.pow((t-.91)/.10,2)));return [x,Math.cos(a)*shape*H,Math.sin(a)*shape*W];};surface(g,form,lod?10:24,lod?18:38,(p)=>fishColor(s,...p),1);
 // Beaked/rounded muzzle, thin operculum seam, inset wet eyes.
 g.tag=2;g.sphere([.531,-.031,0],[.036,.028,.036],fishColor(s,.5,-.01,0),18,12);g.sphere([.554,-.018,0],[.015,.009,.032],fishColor(s,.52,-.01,0).map(c=>c*.72),18,10);g.sphere([.554,-.036,0],[.016,.008,.030],fishColor(s,.52,-.01,0).map(c=>c*.84),18,10);
 for(let side of [-1,1]){g.tag=4;g.sphere([.38,.067,side*W*.71],[.023,.024,.010],[.69,.64,.34],lod?7:14,lod?5:10);g.sphere([.386,.070,side*(W*.71+.010)],[.016,.017,.008],[.014,.019,.026],lod?7:14,lod?5:10);g.sphere([.394,.078,side*(W*.71+.017)],[.003,.0035,.003],[.97,.98,.92],lod?5:9,lod?4:7);g.tag=3;
 let fins=s.id==='clown'?[.55,.23,.065]:rgb(s.color).map(v=>v*.85);surface(g,(u,v)=>[.08-u*.25-v*.11,-.05-v*.11,side*(W*(1-u*.3)+Math.sin(v*Math.PI*.7)*.12)],8,10,fins,side===1?1:-1);
 let prev=null;for(let i=0;i<(lod?0:14);i++){let a=(-.65+i/13*1.3);let p=[.27-.042*Math.cos(a*1.8),a*H*.72,side*W*.94*Math.sqrt(Math.max(.1,1-a*a))];if(prev)g.tube(prev,p,.003,.003,[.12,.16,.17],4);prev=p;}}
 g.tag=3;let tail=s.id==='tang'||s.id==='idol'?[.96,.78,.15]:rgb(s.color).map(v=>v*.83);
 surface(g,(u,v)=>{let y=(u-.5)*H*1.70*(.35+.65*v),notch=(1-Math.abs(u-.5)*2)*.095;return [-.49-v*(.37-notch),y,Math.sin(u*Math.PI)*.009];},lod?8:18,lod?3:8,(p,u,v)=>{let edge=Math.min(u,1-u,1-v);return s.id==='clown'&&edge<.09?[.09,.09,.11]:tail;},1);
 for(let sign of [-1,1])surface(g,(u,v)=>{let x=.28-u*.70,t=(.57-x)/1.10,by=Math.pow(Math.sin(t*Math.PI),.82)*H;let lift=Math.sin(u*Math.PI)*H*(sign===1?.28:.19);return [x,sign*(by+v*lift),Math.sin(u*Math.PI)*.005];},lod?10:26,lod?2:5,(p,u,v)=>s.id==='clown'&&v>.82?[.10,.10,.12]:fishColor(s,p[0],p[1],0),sign===1?1:-1);
 if(s.id==='idol'){let pts=[[.14,.34,0],[.09,.55,0],[-.08,.78,0],[-.35,.84,0],[-.62,.82,0],[-.83,.88,0]];for(let i=0;i<pts.length-1;i++)g.tube(pts[i],pts[i+1],.018-i*.0027,.014-i*.0025,[.95,.93,.79],7);}
 return g;}
function turtleGeometry(low=false){let g=new Geometry();g.material=5;g.tag=1;
 // Full-body atlas: image top is UV v=0 with UNPACK_FLIP_Y_WEBGL=false.
 // Rects and insets are pixels in the fixed 1024-square atlas contract.
 const atlasRects={carapace:[0,0,512,588,16],plastron:[512,0,512,588,16],head:[0,588,512,436,16],front:[512,588,512,171,16],rear:[512,759,512,126,16],tail:[512,885,512,139,16]};
 const atlasUV=(chart,u,v)=>{const [x,y,w,h,inset]=atlasRects[chart];return [(x+inset+u*(w-2*inset))/1024,(y+inset+v*(h-2*inset))/1024];};
 // Same samples, triangles and initial normals as marineSurface; only the local
 // emitter carries chart parameters. Other animals keep the shared builder.
 const atlasSurface=(point,nu,nv,color,chart)=>{
  const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.00001),v),point(Math.max(0,u-.00001),v)),dv=V.sub(point(u,v+.00001),point(u,v-.00001)),radial=V.sub(p,point(u,v+.5));let n=V.cross(dv,du);if(V.len(n)<1e-12)n=V.mul(du,u<.5?-1:1);else if(V.dot(n,radial)<0)n=V.mul(n,-1);return {p,n:V.norm(n),c:typeof color==='function'?color(p):color,u,v};};
  const rows=Array.from({length:nu+1},(_,i)=>Array.from({length:nv+1},(_,j)=>sample(i/nu,j/nv)));
  const tri=(a,b,c)=>{const face=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(face)<1e-12)return;if(V.dot(face,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];
   const vertices=[a,b,c],lo=Math.min(a.v,b.v,c.v),hi=Math.max(a.v,b.v,c.v);
   // Existing even angular grids contain the ventral v=.5 seam exactly. Emit
   // its two sides as chart V=1 / V=0; do not interpolate across the atlas.
   if(chart==='head'&&lo<.5&&hi>.5)throw Error('Head angular grid must contain the ventral atlas seam');
   for(const q of vertices){const u=chart==='head'?(q.p[0]-.58)/.73:q.u,v=chart==='head'?(hi<=.5?q.v+.5:q.v-.5):q.v;g.vertex(q.p,q.n,q.c,atlasUV(chart,u,v));}
  };
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=rows[i][j],b=rows[i+1][j],c=rows[i+1][j+1],d=rows[i][j+1];tri(a,b,c);tri(a,c,d);}
 };
 const ellipsoid=(center,scale,color,segments,rings)=>{
  const start=g.v.length;marineSurface(g,(u,v)=>{const a=u*Math.PI,b=v*TAU;return [center[0]+Math.cos(a)*scale[0],center[1]+Math.sin(a)*Math.cos(b)*scale[1],center[2]+Math.sin(a)*Math.sin(b)*scale[2]];},rings,segments,color);
  for(let k=start;k<g.v.length;k+=12){const n=V.norm(scale.map((s,i)=>(g.v[k+i]-center[i])/(s*s)));for(let i=0;i<3;i++)g.v[k+3+i]=n[i];}
 };
 const skinSurface=(point,nu,nv,color,closeRoot=false,chart)=>{
  const start=g.v.length,normals=new Map(),key=p=>p.map(v=>Math.round(v*1e10)).join(',');atlasSurface(point,nu,nv,color,chart);
  const cap=end=>{const tip=point(end,0),ring=Array.from({length:nv},(_,j)=>point(end?1-1/nu:1/nu,j/nv)),center=ring.reduce((sum,p)=>V.add(sum,V.mul(p,1/nv)),[0,0,0]);return V.norm(V.sub(tip,center));};
  const tipNormal=cap(1),rootNormal=closeRoot?cap(0):null;
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){
   const u=i/nu,v=j/nv,p=point(u,v);let n;
   if(i===nu)n=tipNormal;else if(i===0&&closeRoot)n=rootNormal;
   else{const du=V.norm(V.sub(point(Math.min(1,u+.00001),v),point(Math.max(0,u-.00001),v))),dv=V.norm(V.sub(point(u,v+.00001),point(u,v-.00001)));n=V.norm(V.cross(dv,du));if(V.dot(n,V.sub(p,point(u,v+.5)))<0)n=V.mul(n,-1);}
   normals.set(key(p),n);
  }
  // Normalize derivatives before crossing: the tiny buried neck ring must not
  // fall into a tangent fallback. A swept foil's discrete cap points along its
  // last-ring-to-tip axis, which is not generally a world coordinate axis.
  for(let k=start;k<g.v.length;k+=12){const n=normals.get(key(g.v.slice(k,k+3)));for(let j=0;j<3;j++)g.v[k+3+j]=n[j];}
 };
 // Dorsal and ventral shell skins share one rim. A full carapace ellipsoid
 // would hide the pale plastron underneath it and leave two stacked shells.
 // QA v01850 original shape option. Controls are artistic, not measured.
 // Shape-preserving cubic Hermite interpolation keeps positive section widths
 // and thicknesses within the authored rows; geometry sample counts stay fixed.
 const shapeProfile=rows=>{
  const slopes=rows.map((r,i)=>r.map((_,k)=>{
   if(k===0)return 0;
   if(i===0)return (rows[1][k]-r[k])/(rows[1][0]-r[0]);
   if(i===rows.length-1)return (r[k]-rows[i-1][k])/(r[0]-rows[i-1][0]);
   const h0=r[0]-rows[i-1][0],h1=rows[i+1][0]-r[0],d0=(r[k]-rows[i-1][k])/h0,d1=(rows[i+1][k]-r[k])/h1;
   if(d0*d1<=0)return 0;const w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d0+w1/d1);
  }));
  return {rows,slopes,at(t){t=clamp(t,rows[0][0],rows.at(-1)[0]);let i=0;while(i<rows.length-2&&t>rows[i+1][0])i++;
   const a=rows[i],b=rows[i+1],h=b[0]-a[0],f=(t-a[0])/h,f2=f*f,f3=f2*f;
   return a.map((v,k)=>k===0?t:(2*f3-3*f2+1)*v+(f3-2*f2+f)*h*slopes[i][k]+(-2*f3+3*f2)*b[k]+(f3-f2)*h*slopes[i+1][k]);
  }};
 };
 const rimProfile=shapeProfile([[0,.82,0],[15,.79,.22],[30,.68,.405],[45,.49,.565],[60,.25,.66],[90,-.20,.70],[120,-.65,.60],[135,-.89,.45],[150,-1.05,.285],[165,-1.14,.13],[180,-1.17,0]]);
 // Reflection gives an even X and odd Z continuation at the anterior/posterior
 // endpoints; zero endpoint X slopes preserve their smooth lateral tangent.
 rimProfile.slopes[0][1]=0;rimProfile.slopes.at(-1)[1]=0;
 const rim=a=>{const t=((a%TAU)+TAU)%TAU,side=t<=Math.PI?1:-1,p=rimProfile.at((t<=Math.PI?t:TAU-t)*180/Math.PI);return [p[1],p[2]*side];};
 const bodyHalf=under=>{
  const segments=low?32:80,rings=under?(low?3:12):(low?5:24),color=under?[.72,.70,.53]:[.55,.52,.32];
  const point=(a,b)=>{const s=Math.sin(b),r=rim(a);return [-.20+(r[0]+.20)*s,-.075+.012*Math.cos(a)*s*s+(under?-.15:.35)*Math.cos(b),r[1]*s];};
  const sample=(i,j)=>{const a=(i%segments)/segments*TAU,b=j/rings*Math.PI*.5,p=point(a,b);let n;
   if(j===0)n=[0,under?-1:1,0];else{const da=V.sub(point(a+.00001,b),point(a-.00001,b)),db=V.sub(point(a,b+.00001),point(a,b-.00001));n=V.mul(V.norm(V.cross(da,db)),under?-1:1);}if(j===rings)p[1]=-.075+.012*Math.cos(a);return {p,n};};
  const rows=Array.from({length:rings+1},(_,j)=>Array.from({length:segments},(_,i)=>sample(i,j)));
  const tri=(a,b,c)=>{if(V.dot(V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p)),V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,color,[a.n,b.n,c.n]);};
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=rows[j][i],b=rows[j][(i+1)%segments],c=rows[j+1][(i+1)%segments],d=rows[j+1][i];if(j)tri(a,b,c);tri(a,c,d);}
 };
 const shellStart=g.v.length;bodyHalf(false);g.tag=3;bodyHalf(true);
 // The two shell skins use their common actual x/z bounds. +X points up in
 // the image; +Z points right. No change to the shell positions or normals.
 const shellBounds=[Infinity,-Infinity,Infinity,-Infinity];
 for(let k=shellStart;k<g.v.length;k+=12){shellBounds[0]=Math.min(shellBounds[0],g.v[k]);shellBounds[1]=Math.max(shellBounds[1],g.v[k]);shellBounds[2]=Math.min(shellBounds[2],g.v[k+2]);shellBounds[3]=Math.max(shellBounds[3],g.v[k+2]);}
 for(let k=shellStart;k<g.v.length;k+=12){const uv=atlasUV(g.v[k+11]===1?'carapace':'plastron',(g.v[k+2]-shellBounds[2])/(shellBounds[3]-shellBounds[2]),(shellBounds[1]-g.v[k])/(shellBounds[1]-shellBounds[0]));g.v[k+9]=uv[0];g.v[k+10]=uv[1];}
 // A single soft neck-to-head loft seats inside the shell; the crown grows
 // continuously from the neck instead of intersecting a cylindrical collar.
 g.tag=2;const headRows=[[.58,-.04,0,0],[.64,-.04,.12,.12],[.79,-.03,.105,.108],[.95,-.018,.126,.139],[1.08,-.015,.14,.155],[1.20,-.025,.115,.138],[1.275,-.04,.066,.105],[1.300,-.041,.030,.075],[1.31,-.04,0,0]];
 const headPoint=(u,v)=>{
  const x=.58+.73*(1-Math.cos(u*Math.PI))*.5,p=marineProfile(headRows,x),a=v*TAU;
  if(x<=.95)return [x,p[1]+Math.cos(a)*p[2],Math.sin(a)*p[3]];
  const front=smooth01((x-1.08)/.23),taper=smooth01((1.31-x)/.04),mouth=smooth01((x-1.165)/.05)*(1-smooth01((x-1.295)/.015));
  const mouthY=-.05+.012*front,mouthAngle=Math.acos(clamp((mouthY-p[1])/Math.max(.00001,p[2]),-.98,.98)),angle=a+mouth*(mouthAngle-Math.PI*.5)*Math.sin(a),c=Math.cos(angle),s=Math.sin(angle);
  const groove=.008*mouth*Math.pow(Math.abs(Math.sin(a)),64),radial=Math.hypot(c*p[2],s*p[3]),shrink=1-groove/Math.max(.01,radial),orbit=.024*Math.exp(-(((x-1.14)/.065)**2+((c-.4)/.6)**2))*smooth01((x-.95)/.10)*(1-smooth01((x-1.21)/.07));
  // One softly flattened snout grows out of the skull. The lower jaw shares
  // its skin and the oral crease is an inward displacement of that surface.
  return [x,p[1]+c*p[2]*shrink+front*taper*(.018*Math.max(0,-c)**2-.026*Math.max(0,c)**2),s*(p[3]*shrink+orbit)];
 };
 skinSurface(headPoint,low?12:44,low?8:24,[.62,.63,.43],true,'head');
 const frontProfile=shapeProfile([[0,.49,.39,-.060,.075,.085,.055],[.12,.63,.33,-.065,.120,.150,.046],[.30,.86,.20,-.075,.160,.200,.028],[.50,1.13,.06,-.085,.130,.170,.018],[.72,1.39,-.12,-.095,.085,.120,.010],[.90,1.59,-.31,-.100,.035,.060,.004],[1,1.67,-.39,-.100,0,0,0]]);
 g.tag=2;for(let side of [-1,1]){
 // Each front flipper is a tapered, cambered three-dimensional foil, not a quad.
 const fin=(u,v)=>{const [,z,x,y,lead,trail,h]=frontProfile.at(u),a=v*TAU,c=Math.cos(a);return [x+.5*(lead+trail)*c+.5*(lead-trail)*c*c,y+h*Math.sin(a),side*z];};skinSurface(fin,low?10:34,low?6:18,[.6,.62,.42],false,'front');
 const back=(u,v)=>{const a=v*TAU,cap=Math.sqrt(Math.max(0,1-u*u)),width=(.08+.10*Math.sin(u*Math.PI))*cap*(1-u*.56);return [-.70-u*.58+Math.cos(a)*width,-.09+Math.sin(a)*.020*cap*(1-u*.4),side*(.48+u*.38)];};skinSurface(back,low?6:20,low?6:14,[.6,.62,.42],false,'rear');
 g.tag=4;if(low)ellipsoid([1.143,.041,side*.147],[.022,.024,.012],[.012,.02,.022],6,4);else{
 ellipsoid([1.14,.039,side*.137],[.022,.024,.012],[.052,.064,.045],18,12);ellipsoid([1.143,.041,side*.147],[.014,.017,.005],[.012,.02,.022],16,10);ellipsoid([1.151,.047,side*.152],[.004,.004,.003],[.80,.89,.78],10,6);
 // Fixed nostril anchors remain seated in the continuous snout surface.
 ellipsoid([1.255,.007,side*.043],[.007,.005,.005],[.06,.08,.05],9,6);}g.tag=2;
 }
 // Keep the exact existing tube triangles/normals. Assign UV by its angular
 // emission order, never atan: each side owns a continuous circumferential
 // interval including separate V=0/1 seam copies. Reserve U=.98..1 for the
 // terminal disc; each cap center uses its sector midpoint, giving nonzero UV
 // area without moving or adding a geometric triangle.
 const tailStart=g.v.length,tailSides=low?6:18;
 g.tube([-1.07,-.12,0],[-1.32,-.15,0],.060,.010,[.58,.61,.43],tailSides);
 for(let i=0;i<tailSides;i++){const a=i/tailSides,b=(i+1)/tailSides,uvs=[[0,a],[0,b],[.98,b],[0,a],[.98,b],[.98,a],[1,(a+b)*.5],[.98,a],[.98,b]];for(let j=0;j<9;j++){const uv=atlasUV('tail',...uvs[j]),k=tailStart+i*108+j*12;g.v[k+9]=uv[0];g.v[k+10]=uv[1];}}
 return g;}
// A closed, cambered eagle-ray body: ventral belly, swept wings and whip tail.
function rayGeometry(low=false){
 const g=new Geometry();g.material=6;g.species=9;g.shadow=!low;g.tag=1;
 const form=(u,v,under=false)=>{const z=(u*2-1)*1.90,w=Math.max(0,1-Math.abs(z)/1.90),lead=.47-Math.abs(z)*.44,chord=.035+1.36*Math.pow(w,.62);
  return [lead-v*chord,(under?-.026-.055*Math.sin(v*Math.PI)*w:.033+.17*Math.sin(v*Math.PI)*Math.pow(w,.72))+Math.pow(1-w,3)*.028,z];};
 const nu=low?24:58,nv=low?12:28;
 surface(g,(u,v)=>form(u,v),nu,nv,[.22,.28,.27],-1);
 g.tag=2;surface(g,(u,v)=>form(u,v,true),nu,low?6:16,[.66,.68,.60],1);
 for(const v of [0,1])for(let i=0;i<nu;i++)g.quad(form(i/nu,v),form(i/nu,v,true),form((i+1)/nu,v,true),form((i+1)/nu,v),[.40,.45,.42]);
 for(const u of [0,1])for(let j=0;j<nv;j++)g.quad(form(u,j/nv),form(u,(j+1)/nv),form(u,(j+1)/nv,true),form(u,j/nv,true),[.40,.45,.42]);
 g.tag=1;g.sphere([.46,.055,0],[.29,.105,.22],[.26,.31,.29],low?14:26,low?8:16);
 // Stable, uneven ivory spots follow the dorsal surface, including the outer wings.
 if(!low)for(let i=0;i<82;i++){
  const u=.08+.84*((i*.61803398875)%1),v=.16+.67*((i*.7548776662)%1),p=form(u,v),rad=.017+.008*((i*.41421356)%1);
  for(let j=0;j<6;j++){const a=j/6*TAU,b=(j+1)/6*TAU;g.tri([p[0],p[1]+.006,p[2]],[p[0]+Math.cos(a)*rad,p[1]+.006,p[2]+Math.sin(a)*rad],[p[0]+Math.cos(b)*rad,p[1]+.006,p[2]+Math.sin(b)*rad],[.64,.66,.56],[[0,1,0],[0,1,0],[0,1,0]]);}
 }
 g.tag=2;let prev=[-.91,.03,0];for(let i=1;i<=14;i++){const t=i/14,p=[-.91-t*2.48,.03-.10*t+.07*Math.sin(t*Math.PI),Math.sin(t*3.2)*.055*t];g.tube(prev,p,.032*(1-(i-1)/14)+.002,.032*(1-t)+.002,[.16,.21,.20],low?4:7);prev=p;}
 for(const side of [-1,1]){
  g.tag=4;g.sphere([.48,.139,side*.148],[.026,.017,.014],[.015,.025,.023],low?7:14,low?5:9);
  if(!low){g.tag=2;for(let k=0;k<5;k++)g.tube([.18-k*.095,-.042,side*.18],[.17-k*.095,-.042,side*.30],.003,.002,[.25,.31,.27],4);}
 }return g;
}
// Shared smooth lofts for large animals. All detail levels sample the same
// continuous surfaces; roots begin inside the body and tips actually close.
function marineRow(rows,t){
 const q=clamp(t,0,1)*(rows.length-1),i=Math.min(rows.length-2,Math.floor(q)),f=q-i,a=rows[i],b=rows[i+1],p=rows[i-1]||a.map((v,k)=>2*v-b[k]),n=rows[i+2]||b.map((v,k)=>2*v-a[k]);
 return a.map((v,k)=>{const m0=(b[k]-p[k])*.5,m1=(n[k]-v)*.5,f2=f*f,f3=f2*f;return (2*f3-3*f2+1)*v+(f3-2*f2+f)*m0+(-2*f3+3*f2)*b[k]+(f3-f2)*m1;});
}
function marineProfile(rows,x){
 let i=0;while(i<rows.length-2&&x>rows[i+1][0])i++;
 const a=rows[i],b=rows[i+1],p=rows[Math.max(0,i-1)],n=rows[Math.min(rows.length-1,i+2)],h=b[0]-a[0],t=clamp((x-a[0])/h,0,1),t2=t*t,t3=t2*t;
 return [x,...[1,2,3].map(k=>{const m0=(b[k]-p[k])/(b[0]-p[0])*h,m1=(n[k]-a[k])/(n[0]-a[0])*h,v=(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[k]+(t3-t2)*m1;return k===1?v:Math.max(0,v);})];
}
function marineSurface(g,point,nu,nv,color){
 const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.00001),v),point(Math.max(0,u-.00001),v)),dv=V.sub(point(u,v+.00001),point(u,v-.00001)),radial=V.sub(p,point(u,v+.5));let n=V.cross(dv,du);if(V.len(n)<1e-12)n=V.mul(du,u<.5?-1:1);else if(V.dot(n,radial)<0)n=V.mul(n,-1);return {p,n:V.norm(n),c:typeof color==='function'?color(p):color};};
 const rows=Array.from({length:nu+1},(_,i)=>Array.from({length:nv+1},(_,j)=>sample(i/nu,j/nv)));
 const tri=(a,b,c)=>{const face=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(face)<1e-12)return;if(V.dot(face,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,a.c,[a.n,b.n,c.n],[a.c,b.c,c.c]);};
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=rows[i][j],b=rows[i+1][j],c=rows[i+1][j+1],d=rows[i][j+1];tri(a,b,c);tri(a,c,d);}
}
function marineBody(g,rows,low,color,frontCap,flatten=0){
 const min=rows[0][0],max=rows.at(-1)[0],cap=marineProfile(rows,frontCap),epsilon=(max-min)*.00001,left=marineProfile(rows,frontCap-epsilon),right=marineProfile(rows,frontCap+epsilon),slope=cap.map((v,k)=>(right[k]-left[k])/(2*epsilon)),capLength=max-frontCap;
 // Match the profile's first derivative at the rounded cap. A plain ellipse
 // starts with slope zero and leaves a visible circumferential crease here.
 const point=(u,v)=>{const x=mix(min,max,(1-Math.cos(u*Math.PI))*.5),p=marineProfile(rows,x),a=v*TAU;if(x>frontCap){const f=(x-frontCap)/capLength,r=Math.sqrt(Math.max(0,1-f*f));p[1]=cap[1]+slope[1]*capLength*f*(1-f)*(1-f);for(const k of [2,3])p[k]=cap[k]*r*(1+slope[k]*capLength/cap[k]*f*(1-f));}const power=1-flatten*smooth01((x-.26)/.16),cy=Math.cos(a),sz=Math.sin(a);return [x,p[1]+Math.sign(cy)*Math.pow(Math.abs(cy),power)*p[2],Math.sign(sz)*Math.pow(Math.abs(sz),power)*p[3]];};
 const start=g.v.length;marineSurface(g,point,low?64:144,low?32:64,color);
 // All angular samples meet at the same closed pole. Their finite-difference
 // meridians disagree there; one axial normal prevents a star-shaped nose glint.
 for(let k=start;k<g.v.length;k+=12)if(Math.abs(g.v[k]-min)<1e-9||Math.abs(g.v[k]-max)<1e-9){g.v[k+3]=Math.abs(g.v[k]-max)<1e-9?1:-1;g.v[k+4]=0;g.v[k+5]=0;}
 return point;
}
function marineFin(g,rows,low,color,vertical=false){
 marineSurface(g,(u,v)=>{const p=marineRow(rows,u),a=v*TAU,w=Math.max(0,p[3]),h=Math.max(0,p[4]);return vertical?[p[0]+Math.cos(a)*w,p[1],p[2]+Math.sin(a)*h]:[p[0]+Math.cos(a)*w,p[1]+Math.sin(a)*h,p[2]];},low?20:44,low?12:20,color);
}
function marineFlukes(g,low,color,scale=1,offset=0){
 marineSurface(g,(u,v)=>{const z=(u*2-1)*.155,r=Math.abs(z)/.155,a=v*TAU,leading=-.443+.014*r-.015*Math.sin(Math.PI*r),chord=.040*Math.pow(Math.max(0,1-r),.65)+.027*Math.sin(Math.PI*r),notch=.012*Math.exp(-Math.pow(r/.10,2)),trailing=leading-chord+notch,center=(leading+trailing)*.5,width=(leading-trailing)*.5,thickness=.006*Math.pow(Math.max(0,1-r*r),.65);return [(center+Math.cos(a)*width)*scale+offset,(.005*r+Math.sin(a)*thickness)*scale,z*scale];},low?48:96,low?12:20,color);
}
// Humpback anatomy keeps the original game-metre rig and stable individual scale.
function whaleGeometry(low=false){
 const g=new Geometry();g.material=10;g.tag=1;g.shadow=!low;
 const rows=[[-4.65,0,0,0],[-4.25,.01,.16,.17],[-3.50,.02,.33,.34],[-2.4,.06,.59,.59],[-1.1,.10,.82,.80],[.3,.13,.98,.94],[1.45,.10,.96,.95],[2.35,.01,.70,.81],[3.05,-.07,.43,.66],[3.43,-.11,.23,.43],[3.70,-.11,0,0]];
 const paint=p=>V.lerp([.19,.25,.28],[.51,.56,.54],(1-smooth01((p[1]+.65)/.67))*.78);
 marineBody(g,rows,low,paint,3.43);
 for(const side of [-1,1]){
  g.tag=2;marineFin(g,[[1.28,-.20,side*.48,.44,.17],[.90,-.33,side*1.05,.45,.13],[.35,-.48,side*1.85,.36,.08],[-.38,-.65,side*2.70,.20,.045],[-.91,-.72,side*3.23,0,0]],low,p=>V.lerp([.24,.30,.32],[.65,.68,.63],smooth01((p[0]+1.0)/1.8)*.55));
  // Eyes lie on the head surface; no isolated reflective bead or white halo.
  const x=2.72,y=-.08,p=marineProfile(rows,x),z=p[3]*Math.sqrt(Math.max(0,1-((y-p[1])/p[2])**2));g.tag=4;g.sphere([x,y,side*(z-.016)],[.046,.031,.022],[.020,.029,.031],low?10:18,low?7:12);
 }
 g.tag=3;marineFlukes(g,low,paint,12.5,1.12);
 marineFin(g,[[-1.97,.60,0,.39,.11],[-2.12,.86,0,.28,.075],[-2.32,1.10,0,.12,.037],[-2.50,1.12,0,0,0]],low,paint,true);
 g.tag=1;return g;
}
function diverGeometry(){let g=new Geometry(),suit=rgb(0x223e49),trim=rgb(0x68afa9),tank=rgb(0xb0b8ac),skin=rgb(0xb39379);g.sphere([0,0,0],[.32,.22,.66],suit,16,10);g.tube([0,.24,-.45],[0,.24,.4],.16,.16,tank,12);g.tube([0,.26,-.50],[0,.26,-.36],.11,.11,trim,10);g.sphere([0,.05,-.86],[.22,.22,.24],skin,24,16);g.box([0,.07,-1.05],[.39,.17,.08],rgb(0x376b73));for(let side of [-1,1]){g.tube([side*.22,-.03,.37],[side*.20,-.1,1.1],.13,.10,suit,10);g.tube([side*.2,-.1,1.1],[side*.29,-.2,1.64],.10,.08,suit,10);g.quad([side*.12,-.20,1.55],[side*.43,-.20,1.55],[side*.5,-.2,2.22],[side*.04,-.2,2.22],trim);g.tube([side*.23,0,-.37],[side*.56,-.18,-.52],.09,.075,suit,8);g.tube([side*.56,-.18,-.52],[side*.44,-.26,-.86],.075,.05,suit,8);g.sphere([side*.44,-.26,-.9],[.07,.06,.12],skin,9,6);}g.material=0;return g;}
function addLife(r){let counts=[4,9,8,7,16,62,7,9,3,3,1];
 for(let idx=0;idx<counts.length;idx++){let s=SPECIES[idx],geo=idx<8?fishGeometry(s):idx===8?turtleGeometry():idx===9?rayGeometry():whaleGeometry(),arr=[],anchor=s.zone===0?[-8,-4]:s.zone===1?[10,-16]:[-1,-35];
 for(let k=0;k<counts[idx];k++){let center,rad,height;
 if(idx===0){center=typeof reefAnemoneHome==='undefined'?[-5.6,-9.1,1.0]:reefAnemoneHome.slice();rad=rr(.30,.92);height=.42;}
 else{center=[anchor[0]+rr(-4,4),0,anchor[1]+rr(-5,5)];rad=idx===5?rr(3.5,7.3):idx>=8?rr(7,13):rr(2,6.5);height=idx===8?rr(5.8,7):idx===9?rr(7,10):rr(3.1,5.8);}
 let scale=s.size*rr(.82,1.12),phase=rr(0,TAU);let item={p:[center[0],-7,center[2]],yaw:0,pitch:0,s:[scale,scale,scale],tint:[rr(.94,1.06),rr(.94,1.06),rr(.94,1.06)],phase,species:idx,orbit:k/counts[idx]*TAU+rr(-.2,.2),radius:rad,center,height,speed:idx>=8?.048:idx===0?.25:idx===5?.105:rr(.075,.13),bob:rr(0,TAU)};arr.push(item);life.push(item);}
 if(idx<8){let high=r.batch(geo,arr,1,true);high.maxDistance=3.2;let low=r.batch(fishGeometry(s,true),arr,1,true);low.minDistance=3.2;low.maxDistance=62;low.shadow=true;low.shadowProxy=true;}else {let kind=idx===8?2:idx===9?4:6,hi=r.batch(geo,arr,kind,true);hi.maxDistance=idx===10?35:14;let lo=r.batch(idx===8?distantTurtle():idx===9?distantRay():distantWhale(),arr,kind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=180;lo.shadow=false;}
 }
 let turtles=life.filter(l=>l.species===8);
 turtles[0].center=[-1,0,-37];turtles[0].radius=4.3;turtles[0].fixedDepth=-17.5;turtles[0].orbit=2.2;turtles[0].speed=.038;turtles[0].s=[.82,.82,.82];
 turtles[1].center=[1,0,-4];turtles[1].height=6;turtles[1].radius=4.3;turtles[1].orbit=1.1;turtles[1].speed=.045;
 turtles[2].center=[12,0,-50];turtles[2].fixedDepth=-21;turtles[2].radius=6.2;
 const rays=life.filter(l=>l.species===9);
 rays.forEach((f,i)=>{f.center=[-1+i*6,0,-57-i*12];f.fixedDepth=-25-i*5;f.radius=9+i;f.speed=.022+i*.003;f.orbit=1.4+i*.5;});
 const whale=life.find(l=>l.species===10);whale.center=[0,0,-69];whale.fixedDepth=-25.5;whale.radius=13;whale.orbit=1.1;whale.speed=.012;whale.s=[1.45,1.45,1.45];
 // Four small groups stay attached to the ledges, leaving the open water quiet.
 for(const f of life){if([1,3,4,5].includes(f.species)&&f.orbit%2>1){f.center=[-9,0,-31];f.radius*=.48;f.fixedDepth=-17.8-(f.species===5?1.4:0);}}
 // Tiny warm reef fish are decorative; they do not invent a local occurrence record.
 const decor={id:'decor',height:.22,width:.073,color:0xe9a048,size:.26};let dg=fishGeometry(decor,true),di=[];for(let k=0;k<62;k++){let band=k%3,center=band===0?[-8,0,-7]:band===1?[8,0,-9]:[-1,0,-22];let sc=rr(.20,.34);let item={p:[0,-8,0],s:[sc,sc,sc],yaw:0,phase:rr(0,TAU),pitch:0,tint:[rr(.87,1.11),rr(.80,1.05),rr(.90,1.05)],center,radius:rr(2,6),orbit:rr(0,TAU),speed:rr(.07,.11),bob:rr(0,TAU),height:rr(4.0,6.4),species:-1};di.push(item);decorLife.push(item);}r.batch(dg,di,1,true);
 allLife=life.concat(decorLife);addReefSchool(r);diverBatch=r.batch(diverGeometry(),[{p:[0,-7.3,13.5],yaw:0,s:[.85,.85,.85],phase:0}],5,true);diverBatch.visible=false;
}
function updateLife(t){updateReefSchool(t);for(let l of allLife){let a=l.orbit+t*l.speed+.055*Math.sin(t*.17+l.bob),wobble=Math.sin(t*.32+l.bob)*.19,x=l.center[0]+Math.cos(a)*l.radius,z=l.center[2]+Math.sin(a)*l.radius*.70+.20*Math.sin(t*.32+l.bob);
 let y=l.species===0?l.center[1]+l.height+Math.sin(t*.7+l.bob)*.12:groundHeight(x,z)+l.height+Math.sin(t*.55+l.bob)*.22;
 if(l.fixedDepth!==undefined)y=l.fixedDepth+Math.sin(t*.33+l.bob)*.18;
 if(l.species!==0)for(let ob of obstacles){let dx=(x-ob.p[0])/ob.s[0],dz=(z-ob.p[2])/ob.s[2];if(dx*dx+dz*dz<1.6)y=Math.max(y,ob.p[1]+ob.s[1]+.45);}
 l.p[0]=x;l.p[1]=Math.min(-1.0,y);l.p[2]=z;l.yaw=Math.atan2(-Math.cos(a)*.70,-Math.sin(a))+wobble*.12;l.pitch=Math.sin(t*.5+l.bob)*.028;}}
