import { useLabControls } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabTick } from "@/labs/tick";
import { freezingJoint, calciteDissolution } from "@/lib/weathering-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { landscapeNoise } from "../shared/landscape-noise";
import { Tag } from "../shared/kit";
import { AIR_STONE, BLOCK, BLOCK_Y, ION_COLORS } from "./outcrop";
import {
  BlockFoot,
  Callout,
  CarbonDioxideBubbler,
  GlassTank,
  GroundFrost,
  IonCloud,
  JointFill,
  JointRoots,
  JointTree,
  LabBench,
  OutcropBlock,
  PittedLimestone,
  SurfaceRoots,
} from "./parts";

const MODES = ["Freezing in a joint", "Carbonate dissolution", "Root growth"];
type V3 = [number, number, number];
type CalloutSpec = {
  n: number;
  anchor: V3;
  at: V3;
  text: string;
  tone?: "ice" | "glacier" | "moss";
  note: string;
};
const GROUND = { width: 2.6, depth: 2 };
/** The ground around the outcrop: nearly level, just below the blocks' visible base. */
const groundHeight = (x: number, z: number) => 0.012 * (landscapeNoise(x * 4 + 3, z * 4) - 0.5);
const groundColor = (x: number, _y: number, z: number) =>
  landscapeNoise(x * 3, z * 3) > 0.55 ? "#6f8a49" : "#7f9752";
const GROUND_SECTION = {
  rock: "sandstone",
  soil: 0.08,
  regolith: 0.12,
  beds: 5.5,
  bedOffset: 0.2,
} as const;

