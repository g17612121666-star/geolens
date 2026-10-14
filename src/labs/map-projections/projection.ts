import { latLonToXYZ } from "../../lib/geo.ts";
/** Shared by the mapped surface, graticule and distortion indicatrices. */
export function projectedPosition(
  lat: number,
  lon: number,
  morph: number,
  kind: number,
): [number, number, number] {
  const phi = (lat * Math.PI) / 180,
    lambda = (lon * Math.PI) / 180,
    world = latLonToXYZ(lat, lon, 1.4);
  // Rotate the spherical start by 180°: Africa / Greenwich face the reader,
  // with east to the right, matching the flat map's central meridian.
  const sphere = [-world[0], world[1], -world[2]];
  const x = (kind === 2 ? 0.5 * lambda * (2 / Math.PI + Math.cos(phi)) : lambda) * 0.72;
  const y =
    (kind === 0 ? Math.log(Math.tan(Math.PI / 4 + phi / 2)) : kind === 1 ? Math.sin(phi) : phi) *
    0.72;
  return [
    sphere[0] * (1 - morph) + x * morph,
    sphere[1] * (1 - morph) + y * morph,
    sphere[2] * (1 - morph),
  ];
}
/** A small geodesic circle, used to compare local projection distortion. */
export function geographicCircle(lat: number, lon: number, radius = 4): [number, number][] {
  const p = (lat * Math.PI) / 180,
    l = (lon * Math.PI) / 180,
    d = (radius * Math.PI) / 180;
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2,
      q = Math.asin(Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(a)),
      w =
        l +
        Math.atan2(
          Math.sin(a) * Math.sin(d) * Math.cos(p),
          Math.cos(d) - Math.sin(p) * Math.sin(q),
        );
    return [(q * 180) / Math.PI, (w * 180) / Math.PI];
  });
}
