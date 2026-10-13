"""Validate delivered sources, static asset paths and all compiled geometry; not browser QA."""
from pathlib import Path
import json,re,subprocess,gzip,struct,math,array,hashlib
R=Path(__file__).resolve().parents[2];checks=[];version=(R/'VERSION').read_text().strip()
(R/'qa/parity').mkdir(parents=True,exist_ok=True)
def check(n,v,d=None):
 checks.append({'check':n,'pass':bool(v),'detail':d});print(('PASS ' if v else 'FAIL ')+n)
for p in sorted((R/'src').glob('*.js')):
 proc=subprocess.run(['node','--check',str(p)],capture_output=True,text=True);check('JS syntax '+p.name,proc.returncode==0,proc.stderr or None)
html=(R/'index.html').read_text();portable=(R/'standalone.html').read_text();config=(R/'src/config.js').read_text()
refs=re.findall(r'(?:src|href)="((?:src|assets|music)/[^\"]+)"',html)+re.findall(r'"((?:assets|music)/[^\"]+)"',config)
check('Every runtime local reference exists',all((R/p.split('?')[0]).is_file() for p in refs),len(refs))
check('All runtime references are project-subpath relative',not re.search(r'(?:src|href)="/(?!/)',html))
check('No standalone script/style file fetch',not re.search(r'<script[^>]+src=|<link[^>]+stylesheet',portable))
check('No unresolved build insertion markers',not re.search(r'/\*__(?:CSS|JS)__\*/',html+portable))
check('No packaged font files',not any(p.suffix.lower() in {'.ttf','.otf','.woff','.woff2','.ttc'} for p in R.rglob('*')))
fauna_ids=re.findall(r"registerFauna\(\{id:'([^']+)'",(R/'src/fauna.js').read_text())
check('Every catalogue model has an actual WebGL guide thumbnail',len(list((R/'assets').glob('guide_*.jpg')))==20 and all((R/'assets'/('guide_'+n+'.jpg')).is_file() for n in fauna_ids))
check('Original two music stems exist',all((R/'music'/n).stat().st_size>10000 for n in ['shallows.mp3','blue_silence.mp3']))
raw=gzip.decompress((R/'assets/reef.mesh.gz').read_bytes());magic,sz=struct.unpack_from('<II',raw);h=json.loads(raw[8:8+sz]);base=8+sz
check('Compiled scene matches authored world version',h['sourceVersion']==re.search(r"version:'([^']+)'",(R/'src/open_world.js').read_text()).group(1) and magic==0x35424652)
check('Compiled meshes in supported budget',len(h['batches'])<=600 and len(h['nodes'])<=20000,{'batches':len(h['batches']),'instances':len(h['nodes']),'packedBytes':(R/'assets/reef.mesh.gz').stat().st_size,'decodedBytes':len(raw)})
finite=True;indices=True;refsok=True
for b in h['batches']:
 vs=array.array('f');vs.frombytes(raw[base+b['vertexOffset']:base+b['vertexOffset']+b['vertexFloats']*4]);finite &= all(math.isfinite(v) for v in vs)
 ix=array.array('I');ix.frombytes(raw[base+b['indexOffset']:base+b['indexOffset']+b['indexCount']*4]);indices &= max(ix,default=0)<b['vertexFloats']//12
 refsok &= all(0<=i<len(h['nodes']) for i in b['instanceIDs'])
check('All indexed vertices are finite',finite);check('Every index refers to a valid vertex',indices);check('Every instance ID references a node',refsok)
check('Runtime module ordering includes world / voyage',html.index('open_world.js')<html.index('fauna.js')<html.index('fauna_world.js')<html.index('scene_cache.js')<html.index('app.js')<html.index('voyage.js'))
check('Source fallback includes new world', 'open_world.js' in (R/'bake_scene.cjs').read_text())
check('Sources and built entry have matching version', (R/'VERSION').read_text().strip()==version and '?v='+version in config and ('· '+'.'.join(version.split('.')[:2])) in (R/'src/shell.html').read_text() and '?v='+version in html)
check('Feature modules register before explicit bootstrap', all(html.index(n+'.js')<html.index('bootstrap.js') for n in ['voyage','features','ecology','exploration','expedition','aquarium','photography','navigation','ship','microcosm']) and 'boot();' not in (R/'src/app.js').read_text() and re.sub(r'//[^\n]*', '', (R/'src/bootstrap.js').read_text()).strip()=='boot();')
manifest=json.loads((R/'MANIFEST.json').read_text())
check('Release manifest matches every recorded file',manifest['version']==version and all((R/f['path']).stat().st_size==f['bytes'] and hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in manifest['files']))
result={'version':version,'checks':checks,'sha256Standalone':hashlib.sha256((R/'standalone.html').read_bytes()).hexdigest()};(R/'qa/parity/static-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(not all(c['pass'] for c in checks))
