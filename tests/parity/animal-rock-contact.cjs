/* Real archived animals/stone, ordinary world updates, and independent mesh
 * witnesses. CPU contact tests do not establish native rendered acceptance. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const c=vm.createContext({console}),names=['engine','world','reef_detail','next_reef','individuals','open_world','trench','fauna','cetaceans','abyss_fauna','trench_fauna','fauna_world','cetacean_world','regions','abyss_world','trench_world','pelagic_life','reef_fauna','oarfish','frilled_shark','frilled_shark_world','barreleye','barreleye_world','tripod_fish','dumbo_octopus','abyss_community','rock_contact'];
const refAt=process.argv.indexOf('--individuals-ref'),reference=refAt>=0?process.argv[refAt+1]:null;
for(const n of names)vm.runInContext(n==='individuals'&&reference?require('node:child_process').execFileSync('git',['show',reference+':src/individuals.js'],{encoding:'utf8'}):fs.readFileSync('src/'+n+'.js','utf8'),c,{filename:n});
const raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),base=8+raw.readUInt32LE(4),header=JSON.parse(raw.subarray(8,base)),api=vm.runInContext('OceanRockContact',c);
const mesh=b=>({vertices:new Float32Array(raw.buffer,raw.byteOffset+base+b.vertexOffset,b.vertexFloats),indices:new Uint32Array(raw.buffer,raw.byteOffset+base+b.indexOffset,b.indexCount)});
const hash=m=>crypto.createHash('sha256').update(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)).update(Buffer.from(m.indices.buffer,m.indices.byteOffset,m.indices.byteLength)).digest('hex');
const known=new Map();for(let v=0;v<4;v++)for(const low of [false,true]){const g=c.rockGeometry(v,low);known.set(hash(c.indexGeometry(g.v)),g.rockContact);}const arch=c.archGeometry();known.set(hash(c.indexGeometry(arch.v)),{kind:'arch',closed:false,key:'arch'});
const entries=[];for(const b of header.batches){const actual=mesh(b),meta=known.get(hash(actual));if(meta)entries.push({...b,geometry:{indexed:actual,rockContact:meta},instances:b.instanceIDs.map(id=>header.nodes[id])});}
api.install(header.rockContact||api.createCatalogue(entries));c.header=header;
vm.runInContext('obstacles.push(...header.obstacles);life.push(...header.life.map(i=>header.nodes[i]));decorLife.push(...header.decorLife.map(i=>header.nodes[i]));shoal.push(...header.shoal.map(i=>header.nodes[i]));allLife=life.concat(decorLife);initializeIndividuals({batches:header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>header.nodes[i])}))});',c);
const actors=vm.runInContext('allLife',c),school=vm.runInContext('shoal',c);let checks=0;
function check(name,run){run();checks++;console.log('PASS '+name);}
if(process.argv.includes('--encounters')){
 const states={};c.voyage={state:{features:{},waypoint:null}};c.oceanFeatures={state:id=>states[id],register:feature=>{states[feature.id]=feature.initial();}};
 vm.runInContext(fs.readFileSync('src/encounters.js','utf8')+'\noceanEncounters.feature.init();',c,{filename:'encounters'});
}
if(process.argv.includes('--timings')){
 const windows=[];for(let i=0;i<30;i++)c.updateLife(10+i/60);api.resetQueryStats();const builds=api.status().builds;
 for(let j=0;j<5;j++){const start=performance.now();for(let i=0;i<30;i++)c.updateLife(20+(j*30+i)/60);windows.push((performance.now()-start)/30);}
 assert.equal(api.status().builds,builds);console.log(JSON.stringify({reference:reference||'working-tree',encounters:process.argv.includes('--encounters'),actors:actors.length,school:school.length,windowMs:windows,medianMs:windows.slice().sort((a,b)=>a-b)[2],contactWork:api.status()},null,2));process.exit(0);
}
const envelope=vm.runInContext('animalContactEnvelope',c),supported=vm.runInContext('supportedAnimal',c),floor=vm.runInContext('animalContactFloor',c);
check('actual tang-006 center clears the compiled reef wall on its initial world update',()=>{
 c.updateLife(0);const f=actors.find(f=>f.uid==='tang-006');assert(f);assert(!api.overlaps(f.p),'actual route is inside the rendered rock at '+f.p);
});
check('all swimming bodies, decorative fish and shoal clear stone and the supported seabed on first placement',()=>{
 for(const f of [...actors,...school]){if(supported(f))continue;const h=envelope(f);assert(!api.overlaps(f.p,h.radius),f.uid+' body intersects rock');assert(f.p[1]>=floor(f,h,f.p)-1e-6,f.uid+' is below the seabed');assert(f.p.every(Number.isFinite));}
});
check('continuous actual world updates have no full-body rock penetration or sudden contact jumps',()=>{
 let maxStep=0,witness=null;
 for(let frame=1;frame<=120;frame++){const before=new Map([...actors,...school].map(f=>[f,f.p.slice()]));c.updateLife(frame/60);
  for(const f of [...actors,...school]){if(supported(f))continue;const old=before.get(f),step=Math.hypot(...f.p.map((v,i)=>v-old[i]));if(step>maxStep){maxStep=step;witness=f.uid;}
   assert(step<.20,f.uid+' makes an excessive 60 Hz step: '+step);if(frame%15===0){const h=envelope(f);assert(!api.overlaps(f.p,h.radius),f.uid+' body intersects at frame '+frame);assert(f.p[1]>=floor(f,h,f.p)-.025,f.uid+' is below terrain at frame '+frame);}
  }
 }console.log('  largest normal 60 Hz step '+maxStep.toFixed(5)+' m ('+witness+')');
});
const poseSnapshot=()=>crypto.createHash('sha256').update(JSON.stringify([...actors,...school].map(f=>[f.uid,f.p,f.yaw,f.pitch,f.bank]))).digest('hex');
check('repeated timestamps and rewound snapshots reproduce the actual contact pose',()=>{
 c.updateLife(17);const at17=poseSnapshot();c.updateLife(17+1/60);const repeated=poseSnapshot();c.updateLife(17+1/60);assert.equal(poseSnapshot(),repeated,'same-time update changed pose');
 c.updateLife(600);c.updateLife(17);assert.equal(poseSnapshot(),at17,'rewind depends on prior wall contact');
});
check('actual compiled fish, shoal and turtle vertices stay inside their conservative moving-body envelopes',()=>{
 const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};let sampled=0;
 for(const b of header.batches.filter(b=>b.dynamic&&(b.kind===1||b.kind===2))){const geometry=mesh(b),instances=b.instanceIDs.map(i=>header.nodes[i]),representatives=[instances.reduce((a,f)=>(a.bioMorph?.[0]||1)*(a.bioMorph?.[2]||1)>(f.bioMorph?.[0]||1)*(f.bioMorph?.[2]||1)?a:f),instances.reduce((a,f)=>(a.bioMorph?.[1]||1)>(f.bioMorph?.[1]||1)?a:f)];
  for(const f of new Set(representatives))for(const time of [0,.17,.73,1.81,3.9,8.4]){const radius=envelope(f).radius,m=f.bioMorph||[1,1,1,1],phase=f.phase||0,scale=Math.max(...f.s);
   for(let k=0;k<geometry.vertices.length;k+=12){let [x,y,z]=geometry.vertices.subarray(k,k+3);const tag=geometry.vertices[k+11];
    if(b.kind===1){y*=m[0];z*=m[1];const tail=1-smooth(-.70,-.29,x);y*=1+(m[2]-1)*tail;const beat=time*4.2*m[3]+phase,w=1-smooth(-.77,.25,x);z+=Math.sin(beat+x*4.8)*.096*w*w;if(tag>2.5&&tag<3.5)z+=Math.sin(beat*1.36+x*7)*.025*Math.abs(y);z+=Math.sign(z)*Math.exp(-(((x-.23)*15)**2))*smooth(.03,.10,Math.abs(z))*.0028*Math.sin(time*(2.7+(f.bioGenes?.[0]||0))+phase);}
    else if(tag>1.5&&tag<2.5){const w=smooth(.51,1.45,Math.abs(z)),beat=time*1.45+phase;y+=Math.sin(beat-Math.abs(z)*.7)*.37*w;x-=w*.07*Math.cos(beat);}
    assert(Math.hypot(x,y,z)*scale<=radius+1e-6,f.uid+' actual mesh escapes its bound at '+time);sampled++;
   }
  }
 }console.log('  '+sampled+' actual vertex/phase envelope samples');
});
check('every actual cetacean vertex fits at maximum tail bend and maximum one-sided handshake',()=>{
 let samples=0,slack=Infinity;
 for(const b of header.batches.filter(b=>b.dynamic&&b.kind===9)){const geometry=mesh(b),instances=b.instanceIDs.map(i=>header.nodes[i]);
  for(const f of instances){const radius=envelope(f).radius,scale=Math.max(...f.s);
   for(let k=0;k<geometry.vertices.length;k+=12){const [x,y,z]=geometry.vertices.subarray(k,k+3),tag=geometry.vertices[k+11],u=Math.max(0,Math.min(1,(x+.48)/.58)),tail=1-u*u*(3-2*u),pectoral=tag>2.5&&tag<3.5&&x>-.24?Math.max(0,Math.abs(z)-.055)*.82:0;
    // Independent phase-free worst case: add absolute vertical excursions,
    // including the full gesture even on the ungestured side. Bank/pitch/yaw
    // preserve the local norm; maximum instance scale bounds every rotation.
    const maximum=Math.hypot(x,Math.abs(y)+.073*tail*tail+pectoral,z)*scale;slack=Math.min(slack,radius-maximum);assert(maximum<=radius+1e-6,f.uid+' maximum gesture escapes body contact');samples++;
   }
  }
 }assert(samples>0);console.log('  '+samples+' cetacean vertices, minimum radius slack '+slack.toFixed(5)+' m');
});
check('known supported fauna retain their actual habitat pose and immutable support identities',()=>{
 const anchored=actors.filter(supported);assert(anchored.length>0);const pose=vm.runInContext('faunaMotionPose',c);
 for(const time of [0,60,180,300]){c.updateLife(time);for(const f of anchored){const before=JSON.stringify([f.home,f.s,f.uid]),copy=structuredClone(f);pose(copy,time,copy.p,{react:false});assert.deepEqual(Array.from(f.p),Array.from(copy.p),f.uid+' moved off its authored support');assert.equal(JSON.stringify([f.home,f.s,f.uid]),before);assert(!api.overlaps(f.p),f.uid+' support center is inside stone');}}
});
check('long jumps recover valid whole bodies without depending on the last contact direction',()=>{
 for(const time of [17,600,7000,0]){c.updateLife(time);for(const f of [...actors,...school]){if(supported(f))continue;const h=envelope(f);assert(!api.overlaps(f.p,h.radius),f.uid+' intersects rock after jump to '+time);assert(f.p[1]>=floor(f,h,f.p)-1e-6,f.uid+' below floor after jump to '+time);}}
});
check('a new encounter epoch invalidates old contact history even at the same timestamp',()=>{
 const f=actors.find(f=>f.uid==='turtle-001'),original=f.orbit,epoch=f.encounterEpoch;
 c.updateLife(8);f.orbit+=1.3;f.encounterEpoch=901337;c.updateLife(8);const moved=Array.from(f.p);
 c.initializeIndividuals({batches:header.batches.map(b=>({...b,instances:b.instanceIDs.map(i=>header.nodes[i])}))});c.updateLife(8);assert.deepEqual(Array.from(f.p),moved,'entry boundary retained old contact trajectory');
 f.orbit=original;if(epoch===undefined)delete f.encounterEpoch;else f.encounterEpoch=epoch;
});
check('steady full-world contact keeps its BVHs and bounded local triangle work',()=>{
 for(let i=0;i<30;i++)c.updateLife(20+i/60);const builds=api.status().builds;api.resetQueryStats();
 for(let i=0;i<150;i++)c.updateLife(20.5+i/60);const work=api.status();assert.equal(work.builds,builds);assert(work.triangles/150<6000,'excessive per-frame triangle work: '+work.triangles/150);console.log('  steady contact '+(work.queries/150).toFixed(1)+' queries / '+(work.triangles/150).toFixed(1)+' triangles per frame');
});
console.log(checks+' animal rock contact checks passed');
