/**
 * Photographs ship as 1280px JPEGs plus 640px and 960px WebP copies made by
 * scripts/make-photo-variants.py. Every photo lists all three, so the browser downloads the
 * smallest copy that is sharp at its displayed size and takes the JPEG only for the largest views.
 */
const PHOTO = /^(\/photos(?:\/verified)?)\/([^/?#]+)\.jpg$/;

export function photoSrcSet(src: string | undefined): string | undefined {
  const match = src ? PHOTO.exec(src) : null;
  return match
    ? `${match[1]}/640/${match[2]}.webp 640w, ${match[1]}/960/${match[2]}.webp 960w, ${src} 1280w`
    : undefined;
}

/** Typical card widths: three columns on wide screens, two on tablets, one on phones. */
export const CARD_SIZES = "(min-width: 1280px) 420px, (min-width: 768px) 48vw, 100vw";
