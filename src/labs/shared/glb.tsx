import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { Tag, Readout } from "./kit";
import { useQuality } from "./perf";
import { useLabTick } from "@/labs/tick";

type RigCtx = {
  t: number;
  trueScale: boolean;
  explode: number;
  slice: number;
  playing: boolean;
  params: Record<string, number>;
  lod: boolean;
};

function num(v: unknown, d = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
}

type Rest = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  visible: boolean;
};
const rests = new WeakMap<THREE.Object3D, Rest>();
const up = new THREE.Vector3(0, 1, 0);

function applyRig(obj: THREE.Object3D, ctx: RigCtx, clipPlane: THREE.Plane) {
  const rest = rests.get(obj);
  if (rest) {
    obj.position.copy(rest.position);
    obj.quaternion.copy(rest.quaternion);
    obj.scale.copy(rest.scale);
    obj.visible = rest.visible;
  }
  const d = obj.userData as Record<string, unknown>;
  const rig = typeof d.tl_rig === "string" ? d.tl_rig : "";
  const name = obj.name || "";

  if (name === "Exag" || rig === "exag") {
    const f = num(d.tl_exag, 6) || 6;
    if (name === "Exag") {
      obj.scale.y *= ctx.trueScale ? 1 / f : 1;
    } else {
      obj.scale.y *= ctx.trueScale ? 1 / f : 1;
    }
  }
  if (rig === "true_fill") {
    const teach = num(d.tl_inner, 0.978);
    const real = num(d.tl_true, 0.9945);
    obj.scale.multiplyScalar(ctx.trueScale ? real / teach : 1);
  }
  if (rig === "shell_true") {
    obj.scale.multiplyScalar(ctx.trueScale ? num(d.tl_true, 0.97) : 1);
  }
  if (rig === "exag_crust") {
    // Crust outer radius stays 1. T thickens the mantle up into the teaching shell (true_fill).
  }
  if (rig === "spin")
    obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, ctx.t * Math.PI * 2));
  if (rig === "spin_slow")
    obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, ctx.t * Math.PI * 0.4));
  if (rig === "explode") obj.position.x -= ctx.explode * (0.35 + num(d.tl_exag, 0.2));
  if (rig.startsWith("visc_band:")) {
    const [, a, b] = rig.split(":");
    const v = ctx.params.visc ?? 0.25;
    obj.visible = v >= Number(a) && (v < Number(b) || (Number(b) === 1 && v === 1));
  }
  if (rig.startsWith("site_band:")) {
    const [, a, b] = rig.split(":");
    const v = ctx.params.site ?? 0;
    obj.visible = v >= Number(a) && v < Number(b);
  }
  if (rig.startsWith("stage_band:")) {
    const [, a, b] = rig.split(":");
    const v = ctx.params.stage ?? ctx.t * 5;
    obj.visible = v >= Number(a) && v < Number(b);
  }
  if (rig.startsWith("zoom_band:")) {
    const [, a, b] = rig.split(":");
    const v = ctx.params.zoom ?? 0;
    obj.visible = v >= Number(a) && v < Number(b);
  }
  if (rig.startsWith("show_stage:")) {
    const st = Number(rig.split(":")[1]);
    const cur = Math.round(ctx.params.stage ?? 1);
    obj.scale.multiplyScalar(cur === st ? 1.08 : 1);
  }
  if (rig.startsWith("scale_t:")) {
    const axis = rig.split(":")[1] ?? "y";
    const s = 0.35 + ctx.t * 0.85;
    if (axis === "x") obj.scale.x *= s;
    else if (axis === "z") obj.scale.y *= s;
    else obj.scale.z *= s;
  }
  if (rig.startsWith("loc_t:")) {
    const [, axis, amp] = rig.split(":");
    const a = Number(amp) || 1;
    const o = (ctx.t - 0.5) * a;
    if (axis === "x") obj.position.x += o;
    else if (axis === "y") obj.position.z -= o;
    else obj.position.y += o;
  }
  if (rig.startsWith("param_z:")) {
    const [, key, lo, hi] = rig.split(":");
    const v = ctx.params[key ?? ""] ?? ctx.t;
    const z = THREE.MathUtils.lerp(Number(lo), Number(hi), v);
    obj.position.y = z;
  }
  if (rig === "slip_hang") {
    obj.position.x -= ctx.t * 0.35;
    obj.position.y -= ctx.t * 0.18;
  }
  if (rig === "discharge") {
    const q = ctx.params.discharge ?? 0.7;
    obj.scale.set(1 + q * 0.4, 1, 0.7 + q * 0.6);
  }
  if (rig === "texture_marker") {
    const sand = ctx.params.sand ?? 40,
      clay = ctx.params.clay ?? 20;
    const silt = Math.max(0, 100 - sand - clay);
    obj.position.x = (0.95 * (silt - sand)) / 100;
    obj.position.z = 0.55 - (1.6 * clay) / 100;
  }
  if (rig === "profile_hide_e") {
    const profile = Math.round(ctx.params.profile ?? ctx.params.soil ?? 0);
    obj.visible = profile === 0;
  }
  if (rig.startsWith("show_if_param_gt:")) {
    const [, key, val] = rig.split(":");
    obj.visible = (ctx.params[key ?? ""] ?? ctx.t) > Number(val);
  }
  if (rig === "sun_path") {
    const lat = ((ctx.params.latitude ?? 51.5) * Math.PI) / 180;
    const day = ctx.params.day ?? ctx.t;
    const dec = 0.409 * Math.sin((day - 0.22) * Math.PI * 2);
    const alt = Math.PI / 2 - Math.abs(lat - dec);
    obj.position.set(
      Math.cos(alt) * 1.6,
      -Math.sin(ctx.t * Math.PI) * 0.4,
      Math.sin(Math.max(0.05, alt)) * 1.6,
    );
  }

  const isLod = name.endsWith("_LOD1");
  if (isLod) {
    obj.visible = ctx.lod && obj.visible;
  } else {
    const lodSibling = obj.parent?.children.find((c) => c.name === `${name}_LOD1`);
    if (lodSibling && ctx.lod) obj.visible = false;
  }

  const mesh = obj as THREE.Mesh;
  if (mesh.isMesh && mesh.material) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    clipPlane.constant = 0.15 + ctx.slice * 1.4;
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial;
      if (!m) continue;
      if (ctx.slice > 0.04) {
        m.clippingPlanes = [clipPlane];
        m.clipShadows = true;
      } else if (m.clippingPlanes?.length) {
        m.clippingPlanes = [];
      }
    }
  }

  for (const c of obj.children) applyRig(c, ctx, clipPlane);
}

