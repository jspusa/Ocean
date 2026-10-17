function sculptedColony(type,lod,mound=false){
 const mesh=SCULPTED_CORAL[lod],g=new Geometry();g.material=3;g.shadow=false;
 const colors=[[.64,.57,.43],[.48,.51,.56],[.47,.57,.49],[.65,.49,.40],[.57,.60,.43],[.63,.51,.49]],col=colors[type%colors.length];
 const colorsV=mesh.positions.map((v,i)=>{const facing=mesh.normals[i][1],tip=smooth01((v[1]-.64)/.20)*Math.max(0,facing);return col.map(c=>mix(c*.94,.92,tip*.65));});
 const positions=mound?mesh.positions.map(p=>[p[0]*(1.12+p[1]*.38),p[1]*.64,p[2]*(1.12+p[1]*.38)]):mesh.positions;const normals=mound?mesh.normals.map(n=>V.norm([n[0]/1.25,n[1]/.64,n[2]/1.25])):mesh.normals;for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3);g.tri(...ids.map(n=>positions[n]),col,ids.map(n=>normals[n]),ids.map(n=>colorsV[n]));}return g;
}
function smooth01(x){x=clamp(x,0,1);return x*x*(3-2*x);}
/* TIDELIGHT 0.5 — runtime-friendly LOD meshes and smoothly tiled terrain.
   These are authored approximations, not surveyed bathymetry or scanned animals. */
function distantFishGeometry(s){
 const g=new Geometry();g.material=6;g.species=SPECIES.findIndex(x=>x.id===s.id);g.tag=1;g.shadow=false;
 const H=s.height,W=s.width;
 surface(g,(u,v)=>{const a=v*TAU,x=.57-u*1.1,h=Math.pow(Math.sin(Math.PI*u),.72);return [x,Math.cos(a)*h*H,Math.sin(a)*h*W];},12,8,p=>fishColor(s,...p),1);
 g.tag=3;const tail=['tang','idol'].includes(s.id)?[.96,.78,.16]:rgb(s.color);g.tri([-.47,0,0],[-.81,H*.8,0],[-.72,0,0],tail);g.tri([-.47,0,0],[-.72,0,0],[-.81,-H*.8,0],tail);
 for(const sign of [-1,1]){g.tri([.22,sign*H*.9,0],[-.42,sign*H*.75,0],[-.2,sign*H*1.3,0],tail);}
 g.tag=4;for(const side of [-1,1])g.sphere([.39,.06,side*W*.77],[.025,.027,.013],[.019,.022,.027],6,4);
 return g;
}
function distantTurtle(){const g=new Geometry();g.material=5;g.tag=1;g.sphere([-.16,-.012,0],[1.,.31,.70],[.55,.52,.32],26,14);g.tag=2;g.sphere([1.03,-.025,0],[.32,.14,.15],[.58,.61,.43],16,10);
 for(const side of [-1,1]){surface(g,(u,v)=>{const theta=v*TAU,span=u,w=.16+.15*Math.sin(span*Math.PI);return [.49-span*.51-span*span*.22+Math.cos(theta)*w*(1-span*.84),-.045-span*.045+Math.sin(theta)*.036*(1-span*.87),side*(.51+span*1.19)];},12,6,[.60,.62,.42],side===1?1:-1);g.tri([-.60,-.1,side*.40],[-1.30,-.14,side*.83],[-.81,-.12,side*.76],[.60,.62,.42]);}return g;}
