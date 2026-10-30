/* Four original reef fish: shared instancing, species-specific anatomy and
 * pigment, bounded warm-water encounters. References: REEF-FISH-REFERENCE.md.
 * Counts/routes are authored game content, never field-sighting records. */
const REEF_FISH_SPECIES=[];
const ReefFishArt=(()=>{
 const cream=[.88,.86,.75],ink=[.035,.045,.052],orange=[.90,.37,.11],gold=[.96,.72,.13],white=[.89,.88,.78],red=[.71,.18,.13];
 const forms={
  lyretail_anthias:{height:.145,width:.071,tail:.155,fork:true,color:orange,anchor:[-24,-23],heightAbove:2.7,radius:2.9,count:28,speed:.18},
  banggai_cardinal:{height:.18,width:.075,tail:.19,fork:true,color:cream,anchor:[16,10],heightAbove:.95,radius:.38,count:14,speed:.035},
  longnose_butterfly:{height:.235,width:.055,tail:.145,fork:false,color:gold,anchor:[25,-25],heightAbove:2.8,radius:2.1,count:8,speed:.14},
  fire_goby:{height:.075,width:.049,tail:.095,fork:false,color:white,anchor:[-4,20],heightAbove:.36,radius:.26,count:14,speed:.024}
 };
 function paint(id,p){
  const [x,y,z]=p;
  if(id==='lyretail_anthias'){const belly=clamp((.035-y)/.22,0,1);return orange.map((v,i)=>mix(v,[.96,.67,.31][i],belly*.65));}
  if(id==='banggai_cardinal'){
   const band=Math.min(Math.abs(x-.225+y*.08),Math.abs(x-.018),Math.abs(x+.215-y*.11));
   const spot=Math.sin(x*116+y*29)*Math.sin(y*127-z*21)>.79;
   return band<.047&&!spot?ink:cream;
  }
  if(id==='longnose_butterfly'){if(x>.17)return y>.005?ink:white;return gold;}
  const rear=clamp((.16-x)/.42,0,1);return white.map((v,i)=>mix(v,red[i],rear));
 }
 // One longitudinal skin joins the jaws, shoulder, trunk and peduncle. Each
 // section stores x, centre height, dorsal radius, ventral radius and width.
 // The terminal sections and tail edge deliberately retain the authored x
 // limits used by the pigment field, in both LODs.
 const profiles={
  lyretail_anthias:[[-.435,-.003,0,0,0],[-.405,-.002,.027,.027,.020],[-.34,0,.043,.046,.026],[-.25,.005,.085,.075,.044],[-.12,.009,.125,.113,.064],[.03,.009,.136,.133,.071],[.16,.002,.123,.119,.063],[.255,-.008,.083,.081,.043],[.315,-.015,.046,.052,.029],[.357,-.012,.020,.028,.017],[.382,-.013,0,0,0]],
  banggai_cardinal:[[-.435,-.004,0,0,0],[-.405,-.002,.029,.029,.019],[-.34,0,.055,.055,.028],[-.25,.009,.118,.103,.050],[-.12,.012,.163,.151,.069],[.035,.008,.172,.166,.075],[.16,.002,.151,.137,.066],[.255,-.009,.103,.089,.049],[.315,-.021,.060,.047,.034],[.359,-.025,.024,.025,.019],[.382,-.024,0,0,0]],
  longnose_butterfly:[[-.435,0,0,0,0],[-.405,0,.026,.026,.016],[-.33,.002,.095,.094,.027],[-.24,.009,.177,.174,.039],[-.10,.014,.221,.218,.052],[.065,.014,.221,.219,.055],[.18,.002,.185,.171,.048],[.255,-.013,.131,.114,.037],[.315,-.030,.072,.063,.026],[.39,-.040,.028,.025,.019],[.51,-.044,.017,.016,.013],[.609,-.045,.011,.010,.009],[.627,-.045,.007,.007,.006],[.636,-.045,0,0,0]],
  fire_goby:[[-.435,0,0,0,0],[-.405,0,.018,.018,.014],[-.29,0,.032,.035,.020],[-.12,.003,.058,.054,.039],[.06,.005,.068,.064,.049],[.22,.008,.059,.055,.047],[.30,.003,.043,.040,.034],[.355,-.007,.019,.022,.020],[.382,-.012,0,0,0]]
 };
 // Monotone Hermite sections keep the shoulder and snout smooth without
 // overshooting the explicit silhouette or making the narrow peduncle fold.
 const slopes={};
 for(const [id,rows] of Object.entries(profiles))slopes[id]=rows.map((row,i)=>row.map((_,k)=>{
  if(!k)return 1;
  if(!i)return (rows[1][k]-row[k])/(rows[1][0]-row[0]);
  if(i===rows.length-1)return (row[k]-rows[i-1][k])/(row[0]-rows[i-1][0]);
  const left=(row[k]-rows[i-1][k])/(row[0]-rows[i-1][0]),right=(rows[i+1][k]-row[k])/(rows[i+1][0]-row[0]);
  return left*right>0?2*left*right/(left+right):0;
 }));
 function section(id,x){
  const rows=profiles[id];let i=0;while(i<rows.length-2&&x>rows[i+1][0])i++;
  const a=rows[i],b=rows[i+1],h=b[0]-a[0],t=clamp((x-a[0])/h,0,1),t2=t*t,t3=t2*t;
  return [x,...[1,2,3,4].map(k=>(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*h*slopes[id][i][k]+(-2*t3+3*t2)*b[k]+(t3-t2)*h*slopes[id][i+1][k])];
 }
 function skinPoint(id,x,a){const s=section(id,x),v=Math.sin(a);return [x,s[1]+v*(v>=0?s[2]:s[3]),Math.cos(a)*s[4]];}
 function skinNormal(id,x,a){
  const rows=profiles[id],lo=rows[0][0],hi=rows[rows.length-1][0];if(x<=lo)return [-1,0,0];if(x>=hi)return [1,0,0];
  const dx=V.sub(skinPoint(id,Math.min(hi,x+.00001),a),skinPoint(id,Math.max(lo,x-.00001),a)),da=V.sub(skinPoint(id,x,a+.0001),skinPoint(id,x,a-.0001));return V.norm(V.cross(dx,da));
 }
 function emit(g,a,b,c,color){
  const face=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(face)<1e-11)return;
  if(V.dot(face,V.add(a.n,V.add(b.n,c.n)))<0)[b,c]=[c,b];
  g.tri(a.p,b.p,c.p,color,[a.n,b.n,c.n],[a.c||color,b.c||color,c.c||color]);
 }
 function body(g,id,low){
  const rows=profiles[id],xs=[],steps=low?2:3,around=low?12:28;g.tag=1;
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<steps;j++)xs.push(mix(rows[i][0],rows[i+1][0],j/steps));xs.push(rows[rows.length-1][0]);
  const rings=xs.map(x=>Array.from({length:around},(_,i)=>{const a=i/around*TAU,p=skinPoint(id,x,a);return {p,n:skinNormal(id,x,a),c:paint(id,p)};}));
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<around;i++){
   const next=(i+1)%around,a=rings[j][i],b=rings[j+1][i],c=rings[j+1][next],d=rings[j][next];emit(g,a,b,c,forms[id].color);emit(g,a,c,d,forms[id].color);
  }
  face(g,id,low);
 }
 function sidePoint(id,x,y,side,offset=0){
  const s=section(id,x),radius=y>=s[1]?s[2]:s[3],q=radius?(y-s[1])/radius:0;
  return [x,y,side*(s[4]*Math.sqrt(Math.max(0,1-q*q))+offset)];
 }
 function sideNormal(point,x,y,side){
  const dx=V.sub(point(x+.00001,y),point(x-.00001,y)),dy=V.sub(point(x,y+.00001),point(x,y-.00001));return V.mul(V.norm(V.cross(dx,dy)),side);
 }
 function face(g,id,low){
  g.tag=4;
  const long=id==='longnose_butterfly',goby=id==='fire_goby',cardinal=id==='banggai_cardinal',ex=long?.253:goby?.271:.269,ey=long?.052:goby?.029:.042,er=cardinal?.021:goby?.0145:.018;
  for(const side of [-1,1]){
   // A shallow corneal patch follows the head; the restrained iris is part of
   // that patch, rather than a pale eyeball sitting outside the fish.
   const point=(x,y)=>{const r=Math.hypot((x-ex)/er,(y-ey)/er);return sidePoint(id,x,y,side,.00065+.0032*Math.max(0,1-r*r));};
   const n=low?12:20,radii=[0,.57,.72,1],rings=radii.map(r=>Array.from({length:n},(_,i)=>{const a=i/n*TAU,x=ex+Math.cos(a)*er*r,y=ey+Math.sin(a)*er*r;return {p:point(x,y),n:sideNormal(point,x,y,side),c:r<.6?[.016,.021,.024]:r<.8?(cardinal?[.28,.24,.14]:[.29,.24,.15]):[.12,.13,.105]};}));
   for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){const next=(k+1)%n,a=rings[j][k],b=rings[j+1][k],c=rings[j+1][next],d=rings[j][next];emit(g,a,b,c,ink);emit(g,a,c,d,ink);}
   const mouth=long?[[.611,-.045],[.621,-.045],[.630,-.045],[.634,-.045]]:goby?[[.328,-.021],[.348,-.019],[.365,-.015],[.379,-.012]]:cardinal?[[.310,-.039],[.339,-.034],[.363,-.029],[.379,-.024]]:[[.316,-.029],[.343,-.025],[.363,-.019],[.379,-.013]];
   lineOnSkin(g,id,side,mouth,long?.0008:.0011,[.095,.083,.062],low);
   const s=section(id,long?.184:goby?.205:.181),x=long?.184:goby?.205:.181;
   lineOnSkin(g,id,side,[[x+.006,s[1]+s[2]*.64],[x-.013,s[1]+s[2]*.22],[x-.010,s[1]-s[3]*.27],[x+.029,s[1]-s[3]*.67]],goby?.00065:.00095,long?[.16,.15,.10]:[.24,.19,.12],low);
  }
 }
 // Shape-preserving cubic margins keep a swept fin smooth without folding
 // back over its neighbouring section at a narrow ray or rounded tip.
 function curve(points,t){
  const q=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(q)),u=q-i,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)],tangent=(l,r)=>l*r>0?2*l*r/(l+r):0;
  return b.map((v,k)=>{const delta=c[k]-v,m0=i===0?delta:tangent(v-a[k],delta),m1=i===points.length-2?delta:tangent(delta,d[k]-c[k]);return (2*u*u*u-3*u*u+1)*v+(u*u*u-2*u*u+u)*m0+(-2*u*u*u+3*u*u)*c[k]+(u*u*u-u*u)*m1;});
 }
 function lineOnSkin(g,id,side,points,width,color,low){
  const n=low?8:16,point=(x,y)=>sidePoint(id,x,y,side,.00055),rows=[];
  for(let i=0;i<=n;i++){const t=i/n,p=curve(points,t),before=curve(points,Math.max(0,t-.001)),after=curve(points,Math.min(1,t+.001)),d=V.norm([after[0]-before[0],after[1]-before[1],0]),w=width*(.35+.65*Math.sin(Math.PI*t));rows.push([-1,1].map(sign=>{const x=p[0]-d[1]*w*sign,y=p[1]+d[0]*w*sign;return {p:point(x,y),n:sideNormal(point,x,y,side)};}));}
  for(let i=0;i<n;i++){emit(g,rows[i][0],rows[i+1][0],rows[i+1][1],color);emit(g,rows[i][0],rows[i+1][1],rows[i][1],color);}
 }
 function membrane(g,root,edge,color,tag,low,camber=.003,span=16){
  g.tag=tag;const n=low?Math.max(6,Math.round(span*.4)):span,m=low?2:3;
  const point=(t,u,side)=>{
   const p=V.lerp(root(t),edge(t),u),taper=Math.sin(Math.PI*t);p[2]+=camber*taper*Math.sin(Math.PI*u)+side*taper*(.00065*(1-u)+.00018);return p;
  };
  const normal=(t,u,side)=>{
   // Evaluate away from the collapsed end of a fin for a stable shared normal.
   const tt=clamp(t,.0001,.9999),uu=clamp(u,.0001,.9999),dt=V.sub(point(Math.min(1,tt+.0001),uu,side),point(Math.max(0,tt-.0001),uu,side)),du=V.sub(point(tt,Math.min(1,uu+.0001),side),point(tt,Math.max(0,uu-.0001),side));let n=V.norm(V.cross(dt,du));if(n[2]<0)n=V.mul(n,-1);return V.mul(n,side);
  };
  const sheets=[-1,1].map(side=>Array.from({length:n+1},(_,i)=>Array.from({length:m+1},(_,j)=>({p:point(i/n,j/m,side),n:normal(i/n,j/m,side)}))));
  for(const sheet of sheets)for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=sheet[i][j],b=sheet[i+1][j],c=sheet[i+1][j+1],d=sheet[i][j+1];emit(g,a,b,c,color);emit(g,a,c,d,color);}
  // Join only the perimeter. Interior subdivisions share their vertices and
  // smooth normals, avoiding the old stack of separately extruded fin panels.
  const wall=(a,b,c,d,outward)=>{const cross=V.cross(V.sub(b,a),V.sub(c,a));let n=V.len(cross)>1e-12?V.norm(cross):faceNormal(a,c,d);if(V.dot(n,outward)<0)n=V.mul(n,-1);const A={p:a,n},B={p:b,n},C={p:c,n},D={p:d,n};emit(g,A,B,C,color);emit(g,A,C,D,color);};
  for(let i=0;i<n;i++)for(const j of [0,m]){const t=(i+.5)/n,u=j/m,outward=V.sub(point(t,u,0),point(t,u===0?.001:.999,0));wall(sheets[0][i][j].p,sheets[0][i+1][j].p,sheets[1][i+1][j].p,sheets[1][i][j].p,outward);}
 }
 function median(g,id,low,x0,x1,edgePoints,color,bottom=false,span=18){
  const outline=t=>curve(edgePoints,t),root=t=>{const x=clamp(outline(t)[0],Math.min(x0,x1),Math.max(x0,x1)),s=section(id,x);return [x,s[1]+(bottom?-s[3]+.003:s[2]-.003),0];};
  const edge=t=>{const p=outline(t),s=section(id,p[0]),limit=s[1]+(bottom?-s[3]+.001:s[2]-.001);return [p[0],bottom?Math.min(limit,p[1]):Math.max(limit,p[1]),0];};membrane(g,root,edge,color,3.2,low,.0022,span);
 }
 function fins(g,id,low){
  const f=forms[id],cardinal=id==='banggai_cardinal',goby=id==='fire_goby',long=id==='longnose_butterfly',peduncle=goby?.014:long?.021:.023;
  const tailRoot=t=>[-.405,(2*t-1)*peduncle,0],tailEdge=t=>{const v=2*t-1;return [f.fork?-.665+.155*(1-Math.pow(Math.abs(v),.7)):-.57-.073*Math.sqrt(Math.max(0,1-v*v)),v*f.tail,0];};
  membrane(g,tailRoot,tailEdge,cardinal?cream:goby?red:f.color,3.1,low,.004,20);
  const top=x=>{const s=section(id,x);return s[1]+s[2];},bottom=x=>{const s=section(id,x);return s[1]-s[3];};
  if(cardinal){
   median(g,id,low,.205,-.025,[[.205,top(.205)-.002],[.148,.320],[.105,.429],[.043,.452],[.014,.331],[-.025,top(-.025)-.002]],ink,false,24);
   median(g,id,low,-.041,-.35,[[-.041,top(-.041)-.002],[-.111,.330],[-.235,.289],[-.334,.215],[-.35,top(-.35)-.002]],cream,false,20);
   median(g,id,low,.022,-.36,[[.022,bottom(.022)+.002],[-.075,-.259],[-.161,-.321],[-.281,-.249],[-.340,-.178],[-.36,bottom(-.36)+.002]],ink,true,20);
  }else if(goby){
   median(g,id,low,.035,-.335,[[.035,top(.035)-.002],[-.054,.103],[-.179,.106],[-.286,.072],[-.335,top(-.335)-.002]],white,false,18);
   median(g,id,low,.215,.036,[[.215,top(.215)-.002],[.165,.165],[.131,.350],[.111,.369],[.094,.153],[.036,top(.036)-.002]],white,false,24);
   median(g,id,low,.155,-.335,[[.155,bottom(.155)+.002],[.049,-.084],[-.124,-.101],[-.278,-.065],[-.335,bottom(-.335)+.002]],red,true,18);
  }else if(long){
   median(g,id,low,.233,-.337,[[.233,top(.233)-.002],[.142,.289],[-.007,.322],[-.175,.281],[-.290,.168],[-.337,top(-.337)-.002]],gold,false,22);
   median(g,id,low,.202,-.338,[[.202,bottom(.202)+.002],[.089,-.259],[-.091,-.284],[-.237,-.224],[-.319,-.116],[-.338,bottom(-.338)+.002]],gold,true,22);
  }else{
   median(g,id,low,.251,-.322,[[.251,top(.251)-.002],[.174,.176],[.115,.267],[.053,.290],[.032,.211],[-.097,.198],[-.243,.146],[-.322,top(-.322)-.002]],orange,false,28);
   median(g,id,low,.160,-.319,[[.160,bottom(.160)+.002],[.054,-.158],[-.106,-.172],[-.247,-.112],[-.319,bottom(-.319)+.002]],orange,true,18);
  }
  for(const side of [-1,1]){
   // Parallel swept chords produce a curved fan without crossing one another.
   // Both ends converge on the skin, with the entire hinge slightly inset.
   const root=t=>{const s=section(id,.146),y=s[1]-s[3]*mix(.12,.47,t);return sidePoint(id,.146,y,side,-.004);};
   const edge=t=>V.add(root(t),V.mul([-.215,-f.height*.45,side*f.width*.68],Math.sin(Math.PI*t)));
   membrane(g,root,edge,cardinal?cream:f.color,3,low,side*.006,16);
   const pelvicRoot=t=>{const s=section(id,.055),y=s[1]-s[3]*mix(.80,.95,t);return sidePoint(id,.055,y,side,-.003);};
   const pelvicEdge=t=>V.add(pelvicRoot(t),V.mul([-.170,-f.height*.48,side*f.width*.28],Math.sin(Math.PI*t)));
   membrane(g,pelvicRoot,pelvicEdge,cardinal?ink:f.color,3,low,side*.002,12);
  }
 }
 function build(id,g,low){g.material=6;body(g,id,low);fins(g,id,low);g.tag=1;}
 function thumbnail(sp){
  const id=sp.id,f=forms[id],fill='#'+sp.color.toString(16).padStart(6,'0'),round=!f.fork;
  const details=id==='banggai_cardinal'?'<path d="M147 78L160 136M189 67L195 146M224 73L229 139" stroke="#24383b" stroke-width="13"/><path d="M169 73L178 25 201 70M208 74L230 36 257 79M204 139L232 174 246 130" fill="#d5d4bf" stroke="#304548" stroke-width="3"/>':id==='fire_goby'?'<path d="M173 94L179 27 196 89" fill="#e8e3cb"/><path d="M229 89Q256 94 269 111L243 137 215 144Z" fill="#b83b2d"/>':id==='longnose_butterfly'?'<path d="M129 100L75 110 128 117Z" fill="#e9e3c8"/><path d="M129 100Q137 67 161 71L159 111Z" fill="#21373b"/><circle cx="236" cy="139" r="9" fill="#253a3a"/>':'<path d="M182 78L195 52 201 77" fill="#df8860"/>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#0a303a"/><path d="M271 109L325 72'+(round?'Q342 111 325 150':'L300 112 325 150')+'L265 127Z" fill="'+fill+'"/><ellipse cx="197" cy="109" rx="76" ry="'+(id==='longnose_butterfly'?54:id==='fire_goby'?28:42)+'" fill="'+fill+'"/>'+details+'<circle cx="144" cy="103" r="7" fill="#ebdfb6"/><circle cx="143" cy="103" r="4" fill="#1b3035"/><text x="20" y="192" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">'+sp.en+' · ORIGINAL ART</text></svg>');
 }
 return {forms,paint,build,thumbnail};
})();
const reefFishEntries=[
 {id:'lyretail_anthias',name:'金背花鱸',latin:'Pseudanthias squamipinnis · 類群造型',en:'LYRETAIL ANTHIAS',color:0xe69638,size:.15,hint:'橙金色的側身、月形叉尾與稍長的背鰭棘。',detail:'花鱸類常在礁坡上方聚集、捕食浮游動物。本作用橙金色的原創造型與小群路徑呈現；分類與分布存在研究差異，不作臺灣現地紀錄或性別辨識依據。',source:'https://australian.museum/learn/animals/fishes/orange-basslet-pseudanthias-squamipinnis/'},
 {id:'banggai_cardinal',name:'邦蓋天竺鯛',latin:'Pterapogon kauderni',en:'BANGGAI CARDINALFISH',color:0xd9d5bf,size:.086,hint:'銀白身體的三道黑帶、白色小點、深叉尾與延長鰭條。',detail:'邦蓋天竺鯛原生於印尼邦蓋群島附近，常見於受遮蔽的淺水棲地。這裡的群體是歸潮海域的原創展示配置，不代表牠廣泛分布在其他礁區。',source:'https://www.fisheries.noaa.gov/species/banggai-cardinalfish'},
 {id:'longnose_butterfly',name:'長吻蝶魚',latin:'Forcipiger flavissimus',en:'YELLOW LONGNOSE BUTTERFLYFISH',color:0xf2c044,size:.20,hint:'薄薄的黃色側身、鑷子般長吻、黑白頭部及臀鰭黑斑。',detail:'長吻可以伸入礁縫取食小型無脊椎動物。靠近觀察時，留意黑色上半頭、白色下半頭，以及尾柄前下方的黑斑；模型與遭遇路線為原創遊戲近似。',source:'https://australian.museum/learn/animals/fishes/forceps-fish-forcipiger-flavissimus/'},
 {id:'fire_goby',name:'雷達魚',latin:'Nemateleotris magnifica',en:'FIRE GOBY',color:0xe6d6bf,size:.08,hint:'白色前身逐漸轉成橙紅後身，第一背鰭像細長旗幟，尾鰭圓潤。',detail:'雷達魚會在礁坡洞口上方懸停，受到驚擾時可退入洞中。這一版呈現洞口附近的小幅巡游與特長第一背鰭；群數與高度是遊戲編排。',source:'https://australian.museum/learn/animals/fishes/nemateleotris-magnifica-fowler-1938/'}
];
for(const entry of reefFishEntries){
 faunaArt.builders[entry.id]=(g,low)=>ReefFishArt.build(entry.id,g,low);
 const sp=registerFauna({...entry,reefFish:true,zone:0,renderKind:1,bodyLength:1,naturalSize:'本作代表個體全長 '+Math.round(entry.size*1000)+' mm',traits:{motion:'swim',micro:false,feedable:true,contactDistance:1.2,observeDistance:5,targetRadius:entry.size*.60,viewDistance:Math.max(.6,entry.size*5.5)},materialProfile:{skin:'fish',roughness:.43,subsurface:.035,patternScale:100}},REEF_FISH_SPECIES);sp.thumb=ReefFishArt.thumbnail(sp);
}
const reefFishPaths=new WeakMap();
function reefFishRadius(f){
 const home=f.home||f.center,sp=SPECIES[f.species],size=f.s[0],cached=reefFishPaths.get(f);
 if(cached&&cached.size===size&&cached.requested===f.radius&&cached.obstacles===obstacles.length&&cached.home[0]===home[0]&&cached.home[1]===home[1]&&cached.home[2]===home[2])return cached.radius;
 const bounds=sp.modelBounds,reach=size*Math.hypot(Math.max(Math.abs(bounds.min[0]),Math.abs(bounds.max[0])),Math.max(Math.abs(bounds.min[2]),Math.abs(bounds.max[2])))+.08,vertical=size*Math.max(Math.abs(bounds.min[1]),Math.abs(bounds.max[1]))+.12;
 let radius=f.radius;
 // Reserve a complete route envelope once. A moving candidate obstacle must
 // never make a small fish jump vertically as it crosses a bucket boundary.
 for(const ob of obstacles){if(ob.p[1]+ob.s[1]<home[1]-vertical||ob.p[1]-ob.s[1]>home[1]+vertical)continue;radius=Math.min(radius,Math.max(0,Math.hypot(home[0]-ob.p[0],home[2]-ob.p[2])-Math.max(ob.s[0],ob.s[2])-reach));}
 reefFishPaths.set(f,{home:home.slice(),size,requested:f.radius,obstacles:obstacles.length,radius});return radius;
}
function reefFishMotionPose(f,time,out=f.p,context=null){
 const sp=SPECIES[f.species],form=ReefFishArt.forms[sp.id],home=f.home||f.center,radius=context?.exhibit?Math.min(f.radius,sp.size*2):reefFishRadius(f),omega=form.speed/Math.max(.1,radius),a=time*omega+f.phase,c=Math.cos(a),s=Math.sin(a),c2=Math.cos(a*.73+f.phase*.2),s2=Math.sin(a*.73+f.phase*.2);
 out[0]=home[0]+c*radius;out[2]=home[2]+s2*radius*.58;out[1]=home[1]+Math.sin(a*.63)*Math.min(.16,sp.size*.36);
 // Slope residents own a complete certified motion envelope. Reapplying a
 // single center-height guard would alter that path on the steep floor.
 if(!context?.exhibit&&!f.slopeHabitat)out[1]=Math.max(out[1],groundHeight(out[0],out[2])+form.heightAbove*.55+sp.size*.25);
 const dx=-s*radius*omega,dz=c2*radius*.58*.73*omega,dy=Math.cos(a*.63)*Math.min(.16,sp.size*.36)*.63*omega;
 f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.12,.12);f.bank=Math.sin(a*.51)*.045;f.effort=.48;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeReefFish=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){return SPECIES[f.species]?.reefFish?reefFishMotionPose(f,time,out,context):poseBeforeReefFish(f,time,out,context);};
