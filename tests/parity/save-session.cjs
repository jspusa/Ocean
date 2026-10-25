/* Production save-session API, with only the browser Web Locks boundary replaced.
 * Browser tests separately prove lock ownership across real pages. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function lockManager({defer=false}={}){
 const held=new Map(),pending=[];
 return {
  request(name,options,callback){
   assert.equal(name,'return-blue.save-session.1');
   assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
   assert.equal(options.steal,undefined);
   return new Promise((resolve,reject)=>{
    const grant=()=>{
     if(held.has(name)){Promise.resolve(callback(null)).then(resolve,reject);return;}
     const token={reject};held.set(name,token);
     let result;try{result=callback({name,mode:'exclusive'});}catch(error){held.delete(name);reject(error);return;}
     Promise.resolve(result).then(value=>{if(held.get(name)===token)held.delete(name);resolve(value);},error=>{if(held.get(name)===token)held.delete(name);reject(error);});
    };
    if(defer)pending.push(grant);else queueMicrotask(grant);
   });
  },
  grantPending(){pending.splice(0).forEach(grant=>grant());},
  lose(error){for(const token of held.values())token.reject(error);held.clear();}
 };
}
const source=fs.readFileSync('src/save_session.js','utf8');
function load(manager){
 const context=vm.createContext({navigator:{locks:manager}});
 vm.runInContext(source,context);
 return vm.runInContext('({OceanSaveSession,SaveSessionError,oceanSaveSession})',context);
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
 await check('only one tab can write a voyage until the owning document closes',async()=>{
  const manager=lockManager(),{OceanSaveSession,SaveSessionError}=load(manager);
  const first=new OceanSaveSession(manager),second=new OceanSaveSession(manager);
  assert.equal(first.status,'idle');assert.equal(first.writable,false);
  assert.throws(()=>first.assertWritable(),error=>error instanceof SaveSessionError&&error.status==='idle');
  assert.equal(await first.acquire(),true);assert.equal(first.status,'owned');
  first.assertWritable();assert.equal(first.writable,true);
  assert.equal(await second.acquire(),false);assert.equal(second.status,'blocked');
  assert.equal(second.writable,false);assert.throws(()=>second.assertWritable(),SaveSessionError);
  first.close();assert.equal(first.status,'closed');assert.equal(first.writable,false);
  assert.throws(()=>first.assertWritable(),SaveSessionError);
  await flush();const fresh=new OceanSaveSession(manager);
  assert.equal(await fresh.acquire(),true);fresh.assertWritable();fresh.close();
 });
 await check('closing a pending tab prevents late grant and stale document reacquisition',async()=>{
  const manager=lockManager({defer:true}),{OceanSaveSession,SaveSessionError}=load(manager);
  const closing=new OceanSaveSession(manager),pending=closing.acquire();
  assert.equal(closing.status,'acquiring');assert.equal(closing.acquire(),pending);
  closing.close();assert.equal(closing.status,'closed');assert.equal(await pending,false);
  manager.grantPending();
  assert.equal(closing.writable,false);assert.throws(()=>closing.assertWritable(),SaveSessionError);
  assert.equal(await closing.acquire(),false);
  await flush();const fresh=new OceanSaveSession(manager),freshRequest=fresh.acquire();
  manager.grantPending();assert.equal(await freshRequest,true);
  assert.equal(await fresh.acquire(),true);fresh.close();
  assert.equal(await fresh.acquire(),false);
 });
 await check('unsupported browser lock APIs never grant write ownership',async()=>{
  for(const manager of [undefined,null,{}, {request:42}]){
   const {OceanSaveSession,SaveSessionError,oceanSaveSession}=load(manager);
   const session=new OceanSaveSession(manager);
   assert.equal(await session.acquire(),false);assert.equal(session.status,'unavailable');
   assert.equal(session.writable,false);assert.throws(()=>session.assertWritable(),SaveSessionError);
   assert.equal(await oceanSaveSession.acquire(),false);
  }
 });
 await check('rejected browser lock requests settle safely without unhandled rejection',async()=>{
  const unhandled=[],onUnhandled=error=>unhandled.push(error);
  process.on('unhandledRejection',onUnhandled);
  try{
   for(const manager of [{request(){throw new Error('Lock request denied');}},{request(){return Promise.reject(new Error('Lock service unavailable'));}}]){
    const {OceanSaveSession,SaveSessionError}=load(manager),session=new OceanSaveSession(manager);
    assert.equal(await session.acquire(),false);assert.equal(session.status,'unavailable');
    assert.equal(session.writable,false);assert.throws(()=>session.assertWritable(),SaveSessionError);
    assert.equal(await session.acquire(),false);session.close();assert.equal(session.status,'closed');
   }
   await flush();assert.deepEqual(unhandled,[]);
  }finally{process.off('unhandledRejection',onUnhandled);}
 });
 await check('loss of an acquired browser lock immediately revokes future save permission',async()=>{
  const manager=lockManager(),{OceanSaveSession,SaveSessionError}=load(manager),session=new OceanSaveSession(manager);
  assert.equal(await session.acquire(),true);session.assertWritable();
  manager.lose(new Error('Browser lock service lost'));await flush();
  assert.equal(session.status,'unavailable');assert.equal(session.writable,false);
  assert.equal(session.holdsLock,false);assert.throws(()=>session.assertHeld(),SaveSessionError);
  assert.throws(()=>session.assertWritable(),SaveSessionError);
  assert.equal(await session.acquire(),false);
  const fresh=new OceanSaveSession(manager);assert.equal(await fresh.acquire(),true);fresh.close();
 });
 await check('a blocked tab cannot acquire later with its old document state',async()=>{
  const manager=lockManager(),{OceanSaveSession}=load(manager),owner=new OceanSaveSession(manager),blocked=new OceanSaveSession(manager);
  assert.equal(await owner.acquire(),true);assert.equal(await blocked.acquire(),false);
  owner.close();await flush();
  assert.equal(await blocked.acquire(),false);assert.equal(blocked.status,'blocked');
  const fresh=new OceanSaveSession(manager);assert.equal(await fresh.acquire(),true);fresh.close();
 });
 await check('a tab closed before acquisition stays closed and never writes',async()=>{
  const manager=lockManager(),{OceanSaveSession,SaveSessionError}=load(manager),closed=new OceanSaveSession(manager);
  closed.close();closed.close();assert.equal(await closed.acquire(),false);
  assert.equal(closed.status,'closed');assert.throws(()=>closed.assertWritable(),SaveSessionError);
  const fresh=new OceanSaveSession(manager);assert.equal(await fresh.acquire(),true);fresh.close();
 });
 await check('the default session uses the supplied browser navigator lock service',async()=>{
  const manager=lockManager(),first=load(manager).oceanSaveSession,second=load(manager).oceanSaveSession;
  assert.equal(await first.acquire(),true);assert.equal(await second.acquire(),false);
  first.close();await flush();const fresh=load(manager).oceanSaveSession;
  assert.equal(await fresh.acquire(),true);fresh.close();
 });
 await check('retiring revokes new saves while holding the lock until pending work drains',async()=>{
  const manager=lockManager(),{OceanSaveSession,SaveSessionError}=load(manager),owner=new OceanSaveSession(manager);
  assert.equal(await owner.acquire(),true);owner.retire();owner.retire();
  assert.equal(owner.status,'retiring');assert.equal(owner.writable,false);
  assert.throws(()=>owner.assertWritable(),error=>error instanceof SaveSessionError&&error.status==='retiring');
  assert.equal(await owner.acquire(),false);await flush();
  const competing=new OceanSaveSession(manager);assert.equal(await competing.acquire(),false);
  owner.close();assert.equal(owner.status,'closed');await flush();
  const fresh=new OceanSaveSession(manager);assert.equal(await fresh.acquire(),true);fresh.close();
  owner.retire();assert.equal(owner.status,'closed');
 });
 await check('retiring a pending request settles false and cannot become a late owner',async()=>{
  const manager=lockManager({defer:true}),{OceanSaveSession,SaveSessionError}=load(manager),session=new OceanSaveSession(manager);
  const pending=session.acquire();session.retire();
  assert.equal(await Promise.race([pending,flush().then(()=>'still pending')]),false);
  manager.grantPending();await flush();
  assert.equal(session.status,'retiring');assert.equal(session.writable,false);
  assert.throws(()=>session.assertWritable(),SaveSessionError);
  assert.equal(await session.acquire(),false);
  const fresh=new OceanSaveSession(manager),request=fresh.acquire();manager.grantPending();
  assert.equal(await request,true);fresh.close();session.close();
 });
 await check('a late lock error cannot reactivate or change a retired document',async()=>{
  const manager=lockManager(),{OceanSaveSession}=load(manager),session=new OceanSaveSession(manager);
  assert.equal(await session.acquire(),true);session.retire();
  manager.lose(new Error('Lock service lost during drain'));await flush();
  assert.equal(session.status,'retiring');assert.equal(session.writable,false);
  assert.equal(session.holdsLock,false);assert.throws(()=>session.assertHeld());
  assert.equal(await session.acquire(),false);session.close();assert.equal(session.status,'closed');
 });
 await check('a retired owner may finish cleanup only while its exclusive lock remains held',async()=>{
  const manager=lockManager(),{OceanSaveSession,SaveSessionError}=load(manager),session=new OceanSaveSession(manager);
  assert.equal(session.holdsLock,false);assert.throws(()=>session.assertHeld(),SaveSessionError);
  assert.equal(await session.acquire(),true);assert.equal(session.holdsLock,true);session.assertHeld();
  session.retire();assert.equal(session.writable,false);assert.equal(session.holdsLock,true);session.assertHeld();
  const competing=new OceanSaveSession(manager);assert.equal(await competing.acquire(),false);
  assert.equal(competing.holdsLock,false);assert.throws(()=>competing.assertHeld(),SaveSessionError);
  session.close();assert.equal(session.holdsLock,false);assert.throws(()=>session.assertHeld(),SaveSessionError);
  const unsupported=new OceanSaveSession(null);assert.equal(await unsupported.acquire(),false);
  assert.equal(unsupported.holdsLock,false);assert.throws(()=>unsupported.assertHeld(),SaveSessionError);
 });
 console.log(checks+' save session checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
