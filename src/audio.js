/* Original audio design. No Nintendo music, recordings, samples or third-party audio.
   Two 120-second original, synchronized stems are crossfaded by simulated depth.
   Soundscapes are synthesized; they are artistic, not scientific field recordings. */
class OceanAudio {
 constructor(){this.ctx=null;this.ready=false;this.loading=null;this.enabled=false;this.custom=null;this.sources=[];this.noise=null;this.lastBreath=-1;this.lastWhale=-100;this.lastKick=0;this.nextBubble=0;this.depth=18;this.effectsEmitted=0;this.startedAt=0;}
 async start(){
  if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('瀏覽器不支援 Web Audio。');
   try{this.ctx=new AC({latencyHint:'playback',sampleRate:24000});}catch(_){this.ctx=new AC();}
   const c=this.ctx;this.master=c.createGain();this.master.gain.value=0;
   this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.knee.value=12;this.limiter.ratio.value=4;this.limiter.attack.value=.008;this.limiter.release.value=.24;
   this.master.connect(this.limiter);this.limiter.connect(c.destination);
   this.music=c.createGain();this.music.gain.value=.60;this.music.connect(this.master);
   this.environment=c.createGain();this.environment.gain.value=.60;this.environment.connect(this.master);
   this.breath=c.createGain();this.breath.gain.value=.035;this.breath.connect(this.environment);
   this.stems=[c.createGain(),c.createGain()];this.stems.forEach(g=>{g.gain.value=0;g.connect(this.music);});
   this.analyser=c.createAnalyser();this.analyser.fftSize=256;this.master.connect(this.analyser);
   this.buildAmbience();this.startedAt=c.currentTime;
   this.timer=setInterval(()=>this.tick(),90);
  }
  this.enabled=true;
  // resume is intentionally inside the original tap/click call stack.
  this.ctx.resume().catch(()=>{});
  if(!this.loading){this.loading=Promise.all(['shallows','blue_silence'].map(async key=>{
   const uri=MUSIC[key];let buffer;
   if(uri.startsWith('data:')){const bin=atob(uri.slice(uri.indexOf(',')+1)),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);buffer=bytes.buffer;}
   else{const response=await fetch(uri,{credentials:'same-origin'});if(!response.ok)throw Error('Music HTTP '+response.status);buffer=await response.arrayBuffer();}
   return await this.ctx.decodeAudioData(buffer);
  })).then(buffers=>{const at=this.ctx.currentTime+.12;buffers.forEach((buffer,i)=>{const src=this.ctx.createBufferSource();src.buffer=buffer;src.loop=true;src.connect(this.stems[i]);src.start(at);this.sources.push(src);});this.ready=true;return true;}).catch(e=>{this.loading=null;console.warn('Music decode failed',e);toast('配樂載入失敗；水下音效仍可使用，點聲音鍵可重試。');return false;});}
  this.tick();return this.loading;
 }
 buildAmbience(){const c=this.ctx,len=c.sampleRate*4,b=c.createBuffer(1,len,c.sampleRate),a=b.getChannelData(0);let smooth=0;let st=84643;
  for(let i=0;i<len;i++){st=(Math.imul(st,1664525)+1013904223)>>>0;const white=st/4294967296*2-1;smooth=.987*smooth+.013*white;a[i]=smooth*2.5;}
  this.noise=b;const src=c.createBufferSource();src.buffer=b;src.loop=true;this.waterFilter=c.createBiquadFilter();this.waterFilter.type='lowpass';this.waterFilter.frequency.value=700;const water=c.createGain();water.gain.value=.42;src.connect(this.waterFilter);this.waterFilter.connect(water);water.connect(this.environment);src.start();
  const white=c.createBuffer(1,len,c.sampleRate),w=white.getChannelData(0);for(let i=0;i<len;i++){st=(Math.imul(st,1664525)+1013904223)>>>0;w[i]=(st/4294967296)*2-1;}
  const regulator=c.createBufferSource();regulator.buffer=white;regulator.loop=true;
  const band=c.createBiquadFilter();band.type='bandpass';band.frequency.value=1150;band.Q.value=.60;regulator.connect(band);band.connect(this.breath);regulator.start();
 }
 tick(){if(!this.ctx)return;const c=this.ctx,now=c.currentTime;
  if(document.hidden||!this.enabled||!settings.sound){this.master.gain.setTargetAtTime(0,now,.08);return;}
  const available=active||(modal==='training'&&typeof oceanEcology!=='undefined'&&!!oceanEcology.snapshot().training);this.master.gain.setTargetAtTime(available?settings.master:0,now,.70);
  this.depth=Math.max(0,-player.p[1]);const blend=clamp((this.depth-12)/36,0,1);this.blend=blend;
  this.music.gain.setTargetAtTime(settings.music*((modal || photoOpen) ? .62 : 1),now,1.2);
  // Parentheses are explicit: opening a panel ducks music, it does not restart it.
  this.environment.gain.setTargetAtTime(settings.ambience*((modal || photoOpen) ? .55 : 1),now,.35);
  this.stems[0].gain.setTargetAtTime(this.custom?0:Math.cos(blend*Math.PI/2),now,3.0);
  this.stems[1].gain.setTargetAtTime(this.custom?0:Math.sin(blend*Math.PI/2),now,3.0);
  this.waterFilter.frequency.setTargetAtTime(mix(720,320,blend),now,2);
  const phase=((now-this.startedAt)%7.6)/7.6;
  const inhale=phase<.34?Math.sin(phase/.34*Math.PI):0;
  const exhale=phase>.44&&phase<.78?Math.sin((phase-.44)/.34*Math.PI):0;
  this.breath.gain.setTargetAtTime(active?(inhale*.033+exhale*.014)*settings.breath:0,now,.08);
  if(active&&!modal&&!photoOpen&&settings.ambience>.02){
   if(exhale>.2&&now>this.nextBubble){this.bubble();this.nextBubble=now+.20+Math.random()*.24;}
   if(now-this.lastWhale>36+(1-blend)*20){this.lastWhale=now;this.whale(blend);}
   if(V.len(player.velocity)>.5&&now-this.lastKick>1.8){this.lastKick=now;this.fin();}
  }
  if($('musicState'))$('musicState').textContent=this.custom?'本機音樂':!this.ready?'配樂準備中':blend>.55?'微光之下':'海，仍在這裡';
 }
 bubble(){const c=this.ctx,now=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();osc.type='sine';osc.frequency.setValueAtTime(430+Math.random()*900,now);osc.frequency.exponentialRampToValueAtTime(160+Math.random()*130,now+.10);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.012*settings.breath,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);pan.pan.value=(Math.random()-.5)*.8;osc.connect(gain);gain.connect(pan);pan.connect(this.environment);osc.start(now);osc.stop(now+.22);osc.onended=()=>{osc.disconnect();gain.disconnect();pan.disconnect();};this.effectsEmitted++;}
 whale(blend){const c=this.ctx,now=c.currentTime;for(let h=1;h<=3;h++){const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type='sine';o.frequency.setValueAtTime((88+blend*16)*h,now);o.frequency.exponentialRampToValueAtTime(143*h,now+2.6);o.frequency.exponentialRampToValueAtTime(74*h,now+5.7);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.008/(h*h),now+1.7);g.gain.exponentialRampToValueAtTime(.00001,now+6);p.pan.setValueAtTime(-.64,now);p.pan.linearRampToValueAtTime(.6,now+6);o.connect(g);g.connect(p);p.connect(this.environment);o.start();o.stop(now+6.2);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}this.effectsEmitted++;}
 fin(){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),now=c.currentTime;s.buffer=this.noise;f.type='lowpass';f.frequency.value=480;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.14,now+.16);g.gain.exponentialRampToValueAtTime(.0001,now+.8);s.connect(f);f.connect(g);g.connect(this.environment);s.start(now,Math.random());s.stop(now+.9);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};this.effectsEmitted++;}
 cue(kind='photo'){if(!this.ctx||!this.enabled||!settings.sound)return;const c=this.ctx,now=c.currentTime;
  if(kind==='partner-song'){
   if(now-(this.lastPartnerSong??-100)<2)return;this.lastPartnerSong=now;
   // Authored musical contour, not a recording or scientific species voice.
   for(const [delay,start,end] of [[0,920,1480],[.38,1780,1200],[.9,1280,1960]]){const o=c.createOscillator(),g=c.createGain(),at=now+delay;o.type='sine';o.frequency.setValueAtTime(start,at);o.frequency.exponentialRampToValueAtTime(end,at+.34);g.gain.setValueAtTime(.00001,at);g.gain.exponentialRampToValueAtTime(.023,at+.08);g.gain.exponentialRampToValueAtTime(.00001,at+.40);o.connect(g);g.connect(this.environment);o.start(at);o.stop(at+.44);o.onended=()=>{o.disconnect();g.disconnect();};}this.effectsEmitted++;return;
  }
  if(kind==='whistle'){
   if(now-(this.lastWhistle??-100)<.7)return;this.lastWhistle=now;
   for(const [delay,start,end]of [[0,1750,2300],[.24,2250,1850]]){const o=c.createOscillator(),g=c.createGain(),at=now+delay;o.type='sine';o.frequency.setValueAtTime(start,at);o.frequency.exponentialRampToValueAtTime(end,at+.22);g.gain.setValueAtTime(.00001,at);g.gain.exponentialRampToValueAtTime(.045,at+.035);g.gain.exponentialRampToValueAtTime(.00001,at+.23);o.connect(g);g.connect(this.environment);o.start(at);o.stop(at+.25);o.onended=()=>{o.disconnect();g.disconnect();};}this.effectsEmitted++;return;
  }
  let notes=kind==='found'?[76,81]:[84];notes.forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=440*2**((n-69)/12);g.gain.setValueAtTime(.00001,now+i*.16);g.gain.exponentialRampToValueAtTime(.021,now+i*.16+.02);g.gain.exponentialRampToValueAtTime(.00001,now+i*.16+.65);o.connect(g);g.connect(this.environment);o.start(now+i*.16);o.stop(now+i*.16+.7);o.onended=()=>{o.disconnect();g.disconnect();};});}
 mute(){this.enabled=false;if(this.ctx){this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.06);setTimeout(()=>{if(!this.enabled)this.ctx.suspend().catch(()=>{});},350);}}
 pause(){if(this.ctx)this.ctx.suspend().catch(()=>{});}
 resume(){if(this.ctx&&this.enabled&&settings.sound)this.ctx.resume().catch(()=>{if(!document.hidden)toast('聲音暫停，請點一下右上角聲音鍵。');});}
 async loadLocal(file){if(!file)return;if(file.size>32*1024*1024){toast('請選擇 32 MB 以內的音訊檔。');return;}await this.start();try{const buffer=await this.ctx.decodeAudioData(await file.arrayBuffer());if(this.custom){this.custom.stop();this.custom.disconnect();}const src=this.ctx.createBufferSource();src.buffer=buffer;src.loop=true;src.connect(this.music);src.start();this.custom=src;this.customName=file.name;toast('已載入本機音樂；檔案不會上傳或隨網頁分享。');}catch(_){toast('音訊無法解碼，請改用 MP3、M4A 或 WAV。');}}
 resetMusic(){if(this.custom){this.custom.stop();this.custom.disconnect();this.custom=null;}this.tick();}
 get status(){return {context:this.ctx?.state||'not-started',musicReady:this.ready,originalStems:this.sources.length,blend:this.blend||0,effects:this.effectsEmitted,custom:!!this.custom};}
}
const oceanAudio=new OceanAudio();
