import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../..',import.meta.url)));
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_PATH||homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const url=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8765/',seamOnly=process.argv.includes('--seam');
const browser=await pw.chromium.launch({channel:'chrome',headless:true}),shots=[],errors=[],checks=[];
await mkdir('qa/parity',{recursive:true});
function check(mode,name,pass,detail){checks.push({mode:mode.id,name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+mode.id+' '+name);}
const views=[
 {id:'cave-mouth',p:[-218,-25,-35],look:[-218,-24,-55]},
 {id:'cave-vault',p:[-218,-25.8,-55],look:[-218,-23.7,-76]},
 {id:'cave-chamber',p:[-220,-26,-55],look:[-230,-23.8,-61]},
 {id:'cave-skylight',p:[-218,-26,-53],look:[-218,-22,-47.5]},
 {id:'abyss-upper',p:[-156,-63.5,-261],look:[-155,-76,-295]},
 {id:'abyss-bend',p:[-154.4,-77,-294],look:[-148,-87,-317]},
 {id:'abyss-shoulder',p:[-144,-61,-285],look:[-152,-81,-302]}
];
try{
 for(const mode of [{id:'desktop',width:1440,height:900,touch:false},{id:'portrait',width:390,height:844,touch:true}]){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,hasTouch:mode.touch,isMobile:mode.touch}),page=await context.newPage();
  page.on('pageerror',e=>errors.push({mode:mode.id,message:e.message}));
  try{
   await page.goto(url);await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:90000});
   await page.evaluate(()=>{window.__freeze=true;$('welcomeAudio').checked=false;settings.third=false;settings.adaptive=false;settings.lookLock=false;settings.fov=69;
    const draw=renderer.drawBatch;renderer.drawBatch=function(b){if(b.material===1&&this.gl.getParameter(this.gl.CURRENT_PROGRAM)===this.program.p)b.__qaLodFade=this.gl.getUniform(this.program.p,this.uniform(this.program,'uLODBounds'))[2];return draw.call(this,b);};
    window.__regionRender=()=>{updateCamera(.1);oceanFeatures.call('afterCamera',.1);applyVisualSettings();renderer.render(eye,target,t);updateHUD();return {p:player.p.slice(),eye:eye.slice(),target:target.slice(),yaw:player.yaw,pitch:player.pitch,blocked:OceanRegions.pointBlocked(player.p,.4),clearance:player.p[1]-groundHeight(player.p[0],player.p[2]),coverage:OceanRegions.coverage(player.p),gl:renderer.gl.getError(),compiled:renderer.sceneLoad.compiled,quality:renderer.quality,terrain:renderer.batches.filter(b=>b.material===1&&b.instances.length===1&&Math.abs(b.instances[0].p[0]+160)<.001&&[-250,-314].includes(b.instances[0].p[2])).map(b=>({center:b.instances[0].p.slice(),count:b.count,min:b.minDistance||0,max:b.maxDistance||0,submitted:b.drawCount,fade:b.__qaLodFade,distance:V.dist(b.instances[0].p,eye)}))};};
    window.__regionPose=v=>{resetInput();stopAuto();if(modal)closePanel();oceanMicrocosm.exit();player.velocity=[0,0,0];player.p=v.p.slice();const d=V.sub(v.look,player.p);player.yaw=Math.atan2(d[0],-d[2]);player.pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));cameraCut=true;t=18;updateLife(t);return __regionRender();};
    window.__regionMove=seconds=>{for(let i=0;i<seconds*60;i++){updatePlayer(1/60);t+=1/60;updateLife(t);}return __regionRender();};
   });
   await page.locator('#shipModeFree').click();await page.locator('#startBtn').click();await page.waitForFunction(()=>active&&!modal&&$('welcome').classList.contains('hidden'));
   for(const view of views.filter(v=>!seamOnly||v.id==='abyss-upper')){
    const state=await page.evaluate(v=>__regionPose(v),view);
    const path='qa/parity/regions-014-'+mode.id+'-'+view.id+'.png';await page.screenshot({path});shots.push({mode:mode.id,id:view.id,path,...state});console.log(mode.id+' '+view.id+' '+JSON.stringify(state));
   }
   // Real pointer drag changes production yaw; actual held keyboard / touch
   // stick input then drives movement. Only time advances deterministically.
   const before=await page.evaluate(()=>__regionPose({p:[-156,-63.5,-257],look:[-156,-70,-290]}));
   const x=mode.width*.50,y=mode.height*.43,cdp=mode.touch?await context.newCDPSession(page):null;
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+22,y,{steps:4});await page.mouse.up();}
   const turned=await page.evaluate(()=>__regionRender());check(mode,'actual pointer drag rotates the abyss camera',Math.abs(turned.yaw-before.yaw)>.04,{before:before.yaw,after:turned.yaw});
   if(cdp){const r=await page.locator('#joystick').boundingBox(),sx=r.x+r.width/2,sy=r.y+r.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-40}]});}else await page.keyboard.down('KeyW');
   const samples=[];
   try{for(let i=0;i<6;i++){const state=await page.evaluate(()=>__regionMove(1.5)),path='qa/parity/regions-014-'+mode.id+'-lod-travel-'+i+'.png';await page.screenshot({path});samples.push(state);shots.push({mode:mode.id,id:'lod-travel-'+i,path,...state});}}
   finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await page.keyboard.up('KeyW');await page.evaluate(()=>resetInput());}
   const end=samples.at(-1),travel=Math.hypot(...end.p.map((v,i)=>v-before.p[i])),maxStep=Math.max(...samples.map((s,i)=>Math.hypot(...s.p.map((v,k)=>v-(i?samples[i-1]:before).p[k]))));check(mode,'real movement crosses the abyss view without entering rock or ground',travel>10&&travel<30&&maxStep<5&&samples.every(s=>!s.blocked&&s.clearance>.8&&s.gl===0),{travel,maxStep,samples:samples.map(s=>({p:s.p,terrain:s.terrain}))});
   const ranges=[turned,...samples].map(s=>s.terrain.filter(b=>b.center[2]===-314));
   check(mode,'each transition frame draws exactly one opaque terrain LOD with no dither holes',ranges.every(a=>a.filter(b=>b.submitted>0).length===1&&a.filter(b=>b.submitted>0).every(b=>b.fade===0)),ranges);
   if(mode.touch)check(mode,'mobile travel switches the same terrain tile from coarse to detailed mesh',ranges.some(a=>a.some(b=>b.min>0&&b.submitted>0))&&ranges.some(a=>a.some(b=>b.min===0&&b.submitted>0)),ranges);
  }finally{await context.close();}
 }
}finally{await browser.close();await writeFile('qa/parity/regions-014-'+(seamOnly?'seam':'visual')+'.json',JSON.stringify({url,evidenceBoundary:'Real compiled WebGL screenshots. Camera drag and held movement use actual pointer/keyboard input; game-time ticks are deterministic, not a frame-rate benchmark. Full story travel is verified separately.',shots,checks,errors},null,2));}
if(errors.length||checks.some(c=>!c.pass)||shots.some(s=>s.gl!==0||s.blocked||!s.compiled))process.exitCode=1;
