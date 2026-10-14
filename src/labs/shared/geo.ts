import * as THREE from "three";

/** Shared BufferGeometry builders. Landforms are carved meshes, not cone/box/sphere primitives. */

export function fbm(x: number, y: number, z = 0) {
  return (
    Math.sin(x * 1.7 + z) * Math.cos(y * 1.3) * 0.45 +
    Math.sin(x * 4.1 + 1.2) * Math.cos(y * 3.6 + z * 0.8) * 0.18 +
    Math.sin(x * 9.4 + y) * Math.cos(y * 8.2) * 0.06
  );
}

export function jointDisplace(g: THREE.BufferGeometry, amp = 0.018) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm(x * 2.2, y * 1.8, z * 2.2) * amp;
    const joint =
      Math.abs(Math.sin(x * 6.4 + z * 0.4)) < 0.09
        ? -amp * 1.6
        : Math.abs(Math.sin(y * 8.2)) < 0.08
          ? -amp * 0.9
          : 0;
    pos.setXYZ(i, x + n, y + n * 0.35 + joint, z + n * 0.75);
  }
  g.computeVertexNormals();
  return g;
}

export function headlandGeometry(stage: number, _res = 22): THREE.BufferGeometry {
  void _res;
  const s = Math.min(3, Math.max(0, Math.round(stage)));
  const g =
    s <= 0
      ? caveHeadland()
      : s === 1
        ? archHeadland()
        : s === 2
          ? stackHeadland()
          : stumpHeadland();
  jointDisplace(g, s >= 2 ? 0.028 : 0.02);
  paintFlintBands(g);
  return g;
}

function caveHeadland(): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  sh.moveTo(-0.78, -0.02);
  sh.bezierCurveTo(-0.82, 0.22, -0.7, 0.55, -0.62, 0.92);
  sh.bezierCurveTo(-0.42, 1.42, 0.38, 1.46, 0.6, 0.95);
  sh.bezierCurveTo(0.72, 0.52, 0.8, 0.18, 0.76, -0.02);
  sh.lineTo(0.22, -0.02);
  sh.bezierCurveTo(0.2, 0.22, 0.18, 0.42, 0.02, 0.5);
  sh.absarc(0, 0.42, 0.3, 0.15, Math.PI - 0.15, false);
  sh.bezierCurveTo(-0.18, 0.42, -0.22, 0.18, -0.24, -0.02);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 1.62,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.055,
    bevelSegments: 4,
    steps: 3,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -0.55);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < 0.22 && z > 0.05) pos.setZ(i, z - 0.09 * Math.exp(-((y - 0.11) ** 2) / 0.01));
  }
  g.computeVertexNormals();
  return g;
}

function archHeadland(): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  sh.moveTo(-0.82, 0);
  sh.lineTo(0.82, 0);
  sh.bezierCurveTo(0.78, 0.55, 0.58, 1.28, 0.22, 1.52);
  sh.bezierCurveTo(0.08, 1.62, -0.08, 1.62, -0.22, 1.52);
  sh.bezierCurveTo(-0.58, 1.28, -0.78, 0.55, -0.82, 0);
  sh.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, 0.52, 0.3, 0.4, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 0.95,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.045,
    bevelSegments: 4,
    steps: 3,
  });
  g.translate(0, 0, -0.48);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < 0.2) pos.setZ(i, z + (z > 0 ? -0.06 : 0.04) * Math.exp(-((y - 0.1) ** 2) / 0.008));
  }
  g.computeVertexNormals();
  return g;
}

function stackHeadland(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const y = 1.62 * (1 - t);
    let r = 0.08 + 0.42 * t + 0.06 * Math.sin(t * 9);
    if (t > 0.82) r += 0.12;
    if (t > 0.9) r = 0.52 + (t - 0.9) * 0.4;
    if (y < 0.22) r *= 0.78;
    r += fbm(t * 4, 1.2) * 0.03;
    pts.push(new THREE.Vector2(Math.max(0.04, r), y));
  }
  const g = new THREE.LatheGeometry(pts, 36);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm(x * 4.2, y * 3.1, z * 4.2) * 0.035;
    const joint = Math.abs(Math.sin(Math.atan2(z, x) * 6.5)) < 0.12 ? -0.03 : 0;
    pos.setXYZ(i, x + n + joint * Math.sign(x || 1), y + n * 0.2, z + n);
  }
  g.computeVertexNormals();
  return g;
}

