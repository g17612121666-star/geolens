"""Reproduce browser lunar assets from NASA SVS LROC/LOLA data (no synthetic craters)."""
from pathlib import Path
import hashlib, json, urllib.request
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/textures/planets'
CACHE = ROOT / 'artifacts/lunar-source-data'
BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/'
FILES = ['lroc_color_poles_4k.tif', 'ldem_16_uint.tif']

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': 'http://127.0.0.1:7897'}))
    sources = []
    for name in FILES:
        dest = CACHE / name
        if not dest.exists():
            with opener.open(BASE + name, timeout=90) as response:
                dest.write_bytes(response.read())
        sources.append({'url': BASE + name, 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    Image.open(CACHE / FILES[0]).convert('RGB').save(OUT / 'moon-lroc-4k.jpg', quality=92, subsampling=0)
    # NASA's unsigned samples: half metres above 1727400 m. Convert to
    # kilometres above the 1737.4 km reference sphere, then encode -12..+12 km.
    elevation = np.asarray(Image.open(CACHE / FILES[1]), dtype=np.float32) / 2000 - 10
    encoded = np.rint(np.clip((elevation + 12) / 24, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(encoded).resize((4096,2048), Image.Resampling.LANCZOS).save(OUT / 'moon-lola-height.png')
    meta = {'source': 'https://svs.gsfc.nasa.gov/4720', 'credit': "NASA Scientific Visualization Studio / LROC / LOLA; Ernie Wright", 'license': 'NASA media use guidelines; credit retained', 'color': '2019 LROC natural-colour mosaic adapted for visualisation, not a scientific colour measurement', 'height': {'origin': 'LRO LOLA gridded elevation', 'encodedKm': [-12, 12], 'referenceRadiusKm':1737.4, 'sourceRangeKm':[float(elevation.min()),float(elevation.max())], 'verticalExaggeration':1, 'quantisationKm':24/255}, 'sources':sources}
    (OUT / 'moon-terrain.source.json').write_text(json.dumps(meta, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'images':[str(OUT / n) for n in ['moon-lroc-4k.jpg','moon-lola-height.png']], 'rangeKm':meta['height']['sourceRangeKm']}))

if __name__ == '__main__': main()
