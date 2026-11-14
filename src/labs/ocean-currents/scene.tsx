import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabState } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { latLonToXYZ } from "@/lib/geo";
import { liveUniforms } from "@/lib/shader-uniforms";
import { COOL_BRANCH, SUBTROPICAL_GYRES, WARM_BRANCH } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { EarthMesh, Atmosphere } from "@/components/globe/earth";

type Gyre = (typeof SUBTROPICAL_GYRES)[number];
type Waypoint = Gyre["route"][number];
const SURFACE = 1.672;

function Globe() {
  return (
    <>
      <EarthMesh radius={1.65} lighting="viewer" />
      <Atmosphere radius={1.71} />
    </>
  );
}

/** A smooth closed curve through a gyre's waypoints, kept on the sphere. */
function routeCurve(route: readonly Waypoint[], radius = SURFACE) {
  const points = route
    .slice(0, -1)
    .map(([lat, lon]) => new THREE.Vector3(...latLonToXYZ(lat, lon, radius)));
  return new THREE.CatmullRomCurve3(points, true, "centripetal");
}

const WARM = new THREE.Color("#f0703f"),
  NEUTRAL = new THREE.Color("#dfe7e3"),
  COOL = new THREE.Color("#3d9be0");
/** Travel time along the route, in units that keep the moving pattern at one speed scale. */
const TIME_UNIT = 0.6;

/**
 * The gyre as a band lying on the sea surface: narrow where the current is fast, broad where it
 * is slow, orange where it carries warm water poleward and blue where it carries cool water
 * toward the equator. Chevrons drift along it at the local current speed, so they race up the
 * western boundary current and crawl along the eastern one; their spacing grows with speed.
 */
