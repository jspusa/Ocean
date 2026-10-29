/* Persistent gameplay modules. All state travels with the existing voyage save. */
const oceanFeatures=(()=>{
 const systems=[],menus=[];let initialized=false;
 const call=(name,...args)=>{for(const module of systems)module[name]?.(...args)};
 const some=(name,...args)=>systems.some(module=>module[name]?.(...args)===true);
 function read(raw){const clean={};for(const module of systems)clean[module.id]=module.sanitize(raw?.[module.id]);return clean;}
 function state(id){if(!voyage.state.features)voyage.state.features={};if(!voyage.state.features[id]){const module=systems.find(m=>m.id===id);if(!module)throw new Error('Unknown gameplay module '+id);voyage.state.features[id]=module.initial();}return voyage.state.features[id];}
 function open(type){openPanel(type)}
 function renderPanel(type){
  if(oceanDiveUI.renderMenu(type,menus)){
   $('panelBody').querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>open(b.dataset.feature));return true;
  }
  return some('renderPanel',type);
 }
 function addMenu(item){if(menus.some(m=>m.id===item.id))return;menus.push(item);if(initialized)renderMenus();}
 function renderMenus(){
  let nav=$('shipResearch');if(!nav){nav=document.createElement('nav');nav.id='shipResearch';nav.setAttribute('aria-label','船上研究工作');document.querySelector('.ship-board').append(nav);}
  nav.innerHTML=menus.map(m=>`<button data-feature="${safe(m.panel)}">${safe(m.label)} ↗</button>`).join('');nav.querySelectorAll('button').forEach(b=>b.onclick=()=>open(b.dataset.feature));
 }
 async function init(){
  if(initialized)return;voyage.state.features=read(voyage.state.features);initialized=true;
  for(const module of systems)await module.init?.();renderMenus();
  const oldLife=updateLife;updateLife=function(time){
   if(typeof updateLifeWithEffects==='function'){if(updateLifeWithEffects(time,oldLife,()=>call('afterLife',time)))call('afterLifeContact',time);}
   else {oldLife(time);call('afterLife',time);}
  };
  window.addEventListener('keydown',event=>{if(oceanKeyboard.reserved(event))return;
   if(event.code==='Escape'&&some('escape')){event.preventDefault();event.stopImmediatePropagation();return;}
   if(event.code==='KeyT'&&active&&!modal&&!photoOpen&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();open('fieldTools');}
  },true);
 }
 function reset(){if(typeof oceanSelection!=='undefined')oceanSelection.clear();voyage.state.features=read(voyage.state.features);call('reset');}
 return {register(module){if(systems.some(m=>m.id===module.id))throw new Error('Duplicate gameplay module');systems.push(module)},read,state,init,reset,call,some,open,addMenu,renderPanel,retainedPhotoDates(){const dates=[];call('retainPhotos',dates);return new Set(dates.filter(Number.isFinite));},pointerCaptured:()=>some('pointerCaptured'),shouldAnimate:()=>some('shouldAnimate'),drawMap:(...args)=>call('drawMap',...args)};
})();
