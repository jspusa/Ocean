/* A continuous continental slope joins the reef to the deep ocean. Existing
 * habitats keep their world coordinates and saved discoveries. */
const trenchCoastalGround=groundHeight;
const OceanTrench=(()=>{
 const coastalGround=trenchCoastalGround,worldBounds={left:-285,right:900,top:-395,bottom:215};
 const bounds={min:[260,-7060,-395],max:[900,-.65,215],left:260,right:900,top:-395,bottom:215},solids=[],surfaces=[],groups=new Map();
 const stations=[
  {id:'midwater',name:'微光中層站',depth:700,p:[760,-700,-90],look:[770,-700,-100]},
  {id:'slope',name:'深海泥底站',depth:1400,p:[754,-1400,-103],look:[763,-1402,-111]},
  {id:'hadal',name:'海溝底站',depth:7000,p:[766,-7000,-120],look:[776,-7001.8,-130]}
 ];
 const habitats={
  vampire_squid:{station:'midwater',homes:[[770,-700,-100],[775,-704,-107]],radius:.6},
  sea_pig:{station:'slope',homes:[[763,-1402,-111],[768,-1402,-115]],radius:.24},
  mariana_snailfish:{station:'hadal',homes:[[776,-7001.8,-130],[783,-7002.0,-135]],radius:.45}
 };
 // Patrols are camera/vehicle routes, not interaction targets on the mud.
 stations[0].route=[stations[0].p.slice(),[768,-700,-98],[774,-702,-106],[768,-701,-110],stations[0].p.slice()];
 stations[1].route=[stations[1].p.slice(),[759,-1400,-107],[765,-1400,-112],[770,-1400,-117],[774,-1400,-109],stations[1].p.slice()];
 stations[2].route=[stations[2].p.slice(),[772,-7000,-127],[782,-7000.2,-132],[788,-7000.2,-139],[777,-7000,-143],stations[2].p.slice()];
 const containsXZ=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&x>=bounds.min[0]&&x<=bounds.max[0]&&z>=bounds.min[2]&&z<=bounds.max[2];
 const containsPosition=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&containsXZ(p[0],p[2])&&p[1]>=bounds.min[1]&&p[1]<=bounds.max[1];
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
 // The deep plain is a sampled surface, so physics queries interpolate the
 // actual same triangles rather than a different analytic approximation.
 function sedimentRelief(x,z,homes){
  const core=Math.min(...homes.map(p=>Math.max(Math.abs(x-p[0]),Math.abs(z-p[2]))));
  // Broad depositional undulations, in metres. Habitat cores stay exactly flat;
  // there is no independent noise field in the collision/height query.
  return (.16*Math.sin(x*.33+z*.19)+.09*Math.cos(z*.49-x*.12)+.04*Math.sin(x*.77-z*.41))*smooth((core-2)/3);
 }
 function axis(min,max,step,homes,k){const values=new Set();for(let n=min;n<=max;n+=step)values.add(n);values.add(max);for(const p of homes)for(const d of [-3,-2,2,3])if(p[k]+d>min&&p[k]+d<max)values.add(p[k]+d);return [...values].sort((a,b)=>a-b);}
 const floorGrid={xs:axis(260,900,5,habitats.mariana_snailfish.homes,0),zs:axis(-395,215,5,habitats.mariana_snailfish.homes,2)};
 function bedSample(x,z){const distance=Math.hypot(x-780,z+132),plain=-7030+5*Math.sin((x-720)*.025)*Math.cos((z+120)*.024),w=1-smooth((distance-20)/20),edge=smooth(Math.min(x-620,900-x,z+240,60-z)/5),deep=mix(plain,-7002.5,w)+sedimentRelief(x,z,habitats.mariana_snailfish.homes)*edge;return x<620?mix(coastalGround(x,z),deep,smooth((x-260)/360)):deep;}
 function cell(axis,value){let low=0,high=axis.length-1;while(high-low>1){const middle=(low+high)>>1;if(axis[middle]<=value)low=middle;else high=middle;}return Math.min(low,axis.length-2);}
 function groundHeight(x,z){
  if(!containsXZ(x,z))return null;
  const q=floorGrid,i=cell(q.xs,x),j=cell(q.zs,z),a=clamp((x-q.xs[i])/(q.xs[i+1]-q.xs[i]),0,1),b=clamp((z-q.zs[j])/(q.zs[j+1]-q.zs[j]),0,1);
  const h=(di,dj)=>bedSample(q.xs[i+di],q.zs[j+dj]),h00=h(0,0),h10=h(1,0),h11=h(1,1),h01=h(0,1);
  return a>=b?h00+(h10-h00)*a+(h11-h10)*b:h00+(h11-h01)*a+(h01-h00)*b;
 }
 function heightInTriangle(p,x,z){const [a,b,c]=p,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-12)return null;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;return u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8?u*a[1]+v*b[1]+(1-u-v)*c[1]:null;}
 const surfaceCells=new Map();
 function floorAt(x,z,fromY=Infinity){let y=groundHeight(x,z);if(y===null)return null;for(const s of surfaceCells.get(Math.floor(x/10)+','+Math.floor(z/10))||[]){if(s.y>fromY+.002||x<s.minX||x>s.maxX||z<s.minZ||z>s.maxZ)continue;const h=heightInTriangle(s.p,x,z);if(h!==null&&h<=fromY+.002)y=Math.max(y,h);}return y;}
 const chunkHeight=128;
 function group(y,material){const slice=Math.floor((-y-580)/chunkHeight),key=slice+':'+material;if(!groups.has(key)){const origin=[760,-580-(slice+.5)*chunkHeight,-90],g=new Geometry();g.material=material;g.tag=material===17?31:30;groups.set(key,{g,origin,slice,material});}return groups.get(key);}
 function emit(face,normal,material){const center=face.reduce((a,p)=>a.map((n,i)=>n+p[i]/face.length),[0,0,0]),{g,origin}=group(center[1],material),base=material===17?[.43,.39,.34]:[.39,.41,.42];
  for(let i=1;i<face.length-1;i++)for(const p of [face[0],face[i],face[i+1]]){const local=V.sub(p,origin),bed=p[1]+.13*p[0]+.045*p[2],tone=.91+.07*Math.sin(bed*.9)+.025*Math.sin(bed*4.1);g.vertex(local,normal,base.map(c=>c*tone),[material===17?.93:.72,bed]);}
 }
 // Extruded triangles are convex. All rendered faces are the exact collider
 // planes; narrow joints use real edges rather than dark rectangles in a map.
 function prism(id,triangle,axis,thickness,material=16,role='wall'){
  const back=triangle.map(p=>p.map((n,k)=>n+(k===axis?thickness:0))),vertices=triangle.concat(back),center=[0,1,2].map(k=>vertices.reduce((n,p)=>n+p[k],0)/6),faces=[triangle.slice(),back.slice()];
  for(let i=0;i<3;i++)faces.push([triangle[i],back[i],back[(i+1)%3],triangle[(i+1)%3]]);
  const planes=faces.map(face=>{let n=faceNormal(face[0],face[1],face[2]);if(V.dot(n,V.sub(center,face[0]))>0){face.reverse();n=V.mul(n,-1);}return [...n,V.dot(n,face[0])];});
  const s={id:'trench-'+id,region:'trench',role,min:[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k]))),faces,planes};solids.push(s);
  for(let i=0;i<faces.length;i++){emit(faces[i],planes[i].slice(0,3),material);if(planes[i][1]>.1)for(let j=1;j<faces[i].length-1;j++){const p=[faces[i][0],faces[i][j],faces[i][j+1]];surfaces.push({p,y:Math.min(...p.map(q=>q[1])),minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),minZ:Math.min(...p.map(q=>q[2])),maxZ:Math.max(...p.map(q=>q[2]))});}}
 }
 // Two fault walls run continuously down the transect. Dense sections around
 // the three stations expose broad ledges and inclined bedding in silhouette.
 const levels=new Set([-580,-7040]);for(let y=-580;y>-7040;y-=128)levels.add(y);
 for(const s of stations)for(let dy=-22;dy<=22;dy+=2)levels.add(-s.depth+dy);
 const ys=[...levels].sort((a,b)=>b-a),zs=Array.from({length:15},(_,i)=>-188+i*10);
 function wallX(y,z,side){const bed=y+.12*z,layer=Math.floor(bed/3.4),ledge=.62*Math.sin(layer*1.91)+.25*Math.sin(layer*.47),weather=.35*Math.sin(z*.23+y*.08),curve=2.1*Math.sin(y*.0027)+1.6*Math.cos(z*.045);return 762+side*(28+curve+ledge+weather);}
 for(const side of [-1,1])for(let j=0;j<ys.length-1;j++)for(let k=0;k<zs.length-1;k++){
  const at=(y,z)=>[wallX(y,z,side),y,z],p=[at(ys[j],zs[k]),at(ys[j],zs[k+1]),at(ys[j+1],zs[k+1]),at(ys[j+1],zs[k])];
  prism('wall-'+side+'-'+j+'-'+k+'a',[p[0],p[1],p[2]],0,side*8);prism('wall-'+side+'-'+j+'-'+k+'b',[p[0],p[2],p[3]],0,side*8);
 }
 // The 1400m muddy terrace is a real, finite ledge, open below it. Its central
 // patch stays exactly level for the small deposit feeders' feet.
 const shelf=(x,z)=>-1402-2.8*smooth(Math.max(Math.abs(x-766)/15,Math.abs(z+113)/13)-.48)+sedimentRelief(x,z,habitats.sea_pig.homes)*smooth(Math.min(x-751,781-x,z+126,-100-z)/3);
 const shelfGrid={xs:axis(751,781,2,habitats.sea_pig.homes,0),zs:axis(-126,-100,2,habitats.sea_pig.homes,2)};
 for(let j=0;j<shelfGrid.zs.length-1;j++)for(let i=0;i<shelfGrid.xs.length-1;i++){const x=shelfGrid.xs[i],z=shelfGrid.zs[j],x1=shelfGrid.xs[i+1],z1=shelfGrid.zs[j+1],p=[[x,shelf(x,z),z],[x1,shelf(x1,z),z],[x1,shelf(x1,z1),z1],[x,shelf(x,z1),z1]];prism('terrace-'+j+'-'+i+'a',[p[0],p[2],p[1]],1,-3.5,17,'roof');prism('terrace-'+j+'-'+i+'b',[p[0],p[3],p[2]],1,-3.5,17,'roof');}
 // Bottom sediment is divided into chunks horizontally as well as by depth.
 // Geometry remains local even at seven kilometres; no origin at the sea level.
 const q=floorGrid;for(let j=0;j<q.zs.length-1;j++)for(let i=0;i<q.xs.length-1;i++){const x=q.xs[i],z=q.zs[j],x1=q.xs[i+1],z1=q.zs[j+1],p=[[x,bedSample(x,z),z],[x1,bedSample(x1,z),z],[x1,bedSample(x1,z1),z1],[x,bedSample(x,z1),z1]];for(const ids of [[0,2,1],[0,3,2]]){const triangle=ids.map(k=>p[k]);emit(triangle,faceNormal(...triangle),17);}}

 // A bounded visibility graph handles the finite terrace edge at the current
 // depth. Replanning must never first visit the last completed station.
 function clearRouteSegment(a,b){
  if(typeof OceanRegions!=='undefined'&&!OceanRegions.pathClear(a,b,.4))return false;
  const steps=Math.max(1,Math.ceil(V.dist(a,b)/4));for(let i=0;i<=steps;i++){const p=V.lerp(a,b,i/steps),floor=groundHeight(p[0],p[2])??coastalGround(p[0],p[2]);if(p[1]<floor+.81)return false;}return true;
 }
 function departure(start,x){
  const goal=[x,start[1],-90];if(clearRouteSegment(start,goal))return [start.slice(),goal];
  // Four skirt corners avoid either side of the 1400m ledge. Nodes and tests
  // use the real convex collision planes, including their swept sphere radius.
  const nodes=[start.slice(),goal,...[[746,-130],[786,-130],[746,-96],[786,-96],[754,-90],[766,-90]].map(([x,z])=>[x,start[1],z])],cost=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();cost[0]=0;
  while(done.size<nodes.length){let i=-1;for(let j=0;j<nodes.length;j++)if(!done.has(j)&&(i<0||cost[j]<cost[i]))i=j;if(i<0||!Number.isFinite(cost[i]))break;if(i===1){const path=[];for(let j=1;j>=0;j=prev[j])path.unshift(nodes[j]);return path;}done.add(i);for(let j=0;j<nodes.length;j++)if(!done.has(j)&&clearRouteSegment(nodes[i],nodes[j])){const next=cost[i]+V.dist(nodes[i],nodes[j]);if(next<cost[j]){cost[j]=next;prev[j]=i;}}}
  return [];
 }
 function route(fromId,toId,currentPosition=null){
  const a=stations.find(s=>s.id===fromId),b=stations.find(s=>s.id===toId);if(!a||!b||currentPosition!==null&&(!Array.isArray(currentPosition)||currentPosition.length!==3||!currentPosition.every(Number.isFinite)))return [];
  const start=(currentPosition||a.p).slice();let out=[];
  // From the reef, swim through open water and descend the same unbroken
  // column that manual swimming uses. No deployment or scene transition.
  if(start[0]<720||start[0]>800){out=[start,[start[0],-3,start[2]],[b.p[0],-3,-90]];}
  else for(const rise of [0,2,-2,8,-8,32]){const lifted=[start[0],Math.min(-.65,start[1]+rise),start[2]];if(rise&&!clearRouteSegment(start,lifted))continue;const path=departure(lifted,b.p[0]);if(path.length){out=rise?[start,...path]:path;break;}}
  if(!out.length)return [];
  const exit=out.at(-1),entry=[b.p[0],b.p[1],-90],count=Math.max(4,Math.ceil(Math.abs(exit[1]-entry[1])/96));
  for(let i=1;i<=count;i++)out.push(V.lerp(exit,entry,i/count));if(V.dist(entry,b.p)>.001)out.push(b.p.slice());
  for(let i=1;i<out.length;i++)if(!clearRouteSegment(out[i-1],out[i]))return [];
  return out.filter((p,i)=>!i||V.dist(p,out[i-1])>.0001);
 }

 for(const s of surfaces)for(let x=Math.floor(s.minX/10);x<=Math.floor(s.maxX/10);x++)for(let z=Math.floor(s.minZ/10);z<=Math.floor(s.maxZ/10);z++){const key=x+','+z;if(!surfaceCells.has(key))surfaceCells.set(key,[]);surfaceCells.get(key).push(s);}
 function nearbySolids(p,r=0){return typeof OceanRegions!=='undefined'?OceanRegions.nearbySolids(p,r):solids.filter(s=>p.every((n,i)=>n>=s.min[i]-r&&n<=s.max[i]+r));}
 // Recenter each depth slice on its real terrain. The continental slope is
 // hundreds of metres west of the old station origins and must not disappear
 // just because an instance origin, rather than its surface, is far away.
 for(const entry of groups.values()){
  const {g,origin}=entry,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<g.v.length;i+=12)for(let k=0;k<3;k++){min[k]=Math.min(min[k],g.v[i+k]);max[k]=Math.max(max[k],g.v[i+k]);}
  const center=min.map((n,k)=>(n+max[k])*.5);for(let i=0;i<g.v.length;i+=12)for(let k=0;k<3;k++)g.v[i+k]-=center[k];
  for(let k=0;k<3;k++)origin[k]+=center[k];entry.distance=Math.max(300,Math.hypot(...max.map((n,k)=>(n-min[k])*.5))+100);
 }
 function build(renderer){for(const {g,origin,distance}of groups.values()){const batch=renderer.batch(g,[{p:origin.slice()}]);batch.sceneRole='region:trench';batch.regionRole='strata';batch.maxDistance=distance;}}
 function freeze(o){if(o&&typeof o==='object'){for(const p of Object.values(o))freeze(p);Object.freeze(o);}return o;}
 freeze(bounds);freeze(worldBounds);freeze(stations);freeze(habitats);freeze(solids);
 return Object.freeze({bounds,worldBounds,stations,habitats,solids,containsXZ,containsPosition,groundHeight,floorAt,nearbySolids,route,build});
})();
