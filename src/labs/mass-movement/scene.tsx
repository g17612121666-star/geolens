import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { SLUMP, slumpBase, slumpStability, rotateSlump } from "@/lib/slump-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { RootNetwork, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import {
  BLOCK,
  Region,
  SLIDE_GLSL,
  SLIDE_HALF_WIDTH,
  hillside,
  rotate,
  slideField,
  slipSpan,
} from "./slide";

/** Grid of the ground surface: about 2.5 cm (25 cm on the ground) between points. */
const NX = 300,
  NZ = 72;
const W = BLOCK.right - BLOCK.left,
  D = -BLOCK.back;

/**
 * Cut faces: topsoil, a weathered zone and laminated clay over mudstone, below the original
 * hillside. Inside the slumped block, points are turned back to where they started, so the
 * block's layers tilt with it; the toe spread beyond the slip surface is churned soil.
 */
const SLOPE_GLSL = `uniform float uAngle;
${SLIDE_GLSL}
vec3 slLayers(float x,float y,float d,float g,float zc){
  vec3 col;
  if(d<.035)col=mix(vec3(.30,.23,.17),vec3(.37,.28,.20),g);
  else if(d<.3+.06*sNoise(vec2(x*3.,0.))){
    col=mix(vec3(.58,.44,.30),vec3(.64,.50,.34),g);
    col=mix(col,vec3(.72,.52,.30),smoothstep(.68,.74,sNoise(vec2(x+zc,y)*22.))*.6);
  }else{
    float lam=fract(y*13.+.12*sNoise(vec2(x*2.,0.)));
    col=mix(vec3(.56,.51,.44),vec3(.49,.45,.39),step(.55,lam))*mix(.93,1.06,g);
  }
  if(y<-.42+.05*sNoise(vec2(x*2.,1.))){
    float bed=fract(y*5.);
    col=mix(vec3(.43,.42,.41),vec3(.37,.36,.35),g)*mix(.75,1.,smoothstep(0.,.08,bed));
  }
  return col;
}
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(p.xy+p.zy),r2=slR2(p.z),toe=slToe(r2);
  float c=cos(uAngle),s=sin(uAngle);
  vec2 q=vec2(p.x,p.y-SL_CY),o=vec2(q.x*c+q.y*s,SL_CY-q.x*s+q.y*c);
  bool moving=r2>0.&&uAngle>0.;
  vec3 col;
  if(moving&&p.x<=toe&&o.x*o.x+(o.y-SL_CY)*(o.y-SL_CY)<r2&&o.y<1.-.25*o.x)
    col=slLayers(o.x,o.y,1.-.25*o.x-o.y,g,p.z);
  else if(moving&&p.x>toe&&p.y>slHill(p.x)){
    float lump=smoothstep(.55,.7,sNoise(p.xy*vec2(26.,30.)+p.z*3.));
    col=mix(mix(vec3(.47,.37,.27),vec3(.58,.46,.33),g),vec3(.30,.25,.19),lump*.6);
  }else col=slLayers(p.x,p.y,slHill(p.x)-p.y,g,p.z);
  // The shear zone along the slip surface, where it runs through the ground.
  if(r2>0.&&p.y<slHill(p.x)+.01){
    float rho=length(vec2(p.x,p.y-SL_CY));
    col*=mix(.55,1.,smoothstep(0.,.03,abs(rho-sqrt(r2))));
  }
  return col;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/**
 * The block of ground: a height field over the hillside with closed sides and base, laid out
 * like terrainBlockGeometry but with separate resolutions along and across the slope. The
 * surface (group 0) is updated in place as the slump moves; the sides follow its edges.
 */
function slopeGeometry() {
  const top = new THREE.PlaneGeometry(W, D, NX, NZ);
  top.rotateX(-Math.PI / 2);
  top.translate((BLOCK.left + BLOCK.right) / 2, 0, -D / 2);
  const p = top.attributes.position,
    positions = Array.from(p.array),
    indices = Array.from(top.index!.array),
    topCount = indices.length,
    /** Vertex index of each side-wall top vertex, and the surface point it follows. */
    wallTops: [number, number][] = [];
  for (let k = 0; k < p.count; k++) positions[k * 3 + 1] = hillside(p.getX(k));
  const at = (i: number, j: number) => j * (NX + 1) + i,
    edge: number[] = [];
  for (let j = 0; j <= NZ; j++) edge.push(at(0, j));
  for (let i = 1; i <= NX; i++) edge.push(at(i, NZ));
  for (let j = NZ - 1; j >= 0; j--) edge.push(at(NX, j));
  for (let i = NX - 1; i >= 0; i--) edge.push(at(i, 0));
  for (let e = 1; e < edge.length; e++) {
    const a = edge[e - 1],
      b = edge[e],
      start = positions.length / 3;
    for (const v of [a, b])
      positions.push(p.getX(v), positions[v * 3 + 1], p.getZ(v), p.getX(v), BLOCK.base, p.getZ(v));
    // Order: a top, a base, b top, b base.
    wallTops.push([start, a], [start + 2, b]);
    indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
  }
  const b = positions.length / 3;
  positions.push(
    BLOCK.left,
    BLOCK.base,
    BLOCK.back,
    BLOCK.left,
    BLOCK.base,
    0,
    BLOCK.right,
    BLOCK.base,
    0,
    BLOCK.right,
    BLOCK.base,
    BLOCK.back,
  );
  indices.push(b, b + 2, b + 1, b, b + 3, b + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  // Dummy UVs for the surface texture: the terrain photo is used for brightness only.
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let k = 0; k < p.count; k++) {
    uv[k * 2] = (p.getX(k) - BLOCK.left) / 2;
    uv[k * 2 + 1] = p.getZ(k) / 2;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.addGroup(0, topCount, 0);
  g.addGroup(topCount, indices.length - topCount, 1);
  top.dispose();
  return { geometry: g, wallTops };
}

const MEADOW = new THREE.Color("#7f9a55"),
  LUSH = new THREE.Color("#6a8a46"),
  DRY = new THREE.Color("#9aa064"),
  TOPSOIL = new THREE.Color("#6f5743"),
  WEATHERED = new THREE.Color("#c39463"),
  CLAY = new THREE.Color("#b3aa9b"),
  CRACK = new THREE.Color("#4f3f30"),
  CHURNED = new THREE.Color("#7a5f43");

/** Surface colors: grass on the old ground surface, bare soil and clay on the fresh scarp,
 * tension cracks in the ground above it and across the block, torn turf on the toe. */
function paint(
  colors: THREE.BufferAttribute,
  field: ReturnType<typeof slideField>,
  heights: ArrayLike<number>,
) {
  const c = new THREE.Color();
  for (let j = 0; j <= NZ; j++) {
    const z = BLOCK.back + (j * D) / NZ,
      span = slipSpan(z);
    for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i,
        x = BLOCK.left + (i * W) / NX,
        n = noise(x * 3.1 + 7, z * 3.1),
        fine = noise(x * 17, z * 17);
      c.copy(MEADOW).lerp(LUSH, n * 0.6);
      // The upland and the valley floor are a little drier and damper than the slope.
      c.lerp(DRY, (1 - THREE.MathUtils.smoothstep(x, -3.6, -2.9)) * 0.35);
      c.lerp(LUSH, THREE.MathUtils.smoothstep(x, 2.2, 3.2) * 0.4);
      const region = field.region[k];
      if (region === Region.Scarp) {
        // Fresh scar: topsoil at its lip, then weathered soil, then gray clay; damp toward its foot.
        const depth = hillside(x) - heights[k];
        c.copy(TOPSOIL)
          .lerp(WEATHERED, THREE.MathUtils.smoothstep(depth, 0.015, 0.05))
          .lerp(CLAY, THREE.MathUtils.smoothstep(depth, 0.22, 0.34));
        // Streaks where soil and water have run down the fresh face.
        c.multiplyScalar(0.9 + 0.2 * noise(z * 40, depth * 6));
      } else if (region === Region.Block && span) {
        // Cracks open across the block where it bends over its curved base, mostly near the head.
        const from = field.from[k],
          wobble = 0.03 * (noise(z * 6, from * 4) - 0.5);
        let crack = 0;
        for (const d of [0.22, 0.48, 0.8])
          crack = Math.max(crack, Math.exp(-(((from - span.left - d + wobble) / 0.018) ** 2)));
        c.lerp(DRY, 0.15).lerp(CRACK, crack * (0.55 + 0.4 * fine));
      } else if (region === Region.Toe) {
        // Turf torn along cracks that open downslope as the toe spreads; bare soil at its front.
        const radial = Math.abs(Math.sin(z * 26 + 3 * noise(x * 5, z * 5))),
          front = 1 - THREE.MathUtils.smoothstep(heights[k] - hillside(x), 0.01, 0.06);
        c.lerp(CHURNED, Math.max((1 - THREE.MathUtils.smoothstep(radial, 0.05, 0.2)) * 0.8, front));
      } else if (span && x < span.left && x > span.left - 0.3) {
        // Tension cracks in the ground above the crown, parallel to it.
        const lip = span.left - x;
        c.lerp(CRACK, Math.exp(-(((lip - 0.16) / 0.012) ** 2)) * 0.7 * fine);
      }
      colors.setXYZ(k, c.r, c.g, c.b);
    }
  }
  colors.needsUpdate = true;
}

/** The hillside and the slump block, updated in place when the block's rotation changes. */
function SlopeGround({ angle }: { angle: number }) {
  const { geometry, wallTops } = useMemo(slopeGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const field = slideField(angle, NX, NZ),
      p = geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < field.height.length; k++) p.setY(k, field.height[k]);
    for (const [v, k] of wallTops) p.setY(v, field.height[k]);
    p.needsUpdate = true;
    paint(geometry.attributes.color as THREE.BufferAttribute, field, field.height);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [geometry, wallTops, angle]);
  const uniforms = useSectionUniforms({ uAngle: angle });
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
      <SectionMaterial
        attach="material-1"
        glsl={SLOPE_GLSL}
        uniforms={uniforms}
        cacheKey="slump-slope-v2"
      />
    </mesh>
  );
}

/** Trees on stable ground: the upland and upper slope, and the valley floor beyond the toe. */
const STABLE_TREES = (() => {
  const out: [number, number, number][] = [];
  for (let i = 0; out.length < 34 && i < 600; i++) {
    const x = BLOCK.left + 0.1 + random(i + 11) * (W - 0.2),
      z = BLOCK.back + 0.08 + random(i + 23) * (D - 0.16),
      span = slipSpan(z);
    // Keep clear of the slump, its toe and the cut face.
    if (span && x > span.left - 0.3 && x < span.right + 0.75) continue;
    if (Math.abs(z) < SLIDE_HALF_WIDTH + 0.2 && x > -2.85 && x < 2.5) continue;
    if (random(i + 29) > 0.75) continue;
    out.push([x, hillside(x) - 0.004, z]);
  }
  return out;
})();
/** Trees on the slump block, at their places on the original slope (the block turns them). */
const BLOCK_TREES = (() => {
  const out: [number, number, number][] = [];
  for (let i = 0; out.length < 16 && i < 600; i++) {
    const z = -0.06 - random(i + 101) * (SLIDE_HALF_WIDTH - 0.25),
      span = slipSpan(z);
    if (!span) continue;
    const x = span.left + 0.25 + random(i + 131) * (span.right - span.left - 0.7);
    out.push([x, hillside(x) - 0.004, z]);
  }
  return out;
})();
const ARC = Array.from({ length: 121 }, (_, i): [number, number, number] => {
  const x = SLUMP.left + ((SLUMP.right - SLUMP.left) * i) / 120;
  return [x, slumpBase(x), 0.012];
});
const PRE_FAILURE = Array.from({ length: 81 }, (_, i): [number, number, number] => {
  const x = SLUMP.left - 0.2 + ((SLUMP.right - SLUMP.left + 0.8) * i) / 80;
  return [x, hillside(x), 0.014];
});

export default function MassMovement() {
  const { params } = useLabState("params");
  useLabTick(1 / 45);
  const rain = params.rain ?? 0.15,
    result = useMemo(() => slumpStability(rain), [rain]),
    // Play rotates the block only when the slope has failed; steps keep the ground rebuilds rare.
    reach = 0.3 * Math.min(1, Math.max(0, (1 - result.factor) / 0.2)),
    angle = useLabControls((s) => Math.round(s.t * reach * 400) / 400);
  const span = slipSpan(0)!,
    crown: [number, number] = [span.left, hillside(span.left)],
    back = rotate(crown[0], crown[1], angle),
    toe = rotate(span.right, hillside(span.right), angle);
  const waterTable = useMemo(
      () =>
        result.slices.map(
          (sl) =>
            [...rotateSlump(sl.x, slumpBase(sl.x) + (rain * sl.h) / 10, angle), 0.016] as [
              number,
              number,
              number,
            ],
        ),
      [result, rain, angle],
    ),
    ticks = useMemo(
      () =>
        result.slices
          .filter((_, i) => i % 16 === 8)
          .map(
            (s) =>
              [
                [...rotateSlump(s.x, slumpBase(s.x), angle), 0.016],
                [...rotateSlump(s.x, slumpBase(s.x) + (rain * s.h) / 10, angle), 0.016],
              ] as [number, number, number][],
          ),
      [result, rain, angle],
    ),
    debris = useMemo(
      () =>
        Array.from({ length: 22 }, (_, i): [number, number, number] => {
          const z = -0.05 - random(i + 701) * (SLIDE_HALF_WIDTH * 0.75),
            s = slipSpan(z)!,
            [bx] = rotate(s.left, hillside(s.left), angle),
            x = bx - 0.02 - 0.06 * random(i + 733);
          return [x, slideFieldHeight(x, z, angle) + 0.02, z];
        }),
      [angle],
    );
  return (
    <>
      <ScienceStudio
        horizon
        slug="mass-movement"
        camera={[2.4, 3.1, 6.6]}
        scale="Spoon-shaped slip surface · the cut face is the 2-D section the factor of safety uses · 1 scene unit = 10 m · no vertical exaggeration"
        trueScale="One common scale · rotation after failure is illustrative · trees and roots enlarged"
      >
        <SlopeGround angle={angle} />
        <PlantStand kind="broadleaf" positions={STABLE_TREES} scale={0.085} seed={41} />
        {/* The block turns about the slip surface's axis, carrying its trees and roots with it. */}
        <group position={[0, SLUMP.centreY, 0]} rotation={[0, 0, angle]}>
          <group position={[0, -SLUMP.centreY, 0]}>
            <PlantStand kind="broadleaf" positions={BLOCK_TREES} scale={0.08} seed={3} />
            {[-1.4, -0.5, 0.4, 1.2].map((x, i) => (
              <group key={i} position={[x, hillside(x), -0.006]}>
                <RootNetwork depth={0.18} spread={0.14} seed={i} />
              </group>
            ))}
          </group>
        </group>
        {angle > 0.02 && <DebrisField points={debris} size={0.03} color="#9a8b78" />}
        <Line points={ARC} color="#e0ad80" lineWidth={2} />
        {angle > 0.005 && (
          <Line
            points={PRE_FAILURE}
            color="#f2efe6"
            lineWidth={1.4}
            dashed
            dashSize={0.06}
            gapSize={0.05}
            transparent
            opacity={0.85}
          />
        )}
        {/* Water table from the model's pore-pressure heads: it rises with Pore pressure and
            moves with the block, so it never floats in the gap at the head. */}
        <Line
          points={waterTable}
          color="#3d8fd0"
          lineWidth={2.5}
          dashed
          dashSize={0.08}
          gapSize={0.04}
        />
        {ticks.map((points, i) => (
          <Line key={i} points={points} color="#83b9d0" transparent opacity={0.65} />
        ))}
        <Tag
          pos={[(crown[0] + back[0]) / 2, crown[1] + 0.55, -0.55]}
          text="Crown / head scarp"
          note="The crown is the top edge of the slide, where the head scarp breaks away. In 3-D the scarp curves round into the hill like a horseshoe, highest in the middle and dying out at the flanks. Cracks in the ground above it show where it may break back next."
          occlude={false}
        />
        <Tag
          pos={[Math.max(toe[0], span.right) + 0.3, hillside(span.right) + 0.5, -0.35]}
          text="Toe"
          note="As the block turns, its toe heaves up and is pushed out over the ground below, where it spreads and tears its turf. Real slumps deform as they move, can develop several shear surfaces and may turn into flows."
          occlude={false}
        />
        {angle > 0.08 && (
          <Tag
            pos={[back[0] + 0.9, back[1] + 0.35, -0.7]}
            text="Back-tilted block"
            note="Turning on its curved base, the block's surface tilts back toward the hill: trees on it lean uphill, and water can pond against the scarp. The rotation is illustrative; the model does not calculate how far or how fast the block moves."
            occlude={false}
          />
        )}
        <Tag
          pos={[0, -0.25, 0.05]}
          text="Curved shear surface"
          note="The slip surface is spoon-shaped. The cut face shows its central section, the 2-D slice the factor of safety is calculated for; the model tests this one chosen surface and does not search for the weakest one. Blue lines show water-pressure levels in the soil, not an underground lake. The dashed line is the ground surface before failure."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div className="mx-auto mb-2 max-w-md" aria-hidden="true">
          <p className="mb-1 text-[11px] text-mist">
            {"Factor of safety (resisting ÷ driving forces): below 1 the slope fails"}
          </p>
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-[#d0402f] via-[#e3b04b] to-[#4c9a5b]">
            <span
              className="absolute top-[-4px] h-[18px] w-[3px] rounded bg-chalk"
              style={{
                left: `${Math.min(100, Math.max(0, ((result.factor - 0.5) / 1.5) * 100))}%`,
              }}
            />
            <span
              className="absolute top-[-6px] h-[22px] w-px bg-chalk/60"
              style={{ left: "33.3%" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-mist">
            <span>0.5 · fails</span>
            <span>1.0 · balance</span>
            <span>2.0 · stable</span>
          </div>
        </div>
        {"Starting factor of safety "}
        {result.factor.toFixed(2)} {"· maximum pore pressure "}
        {result.maxPressure.toFixed(1)} {"kPa. "}
        {result.factor < 1
          ? "Driving forces exceed resistance: Play shows the slump rotating (illustrative)."
          : "Resistance exceeds driving forces: increase Pore pressure to compare."}{" "}
        <br />
        {
          "The Bishop calculation is for the central section on the cut face, with cohesion of 2 kPa, a friction angle of 15° and unit weight of 20 kN/m³ for the starting slope."
        }
      </ScienceReadout>
    </>
  );
}

/** Ground height at one point, for placing loose blocks on the slumped surface. */
function slideFieldHeight(x: number, z: number, angle: number) {
  const span = slipSpan(z);
  if (!span) return hillside(x);
  const [bx] = rotate(span.left, hillside(span.left), angle);
  // At the foot of the head scarp the ground is the exposed slip surface.
  if (x >= span.left && x < bx) return SLUMP.centreY - Math.sqrt(Math.max(0, span.r2 - x * x));
  return hillside(x);
}
