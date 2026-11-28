import { RealLandscape } from "../shared/real-landscape";
import { useT } from "@/lib/i18n";

/** The Grand Canyon from USGS data: a river cutting down into a rising plateau. */
export default function RealGrandCanyon() {
  const tr = useT();
  return (
    <RealLandscape
      slug="river-erosion"
      id="grand-canyon"
      depth={6}
      section={{ rock: "sandstone", soil: 0.01, regolith: 0.02, beds: 14 }}
      cross={{
        axis: "ns",
        at: 0.62,
        label: tr("North–south cross-section across the Grand Canyon"),
      }}
      camera={[2.6, 4.4, 6.6]}
      places={[
        {
          name: tr("Colorado River"),
          at: "lowest",
          lift: 0.5,
          tone: "glacier",
          note: tr(
            "The river has cut about 1.5 km down into the Colorado Plateau over roughly the last 5 to 6 million years, carrying the eroded rock away downstream.",
          ),
        },
        {
          name: tr("South Rim · Grand Canyon Village"),
          at: { lat: 36.0573, lon: -112.1392 },
          lift: 0.2,
          note: tr("The flat, forested plateau surface. Its edge is the canyon rim."),
        },
        {
          name: tr("Side canyons and buttes"),
          at: { u: 0.12, v: 0.12 },
          lift: 0.15,
          tone: "sandstone",
          note: tr(
            "Side streams and weathering widen the canyon. Hard layers form cliffs; softer layers wear back into slopes, giving the stepped walls.",
          ),
        },
      ]}
    >
      {({ lo, hi }) =>
        tr(
          "Real USGS elevation for the Grand Canyon near Grand Canyon Village, Arizona. The red line crosses the canyon from north to south: the river sits about {lo} m above sea level, the rims rise to about {hi} m. A river that keeps cutting down while the land rises makes a deep canyon rather than a wide valley.",
          {
            lo: Math.round(lo).toLocaleString("en-US"),
            hi: Math.round(hi).toLocaleString("en-US"),
          },
        )
      }
    </RealLandscape>
  );
}
