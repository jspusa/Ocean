/* Live diagnostics measure rendered requestAnimationFrame intervals, never a promised FPS.
   No telemetry is uploaded. Sampling pauses with menus/background tabs. */
class OceanPerformance{
 constructor(){this.samples=new Float32Array(240);this.cursor=0;this.count=0;this.previous=0;this.lastUI=0;this.lastAdaptive=0;this.headroom=0;this.benchmark=null;this.lastResult=null;this.visible=false;this.lastCPU=0;this.target=60;this.recoveryAfter=0;}
 pause(){this.previous=0;this.headroom=0;}
 resetSamples(){this.cursor=0;this.count=0;this.previous=0;this.headroom=0;}
 record(ms,cpu){
  if(!Number.isFinite(ms))return;
  if(this.benchmark){const b=this.benchmark;if(renderer.quality!==b.startQuality||renderer.dynamicScale!==b.startScale||renderer.canvas.width!==b.resolution[0]||renderer.canvas.height!==b.resolution[1]){this.benchmark=null;toast('畫面尺寸或品質已改變，這次量測已取消。請以新設定重新量測。');}}
  if(this.previous){const dt=ms-this.previous;if(dt>0&&Number.isFinite(dt)){this.samples[this.cursor]=dt;this.cursor=(this.cursor+1)%240;this.count=Math.min(240,this.count+1);if(this.benchmark){this.benchmark.frames.push({ms:dt,cpu:Number.isFinite(cpu)?cpu:0,scale:renderer.dynamicScale});this.benchmark.activeMs+=dt;}}}
  this.previous=ms;this.lastCPU=cpu;
  if(this.benchmark&&this.benchmark.activeMs>=20000)this.finish();
  if(ms-this.lastUI>350){this.lastUI=ms;this.paint();}
  if(active&&settings.adaptive&&!this.benchmark&&this.count>=90&&ms-this.lastAdaptive>2200){
   this.lastAdaptive=ms;const stat=this.stats(),budget=1000/this.target;
   // A 60 Hz display cannot report the old >78 FPS recovery threshold.
   // Probe upward only after several stable windows at the display budget.
   // No CPU duration is presented as GPU headroom; a failed probe backs off.
   if(stat.mean>budget*1.17&&renderer.dynamicScale>.64){
    renderer.dynamicScale=Math.max(.64,renderer.dynamicScale-.065);renderer.resize();this.resetSamples();this.recoveryAfter=ms+8000;
   }else if(ms>=this.recoveryAfter&&stat.mean<=budget*1.04&&stat.p95<=budget*1.22&&renderer.dynamicScale<1){
    if(++this.headroom>=3){renderer.dynamicScale=Math.min(1,renderer.dynamicScale+.035);renderer.resize();this.resetSamples();this.recoveryAfter=ms+5500;}
   }else this.headroom=0;
  }
 }
 stats(){if(!this.count)return {fps:0,p95:0,mean:0};const a=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b),mean=a.reduce((s,v)=>s+v,0)/a.length;return {fps:1000/mean,p95:a[Math.floor(a.length*.95)],mean};}
 toggle(){this.visible=!this.visible;const panel=$('perfPanel');panel.classList.toggle('hidden',!this.visible);$('fpsChip')?.setAttribute('aria-expanded',String(this.visible));this.paint();}
 start(){
  if(!active){toast('先開始潛水，再進行實際裝置量測。');return;}
  closePanel();this.pause();this.benchmark={start:performance.now(),activeMs:0,frames:[],startQuality:renderer.quality,startScale:renderer.dynamicScale,resolution:[renderer.canvas.width,renderer.canvas.height],adaptiveWas:settings.adaptive};
  this.visible=true;$('perfPanel').classList.remove('hidden');$('fpsChip')?.setAttribute('aria-expanded','true');toast('量測 20 秒。照常游動；期間固定解析度，不會上傳任何資料。');
 }
 finish(){const b=this.benchmark;if(!b)return;this.benchmark=null;const a=b.frames.map(f=>f.ms).sort((a,b)=>a-b);if(a.length<2){toast('有效幀數不足，請重新量測。');return;}
  const sum=a.reduce((s,x)=>s+x,0),cpu=b.frames.reduce((s,x)=>s+x.cpu,0)/b.frames.length;
  const ext=renderer.gl.getExtension('WEBGL_debug_renderer_info');
  this.lastResult={version:document.documentElement?.dataset?.version||'unknown',worldVersion:OPEN_WORLD.version,capturedAt:new Date().toISOString(),durationMs:sum,renderedFrames:a.length,averageFPS:1000*a.length/sum,p50FrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],p99FrameMs:a[Math.floor(a.length*.99)],meanCPUFrameMs:cpu,renderResolution:b.resolution,msaaSamples:renderer.msaaSamples,individuals:renderer.individualCount,renderScale:b.startScale,quality:b.startQuality,renderer:ext?renderer.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'not disclosed',userAgent:navigator.userAgent,scene:'Shilang concept, not a survey',frameIntervalsMs:b.frames.map(x=>+x.ms.toFixed(3)),note:'requestAnimationFrame interval benchmark on THIS device, not a Wii benchmark. No GPU-time claim. Initial scale held fixed. Menus/background time is excluded.'};
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
 const box=document.createElement('aside');box.id='perfPanel';box.className='hidden';box.setAttribute('aria-label','裝置效能量測');box.innerHTML=`<div class="perf-title">DEVICE PERFORMANCE <button id="perfClose" aria-label="關閉效能面板">×</button></div><div class="perf-numbers"><span><b id="perfFPS">—</b><small>實測平均 FPS</small></span><span><b id="perfP95">—</b><small>P95 幀時間</small></span></div><canvas id="frameGraph" width="240" height="56" aria-label="最近幀時間"></canvas><p id="perfResolution"></p><p id="perfWork"></p><div class="perf-buttons"><button id="perfBench">量測 20 秒</button><button id="perfExport" disabled>匯出</button></div><small class="perf-foot">此裝置即時數值。60 FPS 為品質預算目標，不是保證。P95 越低越穩定。</small>`;document.body.appendChild(box);
 const chip=document.createElement('button');chip.id='fpsChip';chip.textContent='FPS';chip.title='效能與幀時間（F8）';chip.setAttribute('aria-label','查看裝置效能');chip.setAttribute('aria-controls','perfPanel');chip.setAttribute('aria-expanded','false');$('hud').appendChild(chip);chip.onclick=()=>oceanPerf.toggle();$('perfClose').onclick=()=>oceanPerf.toggle();$('perfBench').onclick=()=>oceanPerf.start();$('perfExport').onclick=()=>oceanPerf.export();
 window.addEventListener('keydown',e=>{if(e.code==='F8'&&!e.repeat&&!oceanKeyboard.reserved(e)){e.preventDefault();oceanPerf.toggle();}});
}
