import { PUBLIC_SITE_HOST, PUBLIC_SITE_URL } from "./public-site.ts";

// Optional chaining lets Node tests import this module, where import.meta.env does not exist.
const SITE = (import.meta.env?.VITE_PUBLIC_SITE_URL as string | undefined) || PUBLIC_SITE_URL;

/**
 * The image link previews use when a page has no photo of its own: the site name beside Earth
 * from Apollo 17, at the 1.91:1 shape that Classroom, email and social apps crop to.
 */
export const DEFAULT_PREVIEW = {
  src: "/og.jpg",
  alt: "Geolens: interactive 3D labs for geography and Earth science, beside a photograph of Earth taken from Apollo 17",
  width: 1200,
  height: 675,
};

function envIndexOn(): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env.VITE_INDEXABLE;
  return v === "1" || v === "true";
}

function envPublicHost(): string {
  if (typeof window !== "undefined") return window.location.hostname;
  return (typeof process !== "undefined" && process.env.VITE_PUBLIC_HOSTNAME) || PUBLIC_SITE_HOST;
}

/** Preview / loopback hosts stay noindex even if the build flag is on. */
export function isPreviewHost(host = ""): boolean {
  const h = host.split(",")[0]?.trim().split(":")[0]?.toLowerCase() || "";
  if (!h) return true;
  if (h.includes("localhost") || h.includes("127.0.0.1") || h.includes("0.0.0.0")) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true;
  if (h === PUBLIC_SITE_HOST) return false;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

/**
 * Public-release switch: VITE_INDEXABLE=true plus a non-preview host.
 * The published alias is indexable. Unknown/empty host stays noindex
 * so previews cannot leak into the index.
 */
export function shouldIndex(host?: string): boolean {
  const hostname = (host || envPublicHost()).split(",")[0]?.trim().split(":")[0] || "";
  if (isPreviewHost(hostname)) return false;
  if (hostname.toLowerCase() === PUBLIC_SITE_HOST) return true;
  return envIndexOn();
}

export function indexModeLabel(): string {
  return shouldIndex() ? "public (indexed)" : "preview (noindex)";
}

export function siteOrigin(): string {
  return SITE.replace(/\/$/, "");
}

export function pageTitle(name: string): string {
  return `${name} · Geolens`;
}

export function robotsMeta(): { name: string; content: string } {
  return {
    name: "robots",
    content: shouldIndex() ? "index,follow" : "noindex,nofollow",
  };
}

export function canonicalLink(path: string): { rel: string; href: string } {
  return { rel: "canonical", href: `${siteOrigin()}${path}` };
}

export function absUrl(path: string): string {
  if (!path) return `${siteOrigin()}${DEFAULT_PREVIEW.src}`;
  if (path.startsWith("http")) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

type HeadMeta = {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  charSet?: string;
};

export function learningResourceJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  educationalLevel?: string[];
  about?: string;
  type?: "LearningResource" | "Article" | "WebPage";
  image?: string;
  /** Standards the resource teaches toward, as framework and code. */
  alignments?: { framework: string; code: string; name: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "LearningResource",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    image: absUrl(opts.image ?? DEFAULT_PREVIEW.src),
    isAccessibleForFree: true,
    inLanguage: "en",
    learningResourceType: "Interactive resource",
    educationalLevel: opts.educationalLevel ?? [],
    about: opts.about ?? "Earth science",
    provider: { "@type": "Organization", name: "Geolens" },
    ...(opts.alignments?.length
      ? {
          educationalAlignment: opts.alignments.map((a) => ({
            "@type": "AlignmentObject",
            alignmentType: "teaches",
            educationalFramework: a.framework,
            targetName: a.code,
            targetDescription: a.name || undefined,
          })),
        }
      : {}),
  };
}

/**
 * Title, description, canonical address and link-preview tags (Open Graph and Twitter cards) for
 * a page. Link previews in Google Classroom, email and chat apps show the title, description and
 * image; a page without a photo of its own uses DEFAULT_PREVIEW.
 */
export function headFor(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  /** What the image shows, for people using screen readers. */
  imageAlt?: string;
}): {
  meta: HeadMeta[];
  links: { rel: string; href: string }[];
} {
  const title = pageTitle(opts.title);
  const own = Boolean(opts.image),
    image = absUrl(opts.image || DEFAULT_PREVIEW.src),
    alt = own ? opts.imageAlt : DEFAULT_PREVIEW.alt;
  const url = `${siteOrigin()}${opts.path}`;
  return {
    meta: [
      { title },
      { name: "description", content: opts.description },
      robotsMeta(),
      { property: "og:site_name", content: "Geolens" },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: image },
      ...(own
        ? []
        : [
            { property: "og:image:width", content: String(DEFAULT_PREVIEW.width) },
            { property: "og:image:height", content: String(DEFAULT_PREVIEW.height) },
          ]),
      ...(alt ? [{ property: "og:image:alt", content: alt }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
      ...(alt ? [{ name: "twitter:image:alt", content: alt }] : []),
    ],
    links: [canonicalLink(opts.path), { rel: "image_src", href: image }],
  };
}