function friendly(name: string) {
  return name.replace(/_LOD1$/, "").replace(/_/g, " ");
}

export function GlbRig({ slug, tick = 1 / 16 }: { slug: string; tick?: number }) {
  useLabTick(tick);
  const url = `/models/${slug}.glb`;
  const gltf = useGLTF(url);
  const q = useQuality();
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.15), []);
  const root = useMemo(() => {
    const c = gltf.scene.clone(true);
    c.traverse((o) => {
      const d = o.userData as Record<string, unknown>;
      const extras = d.extras;
      if (extras && typeof extras === "object") Object.assign(d, extras);
      rests.set(o, {
        position: o.position.clone(),
        quaternion: o.quaternion.clone(),
        scale: o.scale.clone(),
        visible: o.visible,
      });
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = q.shadows;
        m.receiveShadow = true;
        m.material = Array.isArray(m.material)
          ? m.material.map((mat) => mat.clone())
          : m.material.clone();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          if (mat) {
            mat.side = THREE.DoubleSide;
            (mat as THREE.MeshPhysicalMaterial).clippingPlanes = [];
          }
        }
      }
    });
    return c;
  }, [gltf.scene, q.shadows]);
  useEffect(
    () => () =>
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = (o as THREE.Mesh).material;
          (Array.isArray(m) ? m : [m]).forEach((mat) => mat.dispose());
        }
      }),
    [root],
  );

  const t = useLabControls((s) => s.t);
  const trueScale = useLabControls((s) => s.trueScale);
  const explode = useLabControls((s) => s.explode);
  const slice = useLabControls((s) => s.slice);
  const playing = useLabControls((s) => s.playing);
  const params = useLabControls((s) => s.params);
  const setInspect = useLabControls((s) => s.setInspect);
  const labels = useLabControls((s) => s.labels);

  const ctxRef = useRef<RigCtx>({ t, trueScale, explode, slice, playing, params, lod: !q.shadows });
  ctxRef.current = { t, trueScale, explode, slice, playing, params, lod: !q.shadows };

  useFrame(({ camera }) => {
    const dist = camera.position.length();
    ctxRef.current.lod = !q.shadows || dist > 11;
    applyRig(root, ctxRef.current, clipPlane);
  });
  useEffect(() => {
    applyRig(root, ctxRef.current, clipPlane);
  }, [root, t, trueScale, explode, slice, params]);

  const parts = useMemo(() => {
    const out: { name: string; note: string; object: THREE.Mesh; pos: [number, number, number] }[] =
      [];
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.name.endsWith("_LOD1")) return;
      if (m.name.startsWith("cut") || m.name.includes("_cut") || m.name.includes("notch")) return;
      if (m.name.endsWith("_crv")) return;
      const note = String(
        (m.userData as { tl_note?: string }).tl_note ??
          (m.parent as THREE.Object3D | null)?.userData?.tl_note ??
          "",
      );
      if (!m.name || m.name.startsWith("Cube") || m.name.startsWith("Sphere")) return;
      box.setFromObject(m);
      box.getCenter(v);
      v.y += Math.max(0.12, (box.max.y - box.min.y) * 0.55);
      if (note) out.push({ name: m.name, note, object: m, pos: [v.x, v.y, v.z] });
    });
    return out.slice(0, 14);
  }, [root]);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        const o = e.object;
        const note =
          String((o.userData as { tl_note?: string }).tl_note || "") ||
          String((o.parent?.userData as { tl_note?: string } | undefined)?.tl_note || "") ||
          `${friendly(o.name)} is a named part.`;
        setInspect({ name: friendly(o.name), note });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={root} dispose={null} />
      {labels &&
        parts.map((p) => (
          <TrackedLabel key={p.name} object={p.object} name={friendly(p.name)} note={p.note} />
        ))}
      <Readout pos={[0, 2.4, 0]}>{"click the part · T true scale · Space play"}</Readout>
    </group>
  );
}

