type Geom = {
  type: "LineString" | "Point" | "Polygon";
  coordinates: number[] | number[][] | number[][][];
};
type Feat = {
  type: "Feature";
  properties: Record<string, string>;
  geometry: Geom;
};
export type OverlayFC = { type: "FeatureCollection"; features: Feat[] };

function line(name: string, kind: string, note: string, coordinates: number[][]): Feat {
  return {
    type: "Feature",
    properties: { name, kind, note, title: name },
    geometry: { type: "LineString", coordinates },
  };
}
function point(
  name: string,
  kind: string,
  note: string,
  lon: number,
  lat: number,
  extra: Record<string, string> = {},
): Feat {
  return {
    type: "Feature",
    properties: { name, kind, note, title: name, ...extra },
    geometry: { type: "Point", coordinates: [lon, lat] },
  };
}

export const RIVERS: OverlayFC = {
  type: "FeatureCollection",
  features: [
    line(
      "Amazon",
      "river",
      "The Amazon carries the world’s largest river discharge and drains an extensive tropical basin.",
      [
        [-73, -4],
        [-70, -4],
        [-60, -3],
        [-55, -2],
        [-50, -1.5],
        [-49, 0],
      ],
    ),
    line(
      "Nile",
      "river",
      "Rainfall in tropical headwaters supplies the Nile as it flows north through arid regions.",
      [
        [32.5, 15],
        [32.5, 22],
        [31.8, 26],
        [31.2, 30],
      ],
    ),
    line(
      "Mississippi",
      "river",
      "The Mississippi drains much of the continental interior into a subsiding delta; levees influence how water and sediment reach the floodplain.",
      [
        [-93, 45],
        [-91, 38],
        [-90, 35],
        [-91, 30],
        [-89.2, 29.2],
      ],
    ),
    line(
      "Yangtze",
      "river",
      "The Yangtze carries water and sediment from the Tibetan Plateau across monsoon-influenced regions to its coastal delta.",
      [
        [100, 28],
        [105, 30],
        [112, 30.5],
        [118, 32],
        [121, 31.3],
      ],
    ),
    line(
      "Congo",
      "river",
      "The Congo drains an equatorial rainforest basin that stores and transfers large quantities of water and carbon.",
      [
        [25, 0],
        [18, -2],
        [16, -4],
        [12.5, -6],
      ],
    ),
    line(
      "Danube",
      "river",
      "The Danube collects water from central and southeastern Europe before reaching its delta on the Black Sea.",
      [
        [10, 48.2],
        [16.4, 48.2],
        [20, 47],
        [26, 44.2],
        [29.6, 45.2],
      ],
    ),
    line(
      "Ganges–Brahmaputra",
      "river",
      "The Ganges and Brahmaputra carry sediment from the Himalaya to a large delta, with river flow strongly influenced by the monsoon.",
      [
        [78, 29],
        [82, 26],
        [88, 24],
        [90.5, 22],
      ],
    ),
    line(
      "Murray–Darling",
      "river",
      "The Murray–Darling river system crosses dry parts of Australia, where drought strongly affects discharge.",
      [
        [147, -36],
        [144, -35],
        [141, -34],
        [139, -35.5],
      ],
    ),
    line(
      "Rhine",
      "river",
      "The Rhine flows from the Alps toward the North Sea, linking mountain runoff with managed floodplains and delta channels.",
      [
        [8, 46.6],
        [7.6, 48],
        [8.4, 50],
        [6.1, 52],
        [4.2, 51.9],
      ],
    ),
    line(
      "Colorado",
      "river",
      "The Colorado River crosses arid plateaus and has cut deep canyons through their rock layers.",
      [
        [-111.5, 40],
        [-111.6, 36.9],
        [-114.7, 36],
        [-114.6, 32.7],
      ],
    ),
    line(
      "Thames",
      "river",
      "The Thames enters a tidal estuary, where rising sea level and tidal processes have shaped its mouth.",
      [
        [-0.6, 51.4],
        [0.1, 51.48],
        [0.7, 51.45],
      ],
    ),
    line(
      "Mekong",
      "river",
      "Seasonal monsoon rainfall drives a flood pulse that transports water and sediment through the Mekong delta.",
      [
        [100, 20],
        [104, 16],
        [105, 12],
        [106.5, 10],
      ],
    ),
    line(
      "Indus",
      "river",
      "The Indus flows from high mountain headwaters into arid lowlands, where irrigation alters the downstream flow.",
      [
        [75, 35],
        [73, 32],
        [70, 28],
        [67.5, 24],
      ],
    ),
    line(
      "Volga",
      "river",
      "The Volga drains part of the continental interior into the Caspian Sea, which has no outlet to the ocean.",
      [
        [37, 56],
        [44, 52],
        [48, 48],
        [49, 46],
      ],
    ),
    line(
      "Mackenzie",
      "river",
      "The Mackenzie flows north toward the Arctic Ocean, and seasonal freezing and thawing influence its flow.",
      [
        [-125, 60],
        [-128, 64],
        [-134, 68],
        [-135, 69],
      ],
    ),
    line(
      "Orinoco",
      "river",
      "The Orinoco drains tropical landscapes east of the Andes before reaching the Atlantic Ocean.",
      [
        [-70, 5],
        [-66, 7],
        [-62, 8],
        [-60, 9],
      ],
    ),
    line(
      "Yellow River",
      "river",
      "The Yellow River carries sediment from the Loess Plateau; deposition has raised parts of its lower channel above the surrounding floodplain.",
      [
        [110, 35],
        [114, 35],
        [118, 37.7],
      ],
    ),
  ],
};

