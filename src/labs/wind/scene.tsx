import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabState } from "@/lib/store/lab-controls";
import { pressureWind } from "@/lib/energy-wind-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { useEffect, useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { airDisplacement, wrapParcel } from "./advection";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import { FlowWaterMaterial } from "../shared/flow-water";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";

/** Isobar spacing implied by 0.001 m/s² over 150 km at 1.2 kg/m³, in hPa. */
const ISOBAR_HPA = (1.2 * 0.001 * 150000) / 100;
/** The force diagram: a parcel of air raised above the map on a plate, west of center. */
const FORCE_X = -0.4,
  PLATE_Y = 0.42,
  PLATE_R = 1.45;
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const toward = (u: number, v: number) =>
  COMPASS[Math.round((((Math.atan2(u, v) * 180) / Math.PI + 360) % 360) / 45) % 8];
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
      // A calm backdrop: fields muted toward meadow, so the forces and wind stand out.
      else col.copy(farmland(x * 1.4, z * 1.4, 0.36)).lerp(tone.set("#879a62"), 0.55);
      if (fbm(x * 1.6 + 7, z * 1.6) > 0.66) col.lerp(tone.set("#5b7646"), 0.6);
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
      if (y > 0.01 && fbm(x * 1.6 + 7, z * 1.6) > 0.68) out.push([x, y - 0.003, z]);
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
      dummy.scale.set(0.011, 0.06, 0.011);
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
  const { params, t } = useLabState("params", "t");
  useLabTick(1 / 45);
  const coriolis = (params.coriolis ?? 1) > 0.5,
    friction = params.friction > 0.5,
    south = params.sh > 0.5,
    transient = params.transient > 0.5;
  const w = pressureWind(t * 86400, coriolis, friction, south, !transient),
    velocityScale = 0.07,
    forceScale = 1100,
    // Without Coriolis or friction the wind grows without limit; cap the drawn arrow.
    shown = Math.min(1, 40 / Math.max(w.speed, 1e-9)),
    across = (Math.atan2(w.v, Math.abs(w.u)) * 180) / Math.PI;
  const displacement = useMemo(
    () => airDisplacement(t * 86400, coriolis, friction, south, !transient),
    [t, coriolis, friction, south, transient],
  );
  // The wind label sits well past the wind arrow's tip, along its direction.
  const windTip = [w.u * velocityScale * shown, -w.v * velocityScale * shown],
    windLength = Math.hypot(windTip[0], windTip[1]) || 1,
    windLabel: [number, number, number] = [
      FORCE_X + windTip[0] + (windTip[0] / windLength) * 0.75,
      PLATE_Y + 0.14,
      windTip[1] + (windTip[1] / windLength) * 0.75,
    ];
  const forces = [
    {
      name: "Pressure gradient",
      short: "Pressure",
      vector: w.pressure,
      color: "#e4bd80",
      tone: "sandstone" as const,
      note: "Air is pushed from high toward low pressure, at right angles to the isobars: 0.001 m/s² here, per kilogram of air.",
    },
    {
      name: "Coriolis",
      short: "Coriolis",
      vector: w.coriolis,
      color: "#88cbd8",
      tone: "glacier" as const,
      note: "Earth's rotation deflects moving air to the right in the Northern Hemisphere and to the left in the Southern, at right angles to the wind. It grows with wind speed and is zero for still air.",
    },
    {
      name: "Friction",
      short: "Friction",
      vector: w.drag,
      color: "#d39685",
      tone: "magma" as const,
      note: "Near the ground, friction with the surface slows the wind and acts against its direction.",
    },
  ];
  return (
    <>
      <ScienceStudio
        slug="wind"
        camera={[1.5, 7, 5]}
        scale="East–north plane · forces share one scale, wind another · relief, trees and towns not to scale"
        trueScale="Forces: 0.001 m/s² per 1.1 units · wind: 10 m/s per 0.7 units"
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
              note={`Isobars join points of equal surface pressure. With the lab's pressure-gradient acceleration of 0.001 m/s² and air density 1.2 kg/m³, neighboring lines 150 km apart differ by about ${ISOBAR_HPA.toFixed(1)} hPa. The pressure values themselves are only examples.`}
              occlude={false}
            />
          </group>
        ))}
        <Tag
          pos={[-2.2, 0.1, -2.4]}
          text="Lower pressure · north"
          short="Low · north"
          priority={1}
          note="The fixed pressure gradient points north, across these parallel isobars. No fronts or curved pressure centers are included."
          occlude={false}
        />
        <Tag
          pos={[-2.2, 0.1, 2.4]}
          text="Higher pressure · south"
          short="High · south"
          priority={1}
          note="The pressure-gradient force is 0.001 m/s² (force per kilogram of air). All force arrows show force per unit mass."
          occlude={false}
        />
        <ForcePlate />
        <CloudVolume
          position={[FORCE_X, PLATE_Y + 0.07, 0]}
          scale={[0.17, 0.11, 0.17]}
          seed={4}
          opacity={0.9}
        />
        {forces.map((force) => {
          const tip: [number, number, number] = [
            FORCE_X + force.vector[0] * forceScale,
            PLATE_Y + 0.03,
            -force.vector[1] * forceScale,
          ];
          const length = Math.hypot(force.vector[0], force.vector[1]) * forceScale;
          return (
            <group key={force.name}>
              <Arrow from={[FORCE_X, PLATE_Y + 0.03, 0]} to={tip} color={force.color} width={4} />
              {length > 0.12 && (
                <Tag
                  pos={[
                    FORCE_X + (force.vector[0] * forceScale * (length + 0.4)) / length,
                    PLATE_Y + 0.08,
                    (-force.vector[1] * forceScale * (length + 0.4)) / length,
                  ]}
                  text={force.name}
                  short={force.short}
                  tone={force.tone}
                  priority={3}
                  note={force.note}
                  occlude={false}
                />
              )}
            </group>
          );
        })}
        {/* The wind: velocity, on its own scale, from the same parcel. */}
        <Arrow
          from={[FORCE_X, PLATE_Y + 0.06, 0]}
          to={[FORCE_X + w.u * velocityScale * shown, PLATE_Y + 0.06, -w.v * velocityScale * shown]}
          color="#f2f6f4"
          width={3.2}
        />
        {w.speed > 0.05 && (
          // Beyond the arrow's tip, so the label never covers the arrows it describes.
          <Tag
            pos={windLabel}
            text={`Wind ${w.speed.toFixed(1)} m/s`}
            short={`${w.speed.toFixed(0)} m/s`}
            priority={4}
            note="The white arrow is the wind's velocity, not another force, and uses its own scale: 10 m/s per 0.7 units. In steady flow it lies where the forces balance: along the isobars without friction, angled toward low pressure with it."
            occlude={false}
          />
        )}
        {!w.steady && (
          <Line
            points={Array.from({ length: 121 }, (_, i) => {
              const v = pressureWind((i / 120) * t * 86400, coriolis, friction, south, false);
              return [FORCE_X + v.u * velocityScale, PLATE_Y + 0.02, -v.v * velocityScale] as [
                number,
                number,
                number,
              ];
            })}
            color="#d8eee3"
            transparent
            opacity={0.6}
            lineWidth={1.4}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {south ? "Southern" : "Northern"} {"hemisphere: wind "}
        {w.speed.toFixed(1)} {"m/s"}
        {w.speed < 0.05
          ? " (air at rest)"
          : ` blowing from the ${toward(-w.u, -w.v)} toward the ${toward(w.u, w.v)}, ${
              Math.abs(across) < 1
                ? "along the isobars"
                : `crossing the isobars at ${Math.abs(across).toFixed(0)}° toward ${
                    across > 0 ? "lower" : "higher"
                  } pressure`
            }`}
        {". "}
        {w.steady
          ? "Steady force balance."
          : `${(t * 24).toFixed(1)} h after release from rest.`}{" "}
        <span className="text-sandstone">{"Gold: pressure gradient"}</span> ·{" "}
        <span className="text-glacier">{"Blue: Coriolis"}</span> ·{" "}
        <span className="text-magma">{"Coral: friction"}</span> {"· White: wind velocity."} <br />
        {w.steady ? "" : "The pale curve traces the wind since release. "}
        {"Eastward "}
        {w.u.toFixed(2)}
        {", northward "}
        {w.v.toFixed(2)} {"m/s. "}
        {w.steady ? "The pale streaks drift with the wind. " : ""}
        {!coriolis && !friction
          ? "Without Coriolis or friction, this constant gradient keeps accelerating the air (the arrow is capped at 40 m/s)."
          : !friction && transient
            ? "Without friction the wind keeps oscillating about the geostrophic wind and never settles."
            : "Constant-Coriolis (f-plane) model with a fixed pressure gradient. Streaks leaving one edge reappear at the other (150 km per scene unit)."}
      </ScienceReadout>
    </>
  );
}

/** A dark plate under the force diagram, so its pale arrows stand out in either theme. */
function ForcePlate() {
  return (
    <group position={[FORCE_X, PLATE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[PLATE_R, 64]} />
        <meshBasicMaterial color="#1c272e" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[PLATE_R - 0.014, PLATE_R, 64]} />
        <meshBasicMaterial color="#8fa3ab" />
      </mesh>
    </group>
  );
}

/** Pressure shading: low (blue) to the north, high (warm) to the south, as on a chart. */
function PressureField() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(6, 5.6, 1, 24),
      p = g.attributes.position,
      colors = new Float32Array(p.count * 3),
      low = new THREE.Color("#4f8fd0"),
      high = new THREE.Color("#e9a35e"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      // Plane local +y becomes world −z (north) after rotation.
      c.copy(high).lerp(low, (p.getY(i) + 2.8) / 5.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}
