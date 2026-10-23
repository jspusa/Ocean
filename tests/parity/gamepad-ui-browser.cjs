/* Real DOM focus/handlers via the production gamepad poll. Controller data is
 * injected; this does not claim physical-device or canvas-gesture acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8000/',results=[],errors=[],out=path.resolve(__dirname,'../../qa/parity');fs.mkdirSync(out,{recursive:true});
const check=(name,value)=>{results.push({name,pass:!!value});console.log((value?'PASS ':'FAIL ')+name);assert(value,name);};
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mode of [{id:'desktop',width:1100,height:740,touch:false},{id:'portrait',width:390,height:844,touch:true}]){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,isMobile:mode.touch,hasTouch:mode.touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(mode.id+': '+e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('return-blue.shilang.v1'))localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:0,adaptive:false,reduced:true,startWithSound:false}}));});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:180000});await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(()=>{
   window.__uiPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>__uiPad?[__uiPad]:[]});
   window.__uiPress=index=>{for(const b of __uiPad.buttons){b.pressed=false;b.value=0;}pollGamepad();if(index>=0){__uiPad.buttons[index].pressed=true;__uiPad.buttons[index].value=1;pollGamepad();}};
   window.__uiReach=selector=>{window.__uiTrace=[];for(let i=0;i<200;i++){if(document.activeElement?.matches(selector))return true;__uiTrace.push(document.activeElement?.outerHTML.slice(0,180));__uiPress(13);}return false;};
  });
  check(mode.id+' module is registered and idle controller does not steal focus',await page.evaluate(()=>{const old=document.activeElement;pollGamepad();return typeof oceanGamepadUI!=='undefined'&&document.activeElement===old;}));
  check(mode.id+' D-pad reaches the visible home entry',await page.evaluate(()=>{__uiPress(13);return document.activeElement.id==='startBtn'&&document.activeElement.classList.contains('gamepad-focus');}));
  await page.evaluate(()=>{__uiPress(0);for(let i=0;i<5;i++)pollGamepad();});await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
  check(mode.id+' A enters once without also taking a photograph',await page.evaluate(()=>active&&oceanPhotography.snapshot().film===0&&!voyage.photoBusy));
  const moved=await page.evaluate(()=>{__uiPress(-1);const old=player.p.slice();__uiPad.axes=[0,-.65,0,0];pollGamepad();updatePlayer(.2);__uiPad.axes=[0,0,0,0];pollGamepad();return V.dist(old,player.p);});check(mode.id+' original gamepad swimming remains active',moved>.02);
  check(mode.id+' original LB quick-turn remains active',await page.evaluate(()=>{const old=player.yaw;__uiPress(4);return Math.abs(Math.cos(player.yaw-old)+1)<1e-8;}));
  await page.evaluate(()=>__uiPress(9));check(mode.id+' Start opens the real dive menu',await page.evaluate(()=>modal==='diveMenu'));await page.waitForTimeout(70);
  check(mode.id+' D-pad reaches settings without a pointer',await page.evaluate(()=>__uiReach('#settingsBtn')));await page.evaluate(()=>__uiPress(0));
  check(mode.id+' A opens actual settings',await page.evaluate(()=>modal==='settings'&&!!$('qualityPreset')));await page.waitForTimeout(70);
  check(mode.id+' select can be changed and remains focused',await page.evaluate(()=>{if(!__uiReach('#qualityPreset'))return false;__uiPress(15);return renderer.quality===1&&!settings.adaptive&&document.activeElement.id==='qualityPreset';}));
  const volume=await page.evaluate(()=>{if(!__uiReach('input[data-volume="master"]'))return {missing:true,trace:__uiTrace.slice(-12),input:$('panelBody').querySelector('input[data-volume="master"]')?.outerHTML};const before=settings.master;__uiPress(14);return {before,after:settings.master,focused:document.activeElement.matches('input[data-volume="master"]')};});if(volume?.missing)console.error(JSON.stringify(volume));check(mode.id+' D-pad adjusts the actual volume control',volume&&Math.abs(volume.after-(volume.before-.01))<1e-8&&volume.focused);
  await page.screenshot({path:path.join(out,'gamepad-ui-'+mode.id+'-settings.png')});
  await page.evaluate(()=>__uiPress(1));check(mode.id+' B returns to swimming without a camera shot or hidden input focus',await page.evaluate(()=>active&&!modal&&!photoOpen&&oceanPhotography.snapshot().film===0&&document.activeElement===$('ocean')));
  await page.evaluate(()=>__uiPress(9));await page.waitForTimeout(70);check(mode.id+' expandable tools are reachable',await page.evaluate(()=>__uiReach('summary')));await page.evaluate(()=>__uiPress(0));
  check(mode.id+' A expands the real advanced tool list',await page.evaluate(()=>$('panelBody').querySelector('.menu-advanced').open));
  check(mode.id+' photography tool is reachable by controller',await page.evaluate(()=>__uiReach('[data-feature="photography"]')));await page.evaluate(()=>__uiPress(0));check(mode.id+' photography tool opens through its normal handler',await page.evaluate(()=>modal==='photography'&&!!$('photoLibraryTabs')||modal==='photography'&&!!$('photoSelectAll')));
  await page.evaluate(()=>{__uiPress(1);viewPhoto({url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOMsAAAAASUVORK5CYII=',date:1,area:'測試用檢視',species:'海底風景'});__uiPress(1);});check(mode.id+' B exits photo viewer through the real close handler',await page.evaluate(()=>!photoOpen&&$('photoViewer').classList.contains('hidden')));
  await page.evaluate(()=>{__uiPress(9);__uiPress(13);__uiPad=null;pollGamepad();});check(mode.id+' disconnect clears focus treatment and held movement',await page.evaluate(()=>!document.querySelector('.gamepad-focus')&&stick.every(v=>v===0)&&verticalInput===0));
  const saved=await page.evaluate(()=>({quality:settings.quality,master:settings.master}));await page.reload();await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:180000});check(mode.id+' controller settings persist after real reload',await page.evaluate(saved=>settings.quality===saved.quality&&settings.master===saved.master,saved));
  await context.close();
 }}finally{await browser.close();}
 check('no browser runtime errors',errors.length===0);fs.writeFileSync(path.join(out,'gamepad-ui-browser.json'),JSON.stringify({url,results,errors,fixture:'Injected standard gamepad and silent initial settings; real gamepad poll, DOM handlers, controller focus and save/reload. No physical-device or canvas-gesture completeness claim.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
