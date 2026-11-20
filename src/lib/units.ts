/**
 * Units for display. Science in Geolens is metric (SI), as in NGSS; a reader can choose US
 * customary units for everyday quantities such as weather, where Americans think in °F, inches
 * and miles per hour. Values are always stored and downloaded in SI.
 */
export type UnitSystem = "metric" | "us";

export const cToF = (c: number) => (c * 9) / 5 + 32;
/** A temperature difference: no 32° offset. */
export const cDeltaToF = (dc: number) => (dc * 9) / 5;
export const mmToIn = (mm: number) => mm / 25.4;
export const msToMph = (ms: number) => ms / 0.44704;
export const kmToMi = (km: number) => km / 1.609344;
export const mToFt = (m: number) => m / 0.3048;
export const hPaToInHg = (hPa: number) => hPa / 33.8639;

export type Quantity =
  | "temperature"
  | "temperatureChange"
  | "precipitation"
  | "speed"
  | "pressure"
  | "distance"
  | "height"
  | "percent";

type Display = { unit: string; digits: number; convert: (si: number) => number };

const METRIC: Record<Quantity, Display> = {
  temperature: { unit: "°C", digits: 1, convert: (v) => v },
  temperatureChange: { unit: "°C", digits: 1, convert: (v) => v },
  precipitation: { unit: "mm", digits: 1, convert: (v) => v },
  speed: { unit: "m s⁻¹", digits: 1, convert: (v) => v },
  pressure: { unit: "hPa", digits: 0, convert: (v) => v },
  distance: { unit: "km", digits: 1, convert: (v) => v },
  height: { unit: "m", digits: 0, convert: (v) => v },
  percent: { unit: "%", digits: 0, convert: (v) => v },
};

const US: Record<Quantity, Display> = {
  temperature: { unit: "°F", digits: 0, convert: cToF },
  temperatureChange: { unit: "°F", digits: 1, convert: cDeltaToF },
  precipitation: { unit: "in", digits: 2, convert: mmToIn },
  speed: { unit: "mph", digits: 0, convert: msToMph },
  pressure: { unit: "inHg", digits: 2, convert: hPaToInHg },
  distance: { unit: "mi", digits: 1, convert: kmToMi },
  height: { unit: "ft", digits: 0, convert: mToFt },
  percent: { unit: "%", digits: 0, convert: (v) => v },
};

/** How a quantity is shown in a unit system: its unit label and usual decimal places. */
export const display = (quantity: Quantity, system: UnitSystem): Display =>
  (system === "us" ? US : METRIC)[quantity];

/** An SI value converted for display, or null when there is no value. */
export function convert(
  value: number | null | undefined,
  quantity: Quantity,
  system: UnitSystem,
): number | null {
  return value == null ? null : display(quantity, system).convert(value);
}

/** "48 °F", "8.9 °C", "0.12 in"; a dash when there is no value. */
export function formatQuantity(
  value: number | null | undefined,
  quantity: Quantity,
  system: UnitSystem,
  digits?: number,
): string {
  const d = display(quantity, system);
  if (value == null) return "—";
  const shown = d.convert(value).toFixed(digits ?? d.digits);
  // "-0" reads oddly on a thermometer.
  return `${/^-0(\.0+)?$/.test(shown) ? shown.slice(1) : shown} ${d.unit}`;
}
