# Photos still to source (media audit, October 2026)

The audit reviewed every verified photo where it is used. Fixes that the existing library could cover have been applied. These spots need a new, openly licensed photo; the network policy blocked downloads from Wikimedia Commons, NASA and USGS during the audit.

Where a photo showed the wrong place or feature it has been taken out until a replacement arrives (Guyana atlas, Lake District hanging valley, seasons sundial, tsunami drawdown thumbnail). Elsewhere the current photo stays with a corrected caption.

Every new photo needs a record in `scripts/verified-photo-sources.json`, the file in `public/photos/verified/`, and `node scripts/audit-media.mjs` to refresh the manifest.

## crearlagh-hanging-valley (high)
- Where: case gallery: lake-district
- Problem: This is not a Lake District photo, and it is probably in Northern Ireland, not Scotland as the caption says. It also does not clearly show a hanging valley. On a Lake District case page it is the wrong place and it is mislabelled.
- Wanted: A Lake District hanging valley with its waterfall, for example Sourmilk Gill falling from Bleaberry Tarn's corrie to Buttermere, or Sour Milk Gill above Easedale. The photo should show both the higher tributary floor and the main glacial trough below it. Use a CC-licensed Geograph/Commons source.

## greens-mill-sundial (high)
- Where: lab gallery: seasons
- Problem: The caption is misleading. It says 'Its shadow is long in winter and short in summer', but no shadow is visible (the day is overcast). This is also a spherical equatorial sundial: its blade gnomon lies along Earth's axis, and its shadow falls on the hour band to show the time. The dial does not show the noon shadow lengthening in winter.
- Wanted: A pair of photos (or one photo) of a vertical post, obelisk or person casting a short noon shadow in June and a long noon shadow in December at the same UK site. Alternatively, a solargraph showing the Sun's arcs lower in winter and higher in summer.

## perambalur-handpump (high)
- Where: lab glossary thumbnail: tsunami--drawdown
- Problem: In the tsunami lab, 'drawdown' means the sea pulling back from the shore before a wave arrives. A village groundwater hand pump in India shows a different process, and its caption only talks about pumping and the water table, so students in the tsunami lab are shown the wrong feature.
- Wanted: A real photograph or satellite image of the sea withdrawing before a tsunami, with an openly licensed or public-domain source. For example, the 26 December 2004 imagery of Kalutara, Sri Lanka, showing exposed seabed and reef before the waves arrived, or a documented 2011 Tohoku photograph of a harbour floor exposed by drawdown. It should not show casualties. The caption should say that many tsunamis arrive without this warning. No tsunami drawdown image is in the catalogue: tohoku-tsunami-aftermath shows inundation damage, not drawdown.

## place-gy (high)
- Where: atlas place: gy
- Problem: Sepia archive print (c. 1910, album corners visible, hazy) of Mount Roraima's long cliff wall seen across open savanna with a thatched hut. Roraima sits on the Venezuela-Brazil-Guyana tripoint and this classic wall-and-pinnacle view is the south-west face, normally seen from the Venezuelan Gran Sabana; the 'British Guiana' label comes from the colonial archive title, not from the viewpoint. The Guyana atlas page therefore very probably shows Venezuelan territory, and the caption presents that as Guyana.
- Wanted: A modern colour photo taken inside Guyana and clearly located there, e.g. Kaieteur Falls on the Potaro River dropping over the sandstone edge of the Guiana Shield (Pakaraima plateau), or the Rupununi savanna with the Kanuku Mountains. Must come with a verifiable Guyana location in its Commons record.

