import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { TIME_WINDOWS, timeHelix, timeUnit, GEOLOGIC_UNITS } from "@/lib/geologic-time-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
function Coil({ span }: { span: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 721 }, (_, i) => new THREE.Vector3(...timeHelix(i / 720))),
      ),
      g = new THREE.TubeGeometry(curve, 1440, 0.09, 12, false),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const age = span * (1 - Math.floor(i / 13) / 1440),
        col = new THREE.Color(timeUnit(age).color);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [span]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.45} metalness={0.2} />
    </mesh>
  );
}
export default function GeologicTime() {
  const { params, setParam } = useLabControls(),
    span = TIME_WINDOWS[Math.round(params.window ?? 0)],
    progress = params.position ?? 0.55,
    age = span * (1 - progress),
    selected = timeHelix(progress),
    unit = timeUnit(age);
  return (
    <>
      <ScienceStudio
        slug="geologic-time"
        camera={[4, 3.2, 5.7]}
        scale={`Equal distance along the coil = equal time · window ${span} Ma to present`}
        trueScale="Time is proportional to arc length in both views · this is not a rock section"
      >
        <Coil span={span} />
        {Array.from({ length: 13 }, (_, i) => {
          const p = timeHelix(i / 12);
          return (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.115, 16, 12]} />
              <meshStandardMaterial color="#c9c8b7" roughness={0.7} />
            </mesh>
          );
        })}
        {GEOLOGIC_UNITS.filter((u) => u.young > 0 && u.young < span).map((u) => {
          const f = 1 - u.young / span,
            p = timeHelix(f),
            next = timeHelix(Math.min(1, f + 0.0001)),
            axis = new THREE.Vector3(...next).sub(new THREE.Vector3(...p)).normalize();
          return (
            <mesh
              key={u.name}
              position={p}
              quaternion={new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                axis,
              )}
            >
              <torusGeometry args={[0.117, 0.016, 12, 32]} />
              <meshStandardMaterial color="#eee0c1" metalness={0.4} roughness={0.35} />
            </mesh>
          );
        })}
        <mesh position={selected}>
          <sphereGeometry args={[0.17, 32, 24]} />
          <meshStandardMaterial
            color="#efd59e"
            emissive="#b88c40"
            emissiveIntensity={0.2}
            roughness={0.35}
          />
        </mesh>
        <Line points={[selected, [2.6, 0.7, 1.5]]} color="#d8c6a0" />
        <Tag
          pos={[2.7, 0.8, 1.5]}
          text={`${age < 10 ? age.toFixed(3) : age.toFixed(1)} Ma`}
          note={`Selected time: ${unit.name}. Ma denotes millions of years before the present here. The marker follows equal elapsed time along the coil; spatial closeness between turns is not closeness in time.`}
          occlude={false}
        />
        <Tag
          pos={[1.8, -1.6, -0.4]}
          text={`${span} Ma`}
          note={
            span === 4540
              ? "The approximate age of Earth is 4.54 billion years. This viewing window begins at that estimate, not at an exact globally dated rock boundary."
              : "This window enlarges a shorter interval with a new time-per-length scale. It does not change the duration of any unit."
          }
          occlude={false}
        />
        <Tag
          pos={[1.5, 1.5, -0.6]}
          text="Present"
          note="Recent human history occupies a tiny fraction of the full window. A visibility marker is enlarged, not the duration it represents."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div className="mb-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {GEOLOGIC_UNITS.filter((u) => u.young < span).map((u) => (
            <span key={u.name} style={{ borderBottom: `2px solid ${u.color}` }}>
              {u.name}
            </span>
          ))}
        </div>
        {age < 2.58 ? "Quaternary · within the Cenozoic" : unit.name} · {age.toFixed(3)}{" "}
        {"Ma before present. One turn spans "}
        {(span / 3).toFixed(2)} {"million years."}
        <br />
        {
          "Pale collars mark era/eon boundaries at their actual proportional positions. ICS boundaries: 2026/06 edition. Phanerozoic begins at 538.8 Ma; its eras have very different durations. Select a shorter window to inspect recent time. The coil is a time axis, not strata thickness or an evolutionary ladder."
        }
        <div className="pointer-events-auto mt-1 flex flex-wrap justify-center gap-2">
          {[
            { age: 3500, label: "Evidence of life ≥3.5 Ga" },
            { age: 250, label: "Pangaea ≈250 Ma" },
            { age: 66, label: "K–Pg boundary 66 Ma" },
          ].map((mark) => (
            <button
              key={mark.age}
              type="button"
              className="min-h-11 rounded-lg border border-white/15 px-2 text-xs text-chalk"
              onClick={() => {
                const nextSpan = mark.age > span ? 4540 : span;
                if (nextSpan !== span) setParam("window", 0);
                setParam("position", 1 - mark.age / nextSpan);
              }}
            >
              {mark.label}
            </button>
          ))}
        </div>
      </ScienceReadout>
    </>
  );
}
