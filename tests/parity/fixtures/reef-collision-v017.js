/* Frozen brute-force collision reference from jspusa/Ocean commit
 * 948c046a67fb5b7c7b8f77466b4b24171e75be9d (0.17.0), src/app.js.
 * Kept independently of Git history for ZIP/shallow-checkout regression tests. */
function collide(pos,from=null){
 const bounds=OceanTrench.worldBounds;
 pos[0]=clamp(pos[0],bounds.left+.5,bounds.right-.5);pos[2]=clamp(pos[2],bounds.top+.5,bounds.bottom-.5);
 pos[1]=clamp(pos[1],groundHeight(pos[0],pos[2])+.82,-.65);
 for(const ob of obstacles){const sx=ob.s[0]+.4,sy=ob.s[1]+.4,sz=ob.s[2]+.4;let qx=(pos[0]-ob.p[0])/sx,qy=(pos[1]-ob.p[1])/sy,qz=(pos[2]-ob.p[2])/sz,d2=qx*qx+qy*qy+qz*qz;
  if(d2<1){if(d2<.0001){pos[1]=ob.p[1]+sy;continue;}const k=1/Math.sqrt(d2);pos[0]=ob.p[0]+qx*k*sx;pos[1]=ob.p[1]+qy*k*sy;pos[2]=ob.p[2]+qz*k*sz;}}
 pos[1]=clamp(pos[1],groundHeight(pos[0],pos[2])+.82,-.65);if(typeof OceanRegions!=='undefined')OceanRegions.resolve(pos,.4,from);return pos;
}
function blocked(a,b,clearance=.13){if(typeof OceanRegions!=='undefined'&&OceanRegions.segmentBlocked(a,b,clearance))return true;let ab=V.sub(b,a),d=V.len(ab);for(let o of obstacles){let t=clamp(V.dot(V.sub(o.p,a),ab)/(d*d),0,1),p=V.add(a,V.mul(ab,t)),q=p.map((v,i)=>(v-o.p[i])/(o.s[i]*.93));if(t>.02&&t<.98&&V.dot(q,q)<1)return true;}for(let k=1;k<6;k++){let p=V.lerp(a,b,k/6);if(p[1]<groundHeight(p[0],p[2])+clearance)return true;}return false;}
