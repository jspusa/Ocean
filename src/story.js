/* An original field investigation. Progress records actions, not map proximity. */
const StoryRules=(()=>{
 const chapters=[
  {id:'stone-light',title:'石頭裡的光',region:'cave',brief:'澄：眠海號手記提到西側洞裡有一道與海床不同的層理。從洞口進入，先看側室，再找天窗。我們需要兩份現地記錄。',reply:'澄：層理在同一方向中斷，而天窗下的碎石有人工切面。東南遺跡可能曾與洞道相連。接著可到東南遺跡繼續比對。',steps:[
   {point:'cave-strata',kind:'inspect',seconds:6,title:'記錄側室的層理',note:'淡色礦層被一道規則切面截斷；記下切面的方向。'},
   {point:'cave-light',kind:'inspect',seconds:5,title:'觀察天窗下的切石',note:'陽光落在三條平行凹槽上。它們並不是水流沖刷形成的。'}]},
  {id:'tidal-script',title:'潮汐留下的字',region:'ruins',brief:'澄：到遺跡有頂的檔案室讀取石板，再到中庭的刻盤比對。別搬動任何石塊，留下位置與圖形就好。',reply:'澄：三個圖形是讀取順序：潮紋、月輪、星點。刻盤沒有開門，它讓我們知道石板該從哪一端開始讀。帶著這個順序再看一次。',steps:[
   {point:'ruin-tablet',kind:'inspect',seconds:6,title:'記錄檔案室石板',note:'由下而上的三行：海先升起，月照在海上，星在月的遠方。線索是「潮紋 → 月輪 → 星點」。'},
   {point:'ruin-dial',kind:'cipher',title:'依石板線索解讀刻盤',note:'依剛才的線索，選擇三個圖形；選錯可重新比對。'}]},
  {id:'return-reading',title:'重新讀一次',region:'ruins',brief:'澄：同一塊石板，換一個方向就有不同的意思。回去重新記錄，再到洞中確認切面；這次找的是舊觀測站指向深水的線索。',reply:'澄：兩處記錄的方向交會在西南裂谷。我們將三台水聲觀測器帶下去，分別放在上、中、下層。接下來沿西南裂谷逐層記錄。',steps:[
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
  // Maximum local displacements in the shared colour/shadow kind10/11 rigs.
  // This padded box encloses every animation phase without sampling triangles.
  const h=Math.max(0,b.max[1]-.19),padding={coelacanth:[0,.016,.035],giant_squid:[0,.013,.009],pelican_eel:[0,0,.055],humpback_anglerfish:[h*.055,0,h*.070+.012],japanese_spider_crab:[.009,.010,0],mariana_snailfish:[0,.016,.033]}[sp.id];
  if(!padding)return false;
  const cp=Math.cos(f.pitch||0),sn=Math.sin(f.pitch||0),cy=Math.cos(f.yaw||0),sy=Math.sin(f.yaw||0);
  for(let corner=0;corner<8;corner++){
   const local=b.min.map((n,i)=>(corner&(1<<i))?b.max[i]+padding[i]+.001:n-padding[i]-.001);
   // Match the vertex shader: pitch first, instance scale, then yaw/translation.
   // These kind10/11 rigs have no bank rotation.
   const x=(local[0]*cp-local[1]*sn)*scale[0],y=(local[0]*sn+local[1]*cp)*scale[1],z=local[2]*scale[2];
   const wx=cy*x+sy*z+f.p[0],wy=y+f.p[1],wz=-sy*x+cy*z+f.p[2];
   const clipX=vp[0]*wx+vp[4]*wy+vp[8]*wz+vp[12],clipY=vp[1]*wx+vp[5]*wy+vp[9]*wz+vp[13],clipZ=vp[2]*wx+vp[6]*wy+vp[10]*wz+vp[14],w=vp[3]*wx+vp[7]*wy+vp[11]*wz+vp[15];
   if(w<=0||Math.abs(clipX)>w*.88||Math.abs(clipY)>w*.82||clipZ< -w||clipZ>w)return false;
  }
  return true;
 }
 return {chapters,initial,sanitize,begin,chapter,current,ready,eligible,record,report,choose,animalInFrame};
})();

/* One optional investigation, with ordered evidence independent of the six chapters. */
const HadalStoryRules=(()=>{
 const id='hadal-fold',title='海圖上的折痕';
 const steps=[
  {id:'reference',point:'hadal-reference',kind:'deploy',seconds:4,title:'部署泥台基準儀',note:'基準儀已固定在泥台。沿切溝依次記錄坡面，不要直線穿過岩層。'},
  {id:'rim',point:'hadal-rim',kind:'sample',seconds:4,title:'記錄切溝邊緣',note:'已留下切溝邊緣的實際高度。沿坡面向下找下一處轉折。'},
  {id:'turn',point:'hadal-turn',kind:'sample',seconds:4,title:'記錄坡面轉折',note:'坡面轉折已記錄。繼續沿坡下降到溝底。'},
  {id:'bottom',point:'hadal-bottom',kind:'sample',seconds:4,title:'記錄切溝底部',note:'三段坡面記錄已齊。返回泥台，主動選取一隻馬里亞納獅子魚。'},
  {id:'snailfish',species:'mariana_snailfish',kind:'observe',seconds:6,title:'選取並完整觀察獅子魚 6 秒',note:'同一隻獅子魚的完整輪廓已記錄。最後回到基準儀收回自己的器材。'},
  {id:'recovery',point:'hadal-reference',kind:'recover',seconds:4,title:'回收泥台基準儀',note:'基準儀已收妥。請儲存並回首頁，整理剖面與個體記錄。'}
 ];
 const initial=()=>({schema:1,id,started:false,records:[],reported:false,elapsed:0});
 const point=key=>typeof OceanTrench!=='undefined'?OceanTrench.studyPoints?.[key]:null;
 const current=s=>s.started&&!s.reported?steps[s.records.length]||null:null;
 const ready=s=>s.started&&!s.reported&&s.records.length===steps.length;
 const knownUID=uid=>uid==='mariana_snailfish-001'||uid==='mariana_snailfish-002';
 function sanitize(raw){
  const s=initial();if(raw?.schema!==1||raw.id!==id||raw.started!==true)return s;s.started=true;
  for(const entry of (Array.isArray(raw.records)?raw.records:[]).slice(0,steps.length)){
   const step=steps[s.records.length];if(entry?.id!==step.id)break;
   if(step.species){if(entry.species!==step.species||!knownUID(entry.uid))break;s.records.push({id:step.id,species:step.species,uid:entry.uid});}
   else {const p=point(step.point);if(!p||entry.point!==step.point||!Number.isFinite(entry.depth)||Math.abs(entry.depth+p.p[1])>1e-6)break;s.records.push({id:step.id,point:step.point,depth:-p.p[1]});}
  }
  s.reported=raw.reported===true&&s.records.length===steps.length;return s;
 }
 function eligible(s,c){
  const step=current(s);if(!step||!c.active||c.paused||c.occluded||!c.inFrame||!Number.isFinite(c.speed)||c.speed>.65)return false;
  const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);if(!finite3(c.player)||!finite3(c.target))return false;
  const d=Math.hypot(...c.player.map((v,i)=>v-c.target[i]));
  if(step.species)return c.manualSelection&&knownUID(c.selectedUID)&&c.selectedUID===c.subjectUID&&d>=c.minimum&&d<=c.maximum;
  return c.pointId===step.point&&!!point(step.point)&&d<=2;
 }
 function record(s,c,dt){const step=current(s);if(!eligible(s,c)){s.elapsed=0;return false;}s.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(s.elapsed+1e-8<step.seconds)return false;
  s.records.push(step.species?{id:step.id,species:step.species,uid:c.selectedUID}:{id:step.id,point:step.point,depth:-point(step.point).p[1]});s.elapsed=0;return true;
 }
 function report(s,active){if(active||!ready(s))return false;s.reported=true;s.elapsed=0;return true;}
 const deployed=s=>s.started&&s.records.length>0&&s.records.length<steps.length;
 const profile=s=>s.records.filter(r=>r.point&&r.id!=='recovery').map(r=>({point:r.point,depth:r.depth,drop:r.depth-s.records[0].depth}));
 function begin(s){if(s.started)return false;s.started=true;return true;}
 return {id,title,steps,initial,point,current,ready,sanitize,begin,eligible,record,report,deployed,profile,knownUID};
})();

const oceanStory=(()=>{
 const R=StoryRules,H=HadalStoryRules,state=()=>oceanFeatures.state('story');let recording=false,subject=null,sensorBatch=null,hadalRecording=false,hadalSubject=null;
 const hadalState=()=>state().hadal||H.initial();
 const panel=()=>state().investigation==='hadal'&&hadalState().started?'hadal':state().started?'story':hadalState().started?'hadal':null;
 function selectQuest(type){const value=type==='hadal'?'hadal':'echoes';if(state().investigation!==value){cancel();state().investigation=value;saveVoyage();}}
 function openQuest(type){if(!['story','hadal'].includes(type))return false;selectQuest(type);openPanel(type);return true;}
 function hadalDestination(step=H.current(hadalState())){return step?.point?'study:'+step.point:step?.species?'habitat:'+step.species:null;}
 function hadalActivity(){const s=hadalState(),step=H.current(s);return {id:H.id,panel:'hadal',title:H.title,status:!s.started?'available':s.reported?'complete':H.ready(s)?'ready':'active',detail:!s.started?'澄邀你到 7,000 m 海溝底，沿真正切溝完成一份剖面與生物記錄。':s.reported?'剖面、獅子魚個體與澄的解讀已收錄，可隨時重讀。':H.ready(s)?active?'器材已回收。儲存並回首頁，再打開調查冊回報。':'現地記錄已齊備，打開調查冊回報。':step.title,progress:s.started?'現地記錄 '+s.records.length+' / '+H.steps.length:'',destination:hadalDestination()};}
 function hadalBegin(){const s=state().hadal||(state().hadal=H.initial());if(!H.begin(s))return false;selectQuest('hadal');changed();renderHadal();return true;}
 function hadalContext(allowPanel=false){
  const step=H.current(hadalState()),p=step?.point?H.point(step.point):null;let target=p?V.add(p.p,[0,step.point==='hadal-reference'?.55:.35,0]):null,animalFramed=true,selectedUID=null,manualSelection=false,minimum=0,maximum=2;
  if(step?.species){const fish=typeof oceanSelection!=='undefined'?oceanSelection.target():null,sp=fish&&SPECIES[fish.species];
   if(fish&&sp?.id===step.species&&H.knownUID(fish.uid)&&fish.ecologyPresent!==false&&!(fish.retreat>.8)&&!(fish.faunaVisibility<.8)){
    selectedUID=fish.uid;manualSelection=['pointer','key'].includes(oceanSelection.snapshot()?.source);target=animalFocusPoint(fish);animalFramed=R.animalInFrame(fish,sp,renderer.vp);minimum=Math.max(.5,(sp.bodyLength||1)*(sp.size||1)*.8);maximum=speciesTraits(sp).observeDistance;
   }else animalFramed=false;
  }
  const screen=target&&project(target,renderer.vp);
  return {stepId:step?.id||null,kind:step?.kind||null,active,paused:!!photoOpen||document.hidden||(typeof document.hasFocus==='function'&&!document.hasFocus())||!!modal&&!(allowPanel&&modal==='hadal'),player:player.p,eye,target,pointId:step?.point,speed:V.len(player.velocity),inFrame:animalFramed&&!!screen&&screen[2]>0&&Math.abs(screen[0])<.88&&Math.abs(screen[1])<.82,occluded:!target||blocked(eye,target,.04),minimum,maximum,selectedUID,manualSelection,subjectUID:hadalSubject||selectedUID};
 }
 function hadalStartRecording(){const s=hadalState(),ctx=hadalContext(true);if(!H.eligible(s,ctx)){toast('先靠近目前測點並停穩；觀察獅子魚時須主動選取，讓完整輪廓留在視線裡。');return false;}selectQuest('hadal');closePanel();resetInput();stopAuto();hadalRecording=true;hadalSubject=ctx.selectedUID;s.elapsed=0;toast(H.current(s).title+' · 維持視線與距離');return true;}
 function hadalReport(){if(!H.report(hadalState(),active)){toast('完成現地記錄並回收基準儀，再儲存並回首頁回報。');return false;}cancel();changed();renderHadal();return true;}
 function renderHadal(){
  const s=hadalState(),step=H.current(s),profile=H.profile(s),observation=s.records.find(r=>r.id==='snailfish'),can=!!step&&H.eligible(s,hadalContext(true));panelTitle('HADAL / FIELD JOURNAL',H.title);
  $('panelBody').innerHTML='<p class="panel-note">澄：7,000 m 海溝站旁有一道海圖未標出的折痕。部署基準儀，親自沿坡記錄，再回泥台觀察獅子魚；最後收回器材，帶著證據回來。</p>'+(!s.started?'<button id="hadalBegin" class="primary">接下這項調查</button>':'<section class="feature-section"><h3>'+safe(hadalActivity().detail)+'</h3>'+H.steps.map((a,i)=>'<p class="story-step '+(i===s.records.length&&!s.reported?'current':'')+'">'+(i<s.records.length?'✓':'○')+' '+safe(a.title)+(i<s.records.length?'<br><small>'+safe(a.note)+'</small>':'')+'</p>').join('')+(step?'<div class="feature-toolbar"><button id="hadalMark" class="muted-btn">標記目前目標 ↗</button><button id="hadalNavigation" class="muted-btn">深海與海溝 ↗</button><button id="hadalRecord" class="primary" '+(can?'':'disabled')+'>開始現地記錄</button></div><p class="feature-muted">'+(step.species?'回泥台，用滑鼠或觸控選取一隻原有獅子魚。停穩，讓整隻魚留在畫面內連續 6 秒。':'沿實際坡面游到標記，距離操作點 2 m 內停穩，面向測點連續 '+step.seconds+' 秒。')+'</p>':H.ready(s)?'<button id="hadalReport" class="primary" '+(active?'disabled':'')+'>回報記錄 · 聽澄的解讀</button><p>請儲存並回首頁，再整理這份記錄。</p>':'')+'</section>')+(profile.length?'<section class="feature-section" id="hadalProfile"><h3>沿坡剖面 · 本作地形記錄</h3><table><thead><tr><th>測點</th><th>深度</th><th>相對基準落差</th></tr></thead><tbody>'+profile.map(r=>'<tr><td>'+safe(H.point(r.point)?.name||r.point)+'</td><td>'+r.depth.toFixed(1)+' m</td><td>'+r.drop.toFixed(1)+' m</td></tr>').join('')+'</tbody></table><p class="feature-muted">數值來自本作原創地形的實際表面，不據此推定地質年代或成因。</p></section>':'')+(observation?'<section class="feature-section" id="hadalIndividual"><h3>泥台上的相遇</h3><p>馬里亞納獅子魚 · '+safe(observation.uid)+'</p><p>主動選取同一個體，完整觀察 6 秒。這份記錄不代表牠造成了切溝。</p></section>':'')+(s.reported?'<section class="feature-section story-report" id="hadalReportReply"><h3>澄的解讀</h3><p>澄：你親自走過的折痕，現在有了可重讀的剖面。泥台到切溝底部下降 '+(profile.at(-1)?.drop||0).toFixed(1)+' m；獅子魚的相遇是另一份個體記錄。我們留下觀察，不用猜測補上地質成因，也沒有把自己的儀器留在海底。</p></section>':'');
  if($('hadalBegin'))$('hadalBegin').onclick=hadalBegin;if($('hadalRecord'))$('hadalRecord').onclick=hadalStartRecording;if($('hadalReport'))$('hadalReport').onclick=hadalReport;
  if($('hadalMark'))$('hadalMark').onclick=()=>{selectQuest('hadal');markPlace(hadalDestination());};if($('hadalNavigation'))$('hadalNavigation').onclick=()=>openPanel('deepsea');
 }
 function destination(step=R.current(state())){return step?.point?'study:'+step.point:step?.species?'habitat:'+step.species:null;}
 // This is a presentation of the saved investigation, never another progress store.
 function activity(){
  const s=state(),chapter=R.chapter(s),step=R.current(s),ready=R.ready(s);
  return {id:'story',panel:'story',status:!s.started?'available':!chapter?'complete':ready?'ready':'active',title:chapter?chapter.title:'回聲潮譜',detail:!s.started?'六章原創調查，從洞中的層理開始。可自由選擇接下。':!chapter?'六章調查已整理完成；可以重讀記錄，也可以繼續自由探索。':ready?'本章現地記錄齊備。'+(active?'儲存並回首頁，再打開調查冊回報。':'打開調查冊，回報記錄並聽澄的解讀。'):step.title,progress:s.started?'已回報 '+s.reports+' / '+R.chapters.length+' 章'+(chapter?' · 本章記錄 '+s.step+' / '+chapter.steps.length:''):'',destination:s.started&&!ready&&step?destination(step):null};
 }
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
 function syncSensors(){if(!sensorBatch)return;sensorBatch.instances=state().sensors.map(id=>({p:OceanRegions.points[id].p.slice(),s:[1,1,1],yaw:0,phase:0}));if(H.deployed(hadalState())){const p=H.point('hadal-reference');if(p)sensorBatch.instances.push({p:p.p.slice(),s:[1,1,1],yaw:0,phase:0});}sensorBatch.visible=sensorBatch.instances.length>0;renderer.updateBatch(sensorBatch);renderer.forceShadow=true;renderer.dirty=true;}
 function cancel(){recording=false;subject=null;state().elapsed=0;hadalRecording=false;hadalSubject=null;if(state().hadal)state().hadal.elapsed=0;}
 function changed(){syncSensors();saveVoyage();renderShip();}
 function begin(){if(!R.begin(state(),voyage.state,active)){toast('讀過眠海號記錄器，再回船接下這段調查。');return false;}selectQuest('story');changed();render();radio(R.chapter(state()).brief);return true;}
 function startRecording(){
  const s=state(),step=R.current(s);if(!step||!R.eligible(s,context(true))){toast('先靠近調查目標，停穩並讓它留在視線裡。');return false;}
  if(step.kind==='cipher'){openPanel('story');return true;}
  selectQuest('story');closePanel();resetInput();stopAuto();recording=true;s.elapsed=0;
  if(step.species){const fish=life.filter(f=>SPECIES[f.species].id===step.species).sort((a,b)=>V.dist(player.p,a.p)-V.dist(player.p,b.p))[0];subject=fish?.uid||null;}
  toast(step.title+' · 維持視線與距離');return true;
 }
 function choose(symbol){const result=R.choose(state(),symbol,context(true));if(!result)toast('刻紋順序未吻合；重新從潮紋開始比對。');else if(R.ready(state())){changed();radio('刻盤的三組線條已對齊。把這份記錄帶回研究船。');toast('解讀完成 · 返回研究船回報');}else{saveVoyage();toast('圖形吻合 · 已比對 '+state().symbols+' / 3');}render();return result;}
 function report(){const chapter=R.chapter(state());if(!R.report(state(),active)){toast('完成本章的現地調查，再回船整理。');return false;}cancel();changed();render();radio(chapter.reply);return true;}
 function tick(dt){
  if(!active){if(hadalRecording)cancel();return;}
  if(hadalRecording){const s=hadalState(),step=H.current(s),ctx=hadalContext();if(!H.eligible(s,ctx)){cancel();toast('記錄已中斷。已完成的調查保留，停穩後可重新開始。');}else if(H.record(s,ctx,dt)){hadalRecording=false;hadalSubject=null;changed();toast(step.note);}}
  if(recording){const step=R.current(state()),ctx=context();if(!R.eligible(state(),ctx)){cancel();toast('記錄已中斷。停穩並重新開始，已完成的調查會保留。');}
   else if(R.record(state(),ctx,dt)){recording=false;subject=null;changed();radio(step.note);toast(R.ready(state())?'本章現地記錄齊備 · 返回研究船回報':'已記錄 · '+step.title);}}
 }
 function paintHUD(){
  if(panel()==='hadal'){
   const s=hadalState(),step=H.current(s),button=$('storyAction');if(button){const shown=active&&!modal&&!photoOpen&&!document.body.classList.contains('cinematic')&&!!step&&(hadalRecording||H.eligible(s,hadalContext()));button.classList.toggle('hidden',!shown);button.textContent=hadalRecording?'記錄中 '+s.elapsed.toFixed(1)+' / '+step.seconds+' 秒 · 點此取消':step?.title+' ↗';}
   $('objectiveName').textContent=H.title+(s.reported?' · 調查完成':'');$('objectiveCount').textContent='記錄 '+s.records.length+' / '+H.steps.length;$('objectiveDetail').textContent=hadalActivity().detail;return;
  }
  const s=state(),chapter=R.chapter(s),step=R.current(s),button=$('storyAction');
  if(button){const shown=active&&!modal&&!photoOpen&&!document.body.classList.contains('cinematic')&&!!step&&(recording||R.eligible(s,context()));button.classList.toggle('hidden',!shown);button.textContent=recording?'記錄中 '+s.elapsed.toFixed(1)+' / '+step.seconds+' 秒 · 點此取消':step?.kind==='cipher'?'解讀刻盤 ↗':step?.title+' ↗';}
  if(s.started){
   $('objectiveName').textContent=chapter?chapter.title:'回聲潮譜 · 調查完成';$('objectiveCount').textContent='調查 '+s.reports+' / '+R.chapters.length;
   $('objectiveDetail').textContent=R.ready(s)?'現地記錄已齊備。返回研究船，在「回聲潮譜」整理回報。':step?step.title+' · 開啟調查冊查看路線與線索。':'儀器已回收，調查冊保留了整段原創故事。';
  }
 }
 function shipRender(){
  let card=$('storyShipCard');if(!card){const board=document.querySelector('.ship-board');if(!board)return;card=document.createElement('section');card.id='storyShipCard';card.className='feature-section';board.append(card);}
  const s=state(),chapter=R.chapter(s);card.innerHTML=`<small>FIELD JOURNAL / 回聲潮譜</small><h3>${s.started?chapter?safe(chapter.title):'把回聲帶回家':'眠海號之後，還有一段路'}</h3><p>${s.started?R.ready(s)?'本章調查已完成，帶回的線索等你解讀。':`${s.reports} / ${R.chapters.length} 章已回報 · ${chapter?safe(chapter.steps[s.step]?.title||'回船整理'):'原創調查完成，可重讀研究記錄。'}`:voyage.state.mode==='free'?'隨時可選擇接下洞窟、遺跡與深淵的調查，或繼續自由探索。':'在眠海號讀取記錄器後，回船接下洞窟、遺跡與深淵的調查。'}</p><button class="muted-btn" id="storyShipOpen">打開調查冊 ↗</button>`;$('storyShipOpen').onclick=()=>openPanel('story');
 }
 function render(){
  const s=state(),chapter=R.chapter(s),step=R.current(s),lastReport=s.reports?R.chapters[s.reports-1]:null,can=!!step&&R.eligible(s,context(true));panelTitle('ECHOES / FIELD JOURNAL','回聲潮譜');
  $('panelBody').innerHTML=`<p class="panel-note">眠海號之後的原創調查 · ${s.reports} / ${R.chapters.length} 章回報。現地記錄需要停穩、保持距離與視線；中斷可重試。</p>${lastReport?`<section id="storyLastReport" class="feature-section story-report"><small>最近的回報 · ${safe(lastReport.title)}</small><h3>澄的解讀</h3><p>${safe(lastReport.reply)}</p></section>`:''}${!s.started?`<section class="feature-section"><h3>澄的邀請</h3><p>手記的最後幾行指向西側洞道。我們一起把這片海未讀完的頁面找回來。</p><button id="storyBegin" class="primary" ${active||(!voyage.state.reading&&voyage.state.mode!=='free')?'disabled':''}>接下調查</button><p class="feature-muted">${voyage.state.mode==='free'?'自由探索可直接選擇接下調查；準備好後，再依自己的步調出發。':'先親自讀取眠海號記錄器，再回船開始。'}</p></section>`:chapter?`<section class="feature-section"><span class="feature-badge">第 ${s.reports+1} 章</span><h3>${safe(chapter.title)}</h3><p>${safe(chapter.brief)}</p>${chapter.steps.map((a,i)=>`<p class="story-step ${i===s.step?'current':''}">${i<s.step?'✓':i===s.step?'→':'○'} ${safe(a.title)}${i<s.step?'<br><small>'+safe(a.note)+'</small>':''}</p>`).join('')}${R.ready(s)?`<button class="primary" id="storyReport" ${active?'disabled':''}>回報記錄 · 聽澄的解讀</button>${active?'<p>請先返回研究船。</p>':''}`:step?`<div class="feature-toolbar"><button class="muted-btn" id="storyMark">標記調查位置 ↗</button><button class="muted-btn" id="storyNavigation">選擇研究船泊位 ↗</button><button class="primary" id="storyRecord" ${can?'':'disabled'}>${step.kind==='cipher'?'在此解讀':'開始現地記錄'}</button></div><p class="feature-muted">${can?'目標已在視線與距離內。':'先游到標記附近，面向目標。洞窟與檔案室須從入口進入。'}${step.seconds?'需要連續 '+step.seconds+' 秒。':''}</p>${step.kind==='cipher'?`<p>石板線索：海先升起，月照在海上，星在月的遠方。</p><p>已比對 ${s.symbols} / 3 個圖形</p><div class="feature-toolbar">${[['wave','≋ 潮紋'],['moon','◐ 月輪'],['star','✦ 星點']].map(([id,label])=>`<button class="muted-btn" data-story-symbol="${id}" ${can?'':'disabled'}>${label}</button>`).join('')}</div>`:''}`:''}</section>`:'<section class="feature-section"><h3>調查已整理完畢</h3><p>三台觀測器已回收。洞窟、遺跡與裂谷仍可隨時重遊；研究桌保存著每一次解讀。</p></section>'}${R.chapters.slice(0,s.reports).map((a,i)=>`<details class="feature-section"><summary>✓ ${i+1} · ${safe(a.title)}</summary><p>${safe(a.reply)}</p>${a.steps.map(b=>`<p><b>${safe(b.title)}</b><br>${safe(b.note)}</p>`).join('')}</details>`).join('')}`;
  if($('storyBegin'))$('storyBegin').onclick=begin;if($('storyReport'))$('storyReport').onclick=report;if($('storyRecord'))$('storyRecord').onclick=startRecording;
  if($('storyMark'))$('storyMark').onclick=()=>{selectQuest('story');markPlace(destination());};if($('storyNavigation'))$('storyNavigation').onclick=()=>openPanel('navigation');
  $('panelBody').querySelectorAll('[data-story-symbol]').forEach(b=>b.onclick=()=>choose(b.dataset.storySymbol));
 }
 function init(){
  const g=new Geometry();g.material=0;g.box([0,.18,0],[.40,.32,.28],[.74,.55,.15]);g.tube([0,.30,0],[0,.90,0],.027,.018,[.31,.37,.38],8);g.sphere([0,.94,0],[.10,.08,.10],[.65,.77,.66],12,8);
  for(const x of [-.26,.26])g.tube([0,.15,0],[x,.015,.18],.025,.025,[.29,.33,.31],8);
  sensorBatch=renderer.batch(g,Array.from({length:4},()=>({p:[0,-200,0]})),0,true);sensorBatch.maxDistance=55;syncSensors();
  const b=document.createElement('button');b.id='storyAction';b.className='pill-btn hidden';b.onclick=()=>recording||hadalRecording?cancel():panel()==='hadal'?hadalStartRecording():startRecording();$('hud').append(b);
  const style=document.createElement('style');style.textContent='#storyAction{position:fixed;left:50%;top:66%;transform:translateX(-50%);max-width:min(460px,82vw);white-space:normal;min-height:44px;background:#10353beb;z-index:12}.story-step{padding:10px 0;border-bottom:1px solid #a6c9bc22}.story-step.current{color:#e4ddb7}.story-step small{font-size:12px;color:#a9c5bd}#storyShipCard small{font-size:10px;letter-spacing:.1em}#storyShipCard p{font-size:12px}#storyShipCard h3{font-size:21px}@media(pointer:coarse){#storyAction{top:57%;font-size:11px;max-width:70vw}}@media(max-height:550px) and (orientation:landscape){#storyAction{top:52%;max-width:48vw}}';document.head.append(style);
  window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  oceanFeatures.addMenu({id:'story',label:'回聲潮譜 · 調查冊',panel:'story'});oceanFeatures.addMenu({id:'hadal',label:'海圖上的折痕 · 調查冊',panel:'hadal'});oceanActivities.init();shipRender();
 }
 const feature={id:'story',initial:()=>({...R.initial(),hadal:H.initial(),investigation:'echoes'}),sanitize:raw=>({...R.sanitize(raw),hadal:H.sanitize(raw?.hadal),investigation:raw?.investigation==='hadal'?'hadal':'echoes'}),init,tick,paintHUD,shipRender,photoOpened:cancel,panelChanged:cancel,endDive:cancel,reset(){cancel();syncSensors();shipRender();},startDive(){cancel();if(state().started&&R.chapter(state()))radio(R.chapter(state()).brief);},renderPanel(type){if(type==='activities'){oceanActivities.render();return true;}if(type==='hadal'){if(hadalState().started)selectQuest('hadal');renderHadal();return true;}if(type!=='story')return false;if(state().started)selectQuest('story');render();return true;}};oceanFeatures.register(feature);
 return {rules:R,feature,activity,panel,openQuest,selectQuest,hadal:{rules:H,begin:hadalBegin,activity:hadalActivity,destination:hadalDestination,startRecording:hadalStartRecording,report:hadalReport,context:hadalContext,snapshot:()=>JSON.parse(JSON.stringify(hadalState()))},begin,startRecording,choose,report,context,destination,snapshot:()=>JSON.parse(JSON.stringify(state()))};
})();


/* A shared, stateless entry to the existing investigation and commissions.
 * The registered story lifecycle owns the panel; saved feature data stays put. */
const oceanActivities=(()=>{
 const labels={available:'未接下',active:'進行中',ready:'待回報',complete:'已完成'};
 function list(){return [oceanStory.activity(),oceanStory.hadal.activity(),...oceanExpedition.activities()];}
 function render(){
  panelTitle('FIELD WORK','調查與委託');
  $('panelBody').innerHTML='<p class="panel-note">選一段想繼續的探索。所有工作都可自行選擇；沒有倒數，也不會限制你游向別處。</p><div class="activities-list">'+list().map(a=>`<article class="activity-card" data-activity-state="${safe(a.status)}"><span class="feature-badge">${labels[a.status]}</span><h3>${safe(a.title)}</h3><p>${safe(a.detail)}</p>${a.progress?`<small>${safe(a.progress)}</small>`:''}<div class="feature-toolbar"><button class="muted-btn" data-activity-open="${safe(a.panel)}" data-activity-id="${safe(a.id)}">${a.panel==='mail'?'打開這封信':a.status==='available'?'了解這項調查':a.status==='complete'?'重讀調查冊':'打開調查冊'} ↗</button>${a.destination?`<button class="muted-btn" data-activity-mark="${safe(a.id)}">標記目前目標 ↗</button>`:''}${a.kind==='photo'&&['active','ready'].includes(a.status)?'<button class="muted-btn" data-activity-photos>沖印與相簿 ↗</button>':''}</div></article>`).join('')+'</div>';
  $('panelBody').querySelectorAll('[data-activity-open]').forEach(button=>button.onclick=()=>{if(button.dataset.activityOpen==='mail')oceanExpedition.openMail(button.dataset.activityId);else oceanStory.openQuest(button.dataset.activityOpen);});
  $('panelBody').querySelectorAll('[data-activity-photos]').forEach(button=>button.onclick=()=>openPanel('photography'));
  $('panelBody').querySelectorAll('[data-activity-mark]').forEach(button=>button.onclick=()=>{const activity=list().find(a=>a.id===button.dataset.activityMark);if(activity?.destination){if(['story','hadal'].includes(activity.panel))oceanStory.selectQuest(activity.panel);markPlace(activity.destination);}});
 }
 function init(){const button=$('welcomeActivities');if(button)button.onclick=()=>openPanel('activities');}
 return {init,render};
})();
