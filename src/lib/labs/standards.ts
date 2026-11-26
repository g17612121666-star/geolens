/**
 * Curriculum standards that labs are aligned to. A lab lists standard IDs (`${framework} ${code}`)
 * in content.json; this registry gives each one its framework and a short title. US frameworks
 * come first, matching who Geolens is mainly written for. Titles are short paraphrases, not the
 * official wording; teachers should check the framework itself for the full text.
 */

export type FrameworkId =
  | "NGSS"
  | "APES"
  | "APHG"
  | "C3"
  | "TEKS"
  | "KS3"
  | "AQA GCSE"
  | "Edexcel GCSE A"
  | "Edexcel GCSE B"
  | "OCR GCSE A"
  | "OCR GCSE B"
  | "AQA A-level";

export type Framework = {
  id: FrameworkId;
  name: string;
  /** For menus and narrow places. */
  short: string;
  country: "US" | "UK";
  url: string;
};

/** In display order: US frameworks first, then England's curriculum and exam specifications. */
export const FRAMEWORKS: Framework[] = [
  {
    id: "NGSS",
    name: "Next Generation Science Standards (Earth and space science)",
    short: "NGSS",
    country: "US",
    url: "https://www.nextgenscience.org/",
  },
  {
    id: "APES",
    name: "AP Environmental Science",
    short: "AP Environmental Science",
    country: "US",
    url: "https://apcentral.collegeboard.org/courses/ap-environmental-science",
  },
  {
    id: "APHG",
    name: "AP Human Geography",
    short: "AP Human Geography",
    country: "US",
    url: "https://apcentral.collegeboard.org/courses/ap-human-geography",
  },
  {
    id: "C3",
    name: "C3 Framework for Social Studies (geography)",
    short: "C3 Framework (geography)",
    country: "US",
    url: "https://www.socialstudies.org/standards/c3",
  },
  {
    id: "TEKS",
    name: "Texas Essential Knowledge and Skills (science grades 6 to 8, Earth Systems Science, World Geography Studies)",
    short: "Texas TEKS",
    country: "US",
    url: "https://tea.texas.gov/academics/curriculum-standards",
  },
  {
    id: "KS3",
    name: "England national curriculum, key stage 3",
    short: "KS3 (England)",
    country: "UK",
    url: "https://www.gov.uk/government/collections/national-curriculum",
  },
  {
    id: "AQA GCSE",
    name: "AQA GCSE Geography (8035)",
    short: "AQA GCSE",
    country: "UK",
    url: "https://www.aqa.org.uk/subjects/geography/gcse/geography-8035",
  },
  {
    id: "Edexcel GCSE A",
    name: "Pearson Edexcel GCSE Geography A (1GA0)",
    short: "Edexcel GCSE A",
    country: "UK",
    url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/geography-a-2016.html",
  },
  {
    id: "Edexcel GCSE B",
    name: "Pearson Edexcel GCSE Geography B (1GB0)",
    short: "Edexcel GCSE B",
    country: "UK",
    url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/geography-b-2016.html",
  },
  {
    id: "OCR GCSE A",
    name: "OCR GCSE Geography A (J383)",
    short: "OCR GCSE A",
    country: "UK",
    url: "https://www.ocr.org.uk/qualifications/gcse/geography-a-geographical-themes-j383-from-2016/",
  },
  {
    id: "OCR GCSE B",
    name: "OCR GCSE Geography B (J384)",
    short: "OCR GCSE B",
    country: "UK",
    url: "https://www.ocr.org.uk/qualifications/gcse/geography-b-geography-for-enquiring-minds-j384-from-2016/",
  },
  {
    id: "AQA A-level",
    name: "AQA A-level Geography (7037)",
    short: "AQA A-level",
    country: "UK",
    url: "https://www.aqa.org.uk/subjects/geography/as-and-a-level/geography-7037",
  },
];

export type Standard = { id: string; framework: FrameworkId; code: string; title: string };

const S = (framework: FrameworkId, code: string, title: string): Standard => ({
  id: `${framework} ${code}`,
  framework,
  code,
  title,
});

