/* Original cetacean anatomy. Body length is one model unit, +X anterior;
 * species.size is metres. Biology references: CETACEAN-REFERENCE.md.
 * Partner contact points, speed, handling and training are authored game rules. */
const CETACEAN_SPECIES=[];
const cetaceanArt=(()=>{
 const black=[.027,.034,.040],white=[.81,.82,.77],gray=[.37,.43,.45];
 const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],clamp(t,0,1))),soft=(a,b,x)=>smooth01(clamp((x-a)/(b-a),0,1));
 function interpolate(rows,u){const q=clamp(u,0,1)*(rows.length-1),i=Math.min(rows.length-2,Math.floor(q)),t=q-i,a=rows[i],b=rows[i+1],p=rows[i-1]||a.map((v,k)=>2*v-b[k]),n=rows[i+2]||b.map((v,k)=>2*v-a[k]);return a.map((v,k)=>{const m0=(b[k]-p[k])*.5,m1=(n[k]-v)*.5,t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*v+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[k]+(t3-t2)*m1;});}
 // Smooth normals and per-vertex pigments, including across the angular seam.
 function skin(g,point,nu,nv,color){
  const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.0001),v),point(Math.max(0,u-.0001),v)),dv=V.sub(point(u,v+.0001),point(u,v-.0001)),radial=V.sub(p,point(u,v+.5));let n=V.cross(dv,du);if(V.len(n)<1e-10)n=V.mul(du,u<.5?-1:1);else if(V.dot(n,radial)<0)n=V.mul(n,-1);return {p,n:V.norm(n),c:typeof color==='function'?color(p):color};};
  const put=(a,b,c)=>{const face=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(face)<1e-11)return;if(V.dot(face,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,a.c,[a.n,b.n,c.n],[a.c,b.c,c.c]);};
  const rows=Array.from({length:nu+1},(_,i)=>Array.from({length:nv+1},(_,j)=>sample(i/nu,j/nv)));
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=rows[i][j],b=rows[i+1][j],c=rows[i+1][j+1],d=rows[i][j+1];put(a,b,c);put(a,c,d);}
 }
 function profileAt(rows,x){let i=0;while(i<rows.length-2&&x>rows[i+1][0])i++;const a=rows[i],b=rows[i+1],p=rows[Math.max(0,i-1)],n=rows[Math.min(rows.length-1,i+2)],h=b[0]-a[0],t=clamp((x-a[0])/h,0,1),t2=t*t,t3=t2*t;
  return [x,...[1,2,3].map(k=>{const m0=(b[k]-p[k])/(b[0]-p[0])*h,m1=(n[k]-a[k])/(n[0]-a[0])*h,v=(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[k]+(t3-t2)*m1;return k===1?v:Math.max(0,v);})];
 }
 function body(g,d,low){skin(g,(u,v)=>{const [x,y,ry,rz]=profileAt(d.body,mix(d.body[0][0],d.body.at(-1)[0],u)),a=v*TAU;return [x,y+Math.cos(a)*ry,Math.sin(a)*rz];},low?34:84,low?16:40,d.paint);}
 function fin(g,rows,color,low,vertical=false){g.tag=3;skin(g,(u,v)=>{const [x,y,z,w,h]=interpolate(rows,u),a=v*TAU;return vertical?[x+Math.cos(a)*Math.max(0,w),y,z+Math.sin(a)*Math.max(0,h)]:[x+Math.cos(a)*Math.max(0,w),y+Math.sin(a)*Math.max(0,h),z];},low?10:24,low?8:14,color);g.tag=1;}
 function eyes(g,d,low){const r=d.eyeRadius||.006,p=profileAt(d.body,d.eyeX),z=p[3]*Math.sqrt(Math.max(.05,1-((d.eyeY-p[1])/p[2])**2));g.tag=4;
  for(const side of [-1,1]){faunaArt.ellipsoid(g,[d.eyeX,d.eyeY,side*z],[r*1.1,r*.72,r*.40],[.095,.108,.105],low?10:16,low?6:10);faunaArt.ellipsoid(g,[d.eyeX+r*.16,d.eyeY,side*(z+r*.25)],[r*.66,r*.53,r*.24],[.008,.014,.018],low?8:12,low?5:8);}g.tag=1;
 }
 function details(g,d,low){
  const a=profileAt(d.body,d.blowX||.25);faunaArt.ellipsoid(g,[a[0],a[1]+a[2]+.0002,0],[.012,.0012,.007],black,low?10:16,5);
  for(const side of [-1,1]){const path=Array.from({length:low?9:21},(_,i)=>{const x=mix(d.mouthStart,d.mouthEnd,i/(low?8:20)),b=profileAt(d.body,x),y=b[1]+d.mouthLevel*b[2],z=b[3]*Math.sqrt(1-d.mouthLevel*d.mouthLevel);return [x,y,side*(z+.0007)];});faunaArt.tube(g,path,.0012,blend(black,d.paint(path[0]),.25),low?4:6);}
 }
 function build(g,d,low){body(g,d,low);if(d.dorsal)fin(g,d.dorsal,d.finColor||d.paint,low,true);for(const side of [-1,1]){fin(g,d.flipper.map(p=>[p[0],p[1],p[2]*side,p[3],p[4]]),d.finColor||d.paint,low);fin(g,d.fluke.map(p=>[p[0],p[1],p[2]*side,p[3],p[4]]),d.finColor||d.paint,low);}eyes(g,d,low);details(g,d,low);d.detail?.(g,low);}
 const definitions={
  common_dolphin:{
   body:[[-.46,0,0,0],[-.40,0,.015,.012],[-.30,0,.026,.022],[-.17,0,.044,.039],[-.01,0,.063,.056],[.14,0,.072,.066],[.26,.002,.065,.061],[.335,.006,.046,.043],[.38,-.015,.022,.026],[.46,-.019,.013,.017],[.495,-.019,.005,.006],[.5,-.019,0,0]],
   dorsal:[[.012,.052,0,.070,.008],[-.012,.102,0,.050,.007],[-.049,.151,0,.028,.004],[-.079,.182,0,.008,.002],[-.089,.179,0,0,0]],
   flipper:[[.19,-.035,.047,.039,.009],[.125,-.059,.096,.040,.008],[.060,-.077,.150,.023,.005],[.031,-.079,.172,0,0]],
   fluke:[[-.439,0,0,.025,.009],[-.452,.002,.045,.048,.009],[-.446,.005,.095,.036,.005],[-.428,.008,.135,0,0]],eyeX:.31,eyeY:.001,eyeRadius:.005,mouthStart:.295,mouthEnd:.488,mouthLevel:-.42,
   paint(p){const [x,y]=p,tan=[.71,.62,.37],flank=x>-.035?tan:[.49,.56,.59],cape=.006+.18*Math.abs(x+.055);let c=blend(white,flank,soft(-.046,-.018,y));c=blend(c,black,soft(cape-.012,cape+.002,y));if(x>.26)c=blend(c,black,(1-soft(.006,.017,Math.abs(y+.018+(x-.35)*.12)))*soft(.26,.32,x));return c;},finColor:[.13,.19,.21]
  },
  white_sided_dolphin:{
   body:[[-.46,0,0,0],[-.40,0,.020,.015],[-.29,0,.037,.027],[-.14,0,.060,.047],[.025,0,.079,.067],[.17,0,.084,.076],[.29,.004,.073,.067],[.375,.008,.051,.047],[.423,-.010,.027,.029],[.478,-.018,.014,.017],[.5,-.019,0,0]],
   dorsal:[[.018,.069,0,.090,.010],[-.006,.125,0,.061,.010],[-.043,.182,0,.036,.006],[-.086,.214,0,.018,.003],[-.103,.201,0,0,0]],
   flipper:[[.20,-.045,.054,.044,.010],[.123,-.067,.108,.044,.009],[.055,-.078,.158,.027,.005],[.026,-.074,.184,0,0]],
   fluke:[[-.432,0,0,.031,.012],[-.449,.001,.048,.051,.011],[-.444,.004,.105,.039,.007],[-.424,.008,.151,0,0]],eyeX:.332,eyeY:-.001,eyeRadius:.0052,mouthStart:.31,mouthEnd:.488,mouthLevel:-.38,
   paint(p){const [x,y]=p;let c=blend(white,[.37,.45,.49],soft(-.041,-.018,y));c=blend(c,black,soft(.030,.053,y));const line=.020+.029*Math.sin((x+.38)*3.4),stripe=(1-soft(.009,.021,Math.abs(y-line)))*soft(-.38,-.29,x)*(1-soft(.28,.38,x));return blend(c,[.72,.77,.75],stripe);},finColor:p=>blend([.11,.17,.20],[.48,.55,.55],soft(-.06,.06,p[0]))
  },
  commerson_dolphin:{
   body:[[-.46,0,0,0],[-.395,0,.023,.017],[-.285,0,.042,.031],[-.14,0,.070,.055],[.035,0,.092,.078],[.20,.002,.098,.086],[.34,.005,.087,.079],[.435,.007,.061,.059],[.482,.001,.029,.032],[.50,-.003,0,0]],
   dorsal:[[.008,.078,0,.075,.011],[-.014,.130,0,.057,.010],[-.048,.164,0,.032,.007],[-.074,.168,0,.016,.004],[-.084,.156,0,0,0]],
   flipper:[[.20,-.057,.063,.040,.010],[.157,-.078,.119,.043,.010],[.112,-.091,.159,.027,.007],[.093,-.090,.174,0,0]],
   fluke:[[-.434,0,0,.028,.011],[-.447,.003,.049,.049,.010],[-.442,.007,.098,.034,.006],[-.419,.010,.130,0,0]],eyeX:.38,eyeY:.001,eyeRadius:.0045,mouthStart:.35,mouthEnd:.49,mouthLevel:-.36,
   paint(p){const [x,y]=p;let mask=soft(.224,.239,x)+1-soft(-.25,-.23,x);if(y>.045)mask=Math.max(mask,1-soft(.044,.058,Math.abs(x+.05)));return blend(white,black,mask);},finColor:black
  },
  orca:{
   body:[[-.46,0,0,0],[-.40,0,.025,.022],[-.30,.005,.040,.034],[-.18,.004,.073,.064],[-.02,0,.112,.090],[.14,0,.127,.109],[.28,.003,.116,.112],[.38,.006,.088,.096],[.455,.003,.058,.063],[.49,-.004,.026,.030],[.50,-.010,0,0]],
   dorsal:[[.005,.091,0,.102,.012],[-.005,.165,0,.071,.012],[-.015,.241,0,.038,.009],[-.025,.302,0,.016,.005],[-.031,.311,0,0,0]],
   flipper:[[.215,-.063,.080,.074,.014],[.145,-.097,.150,.082,.014],[.072,-.125,.205,.060,.010],[.035,-.130,.229,.025,.006],[.024,-.130,.234,0,0]],
   fluke:[[-.427,0,0,.035,.015],[-.443,.003,.063,.057,.013],[-.451,.006,.123,.048,.009],[-.434,.010,.170,.025,.004],[-.420,.012,.186,0,0]],eyeX:.374,eyeY:-.010,eyeRadius:.0055,mouthStart:.31,mouthEnd:.49,mouthLevel:-.42,
   paint(p){const [x,y,z]=p;let c=blend(white,black,soft(-.055,-.032,y));const patch=((x-.298)/.052)**2+((y-.044)/.026)**2;c=blend(c,white,(1-soft(.75,1.1,patch))*soft(.03,.055,Math.abs(z)));const saddle=((x+.113)/.10)**2+((y-.068)/.08)**2;return blend(c,[.43,.47,.45],(1-soft(.65,1.2,saddle))*soft(.020,.070,y));},finColor:black
  },
  beluga:{
   body:[[-.465,0,0,0],[-.40,0,.028,.020],[-.29,-.003,.060,.044],[-.14,-.004,.091,.071],[.035,-.003,.115,.096],[.17,-.001,.112,.095],[.25,-.007,.080,.070],[.31,.009,.082,.074],[.37,.026,.092,.080],[.427,.014,.069,.063],[.46,-.019,.033,.042],[.49,-.024,.019,.025],[.50,-.024,0,0]],
   dorsal:[[.10,.098,0,.056,.010],[.014,.127,0,.066,.010],[-.07,.117,0,.048,.009],[-.19,.079,0,.025,.005],[-.27,.059,0,0,0]],
   flipper:[[.19,-.064,.074,.060,.013],[.133,-.095,.126,.067,.013],[.082,-.105,.181,.043,.010],[.074,-.099,.211,.017,.006],[.091,-.090,.216,0,0]],
   fluke:[[-.425,0,0,.034,.015],[-.448,.003,.055,.052,.014],[-.442,.008,.120,.044,.009],[-.409,.014,.176,0,0]],eyeX:.392,eyeY:-.010,eyeRadius:.0045,mouthStart:.37,mouthEnd:.489,mouthLevel:-.57,blowX:.30,
   paint:p=>blend([.62,.68,.67],[.84,.84,.77],soft(-.12,.07,p[1])),finColor:[.73,.77,.73]
  },
  false_killer_whale:{
   body:[[-.46,0,0,0],[-.40,0,.018,.014],[-.29,0,.034,.025],[-.15,0,.052,.039],[.03,0,.070,.055],[.18,0,.078,.064],[.31,.003,.074,.065],[.405,.012,.060,.058],[.466,.010,.042,.043],[.494,.001,.019,.022],[.50,-.008,0,0]],
   dorsal:[[.010,.060,0,.083,.009],[-.018,.109,0,.054,.008],[-.063,.158,0,.028,.004],[-.107,.180,0,.014,.002],[-.116,.168,0,0,0]],
   flipper:[[.225,-.041,.045,.043,.009],[.174,-.058,.084,.064,.010],[.110,-.075,.120,.041,.008],[.048,-.085,.169,.021,.005],[.026,-.082,.191,0,0]],
   fluke:[[-.433,0,0,.029,.011],[-.451,.002,.047,.049,.010],[-.441,.005,.098,.035,.006],[-.420,.009,.143,0,0]],eyeX:.404,eyeY:-.005,eyeRadius:.0041,mouthStart:.33,mouthEnd:.49,mouthLevel:-.46,
   paint(p){const [x,y,z]=p,ventral=(1-soft(.20,.33,Math.abs(x-.10)))*(1-soft(-.048,-.028,y))*(1-soft(.028,.055,Math.abs(z)));return blend([.045,.057,.065],[.25,.29,.29],ventral);},finColor:[.032,.045,.052]
  },
  rissos_dolphin:{
   body:[[-.46,0,0,0],[-.40,0,.022,.016],[-.29,0,.039,.029],[-.14,0,.064,.049],[.04,0,.084,.070],[.20,.003,.100,.084],[.325,.012,.103,.088],[.412,.018,.087,.079],[.471,.010,.053,.054],[.497,-.002,.018,.020],[.50,-.012,0,0]],
   dorsal:[[.028,.071,0,.085,.010],[-.001,.130,0,.062,.010],[-.043,.201,0,.037,.006],[-.087,.242,0,.017,.003],[-.106,.234,0,0,0]],
   flipper:[[.217,-.053,.062,.043,.010],[.145,-.077,.114,.043,.009],[.063,-.096,.175,.026,.006],[.015,-.097,.212,0,0]],
   fluke:[[-.434,0,0,.028,.012],[-.451,.002,.049,.049,.011],[-.444,.007,.104,.037,.007],[-.422,.012,.148,0,0]],eyeX:.397,eyeY:-.012,eyeRadius:.0045,mouthStart:.367,mouthEnd:.49,mouthLevel:-.53,
   paint(p){const [x,y]=p;return blend([.56,.62,.60],[.31,.39,.42],soft(.070,.110,y)*(1-soft(.24,.40,x)));},finColor:[.19,.27,.30],
   detail(g,low){
    // Fine original surface rake lines; no individual animal's scar pattern copied.
    g.tag=1;for(const side of [-1,1])for(let i=0;i<(low?12:28);i++){const x=-.23+((i*.618034)%1)*.56,angle=(.26+((i*.381966)%1)*.49)*Math.PI,len=.018+((i*.75488)%1)*.043,path=Array.from({length:low?4:7},(_,j)=>{const t=j/(low?3:6),b=profileAt(definitions.rissos_dolphin.body,x+(t-.5)*len),a=angle+(t-.5)*.18;return [b[0],b[1]+Math.cos(a)*b[2]+.0003,side*Math.sin(a)*(b[3]+.0005)];});faunaArt.tube(g,path,.00065,[.75,.79,.74],3);}
    const crease=Array.from({length:low?5:9},(_,i)=>{const y=mix(-.003,.105,i/(low?4:8));let a=.35,b=.5;for(let k=0;k<18;k++){const x=(a+b)*.5,p=profileAt(definitions.rissos_dolphin.body,x);if(p[1]+p[2]>y)a=x;else b=x;}return [(a+b)*.5+.0006,y,0];});faunaArt.tube(g,crease,.0011,[.27,.35,.36],4);
   }
  }
 };
 function thumbnail(sp){
  const d=definitions[sp.id],xy=p=>[(210+p[0]*330).toFixed(2),(135-p[1]*330).toFixed(2)].join(' '),path=points=>'M'+points.map(xy).join(' L')+' Z',upper=[],lower=[];
  for(let i=0;i<=64;i++){const p=profileAt(d.body,mix(d.body[0][0],d.body.at(-1)[0],i/64));upper.push([p[0],p[1]+p[2]]);lower.unshift([p[0],p[1]-p[2]]);}
  const outline=path(upper.concat(lower)),finPath=rows=>{const a=[],b=[];for(let i=0;i<=24;i++){const p=interpolate(rows,i/24);a.push([p[0]+p[3],p[1]]);b.unshift([p[0]-p[3],p[1]]);}return path(a.concat(b));};
  const pale=sp.id==='beluga',finColor=pale?'#becac5':sp.id==='white_sided_dolphin'?'#6c8992':'#29414a',bodyColor=sp.id==='commerson_dolphin'?'#dde2d9':pale?'#d3ded5':sp.id==='rissos_dolphin'?'#90a9a7':sp.id==='orca'?'#1e3039':sp.id==='false_killer_whale'?'#334851':'url(#body)';
  let pigment='';
  if(sp.id==='orca')pigment=`<path d="${path([[-.35,-.014],[-.20,-.055],[.05,-.05],[.26,-.035],[.49,-.018],[.5,-.18],[-.4,-.18]])}" fill="#d8dfd7"/><ellipse cx="308" cy="120" rx="18" ry="8" fill="#d8dfd7"/><ellipse cx="173" cy="105" rx="24" ry="15" fill="#657b7c"/>`;
  if(sp.id==='commerson_dolphin')pigment=`<path d="${path([[.235,.15],[.24,-.15],[.51,-.15],[.51,.15]])}" fill="#21323a"/><path d="${path([[-.51,.15],[-.25,.15],[-.225,-.15],[-.51,-.15]])}" fill="#21323a"/>`;
  if(sp.id==='common_dolphin')pigment=`<path d="${path([[.31,.03],[.18,.043],[-.08,-.013],[.20,-.049],[.36,-.025]])}" fill="#bba971"/><path d="${path([[-.39,.02],[-.08,-.013],[-.17,-.038],[-.39,-.022]])}" fill="#9aafb1"/>`;
  if(sp.id==='white_sided_dolphin')pigment=`<path d="${path([[-.35,.012],[-.19,.027],[.06,.053],[.32,.026],[.28,.012],[.05,.035],[-.19,.011]])}" fill="#d2ddd7"/>`;
  if(sp.id==='rissos_dolphin')for(let i=0;i<19;i++){const x=-.23+((i*.618)%1)*.55,y=-.015+((i*.382)%1)*.075;pigment+=`<path d="M${xy([x,y])} L${xy([x+.025,y+.012])}" stroke="#d9e2d7" stroke-width="1.3"/>`;}
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#304650"/><stop offset=".5" stop-color="#6f8a91"/><stop offset="1" stop-color="#d6dfd5"/></linearGradient><clipPath id="shape"><path d="${outline}"/></clipPath></defs><rect width="420" height="210" rx="8" fill="#0a303a"/><path d="M25 168 Q160 148 395 167" fill="none" stroke="#31515a"/>${d.dorsal?`<path d="${finPath(d.dorsal)}" fill="${finColor}"/>`:''}<path d="${finPath(d.flipper)}" fill="${finColor}"/><path d="${outline}" fill="${bodyColor}" stroke="#698385" stroke-width=".6"/><g clip-path="url(#shape)">${pigment}</g><path d="M46 132 Q21 115 35 131 Q12 146 49 138" fill="${finColor}"/><ellipse cx="${210+d.eyeX*330}" cy="${135-d.eyeY*330}" rx="2.1" ry="1.5" fill="#0e1d25"/><text x="20" y="192" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">${sp.en} · ORIGINAL MODEL</text></svg>`);
 }
 return {definitions,build,skin,profileAt,thumbnail,blend,soft,black,white,gray};
})();
const cetaceanEntries=[
 {id:'common_dolphin',name:'短吻真海豚',latin:'Delphinus delphis',en:'COMMON DOLPHIN',size:2.1,color:0xa99c63,zone:5,naturalSize:'NOAA 列全長約1.83–2.44 m；本模型2.1 m',hint:'細長身形、明顯吻部；黃褐前側斑與灰色後側形成沙漏紋。',detail:'短吻真海豚常結成社群，會在水面躍起。本模型保留適中長吻、深色背披與前後不同的側色；群游與訓練動作是本作編排。',source:'https://www.fisheries.noaa.gov/species/short-beaked-common-dolphin',sourceLabel:'NOAA Fisheries · Short-Beaked Common Dolphin',partnerProfile:{mouth:[.475,-.02,0],fin:[.125,-.059,.096],ride:[-.18,.12,0],swimSpeed:3.4,approachSpeed:6,turnRate:1.25},motionProfile:{cruiseSpeed:1.9,beat:5.5,surfacePeriod:19,depthSwing:.7},aquarium:{cost:3}},
 {id:'white_sided_dolphin',name:'太平洋白側海豚',latin:'Lagenorhynchus obliquidens',en:'WHITE-SIDED DOLPHIN',size:2.2,color:0x849a9f,zone:4,naturalSize:'NOAA 列成體約1.68–2.44 m；本模型2.2 m',hint:'短吻與較厚實身體，背鰭高而後彎；側面有淺色長帶。',detail:'太平洋白側海豚具有黑背、灰側與白腹，眼後到尾部的淺色帶是辨識線索。本作採此種輪廓，不與大西洋白側海豚混用。',source:'https://www.fisheries.noaa.gov/species/pacific-white-sided-dolphin',sourceLabel:'NOAA Fisheries · Pacific White-Sided Dolphin',partnerProfile:{mouth:[.48,-.018,0],fin:[.123,-.067,.108],ride:[-.18,.13,0],swimSpeed:3.3,approachSpeed:5.8,turnRate:1.18},motionProfile:{cruiseSpeed:1.8,beat:5,surfacePeriod:21,depthSwing:.8},aquarium:{cost:3}},
 {id:'commerson_dolphin',name:'康氏矮海豚',latin:'Cephalorhynchus commersonii',en:"COMMERSON'S DOLPHIN",size:1.45,color:0xb9c3bf,zone:4,naturalSize:'南美族群約1.2–1.5 m；本模型1.45 m',hint:'小巧鈍頭、黑頭白軀幹，背鰭和胸鰭末端圓潤。',detail:'康氏矮海豚的短鈍吻部、圓鰭與黑白分區不同於虎鯨。本模型參考南美冷水沿岸族群，這片暖水礁海沒有牠的自然族群。',source:'https://seaworld.org/animals/all-about/commersons-dolphins/characteristics/',sourceLabel:'SeaWorld · Commerson’s Dolphin Characteristics',partnerProfile:{mouth:[.477,-.02,0],fin:[.157,-.078,.119],ride:[-.20,.14,0],swimSpeed:2.6,approachSpeed:4.8,turnRate:1.45},motionProfile:{cruiseSpeed:1.5,beat:6,surfacePeriod:17,depthSwing:.6},aquarium:{cost:3}},
 {id:'orca',name:'虎鯨',latin:'Orcinus orca',en:'ORCA',size:7.2,color:0x253239,zone:7,naturalSize:'NOAA 列最大約9.75 m；本模型全長7.2 m',hint:'高聳背鰭、寬大胸鰭；黑白身體有白眼斑和背鰭後方鞍斑。',detail:'虎鯨具有高度社會性；各族群的外觀、獵物與行為並不一致。本模型保留雄性高背鰭的辨識輪廓；夥伴訓練與航線是遊戲設定。',source:'https://www.fisheries.noaa.gov/species/killer-whale',sourceLabel:'NOAA Fisheries · Killer Whale',partnerProfile:{mouth:[.47,-.02,0],fin:[.145,-.097,.15],ride:[-.15,.145,0],swimSpeed:2.5,approachSpeed:5,turnRate:.60},motionProfile:{cruiseSpeed:1.5,beat:2.2,surfacePeriod:33,depthSwing:1.4},aquarium:{cost:6}},
 {id:'beluga',name:'白鯨',latin:'Delphinapterus leucas',en:'BELUGA',size:4.2,color:0xd5d9ce,zone:3,naturalSize:'NOAA 列可達約4.88 m；本模型全長4.2 m',hint:'白色厚實身體、圓額與可見頸部，背上只有低隆脊。',detail:'成體白鯨轉為白色，沒有高背鰭，圓額與可活動頸部是辨識線索。牠自然生活在北極與亞北極冷水海域，不在這片暖水礁海形成野生族群。',source:'https://www.fisheries.noaa.gov/species/beluga-whale',sourceLabel:'NOAA Fisheries · Beluga Whale',partnerProfile:{mouth:[.48,-.026,0],fin:[.133,-.095,.126],ride:[-.18,.14,0],swimSpeed:2.2,approachSpeed:4.6,turnRate:.88},motionProfile:{cruiseSpeed:1.1,beat:2.7,surfacePeriod:28,depthSwing:1},aquarium:{cost:4}},
 {id:'false_killer_whale',name:'偽虎鯨',latin:'Pseudorca crassidens',en:'FALSE KILLER WHALE',size:5,color:0x354650,zone:7,naturalSize:'NOAA 列雌性可達4.88 m、雄性6.10 m；本模型5 m',hint:'細長深灰身體、無長吻的圓錐頭，胸鰭前緣有明顯彎折。',detail:'偽虎鯨的身體比虎鯨細長，背鰭後彎、胸鰭前緣呈 S 形，不具有虎鯨式白眼斑。牠會形成社群，主要捕食魚與魷魚。',source:'https://www.fisheries.noaa.gov/species/false-killer-whale',sourceLabel:'NOAA Fisheries · False Killer Whale',partnerProfile:{mouth:[.478,-.018,0],fin:[.174,-.058,.084],ride:[-.18,.11,0],swimSpeed:3,approachSpeed:5.5,turnRate:.75},motionProfile:{cruiseSpeed:1.7,beat:3.3,surfacePeriod:29,depthSwing:1.2},aquarium:{cost:5}},
 {id:'rissos_dolphin',name:'瑞氏海豚',latin:'Grampus griseus',en:"RISSO'S DOLPHIN",size:3.3,color:0x9daea8,zone:2,naturalSize:'NOAA 列全長约2.59–3.96 m；本模型3.3 m',hint:'無長吻的圓額、細尾柄與高鐮形背鰭，身上分布淺色刮痕。',detail:'瑞氏海豚隨年齡轉淡，成體常有大量自然刮痕；額前可見縱向凹溝。本版刮痕為原創線條，沒有複製特定個體或宣稱個體年齡。',source:'https://www.fisheries.noaa.gov/species/rissos-dolphin',sourceLabel:'NOAA Fisheries · Risso’s Dolphin',partnerProfile:{mouth:[.482,-.018,0],fin:[.145,-.077,.114],ride:[-.18,.13,0],swimSpeed:2.8,approachSpeed:5.2,turnRate:.96},motionProfile:{cruiseSpeed:1.4,beat:3.9,surfacePeriod:26,depthSwing:.9},aquarium:{cost:4}}
];
for(const entry of cetaceanEntries){faunaArt.builders[entry.id]=(g,low)=>cetaceanArt.build(g,cetaceanArt.definitions[entry.id],low);const sp=registerFauna({...entry,cetacean:true,modelUnitLength:1,bodyLength:1,traits:{motion:'cetacean',micro:false,feedable:false,grabbable:true,contactDistance:Math.max(3.5,entry.size*.68+1),observeDistance:45,targetRadius:entry.size*.18,viewDistance:entry.size*1.55},partnerProfile:{...entry.partnerProfile,length:entry.size}},CETACEAN_SPECIES);sp.thumb=cetaceanArt.thumbnail(sp);}
const legacyDolphinPartner=Object.freeze({mouth:[1.8,-.04,0],fin:[0,-.14,.65],ride:[-1.35,.45,0],length:4,swimSpeed:3.7,approachSpeed:12,turnRate:1.0});
function partnerTraits(indexOrIdOrSp){const sp=typeof indexOrIdOrSp==='number'?SPECIES[indexOrIdOrSp]:typeof indexOrIdOrSp==='string'?SPECIES.find(s=>s.id===indexOrIdOrSp):indexOrIdOrSp;return sp?.id==='dolphin'?legacyDolphinPartner:sp?.cetacean===true?sp.partnerProfile:null;}
