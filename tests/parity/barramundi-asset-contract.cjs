/* Actual CC0 glTF accessor -> production binary contract. This independently
 * reads the original GLB, not the converter or its success receipt. CPU only;
 * exact asset identity and analytic bounds never imply native art acceptance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..'),SOURCE_SHA='ecc3bafb6b00f2c8b810863c388e3768a7b7ea0d0335e8cb8c574c266e571f4a';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const COUNTS=Object.freeze({vertices:2188,indices:11592,triangles:3864,bytes:128224});
const FIXED=Object.freeze({positions:'30f556bc2ebec34de14ef893ce666ad587ae9c788dc9152702cf7f84a4762a57',normals:'eb52c10f3653e351ffb9815edd57516b01fed471874e21cc742272d1bdf78abb',uv:'17011343bd48ad2da8e52965adde2995f303ec3ca1ae5c275dc8c26f3371b322',tangents:'5e88d11ead214464bba4aedf8eacd24c20fffddefac68bb5ee19f7e74c8bebcc',indices:'a2d63d6fbf723febf2061510d792e6a52b9220e144586d2978ca0c727eb58682'});
function sourceModel(raw){
 assert.equal(sha(raw),SOURCE_SHA,'Not the reviewed Khronos source GLB');
 assert.equal(raw.readUInt32LE(0),0x46546c67);assert.equal(raw.readUInt32LE(4),2);assert.equal(raw.readUInt32LE(8),raw.length);
 const chunks=[];for(let at=12;at<raw.length;){const size=raw.readUInt32LE(at),type=raw.readUInt32LE(at+4);assert(at+8+size<=raw.length);chunks.push({type,body:raw.subarray(at+8,at+8+size)});at+=8+size;}
 assert.deepEqual(chunks.map(c=>c.type),[0x4e4f534a,0x004e4942]);const doc=JSON.parse(chunks[0].body.toString('utf8')),bin=chunks[1].body;
 assert.deepEqual(doc.nodes,[{mesh:0,rotation:[0,1,0,0],name:'BarramundiFish'}]);assert.equal(doc.meshes.length,1);assert.equal(doc.meshes[0].primitives.length,1);
 const primitive=doc.meshes[0].primitives[0];assert.equal(primitive.mode??4,4);assert.equal(primitive.material,0);
 function accessor(index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5123:2,5126:4}[a.componentType];
  assert(width&&size&&!a.sparse&&!a.normalized&&v.buffer===0,'Unexpected source accessor');
  const start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||size*width;assert(stride>=size*width);assert(start+(a.count-1)*stride+size*width<=bin.length);
  const out=a.componentType===5126?new Float32Array(a.count*width):new Uint16Array(a.count*width);
  for(let i=0;i<a.count;i++)for(let j=0;j<width;j++)out[i*width+j]=a.componentType===5126?bin.readFloatLE(start+i*stride+j*size):bin.readUInt16LE(start+i*stride+j*size);
  return out;
 }
 const a=primitive.attributes,p=accessor(a.POSITION),n=accessor(a.NORMAL),t=accessor(a.TANGENT),uv=accessor(a.TEXCOORD_0),indices=accessor(primitive.indices);
 assert.equal(p.length/3,COUNTS.vertices);assert.equal(indices.length,COUNTS.indices);
 // The reviewed rigid frame is R(x,y,z)=(-z,y,x), determinant +1. Translation
 // uses the actual source accessor AABB midpoint; there is no scale fitting.
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++) {min[i%3]=Math.min(min[i%3],p[i]);max[i%3]=Math.max(max[i%3],p[i]);}
 const center=min.map((x,i)=>(x+max[i])/2),positions=new Float32Array(p.length),normals=new Float32Array(n.length),tangents=new Float32Array(t.length);
 for(let i=0;i<COUNTS.vertices;i++){const k=i*3,q=i*4;positions.set([-(p[k+2]-center[2]),p[k+1]-center[1],p[k]-center[0]],k);normals.set([-n[k+2],n[k+1],n[k]],k);tangents.set([-t[q+2],t[q+1],t[q],t[q+3]],q);}
 const out={positions,normals,uv,tangents,indices};for(const key of Object.keys(out))assert.equal(sha(bytes(out[key])),FIXED[key],'Independent source extraction '+key+' differs from the reviewed bytes');
 return {doc,arrays:out,sourceBounds:{min,max,center},sourceSHA256:sha(raw)};
}
function binaryModel(raw){
 assert.equal(raw.length,COUNTS.bytes,'Truncated or extended production mesh');assert.equal(raw.subarray(0,8).toString('ascii'),'BRMFISH1');assert.equal(raw.readUInt32LE(8),COUNTS.vertices);assert.equal(raw.readUInt32LE(12),COUNTS.indices);
 const out={};let at=16;
 for(const [key,width] of [['positions',3],['normals',3],['uv',2],['tangents',4]]){const a=new Float32Array(COUNTS.vertices*width);for(let i=0;i<a.length;i++)a[i]=raw.readFloatLE(at+i*4);out[key]=a;at+=a.byteLength;}
 out.indices=new Uint16Array(COUNTS.indices);for(let i=0;i<out.indices.length;i++)out.indices[i]=raw.readUInt16LE(at+i*2);assert.equal(at+out.indices.byteLength,raw.length);return out;
}
function validateArrays(actual,expected){
 for(const key of Object.keys(FIXED)){assert(actual[key]&&actual[key].length===expected[key].length,key+' length differs');assert(bytes(actual[key]).equals(bytes(expected[key])),key+' changed source bytes');}
 let minArea=Infinity,maxNormalError=0,maxTangentError=0,minFrameCross=Infinity;
 for(let i=0;i<COUNTS.vertices;i++){
  const p=Array.from(actual.positions.subarray(i*3,i*3+3)),n=Array.from(actual.normals.subarray(i*3,i*3+3)),t=Array.from(actual.tangents.subarray(i*4,i*4+4));assert([...p,...n,...t,...actual.uv.subarray(i*2,i*2+2)].every(Number.isFinite));assert(t[3]===1||t[3]===-1);
  maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(...n)-1));maxTangentError=Math.max(maxTangentError,Math.abs(Math.hypot(...t.slice(0,3))-1));minFrameCross=Math.min(minFrameCross,Math.hypot(n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]));
 }
 for(let i=0;i<actual.indices.length;i+=3){const points=[0,1,2].map(j=>{const n=actual.indices[i+j];assert(n<COUNTS.vertices,'Index out of bounds');return Array.from(actual.positions.subarray(n*3,n*3+3));}),a=points[1].map((x,k)=>x-points[0][k]),b=points[2].map((x,k)=>x-points[0][k]);minArea=Math.min(minArea,Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2);}
 assert(minArea>0,'Actual triangle degeneracy');assert(maxNormalError<1e-5&&maxTangentError<1e-5&&minFrameCross>.99,'Invalid imported tangent frame');
 return {...COUNTS,minimumActualTriangleArea:minArea,maxNormalUnitError:maxNormalError,maxTangentUnitError:maxTangentError,minimumFrameCrossLength:minFrameCross,attributeSHA256:Object.fromEntries(Object.keys(FIXED).map(k=>[k,sha(bytes(actual[k]))]))};
}
function allPhaseBound(a){
 let rest=0,exact=0,witness=null;const amplitude=.025;
 // This bound uses actual source vertices and the accepted mathematical range
 // 0 <= quintic weight <= 1. It does not call the production bound function.
 for(let i=0;i<a.positions.length;i+=3){const x=a.positions[i],y=a.positions[i+1],z=a.positions[i+2],u=Math.max(0,Math.min(1,(.12-x)/.44)),w=6*u**5-15*u**4+10*u**3,r=Math.hypot(x,y,Math.abs(z)+amplitude*w);rest=Math.max(rest,Math.hypot(x,y,z));if(r>exact){exact=r;witness={vertex:i/3,position:[x,y,z],weight:w,zAmplitude:amplitude*w};}}
 return {restRadius:rest,analyticMaximumVertexRadius:exact,conservativeRadius:rest+amplitude+.00001,witness,proof:'At each real vertex the extreme z is |z|+A*w. Every rendered triangle point is a convex combination of its deformed vertices. Rotations preserve this sphere; nonuniform scale uses maximum absolute component.'};
}
function controls(expected){
 let rejected=0;for(const [field,change] of [['uv',a=>a.uv[0]+=1/1024],['tangents',a=>a.tangents[3]*=-1],['positions',a=>a.positions[0]*=2],['indices',a=>{const q=a.indices[0];a.indices[0]=a.indices[1];a.indices[1]=q;}],['normals',a=>a.normals[0]=NaN]]){const bad=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v.slice()]));change(bad);assert.throws(()=>validateArrays(bad,expected),undefined,field+' negative control');rejected++;}return {rejectedRealAssetMutations:rejected};
}
module.exports={sourceModel,binaryModel,validateArrays,allPhaseBound,controls,COUNTS,SOURCE_SHA,FIXED,sha,bytes};
if(require.main===module){
 const opt=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)||d,out=path.resolve(ROOT,opt('out','qa/parity/v01843-textured-fauna/asset-contract.json')),report={scope:'CPU actual GLB-to-production mesh identity, numeric geometry and analytic envelope; no native/GPU/route acceptance',validatorSHA256:sha(fs.readFileSync(__filename)),checks:[]};
 const check=(name,fn)=>{try{report.checks.push({name,passed:true,detail:fn()});}catch(e){report.checks.push({name,passed:false,error:e.message});}};
 try{
  assert(opt('source-glb'),'--source-glb must explicitly identify the original Khronos GLB');assert(opt('asset'),'--asset must explicitly identify the production binary');const source=sourceModel(fs.readFileSync(path.resolve(ROOT,opt('source-glb')))),raw=fs.readFileSync(path.resolve(ROOT,opt('asset'))),actual=binaryModel(raw);report.sourceSHA256=source.sourceSHA256;report.assetSHA256=sha(raw);
  check('all actual production position/normal/UV/tangent/index bytes match the fixed source frame',()=>validateArrays(actual,source.arrays));
  check('actual indexed surface fits the analytic all-phase sphere without species.size rescaling',()=>{const bound=allPhaseBound(actual);assert(bound.analyticMaximumVertexRadius<bound.conservativeRadius);assert.equal(bound.conservativeRadius,.34811507510074463);return bound;});
  check('validator rejects real UV, handedness, units, triangle winding and nonfinite mutations',()=>controls(source.arrays));
 }catch(e){report.checks.push({name:'fixture/format',passed:false,error:e.stack});}
 report.status=report.checks.every(c=>c.passed)?'passed-cpu-asset-contract':'failed';report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,...report.summary,failures:report.checks.filter(c=>!c.passed),out},null,2));if(report.summary.failed)process.exitCode=1;
}
