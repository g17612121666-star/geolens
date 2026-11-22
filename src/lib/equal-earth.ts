/**
 * The Equal Earth map projection (Šavrič, Patterson and Jenny, 2018): equal-area, with
 * continents close to their true shapes. Used for the home page's world map, whose land and
 * plate boundaries are drawn by scripts/make-home-map.mjs with the same function.
 */
const A1 = 1.340264,
  A2 = -0.081106,
  A3 = 0.000893,
  A4 = 0.003796,
  M = Math.sqrt(3) / 2;

/** Projected x and y for a longitude and latitude in degrees; y grows northward. */
export function equalEarth(lon: number, lat: number): [number, number] {
  const lambda = (lon * Math.PI) / 180,
    theta = Math.asin(M * Math.sin((lat * Math.PI) / 180)),
    t2 = theta * theta,
    t6 = t2 * t2 * t2;
  const x = (lambda * Math.cos(theta)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}

/** Half the projected width and height of the whole world. */
export const EQUAL_EARTH_EXTENT = { x: equalEarth(180, 0)[0], y: equalEarth(0, 90)[1] };

/** The home map's frame: 1000 units wide, north up, origin at the top left. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = Math.round((MAP_WIDTH * EQUAL_EARTH_EXTENT.y) / EQUAL_EARTH_EXTENT.x);

/** A longitude and latitude placed in the home map's frame. */
export function mapPoint(lon: number, lat: number): [number, number] {
  const [x, y] = equalEarth(lon, lat);
  return [
    ((x / EQUAL_EARTH_EXTENT.x + 1) * MAP_WIDTH) / 2,
    ((1 - y / EQUAL_EARTH_EXTENT.y) * MAP_HEIGHT) / 2,
  ];
}
