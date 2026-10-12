/* Return to the Blue — WebGL2 renderer / living light / spectral water, refracted sunlight and depth-aware compositing. No runtime dependencies. */
'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), mix=(a,b,t)=>a+(b-a)*t;
const rgb=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
let seed=84129;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}const rr=(a,b)=>a+random()*(b-a);
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm(a){let l=Math.hypot(...a)||1;return a.map(x=>x/l)},dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),lerp:(a,b,t)=>a.map((x,i)=>mix(x,b[i],t))};
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
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;
layout(location=3) in vec3 aOffset;layout(location=4) in vec4 aTransform;layout(location=5) in vec3 aTint;layout(location=6) in vec2 aExtra;
layout(location=7) in vec2 aUV;layout(location=8) in float aTag;
layout(location=9) in vec4 aMorph;
layout(location=10) in vec4 aGenes;
layout(location=11) in vec4 aPose;
uniform mat4 uVP;uniform mat4 uLightVP;uniform mat4 uDynamicLightVP;uniform float uTime;uniform int uKind;uniform int uMat;uniform float uSwim;uniform vec3 uCamera;
out vec3 vWorld;out vec3 vNormal;out vec3 vColor;out vec3 vLocal;out vec2 vUV;out float vTag;out float vSeed;out vec4 vShadow;out float vLodDistance;flat out vec4 vGenes;flat out vec3 vTint;out vec4 vDynamicShadow;
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
 if(uKind==7){float tail=(1.-smoothstep(-2.,-.1,p.x));p.y+=sin(uTime*2.3+aExtra.x-p.x)*.26*tail;float wave=sin(uTime*2.3+aExtra.x-p.x);n=normalize(n+vec3(0.,0.,wave*.015*tail));}
 if(uKind==6){float w=1.-smoothstep(-4.5,-1.,p.x);p.y+=sin(uTime*.63+aExtra.x+p.x*.21)*.62*w*w;n.x+=cos(uTime*.63+aExtra.x+p.x*.21)*.09*w;}
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
 vWorld=p+aOffset;vNormal=normalize(n);vColor=aColor*aTint;vTint=aTint;vGenes=aGenes;vSeed=aExtra.x;
 vLodDistance=distance(uCamera,aOffset);vShadow=uLightVP*vec4(vWorld,1.);vDynamicShadow=uDynamicLightVP*vec4(vWorld,1.);gl_Position=uVP*vec4(vWorld,1.);
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
in vec3 vWorld;in vec3 vNormal;in vec3 vColor;in vec3 vLocal;in vec2 vUV;in float vTag;in float vSeed;in vec4 vShadow;in float vLodDistance;uniform vec3 uLODBounds;flat in vec4 vGenes;flat in vec3 vTint;in vec4 vDynamicShadow;uniform int uSamples;
uniform vec3 uCamera;uniform float uTime;uniform vec3 uFog;uniform float uFogDensity;uniform float uSun;uniform int uKind;uniform int uMat;uniform int uSpecies;
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
 if(all(greaterThan(ds,vec3(.002)))&&all(lessThan(ds,vec3(.998))))dyn=texture(uDynamicShadow,vec3(ds.xy,ds.z-.0009));
 return mix(.11,1.,sum/9.)*mix(.28,1.,dyn);
}
float aaband(float edge,float value){float w=max(fwidth(value)*.8,.0005);return smoothstep(edge-w,edge+w,value);}

