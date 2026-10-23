/* Drive the production photo call chain when regional readiness changes between
 * its asynchronous wait and its final render. Never label an older framebuffer. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),voyageSource=fs.readFileSync(path.join(root,'src/voyage.js'),'utf8');
const legacy=app.slice(app.indexOf('function takePhoto(){'),app.indexOf('function viewPhoto(')),wrapper=voyageSource.slice(voyageSource.indexOf('const legacyPhoto=takePhoto;'),voyageSource.indexOf('const legacyStart=startDive;'));
async function capture({blocked=false,reference=false,cameraCut=false}={}){
 const calls={ready:0,render:0,canvas:0,copy:0,grade:0,store:0,film:20,errors:[]};
 const ctx=vm.createContext({console,Date:{now:()=>10000},active:true,modal:null,photoOpen:false,lastPhoto:0,lastArea:0,LANDMARKS:[{name:'test-region'}],eye:[0,-8,0],target:[0,-8,-1],t:8,player:{p:[0,-8,0]},focusFish:null,follow:null,SPECIES:[],voyage:{photoBusy:false,importing:false},calls,setTimeout(){},clearTimeout(){},updateCamera(){},nextPhotoDate:()=>10000,toast:message=>calls.errors.push(message),oceanAudio:{cue(){}},oceanFeatures:{call(){}},$(){return {classList:{add(){},remove(){}}};},gradePhoto(){calls.grade++;return {score:80,metrics:{},subject:null,breakdown:''};},document:{createElement(){calls.canvas++;return {width:0,height:0,getContext:()=>({drawImage(){calls.copy++;},createLinearGradient:()=>({addColorStop(){}}),fillRect(){},fillText(){}}),toDataURL:()=> 'data:image/jpeg;base64,current-frame'};}},oceanPhotography:{canCapture:()=>true,capture:async()=>{calls.store++;calls.film--;return false;}},renderer:{canvas:{width:320,height:240},render(){calls.render++;return blocked?false:undefined;}}});
 ctx.renderer.sceneStream={ready:async()=>{calls.ready++;if(cameraCut){ctx.eye=[600,-7000,0];ctx.player.p=[600,-7000,0];}}};
 const code=reference?legacy.replace('if(renderer.render(eye,target,t)===false)return;','renderer.render(eye,target,t);'):legacy;
 vm.runInContext(code+'\n'+wrapper,ctx);await ctx.takePhoto();assert.equal(ctx.voyage.photoBusy,false,'Photo lock must release after every outcome');return calls;
}
(async()=>{
 const before=await capture({blocked:true,reference:true}),after=await capture({blocked:true});
 assert.equal(before.store,1,'Reference must expose stale-frame capture');assert.equal(before.film,19);
 assert.equal(after.ready,1);assert.equal(after.render,1);assert.equal(after.canvas,0);assert.equal(after.copy,0);assert.equal(after.grade,0);assert.equal(after.store,0);assert.equal(after.film,20);assert.deepEqual(after.errors,[]);
 console.log('PASS unavailable regional frame creates no image, grade, stored photo or film debit');
 const cut=await capture({blocked:true,cameraCut:true});assert.equal(cut.ready,1);assert.equal(cut.render,1);assert.equal(cut.copy,0);assert.equal(cut.store,0);assert.equal(cut.film,20);assert.deepEqual(cut.errors,[]);
 console.log('PASS a camera cut after readiness cannot capture the previous framebuffer');
 const ready=await capture();assert.equal(ready.canvas,1);assert.equal(ready.copy,1);assert.equal(ready.grade,1);assert.equal(ready.store,1);assert.equal(ready.film,19);assert.deepEqual(ready.errors,[]);
 console.log('PASS a rendered current frame retains the existing capture pipeline');
})().catch(error=>{console.error(error);process.exitCode=1;});
