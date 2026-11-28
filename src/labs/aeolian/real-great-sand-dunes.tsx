import { RealLandscape } from "../shared/real-landscape";
import { useT } from "@/lib/i18n";

/** Great Sand Dunes from USGS data: a real dunefield piled against a mountain front. */
export default function RealGreatSandDunes() {
  const tr = useT();
  return (
    <RealLandscape
      slug="aeolian"
      id="great-sand-dunes"
      depth={6}
      exaggeration={2}
      section={{ rock: "sand", soil: 0, regolith: 0.02, beds: 10 }}
      cross={{ axis: "ew", at: 0.42, label: tr("West–east cross-section across the dunefield") }}
      camera={[-1.6, 4.6, 6.6]}
      places={[
        {
          name: tr("Dunefield"),
          at: { u: 0.55, v: 0.38 },
          lift: 0.25,
          tone: "sandstone",
          note: tr(
            "Sand blown across the San Luis Valley by prevailing southwest winds piles up here. Storm winds from the northeast push it back, so the dunes grow taller instead of moving on: some stand more than 200 m high.",
          ),
        },
        {
          name: tr("Sangre de Cristo Mountains"),
          at: "highest",
          lift: 0.2,
          tone: "moss",
          note: tr(
            "The mountain front traps the sand. Creeks flowing out of the mountains carry sand back around the dunefield's edge, where the wind picks it up again.",
          ),
        },
        {
          name: tr("San Luis Valley floor"),
          at: { u: 0.18, v: 0.82 },
          lift: 0.15,
          note: tr(
            "Sand and silt washed from the mountains collected on this valley floor; the wind sorts out the sand and carries it toward the dunes.",
          ),
        },
      ]}
    >
      {({ lo, hi }) =>
        tr(
          "Real USGS elevation for Great Sand Dunes, Colorado, the tallest dunes in North America. The red line crosses the dunefield from west to east, from about {lo} m to {hi} m above sea level. Compare its ridges with the barchan model: here, winds from two directions pile sand into a large dunefield.",
          {
            lo: Math.round(lo).toLocaleString("en-US"),
            hi: Math.round(hi).toLocaleString("en-US"),
          },
        )
      }
    </RealLandscape>
  );
}
