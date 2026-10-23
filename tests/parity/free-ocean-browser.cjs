/* Browser integration for the continuous ocean. Software WebGL is used here;
 * deterministic physics steps exercise actual controls without GPU-dependent
 * timing. Touch is browser emulation, not physical-device certification. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let pw;for(const candidate of [process.env.PLAYWRIGHT_PATH,'playwright','/opt/codex/cua_node/lib/node_modules/playwright'].filter(Boolean)){try{pw=require(candidate);break;}catch{}}
if(!pw)throw Error('Playwright is required for browser QA');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/';
const root=path.resolve(__dirname,'../..'),out=path.join(root,'qa/parity');fs.mkdirSync(out,{recursive:true});const results=[],errors=[];
const check=(name,value,detail)=>{results.push({name,pass:!!value,detail});console.log((value?'PASS ':'FAIL ')+name);};
const modes=[{id:'desktop',width:1100,height:740,touch:false},{id:'portrait',width:390,height:844,touch:true},{id:'landscape',width:844,height:390,touch:true}].filter(m=>!process.argv.some(a=>['--desktop','--portrait','--landscape'].includes(a))||process.argv.includes('--'+m.id));
(async()=>{const browser=await pw.chromium.launch(require('./browser-launch.cjs')());
 try{for(const m of modes){
  const context=await browser.newContext({viewport:{width:m.width,height:m.height},deviceScaleFactor:1,isMobile:m.touch,hasTouch:m.touch}),page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push({mode:m.id,message:e.message}));
  await page.addInitScript(()=>{if(!localStorage.getItem('return-blue.shilang.v1'))localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:0,adaptive:false,startWithSound:false,reduced:true}}));});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});
  check(m.id+' boots compiled scene and shaders',await page.evaluate(()=>renderer.sceneLoad.compiled&&renderer.gl.getError()===0));
  check(m.id+' minimal home fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelectorAll('#welcome .primary:not([hidden])').length===1&&$('startBtn').getBoundingClientRect().bottom<innerHeight));
  await page.screenshot({path:path.join(out,'free-ocean-'+m.id+'-home.png'),timeout:90000});
  const click=async selector=>m.touch?page.locator(selector).tap():page.locator(selector).click();
  await click('#shipSettings');check(m.id+' settings expose only essentials',await page.evaluate(()=>!$('panelBody').querySelector('details').open&&[...$('panelBody').querySelectorAll('input,select')].filter(e=>e.checkVisibility()).length===3));
  await page.selectOption('#qualityPreset','0');await click('#closePanel');
  await click('#startBtn');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
  check(m.id+' one click enters unrestricted swimming',await page.evaluate(()=>voyage.state.mode==='free'&&renderer.submersible===false&&!voyage.state.features.deepsea.deployed));
  check(m.id+' initial reef has no nearby giant animals or wild cold-water cetaceans',await page.evaluate(()=>{
   const large=new Set(['whale','blue_whale','whale_shark','orca','false_killer_whale']),cold=new Set(['beluga','commerson_dolphin','white_sided_dolphin']);
   return life.filter(f=>large.has(SPECIES[f.species]?.id)).every(f=>V.dist(f.p,player.p)>200)&&life.filter(f=>cold.has(SPECIES[f.species]?.id)).every(f=>f.ecologyPresent===false);
  }));
  await click('#pauseBtn');await page.waitForFunction(()=>modal==='diveMenu');await click('#mapBtn');const mapBefore=await page.evaluate(()=>player.p.slice());await click('[data-mark="trench:hadal"]');
  check(m.id+' unified map marks depth without teleporting',await page.evaluate(p=>voyage.state.waypoint==='trench:hadal'&&V.dist(player.p,p)<.001,mapBefore));
  if(!m.touch){
   const before=await page.evaluate(()=>player.p.slice());await page.keyboard.down('w');await page.evaluate(()=>{for(let k=0;k<120;k++)updatePlayer(1/60)});await page.keyboard.up('w');check('desktop actual keyboard advances swimmer',await page.evaluate(p=>V.dist(p,player.p)>3,before));
  }else{
   // Run raw CDP drags last: mixing CDP touch IDs suppresses subsequent
   // Playwright synthetic clicks even on an otherwise empty HTML page.
   await page.locator('#joystick').waitFor({state:'visible'});
   // Raw CDP does not wait for the compositor hit-test tree after a panel closes.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(150);
   const session=await context.newCDPSession(page),box=await page.locator('#joystick').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-30,id:1}]});
   check(m.id+' touch joystick controls movement',await page.evaluate(()=>stick[1]<-.2));await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();await page.waitForTimeout(180);
   check(m.id+' touch control release clears input',await page.evaluate(()=>stick.every(v=>v===0)));
   check(m.id+' touch controls stay inside viewport',await page.evaluate(()=>['joystick','vertical','photoBtn','boostBtn'].every(id=>{const r=$(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})));
  }
  if(!m.touch){
   const cross=await page.evaluate(()=>{resetInput();player.p=[258,-10,-90];player.yaw=Math.PI/2;player.pitch=0;keys.add('KeyW');for(let i=0;i<300;i++)updatePlayer(1/60);keys.clear();return player.p.slice();});check('continuous controls cross the old reef boundary',cross[0]>270&&cross[1]<0,cross);
   const saved=await page.evaluate(()=>{player.p=[766,-7000,-120];player.yaw=.4;player.pitch=-.1;resetInput();oceanDeepsea.feature.tick();saveVoyage();return player.p.slice();});
   await click('#pauseBtn');await click('#menuHome');check('home saves exact hadal position without debrief',await page.evaluate(p=>!active&&$('debrief').classList.contains('hidden')&&V.dist(voyage.state.resume.p,p)<.001,saved));
   await page.reload();await page.waitForFunction(()=>window.__ocean?.ready||!document.getElementById('errorBox').classList.contains('hidden'),null,{timeout:120000});if(!await page.evaluate(()=>window.__ocean?.ready))throw Error(await page.locator('#errorMessage').textContent());await page.locator('#loading').waitFor({state:'hidden'});await click('#shipContinue');await page.waitForFunction(()=>active&&$('welcome').classList.contains('hidden'));
   check('reload continues swimming at 7000m',await page.evaluate(p=>V.dist(player.p,p)<.001&&oceanDeepsea.isActive()&&!renderer.submersible,saved));
   await page.evaluate(async()=>{updateLife(10);const f=life.find(f=>SPECIES[f.species].id==='blue_whale');let camera;for(const height of [5,10,15])for(let i=0;i<16;i++){const angle=i*Math.PI/8,p=V.add(f.p,[Math.sin(angle)*30,height,Math.cos(angle)*30]);if(!camera&&p[1]<-.7&&p[1]>groundHeight(p[0],p[2])+1&&!blocked(p,f.p))camera=p;}if(!camera)throw Error('No clear whale view');await window.__prepareView(camera,f.p,10);oceanDeepsea.feature.tick();});await page.screenshot({path:path.join(out,'free-ocean-blue-whale.png'),timeout:90000});
   check('blue whale and whale shark are actual rendered actors',await page.evaluate(()=>['blue_whale','whale_shark'].every(id=>life.some(f=>SPECIES[f.species].id===id&&f.s[0]>=8.5))&&renderer.gl.getError()===0));
   const patrol=await page.evaluate(()=>{const fish=life.find(f=>SPECIES[f.species].id==='blue_whale'),destination=voyageDestination('habitat:blue_whale');return V.dist([destination.x,destination.y-.6,destination.z],fish.p)<.01&&destination.radius<20;});check('optional whale marker follows the real offshore animal',patrol);
   await page.evaluate(async()=>{updateLife(12);const f=life.find(f=>SPECIES[f.species].id==='whale_shark'),c=Math.cos(f.yaw),s=Math.sin(f.yaw),offset=[c*6+s*9,2,-s*6+c*9];await window.__prepareView(V.add(f.p,offset),f.p,12);oceanDeepsea.feature.tick();});await page.screenshot({path:path.join(out,'free-ocean-whale-shark.png'),timeout:90000});
   check('offshore whale shark retains sunlight and a valid rendered surface',await page.evaluate(()=>renderer.gl.getError()===0&&player.p[1]<-10&&player.p[0]>300&&$('areaName').textContent==='外海大陸坡'));
   await page.evaluate(async()=>{updateLife(12);const f=life.find(f=>SPECIES[f.species].id==='mariana_snailfish');await window.__prepareView(V.add(f.p,[.38,.12,.8]),f.p,12);oceanDeepsea.feature.tick();});await page.screenshot({path:path.join(out,'free-ocean-hadal.png'),timeout:90000});
   check('hadal rendering keeps lamp and no GL error',await page.evaluate(()=>renderer.lamp&&!renderer.submersible&&renderer.gl.getError()===0));
  }
  await context.close();
 }}finally{await browser.close();check('no browser runtime errors',errors.length===0,errors);fs.writeFileSync(path.join(out,'free-ocean-browser.json'),JSON.stringify({gpuMode:process.env.NATIVE_GPU==='1'?'native':'software',results,errors},null,2));}
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
