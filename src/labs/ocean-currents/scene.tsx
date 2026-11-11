import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabTick } from "@/labs/tick";
import { latLonToXYZ } from "@/lib/geo";
import { SUBTROPICAL_GYRES, GYRE_BRANCHES } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { EarthMesh, Atmosphere } from "@/components/globe/earth";
import { FlowFilaments } from "../atmosphere-layers/weather-volumes";
function Globe() {
  return (
    <>
      <EarthMesh radius={1.65} lighting="viewer" />
      <Atmosphere radius={1.71} />
    </>
  );
}
function Gyre({ index, t }: { index: number; t: number }) {
  const g = SUBTROPICAL_GYRES[index];
  const segments = useMemo(
    () =>
      g.points.slice(0, -1).map((p, i) => {
        const n = g.points.length - 1,
          previous = g.points[(i + n - 1) % n],
          next = g.points[i + 1];
        const a = new THREE.Vector3(...latLonToXYZ(p[0], p[1], 1)),
          b = new THREE.Vector3(...latLonToXYZ(next[0], next[1], 1)),
          before = new THREE.Vector3(...latLonToXYZ(previous[0], previous[1], 1));
        // Round only inside each existing corner: no spline overshoot across coastlines.
        const entry = a.clone().lerp(before, 0.08),
          exit = a.clone().lerp(b, 0.08),
          end = a.clone().lerp(b, 0.92);
        const points = new THREE.QuadraticBezierCurve3(entry, a, exit)
          .getPoints(8)
          .concat(Array.from({ length: 16 }, (_, j) => exit.clone().lerp(end, (j + 1) / 16)));
        return points.map(
          (v) => v.normalize().multiplyScalar(1.671).toArray() as [number, number, number],
        );
      }),
    [g.points],
  );
  const path = segments.flat(),
    rotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        (g.center[0] * Math.PI) / 180,
        Math.PI - (g.center[1] * Math.PI) / 180,
        0,
        "XYZ",
      ),
    );
  const branches = GYRE_BRANCHES[index];
  return (
    <group quaternion={rotation}>
      <Globe />
      <OtherGyres selected={index} />
      <DrivingWinds index={index} />
      {segments.map((p, i) => (
        <Line
          key={i}
          points={p}
          color={
            branches.warm.includes(i)
              ? "#f0703f"
              : branches.cool.includes(i)
                ? "#3d9be0"
                : "#d6dfdb"
          }
          lineWidth={5.5}
        />
      ))}
      {segments.map((p, i) => (
        <CurrentTube
          key={`tube-${i}`}
          points={p}
          color={
            branches.warm.includes(i)
              ? "#f0703f"
              : branches.cool.includes(i)
                ? "#3d9be0"
                : "#c9d6d2"
          }
        />
      ))}
      {/* Dark arrowheads lifted just above the bands, so the flow direction reads in a still view. */}
      {segments.map((p, i) => (
        <Arrow
          key={i}
          from={lift(p[6], 1.705)}
          to={lift(p[18], 1.705)}
          color="#13222c"
          width={1.5}
        />
      ))}
      <Tag
        pos={outside(segments[branches.warm[Math.floor(branches.warm.length / 2)]][12], path)}
        text={g.western}
        tone="magma"
        note="Western boundary current: narrow, fast and warm, carrying water poleward."
        occlude={false}
      />
      <Tag
        pos={outside(segments[branches.cool[Math.floor(branches.cool.length / 2)]][12], path)}
        text={g.eastern}
        tone="glacier"
        note="Eastern boundary current: broader, slower and cooler, carrying water toward the equator."
        occlude={false}
      />
      <FlowFilaments
        paths={[-0.014, 0, 0.014].map((offset) =>
          path.map((p) => {
            const v = new THREE.Vector3(...p),
              axis = new THREE.Vector3(0, 1, 0);
            return v.applyAxisAngle(axis, offset).toArray() as [number, number, number];
          }),
        )}
        t={t}
        color="#f5e6bf"
      />
      {Array.from({ length: 18 }, (_, i) => {
        const u = ((t + i / 18) % 1) * (path.length - 1),
          a = Math.floor(u),
          b = Math.min(path.length - 1, a + 1),
          point = new THREE.Vector3(...path[a])
            .lerp(new THREE.Vector3(...path[b]), u - a)
            .normalize()
            .multiplyScalar(1.675);
        return (
          <mesh key={i} position={point}>
            <sphereGeometry args={[0.014, 12, 8]} />
            <meshBasicMaterial color="#f5e6bf" />
          </mesh>
        );
      })}
    </group>
  );
}
function lift(p: [number, number, number], radius: number) {
  return new THREE.Vector3(...p).setLength(radius).toArray() as [number, number, number];
}
/** Place a current's label just outside the loop, so it names the branch without covering it. */
function outside(p: [number, number, number], path: [number, number, number][]) {
  const center = path
    .reduce((sum, q) => sum.add(new THREE.Vector3(...q)), new THREE.Vector3())
    .divideScalar(path.length);
  const point = new THREE.Vector3(...p),
    away = point.clone().sub(center).setLength(0.8);
  return point.add(away).setLength(1.78).toArray() as [number, number, number];
}
export default function OceanCurrents() {
  const { params, t } = useLabControls();
  useLabTick(1 / 50);
  const index = Math.round(params.basin ?? 0),
    g = SUBTROPICAL_GYRES[index];
  return (
    <>
      <ScienceStudio
        slug="ocean-currents"
        camera={[0, 0.8, 6]}
        scale="Geographic globe · current routes schematic · widths and tracers enlarged"
        trueScale="Globe at one scale · current symbols still enlarged for reading"
      >
        <Gyre index={index} t={t} />
        <Tag
          pos={[0, 2.05, 0]}
          text={`${g.name} subtropical gyre`}
          note="The routes show the broad direction of the surface currents. Trace the western branch flowing poleward and the eastern branch flowing toward the equator."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {g.western}
        {": warmer western boundary current flowing poleward (orange). "}
        {g.eastern}
        {
          ": cooler eastern boundary current flowing toward the equator (blue). Gray links the branches. "
        }
        {g.center[0] > 0
          ? "This northern gyre turns clockwise, as Earth’s rotation deflects moving water to the right."
          : "This southern gyre turns counterclockwise, as Earth’s rotation deflects moving water to the left."}{" "}
        <br />
        {
          "Viewed on a map, northern subtropical gyres turn clockwise and southern ones counterclockwise; the faint loops show the other four. Trade winds blowing toward the west on the equator side and westerlies on the poleward side drive each gyre. Play shows direction only. Currents shape coastal climates: the cool California Current helps keep San Francisco's summers cool and foggy, while the Gulf Stream carries warm water along the U.S. East Coast and on across the Atlantic."
        }
      </ScienceReadout>
    </>
  );
}

