/* Actual high/low snailfish meshes and kind11 positions at the public story
 * boundary. CPU geometry evidence only; no rendered or physical-phone claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console}),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
for(const n of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna','trench_fauna','trench','individuals'])vm.runInContext(read(n),c,{filename:n+'.js'});
const get=s=>vm.runInContext(s,c),S=get('SPECIES'),sp=S.find(s=>s.id==='mariana_snailfish'),geometry=get('faunaGeometry'),project=get('project');
// Isolate the real trench population wrapper from unrelated reef populations.
// Both original snailfish still pass through production spawning and UID setup.
get('addLife=function(){}');vm.runInContext(read('trench_world'),c,{filename:'trench_world.js'});
const renderer={batches:[],batch(g,instances,kind,dynamic){const b={g,instances,kind,dynamic};this.batches.push(b);return b;}};
get('addLife')(renderer);get('initializeIndividuals')(renderer);
const fish=get('life').filter(f=>S[f.species]===sp),original=plain(fish.map(f=>({uid:f.uid,home:f.home,s:f.s}))),modes=[[1440,900],[390,844],[844,390]];
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/world-v0185-actors.json'),'utf8'));
vm.runInContext(read('story').split('const oceanStory=')[0],c,{filename:'story-rules.js'});const R=get('StoryRules');
function matrix(mode,f,distance=.75,fov=69){c.aspect=mode[0]/mode[1];c.fov=fov;c.cameraFixture=[f.p[0],f.p[1],f.p[2]+distance];c.targetFixture=f.p;return get('mm(perspective(fov*Math.PI/180,aspect,.16,950),lookAt(cameraFixture,targetFixture))');}
const pad=[0,.016,.033],smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Independent position-only transcription of kind11 rig3. Bank is not applied.
function deform(p,tag,phase,time,rate=sp.motionProfile.beat){p=p.slice();const beat=time*Math.max(.1,rate)+phase,w=1-smooth(-.5,.10,p[0]);p[2]+=Math.sin(beat+p[0]*5)*.033*w*w;if(tag>2.5&&tag<3.5&&p[0]>.05){const span=smooth(.10,.25,Math.abs(p[2]));p[1]+=Math.sin(beat*.72+Math.sign(p[2])*1.8)*.016*span;}return p;}
function transform(p,f){const cp=Math.cos(f.pitch||0),sn=Math.sin(f.pitch||0),cy=Math.cos(f.yaw||0),sy=Math.sin(f.yaw||0),x=(p[0]*cp-p[1]*sn)*f.s[0],y=(p[0]*sn+p[1]*cp)*f.s[1],z=p[2]*f.s[2];return [cy*x+sy*z+f.p[0],y+f.p[1],-sy*x+cy*z+f.p[2]];}
const meshes=[false,true].map(low=>({low,g:geometry(sp,low)})),animated=[];
for(const {low,g}of meshes){const vertices=new Map();for(let k=0;k<g.v.length;k+=12){const v=[...g.v.slice(k,k+3),g.v[k+11]];vertices.set(v.join(','),v);}for(const phase of [0,.7,Math.PI])for(const time of [0,1.1,4.7,9.3])animated.push({low,phase,time,points:[...vertices.values()].map(v=>deform(v.slice(0,3),v[3],phase,time))});}
let passed=0;function check(name,run){run();passed++;console.log('PASS '+name);}
check('the original 20cm kind11 snailfish can be fully framed in all three viewports',()=>{
 assert.equal(typeof R.animalInFrame,'function');assert.equal(sp.size,.20);assert.equal(sp.renderKind,11);
 assert.deepEqual(original.map(f=>f.uid),['mariana_snailfish-001','mariana_snailfish-002']);
 assert.equal(baseline.sourceCommit,'bc68a543368585f2b576c58cf3a5b6e8165554db');assert.deepEqual(original,baseline.actors.filter(f=>original.some(o=>o.uid===f.uid)).map(f=>({uid:f.uid,home:f.home,s:f.s})),'incumbent fish retain published identities, homes and metre scale');
 for(const f of fish)for(const mode of modes)assert(R.animalInFrame(f,sp,matrix(mode,f)),'RED: fully visible original '+f.uid+' rejected at '+mode);
 assert.deepEqual(plain(fish.map(f=>({uid:f.uid,home:f.home,s:f.s}))),original);
});
check('the conservative local padding encloses both real LODs through every tested animation phase',()=>{
 assert(meshes[1].g.v.length<meshes[0].g.v.length);const b=sp.modelBounds;
 // sin is bounded by one; both smoothstep factors are in [0,1]. The .001
 // existing margin also contains the low LOD's 0.000041-unit wider fin edge.
 for(const sample of animated)for(const p of sample.points)for(let k=0;k<3;k++)assert(p[k]>=b.min[k]-pad[k]-.001&&p[k]<=b.max[k]+pad[k]+.001,'LOD '+sample.low+' phase '+sample.phase+' time '+sample.time+' axis '+k);
});
check('accepted framing contains all animated vertices over yaw, pitch and scale in every viewport',()=>{
 let vertices=0;
 for(const mode of modes)for(const yaw of [0,.7,1.4])for(const pitch of [-.04,.04])for(const scale of [[.20,.20,.20],[.196,.20,.194]]){
  const f={...fish[0],s:scale,yaw,pitch,bank:.9};let near=.001,far=6;
  for(let i=0;i<23;i++){const distance=(near+far)/2;if(R.animalInFrame(f,sp,matrix(mode,f,distance)))far=distance;else near=distance;}
  const vp=matrix(mode,f,far+.002);assert(R.animalInFrame(f,sp,vp));assert.equal(R.animalInFrame({...f,bank:-.9},sp,vp),true,'kind11 does not rotate by bank');assert(far<sp.traits.observeDistance);
  for(const sample of animated)for(const p of sample.points){const screen=project(transform(p,f),vp);assert(screen[2]>.16&&Math.abs(screen[0])<.88&&Math.abs(screen[1])<.82,'accepted '+mode+' pose '+yaw+'/'+pitch+' LOD '+sample.low+' clips a real animated vertex');vertices++;}
 }
 console.log('  '+vertices+' deformed vertex projections; original fish remain 20cm');
});
check('each viewport rejects a centre-visible fish whose actual outline is cropped',()=>{
 for(const mode of modes){const f={...fish[0],p:fish[0].p.slice(),yaw:0,pitch:0},vp=matrix(mode,f,.55),mid=sp.modelBounds.min.map((v,k)=>(v+sp.modelBounds.max[k])*.5),screen=project(transform(mid,f),vp);f.p[0]+=(.86-screen[0])*screen[2]/vp[0];const centre=project(transform(mid,f),vp);assert(centre[2]>0&&Math.abs(centre[0])<.88&&Math.abs(centre[1])<.82);assert(animated.some(sample=>sample.points.some(p=>Math.abs(project(transform(p,f),vp)[0])>.88)),'real outline is cropped');assert.equal(R.animalInFrame(f,sp,vp),false);}
});
check('near-plane crossings, behind-camera subjects and malformed transforms are rejected',()=>{
 for(const mode of modes){const f={...fish[0],p:fish[0].p.slice(),yaw:0,pitch:0};assert.equal(R.animalInFrame(f,sp,matrix(mode,f,.17)),false);const vp=matrix(mode,f,.75);f.p[2]+=1;assert.equal(R.animalInFrame(f,sp,vp),false);assert.equal(R.animalInFrame({...fish[0],s:[NaN,.2,.2]},sp,vp),false);assert.equal(R.animalInFrame(fish[0],{...sp,modelBounds:null},vp),false);}
});
check('framing and real motion queries preserve original saved identity, home and physical scale',()=>{
 const pose=get('faunaMotionPose');for(const f of fish)for(const time of [0,14,90,300]){pose(f,time,f.p);for(const mode of modes)for(const fov of [55,69,90])assert(R.animalInFrame(f,sp,matrix(mode,f,.9,fov)));}
 assert.deepEqual(plain(fish.map(f=>({uid:f.uid,home:f.home,s:f.s}))),original);
});
console.log(passed+' hadal whole-animal framing checks passed (CPU only)');
