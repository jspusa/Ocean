/* Standard-controller navigation for existing visible menus. It reuses each
 * control's normal handlers; swimming and canvas gestures remain separate. */
const oceanGamepadUI=(()=>{
 const directions=[12,13,14,15],selector='button,input:not([type="file"]),select,a[href],summary';
 let heldDirection=-1,nextRepeat=0,scopeKey=null,lastFocusID=null,outlined=null,installed=false;
 const node=id=>document.getElementById(id);
 function clearOutline(){outlined?.classList.remove('gamepad-focus');outlined=null;}
 function visible(el){
  if(!el||el.disabled||el.matches?.(':disabled')||el.tabIndex<0||el.type==='file'||el.closest?.('[hidden],[inert],[aria-hidden="true"],.hidden')||!el.getClientRects().length)return false;
  // Closed details can retain descendant layout boxes. Only their direct
  // summary branch is interactive; focusing a hidden child falls back to it.
  let branch=el;for(let parent=el.parentElement;parent;branch=parent,parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&branch.tagName!=='SUMMARY')return false;
  const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden';
 }
 function install(){
  if(installed)return;installed=true;const style=document.createElement('style');style.id='gamepadFocusStyle';style.textContent='.gamepad-focus{outline:2px solid #e1dcae!important;outline-offset:3px!important}';document.head.append(style);
  window.addEventListener('pointerdown',clearOutline,true);window.addEventListener('keydown',clearOutline,true);
 }
 function focus(el){
  if(!el)return;install();clearOutline();el.classList.add('gamepad-focus');outlined=el;lastFocusID=el.id||null;el.focus();el.scrollIntoView?.({block:'nearest',inline:'nearest'});
 }
 function scopes(){
  if(photoOpen)return {key:'photo',roots:[node('photoViewer')]};
  if(modal){const extra=modal==='aquariumView'?'aquariumViewer':modal==='deck'?'shipWalkUI':modal==='shipRest'?'shipRestUI':null;return {key:'panel:'+modal,roots:[node('panel'),extra&&node(extra)].filter(Boolean)};}
  if(!active)return {key:'home',roots:[node('welcome')]};
  return null;
 }
 function controls(scope){return scope.roots.filter(Boolean).flatMap(root=>[...root.querySelectorAll(selector)]).filter(visible);}
 function current(list){return list.includes(document.activeElement)?document.activeElement:list.find(el=>el.id&&el.id===lastFocusID)||null;}
 function change(el,direction){
  let changed=false;
  if(el.tagName==='SELECT'){
   const options=el.options;let index=el.selectedIndex+direction;
   while(index>=0&&index<options.length&&(options[index].disabled||options[index].hidden||options[index].parentElement?.disabled))index+=direction;
   if(index>=0&&index<options.length&&index!==el.selectedIndex){el.selectedIndex=index;changed=true;}
  }else if(el.tagName==='INPUT'&&el.type==='range'){
   const min=el.min===''?0:Number(el.min),max=el.max===''?100:Number(el.max),step=Number(el.step)>0?Number(el.step):1,value=Number(el.value),next=Math.max(min,Math.min(max,Number((value+direction*step).toPrecision(12))));
   if(Number.isFinite(next)&&next!==value){el.value=String(next);changed=true;}
  }else return false;
  focus(el);
  if(changed){const id=el.id;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));const replacement=id&&node(id);if(replacement&&visible(replacement))focus(replacement);}
  return true;
 }
 function disconnect(){heldDirection=-1;nextRepeat=0;scopeKey=null;lastFocusID=null;clearOutline();}
 function afterBack(){clearOutline();if(active&&!modal&&!photoOpen&&!visible(document.activeElement))node('ocean')?.focus();}
 function poll(gamepad,previous=[],now=performance.now()){
  if(gamepad.buttons[9]?.pressed&&!previous[9]){if(modal&&!photoOpen){closePanel();afterBack();return true;}return false;}
  // A connected idle pad adds no DOM traversal or focus work to the frame loop.
  if(active&&!modal&&!photoOpen){heldDirection=-1;nextRepeat=0;return false;}
  let uiInput=false;for(const index of directions)if(gamepad.buttons[index]?.pressed){uiInput=true;break;}
  if(!uiInput&&!gamepad.buttons[0]?.pressed&&!gamepad.buttons[1]?.pressed){heldDirection=-1;nextRepeat=0;return false;}
  const scope=scopes();if(!scope){heldDirection=-1;nextRepeat=0;return false;}
  if(scope.key!==scopeKey){scopeKey=scope.key;lastFocusID=null;heldDirection=-1;nextRepeat=0;clearOutline();}
  const pressed=index=>!!gamepad.buttons[index]?.pressed&&!previous[index];
  if(pressed(1)){
   if(photoOpen){closePhoto();afterBack();return true;}if(modal){closePanel();afterBack();return true;}return false;
  }
  const direction=directions.find(index=>gamepad.buttons[index]?.pressed);
  if(direction===undefined){heldDirection=-1;nextRepeat=0;}
  else{
   const first=direction!==heldDirection||!previous[direction];
   if(!first&&now<nextRepeat)return true;
   heldDirection=direction;nextRepeat=now+(first?350:160);
   const list=controls(scope);if(!list.length)return true;const selected=current(list);
   if((direction===14||direction===15)&&selected&&change(selected,direction===14?-1:1))return true;
   const delta=direction===12||direction===14?-1:1,index=selected?list.indexOf(selected):-1;
   focus(list[index<0?(delta>0?0:list.length-1):(index+delta+list.length)%list.length]);return true;
  }
  if(pressed(0)){
   const list=controls(scope),selected=current(list)||list.find(el=>el.id==='startBtn')||list[0];if(!selected)return false;focus(selected);
   // Text entry, native pickers and media activation retain browser gesture
   // rules. Selecting/range changes use the D-pad without opening a picker.
   if(selected.tagName==='SELECT'||selected.tagName==='INPUT'&&['text','number','range','email','password'].includes(selected.type))return true;
   selected.click();return true;
  }
  return false;
 }
 return {poll,disconnect};
})();
