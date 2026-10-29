"""Run the actual pack-only pipeline against small isolated input fixtures.

These verify mutation rejection, not replay placement or rendered quality.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('ocean_pack_fixture',ROOT/'build.py')
build=importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

def run_case(mutation):
    with tempfile.TemporaryDirectory(prefix='ocean-pack-guard-') as directory:
        folder=Path(directory)
        def put(name,content):
            file=folder/name
            file.parent.mkdir(parents=True,exist_ok=True)
            file.write_text(content)
        for name in ['build.py','scene_inputs.cjs','bake_scene.cjs']:
            shutil.copyfile(ROOT/name,folder/name)
        for name in build.JS_FILES:
            put('src/'+name,'// isolated fixture '+name+'\n')
        for name in ['README.md','CREDITS.md','LICENSE','.nojekyll','ocean.webmanifest']:
            put(name,'fixture')
        put('VERSION','0.0.0-test')
        put('room-service.json','{"endpoint":null}')
        put('src/shell.html','<!doctype html><style>/*__CSS__*/</style><script>/*__JS__*/</script>')
        put('src/style.css','body {}')
        put('src/mobile-controls.css','body {}')
        put('assets/coral_forms.json','{}')
        (folder/'music').mkdir()
        archive=b'isolated archive fixture, not a real scene'
        (folder/'assets/reef.mesh.gz').write_bytes(archive)
        mutations={
            'none':'',
            'source':"fs.appendFileSync('src/world.js','// changed during packing');",
            'archive':"fs.appendFileSync('assets/reef.mesh.gz','changed during packing');",
            'replay':"const p=JSON.parse(fs.readFileSync('assets/reef-growth.json'));p.failed=[{}];fs.writeFileSync('assets/reef-growth.json',JSON.stringify(p));",
            'replay-valid':"const p=JSON.parse(fs.readFileSync('assets/reef-growth.json'));p.actors[0].to.p[1]=.125;fs.writeFileSync('assets/reef-growth.json',JSON.stringify(p));",
        }
        put('partition_scene.cjs',"const fs=require('node:fs');"+mutations[mutation])
        inputs=json.loads(subprocess.check_output(['node','scene_inputs.cjs'],cwd=folder,text=True))
        replay={'format':'return-blue/reef-growth/1','sourceSHA256':inputs['sourceSHA256'],'sourceInputs':inputs['files'],'sceneArchiveSHA256':hashlib.sha256(archive).hexdigest(),'contentStamp':'0123456789abcdef','failed':[],'batchLimits':[],'actors':[{'family':'fixture-only','from':{'p':[0,0,0]},'to':{'p':[0,0,0]}}]}
        put('assets/reef-growth.json',json.dumps(replay))
        outputs=['standalone.html','index.html','src/config.js','MANIFEST.json']
        for name in outputs:
            put(name,'original derived fixture')
        before={name:(folder/name).read_bytes() for name in outputs}
        result=subprocess.run(['python3','build.py','--pack-only'],cwd=folder,text=True,capture_output=True)
        if mutation=='none':
            assert result.returncode==0,result.stderr
            assert all((folder/name).read_bytes()!=before[name] for name in outputs)
        else:
            assert result.returncode!=0,'Mid-pack '+mutation+' mutation was silently accepted'
            assert all((folder/name).read_bytes()==before[name] for name in outputs),'Derived files changed after rejected mutation'
        return {'case':mutation,'passed':True,'exitCode':result.returncode}

if __name__=='__main__':
    cases=[]
    for name in ['none','source','archive','replay','replay-valid']:
        cases.append(run_case(name))
        print('PASS '+name)
    print(json.dumps({'status':'passed','method':'actual pack-only pipeline with isolated synthetic inputs','cases':cases}))
