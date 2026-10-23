/* Production swimming attenuation at real authored encounter coordinates.
 * No GL and no substituted expected-speed implementation. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console});
for(const name of ['engine','world','reef_detail','next_reef','open_world','trench','regions'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name+'.js'});
vm.runInContext(fs.readFileSync('src/deepsea.js','utf8').split('const oceanDeepsea=')[0],c);
const T=vm.runInContext('OceanTrench',c),R=vm.runInContext('DeepseaRules',c);let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS '+name)}catch(e){fail++;console.error('FAIL '+name+': '+e.message)}}
check('manual takeover stays below 3x at every new real encounter',()=>{assert.equal(T.encounters.length,9);for(const e of T.encounters)for(const offset of [[0,1,0],[0,1,5],[5,1,0]]){const p=e.home.map((n,i)=>n+offset[i]),scale=R.swimScale(p);assert(scale<3,e.id+' '+JSON.stringify(p)+' scale='+scale);}});
check('the open corridor still accelerates after leaving animals and floors',()=>{const p=[766,-4600,-90],scale=R.swimScale(p);assert(scale>60,'scale='+scale);});
check('original trench habitat takeover retains gentle speed',()=>{for(const h of Object.values(T.habitats))for(const home of h.homes)assert(R.swimScale(home.map((n,i)=>n+(i===1?1:0)))<3);});
console.log(`${pass}/${pass+fail} deep current speed checks`);if(fail)process.exitCode=1;
