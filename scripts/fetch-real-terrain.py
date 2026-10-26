#!/usr/bin/env python3
"""Bake real US landscapes for the 3D labs from public-domain USGS data.

For each site this writes, into public/terrain/:
  <id>.bin   heights as little-endian uint16, N x N, row 0 = north edge,
             scaled linearly between the site's min and max elevation
  <id>.jpg   USGS orthoimagery covering the same square
and updates src/labs/shared/real-terrain-sites.json with the metadata.

Sources (both public domain, U.S. Geological Survey):
  elevation  3D Elevation Program (3DEP) ImageServer
  imagery    The National Map, USGS Imagery Only basemap

Usage: python3 scripts/fetch-real-terrain.py [site-id ...]
Needs numpy, pillow and tifffile.
"""

import io
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "terrain"
META = ROOT / "src" / "labs" / "shared" / "real-terrain-sites.json"
DEM = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
IMG = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export"
N = 257
IMAGE_PX = 1024

# Each site is a square of ground `km` wide centered on (lat, lon).
SITES = {
    "sugarloaf-md": dict(name="Sugarloaf Mountain, Maryland", lat=39.2626, lon=-77.3946, km=3.2),
    "st-helens": dict(name="Mount St. Helens, Washington", lat=46.2000, lon=-122.1890, km=12.0),
    "mauna-loa": dict(name="Mauna Loa, Hawaiʻi", lat=19.4750, lon=-155.6000, km=60.0),
    "yosemite-valley": dict(name="Yosemite Valley, California", lat=37.7380, lon=-119.5850, km=13.0),
    "grand-canyon": dict(name="Grand Canyon near Grand Canyon Village, Arizona", lat=36.0850, lon=-112.1200, km=16.0),
    "great-sand-dunes": dict(name="Great Sand Dunes, Colorado", lat=37.7600, lon=-105.5600, km=10.0),
}


def bbox(site):
    half_lat = site["km"] / 2 / 110.574
    half_lon = site["km"] / 2 / (111.320 * math.cos(math.radians(site["lat"])))
    return (site["lon"] - half_lon, site["lat"] - half_lat, site["lon"] + half_lon, site["lat"] + half_lat)


def get(url, params, tries=5):
    full = url + "?" + urllib.parse.urlencode(params)
    for attempt in range(tries):
        try:
            req = urllib.request.Request(full, headers={"User-Agent": "Geolens terrain baker"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # network hiccups: back off and retry
            if attempt == tries - 1:
                raise
            print(f"  retry after {e}", file=sys.stderr)
            time.sleep(2 ** attempt)


def bake(site_id, site):
    b = bbox(site)
    common = dict(bbox=",".join(f"{v:.6f}" for v in b), bboxSR=4326, imageSR=4326, f="image")
    dem = tifffile.imread(io.BytesIO(get(DEM, dict(common, size=f"{N},{N}", format="tiff", pixelType="F32",
                                                   interpolation="RSP_BilinearInterpolation"))))
    dem = np.asarray(dem, dtype=np.float64)
    # No-data (ocean, voids) comes back as huge negative values: treat it as sea level.
    dem[~np.isfinite(dem) | (dem < -500)] = 0.0
    lo, hi = float(dem.min()), float(dem.max())
    q = np.round((dem - lo) / (hi - lo) * 65535).astype("<u2")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{site_id}.bin").write_bytes(q.tobytes())
    jpg = get(IMG, dict(common, size=f"{IMAGE_PX},{IMAGE_PX}", format="jpg"))
    Image.open(io.BytesIO(jpg)).convert("RGB").save(OUT / f"{site_id}.jpg", quality=84, optimize=True, progressive=True)
    print(f"{site_id}: {lo:.0f}–{hi:.0f} m over {site['km']} km")
    return dict(
        name=site["name"], lat=site["lat"], lon=site["lon"], widthKm=site["km"], size=N,
        minM=round(lo, 1), maxM=round(hi, 1), bbox=[round(v, 6) for v in b],
    )


def main():
    ids = sys.argv[1:] or list(SITES)
    meta = json.loads(META.read_text()) if META.exists() else {}
    for site_id in ids:
        meta[site_id] = bake(site_id, SITES[site_id])
    META.write_text(json.dumps(dict(sorted(meta.items())), indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
