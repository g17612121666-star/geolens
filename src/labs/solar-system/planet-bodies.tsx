import { useMemo, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { EarthMesh } from "@/components/globe/earth";
import { spinAngle, AXIAL_TILT } from "./rotation";
function NasaBody({ name, radius }: { name: string; radius: number }) {
  const { scene } = useGLTF(`/models/scientific/${name}.glb`),
    copy = useMemo(() => {
      const s = scene.clone(true);
      s.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material.clone() as THREE.MeshStandardMaterial;
          m.metalness = 0;
          m.roughness = 0.84;
          if (m.map) {
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.anisotropy = 8;
          }
          o.material = m;
        }
      });
      return s;
    }, [scene]);
  useEffect(
    () => () =>
      copy.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material.dispose();
      }),
    [copy],
  );
  // NASA assets have equatorial radius 500; convert to the catalogue's mean radius.
  const meanFactor =
    name === "saturn" ? Math.cbrt(451.019 / 500) : name === "mars" ? Math.cbrt(497.05557 / 500) : 1;
  return (
    <group scale={radius / (500 * meanFactor)}>
      <primitive object={copy} dispose={null} />
    </group>
  );
}
function MappedBody({
  url,
  radius,
  flatten = 1,
}: {
  url: string;
  radius: number;
  flatten?: number;
}) {
  const map = useTexture(url);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 12;
  }, [map]);
  const equatorial = radius / Math.cbrt(flatten);
  return (
    <mesh scale={[equatorial, equatorial * flatten, equatorial]}>
      <sphereGeometry args={[1, 128, 96]} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
  );
}
/** Procedural cloud material: explicitly a model, never an observational photograph. */
function CloudBody({ index, radius }: { index: number; radius: number }) {
  const venus = index === 1,
    uranus = index === 6,
    flatten = venus ? 1 : uranus ? 0.9771 : 0.9829,
    geometry = useMemo(() => {
      const g = new THREE.SphereGeometry(1, 160, 112),
        p = g.attributes.position,
        c = new Float32Array(p.count * 3);
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k),
          y = p.getY(k),
          z = p.getZ(k),
          lat = Math.asin(y),
          band =
            Math.sin(lat * (venus ? 9 : 26) + 0.12 * Math.sin(Math.atan2(z, x) * 7)) * 0.5 + 0.5,
          base = new THREE.Color(venus ? "#dfd3b6" : uranus ? "#a4c7c7" : "#91b3c7"),
          fine = Math.sin(x * 83 + y * 43 + z * 71) * Math.sin(y * 91 - z * 37) * 0.006;
        base.multiplyScalar((venus ? 0.94 : 0.97) + (venus ? 0.08 : 0.04) * band + fine);
        c.set([base.r, base.g, base.b], k * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return g;
    }, [index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const r = radius / Math.cbrt(flatten);
  return (
    <group>
      <mesh geometry={geometry} scale={[r, r * flatten, r]}>
        <meshStandardMaterial vertexColors roughness={0.83} />
      </mesh>
    </group>
  );
}
function BodySurface({
  index,
  radius,
  sun,
}: {
  index: number;
  radius: number;
  sun: THREE.Vector3;
}) {
  if (index === 2) return <EarthMesh radius={radius} sunDirection={sun} />;
  if (index === 0)
    return <MappedBody url="/textures/planets/mercury-enhanced.jpg" radius={radius} />;
  if (index === 3 || index === 5)
    return <NasaBody name={index === 3 ? "mars" : "saturn"} radius={radius} />;
  if (index === 4)
    return (
      <MappedBody url="/textures/planets/jupiter-6000.jpg" radius={radius} flatten={0.93513} />
    );
  return <CloudBody index={index} radius={radius} />;
}
export function PlanetBody({
  index,
  radius,
  sun = new THREE.Vector3(1, 0.3, 2),
  years = 0,
}: {
  index: number;
  radius: number;
  sun?: THREE.Vector3;
  years?: number;
}) {
  return (
    <group rotation={[0, 0, (AXIAL_TILT[index] * Math.PI) / 180]}>
      <group rotation={[0, spinAngle(index, years), 0]}>
        <BodySurface index={index} radius={radius} sun={sun} />
      </group>
    </group>
  );
}
