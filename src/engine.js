/* Return to the Blue — WebGL2 renderer / living light / spectral water, refracted sunlight and depth-aware compositing. No runtime dependencies. */
'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), mix=(a,b,t)=>a+(b-a)*t;
const rgb=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
let seed=84129;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}const rr=(a,b)=>a+random()*(b-a);
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm(a){let l=Math.hypot(...a)||1;return a.map(x=>x/l)},dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),lerp:(a,b,t)=>a.map((x,i)=>mix(x,b[i],t))};
// Authored lamp parameters are shared by rendering and photograph evaluation.
const TorchLightRules=Object.freeze({outer:.76,inner:.987,strength:2.2,falloff:.055,extinction:Object.freeze([.044,.018,.009])});
function torchIllumination(point,eye,forward){
 if(![point,eye,forward].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return 0;
 const delta=V.sub(point,eye),distance=V.len(delta),direction=V.norm(forward);if(V.len(direction)<.5)return 0;
 const c=distance>1e-8?V.dot(V.mul(delta,1/distance),direction):1,t=clamp((c-TorchLightRules.outer)/(TorchLightRules.inner-TorchLightRules.outer),0,1),cone=t*t*(3-2*t);
 const transmission=TorchLightRules.extinction.reduce((s,k,i)=>s+Math.exp(-k*distance)*[.2126,.7152,.0722][i],0);
 return clamp(cone*TorchLightRules.strength*transmission/(1+distance*distance*TorchLightRules.falloff),0,1);
}
// GPU positions are relative to a nearby origin; CPU projection retains double
// precision world translation, so UI, selection and photographs agree at 7km.
function worldProjection(relative,origin){const m=new Float64Array(relative);for(let r=0;r<4;r++)m[12+r]=relative[12+r]-relative[r]*origin[0]-relative[4+r]*origin[1]-relative[8+r]*origin[2];return m;}
function perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target,up=[0,1,0]){let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);}
function mm(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function project(p,m){let w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w,w];}
function faceNormal(a,b,c){return V.norm(V.cross(V.sub(b,a),V.sub(c,a)));}
class Geometry{
 constructor(){this.v=[];this.tag=0;this.material=0;}
 vertex(p,n,c,uv=null){this.v.push(...p,...n,...c,...(uv||[p[0],p[2]]),this.tag);}
 tri(a,b,c,color,ns=null,cs=null){const n=ns?null:faceNormal(a,b,c);this.vertex(a,ns?ns[0]:n,cs?cs[0]:color);this.vertex(b,ns?ns[1]:n,cs?cs[1]:color);this.vertex(c,ns?ns[2]:n,cs?cs[2]:color);}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
 sphere(center,scale,color,seg=24,rings=16,deform=0){const point=(u,v)=>{let a=u*TAU,b=v*Math.PI;let n=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];let f=1+deform*(Math.sin(a*5+b*3)*.4+Math.cos(b*7-a*2)*.35);return {p:n.map((x,i)=>center[i]+x*scale[i]*f),n:V.norm(n.map((x,i)=>x/scale[i]))};};for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){let a=point(i/seg,j/rings),b=point((i+1)/seg,j/rings),c=point((i+1)/seg,(j+1)/rings),d=point(i/seg,(j+1)/rings);this.tri(a.p,c.p,b.p,color,[a.n,c.n,b.n]);this.tri(a.p,d.p,c.p,color,[a.n,d.n,c.n]);}}
 tube(a,b,r1,r2,color,sides=7){let dir=V.norm(V.sub(b,a)),u=V.norm(V.cross(dir,Math.abs(dir[1])>.95?[1,0,0]:[0,1,0])),v=V.cross(dir,u);let p=(o,r,t)=>V.add(o,V.mul(V.add(V.mul(u,Math.cos(t)),V.mul(v,Math.sin(t))),r));for(let i=0;i<sides;i++){let t=i/sides*TAU,t2=(i+1)/sides*TAU,pa=p(a,r1,t),pb=p(a,r1,t2),pc=p(b,r2,t2),pd=p(b,r2,t);let n1=V.norm(V.sub(pa,a)),n2=V.norm(V.sub(pb,a));this.tri(pa,pb,pc,color,[n1,n2,n2]);this.tri(pa,pc,pd,color,[n1,n2,n1]);this.tri(b,pd,pc,color);}}
 box(c,s,col){const p=(x,y,z)=>[c[0]+x*s[0]/2,c[1]+y*s[1]/2,c[2]+z*s[2]/2];this.quad(p(-1,-1,1),p(1,-1,1),p(1,1,1),p(-1,1,1),col);this.quad(p(1,-1,-1),p(-1,-1,-1),p(-1,1,-1),p(1,1,-1),col);this.quad(p(-1,-1,-1),p(-1,-1,1),p(-1,1,1),p(-1,1,-1),col);this.quad(p(1,-1,1),p(1,-1,-1),p(1,1,-1),p(1,1,1),col);this.quad(p(-1,1,1),p(1,1,1),p(1,1,-1),p(-1,1,-1),col);this.quad(p(-1,-1,-1),p(1,-1,-1),p(1,-1,1),p(-1,-1,1),col);}
}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
// Snap a light-space texel grid to world space; camera translation does not crawl over receivers.
function stableLightMatrix(matrix,size){const m=new Float32Array(matrix);for(const k of [12,13]){const texel=m[k]*size*.5;m[k]+=(Math.round(texel)-texel)*2/size;}return m;}
function inverse4(m){let a=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?m[c*4+r]:+(c-4===r)));for(let i=0;i<4;i++){let k=i;for(let j=i+1;j<4;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[i],a[k]]=[a[k],a[i]];let d=a[i][i]||1e-12;for(let j=0;j<8;j++)a[i][j]/=d;for(let r=0;r<4;r++)if(r!==i){let v=a[r][i];for(let c=0;c<8;c++)a[r][c]-=v*a[i][c];}}return new Float32Array(Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]));}
const UNIT3=[1,1,1];
function indexGeometry(source){
 const vertex=[],index=[],map=new Map();let radius=0;
 for(let k=0;k<source.length;k+=36){
  const dx=source[k+12]-source[k],dy=source[k+13]-source[k+1],dz=source[k+14]-source[k+2];
  const ex=source[k+24]-source[k],ey=source[k+25]-source[k+1],ez=source[k+26]-source[k+2];
  const nx=source[k+3]+source[k+15]+source[k+27],ny=source[k+4]+source[k+16]+source[k+28],nz=source[k+5]+source[k+17]+source[k+29];
  const flip=(dy*ez-dz*ey)*nx+(dz*ex-dx*ez)*ny+(dx*ey-dy*ex)*nz<0;
  for(const off of flip?[0,24,12]:[0,12,24]){let key='';for(let n=0;n<12;n++)key+=Math.round(source[k+off+n]*1e5)+',';
   let id=map.get(key);if(id===undefined){id=vertex.length/12;map.set(key,id);for(let n=0;n<12;n++)vertex.push(source[k+off+n]);radius=Math.max(radius,Math.hypot(source[k+off],source[k+off+1],source[k+off+2]));}index.push(id);
  }
 }
 return {vertices:new Float32Array(vertex),indices:new Uint32Array(index),radius};
}

