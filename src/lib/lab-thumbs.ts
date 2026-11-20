/**
 * Pictures of each lab's 3D model as it first opens, made by scripts/capture-lab-thumbs.mjs:
 * 640 x 480 WebP, with 320 and 160 pixel copies for small cards and index rows.
 */
export const LAB_THUMB_WIDTHS = [160, 320, 640] as const;

export function labThumbSrc(slug: string, width: (typeof LAB_THUMB_WIDTHS)[number] = 640) {
  return `/labs/thumbs/${slug}${width === 640 ? "" : `-${width}`}.webp`;
}

export function labThumbSrcSet(slug: string) {
  return LAB_THUMB_WIDTHS.map((w) => `${labThumbSrc(slug, w)} ${w}w`).join(", ");
}
