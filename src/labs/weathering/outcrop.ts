import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { landscapeNoise, landscapeRandom } from "../shared/landscape-noise.ts";

const fract = (x: number) => x - Math.floor(x),
  clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x)),
  smooth = (x: number) => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };

/**
 * The weathering outcrop: two sandstone blocks either side of a vertical joint. 1 scene unit =
 * 0.5 m, so each block is 0.4 m wide and 0.5 m deep and stands 0.7 m above the ground; its
 * base runs a little way into the soil.
 */
export const BLOCK = { width: 0.8, depth: 1, top: 1.4, base: -0.08 };
const HX = BLOCK.width / 2,
  HY = (BLOCK.top - BLOCK.base) / 2,
  HZ = BLOCK.depth / 2;
/** Height of each block's center: its geometry is built around it. */
export const BLOCK_Y = (BLOCK.top + BLOCK.base) / 2;
/** Weathering rounds the outer edges; the lips of the joint stay fairly sharp. */
const EDGE = 0.1,
  LIP = 0.02;

/**
 * The two joint walls share this roughness, so they still fit together as the joint opens:
 * the offset of the joint plane along x (scene units) at height y and depth z.
 */
export const jointRelief = (y: number, z: number) =>
  0.011 * Math.sin(y * 6.3 + z * 2.1 + 0.4) +
  0.006 * Math.sin(y * 13.7 - z * 9.2 + 1.3) +
  0.004 * Math.sin(z * 17.1 + y * 3.3);
export const JOINT_RELIEF_GLSL = `float jointRelief(float y,float z){return .011*sin(y*6.3+z*2.1+.4)+.006*sin(y*13.7-z*9.2+1.3)+.004*sin(z*17.1+y*3.3);}`;

/** Bedding coordinate. Beds run on across the joint, so it uses x as if the joint were shut.
 * Beds are a few decimeters thick, and their thickness varies up the outcrop. */
export const bedCoord = (y: number, xClosed: number, z: number) =>
  y * 3.1 + 0.2 + 0.32 * Math.sin(y * 2.3 + 0.7) + 0.05 * Math.sin(xClosed * 3.1 + z * 2.3);
/** One value per bed: below 0.38 hard sandstone, then medium, above 0.7 soft silty beds. */
export const bedType = (i: number) => fract(i * 0.618034 + 0.31);
export const BED_GLSL = `
float bedCoord(float y,float xc,float z){return y*3.1+.2+.32*sin(y*2.3+.7)+.05*sin(xc*3.1+z*2.3);}
float bedType(float i){return fract(i*.618034+.31);}`;
/** Only the soft, silty beds weather back far enough to leave the harder ones as ledges. */
const bedDepth = (h: number) => (h < 0.38 ? 0 : h < 0.7 ? 0.003 : 0.016);
/** How far a face has weathered back: soft beds recede and leave the hard ones as ledges. */
export function bedRecession(yb: number) {
  const i = Math.floor(yb),
    f = yb - i,
    here = bedDepth(bedType(i));
  if (f < 0.08) {
    const below = (bedDepth(bedType(i - 1)) + here) / 2;
    return here + (below - here) * (1 - smooth(f / 0.08));
  }
  if (f > 0.92) {
    const above = (bedDepth(bedType(i + 1)) + here) / 2;
    return here + (above - here) * smooth((f - 0.92) / 0.08);
  }
  return here;
}

/** Value noise in three dimensions from three two-dimensional slices, about 0–1. */
const noise3 = (x: number, y: number, z: number) =>
  (landscapeNoise(x + 7.3, y) +
    landscapeNoise(z - 2.1, y + 3.7) +
    landscapeNoise(x + z + 1.3, z - x + 0.6)) /
  3;

/**
 * Maps a point on the plain box (block coordinates) to the weathered block surface: rounded
 * edges, lumpy faces, soft beds weathered back and a joint wall that follows `jointRelief`.
 * `side` is +1 for the block east of the joint. `lift` raises the point off the surface along
 * its outward direction, which is written to `normal`.
 */
