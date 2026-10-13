/** Percentages are used only when the caller knows the actual work total. */
export function LoadingProgress({
  label = "Loading…",
  value,
  detail,
  compact = false,
}: {
  label?: string;
  value?: number;
  detail?: string;
  compact?: boolean;
}) {
  const percent = value === undefined ? undefined : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`loading-progress ${compact ? "loading-progress--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-4 text-sm text-chalk">
        <span>{label}</span>
        {percent !== undefined && <span className="font-mono tabular-nums">{percent}%</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={
            percent === undefined
              ? "loading-progress-sweep h-full rounded-full bg-glacier"
              : "h-full rounded-full bg-glacier transition-[width] duration-200"
          }
          style={percent === undefined ? undefined : { width: `${percent}%` }}
        />
      </div>
      {detail && <p className="mt-2 text-sm leading-6 text-mist">{detail}</p>}
    </div>
  );
}
