"""Promote the explicitly reviewed candidates; never pick a search result by rank."""
from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
approved=read('scripts/approved-photo-candidates.json')
sources=read('scripts/verified-photo-sources.json')
by_id={s['id']:s for s in sources}
direct=ROOT/'scripts/direct-photo-sources.json'
if direct.exists():
    for source in read('scripts/direct-photo-sources.json'):
        by_id[source['id']]={k:v for k,v in source.items() if k!='labs'}
for item in approved:
    topic=item['candidate'].rsplit('-',1)[0]
    candidates=read('reports/photo-candidates/'+topic+'.json')
    row=next(r for r in candidates if r['id']==item['candidate'])
    if not row['author'] or not row['license']: raise ValueError('Missing provenance: '+row['id'])
    by_id[item['id']]={
        'id':item['id'],'url':row['url'],'sourceUrl':row['sourceUrl'],
        'licenseUrl':row['licenseUrl'] or row['sourceUrl'],
        'credit':item.get('credit',row['author']+' / Wikimedia Commons · '+row['license']+' · resized'),
        'alt':item['alt'],'caption':item['caption'],'kind':item['kind'],
    }
    target=ROOT/'public/photos/verified'/(item['id']+'.jpg')
    if not target.exists(): shutil.copyfile(ROOT/'reports/photo-candidates'/(item['candidate']+'.jpg'),target)
(ROOT/'scripts/verified-photo-sources.json').write_text(json.dumps(list(by_id.values()),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Explicitly approved sources:',len(by_id))
