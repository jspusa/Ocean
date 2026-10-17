/* Open-water encounters, appended after the existing catalogue and populations.
 * Models are authored here; size is physical total length in game metres.
 * Routes are an original shared ocean, not a claim about a real dive site. */
const PELAGIC_SPECIES=[];
const pelagicArt=(()=>{
 const blend=cetaceanArt.blend,soft=cetaceanArt.soft;
 // Long, low rostrum and a broad rounded U-shaped head. The last section is an
 // elliptical cap, not a row of narrow cones converging into a pointed fish nose.
 const whale={
  body:[[-.464,0,0,0],[-.425,0,.014,.015],[-.34,.002,.029,.026],[-.22,.003,.046,.040],[-.08,.002,.063,.056],[.06,-.002,.072,.066],[.18,-.004,.071,.070],[.29,-.008,.057,.069],[.38,-.014,.034,.061],[.46,-.018,.020,.047],[.50,-.018,0,0]],
  dorsal:[[-.235,.040,0,.037,.010],[-.247,.062,0,.029,.007],[-.271,.084,0,.013,.003],[-.286,.087,0,0,0]],
  flipper:[[.19,-.030,.030,.051,.025],[.157,-.045,.064,.044,.019],[.109,-.059,.104,.032,.012],[.050,-.074,.139,.017,.005],[.018,-.078,.154,0,0]],
  // The thumbnail uses these sections; the actual flukes are one continuous
  // surface across the peduncle, with a shallow central trailing-edge notch.
  fluke:[[-.459,0,0,.016,.006],[-.474,.002,.046,.027,.006],[-.463,.004,.100,.022,.004],[-.429,.005,.155,0,0]],
  eyeX:.338,eyeY:-.018,eyeRadius:.0022,mouthStart:.17,mouthEnd:.492,mouthLevel:-.33,blowX:.255,
  paint(p){const belly=1-soft(-.052,-.014,p[1]);return blend([.25,.35,.40],[.49,.56,.56],belly*.62);},
  finColor:p=>blend([.23,.32,.37],[.43,.50,.51],1-soft(-.072,-.032,p[1]))
 };
 const sharkRows=[[-.425,0,0,0],[-.378,0,.017,.014],[-.29,.001,.030,.024],[-.17,.002,.048,.037],[-.035,.001,.070,.056],[.105,0,.084,.075],[.23,-.002,.084,.087],[.34,-.005,.070,.093],[.425,-.009,.045,.088],[.465,-.010,.031,.077],[.50,-.010,0,0]];
 // Pigment is deliberately broad. Filtered fragment shading supplies spots,
 // pleats and scars, so distant triangles never become coloured patchwork.
 const sharkPaint=p=>blend([.24,.33,.35],[.64,.67,.61],(1-soft(-.056,-.024,p[1]))*.83);
 function eyes(g,rows,x,y,r,low,flatten=0){
  const p=marineProfile(rows,x),power=1-flatten*smooth01((x-.26)/.16),z=p[3]*Math.pow(Math.max(0,1-Math.pow(Math.abs((y-p[1])/p[2]),2/power)),power/2);g.tag=4;
  for(const side of [-1,1]){faunaArt.ellipsoid(g,[x,y,side*(z-r*.15)],[r,r*.70,r*.42],[.025,.036,.038],low?10:20,low?8:12);}
 }
 function blueWhale(g,low){
  g.tag=1;marineBody(g,whale.body,low,whale.paint,.46);
  g.tag=3;marineFin(g,whale.dorsal,low,whale.paint,true);
  for(const side of [-1,1])marineFin(g,whale.flipper.map(p=>[p[0],p[1],p[2]*side,p[3],p[4]]),low,whale.finColor);
  marineFlukes(g,low,whale.paint);
  eyes(g,whale.body,whale.eyeX,whale.eyeY,whale.eyeRadius,low);
  // Mouth seams, ventral grooves and the paired blowhole are skin shading.
  // No intersecting tube ropes, artificial nasal cap or third blowhole mesh.
  g.tag=1;
 }
 function shark(g,low){
  g.tag=1;marineBody(g,sharkRows,low,sharkPaint,.465,.18);
  g.tag=3;
  for(const side of [-1,1]){
   marineFin(g,[[.19,-.030,side*.030,.064,.026],[.137,-.046,side*.087,.059,.021],[.065,-.062,side*.154,.043,.012],[-.011,-.076,side*.211,.025,.006],[-.039,-.078,side*.231,0,0]],low,sharkPaint);
   marineFin(g,[[-.13,-.022,side*.020,.042,.016],[-.171,-.036,side*.065,.036,.011],[-.221,-.043,side*.102,.021,.005],[-.25,-.045,side*.115,0,0]],low,sharkPaint);
  }
  marineFin(g,[[.005,.047,0,.073,.022],[-.019,.091,0,.055,.015],[-.054,.146,0,.032,.009],[-.091,.183,0,.013,.004],[-.103,.187,0,0,0]],low,sharkPaint,true);
  marineFin(g,[[-.23,.022,0,.040,.012],[-.256,.053,0,.029,.008],[-.282,.081,0,.012,.004],[-.296,.084,0,0,0]],low,sharkPaint,true);
  marineFin(g,[[-.25,-.020,0,.031,.010],[-.278,-.045,0,.022,.007],[-.307,-.068,0,0,0]],low,sharkPaint,true);
  // A single smooth caudal surface spans both lobes. Its longer upper lobe
  // continues the peduncle; there is no stacked pair of disconnected triangles.
  marineFin(g,[[-.492,-.125,0,0,0],[-.466,-.085,0,.017,.004],[-.425,-.035,0,.029,.009],[-.393,.007,0,.032,.014],[-.418,.077,0,.031,.010],[-.462,.150,0,.023,.006],[-.500,.205,0,0,0]],low,sharkPaint,true);
  eyes(g,sharkRows,.423,.004,.0044,low,.18);
  g.tag=1;
 }
 return {whale,blueWhale,shark,sharkRows};
})();
faunaArt.builders.blue_whale=pelagicArt.blueWhale;
faunaArt.builders.whale_shark=pelagicArt.shark;
const pelagicEntries=[
 {id:'blue_whale',name:'藍鯨',latin:'Balaenoptera musculus',en:'BLUE WHALE',size:26,color:0x63818b,cetacean:true,renderKind:9,naturalSize:'本作代表個體全長 26 m',hint:'二十六公尺的灰藍身軀、斑駁背部、小背鰭與寬大的水平尾鰭。',habitat:'外海大陸坡 · 上層開放水域',detail:'藍鯨是現存最大的動物，以磷蝦為主要食物。在外海大陸坡上方的開放水域尋找牠；這裡只有一隻緩慢巡游的代表個體，遠離淺礁與入水區。',source:'https://www.fisheries.noaa.gov/species/blue-whale',sourceLabel:'NOAA Fisheries · Blue Whale',motionProfile:{cruiseSpeed:1.7,beat:.58,surfacePeriod:150,depthSwing:3},materialProfile:{skin:'cetacean',roughness:.52,subsurface:.06,patternScale:110},traits:{motion:'cetacean',observeDistance:65,contactDistance:3,targetRadius:6.5,viewDistance:24},aquarium:{cost:100}},
 {id:'whale_shark',name:'鯨鯊',latin:'Rhincodon typus',en:'WHALE SHARK',size:8.5,color:0x526f73,renderKind:12,naturalSize:'本作代表個體全長 8.5 m',hint:'寬平頭部、前端大嘴、點線斑紋，以及上下擺幅不同的垂直尾鰭。',habitat:'暖水外礁與大陸坡 · 上層水域',detail:'鯨鯊是暖水海域的濾食性鯊魚，也是現存最大的魚類。牠會在浮游生物豐富的外礁與開放水域覓食；本作兩隻個體分散在不同的外海走廊，尾鰭左右擺動。',source:'https://www.fisheries.noaa.gov/species/whale-shark',sourceLabel:'NOAA Fisheries · Whale Shark',motionProfile:{cruiseSpeed:.85,beat:.8,surfacePeriod:1e9,depthSwing:.65},materialProfile:{skin:'fish',roughness:.63,subsurface:.06,patternScale:120},traits:{motion:'pelagic',observeDistance:35,contactDistance:2,targetRadius:2.4,viewDistance:10},aquarium:{cost:100}}
];
for(const entry of pelagicEntries){
 const sp=registerFauna({...entry,pelagic:true,zone:7,bodyLength:1,traits:{micro:false,feedable:false,grabbable:false,...entry.traits}},PELAGIC_SPECIES);
 if(sp.id==='blue_whale'){cetaceanArt.definitions.blue_whale=pelagicArt.whale;sp.thumb=cetaceanArt.thumbnail(sp);}
 else sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#0a303a"/><path d="M43 108Q41 72 111 72L226 89 300 104 351 53 326 113 351 162 297 123 183 141 94 139Q45 135 43 108Z" fill="#526f73"/><path d="M186 90L219 45 227 94M132 129L197 177 185 133" fill="#415e63"/><g fill="#ccd5c9">'+Array.from({length:30},(_,i)=>'<circle cx="'+(70+i%10*19)+'" cy="'+(89+Math.floor(i/10)*16)+'" r="2.6"/>').join('')+'<circle cx="62" cy="99" r="3" fill="#10292e"/></g><path d="M45 117L65 121" stroke="#183d43" stroke-width="2"/><text x="20" y="192" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">WHALE SHARK · ORIGINAL MODEL</text></svg>');
}
const PelagicWorldRules={
 // Large filter feeders occupy separate offshore corridors. Their complete
 // loops stay beyond the introductory reef and its longest viewing distance.
 blue_whale:{homes:[[535,-38,-205]],radius:92,phases:[1.1]},
 whale_shark:{homes:[[390,-17,35],[650,-24,85]],radius:42,phases:[2.2,.85]}
};
const spawnBeforePelagic=addLife;
addLife=function(renderer){
 spawnBeforePelagic(renderer);
 for(const sp of PELAGIC_SPECIES){
  const high=faunaGeometry(sp),low=faunaGeometry(sp,true),def=PelagicWorldRules[sp.id],actors=[],index=SPECIES.indexOf(sp);
  for(const [k,position] of def.homes.entries()){
   const home=position.slice(),phase=def.phases[k],f={fauna:true,pelagic:true,species:index,p:home.slice(),home,center:home.slice(),homeYaw:0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],yaw:0,pitch:0,phase,orbit:phase,radius:def.radius,height:0,speed:sp.motionProfile.cruiseSpeed,bob:phase,retreat:0,faunaVisibility:1,tint:[1,1,1]};
   pelagicMotionPose(f,0);actors.push(f);life.push(f);
  }
  const hi=renderer.batch(high,actors,sp.renderKind,true);hi.maxDistance=sp.size*3;
  const lo=renderer.batch(low,actors,sp.renderKind,true);lo.minDistance=hi.maxDistance;lo.maxDistance=320;lo.shadow=false;
 }
 allLife=life.concat(decorLife);
};
// Broad animals need an authored, continuously clear corridor. Reusing small
// cetacean obstacle detours can switch candidate rocks as spatial buckets change,
// making a giant whale jump across the reef. These offshore corridors were
// checked with the entire animal's conservative body and animation envelope.
function pelagicMotionPose(f,time,out=f.p,context=null){
 if(context?.exhibit)return cetaceanMotionPose(f,time,out,context);
 const sp=SPECIES[f.species],home=f.home||f.center,radius=f.radius,omega=sp.motionProfile.cruiseSpeed/radius,a=time*omega+f.phase,bob=sp.id==='blue_whale'?3.5:1.4;
 out[0]=home[0]+Math.cos(a)*radius;out[2]=home[2]+Math.sin(a)*radius*.72;out[1]=home[1]+Math.sin(time*.061+f.phase)*bob;
 const dx=-Math.sin(a)*radius*omega,dz=Math.cos(a)*radius*.72*omega,dy=Math.cos(time*.061+f.phase)*bob*.061;
 f.yaw=Math.atan2(-dz,dx);f.pitch=Math.atan2(dy,Math.hypot(dx,dz));f.bank=0;f.effort=.65;f.cetaceanBeat=sp.motionProfile.beat;f.partnerFinPulse=0;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const faunaPoseBeforePelagic=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){
 if(SPECIES[f.species]?.pelagic)return pelagicMotionPose(f,time,out,context);
 return faunaPoseBeforePelagic(f,time,out,context);
};
