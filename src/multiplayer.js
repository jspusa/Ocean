/* A transient, opt-in room. Personal voyage and photographic state never enter
 * the protocol; the transport alone owns the private session capabilities. */
const oceanMultiplayer=(()=>{
 const labels={social:{hello:'你好，一起慢慢游吧',thanks:'謝謝你',goodbye:'下次再一起探索'},navigation:{follow:'跟著我游',wait:'等我一下',return:'一起返回研究船'},discovery:{found:'我有發現',look:'來看看這裡',help:'我需要幫忙'}};
 const categories={social:'打招呼',navigation:'同行',discovery:'發現'};
 const tools={observe:'觀察',feed:'餵食',pen:'水中筆',camera:'攝影',touch:'觸摸',grab:'抓握',partner:'夥伴'};
 const failures={version_mismatch:'雙方需要使用相同遊戲版本，請重新整理。',room_unavailable:'找不到這個房間，請確認房號。',host_unavailable:'房主暫時離線，請稍後重新申請。',room_full:'房間已滿，目前最多兩位潛水員。',visits_closed:'房主已關閉訪問。',host_rejected:'房主未批准這次申請。',request_expired:'申請已逾時，可以重新申請。',resume_invalid:'房間已無法恢復，請重新建立或申請。',admission_invalid:'這次申請已無法恢復，請重新建立或申請。',host_left:'房主已結束同游。',host_disconnected:'房主離線過久，房間已結束。',preset_rate_limited:'訊息送得太快，稍等一下再試。',server_full:'連線服務忙碌，請稍後再試。',connection_timeout:'連線逾時，請稍後再試。'};
 let client=null,connection={status:'idle',members:[],pending:[]},timer=null,lastPose='',lastSent=0,lastPanel='',displayName='',joinCode='',messages=[];
 let batch=null,remote=null,previous=null,latest=null,receivedAt=0,poseKey='',hud=null;
 function endpoint(){
  if(typeof OCEAN_ROOM_ENDPOINT==='string'&&OCEAN_ROOM_ENDPOINT)return OCEAN_ROOM_ENDPOINT;
  if(location.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname))return 'ws://'+location.hostname+':8787/v1';
  return null;
 }
 function releaseRemote(){
  if(batch){const g=renderer.gl,index=renderer.batches.indexOf(batch);if(index>=0)renderer.batches.splice(index,1);g.deleteVertexArray(batch.vao);g.deleteBuffer(batch.ib);g.deleteBuffer(batch.vb);g.deleteBuffer(batch.eb);batch=null;renderer.dirty=true;}
  remote=previous=latest=null;receivedAt=0;poseKey='';
 }
 function updateRemote(){
  const member=connection.members?.find(m=>m.id!==connection.memberId);
  if(!member||!['joined','reconnecting'].includes(connection.status)){releaseRemote();return;}
  if(remote?.id!==member.id)releaseRemote();
  remote=member;
  if(!member.pose){releaseRemote();remote=member;return;}
  const key=JSON.stringify([member.generation,member.pose]);
  if(key!==poseKey){
   previous=latest&&latest.generation===member.generation?latest:null;
   latest={...member.pose,position:member.pose.position.slice(),generation:member.generation};
   receivedAt=performance.now();poseKey=key;
  }
  if(!batch){batch=renderer.batch(diverGeometry(),[{p:latest.position.slice(),s:[.85,.85,.85],yaw:0,pitch:0,phase:0,tint:[1,1.15,1.2]}],5,true);batch.sceneRole='room-companion';batch.shadow=false;batch.maxDistance=140;batch.visible=false;}
 }
 function notify(snapshot){
  const oldStatus=connection.status;connection=snapshot;updateRemote();
  if(snapshot.status==='joined'){
   if(!timer)timer=setInterval(sendPose,100);
   if(oldStatus!=='joined'){lastPose='';lastSent=0;sendPose(true);}
  }else {clearInterval(timer);timer=null;}
  if(oldStatus!==snapshot.status)renderer.dirty=true;
  refreshPanel();paintHUD();if(modal==='map')drawMap();if($('explorationChart'))oceanFeatures.call('mapChanged');
 }
 function receiveMessage(event){
  const member=connection.members.find(m=>m.id===event.memberId),text=labels[event.category]?.[event.preset];if(!member||!text)return;
  messages.push({name:member.name,text});if(messages.length>12)messages.shift();refreshPanel();
  if(modal!=='multiplayer')toast(member.name+'：'+text);
 }
 function ensureClient(){
  if(client)return client;const url=endpoint();if(!url)return null;
  client=OceanRoomClient.create({endpoint:url,contentVersion:'ocean-'+document.documentElement.dataset.version,onChange:notify,onPreset:receiveMessage});return client;
 }
 function selectedTool(){const tool=oceanEcology.snapshot().tool;return voyage.photoMode?'camera':oceanExploration.penMode?'pen':Object.hasOwn(tools,tool)?tool:'observe';}
 function sendPose(urgent=false){
  if(connection.status!=='joined')return;
  if(!oceanSaveGuard.live||!ready){disconnect();return;}
  const pose={position:player.p.map(n=>Math.round(n*1000)/1000),yaw:Math.atan2(Math.sin(player.yaw),Math.cos(player.yaw)),pitch:player.pitch,tool:selectedTool(),paused:!active||!!modal||photoOpen||document.hidden||!document.hasFocus()};
  const now=performance.now(),key=JSON.stringify(pose);
  if(key===lastPose||!urgent&&now-lastSent<99)return;
  if(client.sendPose(pose)!==false){lastPose=key;lastSent=now;}
 }
 function disconnect(){
  clearInterval(timer);timer=null;client?.leave();client?.close();client=null;
  connection={status:'idle',members:[],pending:[]};lastPose='';lastPanel='';messages=[];releaseRemote();paintHUD();refreshPanel();
 }
 function afterCamera(){
  if(!batch||!latest)return;
  batch.visible=active&&connection.status==='joined'&&!!remote.connected&&V.dist(eye,latest.position)>2.3;
  if(!batch.visible)return;
  const f=batch.instances[0],paused=latest.paused||performance.now()-receivedAt>1500;
  const alpha=previous&&!paused?clamp((performance.now()-receivedAt)/100,0,1):1;
  f.p=previous?V.lerp(previous.position,latest.position,alpha):latest.position.slice();
  const fromYaw=previous?.yaw??latest.yaw,delta=Math.atan2(Math.sin(latest.yaw-fromYaw),Math.cos(latest.yaw-fromYaw));
  // Keep the diver rig: its pitch rotates about X, unlike rigid geometry.
  // Paused peers hold their received transform; the rig retains idle motion.
  f.yaw=-(fromYaw+delta*alpha);f.pitch=-mix(previous?.pitch??latest.pitch,latest.pitch,alpha);
 }
 function statusLabel(){
  if(!endpoint())return '連線服務尚未開放';
  if(connection.error)return failures[connection.error]||'這次連線未完成，請重新建立或申請。';
  if(connection.status==='reconnecting')return connection.memberId?'連線中斷，正在恢復原房間…':'連線中斷，正在恢復這次連線…';
  return {idle:'準備一起探索',connecting:'正在連線…',pending:'等待房主批准…',joined:'已加入同游',reconnecting:'連線中斷，正在恢復這次連線…',closed:'同游已結束'}[connection.status]||'連線已結束';
 }
 function memberLabel(m){const self=m.id===connection.memberId,paused=self?!active||!!modal||photoOpen:m.pose?.paused;return m.name+(self?'（你）':'')+' · '+(m.role==='host'?'房主':'同行者')+' · '+(!m.connected?'暫時離線':paused?'暫停／船上':'同游中');}
 function render(){
  panelTitle('DIVE TOGETHER','雙人同游');const joined=!!connection.memberId&&['joined','reconnecting'].includes(connection.status),busy=!joined&&['connecting','pending','reconnecting'].includes(connection.status),available=!!endpoint();
  $('panelBody').innerHTML='<p id="roomStatus" class="feature-result" role="status"></p><p class="panel-note">目前同步潛水員位置、選用工具與預設訊息。生物互動、水中筆、日夜及外觀配件尚未同步；圖鑑、照片和航程各自保存。</p>'+
   (!available?'<p class="panel-note">公網同游服務準備中。你可以繼續完整的單人探索；此頁不會嘗試連線。</p>':joined?'<section class="feature-section"><label class="room-label" for="roomShare">房號 · 分享給同行者</label><input class="room-input" id="roomShare" readonly><p class="panel-note">房主批准後才能進入，最多兩人。重新整理或回船會結束本次同游。</p><div id="roomMembers"></div><div id="roomRequests"></div>'+(connection.role==='host'?'<label class="setting-row"><span>接受新的加入申請</span><input id="roomVisits" type="checkbox"></label>':'')+'<div class="feature-toolbar"><button id="roomDive" class="primary">'+(active?'繼續同游':'下水同游')+'</button><button id="roomMap" class="muted-btn">同伴位置</button><button id="roomLeave" class="muted-btn">離開房間</button></div></section><section class="feature-section"><h3>和同伴說一聲</h3>'+Object.entries(labels).map(([category,items])=>'<p class="room-category">'+categories[category]+'</p><div class="room-presets">'+Object.entries(items).map(([id,text])=>'<button class="muted-btn" data-room-preset="'+category+'/'+id+'">'+text+'</button>').join('')+'</div>').join('')+'<ol id="roomMessages" aria-live="polite"></ol></section>':busy?'<button id="roomLeave" class="muted-btn">取消連線／申請</button>':'<section class="feature-section"><label class="room-label" for="roomName">這次同游的顯示名稱</label><input class="room-input" id="roomName" type="text" maxlength="24" autocomplete="off" placeholder="例如：小海"><button id="roomCreate" class="primary">建立雙人房間</button></section><section class="feature-section"><label class="room-label" for="roomCode">加入朋友的房間</label><input class="room-input" id="roomCode" type="text" maxlength="128" autocomplete="off" spellcheck="false" placeholder="貼上房號"><button id="roomRequest" class="muted-btn">申請加入</button></section>')+
   '<p class="panel-note">只有主動建立或申請時才連線，傳送顯示名稱、位置、方向、工具狀態與預設訊息。照片、個人存檔不會上傳。臨時房間不保存好友；服務重啟或離線過久會結束。</p>';
  if($('roomName')){$('roomName').value=displayName;$('roomName').oninput=e=>{displayName=e.target.value;};$('roomCode').value=joinCode;$('roomCode').oninput=e=>{joinCode=e.target.value;};}
  const start=kind=>{const name=displayName.trim();if(!name||/[\p{Cc}\p{Cf}]/u.test(name)){toast('請輸入 1–24 字的顯示名稱。');$('roomName')?.focus();return;}if(kind==='request'&&!joinCode.trim()){toast('請先貼上朋友的房號。');$('roomCode')?.focus();return;}messages=[];try{const c=ensureClient();if(kind==='create')c.create(name);else c.request(name,joinCode.trim());}catch(_){toast('目前無法連線，請稍後再試。');}};
  if($('roomCreate'))$('roomCreate').onclick=()=>start('create');if($('roomRequest'))$('roomRequest').onclick=()=>start('request');
  if($('roomLeave'))$('roomLeave').onclick=()=>{client?.leave();};
  if($('roomDive'))$('roomDive').onclick=()=>{closePanel();if(!active)startDive();};
  if($('roomMap'))$('roomMap').onclick=()=>openPanel('map');
  if($('roomVisits'))$('roomVisits').onchange=e=>client?.visits(e.target.checked);
  $('panelBody').querySelectorAll('[data-room-preset]').forEach(button=>button.onclick=()=>client?.preset(...button.dataset.roomPreset.split('/')));
  lastPanel='';refreshPanel();
 }
 function refreshPanel(){
  if(modal!=='multiplayer')return;
  const joined=!!connection.memberId&&['joined','reconnecting'].includes(connection.status),busy=!joined&&['connecting','pending','reconnecting'].includes(connection.status);
  const expected=joined?'joined':busy?'busy':'idle',actual=$('roomMembers')?'joined':$('roomLeave')?'busy':'idle';
  if(endpoint()&&expected!==actual){render();return;}
  $('roomStatus').textContent=statusLabel();if(!joined)return;
  const controlKey=JSON.stringify([connection.status,connection.members.map(m=>[m.id,m.name,m.role,m.connected,m.pose?.paused]),connection.pending,connection.visitsOpen,messages]);
  if(controlKey===lastPanel)return;lastPanel=controlKey;
  $('roomShare').value=connection.roomId||'';
  $('roomMembers').replaceChildren(...connection.members.map(member=>{const p=document.createElement('p');p.textContent=memberLabel(member);return p;}));
  $('roomRequests').innerHTML=(connection.pending||[]).map(request=>'<div class="room-request"><span>'+safe(request.name)+' 想加入</span><button class="muted-btn" data-room-approve="'+safe(request.requestId)+'">批准</button><button class="muted-btn" data-room-deny="'+safe(request.requestId)+'">拒絕</button></div>').join('');
  $('roomRequests').querySelectorAll('[data-room-approve]').forEach(b=>b.onclick=()=>client?.decide(b.dataset.roomApprove,true));$('roomRequests').querySelectorAll('[data-room-deny]').forEach(b=>b.onclick=()=>client?.decide(b.dataset.roomDeny,false));
  if($('roomVisits')){$('roomVisits').checked=connection.visitsOpen;$('roomVisits').disabled=connection.status!=='joined';}
  $('roomMessages').replaceChildren(...messages.map(message=>{const li=document.createElement('li');li.textContent=message.name+'：'+message.text;return li;}));
  $('panelBody').querySelectorAll('[data-room-preset], [data-room-approve], [data-room-deny]').forEach(b=>b.disabled=connection.status!=='joined');
 }
 function paintHUD(){
  if(!hud)return;
  const show=active&&!modal&&!photoOpen&&!voyage.photoMode&&['joined','reconnecting'].includes(connection.status)&&!document.body.classList.contains('cinematic');hud.hidden=!show;
  if(!show)return;
  if(!remote?.pose){hud.textContent=connection.status==='reconnecting'?'同游 · 正在重連…':'同游 · 等待同行者';return;}
  const p=remote.pose.position,d=V.dist(player.p,p),angle=Math.atan2(p[0]-player.p[0],-(p[2]-player.p[2]))-player.yaw;
  const arrow=['↑','↗','→','↘','↓','↙','←','↖'][(Math.round(angle/(Math.PI/4))%8+8)%8];
  hud.textContent=remote.name+' · '+arrow+' '+Math.round(d)+' m\n深度 '+Math.round(Math.max(0,-p[1]))+' m · '+(!remote.connected||connection.status==='reconnecting'?'暫時離線':remote.pose.paused?'暫停／船上':tools[remote.pose.tool]);
 }
 function drawRoomMap(ctx,w,h){
  if(!remote?.pose||!['joined','reconnecting'].includes(connection.status))return;
  const connected=remote.connected&&connection.status==='joined',p=remote.pose.position,[x,y]=chartPoint(p[0],p[2],w,h);ctx.save();ctx.fillStyle=connected?'#f0d39b':'#819d9f';ctx.strokeStyle='#061f28';ctx.lineWidth=2;ctx.translate(x,y);ctx.rotate(remote.pose.yaw);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-6,7);ctx.lineTo(6,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.save();ctx.font='12px sans-serif';ctx.fillStyle=connected?'#f0d39b':'#819d9f';ctx.textAlign=x>w/2?'right':'left';ctx.fillText(remote.name+' · '+Math.round(-p[1])+' m'+(!connected?' · 離線':remote.pose.paused?' · 暫停':''),x+(x>w/2?-12:12),y-12);ctx.restore();
 }
 function init(){
  oceanFeatures.addMenu({id:'multiplayer',label:'雙人同游',panel:'multiplayer'});
  const entry=document.createElement('button');entry.id='welcomeMultiplayer';entry.dataset.feature='multiplayer';entry.textContent='雙人同游';entry.onclick=()=>openPanel('multiplayer');$('shipSettings').before(entry);
  hud=document.createElement('button');hud.id='roomCompanion';hud.className='room-companion';hud.hidden=true;hud.onclick=()=>openPanel('multiplayer');$('hud').append(hud);
  for(const name of ['blur','focus'])window.addEventListener(name,sendPose);document.addEventListener('visibilitychange',sendPose);
  window.addEventListener('pagehide',disconnect);document.addEventListener('freeze',disconnect);
  $('ocean').addEventListener('webglcontextlost',disconnect);
 }
 const changed=()=>{sendPose(true);paintHUD();};
 const feature={id:'multiplayer',initial:()=>({}),sanitize:()=>({}),init,renderPanel(type){if(type!=='multiplayer')return false;render();return true;},afterCamera,paintHUD,drawMap:drawRoomMap,panelChanged:changed,panelClosed:changed,startDive:changed,endDive:disconnect,reset:disconnect,sessionEnded:disconnect};
 oceanFeatures.register(feature);
 return {feature,drawMap:drawRoomMap,snapshot:()=>({...connection,remote:remote?{position:batch?.instances[0]?.p.slice()||null,yaw:batch?.instances[0]?.yaw,pitch:batch?.instances[0]?.pitch,visible:batch?.visible===true,paused:latest?.paused,connected:remote.connected}:null})};
})();
