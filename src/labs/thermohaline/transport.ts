/** A finite illustrative release from the center of the tank, not a calculated settling speed. */
export function densityParcelHeight(t: number, densityDifference: number) {
  const direction = Math.abs(densityDifference) < 0.005 ? 0 : Math.sign(densityDifference);
  return -1 - direction * 0.76 * Math.max(0, Math.min(1, t));
}
