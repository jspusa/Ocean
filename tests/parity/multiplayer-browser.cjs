/* Native Stage C acceptance through the real game UI and real HTTP/WS.
 * Two fresh, independent storage contexts. Only native input changes gameplay;
 * CDP Runtime.evaluate is read-only, userGesture:false. No pose, room, save,
 * clock, focus or renderer mutation. A byte-for-byte TCP proxy supplies one
 * ordinary outage. Admission/reply-loss permutations belong to transport tests.
 * The coordinator serializes GPU runs; author-side execution is node --check.
 * Touch is same-computer emulation. This is not a frame-time benchmark.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/jasper/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const url=option('url','http://127.0.0.1:8765/'),profile=option('profile','desktop'),touch=profile==='touch';
const service=option('service','local');
const expectedVersion=option('expected-version','0.18.21'),output=path.resolve(__dirname,'../..',option('out','qa/parity/multiplayer-'+profile+'.json'));
assert(['desktop','touch'].includes(profile));assert(!new URL(url).searchParams.has('still'),'Natural input requires an unfrozen page');
assert(['local','unavailable'].includes(service));
assert(service==='unavailable'||['127.0.0.1','localhost'].includes(new URL(url).hostname),'Local service mode owns a loopback backend; use a loopback game URL');
const checks=[],errors=[],consoleErrors=[],inputs=[],observations=[],wire=[],images=[],network=[],clients=[],privateValues=new Set();
const viewport=touch?{width:390,height:844}:{width:1440,height:900};
let fatal=null,stage='launch',metadata=[],backend=null,proxy=null,browser=null;
const artifact=suffix=>output.replace(/\.json$/,'')+suffix;
const distance=(a,b)=>Math.hypot(...a.map((n,k)=>n-b[k]));
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));assert(pass,name);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const redact=text=>{let value=String(text);for(const secret of privateValues)value=value.split(secret).join('[redacted capability]');return value;};
const secretsIn=(value,place)=>{
 const text=typeof value==='string'?value:JSON.stringify(value);
 assert(!/"(?:admissionNonce|resumeNonce|resumeToken)"\s*:/.test(text),place+' must omit credential keys');
 for(const secret of privateValues)assert(!text.includes(secret),place+' must omit private capability values');
};
function collectPrivate(value){
 if(!value||typeof value!=='object')return;
 for(const [key,item]of Object.entries(value)){
  if(['admissionNonce','resumeNonce','resumeToken'].includes(key)&&typeof item==='string')privateValues.add(item);
  else if(item&&typeof item==='object')collectPrivate(item);
 }
}
function publicFrame(label,direction,event){
 if(event.response.opcode!==1)return;
 let message;try{message=JSON.parse(event.response.payloadData);}catch{return;}
 collectPrivate(message);
 const row={at:Date.now(),timestampMs:event.timestamp*1000,label,direction,requestId:event.requestId,type:message.type,keys:Object.keys(message).sort()};
 for(const key of ['roomId','memberId','generation','seq','category','preset','reason','code','contentVersion'])if(Object.hasOwn(message,key))row[key]=message[key];
 if(message.pose)row.pose=message.pose;
 if(message.member)row.member={id:message.member.id,name:message.member.name,generation:message.member.generation,connected:message.member.connected};
 if(message.snapshot)row.memberCount=message.snapshot.members?.length;
 wire.push(row);
}
async function startBackend(){
 const {createOceanServer}=await import(pathToFileURL(path.resolve(__dirname,'../../server/server.mjs')).href);
 backend=createOceanServer({contentVersion:'ocean-'+expectedVersion,allowedOrigins:[new URL(url).origin]});await backend.listen(0);
 let enabled=true,next=0;const pairs=new Set();
 const server=net.createServer(downstream=>{
  const id=++next;network.push({at:Date.now(),type:'tcp-accept',id,enabled});
  if(!enabled){downstream.destroy();return;}
  const upstream=net.connect({host:'127.0.0.1',port:backend.address().port}),pair={id,downstream,upstream,closed:false};pairs.add(pair);
  const close=reason=>{if(pair.closed)return;pair.closed=true;pairs.delete(pair);network.push({at:Date.now(),type:'tcp-pair-closed',id,reason});downstream.destroy();upstream.destroy();};
  downstream.on('error',()=>close('downstream-error'));upstream.on('error',()=>close('upstream-error'));
  downstream.on('close',()=>close('downstream-close'));upstream.on('close',()=>close('upstream-close'));
  downstream.pipe(upstream);upstream.pipe(downstream);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8787,'127.0.0.1',resolve);});
 proxy={
  activeConnections:()=>pairs.size,
  outage(){enabled=false;network.push({at:Date.now(),type:'outage-start',connections:pairs.size});for(const pair of [...pairs]){pair.downstream.destroy();pair.upstream.destroy();}},
  restore(){enabled=true;network.push({at:Date.now(),type:'outage-end'});},
  async close(){for(const pair of [...pairs]){pair.downstream.destroy();pair.upstream.destroy();}await new Promise(resolve=>server.close(resolve));}
 };
 const response=await fetch('http://127.0.0.1:8787/health',{headers:{Connection:'close'}});
 check('actual HTTP backend health is reached through the TCP proxy',response.status===200&&(await response.json()).status==='ok');
}
async function makeClient(label,origin=url){
 const context=await browser.newContext({viewport,deviceScaleFactor:touch?3:2,isMobile:touch,hasTouch:touch,acceptDownloads:true,serviceWorkers:'block'});
 const page=await context.newPage(),session=await context.newCDPSession(page),contacts=new Map(),sockets=new Map();
 let documentSerial=0;
 page.setDefaultTimeout(15000);
 page.on('framenavigated',frame=>{if(frame===page.mainFrame()){documentSerial++;network.push({label,at:Date.now(),type:'main-document-navigation',documentSerial,url:frame.url()});}});
 page.on('pageerror',error=>errors.push({label,message:redact(error.message)}));page.on('crash',()=>errors.push({label,message:'Renderer process crashed'}));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push({label,message:redact(message.text())});});
 page.on('dialog',async dialog=>{if(dialog.type()==='confirm'&&/匯入後會替換/.test(dialog.message())){inputs.push({label,action:'confirm-own-export-import',at:Date.now()});await dialog.accept();}else{errors.push({label,message:'Unexpected dialog: '+redact(dialog.message())});await dialog.dismiss();}});
 await session.send('Network.enable');
 session.on('Network.webSocketCreated',event=>{sockets.set(event.requestId,{url:event.url,open:true,documentSerial});network.push({label,at:Date.now(),type:'websocket-created',url:event.url,requestId:event.requestId,documentSerial});});
 session.on('Network.webSocketClosed',event=>{const item=sockets.get(event.requestId);if(item)item.open=false;network.push({label,at:Date.now(),type:'websocket-closed',requestId:event.requestId});});
 session.on('Network.webSocketFrameSent',event=>publicFrame(label,'sent',event));
 session.on('Network.webSocketFrameReceived',event=>publicFrame(label,'received',event));
 const c={label,context,page,session,contacts,sockets,origin,moving:false,documentSerial:()=>documentSerial};clients.push(c);
 c.read=async(fn,arg)=>{const result=await session.send('Runtime.evaluate',{expression:'('+fn.toString()+')('+(arg===undefined?'undefined':JSON.stringify(arg))+')',userGesture:false,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(redact(result.exceptionDetails.exception?.description||result.exceptionDetails.text));return result.result.value;};
 c.wait=async(fn,arg,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=await c.read(fn,arg);if(value)return value;await pause(60);}throw Error(label+' timed out in '+stage+': '+fn.toString());};
 c.focus=async()=>{await page.bringToFront();await c.wait(()=>document.hasFocus()&&!document.hidden);};
 c.down=async(id,x,y)=>{assert.equal(contacts.size,0,'Only one native touch contact per page');contacts.set(id,{id,x,y});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...contacts.values()]});};
 c.move=async(id,x,y)=>{assert(contacts.has(id));contacts.set(id,{id,x,y});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[...contacts.values()]});};
 c.up=async(id)=>{assert(contacts.has(id));contacts.delete(id);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 c.press=async selector=>{
  await c.focus();const node=page.locator(selector);await node.waitFor({state:'visible'});await node.scrollIntoViewIfNeeded();
  if(touch){const b=await node.boundingBox();assert(b,'Visible control requires a hit box: '+selector);await c.down(7,b.x+b.width/2,b.y+b.height/2);await c.up(7);}else await node.click();
  inputs.push({label,action:'control',selector,at:Date.now()});await pause(140);
 };
 c.fill=async(selector,value)=>{await c.press(selector);await page.locator(selector).fill(value);inputs.push({label,action:'fill',selector,value,at:Date.now()});};
 c.boot=async()=>{
  await c.wait(()=>window.__ocean?.ready||!document.getElementById('errorBox')?.classList.contains('hidden'),null,120000);
  check(label+' normal boot completes',await c.read(()=>!!window.__ocean?.ready));await page.locator('#loading').waitFor({state:'hidden'});await c.focus();
  const data=await c.read(()=>{const gl=renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');return {version:document.documentElement.dataset.version,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,adaptive:settings.adaptive,quality:renderer.quality,scale:renderer.dynamicScale,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,resolution:[renderer.canvas.width,renderer.canvas.height],saveWritable:oceanSaveSession.writable,compiled:renderer.sceneLoad.compiled};});
  metadata.push({label,...data});check(label+' uses native hardware, current release, automatic quality and its own save writer',!!data.renderer&&!/swiftshader|llvmpipe|software/i.test(data.renderer)&&data.version===expectedVersion&&data.adaptive&&data.saveWritable&&data.compiled,data);
 };
 c.snapshot=async()=>{const value=await c.read(()=>oceanMultiplayer.snapshot());secretsIn(value,label+' public snapshot');return value;};
 c.state=()=>c.read(()=>({active,modal,p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,velocity:player.velocity.slice(),focused:document.hasFocus(),hidden:document.hidden,freeze:!!window.__freeze,adaptive:settings.adaptive,glLost:renderer.gl.isContextLost(),batches:renderer.batches.filter(b=>b.sceneRole==='room-companion').map(b=>({visible:b.visible,kind:b.kind,drawCount:b.drawCount,vertices:b.count,resident:!!b.vao,shadow:b.shadow,maxDistance:b.maxDistance,instances:b.instances.map(f=>({p:f.p.slice(),yaw:f.yaw,pitch:f.pitch}))})),hud:{hidden:$('roomCompanion')?.hidden,text:$('roomCompanion')?.textContent},selected:oceanSelection.snapshot()}));
 c.progress=()=>c.read(()=>({voyage:JSON.parse(JSON.stringify(voyage.state)),seen:persistent.seen.slice(),log:persistent.log.map(v=>({...v})),photography:oceanPhotography.snapshot()}));
 c.openRoom=async()=>{
  await c.focus();if(await c.read(()=>modal==='multiplayer'))return;
  if(await c.read(()=>!!modal))await c.press('#closePanel');
  if(await c.read(()=>active)){
   if(await page.locator('#roomCompanion').isVisible())await c.press('#roomCompanion');
   else{await c.press('#fieldToolsBtn');await c.press('#panelBody .menu-advanced > summary');await c.press('#panelBody [data-feature="multiplayer"]');}
  }else await c.press('#welcome [data-feature="multiplayer"]:visible');
  await c.wait(()=>modal==='multiplayer');
 };
 c.openVoyage=async()=>{
  if(await c.read(()=>!!modal))await c.press('#closePanel');
  if(await c.read(()=>active)){await c.press('#fieldToolsBtn');await c.press('#panelBody .menu-advanced > summary');await c.press('#voyageBtn');}
  else{
   await c.press('#shipSettings');
   if(!await c.read(()=>document.querySelector('#panelBody .settings-advanced')?.open))await c.press('#panelBody .settings-advanced > summary');
   await c.press('#legacyToolsBtn');await c.press('#panelBody .menu-advanced > summary');await c.press('#voyageBtn');
  }
  await c.wait(()=>modal==='voyage');
 };
 c.export=async()=>{await c.openVoyage();const pending=page.waitForEvent('download');await c.press('#exportSave');const download=await pending,bytes=fs.readFileSync(await download.path());const data=JSON.parse(bytes);secretsIn(data,label+' actual UI save export');check(label+' downloads a real personal save archive',data.format==='return-blue/save'&&data.version===1,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});return {bytes,data};};
 c.shot=async label2=>{const file=artifact('-'+label+'-'+label2+'.png'),bytes=await page.screenshot({path:file});images.push({label,stage:label2,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});return file;};
 c.swim=async(ms)=>{
  await c.focus();assert(await c.read(()=>active&&!modal&&!photoOpen),'Movement requires the actual unpaused dive');
  const before=await c.state(),begin=Date.now();c.moving=true;
  if(touch){const b=await page.locator('#joystick').boundingBox();assert(b);const x=b.x+b.width/2,y=b.y+b.height/2;await c.down(1,x,y);await c.move(1,x,y-b.width*.31);}
  else await page.keyboard.down('w');
  await pause(ms);
  if(touch)await c.up(1);else await page.keyboard.up('w');c.moving=false;
  await c.wait(()=>Math.hypot(...player.velocity)<.02);await pause(220);
  const after=await c.state();inputs.push({label,action:'native-swim',at:begin,ms,before,after});
  check(label+' normal input produces real finite-speed swimming',distance(before.p,after.p)>.7&&distance(before.p,after.p)<(ms/1000+2)*5&&after.adaptive&&!after.freeze&&!after.glLost,{from:before.p,to:after.p,metres:distance(before.p,after.p),ms});
  return {begin,end:Date.now(),before,after};
 };
 c.aimAt=async point=>{
  await c.focus();
  for(let i=0;i<28;i++){
   const r=await c.read(()=>({p:player.p.slice(),yaw:player.yaw,pitch:player.pitch,sense:settings.sensitivity,w:innerWidth,h:innerHeight})),v=point.map((n,k)=>n-r.p[k]),yaw=Math.atan2(v[0],-v[2]),pitch=Math.max(-1.2,Math.min(1.2,Math.atan2(v[1],Math.hypot(v[0],v[2])))),delta=Math.atan2(Math.sin(yaw-r.yaw),Math.cos(yaw-r.yaw));
   if(Math.abs(delta)<.025&&Math.abs(r.pitch-pitch)<.025)return;
   let dx=delta/(.0037*r.sense),dy=(r.pitch-pitch)/(.0032*r.sense);const scale=Math.min(1,r.w*.30/Math.max(.01,Math.abs(dx)),r.h*.22/Math.max(.01,Math.abs(dy)));dx*=scale;dy*=scale;if(Math.hypot(dx,dy)<10)return;
   const from=await c.read(({dx,dy})=>{for(const cy of [.46,.56,.36,.64])for(const cx of [.5,.7,.3]){const x=innerWidth*cx-dx/2,y=innerHeight*cy-dy/2;if(x<12||x+dx<12||x>innerWidth-12||x+dx>innerWidth-12||y<80||y+dy<80||y>innerHeight-120||y+dy>innerHeight-120)continue;if(document.elementFromPoint(x,y)?.id==='ocean')return {x,y};}return null;},{dx,dy});
   assert(from,'Camera drag requires exposed game canvas');
   if(touch){await c.down(2,from.x,from.y);await c.move(2,from.x+dx,from.y+dy);await c.up(2);}else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(from.x+dx,from.y+dy,{steps:1});await page.mouse.up();}
   inputs.push({label,action:'native-aim',point,from,dx,dy,at:Date.now()});await pause(45);
  }throw Error('Native camera input did not converge');
 };
 return c;
}
async function waitStatus(c,status){return c.wait(status=>oceanMultiplayer.snapshot().status===status,status);}
async function request(c,code,name){await c.openRoom();await c.fill('#roomName',name);await c.fill('#roomCode',code);await c.press('#roomRequest');}
async function approve(host,guest){await host.openRoom();await host.page.locator('[data-room-approve]').waitFor({state:'visible'});await host.press('[data-room-approve]');await waitStatus(guest,'joined');await host.wait(()=>oceanMultiplayer.snapshot().members.length===2);}
async function joinAgain(host,guest,code,name){await request(guest,code,name);await waitStatus(guest,'pending');await approve(host,guest);}
async function dive(c){await c.openRoom();await c.press('#roomDive');await c.wait(()=>active&&!modal&&$('welcome').classList.contains('hidden'));}
async function inspectStorage(c,label){
 const result=await c.read(()=>({url:location.href,local:Object.fromEntries(Object.entries(localStorage)),session:Object.fromEntries(Object.entries(sessionStorage)),snapshot:oceanMultiplayer.snapshot()}));
 secretsIn(result,c.label+' '+label);observations.push({label:c.label,stage:label,storageKeys:Object.keys(result.local),sessionKeys:Object.keys(result.session),snapshot:result.snapshot});
 check(c.label+' '+label+' keeps credentials out of URL, storage and the public snapshot',true);
}
async function remoteView(viewer,source,label){
 await viewer.focus();const own=await source.state();await viewer.aimAt(own.p);await pause(450);
 await viewer.wait(()=>oceanMultiplayer.snapshot().remote?.visible&&renderer.batches.some(b=>b.sceneRole==='room-companion'&&b.drawCount>0&&b.vao));
 const state=await viewer.state(),room=await viewer.snapshot(),remote=room.members.find(m=>m.id!==room.memberId),batch=state.batches[0];
 check(label+' renders one real remote diver at the received world pose',state.batches.length===1&&batch.instances.length===1&&batch.resident&&batch.drawCount>0&&batch.visible&&distance(batch.instances[0].p,own.p)<.03&&distance(remote.pose.position,own.p)<.03&&Math.abs(Math.atan2(Math.sin(batch.instances[0].yaw+own.yaw),Math.cos(batch.instances[0].yaw+own.yaw)))<.03&&Math.abs(batch.instances[0].pitch+own.pitch)<.03,{source:own.p,received:remote.pose.position,batch});
 const projection=await viewer.read(()=>{const b=renderer.batches.find(b=>b.sceneRole==='room-companion'),p=project(b.instances[0].p,renderer.vp),r=$('ocean').getBoundingClientRect();return {ndcXY:p.slice(0,2),clipW:p[2],css:[r.left+(p[0]*.5+.5)*r.width,r.top+(.5-p[1]*.5)*r.height],hud:$('roomCompanion').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth};});
 check(label+' native camera frames the diver with a peripheral companion indicator',projection.clipW>0&&projection.clipW<140&&Math.abs(projection.ndcXY[0])<.9&&Math.abs(projection.ndcXY[1])<.9&&!projection.overflow&&!state.hud.hidden&&state.hud.text.includes(remote.name)&&/深度 \d+ m/.test(state.hud.text)&&!(projection.hud.left<projection.viewport[0]*.5&&projection.hud.right>projection.viewport[0]*.5&&projection.hud.top<projection.viewport[1]*.5&&projection.hud.bottom>projection.viewport[1]*.5),{projection,hud:state.hud});
 observations.push({stage:label,label:viewer.label,room,state,projection});await viewer.shot(label);
}
async function unavailable(c){
 stage='unconfigured-public-origin';await c.page.goto(c.origin);await c.boot();
 check('public game allocates no socket or companion before opening the room panel',c.sockets.size===0&&(await c.state()).batches.length===0);
 await c.openRoom();await pause(900);
 check('unconfigured public UI truthfully disables rooms without opening any socket',c.sockets.size===0&&/尚未開放/.test(await c.page.locator('#roomStatus').textContent())&&await c.page.locator('#roomCreate, #roomRequest, input[type="url"]').count()===0&&(await c.state()).batches.length===0);
 await c.shot('unavailable');await c.press('#closePanel');await c.press('#startBtn');await c.wait(()=>active&&!modal);
 check('normal single-player start keeps automatic quality without a room service',await c.read(()=>active&&settings.adaptive)&&c.sockets.size===0&&(await c.state()).batches.length===0);
 await c.shot('single-player');check('unconfigured public gameplay has no uncaught JavaScript errors',errors.length===0,errors);stage='complete';
}
async function run(){
 if(service==='unavailable'){
  // Actual Pages acceptance: no local proxy, backend, alternate origin or routes.
  browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
  await unavailable(await makeClient('public',url));return;
 }
 await startBackend();
 browser=await chromium.launch({...require('./browser-launch.cjs')(true),headless:false,args:['--enable-automation','--autoplay-policy=document-user-activation-required']});
 const host=await makeClient('host'),guest=await makeClient('guest');
 for(const c of [host,guest]){stage=c.label+'-boot';await c.page.goto(url);await c.boot();}
 stage='room-entry';
 for(const c of [host,guest]){
  check(c.label+' normal ship UI exposes the multiplayer entry',await c.page.locator('#welcome [data-feature="multiplayer"]:visible').count()===1);
  check(c.label+' allocates no socket or remote renderer before opting in',c.sockets.size===0&&(await c.state()).batches.length===0);
  await c.openRoom();
 }
 const original=[await host.progress(),await guest.progress()],hostName='礁 <b>海</b>',guestName='訪客海流';
 stage='initial-connect-outage';await host.fill('#roomName',hostName);proxy.outage();await host.press('#roomCreate');await waitStatus(host,'reconnecting');
 const waitingForService=await host.snapshot();
 check('initial network failure shows reconnecting without claiming an admitted room',!waitingForService.memberId&&!waitingForService.roomId&&waitingForService.members.length===0&&waitingForService.remote===null&&await host.page.locator('#roomShare, #roomDive').count()===0&&(await host.state()).batches.length===0,waitingForService);
 check('initial outage has not created or joined any server room',!wire.some(e=>e.label==='host'&&(e.type==='create'||e.type==='joined')));
 await host.shot('initial-connect-outage');proxy.restore();await waitStatus(host,'joined');stage='room-created';
 const firstHost=await host.snapshot(),code=await host.page.locator('#roomShare').inputValue();
 check('host creates exactly one temporary room through the real server',code===firstHost.roomId&&firstHost.role==='host'&&firstHost.members.length===1);
 check('display names remain literal text rather than HTML',await host.page.locator('#roomMembers').textContent().then(s=>s.includes(hostName))&&await host.page.locator('#roomMembers b').count()===0);
 stage='approval-and-cancel';
 await request(guest,code,guestName);await waitStatus(guest,'pending');
 const pending=await guest.snapshot();check('waiting guest has no room snapshot, pose or remote rendering',pending.members.length===0&&pending.remote===null&&!pending.roomId&&(await guest.state()).batches.length===0,pending);
 await host.openRoom();await host.page.locator('[data-room-deny]').waitFor({state:'visible'});await host.press('[data-room-deny]');await waitStatus(guest,'closed');
 check('host rejection is displayed without admitting the guest',(await guest.snapshot()).error==='host_rejected'&&/未批准/.test(await guest.page.locator('#roomStatus').textContent()));
 await host.press('#roomVisits');await host.wait(()=>oceanMultiplayer.snapshot().visitsOpen===false);
 await request(guest,code,guestName);await waitStatus(guest,'closed');
 check('closed visiting rejects a real request without a pending seat',(await guest.snapshot()).error==='visits_closed'&&(await host.snapshot()).pending.length===0);
 await host.press('#roomVisits');await host.wait(()=>oceanMultiplayer.snapshot().visitsOpen===true);
 await request(guest,code,guestName);await waitStatus(guest,'pending');await guest.press('#roomLeave');await waitStatus(guest,'closed');await host.wait(()=>oceanMultiplayer.snapshot().pending.length===0);
 check('explicit cancellation removes the pending request and leaves only the host',(await host.snapshot()).members.length===1&&(await guest.snapshot()).remote===null);
 await joinAgain(host,guest,code,guestName);
 const firstGuest=await guest.snapshot();
 check('approval admits two distinct members in the same room',firstGuest.role==='guest'&&firstGuest.roomId===code&&firstGuest.memberId!==firstHost.memberId&&firstGuest.members.length===2);
 check('room admission does not rewrite either personal voyage',JSON.stringify(original[0])===JSON.stringify(await host.progress())&&JSON.stringify(original[1])===JSON.stringify(await guest.progress()));
 await host.shot('approved');await guest.shot('approved');
 stage='native-swimming';await dive(guest);await dive(host);
 const hostSwim=await host.swim(2400);await remoteView(guest,host,'host-diver');
 const hostPoses=wire.filter(e=>e.label==='host'&&e.direction==='sent'&&e.type==='pose'&&e.at>=hostSwim.begin&&e.at<=hostSwim.end),intervals=hostPoses.slice(1).map((p,i)=>p.timestampMs-hostPoses[i].timestampMs);
 check('ordinary movement sends changed poses at the bounded 10 Hz cadence',hostPoses.length>=5&&hostPoses.length<=Math.ceil((hostSwim.end-hostSwim.begin)/100)+1&&intervals.every(ms=>ms>=95)&&hostPoses.slice(1).every((p,i)=>JSON.stringify(p.pose)!==JSON.stringify(hostPoses[i].pose)),{count:hostPoses.length,intervals,durationMs:hostSwim.end-hostSwim.begin});
 await guest.swim(1000);await remoteView(host,guest,'guest-diver');
 stage='map-and-presets';await host.openRoom();await host.press('#roomMap');await host.wait(()=>modal==='map');
 const chart=await host.read(()=>{const c=$('mapCanvas'),s=oceanMultiplayer.snapshot(),m=s.members.find(m=>m.id!==s.memberId),p=chartPoint(m.pose.position[0],m.pose.position[2],c.width,c.height),x=Math.max(0,Math.min(c.width-17,Math.floor(p[0])-8)),y=Math.max(0,Math.min(c.height-17,Math.floor(p[1])-8)),pixels=Array.from(c.getContext('2d').getImageData(x,y,17,17).data);let gold=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-240)<4&&Math.abs(pixels[i+1]-211)<4&&Math.abs(pixels[i+2]-155)<4)gold++;return {remote:m.name,position:m.pose.position,point:p,goldPixels:gold,canvas:[c.width,c.height]};});
 check('the normal map paints the companion at its actual chart position',chart.goldPixels>0&&chart.point[0]>=0&&chart.point[0]<chart.canvas[0]&&chart.point[1]>=0&&chart.point[1]<chart.canvas[1],chart);await host.shot('companion-map');
 await pause(1100);
 await host.wait(()=>modal==='map'&&document.hasFocus()&&!document.hidden&&renderer.dirty===false);
 const mapBefore=await host.read(()=>({frame:renderer.frame,dirty:renderer.dirty,focused:document.hasFocus(),hidden:document.hidden,image:$('mapCanvas').toDataURL(),member:oceanMultiplayer.snapshot().members.find(m=>m.id!==oceanMultiplayer.snapshot().memberId).pose.position}));
 check('foreground chart settles with no pending full-scene invalidation',mapBefore.dirty===false&&mapBefore.focused&&!mapBefore.hidden,{dirty:mapBefore.dirty,focused:mapBefore.focused,hidden:mapBefore.hidden,frame:mapBefore.frame});
 const mapSwim=await guest.swim(1100);await pause(220);
 const mapAfter=await host.read(()=>({frame:renderer.frame,dirty:renderer.dirty,image:$('mapCanvas').toDataURL(),member:oceanMultiplayer.snapshot().members.find(m=>m.id!==oceanMultiplayer.snapshot().memberId).pose.position,modal,hidden:document.hidden,focused:document.hasFocus()}));
 check('real remote poses update the paused chart without invalidating the full scene',mapAfter.modal==='map'&&mapBefore.dirty===false&&mapAfter.dirty===false&&distance(mapBefore.member,mapAfter.member)>.7&&distance(mapAfter.member,mapSwim.after.p)<.03&&mapBefore.image!==mapAfter.image,{dirtyBefore:mapBefore.dirty,dirtyAfter:mapAfter.dirty,frameDeltaObservation:mapAfter.frame-mapBefore.frame,from:mapBefore.member,to:mapAfter.member,hidden:mapAfter.hidden,focused:mapAfter.focused,beforeImageSha256:crypto.createHash('sha256').update(mapBefore.image).digest('hex'),afterImageSha256:crypto.createHash('sha256').update(mapAfter.image).digest('hex'),note:'The foreground chart first settles with dirty=false. While the other native page is controlled, real incoming poses must update its chart and leave dirty=false. Background frame delta is observational only: background RAF suppression alone cannot prove the invalidation fix or a performance benefit.'});
 await host.openRoom();await host.press('[data-room-preset="social/hello"]');await guest.openRoom();
 await guest.wait(()=>$('roomMessages').textContent.includes('你好，一起慢慢游吧'));
 check('social preset displays the authenticated host sender as literal text',(await guest.page.locator('#roomMessages').textContent()).includes(hostName+'：你好，一起慢慢游吧')&&await guest.page.locator('#roomMessages b').count()===0);
 await guest.press('[data-room-preset="discovery/look"]');await host.openRoom();await host.wait(()=>$('roomMessages').textContent.includes('來看看這裡'));
 check('discovery preset displays the actual guest sender and no free-chat input',(await host.page.locator('#roomMessages').textContent()).includes(guestName+'：來看看這裡')&&await host.page.locator('#roomMessages input, #roomMessages textarea').count()===0);
 await host.shot('preset-messages');
 stage='background-freeze';await guest.focus();await pause(1700);const backgroundAt=Date.now(),frozen=await guest.snapshot();await pause(1400);const frozenLater=await guest.snapshot();
 const extra=wire.filter(e=>e.label==='host'&&e.direction==='sent'&&e.type==='pose'&&e.at>=backgroundAt);
 check('background companion is explicitly paused, holds position and does not flood identical poses',frozen.remote?.paused&&frozenLater.remote?.paused&&distance(frozen.remote.position,frozenLater.remote.position)<.001&&extra.length===0,{before:frozen.remote,after:frozenLater.remote,extraPoses:extra.length});
 stage='save-boundaries';await inspectStorage(host,'joined');await inspectStorage(guest,'joined');const archive=await guest.export();
 // An independently opened same-profile tab must hit the existing save writer
 // gate, not silently create a second renderer or take over the room.
 const blocked=await guest.context.newPage();await blocked.goto(url);await blocked.locator('#saveSessionGate').waitFor({state:'visible'});
 const blockedSession=await guest.context.newCDPSession(blocked),blockedRead=await blockedSession.send('Runtime.evaluate',{expression:'JSON.stringify({renderer:typeof renderer,gate:document.getElementById("saveSessionGate").open})',returnByValue:true,userGesture:false});
 const blockedState=JSON.parse(blockedRead.result.value);check('existing single-writer save gate remains active in a same-context tab',blockedState.renderer==='undefined'&&blockedState.gate);await blocked.close();await guest.focus();
 stage='tcp-outage';await host.openRoom();await guest.openRoom();const beforeOutage=[await host.snapshot(),await guest.snapshot()],savedBefore=[await host.progress(),await guest.progress()];
 proxy.outage();await waitStatus(host,'reconnecting');await waitStatus(guest,'reconnecting');
 check('real TCP loss is visibly represented as reconnecting',/恢復原房間|重連/.test(await host.page.locator('#roomStatus').textContent())&&/恢復原房間|重連/.test(await guest.page.locator('#roomStatus').textContent()));
 await pause(1800);proxy.restore();await waitStatus(host,'joined');await waitStatus(guest,'joined');
 const recovered=[await host.snapshot(),await guest.snapshot()];
 check('both real sockets resume the original room and seats with newer generations',recovered.every((s,i)=>s.roomId===beforeOutage[i].roomId&&s.memberId===beforeOutage[i].memberId&&s.members.length===2&&s.members.find(m=>m.id===s.memberId).generation>beforeOutage[i].members.find(m=>m.id===s.memberId).generation),{before:beforeOutage.map(s=>({room:s.roomId,member:s.memberId,generation:s.members.find(m=>m.id===s.memberId).generation})),after:recovered.map(s=>({room:s.roomId,member:s.memberId,generation:s.members.find(m=>m.id===s.memberId).generation}))});
 check('recovery leaves both paused personal saves unchanged',JSON.stringify(savedBefore[0])===JSON.stringify(await host.progress())&&JSON.stringify(savedBefore[1])===JSON.stringify(await guest.progress()));
 const joins=wire.filter(e=>e.direction==='received'&&e.type==='joined');check('every joined response is followed by confirm before gameplay pose',joins.length>=4&&joins.every(join=>wire.slice(wire.indexOf(join)+1).find(e=>e.label===join.label&&e.requestId===join.requestId&&e.direction==='sent')?.type==='confirm'),{joinedResponses:joins.length});
 stage='explicit-leave';await guest.openRoom();const beforeLeave=await guest.progress();await guest.press('#roomLeave');await waitStatus(guest,'closed');await host.wait(()=>oceanMultiplayer.snapshot().members.length===1);
 const leaveAt=Date.now();await pause(1300);
 check('explicit guest leave removes the actual remote batch and stops its socket/pose traffic',(await guest.state()).batches.length===0&&(await host.state()).batches.length===0&&[...guest.sockets.values()].every(s=>!s.open)&&wire.filter(e=>e.label==='guest'&&e.direction==='sent'&&e.type==='pose'&&e.at>=leaveAt).length===0);
 check('explicit leave preserves the guest personal voyage',JSON.stringify(beforeLeave)===JSON.stringify(await guest.progress()));
 stage='reload-clears-session';await joinAgain(host,guest,code,guestName);const priorMember=(await guest.snapshot()).memberId,socketCount=guest.sockets.size;
 await guest.page.reload();await guest.boot();await host.wait(()=>oceanMultiplayer.snapshot().members.length===1);
 check('reload clears credentials and room intent instead of silently reconnecting',(await guest.snapshot()).status==='idle'&&(await guest.state()).batches.length===0&&guest.sockets.size===socketCount);
 await inspectStorage(guest,'after-reload');
 await joinAgain(host,guest,code,guestName);
 check('rejoining after reload requires new host approval and creates a new seat',(await guest.snapshot()).memberId!==priorMember);
 stage='import-clears-session';await guest.openVoyage();await guest.page.locator('#importSave').setInputFiles({name:'own-real-export.json',mimeType:'application/json',buffer:archive.bytes});inputs.push({label:'guest',action:'import-own-real-export',at:Date.now(),sha256:crypto.createHash('sha256').update(archive.bytes).digest('hex')});
 await guest.wait(()=>!voyage.importing&&$('toast').textContent==='存檔已匯入。',null,30000);await host.wait(()=>oceanMultiplayer.snapshot().members.length===1);
 const imported=await guest.progress();
 check('normal file-input import clears multiplayer and restores the personal archive',(await guest.snapshot()).status==='idle'&&(await guest.state()).batches.length===0&&imported.voyage.distance===archive.data.voyage.distance&&JSON.stringify(imported.seen)===JSON.stringify(archive.data.journal.seen));
 await inspectStorage(guest,'after-import');
 stage='host-close';await joinAgain(host,guest,code,guestName);await host.openRoom();const beforeHostLeave=await host.progress();await host.press('#roomLeave');await waitStatus(host,'closed');await waitStatus(guest,'closed');
 check('host ending the room clears both companions and explains the ending',(await host.state()).batches.length===0&&(await guest.state()).batches.length===0&&(await guest.snapshot()).error==='host_left'&&/結束/.test(await guest.page.locator('#roomStatus').textContent()));
 check('host ending a room preserves its personal voyage',JSON.stringify(beforeHostLeave)===JSON.stringify(await host.progress()));
 const finalAt=Date.now(),socketTotals=[host.sockets.size,guest.sockets.size];await pause(1500);
 const unresolvedCdpSockets=[host,guest].flatMap(c=>[...c.sockets].filter(([,s])=>s.open).map(([requestId,s])=>({label:c.label,requestId,url:s.url,socketDocument:s.documentSerial,currentDocument:c.documentSerial()})));
 check('idle clients leave no real TCP connections, new sockets or continued pose uploads',proxy.activeConnections()===0&&[host,guest].every((c,i)=>c.sockets.size===socketTotals[i])&&!wire.some(e=>e.direction==='sent'&&e.type==='pose'&&e.at>=finalAt),{activeTcpConnections:proxy.activeConnections(),unresolvedCdpSockets,note:'All original CDP records remain intact. A missing webSocketClosed across document navigation is unresolved telemetry, not evidence of a live socket. The actual unchanged-byte TCP proxy must have zero live pairs.'});
 for(const c of [host,guest]){await inspectStorage(c,'final-idle');await c.shot('room-ended');}
 check('network packets contain only room protocol fields, never personal save payloads',wire.every(e=>!e.keys?.some(k=>['voyage','journal','photography','photos','features','seen','progress'].includes(k))));
 check('no uncaught browser or renderer errors',errors.length===0,errors);
 check('both clients retain default automatic quality',(await host.state()).adaptive&&(await guest.state()).adaptive);
 stage='terminal-real-context-loss';await host.openRoom();await host.fill('#roomName',hostName);await host.press('#roomCreate');await waitStatus(host,'joined');
 const faultRoom=await host.page.locator('#roomShare').inputValue();await joinAgain(host,guest,faultRoom,guestName);await dive(guest);await dive(host);await guest.focus();
 await host.wait(()=>oceanMultiplayer.snapshot().members.some(m=>m.id!==oceanMultiplayer.snapshot().memberId&&m.pose));
 const beforeFault=await guest.state();
 // Explicit terminal failure injection: this is the actual WebGL extension,
 // not a fake error event or a write to game/connection state.
 const loss=await guest.session.send('Runtime.evaluate',{expression:'(()=>{const ext=renderer.gl.getExtension("WEBGL_lose_context");if(!ext)throw Error("Native context-loss test extension unavailable");ext.loseContext();return true;})()',userGesture:false,returnByValue:true});
 assert(!loss.exceptionDetails,'Native WebGL context-loss extension must succeed');inputs.push({label:'guest',action:'actual-WEBGL_lose_context',at:Date.now(),before:beforeFault});
 await guest.page.locator('#errorBox').waitFor({state:'visible'});await host.wait(()=>oceanMultiplayer.snapshot().members.length===1);
 const afterFault=await guest.state();await pause(350);const faultQuietAt=Date.now();await pause(1300);
 check('actual context loss uses normal saved recovery UI and removes the room companion',afterFault.glLost&&(await guest.snapshot()).status==='idle'&&afterFault.batches.length===0&&(await host.state()).batches.length===0&&await guest.page.locator('#errorSafeRestart').isVisible()&&/已保存/.test(await guest.page.locator('#errorMessage').innerText()));
 const currentGuestSockets=[...guest.sockets].filter(([,s])=>s.documentSerial===guest.documentSerial());
 check('context loss closes current-document guest sockets and leaves only the host TCP connection',proxy.activeConnections()===1&&(await host.snapshot()).status==='joined'&&currentGuestSockets.every(([,s])=>!s.open)&&!wire.some(e=>e.label==='guest'&&e.direction==='sent'&&e.type==='pose'&&e.at>=faultQuietAt),{activeTcpConnections:proxy.activeConnections(),expectedConnections:1,currentGuestDocument:guest.documentSerial(),currentGuestSockets:currentGuestSockets.map(([requestId,s])=>({requestId,open:s.open})),unresolvedEarlierCdpSockets:[...guest.sockets].filter(([,s])=>s.open&&s.documentSerial!==guest.documentSerial()).map(([requestId,s])=>({requestId,documentSerial:s.documentSerial})),note:'The host remains admitted; older-document CDP event gaps are preserved without marking them closed.'});
 await guest.shot('context-loss');await host.shot('peer-context-loss');check('terminal native context fault raises no uncaught JavaScript errors',errors.length===0,errors);
 // Real public service delivery is separate. This additional fixture gives the
 // unchanged production bytes an HTTPS, non-loopback document origin, with all
 // asset requests fulfilled from the local build. No app configuration is set.
 stage='unconfigured-public-origin';await host.context.close();await guest.context.close();
 const publicOrigin='https://ocean-room-unconfigured.example',publicClient=await makeClient('unconfigured-public',publicOrigin+'/');
 await publicClient.context.route(publicOrigin+'/**',async route=>{const requested=new URL(route.request().url()),local=new URL(requested.pathname+requested.search,url);const response=await publicClient.context.request.fetch(local.href);await route.fulfill({response});});
 await unavailable(publicClient);
 stage='complete';
}
(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 try{await run();}
 catch(error){fatal=redact(error.stack||error);console.error(fatal);for(const c of clients)if(!c.page.isClosed()){await c.shot('failure').catch(()=>{});try{observations.push({stage:'failure',label:c.label,state:await c.state(),room:await c.snapshot()});}catch{}}}
 finally{
  for(const c of clients)if(!c.page.isClosed()){if(c.contacts.size)await c.session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});if(c.moving)await c.page.keyboard.up('w').catch(()=>{});}
  if(browser)await browser.close();if(proxy)await proxy.close();if(backend)await backend.close();
  const report={url,profile,service,expectedVersion,status:fatal||checks.some(c=>!c.pass)?'failed':'passed',stage,metadata,checks,errors,consoleErrors,fatal,inputs,observations,wire,network,images,physicalPhoneTested:false,method:service==='unavailable'?'Actual requested public page, normal room entry and single-player start. No backend, proxy, network routing, endpoint override or gameplay injection. All CDP reads use userGesture:false. Native browser screenshots verify unavailable-service UI; this does not claim public multiplayer service delivery. Touch is same-computer simulation.':'Two independent browser storage contexts, production UI, native keyboard or one CDP touch stream per page, read-only CDP with userGesture:false, actual production HTTP/WebSocket room server behind an unchanged-byte TCP outage proxy. No rooms/poses/saves/progress/time/focus/render calls are injected. The explicit terminal fault uses the actual WEBGL_lose_context extension, not a synthetic error or state write. Raw capability values are retained only transiently in runner memory for leak checks; protocol evidence is allowlisted and final diagnostics redact them. Screenshots and real batch poses prove native presentation; this is not a GPU performance test. The non-loopback HTTPS fixture serves local production bytes and is not a public deployment test. Touch is same-computer simulation.',notClaimed:['persistent identity','42 friends and invitations','shared world clock','shared creatures','synchronized tool effects','complete appearance sync','public multiplayer service','cross-network play','physical phone acceptance']};
  const text=redact(JSON.stringify(report,null,2));fs.writeFileSync(output,text);
 }
 console.log(JSON.stringify({output,status:fatal||checks.some(c=>!c.pass)?'failed':'passed',passed:checks.filter(c=>c.pass).length,total:checks.length,stage}));if(fatal||checks.some(c=>!c.pass))process.exitCode=1;
})().catch(error=>{console.error(redact(error.stack||error));process.exitCode=1;});
