"""Write 640px-wide WebP copies of the site's photographs for cards and thumbnails.

Run after adding or replacing a photo:  python3 scripts/make-photo-variants.py
Cards then download about a sixth of the bytes; full-size JPEGs stay for large views.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "photos"
WIDTH, QUALITY = 640, 74


def variants():
    for folder in (ROOT / "verified", ROOT):
        out = folder / "640"
        out.mkdir(exist_ok=True)
        for jpg in sorted(folder.glob("*.jpg")):
            webp = out / (jpg.stem + ".webp")
            if webp.exists() and webp.stat().st_mtime >= jpg.stat().st_mtime:
                continue
            image = Image.open(jpg).convert("RGB")
            image.thumbnail((WIDTH, 10_000), Image.LANCZOS)
            image.save(webp, "WEBP", quality=QUALITY, method=6)
            yield webp
        for webp in out.glob("*.webp"):
            if not (folder / (webp.stem + ".jpg")).exists():
                webp.unlink()


if __name__ == "__main__":
    made = list(variants())
    print(f"wrote {len(made)} variants")