export const SETTLEMENTS: OverlayFC = {
  type: "FeatureCollection",
  features: (
    [
      [
        "London",
        51.51,
        -0.13,
        "capital",
        "London stands beside the Thames estuary in southeast England, where maritime influences shape the climate.",
      ],
      [
        "Paris",
        48.86,
        2.35,
        "capital",
        "Paris lies inland within a temperate region influenced by weather systems arriving from the Atlantic.",
      ],
      [
        "Berlin",
        52.52,
        13.41,
        "capital",
        "Berlin lies on the North European Plain, where past ice sheets left deposits and shaped the terrain.",
      ],
      [
        "Rome",
        41.9,
        12.5,
        "capital",
        "Rome lies on Italy’s western side, in a region with a history of volcanic and tectonic activity.",
      ],
      ["Cairo", 30.04, 31.24, "capital", "The Nile supplies water to an otherwise arid landscape."],
      [
        "Nairobi",
        -1.29,
        36.82,
        "capital",
        "Nairobi lies near the equator at high elevation, close to the East African Rift; shifting tropical circulation influences its rainfall seasons.",
      ],
      [
        "Cape Town",
        -33.92,
        18.42,
        "city",
        "Cape Town receives much of its rainfall in winter and lies near the cold Benguela Current.",
      ],
      [
        "Lagos",
        6.45,
        3.4,
        "city",
        "Lagos has a tropical coastal climate with rainfall influenced by the seasonal movement of tropical circulation.",
      ],
      [
        "New York",
        40.71,
        -74.01,
        "city",
        "New York stands beside a harbor shaped by glaciation and rising sea level on North America’s Atlantic coast.",
      ],
      [
        "Washington, D.C.",
        38.91,
        -77.04,
        "capital",
        "Washington, D.C. lies near the transition from the Piedmont to the Atlantic Coastal Plain.",
      ],
      [
        "Mexico City",
        19.43,
        -99.13,
        "capital",
        "Mexico City occupies a high basin in a volcanic region, and its elevation affects local temperatures.",
      ],
      [
        "São Paulo",
        -23.55,
        -46.63,
        "city",
        "São Paulo lies on the Brazilian Highlands, well south of the Amazon basin.",
      ],
      [
        "Buenos Aires",
        -34.6,
        -58.38,
        "capital",
        "Buenos Aires lies beside the Río de la Plata and the humid lowlands of the Pampas.",
      ],
      [
        "Lima",
        -12.05,
        -77.04,
        "capital",
        "Lima occupies an arid coast beside the cold Humboldt Current.",
      ],
      [
        "Tokyo",
        35.68,
        139.69,
        "capital",
        "Tokyo lies in Japan’s tectonically active region, where converging plates are associated with earthquakes and volcanic arcs.",
      ],
      [
        "Beijing",
        39.9,
        116.4,
        "capital",
        "Beijing lies in northern China, where summer monsoon rainfall contrasts with a drier winter.",
      ],
      [
        "New Delhi",
        28.61,
        77.21,
        "capital",
        "New Delhi lies south of the Himalaya, the mountain belt formed by the collision of India with Eurasia.",
      ],
      [
        "Jakarta",
        -6.21,
        106.85,
        "capital",
        "Jakarta lies on Java within Indonesia’s warm tropical island region.",
      ],
      [
        "Sydney",
        -33.87,
        151.21,
        "city",
        "Sydney lies on Australia’s temperate east coast, where the ocean influences local weather.",
      ],
      [
        "Canberra",
        -35.28,
        149.13,
        "capital",
        "Canberra lies inland from Australia’s southeast coast, with a greater seasonal temperature range than nearby coastal locations.",
      ],
      [
        "Wellington",
        -41.29,
        174.78,
        "capital",
        "Wellington lies near an active plate boundary and is exposed to strong winds around Cook Strait.",
      ],
      [
        "Reykjavík",
        64.15,
        -21.94,
        "capital",
        "Iceland straddles the Mid-Atlantic Ridge, where the North American and Eurasian plates move apart.",
      ],
      [
        "Kathmandu",
        27.72,
        85.32,
        "capital",
        "Kathmandu lies within the Himalayan region shaped by the continuing collision of India and Eurasia.",
      ],
      [
        "San Francisco",
        37.77,
        -122.42,
        "city",
        "San Francisco lies near the San Andreas transform system; its coastal setting also brings frequent fog.",
      ],
      [
        "Honolulu",
        21.31,
        -157.86,
        "city",
        "Honolulu lies on Oʻahu in the Hawaiian hotspot chain, whose main islands generally become older toward the northwest.",
      ],
      [
        "Moscow",
        55.76,
        37.62,
        "capital",
        "Moscow lies in the continental interior at a high latitude, where Mercator maps substantially enlarge apparent area.",
      ],
      [
        "Singapore",
        1.35,
        103.82,
        "city",
        "Singapore lies close to the equator and has little variation in day length through the year.",
      ],
      [
        "Mumbai",
        19.08,
        72.88,
        "city",
        "Mumbai lies on India’s west coast, where the summer monsoon brings heavy seasonal rainfall.",
      ],
    ] as const
  ).map(([name, lat, lon, rank, note]) => point(name, "settlement", note, lon, lat, { rank })),
};

