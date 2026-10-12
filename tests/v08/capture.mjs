import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright')}catch{playwright=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv[2]||'http://127.0.0.1:8765/';const label=process.argv[3]||'after';
const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('qa/v08',{recursive:true});
await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,{timeout:90000});
await page.evaluate(()=>{window.__freeze=true;settings.adaptive=false;settings.quality=2;renderer.quality=2;renderer.dynamicScale=1;renderer.resize();t=18;settings.third=false;settings.sound=false;updateLife(t);updateCamera();applyVisualSettings();renderer.render(eye,target,t);$('loading').classList.add('hidden');});
await page.screenshot({path:`qa/v08/${label}-welcome.png`});
const views=[['reef',[0,-8,7],[0,-9,-1]],['surface',[0,-6,7],[-7,2,-2]],['garden',[-9,-9,4],[-4,-10,-5]],['wreck',[98,-29,-142],[99,-31,-166]]];
for(const [name,p,aim]of views){await page.evaluate(({p,aim})=>{settings.third=false;__renderView(p,aim,18);document.body.classList.add('cinematic');$('toast').classList.remove('show');$('landmarkBanner').classList.add('hidden');$('radioBox').classList.remove('visible');$('waypointHUD').classList.add('hidden');}, {p,aim});await page.screenshot({path:`qa/v08/${label}-${name}.png`});}
await page.evaluate(()=>{__renderView([0,-8,7],[0,-9,-1],18);window.__freeze=false;oceanPerf.start();});
await page.waitForFunction(()=>oceanPerf.lastResult,{timeout:45000});
const report=await page.evaluate(()=>({...oceanPerf.lastResult,scene:renderer.sceneLoad,glError:renderer.gl.getError()}));
await writeFile(`qa/v08/${label}-benchmark.json`,JSON.stringify({...report,errors},null,2));
console.log(JSON.stringify({label,fps:report.averageFPS,p95:report.p95FrameMs,renderer:report.renderer,resolution:report.renderResolution,errors}));await browser.close();
