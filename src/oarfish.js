/* Original Regalecus glesne: a strongly compressed ribbon, continuous dorsal
 * fin and elongated anterior rays. Geometry, pigment and encounter route are
 * authored here; scientific references/limits are in OARFISH-REFERENCE.md. */
const OarfishArt=(()=>{
 const silver=[.69,.75,.77],dark=[.24,.31,.34],red=[.68,.16,.13],ray=[.77,.23,.18];
 function section(x){
  const u=clamp((x+.5)/.98,0,1),front=smooth01((u-.91)/.09),taper=Math.pow(u,.64);
  return [.044*taper*(1-.62*front),.009*Math.pow(u,.72)*(1-.18*front)];
 }
 function root(x){return section(x)[0]*.985;}
 function slope(x){return (root(x+.00001)-root(x-.00001))/.00002;}
 function paint(p){
  const x=p[0],y=p[1],back=clamp(y/.055,0,1);let blot=0;
  for(const [cx,cy,rx,ry]of [[.31,.004,.026,.018],[.13,-.007,.033,.020],[-.07,.006,.026,.015],[-.245,-.004,.022,.013],[-.39,.001,.017,.010]]){
   const d=((x-cx)/rx)**2+((y-cy)/ry)**2;blot=Math.max(blot,Math.exp(-d*2)*.72);
  }
  const pigment=clamp(blot+back*.10,0,.82);return silver.map((v,i)=>mix(v,dark[i],pigment));
 }
 function body(g,low){
  const nx=low?32:88,na=low?12:20,rows=[];g.tag=1;
  for(let i=0;i<=nx;i++){
   const x=mix(-.5,.48,i/nx),[h,w]=section(x),e=.00001,[h0,w0]=section(x-e),[h1,w1]=section(x+e),dh=(h1-h0)/(2*e),dw=(w1-w0)/(2*e),row=[];
   for(let j=0;j<=na;j++){
    const a=j/na*TAU,c=Math.cos(a),s=Math.sin(a),p=[x,h*c,w*s],normal=i?V.norm([-dh*w*c*c-dw*h*s*s,w*c,h*s]):[-1,0,0];row.push({p,n:normal,c:paint(p)});
   }rows.push(row);
  }
  function put(a,b,c){if(V.len(V.cross(V.sub(b.p,a.p),V.sub(c.p,a.p)))>1e-11)g.tri(a.p,b.p,c.p,a.c,[a.n,b.n,c.n],[a.c,b.c,c.c]);}
  for(let i=0;i<nx;i++)for(let j=0;j<na;j++){const a=rows[i][j],b=rows[i+1][j],c=rows[i+1][j+1],d=rows[i][j+1];put(a,c,b);put(a,d,c);}
  faunaArt.ellipsoid(g,[.475,-.002,0],[.025,.017,.009],paint,low?12:20,low?8:12);
  // Small terminal mouth and a paired opercular seam, without a toothed jaw.
  faunaArt.ellipsoid(g,[.4996,-.003,0],[.0004,.008,.005],dark,low?8:14,low?6:9);
  for(const side of [-1,1]){
   faunaArt.eye(g,[.445,.008,side*.0105],.0075,low);
   faunaArt.tube(g,[[.406,.024,side*.0083],[.398,.004,side*.0093],[.408,-.021,side*.0085]],.0006,[.40,.47,.48],low?4:6);
  }
 }
 function fins(g,low){
  const n=low?34:88,roots=[],tips=[];g.tag=3;
  for(let i=0;i<=n;i++){
   const u=i/n,x=mix(-.483,.432,u),height=(.014+.012*Math.sin(u*Math.PI))*smooth01(u/.06);
   roots.push([x,root(x),0]);tips.push([x,root(x)+height,0]);
  }
  faunaArt.fin(g,roots,tips,red,.00035);
  // Fine rays give the red ribbon a readable comb without a fan-shaped tail.
  for(let i=1;i<n;i++)faunaArt.tube(g,[roots[i],tips[i]],.00048,ray,low?4:5);
  // Two groups of anterior rays form the crown; their bases remain on the
  // same dorsal attachment curve as the long fin, so the GPU can pin them.
  for(const [x,h,sweep]of [[.432,.166,-.020],[.419,.143,-.022],[.406,.116,-.024],[.390,.093,-.026],[.350,.078,-.031],[.333,.066,-.033],[.316,.054,-.034]]){
   const y=root(x),points=faunaArt.curvePoints([[x,y,0],[x+sweep*.2,y+h*.52,0],[x+sweep,y+h,0]],low?2:4);
   faunaArt.tube(g,points,t=>.0011*(1-t*.75),ray,low?4:6);
   // Short terminal membrane follows each ray rather than joining the crown
   // into a solid triangular sail.
   faunaArt.fin(g,[[x+sweep*.35,y+h*.60,0],[x+sweep,y+h,0]],[[x+sweep*.35-.004,y+h*.63,0],[x+sweep-.002,y+h,0]],red,.00025);
  }
  // These red appendages stay still and retain soft-tissue reflectance. Tag 1
  // is the silver body; tag 3 is reserved for the undulating dorsal and crown.
  g.tag=5;
  for(const side of [-1,1]){
   faunaArt.fin(g,[[.376,.001,side*.008],[.352,-.011,side*.008]],[[.354,-.012,side*.029],[.329,-.028,side*.025]],[.62,.39,.34],.00025);
   // Paired slender pelvic rays hang below the head; there is no anal fin.
   const points=faunaArt.curvePoints([[.385,-.030,side*.005],[.367,-.095,side*.017],[.326,-.173,side*.024],[.296,-.213,side*.021]],low?2:4);
   faunaArt.tube(g,points,t=>.0014*(1-t*.60),ray,low?4:6);
   faunaArt.fin(g,[[.309,-.192,side*.023],[.296,-.213,side*.021]],[[.315,-.195,side*.023],[.295,-.217,side*.021]],red,.0003);
  }
 }
 function build(g,low){g.material=6;body(g,low);fins(g,low);g.tag=1;}
 const finished=new WeakSet();
 function attachments(g){
  if(finished.has(g))return g;
  // faunaArt.build normalizes metre coordinates and replaces ordinary UVs.
  // The oarfish rig consumes these two otherwise unused fin coordinates only.
  for(let k=0;k<g.v.length;k+=12)if(g.v[k+11]===3){g.v[k+9]=root(g.v[k]);g.v[k+10]=slope(g.v[k]);}
  finished.add(g);return g;
 }
 return {build,attachments};
})();
faunaArt.builders.oarfish=(g,low)=>OarfishArt.build(g,low);
const OARFISH_COLLECTION=[];
const OARFISH_SPECIES=registerFauna({id:'oarfish',name:'長冠皇帶魚',latin:'Regalecus glesne',en:'GIANT OARFISH',oarfish:true,zone:3,size:4,modelUnitLength:1,bodyLength:1,renderKind:11,color:0xafbfc4,naturalSize:'本作代表個體全長 4 m；非物種最大值',habitat:'微光中層 · 約 480 m 的開放水域',hint:'銀色帶狀身體、沿背紅鰭與高高的冠鰭；留意頭下方一對細長腹鰭。',detail:'皇帶魚以沿背部延伸的長鰭波動游動，身體可以大致保持直線，也曾被觀察到頭朝上懸停。本作以一隻四公尺個體呈現約四百八十公尺的中層遭遇；位置、路線、數量與動作節律為原創配置。',source:'https://biogeodb.stri.si.edu/caribbean/en/thefishes/species/4940',sourceLabel:'Smithsonian Tropical Research Institute · Regalecus glesne',traits:{motion:'hover',feedable:false,grabbable:false,observeDistance:18,contactDistance:2,targetRadius:1.5,viewDistance:6},motionProfile:{type:'oarfish',speed:.12,beat:3.2,radius:2.4},materialProfile:{skin:'silver',roughness:.34,subsurface:.025,patternScale:80},aquarium:{cost:4}},OARFISH_COLLECTION);
OARFISH_SPECIES.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><defs><linearGradient id="body" x2="0" y2="1"><stop stop-color="#a6bcc4"/><stop offset=".5" stop-color="#d5dfe0"/><stop offset="1" stop-color="#809ca4"/></linearGradient></defs><rect width="420" height="210" fill="#071e2b"/><path d="M34 117Q185 102 329 90L364 100 365 121Q221 128 34 117Z" fill="url(#body)"/><path d="M40 115Q188 91 329 82L333 94Q183 105 40 117Z" fill="#b74138"/><path d="M329 92L321 33M322 94L308 43M315 95L296 57M303 98L285 71M344 121Q337 159 317 180M337 123Q328 157 306 174" stroke="#c75a49" stroke-width="3" fill="none"/><g fill="#647c85"><ellipse cx="283" cy="109" rx="7" ry="6"/><ellipse cx="232" cy="113" rx="8" ry="5"/><ellipse cx="170" cy="115" rx="6" ry="4"/><ellipse cx="109" cy="117" rx="5" ry="3"/></g><circle cx="352" cy="105" r="5" fill="#d1b8a1"/><circle cx="353" cy="105" r="3" fill="#122c38"/><text x="20" y="195" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#90aeb9">GIANT OARFISH · ORIGINAL ART</text></svg>');
const geometryBeforeOarfish=faunaGeometry;
faunaGeometry=function(speciesOrId,lod=false){const g=geometryBeforeOarfish(speciesOrId,lod);return SPECIES[g.species]?.id==='oarfish'?OarfishArt.attachments(g):g;};
const OarfishWorld={encounter:{id:'oarfish-pass',species:'oarfish',home:[775,-480,-110],gate:[766,-480,-90],station:'midwater',radius:2.4,guide:true}};
function oarfishMotionPose(f,time,out=f.p,context=null){
 const profile=OARFISH_SPECIES.motionProfile,home=f.home||f.center,phase=f.phase||0,exhibit=!!context?.exhibit;
 const radius=clamp(Number.isFinite(f.radius)?f.radius:profile.radius,0,exhibit?.65:profile.radius),a=time*.035+phase;
 const x=Math.sin(a)*radius,z=Math.sin(a*.63+phase*.5)*radius*.4,y=Math.sin(a*.41)*(exhibit?.12:.45),yaw=f.homeYaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
 out[0]=home[0]+c*x+s*z;out[1]=home[1]+y;out[2]=home[2]-s*x+c*z;
 // A slowly changing head-up posture accompanies dorsal-fin propulsion. The
 // straight body does not have an eel tail beat, nor turn toward the camera.
 f.yaw=yaw+Math.sin(time*.019+phase)*.22;f.pitch=.80+Math.sin(time*.016+phase)*.55;
 f.bank=0;f.effort=.26;f.trenchBeat=profile.beat;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeOarfish=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){return SPECIES[f.species]?.id==='oarfish'?oarfishMotionPose(f,time,out,context):poseBeforeOarfish(f,time,out,context);};
function ensureOarfish(renderer){
 if(life.some(f=>f.oarfish||SPECIES[f.species]?.id==='oarfish'))return false;
 const sp=OARFISH_SPECIES,e=OarfishWorld.encounter,high=faunaGeometry(sp),low=faunaGeometry(sp,true),home=e.home.slice();
 const f={fauna:true,oarfish:true,encounterId:e.id,species:SPECIES.indexOf(sp),p:home.slice(),home,center:home.slice(),homeYaw:.45,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:e.radius,phase:.35,orbit:.35,bob:.35,height:0,speed:sp.motionProfile.speed,yaw:.45,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};
 oarfishMotionPose(f,0);const actors=[f];life.push(f);
 const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=28;hi.sceneRole='oarfish-encounter';
 const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=120;lo.shadow=false;lo.sceneRole='oarfish-encounter';
 allLife=life.concat(decorLife);return true;
}
const spawnBeforeOarfish=addLife;
addLife=function(renderer){spawnBeforeOarfish(renderer);ensureOarfish(renderer);};
