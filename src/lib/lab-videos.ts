/** Topic-specific, English-language videos from educational publishers. Each lab lists its best
 * match first; a second film is added only when it covers a different part of the topic.
 * Checked in October 2026: every ID resolves on YouTube to the named publisher's channel and plays
 * in an embedded player, and every Crash Course film was matched against its transcript.
 * An absent entry is deliberate: a loosely related film should not fill an empty slot.
 * Review evidence is recorded in reports/geolens-media-review.md and reports/VIDEO-REVIEW-2026-10.md.
 */
export type LabVideo = {
  youtubeId: string;
  title: string;
  source: string;
  sourceUrl: string;
};

const cc = (youtubeId: string, title: string, slug: string): LabVideo => ({
  youtubeId,
  title,
  source: "Crash Course",
  sourceUrl: `https://thecrashcourse.com/courses/${slug}/`,
});
const tedEd = (youtubeId: string, title: string, slug: string): LabVideo => ({
  youtubeId,
  title,
  source: "TED-Ed",
  sourceUrl: `https://ed.ted.com/lessons/${slug}`,
});
const onYouTube = (youtubeId: string, title: string, source: string): LabVideo => ({
  youtubeId,
  title,
  source,
  sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
});

// Crash Course Geography
const earthMoves = cc(
  "ljjLV-5Sa98",
  "How Does the Earth Move? Crash Course Geography #5",
  "how-does-the-earth-move-crash-course-geography-5",
);
const atmosphere = cc(
  "11ZI9aqurfA",
  "What Does the Atmosphere Do? Crash Course Geography #6",
  "what-does-the-atmosphere-do-crash-course-geography-6",
);
const airTemperature = cc(
  "OrhQmxK7s5A",
  "How Does Air Temperature Shape a Place? Crash Course Geography #7",
  "how-does-air-temperature-shape-a-place-crash-course-geography-7",
);
const wind = cc(
  "ao_-OjDQwfk",
  "Where Does Wind Come From? Crash Course Geography #8",
  "where-does-wind-come-from-crash-course-geography-8",
);
const oceans = cc(
  "xa6SdvFA3w0",
  "How Do Oceans Circulate? Crash Course Geography #9",
  "how-do-oceans-circulate-crash-course-geography-9",
);
const precipitation = cc(
  "68G1ikYRNxg",
  "How Can Rain Create Conflict? Precipitation and Water Use: Crash Course Geography #11",
  "how-can-rain-create-conflict-precipitation-and-water-use-crash-course-geography-11",
);
const cyclones = cc(
  "06ke7hr1m_Q",
  "What Are the Different Types of Cyclones? Crash Course Geography #12",
  "what-are-the-different-types-of-cyclones-crash-course-geography-12",
);
const soil = cc(
  "udseIcrUxvA",
  "What is Soil (and Why is it Important)? Crash Course Geography #17",
  "what-is-soil-and-why-is-it-important-crash-course-geography-17",
);
const volcanoes = cc(
  "cnKoTlUaqAs",
  "What Are Volcanoes? Crash Course Geography #21",
  "what-are-volcanoes-crash-course-geography-21",
);
const rivers = cc(
  "CDEj62HGNkk",
  "How Rivers Shape the Landscape: Crash Course Geography #23",
  "how-rivers-shape-the-landscape-crash-course-geography-23",
);
const floods = cc(
  "HDvS2rQZXMc",
  "Why Does Jakarta Flood So Easily? Crash Course Geography #24",
  "why-does-jakarta-flood-so-easily-crash-course-geography-24",
);

// Crash Course Geology
const waterShapesLand = cc(
  "xDll-p5g2EQ",
  "How Water Shapes the Land: Crash Course Geology #9",
  "how-water-shapes-the-land-crash-course-geology-9",
);
const plateTectonics = cc(
  "krXXSCb_P9Y",
  "What is Plate Tectonics: Crash Course Geology #10",
  "what-is-plate-tectonics-crash-course-geology-10",
);

