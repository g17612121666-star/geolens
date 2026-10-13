"""Build labelled contact sheets from the CURRENT replacements for the 241 original diagrams.
This is a review aid, not an automatic semantic approval.
"""
from pathlib import Path
import json
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]
baseline=json.loads((root/'reports/media-baseline.json').read_text(encoding='utf-8'))['rows']
current=json.loads((root/'reports/media-audit.json').read_text(encoding='utf-8'))['rows']
keys={r['key'] for r in baseline if r['group']=='GLOSSARY_PHOTO' and r['kind']=='diagram'}
rows=sorted([r for r in current if r['group']=='GLOSSARY_PHOTO' and r['key'] in keys],key=lambda r:r['key'].casefold())
assert len(rows)==241
out=root/'reports/glossary-original-diagrams';out.mkdir(exist_ok=True)
(out/'assignments.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for start in range(0,len(rows),24):
    page=rows[start:start+24];canvas=Image.new('RGB',(1200,240*((len(page)+3)//4)),'#11191c');draw=ImageDraw.Draw(canvas)
    for i,row in enumerate(page):
        x=(i%4)*300;y=(i//4)*240
        with Image.open(root/'public'/row['src'].lstrip('/')) as source:
            thumb=ImageOps.contain(source.convert('RGB'),(292,188));canvas.paste(thumb,(x+(292-thumb.width)//2,y))
        draw.text((x+5,y+192),row['key'],fill='white')
        draw.text((x+5,y+210),Path(row['src']).stem[:40],fill='#8ebfb5')
    canvas.save(out/f'batch-{start//24+1:02}.jpg',quality=92)
print(f'Rebuilt {len(rows)} labelled review slots from current audit.')
