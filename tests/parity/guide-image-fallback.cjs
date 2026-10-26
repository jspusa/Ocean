/* Actual guide rendering and image-error delivery at the DOM adapter seam.
 * Native image network/decode behavior remains a separate browser check. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'../../src/app.js'),'utf8'),base='https://jspusa.github.io/Ocean/',nodes=new Map(),listeners=[];
function element(tag='div',attrs={}){
 const el={tagName:tag.toUpperCase(),attrs:{...attrs},children:[],dataset:{},parentElement:null,contains(child){for(let p=child;p;p=p.parentElement)if(p===this)return true;return false;},assignments:0,scrollTop:0,textContent:'',getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=String(v);},append(child){this.children.push(child);child.parentElement=this;},querySelectorAll(selector){const out=[];for(const child of this.children){if(child.matches(selector))out.push(child);out.push(...child.querySelectorAll(selector));}return out;},matches(selector){if(selector==='img')return this.tagName==='IMG';if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));const data=selector.match(/^\[data-([\w-]+)\]$/);return !!data&&Object.hasOwn(this.attrs,'data-'+data[1]);},closest(selector){for(let p=this;p;p=p.parentElement)if(p.matches(selector))return p;return null;},click(){this.onclick?.({target:this});}};
 el.classList={contains:name=>(el.attrs.class||'').split(/\s+/).includes(name),add(){},remove(){},toggle(){}};
 for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))el.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
 if(attrs.id)nodes.set(attrs.id,el);
 Object.defineProperties(el,{src:{get:()=>new URL(el.attrs.src||'',base).href,set:value=>{el.assignments++;el.attrs.src=String(value);}},currentSrc:{get:()=>el.src},innerHTML:{get:()=>el.html||'',set:html=>{
  const clear=p=>{for(const child of p.children){if(child.attrs.id)nodes.delete(child.attrs.id);clear(child);}};clear(el);el.children=[];el.html=html;const stack=[el];
  for(const match of html.matchAll(/<(\/?)([\w-]+)\b([^>]*)>/g)){const tag=match[2].toLowerCase();if(match[1]){if(stack.length>1)stack.pop();continue;}const a={};for(const item of match[3].matchAll(/([\w-]+)="([^"]*)"/g))a[item[1]]=item[2];const child=element(tag,a);stack.at(-1).append(child);if(!['img','br','input','hr','meta','link'].includes(tag))stack.push(child);}
 }}});return el;
}
for(const id of ['panelBody','panelKicker','panelTitle'])element('div',{id});
const document={baseURI:base,addEventListener:(type,fn,capture)=>listeners.push({type,fn,capture}),createElement:element};
const svg=id=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 4"><title>'+id+'</title><path d="M0 2L7 0 7 4Z"/></svg>');
const SPECIES=['frilled_shark','oarfish','sea_pig'].map(id=>({id,name:id,en:id,latin:id,fauna:true,zone:0,thumb:svg(id),hint:'hint',detail:'detail'}));
const ASSETS=Object.fromEntries(SPECIES.map(s=>['guide_'+s.id,'assets/guide_'+s.id+'.jpg?v=0.18.19']));
let rng=0;const c=vm.createContext({console,URL,document,SPECIES,ASSETS,$:id=>nodes.get(id)||null,persistent:{seen:[],photos:[],log:[]},voyage:{state:{features:{}}},life:[],LANDMARKS:[{name:'ocean'}],oceanSeasons:{guideHTML:()=>''},safe:String,findSpecies(){},viewPhoto(){},exportLog(){},dateText:String,storageOK:true,quizAnswer:null,quizIndex:0,quizScore:0,random:()=>[0,.4,.8,.2,.7][rng++%5]});
vm.runInContext(app.slice(app.indexOf('function panelTitle('),app.indexOf('function renderMap(')),c,{filename:'app-guide-ui.js'});
const start=app.includes('const guideImageFallbacks=')?app.indexOf('const guideImageFallbacks='):app.indexOf('function makeThumb(');
vm.runInContext(app.slice(start,app.indexOf('/* Presentation state keeps')),c,{filename:'app-guide-thumbnails.js'});
const error=target=>{for(const listener of listeners)if(listener.type==='error'&&listener.capture)listener.fn({target});};
SPECIES.forEach(c.makeThumb);assert.equal(SPECIES[0].thumb,ASSETS.guide_frilled_shark,'Normal guide rendering prefers the original model JPEG');
c.renderJournal('species');const card=nodes.get('panelBody').querySelectorAll('[data-species]')[0],image=card.querySelectorAll('img')[0];error(image);
assert.equal(image.getAttribute('src'),svg('frilled_shark'),'A failed guide JPEG displays its preserved original SVG');
assert.equal(image.assignments,1);assert.equal(SPECIES[0].thumb,ASSETS.guide_frilled_shark,'Recovery does not replace the preferred source for future successful loads');
console.log('PASS a failed original guide JPEG displays the preserved SVG while ordinary thumbnails keep preferring JPEG');
error(image);assert.equal(image.assignments,1,'A failed SVG must not create a retry loop');
card.click();const detail=nodes.get('panelBody').querySelectorAll('img')[0];assert.equal(detail.getAttribute('src'),ASSETS.guide_frilled_shark);error(detail);assert.equal(detail.getAttribute('src'),svg('frilled_shark'));
nodes.get('backSpecies').click();const replacement=nodes.get('panelBody').querySelectorAll('img')[0];assert.notEqual(replacement,image);error(replacement);assert.equal(replacement.getAttribute('src'),svg('frilled_shark'));
c.renderJournal('quiz');const quiz=nodes.get('quizBody').querySelectorAll('img')[0];assert.equal(quiz.getAttribute('src'),ASSETS.guide_frilled_shark);error(quiz);assert.equal(quiz.getAttribute('src'),svg('frilled_shark'));
SPECIES.forEach(c.makeThumb);c.renderJournal('species');const oldSpecies=nodes.get('panelBody').querySelectorAll('img')[1];error(oldSpecies);assert.equal(oldSpecies.getAttribute('src'),svg('oarfish'),'Previously authored species retain the same recovery');
assert.equal(listeners.filter(l=>l.type==='error'&&l.capture).length,1,'All future guide panels share exactly one capture listener');
console.log('PASS actual detail, back-to-journal and quiz controls retain SVG recovery after panel replacement without duplicate listeners or retries');
c.persistent.photos=[{url:ASSETS.guide_frilled_shark,species:'photo',area:'ocean',date:1}];c.renderJournal('photos');const photo=nodes.get('panelBody').querySelectorAll('img')[0];error(photo);assert.equal(photo.assignments,0,'Even a photograph with a matching guide URL must remain untouched');
for(const [src,classes]of [[ASSETS.guide_frilled_shark,''],['https://other.example/assets/guide_frilled_shark.jpg?v=0.18.19','detail-art'],['assets/guide_unknown.jpg?v=0.18.19','detail-art']]){const img=element('img',{src,class:classes});nodes.get('panelBody').append(img);error(img);assert.equal(img.assignments,0,'Unrelated, external or unregistered images cannot opt into guide recovery');}
const outside=element('img',{src:ASSETS.guide_frilled_shark,class:'detail-art'});error(outside);assert.equal(outside.assignments,0);
error({tagName:'SCRIPT'});error(document);
console.log('PASS photograph, unrelated image, external URL, unknown guide and non-image errors remain untouched');
