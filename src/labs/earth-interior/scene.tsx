import { useEffect, useMemo } from "react";
import { Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabTick } from "@/labs/tick";
import { Tag, InspectHotspot } from "../shared/kit";
import { ScienceReadout, ScienceStudio } from "../shared/science-kit";
import { shellSection } from "../shared/science-geometry";
import { useRockNormal, useRockPbr } from "../shared/materials";
import { PhotographicRockMaterial } from "../shared/photographic-rock";

const layers = [
  {
    name: "Crust",
    color: "#8d8065",
    note: "Solid rock. Oceanic crust is commonly 5–10 km thick; continental crust commonly 30–50 km. This reference section uses 35 km.",
    rough: 0.92,
    metal: 0.02,
  },
  {
    name: "Mantle · solid",
    color: "#80704f",
    note: "Mostly solid silicate rock. It deforms and convects over geological time; it is not a global magma ocean. Base: about 2,890 km depth.",
    rough: 0.84,
    metal: 0.03,
  },
  {
    name: "Outer core · liquid",
    color: "#ae875b",
    note: "Liquid iron-rich alloy, from about 2,890 to 5,150 km depth. Transmits P waves; it does not sustain ordinary shear (S) waves. Smooth metallic highlights are a material cue, not a map of flow.",
    rough: 0.2,
    metal: 0.96,
  },
  {
    name: "Inner core · solid",
    color: "#d4d2bf",
    note: "Solid iron-rich alloy, radius about 1,221 km. High pressure allows it to remain solid at very high temperature. Fine grain and metallic highlights are illustrative material cues, not observed crystal sizes.",
    rough: 0.42,
    metal: 0.9,
  },
];
/** Static micro-normal/roughness fields distinguish material response only.
 * They never displace the closed cut faces or imply kilometre-scale structures. */
