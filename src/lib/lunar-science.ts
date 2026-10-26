/** Circular-orbit teaching geometry; not an ephemeris or eclipse-date predictor. Kilometers. */
export const LUNAR = {
  earth: 6371,
  moon: 1737.4,
  distance: 384400,
  sun: 695700,
  au: 149597870.7,
  inclination: 5.145,
};
export function lunarPosition(
  phase: number,
  nodeDegrees = 60,
  aligned = false,
  distance = LUNAR.distance,
): [number, number, number] {
  const node = (nodeDegrees * Math.PI) / 180,
    u = phase * 2 * Math.PI - node,
    i = ((aligned ? 0 : LUNAR.inclination) * Math.PI) / 180,
    r = distance;
  return [
    r * (Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(i)),
    r * Math.sin(u) * Math.sin(i),
    -r * (Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(i)),
  ];
}
export function illuminatedFraction(p: [number, number, number]) {
  return (1 - p[0] / Math.hypot(...p)) / 2;
}
export function shadowRadii(radius: number, sunDistance: number, behind: number) {
  return {
    umbra: radius - (behind * (LUNAR.sun - radius)) / sunDistance,
    penumbra: radius + (behind * (LUNAR.sun + radius)) / sunDistance,
  };
}
export function lunarEclipse(p: [number, number, number]) {
  if (p[0] >= 0) return "Outside Earth’s shadow";
  const { umbra, penumbra } = shadowRadii(LUNAR.earth, LUNAR.au, -p[0]),
    offset = Math.hypot(p[1], p[2]);
  if (offset + LUNAR.moon < umbra) return "Total lunar eclipse";
  if (offset - LUNAR.moon < umbra) return "Partial lunar eclipse";
  if (offset - LUNAR.moon < penumbra) return "Penumbral lunar eclipse";
  return "Moon misses Earth’s shadow";
}
/** Moon's shadow at Earth (Sun toward +x). Widths are full diameters in km where the shadow axis meets the surface. */
export function solarEclipse(p: [number, number, number]) {
  const s = [p[0] - LUNAR.au, p[1], p[2]],
    sunDistance = Math.hypot(...s),
    d = s.map((v) => v / sunDistance);
  const along = -p.reduce((a, v, i) => a + v * d[i], 0),
    offset = Math.hypot(...p.map((v, i) => v + along * d[i]));
  if (p[0] <= 0 || along <= 0) return { kind: "none" as const, width: 0, offset };
  const central = offset < LUNAR.earth,
    behind = central ? along - Math.sqrt(LUNAR.earth ** 2 - offset ** 2) : along;
  const { umbra, penumbra } = shadowRadii(LUNAR.moon, sunDistance, behind);
  if (central)
    return {
      kind: umbra > 0 ? ("total" as const) : ("annular" as const),
      width: 2 * Math.abs(umbra),
      offset,
    };
  if (offset - penumbra < LUNAR.earth) return { kind: "partial" as const, width: 0, offset };
  return { kind: "none" as const, width: 0, offset };
}
/** Quadrupole equilibrium tide: the spherical mean of each P2 term is zero. */
export function equilibriumTide(
  direction: [number, number, number],
  moon: [number, number, number],
) {
  const d = Math.hypot(...direction),
    m = Math.hypot(...moon),
    mu = direction.reduce((s, v, i) => s + v * moon[i], 0) / (d * m),
    sun = direction[0] / d;
  return 0.5 * (3 * mu * mu - 1) + 0.46 * 0.5 * (3 * sun * sun - 1);
}
