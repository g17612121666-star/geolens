import { cn } from "@/lib/utils";

/** The Geolens mark: a globe with one meridian and two contour lines. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id="geolens-mark" x1="4" y1="4" x2="28" y2="28">
          <stop offset="0" stopColor="var(--color-glacier)" />
          <stop offset="1" stopColor="var(--color-ice)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#geolens-mark)" />
      <g fill="none" stroke="var(--color-basalt)" strokeLinecap="round" strokeWidth="1.6">
        <ellipse cx="16" cy="16" rx="5.2" ry="13" opacity=".75" />
        <path d="M5.2 11.5c4.3 2.2 17.3 2.2 21.6 0" opacity=".75" />
        <path d="M4.6 18.6c3.6-1.8 7.4.9 11.1.3 3.7-.6 7.4-3 11.7-.8" />
      </g>
    </svg>
  );
}
