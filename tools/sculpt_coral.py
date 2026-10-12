"""Original volumetric coral forms. Optional authoring tool (numpy, scipy, scikit-image).
No scans, external textures or third-party game models are used.
The resulting JSON is pre-authored and shipped; normal build only needs Node/Python stdlib.
"""
from pathlib import Path
import numpy as np,json
from scipy.ndimage import gaussian_filter,zoom
from skimage.measure import marching_cubes
R=Path(__file__).resolve().parents[1]
rng=np.random.default_rng(751007)
N=84;minimum=np.array([-.84,-.10,-.84],np.float32);maximum=np.array([.84,1.08,.84],np.float32)
step=(maximum-minimum)/(N-1);field=np.zeros((N,N,N),np.float32)
def add_ball(p,r):
    idx=(p-minimum)/step;size=np.ceil(r*2.9/step).astype(int);lo=np.maximum(0,np.floor(idx).astype(int)-size);hi=np.minimum(N,np.ceil(idx).astype(int)+size+1)
    if np.any(hi<=lo):return
    x,y,z=np.ogrid[lo[0]:hi[0],lo[1]:hi[1],lo[2]:hi[2]]
    q=((x-idx[0])*step[0])**2+((y-idx[1])*step[1])**2+((z-idx[2])*step[2])**2
    gaussian=np.exp(-q/(r*r*.87)).astype(np.float32)
    # Smooth bounded union rather than sum: overlapping thin arms don't create huge round balls.
    f=field[lo[0]:hi[0],lo[1]:hi[1],lo[2]:hi[2]]
    np.maximum(f,gaussian,out=f)
def branch(a,b,r0,r1):
    d=np.linalg.norm(b-a);count=max(3,int(d/.017))
    for i in range(count+1):
        t=i/count;p=a*(1-t)+b*t;add_ball(p,r0*(1-t)+r1*t)
# Fused low pedestal with radiating, repeatedly bifurcated antler branches.
for i in range(14):
    a=i*2.399963;r=np.sqrt((i+.5)/14)*.42
    root=np.array([np.cos(a)*r*.34,0.,np.sin(a)*r*.34]);joint=np.array([np.cos(a)*r*.79,.25+rng.uniform(-.06,.06),np.sin(a)*r*.79]);tip=np.array([np.cos(a)*r*1.27,.57+rng.uniform(-.07,.11),np.sin(a)*r*1.27])
    branch(root,joint,.085,.06);branch(joint,tip,.06,.041)
    for j in range(3):
        t=.40+j*.24;start=joint*(1-t)+tip*t
        a2=a+(j-1)*.85+rng.uniform(-.3,.3);end=start+np.array([np.cos(a2)*.15,.22+rng.uniform(-.03,.07),np.sin(a2)*.15])
        branch(start,end,.042,.028)
        for sign in [-1,1]:
            endpoint=end+np.array([np.cos(a2+sign*.70)*.085,.11+rng.uniform(-.02,.03),np.sin(a2+sign*.70)*.085])
            branch(end,endpoint,.029,.022)
field=gaussian_filter(field,.58)
output={}
for label,n in [('high',70),('medium',28),('far',23)]:
    f=zoom(field,n/N,order=1);spacing=(maximum-minimum)/(np.array(f.shape)-1)
    verts,faces,normals,vals=marching_cubes(f,.27,spacing=spacing,gradient_direction='descent',allow_degenerate=False)
    verts=verts+minimum
    # skimage's normals point outward for a high-valued inside field.
    output[label]={'positions':np.round(verts,5).tolist(),'normals':np.round(normals,5).tolist(),'indices':faces.reshape(-1).tolist()}
    print(label,len(verts),'vertices',len(faces),'triangles')
(R/'assets/coral_forms.json').write_text(json.dumps(output,separators=(',',':')))
