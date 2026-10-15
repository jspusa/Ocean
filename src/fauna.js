/* Original, metre-scaled fauna. Museum/research references and measurement
 * definitions live in docs/parity/FAUNA-REFERENCE.md. Interaction distances,
 * population, placement and close-view eligibility are authored game rules.
 * New geometry: kind 8, +X anterior, +Y up; tags 1 body / 3 fin / 4 eye / 5 appendage / 7 nautilus shell. */
const FAUNA_SPECIES=[];
function speciesTraits(indexOrId){
 const sp=typeof indexOrId==='number'?SPECIES[indexOrId]:typeof indexOrId==='string'?SPECIES.find(s=>s.id===indexOrId):indexOrId;
 if(sp?.fauna)return sp.traits;
 const index=sp?SPECIES.indexOf(sp):-1,large=index>=8&&index<=11;
 return {motion:'swim',micro:false,feedable:index>=0&&index<8,grabbable:large,contactDistance:index===10?12:index===11?5.2:large?4:2.8,observeDistance:index===10?80:20,targetRadius:index===10?4:index===11?1:large?.85:.35,viewDistance:index===10?24:index===11?5:large?4:1.8,floorOffset:0};
}
const faunaArt=(()=>{
 const cache=new Map(),dark=[.025,.032,.036],cream=[.87,.83,.68];
 // Nondegenerate triangles with independently evaluated smooth normals. Existing
 // Geometry.sphere includes pole degeneracies; these small meshes omit those.
 function tri(g,a,b,c,col,ns=null){if(V.len(V.cross(V.sub(b,a),V.sub(c,a)))>1e-11)g.tri(a,b,c,col,ns);}
 function ellipsoid(g,center,r,color,seg=24,rings=14){
  const point=(u,v)=>{const a=u*TAU,b=v*Math.PI,n=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];return {p:n.map((x,i)=>center[i]+x*r[i]),n:V.norm(n.map((x,i)=>x/r[i]))};};
  for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const a=point(i/seg,j/rings),b=point((i+1)/seg,j/rings),c=point((i+1)/seg,(j+1)/rings),d=point(i/seg,(j+1)/rings),col=typeof color==='function'?color(V.mul(V.add(a.p,c.p),.5)):color;tri(g,a.p,c.p,b.p,col,[a.n,c.n,b.n]);tri(g,a.p,d.p,c.p,col,[a.n,d.n,c.n]);}
 }
 function tube(g,points,radius,color,sides=8){
  const rings=points.map((p,i)=>{const tangent=V.norm(V.sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)])),u=V.norm(V.cross(tangent,Math.abs(tangent[2])>.9?[0,1,0]:[0,0,1])),v=V.cross(tangent,u),r=typeof radius==='function'?radius(i/(points.length-1)):radius;return Array.from({length:sides},(_,k)=>{const n=V.add(V.mul(u,Math.cos(k*TAU/sides)),V.mul(v,Math.sin(k*TAU/sides)));return {p:V.add(p,V.mul(n,r)),n};});});
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<sides;k++){const a=rings[i][k],b=rings[i][(k+1)%sides],c=rings[i+1][(k+1)%sides],d=rings[i+1][k],col=typeof color==='function'?color((i+.5)/(rings.length-1)):color;tri(g,a.p,b.p,c.p,col,[a.n,b.n,c.n]);tri(g,a.p,c.p,d.p,col,[a.n,c.n,d.n]);}
  for(const end of [0,rings.length-1])for(let k=0;k<sides;k++)tri(g,points[end],rings[end][k].p,rings[end][(k+1)%sides].p,typeof color==='function'?color(end?1:0):color);
 }
 // Interpolate only organic curves that need it. Jointed legs and straight fin
 // rays keep their original tubes; each authored attachment point stays fixed.
 function curvePoints(points,subdivisions){
  const result=[];
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],before=points[i-1]||V.sub(V.mul(a,2),b),after=points[i+2]||V.sub(V.mul(b,2),a),m0=V.mul(V.sub(b,before),.5),m1=V.mul(V.sub(after,a),.5);
   for(let j=0;j<subdivisions;j++){const t=j/subdivisions,t2=t*t,t3=t2*t;result.push(a.map((v,k)=>(2*t3-3*t2+1)*v+(t3-2*t2+t)*m0[k]+(-2*t3+3*t2)*b[k]+(t3-t2)*m1[k]));}
  }
  result.push(points.at(-1).slice());return result;
 }
 function fin(g,root,edge,color,thickness=.003){
  // Opposing surfaces plus edge walls: thin fins remain visible on either side.
  for(let i=0;i<edge.length-1;i++){
   const a=root[i],b=root[i+1],c=edge[i+1],d=edge[i],n=V.mul(faceNormal(a,b,c),thickness),front=[a,b,c,d].map(p=>V.add(p,n)),back=[a,b,c,d].map(p=>V.sub(p,n)),col=side=>typeof color==='function'?color(i,side):color;
   tri(g,front[0],front[1],front[2],col(1));tri(g,front[0],front[2],front[3],col(1));tri(g,back[0],back[2],back[1],col(-1));tri(g,back[0],back[3],back[2],col(-1));
   for(const [u,v] of [[0,1],[2,3],...(i===0?[[3,0]]:[]),...(i===edge.length-2?[[1,2]]:[])]){tri(g,front[u],back[u],back[v],col(1));tri(g,front[u],back[v],front[v],col(1));}
  }
 }
 function eye(g,p,r,low){const tag=g.tag;g.tag=4;ellipsoid(g,p,[r,r,r*.7],cream,low?8:14,low?5:9);ellipsoid(g,[p[0]+r*.22,p[1],p[2]+Math.sign(p[2])*r*.55],[r*.64,r*.70,r*.30],dark,low?7:12,low?4:8);g.tag=tag;}
 function seahorse(g,low){
  const pink=[.69,.42,.48],red=[.63,.19,.28],n=low?12:24;
  ellipsoid(g,[-.045,.54,0],[.145,.25,.115],pink,n,low?9:16);
  tube(g,curvePoints([[-.065,.34,0],[-.16,.23,0],[-.18,.115,0],[-.10,.045,0],[.025,.05,0],[.10,.135,0],[.045,.21,0],[-.015,.18,0]],low?2:4),t=>.046*(1-t*.85),t=>Math.floor(t*12)%2?pink:red,low?7:11);
  tube(g,curvePoints([[-.08,.65,0],[-.11,.76,0],[.025,.84,0],[.15,.84,0]],low?2:4),t=>.065-.02*t,pink,low?8:14);
  ellipsoid(g,[.13,.845,0],[.115,.087,.082],pink,n,low?7:12);tube(g,[[.20,.819,0],[.315,.80,0]],.030,pink,low?8:14);ellipsoid(g,[.32,.80,0],[.008,.019,.021],dark,8,6);
  for(const s of [-1,1]){eye(g,[.17,.867,s*.065],.018,low);ellipsoid(g,[.10,.903,s*.044],[.038,.035,.030],red,low?7:12,low?5:8);}
  // Polyp-like tubercles, short snout and a curled prehensile tail identify H. bargibanti.
  for(let i=0;i<(low?14:30);i++){const a=i*2.399963,t=.14+.72*((i*.618033)%1),b=t*Math.PI,p=[-.045+Math.cos(a)*Math.sin(b)*.145,.54+Math.cos(b)*.25,Math.sin(a)*Math.sin(b)*.115];ellipsoid(g,p,[.023,.028,.023],red,low?6:9,low?4:6);}
  g.tag=3;fin(g,[[-.17,.48,0],[-.18,.56,0],[-.17,.64,0]],[[-.26,.49,.006],[-.28,.57,.005],[-.21,.64,0]],[.77,.57,.60]);g.tag=1;
 }
 function slug(g,low){
  const purple=[.52,.24,.69],white=[.90,.88,.84],orange=[.95,.57,.13];
  ellipsoid(g,[0,.060,0],[.50,.060,.133],[.47,.22,.54],low?18:36,low?8:14);
  ellipsoid(g,[0,.135,0],[.46,.11,.176],p=>{const rim=Math.abs(p[2])/.176,edge=Math.abs(p[0])/.46;return rim>.87||edge>.94?white:rim>.73&&Math.sin(p[0]*90+p[2]*130)>.25?white:purple;},low?24:52,low?12:24);
  // A low, continuous mantle edge, two lamellate rhinophores at the head.
  g.tag=3;const oval=Array.from({length:low?25:53},(_,i)=>{const a=i/(low?24:52)*TAU;return [.465*Math.cos(a),.121+.008*Math.sin(a*7),.173*Math.sin(a)]});tube(g,oval,.010,white,low?5:7);
  g.tag=5;for(const side of [-1,1]){tube(g,[[.28,.21,side*.075],[.29,.31,side*.078],[.27,.395,side*.086]],t=>.019-t*.009,t=>t>.34?orange:[.34,.09,.52],low?7:10);for(let i=0;i<(low?3:7);i++)ellipsoid(g,[.289-i*.002,.316+i*.010,side*(.078+i*.001)],[.025-i*.001,.007,.019-i*.001],orange,low?6:9,4);}
  // Seven feathery gill branches form the posterior crown, separate from the head.
  for(let i=0;i<7;i++){const a=i/7*TAU,base=[-.26,.21,0],tip=[-.26+Math.cos(a)*.095,.42-.035*Math.sin(a),Math.sin(a)*.086];tube(g,[base,V.lerp(base,tip,.5),tip],t=>.016*(1-t*.84),orange,low?5:7);if(!low)for(let j=1;j<5;j++){const c=V.lerp(base,tip,j/5);for(const side of [-1,1])tube(g,[c,V.add(c,[side*.025,.027,side*.024])],t=>.006*(1-t*.85),orange,4);}}
 }
 function eel(g,low){
  const steps=low?18:40,points=Array.from({length:steps+1},(_,i)=>{const t=i/steps;return [.13*t*t-.10*Math.sin(t*Math.PI),t*.975,0]});
  tube(g,points,t=>.0155+.002*Math.sin(t*Math.PI),[.76,.75,.63],low?8:12);
  ellipsoid(g,[.13,.970,0],[.025,.03,.020],[.76,.75,.63],low?10:16,low?7:10);
  // Fine dark spotting and conspicuous larger shoulder/side patches.
  for(let i=0;i<(low?16:62);i++){const t=.05+.88*((i*.618034)%1),a=i*2.399963,x=.13*t*t-.10*Math.sin(t*Math.PI),r=.0168;ellipsoid(g,[x+Math.cos(a)*r,t*.975,Math.sin(a)*r],[.0028,.0045,.0028],[.10,.105,.088],low?5:6,4);}
  for(const side of [-1,1]){eye(g,[.144,.98,side*.015],.006,low);for(const t of [.30,.66,.91])ellipsoid(g,[.13*t*t-.10*Math.sin(t*Math.PI),t*.975,side*.0165],[.008,.017,.0028],[.10,.11,.09],low?6:10,low?4:6);}
  tube(g,[[.151,.964,-.010],[.154,.961,0],[.151,.964,.010]],.002,dark,5);
  g.tag=3;for(const side of [-1,1])fin(g,[[.09,.87,side*.012],[.10,.91,side*.012]],[[.066,.86,side*.045],[.07,.905,side*.043]],[.67,.67,.51],.001);
 }
 function shrimp(g,low){
  const white=[.88,.85,.73],red=[.76,.17,.12],gold=[.79,.73,.30],n=low?12:22;
  ellipsoid(g,[.105,.19,0],[.245,.12,.10],p=>p[0]>.20||p[0]<-.02?white:red,n,low?8:13);
  for(let i=0;i<6;i++){const x=-.12-i*.063,y=.155-.032*Math.sin(i/5*Math.PI);ellipsoid(g,[x,y,0],[.063,.092-i*.007,.083-i*.007],i%2?white:red,low?10:16,low?6:10);}
  g.tag=3;for(const side of [-1,1])ellipsoid(g,[-.493,.123,side*.059],[.094,.021,.066],red,low?9:16,low?5:8);ellipsoid(g,[-.507,.128,0],[.09,.024,.035],white,low?9:16,6);
  g.tag=1;for(const side of [-1,1]){tube(g,[[.265,.235,side*.044],[.30,.27,side*.061]],.013,white,7);eye(g,[.306,.271,side*.061],.014,low);}
  tube(g,[[.30,.235,0],[.395,.245,0]],t=>.014*(1-t*.9),white,low?5:8);
  g.tag=5;for(const side of [-1,1]){
   for(let i=0;i<4;i++){const x=.13-i*.092,z=side*(.19+(i%2)*.015);tube(g,[[x,.15,side*.065],[x+.035,.085,z],[x-.038,.008,side*.24]],t=>.012-t*.007,t=>t>.5?gold:white,low?5:7);}
   for(let i=0;i<2;i++)tube(g,[[.29,.23,side*.034],[.43,.265,side*(.11+i*.07)],[.74,.23,side*(.23+i*.14)],[.88,.19,side*(.30+i*.13)]],t=>.007*(1-t*.85),white,low?4:6);
   const major=side===1,k=major?1:.55,c=[major?.45:.43,.13,side*.20];tube(g,[[.18,.14,side*.07],[.27,.12,side*.19],c],t=>.024+.020*t,red,low?6:9);ellipsoid(g,c,[.15*k,.073*k,.086*k],white,n,low?7:11);ellipsoid(g,[c[0]-.012,c[1]+.002,c[2]],[.030*k,.075*k,.088*k],red,low?10:16,8);
   tube(g,[[c[0]+.10*k,.13,c[2]-.045*k],[c[0]+.235*k,.12,c[2]-.043*k],[c[0]+.24*k,.12,c[2]-.002*k]],t=>.025*k*(1-t*.70),white,low?6:9);
   tube(g,[[c[0]+.08*k,.13,c[2]+.053*k],[c[0]+.20*k,.12,c[2]+.05*k],[c[0]+.24*k,.12,c[2]+.018*k]],t=>.025*k*(1-t*.7),red,low?6:9);
  }
 }
 function frogfish(g,low){
  const ochre=[.72,.43,.18],pale=[.81,.62,.34],spot=[.34,.17,.075],paint=p=>{const blot=Math.sin(p[0]*33+p[1]*7)*Math.sin(p[1]*27-p[2]*23);return blot>.60?spot:blot<-.67?pale:ochre;};
  ellipsoid(g,[-.035,.30,0],[.33,.29,.235],paint,low?16:32,low?11:20);ellipsoid(g,[.25,.34,0],[.20,.24,.225],paint,low?16:28,low?10:18);
  ellipsoid(g,[.429,.295,0],[.016,.13,.152],[.16,.085,.052],low?14:24,low?9:16);
  const lips=Array.from({length:low?17:33},(_,i)=>{const a=i/(low?16:32)*TAU;return [.436+.006*Math.sin(a),.295+Math.cos(a)*.137,Math.sin(a)*.161]});tube(g,lips,.015,pale,low?6:9);
  for(const side of [-1,1]){eye(g,[.332,.485,side*.17],.027,low);g.tag=3;tube(g,[[.055,.18,side*.20],[.15,.07,side*.29],[.265,.019,side*.32]],t=>.038-t*.01,ochre,low?7:10);for(let k=0;k<5;k++)tube(g,[[.18,.046,side*.30],[.27+k*.012,.012,side*(.26+k*.03)]],t=>.017*(1-t*.65),pale,low?5:7);}
  g.tag=3;fin(g,[[-.27,.25,0],[-.30,.30,0],[-.26,.35,0]],[[-.60,.15,0],[-.64,.30,0],[-.60,.46,0]],ochre,.01);
  fin(g,[[-.26,.44,0],[-.14,.55,0],[0,.58,0],[.13,.57,0]],[[-.29,.57,0],[-.14,.68,0],[0,.72,0],[.13,.64,0]],pale,.009);
  g.tag=1;for(let i=0;i<(low?10:27);i++){const a=i*2.399963,b=.3+((i*.618)%1)*2.5;ellipsoid(g,[-.035+.32*Math.sin(b)*Math.cos(a),.30+.285*Math.cos(b),.235*Math.sin(b)*Math.sin(a)],[.013,.013,.013],ochre,low?5:8,low?4:5);}
  g.tag=5;tube(g,curvePoints([[.28,.54,0],[.27,.75,0],[.39,.89,0],[.56,.85,0],[.58,.71,0]],low?2:4),t=>.010*(1-t*.55),t=>Math.floor(t*10)%2?ochre:pale,low?6:9);
  for(let i=0;i<5;i++)tube(g,[[.58,.72,0],[.62+i*.009,.68+i*.005,(i-2)*.015]],t=>.007*(1-t*.8),cream,low?4:6);
 }
 function lionfish(g,low){
  const red=[.48,.22,.16],white=[.84,.77,.59],stripe=p=>Math.sin(p[0]*48+p[1]*10)>.05?red:white;
  ellipsoid(g,[.04,0,0],[.395,.215,.145],stripe,low?22:44,low?12:24);ellipsoid(g,[.31,-.012,0],[.16,.185,.159],stripe,low?18:30,low?10:18);
  tube(g,[[.425,-.057,-.052],[.46,-.068,0],[.425,-.057,.052]],.008,[.20,.105,.069],low?5:8);
  for(const side of [-1,1]){eye(g,[.349,.063,side*.141],.029,low);g.tag=5;tube(g,[[.335,.091,side*.12],[.33,.23,side*.15],[.39,.29,side*.17]],t=>.010*(1-t*.8),red,low?5:7);tube(g,[[.43,-.1,side*.082],[.40,-.23,side*.105]],t=>.012*(1-t*.85),white,low?5:7);
   g.tag=3;const roots=[],tips=[];for(let i=0;i<=13;i++){const t=i/13,a=-.48+t*1.76,len=.56*Math.sin(Math.PI*(.10+t*.8));roots.push([.17-t*.18,-.04,side*.12]);tips.push([.12-Math.sin(a)*len,-.10-Math.cos(a)*.13,side*(.13+Math.cos(a)*len)]);}
   fin(g,roots,tips,(i)=>i%3===0?red:[.66,.50,.36],.003);
   for(let i=0;i<tips.length;i++)tube(g,[roots[i],V.lerp(roots[i],tips[i],.5),tips[i]],t=>.009*(1-t*.7),t=>Math.floor(t*9-Math.abs(i-6.5)*.32)%2?white:red,low?4:6);
  }
  g.tag=3;const roots=[],tips=[];for(let i=0;i<13;i++){const t=i/12,x=.32-.67*t,y=.20*Math.sqrt(Math.max(.05,1-(x/.4)**2));roots.push([x,y,0]);tips.push([x-.055,.33+.33*Math.sin(t*Math.PI),.004*Math.sin(i)]);}
  // Thirteen separate dorsal spines and scalloped membranes make the fan silhouette.
  const membrane=tips.map((p,i)=>V.lerp(roots[i],p,.62));fin(g,roots,membrane,(i)=>i%2?red:white,.003);for(let i=0;i<13;i++)tube(g,[roots[i],tips[i]],t=>.007*(1-t*.85),t=>Math.floor(t*7)%2?white:red,low?4:6);
  fin(g,[[-.28,-.06,0],[-.36,0,0],[-.28,.06,0]],[[-.62,-.21,0],[-.68,0,0],[-.62,.21,0]],white,.007);
  for(let i=0;i<9;i++){const y=-.18+i*.045;tube(g,[[-.36,y*.25,0],[-.64,y,0]],.004,i%2?red:white,4);}for(const side of [-1,1])for(let i=0;i<(low?8:18);i++)ellipsoid(g,[-.42-(i%3)*.064,(Math.floor(i/3)-2.5)*.054,side*.01],[.010,.012,.004],red,6,4);
 }
 function cuttlefish(g,low){
  const tan=[.58,.49,.34],brown=[.27,.21,.13],pale=[.77,.69,.49],color=p=>{const m=Math.sin(p[0]*31+p[2]*49)*Math.cos(p[0]*53-p[2]*19);return Math.abs(p[0]+.10)<.035?pale:m>.20?brown:m<-.38?pale:tan;};
  ellipsoid(g,[-.16,0,0],[.43,.14,.255],color,low?24:48,low?12:22);ellipsoid(g,[.285,-.015,0],[.16,.12,.203],color,low?18:30,low?10:17);
  g.tag=3;for(const side of [-1,1]){const n=low?16:36,roots=[],tips=[];for(let i=0;i<=n;i++){const u=i/n,x=-.58+u*.85,z=.25*Math.sqrt(Math.max(.002,1-((x+.16)/.43)**2));roots.push([x,0,side*z*.91]);tips.push([x,.015*Math.sin(u*TAU*3),side*(z+.066*Math.sin(u*Math.PI))]);}fin(g,roots,tips,pale,.0025);tube(g,tips,.004,pale,low?4:6);}
  g.tag=4;for(const side of [-1,1]){ellipsoid(g,[.30,.016,side*.177],[.058,.068,.038],pale,low?10:18,low?7:12);const pupil=[[.256,.020,side*.211],[.274,-.007,side*.214],[.300,.014,side*.218],[.322,-.008,side*.216],[.341,.023,side*.209]];tube(g,pupil,.009,dark,low?5:8);}
  g.tag=5;for(let i=0;i<8;i++){const a=i/8*TAU,side=Math.sin(a),y=Math.cos(a),p0=[.39,-.015+y*.065,side*.13],p1=[.58,.015+y*.08,side*.18],p2=[.74,.035+y*.045,side*.205],p3=[.83,.06+y*.025,side*.16];tube(g,[p0,p1,p2,p3],t=>.029*(1-t*.86),color(p1),low?7:10);if(!low)for(let n=1;n<6;n++){const p=V.lerp(p1,p3,n/6);ellipsoid(g,[p[0],p[1]-.013,p[2]],[.010,.005,.010],pale,6,4);}}
  // Two feeding tentacles rest inside the eight-arm crown; their clubs remain visible.
  for(const side of [-1,1]){tube(g,[[.41,-.02,side*.04],[.54,-.06,side*.08],[.64,-.01,side*.04],[.69,.035,side*.025]],t=>.014*(1-t*.3),pale,low?6:9);ellipsoid(g,[.70,.045,side*.026],[.065,.018,.025],tan,low?8:14,low?5:8);}
 }
 function nautilus(g,low){
  const ivory=[.83,.78,.65],rust=[.43,.21,.11],flesh=[.66,.54,.37],darkFlesh=[.23,.18,.12],smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  // The final, swollen whorl ends at a genuinely open aperture. Shell and hood
  // have independent material tags; the shell is not a spiral stuck on a disk.
  const rows=[[-.59,.045,0,0],[-.51,.045,.29,.15],[-.34,.045,.455,.225],[-.13,.045,.50,.247],[.06,.015,.43,.234],[.22,-.075,.31,.209],[.34,-.18,.20,.177]];
  const section=x=>{let i=0;while(i<rows.length-2&&x>rows[i+1][0])i++;const a=rows[i],b=rows[i+1],p=rows[Math.max(0,i-1)],n=rows[Math.min(rows.length-1,i+2)],h=b[0]-a[0],t=clamp((x-a[0])/h,0,1);return [x,...[1,2,3].map(k=>{const m0=(b[k]-p[k])/(b[0]-p[0])*h,m1=(n[k]-a[k])/(n[0]-a[0])*h;return (2*t*t*t-3*t*t+1)*a[k]+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b[k]+(t*t*t-t*t)*m1;})];};
  const surface=(point,nu,nv,color,inward=false)=>{const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.0001),v),point(Math.max(0,u-.0001),v)),dv=V.sub(point(u,v+.0001),point(u,v-.0001)),radial=V.sub(p,point(u,v+.5));let n=V.cross(dv,du);if(V.len(n)<1e-10)n=V.mul(du,u<.5?-1:1);else if(V.dot(n,radial)<0)n=V.mul(n,-1);return {p,n:V.mul(V.norm(n),inward?-1:1),c:typeof color==='function'?color(p):color};};const rr=Array.from({length:nu+1},(_,i)=>Array.from({length:nv+1},(_,j)=>sample(i/nu,j/nv)));const put=(a,b,c)=>{if(V.len(V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p)))<1e-11)return;if(V.dot(V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p)),V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,a.c,[a.n,b.n,c.n],[a.c,b.c,c.c]);};for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=rr[i][j],b=rr[i+1][j],c=rr[i+1][j+1],d=rr[i][j+1];put(a,b,c);put(a,c,d);}};
  const shellColor=p=>{const a=Math.atan2(p[1]-.045,p[0]+.13),r=Math.hypot(p[0]+.13,p[1]-.045),band=Math.sin(a*11.8+r*7+Math.sin(a*4)*.42),width=.38+.12*Math.sin(a*3),pigment=smooth((band-width)/.28)*smooth((r-.11)/.17);return ivory.map((c,i)=>mix(c,rust[i],pigment));};
  g.tag=7;surface((u,v)=>{const x=mix(-.59,.34,u),p=section(x),a=v*TAU;return [x,p[1]+Math.cos(a)*Math.max(0,p[2]),Math.sin(a)*Math.max(0,p[3])];},low?26:48,low?18:32,shellColor);
  const rim=a=>[.34,-.18+Math.cos(a)*.20,Math.sin(a)*.177];
  surface((u,v)=>{const a=v*TAU,k=Math.sin(u*Math.PI*.5);return [mix(-.19,.34,u),-.18+Math.cos(a)*.191*k,Math.sin(a)*.168*k];},low?12:22,low?18:28,p=>[.58+.12*(p[0]+.19),.54+.10*(p[0]+.19),.43+.09*(p[0]+.19)],true);
  surface((u,v)=>{const a=v*TAU;return [.34,-.18+Math.cos(a)*mix(.191,.20,u),Math.sin(a)*mix(.168,.177,u)];},1,low?24:48,[.81,.75,.61]);
  // A low umbilical depression belongs to the whorl surface, not a black hole.
  for(const side of [-1,1])ellipsoid(g,[-.12,.055,side*.243],[.049,.056,.007],[.70,.65,.53],low?10:18,low?6:9);
  g.tag=1;ellipsoid(g,[.32,-.19,0],[.112,.119,.143],flesh,low?16:28,low?10:16);
  // Sample pigments at shared vertices; face-midpoint colours made a checkerboard.
  surface((u,v)=>{const a=u*Math.PI,b=v*TAU;return [.31+Math.sin(a)*Math.cos(b)*.205,-.019+Math.cos(a)*.085,Math.sin(a)*Math.sin(b)*.177];},low?10:17,low?18:30,p=>{const q=.5+.24*Math.sin(p[0]*31+p[2]*21)*Math.sin(p[2]*37-p[0]*14);return flesh.map((c,i)=>mix(c,darkFlesh[i],q*.28));});
  // Pinhole eyes are set into fleshy side lobes, without a glassy fish eyeball.
  g.tag=4;for(const side of [-1,1]){ellipsoid(g,[.390,-.155,side*.132],[.042,.045,.027],cream,low?10:16,low?7:10);ellipsoid(g,[.412,-.156,side*.153],[.009,.014,.0045],dark,low?7:10,low?5:7);}
  g.tag=5;const count=low?20:44;for(let i=0;i<count;i++){const a=i*2.399963,r=.035+.09*((i*.618034)%1),cy=Math.cos(a),sz=Math.sin(a),len=.18+.21*((i*.381966)%1),root=[.398,-.19+cy*r,sz*r],curl=Math.sin(i*.83),points=curvePoints([root,[.455,-.19+cy*r*.94,sz*r*1.14],[.50+len*.39,-.19+cy*(r+.018)+curl*.025,sz*(r+.04)],[.50+len*.81,-.19+cy*(r+.043)+curl*.035,sz*(r+.075)],[.50+len,-.19+cy*(r+.025)+curl*.055,sz*(r+.058)]],low?1:2);tube(g,points,t=>.0067*Math.pow(1-t,.8)+.0007,t=>flesh.map((c,k)=>mix(c,ivory[k],.20+t*.35)),low?4:5);}
  g.tag=1;tube(g,curvePoints([[.31,-.28,0],[.40,-.30,0],[.45,-.29,0],[.48,-.276,0]],low?1:2),t=>.027-t*.009,flesh,low?8:12);ellipsoid(g,[.485,-.274,0],[.004,.012,.013],dark,low?8:12,low?5:7);
 }

 const builders={pygmy_seahorse:seahorse,cinderella_slug:slug,garden_eel:eel,pistol_shrimp:shrimp,frogfish,lionfish,cuttlefish,nautilus};
 function build(sp,low){const key=sp.id+':'+!!low;if(cache.has(key))return cache.get(key);const g=new Geometry();g.material=0;g.species=SPECIES.findIndex(s=>s.id===sp.id);g.tag=1;g.shadow=!low;builders[sp.id](g,!!low);
  // Height normalization is intentional for upright seahorses and eels. Others
  // retain the documented body/arm/shell measurement rather than antenna length.
  const axis=sp.measureAxis??0,bounds=()=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<g.v.length;k+=12)for(let a=0;a<3;a++){min[a]=Math.min(min[a],g.v[k+a]);max[a]=Math.max(max[a],g.v[k+a]);}return {min,max,size:max.map((v,i)=>v-min[i])};};
  let b=bounds();const scale=sp.modelUnitLength||b.size[axis],floor=['attached','crawl','burrow'].includes(sp.traits.motion),base=floor?b.min[1]:0;
  for(let k=0;k<g.v.length;k+=12){g.v[k]/=scale;g.v[k+1]=(g.v[k+1]-base)/scale;g.v[k+2]/=scale;g.v[k+9]=g.v[k];g.v[k+10]=g.v[k+2];}
  b=bounds();g.modelBounds=b;cache.set(key,g);return g;
 }
 return {build,builders,ellipsoid,tube,curvePoints,fin,eye,dark,cream};
})();
function faunaGeometry(speciesOrId,lod=false){const sp=typeof speciesOrId==='number'?SPECIES[speciesOrId]:typeof speciesOrId==='string'?SPECIES.find(s=>s.id===speciesOrId):speciesOrId;if(!sp?.fauna||!faunaArt.builders[sp.id])throw new RangeError('Unknown fauna model');return faunaArt.build(sp,lod);}
function faunaThumb(speciesOrId){const sp=typeof speciesOrId==='number'?SPECIES[speciesOrId]:typeof speciesOrId==='string'?SPECIES.find(s=>s.id===speciesOrId):speciesOrId;return sp?.thumb||'';}
function registerFauna(entry,collection=FAUNA_SPECIES){const traits={motion:'hover',micro:false,feedable:false,grabbable:false,contactDistance:1.4,observeDistance:6,targetRadius:entry.size*.55,viewDistance:1.4,floorOffset:0,...entry.traits};const sp={fauna:true,model:entry.id,height:.25,width:.12,...entry,traits,spawn:entry.spawn||[]};Object.defineProperty(sp,'modelBounds',{enumerable:true,get:()=>faunaArt.build(sp,false).modelBounds});Object.defineProperty(traits,'floorOffset',{enumerable:true,get:()=>Math.max(0,-sp.modelBounds.min[1])});collection.push(sp);SPECIES.push(sp);return sp;}
registerFauna({id:'pygmy_seahorse',name:'豆丁海馬',latin:'Hippocampus bargibanti',en:'PYGMY SEAHORSE',color:0xad6979,zone:0,size:.024,measureAxis:1,bodyLength:1,naturalSize:'成體高度約 13–24 mm',hint:'小小的捲尾、短吻與圓凸疣，融入海扇枝上。',detail:'豆丁海馬以可捲握的尾部攀附海扇，身上的凸疣近似宿主珊瑚的水螅體。本模型個體高 24 mm；出現點與互動門檻為遊戲設定。',source:'https://fishesofaustralia.net.au/home/species/1540',traits:{motion:'attached',micro:true,contactDistance:.65,observeDistance:1.1,targetRadius:.012,viewDistance:.7},spawn:[{x:-10,z:-7,yOffset:.6}]});
registerFauna({id:'cinderella_slug',name:'灰姑娘海蛞蝓',latin:'Hypselodoris apolegma',en:'CINDERELLA SEA SLUG',color:0x873db0,zone:0,size:.065,bodyLength:1,naturalSize:'本模型體長 65 mm；不是物種最大值',hint:'紫色外套膜鑲著白邊；前方兩支橘黃嗅角，後方一簇羽狀鰓。',detail:'橘黃嗅角和鰓、紫底白緣，是這種海蛞蝓的觀察線索。博物館紀錄曾觀察到牠取食海綿，因此不接受遊戲的魚食雲。',source:'https://www.seaslugforum.net/factsheet/hypsapol',traits:{motion:'crawl',micro:true,contactDistance:.8,observeDistance:1.6,targetRadius:.034,viewDistance:.9},spawn:[{x:-8,z:-4,yOffset:.04}]});
registerFauna({id:'garden_eel',name:'花園鰻',latin:'Heteroconger hassi',en:'SPOTTED GARDEN EEL',color:0xc5c2a0,zone:0,size:.40,measureAxis:1,bodyLength:1,naturalSize:'常見全長約 36–41 cm；多數身體留在洞內',hint:'細長斑點身體從沙洞探出；靠近時會縮回。',detail:'花園鰻以尾部挖出沙洞，通常朝向水流取食浮游動物。牠受到驚擾會退回洞中；伸出高度與退避距離在遊戲內經過簡化。',source:'https://www.georgiaaquarium.org/animal/spotted-garden-eel/',traits:{motion:'burrow',micro:true,contactDistance:1.1,observeDistance:3.5,targetRadius:.055,viewDistance:1.6},spawn:[{x:-3,z:7,yOffset:0},{x:-2.7,z:6.8,yOffset:0},{x:-3.25,z:6.7,yOffset:0}]});
registerFauna({id:'pistol_shrimp',name:'蘭氏槍蝦',latin:'Alpheus randalli',en:"RANDALL'S PISTOL SHRIMP",color:0xda4b35,zone:0,size:.028,modelUnitLength:.982,bodyLength:1,naturalSize:'原始描述的雄性模式標本全長 28 mm',hint:'紅白條帶、細長觸角，以及明顯大小不一的一對螯。',detail:'原始描述記錄了紅白體色，以及在砂礫底與鰕虎魚共居的個體。本模型以 28 mm 標本尺度表現；觸角與螯伸出體長外，遊戲不把兩者算成身體長度。',source:'https://research.nhm.org/pdfs/24664/24664.pdf',traits:{motion:'crawl',micro:true,contactDistance:.8,observeDistance:1.5,targetRadius:.026,viewDistance:.8},spawn:[{x:-5,z:5,yOffset:.015}]});
registerFauna({id:'frogfish',name:'彩繪躄魚',latin:'Antennarius pictus',en:'PAINTED FROGFISH',color:0xc47f31,zone:1,size:.20,bodyLength:1,naturalSize:'可達標準體長 24 cm、全長 30 cm；模型全長 20 cm',hint:'圓厚身形伏在礁上；頭上的細釣竿末端晃著誘餌。',detail:'彩繪躄魚依靠偽裝伏擊獵物，活動的誘餌位於口部前方。模型保留小疣、斑駁體色與可支撐身體的鰭，並非所有躄魚的通用形態。',source:'https://fishesofaustralia.net.au/home/species/3831',traits:{motion:'crawl',micro:true,contactDistance:1.2,observeDistance:4,targetRadius:.11,viewDistance:1.5},spawn:[{x:10,z:-16,yOffset:.02}]});
registerFauna({id:'lionfish',name:'月斑蓑鮋',latin:'Pterois lunulata',en:'LUNA LIONFISH',color:0xa9533b,zone:1,size:.28,bodyLength:1,naturalSize:'全長可達約 35 cm；模型全長 28 cm',hint:'長背鰭棘、向兩側展開的胸鰭，以及褐紅與淺色相間的條紋。',detail:'月斑蓑鮋的成魚鰭部帶有斑點，胸鰭鰭條可見 V 形斑紋。本模型參考該種的輪廓與體色，採緩慢懸游；遊戲不開放抓握。',source:'https://fishesofaustralia.net.au/Home/species/3649',traits:{motion:'hover',micro:false,feedable:true,contactDistance:2.2,observeDistance:9,targetRadius:.20,viewDistance:2},spawn:[{x:17,z:-23,yOffset:1.3}]});
registerFauna({id:'cuttlefish',name:'寬腕烏賊',latin:'Ascarosepion latimanus · 同物異名 Sepia latimanus',en:'BROADCLUB CUTTLEFISH',color:0x98835a,zone:0,size:.45,bodyLength:1,naturalSize:'模型含自然收攏腕冠的全長 45 cm；非最大外套長',hint:'扁寬外套膜、環身波動的鰭裙，眼前展開八腕與兩條捕食觸腕。',detail:'寬腕烏賊以連續鰭緣波動懸游，也能噴水快速移動。體表可迅速改變花紋；模型保留八腕、兩條收攏觸腕與 W 形瞳孔，色彩變化為簡化動畫。',source:'https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/broadclub-cuttlefish',traits:{motion:'hover',micro:false,feedable:true,contactDistance:2.2,observeDistance:10,targetRadius:.25,viewDistance:2.2},spawn:[{x:-15,z:-12,yOffset:1.5}]});
registerFauna({id:'nautilus',name:'鸚鵡螺',latin:'Nautilus pompilius',en:'CHAMBERED NAUTILUS',color:0xd7c7a2,zone:3,size:.22,modelUnitLength:1,measureAxis:1,bodyLength:1,naturalSize:'成體殼徑約 20–25 cm；模型殼徑 22 cm',hint:'褐白相間的盤捲外殼，殼口前方伸出一束細觸手。',detail:'鸚鵡螺以外殼保護身體，透過漏斗噴水移動，觸手沒有章魚式的吸盤。本遊戲的深谷配置與晝夜活動是縮小的原創場景，不等於自然界的活動深度。',source:'https://www.aquariumofpacific.org/onlinelearningcenter/species/chambered_nautilus',traits:{motion:'hover',micro:false,feedable:true,contactDistance:1.8,observeDistance:7,targetRadius:.17,viewDistance:1.8},spawn:[{x:-4,z:-77,yOffset:1.4}]});
// Authored optical approximations, not measured animal skin coefficients.
// The renderer treats nautilus tag7 as shell and its other tags as soft tissue.
const faunaMaterials={
 pygmy_seahorse:['fish',.72,.09,35],cinderella_slug:['gelatinous',.66,.30,18],
 garden_eel:['fish',.58,.08,35],pistol_shrimp:['crustacean',.61,.08,32],
 frogfish:['fish',.76,.10,45],lionfish:['fish',.54,.10,48],
 cuttlefish:['cephalopod',.59,.30,40],nautilus:['cephalopod',.70,.16,36]
};
for(const sp of FAUNA_SPECIES){const [skin,roughness,subsurface,patternScale]=faunaMaterials[sp.id];sp.materialProfile={skin,roughness,subsurface,patternScale};}

