/* An original field investigation. Progress records actions, not map proximity. */
const StoryRules=(()=>{
 const chapters=[
  {id:'stone-light',title:'石頭裡的光',region:'cave',brief:'澄：眠海號手記提到西側洞裡有一道與海床不同的層理。從洞口進入，先看側室，再找天窗。我們需要兩份現地記錄。',reply:'澄：層理在同一方向中斷，而天窗下的碎石有人工切面。東南遺跡可能曾與洞道相連。我已把東南研究泊位加入航海圖。',steps:[
   {point:'cave-strata',kind:'inspect',seconds:6,title:'記錄側室的層理',note:'淡色礦層被一道規則切面截斷；記下切面的方向。'},
   {point:'cave-light',kind:'inspect',seconds:5,title:'觀察天窗下的切石',note:'陽光落在三條平行凹槽上。它們並不是水流沖刷形成的。'}]},
  {id:'tidal-script',title:'潮汐留下的字',region:'ruins',brief:'澄：到遺跡有頂的檔案室讀取石板，再到中庭的刻盤比對。別搬動任何石塊，留下位置與圖形就好。',reply:'澄：三個圖形是讀取順序：潮紋、月輪、星點。刻盤沒有開門，它讓我們知道石板該從哪一端開始讀。帶著這個順序再看一次。',steps:[
   {point:'ruin-tablet',kind:'inspect',seconds:6,title:'記錄檔案室石板',note:'由下而上的三行：海先升起，月照在海上，星在月的遠方。線索是「潮紋 → 月輪 → 星點」。'},
   {point:'ruin-dial',kind:'cipher',title:'依石板線索解讀刻盤',note:'依剛才的線索，選擇三個圖形；選錯可重新比對。'}]},
  {id:'return-reading',title:'重新讀一次',region:'ruins',brief:'澄：同一塊石板，換一個方向就有不同的意思。回去重新記錄，再到洞中確認切面；這次找的是舊觀測站指向深水的線索。',reply:'澄：兩處記錄的方向交會在西南裂谷。我們將三台水聲觀測器帶下去，分別放在上、中、下層。西南深水泊位現在開放。',steps:[
   {point:'ruin-tablet',kind:'inspect',seconds:6,title:'依新順序重讀石板',note:'交錯凹痕不是裝飾，而是由淺入深的三個水層記號。'},
   {point:'cave-strata',kind:'inspect',seconds:6,title:'回洞中核對方向',note:'切面與深水層的記號一致。裂谷不是終點，而是另一條曾經被記錄的路。'}]},
  {id:'listening-line',title:'三個深度的回聲',region:'abyss',brief:'澄：沿裂谷逐層下降。把觀測器放上三處平台後，留在中層完成一段連續記錄。四周很暗，潛水燈會自動補光。',reply:'澄：水聲裡有緩慢的節律，也有短促的擾動。我們不憑聲音斷言是什麼生物；下一次用眼睛去確認。',steps:[
   {point:'abyss-upper',kind:'deploy',seconds:5,title:'部署上層觀測器',note:'第一台觀測器已固定，留下上層的背景水聲。'},
   {point:'abyss-middle',kind:'deploy',seconds:5,title:'部署中層觀測器',note:'第二台觀測器已固定，與上層使用同一時間基準。'},
   {point:'abyss-lower',kind:'deploy',seconds:5,title:'部署下層觀測器',note:'第三台觀測器已固定。回到中層，開始連續記錄。'},
   {point:'abyss-middle',kind:'record',seconds:20,title:'在中層連續記錄 20 秒',note:'三個深度的記錄已齊備。觀測器留在原位，回船讀取這次的資料。'}]},
  {id:'living-dark',title:'黑暗也有生命',region:'abyss',brief:'澄：沿東側大陸坡向深處游，先在約 216 m 的台地邊緣尋找腔棘魚，再到約 680 m 的開放水域觀察巨型烏賊。調查位置會標出各自棲地；停穩，讓完整輪廓進入視野。',reply:'澄：你帶回了兩個深度、兩種不同的生存方式。古老的石板沒有給我們答案，只提醒人們持續觀察。最後，把自己的儀器帶回家。',steps:[
   {species:'coelacanth',kind:'observe',seconds:8,title:'安靜觀察腔棘魚 8 秒',note:'厚實身體與肉質偶鰭，在微光中緩慢移動。'},
   {species:'giant_squid',kind:'observe',seconds:8,title:'安靜觀察巨型烏賊 8 秒',note:'身體維持流線，腕與觸腕隨水流變化。記錄輪廓，不追逐牠。'}]},
  {id:'leave-no-trace',title:'把回聲帶回家',region:'abyss',brief:'澄：按由深到淺的順序回收三台觀測器。海床不需要留下我們的工作痕跡；完成後回船整理整段調查。',reply:'澄：從洞中的一道光，到黑暗裡的生命，這份潮譜已經有了新的頁面。把記錄留在研究桌，把海留給下一次相遇。',steps:[
   {point:'abyss-lower',kind:'recover',seconds:4,title:'回收下層觀測器',note:'下層儀器已收妥，平台恢復原貌。'},
   {point:'abyss-middle',kind:'recover',seconds:4,title:'回收中層觀測器',note:'中層儀器已收妥。'},
   {point:'abyss-upper',kind:'recover',seconds:4,title:'回收上層觀測器',note:'三台儀器全部回收。帶著整段調查返回研究船。'}]}
 ];
 const initial=()=>({schema:1,started:false,reports:0,step:0,elapsed:0,symbols:0,sensors:[]});
 function sensorIds(s){const ids=['abyss-upper','abyss-middle','abyss-lower'];return s.reports===3?ids.slice(0,Math.min(3,s.step)):s.reports===4?ids:s.reports===5?ids.slice(0,Math.max(0,3-s.step)):[];}
 function sanitize(raw){const s=initial();s.started=raw?.started===true;if(!s.started)return s;
  const integer=(n,max)=>Number.isFinite(n)?Math.floor(Math.max(0,Math.min(max,n))):0;
  s.reports=integer(raw.reports,chapters.length);s.step=integer(raw.step,chapters[s.reports]?.steps.length||0);s.sensors=sensorIds(s);return s;}
 function begin(s,v,active){if(active||s.started||(!v.reading&&v.mode!=='free'))return false;s.started=true;return true;}
 const chapter=s=>s.started?chapters[s.reports]||null:null;
 const current=s=>chapter(s)?.steps[s.step]||null;
 const ready=s=>!!chapter(s)&&s.step===chapter(s).steps.length;
 const distance=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every(Number.isFinite)&&b.every(Number.isFinite)?Math.hypot(...a.map((n,i)=>n-b[i])):Infinity;
 function eligible(s,c){const step=current(s);if(!step||!c.active||c.paused||c.occluded||!c.inFrame||!Number.isFinite(c.speed)||c.speed>.65)return false;const d=distance(c.player,c.target);return d>=(step.species?c.minimum||.5:0)&&d<=(step.species?c.maximum||28:4.2);}
 function record(s,c,dt){const step=current(s);if(!step||step.kind==='cipher')return false;if(!eligible(s,c)){s.elapsed=0;return false;}s.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(s.elapsed+1e-8<step.seconds)return false;s.step++;s.elapsed=0;s.sensors=sensorIds(s);return true;}
 function report(s,active){if(active||!ready(s))return false;s.reports++;s.step=0;s.elapsed=0;s.symbols=0;s.sensors=sensorIds(s);return true;}
 function choose(s,symbol,c){if(current(s)?.kind!=='cipher'||!eligible(s,c))return false;if(symbol!==['wave','moon','star'][s.symbols]){s.symbols=0;return false;}s.symbols++;if(s.symbols===3){s.step++;s.symbols=0;}return true;}
 function animalInFrame(f,sp,vp){
  const b=sp?.modelBounds,finite3=a=>a?.length===3&&Array.from(a).every(Number.isFinite),scale=f?.s;
  if(!b||!finite3(b.min)||!finite3(b.max)||!finite3(f?.p)||!finite3(scale)||scale.some(n=>n<=0)||vp?.length!==16||!Array.from(vp).every(Number.isFinite))return false;
  if(b.min.some((n,i)=>n>b.max[i])||!Number.isFinite(f.yaw??0)||!Number.isFinite(f.pitch??0))return false;
  // Maximum local displacements in the shared colour/shadow kind10 rig.
  // This padded box encloses every animation phase without sampling triangles.
  const h=Math.max(0,b.max[1]-.19),padding={coelacanth:[0,.016,.035],giant_squid:[0,.013,.009],pelican_eel:[0,0,.055],humpback_anglerfish:[h*.055,0,h*.070+.012],japanese_spider_crab:[.009,.010,0]}[sp.id];
  if(!padding)return false;
  const cp=Math.cos(f.pitch||0),sn=Math.sin(f.pitch||0),cy=Math.cos(f.yaw||0),sy=Math.sin(f.yaw||0);
  for(let corner=0;corner<8;corner++){
   const local=b.min.map((n,i)=>(corner&(1<<i))?b.max[i]+padding[i]+.001:n-padding[i]-.001);
   // Match the vertex shader: pitch first, instance scale, then yaw/translation.
   // kind10 has no bank rotation; adding it here would reject an unrelated pose.
   const x=(local[0]*cp-local[1]*sn)*scale[0],y=(local[0]*sn+local[1]*cp)*scale[1],z=local[2]*scale[2];
   const wx=cy*x+sy*z+f.p[0],wy=y+f.p[1],wz=-sy*x+cy*z+f.p[2];
   const clipX=vp[0]*wx+vp[4]*wy+vp[8]*wz+vp[12],clipY=vp[1]*wx+vp[5]*wy+vp[9]*wz+vp[13],clipZ=vp[2]*wx+vp[6]*wy+vp[10]*wz+vp[14],w=vp[3]*wx+vp[7]*wy+vp[11]*wz+vp[15];
   if(w<=0||Math.abs(clipX)>w*.88||Math.abs(clipY)>w*.82||clipZ< -w||clipZ>w)return false;
  }
  return true;
 }
 return {chapters,initial,sanitize,begin,chapter,current,ready,eligible,record,report,choose,animalInFrame};
})();