function stumpHeadland(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = 0.38 * (1 - t);
    let r = 0.12 + 0.4 * t + 0.04 * Math.sin(t * 7);
    if (t > 0.75) r = 0.48 + (t - 0.75) * 0.35;
    pts.push(new THREE.Vector2(r, y));
  }
  const g = new THREE.LatheGeometry(pts, 28);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = fbm(pos.getX(i) * 5, pos.getY(i) * 4, pos.getZ(i) * 5) * 0.04;
    pos.setXYZ(i, pos.getX(i) + n, pos.getY(i) + Math.abs(n) * 0.15, pos.getZ(i) + n);
  }
  g.computeVertexNormals();
  return g;
}

function paintFlintBands(g: THREE.BufferGeometry) {
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const flint = Math.abs(Math.sin(y * 16.5 + pos.getX(i) * 0.4)) < 0.14;
    c.set(flint ? "#3a342c" : "#d8d0c0");
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

export function spitGeometry(grow: number, segs = 36, across = 8): THREE.BufferGeometry {
  const len = 0.45 + grow * 2.55;
  const positions: number[] = [];
  const indices: number[] = [];
  const col = across + 1;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const z = u * len;
    const hook = u > 0.52 ? (u - 0.52) * (u - 0.52) * 3.4 : 0;
    const w = THREE.MathUtils.lerp(0.62, 0.1, u * u);
    const h = THREE.MathUtils.lerp(0.13, 0.035, u);
    for (let j = 0; j <= across; j++) {
      const v = j / across;
      const x = hook + (v - 0.5) * w + Math.sin(u * 9) * 0.02 * u;
      const y = h * Math.sin(v * Math.PI) * (0.55 + 0.45 * (1 - u)) + fbm(x * 4, z * 3) * 0.012;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * col + j;
      indices.push(a, a + col, a + 1, a + 1, a + col, a + col + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function bermGeometry(on: boolean): THREE.BufferGeometry {
  const h = on ? 0.16 : 0.045;
  const g = new THREE.PlaneGeometry(8.6, 0.7, 28, 8);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ridge = Math.exp(-(z * z) / 0.08) * h;
    pos.setY(i, ridge + Math.sin(x * 2.2) * 0.015);
  }
  g.computeVertexNormals();
  return g;
}

export function groynePostGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.045, 0.38),
    new THREE.Vector2(0.038, 0.22),
    new THREE.Vector2(0.042, 0.08),
    new THREE.Vector2(0.05, 0),
  ];
  return jointDisplace(new THREE.LatheGeometry(pts, 8), 0.004);
}

export function seaVolumeGeometry(
  width: number,
  depth: number,
  thick: number,
  segW: number,
  segD: number,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(width, thick, depth, segW, 1, segD);
  g.userData.orig = Float32Array.from(g.attributes.position.array as Float32Array);
  return g;
}

