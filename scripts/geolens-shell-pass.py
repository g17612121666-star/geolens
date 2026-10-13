from pathlib import Path
import re,json
root=Path.cwd()
def update(name,fn):
 p=root/name;s=p.read_text(encoding='utf-8-sig');p.write_text(fn(s),encoding='utf-8')
update('src/components/zoomable-image.tsx',lambda s:s.replace('describedBy:string','describedBy?:string').replace('Ctrl + scroll to zoom · drag an enlarged image to pan','Hold Ctrl and scroll to zoom. Drag the enlarged image to move it.'))
update('src/components/layout/header.tsx',lambda s:s.replace('TerraLens','Geolens').replace('Date + latitude → noon Sun','Find the Sun’s height for a place and date').replace('Open-Meteo on a MapLibre map','Compare weather in two places').replace('Relief, rivers, plates, climate','Explore the geography of a place').replace('aria-haspopup="true"','aria-haspopup="true"\n        onClick={() => setOpen(!open)}\n        onKeyDown={e => {if(e.key === "Escape")setOpen(false);}}'))
update('src/lib/contact.ts',lambda s:re.sub(r'export const PRODUCER_LINE =[\s\S]*?(?=/\*\* Lead-in)', 'export const PRODUCER_LINE = "Li Zeyu is an Earth science educator and science communication enthusiast, founder and president of the geography club at Shanghai Pinghe School, and a member of the IB Class of 2028. He also serves as a student docent at the Shanghai Natural History Museum.";\n\n',s))
update('src/styles.css',lambda s:re.sub(r'\.font-cjk \{[^}]*\}\s*','',re.sub(r'html\[lang="zh-CN"\][\s\S]*$', '',s))+'''\n/* Shared editorial rhythm for the Geolens collections. */
.editorial-card {transition: border-color 180ms, transform 180ms;}
.editorial-card:hover {border-color:var(--color-glacier);transform:translateY(-3px);}
.hero-earth-poster {background:url('/textures/earth-day.jpg') 50% 50% / 200% 100%;box-shadow:inset -28px -12px 40px #071c32,inset 10px 5px 25px #ffffff30;}
.hero-globe {max-height:600px;}
@media(max-width:767px){.hero-globe {width:min(100%,360px);margin-inline:auto;}.home-intro{gap:0;}.home-intro h1{font-size:clamp(2.75rem,10vw,3.6rem);}}
@media(prefers-reduced-motion:reduce){.editorial-card:hover{transform:none;}}
''')
update('src/fonts.css',lambda s:s.split('/* Subset for the About bilingual line')[0])
update('src/routes/search.tsx',lambda s:re.sub(r'          <section>\s*<p className="section-label">\{tr\("Paths[^<]*[\s\S]*?</section>\s*','',re.sub(r'  const pathHits = useMemo\([\s\S]*?\}, \[needle\]\);\s*','',s)).replace('import { PATHS } from "@/lib/paths";','').replace('caseHits.length === 0 &&\n    pathHits.length === 0','caseHits.length === 0').replace("translateText(p.name,'zh',`atlas:${p.id}`),",'').replace('translateText,','').replace(',translateText','').replace('  { q: "季节", label: "季节" },\n','').replace(' 香港 上海','').replace('Search in English or Chinese. Press / to focus.','Search for a topic or place. Press / to focus the search box.').replace('TerraLens','Geolens').replace('This coordinate is empty ocean.','No results found.').replace('Nothing on the chart matches that. Try a realm name, a landform, or a place.','Try a subject, landform or place name.').replace('{tr(c.place)} · {tr(c.region)}','{tr(c.place)}').replace('{tr(p.hook)}',''))
update('src/lib/search-aliases.ts',lambda s:re.sub(r'^  [\u3400-\u9fff]+:.*\n','',s,flags=re.M).replace('Course codes and Chinese synonyms','Course codes and spelling alternatives'))
for name in ['src/routes/paths.index.tsx','src/routes/paths.$slug.tsx','src/lib/paths.ts']:
 (root/name).unlink()
# Keep the configured deployment hostname intact; it is an address, not a display brand.
for name in ['src/lib/seo.ts','src/routes/__root.tsx','src/routes/privacy.tsx','src/components/not-found.tsx']:
 update(name,lambda s:s.replace('TerraLens','Geolens').replace('/icons/terralens-','/icons/geolens-'))
update('src/routes/privacy.tsx',lambda s:s.replace('No account. No tracker.','How Geolens handles your data').replace('This page is the whole privacy notice. There is no hidden product.','You can use these contact details to ask about this privacy information.'))
for name in ['public/manifest.webmanifest','src/lib/og/site.json']:
 update(name,lambda s:s.replace('TerraLens','Geolens').replace('"title": ""','"title": "Geolens"').replace('/icons/terralens-','/icons/geolens-'))
for p in (root/'public/icons').glob('terralens-*'):
 p.rename(p.with_name(p.name.replace('terralens-','geolens-')))
update('public/sitemap.xml',lambda s:re.sub(r'\s*<url>\s*<loc>[^<]*/paths[^<]*</loc>[\s\S]*?</url>','',s))
