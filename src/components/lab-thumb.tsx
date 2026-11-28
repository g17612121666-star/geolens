import { useState } from "react";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";
import { labCard } from "@/lib/photo-cards";
import { CARD_SIZES, photoSrcSet } from "@/lib/responsive-image";
import { cn } from "@/lib/utils";

/**
 * A picture of the lab's 3D model as it first opens (scripts/capture-lab-thumbs.mjs), so a card
 * shows what students will explore. The lab's field photograph stands in if it cannot load.
 */
export function LabThumb({
  slug,
  sizes = CARD_SIZES,
  className,
}: {
  slug: string;
  sizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? labCard(slug) : undefined;
  if (failed && !photo) return <div className="size-full bg-trench" />;
  return (
    <img
      key={photo ? "photo" : "model"}
      src={photo ? photo.src : labThumbSrc(slug)}
      srcSet={photo ? photoSrcSet(photo.src) : labThumbSrcSet(slug)}
      sizes={sizes}
      width={640}
      height={480}
      loading="lazy"
      decoding="async"
      // The card's title names the lab; a photograph keeps its own description.
      alt={photo ? photo.alt : ""}
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", className)}
    />
  );
}
