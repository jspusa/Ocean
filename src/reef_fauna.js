/* Four original reef fish: shared instancing, species-specific anatomy and
 * pigment, bounded warm-water encounters. References: REEF-FISH-REFERENCE.md.
 * Counts/routes are authored game content, never field-sighting records. */
const REEF_FISH_SPECIES=[];
const ReefFishArt=(()=>{
 const cream=[.88,.86,.75],ink=[.035,.045,.052],orange=[.90,.37,.11],gold=[.96,.72,.13],white=[.89,.88,.78],red=[.71,.18,.13];
 const forms={
  lyretail_anthias:{height:.145,width:.071,tail:.155,fork:true,color:orange,anchor:[-24,-23],heightAbove:2.7,radius:2.9,count:28,speed:.18},
  banggai_cardinal:{height:.18,width:.075,tail:.19,fork:true,color:cream,anchor:[16,10],heightAbove:.95,radius:.38,count:14,speed:.035},
  longnose_butterfly:{height:.235,width:.055,tail:.145,fork:false,color:gold,anchor:[25,-25],heightAbove:2.8,radius:2.1,count:8,speed:.14},
  fire_goby:{height:.075,width:.049,tail:.095,fork:false,color:white,anchor:[-4,20],heightAbove:.36,radius:.26,count:14,speed:.024}
 };
 function paint(id,p){
  const [x,y,z]=p;
  if(id==='lyretail_anthias'){const belly=clamp((.035-y)/.22,0,1);return orange.map((v,i)=>mix(v,[.96,.67,.31][i],belly*.65));}
  if(id==='banggai_cardinal'){
   const band=Math.min(Math.abs(x-.225+y*.08),Math.abs(x-.018),Math.abs(x+.215-y*.11));
   const spot=Math.sin(x*116+y*29)*Math.sin(y*127-z*21)>.79;
   return band<.047&&!spot?ink:cream;
  }
  if(id==='longnose_butterfly'){if(x>.17)return y>.005?ink:white;return gold;}
  const rear=clamp((.16-x)/.42,0,1);return white.map((v,i)=>mix(v,red[i],rear));
 }
 function body(g,id,low){
  const f=forms[id],segments=low?18:40,rings=low?11:24;g.tag=1;
  faunaArt.ellipsoid(g,[.015,0,0],[.36,f.height,f.width],p=>paint(id,p),segments,rings);
  faunaArt.ellipsoid(g,[-.337,-.002,0],[.095,f.height*.30,f.width*.36],p=>paint(id,p),low?10:20,low?7:12);
  if(id==='longnose_butterfly'){
   // Forceps-like jaws extend from the compact head, rather than stretching
   // the whole fish. The lower face and beak stay pale below a black forehead.
   faunaArt.tube(g,[[.28,-.025,0],[.39,-.038,0],[.54,-.044,0],[.625,-.045,0]],t=>.039*(1-t*.69),white,low?10:18);
   faunaArt.ellipsoid(g,[.624,-.045,0],[.012,.012,.015],ink,low?8:14,low?5:8);
  }else faunaArt.ellipsoid(g,[.333,-.015,0],[.049,.035,.042],p=>paint(id,p),low?10:20,low?7:12);
  for(const side of [-1,1]){
   const x=id==='longnose_butterfly'?.254:.26,y=id==='longnose_butterfly'?.048:.035;
   const width=f.width*Math.sqrt(Math.max(0,1-((x-.015)/.36)**2-(y/f.height)**2));
   faunaArt.eye(g,[x,y,side*(width+.002)],id==='fire_goby'?.017:.019,low);
  }
 }
 function fin(g,root,edge,color,thickness=.0018){g.tag=3;faunaArt.fin(g,root,edge,color,thickness);}
 function fins(g,id,low){
  const f=forms[id],h=f.height,n=low?8:18,root=[],edge=[];
  for(let k=0;k<=n;k++){const u=k/n,v=u*2-1;root.push([-.405,v*.027,0]);edge.push([f.fork?-.665+.155*(1-Math.abs(v)):-.57-.073*Math.sqrt(Math.max(0,1-v*v)),v*f.tail,0]);}
  fin(g,root,edge,id==='banggai_cardinal'?(i=>i%3===0?cream:ink):id==='fire_goby'?red:forms[id].color);
  const top=(x)=>h*Math.sqrt(Math.max(0,1-((x-.015)/.36)**2))*.94;
  if(id==='banggai_cardinal'){
   // Separate tall first dorsal and swept second dorsal/anal retain its
   // recognisable cardinalfish outline even when body colour is not resolved.
   const xs=[.20,.12,.035,-.025],ys=[top(.20),top(.12),top(.035),top(-.025)];
   fin(g,xs.map((x,i)=>[x,ys[i],0]),[[.20,ys[0],0],[.125,.395,0],[.02,.315,0],[-.025,ys[3],0]],ink);
   fin(g,[[-.04,top(-.04),0],[-.14,top(-.14),0],[-.27,top(-.27),0],[-.32,top(-.32),0]],[[-.04,.20,0],[-.12,.34,0],[-.34,.235,0],[-.32,top(-.32),0]],cream);
   fin(g,[[.015,-h*.95,0],[-.11,-h*.90,0],[-.26,-h*.55,0]],[[.015,-h*.95,0],[-.14,-.325,0],[-.345,-.205,0]],ink);
   faunaArt.tube(g,[[.125,.395,0],[.08,.445,0],[.012,.46,0]],t=>.0048*(1-t*.55),cream,low?5:8);
   if(!low)for(const side of [-1,1])for(const [x,y]of [[-.22,.06],[-.22,-.045],[.02,.08],[.02,-.07],[.22,-.035]]){
    const z=side*f.width*Math.sqrt(Math.max(0,1-((x-.015)/.36)**2-(y/h)**2));g.tag=1;faunaArt.ellipsoid(g,[x,y,z],[.009,.010,.0015],white,8,5);
   }
  }else{
   const upper=[],upperEdge=[],lower=[],lowerEdge=[];
   for(let k=0;k<=n;k++){const u=k/n,x=.245-u*.55,rise=Math.sin(Math.PI*u),y=top(x);upper.push([x,y,0]);lower.push([x,-y,0]);
    upperEdge.push([x,y+rise*h*(id==='longnose_butterfly'?.45:.39),0]);lowerEdge.push([x,-y-rise*h*.24,0]);}
   fin(g,upper,upperEdge,id==='fire_goby'?white:forms[id].color);fin(g,lower,lowerEdge,id==='fire_goby'?red:forms[id].color);
   if(id==='lyretail_anthias'){
    // A slender, swept third dorsal ray, not the long banner of a Moorish idol.
    faunaArt.tube(g,[[.12,top(.12),0],[.095,.267,0],[.033,.29,0]],t=>.0045*(1-t*.72),[.91,.48,.36],low?5:8);
   }
   if(id==='fire_goby')fin(g,[[.215,top(.215),0],[.10,top(.10),0],[.035,top(.035),0]],[[.215,top(.215),0],[.105,.37,0],[.035,top(.035),0]],white,.0013);
   if(id==='longnose_butterfly'){
    // The black anal-fin spot is behind/below the body, not a false eye.
    for(const side of [-1,1]){g.tag=3;faunaArt.ellipsoid(g,[-.205,-.185,side*.003],[.034,.033,.0017],ink,low?10:18,low?7:12);}
   }
  }
  for(const side of [-1,1]){
   fin(g,[[.16,-h*.15,side*f.width*.83],[.055,-h*.36,side*f.width*.94]],[[.07,-h*.80,side*f.width*1.65],[-.07,-h*.60,side*f.width*1.75]],id==='banggai_cardinal'?cream:forms[id].color);
   fin(g,[[.08,-h*.90,side*f.width*.35],[-.015,-h*.94,side*f.width*.35]],[[.015,-h*1.36,side*f.width*.64],[-.11,-h*1.15,side*f.width*.65]],id==='banggai_cardinal'?ink:forms[id].color);
  }
 }
 function build(id,g,low){g.material=6;body(g,id,low);fins(g,id,low);g.tag=1;}
 function thumbnail(sp){
  const id=sp.id,f=forms[id],fill='#'+sp.color.toString(16).padStart(6,'0'),round=!f.fork;
  const details=id==='banggai_cardinal'?'<path d="M147 78L160 136M189 67L195 146M224 73L229 139" stroke="#24383b" stroke-width="13"/><path d="M169 73L178 25 201 70M208 74L230 36 257 79M204 139L232 174 246 130" fill="#d5d4bf" stroke="#304548" stroke-width="3"/>':id==='fire_goby'?'<path d="M173 94L179 27 196 89" fill="#e8e3cb"/><path d="M229 89Q256 94 269 111L243 137 215 144Z" fill="#b83b2d"/>':id==='longnose_butterfly'?'<path d="M129 100L75 110 128 117Z" fill="#e9e3c8"/><path d="M129 100Q137 67 161 71L159 111Z" fill="#21373b"/><circle cx="236" cy="139" r="9" fill="#253a3a"/>':'<path d="M182 78L195 52 201 77" fill="#df8860"/>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210"><rect width="420" height="210" fill="#0a303a"/><path d="M271 109L325 72'+(round?'Q342 111 325 150':'L300 112 325 150')+'L265 127Z" fill="'+fill+'"/><ellipse cx="197" cy="109" rx="76" ry="'+(id==='longnose_butterfly'?54:id==='fire_goby'?28:42)+'" fill="'+fill+'"/>'+details+'<circle cx="144" cy="103" r="7" fill="#ebdfb6"/><circle cx="143" cy="103" r="4" fill="#1b3035"/><text x="20" y="192" font-family="sans-serif" font-size="10" letter-spacing="1" fill="#92b4b6">'+sp.en+' · ORIGINAL ART</text></svg>');
 }
 return {forms,paint,build,thumbnail};
})();
const reefFishEntries=[
 {id:'lyretail_anthias',name:'金背花鱸',latin:'Pseudanthias squamipinnis · 類群造型',en:'LYRETAIL ANTHIAS',color:0xe69638,size:.15,hint:'橙金色的側身、月形叉尾與稍長的背鰭棘。',detail:'花鱸類常在礁坡上方聚集、捕食浮游動物。本作用橙金色的原創造型與小群路徑呈現；分類與分布存在研究差異，不作臺灣現地紀錄或性別辨識依據。',source:'https://australian.museum/learn/animals/fishes/orange-basslet-pseudanthias-squamipinnis/'},
 {id:'banggai_cardinal',name:'邦蓋天竺鯛',latin:'Pterapogon kauderni',en:'BANGGAI CARDINALFISH',color:0xd9d5bf,size:.086,hint:'銀白身體的三道黑帶、白色小點、深叉尾與延長鰭條。',detail:'邦蓋天竺鯛原生於印尼邦蓋群島附近，常見於受遮蔽的淺水棲地。這裡的群體是歸潮海域的原創展示配置，不代表牠廣泛分布在其他礁區。',source:'https://www.fisheries.noaa.gov/species/banggai-cardinalfish'},
 {id:'longnose_butterfly',name:'長吻蝶魚',latin:'Forcipiger flavissimus',en:'YELLOW LONGNOSE BUTTERFLYFISH',color:0xf2c044,size:.20,hint:'薄薄的黃色側身、鑷子般長吻、黑白頭部及臀鰭黑斑。',detail:'長吻可以伸入礁縫取食小型無脊椎動物。靠近觀察時，留意黑色上半頭、白色下半頭，以及尾柄前下方的黑斑；模型與遭遇路線為原創遊戲近似。',source:'https://australian.museum/learn/animals/fishes/forceps-fish-forcipiger-flavissimus/'},
 {id:'fire_goby',name:'雷達魚',latin:'Nemateleotris magnifica',en:'FIRE GOBY',color:0xe6d6bf,size:.08,hint:'白色前身逐漸轉成橙紅後身，第一背鰭像細長旗幟，尾鰭圓潤。',detail:'雷達魚會在礁坡洞口上方懸停，受到驚擾時可退入洞中。這一版呈現洞口附近的小幅巡游與特長第一背鰭；群數與高度是遊戲編排。',source:'https://australian.museum/learn/animals/fishes/nemateleotris-magnifica-fowler-1938/'}
];
for(const entry of reefFishEntries){
 faunaArt.builders[entry.id]=(g,low)=>ReefFishArt.build(entry.id,g,low);
 const sp=registerFauna({...entry,reefFish:true,zone:0,renderKind:1,bodyLength:1,naturalSize:'本作代表個體全長 '+Math.round(entry.size*1000)+' mm',traits:{motion:'swim',micro:false,feedable:true,contactDistance:1.2,observeDistance:5,targetRadius:entry.size*.60,viewDistance:Math.max(.6,entry.size*5.5)},materialProfile:{skin:'fish',roughness:.43,subsurface:.035,patternScale:100}},REEF_FISH_SPECIES);sp.thumb=ReefFishArt.thumbnail(sp);
}
const reefFishPaths=new WeakMap();
function reefFishRadius(f){
 const home=f.home||f.center,sp=SPECIES[f.species],size=f.s[0],cached=reefFishPaths.get(f);
 if(cached&&cached.size===size&&cached.requested===f.radius&&cached.obstacles===obstacles.length&&cached.home[0]===home[0]&&cached.home[1]===home[1]&&cached.home[2]===home[2])return cached.radius;
 const bounds=sp.modelBounds,reach=size*Math.hypot(Math.max(Math.abs(bounds.min[0]),Math.abs(bounds.max[0])),Math.max(Math.abs(bounds.min[2]),Math.abs(bounds.max[2])))+.08,vertical=size*Math.max(Math.abs(bounds.min[1]),Math.abs(bounds.max[1]))+.12;
 let radius=f.radius;
 // Reserve a complete route envelope once. A moving candidate obstacle must
 // never make a small fish jump vertically as it crosses a bucket boundary.
 for(const ob of obstacles){if(ob.p[1]+ob.s[1]<home[1]-vertical||ob.p[1]-ob.s[1]>home[1]+vertical)continue;radius=Math.min(radius,Math.max(0,Math.hypot(home[0]-ob.p[0],home[2]-ob.p[2])-Math.max(ob.s[0],ob.s[2])-reach));}
 reefFishPaths.set(f,{home:home.slice(),size,requested:f.radius,obstacles:obstacles.length,radius});return radius;
}
function reefFishMotionPose(f,time,out=f.p,context=null){
 const sp=SPECIES[f.species],form=ReefFishArt.forms[sp.id],home=f.home||f.center,radius=context?.exhibit?Math.min(f.radius,sp.size*2):reefFishRadius(f),omega=form.speed/Math.max(.1,radius),a=time*omega+f.phase,c=Math.cos(a),s=Math.sin(a),c2=Math.cos(a*.73+f.phase*.2),s2=Math.sin(a*.73+f.phase*.2);
 out[0]=home[0]+c*radius;out[2]=home[2]+s2*radius*.58;out[1]=home[1]+Math.sin(a*.63)*Math.min(.16,sp.size*.36);
 if(!context?.exhibit)out[1]=Math.max(out[1],groundHeight(out[0],out[2])+form.heightAbove*.55+sp.size*.25);
 const dx=-s*radius*omega,dz=c2*radius*.58*.73*omega,dy=Math.cos(a*.63)*Math.min(.16,sp.size*.36)*.63*omega;
 f.yaw=Math.atan2(-dz,dx);f.pitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.12,.12);f.bank=Math.sin(a*.51)*.045;f.effort=.48;f.faunaVisibility=1;f.faunaVisible=true;f.retreat=0;f.faunaTime=time;return out;
}
const poseBeforeReefFish=faunaMotionPose;
faunaMotionPose=function(f,time,out=f.p,context=null){return SPECIES[f.species]?.reefFish?reefFishMotionPose(f,time,out,context):poseBeforeReefFish(f,time,out,context);};
const spawnBeforeReefFish=addLife;
addLife=function(renderer){
 spawnBeforeReefFish(renderer);
 ensureReefFish(renderer);
};
// The published geometry archive stays compatible: a small, shared model pool
// is appended at boot. A future full bake may already contain these same actors.
function ensureReefFish(renderer){
 if(life.some(f=>f.reefFish||SPECIES[f.species]?.reefFish))return false;
 for(const sp of REEF_FISH_SPECIES){const form=ReefFishArt.forms[sp.id],high=faunaGeometry(sp),low=faunaGeometry(sp,true),actors=[],index=SPECIES.indexOf(sp);
  for(let k=0;k<form.count;k++){const base=FaunaWorldRules.place({anchor:form.anchor,support:null},k),home=[base[0],base[1]+form.heightAbove,base[2]],phase=k*2.399963+.37;
   const f={fauna:true,reefFish:true,species:index,p:home.slice(),home,center:home.slice(),homeYaw:0,modelCenter:high.modelBounds.min.map((v,i)=>(v+high.modelBounds.max[i])*.5),s:[sp.size,sp.size,sp.size],radius:form.radius,height:form.heightAbove,phase,orbit:phase,bob:phase,speed:form.speed,yaw:0,pitch:0,retreat:0,faunaVisibility:1,tint:[1,1,1]};reefFishMotionPose(f,0);actors.push(f);life.push(f);
  }
  const hi=renderer.batch(high,actors,1,true);hi.maxDistance=8;hi.sceneRole='reef-fish-expansion';
  const lo=renderer.batch(low,actors,1,true);lo.minDistance=8;lo.maxDistance=70;lo.shadow=false;lo.sceneRole='reef-fish-expansion';
 }
 allLife=life.concat(decorLife);
 return true;
}