export function blockSurface(
  v: THREE.Vector3,
  side: 1 | -1,
  out = new THREE.Vector3(),
  lift = 0,
  normal = new THREE.Vector3(),
) {
  const inner = -side * HX,
    r = LIP + (EDGE - LIP) * smooth(Math.abs(v.x - inner) / 0.14),
    rNeg = side === 1 ? LIP : EDGE,
    rPos = side === 1 ? EDGE : LIP,
    cx = clamp(v.x, -HX + rNeg, HX - rPos),
    cy = Math.min(v.y, HY - r),
    cz = clamp(v.z, -HZ + r, HZ - r),
    rx = v.x < cx ? rNeg : rPos,
    ux = (v.x - cx) / rx,
    uy = Math.max(0, v.y - cy) / r,
    uz = (v.z - cz) / r,
    len = Math.hypot(ux, uy, uz);
  let px = cx,
    py = cy,
    pz = cz;
  if (len < 1e-9) normal.set(0, v.y > 0 ? 1 : -1, 0);
  else {
    normal.set(ux / len, uy / len, uz / len);
    px += normal.x * rx;
    py += normal.y * r;
    pz += normal.z * r;
  }
  const wy = py + BLOCK_Y,
    wall = Math.abs(px - inner),
    up = Math.max(0, normal.y),
    lump =
      (noise3(px * 3.2 + side * 4.1, wy * 3.2, pz * 3.2) - 0.5) * 0.1 +
      (noise3(px * 12, wy * 12, pz * 12) - 0.5) * 0.024,
    dome = 0.012 * up * (1 - (px / HX) ** 2) * (1 - (pz / HZ) ** 2),
    recess = bedRecession(bedCoord(wy, px + side * HX, pz)) * (1 - up),
    // Weathering attacks the foot less than the exposed upper faces, so the block flares a little
    // toward its base; the joint wall keeps its shape so the two blocks still fit.
    flare = 0.03 * (1 - smooth(wy / BLOCK.top)) * (1 - up) * smooth(wall / 0.25),
    // The base, buried in the soil, stays flat.
    bump =
      normal.y < -0.5
        ? lift
        : (lump * (1 - 0.5 * up) - recess) * smooth(wall / 0.12) + dome + flare + lift;
  return out.set(
    px + normal.x * bump + jointRelief(wy, pz) * (1 - smooth(wall / 0.2)),
    py + normal.y * bump,
    pz + normal.z * bump,
  );
}

