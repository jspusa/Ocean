/* Original 0.18 regional-overlay formula, test fixture only. */
const originalRegionGround=(()=>{
 const originalGround=trenchCoastalGround;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 const mixRegion=(a,b,t)=>a+(b-a)*t;
 const boxWeight=(x,z,x0,x1,z0,z1,feather)=>{
  const dx=Math.max(x0-x,0,x-x1),dz=Math.max(z0-z,0,z-z1);
  return 1-ease(Math.hypot(dx,dz)/feather);
 };
 const canyonX=z=>-156+13*ease((-z-284)/38);
 const canyonBed=z=>-66-28*ease((-z-253)/70);
 const padLocations=[[-156,-265],[-154.4,-293],[-143,-321]];
 function originalRegionGround(x,z){
  if(typeof OceanTrench!=='undefined'&&OceanTrench.containsXZ(x,z))return OceanTrench.groundHeight(x,z);
  let y=originalGround(x,z);
  const cave=boxWeight(x,z,-236,-212,-85,-38,10);
  if(cave)y=mixRegion(y,-29,cave);
  const ruins=boxWeight(x,z,155,199,-237,-194,12);
  if(ruins)y=mixRegion(y,-54,ruins);
  const cross=1-ease((Math.abs(x-canyonX(z))-6)/14),length=ease((-z-245)/11)*(1-ease((-z-327)/11));
  if(cross>0&&length>0)y=mixRegion(y,Math.min(y,canyonBed(z)),cross*length);
  // Small level foundations, wide enough for a sensor and a diver, are part of
  // the terrain itself. The 4.2m flat core covers the actual 64/22m terrain
  // triangle vertices under each 2.4m platform; their rim blends into the floor.
  for(const [px,pz] of padLocations){const weight=1-ease((Math.hypot(x-px,z-pz)-4.2)/2.7);if(weight>0)y=mixRegion(y,canyonBed(pz),weight);}
  return y;
 }
 return originalRegionGround;
})();
