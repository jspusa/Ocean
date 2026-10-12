/* INDIVIDUAL WATERS 0.6
 * Stable per-animal phenotype. Shape/pigment ranges are artistic constraints,
 * NOT a species population model, sex/age inference or local field observations.
 * Same object/genes are shared by all LODs, shadows, photographs and observation UI.
 */
function bioHash(n){n=(n^61)^(n>>>16);n=Math.imul(n,9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return n>>>0;}
function bioValue(id,channel){return bioHash((id^Math.imul(channel+1,0x9e3779b9))>>>0)/4294967296;}
const BIO_NEUTRAL=[1,1,1,1],BIO_DEFAULT=[.5,.5,.5,.5];
const fishObstacleBuckets=new Map(),NO_FISH_OBSTACLES=[];
function initializeIndividuals(r){
 fishObstacleBuckets.clear();
 for(const ob of obstacles){const rx=(ob.s[0]+.9)*1.613,rz=(ob.s[2]+.9)*1.613;
  for(let x=Math.floor((ob.p[0]-rx)/12);x<=Math.floor((ob.p[0]+rx)/12);x++)for(let z=Math.floor((ob.p[2]-rz)/12);z<=Math.floor((ob.p[2]+rz)/12);z++){
   const key=x+','+z;if(!fishObstacleBuckets.has(key))fishObstacleBuckets.set(key,[]);fishObstacleBuckets.get(key).push(ob);
  }
 }
 const counts=new Map();
 for(let k=0;k<allLife.length;k++){
  const f=allLife[k],sp=f.species??-1,index=counts.get(sp)||0;counts.set(sp,index+1);
  const id=bioHash((sp+11)*10007+index*101+62041);
  if(!f.bioBaseScale)f.bioBaseScale=f.s.slice();
  f.uid=(sp>=0?SPECIES[sp].id:'anthias')+'-'+String(index+1).padStart(3,'0');
  f.bioSeed=id;f.routeShape=[bioValue(id,12),bioValue(id,13)];f.bioMorph=[.90+bioValue(id,0)*.20,.89+bioValue(id,1)*.22,.89+bioValue(id,2)*.22,.82+bioValue(id,3)*.35];
  f.bioGenes=[bioValue(id,4),bioValue(id,5),bioValue(id,6),bioValue(id,7)];
  const pigment=.92+.12*bioValue(id,8),warm=(bioValue(id,9)-.5)*.045;
  f.tint=[pigment*(1+warm),pigment,pigment*(1-warm*.60)];
  f.finWear=bioValue(id,10)>.85?(bioValue(id,10)-.85)*3:0;
  f.effort=.6;f.bank=0;f.bioActive=true;
  const scale=.91+.18*bioValue(id,11);for(let n=0;n<3;n++)f.s[n]=f.bioBaseScale[n]*scale;
 }
 for(let k=0;k<shoal.length;k++){
  const f=shoal[k],id=bioHash(k+82491),sc=.165+.078*bioValue(id,0);
  f.bioSeed=id;f.uid='shoal-'+String(k+1).padStart(3,'0');f.s=[sc,sc,sc];
  f.bioMorph=[.9+.2*bioValue(id,1),.9+.2*bioValue(id,2),.9+.15*bioValue(id,3),.82+.35*bioValue(id,4)];
  f.bioGenes=[bioValue(id,5),bioValue(id,6),bioValue(id,7),bioValue(id,8)];
  f.tint=[.90+.07*bioValue(id,9),.94+.06*bioValue(id,10),.96+.06*bioValue(id,11)];f.effort=.7;
  f.schoolOffset=[(bioValue(id,13)-.5)*2,(bioValue(id,14)-.5)*2,(bioValue(id,15)-.5)*2];
 }
 const done=new Set();let index=0;
 for(const batch of r.batches){for(const f of batch.instances){if(done.has(f))continue;done.add(f);if(f.bioGenes)continue;
  const id=bioHash(19721+(++index)*271);f.bioGenes=[bioValue(id,0),bioValue(id,1),bioValue(id,2),bioValue(id,3)];
  if([3,4,7,8].includes(batch.material)){
   // Adjacent colonies have constrained tone changes, not a rainbow of identical pots.
   const tone=.85+.17*bioValue(id,4);f.tint=[tone*(1+.035*bioValue(id,5)),tone,tone*(.95+.07*bioValue(id,6))];
  }
 }}
 r.individualCount=allLife.length+shoal.length;
}
// A continuously differentiable path, with a different route and pace per animal.
// No per-frame random numbers: revisiting time t produces exactly the same transform.
function animalTrajectory(f,t,out){
 const id=f.bioSeed||1,s0=f.routeShape?f.routeShape[0]:bioValue(id,12),s1=f.routeShape?f.routeShape[1]:bioValue(id,13),phase=f.orbit;
 const pulse=.35*Math.sin(t*(.28+s0*.14)+f.bob);
 const a=phase+(t+pulse)*f.speed;
 const radius=f.radius*(.88+.13*Math.sin(a*1.71+s0*6.3)+.08*Math.sin(t*.063+s1*7));
 let x=f.center[0]+Math.cos(a)*radius+Math.sin(a*2.31+s1*6.3)*f.radius*.085;
 let z=f.center[2]+Math.sin(a)*radius*(.57+s1*.25)+Math.cos(a*1.83+s0*3)*f.radius*.11;
 let y=f.species===0?f.center[1]+f.height+Math.sin(t*(.50+s1*.18)+f.bob)*.075:
  groundHeight(x,z)+f.height+Math.sin(t*(.24+s1*.10)+f.bob)*.16;
 if(f.fixedDepth!==undefined)y=f.fixedDepth+Math.sin(t*(.19+s0*.09)+f.bob)*.20;
 if(f.species!==0){
  // Smoothly anticipates a reef obstacle instead of suddenly jumping up at its edge.
  for(const ob of (fishObstacleBuckets.get(Math.floor(x/12)+','+Math.floor(z/12))||NO_FISH_OBSTACLES)){const dx=(x-ob.p[0])/(ob.s[0]+.9),dz=(z-ob.p[2])/(ob.s[2]+.9),d=dx*dx+dz*dz;
   if(d<2.6&&ob.p[1]+ob.s[1]>.2+y){const w=1-smooth01((d-.45)/2.15);y=Math.max(y,mix(y,ob.p[1]+ob.s[1]+.72,w));}
  }
 }
 out[0]=x;out[1]=Math.min(-1.05,y);out[2]=z;
}
const trajectoryTmp=[0,0,0],trajectoryPrev=[0,0,0];
function updateLife(t){
 updateReefSchool(t);
 for(const f of allLife){
  animalTrajectory(f,t,f.p);animalTrajectory(f,t+.055,trajectoryTmp);animalTrajectory(f,t-.055,trajectoryPrev);
  const dx=trajectoryTmp[0]-f.p[0],dy=trajectoryTmp[1]-f.p[1],dz=trajectoryTmp[2]-f.p[2];
  f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.29,.29);
  const px=f.p[0]-trajectoryPrev[0],pz=f.p[2]-trajectoryPrev[2];
  const turn=Math.atan2(px*dz-pz*dx,px*dx+pz*dz)/.055;
  f.bank=clamp(turn*.23,-.17,.17);f.effort=clamp(Math.hypot(dx,dy,dz)/.055/(f.s[0]*1.8),.22,1.);
 }
}
function updateReefSchool(t){
 const cx=1+Math.sin(t*.023)*7,cy=-6.3+Math.sin(t*.057)*.45,cz=-13-Math.cos(t*.023)*5;
 for(const f of shoal){const id=f.bioSeed||bioHash(f.slot+1),q=f.schoolOffset||[0,0,0],delay=bioValue(id,17)*.6;
  const a=f.phase+(t-delay)*.12,r=f.rad;
  const x=Math.cos(a+r*3.7)*r*4.7,z=Math.sin(a+r*3.7)*r*3.1;
  f.p[0]=cx+x+q[0]*.22*Math.sin(t*.41+f.phase);
  f.p[1]=cy+Math.sin(a*1.27)*r*1.27+q[1]*.24;
  f.p[2]=cz+z+q[2]*.2*Math.cos(t*.32+f.phase);
  f.yaw=Math.atan2(-Math.cos(a+r*3.7)*3.1,-Math.sin(a+r*3.7)*4.7)+.10*Math.sin(t*.47+f.phase);
  f.pitch=Math.cos(a*1.27)*.075;f.bank=Math.sin(a)*.04;f.effort=.62+.13*Math.sin(t*.31+f.phase);
 }
}
/* Higher-continuity fish anatomy; LOD uses the SAME contour and tags. */
function fishGeometry(s,lod=false){
 const g=new Geometry();g.material=6;g.species=SPECIES.findIndex(x=>x.id===s.id);g.shadow=!lod;g.tag=1;
 const H=s.height,W=s.width,round=s.id==='clown',slender=['wrasse','chromis','decor','silver'].includes(s.id);
 const nu=lod?12:32,nv=lod?20:46;
 const body=(u,v)=>{const a=u*TAU,t=clamp(v,0,1),x=.57-t*1.1;
  const shape=Math.pow(Math.max(.000001,Math.sin(t*Math.PI)),.72)*(1.11-.23*t)*(1-.24*Math.exp(-Math.pow((t-.91)/.095,2)));
  return [x,Math.cos(a)*shape*H*(slender?.94:1),Math.sin(a)*shape*W];};
 surface(g,body,nu,nv,p=>fishColor(s,...p),-1);
 g.tag=2;g.sphere([.535,-.026,0],[.020,.014,.027],fishColor(s,.51,-.02,0),lod?8:18,lod?5:10);
 if(!lod){g.sphere([.555,-.027,0],[.007,.0018,.022],[.07,.055,.045],14,6);}
 for(const side of [-1,1]){
  g.tag=4;g.sphere([.385,.056,side*W*.69],[.0188,.020,.009],round?[.30,.28,.19]:[.37,.39,.31],lod?8:18,lod?5:12);
  g.sphere([.390,.057,side*(W*.69+.007)],[.0125,.0138,.006],[.009,.014,.019],lod?6:16,lod?4:10);
  // No painted-on white eye dot. The moving light provides the corneal highlight.
  g.tag=3;
  const fin=round?[.57,.27,.075]:rgb(s.color).map(x=>x*.86);
  // A fan of rays from a single anatomical insertion, never a rectangular flag.
  surface(g,(u,v)=>{const span=Math.sin(Math.PI*u),tip=.77+.23*span;
   return [.22-v*(.12+.13*span),-.018+v*(.042-.165*u)*tip,side*(W*.92+v*(.012+.12*span))];
  },lod?8:22,lod?4:12,(p,u,v)=>{const c=s.id==='tang'?[.45,.57,.52]:fin;return c.map(x=>x*(.85+.13*v));},side>0?1:-1);
  if(!lod){let prev=null;g.tag=1.2;for(let j=0;j<20;j++){const a=-.67+j/19*1.32,pt=[.27-.045*Math.cos(a*1.8),a*H*.71,side*W*.93*Math.sqrt(Math.max(.1,1-a*a))];if(prev)g.tube(prev,pt,.0021,.0021,[.17,.19,.19],4);prev=pt;}}
 }
 g.tag=3.1;const tail=['tang','idol'].includes(s.id)?[.74,.65,.31]:rgb(s.color).map(v=>v*.90);
 surface(g,(u,v)=>{const a=(u-.5)*2,edge=1-Math.abs(a),fork=round?-.016:edge*.11;
  return [-.49-v*(.32-fork),a*H*.80*(.20+.80*v),Math.sin(u*Math.PI)*.004];},lod?10:26,lod?3:9,(p,u,v)=>round&&Math.min(u,1-u,1-v)<.06?[.10,.09,.08]:tail,1);
 g.tag=3.2;for(const sign of [-1,1])surface(g,(u,v)=>{const x=.30-u*.73,t=(.57-x)/1.10,a=Math.PI*t,by=Math.pow(Math.sin(a),.72)*(1.11-.23*t)*H;
  const crest=Math.sin(Math.PI*u)*(sign>0?.18:.13)*H;
  return [x,sign*(by*.95+v*crest),.003*Math.sin(Math.PI*u)];},lod?12:36,lod?3:7,(p,u,v)=>round&&v>.87?[.10,.09,.09]:fishColor(s,p[0],p[1],0),sign>0?1:-1);
 if(s.id==='idol'){const pts=[[.15,.32,0],[.10,.53,0],[-.06,.73,0],[-.34,.82,0],[-.61,.81,0],[-.79,.85,0]];for(let i=0;i<pts.length-1;i++)g.tube(pts[i],pts[i+1],.014-i*.0022,.011-i*.0018,[.89,.89,.80],lod?4:8);}
 return g;
}
function distantFishGeometry(s){return fishGeometry(s,true);}
// Thick, scalloped foliose colonies with irregular edge growth, not stacked dinner plates.
function tableCoral(type=0){
 const g=new Geometry();g.material=3;g.shadow=true;
 const colors=type?[.53,.56,.46]:[.60,.51,.37];
 const detail=typeof reefDetailLevel==='undefined'||reefDetailLevel;
 const ns=detail?72:32,nr=detail?12:6;
 for(let k=0;k<3;k++){
  const cx=Math.cos(k*3.5)*k*.13,cz=Math.sin(k*3.5)*k*.14,rad=1.0-k*.18;
  const form=(u,v,under=false)=>{const a=u*TAU,r=v*rad*(.86+.065*Math.sin(a*5.3+k)+.045*Math.sin(a*9.1+k*4)+.024*Math.sin(a*17.));
   const bowl=.13+k*.155+.18*v*v+(.045*Math.sin(a*4.6+k)+.015*Math.sin(a*14.))*Math.pow(v,3);
   return [cx+Math.cos(a)*r,bowl-(under?.026*(1-.30*v):0),cz+Math.sin(a)*r];};
  surface(g,(u,v)=>form(u,v),ns,nr,(p,u,v)=>colors.map(c=>mix(c,.80,Math.pow(v,24)*.33)),1);
  surface(g,(u,v)=>form(u,v,true),ns,Math.max(3,nr>>1),colors.map(c=>c*.82),-1);
  for(let j=0;j<ns;j++)g.quad(form(j/ns,1),form(j/ns,1,true),form((j+1)/ns,1,true),form((j+1)/ns,1),colors.map(c=>mix(c,.77,.3)));
  g.tube([cx,.01,cz],[cx,.12+k*.15,cz],.14,.10,colors.map(c=>c*.7),10);
 }
 return g;
}
// Runtime observation interface: inspect another real instance, no representative clone.
function initIndividualUI(){
 const panel=document.createElement('div');panel.id='individualCard';panel.className='hidden';panel.innerHTML='<div><small>THIS ENCOUNTER</small><b id="individualLabel"></b><span id="individualTraits"></span></div><button id="nextIndividual" title="觀察同種下一隻">下一隻 ↗</button>';$('hud').appendChild(panel);
 $('nextIndividual').onclick=()=>{if(!follow)return;const set=life.filter(f=>f.species===follow.species);const i=set.indexOf(follow);findSpecies(follow.species,set[(i+1)%set.length]);paintIndividualUI();};
}
function paintIndividualUI(){
 const panel=$('individualCard');if(!panel)return;panel.classList.toggle('hidden',!follow||!active||!!modal);
 if(!follow||!active)return;const set=life.filter(f=>f.species===follow.species),i=set.indexOf(follow)+1;
 $('individualLabel').textContent=SPECIES[follow.species].name+' · '+String(i).padStart(2,'0')+' / '+String(set.length).padStart(2,'0');
 $('individualTraits').textContent='固定個體 '+follow.uid+' · 體型／花紋／泳姿各有差異';
 $('nextIndividual').disabled=set.length<2;
}

