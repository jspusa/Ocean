"""Build both a portable/offline HTML and a modular, subpath-safe GitHub Pages site.
No package manager, framework, build service, CDN, secrets or backend required.
Python 3.10+ and Node.js 18+; standard libraries only, no npm dependencies.
"""
from pathlib import Path
import base64,hashlib,json,subprocess,sys
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
JS_FILES=['engine.js','world.js','reef_detail.js','next_reef.js','individuals.js','open_world.js','trench.js','fauna.js','cetaceans.js','abyss_fauna.js','trench_fauna.js','fauna_world.js','cetacean_world.js','regions.js','abyss_world.js','trench_world.js','pelagic_life.js','reef_fauna.js','oarfish.js','frilled_shark.js','frilled_shark_world.js','barreleye.js','barreleye_world.js','tripod_fish.js','dumbo_octopus.js','abyss_community.js','rock_contact.js','scene_stream.js','scene_cache.js','seasons.js','audio.js','performance.js','selection.js','save_session.js','app.js','gamepad_ui.js','gamepad_pointer.js','voyage.js','features.js','encounters.js','ecology.js','exploration.js','expedition.js','aquarium.js','photography.js','navigation.js','ship.js','microcosm.js','story.js','deepsea.js','room_client.js','multiplayer.js','mobile-controls.js','save_session_ui.js','bootstrap.js']
def main():
    snapshot={}
    def read_input(file):
        if file not in snapshot: snapshot[file]=file.read_bytes()
        return snapshot[file]
    def source_text(file): return read_input(file).decode('utf-8')
    read_input(ROOT/'build.py')
    read_input(ROOT/'partition_scene.cjs')
    version=source_text(ROOT/'VERSION').strip()
    room_config=json.loads(source_text(ROOT/'room-service.json'))
    endpoint=room_config['endpoint']
    if endpoint is not None:
        if not isinstance(endpoint,str): raise ValueError('Room endpoint must be a WSS URL or null')
        url=urlsplit(endpoint)
        if url.scheme!='wss' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path!='/v1' or any(c.isspace() for c in endpoint):
            raise ValueError('Room endpoint must be a public WSS /v1 URL without credentials, query or fragment')
    room_js='const OCEAN_ROOM_ENDPOINT='+json.dumps(endpoint)+';\n'
    if '--pack-only' not in sys.argv:
        subprocess.run(['node', str(ROOT/'bake_scene.cjs')], check=True)
    # Both full and pack-only builds require the replay from these exact
    # generator inputs and this archive. A stale pose table must not ship.
    growth=json.loads(subprocess.check_output(['node', str(ROOT/'scene_inputs.cjs'), '--verify-growth'],text=True))
    for record in growth['sourceInputs']:
        if hashlib.sha256(read_input(ROOT/record['path'])).hexdigest()!=record['sha256']:
            raise RuntimeError('Scene input changed while taking the pack snapshot')
    archive=read_input(ROOT/'assets/reef.mesh.gz')
    if hashlib.sha256(archive).hexdigest()!=growth['sceneArchiveSHA256']:
        raise RuntimeError('Scene archive changed while taking the pack snapshot')
    def verify_snapshot():
        for file,contents in snapshot.items():
            if file.read_bytes()!=contents:
                raise RuntimeError('Input changed during packing: '+str(file.relative_to(ROOT)))
        current=json.loads(subprocess.check_output(['node', str(ROOT/'scene_inputs.cjs'), '--verify-growth'],text=True))
        if current!=growth: raise RuntimeError('Reef growth replay changed during packing')
    growth_js='const REEF_GROWTH_SOURCE_SHA256='+json.dumps(growth['sourceSHA256'])+';\n'
    growth_js+='const REEF_GROWTH_REPLAY='+json.dumps(growth,separators=(',',':'))+';\n'
    subprocess.run(['node', str(ROOT/'partition_scene.cjs')], check=True)
    shell=source_text(ROOT/'src/shell.html')
    assert '/*__CSS__*/' in shell and '/*__JS__*/' in shell
    license_notice=source_text(ROOT/'LICENSE').rstrip()
    assert '-->' not in license_notice
    shell=shell.replace('<!doctype html>', '<!doctype html>\n<!--\n'+license_notice+'\n-->', 1)
    images=sorted((ROOT/'assets').glob('*.jpg')); tracks=sorted((ROOT/'music').glob('*.mp3'))
    assets={p.stem:'data:image/jpeg;base64,'+base64.b64encode(read_input(p)).decode() for p in images}
    music={p.stem:'data:audio/mpeg;base64,'+base64.b64encode(read_input(p)).decode() for p in tracks}
    config=room_js+growth_js+'const ASSETS='+json.dumps(assets,separators=(',',':'))+';\nconst MUSIC='+json.dumps(music,separators=(',',':'))+';\n'
    config+='const WORLD='+json.dumps('data:application/octet-stream;base64,'+base64.b64encode(archive).decode())+';\n'
    config+='let SCULPTED_CORAL;\nconst CORAL_FORMS='+json.dumps('data:application/json;base64,'+base64.b64encode(read_input(ROOT/'assets/coral_forms.json')).decode())+';\n'
    js=config+'\n'.join(source_text(ROOT/'src'/n) for n in JS_FILES)
    portable=shell.replace('/*__CSS__*/',source_text(ROOT/'src/style.css')+'\n'+source_text(ROOT/'src/mobile-controls.css')).replace('/*__JS__*/',js.replace('</script','<\\/script'))
    config=room_js+growth_js+'const ASSETS='+json.dumps({p.stem:'assets/'+p.name+'?v='+version for p in images},separators=(',',':'))+';\nconst MUSIC='+json.dumps({p.stem:'music/'+p.name for p in tracks},separators=(',',':'))+';\n'
    config+='const WORLD="assets/reef.mesh.gz?v='+version+'";\n'
    config+='const WORLD_STREAM="assets/scene/index.json?v='+version+'";\n'
    config+='let SCULPTED_CORAL;\nconst CORAL_FORMS="assets/coral_forms.json?v='+version+'";\n'
    site=shell.replace('<style>/*__CSS__*/</style>','<link rel="stylesheet" href="src/style.css?v='+version+'">\n<link rel="stylesheet" href="src/mobile-controls.css?v='+version+'">\n<link rel="manifest" href="ocean.webmanifest?v='+version+'">')
    tags='\n'.join('<script src="src/'+n+'?v='+version+'"></script>' for n in ['config.js']+JS_FILES)
    site=site.replace('<script>/*__JS__*/</script>',tags)
    # Inputs are held in memory while outputs are assembled. Refuse a shared-
    # checkout edit before replacing derived HTML/config, then check again
    # before declaring the manifest/build successful.
    verify_snapshot()
    (ROOT/'standalone.html').write_text(portable,'utf-8')
    (ROOT/'src/config.js').write_text(config,'utf-8')
    (ROOT/'index.html').write_text(site,'utf-8')
    # Integrity manifest covers the served game and source, not archived releases or QA captures.
    files=[ROOT/n for n in ['index.html','.nojekyll','VERSION','README.md','CREDITS.md','LICENSE','build.py','bake_scene.cjs','scene_inputs.cjs','partition_scene.cjs','ocean.webmanifest','room-service.json']]
    for folder in ['src','assets','music']:
        files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
    records=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
    verify_snapshot()
    (ROOT/'MANIFEST.json').write_text(json.dumps({'version':version,'scope':'served game and build sources','files':records},ensure_ascii=False,indent=2)+'\n','utf-8')
    verify_snapshot()
    print(f'Portable: {len(portable.encode()):,} bytes; modular HTML: {len(site.encode()):,} bytes.')
if __name__=='__main__':main()