export const KOPPEN: OverlayFC = {
  type: "FeatureCollection",
  features: [
    point(
      "Af rainforest",
      "koppen",
      "This Amazon example represents tropical rainforest climate, with warm conditions and rainfall throughout the year.",
      -60,
      -3,
      { letter: "A", color: "#2d8a4e" },
    ),
    point(
      "Aw savanna",
      "koppen",
      "The tropical savanna example near Abuja has a pronounced dry season.",
      7.5,
      9.1,
      { letter: "A", color: "#7C9A6A" },
    ),
    point(
      "BWh hot desert",
      "koppen",
      "This Sahara example represents the hot-desert climate within the Köppen dry-climate family.",
      10,
      23,
      {
        letter: "B",
        color: "#E8B86D",
      },
    ),
    point(
      "BWk cold desert",
      "koppen",
      "This central Asian example represents a cold-desert climate, where low precipitation combines with substantial seasonal temperature changes.",
      65,
      42,
      { letter: "B", color: "#c4a574" },
    ),
    point(
      "Cfb London",
      "koppen",
      "London represents a temperate climate with no defined dry season and a warm rather than hot summer.",
      0,
      51.5,
      {
        letter: "C",
        color: "#3EE0C6",
      },
    ),
    point(
      "Cfa humid subtropical",
      "koppen",
      "This southeastern United States example represents a humid subtropical climate with hot summers.",
      -85,
      32,
      { letter: "C", color: "#7FD4FF" },
    ),
    point(
      "Csa Mediterranean",
      "koppen",
      "This Mediterranean example has a dry summer and receives more of its rain in the cooler part of the year.",
      15,
      37,
      {
        letter: "C",
        color: "#E8B86D",
      },
    ),
    point(
      "Dfa continental",
      "koppen",
      "This continental-climate example combines hot summers with cold winters.",
      -95,
      45,
      { letter: "D", color: "#6aa0c8" },
    ),
    point(
      "Dfc subarctic",
      "koppen",
      "This subarctic example has a long cold winter and a short cool summer.",
      28,
      64,
      {
        letter: "D",
        color: "#4a6a88",
      },
    ),
    point(
      "ET tundra",
      "koppen",
      "This coastal Greenland example represents tundra climate, with summers too cool to support typical forest growth.",
      -50,
      70,
      { letter: "E", color: "#d5eaf4" },
    ),
    point(
      "EF ice cap",
      "koppen",
      "This ice-cap example has monthly mean temperatures below freezing throughout the year.",
      0,
      -80,
      {
        letter: "E",
        color: "#F4EFE6",
      },
    ),
  ],
};

