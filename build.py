"""Build both a portable/offline HTML and a modular, subpath-safe GitHub Pages site.
No package manager, framework, build service, CDN, secrets or backend required.
Python 3.10+ and Node.js 18+; standard libraries only, no npm dependencies.
"""
from pathlib import Path
import base64,json,subprocess,sys
ROOT=Path(__file__).resolve().parent
JS_FILES=['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','scene_cache.js','audio.js','performance.js','app.js','voyage.js']
def main():
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
    config='const ASSETS='+json.dumps({p.stem:'assets/'+p.name+'?v=0.7' for p in images},separators=(',',':'))+';\nconst MUSIC='+json.dumps({p.stem:'music/'+p.name for p in tracks},separators=(',',':'))+';\n'
    config+='const WORLD="assets/reef.mesh.gz?v=0.7";\n'
    (ROOT/'src/config.js').write_text(config,'utf-8')
    site=shell.replace('<style>/*__CSS__*/</style>','<link rel="stylesheet" href="src/style.css?v=0.7">')
    tags='\n'.join('<script src="src/'+n+'?v=0.7"></script>' for n in ['config.js']+JS_FILES)
    site=site.replace('<script>/*__JS__*/</script>',tags)
    (ROOT/'index.html').write_text(site,'utf-8')
    print(f'Portable: {len(portable.encode()):,} bytes; modular HTML: {len(site.encode()):,} bytes.')
if __name__=='__main__':main()
