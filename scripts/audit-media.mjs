import * as registry from '../src/lib/photo-assign.ts';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VERIFIED_PHOTOS } from '../src/lib/verified-photos.ts';
import { LAB_GALLERY, CASE_GALLERY } from '../src/lib/media-galleries.ts';
const flat = gallery => Object.fromEntries(Object.entries(gallery).flatMap(([key, list]) => list.map((slot, i) => [`${key}#${i + 1}`, slot])));

const atlas=JSON.parse(readFileSync('scripts/atlas-photo-assignments.json','utf8'));
const surfaces={...registry,ATLAS_PHOTOS:Object.fromEntries(Object.entries(atlas).map(([key,id])=>[key,VERIFIED_PHOTOS[id]])),EARTH_MOTION:{solstice:VERIFIED_PHOTOS['meteosat-december-solstice'],sundial:VERIFIED_PHOTOS['greens-mill-sundial']},LAB_GALLERY:flat(LAB_GALLERY),CASE_GALLERY:flat(CASE_GALLERY)};

const rows = Object.entries(surfaces).flatMap(([group, slots]) => Object.entries(slots).map(([key, slot]) => {
  if(!slot) throw new Error(`Missing reviewed assignment: ${group}/${key}`);
  const file = resolve('public', slot.src.replace(/^\//, ''));
  const bytes = existsSync(file) ? readFileSync(file) : null;
  return {group, key, ...slot, exists:!!bytes, bytes:bytes?.length ?? 0,
    sha256:bytes ? createHash('sha256').update(bytes).digest('hex') : null,
    requiresReview:!['photo','scientific-image'].includes(slot.kind) || !slot.sourceUrl || !slot.licenseUrl || /classroom diagram|USGS-style/i.test(slot.credit+' '+slot.caption),
  };
}));
const groups = Object.fromEntries(Object.keys(surfaces).map(group => {
  const all=rows.filter(r=>r.group===group);
  return [group, {slots:all.length, diagrams:all.filter(r=>r.kind==='diagram').length,
    missing:all.filter(r=>!r.exists).length, needsReview:all.filter(r=>r.requiresReview).length}];
}));
const dest=process.argv[2] ?? 'reports/media-audit.json';
mkdirSync(resolve(dest,'..'),{recursive:true});
writeFileSync(dest,JSON.stringify({groups,rows},null,2)+'\n');
console.log(JSON.stringify(groups,null,2));
const baseline=JSON.parse(readFileSync('reports/media-baseline.json','utf8')).rows;
const oldByKey=new Map(baseline.map(r=>[`${r.group}/${r.key}`,r]));
const replacements=rows.map(r=>({...r,previousSrc:oldByKey.get(`${r.group}/${r.key}`)?.src??null,previousKind:oldByKey.get(`${r.group}/${r.key}`)?.kind??null}));
writeFileSync('reports/media-replacements.json',JSON.stringify(replacements,null,2)+'\n');
writeFileSync('public/photos/manifest.json',JSON.stringify({count:rows.length,items:rows.map(({group,key,src,sha256,...r})=>({path:src,used_on:`${group}:${key}`,content_hash:sha256,...r}))},null,2)+'\n');
if(rows.some(r=>!r.exists||r.requiresReview)) process.exitCode=1;