void main(){
 if(uLODBounds.z>0.){float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 if(uLODBounds.x>0.&&dither>smoothstep(uLODBounds.x-uLODBounds.z,uLODBounds.x+uLODBounds.z,vLodDistance))discard;
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
 if(uMat==10){float pore=noise(vLocal*28.);base*=.88+.15*pore;
 float pleats=.5+.5*sin(vLocal.z*28.+sin(vLocal.x*.8)*.9);if(vLocal.y<-.20&&vLocal.x>-.7){base*=.72+.28*smoothstep(.18,.55,pleats);n=normalize(n+vec3(0.,0.,cos(vLocal.z*28.)*.045));}rough=.57;}
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
 vec3 L=normalize(vWorld.y<0.?uLightDir:uAirLightDir);vec3 E=normalize(uCamera-vWorld);
 float NoL=max(0.,dot(n,L)),NoV=max(.03,dot(n,E));float sh=visibility(n);float hemi=clamp(n.y*.5+.5,0.,1.);
 // Work in linear light; water-to-surface reflection is not dry-plastic gloss.
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
 col+=vec3(.015,.028,.035)*pow(1.-NoV,4.)*occ;
 frag=vec4(max(col,vec3(0.)),clamp(coverage,.0,1.));

}`;
const SHADOW_FS=`#version 300 es
precision highp float;precision highp int;in float vTag;uniform int uMat;void main(){if(uMat==7&&vTag>20.)discard;}`;
const SKY_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform mat4 uInvVP;uniform vec3 uCamera;uniform vec3 uAirLightDir;uniform vec3 uLightColor;uniform float uSun;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec4 w=uInvVP*vec4(uv*2.-1.,.99999,1.);vec3 rd=normalize(w.xyz/w.w-uCamera);vec3 sky;
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
precision highp float;layout(location=0) in vec3 aPosition;uniform mat4 uVP;uniform vec3 uCamera;uniform float uTime;out vec3 vP;
${WATER_WAVES_GLSL}
void main(){vec3 p=aPosition;p.xz+=uCamera.xz;p.y=oceanWave(p.xz,uTime,3.).z;vP=p;gl_Position=uVP*vec4(p,1.);}`;
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
precision highp float;layout(location=0) in vec4 aP;uniform mat4 uVP;uniform float uTime;uniform vec3 uCamera;uniform float uScale;out float vAlpha;out float vType;
void main(){vec3 cell=vec3(48.,32.,48.);vec3 p=aP.xyz;
 p+=vec3(sin(uTime*.08+aP.w*17.)*.8,-uTime*(.027+aP.w*.041),cos(uTime*.10+aP.w*11.)*.5);
 p=mod(p-uCamera+cell*.5,cell)-cell*.5+uCamera;
 float d=distance(p,uCamera);gl_Position=uVP*vec4(p,1.);
 gl_PointSize=clamp((.32+aP.w*.9)*uScale/max(gl_Position.w,1.),.7,3.4);
 vAlpha=.19*(1.-smoothstep(9.,23.,d))*smoothstep(.6,3.,d)*(1.-smoothstep(-.65,-.05,p.y));vType=aP.w;}`;
const POINT_FS=`#version 300 es
precision highp float;in float vAlpha;in float vType;out vec4 frag;
void main(){float r=length(gl_PointCoord-.5);frag=vec4(.37,.66,.84,(1.-smoothstep(.04,.5,r))*vAlpha);}`;
const RAY_VS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPosition;layout(location=1) in vec2 aUV;uniform mat4 uVP;out vec2 vUV;out vec3 vP;void main(){vP=aPosition;vUV=aUV;gl_Position=uVP*vec4(aPosition,1.);}`;
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
uniform vec3 uEye;uniform vec3 uLightDir;uniform vec3 uLightColor;uniform float uTime;uniform float uSun;uniform float uClarity;uniform int uQuality;
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
 if(uEye.y>-.18){frag=vec4(0.,0.,0.,1.-ao);return;}
 vec3 extinction=waterExtinction(uClarity);int steps=uQuality==2?12:uQuality==1?8:4;
 float span=min(dist,80.);if(rd.y>.001)span=min(span,max(0.,-uEye.y/rd.y));
 float mu=dot(rd,normalize(uLightDir));const float anisotropy=.74;
 float phase=.20+.34*(1.-anisotropy*anisotropy)/pow(max(.045,1.+anisotropy*anisotropy-2.*anisotropy*mu),1.5);
 // Stratification is shared by neighboring pixels: per-pixel jitter without a temporal
 // history produces a visible diagonal mesh in clear water, especially on phones.
 vec3 scatter=vec3(0.);float stepLength=span/float(steps);
 for(int i=0;i<12;i++){if(i>=steps)break;float stratum=.30+fract(float(i)*.618033989)*.40;float s=(float(i)+stratum)*stepLength;vec3 q=uEye+rd*s;float dep=max(0.,-q.y);
  vec2 surf=q.xz-q.y*uLightDir.xz/max(.2,uLightDir.y);
  // Broad, irregular swell focuses shafts. Atlas caustics supply only a little detail;
  // using their fine periodic lattice as the beam mask creates a striped curtain.
  vec2 warp=vec2(sin(surf.y*.041+uTime*.018),cos(surf.x*.037-uTime*.015))*.52;
  float swell=noise(vec3(surf*.105+warp,uTime*.025));
  float focused=pow(smoothstep(.34,.76,swell),3.);
  float beam=.08+focused*(.54+min(caustic(surf*.64,uTime*.83),2.4)*.055);
  vec3 solar=sunThroughWater(dep,uLightDir.y);
  scatter+=uLightColor*solar*visibility(q)*beam*exp(-extinction*s)*stepLength*.011*phase*uSun;
 }
 frag=vec4(scatter,1.-ao);
}`;
// A small bilateral filter is evaluated only at the volumetric resolution. It removes
// sampling structure in shafts while retaining the depth boundary around nearby animals.
const VOLUME_FILTER_FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D uVolume;uniform sampler2D uDepth;uniform vec2 uVolumeResolution;uniform mat4 uInvVP;uniform vec3 uEye;uniform int uQuality;
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
uniform vec2 uResolution;uniform vec2 uVolumeResolution;uniform mat4 uInvVP;uniform vec3 uEye;uniform float uTime;uniform float uSun;uniform float uExposure;uniform float uClarity;uniform float uLamp;uniform int uQuality;
${WATER_OPTICS_GLSL}
vec3 world(vec2 p,float d){vec4 h=uInvVP*vec4(p*2.-1.,d*2.-1.,1.);return h.xyz/h.w;}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){float d=texture(uDepth,uv).r;vec3 p=world(uv,min(d,.99999)),rd=normalize(p-uEye);float distanceTo=min(length(p-uEye),700.);
 vec3 col=texture(uScene,uv).rgb;
 // Four depth-aware reconstruction taps prevent light/occlusion halos around foreground fish.
 vec2 grid=uv*uVolumeResolution-.5,base=floor(grid),f=fract(grid);vec4 fog=vec4(0.);float weights=0.;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 q=(base+vec2(x,y)+.5)/uVolumeResolution;
  float dd=texture(uDepth,q).r;float nd=length(world(q,min(dd,.99999))-uEye);float w=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y)*exp(-abs(nd-distanceTo)*.8)+.0001;
  fog+=texture(uVolume,q)*w;weights+=w;}
 fog/=weights;col*=fog.a;
 if(uLamp>.5&&d<.9999){float cone=pow(max(0.,1.-length((uv-.5)*vec2(uResolution.x/uResolution.y,1.))*1.6),5.);col+=col*vec3(2.0,1.6,1.1)*cone/(1.+distanceTo*distanceTo*.022);}
 vec3 trans=exp(-waterExtinction(uClarity)*distanceTo);float depth=max(0.,-uEye.y);
 vec3 water=waterRadiance(rd,depth,uSun);
 if(uEye.y<=-.18){if(d>.99995)col=water+fog.rgb;else col=col*trans+water*(1.-trans)+fog.rgb;}
 else if(d<.99995){float haze=1.-exp(-distanceTo*.0011);col=mix(col,vec3(.43,.60,.69),haze);}

 col=film(col*uExposure);col=pow(col,vec3(1./2.2));
 col*=1.-.035*pow(length((uv-.5)*vec2(1.,.85))*1.4,2.);
 // Sub-visible ordered grain removes 8-bit gradient bands without softening the reef.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 col+=dither/255.;
 frag=vec4(col,1.);
}`;