const VS=`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;
layout(location=3) in vec3 aOffset;layout(location=4) in vec4 aTransform;layout(location=5) in vec3 aTint;layout(location=6) in vec2 aExtra;
layout(location=7) in vec2 aUV;layout(location=8) in float aTag;
layout(location=9) in vec4 aMorph;
layout(location=10) in vec4 aGenes;
layout(location=11) in vec4 aPose;
uniform mat4 uVP;uniform mat4 uLightVP;uniform mat4 uDynamicLightVP;uniform float uTime;uniform int uKind;uniform int uMat;uniform int uSpecies;uniform float uSwim;uniform vec3 uCamera;uniform vec3 uRenderOrigin;uniform int uRigClass;
out vec3 vWorld;out vec3 vRelative;out vec3 vNormal;out vec3 vColor;out vec3 vLocal;out vec2 vUV;out float vTag;out float vSeed;out vec4 vShadow;out float vLodDistance;flat out vec4 vGenes;flat out vec3 vTint;out vec4 vDynamicShadow;
void main(){vec3 p=aPosition,n=aNormal;vLocal=p;vUV=aUV;vTag=aTag;
 // Constrained morphs, not a new randomly generated fish on each frame/LOD.
 if(uKind==1){
  p.y*=aMorph.x;p.z*=aMorph.y;n.y/=aMorph.x;n.z/=aMorph.y;
  float tail=1.-smoothstep(-.70,-.29,p.x);
  float fscale=1.+(aMorph.z-1.)*tail;
  p.y*=fscale;n.y/=fscale;
  float beat=uTime*4.2*aMorph.w+aExtra.x;
  float envelope=1.-smoothstep(-.77,.25,p.x);
  float phase=beat+p.x*4.8;
  float amplitude=.044+.052*aPose.y;
  float dEnv=(p.x>-.77&&p.x<.25)?(-6.*clamp((p.x+.77)/1.02,0.,1.)*(1.-clamp((p.x+.77)/1.02,0.,1.))/1.02):0.;
  float derivative=amplitude*(4.8*cos(phase)*envelope*envelope+sin(phase)*2.*envelope*dEnv);
  p.z+=sin(phase)*amplitude*envelope*envelope;n.x-=derivative*n.z;
  // Pectoral fins flutter separately. The thin fin membrane is not a thick plastic slab.
  if(aTag>2.5&&aTag<3.5){p.z+=sin(beat*1.36+p.x*7.)*.025*abs(p.y);
   float edge=tail*smoothstep(.1,.5,abs(p.y));p.y*=1.-aPose.z*edge*.13;}
  float gill=exp(-pow((p.x-.23)*15.,2.))*smoothstep(.03,.10,abs(p.z));
  p.z+=sign(p.z)*gill*.0028*sin(uTime*(2.7+aGenes.x)+aExtra.x);
  float y=p.y,z=p.z,ny=n.y,nz=n.z,c=cos(aPose.x),sn=sin(aPose.x);
  p.y=y*c-z*sn;p.z=y*sn+z*c;n.y=ny*c-nz*sn;n.z=ny*sn+nz*c;
 }
 // Attached, asymmetric colony growth. The displacement vanishes at the base.
 if((uMat==3||uMat==4||uMat==7||uMat==8)&&uKind!=1){
  float h=max(0.,p.y),bend=(aGenes.x-.5)*.20;
  p.x+=bend*h*h;p.z+=sin(aGenes.x*19.)*.065*h*h;
  n.y-=2.*h*(bend*n.x+sin(aGenes.x*19.)*.065*n.z);
 }
 if(uKind==2){float wing=smoothstep(.51,1.45,abs(p.z));float wave=sin(uTime*1.45+aExtra.x-abs(p.z)*.7);p.y+=wave*.37*wing;p.x-=wing*.07*cos(uTime*1.45+aExtra.x);n.z-=sign(p.z)*cos(uTime*1.45+aExtra.x)*.21*wing;}
 if(uKind==3){float h=max(0.,p.y);p.x+=sin(uTime*.65+aExtra.x+h*1.2)*.036*h;p.z+=cos(uTime*.48+aExtra.x+h)*.022*h;}
 if(uKind==4){float w=pow(abs(p.z)/1.9,1.5);p.y+=sin(uTime*1.48+aExtra.x-abs(p.z)*1.1)*w*.48;n.z-=cos(uTime*1.48+aExtra.x-abs(p.z))*.25*sign(p.z);}
 if(uKind==7){float tail=(1.-smoothstep(-2.,-.1,p.x));p.y+=sin(uTime*2.3+aExtra.x-p.x)*.26*tail;float wave=sin(uTime*2.3+aExtra.x-p.x);n=normalize(n+vec3(0.,0.,wave*.015*tail));
  // The original dolphin has tag 0 throughout: its +Z pectoral lies outside the
  // body at z>.4. The bounded predicate excludes head, eyes, dorsal and flukes.
  if(aTag<.5&&aPosition.x>-.65&&aPosition.x<.32&&aPosition.y<-.12&&aPosition.z>.4){float bend=aPose.z*.9;p.y+=(aPosition.z-.4)*bend;n.z-=bend*n.y;}
  float y=p.y,z=p.z,ny=n.y,nz=n.z,c=cos(aPose.x),s=sin(aPose.x);p.y=y*c-z*s;p.z=y*s+z*c;n.y=ny*c-nz*s;n.z=ny*s+nz*c;
 }
 if(uKind==6){float x=p.x,u=clamp((x+4.5)/3.5,0.,1.),w=1.-u*u*(3.-2.*u),slope=x>-4.5&&x< -1.?-6.*u*(1.-u)/3.5:0.;
  float phase=uTime*.63+aExtra.x+x*.21;p.y+=sin(phase)*.62*w*w;n.x-=.62*(cos(phase)*.21*w*w+sin(phase)*2.*w*slope)*n.y;}
 // Metre-normalized cetaceans use the same rig in colour and dynamic shadows.
 // Their species silhouette and authored colour are untouched by fish morphs.
 if(uKind==9){
  float rate=max(.3,aPose.w),beat=uTime*rate+aExtra.x,x=p.x;
  float u=clamp((x+.48)/.58,0.,1.),tail=1.-u*u*(3.-2.*u);
  float slope=(x>-.48&&x<.10)?-6.*u*(1.-u)/.58:0.;
  float wave=beat+x*3.2,amplitude=.038+.035*aPose.y;
  p.y+=sin(wave)*amplitude*tail*tail;
  n.x-=amplitude*(cos(wave)*3.2*tail*tail+sin(wave)*2.*tail*slope)*n.y;
  // Pectorals flex gently; dorsal fin and horizontal flukes keep their profile.
  if(aTag>2.5&&aTag<3.5&&x>-.24&&p.y<.02){float span=max(0.,abs(p.z)-.055),bend=sin(beat*.48+sign(p.z)*.5)*.10;
   // The unused cetacean fin-wear slot carries a one-sided handshake gesture.
   bend+=p.z>.055?aPose.z*.72:0.;p.y+=span*bend;if(span>0.)n.z-=sign(p.z)*bend*n.y;}
  float y=p.y,z=p.z,ny=n.y,nz=n.z,c=cos(aPose.x),s=sin(aPose.x);
  p.y=y*c-z*s;p.z=y*s+z*c;n.y=ny*c-nz*s;n.z=ny*s+nz*c;
 }
 // Whale sharks propel a vertical tail sideways; the head remains steady.
 if(uKind==12){
  float u=clamp((p.x+.50)/.60,0.,1.),tail=1.-u*u*(3.-2.*u);
  float slope=(p.x>-.50&&p.x<.10)?-6.*u*(1.-u)/.60:0.;
  float beat=uTime*.8+aExtra.x,wave=beat+p.x*3.8,amplitude=.035;
  p.z+=sin(wave)*amplitude*tail*tail;
  n.x-=amplitude*(cos(wave)*3.8*tail*tail+sin(wave)*2.*tail*slope)*n.z;
  if(aTag>2.5&&aTag<3.5&&p.x>-.24){float span=max(0.,abs(p.z)-.075),flex=sin(beat*.55)*.035;p.y+=span*flex;if(span>0.)n.z-=sign(p.z)*flex*n.y;}
 }
 // Deep-water rig: Pose.w is radians/second; metres remain entirely in instance
 // scale. Tag 6 is only the esca or tail photophore, never an animal's eyes.
 if(uKind==10){
  float beat=uTime*max(.1,aPose.w)+aExtra.x;bool fin=aTag>2.5&&aTag<3.5,limb=aTag>4.5&&aTag<5.5;
  if(uSpecies==27){
   float tail=1.-smoothstep(-.50,.18,p.x),wave=beat+p.x*3.4,amp=.022+.013*aPose.y;
   p.z+=sin(wave)*amp*tail*tail;n.x-=cos(wave)*3.4*amp*tail*tail*n.z;
   if(fin&&abs(p.z)>.09)p.y+=sin(beat*.67+sign(p.z)*1.5)*.016*smoothstep(.09,.28,abs(p.z));
  }else if(uSpecies==28){
   if(limb){float w=smoothstep(-.16,.45,p.x),phase=beat+p.x*9.+aPosition.z*13.;p.y+=sin(phase)*.013*w;p.z+=cos(phase*.81)*.009*w;n.x-=cos(phase)*.117*w*n.y;}
   if(fin)p.y+=sin(beat*1.4+p.x*15.)*.007*smoothstep(.02,.09,abs(p.z));
  }else if(uSpecies==29){
   float w=1.-smoothstep(-.52,.18,p.x),wave=beat+p.x*7.;p.z+=sin(wave)*.055*w*w;n.x-=cos(wave)*.385*w*w*n.z;
  }else if(uSpecies==30){
   if(limb||aTag>5.5){float h=max(0.,p.y-.19),bend=sin(beat*.78)*.055;p.x+=bend*h;p.z+=cos(beat*.62)*.070*h;n.y-=bend*n.x;}
   if(fin)p.z+=sin(beat+p.x*4.)*.012;
  }else if(uSpecies==31&&limb){
   float w=smoothstep(.065,.46,abs(p.z)),gait=beat+p.x*24.+sign(p.z)*1.5708;
   p.x+=sin(gait)*.009*w;p.y+=max(0.,cos(gait))*.010*w;
  }
 }
 // Habitat fauna share this deformation in the colour and shadow programs.
 // Pose.w is withdrawal, independent of immutable metre-scale instance size.
 if(uKind==8){
  float phase=aExtra.x,withdraw=clamp(aPose.w,0.,1.);bool fin=aTag>2.5&&aTag<3.5,limb=aTag>4.5&&aTag<5.5;
  if(uSpecies==12){
   float h=max(p.y,0.),bend=sin(uTime*.83+phase)*.023;
   p.x+=bend*h*h;n.y-=2.*bend*h*n.x;
   if(fin)p.z+=sin(uTime*19.+phase+p.y*8.)*.014;
  }else if(uSpecies==13){
   if(limb){p.z+=sin(uTime*1.7+phase+p.x*7.)*.016*max(p.y,0.);p.x+=sin(uTime*1.1+phase)*.006;}
   else{float wave=uTime*1.2+p.x*8.+phase;p.z+=sin(wave)*.004;n.x-=cos(wave)*.032*n.z;}
  }else if(uSpecies==14){
   float h=max(p.y,0.),bend=sin(uTime*.75+phase+h*.7)*.13*(1.-withdraw);
   p.x+=bend*h*h;n.y-=2.*bend*h*n.x;
   float extension=1.-withdraw*.965;p.y=p.y*extension-withdraw*.07;n.y/=extension;
   if(fin)p.z+=sin(uTime*4.+phase)*.003*(1.-withdraw);
  }else if(uSpecies==15){
   if(limb){float gait=uTime*5.6+phase+p.x*13.+sign(p.z)*1.57;p.x+=sin(gait)*.016;p.y+=max(0.,cos(gait))*.014;}
   p.y-=withdraw*.55;p.x-=withdraw*.24;
  }else if(uSpecies==16){
   if(limb){float h=max(0.,p.y-.30);p.x+=sin(uTime*2.7+phase)*.045*h;p.z+=cos(uTime*1.7+phase)*.07*h;}
   else if(fin)p.z+=sin(uTime*.6+phase)*.008;
  }else if(uSpecies==17){
   float tail=1.-smoothstep(-.55,-.10,p.x),wave=uTime*1.4+phase+p.x*3.;p.z+=sin(wave)*.035*tail;n.x-=cos(wave)*.105*tail*n.z;
   if(fin){float spread=1.+sin(uTime*.85+phase)*.035;p.z*=spread;n.z/=spread;p.y+=sin(uTime*1.35+phase+p.x*4.)*.012*abs(p.z);}
  }else if(uSpecies==18){
   if(fin){float wave=uTime*3.5+phase+p.x*13.,w=abs(p.z);p.y+=sin(wave)*.085*w;n.x-=cos(wave)*1.105*w*n.y;}
   if(limb){float w=smoothstep(.10,.85,p.x);p.z+=sin(uTime*1.4+phase+p.x*7.)*.017*w;p.y+=sin(uTime*1.8+phase+p.x*5.)*.015*w;}
  }else if(uSpecies==19&&limb){
   float w=smoothstep(.10,.85,p.x),pulse=sin(uTime*.72+phase);p.x-=pulse*.026*w;p.z+=sin(uTime*1.1+phase+p.x*9.)*.011*w;
  }
 }
 if(uKind==11){
  float beat=uTime*max(.1,aPose.w)+aExtra.x;bool fin=aTag>2.5&&aTag<3.5,limb=aTag>4.5&&aTag<5.5;
  if(uRigClass==1){
   if(fin&&p.x<0.){float w=smoothstep(.10,.28,abs(p.z));p.y+=sin(beat*1.2+sign(p.z)*.8)*.035*w;n.z-=sign(p.z)*cos(beat*1.2)*.12*w*n.y;}
   if((fin||limb)&&p.x>.10){float w=smoothstep(.10,.49,p.x),pulse=sin(beat*.6);p.y*=1.+pulse*.05*w;p.z*=1.+pulse*.05*w;n.x-=cos(beat*.6)*.01*w;}
   if(limb){float w=smoothstep(.035,.65,p.x);p.y+=sin(beat*.43+p.x*5.)*.009*w;p.z+=sin(beat*.5+p.x*6.)*.008*w;}
  }else if(uRigClass==2&&limb){
   if(p.y<.24&&p.x<.449){float lift=max(0.,sin(beat+p.x*16.+sign(p.z)*1.6)),foot=1.-smoothstep(.02,.20,p.y);p.y+=lift*.018*foot;p.x+=sin(beat+p.x*16.+sign(p.z)*1.6)*.014*foot;}
   else if(p.y>.40){float w=smoothstep(.40,.65,p.y);p.z+=sin(beat*.48+p.x*9.)*.008*w;}
   else if(p.x>.449)p.y+=sin(beat*1.1+p.z*21.)*.006;
  }else if(uRigClass==3){
   float w=1.-smoothstep(-.5,.10,p.x),wave=beat+p.x*5.;p.z+=sin(wave)*.033*w*w;n.x-=cos(wave)*.165*w*w*n.z;
   if(fin&&p.x>.05){float span=smoothstep(.10,.25,abs(p.z));p.y+=sin(beat*.72+sign(p.z)*1.8)*.016*span;}
  }
 }
 if(uKind==5){
 if(aTag>9.5&&aTag<12.){float side=aTag<10.5?1.:-1.;float ang=sin(uTime*2.45+side*1.5708)*(.045+.155*uSwim);
 float z=max(0.,p.z-.38);p.y+=sin(ang)*z;p.z=.38+cos(ang)*z;
 float knee=max(0.,p.z-1.03);p.y+=sin(uTime*2.45+side*1.5708+.60)*knee*(.03+.10*uSwim);
 n.z-=ang*n.y;}
 if(aTag>11.5&&aTag<14.){p.y+=sin(uTime*.7+aTag)*.014;}
}
 if(uKind==5){float roll=aExtra.x;float a=p.x,b=p.y;p.x=a*cos(roll)-b*sin(roll);p.y=a*sin(roll)+b*cos(roll);float nx=n.x,ny=n.y;n.x=nx*cos(roll)-ny*sin(roll);n.y=nx*sin(roll)+ny*cos(roll);}
 float pitch=aExtra.y;if(uKind==5){p=vec3(p.x,p.y*cos(pitch)+p.z*sin(pitch),-p.y*sin(pitch)+p.z*cos(pitch));n=vec3(n.x,n.y*cos(pitch)+n.z*sin(pitch),-n.y*sin(pitch)+n.z*cos(pitch));}else{p=vec3(p.x*cos(pitch)-p.y*sin(pitch),p.x*sin(pitch)+p.y*cos(pitch),p.z);n=vec3(n.x*cos(pitch)-n.y*sin(pitch),n.x*sin(pitch)+n.y*cos(pitch),n.z);}
 float c=cos(aTransform.x),s=sin(aTransform.x);p*=aTransform.yzw;n/=aTransform.yzw;
 p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);n=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
 vRelative=p+aOffset;vWorld=vRelative+uRenderOrigin;vNormal=normalize(n);vColor=aColor*aTint;vTint=aTint;vGenes=aGenes;vSeed=aExtra.x;
 vLodDistance=distance(uCamera-uRenderOrigin,aOffset);vShadow=uLightVP*vec4(vRelative,1.);vDynamicShadow=uDynamicLightVP*vec4(vRelative,1.);gl_Position=uVP*vec4(vRelative,1.);
}`;
const NOISE_GLSL=`
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.02+vec3(13.1,7.7,2.3);a*=.5;}return v;}
uniform sampler2D uCaustic;
float caustic(vec2 p,float time){
 float frame=mod(time*6.,64.);float i=floor(frame),j=mod(i+1.,64.);
 vec2 q=fract(p*.145);vec2 a=(vec2(mod(i,8.),floor(i/8.))*256.+1.+q*254.)/2048.;
 vec2 b=(vec2(mod(j,8.),floor(j/8.))*256.+1.+q*254.)/2048.;
 // Explicit gradients prevent the atlas wrap from selecting a blurred mip at tile seams.
 vec2 gx=dFdx(p)*(.145*254./2048.),gy=dFdy(p)*(.145*254./2048.);
 float blend=fract(frame);blend=blend*blend*(3.-2.*blend);
 float v=mix(textureGrad(uCaustic,a,gx,gy).r,textureGrad(uCaustic,b,gx,gy).r,blend);
 return pow(max(v,0.),1.32)*4.3;
}
`;
// One optical model is shared by direct illumination, the water ceiling and the view ray.
// Coefficients describe a clear tropical sea; they are artistic parameters, not a site survey.
const WATER_OPTICS_GLSL=`
vec3 waterExtinction(float clarity){return vec3(.060,.028,.018)*clarity;}
vec3 sunThroughWater(float depth,float sunHeight){return exp(-vec3(.044,.018,.009)*depth/max(.40,sunHeight));}
vec3 waterRadiance(vec3 direction,float depth,float sun){
 float up=clamp(direction.y*.65+.48,0.,1.);
 vec3 deep=vec3(.0018,.014,.034),shallows=vec3(.006,.086,.125);
 return mix(deep,shallows,pow(up,1.1))*exp(-depth*.018)*(.42+.58*sun);
}
`;
const FS=`#version 300 es
precision highp float;precision highp int;
in vec3 vWorld;in vec3 vRelative;in vec3 vNormal;in vec3 vColor;in vec3 vLocal;in vec2 vUV;in float vTag;in float vSeed;in vec4 vShadow;in float vLodDistance;uniform vec3 uLODBounds;flat in vec4 vGenes;flat in vec3 vTint;in vec4 vDynamicShadow;uniform int uSamples;uniform int uQuality;uniform vec3 uRenderOrigin;uniform vec4 uTorchParams;uniform vec4 uSurfaceProfile;
uniform vec3 uCamera;uniform float uTime;uniform float uTorch;uniform vec3 uViewForward;uniform vec3 uFog;uniform float uFogDensity;uniform float uSun;uniform int uKind;uniform int uMat;uniform int uSpecies;
uniform sampler2D uSand;uniform sampler2D uSandN;uniform sampler2D uRock;uniform sampler2D uRockN;uniform sampler2D uShell;uniform sampler2D uShellN;uniform sampler2D uCoral;uniform sampler2D uCoralN;uniform highp sampler2DShadow uShadow;uniform highp sampler2DShadow uDynamicShadow;
uniform float uShadowTexel;uniform float uShadows;uniform vec3 uLightDir;uniform vec3 uAirLightDir;uniform vec3 uLightColor;
out vec4 frag;
${NOISE_GLSL}
${WATER_OPTICS_GLSL}
vec3 triMap(sampler2D tex,vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(5.));w/=dot(w,vec3(1.));return texture(tex,p.yz).rgb*w.x+texture(tex,p.xz).rgb*w.y+texture(tex,p.xy).rgb*w.z;}
vec3 triNormal(sampler2D tex,vec3 p,vec3 n,float strength){vec3 w=pow(abs(n),vec3(5.));w/=dot(w,vec3(1.));vec3 a=texture(tex,p.yz).xyz*2.-1.,b=texture(tex,p.xz).xyz*2.-1.,c=texture(tex,p.xy).xyz*2.-1.;vec3 v=vec3(0.,a.x,a.y)*w.x+vec3(b.x,0.,b.y)*w.y+vec3(c.x,c.y,0.)*w.z;return normalize(n+v*strength);}
float visibility(vec3 n){
 if(uShadows<.5)return 1.;vec3 sp=vShadow.xyz/vShadow.w*.5+.5;
 if(any(lessThan(sp,vec3(.001)))||any(greaterThan(sp,vec3(.999))))return 1.;
 float bias=.00012+.00052*(1.-max(dot(n,normalize(uLightDir)),0.));float sum=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)sum+=texture(uShadow,vec3(sp.xy+vec2(x,y)*uShadowTexel*1.05,sp.z-bias));
 vec3 ds=vDynamicShadow.xyz/vDynamicShadow.w*.5+.5;float dyn=1.;
 if(all(greaterThan(ds,vec3(.002)))&&all(lessThan(ds,vec3(.998)))){
  if(uKind==6||uKind==9||uKind==12){
   // Large smooth bodies reveal single-tap shadow stair steps at grazing angles.
   // Keep the actual moving shadow, with slope bias and four local PCF samples.
   float slope=1.-max(dot(n,normalize(uLightDir)),0.),depth=ds.z-(.0009+.0017*slope),texel=uShadowTexel*2.;
   dyn=(texture(uDynamicShadow,vec3(ds.xy+vec2(-.55,-.55)*texel,depth))+texture(uDynamicShadow,vec3(ds.xy+vec2(.55,-.55)*texel,depth))+texture(uDynamicShadow,vec3(ds.xy+vec2(-.55,.55)*texel,depth))+texture(uDynamicShadow,vec3(ds.xy+vec2(.55,.55)*texel,depth)))*.25;
  }else dyn=texture(uDynamicShadow,vec3(ds.xy,ds.z-.0009));
 }
 return mix(.11,1.,sum/9.)*mix(.28,1.,dyn);
}
float aaband(float edge,float value){float w=max(fwidth(value)*.8,.0005);return smoothstep(edge-w,edge+w,value);}
// Skin detail is evaluated on the continuous surface, independently of the mesh
// rings and LOD. Thin anatomical marks fade to coverage below a pixel.
float skinLine(float distanceTo,float radius){float w=max(fwidth(distanceTo)*.7,.00012);return 1.-smoothstep(max(0.,radius-w),radius+w,distanceTo);}
float pelagicSpots(vec2 q){
 // Evaluate footprints before row/cell discontinuities. Small round spots must
 // not become bright crosses where fragments cross a procedural cell edge.
 float footprint=max(length(dFdx(q)),length(dFdy(q)));
 float row=floor(q.y);q.x+=mod(row,2.)*.5;
 vec2 cell=floor(q),delta=fract(q)-.5;
 float jitter=noise(vec3(cell,1.7));delta+=vec2(jitter-.5,noise(vec3(cell,4.2))-.5)*.43;
 delta*=vec2(1.+(noise(vec3(cell,8.1))-.5)*.22,1.);
 float radius=mix(.12,.21,jitter),dist=length(delta),w=max(footprint*.48,.012);
 float spots=1.-smoothstep(radius-w,radius+w,dist);
 spots=mix(spots,.085,smoothstep(.7,1.8,footprint));
 float lineWidth=max(footprint*.48,.012),lines=(1.-smoothstep(max(0.,.014-lineWidth),.014+lineWidth,abs(fract(q.y+.5)-.5)))*.065;
 return max(spots*.82,lines);
}
vec3 pelagicSkin(vec3 base){
 bool body=vTag>.5&&vTag<1.5,fin=vTag>2.5&&vTag<3.5;
 if(!body&&!fin)return base;
 vec3 p=vLocal;
 if(uSpecies==35){
  float clouds=noise(p*vec3(29.,39.,31.))*.70+noise(p*vec3(69.,57.,63.))*.30;
  base=mix(vec3(.28,.37,.40),vec3(.39,.46,.47),smoothstep(.25,.77,clouds));
  float belly=body?1.-smoothstep(-.050,-.013,p.y):smoothstep(.15,.75,-normalize(vNormal).y);
  base=mix(base,vec3(.53,.57,.55),belly*.67);
  if(body){
   float angle=atan(p.z/.068,(p.y+.005)/.070);
   float phase=angle*64.,patternFilter=exp(-pow(fwidth(phase)*.75,2.));
   float throat=smoothstep(-.05,.01,p.x)*(1.-smoothstep(.40,.46,p.x))*(1.-smoothstep(-.035,-.012,p.y));
   base*=1.-(.5+.5*cos(phase))*.085*patternFilter*throat;
   float jaw=-.027+.019*pow(clamp((p.x-.19)/.31,0.,1.),2.);
   float mouth=skinLine(abs(p.y-jaw),.0007)*smoothstep(.18,.24,p.x)*(1.-smoothstep(.485,.50,p.x));
   base=mix(base,vec3(.12,.17,.18),mouth*.70);
   vec2 blow=(p.xz-vec2(.255,sign(p.z)*.005))/vec2(.009,.0025);
   float hole=(1.-aaband(1.,length(blow)))*smoothstep(.04,.055,p.y);
   base=mix(base,vec3(.08,.12,.13),hole*.85);
  }
  return base*vTint;
 }
 if(uSpecies==36){
  float belly=body?1.-smoothstep(-.055,-.023,p.y):smoothstep(.15,.75,-normalize(vNormal).y);
  float grain=noise(p*vec3(30.,45.,35.));
  base=mix(vec3(.19,.29,.31),vec3(.25,.35,.36),grain);
  // Offset rows follow the cylindrical flank. Each fin uses its own plane,
  // avoiding vertical streaks on the dorsal and caudal fins.
  float around=atan(p.z,(p.y+.003)*1.05);
  bool verticalFin=abs(p.z)<.027&&(p.y>-.025||p.x<-.25);
  vec2 q=body?vec2(p.x*43.,around*5.4):(verticalFin?p.xy:p.xz)*vec2(43.,53.);
  float pigment=pelagicSpots(q);
  // Crossfade pigments, not UVs, onto the broad forehead. Three planar fields
  // avoid both a cylindrical nose star and vertically stretched frontal dots.
  if(body){
   vec3 headWeights=pow(abs(vec3((p.x-.43)/.075,(p.y+.010)/.045,p.z/.09)),vec3(5.));headWeights/=max(.00001,headWeights.x+headWeights.y+headWeights.z);
   float headPattern=pelagicSpots(p.yz*vec2(49.,53.))*headWeights.x+pelagicSpots(p.xz*vec2(43.,53.))*headWeights.y+pelagicSpots(p.xy*vec2(43.,49.))*headWeights.z;
   pigment=mix(pigment,headPattern,smoothstep(.34,.455,p.x));
  }
  base=mix(base,vec3(.58,.64,.61),pigment*(1.-belly));
  base=mix(base,vec3(.66,.69,.63),belly*.90);
  if(body){
   float slit=1.;for(int k=0;k<5;k++){float x=.238-float(k)*.021-.010*(1.-pow(clamp(p.y/.085,-1.,1.),2.));slit=min(slit,abs(p.x-x));}
   float gills=skinLine(slit,.0012)*smoothstep(.042,.065,abs(p.z))*smoothstep(-.064,-.045,p.y)*(1.-smoothstep(.052,.072,p.y));
   float mouth=skinLine(abs(p.y+.024-.010*pow(p.z/.075,2.)),.0011)*smoothstep(.438,.465,p.x)*(1.-smoothstep(.068,.084,abs(p.z)));
   base=mix(base,vec3(.09,.14,.14),max(gills*.80,mouth*.9));
  }
  return base*vTint;
 }
 return base;
}

void main(){
 if(uLODBounds.z>0.){float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 if(uLODBounds.x>0.&&dither>=smoothstep(uLODBounds.x-uLODBounds.z,uLODBounds.x+uLODBounds.z,vLodDistance))discard;
 if(dither<smoothstep(uLODBounds.y-uLODBounds.z,uLODBounds.y+uLODBounds.z,vLodDistance))discard;}
 float membrane=1.;
 if(uMat==7&&vTag>20.){
  vec2 q=(vLocal.xy+vec2(sin(vLocal.y*8.),sin(vLocal.x*9.))*.012)*36.;
  float footprint=max(length(dFdx(q)),length(dFdy(q)));
  if(vLodDistance>23.||footprint>1.8)discard;
  vec2 cell=floor(q),f=fract(q);float a=9.,b=9.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 k=vec2(i,j),c=cell+k;vec2 jitter=vec2(hash21(c),hash21(c+vec2(17.,3.)));
   float d=length(k+.17+jitter*.66-f);if(d<a){b=a;a=d;}else b=min(b,d);}
  float width=max(fwidth(b-a),.008);
  membrane=1.-smoothstep(.060-width,.060+width,b-a);
  membrane*=1.-smoothstep(.7,1.8,footprint);
  if(membrane<(uSamples>0?.03:.40))discard;
 }
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 geomN=n;vec3 base=max(vColor,vec3(.001));float rough=.8;float occ=1.;float coverage=1.;float thickness=1.;coverage=membrane;
 if(uMat==1){
 vec2 uv=vWorld.xz*.21;vec3 tex=texture(uSand,uv).rgb;vec3 fine=texture(uSand,uv*3.83+vec2(.37,.68)).rgb;
 base=tex*mix(vec3(.98),fine*1.38,.24);
 vec3 nn=texture(uSandN,uv).xyz*2.-1.;n=normalize(n+vec3(nn.x,0.,nn.y)*.21);float phase=vWorld.z*10.7+sin(vWorld.x*.37)*1.2;float resolve=exp(-2.*pow(fwidth(phase),2.));float rip=sin(phase);n=normalize(n+vec3(.008,0.,rip*.035*resolve));rough=.96;
 float sandPatch=noise(vWorld*.14);base*=.92+.14*sandPatch;
 float slope=1.-smoothstep(.3,.76,n.y);vec3 stone=triMap(uRock,vWorld*.32,n);base=mix(base,stone,slope);
 }
 if(uMat==2){vec3 q=vWorld*.40;vec3 al=triMap(uRock,q,n);
 vec3 micro=triMap(uRock,q*3.17+vec3(.39,.71,.15),n);base=al*mix(vec3(1.),micro*1.75,.11)*vColor*1.04;
 n=triNormal(uRockN,q,n,.26);n=triNormal(uRockN,q*3.17,n,.07);rough=.88+.09*noise(vWorld*1.6);
 float patchMask=fbm(vWorld*.72+vec3(vGenes.x*13.));
 vec3 encrust=mix(vec3(.46,.50,.38),vec3(.55,.37,.38),smoothstep(.56,.77,patchMask));
 base=mix(base,encrust,smoothstep(.46,.72,patchMask)*.38);
 occ=.82+dot(al,vec3(.05,.09,.04));
 float sandDust=smoothstep(.73,.96,n.y)*smoothstep(.54,.76,noise(vWorld*.85));
 base=mix(base,vec3(.63,.59,.47),sandDust*.30);
 }
 if(uMat==16||uMat==17){
  vec3 q=vWorld*.31,stone=triMap(uRock,q,n);
  float bed=vUV.y,frequency=uMat==17?.42:1.7,band=sin(bed*frequency),resolve=exp(-pow(fwidth(bed)*frequency,2.));
  float fracture=abs(sin(bed*.53+noise(vWorld*.18)*.9));
  float seam=1.-smoothstep(.025,.025+max(fwidth(fracture)*1.5,.045),fracture);
  base*=mix(vec3(.88),stone*1.35,.32);base*=1.+band*.10*resolve-seam*.13;
  n=triNormal(uRockN,q,n,uMat==17?.095:.20);
  if(uQuality>0)n=triNormal(uRockN,q*3.1,n,uMat==17?.025:.045);
  rough=uMat==17?.96:.89;occ=clamp(vUV.x,.18,1.);
  if(uMat==16){float deposit=smoothstep(.58,.96,geomN.y);base=mix(base,vec3(.40,.37,.32),deposit*.30);}
 }
 if(uMat==3||uMat==7){vec3 al=triMap(uCoral,vWorld*1.28,n);base*=mix(vec3(.94),al*1.40,.36);
 float age=fbm(vLocal*3.4+vec3(vGenes.x*21.));
 base*=.88+.15*age;
 float lum=dot(base,vec3(.2126,.7152,.0722));base=mix(vec3(lum)*vec3(1.02,1.,.94),base,.72);
 n=triNormal(uCoralN,vWorld*1.28,n,.20);rough=.91;occ=.64+.36*smoothstep(-.1,.44,vLocal.y);}
 if(uMat==4){vec3 q=vLocal*16.;float f=sin(q.x*2.7+sin(q.z*2.8+q.y)*2.3)+sin(q.z*2.9+sin(q.y*2.8+q.x)*2.0);float ridW=max(fwidth(f),.03),ridge=smoothstep(.18-ridW,.18+ridW,abs(f));float ridgeResolve=exp(-pow(max(length(dFdx(q)),length(dFdy(q))),2.)*.22);ridge=mix(.65,ridge,ridgeResolve);base*=.74+.32*ridge;vec3 gro=vec3(cos(q.x*2.7)*.1,0.,cos(q.z*2.9)*.1);n=normalize(n+gro*(1.-ridge)*1.35*ridgeResolve);base*=mix(vec3(.85),triMap(uCoral,vWorld*1.7,n)*1.4,.35);rough=.84;}
 if(uMat==5){if(vTag<1.5){vec2 uv=vec2((vLocal.x+.13)/2.10+.5,vLocal.z/1.5+.5);base=texture(uShell,uv).rgb;vec3 nn=texture(uShellN,uv).rgb*2.-1.;n=normalize(n+vec3(nn.x,0.,nn.y)*.23);rough=.46;}
 else if(vTag<2.5){vec3 q=vLocal*25.;vec2 p=abs(n.y)>.42?q.xz:q.xy;vec2 cell=floor(p);float row=mod(cell.y,2.);p.x+=row*.5;vec2 f=fract(p)-.5;float d=length(f*vec2(1.,.83));float scaleW=max(fwidth(d),.018),border=smoothstep(.425-scaleW,.425+scaleW,d);float tone=.61+noise(vLocal*16.)*.29;base=mix(vec3(.27,.30,.21)*tone*1.3,vec3(.62,.63,.47),border*.64);n=normalize(n+vec3(f.x,0.,f.y)*.09*(1.-border));rough=.72;}
 else if(vTag<3.5){base*=.91+noise(vLocal*28.)*.15;rough=.75;}else{rough=.12;}}
 if(uMat==6){base/=max(vTint,vec3(.001));if(vTag<2.5&&uSpecies>=0){float x=vLocal.x+(vGenes.y-.5)*.027+sin(vLocal.y*13.+vGenes.x*17.)*.004;
 float y=vLocal.y;float widthScale=.87+vGenes.z*.27;
 if(uSpecies==0){base=vec3(.92,.41,.095);float d=min(min(abs(x-.27+y*.10),abs(x+.08-y*.05)),abs(x+.40));d/=widthScale;base=mix(base,vec3(.035,.038,.044),1.-smoothstep(.069,.087,d));base=mix(base,vec3(.92,.90,.83),1.-smoothstep(.048,.064,d));}
 if(uSpecies==1){base=mix(vec3(.16,.37,.53),vec3(.10,.22,.37),smoothstep(-.22,.27,y));float oval=(x+.12)*(x+.12)/(.100*widthScale)+(y-.105)*(y-.105)/(.018*(.93+vGenes.z*.14));
 float ring=(1.-smoothstep(.90,1.17,oval))*smoothstep(.25,.48,oval);
 float streak=(1.-smoothstep(.019,.037,abs(y+.030+x*.075)))*smoothstep(-.46,-.30,x)*(1.-smoothstep(.14,.30,x));
 base=mix(base,vec3(.027,.047,.059),max(ring,streak));base*=.88+.12*smoothstep(-.15,.20,y);
 float cheek=exp(-((x-.27)*(x-.27)*95.+(y+.035)*(y+.035)*170.));base=mix(base,vec3(.09,.28,.48),cheek*.22);}
 if(uSpecies==2){base=mix(vec3(.96,.74,.22),vec3(.89,.87,.67),smoothstep(-.32,-.22,x));float band=1.-smoothstep(.035,.058,abs(x-.228)/widthScale);base=mix(base,vec3(.075,.085,.094),band);}
 if(uSpecies==3){float a=min(abs(x-.21),abs(x+.25))/widthScale;base=mix(vec3(.96,.94,.82),vec3(.045,.052,.060),1.-smoothstep(.065,.092,a));base=mix(base,vec3(.94,.73,.16),1.-smoothstep(-.40,-.32,x));}
 if(uSpecies==4){base=mix(vec3(.78,.79,.70),vec3(.91,.79,.31),smoothstep(.03,.22,y));float a=abs(sin((x+.56)*16.5))/widthScale;base=mix(base,vec3(.07,.11,.13),1.-smoothstep(.37,.57,a));}
 if(uSpecies==6){base=mix(vec3(.12,.53,.42),vec3(.64,.32,.38),smoothstep(.22,.38,x)*(1.-smoothstep(.0,.12,y)));float ring=abs(sin(y*36.+sin(x*14.)*.5));base*=.81+.19*ring;}
 if(uSpecies==7){base=mix(vec3(.21,.57,.43),vec3(.65,.28,.33),1.-smoothstep(.18,.38,abs(sin(y*38.+x*4.))));}
 base*=clamp(.98-vLocal.y*.25,.87,1.07);
 }
 rough=.38+(vGenes.w-.5)*.16;
 if(vTag<2.5){
  base*=vTint;
  float lum=dot(base,vec3(.2126,.7152,.0722));base=mix(vec3(lum),base,.90+.12*vGenes.z);
  float mottle=fbm(vLocal*vec3(17.,28.,22.)+vec3(vGenes.x*71.,vGenes.x*13.,vGenes.x*31.));
  base*=.91+.17*mottle;
  vec2 coord=vLocal.xy*vec2(58.,83.);float footprint=max(length(dFdx(coord)),length(dFdy(coord)));
  coord.x+=mod(floor(coord.y),2.)*.5;vec2 f=fract(coord)-.5;
  float sd=length(f*vec2(1.08,.94));float edge=max(fwidth(sd),.016);
  float scale=1.-smoothstep(.40-edge,.40+edge,sd);
  float fade=(1.-smoothstep(.24,1.3,footprint))*(1.-smoothstep(4.,12.,distance(uCamera,vWorld)));
  base*=1.-(1.-scale)*.020*fade;n=normalize(n+vec3(f.x*.020,f.y*.020,0.)*fade);
  // A lateral line and cheek detail stay attached to this animal, not world coordinates.
  float line=abs(vLocal.y-.028-sin(vLocal.x*2.)*.028);
  base*=1.-(1.-smoothstep(.003,.006+fwidth(line),line))*.065;
 }else if(vTag<3.5){
  float ray=vTag<3.08?atan(vLocal.y+.018,.22-vLocal.x)*22.:vTag<3.18?atan(vLocal.y,-.46-vLocal.x)*30.:vLocal.x*112.+vLocal.y*4.;float rayFilter=exp(-pow(fwidth(ray),2.)*1.5);
  base*=vTint*(.94+.027*sin(ray)*rayFilter);rough=.63;thickness=.16;
  coverage=uSamples>0?.83:1.;
 }else rough=.16;
 }

 if(uMat==8){vec3 al=triMap(uCoral,vWorld*2.1,n);base*=mix(vec3(.85),al*1.15,.55);rough=.87;}
 if(uMat==10){float pore=noise(vLocal*28.);base*=.96+.05*pore;
  if(vTag>.5&&vTag<1.5){
   float phase=vLocal.z*28.+sin(vLocal.x*.8)*.9,resolve=exp(-pow(fwidth(phase)*.7,2.));
   float throat=(1.-smoothstep(-.28,-.14,vLocal.y))*smoothstep(-.8,-.3,vLocal.x)*(1.-smoothstep(3.2,3.6,vLocal.x));
   base*=1.-(.5+.5*sin(phase))*.13*resolve*throat;
   float jaw=-.35+.21*clamp((vLocal.x-1.)/2.6,0.,1.);
   float mouth=skinLine(abs(vLocal.y-jaw),.009)*smoothstep(.9,1.3,vLocal.x)*(1.-smoothstep(3.5,3.69,vLocal.x));
   vec2 blow=(vLocal.xz-vec2(1.9,sign(vLocal.z)*.045))/vec2(.10,.025);
   float holes=(1.-aaband(1.,length(blow)))*smoothstep(.55,.70,vLocal.y);
   base=mix(base,vec3(.07,.105,.12),max(mouth*.72,holes*.85));
  }rough=.57;}
 if(uMat==9){base*=.88+.12*sin(vLocal.y*26.);rough=.8;}
 if(uMat==11){
 if(vTag<.5){vec2 yarn=vLocal.xz*vec2(690.,710.);float weave=sin(yarn.x)*sin(yarn.y)*exp(-pow(max(length(dFdx(yarn)),length(dFdy(yarn))),2.)*.4);base*=.91+weave*.04;rough=.89;}
 else if(vTag<1.5){rough=.26;float wire=vLocal.z*260.;base*=.96+.035*sin(wire)*exp(-pow(fwidth(wire),2.));}
 else if(vTag<2.5){rough=.13;base=mix(base,vec3(.16,.27,.28),.2);}
 else {rough=.77;base*=.95+noise(vLocal*115.)*.07;}
 }
 if(uMat==12){rough=vTag>.5?.30:.58;float planks=smoothstep(.47,.50,abs(fract(vLocal.x*3.2)-.5));if(base.r>base.b*1.6)base*=1.-planks*.25;}
 if(uMat==13){rough=.92;base*=.76+.32*noise(vLocal*1.6);n=normalize(n+vec3(noise(vLocal*8.)-.5,0.,noise(vLocal*7.+3.)-.5)*.11);}
 if(uMat==14){rough=.34;float grain=noise(vLocal*40.);base*=.97+.05*grain;}
 if(uMat==15){float upn=smoothstep(.1,.6,geomN.y),alt=smoothstep(-.5,6.,vWorld.y);base=mix(vec3(.49,.47,.39),vec3(.19,.30,.19),upn*alt);rough=.95;}
 if(uKind==8){
  rough=uSpecies==19?.34:uSpecies==13?.43:.57;
  if(vTag>2.5&&vTag<3.5){rough=.46;thickness=.24;}
  // Continuous skin pigmentation is independent of mesh tessellation. Eyes are
  // tag 4; dark mouths/apertures retain their authored anatomical colours.
  if(((vTag>.5&&vTag<1.5)||(uSpecies==19&&vTag>6.5&&vTag<7.5))&&length(base)>.25){
   if(uSpecies==13){
    // Follow the mantle's elliptical edge, not the colour of each source face.
    float rim=length(vLocal.xz/vec2(.46,.176));
    rim+=sin(vLocal.x*19.+vLocal.z*17.)*.018;
    float w=max(fwidth(rim),.012),white=smoothstep(.84-w,.91+w,rim);
    float mantle=smoothstep(.082,.125,vLocal.y);
    base=mix(vec3(.47,.22,.54),vec3(.52,.24,.69),mantle);
    base=mix(base,vec3(.90,.88,.84),white*mantle);
   }else if(uSpecies==16){
    float cloud=noise(vLocal*6.7+vec3(vGenes.x*3.,.4,1.2))*.73+noise(vLocal*16.3)*.27;
    float patches=smoothstep(.49,.72,cloud);
    base=mix(vec3(.68,.43,.17),vec3(.31,.19,.075),patches);
    base*=.92+.12*noise(vLocal*31.);rough=.76;
   }else if(uSpecies==17){
    float stripes=vLocal.x*53.+vLocal.y*11.+sin(vLocal.y*9.+vLocal.z*6.)*.45;
    float footprint=fwidth(stripes),w=max(footprint*.6,.045);
    float pigment=smoothstep(.05-w,.05+w,sin(stripes));
    // Subpixel bands converge to their average instead of flickering at range.
    pigment=mix(pigment,.48,smoothstep(.7,3.14159,footprint));
    base=mix(vec3(.84,.77,.59),vec3(.48,.22,.16),pigment);
   }else if(uSpecies==18){
    float cloud=noise(vLocal*vec3(8.,12.,11.)+vec3(0.,vGenes.x*2.,0.))*.7+noise(vLocal*23.)*.3;
    base=mix(vec3(.36,.31,.22),vec3(.75,.68,.52),smoothstep(.20,.80,cloud));
    float band=1.-smoothstep(.012,.030,abs(vLocal.x+.070));
    base=mix(base,vec3(.76,.71,.56),band*.54);
    base*=.96+.04*sin(uTime*.19+vLocal.x*7.+vGenes.x*6.);rough=.49;
   }else if(uSpecies==19&&vTag>6.5&&vTag<7.5){
    vec2 shell=vLocal.xy-vec2(-.13,.045);float radial=length(shell),angle=atan(shell.y,shell.x);
    // Growth bands taper before the pale umbilicus. Low-frequency wandering
    // and occasional outer forks avoid a radial pinwheel converging at one dot.
    float variation=noise(vLocal*6.3),stripes=angle*15.+radial*4.8+sin(angle*4.+radial*10.)*.48+variation*.75;
    float footprint=fwidth(stripes),w=max(footprint*.55,.035);
    float reach=smoothstep(.16,.35,radial),width=mix(.94,.28,smoothstep(.18,.49,radial))+(variation-.5)*.20;
    float pigment=smoothstep(width-w,width+w,sin(stripes));
    float fork=smoothstep(.34,.49,radial)*smoothstep(.47,.68,variation);
    float split=1.-smoothstep(.06+w,.18+w,abs(cos(stripes)));
    pigment*=reach*(1.-fork*split*.88);
    pigment=mix(pigment,.28*reach,smoothstep(1.,3.14159,footprint));
    base=mix(vec3(.84,.79,.67),vec3(.43,.22,.13),pigment);
    base*=.97+.03*noise(vLocal*32.);rough=.32;
   }
  }
  if(vTag>3.5&&vTag<4.5)rough=.15;
 }
 if(uKind==9){
  rough=.38;if(vTag>2.5&&vTag<3.5){rough=.43;thickness=.32;}if(vTag>3.5&&vTag<4.5)rough=.14;
  // Only the orca's two small pigment regions need analytic reconstruction;
  // preserve all other species paint, lower jaw, eyes and separately tagged fins.
  if(uSpecies==23&&vTag>.5&&vTag<1.5&&vLocal.y>.005){
   if((vLocal.x>.21&&vLocal.x<.39)||(vLocal.x>-.26&&vLocal.x<.025)){
    vec2 ep=(vLocal.xy-vec2(.298,.044))/vec2(.052,.026),sa=(vLocal.xy-vec2(-.113,.068))/vec2(.10,.08);
    float eq=dot(ep,ep),sq=dot(sa,sa),ew=max(.025,fwidth(eq)*.55),sw=max(.025,fwidth(sq)*.55);
    float eyePatch=(1.-smoothstep(.75-ew,1.1+ew,eq))*smoothstep(.03,.055,abs(vLocal.z));
    float saddle=(1.-smoothstep(.65-sw,1.2+sw,sq))*smoothstep(.020,.070,vLocal.y);
    base=mix(vec3(.027,.034,.040),vec3(.81,.82,.77),eyePatch);base=mix(base,vec3(.43,.47,.45),saddle)*vTint;
   }
  }
 }
 if(uKind==10){rough=uSpecies==31?.70:.49;if(vTag>2.5&&vTag<3.5){rough=.52;thickness=.3;}if(vTag>3.5&&vTag<4.5)rough=.16;}
 if(uKind==9||uKind==12)base=pelagicSkin(base);
 vec3 L=normalize(vWorld.y<0.?uLightDir:uAirLightDir);vec3 E=normalize(uCamera-uRenderOrigin-vRelative);
 float NoL=max(0.,dot(n,L)),NoV=max(.03,dot(n,E));float sh=visibility(n);float hemi=clamp(n.y*.5+.5,0.,1.);
 // Work in linear light; water-to-surface reflection is not dry-plastic gloss.
 if(uSurfaceProfile.x>=0.&&uSpecies>=0){
  rough=vTag>6.5&&vTag<7.5?.28:uSurfaceProfile.x;
  if(vTag>2.5&&vTag<3.5){rough=max(.32,rough-.07);thickness=mix(.45,.18,uSurfaceProfile.y);}
  if(vTag>3.5&&vTag<4.5)rough=.12;
  else if(vTag>.5&&vTag<1.5){float f=max(.1,uSurfaceProfile.z),footprint=max(length(dFdx(vLocal*f)),length(dFdy(vLocal*f))),detail=exp(-footprint*footprint*.8);base*=1.+(noise(vLocal*f)-.5)*.035*detail;}
 }
 vec3 albedo=pow(clamp(base,vec3(0.),vec3(1.)),vec3(2.2));float depth=max(0.,-vWorld.y);
 vec3 waterAbsorb=sunThroughWater(depth,L.y);
 // Skylight and a restrained sandy-bottom bounce retain detail beneath ledges.
 vec3 ambient=mix(vec3(.040,.062,.067),vec3(.16,.24,.27),hemi)*occ*exp(-depth*.020);
 ambient+=vec3(.045,.044,.031)*(1.-hemi)*occ*exp(-depth*.04)*uSun;
 ambient*=mix(.66,1.,sh);
 float irradiance=1.72*uSun;
 vec3 direct=uLightColor*irradiance*NoL*sh*waterAbsorb;
 vec2 surfacePoint=vWorld.xz-vWorld.y*L.xz/max(.30,L.y);
 vec2 drift=vec2(sin(surfacePoint.y*.16+uTime*.12),cos(surfacePoint.x*.18-uTime*.10))*.22;
 float ca=caustic(surfacePoint+drift,uTime)*max(0.,dot(geomN,L))*sh*.35*uSun;
 ca*=exp(-depth*.038)/(1.+depth*.022)*(1.-smoothstep(-.08,.02,vWorld.y));
 vec3 col=albedo*(ambient+direct+uLightColor*waterAbsorb*ca);
 // A small two-sided transmission approximation for fins and growing tissue.
 if(thickness<.5||uMat==3||uMat==7){float back=pow(max(0.,dot(-n,L)),1.4);
  col+=albedo*uLightColor*waterAbsorb*back*(thickness<.5?.21:.045)*sh*uSun;}
 vec3 H=normalize(E+L);float NoH=max(dot(n,H),0.),VoH=max(dot(E,H),0.);
 vec3 ddx=dFdx(n),ddy=dFdy(n);
 float normalVariance=.20*(dot(ddx,ddx)+dot(ddy,ddy));
 float a2=clamp(pow(rough,4.)+min(normalVariance,.16),.008,.97);
 float den=NoH*NoH*(a2-1.)+1.;float D=a2/(3.14159265*den*den);
 float gv=NoL*sqrt(NoV*NoV*(1.-a2)+a2),gl=NoV*sqrt(NoL*NoL*(1.-a2)+a2);
 float G=.5/max(gv+gl,.0001);
 float F0=(uMat==6||uMat==5)?(vTag>3.5?.018:.006):uMat==11?.019:.005;
 float F=F0+(1.-F0)*pow(1.-VoH,5.);
 col+=uLightColor*waterAbsorb*D*G*F*NoL*sh*irradiance;
 // This rim is reflected environmental light, not an emissive rock edge.
 col+=vec3(.015,.028,.035)*pow(1.-NoV,4.)*occ*exp(-depth*.020);
 // A camera-mounted lamp lights visible surface normals in world space. Its
 // outgoing path loses warm wavelengths before the view ray attenuates it again.
 if(uTorch>.5&&vWorld.y<0.){
  float lampDistance=length(vRelative-(uCamera-uRenderOrigin));
  float cone=smoothstep(uTorchParams.x,uTorchParams.y,dot(-E,normalize(uViewForward)));
  vec3 lampTransmission=exp(-vec3(.044,.018,.009)*lampDistance);
  float wrap=uSurfaceProfile.x>=0.&&!(vTag>6.5&&vTag<7.5)?uSurfaceProfile.y*.32:0.;
  float diffuse=max(.025,(dot(n,E)+wrap)/(1.+wrap));
  // A camera-mounted lamp has L=E and H=E. Use the same roughness/variance
  // as sunlight so hard shell, wet skin and matte sediment remain distinct
  // when sunlight has vanished. Water-to-surface F0 keeps the sheen restrained.
  float lampDen=NoV*NoV*(a2-1.)+1.;
  float lampD=a2/(3.14159265*lampDen*lampDen);
  float lampG=.25/max(NoV*sqrt(NoV*NoV*(1.-a2)+a2),.0001);
  float lampSpec=lampD*lampG*F0*NoV;
  col+=(albedo*diffuse+vec3(lampSpec))*vec3(1.0,.91,.80)*lampTransmission*cone*uTorchParams.z/(1.+lampDistance*lampDistance*uTorchParams.w);
 }
 if(uKind==10&&vTag>5.5&&vTag<6.5)col+=vec3(.20,.56,.40)*(1.+.04*sin(uTime*.7+vSeed));
 if(uKind==11&&vTag>5.5&&vTag<6.5)col+=vec3(.07,.48,.64)*(.82+.18*sin(uTime*.55+vSeed));
 frag=vec4(max(col,vec3(0.)),clamp(coverage,.0,1.));

}`;
const SHADOW_FS=`#version 300 es
precision highp float;precision highp int;in float vTag;uniform int uMat;void main(){if(uMat==7&&vTag>20.)discard;}`;
const SKY_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform mat4 uInvVP;uniform vec3 uRenderOrigin;uniform vec3 uCamera;uniform vec3 uAirLightDir;uniform vec3 uLightColor;uniform float uSun;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec4 w=uInvVP*vec4(uv*2.-1.,.99999,1.);vec3 rd=normalize(w.xyz/w.w-(uCamera-uRenderOrigin));vec3 sky;
 if(uCamera.y>-.18){float a=pow(max(0.,rd.y),.45);sky=mix(vec3(.50,.66,.73),vec3(.055,.22,.45),a);float sun=pow(max(dot(rd,normalize(uAirLightDir)),0.),1800.);sky+=uLightColor*(sun*14.+pow(max(dot(rd,normalize(uAirLightDir)),0.),24.)*.10);vec2 cp=rd.xz/max(.09,rd.y)*1.3+vec2(uTime*.003,0);float cloud=n2(cp)*.6+n2(cp*2.05)*.27+n2(cp*4.1)*.13;float cw=smoothstep(.58,.76,cloud)*smoothstep(.01,.13,rd.y);sky=mix(sky,vec3(.92,.94,.91),cw*.74);sky*=.3+.7*uSun;}
 else {float up=clamp(rd.y*.62+.50,0.,1.);sky=mix(vec3(.0008,.008,.035),vec3(.0018,.080,.21),pow(up,.78))*exp(-max(0.,-uCamera.y)*.013)*(.55+.45*uSun);}
 frag=vec4(sky,1.);gl_FragDepth=1.;
}`;

// The long-wave mesh and filtered capillary normals use the same stationary ocean field.
const WATER_WAVES_GLSL=`
float oceanPhase(vec2 p,float time,float k,vec2 direction){
 float frequency=.105*pow(1.62,k);
 return dot(p,direction)*frequency+time*sqrt(9.81*frequency)*.43+k*k*.81;
}
vec3 oceanWave(vec2 p,float time,float footprint){
 vec3 result=vec3(0.);
 for(int i=0;i<10;i++){float k=float(i),angle=k*2.399963+.37;vec2 direction=vec2(cos(angle),sin(angle));
  float frequency=.105*pow(1.62,k),phase=oceanPhase(p,time,k,direction);
  float filtered=1.-smoothstep(.55,2.5,footprint*frequency);
  float slope=.023/(1.+k*.18)*filtered;
  result.xy+=direction*cos(phase)*slope;
  result.z+=sin(phase)*slope/frequency;
 }
 return result;
}
`;
const WATER_VS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPosition;uniform mat4 uVP;uniform vec3 uRenderOrigin;uniform vec3 uCamera;uniform float uTime;out vec3 vP;
${WATER_WAVES_GLSL}
void main(){vec3 p=aPosition;p.xz+=uCamera.xz;p.y=oceanWave(p.xz,uTime,3.).z;vP=p;gl_Position=uVP*vec4(p-uRenderOrigin,1.);}`;
const WATER_FS=`#version 300 es
precision highp float;
in vec3 vP;uniform vec3 uCamera;uniform float uTime;uniform float uSun;uniform vec3 uFog;uniform vec3 uLightDir;uniform vec3 uAirLightDir;uniform vec3 uLightColor;out vec4 frag;
${NOISE_GLSL}
${WATER_OPTICS_GLSL}
${WATER_WAVES_GLSL}
vec3 skyRadiance(vec3 direction){
 float elevation=pow(clamp(direction.y,0.,1.),.42);
 vec3 sky=mix(vec3(.42,.57,.64),vec3(.065,.20,.36),elevation);
 vec2 projected=direction.xz/max(.15,direction.y)*1.05+vec2(uTime*.002,0.);
 float clouds=noise(vec3(projected,2.6))*.66+noise(vec3(projected*2.06,6.1))*.34;
 float cloudCover=smoothstep(.54,.76,clouds)*smoothstep(.01,.18,direction.y);
 sky=mix(sky,vec3(.80,.83,.80),cloudCover*.70);
 float alignment=max(dot(direction,normalize(uAirLightDir)),0.);
 sky+=uLightColor*(pow(alignment,1900.)*11.+pow(alignment,34.)*.15)*uSun;
 return sky*(.34+.66*uSun);
}
void main(){
 vec2 p=vP.xz;float footprint=max(length(dFdx(p)),length(dFdy(p)));
 vec2 slope=oceanWave(p,uTime,footprint).xy;
 vec3 N=normalize(vec3(-slope.x,1.,-slope.y)),E=normalize(uCamera-vP);
 if(uCamera.y>-.18){
  vec3 reflected=skyRadiance(reflect(-E,N));float cosine=max(dot(E,N),0.);
  float fresnel=.0204+.9796*pow(1.-cosine,5.);
  float coast=exp(-length(vP.xz-vec2(-24.,43.))*.018);
  vec3 water=mix(vec3(.002,.030,.051),vec3(.006,.115,.117),coast*.64);
  frag=vec4(mix(water*(.35+.65*uSun),reflected,fresnel),1.);return;
 }
 // Water-to-air refraction creates the 97-degree Snell window. Outside it the
 // surface reflects the darker ocean, rather than drawing a painted blue ceiling.
 vec3 outgoing=-E;N=-N;
 vec3 airRay=refract(outgoing,N,1.333);float window=step(.001,dot(airRay,airRay));
 float cosI=clamp(-dot(outgoing,N),.001,1.),cosT=sqrt(max(0.,1.-1.333*1.333*(1.-cosI*cosI)));
 float rs=(1.333*cosI-cosT)/(1.333*cosI+cosT+.0001);
 float rp=(cosI-1.333*cosT)/(cosI+1.333*cosT+.0001);
 float fresnel=window>.5?clamp((rs*rs+rp*rp)*.5,0.,1.):1.;
 vec3 reflectedDirection=reflect(outgoing,N);
 vec3 reflected=waterRadiance(reflectedDirection,5.,uSun)*1.8;
 // Broad bottom light in the reflection stays subtle and has no repeating reef decals.
 reflected+=vec3(.010,.028,.026)*pow(max(0.,-reflectedDirection.y),2.);
 vec3 transmitted=skyRadiance(airRay/max(length(airRay),.001));
 vec3 col=mix(transmitted,reflected,fresnel);
 frag=vec4(max(col,vec3(0.)),1.);
}`;
const POINT_VS=`#version 300 es
precision highp float;layout(location=0) in vec4 aP;uniform mat4 uVP;uniform float uTime;uniform vec3 uCamera;uniform float uScale;uniform vec3 uRenderOrigin;uniform vec3 uViewForward;uniform vec4 uTorchParams;uniform float uTorch;out float vAlpha;out float vType;
void main(){vec3 cell=vec3(48.,32.,48.);vec3 p=aP.xyz;
 p+=vec3(sin(uTime*.08+aP.w*17.)*.8,-uTime*(.027+aP.w*.041),cos(uTime*.10+aP.w*11.)*.5);
 p=mod(p-uCamera+cell*.5,cell)-cell*.5+uCamera;
 float d=distance(p,uCamera);gl_Position=uVP*vec4(p-uRenderOrigin,1.);
 gl_PointSize=clamp((.32+aP.w*.9)*uScale/max(gl_Position.w,1.),.7,3.4);
 vAlpha=.19*(1.-smoothstep(9.,23.,d))*smoothstep(.6,3.,d)*(1.-smoothstep(-.65,-.05,p.y));float beam=smoothstep(uTorchParams.x,uTorchParams.y,dot(normalize(p-uCamera),normalize(uViewForward)))*uTorch*uTorchParams.z/(1.+d*d*uTorchParams.w);
 vAlpha*=clamp(exp(min(0.,uCamera.y)*.022)+beam*.42,0.,1.);vType=aP.w;}`;
