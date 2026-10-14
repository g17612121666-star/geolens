import type { ThreeElements } from "@react-three/fiber";
import { useRockPbr } from "./materials";
import { PhotographicRockMaterial } from "./photographic-rock";
/** Texture hooks must run inside the R3F Canvas tree. */
export function RockMaterial({
  repeat = 3,
  ...props
}: ThreeElements["meshStandardMaterial"] & { repeat?: number }) {
  return props.map === null ? (
    <ColourCodedMaterial repeat={repeat} {...props} />
  ) : (
    <PhotographicRockMaterial
      desaturate={0.82}
      wet={false}
      sceneScale={repeat * 1.4}
      exposure={1.55}
      {...props}
    />
  );
}
function ColourCodedMaterial({
  repeat,
  ...props
}: ThreeElements["meshStandardMaterial"] & { repeat: number }) {
  const rock = useRockPbr(repeat);
  return <meshStandardMaterial {...rock} {...props} />;
}
