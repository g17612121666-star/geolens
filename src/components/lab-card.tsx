import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { LabMeta } from "@/lib/labs/types";
import { REALMS } from "@/lib/labs/catalog";
import { Badge } from "@/components/ui/badge";
import { LabThumb } from "@/components/lab-thumb";
import { cn } from "@/lib/utils";

export function LabCard({ lab, className }: { lab: LabMeta; className?: string }) {
  const realm = REALMS.find((r) => r.slug === lab.realm);
  return (
    <Link
      to="/lab/$slug"
      params={{ slug: lab.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-[border-color,background-color,transform] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-glacier/40 hover:bg-white/[0.07]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-trench">
        <LabThumb slug={lab.slug} />
        <div className="absolute left-3 top-3">
          <Badge tone="glacier" className="border-transparent bg-basalt/90 backdrop-blur">
            {realm?.title}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-snug text-chalk group-hover:text-glacier">
            {lab.title}
          </h3>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-mist transition-transform duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-glacier" />
        </div>
        <p className="text-sm leading-6 text-mist">{lab.hook}</p>
      </div>
    </Link>
  );
}
