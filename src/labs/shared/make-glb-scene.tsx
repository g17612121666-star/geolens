import { LabStudio } from "@/labs/shared/studio";
import { GlbRig } from "@/labs/shared/glb";
import { GenericFallback } from "@/labs/shared/fallback";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { StudioFloor } from "@/labs/shared/kit";

const EXAG: Record<
  string,
  { text: string; cam: [number, number, number]; target?: [number, number, number] }
> = {
  coasts: { text: "Vertical exaggeration ×6 · click T for true beach slope", cam: [1.4, 2.1, 7.2] },
  volcanoes: {
    text: "Slope is honest. Size is not. Column only when magma is sticky.",
    cam: [3.2, 2.2, 7.4],
  },
  glaciers: {
    text: "Ice and rock drawn ×6 true relative relief. T collapses thickness.",
    cam: [2.4, 2.6, 7.8],
  },
  "earth-interior": {
    text: "Crust drawn ×4 true thickness. T collapses it to a 35 km film.",
    cam: [2.8, 1.1, 2.5],
  },
  earthquakes: {
    text: "Bedding offset is the slip. T does not invent a focus ball.",
    cam: [2.6, 2.0, 5.5],
  },
  rivers: {
    text: "Vertical exaggeration ×12 on the long profile. Click T to flatten.",
    cam: [0.4, 2.4, 7.2],
  },
  karst: { text: "Vertical exaggeration ×6 · limestone pavement and doline", cam: [2.4, 2.2, 6.4] },
  "soil-profile": {
    text: "Pit face is the profile. Horizons have thickness; E can be missing.",
    cam: [2.2, 1.6, 5.4],
  },
  seasons: {
    text: "Orbit radius is shrunk so Earth is readable. Tilt is true.",
    cam: [0.2, 2.4, 6.8],
  },
  contours: { text: "Same hill as the contour map. Interval is a slider.", cam: [2.6, 2.8, 6.6] },
};

export function makeGlbScene(slug: string) {
  return function GlbLabScene() {
    const lab = LAB_BY_SLUG[slug];
    const title = lab?.title ?? slug;
    const meta = EXAG[slug];
    return (
      <LabStudio
        slug={slug}
        title={title}
        camera={{ position: meta?.cam ?? [3.2, 2.2, 6.8], fov: 38 }}
        exaggeration={
          meta?.text ?? "Classroom scale. T collapses teaching exaggeration where it exists."
        }
        liveText={lab?.hook ?? title}
        fallback={<GenericFallback slug={slug} title={title} />}
        minDistance={2.2}
        maxDistance={18}
        target={meta?.target ?? [0, 0.3, 0]}
      >
        <StudioFloor size={14} />
        <GlbRig slug={slug} />
      </LabStudio>
    );
  };
}