export const SEARCH_POI: { name: string; lat: number; lon: number; zoom: number; note: string }[] =
  [
    {
      name: "Himalaya",
      lat: 28,
      lon: 86,
      zoom: 5,
      note: "The Himalaya rise where the Indian and Eurasian continental plates collide.",
    },
    {
      name: "Andes",
      lat: -20,
      lon: -70,
      zoom: 4,
      note: "The Andes rise above a subduction zone, with an ocean trench offshore and volcanoes along the mountain belt.",
    },
    {
      name: "Alps",
      lat: 46.5,
      lon: 10,
      zoom: 6,
      note: "The Alps preserve evidence of continental collision and valleys later reshaped by glaciers.",
    },
    {
      name: "Rockies",
      lat: 40,
      lon: -110,
      zoom: 4,
      note: "The Rocky Mountains form a high mountain belt in the continental interior of western North America.",
    },
    {
      name: "Tibetan Plateau",
      lat: 32,
      lon: 88,
      zoom: 4,
      note: "The Tibetan Plateau is a broad high region formed by crustal thickening during the collision of India and Eurasia.",
    },
    {
      name: "Mariana Trench",
      lat: 11.3,
      lon: 142.2,
      zoom: 5,
      note: "The Mariana Trench formed where one oceanic plate descends beneath another at a convergent boundary.",
    },
    {
      name: "Mid-Atlantic Ridge",
      lat: 30,
      lon: -40,
      zoom: 3,
      note: "New oceanic crust forms at the Mid-Atlantic Ridge as the plates move apart.",
    },
    {
      name: "East African Rift",
      lat: 0.5,
      lon: 36,
      zoom: 5,
      note: "The East African Rift is a region where continental crust is being stretched and pulled apart.",
    },
    {
      name: "Amazon",
      lat: -3,
      lon: -60,
      zoom: 4,
      note: "The Amazon carries the world’s largest river discharge and drains an extensive tropical basin.",
    },
    {
      name: "Nile",
      lat: 26,
      lon: 32,
      zoom: 5,
      note: "The Nile supplies water to an otherwise arid landscape.",
    },
    {
      name: "Mississippi",
      lat: 32,
      lon: -91,
      zoom: 5,
      note: "The Mississippi connects a large continental drainage basin with a subsiding coastal delta.",
    },
    {
      name: "San Andreas",
      lat: 36,
      lon: -120.5,
      zoom: 6,
      note: "The San Andreas is a right-lateral transform fault system, with mainly horizontal movement between its two sides.",
    },
    {
      name: "Iceland",
      lat: 65,
      lon: -19,
      zoom: 5,
      note: "Iceland straddles the Mid-Atlantic Ridge, where the North American and Eurasian plates move apart.",
    },
    {
      name: "Holderness",
      lat: 53.75,
      lon: -0.05,
      zoom: 8,
      note: "Waves erode the soft till cliffs of Holderness, and sediment transport supplies the spit at Spurn Point.",
    },
  ];

export const PLATE_LEGEND = [
  {
    kind: "divergent",
    color: "#3EE0C6",
    label: "Divergent",
    note: "Plates move apart at ridges and rifts; seafloor spreading produces new oceanic crust.",
  },
  {
    kind: "convergent",
    color: "#FF6A3D",
    label: "Convergent",
    note: "Plates converge, producing subduction zones or mountain belts where continents collide.",
  },
  {
    kind: "transform",
    color: "#E8B86D",
    label: "Transform",
    note: "Plates slide past one another along transform boundaries, where fault movement can generate earthquakes.",
  },
] as const;

export function plateColor(kind: string) {
  if (kind === "divergent") return "#3EE0C6";
  if (kind === "transform") return "#E8B86D";
  return "#FF6A3D";
}

