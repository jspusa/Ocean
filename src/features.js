/* Persistent gameplay modules. All state travels with the existing voyage save. */
const oceanFeatures=(()=>{
 const systems=[],menus=[];let initialized=false;
 const call=(name,...args)=>{for(const module of systems)module[name]?.(...args)};
 const some=(name,...args)=>systems.some(module=>module[name]?.(...args)===true);
 function read(raw){const clean={};for(const module of systems)clean[module.id]=module.sanitize(raw?.[module.id]);return clean;}
 function state(id){if(!voyage.state.features)voyage.state.features={};if(!voyage.state.features[id]){const module=systems.find(m=>m.id===id);if(!module)throw new Error('Unknown gameplay module '+id);voyage.state.features[id]=module.initial();}return voyage.state.features[id];}
 function open(type){openPanel(type)}
 function renderPanel(type){
  if(type==='fieldTools'){
   panelTitle('DIVE TOOLBOX','潛水工具');$('panelBody').innerHTML='<p class="panel-note">選擇工具後回到海中操作。船上的研究桌保存每一次相遇與發現。</p><div class="feature-menu">'+menus.map(m=>`<button class="muted-btn" data-feature="${safe(m.panel)}">${safe(m.label)} <span>↗</span></button>`).join('')+'</div>';
   $('panelBody').querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>open(b.dataset.feature));return true;
  }
  return some('renderPanel',type);
 }
 function addMenu(item){if(menus.some(m=>m.id===item.id))return;menus.push(item);if(initialized)renderMenus();}
 function renderMenus(){
  let nav=$('shipResearch');if(!nav){nav=document.createElement('nav');nav.id='shipResearch';nav.setAttribute('aria-label','船上研究工作');document.querySelector('.ship-board').append(nav);}
  nav.innerHTML=menus.map(m=>`<button data-feature="${safe(m.panel)}">${safe(m.label)} ↗</button>`).join('');nav.querySelectorAll('button').forEach(b=>b.onclick=()=>open(b.dataset.feature));
 }
 function init(){
  if(initialized)return;voyage.state.features=read(voyage.state.features);initialized=true;
  const style=document.createElement('style');style.textContent='.feature-menu{display:grid;gap:10px}.feature-menu>button{display:flex;justify-content:space-between;text-align:left;min-height:48px}#shipResearch{margin-top:10px;padding-top:10px;border-top:1px solid #b9d6d526}.feature-badge{display:inline-block;padding:4px 8px;border-radius:5px;background:#bad6c31a;color:#cde2d7;font-size:11px}.feature-muted{color:#90b1b6}.feature-toolbar{display:flex;gap:8px;flex-wrap:wrap}.feature-toolbar button{min-height:44px}.feature-section{border-top:1px solid #92b3ac26;padding:18px 0}.feature-section h3{margin:0 0 10px}.feature-section p{line-height:1.65;color:#b0c9c7}.feature-section input[type=text]{max-width:100%;padding:10px;border:1px solid #91b8ad55;border-radius:8px;background:#0a2935;color:#e1eee4}.feature-result{padding:10px 12px;border-left:2px solid #d1c494;background:#c6dacc0b;line-height:1.6}.feature-counter{font-variant-numeric:tabular-nums}@media(pointer:coarse){#fieldToolsBtn{position:fixed;top:184px;right:calc(var(--edge) + 52px);width:44px;min-width:44px;height:44px;padding:0;font-size:9px}}@media(pointer:coarse) and (max-height:550px) and (orientation:landscape){#fieldToolsBtn{position:static;width:auto;min-width:44px;height:38px;padding:8px 12px}}';document.head.append(style);
  const toolsButton=document.createElement('button');toolsButton.id='fieldToolsBtn';toolsButton.className='pill-btn';toolsButton.textContent='工具';toolsButton.title='潛水工具（T）';toolsButton.onclick=()=>open('fieldTools');document.querySelector('.view-tools').append(toolsButton);
  call('init');renderMenus();
  const oldLife=updateLife;updateLife=function(time){oldLife(time);call('afterLife',time)};
  window.addEventListener('keydown',event=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   if(event.code==='Escape'&&some('escape')){event.preventDefault();event.stopImmediatePropagation();return;}
   if(event.code==='KeyT'&&active&&!modal&&!photoOpen&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();open('fieldTools');}
  },true);
 }
 function reset(){voyage.state.features=read(voyage.state.features);call('reset');}
 return {register(module){if(systems.some(m=>m.id===module.id))throw new Error('Duplicate gameplay module');systems.push(module)},read,state,init,reset,call,some,open,addMenu,renderPanel,retainedPhotoDates(){const dates=[];call('retainPhotos',dates);return new Set(dates.filter(Number.isFinite));},pointerCaptured:()=>some('pointerCaptured'),shouldAnimate:()=>some('shouldAnimate'),drawMap:(...args)=>call('drawMap',...args)};
})();
