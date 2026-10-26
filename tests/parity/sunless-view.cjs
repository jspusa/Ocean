/* Conservative solar-work eligibility at the production renderer seam.
 * No WebGL, pixel, perception or performance claim. The current render camera
 * uses lookAt's fixed world-up vector: 2*far bounds VERTICAL clip reach for
 * vertical FOV <=90 degrees, not radial distance at arbitrary aspect ratios.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console,performance});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine.js'),'utf8'),context,{filename:'engine.js'});
const classify=vm.runInContext('typeof oceanSunlessView === "function" ? oceanSunlessView : null',context);
assert.equal(typeof classify,'function','Production engine must expose oceanSunlessView before solar work can be skipped');
const lookAt=vm.runInContext('lookAt',context),perspective=vm.runInContext('perspective',context),multiply=vm.runInContext('mm',context),project=vm.runInContext('project',context);
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('the default view keeps solar work through the conservative boundary and immediately restores it on ascent',()=>{
 for(const y of [50,0,-.18,-700,-900,-1400,-3000,-3950,-4899.999])assert.equal(classify(y),false,'Solar work must remain at eye y='+y);
 assert.equal(classify(-4900),true);assert.equal(classify(-4900.001),true);assert.equal(classify(-7000),true);
 assert.equal(classify(-4899.999),false,'No stale deep-view classification after ascent');
 assert.equal(classify(-10),false,'Shallow return is effective on this call');
});
check('the far-plane contract scales instead of assuming that axial far is radial distance',()=>{
 for(const far of [.25,80,120,950,1800]){
  const boundary=3000+2*far;
  assert.equal(classify(-boundary+.001,far),false,'Not all potential receivers are certified at this boundary');
  assert.equal(classify(-boundary,far),true);
  assert.equal(classify(-boundary-.001,far),true);
 }
 assert.equal(classify(-4900,1800),false,'A farther clip plane invalidates the old default boundary');
});
check('invalid coordinates, clip planes and unsupported vertical FOV fail closed',()=>{
 for(const y of [NaN,Infinity,-Infinity,undefined,null,'-7000',{},[]])assert.equal(classify(y),false);
 for(const far of [NaN,Infinity,-Infinity,0,-950,null,'950',{},[],Number.MAX_VALUE])assert.equal(classify(-7000,far),false);
 for(const fov of [NaN,Infinity,-Infinity,0,-1,90.001,120,180,null,'69',{},[]])assert.equal(classify(-7000,950,fov),false);
 for(const fov of [12,46,55,67,69,75,90])assert.equal(classify(-4900,950,fov),true);
});
check('actual upright perspective corners remain below 3000 m across camera pitch, photo FOV and desktop/touch aspects',()=>{
 let cases=0,radialCounterexample=false;
 for(const far of [120,950,1800])for(const fov of [12,55,69,75,90])for(const aspect of [.25,390/844,1440/900,844/390,8])for(const pitch of [-1.55,-1,-Math.PI/4,0,Math.PI/4,1,1.55]){
  const eye=[0,-(3000+2*far),0],forward=[Math.cos(pitch)*.6,Math.sin(pitch),-Math.cos(pitch)*.8];
  const view=lookAt(eye,eye.map((n,i)=>n+forward[i])),right=[view[0],view[4],view[8]],up=[view[1],view[5],view[9]];
  const vp=multiply(perspective(fov*Math.PI/180,aspect,.16,far),view),halfHeight=far*Math.tan(fov*Math.PI/360);
  assert.equal(classify(eye[1],far,fov),true);assert(Math.abs(right[1])<1e-7,'The renderer contract is fixed world-up');
  for(const x of [-1,1])for(const y of [-1,1]){
   const corner=eye.map((n,i)=>n+forward[i]*far+right[i]*halfHeight*aspect*x+up[i]*halfHeight*y),ndc=project(corner,vp);
   assert(Math.abs(ndc[0]-x)<.0001&&Math.abs(ndc[1]-y)<.0001,'Corner must belong to the actual production perspective');
   assert(-corner[1]>=3000-.001,'An eligible view must not include shallow receivers');
   if(Math.hypot(...corner.map((n,i)=>n-eye[i]))>2*far)radialCounterexample=true;
  }
  cases++;
 }
 assert(radialCounterexample,'Wide screens demonstrate why 2*far is a vertical bound, not a sphere');
 console.log('  '+cases+' production perspective configurations, four far-plane corners each');
});
console.log(passed+' sunless-view CPU checks passed; native rendered equivalence remains separate');
