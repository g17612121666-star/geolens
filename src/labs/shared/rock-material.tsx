import type { ThreeElements } from "@react-three/fiber";
import { useRockPbr } from "./materials";
import { PhotographicRockMaterial } from "./photographic-rock";

type RockProps = ThreeElements["meshStandardMaterial"] & {
  repeat?: number;
  /** 0 keeps the bed color fully saturated; 1 leaves only the photo's gray tone. */
  desaturate?: number;
  strata?: boolean;
};

/** Texture hooks must run inside the R3F Canvas tree. */
export function RockMaterial({ repeat = 3, desaturate = 0.82, ...props }: RockProps) {
  return props.map === null ? (
    <ColourCodedMaterial repeat={repeat} {...props} />
  ) : (
    <PhotographicRockMaterial
      desaturate={desaturate}
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