const POINT_FS=`#version 300 es
precision highp float;in float vAlpha;in float vType;out vec4 frag;
void main(){float r=length(gl_PointCoord-.5);frag=vec4(mix(vec3(.39,.62,.69),vec3(.64,.76,.77),vType),(1.-smoothstep(.04,.5,r))*vAlpha);}`;
const RAY_VS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPosition;layout(location=1) in vec2 aUV;uniform mat4 uVP;uniform vec3 uRenderOrigin;out vec2 vUV;out vec3 vP;void main(){vP=aPosition;vUV=aUV;gl_Position=uVP*vec4(aPosition-uRenderOrigin,1.);}`;
const RAY_FS=`#version 300 es
precision highp float;in vec2 vUV;in vec3 vP;uniform float uTime;uniform float uSun;uniform vec3 uCamera;out vec4 frag;
void main(){float x=pow(max(0.,sin(vUV.x*3.14159265)),3.);float end=smoothstep(0.,.05,vUV.y)*(1.-smoothstep(.22,1.,vUV.y));float pulse=.65+.35*sin(uTime*.3+vP.x*.19+vP.z*.3);float a=x*end*.024*pulse*uSun;frag=vec4(.53,.81,.83,a);}`;
const POST_VS=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
// Low-resolution, depth-aware participating medium pass. Static geometry occludes sunlight.
const VOLUME_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D uDepth;uniform sampler2D uVolumeShadow;
uniform vec2 uResolution;uniform vec2 uVolumeResolution;uniform mat4 uInvVP;uniform mat4 uLightVP;
uniform vec3 uEye;uniform vec3 uRenderOrigin;uniform vec3 uLightDir;uniform vec3 uLightColor;uniform float uTime;uniform float uSun;uniform float uClarity;uniform float uLamp;uniform int uQuality;
${NOISE_GLSL}
${WATER_OPTICS_GLSL}
vec3 at(vec2 p,float d){vec4 h=uInvVP*vec4(p*2.-1.,d*2.-1.,1.);return h.xyz/h.w;}
float visibility(vec3 p){vec4 a=uLightVP*vec4(p,1.);vec3 q=a.xyz/a.w*.5+.5;
 if(any(lessThan(q,vec3(.002)))||any(greaterThan(q,vec3(.998))))return 1.;
 return q.z-.0015>texture(uVolumeShadow,q.xy).r?.14:1.;}
void main(){float d=texture(uDepth,uv).r;vec3 p=at(uv,min(d,.99999));vec3 delta=p-uEye;float dist=min(length(delta),700.);vec3 rd=normalize(delta);
 float ao=0.;
 if(uQuality>0&&d<.9999){vec3 n=normalize(cross(dFdx(p),dFdy(p)));if(dot(n,uEye-p)<0.)n=-n;
  float radius=clamp(uResolution.y*.14/(dist+3.),2.,24.);int count=uQuality==2?8:4;
  for(int i=0;i<8;i++){if(i>=count)break;float a=float(i)*2.39996;vec2 off=vec2(cos(a),sin(a))/uResolution*radius*(.55+float(i)*.065);
   float dd=texture(uDepth,uv+off).r;vec3 q=at(uv+off,dd)-p;float l=length(q);ao+=smoothstep(.18,.85,dot(n,q/max(.001,l)))*exp(-l*l*1.8)*step(.05,l);}
  ao=min(.34,ao*(uQuality==2?.095:.16));
 }
 if(uEye.y+uRenderOrigin.y>-.18){frag=vec4(0.,0.,0.,1.-ao);return;}
 vec3 extinction=waterExtinction(uClarity);int steps=uQuality==2?12:uQuality==1?8:4;
 float span=min(dist,80.);if(rd.y>.001)span=min(span,max(0.,-(uEye.y+uRenderOrigin.y)/rd.y));
 float mu=dot(rd,normalize(uLightDir));const float anisotropy=.74;
 float phase=.20+.34*(1.-anisotropy*anisotropy)/pow(max(.045,1.+anisotropy*anisotropy-2.*anisotropy*mu),1.5);
 // Stratification is shared by neighboring pixels: per-pixel jitter without a temporal
 // history produces a visible diagonal mesh in clear water, especially on phones.
 vec3 scatter=vec3(0.);float stepLength=span/float(steps);
 vec3 forward=normalize(at(vec2(.5),.5)-uEye);
 float torchCone=smoothstep(.76,.987,dot(rd,forward))*uLamp;
 for(int i=0;i<12;i++){if(i>=steps)break;float stratum=.30+fract(float(i)*.618033989)*.40;float s=(float(i)+stratum)*stepLength;vec3 q=uEye+rd*s;float dep=max(0.,-q.y-uRenderOrigin.y);
  vec2 surf=q.xz+uRenderOrigin.xz-(q.y+uRenderOrigin.y)*uLightDir.xz/max(.2,uLightDir.y);
  // Broad, irregular swell focuses shafts. Atlas caustics supply only a little detail;
  // using their fine periodic lattice as the beam mask creates a striped curtain.
  vec2 warp=vec2(sin(surf.y*.041+uTime*.018),cos(surf.x*.037-uTime*.015))*.52;
  float swell=noise(vec3(surf*.105+warp,uTime*.025));
  float focused=pow(smoothstep(.34,.76,swell),3.);
  float beam=.08+focused*(.54+min(caustic(surf*.64,uTime*.83),2.4)*.055);
  vec3 solar=sunThroughWater(dep,uLightDir.y);
  scatter+=uLightColor*solar*visibility(q)*beam*exp(-extinction*s)*stepLength*.011*phase*uSun;
  float torchScatter=torchCone/(1.+s*s*.055)*smoothstep(.3,1.5,s);
  scatter+=vec3(.42,.66,.73)*torchScatter*exp(-extinction*s*2.)*stepLength*.006;
 }
 frag=vec4(scatter,1.-ao);
}`;
// A small bilateral filter is evaluated only at the volumetric resolution. It removes
// sampling structure in shafts while retaining the depth boundary around nearby animals.
const VOLUME_FILTER_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D uVolume;uniform sampler2D uDepth;uniform vec2 uVolumeResolution;uniform mat4 uInvVP;uniform vec3 uEye;uniform vec3 uRenderOrigin;uniform int uQuality;
float distanceAt(vec2 p){float d=texture(uDepth,p).r;vec4 h=uInvVP*vec4(p*2.-1.,min(d,.99999)*2.-1.,1.);return min(length(h.xyz/h.w-uEye),100.);}
void main(){float center=distanceAt(uv),sum=0.;vec4 filtered=vec4(0.);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  if(uQuality==0&&x!=0&&y!=0)continue;
  vec2 q=uv+vec2(x,y)/uVolumeResolution*1.15;
  float spatial=float((x==0?2:1)*(y==0?2:1));float weight=spatial*exp(-abs(distanceAt(q)-center)*.85);
  filtered+=texture(uVolume,q)*weight;sum+=weight;
 }
 frag=filtered/max(sum,.001);
}`;
const POST_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D uScene;uniform sampler2D uDepth;uniform sampler2D uVolume;
uniform vec2 uResolution;uniform vec2 uVolumeResolution;uniform mat4 uInvVP;uniform vec3 uEye;uniform vec3 uRenderOrigin;uniform float uTime;uniform float uSun;uniform float uExposure;uniform float uPhotoAperture;uniform float uPhotoFocus;uniform float uClarity;uniform float uLamp;uniform int uQuality;
${WATER_OPTICS_GLSL}
vec3 world(vec2 p,float d){vec4 h=uInvVP*vec4(p*2.-1.,d*2.-1.,1.);return h.xyz/h.w;}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){float d=texture(uDepth,uv).r;vec3 p=world(uv,min(d,.99999)),rd=normalize(p-uEye);float distanceTo=min(length(p-uEye),700.);
 vec3 col=texture(uScene,uv).rgb;
 // Camera-only circle of confusion: actual scene depth drives foreground/background blur.
 // Keep high-contrast foreground silhouettes from bleeding across the focused subject.
 if(uPhotoAperture>0.){
  float coc=clamp(abs(distanceTo-uPhotoFocus)/max(distanceTo,.5)*18./uPhotoAperture,0.,8.);
  if(coc>.35){vec3 sum=col;float total=1.;
   for(int k=0;k<12;k++){float a=float(k)*2.39996323;float r=sqrt((float(k)+.5)/12.)*coc;
    vec2 q=clamp(uv+vec2(cos(a),sin(a))*r/uResolution,vec2(.0001),vec2(.9999));
    float nd=length(world(q,min(texture(uDepth,q).r,.99999))-uEye);
    float nc=clamp(abs(nd-uPhotoFocus)/max(nd,.5)*18./uPhotoAperture,0.,8.);
    float weight=smoothstep(r-.7,r+.7,nc+.8)*exp(-max(0.,distanceTo-nd)*.20);
    sum+=texture(uScene,q).rgb*weight;total+=weight;
   }col=sum/total;
  }
 }
 // Four depth-aware reconstruction taps prevent light/occlusion halos around foreground fish.
 vec2 grid=uv*uVolumeResolution-.5,base=floor(grid),f=fract(grid);vec4 fog=vec4(0.);float weights=0.;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 q=(base+vec2(x,y)+.5)/uVolumeResolution;
  float dd=texture(uDepth,q).r;float nd=length(world(q,min(dd,.99999))-uEye);float w=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y)*exp(-abs(nd-distanceTo)*.8)+.0001;
  fog+=texture(uVolume,q)*w;weights+=w;}
 fog/=weights;col*=fog.a;

 vec3 trans=exp(-waterExtinction(uClarity)*distanceTo);float depth=max(0.,-uEye.y-uRenderOrigin.y);
 vec3 water=waterRadiance(rd,depth,uSun);
 if(uEye.y+uRenderOrigin.y<=-.18){if(d>.99995)col=water+fog.rgb;else col=col*trans+water*(1.-trans)+fog.rgb;}
 else if(d<.99995){float haze=1.-exp(-distanceTo*.0011);col=mix(col,vec3(.43,.60,.69),haze);}

 col=film(col*uExposure);col=pow(col,vec3(1./2.2));
 col*=1.-.035*pow(length((uv-.5)*vec2(1.,.85))*1.4,2.);
 // Sub-visible ordered grain removes 8-bit gradient bands without softening the reef.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 col+=dither/255.;
 frag=vec4(col,1.);
}`;

