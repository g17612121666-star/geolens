/** Publish explicit, source-reviewed assignments. No search or image fallback. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as current from '../src/lib/photo-assign.ts';

const sources = JSON.parse(readFileSync('scripts/verified-photo-sources.json','utf8'));
const approved = JSON.parse(readFileSync('scripts/approved-photo-candidates.json','utf8'));
const direct = JSON.parse(readFileSync('scripts/direct-photo-sources.json','utf8'));
const registry = Object.fromEntries(Object.entries(current).map(([key,value]) => [key,{...value}]));
const refs = new Map();
function assign(group,key,id,caption) {
  if (!registry[group][key]) throw new Error(`Unknown slot: ${group}/${key}`);
  const source = sources.find(s => s.id === id);
  if (!source || !existsSync(`public/photos/verified/${id}.jpg`)) throw new Error(`Missing reviewed image: ${id}`);
  const {url:_download,id:_id,...metadata}=source;
  registry[group][key]={...metadata,src:`/photos/verified/${id}.jpg`,...(caption ? {caption} : {})};
  refs.set(`${group}/${key}`,`{ ...VERIFIED_PHOTOS[${JSON.stringify(id)}]${caption ? ', caption: '+JSON.stringify(caption) : ''} }`);
}
for (const record of [
  ...approved,
  ...direct,
  {id:'mantle-xenolith',labs:['earth-interior']},
  {id:'atmospheric-limb',labs:['atmosphere-layers']},
]) for (const slug of record.labs ?? []) {
  assign('LAB_COVER',slug,record.id);
  assign('TEACHER_HERO',slug,record.id);
}
const assignments=existsSync('scripts/glossary-photo-assignments.json')
  ? JSON.parse(readFileSync('scripts/glossary-photo-assignments.json','utf8')) : [];
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const legacyFold=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for (const row of assignments) for (const term of row.terms) {
  assign('GLOSSARY_PHOTO',term,row.source,row.caption);
  for (const key of Object.keys(registry.TERM_THUMB)) if ([fold(term),legacyFold(term)].includes(key.split('--')[1])) assign('TERM_THUMB',key,row.source,row.caption);
}
for (const [file,group] of [['realm-photo-assignments.json','REALM_COVER'],['case-photo-assignments.json','CASE_COVER_EXTRA']]) {
  if (!existsSync(`scripts/${file}`)) continue;
  for (const [key,value] of Object.entries(JSON.parse(readFileSync(`scripts/${file}`,'utf8')))) {
    const {source,caption}=typeof value==='string' ? {source:value} : value;
    assign(group,key,source,caption);
  }
}
const header=`import { VERIFIED_PHOTOS } from './verified-photos.ts';\n/** Assignments from scripts/sync-reviewed-media.mjs. Legacy entries remain pending review. */\nexport type PhotoSlot = { src: string; alt: string; caption: string; credit: string; kind: 'photo' | 'scientific-image' | 'diagram'; sourceUrl?: string; licenseUrl?: string };\n`;
const body=Object.entries(registry).map(([group,slots])=>`export const ${group}: Record<string, PhotoSlot> = {\n${Object.entries(slots).map(([key,slot])=>`  ${JSON.stringify(key)}: ${refs.get(`${group}/${key}`) ?? JSON.stringify(slot)},`).join('\n')}\n};\n`).join('\n');
writeFileSync('src/lib/photo-assign.ts',header+'\n'+body);
console.log(`Updated ${refs.size} explicitly matched image slots.`);
