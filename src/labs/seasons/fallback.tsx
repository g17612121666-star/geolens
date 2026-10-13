import { useLabControls } from "@/lib/store/lab-controls";
import { formatDay } from "@/lib/geo";

export function SeasonsFallback() {
  const t = useLabControls((s) => s.t);
  const tilt = useLabControls((s) => s.params.tilt ?? 23.44);
  const day = t * 365;
  const theta = (t - 80 / 365) * Math.PI * 2;
  const cx = 200 + 120 * Math.sin(theta);
  const cy = 110 - 48 * Math.cos(theta);
  return (
    <div className="flex size-full items-center justify-center bg-void p-8">
      <div className="max-w-lg">
        <p className="section-label mb-3">{"2D fallback"}</p>
        <svg viewBox="0 0 400 220" className="w-full">
          <rect width="400" height="220" fill="#07090C" />
          <ellipse
            cx="200"
            cy="110"
            rx="120"
            ry="48"
            fill="none"
            stroke="#8B9A97"
            strokeDasharray="3 4"
          />
          <circle cx="200" cy="110" r="14" fill="#E8B86D" />
          <g transform={`translate(${cx} ${cy}) rotate(${-tilt})`}>
            <circle r="16" fill="#1a4a6e" stroke="#3EE0C6" />
            <line x1="0" y1="-24" x2="0" y2="24" stroke="#F4EFE6" />
          </g>
          {["Mar", "Jun", "Sep", "Dec"].map((m, i) => {
            const a = (i * Math.PI) / 2;
            return (
              <text
                key={m}
                x={200 + 148 * Math.sin(a)}
                y={114 - 62 * Math.cos(a)}
                fill="#8B9A97"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {m}
              </text>
            );
          })}
        </svg>
        <p className="mt-3 font-mono text-sm text-mist">
          {formatDay(day)} {"· tilt "}
          {tilt.toFixed(1)}
          {"° · WebGL unavailable"}
        </p>
      </div>
    </div>
  );
}
