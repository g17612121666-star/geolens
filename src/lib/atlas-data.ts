import CLIMATE_DATA from "../../scripts/atlas-climate-data.json";
import ATLAS_PHOTOS from "../../scripts/atlas-photo-assignments.json";
import { VERIFIED_PHOTOS } from "./verified-photos";

export type AtlasKind = "country" | "uk-nation" | "uk-county" | "uk-place" | "us-state" | "city";

export type AtlasLabLink = { slug: string; label: string };

export type AtlasPlace = {
  id: string;
  name: string;
  kind: AtlasKind;
  capital: string;
  lat: number;
  lon: number;
  hook: string;
  geo?: string[];
  labs?: AtlasLabLink[];
  alias?: string[];
};

export const ATLAS: AtlasPlace[] = [
  { id: "uk", name: "United Kingdom", kind: "country", capital: "London", lat: 51.51, lon: -0.13, hook: "Four nations on a drowned shelf; the physical story is ice, till, and a North Atlantic fetch.", geo: ["Four nations on a drowned continental shelf. Ice, till, and a North Atlantic fetch write the land more than any county line.", "The west is wet and upland; the east is drier and lower. Holderness till cliffs and a chalk south coast are the exam pair.", "London sits on a drowned Thames. The physical map is glacial and marine, not a flag."], labs: [{ slug: "coasts", label: "Coasts" }, { slug: "glaciers", label: "Glacial landforms" }, { slug: "fronts", label: "Fronts as wedges" }] },
  { id: "ie", name: "Ireland", kind: "country", capital: "Dublin", lat: 53.35, lon: -6.26, hook: "A limestone and peat island; karst in the Burren, peat in the bogs.", geo: ["A limestone and peat island on the Atlantic margin.", "The Burren is carbonation along joints — a pavement, not a granite slab.", "Ice left drumlins and a wet west. Dublin is on the drier east."], labs: [{ slug: "karst", label: "Karst" }, { slug: "glaciers", label: "Glacial landforms" }] },
  { id: "is", name: "Iceland", kind: "country", capital: "Reykjavík", lat: 64.15, lon: -21.94, hook: "A mid-ocean ridge with a country on it. Basalt, ice, and a hotspot.", geo: ["Iceland sits on the Mid-Atlantic Ridge: a divergent plate boundary with a country on it.", "A mantle plume (hotspot) thickens the crust so the ridge stands above sea level. New basalt at the axis; ice on the high ground.", "Earthquakes and fissure eruptions are the syllabus, not a volcanic arc. The island is not a subduction story."], labs: [{ slug: "hotspots", label: "Hotspots" }, { slug: "seafloor-spreading", label: "Seafloor spreading" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "fr", name: "France", kind: "country", capital: "Paris", lat: 48.86, lon: 2.35, hook: "Massif Central to Alpine collision; a temperate west-coast climate inland.", geo: ["Massif Central of old rock, then Alpine collision in the south-east.", "A temperate west-coast climate that becomes more continental inland.", "Paris sits on a sedimentary basin, not in the mountains."] },
  { id: "es", name: "Spain", kind: "country", capital: "Madrid", lat: 40.42, lon: -3.7, hook: "A high meseta, Mediterranean coasts, and a rain-shadow interior.", geo: ["A high meseta, Mediterranean coasts, and a rain-shadow interior.", "The west sees Atlantic moisture; the south-east is drier.", "Madrid is an interior capital on the plateau, not a port."] },
  { id: "pt", name: "Portugal", kind: "country", capital: "Lisbon", lat: 38.72, lon: -9.14, hook: "Atlantic margin, Iberian plate, and a long fetch for swell." },
  { id: "de", name: "Germany", kind: "country", capital: "Berlin", lat: 52.52, lon: 13.41, hook: "North European Plain, then the Alpine foreland. Rivers write the map." },
  { id: "it", name: "Italy", kind: "country", capital: "Rome", lat: 41.9, lon: 12.5, hook: "A colliding boot: Alps, Apennines, volcanoes on a subduction story.", geo: ["Alps from collision, Apennines as a fold belt, volcanoes on a subduction hinge.", "Vesuvius and Etna differ in magma composition and tectonic setting; Etna commonly erupts basaltic lava.", "Rome sits in a west-coast lowland, not on the Alpine crest."], labs: [{ slug: "volcanoes", label: "Volcanoes" }, { slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "earthquakes", label: "Earthquakes" }] },
  { id: "gr", name: "Greece", kind: "country", capital: "Athens", lat: 37.98, lon: 23.73, hook: "A drowned mountain landscape; earthquakes are the plate conversation.", labs: [{ slug: "earthquakes", label: "Earthquakes" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "no", name: "Norway", kind: "country", capital: "Oslo", lat: 59.91, lon: 10.75, hook: "Glacial troughs flooded as fjords. Ice did the cutting.", geo: ["Ice cut U-troughs; the sea flooded them as fjords. Rivers did not invent those walls.", "A wet west on a westerly fetch; Oslo is on a drier east.", "Caledonian rock and a glaciated shield, not a volcanic arc."], labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "coasts", label: "Coasts" }] },
  { id: "se", name: "Sweden", kind: "country", capital: "Stockholm", lat: 59.33, lon: 18.07, hook: "A shield of old rock, ice-scoured, with a Baltic half-sea." },
  { id: "fi", name: "Finland", kind: "country", capital: "Helsinki", lat: 60.17, lon: 24.94, hook: "A lake-and-moraine country left by ice sheets." },
  { id: "pl", name: "Poland", kind: "country", capital: "Warsaw", lat: 52.23, lon: 21.01, hook: "A plain of glacial deposits between the Baltic and the Carpathians." },
  { id: "nl", name: "Netherlands", kind: "country", capital: "Amsterdam", lat: 52.37, lon: 4.9, hook: "A delta and a bargain with the sea. Levées as national policy.", labs: [{ slug: "rivers", label: "Rivers" }, { slug: "coasts", label: "Coasts" }, { slug: "storm-surge", label: "Storm surge" }] },
  { id: "be", name: "Belgium", kind: "country", capital: "Brussels", lat: 50.85, lon: 4.35, hook: "A short slope from North Sea mud to Ardennes rock." },
  { id: "ch", name: "Switzerland", kind: "country", capital: "Bern", lat: 46.95, lon: 7.44, hook: "Collision mountains, U-troughs, and the hydrology of ice.", labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "folds-faults", label: "Folds and faults" }] },
  { id: "at", name: "Austria", kind: "country", capital: "Vienna", lat: 48.21, lon: 16.37, hook: "The eastern Alps, then the Danube gate." },
  { id: "tr", name: "Türkiye", kind: "country", capital: "Ankara", lat: 39.93, lon: 32.86, hook: "A plateau between colliding plates; North Anatolian Fault is the exam case.", labs: [{ slug: "earthquakes", label: "Earthquakes" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "eg", name: "Egypt", kind: "country", capital: "Cairo", lat: 30.04, lon: 31.24, hook: "A desert with a river. The Nile is the hydrograph.", geo: ["A hot desert with one through-flowing river. The Nile is the hydrograph.", "Almost no rain on the plateau. Flood pulse and irrigation are the water story.", "Cairo sits on alluvium, not on a glacier or a plate boundary."], labs: [{ slug: "hydrograph", label: "Storm hydrograph" }, { slug: "rivers", label: "Rivers" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "ke", name: "Kenya", kind: "country", capital: "Nairobi", lat: -1.29, lon: 36.82, hook: "Equatorial highlands and the East African Rift; seasonal rain and drier lowlands.", geo: ["Kenya sits on the East African Rift. Equator on a diverging plate.", "Rainfall seasons reflect the migration of tropical circulation, ocean conditions and relief; axial tilt still drives the seasonal solar cycle.", "Nairobi is high enough to be cool. Height writes the air here, not latitude alone."], labs: [{ slug: "seasons", label: "Why seasons happen" }, { slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "za", name: "South Africa", kind: "country", capital: "Pretoria", lat: -25.75, lon: 28.19, hook: "A high plateau, a cold current, and a winter-rain Cape." },
  { id: "ng", name: "Nigeria", kind: "country", capital: "Abuja", lat: 9.08, lon: 7.4, hook: "ITCZ walk writes a wet south and a drier north." },
  { id: "ma", name: "Morocco", kind: "country", capital: "Rabat", lat: 34.02, lon: -6.84, hook: "Atlas ranges, a cold Canary current, and a Sahara edge." },
  { id: "us", name: "United States", kind: "country", capital: "Washington, D.C.", lat: 38.91, lon: -77.04, hook: "Cordillera, shield, plains, and two oceans. One country, several planets.", geo: ["Cordillera, shield, plains, and two oceans. One country, several physical planets.", "The west is plates and rain-shadow. The east is a drowned glacial and river story.", "Washington, D.C. sits on a fall-line hinge, not in a glacial trough."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "climate-types", label: "Climate types" }, { slug: "glaciers", label: "Glacial landforms" }] },
  { id: "ca", name: "Canada", kind: "country", capital: "Ottawa", lat: 45.42, lon: -75.7, hook: "A shield of ancient rock, ice, and a long polar night in the north.", labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "periglacial", label: "Periglacial" }] },
  { id: "mx", name: "Mexico", kind: "country", capital: "Mexico City", lat: 19.43, lon: -99.13, hook: "A volcanic high, a subduction trench, and a dry north.", labs: [{ slug: "volcanoes", label: "Volcanoes" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "br", name: "Brazil", kind: "country", capital: "Brasília", lat: -15.79, lon: -47.88, hook: "Amazon basin, Brazilian plateau, and an ITCZ that is not a UK weather map.", labs: [{ slug: "climate-types", label: "Climate types" }, { slug: "carbon-cycle", label: "Carbon cycle" }, { slug: "rivers", label: "Rivers" }] },
  { id: "ar", name: "Argentina", kind: "country", capital: "Buenos Aires", lat: -34.6, lon: -58.38, hook: "Andes rain-shadow, then a humid Pampas, then Patagonian ice." },
  { id: "cl", name: "Chile", kind: "country", capital: "Santiago", lat: -33.45, lon: -70.67, hook: "A trench, a range, and a desert beside a cold current.", geo: ["A trench, a range, and the Atacama beside a cold Humboldt current.", "Subduction writes the Andes and the volcanoes. Rain-shadow writes the desert.", "Santiago sits in a central valley, not on the trench axis."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "volcanoes", label: "Volcanoes" }, { slug: "rain-shadow", label: "Rain shadow" }] },
  { id: "pe", name: "Peru", kind: "country", capital: "Lima", lat: -12.05, lon: -77.04, hook: "Humboldt current, Andes, Amazon — three climates in one transect.", labs: [{ slug: "rain-shadow", label: "Rain shadow" }, { slug: "ocean-currents", label: "Ocean currents" }, { slug: "enso", label: "ENSO" }] },
  { id: "co", name: "Colombia", kind: "country", capital: "Bogotá", lat: 4.71, lon: -74.07, hook: "Equatorial Andes. Height writes the climate, not latitude." },
  { id: "au", name: "Australia", kind: "country", capital: "Canberra", lat: -35.28, lon: 149.13, hook: "An old, dry shield. Monsoon north, Mediterranean south-west, desert core.", labs: [{ slug: "climate-types", label: "Climate types" }, { slug: "aeolian", label: "Wind landforms" }] },
  { id: "nz", name: "New Zealand", kind: "country", capital: "Wellington", lat: -41.29, lon: 174.78, hook: "A plate boundary with alps and a westerly fetch.", geo: ["A plate boundary with Southern Alps and a long westerly fetch.", "The Alpine Fault is a transform with a compressional component — not a Hawaiian hotspot.", "Wellington sits on the colliding edge. Ice cut the south-west fjords."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "glaciers", label: "Glacial landforms" }, { slug: "earthquakes", label: "Earthquakes" }] },
  { id: "jp", name: "Japan", kind: "country", capital: "Tokyo", lat: 35.68, lon: 139.65, hook: "Arc volcanoes on a subduction hinge. Earthquakes are the syllabus.", geo: ["Japan lies along several plate margins, where the Pacific and Philippine Sea plates subduct beneath parts of the island arc.", "Volcanoes form above subduction zones. Offshore earthquakes can generate tsunami when they displace the seafloor.", "Tokyo sits on a Kanto plain of sediment, not on a mid-ocean ridge. This is not Iceland and not Hawaiʻi."], labs: [{ slug: "volcanoes", label: "Volcanoes" }, { slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "earthquakes", label: "Earthquakes" }] },
  { id: "cn", name: "China", kind: "country", capital: "Beijing", lat: 39.9, lon: 116.41, hook: "A monsoon east, a dry west, a colliding south.", geo: ["A monsoon east, a dry interior west, and a colliding Himalayan south.", "The Tibetan Plateau is continent–continent convergence, not a volcanic arc.", "Beijing sits on a north China plain. The high ice is a thousand kilometres southwest. Shanghai, Hong Kong, and the Loess Plateau are other physical planets inside the same country."], labs: [{ slug: "folds-faults", label: "Folds and faults" }, { slug: "climate-types", label: "Climate types" }, { slug: "rain-shadow", label: "Rain shadow" }], alias: ["Beijing", "Shanghai", "Hong Kong", "Taiwan", "Macau"] },
  { id: "hk", name: "Hong Kong", kind: "city", capital: "—", lat: 22.3, lon: 114.17, hook: "Weathered granite, steep catchments, a drowned harbour. Mass movement is the syllabus.", geo: ["A granite and volcanic terrain, deeply weathered in a subtropical monsoon.", "Steep catchments above a dense city. Debris flows after rain, not till cliffs at a North Sea fetch.", "Victoria Harbour is a drowned valley. The physical map is slope and saprolite, not a skyline."], labs: [{ slug: "mass-movement", label: "Mass movement" }, { slug: "weathering", label: "Weathering" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }], alias: ["Xianggang", "HK", "Kowloon", "New Territories"] },
  { id: "shanghai", name: "Shanghai", kind: "city", capital: "—", lat: 31.23, lon: 121.47, hook: "A tidal Huangpu on the Yangtze delta. Meiyu, tide, and a flood wall.", geo: ["A drowned river on a silt delta. The Huangpu is tidal; the sea is part of the hydrograph.", "Meiyu (plum rain) and typhoon remnants write summer peaks. This is not a UK winter front.", "Pudong is a skyline on alluvium. The physical map is the delta, not the tower."], labs: [{ slug: "hydrograph", label: "Storm hydrograph" }, { slug: "rivers", label: "Rivers" }, { slug: "storm-surge", label: "Storm surge" }], alias: ["Huangpu", "Pudong", "Yangtze delta"] },
  { id: "tw", name: "Taiwan", kind: "country", capital: "Taipei", lat: 25.03, lon: 121.57, hook: "A colliding island: high Central Range, a typhoon east, a strait to the west.", geo: ["Taiwan is an orogen on a converging edge. The Central Range is high because plates shorten.", "The east is a typhoon fetch. Yushan is a collision peak, not a volcanic arc like Fuji.", "Taipei sits in a northern basin. The physical map is the range and the strait."], labs: [{ slug: "folds-faults", label: "Folds and faults" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "plate-boundaries", label: "Plate boundaries" }], alias: ["Taipei", "Formosa", "Yushan"] },
  { id: "mo", name: "Macau", kind: "city", capital: "—", lat: 22.2, lon: 113.54, hook: "A drowned Pearl River edge. Typhoon surge on reclaimed ground.", geo: ["Macau sits on the west of the Pearl River estuary. Reclamation is the new shoreline.", "A typhoon surge is the syllabus, not a chalk cliff. The same warm-core engine as a hurricane, a western North Pacific name.", "The tower is a landmark. The physical map is an estuary and a monsoon."], labs: [{ slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "storm-surge", label: "Storm surge" }, { slug: "coasts", label: "Coasts" }], alias: ["Macao", "Pearl River"] },
  { id: "in", name: "India", kind: "country", capital: "New Delhi", lat: 28.61, lon: 77.21, hook: "A continent that walked north; the Himalaya are the crumple.", geo: ["India walked north into Eurasia. The Himalaya are the crumple zone.", "A monsoon climate on a colliding edge. The Ganges–Brahmaputra is the hydrograph.", "New Delhi sits on the Indo-Gangetic plain, not on the high ice."], labs: [{ slug: "continental-drift", label: "Continental drift" }, { slug: "folds-faults", label: "Folds and faults" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "id", name: "Indonesia", kind: "country", capital: "Jakarta", lat: -6.21, lon: 106.85, hook: "An island arc on the Pacific Ring. Volcanoes and a warm pool.", labs: [{ slug: "volcanoes", label: "Volcanoes" }, { slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }] },
  { id: "ph", name: "Philippines", kind: "country", capital: "Manila", lat: 14.6, lon: 120.98, hook: "A typhoon alley on a colliding arc.", labs: [{ slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "volcanoes", label: "Volcanoes" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "kr", name: "South Korea", kind: "country", capital: "Seoul", lat: 37.57, lon: 126.98, hook: "A peninsula between a cold sea and a monsoon." },
  { id: "ru", name: "Russia", kind: "country", capital: "Moscow", lat: 55.76, lon: 37.62, hook: "A continental interior. Size on a Mercator map is a projection lie.", labs: [{ slug: "map-projections", label: "Map projections" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "ua", name: "Ukraine", kind: "country", capital: "Kyiv", lat: 50.45, lon: 30.52, hook: "A chernozem plain — mollisol country — drained by the Dnipro." },
  { id: "sa", name: "Saudi Arabia", kind: "country", capital: "Riyadh", lat: 24.71, lon: 46.68, hook: "A hot desert on a shield, with a Red Sea rift on one edge." },
  { id: "ir", name: "Iran", kind: "country", capital: "Tehran", lat: 35.69, lon: 51.39, hook: "Fold mountains from collision; a dry interior plateau." },
  { id: "pk", name: "Pakistan", kind: "country", capital: "Islamabad", lat: 33.68, lon: 73.05, hook: "Indus basin in the rain-shadow of the collision belt." },
  { id: "bd", name: "Bangladesh", kind: "country", capital: "Dhaka", lat: 23.81, lon: 90.41, hook: "A delta the size of a country. Monsoon plus Ganges–Brahmaputra load.", labs: [{ slug: "rivers", label: "Rivers" }, { slug: "hydrograph", label: "Storm hydrograph" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }] },
  { id: "vn", name: "Vietnam", kind: "country", capital: "Hanoi", lat: 21.03, lon: 105.85, hook: "A monsoon coast with a Red River and Mekong pair of deltas." },
  { id: "th", name: "Thailand", kind: "country", capital: "Bangkok", lat: 13.76, lon: 100.5, hook: "A tropical wet-and-dry year on a peninsula." },
  { id: "my", name: "Malaysia", kind: "country", capital: "Kuala Lumpur", lat: 3.14, lon: 101.69, hook: "Equatorial rainforest on a peninsula and on Borneo." },
  { id: "sg", name: "Singapore", kind: "country", capital: "Singapore", lat: 1.35, lon: 103.82, hook: "Almost on the equator. Day length barely moves.", labs: [{ slug: "seasons", label: "Why seasons happen" }] },
  { id: "ae", name: "United Arab Emirates", kind: "country", capital: "Abu Dhabi", lat: 24.45, lon: 54.38, hook: "Hot desert coast on a shallow sea. Albedo and air-con are the budget." },
  { id: "qa", name: "Qatar", kind: "country", capital: "Doha", lat: 25.29, lon: 51.53, hook: "A limestone peninsula, a shallow gulf, extreme summer heat." },
  { id: "il", name: "Israel", kind: "country", capital: "Jerusalem", lat: 31.77, lon: 35.22, hook: "A climate transect from Mediterranean to rain-shadow desert in a few hours." },
  { id: "et", name: "Ethiopia", kind: "country", capital: "Addis Ababa", lat: 9.03, lon: 38.74, hook: "A high plateau on the East African Rift. Height, not latitude, writes the air.", labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "tz", name: "Tanzania", kind: "country", capital: "Dodoma", lat: -6.16, lon: 35.75, hook: "Rift, crater highlands, and an Indian Ocean monsoon." },
  { id: "gh", name: "Ghana", kind: "country", capital: "Accra", lat: 5.6, lon: -0.19, hook: "ITCZ rains on a Gulf of Guinea coast. Greenwich’s sea crossing is offshore." },
  { id: "sn", name: "Senegal", kind: "country", capital: "Dakar", lat: 14.69, lon: -17.45, hook: "Sahel on the west. The ITCZ’s walk is the wet season." },
  { id: "dz", name: "Algeria", kind: "country", capital: "Algiers", lat: 36.75, lon: 3.06, hook: "A Mediterranean strip, then Sahara. Albedo jumps at the sand." },
  { id: "ly", name: "Libya", kind: "country", capital: "Tripoli", lat: 32.89, lon: 13.19, hook: "Sahara to a short Mediterranean coast." },
  { id: "sd", name: "Sudan", kind: "country", capital: "Khartoum", lat: 15.5, lon: 32.56, hook: "Nile confluence in a seasonal ITCZ climate." },
  { id: "cd", name: "DR Congo", kind: "country", capital: "Kinshasa", lat: -4.33, lon: 15.31, hook: "Congo basin rainforest. The air is a store of water." },
  { id: "ao", name: "Angola", kind: "country", capital: "Luanda", lat: -8.84, lon: 13.23, hook: "A Benguela-current coast and an inland plateau." },
  { id: "mz", name: "Mozambique", kind: "country", capital: "Maputo", lat: -25.97, lon: 32.57, hook: "An Indian Ocean cyclone coast on a rifted margin." },
  { id: "mg", name: "Madagascar", kind: "country", capital: "Antananarivo", lat: -18.88, lon: 47.51, hook: "A wet east, a dry west, a rain-shadow island." },
  { id: "cu", name: "Cuba", kind: "country", capital: "Havana", lat: 23.11, lon: -82.37, hook: "A tropical island in the hurricane belt, on a carbonate platform.", labs: [{ slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "karst", label: "Karst" }] },
  { id: "ht", name: "Haiti", kind: "country", capital: "Port-au-Prince", lat: 18.59, lon: -72.31, hook: "A transform and collision edge. Earthquakes and steep catchments.", labs: [{ slug: "earthquakes", label: "Earthquakes" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "jm", name: "Jamaica", kind: "country", capital: "Kingston", lat: 18.02, lon: -76.81, hook: "A limestone island with hurricane fetch from the Atlantic." },
  { id: "cr", name: "Costa Rica", kind: "country", capital: "San José", lat: 9.93, lon: -84.09, hook: "A volcanic isthmus between two oceans." },
  { id: "pa", name: "Panama", kind: "country", capital: "Panama City", lat: 8.98, lon: -79.52, hook: "The divide a canal cut. Two oceans, one ITCZ." },
  { id: "ec", name: "Ecuador", kind: "country", capital: "Quito", lat: -0.18, lon: -78.47, hook: "Equator plus Andes. Galápagos is the hotspot footnote.", labs: [{ slug: "hotspots", label: "Hotspots" }, { slug: "seasons", label: "Why seasons happen" }] },
  { id: "bo", name: "Bolivia", kind: "country", capital: "Sucre", lat: -19.02, lon: -65.26, hook: "Altiplano, a high dry basin between ranges." },
  { id: "uy", name: "Uruguay", kind: "country", capital: "Montevideo", lat: -34.9, lon: -56.16, hook: "A temperate grassland on the Río de la Plata." },
  { id: "py", name: "Paraguay", kind: "country", capital: "Asunción", lat: -25.26, lon: -57.58, hook: "A continental interior river basin, no coast." },
  { id: "ve", name: "Venezuela", kind: "country", capital: "Caracas", lat: 10.48, lon: -66.9, hook: "Caribbean coast, Andes spur, Orinoco plains." },
  { id: "gy", name: "Guyana", kind: "country", capital: "Georgetown", lat: 6.8, lon: -58.16, hook: "A Guiana Shield edge and a muddy Atlantic coast." },
  { id: "pg", name: "Papua New Guinea", kind: "country", capital: "Port Moresby", lat: -9.44, lon: 147.18, hook: "A colliding island of high relief and wet tropics." },
  { id: "fj", name: "Fiji", kind: "country", capital: "Suva", lat: -18.14, lon: 178.44, hook: "A tropical cyclone island on a complex plate hinge." },
  { id: "to", name: "Tonga", kind: "country", capital: "Nukuʻalofa", lat: -21.14, lon: -175.2, hook: "A volcanic arc above a deep trench." },
  { id: "ws", name: "Samoa", kind: "country", capital: "Apia", lat: -13.83, lon: -171.77, hook: "Hotspot islands in the South Pacific trades." },
  { id: "np", name: "Nepal", kind: "country", capital: "Kathmandu", lat: 27.72, lon: 85.32, hook: "The Himalaya wedge. Continent–continent convergence, in section.", labs: [{ slug: "folds-faults", label: "Folds and faults" }, { slug: "plate-boundaries", label: "Plate boundaries" }] },
  { id: "bt", name: "Bhutan", kind: "country", capital: "Thimphu", lat: 27.47, lon: 89.64, hook: "A monsoon mountain wall on the same collision." },
  { id: "lk", name: "Sri Lanka", kind: "country", capital: "Sri Jayawardenepura Kotte", lat: 6.89, lon: 79.9, hook: "A tropical island with two monsoons and a highland core." },
  { id: "mm", name: "Myanmar", kind: "country", capital: "Naypyidaw", lat: 19.76, lon: 96.12, hook: "A monsoon trough and an arc of hills around the Irrawaddy." },
  { id: "kh", name: "Cambodia", kind: "country", capital: "Phnom Penh", lat: 11.56, lon: 104.93, hook: "A Mekong flood pulse and a Tonlé Sap reverse-flow lake." },
  { id: "la", name: "Laos", kind: "country", capital: "Vientiane", lat: 17.98, lon: 102.63, hook: "An interior monsoon catchment of the Mekong." },
  { id: "mn", name: "Mongolia", kind: "country", capital: "Ulaanbaatar", lat: 47.91, lon: 106.91, hook: "A continental interior. Cold, dry, and far from any sea breeze." },
  { id: "kz", name: "Kazakhstan", kind: "country", capital: "Astana", lat: 51.17, lon: 71.45, hook: "Steppe and a closed basin. Continentality in one word." },
  { id: "uz", name: "Uzbekistan", kind: "country", capital: "Tashkent", lat: 41.3, lon: 69.24, hook: "An irrigated dryland in a rain-shadow of high Asia." },
  { id: "af", name: "Afghanistan", kind: "country", capital: "Kabul", lat: 34.53, lon: 69.17, hook: "A high dry collision landscape. Rain is a mountain story." },
  { id: "iq", name: "Iraq", kind: "country", capital: "Baghdad", lat: 33.32, lon: 44.37, hook: "Tigris–Euphrates alluvium between deserts." },
  { id: "sy", name: "Syria", kind: "country", capital: "Damascus", lat: 33.51, lon: 36.29, hook: "A Fertile Crescent edge: rain-fed west, dry east." },
  { id: "jo", name: "Jordan", kind: "country", capital: "Amman", lat: 31.95, lon: 35.93, hook: "A rift valley (Dead Sea) beside a rain-shadow desert." },
  { id: "lb", name: "Lebanon", kind: "country", capital: "Beirut", lat: 33.89, lon: 35.5, hook: "A short mountain that wrings Mediterranean westerlies." },
  { id: "cy", name: "Cyprus", kind: "country", capital: "Nicosia", lat: 35.17, lon: 33.36, hook: "A Mediterranean island on an African–Anatolian hinge." },
  { id: "mt", name: "Malta", kind: "country", capital: "Valletta", lat: 35.9, lon: 14.51, hook: "A limestone slab in a small sea. Karst at island scale." },
  { id: "hr", name: "Croatia", kind: "country", capital: "Zagreb", lat: 45.81, lon: 15.98, hook: "A karst coast of drowned valleys — a Dalmatian shoreline." },
  { id: "ba", name: "Bosnia and Herzegovina", kind: "country", capital: "Sarajevo", lat: 43.86, lon: 18.41, hook: "Dinaric limestone, a karst interior." },
  { id: "rs", name: "Serbia", kind: "country", capital: "Belgrade", lat: 44.79, lon: 20.45, hook: "A Danube gate through older hills." },
  { id: "ro", name: "Romania", kind: "country", capital: "Bucharest", lat: 44.43, lon: 26.1, hook: "Carpathian arc around a basin, then the Danube delta." },
  { id: "bg", name: "Bulgaria", kind: "country", capital: "Sofia", lat: 42.7, lon: 23.32, hook: "A Balkan mountain and a Black Sea shelf." },
  { id: "hu", name: "Hungary", kind: "country", capital: "Budapest", lat: 47.5, lon: 19.04, hook: "A basin inside the Carpathians. Continental summers." },
  { id: "cz", name: "Czechia", kind: "country", capital: "Prague", lat: 50.08, lon: 14.44, hook: "A Hercynian upland, a Bohemian basin." },
  { id: "sk", name: "Slovakia", kind: "country", capital: "Bratislava", lat: 48.15, lon: 17.11, hook: "Western Carpathians and a Danube edge." },
  { id: "dk", name: "Denmark", kind: "country", capital: "Copenhagen", lat: 55.68, lon: 12.57, hook: "A moraine country. Ice wrote the hills." },
  { id: "ee", name: "Estonia", kind: "country", capital: "Tallinn", lat: 59.44, lon: 24.75, hook: "A low glacial shield coast on the Baltic." },
  { id: "lv", name: "Latvia", kind: "country", capital: "Riga", lat: 56.95, lon: 24.11, hook: "Moraine and a drowned glacial coast." },
  { id: "lt", name: "Lithuania", kind: "country", capital: "Vilnius", lat: 54.69, lon: 25.28, hook: "A glacial plain between two seas of influence." },
  { id: "by", name: "Belarus", kind: "country", capital: "Minsk", lat: 53.9, lon: 27.57, hook: "A moraine and peat interior." },
  { id: "md", name: "Moldova", kind: "country", capital: "Chișinău", lat: 47.01, lon: 28.86, hook: "A loess and steppe slice of the Black Sea hinterland." },
  { id: "ge", name: "Georgia", kind: "country", capital: "Tbilisi", lat: 41.72, lon: 44.79, hook: "Greater Caucasus collision wall, a humid west." },
  { id: "am", name: "Armenia", kind: "country", capital: "Yerevan", lat: 40.18, lon: 44.51, hook: "A volcanic high in a closed basin." },
  { id: "az", name: "Azerbaijan", kind: "country", capital: "Baku", lat: 40.41, lon: 49.87, hook: "Caspian shore, a dry east, a colliding west." },

  { id: "uk-eng", name: "England", kind: "uk-nation", capital: "London", lat: 51.51, lon: -0.13, hook: "Chalk downs, a drowned North Sea, and a till coast at Holderness.", geo: ["Chalk downs in the south, a drowned North Sea to the east, and a till coast at Holderness.", "Ice left till that the sea now cuts. Spurn Head is the longshore spit of that story.", "London is on a drowned Thames, not a highland capital."], labs: [{ slug: "coasts", label: "Coasts" }, { slug: "glaciers", label: "Glacial landforms" }], alias: ["Holderness"] },
  { id: "uk-sct", name: "Scotland", kind: "uk-nation", capital: "Edinburgh", lat: 55.95, lon: -3.19, hook: "Caledonian mountains, glens as U-troughs, a wet west.", geo: ["Caledonian mountains, glens as glacial U-troughs, a wet Atlantic west.", "Ice, not rivers, cut the troughs. Rift of Glen More is a different story.", "Edinburgh sits on a drier east, on old volcanic rock."], labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "contours", label: "Contours" }] },
  { id: "uk-wls", name: "Wales", kind: "uk-nation", capital: "Cardiff", lat: 51.48, lon: -3.18, hook: "Uplands of old rock, a wet west, and a coalfield coast.", geo: ["Uplands of old rock, a wet west, Snowdonia as the ice classroom.", "Cardiff is on a coalfield coast, not in the mountains.", "Contours and U-troughs are the physical map."], labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "contours", label: "Contours" }] },
  { id: "uk-nir", name: "Northern Ireland", kind: "uk-nation", capital: "Belfast", lat: 54.6, lon: -5.93, hook: "Basalt steps of the Giant’s Causeway; a glacial drumlin belt.", labs: [{ slug: "volcanoes", label: "Volcanoes" }, { slug: "glaciers", label: "Glacial landforms" }] },
  { id: "uk-nyk", name: "North Yorkshire", kind: "uk-county", capital: "Northallerton", lat: 54.34, lon: -1.43, hook: "Moors, a limestone edge, and a till coast that becomes Holderness." },
  { id: "uk-cma", name: "Cumbria", kind: "uk-county", capital: "Carlisle", lat: 54.89, lon: -2.94, hook: "The Lake District: cirques, arêtes, radial drainage.", alias: ["Lake District"] },
  { id: "uk-dwn", name: "Devon", kind: "uk-county", capital: "Exeter", lat: 50.72, lon: -3.53, hook: "Jurassic Coast begins here: a tilted textbook of rock time.", alias: ["Jurassic Coast"] },
  { id: "uk-dor", name: "Dorset", kind: "uk-county", capital: "Dorchester", lat: 50.72, lon: -2.44, hook: "Lulworth folds, Chesil Beach, a stack-and-arch coast.", alias: ["Jurassic Coast", "Lulworth"] },
  { id: "uk-gwn", name: "Gwynedd", kind: "uk-county", capital: "Caernarfon", lat: 53.14, lon: -4.27, hook: "Eryri / Snowdonia: a classroom of contours and ice.", alias: ["Snowdonia", "Eryri"] },
  { id: "uk-som", name: "Somerset", kind: "uk-county", capital: "Taunton", lat: 51.02, lon: -3.1, hook: "Levels as a floodplain bargain; hydrographs that sit for weeks." },
  { id: "uk-kent", name: "Kent", kind: "uk-county", capital: "Maidstone", lat: 51.27, lon: 0.52, hook: "Chalk cliffs, a drowned Thames mouth, a narrow sea." },
  { id: "uk-nbl", name: "Northumberland", kind: "uk-county", capital: "Morpeth", lat: 55.17, lon: -1.69, hook: "A till and Whin Sill coast; a Cheviot upland." },
  { id: "uk-hld", name: "Highland", kind: "uk-county", capital: "Inverness", lat: 57.48, lon: -4.23, hook: "Rift of Glen More, ice-cut lochs, a wet Atlantic wall." },
  { id: "uk-ery", name: "East Riding of Yorkshire", kind: "uk-county", capital: "Beverley", lat: 53.84, lon: -0.43, hook: "Holderness till cliffs and the Spurn spit.", alias: ["Holderness", "Spurn"] },
  { id: "uk-holderness", name: "Holderness", kind: "uk-place", capital: "—", lat: 53.73, lon: -0.05, hook: "Glacial till cliffs, southward longshore drift, Spurn Head spit.", geo: ["Holderness is a coast of glacial till — boulder clay — not chalk. Waves undercut a soft cliff.", "Longshore drift carries sediment south. Spurn Head is the free-end spit of that conveyor.", "This is the GCSE coasts case, not a fjord and not a coral island."], labs: [{ slug: "coasts", label: "Coasts" }, { slug: "glaciers", label: "Glacial landforms" }], alias: ["Spurn", "Spurn Head", "East Riding"] },
  { id: "uk-lakes", name: "Lake District", kind: "uk-place", capital: "Keswick", lat: 54.45, lon: -3.08, hook: "Cirques, arêtes, radial drainage from a glaciated dome.", geo: ["A glaciated dome: cirques, arêtes, and radial drainage from a central high.", "Ice cut U-troughs now holding lakes. Rivers did not invent those walls.", "Keswick sits in a trough, not on a horn."], labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "contours", label: "Contours" }], alias: ["Cumbria", "Helvellyn"] },
  { id: "uk-snowdonia", name: "Snowdonia", kind: "uk-place", capital: "—", lat: 53.07, lon: -4.08, hook: "Eryri: contours, ice, and a classroom mountain.", geo: ["Eryri / Snowdonia is a classroom of contours and ice. Cirques bite a ridge; a U-trough is the valley.", "Yr Wyddfa is not a volcano. Old rock, then ice.", "OS grid on these slopes is a skills lab, not a flag."], labs: [{ slug: "glaciers", label: "Glacial landforms" }, { slug: "contours", label: "Contours" }, { slug: "grid-references", label: "Grid references" }], alias: ["Eryri", "Yr Wyddfa", "Snowdon"] },
  { id: "uk-jurassic", name: "Jurassic Coast", kind: "uk-place", capital: "—", lat: 50.62, lon: -2.25, hook: "A tilted textbook of rock time: Lulworth folds, stacks, Chesil.", geo: ["A tilted sequence of sedimentary rock from east Devon through Dorset. Time you can walk.", "Lulworth Cove is differential erosion of a fold. Durdle Door is an arch in the same limestone.", "Chesil is a tombolo-like barrier of graded pebbles, not a spit of till."], labs: [{ slug: "coasts", label: "Coasts" }, { slug: "folds-faults", label: "Folds and faults" }, { slug: "geologic-time", label: "Geologic time" }], alias: ["Lulworth", "Durdle Door", "Chesil"] },

  { id: "us-al", name: "Alabama", kind: "us-state", capital: "Montgomery", lat: 32.38, lon: -86.3, hook: "A coastal plain rising to Appalachian remnants." },
  { id: "us-ak", name: "Alaska", kind: "us-state", capital: "Juneau", lat: 58.3, lon: -134.42, hook: "Subduction, ice, and a Pacific plate edge.", geo: ["Alaska is a subduction and collision edge with ice on the high ground.", "The Aleutian arc is a volcanic chain above a trench. Interior ice fields are glaciers, not a Florida story.", "Juneau sits on a drowned glacial coast. Earthquakes and volcanoes are the plate conversation."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "glaciers", label: "Glacial landforms" }, { slug: "volcanoes", label: "Volcanoes" }] },
  { id: "us-az", name: "Arizona", kind: "us-state", capital: "Phoenix", lat: 33.45, lon: -112.07, hook: "A desert basin, an urban heat island, a plateau canyon to the north.", labs: [{ slug: "river-erosion", label: "River erosion" }, { slug: "climate-types", label: "Climate types" }] },
  { id: "us-ar", name: "Arkansas", kind: "us-state", capital: "Little Rock", lat: 34.75, lon: -92.29, hook: "Interior highlands to a Mississippi alluvial plain." },
  { id: "us-ca", name: "California", kind: "us-state", capital: "Sacramento", lat: 38.58, lon: -121.49, hook: "Transform plus subduction plus a rain-shadow desert. San Andreas is a right-lateral transform, not a volcanic arc.", geo: ["California is transform plus a leftover of subduction plus a rain-shadow desert.", "The San Andreas Fault is a right-lateral transform: plates slide past. It is not a volcanic arc and not a hotspot.", "Cascadia-style subduction is to the north. The Sierra wrings the west wind; Death Valley is the lee."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "earthquakes", label: "Earthquakes" }, { slug: "folds-faults", label: "Folds and faults" }], alias: ["San Andreas", "San Francisco"] },
  { id: "us-co", name: "Colorado", kind: "us-state", capital: "Denver", lat: 39.74, lon: -104.99, hook: "A mile-high step onto the Great Plains from the Rockies." },
  { id: "us-ct", name: "Connecticut", kind: "us-state", capital: "Hartford", lat: 41.76, lon: -72.67, hook: "A glaciated New England upland to a drowned coast." },
  { id: "us-de", name: "Delaware", kind: "us-state", capital: "Dover", lat: 39.16, lon: -75.52, hook: "A coastal-plain sliver on the Mid-Atlantic bight." },
  { id: "us-dc", name: "District of Columbia", kind: "us-state", capital: "Washington, D.C.", lat: 38.91, lon: -77.04, hook: "A fall-line city on the Potomac. Coastal-plain / piedmont hinge, not a glacial trough.", geo: ["Washington, D.C. sits on a fall-line hinge between piedmont rock and coastal-plain sediment.", "The Potomac is a drowned river approaching Chesapeake. This is not a glacial trough.", "A capital on a river terrace, not a mountain or a hotspot."], labs: [{ slug: "rivers", label: "Rivers" }, { slug: "coasts", label: "Coasts" }], alias: ["Washington", "Washington DC", "D.C.", "DC"] },
  { id: "us-fl", name: "Florida", kind: "us-state", capital: "Tallahassee", lat: 30.44, lon: -84.28, hook: "A carbonate platform and a hurricane fetch. Not a glacial trough — ice never carved this peninsula.", geo: ["Florida is a carbonate platform — limestone and sand — with a hurricane fetch from the Atlantic and Gulf.", "It is not a glacial trough. Ice sheets did not cut Yosemite-style walls here. Karst and sinkholes are the inland story.", "Tallahassee is on the north of the peninsula. Storm surge, not ice, is the coastal hazard."], labs: [{ slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "karst", label: "Karst" }, { slug: "storm-surge", label: "Storm surge" }] },
  { id: "us-ga", name: "Georgia", kind: "us-state", capital: "Atlanta", lat: 33.75, lon: -84.39, hook: "Piedmont to coastal plain; a classic fall-line city." },
  { id: "us-hi", name: "Hawaiʻi", kind: "us-state", capital: "Honolulu", lat: 21.31, lon: -157.86, hook: "A hotspot track. Islands age northwest. Not a subduction arc.", geo: ["Hawaiʻi is a hotspot track through the Pacific plate. The plume stays; the plate moves northwest.", "Islands age away from the active volcanoes. Kauaʻi is older than the Big Island. This is not a subduction arc and not a mid-ocean ridge.", "Shield volcanoes of runny basalt, not steep stratovolcanoes. Honolulu sits on Oʻahu, a mid-chain island."], labs: [{ slug: "hotspots", label: "Hotspots" }, { slug: "volcanoes", label: "Volcanoes" }], alias: ["Hawaiʻi", "Big Island"] },
  { id: "us-id", name: "Idaho", kind: "us-state", capital: "Boise", lat: 43.62, lon: -116.2, hook: "Snake River Plain is a hotspot track on land.", labs: [{ slug: "hotspots", label: "Hotspots" }] },
  { id: "us-il", name: "Illinois", kind: "us-state", capital: "Springfield", lat: 39.78, lon: -89.65, hook: "A glaciated prairie. Mollisol country." },
  { id: "us-in", name: "Indiana", kind: "us-state", capital: "Indianapolis", lat: 39.77, lon: -86.16, hook: "Till plain, a glacial story under farms." },
  { id: "us-ia", name: "Iowa", kind: "us-state", capital: "Des Moines", lat: 41.59, lon: -93.62, hook: "Loess and mollisol. The Dust Bowl’s wetter neighbour." },
  { id: "us-ks", name: "Kansas", kind: "us-state", capital: "Topeka", lat: 39.05, lon: -95.68, hook: "Great Plains. Wind, wheat, and a rain gradient west to dry." },
  { id: "us-ky", name: "Kentucky", kind: "us-state", capital: "Frankfort", lat: 38.2, lon: -84.87, hook: "Karst plateaus and a Mammoth Cave cousin.", labs: [{ slug: "karst", label: "Karst" }] },
  { id: "us-la", name: "Louisiana", kind: "us-state", capital: "Baton Rouge", lat: 30.45, lon: -91.19, hook: "Mississippi delta and a hurricane coast. Land-building vs subsidence.", labs: [{ slug: "rivers", label: "Rivers" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }, { slug: "storm-surge", label: "Storm surge" }] },
  { id: "us-me", name: "Maine", kind: "us-state", capital: "Augusta", lat: 44.31, lon: -69.78, hook: "A drowned glacial coast of granite and spruce." },
  { id: "us-md", name: "Maryland", kind: "us-state", capital: "Annapolis", lat: 38.98, lon: -76.49, hook: "A ria coast — Chesapeake as a drowned river." },
  { id: "us-ma", name: "Massachusetts", kind: "us-state", capital: "Boston", lat: 42.36, lon: -71.06, hook: "Glacial till, a cape of sand, a drowned New England shore." },
  { id: "us-mi", name: "Michigan", kind: "us-state", capital: "Lansing", lat: 42.73, lon: -84.56, hook: "A glacial lake state. Moraines as the backbone." },
  { id: "us-mn", name: "Minnesota", kind: "us-state", capital: "Saint Paul", lat: 44.95, lon: -93.09, hook: "Ice-scoured lakes on a shield edge." },
  { id: "us-ms", name: "Mississippi", kind: "us-state", capital: "Jackson", lat: 32.3, lon: -90.18, hook: "Alluvial plain of the big river. Loess bluffs on the edge." },
  { id: "us-mo", name: "Missouri", kind: "us-state", capital: "Jefferson City", lat: 38.58, lon: -92.17, hook: "Ozark plateau, a Mississippi confluence, a tornado alley edge." },
  { id: "us-mt", name: "Montana", kind: "us-state", capital: "Helena", lat: 46.59, lon: -112.02, hook: "Northern Rockies to a high plains rain-shadow." },
  { id: "us-ne", name: "Nebraska", kind: "us-state", capital: "Lincoln", lat: 40.81, lon: -96.7, hook: "Loess and sandhills. A Great Plains hydrograph." },
  { id: "us-nv", name: "Nevada", kind: "us-state", capital: "Carson City", lat: 39.16, lon: -119.77, hook: "Basin and Range. Interior drainage, a rain-shadow desert." },
  { id: "us-nh", name: "New Hampshire", kind: "us-state", capital: "Concord", lat: 43.21, lon: -71.54, hook: "Glaciated granite upland. A White Mountain horn-and-trough story." },
  { id: "us-nj", name: "New Jersey", kind: "us-state", capital: "Trenton", lat: 40.22, lon: -74.76, hook: "A barrier coast and a piedmont. Sandy is the exam storm." },
  { id: "us-nm", name: "New Mexico", kind: "us-state", capital: "Santa Fe", lat: 35.69, lon: -105.94, hook: "A high dry plateau, a rift, a desert river." },
  { id: "us-ny", name: "New York", kind: "us-state", capital: "Albany", lat: 42.65, lon: -73.76, hook: "A glaciated through-valley to a drowned harbour." },
  { id: "us-nc", name: "North Carolina", kind: "us-state", capital: "Raleigh", lat: 35.78, lon: -78.64, hook: "Outer Banks barriers; longshore drift as a state fact.", labs: [{ slug: "coasts", label: "Coasts" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }] },
  { id: "us-nd", name: "North Dakota", kind: "us-state", capital: "Bismarck", lat: 46.81, lon: -100.78, hook: "Prairie potholes, a glacial lake plain." },
  { id: "us-oh", name: "Ohio", kind: "us-state", capital: "Columbus", lat: 39.96, lon: -83.0, hook: "Till plains to a lake-effect shore." },
  { id: "us-ok", name: "Oklahoma", kind: "us-state", capital: "Oklahoma City", lat: 35.47, lon: -97.52, hook: "Dust Bowl ground zero. Wind plus drought plus a broken A horizon.", labs: [{ slug: "soil-erosion", label: "Soil erosion" }, { slug: "aeolian", label: "Wind landforms" }] },
  { id: "us-or", name: "Oregon", kind: "us-state", capital: "Salem", lat: 44.94, lon: -123.03, hook: "Cascadia subduction, a wet west, a dry east.", labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "volcanoes", label: "Volcanoes" }, { slug: "rain-shadow", label: "Rain shadow" }] },
  { id: "us-pa", name: "Pennsylvania", kind: "us-state", capital: "Harrisburg", lat: 40.27, lon: -76.88, hook: "Folded Appalachian strata form parallel ridges and valleys; rock resistance and erosion control the relief.", labs: [{ slug: "folds-faults", label: "Folds and faults" }] },
  { id: "us-ri", name: "Rhode Island", kind: "us-state", capital: "Providence", lat: 41.82, lon: -71.41, hook: "A drowned glacial coast in miniature." },
  { id: "us-sc", name: "South Carolina", kind: "us-state", capital: "Columbia", lat: 34.0, lon: -81.03, hook: "A coastal plain and a hurricane fetch." },
  { id: "us-sd", name: "South Dakota", kind: "us-state", capital: "Pierre", lat: 44.37, lon: -100.35, hook: "Badlands, a glaciated east, a dry west." },
  { id: "us-tn", name: "Tennessee", kind: "us-state", capital: "Nashville", lat: 36.16, lon: -86.78, hook: "A folded valley-and-ridge, then a plateau, then a plain." },
  { id: "us-tx", name: "Texas", kind: "us-state", capital: "Austin", lat: 30.27, lon: -97.74, hook: "A Gulf coast, an Edwards karst, a High Plains dry line.", labs: [{ slug: "karst", label: "Karst" }, { slug: "tropical-cyclone", label: "Tropical cyclone" }] },
  { id: "us-ut", name: "Utah", kind: "us-state", capital: "Salt Lake City", lat: 40.76, lon: -111.89, hook: "A closed basin, a salt lake, basin-and-range." },
  { id: "us-vt", name: "Vermont", kind: "us-state", capital: "Montpelier", lat: 44.26, lon: -72.58, hook: "A glaciated green ridge. U-troughs in miniature." },
  { id: "us-va", name: "Virginia", kind: "us-state", capital: "Richmond", lat: 37.54, lon: -77.44, hook: "A fall line city; Blue Ridge to a drowned Chesapeake." },
  { id: "us-wa", name: "Washington", kind: "us-state", capital: "Olympia", lat: 47.04, lon: -122.9, hook: "Cascadia subduction, a wet Olympic rainforest, a dry interior. Not the San Andreas.", geo: ["Washington State is Cascadia: the Juan de Fuca plate dives under North America. That is subduction, not the San Andreas transform.", "A wet Olympic west, a volcanic Cascade arc, a dry Columbia interior in rain-shadow.", "Olympia sits on a drowned glacial sound. Ice cut the troughs; the plate writes the volcanoes."], labs: [{ slug: "plate-boundaries", label: "Plate boundaries" }, { slug: "volcanoes", label: "Volcanoes" }, { slug: "rain-shadow", label: "Rain shadow" }] },
  { id: "us-wv", name: "West Virginia", kind: "us-state", capital: "Charleston", lat: 38.35, lon: -81.63, hook: "Dissected plateau. Deep V-valleys in old rock." },
  { id: "us-wi", name: "Wisconsin", kind: "us-state", capital: "Madison", lat: 43.07, lon: -89.4, hook: "A drumlin and moraine state. Ice as the cartographer." },
  { id: "us-wy", name: "Wyoming", kind: "us-state", capital: "Cheyenne", lat: 41.14, lon: -104.82, hook: "A high dry plateau. Yellowstone is a continental hotspot, not a plate boundary.", geo: ["A high dry plateau and ranges. Yellowstone is a continental hotspot: the plume stays, the plate moves.", "It is not a mid-ocean ridge and not the San Andreas. Caldera plus a track of older volcanic centres to the south-west.", "Cheyenne sits on the high plains, not in the caldera."], labs: [{ slug: "hotspots", label: "Hotspots" }, { slug: "volcanoes", label: "Volcanoes" }] },
];

export const ATLAS_BY_ID: Record<string, AtlasPlace> = Object.fromEntries(ATLAS.map((p) => [p.id, p]));

const KIND_LABEL: Record<AtlasKind, string> = {
  country: "country",
  city: "city",
  "uk-nation": "UK nation",
  "uk-county": "UK county",
  "uk-place": "UK teaching place",
  "us-state": "US state",
};

export function atlasKindLabel(kind: AtlasKind): string {
  return KIND_LABEL[kind];
}

export function atlasSearchText(p: AtlasPlace): string {
  return `${p.name} ${p.capital} ${p.hook} ${(p.alias ?? []).join(" ")} ${(p.geo ?? []).join(" ")}`.toLowerCase();
}

export function atlasGeo(p: AtlasPlace): string[] {
  if (p.geo?.length) return p.geo.slice(0, 3);
  return [p.hook];
}

export function atlasLabs(p: AtlasPlace): AtlasLabLink[] {
  if (p.labs?.length) return p.labs.slice(0, 3);
  const blob = `${p.name} ${p.hook} ${(p.geo ?? []).join(" ")}`.toLowerCase();
  const out: AtlasLabLink[] = [];
  const add = (slug: string, label: string) => {
    if (!out.some((x) => x.slug === slug)) out.push({ slug, label });
  };
  if (/volcan|arc |ring of/.test(blob)) add("volcanoes", "Volcanoes");
  if (/earthquake|fault|subduct/.test(blob)) add("earthquakes", "Earthquakes");
  if (/plate|ridge|trench|transform|rift|hotspot/.test(blob)) add("plate-boundaries", "Plate boundaries");
  if (/hotspot/.test(blob)) add("hotspots", "Hotspots");
  if (/glaci|ice |fjord|cirque|u-trough|drumlin|till/.test(blob)) add("glaciers", "Glacial landforms");
  if (/coast|spit|cliff|longshore|barrier|fjord/.test(blob)) add("coasts", "Coasts");
  if (/hurricane|cyclone|typhoon|storm surge/.test(blob)) add("tropical-cyclone", "Tropical cyclone");
  if (/karst|limestone|cave|sinkhole/.test(blob)) add("karst", "Karst");
  if (/river|delta|nile|amazon|meander|flood/.test(blob)) add("rivers", "Rivers");
  if (/monsoon|itcz|climate|desert|rain-shadow|rain shadow/.test(blob)) add("climate-types", "Climate types");
  if (/soil|loess|mollisol/.test(blob)) add("soil-profile", "Soil profile");
  if (/fold|anticline|syncline/.test(blob)) add("folds-faults", "Folds and faults");
  return out.slice(0, 3);
}

export function nearestAtlasPlace(lat: number, lon: number, maxDeg = 12): AtlasPlace | null {
  let best: AtlasPlace | null = null;
  let d0 = maxDeg * maxDeg;
  const cos = Math.cos((lat * Math.PI) / 180) ** 2;
  for (const p of ATLAS) {
    const d = (p.lat - lat) ** 2 + (((p.lon - lon + 540) % 360) - 180) ** 2 * cos;
    if (d < d0) {
      d0 = d;
      best = p;
    }
  }
  return best;
}

export type ClimateFamily = "A" | "B" | "C" | "D" | "E";
export type TectonicSetting = "divergent" | "convergent" | "transform" | "hotspot" | "intraplate";

/** Climate at the named locator, not a uniform classification of its country. */
export function atlasClimateDetail(p:AtlasPlace) {
  return (CLIMATE_DATA.places as Record<string,{code:string|null;family:string|null;coastalOffsetKm:number;sampleLat:number;sampleLon:number}>)[p.id];
}
export function atlasClimate(p:AtlasPlace):ClimateFamily | 'unknown' {
  return atlasClimateDetail(p)?.family as ClimateFamily ?? 'unknown';
}
const CONTEXTS:Partial<Record<TectonicSetting,string[]>>={
  divergent:'is ke et tz us-nm us-nv us-ut'.split(' '),
  convergent:'it gr tr fr ch at hr ba ro ge am az ir pk in np bt cn tw jp id ph nz pg to ws mx cl pe co ec ve pa cr ca us us-ak us-or us-wa'.split(' '),
  transform:'tr nz ht cu jm us us-ca mx'.split(' '),
  hotspot:'is us us-hi us-wy ec'.split(' '),
};
/** Named regional teaching contexts; several can coexist in one country. */
export function atlasTectonics(p:AtlasPlace):TectonicSetting[] {
  const settings=(Object.entries(CONTEXTS) as [TectonicSetting,string[]][]).filter(([,ids])=>ids.includes(p.id)).map(([kind])=>kind);
  return settings.length?settings:['intraplate'];
}
export function atlasTectonic(p:AtlasPlace):TectonicSetting {return atlasTectonics(p)[0];}

/** Explicit place-to-observation mapping; never substitute another country's landscape. */
export function atlasPhoto(p: AtlasPlace) {
  const id = (ATLAS_PHOTOS as Record<string, string>)[p.id];
  return id ? VERIFIED_PHOTOS[id] : undefined;
}

export const CLIMATE_LABEL: Record<ClimateFamily | "unknown", string> = {
  unknown: "Unclassified",
  A: "A tropical",
  B: "B dry",
  C: "C temperate",
  D: "D continental",
  E: "E polar",
};

export const TECTONIC_LABEL: Record<TectonicSetting, string> = {
  divergent: "Divergent",
  convergent: "Convergent",
  transform: "Transform",
  hotspot: "Hotspot",
  intraplate: "Intraplate",
};

