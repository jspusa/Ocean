/* TIDELIGHT 0.5 — original sculpted procedural assets.
   All colonies, geology and diver forms below are authored for this project.
   This is an imagined reef, not photogrammetry or Nintendo geometry. */
let reefDetailLevel=1;
let reefAnemoneHome=[-5.6,-9.1,1];
function reefAnemoneHabitat(surfaces){
 const instance={p:[-5.6,0,1],s:[.78,.84,.82],phase:1},[x,,z]=instance.p,scale=instance.s;
 // Reuse the exact high-detail meshes already submitted for this rock patch.
 // Only this attached animal is fitted; neighbouring colonies keep their roots.
 const nearby=surfaces.filter(({instance:p})=>Math.abs(x-p.p[0])<p.s[0]*1.7+1&&Math.abs(z-p.p[2])<p.s[2]*1.7+1);
 const top=(x,z)=>{let y=-Infinity;for(const s of nearby)y=Math.max(y,OceanRockContact.heightOn(s.geometry,s.instance,x,z));if(!Number.isFinite(y))throw Error('Anemone has no rendered rock support');return y;};
 instance.p[1]=top(x,z);const roots=[];let highest=instance.p[1];
 const geometry=anemoneGeometry((lx,lz)=>{const px=x+lx*scale[0],pz=z+lz*scale[2],y=top(px,pz);highest=Math.max(highest,y);roots.push([px,y,pz]);return (y-instance.p[1])/scale[1]-.022;});
 // Kind 3 sways only positive local heights. Keep every foot below that plane
 // while preserving its world position, so water motion cannot detach it.
 const rootPlane=highest+.03,shift=(instance.p[1]-rootPlane)/scale[1];
 for(let k=1;k<geometry.v.length;k+=12)geometry.v[k]+=shift;instance.p[1]=rootPlane;
 return {geometry,instance,roots,home:[x,highest,z]};
}
function geoHash(x,y,z){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function geoNoise(x,y,z){let ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);return mix(mix(mix(geoHash(ix,iy,iz),geoHash(ix+1,iy,iz),fx),mix(geoHash(ix,iy+1,iz),geoHash(ix+1,iy+1,iz),fx),fy),mix(mix(geoHash(ix,iy,iz+1),geoHash(ix+1,iy,iz+1),fx),mix(geoHash(ix,iy+1,iz+1),geoHash(ix+1,iy+1,iz+1),fx),fy),fz);}
function ridgeNoise(x,y,z){return .58*geoNoise(x,y,z)+.25*geoNoise(x*2.1+2,y*2.1+8,z*2.1)+.12*geoNoise(x*4.3,y*4.3,z*4.3)+.05*geoNoise(x*9,y*9,z*9);}
function rockGeometry(variant=0,low=false){const g=new Geometry();g.material=2;const form=(u,v)=>{let a=u*TAU,b=v*Math.PI,s=Math.sin(b);let nx=s*Math.cos(a),ny=Math.cos(b),nz=s*Math.sin(a);const cube=q=>Math.sign(q)*Math.pow(Math.abs(q),.84);let x=cube(nx),y=cube(ny),z=cube(nz);let n=ridgeNoise(x*3.1+variant*8.3,y*3.4+variant,z*3.1-variant);let cut=1-Math.pow(Math.abs(Math.sin((y+ridgeNoise(x*2,y,z*2)*.25)*9+variant)),14)*.043;let f=(.69+n*.66)*cut;return [x*f+.055*Math.sin(z*4+y*3+variant),y*f+.085*(geoNoise(x*4+variant,y*3,z*4)-.5),z*f];};surface(g,form,low?14:36,low?10:26,[.88,.90,.87],1);return g;}
function branchCoral(type=0){const g=new Geometry();g.material=3;const colors=[[.78,.65,.43],[.51,.55,.73],[.57,.73,.66],[.85,.58,.47]],base=colors[type%4];
 function limb(p,d,len,r,depth){let q=p.slice();let curve=[rr(-.12,.12),rr(-.04,.04),rr(-.12,.12)],end;
 for(let k=1;k<=3;k++){let t=k/3;end=V.add(p,V.add(V.mul(d,len*t),V.mul(curve,len*t*t)));let col=base.map(c=>c*(.68+.26*(1-depth/4)+.06*t));g.tube(q,end,r*(1-(k-1)/3*.34),r*(1-t*.34),col,6);q=end;}
 if(depth<=0){g.tube(V.lerp(p,end,.87),V.add(end,V.mul(d,r*.45)),r*.70,r*.47,base.map(c=>mix(c,.87,.57)),6);return;}
 const n=depth>2?3:2;for(let k=0;k<n;k++){let a=k/n*TAU+rr(-.6,.6)+p[1]*3.1;let nd=V.norm([d[0]*.40+Math.cos(a)*.53,rr(.48,.96),d[2]*.40+Math.sin(a)*.53]);limb(end,nd,len*rr(.65,.82),r*.64,depth-1);}}
 for(let k=0;k<(reefDetailLevel?6:4);k++){let a=k/(reefDetailLevel?6:4)*TAU;limb([Math.cos(a)*.14,0,Math.sin(a)*.14],V.norm([Math.cos(a)*.77,1,Math.sin(a)*.77]),rr(.19,.33),rr(.038,.057),reefDetailLevel?3:2);}
 return g;}
