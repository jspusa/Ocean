/* Native WebGL buffer sizes and aquarium sharing, not estimated device memory.
 * node tests/parity/geometry-storage-browser.cjs [URL] */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pw=require(process.env.PLAYWRIGHT_PATH||'playwright');
const url=process.argv.find(x=>/^https?:/.test(x))||'http://127.0.0.1:8000/',rows=[],errors=[];
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:240},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mobile})=>localStorage.setItem('return-blue.shilang.v1',JSON.stringify({settings:{quality:mobile?1:2,adaptive:false,reduced:true,startWithSound:false}})),{mobile});
  await page.goto(url+(url.includes('?')?'&':'?')+'still');await page.waitForFunction(()=>window.__ocean?.ready,null,{timeout:120000});
  const row=await page.evaluate(()=>{
   const gl=renderer.gl,oldVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING),vertices=new Set(),indices=new Set();let bytes=0;
   const compiledBatches=renderer.batches.slice(0,renderer.sceneLoad.meshes);gl.bindVertexArray(null);
   for(const b of compiledBatches){
    if(!vertices.has(b.vb)){vertices.add(b.vb);gl.bindBuffer(gl.ARRAY_BUFFER,b.vb);bytes+=gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE);}
    if(!indices.has(b.eb)){indices.add(b.eb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.eb);bytes+=gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER,gl.BUFFER_SIZE);}
   }
   gl.bindVertexArray(oldVAO);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);
   const result={batches:renderer.batches.length,compiledBatches:compiledBatches.length,vertexBuffers:vertices.size,indexBuffers:indices.size,geometryBytes:bytes,all16Bit:compiledBatches.every(b=>b.indexType===gl.UNSIGNED_SHORT),compiled:renderer.sceneLoad.compiled};
   const original=renderer.batches.slice(),visibility=original.map(b=>b.visible);for(const sp of SPECIES)oceanEcology.state().field[sp.id]={points:14,encounters:2,seconds:20,photos:0};
   oceanAquarium.autoArrange();oceanAquarium.enterViewer();t=24;updateLife(t);updateCamera();applyVisualSettings();renderer.render(eye,target,t);
   const clones=renderer.batches.slice(original.length).filter(b=>b.dynamic&&original.some(source=>source.vb===b.vb));
   result.exhibits=oceanAquarium.snapshot().instances;result.clones=clones.length;result.independentClones=clones.every(b=>original.some(s=>s.vb===b.vb&&s.eb===b.eb&&s.indexType===b.indexType&&s.vao!==b.vao&&s.ib!==b.ib&&s.instances!==b.instances));
   oceanAquarium.leaveViewer();result.restored=original.every((b,i)=>b.visible===visibility[i]);const count=renderer.batches.length;
   for(let i=0;i<3;i++){oceanAquarium.enterViewer();oceanAquarium.leaveViewer();}
   result.repeatBatches=renderer.batches.length-count;result.gl=gl.getError();return result;
  });
  rows.push({mobile,...row});assert.equal(row.compiled,true);assert.equal(row.compiledBatches,481);assert.equal(row.vertexBuffers,439);assert.equal(row.indexBuffers,439);assert.equal(row.geometryBytes,46572870);assert.equal(row.all16Bit,true);
  assert(row.exhibits>0&&row.clones>0);assert.equal(row.independentClones,true);assert.equal(row.restored,true);assert.equal(row.repeatBatches,0);assert.equal(row.gl,0);
  console.log('PASS '+(mobile?'touch':'desktop')+' native geometry '+row.geometryBytes+' bytes, 439 shared meshes; aquarium actor/VAO isolation and restore');await context.close();
 }}finally{await browser.close();}
 assert.deepEqual(errors,[]);const out=path.resolve(__dirname,'../../qa/parity/geometry-storage-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({rows,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
