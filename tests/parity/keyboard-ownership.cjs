/* CPU checks at setupControls' public DOM-event boundary. The DOM adapter
 * models keyboard focus/default activation; it is not a browser acceptance test. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('src/app.js','utf8');

function fixture({lifecycle=false}={}){
 const handlers=new Map(),nodes=new Map(),classes=()=>{const set=new Set();return {add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle(x,on){if(on??!set.has(x))set.add(x);else set.delete(x);}};};
 function listen(target,type,fn,capture=false){const key=target+':'+type;if(!handlers.has(key))handlers.set(key,[]);handlers.get(key).push({fn,capture:!!capture});}
 function node(id,tagName='DIV',parentElement=null){
  const el={id,tagName,parentElement,isContentEditable:false,classList:classes(),style:{},dataset:{},disabled:false,checked:false,
   addEventListener:(type,fn,capture)=>listen(id,type,fn,capture),setAttribute(){},querySelector:()=>({textContent:''}),querySelectorAll:()=>[],
   closest(selector){for(let p=this;p;p=p.parentElement){if(p.isContentEditable&&selector.includes('contenteditable'))return p;if(selector.split(',').some(s=>s.trim().toUpperCase()===p.tagName||s.trim()==='a[href]'&&p.tagName==='A'&&p.href))return p;}return null;},
   focus(){document.activeElement=this;dispatch('focusin',null,this);},click(){for(const {fn}of handlers.get(id+':click')||[])fn({target:this});this.onclick?.();}
  };nodes.set(id,el);return el;
 }
 const get=id=>nodes.get(id)||node(id),document={activeElement:null,body:node('body','BODY'),hidden:false,
  addEventListener:(type,fn,capture)=>listen('document',type,fn,capture),querySelectorAll:()=>[]};
 const window={addEventListener:(type,fn,capture)=>listen('window',type,fn,capture)};
 let nativeActivations=0,photos=0;
 const c=vm.createContext({console,window,document,$:get,performance:{now:()=>1000},matchMedia:()=>({matches:false}),
  active:true,modal:null,photoOpen:false,settings:{sensitivity:1,third:false,lookLock:false,startWithSound:false},keys:new Set(),inputCleanup:[],
  player:{p:[0,-8,0],velocity:[0,0,0],yaw:0,pitch:0},stick:[0,0],lookStick:[0,0],verticalInput:0,renderer:{dirty:false},
  initPerformance(){},persist(){},toast(){},stopAuto(){},setAutoUI(){},updateHUD(){},applyVisualSettings(){},startDive(){},goHome(){},observeNearest(){},download(){},releaseMouseLook(){},mouseLookUnavailable(){},
  takePhoto(){photos++;},openPanel(type){c.modal=type;},closePanel(){c.modal=null;},closePhoto(){c.photoOpen=false;},toggleSound(){},
  resetInput(){c.keys.clear();},oceanAudio:{pause(){},resume(){}},oceanSelection:{suspend(){},clear(){},hover(){}},oceanFeatures:{some:()=>false},
  oceanSwimActions:{quickTurn(){c.player.yaw+=Math.PI;},toggleSurface(){c.player.pitch=1;},exit:()=>false}
 });
 get('ocean').tagName='CANVAS';document.activeElement=get('ocean');
 const timers=[];
 if(lifecycle){
  Object.assign(c,{ready:true,prevFocus:null,photoPrevFocus:null,selectedPhoto:null,selectedEntry:0,welcomeTransition:null,
   setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},oceanPerf:{pause(){}},oceanNavigation:{current:()=>({name:'reef'})},
   LANDMARKS:[{spawn:[0,-8,0],yaw:0,pitch:0}],collide:p=>p,nearestPathIndex:()=>0,log(){},setCount(){},updateSoundUI(){},
   oceanDiveUI:{restoreControls(){},sync(){}},renderJournal(){},renderMap(){},renderSettings(){},renderAbout(){},
   voyage:{state:{}},voyageDestination:id=>({id,name:id}),saveVoyage(){}});
  Object.assign(c.oceanFeatures,{call(){},renderPanel:()=>true});
  for(const [start,end]of [['function startDive(','function goHome('],['function viewPhoto(','function download('],['function openPanel(','function panelTitle(']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),c,{filename:'app-focus.js'});
  const voyage=fs.readFileSync('src/voyage.js','utf8'),start=voyage.indexOf('function markPlace(');vm.runInContext(voyage.slice(start,voyage.indexOf('\n',start)),c,{filename:'voyage-mark.js'});
 }
 vm.runInContext(app.slice(app.indexOf('const oceanKeyboard='),app.indexOf('function setupControls(')),c,{filename:'app-keyboard.js'});
 vm.runInContext(app.slice(app.indexOf('function setupControls('),app.indexOf('async function boot('))+'\nsetupControls();',c,{filename:'app.js'});
 function dispatch(type,code,target=document.activeElement,extra={}){
  const path=[];for(let el=target;el;el=el.parentElement)path.push(el);path.push(document,window);
  const event={type,code,target,repeat:false,defaultPrevented:false,stopped:false,composedPath:()=>path,
   preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
  for(const capture of [true,false])for(const surface of capture?['window','document']:['document','window'])for(const h of handlers.get(surface+':'+type)||[]){if(event.stopped)break;if(h.capture===capture)h.fn(event);}
  return event;
 }
 function press(code,target,extra={}){
  document.activeElement=target;const event=dispatch('keydown',code,target,extra);dispatch('keyup',code,target,extra);
  // Native button/summary Space activation is canceled by prevented keydown.
  if(code==='Space'&&!event.defaultPrevented&&['BUTTON','SUMMARY'].includes(target.tagName)){nativeActivations++;target.click();}
  return event;
 }
 function install(file,bindings={}){
  Object.assign(c,bindings);const source=fs.readFileSync('src/'+file+'.js','utf8'),start=source.indexOf("window.addEventListener('keydown'");
  // Register the module's real DOM callback without constructing its unrelated
  // renderer/scene. These modules each own one keyboard listener.
  const endings=['},true);','}});'].map(text=>({text,at:source.indexOf(text,start)})).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at),end=endings[0];
  assert(start>=0&&end,'keyboard registration exists in '+file);vm.runInContext(source.slice(start,end.at+end.text.length),c,{filename:file+'.js'});
 }
 return {c,node,get,document,dispatch,press,install,flushTimers(){while(timers.length)timers.shift()();},get nativeActivations(){return nativeActivations;},get photos(){return photos;}};
}
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+': '+error.message);}}
check('Space activates a focused HUD button without taking a photograph',()=>{
 const f=fixture(),button=f.node('pauseBtn','BUTTON');f.press('Space',button);assert.equal(f.nativeActivations,1);assert.equal(f.photos,0);
});
check('native controls keep character keys instead of quick-turn or surface-look actions',()=>{
 for(const tag of ['BUTTON','A','SUMMARY','INPUT','TEXTAREA','SELECT','DIV']){
  const f=fixture(),control=f.node('control',tag);if(tag==='A')control.href='#help';if(tag==='DIV')control.isContentEditable=true;
  f.press('KeyZ',control);f.press('KeyU',control);assert.equal(f.c.player.yaw,0,tag);assert.equal(f.c.player.pitch,0,tag);
 }
});
check('moving keyboard focus to a control releases held swimming keys',()=>{
 const f=fixture();f.dispatch('keydown','KeyW',f.get('ocean'));assert(f.c.keys.has('KeyW'));f.node('pauseBtn','BUTTON').focus();assert.equal(f.c.keys.size,0);
});
check('browser shortcuts and composing input never take photographs or quick-turn',()=>{
 for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{defaultPrevented:true}]){
  const f=fixture();f.press('KeyP',f.get('ocean'),extra);f.press('KeyZ',f.get('ocean'),extra);assert.equal(f.photos,0,JSON.stringify(extra));assert.equal(f.c.player.yaw,0,JSON.stringify(extra));assert.equal(f.c.keys.size,0);
 }
});
check('summary, link and editable descendants keep their native keys',()=>{
 const f=fixture(),summary=f.node('detailsToggle','SUMMARY');f.press('Space',summary);assert.equal(f.nativeActivations,1);
 const link=f.node('helpLink','A');link.href='#help';assert.equal(f.press('Space',link).defaultPrevented,false);
 const editor=f.node('notes','DIV');editor.isContentEditable=true;const span=f.node('editableText','SPAN',editor);
 f.press('KeyV',span);assert.equal(f.c.settings.third,false);assert.equal(f.press('ArrowLeft',span).defaultPrevented,false);assert.equal(f.photos,0);
});
check('a composed keyboard event belongs to its nested control even when retargeted to a host',()=>{
 const f=fixture(),host=f.node('controlHost'),button=f.node('nestedButton','BUTTON'),span=f.node('buttonIcon','SPAN',button);
 f.document.activeElement=host;const event=f.dispatch('keydown','Space',host,{composedPath:()=>[span,button,host,f.document]});assert.equal(event.defaultPrevented,false);assert.equal(f.photos,0);
 const legacy=f.dispatch('keydown','Space',span,{composedPath:undefined});assert.equal(legacy.defaultPrevented,false);assert.equal(f.photos,0);
});
check('canvas and body retain photography, swimming and quick-turn shortcuts',()=>{
 for(const target of ['ocean','body']){
  const f=fixture(),el=f.get(target);assert.equal(f.press('Space',el).defaultPrevented,true);assert.equal(f.photos,1);
  f.document.activeElement=el;const move=f.dispatch('keydown','KeyW',el);assert(move.defaultPrevented);assert(f.c.keys.has('KeyW'));
  f.dispatch('keydown','ShiftLeft',el);assert(f.c.keys.has('ShiftLeft'));f.dispatch('keyup','KeyW',el);f.dispatch('keyup','ShiftLeft',el);assert.equal(f.c.keys.size,0);
  f.press('KeyZ',el);assert.equal(f.c.player.yaw,Math.PI);
 }
});
check('held keyboard input is released independently from simultaneous touch input',()=>{
 const f=fixture();f.c.stick=[.5,-.75];f.c.lookStick=[.3,0];f.c.verticalInput=1;f.dispatch('keydown','KeyW');f.node('toggle','BUTTON').focus();
 assert.equal(f.c.keys.size,0);assert.deepEqual(f.c.stick,[.5,-.75]);assert.deepEqual(f.c.lookStick,[.3,0]);assert.equal(f.c.verticalInput,1);
});
check('keyup clears a held key after focus changes even when its default was prevented',()=>{
 const f=fixture();f.dispatch('keydown','KeyW');f.document.activeElement=f.node('editor','TEXTAREA');f.dispatch('keyup','KeyW',f.document.activeElement,{defaultPrevented:true});assert.equal(f.c.keys.size,0);
});
check('modal Escape still closes the panel when its close button has focus',()=>{
 const f=fixture();f.c.modal='diveMenu';assert.equal(f.press('Escape',f.node('closePanel','BUTTON')).defaultPrevented,true);assert.equal(f.c.modal,null);
});
check('the tools and voyage shortcuts leave focused native controls untouched',()=>{
 for(const file of ['features','voyage'])for(const tag of ['BUTTON','A','SUMMARY','DIV']){
  const f=fixture(),control=f.node('control',tag);control.href='#help';control.isContentEditable=tag==='DIV';
  f.install(file,{some:()=>false,open:type=>{f.c.modal=type;},toggleCruise:()=>{f.c.cruise=true;},togglePhotoMode:()=>{f.c.photoMode=true;},readLogger:()=>{f.c.loggerRead=true;}});
  for(const code of ['KeyT','KeyC','KeyX','KeyB','KeyF'])assert.equal(f.press(code,control).defaultPrevented,false,file+' '+tag+' '+code);
  assert.equal(f.c.modal,null,file+' '+tag);assert(!f.c.cruise&&!f.c.photoMode&&!f.c.loggerRead,file+' '+tag);
 }
});
check('water-pencil mode leaves its buttons usable with Space and salvage does not steal typing',()=>{
 const f=fixture();f.install('exploration',{penMode:'draw',collectNearest:()=>{f.c.collected=true;}});const button=f.node('penDone','BUTTON');
 f.press('Space',button);assert.equal(f.nativeActivations,1);assert.equal(f.photos,0);
 f.c.penMode=null;const editor=f.node('notes');editor.isContentEditable=true;f.press('KeyR',editor);assert(!f.c.collected);
});
check('micro and aquarium viewing do not move the camera while a native control owns the arrow keys',()=>{
 for(const file of ['microcosm','aquarium']){
  const f=fixture();f.install(file,{runtime:{uid:'fish',scanning:false,viewing:true},orbit:()=>{f.c.cameraMoved=true;},adjust:()=>{f.c.cameraMoved=true;}});
  const button=f.node('viewControl','BUTTON'),editor=f.node('viewNotes');editor.isContentEditable=true;
  for(const control of [button,editor])assert.equal(f.press('ArrowLeft',control).defaultPrevented,false,file);assert(!f.c.cameraMoved,file);
 }
});
check('performance diagnostics leave editable controls and browser shortcuts alone',()=>{
 const f=fixture(),performanceUI={visible:false,toggle(){this.visible=!this.visible;}};f.install('performance',{oceanPerf:performanceUI});
 const editor=f.node('notes');editor.isContentEditable=true;assert.equal(f.press('F8',editor).defaultPrevented,false);assert.equal(performanceUI.visible,false);
 assert.equal(f.press('F8',f.get('ocean'),{ctrlKey:true}).defaultPrevented,false);assert.equal(performanceUI.visible,false);
});
check('deck keyboard focus handling leaves Ctrl+Tab to the browser',()=>{
 const f=fixture(),button=f.node('deckButton','BUTTON');button.getClientRects=()=>[{}];f.get('shipWalkUI').querySelectorAll=()=>[button];f.c.modal='deck';
 f.install('ship',{runtime:{mode:'deck'},node:f.get});assert.equal(f.press('Tab',button,{key:'Tab',ctrlKey:true}).defaultPrevented,false);
});
check('tools, voyage, salvage and diagnostic shortcuts still work from the sea',()=>{
 const tools=fixture();tools.install('features',{some:()=>false,open:type=>{tools.c.modal=type;}});tools.press('KeyT',tools.get('ocean'));assert.equal(tools.c.modal,'fieldTools');
 for(const [key,result]of [['KeyC','cruise'],['KeyX','photoMode'],['KeyF','loggerRead'],['KeyB','modal']]){
  const f=fixture();f.install('voyage',{toggleCruise:()=>{f.c.cruise=true;},togglePhotoMode:()=>{f.c.photoMode=true;},readLogger:()=>{f.c.loggerRead=true;}});f.press(key,f.get('ocean'));assert.equal(f.c[result],result==='modal'?'voyage':true,key);
 }
 const salvage=fixture();salvage.install('exploration',{penMode:null,collectNearest:()=>{salvage.c.collected=true;}});salvage.press('KeyR',salvage.get('ocean'));assert(salvage.c.collected);
 const performance=fixture(),ui={visible:false,toggle(){this.visible=!this.visible;}};performance.install('performance',{oceanPerf:ui});performance.press('F8',performance.get('ocean'));assert(ui.visible);
});
check('viewing camera arrows and canvas pencil ownership remain active',()=>{
 for(const file of ['microcosm','aquarium']){
  const f=fixture();f.install(file,{runtime:{uid:'fish',scanning:false,viewing:true},orbit:()=>{f.c.cameraMoved=true;},adjust:()=>{f.c.cameraMoved=true;}});
  assert.equal(f.press('ArrowRight',f.get('ocean')).defaultPrevented,true,file);assert(f.c.cameraMoved,file);
 }
 const f=fixture();f.install('exploration',{penMode:'draw'});assert.equal(f.press('Space',f.get('ocean')).defaultPrevented,true);assert.equal(f.photos,0);
});
check('feature shortcuts also preserve modified and composing keyboard input',()=>{
 for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}])for(const file of ['features','voyage','exploration']){
  const f=fixture();f.install(file,{some:()=>false,open:type=>{f.c.modal=type;},penMode:null,toggleCruise:()=>{f.c.cruise=true;},togglePhotoMode:()=>{f.c.photoMode=true;},readLogger:()=>{f.c.loggerRead=true;},collectNearest:()=>{f.c.collected=true;}});
  for(const key of ['KeyT','KeyC','KeyX','KeyB','KeyF','KeyR'])assert.equal(f.press(key,f.get('ocean'),extra).defaultPrevented,false,file+' '+key);
  assert.equal(f.c.modal,null);assert(!f.c.cruise&&!f.c.photoMode&&!f.c.loggerRead&&!f.c.collected);
 }
});
check('ordinary deck Tab still moves focus within the visible deck controls',()=>{
 const f=fixture(),first=f.node('first','BUTTON'),second=f.node('second','BUTTON');for(const button of [first,second])button.getClientRects=()=>[{}];f.get('shipWalkUI').querySelectorAll=()=>[first,second];f.c.modal='deck';
 f.install('ship',{runtime:{mode:'deck'},node:f.get});assert.equal(f.press('Tab',first,{key:'Tab'}).defaultPrevented,true);assert.equal(f.document.activeElement,second);
});
check('marking a waypoint from pause returns keyboard swimming to the sea without a canvas click',()=>{
 const f=fixture({lifecycle:true});f.node('pauseButton','BUTTON').focus();f.c.openPanel('diveMenu');f.flushTimers();
 f.node('pauseChart','BUTTON',f.get('panel')).focus();f.c.openPanel('map');f.flushTimers();f.node('waypoint','BUTTON',f.get('panel')).focus();f.c.markPlace('reef');
 assert.equal(f.document.activeElement,f.get('ocean'));assert(f.dispatch('keydown','KeyW').defaultPrevented);assert(f.c.keys.has('KeyW'));assert.equal(f.c.modal,null);
});
check('starting a dive and closing an in-water photo return keyboard focus to swimming',()=>{
 const f=fixture({lifecycle:true});f.c.active=false;f.node('startBtn','BUTTON').focus();f.c.startDive();assert.equal(f.document.activeElement,f.get('ocean'));
 f.node('photoBtn','BUTTON').focus();f.c.viewPhoto({url:'data:image/jpeg;base64,x'});f.flushTimers();f.c.closePhoto();
 assert.equal(f.document.activeElement,f.get('ocean'));f.dispatch('keydown','KeyW');assert(f.c.keys.has('KeyW'));
});
check('home dialogs and nested photos retain their own opener focus',()=>{
 const f=fixture({lifecycle:true});f.c.active=false;const home=f.node('shipGallery','BUTTON'),thumb=f.node('photoThumb','BUTTON',f.get('panel'));
 home.focus();f.c.openPanel('journal');f.flushTimers();thumb.focus();f.c.viewPhoto({url:'data:image/jpeg;base64,x'});f.flushTimers();f.c.closePhoto();
 assert.equal(f.document.activeElement,thumb);assert.equal(f.c.modal,'journal');f.c.closePanel();assert.equal(f.document.activeElement,home);
});
check('pending dialog focus cannot reclaim keyboard ownership after returning to swimming',()=>{
 const f=fixture({lifecycle:true});f.node('pauseButton','BUTTON').focus();f.c.openPanel('map');f.c.closePanel();f.flushTimers();assert.equal(f.document.activeElement,f.get('ocean'));
 f.c.viewPhoto({url:'data:image/jpeg;base64,x'});f.c.closePhoto();f.flushTimers();assert.equal(f.document.activeElement,f.get('ocean'));f.dispatch('keydown','KeyW');assert(f.c.keys.has('KeyW'));
});
console.log(`${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
