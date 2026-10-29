/* Shared offline scene inputs. The placement replay itself is deliberately
 * excluded: including generated output in its own source digest is circular. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MODULES=Object.freeze(['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','trench.js','fauna.js','cetaceans.js','abyss_fauna.js','trench_fauna.js','fauna_world.js','cetacean_world.js','regions.js','abyss_world.js','trench_world.js','pelagic_life.js','reef_fauna.js','oarfish.js','frilled_shark.js','frilled_shark_world.js','barreleye.js','barreleye_world.js','tripod_fish.js','dumbo_octopus.js','abyss_community.js','barramundi.js','rock_contact.js']);
const SOURCE_FILES=Object.freeze(['scene_inputs.cjs','bake_scene.cjs',...MODULES.map(file=>'src/'+file),'assets/coral_forms.json']);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fingerprint(root){
 const files=SOURCE_FILES.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:sha(bytes)};});
 return {format:'return-blue/scene-inputs/1',sourceSHA256:sha(JSON.stringify(files)),files};
}
function verifyGrowthReplay(root,inputs=fingerprint(root)){
 const replay=JSON.parse(fs.readFileSync(path.join(root,'assets/reef-growth.json'),'utf8'));
 if(replay.format!=='return-blue/reef-growth/1')throw Error('Unsupported reef growth replay format');
 if(replay.sourceSHA256!==inputs.sourceSHA256)throw Error('Reef growth source inputs changed; run the full scene build');
 if(JSON.stringify(replay.sourceInputs)!==JSON.stringify(inputs.files))throw Error('Reef growth input provenance differs');
 if(!Array.isArray(replay.failed)||replay.failed.length)throw Error('Reef growth has unresolved placement failures');
 if(!Array.isArray(replay.actors)||!replay.actors.length)throw Error('Reef growth actor replay is empty');
 if(!Array.isArray(replay.batchLimits))throw Error('Reef growth batch interval replay is missing');
 if(!/^[a-f0-9]{16}$/.test(replay.contentStamp||''))throw Error('Reef growth runtime content stamp is missing');
 if(replay.sceneArchiveSHA256!==sha(fs.readFileSync(path.join(root,'assets/reef.mesh.gz'))))throw Error('Reef growth replay does not match the compiled archive');
 return replay;
}
module.exports={MODULES,SOURCE_FILES,fingerprint,verifyGrowthReplay};
if(require.main===module){try{const root=__dirname;console.log(JSON.stringify(process.argv.includes('--verify-growth')?verifyGrowthReplay(root):fingerprint(root)));}catch(error){console.error(error.message);process.exitCode=1;}}
