import fs from 'node:fs';
const file='reports/round4-labs-audit.json',labs=JSON.parse(fs.readFileSync(file,'utf8'));
const changed={
'earth-interior':['Photographic mantle cut faces, differentiated metallic core, local fill lighting; radii preserved.'],
'water-cycle':['Natural reservoir shoreline and linked withdrawal level; cloud volumes and seeded woodland; light-theme flow guides.'],
'glaciers':['Jointed alpine shoulders and seeded conifers; flowing opaque ice; open cirques with tapered convex ice, ridges and horn.'],
'karst':['Irregular joints, closed rock block/cave, attached cave deposits and photographic world-space material.'],
'rock-cycle':['Mineral-grain granite material replaces faceted camouflage.'],
'ocean-currents':['Rounded interpolation through the original selected current route.'],
'map-projections':['Africa-facing camera and unlit scientific imagery for legible comparison.'],
'rain-shadow':['Rough side terrain with unchanged scientific parcel path.'],
'river-capture':['Natural bank scatter; tree heights no longer stretched by terrain exaggeration.'],
'volcanoes':['Shared rock detail; replace bead-shell plume with expanding density volumes tied to process time.'],
'coasts':['Approved photographic rock mapping and arch geometry preserved.'],
'rivers':['Approved channel geometry, water and woodland preserved.'],
'continental-drift':['Existing pre-baked reconstruction maps and entry progress retained; no fabricated ancient photographic surface.'],
'groundwater':['Corrected pressure-surface colour reference in model note.'],
'wilson-cycle':['Formation-stage translation separated from hydraulic stage; rock sections retained.'],
};
const scatter=['thermal-circulation','drainage-basin','hydrograph','river-hydrology','landform-types','river-erosion','river-deposition','soil-profile','soil-erosion','mass-movement','soil-catena'];
const guides=['seasons','solar-system','moon-phases','eclipses','rotation','tides','universe-scale','atmosphere-layers','energy-budget','wind','three-cell','fronts','carbon-cycle','enso','earthquakes','geologic-time','thermohaline','sun-earth','tropical-cyclone','tsunami','storm-surge','solar-altitude'];
const controls={
'earth-interior':['Final light-theme Chinese cutaway inspected'],
'seasons':['Final light-theme orbital guide and labelled globe inspected'],
'water-cycle':['Final Chinese surface-flow readout and reservoir view inspected'],
'coasts':['390 px mobile arch scene, controls and ready gate inspected'],
'volcanoes':['Viscosity .25 → .85 changes shield to composite; gas .45 → .9 changes eruption; fissure control toggled; final density plume visually verified'],
'glaciers':['Valley → cirque switch; final tapered ice and open bowl inspected'],
'plate-boundaries':['Globe → boundary section; divergent → convergent changes geometry and arrows'],
'wilson-cycle':['Opening, rift, subduction and collision variants rendered; stage readout follows selection'],
'river-capture':['Exaggeration source checked: plant scale compensated'],
};
changed['tropical-cyclone']=['Continuous eyewall volume, cloud matrices and live slice/time uniforms; opaque sea fixes transparent sorting hiding rainbands.'];
controls['tropical-cyclone']=['North → south mirrors rainbands; t=.4 → .85 moves clouds; slice=.6 opens a sector; True scale reduces exaggerated height'];
for(const l of labs){l.initialFindings=l.initialFindings??l.findings;l.changes=['Chinese labels, teaching copy and theme-aware interface.',...(changed[l.slug]??[])];if(scatter.includes(l.slug))l.changes.push('Seeded non-row vegetation / clasts, photographed ground and bank context.');if(guides.includes(l.slug))l.changes.push('Theme-aware guide-line contrast; scientific scale unchanged.');l.checkedControls=controls[l.slug]??[];l.translationReviewed=true;l.finalDefaultViewReviewed=true;l.sourceReviewed=!!changed[l.slug]||scatter.includes(l.slug)||guides.includes(l.slug);l.pending=[];l.validationScope=l.checkedControls.length?'Default view and listed targeted controls; not every parameter combination.':'Default view visually inspected; alternate/extreme parameter combinations not exhaustively tested.';delete l.findings;}
fs.writeFileSync(file,JSON.stringify(labs,null,2)+'\n');
console.log(`${labs.length} per-lab audit records updated`);