export const VOLCANOES: OverlayFC = {
  type: "FeatureCollection",
  features: [
    point(
      "Fuji",
      "volcano",
      "Fuji is a steep-sided stratovolcano within Japan’s subduction-related volcanic region.",
      138.73,
      35.36,
    ),
    point(
      "St Helens",
      "volcano",
      "Mount St Helens belongs to the Cascade volcanic arc above the Cascadia subduction zone.",
      -122.19,
      46.2,
    ),
    point(
      "Vesuvius",
      "volcano",
      "Vesuvius is a stratovolcano in the tectonically active region around the Mediterranean.",
      14.43,
      40.82,
    ),
    point(
      "Etna",
      "volcano",
      "Etna is a basaltic stratovolcano in a complex tectonic setting near the African–Eurasian plate margin.",
      15.0,
      37.75,
    ),
    point(
      "Kīlauea",
      "volcano",
      "Kīlauea is a Hawaiian shield volcano whose fluid basaltic lava builds broad volcanic landforms.",
      -155.29,
      19.41,
    ),
    point(
      "Mauna Loa",
      "volcano",
      "Repeated basaltic lava flows have built the broad slopes of Mauna Loa’s shield volcano.",
      -155.61,
      19.48,
    ),
    point(
      "Eyjafjallajökull",
      "volcano",
      "Eyjafjallajökull is an ice-covered volcano in Iceland, where volcanism is associated with a spreading ridge and hotspot.",
      -19.62,
      63.63,
    ),
    point(
      "Nyiragongo",
      "volcano",
      "Nyiragongo lies in the East African Rift, where continental extension is associated with volcanic activity.",
      29.25,
      -1.52,
    ),
    point(
      "Krakatau",
      "volcano",
      "Krakatau belongs to the Sunda volcanic arc, which formed above a subduction zone.",
      105.42,
      -6.1,
    ),
    point(
      "Pinatubo",
      "volcano",
      "Pinatubo’s 1991 eruption released material into the stratosphere and temporarily affected global climate.",
      120.35,
      15.14,
    ),
    point(
      "Popocatépetl",
      "volcano",
      "Popocatépetl belongs to the volcanic belt of central Mexico, where volcanism is associated with subduction.",
      -98.63,
      19.02,
    ),
    point(
      "Cotopaxi",
      "volcano",
      "Cotopaxi is an Andean stratovolcano above the subduction zone along South America’s western margin.",
      -78.44,
      -0.68,
    ),
    point(
      "Ruapehu",
      "volcano",
      "Ruapehu lies in New Zealand’s Taupō Volcanic Zone, where volcanism is associated with subduction.",
      175.56,
      -39.28,
    ),
    point(
      "Bezymianny",
      "volcano",
      "Bezymianny belongs to the Kamchatka volcanic arc above the subducting Pacific plate.",
      160.59,
      55.98,
    ),
  ],
};

export const QUAKES: OverlayFC = {
  type: "FeatureCollection",
  features: [
    point(
      "San Francisco 1906",
      "quake",
      "The 1906 San Francisco earthquake involved horizontal movement along the San Andreas Fault.",
      -122.4,
      37.8,
    ),
    point(
      "Tohoku 2011",
      "quake",
      "The 2011 Tohoku earthquake ruptured the subduction boundary offshore Japan and generated a major tsunami.",
      142.4,
      38.3,
    ),
    point(
      "Sumatra 2004",
      "quake",
      "The 2004 Sumatra earthquake ruptured the Sunda megathrust and generated the Indian Ocean tsunami.",
      95.9,
      3.3,
    ),
    point(
      "Haiti 2010",
      "quake",
      "The 2010 Haiti earthquake occurred on faults within the boundary region between the Caribbean and North American plates.",
      -72.5,
      18.5,
    ),
    point(
      "Christchurch 2011",
      "quake",
      "Fault movement close to Christchurch caused damaging shaking in the city in 2011.",
      172.64,
      -43.53,
    ),
    point(
      "Kashmir 2005",
      "quake",
      "The 2005 Kashmir earthquake occurred within the mountain belt formed by the collision of India and Eurasia.",
      73.6,
      34.5,
    ),
    point(
      "Michoacán 1985",
      "quake",
      "The 1985 earthquake offshore Mexico caused strong shaking in Mexico City, where basin sediments amplified the motion.",
      -102.533,
      18.19,
    ),
    point(
      "Lisbon 1755",
      "quake",
      "The 1755 earthquake offshore Portugal generated a tsunami that affected Lisbon and other Atlantic coasts.",
      -10.0,
      36.5,
    ),
    point(
      "Anchorage 1964",
      "quake",
      "The 1964 Alaska earthquake ruptured a subduction boundary and is the largest instrumentally recorded earthquake in the United States.",
      -147.4,
      61.0,
    ),
    point(
      "İzmit 1999",
      "quake",
      "The 1999 İzmit earthquake ruptured part of the North Anatolian Fault in Türkiye.",
      30.0,
      40.7,
    ),
  ],
};

