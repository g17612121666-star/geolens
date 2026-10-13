import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { ReconstructionGlobe, PlateLines } from "../shared/geo-globe";
import { PlateSection } from "../shared/plate-section";
import { Graticule, CityMarker } from "@/components/globe/earth";
import { Tag } from "../shared/kit";
import { latLonToXYZ } from "@/lib/geo";
export default function Plates() {
  const { params } = useLabControls();
  useLabTick(1 / 16);
  const age = params.ageMa ?? 0,
    section = params.section > 0.5,
    kind = Math.round(params.boundary ?? 0),
    hotspot = params.hotspot > 0.5;
  return (
    <>
      <ScienceStudio
        slug="plate-boundaries"
        scale={
          section
            ? "Schematic cross-section · arrows show relative motion"
            : "Globe to scale · boundaries from Bird PB2002 · reconstructed coastlines from GPlates"
        }
        trueScale={
          section
            ? "Schematic cross-section · no measured length or speed scale"
            : "Spherical geometry unchanged · marker sizes enlarged for legibility"
        }
        camera={section ? [3.5, 2.3, 6.5] : [2.8, 1.2, 3.8]}
      >
        {section ? (
          <PlateSection kind={kind} />
        ) : (
          <group rotation={[0, Math.PI, 0]}>
            <ReconstructionGlobe age={age} />
            <Graticule radius={1.255} />
            {age < 5 && <PlateLines />}
            {hotspot && age < 5 && (
              <>
                <CityMarker lat={19.4} lon={-155.3} radius={1.26} color="#f99c75" />
                <Tag
                  pos={latLonToXYZ(19.4, -155.3, 1.4)}
                  text="Hawaii hotspot"
                  note="Young volcanism at the southeastern end of the Hawaiian chain. Older islands extend northwest as the Pacific plate moves relative to the hotspot."
                />
              </>
            )}
          </group>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {section ? (
          [
            "The plates separate, allowing new oceanic crust to form at the ridge.",
            "An oceanic plate descends beneath another plate at this convergent boundary.",
            "The plates slide past one another along a transform boundary.",
          ][kind]
        ) : age < 5 ? (
          <>
            <p>Present-day plate boundaries</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              {[
                { name: "Divergent", colour: "#69dfce" },
                { name: "Convergent", colour: "#f39676" },
                { name: "Transform", colour: "#e5ca85" },
              ].map((item) => (
                <span key={item.name} className="rounded-lg border border-white/15 px-2 py-2">
                  <span
                    className="mr-2 inline-block h-2 w-3 rounded-full"
                    style={{ backgroundColor: item.colour }}
                  />
                  {item.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          `Continental positions ${Math.round(age / 10) * 10} million years ago. Move towards the present to compare how the continents have shifted.`
        )}
        {hotspot && age >= 5 && !section && " Return to the present to locate Hawaii."}
        <br />
        {section
          ? "Arrows show relative plate motion. Compare the section with the surface pattern on the globe."
          : "The older views carry modern coastlines backwards using a plate reconstruction; past sea levels and shorelines also differed."}
      </ScienceReadout>
    </>
  );
}
