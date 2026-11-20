import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLabFrame } from "@/labs/tick";
import {
  cloudPattern,
  contourSegments,
  frontLines,
  streamline,
  surfacePressure,
  type MapPoint,
} from "@/lib/pressure-system-science";
import { fbm } from "../shared/hazard-utils";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { TerrainMaterial } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { WaterSides } from "../shared/shallow-water";
import { CLOUD_BASE, CLOUD_DEPTH, MAP_SIZE, coast, ground, surface } from "./region";

const smooth = THREE.MathUtils.smoothstep;
function mapColor(x: number, z: number, y: number, col: THREE.Color, tone: THREE.Color) {
  const s = -coast(x, z);
  if (s < 0) return col.set("#5d8f95").lerp(tone.set("#22465c"), smooth(-s, 0.1, 1.2));
  // Seen from far above: a mosaic of farmland tones, forest on the uplands, beaches at the coast.
  const n = fbm(x * 1.1 + 7, z * 1.1 - 3),
    m = fbm(x * 3.3 - 4, z * 3.3 + 8);
  col.set("#97a766").lerp(tone.set("#7a9450"), n);
  col.lerp(tone.set("#aaa66b"), smooth(m, 0.55, 0.8) * 0.6);
  col.lerp(tone.set("#3e5b34"), smooth(n + 0.35 * smooth(s, 0.5, 2.2), 0.62, 0.8) * 0.85);
  col.lerp(tone.set("#7b7658"), smooth(y, 0.075, 0.115));
  return col.lerp(tone.set("#d7c99c"), 1 - smooth(s, 0, 0.05));
}

/** The land and sea under the weather: illustrative, not a real coastline. */
export function RegionMap() {
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(ground, MAP_SIZE, MAP_SIZE, 220, -0.32),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      mapColor(p.getX(i), p.getZ(i), p.getY(i), col, tone);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial attach="material-0" vertexColors roughness={0.95} />
        <TerrainMaterial attach="material-1" kind="soil" color="#7a6450" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAP_SIZE - 0.002, MAP_SIZE - 0.002]} />
        <FlowWaterMaterial color="#1d4f6e" opacity={0.86} speed={0.2} />
      </mesh>
      <WaterSides land={ground} level={() => 0} width={MAP_SIZE} depth={MAP_SIZE} />
    </group>
  );
}

/** Isobars every 8 hPa around the low, or 4 hPa around the high, draped over the map. */
export function Isobars({
  high,
  south,
  levels,
}: {
  high: boolean;
  south: boolean;
  levels: number[];
}) {
  const points = useMemo(
    () =>
      levels.map((level) => {
        const flat = contourSegments((x, z) => surfacePressure(x, z, high, south), level),
          out: [number, number, number][] = [];
        for (let i = 0; i < flat.length; i += 2)
          out.push([flat[i], surface(flat[i], flat[i + 1]) + 0.014, flat[i + 1]]);
        return out;
      }),
    [high, south, levels],
  );
  return (
    <group>
      {points.map((p, i) => (
        <Line key={levels[i]} points={p} segments color="#f6f1e4" lineWidth={1.7} />
      ))}
    </group>
  );
}

/** Points every `spacing` along a polyline, with the direction of the line there. */
function alongLine(line: MapPoint[], spacing: number, start: number) {
  const out: { x: number; z: number; dx: number; dz: number }[] = [];
  let next = start,
    travelled = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i],
      [bx, bz] = line[i + 1],
      span = Math.hypot(bx - ax, bz - az);
    while (next <= travelled + span) {
      const t = (next - travelled) / span;
      out.push({
        x: ax + t * (bx - ax),
        z: az + t * (bz - az),
        dx: (bx - ax) / span,
        dz: (bz - az) / span,
      });
      next += spacing;
    }
    travelled += span;
  }
  return out;
}

/** A polyline split into short pieces, so it can be draped over the map. */
function densify(line: MapPoint[], step = 0.04) {
  const out: MapPoint[] = [line[0]];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i],
      [bx, bz] = line[i + 1],
      n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

/**
 * Weather-map fronts: a cold front with triangles and a warm front with half circles, each on the
 * side the front is moving toward. The cold front pushes into the warm sector; the warm front
 * advances into the cold air ahead of it.
 */