/** Every NGSS Earth and space science expectation is listed, so gaps in coverage show. */
export const STANDARDS: Standard[] = [
  S("NGSS", "MS-ESS1-1", "Earth–Sun–Moon model: lunar phases, eclipses and seasons"),
  S("NGSS", "MS-ESS1-2", "Gravity and the motions within the solar system and galaxies"),
  S("NGSS", "MS-ESS1-3", "Scale properties of objects in the solar system"),
  S("NGSS", "MS-ESS1-4", "Rock strata and the geologic time scale"),
  S("NGSS", "MS-ESS2-1", "Cycling of Earth's materials and the energy that drives it"),
  S("NGSS", "MS-ESS2-2", "Geoscience processes change Earth's surface at many scales"),
  S("NGSS", "MS-ESS2-3", "Fossils, rocks, coastlines and seafloor as evidence of plate motion"),
  S("NGSS", "MS-ESS2-4", "Water cycling driven by sunlight and gravity"),
  S("NGSS", "MS-ESS2-5", "Air masses and changes in weather"),
  S("NGSS", "MS-ESS2-6", "Unequal heating and rotation: circulation and regional climates"),
  S("NGSS", "MS-ESS3-1", "Uneven distribution of mineral, energy and groundwater resources"),
  S("NGSS", "MS-ESS3-2", "Natural hazard data, forecasts and mitigation"),
  S("NGSS", "MS-ESS3-3", "Monitoring and reducing a human impact on the environment"),
  S("NGSS", "MS-ESS3-4", "Population, consumption and Earth's systems"),
  S("NGSS", "MS-ESS3-5", "Causes of the rise in global temperatures"),
  S("NGSS", "HS-ESS1-1", "The Sun's life span and the energy that reaches Earth"),
  S("NGSS", "HS-ESS1-2", "Astronomical evidence for the Big Bang"),
  S("NGSS", "HS-ESS1-3", "How stars produce elements"),
  S("NGSS", "HS-ESS1-4", "Predicting the motion of orbiting objects"),
  S("NGSS", "HS-ESS1-5", "Plate tectonics and the ages of crustal rocks"),
  S("NGSS", "HS-ESS1-6", "Earth's formation and early history"),
  S("NGSS", "HS-ESS2-1", "Internal and surface processes build continents and ocean floors"),
  S("NGSS", "HS-ESS2-2", "Feedbacks between Earth's systems"),
  S("NGSS", "HS-ESS2-3", "Earth's interior and the cycling of matter by convection"),
  S("NGSS", "HS-ESS2-4", "Changes in energy flow and changes in climate"),
  S("NGSS", "HS-ESS2-5", "Water's properties and its effects on rock and landscapes"),
  S("NGSS", "HS-ESS2-6", "Carbon cycling among Earth's spheres"),
  S("NGSS", "HS-ESS2-7", "Coevolution of Earth's systems and life"),
  S("NGSS", "HS-ESS3-1", "Resources, natural hazards and climate shape human activity"),
  S("NGSS", "HS-ESS3-2", "Design solutions for energy and mineral resources"),
  S("NGSS", "HS-ESS3-3", "Resource management, sustainability and biodiversity"),
  S("NGSS", "HS-ESS3-4", "Reducing human impacts on natural systems"),
  S("NGSS", "HS-ESS3-5", "Climate data, models and forecasts"),
  S("NGSS", "HS-ESS3-6", "Earth systems changed by human activity"),
  S("APES", "1.4", "The carbon cycle"),
  S("APES", "1.7", "The hydrologic (water) cycle"),
  S("APES", "4.1", "Plate tectonics"),
  S("APES", "4.2", "Soil formation and erosion"),
  S("APES", "4.3", "Soil composition and properties"),
  S("APES", "4.4", "Earth's atmosphere"),
  S("APES", "4.5", "Global wind patterns"),
  S("APES", "4.6", "Watersheds"),
  S("APES", "4.7", "Solar radiation and Earth's seasons"),
  S("APES", "4.8", "Earth's geography and climate"),
  S("APES", "4.9", "El Niño and La Niña"),
  S("APES", "5.13", "Methods to reduce urban runoff"),
  S("APES", "9.3", "The greenhouse effect"),
  S("APES", "9.4", "Increases in greenhouse gases"),
  S("APHG", "1.1", "Introduction to maps: map types, elevation and map projections"),
  S("APHG", "1.4", "Spatial concepts, including absolute and relative location"),
  S("C3", "D2.Geo.1.6-8", "Construct maps that show spatial patterns"),
  S("C3", "D2.Geo.3.6-8", "Use mapping techniques to analyze spatial patterns"),
  // Texas: science grades 6 to 8 (19 TAC §112.26 to §112.28, adopted 2021), Earth and space
  // strand; Earth Systems Science (§112.49, adopted 2021), every science concept so gaps show;
  // World Geography Studies (§113.43, adopted 2022), physical geography and maps.
  S("TEKS", "6.9A", "How Earth's tilt and orbit cause the seasons"),
  S("TEKS", "6.9B", "Sun, Earth and Moon positions and daily, spring and neap tides"),
  S("TEKS", "6.10A", "Biosphere, hydrosphere, atmosphere and geosphere"),
  S("TEKS", "6.10B", "Earth's layers: crust, mantle, outer core and inner core"),
  S("TEKS", "6.10C", "How rocks form and change in the rock cycle"),
  S("TEKS", "6.11A", "Why managing resources matters"),
  S("TEKS", "6.11B", "Conserving air, water, soil and energy resources"),
  S("TEKS", "7.9A", "The Sun, planets, moons and small bodies of the solar system"),
  S("TEKS", "7.9B", "Gravity governs motion in the solar system"),
  S("TEKS", "7.9C", "Characteristics of Earth that allow life"),
  S("TEKS", "7.10A", "Evidence that Earth has changed: fossils, plates and superposition"),
  S(
    "TEKS",
    "7.10B",
    "Plate tectonics: ocean basins, earthquakes, mountains, volcanoes and hot spots",
  ),
  S("TEKS", "7.11A", "Human influences on groundwater and surface water in a watershed"),
  S("TEKS", "7.11B", "Human dependence on, and impacts on, ocean systems"),
  S("TEKS", "8.9A", "The life cycle of stars and the Hertzsprung–Russell diagram"),
  S("TEKS", "8.9B", "Types of galaxy and the solar system's place in the Milky Way"),
  S("TEKS", "8.9C", "Evidence for theories of the origin of the universe"),
  S("TEKS", "8.10A", "How the Sun, oceans and atmosphere interact in weather and climate"),
  S("TEKS", "8.10B", "Global patterns of atmospheric movement and local weather"),
  S("TEKS", "8.10C", "Ocean currents, air masses and tropical cyclones"),
  S("TEKS", "8.11A", "Natural causes of climate change, including greenhouse gases"),
  S("TEKS", "8.11B", "Human influences on climate: greenhouse gases, deforestation and cities"),
  S("TEKS", "8.11C", "The carbon cycle"),
  S("TEKS", "ESS.5A", "Accretion of planetesimals from the solar nebula"),
  S("TEKS", "ESS.5B", "Comets, asteroids, meteoroids and planets, and their effects on Earth"),
  S("TEKS", "ESS.5C", "Hypotheses for the origin of the Moon"),
  S("TEKS", "ESS.6A", "How the young Earth separated into layers"),
  S("TEKS", "ESS.6B", "Volcanic outgassing, comets and the first atmosphere and oceans"),
  S("TEKS", "ESS.6C", "Earth's atmosphere before oxygen"),
  S("TEKS", "ESS.6D", "Hypotheses for the origin of life"),
  S("TEKS", "ESS.6E", "Photosynthesis, oxygen and Earth's systems"),
  S("TEKS", "ESS.7A", "Radiometric dating and its limits"),
  S("TEKS", "ESS.7B", "Relative dating and the order of rock layers"),
  S("TEKS", "ESS.7C", "A model of the geologic time scale"),
  S("TEKS", "ESS.7D", "How complete the fossil record is"),
  S("TEKS", "ESS.7E", "Biozones, faunal succession and past environments"),
  S(
    "TEKS",
    "ESS.7F",
    "Rock and fossil evidence of extinctions, climate change and tectonic events",
  ),
  S("TEKS", "ESS.8A", "Convection, conduction, plate tectonics and volcanism"),
  S("TEKS", "ESS.8B", "Evidence for Earth's layers from magnetism, meteorites and seismic waves"),
  S("TEKS", "ESS.8C", "How new data and technology led to the theory of plate tectonics"),
  S("TEKS", "ESS.8D", "Density in Earth's interior and the motion of plates"),
  S(
    "TEKS",
    "ESS.8E",
    "Plate tectonics explains ridges, rifts, subduction, earthquakes, volcanoes and hot spots",
  ),
  S("TEKS", "ESS.8F", "Calculating plate motion from rate, time and distance"),
  S("TEKS", "ESS.8G", "Plate boundary types from the pattern of earthquakes and volcanoes"),
  S("TEKS", "ESS.8H", "Plate tectonics and long-term global change"),
  S("TEKS", "ESS.9A", "Interpreting surface features from imagery and maps"),
  S("TEKS", "ESS.9B", "Weathering by surface water and groundwater, and water as a resource"),
  S("TEKS", "ESS.9C", "Mass wasting, erosion and deposition reshape Earth's surface"),
  S("TEKS", "ESS.9D", "How weather and people affect freshwater resources"),
  S("TEKS", "ESS.10A", "How the ocean's composition and structure drive thermohaline circulation"),
  S(
    "TEKS",
    "ESS.10B",
    "How changes in the deep ocean and polar ice affect thermohaline circulation",
  ),
  S("TEKS", "ESS.10C", "What drives surface ocean circulation"),
  S("TEKS", "ESS.11A", "Milankovitch cycles, albedo and absorption as climate mechanisms"),
  S("TEKS", "ESS.11B", "The layered atmosphere, the jet stream and the Hadley and Ferrel cells"),
  S("TEKS", "ESS.11C", "How greenhouse gases trap thermal energy"),
  S("TEKS", "ESS.11D", "Feedback loops and global climate"),
  S("TEKS", "ESS.11E", "Evidence for climate change over Earth's history"),
  S("TEKS", "ESS.11F", "Thermal energy moving between Earth's spheres, and weather"),
  S("TEKS", "ESS.11G", "El Niño–Southern Oscillation and global weather and climate"),
  S("TEKS", "ESS.12A", "How earthquakes, tsunamis and eruptions affect people"),
  S("TEKS", "ESS.12B", "How floods, hurricanes, tornadoes and thunderstorms affect people"),
  S("TEKS", "ESS.12C", "Natural and human factors in extreme weather"),
  S("TEKS", "ESS.12D", "Consequences of changing ocean temperatures"),
  S("TEKS", "ESS.12E", "How using Texas's resources changes the cycling of matter and energy"),
  S("TEKS", "ESS.12F", "Carbon cycling among Earth's systems over Earth's history"),
  S("TEKS", "WG.3A", "Weather, climate and Earth–Sun relationships"),
  S("TEKS", "WG.3B", "Physical processes: weather, tectonic forces, erosion and soil building"),
  S("TEKS", "WG.3C", "How hurricanes, El Niño, earthquakes and volcanoes affect Earth's spheres"),
  S("TEKS", "WG.4A", "What controls temperature, precipitation and climate regions"),
  S("TEKS", "WG.4B", "Landforms and the processes that make them"),
  S("TEKS", "WG.8B", "Consequences of floods, tsunamis, eruptions and El Niño for people"),
  S("TEKS", "WG.21C", "Creating and interpreting maps"),
  S("KS3", "Space physics", "Science: the Sun, seasons, day length, gravity and light-years"),
  S("KS3", "Earth and atmosphere", "Science: Earth's structure, rock cycle, carbon and climate"),
  S("KS3", "Physical geography", "Geography: plate tectonics, rocks, weather, rivers, coasts, ice"),
  S("KS3", "Geographical skills", "Geography: maps, grid references, scale and fieldwork"),
  S("AQA GCSE", "3.1.1.2", "Tectonic hazards"),
  S("AQA GCSE", "3.1.1.3", "Weather hazards"),
  S("AQA GCSE", "3.1.1.4", "Climate change"),
  S("AQA GCSE", "3.1.2.4", "Cold environments"),
  S("AQA GCSE", "3.1.3.2", "Coastal landscapes in the UK"),
  S("AQA GCSE", "3.1.3.3", "River landscapes in the UK"),
  S("AQA GCSE", "3.1.3.4", "Glacial landscapes in the UK"),
  S("AQA GCSE", "3.4", "Geographical skills"),
  S("Edexcel GCSE A", "Topic 1", "Changing landscapes of the UK"),
  S("Edexcel GCSE A", "Topic 2", "Weather hazards and climate change"),
  S("Edexcel GCSE B", "Topic 1", "Hazardous Earth"),
  S("Edexcel GCSE B", "Topic 4", "The UK's evolving physical landscape"),
  S("OCR GCSE A", "Landscapes of the UK", ""),
  S("OCR GCSE A", "Environmental threats to our planet", ""),
  S("OCR GCSE B", "Global hazards", ""),
  S("OCR GCSE B", "Changing climate", ""),
  S("OCR GCSE B", "Distinctive landscapes", ""),
  S("AQA A-level", "3.1.1", "Water and carbon cycles"),
  S("AQA A-level", "3.1.2", "Hot desert systems and landscapes"),
  S("AQA A-level", "3.1.3", "Coastal systems and landscapes"),
  S("AQA A-level", "3.1.4", "Glacial systems and landscapes"),
  S("AQA A-level", "3.1.5", "Hazards"),
];

