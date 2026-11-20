import { NGSS_DIMENSIONS, coreIdeaLabel } from "@/lib/labs/ngss";
import { cn } from "@/lib/utils";

/**
 * An NGSS expectation's three dimensions: its science and engineering practice, crosscutting
 * concept and disciplinary core ideas. `detail` adds the core ideas' titles and any ideas the
 * expectation borrows from other disciplines; otherwise it is one short line.
 */
export function NgssDimensions({
  id,
  detail = false,
  className,
}: {
  id: string;
  detail?: boolean;
  className?: string;
}) {
  const d = NGSS_DIMENSIONS[id];
  if (!d) return null;
  const ideas = detail
    ? [
        d.coreIdeas.map(coreIdeaLabel).join("; "),
        ...(d.secondary.length ? [`also ${d.secondary.map(coreIdeaLabel).join("; ")}`] : []),
      ].join("; ")
    : d.coreIdeas.join(", ");
  const rows: [string, string][] = [
    ["Practice", d.practice],
    ...(d.concept ? [["Crosscutting concept", d.concept] as [string, string]] : []),
    ["Core ideas", ideas],
  ];
  return (
    <dl
      className={cn(
        "text-xs leading-5 text-mist",
        detail ? "space-y-0.5" : "flex flex-wrap gap-x-4",
        className,
      )}
    >
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt className="inline">{`${term}: `}</dt>
          <dd className="inline text-chalk/85">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
