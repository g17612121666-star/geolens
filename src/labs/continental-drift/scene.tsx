import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ReconstructionGlobe } from "../shared/geo-globe";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Graticule } from "@/components/globe/earth";
import { latLonToXYZ } from "@/lib/geo";
import FOSSILS from "./fossil-sites.json";

const TAXON_COLOUR: Record<string, string> = {
  mesosaurus: "#5fe3d0",
  glossopteris: "#a6dc6a",
  lystrosaurus: "#f3b25a",
  cynognathus: "#f3868c",
};

const BASE = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

function siteIndex(age: number) {
  return Math.max(0, FOSSILS.ages.indexOf(Math.max(0, Math.min(250, Math.round(age / 10) * 10))));
}

/** Turns the globe so the fossil sites face the viewer while the overlay is on. */
function FacingGlobe({
  age,
  focus,
  children,
}: {
  age: number;
  focus: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera, invalidate } = useThree();
  const target = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => {
    if (!focus) {
      target.copy(BASE);
    } else {
      const sum = new THREE.Vector3();
      for (const taxon of FOSSILS.taxa)
        for (const site of taxon.sites) {
          const [lat, lon] = site.positions[siteIndex(age)];
          sum.add(new THREE.Vector3(...latLonToXYZ(lat, lon, 1)));
        }
      // Spin about the polar axis, then tilt towards the viewer, so north never rolls sideways.
      const local = sum.normalize().applyQuaternion(BASE);
      const view = camera.position.clone().normalize();
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(view.x, view.z) - Math.atan2(local.x, local.z),
      );
      const turned = local.clone().applyQuaternion(yaw);
      const pitch = new THREE.Quaternion().setFromUnitVectors(turned, view);
      target.copy(pitch.multiply(yaw).multiply(BASE));
    }
    invalidate();
  }, [focus, age, camera, target, invalidate]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g || g.quaternion.angleTo(target) < 0.001) return;
    g.quaternion.rotateTowards(
      target,
      Math.max(0.02, g.quaternion.angleTo(target) * Math.min(1, dt * 4)),
    );
    invalidate();
  });
  return (
    <group ref={group} quaternion={BASE}>
      {children}
    </group>
  );
}

/** Representative fossil localities, rotated with the same plate model as the coastlines. */
function FossilSites({ age }: { age: number }) {
  const index = siteIndex(age);
  return (
    <group>
      {FOSSILS.taxa.flatMap((taxon) =>
        taxon.sites.map((site) => {
          const [lat, lon] = site.positions[index];
          const colour = TAXON_COLOUR[taxon.key];
          return (
            <group key={`${taxon.key}-${site.label}`} position={latLonToXYZ(lat, lon, 1.262)}>
              <mesh>
                <sphereGeometry args={[0.026, 20, 14]} />
                <meshBasicMaterial color={colour} toneMapped={false} />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.045, 20, 14]} />
                <meshBasicMaterial
                  color={colour}
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
}
export default function ContinentalDrift() {
  const { params, setParam } = useLabControls(),
    age = params.ageMa ?? 200;
  return (
    <>
      <ScienceStudio
        slug="continental-drift"
        scale="GPlates MULLER2019 · 10 Ma snapshots · modern coastlines moved back in time"
        trueScale="Globe to scale · positions shown only at reconstructed 10 Ma steps"
        camera={[2.8, 1.2, 3.8]}
      >
        <FacingGlobe age={age} focus={params.fossils > 0.5}>
          <ReconstructionGlobe age={age} />
          <Graticule radius={1.255} />
          {params.fossils > 0.5 && <FossilSites age={age} />}
        </FacingGlobe>
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto mb-2 flex flex-wrap justify-center gap-1">
          {[
            { ma: 0, label: "Today" },
            { ma: 66, label: "66 Ma · K–Pg" },
            { ma: 150, label: "150 Ma · Atlantic opens" },
            { ma: 200, label: "200 Ma · break-up" },
            { ma: 250, label: "250 Ma · Pangaea" },
          ].map((step) => (
            <button
              key={step.ma}
              type="button"
              aria-pressed={Math.round(age / 10) * 10 === step.ma}
              onClick={() => setParam("ageMa", step.ma)}
              className={`min-h-11 rounded-lg border px-2 text-xs ${Math.round(age / 10) * 10 === step.ma ? "border-glacier text-chalk" : "border-white/10 text-mist"}`}
            >
              {step.label}
            </button>
          ))}
        </div>
        <p>Continental positions {Math.round(age / 10) * 10} million years ago.</p>
        {params.fossils > 0.5 ? (
          <>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {FOSSILS.taxa.map((taxon) => (
                <li key={taxon.key} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-full"
                    style={{ background: TAXON_COLOUR[taxon.key] }}
                  />
                  <span className="text-chalk">{taxon.name}</span>
                  <span className="hidden text-mist sm:inline">· {taxon.kind}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Dots: fossil sites, moved with their plates. At 250 Ma the Mesosaurus sites of Brazil
              and Namibia sit side by side.
            </p>
          </>
        ) : (
          <p className="mt-2">
            Move towards 200–250 million years ago to examine Pangaea, then turn on Fossil evidence
            and rotate the globe to compare where the same fossils occur.
          </p>
        )}
        <br />
        The reconstruction moves modern coastlines; ancient shorelines also changed with sea level
        and landscape development.
      </ScienceReadout>
    </>
  );
}