export default function Weathering() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const mode = Math.round(params.method ?? 0),
    ice = freezingJoint(t),
    dissolve = calciteDissolution(t),
    enlarge = trueScale ? 1 : 10,
    gap = mode === 0 ? (0.02 + (ice.jointWidth - 0.02) * enlarge) * 2 : 0.06 + 0.16 * t;
  const frozenHeight = (1.4 * ice.iceVolume) / (ice.iceVolume + ice.liquidVolume),
    liquidHeight = 1.4 - frozenHeight;
  // Root geometry is rebuilt in steps as the tree grows, not on every frame.
  const growth = Math.round(t * 40) / 40,
    rootGap = 0.06 + 0.16 * growth;
  const frost = mode === 0 ? 0.2 + 0.7 * t : 0;
  // Labels for narrow features sit beside them with a leader line; numbered on phones.
  const compact = useIsCompact();
  const callouts: CalloutSpec[] =
    mode === 1
      ? [
          {
            n: 1,
            anchor: [AIR_STONE.x, 0.7, AIR_STONE.z],
            at: [-1.6, 1.0, 0.1],
            text: "Carbon dioxide bubbled in",
            note: "Carbon dioxide dissolves in the water and forms weak carbonic acid. Outdoors it comes from the air and, in much larger amounts, from soil air, where roots and microbes respire.",
          },
        ]
      : mode === 0
        ? [
            ...(frozenHeight > 0.14
              ? [
                  {
                    n: 1,
                    anchor: [0, liquidHeight + frozenHeight / 2, 0.5] as V3,
                    at: [-0.66, liquidHeight + frozenHeight / 2 + 0.12, 0.66] as V3,
                    text: "Ice",
                    tone: "ice" as const,
                    note: "Freezing starts at the top of the joint, where it meets the cold air, so ice seals in the water below. The ice takes up about 9% more room than the water it came from.",
                  },
                ]
              : []),
            ...(liquidHeight > 0.14
              ? [
                  {
                    n: 2,
                    anchor: [0, liquidHeight / 2, 0.5] as V3,
                    at: [0.66, liquidHeight / 2 - 0.08, 0.66] as V3,
                    text: "Liquid water",
                    tone: "glacier" as const,
                    note: "The joint holds a fixed 7.00 kg of water. As more of it turns to ice, the total volume grows and the walls move apart.",
                  },
                ]
              : []),
          ]
        : [
            {
              n: 1,
              anchor: [0, 0.98, 0.5],
              at: [0.68, 0.55, 0.66],
              text: "Root wedged in the joint",
              tone: "moss",
              note: "A root that grows into a crack is squeezed flat between the walls. As it thickens, it presses on both walls.",
            },
          ];
  return (
    <>
      <ScienceStudio
        horizon
        slug="weathering"
        camera={[2.6, 1.9, 6]}
        scale={
          mode === 0
            ? "Joint widening exaggerated ×10 · joint starts 20 mm wide · water mass fixed"
            : mode === 1
              ? "Calcite sphere starts with a 0.3 m radius · dissolution is shown, not a calculated rate · pits, bubbles and ion dots are drawn"
              : "Root and tree growth in an existing joint are drawn, not calculated · 1 scene unit = 0.5 m"
        }
        trueScale={
          mode === 0
            ? "Joint widening at true scale · 1 scene unit = 0.5 m · joint starts 20 mm wide"
            : mode === 1
              ? "This view has no exaggeration · 1 scene unit = 0.5 m · ion dots are symbols, not real sizes"
              : "This view has no exaggeration · 1 scene unit = 0.5 m · root growth is drawn, not calculated"
        }
      >
        {mode === 1 ? (
          <>
            <LabBench />
            <PittedLimestone radius={dissolve.radius * 2} pitting={Math.round(t * 20) / 20} />
            <IonCloud t={t} />
            <CarbonDioxideBubbler />
            <GlassTank />
            <Tag
              pos={[0, 1.95, 0]}
              text="Dissolved ions leave the solid"
              note="Calcite reacts with carbon dioxide and water to give dissolved calcium and bicarbonate. The dots are symbols; they do not show real ion sizes, numbers or concentrations."
              occlude={false}
            />
          </>
        ) : (
          <>
            {([-1, 1] as const).map((side) => (
              <group key={side} position={[side * (BLOCK.width / 2 + gap / 2), BLOCK_Y, 0]}>
                <OutcropBlock
                  side={side}
                  half={gap / 2}
                  frost={frost}
                  moss={mode === 2 ? 0.85 : 0.25}
                />
                <BlockFoot side={side} frost={frost} />
                {mode === 2 && <SurfaceRoots side={side} growth={growth} />}
              </group>
            ))}
            {mode === 0 ? (
              <>
                {t < 1 && <JointFill kind="water" width={gap * 0.97} from={0} to={liquidHeight} />}
                {t > 0 && (
                  <JointFill kind="ice" width={gap * 0.97} from={liquidHeight} to={1.395} />
                )}
                <Tag
                  pos={[0, 1.95, 0]}
                  text={`${(t * 100).toFixed(0)}% of water mass frozen`}
                  note="Water takes up about 9% more volume as ice. Here the joint walls simply move apart; real cracking depends on confinement, water supply and rock strength. Ice lenses fed by migrating water (ice segregation) also break rock."
                  occlude={false}
                />
              </>
            ) : (
              <>
                <JointRoots gap={rootGap} />
                <JointTree gap={rootGap} growth={growth} />
                <Tag
                  pos={[0, 3.35, 0]}
                  text="Root growth can widen an existing joint"
                  note="The root and the moving walls are drawn, not calculated from growth rates or forces. Roots, microbes and lichens also weather rock chemically."
                  occlude={false}
                />
              </>
            )}
            {t > 0 &&
              [-1, 1].map((side) => (
                <Arrow
                  key={side}
                  from={[side * 0.1, 0.7, 0.72]}
                  to={[side * (0.28 + 0.18 * t), 0.7, 0.72]}
                  color="#bed5d5"
                  width={1}
                />
              ))}
            <group position={[0, -0.006, 0]}>
              <GeomorphicTerrain
                height={groundHeight}
                color={groundColor}
                width={GROUND.width}
                depth={GROUND.depth}
                base={-0.5}
                resolution={64}
                section={GROUND_SECTION}
              />
              <GroundFrost
                frost={frost}
                height={groundHeight}
                width={GROUND.width}
                depth={GROUND.depth}
              />
            </group>
          </>
        )}
        {callouts.map((c) => (
          <Callout
            key={c.n}
            anchor={c.anchor}
            at={c.at}
            tone={c.tone}
            note={c.note}
            text={compact ? String(c.n) : c.text}
            title={compact ? `${c.n} · ${c.text}` : undefined}
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {compact && callouts.length > 0 && (
          <div className="mb-2 text-chalk">
            {callouts.map((c) => `${c.n} · ${c.text}`).join(" · ")}
          </div>
        )}
        {MODES[mode]}.{" "}
        {mode === 0
          ? `Actual joint ${(ice.jointWidth * 1000).toFixed(2)} mm · liquid ${(ice.liquidVolume * 1000).toFixed(2)} L + ice ${(ice.iceVolume * 1000).toFixed(2)} L = ${((ice.liquidVolume + ice.iceVolume) * 1000).toFixed(2)} L, from 7.00 kg water (7.00 L as liquid).`
          : mode === 1
            ? `Solid calcite ${dissolve.remainingMass.toFixed(1)} kg · dissolved calcite equivalent ${dissolve.dissolvedMass.toFixed(1)} kg.`
            : "Mechanical: as Process runs, the root thickens and widens the existing joint; both rock pieces stay in place. Chemical (not drawn): acids from roots, microbes and lichens alter minerals on the joint walls."}
        {mode === 1 && (
          <>
            {" "}
            <span className="formula">{"CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻."}</span>{" "}
            <span aria-hidden="true" style={{ color: ION_COLORS.calcium }}>
              ●
            </span>{" "}
            Ca²⁺{" "}
            <span aria-hidden="true" style={{ color: ION_COLORS.bicarbonate }}>
              ●
            </span>{" "}
            HCO₃⁻ (symbols only).
          </>
        )}{" "}
        <br />
        {
          "Play shows the order of change, not elapsed years. Weathering changes rock in place; erosion carries the material away. The model does not predict when the rock breaks."
        }
      </ScienceReadout>
    </>
  );
}
