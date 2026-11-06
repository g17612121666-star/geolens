import { cn } from "@/lib/utils";

/** The Geolens mark: a survey benchmark triangle with its center point, as printed on topographic maps. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      <path
        d="M16 3 30 28H2Z"
        fill="none"
        stroke="var(--color-signal)"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <circle cx="16" cy="19.5" r="3" fill="var(--color-chalk)" />
    </svg>
  );
}
