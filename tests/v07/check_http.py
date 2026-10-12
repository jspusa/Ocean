"""Report live-origin navigation separately. A policy-blocked page is NOT a pass."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
R=Path(__file__).resolve().parents[2];result={'url':'http://127.0.0.1:8777/ocean-v07/tests/v07/health.html','passed':False,'publicPagesTested':False}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);pg=b.new_page()
 try:
  pg.goto(result['url'],timeout=15000);result['title']=pg.title();result['storage']=pg.evaluate('localStorage.setItem("test",1);localStorage.getItem("test")');result['passed']=True
 except Exception as e:result['error']=str(e)
 b.close()
(R/'tests/v07/http-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result))