export const STANDARD_BY_ID: Record<string, Standard> = Object.fromEntries(
  STANDARDS.map((s) => [s.id, s]),
);

export const FRAMEWORK_BY_ID = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f])) as Record<
  FrameworkId,
  Framework
>;

const FRAMEWORK_ORDER = new Map(FRAMEWORKS.map((f, i) => [f.id, i]));
const STANDARD_ORDER = new Map(STANDARDS.map((s, i) => [s.id, i]));

/** Standard IDs in display order: frameworks as listed above, then each framework's order. */
export function sortStandards(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => (STANDARD_ORDER.get(a) ?? 1e9) - (STANDARD_ORDER.get(b) ?? 1e9));
}

/** "NGSS HS-ESS2-6", "APES 4.7"; a named topic reads "OCR GCSE B · Global hazards". */
export function standardLabel(id: string): string {
  const s = STANDARD_BY_ID[id];
  if (!s) return id;
  const named = /^[A-Z][a-z]/.test(s.code) && !s.code.startsWith("Topic ");
  return named ? `${s.framework} · ${s.code}` : s.id;
}

/** Whether a standard belongs to a US framework. */
export const isUsStandard = (id: string) =>
  FRAMEWORK_BY_ID[STANDARD_BY_ID[id]?.framework]?.country === "US";

