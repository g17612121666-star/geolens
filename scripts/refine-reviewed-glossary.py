"""Publish the explicitly inspected September 19 semantic corrections.

Candidate files stay in reports; this is an editorial decision list, never a
search-result fallback. Run after fetching and visually reviewing those files.
"""
from pathlib import Path
import json, shutil

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def write(path, value): (ROOT/path).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
sources = {r['id']:r for r in read('scripts/direct-photo-sources.json')}
def source(id, url, page, licence, credit, alt, caption, kind='photo', candidate=None, labs=None):
    row = dict(id=id,url=url,sourceUrl=page,licenseUrl=licence,credit=credit,alt=alt,caption=caption,kind=kind)
    if labs: row['labs']=labs
    sources[id]=row
    shutil.copyfile(ROOT/'reports/semantic-candidates'/f'{candidate or id}.jpg', ROOT/'public/photos/verified'/f'{id}.jpg')
def commons(id, group, index, alt, caption, kind='photo'):
    row=read(f'reports/semantic-candidates/{group}.json')[index]
    source(id,row['url'],row['sourceUrl'],row['licenseUrl'] or row['sourceUrl'],f"{row['author']} / Wikimedia Commons · {row['license']} · resized",alt,caption,kind,row['id'])

commons('kamoamoa-fissure-2011','fissure',1,
    'A line of lava fountains and gas rises from the Kamoamoa fissure in forest southwest of Puʻu ʻŌʻō, Hawaiʻi.',
    'USGS, 5 March 2011: lava erupts along a newly opened fissure between Puʻu ʻŌʻō and Nāpau, Kīlauea. Several fountains mark the linear opening.')
commons('first-quarter-moon-2019','quarter',0,
    'First-quarter Moon photographed from Calabria, with the right half of the visible lunar disc sunlit.',
    'A telescopic photograph of the first-quarter Moon on 9 July 2019. Near quadrature, the Sun and Moon lie about 90° apart in our sky.')
commons('hondius-globe-gores-1615','gores',0,
    'Digitised historical sheets of narrow, tapered terrestrial map strips intended to cover a 19-centimetre globe.',
    'Library of Congress: Hondius terrestrial globe gores, reissued by Giuseppe di Rossi in 1615. This is a scan of a real cartographic object; the tapered paper strips were designed to fit a spherical globe. Its historical geography is not a modern reference map.',
    'scientific-image')
commons('naze-london-clay','london-clay',0,
    'Grey London Clay exposed below yellow-brown Red Crag in the sea cliffs at Walton-on-the-Naze, Essex.',
    'London Clay forms the lower part of the Naze cliffs. Clay-rich beds commonly transmit groundwater slowly and can act as aquitards; the cliff exposes the material, while permeability is established by testing.')
commons('aitrach-valley','aitrach-valley',0,
    'A broad, grassy former river valley near Blumberg, now drained by the much smaller Aitrach.',
    'The Aitrach valley preserves the former route of the Feldberg Danube. Capture by the Wutach diverted its large upstream flow towards the Rhine, leaving the small Aitrach in an oversized valley. The channel itself is difficult to distinguish in this landscape view.')
source('smithsonian-magnetite',
    'https://ids.si.edu/ids/deliveryService?id=ark%3A%2F65665%2Fm3527db5f5a09f4a9e9d87b803eca840bc&max=1920',
    'https://naturalhistory.si.edu/object/nmnhmineralsciences_1126519',
    'https://creativecommons.org/publicdomain/zero/1.0/',
    'Chip Clark / Smithsonian National Museum of Natural History · CC0 · resized',
    'Metallic black octahedral magnetite crystals on rock, Smithsonian specimen B10614 from Binnental, Switzerland.',
    'Magnetite, photographed in the Smithsonian collection. Pure magnetite loses its spontaneous magnetic ordering near 580 °C, its Curie temperature. This specimen photograph shows the mineral, not a temperature measurement.')
nasaLicence='https://www.nasa.gov/nasa-brand-center/images-and-media/'
source('diomede-landsat',
    'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/91000/91638/diomedes_oli_2017157_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=5475&w=8213',
    'https://science.nasa.gov/earth/earth-observatory/yesterday-and-tomorrow-islands-91638/',nasaLicence,
    'Joshua Stevens / NASA Earth Observatory, Landsat data: USGS · public domain · resized',
    'Big and Little Diomede islands in the Bering Strait, between snow-covered Russia and Alaska, seen by Landsat 8.',
    'Landsat 8, 6 June 2017: Big Diomede (the larger island, left) belongs to Russia and Little Diomede (right) to the US. The International Date Line passes through the water between them; it is a convention, not a visible physical feature.')