const BUBBLE_VS=`#version 300 es
precision highp float;layout(location=0) in vec4 aBubble;uniform mat4 uVP;uniform float uHeight;out float age;
void main(){gl_Position=uVP*vec4(aBubble.xyz,1.);gl_PointSize=clamp(aBubble.w*uHeight/max(gl_Position.w,.3),1.1,35.);age=aBubble.w;}`;
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
  const max=(b.maxDistance||220)*lodScale,min=(b.minDistance||0)*lodScale,max2=(max+.6)*(max+.6),min2=Math.max(0,min-.6)**2;
  for(let k=0;k<b.instances.length;k++){
   const i=b.instances[k],p=i.p,sc=i.s||UNIT3,tint=i.tint||UNIT3;
   if(eye&&planes){const dx=p[0]-eye[0],dy=p[1]-eye[1],dz=p[2]-eye[2],d2=dx*dx+dy*dy+dz*dz;
    if(d2>max2||d2<min2)continue;
    const r=b.radius*Math.max(sc[0],sc[1],sc[2]);let outside=false;
    for(let n=0;n<6;n++){const pl=planes[n];if(pl[0]*p[0]+pl[1]*p[1]+pl[2]*p[2]+pl[3]<-r){outside=true;break;}}
    if(outside)continue;
   }
   // No spread, short-lived arrays or typed-array views inside the hot instance loop.
   a[j++]=p[0];a[j++]=p[1];a[j++]=p[2];a[j++]=i.yaw||0;
   a[j++]=sc[0];a[j++]=sc[1];a[j++]=sc[2];a[j++]=tint[0];a[j++]=tint[1];a[j++]=tint[2];a[j++]=i.phase||0;a[j++]=i.pitch||0;
   const m=i.bioMorph||BIO_NEUTRAL,genes=i.bioGenes||BIO_DEFAULT;
   a[j++]=m[0];a[j++]=m[1];a[j++]=m[2];a[j++]=m[3];
   a[j++]=genes[0];a[j++]=genes[1];a[j++]=genes[2];a[j++]=genes[3];
   a[j++]=i.bank||0;a[j++]=i.effort??.7;a[j++]=i.finWear||0;a[j++]=0;
  }
  b.drawCount=j/24;if(j){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b.ib);this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,a,0,j);}
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
 renderBubbles(eye,t){const g=this.gl;const dt=Math.max(0,Math.min(.1,t-(this.bubbleTime??t)));this.bubbleTime=t;
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
  const preferred=this.quality===2?4:this.quality===1?2:0;
  const options=color.filter(n=>n>0&&n<=preferred&&depth.includes(n)).sort((a,b)=>b-a);
  // Some implementations expose 4x but not 2x; stay at the advertised sample count.
  if(preferred===2&&!options.length&&color.includes(4)&&depth.includes(4))options.push(4);
  for(const samples of options){
   const f=g.createFramebuffer(),c=g.createRenderbuffer(),d=g.createRenderbuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);
   g.bindRenderbuffer(g.RENDERBUFFER,c);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,format,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.RENDERBUFFER,c);
   g.bindRenderbuffer(g.RENDERBUFFER,d);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,g.DEPTH_COMPONENT24,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,d);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE&&g.getError()===g.NO_ERROR){this.msaaFBO=f;this.msaaColor=c;this.msaaDepth=d;this.msaaSamples=samples;break;}
   g.deleteFramebuffer(f);g.deleteRenderbuffer(c);g.deleteRenderbuffer(d);
  }
  g.bindRenderbuffer(g.RENDERBUFFER,null);g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 common(p,eye,vp,t){let g=this.gl;g.useProgram(p.p);if(this.textures[8]){this.bindTex(9,this.textures[8]);g.uniform1i(this.uniform(p,'uCaustic'),9);}g.uniformMatrix4fv(this.uniform(p,'uVP'),false,vp);g.uniformMatrix4fv(this.uniform(p,'uLightVP'),false,this.lightVP);g.uniformMatrix4fv(this.uniform(p,'uDynamicLightVP'),false,this.dynamicLightVP||this.lightVP);g.uniform1i(this.uniform(p,'uSamples'),this.msaaSamples||0);g.uniform3fv(this.uniform(p,'uCamera'),eye);g.uniform1f(this.uniform(p,'uTime'),t);g.uniform1f(this.uniform(p,'uSwim'),typeof player==='undefined'?.4:Math.min(1,Math.hypot(...player.velocity)/1.6));g.uniform1f(this.uniform(p,'uSun'),this.sun);g.uniform3fv(this.uniform(p,'uFog'),this.fog);g.uniform3fv(this.uniform(p,'uLightDir'),this.lightDir);g.uniform3fv(this.uniform(p,'uAirLightDir'),this.airLightDir||this.lightDir);g.uniform3fv(this.uniform(p,'uLightColor'),this.lightColor);}
 bindTex(unit,tex){let g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,tex);}
 render(eye,target,t){
  this.dirty=false;const begin=performance.now(),g=this.gl;this.drawCalls=0;this.shadowDraws=0;
  this.view=lookAt(eye,target);this.vp=mm(perspective((this.photoFov||this.fov||(this.width<this.height?67:69))*Math.PI/180,this.width/this.height,.16,950),this.view);const inv=inverse4(this.vp);
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
   this._shadowKey=key;this.forceShadow=false;this.lightVP=stableLightMatrix(mm(ortho(-40,40,-40,40,.1,230),lookAt(V.add(center,V.mul(this.lightDir,100)),center)),this.shadowSize);
   g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFBO);g.viewport(0,0,this.shadowSize,this.shadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.colorMask(false,false,false,false);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(1.2,2.);
   this.common(this.shadowProgram,eye,this.lightVP,t);const planes=this.frustum(this.lightVP);
   for(const b of this.batches){if(!b.visible||!b.shadow||b.dynamic||b.kind===3)continue;
    this.updateBatch(b,center,planes,true);if(!b.drawCount)continue;g.uniform1i(this.uniform(this.shadowProgram,'uKind'),0);g.uniform1i(this.uniform(this.shadowProgram,'uMat'),b.material);this.drawBatch(b);this.shadowDraws++;}
   g.disable(g.POLYGON_OFFSET_FILL);g.colorMask(true,true,true,true);this.staticShadowUpdates=(this.staticShadowUpdates||0)+1;
  }
  // Small, independent actor map; moving silhouettes do not invalidate the reef cache.
  this.dynamicLightVP=stableLightMatrix(mm(ortho(-17,17,-17,17,.1,150),lookAt(V.add(eye,V.mul(this.lightDir,65)),eye)),this.dynamicShadowSize);
  g.bindFramebuffer(g.FRAMEBUFFER,this.dynamicShadowFBO);g.viewport(0,0,this.dynamicShadowSize,this.dynamicShadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.colorMask(false,false,false,false);this.common(this.shadowProgram,eye,this.dynamicLightVP,t);
  const lightPlanes=this.frustum(this.dynamicLightVP);
  for(const b of this.batches){if(!b.visible||!b.dynamic||!b.shadow||![1,2,4,5,6,7].includes(b.kind)||(b.minDistance>0&&!b.shadowProxy))continue;this.updateBatch(b,eye,lightPlanes,true);if(!b.drawCount)continue;g.uniform1i(this.uniform(this.shadowProgram,'uKind'),b.kind);g.uniform1i(this.uniform(this.shadowProgram,'uMat'),b.material);this.drawBatch(b);this.shadowDraws++;}
  g.colorMask(true,true,true,true);
  g.bindFramebuffer(g.FRAMEBUFFER,this.msaaFBO||this.sceneFBO);if(this.msaaSamples)g.enable(g.SAMPLE_ALPHA_TO_COVERAGE);g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(.002,.025,.045,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  g.depthFunc(g.LEQUAL);this.common(this.skyProgram,eye,this.vp,t);g.uniformMatrix4fv(this.uniform(this.skyProgram,'uInvVP'),false,inv);g.bindVertexArray(this.postVAO);g.drawArrays(g.TRIANGLES,0,3);g.depthFunc(g.LESS);this.drawCalls++;
  const p=this.program;this.common(p,eye,this.vp,t);g.uniform1f(this.uniform(p,'uFogDensity'),this.fogDensity);g.uniform1f(this.uniform(p,'uShadowTexel'),1/this.shadowSize);g.uniform1f(this.uniform(p,'uShadows'),1);
  const names=['uSand','uSandN','uRock','uRockN','uShell','uShellN','uCoral','uCoralN'];for(let i=0;i<8;i++){this.bindTex(i,this.textures[i]);g.uniform1i(this.uniform(p,names[i]),i);}this.bindTex(8,this.shadowTexture);g.bindSampler(8,this.shadowSampler);g.uniform1i(this.uniform(p,'uShadow'),8);this.bindTex(10,this.dynamicShadowTexture);g.bindSampler(10,this.shadowSampler);g.uniform1i(this.uniform(p,'uDynamicShadow'),10);
  this.submittedTriangles=0;this.submittedVertices=0;const planes=this.frustum(this.vp);
  for(const b of this.batches){if(!b.visible)continue;this.updateBatch(b,eye,planes);if(!b.drawCount)continue;
   this.submittedTriangles+=b.count/3*b.drawCount;this.submittedVertices+=b.vertexCount*b.drawCount;
   const ls=this.mobile?(this.quality===0?.64:.82):(this.quality===0?.75:1);g.uniform3f(this.uniform(p,'uLODBounds'),(b.minDistance||0)*ls,(b.maxDistance||220)*ls,b.maxDistance&&b.maxDistance<180?.60:0);g.uniform1i(this.uniform(p,'uKind'),b.kind);g.uniform1i(this.uniform(p,'uMat'),b.material);g.uniform1i(this.uniform(p,'uSpecies'),b.species);this.drawBatch(b);}
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
   g.uniform2f(this.uniform(pp,'uResolution'),this.canvas.width,this.canvas.height);g.uniform2f(this.uniform(pp,'uVolumeResolution'),this.volumeW,this.volumeH);g.uniform1f(this.uniform(pp,'uTime'),t);g.uniform1i(this.uniform(pp,'uQuality'),this.quality);g.uniform1f(this.uniform(pp,'uExposure'),this.exposure);
   g.uniformMatrix4fv(this.uniform(pp,'uInvVP'),false,inv);g.uniformMatrix4fv(this.uniform(pp,'uLightVP'),false,this.lightVP);g.uniform3fv(this.uniform(pp,'uEye'),eye);g.uniform3fv(this.uniform(pp,'uLightDir'),this.lightDir);g.uniform3fv(this.uniform(pp,'uLightColor'),this.lightColor);g.uniform1f(this.uniform(pp,'uSun'),this.sun);g.uniform1f(this.uniform(pp,'uClarity'),this.clarity);g.uniform1f(this.uniform(pp,'uLamp'),this.lamp?1:0);g.bindVertexArray(this.postVAO);};
  g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFBO);g.viewport(0,0,this.volumeW,this.volumeH);postUniforms(this.volumeProgram);this.bindTex(3,null);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFilteredFBO);postUniforms(this.volumeFilterProgram);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,this.aaFBO);g.viewport(0,0,this.canvas.width,this.canvas.height);postUniforms(this.postProgram);this.bindTex(3,this.volumeFilteredColor);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.useProgram(this.aaProgram.p);this.bindTex(0,this.aaColor);g.uniform1i(this.uniform(this.aaProgram,'uImage'),0);g.uniform2f(this.uniform(this.aaProgram,'uPixel'),1/this.canvas.width,1/this.canvas.height);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);this.drawCalls+=4;this.frame++;this.cpuRenderMs=performance.now()-begin;
 }
}
