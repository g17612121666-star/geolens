import { useMemo, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { EarthMesh } from "@/components/globe/earth";
import { spinAngle, AXIAL_TILT } from "./rotation";
function NasaBody({ name, radius }: { name: string; radius: number }) {
  const { scene } = useGLTF(`/models/scientific/${name}.glb`),
    copy = useMemo(() => {
      const s = scene.clone(true);
      s.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material.clone() as THREE.MeshStandardMaterial;
          m.metalness = 0;
          m.roughness = 0.84;
          if (m.map) {
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.anisotropy = 8;
          }
          o.material = m;
        }
      });
      return s;
    }, [scene]);
  useEffect(
    () => () =>
      copy.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material.dispose();
      }),
    [copy],
  );
  // NASA assets have equatorial radius 500; convert to the catalogue's mean radius.
  const meanFactor =
    name === "saturn" ? Math.cbrt(451.019 / 500) : name === "mars" ? Math.cbrt(497.05557 / 500) : 1;
  return (
    <group scale={radius / (500 * meanFactor)}>
      <primitive object={copy} dispose={null} />
    </group>
  );
}
function MappedBody({
  url,
  radius,
  flatten = 1,
}: {
  url: string;
  radius: number;
  flatten?: number;
}) {
  const map = useTexture(url);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 12;
  }, [map]);
  const equatorial = radius / Math.cbrt(flatten);
  return (
    <mesh scale={[equatorial, equatorial * flatten, equatorial]}>
      <sphereGeometry args={[1, 128, 96]} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
  );
}
/** Procedural cloud-top material: explicitly a model, never an observational photograph. */
const CLOUD_GLSL = `
float ch(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float cn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(ch(i),ch(i+vec3(1,0,0)),f.x),mix(ch(i+vec3(0,1,0)),ch(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(ch(i+vec3(0,0,1)),ch(i+vec3(1,0,1)),f.x),mix(ch(i+vec3(0,1,1)),ch(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cf(vec3 p){return .5*cn(p)+.25*cn(p*2.03)+.15*cn(p*4.1)+.1*cn(p*8.3);}
vec3 cloudTop(vec3 q,float kind){
  float lat=q.y;
  if(kind<.5){
    // Venus: sulphuric-acid haze with sheared, Y-shaped streaks.
    float warp=cf(q*3.+vec3(0.,0.,lat*4.));
    float streak=cf(vec3(q.x*2.+warp*1.5,lat*9.,q.z*2.+warp*1.5));
    return mix(vec3(.80,.72,.52),vec3(.96,.90,.74),streak)*(1.-.12*abs(lat));
  }
  if(kind<1.5){
    // Uranus: nearly featureless methane haze with a brighter polar cap.
    float band=.5+.5*sin(lat*18.+cf(q*4.)*1.5);
    vec3 c=mix(vec3(.60,.80,.82),vec3(.68,.86,.88),band*.4);
    return mix(c,vec3(.82,.92,.92),smoothstep(.55,.9,lat));
  }
  // Neptune: deep blue bands, a dark storm and bright methane-ice streaks.
  float band=.5+.5*sin(lat*9.+cf(q*3.)*2.5);
  vec3 c=mix(vec3(.22,.38,.74),vec3(.30,.47,.80),band*.5+.25*cf(q*6.));
  vec2 spot=vec2(atan(q.z,q.x)+1.6,lat+.35);
  c=mix(c,vec3(.10,.18,.44),1.-smoothstep(.08,.14,length(spot*vec2(.6,1.6))));
  float streak=smoothstep(.62,.8,cf(vec3(q.x*1.5,lat*30.,q.z*1.5)))*smoothstep(.2,.0,abs(lat+.2));
  return mix(c,vec3(.9,.94,1.),streak*.8);
}`;
function CloudBody({ index, radius }: { index: number; radius: number }) {
  const venus = index === 1,
    uranus = index === 6,
    flatten = venus ? 1 : uranus ? 0.9771 : 0.9829,
    kind = venus ? 0 : uranus ? 1 : 2;
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.vertexShader =
        "varying vec3 cloudPos;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ncloudPos=normalize(position);",
        );
      s.fragmentShader =
        "varying vec3 cloudPos;\n" +
        CLOUD_GLSL +
        "\n" +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>\ndiffuseColor.rgb*=pow(cloudTop(cloudPos,${kind.toFixed(1)}),vec3(2.2));`,
        );
    },
    [kind],
  );
  const r = radius / Math.cbrt(flatten);
  return (
    <group>
      <mesh scale={[r, r * flatten, r]}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial
          color="white"
          roughness={0.85}
          onBeforeCompile={compile}
          customProgramCacheKey={() => `cloud-body-${kind}`}
        />
      </mesh>
      {uranus && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.95, radius * 2.02, 128]} />
          <meshBasicMaterial
            color="#8a979a"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
function BodySurface({
  index,
  radius,
  sun,
}: {
  index: number;
  radius: number;
  sun: THREE.Vector3;
}) {
  if (index === 2) return <EarthMesh radius={radius} sunDirection={sun} />;
  if (index === 0)
    return <MappedBody url="/textures/planets/mercury-enhanced.jpg" radius={radius} />;
  if (index === 3 || index === 5)
    return <NasaBody name={index === 3 ? "mars" : "saturn"} radius={radius} />;
  if (index === 4)
    return (
      <MappedBody url="/textures/planets/jupiter-6000.jpg" radius={radius} flatten={0.93513} />
    );
  return <CloudBody index={index} radius={radius} />;
}
export function PlanetBody({
  index,
  radius,
  sun = new THREE.Vector3(1, 0.3, 2),
  years = 0,
}: {
  index: number;
  radius: number;
  sun?: THREE.Vector3;
  years?: number;
}) {
  return (
    <group rotation={[0, 0, (AXIAL_TILT[index] * Math.PI) / 180]}>
      <group rotation={[0, spinAngle(index, years), 0]}>
        <BodySurface index={index} radius={radius} sun={sun} />
      </group>
    </group>
  );
}
