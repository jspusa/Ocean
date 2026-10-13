/* Original deep-water catalogue. Biology/measurement references are in
 * docs/parity/ABYSS-FAUNA-REFERENCE.md. +X anterior, +Y up, Z lateral.
 * kind 10: tag1 body, tag3 fin, tag4 eye, tag5 limb/lure, tag6 luminous tip. */
const ABYSS_SPECIES=[];
const abyssArt=(()=>{
 const dark=[.024,.032,.039],ivory=[.70,.73,.63],blend=cetaceanArt.blend,soft=cetaceanArt.soft;
 const tube=faunaArt.tube,curve=faunaArt.curvePoints,fin=faunaArt.fin;
 function ellipsoid(g,c,r,color,low,detail=1){cetaceanArt.skin(g,(u,v)=>{const a=u*Math.PI,b=v*TAU;return [c[0]+Math.cos(a)*r[0],c[1]+Math.sin(a)*Math.cos(b)*r[1],c[2]+Math.sin(a)*Math.sin(b)*r[2]];},Math.round((low?10:18)*detail),Math.round((low?14:28)*detail),color);}
 function body(g,rows,color,low){cetaceanArt.skin(g,(u,v)=>{const [x,y,ry,rz]=cetaceanArt.profileAt(rows,mix(rows[0][0],rows.at(-1)[0],u)),a=v*TAU;return [x,y+Math.cos(a)*ry,Math.sin(a)*rz];},low?30:64,low?16:32,color);}
 function eye(g,p,r,low,pupil=.72){const tag=g.tag;g.tag=4;ellipsoid(g,p,[r,r*.86,r*.48],[.39,.43,.40],low,.65);ellipsoid(g,[p[0]+r*.16,p[1],p[2]+Math.sign(p[2])*r*.35],[r*pupil,r*pupil*.9,r*.24],dark,low,.55);g.tag=tag;}
 function tagged(g,tag,run){const old=g.tag;g.tag=tag;run();g.tag=old;}
 function coelacanth(g,low){
  const blue=[.17,.27,.32],pale=[.43,.51,.49],rows=[[-.36,0,0,0],[-.29,0,.050,.035],[-.18,0,.080,.061],[-.04,0,.117,.097],[.12,.002,.140,.116],[.26,.011,.124,.110],[.39,.005,.093,.083],[.47,-.012,.043,.054],[.49,-.021,0,0]];
  const paint=p=>{const mottled=Math.sin(p[0]*103+Math.sin(p[1]*57))*Math.sin(p[2]*109+Math.sin(p[0]*71))*Math.sin(p[1]*121+p[2]*41),scales=Math.sin(p[0]*215+Math.sin(p[1]*146)*.45)*Math.sin(p[1]*146+p[2]*43);return blend(blue,pale,soft(.27,.78,mottled)*.53+(1-soft(-.13,-.025,p[1]))*.12+scales*.018);};body(g,rows,paint,low);
  for(const side of [-1,1]){eye(g,[.353,.041,side*.091],.021,low);tube(g,curve([[.472,-.029,side*.025],[.414,-.034,side*.063],[.342,-.027,side*.093]],low?2:4),.003,dark,low?5:7);
   tube(g,curve([[.237,.093,side*.066],[.188,.057,side*.111],[.175,-.030,side*.116],[.199,-.091,side*.080]],low?2:4),.0028,[.11,.19,.23],low?5:7);
   tagged(g,3,()=>{for(const [x,y,z,span] of [[.18,-.07,.100,.165],[-.115,-.07,.056,.14]]){const root=[x,y,side*z],wrist=[x-.065,y-.028,side*(z+span*.46)],tip=[x-.125,y-.01,side*(z+span)];tube(g,curve([root,wrist,tip],low?2:3),t=>.023*(1-t*.64),blue,low?7:10);const a=[],b=[];for(let i=0;i<=8;i++){const t=i/8;a.push(V.lerp(wrist,tip,t));b.push([mix(wrist[0]+.02,tip[0]-.025,t),y-.008-Math.sin(t*Math.PI)*.06,side*(z+span*.54+t*span*.52)]);}fin(g,a,b,blue,.003);if(!low)for(let i=0;i<a.length;i++)tube(g,[a[i],b[i]],.0017,pale,4);}});
  }
  tagged(g,3,()=>{
   const a=[],b=[];for(let i=0;i<8;i++){const u=i/7,x=.20-u*.25;a.push([x,.125-.03*u,0]);b.push([x-.028,.165+.065*Math.sin(u*Math.PI),0]);}fin(g,a,b,blue,.004);for(let i=0;i<8;i++)tube(g,[a[i],b[i]],.0025,pale,low?4:5);
   for(const side of [-1,1]){const a=curve([[-.14,side*.069,0],[-.21,side*.070,0],[-.29,side*.038,0]],low?2:4),b=curve([[-.14,side*.165,0],[-.24,side*.178,0],[-.32,side*.063,0]],low?2:4).map(p=>[clamp(p[0],-.32,-.14),side*Math.min(.178,Math.abs(p[1])),0]);fin(g,a,b,blue,.004);if(!low)for(let i=1;i<b.length-1;i++)tube(g,[a[i],V.lerp(a[i],b[i],.98)],.0013,pale,4);}
   // Upper/lower tail fans and a separate projecting central lobe.
   for(const side of [-1,1]){const a=[],b=[];for(let i=0;i<=8;i++){const u=i/8;a.push([-.285-u*.074,side*.025,0]);b.push([-.327-u*.13,side*(.05+.10*Math.sin(u*Math.PI)),0]);}fin(g,a,b,blue,.005);if(!low)for(let i=0;i<a.length;i++)tube(g,[a[i],b[i]],.002,pale,4);}
   fin(g,[[-.33,-.029,0],[-.355,0,0],[-.33,.029,0]],[[-.482,-.032,0],[-.510,0,0],[-.482,.032,0]],blue,.004);
  });
 }
 function squid(g,low){
  const russet=[.40,.13,.14],rose=[.62,.31,.29],paint=p=>{const mottled=Math.sin(p[0]*183+p[2]*89)*Math.sin(p[1]*213-p[2]*141);return blend(russet,rose,.2+.32*(1-soft(-.045,.04,p[1]))+.06*Math.sin(p[0]*53+p[2]*61)+soft(.2,.85,mottled)*.12);};
  body(g,[[-.5,0,0,0],[-.46,0,.019,.021],[-.38,0,.044,.050],[-.29,0,.050,.056],[-.232,0,.043,.045],[-.218,0,0,0]],paint,low);
  ellipsoid(g,[-.197,0,0],[.052,.041,.049],paint,low,.75);
  for(const side of [-1,1]){eye(g,[-.184,.002,side*.045],.018,low,.87);tagged(g,3,()=>fin(g,[[-.480,0,side*.012],[-.429,0,side*.031],[-.363,0,side*.050]],[[-.464,.007,side*.037],[-.422,.012,side*.088],[-.363,0,side*.052]],russet,.002));}
  // Eight muscular arms carry suckers along their inner face. Two additional
  // narrow feeding tentacles have smooth shafts and terminal sucker clubs.
  tagged(g,5,()=>{for(let i=0;i<8;i++){const a=i/8*TAU,cy=Math.cos(a),sz=Math.sin(a),pts=curve([[-.16,cy*.025,sz*.037],[-.09,cy*.041,sz*.056],[.02,cy*.073,sz*.100],[.11+(i%2)*.025,cy*.050,sz*.079]],low?2:4);tube(g,pts,t=>.0105*(1-t*.88),t=>blend(rose,russet,t*.5),low?6:9);if(!low)for(let j=0;j<5;j++){const t=.13+j*.16,c=pts[Math.round(t*(pts.length-1))];ellipsoid(g,[c[0],c[1]-cy*.007,c[2]-sz*.007],[.0033,.0028,.0033],[.66,.44,.38],true,.5);}}
   for(const side of [-1,1]){const pts=curve([[-.16,-.007,side*.018],[-.005,-.023,side*.055],[.22,-.006,side*.070],[.43,.015,side*.063]],low?2:4);tube(g,pts,t=>.0035-.001*t,rose,low?5:8);ellipsoid(g,[.463,.017,side*.061],[.037,.010,.013],rose,low,.65);tube(g,curve([[.482,.017,side*.061],[.495,.013,side*.055],[.500,.008,side*.052]],low?1:3),t=>.004*(1-t*.85),rose,low?5:7);for(let j=0;j<(low?3:6);j++)ellipsoid(g,[.436+j*(low?.020:.010),.008,side*.061],[.0032,.0022,.0032],ivory,true,.5);}
  });
  // Ventral funnel is an actual short tube below the eye-bearing head.
  tube(g,[[-.223,-.022,0],[-.192,-.051,0],[-.164,-.049,0]],t=>.010-t*.003,rose,low?7:10);
 }
 function funnel(g,back,depth,ry,rz,color,low,neck){
  // Open at the anterior rim: the viewer can see the recessed oral cavity.
  for(const inside of [false,true]){const begin=g.v.length,k=inside?.985:1;cetaceanArt.skin(g,(u,v)=>{const a=v*TAU,r=inside?Math.sin(u*Math.PI*.5):mix(neck,1,Math.sin(u*Math.PI*.5));return [back[0]+u*depth,back[1]+Math.cos(a)*ry*r*k,Math.sin(a)*rz*r*k];},low?9:16,low?20:36,inside?[.065,.025,.032]:color);
   if(inside)for(let i=begin;i<g.v.length;i+=36){const b=g.v.slice(i+12,i+24),c=g.v.slice(i+24,i+36);g.v.splice(i+12,24,...c,...b);for(const j of [0,12,24])for(let n=3;n<6;n++)g.v[i+j+n]*=-1;}
  }
 }
 function pelican(g,low){
  const skin=[.036,.046,.058];tube(g,curve([[-.506,-.014,0],[-.38,.006,.003],[-.20,-.006,0],[.035,-.012,0],[.17,-.018,0]],low?5:10),t=>.0025+.024*t*t,skin,low?8:12);
  // Distensible bag attaches to a narrow trunk, with a broad open jaw rim.
  funnel(g,[.17,-.019,0],.293,.141,.134,skin,low,.19);
  const rim=Array.from({length:(low?22:40)+1},(_,i)=>{const a=i/(low?22:40)*TAU;return [.463,-.019+Math.cos(a)*.141,Math.sin(a)*.134];});tube(g,rim,.006,[.078,.086,.099],low?6:9);
  for(const side of [-1,1]){ellipsoid(g,[.392,.111,side*.076],[.059,.017,.025],skin,low,.6);eye(g,[.428,.121,side*.079],.007,low);}
  tagged(g,3,()=>{const a=[],b=[];for(let i=0;i<=20;i++){const t=i/20,x=-.45+t*.6,y=.006+Math.sin(t*Math.PI)*.005;a.push([x,y,0]);b.push([x,y+.008+.015*Math.sin(t*Math.PI),0]);}fin(g,a,b,[.12,.13,.14],.001);});
  // Several inconspicuous small teeth; not the enormous fangs of an anglerfish.
  for(const side of [-1,1])for(let i=0;i<(low?5:9);i++){const a=(i+.5)/(low?5:9)*Math.PI,z=Math.cos(a)*.117,y=-.019+side*Math.sin(a)*.133;tube(g,[[.466,y,z],[.454,y-side*.009,z*.96]],t=>.0018*(1-t*.83),ivory,4);}
  tagged(g,6,()=>ellipsoid(g,[-.506,-.014,0],[.006,.004,.004],[.48,.66,.52],low,.5));
 }
 function angler(g,low){
  const charcoal=[.082,.071,.067],paint=p=>blend(charcoal,[.17,.13,.105],.12+.18*(1-soft(-.22,.15,p[1]))+.12*Math.sin(p[0]*83)*Math.sin(p[2]*109));
  body(g,[[-.43,0,0,0],[-.31,-.025,.043,.047],[-.20,-.025,.158,.150],[-.08,-.015,.237,.218],[.06,-.018,.245,.222],[.19,-.019,.221,.204],[.29,-.035,.180,.169],[.30,-.035,.178,.169]],paint,low);
  // Broad cheeks continue to an open ring just behind the lip. The old head
  // closed before the mouth, leaving the exposed oral surface like a nozzle.
  cetaceanArt.skin(g,(u,v)=>{const a=v*TAU;return [mix(.29,.421,u),mix(-.035,-.033,u)+Math.cos(a)*mix(.180,.167,u),Math.sin(a)*mix(.169,.170,u)];},low?5:10,low?16:32,paint);
  // Mouth cavity starts ahead of the head shell so it stays genuinely open.
  funnel(g,[.278,-.033,0],.153,.167,.170,charcoal,low,.82);const rim=Array.from({length:(low?24:40)+1},(_,i)=>{const a=i/(low?24:40)*TAU;return [.431,-.033+Math.cos(a)*.167,Math.sin(a)*.170];});tube(g,rim,.012,[.19,.14,.10],low?7:10);
  for(const side of [-1,1]){eye(g,[.21,.143,side*.147],.024,low);tagged(g,3,()=>fin(g,[[.0,-.015,side*.205],[-.04,-.09,side*.197],[-.10,-.12,side*.18]],[[.005,-.07,side*.315],[-.055,-.145,side*.32],[-.15,-.18,side*.26]],[.16,.11,.078],.005));}
  tagged(g,3,()=>{fin(g,[[-.31,-.021,0],[-.36,.01,0],[-.31,.047,0]],[[-.545,-.13,0],[-.57,.015,0],[-.535,.145,0]],[.19,.14,.092],.005);fin(g,[[-.25,.07,0],[-.14,.188,0],[-.04,.226,0]],[[-.31,.18,0],[-.19,.263,0],[-.04,.26,0]],charcoal,.004);});
  for(const side of [-1,1])for(let i=0;i<(low?9:15);i++){const a=(i+.5)/(low?9:15)*Math.PI,z=Math.cos(a)*.158,y=-.033+side*Math.sin(a)*.154,len=.033+.055*Math.sin(a);tube(g,curve([[.438,y,z],[.435-len*.22,y-side*len*.50,z*.95],[.409,y-side*len,z*.85]],low?1:3),t=>.0055*(1-t*.93),ivory,low?4:6);}
  const stalk=curve([[.075,.21,0],[.085,.38,0],[.21,.48,0],[.35,.47,0],[.404,.394,0]],low?2:4);tagged(g,5,()=>tube(g,stalk,t=>.009*(1-t*.35),[.25,.20,.15],low?6:9));tagged(g,6,()=>ellipsoid(g,[.405,.388,0],[.030,.039,.027],[.57,.76,.70],low,.75));
 }
 function crab(g,low){
  const orange=[.70,.31,.17],cream=[.84,.73,.55],paint=p=>blend(orange,cream,.10+.35*soft(.10,.80,Math.sin(p[0]*213)*Math.sin(p[2]*191)));
  ellipsoid(g,[-.018,.183,0],[.066,.047,.061],paint,low,1);ellipsoid(g,[.04,.171,0],[.038,.029,.041],orange,low,.6);
  for(const side of [-1,1]){tube(g,[[.047,.197,side*.022],[.079,.216,side*.039]],.007,orange,low?5:7);eye(g,[.080,.216,side*.040],.010,low);tube(g,[[.070,.190,side*.010],[.105,.203,side*.014]],t=>.008*(1-t*.94),cream,low?5:7);}
  // Eight walking legs, each a rigid sequence of joints; two anterior
  // chelipeds are separate limbs ending in opposed, curved claw fingers.
  tagged(g,5,()=>{for(const side of [-1,1])for(let i=0;i<4;i++){const x=.19-i*.123,base=[.033-i*.027,.173,side*.048],knee=[x*.55,.245-i*.009,side*(.223+i*.011)],ankle=[x,.098,side*(.422+i*.006)],tip=[x,.003,side*.497];const pts=[base,knee,ankle,tip];for(let j=0;j<3;j++){tube(g,[pts[j],pts[j+1]],t=>(.011-j*.0025)*(1-t*.27),t=>blend(orange,cream,soft(.54,.94,t)*.7),low?6:9);if(j<2)ellipsoid(g,pts[j+1],[.013-j*.002,.013-j*.002,.014-j*.002],cream,low,.45);}}
   for(const side of [-1,1]){const arm=[[.045,.163,side*.039],[.168,.124,side*.17],[.296,.098,side*.23]];tube(g,arm,t=>.013-t*.003,orange,low?6:9);ellipsoid(g,[.318,.102,side*.229],[.043,.019,.023],paint,low,.6);for(const finger of [-1,1])tube(g,curve([[.34,.104,side*.229+finger*.014],[.385,.106,side*.229+finger*.022],[.407,.107,side*.230+finger*.004]],low?2:3),t=>.009*(1-t*.85),cream,low?5:7);}
  });
  for(let i=0;i<(low?7:17);i++){const a=i*2.39996,r=.018+.033*((i*.618)%1),p=[-.018+Math.cos(a)*r,.225-.012*r/.05,Math.sin(a)*r];tube(g,[p,V.add(p,[0,.011+(i%3)*.002,0])],t=>.0045*(1-t*.92),cream,low?4:5);}
 }
 const builders={coelacanth,giant_squid:squid,pelican_eel:pelican,humpback_anglerfish:angler,japanese_spider_crab:crab};
 return {builders,ellipsoid,body,eye,tagged,tube,curve,fin,blend,soft,dark,ivory};
})();
const abyssEntries=[
 {id:'coelacanth',name:'腔棘魚',latin:'Latimeria chalumnae',en:'COELACANTH',size:1.5,color:0x496977,zone:5,naturalSize:'來源列可達約2 m；本模型全長1.5 m',hint:'厚實軀幹、成對肉質葉狀鰭，尾端多出一片中央尾葉。',detail:'腔棘魚具有肉質成對鰭與特殊的三葉尾形；本作採西印度洋種的鋼藍色。場景位置與洞穴巡游是原創配置，不代表自然族群分布。',source:'https://australian.museum/learn/animals/fishes/coelacanth-latimeria-chalumnae-smith-1939/',sourceLabel:'Australian Museum · Coelacanth',traits:{motion:'swim',contactDistance:2.7,observeDistance:20,targetRadius:.42,viewDistance:2.7},motionProfile:{speed:.26,beat:1.7,radius:3.8,bob:.22},aquarium:{cost:3}},
 {id:'giant_squid',name:'巨型烏賊',latin:'Architeuthis dux',en:'GIANT SQUID',size:8,color:0xa45b50,zone:5,naturalSize:'本模型含伸展捕食觸腕全長8 m；博物館館藏個體全長8.62 m',hint:'尖長外套膜、巨大側眼，八條較短腕與兩條末端膨大的長觸腕。',detail:'巨型烏賊的八條腕沿內側排列吸盤；另兩條較細長的捕食觸腕，在末端腕穗集中吸盤。模型使用原創褐紅體色，不使用大王酸漿魷的鉤爪特徵。遊戲深度不等於天然棲息深度。',source:'https://www.nhm.ac.uk/discover/giant-squid.html',sourceLabel:'Natural History Museum · Giant squid',traits:{motion:'swim',contactDistance:8,observeDistance:35,targetRadius:1.1,viewDistance:12.5},motionProfile:{speed:.40,beat:1.3,radius:4.2,bob:.35},aquarium:{cost:7}}
 ,{id:'pelican_eel',name:'吞鰻',latin:'Eurypharynx pelecanoides',en:'PELICAN EEL',size:.75,color:0x1f2835,zone:5,naturalSize:'來源列全長可達80 cm；模型全長75 cm',hint:'小眼睛位在巨大嘴部上方；身體延伸成帶有發光末端的細尾。',detail:'吞鰻也稱 gulper eel，具有可擴張的大口、細小牙齒和鞭狀尾。博物館列出天然棲息深度500–3000 m；本作縮小深淵的配置不是自然深度重現。',source:'https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/',sourceLabel:'Australian Museum · Pelican Eel',traits:{motion:'swim',contactDistance:1.8,observeDistance:12,targetRadius:.17,viewDistance:1.7},motionProfile:{speed:.13,beat:2.1,radius:1.8,bob:.12},aquarium:{cost:2}},
 {id:'humpback_anglerfish',name:'駝背鮟鱇',latin:'Melanocetus johnsonii',en:'HUMPBACK ANGLERFISH',size:.09,color:0x39281d,zone:5,naturalSize:'模型全長9 cm，採MBARI已觀察個體尺度；不是物種最大值',hint:'圓厚身體、向內彎的細長牙齒，頭上釣竿末端發著微光。',detail:'雌性駝背鮟鱇以頭頂誘餌吸引獵物。MBARI於2014年在蒙特雷灣約580 m深處拍到約9 cm個體；本模型以此尺度表現，誘餌亮度與移動軌跡為原創視覺設定。',source:'https://www.mbari.org/news/amazing-black-sea-devil-anglerfish-observed-in-monterey-bay/',sourceLabel:'MBARI · Black sea devil observation',traits:{motion:'hover',micro:true,contactDistance:.8,observeDistance:1.7,targetRadius:.048,viewDistance:.8},motionProfile:{speed:.015,beat:1.6,radius:.25,bob:.018},aquarium:{cost:1}},
 {id:'japanese_spider_crab',name:'日本蜘蛛蟹',latin:'Macrocheira kaempferi',en:'JAPANESE SPIDER CRAB',size:3,measureAxis:2,color:0xc77446,zone:5,naturalSize:'模型左右步足展幅3 m，並非甲殼長；館方資料列足展可達約3.7 m',hint:'小型梨形甲殼、八條細長步足，加上前方兩條帶螯的攝食肢。',detail:'日本蜘蛛蟹靠長而有關節的步足緩慢行走，另兩條螯足可處理食物。模型以3 m展幅與約40 cm甲殼長的比例製作；甲殼、眼柄、步足與成對螯均為原創幾何。',source:'https://www.aquariumofpacific.org/onlinelearningcenter/species/giant_spider_crab',sourceLabel:'Aquarium of the Pacific · Giant Spider Crab',traits:{motion:'crawl',contactDistance:3,observeDistance:20,targetRadius:.75,viewDistance:4.7},motionProfile:{speed:.075,beat:1.8,radius:1.4,bob:0},aquarium:{cost:4}}
];
for(const entry of abyssEntries){faunaArt.builders[entry.id]=abyssArt.builders[entry.id];registerFauna({...entry,abyss:true,renderKind:10,bodyLength:1,traits:{micro:false,feedable:false,grabbable:false,...entry.traits}},ABYSS_SPECIES);}
// Small original schematic fallbacks; release JPEGs are rendered from the real
// geometry by the shared guide fixture, not external wildlife photographs.
(()=>{const drawings={
 coelacanth:'<path d="M43 82 Q91 46 155 62 L181 86 Q162 111 105 106 L49 93Z" fill="#597b85"/><path d="M117 64 L95 36 L73 66 M100 100 L91 126 L124 110 M148 96 L144 119 L169 109 M55 79 L26 49 L22 77 L9 84 L22 90 L24 121 L55 95" fill="#577683" stroke="#839b9c" stroke-width="2"/><circle cx="162" cy="77" r="4" fill="#142c36"/><path d="M175 89 L156 89" stroke="#193641" stroke-width="2"/>',
 giant_squid:'<path d="M12 80 Q29 65 88 70 L103 80 L87 91 Q30 94 12 80Z" fill="#a35955"/><path d="M22 77 L48 57 L52 74 M24 85 L47 107 L56 90" fill="#9c5b58"/><circle cx="94" cy="78" r="7" fill="#ded2ba"/><circle cx="96" cy="78" r="5" fill="#122732"/><g fill="none" stroke="#ba7971" stroke-linecap="round" stroke-width="3"><path d="M101 72 Q126 57 148 65 M102 76 Q126 65 150 74 M101 80 Q128 77 155 84 M101 83 Q130 85 151 94 M100 88 Q122 109 146 108 M104 72 Q140 40 183 51 M105 87 Q149 123 186 111"/></g><path d="M178 51 L193 55 M181 112 L197 108" stroke="#ba7971" stroke-width="7" stroke-linecap="round"/>',
 pelican_eel:'<path d="M17 92 Q52 72 91 94 L123 98 Q151 42 181 70 L182 112 Q144 136 111 103 Q75 96 50 95 Q26 106 17 92Z" fill="#263a49" stroke="#687c7c" stroke-width="1.3"/><path d="M128 101 Q151 68 179 76 L178 110 Q153 121 128 101Z" fill="#342b36"/><circle cx="174" cy="67" r="2.5" fill="#b4c4b0"/><circle cx="17" cy="92" r="3" fill="#a4d2af"/>',
 humpback_anglerfish:'<path d="M61 82 L29 61 L28 111 L65 100 Q70 47 118 51 Q150 52 166 88 Q152 126 105 120 Q69 117 61 82Z" fill="#625045"/><path d="M130 63 Q142 50 165 90 Q144 115 124 107Z" fill="#241f27"/><path d="M143 64 L140 91 L153 74 L151 98 M133 108 L143 86 L147 109 L158 93" fill="none" stroke="#d1c6a9" stroke-width="2"/><path d="M114 54 Q111 17 145 19 Q166 22 166 39" fill="none" stroke="#84715c" stroke-width="3"/><circle cx="167" cy="41" r="7" fill="#aed7c8"/><circle cx="127" cy="61" r="4" fill="#c3bc9a"/>',
 japanese_spider_crab:'<g fill="none" stroke="#ba8058" stroke-width="4" stroke-linecap="round"><path d="M87 77 L54 54 L18 102 L12 134 M91 88 L54 82 L26 115 L29 141 M92 93 L61 107 L54 132 L59 149 M95 99 L81 121 L80 143 M112 77 L148 54 L184 103 L191 134 M110 86 L146 81 L176 115 L175 141 M109 94 L142 106 L149 132 L145 149 M106 99 L119 122 L123 144 M90 73 L62 54 L71 28 M110 73 L140 54 L130 29"/></g><ellipse cx="100" cy="83" rx="19" ry="23" fill="#c6895d"/><path d="M69 36 L65 17 L76 24 M131 37 L137 18 L125 24" fill="none" stroke="#dfba80" stroke-width="5"/><circle cx="93" cy="60" r="3" fill="#203137"/><circle cx="108" cy="60" r="3" fill="#203137"/>'
 };for(const sp of ABYSS_SPECIES)sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 170"><rect width="210" height="170" rx="12" fill="#082634"/>'+drawings[sp.id]+'</svg>');})();
