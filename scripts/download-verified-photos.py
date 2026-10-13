"""Fetch ONLY explicitly reviewed sources. Never invent art or fall back by topic.

Run with Python + Pillow. Review the downloaded image before adding an assignment.
The source manifest preserves the original page, author and licence.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, io, json, time, urllib.request
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
records = json.loads((ROOT/'scripts/verified-photo-sources.json').read_text(encoding='utf-8'))
OUT = ROOT/'public/photos/verified'
OUT.mkdir(parents=True, exist_ok=True)

def download(record):
    target = OUT/(record['id']+'.jpg')
    if not target.exists():
        for attempt in range(3):
            try:
                req=urllib.request.Request(record['url'],headers={'User-Agent':'TerraLens educational image audit (https://terralens.grok.me)'})
                with urllib.request.urlopen(req,timeout=30) as response:
                    data=response.read()
                with Image.open(io.BytesIO(data)) as source:
                    photo=ImageOps.exif_transpose(source).convert('RGB')
                    if photo.width < 900: raise ValueError('Source too small for a classroom image')
                    photo.thumbnail((1920,1440),Image.Resampling.LANCZOS)
                    photo.save(target,quality=92,optimize=True)
                break
            except Exception:
                if attempt==2: raise
                time.sleep(2)
    with Image.open(target) as image:
        size=image.size
    result={**record,'src':'/photos/verified/'+target.name,'width':size[0],'height':size[1],
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(record['id'],size,flush=True)
    return result

with ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(download,records))
(ROOT/'reports').mkdir(exist_ok=True)
(ROOT/'reports/verified-photo-downloads.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
