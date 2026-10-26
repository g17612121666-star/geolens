import fs from 'node:fs';
import ts from 'typescript';
import * as photos from '../src/lib/photo-assign.ts';
import {LAB_VIDEOS} from '../src/lib/lab-videos.ts';
const sources = JSON.parse(fs.readFileSync('scripts/verified-photo-sources.json', 'utf8'));
const atlas = JSON.parse(fs.readFileSync('scripts/atlas-photo-assignments.json', 'utf8'));
const sourceById = Object.fromEntries(sources.map(s => [s.id, s]));
const surfaces = {...photos, ATLAS_PHOTOS: Object.fromEntries(Object.entries(atlas).map(([key,id]) => [key, {...sourceById[id], src:`/photos/verified/${id}.jpg`}])), EARTH_MOTION: {solstice: photos.LAB_COVER.seasons, sundial: photos.LAB_COVER['solar-altitude']}};
const rows = Object.entries(surfaces).flatMap(([group, slots]) => Object.entries(slots).map(([key, slot]) => ({group, key, ...slot, exists:fs.existsSync(`public${slot.src}`)})));
fs.writeFileSync('reports/geolens-photo-current.json',JSON.stringify(rows,null,2)+'\n');
const oldCode=ts.transpile(fs.readFileSync('reports/geolens-video-before.txt','utf8'),{module:ts.ModuleKind.ESNext});
const old = (await import('data:text/javascript;base64,'+Buffer.from(oldCode).toString('base64'))).LAB_VIDEOS;
const removed=Object.entries(old).filter(([slug]) => !LAB_VIDEOS[slug]);
const verified=[...new Map(Object.values(LAB_VIDEOS).map(v => [v.youtubeId,v])).values()];
const count=Object.fromEntries(Object.entries(surfaces).map(([g,x])=>[g,Object.keys(x).length]));
const bad={tides:'Ocean circulation does not explain gravitational tides.', 'universe-scale':'Earth movement does not explain the astronomical scale hierarchy.', 'solar-system':'Earth movement is not a solar-system comparison.', earthquakes:'Evidence for the core does not teach fault rupture and earthquake shaking.', enso:'A general climate-change film is not a focused explanation of ENSO.', 'carbon-cycle':'Climate change alone does not establish coverage of carbon stores and transfers.', isostasy:'A film about ocean-floor depth does not establish isostatic adjustment.', 'cyclone-anticyclone':'A general natural-hazards film does not explain both low- and high-pressure circulation.', 'grid-references':'A map introduction does not establish four- and six-figure grid-reference instruction.', contours:'Landform examples do not establish contour-reading instruction.', 'geologic-time':'The rock-cycle film does not establish a geological-time lesson.', periglacial:'Glaciers and periglacial ground processes are different topics.'};
const lines=[
'# Geolens media review — 21 September 2026',
'',
'## Scope and evidence',
'',
`- Checked ${rows.length} live image assignments for local file existence: ${rows.filter(r=>!r.exists).length} missing. Surface counts: ${Object.entries(count).map(([k,v])=>`${k} ${v}`).join('; ')}.`,
'- Visually inspected all 319 source image files in this session: 89 unique case/lab/realm cover images in `reports/geolens-media-sheets/covers-1.jpg` through `covers-3.jpg`, then the remaining 230 source images in `remaining-1.jpg` through `remaining-8.jpg`. This was contact-sheet subject review, not a claim that every location, date or scientific value can be authenticated visually.',
'- Read the 417 glossary image-to-term mappings and the full lab/teacher/realm/case assignment lists. Four word-sense errors were found and corrected in both the glossary and lab term thumbnails.',
'- Fresh primary photograph source-page verification succeeded for 1 of 319 source records: NASA’s Hawaiian Islands page. The other 318 source-page/license records are inherited from `scripts/verified-photo-sources.json` and the previous reviews. Three attempted Commons rechecks failed at the web connection layer; their images were nevertheless visually reviewed and their documented source identities were retained. The exact source inventory below makes this boundary explicit.',
`- Checked all ${Object.keys(old).length} former lab-video assignments. Retained ${verified.length} unique publisher-confirmed videos across ${Object.keys(LAB_VIDEOS).length} closely matched labs; removed ${removed.length} mappings. No substitute was added merely to fill a video slot.`,
'- Publisher descriptions and video titles establish subject correspondence. Playback inside the classroom network was not verified; successful search indexing is not proof that an embedded player will load there.',
'',
'## Corrected image assignments',
'',
'| Term and lab thumbnail | Previous mistake | Replacement |',
'|---|---|---|',
'| Barrier / rain-shadow--barrier | Coastal tombolo for a mountain barrier | Hawaiian mountain rain shadow, NASA MODIS |',
'| Crest / soil-catena--crest | Wave crest for a hillslope crest | Addi Selam soil catena and hillslope |',
'| Horizon / soil-profile--horizon | Atmospheric horizon for a soil horizon | Measured Wuhlheide soil profile |',
'| Root / isostasy--root | Plant roots for a crustal root | Himalayan mountain belt, with a caption distinguishing visible relief from the inferred root |',
'',
'NASA primary source checked: https://science.nasa.gov/earth/earth-observatory/hawaiian-islands/ . Its description confirms greener northeastern windward slopes and leeward contrasts in the 27 May 2003 MODIS observation.',
'',
'## Retained videos',
'',
'| Labs | Video | Publisher evidence |',
'|---|---|---|',
...verified.map(v=>`| ${Object.entries(LAB_VIDEOS).filter(([,x])=>x.youtubeId===v.youtubeId).map(([s])=>s).join(', ')} | ${v.title} (${v.youtubeId}) | ${v.sourceUrl} |`),
'',
'Corrected the old Crash Course episode labels: plate tectonics #19, rocks #18, rivers #23, glaciers #26. Removed unverified duration and license assertions from the video catalog. External player material remains with its publisher.',
'',
'## Removed video mappings',
'',
'| Lab | Former video | Reason |',
'|---|---|---|',
...removed.map(([slug,v])=>`| ${slug} | ${v.title} (${v.youtubeId}) | ${bad[slug] ?? 'Exact lesson coverage and/or the publisher-to-video-ID match was not freshly established. Omitted pending a focused review.'} |`),
'',
'## Remaining manual checks',
'',
'1. Embedded playback of the seven retained video IDs below, including school-network availability, captions and the visible title. Topic correspondence was checked; iframe playback was not.',
...verified.map(v=>`   - ${v.youtubeId}: https://www.youtube.com/watch?v=${v.youtubeId}`),
'2. `nrcs-raindrop-soil-splash`: check the original USDA/NRCS record to confirm the substrate and the phrase “splashes on soil”. The enlarged local image shows drop impact and scattered dark material; that does not independently authenticate its archive description.',
'3. Re-open the three replacement source pages for `addi-selam-catena`, `berlin-soil-profile` and `himalaya-iss` if fresh source-page verification is required. Their inherited titles and local images match the intended subjects; the new captions avoid claiming that an invisible crustal root is directly photographed.',
'4. For a complete fresh provenance audit, revisit all 318 records marked “inherited source record” below. All 319 local files were visually inspected; dates, exact places, photographer identity and reuse terms remain source-record claims where no fresh page check is recorded. Atlas landscape photos describe their own named landscape and should not be represented as photos of the selected capital.',
'',
'## Exact image-source inventory',
'',
'| Source asset | Visual check | Source-page check | Original page |',
'|---|---|---|---|',
...sources.map(s=>`| ${s.id} | Inspected in current contact sheets | ${s.id==='hawaii-windward-leeward'?'Fresh NASA page check':'Inherited source record'} | ${s.sourceUrl} |`),
'',
'## Copy and teaching checks',
'',
'- Rewrote all 35 case summaries, body paragraphs and teacher hints; replaced place-name dot lists with natural location phrases.',
'- Expanded 161 glossary definitions with process explanations and distinctions. All mapped entries now show a separate, term-specific observation paragraph; figures do not repeat that caption.',
'- Teacher index cards now use subject photographs and discussion questions. Individual notes include a lead photograph plus up to two distinct vocabulary observations, with printable content and no repeated fifteen-minute sales copy.',
'- `npm run typecheck` passed after these component and content changes. The root integration pass owns full dev/production browser and print regression checks.',
'',
];
fs.writeFileSync('reports/geolens-media-review.md',lines.join('\n'));
console.log(JSON.stringify({assignments:rows.length,missing:rows.filter(r=>!r.exists).length,sources:sources.length,oldVideos:Object.keys(old).length,retainedMappings:Object.keys(LAB_VIDEOS).length,retainedVideos:verified.length,removedMappings:removed.length},null,2));