function cauliflowerCoral(type=0){if(typeof SCULPTED_CORAL!=='undefined')return sculptedColony(type?5:4,reefDetailLevel?'high':'medium',true);const g=new Geometry();g.material=3;let col=type?[.83,.53,.53]:[.67,.72,.50];
 for(let j=0;j<(reefDetailLevel?64:28);j++){let a=j*2.39996,r=Math.sqrt(j/(reefDetailLevel?64:28))*.69,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.26+Math.sqrt(Math.max(0,1-r*r))*.34;let p=[x*.8,.02,z*.8],q=[x,h,z];g.tube(p,q,.042,.034,col.map(c=>c*.80),7);for(let k=0;k<3;k++){let b=a+k*TAU/3;let e=[x+Math.cos(b)*.055,h+rr(.055,.16),z+Math.sin(b)*.055];g.tube(q,e,.028,.019,col,6);g.tube(e,V.add(e,[0,.015,0]),.019,.009,col.map(c=>mix(c,.85,.25)),5);}}
 return g;}
function tableCoral(type=0){let g=new Geometry();g.material=3;let col=type?[.60,.65,.56]:[.77,.67,.45];
 g.tube([0,0,0],[0,.64,0],.15,.07,col.map(c=>c*.6),9);
 for(let k=0;k<(reefDetailLevel?3:2);k++){let radius=1.05-k*.24,phase=k*1.91,arc=TAU*(k%2?.76:.97),h=.26+k*.26;
 const fn=(u,v,off=0)=>{let a=phase+u*arc,r=radius*v*(.91+.10*Math.sin(a*3+2*k)+.045*Math.sin(a*9-k));return [Math.cos(a)*r+.15*Math.sin(k),h+.12*v*v+Math.sin(a*5+k)*.035*v+Math.sin(a*25+v*8)*.007*v+off,Math.sin(a)*r];};
 surface(g,(u,v)=>fn(u,v),reefDetailLevel?36:24,reefDetailLevel?10:4,(p,u,v)=>{let tip=Math.pow(v,16);let sh=.83+.08*v;return col.map(c=>mix(c*sh,.87,tip*.28));},-1);
 surface(g,(u,v)=>fn(u,v,-.024),reefDetailLevel?24:16,2,col.map(c=>c*.54),1);
 for(let i=0;i<68;i++){const a=fn(i/68,1),b=fn((i+1)/68,1);g.quad(a,b,[b[0],b[1]-.024,b[2]],[a[0],a[1]-.024,a[2]],col.map(c=>mix(c,.8,.30)));}
 }
 return g;}
