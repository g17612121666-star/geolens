"""Encode the official 0.1-degree Beck V3 classification as data, not an RGB photograph.
The shader decodes red-channel integers 0..5 with nearest-neighbour sampling.
"""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
source=root/'reports/koppen/koppen_geiger_0p1.tif'
image=Image.open(source)
assert image.size==(3600,1800) and image.mode=='P'
lookup=[0]*256
for code in range(1,31):lookup[code]=1 if code<=3 else 2 if code<=7 else 3 if code<=16 else 4 if code<=28 else 5
values=bytes(lookup[v] for v in image.tobytes())
out=root/'public/textures/climate-families.png'
Image.frombytes('L',image.size,values).save(out,optimize=True)
record={'sourceUrl':'https://www.gloh2o.org/koppen/','doi':'https://doi.org/10.1038/s41597-023-02549-6','license':'CC BY 4.0','credit':'Beck et al. (2023), V3, 1991–2020, official 0.1-degree raster','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'width':3600,'height':1800,'operation':'Codes 1–30 grouped into A–E; no interpolation; red-channel data 0=ocean/no data, 1–5=A–E','sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(root/'public/textures/climate-families.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print('Encoded',image.size,'A–E family grid')
