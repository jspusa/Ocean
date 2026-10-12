"""Original procedural materials; no external asset or runtime network dependency."""
import numpy as np
from PIL import Image
from scipy.ndimage import zoom, gaussian_filter, distance_transform_edt
from scipy.spatial import cKDTree
from pathlib import Path
root=Path(__file__).resolve().parent/'assets';root.mkdir(exist_ok=True)
rng=np.random.default_rng(87261); N=1024
y,x=np.mgrid[0:N,0:N]/N

def noise(size, scale=1):
    n=rng.random((size,size)); n=np.pad(n,((0,1),(0,1)),mode='wrap')
    q=zoom(n,N/size,order=3,mode='wrap')[:N,:N]
    return (q-q.mean())/(q.std()+1e-6)*scale

def fbm():
    return sum(noise(n,1/(2**(i*.74))) for i,n in enumerate([4,8,16,32,64,128,256]))

def save(name,a): Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(root/(name+'.jpg'),quality=93,subsampling=0)
def norm(name,h,strength):
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*strength;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*strength
    v=np.stack([-dx,-dy,np.ones_like(h)],-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
    save(name,v*.5+.5)
# Rippled sand, pebbles, and granular normal.
f=fbm();grain=rng.normal(0,.024,(N,N))
ripple=np.sin((y*17 + np.sin(x*6.283*2)*.35+noise(8,.10))*6.283)
h=.055*ripple+.02*f+grain*.26
al=.84+.025*f+.018*ripple+grain
sand=np.stack([al,al*.954,al*.842],-1)
# small mottled grains, irregular pebbles
for _ in range(600):
    cy,cx=rng.integers(0,N,2);r=int(rng.choice([1,1,2,2,3,5]));
    yy,xx=np.ogrid[-r:r+1,-r:r+1];m=(xx/(r+.1))**2+(yy/(r*.7+.1))**2<1
    yi=(np.arange(cy-r,cy+r+1)%N);xi=(np.arange(cx-r,cx+r+1)%N)
    for k in range(3):
        a=sand[:,:,k];patch=a[np.ix_(yi,xi)];patch[m]*=rng.uniform(.55,.86);a[np.ix_(yi,xi)]=patch
    patch=h[np.ix_(yi,xi)];patch[m]+=.035;h[np.ix_(yi,xi)]=patch
save('sand_diff',sand);norm('sand_nor_gl',h,12)
# Weathered rock: multi-scale height, narrow erosion and pores.
f=fbm(); fine=noise(128,.30)+noise(256,.13);q=f*.26+fine*.10
pores=np.clip(-(noise(64)*.6+noise(128)*.4)-.65,0,2)
veins=np.exp(-np.abs(np.sin(f*3.7+noise(16)*.9))*27)
h=gaussian_filter(q-pores*.08-veins*.035,.45)
v=.52+.10*np.tanh(f*.8)+fine*.05-pores*.11-veins*.1
moss=np.clip(noise(8)-.9,0,1)*.045
rock=np.stack([v*1.10-moss*.8,v*1.04+moss*.3,v*.90-moss*.2],-1)
save('rock_diff',rock);norm('rock_nor_gl',h,23)
# High resolution shell/scutes. The individual polygons are original, not a taxonomic template.
seeds=[]
for a in np.linspace(.18,.82,5): seeds.append([a,.5])
for s in [-1,1]:
 for a in np.linspace(.22,.79,4):seeds.append([a,.5+s*.225])
for angle in np.linspace(0,2*np.pi,22,endpoint=False):seeds.append([.5+.48*np.cos(angle),.5+.47*np.sin(angle)])
seeds=np.array(seeds);tree=cKDTree(seeds)
pts=np.stack([x.ravel(),y.ravel()],1);dd,ids=tree.query(pts,k=2)
i=ids[:,0].reshape(N,N);edge=(dd[:,1]-dd[:,0]).reshape(N,N)
cx=seeds[i,0];cy=seeds[i,1];r=np.sqrt((x-cx)**2+(y-cy)**2);a=np.arctan2(y-cy,x-cx)
f=fbm();streak=np.sin(a*65+f*.28)+.5*np.sin(a*123+f*.75)
growth=np.sin(r*300+f*.12)*.017
v=.43+.09*np.sin(i*3.7)+.12*np.tanh(f*.82)+streak*.050+growth
# fine orange-green rays and non-uniform pale scute boundaries
seam=np.clip((.0028-edge)*500,0,1);rim=np.clip((.013-edge)*55,0,1)
shell=np.stack([v*.91+.065,v*.82+.060,v*.53+.040],-1)
shell*=1-rim[:,:,None]*.47
shell=shell*(1-seam[:,:,None]*.8)+np.array([.55,.52,.32])[None,None,:]*seam[:,:,None]*.8
save('shell_diff',shell)
norm('shell_nor_gl',r*.13-seam*.002+f*.0005,18)
# Coral polyp detail: irregular honeycombed cups, baked diffuse/bump.
seeds=rng.random((1500,2));p=np.stack([x.ravel(),y.ravel()],1);d,ids=cKDTree(seeds).query(p,k=2);d=d.reshape(N,N,2)
edge=d[:,:,1]-d[:,:,0];core=d[:,:,0]
height=np.tanh(core*100)*.08+np.exp(-edge*1800)*.02+noise(128,.003)
v=.76+.16*np.tanh((core-.003)*180)+noise(128,.035)
coral=np.stack([v,v*.975,v*.89],-1);save('coral_diff',coral);norm('coral_nor_gl',height,24)
print('Procedural texture files:',[(p.name,p.stat().st_size) for p in root.glob('*.jpg')])