function structuralFanCoral(){const g=new Geometry();g.material=7;const col=[.85,.43,.27];let tips=[];
 function grow(p,ang,len,rad,dep){let end=[p[0]+Math.sin(ang)*len,p[1]+Math.cos(ang)*len,p[2]+.021*Math.sin(p[1]*3+ang)];let mid=V.lerp(p,end,.5);mid[0]+=.023*Math.sin(ang*4);g.tube(p,mid,rad,rad*.80,col,5);g.tube(mid,end,rad*.80,rad*.65,col,5);if(dep){grow(end,ang+rr(.13,.38),len*.78,rad*.65,dep-1);grow(end,ang-rr(.13,.38),len*.77,rad*.65,dep-1);}else tips.push(end);}
 for(let j=0;j<8;j++)grow([0,0,0],(j/7-.5)*2.5,.37,.030,reefDetailLevel?3:2);
 tips.sort((a,b)=>Math.atan2(a[0],a[1]) - Math.atan2(b[0],b[1]));for(let i=1;i<tips.length;i++){if(V.dist(tips[i],tips[i-1])<.19)g.tube(tips[i],tips[i-1],.0028,.0025,col,4);}return g;}
function archGeometry(){let g=new Geometry();g.material=2;g.rockContact={kind:'arch',closed:false,key:'reef-arch'};
 surface(g,(u,v)=>{let a=(u*.91+.045)*Math.PI,b=v*TAU,r=1.03+.26*Math.sin(a*6+b*2)+.19*Math.cos(b*5-a*3)+.30*geoNoise(Math.cos(a)*9,Math.sin(a)*9,b*2);return [Math.cos(a)*(4.4+Math.cos(b)*r),Math.sin(a)*(4.6+Math.cos(b)*r),Math.sin(b)*r*1.55+.20*Math.sin(a*6)];},94,30,[.92,.93,.88],1);return g;}