// Original compact vector field-guide drawings. These are schematic thumbnails,
// not copied photographs, scientific plates, or replacements for the 3D meshes.
(()=>{
 const drawings={
  pygmy_seahorse:'<path d="M81 44 Q53 24 49 47 Q46 59 60 66 Q71 74 63 88 Q47 111 69 123 Q89 131 98 112 Q101 97 90 95 Q79 94 78 106" fill="none" stroke="#be6b87" stroke-width="12"/><path d="M76 39 L106 44 L108 53 L78 53" fill="#c78ca2"/><ellipse cx="62" cy="74" rx="16" ry="23" fill="#c78ca2"/><g fill="#8d3b60"><circle cx="57" cy="62" r="4"/><circle cx="72" cy="70" r="4"/><circle cx="54" cy="82" r="4"/><circle cx="64" cy="94" r="3"/><circle cx="54" cy="48" r="4"/></g><circle cx="72" cy="42" r="3" fill="#152a32"/>',
  cinderella_slug:'<path d="M23 94 Q18 64 71 61 Q126 61 137 84 Q136 101 92 104 Q48 109 23 94Z" fill="#8e52b1" stroke="#ece9db" stroke-width="5"/><path d="M115 68 L119 42 M105 65 L101 40 M45 66 L29 42 M45 66 L43 35 M45 66 L60 43" stroke="#dd9e36" stroke-width="7" stroke-linecap="round"/><path d="M33 100 Q85 116 133 93" fill="none" stroke="#73409c" stroke-width="4"/>',
  garden_eel:'<path d="M52 130 Q66 102 66 73 Q63 43 80 31 Q94 24 103 30" fill="none" stroke="#c5c4a4" stroke-width="12" stroke-linecap="round"/><g fill="#43514a"><circle cx="65" cy="94" r="4"/><circle cx="67" cy="61" r="4"/><circle cx="83" cy="32" r="3"/><circle cx="58" cy="115" r="2"/><circle cx="69" cy="82" r="2"/><circle cx="75" cy="41" r="2"/></g><circle cx="101" cy="28" r="2" fill="#152a32"/><ellipse cx="52" cy="132" rx="18" ry="5" fill="#294d51"/>',
  pistol_shrimp:'<path d="M34 90 Q65 86 84 64 L108 65" fill="none" stroke="#e5ddbd" stroke-width="16" stroke-linecap="round"/><path d="M45 88 L43 75 M62 81 L57 69 M80 69 L75 56" stroke="#cf5549" stroke-width="8"/><path d="M78 79 L106 101 M69 87 L78 109 M59 94 L55 112 M97 58 Q122 37 145 42 M95 56 Q111 26 137 19" fill="none" stroke="#e5ddbd" stroke-width="3"/><path d="M103 78 Q125 75 136 88 Q127 103 109 95Z" fill="#e5ddbd" stroke="#cf5549" stroke-width="4"/><path d="M119 84 L141 84 M121 96 L140 91" stroke="#e5ddbd" stroke-width="5"/><circle cx="101" cy="61" r="3" fill="#152a32"/><path d="M31 89 L13 74 L18 102Z" fill="#cf5549"/>',
  frogfish:'<path d="M36 85 Q30 35 75 47 Q103 45 117 65 L128 83 Q116 110 91 106 L49 108Z" fill="#c39349"/><path d="M43 83 L20 74 L18 99 L43 101 M59 96 L53 119 L77 114 M98 104 L101 120 L119 111" fill="#b77f3c"/><path d="M88 52 Q85 17 115 30 Q128 37 120 48" fill="none" stroke="#ddc07c" stroke-width="3"/><circle cx="121" cy="49" r="5" fill="#eee2b6"/><circle cx="104" cy="66" r="4" fill="#152a32"/><path d="M120 84 L126 85" stroke="#533b26" stroke-width="5"/><g fill="#6f542f"><circle cx="60" cy="73" r="5"/><circle cx="83" cy="88" r="6"/><circle cx="50" cy="98" r="3"/></g>',
  lionfish:'<path d="M46 73 L36 31 L65 59 L64 20 L84 59 L93 25 L99 70 M64 79 L22 123 L74 103 L102 135 L99 91" fill="#b98359" stroke="#e5d3aa" stroke-width="2"/><path d="M29 75 L13 59 L14 101 L36 93 Q74 112 121 82 Q113 49 78 60 Q55 63 29 75Z" fill="#bd7654"/><path d="M41 70 L43 96 M58 64 L64 103 M78 60 L85 102 M99 64 L108 94" stroke="#eee0b8" stroke-width="6"/><circle cx="111" cy="77" r="4" fill="#182b30"/><path d="M83 88 L32 125 M80 91 L57 133 M83 94 L89 133" stroke="#e8d6aa" stroke-width="3"/>',
  cuttlefish:'<path d="M14 81 Q27 43 79 55 L111 69 L113 99 L74 112 Q31 126 14 81Z" fill="#8c815b" stroke="#c7bc87" stroke-width="5"/><path d="M32 64 L42 102 M52 58 L67 108 M72 60 L89 108" stroke="#605a40" stroke-width="6"/><path d="M106 70 Q132 57 145 67 M108 77 Q139 72 147 82 M109 86 Q137 92 142 105 M105 94 Q126 118 137 115" fill="none" stroke="#c1b57e" stroke-width="6" stroke-linecap="round"/><ellipse cx="105" cy="78" rx="8" ry="7" fill="#d9c995"/><path d="M99 76 L102 80 L105 76 L108 80 L111 76" fill="none" stroke="#263a38" stroke-width="2"/>',
  nautilus:'<circle cx="64" cy="73" r="47" fill="#decdaa"/><path d="M34 36 L52 63 M62 27 L64 50 M91 34 L75 58 M109 62 L81 68 M99 102 L78 82 M60 117 L63 91 M24 96 L49 83" stroke="#9a603a" stroke-width="10"/><path d="M98 80 Q72 119 43 94 Q19 68 48 47 Q77 29 91 59 Q101 81 79 92 Q61 100 53 82 Q48 68 60 62 Q74 56 80 71 Q84 80 73 82" fill="none" stroke="#a17a50" stroke-width="2"/><path d="M94 79 L109 89 L112 103 L95 113" fill="#8e7050"/><path d="M110 91 Q136 78 145 86 M110 95 Q139 94 146 103 M110 101 Q131 112 143 115 M106 107 Q123 132 135 125" fill="none" stroke="#d9c5a0" stroke-width="4" stroke-linecap="round"/><circle cx="107" cy="91" r="3" fill="#152b30"/>'
 };
 for(const sp of FAUNA_SPECIES)sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><radialGradient id="sea"><stop stop-color="#245765"/><stop offset="1" stop-color="#092c3a"/></radialGradient></defs><rect width="160" height="160" rx="20" fill="url(#sea)"/>'+drawings[sp.id]+'</svg>');
})();
