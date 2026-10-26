/* Original Macropinna microstoma; +X anterior, one unit total length.
 * Biological observations and authored limits: BARRELEYE-REFERENCE.md.
 * Tags: 1 body, 3 fin, 4 entire ocular assembly, 5 nares/mouth, 8 clear crown.
 * The eye rig rotates XY about (.24,.045), retaining each eye's own Z. */
const BarreleyeArt=(()=>{
 const dark=[.105,.135,.130],belly=[.245,.260,.220],finColor=[.19,.225,.195],silver=[.39,.435,.405],green=[.155,.295,.165];
 const paint=p=>{const ventral=cetaceanArt.soft(.02,-.13,p[1]),forehead=cetaceanArt.soft(.17,.42,p[0])*.32,grain=Math.sin(p[0]*83+p[2]*31)*Math.sin(p[1]*97-p[2]*37)*.008;return cetaceanArt.blend(cetaceanArt.blend(dark,belly,ventral*.68),[.30,.32,.27],forehead).map(v=>v+grain);};
 function exterior(g,begin){
  for(let k=begin;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),n=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);if(V.dot(V.cross(V.sub(b,a),V.sub(c,a)),n)<0){const second=g.v.slice(k+12,k+24);for(let i=0;i<12;i++){g.v[k+12+i]=g.v[k+24+i];g.v[k+24+i]=second[i];}}}
 }
 function tube(g,points,radius,color,low){const start=g.v.length;faunaArt.tube(g,points,radius,color,low?4:5);exterior(g,start);}
 function ellipsoid(g,center,r,color,low,detail=1,shear=0){
  const begin=g.v.length;faunaArt.ellipsoid(g,center,r,color,Math.max(8,4*Math.round((low?12:24)*detail/4)),Math.max(4,2*Math.round((low?7:12)*detail/2)));
  // Local affine shear makes flat paired fins slope from their attachment.
  // Apply its inverse transpose to the normal before returning the real mesh.
  for(let k=begin;k<g.v.length;k+=12){
   if(shear){g.v[k+1]+=shear*(g.v[k+2]-center[2]);const n=V.norm([g.v[k+3],g.v[k+4],g.v[k+5]-shear*g.v[k+4]]);for(let i=0;i<3;i++)g.v[k+3+i]=n[i];}
   if(typeof color==='function'){const c=color(g.v.slice(k,k+3));for(let i=0;i<3;i++)g.v[k+6+i]=c[i];}
  }
  // The shared legacy ellipsoid relies on indexGeometry to repair winding.
  // This model also exposes raw subranges, so emit exterior winding already.
  exterior(g,begin);
 }
 function surface(g,point,rows,columns,color){
  const grid=Array.from({length:rows+1},(_,i)=>Array.from({length:columns+1},(_,j)=>point(i/rows,j/columns)));
  const put=(a,b,c)=>{const f=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(f)<1e-11)return;if(V.dot(f,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];const cols=typeof color==='function'?[a,b,c].map(q=>color(q.p)):null;g.tri(a.p,b.p,c.p,cols?cols[0]:color,[a.n,b.n,c.n],cols);};
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1];put(a,b,c);put(a,c,d);}
 }
 function body(g,low){
  const rows=[[-.415,-.025,0,0],[-.39,-.025,.026,.025],[-.33,-.024,.045,.036],[-.26,-.021,.103,.078],[-.16,-.025,.140,.110],[-.035,-.031,.145,.126],[.085,-.035,.137,.128],[.155,-.038,.112,.122],[.215,-.040,.059,.114],[.29,-.049,.039,.110],[.385,-.058,.035,.085],[.465,-.062,.024,.042],[.496,-.065,0,0]];
  const point=(x,a)=>{const r=cetaceanArt.profileAt(rows,x);return [x,r[1]+Math.cos(a)*r[2],Math.sin(a)*r[3]];};
  g.tag=1;cetaceanArt.skin(g,(u,v)=>point(mix(-.415,.496,u),v*TAU),low?28:48,low?12:24,paint);
  // Thin gill-cover folds follow the continuous body surface instead of
  // joining several visibly overlapping primitive bodies.
  for(const side of [-1,1]){
   const path=Array.from({length:low?7:13},(_,i)=>{const t=i/(low?6:12),a=mix(.34,2.74,t),x=.10+.025*Math.sin(t*Math.PI),p=point(x,a);p[2]=side*(Math.abs(p[2])+.0007);return p;});
   tube(g,path,.00125,[.075,.105,.094],low);
   // A low tissue seat joins each ocular base to the head. The eye above
   // remains visible through the open chamber and rotates independently.
   ellipsoid(g,[.237,.003,side*.074],[.038,.026,.035],p=>cetaceanArt.blend([.22,.255,.215],[.32,.355,.295],cetaceanArt.soft(-.023,.029,p[1])),low,.65);
   ellipsoid(g,[.393,-.030,side*.048],[.045,.032,.026],paint,low,.55);
  }
 }
 function fan(g,root,tips,normal,low,tone=1){
  const columns=(tips.length-1)*(low?1:2),rows=low?2:4,edge=u=>{const q=clamp(u,0,1)*(tips.length-1),i=Math.min(tips.length-2,Math.floor(q));return V.lerp(tips[i],tips[i+1],q-i);};
  const shape=(u,t)=>{const base=V.add(root,V.mul(V.sub(tips.at(-1),tips[0]),(u-.5)*.05)),p=V.lerp(base,edge(u),t);return V.add(p,V.mul(normal,Math.sin(Math.PI*t)*Math.sin(Math.PI*u)*.003));};
  const sample=(u,t,side)=>{const p=shape(u,t),du=V.sub(shape(Math.min(1,u+.0001),t),shape(Math.max(0,u-.0001),t)),dt=V.sub(shape(u,Math.min(1,t+.0001)),shape(u,Math.max(0,t-.0001)));let n=V.norm(V.cross(du,dt));if(V.dot(n,normal)<0)n=V.mul(n,-1);return {p:V.add(p,V.mul(normal,side*.00055)),n:V.mul(n,side)};};
  const pigment=p=>{const d=V.dist(p,root),v=.82+.18*Math.min(1,d/.25);return finColor.map(c=>c*tone*v);};
  for(const side of [-1,1])surface(g,(u,t)=>sample(u,t,side),columns,rows,pigment);
  // Rays radiate from the anatomical root and separate into a broad fan.
  // A darker thin membrane lies between them; neither parallel sticks nor
  // a thick oval paddle supplies the outline.
  const rays=(tips.length-1)*(low?1:2);
  for(let i=0;i<=rays;i++){
   const u=i/rays,points=Array.from({length:low?4:6},(_,j)=>{const t=j/(low?3:5),p=shape(u,t);return V.add(p,V.mul(normal,.0009));});
   tube(g,points,t=>.0014*Math.pow(1-t,.85),[.245*tone,.275*tone,.235*tone],low);
  }
 }
 function fins(g,low){
  g.tag=3;
  for(const side of [-1,1]){
   fan(g,[.025,-.105,side*.105],[[.06,-.12,.14],[-.025,-.145,.28],[-.13,-.18,.34],[-.235,-.185,.31],[-.28,-.16,.23],[-.20,-.13,.125]].map(p=>[p[0],p[1],p[2]*side]),[0,1,0],low);
   fan(g,[.145,-.023,side*.118],[[.15,-.018,.145],[.10,-.012,.23],[.035,-.020,.267],[-.015,-.04,.235],[.015,-.052,.16]].map(p=>[p[0],p[1],p[2]*side]),[0,1,0],low,.91);
  }
  fan(g,[-.19,.085,0],[[-.29,.07,0],[-.27,.17,0],[-.22,.235,0],[-.17,.242,0],[-.115,.19,0],[-.06,.11,0]],[0,0,1],low,.78);
  fan(g,[-.20,-.125,0],[[-.30,-.08,0],[-.27,-.185,0],[-.20,-.22,0],[-.11,-.20,0],[-.045,-.14,0]],[0,0,1],low,.84);
  fan(g,[-.395,-.025,0],[[-.414,.017,0],[-.465,.10,0],[-.5,.115,0],[-.49,.04,0],[-.475,-.022,0],[-.49,-.08,0],[-.5,-.14,0],[-.455,-.12,0],[-.414,-.06,0]],[0,0,1],low,1.04);
 }
 function eyes(g,low){
  g.tag=4;
  const rows=[[.012,0,0,0],[.027,0,.022,.020],[.050,0,.028,.026],[.085,0,.032,.029],[.12,0,.036,.032],[.15,0,.042,.037],[.17,0,.046,.041]];
  for(const side of [-1,1]){
   // One continuous ocular surface runs from the tissue seat to the curved
   // green optical dome. Pigment changes across the tissue; there is no
   // separate flat pupil disk or stack of articulated spherical joints.
   const point=(u,v)=>{let y,rx,rz;if(u<.78){y=mix(.012,.17,u/.78);const r=cetaceanArt.profileAt(rows,y);rx=r[2];rz=r[3];}else{const a=(u-.78)/.22*Math.PI*.5;y=.17+Math.sin(a)*.037;rx=Math.cos(a)*.046;rz=Math.cos(a)*.041;}return [.24+Math.cos(v*TAU)*rx,y,side*.074+Math.sin(v*TAU)*rz];};
   const ocular=p=>{const tissue=cetaceanArt.blend([.24,.285,.245],silver,cetaceanArt.soft(.025,.105,p[1])),lens=cetaceanArt.soft(.145,.179,p[1]),edge=.94+.06*Math.cos((p[0]-.24)*31)*Math.cos((p[2]-side*.074)*29),top=cetaceanArt.soft(.185,.207,p[1])*.07;return cetaceanArt.blend(tissue,green.map(c=>c*(edge-top)),lens);};
   cetaceanArt.skin(g,point,low?12:26,low?12:20,ocular);
  }
 }
 function face(g,low){
  g.tag=5;
  for(const side of [-1,1]){
   // The nares have an actual inset centre and a continuous shallow rim.
   // They are anterior to, and anatomically separate from, the green eyes.
   surface(g,(u,v)=>{const a=v*TAU,c=Math.cos(a),s=Math.sin(a);return {p:[.446+.017*u*u,-.017+c*.018*u,side*.048+s*.016*u],n:V.norm([1,-2*.017*u*c/.018,-2*.017*u*s/.016])};},low?3:5,low?12:20,[.025,.035,.029]);
   surface(g,(u,v)=>{const a=v*TAU,c=Math.cos(a),s=Math.sin(a),r=1+u*.14;return {p:[.463-.006*u,-.017+c*.018*r,side*.048+s*.016*r],n:V.norm([1,c*.35,s*.35])};},1,low?12:20,[.23,.265,.22]);
  }
  ellipsoid(g,[.496,-.065,0],[.004,.011,.019],[.028,.035,.026],low,.65);
 }
 const shells=new WeakMap();
 function crown(g,low){
  g.tag=8;const first=g.v.length/12;
  // Convex upper ellipsoid, with its open lower rim embedded in the head.
  // Exterior winding and analytic normals are retained before indexing.
  surface(g,(u,v)=>{const a=u*Math.PI*.5,b=v*TAU,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];return {p:[.25+n[0]*.235,-.035+n[1]*.315,n[2]*.175],n:V.norm([n[0]/.235,n[1]/.315,n[2]/.175])};},low?6:12,low?16:32,[.62,.76,.69]);
  shells.set(g,{first,count:g.v.length/12-first});
 }
 function build(g,low){body(g,low);fins(g,low);eyes(g,low);face(g,low);crown(g,low);g.tag=1;}
 function attachments(g){if(!g.transparentShell){const range=shells.get(g);if(range)g.transparentShell=Object.freeze({...range});}return g;}
 return {build,attachments};
})();
faunaArt.builders.barreleye=BarreleyeArt.build;
const BARRELEYE_COLLECTION=[];
const BARRELEYE_SPECIES=registerFauna({id:'barreleye',name:'桶眼魚',latin:'Macropinna microstoma',en:'BARRELEYE',barreleye:true,renderKind:11,zone:3,size:.14,modelUnitLength:1,bodyLength:1,color:0x39473d,naturalSize:'本作代表個體全長 14 cm；非物種最大值',habitat:'北太平洋中層水域；本作相遇位置約 700 m。',hint:'透明頭罩內是朝上看的綠色管眼；嘴上方的兩個黑點是嗅覺器官。',detail:'桶眼魚的管狀眼能在透明頭罩內由朝上轉向前方，大片平展魚鰭協助穩定懸停。綠色晶狀體不以自發光呈現。本作 14 cm 個體、約 700 m 位置、移動與眼動節奏都是原創配置，不代表野外密度或精確生理週期。',source:'https://www.mbari.org/animal/barreleye-fish/',sourceLabel:'MBARI · Barreleye fish',traits:{motion:'hover',micro:true,feedable:false,grabbable:false,observeDistance:3,contactDistance:.35,targetRadius:.09,viewDistance:.55},motionProfile:{type:'barreleye',speed:.006,beat:1.35,radius:.055,bob:.008},materialProfile:{skin:'fish',roughness:.42,subsurface:.025,patternScale:95},aquarium:{cost:2}},BARRELEYE_COLLECTION);
BARRELEYE_SPECIES.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#08232e"/><path d="M44 100L28 68 26 134 54 115Q108 142 199 127L309 118 313 109 286 93Q244 63 189 77L62 96Z" fill="#435346"/><path d="M212 99C210 42 296 39 320 87L329 108 285 111Z" fill="#a7d0ba" fill-opacity=".25" stroke="#86aca0" stroke-width="2"/><path d="M239 104L239 70M274 102L274 68" stroke="#a3b7a6" stroke-width="14"/><ellipse cx="239" cy="68" rx="13" ry="9" fill="#67965a"/><ellipse cx="274" cy="66" rx="13" ry="9" fill="#67965a"/><path d="M168 124Q107 172 68 153L132 110M213 113Q199 150 174 148L191 109M111 91Q136 52 177 77" fill="#6e8572" fill-opacity=".65"/><ellipse cx="304" cy="100" rx="5" ry="4" fill="#182d27"/><path d="M325 111L316 112" stroke="#172a22" stroke-width="3"/><text x="20" y="189" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">BARRELEYE · ORIGINAL ART</text></svg>');
const geometryBeforeBarreleye=faunaGeometry;
faunaGeometry=function(speciesOrId,lod=false){const g=geometryBeforeBarreleye(speciesOrId,lod);return SPECIES[g.species]?.id==='barreleye'?BarreleyeArt.attachments(g):g;};