function distantRay(){return rayGeometry(true);}
// One anatomy at both distances: the previous proxy changed body length, fin
// span and head shape at the LOD boundary, making an approaching whale pop.
function distantWhale(){return whaleGeometry(true);}
function addGroundTiles(r){
 const span=50,count=5;
 for(let iz=0;iz<count;iz++)for(let ix=0;ix<count;ix++){
  const cx=(ix-2)*span,cz=(iz-2)*span-42;const geo=new Geometry();geo.material=1;geo.shadow=true;
  const N=28;const p=(i,j)=>{let x=cx+(i/N-.5)*span,z=cz+(j/N-.5)*span;return [x-cx,groundHeight(x,z),z-cz];};
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let ps=[p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1)],ns=ps.map(q=>{const x=q[0]+cx,z=q[2]+cz;return V.norm([groundHeight(x-.12,z)-groundHeight(x+.12,z),.24,groundHeight(x,z-.12)-groundHeight(x,z+.12)]);});geo.tri(ps[0],ps[2],ps[1],[1,1,1],[ns[0],ns[2],ns[1]]);geo.tri(ps[0],ps[3],ps[2],[1,1,1],[ns[0],ns[3],ns[2]]);}
  let b=r.batch(geo,[{p:[cx,0,cz]}]);b.maxDistance=250;
 }
}
// Screen-projected caustics are already part of lighting, no baked shadow pictures.
// Crown-shaped branching colonies: curved stems, fine taper, rounded light growing tips.
function branchCoral(type=0){
 if(typeof SCULPTED_CORAL!=='undefined')return sculptedColony(type,reefDetailLevel?'high':'medium');
 const g=new Geometry();g.material=3;g.shadow=false;
 const palette=[[.82,.68,.44],[.48,.60,.76],[.48,.72,.66],[.87,.57,.49]],col=palette[type%4];
 const count=reefDetailLevel?64:12,sides=reefDetailLevel?6:4;
 if(!reefDetailLevel)g.sphere([0,.36,0],[.58,.28,.58],col.map(c=>c*.91),12,8,.075);
 for(let k=0;k<count;k++){
  const a=k*2.399963,r=Math.sqrt((k+.5)/count)*.72,h=.34+.43*Math.sqrt(1-r*r)+.035*Math.sin(k*3.7);
  const base=[Math.cos(a)*r*.47,.025,Math.sin(a)*r*.47];let prev=base;
  for(let j=1;j<=4;j++){const t=j/4,p=[Math.cos(a)*r*(.47+.53*t),h*t,Math.sin(a)*r*(.47+.53*t)];
   const shade=.72+.28*t;g.tube(prev,p,.039*(1-(j-1)/4*.61),.039*(1-t*.61),col.map(v=>v*shade),sides);prev=p;}
  const tip=col.map(v=>mix(v,.94,.45));g.sphere(prev,[.024,.037,.024],tip,sides,4);
  for(let b=0;b<2;b++){const a2=a+(b?-.8:.8),from=[Math.cos(a)*r*.88,h*.72,Math.sin(a)*r*.88],to=[prev[0]+Math.cos(a2)*.10,prev[1]-.035,prev[2]+Math.sin(a2)*.10];g.tube(from,to,.010,.005,tip,4);}
 }
 return g;
}
function tableCoral(type=0){
 const g=new Geometry();g.material=3;g.shadow=false;const col=type?[.64,.69,.62]:[.80,.67,.45];
 const lobes=reefDetailLevel?3:2;
 for(let k=0;k<lobes;k++){
  const cx=k===0?0:Math.cos(k*3.5)*.46,cz=k===0?0:Math.sin(k*3.5)*.46,h=.26+k*.20,radius=1.02-k*.13;
  g.tube([0,.015,0],[cx,h-.055,cz],.065,.035,col.map(v=>v*.73),7);
  const rim=a=>radius*(.89+.07*Math.sin(a*5+k*3)+.04*Math.sin(a*11-k));
  const fn=(u,v,under=false)=>{let a=u*TAU,r=v*rim(a);return [cx+Math.cos(a)*r,h+v*v*.095+.022*Math.sin(a*6+k)*v*v+(under?-.018:0),cz+Math.sin(a)*r];};
  surface(g,(u,v)=>fn(u,v),reefDetailLevel?56:32,reefDetailLevel?9:4,(p,u,v)=>col.map(c=>mix(c,.91,Math.pow(v,18)*.42)),1);
  surface(g,(u,v)=>fn(u,v,true),reefDetailLevel?40:24,3,col.map(c=>c*.84),-1);
  for(let j=0;j<(reefDetailLevel?64:36);j++){const a=j/(reefDetailLevel?64:36),b=(j+1)/(reefDetailLevel?64:36),p=fn(a,1),q=fn(b,1),pu=fn(a,1,true),qu=fn(b,1,true);g.quad(p,pu,qu,q,col.map(c=>mix(c,.93,.45)));}
 }
 return g;
}
// Optical-scale limestone: flatter strata, cracks and asymmetric ridges, rather than inflated spheres.
function rockGeometry(variant=0,low=false){
 const g=new Geometry();g.material=2;
 const form=(u,v)=>{let a=u*TAU,b=v*Math.PI,s=Math.sin(b);const cube=q=>Math.sign(q)*Math.pow(Math.abs(q),.58);
  let x=cube(s*Math.cos(a)),y=cube(Math.cos(b)),z=cube(s*Math.sin(a));
  const n=ridgeNoise(x*2.4+variant*5.1,y*2.7+variant,z*2.4),layer=y+.12*geoNoise(x*2,y*3,z*2);
  let f=.84+n*.30-.026*Math.pow(Math.abs(Math.sin(layer*12+variant)),8);
  return [x*f+.075*Math.sin(z*2+y*2+variant),y*f+.045*Math.sin(x*3-z*2),z*f+.055*Math.sin(y*3+x*2+variant)];};
 surface(g,form,low?16:42,low?10:28,[.94,.94,.89],1);return g;
}
// A small height field rasterized from the ACTUAL rock mesh aligns roots with visible geometry.
// Colonies no longer use a sphere guess, which buried half the previous model detail inside rocks.
const rockHeightCache=new Map(),placedReefRocks=[];
function rockSurfaceMap(variant){
 if(rockHeightCache.has(variant))return rockHeightCache.get(variant);
 const data=rockGeometry(variant).v,N=64,span=2.7,h=new Float32Array(N*N);h.fill(-Infinity);
 for(let k=0;k<data.length;k+=36){const ax=data[k],az=data[k+2],bx=data[k+12],bz=data[k+14],cx=data[k+24],cz=data[k+26];const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(det)<1e-8)continue;
  const i0=clamp(Math.floor((Math.min(ax,bx,cx)/span+.5)*(N-1)),0,N-1),i1=clamp(Math.ceil((Math.max(ax,bx,cx)/span+.5)*(N-1)),0,N-1),j0=clamp(Math.floor((Math.min(az,bz,cz)/span+.5)*(N-1)),0,N-1),j1=clamp(Math.ceil((Math.max(az,bz,cz)/span+.5)*(N-1)),0,N-1);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i/(N-1)-.5)*span,z=(j/(N-1)-.5)*span,u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det,w=1-u-v;if(u>=-.005&&v>=-.005&&w>=-.005)h[j*N+i]=Math.max(h[j*N+i],data[k+1]*u+data[k+13]*v+data[k+25]*w);}}
 const result={h,N,span};rockHeightCache.set(variant,result);return result;
}
function rockTop(item,variant,x,z){const {h,N,span}=rockSurfaceMap(variant);const dx=x-item.p[0],dz=z-item.p[2],a=item.yaw||0,c=Math.cos(a),s=Math.sin(a),lx=(c*dx-s*dz)/item.s[0],lz=(s*dx+c*dz)/item.s[2];
 const i=Math.round((lx/span+.5)*(N-1)),j=Math.round((lz/span+.5)*(N-1));if(i<0||i>=N||j<0||j>=N)return -Infinity;return item.p[1]+h[j*N+i]*item.s[1];}
