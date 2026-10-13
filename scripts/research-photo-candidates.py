"""Research only. Candidates are NEVER assigned to the site automatically.

Read descriptions/licences and inspect contact sheets before explicit approval.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import html, io, json, re, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
OUT=ROOT/'reports/photo-candidates'
OUT.mkdir(parents=True,exist_ok=True)
queries=json.loads((ROOT/'scripts/photo-queries.json').read_text(encoding='utf-8'))
UA='TerraLens classroom media review (https://terralens.grok.me; no automated publication)'
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=25) as response: return response.read()
def plain(value): return html.unescape(re.sub('<[^>]+>','',value)).strip()
def research(item):
    key,query=item
    meta=OUT/(key+'.json')
    if meta.exists(): return
    params=dict(action='query',format='json',generator='search',gsrsearch=query+' filetype:bitmap',gsrnamespace=6,gsrlimit=7,prop='imageinfo',iiprop='url|size|extmetadata',iiurlwidth=1280)
    try:
        payload=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
        rows=[]
        for page in sorted(payload.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',99)):
            info=page.get('imageinfo',[{}])[0]; ext=info.get('extmetadata',{})
            val=lambda k:plain(ext.get(k,{}).get('value',''))
            if info.get('width',0)<900 or not re.search(r'\.(jpg|jpeg|png|tif|tiff)$',page['title'],re.I): continue
            if re.search(r'AI.generated|diagrams|drawings|paintings|artistic.impression',val('Categories'),re.I): continue
            row=dict(id=f'{key}-{len(rows)+1}',title=page['title'],sourceUrl=info['descriptionurl'],url=info.get('thumburl',info['url']),license=val('LicenseShortName'),licenseUrl=val('LicenseUrl'),author=val('Artist'),description=val('ImageDescription'),categories=val('Categories'))
            try:
                raw=get(row['url'])
                with Image.open(io.BytesIO(raw)) as im:
                    im=ImageOps.exif_transpose(im).convert('RGB'); im.thumbnail((1280,1280)); im.save(OUT/(row['id']+'.jpg'),quality=89)
                rows.append(row)
            except Exception as e: print('image failed',key,str(e)[:90],flush=True)
            if len(rows)>=3: break
        meta.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(key,len(rows),flush=True)
    except Exception as e: print('query failed',key,str(e)[:120],flush=True)
    time.sleep(.5)
with ThreadPoolExecutor(max_workers=2) as pool: list(pool.map(research,queries.items()))