export function iceTongueGeometry(
  length: number,
  width: number,
  thick: number,
  segsL = 48,
  segsW = 18,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(width, thick, length, segsW, 8, segsL);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = (z + length / 2) / Math.max(0.001, length);
    const taper = 0.22 + 0.78 * u;
    const nx = x * taper;
    const crest = Math.cos((nx / Math.max(0.08, width * taper)) * Math.PI * 0.5);
    let ny = y > 0 ? y * (0.5 + 0.5 * crest) : y;
    let crevasse = 0;
    if (y > 0) {
      crevasse = Math.max(0, Math.sin(z * 16 + x * 2.4) * 0.14 * (y / thick) * (0.35 + u));
      ny -= crevasse;
      ny += Math.sin(x * 18) * 0.014 * u;
      const ogive = Math.sin(z * 7) * 0.01 * u;
      ny += ogive;
    }
    pos.setXYZ(i, nx, ny, z + Math.sin(u * Math.PI) * 0.1);
    const dirty = Math.abs(nx) < width * 0.08 * taper;
    if (crevasse > 0.04) c.set("#6aa8c4");
    else if (dirty) c.set("#b8c4c0");
    else if (y < 0) c.set("#8ec4d8");
    else c.set("#e8f4fa");
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export function channelGeometry(
  pts: THREE.Vector3[],
  halfW: number,
  depth: number,
): THREE.BufferGeometry {
  const across = 10;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const prev = pts[Math.max(0, i - 1)]!;
    const next = pts[Math.min(pts.length - 1, i + 1)]!;
    const tan = next.clone().sub(prev).setY(0);
    if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
    tan.normalize();
    const right = new THREE.Vector3(-tan.z, 0, tan.x);
    for (let j = 0; j <= across; j++) {
      const t = j / across;
      const acrossN = (t - 0.5) * 2;
      const bed = -depth * (1 - acrossN * acrossN);
      const q = p.clone().add(right.clone().multiplyScalar(acrossN * halfW));
      q.y += bed;
      positions.push(q.x, q.y, q.z);
    }
  }
  const col = across + 1;
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * col + j;
      indices.push(a, a + col, a + 1, a + 1, a + col, a + col + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function pointBarGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.85, 0.45, 12, 8);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, 0.04 * Math.exp(-(x * x) / 0.18) * Math.exp(-(z * z) / 0.08) + fbm(x, z) * 0.01);
  }
  g.computeVertexNormals();
  return g;
}

export function cutBankGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.55, 0.38, 8, 6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + fbm(pos.getX(i) * 4, pos.getY(i) * 4) * 0.03);
  }
  g.computeVertexNormals();
  return g;
}

export function oxbowGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 1.45;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.42));
  }
  return channelGeometry(pts, 0.07, 0.04);
}

export function fallSheetGeometry(_w = 0.28, _h = 0.55): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(_w, _h, 8, 16);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 18) * 0.012);
  }
  g.computeVertexNormals();
  return g;
}

