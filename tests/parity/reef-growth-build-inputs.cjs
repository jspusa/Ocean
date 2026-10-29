/* Build guard unit fixtures, not world-placement or native-render acceptance.
 * A pack-only build must never silently embed an obsolete placement replay. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),inputs=require(path.join(root,'scene_inputs.cjs'));
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'ocean-growth-inputs-')),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let checks=0;
const check=(name,run)=>{run();checks++;console.log('PASS '+name);};
try{
 for(const file of inputs.SOURCE_FILES){const target=path.join(folder,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'fixture contents for '+file+'\n');}
 fs.mkdirSync(path.join(folder,'assets'),{recursive:true});const archive=Buffer.from('fixture archive bytes, not a rendered scene');fs.writeFileSync(path.join(folder,'assets/reef.mesh.gz'),archive);
 const baseline=inputs.fingerprint(folder),good={format:'return-blue/reef-growth/1',sourceSHA256:baseline.sourceSHA256,sourceInputs:baseline.files,sceneArchiveSHA256:sha(archive),contentStamp:'0123456789abcdef',failed:[],batchLimits:[],actors:[{family:'fixture-only',from:{p:[0,0,0]},to:{p:[0,0,0]}}]};
 const write=payload=>fs.writeFileSync(path.join(folder,'assets/reef-growth.json'),JSON.stringify(payload));
 write(good);
 check('exact recorded generator inputs and archive are accepted',()=>assert.equal(inputs.verifyGrowthReplay(folder).sourceSHA256,good.sourceSHA256));
 check('fingerprints do not depend on checkout absolute path',()=>{const other=fs.mkdtempSync(path.join(os.tmpdir(),'ocean-growth-copy-'));try{for(const file of inputs.SOURCE_FILES){const target=path.join(other,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(folder,file),target);}assert.deepEqual(inputs.fingerprint(other),baseline);}finally{fs.rmSync(other,{recursive:true,force:true});}});
 check('an actual generator edit rejects the old replay',()=>{const file=path.join(folder,'src/individuals.js'),old=fs.readFileSync(file);try{fs.appendFileSync(file,'changed actual geometry input');assert.throws(()=>inputs.verifyGrowthReplay(folder),/source/i);}finally{fs.writeFileSync(file,old);}});
 check('an archive edit rejects the old replay',()=>{try{fs.appendFileSync(path.join(folder,'assets/reef.mesh.gz'),'changed');assert.throws(()=>inputs.verifyGrowthReplay(folder),/archive/i);}finally{fs.writeFileSync(path.join(folder,'assets/reef.mesh.gz'),archive);}});
 check('recorded input provenance cannot disagree with its digest',()=>{write({...good,sourceInputs:[]});assert.throws(()=>inputs.verifyGrowthReplay(folder),/input/i);write(good);});
 check('unresolved growth fits cannot be packed',()=>{write({...good,failed:[{family:'fixture-only'}]});assert.throws(()=>inputs.verifyGrowthReplay(folder),/unresolved/i);write(good);});
 check('runtime scene-content evidence is required',()=>{const bad={...good};delete bad.contentStamp;write(bad);assert.throws(()=>inputs.verifyGrowthReplay(folder),/content/i);write(good);});
 check('explicit batch visibility replay is required',()=>{const bad={...good};delete bad.batchLimits;write(bad);assert.throws(()=>inputs.verifyGrowthReplay(folder),/batch/i);write(good);});
 check('unsupported or empty replay cannot be packed',()=>{write({...good,format:'unknown'});assert.throws(()=>inputs.verifyGrowthReplay(folder),/format/i);write({...good,actors:[]});assert.throws(()=>inputs.verifyGrowthReplay(folder),/actor/i);write(good);});
 check('missing replay is an explicit build failure',()=>{fs.unlinkSync(path.join(folder,'assets/reef-growth.json'));assert.throws(()=>inputs.verifyGrowthReplay(folder),/ENOENT|missing/i);});
 console.log(JSON.stringify({status:'passed',checks,scope:'isolated build-input guard fixtures'}));
}finally{fs.rmSync(folder,{recursive:true,force:true});}
