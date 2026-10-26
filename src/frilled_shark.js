/* Original Chlamydoselachus anguineus, +X anterior, one unit total length.
 * Morphology references: docs/parity/FRILLED-SHARK-REFERENCE.md. Pigment,
 * representative size and animation cadence are authored game choices. */
const FrilledSharkArt=(()=>{
 const blend=cetaceanArt.blend,soft=cetaceanArt.soft,skin=cetaceanArt.skin;
 const brown=[.34,.255,.19],belly=[.46,.38,.29],dark=[.12,.085,.06];
 const rows=[[-.5,0,0,0],[-.44,.002,.011,.003],[-.36,0,.020,.006],[-.27,-.002,.029,.013],[-.15,0,.044,.022],[0,.004,.055,.033],[.13,.004,.055,.036],[.25,.006,.055,.038],[.33,.006,.049,.044],[.40,.006,.039,.041],[.465,-.002,.030,.035],[.5,-.004,.028,.035]];
 const paint=p=>{const tone=1+.022*Math.sin(p[0]*29+Math.sin(p[2]*17))*Math.sin(p[1]*31+p[0]*7)+.010*Math.sin(p[0]*13-p[2]*28);return blend(brown,belly,(1-soft(-.048,.012,p[1]))*.68).map(v=>v*tone);};
 function shell(u,v){const x=mix(-.5,.5,u),b=cetaceanArt.profileAt(rows,x),a=v*TAU;return [x-.13*soft(.28,.5,x)*Math.pow(Math.abs(Math.sin(a)),1.2),b[1]+Math.cos(a)*b[2],Math.sin(a)*b[3]];}
 function body(g,low){const begin=g.v.length;g.tag=1;skin(g,shell,low?36:72,low?16:28,paint);
  for(let k=begin;k<g.v.length;k+=12)if(Math.abs(g.v[k]+.5)<1e-9){g.v[k+3]=-1;g.v[k+4]=g.v[k+5]=0;}
 }
 function gills(g,low){g.tag=5;
  for(let i=0;i<6;i++){
   const x=.286-i*.026;
   // The first continuous lower arc connects the left and right gill fringes.
   // Five later pairs end separately on either side above the throat.
   for(const side of i?[1,-1]:[1]){
    const count=i?(low?7:12):(low?18:28),root=[],edge=[];
    for(let j=0;j<=count;j++){
     const t=j/count,a=i?side*mix(.31*Math.PI,.87*Math.PI,t):mix(.31*Math.PI,1.69*Math.PI,t),c=Math.cos(a),s=Math.sin(a),taper=Math.sin(t*Math.PI),along=x+.0033*Math.sin(a*1.4+i*.25)*taper,b=cetaceanArt.profileAt(rows,along),fold=.0035*(.84+.16*Math.cos(a*9+i*.55))*taper,warp=.13*soft(.28,.5,along)*Math.pow(Math.abs(s),1.2),width=(.0028+.0046*Math.pow(taper,.7))*(.88+.12*Math.cos(a*8+i*.6));
     root.push([along-warp,b[1]+c*(b[2]+.0006),s*(b[3]+.0006)]);edge.push([along-warp-width,b[1]+c*(b[2]+.001+fold),s*(b[3]+.001+fold)]);
    }
    // The fringe is folded skin, not a dark painted band. Both faces inherit
    // neighbouring body pigment; only the narrow underlying recess is dark.
    faunaArt.fin(g,root,edge,(j,face)=>paint(V.mul(V.add(root[j],edge[j]),.5)).map(v=>v*(face>0?1.03:.94)),.00045);
    faunaArt.tube(g,root,.00055,dark,low?3:4);
   }
  }
 }
 function fins(g,low){
  const fin=(rows,vertical=false)=>{g.tag=3;skin(g,(u,v)=>{const [x,y,z,w,h]=marineRow(rows,u),a=v*TAU;return vertical?[x+Math.cos(a)*Math.max(0,w),y,z+Math.sin(a)*Math.max(0,h)]:[x+Math.cos(a)*Math.max(0,w),y+Math.sin(a)*Math.max(0,h),z];},low?7:14,low?6:10,paint);};
  for(const side of [-1,1]){
   fin([[.125,-.026,side*.028,.027,.008],[.095,-.046,side*.062,.032,.005],[.064,-.054,side*.089,.022,.003],[.034,-.052,side*.105,0,0]]);
   fin([[-.12,-.027,side*.020,.035,.007],[-.155,-.050,side*.050,.029,.004],[-.184,-.057,side*.061,.016,.002],[-.205,-.056,side*.064,0,0]]);
  }
  fin([[-.235,.030,0,.052,.005],[-.260,.060,0,.043,.004],[-.294,.080,0,.024,.002],[-.325,.081,0,0,0]],true);
  fin([[-.268,-.025,0,.058,.005],[-.290,-.066,0,.050,.003],[-.322,-.094,0,.029,.002],[-.352,-.095,0,0,0]],true);
  g.tag=3;
  for(const side of [-1,1]){
   const root=[],edge=[],n=low?12:22;
   for(let i=0;i<=n;i++){const t=i/n,x=mix(-.32,-.5,t),b=cetaceanArt.profileAt(rows,x);root.push([x,b[1]+side*b[2],0]);edge.push([x,b[1]+side*(b[2]+(side>0?.024:.015)*Math.sin(Math.PI*t)),0]);}
   faunaArt.fin(g,root,edge,brown,.0005);
  }
 }
 function eyes(g,low){g.tag=4;
  for(const side of [-1,1]){
   const p=shell(.93,side*.17);p[2]+=side*.0015;
   faunaArt.ellipsoid(g,p,[.0058,.0050,.0030],[.32,.28,.20],low?8:12,low?5:8);
   faunaArt.ellipsoid(g,[p[0]+.0004,p[1],p[2]+side*.002],[.0038,.0036,.0014],[.018,.020,.018],low?8:12,low?5:7);
  }
 }
 function mouth(g,low){g.tag=1;const begin=g.v.length,throat=[.31,-.004,0],rim=a=>shell(1,a/TAU);
  skin(g,(u,v)=>{const r=rim(v*TAU),s=Math.sin(u*Math.PI*.5);return [mix(throat[0],r[0],Math.pow(u,1.5)),mix(throat[1],r[1],s),r[2]*s];},low?5:9,low?16:28,[.115,.066,.052]);
  // Concave lining faces the open mouth, in both the colour and shadow pass.
  for(let k=begin;k<g.v.length;k+=36){const b=g.v.slice(k+12,k+24),c=g.v.slice(k+24,k+36);g.v.splice(k+12,24,...c,...b);for(const j of [0,12,24])for(let i=3;i<6;i++)g.v[k+j+i]*=-1;}
  faunaArt.tube(g,Array.from({length:(low?20:36)+1},(_,i)=>V.add(rim(i/(low?20:36)*TAU),[-.0015,0,0])),.0014,[.39,.28,.21],low?4:5);
  g.tag=5;
  for(const jaw of [0,1])for(let tooth=0;tooth<9;tooth++)for(const cusp of [-1,0,1]){
   const a=jaw*Math.PI+mix(-1.18,1.18,tooth/8)+cusp*.043,r=rim(a),c=Math.cos(a),s=Math.sin(a),length=cusp===0?.017:.0125,base=[r[0]-.0015,r[1]-c*.002,r[2]-s*.002];
   const points=[base,V.add(base,[-.002,-c*length*.47,-s*length*.47]),V.add(base,[-.008,-c*length,-s*length])];
   faunaArt.tube(g,points,t=>.00105*Math.pow(1-t,.85)+.00006,[.73,.65,.49],low?3:5);
  }
 }
 function build(g,low){body(g,low);gills(g,low);fins(g,low);eyes(g,low);mouth(g,low);g.tag=1;}
 return {build};
})();
faunaArt.builders.frilled_shark=FrilledSharkArt.build;
const FRILLED_SHARK_COLLECTION=[];
const FRILLED_SHARK_SPECIES=registerFauna({id:'frilled_shark',name:'皺鰓鯊',latin:'Chlamydoselachus anguineus',en:'FRILLED SHARK',frilledShark:true,renderKind:11,zone:5,size:1.7,modelUnitLength:1,bodyLength:1,color:0x68503c,naturalSize:'本作代表個體全長 1.7 m；非物種最大值',habitat:'自然棲於大陸坡深水；本作相遇區為約 900 m 岩壁旁。',hint:'細長褐色身軀、六對褶鰓與短吻大口；小背鰭靠近延長的尾部。',detail:'皺鰓鯊的第一對褶鰓在喉下相連，口中有向內彎的三尖齒，後方只有一片低背鰭。牠通常出現在大陸坡深水。本作一隻 1.7 m 個體、約 900 m 的巡游路線和緩慢身尾波動均為原創配置。',source:'https://fishesofaustralia.net.au/home/species/3419',sourceLabel:'Museums Victoria · Frill Shark',traits:{motion:'swim',micro:false,feedable:false,grabbable:false,observeDistance:16,contactDistance:2.0,targetRadius:.75,viewDistance:3.5},motionProfile:{type:'frilled_shark',speed:.10,beat:1.35,radius:2.8},materialProfile:{skin:'fish',roughness:.68,subsurface:.05,patternScale:95},aquarium:{cost:3}},FRILLED_SHARK_COLLECTION);
FRILLED_SHARK_SPECIES.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#08232e"/><path d="M23 118Q79 97 155 88L287 79Q341 68 388 85L397 97 382 112Q336 131 280 124L154 121Q70 119 23 118Z" fill="#68503c"/><path d="M103 98Q107 71 131 78L153 91M110 122Q120 149 153 133L173 123M246 115Q244 151 264 148L291 119" fill="#584334"/><g fill="none" stroke="#aa8662" stroke-width="2"><path d="M290 86Q280 102 290 119M301 85Q291 101 301 120M312 84Q301 101 311 119M323 83Q312 102 321 119M334 82Q323 102 331 117M345 82Q334 100 341 114"/></g><path d="M390 96L365 100 382 108" fill="#34261f"/><circle cx="365" cy="88" r="4" fill="#1b1916"/><text x="20" y="188" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">FRILLED SHARK · ORIGINAL ART</text></svg>');
