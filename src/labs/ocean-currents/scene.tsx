import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
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
    [index],
  );
  const path = segments.flat(),
    rotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        (g.centre[0] * Math.PI) / 180,
        Math.PI - (g.centre[1] * Math.PI) / 180,
        0,
        "XYZ",
      ),
    );
  const branches = GYRE_BRANCHES[index];
  return (
    <group quaternion={rotation}>
      <Globe />
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
      {segments
        .filter((_, i) => i % 2 === 0)
        .map((p, i) => (
          <Arrow key={i} from={p[4]} to={p[11]} color="#cbdcd5" width={0.7} />
        ))}
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
          note="The routes show the broad direction of the surface currents. Trace the western branch flowing poleward and the eastern branch flowing towards the equator."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {g.western}
        {": warmer western boundary current flowing poleward (orange). "}
        {g.eastern}
        {
          ": cooler eastern boundary current flowing towards the equator (blue). Grey links the branches."
        }
        <br />
        {
          "Viewed on a map, northern subtropical gyres turn clockwise and southern ones anticlockwise. Play shows direction only. UK winters reflect westerlies, ocean heat and geography together; the Gulf Stream is one contribution."
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
