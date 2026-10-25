/* A document holds the browser's exclusive save lock for its entire lifetime.
 * Acquire before reading saves; closing requires a fresh document to play again. */
class SaveSessionError extends Error{
 constructor(status){
  super(status==='blocked'?'另一個分頁正在使用這份航程，請關閉該分頁後重新載入。':'目前分頁無法安全儲存航程，請重新載入後再試。');
  this.name='SaveSessionError';this.status=status;
 }
}
class OceanSaveSession{
 #manager;#status='idle';#pending=null;#release=null;#settle=null;
 constructor(lockManager){this.#manager=lockManager;}
 get status(){return this.#status;}
 get writable(){return this.#status==='owned';}
 get holdsLock(){return this.#release!==null;}
 assertHeld(){if(!this.holdsLock)throw new SaveSessionError(this.#status);}
 assertWritable(){if(!this.writable)throw new SaveSessionError(this.#status);}
 acquire(){
  if(this.#status==='acquiring')return this.#pending;
  if(this.#status!=='idle')return Promise.resolve(this.writable);
  if(typeof this.#manager?.request!=='function'){this.#status='unavailable';return Promise.resolve(false);}
  this.#status='acquiring';
  this.#pending=new Promise(resolve=>{this.#settle=resolve;});
  const failed=()=>{
   if(this.#status!=='closed'&&this.#status!=='retiring')this.#status='unavailable';
   this.#settle?.(false);this.#settle=null;
   this.#release?.();this.#release=null;
  };
  try{
   const request=this.#manager.request('return-blue.save-session.1',{mode:'exclusive',ifAvailable:true},lock=>{
    if(this.#status!=='acquiring')return;
    if(!lock){this.#status='blocked';this.#settle(false);this.#settle=null;return;}
    this.#status='owned';this.#settle(true);this.#settle=null;
    return new Promise(release=>{this.#release=release;});
   });
   Promise.resolve(request).then(()=>{
    // A lock callback must remain pending for the owner's entire lifetime.
    if(this.#status==='owned'||this.#status==='acquiring')failed();
   },failed);
  }catch(_){failed();}
  return this.#pending;
 }
 // Stop accepting new writes, retaining ownership while issued transactions drain.
 retire(){if(this.#status!=='closed')this.#status='retiring';this.#settle?.(false);this.#settle=null;}
 close(){this.#status='closed';this.#settle?.(false);this.#settle=null;this.#release?.();this.#release=null;}
}
const oceanSaveSession=new OceanSaveSession(globalThis.navigator?.locks);
