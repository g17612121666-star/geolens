import { cn } from "@/lib/utils";
import { useId } from "react";
import { ZoomableImage } from "./zoomable-image";
export type FigureProps = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  sourceUrl?: string;
  licenseUrl?: string;
  kind?: "photo" | "scientific-image" | "diagram";
  className?: string;
  size?: "sm" | "md";
  id?: string;
};
export function Figure({ src, alt, caption, kind, className, size = "md", id }: FigureProps) {
  const generatedId = useId(),
    capId = id ?? "figure-" + generatedId;
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-void",
        size === "sm" ? "my-2" : "my-3",
        className,
      )}
    >
      <ZoomableImage
        key={src}
        src={src}
        alt={alt}
        className={cn(
          "w-full",
          kind === "scientific-image" ? "object-contain" : "object-cover",
          size === "sm" ? "max-h-48" : "max-h-80",
        )}
        describedBy={caption ? capId : undefined}
      />
      {caption && (
        <figcaption id={capId} className="px-4 py-3 text-sm leading-6 text-mist">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
