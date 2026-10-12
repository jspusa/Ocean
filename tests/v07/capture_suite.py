"""Actual WebGL screenshots of the delivered scene, deterministic cameras/time; not FPS evidence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import time,json,base64
R=Path(__file__).resolve().parents[2];out=R/'tests/v07';start=time.time()
scenes={
 'ship':'active=false;settings.third=true;',
 'gate':'active=true;settings.third=true;player.p=collide([-102,-10,-41]);player.yaw=0;player.pitch=-.12;voyage.state.waypoint="gate";',
 'wreck':'active=true;settings.third=true;player.p=collide([105,-25,-131]);player.yaw=-.13;player.pitch=-.25;voyage.state.waypoint="wreck";',
 'reef':'active=true;settings.third=true;player.p=collide([0,-7.6,23]);player.yaw=.03;player.pitch=-.055;',
 'whale':'active=true;voyage.state.mode="free";findSpecies(10);voyage.state.waypoint="pelagic";',
 'dolphin':'active=true;voyage.state.mode="free";findSpecies(11);voyage.state.waypoint="wings";',
 'chart':'active=true;player.p=[-102,-10,-41];openPanel("map");'
}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 cx=b.new_context(viewport={'width':1440,'height':900},device_scale_factor=1);pg=cx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'standalone.html').read_text().replace("new URLSearchParams(location.search).has('still')",'true');pg.set_content(html,timeout=90000);pg.wait_for_function('window.__ocean?.ready||!document.getElementById("errorBox").classList.contains("hidden")',timeout=180000);assert pg.evaluate('!!window.__ocean?.ready'),pg.evaluate('$("errorMessage").textContent');cdp=cx.new_cdp_session(pg)
 results=[]
 for case,scene in scenes.items():
  info=pg.evaluate('''closePanel();stopAuto();cameraCut=true;t=9;updateLife(t);'''+scene+'''updateCamera();applyVisualSettings();renderer.forceShadow=true;renderer.render(eye,target,t);$('welcome').classList.toggle('hidden',active);$('hud').classList.toggle('hidden',!active);if(active){visited=new Set(LANDMARKS.map(l=>l.id));checkLandmarks();updateHUD();paintVoyageHUD();}$('toast').classList.remove('show');$('landmarkBanner').classList.add('hidden');({triangles:renderer.submittedTriangles,drawCalls:renderer.drawCalls,glError:renderer.gl.getError(),canvas:[renderer.canvas.width,renderer.canvas.height],samples:renderer.msaaSamples,eye,player:player.p});''')
  data=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(out/('final-'+case+'.png')).write_bytes(base64.b64decode(data['data']));results.append({'scene':case,'render':info});print(round(time.time()-start,1),case,info,flush=True)
 (out/'captures.json').write_text(json.dumps({'renders':results,'pageErrors':errors},ensure_ascii=False,indent=2));b.close()
