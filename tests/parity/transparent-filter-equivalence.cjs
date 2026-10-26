/* Compare retained native renderer evidence without rendering or rewriting it.
 * This proves equality of the recorded pixels/conditions, not shader behavior
 * on unobserved hardware or a statistically established performance gain. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const MODES=['off','on','on','off'];
const SUCCESS='passed-controlled-checks-visual-review-required';
const SHA=/^[0-9a-f]{64}$/;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const copy=value=>JSON.parse(JSON.stringify(value));

function firstDifference(a,b,at=''){
 if(isDeepStrictEqual(a,b))return null;
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
   const d=firstDifference(a[key],b[key],at+(Array.isArray(a)?'['+key+']':'.'+key));
   if(d)return d;
  }
 }
 const brief=v=>v===undefined?'[missing]':v&&typeof v==='object'?'['+(Array.isArray(v)?'array':'object')+']':v;
 return {path:at,baseline:brief(a),candidate:brief(b)};
}

function compareReports(baseline,candidate,{baselinePath='baseline.json',candidatePath='candidate.json',allowSubset=false,readPNG=file=>fs.readFileSync(file)}={}){
 const failures=[],scenes=[],sweeps=[],pngFiles=[],coverage={baselineOnly:[],candidateOnly:[],unpairedSweeps:[]};let checks=0;
 const check=(condition,at,message,detail)=>{checks++;if(!condition)failures.push({at,message,...(detail?{detail}: {})});};
 const same=(a,b,at,message='Values must be deeply equal')=>check(isDeepStrictEqual(a,b),at,message,firstDifference(a,b));
 const hash=(value,at)=>check(typeof value==='string'&&SHA.test(value),at,'A complete SHA-256 is required');
 const zero=(value,at)=>check(value===0,at,'Expected an observed zero, not a missing value');
 const walk=(value,visit,at='')=>{if(!value||typeof value!=='object')return;visit(value,at);for(const [key,child]of Object.entries(value))walk(child,visit,at+(Array.isArray(value)?'['+key+']':'.'+key));};

 function validate(report,label,reportPath){
  same(report.status,SUCCESS,label+'.status','Only completed native acceptance reports are comparable');
  same(report.errors,[],label+'.errors');
  check(report.allTimingFinished===true,label+'.allTimingFinished','Image evidence must follow all planned timing');
  for(const [planned,key]of [['plannedSweep','continuousLODSweep'],['plannedDefocusedSweep','defocusedLODSweep']])if(report[planned]===true)check(!!report[key],label+'.'+key,'A planned sweep cannot be omitted from a completed report');
  check(['desktop','touch'].includes(report.profile),label+'.profile','Known profile required');
  hash(report.harnessSHA256,label+'.harnessSHA256');
  check(Array.isArray(report.sourceHashes)&&report.sourceHashes.length>0,label+'.sourceHashes','Retained source hashes required');
  const sources=new Set();for(const source of report.sourceHashes||[]){check(typeof source.file==='string'&&!sources.has(source.file),label+'.sourceHashes','Source names must be unique');sources.add(source.file);hash(source.sha256,label+'.sourceHashes.'+source.file);}
  const initial=report.meta?.initial,restored=report.restored;
  check(!!initial,label+'.meta.initial','Initial renderer configuration required');
  for(const key of ['restored','methodsRestored','originalIdentityPreserved','adaptive'])check(restored?.[key]===true,label+'.restored.'+key,'Successful explicit restoration required');
  zero(restored?.ownedBatchCount,label+'.restored.ownedBatchCount');zero(restored?.gl,label+'.restored.gl');
  for(const key of ['quality','scale','msaa','floatColor']){
   check(initial?.[key]!==undefined,label+'.meta.initial.'+key,'Initial value required');
   same(restored?.[key],initial?.[key],label+'.restored.'+key,'Original renderer configuration must be restored');
  }
  check(Array.isArray(report.scenes)&&report.scenes.length>0,label+'.scenes','At least one completed scene is required');
  const ids=new Set();for(const scene of report.scenes||[]){
   const at=label+'.scenes.'+scene.id;
   check(typeof scene.id==='string'&&!ids.has(scene.id),at,'Scene IDs must be present and unique');ids.add(scene.id);
   check(!!scene.config&&!!scene.conditions,at,'Scene config and conditions required');
   check(scene.conditions?.quality!==undefined,at+'.conditions.quality','Observed quality is required');
   same(scene.images?.map(image=>image.mode),MODES,at+'.images.modes','Exactly off/on/on/off image evidence required');
   const images=scene.images||[];
   images.forEach((image,index)=>{
    const where=at+'.images['+index+']';hash(image.rgbaSHA256,where+'.rgbaSHA256');hash(image.pngSHA256,where+'.pngSHA256');hash(image.opaque?.sha256,where+'.opaque.sha256');
    check(image.opaque?.byteExactAcrossModes===true,where+'.opaque.byteExactAcrossModes','Opaque byte identity must be observed');
    zero(image.repeatedDifferences,where+'.repeatedDifferences');zero(image.outsideCap,where+'.outsideCap');zero(image.state?.gl,where+'.state.gl');
    same(image.repeated,index>=2,where+'.repeated');
    check(Number.isInteger(image.width)&&image.width>0&&Number.isInteger(image.height)&&image.height>0,where+'.dimensions','Nonempty measured framebuffer required');
    for(const key of ['cull','blend'])same(image.state?.final?.[key],false,where+'.state.final.'+key);
    same(image.state?.final?.depthWrite,true,where+'.state.final.depthWrite');
    for(const [i,pair]of (image.state?.shellStates||[]).entries())same(pair.before,pair.after,where+'.state.shellStates['+i+']','Shell entry/exit GL state must match');
    if(image.occlusion?.coveredChangedPixels!==undefined)zero(image.occlusion.coveredChangedPixels,where+'.occlusion.coveredChangedPixels');
    for(const [i,bin]of (image.occlusion?.edgeDepth?.bins||[]).entries())zero(bin.changedPixels,where+'.occlusion.edgeDepth.bins['+i+'].changedPixels');
   });
   if(images.length===4){for(const [a,b]of [[0,3],[1,2]])same(images[a].rgbaSHA256,images[b].rgbaSHA256,at+'.repeat['+a+','+b+']','Repeat identity is checked independently of reported difference counts');for(const image of images)same(image.opaque?.sha256,images[0].opaque?.sha256,at+'.opaqueAcrossModes');}
  }
  walk(report,(value,at)=>{
   for(const key of ['gl','readbackGL'])if(Object.hasOwn(value,key))zero(value[key],label+at+'.'+key);
   if(Object.hasOwn(value,'disjoint'))same(value.disjoint,false,label+at+'.disjoint');
   if(Object.hasOwn(value,'gpuMs'))check(Number.isFinite(value.gpuMs)&&value.gpuMs>0,label+at+'.gpuMs','A raw elapsed GPU sample must be finite and positive; signed comparisons are retained separately');
   if(typeof value.path!=='string'||!(/\.png$/i.test(value.path)||Object.hasOwn(value,'pngSHA256')))return;
   const file=path.isAbsolute(value.path)?value.path:path.resolve(path.dirname(reportPath),value.path);
   hash(value.pngSHA256,label+at+'.pngSHA256');
   try{const bytes=readPNG(file),actual=sha(bytes);same(actual,value.pngSHA256,label+at+'.fileSHA256','PNG bytes must match their retained report hash');check(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),label+at+'.fileSignature','Referenced image must be a PNG');pngFiles.push({report:label,at,file,bytes:bytes.length,sha256:actual});}
   catch(error){check(false,label+at+'.path','Cannot read retained PNG',{file,error:error.message});}
  });
  return new Map((report.scenes||[]).map(scene=>[scene.id,scene]));
 }

 const left=validate(baseline,'baseline',baselinePath),right=validate(candidate,'candidate',candidatePath);
 same(baseline.profile,candidate.profile,'profile');
 for(const key of ['quality','scale','msaa','floatColor','adaptive'])same(baseline.meta?.initial?.[key],candidate.meta?.initial?.[key],'meta.initial.'+key);
 for(const key of ['singleSample','rgba8'])same(baseline[key],candidate[key],key,'Visual override configuration must match');
 same(baseline.meta?.controlledOverride,candidate.meta?.controlledOverride,'meta.controlledOverride');
 coverage.baselineOnly=[...left.keys()].filter(id=>!right.has(id));coverage.candidateOnly=[...right.keys()].filter(id=>!left.has(id));
 if(!allowSubset)same([...left.keys()].sort(),[...right.keys()].sort(),'sceneIDs','Default comparison requires the complete same scene set; --allow-subset is explicit');
 const matched=[...left.keys()].filter(id=>right.has(id));check(matched.length>0,'matchedScenes','At least one matching scene is required');

 // Keep all reported samples and signed summaries. Never filter out a slow or
 // invalid sample to manufacture a performance decision from this comparison.
 const timings=scene=>Object.fromEntries(Object.entries(scene).filter(([key])=>/gpu|timing|blocks|comparison|rapidpair/i.test(key)));
 for(const id of matched){
  const a=left.get(id),b=right.get(id),at='scenes.'+id;
  same(a.config,b.config,at+'.config');same(a.conditions,b.conditions,at+'.conditions');
  const imageEvidence=[];for(let i=0;i<MODES.length;i++){
   const x=a.images?.[i],y=b.images?.[i];if(!x||!y)continue;
   for(const key of ['mode','width','height','rgbaSHA256'])same(x[key],y[key],at+'.images['+i+'].'+key);
   same(x.opaque,y.opaque,at+'.images['+i+'].opaque','Complete opaque readback identity and format must match');
   imageEvidence.push({index:i,mode:x.mode,baselineRGBA:x.rgbaSHA256,candidateRGBA:y.rgbaSHA256,baselineOpaque:x.opaque?.sha256,candidateOpaque:y.opaque?.sha256});
  }
  scenes.push({id,images:imageEvidence,timing:{baseline:timings(a),candidate:timings(b),decision:'not-assessed',note:'All positive and negative reported GPU values retained; equality is not a performance significance test.'}});
 }

 function validateSweep(sweep,label){
  check(Array.isArray(sweep.frames)&&sweep.frames.length>0,label+'.frames','A declared sweep must contain completed frames');
  same(sweep.completedFrames,sweep.frames?.length,label+'.completedFrames');
  check(Number.isInteger(sweep.transitionFrames)&&sweep.transitionFrames>0,label+'.transitionFrames','Real LOD transition evidence required');
  const seen=new Set();for(const [i,frame]of (sweep.frames||[]).entries()){
   const at=label+'.frames['+i+']';same(frame.index,i,at+'.index');check(!seen.has(frame.index),at+'.index','No duplicate frame');seen.add(frame.index);
   same(frame.completed,true,at+'.completed');zero(frame.gl,at+'.gl');zero(frame.readbackGL,at+'.readbackGL');hash(frame.target?.rgbaSHA256,at+'.target.rgbaSHA256');
   check(frame.target?.maxRGB>15&&frame.target?.nonBlackPixels>8,at+'.target','Existing non-black sweep gate must hold');
   if(sweep.defocused){check(Number.isFinite(frame.shellDelta?.L1PerProjectedCapPixel)&&frame.shellDelta.L1PerProjectedCapPixel>0,at+'.shellDelta','Measured normalized shell delta required');}
  }
 }
 for(const key of ['continuousLODSweep','defocusedLODSweep']){
  const a=baseline[key],b=candidate[key];if(a)validateSweep(a,'baseline.'+key);if(b)validateSweep(b,'candidate.'+key);
  if(!a&&!b)continue;
  if(!a||!b){coverage.unpairedSweeps.push({key,presentIn:a?'baseline':'candidate'});if(!allowSubset)check(false,key,'Default comparison requires matching sweep coverage');continue;}
  same(a.prepared?.config,b.prepared?.config,key+'.prepared.config');same(a.prepared?.conditions,b.prepared?.conditions,key+'.prepared.conditions');
  same(a.defocused,b.defocused,key+'.defocused');same(a.boundary,b.boundary,key+'.boundary');same(a.frames?.length,b.frames?.length,key+'.frameCount');
  const frames=[];for(let i=0;i<Math.min(a.frames?.length||0,b.frames?.length||0);i++){
   const x=a.frames[i],y=b.frames[i],at=key+'.frames['+i+']';
   for(const field of ['index','camera','aim','time','distance','quality','scale','msaa','lod','target','shellDelta','normalizedDelta'])same(x[field],y[field],at+'.'+field);
   frames.push({index:i,baselineRGBA:x.target?.rgbaSHA256,candidateRGBA:y.target?.rgbaSHA256,baselineNormalizedDelta:x.shellDelta?.L1PerProjectedCapPixel??x.normalizedDelta??null,candidateNormalizedDelta:y.shellDelta?.L1PerProjectedCapPixel??y.normalizedDelta??null});
  }
  sweeps.push({key,frames});
 }
 const fullCoverage=!coverage.baselineOnly.length&&!coverage.candidateOnly.length&&!coverage.unpairedSweeps.length;
 return {passed:failures.length===0,status:failures.length?'failed':fullCoverage?'passed-full-evidence-set':'passed-matched-scenes-only',checks,allowSubset,fullCoverage,coverage,failures,scenes,sweeps,pngFiles,performanceDecision:'not-assessed'};
}

function selfTest(){
 // A tiny PNG and report exist only in memory. No evidence files are rewritten.
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6gB8AAAAASUVORK5CYII=','base64'),pngHash=sha(png),conditions={quality:2,scale:1,camera:[0,0,0]},off=sha('off pixels'),on=sha('on pixels');
 const initial={quality:2,scale:1,msaa:4,floatColor:true,adaptive:true};
 const r={status:SUCCESS,profile:'desktop',allTimingFinished:true,errors:[],harnessSHA256:sha('harness'),sourceHashes:[{file:'src/engine.js',sha256:sha('engine')}],singleSample:false,rgba8:false,meta:{initial,controlledOverride:null},restored:{...initial,restored:true,methodsRestored:true,originalIdentityPreserved:true,ownedBatchCount:0,gl:0},scenes:[{id:'fixture',config:{id:'fixture'},conditions,blocks:[],images:MODES.map((mode,i)=>({mode,width:1,height:1,rgbaSHA256:mode==='off'?off:on,pngSHA256:pngHash,...(i<2?{path:'/in-memory/'+mode+'.png'}:{}),opaque:{sha256:sha('opaque'),format:6408,type:5126,byteExactAcrossModes:true},repeated:i>=2,repeatedDifferences:0,outsideCap:0,state:{gl:0,final:{cull:false,blend:false,depthWrite:true},shellStates:[]}}))}]};
 const compare=(a,b,options={})=>compareReports(a,b,{readPNG:()=>png,...options}),positive=compare(r,copy(r));
 if(!positive.passed)throw Error('Self-test positive rejected: '+JSON.stringify(positive.failures));
 const changed=copy(r),original=changed.scenes[0].images[1].rgbaSHA256;changed.scenes[0].images[1].rgbaSHA256=(original[0]==='0'?'1':'0')+original.slice(1);
 const negative=compare(r,changed);if(negative.passed||!negative.failures.some(f=>f.at==='scenes.fixture.images[1].rgbaSHA256'))throw Error('Self-test accepted a one-digit on-pixel hash mutation');
 if(r.scenes[0].images[1].rgbaSHA256!==original)throw Error('Self-test mutated its original report');
 const alteredPNG=compare(r,copy(r),{readPNG:()=>Buffer.concat([png,Buffer.from([0])])});if(alteredPNG.passed||!alteredPNG.failures.some(f=>f.at.endsWith('.fileSHA256')))throw Error('Self-test accepted changed PNG bytes');
 const subset=copy(r);subset.scenes.push({...copy(subset.scenes[0]),id:'extra'});if(compare(r,subset).passed)throw Error('Self-test accepted an implicit scene subset');const explicit=compare(r,subset,{allowSubset:true});if(!explicit.passed||explicit.status!=='passed-matched-scenes-only')throw Error('Self-test lost explicit partial coverage');
 return {passed:true,positive:true,oneDigitOnHashRejected:true,changedPNGRejected:true,implicitSubsetRejected:true,explicitSubsetLabelled:true,originalReportUnchanged:true,note:'Memory-only controls; no report or PNG file was modified.'};
}

function main(){
 const args=process.argv.slice(2),option=key=>args.find(arg=>arg.startsWith('--'+key+'='))?.slice(key.length+3);
 if(args.includes('--self-test')){console.log(JSON.stringify(selfTest(),null,2));return;}
 const baselineArg=option('baseline'),candidateArg=option('candidate'),outArg=option('out');
 if(!baselineArg||!candidateArg)throw Error('Usage: node transparent-filter-equivalence.cjs --baseline=report.json --candidate=report.json [--out=equivalence.json] [--allow-subset]');
 const baselinePath=path.resolve(baselineArg),candidatePath=path.resolve(candidateArg),output=outArg?path.resolve(outArg):null;
 if(output===baselinePath||output===candidatePath)throw Error('Output must not overwrite either source report');
 const a=fs.readFileSync(baselinePath),b=fs.readFileSync(candidatePath),baseline=JSON.parse(a),candidate=JSON.parse(b);
 const result=compareReports(baseline,candidate,{baselinePath,candidatePath,allowSubset:args.includes('--allow-subset')});
 if(output&&result.pngFiles.some(file=>file.file===output))throw Error('Output must not overwrite a retained PNG');
 const report={schema:'transparent-filter-equivalence-v1',toolSHA256:sha(fs.readFileSync(__filename)),command:process.argv.slice(),inputs:{baseline:{path:baselinePath,reportSHA256:sha(a),sourceHashes:baseline.sourceHashes,harnessSHA256:baseline.harnessSHA256,command:baseline.command},candidate:{path:candidatePath,reportSHA256:sha(b),sourceHashes:candidate.sourceHashes,harnessSHA256:candidate.harnessSHA256,command:candidate.command}},selfTest:selfTest(),...result,limits:'Recorded native evidence only. No new rendering, shader simulation, GPU significance decision, physical-phone validation or full-product acceptance.'};
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,matchedScenes:report.scenes.length,sweeps:report.sweeps.length,verifiedPNGs:report.pngFiles.length,failures:report.failures.length,performanceDecision:report.performanceDecision,output}));}else console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
module.exports={compareReports,selfTest};
if(require.main===module){try{main();}catch(error){console.error(error.stack||String(error));process.exitCode=1;}}
