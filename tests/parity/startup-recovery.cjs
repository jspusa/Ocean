/* Visible startup recovery through the existing application failure entry. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.resolve(__dirname,'../../src/app.js'),'utf8');
const elements=new Map();let focused=null;
function element(id){if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,classList:{add(){},remove(){}},focus(){focused=id;}});return elements.get(id);}
const c=vm.createContext({$:element,console:{error(){}}});
vm.runInContext(app.slice(app.indexOf('function handleFailure('),app.indexOf('function restartLowPower(')),c);
const asset=Object.assign(new Error('無法載入材質 sand_diff'),{code:'OCEAN_ASSET_UNAVAILABLE'});
c.handleFailure(asset);
assert.match(element('errorTitle').textContent,/素材/,'A network asset failure must not claim that WebGL is unsupported');
assert.match(element('errorMessage').textContent,/重新嘗試/);
assert.equal(focused,'errorRetry');assert.equal(element('errorExportSave').hidden,true);
console.log('PASS asset failure explains retry and focuses its existing button');
c.handleFailure(new Error('WebGL 2 unavailable'));
assert.equal(element('errorTitle').textContent,'這個視窗無法啟動 3D');assert.equal(focused,'errorSafeRestart');
assert.equal(element('errorMessage').textContent,'WebGL 2 unavailable');
console.log('PASS graphics failure preserves low-power recovery');
for(const saved of [false,true]){c.handleFailure(new Error('context lost'),{contextLost:true,saved});assert.equal(element('errorTitle').textContent,'顯示暫時中斷');assert.equal(element('errorExportSave').hidden,false);assert.equal(focused,'errorSafeRestart');assert.match(element('errorMessage').textContent,saved?/航程已保存/:/尚未完整保存/);}
console.log('PASS context loss retains truthful backup and restart guidance');
