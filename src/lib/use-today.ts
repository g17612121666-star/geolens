import { useEffect, useState } from "react";
import { dayKey } from "./daily";

/**
 * Today's date in the player's time zone. The server renders in UTC, so the first render uses
 * the UTC day (matching the server's markup) and the local day takes over once mounted.
 */
export function useToday() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => setDay(dayKey()), []);
  return day;
}