function diverGeometry(){const g=new Geometry();g.material=11;const suit=[.15,.18,.20],panel=[.22,.26,.29],trim=[.77,.66,.34],rubber=[.023,.033,.035],metal=[.61,.64,.61],skin=[.58,.43,.34];
 g.tag=0;g.sphere([0,-.025,-.015],[.275,.20,.52],suit,36,26);g.sphere([0,-.02,.40],[.255,.19,.22],suit,30,20);
 // Buoyancy compensator with separate side cells and shoulder harness.
 for(let side of [-1,1]){g.sphere([side*.19,.13,-.025],[.12,.17,.45],panel,28,20);g.tube([side*.22,.21,-.44],[side*.235,-.06,-.26],.047,.047,rubber,10);g.box([side*.255,.02,.05],[.026,.17,.27],rubber);g.tag=1;g.box([side*.279,.03,.04],[.012,.050,.065],metal);g.tag=0;}
 g.tag=1;g.tube([0,.255,-.39],[0,.255,.36],.139,.139,metal,40);g.sphere([0,.255,-.40],[.138,.138,.113],metal,30,18);g.sphere([0,.255,.37],[.138,.138,.093],metal,30,18);
 g.tag=0;for(let z of [-.21,.21])g.tube([0,.255,z-.030],[0,.255,z+.030],.145,.145,rubber,30);
 g.tag=1;g.tube([0,.255,-.48],[0,.255,-.59],.047,.027,metal,14);g.tube([-.046,.255,-.55],[.066,.255,-.55],.018,.018,metal,12);g.tag=0;g.sphere([.068,.255,-.55],[.034,.03,.025],rubber,18,12);
 // Hood and anatomical neck; separate mask lenses and regulated breathing hose.
 g.tube([0,-.025,-.42],[0,-.02,-.66],.113,.108,skin,24);g.sphere([0,-.015,-.76],[.179,.193,.208],suit,38,26);g.tag=3;g.sphere([0,-.017,-.865],[.144,.137,.135],skin,30,24);
 g.tag=0;for(let side of [-1,1]){g.sphere([side*.080,.04,-.96],[.089,.077,.027],rubber,22,18);g.tag=2;g.sphere([side*.080,.045,-.981],[.069,.053,.009],[.14,.25,.23],22,16);g.tag=0;}
 g.sphere([0,-.073,-.978],[.073,.045,.037],rubber,20,16);g.tube([-.19,.055,-.79],[-.19,.07,-.63],.022,.022,rubber,10);g.tube([.19,.055,-.79],[.19,.07,-.63],.022,.022,rubber,10);
 const hose=[[.04,-.06,-.978],[.27,-.05,-.95],[.39,.025,-.73],[.36,.19,-.56],[.20,.33,-.48],[.04,.28,-.55]];
 for(let i=0;i<hose.length-1;i++)g.tube(hose[i],hose[i+1],.018,.018,rubber,9);
 // Flutter-kick legs are marked by vertex tags and articulated in the vertex shader.
 for(let side of [-1,1]){g.tag=side<0?10:11;g.tube([side*.15,-.045,.36],[side*.19,-.075,.98],.123,.087,suit,20);g.sphere([side*.19,-.075,.98],[.09,.081,.10],panel,22,14);g.tube([side*.19,-.075,.98],[side*.235,-.12,1.45],.082,.053,suit,18);g.sphere([side*.23,-.10,1.43],[.07,.075,.13],rubber,22,14);
 const fin=(u,v)=>{let z=1.45+v*.67,w=(.105+.065*Math.sin(v*Math.PI*.7))*(1-.25*Math.pow(v,8));return [side*.235+(u-.5)*w*2,-.13-.024*v+.045*(u-.5)*(u-.5),z];};surface(g,fin,14,20,(p,u,v)=>Math.abs(u-.5)>.39?rubber:trim,1);surface(g,(u,v)=>{let p=fin(u,v);p[1]-=.015;return p;},10,12,rubber,-1);
 for(let rib of [-.07,.07])g.tube([side*.235+rib,-.12,1.54],[side*.235+rib*1.7,-.115,2.05],.009,.005,rubber,7);
 g.tag=side<0?12:13;g.tube([side*.20,-.025,-.39],[side*.405,-.20,-.33],.083,.063,suit,18);g.sphere([side*.405,-.20,-.33],[.065,.065,.07],panel,18,12);g.tube([side*.405,-.20,-.33],[side*.38,-.28,-.69],.063,.047,suit,18);g.sphere([side*.38,-.28,-.72],[.068,.043,.106],rubber,22,14);
 for(let j=0;j<4;j++)g.tube([side*.38+(j-1.5)*.025,-.282,-.75],[side*.38+(j-1.5)*.025,-.276,-.843+Math.abs(j-1.5)*.012],.012,.008,rubber,8);
 }
 return g;}
