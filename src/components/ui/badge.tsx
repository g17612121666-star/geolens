import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "mist",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "mist" | "glacier" | "magma" | "sandstone" | "ice" | "moss" | "fault";
}) {
  const tones: Record<string, string> = {
    mist: "text-mist border-white/12 bg-white/6",
    glacier: "text-glacier border-glacier/30 bg-glacier/10",
    magma: "text-magma border-magma/30 bg-magma/10",
    sandstone: "text-sandstone border-sandstone/30 bg-sandstone/10",
    ice: "text-ice border-ice/30 bg-ice/10",
    moss: "text-moss border-moss/30 bg-moss/10",
    fault: "text-fault border-fault/30 bg-fault/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
