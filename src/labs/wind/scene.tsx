import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { pressureWind } from "@/lib/energy-wind-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { useEffect, useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { airDisplacement, wrapParcel } from "./advection";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { farmland, fbm, settlement, Buildings } from "../shared/hazard-parts";
import { FlowWaterMaterial } from "../shared/flow-water";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";

/** Isobar spacing implied by 0.001 m/s² over 150 km at 1.2 kg/m³, in hPa. */
const ISOBAR_HPA = (1.2 * 0.001 * 150000) / 100;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
/** Regional landscape under the f-plane: a coast to the south-west, hills to the north-east.
 * Relief is hugely exaggerated beside the 150 km grid and plays no part in the wind model. */
function landHeight(x: number, z: number) {
  const coast = ss(x - z * 0.6, -2.6, -1.9),
    hills = 0.09 * ss(x + -z * 0.5, 0.6, 3.2) * fbm(x * 1.4 + 2, z * 1.4);
  return -0.05 * (1 - coast) + coast * (0.02 + 0.012 * (fbm(x * 3, z * 3) - 0.5) + hills);
}
function Landscape() {
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(landHeight, 6, 5.6, 200, -0.3),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (y < 0) col.set("#6d7a74").lerp(tone.set("#cdb88c"), ss(y, -0.05, -0.005));
      else col.copy(farmland(x * 1.4, z * 1.4, 0.36));
      if (fbm(x * 1.6 + 7, z * 1.6) > 0.62) col.lerp(tone.set("#4b673a"), 0.8);
      if (y > 0.07) col.lerp(tone.set("#7d7461"), ss(y, 0.07, 0.11));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 140 && i < 2500; i++) {
      const x = -2.9 + 5.8 * ((i * 0.618034) % 1),
        z = -2.7 + 5.4 * ((i * 0.7548777) % 1),
        y = landHeight(x, z);
      if (y > 0.01 && fbm(x * 1.6 + 7, z * 1.6) > 0.64) out.push([x, y - 0.003, z]);
    }
    return out;
  }, []);
  const towns = useMemo(
    () => [
      ...settlement(-0.9, 1.4, 12, 0.3, 0.05, 2, (x, z) => landHeight(x, z) > 0.01),
      ...settlement(1.2, -0.6, 10, 0.26, 0.05, 6),
      ...settlement(-1.6, -1.8, 8, 0.24, 0.05, 9),
    ],
    [],
  );
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <TerrainMaterial attach="material-1" kind="soil" color="#7a6450" />
      </mesh>
      <mesh position={[0, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.998, 5.598]} />
        <FlowWaterMaterial color="#1f5f7a" opacity={0.88} speed={0.2} />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.06} seed={11} />
      <Buildings items={towns} ground={landHeight} />
    </group>
  );
}