export function Fronts({ south }: { south: boolean }) {
  const { cold, warm, warmSector } = useMemo(() => frontLines(south), [south]);
  const parts = useMemo(
    () =>
      [
        { line: cold, color: "#2f6fe4", triangles: true },
        { line: warm, color: "#e2483d", triangles: false },
      ].map(({ line, color, triangles }) => {
        const position: number[] = [];
        for (const s of alongLine(line, 0.36, 0.3)) {
          // Unit vector across the front, toward the warm sector.
          let nx = -s.dz,
            nz = s.dx;
          if (nx * (warmSector[0] - s.x) + nz * (warmSector[1] - s.z) < 0) [nx, nz] = [-nx, -nz];
          // The cold front's symbols point into the warm sector, the warm front's away from it.
          if (!triangles) [nx, nz] = [-nx, -nz];
          const lift = (x: number, z: number) => [x, surface(x, z) + 0.02, z];
          if (triangles) {
            position.push(
              ...lift(s.x - s.dx * 0.085, s.z - s.dz * 0.085),
              ...lift(s.x + s.dx * 0.085, s.z + s.dz * 0.085),
              ...lift(s.x + nx * 0.13, s.z + nz * 0.13),
            );
          } else {
            for (let k = 0; k < 10; k++) {
              const a0 = (k / 10) * Math.PI,
                a1 = ((k + 1) / 10) * Math.PI,
                at = (a: number): [number, number] => [
                  s.x + 0.075 * (Math.cos(a) * s.dx + Math.sin(a) * nx),
                  s.z + 0.075 * (Math.cos(a) * s.dz + Math.sin(a) * nz),
                ];
              position.push(...lift(s.x, s.z), ...lift(...at(a0)), ...lift(...at(a1)));
            }
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
        const path = densify(line).map(
          ([x, z]) => [x, surface(x, z) + 0.02, z] as [number, number, number],
        );
        return { geometry, path, color };
      }),
    [cold, warm, warmSector],
  );
  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);
  return (
    <group>
      {parts.map((p) => (
        // Drawn over the clouds, as fronts are on a surface analysis laid over a satellite image.
        <group key={p.color}>
          <Line
            points={p.path}
            color={p.color}
            lineWidth={3.4}
            transparent
            depthTest={false}
            renderOrder={5}
          />
          <mesh geometry={p.geometry} renderOrder={5}>
            <meshBasicMaterial
              color={p.color}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
              depthTest={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Cloud cover including patchy low cloud in the warm sector and showers in the cold air. */
function cloudAt(x: number, z: number, high: boolean, south: boolean) {
  const base = cloudPattern(x, z, high, south),
    texture = fbm(x * 1.6 + 11, z * 1.6 + 3),
    // Fade out at the edge of the map rather than end in a cliff of cloud.
    edge = 1 - smooth(Math.max(Math.abs(x), Math.abs(z)), MAP_SIZE / 2 - 0.45, MAP_SIZE / 2 - 0.08);
  return {
    cover:
      edge *
      Math.min(
        1,
        Math.max(
          base.cover * (0.85 + 0.3 * texture),
          0.34 * base.warmSector * texture,
          0.3 * base.coldAir,
        ),
      ),
    top: base.top,
  };
}

/** GLSL value noise for the cloud edges. */
const CLOUD_NOISE = `
float cdHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cdNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(cdHash(i),cdHash(i+vec2(1.,0.)),f.x),mix(cdHash(i+vec2(0.,1.)),cdHash(i+vec2(1.,1.)),f.x),f.y);}
float cdFbm(vec2 p){return .5*cdNoise(p)+.28*cdNoise(p*2.03+5.2)+.14*cdNoise(p*4.1-1.7)+.08*cdNoise(p*8.3+3.3);}
`;

/**
 * The cloud tops, seen from above as a satellite would: a heightfield lifted where the cloud is
 * thick. Cloud cover sets how much of each patch of sky is cloud; the ragged edges are drawn per
 * pixel, so they stay crisp at any zoom. The pattern is schematic, not a forecast.
 */
export function CloudDeck({ high, south }: { high: boolean; south: boolean }) {
  const geometry = useMemo(() => {
    const n = 170,
      g = new THREE.PlaneGeometry(MAP_SIZE - 0.1, MAP_SIZE - 0.1, n, n);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position,
      cover = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const c = cloudAt(p.getX(i), p.getZ(i), high, south);
      p.setY(i, CLOUD_BASE + smooth(c.cover, 0.3, 0.95) * CLOUD_DEPTH * c.top);
      cover[i] = c.cover;
    }
    g.setAttribute("cover", new THREE.BufferAttribute(cover, 1));
    g.computeVertexNormals();
    return g;
  }, [high, south]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.vertexShader =
        "attribute float cover; varying float vCover; varying vec2 vMap;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vCover = cover; vMap = position.xz;",
        );
      s.fragmentShader =
        `varying float vCover; varying vec2 vMap;\n${CLOUD_NOISE}\n` +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  // Cover is the share of sky that is cloud: a noise field above a threshold set by the cover.
  float n = cdFbm(vMap * 2.4) * .6 + cdFbm(vMap * 7.5 + 3.1) * .4;
  float edge = .86 - .74 * vCover;
  float a = smoothstep(edge - .05, edge + .09, n);
  if (a < .01) discard;
  diffuseColor.rgb *= mix(.8, 1., smoothstep(edge, edge + .25, n));
  diffuseColor.a *= a * .92;`,
        );
    },
    [],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#fcfdfe"
        transparent
        depthWrite={false}
        roughness={0.92}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "cyclone-cloud-deck-v1"}
      />
    </mesh>
  );
}

const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Rain falling from the cloud base where the pattern rains: steady ahead of the warm front,
 * heavy showers along the cold front. Moved every frame from lab time. */
export function FrontalRain({ south }: { south: boolean }) {
  const drops = useMemo(() => {
    const out: { x: number; z: number; ground: number; phase: number }[] = [];
    for (let i = 0; out.length < 700 && i < 9000; i++) {
      const x = (hash(i + 1) - 0.5) * (MAP_SIZE - 0.3),
        z = (hash(i + 77) - 0.5) * (MAP_SIZE - 0.3);
      if (hash(i + 191) < cloudPattern(x, z, false, south).rain * 0.8)
        out.push({ x, z, ground: surface(x, z), phase: hash(i + 313) });
    }
    return out;
  }, [south]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(drops.length * 6), 3));
    return g;
  }, [drops]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const written = useRef(-1);
  useLabFrame((t) => {
    if (written.current === t) return;
    written.current = t;
    const p = geometry.attributes.position;
    drops.forEach((d, i) => {
      const fall = CLOUD_BASE - d.ground,
        y = CLOUD_BASE - ((t * 6 + d.phase) % 1) * fall;
      p.setXYZ(i * 2, d.x, y, d.z);
      p.setXYZ(i * 2 + 1, d.x - 0.01, Math.max(d.ground, y - 0.045), d.z);
    });
    p.needsUpdate = true;
    geometry.computeBoundingSphere();
  });
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#b9dcec" transparent opacity={0.55} depthWrite={false} />
    </lineSegments>
  );
}

/** The point a distance `s` along a path (with cumulative lengths `cum`), and its direction. */
function pointAlong(
  path: THREE.Vector3[],
  cum: number[],
  s: number,
  target: THREE.Vector3,
  direction?: THREE.Vector3,
) {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const t = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  target.lerpVectors(path[i - 1], path[i], t);
  if (direction) direction.subVectors(path[i], path[i - 1]).normalize();
}

/**
 * Surface streamlines: the paths air takes across the isobars, into the low or out of the high,
 * with arrowheads along them and parcels of air that move along them as the lab plays.
 */
export function WindPaths({
  high,
  south,
  color,
}: {
  high: boolean;
  south: boolean;
  color: string;
}) {
  const paths = useMemo(() => {
    const starts: MapPoint[] = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2 + 0.25,
        r = high ? 0.35 : 3.15;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
    return starts.map((s) =>
      streamline(s, high, south).map(([x, z]) => new THREE.Vector3(x, surface(x, z) + 0.045, z)),
    );
  }, [high, south]);
  // Cumulative distance along each path, for placing heads and moving parcels at even speed.
  const lengths = useMemo(
    () =>
      paths.map((path) => {
        const out = [0];
        for (let i = 1; i < path.length; i++)
          out.push(out[i - 1] + path[i].distanceTo(path[i - 1]));
        return out;
      }),
    [paths],
  );
  const heads = useMemo(() => {
    const out: { position: THREE.Vector3; quaternion: THREE.Quaternion }[] = [],
      up = new THREE.Vector3(0, 1, 0);
    paths.forEach((_, k) => {
      const total = lengths[k].at(-1)!;
      for (let s = 0.75; s < total - 0.15; s += 1.05) {
        const position = new THREE.Vector3(),
          direction = new THREE.Vector3();
        pointAlong(paths[k], lengths[k], s, position, direction);
        // No heads in the crowded middle, where every path meets.
        if (Math.hypot(position.x, position.z) < 0.6) continue;
        out.push({
          position,
          quaternion: new THREE.Quaternion().setFromUnitVectors(up, direction),
        });
      }
    });
    return out;
  }, [paths, lengths]);
  const parcels = useRef<THREE.InstancedMesh>(null),
    PER_PATH = 2;
  const scratch = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4() }), []);
  useLabFrame((t) => {
    const mesh = parcels.current;
    if (!mesh) return;
    paths.forEach((_, k) => {
      const total = lengths[k].at(-1)!;
      for (let j = 0; j < PER_PATH; j++) {
        const s = (((t * 0.9 + j / PER_PATH + k * 0.137) % 1) + 1) % 1;
        pointAlong(paths[k], lengths[k], s * total, scratch.v);
        scratch.m.makeTranslation(scratch.v.x, scratch.v.y + 0.02, scratch.v.z);
        mesh.setMatrixAt(k * PER_PATH + j, scratch.m);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {paths.map((p, k) => (
        <Line key={k} points={p} color={color} lineWidth={1.5} transparent opacity={0.85} />
      ))}
      {heads.map((h, i) => (
        <mesh key={i} position={h.position} quaternion={h.quaternion}>
          <coneGeometry args={[0.045, 0.13, 14]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
      <instancedMesh ref={parcels} args={[undefined, undefined, paths.length * PER_PATH]}>
        <sphereGeometry args={[0.042, 14, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
