/* Normal new-dive/continue/reload acceptance at the existing start/save UI seam.
 * Observations use CDP userGesture:false. No save, time, pose, quality, seed or
 * animal writes; root serializes native GPU execution. Touch is emulation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const profile=option('profile','desktop'),touch=profile==='touch',url=option('url','http://127.0.0.1:8765/');
const out=path.resolve(root,option('out','qa/parity/v01837-realism/encounters-'+profile+'.json'));
assert(['desktop','touch'].includes(profile),'--profile must be desktop or touch');
assert(!new URL(url).searchParams.has('still'),'The lifecycle test requires normal advancing time');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={status:'running',profile,url,method:'Fresh browser context; installed headless Chrome native GPU; real start, pause, save-and-home, continue and reload inputs. Every page-script observation uses CDP userGesture:false. Default automatic quality is retained. Arrangement checks exclude advancing clock and actor pose. Touch is computer emulation, not a physical phone; this is not a performance benchmark.',checks:[],inputs:[],checkpoints:[],images:[],errors:[],consoleErrors:[]};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
const check=(name,pass,detail)=>{report.checks.push({name,passed:!!pass,detail});save();assert(pass,name);console.log('PASS '+name);};
(async()=>{let browser;
 try{
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch(require('./browser-launch.cjs')(true));
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch});
  const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('Renderer process crashed'));
  page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  const read=async fn=>{const result=await cdp.send('Runtime.evaluate',{expression:'('+fn.toString()+')()',returnByValue:true,userGesture:false});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const wait=async(fn,timeout=30000)=>{const until=Date.now()+timeout;while(Date.now()<until){if(await read(fn))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+fn.toString());};
  async function press(selector){const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();assert(await node.isEnabled(),'Enabled control: '+selector);
   if(touch){const box=await node.boundingBox();assert(box,'Control hit box');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await node.click();
   report.inputs.push({selector,type:touch?'touch':'mouse',at:new Date().toISOString()});
  }
  async function boot(){await wait(()=>window.__ocean?.ready||!document.getElementById('errorBox')?.classList.contains('hidden'),120000);assert(await read(()=>!!window.__ocean?.ready),await read(()=>document.getElementById('errorMessage')?.textContent));await page.locator('#loading').waitFor({state:'hidden'});await page.bringToFront();}
  async function home(){await press('#pauseBtn');await press('#menuHome');await wait(()=>!active&&!modal&&!$('welcome').classList.contains('hidden'));await page.locator('#shipContinue').waitFor({state:'visible'});}
  async function enter(selector){await press(selector);await wait(()=>active&&!modal&&$('welcome').classList.contains('hidden'));}
  async function shot(label){const file=out.replace(/\.json$/,'')+'-'+label+'.png',bytes=await page.screenshot({path:file});report.images.push({label,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});save();}
  let originalIdentities;
  async function snapshot(label){const data=await read(()=>{
   const stored=JSON.parse(localStorage.getItem(VOYAGE_KEY)||'null'),seed=voyage.state.features.encounters?.seed,g=renderer.gl,ext=g.getExtension('WEBGL_debug_renderer_info');
   const variableDeep=new Set(['coelacanth-002','pelican_eel-001','pelican_eel-002','pelican_eel-003','humpback_anglerfish-001','humpback_anglerfish-002']);
   const identities=[...life.map(f=>['life',f]),...decorLife.map(f=>['decor',f]),...shoal.map(f=>['shoal',f])].map(([group,f])=>({group,uid:f.uid,species:f.species??null,scale:f.s.slice(),bioSeed:f.bioSeed,morph:f.bioMorph?.slice(),genes:f.bioGenes?.slice(),home:variableDeep.has(f.uid)?null:f.home?.slice()||null,center:variableDeep.has(f.uid)?null:f.center?.slice()||null}));
   const arrangement={life:life.map(f=>[f.uid,f.phase??null,f.orbit??null,f.encounterPresent!==false,variableDeep.has(f.uid)?{home:f.home.slice(),center:f.center.slice(),homeYaw:f.homeYaw,radius:f.radius,floor:f.habitatFloor,ceiling:f.habitatCeiling}:null]),shoal:shoal.map(f=>[f.uid,f.phase??null,f.schoolHome?.slice()||null,f.schoolGroup??null,f.schoolSpan??null,f.schoolFloor??null])};
   return {seed,deep:oceanEncounters.snapshot().deep,deepVersion:voyage.state.features.encounters?.deepVersion,storedDeepVersion:stored?.features?.encounters?.deepVersion??null,storedSeed:stored?.features?.encounters?.seed??null,waypoint:voyage.state.waypoint,storedWaypoint:stored?.waypoint??null,dives:voyage.state.dives,storedDives:stored?.dives??null,resume:!!voyage.state.resume,storedResume:!!stored?.resume,saveOK:voyage.storageOK,active,modal,time:t,frame:renderer.frame,adaptive:settings.adaptive,settingQuality:settings.quality,quality:renderer.quality,dynamicScale:renderer.dynamicScale,version:document.documentElement.dataset.version,compiled:renderer.sceneLoad.compiled,streamed:renderer.sceneLoad.streamed,hardware:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,gl:g.getError(),lost:g.isContextLost(),freeze:!!window.__freeze,epochsMatch:life.every(f=>f.encounterEpoch===seed)&&shoal.every(f=>f.encounterEpoch===seed),identities,arrangement};
  });
   const identityHash=hash(data.identities),arrangementHash=hash(data.arrangement),row={label,...data,identityHash,arrangementHash};
   if(!originalIdentities){originalIdentities=data.identities;report.identities=originalIdentities;}delete row.identities;report.checkpoints.push(row);save();
   check(label+': stable UID, genes, morphology, scale and protected authored homes',identityHash===hash(originalIdentities));
   check(label+': default adaptive native compiled scene remains healthy',row.adaptive&&row.compiled&&row.streamed&&!row.freeze&&row.gl===0&&!row.lost&&!!row.hardware&&!/swiftshader|software|llvmpipe/i.test(row.hardware));
   check(label+': every real encounter actor uses the saved arrangement seed',Number.isInteger(row.seed)&&row.seed>0&&row.epochsMatch&&row.arrangement.life.length>0&&row.arrangement.shoal.length===380);
   if(label!=='fresh-home')check(label+': normal voyage save contains this seed and resume',row.saveOK&&row.storedSeed===row.seed&&row.storedDives===row.dives&&row.storedResume);
   return row;
  }
  function retained(label,expected,actual){check(label,actual.seed===expected.seed&&actual.arrangementHash===expected.arrangementHash&&actual.dives===expected.dives&&actual.deepVersion===expected.deepVersion&&JSON.stringify(actual.deep)===JSON.stringify(expected.deep),{seed:actual.seed,arrangementHash:actual.arrangementHash,dives:actual.dives});}
  await page.goto(url);await boot();const fresh=await snapshot('fresh-home');
  check('real animal identities have unique UIDs and finite genes, morphology and positive scales',originalIdentities.length>380&&new Set(originalIdentities.map(f=>f.uid)).size===originalIdentities.length&&originalIdentities.every(f=>typeof f.uid==='string'&&f.uid.length&&Number.isInteger(f.bioSeed)&&f.genes?.length===4&&f.genes.every(Number.isFinite)&&f.morph?.length===4&&f.morph.every(Number.isFinite)&&f.scale.length===3&&f.scale.every(n=>Number.isFinite(n)&&n>0)));
  check('fresh context has no prior resume and uses the device default quality',!fresh.resume&&fresh.dives===0&&fresh.quality===(touch?1:2));
  await enter('#startBtn');const first=await snapshot('new-dive-1');await shot('new-dive-1');
  check('first ordinary entry records one new dive and seed',first.dives===1&&first.seed!==fresh.seed);
  check('first real new dive activates six present spatial deep encounters',first.deepVersion===1&&first.storedDeepVersion===1&&first.deep.length===6&&first.deep.every(d=>d.choice>=0&&!d.fallback));
  await home();retained('save and home retain the first arrangement',first,await snapshot('home-after-first'));
  await enter('#startBtn');const second=await snapshot('new-dive-2');await shot('new-dive-2');
  check('second ordinary new dive changes saved seed and actual arrangement',second.dives===2&&second.seed!==first.seed&&second.arrangementHash!==first.arrangementHash,{first:first.seed,second:second.seed});
  check('second real dive preserves six safe deep placements and records spatial choices',second.deepVersion===1&&second.storedDeepVersion===1&&second.deep.length===6&&second.deep.every(d=>d.choice>=0&&!d.fallback),{changedHomes:second.deep.filter(d=>JSON.stringify(d.home)!==JSON.stringify(first.deep.find(x=>x.uid===d.uid).home)).length,first:first.deep,second:second.deep});
  // Choose a real distant common reef species, then use its ordinary journal
  // action. This changes the protection input without writing game/save state.
  await press('#pauseBtn');await press('#journalBtn');
  const target=await read(()=>SPECIES.map((sp,index)=>({id:sp.id,index,distance:Math.min(...life.filter(f=>f.species===index&&f.ecologyPresent!==false).map(f=>V.dist(animalFocusPoint(f),player.p))),observe:speciesTraits(index).observeDistance})).find(s=>s.index>0&&s.index<8&&Number.isFinite(s.distance)&&s.distance>s.observe+4));
  check('journal offers a distant common species with a real habitat action',!!target,target);
  await press('[data-species="'+target.index+'"]');await press('#findSpecies');await wait(()=>active&&!modal);
  const marked=await snapshot('habitat-marked');
  check('ordinary journal click saves the selected habitat',marked.waypoint==='habitat:'+target.id&&marked.storedWaypoint===marked.waypoint);
  retained('marking a habitat keeps this dive arrangement intact',second,marked);
  await home();retained('save and home retain the second arrangement',second,await snapshot('home-after-second'));
  await enter('#shipContinue');retained('normal continue retains phase, orbit, presence and school homes',second,await snapshot('continued'));
  await home();retained('resumed voyage saves without resampling encounters',second,await snapshot('home-before-reload'));
  await page.reload();await boot();retained('reload restores the same saved arrangement on the home screen',second,await snapshot('reloaded-home'));
  await enter('#shipContinue');retained('reload then continue preserves the exact encounter arrangement',second,await snapshot('reloaded-continue'));await shot('reloaded-continue');
  check('all native UI stages completed without page or console errors',report.errors.length===0&&report.consoleErrors.length===0,{errors:report.errors,consoleErrors:report.consoleErrors});
  report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser?.close();console.log(JSON.stringify({out,status:report.status,passed:report.checks.filter(c=>c.passed).length,total:report.checks.length}));}
})();
