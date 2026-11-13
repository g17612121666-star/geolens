/**
 * Prop comparison for memoized scene parts. Scenes often pass positions and point lists as new
 * arrays on every render (`pos={[0, 1, 0]}`), so a plain `memo` would still re-render the part.
 * Arrays, and three.js vectors and colors inside them, are compared by value instead.
 */
type VectorLike = { x: number; y: number; z?: number; w?: number };
type ColorLike = { isColor: true; r: number; g: number; b: number };

function isVector(v: unknown): v is VectorLike {
  const o = v as { isVector2?: boolean; isVector3?: boolean; isVector4?: boolean } | null;
  return !!o && (o.isVector2 === true || o.isVector3 === true || o.isVector4 === true);
}

function isColor(v: unknown): v is ColorLike {
  return !!v && (v as { isColor?: boolean }).isColor === true;
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameValue(a[i], b[i])) return false;
    return true;
  }
  if (isVector(a) && isVector(b)) return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w;
  if (isColor(a) && isColor(b)) return a.r === b.r && a.g === b.g && a.b === b.b;
  return false;
}

/** `memo` comparator: true when every prop is the same value (arrays compared element by element). */
export function sameProps<P extends object>(prev: P, next: P): boolean {
  const before = prev as Record<string, unknown>,
    after = next as Record<string, unknown>,
    keys = Object.keys(before);
  if (keys.length !== Object.keys(after).length) return false;
  for (const key of keys) {
    if (!(key in after) || !sameValue(before[key], after[key])) return false;
  }
  return true;
}