for id,filename,alt,caption,labs in [
    ('ceres-reflected-2000-2015','ceres_sw_all_average_2000-2015.png',
     'NASA CERES map of reflected shortwave radiation averaged over 2000–2015, with a 0–385 W m⁻² colour scale.',
     'NASA CERES observations, 2000–2015 mean. Colours show sunlight reflected by the Earth system in W m⁻². This is outgoing shortwave flux, not incoming solar irradiance or albedo itself.',None),
    ('ceres-net-2000-2015','ceres_net_all_average_2000-2015.png',
     'NASA CERES map of net radiation averaged over 2000–2015, with a −200 to +200 W m⁻² colour scale.',
     'NASA CERES observations, 2000–2015 mean. Net radiation is incoming sunlight minus reflected shortwave and emitted longwave energy at the top of the atmosphere. Positive values indicate a radiative surplus.', ['energy-budget'])
]:
    source(id,'https://svs.gsfc.nasa.gov/vis/a030000/a030600/a030604/'+filename,
        'https://svs.gsfc.nasa.gov/30604',nasaLicence,'NASA Goddard Space Flight Center / Scientific Visualization Studio · public domain · resized',alt,caption,'scientific-image',labs=labs)
write('scripts/direct-photo-sources.json',list(sources.values()))

corrections=[
 ('naze-london-clay',['Aquitard'],None),
 ('aitrach-valley',['Beheaded stream'],None),
 ('place-us-la',['Barrier island'],'Landsat observations of the Chandeleur barrier islands, Louisiana. Narrow sandy islands separate the Gulf of Mexico from shallow coastal waters; storm erosion can fragment and reshape them.'),
 ('denali-glacial-basin',['Basin'],'A mountain basin occupied by glacier ice in the Muldrow Glacier area, Denali. A basin is a low area bounded by higher ground; drainage basins are defined by the area contributing water to an outlet.'),
 ('smithsonian-magnetite',['Curie point'],None),
 ('kamoamoa-fissure-2011',['Fissure eruption'],None),
 ('diomede-landsat',['International Date Line'],None),
 ('sawtooth-snowmelt',['Nival'],'Seasonal snowmelt feeds a stream near Fourth of July Lake, Idaho. A nival river regime is strongly influenced by snow accumulation and melt; this photograph shows a snowmelt source, not a measured annual hydrograph.'),
 ('first-quarter-moon-2019',['Quadrature'],None),
 ('first-quarter-moon-2019',['Neap tide'],'The first-quarter Moon is near quadrature. Solar and lunar tidal effects then partly oppose, favouring neap tides; the local minimum tidal range can lag the quarter phase and depends on the coastline and basin.'),
 ('hondius-globe-gores-1615',['Gores'],None),
 ('aletsch-glacier',['Eustatic'],'The Aletsch Glacier stores water on land. Melting land ice adds water to the ocean and contributes to eustatic sea-level rise; this photograph alone does not quantify a global sea-level change.'),
 ('mantle-xenolith',['ka'],'The volcanic host of this Peridot Mesa xenolith is described by its source as about 580 ka old: roughly 580,000 years. This dates the host eruption, not the formation of the older mantle fragment.'),
 ('cassini-saturn',['True scale'],'Cassini photographed Saturn and its rings together. Their apparent proportions belong to one perspective view; a true-scale model must use the same length multiplier for every dimension, with foreshortening treated separately.'),
 ('ucayali-meanders',['Long profile'],'The broad, low-gradient lower Ucayali River seen from the ISS. A river long profile follows bed elevation from source to mouth; this photograph shows the lowland reach, while constructing its profile requires elevation measurements.'),
 ('ceres-reflected-2000-2015',['Albedo'],'CERES measures reflected shortwave energy in W m⁻². Albedo is the fraction of incoming sunlight reflected, so obtaining it requires dividing reflected flux by the corresponding incoming flux; the colour scale here is not albedo.'),
 ('ceres-reflected-2000-2015',['Shortwave','Flux','Top of atmosphere'],None),
 ('ceres-net-2000-2015',['Energy budget'],None),
 ('ceres-reflected-2000-2015',['Absorption'],'This CERES observation maps reflected sunlight. Solar absorption by the Earth system is the incoming shortwave energy minus this reflected component; the image measures reflection rather than absorption directly.'),
 ('sdo-visible-sunspots',['Solar constant','Insolation'],'NASA SDO observes the solar photosphere and sunspots. The Sun supplies incoming solar radiation (insolation). The solar constant is irradiance near 1 AU on a plane perpendicular to the rays, about 1,361 W m⁻²; it is not measured by this visible-light photograph.'),
]
terms={term for _,tt,_ in corrections for term in tt}
rows=read('scripts/glossary-photo-assignments.json')
rows=[{**r,'terms':[t for t in r['terms'] if t not in terms]} for r in rows]
rows=[r for r in rows if r['terms']]
for src,tt,cap in corrections:
    rows.append(dict(source=src,terms=tt,**({'caption':cap} if cap else {})))
write('scripts/glossary-photo-assignments.json',rows)
defs=read('scripts/glossary-definitions.json')
defs['Basin']='A low area surrounded by higher ground. A drainage basin is the land area that sends water to a particular river, lake or other outlet.'
defs['Long profile']='The variation in river-bed elevation along a river from its source towards its mouth.'
defs['Curie point']='The temperature above which a material loses its spontaneous ferromagnetic or ferrimagnetic ordering; about 580 °C for pure magnetite.'
write('scripts/glossary-definitions.json',defs)
write('reports/semantic-candidates/approved-corrections.json',[dict(source=s,terms=t,caption=c) for s,t,c in corrections])
print('Reviewed source additions:',9,'; corrected terms:',len(terms))
