/* Production selection/occlusion seams with an independent, four-metre rod
 * fixture. A 90-degree camera at z=0 and an 800 px square make known points at
 * z=-4 project 100 px per metre; expected hit coordinates are literal fixtures,
 * not values obtained from selection.disc/pick or its capsule implementation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8');
const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),toggle(v,on){if(on===undefined)on=!values.has(v);on?values.add(v):values.delete(v);return on;}};};
function fixture(){
 const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,{style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:classes(),textContent:'',getBoundingClientRect:()=>({left:0,top:0,width:800,height:800})});return elements.get(id);};
 const c=vm.createContext({console,performance:{now:()=>100},document:{hidden:false,body:{classList:classes()},getElementById:node},active:true,modal:null,photoOpen:false,focusFish:null,focusId:null,focusSeconds:0,follow:null,auto:false,eye:[0,-5,0],player:{p:[0,-5,0],yaw:0,pitch:0},settings:{hints:true},voyage:{photoMode:false},renderer:{fov:90},matchMedia:()=>({matches:false}),oceanFeatures:{pointerCaptured:()=>false},stopAuto(){c.auto=false;}});
 for(const name of ['engine','world','fauna'])vm.runInContext(read(name),c,{filename:name+'.js'});
 vm.runInContext(read('fauna_world').match(/function animalFocusPoint\(f\)\{[\s\S]*?(?=\nfunction faunaHabitatGeometry)/)[0],c);
 const app=read('app');vm.runInContext(app.match(/function reefObstacleCandidates\([\s\S]*?(?=\nfunction dir)/)[0]+'\n'+app.match(/function blocked\([\s\S]*?(?=\nfunction observe)/)[0],c);
 vm.runInContext("SPECIES.push({id:'oarfish',name:'Oarfish fixture',fauna:true,size:4,bodyLength:1,traits:{motion:'hover',observeDistance:18,contactDistance:2,targetRadius:1.5,feedable:false,grabbable:false}});renderer.vp=mm(perspective(Math.PI/2,1,.16,100),lookAt(eye,[0,-5,-1]));",c);
 vm.runInContext(read('selection'),c,{filename:'selection.js'});
 const selection=vm.runInContext('oceanSelection',c),life=vm.runInContext('life',c),obstacles=vm.runInContext('obstacles',c),species=vm.runInContext('SPECIES.length-1',c);
 const f={uid:'oarfish-001',species,fauna:true,p:[0,-5,-4],s:[4,4,4],modelCenter:[0,0,0],yaw:0,pitch:Math.PI/2,faunaVisibility:1};life.push(f);
 function ecology(){
  let hooks,state;c.oceanFeatures.register=value=>{hooks=value;};c.oceanFeatures.state=()=>state;c.persistent={seen:[]};c.voyage.state={};c.saveVoyage=()=>{};c.setCount=()=>{};
  vm.runInContext(read('ecology'),c,{filename:'ecology.js'});state=hooks.initial();
  vm.runInContext(app.match(/function observe\(dt\)\{[\s\S]*?(?=\nfunction checkLandmarks)/)[0],c);
  return {api:vm.runInContext('oceanEcology',c),hooks,state,step(seconds){for(let t=0;t<seconds;t+=.1){c.observe(.1);hooks.tick(.1);}}};
 }
 return {c,selection,f,life,obstacles,node,ecology,run:code=>vm.runInContext(code,c)};
}
let total=0;function check(name,fn){fn(fixture());total++;console.log('PASS '+name);}
check('An upright four-metre oarfish can be pointed at its visible head, middle and tail',({selection,f})=>{
 for(const y of [210,400,590])assert.equal(selection.pick(400,y),f,'Visible body at y='+y+' must select the same individual');
 assert.equal(selection.pick(490,210),null,'Blank water beside the narrow fish is not its body');
});
check('A visible portion remains selectable when the centre leaves the frame, with an on-screen marker',({selection,f,node})=>{
 f.p=[0,-10,-4];assert.equal(selection.pick(400,710),f,'The head is visible at the bottom although the centre is below the viewport');
 assert(selection.select(f.uid));selection.paint();const marker=node('selectionMarker');
 assert(!marker.classList.contains('hidden'));assert(Number.parseFloat(marker.style.top)>690&&Number.parseFloat(marker.style.top)<800,'The marker follows the visible body rather than the offscreen centre');
 selection.clear();f.pitch=0;f.p=[5,-5,-4];assert.equal(selection.pick(710,400),f,'The tail remains visible when the centre leaves the right edge');
});
check('A body crossing the near plane selects only its rendered forward portion',({selection,f})=>{
 f.pitch=0;f.yaw=Math.PI/2;f.p=[.2,-5,.5];
 assert.equal(selection.pick(500,400),f,'Part of the rod lies ahead of the camera even with its centre behind it');
 assert.equal(selection.pick(300,400),null,'The mirrored projection of the part behind the eye is not selectable');
 f.p=[0,-5,3];assert(!selection.valid(f));assert.equal(selection.pick(400,400),null,'Entirely behind the camera');
 f.yaw=0;f.pitch=Math.PI/2;f.p=[0,-5,-.08];assert(!selection.valid(f));assert.equal(selection.pick(400,400),null,'Entirely between the eye and the real 0.16 m near plane');
});
check('Picking tests the pointed body portion for real reef occlusion, while an exposed portion stays usable',({selection,f,obstacles,node,run})=>{
 obstacles.push({p:[0,-4.05,-2],s:[.2,.25,.22]});
 assert.equal(selection.pick(400,210),null,'A rock in front of the head must prevent selection even with a clear centre');
 assert.equal(selection.pick(400,590),f,'The unoccluded tail remains selectable');
 obstacles[0]={p:[0,-5,-2],s:[.2,.3,.22]};run('reefObstacleCandidates.invalidate()');
 assert.equal(selection.pick(400,400),null,'A hidden middle cannot borrow the visible head line of sight');
 assert.equal(selection.pick(400,210),f);assert(selection.select(f.uid),'An exposed head remains selectable when the centre is behind a rock');
 selection.paint();assert(Math.abs(Number.parseFloat(node('selectionMarker').style.top)-400)>70,'The marker anchors to visible flesh, not the occluded middle');
 obstacles[0]={p:[0,-5,-2],s:[2,3,.5]};run('reefObstacleCandidates.invalidate()');
 assert.equal(selection.pick(400,210),null);assert.equal(selection.target(),null,'A complete obstruction clears the target');
});
check('An angled body uses the actual pointed ray rather than a screen-linear depth approximation',({selection,f,obstacles})=>{
 // This 45-degree rod passes through [0,-5,-4]. At x=500 its actual body point
 // is [0.8,-5,-3.2], so the eye ray passes [0.4,-5,-1.6].
 f.pitch=0;f.yaw=Math.PI/4;obstacles.push({p:[.4,-5,-1.6],s:[.08,.3,.08]});
 assert.equal(selection.pick(500,400),null,'A narrow rock on that known ray occludes the body');
 assert.equal(selection.pick(350,400),f,'The other side of the same fish remains exposed');
});
check('All existing circle picking and desktop/touch minimum target sizes are unchanged',({selection,f,c})=>{
 f.species=0;f.fauna=false;assert.equal(selection.pick(400,400),f);assert.equal(selection.pick(400,210),null);
 assert(Math.abs(selection.disc(f).r-35)<1e-10);f.p=[0,-5,-16];assert.equal(selection.disc(f).r,14);
 c.matchMedia=()=>({matches:true});assert.equal(selection.disc(f).r,22);assert.equal(selection.pick(421,400),f);assert.equal(selection.pick(423,400),null);
});
check('Distance, unavailable actors, modal exclusion and both camera/diver occlusion stay enforced',({selection,f,c,obstacles})=>{
 f.p=[0,-5,-19];assert.equal(selection.pick(400,400),null);assert(!selection.select(f.uid));f.p=[0,-5,-4];
 for(const [key,value]of [['ecologyPresent',false],['retreat',1],['faunaVisibility',.5]]){const old=f[key];f[key]=value;assert.equal(selection.pick(400,210),null);f[key]=old;}
 for(const key of ['modal','photoOpen']){c[key]=true;assert.equal(selection.pick(400,210),null);c[key]=null;}
 c.player.p=[0,-5,4];obstacles.push({p:[0,-5,2],s:[3,5,.5]});assert.equal(selection.pick(400,210),null,'A clear camera ray cannot bypass an obstruction between the diver and fish');
});
check('Hovering and picking do not select, award progress or move the camera; explicit selection still takes control',({selection,f,c})=>{
 c.auto=true;c.persistent={seen:[]};const before=JSON.stringify(c.player);selection.hover(400,210);assert.equal(selection.pick(400,210),f);
 assert.equal(selection.target(),null);assert.equal(c.focusFish,null);assert.equal(c.auto,true);
 assert(selection.select(f.uid,'pointer'));assert.equal(selection.target(),f);assert.equal(c.auto,false);assert.equal(selection.snapshot().source,'pointer');
 assert.equal(JSON.stringify(c.player),before);assert.equal(JSON.stringify(c.persistent),'{"seen":[]}');selection.clear();assert.equal(selection.target(),null);
});
check('A real narrow rock opening retains the exact successful pointed portion for selection and its marker',({selection,f,obstacles,node})=>{
 // A vertical wall of small overlapping rocks has one 16 cm body-view opening
 // on the known y=-4.2 sightline. No selection-generated points define it.
 for(let i=0;i<=24;i++)if(i!==16)obstacles.push({p:[0,-6.2+i*.1,-2],s:[.065,.065,.065]});
 assert.equal(selection.pick(400,320),f,'The known open sightline hits real exposed body');
 assert(selection.select(f.uid),'Selecting must retain the successful body hit, even within a narrow opening');
 selection.paint();assert(Math.abs(Number.parseFloat(node('selectionMarker').style.top)-320)<2,'Marker stays on the exposed point');
 obstacles.push({p:[0,-4.6,-2],s:[.065,.065,.065]});assert.equal(selection.target(),null,'New occlusion invalidates the remembered point immediately');
});
check('Normal observation and photo credit use the visible selected body, without relaxing physical contact',({selection,f,c,ecology,obstacles})=>{
 const e=ecology();f.p=[0,-10,-4];assert.equal(selection.pick(400,710),f);assert(selection.select(f.uid));
 e.step(1.6);assert(c.persistent.seen.includes('oarfish'),'The normal observation timer must unlock the partly visible fish');
 assert.equal(e.api.knowledge(e.state.field.oarfish),1);assert(e.state.individuals[f.uid].seconds>=1.2);assert(!e.api.inRange(f,true),'Physical contact retains its old distance and centre rules');
 const photo={individual:f.uid};e.hooks.photoMetadata(photo);assert.equal(photo.knowledgeEligible,true);e.hooks.onPhoto(photo);assert.equal(e.state.field.oarfish.photos,1);
 obstacles.push({p:[0,-6.5,-2],s:[3,3,1]});const points=e.state.field.oarfish.points;e.step(1.6);assert.equal(e.state.field.oarfish.points,points,'A now-hidden fish cannot continue earning observation credit');
 const hiddenPhoto={individual:f.uid};e.hooks.photoMetadata(hiddenPhoto);assert.equal(hiddenPhoto.knowledgeEligible,false);e.hooks.onPhoto(hiddenPhoto);assert.equal(e.state.field.oarfish.photos,1);
});
check('The same observation lifecycle works through a real opening with the animal centre occluded',({selection,f,c,ecology,obstacles})=>{
 const e=ecology();for(let i=0;i<=24;i++)if(i!==16)obstacles.push({p:[0,-6.2+i*.1,-2],s:[.065,.065,.065]});
 e.step(1.6);assert.equal(c.persistent.seen.length,0,'A visible but unselected fish grants no automatic discovery');
 assert.equal(selection.pick(400,320),f);assert(selection.select(f.uid));e.step(1.6);
 assert(c.persistent.seen.includes('oarfish'));assert.equal(e.api.knowledge(e.state.field.oarfish),1);assert(!e.api.inRange(f,true));
 const photo={individual:f.uid};e.hooks.photoMetadata(photo);assert.equal(photo.knowledgeEligible,true);
});
console.log(total+' oarfish selection behavior checks passed');
