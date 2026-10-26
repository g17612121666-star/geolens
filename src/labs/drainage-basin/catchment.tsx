import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { CatchmentLandscape } from "../shared/catchment-landscape";
import { catchmentHeight } from "../shared/catchment-height";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Line } from "@react-three/drei";
import { Tag } from "../shared/kit";

// Drainage divide drawn just inside the block edge and lifted clear of the trees, so it reads as
// a ridge-top line rather than the rim of the model. It is open at the outlet end.
const divide: [number, number, number][] = [
  ...Array.from({ length: 33 }, (_, i) => [2 - (i / 32) * 3.94, 1.55] as const),
  ...Array.from({ length: 33 }, (_, i) => [-1.94, 1.55 - (i / 32) * 3.1] as const),
  ...Array.from({ length: 33 }, (_, i) => [-1.94 + (i / 32) * 3.94, -1.55] as const),
].map(([x, z]) => [x, catchmentHeight(x, z) + 0.06, z]);
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
        note: "A stream that joins a larger river.",
      },
      {
        p: [0, catchmentHeight(0, 0) + 0.25, 0] as [number, number, number],
        name: "Confluence",
        note: "The place where two channels join.",
      },
      {
        p: [2, catchmentHeight(2, 0) + 0.25, 0] as [number, number, number],
        name: "Outlet",
        note: "Water leaves the catchment here. A river’s mouth is where it enters a lake, the sea or a larger river.",
      },
    ];
  return (
    <>
      <ScienceStudio
        slug="drainage-basin"
        scale="Idealized surface catchment · relief, channels and vegetation enlarged"
        trueScale="Shows how the catchment fits together · not a surveyed elevation model"
        camera={[3, 3.8, 5]}
      >
        <CatchmentLandscape />
        {params.overlay > 0.5 && <Line points={divide} color="#ffc93c" lineWidth={4} />}
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
        {params.overlay > 0.5
          ? "The gold line is the surface drainage divide: all the land inside it drains to the outlet, not just the blue channel. Groundwater divides can differ."
          : "Turn on Basin overlay to see the drainage divide. All the land inside it drains to the outlet, not just the blue channel."}
      </ScienceReadout>
    </>
  );
}
