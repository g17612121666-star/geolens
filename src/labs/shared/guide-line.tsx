import { Line } from "@react-three/drei";
import { Color } from "three";
import { memo, type ComponentProps } from "react";
import { usePreferences } from "@/lib/preferences";
import { sameProps } from "./same-props";

/** Preserve semantic hue while keeping instructional guides visible on daylight canvas. */
function GuideLineShape({ color = "#ffffff", ...props }: ComponentProps<typeof Line>) {
  const theme = usePreferences((s) => s.resolvedTheme),
    ink = new Color(color);
  if (theme === "light") {
    const hsl = { h: 0, s: 0, l: 0 };
    ink.getHSL(hsl);
    ink.setHSL(hsl.h, hsl.s, Math.min(hsl.l, 0.38));
  }
  if (theme !== "light") {
    const hsl = { h: 0, s: 0, l: 0 };
    ink.getHSL(hsl);
    ink.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.55));
  }
  return (
    <Line
      {...props}
      lineWidth={Math.max(props.lineWidth ?? 1, 1.35)}
      opacity={props.transparent ? Math.max(props.opacity ?? 1, 0.55) : props.opacity}
      color={ink}
    />
  );
}

/**
 * drei's Line rebuilds its geometry whenever it receives a new `points` array, so guides are
 * memoized by value: a line drawn from the same points in a new array is left alone.
 */
export const GuideLine = memo(GuideLineShape, sameProps);
