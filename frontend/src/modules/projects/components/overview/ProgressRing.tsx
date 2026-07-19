interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Hand-rolled SVG donut ring (`stroke-dasharray`/`stroke-dashoffset`) —
 * deliberately not a charting library per the task brief's guidance to
 * prefer this over a new dependency for a single ring. Colors are read from
 * CSS custom properties (`--primary`/`--muted`) rather than hardcoded hex,
 * so it stays in sync with the design system's brand-blue primary token.
 */
export function ProgressRing({ percent, size = 140, strokeWidth = 12 }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Overall progress: ${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{clamped}%</span>
      </div>
    </div>
  );
}
