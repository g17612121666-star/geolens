import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Emissive stellar surface, with illustrative granulation and limb darkening.
 * Procedural material, not an observation or a resolved map of any star. */
export function StarMesh({
  radius = 0.28,
  color = "#fff0d7",
  glow = true,
}: {
  radius?: number;
  color?: string;
  glow?: boolean;
}) {
  const uniforms = useMemo(
    () => ({ surfaceColour: { value: new THREE.Color(color) }, time: { value: 0 } }),
    [color],
  );
  useFrame(({ clock }) => {
    uniforms.time.value = clock.elapsedTime;
  });
  return (
    <group>
      {glow && <Corona radius={radius} color={color} />}
      <mesh>
        <sphereGeometry args={[radius, 96, 64]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={`varying vec3 n; varying vec3 p; varying vec3 local;
   void main(){local=position; p=(modelMatrix*vec4(position,1.)).xyz; n=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
          fragmentShader={`uniform vec3 surfaceColour; uniform float time; varying vec3 n; varying vec3 p; varying vec3 local;
   float h(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}
   float vn(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
     return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
       mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){vec3 v=normalize(cameraPosition-p); float mu=max(0.,dot(normalize(n),v));
    vec3 q=normalize(local);
    // Granulation: bright convection cells separated by darker lanes; slowly evolving.
    float cells=vn(q*38.+vec3(0.,time*.05,0.))*.6+vn(q*90.-vec3(time*.08))*.4;
    float lanes=smoothstep(.25,.6,cells);
    float faculae=smoothstep(.72,.9,vn(q*12.+3.))*(1.-mu);
    // Limb darkening, reddening toward the edge.
    vec3 limbTint=mix(vec3(1.,.55,.3),vec3(1.),pow(mu,.45));
    float limb=.38+.62*pow(mu,.55);
    vec3 c=surfaceColour*limbTint*limb*(.86+.2*lanes)*(1.+.35*faculae);
    gl_FragColor=vec4(c*1.15,1.);
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

let streamerTexture: THREE.CanvasTexture | null = null;
/** Faint radial streamers, like the outer corona seen at totality; illustrative only. */
function streamerMap() {
  if (streamerTexture || typeof document === "undefined") return streamerTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.translate(256, 256);
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399 + Math.sin(i * 7.1),
      len = 120 + 120 * Math.abs(Math.sin(i * 3.7)),
      g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0.25, "rgba(255,235,200,0.22)");
    g.addColorStop(1, "rgba(255,220,180,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 6 + 10 * Math.abs(Math.sin(i * 1.3));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  streamerTexture = new THREE.CanvasTexture(c);
  streamerTexture.colorSpace = THREE.SRGBColorSpace;
  return streamerTexture;
}

/** Soft additive halo so the Sun reads as a light source; purely illustrative. */
function Corona({ radius, color }: { radius: number; color: string }) {
  const map = useMemo(() => coronaMap(), []),
    streamers = useMemo(() => streamerMap(), []);
  if (!map) return null;
  return (
    <>
      {streamers && (
        <sprite scale={[radius * 9, radius * 9, 1]} raycast={() => null}>
          <spriteMaterial
            map={streamers}
            color={color}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      )}
      <sprite scale={[radius * 7, radius * 7, 1]} raycast={() => null}>
        <spriteMaterial
          map={map}
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </>
  );
}