export const CURRENTS: OverlayFC = {
  type: "FeatureCollection",
  features: [
    line(
      "Gulf Stream",
      "current",
      "The Gulf Stream carries warm water northward along the western side of the North Atlantic.",
      [
        [-80, 25],
        [-76, 32],
        [-70, 38],
        [-50, 42],
        [-30, 50],
      ],
    ),
    line(
      "Kuroshio",
      "current",
      "The Kuroshio carries warm water northward past Japan along the western side of the North Pacific.",
      [
        [122, 22],
        [130, 28],
        [140, 35],
        [145, 40],
      ],
    ),
    line(
      "Humboldt",
      "current",
      "The cold Humboldt Current flows along western South America, beside the arid Atacama coast.",
      [
        [-72, -40],
        [-76, -20],
        [-80, -8],
        [-82, 0],
      ],
    ),
    line(
      "Canary",
      "current",
      "The Canary Current carries cool water southward along northwest Africa, where coastal upwelling is common.",
      [
        [-12, 42],
        [-16, 32],
        [-18, 22],
        [-18, 14],
      ],
    ),
    line(
      "Agulhas",
      "current",
      "The Agulhas Current carries warm water southward along Africa and turns back toward the Indian Ocean.",
      [
        [32, -28],
        [32, -34],
        [28, -38],
        [22, -40],
      ],
    ),
    line(
      "Antarctic Circumpolar",
      "current",
      "The Antarctic Circumpolar Current flows around Antarctica without being blocked by a continent.",
      [
        [-170, -56],
        [-90, -56],
        [-10, -56],
        [70, -56],
        [150, -56],
        [190, -56],
      ],
    ),
  ],
};

/** Short motion arrows at named plate edges — classroom schematic, not a GPS velocity field. */
export const PLATE_ARROWS: OverlayFC = {
  type: "FeatureCollection",
  features: [
    line(
      "Pacific → trench (Japan)",
      "arrow",
      "The Pacific plate moves toward the trench and subducts beneath the margin near Japan.",
      [
        [155, 34],
        [143, 35],
      ],
    ),
    line(
      "Nazca → Andes",
      "arrow",
      "The Nazca plate subducts beneath South America, contributing to the formation of the Andes.",
      [
        [-88, -20],
        [-76, -20],
      ],
    ),
    line(
      "Away from MAR",
      "arrow",
      "New oceanic crust moves away from the spreading axis of the Mid-Atlantic Ridge.",
      [
        [-28, 40],
        [-18, 40],
      ],
    ),
    line(
      "San Andreas slip",
      "arrow",
      "Along the San Andreas system, the Pacific side moves northwest relative to the North American side.",
      [
        [-119.5, 34.2],
        [-122.2, 37.2],
      ],
    ),
    line("India → Eurasia", "arrow", "The Indian plate continues to move northward into Eurasia.", [
      [80, 22],
      [82, 28],
    ]),
  ],
};

export const BASINS: OverlayFC = {
  type: "FeatureCollection",
  features: [
    line(
      "Amazon basin divide (schematic)",
      "basin",
      "The Amazon basin collects tropical rainfall and contains major stores of water and carbon.",
      [
        [-74, 5],
        [-60, 5],
        [-50, 2],
        [-50, -12],
        [-70, -12],
        [-74, 5],
      ],
    ),
    line(
      "Nile corridor",
      "basin",
      "Water from tropical headwaters supplies the Nile as it crosses arid regions to the Mediterranean.",
      [
        [30, 4],
        [33, 16],
        [32, 24],
        [31, 31],
      ],
    ),
    line(
      "Mississippi basin (schematic)",
      "basin",
      "The Mississippi connects a large continental drainage basin with a subsiding coastal delta.",
      [
        [-110, 48],
        [-82, 42],
        [-89, 29],
        [-95, 32],
        [-110, 48],
      ],
    ),
    line(
      "Yangtze corridor",
      "basin",
      "The Yangtze carries water and sediment from the Tibetan Plateau across monsoon-influenced regions to its coastal delta.",
      [
        [98, 28],
        [112, 31],
        [121, 31],
      ],
    ),
    line(
      "Ganges–Brahmaputra",
      "basin",
      "The Ganges and Brahmaputra carry sediment from the Himalaya to a large delta, with river flow strongly influenced by the monsoon.",
      [
        [78, 30],
        [88, 26],
        [91, 22],
      ],
    ),
    line(
      "Congo basin (schematic)",
      "basin",
      "The Congo basin contains equatorial rainforest that stores and exchanges water and carbon.",
      [
        [12, 5],
        [28, 5],
        [28, -8],
        [12, -8],
        [12, 5],
      ],
    ),
  ],
};