const spawnBeforeReefFish=addLife;
addLife=function(renderer){
 spawnBeforeReefFish(renderer);
 ensureReefFish(renderer);
};
// The published geometry archive stays compatible: a small, shared model pool
// is appended at boot. A future full bake may already contain these same actors.
function ensureReefFish(renderer){
 if(life.some(f=>f.reefFish||SPECIES[f.species]?.reefFish))return false;
 for(const sp of REEF_FISH_SPECIES){const form=ReefFishArt.forms[sp.id],high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[],index=SPECIES.indexOf(sp);
  for(let k=0;k<form.count;k++){const base=FaunaWorldRules.place({anchor:form.anchor,support:null},k),home=[base[0],base[1]+form.heightAbove,base[2]],phase=k*2.399963+.37;
   const f={fauna:true,reefFish:true,species:index,p:home.slice(),home,center:home.slice(),homeYaw:0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:form.radius,height:form.heightAbove,phase,orbit:phase,bob:phase,speed:form.speed,yaw:0,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};reefFishMotionPose(f,0);actors.push(f);life.push(f);
  }
  FaunaWorldRules.appendSlopeActors(sp,actors);
  const hi=renderer.batch(high,actors,1,true);hi.maxDistance=8;hi.sceneRole='reef-fish-expansion';
  const lo=renderer.batch(low,actors,1,true);lo.minDistance=8;lo.maxDistance=70;lo.shadow=false;lo.sceneRole='reef-fish-expansion';
 }
 allLife=life.concat(decorLife);
 return true;
}
// A normal chart destination, never a teleport or an automatic species label.
// Append after the established regions so all previous landmark indices stay.
LANDMARKS.push({id:'mesophotic-slope',name:'東岸微光岩坡',en:'THE TWILIGHT SLOPE',x:274,y:-62,z:-180,radius:10,spawn:[274,-62,-180],yaw:-Math.PI/2,pitch:-.08,text:'沿著東岸岩坡向下探索，放慢速度觀察岩面附近的生物。',note:'原創西太平洋微光帶配置；物種深度有文獻依據，位置與數量不是現地調查。'});
