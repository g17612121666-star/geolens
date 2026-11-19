import { Link } from "@tanstack/react-router";
import type { LabSummary } from "@/lib/labs/types";
import { REALMS } from "@/lib/labs/catalog";
import { LabThumb } from "@/components/lab-thumb";
import { cn } from "@/lib/utils";

export function LabCard({ lab, className }: { lab: LabSummary; className?: string }) {
  const realm = REALMS.find((r) => r.slug === lab.realm);
  return (
    <Link
      to="/lab/$slug"
      params={{ slug: lab.slug }}
      className={cn(
        "editorial-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt",
        className,
      )}
    >
      <div className="aspect-[4/3] overflow-hidden bg-trench">
        <LabThumb slug={lab.slug} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-sm text-glacier">{realm?.title}</p>
        <h3 className="font-display text-xl leading-snug text-chalk underline-offset-4 group-hover:underline">
          {lab.title}
        </h3>
        <p className="text-sm leading-6 text-mist">{lab.hook}</p>
      </div>
    </Link>
  );
}