function gyreRibbon(route: readonly Waypoint[]) {
  const waypoints = route.slice(0, -1),
    curve = routeCurve(route),
    n = 600,
    samples = Array.from({ length: n }, (_, i) => {
      const u = i / n,
        at = u * waypoints.length,
        k = Math.floor(at),
        f = THREE.MathUtils.smoothstep(at - k, 0, 1),
        a = waypoints[k],
        b = waypoints[(k + 1) % waypoints.length];
      return {
        p: curve.getPoint(u).setLength(SURFACE),
        speed: THREE.MathUtils.lerp(a[2], b[2], f),
        warmth: THREE.MathUtils.lerp(a[3], b[3], f),
      };
    });
  samples.push({ ...samples[0], p: samples[0].p.clone() });
  // Travel time from the start; the pattern repeats a whole number of times around the loop.
  const time = [0];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i];
    time.push(time[i - 1] + a.p.distanceTo(b.p) / ((a.speed + b.speed) / 2));
  }
  const repeats = Math.max(8, Math.round(time[n] / TIME_UNIT)),
    positions: number[] = [],
    phases: number[] = [],
    colors: number[] = [],
    index: number[] = [],
    side = new THREE.Vector3(),
    color = new THREE.Color();
  samples.forEach((s, i) => {
    const before = samples[(i + n - 1) % n].p,
      after = samples[(i + 1) % n].p,
      half = 0.01 + 0.036 * (1 - s.speed) ** 1.5;
    side.subVectors(after, before).cross(s.p).normalize();
    for (const sign of [-1, 1]) {
      positions.push(
        ...s.p
          .clone()
          .addScaledVector(side, sign * half)
          .setLength(SURFACE)
          .toArray(),
      );
      phases.push((time[i] / time[n]) * repeats, sign < 0 ? 0 : 1);
    }
    color
      .copy(NEUTRAL)
      .lerp(s.warmth > 0 ? WARM : COOL, THREE.MathUtils.smoothstep(Math.abs(s.warmth), 0.15, 0.85));
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    if (i > 0) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i, 2 * i - 1, 2 * i + 1);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(phases, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  return g;
}

const RIBBON_VERTEX = /* glsl */ `
attribute vec3 color;
varying vec2 vUv; varying vec3 vColor;
void main(){ vUv=uv; vColor=color; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RIBBON_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv; varying vec3 vColor;
void main(){
  float across=abs(vUv.y-.5)*2.;
  // Chevrons pointing downstream: the center of each runs ahead of its edges.
  float ph=fract(vUv.x-uTime+across*.45);
  float chevron=smoothstep(.0,.1,ph)*(1.-smoothstep(.22,.34,ph));
  float edge=1.-smoothstep(.62,1.,across);
  gl_FragColor=vec4(vColor*(.72+.5*chevron),edge*(.5+.45*chevron));
  #include <colorspace_fragment>
}`;

function CurrentRibbon({ route }: { route: readonly Waypoint[] }) {
  const geometry = useMemo(() => gyreRibbon(route), [route]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useLabFrame((t) => {
    uniforms.uTime.value = t * 12;
  });
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        ref={liveUniforms(uniforms)}
        vertexShader={RIBBON_VERTEX}
        fragmentShader={RIBBON_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Gyre({ index }: { index: number }) {
  const g = SUBTROPICAL_GYRES[index];
  const { western, eastern, center } = useMemo(() => {
    const at = ([lat, lon]: Waypoint) => latLonToXYZ(lat, lon, SURFACE);
    const path = g.route.map(at),
      center = path
        .reduce((sum, q) => sum.add(new THREE.Vector3(...q)), new THREE.Vector3())
        .divideScalar(path.length);
    // Name the western current at its fastest point and the eastern one mid-way along it.
    const warm = g.route.filter((w) => w[3] >= WARM_BRANCH),
      cool = g.route.filter((w) => w[3] <= COOL_BRANCH),
      fastest = warm.reduce((a, b) => (b[2] > a[2] ? b : a));
    return { western: at(fastest), eastern: at(cool[Math.floor(cool.length / 2)]), center };
  }, [g]);
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      (g.center[0] * Math.PI) / 180,
      Math.PI - (g.center[1] * Math.PI) / 180,
      0,
      "XYZ",
    ),
  );
  return (
    <group quaternion={rotation}>
      <Globe />
      <OtherGyres selected={index} />
      <DrivingWinds index={index} />
      <CurrentRibbon route={g.route} />
      <Tag
        pos={outside(western, center)}
        text={g.western}
        tone="magma"
        note="Western boundary current: narrow, fast and warm, carrying water poleward along the edge of the continent."
        occlude={false}
      />
      <Tag
        pos={outside(eastern, center)}
        text={g.eastern}
        tone="glacier"
        note="Eastern boundary current: broad, slow and cool, carrying water toward the equator."
        occlude={false}
      />
    </group>
  );
}
/** Place a current's label just outside the loop, so it names the branch without covering it. */
function outside(p: [number, number, number], center: THREE.Vector3) {
  const point = new THREE.Vector3(...p),
    away = point.clone().sub(center).setLength(0.8);
  return point.add(away).setLength(1.78).toArray() as [number, number, number];
}
export default function OceanCurrents() {
  const { params } = useLabState("params");
  useLabTick(1 / 50);
  const index = Math.round(params.basin ?? 0),
    g = SUBTROPICAL_GYRES[index];
  return (
    <>
      <ScienceStudio
        slug="ocean-currents"
        camera={[0, 0.8, 6]}
        scale="Geographic globe · current routes schematic · band width and chevron speed show relative current speed, not measured widths"
        trueScale="Globe at one scale · band widths are symbols, not measured current widths"
      >
        <Gyre index={index} />
        <Tag
          pos={[0, 2.05, 0]}
          text={`${g.name} subtropical gyre`}
          note="The routes show the broad direction of the surface currents. Trace the western branch flowing poleward and the eastern branch flowing toward the equator. Band width and the chevrons' speed show where the current is fast or slow, on one scale for all five gyres."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {g.western}
        {": warm western boundary current, narrow and fast, flowing poleward (orange). "}
        {g.eastern}
        {": cool eastern boundary current, broad and slow, flowing toward the equator (blue). "}
        {g.center[0] > 0
          ? "This northern gyre turns clockwise, as Earth’s rotation deflects moving water to the right."
          : "This southern gyre turns counterclockwise, as Earth’s rotation deflects moving water to the left."}{" "}
        <br />
        {
          "The same circulation squeezes into a narrow, fast current on the western side of each ocean basin (westward intensification, also a result of Earth's rotation) and spreads slowly across the rest. Viewed on a map, northern subtropical gyres turn clockwise and southern ones counterclockwise; the faint loops show the other four. Trade winds blowing toward the west on the equator side and westerlies on the poleward side drive each gyre. Currents shape coastal climates: the cool California Current helps keep San Francisco's summers cool and foggy, while the Gulf Stream carries warm water along the U.S. East Coast and on across the Atlantic."
        }
      </ScienceReadout>
    </>
  );
}

/** Gyre loops on the globe for the four basins not selected, so the global pattern shows. */
function OtherGyres({ selected }: { selected: number }) {
  const loops = useMemo(
    () =>
      SUBTROPICAL_GYRES.flatMap((g, k) =>
        k === selected
          ? []
          : [
              {
                key: g.name,
                points: routeCurve(g.route, 1.668)
                  .getPoints(160)
                  .map((v) => v.setLength(1.668).toArray() as [number, number, number]),
              },
            ],
      ),
    [selected],
  );
  return (
    <>
      {loops.map((l) => (
        <Line
          key={l.key}
          points={l.points}
          color="#d9e4e1"
          transparent
          opacity={0.42}
          lineWidth={1.6}
        />
      ))}
    </>
  );
}

/**
 * The winds that drive the selected gyre: trade winds blowing toward the west on its
 * equator side and westerlies blowing toward the east on its poleward side. Schematic.
 */
function DrivingWinds({ index }: { index: number }) {
  const g = SUBTROPICAL_GYRES[index],
    south = g.center[0] < 0,
    lats = g.route.map(([lat]) => Math.abs(lat)),
    lons = g.route.map(([, lon]) => lon),
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
