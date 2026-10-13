/** Topic-specific videos checked against the publishers' descriptions in September 2026.
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
  youtubeId: '11ZI9aqurfA',
  title: 'What Does the Atmosphere Do? Crash Course Geography #6',
  source: 'Crash Course',
  sourceUrl: 'https://thecrashcourse.com/courses/what-does-the-atmosphere-do-crash-course-geography-6/',
};
const oceans: LabVideo = {
  youtubeId: 'xa6SdvFA3w0',
  title: 'How Do Oceans Circulate? Crash Course Geography #9',
  source: 'Crash Course',
  sourceUrl: 'https://thecrashcourse.com/courses/how-do-oceans-circulate-crash-course-geography-9/',
};
export const LAB_VIDEOS: Record<string, LabVideo> = {
  seasons: {
    youtubeId: '2lSnnH12tJ4',
    title: 'Why we have seasons',
    source: 'Khan Academy',
    sourceUrl: 'https://www.youtube.com/watch?v=2lSnnH12tJ4',
  },
  'atmosphere-layers': atmosphere,
  'energy-budget': atmosphere,
  'ocean-currents': oceans,
  thermohaline: oceans,
  'plate-boundaries': {
    youtubeId: '7CPv0NSIG2M',
    title: 'The Plate Tectonics Revolution: Crash Course Geography #19',
    source: 'Crash Course',
    sourceUrl: 'https://thecrashcourse.com/courses/the-plate-tectonics-revolution-crash-course-geography-19/',
  },
  'rock-cycle': {
    youtubeId: '7Bxw4kkeHJ8',
    title: 'What Are Rocks and How Do They Form? Crash Course Geography #18',
    source: 'Crash Course',
    sourceUrl: 'https://thecrashcourse.com/courses/what-are-rocks-and-how-do-they-form-crash-course-geography-18/',
  },
  rivers: {
    youtubeId: 'CDEj62HGNkk',
    title: 'How Rivers Shape the Landscape: Crash Course Geography #23',
    source: 'Crash Course',
    sourceUrl: 'https://thecrashcourse.com/courses/how-rivers-shape-the-landscape-crash-course-geography-23/',
  },
  glaciers: {
    youtubeId: 'mkt-0ZuTKXU',
    title: 'What Are Glaciers? Crash Course Geography #26',
    source: 'Crash Course',
    sourceUrl: 'https://thecrashcourse.com/courses/what-are-glaciers-crash-course-geography-26/',
  },
};
export function labVideo(slug: string): LabVideo | undefined {
  return LAB_VIDEOS[slug];
}