export function deltaFanGeometry(): THREE.BufferGeometry {
  const nr = 16;
  const na = 22;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= nr; i++) {
    const u = i / nr;
    for (let j = 0; j <= na; j++) {
      const a = -0.7 + (j / na) * 1.4;
      const r = u * 1.85;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 0.06 * (1 - u) + fbm(x, z) * 0.02;
      positions.push(x, y, z);
    }
  }
  const col = na + 1;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < na; j++) {
      const a = i * col + j;
      indices.push(a, a + col, a + 1, a + 1, a + col, a + col + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function hornGeometry(_h = 0.62, _r = 0.32): THREE.BufferGeometry {
  const h = _h;
  const r = _r;
  const nr = 10;
  const nf = 3;
  const positions: number[] = [];
  const indices: number[] = [];
  positions.push(0, h, 0);
  for (let i = 1; i <= nr; i++) {
    const u = i / nr;
    for (let f = 0; f < nf; f++) {
      const a0 = (f / nf) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((f + 1) / nf) * Math.PI * 2 - Math.PI / 2;
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const a = a0 + (a1 - a0) * t;
        const dent = Math.sin(t * Math.PI) * 0.22 * u;
        const rad = r * u * (1 - dent);
        positions.push(Math.cos(a) * rad, h * (1 - u) + fbm(a, u) * 0.02, Math.sin(a) * rad);
      }
    }
  }
  const ring = nf * 7;
  for (let f = 0; f < ring; f++) {
    indices.push(0, 1 + f, 1 + ((f + 1) % ring));
  }
  for (let i = 0; i < nr - 1; i++) {
    for (let f = 0; f < ring; f++) {
      const a = 1 + i * ring + f;
      const b = 1 + i * ring + ((f + 1) % ring);
      const c = 1 + (i + 1) * ring + f;
      const d = 1 + (i + 1) * ring + ((f + 1) % ring);
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function areteGeometry(len = 1.4): THREE.BufferGeometry {
  const segs = 18;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const z = (u - 0.5) * len;
    const h = 0.42 * Math.sin(u * Math.PI) + 0.08;
    const w = 0.045 + 0.02 * Math.sin(u * 9);
    positions.push(-w, 0, z, 0, h, z, w, 0, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function cirqueBowlGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const nr = 10;
  const na = 16;
  for (let i = 0; i <= nr; i++) {
    const u = i / nr;
    for (let j = 0; j <= na; j++) {
      const v = j / na;
      const a = Math.PI * 0.15 + v * Math.PI * 0.7;
      const r = 0.12 + u * 0.55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.85;
      const y = (1 - u) * 0.22 + u * u * 0.05;
      positions.push(x, y, z);
    }
  }
  const col = na + 1;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < na; j++) {
      const a = i * col + j;
      indices.push(a, a + 1, a + col, a + 1, a + col + 1, a + col);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function faultWedgeGeometry(side: "hanging" | "foot", dip = 0.62): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  if (side === "hanging") {
    sh.moveTo(-0.82, -0.68);
    sh.lineTo(0.05, -0.68);
    sh.lineTo(0.05 + 1.36 * dip, 0.68);
    sh.lineTo(-0.82, 0.68);
    sh.closePath();
  } else {
    sh.moveTo(0.05, -0.68);
    sh.lineTo(0.86, -0.68);
    sh.lineTo(0.86, 0.68);
    sh.lineTo(0.05 + 1.36 * dip, 0.68);
    sh.closePath();
  }
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 2.05,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 1,
    steps: 1,
  });
  g.translate(0, 0, -1.02);
  g.computeVertexNormals();
  return jointDisplace(g, 0.012);
}

export function faultPlaneGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(2.15, 1.45, 18, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 22) * 0.012 + fbm(x * 3, y * 3) * 0.016);
  }
  g.computeVertexNormals();
  return g;
}

export function plumeGeometry(h: number, r: number): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(r * 0.18, 0),
    new THREE.Vector2(r * 0.28, h * 0.18),
    new THREE.Vector2(r * 0.55, h * 0.45),
    new THREE.Vector2(r * 0.85, h * 0.72),
    new THREE.Vector2(r * 1.05, h * 0.92),
    new THREE.Vector2(r * 0.7, h),
  ];
  const g = new THREE.LatheGeometry(pts, 20);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm(x * 3, y * 2, z * 3) * 0.08 * (y / Math.max(0.1, h));
    pos.setXYZ(i, x + n, y, z + n);
  }
  g.computeVertexNormals();
  return g;
}

export function conduitGeometry(h: number, r: number): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(r * 0.35, 0.02),
    new THREE.Vector2(r * 0.85, h * 0.12),
    new THREE.Vector2(r * 0.55, h * 0.28),
    new THREE.Vector2(r * 0.42, h * 0.55),
    new THREE.Vector2(r * 0.38, h * 0.88),
    new THREE.Vector2(r * 0.22, h * 0.98),
  ];
  const g = new THREE.LatheGeometry(pts, 24);
  return jointDisplace(g, 0.008);
}