/** Frameworks compared by their display order. */
export const byFramework = (a: FrameworkId, b: FrameworkId) =>
  (FRAMEWORK_ORDER.get(a) ?? 99) - (FRAMEWORK_ORDER.get(b) ?? 99);

const squash = (text: string) => text.toUpperCase().replace(/\s+/g, " ").trim();

/**
 * The standards a search names, if it is a standard code: "MS-ESS2-2", "NGSS HS-ESS3-1",
 * "APES 4.1" or "aqa gcse 3.1.3.4" give that standard; an NGSS group such as "HS-ESS3" gives all
 * of its expectations. Anything else gives none, and is searched as words.
 */
export function matchStandards(query: string): string[] {
  const q = squash(query).replace(/^NGSS /, "");
  if (!q) return [];
  const exact = STANDARDS.find(
    (s) =>
      squash(s.id) === q ||
      (s.framework === "NGSS" && squash(s.code) === q) ||
      (s.framework === "TEKS" && squash(s.code) === q),
  );
  if (exact) return [exact.id];
  // A TEKS knowledge-and-skills statement gives its student expectations: "TEKS 8.10" or "ESS.8".
  const teks = q.replace(/^TEKS /, "");
  if (/^(\d|ESS|WG)\.\d+$/.test(teks) && (q.startsWith("TEKS ") || !/^\d/.test(teks))) {
    const group = STANDARDS.filter(
      (s) =>
        s.framework === "TEKS" && new RegExp(`^${teks.replace(".", "\\.")}[A-Z]$`).test(s.code),
    );
    if (group.length) return group.map((s) => s.id);
  }
  if (/^(MS|HS)-ESS[123]$/.test(q))
    return STANDARDS.filter((s) => s.framework === "NGSS" && s.code.startsWith(`${q}-`)).map(
      (s) => s.id,
    );
  return [];
}
