import { useLabControls } from "@/lib/store/lab-controls";
import { ReconstructionGlobe } from "../shared/geo-globe";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Graticule } from "@/components/globe/earth";
export default function ContinentalDrift() {
  const { params } = useLabControls(),
    age = params.ageMa ?? 200;
  return (
    <>
      <ScienceStudio
        slug="continental-drift"
        scale="GPlates MULLER2019 · 10 Ma snapshots · modern coastline shapes reconstructed"
        trueScale="Spherical globe · no invented continent trajectories"
        camera={[2.8, 1.2, 3.8]}
      >
        <group rotation={[0, Math.PI, 0]}>
          <ReconstructionGlobe age={age} />
          <Graticule radius={1.255} />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <p>Continental positions {Math.round(age / 10) * 10} million years ago.</p>
        <p className="mt-2">
          {params.fossils > 0.5
            ? "Mesosaurus fossils occur in southern Africa and South America. Matching rock belts and glacial deposits provide further evidence of earlier connections."
            : "Move towards 200–250 million years ago to examine Pangaea, then rotate the globe to compare continental positions."}
        </p>
        <br />
        The reconstruction moves modern coastlines; ancient shorelines also changed with sea level
        and landscape development.
      </ScienceReadout>
    </>
  );
}