export function fissureGeometry(): THREE.BufferGeometry {
  const segs = 28;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = (u - 0.5) * 5.6;
    const z = Math.sin(u * 9) * 0.18 + Math.sin(u * 4) * 0.12;
    const w = 0.12 + Math.abs(Math.sin(u * 6)) * 0.08;
    const y = 0.04 + Math.abs(Math.sin(u * 5)) * 0.03;
    positions.push(x, y, z - w, x, y * 0.4, z, x, y, z + w);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function barchanGeometry(scale = 1): THREE.BufferGeometry {
  const nu = 28;
  const nv = 16;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const x = (u - 0.5) * 2.2 * scale;
      const horn = Math.pow(Math.abs(x) / (1.1 * scale), 2);
      const z = (v - 0.15) * (1.6 + horn * 0.9) * scale;
      const windward = v < 0.55 ? v / 0.55 : 1 - (v - 0.55) / 0.45;
      const crest = Math.cos((x / (1.1 * scale)) * Math.PI * 0.5);
      const y = Math.max(0, 0.38 * scale * windward * crest * (1 - horn * 0.35));
      const lee = v > 0.55 ? Math.max(0, y * (1.15 - (v - 0.55) * 2.2)) : y;
      positions.push(x, lee, z);
    }
  }
  const col = nv + 1;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * col + j;
      indices.push(a, a + col, a + 1, a + 1, a + col, a + col + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function horizonBandGeometry(
  y0: number,
  y1: number,
  width = 2.55,
  depth = 1.22,
  seed = 0,
): THREE.BufferGeometry {
  const nx = 28;
  const nz = 14;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= nx; i++) {
    const u = i / nx;
    const x = (u - 0.5) * width;
    const wave0 =
      Math.sin(x * 3.1 + seed) * 0.055 +
      Math.sin(x * 7.4 + seed * 2) * 0.02 +
      fbm(x * 2, seed) * 0.03;
    const wave1 = Math.sin(x * 2.6 + seed * 1.3) * 0.048 + fbm(x * 3.2, seed + 2) * 0.025;
    for (let j = 0; j <= nz; j++) {
      const v = j / nz;
      const z = (v - 0.08) * depth;
      const yBot = y0 + wave0 * (1 - v * 0.45);
      const yTop = y1 + wave1 * (1 - v * 0.45);
      const y = yBot + (yTop - yBot) * Math.pow(v, 0.85);
      const face = v < 0.22 ? fbm(x * 5.2, y * 6.1) * 0.045 : fbm(x * 2, z * 2) * 0.012;
      positions.push(x, y, z + (v < 0.22 ? face : 0));
      const mott = 0.92 + fbm(x * 8, y * 8) * 0.08;
      c.setRGB(mott, mott, mott);
      colors.push(c.r, c.g, c.b);
    }
  }
  const col = nz + 1;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = i * col + j;
      indices.push(a, a + 1, a + col, a + 1, a + col + 1, a + col);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function dolineGeometry(r = 0.7, depth = 0.55): THREE.BufferGeometry {
  const nr = 14;
  const na = 28;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= nr; i++) {
    const u = i / nr;
    for (let j = 0; j <= na; j++) {
      const a = (j / na) * Math.PI * 2;
      const rad = u * r;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      const y = -depth * (1 - u * u) + fbm(x * 3, z * 3) * 0.03 * u;
      positions.push(x, y, z);
    }
  }
  const col = na + 1;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < na; j++) {
      const a = i * col + j;
      indices.push(a, a + col, a + 1, a + 1, a + col, a + col + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function dripstoneGeometry(h: number, r: number, hang = true): THREE.BufferGeometry {
  const pts = hang
    ? [
        new THREE.Vector2(r * 0.08, 0),
        new THREE.Vector2(r * 0.55, h * 0.12),
        new THREE.Vector2(r * 0.38, h * 0.45),
        new THREE.Vector2(r * 0.22, h * 0.78),
        new THREE.Vector2(r * 0.06, h),
      ]
    : [
        new THREE.Vector2(r * 0.08, h),
        new THREE.Vector2(r * 0.5, h * 0.72),
        new THREE.Vector2(r * 0.7, h * 0.28),
        new THREE.Vector2(r * 0.85, 0),
      ];
  const g = new THREE.LatheGeometry(pts, 14);
  return jointDisplace(g, 0.008);
}

export function foldBedGeometry(
  amp: number,
  thick: number,
  y: number,
  phase = 0,
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(4.4, 1.55, 40, 8);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, y + Math.sin(x * 1.15 + phase) * amp + thick * 0.5 + fbm(x, z) * 0.02);
  }
  g.computeVertexNormals();
  return g;
}