function rootHeight(x,z){let y=groundHeight(x,z);for(const a of placedReefRocks){if(Math.abs(x-a.item.p[0])>a.item.s[0]*1.7||Math.abs(z-a.item.p[2])>a.item.s[2]*1.7)continue;y=Math.max(y,rockTop(a.item,a.variant,x,z));}return y+.035;}
// Silhouette-first reef LODs preserve open branches, scallops and sponge cavities.
function distantColony(type){
 const g=new Geometry();g.shadow=false;g.material=3;
 const colors=[[.61,.54,.43],[.49,.53,.52],[.45,.53,.47],[.60,.51,.37],[.53,.56,.46],[.66,.59,.42],[.69,.42,.30],[.42,.35,.40],[.61,.49,.41],[.55,.56,.45],[.57,.49,.46]],col=colors[type];
 if(type===3||type===4){
  for(let k=0;k<3;k++){const radius=1-k*.18,h=.13+k*.155,cx=Math.cos(k*3.5)*k*.13,cz=Math.sin(k*3.5)*k*.14;
   surface(g,(u,v)=>{const a=u*TAU,r=v*radius*(.86+.065*Math.sin(a*5+k)+.045*Math.sin(a*9+k*4));return [cx+Math.cos(a)*r,h+.18*v*v+.035*Math.sin(a*5+k)*v*v*v,cz+Math.sin(a)*r];},20,4,col,1);
  }g.tube([0,0,0],[0,.5,0],.07,.035,col,5);
 }else if(type===5){return brainCoral(true);}
 else if(type===7){return spongeGeometry(true);}
 else if(type===6){return seaFanGeometry(true);}
 else{
  const mound=type>8,branches=mound?18:15;
  for(let k=0;k<branches;k++){
   const a=k*2.39996,r=Math.sqrt((k+.5)/branches)*.65,h=(.51+.22*Math.sqrt(1-r*r))*(mound?.76:1),base=[Math.cos(a)*r*.42,.015,Math.sin(a)*r*.42],fork=[Math.cos(a)*r*.80,h*.69,Math.sin(a)*r*.80];
   g.tube(base,fork,.043,.028,col.map(c=>c*.83),4);
   for(let j=0;j<2;j++){const az=a+(j?-.62:.62),tip=[Math.cos(a)*r+Math.cos(az)*.052,h+Math.sin(k*3.1)*.035,Math.sin(a)*r+Math.sin(az)*.052];g.tube(fork,tip,.027,.016,col,4);}
  }
 }
 return g;
}
// A fan grows from a holdfast into a lobed, anastomosing crown. The perforated
// tissue follows this outline instead of the previous circular membrane card.
function seaFanGeometry(low=false){
 const g=new Geometry();g.material=7;g.shadow=false;const color=[.63,.33,.23],arms=low?9:13;
 g.tube([0,-.045,0],[0,.26,0],.038,.027,color,7);
 const reach=a=>1.20+.13*Math.cos(a*3)+.045*Math.sin(a*13);
 const point=(a,v)=>{const r=reach(a)*v;return [Math.sin(a)*r,.16+Math.cos(a)*r,Math.sin(a*2.8)*r*.045+.055*r*r];};
 for(let k=0;k<arms;k++){
  const a=-1.29+k/(arms-1)*2.56;let prev=[0,.15,0];
  for(let j=1;j<=5;j++){
   const q=point(a,j/5);g.tube(prev,q,.021*(1-(j-1)/6),.021*(1-j/6),color,low?4:5);prev=q;
   if(j>1&&j<5){const twig=point(a+(k%2?.11:-.11),Math.min(1,j/5+.16));g.tube(q,twig,.006,.0028,color.map(c=>c*1.1),4);}
  }
 }
 if(!low){
  g.tag=21;surface(g,(u,v)=>point(-1.29+u*2.56,v),44,14,[.65,.35,.23],1);
 }else{
  for(let ring=2;ring<6;ring++)for(let k=0;k<arms-1;k++){const a=-1.29+k/(arms-1)*2.56;g.tube(point(a,ring/5),point(a+2.56/(arms-1),ring/5),.0035,.0035,color,3);}
 }
 g.tag=0;return g;
}
function fanCoral(){return seaFanGeometry(!reefDetailLevel);}
// Barrel walls, rim and dark inner bowl are actual geometry, visible from above.
function spongeGeometry(low=false){
 const g=new Geometry();g.material=8;g.shadow=true;
 const cups=[[0,0,.82,.32],[-.42,.12,.63,.20],[.31,-.31,.48,.15]],ns=low?12:28,nv=low?6:15;
 for(let k=0;k<cups.length;k++){
  const [cx,cz,h,rad]=cups[k],col=k===0?[.43,.35,.27]:[.48,.39,.29];
  const rim=a=>1+.045*Math.sin(a*9+k)+.035*Math.sin(a*4-k);
  const top=a=>h*(1+.031*Math.sin(a*5+k)+.021*Math.cos(a*8));
  const outside=(a,v)=>{const r=rad*(.79+.34*Math.sin(v*Math.PI*.82))*rim(a);return [cx+Math.cos(a)*r+.08*v*v,top(a)*v,cz+Math.sin(a)*r];};
  surface(g,(u,v)=>outside(u*TAU,v),ns,nv,(p,u,v)=>col.map(c=>c*(.76+.22*v+.06*Math.sin(u*TAU*7))),-1);
  surface(g,(u,v)=>{const a=u*TAU,t=.35+v*.65,r=rad*(.79+.34*Math.sin(t*Math.PI*.82))*rim(a)*.77;return [cx+Math.cos(a)*r+.08*t*t,top(a)*t,cz+Math.sin(a)*r];},ns,low?3:8,(p,u,v)=>col.map(c=>c*(.25+.29*v)),1);
  for(let j=0;j<ns;j++){
   const a=j/ns*TAU,b=(j+1)/ns*TAU,outerA=outside(a,1),outerB=outside(b,1),inner=p=>[cx+.08+(p[0]-cx-.08)*.77,p[1],cz+(p[2]-cz)*.77];
   g.quad(outerA,outerB,inner(outerB),inner(outerA),col.map(c=>c*1.08));
   const bottom=a=>[cx+Math.cos(a)*rad*.72+.010,h*.35,cz+Math.sin(a)*rad*.72];
   g.tri([cx+.010,h*.31,cz],bottom(a),bottom(b),col.map(c=>c*.24));
  }
 }
 return g;
}
function brainCoral(low=false){
 const g=new Geometry();g.material=4;g.shadow=true;
 surface(g,(u,v)=>{const a=u*TAU,b=v*Math.PI,sy=Math.sin(b),x=Math.cos(a)*sy,z=Math.sin(a)*sy;
  const f=1+.06*Math.sin(a*5)*sy*sy+.036*Math.sin(a*9+b*3);return [x*.73*f,.20+Math.cos(b)*.60*f,z*.68*f];
 },low?18:46,low?12:30,[.64,.58,.39],1);return g;
}
// Ribbon leaves have a tapered tip and twisted midrib; anchored roots stay still.
function grass(){
 const g=new Geometry();g.material=9;g.shadow=false;
 for(let k=0;k<20;k++){
  const a=k*2.39996,h=.30+.51*random(),r=.035+.17*random(),curl=.18+.28*random(),width=.016+.014*random();
  const cx=Math.cos(a)*r,cz=Math.sin(a)*r,col=[.25+random()*.06,.36+random()*.08,.20+random()*.045];
  surface(g,(u,v)=>{const angle=a+v*.55,leaf=(u-.5)*width*Math.pow(1-v,.55),lean=v*v*curl;
   return [cx+Math.cos(a)*lean+Math.cos(angle)*leaf,h*v-.08*v*v,cz+Math.sin(a)*lean+Math.sin(angle)*leaf];
  },2,8,(p,u,v)=>col.map(c=>c*(.69+.31*v)),1);
 }
 return g;
}
