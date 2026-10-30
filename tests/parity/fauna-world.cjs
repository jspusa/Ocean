/* Verify the delivered scene against known 0.10 identities and physical habitats.
 * This checks baked data, not a simulated browser or an unassisted playthrough. */
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const raw=zlib.gunzipSync(fs.readFileSync('assets/reef.mesh.gz')),h=JSON.parse(raw.subarray(8,8+raw.readUInt32LE(4))),actors=h.life.map(i=>h.nodes[i]);
const previous=JSON.parse(fs.readFileSync('tests/parity/fixtures/v010-actors.json')).actors;
const context=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna','fauna_world'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),context);
context.bakedSurface=(x,z)=>{
 const base=8+raw.readUInt32LE(4);
 for(const batch of h.batches.filter(b=>b.material===1&&b.maxDistance===100)){
  const p=h.nodes[batch.instanceIDs[0]].p;if(Math.abs(x-p[0])>32||Math.abs(z-p[2])>32)continue;
  const vertex=id=>[0,1,2].map(a=>raw.readFloatLE(base+batch.vertexOffset+(id*12+a)*4)+p[a]);
  for(let k=0;k<batch.indexCount;k+=3){const [a,b,c]=[0,1,2].map(j=>vertex(raw.readUInt32LE(base+batch.indexOffset+(k+j)*4))),det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(det)<1e-8)continue;
   const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det,w=1-u-v;if(Math.min(u,v,w)>=-1e-7)return u*a[1]+v*b[1]+w*c[1];
  }
 }
 throw Error('No real ground triangle under habitat');
};
context.header=h;context.actors=actors;context.previous=previous;context.assert=assert;
vm.runInContext(`
obstacles.push(...header.obstacles);let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('Every legacy individual keeps its identity and original scale baseline',()=>{
 const current=new Map([...header.life,...header.decorLife,...header.shoal].map(i=>{const n=header.nodes[i];return [n.uid,n]}));
 for(const old of previous){const n=current.get(old.uid);assert(n,'missing '+old.uid);assert.equal(n.species??null,old.species);assert.equal(n.bioSeed,old.bioSeed);assert.equal(JSON.stringify(n.bioBaseScale??null),JSON.stringify(old.bioBaseScale));}
});
check('All eight new catalogue entries have actual metre-scaled distinct actors',()=>{
 assert.equal(FAUNA_SPECIES.length,8);assert.equal(actors.filter(f=>FAUNA_SPECIES.includes(SPECIES[f.species])).length,33);
 for(const sp of FAUNA_SPECIES){const found=actors.filter(f=>SPECIES[f.species]?.id===sp.id);assert(found.length>=3);for(const f of found){assert.equal(f.s[0],sp.size);assert(f.modelCenter.every(Number.isFinite));assert(f.home.every(Number.isFinite));assert.equal(f.uid.split('-')[0],sp.id);}}
});
check('Each new high and low mesh uses the same actual actor identities',()=>{
 for(const sp of FAUNA_SPECIES){const index=SPECIES.indexOf(sp),b=header.batches.filter(b=>b.species===index);assert.equal(b.length,2);assert(b.every(b=>b.kind===8&&b.dynamic));assert.equal(JSON.stringify(b[0].instanceIDs),JSON.stringify(b[1].instanceIDs));assert(b[0].maxDistance===b[1].minDistance);assert(b[1].maxDistance>b[1].minDistance);}
});
check('Micro habitats are outside reef collision volumes and within swimming reach',()=>{
 for(const f of actors.filter(f=>FAUNA_SPECIES.includes(SPECIES[f.species])&&speciesTraits(f.species).micro)){assert(FaunaWorldRules.clearSite(f.home[0],f.home[2]),f.uid);const ground=groundHeight(f.home[0],f.home[2]);assert(f.home[1]>=ground-.001);const point=animalFocusPoint(f),player=[f.home[0],ground+.83,f.home[2]];assert(V.dist(point,player)<=speciesTraits(f.species).observeDistance,f.uid+' not reachable');}
});
check('Crawling actors sit on the authored support rather than floating above it',()=>{
 for(const f of actors.filter(f=>f.fauna&&['cinderella_slug','frogfish'].includes(SPECIES[f.species]?.id))){const gap=f.home[1]-FaunaWorldRules.surfaceHeight(f.home[0],f.home[2])-.10;assert(gap>=0&&gap<.004,f.uid+' floor gap '+gap);}
});
check('Burrow entries touch the rendered seabed, including triangle interpolation',()=>{
 for(const f of actors.filter(f=>f.fauna&&['garden_eel','pistol_shrimp'].includes(SPECIES[f.species]?.id))){const site=FaunaWorldRules.sites[SPECIES[f.species]?.id],surface=FaunaWorldRules.surfaceHeight(f.home[0],f.home[2]);assert(Math.abs(f.home[1]-surface-site.height)<1e-6,f.uid+' rendered floor gap');assert(surface>=groundHeight(f.home[0],f.home[2])-.001);}
});
check('Habitat heights agree with the actual compiled triangle vertices',()=>{
 for(const f of actors.filter(f=>f.fauna&&FaunaWorldRules.sites[SPECIES[f.species]?.id]?.support)){const expected=bakedSurface(f.home[0],f.home[2]);assert(Math.abs(expected-FaunaWorldRules.surfaceHeight(f.home[0],f.home[2]))<.00002,f.uid);}
});
check('Restoring the same authored habitat never consumes randomness',()=>{
 const before=seed,site=FaunaWorldRules.sites.pygmy_seahorse,a=FaunaWorldRules.place(site,1),b=FaunaWorldRules.place(site,1);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(seed,before);
});
console.log(checks+' fauna world checks passed');
`,context);