/** Irregular volcano edifice. Not a lathe cone. Shield is wide and low; strato is gullied; rift is a plateau. */
export function volcanoEdificeGeometry(visc: number, segs = 72): THREE.BufferGeometry {
  const t = THREE.MathUtils.clamp(visc, 0, 1);
  const rift = t < 0.2;
  const shield = t < 0.5;
  const rMax = rift
    ? 4.5
    : shield
      ? THREE.MathUtils.lerp(4.2, 2.9, (t - 0.2) / 0.3)
      : THREE.MathUtils.lerp(2.35, 1.12, (t - 0.5) / 0.5);
  const hMax = rift
    ? 0.2
    : shield
      ? THREE.MathUtils.lerp(0.36, 0.68, (t - 0.2) / 0.3)
      : THREE.MathUtils.lerp(1.2, 2.72, (t - 0.5) / 0.5);
  const nr = segs;
  const na = Math.max(56, segs);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const col = new THREE.Color();
  for (let i = 0; i <= nr; i++) {
    const u = i / nr;
    for (let j = 0; j <= na; j++) {
      const a = (j / na) * Math.PI * 2;
      const wobble = 1 + 0.09 * Math.sin(a * 3.1 + t) + 0.04 * Math.sin(a * 8.4);
      const r = u * rMax * wobble;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let h: number;
      if (rift) {
        h = 0.12 + 0.07 * (1 - u) + fbm(x * 0.6, z * 0.6) * 0.05;
        const fiss = Math.exp(-(z * z) / 0.055) * 0.14 * (1 - Math.abs(x) / (rMax * 1.1));
        h -= fiss;
      } else if (shield) {
        const rr = Math.min(1, u);
        h = hMax * (1 - Math.pow(rr, 0.4));
        if (u < 0.1) h = hMax * 0.9 - (0.1 - u) * 0.45;
        h -= Math.pow(Math.max(0, Math.sin(a * 5.2 + u * 3)), 10) * 0.07 * u;
        h += Math.exp(-((x - 1.7) ** 2 + (z - 0.45) ** 2) / 0.2) * 0.24;
        h += Math.exp(-((x + 1.25) ** 2 + (z + 1.4) ** 2) / 0.14) * 0.18;
        h += fbm(x * 0.8, z * 0.8) * 0.035;
      } else {
        const rr = Math.min(1, u);
        h = hMax * Math.pow(1 - rr, 0.52);
        if (u < 0.09) h = hMax * 0.86 - (0.09 - u) * 1.35;
        h -= Math.abs(Math.sin(a * 7 + u * 2)) * 0.07 * u * hMax * 0.12;
        h += fbm(x * 1.1, z * 1.1) * 0.04;
      }
      h = Math.max(0.004, h);
      positions.push(x, h, z);
      if (rift) col.set(h < 0.07 ? "#ff6a3d" : "#3d3a38");
      else if (shield) col.set(u < 0.09 ? "#2a1810" : h < 0.08 ? "#ff6a3d" : "#3d3a38");
      else col.set(h > hMax * 0.7 ? "#F4EFE6" : u < 0.1 ? "#2a1810" : "#6a5e52");
      colors.push(col.r, col.g, col.b);
    }
  }
  const colN = na + 1;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < na; j++) {
      const a = i * colN + j;
      indices.push(a, a + colN, a + 1, a + 1, a + colN, a + colN + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

const BEDS = ["#c4a574", "#6a6258", "#d8d0c0", "#8a6a48", "#5c564c", "#b8a090"] as const;

/** Sedimentary wedge with bedding stripes. Offset across the fault reads as slip, not two brown blocks. */
export function beddedWedgeGeometry(
  side: "hanging" | "foot",
  dip = 0.62,
  slip = 0,
): THREE.BufferGeometry {
  const g = faultWedgeGeometry(side, dip);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const shift = side === "hanging" ? slip * 0.55 : 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + shift;
    const band = Math.floor((y + 0.85) * 5.2) % BEDS.length;
    c.set(BEDS[(band + BEDS.length) % BEDS.length]!);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}
