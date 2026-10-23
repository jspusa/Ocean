/* Frozen 0.18 regional-query reference, before roof-column optimization.
 * Exact original bucket order and convex-ray arithmetic; test fixture only. */
const originalRegionQueries=(()=>{
 const solids=OceanRegions.solids,tileSize=6,verticalSize=32,tiles=new Map();
 for(const s of solids)for(let x=Math.floor(s.min[0]/tileSize);x<=Math.floor(s.max[0]/tileSize);x++)for(let y=Math.floor(s.min[1]/verticalSize);y<=Math.floor(s.max[1]/verticalSize);y++)for(let z=Math.floor(s.min[2]/tileSize);z<=Math.floor(s.max[2]/tileSize);z++){
  const key=x+','+y+','+z;if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(s);
 }
 function candidates(a,b=a,r=0){
  const lo=a.map((n,i)=>Math.min(n,b[i])-r),hi=a.map((n,i)=>Math.max(n,b[i])+r),sizes=[tileSize,verticalSize,tileSize],start=lo.map((n,i)=>Math.floor(n/sizes[i])),end=hi.map((n,i)=>Math.floor(n/sizes[i])),out=new Set();
  if((end[0]-start[0]+1)*(end[1]-start[1]+1)*(end[2]-start[2]+1)>1200){for(const s of solids)if(s.min.every((n,i)=>n<=hi[i]&&s.max[i]>=lo[i]))out.add(s);}
  else for(let x=start[0];x<=end[0];x++)for(let y=start[1];y<=end[1];y++)for(let z=start[2];z<=end[2];z++)for(const s of tiles.get(x+','+y+','+z)||[])out.add(s);
  return out;
 }
 function interval(s,a,d,r=0,near=0,far=1){
  let normal=null;
  for(let i=0;i<3;i++){
   if(Math.abs(d[i])<1e-10){if(a[i]<s.min[i]-r-1e-8||a[i]>s.max[i]+r+1e-8)return null;continue;}
   let lo=(s.min[i]-r-a[i])/d[i],hi=(s.max[i]+r-a[i])/d[i];if(lo>hi)[lo,hi]=[hi,lo];if(lo>=near){near=lo;normal=[0,0,0];normal[i]=-Math.sign(d[i]);}far=Math.min(far,hi);if(near>far+1e-9)return null;
  }
  for(const n of s.planes){const q=n[3]+r-(n[0]*a[0]+n[1]*a[1]+n[2]*a[2]),v=n[0]*d[0]+n[1]*d[1]+n[2]*d[2];
   if(Math.abs(v)<1e-10){if(q< -1e-8)return null;continue;}
   const t=q/v;if(v>0)far=Math.min(far,t);else if(t>=near){near=t;normal=n.slice(0,3);}if(near>far+1e-9)return null;
  }return [near,far,normal];
 }
 function ceilingAt(x,z,fromY=-Infinity){
  const a=[x,Number.isFinite(fromY)?fromY:-150,z],d=[0,150-a[1],0];let y=0;
  for(const s of candidates(a,[x,150,z]))if(s.role==='roof'){const hit=interval(s,a,d);if(hit&&hit[1]>0&&hit[0]>=0)y=Math.min(y,a[1]+hit[0]*d[1]);}return y;
 }
 return {candidates,ceilingAt};
})();
