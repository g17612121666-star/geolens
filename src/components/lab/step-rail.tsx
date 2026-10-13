import type { LabMeta } from "@/lib/labs/types";
import { useLabControls } from "@/lib/store/lab-controls";
import { cn } from "@/lib/utils";

export function StepRail({ lab }: { lab: LabMeta }) {
  const step = useLabControls((s) => s.step);
  const setStep = useLabControls((s) => s.setStep);
  const setPanelTab = useLabControls((s) => s.setPanelTab);
  const current = lab.steps[step] ?? lab.steps[0];

  return (
    <aside className="pointer-events-auto flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-basalt/95 p-4">
      <p className="section-label">{"Try the experiment"}</p>
      <ol className="grid grid-cols-2 gap-1">
        {lab.steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                setStep(i);
                if (s.id === "check") setPanelTab("check");
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                i === step
                  ? "bg-white/10 text-chalk"
                  : "text-mist hover:bg-white/6 hover:text-chalk",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[13px]",
                  i === step ? "bg-glacier text-basalt" : "bg-white/8 text-mist",
                )}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm leading-6 text-chalk/90">{current.body}</p>
    </aside>
  );
}