function AirTracers({
  displacement,
  velocity,
}: {
  displacement: [number, number];
  velocity: [number, number];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D(),
      direction = new THREE.Vector3(velocity[0], 0, -velocity[1]);
    if (direction.lengthSq() < 1e-10) direction.set(1, 0, 0);
    direction.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    for (let i = 0; i < 160; i++) {
      dummy.position.set(
        wrapParcel(((i % 16) / 16) * 5.4 + displacement[0] / 150000),
        0.24 + (i % 3) * 0.025,
        wrapParcel((Math.floor(i / 16) / 10) * 5.4 - displacement[1] / 150000),
      );
      dummy.quaternion.copy(q);
      dummy.scale.set(0.008, 0.045, 0.008);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [displacement, velocity]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 160]}>
      <capsuleGeometry args={[1, 1, 2, 6]} />
      <meshBasicMaterial color="#c1dad7" transparent opacity={0.6} />
    </instancedMesh>
  );
}
export default function Wind() {
  const { params, t } = useLabControls();
  useLabTick(1 / 45);
  const coriolis = (params.coriolis ?? 1) > 0.5,
    friction = params.friction > 0.5,
    south = params.sh > 0.5,
    transient = params.transient > 0.5;
  const w = pressureWind(t * 86400, coriolis, friction, south, !transient),
    velocityScale = 0.05,
    forceScale = 850;
  const displacement = useMemo(
    () => airDisplacement(t * 86400, coriolis, friction, south, !transient),
    [t, coriolis, friction, south, transient],
  );
  const forces = [
    { name: "Pressure gradient", vector: w.pressure, color: "#e4bd80" },
    { name: "Coriolis", vector: w.coriolis, color: "#88cbd8" },
    { name: "Friction", vector: w.drag, color: "#d39685" },
  ];
  return (
    <>
      <ScienceStudio
        slug="wind"
        camera={[1.5, 7, 5]}
        scale="East–north plane · force arrows share a scale · wind has a separate scale · relief, trees and towns illustrative"
        trueScale="Forces: 0.001 m/s² per 0.85 units · wind: 10 m/s per 0.5 units"
      >
        <Landscape />
        <PressureField />
        <AirTracers displacement={displacement} velocity={[w.u, w.v]} />
        {[-2, -1, 0, 1, 2].map((z) => (
          <group key={z}>
            <Line
              points={Array.from({ length: 61 }, (_, i) => {
                const x = -2.95 + (i / 60) * 5.9;
                return [x, landHeight(x, z) + 0.012, z] as [number, number, number];
              })}
              color={z < 0 ? "#3f7fa8" : "#b8894c"}
              lineWidth={1.8}
            />
            <Tag
              pos={[2.75, landHeight(2.75, z) + 0.08, z]}
              text={`${(1014 + z * ISOBAR_HPA).toFixed(1)} hPa`}
              note={`Isobars join points of equal surface pressure. With the lab's pressure-gradient acceleration of 0.001 m/s² and air density 1.2 kg/m³, neighbouring lines 150 km apart differ by about ${ISOBAR_HPA.toFixed(1)} hPa. The absolute values are illustrative.`}
              occlude={false}
            />
          </group>
        ))}
        <Tag
          pos={[-2.2, 0.1, -2.4]}
          text="Lower pressure · north"
          note="The fixed pressure gradient points north, across these parallel isobars. No fronts or curved pressure centres are included."
          occlude={false}
        />
        <Tag
          pos={[-2.2, 0.1, 2.4]}
          text="Higher pressure · south"
          note="Pressure-gradient acceleration is 0.001 m/s². Each displayed force is acceleration per unit mass."
          occlude={false}
        />
        <CloudVolume position={[0, 0.2, 0]} scale={[0.16, 0.11, 0.16]} seed={4} opacity={0.85} />
        {forces.map((force) => (
          <Arrow
            key={force.name}
            from={[0, 0.15, 0]}
            to={[force.vector[0] * forceScale, 0.15, -force.vector[1] * forceScale]}
            color={force.color}
            width={1.3}
          />
        ))}
        <Arrow
          from={[1.6, 0.22, 1]}
          to={[1.6 + w.u * velocityScale, 0.22, 1 - w.v * velocityScale]}
          color="#d8eee3"
          width={2}
        />
        <Tag
          pos={[2, 0.2, 1.65]}
          text={`Wind ${w.speed.toFixed(1)} m/s`}
          note="The white arrow is velocity, not an additional force. It uses a different scale from the force arrows."
          occlude={false}
        />
        {!w.steady && (
          <Line
            points={Array.from({ length: 121 }, (_, i) => {
              const v = pressureWind((i / 120) * t * 86400, coriolis, friction, south, false);
              return [1.6 + v.u * velocityScale, 0.04, 1 - v.v * velocityScale] as [
                number,
                number,
                number,
              ];
            })}
            color="#d8eee3"
            transparent
            opacity={0.35}
            lineWidth={1}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        <span className="text-sandstone">{"Gold: pressure gradient"}</span> ·{" "}
        <span className="text-glacier">{"Blue: Coriolis"}</span> ·{" "}
        <span className="text-magma">{"Coral: friction"}</span> {"· white: velocity."}
        <br />
        {south ? "Southern" : "Northern"} {"hemisphere · eastward "}
        {w.u.toFixed(2)}
        {", northward "}
        {w.v.toFixed(2)} {"m/s. "}
        {w.steady
          ? "Steady force balance; pale filaments advect with the wind."
          : `${(t * 24).toFixed(2)} h after release from rest.`}{" "}
        {!coriolis && !friction
          ? "Without Coriolis or friction, this constant gradient keeps accelerating the air."
          : !friction && transient
            ? "Without friction the wind oscillates; it does not settle spontaneously."
            : "Flat f-plane experiment; pressure gradient fixed. Tracers wrap at the window edge (150 km per scene unit)."}
      </ScienceReadout>
    </>
  );
}

/** Pressure shading: low (blue) to the north, high (warm) to the south, as on a chart. */
function PressureField() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(6, 5.6, 1, 24),
      p = g.attributes.position,
      colours = new Float32Array(p.count * 3),
      low = new THREE.Color("#4f8fd0"),
      high = new THREE.Color("#e9a35e"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      // Plane local +y becomes world −z (north) after rotation.
      c.copy(high).lerp(low, (p.getY(i) + 2.8) / 5.6);
      colours.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <meshBasicMaterial vertexColors transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}
