import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import {
  REAL_TERRAIN_CREDIT,
  RealTerrainBlock,
  siteFrame,
  useRealHeights,
  type MetersAt,
  type RealSiteId,
} from "../shared/real-terrain";

/** Both blocks share one scale: 10 km of ground per scene unit, heights from sea level. */
const KM_PER_UNIT = 10;
const VOLCANOES = [
  {
    id: "mauna-loa" as RealSiteId,
    depthKm: 44,
    x: -0.8,
    label: "Mauna Loa · shield volcano",
    note: "Runny basalt lava flows a long way before it cools, building broad slopes of only about 4–8°. Mauna Loa also rises about 5 km from the sea floor, so it is taller than it looks here.",
    tone: "magma" as const,
  },
  {
    id: "st-helens" as RealSiteId,
    depthKm: 12,
    x: 3.3,
    label: "Mount St. Helens · composite cone",
    note: "Sticky, gas-rich magma and ash build steeper slopes. The 1980 eruption removed the north side, leaving the horseshoe crater.",
    tone: "sandstone" as const,
  },
];

function Volcano({
  v,
  meters,
  exaggeration,
}: {
  v: (typeof VOLCANOES)[number];
  meters: MetersAt;
  exaggeration: number;
}) {
  const width = REAL_SITE_WIDTH[v.id] / KM_PER_UNIT,
    depth = v.depthKm / KM_PER_UNIT,
    frame = siteFrame(v.id, width, depth),
    k = exaggeration / frame.metersPerUnit,
    // Label the highest point of the block (the summit at this data resolution).
    peak = (() => {
      let best = { x: 0, z: 0, m: -Infinity };
      for (let i = 0; i <= 96; i++)
        for (let j = 0; j <= 96; j++) {
          const px = (i / 96 - 0.5) * width,
            pz = (j / 96 - 0.5) * depth,
            m = meters(...frame.uv(px, pz));
          if (m > best.m) best = { x: px, z: pz, m };
        }
      return best;
    })(),
    { x, z, m: top } = peak;
  return (
    <group position={[v.x, 0, 0]}>
      <RealTerrainBlock
        id={v.id}
        meters={meters}
        width={width}
        depth={depth}
        exaggeration={exaggeration}
        datum={0}
        base={-0.12}
        n={v.id === "mauna-loa" ? 192 : 128}
        section={{ rock: "shale", soil: 0.01, regolith: 0.02, beds: 10 }}
      />
      <Tag
        pos={[x, top * k + 0.25, z]}
        text={`${v.label} · about ${(Math.round(top / 10) * 10).toLocaleString("en-US")} m`}
        note={v.note}
        tone={v.tone}
        occlude={false}
      />
    </group>
  );
}
const REAL_SITE_WIDTH: Record<string, number> = { "mauna-loa": 60, "st-helens": 12 };

export default function RealVolcanoes() {
  const { trueScale } = useLabControls();
  const loa = useRealHeights("mauna-loa"),
    helens = useRealHeights("st-helens");
  const exaggeration = trueScale ? 1 : 3;
  const ready = loa && helens;
  return (
    <>
      <ScienceStudio
        fitKey={ready ? "ready" : "loading"}
        slug="volcanoes"
        scale={`Real terrain at one scale (1 unit = 10 km) · heights from sea level ×3 · ${REAL_TERRAIN_CREDIT}`}
        trueScale={`Real terrain at one scale: 1 unit = 10 km in all directions · ${REAL_TERRAIN_CREDIT}`}
        camera={[1.2, 3.4, 6.6]}
      >
        {ready ? (
          <group position={[-0.6, -0.3, 0]}>
            <Volcano v={VOLCANOES[0]} meters={loa} exaggeration={exaggeration} />
            <Volcano v={VOLCANOES[1]} meters={helens} exaggeration={exaggeration} />
          </group>
        ) : (
          <Tag pos={[0, 0.3, 0]} text="Loading USGS elevation…" occlude={false} />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {
          "Two real volcanoes from USGS elevation data, drawn at the same scale. Mauna Loa's block is 60 km wide; Mount St. Helens' is 12 km. Runny basalt builds the huge, gentle shield; sticky, gas-rich magma builds the much smaller, steeper composite cone. Turn off “Real volcanoes” to experiment with viscosity and gas."
        }
      </ScienceReadout>
    </>
  );
}
