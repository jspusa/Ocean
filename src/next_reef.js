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
function distantRay(){const g=new Geometry();g.material=6;g.tag=1;surface(g,(u,v)=>{const z=(u*2-1)*1.90,w=1-Math.abs(z)/1.90;return [.50-v*(.72+w*.96)-Math.abs(z)*.32,.04+Math.sin(v*Math.PI)*.13*w,z];},24,12,[.25,.31,.33],1);g.tube([-1.1,.06,0],[-3.25,-.05,0],.027,.002,[.13,.18,.20],5);return g;}
function distantWhale(){const g=new Geometry();g.material=10;g.tag=1;surface(g,(u,v)=>{const a=v*TAU,x=3.8-u*9.5,q=Math.pow(Math.sin(u*Math.PI),.70)*(1-u*.30);return [x,Math.cos(a)*q*.96,Math.sin(a)*q*.93];},42,18,[.24,.29,.30],1);for(const side of [-1,1]){g.tri([1.,-.4,side*.62],[-1.2,-.65,side*2.7],[-.8,-.36,side*.90],[.38,.44,.43]);g.tri([-5.3,0,0],[-6.4,.1,side*2.4],[-6.1,.05,side*.4],[.22,.26,.28]);}return g;}
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
function distantColony(type){
 
 const g=new Geometry();g.shadow=false;g.material=3;
 const colors=[[.61,.54,.43],[.49,.53,.52],[.45,.53,.47],[.60,.51,.37],[.53,.56,.46],[.66,.59,.42],[.69,.42,.30],[.42,.35,.40],[.61,.49,.41],[.55,.56,.45],[.57,.49,.46]];let col=colors[type];
 if(type===3||type===4){for(let k=0;k<2;k++){const radius=1-k*.22,h=.3+k*.25;surface(g,(u,v)=>{let a=u*TAU,r=v*radius;return [Math.cos(a)*r,h+.08*v*v,Math.sin(a)*r];},16,3,col,1);}g.tube([0,0,0],[0,.55,0],.05,.02,col,5);}
 else if(type===5){g.material=4;g.sphere([0,.24,0],[.76,.65,.65],col,12,8);}
 else if(type===7){g.material=8;for(let k=0;k<4;k++){let a=k*2.4;g.tube([Math.cos(a)*.25,0,Math.sin(a)*.25],[Math.cos(a)*.25,.7+.12*Math.sin(k),Math.sin(a)*.25],.11,.12,col,6);}}
 else if(type===6){g.material=7;for(let k=0;k<7;k++){let a=(k/6-.5)*2.5;g.tube([0,0,0],[Math.sin(a)*1.,Math.cos(a)*1.2,0],.014,.003,col,3);}}
 else{g.sphere([0,.32,0],[.60,.27,.60],col.map(c=>c*.88),10,6);for(let k=0;k<7;k++){const a=k*2.4,r=Math.sqrt(k/7)*.63,h=.50+Math.sqrt(1-r*r)*.23;g.tube([Math.cos(a)*r*.65,0,Math.sin(a)*r*.65],[Math.cos(a)*r,h,Math.sin(a)*r],.043,.025,col,4);}}
 return g;
}

// A perforated membrane connects the main branches; this is geometric/procedural, not a photo card.
function fanCoral(){const g=structuralFanCoral();g.tag=21;g.shadow=false;
 surface(g,(u,v)=>{const a=u*TAU,r=v*(1+.055*Math.sin(a*5)+.022*Math.sin(a*13));return [Math.cos(a)*r*1.04,.66+Math.sin(a)*r*.67,Math.sin(a*4)*r*.014];},48,14,[.64,.30,.17],1);g.tag=0;return g;}
