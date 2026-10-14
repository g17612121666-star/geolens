import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { TIME_WINDOWS, timeHelix, timeUnit, GEOLOGIC_UNITS } from "@/lib/geologic-time-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { InspectHotspot, Tag } from "../shared/kit";
const EVENTS = [
  {
    age: 3500,
    name: "Early life",
    note: "Microbial fossils and stromatolites show life existed by at least about 3.5 billion years ago.",
  },
  {
    age: 2400,
    name: "Great Oxidation",
    note: "Oxygen from photosynthesising microbes began to accumulate in the atmosphere about 2.4 billion years ago.",
  },
  {
    age: 539,
    name: "Cambrian explosion",
    note: "Most major animal groups appear in the fossil record within a few tens of millions of years after about 539 Ma.",
  },
  {
    age: 250,
    name: "Pangaea",
    note: "The supercontinent Pangaea was fully assembled around 250 Ma and began breaking apart in the Mesozoic.",
  },
  {
    age: 66,
    name: "K–Pg extinction",
    note: "An asteroid impact 66 million years ago ended the age of non-avian dinosaurs and opened the Cenozoic.",
  },
  {
    age: 0.3,
    name: "Homo sapiens",
    note: "Our species appears about 300,000 years ago: a sliver of the coil's final turn even in the shortest window.",
  },
];
const HELIX_SAMPLES = Array.from(
  { length: 1441 },
  (_, i) => new THREE.Vector3(...timeHelix(i / 1440)),
);
/** Nearest fraction along the coil to a clicked point. */
function fractionAt(point: THREE.Vector3) {
  let best = 0,
    distance = Infinity;
  HELIX_SAMPLES.forEach((p, i) => {
    const d = p.distanceToSquared(point);
    if (d < distance) {
      distance = d;
      best = i / 1440;
    }
  });
  return best;
}

function Coil({ span, onPick }: { span: number; onPick: (fraction: number) => void }) {
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
    <mesh
      geometry={geometry}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        onPick(fractionAt(e.point));
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <meshPhysicalMaterial
        vertexColors
        roughness={0.38}
        metalness={0.05}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
      />
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
        <Coil span={span} onPick={(f) => setParam("position", f)} />
        {GEOLOGIC_UNITS.filter((u) => u.old > 0 && u.young < span).map((u) => {
          const mid = (Math.min(u.old, span) + Math.max(u.young, 0)) / 2,
            f = 1 - mid / span;
          if ((Math.min(u.old, span) - Math.max(u.young, 0)) / span < 0.1) return null;
          const p = timeHelix(f),
            out = new THREE.Vector3(p[0], 0, p[2]).normalize().multiplyScalar(0.32);
          return (
            <Tag
              key={u.name}
              pos={[p[0] + out.x, p[1] + 0.2, p[2] + out.z]}
              text={u.name}
              note={`${u.name}: ${u.old.toLocaleString("en-GB")}–${u.young.toLocaleString("en-GB")} Ma, about ${(((u.old - u.young) / 4540) * 100).toFixed(1)}% of Earth history.`}
            />
          );
        })}
        {EVENTS.filter((e) => e.age < span).map((e) => {
          const f = 1 - e.age / span,
            c = timeHelix(f),
            p: [number, number, number] = [c[0] * 1.09, c[1] + 0.05, c[2] * 1.09];
          return (
            <InspectHotspot
              key={e.name}
              name={`${e.name} · ${e.age < 1 ? e.age * 1000 + " ka" : e.age + " Ma"}`}
              note={e.note}
            >
              <mesh position={p} onClick={() => setParam("position", f)}>
                <octahedronGeometry args={[0.16, 0]} />
                <meshStandardMaterial
                  color="#ffe2a6"
                  emissive="#f0a640"
                  emissiveIntensity={0.55}
                  roughness={0.3}
                />
              </mesh>
            </InspectHotspot>
          );
        })}
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
        <TickRings span={span} />
        <TimeColumn span={span} progress={progress} />
        <mesh position={[0, -1.32, 0]} receiveShadow>
          <cylinderGeometry args={[2.25, 2.35, 0.12, 96]} />
          <meshStandardMaterial color="#2a3133" roughness={0.55} metalness={0.2} />
        </mesh>
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

/** Thin dark rings at round ages so time can be read off the coil like a ruler. */
function TickRings({ span }: { span: number }) {
  const step = span > 1000 ? 500 : span > 100 ? 50 : 0.25;
  const ticks = Array.from({ length: Math.floor(span / step) }, (_, i) => (i + 1) * step).filter(
    (a) => a < span,
  );
  return (
    <>
      {ticks.map((a) => {
        const f = 1 - a / span,
          p = timeHelix(f),
          next = timeHelix(Math.min(1, f + 0.0001)),
          axis = new THREE.Vector3(...next).sub(new THREE.Vector3(...p)).normalize();
        return (
          <mesh
            key={a}
            position={p}
            quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)}
          >
            <torusGeometry args={[0.094, 0.006, 8, 28]} />
            <meshStandardMaterial color="#2e3436" roughness={0.6} />
          </mesh>
        );
      })}
    </>
  );
}

/** The same window unrolled onto a straight glass column: each unit's height is its duration. */
function TimeColumn({ span, progress }: { span: number; progress: number }) {
  const units = GEOLOGIC_UNITS.filter((u) => u.young < span && u.old > 0);
  const y = (age: number) => -1.05 + 2.1 * (1 - Math.min(age, span) / span);
  return (
    <group>
      {units.map((u) => {
        const bottom = y(u.old),
          top = y(Math.max(u.young, 0)),
          h = top - bottom;
        return h > 0.002 ? (
          <mesh key={u.name} position={[0, (top + bottom) / 2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, h, 48]} />
            <meshPhysicalMaterial
              color={u.color}
              roughness={0.25}
              clearcoat={0.8}
              transparent
              opacity={0.82}
            />
          </mesh>
        ) : null;
      })}
      <mesh position={[0, -1.05 + 2.1 * progress, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.022, 12, 48]} />
        <meshStandardMaterial color="#f3d79c" emissive="#b88c40" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
