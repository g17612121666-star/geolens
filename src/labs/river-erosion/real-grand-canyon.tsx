import { RealLandscape } from "../shared/real-landscape";

/** The Grand Canyon from USGS data: a river cutting down into a rising plateau. */
export default function RealGrandCanyon() {
  return (
    <RealLandscape
      slug="river-erosion"
      id="grand-canyon"
      depth={6}
      section={{ rock: "sandstone", soil: 0.01, regolith: 0.02, beds: 14 }}
      cross={{ axis: "ns", at: 0.62, label: "North–south cross-section across the Grand Canyon" }}
      camera={[2.6, 4.4, 6.6]}
      places={[
        {
          name: "Colorado River",
          at: "lowest",
          lift: 0.5,
          tone: "glacier",
          note: "The river has cut about 1.5 km down into the Colorado Plateau over roughly the last 5 to 6 million years, carrying the eroded rock away downstream.",
        },
        {
          name: "South Rim · Grand Canyon Village",
          at: { lat: 36.0573, lon: -112.1392 },
          lift: 0.2,
          note: "The flat, forested plateau surface. Its edge is the canyon rim.",
        },
        {
          name: "Side canyons and buttes",
          at: { u: 0.12, v: 0.12 },
          lift: 0.15,
          tone: "sandstone",
          note: "Side streams and weathering widen the canyon. Hard layers form cliffs; softer layers wear back into slopes, giving the stepped walls.",
        },
      ]}
    >
      {({ lo, hi }) =>
        `Real USGS elevation for the Grand Canyon near Grand Canyon Village, Arizona. The red line crosses the canyon from north to south: the river sits about ${Math.round(lo).toLocaleString("en-US")} m above sea level, the rims rise to about ${Math.round(hi).toLocaleString("en-US")} m. A river that keeps cutting down while the land rises makes a deep canyon rather than a wide valley.`
      }
    </RealLandscape>
  );
}