/** A jointed sandstone block around its own center; `side` is +1 east of the joint. */
export function jointBlockGeometry(side: 1 | -1) {
  const source = new THREE.BoxGeometry(BLOCK.width, HY * 2, BLOCK.depth, 32, 110, 40);
  source.deleteAttribute("uv");
  source.deleteAttribute("normal");
  const g = mergeVertices(source, 1e-6),
    p = g.attributes.position as THREE.BufferAttribute,
    v = new THREE.Vector3();
  source.dispose();
  for (let i = 0; i < p.count; i++) {
    blockSurface(v.fromBufferAttribute(p, i), side, v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Shader for the blocks: bedded sandstone, iron staining along the joint, lichen-crusted
 * tops, and optional moss and frost (uMoss, uFrost, 0–1). uHalf is half the joint width. */
export const BLOCK_GLSL = `
uniform float uFrost,uMoss,uHalf;
${JOINT_RELIEF_GLSL}
${BED_GLSL}
vec3 sectionColour(vec3 p,vec3 w){
  vec3 n=normalize(cross(dFdx(w),dFdy(w)));
  float up=n.y;
  float d=jointRelief(w.y,w.z),side=w.x>d?1.:-1.;
  float xc=w.x-side*uHalf,dj=max(0.,side*(w.x-d)-uHalf);
  float yb=bedCoord(w.y,xc,w.z),i=floor(yb),fy=fract(yb),h=bedType(i);
  vec2 q=vec2(xc+w.z,w.y);
  float g=grain(q*1.4);
  vec3 c=h<.38?vec3(.79,.68,.52):h<.7?vec3(.69,.58,.45):vec3(.58,.51,.45);
  // Iron oxide mottling: warmer and cooler patches across a bed.
  c=mix(c,c*vec3(1.06,.93,.82),smoothstep(.45,.8,sNoise(q*2.3+i*3.1))*.6);
  // Cross-bedding: faint inclined laminae inside the sandstone beds.
  float lam=fract(yb*6.+(xc*.8+w.z*.5)*(h<.7?(h-.3)*3.:0.)+.25*sNoise(q*4.));
  c*=.97+.05*smoothstep(.1,.45,lam)*smoothstep(.95,.6,lam);
  c*=mix(.93,1.04,g)*mix(.95,1.03,sNoise(q*vec2(2.,6.)));
  c*=mix(.82,1.,smoothstep(0.,.035,min(fy,1.-fy)));
  // Water moving down the joint leaves an orange-brown iron stain along it.
  c=mix(c,vec3(.6,.39,.21),(1.-smoothstep(0.,.07,dj))*.5);
  // Upward faces: a pale weathered crust with gray-green and orange lichens.
  float top=smoothstep(.5,.85,up);
  vec2 s=vec2(xc,w.z);
  vec3 crust=mix(vec3(.67,.65,.59),vec3(.6,.6,.54),sNoise(s*6.));
  crust=mix(crust,vec3(.6,.67,.53),smoothstep(.58,.64,sNoise(s*9.+3.))*.85);
  crust=mix(crust,vec3(.85,.6,.24),smoothstep(.8,.84,sNoise(s*26.-5.))*.75);
  crust=mix(crust,vec3(.2,.2,.19),smoothstep(.82,.86,sNoise(s*47.+9.))*.5);
  c=mix(c,crust*mix(.88,1.06,g),top*.9);
  // Small crustose lichen spots on the sides.
  float sl=sNoise(vec2((xc+w.z)*19.,w.y*19.))*.7+sNoise(vec2((xc-w.z)*43.,w.y*43.))*.3;
  c=mix(c,vec3(.6,.63,.55),(1.-top)*smoothstep(.7,.74,sl)*.45);
  // Moss cushions, thickest near the damp joint.
  float m=uMoss*smoothstep(.15,.6,up)*smoothstep(.5,.6,sNoise(s*5.+11.)*.65+g*.2+.3*(1.-smoothstep(0.,.3,dj)));
  c=mix(c,mix(vec3(.33,.45,.18),vec3(.5,.6,.25),sNoise(s*30.)),m);
  // Hoarfrost: on the tops first, then patchily on the sides.
  float fr=smoothstep(.45,.8,uFrost*(.4+.9*top)*(.55+.9*sNoise(s*16.+w.y*7.)));
  c=mix(c,vec3(.9,.95,.98)*mix(.9,1.06,sNoise(vec2(xc*90.+w.y*40.,w.z*90.))),fr*.92);
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}
// Sand-grain roughness, fixed to each block as the joint opens.
float sectionBump(vec3 p,vec3 w){
  float d=jointRelief(w.y,w.z),side=w.x>d?1.:-1.;
  vec3 b=vec3(w.x-side*uHalf,w.y,w.z);
  vec2 q1=vec2(b.x+b.y*.7,b.z+b.y*.3),q2=vec2(b.x*.6+b.z,b.y-b.x*.4);
  return .006*sNoise(q1*22.)+.0035*sNoise(q2*48.+3.)+.001*sNoise(q1*80.+7.);
}`;

/**
 * A tube along `points` whose radius follows `radius(u)` from u = 0 at the start to 1 at the
 * end. The uv runs along the tube in scene units and around it from 0 to 1, for bark.
 */
export function taperedTube(
  points: THREE.Vector3[],
  radius: (u: number) => number,
  segments = 48,
  radial = 8,
) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal"),
    frames = curve.computeFrenetFrames(segments, false),
    length = curve.getLength(),
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    p = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments,
      r = radius(u),
      n = frames.normals[i],
      b = frames.binormals[i];
    curve.getPointAt(u, p);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2,
        c = -Math.cos(a),
        s = Math.sin(a);
      pos.push(
        p.x + r * (c * n.x + s * b.x),
        p.y + r * (c * n.y + s * b.y),
        p.z + r * (c * n.z + s * b.z),
      );
      uv.push(u * length, j / radial);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return indexed(pos, uv, idx);
}

function indexed(pos: number[], uv: number[], idx: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Combines geometries that share position, uv and an index into one. */
export function combine(parts: THREE.BufferGeometry[]) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (const g of parts) {
    const base = pos.length / 3;
    pos.push(...(g.attributes.position.array as Float32Array));
    uv.push(...(g.attributes.uv.array as Float32Array));
    idx.push(...Array.from(g.index!.array, (i) => i + base));
    g.dispose();
  }
  return indexed(pos, uv, idx);
}

/**
 * A root squeezed flat in the joint: thin across the joint, wide along it. `path` holds (y, z)
 * points; the root follows the joint's relief, so it sits between the walls as the joint opens.
 */
export function jointRootGeometry(
  path: [number, number][],
  halfWidth: (u: number) => number,
  halfThickness: (u: number) => number,
  segments = 40,
  radial = 14,
) {
  const curve = new THREE.CatmullRomCurve3(
      path.map(([y, z]) => new THREE.Vector3(0, y, z)),
      false,
      "centripetal",
    ),
    length = curve.getLength(),
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    p = new THREE.Vector3(),
    t = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments,
      w = halfWidth(u),
      th = halfThickness(u);
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    // Frame: across the joint (x), and in the joint plane at right angles to the root.
    const by = t.z,
      bz = -t.y;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2,
        c = -Math.cos(a),
        s = Math.sin(a),
        y = p.y + s * w * by,
        z = p.z + s * w * bz;
      pos.push(c * th + jointRelief(y, z), y, z);
      uv.push(u * length, j / radial);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return indexed(pos, uv, idx);
}

/** Surface roots on each block: where they leave the trunk (z), their heading (radians, 0
 * straight away from the joint, positive toward the front) and a seed for their wander. */
const SURFACE_ROOTS: [z: number, heading: number, seed: number][] = [
  [0.02, 0.12, 1],
  [0.07, 1.0, 2],
  [-0.06, -0.95, 3],
];
/** A smooth wander, about −1 to 1. */
const wander = (s: number, seed: number) =>
  (landscapeNoise(s * 2.6 + seed * 13.1, seed * 7.7) - 0.5) * 2;

type PlainRoot = { points: THREE.Vector3[]; onSide: boolean; top: number };
const FACE_STEPS = 30;

/** A root's path on the plain box: from the trunk across the top, then down the face it reaches. */
function plainRootPath(side: 1 | -1, root: number): PlainRoot {
  const [z0, heading, seed] = SURFACE_ROOTS[root],
    h = heading + (side < 0 ? 0.12 : -0.08) * (root + 1),
    dx = side * Math.cos(h),
    dz = Math.sin(h),
    points: THREE.Vector3[] = [];
  let onSide = false;
  for (let s = 0; ; s += 0.025) {
    const sway = 0.04 * wander(s, seed + side * 5),
      x = -side * (HX - 0.035) + dx * s - dz * sway,
      z = z0 + dz * s + dx * sway;
    if (Math.abs(x) >= HX) {
      onSide = true;
      points.push(new THREE.Vector3(side * HX, HY, z));
      break;
    }
    if (Math.abs(z) >= HZ) {
      points.push(new THREE.Vector3(x, HY, Math.sign(z) * HZ));
      break;
    }
    points.push(new THREE.Vector3(x, HY, z));
  }
  const top = points.length,
    edge = points[top - 1],
    ground = -BLOCK_Y;
  for (let k = 1; k <= FACE_STEPS; k++) {
    const y = HY - ((HY - ground) * k) / FACE_STEPS,
      sway = 0.045 * wander(k * 0.05 + 3, seed * 2 + side);
    points.push(
      onSide
        ? new THREE.Vector3(side * HX, y, clamp(edge.z + sway, -HZ + 0.07, HZ - 0.07))
        : new THREE.Vector3(clamp(edge.x + sway, -HX + 0.07, HX - 0.07), y, edge.z),
    );
  }
  return { points, onSide, top };
}

/** A side root that leaves a main root partway down the face and runs diagonally to the soil. */
function plainLateral(root: PlainRoot, at: number, drift: number, seed: number) {
  const { points, onSide, top } = root,
    start = points[top + Math.round(at * (FACE_STEPS - 1))],
    ground = -BLOCK_Y,
    path = [start.clone()];
  for (let k = 1; k <= 16; k++) {
    const y = start.y - ((start.y - ground) * k) / 16,
      d = drift * (start.y - y) + 0.03 * wander(k * 0.07, seed);
    path.push(
      onSide
        ? new THREE.Vector3(start.x, y, clamp(start.z + d, -HZ + 0.06, HZ - 0.06))
        : new THREE.Vector3(clamp(start.x + d, -HX + 0.06, HX - 0.06), y, start.z),
    );
  }
  return { path, u: (top + at * (FACE_STEPS - 1)) / points.length };
}

/**
 * A root pressed against the rock: flattened across its width, tapering, and partly sunk into
 * the surface. `plain` is its path on the plain box, ending at the ground, where it turns into
 * the soil; `radius(u)` runs from its start (u = 0) to its tip.
 */
function rockRootGeometry(plain: THREE.Vector3[], side: 1 | -1, radius: (u: number) => number) {
  let pts = plain.map((v) => {
    const n = new THREE.Vector3();
    return { p: blockSurface(v, side, new THREE.Vector3(), 0, n), n };
  });
  const last = pts[pts.length - 1];
  for (const [out, down] of [
    [0.05, 0.05],
    [0.1, 0.14],
  ])
    pts.push({
      p: last.p
        .clone()
        .addScaledVector(last.n, out)
        .add(new THREE.Vector3(0, -down, 0)),
      n: last.n.clone(),
    });
  // Smooth the path twice, keeping its ends.
  for (let it = 0; it < 2; it++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      for (const k of [0.25, 0.75])
        next.push({ p: a.p.clone().lerp(b.p, k), n: a.n.clone().lerp(b.n, k).normalize() });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  const lengths = [0];
  for (let i = 1; i < pts.length; i++)
    lengths.push(lengths[i - 1] + pts[i].p.distanceTo(pts[i - 1].p));
  const total = lengths[lengths.length - 1],
    radial = 10,
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    t = new THREE.Vector3(),
    n = new THREE.Vector3(),
    b = new THREE.Vector3();
  pts.forEach(({ p, n: normal }, i) => {
    t.subVectors(pts[Math.min(pts.length - 1, i + 1)].p, pts[Math.max(0, i - 1)].p).normalize();
    n.copy(normal).addScaledVector(t, -normal.dot(t)).normalize();
    b.crossVectors(t, n);
    const r = radius(lengths[i] / total),
      thin = r * 0.62,
      wide = r * 1.3;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2,
        c = -Math.cos(a) * thin,
        s = Math.sin(a) * wide,
        lift = thin * 0.7;
      pos.push(
        p.x + n.x * (lift + c) + b.x * s,
        p.y + n.y * (lift + c) + b.y * s,
        p.z + n.z * (lift + c) + b.z * s,
      );
      uv.push(lengths[i], j / radial);
    }
  });
  for (let i = 0; i < pts.length - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        c = a + radial + 1;
      idx.push(a, c, a + 1, c, c + 1, a + 1);
    }
  return indexed(pos, uv, idx);
}

/**
 * Roots on one block: each runs from the trunk across the top, over the edge and down a face
 * into the soil, with side roots branching off on the face. They thicken as `growth` (0–1)
 * rises.
 */
export function surfaceRootGeometry(side: 1 | -1, growth: number) {
  const r0 = 0.016 + 0.026 * growth,
    main = (u: number) => r0 * (1 - u) ** 0.9 + 0.005,
    parts: THREE.BufferGeometry[] = [];
  SURFACE_ROOTS.forEach((_, i) => {
    const root = plainRootPath(side, i);
    parts.push(rockRootGeometry(root.points, side, main));
    for (const [at, drift] of [
      [0.3, i % 2 ? 0.5 : -0.5],
      [0.62, i % 2 ? -0.45 : 0.45],
    ]) {
      const lateral = plainLateral(root, at, drift, i * 3 + at * 10 + side),
        rb = main(lateral.u) * 0.6;
      parts.push(rockRootGeometry(lateral.path, side, (u) => rb * (1 - u) ** 0.8 + 0.0035));
    }
  });
  return combine(parts);
}

/** The root flare where the trunk meets the rock, elliptical across the joint and lobed. */
export function rootCollarGeometry(rx: number, rz: number, top: number, height: number) {
  const rings = 16,
    around = 48,
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const v = i / rings,
      flare = (1 - v) ** 1.6;
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI * 2,
        lobe = 1 + flare * (0.3 * Math.cos(5 * a + 0.7) + 0.1 * Math.cos(9 * a + 2.1));
      pos.push(
        Math.cos(a) * (top + (rx - top) * flare) * lobe,
        v * height,
        Math.sin(a) * (top + (rz - top) * flare) * lobe,
      );
      uv.push(v * height, j / around);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j,
        b = a + around + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return indexed(pos, uv, idx);
}

/** Glass tank for the dissolution demonstration: outer size and water level, scene units. */
export const TANK = { w: 2.3, h: 1.6, d: 1.8, glass: 0.02, water: 1.36 };
/** Ion colors, shared by the dots in the tank and the readout's key. */
export const ION_COLORS = { calcium: "#d39a4a", bicarbonate: "#4fae86" };
/** The air stone on the tank floor that bubbles carbon dioxide into the water. */
export const AIR_STONE = new THREE.Vector3(-0.8, TANK.glass, -0.56);

/** Solution pits on the calcite sphere: fixed centers that widen and deepen with dissolution. */
const PITS = Array.from({ length: 90 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 90,
    r = Math.sqrt(1 - y * y),
    a = i * 2.399963 + landscapeRandom(i) * 0.7;
  return {
    dir: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
    size: 0.05 + 0.14 * landscapeRandom(i + 40) ** 1.5,
    depth: 0.5 + 0.5 * landscapeRandom(i + 90),
  };
});

/** Unit sphere etched with solution pits; `pitting` runs from 0 (fresh) to 1. */
export function pittedSphereGeometry(pitting: number) {
  const source = new THREE.SphereGeometry(1, 168, 112);
  source.deleteAttribute("uv");
  source.deleteAttribute("normal");
  const g = mergeVertices(source, 1e-6),
    p = g.attributes.position as THREE.BufferAttribute,
    v = new THREE.Vector3();
  source.dispose();
  const pits = PITS.map((k) => ({ ...k, rad: k.size * (0.45 + 0.55 * pitting) }));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let pit = 0;
    for (const k of pits) {
      const c = v.dot(k.dir);
      if (c <= Math.cos(k.rad)) continue;
      const u = Math.acos(Math.min(1, c)) / k.rad;
      pit += k.depth * (1 - u * u) ** 2;
    }
    const lumps = (noise3(v.x * 2 + 3, v.y * 2, v.z * 2) - 0.5) * 0.06,
      etch = (noise3(v.x * 14, v.y * 14, v.z * 14) - 0.5) * 0.03 * pitting,
      r = 1 + lumps + etch - 0.11 * pitting * Math.min(1.4, pit);
    p.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}
