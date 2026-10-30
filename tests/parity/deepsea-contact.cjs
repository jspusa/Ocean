/* Shared real compiled-scene fixture, short cold-boat/contact regression.
 * No browser/GPU, fake collision owner, body-profile edits, or budget extension.
 * Negative controls change requested routes and seed an accepted contact pose;
 * every collide/updateCamera/body query still executes production geometry. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.join(__dirname,'deepsea-arrival.cjs'),source=fs.readFileSync(filename,'utf8'),boundary='for(const station of T.stations){',at=source.indexOf(boundary);if(at<0)throw Error('arrival fixture boundary missing');
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=Module._nodeModulePaths(path.dirname(filename));
fixture._compile(source.slice(0,at)+String.raw`
const contact=get('OceanDiverContact'),rocks=get('OceanRockContact'),regions=get('OceanRegions'),rules=get('DeepseaRules'),originalAdvance=rules.advance,receipts=[];
const plain=x=>JSON.parse(JSON.stringify(x));
function restart(){c.auto=false;features.navigation.prepareDive({resume:false});features.deepsea.prepareDive({resume:false});features.deepsea.startDive();c.updateCamera(0);assert(deep.travel('midwater'));}
function bodyClear(){const body=contact.snapshot();assert(body);const volumes=contact.volumes(body);assert.equal(volumes.length,8);for(const s of volumes){assert(!rocks.overlaps(s.p,s.r),'accepted body overlaps a rock');assert(!regions.pointBlocked(s.p,s.r),'accepted body overlaps a region');assert(!T.groundContact(s.p,s.r),'accepted body overlaps a ground plane');assert(s.p[1]>=get('groundHeight')(s.p[0],s.p[2])+s.r-1e-6);assert(s.p[1]<=-.05-s.r+1e-6);}return body;}
for(const cadence of [60,30]){
 restart();const start=c.player.p.slice(),route=plain(T.route('midwater','midwater',start));let frames=0,maxStep=0,maxCorrection=0,maxVelocityError=0;
 // Twelve seconds is enough to leave the shallow rock belt and enter the
 // descent. The old continuous cold-boat route instead stalls at x=188.
 for(;frames<12*cadence&&c.player.p[1]>-150;frames++){
  const before=c.player.p.slice(),bodyBefore=plain(contact.snapshot());
  for(let j=0;j<120/cadence;j++){c.updatePlayer(1/120);assert.deepEqual(plain(contact.snapshot()),bodyBefore,'physics loop ran the body solver');}
  const requested=c.player.p.slice();c.updateCamera(1/cadence);features.deepsea.afterCamera?.(1/cadence);c.t+=1/cadence;
  bodyClear();maxStep=Math.max(maxStep,V.dist(before,c.player.p));maxCorrection=Math.max(maxCorrection,V.dist(requested,c.player.p));
  assert.equal(deep.snapshot().guideMode,'traveling','cold boat guide unexpectedly paused');assert(V.dist(before,c.player.p)<=260/cadence+.001,'frame movement exceeded its existing speed budget');
  const actual=V.mul(V.sub(c.player.p,before),cadence);maxVelocityError=Math.max(maxVelocityError,V.dist(actual,c.player.velocity));
 }
 assert(c.player.p[0]>720&&c.player.p[1]<=-150,'cold boat route failed to enter the deep descent in twelve seconds');
 assert(maxVelocityError<1e-6,'velocity disagrees with accepted movement');
 receipts.push({name:'cold boat continuous descent',cadence,physicsHz:120,start,end:c.player.p.slice(),seconds:frames/cadence,route,maxStep,maxCorrection,maxVelocityError,bodyVolumes:8});console.log('PASS cold boat continuous descent / '+cadence+' Hz body owner');deep.cancelTravel();
}
// Exercise the old obstructed heading against the actual rock mesh. Preserve
// the true requested vector before legacy collide can mutate it in place.
restart();let lastPlan=null,legacyCorrection=0,bodyCorrection=0,pausedAt=-1;
rules.advance=function(position,route,index,budget){const next=originalAdvance(position,[[...position],[760,-3,-90]],1,budget);lastPlan=next.p.slice();return {...next,index,done:false};};
for(let i=0;i<600;i++){
 c.updatePlayer(1/60);const requested=c.player.p.slice();legacyCorrection=Math.max(legacyCorrection,V.dist(lastPlan,requested));c.updateCamera(1/60);bodyCorrection=Math.max(bodyCorrection,V.dist(requested,c.player.p));features.deepsea.afterCamera?.(1/60);c.t+=1/60;bodyClear();if(!c.auto){pausedAt=i;break;}
}
rules.advance=originalAdvance;assert(pausedAt>=0,'real obstruction did not pause the guide');assert(legacyCorrection>.25||bodyCorrection>.25,'negative route did not exercise a real collision correction');assert.equal(deep.snapshot().travelTarget,'midwater');assert.equal(deep.snapshot().guideMode,'paused');assert(V.len(c.player.velocity)===0,'paused guide reports phantom motion');
receipts.push({name:'real obstruction preserves destination and stops phantom progress',pausedAt,legacyCorrection,bodyCorrection,p:c.player.p.slice()});console.log('PASS real collision correction pauses with destination preserved');
// Seed the actual eight-sphere accepted pose from the cold-boat v44 witness.
// This isolated negative fixture is not a guided journey or a relocation path.
// Its requests move at the real minimum approach speed (0.28 m/s); the real
// mesh/body solver, not a stubbed accepted-frame result, rejects each request.
// The tail already touches the real surface bound; keep that body orientation
// fixed while requesting a small upward step, so turning cannot free it.
for(const cadence of [60,30]){
 restart();const seed={p:[188.11680168588686,-.7005913143510353,32.54950339401218],yaw:1.2786289312074852,pitch:-.009671965683216903};
 Object.assign(c.player,seed,{p:seed.p.slice(),velocity:[0,0,0]});contact.reset();c.updateCamera(0);assert(V.dist(c.player.p,seed.p)<1e-6,'negative fixture body seed is no longer clear');bodyClear();
 const start=c.player.p.slice();let frames=0,maxCorrection=0;
 rules.advance=(position,route,index)=>({p:V.add(position,[0,.28/120,0]),index,done:false});
 for(;frames<2*cadence&&c.auto;frames++){
  for(let j=0;j<120/cadence;j++)c.updatePlayer(1/120);
  const requested=c.player.p.slice();c.player.yaw=seed.yaw;c.player.pitch=seed.pitch;c.updateCamera(1/cadence);features.deepsea.afterCamera?.(1/cadence);c.t+=1/cadence;maxCorrection=Math.max(maxCorrection,V.dist(requested,c.player.p));bodyClear();
 }
 rules.advance=originalAdvance;const witness={cadence,seconds:frames/cadence,moved:V.dist(start,c.player.p),maxCorrection,mode:deep.snapshot().guideMode,target:deep.snapshot().travelTarget};console.log('LOW SPEED WITNESS '+JSON.stringify(witness));
 assert(maxCorrection<.25,'low-speed witness accidentally used the fast collision threshold');assert(witness.moved<.001,'low-speed witness must prove an actually blocked body');assert.equal(witness.mode,'paused','slow blocked guide remained active');assert.equal(witness.target,'midwater');assert(witness.seconds<=.6,'slow obstruction did not stop within bounded feedback time');assert.equal(V.len(c.player.velocity),0);receipts.push({name:'low-speed real body rejection',...witness});
 restart();rules.advance=(position,route,index)=>({p:V.add(position,[.28/120,0,0]),index,done:false});const openStart=c.player.p.slice();
 for(let i=0;i<2*cadence;i++){for(let j=0;j<120/cadence;j++)c.updatePlayer(1/120);c.updateCamera(1/cadence);features.deepsea.afterCamera?.(1/cadence);c.t+=1/cadence;bodyClear();}
 rules.advance=originalAdvance;assert(c.auto,'normal slow accepted swimming was mistaken for a stall');assert(Math.abs(V.dist(openStart,c.player.p)-.56)<1e-6);deep.cancelTravel();console.log('PASS low-speed blocked / open-water control at '+cadence+' Hz');
}
// A terminal motion proposal must remain traveling until updateCamera has
// accepted its body. This is a protocol negative control, not a valid route.
restart();const proposal=c.player.p.slice();proposal[0]+=.01;
rules.advance=(position,route)=>({p:proposal.slice(),index:route.length,done:true});c.updatePlayer(1/120);assert.equal(deep.snapshot().guideMode,'traveling');assert.equal(deep.snapshot().holding,false);assert.equal(deep.snapshot().approaching,false);rules.advance=originalAdvance;deep.cancelTravel();
console.log('PASS terminal proposal cannot complete a leg before the frame owner accepts it');
fs.mkdirSync(root+'/qa/parity',{recursive:true});fs.writeFileSync(root+'/qa/parity/deepsea-contact.json',JSON.stringify({method:'production compiled rock mesh, unchanged eight-body-volume owner, 120 Hz physics, 60/30 Hz frame acceptance; explicit obstruction, low-speed and terminal proposal controls',receipts},null,2)+'\n');
`,filename);
