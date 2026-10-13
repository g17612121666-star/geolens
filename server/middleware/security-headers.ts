import { PUBLIC_SITE_HOST } from '../../src/lib/public-site';

/**
 * Security headers for HTML and static responses.
 * CSP allows the map, weather and video origins the site uses.
 * Indexing is host-aware: the published alias may index; preview hosts stay noindex
 * even when VITE_INDEXABLE=true.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  [
    "connect-src 'self'",
    "blob:",
    "https://tiles.openfreemap.org",
    "https://*.openfreemap.org",
    "https://api.open-meteo.com",
    "https://*.tile.openstreetmap.org",
    "https://*.openstreetmap.org",
    "https://tile.openstreetmap.org",
    "https://*.tile.opentopomap.org",
    "https://tile.opentopomap.org",
    "https://*.basemaps.cartocdn.com",
    "https://services.arcgisonline.com",
    "https://server.arcgisonline.com",
    "https://*.arcgisonline.com",
    "https://demotiles.maplibre.org",
  ].join(" "),
  "worker-src 'self' blob:",
  "child-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const INDEXABLE = process.env.VITE_INDEXABLE === "1" || process.env.VITE_INDEXABLE === "true";

type HeaderBag = { get(name: string): string | null };
type SecurityEvent = {
  url?: URL;
  req?: { headers?: HeaderBag };
};

function requestHost(event: SecurityEvent): string {
  const headers = event.req?.headers;
  const raw =
    (headers && typeof headers.get === "function"
      ? (headers.get("x-forwarded-host") ?? headers.get("host"))
      : null) ??
    event.url?.host ??
    process.env.VITE_PUBLIC_HOSTNAME ??
    "";
  return String(raw).split(",")[0]?.trim() ?? "";
}

function isPreviewHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() || "";
  if (!h) return true;
  if (h.includes("localhost") || h.includes("127.0.0.1") || h.includes("0.0.0.0")) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true;
  if (h === PUBLIC_SITE_HOST) return false;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

/** Unique deployment URLs remain noindex; the published alias is open. */
function allowIndex(host: string): boolean {
  if (isPreviewHost(host)) return false;
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname === PUBLIC_SITE_HOST) return true;
  return INDEXABLE;
}

export default async function securityHeadersMiddleware(
  event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Content-Security-Policy", CSP);
  if (allowIndex(requestHost(event))) {
    headers.delete("X-Robots-Tag");
  } else {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