// The branch scaffold is continuously deformed per variant before indexing.
// Its surface normals use the cofactor Jacobian of that deformation; LODs agree.
function sculptedColony(type,lod,mound=false){
 const source=SCULPTED_CORAL[lod],g=new Geometry();g.material=3;g.shadow=true;
 const palette=[[.61,.54,.43],[.49,.53,.52],[.45,.53,.47],[.61,.49,.41],[.55,.56,.45],[.57,.49,.46]],color=palette[type%6];
 const phase=type*1.83, deform=p=>{const x=p[0],y=p[1],z=p[2];
  const radial=1+.17*Math.sin(x*4.7+phase+z*2.2)+.09*Math.cos(z*7.4-phase);
  const growth=.86+.19*Math.sin(x*3.4+phase)+.12*Math.cos(z*4.2-phase*1.4);
  return [x*radial*(mound?1.18:1)+y*y*.085*Math.sin(phase),y*growth*(mound?.63:1)-.11,z*(1+.10*Math.cos(x*3.1+z*4.4+phase))*(mound?1.18:1)];};
 const points=[],normals=[],colors=[];
 for(let i=0;i<source.positions.length;i++){
  const p=source.positions[i],n=source.normals[i],q=deform(p);points.push(q);
  const columns=[];for(let k=0;k<3;k++){const a=p.slice(),b=p.slice();a[k]+=.0002;b[k]-=.0002;columns.push(V.mul(V.sub(deform(a),deform(b)),2500));}
  const nx=V.cross(columns[1],columns[2]),ny=V.cross(columns[2],columns[0]),nz=V.cross(columns[0],columns[1]);
  normals.push(V.norm(V.add(V.mul(nx,n[0]),V.add(V.mul(ny,n[1]),V.mul(nz,n[2])))));
  const tip=smooth01((p[1]-.70)/.15)*Math.max(0,n[1]),tone=.85+.14*geoNoise(p[0]*7+phase,p[1]*7,p[2]*7);
  colors.push(color.map(c=>mix(c*tone,.81,tip*.43)));
 }
 for(let i=0;i<source.indices.length;i+=3){const ids=source.indices.slice(i,i+3);g.tri(...ids.map(k=>points[k]),color,ids.map(k=>normals[k]),ids.map(k=>colors[k]));}
 return g;
}
// Rounded erosion, slanted bedding and cross fractures break the old stacked-block outline.
function rockGeometry(variant=0,low=false){
 const g=new Geometry();g.material=2;g.shadow=true;
 const form=(u,v)=>{const a=u*TAU,b=v*Math.PI,s=Math.sin(b),cube=x=>Math.sign(x)*Math.pow(Math.abs(x),.70);
  const x=cube(s*Math.cos(a)),y=cube(Math.cos(b)),z=cube(s*Math.sin(a)),phase=variant*5.31;
  const warp=geoNoise(x*2+phase,y*2.2,z*2)-.5;
  let f=.78+ridgeNoise(x*3.3+phase,y*3.6+variant,z*3.3-phase)*.42;
  const bedding=y+x*.19-z*.12+warp*.13;
  f-=.047*Math.exp(-Math.pow((bedding-.18)/.065,2.))+.036*Math.exp(-Math.pow((bedding+.48)/.054,2.));
  f-=.035*Math.exp(-Math.pow((x+z*.47+y*.24-.24)/.05,2.))*(1-y*y*.65);
  return [x*f+.11*(geoNoise(z*2+phase,y*2,x*2)-.5),y*f+.10*warp+.045*x,z*f+.08*(geoNoise(y*2,x*3+phase,z*2)-.5)];};
 surface(g,form,low?20:56,low?16:38,(p,u,v)=>{const n=geoNoise(p[0]*3+variant,p[1]*4,p[2]*3),shade=.86+.12*n;return [.92*shade,.91*shade,.83*shade];},1);return g;
}
// Crusting tissue and old fragments bridge colony roots instead of leaving isolated "pots".
const buildLivingReef=buildReef;
buildReef=function(r){
 placedReefRocks.length=0;rockHeightCache.clear();buildLivingReef(r);
 const types=[[],[],[]];const bases=placedReefRocks.slice();
 for(let k=0;k<bases.length;k++){const {item,variant}=bases[k];for(let j=0;j<8;j++){
  const id=bioHash(k*113+j*37+812),a=bioValue(id,0)*TAU,rad=.15+.69*bioValue(id,1),x=item.p[0]+Math.cos(a)*item.s[0]*rad,z=item.p[2]+Math.sin(a)*item.s[2]*rad;
  const y=rockTop(item,variant,x,z);if(!Number.isFinite(y))continue;
  const actual=rootHeight(x,z);if(actual-y>.14)continue;const sc=.13+.25*bioValue(id,2);
  types[j%3].push({p:[x,y+.008,z],s:[sc,.20+bioValue(id,3)*.18,sc*(.75+bioValue(id,4)*.6)],yaw:a,phase:a});
 }}
 for(let type=0;type<3;type++){
  const g=new Geometry();g.material=3;g.shadow=true;g.tag=22;
  const color=[[.47,.48,.33],[.56,.37,.39],[.48,.44,.31]][type];
  surface(g,(u,v)=>{const a=u*TAU,r=v*(.82+.14*Math.sin(a*5+type)+.06*Math.sin(a*11));return [Math.cos(a)*r,.026+.13*Math.sin(v*Math.PI)+.017*Math.sin(a*8)*v,Math.sin(a)*r];},24,5,color,1);
  const b=r.batch(g,types[type]);b.maxDistance=17;
 }
}
