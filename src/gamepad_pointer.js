/* Optional controller pointer. DOM events remain untrusted browser events;
 * virtual capture is kept here instead of sending a fabricated ID to the UA. */
const oceanGamepadPointer=(()=>{
 const pointerID=2147483000,ownedEvents=new WeakSet();
 let enabled=false,waiting=false,cursor=null,hint=null,hintUntil=0,x=0,y=0,down=null,captured=null,lastTime=null,contextKey=null,padKey=null,repeatDirection=-1,repeatAt=0;
 const context=()=>[active,modal,photoOpen,voyage.photoMode,typeof oceanExploration==='undefined'?null:oceanExploration.penMode,typeof oceanEcology==='undefined'?null:oceanEcology.snapshot().tool].join('|');
 function visible(el){if(!el||el.isConnected===false||el.disabled||el.matches?.(':disabled')||el.closest?.('[hidden],[inert],[aria-hidden="true"],.hidden')||!el.getClientRects?.().length)return false;const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden';}
 function hit(){const el=document.elementFromPoint(x,y),control=activation(el);if(!visible(control))return null;return visible(el)?el:control;}
 function activation(el){return el?.closest?.('button,input,select,a[href],summary,label,textarea,[contenteditable]')||el;}
 function nativeControl(el){const control=el?.control||el;return control&&(control.tagName==='TEXTAREA'||control.matches?.('[contenteditable]')||control.tagName==='INPUT'&&!['button','submit','reset','checkbox','radio','range'].includes(control.type))?control:null;}
 function dispatch(el,type,buttons=0){if(!el)return;const event=new PointerEvent(type,{bubbles:true,cancelable:true,view:window,pointerId:pointerID,pointerType:'gamepad',isPrimary:true,clientX:x,clientY:y,button:type==='pointermove'?-1:0,buttons,pressure:buttons?.5:0,width:1,height:1});ownedEvents.add(event);el.dispatchEvent(event);return event;}
 function capture(element,event){
  if(!ownedEvents.has(event))return element.setPointerCapture?.(event.pointerId);
  if(captured===element)return;if(captured)release(captured,pointerID);captured=element;dispatch(element,'gotpointercapture',down?1:0);
 }
 function hasCapture(element,id){return id===pointerID?captured===element:!!element.hasPointerCapture?.(id);}
 function release(element,id){if(id!==pointerID)return element.releasePointerCapture?.(id);if(captured!==element)return;captured=null;dispatch(element,'lostpointercapture',down?1:0);}
 function cancel(){const gesture=down;down=null;if(gesture)dispatch(captured||gesture.element,'pointercancel');if(captured)release(captured,pointerID);}
 function changed(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));const replacement=el.id&&document.getElementById(el.id);if(visible(replacement))replacement.focus?.({preventScroll:true});}
 function adjust(el,index){
  if(!visible(el))return;let direction=index===12||index===14?-1:1;
  if(el.tagName==='SELECT'){
   const options=el.options;let next=el.selectedIndex+direction;while(next>=0&&next<options.length&&(options[next].disabled||options[next].hidden||options[next].parentElement?.disabled))next+=direction;
   if(next>=0&&next<options.length&&next!==el.selectedIndex){el.selectedIndex=next;changed(el);}
  }else if(el.tagName==='INPUT'&&el.type==='range'){
   if(index===12||index===13)direction=-direction;const min=el.min===''?0:Number(el.min),max=el.max===''?100:Number(el.max),step=Number(el.step)>0?Number(el.step):1,next=Math.max(min,Math.min(max,Number((Number(el.value)+direction*step).toPrecision(12))));
   if(Number.isFinite(next)&&next!==Number(el.value)){el.value=String(next);changed(el);}
  }
 }
 function rangeAt(el){
  const rect=el.getBoundingClientRect();if(!(rect.width>0))return;const min=el.min===''?0:Number(el.min),max=el.max===''?100:Number(el.max),step=Number(el.step)>0?Number(el.step):Math.max(.01,(max-min)/100);let fraction=Math.max(0,Math.min(1,(x-rect.left)/rect.width));if(getComputedStyle(el).direction==='rtl')fraction=1-fraction;
  const next=Math.max(min,Math.min(max,Number((min+Math.round(fraction*(max-min)/step)*step).toPrecision(12))));
  if(Number.isFinite(next)&&next!==Number(el.value)){el.value=String(next);if(down)down.rangeChanged=true;el.dispatchEvent(new Event('input',{bubbles:true}));}
 }
 function scroll(dx,dy){
  const target=hit();if(!target)return;const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,deltaX:dx,deltaY:dy,deltaMode:0});if(!target.dispatchEvent(event))return;
  for(let el=target;el;el=el.parentElement){const style=getComputedStyle(el),vertical=dy&&/(auto|scroll)/.test(style.overflowY)&&el.scrollHeight>el.clientHeight,horizontal=dx&&/(auto|scroll)/.test(style.overflowX)&&el.scrollWidth>el.clientWidth;if(vertical||horizontal){el.scrollBy({left:horizontal?dx:0,top:vertical?dy:0,behavior:'auto'});return;}}
 }
 function clearAxes(){stick=[0,0];lookStick=[0,0];verticalInput=0;}
 function show(now){
  if(!cursor){
   cursor=document.createElement('div');cursor.id='gamepadCursor';cursor.setAttribute('aria-hidden','true');cursor.style.cssText='position:fixed;z-index:1500;width:18px;height:18px;border:2px solid #f3eac6;border-radius:50%;box-shadow:0 1px 5px #001820;transform:translate(-50%,-50%);pointer-events:none';
   hint=document.createElement('div');hint.id='gamepadPointerHint';hint.style.cssText='position:fixed;z-index:1499;top:max(74px,calc(env(safe-area-inset-top) + 60px));left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:7px 11px;border-radius:6px;background:#06232de8;color:#f3eac6;font:12px sans-serif;line-height:1.6;text-align:center;pointer-events:none';document.body.append(cursor,hint);
  }
  x=window.innerWidth/2;y=window.innerHeight/2;cursor.style.left=x+'px';cursor.style.top=y+'px';cursor.hidden=hint.hidden=false;hintUntil=now+5000;hint.textContent='左搖桿移動 · A 點選／拖曳 · 右搖桿捲動 · RT 精細 · B 返回';
 }
 function disconnect(){if(!enabled&&!down&&!captured)return;cancel();enabled=false;waiting=true;if(cursor)cursor.hidden=hint.hidden=true;clearAxes();}
 function contextChanged(){if(!enabled&&!down&&!captured)return;cancel();waiting=true;clearAxes();}
 window.addEventListener('pointerdown',event=>{if(!ownedEvents.has(event))disconnect();},true);
 window.addEventListener('keydown',disconnect,true);window.addEventListener('blur',disconnect);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)disconnect();});
 document.addEventListener('webglcontextlost',disconnect,true);
 function poll(g,previous=[],now=performance.now()){
  const dt=lastTime===null?0:Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
  const pressed=i=>!!g.buttons[i]?.pressed&&!previous[i];
  const identity=[g.index,g.id,g.mapping].join('|');
  if(enabled&&identity!==padKey){disconnect();padKey=identity;return true;}
  if(enabled){if(now>=hintUntil)hint.hidden=true;const next=context();if(next!==contextKey||down&&!visible(down.element)){cancel();contextKey=next;waiting=true;}}
  if(pressed(9)&&(enabled||waiting)){disconnect();return false;}
  if(waiting){if(enabled)clearAxes();if(!g.buttons.some(b=>b.pressed||Number(b.value)>.04))waiting=false;return true;}
  if(!enabled){if(!pressed(8))return false;enabled=true;waiting=true;padKey=identity;contextKey=context();stopAuto();releaseMouseLook();resetInput();show(now);return true;}
  try{
  clearAxes();if(pressed(1)||pressed(8)){disconnect();return true;}
  const direction=[12,13,14,15].find(index=>g.buttons[index]?.pressed);
  if(direction===undefined)repeatDirection=-1;else if(direction!==repeatDirection||!previous[direction]||now>=repeatAt){const first=direction!==repeatDirection||!previous[direction];repeatDirection=direction;repeatAt=now+(first?350:160);adjust(document.activeElement,direction);}
  const axis=i=>{const raw=Number(g.axes[i]);if(!Number.isFinite(raw))return 0;const value=Math.max(-1,Math.min(1,raw));return Math.abs(value)<.15?0:Math.sign(value)*(Math.abs(value)-.15)/.85;};
  const scrollX=axis(2),scrollY=axis(3);if(scrollX||scrollY)scroll(scrollX*600*dt,scrollY*600*dt);
  let dx=axis(0),dy=axis(1);const length=Math.max(1,Math.hypot(dx,dy)),speed=g.buttons[7]?.value>.2?114:520,oldX=x,oldY=y;
  x=Math.max(2,Math.min(window.innerWidth-2,x+dx/length*speed*dt));y=Math.max(2,Math.min(window.innerHeight-2,y+dy/length*speed*dt));
  if(x!==oldX||y!==oldY){cursor.style.left=x+'px';cursor.style.top=y+'px';if(down&&Math.hypot(x-down.x,y-down.y)>6)down.moved=true;dispatch(captured||hit(),'pointermove',down?1:0);if(down?.range)rangeAt(down.range);}
  if(pressed(0)){hint.hidden=true;const el=hit();if(el){const control=activation(el),native=nativeControl(control);if(native){native.focus?.({preventScroll:true});hint.hidden=false;hintUntil=now+8000;hint.textContent=native.type==='file'?'檔案選擇請使用滑鼠或觸控；B 返回手把游泳。':'文字與原生輸入請使用鍵盤、滑鼠或觸控；B 返回手把游泳。';return true;}down={element:el,activation:control,x,y,moved:false,range:control.tagName==='INPUT'&&control.type==='range'?control:null,rangeChanged:false};control.focus?.({preventScroll:true});const event=dispatch(el,'pointerdown',1);if(down?.range){capture(down.range,event);rangeAt(down.range);}}}
  if(down&&!g.buttons[0]?.pressed){const gesture=down;down=null;dispatch(captured||hit()||gesture.element,'pointerup');if(captured)release(captured,pointerID);if(gesture.range){if(gesture.rangeChanged)gesture.range.dispatchEvent(new Event('change',{bubbles:true}));}else if(!gesture.moved&&gesture.activation.tagName!=='SELECT'&&visible(gesture.activation)&&activation(hit())===gesture.activation)gesture.element.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,button:0,buttons:0,clientX:x,clientY:y}));}
  return true;
  }finally{clearAxes();}
 }
 return {poll,disconnect,contextChanged,capture,hasCapture,release};
})();
