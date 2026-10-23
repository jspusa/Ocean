/* Live diagnostics measure rendered requestAnimationFrame intervals, never a promised FPS.
   No telemetry is uploaded. Sampling pauses with menus/background tabs. */
class OceanPerformance{
 constructor(){this.samples=new Float32Array(240);this.cursor=0;this.count=0;this.previous=0;this.lastUI=0;this.lastAdaptive=0;this.headroom=0;this.benchmark=null;this.lastResult=null;this.visible=false;this.lastCPU=0;this.target=60;this.sampleTarget=60;this.wasActive=null;this.activeTime=0;this.adaptiveTime=0;this.adaptiveCount=0;this.recoveryAfter=0;this.recoveryDelay=8000;this.probe=null;}
 pause(){this.previous=0;this.headroom=0;this.adaptiveTime=0;this.adaptiveCount=0;}
 resetSamples(preserveProbe=false){this.cursor=0;this.count=0;this.pause();if(!preserveProbe)this.probe=null;}
 record(ms,cpu){
  if(!Number.isFinite(ms))return;
  if(this.wasActive!==active){this.wasActive=active;this.resetSamples(true);}
  if(this.sampleTarget!==this.target){this.sampleTarget=this.target;this.resetSamples(true);}
  if(this.benchmark){const b=this.benchmark;if(renderer.quality!==b.startQuality||renderer.dynamicScale!==b.startScale||renderer.canvas.width!==b.resolution[0]||renderer.canvas.height!==b.resolution[1]){this.benchmark=null;toast('畫面尺寸或品質已改變，這次量測已取消。請以新設定重新量測。');}}
  if(this.previous){const dt=ms-this.previous;if(dt>0&&Number.isFinite(dt)){this.samples[this.cursor]=dt;this.cursor=(this.cursor+1)%240;this.count=Math.min(240,this.count+1);if(active){this.activeTime+=dt;this.adaptiveTime+=dt;this.adaptiveCount++;if(this.benchmark){this.benchmark.frames.push({ms:dt,cpu:Number.isFinite(cpu)?cpu:0,scale:renderer.dynamicScale});this.benchmark.activeMs+=dt;}}}}
  this.previous=ms;this.lastCPU=cpu;
  if(this.benchmark&&this.benchmark.activeMs>=20000)this.finish();
  if(ms-this.lastUI>350){this.lastUI=ms;this.paint();}
  if(!active||!settings.adaptive||this.benchmark){this.adaptiveTime=0;this.adaptiveCount=0;this.headroom=0;return;}
  // Elapsed active time matters: waiting for 90 frames took 18 seconds at 5 FPS.
  // A median guard keeps a single loading/GC hitch from lowering the whole scene.
  if(this.adaptiveTime<1200||this.adaptiveCount<6)return;
  this.lastAdaptive=ms;const stat=this.stats(this.adaptiveCount),budget=1000/this.target,windowTime=this.adaptiveTime;
  this.adaptiveTime=0;this.adaptiveCount=0;
  if(this.probe&&this.activeTime>this.probe.until)this.probe=null;
  let quality=renderer.quality,scale=renderer.dynamicScale,trial=null;
  if(stat.mean>budget*1.17&&stat.p50>budget*1.17){
   if(this.probe){quality=this.probe.quality;scale=this.probe.scale;this.recoveryDelay=Math.min(60000,Math.max(16000,this.recoveryDelay*2));}
   else {this.recoveryDelay=8000;if(scale>.64001)scale=Math.max(.64,scale-(stat.mean>budget*1.8?.18:.08));else if(quality>0)quality--;}
   this.recoveryAfter=this.activeTime+this.recoveryDelay;this.headroom=0;
  }else if(this.activeTime>=this.recoveryAfter&&stat.mean<=budget*1.04&&stat.p50<=budget*1.35&&stat.p95<=Math.min(budget*2,budget+stat.p10)){
   // Restore detail slowly. A failed probe restores the previous safe settings
   // and waits longer; frame timing is never described as measured GPU headroom.
   // Capped frames land on display ticks: healthy 60 FPS on 75/90/144 Hz has
   // mixed intervals. Allow one observed short interval of quantization, while
   // requiring a healthy mean/median and rejecting repeated long stalls.
   this.headroom+=windowTime;
   if(this.headroom>=6000){
    if(scale<.99999)scale=Math.min(1,scale+.035);
    else if(quality<Math.min(2,Math.round(settings.quality)))quality++;
    if(quality!==renderer.quality||scale!==renderer.dynamicScale)trial={quality:renderer.quality,scale:renderer.dynamicScale,until:this.activeTime+8000};
   }
  }else this.headroom=0;
  if(quality!==renderer.quality||scale!==renderer.dynamicScale){
   renderer.quality=quality;renderer.dynamicScale=scale;renderer.dirty=true;renderer.forceShadow=true;renderer.resize();this.resetSamples();this.probe=trial;
   if(trial)this.recoveryAfter=this.activeTime+6000;
  }
 }
 stats(count=this.count){count=Math.min(count,this.count);if(!count)return {fps:0,p95:0,p50:0,p10:0,mean:0};const a=Array.from({length:count},(_,i)=>this.samples[(this.cursor-i-1+240)%240]).sort((a,b)=>a-b),mean=a.reduce((s,v)=>s+v,0)/a.length;return {fps:1000/mean,p95:a[Math.floor(a.length*.95)],p50:a[Math.floor(a.length*.5)],p10:a[Math.floor(a.length*.1)],mean};}
 toggle(){this.visible=!this.visible;const panel=$('perfPanel');panel.classList.toggle('hidden',!this.visible);$('fpsChip')?.setAttribute('aria-expanded',String(this.visible));this.paint();}
 start(){
  if(!active){toast('先開始潛水，再進行實際裝置量測。');return;}
  closePanel();this.pause();this.benchmark={start:performance.now(),activeMs:0,frames:[],startQuality:renderer.quality,startScale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],adaptiveWas:settings.adaptive};
  this.visible=true;$('perfPanel').classList.remove('hidden');$('fpsChip')?.setAttribute('aria-expanded','true');toast('量測 20 秒。照常游動；期間固定解析度，不會上傳任何資料。');
 }
 finish(){const b=this.benchmark;if(!b)return;this.benchmark=null;const a=b.frames.map(f=>f.ms).sort((a,b)=>a-b);if(a.length<2){toast('有效幀數不足，請重新量測。');return;}
  const sum=a.reduce((s,x)=>s+x,0),cpu=b.frames.reduce((s,x)=>s+x.cpu,0)/b.frames.length;
  const ext=renderer.gl.getExtension('WEBGL_debug_renderer_info');
  this.lastResult={version:OPEN_WORLD.version,capturedAt:new Date().toISOString(),durationMs:sum,renderedFrames:a.length,averageFPS:1000*a.length/sum,p50FrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],meanCPUFrameMs:cpu,renderResolution:b.resolution,msaaSamples:renderer.msaaSamples,individuals:renderer.individualCount,renderScale:b.startScale,quality:b.startQuality,renderer:ext?renderer.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'not disclosed',userAgent:navigator.userAgent,scene:'Shilang concept, not a survey',frameIntervalsMs:b.frames.map(x=>+x.ms.toFixed(3)),note:'requestAnimationFrame interval benchmark on THIS device, not a Wii benchmark. No GPU-time claim. Initial scale held fixed. Menus/background time is excluded.'};
  $('perfExport').disabled=false;toast('量測完成：'+this.lastResult.averageFPS.toFixed(1)+' FPS · P95 '+this.lastResult.p95FrameMs.toFixed(1)+' ms');this.paint();
 }
 export(){if(!this.lastResult)return;const url=URL.createObjectURL(new Blob([JSON.stringify(this.lastResult,null,2)],{type:'application/json'}));download(url,'Ocean-v'+this.lastResult.version+'-device-benchmark.json');setTimeout(()=>URL.revokeObjectURL(url),3000);}
 paint(){if(!$('fpsChip'))return;const v=this.stats();$('fpsChip').textContent=this.count>8?v.fps.toFixed(0)+' FPS':'FPS';
  if(!this.visible)return;
  $('perfFPS').textContent=this.count?v.fps.toFixed(1):'—';$('perfP95').textContent=this.count?v.p95.toFixed(1)+' ms':'—';
  $('perfResolution').textContent=renderer.canvas.width+' × '+renderer.canvas.height+' · '+Math.round(renderer.dynamicScale*100)+'%';
  $('perfWork').textContent=Math.round(renderer.submittedTriangles/1000)+'k 三角形 · '+renderer.drawCalls+' draws · '+(renderer.msaaSamples?renderer.msaaSamples+'× MSAA':'FXAA');
  $('perfBench').textContent=this.benchmark?'量測中 '+Math.max(0,20-Math.floor(this.benchmark.activeMs/1000))+' 秒':'量測 20 秒';$('perfBench').disabled=!!this.benchmark;
  const c=$('frameGraph'),x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.strokeStyle='rgba(255,255,255,.18)';x.beginPath();x.moveTo(0,32);x.lineTo(c.width,32);x.stroke();x.strokeStyle='#a8dbd3';x.lineWidth=1.2;x.beginPath();
  for(let i=0;i<this.count;i++){const n=(this.cursor-this.count+i+240)%240,y=55-Math.min(this.samples[n],80)/80*52;const px=i/(Math.max(1,this.count-1))*c.width;if(i)x.lineTo(px,y);else x.moveTo(px,y);}x.stroke();
 }
}
const oceanPerf=new OceanPerformance();
function initPerformance(){
 const box=document.createElement('aside');box.id='perfPanel';box.className='hidden';box.setAttribute('aria-label','裝置效能量測');box.innerHTML=`<div class="perf-title">DEVICE PERFORMANCE <button id="perfClose" aria-label="關閉效能面板">×</button></div><div class="perf-numbers"><span><b id="perfFPS">—</b><small>實測平均 FPS</small></span><span><b id="perfP95">—</b><small>P95 幀時間</small></span></div><canvas id="frameGraph" width="240" height="56" aria-label="最近幀時間"></canvas><p id="perfResolution"></p><p id="perfWork"></p><div class="perf-buttons"><button id="perfBench">量測 20 秒</button><button id="perfExport" disabled>匯出</button></div><small class="perf-foot">此裝置即時數值。省電模式上限 30 FPS，其餘模式上限 60 FPS；不是流暢度保證。P95 越低越穩定。</small>`;document.body.appendChild(box);
 const chip=document.createElement('button');chip.id='fpsChip';chip.textContent='FPS';chip.title='效能與幀時間（F8）';chip.setAttribute('aria-label','查看裝置效能');chip.setAttribute('aria-controls','perfPanel');chip.setAttribute('aria-expanded','false');$('hud').appendChild(chip);chip.onclick=()=>oceanPerf.toggle();$('perfClose').onclick=()=>oceanPerf.toggle();$('perfBench').onclick=()=>oceanPerf.start();$('perfExport').onclick=()=>oceanPerf.export();
 window.addEventListener('keydown',e=>{if(e.code==='F8'&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();oceanPerf.toggle();}});
}
