/* Exact regional terrain support, including zero-weight boundary strips.
 * Counts prove skipped math; local timing does not claim device performance. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console,performance});for(const name of ['engine','world','reef_detail','next_reef','individuals','open_world','trench','regions'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),c,{filename:name+'.js'});
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/regional-ground-v018.js'),'utf8');vm.runInContext(fixture,c);
const result=vm.runInContext(`(()=>{
 const original=originalRegionGround,candidate=OceanRegions.groundHeight,samples=[];let checks=0;
 const check=(x,z)=>{checks++;if(!Object.is(original(x,z),candidate(x,z)))throw Error('Ground changed at '+JSON.stringify([x,z]));};
 for(let x=-300;x<=920;x+=2.371)for(let z=-410;z<=230;z+=2.833)check(x,z);
 for(const x of [NaN,Infinity,-Infinity,-0,0])for(const z of [NaN,Infinity,-Infinity,-0,0])check(x,z);
 const edges=[[-246,-202,-95,-28],[143,211,-249,-182],[-176,-123,-338,-245]];
 for(const [x0,x1,z0,z1]of edges)for(const e of [0,1e-12,-1e-12,1e-7,-1e-7]){for(let z=z0-10;z<=z1+10;z+=.167){check(x0+e,z);check(x1+e,z);}for(let x=x0-10;x<=x1+10;x+=.167){check(x,z0+e);check(x,z1+e);}}
 for(let i=0;i<10000;i++)samples.push([-130+((i*117)%25000)/100,-210+((i*193)%40000)/100]);
 const hypot=Math.hypot;let count=0;Math.hypot=(...args)=>{count++;return hypot(...args);};
 let before,after;try{for(const [x,z]of samples)original(x,z);before=count;count=0;for(const [x,z]of samples)candidate(x,z);after=count;}finally{Math.hypot=hypot;}
 let checksum=0;const time=fn=>{const start=performance.now();for(const [x,z]of samples)checksum+=fn(x,z);return performance.now()-start;};for(let i=0;i<3;i++){time(original);time(candidate);}return{checks,samples:samples.length,hypot:{before,after},ms:{before:time(original),after:time(candidate)},checksum};
})()`,c);
console.log(JSON.stringify(result,null,2));assert.equal(result.hypot.after,0,'RED: roof-free reef terrain must skip regional shape math');assert(result.hypot.before>=50000);console.log('PASS exact regional ground heights with no out-of-region shape queries');
