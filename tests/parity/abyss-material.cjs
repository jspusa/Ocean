/* CPU source-driven regression: executes the actual scalar kind-10 GLSL block
 * through a deliberately bounded JS syntax adapter, against actual mesh samples.
 * This is not native GLSL execution, shader compilation, pixels or GPU timing. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..'),BASELINE='5c43505718075b164e05039d3ad926df02d869b6';
const arg=(key,fallback)=>process.argv.find(x=>x.startsWith('--'+key+'='))?.slice(key.length+3)||fallback;
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a);assert(Number.isFinite(l)&&l>1e-12,'finite nonzero normal');return a.map(x=>x/l);},diff=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function blockAt(source,pattern){const match=pattern.exec(source);assert(match,'Missing source block '+pattern);const open=source.indexOf('{',match.index),start=open+1;let depth=1,end=start;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}assert.equal(depth,0,'balanced production block');return {start:match.index,end,body:source.slice(start,end-1),whole:source.slice(match.index,end)};}
function kind10(vertex){return blockAt(strip(vertex),/\bif\s*\(\s*uKind\s*==\s*10\s*\)\s*\{/);}
// A bounded expression parser, rather than a second copy of the skin formula.
// GLSL scalar/vector operators are evaluated component-wise; unknown syntax,
// calls, bindings and swizzles fail closed. The production RHS is the input.
function compileMaterialExpression(source){
 source=source.trim();
 const token=/\s*((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|[().,+*/-])/gy,tokens=[];let at=0,m;
 while(at<source.length){token.lastIndex=at;m=token.exec(source);assert(m,'Unsupported material expression near '+source.slice(at));tokens.push(m[1]);at=token.lastIndex;}
 let i=0;const take=t=>{assert.equal(tokens[i++],t,'material expression token');};
 function primary(){let node,t=tokens[i++];assert(t,'Missing expression');if(t==='('){node=expression();take(')');}else if(t==='-')node={op:'neg',a:primary()};else if(/^(?:\d|\.\d)/.test(t))node={op:'value',value:Number(t)};else{assert(/^[A-Za-z_]\w*$/.test(t),'Invalid atom '+t);if(tokens[i]==='('){i++;const args=[];if(tokens[i]!==')'){do{args.push(expression());if(tokens[i]!==',')break;i++;}while(true);}take(')');assert(['vec3','max','smoothstep','mix'].includes(t),'Unsupported material call '+t);node={op:'call',name:t,args};}else node={op:'name',name:t};}while(tokens[i]==='.'){i++;const field=tokens[i++];assert(['r','g','b','x','y','z'].includes(field),'Unsupported material swizzle');node={op:'field',a:node,index:'rgb'.includes(field)?'rgb'.indexOf(field):'xyz'.indexOf(field)};}return node;}
 function product(){let node=primary();while(['*','/'].includes(tokens[i])){const op=tokens[i++];node={op,a:node,b:primary()};}return node;}
 function expression(){let node=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++];node={op,a:node,b:product()};}return node;}
 const tree=expression();assert.equal(i,tokens.length,'Trailing material expression');
 const component=(fn,...args)=>args.some(Array.isArray)?[0,1,2].map(k=>fn(...args.map(a=>Array.isArray(a)?a[k]:a))):fn(...args);
 function evaluate(node,env){if(node.op==='value')return node.value;if(node.op==='name'){assert(Object.hasOwn(env,node.name),'Missing material binding '+node.name);return env[node.name];}if(node.op==='field'){const a=evaluate(node.a,env);assert(Array.isArray(a)&&a.length===3);return a[node.index];}if(node.op==='neg')return component(a=>-a,evaluate(node.a,env));if(node.op==='call'){const a=node.args.map(n=>evaluate(n,env));if(node.name==='vec3'){assert(a.length===1||a.length===3);return a.length===1?[a[0],a[0],a[0]]:a;}if(node.name==='max'){assert.equal(a.length,2);return component(Math.max,...a);}assert.equal(a.length,3);return node.name==='smoothstep'?component(smoothstep,...a):component((x,y,t)=>x*(1-t)+y*t,...a);}const a=evaluate(node.a,env),b=evaluate(node.b,env),fn={'+':(x,y)=>x+y,'-':(x,y)=>x-y,'*':(x,y)=>x*y,'/':(x,y)=>x/y}[node.op];assert(fn);return component(fn,a,b);}
 return env=>evaluate(tree,env);
}
function compileRig(body){
 // There is no hand-written species deformation. Preserve all production
 // arithmetic/control-flow exactly, replacing only the scalar declaration type.
 assert(!/\b(?:vec[234]|mat[234]|for|while|switch|return|discard|texture|dFdx|dFdy)\b|[\[\]`]/.test(body),'Unsupported GLSL; extend and review adapter explicitly');
 const translated=body.replace(/\b(?:float|bool|int)\s+/g,'let '),known=new Set(['sin','cos','abs','sign','max','min','clamp','smoothstep','pow','sqrt']);
 for(const m of translated.matchAll(/\b([A-Za-z_]\w*)\s*\(/g))assert(['if','else'].includes(m[1])||known.has(m[1]),'Unknown scalar function '+m[1]);
 const execute=new Function('p','n','aPosition','aTag','aPose','aExtra','uSpecies','uTime','sin','cos','abs','sign','max','min','clamp','smoothstep','pow','sqrt',translated+'\nreturn {p:[p.x,p.y,p.z],n:[n.x,n.y,n.z]};');
 const vec=a=>({x:a[0],y:a[1],z:a[2]});
 return (sample,pose)=>execute(vec(sample.p),vec(sample.n),vec(sample.p),sample.tag,{x:0,y:pose.effort,z:0,w:pose.rate},{x:pose.phase,y:0},sample.species,pose.time,Math.sin,Math.cos,Math.abs,Math.sign,Math.max,Math.min,clamp,smoothstep,Math.pow,Math.sqrt);
}
function shaderValues(source){return vm.runInNewContext(source+'\n({VS,FS,imported:importedFishShaderSources()})',{console},{timeout:10000});}
function collectMeshes(source){
 const c=vm.createContext({console}),hashes={};
 for(const name of ['engine','world','reef_detail','next_reef','open_world','fauna','cetaceans','abyss_fauna']){const text=name==='engine'?source:fs.readFileSync(path.join(ROOT,'src',name+'.js'),'utf8');hashes[name+'.js']=sha(text);vm.runInContext(text,c,{filename:name+'.js'});}
 const build=vm.runInContext('faunaGeometry',c),catalogue=vm.runInContext('SPECIES',c),meshes=[];
 for(const [id,expected]of [['coelacanth',27],['pelican_eel',29],['humpback_anglerfish',30]])for(const low of [false,true]){
  const species=catalogue.findIndex(s=>s.id===id),sp=catalogue[species],g=build(id,low),unique=new Map();assert.equal(species,expected,'review species routing changes');
  for(let i=0;i<g.v.length;i+=12){const row=Array.from(g.v.slice(i,i+12)),key=row.slice(0,6).concat(row[11]).join(',');if(!unique.has(key))unique.set(key,{species,tag:row[11],p:row.slice(0,3),n:row.slice(3,6),color:row.slice(6,9)});}
  const all=[...unique.values()],groups=new Map();for(const s of all){if(!groups.has(s.tag))groups.set(s.tag,[]);groups.get(s.tag).push(s);}
  const samples=[];for(const rows of groups.values()){const count=Math.min(rows.length,72);for(let i=0;i<count;i++)samples.push(rows[Math.floor(i*rows.length/count)]);}
  meshes.push({id,lod:low?'low':'high',species,rate:sp.motionProfile.beat,all,samples,groups});
 }
 return {c,meshes,hashes};
}
function differential(rig,sample,pose){
 const n=unit(sample.n),axis=Math.abs(n[1])<.8?[0,1,0]:[1,0,0],t=unit(cross(axis,n)),b=cross(n,t),h=1e-6;
 const tangent=v=>{const lo={...sample,p:sample.p.map((x,i)=>x-v[i]*h)},hi={...sample,p:sample.p.map((x,i)=>x+v[i]*h)},a=rig(lo,pose).p,c=rig(hi,pose).p;return c.map((x,i)=>(x-a[i])/(2*h));};
 const normal=unit(cross(tangent(t),tangent(b))),actual=unit(rig(sample,pose).n);
 return {error:diff(normal,actual),angleDegrees:Math.acos(clamp(dot(normal,actual),-1,1))*180/Math.PI,normal,actual};
}
function projectedInterior(points){
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),center=[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/3),up=unit(sub(points[1],points[0])),normal=unit(cross(up,sub(points[2],points[0]))),right=unit(cross(up,normal)),projected=points.map(p=>{const d=sub(p,center);return [dot(d,right),dot(d,up)];}),half=[0,1].map(i=>Math.max(...projected.map(p=>Math.abs(p[i])))*1.35),q=projected.map(p=>p.map((x,i)=>48+x/half[i]*48));
 const inside=(x,y)=>{const signs=q.map((a,i)=>{const b=q[(i+1)%3];return (x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);});return signs.every(v=>v>=0)||signs.every(v=>v<=0);};
 let count=0;for(let y=42;y<54;y++)for(let x=42;x<54;x++){let valid=true;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(!inside(x+dx+.5,y+dy+.5))valid=false;if(valid)count++;}return count;
}
function measure(rig,meshes){
 const rows=[];
 for(const mesh of meshes){let maximum=0,angle=0,count=0,kinks=0,witness=null;const tags={};
  for(const sample of mesh.samples)for(const effort of [.08,1])for(let phase=0;phase<16;phase++){
   const pose={effort,rate:mesh.rate,phase:phase*2*Math.PI/16,time:.371};
   // h=max(0,y-.19) has no two-sided derivative at the exact boundary. Its
   // normal is tested on real samples on both sides; retain the excluded count.
   if(sample.species===30&&sample.tag>4.5&&Math.abs(sample.p[1]-.19)<2e-6){kinks++;continue;}
   const r=differential(rig,sample,pose);count++;tags[sample.tag]=(tags[sample.tag]||0)+1;if(r.error>maximum){maximum=r.error;angle=r.angleDegrees;witness={sample,pose,...r};}
  }
  rows.push({id:mesh.id,lod:mesh.lod,actualUniqueVertices:mesh.all.length,stratifiedMeshSamples:mesh.samples.length,vertexPoseChecks:count,exactNondifferentiableBoundaryExclusions:kinks,byTag:tags,maxNormalComponentError:maximum,angleAtWorstComponentError:angle,witness});
 }
 return rows;
}
function run(){
 const enginePath=path.resolve(ROOT,arg('engine','src/engine.js')),source=fs.readFileSync(enginePath,'utf8'),baseline=cp.execFileSync('git',['show',BASELINE+':src/engine.js'],{cwd:ROOT,encoding:'utf8'}),candidate=shaderValues(source),previous=shaderValues(baseline),currentBlock=kind10(candidate.VS),oldBlock=kind10(previous.VS),rig=compileRig(currentBlock.body),oldRig=compileRig(oldBlock.body),{c,meshes,hashes}=collectMeshes(source);
 const report={status:'running',scope:'CPU bounded syntax execution of actual production scalar GLSL plus independent finite differences on real mesh samples. Not native GLSL compilation, shader float32 rounding, rendered material appearance, FPS or physical-phone evidence.',baseline:BASELINE,enginePath,engineSHA256:sha(source),baselineEngineSHA256:sha(baseline),actualRigSource:currentBlock.body,adapterSHA256:sha(fs.readFileSync(__filename)),sourceSHA256:hashes,checks:[]};
 const check=(name,fn)=>{try{report.checks.push({name,passed:true,detail:fn()});}catch(e){report.checks.push({name,passed:false,error:e.stack});}};
 check('bounded adapter executes the actual kind10 block and rejects unsupported syntax',()=>{assert(currentBlock.body.includes('p.z+=')&&currentBlock.body.includes('n.x-='));assert.throws(()=>compileRig('vec3 z=vec3(1.);'));assert.throws(()=>compileRig('float z=unknown(1.);'));return {sourceSHA256:sha(currentBlock.body),actualSourceCharacters:currentBlock.body.length,adapter:'declaration types only; scalar math bound to JS Math'};});
 check('non-abyss production vertex deformation remains unchanged',()=>{assert.equal(strip(candidate.VS).replace(currentBlock.whole,'KIND10'),strip(previous.VS).replace(oldBlock.whole,'KIND10'));return {outsideKind10SHA256:sha(strip(candidate.VS).replace(currentBlock.whole,'KIND10'))};});
 check('all actual mesh vertices retain exact v45 positions across phase and effort',()=>{const rows=[];for(const mesh of meshes){let n=0,max=0,witness;for(const s of mesh.all)for(const effort of [.08,1])for(const phase of [0,.93,2.27,4.91]){const pose={effort,rate:mesh.rate,phase,time:.371},a=rig(s,pose).p,b=oldRig(s,pose).p,error=diff(a,b);n++;if(error>max){max=error;witness={s,pose,a,b};}}rows.push({id:mesh.id,lod:mesh.lod,vertexPoseChecks:n,maxPositionDifference:max,witness});assert.equal(max,0,mesh.id+' '+mesh.lod+' changed production position mapping');}return rows;});
 const measured=measure(rig,meshes);report.normalDiagnostics=measured;
 check('actual shader normals follow independently deformed actual-mesh tangent planes',()=>{for(const row of measured){assert(row.vertexPoseChecks>1000);assert(row.maxNormalComponentError<3e-6,row.id+' '+row.lod+' normal error '+row.maxNormalComponentError);assert(row.byTag['1']>0&&row.byTag['3']>0,'body and fin coverage');}return measured.map(({witness,...r})=>r);});
 check('v45 and removal of production normal assignments fail the same differential threshold',()=>{const broken=currentBlock.body.replace(/\bn\.[xyz]\s*(?:[+*/-]?=)[^;]+;/g,';');assert.notEqual(broken,currentBlock.body);const controls=[['fixed-v45-source',oldRig],['deleted-normal-assignments',compileRig(broken)]].map(([name,run])=>({name,rows:measure(run,meshes)}));for(const control of controls)for(const id of ['coelacanth','pelican_eel','humpback_anglerfish'])assert(control.rows.some(r=>r.id===id&&r.maxNormalComponentError>1e-3),control.name+' failed to detect '+id);return controls.map(({name,rows})=>({name,failures:rows.filter(r=>r.maxNormalComponentError>=3e-6).map(({id,lod,maxNormalComponentError})=>({id,lod,maxNormalComponentError}))}));});
 check('actual imported shader generator still resolves its strict anchors',()=>{assert(candidate.imported.vertex.includes('deformImportedFish(p,n,tangent,uTime)'));assert(candidate.imported.fragment.includes('const vec4 uSurfaceProfile=vec4(-1.,0.,1.,-1.);'));assert(candidate.imported.fragment.includes('vec3 varianceNormal=geomN;'));return {vertexSHA256:sha(candidate.imported.vertex),fragmentSHA256:sha(candidate.imported.fragment)};});
 check('production material uniforms retain per-species authored profiles',()=>{const Renderer=vm.runInContext('Renderer',c),renderer=Object.create(Renderer.prototype),calls=[];renderer.set1i=()=>{};renderer.set4f=(p,name,...values)=>calls.push({name,values});for(const [species,expected]of [[27,[.70,.10,96,0]],[29,[.72,.09,46,0]],[30,[.81,.08,38,0]]]){calls.length=0;renderer.speciesUniforms({}, {species});assert.deepEqual(calls,[{name:'uSurfaceProfile',values:expected}]);}return {species:[27,29,30],actualMethod:'Renderer.speciesUniforms'};});
 check('new abyss material stays within its explicit source seam and existing samplers',()=>{const begin=candidate.FS.indexOf('// Abyss skin:'),end=candidate.FS.indexOf('// End abyss skin.',begin);assert(begin>=0&&end>begin,'new material seam required');const body=candidate.FS.slice(begin,end),samplers=s=>strip(s).match(/uniform\s+(?:(?:lowp|mediump|highp)\s+)?sampler\w+\s+\w+\s*;/g)||[];assert.deepEqual(samplers(candidate.FS),samplers(previous.FS),'No new material sampler');assert(!/\b(?:texture|textureLod|texelFetch|for|while|discard)\s*\(/.test(strip(body)),'No added texture sample, loop or discarded surface');assert(!/\b(?:coverage|uExposure|uTorchParams)\s*[*+/-]?=/.test(strip(body)),'Do not alter coverage/global light');return {seamSHA256:sha(body),samplers:samplers(candidate.FS),seamCharacters:body.length};});
 check('actual material tag predicates exclude oral lining, eyes, lure and photophores',()=>{
  const begin=candidate.FS.indexOf('// Abyss skin:'),end=candidate.FS.indexOf('// End abyss skin.',begin),seam=strip(candidate.FS.slice(begin,end)),declaration=seam.match(/\bbool\s+body\s*=[^;]+;/)?.[0];assert(declaration,'explicit production tissue predicate');
  const evaluate=text=>new Function('vTag',text.replace(/^bool\s+/,'let ')+'return {body,fin};');
  const route=evaluate(declaration),rows=[];for(const tag of [1,2,3,4,5,6]){const r=route(tag);rows.push({tag,...r});assert.equal(r.body,tag===1);assert.equal(r.fin,tag===3);}
  const mutate=declaration.replace('vTag<1.5','vTag<2.5');assert.notEqual(mutate,declaration);assert(evaluate(mutate)(2).body,'negative control must incorrectly admit oral tag2');
  assert(/if\s*\(uSpecies==27&&\(body\|\|fin\)\)/.test(seam)&&/else if\s*\(\(uSpecies==29\|\|uSpecies==30\)&&\(body\|\|fin\)\)/.test(seam),'actual species branches must be gated by tissue predicates');
  assert(/if\s*\(uQuality>0\)n=materialSurfaceNormal\(n,height,resolve\)/.test(seam),'quality0 excludes derivative normal application');return {sourceDeclaration:declaration,rows,negativeControl:'oral tag2 rejected under original predicate, wrongly admitted after boundary mutation'};
 });
 check('actual coelacanth mouth/gill predicate protects real dark creases independently of tint',()=>{
  const coel=blockAt(strip(candidate.FS),/if\s*\(uSpecies==27&&\(body\|\|fin\)\)\s*\{/).body,skinSource=coel.match(/\bfloat\s+skin\s*=\s*([^;]+);/)?.[1],blendSource=coel.match(/\bbase\s*=\s*([^;]+);/)?.[1];assert(skinSource&&blendSource,'Production skin/blend RHS must exist');
  const skin=compileMaterialExpression(skinSource),blend=compileMaterialExpression(blendSource),oldSource='smoothstep(.14,.24,max(base.r,max(base.g,base.b)))',old=compileMaterialExpression(oldSource);
  assert.deepEqual(compileMaterialExpression('(vec3(.2,.3,.4)/vec3(.5)).b')({}),.8);assert.throws(()=>compileMaterialExpression('sin(base.r)'));assert.throws(()=>compileMaterialExpression('base.xyz'));
  const tints=[[1,1,1],...[.92,1.04].flatMap(p=>[-.0225,.0225].map(w=>[p*(1+w),p,p*(1-w*.60)])),[.25,1.8,.4],[1.9,.3,1.5],[.06,.09,.012],[4,2,.01]],rows=[],badRows=[];
  for(const mesh of meshes.filter(m=>m.id==='coelacanth')){
   // Anatomy labels are independent of the shader's blue-channel predicate.
   // Far trunk and all fins are controls; narrow, authored mouth/gill regions
   // sample the dark lines themselves, rather than selecting by skin output.
   const groups={mouth:mesh.all.filter(s=>s.tag===1&&s.p[0]>.36&&s.p[0]<.50&&Math.abs(s.p[1]+.029+(s.p[0]-.40)*.035)<.0035),gill:mesh.all.filter(s=>s.tag===1&&s.p[0]>.16&&s.p[0]<.25&&Math.abs(s.p[0]-(.185+.055*((s.p[1]+.018)/.13)**2))<.005&&Math.abs(s.p[2])>.075),body:mesh.all.filter(s=>s.tag===1&&s.p[0]<.10&&s.p[0]>-.25),fin:mesh.all.filter(s=>s.tag===3)};
   for(const [part,samples]of Object.entries(groups)){
    assert(samples.length>=4,mesh.lod+' empty '+part);if(part==='mouth'||part==='gill')assert(samples.some(s=>s.p[2]>0)&&samples.some(s=>s.p[2]<0),'both anatomical sides required');
    const expected=part==='mouth'||part==='gill'?0:1;let minimum=1,maximum=0,maxBlendChange=0,oldMinimum=1,oldMaximum=0,checks=0,witness;
    for(const sample of samples)for(const rawTint of tints){
     const vTint=rawTint.map(Math.fround),base=sample.color.map((x,i)=>Math.max(.001,Math.fround(Math.fround(x)*vTint[i]))),env={base,vTint},value=skin(env),previous=old(env),painted=blend({...env,skin:value,blotch:1,patchFade:1}),change=diff(base,painted);assert(Number.isFinite(value)&&painted.every(Number.isFinite));minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);oldMinimum=Math.min(oldMinimum,previous);oldMaximum=Math.max(oldMaximum,previous);maxBlendChange=Math.max(maxBlendChange,change);checks++;if(!witness||previous>witness.oldMask)witness={position:sample.p,authoredColor:sample.color,tint:vTint,base,mask:value,oldMask:previous};
    }
    const row={lod:mesh.lod,part,uniqueVertices:samples.length,tintCount:tints.length,checks,expected,maskRange:[minimum,maximum],maxFullBlotchBlendChange:maxBlendChange,rawBlueRange:[Math.min(...samples.map(s=>s.color[2])),Math.max(...samples.map(s=>s.color[2]))],witness};rows.push(row);badRows.push({...row,maskRange:[oldMinimum,oldMaximum]});
   }
  }
  const accept=values=>{for(const r of values)assert(r.maskRange.every(v=>Math.abs(v-r.expected)<1e-12),r.lod+' '+r.part+' unexpected skin mask '+r.maskRange);};accept(rows);assert.throws(()=>accept(badRows),'historical maxRGB predicate must fail the identical material gate');for(const r of rows){if(r.expected===0)assert.equal(r.maxFullBlotchBlendChange,0,'strong crease changed under full blotch');else assert(r.maxFullBlotchBlendChange>.01,'ordinary skin/fin blotch became a no-op');}
  return {skinSource,blendSource,tintDomain:'Four current phenotype extrema plus neutral and four positive stress tints; vColor floor retained. No zero-tint invertibility claim.',tints,rows,negativeControl:{source:oldSource,status:'rejected-by-identical-gate',rows:badRows.map(({lod,part,maskRange,expected})=>({lod,part,maskRange,expected}))}};
 });
 check('pelican and angler oral lining has its own tag in both actual LOD meshes',()=>{const rows=meshes.filter(m=>m.id!=='coelacanth').map(m=>({id:m.id,lod:m.lod,outer:m.groups.get(1)?.length||0,inner:m.groups.get(2)?.length||0,eyes:m.groups.get(4)?.length||0,photophore:m.groups.get(6)?.length||0}));for(const row of rows)assert(row.outer>100&&row.inner>50&&row.eyes>10&&row.photophore>10,JSON.stringify(row));return rows;});
 check('native diagnostic tissue selectors and fitted projections are nonempty on both mesh LODs',()=>{const {selectTriangle}=require('./abyss-material-browser.cjs'),index=vm.runInContext('indexGeometry',c),build=vm.runInContext('faunaGeometry',c),rows=[];for(const m of meshes){const g=index(build(m.id,m.lod==='low').v);for(const part of ['body','fin','eye',...(m.id!=='coelacanth'?['oral']:['mouth'])]){const s=selectTriangle(g.vertices,g.indices,part,m.id);assert(s.area>1e-11&&s.shape>=.08);let minInterior=144;for(let phase=0;phase<16;phase++)for(const effort of [.08,1]){const pose={effort,rate:m.rate,time:0,phase:phase*Math.PI/8},points=s.ids.map(i=>rig({p:Array.from(g.vertices.slice(i*12,i*12+3)),n:Array.from(g.vertices.slice(i*12+3,i*12+6)),tag:s.tag,species:m.species},pose).p);minInterior=Math.min(minInterior,projectedInterior(points));}assert(minInterior>=16,m.id+'/'+m.lod+'/'+part+' has empty fitted projection');rows.push({id:m.id,lod:m.lod,part,tag:s.tag,offset:s.offset,center:s.center,shape:s.shape,minimumProjectedInteriorPixels:minInterior});}}assert.equal(rows.length,24);return rows;});
 report.status=report.checks.every(x=>x.passed)?'passed-cpu-source-contract':'failed';report.summary={passed:report.checks.filter(x=>x.passed).length,failed:report.checks.filter(x=>!x.passed).length};const out=path.resolve(ROOT,arg('out','qa/parity/v01846-material/source-contract.json'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,...report.summary,failures:report.checks.filter(x=>!x.passed),out},null,2));if(report.summary.failed)process.exitCode=1;
}
if(require.main===module)run();
module.exports={strip,blockAt,kind10,compileRig,compileMaterialExpression,differential,measure};
