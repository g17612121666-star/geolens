import { RealLandscape } from "../shared/real-landscape";

/** Great Sand Dunes from USGS data: a real dunefield piled against a mountain front. */
export default function RealGreatSandDunes() {
  return (
    <RealLandscape
      slug="aeolian"
      id="great-sand-dunes"
      depth={6}
      exaggeration={2}
      section={{ rock: "sand", soil: 0, regolith: 0.02, beds: 10 }}
      cross={{ axis: "ew", at: 0.42, label: "West–east cross-section across the dunefield" }}
      camera={[-1.6, 4.6, 6.6]}
      places={[
        {
          name: "Dunefield",
          at: { u: 0.55, v: 0.38 },
          lift: 0.25,
          tone: "sandstone",
          note: "Sand blown across the San Luis Valley by prevailing southwest winds piles up here. Storm winds from the northeast push it back, so the dunes grow taller instead of moving on: some stand more than 200 m high.",
        },
        {
          name: "Sangre de Cristo Mountains",
          at: "highest",
          lift: 0.2,
          tone: "moss",
          note: "The mountain front traps the sand. Creeks flowing out of the mountains carry sand back around the dunefield's edge, where the wind picks it up again.",
        },
        {
          name: "San Luis Valley floor",
          at: { u: 0.18, v: 0.82 },
          lift: 0.15,
          note: "Sand and silt washed from the mountains collected on this valley floor; the wind sorts out the sand and carries it toward the dunes.",
        },
      ]}
    >
      {({ lo, hi }) =>
        `Real USGS elevation for Great Sand Dunes, Colorado, the tallest dunes in North America. The red line crosses the dunefield from west to east, from about ${Math.round(lo).toLocaleString("en-US")} m to ${Math.round(hi).toLocaleString("en-US")} m above sea level. Compare its ridges with the barchan model: here, winds from two directions pile sand into a large dunefield.`
      }
    </RealLandscape>
  );
}
