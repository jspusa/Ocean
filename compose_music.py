"""Original procedural score, Return to the Blue / 0.3.
No samples, soundfonts, vocals or third-party melodies. Two synchronized 120 s stems.
Python 3.10+, numpy, scipy, soundfile, ffmpeg. Rendering is deterministic.
"""
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import soundfile as sf
import subprocess, json
from functools import lru_cache

ROOT=Path(__file__).resolve().parent
SR=16000; DURATION=120.; N=int(SR*DURATION); BAR=3.75
rng=np.random.default_rng(263103)
shallow=np.zeros((N,2),np.float32); deep=np.zeros_like(shallow)
def hz(note): return 440*2**((note-69)/12)
def place(bus, signal, at, amp=1., pan=0.):
    a=np.asarray(signal,dtype=np.float32)*amp
    i=int(at*SR)%N; m=min(len(a),N-i)
    l=np.sqrt((1-pan)/2); r=np.sqrt((1+pan)/2)
    bus[i:i+m,0]+=a[:m]*l; bus[i:i+m,1]+=a[:m]*r
    if m<len(a):
        bus[:len(a)-m,0]+=a[m:]*l; bus[:len(a)-m,1]+=a[m:]*r
@lru_cache(maxsize=150)
def piano(note, duration=6., vel=.8):
    t=np.arange(int(SR*duration))/SR;f=hz(note);y=np.zeros_like(t)
    for h in range(1,13):
        decay=np.exp(-t*(.42+h*.21)*(f/300)**.16)
        partial=(1/h**1.62)*decay
        phase=2*np.pi*f*h*np.sqrt(1+.000021*h*h)*t
        y+=partial*(np.sin(phase)+.28*np.sin(phase*1.00065))
    env=(1-np.exp(-t*140))*np.minimum(1,np.maximum(0,(duration-t)/.23))
    return np.tanh(y*.6)*env*vel

@lru_cache(maxsize=150)
def pad(note,duration=8.3,bright=1.):
    t=np.arange(int(SR*duration))/SR;f=hz(note);y=np.zeros_like(t)
    for voice,cent in enumerate([-4.5,4.7]):
        ff=f*2**(cent/1200)
        for h in range(1,11):
            freq=ff*h
            if freq>SR/2:break
            # Rounded, wordless vowel-like harmonic envelope; not a recorded singer.
            form=.38*np.exp(-((freq-620)/340)**2)+.19*np.exp(-((freq-1140)/440)**2)+.05
            power=(.25/(h**1.7)+form/h)*np.exp(-freq/(2000*bright))
            phase=rng.uniform(0,2*np.pi)
            vibr=.018*np.sin(2*np.pi*(4.8+voice*.2)*t+voice)
            y+=power*np.sin(2*np.pi*ff*h*t+phase+vibr*h)
    env=np.sin(np.pi*np.clip(t/duration,0,1))**1.65
    return y*env

@lru_cache(maxsize=100)
def bell(note,duration=7.):
    t=np.arange(int(SR*duration))/SR;f=hz(note)
    y=(np.sin(2*np.pi*f*t)*np.exp(-t*.73)+.16*np.sin(2*np.pi*f*2.002*t)*np.exp(-t*1.6)+.05*np.sin(2*np.pi*f*3.991*t)*np.exp(-t*2.2))
    return y*(1-np.exp(-t*130))*np.minimum(1,(duration-t)/.15)

