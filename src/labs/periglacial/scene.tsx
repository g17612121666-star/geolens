import { useMemo } from "react";
import * as THREE from "three";
import { GrassPatch, GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { ShallowWater } from "../shared/shallow-water";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
/** Ice-wedge polygons: a flat-topped hexagonal lattice, gently warped so cells are irregular. */
const R = 1.1,
  INNER = (R * Math.sqrt(3)) / 2;
function edgeDistance(x: number, z: number) {
  const wx = x + 0.2 * Math.sin(z * 1.7 + 1) + 0.07 * Math.sin(z * 4.1 + x * 0.7),
    wz = z + 0.2 * Math.sin(x * 1.5) + 0.07 * Math.sin(x * 3.7 - z * 0.9);
  const q = ((2 / 3) * wx) / R,
    r = (-wx / 3 + (Math.sqrt(3) / 3) * wz) / R,
    s = -q - r;
  let rq = Math.round(q),
    rr = Math.round(r);
  const rs = Math.round(s),
    dq = Math.abs(rq - q),
    dr = Math.abs(rr - r),
    ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  const cx = 1.5 * R * rq,
    cz = Math.sqrt(3) * R * (rr + rq / 2),
    dx = Math.abs(wx - cx),
    dz = Math.abs(wz - cz);
  return INNER - Math.max(dz, (dz + Math.sqrt(3) * dx) / 2);
}
/** The same lattice in GLSL, so wedges in the cut faces sit exactly below the surface troughs. */
const EDGE_GLSL = `
float edgeDistance(vec2 xz){
  float wx=xz.x+.2*sin(xz.y*1.7+1.)+.07*sin(xz.y*4.1+xz.x*.7);
  float wz=xz.y+.2*sin(xz.x*1.5)+.07*sin(xz.x*3.7-xz.y*.9);
  float q=(2./3.*wx)/${R.toFixed(2)},r=(-wx/3.+.57735*wz)/${R.toFixed(2)},s=-q-r;
  float rq=floor(q+.5),rr=floor(r+.5),rs=floor(s+.5);
  float dq=abs(rq-q),dr=abs(rr-r),ds=abs(rs-s);
  if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
  float cx=1.5*${R.toFixed(2)}*rq,cz=1.73205*${R.toFixed(2)}*(rr+rq/2.);
  float dx=abs(wx-cx),dz=abs(wz-cz);
  return ${INNER.toFixed(4)}-max(dz,(dz+1.73205*dx)/2.);
}`;

/** Frozen ground in section: active layer, permafrost with ice lenses, and wedges of foliated ice. */
const frozenGround = (
  wedge: string,
) => `uniform float uThaw,uFreeze,uWedge,uActive,uDepth,uWinter,uCrack;
${EDGE_GLSL}
vec3 sectionColour(vec3 p,vec3 w){
  float d=-w.y,g=grain(vec2(w.x+w.z,w.y));
  float e=${wedge};
  float hw=uWedge*clamp(1.-(d-uActive)/uDepth,0.,1.);
  // Beds are dragged upwards beside each wedge as it grows.
  float lift=.35*uWedge*exp(-max(e,0.)/.25);
  float lam=fract((d-lift)*9.);
  // Winter contraction crack: through the active layer and down the middle of the wedge.
  if(uWinter>.5&&d<1.9*uActive/.7&&abs(e)<uCrack)return vec3(.08,.1,.12);
  if(d>uActive-.02&&e<hw){
    float vein=fract(e*90./max(uWedge,.05));
    vec3 ice=mix(vec3(.80,.89,.92),vec3(.62,.78,.86),smoothstep(.3,.7,vein));
    return mix(ice,vec3(.55,.52,.48),smoothstep(.85,1.,vein)*.4);
  }
  vec3 c;
  if(d<.05)c=mix(vec3(.27,.23,.17),vec3(.33,.28,.20),g);
  else if(d<uActive){
    c=mix(vec3(.55,.46,.34),vec3(.50,.42,.31),g);
    // Thawed ground is darker and wetter than seasonally frozen ground. In autumn the
    // layer refreezes from the surface downwards, leaving a thawed band beneath.
    c*=d<uThaw&&d>uFreeze?.78:1.;
  }else{
    c=mix(vec3(.50,.48,.44),vec3(.44,.42,.39),step(.5,lam))*mix(.93,1.06,g);
    float lens=smoothstep(.86,.93,sNoise(vec2((w.x+w.z)*4.,(d-lift)*30.)));
    c=mix(c,vec3(.80,.86,.88),lens*.6);
  }
  c*=mix(.75,1.,smoothstep(0.,.012,abs(d-uActive)));
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
const SECTION_GLSL = frozenGround("abs(w.x)");
const NETWORK_GLSL = frozenGround("edgeDistance(w.xz)");

const TUNDRA = new THREE.Color("#7f8452"),
  RIM = new THREE.Color("#a29a68"),
  TROUGH = new THREE.Color("#5f7246"),
  SNOW = new THREE.Color("#eef2f3");

/** Low-centred polygons: troughs over the wedges, raised rims beside them and wet centres. */
function polygonHeight(x: number, z: number, growth: number) {
  const e = edgeDistance(x, z),
    g = 0.3 + 0.7 * growth;
  return (
    -0.05 * g * Math.exp(-((e / 0.07) ** 2)) +
    0.045 * g * Math.exp(-(((e - 0.2) / 0.08) ** 2)) -
    0.03 * g * THREE.MathUtils.smoothstep(e, 0.3, 0.6) +
    0.006 * (noise(x * 6, z * 6) - 0.5)
  );
}

export default function Periglacial() {
  const { params, t } = useLabControls();
  useLabTick(1 / 50);
  const growth = params.cycles ?? 0.45,
    view = Math.round(params.view ?? 0),
    width = 0.1 + 0.8 * growth,
    // Thaw deepens quickly at first, then more slowly (roughly with the square root of time),
    // reaching 0.7 m in late summer. In autumn the active layer refreezes from the surface down.
    thaw = t < 0.4 ? 0.7 * Math.sqrt(t / 0.4) : t < 0.55 ? 0.7 : 0,
    freeze = t < 0.4 || t >= 0.55 ? 0 : (0.7 * (t - 0.4)) / 0.15,
    winter = t >= 0.55;
  // Section view: metres. Network view: the same layering scaled down with the polygons.
  const sectionUniforms = useSectionUniforms({
    uThaw: thaw,
    uFreeze: freeze,
    uWedge: width / 2,
    uActive: 0.7,
    uDepth: 3.05,
    uWinter: winter ? 1 : 0,
    uCrack: 0.025,
  });
  const networkUniforms = useSectionUniforms({
    uThaw: thaw * 0.17,
    uFreeze: freeze * 0.17,
    uWedge: 0.03 + 0.1 * growth,
    uActive: 0.12,
    uDepth: 0.42,
    uWinter: winter ? 1 : 0,
    uCrack: 0.006,
  });
  const ground = useMemo(() => (x: number, z: number) => polygonHeight(x, z, growth), [growth]);
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const e = edgeDistance(x, z),
        c = TUNDRA.clone().lerp(RIM, Math.exp(-(((e - 0.2) / 0.08) ** 2)) * 0.8);
      c.lerp(TROUGH, Math.exp(-((e / 0.08) ** 2)));
      c.multiplyScalar(0.92 + 0.16 * noise(x * 7, z * 7));
      // Snow lies thickest in the troughs and thinly elsewhere.
      if (winter) c.lerp(SNOW, 0.75 + 0.2 * Math.exp(-((e / 0.1) ** 2)));
      return c.getStyle();
    },
    [winter],
  );
  const tussocks = useMemo(
    () =>
      Array.from({ length: 260 }, (_, i) => {
        const x = -2.9 + random(i + 3) * 5.8,
          z = -2.9 + random(i + 51) * 5.8;
        return [x, ground(x, z), z] as [number, number, number];
      }).filter(([x, , z]) => edgeDistance(x, z) > 0.12 && edgeDistance(x, z) < 0.32),
    [ground],
  );
  return (
    <>
      <ScienceStudio
        horizon
        slug="periglacial"
        camera={view === 0 ? [3.2, 3.4, 7.4] : [3.4, 5, 6]}
        scale={
          view === 0
            ? "10 m wide, 5 m deep · 0.7 m active layer · common scale"
            : "Ice-wedge polygon network · idealised pattern, not a field survey · relief exaggerated"
        }
        trueScale={
          view === 0
            ? "1 scene unit = 1 m · no vertical exaggeration · winter crack drawn wider"
            : "Polygon spacing is illustrative · cracks enlarged for clarity"
        }
      >
        {view === 0 ? (
          <>
            <mesh position={[0, -2.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[10, 5, 2]} />
              <SectionMaterial
                glsl={SECTION_GLSL}
                uniforms={sectionUniforms}
                cacheKey="periglacial-section"
                cliff={0.6}
                color={winter ? "#e9eef0" : "#7f8452"}
              />
            </mesh>
            <GrassPatch
              positions={Array.from({ length: 140 }, (_, i) => [
                -4.85 + random(i + 7) * 9.7,
                0,
                -0.95 + random(i + 97) * 1.9,
              ])}
              height={0.06}
              color={winter ? "#c9c2a8" : "#858b56"}
            />
            <Line
              points={[
                [-5, -0.7, 1.012],
                [5, -0.7, 1.012],
              ]}
              color="#e8dcc0"
              dashed
              dashSize={0.1}
              gapSize={0.08}
            />
            <Tag
              pos={[-2.7, 0.65, 0]}
              text={
                freeze > 0
                  ? `Refreezing from surface · ${freeze.toFixed(2)} m`
                  : thaw > 0.002
                    ? `Seasonal thaw · ${thaw.toFixed(2)} m`
                    : "Active layer frozen"
              }
              note="Seasonal thaw deepens through the summer to a maximum of 0.7 m, marked by the dashed line. In autumn the active layer refreezes from the surface downwards. Thawed ground is shown darker and wetter."
              occlude={false}
            />
            {winter && (
              <Tag
                pos={[0.6, 0.25, 1.2]}
                text="Winter crack"
                note="In intense winter cold the frozen ground contracts and cracks, usually along the same line through the wedge each year. Real cracks are only millimetres to a centimetre or two wide; the crack is drawn wider here so it can be seen. Next spring, meltwater runs into it and freezes as a new vein of ice."
                occlude={false}
              />
            )}
            <Tag
              pos={[2.7, -2, 1.2]}
              text="Permafrost"
              note="Permafrost is ground that stays at or below 0 °C for at least two consecutive years; it is not necessarily solid ice. The pale streaks are lenses of ground ice beneath the active layer."
              occlude={false}
            />
            <Tag
              pos={[-2.6, -3.8, 1.2]}
              text={`Ice wedge · ${width.toFixed(2)} m at top`}
              note="Intense winter cold makes frozen ground contract and crack. Meltwater enters the cracks and freezes as thin vertical veins, so the wedge widens year after year and pushes the neighbouring layers upwards. It is not caused by water simply expanding as it freezes, nor by a glacier."
              occlude={false}
            />
          </>
        ) : (
          <>
            <GeomorphicTerrain
              height={ground}
              colour={colour}
              width={6}
              depth={6}
              resolution={240}
              base={-0.6}
              cliff={0.3}
              mottle={0.04}
              sideGlsl={NETWORK_GLSL}
              sideUniforms={networkUniforms}
            />
            <ShallowWater
              land={ground}
              level={() => -0.012}
              width={6}
              depth={6}
              resolution={200}
              deep={0.02}
              shallowColour={winter ? "#dfe9ec" : "#7e9a8a"}
              deepColour={winter ? "#c4d8de" : "#3f6a70"}
            />
            <GrassPatch positions={tussocks} height={0.06} color={winter ? "#bdb59a" : "#8a8a55"} />
            <Tag
              pos={[0, 0.7, 0]}
              text="Thermal-contraction polygon network"
              note="Troughs lie above the ice wedges, with raised rims beside them and wet, low centres; the cut faces show a wedge beneath every trough. Natural polygons are irregular; this regular network is idealised, not a field survey."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {winter
          ? "Winter: the active layer is frozen; intense cold makes the ground contract and crack."
          : freeze > 0
            ? `Autumn freeze-back: the active layer refreezes from the surface down (${freeze.toFixed(2)} m frozen).`
            : `Thaw season: the active layer has thawed to ${thaw.toFixed(2)} m of its 0.70 m maximum; the permafrost below stays frozen.`}{" "}
        {"Long-term wedge development "}
        {(growth * 100).toFixed(0)}%.
        <br />
        {
          "Play runs through one year. Wedge development compares how much a wedge has grown, not how fast. Ice-wedge polygons differ from frost-sorted stone circles; neither needs a glacier on site."
        }
      </ScienceReadout>
    </>
  );
}
