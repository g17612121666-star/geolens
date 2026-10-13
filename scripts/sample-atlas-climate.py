"""Extract Atlas reference-point climates from Beck et al. 1991–2020, V3.
Input: official Figshare archive file 61012822, 1991_2020/koppen_geiger_0p00833333.tif.
No country-wide climate is inferred from a capital. Coastal no-data pixels use the
nearest classified pixel within 5 km, with sample position/distance recorded.
"""
from pathlib import Path
import json,re,math,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'reports/koppen/koppen_geiger_0p00833333.tif'
# The official, locally checked 43200 x 21600 global classified raster is intentional.
Image.MAX_IMAGE_PIXELS=None
im=Image.open(source)
assert im.size==(43200,21600) and im.mode=='P'
symbols='Af Am Aw BWh BWk BSh BSk Csa Csb Csc Cwa Cwb Cwc Cfa Cfb Cfc Dsa Dsb Dsc Dsd Dwa Dwb Dwc Dwd Dfa Dfb Dfc Dfd ET EF'.split()
text=(ROOT/'src/lib/atlas-data.ts').read_text(encoding='utf-8')
places=re.findall(r'\{ id: "([^"]+)", name: "([^"]+)".*?lat: (-?[\d.]+), lon: (-?[\d.]+)',text)
pixels=im.load();result={}
for id,name,lat,lon in places:
 lat,lon=float(lat),float(lon);x=min(43199,max(0,int((lon+180)*120)));y=min(21599,max(0,int((90-lat)*120)))
 value=pixels[x,y];sample=(x,y);distance=0
 if not value:
  nearest=[]
  for dy in range(-7,8):
   for dx in range(-7,8):
    sx,sy=(x+dx)%43200,min(21599,max(0,y+dy));v=pixels[sx,sy]
    d=math.hypot(dx*math.cos(math.radians(lat)),dy)*111.195/120
    if v and d<=5:nearest.append((d,v,sx,sy))
  if nearest:distance,value,sx,sy=min(nearest);sample=(sx,sy)
 code=symbols[value-1] if value else None
 result[id]={'code':code,'family':code[0] if code else None,'lat':lat,'lon':lon,'sampleLat':90-(sample[1]+.5)/120,'sampleLon':-180+(sample[0]+.5)/120,'coastalOffsetKm':round(distance,2)}
 if not code: print('NO DATA',id)
(ROOT/'scripts/atlas-climate-data.json').write_text(json.dumps({'sourceUrl':'https://www.gloh2o.org/koppen/','doi':'https://doi.org/10.1038/s41597-023-02549-6','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','credit':'Beck et al. (2023), V3 · 1991–2020 · 1 km','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'places':result},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Extracted',len(result),'reference points;',sum(v['coastalOffsetKm']>0 for v in result.values()),'coastal offsets')
