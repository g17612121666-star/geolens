import { useMemo } from "react";
import * as THREE from "three";

/** Emissive stellar surface, with illustrative granulation and limb darkening.
 * Procedural material, not an observation or a resolved map of any star. */
export function StarMesh({
  radius = 0.28,
  colour = "#fff0d7",
  glow = true,
}: {
  radius?: number;
  colour?: string;
  glow?: boolean;
}) {
  const uniforms = useMemo(() => ({ surfaceColour: { value: new THREE.Color(colour) } }), [colour]);
  return (
    <group>
      {glow && <Corona radius={radius} colour={colour} />}
      <mesh>
        <sphereGeometry args={[radius, 96, 64]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={`varying vec3 n; varying vec3 p; varying vec3 local;
   void main(){local=position; p=(modelMatrix*vec4(position,1.)).xyz; n=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
          fragmentShader={`uniform vec3 surfaceColour; varying vec3 n; varying vec3 p; varying vec3 local;
   void main(){vec3 v=normalize(cameraPosition-p); float mu=max(0.,dot(normalize(n),v));
    vec3 q=normalize(local); float granules=sin(q.x*193.+sin(q.y*91.))*sin(q.y*217.+sin(q.z*127.))*sin(q.z*171.);
    float limb=.42+.58*mu; gl_FragColor=vec4(surfaceColour*limb*(1.+.065*granules),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`}
        />
      </mesh>
    </group>
  );
}

let coronaTexture: THREE.CanvasTexture | null = null;
function coronaMap() {
  if (coronaTexture || typeof document === "undefined") return coronaTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,236,190,0.85)");
  g.addColorStop(0.42, "rgba(255,196,120,0.42)");
  g.addColorStop(0.7, "rgba(255,160,80,0.07)");
  g.addColorStop(1, "rgba(255,150,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  coronaTexture = new THREE.CanvasTexture(c);
  coronaTexture.colorSpace = THREE.SRGBColorSpace;
  return coronaTexture;
}

/** Soft additive halo so the Sun reads as a light source; purely illustrative. */
function Corona({ radius, colour }: { radius: number; colour: string }) {
  const map = useMemo(() => coronaMap(), []);
  if (!map) return null;
  return (
    <sprite scale={[radius * 7, radius * 7, 1]} raycast={() => null}>
      <spriteMaterial
        map={map}
        color={colour}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}
