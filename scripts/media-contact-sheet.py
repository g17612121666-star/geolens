from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys, json

folder = Path(sys.argv[1])
files = sorted(folder.glob('*.jpg'))
prefix=folder.name
if len(sys.argv)>2:
    keys=list(json.loads(Path('scripts/photo-queries.json').read_text(encoding='utf-8')))[int(sys.argv[2]):]
    files=[p for p in files if p.stem.rsplit('-',1)[0] in keys]
    prefix+='-batch-'+sys.argv[2]
out = Path('reports/contact-sheets')
out.mkdir(parents=True, exist_ok=True)
for start in range(0,len(files),40):
    batch=files[start:start+40]
    canvas=Image.new('RGB',(1000,160*((len(batch)+4)//5)), '#171c20')
    draw=ImageDraw.Draw(canvas)
    for i,p in enumerate(batch):
        x=(i%5)*200;y=(i//5)*160
        with Image.open(p) as image:
            thumb=ImageOps.contain(image.convert('RGB'),(194,130))
            canvas.paste(thumb,(x+(194-thumb.width)//2,y))
        draw.text((x+3,y+132),p.stem[:28],fill='white')
    dest=out/(prefix+'-'+str(start//40+1)+'.jpg')
    canvas.save(dest,quality=90)
    print(dest)
