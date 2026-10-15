/* State and real integration seams; visual/gesture evidence is separate. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const stations=[{id:'midwater',depth:700,p:[760,-700,-90]},{id:'slope',depth:1400,p:[754,-1400,-103]},{id:'hadal',depth:7000,p:[766,-7000,-120]}];
const trench={stations,containsPosition:p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=620&&p[0]<=900&&p[1]>=-7050&&p[1]<=-600&&p[2]>=-240&&p[2]<=60};
const c=vm.createContext({console,OceanTrench:trench});let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)},plain=x=>JSON.parse(JSON.stringify(x));
const source=fs.readFileSync('src/deepsea.js','utf8');vm.runInContext(source.split('const oceanDeepsea=')[0]+';globalThis.R=DeepseaRules;',c);const R=c.R;
check('new save has no fabricated station visits or active deployment',()=>assert.deepEqual(plain(R.initial()),{schema:1,deployed:false,station:'midwater',visited:[]}));
check('three stations retain their real metre depths',()=>assert.deepEqual(stations.map(s=>-s.p[1]),[700,1400,7000]));
check('invalid station state repairs to a safe inactive mission',()=>{const s=R.sanitize({deployed:true,station:'__proto__',visited:['hadal','fake','hadal']});assert.equal(s.deployed,false);assert.equal(s.station,'midwater');assert.deepEqual(plain(s.visited),['hadal']);});
check('legitimate mission identity survives save roundtrip',()=>{const s={schema:1,deployed:true,station:'hadal',visited:['midwater','hadal']};assert.deepEqual(plain(R.sanitize(plain(s))),s);});
check('deep resume requires both mission identity and finite in-region position',()=>{assert(R.canResume({deployed:true,station:'hadal'},[766,-7000,-120]));assert(!R.canResume({deployed:false,station:'hadal'},[766,-7000,-120]));for(const p of [[766,-Infinity,-120],[766,-8000,-120],[0,-7000,0],[766,-7000]])assert(!R.canResume({deployed:true,station:'hadal'},p));});
check('path step follows corners, caps distance and never invents a jump',()=>{const a=[0,-700,0],route=[a,[0,-710,0],[10,-710,0]];const x=R.advance(a,route,1,12);assert.deepEqual(plain(x.p),[2,-710,0]);assert.equal(x.index,2);assert(!x.done);const y=R.advance(x.p,route,x.index,8);assert.deepEqual(plain(y.p),[10,-710,0]);assert(y.done);assert.deepEqual(a,[0,-700,0]);});
check('path step rejects non-finite or negative travel budgets',()=>{for(const budget of [NaN,Infinity,-1])assert.deepEqual(plain(R.advance([0,0,0],[[0,0,0],[1,0,0]],1,budget).p),[0,0,0]);});
// Exercise readVoyage itself: the old blanket -120m clamp destroys deep saves.
c.oceanFeatures={read:x=>x||{}};c.SPECIES=[];c.LANDMARKS=[];c.clamp=(n,a,b)=>Math.max(a,Math.min(b,n));c.TAU=Math.PI*2;
const voyage=fs.readFileSync('src/voyage.js','utf8');vm.runInContext(voyage.slice(0,voyage.indexOf('const voyage='))+';globalThis.read=readVoyage;',c);
check('production voyage reader preserves authorized 7000m resume',()=>{const s=c.read({schema:1,resume:{p:[766,-7000,-120],yaw:0,pitch:0,seconds:4},features:{deepsea:{deployed:true,station:'hadal'}}});assert.deepEqual(plain(s.resume.p),[766,-7000,-120]);});
check('forged deep position cannot bypass region-specific save validation',()=>{const s=c.read({schema:1,resume:{p:[766,-7000,-120],yaw:0,pitch:0},features:{deepsea:{deployed:false,station:'hadal'}}});assert(s.resume.p[0]<=260&&s.resume.p[1]>=-120);});
check('original shallow resume remains byte-equivalent',()=>{const p=[-156,-91,-300],s=c.read({schema:1,resume:{p,yaw:.4,pitch:-.2,seconds:22}});assert.deepEqual(plain(s.resume),{p,yaw:.4,pitch:-.2,seconds:22});});
const exploration=fs.readFileSync('src/exploration.js','utf8');vm.runInContext(exploration.split('const oceanExploration=')[0]+';globalThis.E=ExplorationRules;',c);const E=c.E;
check('deep water ink and trails survive the actual exploration sanitizer',()=>{const a=[766,-7000,-120],b=[766.5,-7000,-120],s=E.sanitize({trail:[{p:a,start:true}],strokes:[{id:1,color:'mint',points:[a,b]}]});assert.equal(s.trail.length,1);assert.equal(s.strokes.length,1);assert.deepEqual(plain(s.strokes[0].points),[a,b]);});
check('a stroke cannot bridge the remote reef and trench through invalid space',()=>{const s=E.sanitize({strokes:[{id:1,color:'mint',points:[[0,-7,0],[766,-7000,-120]]}]});assert.equal(s.strokes.length,0);});
check('recorded deep trails preserve discontinuities between deployments',()=>{const s=E.initial();assert(E.recordTrail(s,[0,-7,0]));assert(E.recordTrail(s,[766,-7000,-120]));assert(s.trail[1].start);});
console.log(count+' deepsea checks passed');
