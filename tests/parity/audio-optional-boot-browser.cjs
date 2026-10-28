/* Actual browser entry under native Web Audio faults. CDP observations never
 * grant user activation; only ordinary click/tap and swim input do. Touch is
 * Chrome emulation, not a physical phone. A finite injected synchronous stall
 * exposes the old loading dependency without hanging the test process. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),arg=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)||d;
const url=arg('url','http://127.0.0.1:8766/'),out=path.resolve(root,arg('out','qa/parity/v01836-audio/optional-boot.json'));
const report={url,status:'running',method:'Headless native Chrome, strict autoplay, CDP userGesture:false; default auto quality. Controlled Web Audio boundary faults only.',cases:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
function boundary(fault){
 const trace=window.__optionalAudio={constructors:[],resumes:[],fetches:[],fault};let attempts=0;
 const Native=window.AudioContext;
 const resume=Native.prototype.resume;Native.prototype.resume=function(...a){trace.resumes.push({active:navigator.userActivation.isActive,at:performance.now()});return Reflect.apply(resume,this,a);};
 if(fault==='suspend-pending')Native.prototype.suspend=function(){return new Promise(()=>{});};
 window.AudioContext=new Proxy(Native,{construct(Target,args){const row={active:navigator.userActivation.isActive,ready:!!window.__ocean?.ready,at:performance.now()};trace.constructors.push(row);attempts++;
  if(fault==='pre-gesture-stall'&&!navigator.userActivation.isActive){const end=performance.now()+2200;while(performance.now()<end){}row.stallMs=performance.now()-row.at;}
  if(fault==='constructor-failure'&&attempts<=2)throw Error('Injected unavailable audio device');
  return Reflect.construct(Target,args);
 }});
 const fetch=window.fetch;window.fetch=function(...args){if(/music\/.*\.mp3/.test(String(args[0]))){trace.fetches.push(String(args[0]));if(fault==='music-pending')return new Promise(()=>{});}return Reflect.apply(fetch,this,args);};
}
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');browser=await chromium.launch({...require('./browser-launch.cjs')(true),args:['--autoplay-policy=document-user-activation-required']});
  for(const touch of [false,true])for(const fault of ['normal','pre-gesture-stall','constructor-failure','suspend-pending','music-pending']){
   if(arg('profile','all')!=='all'&&arg('profile')!==(touch?'touch':'desktop'))continue;
   if(arg('case','all')!=='all'&&arg('case')!==fault)continue;
   const row={profile:touch?'touch':'desktop',fault,status:'running',checks:[],errors:[]};report.cases.push(row);save();
   const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
   try{
    await context.addInitScript(boundary,fault);const page=await context.newPage(),cdp=await context.newCDPSession(page);page.on('pageerror',e=>row.errors.push(e.message));
    const read=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,userGesture:false});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
    const wait=async(expression,timeout=30000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await read(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression);};
    const check=(name,ok)=>{row.checks.push({name,passed:!!ok});save();assert(ok,name);};
    const press=s=>touch?page.locator(s).tap():page.locator(s).click();
    await page.goto(url);await wait('!!window.__ocean?.ready',120000);await wait('$("loading").classList.contains("hidden")');
    row.home=await read('({trace:__optionalAudio,active:navigator.userActivation.hasBeenActive,context:oceanAudio.ctx?.state||null,adaptive:settings.adaptive,detail:$("loadDetail").textContent})');
    check('ready with no Web Audio work or music request before entry',!row.home.active&&row.home.context===null&&row.home.trace.constructors.length===0&&row.home.trace.fetches.length===0);
    check('automatic quality remains enabled',row.home.adaptive);
    await press('#startBtn');await wait('active&&$("welcome").classList.contains("hidden")');
    row.before=await read('player.p.slice()');
    if(touch){const r=await page.locator('#joystick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height*.17}]});await new Promise(r=>setTimeout(r,800));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await page.keyboard.down('w');await new Promise(r=>setTimeout(r,800));await page.keyboard.up('w');}
    row.after=await read('({p:player.p.slice(),context:oceanAudio.ctx?.state||null,trace:__optionalAudio,ready,active,gl:renderer.gl.getError(),lost:renderer.gl.isContextLost()})');
    check('normal swimming works even when audio fails or remains pending',row.after.ready&&row.after.active&&Math.hypot(...row.after.p.map((x,i)=>x-row.before[i]))>.1);
    check('audio only starts inside an activating entry gesture',row.after.trace.constructors.length>0&&row.after.trace.constructors.every(x=>x.active&&x.ready));
    if(fault==='normal'||fault==='pre-gesture-stall'){
     await wait('oceanAudio.ready&&oceanAudio.ctx?.state==="running"');
     check('native audio resumes in entry gesture',row.after.trace.resumes.some(x=>x.active));
    }
    check('no page or WebGL errors',row.errors.length===0&&row.after.gl===0&&!row.after.lost);
    row.status='passed';console.log('PASS '+row.profile+' '+fault);
   }catch(e){row.status='failed';row.failure=e.stack;throw e;}finally{save();await context.close();}
  }
  assert(report.cases.length);report.status='passed';
 }catch(e){report.status='failed';report.failure=e.stack;console.error(e);process.exitCode=1;}finally{save();await browser?.close();}
})();
