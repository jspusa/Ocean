"""Build both a portable/offline HTML and a modular, subpath-safe GitHub Pages site.
No package manager, framework, build service, CDN, secrets or backend required.
Python 3.10+ and Node.js 18+; standard libraries only, no npm dependencies.
"""
from pathlib import Path
import base64,hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parent
JS_FILES=['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','fauna.js','cetaceans.js','abyss_fauna.js','fauna_world.js','cetacean_world.js','regions.js','abyss_world.js','scene_cache.js','audio.js','performance.js','app.js','voyage.js','features.js','ecology.js','exploration.js','expedition.js','aquarium.js','photography.js','navigation.js','ship.js','microcosm.js','story.js','bootstrap.js']
def main():
    version=(ROOT/'VERSION').read_text().strip()
    if '--pack-only' not in sys.argv:
        subprocess.run(['node', str(ROOT/'bake_scene.cjs')], check=True)
    shell=(ROOT/'src/shell.html').read_text('utf-8')
    assert '/*__CSS__*/' in shell and '/*__JS__*/' in shell
    images=sorted((ROOT/'assets').glob('*.jpg')); tracks=sorted((ROOT/'music').glob('*.mp3'))
    assets={p.stem:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in images}
    music={p.stem:'data:audio/mpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in tracks}
    config='const ASSETS='+json.dumps(assets,separators=(',',':'))+';\nconst MUSIC='+json.dumps(music,separators=(',',':'))+';\n'
    config+='const WORLD='+json.dumps('data:application/octet-stream;base64,'+base64.b64encode((ROOT/'assets/reef.mesh.gz').read_bytes()).decode())+';\n'
    js=config+'\n'.join((ROOT/'src'/n).read_text('utf-8') for n in JS_FILES)
    portable=shell.replace('/*__CSS__*/',(ROOT/'src/style.css').read_text('utf-8')).replace('/*__JS__*/',js.replace('</script','<\\/script'))
    (ROOT/'standalone.html').write_text(portable,'utf-8')
    config='const ASSETS='+json.dumps({p.stem:'assets/'+p.name+'?v='+version for p in images},separators=(',',':'))+';\nconst MUSIC='+json.dumps({p.stem:'music/'+p.name for p in tracks},separators=(',',':'))+';\n'
    config+='const WORLD="assets/reef.mesh.gz?v='+version+'";\n'
    (ROOT/'src/config.js').write_text(config,'utf-8')
    site=shell.replace('<style>/*__CSS__*/</style>','<link rel="stylesheet" href="src/style.css?v='+version+'">')
    tags='\n'.join('<script src="src/'+n+'?v='+version+'"></script>' for n in ['config.js']+JS_FILES)
    site=site.replace('<script>/*__JS__*/</script>',tags)
    (ROOT/'index.html').write_text(site,'utf-8')
    # Integrity manifest covers the served game and source, not archived releases or QA captures.
    files=[ROOT/n for n in ['index.html','.nojekyll','VERSION','README.md','CREDITS.md','build.py','bake_scene.cjs']]
    for folder in ['src','assets','music']:
        files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
    records=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
    (ROOT/'MANIFEST.json').write_text(json.dumps({'version':version,'scope':'served game and build sources','files':records},ensure_ascii=False,indent=2)+'\n','utf-8')
    print(f'Portable: {len(portable.encode()):,} bytes; modular HTML: {len(site.encode()):,} bytes.')
if __name__=='__main__':main()
