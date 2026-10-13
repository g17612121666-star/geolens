import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { CatchmentLandscape, catchmentHeight } from "../shared/catchment-landscape";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
export default function DrainageBasin() {
  const { params, t } = useLabControls();
  useLabTick(1 / 20);
  const x = -2 + t * 4,
    focus = Math.round(params.feature ?? 0),
    parts = [
      {
        p: [-1.8, catchmentHeight(-1.8, 0) + 0.25, 0] as [number, number, number],
        name: "Source",
        note: "The beginning of this channel. Real headwaters can be springs, wet ground, snow or glacier melt.",
      },
      {
        p: [-1, catchmentHeight(-1, 0.7) + 0.25, 0.7] as [number, number, number],
        name: "Tributary",
        note: "A stream that joins another river.",
      },
      {
        p: [0, catchmentHeight(0, 0) + 0.25, 0] as [number, number, number],
        name: "Confluence",
        note: "The place where two channels join.",
      },
      {
        p: [2, catchmentHeight(2, 0) + 0.25, 0] as [number, number, number],
        name: "Outlet",
        note: "Water leaves this catchment at its outlet. A river mouth is where it enters a lake, sea or another receiving water body.",
      },
    ];
  return (
    <>
      <ScienceStudio
        slug="drainage-basin"
        scale="Idealised surface catchment · relief, channels and vegetation enlarged"
        trueScale="Catchment topology is shown; this is not a surveyed elevation model"
        camera={[3, 3.8, 5]}
      >
        <CatchmentLandscape divide={params.overlay > 0.5} />
        <Tag
          pos={parts[focus].p}
          text={parts[focus].name}
          note={parts[focus].note}
          occlude={false}
        />
        <mesh
          position={
            focus === 1 && t < 0.5
              ? [
                  -1.7 + t * 3.4,
                  catchmentHeight(-1.7 + t * 3.4, 1.2 * (1 - t * 2)) + 0.045,
                  1.2 * (1 - t * 2),
                ]
              : [
                  focus === 1 ? (t - 0.5) * 4 : x,
                  catchmentHeight(focus === 1 ? (t - 0.5) * 4 : x, 0) + 0.045,
                  0,
                ]
          }
        >
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color="#dbf4f8" />
        </mesh>
      </ScienceStudio>
      <ScienceReadout>
        <strong>{parts[focus].name}.</strong> {parts[focus].note}{" "}
        {
          "Gold follows the surface divide; the whole enclosed land area contributes, not just the blue channel. Groundwater divides may differ."
        }
      </ScienceReadout>
    </>
  );
}
