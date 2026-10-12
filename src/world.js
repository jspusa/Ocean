/* Scene is an original, procedural interpretation, NOT a measured reconstruction. */
const SPECIES=[
 {id:'clown',name:'小丑魚',latin:'Amphiprion spp. · 類群示意',en:'ANEMONEFISH',color:0xe78b42,height:.29,width:.14,zone:0,hint:'橘色身體，白色直帶，深色鰭緣。',detail:'本版以橘色海葵魚造型呈現。停在珊瑚花園附近，慢慢觀察牠轉身時的條帶。模型未經物種鑑定，不作種級辨識依據。',size:.43},
 {id:'tang',name:'藍倒吊',latin:'Paracanthurus hepatus · 簡化模型',en:'BLUE TANG',color:0x3b79d7,height:.33,width:.10,zone:0,hint:'藍色側身、深色花紋與黃色尾部。',detail:'本版以鮮明的藍、黑、黃配色提供觀察線索。你可在遊戲的珊瑚平台旁遇見牠；這不是石朗的現場出現紀錄。',size:.53},
 {id:'butterfly',name:'蝴蝶魚',latin:'Chaetodontidae · 類群示意',en:'BUTTERFLYFISH',color:0xe6ce76,height:.40,width:.085,zone:1,hint:'側扁的輪廓、黃色尾側與深色眼帶。',detail:'這是蝴蝶魚類的合成造型，不對應某一特定物種。可練習觀察輪廓和條帶，不能用本模型判斷真實魚種。',size:.47},
 {id:'idol',name:'角鐮魚',latin:'Zanclus cornutus · 簡化模型',en:'MOORISH IDOL',color:0xe5dcaa,height:.39,width:.09,zone:1,hint:'黑白黃配色，以及向後延伸的長背鰭。',detail:'本版刻意保留長背鰭的剪影，方便從不同方向觀看。模型形態、尺寸與游動行為皆有簡化。',size:.56},
 {id:'sergeant',name:'條紋豆娘魚',latin:'Abudefduf spp. · 類群示意',en:'SERGEANT MAJOR',color:0xc5d3b5,height:.27,width:.095,zone:1,hint:'淺色身體上，排列著數道深色直帶。',detail:'先看身形，再看條帶，比只記顏色更有趣。本版是條紋豆娘魚類的視覺示意，不是完整物種分類教材。',size:.42},
 {id:'chromis',name:'青雀鯛',latin:'Chromis spp. · 類群示意',en:'REEF CHROMIS',color:0x73cfbd,height:.19,width:.08,zone:0,hint:'青綠色的小型身影，成群穿梭。',detail:'本版讓小魚在珊瑚上方集體轉向。魚群數量、密度與游動路徑是遊戲設定，不是生態調查數據。',size:.33},
 {id:'parrot',name:'鸚哥魚',latin:'Scaridae · 類群示意',en:'PARROTFISH',color:0x60ae9a,height:.31,width:.16,zone:2,hint:'厚實的身形、青綠色側身與粉色花紋。',detail:'本版使用青綠色的合成鸚哥魚造型。真實物種與不同生命階段可能有不同外觀，本模型不提供種級判定。',size:.85},
 {id:'wrasse',name:'隆頭魚',latin:'Labridae · 類群示意',en:'REEF WRASSE',color:0x78b68e,height:.20,width:.10,zone:2,hint:'修長輪廓，身體帶有彩色橫向紋路。',detail:'這是隆頭魚類的合成視覺造型。沿著遊戲中的礁緣游動，可以留意這種細長輪廓。',size:.68},
 {id:'turtle',name:'綠蠵龜',latin:'Chelonia mydas · 簡化模型',en:'GREEN SEA TURTLE',color:0x88946c,zone:0,hint:'褐綠色龜殼，四肢像槳一樣划動。',detail:'綠蠵龜資料可參考 NOAA Fisheries。本版的龜殼、體型與游動已簡化；牠在遊戲中的路線不代表現地海龜位置。觀察時不追逐、不碰觸。',size:1,source:'https://www.fisheries.noaa.gov/species/green-turtle'},
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
function anemoneGeometry(){let g=new Geometry();g.material=3;for(let k=0;k<180;k++){let a=k*2.39996,r=Math.sqrt(k/180)*.75,base=[Math.cos(a)*r,.015,Math.sin(a)*r],h=rr(.23,.47)*(1-.3*r),prev=base;for(let j=1;j<=8;j++){let p=[base[0]+Math.sin(a+j*.25)*j*.012,h*j/8,base[2]+Math.cos(a+j*.38)*j*.009],rad=.016*(1-j*.025);g.tube(prev,p,rad+.0004,rad,[.66,.53,.57],10);prev=p;}g.sphere(prev,[.017,.025,.017],[.75,.64,.66],12,8);}return g;}
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
function turtleGeometry(){let g=new Geometry();g.material=5;g.tag=1;
 // Sculpted carapace with a low dome and scalloped trailing rim.
 surface(g,(u,v)=>{let a=u*TAU,b=v*Math.PI,s=Math.sin(b),f=1+.025*Math.sin(a*14)*Math.pow(s,12);return [-.16+Math.cos(a)*s*1.00*f,Math.cos(b)*.31-.012,s*Math.sin(a)*.70*f];},80,44,[.55,.52,.32],-1);
 g.tag=3;g.sphere([-.14,-.175,0],[.94,.095,.65],[.72,.70,.53],54,20);
 g.tag=2;g.tube([.62,-.04,0],[.95,-.025,0],.15,.125,[.58,.61,.43],24);g.sphere([1.08,-.015,0],[.23,.14,.155],[.62,.63,.43],40,24);
 g.tag=3;g.sphere([1.236,-.040,0],[.07,.060,.116],[.72,.70,.53],26,16);
 g.tag=2;for(let side of [-1,1]){
 // Each front flipper is a tapered, cambered three-dimensional foil, not a quad.
 const fin=(u,v)=>{let span=u,theta=v*TAU,width=.16+.15*Math.sin(span*Math.PI);let cx=.49-span*.51-span*span*.22,z=side*(.51+span*1.19),y=-.045-span*.045;return [cx+Math.cos(theta)*width*(1-span*.84),y+Math.sin(theta)*.036*(1-span*.87),z];};surface(g,fin,34,18,[.6,.62,.42],side===1?1:-1);
 const back=(u,v)=>{let a=v*TAU;return [-.79-u*.49+Math.cos(a)*.18*(1-u*.76),-.10+Math.sin(a)*.028*(1-u*.6),side*(.48+u*.38)];};surface(g,back,20,14,[.6,.62,.42],side===1?1:-1);
 g.tag=4;g.sphere([1.14,.039,side*.137],[.022,.024,.012],[.052,.064,.045],18,12);g.sphere([1.143,.041,side*.147],[.014,.017,.005],[.012,.02,.022],16,10);g.sphere([1.151,.047,side*.152],[.004,.004,.003],[.80,.89,.78],10,6);
 // Small recessed nostrils and a curved beak line.
 g.sphere([1.255,.007,side*.043],[.007,.005,.005],[.06,.08,.05],9,6);let prev=null;for(let i=0;i<15;i++){let a=i/14*Math.PI,p=[1.225+.052*Math.sin(a),-.055,side*.108*Math.cos(a)];if(prev)g.tube(prev,p,.0025,.0025,[.16,.18,.12],5);prev=p;}g.tag=2;
 }
 g.tube([-1.07,-.12,0],[-1.32,-.15,0],.060,.010,[.58,.61,.43],18);return g;}
function rayGeometry(){let g=new Geometry();g.material=6;g.tag=1;let form=(u,v)=>{let z=(u*2-1)*1.90,w=1-Math.abs(z)/1.90,x=.50-v*(.72+w*.96)-Math.abs(z)*.32;return [x,.04+Math.sin(v*Math.PI)*.13*w,z];};surface(g,form,62,32,(p)=>{let n=.5+.5*Math.sin(p[0]*93+p[2]*53)*Math.sin(p[2]*85-p[0]*43);return n>.92?[.76,.78,.70]:[.25,.31,.33];},1);g.sphere([.41,.08,0],[.30,.115,.23],[.25,.31,.33],26,16);g.tube([-1.10,.06,0],[-3.25,-.05,0],.029,.002,[.13,.18,.20],10);g.tag=4;for(let s of [-1,1])g.sphere([.47,.15,s*.15],[.027,.015,.016],[.02,.04,.05],12,8);return g;}
// A fully three-dimensional, smoothly profiled whale; no imported model or silhouette sprite.
function whaleGeometry(){const g=new Geometry();g.material=10;g.tag=1;const smoothStep=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 // Nonuniform head stations make a rounded, broad rostrum, not a pointed fish snout.
 const profile=[.012,.30,.49,.64,.78,.94,1.,.93,.76,.55,.33,.18,.09,.035];
 const stations=[3.70,3.64,3.50,3.15,2.60,1.90,1.,-.10,-1.30,-2.45,-3.40,-4.,-4.55,-4.70];
 function sample(values,t){let q=clamp(t,0,1)*(values.length-1),i=Math.floor(q),f=q-i,n=values.length;let a=values[Math.max(0,i-1)],b=values[Math.min(n-1,i)],c=values[Math.min(n-1,i+1)],d=values[Math.min(n-1,i+2)];return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);}
 surface(g,(u,v)=>{let a=u*TAU,r=sample(profile,v),x=sample(stations,v),head=1.-smoothStep(.03,.35,v);return [x,Math.cos(a)*r*(.94-head*.29)+.12*Math.sin(v*Math.PI),Math.sin(a)*r];},64,120,(p)=>{let underside=clamp((-p[1]-.10)*2.8,0,1);return V.lerp([.24,.29,.32],[.62,.66,.65],underside*.75);},1);
 // Long cambered pectoral fins and white leading edges.
 for(const side of [-1,1]){g.tag=2;surface(g,(u,v)=>{let a=v*TAU,w=(.29+.07*Math.sin(u*Math.PI))*(1-u*.90);return [1.25-u*2.4+Math.cos(a)*w,-.18-u*.53+Math.sin(a)*.055*(1-u*.8),side*(.63+u*2.75)];},42,18,(p,u,v)=>Math.cos(v*TAU)>.12?[.54,.58,.58]:[.17,.22,.24],side>0?1:-1);
 g.tag=3;surface(g,(u,v)=>{let a=v*TAU,span=u,w=(.56-.12*u)*(1-u*.87);return [-4.61-u*.54+Math.cos(a)*w,-.02+Math.sin(a)*.065*(1-u*.85),side*(u*1.94)];},38,20,[.22,.28,.31],side>0?1:-1);
 g.tag=4;g.sphere([2.93,-.045,side*.697],[.065,.07,.032],[.022,.036,.045],18,12);g.sphere([2.947,-.024,side*.722],[.014,.015,.009],[.72,.77,.79],12,8);
 // Mouth seam and several small rostral tubercles.
 let prev=null;for(let i=0;i<23;i++){let v=i/22,x=3.58-v*2.6,p=[x,-.135-v*.30,side*(.41+Math.sin(v*1.65)*.48)];if(prev)g.tube(prev,p,.012,.012,[.07,.11,.14],5);prev=p;}
 for(let i=0;i<5;i++){let x=2.35+i*.17;g.sphere([x,.45-i*.045,side*.28],[.065,.044,.065],[.37,.42,.43],12,8);}}
 // Dorsal fin, with thickness instead of a flat triangle.
 surface(g,(u,v)=>{let a=v*TAU;return [-2.12-u*.41+Math.cos(a)*.30*(1-u),.59+u*.37,Math.sin(a)*.095*(1-u)];},24,18,[.20,.25,.27],1);
 return g;}
