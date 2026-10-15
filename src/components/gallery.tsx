import { Figure, type FigureProps } from "@/components/figure";
import { cn } from "@/lib/utils";

/** A small grid of captioned photographs; each opens full size like any other figure. */
export function Gallery({
  figures,
  columns = 2,
  className,
}: {
  figures: FigureProps[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  if (!figures.length) return null;
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "",
        className,
      )}
    >
      {figures.map((f) => (
        <Figure key={f.src} {...f} size="sm" className="my-0" />
      ))}
    </div>
  );
}
