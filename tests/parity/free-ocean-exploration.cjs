/* Connected-water persistence and old survey migration. Actual world geometry,
 * CPU-only; this does not substitute for browser controls/rendering checks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),context=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context,{filename:name+'.js'});
const source=fs.readFileSync(path.join(root,'src/exploration.js'),'utf8');
vm.runInContext(source.split('const oceanExploration=')[0],context);
const rules=vm.runInContext('ExplorationRules',context),trench=vm.runInContext('OceanTrench',context),plain=value=>JSON.parse(JSON.stringify(value));
let count=0;const check=(name,run)=>{run();count++;console.log('PASS '+name);};

check('original survey cell IDs keep their exact world locations',()=>{
 for(let id=0;id<960;id++)assert.deepEqual(plain(rules.center(id)),[-285+(id%30+.5)/30*570,-395+(Math.floor(id/30)+.5)/32*610]);
 const oldIds=[...Array(960).keys()].filter(id=>{const [x,z]=rules.center(id);return (x/268)**2+((z+90)/293)**2<=1;});
 const restored=rules.sanitize({schema:1,survey:oldIds});assert.deepEqual(plain(restored.survey),oldIds);assert.equal(rules.surveyStats(restored).count,oldIds.length);
});
check('continuous offshore water adds coverage without changing old discoveries',()=>{
 const oldId=rules.cells.find(id=>id<960),state=rules.sanitize({survey:[oldId]});
 for(const p of [[330,-20,-90],[500,-160,-90],trench.stations[0].p,trench.stations[2].p])assert(rules.reveal(state,p)>=0);
 assert(state.survey.includes(oldId));assert(state.survey.some(id=>id>=960));assert.deepEqual(plain(rules.sanitize(plain(state)).survey),plain(state.survey));
 const last=rules.cellBounds(rules.cols*rules.rows-1);assert.equal(last[2],trench.worldBounds.right);assert.equal(last[3],trench.worldBounds.bottom);
});
check('a real swim path stays connected across the old reef boundary',()=>{
 const state=rules.initial();for(let x=250;x<=330;x+=5)assert(rules.recordTrail(state,[x,-8,-90]));
 assert(state.trail[0].start);assert(state.trail.slice(1).every(node=>!node.start));assert.deepEqual(plain(rules.sanitize(plain(state)).trail),plain(state.trail));
});
check('continuous ink crossing the old region boundary survives save restore',()=>{
 const state=rules.initial(),points=[[258,-8,-90],[262,-8,-90],[267,-8,-90],[272,-8,-90]];
 assert(rules.appendStroke(state,points,'mint'));assert.deepEqual(plain(rules.sanitize(plain(state)).strokes[0].points),points);
});
check('midwater and hadal notes retain exact depths without a deployment flag',()=>{
 for(const station of trench.stations){const state=rules.initial(),a=plain(station.p),b=a.map((n,i)=>n+(i===0?.5:0));assert(rules.recordTrail(state,a));assert(rules.appendStroke(state,[a,b],'blue'));const restored=rules.sanitize(plain(state));assert.deepEqual(plain(restored.trail[0].p),a);assert.deepEqual(plain(restored.strokes[0].points),[a,b]);}
});
check('invalid points and artificial kilometre-long ink remain rejected',()=>{
 for(const p of [[901,-8,0],[400,2,0],[400,-8000,0],[Infinity,-8,0]])assert.equal(rules.pointRegion(p),null);
 assert(!rules.appendStroke(rules.initial(),[[0,-8,0],[766,-7000,-120]],'mint'));
 const state=rules.initial();rules.recordTrail(state,[0,-8,0]);rules.recordTrail(state,[766,-7000,-120]);assert(state.trail[1].start);
});
console.log(`${count} connected-ocean exploration checks passed`);
