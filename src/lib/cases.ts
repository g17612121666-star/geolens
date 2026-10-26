export type CaseStudy = {
  slug: string;
  title: string;
  place: string;
  region:
    "UK" | "US" | "Shared" | "East Asia" | "South Asia" | "Africa" | "South America" | "Pacific";
  labs: string[];
  lede: string;
  body: string[];
  exam: { prompt: string; hint: string };
  lat: number;
  lon: number;
  zoom: number;
  sources: { label: string; href?: string }[];
  /** Query string (no ?) that restores a teaching frame in the first lab. */
  state?: string;
};

export const CASES: CaseStudy[] = [
  {
    slug: "uk-daylength",
    title: "UK seasonal day length",
    place: "London to Lerwick",
    region: "UK",
    labs: ["seasons", "solar-altitude"],
    lat: 51.51,
    lon: -0.13,
    zoom: 4,
    state: "t=0.973&step=2&tilt=23.44",
    lede: "Winter daylight decreases as you travel north from London to Lerwick. Earth’s tilted axis explains both the shorter days and the lower midday Sun.",
    body: [
      "At the December solstice, London has less than eight hours of daylight while Lerwick has less than six. The difference comes from latitude: northern places follow a shorter path through the illuminated half of Earth when the Northern Hemisphere tilts away from the Sun.",
      "Use the seasons model to compare December with June. Keep the axial tilt fixed and follow each place through a complete rotation. Opposite seasons in Sydney are a useful test of the idea that Earth’s changing distance from the Sun is the main cause.",
    ],
    exam: {
      prompt:
        "Explain why Lerwick’s December day is shorter than London’s, using axial tilt rather than distance from the Sun.",
      hint: "Explain how the Northern Hemisphere tilts away from the Sun in December, then compare the daylight arcs at the two latitudes.",
    },
    sources: [
      { label: "Met Office — UK day length" },
      { label: "NOAA Solar Calculator", href: "https://gml.noaa.gov/grad/solcalc/" },
    ],
  },
  {
    slug: "florida-insolation",
    title: "Winter sunlight in Miami and Minneapolis",
    place: "Miami, Florida and Minneapolis, Minnesota",
    region: "US",
    labs: ["solar-altitude", "seasons", "energy-budget"],
    lat: 25.76,
    lon: -80.19,
    zoom: 5,
    lede: "Miami receives a higher midday Sun than Minneapolis in December. Comparing their solar angles helps explain why the same season brings different amounts of solar energy.",
    body: [
      "Near the December solstice, the noon Sun is about 41° above the horizon in Miami and about 22° in Minneapolis, which lies about 19° farther north. A steeper beam spreads its energy across a smaller horizontal area. Miami also has a longer winter day, about 10½ hours against fewer than 9, extending the time during which sunlight is received. London, at 51.5° N, gets a noon Sun of only about 15°.",
      "Compare the two cities in the solar-altitude model, then use the energy-budget model to introduce reflection by clouds and the ground. Solar angle explains much of the contrast, but the energy reaching the surface also depends on cloud, haze and the type of ground.",
    ],
    exam: {
      prompt:
        "Using noon solar altitude, explain why Miami receives more solar energy than Minneapolis in December, even on a cloudless day.",
      hint: "Compare the solar angle and length of daylight. A higher Sun spreads the incoming beam over less ground.",
    },
    sources: [
      { label: "NOAA / NREL typical meteorological year" },
      { label: "NASA Earth Observatory — insolation" },
    ],
  },
  {
    slug: "holderness",
    title: "Holderness coast",
    place: "East Yorkshire",
    region: "UK",
    labs: ["coasts"],
    lat: 53.73,
    lon: -0.05,
    zoom: 9,
    state: "step=2",
    lede: "Waves erode the soft glacial till cliffs of Holderness, while longshore drift carries sediment south toward Spurn. Coastal defenses change how that sediment is shared along the shore.",
    body: [
      "Holderness cliffs are largely made of glacial till rather than hard, well-cemented rock. Wave erosion at the foot combines with weathering and slope failure above. Retreat varies along the coast and from year to year, so a single average rate does not describe every cliff or every winter.",
      "Waves approaching obliquely move sediment alongshore. Groynes trap material on their up-drift side and reduce the supply farther down the coast. Use the coasts model to trace this transfer, then locate Mappleton and Spurn to discuss how a local defense affects the wider sediment budget.",
    ],
    exam: {
      prompt:
        "Explain how longshore drift and groynes together change the sediment budget of Holderness, using Mappleton and Spurn Head.",
      hint: "Trace southward sediment movement, explain trapping up-drift of groynes, and consider the resulting supply to down-drift beaches and Spurn.",
    },
    sources: [
      { label: "BGS — Holderness coastal erosion" },
      { label: "East Riding of Yorkshire coastal monitoring" },
      { label: "Environment Agency shoreline management" },
    ],
  },
  {
    slug: "jurassic-coast",
    title: "Jurassic Coast",
    place: "Dorset and East Devon",
    region: "UK",
    labs: ["coasts", "rock-cycle"],
    lat: 50.62,
    lon: -2.25,
    zoom: 8,
    lede: "The changing rocks of the Dorset and East Devon coast produce contrasting cliffs, bays and arches. Durdle Door and Old Harry Rocks show how coastal erosion works with geological structure.",
    body: [
      "Rock resistance and the orientation of beds help determine where headlands and bays develop. Durdle Door is a limestone arch, while Old Harry Rocks are chalk stacks. They are separate landforms that illustrate different stages of erosion, not one feature watched through time.",
      "Waves exploit joints and other weaknesses, while weathering and gravity also weaken cliffs. Compare the model’s cave–arch–stack–stump sequence with the photographs, and ask what evidence would be needed to reconstruct one headland’s history.",
    ],
    exam: {
      prompt:
        "With reference to a named Jurassic Coast example, explain how a headland can be eroded from a cave to a stump.",
      hint: "Explain how erosion enlarges weaknesses into a cave and arch, then how collapse can leave a stack and eventually a stump.",
    },
    sources: [{ label: "Jurassic Coast Trust / UNESCO" }, { label: "BGS — Dorset coast" }],
  },
  {
    slug: "lake-district",
    title: "A UK upland river",
    place: "Lake District",
    region: "UK",
    labs: ["rivers", "glaciers", "contours"],
    lat: 54.45,
    lon: -3.09,
    zoom: 9,
    lede: "Lake District rivers flow through valleys reshaped by earlier glaciers. Their channels show how running water continues to modify an inherited landscape.",
    body: [
      "Ice widened and deepened many Lake District valleys, leaving troughs, hanging valleys and lakes. Since the ice retreated, rivers have cut smaller channels into those valley floors and carried sediment along them, so the landscape records more than one process.",
      "Compare a broad valley cross-section with the narrow channel inside it. Then switch between the glaciers, rivers and contours models to connect the valley shape, the present flow and the pattern drawn on a map.",
    ],
    exam: {
      prompt:
        "Explain why a Lake District valley may be U-shaped in cross-profile but still host a V-shaped inner channel.",
      hint: "Separate the older glacial trough from the smaller channel cut by the river after ice retreat.",
    },
    sources: [
      { label: "OS / BGS Northern England" },
      { label: "National Trust / Lake District National Park" },
    ],
  },
  {
    slug: "snowdonia",
    title: "Snowdonia / Eryri",
    place: "North Wales",
    region: "UK",
    labs: ["contours", "glaciers"],
    lat: 53.07,
    lon: -4.08,
    zoom: 11,
    lede: "The cirques and ridges of Eryri make contour patterns easier to understand. Compare a mapped slope with the landform that gives the lines their shape.",
    body: [
      "Glacial erosion helped shape the cirques, sharp ridges and deep valleys around Yr Wyddfa. Contours turn these three-dimensional forms into lines of equal elevation. Closely spaced lines show steep slopes, and the shape of the lines tells a hollow apart from a projecting ridge.",
      "Use the contours model to rotate a hill before viewing it from above. Ask students to predict the lines around a cirque and a spur, then compare their sketches with a map of Eryri. Check the map’s stated interval before calculating heights.",
    ],
    exam: {
      prompt:
        "On an OS-style extract of Yr Wyddfa, how would you distinguish a cirque from a spur using contours alone?",
      hint: "A cirque shows as an armchair-shaped hollow with tightly packed contours at its back wall; a spur shows as contours bending into a V or U that points downhill.",
    },
    sources: [{ label: "Ordnance Survey" }, { label: "BGS Wales" }],
  },
  {
    slug: "yorkshire-dales",
    title: "Yorkshire Dales karst",
    place: "North Yorkshire",
    region: "UK",
    labs: ["karst", "weathering"],
    lat: 54.15,
    lon: -2.15,
    zoom: 9,
    lede: "Water dissolves and drains through the limestone of the Yorkshire Dales, connecting surface pavements, sinking streams and underground caves.",
    body: [
      "Rainwater takes up carbon dioxide and becomes weakly acidic. As it moves through joints in limestone it dissolves calcite, enlarging fissures and underground passages. At the surface, clints and grykes form the characteristic pattern of a limestone pavement.",
      "A stream entering a swallow hole may reappear at a spring elsewhere. Its underground catchment need not follow the surface drainage divide. Use the karst model to trace a possible route and discuss why dye tracing is useful for testing it.",
    ],
    exam: {
      prompt:
        "Explain how a swallow hole forms and what it shows about drainage on Carboniferous limestone.",
      hint: "Connect carbonation along joints with underground drainage, and explain why a surface watershed may not match the groundwater catchment.",
    },
    sources: [{ label: "BGS — Yorkshire Dales karst" }, { label: "Natural England / Malham" }],
  },
  {
    slug: "somerset-levels",
    title: "Somerset Levels",
    place: "Somerset",
    region: "UK",
    labs: ["hydrograph", "rivers", "drainage-basin"],
    lat: 51.13,
    lon: -2.83,
    zoom: 9,
    lede: "Flooding on the Somerset Levels depends on how quickly water can leave a low-lying landscape. Saturated ground, river capacity, tides and drainage management all influence the response.",
    body: [
      "Much of the Levels is low and flat, so water drains away slowly. Prolonged rain fills the soil and the channels before extra water spreads over the floodplain. Embankments, pumping and the tidal conditions downstream influence where water accumulates and how long it remains.",
      "Use the hydrograph model to compare a rapid runoff response with a long falling limb. Ask students to separate the rainfall that supplies the water from the drainage conditions that control how fast it leaves.",
    ],
    exam: {
      prompt:
        "Using the idea of lag time, explain why the Somerset Levels can stay flooded long after the rain has stopped.",
      hint: "Explain how saturated ground increases runoff, while low gradients and restricted outlets lengthen the falling limb.",
    },
    sources: [{ label: "Environment Agency — Somerset" }, { label: "UKCEH hydrology" }],
  },
  {
    slug: "thames",
    title: "Water in the Thames basin",
    place: "Southern Britain",
    region: "UK",
    labs: ["water-cycle", "drainage-basin", "river-hydrology"],
    lat: 51.5,
    lon: -0.12,
    zoom: 7,
    lede: "The Thames connects water supply, groundwater and tidal flood management. Following its stores and transfers shows why a river basin can experience both shortage and flood risk.",
    body: [
      "Rainfall entering the Thames basin can become surface runoff, soil water or groundwater before reaching the river. Abstraction removes water from these stores. A regional shortage develops when abstraction and other losses exceed recharge over a period of time.",
      "The lower river is tidal, and the Thames Barrier helps manage tidal-surge flood risk upstream. Compare this with water-supply management: both concern water, but they deal with different flows, timescales and decisions.",
    ],
    exam: {
      prompt:
        "Why can a reservoir in the Thames basin fall in a dry summer even though the global water cycle is closed?",
      hint: "A local store shrinks when abstraction and other losses exceed recharge; global conservation of water does not ensure local availability.",
    },
    sources: [
      { label: "UKCEH / Environment Agency" },
      { label: "Thames Water / Defra abstraction" },
    ],
  },
  {
    slug: "iceland",
    title: "Iceland and Eyjafjallajökull",
    place: "Mid-Atlantic Ridge",
    region: "Shared",
    labs: ["plate-boundaries", "volcanoes", "seafloor-spreading"],
    lat: 63.63,
    lon: -19.62,
    zoom: 6,
    lede: "Iceland exposes a spreading plate boundary above sea level. Its rifts and volcanoes let students connect crustal extension with magma rising from the mantle.",
    body: [
      "The Mid-Atlantic Ridge crosses Iceland, where the North American and Eurasian plates move apart. Extension produces faults and fissures, while rising mantle material partly melts as pressure falls. A mantle plume beneath Iceland adds extra magma, which is why there is so much volcanic activity.",
      "Basaltic lava is common, but Iceland’s eruptions do not all behave alike. Magma composition, gas content and contact with ice or water all affect how explosive an eruption is. Compare a divergent-boundary model with a volcano model before discussing a particular eruption.",
    ],
    exam: {
      prompt:
        "Explain why Iceland has both gentle basaltic fissure eruptions and occasional explosive, ash-rich eruptions such as Eyjafjallajökull in 2010.",
      hint: "Explain the divergent boundary and mantle upwelling, then consider how magma composition and interaction with ice can alter eruption style.",
    },
    sources: [
      { label: "IMO / Icelandic Met Office" },
      { label: "BGS — Eyjafjallajökull 2010" },
      { label: "NASA Earth Observatory" },
    ],
  },
  {
    slug: "san-andreas",
    title: "San Andreas Fault",
    place: "California",
    region: "US",
    labs: ["plate-boundaries", "folds-faults", "earthquakes"],
    lat: 35.9,
    lon: -120.43,
    zoom: 6,
    lede: "The San Andreas Fault records horizontal motion between the Pacific and North American plates. Offset landforms help reveal movement that is difficult to notice from day to day.",
    body: [
      "The San Andreas is part of a transform boundary, with the Pacific Plate moving northwest relative to North America. Friction can hold parts of the fault while stress accumulates, followed by sudden slip during an earthquake. Other sections can move more gradually.",
      "Look for displaced channels or other features that cross the fault, then compare their movement with the plate-boundaries model. Contrast this setting with Cascadia, where subduction also feeds a chain of volcanoes.",
    ],
    exam: {
      prompt:
        "Why does the San Andreas system produce large earthquakes but not a volcanic arc, unlike Cascadia?",
      hint: "A transform boundary mainly accommodates horizontal slip. Cascadia subducts a plate, releasing water that promotes melting in the mantle above it.",
    },
    sources: [
      {
        label: "USGS Earthquake Hazards Program",
        href: "https://www.usgs.gov/programs/earthquake-hazards",
      },
      { label: "USGS San Andreas fact sheets" },
    ],
  },
  {
    slug: "cascadia",
    title: "Cascadia subduction zone",
    place: "Pacific Northwest",
    region: "US",
    labs: ["plate-boundaries", "earthquakes", "tsunami", "volcanoes"],
    lat: 46.2,
    lon: -124.0,
    zoom: 5,
    lede: "Cascadia links an offshore subduction zone with earthquakes, tsunamis and the Cascade volcanoes. The shared plate setting produces these hazards through different processes.",
    body: [
      "Oceanic lithosphere descends beneath North America at the Cascadia subduction zone. Water released from the descending plate promotes partial melting in the mantle above, helping supply the Cascade volcanic arc over geological time.",
      "A large earthquake on the offshore plate boundary can displace the seabed and generate a tsunami. Use the plate-boundaries and tsunami models to separate slow subduction, sudden fault slip and the movement of water that follows.",
    ],
    exam: {
      prompt:
        "Explain how the Cascadia subduction system forms a volcanic arc over geological time, and how a megathrust earthquake can generate a tsunami in minutes.",
      hint: "Distinguish magma generation above the descending slab from the rapid seafloor displacement that can produce a tsunami.",
    },
    sources: [{ label: "USGS Cascadia" }, { label: "NOAA / NWS tsunami" }],
  },
  {
    slug: "yellowstone",
    title: "Yellowstone",
    place: "Wyoming",
    region: "US",
    labs: ["earth-interior", "hotspots", "volcanoes"],
    lat: 44.6,
    lon: -110.5,
    zoom: 7,
    lede: "Yellowstone’s hot springs and caldera sit above a long-lived volcanic system. Older volcanic centers across the Snake River Plain help trace its relationship with plate movement.",
    body: [
      "Yellowstone lies within the North American Plate rather than on its edge. Heat drives a large hydrothermal system, while older volcanic centers extend southwest along the Snake River Plain. Their ages and positions record how the plate has moved over the heat source beneath.",
      "Use the hotspots model to compare an age-progressive continental track with Hawaiʻi’s oceanic island chain. A hot spring shows that the system is active, but the magma stored deeper down can only be studied with geophysical and geological measurements.",
    ],
    exam: {
      prompt:
        "How does the age pattern of calderas in the Snake River Plain support a hotspot under a moving plate?",
      hint: "Relate the southwestward increase in volcanic age to plate movement over a long-lived source, while recognizing that the source can also move.",
    },
    sources: [{ label: "USGS Yellowstone Volcano Observatory" }, { label: "USGS hotspot track" }],
  },
  {
    slug: "hawaii",
    title: "Hawaiʻi hotspot track",
    place: "Hawaiʻi to Emperor seamounts",
    region: "US",
    labs: ["hotspots", "volcanoes", "plate-boundaries"],
    lat: 19.4,
    lon: -155.3,
    zoom: 6,
    lede: "The Hawaiian island and seamount chain becomes older away from its active southeastern end. It provides evidence of oceanic plate movement over a long-lived volcanic source.",
    body: [
      "Repeated basaltic eruptions build broad shield volcanoes in Hawaiʻi. As the Pacific Plate moves over the hotspot, older volcanoes are carried away and die out, and new ones form above the active source. The extinct volcanoes then sink and erode.",
      "Compare position and age along the chain in the hotspots model. Discuss why the bend toward the Emperor seamounts cannot be explained simply by a fixed hotspot and a plate moving in one unchanging direction.",
    ],
    exam: {
      prompt:
        "Why are Hawaiian volcanoes shields rather than stratovolcanoes, and how does the island chain record plate motion?",
      hint: "Link runny basaltic lava to the broad shield shape, then link the increasing age of volcanoes to plate movement away from the hotspot.",
    },
    sources: [
      { label: "USGS Hawaiian Volcano Observatory" },
      { label: "NOAA / ocean exploration seamounts" },
    ],
  },
  {
    slug: "grand-canyon",
    title: "Grand Canyon",
    place: "Arizona",
    region: "US",
    labs: ["geologic-time", "landform-types", "rock-cycle"],
    lat: 36.05,
    lon: -112.14,
    zoom: 9,
    lede: "The Grand Canyon exposes old rock layers within a much younger river-cut valley. Separating the age of the rocks from the age of the landform is the key to reading its history.",
    body: [
      "Rock layers exposed in the canyon preserve long intervals of deposition, deformation and erosion. The layers are not a clock running at a steady rate: unconformities represent missing time, and the oldest exposed rocks are far older than the canyon itself.",
      "The Colorado River cut into an elevated landscape after much of that rock history had occurred. Use the geologic-time and landform-types models to separate rock formation, uplift and river incision, then identify the evidence for each stage.",
    ],
    exam: {
      prompt:
        "Distinguish the age of the rocks in the Grand Canyon walls from the age of the canyon as a landform.",
      hint: "Date the rocks and the incision separately. Old sedimentary layers can be exposed by a much younger episode of erosion.",
    },
    sources: [{ label: "USGS / NPS Grand Canyon" }],
  },
  {
    slug: "mississippi",
    title: "Mississippi and delta",
    place: "Lower Mississippi",
    region: "US",
    labs: ["rivers", "river-deposition", "hydrograph"],
    lat: 29.15,
    lon: -89.25,
    zoom: 6,
    lede: "The lower Mississippi transports water and sediment into a delta shaped by deposition, subsidence and the sea. Engineering changes where that sediment can accumulate.",
    body: [
      "Meanders, floodplains and natural levees record repeated erosion and deposition along the lower river. At the coast, distributary channels deliver sediment that builds new land wherever deposition keeps pace with erosion, subsidence and sea-level rise.",
      "Levees and river-management works alter floodwater and sediment routes. Compare a river-built delta with a tidal estuary, then use the river-deposition model to explore the balance between sediment supply, redistribution and changing water level.",
    ],
    exam: {
      prompt:
        "Explain why the Mississippi can maintain a bird-foot delta while many UK rivers end in estuaries.",
      hint: "Consider river sediment supply alongside tides, waves and subsidence. Delta growth requires deposition to keep pace with losses and relative sea-level change.",
    },
    sources: [
      { label: "USGS Mississippi River" },
      { label: "USACE Mississippi River & Tributaries" },
    ],
  },
  {
    slug: "yosemite",
    title: "Yosemite Valley rim",
    place: "Sierra Nevada",
    region: "US",
    labs: ["contours", "glaciers", "rivers"],
    lat: 37.74,
    lon: -119.57,
    zoom: 11,
    lede: "Yosemite Valley shows how glaciers can widen and deepen a pre-existing river valley. Its steep walls and hanging tributaries help connect landforms with contour maps.",
    body: [
      "A river valley existed before glaciers enlarged it into a broad trough. The main glacier eroded more deeply than the smaller tributary glaciers, leaving hanging valleys from which waterfalls now plunge.",
      "Compare the valley’s broad floor with its steep sides, then see how these differences appear in contour spacing. The present river still modifies the floor, but its small channel should not be confused with the whole glacial valley.",
    ],
    exam: {
      prompt:
        "How would a contour map distinguish Yosemite Valley from a V-shaped river gorge of similar depth?",
      hint: "Identify a wide floor, steep walls and hanging tributaries in a glacial trough, then compare these with the contours of a narrower river valley.",
    },
    sources: [{ label: "USGS / NPS Yosemite" }],
  },
  {
    slug: "katrina-sandy",
    title: "Katrina and Sandy",
    place: "New Orleans and the New York Bight",
    region: "US",
    labs: ["storm-surge", "tropical-cyclone", "coasts"],
    lat: 29.95,
    lon: -90.07,
    zoom: 5,
    lede: "Katrina and Sandy struck different coasts, but both show how storm winds can raise the sea. Coastal shape, tides and defenses shaped the floods that followed.",
    body: [
      "Storm surge is the rise in sea level above the expected tide, caused mainly by wind pushing water onshore and partly by low air pressure. Water levels at the shore also depend on waves, the timing of high tide and the shape and depth of the coast, so a storm’s wind category alone does not describe the flood threat.",
      "Katrina (2005) flooded New Orleans; Sandy (2012) flooded parts of New York and New Jersey after losing its tropical characteristics just before landfall. Use the storm-surge model to see how wind and shelf depth change surge, but study each event in its own setting.",
    ],
    exam: {
      prompt:
        "Explain why the flooding of New Orleans during Hurricane Katrina cannot be explained by the storm’s wind category alone.",
      hint: "Separate storm surge, waves and tide, then explain how shallow coastal water, low-lying land and failed flood defenses increased the flooding.",
    },
    sources: [
      { label: "NOAA / NHC Katrina and Sandy reports" },
      { label: "USGS surge and high-water marks" },
    ],
  },
  {
    slug: "dust-bowl",
    title: "Dust Bowl",
    place: "Southern Great Plains",
    region: "US",
    labs: ["soil-erosion", "weathering", "aeolian", "groundwater"],
    lat: 36.68,
    lon: -101.48,
    zoom: 5,
    lede: "The Dust Bowl shows how drought and loss of protective vegetation can make soil vulnerable to wind erosion. Land management changed how easily dry particles could be removed.",
    body: [
      "During the Dust Bowl, severe drought coincided with exposed and disturbed soils across parts of the Great Plains. Wind detached and transported particles, sometimes carrying fine dust far from its source. Vegetation loss reduced protection from direct wind and removed roots that helped hold soil together.",
      "Use the soil-erosion model to compare bare ground with covered ground. Ask students to separate the climatic trigger (drought) from the land use that made soils vulnerable, then compare wind erosion with the water-cut gullies of the Loess Plateau.",
      "The same plains lie above the High Plains (Ogallala) aquifer. After the 1930s, irrigation wells drawing on it helped farms through later droughts, but in parts of western Kansas and the Texas Panhandle pumping has far exceeded recharge and the water table has fallen by tens of meters. Use the groundwater model to see how pumping draws the water table down around a well.",
    ],
    exam: {
      prompt:
        "Explain how vegetation removal made Great Plains soils vulnerable to wind erosion in the 1930s.",
      hint: "Explain how roots, surface cover and rough ground reduce soil movement, and why dry, exposed topsoil is easily lifted by wind.",
    },
    sources: [
      { label: "NOAA / NCEI drought and Dust Bowl" },
      { label: "USDA NRCS soil erosion history" },
      { label: "USGS High Plains aquifer water-level monitoring" },
    ],
  },
  {
    slug: "colorado",
    title: "Colorado River reservoirs",
    place: "Lakes Powell and Mead",
    region: "US",
    labs: ["water-cycle", "river-hydrology"],
    lat: 36.06,
    lon: -114.74,
    zoom: 6,
    lede: "Reservoir levels in the Colorado River basin respond to the balance of inflow, withdrawals, releases and evaporation. Exposed shorelines make changes in stored water visible.",
    body: [
      "A reservoir stores water when inflow exceeds releases and other losses. Its level falls when that balance reverses. Climate affects rain, snow and runoff, while management determines how water is distributed and released for different uses.",
      "The pale bands around the reservoirs mark earlier water levels, but they do not explain why the level fell. Use the water-cycle model to separate inputs, outputs and storage change, then check dated records before discussing a particular period.",
    ],
    exam: {
      prompt:
        "Using the ideas of stores and transfers, explain why the water level in Lake Mead can fall even though the global water cycle is a closed system.",
      hint: "Track inflow, releases, withdrawals and evaporation. A regional store can decline while the total quantity of water on Earth remains nearly unchanged.",
    },
    sources: [{ label: "USBR / USGS Colorado River" }],
  },
  {
    slug: "greenwich",
    title: "Greenwich meridian",
    place: "London",
    region: "UK",
    labs: ["rotation", "graticule"],
    lat: 51.477,
    lon: -0.0015,
    zoom: 12,
    lede: "Greenwich links the agreed line of zero longitude with the link between Earth’s rotation and time. Earth turns through about 15 degrees of longitude every hour.",
    body: [
      "A prime meridian is the line from which longitude is measured east or west. Which line to use is an agreed choice; the link between longitude and local solar time comes from Earth’s rotation.",
      "Use the graticule model to compare the longitudes of two places and work out the difference in their local solar time. Then distinguish local solar time from civil time zones, whose boundaries follow political and practical choices.",
    ],
    exam: {
      prompt:
        "Why is 15° of longitude equal to one hour, and why is the Greenwich meridian not required for that arithmetic?",
      hint: "Divide 360° by 24 hours to get 15° per hour, and explain that this works from any starting meridian.",
    },
    sources: [{ label: "Royal Observatory Greenwich" }],
  },
  {
    slug: "time-zones-us",
    title: "US lower-48 time zones",
    place: "From the eastern to the western United States",
    region: "US",
    labs: ["rotation", "graticule"],
    lat: 39.8,
    lon: -98.6,
    zoom: 3,
    lede: "US time zones roughly follow the change in solar time with longitude, but their boundaries are drawn around communities and states. The day–night boundary simply follows Earth’s geometry.",
    body: [
      "Places farther west reach local solar noon later because Earth rotates eastward. A difference of 15 degrees in longitude corresponds to about one hour of solar time. Civil time zones group places under a common clock rather than changing continuously with longitude.",
      "Use the rotation model to follow two locations, then compare that smooth progression with a time-zone map. When checking a real clock difference, note the date, because daylight-saving rules can change the answer.",
    ],
    exam: {
      prompt:
        "If solar noon has just reached New York, about how long until solar noon in a place 45° of longitude further west?",
      hint: "Divide 45° by 15° per hour to get about three hours of solar time. Clock times may differ because of time-zone rules.",
    },
    sources: [{ label: "NIST / USNO" }],
  },
  {
    slug: "kola",
    title: "Kola Superdeep borehole",
    place: "Kola Peninsula",
    region: "Shared",
    labs: ["earth-interior"],
    lat: 69.4,
    lon: 30.6,
    zoom: 5,
    lede: "The Kola Superdeep Borehole reached about 12 km into Earth’s crust. Comparing that depth with Earth’s layers shows why scientists rely on seismic evidence to investigate the interior.",
    body: [
      "Despite reaching roughly 12 km, the Kola borehole did not drill through the continental crust. The mantle and core lie far beyond direct reach, so rock samples answer local questions but cannot give a section through the whole planet.",
      "Open the Earth-interior model and compare the borehole depth with the crust and mantle. Discuss how seismic waves, gravity and other evidence tell us about regions that can never be visited or drilled.",
    ],
    exam: {
      prompt: "Why is the Kola borehole not evidence for the composition of the outer core?",
      hint: "Compare roughly 12 km of drilling with about 2,900 km to the core–mantle boundary, and explain the role of indirect seismic evidence.",
    },
    sources: [{ label: "BGS / USGS interior summaries" }],
  },
  {
    slug: "snowdonia-moon",
    title: "Moonrise, Snowdonia",
    place: "Eryri",
    region: "UK",
    labs: ["moon-phases"],
    lat: 53.07,
    lon: -4.08,
    zoom: 9,
    lede: "The Moon’s phase depends on the Sun–Earth–Moon geometry. Observers in Eryri and California see nearly the same phase even though their clocks and horizons differ.",
    body: [
      "The Moon is always lit on the side facing the Sun. Its phase describes how much of that sunlit half we can see from Earth. At full Moon, the Moon is roughly opposite the Sun in our sky; phases are not caused by Earth’s shadow.",
      "Use the moon-phases model to compare the phase with the Moon’s position in its orbit. Earth’s rotation and the observer’s longitude decide when the Moon is visible, while the phase changes slowly over the month.",
    ],
    exam: {
      prompt:
        "Why can two observers, one in Snowdonia and one in Yosemite, see the same lunar phase on the same date but at different clock times?",
      hint: "Separate the Sun–Earth–Moon geometry that sets the phase from Earth’s rotation and longitude, which set the local time it is seen.",
    },
    sources: [{ label: "NASA Moon phases" }],
  },
  {
    slug: "yosemite-moon",
    title: "Full Moon, Yosemite",
    place: "Yosemite Valley",
    region: "US",
    labs: ["eclipses", "moon-phases"],
    lat: 37.74,
    lon: -119.57,
    zoom: 11,
    lede: "Seeing a full Moon above Yosemite’s cliffs depends on the phase, the Moon’s path across the sky and where the observer stands. An eclipse needs an extra alignment.",
    body: [
      "At full Moon, the Moon is approximately opposite the Sun as seen from Earth. A high cliff can delay its appearance, so moonrise photographs depend on both astronomy and the local skyline.",
      "Most full Moons pass above or below Earth’s shadow because the lunar orbit is inclined. Use the eclipse model to locate an orbital node and explain why a full Moon alone is not enough for a lunar eclipse.",
    ],
    exam: {
      prompt: "Why is a full Moon necessary but not sufficient for a lunar eclipse?",
      hint: "A lunar eclipse needs a full Moon close enough to an orbital node for it to pass through Earth’s shadow.",
    },
    sources: [{ label: "NASA / NPS" }],
  },
  {
    slug: "outer-banks",
    title: "Outer Banks",
    place: "North Carolina",
    region: "US",
    labs: ["coasts"],
    lat: 35.25,
    lon: -75.53,
    zoom: 7,
    lede: "North Carolina’s Outer Banks are sandy barrier islands reshaped by waves, sediment transport and storms. They offer a useful comparison with the eroding till cliffs of Holderness.",
    body: [
      "Barrier islands separate the open sea from shallow coastal waters. Sand moves alongshore and across the islands as waves, tides and storms change the coast. Storm overwash and new inlets move sand across the islands, even though buildings and roads stay fixed in place.",
      "Compare the Outer Banks with Holderness in the coasts model. Both need a sediment-budget explanation, but one is a mobile sandy barrier system and the other is a coast of soft cliffs that supply sediment as they erode.",
    ],
    exam: {
      prompt:
        "Compare the Holderness coast and the Outer Banks as sediment systems. What do they have in common, and how do they differ?",
      hint: "Explain the shared role of longshore sediment transport, then compare mobile barrier sand with sediment supplied by till-cliff erosion.",
    },
    sources: [{ label: "USGS barrier islands" }, { label: "NOAA / NPS Cape Hatteras" }],
  },
  {
    slug: "mammoth-cave",
    title: "Mammoth Cave",
    place: "Kentucky",
    region: "US",
    labs: ["karst"],
    lat: 37.19,
    lon: -86.1,
    zoom: 9,
    lede: "Mammoth Cave developed as water dissolved limestone and enlarged underground routes. Its passages provide a comparison with karst drainage in the Yorkshire Dales.",
    body: [
      "Water containing dissolved carbon dioxide reacts with limestone and, over long periods, enlarges fractures into passages. Cave levels and their height above today’s rivers help reconstruct past changes in drainage and base level.",
      "Use the karst model to follow water from infiltration to an underground channel and spring. Contrast the dissolution of limestone with weathering in less soluble rock, and remember that most underground passages cannot be seen from the surface.",
    ],
    exam: {
      prompt: "Why do sinkholes and caves cluster on carbonate rocks rather than on granite?",
      hint: "Explain how weakly acidic water dissolves calcite along fractures. Granite’s minerals dissolve far more slowly, so it does not develop caves and sinkholes in the same way.",
    },
    sources: [{ label: "NPS / USGS Mammoth Cave" }],
  },
  {
    slug: "phoenix-heat",
    title: "Phoenix urban heat",
    place: "Arizona",
    region: "US",
    labs: ["thermal-circulation", "energy-budget"],
    lat: 33.45,
    lon: -112.07,
    zoom: 8,
    lede: "Phoenix shows how buildings, paving and dry ground affect urban temperature. Heat stored during the day keeps built surfaces warm after sunset.",
    body: [
      "Urban surfaces differ from surrounding land in reflectivity, heat storage, shade and evaporation. Paving and buildings can store substantial energy, while limited soil moisture reduces evaporative cooling. The balance changes through the day and between neighbourhoods.",
      "Use the thermal-circulation model’s urban heat setting and the energy-budget model’s albedo slider. Ask students to distinguish a thermal image of surface temperature from an air-temperature reading, then discuss how trees, shade and building materials change local conditions.",
    ],
    exam: {
      prompt: "Explain why Phoenix can stay warmer than the surrounding desert at night.",
      hint: "Explain how concrete, asphalt and buildings absorb and store heat by day and release it slowly at night, and how irrigated trees and shade can reduce the effect.",
    },
    sources: [{ label: "NOAA / NWS urban heat" }],
  },
  {
    slug: "uk-sea-breeze",
    title: "UK sea breeze",
    place: "Britain’s south coast",
    region: "UK",
    labs: ["thermal-circulation", "wind"],
    lat: 50.8,
    lon: -1.1,
    zoom: 7,
    lede: "A sunny afternoon can bring cooler air inland from the sea as the land warms faster than nearby water. The sea breeze is a local response to unequal heating.",
    body: [
      "As the land heats, the air above it warms and rises, and lower pressure near the surface draws cooler sea air inland. A return flow toward the sea higher up completes the circulation.",
      "Use the thermal-circulation model to compare daytime and night-time heating. Then consider why a strong prevailing wind, cloud or an irregular coastline may spoil the neat circulation shown in the model.",
    ],
    exam: {
      prompt:
        "Draw and label a sea-breeze circulation for a calm, sunny afternoon on the south coast.",
      hint: "Show warm land with rising air and lower surface pressure, an onshore breeze at ground level, and a return flow out to sea higher up.",
    },
    sources: [{ label: "Met Office sea breezes" }],
  },
  {
    slug: "cairngorms-albedo",
    title: "Cairngorms snow albedo",
    place: "Scottish Highlands",
    region: "UK",
    labs: ["energy-budget"],
    lat: 57.08,
    lon: -3.67,
    zoom: 8,
    lede: "Snow-covered and snow-free ground in the Cairngorms reflect different amounts of sunlight. Their contrast makes the role of albedo visible in a familiar landscape.",
    body: [
      "Fresh snow generally reflects a much larger fraction of sunlight than dark exposed ground. When snow cover changes, the fraction of incoming solar energy absorbed by the landscape changes too. The effect also depends on cloud, solar angle and snow condition.",
      "In the energy-budget model, move the albedo slider from a snow value to a dark-ground value. Ask students to explain the change in absorbed energy before discussing other factors such as cloud.",
    ],
    exam: {
      prompt:
        "Why does a snow-covered Cairngorm plateau heat the air less than a snow-free peat surface under the same incoming solar radiation?",
      hint: "At the same incoming sunlight, a higher albedo means more reflection and less absorption by the surface.",
    },
    sources: [{ label: "Met Office / CEH snow and peat" }],
  },
  {
    slug: "denver-air",
    title: "Denver mile-high air",
    place: "Colorado",
    region: "US",
    labs: ["atmosphere-layers"],
    lat: 39.74,
    lon: -104.99,
    zoom: 7,
    lede: "Denver’s height above sea level makes it a good place to discuss air pressure and altitude, but the city is still well inside the troposphere, with most of the weather layer above it.",
    body: [
      "Denver stands roughly 1.6 km above sea level. Atmospheric pressure is lower there than at sea level because less air lies above the city. The tropopause is still several kilometers higher, with its altitude varying by latitude and weather.",
      "Find Denver’s height in the atmosphere-layers model: it sits near the bottom, not near the top. Compare pressure with altitude, and separate this change from the day-to-day pressure changes caused by weather systems.",
    ],
    exam: {
      prompt:
        "Denver is a mile above sea level. Explain why its weather still happens in the troposphere.",
      hint: "Compare the city’s elevation with the much greater depth of the troposphere; high ground does not place the city outside the weather layer.",
    },
    sources: [{ label: "NOAA / NWS Denver" }, { label: "Met Office radiosondes" }],
  },
  {
    slug: "hong-kong-landslide",
    title: "Hong Kong slopes",
    place: "Hong Kong Island and the New Territories",
    region: "East Asia",
    labs: ["mass-movement", "weathering"],
    lat: 22.28,
    lon: 114.16,
    zoom: 11,
    lede: "Intense rainfall can destabilize Hong Kong’s steep slopes, including those underlain by deeply weathered rock. The role of groundwater differs from wave erosion at the foot of a Holderness cliff.",
    body: [
      "Weathering can turn granite and other rocks into thick, weak material called saprolite. Rain soaking into a slope raises the pore-water pressure, which reduces the friction holding the material in place. Slope angle, drainage, vegetation and engineering all affect stability.",
      "Compare this setting with coastal slumping at Holderness. Both involve gravity-driven movement, but their materials and triggers differ. Use the mass-movement model’s pore-pressure slider to see how water affects stability before discussing a particular landslide.",
    ],
    exam: {
      prompt:
        "Contrast a Hong Kong hillslope failure with Holderness cliff retreat, using rock type and the triggering process.",
      hint: "Compare weathered rock and rainfall-driven pore pressure in Hong Kong with glacial till and wave erosion at Holderness.",
    },
    sources: [{ label: "GEO Hong Kong — landslide studies" }, { label: "BGS — Holderness till" }],
  },
  {
    slug: "shanghai-huangpu",
    title: "Shanghai, Meiyu and the Huangpu",
    place: "The Huangpu River in the Yangtze delta",
    region: "East Asia",
    labs: ["hydrograph", "rivers", "storm-surge"],
    lat: 31.23,
    lon: 121.49,
    zoom: 10,
    lede: "Shanghai’s Huangpu River connects urban drainage with a tidal river in a low-lying delta. Rainfall, river flow and coastal water levels can act together during flooding.",
    body: [
      "The Huangpu is affected by tides as well as by river flow from its catchment. Heavy rain increases runoff, while high water downstream slows drainage. Flood walls reduce the risk but do not remove it.",
      "Compare Shanghai with the lower Mississippi. Both occupy low-lying river landscapes, but their catchments, sediment systems and tidal influences differ. Use the hydrograph and storm-surge models to trace where water enters and what controls how it leaves.",
    ],
    exam: {
      prompt:
        "Explain why Meiyu rain arriving at high tide can flood Shanghai, and how this differs from a Mississippi overbank flood.",
      hint: "Explain how catchment runoff combines with high tidal water levels downstream, rather than treating the flood as rainfall alone.",
    },
    sources: [{ label: "Shanghai Water Authority — Huangpu tide" }, { label: "CMA — Meiyu" }],
  },
  {
    slug: "typhoon-mangkhut",
    title: "Typhoon Mangkhut",
    place: "Hong Kong, Macau and the Pearl River Delta",
    region: "East Asia",
    labs: ["tropical-cyclone", "storm-surge"],
    lat: 22.2,
    lon: 113.55,
    zoom: 7,
    state: "t=0.4",
    lede: "Typhoon Mangkhut (2018) shows the combined effects of wind, heavy rain and storm surge. A typhoon is the same kind of storm as an Atlantic hurricane.",
    body: [
      "Names differ by region, but a typhoon is a tropical cyclone with a warm core. Its winds drive water toward the coast, while low pressure, tides and waves add to the water level. Heavy rain adds a second source of flooding.",
      "Compare the tropical-cyclone and surge models, then locate the Pearl River Delta’s low-lying coasts. Mangkhut and Katrina share the same physics, but their tracks, coasts and impacts must be studied separately.",
    ],
    exam: {
      prompt:
        "Explain why Typhoon Mangkhut and Hurricane Katrina are the same type of storm despite their different names.",
      hint: "Describe the shared features: warm ocean water as the energy source, a warm core, an eye and spiral rain bands. Then explain that the name depends only on the ocean basin.",
    },
    sources: [{ label: "HKO — Super Typhoon Mangkhut" }, { label: "NOAA — hurricane vs typhoon" }],
  },
  {
    slug: "loess-plateau",
    title: "Loess Plateau",
    place: "The plateau across Shaanxi, Shanxi and Gansu",
    region: "East Asia",
    labs: ["soil-erosion", "soil-profile", "aeolian"],
    lat: 36.6,
    lon: 109.5,
    zoom: 6,
    lede: "Wind deposited the fine sediment of the Loess Plateau, while running water later cut many of its gullies. Distinguishing deposition from erosion makes this landscape easier to explain.",
    body: [
      "Loess is predominantly wind-deposited silt. Once exposed on slopes, it can be detached and transported by rainfall and concentrated runoff. Deep gullies therefore record water erosion of material that originally arrived by a different process.",
      "Compare the aeolian and soil-erosion models to follow the sediment through both stages. Then contrast the plateau with the Dust Bowl, where wind removed exposed topsoil.",
    ],
    exam: {
      prompt:
        "Explain how the Loess Plateau records both wind deposition and water erosion. Compare it with the Dust Bowl.",
      hint: "Separate the earlier aeolian deposition of silt from its later removal by runoff and gully erosion.",
    },
    sources: [{ label: "CAS / FAO — Loess Plateau restoration" }, { label: "USDA — Dust Bowl" }],
  },
  {
    slug: "storm-desmond",
    title: "Storm Desmond and Cumbria’s record rain",
    place: "Cumbria, England",
    region: "UK",
    labs: ["fronts", "rain-shadow", "hydrograph"],
    lat: 54.5,
    lon: -3.17,
    zoom: 8,
    lede: "In December 2015 slow-moving fronts and a mild, moist airstream met the Cumbrian fells. The result was the wettest 24 hours ever recorded in the UK and severe flooding in Carlisle, Keswick and Appleby.",
    body: [
      "A deep low near Iceland trailed fronts across northern Britain, with a mild, moist south-westerly airstream behind them. Where that air was forced up over the Lake District fells it cooled, and the frontal rain was greatly intensified: Honister Pass recorded 341.4 mm in the 24 hours to 18:00 on 5 December 2015, a UK record.",
      "The rain fell on ground already saturated by a wet November, so rivers rose quickly and stayed high. Use the fronts model to see how air is lifted along a frontal boundary, the rain-shadow model to add the effect of high ground, and the hydrograph model to see why saturated catchments give high, fast flood peaks.",
    ],
    exam: {
      prompt:
        "Explain how fronts, relief and antecedent conditions combined to cause the Storm Desmond floods in Cumbria.",
      hint: "Describe frontal uplift in a moist south-westerly airstream, add orographic enhancement over the fells, then explain how saturated ground shortened lag time and raised peak discharge.",
    },
    sources: [
      {
        label: "Met Office — Flooding in Cumbria, December 2015",
        href: "https://www.metoffice.gov.uk/binaries/content/assets/metofficegovuk/pdf/weather/learn-about/uk-past-events/interesting/2015/flooding-in-cumbria-december-2015---met-office.pdf",
      },
    ],
  },
  {
    slug: "el-nino-2015",
    title: "The 2015–16 El Niño",
    place: "Tropical Pacific Ocean",
    region: "Pacific",
    labs: ["enso", "ocean-currents", "three-cell"],
    lat: -2,
    lon: -140,
    zoom: 2,
    lede: "The 2015–16 El Niño was one of the strongest on record. Warm water spread across the central and eastern tropical Pacific, and rainfall patterns shifted around the world.",
    body: [
      "During El Niño the Pacific trade winds weaken, so warm surface water that usually piles up in the west spreads eastward. Rising air and heavy rain follow the warm water. In 2015–16 this brought floods to parts of Peru and Ecuador, while Indonesia and parts of Australia became drier, and fires in Indonesia sent smoke across south-east Asia.",
      "Use the ENSO model to compare normal conditions with El Niño, then the ocean-currents model to see how winds drive surface water. Remember that ENSO changes the odds of particular weather: no two El Niño events, and no two places, respond in exactly the same way.",
    ],
    exam: {
      prompt:
        "Explain how a weakening of the Pacific trade winds during El Niño can bring floods to Peru and drought to Indonesia.",
      hint: "Link weaker trade winds to the eastward spread of warm water, then link the warm water to the position of rising air and rainfall, and its absence in the west.",
    },
    sources: [
      { label: "NOAA Climate.gov — ENSO", href: "https://www.climate.gov/enso" },
      { label: "NOAA Climate Prediction Center — ENSO diagnostic discussions" },
    ],
  },
  {
    slug: "tohoku-2011",
    title: "Tōhoku earthquake and tsunami, 2011",
    place: "North-east Honshu, Japan",
    region: "East Asia",
    labs: ["earthquakes", "tsunami", "plate-boundaries"],
    lat: 38.3,
    lon: 142.37,
    zoom: 5,
    lede: "On 11 March 2011 a magnitude 9.1 earthquake on the Japan Trench megathrust lifted the seafloor and sent a tsunami onto the coast of north-east Japan. Around 18,000 people died or are still missing.",
    body: [
      "The Pacific Plate sinks westward beneath north-east Japan at the Japan Trench. Friction had locked part of the plate boundary, and in 2011 it slipped by tens of meters over an area hundreds of kilometers long. The sudden uplift of the seafloor raised the whole depth of the ocean above it.",
      "The tsunami crossed the deep ocean as a low, fast wave, then slowed and grew in shallow water. Run-up reached around 40 m in some narrow bays. Use the plate-boundaries model to locate the subduction zone, the earthquakes model to compare seismic waves, and the tsunami model to see why the wave grows at the coast.",
    ],
    exam: {
      prompt:
        "Explain how slip on a subduction-zone megathrust generated the 2011 Tōhoku tsunami, and why the wave grew so high at the coast.",
      hint: "Link locked plates and sudden slip to vertical seafloor movement, then explain shoaling: the wave slows in shallow water and its height increases.",
    },
    sources: [
      {
        label: "USGS — M 9.1, 2011 Great Tōhoku earthquake",
        href: "https://earthquake.usgs.gov/earthquakes/eventpage/official20110311054624120_30/executive",
      },
    ],
  },
  {
    slug: "east-african-rift",
    title: "East African Rift",
    place: "Ethiopia, Kenya and Tanzania",
    region: "Africa",
    labs: ["plate-boundaries", "wilson-cycle", "volcanoes"],
    lat: -1.5,
    lon: 36.5,
    zoom: 5,
    lede: "Eastern Africa is slowly splitting apart. The East African Rift shows the first stage of a possible new ocean, with faulted valleys, rift lakes and volcanoes.",
    body: [
      "The Somali Plate and the Nubian part of the African Plate are moving apart by a few millimeters a year. As the crust stretches, blocks drop down between normal faults to form a rift valley, and magma rises to feed volcanoes such as Kilimanjaro and Ol Doinyo Lengai.",
      "In the Afar region of Ethiopia the rift meets the Red Sea and Gulf of Aden, where the sea has already flooded in. Use the plate-boundaries model to compare continental rifting with an ocean ridge, then the Wilson-cycle model to discuss whether this rift will become an ocean. Many rifts stop before they get that far.",
    ],
    exam: {
      prompt:
        "Using the East African Rift, describe the landforms produced when a continent is pulled apart.",
      hint: "Explain extension and normal faulting to form a rift valley, the rise of magma to form volcanoes, and the possibility that the rift may one day open into an ocean.",
    },
    sources: [
      {
        label: "USGS — Understanding plate motions",
        href: "https://pubs.usgs.gov/gip/dynamic/understanding.html",
      },
    ],
  },
  {
    slug: "himalaya",
    title: "Himalaya and the Tibetan Plateau",
    place: "Nepal, India, Bhutan and Tibet",
    region: "South Asia",
    labs: ["plate-boundaries", "continental-drift", "isostasy"],
    lat: 28.0,
    lon: 86.9,
    zoom: 5,
    lede: "The Himalaya are still rising as India pushes into Asia. The collision has built the world’s highest mountains and a high plateau underlain by unusually thick crust.",
    body: [
      "India moved north for tens of millions of years as the ocean in front of it was subducted. Around 50 million years ago the two continents met. Neither sinks easily, so the crust has been folded, faulted and stacked up, reaching about 70 km thick beneath Tibet. Marine limestone containing fossils now lies near the summit of Everest.",
      "India still moves north by around 4 to 5 cm a year, and the strain is released in earthquakes such as the 2015 Gorkha earthquake in Nepal. Use the plate-boundaries and continental-drift models to follow India’s journey, then the isostasy model to see why thick crust stands high.",
    ],
    exam: {
      prompt:
        "Explain why a collision between two continents builds high mountains but few volcanoes.",
      hint: "Both continents are too buoyant to subduct far, so the crust shortens and thickens instead. Without a sinking oceanic plate releasing water, little magma forms.",
    },
    sources: [
      {
        label: "USGS — The Himalayas: two continents collide",
        href: "https://pubs.usgs.gov/gip/dynamic/himalaya.html",
      },
    ],
  },
  {
    slug: "bangladesh-delta",
    title: "Ganges–Brahmaputra delta",
    place: "Bangladesh and West Bengal",
    region: "South Asia",
    labs: ["river-deposition", "storm-surge", "tropical-cyclone"],
    lat: 22.8,
    lon: 90.0,
    zoom: 6,
    lede: "The Ganges, Brahmaputra and Meghna rivers have built the world’s largest delta. Its low, flat land is fertile, but it is exposed to monsoon floods and cyclone storm surges from the Bay of Bengal.",
    body: [
      "The rivers drain the Himalaya and carry an enormous load of sediment, much of it deposited on the delta and in the Bay of Bengal. Much of Bangladesh lies only a few meters above sea level, and parts of the delta are sinking as sediments compact.",
      "The shallow, funnel-shaped Bay of Bengal can pile up very large storm surges when tropical cyclones make landfall; the 1970 Bhola cyclone was one of the deadliest natural disasters on record. Cyclone shelters and early warnings have since greatly reduced deaths. Use the river-deposition, storm-surge and tropical-cyclone models to connect the delta’s formation with its hazards.",
    ],
    exam: {
      prompt:
        "Explain why the Ganges–Brahmaputra delta is at risk from both river flooding and storm surge.",
      hint: "Link sediment deposition to low, flat land, then explain how monsoon river flow and cyclone-driven surges over a shallow bay can both raise water levels.",
    },
    sources: [
      {
        label: "NOAA — What is storm surge?",
        href: "https://oceanservice.noaa.gov/facts/stormsurge-stormtide.html",
      },
      { label: "NASA Earth Observatory — Ganges–Brahmaputra delta" },
    ],
  },
  {
    slug: "atacama",
    title: "Atacama Desert",
    place: "Northern Chile",
    region: "South America",
    labs: ["rain-shadow", "ocean-currents", "three-cell"],
    lat: -23.6,
    lon: -68.3,
    zoom: 6,
    lede: "The Atacama is one of the driest places on Earth outside the polar regions. Three separate processes keep its rain away.",
    body: [
      "First, the region lies under the subtropical high, where air sinking in the Hadley cell warms and dries. Second, the cold Humboldt Current offshore cools the air from below, making it stable, so coastal fog forms but rain clouds rarely do. Third, the Andes block moist air from the east, leaving the desert in a rain shadow.",
      "Some weather stations in the Atacama have recorded only a few millimeters of rain a year on average, with many years of none at all. Use the three-cell, ocean-currents and rain-shadow models to build a three-part explanation, and test each part against a map.",
    ],
    exam: {
      prompt: "Explain three reasons why the Atacama Desert receives so little rainfall.",
      hint: "Use sinking air in the subtropical high, the stabilizing effect of the cold Humboldt Current, and the rain shadow of the Andes.",
    },
    sources: [
      { label: "NASA Earth Observatory — Atacama Desert" },
      { label: "Dirección Meteorológica de Chile — climate records" },
    ],
  },
  {
    slug: "scotland-rebound",
    title: "Scotland’s rising coast",
    place: "Western Scotland",
    region: "UK",
    labs: ["isostasy", "glaciers"],
    lat: 55.75,
    lon: -4.9,
    zoom: 7,
    lede: "Old shorelines now stand several meters above the sea along the coasts of western Scotland. The land is still slowly rising after the weight of the last ice sheet was removed.",
    body: [
      "During the last glaciation a thick ice sheet covered Scotland and pressed the crust down into the mantle. When the ice melted, the land began to rise again, but the mantle flows so slowly that the rebound continues today, by around a millimeter or two a year in parts of western Scotland.",
      "Raised beaches, with flat terraces and old cliff lines above today’s shore, record former sea levels relative to the land. Parts of southern England, beyond the old ice margin, are slowly sinking instead. Use the isostasy model to load and unload a crustal block, then compare raised beaches with the glaciers model.",
    ],
    exam: {
      prompt:
        "Explain how raised beaches in western Scotland provide evidence of isostatic rebound.",
      hint: "Link the weight of the ice sheet to depression of the crust, then explain how slow rebound after melting lifted former shorelines above the present sea.",
    },
    sources: [
      { label: "British Geological Survey — glacial isostatic adjustment" },
      { label: "Ordnance Survey — tide gauge and GPS land-level records" },
    ],
  },
  {
    slug: "alaska-permafrost",
    title: "Thawing permafrost in Arctic Alaska",
    place: "Northern Alaska",
    region: "US",
    labs: ["periglacial", "climate-types", "carbon-cycle"],
    lat: 67.8,
    lon: -160.3,
    zoom: 5,
    lede: "Much of northern Alaska sits on permafrost, ground that stays frozen all year. As the Arctic warms, the ground is thawing, changing landscapes and releasing stored carbon.",
    body: [
      "Above the permafrost, a thin active layer thaws every summer. Repeated freezing and cracking build ice wedges that outline polygons visible from the air. Where ground ice melts, the surface can collapse into hollows and lakes, damaging roads, pipelines and buildings.",
      "The Arctic has warmed much faster than the global average. Permafrost holds a large store of frozen plant material; when it thaws, microbes can break it down and release carbon dioxide and methane. Use the periglacial model to see how ice wedges form, and the carbon-cycle model to place permafrost among Earth’s carbon stores.",
    ],
    exam: {
      prompt: "Explain how thawing permafrost can change both the landscape and the carbon cycle.",
      hint: "Link melting ground ice to subsidence and new lakes, then explain how decomposing organic matter releases greenhouse gases.",
    },
    sources: [
      {
        label: "NSIDC — Frozen ground and permafrost",
        href: "https://nsidc.org/learn/parts-cryosphere/frozen-ground-permafrost",
      },
    ],
  },
];

// Geolens is written mainly for US students, so US cases lead and UK cases follow as a secondary set.
export const REGIONS: CaseStudy["region"][] = [
  "US",
  "Shared",
  "UK",
  "East Asia",
  "South Asia",
  "Africa",
  "South America",
  "Pacific",
];

/** Cases ordered by region (US first), keeping the source order within a region. */
export const CASES_BY_REGION = [...CASES].sort(
  (a, b) => REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region),
);

export const CASE_BY_SLUG: Record<string, CaseStudy> = Object.fromEntries(
  CASES.map((c) => [c.slug, c]),
);
