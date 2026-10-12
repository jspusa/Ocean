"""Render guide images from the actual current models and GLSL. Isolated viewing fixture."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,time
R=Path(__file__).resolve().parents[2];out=R/'tests/v07'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':640,'height':320});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
 html=(R/'standalone.html').read_text().replace("new URLSearchParams(location.search).has('still')",'true');pg.set_content(html,timeout=45000)
 pg.wait_for_function('window.__ocean?.ready || !document.getElementById("errorBox").classList.contains("hidden")',timeout=90000);assert pg.evaluate('window.__ocean?.ready'),pg.evaluate('$("errorMessage").textContent')
 pg.evaluate('''active=false;settings.third=false;settings.lighting='day';renderer.quality=2;renderer.dynamicScale=1;renderer.resize();
  window.guideOriginal=renderer.batches.map(b=>({b,instances:b.instances,visible:b.visible}));''')
 results=[]
 for sp in [11]:
  data=pg.evaluate('''i=>{for(const a of guideOriginal){a.b.instances=a.instances;a.b.visible=false;}
   const f=life.find(f=>f.species===i),batch=renderer.batches.find(b=>b.dynamic&&b.instances.includes(f)&&!(b.minDistance>0));
   batch.instances=[f];batch.visible=true;f.p=[0,-6,0];f.yaw=.10;f.pitch=0;f.bank=0;f.phase=1.2;f.effort=.5;
   const radius=batch.radius*Math.max(...f.s),distance=radius*1.50;
   const eye=[distance*.15,-6+distance*.10,distance];const target=[i===10?-1:0,-6,0];
   renderer.forceShadow=true;renderer.render(eye,target,6);
   return {id:SPECIES[i].id,image:renderer.canvas.toDataURL('image/jpeg',.91),error:renderer.gl.getError()};
  }''',sp)
  assert data['error']==0
  (R/'assets'/('guide_'+data['id']+'.jpg')).write_bytes(base64.b64decode(data['image'].split(',')[1]));results.append({'id':data['id'],'error':data['error']});print(data['id'],flush=True)
 (out/'guide-results.json').write_text(json.dumps({'actualWebGLRenders':results,'pageErrors':errs,'context':'isolated model stage, not a screenshot of normal free swim'},indent=2));assert not errs;b.close()
