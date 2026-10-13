import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { pressureWind } from "@/lib/energy-wind-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { airDisplacement, wrapParcel } from "./advection";
import { TerrainMaterial } from "../shared/natural-world";

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
        scale="East–north plane · force arrows share a scale · wind has a separate scale"
        trueScale="Forces: 0.001 m/s² per 0.85 units · wind: 10 m/s per 0.5 units"
      >
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[6, 0.28, 5.6]} />
          <TerrainMaterial kind="grass" color="#525f52" roughness={1} />
        </mesh>
        <AirTracers displacement={displacement} velocity={[w.u, w.v]} />
        {[-2, -1, 0, 1, 2].map((z) => (
          <Line
            key={z}
            points={[
              [-2.9, 0.015, z],
              [2.9, 0.015, z],
            ]}
            color={z < 0 ? "#709daa" : "#baaa89"}
            lineWidth={1.5}
          />
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
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.085, 24, 16]} />
          <meshStandardMaterial color="#eae9d6" />
        </mesh>
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
