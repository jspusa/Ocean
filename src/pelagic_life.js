/* Open-water encounters, appended after the existing catalogue and populations.
 * Models are authored here; size is physical total length in game metres.
 * Routes are an original shared ocean, not a claim about a real dive site. */
const PELAGIC_SPECIES=[];
const pelagicArt=(()=>{
 const blend=cetaceanArt.blend,soft=cetaceanArt.soft;
 const whale={
  body:[[-.48,0,0,0],[-.42,0,.013,.012],[-.32,.003,.030,.025],[-.18,.003,.052,.044],[-.02,0,.069,.062],[.14,-.003,.075,.071],[.28,-.005,.063,.071],[.39,-.010,.041,.062],[.465,-.010,.024,.041],[.498,-.010,.007,.017],[.5,-.010,0,0]],
  dorsal:[[-.22,.044,0,.033,.005],[-.239,.068,0,.023,.004],[-.258,.089,0,.011,.002],[-.272,.091,0,0,0]],
  flipper:[[.18,-.040,.054,.035,.007],[.123,-.063,.102,.034,.006],[.067,-.080,.139,.022,.004],[.028,-.083,.157,0,0]],
  fluke:[[-.455,0,0,.020,.007],[-.472,.002,.042,.035,.007],[-.471,.005,.091,.030,.005],[-.450,.008,.134,.013,.002],[-.438,.009,.151,0,0]],
  eyeX:.363,eyeY:-.014,eyeRadius:.0025,mouthStart:.17,mouthEnd:.492,mouthLevel:-.33,blowX:.28,
  paint(p){const [x,y,z]=p,mottle=.5+.25*Math.sin(x*83+Math.sin(z*137))*.7+.17*Math.sin(x*151-z*93)*Math.sin(y*123+z*87),belly=1-soft(-.052,-.017,y);return blend(blend([.22,.32,.37],[.40,.50,.52],mottle),[.56,.62,.61],belly*.55);},
  finColor:p=>blend([.22,.32,.37],[.48,.56,.56],1-soft(-.07,-.02,p[1])),
  detail(g,low){
   // Curved ventral pleats sit on the body surface, so the throat reads at close
   // range without a painted stripe floating through the animal.
   for(let k=0;k<(low?10:24);k++){const angle=Math.PI*.63+k/(low?9:23)*Math.PI*.74,path=[];for(let j=0;j<=(low?9:24);j++){const x=mix(-.03,.455,j/(low?9:24)),p=cetaceanArt.profileAt(whale.body,x);path.push([x,p[1]+Math.cos(angle)*(p[2]+.00065),Math.sin(angle)*(p[3]+.00065)]);}faunaArt.tube(g,path,.00035,[.28,.37,.39],low?3:4);}
   // Baleen whales have a paired blowhole, distinct from toothed cetaceans.
   const blow=cetaceanArt.profileAt(whale.body,.28),cap=[.28,blow[1]+blow[2]+.001,0];faunaArt.ellipsoid(g,cap,[.014,.0015,.010],whale.paint(cap),low?10:16,5);
   for(const side of [-1,1])faunaArt.ellipsoid(g,[.28,cap[1]+.0013,side*.005],[.008,.0007,.0025],[.055,.085,.10],low?8:12,5);
  }
 };
 const sharkRows=[[-.48,0,0,0],[-.39,0,.016,.013],[-.27,0,.035,.027],[-.13,.002,.061,.046],[.02,0,.083,.068],[.17,0,.093,.086],[.31,-.003,.083,.096],[.405,-.008,.057,.092],[.465,-.009,.036,.070],[.499,-.009,.015,.036],[.5,-.009,0,0]];
 function sharkPaint(p){const [x,y,z]=p,belly=1-soft(-.053,-.025,y),row=Math.round(x*63),a=x*63-row,b=z*80-Math.round(z*80+(row%2)*.5)+(row%2)*.5,spots=1-soft(.16,.28,Math.hypot(a,b));return blend(blend([.20,.31,.34],[.71,.77,.70],spots*(1-belly)),[.70,.73,.66],belly);}
 function shark(g,low){
  cetaceanArt.skin(g,(u,v)=>{const p=cetaceanArt.profileAt(sharkRows,mix(-.48,.5,u)),a=v*TAU;return [p[0],p[1]+Math.cos(a)*p[2],Math.sin(a)*p[3]];},low?40:100,low?20:48,sharkPaint);
  const fin=(rows,vertical=false)=>cetaceanArt.skin(g,(u,v)=>{const n=rows.length-1,q=u*n,i=Math.min(n-1,Math.floor(q)),t=q-i,p=rows[i].map((v,k)=>mix(v,rows[i+1][k],smooth01(t))),a=v*TAU;return vertical?[p[0]+Math.cos(a)*p[3],p[1],p[2]+Math.sin(a)*p[4]]:[p[0]+Math.cos(a)*p[3],p[1]+Math.sin(a)*p[4],p[2]];},low?12:30,low?8:14,sharkPaint);
  g.tag=3;
  for(const side of [-1,1]){
   fin([[.20,-.046,side*.070,.047,.009],[.12,-.064,side*.149,.056,.007],[.019,-.078,side*.222,.032,.004],[-.016,-.081,side*.252,0,0]]);
   fin([[-.14,-.036,side*.036,.029,.006],[-.19,-.051,side*.096,.034,.004],[-.24,-.052,side*.124,0,0]]);
  }
  fin([[.01,.074,0,.065,.008],[-.025,.124,0,.044,.007],[-.080,.188,0,.019,.004],[-.098,.202,0,0,0]],true);
  fin([[-.235,.042,0,.035,.005],[-.263,.083,0,.022,.004],[-.293,.101,0,0,0]],true);
  // The upper lobe is longer than the lower lobe: a vertical heterocercal
  // shark tail, not the horizontal flukes of the blue whale beside it.
  fin([[-.445,0,0,.032,.010],[-.473,.080,0,.040,.008],[-.509,.163,0,.022,.005],[-.542,.217,0,0,0]],true);
  fin([[-.446,0,0,.028,.010],[-.481,-.065,0,.034,.007],[-.522,-.128,0,0,0]],true);
  g.tag=4;
  for(const side of [-1,1]){const p=cetaceanArt.profileAt(sharkRows,.423);faunaArt.ellipsoid(g,[.423,.003,side*(p[3]+.001)],[.0058,.0042,.0028],[.022,.035,.036],low?8:14,low?5:8);}
  g.tag=1;
  // Broad terminal mouth and five visible gill slits on each side.
  faunaArt.tube(g,Array.from({length:low?13:25},(_,i)=>{const z=(i/(low?12:24)-.5)*.128,y=-.025;let a=.4,b=.5;for(let k=0;k<18;k++){const x=(a+b)*.5,p=cetaceanArt.profileAt(sharkRows,x);if(((y-p[1])/p[2])**2+(z/p[3])**2<1)a=x;else b=x;}return [(a+b)*.5+.001,y,z];}),.0018,[.045,.071,.073],low?4:6);
  for(const side of [-1,1])for(let k=0;k<5;k++){const x=.235-k*.021,p=cetaceanArt.profileAt(sharkRows,x),path=[];for(let j=0;j<=8;j++){const a=mix(.30,2.30,j/8);path.push([x-.008*Math.sin(a),p[1]+Math.cos(a)*p[2]*.91,side*(Math.sin(a)*p[3]+.001)]);}faunaArt.tube(g,path,.0012,[.085,.14,.15],low?3:5);}
 }
 return {whale,shark};
})();
faunaArt.builders.blue_whale=(g,low)=>cetaceanArt.build(g,pelagicArt.whale,low);
faunaArt.builders.whale_shark=pelagicArt.shark;
const pelagicEntries=[
 {id:'blue_whale',name:'藍鯨',latin:'Balaenoptera musculus',en:'BLUE WHALE',size:26,color:0x63818b,cetacean:true,renderKind:9,naturalSize:'本作代表個體全長 26 m',hint:'二十六公尺的灰藍身軀、斑駁背部、小背鰭與寬大的水平尾鰭。',detail:'藍鯨是現存最大的動物。游到礁庭外緣，能從牠的胸鰭一路望向遠處的尾鰭；緩慢巡游、出現位置與共處物種為本作原創編排。',source:'https://www.fisheries.noaa.gov/species/blue-whale',sourceLabel:'NOAA Fisheries · Blue Whale',motionProfile:{cruiseSpeed:1.7,beat:.58,surfacePeriod:150,depthSwing:3},materialProfile:{skin:'cetacean',roughness:.52,subsurface:.06,patternScale:110},traits:{motion:'cetacean',observeDistance:65,contactDistance:3,targetRadius:6.5,viewDistance:24},aquarium:{cost:100}},
 {id:'whale_shark',name:'鯨鯊',latin:'Rhincodon typus',en:'WHALE SHARK',size:8.5,color:0x526f73,renderKind:12,naturalSize:'本作代表個體全長 8.5 m',hint:'寬平頭部、前端大嘴、點線斑紋，以及上下擺幅不同的垂直尾鰭。',detail:'鯨鯊是濾食性鯊魚，也是現存最大的魚類。牠的尾鰭左右擺動，與藍鯨上下擺動的水平尾鰭不同。這片海的雙鯨鯊巡游路線是原創遊戲配置。',source:'https://www.fisheries.noaa.gov/species/whale-shark',sourceLabel:'NOAA Fisheries · Whale Shark',motionProfile:{cruiseSpeed:.85,beat:.8,surfacePeriod:1e9,depthSwing:.65},materialProfile:{skin:'fish',roughness:.63,subsurface:.06,patternScale:120},traits:{motion:'pelagic',observeDistance:35,contactDistance:2,targetRadius:2.4,viewDistance:10},aquarium:{cost:100}}
];
for(const entry of pelagicEntries){
 const sp=registerFauna({...entry,pelagic:true,zone:7,bodyLength:1,traits:{micro:false,feedable:false,grabbable:false,...entry.traits}},PELAGIC_SPECIES);
 if(sp.id==='blue_whale'){cetaceanArt.definitions.blue_whale=pelagicArt.whale;sp.thumb=cetaceanArt.thumbnail(sp);}
 else sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#0a303a"/><path d="M43 108Q41 72 111 72L226 89 300 104 351 53 326 113 351 162 297 123 183 141 94 139Q45 135 43 108Z" fill="#526f73"/><path d="M186 90L219 45 227 94M132 129L197 177 185 133" fill="#415e63"/><g fill="#ccd5c9">'+Array.from({length:30},(_,i)=>'<circle cx="'+(70+i%10*19)+'" cy="'+(89+Math.floor(i/10)*16)+'" r="2.6"/>').join('')+'<circle cx="62" cy="99" r="3" fill="#10292e"/></g><path d="M45 117L65 121" stroke="#183d43" stroke-width="2"/><text x="20" y="192" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">WHALE SHARK · ORIGINAL MODEL</text></svg>');
}
const PelagicWorldRules={
 blue_whale:{homes:[[-22,-6.6,-72]],radius:48,phases:[1.1]},
 whale_shark:{homes:[[8,-4.8,-17],[61,-9,-63]],radius:17,phases:[2.2,.85]}
};
const spawnBeforePelagic=addLife;
addLife=function(renderer){
 spawnBeforePelagic(renderer);
 for(const sp of PELAGIC_SPECIES){
  const high=faunaGeometry(sp),low=faunaGeometry(sp,true),def=PelagicWorldRules[sp.id],actors=[],index=SPECIES.indexOf(sp);
  for(const [k,position] of def.homes.entries()){
   const home=position.slice(),phase=def.phases[k],f={fauna:true,pelagic:true,species:index,p:home.slice(),home,center:home.slice(),homeYaw:0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],yaw:0,pitch:0,phase,orbit:phase,radius:def.radius,height:0,speed:sp.motionProfile.cruiseSpeed,bob:phase,retreat:0,faunaVisibility:1,tint:[1,1,1]};
   actors.push(f);life.push(f);
  }
  const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=sp.size*3;
  const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=320;lo.shadow=false;
 }
 allLife=life.concat(decorLife);
};
// Broad animals need an authored, continuously clear corridor. Reusing small
// cetacean obstacle detours can switch candidate rocks as spatial buckets change,
// making a giant whale jump across the reef. These shallow-water ellipses were
// checked with the entire animal's conservative body and animation envelope.
function pelagicMotionPose(f,time,out=f.p,context=null){
 if(context?.exhibit)return cetaceanMotionPose(f,time,out,context);
 const sp=SPECIES[f.species],home=f.home||f.center,radius=f.radius,omega=sp.motionProfile.cruiseSpeed/radius,a=time*omega+f.phase,bob=sp.id==='blue_whale'?.35:.22;
 out[0]=home[0]+Math.cos(a)*radius;out[2]=home[2]+Math.sin(a)*radius*.72;out[1]=home[1]+Math.sin(time*.061+f.phase)*bob;
 const dx=-Math.sin(a)*radius*omega,dz=Math.cos(a)*radius*.72*omega,dy=Math.cos(time*.061+f.phase)*bob*.061;
 f.yaw=Math.atan2(-dz,dx);f.pitch=Math.atan2(dy,Math.hypot(dx,dz));f.bank=0;f.effort=.65;f.cetaceanBeat=sp.motionProfile.beat;f.partnerFinPulse=0;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const faunaPoseBeforePelagic=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){
 if(SPECIES[f.species]?.pelagic)return pelagicMotionPose(f,time,out,context);
 return faunaPoseBeforePelagic(f,time,out,context);
};