// Layered, irregular ridges, not a grid of identical stones and evenly scattered animals.
function buildReef(r){seed=441072;obstacles.length=0;reefPatches.length=0;addGroundTiles(r);
 let lastRock=null,lastRockVariant=0;const rocks=[[],[],[],[]],corals=Array.from({length:11},()=>[]),rubble=[],grassItems=[];
 const centers=[[-7,6,2.65],[-10,-1,3.0],[-11,-8,3.1],[-14,-17,3.2],[8,0,2.8],[11,-8,3.0],[12,-19,3.2],[21,-23,4.0],[-21,-24,3.1],[-22,9,3.2],[20,4,3.4],[-30,-13,4.5],[29,-8,4.3]];
 function putRock(x,z,sx,sy,sz,variant,dy=0){let y=groundHeight(x,z)+dy;let item={p:[x,y,z],s:[sx,sy,sz],yaw:rr(0,TAU),tint:[rr(.92,1.06),rr(.93,1.04),rr(.91,1.06)]};rocks[variant%4].push(item);lastRock=item;lastRockVariant=variant%4;placedReefRocks.push({item,variant:variant%4});obstacles.push({p:item.p.slice(),s:[sx*.89,sy*.90,sz*.90]});return y;}
 centers.forEach(([cx,cz,scale],ci)=>{for(let k=0;k<7;k++){let a=k*2.39996+ci,rad=k?Math.sqrt(k)*1.56:0,x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad*.83,sx=scale*rr(.53,1.05),sy=sx*rr(.45,.91),sz=sx*rr(.68,1.1),y=putRock(x,z,sx,sy,sz,(k+ci)%4,.06);
 reefPatches.push({x,z,y:y+sy*.90,rx:sx*.76,rz:sz*.76});
 // Colonies grow in patches of similar form with occasional contrasting forms.
 for(let j=0;j<6;j++){let a=j*2.39996+rr(-.18,.18),d=rr(.18,.74),px=x+Math.cos(a)*sx*d,pz=z+Math.sin(a)*sz*d,py=rockTop(lastRock,lastRockVariant,px,pz)+.025;if(!Number.isFinite(py))py=y+sy*.95;let type=j<3?[0,3,9,2,10][ci%5]:Math.floor(rr(0,11));let sc=rr(.40,.88);if(type===6)sc*=1.2;if(type===3||type===4)sc*=1.18;corals[type].push({p:[px,py,pz],s:[sc,sc*rr(.83,1.18),sc],yaw:rr(0,TAU),phase:rr(0,TAU),tint:[rr(.90,1.05),rr(.90,1.07),rr(.93,1.05)]});}
 }});
 // Low coral carpets bridge the bare boulders; carbonate fragments collect at the edges.
 for(let i=0;i<650;i++){const c=centers[i%centers.length],a=rr(0,TAU),rad=rr(1,8),x=c[0]+Math.cos(a)*rad,z=c[1]+Math.sin(a)*rad,sz=rr(.035,.21);rubble.push({p:[x,groundHeight(x,z)+.016,z],s:[sz,sz*rr(.36,.72),sz*rr(.6,1.7)],yaw:rr(0,TAU),tint:[rr(.83,1.08),rr(.87,1.02),rr(.86,1.03)]});}
 for(const group of corals)for(const colony of group)colony.p[1]=rootHeight(colony.p[0],colony.p[2]);
 // Keep massive plates and branches from growing through one another. Resolve before compilation.
 const occupied=[{p:[-4.3,rootHeight(-4.3,5.5),5.5],radius:1.55},{p:[6.1,rootHeight(6.1,-2.5),-2.5],radius:1.40}];
 for(const type of [3,4,5,9,10,0,1,2,8,7,6]){const kept=[];
  for(const c of corals[type]){const rad=([3,4].includes(type)?.90:type===6?.46:.56)*c.s[0];const initial=c.p.slice();let accepted=false;
   for(let attempt=0;attempt<6;attempt++){if(attempt){const a=c.yaw+attempt*2.39996,r=.40+attempt*.21;c.p[0]=initial[0]+Math.cos(a)*r;c.p[2]=initial[2]+Math.sin(a)*r;c.p[1]=rootHeight(c.p[0],c.p[2]);}
    if(c.p[1]<groundHeight(c.p[0],c.p[2])+.20)continue;
    // Keep this attached anemone's tentacles clear of neighbouring colonies.
    if(Math.hypot(c.p[0]+5.6,c.p[2]-1)<.84+rad*1.3)continue;
    if(!occupied.some(o=>Math.abs(o.p[1]-c.p[1])<.82&&Math.hypot(o.p[0]-c.p[0],o.p[2]-c.p[2])<.78*(o.radius+rad))){accepted=true;break;}
   }
   if(accepted){kept.push(c);occupied.push({p:c.p.slice(),radius:rad});}
  }corals[type]=kept;
 }

 const rockSurfaces=[];
 for(let i=0;i<4;i++){const geometry=rockGeometry(i);let b=r.batch(geometry,rocks[i]);b.maxDistance=30;for(const instance of rocks[i])rockSurfaces.push({geometry,instance});let low=r.batch(rockGeometry(i,true),rocks[i]);low.minDistance=30;low.maxDistance=170;}
 let deb=rockGeometry(2,true);deb.shadow=false;let db=r.batch(deb,rubble);db.maxDistance=19;
 const makers=[()=>branchCoral(0),()=>branchCoral(1),()=>branchCoral(2),()=>tableCoral(0),()=>tableCoral(1),brainCoral,fanCoral,spongeGeometry,()=>branchCoral(3),()=>cauliflowerCoral(0),()=>cauliflowerCoral(1)];
 makers.forEach((make,i)=>{reefDetailLevel=1;const b=r.batch(make(),corals[i],i===6?3:0);b.shadow=true;b.maxDistance=5.5;
 reefDetailLevel=0;const mid=r.batch([5,7].includes(i)?distantColony(i):make(),corals[i],i===6?3:0);mid.shadow=true;mid.shadowProxy=true;mid.minDistance=5.5;mid.maxDistance=20;
 const far=r.batch(distantColony(i),corals[i],i===6?3:0);far.shadow=true;far.shadowProxy=true;far.minDistance=20;far.maxDistance=55;
 });reefDetailLevel=1;
 // Seagrass grows in irregular sheltered meadows, with open sand between patches.
 const meadows=[[-3.6,15,2.5],[4.4,9.5,2.1],[-2.5,2.5,1.6],[15,12,2.9],[-17,16,2.5],[3,-16,2.0]];
 for(let i=0;i<156;i++){
  const meadow=meadows[i%meadows.length],a=rr(0,TAU),rad=Math.sqrt(random())*meadow[2],x=meadow[0]+Math.cos(a)*rad,z=meadow[1]+Math.sin(a)*rad*.65;
  const floor=groundHeight(x,z);if(rootHeight(x,z)>floor+.22)continue;
  const sc=rr(.60,1.22);grassItems.push({p:[x,floor+.018,z],s:[sc,sc*rr(.78,1.14),sc],yaw:rr(0,TAU),phase:rr(0,TAU)});
 }r.batch(grass(),grassItems,3).maxDistance=35;
 // Close, carefully composed flora along the route instead of only background detail.
 r.batch(tableCoral(),[{p:[-4.3,rootHeight(-4.3,5.5),5.5],s:[1.42,1.12,1.3],yaw:1.1},{p:[6.1,rootHeight(6.1,-2.5),-2.5],s:[1.15,1.5,1.3],yaw:.4}]);
 r.batch(fanCoral(),[{p:[-5.6,rootHeight(-5.6,6.4),6.4],s:[1.25,1.6,1.25],yaw:1.0,phase:1},{p:[6.3,rootHeight(6.3,1),1],s:[1.4,1.8,1.4],yaw:.4,phase:2}]);
 const anemone=reefAnemoneHabitat(rockSurfaces);reefAnemoneHome=anemone.home;
 const anemoneBatch=r.batch(anemone.geometry,[anemone.instance],3);anemoneBatch.maxDistance=12;anemoneBatch.sceneRole='reef-anemone';
 // Eroded passage; thick geometry supplies genuine shadow, parallax and overhead enclosure.
 const arch=r.batch(archGeometry(),[{p:[0,-16.6,-22.5],yaw:.11,s:[1,1.06,1]}]);arch.maxDistance=95;
 for(let j=0;j<9;j++){let a=.15+j/8*(Math.PI-.30);obstacles.push({p:[Math.cos(a)*4.4,-16.6+Math.sin(a)*4.87,-22.5],s:[1.06,1.15,1.48],rockContactLegacy:true});}
 // Broad buttresses continue into the water, with scaled-down, attached shelves.
 const walls=[{p:[-14,-29,-39],s:[7,16,11],yaw:.1},{p:[-20,-43,-60],s:[8.7,22,14],yaw:.4},{p:[20,-40,-54],s:[9,19,12],yaw:-.4},{p:[30,-52,-80],s:[12,22,16],yaw:.7},{p:[-31,-54,-89],s:[13,24,17],yaw:-.6},{p:[-20,-64,-116],s:[12,22,18],yaw:.4},{p:[20,-65,-121],s:[13,26,18],yaw:-.1}];
 r.batch(rockGeometry(3),walls);walls.forEach(ob=>obstacles.push({p:ob.p.slice(),s:ob.s.map(v=>v*.87)}));
 const shelves=[],plates=[],fans=[];for(const wall of walls.slice(0,4)){for(let j=0;j<4;j++){let x=wall.p[0]+(wall.p[0]<0?1:-1)*wall.s[0]*.73,y=wall.p[1]+wall.s[1]*(.8-j*.34),z=wall.p[2]+(j%2)*2.1;let item={p:[x,y,z],s:[2.25,.74,3.5],yaw:wall.yaw};shelves.push(item);if(y>-35){plates.push({p:[x,y+.74,z],s:[1.6,1.1,1.3],yaw:rr(0,TAU)});fans.push({p:[x+1,y+.64,z+.6],s:[1.3,1.7,1.3],yaw:.3,phase:rr(0,6)});}}}
 r.batch(rockGeometry(0),shelves);r.batch(tableCoral(),plates);r.batch(fanCoral(),fans,3);
 const post=new Geometry();post.material=11;post.tag=3;let cream=[.55,.64,.56],green=[.16,.30,.26];post.tube([0,0,0],[0,.14,0],.71,.69,cream,36);post.tube([0,.14,0],[0,.55,0],.11,.11,green,20);post.tube([0,.55,0],[0,1.65,0],.36,.36,cream,42);post.tube([0,1.65,0],[0,1.8,0],.41,.38,green,36);post.sphere([0,1.8,0],[.38,.12,.38],green,32,16);post.box([0,1.39,.355],[.29,.06,.03],[.02,.05,.04]);post.box([0,.90,.36],[.29,.18,.018],green);r.batch(post,[{p:[12,groundHeight(12,-17),-17],yaw:.22}]);
 obstacles.push({p:[12,groundHeight(12,-17)+1,-17],s:[.5,1.1,.5]});
}
// Unified, pulsing school; this is a decorative group, not an invented occurrence record.
const shoal=[];
function addReefSchool(r){const s={id:'silver',height:.19,width:.075,color:0xbecfc9};const geo=new Geometry();geo.material=6;geo.species=-1;surface(geo,(u,v)=>{let a=v*TAU,x=.50-u*.99,f=Math.pow(Math.sin(u*Math.PI),.78);return [x,Math.cos(a)*f*.16,Math.sin(a)*f*.07];},6,4,[.66,.73,.71],1);geo.tri([-.44,0,0],[-.77,.17,0],[-.74,-.17,0],[.43,.51,.48]);
 for(let i=0;i<380;i++){let phase=i*2.39996,rad=Math.sqrt((i+.5)/380);shoal.push({p:[0,-8,0],s:[.20,.20,.20],yaw:0,pitch:0,phase,slot:i,rad,tint:[.88,1,1.02]});}
 let b=r.batch(geo,shoal,1,true);b.maxDistance=62;b.shadow=false;
}
function updateReefSchool(t){const center=[2+Math.sin(t*.021)*8,-6.9+Math.sin(t*.075)*.8,-10-Math.cos(t*.021)*7];
 for(let f of shoal){let a=f.phase+t*.16,r=f.rad;let spiral=a+r*4;f.p[0]=center[0]+Math.cos(spiral)*r*5.8;f.p[1]=center[1]+Math.sin(a*1.31)*r*1.65;f.p[2]=center[2]+Math.sin(spiral)*r*3.5;f.yaw=Math.atan2(-Math.cos(spiral)*3.5,-Math.sin(spiral)*5.8);f.pitch=Math.sin(t*.6+f.phase)*.04;}}