function CoreMaterial({ solid, attach }: { solid: boolean; attach: string }) {
  const maps = useMemo(() => {
    const size = 512,
      normals = new Uint8Array(size * size * 4),
      roughness = new Uint8Array(size * size * 4),
      height = new Float32Array(size * size);
    const hash = (x: number, y: number) => {
      const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    // Interpolated multi-scale noise avoids piecewise-constant square normals
    // and low-frequency sinusoidal bands. Neither pattern represents core flow.
    const octaves = [32, 64, 128].map((n, i) => ({
      n,
      weight: [0.52, 0.3, 0.18][i],
      grid: Float32Array.from({ length: n * n }, (_, k) =>
        hash((k % n) + 17 * i, Math.floor(k / n) + 71 * i),
      ),
    }));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (const { n, weight, grid } of octaves) {
          const gx = (x / size) * n,
            gy = (y / size) * n,
            ix = Math.floor(gx),
            iy = Math.floor(gy),
            fx = gx - ix,
            fy = gy - iy,
            sx = fx * fx * (3 - 2 * fx),
            sy = fy * fy * (3 - 2 * fy);
          const a = grid[iy * n + ix],
            b = grid[iy * n + ((ix + 1) % n)],
            c = grid[((iy + 1) % n) * n + ix],
            d = grid[((iy + 1) % n) * n + ((ix + 1) % n)];
          value += weight * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
        }
        height[y * size + x] = value;
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const k = (y * size + x) * 4,
          grain = height[y * size + x],
          strength = solid ? 0.48 : 0.1;
        const dx =
          (height[y * size + ((x + 1) % size)] - height[y * size + ((x + size - 1) % size)]) *
          strength;
        const dy =
          (height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x]) *
          strength;
        const normal = new THREE.Vector3(-dx, -dy, 1).normalize(),
          r = solid ? 0.87 + 0.11 * grain : 0.94 + 0.04 * grain;
        normals[k] = Math.round((normal.x * 0.5 + 0.5) * 255);
        normals[k + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
        normals[k + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
        normals[k + 3] = 255;
        roughness[k] = roughness[k + 1] = roughness[k + 2] = Math.round(r * 255);
        roughness[k + 3] = 255;
      }
    return [normals, roughness].map((data) => {
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.setScalar(solid ? 6 : 3);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 8;
      texture.colorSpace = THREE.NoColorSpace;
      texture.needsUpdate = true;
      return texture;
    });
  }, [solid]);
  useEffect(() => () => maps.forEach((texture) => texture.dispose()), [maps]);
  return (
    <meshPhysicalMaterial
      attach={attach}
      color={solid ? "#e2dfce" : "#c1a577"}
      metalness={solid ? 0.76 : 0.82}
      roughness={solid ? 0.39 : 0.27}
      normalMap={maps[0]}
      normalScale={new THREE.Vector2(solid ? 0.45 : 0.2, solid ? 0.45 : 0.2)}
      roughnessMap={maps[1]}
      envMapIntensity={solid ? 3.2 : 4}
      side={THREE.DoubleSide}
    />
  );
}
function Layer({
  index,
  inner,
  outer,
  opening,
  offset,
}: {
  index: number;
  inner: number;
  outer: number;
  opening: number;
  offset: number;
}) {
  const day = useTexture("/textures/earth-day.jpg"),
    bump = useTexture("/textures/earth-bump.jpg"),
    normal = useRockNormal();
  const g = useMemo(() => shellSection(inner, outer, opening), [inner, outer, opening]);
  useEffect(() => () => g.dispose(), [g]);
  const compact = useIsCompact();
  const l = layers[index],
    middle = (inner + outer) / 2,
    theta = [0.7, 1.08, 1.55, 2.05][index];
  day.colorSpace = THREE.SRGBColorSpace;
  day.wrapS = THREE.RepeatWrapping;
  day.anisotropy = 16;
  return (
    <group position={[-offset, 0, 0]}>
      <InspectHotspot name={l.name} note={l.note}>
        <mesh geometry={g} castShadow receiveShadow>
          {index < 2 ? (
            <>
              <meshStandardMaterial
                attach="material-0"
                color={index === 0 ? "#ffffff" : l.color}
                map={index === 0 ? day : null}
                bumpMap={index === 0 ? bump : null}
                bumpScale={0.003}
                normalMap={index === 1 ? normal : null}
                normalScale={new THREE.Vector2(0.2, 0.2)}
                roughness={l.rough}
                metalness={l.metal}
                side={THREE.DoubleSide}
              />
              <PhotographicRockMaterial
                attach="material-1"
                color={index === 0 ? "#c9b795" : "#b4ac87"}
                desaturate={0.85}
                wet={false}
                sceneScale={6}
                exposure={1.55}
                roughness={l.rough}
                metalness={l.metal}
                side={THREE.DoubleSide}
              />
            </>
          ) : (
            <>
              <CoreMaterial attach="material-0" solid={index === 3} />
              <CoreMaterial attach="material-1" solid={index === 3} />
            </>
          )}
        </mesh>
      </InspectHotspot>
      <Line
        points={[
          [
            middle * Math.sin(theta) * Math.cos(opening / 2),
            middle * Math.cos(theta),
            middle * Math.sin(theta) * Math.sin(opening / 2),
          ],
          [1.05, (1.5 - index) * 0.48, -1.2],
        ]}
        color={l.color}
        lineWidth={1}
      />
      <Tag
        pos={[1.05, (1.5 - index) * 0.48, -1.2]}
        text={compact ? String(index + 1) : l.name}
        title={`${index + 1} · ${l.name}`}
        note={l.note}
        occlude={false}
      />
    </group>
  );
}
function DepthRuler({ opening }: { opening: number }) {
  const phi = opening / 2 + 0.001,
    theta = 2.52,
    p = (r: number): [number, number, number] => [
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi),
    ];
  return (
    <group>
      {[410, 660].map((depth) => (
        <Line
          key={depth}
          points={Array.from({ length: 81 }, (_, i) => {
            const a = 0.18 + (i / 80) * (Math.PI - 0.36),
              r = 1 - depth / 6371;
            return [
              r * Math.sin(a) * Math.cos(phi),
              r * Math.cos(a),
              r * Math.sin(a) * Math.sin(phi),
            ] as [number, number, number];
          })}
          color="#bfac7f"
          transparent
          opacity={0.6}
          lineWidth={1}
          dashed
          dashSize={0.018}
          gapSize={0.016}
        />
      ))}
      <Line points={[p(0.99), p(0.17)]} color="#e7d9b5" lineWidth={1} />
      {[0, 660, 2891, 5150].map((depth) => {
        const q = p(1 - depth / 6371);
        return (
          <Line
            key={depth}
            points={[
              [q[0] - 0.022, q[1], q[2]],
              [q[0] + 0.022, q[1], q[2]],
            ]}
            color="#f3e3c7"
            lineWidth={1.5}
          />
        );
      })}
    </group>
  );
}
function WavePaths({ opening }: { opening: number }) {
  const t = useLabControls((s) => s.t),
    phi = opening / 2 - 0.012;
  // Two radial transmission illustrations lie just above the exposed cut face.
  // They show permitted wave types, not refraction, travel times or shadow zones.
  const point = (r: number, theta: number): [number, number, number] => [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
  const p = [point(0.98, 0.85), point(0.03, 0.85)];
  const shear: [number, number, number][] = Array.from({ length: 65 }, (_, i) =>
    point(
      0.98 - (i / 64) * (0.98 - 0.548),
      1.45 + 0.025 * Math.sin((i / 64) * Math.PI * 8 - t * Math.PI * 8),
    ),
  );
  return (
    <group>
      <Line
        points={p}
        color="#7fd4ff"
        lineWidth={3}
        depthTest={false}
        depthWrite={false}
        renderOrder={10}
      />
      <Line
        points={shear}
        color="#efb474"
        lineWidth={3}
        depthTest={false}
        depthWrite={false}
        renderOrder={10}
      />
      <mesh position={point(0.98 - t * 0.95, 0.85)} renderOrder={10}>
        <sphereGeometry args={[0.023, 16, 16]} />
        <meshBasicMaterial color="#bdeaff" depthTest={false} />
      </mesh>
    </group>
  );
}
export default function EarthInterior() {
  const compact = useIsCompact();
  const { trueScale, explode, slice, params } = useLabControls();
  useLabTick(1 / 10);
  const radii = [1, 1 - (35 / 6371) * (trueScale ? 1 : 4), 3480 / 6371, 1221 / 6371, 0];
  const opening = slice * Math.PI * 0.95,
    waves = params.waves > 0.5;
  return (
    <>
      <ScienceStudio
        slug="earth-interior"
        scale="Crust ×4 thickness · T restores a 35 km reference crust"
        trueScale="Radii to scale · 35 km reference crust · colours identify materials"
        camera={[3.8, 1.5, 3]}
      >
        <directionalLight position={[3, 2, 5]} intensity={2.2} color="#fff1db" />
        <directionalLight position={[-2, -1, 3]} intensity={0.8} color="#d8e8f5" />
        <group rotation={[0, -0.3, 0]}>
          {layers.map((l, i) => (
            <Layer
              key={l.name}
              index={i}
              outer={radii[i]}
              inner={radii[i + 1]}
              opening={opening}
              offset={explode * (3 - i) * 0.55}
            />
          ))}
          {slice > 0.05 && explode <= 0.01 && <DepthRuler opening={opening} />}{" "}
          {waves && explode <= 0.01 && <WavePaths opening={opening} />}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {compact && (
          <div className="mb-2 grid grid-cols-2 gap-1 text-left">
            {layers.map((layer, i) => (
              <span key={layer.name} style={{ borderBottom: `2px solid ${layer.color}` }}>
                {i + 1} · {layer.name}
              </span>
            ))}
          </div>
        )}
        {waves
          ? "Blue P waves pass through solid and liquid layers; amber S waves stop at the liquid outer core. Press Play to follow their motion."
          : "Earth's radius is 6,371 km. The outer-core boundary lies 3,480 km from the centre, and the inner core has a radius of 1,221 km."}
        {explode > 0.01 && " Reset layer spacing to compare depths."}
        <br />
        {waves
          ? "The radial paths illustrate transmission through different materials; they do not calculate the curved paths of seismic rays."
          : "Dashed mantle interfaces mark phase transitions at depths of 410 and 660 km. Colours and textures distinguish materials in the cutaway."}
      </ScienceReadout>
    </>
  );
}