/** A broad, softly glowing band along one current branch, lying on the sea surface. */
function CurrentTube({ points, color }: { points: [number, number, number][]; color: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, Math.max(8, points.length * 2), 0.026, 10, false);
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.45}
        transparent
        opacity={0.55}
        roughness={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Gyre loops on the globe for the four basins not selected, so the global pattern shows. */
function OtherGyres({ selected }: { selected: number }) {
  const loops = useMemo(
    () =>
      SUBTROPICAL_GYRES.map((g, k) =>
        k === selected
          ? null
          : {
              key: g.name,
              points: g.points.map(
                ([lat, lon]) =>
                  new THREE.Vector3(...latLonToXYZ(lat, lon, 1.668)).toArray() as [
                    number,
                    number,
                    number,
                  ],
              ),
            },
      ).filter((l): l is NonNullable<typeof l> => l !== null),
    [selected],
  );
  return (
    <>
      {loops.map((l) => (
        <Line
          key={l.key}
          points={smoothLoop(l.points)}
          color="#d9e4e1"
          transparent
          opacity={0.42}
          lineWidth={1.6}
        />
      ))}
    </>
  );
}

/** A closed loop through the gyre's turning points, rounded and kept on the sphere. */
function smoothLoop(points: [number, number, number][]) {
  const curve = new THREE.CatmullRomCurve3(
    points.slice(0, -1).map((p) => new THREE.Vector3(...p)),
    true,
    "centripetal",
  );
  return curve.getPoints(120).map((v) => v.setLength(1.668).toArray() as [number, number, number]);
}

/**
 * The winds that drive the selected gyre: trade winds blowing toward the west on its
 * equator side and westerlies blowing toward the east on its poleward side. Schematic.
 */
function DrivingWinds({ index }: { index: number }) {
  const g = SUBTROPICAL_GYRES[index],
    south = g.center[0] < 0,
    lats = g.points.map(([lat]) => Math.abs(lat)),
    lons = g.points.map(([, lon]) => lon),
    west = Math.min(...lons) + 6,
    east = Math.max(...lons) - 6,
    band = (absLat: number, toward: 1 | -1) =>
      Array.from({ length: 3 }, (_, k) => {
        const lat = (south ? -1 : 1) * absLat,
          span = (east - west) / 3,
          a = west + span * (k + 0.15),
          b = west + span * (k + 0.85),
          [from, to] = toward > 0 ? [a, b] : [b, a];
        return {
          from: latLonToXYZ(lat, from, 1.775),
          to: latLonToXYZ(lat + (toward > 0 ? 0 : south ? 2 : -2), to, 1.775),
        };
      }),
    trades = band(Math.min(...lats) - 1, -1),
    westerlies = band(Math.max(...lats) + 2, 1),
    // On phones the readout names the winds; labels there would cover the arrows.
    compact = useIsCompact();
  return (
    <>
      {[...trades, ...westerlies].map((w, i) => (
        <Arrow key={i} from={w.from} to={w.to} color="#e6eef0" width={1.3} />
      ))}
      {!compact && (
        <Tag
          pos={latLonToXYZ((south ? -1 : 1) * (Math.min(...lats) - 7), (west + east) / 2, 1.82)}
          text="Trade winds"
          note="Easterly trade winds blow toward the west (and toward the equator) on the gyre's equator side. Together with the westerlies they set the gyre turning; Earth's rotation and the coasts shape it."
          occlude={false}
        />
      )}
      {!compact && (
        <Tag
          pos={latLonToXYZ((south ? -1 : 1) * (Math.max(...lats) + 8), (west + east) / 2, 1.82)}
          text="Westerlies"
          note="In the middle latitudes, westerly winds blow toward the east on the gyre's poleward side."
          occlude={false}
        />
      )}
    </>
  );
}
