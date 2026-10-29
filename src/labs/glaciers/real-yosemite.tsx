import { RealLandscape } from "../shared/real-landscape";

/** Yosemite Valley from USGS data: the real U-shaped valley beside the glacier model. */
export default function RealYosemite() {
  return (
    <RealLandscape
      slug="glaciers"
      id="yosemite-valley"
      depth={4.6}
      section={{ rock: "granite", soil: 0.01, regolith: 0.03, beds: 4 }}
      // North–south through Yosemite Village (−119.585°), at the middle of the block.
      cross={{ axis: "ns", at: 0.5, label: "North–south cross-section across Yosemite Valley" }}
      places={[
        {
          name: "El Capitan",
          at: { lat: 37.734, lon: -119.6377 },
          lift: 0.12,
          note: "A granite wall about 900 m high. Glacier ice deepened the valley and steepened its sides.",
        },
        {
          name: "Half Dome",
          at: { lat: 37.7459, lon: -119.5332 },
          note: "Its sheer northwest face comes mostly from rock breaking away along vertical joints; the ice did not reach its summit.",
        },
        {
          name: "Yosemite Falls · hanging valley",
          at: { lat: 37.7568, lon: -119.5966 },
          lift: 0.55,
          note: "Yosemite Creek's side valley was left high above the main valley after the glacier cut it deeper, so the creek now drops over the cliff.",
        },
        {
          name: "U-shaped valley floor",
          at: { lat: 37.742, lon: -119.585 },
          lift: 0.12,
          tone: "glacier",
          note: "Ice widened and deepened a river valley into this broad U. The flat floor is sediment that filled a lake after the ice melted.",
        },
      ]}
    >
      {({ lo, hi }) =>
        `Real USGS elevation for Yosemite Valley, California. The red line crosses the valley from north to south; its profile shows the U shape that glaciers carved during the ice ages. Floor about ${Math.round(lo).toLocaleString("en-US")} m, rim up to ${Math.round(hi).toLocaleString("en-US")} m above sea level.`
      }
    </RealLandscape>
  );
}