export const LAB_VIDEOS: Record<string, LabVideo[]> = {
  // Planet Earth and space
  seasons: [onYouTube("2lSnnH12tJ4", "Why we have seasons", "Khan Academy"), earthMoves],
  rotation: [
    earthMoves,
    onYouTube("Vxz6nNqpDCk", "Why Some Days Aren’t 24 Hours", "MinutePhysics"),
  ],
  "solar-altitude": [earthMoves],
  "sun-earth": [
    cc("b22HKFMIfWo", "The Sun: Crash Course Astronomy #10", "the-sun-crash-course-astronomy-10"),
    airTemperature,
  ],
  "moon-phases": [
    cc(
      "AQ5vty8f9Xc",
      "Moon Phases: Crash Course Astronomy #4",
      "moon-phases-crash-course-astronomy-4",
    ),
  ],
  eclipses: [
    cc("PRgua7xceDA", "Eclipses: Crash Course Astronomy #5", "eclipses-crash-course-astronomy-5"),
  ],
  tides: [cc("KlWpFLfLFBI", "Tides: Crash Course Astronomy #8", "tides-crash-course-astronomy-8")],
  "solar-system": [
    cc(
      "TKM0P3XlMNA",
      "Introduction to the Solar System: Crash Course Astronomy #9",
      "introduction-to-the-solar-system-crash-course-astronomy-9",
    ),
  ],
  "universe-scale": [
    cc(
      "CWMh61yutjU",
      "Distances: Crash Course Astronomy #25",
      "distances-crash-course-astronomy-25",
    ),
  ],
  "geologic-time": [
    cc(
      "mIIJd66Ycr8",
      "How old is the Earth?: Crash Course Geology #17",
      "how-old-is-the-earth-crash-course-geology-17",
    ),
    cc(
      "ZLc9udbCaeI",
      "The Mystery Behind Earth’s Missing Rocks: Crash Course Geology #16",
      "the-mystery-behind-earths-missing-rocks-crash-course-geology-16",
    ),
  ],

  // Earth's interior and plates
  "earth-interior": [
    onYouTube("hHteUIS0OFY", "Compositional and mechanical layers of the Earth", "Khan Academy"),
    cc(
      "rm46SdVfB4I",
      "What’s at the center of the earth?: Crash Course Geology #4",
      "whats-at-the-center-of-the-earth-crash-course-geology-4",
    ),
  ],
  "plate-boundaries": [
    cc(
      "7CPv0NSIG2M",
      "The Plate Tectonics Revolution: Crash Course Geography #19",
      "the-plate-tectonics-revolution-crash-course-geography-19",
    ),
    plateTectonics,
  ],
  "continental-drift": [
    onYouTube("axB6uhEx628", "Pangaea", "Khan Academy"),
    tedEd(
      "p-vNSqUy0l4",
      "The Pangaea Pop-up – Michael Molina",
      "the-pangaea-pop-up-michael-molina",
    ),
  ],
  "seafloor-spreading": [
    onYouTube("FK1s1-OJ5BE", "Geological features of divergent plate boundaries", "Khan Academy"),
  ],
  hotspots: [
    volcanoes,
    cc(
      "BMZbbewOLvU",
      "Volcanoes Explained: Crash Course Geology #13",
      "volcanoes-explained-crash-course-geology-13",
    ),
  ],
  isostasy: [
    onYouTube(
      "3rk2jx3eRDE",
      "Isostasy: vertical motion of the Earth’s crust due to changes in pressure",
      "SciencePrimer",
    ),
  ],
  "wilson-cycle": [
    tedEd(
      "SbIpWHQI-tE",
      "The continents are moving. When will they collide? – Jean-Baptiste P. Koehl",
      "the-continents-are-moving-when-will-they-collide-jean-baptiste-p-koehl",
    ),
    plateTectonics,
  ],
  "folds-faults": [
    cc(
      "r8uQVRVNV14",
      "How Do Mountains Form?: Crash Course Geology #11",
      "how-do-mountains-form-crash-course-geology-11",
    ),
  ],
  volcanoes: [volcanoes],
  earthquakes: [
    cc(
      "WNvAic8KLb0",
      "Earthquakes Explained: Crash Course Geology #14",
      "earthquakes-explained-crash-course-geology-14",
    ),
    tedEd(
      "jhRuUoTnA6g",
      "Why are earthquakes so hard to predict? – Jean-Baptiste P. Koehl",
      "why-are-earthquakes-so-hard-to-predict-jean-baptiste-p-koehl",
    ),
  ],
  tsunami: [
    tedEd("Wx9vPv-T51I", "How tsunamis work – Alex Gendler", "how-tsunamis-work-alex-gendler"),
  ],

  // Atmosphere and weather
  "atmosphere-layers": [atmosphere],
  "energy-budget": [atmosphere],
  "thermal-circulation": [wind],
  wind: [wind],
  "three-cell": [wind],
  fronts: [cyclones],
  "cyclone-anticyclone": [cyclones],
  "tropical-cyclone": [cyclones],
  "storm-surge": [
    onYouTube("bBa9bVYKLP0", "Storm Surge Fast Draw", "NOAA National Hurricane Center"),
    tedEd(
      "25LW_PG2ZuI",
      "Why isn’t the Netherlands underwater? – Stefan Al",
      "why-isn-t-the-netherlands-underwater-stefan-al",
    ),
  ],
  "rain-shadow": [precipitation],
  "climate-types": [
    cc(
      "xiGhLGFkJjo",
      "How do we Classify Climates? Crash Course Geography #13",
      "how-do-we-classify-climates-crash-course-geography-13",
    ),
  ],

  // Water, oceans and carbon
  "water-cycle": [waterShapesLand],
  groundwater: [waterShapesLand],
  "drainage-basin": [rivers],
  hydrograph: [floods],
  "river-hydrology": [rivers],
  "ocean-currents": [
    oceans,
    tedEd(
      "p4pWafuvdrY",
      "How do ocean currents work? – Jennifer Verduin",
      "how-do-ocean-currents-work-jennifer-verduin",
    ),
  ],
  thermohaline: [oceans],
  enso: [onYouTube("57S0Rw9L_hw", "What is El Niño?", "NOAA SciJinks")],
  "carbon-cycle": [
    tedEd(
      "A4cPmHGegKI",
      "The carbon cycle – Nathaniel Manning",
      "the-carbon-cycle-nathaniel-manning",
    ),
  ],

  // Landforms
  "landform-types": [
    cc(
      "1gMU7zfDqfg",
      "How Does the Earth Create Different Landforms? Crash Course Geography #20",
      "how-does-the-earth-create-different-landforms-crash-course-geography-20",
    ),
  ],
  rivers: [rivers],
  "river-erosion": [waterShapesLand, rivers],
  "river-deposition": [rivers, onYouTube("8a3r-cG8Wic", "Why Do Rivers Curve?", "MinuteEarth")],
  glaciers: [
    cc(
      "mkt-0ZuTKXU",
      "What Are Glaciers? Crash Course Geography #26",
      "what-are-glaciers-crash-course-geography-26",
    ),
    cc(
      "OgYSITk0fSM",
      "The Future of Glaciers: Crash Course Geology #19",
      "the-future-of-glaciers-crash-course-geology-19",
    ),
  ],
  periglacial: [
    tedEd(
      "7VV4s4uiwLY",
      "What happens when the Arctic permafrost melts? – Brendan Rogers and Jessica Howard",
      "what-s-hidden-in-arctic-ice-brendan-rogers-and-jessica-howard",
    ),
  ],
  karst: [
    tedEd(
      "vyUJNsibkfQ",
      "How do sinkholes swallow entire houses and cities? – Elise Cutts",
      "how-do-sinkholes-form-elise-cutts",
    ),
    onYouTube("lec7kHTOBAs", "Ask a Geologist: What is Karst?", "Illinois State Geological Survey"),
  ],
  "mass-movement": [onYouTube("MVwSpGVfWVo", "Landslide Hazards", "US Geological Survey")],

  // Rocks and soils
  "rock-cycle": [
    cc(
      "7Bxw4kkeHJ8",
      "What Are Rocks and How Do They Form? Crash Course Geography #18",
      "what-are-rocks-and-how-do-they-form-crash-course-geography-18",
    ),
  ],
  weathering: [
    cc(
      "pmF41T52nJs",
      "What is Weathering? Crash Course Geography #22",
      "what-is-weathering-crash-course-geography-22",
    ),
  ],
  "soil-profile": [soil],
  "soil-texture": [soil],
  "soil-erosion": [
    onYouTube("UncSFxc1Luw", "Soil Erosion and the Dust Bowl", "Pierce Conservation District"),
  ],

  // Map skills
  "map-projections": [
    cc(
      "iHEMOdRo5u8",
      "What is a Map? Crash Course Geography #2",
      "what-is-a-map-crash-course-geography-2",
    ),
  ],
  contours: [
    onYouTube("bENEygui4jo", "Contour Mapping Skills", "Mike Sammartano, Earth science teacher"),
  ],
  graticule: [
    onYouTube(
      "KPmSrm3Kjk4",
      "Latitude and Longitude On Topographic Maps",
      "Oregon State University Ecampus",
    ),
  ],
};

export function labVideos(slug: string): LabVideo[] {
  return LAB_VIDEOS[slug] ?? [];
}