export const TEACHING_PRESETS: {
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  note: string;
}[] = [
  {
    name: "Holderness",
    lat: 53.75,
    lon: -0.05,
    zoom: 9,
    note: "Waves erode the soft till cliffs of Holderness, and sediment transport supplies the spit at Spurn Point.",
  },
  {
    name: "Himalaya",
    lat: 28.0,
    lon: 86.9,
    zoom: 5,
    note: "The Himalaya rise where the Indian and Eurasian continental plates collide.",
  },
  {
    name: "Hawaiʻi",
    lat: 19.6,
    lon: -155.5,
    zoom: 7,
    note: "Hawaiian shield volcanoes form a hotspot chain whose main islands generally become older toward the northwest.",
  },
  {
    name: "Yellowstone",
    lat: 44.6,
    lon: -110.5,
    zoom: 7,
    note: "Yellowstone’s volcanism and geothermal activity are associated with a continental hotspot.",
  },
  {
    name: "San Andreas",
    lat: 36.0,
    lon: -120.5,
    zoom: 6,
    note: "The San Andreas is a right-lateral transform fault system, with mainly horizontal movement between its two sides.",
  },
  {
    name: "Thingvellir",
    lat: 64.26,
    lon: -21.12,
    zoom: 8,
    note: "Iceland straddles the Mid-Atlantic Ridge, where the North American and Eurasian plates move apart.",
  },
  {
    name: "Mississippi delta",
    lat: 29.2,
    lon: -89.2,
    zoom: 7,
    note: "The Mississippi’s branching channels extend into a subsiding coastal delta.",
  },
  {
    name: "Grand Canyon",
    lat: 36.1,
    lon: -112.1,
    zoom: 8,
    note: "The Colorado River has cut through many layers of rock to form the Grand Canyon.",
  },
  {
    name: "Yosemite",
    lat: 37.74,
    lon: -119.6,
    zoom: 9,
    note: "Glaciers widened and deepened Yosemite Valley into a broad trough within granitic rock.",
  },
  {
    name: "Shanghai",
    lat: 31.23,
    lon: 121.47,
    zoom: 9,
    note: "Shanghai lies on a low-lying delta, where tides influence the Huangpu River.",
  },
  {
    name: "Hong Kong",
    lat: 22.3,
    lon: 114.17,
    zoom: 10,
    note: "Hong Kong’s steep catchments include deeply weathered rock, which can become unstable during intense rainfall.",
  },
  {
    name: "Loess Plateau",
    lat: 36.6,
    lon: 109.2,
    zoom: 6,
    note: "Wind deposited the silt of the Loess Plateau, and flowing water later cut gullies into it.",
  },
  {
    name: "Cascadia",
    lat: 46.2,
    lon: -122.2,
    zoom: 6,
    note: "The Cascadia subduction zone lies offshore of the Cascade volcanic arc, which includes Mount St Helens.",
  },
  {
    name: "Mariana Trench",
    lat: 11.3,
    lon: 142.2,
    zoom: 5,
    note: "The Mariana Trench formed where one oceanic plate descends beneath another at a convergent boundary.",
  },
  {
    name: "Greenwich",
    lat: 51.48,
    lon: 0.0,
    zoom: 8,
    note: "The Greenwich meridian provides the conventional reference for zero degrees longitude.",
  },
  {
    name: "Outer Banks",
    lat: 35.25,
    lon: -75.53,
    zoom: 8,
    note: "The Outer Banks form sandy barrier islands that separate sheltered coastal waters from the Atlantic.",
  },
  {
    name: "Jurassic Coast",
    lat: 50.62,
    lon: -2.27,
    zoom: 9,
    note: "The Jurassic Coast exposes varied sedimentary rocks and coastal landforms shaped by wave erosion.",
  },
];
