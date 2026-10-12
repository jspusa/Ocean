"""Real WebGL2 + deterministic state-machine/input checks; NOT a physical-device FPS test.
set_content + memory storage fixture, because top-level HTTP is environment-blocked.
Mission completion is controlled-fixture coverage, not a human playthrough.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time,traceback,sys,base64
R=Path(__file__).resolve().parents[2];out=R/'tests/v07';mobile='--mobile' in sys.argv;checks=[];errors=[];requests=[];start=time.time()
def check(name,ok,detail=None):
 checks.append({'check':name,'pass':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name+(' '+str(detail)[:230] if detail is not None else ''),flush=True)
def eq(pg,name,expr):
 try: val=pg.evaluate(expr);check(name,bool(val),val if not isinstance(val,bool) else None)
 except Exception as e:check(name,False,str(e))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 cx=b.new_context(viewport={'width':844 if mobile else 900,'height':390 if mobile else 600},has_touch=mobile,is_mobile=mobile,accept_downloads=True)
 pg=cx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
 try:
  html=(R/'standalone.html').read_text().replace("new URLSearchParams(location.search).has('still')",'true')
  memory="<script>const testMemory=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>testMemory.get(k)||null,setItem:(k,v)=>testMemory.set(k,String(v)),removeItem:k=>testMemory.delete(k)}});</script>"
  pg.set_content(html.replace('<head>','<head>'+memory),timeout=90000)
  pg.wait_for_function('window.__ocean?.ready || !document.getElementById("errorBox").classList.contains("hidden")',timeout=180000)
  assert pg.evaluate('!!window.__ocean?.ready'),pg.evaluate('$("errorMessage").textContent')
  eq(pg,'Compiled v0.7 scene boots; no procedural fallback','renderer.sceneLoad?.compiled===true')
  eq(pg,'12 animal groups / 9 landmarks','SPECIES.length===12&&LANDMARKS.length===9')
  eq(pg,'WebGL shader compilation and initial draw succeed','renderer.gl.getError()===0')
  eq(pg,'Instance IDs remain unique','new Set([...life,...decorLife,...shoal].map(f=>f.uid)).size===life.length+decorLife.length+shoal.length')
  check('No remote runtime dependencies',not requests,requests)
  eq(pg,'Real above-water ship camera','eye[1]>0&&!active&&renderer.batches.some(b=>b.material===12)')
  eq(pg,'Actual MSAA samples allocated','renderer.msaaSamples>=2',)
  if mobile:
   pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(200);pg.evaluate('updateCamera();renderer.render(eye,target,t)')
   pg.screenshot(path=str(out/'final-mobile-ship.png'));eq(pg,'Portrait ship can scroll to the mission board','$("welcome").scrollHeight>$("welcome").clientHeight&&getComputedStyle($("welcome")).overflowY==="auto"')
   pg.set_viewport_size({'width':844,'height':390});pg.wait_for_timeout(150)
  pg.evaluate('$("welcomeAudio").checked=false;$("startBtn").click();$("welcome").classList.add("hidden");renderer.quality=0;renderer.dynamicScale=.6;renderer.resize();updateLife(9);updateCamera();')
  eq(pg,'Voyage begins at anchorage, not in a menu-only scene','active&&V.dist(player.p,LANDMARKS[8].spawn)<.001')
  if mobile:
   cdp=cx.new_cdp_session(pg)
   def center(id):
    a=pg.locator(id).bounding_box();return [a['x']+a['width']/2,a['y']+a['height']/2]
   l=center('#joystick');r=center('#lookpad');pts=[{'x':l[0],'y':l[1],'id':1},{'x':r[0],'y':r[1],'id':2}]
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':pts});pts[0]['y']-=22;pts[1]['x']+=20;cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':pts})
   eq(pg,'Native two-touch input drives both sticks','stick[1]<-.4&&lookStick[0]>.4')
   before=pg.evaluate('({p:player.p.slice(),yaw:player.yaw})');pg.evaluate('for(let i=0;i<120;i++)updatePlayer(1/120)');after=pg.evaluate('({p:player.p.slice(),yaw:player.yaw})')
   check('Mobile movement and look occur together',sum(abs(a-v) for a,v in zip(before['p'],after['p']))>.2 and abs(before['yaw']-after['yaw'])>.2)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});eq(pg,'Touch release clears both sticks','Math.hypot(...stick,...lookStick)===0')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':l[0]+20,'y':l[1],'id':3}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});eq(pg,'Touch cancel clears movement','Math.hypot(...stick)===0')
   up=center('#upBtn');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':up[0],'y':up[1],'id':4}]});eq(pg,'Depth finger raises player','verticalInput===1');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});eq(pg,'Depth release resets','verticalInput===0')
   for w,h in [(390,844),(844,390)]:
    pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(150)
    eq(pg,f'Core controls visible and within viewport {w}x{h}','["joystick","lookpad","upBtn","downBtn","photoBtn","pauseBtn","voyageBtn"].every(id=>{let r=$(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5})')
    eq(pg,f'No horizontal document overflow {w}x{h}','document.documentElement.scrollWidth===innerWidth')
    eq(pg,f'FPS gauge does not overlap depth readout {w}x{h}',"(()=>{let a=$('fpsChip').getBoundingClientRect(),b=document.querySelector('.stats').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})()")
    eq(pg,f'Visible utility buttons have disjoint hit areas {w}x{h}',"(()=>{const els=[...document.querySelectorAll('.view-tools button'),$('autoBtn'),$('mapBtn'),$('lampBtn')].filter(e=>e.offsetWidth&&e.offsetHeight);for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){let a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)return false}return true})()")

  else:
   before=pg.evaluate('player.p.slice()');pg.keyboard.down('w');pg.evaluate('for(let i=0;i<120;i++)updatePlayer(1/120)');pg.keyboard.up('w');after=pg.evaluate('player.p.slice()')
   check('Keyboard moves through real game space',sum(abs(a-v) for a,v in zip(before,after))>.2)
   eq(pg,'Key release clears input','keys.size===0')
   before=pg.evaluate('player.yaw');pg.mouse.move(450,340);pg.mouse.down();pg.mouse.move(490,355,steps=4);pg.mouse.up();check('Drag look changes angle',abs(pg.evaluate('player.yaw')-before)>.05)
  if mobile:
   for w,h in [(844,390),(390,844)]:
    pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(150)
    pg.evaluate('resetInput();stopAuto();t=9;updateLife(t);player.p=collide([-102,-10,-41]);player.yaw=0;player.pitch=-.12;settings.third=true;renderer.quality=1;renderer.dynamicScale=1;renderer.resize();cameraCut=true;updateCamera();applyVisualSettings();renderer.forceShadow=true;renderer.render(eye,target,t);visited=new Set(LANDMARKS.map(l=>l.id));checkLandmarks();updateHUD();paintVoyageHUD();$("toast").classList.remove("show");$("landmarkBanner").classList.add("hidden");')
    pg.screenshot(path=str(out/('final-mobile-landscape.png' if w>h else 'final-mobile-portrait.png')))
    eq(pg,f'Mobile actual render without GL error {w}x{h}','renderer.gl.getError()===0')
   pg.set_viewport_size({'width':844,'height':390});pg.evaluate('renderer.quality=0;renderer.dynamicScale=.6;renderer.resize()')
  pg.evaluate('resetInput();stopAuto();')
  eq(pg,'Measured distance follows simulation, not camera teleport','voyage.state.distance>0&&voyage.state.distance<10')
  pg.evaluate('window.beforeMark=player.p.slice();openPanel("map");$("panelBody").querySelector("[data-mark=gate]").click();')
  eq(pg,'Map creates waypoint without teleporting','voyage.state.waypoint==="gate"&&V.dist(player.p,beforeMark)===0&&!modal')
  pg.evaluate('$("cruiseBtn").click()');eq(pg,'Cruise toggles active state','voyage.state.cruise');pg.evaluate('$("cruiseBtn").click()')
  pg.evaluate('$("photoModeBtn").click()');eq(pg,'Photo mode changes actual camera field of view','voyage.photoMode&&renderer.photoFov===48');pg.evaluate('$("photoModeBtn").click()')
  pg.evaluate('$("pauseBtn").click()');eq(pg,'Pause opens pause panel','modal==="pause"&&!!$("resumeBtn")');pg.evaluate('$("resumeBtn").click()');eq(pg,'Resume closes pause','modal===null')
  # Hardware-independent controller API fixture: this is not a physical controller test.
  pg.evaluate('window.mockPad={connected:true,axes:[.7,-.6,.45,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[mockPad]});pollGamepad();')
  eq(pg,'Standard gamepad axes are read','stick[0]>.5&&lookStick[0]>.2')
  pg.evaluate('mockPad.axes=[0,0,0,0];mockPad.buttons[9].pressed=true;pollGamepad()');eq(pg,'Controller Start pauses','modal==="pause"')
  pg.evaluate('mockPad.buttons[9].pressed=false;pollGamepad();mockPad.buttons[9].pressed=true;pollGamepad()');eq(pg,'Controller Start resumes from pause','modal===null')
  pg.evaluate('mockPad.connected=false;pollGamepad();resetInput()');eq(pg,'Controller disconnect clears input','Math.hypot(...stick,...lookStick)===0')
  # Photo and observation use a real animal and real scene renderer.
  pg.evaluate('voyage.state.mode="free";t=9;updateLife(t);findSpecies(8);updateCamera();applyVisualSettings();renderer.render(eye,target,t);updateHUD();')
  eq(pg,'Close observation follows a real turtle','follow?.species===8&&V.dist(eye,follow.p)>2')
  pg.evaluate('window.photoCandidate=gradePhoto();lastPhoto=0;takePhoto();')
  eq(pg,'Photo contains a rendered JPEG and geometric score','persistent.photos.length===1&&persistent.photos[0].url.length>2000&&Number.isFinite(persistent.photos[0].grade)')
  check('Real-animal photo score diagnostic',True,pg.evaluate('({score:persistent.photos.at(-1).grade,species:persistent.photos.at(-1).species,metrics:persistent.photos.at(-1).metrics})'))
  eq(pg,'No GL error after capture and MSAA resolve','renderer.gl.getError()===0')
  pg.evaluate('window.firstId=follow.uid;nextIndividual();updateCamera();updateHUD();') if False else None
  uid=pg.evaluate('follow.uid');pg.evaluate('$("nextIndividual").click();updateCamera();updateHUD();');check('Next chooses a different same-species actual animal',pg.evaluate('follow.uid')!=uid and pg.evaluate('follow.species===8'))
  pg.evaluate('stopAuto();voyage.state.mode="journey";player.p=LANDMARKS[0].spawn.slice();findSpecies(10);');eq(pg,'Distant specimen cannot teleport in journey mode','!follow&&voyage.state.waypoint==="pelagic"')
  pg.evaluate('openPanel("journal")');check('Journal has twelve cards',pg.locator('.species-card').count()==12)
  pg.evaluate('renderSpecies(11)');eq(pg,'Dolphin detail can be opened','document.getElementById("panelBody").textContent.includes("瓶鼻海豚")')
  pg.evaluate('closePanel();$("soundBtn").click()');pg.wait_for_function('oceanAudio.ctx?.state==="running"&&oceanAudio.sources?.length===2',timeout=60000)
  eq(pg,'Both original music stems decode to non-zero samples','oceanAudio.sources.every(s=>s.buffer.getChannelData(0).some(v=>Math.abs(v)>.001))')
  pg.evaluate('settings.sound=false;oceanAudio.mute()')
  # End-to-end six-objective state machine fixture. Each requirement is evaluated separately.
  pg.evaluate('voyage.state=initialVoyage();voyage.state.distance=31;player.p=[LANDMARKS[0].x,-8,LANDMARKS[0].z];voyageTick(.1)')
  eq(pg,'Arrival triggers only after travel and discovery','voyage.state.completed.includes("arrival")')
  pg.evaluate('persistent.seen=SPECIES.slice(0,3).map(s=>s.id);evaluateOrders()');eq(pg,'Three discoveries complete naturalist','voyage.state.completed.includes("naturalist")')
  pg.evaluate('voyage.state.bestPhotos.turtle={score:80,individual:"fixture",date:Date.now()};evaluateOrders()');eq(pg,'Photographer requires scored photo','voyage.state.completed.includes("photographer")')
  pg.evaluate('player.p=[-102,-10,-76];voyageTick(.1)');eq(pg,'World-space gate discovery completes passage','voyage.state.completed.includes("passage")')
  pg.evaluate('player.p=[0,-8,0];window.remoteRead=readLogger()');eq(pg,'Remote logger interaction is rejected','remoteRead===false&&!voyage.state.reading')
  pg.evaluate('player.p=[95,groundHeight(99,-166)+3,-147];readLogger()');eq(pg,'Nearby logger opens original story and completes archive','voyage.state.reading&&modal==="letter"&&voyage.state.completed.includes("archive")');pg.evaluate('$("letterClose").click()')
  pg.evaluate('voyage.state.mode="free";t=9;updateLife(t);findSpecies(10);updateCamera();renderer.render(eye,target,t);voyage.state.mode="journey";for(let i=0;i<42;i++)observeWhale(.1);evaluateOrders();')
  eq(pg,'Visible real whale observation completes final memory','voyage.state.whaleWatch>=4&&voyage.state.completed.includes("song")')
  pg.evaluate('goHome()');eq(pg,'Returning to ship finishes six-memory voyage','!active&&voyage.state.ended&&voyage.state.completed.length===6&&$("debrief").classList.contains("hidden")===false')
  pg.evaluate('$("debriefClose").click();saveVoyage();window.savedState=JSON.stringify(voyage.state);voyage.state=initialVoyage();loadVoyage();');eq(pg,'Save is restored from storage fixture','JSON.stringify(voyage.state)===savedState')
  eq(pg,'Unknown imported IDs/settings are filtered','(()=>{let d={format:"return-blue/save",version:1,voyage:{...initialVoyage(),completed:["arrival","BAD"],visited:["BAD"],resume:{p:[Infinity,0,0],yaw:0,pitch:0}},journal:{seen:["BAD","clown"],settings:{quality:99,speed:-50,master:7},photos:[{url:"javascript:alert(1)"}]}};let x=validateImport(d);return x.state.completed.length===1&&x.state.visited.length===0&&!x.state.resume&&x.photos.length===0&&x.seen.length===1&&x.settings.quality===2&&x.settings.speed===.4&&x.settings.master===1})()')
  eq(pg,'Foreign save format is rejected','(()=>{try{validateImport({format:"unrelated"});return false}catch(e){return true}})()')
  with pg.expect_download(timeout=20000) as dl:pg.evaluate('exportSave()')
  dest=out/('save-export-mobile.json' if mobile else 'save-export-desktop.json');dl.value.save_as(dest);data=json.loads(dest.read_text());check('Actual save download contains six memories and a JPEG',data['format']=='return-blue/save' and len(data['voyage']['completed'])==6 and len(data['journal']['photos'])==1)
  # Actual file-input import and the overwrite confirmation, not only validator calls.
  data['journal']['settings']['speed']=1.3
  imported=out/('import-fixture-mobile.json' if mobile else 'import-fixture-desktop.json');imported.write_text(json.dumps(data))
  pg.evaluate('openPanel("voyage")');pg.once('dialog',lambda d:d.accept());pg.locator('#importSave').set_input_files(str(imported));pg.wait_for_function('settings.speed===1.3',timeout=20000)
  eq(pg,'Actual save-file input restores settings/progress','settings.speed===1.3&&voyage.state.completed.length===6&&persistent.photos.length===1')
  data['voyage']['completed']=[];imported.write_text(json.dumps(data));pg.evaluate('openPanel("voyage")');pg.once('dialog',lambda d:d.dismiss());pg.locator('#importSave').set_input_files(str(imported));pg.wait_for_timeout(300)
  eq(pg,'Cancel import leaves current progress unchanged','voyage.state.completed.length===6')
  pg.evaluate('window.originalWrite=localStorage.setItem;localStorage.setItem=()=>{throw new DOMException("full","QuotaExceededError")};saveVoyage()')
  eq(pg,'Storage-full error is caught and reported','voyage.storageOK===false')
  pg.evaluate('localStorage.setItem=originalWrite;saveVoyage()');eq(pg,'Saving recovers after storage is available','voyage.storageOK===true')
  eq(pg,'No uncaught page errors after interactions','true');check('Page error list is empty',not errors,errors)
 except Exception as e:
  check('Unhandled test exception',False,str(e));traceback.print_exc()
 finally:
  report={'version':'0.7.0','mode':'mobile touch emulation' if mobile else 'desktop','seconds':round(time.time()-start,2),'environment':'Chromium144/LinuxXvfb/ANGLE-SwiftShader, set_content portable, memory localStorage fixture, manually stepped simulation (not a FPS benchmark)','checks':checks,'pageErrors':errors,'requests':requests,'notTested':['physical phone/Safari/hardware gamepad','hardware GPU FPS/thermal','public GitHub Pages','human full playthrough','Wii measured quality parity']};(out/('mobile-results.json' if mobile else 'desktop-results.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));b.close()
  if not all(c['pass'] for c in checks):sys.exit(1)