const oceanStory=(()=>{
 const R=StoryRules,state=()=>oceanFeatures.state('story');let recording=false,subject=null,sensorBatch=null;
 function destination(step=R.current(state())){return step?.point?'study:'+step.point:step?.species?'habitat:'+step.species:null;}
 function context(allowStoryPanel=false){
  const step=R.current(state());let targetPoint=step?.point?OceanRegions.points[step.point]?.p.slice():null,minimum=0,maximum=28,animalFramed=true;
  if(targetPoint&&step.point.startsWith('abyss-'))targetPoint[1]+=.55;
  if(step?.species){
   const sp=SPECIES.find(s=>s.id===step.species),fish=subject?life.find(f=>f.uid===subject):life.filter(f=>SPECIES[f.species]===sp).sort((a,b)=>V.dist(player.p,a.p)-V.dist(player.p,b.p))[0];
   targetPoint=fish?animalFocusPoint(fish):null;minimum=Math.max(.5,(sp?.bodyLength||1)*(sp?.size||1)*.8);maximum=sp?speciesTraits(sp).observeDistance:28;
   if(!fish||fish.retreat>.8||fish.faunaVisibility<.8)targetPoint=null;
   animalFramed=!!targetPoint&&R.animalInFrame(fish,sp,renderer.vp);
  }
  const screen=targetPoint&&project(targetPoint,renderer.vp);
  return {active,paused:!!photoOpen||document.hidden||!!modal&&!(allowStoryPanel&&modal==='story'),player:player.p,eye,target:targetPoint,speed:V.len(player.velocity),inFrame:animalFramed&&!!screen&&screen[2]>0&&Math.abs(screen[0])<.88&&Math.abs(screen[1])<.82,occluded:!targetPoint||blocked(eye,targetPoint,.04),minimum,maximum};
 }
 function syncSensors(){if(!sensorBatch)return;sensorBatch.instances=state().sensors.map(id=>({p:OceanRegions.points[id].p.slice(),s:[1,1,1],yaw:0,phase:0}));sensorBatch.visible=sensorBatch.instances.length>0;renderer.updateBatch(sensorBatch);renderer.forceShadow=true;renderer.dirty=true;}
 function cancel(){recording=false;subject=null;state().elapsed=0;}
 function changed(){syncSensors();saveVoyage();renderShip();}
 function begin(){if(!R.begin(state(),voyage.state,active)){toast('讀過眠海號記錄器，再回船接下這段調查。');return false;}changed();render();radio(R.chapter(state()).brief);return true;}
 function startRecording(){
  const s=state(),step=R.current(s);if(!step||!R.eligible(s,context(true))){toast('先靠近調查目標，停穩並讓它留在視線裡。');return false;}
  if(step.kind==='cipher'){openPanel('story');return true;}
  closePanel();resetInput();stopAuto();recording=true;s.elapsed=0;
  if(step.species){const fish=life.filter(f=>SPECIES[f.species].id===step.species).sort((a,b)=>V.dist(player.p,a.p)-V.dist(player.p,b.p))[0];subject=fish?.uid||null;}
  toast(step.title+' · 維持視線與距離');return true;
 }
 function choose(symbol){const result=R.choose(state(),symbol,context(true));if(!result)toast('刻紋順序未吻合；重新從潮紋開始比對。');else if(R.ready(state())){changed();radio('刻盤的三組線條已對齊。把這份記錄帶回研究船。');toast('解讀完成 · 返回研究船回報');}else{saveVoyage();toast('圖形吻合 · 已比對 '+state().symbols+' / 3');}render();return result;}
 function report(){const chapter=R.chapter(state());if(!R.report(state(),active)){toast('完成本章的現地調查，再回船整理。');return false;}cancel();changed();render();radio(chapter.reply);return true;}
 function tick(dt){
  if(!active)return;
  if(recording){const step=R.current(state()),ctx=context();if(!R.eligible(state(),ctx)){cancel();toast('記錄已中斷。停穩並重新開始，已完成的調查會保留。');}
   else if(R.record(state(),ctx,dt)){recording=false;subject=null;changed();radio(step.note);toast(R.ready(state())?'本章現地記錄齊備 · 返回研究船回報':'已記錄 · '+step.title);}}
 }
 function paintHUD(){
  const s=state(),chapter=R.chapter(s),step=R.current(s),button=$('storyAction');
  if(button){const shown=active&&!modal&&!photoOpen&&!document.body.classList.contains('cinematic')&&!!step&&(recording||R.eligible(s,context()));button.classList.toggle('hidden',!shown);button.textContent=recording?'記錄中 '+s.elapsed.toFixed(1)+' / '+step.seconds+' 秒 · 點此取消':step?.kind==='cipher'?'解讀刻盤 ↗':step?.title+' ↗';}
  if(s.started&&voyage.state.mode==='journey'){
   $('objectiveName').textContent=chapter?chapter.title:'回聲潮譜 · 調查完成';$('objectiveCount').textContent='調查 '+s.reports+' / '+R.chapters.length;
   $('objectiveDetail').textContent=R.ready(s)?'現地記錄已齊備。返回研究船，在「回聲潮譜」整理回報。':step?step.title+' · 開啟調查冊查看路線與線索。':'儀器已回收，調查冊保留了整段原創故事。';
  }
 }
 function shipRender(){
  let card=$('storyShipCard');if(!card){const board=document.querySelector('.ship-board');if(!board)return;card=document.createElement('section');card.id='storyShipCard';card.className='feature-section';board.append(card);}
  const s=state(),chapter=R.chapter(s);card.innerHTML=`<small>FIELD JOURNAL / 回聲潮譜</small><h3>${s.started?chapter?safe(chapter.title):'把回聲帶回家':'眠海號之後，還有一段路'}</h3><p>${s.started?R.ready(s)?'本章調查已完成，帶回的線索等你解讀。':`${s.reports} / ${R.chapters.length} 章已回報 · ${chapter?safe(chapter.steps[s.step]?.title||'回船整理'):'原創調查完成，可重讀研究記錄。'}`:'在眠海號讀取記錄器後，回船接下洞窟、遺跡與深淵的調查。'}</p><button class="muted-btn" id="storyShipOpen">打開調查冊 ↗</button>`;$('storyShipOpen').onclick=()=>openPanel('story');
 }
 function render(){
  const s=state(),chapter=R.chapter(s),step=R.current(s),can=!!step&&R.eligible(s,context(true));panelTitle('ECHOES / FIELD JOURNAL','回聲潮譜');
  $('panelBody').innerHTML=`<p class="panel-note">眠海號之後的原創調查 · ${s.reports} / ${R.chapters.length} 章回報。現地記錄需要停穩、保持距離與視線；中斷可重試。</p>${!s.started?`<section class="feature-section"><h3>澄的邀請</h3><p>手記的最後幾行指向西側洞道。我們一起把這片海未讀完的頁面找回來。</p><button id="storyBegin" class="primary" ${active||(!voyage.state.reading&&voyage.state.mode!=='free')?'disabled':''}>接下調查</button><p class="feature-muted">先親自讀取眠海號記錄器，再回船開始。自由重遊也可選擇接下。</p></section>`:chapter?`<section class="feature-section"><span class="feature-badge">第 ${s.reports+1} 章</span><h3>${safe(chapter.title)}</h3><p>${safe(chapter.brief)}</p>${chapter.steps.map((a,i)=>`<p class="story-step ${i===s.step?'current':''}">${i<s.step?'✓':i===s.step?'→':'○'} ${safe(a.title)}${i<s.step?'<br><small>'+safe(a.note)+'</small>':''}</p>`).join('')}${R.ready(s)?`<button class="primary" id="storyReport" ${active?'disabled':''}>回報記錄 · 聽澄的解讀</button>${active?'<p>請先返回研究船。</p>':''}`:step?`<div class="feature-toolbar"><button class="muted-btn" id="storyMark">標記調查位置 ↗</button><button class="muted-btn" id="storyNavigation">選擇研究船泊位 ↗</button><button class="primary" id="storyRecord" ${can?'':'disabled'}>${step.kind==='cipher'?'在此解讀':'開始現地記錄'}</button></div><p class="feature-muted">${can?'目標已在視線與距離內。':'先游到標記附近，面向目標。洞窟與檔案室須從入口進入。'}${step.seconds?'需要連續 '+step.seconds+' 秒。':''}</p>${step.kind==='cipher'?`<p>石板線索：海先升起，月照在海上，星在月的遠方。</p><p>已比對 ${s.symbols} / 3 個圖形</p><div class="feature-toolbar">${[['wave','≋ 潮紋'],['moon','◐ 月輪'],['star','✦ 星點']].map(([id,label])=>`<button class="muted-btn" data-story-symbol="${id}" ${can?'':'disabled'}>${label}</button>`).join('')}</div>`:''}`:''}</section>`:'<section class="feature-section"><h3>調查已整理完畢</h3><p>三台觀測器已回收。洞窟、遺跡與裂谷仍可隨時重遊；研究桌保存著每一次解讀。</p></section>'}${R.chapters.slice(0,s.reports).map((a,i)=>`<details class="feature-section"><summary>✓ ${i+1} · ${safe(a.title)}</summary><p>${safe(a.reply)}</p>${a.steps.map(b=>`<p><b>${safe(b.title)}</b><br>${safe(b.note)}</p>`).join('')}</details>`).join('')}`;
  if($('storyBegin'))$('storyBegin').onclick=begin;if($('storyReport'))$('storyReport').onclick=report;if($('storyRecord'))$('storyRecord').onclick=startRecording;
  if($('storyMark'))$('storyMark').onclick=()=>markPlace(destination());if($('storyNavigation'))$('storyNavigation').onclick=()=>openPanel('navigation');
  $('panelBody').querySelectorAll('[data-story-symbol]').forEach(b=>b.onclick=()=>choose(b.dataset.storySymbol));
 }
 function init(){
  const g=new Geometry();g.material=0;g.box([0,.18,0],[.40,.32,.28],[.74,.55,.15]);g.tube([0,.30,0],[0,.90,0],.027,.018,[.31,.37,.38],8);g.sphere([0,.94,0],[.10,.08,.10],[.65,.77,.66],12,8);
  for(const x of [-.26,.26])g.tube([0,.15,0],[x,.015,.18],.025,.025,[.29,.33,.31],8);
  sensorBatch=renderer.batch(g,Array.from({length:3},()=>({p:[0,-200,0]})),0,true);sensorBatch.maxDistance=55;syncSensors();
  const b=document.createElement('button');b.id='storyAction';b.className='pill-btn hidden';b.onclick=()=>recording?cancel():startRecording();$('hud').append(b);
  const style=document.createElement('style');style.textContent='#storyAction{position:fixed;left:50%;top:66%;transform:translateX(-50%);max-width:min(460px,82vw);white-space:normal;min-height:44px;background:#10353beb;z-index:12}.story-step{padding:10px 0;border-bottom:1px solid #a6c9bc22}.story-step.current{color:#e4ddb7}.story-step small{font-size:12px;color:#a9c5bd}#storyShipCard small{font-size:10px;letter-spacing:.1em}#storyShipCard p{font-size:12px}#storyShipCard h3{font-size:21px}@media(pointer:coarse){#storyAction{top:57%;font-size:11px;max-width:70vw}}@media(max-height:550px) and (orientation:landscape){#storyAction{top:52%;max-width:48vw}}';document.head.append(style);
  window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  oceanFeatures.addMenu({id:'story',label:'回聲潮譜 · 調查冊',panel:'story'});shipRender();
 }
 const feature={id:'story',initial:R.initial,sanitize:R.sanitize,init,tick,paintHUD,shipRender,photoOpened:cancel,panelChanged:cancel,endDive:cancel,reset(){cancel();syncSensors();shipRender();},startDive(){cancel();if(state().started&&R.chapter(state()))radio(R.chapter(state()).brief);},renderPanel(type){if(type!=='story')return false;render();return true;}};oceanFeatures.register(feature);
 return {rules:R,feature,begin,startRecording,choose,report,context,destination,snapshot:()=>JSON.parse(JSON.stringify(state()))};
})();
