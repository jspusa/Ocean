"""Original procedural material authoring. No photographs or game assets imported.
Multi-scale limestone, encrusting pigments, carbonate sand and an animated wave-caustic atlas.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
R=Path(__file__).resolve().parent/'assets';R.mkdir(exist_ok=True)
rng=np.random.default_rng(40123)
N=2048
def noise(n,scale):
 a=rng.normal(0,1,(n,n)).astype('float32');a=gaussian_filter(a,scale,mode='wrap');return (a-a.mean())/(a.std()+1e-8)
def norm(h,strength,name):
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*strength;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*strength
 v=np.stack([-dx,dy,np.ones_like(h)],-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
 Image.fromarray(np.uint8(np.clip(v*.5+.5,0,1)*255)).save(R/(name+'_nor_gl.jpg'),quality=94,subsampling=0)
def save(a,name):Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(R/(name+'_diff.jpg'),quality=93,subsampling=0)
# Limestone: four relief scales, sharp eroded fissures, mineral grains and patchy living crust.
big=noise(N,68);mid=noise(N,15);small=noise(N,3.8);grain=noise(N,.45)
x,y=np.meshgrid(np.linspace(0,1,N,endpoint=False),np.linspace(0,1,N,endpoint=False))
# Warped periodic cells keep boundaries seamless.
xw=(x+.037*big+.022*mid)%1;yw=(y+.028*big-.017*mid)%1
f1=np.full((N,N),9.,dtype='float32');f2=f1.copy()
for sx,sy in rng.uniform(0,1,(45,2)):
 dx=np.abs(xw-sx);dx=np.minimum(dx,1-dx);dy=np.abs(yw-sy);dy=np.minimum(dy,1-dy);d=(dx*dx+dy*dy).astype('float32')
 lo=np.minimum(f1,d);f2=np.minimum(f2,np.maximum(f1,d));f1=lo
edge=np.sqrt(f2)-np.sqrt(f1);crack=np.exp(-edge*180)
pore=np.clip((-small-1.0)*.50,0,.9)
relief=.14*big+.085*mid+.021*small+.004*grain-.09*crack-.032*pore
neutral=np.stack([.50+.055*big+.037*mid,.48+.046*big+.039*mid,.39+.03*big+.04*mid],-1)
neutral*=1-crack[...,None]*.22-pore[...,None]*.24
algae=np.clip((noise(N,31)+mid*.3-.05)*.75,0,1)
coralline=np.clip((noise(N,50)+small*.08-.64)*1.0,0,1)*(1-algae*.6)
col=neutral*(1-algae[...,None]*.6)+np.array([.23,.29,.16])*algae[...,None]*.6
col=col*(1-coralline[...,None]*.70)+np.array([.44,.27,.31])*coralline[...,None]*.70
col+=grain[...,None]*.019
save(col,'rock');norm(relief,36,'rock');print('limestone',flush=True)
# Sand with very small grains, flow ripples and bioclastic flecks.
b=noise(N,70);s=noise(N,.38);fine=noise(N,2)
ripple=.5+.5*np.sin(y*2*np.pi*19+np.sin(x*2*np.pi*2)*1.5+np.sin(x*2*np.pi*7)*.35)
h=.025*ripple+.009*fine+.003*s
sand=np.stack([.72+b*.028+s*.034,.684+b*.03+s*.032,.571+b*.026+s*.031],-1)
sand*=.94+.06*ripple[...,None]
speck=np.clip((fine-1.8)*.09,0,.14);sand-=speck[...,None]
save(sand,'sand');norm(h,27,'sand');print('sand',flush=True)
# Corallite pores: irregular close-packed cells with radial ridges.
P=1024;xx,yy=np.meshgrid(np.arange(P)/P,np.arange(P)/P);u=xx*48;v=yy*48
u+=np.floor(v)%2*.5;fu=(u%1-.5);fv=(v%1-.5);d=np.sqrt(fu*fu+(fv*1.05)**2)
a=np.arctan2(fv,fu);ring=np.exp(-((d-.25)/.105)**2);core=np.exp(-(d/.14)**2)
rel=.027*ring*(.75+.25*np.sin(a*12))-.028*core+.0015*rng.normal(0,1,(P,P))
base=.68+.18*ring-.15*core;col=np.stack([base*.96,base*.90,base*.83],-1)
save(col,'coral');norm(rel,19,'coral');print('corallites',flush=True)
# Wave ray-density caustics, not drawn sine contours. Refracted slope displaces rays onto a receiver.
S=768;T=256;xx,yy=np.meshgrid(np.arange(S,dtype='float32')/S,np.arange(S,dtype='float32')/S)
waves=[(3,1,.0042,1,.0),(1,4,.0036,1,1.3),(-4,3,.0021,2,2.5),(6,2,.0013,2,.4),(2,-7,.0010,3,1.2),(-8,-3,.0006,3,3.1),(11,7,.00030,4,2.2)]
atlas=np.empty((2048,2048),np.uint8)
for k in range(64):
 tm=k/64*2*np.pi;dx=np.zeros_like(xx);dy=np.zeros_like(xx)
 for kx,ky,amp,speed,phase in waves:
  ph=(xx*kx+yy*ky)*2*np.pi+tm*speed+phase
  si=np.sin(ph);dx+=si*amp*kx;dy+=si*amp*ky
 px=((xx+dx)*T)%T;py=((yy+dy)*T)%T;ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);fx=px-ix;fy=py-iy
 hist=np.zeros(T*T,dtype='float32')
 for ax,ay,w in [(0,0,(1-fx)*(1-fy)),(1,0,fx*(1-fy)),(0,1,(1-fx)*fy),(1,1,fx*fy)]:
  hist+=np.bincount((((iy+ay)%T)*T+(ix+ax)%T).ravel(),weights=w.ravel(),minlength=T*T).astype('float32')
 im=gaussian_filter(hist.reshape(T,T),.50,mode='wrap');im/=im.mean()
 im=np.clip((im-.35)/4.5,0,1)**.72
 atlas[(k//8)*T:(k//8+1)*T,(k%8)*T:(k%8+1)*T]=np.uint8(im*255)
Image.fromarray(atlas).convert('RGB').save(R/'caustics.jpg',quality=95,subsampling=0)
print('64 wave caustic frames',flush=True)
