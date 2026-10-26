const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');let feature,stored,saves=0;
const context=vm.createContext({console,active:false,modal:null,photoOpen:false,OPEN_WORLD:{boat:[-24,0,43]},voyage:{state:{dives:1,completed:[],features:{expedition:{day:1}}}},persistent:{seen:[]},saveVoyage:()=>{saves++;return true},toast:()=>{},renderer:{dirty:false},oceanFeatures:{register:f=>feature=f,state:()=>stored},document:{getElementById:()=>null,body:{classList:{remove(){},toggle(){}}}},settings:{},t:0});
vm.runInContext(fs.readFileSync(path.join(root,'src/engine.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'src/seasons.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'src/ship.js'),'utf8'),context);
const api=vm.runInContext('oceanShip',context),plain=x=>JSON.parse(JSON.stringify(x));stored=feature.initial();let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name)}
check('old save initializes on connected aft deck',()=>{assert(api.walkable(stored.p));assert.equal(stored.schema,1);assert.equal(stored.visitor.kind,null)});
check('import rejects nonfinite deck positions and cabin intersections',()=>{for(const p of [[NaN,3],[0,0],[50,50],[0,9]]){const s=api.sanitize({p});assert(api.walkable(s.p));assert.notDeepEqual(plain(s.p),p)}});
check('import accepts only authored appearance and bounded records',()=>{const s=api.sanitize({appearance:{name:'<test>\u0000',skin:'fake',hair:'fake',build:'fake',accessory:'fake'},visited:['cabin','unknown','cabin'],distance:Infinity,visitor:{kind:'tiger',day:999999,trust:999}});assert.equal(s.appearance.name,'test');assert.equal(s.appearance.skin,'warm');assert.deepEqual(plain(s.visited),['cabin']);assert.equal(s.distance,0);assert.equal(s.visitor.kind,null)});
check('boat-local transforms roundtrip after real anchor moves',()=>{for(const p of [[0,.68,4.3],[2.2,.68,-4]]){const q=api.toLocal(api.toWorld(p));q.forEach((v,i)=>assert(Math.abs(v-p[i])<1e-9));}const before=api.toWorld([0,.68,4.3]);context.OPEN_WORLD.boat=[50,0,-70];const after=api.toWorld([0,.68,4.3]);assert.equal(after[0]-before[0],74);assert.equal(after[2]-before[2],-113);context.OPEN_WORLD.boat=[-24,0,43]});
check('rails, cabin and visible equipment block foot placement',()=>{for(const p of [[0,0],[2.9,0],[0,6.3],[1.33,3.35],[-1.4,4.8],[1.35,4.8]])assert(!api.walkable(p),p.join(','));assert(api.walkable([2.2,0]));assert(api.walkable([-2.2,0]));});
check('route connects aft and foredeck without crossing cabin or rail',()=>{const route=api.planRoute([0,4.1],[0,-5.4]);assert(route&&route.length>1);let prev=[0,4.1];for(const p of route){for(let n=0;n<=40;n++)assert(api.walkable(prev.map((x,i)=>x+(p[i]-x)*n/40)));prev=p;}assert.deepEqual(plain(route.at(-1)),[0,-5.4]);assert(route.some(p=>Math.abs(p[0])>1.9));});
check('unreachable and nonfinite destinations never create a route',()=>{assert.equal(api.planRoute([0,4.1],[0,0]),null);assert.equal(api.planRoute([0,4.1],[NaN,3]),null)});
check('every physical station has a reachable approach point',()=>{for(const station of api.stations){assert(api.walkable(station.approach),station.id);assert(api.planRoute([0,4.1],station.approach),station.id)}});
check('avatar appearance changes persist but locked accessories are rejected',()=>{assert(api.setAppearance('skin','deep'));assert.equal(stored.appearance.skin,'deep');assert(!api.setAppearance('accessory','cap'));context.persistent.seen=['a','b','c'];assert(api.setAppearance('accessory','cap'));assert.equal(stored.appearance.accessory,'cap');assert(!api.setAppearance('skin','unknown'));assert(saves>0)});
check('visitor event follows the game season and keeps same-day trust',()=>{api.syncVisitor();assert.equal(stored.visitor.kind,'seal');stored.visitor.trust=2;api.syncVisitor();assert.equal(stored.visitor.trust,2);context.voyage.state.features.expedition.day=2;api.syncVisitor();assert.equal(stored.visitor.kind,'seal');context.voyage.state.features.expedition.day=93;api.syncVisitor();assert.equal(stored.visitor.kind,'penguin');assert.equal(stored.visitor.trust,0)});
check('appearance and visitor state survive sanitize roundtrip',()=>{const s=api.sanitize(plain(stored));assert.deepEqual(plain(s),plain(stored));});
check('reset and mode lifecycle do not erase collected ship history',()=>{stored.visited=['cabin','notice'];const before=plain(stored);feature.reset();feature.panelChanged('settings');feature.panelClosed();assert.deepEqual(plain(stored),before);assert.equal(api.snapshot().mode,null);assert.equal(feature.shouldAnimate(),false)});
// Real ship rules, route, elapsed time and projection. Only the DOM/rendering
// boundary is absent; no gesture counter, trust or private runtime is seeded.
function visitorFixture(){
 let feature,state,saved=0;
 const nodes={panelBody:{innerHTML:''},shipExit:{focus(){}}};
 const context=vm.createContext({console,active:false,modal:'deck',photoOpen:false,cameraCut:false,OPEN_WORLD:{boat:[-24,0,43]},voyage:{state:{dives:1,completed:[],features:{expedition:{day:1}}}},persistent:{seen:[]},saveVoyage:()=>{saved++;return true},toast(){},panelTitle(){},renderer:{dirty:false,canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1280,height:800})}},oceanFeatures:{register:f=>feature=f,state:()=>state},document:{getElementById:id=>nodes[id]||null,body:{classList:{remove(){},toggle(){}}}},settings:{},t:0});
 for(const file of ['engine','seasons','ship'])vm.runInContext(fs.readFileSync(path.join(root,'src/'+file+'.js'),'utf8'),context);
 const api=vm.runInContext('oceanShip',context);state=feature.initial();assert(feature.renderPanel('deck'));assert(api.walkToStation('visitor'));
 for(let i=0;i<300&&api.snapshot().route.length;i++)api.advance(.1);
 assert.equal(api.snapshot().route.length,0);assert(state.visited.includes('visitor'));
 vm.runInContext('renderer.vp=mm(perspective(58*Math.PI/180,1280/800,.1,100),lookAt(oceanShip.toWorld([3.5,4.5,-8.8]),oceanShip.toWorld([-.40,1.18,-4.55])))',context);
 const point=api.screenPoint(api.stations.find(s=>s.id==='visitor').p);assert(point);
 const begin=(pointer=7)=>api.beginVisitor(point.x,point.y,pointer);
 const move=(x,y=0,dt=1/60,pointer=7)=>{api.advance(dt);return api.moveVisitor(point.x+x,point.y+y,pointer);};
 const stroke=({hz=60,speed=114,pointer=7,beginAt=true,ends=[30,-30,0]}={})=>{
  if(beginAt)assert(begin(pointer));let x=0,rewards=0;
  for(const end of ends){const start=x,n=Math.ceil(Math.abs(end-start)*hz/speed);for(let i=1;i<=n;i++){x=start+(end-start)*i/n;if(move(x,0,1/hz,pointer))rewards++;}}
  return rewards;
 };
 return {api,feature,state,context,point,begin,move,stroke,saves:()=>saved};
}
check('smooth RT visitor strokes earn identical trust at 30, 60 and 120 Hz',()=>{
 const results=[30,60,120].map(hz=>{const f=visitorFixture(),before=f.saves(),rewards=f.stroke({hz,speed:114});return {hz,rewards,trust:f.state.visitor.trust,saves:f.saves()-before};});
 assert.deepEqual(results,[30,60,120].map(hz=>({hz,rewards:1,trust:1,saves:1})));
});
check('slow visitor strokes also accumulate real reversals at every refresh rate',()=>{
 for(const hz of [30,60,120]){const f=visitorFixture();assert.equal(f.stroke({hz,speed:48}),1,'slow stroke at '+hz+' Hz');assert.equal(f.state.visitor.trust,1);}
});
check('subpixel horizontal noise never turns a one-way visitor stroke into a caress',()=>{
 const f=visitorFixture();assert(f.begin());for(let i=1;i<=60;i++)f.move(i*.5);
 for(let i=0;i<180;i++)f.move(30+(i%2?.8:-.8),Math.sin(i*.2)*18,1/120);
 assert.equal(f.state.visitor.trust,0);assert(f.api.feature.pointerCaptured());
});
check('visitor distance, hit radius, path length and elapsed time remain required',()=>{
 let f=visitorFixture();assert(!f.api.beginVisitor(f.point.x+66,f.point.y,7));
 assert(f.begin());for(const x of [10,-10,0])f.move(x,0,.1);assert.equal(f.state.visitor.trust,0,'short path');
 f=visitorFixture();assert(f.begin());for(const x of [30,-30,0])f.move(x,0,.01);assert.equal(f.state.visitor.trust,0,'too fast');
 f=visitorFixture();assert(f.begin());f.move(30);f.move(91);f.move(-30,0,.1);assert.equal(f.state.visitor.trust,0,'outside visitor disc cancels');assert(!f.api.feature.pointerCaptured());
 f=visitorFixture();assert(f.begin());f.move(30);f.move(-60);f.move(0,0,.1);assert.equal(f.state.visitor.trust,0,'single jump above 80 px cancels');assert(!f.api.feature.pointerCaptured());
 f=visitorFixture();assert(f.api.walkTo([0,4.1]));for(let i=0;i<300&&f.api.snapshot().route.length;i++)f.api.advance(.1);assert(!f.begin(),'remote visitor cannot be touched');
});
check('visitor cooldown still rejects a second caress until two seconds pass',()=>{
 const f=visitorFixture();assert.equal(f.stroke(),1);assert.equal(f.stroke(),0);assert.equal(f.state.visitor.trust,1);
 for(let i=0;i<22;i++)f.api.advance(.1);assert.equal(f.stroke(),1);assert.equal(f.state.visitor.trust,2);
});
check('visitor pointer ownership and mode cancellation cannot finish a partial caress',()=>{
 for(const cancel of [f=>f.move(30,0,.1,99),f=>f.feature.panelClosed(),f=>f.feature.reset(),f=>f.api.walkToStation('notice')]){
  const f=visitorFixture();assert(f.begin());f.move(30,0,.1);cancel(f);
  for(const x of [-30,0,30])f.move(x,0,.1);assert.equal(f.state.visitor.trust,0);assert(!f.api.feature.pointerCaptured());
 }
});
console.log(count+' ship behavior checks passed');
