interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size: number;
  strokeWidth: number;
  label: string;
  sublabel?: string;
  /** Accessible description, e.g. "맞힘 12/19". */
  ariaLabel: string;
  tone?: "brand" | "correct";
}

export default function ProgressRing({
  value,
  size,
  strokeWidth,
  label,
  sublabel,
  ariaLabel,
  tone = "brand",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));
  const center = size / 2;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={tone === "correct" ? "stroke-correct-soft" : "stroke-primary-soft"}
        />
        {/* At 0 the round cap would still paint a dot, so draw no arc at all. */}
        {clamped > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
            className={tone === "correct" ? "stroke-correct" : "stroke-brand"}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="font-extrabold text-ink" style={{ fontSize: size * 0.21 }}>
          {label}
        </span>
        {sublabel && (
          <span className="text-muted" style={{ fontSize: Math.max(10, size * 0.13) }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
