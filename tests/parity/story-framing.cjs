/* Actual model bounds, kind10 deformation and production camera matrices.
 * CPU observation-rule evidence only; this does not create a WebGL context. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console}),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
for(const n of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna'])vm.runInContext(read(n),c);
vm.runInContext(read('story').split('const oceanStory=')[0],c);
const R=vm.runInContext('StoryRules',c),species=vm.runInContext('ABYSS_SPECIES',c),geometry=vm.runInContext('faunaGeometry',c),project=vm.runInContext('project',c);
const modes=[[1440,900],[390,844],[844,390]],subjects=species.filter(s=>['coelacanth','giant_squid'].includes(s.id));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
const actor=(sp,d=Math.max(7,sp.size*3.2))=>({p:[0,-80,-d],s:[sp.size,sp.size,sp.size],yaw:0,pitch:0,bank:.4,effort:1,phase:.7,abyssBeat:sp.motionProfile.beat});
function matrix([width,height],fov=69){c.aspect=width/height;c.fov=fov;return vm.runInContext('mm(perspective(fov*Math.PI/180,aspect,.16,950),lookAt([0,-80,0],[0,-80,-1]))',c);}
function transform(p,f){const cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),x=(p[0]*cp-p[1]*sp)*f.s[0],y=(p[0]*sp+p[1]*cp)*f.s[1],z=p[2]*f.s[2];return [cy*x+sy*z+f.p[0],y+f.p[1],-sy*x+cy*z+f.p[2]];}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Independent position-only transcription of the current kind10 vertex rig.
function deformed(p,tag,sp,f,time){p=p.slice();const beat=time*Math.max(.1,f.abyssBeat)+f.phase,fin=tag>2.5&&tag<3.5,limb=tag>4.5&&tag<5.5;
 if(sp.id==='coelacanth'){const tail=1-smooth(-.50,.18,p[0]);p[2]+=Math.sin(beat+p[0]*3.4)*(.022+.013*f.effort)*tail*tail;if(fin&&Math.abs(p[2])>.09)p[1]+=Math.sin(beat*.67+Math.sign(p[2])*1.5)*.016*smooth(.09,.28,Math.abs(p[2]));}
 else if(sp.id==='giant_squid'){if(limb){const w=smooth(-.16,.45,p[0]),phase=beat+p[0]*9+p[2]*13;p[1]+=Math.sin(phase)*.013*w;p[2]+=Math.cos(phase*.81)*.009*w;}if(fin)p[1]+=Math.sin(beat*1.4+p[0]*15)*.007*smooth(.02,.09,Math.abs(p[2]));}
 else if(sp.id==='pelican_eel'){const w=1-smooth(-.52,.18,p[0]);p[2]+=Math.sin(beat+p[0]*7)*.055*w*w;}
 else if(sp.id==='humpback_anglerfish'){if(limb||tag>5.5){const h=Math.max(0,p[1]-.19);p[0]+=Math.sin(beat*.78)*.055*h;p[2]+=Math.cos(beat*.62)*.070*h;}if(fin)p[2]+=Math.sin(beat+p[0]*4)*.012;}
 else if(sp.id==='japanese_spider_crab'&&limb){const w=smooth(.065,.46,Math.abs(p[2])),gait=beat+p[0]*24+Math.sign(p[2])*1.5708;p[0]+=Math.sin(gait)*.009*w;p[1]+=Math.max(0,Math.cos(gait))*.010*w;}
 return transform(p,f);
}
check('public whole-animal framing rejects the old centre-only false positive in every viewport',()=>{
 assert.equal(typeof R.animalInFrame,'function','RED: expose the production whole-animal framing rule');
 for(const mode of modes)for(const sp of subjects){const vp=matrix(mode),f=actor(sp,sp.size*1.7),mid=sp.modelBounds.min.map((v,k)=>(v+sp.modelBounds.max[k])/2),screen=project(transform(mid,f),vp);f.p[0]+=(.75-screen[0])*screen[2]/vp[0];const old=project(transform(mid,f),vp);assert(old[2]>0&&Math.abs(old[0])<.88&&Math.abs(old[1])<.82,'old centre test passes');assert.equal(R.animalInFrame(f,sp,vp),false,sp.id+' '+mode+' cropped outline');}
});
check('all story subjects can fit at playable distances in desktop, portrait and landscape views',()=>{
 for(const mode of modes)for(const fov of [55,69,90])for(const sp of subjects)for(const yaw of [0,.6,1.2])for(const pitch of [-.1,0,.1]){const f=actor(sp);f.yaw=yaw;f.pitch=pitch;assert(f.p[2]*-1<sp.traits.observeDistance);assert(R.animalInFrame(f,sp,matrix(mode,fov)),sp.id+' '+mode+' fov '+fov+' pose '+yaw+'/'+pitch);}
});
check('accepted bounds contain both actual LODs and animated vertices at the closest accepted camera',()=>{
 for(const mode of modes)for(const sp of species){const meshes=[geometry(sp),geometry(sp,true)],vp=matrix(mode),f=actor(sp);f.s=[sp.size*.98,sp.size,sp.size*.97];for(const yaw of [0,.7,1.4])for(const pitch of [-.1,.1]){f.yaw=yaw;f.pitch=pitch;let near=.001,far=35;for(let i=0;i<20;i++){const mid=(near+far)/2;f.p[2]=-mid;if(R.animalInFrame(f,sp,vp))far=mid;else near=mid;}f.p[2]=-far-.001;assert(R.animalInFrame(f,sp,vp));for(const g of meshes)for(const time of [0,1.1,4.7,9.3])for(let k=0;k<g.v.length;k+=12){const s=project(deformed(g.v.slice(k,k+3),g.v[k+11],sp,f,time),vp);assert(s[2]>.16&&Math.abs(s[0])<.88&&Math.abs(s[1])<.82,sp.id+' actual deformed vertex outside accepted frame');}}}
});
check('near-plane crossing, behind-camera and malformed bounds cannot count as observation',()=>{
 const sp=subjects[0],vp=matrix(modes[0]),f=actor(sp);f.p[2]=-.17;assert(!R.animalInFrame(f,sp,vp));f.p[2]=2;assert(!R.animalInFrame(f,sp,vp));assert(!R.animalInFrame(actor(sp),{modelBounds:null},vp));assert(!R.animalInFrame({...actor(sp),s:[NaN,1,1]},sp,vp));
});
check('a clipped subject clears continuous story dwell while a fully framed real subject completes it',()=>{
 const sp=subjects[1],vp=matrix(modes[1]),f=actor(sp),s=R.sanitize({started:true,reports:4,step:1});const ctx=()=>({active:true,paused:false,occluded:false,inFrame:R.animalInFrame(f,sp,vp),player:[0,-80,0],target:f.p,speed:0,minimum:sp.size*.8,maximum:sp.traits.observeDistance});for(let i=0;i<20;i++)R.record(s,ctx(),.1);assert(s.elapsed>1);f.p[0]=10;R.record(s,ctx(),.1);assert.equal(s.elapsed,0);assert.equal(s.step,1);f.p[0]=0;for(let i=0;i<81;i++)R.record(s,ctx(),.1);assert(R.ready(s));
});
check('runtime species context uses full framing while fixed investigation targets retain their prior rule',()=>{
 let state=R.sanitize({started:true,reports:4,step:1});c.oceanFeatures={register(){},state:()=>state};c.active=true;c.photoOpen=false;c.modal=null;c.document={hidden:false};c.player={p:[0,-80,0],velocity:[0,0,0]};c.eye=[0,-80,0];c.renderer={vp:matrix(modes[1])};c.blocked=()=>false;
 const sp=subjects[1],f=actor(sp,sp.size*1.7),all=vm.runInContext('SPECIES',c);f.species=all.indexOf(sp);f.uid='giant_squid-001';c.subjectFixture=f;vm.runInContext('life.push(subjectFixture)',c);c.animalFocusPoint=x=>transform(sp.modelBounds.min.map((v,k)=>(v+sp.modelBounds.max[k])/2),x);c.OceanRegions={points:{'cave-strata':{p:[0,-80,-2]}}};vm.runInContext(read('story').slice(read('story').indexOf('const oceanStory=')),c);const runtime=vm.runInContext('oceanStory',c);
 assert.equal(runtime.context().inFrame,false,'portrait squid centre can fit while both ends are cut');f.p[2]=-25.6;assert.equal(runtime.context().inFrame,true);state=R.sanitize({started:true,reports:0,step:0});assert.equal(runtime.context().inFrame,true);
});
console.log(passed+' whole-animal story framing checks passed; CPU only, no GPU evidence');
