'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console});for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','fauna','cetaceans','abyss_fauna','fauna_world','cetacean_world','regions','abyss_world'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c);
const r=vm.runInContext('AbyssWorldRules',c);let n=0;function check(name,fn){fn();n++;console.log('PASS '+name)}
check('every new species has real bounded habitat space inside the continuous sea',()=>{assert.equal(Object.keys(r.sites).length,5);for(const [id,d]of Object.entries(r.sites)){assert(d.homes.length>0);for(const h of d.homes){assert(Math.hypot(h[0]/270,(h[2]+90)/295)<.98,id);assert(h[1]<-40,id);assert(h[1]>vm.runInContext('groundHeight',c)(h[0],h[2]),id+' below terrain')}}});
check('three new chart landmarks keep their actual dive depth and avoid index changes',()=>{const landmarks=vm.runInContext('LANDMARKS',c);assert.equal(landmarks[8].id,'anchorage');assert.equal(landmarks[9].id,'cave');assert.equal(landmarks[10].id,'ruins');assert.equal(landmarks[11].id,'abyss');assert(landmarks.slice(9).every(l=>Number.isFinite(l.y)&&l.y<-15))});
console.log(n+' abyss world checks passed');
