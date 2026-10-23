/* Distributed HTML must retain the repository's existing MIT notice even when
 * the portable file is copied without the rest of the repository. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),license=fs.readFileSync(path.join(root,'LICENSE'),'utf8');
for(const name of ['index.html','standalone.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert(html.includes('<!--\n'+license.trimEnd()+'\n-->'),name+' must retain the complete existing license as a nonvisual notice');
 assert(html.startsWith('<!doctype html>'),'Keep standards-mode doctype');console.log('PASS '+name+' retains the complete MIT notice');
}
const record=JSON.parse(fs.readFileSync(path.join(root,'MANIFEST.json'),'utf8')).files.find(f=>f.path==='LICENSE');
assert(record,'Release integrity must cover the license');assert.equal(record.bytes,Buffer.byteLength(license));assert.equal(record.sha256,crypto.createHash('sha256').update(license).digest('hex'));
console.log('PASS release manifest covers the unchanged source license');