function diverGeometry(){let g=new Geometry(),suit=rgb(0x223e49),trim=rgb(0x68afa9),tank=rgb(0xb0b8ac),skin=rgb(0xb39379);g.sphere([0,0,0],[.32,.22,.66],suit,16,10);g.tube([0,.24,-.45],[0,.24,.4],.16,.16,tank,12);g.tube([0,.26,-.50],[0,.26,-.36],.11,.11,trim,10);g.sphere([0,.05,-.86],[.22,.22,.24],skin,24,16);g.box([0,.07,-1.05],[.39,.17,.08],rgb(0x376b73));for(let side of [-1,1]){g.tube([side*.22,-.03,.37],[side*.20,-.1,1.1],.13,.10,suit,10);g.tube([side*.2,-.1,1.1],[side*.29,-.2,1.64],.10,.08,suit,10);g.quad([side*.12,-.20,1.55],[side*.43,-.20,1.55],[side*.5,-.2,2.22],[side*.04,-.2,2.22],trim);g.tube([side*.23,0,-.37],[side*.56,-.18,-.52],.09,.075,suit,8);g.tube([side*.56,-.18,-.52],[side*.44,-.26,-.86],.075,.05,suit,8);g.sphere([side*.44,-.26,-.9],[.07,.06,.12],skin,9,6);}g.material=0;return g;}
function addLife(r){let counts=[4,9,8,7,16,62,7,9,3,3,1];
 for(let idx=0;idx<SPECIES.length;idx++){let s=SPECIES[idx],geo=idx<8?fishGeometry(s):idx===8?turtleGeometry():idx===9?rayGeometry():whaleGeometry(),arr=[],anchor=s.zone===0?[-8,-4]:s.zone===1?[10,-16]:[-1,-35];
 for(let k=0;k<counts[idx];k++){let center,rad,height;
 if(idx===0){center=[-5.6,-9.1,1.0];rad=rr(.30,.92);height=.42;}
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
