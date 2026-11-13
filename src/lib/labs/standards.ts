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
  S("APHG", "1.1", "Introduction to maps, including map projections"),
  S("C3", "D2.Geo.1.6-8", "Construct maps that show spatial patterns"),
  S("C3", "D2.Geo.3.6-8", "Use mapping techniques to analyze spatial patterns"),
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
