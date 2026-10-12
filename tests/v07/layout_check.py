"""CSS-only hit-area validation. No game rendering/FPS inference is made."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
R=Path(__file__).resolve().parents[2];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);cx=b.new_context(has_touch=True,is_mobile=True);pg=cx.new_page()
 s=(R/'src/shell.html').read_text().replace('/*__CSS__*/',(R/'src/style.css').read_text()).replace('/*__JS__*/','')
 pg.set_content(s);pg.evaluate('document.getElementById("welcome").classList.add("hidden");document.getElementById("loading").classList.add("hidden");document.getElementById("hud").classList.remove("hidden")')
 for w,h in [(390,844),(844,390),(768,1024)]:
  pg.set_viewport_size({'width':w,'height':h})
  res=pg.evaluate('''(()=>{const els=[...document.querySelectorAll('.view-tools button'),document.getElementById('autoBtn'),document.getElementById('mapBtn'),document.getElementById('lampBtn')].filter(e=>e.offsetWidth&&e.offsetHeight),bad=[],rects=Object.fromEntries(els.map(e=>[e.id,e.getBoundingClientRect().toJSON()]));for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){let a=rects[els[i].id],b=rects[els[j].id];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)bad.push([els[i].id,els[j].id])}return {bad,rects}})()''');checks.append({'check':f'distinct hit areas {w}x{h}','pass':not res['bad'],'detail':res});print(w,h,res['bad'])
 b.close()
(R/'tests/v07/layout-results.json').write_text(json.dumps({'scope':'CSS only, no rendered world', 'checks':checks},ensure_ascii=False,indent=2));raise SystemExit(not all(c['pass'] for c in checks))
