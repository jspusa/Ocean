/* One voyage clock, a derived calendar, and authored encounter windows.
 * The dates/hours are this game's calendar, not a Wii or field-sighting table.
 * Wild presence never deletes an actor, its identity, knowledge or photograph. */
const OceanSeasonRules=(()=>{
 'use strict';
 const MAX_DAY=9999,seasonNames={spring:'春',summer:'夏',autumn:'秋',winter:'冬'};
 const profiles=Object.freeze({
  beluga:{wild:false,label:'北極與亞北極冷水棲地；不在這片暖水海域自然出現'},
  white_sided_dolphin:{wild:false,label:'北太平洋溫帶與冷水棲地；不在這片暖水海域自然出現'},
  commerson_dolphin:{wild:false,label:'南半球寒冷近岸棲地；不在這片暖水海域自然出現'},
  nautilus:{night:true,label:'夜間上浮 · 18:00–06:00'}
 });
 const dayNumber=v=>Number.isFinite(v)?Math.floor(Math.max(1,Math.min(MAX_DAY,v))):1;
 const minuteNumber=v=>Number.isFinite(v)?Math.max(0,Math.min(1439.999,v)):540;
 const leap=y=>y%4===0&&(y%100!==0||y%400===0);
 function date(day){let offset=dayNumber(day)-1+151,year=1;while(offset>=(leap(year)?366:365)){offset-=leap(year)?366:365;year++;}const lengths=[31,leap(year)?29:28,31,30,31,30,31,31,30,31,30,31];let month=1;while(offset>=lengths[month-1])offset-=lengths[month++-1];const season=month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';return {year,month,day:offset+1,season,seasonName:seasonNames[season]};}
 function available(id,day,minute){const p=profiles[id];return !p||p.wild!==false&&(!p.months||p.months.includes(date(day).month))&&(!p.night||minuteNumber(minute)>=1080||minuteNumber(minute)<360);}
 function nextWindow(id,day,minute){if(profiles[id]?.wild===false)return null;day=dayNumber(day);minute=minuteNumber(minute);if(available(id,day,minute))return {day,minute};for(let n=0;n<=366&&day+n<=MAX_DAY;n++)for(const m of n===0?[1080]:[0,1080])if((n||m>minute)&&available(id,day+n,m))return {day:day+n,minute:m};return null;}
 function daysToSeason(day){day=dayNumber(day);const season=date(day).season;for(let n=1;n<=93&&day+n<=MAX_DAY;n++)if(date(day+n).season!==season)return n;return 0;}
 const clock=minute=>`${String(Math.floor(minuteNumber(minute)/60)).padStart(2,'0')}:${String(Math.floor(minuteNumber(minute)%60)).padStart(2,'0')}`;
 const label=day=>{const d=date(day);return `航程 ${d.year} 年 ${d.month} 月 ${d.day} 日 · ${d.seasonName}季`;};
 const visitor=(day,dives)=>dives>0?(['autumn','winter'].includes(date(day).season)?'penguin':'seal'):null;
 return {MAX_DAY,profiles,date,available,nextWindow,daysToSeason,clock,label,visitor};
})();
const oceanSeasons=(()=>{
 'use strict';
 let key='',pending=[],ownedKey='';
 const state=()=>oceanFeatures.state('expedition');
 const animals=()=>typeof life==='undefined'?[]:life;
 function outOfView(f){
  if(typeof renderer==='undefined'||!renderer.vp||typeof animalFocusPoint==='undefined')return false;
  const aim=animalFocusPoint(f),p=project(aim,renderer.vp),sp=SPECIES[f.species],span=sp?.modelBounds?.size||[1,1,1],radius=Math.max(...f.s)*Math.hypot(...span)*.55+.05;
  if(p[2]<-radius)return true;if(p[2]<=radius)return false;
  const ry=radius/((p[2]-radius)*Math.tan((renderer.photoFov||renderer.fov||69)*Math.PI/360)),aspect=(renderer.width||1)/(renderer.height||1);
  return Math.abs(p[0])>1+ry/aspect||Math.abs(p[1])>1+ry;
 }
 function sync(force=false){
  const s=state(),owned=voyage.state.features?.ecology?.partners||[],nextOwned=owned.map(p=>p.uid).join('|'),nextKey=s.day+':'+Math.floor(s.minute);
  if(force||key!==nextKey||ownedKey!==nextOwned){
   key=nextKey;ownedKey=nextOwned;const companions=new Set(owned.map(p=>p.uid));pending=[];
   for(const f of animals()){
    const wanted=companions.has(f.uid)||f.encounterPresent!==false&&f.wildHabitat!==false&&OceanSeasonRules.available(SPECIES[f.species]?.id,s.day,s.minute);
    f.ecologyScheduled=wanted;
    if(force||!active||f.ecologyPresent===undefined){f.ecologyPresent=wanted;continue;}
    if(f.ecologyPresent!==wanted)pending.push(f);
   }
  }
  // Clock boundaries cannot make an animal appear/disappear in a close view.
  // Its seasonal journey completes out of frame or after swimmer and camera leave.
  pending=pending.filter(f=>{if(!active||V.dist(player.p,f.p)>60&&V.dist(eye,f.p)>60||outOfView(f)){f.ecologyPresent=f.ecologyScheduled;return false;}return true;});
 }
 function info(id){const s=state(),profile=OceanSeasonRules.profiles[id],scheduled=OceanSeasonRules.available(id,s.day,s.minute),present=animals().some(f=>SPECIES[f.species]?.id===id&&f.ecologyPresent!==false),next=OceanSeasonRules.nextWindow(id,s.day,s.minute);return {scheduled,present,label:profile?.label||'全年常住 · 日夜可見',next};}
 function hint(id){const a=info(id);if(OceanSeasonRules.profiles[id]?.wild===false)return a.label;if(a.scheduled)return a.label+(a.present?' · 目前可尋找':' · 正在靠近棲地，環視周邊後再觀察');if(a.present)return a.label+' · 附近仍有停留的個體';const next=a.next;return a.label+(next?' · 下次 '+OceanSeasonRules.label(next.day)+' '+OceanSeasonRules.clock(next.minute):' · 航程日曆已到上限');}
 function guideHTML(id){return `<div class="info-row"><label>相遇時節</label><p>${hint(id)}</p></div>`;}
 function panelHTML(){const s=state(),wait=OceanSeasonRules.daysToSeason(s.day),disabled=active?'disabled':'';return `<section class="feature-section" id="seasonCalendar"><h3>航海日曆</h3><p>${OceanSeasonRules.label(s.day)} · ${OceanSeasonRules.clock(s.minute)}</p><p>回船休息，等待下一次相遇。已記錄的圖鑑、夥伴與水族館收藏會保留。</p><div class="feature-toolbar"><button class="muted-btn" data-wait-days="1" ${disabled||s.day>=OceanSeasonRules.MAX_DAY?'disabled':''}>休息一天</button><button class="muted-btn" data-wait-days="7" ${disabled||s.day+7>OceanSeasonRules.MAX_DAY?'disabled':''}>休息七天</button><button class="muted-btn" data-wait-days="${wait}" ${disabled||!wait?'disabled':''}>等待下一季</button></div><div class="season-encounters">${Object.keys(OceanSeasonRules.profiles).map(id=>{const sp=SPECIES.find(sp=>sp.id===id);if(!sp)return '';return `<article class="season-encounter"><strong>${sp.name}</strong><p>${hint(id)}</p><button class="muted-btn" data-season-species="${id}">查看圖鑑與棲地 ↗</button></article>`;}).join('')}</div><p class="feature-muted">月份與相遇時段為歸潮海域的原創安排；並非現地生物預報。</p></section>`;}
 function bindPanel(){document.querySelectorAll('[data-wait-days]').forEach(b=>b.onclick=()=>{if(oceanExpedition.restDays(Number(b.dataset.waitDays)))oceanFeatures.renderPanel('research');});document.querySelectorAll('[data-season-species]').forEach(b=>b.onclick=()=>{openPanel('journal');renderSpecies(SPECIES.findIndex(sp=>sp.id===b.dataset.seasonSpecies));});}
 return {sync,info,hint,guideHTML,panelHTML,bindPanel,snapshot:()=>({day:state().day,minute:state().minute,date:OceanSeasonRules.date(state().day),pending:pending.map(f=>f.uid),present:animals().filter(f=>f.ecologyPresent!==false).length})};
})();
