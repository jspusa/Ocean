/* Current public release: default automatic quality, real start actions, native
 * shader compilation, and every served file compared to the local manifest. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),url=process.argv.find(x=>/^https?:/.test(x))||'https://jspusa.github.io/Ocean/';
const outAt=process.argv.indexOf('--out'),outputOverride=outAt<0?null:process.argv[outAt+1];
const clip=(value,limit=2000)=>String(value??'').slice(0,limit);
// Diagnostics never extend the readiness deadline or provide a user gesture.
const bootSnapshot=()=>{
 const readErrors={},read=(name,fn)=>{try{return fn()??null;}catch(error){readErrors[name]=String(error).slice(0,500);return null;}};
 const element=id=>{const e=document.getElementById(id);if(!e)return null;const style=getComputedStyle(e);return {text:(e.textContent||'').trim().slice(0,2000),hidden:e.hidden,className:e.className,open:e instanceof HTMLDialogElement?e.open:null,disabled:'disabled'in e?e.disabled:null,visible:!!e.getClientRects().length&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0};};
 return {
  at:performance.now(),url:location.href,documentState:document.readyState,hidden:document.hidden,focused:document.hasFocus(),visibility:document.visibilityState,
  activation:{active:navigator.userActivation?.isActive??null,everActive:navigator.userActivation?.hasBeenActive??null},
  version:document.documentElement.dataset.version||null,ready:read('ready',()=>window.__ocean?.ready),active:read('active',()=>window.__ocean?.active),bootReady:read('bootReady',()=>ready),bootActive:read('bootActive',()=>active),
  loading:element('loading'),loadDetail:element('loadDetail'),errorCard:element('errorBox'),errorTitle:element('errorTitle'),errorMessage:element('errorMessage'),errorRecoveryStatus:element('errorRecoveryStatus'),welcome:element('welcome'),startButton:element('startBtn'),
  save:{sessionGate:element('saveSessionGate'),title:element('saveSessionTitle'),message:element('saveSessionMessage'),detail:element('saveSessionStatus'),loadGate:element('saveLoadGate'),loadStatus:element('saveLoadStatus'),ownership:read('saveOwnership',()=>({status:oceanSaveSession.status,writable:oceanSaveSession.writable,holdsLock:oceanSaveSession.holdsLock,guardLive:oceanSaveGuard.live}))},
  audio:read('audio',()=>({context:oceanAudio.ctx?.state||null,preparing:!!oceanAudio.preparation,loading:!!oceanAudio.loading,ready:oceanAudio.ready,enabled:oceanAudio.enabled,startWithSound:settings.startWithSound})),
  renderer:read('renderer',()=>renderer?{frame:renderer.frame,quality:renderer.quality,adaptive:settings.adaptive,compiled:renderer.sceneLoad?.compiled??null,streamed:renderer.sceneLoad?.streamed??null,programs:renderer.surfacePrograms?.size??null,compileFailures:[...(renderer.surfaceProgramFailures||[])].slice(0,20),lost:renderer.gl?.isContextLost()??null}:null),
  readErrors
 };
};
(async()=>{
 const started=Date.now(),checks=[],errors=[],consoleErrors=[],consoleWarnings=[],networkFailures=[],observations=[],stages=[],profiles=[],diagnosticErrors=[];
 const counts={pageErrors:0,consoleErrors:0,consoleWarnings:0,networkFailures:0},limits={errors:40,consoleErrors:40,consoleWarnings:40,networkFailures:80,observations:16,stages:64,diagnosticErrors:20};
 const hashAudit={expected:null,attempted:0,verified:0,failures:[]};
 let version='unknown',base,browser=null,context=null,page=null,session=null,profile=null,stage='read-version',fatal=null,completed=false;
 let output=outputOverride?path.resolve(root,outputOverride):path.join(root,'qa/parity/published-vunknown-delivery.json');
 const push=(list,value,limit)=>{if(list.length>=limit)list.shift();list.push(value);};
 const mark=value=>{stage=value;if(profile)profile.stage=value;push(stages,{profile:profile?.id||null,stage,elapsedMs:Date.now()-started},limits.stages);};
 const detail=error=>clip(error?.stack||error,16000);
 const imagePath=label=>outputOverride?output.replace(/\.json$/i,'')+'-'+label+'.png':path.join(root,'qa/parity/published-v'+version+'-'+label+'.png');
 const status=()=>completed&&!fatal&&checks.length===3&&profiles.length===2&&profiles.every(p=>p.completed)&&!counts.pageErrors&&!counts.consoleErrors?'passed':'failed';
 function save(){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({url,version,status:status(),completed,stage,profile:profile?.id||null,elapsedMs:Date.now()-started,checks,errors,consoleErrors,consoleWarnings,counts,limits,hashAudit,networkFailures,profiles,stages,observations,diagnosticErrors,fatal,method:'Every public file hash and normal desktop click/touch tap with unchanged default quality. Boot diagnostics are bounded read-only CDP calls with userGesture:false; they never set game state or extend the 120-second ready deadline. Console errors fail acceptance; warnings and network failures are retained as diagnostic evidence. Touch emulates a phone on this computer, not physical-device acceptance.'},null,2)+'\n');}
 async function bounded(operation,milliseconds,label){let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out after '+milliseconds+' ms')),milliseconds);})]);}finally{clearTimeout(timer);}}
 async function snapshot(label){
  if(!session||!page||page.isClosed())return;
  try{const result=await bounded(session.send('Runtime.evaluate',{expression:'('+bootSnapshot.toString()+')()',returnByValue:true,userGesture:false,timeout:1500}),3000,'Boot diagnostics');if(result.exceptionDetails)throw Error(result.exceptionDetails.text+' '+(result.exceptionDetails.exception?.description||''));push(observations,{profile:profile?.id||null,stage,label,elapsedMs:Date.now()-started,state:result.result.value},limits.observations);}
  catch(error){push(diagnosticErrors,{profile:profile?.id||null,stage,label,error:detail(error)},limits.diagnosticErrors);}
 }
 function networkFailure(value){counts.networkFailures++;push(networkFailures,value,limits.networkFailures);}
 async function bytes(target){let response;for(let i=0;i<3;i++){
  try{response=await fetch(target);if(response.ok)return Buffer.from(await response.arrayBuffer());networkFailure({source:'hash-fetch',stage,url:clip(target),attempt:i+1,status:response.status});}
  catch(error){networkFailure({source:'hash-fetch',stage,url:clip(target),attempt:i+1,error:clip(error)});throw error;}
  if(response.status<500)break;await new Promise(r=>setTimeout(r,300*(i+1)));
 }throw Error('HTTP '+response.status+' '+target);}
 try{
  if(outAt>=0)assert(outputOverride&&!outputOverride.startsWith('--'),'--out requires a receipt path');
  version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();if(!outputOverride)output=path.join(root,'qa/parity/published-v'+version+'-delivery.json');base=new URL(url);
  mark('manifest');save();
  const manifestBytes=await bytes(new URL('MANIFEST.json?verify='+Date.now(),base));assert.equal(manifestBytes.toString(),fs.readFileSync(path.join(root,'MANIFEST.json'),'utf8'));const manifest=JSON.parse(manifestBytes);assert.equal(manifest.version,version);
  mark('published-hashes');hashAudit.expected=manifest.files.length;
  for(let i=0;i<manifest.files.length;i+=5){await Promise.all(manifest.files.slice(i,i+5).map(async entry=>{hashAudit.attempted++;try{const data=await bytes(new URL(entry.path+'?verify='+version,base)),sha256=crypto.createHash('sha256').update(data).digest('hex');if(data.length!==entry.bytes||sha256!==entry.sha256)hashAudit.failures.push({path:entry.path,expected:{bytes:entry.bytes,sha256:entry.sha256},actual:{bytes:data.length,sha256}});else hashAudit.verified++;}catch(error){hashAudit.failures.push({path:entry.path,error:clip(error)});}}));save();}
  assert.deepEqual(hashAudit.failures,[]);checks.push({name:'Published SHA-256 matches every manifest file',files:manifest.files.length});console.log('PASS '+manifest.files.length+' published file hashes');
  mark('browser-launch');save();const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch(require('./browser-launch.cjs')(true));
  for(const touch of [false,true]){
   profile={id:touch?'touch':'desktop',completed:false,stage:'context',startedMs:Date.now()-started};profiles.push(profile);mark('context');save();
   context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});page=await context.newPage();
   const owner=profile,eventContext=()=>({profile:owner.id,stage:owner.stage,elapsedMs:Date.now()-started});
   page.on('pageerror',error=>{counts.pageErrors++;push(errors,{...eventContext(),error:detail(error)},limits.errors);});
   page.on('crash',()=>{counts.pageErrors++;push(errors,{...eventContext(),error:'Renderer process crashed'},limits.errors);});
   page.on('console',message=>{const type=message.type();if(type!=='error'&&type!=='warning')return;const key=type==='error'?'consoleErrors':'consoleWarnings',location=message.location();counts[key]++;push(type==='error'?consoleErrors:consoleWarnings,{...eventContext(),text:clip(message.text(),4000),location:{url:clip(location.url),lineNumber:location.lineNumber,columnNumber:location.columnNumber}},limits[key]);});
   page.on('requestfailed',request=>networkFailure({...eventContext(),source:'browser-request',url:clip(request.url()),method:request.method(),resourceType:request.resourceType(),error:clip(request.failure()?.errorText)}));
   page.on('response',response=>{if(response.status()>=400)networkFailure({...eventContext(),source:'browser-response',url:clip(response.url()),status:response.status(),resourceType:response.request().resourceType()});});
   session=await context.newCDPSession(page);
   mark('navigate');await page.goto(new URL('?release='+version,base).href);
   mark('wait-ready');save();await Promise.all([page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000}),snapshot('after-navigation')]);
   mark('wait-loading-hidden');await page.locator('#loading').waitFor({state:'hidden'});await snapshot('before-native-start');
   mark('native-start');if(touch)await page.locator('#startBtn').tap();else await page.locator('#startBtn').click();
   mark('wait-active');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
   mark('playability-assertions');
   const result=await page.evaluate(()=>({version:document.documentElement.dataset.version,adaptive:settings.adaptive,quality:renderer.quality,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,programs:renderer.surfacePrograms.size,compileFailures:[...renderer.surfaceProgramFailures],species:SPECIES.length,mode:voyage.state.mode,focus:!!focusFish,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost(),viewportFits:document.documentElement.scrollWidth<=innerWidth,controls:['joystick','upBtn','downBtn','photoBtn'].map(id=>{const r=$(id).getBoundingClientRect();return {id,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));
   profile.result=result;
   assert.equal(result.version,version);assert.equal(result.adaptive,true);assert.equal(result.quality,touch?1:2);assert.equal(result.compiled,true);assert.equal(result.streamed,true);assert.equal(result.programs,10);assert.deepEqual(result.compileFailures,[]);assert.equal(result.species,46);assert.equal(result.mode,'free');assert.equal(result.focus,false);assert.equal(result.gl,0);assert.equal(result.lost,false);assert.equal(result.viewportFits,true);if(touch)assert(result.controls.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=390&&r.top>=0&&r.bottom<=844));
   mark('screenshot');await page.screenshot({path:imagePath(profile.id)});await snapshot('after-native-start');assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
   checks.push({name:touch?'Public touch start':'Public desktop start',...result});console.log('PASS '+profile.id+' public default automatic quality and playable world');profile.completed=true;
   mark('close-context');await context.close();context=null;page=null;session=null;save();
  }
  mark('final-error-check');assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.equal(checks.length,3);assert.deepEqual(profiles.map(p=>({id:p.id,completed:p.completed})),[{id:'desktop',completed:true},{id:'touch',completed:true}]);completed=true;mark('complete');
 }catch(error){
  fatal=detail(error);console.error(fatal);save();await snapshot('failure');
  if(page&&!page.isClosed())try{const file=imagePath((profile?.id||'unknown')+'-failure');await bounded(page.screenshot({path:file,timeout:3000}),4000,'Failure screenshot');push(observations,{profile:profile?.id||null,stage,label:'failure-screenshot',file},limits.observations);}catch(error){push(diagnosticErrors,{profile:profile?.id||null,stage,label:'failure-screenshot',error:detail(error)},limits.diagnosticErrors);}
 }finally{
  // Save before cleanup as well: an unresponsive browser must not erase failure evidence.
  save();if(browser)try{await bounded(browser.close(),10000,'Browser cleanup');}catch(error){fatal=fatal||detail(error);push(diagnosticErrors,{profile:profile?.id||null,stage,label:'browser-cleanup',error:detail(error)},limits.diagnosticErrors);}save();
 }
 console.log(JSON.stringify({output,status:status(),stage,profile:profile?.id||null,checks:checks.length,expectedChecks:3,fatal}));if(status()!=='passed')process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
