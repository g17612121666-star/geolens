/** Topic-specific videos checked against the publishers' descriptions in September 2026;
 * the Crash Course, Khan Academy and TED-Ed additions were checked again in October 2026.
 * An absent entry is deliberate: a loosely related film should not fill an empty slot.
 * Review evidence and removed mappings are recorded in reports/geolens-media-review.md.
 */
export type LabVideo = {
  youtubeId: string;
  title: string;
  source: string;
  sourceUrl: string;
};
const atmosphere: LabVideo = {
  youtubeId: "11ZI9aqurfA",
  title: "What Does the Atmosphere Do? Crash Course Geography #6",
  source: "Crash Course",
  sourceUrl:
    "https://thecrashcourse.com/courses/what-does-the-atmosphere-do-crash-course-geography-6/",
};
const oceans: LabVideo = {
  youtubeId: "xa6SdvFA3w0",
  title: "How Do Oceans Circulate? Crash Course Geography #9",
  source: "Crash Course",
  sourceUrl: "https://thecrashcourse.com/courses/how-do-oceans-circulate-crash-course-geography-9/",
};
const wind: LabVideo = {
  youtubeId: "ao_-OjDQwfk",
  title: "Where Does Wind Come From? Crash Course Geography #8",
  source: "Crash Course",
  sourceUrl:
    "https://thecrashcourse.com/courses/where-does-wind-come-from-crash-course-geography-8/",
};
const cyclones: LabVideo = {
  youtubeId: "06ke7hr1m_Q",
  title: "What Are the Different Types of Cyclones? Crash Course Geography #12",
  source: "Crash Course",
  sourceUrl:
    "https://thecrashcourse.com/courses/what-are-the-different-types-of-cyclones-crash-course-geography-12/",
};
export const LAB_VIDEOS: Record<string, LabVideo> = {
  seasons: {
    youtubeId: "2lSnnH12tJ4",
    title: "Why we have seasons",
    source: "Khan Academy",
    sourceUrl: "https://www.youtube.com/watch?v=2lSnnH12tJ4",
  },
  "atmosphere-layers": atmosphere,
  "energy-budget": atmosphere,
  "ocean-currents": oceans,
  thermohaline: oceans,
  "plate-boundaries": {
    youtubeId: "7CPv0NSIG2M",
    title: "The Plate Tectonics Revolution: Crash Course Geography #19",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/the-plate-tectonics-revolution-crash-course-geography-19/",
  },
  "rock-cycle": {
    youtubeId: "7Bxw4kkeHJ8",
    title: "What Are Rocks and How Do They Form? Crash Course Geography #18",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/what-are-rocks-and-how-do-they-form-crash-course-geography-18/",
  },
  rivers: {
    youtubeId: "CDEj62HGNkk",
    title: "How Rivers Shape the Landscape: Crash Course Geography #23",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/how-rivers-shape-the-landscape-crash-course-geography-23/",
  },
  glaciers: {
    youtubeId: "mkt-0ZuTKXU",
    title: "What Are Glaciers? Crash Course Geography #26",
    source: "Crash Course",
    sourceUrl: "https://thecrashcourse.com/courses/what-are-glaciers-crash-course-geography-26/",
  },
  wind,
  "three-cell": wind,
  fronts: cyclones,
  "tropical-cyclone": cyclones,
  "climate-types": {
    youtubeId: "xiGhLGFkJjo",
    title: "How do we Classify Climates? Crash Course Geography #13",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/how-do-we-classify-climates-crash-course-geography-13/",
  },
  volcanoes: {
    youtubeId: "cnKoTlUaqAs",
    title: "What Are Volcanoes? Crash Course Geography #21",
    source: "Crash Course",
    sourceUrl: "https://thecrashcourse.com/courses/what-are-volcanoes-crash-course-geography-21/",
  },
  weathering: {
    youtubeId: "pmF41T52nJs",
    title: "What is Weathering? Crash Course Geography #22",
    source: "Crash Course",
    sourceUrl: "https://thecrashcourse.com/courses/what-is-weathering-crash-course-geography-22/",
  },
  "soil-profile": {
    youtubeId: "udseIcrUxvA",
    title: "What is Soil (and Why is it Important)? Crash Course Geography #17",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/what-is-soil-and-why-is-it-important-crash-course-geography-17/",
  },
  "map-projections": {
    youtubeId: "iHEMOdRo5u8",
    title: "What is a Map? Crash Course Geography #2",
    source: "Crash Course",
    sourceUrl: "https://thecrashcourse.com/courses/what-is-a-map-crash-course-geography-2/",
  },
  "landform-types": {
    youtubeId: "1gMU7zfDqfg",
    title: "How Does the Earth Create Different Landforms? Crash Course Geography #20",
    source: "Crash Course",
    sourceUrl:
      "https://thecrashcourse.com/courses/how-does-the-earth-create-different-landforms-crash-course-geography-20/",
  },
  "folds-faults": {
    youtubeId: "r8uQVRVNV14",
    title: "How Do Mountains Form?: Crash Course Geology #11",
    source: "Crash Course",
    sourceUrl: "https://thecrashcourse.com/courses/how-do-mountains-form-crash-course-geology-11/",
  },
  tsunami: {
    youtubeId: "Wx9vPv-T51I",
    title: "How tsunamis work – Alex Gendler",
    source: "TED-Ed",
    sourceUrl: "https://ed.ted.com/lessons/how-tsunamis-work-alex-gendler",
  },
  "earth-interior": {
    youtubeId: "hHteUIS0OFY",
    title: "Compositional and mechanical layers of the Earth",
    source: "Khan Academy",
    sourceUrl: "https://www.youtube.com/watch?v=hHteUIS0OFY",
  },
  "continental-drift": {
    youtubeId: "axB6uhEx628",
    title: "Pangaea",
    source: "Khan Academy",
    sourceUrl: "https://www.youtube.com/watch?v=axB6uhEx628",
  },
  "seafloor-spreading": {
    youtubeId: "FK1s1-OJ5BE",
    title: "Geological features of divergent plate boundaries",
    source: "Khan Academy",
    sourceUrl: "https://www.youtube.com/watch?v=FK1s1-OJ5BE",
  },
};
export function labVideo(slug: string): LabVideo | undefined {
  return LAB_VIDEOS[slug];
}