const BUBBLE_VS=`#version 300 es
precision highp float;layout(location=0) in vec4 aBubble;uniform mat4 uVP;uniform vec3 uRenderOrigin;uniform float uHeight;out float age;
void main(){gl_Position=uVP*vec4(aBubble.xyz-uRenderOrigin,1.);gl_PointSize=clamp(aBubble.w*uHeight/max(gl_Position.w,.3),1.1,35.);age=aBubble.w;}`;
const BUBBLE_FS=`#version 300 es
precision highp float;out vec4 frag;in float age;
void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=length(p);if(r>.98)discard;
 float rim=exp(-pow((r-.82)*15.,2.));float glint=exp(-length(p-vec2(-.30,.40))*11.);
 float centre=(1.-r*r)*.016;frag=vec4(vec3(.40,.70,.81)*(.45+glint*3.),rim*.25+glint*.8+centre);}`;

// Edge-directed antialiasing on the final, tone-mapped underwater image.
const AA_FS=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D uImage;uniform vec2 uPixel;out vec4 frag;
float L(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec3 c=texture(uImage,uv).rgb;
float nw=L(texture(uImage,uv+uPixel*vec2(-1.,1.)).rgb),ne=L(texture(uImage,uv+uPixel*vec2(1.,1.)).rgb);
float sw=L(texture(uImage,uv+uPixel*vec2(-1.,-1.)).rgb),se=L(texture(uImage,uv+uPixel*vec2(1.,-1.)).rgb),m=L(c);
float lo=min(m,min(min(nw,ne),min(sw,se))),hi=max(m,max(max(nw,ne),max(sw,se)));
if(hi-lo<max(.025,hi*.11)){frag=vec4(c,1.);return;}
vec2 d=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
float reduce=max((nw+ne+sw+se)*.03125,.0078125);d=clamp(d/(min(abs(d.x),abs(d.y))+reduce),vec2(-6.),vec2(6.))*uPixel;
vec3 a=.5*(texture(uImage,uv+d*(-1./6.)).rgb+texture(uImage,uv+d*(1./6.)).rgb);
vec3 b=a*.5+.25*(texture(uImage,uv-d*.5).rgb+texture(uImage,uv+d*.5).rgb);
float lb=L(b);frag=vec4(lb<lo||lb>hi?a:b,1.);
}`;

class Renderer{
 constructor(canvas,initialQuality=null){this.canvas=canvas;const g=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!g)throw new Error('請以支援 WebGL 2 的一般瀏覽器開啟。');this.gl=g;this.maxTextureSize=g.getParameter(g.MAX_TEXTURE_SIZE);this.mobile=matchMedia('(pointer:coarse)').matches;this.batches=[];this.fog=[.0008,.005,.028];this.lightDir=V.norm([-.36,1.,.30]);this.lightColor=[1.05,1.02,.93];this.clarity=1.;this.lamp=false;this.dynamicScale=1;this.lighting="day";this.fogDensity=.034;this.sun=1.02;this.quality=initialQuality??(this.mobile?1:2);this.exposure=1.11;this.drawCalls=0;this.frame=0;
  this.program=this.makeProgram(VS,FS);this.shadowProgram=this.makeProgram(VS,SHADOW_FS);this.waterProgram=this.makeProgram(WATER_VS,WATER_FS);this.pointProgram=this.makeProgram(POINT_VS,POINT_FS);this.rayProgram=this.makeProgram(RAY_VS,RAY_FS);this.postProgram=this.makeProgram(POST_VS,POST_FS);this.volumeProgram=this.makeProgram(POST_VS,VOLUME_FS);this.volumeFilterProgram=this.makeProgram(POST_VS,VOLUME_FILTER_FS);this.bubbleProgram=this.makeProgram(BUBBLE_VS,BUBBLE_FS);this.aaProgram=this.makeProgram(POST_VS,AA_FS);this.skyProgram=this.makeProgram(POST_VS,SKY_FS);this.msaaSamples=0;
  this.floatColor=!!g.getExtension('EXT_color_buffer_float');this.aniso=g.getExtension('EXT_texture_filter_anisotropic');this.textures=[];this.loaded=this.loadTextures();g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);this.lightVP=mm(ortho(-51,51,-51,51,.1,180),lookAt([-42,84,14],[0,-12,-12]));
  this.setupWater();this.setupBubbles();this.setupParticles();this.setupRays();this.setupShadow();this.postVAO=g.createVertexArray();this.resize();
 }
 makeProgram(v,f){let g=this.gl;const shader=(type,src)=>{let s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};let p=g.createProgram(),vs=shader(g.VERTEX_SHADER,v),fs=shader(g.FRAGMENT_SHADER,f);g.attachShader(p,vs);g.attachShader(p,fs);g.linkProgram(p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return {p,u:{}};}
 uniform(p,n){if(!(n in p.u))p.u[n]=this.gl.getUniformLocation(p.p,n);return p.u[n];}
 attr(index,size,stride,offset,divisor=0){let g=this.gl;g.enableVertexAttribArray(index);g.vertexAttribPointer(index,size,g.FLOAT,false,stride,offset);g.vertexAttribDivisor(index,divisor);}
 async loadTextures(forceFull=false){
  const g=this.gl,pending=[],names=['sand_diff','sand_nor_gl','rock_diff','rock_nor_gl','shell_diff','shell_nor_gl','coral_diff','coral_nor_gl','caustics'];const full=forceFull||!this.mobile||this.quality===2;
  try{await Promise.all(names.map((name,i)=>new Promise((resolve,reject)=>{
   const tex=g.createTexture();pending[i]=tex;let img=new Image();
   img.onload=()=>{g.bindTexture(g.TEXTURE_2D,tex);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);let source=img;
    if(!full&&name!=='caustics'&&img.width>1024){const c=document.createElement('canvas');c.width=c.height=1024;c.getContext('2d').drawImage(img,0,0,1024,1024);source=c;}
    g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,source);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.REPEAT);
    if(this.aniso)g.texParameterf(g.TEXTURE_2D,this.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,g.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));resolve();};
   img.onerror=()=>reject(new Error('無法載入材質 '+name));img.src=ASSETS[name];
  })));}catch(e){pending.forEach(tex=>g.deleteTexture(tex));throw e;}
  const old=this.textures;this.textures=pending;this.textureFull=full;this.dirty=true;old.forEach(tex=>g.deleteTexture(tex));
 }
 upgradeTextures(){if(this.textureFull)return Promise.resolve();if(!this._textureUpgrade)this._textureUpgrade=this.loadTextures(true).finally(()=>this._textureUpgrade=null);return this._textureUpgrade;}

 batch(geo,instances,kind=0,dynamic=false){
  const g=this.gl,mesh=geo.indexed||indexGeometry(geo.v),vao=g.createVertexArray();g.bindVertexArray(vao);
  const vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,mesh.vertices,g.STATIC_DRAW);
  this.attr(0,3,48,0);this.attr(1,3,48,12);this.attr(2,3,48,24);this.attr(7,2,48,36);this.attr(8,1,48,44);
  const eb=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,eb);g.bufferData(g.ELEMENT_ARRAY_BUFFER,mesh.indices,g.STATIC_DRAW);
  const ib=g.createBuffer(),data=new Float32Array(instances.length*24);g.bindBuffer(g.ARRAY_BUFFER,ib);g.bufferData(g.ARRAY_BUFFER,data.byteLength,g.DYNAMIC_DRAW);
  this.attr(3,3,96,0,1);this.attr(4,4,96,12,1);this.attr(5,3,96,28,1);this.attr(6,2,96,40,1);this.attr(9,4,96,48,1);this.attr(10,4,96,64,1);this.attr(11,4,96,80,1);
  const b={vao,vb,eb,ib,count:mesh.indices.length,vertexCount:mesh.vertices.length/12,indexType:g.UNSIGNED_INT,instances,data,kind,dynamic,material:geo.material||0,species:geo.species??-1,visible:true,shadow:geo.shadow!==false,radius:mesh.radius,drawCount:instances.length,_lastVisible:null};
  this.updateBatch(b);this.batches.push(b);g.bindVertexArray(null);return b;
 }
 updateBatch(b,eye=null,planes=null,shadowPass=false){
  let j=0;const a=b.data;const lodScale=this.mobile?(this.quality===0?.64:.82):(this.quality===0?.75:1);
  // Terrain LODs have matching edges but different interior heights. Submit
  // exactly one opaque surface; overlapping dithered surfaces fight in depth.
  const atomicGround=!shadowPass&&b.material===1,margin=atomicGround?0:.6;
  const max=(b.maxDistance||220)*lodScale,min=(b.minDistance||0)*lodScale,max2=(max+margin)*(max+margin),min2=Math.max(0,min-margin)**2;
  for(let k=0;k<b.instances.length;k++){
   const i=b.instances[k];if(i.ecologyPresent===false)continue;const p=i.p,sc=i.s||UNIT3,tint=i.tint||UNIT3;
   if(eye&&planes){const dx=p[0]-eye[0],dy=p[1]-eye[1],dz=p[2]-eye[2],d2=dx*dx+dy*dy+dz*dz;
    if((atomicGround?d2>=max2:d2>max2)||d2<min2)continue;
    const r=b.radius*Math.max(sc[0],sc[1],sc[2])*((b.kind===8||b.kind===9||b.kind===10||b.kind===11||b.kind===12)?1.15:1);let outside=false;
    for(let n=0;n<6;n++){const pl=planes[n];if(pl[0]*p[0]+pl[1]*p[1]+pl[2]*p[2]+pl[3]<-r){outside=true;break;}}
    if(outside)continue;
   }
   // No spread, short-lived arrays or typed-array views inside the hot instance loop.
   const origin=this.renderOrigin||[0,0,0];a[j++]=p[0]-origin[0];a[j++]=p[1]-origin[1];a[j++]=p[2]-origin[2];a[j++]=i.yaw||0;
   a[j++]=sc[0];a[j++]=sc[1];a[j++]=sc[2];a[j++]=tint[0];a[j++]=tint[1];a[j++]=tint[2];a[j++]=i.phase||0;a[j++]=i.pitch||0;
   const m=i.bioMorph||BIO_NEUTRAL,genes=i.bioGenes||BIO_DEFAULT;
   a[j++]=m[0];a[j++]=m[1];a[j++]=m[2];a[j++]=m[3];
   a[j++]=genes[0];a[j++]=genes[1];a[j++]=genes[2];a[j++]=genes[3];
   a[j++]=i.bank||0;a[j++]=i.effort??.7;a[j++]=(b.kind===9||b.kind===7)?clamp(i.partnerFinPulse||0,0,1):(i.finWear||0);a[j++]=b.kind===8?1-clamp(i.faunaVisibility??(1-(i.retreat||0)),0,1):b.kind===9?(i.cetaceanBeat||2.3):b.kind===10?(i.abyssBeat||1.7):b.kind===11?(i.trenchBeat||1.6):0;
  }
  b.drawCount=j/24;if(!j)return;
  if(!b.dynamic){
   // Compare the actual Float32 payload against the last GPU upload, not a
   // camera key: shadows pack a different visible set, and scene features can
   // move static instances. The shared buffer must match whichever pass drew last.
   let uploaded=b._uploadedData,changed=!uploaded||b._uploadSource!==a||b._uploadBuffer!==b.ib||j>b._uploadedLength;
   if(!changed)for(let k=0;k<j;k++)if(a[k]!==uploaded[k]){changed=true;break;}
   if(!changed)return;
   if(!uploaded||uploaded.length!==a.length)uploaded=b._uploadedData=new Float32Array(a.length);
   uploaded.set(a);b._uploadedLength=j;b._uploadSource=a;b._uploadBuffer=b.ib;
  }else b._uploadedData=null;
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b.ib);this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,a,0,j);
 }
 drawBatch(b){this.gl.bindVertexArray(b.vao);this.gl.drawElementsInstanced(this.gl.TRIANGLES,b.count,b.indexType,0,b.drawCount);this.drawCalls++;}
 frustum(vp){let p=[];for(let a=0;a<3;a++)for(let sign of [-1,1]){let q=[vp[3]+sign*vp[a],vp[7]+sign*vp[4+a],vp[11]+sign*vp[8+a],vp[15]+sign*vp[12+a]],n=Math.hypot(q[0],q[1],q[2]);p.push(q.map(x=>x/n));}return p;}
 setupWater(){
  const g=this.gl,segments=this.mobile?64:112,positions=[];
  // Quadratic spacing concentrates displacement geometry near the swimmer and leaves
  // the horizon cheap. The wave field stays in world coordinates as this grid follows.
  const coordinate=i=>{const t=i/segments*2-1;return Math.sign(t)*t*t*1400;};
  for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){
   const x0=coordinate(x),x1=coordinate(x+1),z0=coordinate(z),z1=coordinate(z+1);
   positions.push(x0,0,z0,x0,0,z1,x1,0,z1,x0,0,z0,x1,0,z1,x1,0,z0);
  }
  this.waterCount=positions.length/3;this.waterVAO=g.createVertexArray();g.bindVertexArray(this.waterVAO);this.waterBuffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.waterBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(positions),g.STATIC_DRAW);this.attr(0,3,12,0);g.bindVertexArray(null);
 }
 setupBubbles(){const g=this.gl;this.bubbles=[];this.lastBubbleTime=-1;this.bubbleVAO=g.createVertexArray();g.bindVertexArray(this.bubbleVAO);this.bubbleBuffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.bubbleBuffer);g.bufferData(g.ARRAY_BUFFER,512*4*4,g.DYNAMIC_DRAW);this.attr(0,4,16,0);g.bindVertexArray(null);}
 renderBubbles(eye,t){if(this.submersible){this.bubbles=[];this.bubbleTime=t;return;}const g=this.gl;const dt=Math.max(0,Math.min(.1,t-(this.bubbleTime??t)));this.bubbleTime=t;
 if(typeof active!=='undefined'&&active){let breathPhase=(typeof oceanAudio!=='undefined'&&oceanAudio.enabled&&oceanAudio.ctx)?((oceanAudio.ctx.currentTime-oceanAudio.startedAt)%7.6)/7.6:(t%7.6)/7.6;
 if(breathPhase>.43&&breathPhase<.82&&t-this.lastBubbleTime>.105){this.lastBubbleTime=t;
 const third=typeof settings!=='undefined'&&settings.third&&!follow;let origin=third?player.p:eye;let f=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)];
 for(let k=0;k<3;k++){let side=third?0:rr(.34,.60);this.bubbles.push({p:V.add(origin,V.add(V.mul(f,third?.60:.45),V.add(V.mul(right,side),[rr(-.03,.01),third?.05:-.14,0]))),r:rr(.012,.033),a:0,phase:rr(0,6.28)});}}
 }
 let data=[];this.bubbles=this.bubbles.filter(b=>b.a<9&&b.p[1]<-.12).slice(-500);
 for(let b of this.bubbles){b.a+=dt;b.p[1]+=dt*(.30+b.r*6.);b.p[0]+=Math.sin(t*2.1+b.phase)*dt*.035;b.p[2]+=.018*dt;data.push(...b.p,b.r*(1+b.a*.16));}
 if(!data.length)return;g.bindVertexArray(this.bubbleVAO);g.bindBuffer(g.ARRAY_BUFFER,this.bubbleBuffer);g.bufferSubData(g.ARRAY_BUFFER,0,new Float32Array(data));this.common(this.bubbleProgram,eye,this.vp,t);g.uniform1f(this.uniform(this.bubbleProgram,'uHeight'),this.canvas.height);g.drawArrays(g.POINTS,0,data.length/4);}
 setupParticles(){let g=this.gl,a=[];for(let i=0;i<1300;i++)a.push(rr(-45,45),rr(-28,-.2),rr(-55,35),random());this.particleVAO=g.createVertexArray();g.bindVertexArray(this.particleVAO);let b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.STATIC_DRAW);this.attr(0,4,16,0);g.bindVertexArray(null);}
 setupRays(){let a=[];for(let i=0;i<20;i++){let x=rr(-29,22),z=rr(-42,12),w=rr(.8,1.7),bottom=-rr(13,24),bw=w*rr(2.1,4.5);for(let orient=0;orient<2;orient++){let ox=orient?0:1,oz=orient?1:0,p=[[x-w*ox,-.04,z-w*oz],[x+w*ox,-.04,z+w*oz],[x-bottom*.40+bw*ox,bottom,z+bottom*.27+bw*oz],[x-bottom*.40-bw*ox,bottom,z+bottom*.27-bw*oz]],uv=[[0,0],[1,0],[1,1],[0,1]];for(let k of [0,1,2,0,2,3])a.push(...p[k],...uv[k]);}}this.rayCount=a.length/5;let g=this.gl;this.rayVAO=g.createVertexArray();g.bindVertexArray(this.rayVAO);let b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.STATIC_DRAW);this.attr(0,3,20,0);this.attr(1,2,20,12);g.bindVertexArray(null);}
 setupShadow(){
  const g=this.gl;this.shadowSampler=g.createSampler();for(const [k,v] of [[g.TEXTURE_MIN_FILTER,g.LINEAR],[g.TEXTURE_MAG_FILTER,g.LINEAR],[g.TEXTURE_COMPARE_MODE,g.COMPARE_REF_TO_TEXTURE],[g.TEXTURE_COMPARE_FUNC,g.LEQUAL],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.samplerParameteri(this.shadowSampler,k,v);this.shadowSize=this.mobile?1024:2048;this.dynamicShadowSize=this.mobile?512:1024;
  const make=size=>{const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.texStorage2D(g.TEXTURE_2D,1,g.DEPTH_COMPONENT24,size,size);
   for(const [k,v] of [[g.TEXTURE_MIN_FILTER,g.NEAREST],[g.TEXTURE_MAG_FILTER,g.NEAREST],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,k,v);
   const fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,tex,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('無法建立陰影緩衝區');return {tex,fbo};};
  const stat=make(this.shadowSize),dyn=make(this.dynamicShadowSize);this.shadowTexture=stat.tex;this.shadowFBO=stat.fbo;this.dynamicShadowTexture=dyn.tex;this.dynamicShadowFBO=dyn.fbo;
  this._shadowKey='';this.dynamicLightVP=this.lightVP;g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 resize(){
  const g=this.gl;this.dirty=true;this.width=innerWidth;this.height=innerHeight;
  const cap=this.quality===2?2:this.quality===1?1.5:1;const dpr=Math.min(devicePixelRatio||1,cap);
  let scale=(this.quality===0?.82:1)*this.dynamicScale;let w=Math.max(2,Math.round(this.width*dpr*scale)),h=Math.max(2,Math.round(this.height*dpr*scale));
  const areaLimit=this.mobile?3000000:8000000;if(w*h>areaLimit){const ratio=Math.sqrt(areaLimit/(w*h));w=Math.floor(w*ratio);h=Math.floor(h*ratio);}const max=this.maxTextureSize;if(w>max||h>max){const s=max/Math.max(w,h);w=Math.floor(w*s);h=Math.floor(h*s);}
  if(w===this.canvas.width&&h===this.canvas.height&&this.sceneFBO&&this.lastQuality===this.quality)return;
  this.lastQuality=this.quality;this.canvas.width=w;this.canvas.height=h;
  const dispose=(fb,...tx)=>{if(fb)g.deleteFramebuffer(fb);for(const t of tx)if(t)g.deleteTexture(t);};
  const texture=(width,height,format,linear=true)=>{const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.texStorage2D(g.TEXTURE_2D,1,format,width,height);
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,linear?g.LINEAR:g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,linear?g.LINEAR:g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return tex;};
  const target=(tex,depth=null)=>{const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);if(depth)g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,depth,0);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('畫面配置超出裝置支援，請重新載入並選流暢');return f;};
  dispose(this.sceneFBO,this.sceneColor,this.sceneDepth);this.sceneColor=texture(w,h,this.floatColor?g.RGBA16F:g.RGBA8);this.sceneDepth=texture(w,h,g.DEPTH_COMPONENT24,false);this.sceneFBO=target(this.sceneColor,this.sceneDepth);
  this.setupMultisampling(w,h);

  dispose(this.aaFBO,this.aaColor);this.aaColor=texture(w,h,g.RGBA8);this.aaFBO=target(this.aaColor);
  // Volumetrics/AO are soft phenomena: evaluate fewer pixels, reconstruct with depth weights.
  const fraction=this.quality===2?.5:this.quality===1?.4:.3;this.volumeW=Math.max(2,Math.ceil(w*fraction));this.volumeH=Math.max(2,Math.ceil(h*fraction));
  dispose(this.volumeFBO,this.volumeColor);this.volumeColor=texture(this.volumeW,this.volumeH,this.floatColor?g.RGBA16F:g.RGBA8);this.volumeFBO=target(this.volumeColor);
  dispose(this.volumeFilteredFBO,this.volumeFilteredColor);this.volumeFilteredColor=texture(this.volumeW,this.volumeH,this.floatColor?g.RGBA16F:g.RGBA8);this.volumeFilteredFBO=target(this.volumeFilteredColor);
  g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 setupMultisampling(w,h){
  const g=this.gl;
  if(this.msaaFBO)g.deleteFramebuffer(this.msaaFBO);
  if(this.msaaColor)g.deleteRenderbuffer(this.msaaColor);
  if(this.msaaDepth)g.deleteRenderbuffer(this.msaaDepth);
  this.msaaFBO=null;this.msaaColor=null;this.msaaDepth=null;this.msaaSamples=0;
  const format=this.floatColor?g.RGBA16F:g.RGBA8;
  const color=Array.from(g.getInternalformatParameter(g.RENDERBUFFER,format,g.SAMPLES)||[]);
  const depth=Array.from(g.getInternalformatParameter(g.RENDERBUFFER,g.DEPTH_COMPONENT24,g.SAMPLES)||[]);
  // Mobile balanced uses the existing final FXAA pass without an extra
  // multisampled colour/depth target or resolve. Explicit high keeps 4x MSAA.
  const preferred=this.quality===2?4:this.quality===1&&!this.mobile?2:0;
  const options=color.filter(n=>n>0&&n<=preferred&&depth.includes(n)).sort((a,b)=>b-a);
  // Do not silently double the balanced budget when a GPU exposes only 4x.
  for(const samples of options){
   const f=g.createFramebuffer(),c=g.createRenderbuffer(),d=g.createRenderbuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);
   g.bindRenderbuffer(g.RENDERBUFFER,c);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,format,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.RENDERBUFFER,c);
   g.bindRenderbuffer(g.RENDERBUFFER,d);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,g.DEPTH_COMPONENT24,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,d);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE&&g.getError()===g.NO_ERROR){this.msaaFBO=f;this.msaaColor=c;this.msaaDepth=d;this.msaaSamples=samples;break;}
   g.deleteFramebuffer(f);g.deleteRenderbuffer(c);g.deleteRenderbuffer(d);
  }
  g.bindRenderbuffer(g.RENDERBUFFER,null);g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 common(p,eye,vp,t){let g=this.gl;g.useProgram(p.p);if(this.textures[8]){this.bindTex(9,this.textures[8]);g.uniform1i(this.uniform(p,'uCaustic'),9);}g.uniformMatrix4fv(this.uniform(p,'uVP'),false,vp===this.vp?this.renderVP:vp===this.lightVP?this.renderLightVP:vp===this.dynamicLightVP?this.renderDynamicLightVP:vp);g.uniformMatrix4fv(this.uniform(p,'uLightVP'),false,this.renderLightVP||this.lightVP);g.uniformMatrix4fv(this.uniform(p,'uDynamicLightVP'),false,this.renderDynamicLightVP||this.renderLightVP||this.lightVP);g.uniform1i(this.uniform(p,'uSamples'),this.msaaSamples||0);g.uniform1i(this.uniform(p,'uQuality'),this.quality);g.uniform3fv(this.uniform(p,'uRenderOrigin'),this.renderOrigin||[0,0,0]);g.uniform4f(this.uniform(p,'uTorchParams'),TorchLightRules.outer,TorchLightRules.inner,TorchLightRules.strength,TorchLightRules.falloff);g.uniform3fv(this.uniform(p,'uCamera'),eye);g.uniform1f(this.uniform(p,'uTorch'),this.lamp?1:0);g.uniform3fv(this.uniform(p,'uViewForward'),this.cameraForward||[0,0,-1]);g.uniform1f(this.uniform(p,'uTime'),t);g.uniform1f(this.uniform(p,'uSwim'),typeof player==='undefined'?.4:Math.min(1,Math.hypot(...player.velocity)/1.6));g.uniform1f(this.uniform(p,'uSun'),this.sun);g.uniform3fv(this.uniform(p,'uFog'),this.fog);g.uniform3fv(this.uniform(p,'uLightDir'),this.lightDir);g.uniform3fv(this.uniform(p,'uAirLightDir'),this.airLightDir||this.lightDir);g.uniform3fv(this.uniform(p,'uLightColor'),this.lightColor);}
 speciesUniforms(p,b){const g=this.gl,sp=typeof SPECIES!=='undefined'?SPECIES[b.species]:null,m=sp?.materialProfile,r=sp?.motionProfile?.type;g.uniform1i(this.uniform(p,'uRigClass'),r==='vampire'?1:r==='sea_pig'?2:r==='snailfish'?3:0);g.uniform4f(this.uniform(p,'uSurfaceProfile'),m?clamp(m.roughness,.12,.98):-1,m?clamp(m.subsurface,0,1):0,m?Math.max(.1,m.patternScale||1):1,m?({fish:0,cetacean:1,cephalopod:2,crustacean:3,shell:4,gelatinous:5}[m.skin]??0):-1);}
 bindTex(unit,tex){let g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,tex);}
 render(eye,target,t){
  this.dirty=false;const begin=performance.now(),g=this.gl;this.drawCalls=0;this.shadowDraws=0;
  const near=Number.isFinite(this.photoNear)?clamp(this.photoNear,.002,.16):.16;
  this.renderOrigin=eye[1]<-500?eye.map(n=>Math.round(n/64)*64):[0,0,0];const origin=this.renderOrigin,relativeEye=V.sub(eye,origin),relativeTarget=V.sub(target,origin);
  this.cameraForward=V.norm(V.sub(target,eye));this.view=lookAt(eye,target);this.renderVP=mm(perspective((this.photoFov||this.fov||(this.width<this.height?67:69))*Math.PI/180,this.width/this.height,near,950),lookAt(relativeEye,relativeTarget));this.vp=origin.some(n=>n!==0)?worldProjection(this.renderVP,origin):this.renderVP;const inv=inverse4(this.renderVP);
  const profile=this.lighting==='late'?{dir:[-.67,.57,-.33],color:[1.28,1.05,.86],sun:.95}:this.lighting==='blue'?{dir:[-.4,.3,-.6],color:[.52,.74,1.05],sun:.40}:{dir:[-.36,.86,-.34],color:[1.10,1.07,.96],sun:1.12};
  this.airLightDir=V.norm(profile.dir);
  const underwater=eye[1]<-.18;
  const sx=this.airLightDir[0]/1.333,sz=this.airLightDir[2]/1.333;
  this.lightDir=underwater?[sx,Math.sqrt(1-sx*sx-sz*sz),sz]:this.airLightDir;
  this.lightColor=profile.color;this.sun=profile.sun;
  const center=[Math.round(eye[0]/16)*16,Math.round(eye[1]/16)*16-4,Math.round(eye[2]/16)*16-12];
  const key=center.join(',')+this.lighting+(underwater?'water':'air');
  g.enable(g.DEPTH_TEST);g.depthMask(true);g.disable(g.BLEND);
  if(this._shadowKey!==key||this.forceShadow){
   this._shadowKey=key;this.forceShadow=false;this.renderLightVP=stableLightMatrix(mm(ortho(-40,40,-40,40,.1,230),lookAt(V.sub(V.add(center,V.mul(this.lightDir,100)),origin),V.sub(center,origin))),this.shadowSize);this.lightVP=origin.some(n=>n!==0)?worldProjection(this.renderLightVP,origin):this.renderLightVP;
   g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFBO);g.viewport(0,0,this.shadowSize,this.shadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.colorMask(false,false,false,false);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(1.2,2.);
   this.common(this.shadowProgram,eye,this.lightVP,t);const planes=this.frustum(this.lightVP);
   for(const b of this.batches){if(!b.visible||!b.shadow||b.dynamic||b.kind===3)continue;
    this.updateBatch(b,center,planes,true);if(!b.drawCount)continue;g.uniform1i(this.uniform(this.shadowProgram,'uKind'),0);g.uniform1i(this.uniform(this.shadowProgram,'uMat'),b.material);g.uniform1i(this.uniform(this.shadowProgram,'uSpecies'),b.species);this.speciesUniforms(this.shadowProgram,b);this.drawBatch(b);this.shadowDraws++;}
   g.disable(g.POLYGON_OFFSET_FILL);g.colorMask(true,true,true,true);this.staticShadowUpdates=(this.staticShadowUpdates||0)+1;
  }
  // Small, independent actor map; moving silhouettes do not invalidate the reef cache.
  this.renderDynamicLightVP=stableLightMatrix(mm(ortho(-17,17,-17,17,.1,150),lookAt(V.add(relativeEye,V.mul(this.lightDir,65)),relativeEye)),this.dynamicShadowSize);this.dynamicLightVP=origin.some(n=>n!==0)?worldProjection(this.renderDynamicLightVP,origin):this.renderDynamicLightVP;
  g.bindFramebuffer(g.FRAMEBUFFER,this.dynamicShadowFBO);g.viewport(0,0,this.dynamicShadowSize,this.dynamicShadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.colorMask(false,false,false,false);this.common(this.shadowProgram,eye,this.dynamicLightVP,t);
  const lightPlanes=this.frustum(this.dynamicLightVP);
  for(const b of this.batches){if(!b.visible||!b.dynamic||!b.shadow||![0,1,2,4,5,6,7,8,9,10,11,12].includes(b.kind)||(b.minDistance>0&&!b.shadowProxy))continue;this.updateBatch(b,eye,lightPlanes,true);if(!b.drawCount)continue;g.uniform1i(this.uniform(this.shadowProgram,'uKind'),b.kind);g.uniform1i(this.uniform(this.shadowProgram,'uMat'),b.material);g.uniform1i(this.uniform(this.shadowProgram,'uSpecies'),b.species);this.speciesUniforms(this.shadowProgram,b);this.drawBatch(b);this.shadowDraws++;}
  g.colorMask(true,true,true,true);
  g.bindFramebuffer(g.FRAMEBUFFER,this.msaaFBO||this.sceneFBO);if(this.msaaSamples)g.enable(g.SAMPLE_ALPHA_TO_COVERAGE);g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(.002,.025,.045,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  g.depthFunc(g.LEQUAL);this.common(this.skyProgram,eye,this.vp,t);g.uniformMatrix4fv(this.uniform(this.skyProgram,'uInvVP'),false,inv);g.bindVertexArray(this.postVAO);g.drawArrays(g.TRIANGLES,0,3);g.depthFunc(g.LESS);this.drawCalls++;
  const p=this.program;this.common(p,eye,this.vp,t);g.uniform1f(this.uniform(p,'uFogDensity'),this.fogDensity);g.uniform1f(this.uniform(p,'uShadowTexel'),1/this.shadowSize);g.uniform1f(this.uniform(p,'uShadows'),1);
  const names=['uSand','uSandN','uRock','uRockN','uShell','uShellN','uCoral','uCoralN'];for(let i=0;i<8;i++){this.bindTex(i,this.textures[i]);g.uniform1i(this.uniform(p,names[i]),i);}this.bindTex(8,this.shadowTexture);g.bindSampler(8,this.shadowSampler);g.uniform1i(this.uniform(p,'uShadow'),8);this.bindTex(10,this.dynamicShadowTexture);g.bindSampler(10,this.shadowSampler);g.uniform1i(this.uniform(p,'uDynamicShadow'),10);
  this.submittedTriangles=0;this.submittedVertices=0;const planes=this.frustum(this.vp);
  for(const b of this.batches){if(!b.visible)continue;this.updateBatch(b,eye,planes);if(!b.drawCount)continue;
   this.submittedTriangles+=b.count/3*b.drawCount;this.submittedVertices+=b.vertexCount*b.drawCount;
   const ls=this.mobile?(this.quality===0?.64:.82):(this.quality===0?.75:1);g.uniform3f(this.uniform(p,'uLODBounds'),(b.minDistance||0)*ls,(b.maxDistance||220)*ls,b.material!==1&&((b.minDistance||0)>0||(b.maxDistance&&b.maxDistance<180))?.60:0);g.uniform1i(this.uniform(p,'uKind'),b.kind);g.uniform1i(this.uniform(p,'uMat'),b.material);g.uniform1i(this.uniform(p,'uSpecies'),b.species);this.speciesUniforms(p,b);this.drawBatch(b);}
  g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);this.common(this.waterProgram,eye,this.vp,t);g.bindVertexArray(this.waterVAO);g.drawArrays(g.TRIANGLES,0,this.waterCount);this.submittedTriangles+=this.waterCount/3;this.submittedVertices+=this.waterCount;this.drawCalls++;
  g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(false);
  this.common(this.pointProgram,eye,this.vp,t);g.uniform1f(this.uniform(this.pointProgram,'uScale'),this.canvas.height*.044);g.bindVertexArray(this.particleVAO);if(eye[1]<-.18){g.drawArrays(g.POINTS,0,this.quality===0?240:520);this.renderBubbles(eye,t);}g.depthMask(true);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);
  if(this.msaaFBO){
   g.bindFramebuffer(g.READ_FRAMEBUFFER,this.msaaFBO);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.sceneFBO);
   g.blitFramebuffer(0,0,this.canvas.width,this.canvas.height,0,0,this.canvas.width,this.canvas.height,g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT,g.NEAREST);
  }
  const postUniforms=pp=>{g.useProgram(pp.p);this.bindTex(0,this.sceneColor);this.bindTex(1,this.sceneDepth);this.bindTex(2,this.shadowTexture);this.bindTex(3,this.volumeColor);
   g.uniform1i(this.uniform(pp,'uScene'),0);g.uniform1i(this.uniform(pp,'uDepth'),1);g.uniform1i(this.uniform(pp,'uVolumeShadow'),2);g.uniform1i(this.uniform(pp,'uVolume'),3);
   this.bindTex(9,this.textures[8]);g.uniform1i(this.uniform(pp,'uCaustic'),9);
   g.uniform2f(this.uniform(pp,'uResolution'),this.canvas.width,this.canvas.height);g.uniform2f(this.uniform(pp,'uVolumeResolution'),this.volumeW,this.volumeH);g.uniform1f(this.uniform(pp,'uTime'),t);g.uniform1i(this.uniform(pp,'uQuality'),this.quality);g.uniform1f(this.uniform(pp,'uExposure'),this.exposure);g.uniform1f(this.uniform(pp,'uPhotoAperture'),this.photoAperture||0);g.uniform1f(this.uniform(pp,'uPhotoFocus'),this.photoFocus||8);
   g.uniformMatrix4fv(this.uniform(pp,'uInvVP'),false,inv);g.uniformMatrix4fv(this.uniform(pp,'uLightVP'),false,this.renderLightVP);g.uniform3fv(this.uniform(pp,'uEye'),relativeEye);g.uniform3fv(this.uniform(pp,'uRenderOrigin'),origin);g.uniform3fv(this.uniform(pp,'uLightDir'),this.lightDir);g.uniform3fv(this.uniform(pp,'uLightColor'),this.lightColor);g.uniform1f(this.uniform(pp,'uSun'),this.sun);g.uniform1f(this.uniform(pp,'uClarity'),this.clarity);g.uniform1f(this.uniform(pp,'uLamp'),this.lamp?1:0);g.bindVertexArray(this.postVAO);};
  g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFBO);g.viewport(0,0,this.volumeW,this.volumeH);postUniforms(this.volumeProgram);this.bindTex(3,null);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFilteredFBO);postUniforms(this.volumeFilterProgram);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,this.aaFBO);g.viewport(0,0,this.canvas.width,this.canvas.height);postUniforms(this.postProgram);this.bindTex(3,this.volumeFilteredColor);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.useProgram(this.aaProgram.p);this.bindTex(0,this.aaColor);g.uniform1i(this.uniform(this.aaProgram,'uImage'),0);g.uniform2f(this.uniform(this.aaProgram,'uPixel'),1/this.canvas.width,1/this.canvas.height);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);this.drawCalls+=4;this.frame++;this.cpuRenderMs=performance.now()-begin;
 }
}