# Dadd9, Bm7, Gmaj7, Asus(add9), Em9, Gmaj7, D/F#, A6 ... voice-led.
chords=[(38,[50,57,61,64]),(35,[50,54,57,62]),(31,[47,54,57,62]),(33,[49,52,57,59]),
(40,[50,54,59,62]),(31,[47,54,57,62]),(30,[50,57,61,64]),(33,[49,54,57,62]),
(30,[49,54,57,61]),(35,[50,54,57,61]),(40,[50,54,59,62]),(31,[47,54,57,62]),
(33,[49,52,57,61]),(31,[47,54,57,62]),(38,[50,57,61,64]),(33,[49,52,57,59])]
# A deliberately composed, sparse phrase; None is a rest.
melody=[[(0,66,1),(1.6,69,.7),(2.7,76,.55)],[(.4,74,.8),(2.6,69,.6)],[(.15,71,.8),(2.2,66,.55)],[(.5,64,.6),(2.8,69,.6)],
[(.2,66,.8),(1.5,71,.6),(2.8,74,.6)],[(.35,73,.7),(2.2,71,.6)],[(.5,69,.7),(2.9,66,.5)],[(1.0,64,.6)],
[(.1,73,.7),(1.8,69,.6),(3,66,.5)],[(.4,74,.8),(2.5,73,.6)],[(.25,71,.75),(2.0,66,.6)],[(.3,69,.7),(2.4,71,.55)],
[(.5,73,.75),(2.7,76,.6)],[(.4,74,.7),(2.5,71,.6)],[(.2,69,.75),(1.8,66,.55)],[(1.2,64,.5)]]
print('Composing original 32-bar score...',flush=True)
for bar in range(32):
    root,voicing=chords[bar%16];at=bar*BAR; dynamic=.85 if bar<8 else 1 if bar<24 else .8
    # Hand-like voicing offsets and restrained arpeggiation.
    place(shallow,piano(root,7,.6),at,.11*dynamic,-.22)
    place(deep,pad(root,8.6,.6),at-1.3,.22,0.)
    for j,note in enumerate(voicing):
        place(shallow,piano(note,6.3,.8),at+.06*j,.068*dynamic,(j-1.5)*.13)
        place(shallow,pad(note,7.9),at-.9,.10*dynamic,(j-1.5)*.34)
        place(deep,pad(note-12 if j==0 else note,8.1,.72),at-1.2,.23,(j-1.5)*.32)
        if bar%2==0:
            place(shallow,piano(note+12,4.3,.5),at+1.83+j*.24,.035,(j-1.5)*.24)
    for step,note,vel in melody[bar%16]:
        # B section changes the register and omits notes; no 8-bar ostinato fatigue.
        if bar>=24 and step>2:continue
        n=note if bar<16 else note+(12 if 16<=bar<20 else 0)
        place(shallow,piano(n,7.2,vel),at+.5+step,.22*dynamic,np.sin(bar*.55)*.20)
        if step<.6 and bar%2==0:place(deep,bell(note-12,9),at+1.4,.034,np.cos(bar)*.6)
    if bar in [3,7,11,15,19,23,27,31]:
        place(shallow,bell(voicing[-1]+12),at+2.9,.023,.55)
    if bar%8==0:print(f'bar {bar}/32',flush=True)

# Warm damping and a deterministic, decorrelated 4.2s room tail.
for name,bus in [('shallows',shallow),('blue_silence',deep)]:
    for ch in range(2):
        irn=int(SR*4.2);tt=np.arange(irn)/SR
        ir=rng.normal(0,1,irn)*np.exp(-tt*1.75)
        ir=sosfilt(butter(2,3100,fs=SR,output='sos'),ir)
        ir[:int(SR*.038)]=0
        ir/=np.sqrt(np.sum(ir*ir))
        tail=fftconvolve(bus[:,ch],ir,'full')*.045
        wet=tail[:N].copy();wet[:len(tail)-N]+=tail[N:]
        bus[:,ch]=bus[:,ch]*.82+wet*(1. if name=='shallows' else 1.3)
        bus[:,ch]=sosfilt(butter(2,6300 if name=='shallows' else 3500,fs=SR,output='sos'),bus[:,ch])
    # moderate levels preserve headroom when equal-power crossfading both stems
    peak=float(np.max(np.abs(bus)));bus*=.50/max(peak,.001)
    wav=ROOT/'music'/f'{name}.wav';mp3=wav.with_suffix('.mp3')
    sf.write(wav,bus,SR,subtype='PCM_16')
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libmp3lame','-b:a','112k','-ar','24000','-metadata','title=Return to the Blue — '+name,'-metadata','comment=Original synthesized score; no samples or third-party melodies.',str(mp3)],check=True)
    print(name,mp3.stat().st_size,'bytes','RMS',float(np.sqrt(np.mean(bus*bus))),flush=True)
    wav.unlink()
(ROOT/'music'/'score.json').write_text(json.dumps({'title':'重返蔚藍 / Return to the Blue','duration_seconds':120,'tempo_bpm':64,'meter':'4/4','bars':32,'stems':['shallows.mp3','blue_silence.mp3'],'authorship':'Original procedural composition and synthesis for this project. No third-party audio, recordings, melodies, or soundfonts.','mix':'Equal-power crossfade by simulated depth; master and music controls independent from procedural ambience.'},ensure_ascii=False,indent=2))
