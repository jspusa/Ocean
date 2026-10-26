/* Standard-gamepad input and DOM event boundaries. This fixture replaces the
 * browser DOM/time only; real WebGL and gameplay acceptance is separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const filename=path.resolve(__dirname,'../../src/gamepad_pointer.js');
function fixture(){
 let now=0,previous=[],hit=null;const nodes=[],events=[],nativeCaptures=new Map();
 class DOMEvent{constructor(type,init={}){this.type=type;Object.assign(this,init);this.defaultPrevented=false;this.isTrusted=false;}preventDefault(){if(this.cancelable)this.defaultPrevented=true;}stopPropagation(){this.stopped=true;}stopImmediatePropagation(){this.stopped=this.immediate=true;}}
 class Element{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.style={};this.attributes={};this.listeners={};this.children=[];this.parentElement=null;this.isConnected=true;this.hidden=false;this.disabled=false;this.type='';this.tabIndex=0;this.rect={left:0,top:0,width:100,height:40};this.scrollTop=0;this.scrollLeft=0;this.scrollHeight=this.clientHeight=100;this.scrollWidth=this.clientWidth=100;nodes.push(this);}
  append(...els){for(const el of els){this.children.push(el);el.parentElement=this;}}appendChild(el){this.append(el);return el;}
  setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}
  addEventListener(type,fn,options=false){(this.listeners[type]??=[]).push({fn,capture:options===true||options.capture===true});}
  dispatchEvent(event){event.target=this;const route=[];for(let n=this;n;n=n.parentElement)route.push(n);if(!route.includes(doc))route.push(doc);if(!route.includes(win))route.push(win);
   const dispatch=(el,capture)=>{event.currentTarget=el;event.immediate=false;for(const listener of el.listeners?.[event.type]||[])if(listener.capture===capture){listener.fn(event);if(event.immediate)break;}};
   for(const el of route.slice().reverse()){dispatch(el,true);if(event.stopped)return !event.defaultPrevented;}
   for(const el of route){dispatch(el,false);if(event.stopped||!event.bubbles)break;}events.push({type:event.type,target:this.id,event});return !event.defaultPrevented;
  }
  contains(el){for(let n=el;n;n=n.parentElement)if(n===this)return true;return false;}
  matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s===':disabled')return this.disabled;if(s==='[hidden]')return this.hidden;if(s==='[inert]')return this.attributes.inert!==undefined;if(s==='[aria-hidden="true"]')return this.attributes['aria-hidden']==='true';if(s==='.hidden')return String(this.className||'').split(' ').includes('hidden');if(s==='[contenteditable]')return this.attributes.contenteditable!==undefined;if(s==='a[href]')return this.tagName==='A'&&!!this.href;const m=s.match(/^(\w+)(?:\[type="?([^"\]]+)"?\])?$/);return !!m&&this.tagName===m[1].toUpperCase()&&(!m[2]||this.type===m[2]);});}
  closest(selector){for(let n=this;n?.matches;n=n.parentElement)if(n.matches(selector))return n;return null;}
  getClientRects(){return this.hidden||!this.isConnected||this.style.display==='none'?[]:[this.getBoundingClientRect()];}
  getBoundingClientRect(){const left=this.style.left===undefined?this.rect.left:parseFloat(this.style.left),top=this.style.top===undefined?this.rect.top:parseFloat(this.style.top);return {...this.rect,left,top,right:left+this.rect.width,bottom:top+this.rect.height};}
  focus(){doc.activeElement=this;}scrollBy({left=0,top=0}){this.scrollLeft+=left;this.scrollTop+=top;}
  setPointerCapture(id){assert(id>=0&&id<1000,'Virtual pointer must never reach native capture');nativeCaptures.set(id,this);}
  hasPointerCapture(id){return nativeCaptures.get(id)===this;}releasePointerCapture(id){nativeCaptures.delete(id);}
 }
 const win={listeners:{},innerWidth:800,innerHeight:600,addEventListener:Element.prototype.addEventListener};
 const doc={listeners:{},hidden:false,activeElement:null,addEventListener:Element.prototype.addEventListener,hasFocus:()=>true,createElement:tag=>new Element(tag),getElementById:id=>nodes.find(n=>n.id===id)||null,elementFromPoint:()=>hit};
 doc.body=new Element('body');doc.head=new Element('head');doc.scrollingElement=doc.body;
 const ctx=vm.createContext({console,document:doc,window:win,Event:DOMEvent,PointerEvent:DOMEvent,MouseEvent:DOMEvent,WheelEvent:DOMEvent,performance:{now:()=>now},getComputedStyle:el=>({display:el.style.display||'block',visibility:'visible',pointerEvents:el.style.pointerEvents||'auto',overflowY:el.style.overflowY||'visible',overflowX:el.style.overflowX||'visible',direction:el.style.direction||'ltr'}),active:true,modal:null,photoOpen:false,voyage:{photoMode:false},stick:[1,1],lookStick:[1,1],verticalInput:1,stopAuto(){},releaseMouseLook(){},resetInput(){ctx.stick=[0,0];ctx.lookStick=[0,0];ctx.verticalInput=0;},oceanExploration:{penMode:null},oceanEcology:{snapshot:()=>({tool:null})}});
 vm.runInContext(fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'const oceanGamepadPointer={poll(){return false},disconnect(){}};',ctx);
 const api=vm.runInContext('oceanGamepadPointer',ctx),pad={id:'Standard Pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
 function poll(buttons=[],axes=[0,0,0,0],advance=16){now+=advance;pad.axes=axes;pad.buttons.forEach((b,i)=>{b.pressed=buttons.includes(i);b.value=b.pressed?1:0;});const result=api.poll(pad,previous,now);previous=pad.buttons.map(b=>b.pressed);return result;}
 const element=(tag,id)=>{const el=new Element(tag,id);doc.body.append(el);return el;};
 function native(type,target=doc.body,init={}){const event=new DOMEvent(type,{bubbles:true,cancelable:true,pointerId:2,pointerType:'mouse',...init});target.dispatchEvent(event);return event;}
 function enter(){poll([8]);poll();}
 return {api,ctx,doc,win,events,nodes,pad,poll,enter,native,element,setHit:el=>{hit=el;},cursor:()=>doc.getElementById('gamepadCursor')};
}
const checks=[];function check(name,fn){try{fn();checks.push(true);console.log('PASS '+name);}catch(e){checks.push(false);console.error('FAIL '+name+': '+e.stack);}}
check('View enters a visible pointer mode, consumes swimming axes, and B leaves it',()=>{
 const f=fixture();f.doc.elementFromPoint=()=>{throw Error('Inactive controller must not hit-test');};assert.equal(f.poll(),false);assert.equal(f.cursor(),null);
 assert.equal(f.poll([8]),true);assert(f.cursor()&&!f.cursor().hidden);assert.equal(f.ctx.verticalInput,0);assert.equal(f.ctx.stick.join(','),'0,0');
 f.doc.elementFromPoint=()=>null;f.poll();assert.equal(f.poll([1]),true);assert(f.cursor().hidden||f.cursor().style.display==='none');
});
check('A uses the real DOM pointer sequence and activates the original visible button once on release',()=>{
 const f=fixture(),button=f.element('button','action'),sequence=[];f.setHit(button);
 for(const type of ['pointerdown','pointerup','click'])button.addEventListener(type,e=>sequence.push([type,e.pointerType,e.isTrusted]));
 f.enter();f.poll([0]);f.poll([0]);assert.equal(sequence.length,1);f.poll();
 assert.deepEqual(sequence.map(row=>row[0]),['pointerdown','pointerup','click']);assert.equal(sequence[0][1],'gamepad');assert(sequence.every(row=>row[2]===false));
 f.poll();assert.equal(sequence.length,3);
});
check('virtual capture stays out of native capture and B cancels the held gesture before losing capture',()=>{
 const f=fixture(),canvas=f.element('canvas','ocean'),seen=[];f.setHit(canvas);
 canvas.addEventListener('pointerdown',event=>{f.api.capture(canvas,event);assert(f.api.hasCapture(canvas,event.pointerId));});
 for(const type of ['pointercancel','lostpointercapture','click'])canvas.addEventListener(type,event=>seen.push(type));
 f.enter();f.poll([0]);f.poll([0,1]);assert.deepEqual(seen,['pointercancel','lostpointercapture']);f.poll([0]);f.poll();assert.deepEqual(seen,['pointercancel','lostpointercapture']);
 const native={pointerId:2};f.api.capture(canvas,native);assert(f.api.hasCapture(canvas,2));f.api.release(canvas,2);assert(!f.api.hasCapture(canvas,2));
});
check('disconnecting an unused pointer cannot erase native touch or mouse movement',()=>{
 const f=fixture();f.api.disconnect();f.api.disconnect();assert.equal(f.ctx.stick.join(','),'1,1');assert.equal(f.ctx.lookStick.join(','),'1,1');assert.equal(f.ctx.verticalInput,1);assert.equal(f.poll(),false);
});
check('free dragging follows virtual capture, suppresses click, and travels equally at 30, 60 and 120 Hz',()=>{
 function drag(hz,precise=false){const f=fixture(),canvas=f.element('canvas','ocean'),outside=f.element('button','outside'),seen=[];f.setHit(canvas);canvas.addEventListener('pointerdown',e=>f.api.capture(canvas,e));for(const type of ['pointermove','pointerup','click'])canvas.addEventListener(type,e=>seen.push(type));f.enter();f.poll([0]);f.setHit(outside);for(let i=0;i<hz/2;i++)f.poll(precise?[0,7]:[0],[.5,0,0,0],1000/hz);const end=parseFloat(f.cursor().style.left);f.poll();assert(seen.includes('pointermove'));assert(seen.includes('pointerup'));assert(!seen.includes('click'));return end;}
 const p30=drag(30),p60=drag(60),p120=drag(120),fine=drag(60,true);assert(p30>450);assert(Math.abs(p30-p60)<.1);assert(Math.abs(p60-p120)<.1);assert(fine>400&&fine<p60-20);
});
check('Start cancels before yielding its normal menu action and held A cannot leak after cancellation',()=>{
 const f=fixture(),canvas=f.element('canvas','ocean'),seen=[];f.setHit(canvas);canvas.addEventListener('pointerdown',e=>f.api.capture(canvas,e));for(const type of ['pointercancel','pointerup','click'])canvas.addEventListener(type,()=>seen.push(type));f.enter();f.poll([0]);assert.equal(f.poll([0,9]),false);assert.deepEqual(seen,['pointercancel']);assert.equal(f.poll([0]),true);f.poll();assert.deepEqual(seen,['pointercancel']);assert.equal(f.poll(),false);
});
check('native takeover, backgrounding and context loss cancel without a release or click, then preserve native axes',()=>{
 for(const reason of ['pointerdown','keydown','blur','visibilitychange','webglcontextlost']){
  const f=fixture(),canvas=f.element('canvas','ocean'),seen=[];f.setHit(canvas);canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='gamepad')f.api.capture(canvas,e);});for(const type of ['pointercancel','pointerup','click'])canvas.addEventListener(type,()=>seen.push(type));f.enter();f.poll([0]);if(reason==='visibilitychange')f.doc.hidden=true;f.native(reason,canvas);assert.deepEqual(seen,['pointercancel'],reason);assert(f.cursor().hidden,reason);f.ctx.stick=[.4,.5];f.poll([0]);assert.equal(f.ctx.stick.join(','),'.4,.5'.replace(/\./g,'0.'));f.poll();assert.deepEqual(seen,['pointercancel']);
 }
});
check('changing tools, panels or controller cancels held gestures and requires neutral input before reuse',()=>{
 for(const reason of ['panel','photo','home','pen','ecology','controller','removed']){
  const f=fixture(),canvas=f.element('canvas','ocean'),seen=[];f.setHit(canvas);canvas.addEventListener('pointerdown',e=>{seen.push('down');f.api.capture(canvas,e);});for(const type of ['pointercancel','pointerup','click'])canvas.addEventListener(type,()=>seen.push(type));f.enter();f.poll([0]);
  if(reason==='panel')f.ctx.modal='settings';if(reason==='photo')f.ctx.photoOpen=true;if(reason==='home')f.ctx.active=false;if(reason==='pen')f.ctx.oceanExploration.penMode='draw';if(reason==='ecology')f.ctx.oceanEcology.snapshot=()=>({tool:'pet'});if(reason==='controller')f.pad.id='Replacement';if(reason==='removed')canvas.isConnected=false;
  f.poll([0]);assert.deepEqual(seen,['down','pointercancel'],reason);f.poll([0]);f.poll();assert.deepEqual(seen,['down','pointercancel'],reason);
  if(reason!=='controller'&&reason!=='removed'){f.poll([0]);assert.deepEqual(seen,['down','pointercancel','down'],reason);}
 }
});
check('domain context changes and native Escape cancel before domain teardown without closing pointer mode',()=>{
 const f=fixture(),canvas=f.element('canvas','ocean'),order=[];f.setHit(canvas);canvas.addEventListener('pointerdown',e=>f.api.capture(canvas,e));canvas.addEventListener('pointercancel',()=>order.push('cancel'));
 f.api.contextChanged();assert.equal(f.ctx.verticalInput,1);f.enter();f.poll([0]);f.api.contextChanged();order.push('teardown');assert.deepEqual(order,['cancel','teardown']);assert(!f.cursor().hidden);f.poll([0]);f.poll();f.poll([0]);
 f.win.addEventListener('keydown',()=>order.push('escape'),true);f.native('keydown',canvas,{code:'Escape'});assert.deepEqual(order,['cancel','teardown','cancel','escape']);
});
check('D-pad adjusts a selected range and select through input/change, skips disabled options and bounds repeat',()=>{
 const f=fixture(),select=f.element('select','quality'),range=f.element('input','strength'),seen=[];select.options=[{}, {disabled:true}, {}];select.selectedIndex=0;range.type='range';range.min='10';range.max='100';range.step='5';range.value='95';for(const el of [select,range])for(const type of ['input','change'])el.addEventListener(type,()=>seen.push(el.id+':'+type));
 f.enter();f.setHit(select);f.poll([0]);f.poll();f.poll([15]);assert.equal(select.selectedIndex,2);for(let i=0;i<10;i++)f.poll([15],undefined,8);assert.equal(seen.length,2);
 f.poll();f.setHit(range);range.focus();f.poll([15]);assert.equal(Number(range.value),100);f.poll([15],undefined,400);assert.equal(seen.length,4);f.poll();f.poll([14]);assert.equal(Number(range.value),95);assert.deepEqual(seen,['quality:input','quality:change','strength:input','strength:change','strength:input','strength:change']);
});
check('A can drag an HTML range outside its track and commits the final step value once on release',()=>{
 const f=fixture(),range=f.element('input','strength'),outside=f.element('div','outside'),seen=[];Object.assign(range,{type:'range',min:'10',max:'100',step:'5',value:'10',rect:{left:300,top:290,width:200,height:20}});f.setHit(range);for(const type of ['input','change','click'])range.addEventListener(type,()=>seen.push(type));f.enter();f.poll([0]);assert.equal(Number(range.value),55);f.setHit(outside);for(let i=0;i<15;i++)f.poll([0],[1,0,0,0],1000/60);f.poll();assert.equal(Number(range.value),100);assert.equal(seen.filter(x=>x==='change').length,1);assert.equal(seen.filter(x=>x==='click').length,0);assert(seen.filter(x=>x==='input').length>1);
});
check('right stick scrolls the pointed panel and lets an existing canvas wheel handler consume zoom',()=>{
 const f=fixture(),panel=f.element('section','scrollPanel'),button=f.element('button','row'),canvas=f.element('canvas','chart');panel.append(button,canvas);panel.style.overflowY='auto';panel.scrollHeight=1000;panel.clientHeight=200;f.setHit(button);f.enter();f.poll([],[0,0,0,1],50);assert(panel.scrollTop>0);const previous=panel.scrollTop;let delta=0;canvas.addEventListener('wheel',e=>{delta+=e.deltaY;e.preventDefault();});f.setHit(canvas);f.poll([],[0,0,0,1],50);assert(delta>0);assert.equal(panel.scrollTop,previous);
});
check('text entry and native file pickers receive focus and a truthful handoff hint, never fabricated activation',()=>{
 const f=fixture(),text=f.element('input','name'),file=f.element('input','music'),label=f.element('label','musicLabel');text.type='text';file.type='file';label.control=file;let clicks=0;for(const el of [text,file,label])el.addEventListener('click',()=>clicks++);f.enter();
 for(const el of [text,file,label]){f.setHit(el);f.poll([0]);f.poll();assert.equal(clicks,0);assert.equal(f.doc.activeElement,el===label?file:el);assert.match(f.doc.getElementById('gamepadPointerHint').textContent,/鍵盤|滑鼠|觸控/);}
});
check('consumed pointer events cannot leave movement written by an existing DOM control handler',()=>{
 const f=fixture(),control=f.element('button','depth-control');f.setHit(control);
 for(const type of ['pointerdown','pointermove','pointerup','click'])control.addEventListener(type,()=>{f.ctx.stick=[.5,-.8];f.ctx.lookStick=[.4,.3];f.ctx.verticalInput=1;});
 f.enter();for(const [buttons,axes] of [[[0],[0,0,0,0]],[[0],[.8,0,0,0]],[[],[0,0,0,0]]]){assert.equal(f.poll(buttons,axes),true);assert.equal(f.ctx.stick.join(','),'0,0');assert.equal(f.ctx.lookStick.join(','),'0,0');assert.equal(f.ctx.verticalInput,0);}
});
check('production poll releases previous gamepad ownership when a native control takes over pointer mode',()=>{
 const f=fixture(),joystick=f.element('div','joystick');f.ctx.navigator={getGamepads:()=>[f.pad]};Object.assign(f.ctx.voyage,{gamepadAttached:true,gamepadDepth:true,gamepadButtons:[]});
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/voyage.js'),'utf8');vm.runInContext(source.slice(source.indexOf('function disconnectGamepad('),source.indexOf('function initVoyage(')),f.ctx);
 const input=buttons=>{f.pad.buttons.forEach((button,index)=>{button.pressed=buttons.includes(index);button.value=button.pressed?1:0;});f.ctx.pollGamepad();};
 input([8]);input([]);joystick.addEventListener('pointerdown',()=>{f.ctx.stick=[.4,-.7];f.ctx.lookStick=[.2,.3];f.ctx.verticalInput=-1;});f.native('pointerdown',joystick,{pointerType:'touch'});input([]);input([]);input([]);
 assert.equal(f.ctx.stick.join(','),'0.4,-0.7');assert.equal(f.ctx.lookStick.join(','),'0.2,0.3');assert.equal(f.ctx.verticalInput,-1);assert.equal(f.ctx.voyage.gamepadAttached,false);assert.equal(f.ctx.voyage.gamepadDepth,false);
});
check('decorative aria-hidden descendants activate their visible button without bypassing hidden or disabled controls',()=>{
 const f=fixture(),button=f.element('button','pause'),icon=f.element('svg','icon');button.append(icon);icon.setAttribute('aria-hidden','true');let clicks=0;button.addEventListener('click',()=>clicks++);f.setHit(icon);f.enter();f.poll([0]);f.poll();assert.equal(clicks,1);
 button.disabled=true;f.poll([0]);f.poll();assert.equal(clicks,1);button.disabled=false;button.setAttribute('aria-hidden','true');f.poll([0]);f.poll();assert.equal(clicks,1);
});
check('a partially held analog trigger must return to neutral before swimming input resumes',()=>{
 const f=fixture();f.enter();f.poll([1]);for(const b of f.pad.buttons){b.pressed=false;b.value=0;}f.pad.buttons[7].value=.3;
 assert.equal(f.api.poll(f.pad,[]),true);assert.equal(f.api.poll(f.pad,[]),true);f.pad.buttons[7].value=0;assert.equal(f.api.poll(f.pad,[]),true);assert.equal(f.api.poll(f.pad,[]),false);
});
check('the introductory hint clears while the cursor stays usable and native handoff can show a fresh hint',()=>{
 const f=fixture(),button=f.element('button','action'),file=f.element('input','file');file.type='file';f.setHit(button);f.enter();const hint=f.doc.getElementById('gamepadPointerHint');assert(!hint.hidden);
 f.poll([],[],5100);assert(hint.hidden);assert(!f.cursor().hidden);
 f.poll([1]);f.poll();f.enter();assert(!hint.hidden);f.poll([0]);assert(hint.hidden);f.poll();
 f.setHit(file);f.poll([0]);assert(!hint.hidden);assert.match(hint.textContent,/檔案選擇/);f.poll([],[],8100);assert(hint.hidden);assert(!f.cursor().hidden);
});
console.log(`${checks.filter(Boolean).length}/${checks.length} gamepad pointer checks passed`);if(checks.includes(false))process.exitCode=1;
