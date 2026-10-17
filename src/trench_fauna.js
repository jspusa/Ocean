/* Original deep-ocean animals, separate from the old miniature abyss catalogue.
 * +X anterior, +Y up. Metres live in size; body/arm length is one model unit.
 * Biological sources: docs/parity/TRENCH-FAUNA-REFERENCE.md. Material and motion
 * parameters are authored game choices, never measured biological properties.
 * kind11: 1 body, 3 membrane/fin, 4 eye, 5 appendage, 6 luminous organ. */
const TRENCH_SPECIES=[];
const trenchArt=(()=>{
 const blend=cetaceanArt.blend,soft=cetaceanArt.soft,skin=cetaceanArt.skin,tube=faunaArt.tube,curve=faunaArt.curvePoints,fin=faunaArt.fin;
 const black=[.019,.023,.026],cream=[.76,.69,.54];
 const tagged=(g,tag,run)=>{const old=g.tag;g.tag=tag;run();g.tag=old;};
 function ellipsoid(g,c,r,color,low,detail=1){skin(g,(u,v)=>{const a=u*Math.PI,b=v*TAU;return [c[0]+Math.cos(a)*r[0],c[1]+Math.sin(a)*Math.cos(b)*r[1],c[2]+Math.sin(a)*Math.sin(b)*r[2]];},Math.round((low?10:18)*detail),Math.round((low?14:28)*detail),color);}
 function body(g,rows,color,low){const start=g.v.length;skin(g,(u,v)=>{const p=cetaceanArt.profileAt(rows,mix(rows[0][0],rows.at(-1)[0],u)),a=v*TAU;return [p[0],p[1]+Math.cos(a)*p[2],Math.sin(a)*p[3]];},low?28:60,low?16:32,color);
  // Every angular sample converges to the same closed tip. A finite-difference
  // tangent at that singularity is not its normal: use the shared axial normal.
  for(let k=start;k<g.v.length;k+=12)for(const [row,sign]of [[rows[0],-1],[rows.at(-1),1]])if(row[2]===0&&row[3]===0&&Math.abs(g.v[k]-row[0])<1e-9){g.v[k+3]=sign;g.v[k+4]=0;g.v[k+5]=0;}
 }
 function eye(g,p,r,low,iris=[.32,.27,.21]){tagged(g,4,()=>{ellipsoid(g,p,[r,r*.95,r*.38],iris,low,.65);ellipsoid(g,[p[0]+r*.1,p[1],p[2]+Math.sign(p[2])*r*.24],[r*.76,r*.75,r*.24],black,low,.6);});}
 function vampire(g,low){
  const red=[.29,.075,.067],pale=[.46,.17,.11],paint=p=>blend(red,pale,.22+.14*Math.sin(p[0]*7+p[2]*13)+.055*Math.sin(p[0]*57+p[1]*47)*Math.sin(p[2]*43));
  body(g,[[-.5,0,0,0],[-.45,0,.080,.071],[-.34,0,.145,.136],[-.20,0,.155,.143],[-.09,0,.124,.123],[.025,0,.112,.119],[.115,0,.089,.088],[.15,0,0,0]],paint,low);
  for(const side of [-1,1]){eye(g,[.005,.012,side*.113],.062,low,[.40,.25,.12]);tagged(g,3,()=>{const roots=[],edges=[];for(let i=0;i<=12;i++){const u=i/12,x=-.36+u*.21;roots.push([x,.022,side*(.128+.008*Math.sin(u*Math.PI))]);edges.push([x-.065*Math.sin(u*Math.PI),.02+.045*Math.sin(u*Math.PI),side*(.132+.15*Math.sin(u*Math.PI))]);}fin(g,roots,edges,pale,.001);});}
  // Paired mantle photophores remain small physical organs. The renderer adds
  // their own blue light without turning the eyes or whole animal emissive.
  tagged(g,6,()=>{for(const side of [-1,1])ellipsoid(g,[-.405,.050,side*.092],[.018,.012,.010],[.24,.66,.77],low,.45);});
  // Eight arms support an actual interbrachial web. Its scalloped free edge
  // remains separate from the two narrow collecting filaments near the head.
  tagged(g,3,()=>{for(const inside of [false,true]){const start=g.v.length;skin(g,(u,v)=>{const a=v*TAU,rad=.086+.104*Math.sin(u*Math.PI*.69),lobe=Math.pow(.5+.5*Math.cos(a*8),3),x=.10+u*(.24+.15*lobe);return [x,Math.cos(a)*(rad+(inside?-.001:.001)),Math.sin(a)*(rad+(inside?-.001:.001))];},low?8:16,low?32:64,inside?[.39,.14,.11]:paint);if(inside)for(let k=start;k<g.v.length;k+=36){const b=g.v.slice(k+12,k+24),c=g.v.slice(k+24,k+36);g.v.splice(k+12,24,...c,...b);for(const j of [0,12,24])for(let n=3;n<6;n++)g.v[k+j+n]*=-1;}}});
  tagged(g,5,()=>{for(let i=0;i<8;i++){const a=i*TAU/8,cy=Math.cos(a),sz=Math.sin(a),points=curve([[.10,cy*.086,sz*.086],[.22,cy*.14,sz*.14],[.36,cy*.186,sz*.186],[.48,cy*.18,sz*.18],[.50,cy*.166,sz*.166]],low?1:2);tube(g,points,t=>.015*Math.pow(1-t,.78)+.001,paint(points[2]),low?5:7);if(!low)for(let j=1;j<5;j++){const u=j/5,p=points[Math.min(points.length-1,Math.round(u*(points.length-1)))];tube(g,[p,V.add(p,[-.008,-cy*.025,-sz*.025])],t=>.003*(1-t)+.0003,cream,4);}}
   for(const side of [-1,1])tube(g,curve([[.035,-.062,side*.102],[.14,-.13,side*.20],[.39,-.105,side*.29],[.59,-.04,side*.32],[.65,.015,side*.29]],low?2:3),t=>.0032*(1-t*.80),[.64,.48,.30],low?4:5);
  });
 }
 function seaPig(g,low){
  const pink=[.77,.53,.48],light=[.86,.66,.58],paint=p=>blend(pink,light,.22+.16*Math.sin(p[0]*5+p[2]*3)+.06*Math.sin(p[0]*37)*Math.sin(p[2]*43));
  body(g,[[-.5,.255,0,0],[-.44,.26,.115,.13],[-.29,.27,.178,.192],[-.08,.27,.185,.207],[.14,.26,.172,.197],[.32,.245,.145,.167],[.45,.215,.084,.105],[.5,.20,0,0]],paint,low);
  // Elongated soft podia lift the animal clear of sediment. The distal tips
  // remain at y=0 in the shared rig; paired steps can lift but never sink them.
  tagged(g,5,()=>{for(const side of [-1,1])for(let i=0;i<7;i++){const x=-.39+i*.13,width=.17+.025*Math.sin(i*Math.PI/6),r=.031-.011*Math.abs(i-3)/3,pts=curve([[x,.205,side*width],[x-.018,.12,side*(width+.080)],[x+.012,.035,side*(width+.115)],[x+.022,.008,side*(width+.095)]],low?1:2);tube(g,pts,t=>r*(1-t*.69),paint(pts[0]),low?5:7);ellipsoid(g,[x+.022,.009,side*(width+.095)],[.022,.009,.016],light,low,.38);}
   for(const side of [-1,1])for(const x of [-.20,.23])tube(g,curve([[x,.40,side*.08],[x-.02,.51,side*.13],[x-.055,.64,side*.16],[x-.11,.68,side*.20]],low?2:3),t=>.022*Math.pow(1-t,.7)+.002,light,low?5:7);
   // Ten branched oral tentacles, not a fish mouth or invented eyes.
   for(let i=0;i<10;i++){const a=i*TAU/10,root=[.449,.16+Math.cos(a)*.041,Math.sin(a)*.058],tip=[.52,.092+Math.cos(a)*.027,Math.sin(a)*.067];tube(g,curve([root,[.49,.12+Math.cos(a)*.033,Math.sin(a)*.070],tip],low?1:2),t=>.007*(1-t*.4),light,low?4:5);if(!low)for(const d of [-1,1])tube(g,[tip,V.add(tip,[.016,-.004,d*.012])],t=>.0035*(1-t*.86),light,4);}
  });
  ellipsoid(g,[.494,.161,0],[.004,.023,.028],[.43,.25,.22],low,.45);
 }
 function snailfish(g,low){
  const pink=[.83,.68,.63],pale=[.91,.81,.73],paint=p=>{const belly=soft(-.01,-.13,p[1]),organ=Math.exp(-Math.pow((p[0]-.12)/.13,2)-Math.pow((p[1]+.07)/.065,2));return blend(blend(pink,pale,.30+.20*belly),[.62,.41,.35],organ*.18);};
  const rows=[[-.5,.02,0,0],[-.44,.02,.026,.014],[-.31,.024,.046,.029],[-.15,.008,.087,.052],[.02,-.012,.136,.084],[.18,-.012,.142,.109],[.32,.012,.114,.113],[.43,.025,.080,.091],[.487,.015,.037,.046],[.5,.005,0,0]];body(g,rows,paint,low);
  const eyeSection=cetaceanArt.profileAt(rows,.405),eyeZ=eyeSection[3]*Math.sqrt(1-Math.pow((.040-eyeSection[1])/eyeSection[2],2));
  for(const side of [-1,1]){eye(g,[.405,.040,side*(eyeZ+.001)],.010,low,[.58,.52,.46]);tube(g,curve([[.488,-.013,side*.027],[.454,-.028,side*.062],[.398,-.036,side*.083]],low?1:3),.0013,[.43,.32,.29],low?4:5);
   // A broad upper pectoral lobe and a shorter lower lobe leave the diagnostic
   // notch. Thin membranes, curved edges and individual rays are real geometry.
   tagged(g,3,()=>{for(const lower of [false,true]){const roots=[],edges=[],n=low?10:18;for(let i=0;i<=n;i++){const u=i/n,a=mix(lower?-.35:.05,lower?-2.35:2.55,u),r=Math.sin(u*Math.PI),root=[.307,-.025,side*.100];roots.push([root[0]-.015*u,root[1]+(lower?-.035:.015)*u,root[2]]);edges.push(lower?[.31-.14*u,-.08-.108*r,side*(.104+.065*r)]:[.31-.24*u,-.012+.095*Math.sin(a)*r,side*(.104+.145*r)]);}fin(g,roots,edges,pale,.0006);for(let i=2;i<n;i+=low?4:3)tube(g,[roots[i],edges[i]],.00085,[.80,.65,.59],4);}});
  }
  tagged(g,3,()=>{for(const side of [-1,1]){const roots=[],edges=[],n=low?16:32,start=side>0?.22:.05;for(let i=0;i<=n;i++){const u=i/n,x=mix(start,-.50,u),p=cetaceanArt.profileAt(rows,x),root=p[1]+side*p[2],height=.043*Math.sin(u*Math.PI);roots.push([x,root,0]);edges.push([x,root+side*height,.0015*Math.sin(u*Math.PI)]);}fin(g,roots,edges,pale,.0006);for(let i=2;i<n;i+=low?4:3)tube(g,[roots[i],edges[i]],.0007,[.80,.67,.60],4);}});
  tagged(g,5,()=>{const disk=Array.from({length:(low?16:28)+1},(_,i)=>{const a=i/(low?16:28)*TAU;return [.245+Math.cos(a)*.044,-.137+.004*Math.cos(a),Math.sin(a)*.030];});tube(g,disk,.0035,[.80,.65,.56],low?4:6);ellipsoid(g,[.245,-.135,0],[.041,.003,.027],[.70,.54,.45],low,.5);});
 }
 return {builders:{vampire_squid:vampire,sea_pig:seaPig,mariana_snailfish:snailfish},ellipsoid,body,eye,tagged};
})();
const trenchEntries=[
 {id:'vampire_squid',name:'吸血烏賊',latin:'Vampyroteuthis infernalis',en:'VAMPIRE SQUID',size:.28,color:0x672a22,naturalSize:'MBARI列最大總長30cm；本作代表個體含腕冠長28cm，細攝食絲另伸出',naturalDepth:[600,900],hint:'深紅外套、兩片鰭與連接八腕的蹼；兩條細絲緩緩收集海洋雪。',detail:'吸血烏賊以兩條細絲收集下沉的有機碎屑，腕間的蹼不同於十腕魷魚的長捕食觸腕。本作700m研究站是原創配置；游速、絲收回節律與個體數為遊戲設定。',source:'https://www.mbari.org/animal/vampire-squid/',sourceLabel:'MBARI · Vampire squid',traits:{motion:'hover',micro:false,observeDistance:8,contactDistance:1.2,targetRadius:.18,viewDistance:1.3},motionProfile:{type:'vampire',speed:.025,beat:1.7,radius:.7,bob:.025},materialProfile:{skin:'cephalopod',roughness:.58,subsurface:.30,patternScale:26},aquarium:{cost:2}},
 {id:'sea_pig',name:'海豬',latin:'Scotoplanes sp.',en:'SEA PIG',size:.14,color:0xc58e80,naturalSize:'MBARI列海豬屬最大17cm；圖像說明列S.globosa常見8–14cm，本模型軀幹長14cm',naturalDepth:[1000,6000],hint:'柔軟粉色身體撐在長管足上；背部細長乳突和口邊觸手隨動作舒展。',detail:'海豬是深海海參，以長管足走過軟泥，以口邊觸手處理有機碎屑。體型參考MBARI的海豬影像，資料範圍為Scotoplanes屬；1400m泥底站與步態節律是本作原創設定。',source:'https://www.mbari.org/animal/sea-pig/',sourceLabel:'MBARI · Sea pig',sources:['https://www.mbari.org/animal/sea-pig/','https://www.mbari.org/gallery/deep-sea-wallpapers/sea-pig/'],traits:{motion:'crawl',micro:true,observeDistance:2.0,contactDistance:.8,targetRadius:.085,viewDistance:.8},motionProfile:{type:'sea_pig',speed:.004,beat:1.3,radius:.24,bob:0},materialProfile:{skin:'gelatinous',roughness:.64,subsurface:.55,patternScale:18},aquarium:{cost:1}},
 {id:'mariana_snailfish',name:'馬里亞納獅子魚',latin:'Pseudoliparis swirei',en:'MARIANA SNAILFISH',size:.20,color:0xd5b5a6,originalAddition:true,naturalSize:'本作代表個體全長20cm，不是物種最大值；原始描述區分活體與保存標本量測',naturalDepth:[6898,7966],hint:'小眼、粉白柔軟身體、分成兩葉的胸鰭，腹面有小型吸盤。',detail:'本種於2017年正式描述，原始採集水深6898–7966m，活體皮膚與腹壁透明。牠是本作原創海溝追加，不是2007年Wii物種的精確復刻。7000m研究終站為原創場景；透明組織以即時材質近似。',source:'https://www.biotaxa.org/Zootaxa/article/view/zootaxa.4358.1.7',sourceLabel:'Gerringer et al. 2017 · Zootaxa',traits:{motion:'swim',micro:false,observeDistance:6,contactDistance:1.0,targetRadius:.11,viewDistance:1.1},motionProfile:{type:'snailfish',speed:.035,beat:2.8,radius:.45,bob:.012},materialProfile:{skin:'gelatinous',roughness:.56,subsurface:.60,patternScale:14},aquarium:{cost:2}}
];
// Original schematic fallbacks only; release guide JPEGs use these real meshes.
const trenchDrawings={
 vampire_squid:'<ellipse cx="88" cy="74" rx="47" ry="30" fill="#793b2d"/><path d="M61 51Q58 24 90 42M66 97Q66 123 99 105" fill="#9b5140"/><path d="M113 55 Q160 23 187 72 Q164 107 115 93Z" fill="#9b5140"/><path d="M117 72Q170 122 214 100M118 69Q174 131 219 119" fill="none" stroke="#c4a06a"/><circle cx="114" cy="66" r="11" fill="#191c22"/>',
 sea_pig:'<g stroke="#c18d80" fill="none" stroke-width="7" stroke-linecap="round"><path d="M60 86L45 114L38 122M82 91L73 119L66 125M105 94L102 121L94 126M130 94L137 122L130 128M153 86L166 112L158 122M72 60Q62 29 52 24M137 60Q146 29 159 23"/></g><path d="M35 75Q30 41 89 39Q152 36 178 66Q196 93 160 105Q87 113 48 94Z" fill="#c58e80"/><path d="M173 80L195 101M176 75L202 91M177 70L204 80M177 67L200 66" stroke="#ebc1ad" stroke-width="4" stroke-linecap="round"/>',
 mariana_snailfish:'<path d="M24 86Q58 71 80 65Q101 39 149 44Q184 48 203 72Q209 86 191 99Q159 119 114 106Q79 97 24 86Z" fill="#d7b6a6"/><path d="M32 81Q88 58 116 37L149 45M32 89Q83 103 119 119L142 110" fill="#e1c7b7"/><path d="M158 75Q115 29 99 75Q103 91 137 83Q112 108 130 118Q157 118 169 93Z" fill="#dcbca9" stroke="#b18c7d" stroke-width="1"/><ellipse cx="174" cy="63" rx="3" ry="3" fill="#202c30"/><path d="M199 82L184 84" stroke="#a88070" stroke-width="2"/>'
};
for(const entry of trenchEntries){faunaArt.builders[entry.id]=trenchArt.builders[entry.id];const sp=registerFauna({...entry,trench:true,renderKind:11,zone:5,modelUnitLength:1,bodyLength:1,traits:{micro:false,feedable:false,grabbable:false,...entry.traits}},TRENCH_SPECIES);sp.thumb='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="#08232e"/>'+trenchDrawings[entry.id]+'</svg>');}
