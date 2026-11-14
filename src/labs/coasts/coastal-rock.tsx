import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { weatherCliff } from "./cliff-geometry";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";

/**
 * Cliff chalk: cream rather than white, with flint nodules strung along some beds, joints, and
 * gray and buff streaks where rain and seepage run down the face. Near the sea it is wet and
 * darker (the splash zone), with green weed at the foot.
 */
const CHALK = cliffFaceGlsl({
  beds: 3.2,
  bedOffset: 0.3,
  custom: `
  float y=p.y*BEDS+BEDOFF+.05*sNoise(vec2(p.x+p.z,1.)*2.);
  float i=floor(y),fy=fract(y),h=p.x+p.z;
  vec3 c=mix(vec3(.94,.92,.86),vec3(.86,.84,.78),g)*mix(.95,1.03,sNoise(vec2(h,p.y)*vec2(1.5,3.)));
  float band=1.-smoothstep(0.,.05,abs(fy-.5)),nod=smoothstep(.55,.7,sNoise(vec2(h*16.,i*3.)));
  c=mix(c,vec3(.25,.26,.28),band*nod*step(.4,sHash(vec2(i,4.)))*.9);
  float j=fract(h*1.3+.12*sNoise(vec2(p.y*2.,i)));
  c*=mix(.84,1.,smoothstep(0.,.016,min(j,1.-j)));
  c*=mix(1.,.82,smoothstep(.56,.82,sNoise(vec2(h*7.,p.y*.45+2.))));
  c=mix(c,c*vec3(1.,.94,.82),smoothstep(.6,.85,sNoise(vec2(h*3.,p.y*.7)))*.5);
  c=mix(c,c*vec3(.7,.72,.68),(1.-smoothstep(.1,.34,p.y))*.85);
  float weed=(1.-smoothstep(.02,.14,p.y))*smoothstep(.42,.58,sNoise(vec2(h*9.,p.y*7.)));
  return mix(c,vec3(.3,.36,.21),weed*.85);`,
});

/** Chalk with flint bands on the cliff faces and arch roofs; grass on the upward-facing tops. */
export function CoastalRockMaterial({ top = "#7d9a57" }: { top?: string }) {
  return (
    <SectionMaterial
      glsl={CHALK}
      cliff={0.62}
      cacheKey="coast-chalk-v2"
      color={top}
      roughness={0.9}
    />
  );
}

export function CoastalRock({
  points,
  depth = 1.8,
  position = [0, 0, 0],
  top,
}: {
  points: [number, number][];
  depth?: number;
  position?: [number, number, number];
  /** Color of upward-facing surfaces; grass by default, bare wave-washed rock for a stump. */
  top?: string;
}) {
  const signature = JSON.stringify(points);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return weatherCliff(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on signature (points as JSON) so a fresh points array with the same vertices does not rebuild the geometry
  }, [signature, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <CoastalRockMaterial top={top} />
    </mesh>
  );
}
