/* Native guide image error acceptance: real HTTP 503 / invalid JPEG bytes,
 * normal journal/card/back/quiz controls, fresh saves and no progress writes.
 * CDP page reads explicitly use userGesture:false. No performance conclusions.
 * Author-side validation is node --check only; root serializes native GPU runs.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),profile=option('profile','desktop'),touch=profile==='touch';
const output=path.resolve(__dirname,'../..',option('out','qa/parity/v01819-guide-image-fallback-browser-'+profile+'.json'));
assert(['desktop','touch'].includes(profile),'--profile must be desktop or touch');
const cases=[],checks=[];let fatal=null;
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);assert(pass,name);}
(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 try{for(const fault of ['network','decode']){
  const row={fault,requests:[],errors:[],images:[],quizAttempts:0};cases.push(row);
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  try{
   const page=await context.newPage(),session=await context.newCDPSession(page),affected=new Set(['frilled_shark','oarfish','sea_pig']);
   page.on('pageerror',e=>row.errors.push(e.message));page.on('crash',()=>row.errors.push('Renderer process crashed'));
   const read=async(fn,arg)=>{const r=await session.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
   const wait=async(fn,arg,timeout=15000)=>{const until=Date.now()+timeout;while(Date.now()<until){const value=await read(fn,arg);if(value)return value;await page.waitForTimeout(60);}throw Error('Timed out: '+fn.toString());};
   async function press(selector){const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();if(touch)await node.tap();else await node.click();}
   await page.route('**/assets/guide_*.jpg*',async route=>{
    const id=/\/guide_([^/]+)\.jpg$/.exec(new URL(route.request().url()).pathname)?.[1];
    if(!affected.has(id))return route.continue();
    row.requests.push({id,url:route.request().url(),fault});
    await route.fulfill(fault==='network'?{status:503,contentType:'text/plain',body:'Intentional guide-image availability fixture'}:{status:200,contentType:'image/jpeg',body:Buffer.from('Intentional invalid JPEG decode fixture')});
   });
   await page.goto(url);await wait(()=>window.__ocean?.ready,null,120000);await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
   // These registered groups author SVG thumbs before boot prefers asset JPEGs.
   // Reading their identities only extends the HTTP fault set; no RNG override.
   for(const id of await read(()=>SPECIES.filter(s=>s.fauna&&!s.pelagic&&!s.cetacean&&!s.reefFish).map(s=>s.id)))affected.add(id);
   row.before=await read(()=>({seen:window.__ocean.seen,photos:window.__ocean.photos}));
   await press('#startBtn');await wait(()=>window.__ocean.active);
   await press('#fieldToolsBtn');await press('#journalBtn');
   const catalogue=await read(()=>SPECIES.map((s,index)=>({id:s.id,index,thumb:s.thumb})));
   row.speciesCount=catalogue.length;
   async function decoded(selector,label){
    const info=await wait(selector=>{const img=document.querySelector(selector);return img?.complete&&img.naturalWidth>0&&img.currentSrc.startsWith('data:image/svg+xml')?{src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}:null;},selector);
    check(fault+' '+label+' uses decoded local SVG',info.width>0&&info.height>0,{width:info.width,height:info.height});
    return info.src;
   }
   for(const id of ['frilled_shark','oarfish','sea_pig']){
    const species=catalogue.find(s=>s.id===id);assert(species,'Required authored species exists: '+id);
    check(fault+' '+id+' keeps preferred JPEG',/assets\/guide_[^/]+\.jpg(?:\?|$)/.test(species.thumb));
    const card='[data-species="'+species.index+'"]';
    const svg=await decoded(card+' img',id+' catalogue');await press(card);
    assert.equal(await decoded('#panelBody > img.detail-art',id+' detail'),svg,'Detail uses the same original authored SVG');
    if(id==='frilled_shark'){
     const file=output.replace(/\.json$/,'')+'-'+fault+'-detail.png';await page.screenshot({path:file});row.images.push(file);
    }
    await press('#backSpecies');assert.equal(await decoded(card+' img',id+' recreated catalogue'),svg);
   }
   // Real quiz choice stays random. Reopening its public tab is bounded and
   // selects normally until a species covered by the HTTP fault is presented.
   let quiz=null;
   for(let attempt=0;attempt<100;attempt++){
    await press('[data-tab="quiz"]');row.quizAttempts++;
    const selected=await read(()=>({id:SPECIES[quizAnswer].id,thumb:SPECIES[quizAnswer].thumb}));
    if(!affected.has(selected.id))continue;
    const svg=await decoded('#quizBody > img.detail-art',selected.id+' quiz');quiz={...selected,svgLength:svg.length};break;
   }
   check(fault+' natural quiz receives fallback',!!quiz,quiz);row.quiz=quiz;
   row.after=await read(()=>({seen:window.__ocean.seen,photos:window.__ocean.photos}));
   assert.deepEqual(row.after,row.before,'Guide fallback must not invent observations or photographs');
   check(fault+' all required guide requests actually faulted',['frilled_shark','oarfish','sea_pig'].every(id=>row.requests.some(r=>r.id===id)));
   check(fault+' no runtime errors',row.errors.length===0,row.errors);
  }finally{await context.close();}
 }}catch(error){fatal=error.stack||String(error);console.error(fatal);process.exitCode=1;}finally{
  await browser.close();fs.writeFileSync(output,JSON.stringify({url,profile,checks,cases,fatal,passed:!fatal&&checks.every(c=>c.pass)},null,2)+'\n');
 }
})();
