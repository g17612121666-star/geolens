import { lazy, type ComponentType } from "react";

const SCENE_IMPORTS = {
  seasons: () => import("@/labs/seasons/scene"),
  rotation: () => import("@/labs/rotation/scene"),
  "moon-phases": () => import("@/labs/moon-phases/scene"),
  "earth-interior": () => import("@/labs/earth-interior/scene"),
  "plate-boundaries": () => import("@/labs/plate-boundaries/scene"),
  contours: () => import("@/labs/contours/scene"),
  rivers: () => import("@/labs/rivers/scene"),
  "water-cycle": () => import("@/labs/water-cycle/scene"),
  "solar-system": () => import("@/labs/solar-system/scene"),
  "sun-earth": () => import("@/labs/sun-earth/scene"),
  "solar-altitude": () => import("@/labs/solar-altitude/scene"),
  eclipses: () => import("@/labs/eclipses/scene"),
  tides: () => import("@/labs/tides/scene"),
  "universe-scale": () => import("@/labs/universe-scale/scene"),
  "geologic-time": () => import("@/labs/geologic-time/scene"),
  "continental-drift": () => import("@/labs/continental-drift/scene"),
  hotspots: () => import("@/labs/hotspots/scene"),
  "seafloor-spreading": () => import("@/labs/seafloor-spreading/scene"),
  earthquakes: () => import("@/labs/earthquakes/scene"),
  volcanoes: () => import("@/labs/volcanoes/scene"),
  tsunami: () => import("@/labs/tsunami/scene"),
  "tropical-cyclone": () => import("@/labs/tropical-cyclone/scene"),
  "atmosphere-layers": () => import("@/labs/atmosphere-layers/scene"),
  "energy-budget": () => import("@/labs/energy-budget/scene"),
  "thermal-circulation": () => import("@/labs/thermal-circulation/scene"),
  wind: () => import("@/labs/wind/scene"),
  "three-cell": () => import("@/labs/three-cell/scene"),
  fronts: () => import("@/labs/fronts/scene"),
  "cyclone-anticyclone": () => import("@/labs/cyclone-anticyclone/scene"),
  "climate-types": () => import("@/labs/climate-types/scene"),
  enso: () => import("@/labs/enso/scene"),
  "drainage-basin": () => import("@/labs/drainage-basin/scene"),
  hydrograph: () => import("@/labs/hydrograph/scene"),
  "river-hydrology": () => import("@/labs/river-hydrology/scene"),
  "ocean-currents": () => import("@/labs/ocean-currents/scene"),
  thermohaline: () => import("@/labs/thermohaline/scene"),
  "carbon-cycle": () => import("@/labs/carbon-cycle/scene"),
  "landform-types": () => import("@/labs/landform-types/scene"),
  "river-erosion": () => import("@/labs/river-erosion/scene"),
  "river-deposition": () => import("@/labs/river-deposition/scene"),
  "river-capture": () => import("@/labs/river-capture/scene"),
  coasts: () => import("@/labs/coasts/scene"),
  glaciers: () => import("@/labs/glaciers/scene"),
  karst: () => import("@/labs/karst/scene"),
  "folds-faults": () => import("@/labs/folds-faults/scene"),
  aeolian: () => import("@/labs/aeolian/scene"),
  "rock-cycle": () => import("@/labs/rock-cycle/scene"),
  "soil-profile": () => import("@/labs/soil-profile/scene"),
  "soil-texture": () => import("@/labs/soil-texture/scene"),
  weathering: () => import("@/labs/weathering/scene"),
  "soil-erosion": () => import("@/labs/soil-erosion/scene"),
  graticule: () => import("@/labs/graticule/scene"),
  "map-projections": () => import("@/labs/map-projections/scene"),
  "grid-references": () => import("@/labs/grid-references/scene"),
  "mass-movement": () => import("@/labs/mass-movement/scene"),
  "rain-shadow": () => import("@/labs/rain-shadow/scene"),
  groundwater: () => import("@/labs/groundwater/scene"),
  isostasy: () => import("@/labs/isostasy/scene"),
  "wilson-cycle": () => import("@/labs/wilson-cycle/scene"),
  "soil-catena": () => import("@/labs/soil-catena/scene"),
  periglacial: () => import("@/labs/periglacial/scene"),
  "storm-surge": () => import("@/labs/storm-surge/scene"),
};

type Slug = keyof typeof SCENE_IMPORTS;
const imports = new Map<string, Promise<{ default: ComponentType }>>();
export function preloadLab(slug: string) {
  const importer = SCENE_IMPORTS[slug as Slug];
  if (!importer) return;
  let pending = imports.get(slug);
  if (!pending) {
    pending = importer();
    imports.set(slug, pending);
    pending.catch(() => imports.delete(slug));
  }
  return pending;
}
export const LAB_SCENES: Record<string, ComponentType> = Object.fromEntries(
  Object.keys(SCENE_IMPORTS).map((slug) => [slug, lazy(() => preloadLab(slug)!)]),
);
export const SHIPPED_SLUGS = Object.keys(LAB_SCENES);
