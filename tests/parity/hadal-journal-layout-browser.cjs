/* Targeted native Chrome touch-layout regression, run serially with other GPU
 * tests. Visible UI accepts a fresh hadal invitation; no saves or task progress
 * are seeded. This proves journal layout only, not a complete field survey or
 * physical-phone acceptance. All touch input uses Playwright tap(), never CDP
 * touch events. CDP is used only to emulate safe-area insets.
 * PLAYWRIGHT_PATH=... node tests/parity/hadal-journal-layout-browser.cjs
 *   --url=http://127.0.0.1:8765/ --out=qa/parity/hadal-journal-layout-red.json
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),output=path.resolve(__dirname,'../..',option('out','qa/parity/hadal-journal-layout.json'));
assert(/\.json$/i.test(output),'--out must name a JSON file');
const views=[{width:844,height:390,insets:{top:0,right:44,bottom:21,left:44}},{width:320,height:568,insets:{top:24,right:0,bottom:20,left:0}}];
const checks=[],errors=[],consoleErrors=[],inputs=[],screenshots=[];let metadata=null,fatal=null,stage='launch';
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};
const artifact=label=>output.replace(/\.json$/i,'-'+label+'.png');
(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});let browser,context,page,session;
 try{
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  page=await context.newPage();page.setDefaultTimeout(30000);session=await context.newCDPSession(page);
  page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Renderer process crashed'));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  async function settlePanel(){
   await page.locator('#panel').evaluate(e=>Promise.all(e.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
   // Include the normal 40 ms dialog focus callback before exercising Tab.
   await page.waitForTimeout(80);
  }
  async function tap(selector){
   const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();await node.tap();
   inputs.push({type:'tap',selector,at:new Date().toISOString()});await page.waitForTimeout(130);
  }
  async function shot(label){const file=artifact(label),bytes=await page.screenshot({path:file});screenshots.push({label,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  async function resize(view){
   await page.setViewportSize({width:view.width,height:view.height});await session.send('Emulation.setSafeAreaInsetsOverride',{insets:view.insets});await page.waitForTimeout(450);await settlePanel();
  }
  async function layout(id,view,label){
   const node=page.locator('#'+id);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();
   const result=await node.evaluate(e=>{const r=e.getBoundingClientRect(),body=document.getElementById('panelBody'),style=getComputedStyle(body),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {id:e.id,viewport:{width:innerWidth,height:innerHeight},rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',hit:hit?.closest('button')===e,disabled:e.disabled,overflow:document.documentElement.scrollWidth>innerWidth,scroll:{top:body.scrollTop,height:body.scrollHeight,clientHeight:body.clientHeight,paddingTop:style.scrollPaddingTop,paddingBottom:style.scrollPaddingBottom},focus:document.activeElement?.id||null};});
   const r=result.rect,i=view.insets;
   check(label+' '+id+' remains inside all safe-area edges after scrollIntoViewIfNeeded',result.visible&&result.hit&&!result.overflow&&r.width>=44&&r.height>=44&&r.left>=i.left&&r.top>=i.top&&r.right<=result.viewport.width-i.right&&r.bottom<=result.viewport.height-i.bottom,{...result,insets:i});
   await shot(label+'-'+id);
  }
  async function keyboardContained(label){
   const trail=[];for(const key of ['Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab']){await page.keyboard.press(key);trail.push(await page.evaluate(()=>({id:document.activeElement?.id||null,tag:document.activeElement?.tagName||null,inside:document.getElementById('panel').contains(document.activeElement)})));}
   check(label+' forward and backward Tab remain in the visible journal',trail.every(row=>row.inside),trail);
  }
  stage='boot';await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});
  assert(await page.evaluate(()=>window.__ocean?.ready),await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();
  metadata=await page.evaluate(()=>{const gl=renderer.gl,extension=gl.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,touchPoints:navigator.maxTouchPoints,adaptive:settings.adaptive,contextLost:gl.isContextLost()};});
  check('native hardware renderer and automatic quality are active',!!metadata.renderer&&!/swiftshader|software|llvmpipe/i.test(metadata.renderer)&&metadata.adaptive&&!metadata.contextLost&&metadata.touchPoints>0,metadata);
  assert(checks.at(-1).pass,'Native hardware is required for this browser evidence');
  stage='visible-invitation';await tap('#welcomeActivities');await page.waitForFunction(()=>modal==='activities');await settlePanel();await tap('[data-activity-open="hadal"]');await page.waitForFunction(()=>modal==='hadal');await settlePanel();
  check('visible invitation starts without seeded acceptance or field progress',await page.evaluate(()=>{const s=oceanStory.hadal.snapshot();return !s.started&&s.records.length===0&&!s.reported&&!active;}));
  for(const view of views){const label='invitation-'+view.width+'x'+view.height;stage=label;await resize(view);await layout('hadalBegin',view,label);await keyboardContained(label);}
  // Match the real full-survey runner: accept at the ordinary portrait size,
  // then resize the same open journal before testing each scroll target.
  await resize({width:390,height:844,insets:{top:0,right:0,bottom:0,left:0}});stage='accept';await tap('#hadalBegin');await page.locator('#hadalMark').waitFor({state:'visible'});await settlePanel();
  check('native tap accepts the invitation without granting survey records',await page.evaluate(()=>{const s=oceanStory.hadal.snapshot();return s.started&&s.records.length===0&&!s.reported&&!active&&modal==='hadal';}));
  for(const view of views){const label='journal-'+view.width+'x'+view.height;stage=label;await resize(view);for(const id of ['hadalMark','hadalNavigation','hadalRecord'])await layout(id,view,label);await keyboardContained(label);}
  check('layout inspection does not complete any field operation',await page.evaluate(()=>{const s=oceanStory.hadal.snapshot();return s.started&&s.records.length===0&&!s.reported&&!active&&renderer.gl.getError()===0&&!renderer.gl.isContextLost();}));
  check('no native page errors',errors.length===0,errors);
 }catch(error){fatal=error.stack||String(error);console.error(fatal);if(page)try{await page.screenshot({path:artifact('failure')});screenshots.push({label:'failure',file:artifact('failure')});}catch(_){} }
 finally{
  if(session)await session.detach().catch(()=>{});if(browser)await browser.close().catch(()=>{});
  const passed=!fatal&&checks.length>0&&checks.every(item=>item.pass);fs.writeFileSync(output,JSON.stringify({status:passed?'passed':'failed',scope:'Native touch-emulated journal layout only; not field-survey completion or physical-phone acceptance',url,metadata,views,checks,errors,consoleErrors,inputs,screenshots,stage,fatal},null,2));
  console.log(checks.filter(item=>item.pass).length+'/'+checks.length+' native journal layout checks passed; '+output);if(!passed)process.exitCode=1;
 }
})();
