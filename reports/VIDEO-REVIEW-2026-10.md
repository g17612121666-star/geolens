# Video review, October 2026

Every film embedded in Geolens was checked for language, suitability and fit with its lab. The site now embeds 56 videos (20 existing, 36 new) across 57 of the 62 labs; 16 labs show a second film that covers another part of the topic.

## How each video was checked

- **Publisher and title:** YouTube's oEmbed endpoint confirmed that each ID belongs to the named channel and has the listed title. Every channel is an English-language educational publisher: Crash Course, TED-Ed, Khan Academy, MinuteEarth, MinutePhysics, NOAA (National Hurricane Center, SciJinks), the US Geological Survey, the Illinois State Geological Survey, Oregon State University, Pierce Conservation District, SciencePrimer and a US high-school Earth science teacher.
- **Plays when embedded:** each ID was loaded in a `youtube-nocookie.com` iframe on a host page in headless Chromium. All 56 load without a player error (a deliberately invalid ID showed "This video is unavailable", so the test can fail).
- **Content:** for all 33 Crash Course films in use, the full English transcript (Nerdfighteria Wiki) was searched for the lab's key ideas before the film was assigned, e.g. "sea breeze" for thermal circulation, "rain shadow" for rain shadow, "drainage basin" for drainage basins, "hydrograph" for storm hydrographs. YouTube blocks transcript requests from the review machine, so the other films were matched on the publisher's lesson page and title; they come from publishers whose material is written for students.
- **Suitability:** no film is age-restricted, and none was chosen from news, commentary or unknown channels. Candidates from unknown channels were rejected even when the topic matched.

## Points checked in detail