## place-us-la (high)
- Where: atlas place: us-la
- Problem: Atlas page for Louisiana, but most of the land and all the conspicuous islands in the image belong to Mississippi and Alabama. Louisiana appears only as the faint Chandeleur arc and the delta marshes at lower left; the caption does not say which part is Louisiana.
- Wanted: A verified photo or natural-colour satellite image centred on Louisiana itself, e.g. the Mississippi River delta (Balize 'bird's-foot' delta) or coastal marshes of Terrebonne/Barataria, so the whole frame is Louisiana. Until then keep this image with the corrected caption.

## amsre-warm-pool-anomaly (medium)
- Where: glossary term: Warm pool
- Problem: This is a global map of how far sea temperature was above or below average. The warm pool is defined by its actual temperature (above about 28 °C), and here the warm pool shows as BLUE (cooler than average). Students will likely link blue with cold water. The caption admits this, but the image still does not show what a warm pool is. (The same caption is used on the lab glossary thumbnail enso--warm-pool.)
- Wanted: A global or Indo-Pacific map of actual sea-surface temperature, not anomaly (for example NASA Earth Observatory or NOAA OISST monthly mean), with a °C colour scale. The western Pacific warm pool (>28 °C) should be clearly visible. Public domain from NASA or NOAA.

## bald-eagle-wind-gap (medium)
- Where: ALL
- Problem: The image is tiny: 1280x242, with a short side of 242 px, far below the 500 px minimum. The ridge is small and distant, so neither the wind gap nor the water gap the caption describes can really be picked out. It is also used as the Pennsylvania atlas image.
- Wanted: A higher-resolution photograph (short side at least 500 px) of a clearly visible wind gap: a dry notch in a ridge with no through-flowing river. Ideally the Route 15 gap in Bald Eagle Mountain, or a Pennsylvania Ridge-and-Valley wind gap such as Culvers Gap or Wind Gap, Pennsylvania, so it can still serve the us-pa atlas page.

## blorenge-cwm-craf (medium)
- Where: ALL
- Problem: The caption says 'the ridge in the foreground is the glacial moraine'. The foreground is flat, wet pasture; at most there is a low grassy bank in the middle distance. The Cwm Craf hollow cannot be clearly picked out on the hillside, so the nivation feature in the glossary entry is not really visible.
- Wanted: A photograph in which a nivation hollow is clearly identifiable: a shallow hollow on a hillside, ideally holding a lingering snow patch, or Cwm Craf on Blorenge photographed face-on in low light. Interim caption if kept: 'Blorenge above Llanfoist, Wales. A shallow hollow on its slope, Cwm Craf, has been interpreted as a former nivation hollow, where persistent snow patches promoted weathering and sediment removal without forming a moving glacier.'

## alabama-karst-spring (medium)
- Where: glossary term: Spring line
- Problem: The photo shows a single spring cascading down a wooded slope. The glossary entry defines a line of springs along a geological boundary, so neither a line of springs nor a boundary is visible. (The same applies to the lab glossary thumbnail groundwater--spring-line.)
- Wanted: A photograph or annotated landscape view of a true spring line, for example springs or spring-line villages at the foot of a chalk scarp where chalk meets clay (South Downs or Chilterns, UK). Interim caption if kept: 'A single karst spring in Alabama. Where many springs emerge along the same rock boundary, they form a spring line.'

## charterhall-weather-station (medium)
- Where: ALL
- Problem: A barbed-wire security fence and dead grass take up most of the frame. The instruments (screen, rain gauge) are small and seen through chain-link, so the picture says more about the fence than about measuring weather. This is a poor fit for the Climate glossary entry.
- Wanted: A clear, unobstructed photograph of a standard weather-station enclosure showing a Stevenson screen, rain gauge and anemometer mast, ideally a UK Met Office or SEPA station, openly licensed.

## tohoku-tsunami-aftermath (medium)
- Where: ALL
- Problem: The source file is titled 'An aerial view of tsunami damage in an area north of Sendai, Japan, taken from a U.S. Navy helicopter'. It does not name Kesennuma, yet every caption and the plate-boundaries field-trip stop name Kesennuma. The image is suitable (aerial building damage, no people visible), but the exact place is not confirmed by the source.
- Wanted: Keep this photo but correct the place unless the Commons description confirms Kesennuma. If the field-trip stop must stay at Kesennuma, source a public-domain photo whose source record names Kesennuma, Miyagi, after the 11 March 2011 tsunami (for example US Navy or JGSDF aerial images), showing buildings and the harbour, with no people.

## swarm-core-field (medium)
- Where: glossary term: Inner core; lab glossary thumbnail: earth-interior--inner-core
- Problem: The image is a pair of maps of magnetic-field strength at Earth's surface. It shows nothing about the inner core; the caption has to explain the inner core with evidence (seismic waves) that is not in the image.
- Wanted: A public-domain or CC-licensed scientific figure (for example from USGS or IRIS) showing seismic wave paths through Earth, including P waves refracted at the core boundaries and the P- and S-wave shadow zones, labelled as a diagram. It shows the evidence for a liquid outer core and a solid inner core.

## greens-mill-sundial (medium)
- Where: lab cover: solar-altitude; teacher page hero: solar-altitude; glossary term: Noon altitude; glossary term: Solar altitude; glossary term: Sun path; lab glossary thumbnail: solar-altitude--noon-altitude; lab glossary thumbnail: solar-altitude--solar-altitude; lab glossary thumbnail: solar-altitude--sun-path
- Problem: Poor fit. The photo is a close-up of a time-telling equatorial sundial on an overcast day, with no shadow, Sun or sky visible. It cannot show the Sun's altitude, noon altitude or its daily path, which are the subject of the lab and these glossary terms. (The Gnomon usage is fine.)
- Wanted: A sun-path photo: a long-exposure or multi-exposure composite of the Sun's daily arc, or a solargraph from a UK site showing low winter and high summer arcs. Label it clearly as a composite. A second choice is a photo of a vertical gnomon/post with a clear noon shadow, with its date and place stated.

## goes-earth-cloud-belts (medium)
- Where: case study cover: time-zones-us
- Problem: For a time-zones case study, the composite is misleading: it shows the whole Americas in daylight at a moment when the western USA was in darkness. The caption talks about Earth's rotation driving the daily cycle, but the image hides the day–night boundary.
- Wanted: A genuine GOES-East full-disc GeoColor or visible image taken near sunrise or sunset over the USA, so that the terminator crosses the country. It should be dated and labelled, with any city-lights layer described as such.

## eso-orion-stars (medium)
- Where: glossary term: Local stars; lab glossary thumbnail: universe-scale--local-stars
- Problem: Wrong example. The glossary defines local stars as stars in the Sun's neighbourhood, with Alpha Centauri as the example. Orion's bright stars and nebulae lie hundreds to more than a thousand light years away (the Orion Nebula is about 1,300 ly), so they are not local stars. Students may take Orion as an example of nearby stars.
- Wanted: A CC-licensed wide-field photo of Alpha and Beta Centauri with Proxima Centauri marked (for example from ESO or Wikimedia Commons). It shows the nearest star system, about 4.2–4.4 light years away, next to a much more distant bright star.

## edale-lose-hill (medium)
- Where: glossary term: Knoll; lab glossary thumbnail: contours--knoll
- Problem: Poor fit for 'knoll'. The photo shows a large hill and ridge end (Lose Hill / the Great Ridge) above the Vale of Edale, not a small, isolated rounded hill. Grindslow Knoll, named in the alt text, is the viewpoint and is not visible. The Hill and Valley usages are fine.
- Wanted: A small, isolated rounded hill standing above flatter ground, ideally a Peak District reef knoll such as Thorpe Cloud (Dovedale) or Parkhouse Hill and Chrome Hill (upper Dove valley). These link the term to a real 'knoll' and contrast well with the contour model.

## evan-2012-modis (medium)
- Where: atlas place: fj
- Problem: On the Fiji atlas page, the cyclone's cloud almost completely hides the islands; only faint coastline outlines can be seen. The image does not show what Fiji looks like, and it presents the country only as a disaster.
- Wanted: A CC-licensed photo of a Fijian landscape, for example the volcanic interior and rainforest of Viti Levu, or a fringing reef and island in the Mamanuca or Yasawa groups. Keep the Cyclone Evan image for the cyclone and Coriolis uses.

## hubble-andromeda (medium)
- Where: ALL
- Problem: Image is only 1280x409 px (short side 409 < 500), a thin panoramic strip of part of the PHAT mosaic. It is used as the universe-scale lab cover and teacher-page hero, where it will be cropped or upscaled; the galaxy as a whole is not recognisable.
- Wanted: A freely licensed whole-galaxy photograph of the Andromeda Galaxy (M31), landscape, short side at least 800 px (e.g. a NASA/ESA, ESO or public-domain wide-field image showing the full disc with M32 and M110), so students can see it is a galaxy of stars 2.5 million light-years away. Keep the current caption wording about distance.

## hubble-ison-before-perihelion (medium)
- Where: glossary term: Perihelion
- Problem: Perihelion is an orbital position; the photo shows a comet's coma and tail on a date before perihelion, so nothing about perihelion is visible. The definition is about Earth's perihelion in January and seasons, so a fuzzy comet is a poor fit and may suggest perihelion is something seen in the comet.
- Wanted: A side-by-side pair of photographs of the Sun taken with the same camera and lens (safely filtered, visible light) at Earth's perihelion (early January) and aphelion (early July), showing the small difference in apparent size. Freely licensed, labelled as two separate photographs.

## hubble-ison-before-perihelion (medium)
- Where: lab glossary thumbnail: seasons--perihelion
- Problem: Same as the glossary term: a comet photo does not illustrate perihelion, and in the seasons lab the term concerns Earth's orbit.
- Wanted: Same as for 'glossary term: Perihelion': matched visible-light photos of the Sun at perihelion and aphelion.

## kyllini-stalactites (medium)
- Where: ALL
- Problem: The main subject is a large white column or flowstone-draped stalagmite rising from the floor, not stalactites hanging from a roof; only a few small stalactites are visible in the dark upper-left background. Used for the 'Stalactite' glossary term, students are likely to confuse it with a stalagmite or column. The alt text ('stalactites hang from the roof') describes something the photo does not clearly show.
- Wanted: A clear, well-lit photo of stalactites hanging from a cave ceiling, ideally in a Yorkshire Dales show cave (e.g. White Scar Cave or Stump Cross Caverns) to suit the Yorkshire Dales case study, freely licensed (CC BY/BY-SA or public domain), short side at least 800 px.

## perambalur-handpump (medium)
- Where: glossary term: Drawdown
- Problem: The glossary definition leads with the tsunami meaning (the sea pulling back before a wave) and mentions groundwater drawdown second. The photo and caption cover only groundwater pumping, so the main meaning is not illustrated.
- Wanted: Use the same tsunami drawdown image as for tsunami--drawdown. If the hand pump stays, change the caption so it explains the second meaning only.

## nasa-lunar-eclipse-2000 (medium)
- Where: glossary term: Penumbra; lab glossary thumbnails eclipses--penumbra and moon-phases--penumbra
- Problem: The photo shows a total eclipse, with the Moon deep in Earth's umbra. The penumbra is neither visible nor mentioned in the caption, so it does not illustrate the term and may suggest that the red umbral colour is the penumbra.
- Wanted: A real photograph of a penumbral lunar eclipse, or a partial eclipse whose subtle penumbral shading next to the dark umbra is clearly visible (for example a NASA or public-domain sequence from the 2020 or 2023 penumbral eclipses), with a caption pointing out the faint dimming. The catalogue has nothing suitable. As a stopgap, keep the photo but add the caption below.

## noaa-surface-analysis-2022 (medium)
- Where: ALL
- Problem: The image is 903x328 px; the short side of 328 px is far below 500 px. It packs four chart panels into that space, so the isobar labels, pressure values and front symbols are unreadable, especially as glossary thumbnails. It appears on 25 pages and is the only weather chart, yet terms such as Isobar, Warm sector and Occlusion depend on reading it.
- Wanted: A single, full-resolution surface analysis chart (short side 1000 px or more) in the public domain or under the Open Government Licence: a NOAA/NWS Weather Prediction Center analysis, or a Met Office analysis of a North Atlantic depression over the UK. It should show labelled isobars, clear H and L centres, and a mature mid-latitude depression with warm, cold and occluded fronts and a visible warm sector. A UK chart would suit the 11–18 British audience best. No suitable chart is in the catalogue.

## misfit-stream-valley (medium)
- Where: ALL
- Problem: The photo shows a narrow, steep, V-shaped wooded gully with a small rocky stream. The valley does not look obviously too big for the stream, so students cannot see the mismatch that defines a misfit stream. The geograph title calls it a misfit, but the photo itself does not show this.
- Wanted: A clear view of a small stream meandering across a wide, flat-floored valley that is plainly too large for it. Good examples are a glacial meltwater channel or a beheaded valley after river capture, such as the dry or underfit valleys of the Chilterns or Cotswolds, the Wye/Stour region, or a U-shaped trough with a tiny present-day burn in Scotland, with a geograph or Commons source. The catalogue has no clearer example: place-no is badly blurred.

## place-ba (medium)
- Where: atlas place: ba
- Problem: Image is 1280x406: the short side is below the 500 px minimum, so this wide panorama of the Trebišnjica valley looks small and soft when it is displayed. The content and place are correct.
- Wanted: Re-fetch the same Commons panorama (Gornji_Orahovac,_Bosnia_y_Herzegovina,_2014-04-14,_DD_10-13_PAN.jpg, Diego Delso, CC BY-SA 3.0) at 1920 px wide or more so the short side is at least 600 px, then update the verified file and its manifest entry. Alternatively, use a non-panoramic photo of karst relief in Herzegovina (e.g. the Trebišnjica or Neretva valley) with a short side of at least 500 px.

## place-fi (medium)
- Where: atlas place: fi
- Problem: A 1960 black-and-white press-archive photo (JOKA collection) of snowy trees beside a still river, with no stated location in Finland. It is a weak atlas image for the country because it shows no distinctive Finnish landscape such as lakes, glacial landforms or boreal forest at scale. The caption also calls it a 'field photograph', which it is not; it is an archive press photo.
- Wanted: A modern colour photo of a named Finnish landscape showing glacial lakes and boreal forest, e.g. the view from Koli National Park over Lake Pielinen, or an esker such as Punkaharju between lakes.

## place-mo (medium)
- Where: atlas place: mo
- Problem: The photo shows only a bridge deck and towers over hazy water with a strong green colour cast, taken looking down from Macau Tower. No urban land, shoreline or reclaimed land is visible, so the caption's claims about urban land and reclamation changing the shoreline describe things that cannot be seen, and the atlas page shows nothing of Macau's geography.
- Wanted: A clear daytime view of Macau showing the peninsula and Taipa/Cotai with the reclaimed land and the bridges linking them across the Pearl River estuary (for example from Macau Tower or Guia Hill), so students can see the dense city on reclaimed coastal land.

## place-no (medium)
- Where: atlas place: no
- Problem: Badly blurred, faded 1974 snapshot: the whole frame is soft, the foreground leaves are smeared by camera shake, and the colours have shifted. The valley floor, river and road are hard to make out at atlas size. (Credit string also starts with the stray text 'per source. Please credit'.) No other Norway photo in the catalogue.
- Wanted: A sharp, modern photograph of a western Norwegian fjord, e.g. Geirangerfjord, Nærøyfjord or Sognefjord from a viewpoint, showing steep glacially eroded trough walls dropping into sea water, ideally with a small settlement or farmland on a delta at the head of the fjord. It shows the defining Norwegian landform (a drowned glacial trough) directly instead of asking students to imagine the sea flooding the valley. Credit should read '<author> / Wikimedia Commons · <licence> · resized'.

## place-us-dc (medium)
- Where: atlas place: us-dc
- Problem: The foreground and most of the frame are Arlington, Virginia (Crystal City office blocks, railway and Reagan National Airport). Washington, DC, appears only in the distance across the Potomac (Washington Monument and Capitol on the skyline). The caption 'Washington, DC' implies the city fills the picture.
- Wanted: A verified photo in which DC itself fills the frame, e.g. the National Mall and Potomac waterfront or the Anacostia–Potomac confluence seen from above. Until then keep this image with the corrected caption.

## place-us-il (medium)
- Where: atlas place: us-il
- Problem: A red 'GoodFreePhotos.com' watermark is visible in the top-right corner of the sky.
- Wanted: The same Mississippi Palisades view re-exported with the top-right corner cropped to remove the watermark (a sky-only crop loses nothing), or another verified, unwatermarked view of the Mississippi River from the Illinois bluffs.

## san-andreas-highsmith (medium)
- Where: ALL
- Problem: An aerial view of dry ridges and wooded gullies with no fault trace a student could pick out (no clear linear scarp, offset stream or sag pond). Captions and alt ('the fault cutting across dry hills') ask students to see a feature they cannot identify. This weakens the case-study cover, the Strike-slip and Transform glossary terms, the plate-boundaries and folds-faults galleries, the us-ca atlas page and field-trip stop 7.
- Wanted: Aerial photo of the San Andreas Fault across the Carrizo Plain, California (e.g. the USGS/public-domain views of Wallace Creek), where the straight fault trace and right-laterally offset stream channels are plainly visible. If this photo is kept meanwhile, the caption should say the fault trace is hard to see at this angle.

## roots-in-bedrock (medium)
- Where: ALL
- Problem: The photo shows tree roots spreading through a soil and debris bank that sits on top of a bedded sandstone road cutting. Roots do not visibly grow into rock joints, which is what the caption and alt claim. The jointed sandstone below is mostly free of roots.
- Wanted: Close photo of a tree root wedged into a joint or crack in bare bedrock, ideally with the crack visibly widened (e.g. a UK limestone pavement or granite tor with a rooted tree in a grike or joint).

## purbeck-coastal-stumps (medium)
- Where: glossary term: Stump
- Problem: Only a vertical chalk cliff, a cave or arch at the headland and two small distant stacks (The Pinnacles) are visible. No stump, a low remnant often visible only at low tide, can be identified, so the photo does not illustrate the term. The same applies to the coasts--stump glossary thumbnail.
- Wanted: Photo of Old Harry Rocks, Handfast Point, Purbeck, that clearly shows the low stump of Old Harry's Wife beside the Old Harry stack, ideally at low tide.

## settlands-folds (medium)
- Where: glossary term: Anticline
- Problem: The cliff shows steeply dipping beds that bend in the upper part, but no anticline hinge (beds arching up and dipping away) can be identified. The same image and generic caption are also used for Syncline and both folds-faults thumbnails, so it cannot illustrate both opposite structures. The caption's 'Wales' location could not be checked offline and should be confirmed against the geograph record.
- Wanted: Photos with an obvious upright fold hinge: an anticline (e.g. the Saundersfoot/Amroth anticline in Pembrokeshire, or the Lulworth Crumple at Stair Hole, Dorset) and, for Syncline, a clear syncline (e.g. Broad Haven, Pembrokeshire). Keep settlands-folds for the lab cover and teacher hero, where the generic caption works.

## redhill-hongkong-landslide (medium)
- Where: ALL
- Problem: The landslide scar is a small beige patch (about 2% of the frame) at the waterline below the housing, partly behind a railing and branches. The housing and hills dominate the photo. It is a weak cover for the hong-kong-landslide case study and hard to read as a Pore pressure thumbnail.
- Wanted: A closer view of the 2023 Redhill Peninsula slope failure, Hong Kong (or another documented Hong Kong rainfall landslide such as the 2008 Lantau failures from GEO/CEDD), with the scar, the debris and the slope above clearly filling the frame.

## sawtooth-snowmelt (medium)
- Where: ALL
- Problem: An orange camera date stamp ('07.03.2008 13:04') is burnt into the lower right, and the foreground edges are soft. The stamp is distracting on the us-id atlas page and the glossary thumbnails.
- Wanted: Re-crop the same verified file to remove the date stamp (crop to the upper three-quarters, keeping the stream, meadow and snow patches), then update the manifest dimensions; otherwise source a clean photo of a snowmelt-fed stream in Idaho's Sawtooth Mountains.

## porto-covo-breaking-wave (medium)
- Where: lab glossary thumbnail: river-erosion--hydraulic-action
- Problem: A sea wave breaking offshore is used for hydraulic action in the river-erosion lab. The wave is not striking rock or forcing water into cracks, and the caption (about shoaling) does not mention hydraulic action at all. The same caption problem applies to the 'glossary term: Hydraulic action' usage.
- Wanted: Photo of fast, turbulent river water striking a bedrock bank or waterfall face (or waves crashing into a jointed cliff), where water pressure on cracks can plausibly be inferred.

## ponce-calciustoll (low)
- Where: glossary term: Colluvium
- Problem: The profile shows a dark A horizon over pale carbonate-rich subsoil. Colluvium itself (mixed slope deposits at the foot of a slope) cannot be seen, and the caption only says the parent material 'includes' it. The soil-catena--colluvium thumbnail and the soil-catena gallery have the same weak fit.
- Wanted: Photo of a colluvial deposit at the foot of a slope: poorly sorted, mixed-size angular debris in a cutting or exposure below a hillside, ideally with the slope above visible.
