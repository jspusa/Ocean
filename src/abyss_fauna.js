/* Original deep-water catalogue. Biology/measurement references are in
 * docs/parity/ABYSS-FAUNA-REFERENCE.md. +X anterior, +Y up, Z lateral.
 * kind 10: tag1 body, tag2 pelican/angler oral lining, tag3 fin, tag4 eye,
 * tag5 limb/lure, tag6 luminous tip. */
const ABYSS_SPECIES=[];
const abyssArt=(()=>{
 const dark=[.024,.032,.039],ivory=[.70,.73,.63],blend=cetaceanArt.blend,soft=cetaceanArt.soft;
 const tube=faunaArt.tube,curve=faunaArt.curvePoints,fin=faunaArt.fin;
 function ellipsoid(g,c,r,color,low,detail=1){cetaceanArt.skin(g,(u,v)=>{const a=u*Math.PI,b=v*TAU;return [c[0]+Math.cos(a)*r[0],c[1]+Math.sin(a)*Math.cos(b)*r[1],c[2]+Math.sin(a)*Math.sin(b)*r[2]];},Math.round((low?10:18)*detail),Math.round((low?14:28)*detail),color);}
 function body(g,rows,color,low){cetaceanArt.skin(g,(u,v)=>{const [x,y,ry,rz]=cetaceanArt.profileAt(rows,mix(rows[0][0],rows.at(-1)[0],u)),a=v*TAU;return [x,y+Math.cos(a)*ry,Math.sin(a)*rz];},low?30:64,low?16:32,color);}
 function eye(g,p,r,low,pupil=.72){const tag=g.tag;g.tag=4;ellipsoid(g,p,[r,r*.86,r*.48],[.39,.43,.40],low,.65);ellipsoid(g,[p[0]+r*.16,p[1],p[2]+Math.sign(p[2])*r*.35],[r*pupil,r*pupil*.9,r*.24],dark,low,.55);g.tag=tag;}
 function tagged(g,tag,run){const old=g.tag;g.tag=tag;run();g.tag=old;}
 // These lofts belong only to coelacanth/pelican. A complete cross-section
 // changes continuously from a buried fleshy root to a cambered thin margin.
 function deepFin(g,rows,color,low,axis=2){
  const section=u=>{const q=clamp(u,0,1)*(rows.length-1),i=Math.min(rows.length-2,Math.floor(q)),t=q-i,a=rows[i],b=rows[i+1],p=rows[i-1]||a.map((v,k)=>2*v-b[k]),n=rows[i+2]||b.map((v,k)=>2*v-a[k]);return a.map((v,k)=>{const m0=(b[k]-p[k])*.5,m1=(n[k]-v)*.5,t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*v+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[k]+(t3-t2)*m1;});};
  tagged(g,3,()=>cetaceanArt.skin(g,(u,v)=>{const [x,y,z,w,h]=section(u),a=v*TAU,c=Math.cos(a)*Math.max(0,w),s=Math.sin(a)*Math.max(0,h);return axis===2?[x+c,y+s,z]:axis===1?[x+c,y,z+s]:[x,y+c,z+s];},low?8:16,low?8:12,color));
 }
 function deepEye(g,p,r,low){
  // One shallow ocular surface, with pigment in that surface rather than a
  // second floating pupil button. The back half is buried in the actual skin.
  tagged(g,4,()=>ellipsoid(g,p,[r,r*.78,r*.40],q=>{const d=Math.hypot((q[0]-p[0])/(r*.72),(q[1]-p[1])/(r*.60));return blend([.016,.024,.026],[.14,.18,.17],soft(.68,1.03,d));},low,.55));
 }
 function coelTail(g,color,low){
  // One thin caudal surface carries the complete three-lobed outline. The
  // short middle projection belongs to this fin, not three detached petals.
  const outline=[[-.290,0],[-.295,.025],[-.315,.079],[-.350,.123],[-.400,.145],[-.455,.128],[-.474,.072],[-.476,.029],[-.510,0],[-.476,-.029],[-.474,-.072],[-.455,-.128],[-.400,-.145],[-.350,-.123],[-.315,-.079],[-.295,-.025]],nu=low?6:14,nv=low?16:32;
  const edge=v=>{const q=((v%1)+1)%1*outline.length,i=Math.floor(q),t=q-i,a=outline[i],b=outline[(i+1)%16],p=outline[(i+15)%16],n=outline[(i+2)%16];return a.map((x,k)=>.5*((2*x)+(-p[k]+b[k])*t+(2*p[k]-5*x+4*b[k]-n[k])*t*t+(-p[k]+3*x-3*b[k]+n[k])*t*t*t));};
  const camber=(x,y)=>.004*Math.sin((x+.29)/.22*Math.PI)*(1-.3*(y/.15)**2);
  const point=(u,v)=>{const r=edge(v),s=Math.sin(u*Math.PI),x=mix(-.390,r[0],s),y=r[1]*s,h=.002+.011*Math.exp(-(((x+.315)/.035)**2+(y/.055)**2));return [x,y,camber(x,y)+Math.cos(u*Math.PI)*h];};
  const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.0001),v),point(Math.max(0,u-.0001),v)),dv=V.sub(point(u,v+.0001),point(u,v-.0001));let n=V.cross(du,dv);if(V.len(n)<1e-10){const dx=(camber(p[0]+.0001,p[1])-camber(p[0]-.0001,p[1]))/.0002,dy=(camber(p[0],p[1]+.0001)-camber(p[0],p[1]-.0001))/.0002;n=V.mul([-dx,-dy,1],u<.5?1:-1);}return {p,n:V.norm(n)};};
  const mesh=Array.from({length:nu+1},(_,i)=>Array.from({length:nv+1},(_,j)=>sample(i/nu,j/nv)));
  tagged(g,3,()=>{const put=(a,b,c)=>{const n=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(n)<1e-11)return;if(V.dot(n,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,color,[a.n,b.n,c.n]);};for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=mesh[i][j],b=mesh[i+1][j],c=mesh[i+1][j+1],d=mesh[i][j+1];put(a,b,c);put(a,c,d);}});
 }
 function coelacanth(g,low){
  const blue=[.17,.27,.32],rows=[[-.36,0,0,0],[-.29,0,.050,.035],[-.18,0,.080,.061],[-.04,0,.117,.097],[.12,.002,.140,.116],[.26,.011,.124,.110],[.38,.007,.098,.088],[.44,-.002,.071,.070],[.477,-.016,.033,.042],[.49,-.021,0,0]];
  const creases=p=>{const mouth=(1-soft(.003,.010,Math.abs(p[1]+.029+(p[0]-.40)*.035)))*soft(.31,.36,p[0]),gill=(1-soft(.005,.014,Math.abs(p[0]-(.185+.055*((p[1]+.018)/.13)**2))))*soft(.035,.075,Math.abs(p[2]));return Math.max(mouth,gill*.58);};
  const shell=(u,v)=>{const [x,y,ry,rz]=cetaceanArt.profileAt(rows,mix(-.36,.49,u)),a=v*TAU,p=[x,y+Math.cos(a)*ry,Math.sin(a)*rz],crease=creases(p);p[2]*=1-.035*crease;return p;};
  const paint=p=>blend(blend(blue,[.23,.33,.36],(1-soft(-.13,-.025,p[1]))*.25),[.075,.13,.16],creases(p)*.72);
  cetaceanArt.skin(g,shell,low?28:56,low?16:28,paint);
  for(const side of [-1,1]){
   const x=.362,y=.038,b=cetaceanArt.profileAt(rows,x),z=b[3]*Math.sqrt(1-((y-b[1])/b[2])**2);
   deepEye(g,[x,y,side*(z-.0016)],.0145,low);
   const mirror=rows=>rows.map(p=>[p[0],p[1],p[2]*side,p[3],p[4]]);
   deepFin(g,mirror([[.184,-.062,.073,0,0],[.171,-.071,.099,.027,.017],[.145,-.087,.133,.031,.012],[.109,-.102,.185,.065,.004],[.082,-.101,.236,.067,.0027],[.065,-.086,.273,.028,.0013],[.058,-.080,.278,0,0]]),blue,low);
   deepFin(g,mirror([[-.110,-.041,.035,0,0],[-.119,-.052,.060,.024,.013],[-.140,-.069,.094,.025,.009],[-.167,-.087,.146,.052,.0034],[-.186,-.086,.185,.047,.0022],[-.193,-.074,.206,.020,.0011],[-.196,-.069,.212,0,0]]),blue,low);
  }
  // Two separate dorsal fins, one anal fin, and the three-part caudal shape.
  // Curvature and thickness belong to these surfaces, not overlaid ray tubes.
  deepFin(g,[[.090,.105,0,0,0],[.090,.137,0,.100,.009],[.075,.175,.002,.092,.004],[.047,.216,.004,.062,.0025],[.012,.228,.005,.024,.0013],[-.012,.222,.006,0,0]],blue,low,1);
  for(const side of [-1,1]){
   deepFin(g,[[-.215,side*.037,0,0,0],[-.215,side*.070,0,.040,.012],[-.235,side*.116,.002,.055,.0045],[-.250,side*.165,.004,.044,.002],[-.270,side*.177,.006,.015,.001],[-.285,side*.166,.006,0,0]],blue,low,1);
  }
  coelTail(g,blue,low);
 }
 function squid(g,low){
  const russet=[.40,.13,.14],rose=[.62,.31,.29],paint=p=>{const mottled=Math.sin(p[0]*183+p[2]*89)*Math.sin(p[1]*213-p[2]*141);return blend(russet,rose,.2+.32*(1-soft(-.045,.04,p[1]))+.06*Math.sin(p[0]*53+p[2]*61)+soft(.2,.85,mottled)*.12);};
  body(g,[[-.5,0,0,0],[-.46,0,.019,.021],[-.38,0,.044,.050],[-.29,0,.050,.056],[-.232,0,.043,.045],[-.218,0,0,0]],paint,low);
  ellipsoid(g,[-.197,0,0],[.052,.041,.049],paint,low,.75);
  for(const side of [-1,1]){eye(g,[-.184,.002,side*.045],.018,low,.87);tagged(g,3,()=>fin(g,[[-.480,0,side*.012],[-.429,0,side*.031],[-.363,0,side*.050]],[[-.464,.007,side*.037],[-.422,.012,side*.088],[-.363,0,side*.052]],russet,.002));}
  // Eight muscular arms carry suckers along their inner face. Two additional
  // narrow feeding tentacles have smooth shafts and terminal sucker clubs.
  tagged(g,5,()=>{for(let i=0;i<8;i++){const a=i/8*TAU,cy=Math.cos(a),sz=Math.sin(a),pts=curve([[-.16,cy*.025,sz*.037],[-.09,cy*.041,sz*.056],[.02,cy*.073,sz*.100],[.11+(i%2)*.025,cy*.050,sz*.079]],low?2:4);tube(g,pts,t=>.0105*(1-t*.88),t=>blend(rose,russet,t*.5),low?6:9);if(!low)for(let j=0;j<5;j++){const t=.13+j*.16,c=pts[Math.round(t*(pts.length-1))];ellipsoid(g,[c[0],c[1]-cy*.007,c[2]-sz*.007],[.0033,.0028,.0033],[.66,.44,.38],true,.5);}}
   for(const side of [-1,1]){const pts=curve([[-.16,-.007,side*.018],[-.005,-.023,side*.055],[.22,-.006,side*.070],[.43,.015,side*.063]],low?2:4);tube(g,pts,t=>.0035-.001*t,rose,low?5:8);ellipsoid(g,[.463,.017,side*.061],[.037,.010,.013],rose,low,.65);tube(g,curve([[.482,.017,side*.061],[.495,.013,side*.055],[.500,.008,side*.052]],low?1:3),t=>.004*(1-t*.85),rose,low?5:7);for(let j=0;j<(low?3:6);j++)ellipsoid(g,[.436+j*(low?.020:.010),.008,side*.061],[.0032,.0022,.0032],ivory,true,.5);}
  });
  // Ventral funnel is an actual short tube below the eye-bearing head.
  tube(g,[[-.223,-.022,0],[-.192,-.051,0],[-.164,-.049,0]],t=>.010-t*.003,rose,low?7:10);
 }
 function pelican(g,low){
  const skin=[.036,.046,.058],rows=[[-.506,-.014,0,0],[-.465,-.008,.0025,.0025],[-.36,.001,.004,.004],[-.20,-.007,.008,.006],[-.06,-.018,.016,.011],[.085,-.022,.028,.022],[.19,-.030,.054,.045],[.278,-.034,.104,.087],[.345,-.031,.139,.117],[.392,-.025,.133,.122]];
  // A suspended lower pouch and receding mouth corners replace the circular
  // funnel. The tail, trunk, roof and cheek are one continuous exterior skin.
  const rim=a=>{const c=Math.cos(a),s=Math.sin(a);return [.392+.070*Math.pow(Math.abs(c),1.4)+.010*(1-c),-.025+.133*c-.015*s*s,.122*s*(1-.18*c)];};
  const shell=(u,v)=>{const x=mix(-.506,.392,u),b=cetaceanArt.profileAt(rows,x),a=v*TAU,c=Math.cos(a),s=Math.sin(a),m=soft(.65,1,u),r=rim(a);return [x+m*(r[0]-.392),b[1]+c*b[2]-.015*s*s*m,s*b[3]*(1-.18*c*m)];};
  cetaceanArt.skin(g,shell,low?30:64,low?16:28,skin);
  // Tag 2 is only this species' oral lining. Both sides share exact rim
  // positions; no dark disk or separate annular tube closes off the opening.
  tagged(g,2,()=>{const begin=g.v.length,throat=[.165,-.040,0];
   cetaceanArt.skin(g,(u,v)=>{const r=rim(v*TAU),k=u*(.70+.30*u);return [mix(throat[0],r[0],Math.pow(u,1.6)),mix(throat[1],r[1],k),r[2]*k];},low?10:20,low?16:28,p=>blend([.025,.013,.019],[.061,.030,.037],soft(.17,.47,p[0])*.7));
   for(let i=begin;i<g.v.length;i+=36){const b=g.v.slice(i+12,i+24),c=g.v.slice(i+24,i+36);g.v.splice(i+12,24,...c,...b);for(const j of [0,12,24])for(let n=3;n<6;n++)g.v[i+j+n]*=-1;}
  });
  for(const side of [-1,1]){const p=shell(.975,side*.10);p[1]-=.0013;p[2]-=side*.0010;deepEye(g,p,.0068,low);}
  // A thin dorsal ribbon follows the true tail surface along its whole root.
  tagged(g,3,()=>cetaceanArt.skin(g,(u,v)=>{const x=mix(-.46,.16,u),b=cetaceanArt.profileAt(rows,x),a=v*TAU,s=Math.sin(u*Math.PI),h=.024*Math.pow(Math.max(0,s),.72);return [x,b[1]+b[2]+h*.44-.002*s+Math.cos(a)*h*.56,Math.sin(a)*.0009*s];},low?12:24,low?6:8,[.070,.079,.086]));
  // Inconspicuous teeth grow from the common jaw, never from a floating grill.
  for(const jaw of [0,1])for(let i=0,n=low?5:9;i<n;i++){const a=jaw*Math.PI+mix(-1.20,1.20,(i+.5)/n),r=rim(a),inward=V.norm([0,-(r[1]+.025),-r[2]]),base=V.add(r,[-.001,inward[1]*.001,inward[2]*.001]),tip=V.add(base,[-.010,inward[1]*.009,inward[2]*.009]);tube(g,[base,tip],t=>.0015*(1-t*.85),ivory,4);}
  tagged(g,6,()=>ellipsoid(g,[-.506,-.014,0],[.006,.004,.004],[.48,.66,.52],low,.5));
 }
 function angler(g,low){
  const charcoal=[.071,.063,.060],paint=p=>{const grain=Math.sin(p[0]*133+Math.sin(p[2]*91))*Math.sin(p[1]*157-p[2]*43);return blend(charcoal,[.135,.105,.087],.16+.12*(1-soft(-.22,.19,p[1]))+grain*.045);};
  // The oral opening is a curved horseshoe: corners recede beneath the eyes,
  // the lower jaw projects slightly farther than the upper jaw. Every mouth
  // structure below samples this same boundary, rather than a separate nozzle.
  const rim=a=>{const c=Math.cos(a),s=Math.sin(a);return [.175+.235*Math.pow(Math.abs(c),1.25)+.015*(1-c),-.042+.211*c,.193*s*(1-.18*c)];};
  const rows=[[-.43,0,0,0],[-.31,-.018,.050,.055],[-.21,-.012,.159,.159],[-.10,-.009,.227,.222],[.035,-.008,.254,.235],[.13,-.025,.243,.223],[.175,-.042,.211,.193]];
  const shell=(u,v)=>{const a=v*TAU,x=mix(-.43,.175,u),b=cetaceanArt.profileAt(rows,x),m=soft(.52,1,u),r=rim(a);return [x+m*(r[0]-.175),b[1]+Math.cos(a)*b[2],Math.sin(a)*b[3]*(1-.18*Math.cos(a)*m)];};
  cetaceanArt.skin(g,shell,low?30:60,low?20:40,paint);
  // Concave lining shares the shell's terminal edge. Its throat is well behind
  // the face; no opaque head cap sits across the opening. Inward facing normals
  // and winding preserve genuine depth in colour and shadow passes.
  const begin=g.v.length,throat=[-.026,-.054,0];
  tagged(g,2,()=>cetaceanArt.skin(g,(u,v)=>{const r=rim(v*TAU),k=Math.sin(u*Math.PI*.5);return [mix(throat[0],r[0],Math.pow(u,1.65)),mix(throat[1],r[1],k),r[2]*k];},low?13:23,low?20:40,p=>blend([.024,.013,.018],[.084,.039,.039],soft(-.03,.36,p[0])*.72)));
  for(let i=begin;i<g.v.length;i+=36){const b=g.v.slice(i+12,i+24),c=g.v.slice(i+24,i+36);g.v.splice(i+12,24,...c,...b);for(const j of [0,12,24])for(let n=3;n<6;n++)g.v[i+j+n]*=-1;}
  tube(g,Array.from({length:(low?40:72)+1},(_,i)=>rim(i/(low?40:72)*TAU)),t=>.0048+.0012*(1-Math.cos(t*TAU)),[.115,.083,.069],low?6:8);
  // Small lateral eyes sit in the continuous cheek, without a protruding white
  // button. Short lower creases follow the mouth commissure on either side.
  for(const side of [-1,1]){const p=shell(.82,side*.145),out=side*.006;p[2]+=out;tagged(g,4,()=>{ellipsoid(g,p,[.019,.018,.010],[.125,.132,.120],low,.55);ellipsoid(g,[p[0]+.002,p[1],p[2]+side*.007],[.014,.014,.005],[.012,.019,.019],low,.5);});
   tube(g,curve([V.add(p,[-.017,-.021,-side*.002]),[.15,.018,side*.202],[.174,-.045,side*.194]],low?2:4),.0015,[.045,.039,.037],low?4:6);
  }
  // Teeth originate just inside the corresponding gum, rather than lying as a
  // flat circular grill over the rim. Unequal lengths leave a clear central gape.
  for(const jaw of [0,1]){const count=jaw?13:11;for(let i=0;i<count;i++){const a=(jaw?Math.PI:0)+mix(-1.27,1.27,(i+.5)/count),r=rim(a),inward=V.norm([0,-(r[1]+.042),-r[2]*.72]),length=(jaw?.055:.045)+.050*(.5+.5*Math.cos(i*2.399+jaw))*(.55+.45*Math.abs(Math.cos(a))),base=[r[0]-.002,r[1]+inward[1]*.005,r[2]+inward[2]*.005],mid=V.add(base,[-.005,inward[1]*length*.53,inward[2]*length*.32]),tip=V.add(base,[-.034,inward[1]*length,inward[2]*length*.78]);tube(g,curve([base,mid,tip],low?2:4),t=>.0038*Math.pow(1-t,.72)+.00022,t=>blend([.49,.45,.33],[.70,.69,.54],t),low?4:6);}}
  // Flexible, thin fin membranes have rounded edges and individual supporting
  // rays. They remain double-sided geometry, not opaque solid paddles.
  const fan=(roots,edges)=>{tagged(g,3,()=>{fin(g,roots,edges,(i,side)=>blend([.085,.070,.055],[.16,.125,.084],.22+.12*Math.sin(i*.8)),.0006);for(let i=0;i<roots.length;i+=low?3:2)tube(g,[roots[i],V.lerp(roots[i],edges[i],.97)],.0012,[.19,.155,.106],low?4:5);});};
  const n=low?8:16,tailRoot=[],tailEdge=[],dorsalRoot=[],dorsalEdge=[];
  for(let i=0;i<=n;i++){const u=i/n;tailRoot.push([-.405,mix(-.033,.04,u),0]);tailEdge.push([-.493-.077*Math.sin(Math.PI*u),mix(-.13,.145,u),.003*Math.sin(Math.PI*u)]);dorsalRoot.push([mix(-.27,-.07,u),mix(.08,.19,u),0]);dorsalEdge.push([mix(-.325,-.045,u),.09+.18*Math.sin(.12+u*Math.PI*.81),0]);}fan(tailRoot,tailEdge);fan(dorsalRoot,dorsalEdge);
  for(const side of [-1,1]){const roots=[],edges=[];for(let i=0;i<=n;i++){const u=i/n;roots.push([mix(-.12,-.025,u),mix(-.065,-.11,u),side*mix(.180,.204,u)]);edges.push([mix(-.18,.005,u),-.145-.027*Math.sin(u*Math.PI),side*(.222+.092*Math.sin(u*Math.PI))]);}fan(roots,edges);}
  const stalk=curve([[.075,.232,0],[.085,.38,0],[.21,.48,0],[.35,.47,0],[.404,.394,0]],low?2:4);tagged(g,5,()=>tube(g,stalk,t=>.0075*(1-t*.40),[.22,.18,.137],low?6:9));tagged(g,6,()=>ellipsoid(g,[.405,.388,0],[.030,.039,.027],[.57,.76,.70],low,.75));
 }
 function crab(g,low){
  const orange=[.70,.31,.17],cream=[.84,.73,.55],paint=p=>blend(orange,cream,.10+.35*soft(.10,.80,Math.sin(p[0]*213)*Math.sin(p[2]*191)));
  ellipsoid(g,[-.018,.183,0],[.066,.047,.061],paint,low,1);ellipsoid(g,[.04,.171,0],[.038,.029,.041],orange,low,.6);
  for(const side of [-1,1]){tube(g,[[.047,.197,side*.022],[.079,.216,side*.039]],.007,orange,low?5:7);eye(g,[.080,.216,side*.040],.010,low);tube(g,[[.070,.190,side*.010],[.105,.203,side*.014]],t=>.008*(1-t*.94),cream,low?5:7);}
  // Eight walking legs, each a rigid sequence of joints; two anterior
  // chelipeds are separate limbs ending in opposed, curved claw fingers.
  tagged(g,5,()=>{for(const side of [-1,1])for(let i=0;i<4;i++){const x=.19-i*.123,base=[.033-i*.027,.173,side*.048],knee=[x*.55,.245-i*.009,side*(.223+i*.011)],ankle=[x,.098,side*(.422+i*.006)],tip=[x,.003,side*.497];const pts=[base,knee,ankle,tip];for(let j=0;j<3;j++){tube(g,[pts[j],pts[j+1]],t=>(.011-j*.0025)*(1-t*.27),t=>blend(orange,cream,soft(.54,.94,t)*.7),low?6:9);if(j<2)ellipsoid(g,pts[j+1],[.013-j*.002,.013-j*.002,.014-j*.002],cream,low,.45);}}
   for(const side of [-1,1]){const arm=[[.045,.163,side*.039],[.168,.124,side*.17],[.296,.098,side*.23]];tube(g,arm,t=>.013-t*.003,orange,low?6:9);ellipsoid(g,[.318,.102,side*.229],[.043,.019,.023],paint,low,.6);for(const finger of [-1,1])tube(g,curve([[.34,.104,side*.229+finger*.014],[.385,.106,side*.229+finger*.022],[.407,.107,side*.230+finger*.004]],low?2:3),t=>.009*(1-t*.85),cream,low?5:7);}
  });
  for(let i=0;i<(low?7:17);i++){const a=i*2.39996,r=.018+.033*((i*.618)%1),p=[-.018+Math.cos(a)*r,.225-.012*r/.05,Math.sin(a)*r];tube(g,[p,V.add(p,[0,.011+(i%3)*.002,0])],t=>.0045*(1-t*.92),cream,low?4:5);}
 }
 const builders={coelacanth,giant_squid:squid,pelican_eel:pelican,humpback_anglerfish:angler,japanese_spider_crab:crab};
 return {builders,ellipsoid,body,eye,tagged,tube,curve,fin,blend,soft,dark,ivory};
})();
const abyssEntries=[
 {id:'coelacanth',name:'腔棘魚',latin:'Latimeria chalumnae',en:'COELACANTH',size:1.5,color:0x496977,zone:5,naturalSize:'來源列可達約2 m；本模型全長1.5 m',hint:'厚實軀幹、成對肉質葉狀鰭，尾端多出一片中央尾葉。',detail:'腔棘魚具有肉質成對鰭與特殊的三葉尾形；本作採西印度洋種的鋼藍色。場景位置與洞穴巡游是原創配置，不代表自然族群分布。',source:'https://australian.museum/learn/animals/fishes/coelacanth-latimeria-chalumnae-smith-1939/',sourceLabel:'Australian Museum · Coelacanth',traits:{motion:'swim',contactDistance:2.7,observeDistance:20,targetRadius:.42,viewDistance:2.7},motionProfile:{speed:.26,beat:1.7,radius:3.8,bob:.22},aquarium:{cost:3}},
 {id:'giant_squid',name:'巨型烏賊',latin:'Architeuthis dux',en:'GIANT SQUID',size:8,color:0xa45b50,zone:5,naturalSize:'本模型含伸展捕食觸腕全長8 m；博物館館藏個體全長8.62 m',hint:'尖長外套膜、巨大側眼，八條較短腕與兩條末端膨大的長觸腕。',detail:'巨型烏賊的八條腕沿內側排列吸盤；另兩條較細長的捕食觸腕，在末端腕穗集中吸盤。模型使用原創褐紅體色，不使用大王酸漿魷的鉤爪特徵。遊戲深度不等於天然棲息深度。',source:'https://www.nhm.ac.uk/discover/giant-squid.html',sourceLabel:'Natural History Museum · Giant squid',traits:{motion:'swim',contactDistance:8,observeDistance:35,targetRadius:1.1,viewDistance:12.5},motionProfile:{speed:.40,beat:1.3,radius:4.2,bob:.35},aquarium:{cost:7}}
 ,{id:'pelican_eel',name:'吞鰻',latin:'Eurypharynx pelecanoides',en:'PELICAN EEL',size:.75,color:0x1f2835,zone:5,naturalSize:'來源列全長可達80 cm；模型全長75 cm',hint:'小眼睛位在巨大嘴部上方；身體延伸成帶有發光末端的細尾。',detail:'吞鰻也稱 gulper eel，具有可擴張的大口、細小牙齒和鞭狀尾。博物館列出天然棲息深度500–3000 m；本作縮小深淵的配置不是自然深度重現。',source:'https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/',sourceLabel:'Australian Museum · Pelican Eel',traits:{motion:'swim',contactDistance:1.8,observeDistance:12,targetRadius:.17,viewDistance:1.7},motionProfile:{speed:.13,beat:2.1,radius:1.8,bob:.12},aquarium:{cost:2}},
 {id:'humpback_anglerfish',name:'駝背鮟鱇',latin:'Melanocetus johnsonii',en:'HUMPBACK ANGLERFISH',size:.09,color:0x39281d,zone:5,naturalSize:'模型全長9 cm，採MBARI已觀察個體尺度；不是物種最大值',hint:'圓厚身體、向內彎的細長牙齒，頭上釣竿末端發著微光。',detail:'雌性駝背鮟鱇以頭頂誘餌吸引獵物。MBARI於2014年在蒙特雷灣約580 m深處拍到約9 cm個體；本模型以此尺度表現，誘餌亮度與移動軌跡為原創視覺設定。',source:'https://www.mbari.org/news/amazing-black-sea-devil-anglerfish-observed-in-monterey-bay/',sourceLabel:'MBARI · Black sea devil observation',traits:{motion:'hover',micro:true,contactDistance:.8,observeDistance:1.7,targetRadius:.048,viewDistance:.8},motionProfile:{speed:.015,beat:1.6,radius:.25,bob:.018},aquarium:{cost:1}},
 {id:'japanese_spider_crab',name:'日本蜘蛛蟹',latin:'Macrocheira kaempferi',en:'JAPANESE SPIDER CRAB',size:3,measureAxis:2,color:0xc77446,zone:5,naturalSize:'模型左右步足展幅3 m，並非甲殼長；館方資料列足展可達約3.7 m',hint:'小型梨形甲殼、八條細長步足，加上前方兩條帶螯的攝食肢。',detail:'日本蜘蛛蟹靠長而有關節的步足緩慢行走，另兩條螯足可處理食物。模型以3 m展幅與約40 cm甲殼長的比例製作；甲殼、眼柄、步足與成對螯均為原創幾何。',source:'https://www.aquariumofpacific.org/onlinelearningcenter/species/giant_spider_crab',sourceLabel:'Aquarium of the Pacific · Giant Spider Crab',traits:{motion:'crawl',contactDistance:3,observeDistance:20,targetRadius:.75,viewDistance:4.7},motionProfile:{speed:.075,beat:1.8,radius:1.4,bob:0},aquarium:{cost:4}}
];
// Authored material settings: roughness reduces broad plastic-like highlights;
// thin-fin transmission is evaluated by the renderer, not by transparent meshes.
const abyssMaterials={coelacanth:['fish',.70,.10,96],giant_squid:['cephalopod',.57,.30,32],pelican_eel:['fish',.72,.09,46],humpback_anglerfish:['fish',.81,.08,38],japanese_spider_crab:['crustacean',.73,.06,64]};
for(const entry of abyssEntries){const [skin,roughness,subsurface,patternScale]=abyssMaterials[entry.id];entry.materialProfile={skin,roughness,subsurface,patternScale};}
for(const entry of abyssEntries){faunaArt.builders[entry.id]=abyssArt.builders[entry.id];registerFauna({...entry,abyss:true,renderKind:10,bodyLength:1,traits:{micro:false,feedable:false,grabbable:false,...entry.traits}},ABYSS_SPECIES);}
// Small original schematic fallbacks; release JPEGs are rendered from the real
// geometry by the shared guide fixture, not external wildlife photographs.
(()=>{const drawings={
 coelacanth:'<path d="M43 82 Q91 46 155 62 L181 86 Q162 111 105 106 L49 93Z" fill="#597b85"/><path d="M117 64 L95 36 L73 66 M100 100 L91 126 L124 110 M148 96 L144 119 L169 109 M55 79 L26 49 L22 77 L9 84 L22 90 L24 121 L55 95" fill="#577683" stroke="#839b9c" stroke-width="2"/><circle cx="162" cy="77" r="4" fill="#142c36"/><path d="M175 89 L156 89" stroke="#193641" stroke-width="2"/>',
 giant_squid:'<path d="M12 80 Q29 65 88 70 L103 80 L87 91 Q30 94 12 80Z" fill="#a35955"/><path d="M22 77 L48 57 L52 74 M24 85 L47 107 L56 90" fill="#9c5b58"/><circle cx="94" cy="78" r="7" fill="#ded2ba"/><circle cx="96" cy="78" r="5" fill="#122732"/><g fill="none" stroke="#ba7971" stroke-linecap="round" stroke-width="3"><path d="M101 72 Q126 57 148 65 M102 76 Q126 65 150 74 M101 80 Q128 77 155 84 M101 83 Q130 85 151 94 M100 88 Q122 109 146 108 M104 72 Q140 40 183 51 M105 87 Q149 123 186 111"/></g><path d="M178 51 L193 55 M181 112 L197 108" stroke="#ba7971" stroke-width="7" stroke-linecap="round"/>',
 pelican_eel:'<path d="M17 92 Q52 72 91 94 L123 98 Q151 42 181 70 L182 112 Q144 136 111 103 Q75 96 50 95 Q26 106 17 92Z" fill="#263a49" stroke="#687c7c" stroke-width="1.3"/><path d="M128 101 Q151 68 179 76 L178 110 Q153 121 128 101Z" fill="#342b36"/><circle cx="174" cy="67" r="2.5" fill="#b4c4b0"/><circle cx="17" cy="92" r="3" fill="#a4d2af"/>',
 humpback_anglerfish:'<path d="M61 82 L29 61 L28 111 L65 100 Q70 47 118 51 Q150 52 166 88 Q152 126 105 120 Q69 117 61 82Z" fill="#625045"/><path d="M130 63 Q142 50 165 90 Q144 115 124 107Z" fill="#241f27"/><path d="M143 64 L140 91 L153 74 L151 98 M133 108 L143 86 L147 109 L158 93" fill="none" stroke="#d1c6a9" stroke-width="2"/><path d="M114 54 Q111 17 145 19 Q166 22 166 39" fill="none" stroke="#84715c" stroke-width="3"/><circle cx="167" cy="41" r="7" fill="#aed7c8"/><circle cx="127" cy="61" r="4" fill="#c3bc9a"/>',
 japanese_spider_crab:'<g fill="none" stroke="#ba8058" stroke-width="4" stroke-linecap="round"><path d="M87 77 L54 54 L18 102 L12 134 M91 88 L54 82 L26 115 L29 141 M92 93 L61 107 L54 132 L59 149 M95 99 L81 121 L80 143 M112 77 L148 54 L184 103 L191 134 M110 86 L146 81 L176 115 L175 141 M109 94 L142 106 L149 132 L145 149 M106 99 L119 122 L123 144 M90 73 L62 54 L71 28 M110 73 L140 54 L130 29"/></g><ellipse cx="100" cy="83" rx="19" ry="23" fill="#c6895d"/><path d="M69 36 L65 17 L76 24 M131 37 L137 18 L125 24" fill="none" stroke="#dfba80" stroke-width="5"/><circle cx="93" cy="60" r="3" fill="#203137"/><circle cx="108" cy="60" r="3" fill="#203137"/>'
 };for(const sp of ABYSS_SPECIES)sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 170"><rect width="210" height="170" rx="12" fill="#082634"/>'+drawings[sp.id]+'</svg>');})();