- *How Does the Earth Move?* (Crash Course Geography #5): the publisher's blurb says "our elliptical orbit gives us seasons", which is the misconception the seasons lab corrects. The transcript shows the film itself explains seasons by axial tilt and says the varying distance from the Sun "isn't really linked" to our weather, so it is safe to use.
- *Earth's Crust and Mantle Explained* (Crash Course Geology #3) was considered for isostasy but never mentions it, so it was not used.
- *What is Climate Change?* (Crash Course Geography #14) was considered for the carbon cycle but does not describe the cycle, so it was not used.

## Labs still without a film

River capture, coasts, wind (aeolian) landforms, grid references and soil catena. No film from a trustworthy publisher matched these topics closely enough; per the rule in `src/lib/lab-videos.ts`, a loosely related film should not fill the slot.

## All videos

| Labs | Video | Publisher | ID | Content check | New |
| --- | --- | --- | --- | --- | --- |
| universe-scale | [Distances: Crash Course Astronomy #25](https://thecrashcourse.com/courses/distances-crash-course-astronomy-25/) | Crash Course | `CWMh61yutjU` | transcript | yes |
| earthquakes | [Earthquakes Explained: Crash Course Geology #14](https://thecrashcourse.com/courses/earthquakes-explained-crash-course-geology-14/) | Crash Course | `WNvAic8KLb0` | transcript | yes |
| eclipses | [Eclipses: Crash Course Astronomy #5](https://thecrashcourse.com/courses/eclipses-crash-course-astronomy-5/) | Crash Course | `PRgua7xceDA` | transcript | yes |
| rain-shadow | [How Can Rain Create Conflict? Precipitation and Water Use: Crash Course Geography #11](https://thecrashcourse.com/courses/how-can-rain-create-conflict-precipitation-and-water-use-crash-course-geography-11/) | Crash Course | `68G1ikYRNxg` | transcript | yes |
| folds-faults | [How Do Mountains Form?: Crash Course Geology #11](https://thecrashcourse.com/courses/how-do-mountains-form-crash-course-geology-11/) | Crash Course | `r8uQVRVNV14` | transcript |  |
| ocean-currents, thermohaline | [How Do Oceans Circulate? Crash Course Geography #9](https://thecrashcourse.com/courses/how-do-oceans-circulate-crash-course-geography-9/) | Crash Course | `xa6SdvFA3w0` | transcript |  |
| climate-types | [How do we Classify Climates? Crash Course Geography #13](https://thecrashcourse.com/courses/how-do-we-classify-climates-crash-course-geography-13/) | Crash Course | `xiGhLGFkJjo` | transcript |  |
| sun-earth | [How Does Air Temperature Shape a Place? Crash Course Geography #7](https://thecrashcourse.com/courses/how-does-air-temperature-shape-a-place-crash-course-geography-7/) | Crash Course | `OrhQmxK7s5A` | transcript | yes |
| landform-types | [How Does the Earth Create Different Landforms? Crash Course Geography #20](https://thecrashcourse.com/courses/how-does-the-earth-create-different-landforms-crash-course-geography-20/) | Crash Course | `1gMU7zfDqfg` | transcript |  |
| seasons, rotation, solar-altitude | [How Does the Earth Move? Crash Course Geography #5](https://thecrashcourse.com/courses/how-does-the-earth-move-crash-course-geography-5/) | Crash Course | `ljjLV-5Sa98` | transcript | yes |
| geologic-time | [How old is the Earth?: Crash Course Geology #17](https://thecrashcourse.com/courses/how-old-is-the-earth-crash-course-geology-17/) | Crash Course | `mIIJd66Ycr8` | transcript | yes |
| drainage-basin, river-hydrology, rivers, river-erosion, river-deposition | [How Rivers Shape the Landscape: Crash Course Geography #23](https://thecrashcourse.com/courses/how-rivers-shape-the-landscape-crash-course-geography-23/) | Crash Course | `CDEj62HGNkk` | transcript |  |
| water-cycle, groundwater, river-erosion | [How Water Shapes the Land: Crash Course Geology #9](https://thecrashcourse.com/courses/how-water-shapes-the-land-crash-course-geology-9/) | Crash Course | `xDll-p5g2EQ` | transcript | yes |
| solar-system | [Introduction to the Solar System: Crash Course Astronomy #9](https://thecrashcourse.com/courses/introduction-to-the-solar-system-crash-course-astronomy-9/) | Crash Course | `TKM0P3XlMNA` | transcript | yes |
| moon-phases | [Moon Phases: Crash Course Astronomy #4](https://thecrashcourse.com/courses/moon-phases-crash-course-astronomy-4/) | Crash Course | `AQ5vty8f9Xc` | transcript | yes |
| glaciers | [The Future of Glaciers: Crash Course Geology #19](https://thecrashcourse.com/courses/the-future-of-glaciers-crash-course-geology-19/) | Crash Course | `OgYSITk0fSM` | transcript | yes |
| geologic-time | [The Mystery Behind Earth’s Missing Rocks: Crash Course Geology #16](https://thecrashcourse.com/courses/the-mystery-behind-earths-missing-rocks-crash-course-geology-16/) | Crash Course | `ZLc9udbCaeI` | transcript | yes |
| plate-boundaries | [The Plate Tectonics Revolution: Crash Course Geography #19](https://thecrashcourse.com/courses/the-plate-tectonics-revolution-crash-course-geography-19/) | Crash Course | `7CPv0NSIG2M` | transcript |  |
| sun-earth | [The Sun: Crash Course Astronomy #10](https://thecrashcourse.com/courses/the-sun-crash-course-astronomy-10/) | Crash Course | `b22HKFMIfWo` | transcript | yes |
| tides | [Tides: Crash Course Astronomy #8](https://thecrashcourse.com/courses/tides-crash-course-astronomy-8/) | Crash Course | `KlWpFLfLFBI` | transcript | yes |
| hotspots | [Volcanoes Explained: Crash Course Geology #13](https://thecrashcourse.com/courses/volcanoes-explained-crash-course-geology-13/) | Crash Course | `BMZbbewOLvU` | transcript | yes |
| glaciers | [What Are Glaciers? Crash Course Geography #26](https://thecrashcourse.com/courses/what-are-glaciers-crash-course-geography-26/) | Crash Course | `mkt-0ZuTKXU` | transcript |  |
| rock-cycle | [What Are Rocks and How Do They Form? Crash Course Geography #18](https://thecrashcourse.com/courses/what-are-rocks-and-how-do-they-form-crash-course-geography-18/) | Crash Course | `7Bxw4kkeHJ8` | transcript |  |
| fronts, cyclone-anticyclone, tropical-cyclone | [What Are the Different Types of Cyclones? Crash Course Geography #12](https://thecrashcourse.com/courses/what-are-the-different-types-of-cyclones-crash-course-geography-12/) | Crash Course | `06ke7hr1m_Q` | transcript |  |
| hotspots, volcanoes | [What Are Volcanoes? Crash Course Geography #21](https://thecrashcourse.com/courses/what-are-volcanoes-crash-course-geography-21/) | Crash Course | `cnKoTlUaqAs` | transcript |  |
| atmosphere-layers, energy-budget | [What Does the Atmosphere Do? Crash Course Geography #6](https://thecrashcourse.com/courses/what-does-the-atmosphere-do-crash-course-geography-6/) | Crash Course | `11ZI9aqurfA` | transcript |  |
| map-projections | [What is a Map? Crash Course Geography #2](https://thecrashcourse.com/courses/what-is-a-map-crash-course-geography-2/) | Crash Course | `iHEMOdRo5u8` | transcript |  |
| plate-boundaries, wilson-cycle | [What is Plate Tectonics: Crash Course Geology #10](https://thecrashcourse.com/courses/what-is-plate-tectonics-crash-course-geology-10/) | Crash Course | `krXXSCb_P9Y` | transcript | yes |
| soil-profile, soil-texture | [What is Soil (and Why is it Important)? Crash Course Geography #17](https://thecrashcourse.com/courses/what-is-soil-and-why-is-it-important-crash-course-geography-17/) | Crash Course | `udseIcrUxvA` | transcript |  |
| weathering | [What is Weathering? Crash Course Geography #22](https://thecrashcourse.com/courses/what-is-weathering-crash-course-geography-22/) | Crash Course | `pmF41T52nJs` | transcript |  |
| earth-interior | [What’s at the center of the earth?: Crash Course Geology #4](https://thecrashcourse.com/courses/whats-at-the-center-of-the-earth-crash-course-geology-4/) | Crash Course | `rm46SdVfB4I` | transcript | yes |
| thermal-circulation, wind, three-cell | [Where Does Wind Come From? Crash Course Geography #8](https://thecrashcourse.com/courses/where-does-wind-come-from-crash-course-geography-8/) | Crash Course | `ao_-OjDQwfk` | transcript |  |
| hydrograph | [Why Does Jakarta Flood So Easily? Crash Course Geography #24](https://thecrashcourse.com/courses/why-does-jakarta-flood-so-easily-crash-course-geography-24/) | Crash Course | `HDvS2rQZXMc` | transcript | yes |
| karst | [Ask a Geologist: What is Karst?](https://www.youtube.com/watch?v=lec7kHTOBAs) | Illinois State Geological Survey | `lec7kHTOBAs` | publisher page and title | yes |
| earth-interior | [Compositional and mechanical layers of the Earth](https://www.youtube.com/watch?v=hHteUIS0OFY) | Khan Academy | `hHteUIS0OFY` | publisher page and title |  |
| seafloor-spreading | [Geological features of divergent plate boundaries](https://www.youtube.com/watch?v=FK1s1-OJ5BE) | Khan Academy | `FK1s1-OJ5BE` | publisher page and title |  |
| continental-drift | [Pangaea](https://www.youtube.com/watch?v=axB6uhEx628) | Khan Academy | `axB6uhEx628` | publisher page and title |  |
| seasons | [Why we have seasons](https://www.youtube.com/watch?v=2lSnnH12tJ4) | Khan Academy | `2lSnnH12tJ4` | publisher page and title |  |
| contours | [Contour Mapping Skills](https://www.youtube.com/watch?v=bENEygui4jo) | Mike Sammartano, Earth science teacher | `bENEygui4jo` | publisher page and title | yes |
| river-deposition | [Why Do Rivers Curve?](https://www.youtube.com/watch?v=8a3r-cG8Wic) | MinuteEarth | `8a3r-cG8Wic` | publisher page and title | yes |
| rotation | [Why Some Days Aren’t 24 Hours](https://www.youtube.com/watch?v=Vxz6nNqpDCk) | MinutePhysics | `Vxz6nNqpDCk` | publisher page and title | yes |
| storm-surge | [Storm Surge Fast Draw](https://www.youtube.com/watch?v=bBa9bVYKLP0) | NOAA National Hurricane Center | `bBa9bVYKLP0` | publisher page and title | yes |
| enso | [What is El Niño?](https://www.youtube.com/watch?v=57S0Rw9L_hw) | NOAA SciJinks | `57S0Rw9L_hw` | publisher page and title | yes |
| graticule | [Latitude and Longitude On Topographic Maps](https://www.youtube.com/watch?v=KPmSrm3Kjk4) | Oregon State University Ecampus | `KPmSrm3Kjk4` | publisher page and title | yes |
| soil-erosion | [Soil Erosion and the Dust Bowl](https://www.youtube.com/watch?v=UncSFxc1Luw) | Pierce Conservation District | `UncSFxc1Luw` | publisher page and title | yes |
| isostasy | [Isostasy: vertical motion of the Earth’s crust due to changes in pressure](https://www.youtube.com/watch?v=3rk2jx3eRDE) | SciencePrimer | `3rk2jx3eRDE` | publisher page and title | yes |
| ocean-currents | [How do ocean currents work? – Jennifer Verduin](https://ed.ted.com/lessons/how-do-ocean-currents-work-jennifer-verduin) | TED-Ed | `p4pWafuvdrY` | publisher page and title | yes |
| karst | [How do sinkholes swallow entire houses and cities? – Elise Cutts](https://ed.ted.com/lessons/how-do-sinkholes-form-elise-cutts) | TED-Ed | `vyUJNsibkfQ` | publisher page and title | yes |
| tsunami | [How tsunamis work – Alex Gendler](https://ed.ted.com/lessons/how-tsunamis-work-alex-gendler) | TED-Ed | `Wx9vPv-T51I` | publisher page and title |  |
| carbon-cycle | [The carbon cycle – Nathaniel Manning](https://ed.ted.com/lessons/the-carbon-cycle-nathaniel-manning) | TED-Ed | `A4cPmHGegKI` | publisher page and title | yes |
| wilson-cycle | [The continents are moving. When will they collide? – Jean-Baptiste P. Koehl](https://ed.ted.com/lessons/the-continents-are-moving-when-will-they-collide-jean-baptiste-p-koehl) | TED-Ed | `SbIpWHQI-tE` | publisher page and title | yes |
| continental-drift | [The Pangaea Pop-up – Michael Molina](https://ed.ted.com/lessons/the-pangaea-pop-up-michael-molina) | TED-Ed | `p-vNSqUy0l4` | publisher page and title | yes |
| periglacial | [What happens when the Arctic permafrost melts? – Brendan Rogers and Jessica Howard](https://ed.ted.com/lessons/what-s-hidden-in-arctic-ice-brendan-rogers-and-jessica-howard) | TED-Ed | `7VV4s4uiwLY` | publisher page and title | yes |
| earthquakes | [Why are earthquakes so hard to predict? – Jean-Baptiste P. Koehl](https://ed.ted.com/lessons/why-are-earthquakes-so-hard-to-predict-jean-baptiste-p-koehl) | TED-Ed | `jhRuUoTnA6g` | publisher page and title | yes |
| storm-surge | [Why isn’t the Netherlands underwater? – Stefan Al](https://ed.ted.com/lessons/why-isn-t-the-netherlands-underwater-stefan-al) | TED-Ed | `25LW_PG2ZuI` | publisher page and title | yes |
| mass-movement | [Landslide Hazards](https://www.youtube.com/watch?v=MVwSpGVfWVo) | US Geological Survey | `MVwSpGVfWVo` | publisher page and title | yes |
