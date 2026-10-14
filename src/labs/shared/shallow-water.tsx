import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";

/**
 * A water surface over a height field: it is drawn only where it lies above the ground, so its
 * shoreline follows the terrain exactly, and it darkens from the shallows into deeper water.
 * `tint` (0–1) mixes in suspended sediment, for river plumes and muddy floodwater.
 */
export function ShallowWater({
  land,
  level,
  width = 6,
  depth = 4,
  resolution = 200,
  deep = 0.1,
  shallowColour = "#6f9c8f",
  deepColour = "#1f566b",
  sediment = "#9a8358",
  tint,
  flow = [1, 0],
  opacity = 0.9,
}: {
  land: (x: number, z: number) => number;
  level: (x: number, z: number) => number;
  width?: number;
  depth?: number;
  resolution?: number;
  /** Water depth at which the deep colour is reached. */
  deep?: number;
  shallowColour?: string;
  deepColour?: string;
  sediment?: string;
  tint?: (x: number, z: number) => number;
  flow?: [number, number];
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth, resolution, resolution);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position,
      d = new Float32Array(p.count),
      s = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = level(x, z);
      p.setY(i, y);
      d[i] = y - land(x, z);
      s[i] = tint ? tint(x, z) : 0;
    }
    g.setAttribute("waterDepth", new THREE.BufferAttribute(d, 1));
    g.setAttribute("waterTint", new THREE.BufferAttribute(s, 1));
    g.computeVertexNormals();
    return g;
  }, [land, level, width, depth, resolution, tint]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uClock: { value: 0 },
      uFlow: { value: new THREE.Vector2(...flow) },
      uShallow: { value: new THREE.Color(shallowColour) },
      uDeep: { value: new THREE.Color(deepColour) },
      uSediment: { value: new THREE.Color(sediment) },
      uDeepAt: { value: deep },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  uniforms.uFlow.value.set(...flow);
  uniforms.uShallow.value.set(shallowColour);
  uniforms.uDeep.value.set(deepColour);
  uniforms.uSediment.value.set(sediment);
  uniforms.uDeepAt.value = deep;
  useFrame(() => {
    uniforms.uClock.value = useLabControls.getState().t * 30;
  });
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "attribute float waterDepth; attribute float waterTint; varying float vDepth; varying float vTint; varying vec2 vPlan;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvDepth=waterDepth;vTint=waterTint;vPlan=position.xz;",
        );
      s.fragmentShader =
        `varying float vDepth; varying float vTint; varying vec2 vPlan;
uniform float uClock,uDeepAt; uniform vec2 uFlow; uniform vec3 uShallow,uDeep,uSediment;\n` +
        s.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
if(vDepth<=0.)discard;
float wd=smoothstep(0.,uDeepAt,vDepth);
vec3 water=mix(uShallow,uDeep,wd);
water=mix(water,uSediment,clamp(vTint,0.,1.)*(.85-.35*wd));
float foam=(1.-smoothstep(0.,uDeepAt*.06,vDepth))*.5;
diffuseColor.rgb=mix(water,vec3(.86,.9,.88),foam);
diffuseColor.a*=smoothstep(0.,uDeepAt*.04,vDepth)*mix(.55,1.,wd);`,
          )
          .replace(
            "#include <normal_fragment_maps>",
            `#include <normal_fragment_maps>
vec2 wq=vPlan*26.-uFlow*uClock*.4;
float ra=cos(wq.x*1.3+sin(wq.y*.9))*.025, rb=sin(wq.y*1.7+wq.x*.4)*.018;
normal=normalize(normal+normalize(dFdx(vViewPosition))*ra+normalize(dFdy(vViewPosition))*rb);`,
          );
    },
    [uniforms],
  );
  return (
    <>
      <WaterSides land={land} level={level} width={width} depth={depth} colour={deepColour} />
      <mesh geometry={geometry} receiveShadow renderOrder={2}>
        <meshPhysicalMaterial
          color="white"
          roughness={0.12}
          metalness={0}
          specularIntensity={0.5}
          transparent
          opacity={opacity}
          depthWrite={false}
          onBeforeCompile={compile}
          customProgramCacheKey={() => "shallow-water-v1"}
        />
      </mesh>
    </>
  );
}

/** Vertical water faces where a block's edges cut through standing water. */
export function WaterSides({
  land,
  level,
  width = 6,
  depth = 4,
  colour = "#1f566b",
  opacity = 0.62,
}: {
  land: (x: number, z: number) => number;
  level: (x: number, z: number) => number;
  width?: number;
  depth?: number;
  colour?: string;
  opacity?: number;
}) {
  const sides = useMemo(() => {
    const p: number[] = [],
      idx: number[] = [],
      n = 160,
      w = width / 2,
      d = depth / 2;
    const edges: [number, number, number, number][] = [
      [-w, d, w, d],
      [w, d, w, -d],
      [w, -d, -w, -d],
      [-w, -d, -w, d],
    ];
    for (const [x0, z0, x1, z1] of edges) {
      const start = p.length / 3;
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n,
          z = z0 + ((z1 - z0) * i) / n,
          top = level(x, z),
          bottom = Math.min(top, land(x, z));
        p.push(x, top, z, x, bottom, z);
        if (i < n) {
          const a = start + i * 2;
          idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [land, level, width, depth]);
  useEffect(() => () => sides.dispose(), [sides]);
  return (
    <mesh geometry={sides} renderOrder={1}>
      <meshStandardMaterial
        color={colour}
        roughness={0.2}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
