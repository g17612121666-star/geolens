"""Write 640px- and 960px-wide WebP copies of the site's photographs.

Run after adding or replacing a photo:  python3 scripts/make-photo-variants.py
A card downloads the 640px copy, about a sixth of the JPEG's bytes. On a sharp screen, or in a
larger view, the browser takes the 960px copy (about 40% of the JPEG) before the full 1280px JPEG.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "photos"
# Width and WebP quality of each copy; the folder is named after the width.
SIZES = ((640, 74), (960, 74))


def variants():
    for folder in (ROOT / "verified", ROOT):
        for width, quality in SIZES:
            out = folder / str(width)
            out.mkdir(exist_ok=True)
            for jpg in sorted(folder.glob("*.jpg")):
                webp = out / (jpg.stem + ".webp")
                if webp.exists() and webp.stat().st_mtime >= jpg.stat().st_mtime:
                    continue
                image = Image.open(jpg).convert("RGB")
                image.thumbnail((width, 10_000), Image.LANCZOS)
                image.save(webp, "WEBP", quality=quality, method=6)
                yield webp
            for webp in out.glob("*.webp"):
                if not (folder / (webp.stem + ".jpg")).exists():
                    webp.unlink()


if __name__ == "__main__":
    made = list(variants())
    print(f"wrote {len(made)} variants")
