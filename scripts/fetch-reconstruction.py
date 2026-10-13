"""Cache attributed GPlates/EarthByte reconstructions, never invent continent trajectories."""
import hashlib,json,pathlib,urllib.request,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]/'public/geo/reconstruction'
root.mkdir(parents=True,exist_ok=True)
model='MULLER2019'
def fetch(age):
    path=root/f'coastlines-{age}.json'
    url=f'https://gws.gplates.org/reconstruct/coastlines/?time={age}&model={model}'
    if path.exists():raw=path.read_bytes()
    else:
        with urllib.request.urlopen(url,timeout=100) as r: raw=r.read()
        data=json.loads(raw)
        if data.get('type')!='FeatureCollection' or len(data.get('features',[]))<50:raise ValueError(f'Invalid coastline response {age}')
        path.write_bytes(raw)
    print(age,len(raw),flush=True)
    return {'ageMa':age,'url':url,'file':path.name,'sha256':hashlib.sha256(raw).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    files=list(pool.map(fetch,range(0,251,10)))
(root/'sources.json').write_text(json.dumps({'model':model,'credit':'EarthByte / GPlates · Müller et al. (2019), Young et al. (2019), Cao et al. (2020)', 'license':'CC BY 3.0','licenseUrl':'https://www.earthbyte.org/gplates-2-4-software-and-data-sets/','method':'Present-day coastline polygons reconstructed in a mantle reference frame; not ancient shorelines. Discrete 10 Ma snapshots; no invented interpolation.','files':files},indent=2),encoding='utf-8')
