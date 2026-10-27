/* Original Grimpoteuthis sp.; +Y mantle, -Y arm crown, +X face, +/-Z fins.
 * One model unit is the resting mantle-and-arm-crown height, not mantle length.
 * Tags: 1 mantle, 3 paired ear fins, 4 eyes, 5 arms/web/suckers/cirri.
 * Biology and authored limits: docs/parity/DUMBO-OCTOPUS-REFERENCE.md. */
const DumboOctopusArt=(()=>{
 const skin=[.69,.42,.35],pale=[.82,.62,.51],inside=[.66,.43,.37];
 const paint=p=>{const speckle=.014*Math.sin(p[0]*81+p[2]*29)*Math.sin(p[1]*93-p[2]*41),warm=.25+.15*Math.cos(p[1]*5)+.10*Math.sin(p[0]*8+p[2]*5);return cetaceanArt.blend(skin,pale,warm).map(c=>c+speckle);};
 function exterior(g,begin,color){
  for(let k=begin;k<g.v.length;k+=12)if(typeof color==='function'){const c=color(g.v.slice(k,k+3));for(let i=0;i<3;i++)g.v[k+6+i]=c[i];}
  for(let k=begin;k<g.v.length;k+=36){const a=g.v.slice(k,k+3),b=g.v.slice(k+12,k+15),c=g.v.slice(k+24,k+27),n=[0,1,2].map(i=>g.v[k+3+i]+g.v[k+15+i]+g.v[k+27+i]);if(V.dot(V.cross(V.sub(b,a),V.sub(c,a)),n)<0){const v=g.v.slice(k+12,k+24);for(let i=0;i<12;i++){g.v[k+12+i]=g.v[k+24+i];g.v[k+24+i]=v[i];}}}
 }
 function tube(g,points,radius,color,sides){const start=g.v.length;faunaArt.tube(g,points,radius,typeof color==='function'?color(points[0]):color,sides);exterior(g,start,color);}
 function surface(g,point,rows,columns,color,normal){
  const sample=(u,v)=>{const p=point(u,v),du=V.sub(point(Math.min(1,u+.0001),v),point(Math.max(0,u-.0001),v)),dv=V.sub(point(u,v+.0001),point(u,v-.0001));let n=V.cross(du,dv);const reference=normal(u,v,p);if(V.len(n)<1e-10)n=reference;else if(V.dot(n,reference)<0)n=V.mul(n,-1);return {p,n:V.norm(n),c:typeof color==='function'?color(p):color};};
  const grid=Array.from({length:rows+1},(_,i)=>Array.from({length:columns+1},(_,j)=>sample(i/rows,j/columns)));
  const put=(a,b,c)=>{const cross=V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p));if(V.len(cross)<1e-11)return;if(V.dot(cross,V.add(V.add(a.n,b.n),c.n))<0)[b,c]=[c,b];g.tri(a.p,b.p,c.p,a.c,[a.n,b.n,c.n],[a.c,b.c,c.c]);};
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1];put(a,b,c);put(a,c,d);}
 }
 function mantle(g,low){
  g.tag=1;
  const profile=[[-.14,0,0,0],[-.08,0,.17,.17],[-.02,0,.205,.205],[.12,0,.235,.235],[.28,0,.225,.225],[.42,0,.16,.16],[.5,0,0,0]];
  surface(g,(u,v)=>{const y=.5-.64*u,r=cetaceanArt.profileAt(profile,y)[2],a=v*TAU;return [r*Math.cos(a),y,r*Math.sin(a)];},low?12:24,low?16:32,paint,(u,v,p)=>u<.00001?[0,1,0]:u>.99999?[0,-1,0]:[p[0],(p[1]-.18)*.5,p[2]]);
 }
 function ears(g,low){
  g.tag=3;
  // Two complete tapered foils grow from the upper mantle. Rounded leading
  // and trailing edges close the fins without a second overlapping sheet.
  // An authored resting pitch raises each leading edge so the closed foil
  // remains readable from the face. This angle is not a biological measure.
  // Span coordinates and both attachment points stay fixed for the fin rig.
  const restPitch=.6,cp=Math.cos(restPitch),sn=Math.sin(restPitch);
  for(const side of [-1,1])surface(g,(u,v)=>{const a=v*TAU,w=.13*Math.sin(Math.PI*u),thickness=.017*Math.sin(Math.PI*u),chord=Math.cos(a)*w,normal=Math.sin(a)*thickness;return [-.018+.045*u+cp*chord-sn*normal,.16+.08*u+sn*chord+cp*normal,side*(.17+.39*u)];},low?8:16,low?8:12,paint,(u,v)=>{const x=Math.cos(v*TAU),y=Math.sin(v*TAU)*3;return [cp*x-sn*y,sn*x+cp*y,side*(u<.5?-.15:.15)];});
 }
 function armPoint(t,a){const r=.17+.225*Math.sin(t*Math.PI*.5);return [Math.cos(a)*r,-.06-.44*t,Math.sin(a)*r];}
 function crown(g,low){
  g.tag=5;
  // The scalloped interbrachial web is an open umbrella with an actual inner
  // surface. Its edge ends above the eight distinct free arm tips.
  for(const side of [-1,1])surface(g,(u,v)=>{const a=v*TAU,lobe=Math.pow(.5+.5*Math.cos(a*8),2),p=armPoint(u*(.60+.24*lobe),a);return [p[0]+Math.cos(a)*side*.0017,p[1],p[2]+Math.sin(a)*side*.0017];},low?4:8,low?32:64,side>0?paint:inside,(u,v)=>[Math.cos(v*TAU)*side,-.65*side,Math.sin(v*TAU)*side]);
  for(let i=0;i<8;i++){const a=i*TAU/8,points=Array.from({length:(low?6:12)+1},(_,j)=>armPoint(j/(low?6:12),a));tube(g,points,t=>.023*Math.pow(1-t,.85),paint,low?4:6);}
 }
 function oralDetails(g,low){
  g.tag=5;
  for(let i=0;i<8;i++){
   const a=i*TAU/8,normal=V.norm([-Math.cos(a)*.85,-.6,-Math.sin(a)*.85]),across=[-Math.sin(a),0,Math.cos(a)],along=V.cross(normal,across);
   const seat=t=>V.add(armPoint(t,a),V.mul(normal,.023*Math.pow(1-t,.85)));
   // One recessed suction cup row per arm, with no invented second row.
   // The inner face rises to its rim; it is not a flat bright dot on the skin.
   const count=low?3:5;
   for(let j=0;j<count;j++){
    const t=.22+j*.60/(count-1),center=seat(t),radius=.012*(1-t*.55);
    surface(g,(u,v)=>V.add(V.add(center,V.mul(normal,.001+.007*u*u)),V.add(V.mul(across,Math.cos(v*TAU)*radius*u),V.mul(along,Math.sin(v*TAU)*radius*u))),low?2:3,low?6:8,[.78,.67,.57],()=>normal);
   }
   // Cirri are slender soft projections beside the oral row. These are not
   // hooks, spines or the two elongated collecting filaments of Vampyroteuthis.
   const pairs=low?2:4;
   for(let j=0;j<pairs;j++)for(const side of [-1,1]){
    const t=.25+j*.48/(pairs-1),root=V.add(seat(t),V.mul(across,side*.017*(1-t*.3))),tip=V.add(root,V.add(V.mul(normal,.035),V.mul(across,side*.016))),points=low?[root,tip]:[root,V.add(V.lerp(root,tip,.55),V.mul(along,.008)),tip];
    tube(g,points,u=>.0025*(1-u),[.83,.68,.59],low?3:4);
   }
  }
 }
 function eyes(g,low){
  g.tag=4;
  for(const side of [-1,1])for(const lens of [false,true]){
   const start=g.v.length;
   faunaArt.ellipsoid(g,lens?[.175,-.005,side*.164]:[.15,-.005,side*.15],lens?[.032,.038,.019]:[.047,.051,.028],lens?[.025,.030,.032]:[.31,.25,.23],low?8:12,low?4:8);exterior(g,start);
  }
 }
 function build(g,low){mantle(g,low);ears(g,low);crown(g,low);oralDetails(g,low);eyes(g,low);g.tag=1;}
 return {build};
})();
faunaArt.builders.dumbo_octopus=DumboOctopusArt.build;
const DUMBO_OCTOPUS_COLLECTION=[];
const DUMBO_OCTOPUS_SPECIES=registerFauna({id:'dumbo_octopus',name:'小飛象章魚',latin:'Grimpoteuthis sp.',en:'DUMBO OCTOPUS',dumboOctopus:true,originalAddition:true,renderKind:11,zone:5,size:.20,measureAxis:1,modelUnitLength:1,bodyLength:1,color:0xbc8f80,naturalSize:'本作代表個體含外套與腕冠高 20 cm；非最大值或精確種級量測',habitat:'深海近底水層；本作相遇位置約 3,600 m。',hint:'外套上的一對耳狀鰭輕拍，八腕之間的蹼緩緩張開；腕內側可見單排吸盤與細絲狀 cirri。',detail:'小飛象章魚這個俗名涵蓋不同深海有鰭章魚；本個體只鑑定到 Grimpoteuthis 屬。模型保留成對外套鰭、八腕間的蹼、單排吸盤與 cirri，不具有吸血烏賊的兩條細攝食絲。20 cm 尺度、3,600 m 配置、顏色、鰭面傾角與動作節律是原創設計，並非野外密度或精確生理週期。',source:'https://nautiluslive.org/video/2026/08/07/micronesian-dumbo-octopus-shows-camera',sourceLabel:'Ocean Exploration Trust · Grimpoteuthis',traits:{motion:'hover',micro:false,feedable:false,grabbable:false,observeDistance:6,contactDistance:.6,targetRadius:.12,viewDistance:.9},motionProfile:{type:'dumbo_octopus',speed:.012,beat:1.1,radius:.16,bob:.035},materialProfile:{skin:'cephalopod',roughness:.64,subsurface:.32,patternScale:22},aquarium:{cost:2}},DUMBO_OCTOPUS_COLLECTION);
DUMBO_OCTOPUS_SPECIES.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><rect width="240" height="180" fill="#092732"/><path d="M95 71Q44 17 50 65Q61 91 95 87M145 71Q196 17 190 65Q179 91 145 87" fill="#b77e73"/><path d="M91 100C80 76 88 29 120 25C152 29 160 76 149 100L169 143Q157 145 150 134Q139 150 132 140Q120 157 108 140Q101 150 90 134Q83 145 71 143Z" fill="#c79d8c"/><ellipse cx="99" cy="91" rx="8" ry="9" fill="#332b2b"/><ellipse cx="141" cy="91" rx="8" ry="9" fill="#332b2b"/><path d="M88 110L73 143M101 110L92 145M116 112L112 149M128 112L131 147M141 110L150 145M151 107L168 142" fill="none" stroke="#a37469" stroke-width="3"/><text x="13" y="167" font-family="sans-serif" font-size="8" letter-spacing="1" fill="#9ab3b6">GRIMPOTEUTHIS SP. · ORIGINAL ART</text></svg>');
