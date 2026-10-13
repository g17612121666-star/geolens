/** Stable regression entry point, independent of Git's tracked/untracked state. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const suites = [
  'atmosphere-isostasy', 'carbon', 'circulation', 'energy-wind',
  'geomorph-science', 'hydrology-science', 'insolation', 'lunar-science',
  'map-fallback', 'map-measure', 'ocean-circulation', 'ocean-wave',
  'natural-geometry', 'planet-round2', 'round2-landscape', 'atmosphere-ocean-round2', 'planet-distance', 'river-regime', 'river-vegetation', 'river-channel', 'science-geometry', 'seismic',
  'slump', 'soil-export', 'solar', 'spreading', 'structural-geology',
  'teaching-workflow', 'tropical-cyclone', 'weather', 'weathering-soil',
];
const result=spawnSync(process.execPath,['--test','--test-isolation=none',...suites.map(name=>`scripts/${name}.test.mjs`)],{
  cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:'inherit',
});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
