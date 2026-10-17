/* Calendar/presence contracts and production guide controls; no GPU required. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console});vm.runInContext(fs.readFileSync('src/seasons.js','utf8'),c);const rules=vm.runInContext('OceanSeasonRules',c);let count=0;
const plain=x=>JSON.parse(JSON.stringify(x));function check(name,fn){fn();count++;console.log('PASS '+name)}
check('legacy day has one deterministic date independent of the computer clock',()=>{assert.deepEqual(plain(rules.date(1)),{year:1,month:6,day:1,season:'summer',seasonName:'夏'});assert.equal(rules.date(93).month,9);assert.equal(rules.date(184).month,12);assert.deepEqual(plain(rules.date(215)),{year:2,month:1,day:1,season:'winter',seasonName:'冬'})});
check('calendar traverses month ends, year ends and the leap day',()=>{assert.equal(rules.date(30).day,30);assert.equal(rules.date(31).month,7);assert.equal(rules.date(944).year,3);assert.deepEqual(plain(rules.date(1004)),{year:4,month:2,day:29,season:'winter',seasonName:'冬'});assert.equal(rules.date(1005).month,3)});
check('nonfinite and out-of-range calendar inputs stay bounded',()=>{for(const v of [NaN,Infinity,undefined,-20,0])assert.equal(rules.date(v).day,1);assert.deepEqual(plain(rules.date(1e20)),plain(rules.date(9999)))});
check('next season always advances to its actual boundary',()=>{assert.equal(rules.daysToSeason(1),92);assert.equal(rules.daysToSeason(92),1);assert.equal(rules.daysToSeason(93),91);assert.equal(rules.date(184+rules.daysToSeason(184)).season,'spring')});
check('cold-water species never become wild tropical-reef visitors in any season',()=>{for(const id of ['beluga','white_sided_dolphin','commerson_dolphin'])for(const day of [1,93,184,274]){assert.equal(rules.available(id,day,540),false);assert.equal(rules.nextWindow(id,day,540),null);}for(const id of ['whale','turtle','dolphin','coelacanth','giant_squid','humpback_anglerfish'])for(const day of [1,93,184,274])assert(rules.available(id,day,30))});
check('night visitor crosses midnight, with exact entry and departure boundaries',()=>{for(const m of [1080,1290,0,359.999])assert(rules.available('nautilus',1,m));for(const m of [360,540,1079.999])assert(!rules.available('nautilus',1,m))});
check('night encounter windows remain useful without inventing seasonal polar arrivals',()=>{assert.deepEqual(plain(rules.nextWindow('nautilus',1,540)),{day:1,minute:1080});assert.deepEqual(plain(rules.nextWindow('nautilus',1,1290)),{day:1,minute:1290});assert.equal(rules.nextWindow('beluga',1,540),null);assert.equal(rules.nextWindow('white_sided_dolphin',184,540),null)});
check('ship visits depend on calendar season and first dive, not alternating day parity',()=>{assert.equal(rules.visitor(1,0),null);assert.equal(rules.visitor(1,1),'seal');assert.equal(rules.visitor(2,1),'seal');assert.equal(rules.visitor(93,1),'penguin')});
const sceneState={day:1,minute:540};Object.assign(c,{active:false,life:[],SPECIES:[{id:'beluga'},{id:'white_sided_dolphin'},{id:'nautilus',bodyLength:1},{id:'coelacanth'}],voyage:{state:{features:{ecology:{partners:[]}}}},oceanFeatures:{state:()=>sceneState},player:{p:[0,-5,0],velocity:[0,0,0]},eye:[0,-5,0],V:{dist:(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]))}});
const seasons=vm.runInContext('oceanSeasons',c);for(let i=0;i<4;i++)c.life.push({uid:c.SPECIES[i].id+'-001',species:i,p:[i,-5,-1],s:[1,1,1],fauna:true,faunaVisibility:1,retreat:0});
check('world presence preserves identities, positions, body scales and saved knowledge',()=>{const before=c.life.map(f=>JSON.stringify([f.uid,f.p,f.s]));seasons.sync(true);assert.deepEqual(c.life.map(f=>f.ecologyPresent),[false,false,false,true]);assert.deepEqual(c.life.map(f=>JSON.stringify([f.uid,f.p,f.s])),before)});
check('close-view animals do not pop out or materialize at a clock boundary',()=>{sceneState.minute=1290;seasons.sync(true);assert(c.life[2].ecologyPresent);c.active=true;sceneState.minute=540;seasons.sync();assert(c.life[2].ecologyPresent);assert(seasons.snapshot().pending.includes('nautilus-001'));c.player.p=[100,-5,0];c.eye=[100,-5,0];seasons.sync();assert.equal(c.life[2].ecologyPresent,false);sceneState.minute=1290;c.player.p=[2,-5,-1];c.eye=[2,-5,0];seasons.sync();assert.equal(c.life[2].ecologyPresent,false);c.player.p=c.eye=[100,-5,0];seasons.sync();assert(c.life[2].ecologyPresent)});
check('explicitly owned cold-water companions remain available while wild conspecifics stay absent',()=>{c.active=false;c.voyage.state.features.ecology.partners=[{uid:'beluga-001'}];seasons.sync(true);assert(c.life[0].ecologyPresent);assert.equal(c.life[1].ecologyPresent,false);assert.equal(c.life[0].faunaVisibility,1);c.voyage.state.features.ecology.partners=[];seasons.sync();assert.equal(c.life[0].ecologyPresent,false)});

check('cold-water guide hints never promise an unreachable next-season encounter',()=>{for(const id of ['beluga','white_sided_dolphin','commerson_dolphin']){assert.match(seasons.hint(id),/不在這片暖水海域自然出現/);assert(!/下次|日曆已到上限|附近仍有/.test(seasons.hint(id)));}});
check('every retained cold-water companion keeps its identity and explicit availability',()=>{const original=c.life,oldSpecies=c.SPECIES;c.active=false;c.SPECIES=[{id:'beluga'},{id:'white_sided_dolphin'},{id:'commerson_dolphin'}];c.life=c.SPECIES.map((sp,i)=>({uid:sp.id+'-001',species:i,p:[0,-8,-20],s:[1,1,1],wildHabitat:false}));const identities=c.life.map(f=>f.uid);c.voyage.state.features.ecology.partners=c.life.map(f=>({uid:f.uid}));seasons.sync(true);assert(c.life.every(f=>f.ecologyPresent));assert.deepEqual(c.life.map(f=>f.uid),identities);c.voyage.state.features.ecology.partners=[];seasons.sync(true);assert(c.life.every(f=>!f.ecologyPresent));assert.deepEqual(c.life.map(f=>f.uid),identities);c.life=original;c.SPECIES=oldSpecies;seasons.sync(true);});
vm.runInContext(fs.readFileSync('src/engine.js','utf8'),c);const Renderer=vm.runInContext('Renderer',c);Object.assign(c,{BIO_NEUTRAL:[1,1,1,1],BIO_DEFAULT:[.5,.5,.5,.5]});const fakeRenderer={mobile:false,quality:2,gl:{ARRAY_BUFFER:1,bindBuffer(){},bufferSubData(){} }};
check('the actual render collector culls absent world actors in high, low and shadow passes while keeping exhibits',()=>{for(const shadow of [false,true]){const b={data:new Float32Array(72),instances:[c.life[0],c.life[3],{p:[0,-4,0],s:[1,1,1],exhibit:{cell:0}}],kind:9};Renderer.prototype.updateBatch.call(fakeRenderer,b,null,null,shadow);assert.equal(b.drawCount,2);assert.equal(b.data[0],c.life[3].p[0]);}});
const voyageSource=fs.readFileSync('src/voyage.js','utf8');vm.runInContext(voyageSource.slice(voyageSource.indexOf('function gradePhoto(){'),voyageSource.indexOf('function recordPhotoProgress(')),c);Object.assign(c,{renderer:{vp:[],fov:69},animalFocusPoint:f=>f.p,project:()=>[0,0,1],blocked:()=>false,speciesTraits:()=>({observeDistance:20})});const grade=vm.runInContext('gradePhoto',c);
check('photography cannot grade an absent actor even when its old location fills the frame',()=>{c.life=[{uid:'nautilus-001',species:2,p:[0,-5,-1],s:[.19,.19,.19],fauna:true,faunaVisibility:1,retreat:0,ecologyPresent:false}];c.eye=[0,-5,0];assert.equal(grade().subject,null);c.life[0].ecologyPresent=true;assert.equal(grade().subject.uid,'nautilus-001');});

check('nearby arrivals complete when their entire body is outside the camera view',()=>{c.active=false;sceneState.minute=540;seasons.sync(true);c.active=true;c.player.p=[0,-5,0];c.eye=[0,-5,0];c.renderer={vp:[],fov:69,width:1440,height:900};c.project=()=>[0,0,5];sceneState.minute=1290;seasons.sync();assert.equal(c.life[0].ecologyPresent,false);assert.match(seasons.hint('nautilus'),/環視/);c.project=()=>[3,0,5];seasons.sync();assert.equal(c.life[0].ecologyPresent,true);assert.match(seasons.hint('nautilus'),/目前可尋找/);});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function voyageDestination('),voyageSource.indexOf('function markPlace(')),c);
check('the guide does not mark hidden cold habitats but can locate an owned companion',()=>{
 c.SPECIES=[{id:'beluga',name:'白鯨',wildHabitat:false},{id:'blue_whale',name:'藍鯨',pelagic:true,size:26}];
 c.life=[{uid:'beluga-001',species:0,p:[16,-8,12],home:[-145,-10,44],ecologyPresent:false},{uid:'blue_whale-001',species:1,p:[580,-38,-220],home:[535,-38,-205],radius:92}];
 c.voyage.state.features.ecology.partners=[];const destination=vm.runInContext('voyageDestination',c);
 assert.equal(destination('habitat:beluga'),null);const offshore=destination('habitat:blue_whale');assert.equal(offshore.x,580);assert.equal(offshore.z,-220);assert(offshore.radius>=8&&offshore.radius<=18);assert.match(offshore.name,/巡游方位/);
 c.voyage.state.features.ecology.partners=[{uid:'beluga-001'}];c.life[0].ecologyPresent=true;const companion=destination('habitat:beluga');assert.equal(companion.x,16);assert.equal(companion.z,12);assert.match(companion.name,/夥伴/);
});
vm.runInContext(voyageSource.slice(voyageSource.indexOf('function markPlace('),voyageSource.indexOf('renderMap=function(){')),c);
check('an explicitly marked pelagic route follows the animal without moving the swimmer',()=>{
 const before=plain(c.player.p),actor=c.life[1],actorBefore=plain(actor.p);let saved=0;c.saveVoyage=()=>saved++;c.closePanel=()=>{};c.toast=()=>{};
 const mark=vm.runInContext('markPlace',c),destination=vm.runInContext('voyageDestination',c);c.voyage.state.waypoint=null;
 destination('habitat:blue_whale');assert.equal(c.voyage.state.waypoint,null,'previewing a route does not select it');mark('habitat:blue_whale');
 assert.equal(c.voyage.state.waypoint,'habitat:blue_whale');assert.equal(saved,1);assert.deepEqual(plain(c.player.p),before);assert.deepEqual(plain(actor.p),actorBefore);
 actor.p=[610,-35,-185];const moving=destination();assert.equal(moving.x,actor.p[0]);assert.equal(moving.z,actor.p[2]);assert(Math.abs(moving.y-actor.p[1])<1);assert.deepEqual(plain(c.player.p),before);
});
check('partner candidate controls explain absent cold habitats and still locate retained companions',()=>{
 const state={partners:[],selected:null,accompany:false},body={innerHTML:'',buttons:[],insertAdjacentHTML(_,html){this.innerHTML+=html;this.buttons=[...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map(([,attrs,text])=>({dataset:{partnerHabitat:attrs.match(/data-partner-habitat="([^"]+)"/)?.[1]},disabled:/\bdisabled\b/.test(attrs),textContent:text}));},querySelectorAll(selector){return selector==='[data-partner-habitat]'?this.buttons:[];}};
 Object.assign(c,{active:false,modal:'partners',document:{getElementById:id=>id==='panelBody'?body:null,body:{classList:{remove(){},toggle(){}}}},safe:String,panelTitle(){},partnerTraits:()=>({}),oceanFeatures:{register(){},state:()=>state}});
 c.SPECIES=['beluga','white_sided_dolphin','commerson_dolphin','common_dolphin'].map((id,i)=>({id,name:id,wildHabitat:i===3}));
 c.life=c.SPECIES.map((sp,i)=>({uid:sp.id+'-001',species:i,p:[16+i,-8,12],home:[100+i,-10,44]}));
 c.voyage.state.features.ecology=state;
 vm.runInContext(fs.readFileSync('src/ecology.js','utf8'),c);const ecology=vm.runInContext('oceanEcology',c);
 ecology.hooks.renderPanel('partners');
 for(const button of body.buttons.slice(0,3)){assert(button.disabled);assert.match(button.textContent,/此海域無野生分布/);assert.equal(button.onclick,undefined);}
 assert(!body.buttons[3].disabled);body.buttons[3].onclick();assert.equal(c.voyage.state.waypoint,'habitat:common_dolphin');
 for(let i=0;i<3;i++){
  state.partners=[{uid:c.life[i].uid,name:'舊夥伴',mastery:{}}];ecology.hooks.renderPanel('partners');
  const button=body.buttons[i];assert(!button.disabled);assert.match(button.textContent,/標記夥伴/);button.onclick();
  assert.equal(c.voyage.state.waypoint,'habitat:'+c.SPECIES[i].id);const mark=vm.runInContext('voyageDestination()',c);assert.equal(mark.x,c.life[i].p[0]);assert.equal(mark.z,c.life[i].p[2]);
  for(let j=0;j<3;j++)if(j!==i)assert(body.buttons[j].disabled);
 }
});
console.log(count+' total seasonal checks passed');