function TrackedLabel({ object, name, note }: { object: THREE.Mesh; name: string; note: string }) {
  const anchor = useRef<THREE.Group>(null),
    element = useRef<HTMLButtonElement>(null);
  const setInspect = useLabControls((s) => s.setInspect),
    projector = useLabControls((s) => s.layout === "projector");
  const box = useMemo(() => new THREE.Box3(), []),
    point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!anchor.current || !element.current) return;
    let visible = true;
    for (let p: THREE.Object3D | null = object; p; p = p.parent) visible = visible && p.visible;
    element.current.style.display = visible ? "" : "none";
    if (!visible) return;
    box.setFromObject(object);
    box.getCenter(point);
    point.y = box.max.y + 0.12;
    anchor.current.position.copy(anchor.current.parent!.worldToLocal(point));
  });
  return (
    <group ref={anchor}>
      <Html center zIndexRange={[10, 0]}>
        <button
          ref={element}
          className={`min-h-9 max-w-52 rounded-xl border border-white/20 bg-basalt/90 px-3 py-1 font-mono text-chalk ${projector ? "text-sm" : "text-[11px]"}`}
          onClick={() => setInspect({ name, note })}
        >
          {name}
        </button>
      </Html>
    </group>
  );
}

export function preloadGlb(slug: string) {
  useGLTF.preload(`/models/${slug}.glb`);
}
