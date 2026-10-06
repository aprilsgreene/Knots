/**
 * Knots brand mark: two overlapping open circles (left ring open at the
 * bottom, right ring fully closed) with a keyhole nested where they overlap
 * -- tracking what repeats, held privately. Built as pure SVG (no external
 * art) so it themes via `currentColor` and stays crisp at any size, matching
 * the official brand kit icon exactly.
 */
export function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Open ring arc: a circle with a small gap, drawn the "long way" around. */
export function ringPath(cx: number, cy: number, r: number, gapCenterDeg: number, gapHalfWidthDeg: number) {
  const start = polar(cx, cy, r, gapCenterDeg + gapHalfWidthDeg);
  const end = polar(cx, cy, r, gapCenterDeg - gapHalfWidthDeg);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function KnotsMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  const leftCenter = { x: 16.3, y: 14 };
  const rightCenter = { x: 27.7, y: 14 };
  const r = 9.2;
  const keyholeX = (leftCenter.x + rightCenter.x) / 2;
  const keyholeY = leftCenter.y - 1.4;

  return (
    <svg
      width={size}
      height={(size * 30) / 44}
      viewBox="0 0 44 30"
      fill="none"
      role="img"
      aria-label="Knots"
      className={className}
    >
      {/* Left ring: open at the bottom -- a relationship traced over time, still its own shape. */}
      <path d={ringPath(leftCenter.x, leftCenter.y, r, 95, 9)} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      {/* Right ring: fully closed. */}
      <circle cx={rightCenter.x} cy={rightCenter.y} r={r} stroke="currentColor" strokeWidth="1.9" fill="none" />
      {/* Keyhole nested where the rings overlap -- privacy at the center of the pattern. */}
      <circle cx={keyholeX} cy={keyholeY} r="1.5" fill="currentColor" />
      <path
        d={`M ${keyholeX - 1.15} ${keyholeY + 0.3} L ${keyholeX + 1.15} ${keyholeY + 0.3} L ${keyholeX + 0.55} ${keyholeY + 3.8} L ${keyholeX - 0.55} ${keyholeY + 3.8} Z`}
        fill="currentColor"
      />
    </svg>
  );
}

/** Backwards-compatible icon-only export (tinted rounded-square badge). */
export function Logo({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground ${className}`}
      style={{ width: size, height: size, padding: size * 0.16 }}
    >
      <KnotsMark size={size * 0.68} />
    </span>
  );
}

/**
 * Full brand lockup: mark + "knots" wordmark, with an optional tagline.
 * `orientation="stacked"` puts the mark above a centered wordmark (hero use,
 * e.g. onboarding); the default horizontal lockup suits the app header.
 */
export function LogoLockup({
  size = 28,
  orientation = "horizontal",
  showTagline = false,
  className = "",
}: {
  size?: number;
  orientation?: "horizontal" | "stacked";
  showTagline?: boolean;
  className?: string;
}) {
  const wordmark = (
    <span
      className="font-serif leading-none tracking-tight text-foreground"
      style={{ fontSize: size * 0.86, fontWeight: 400 }}
    >
      knots
    </span>
  );
  const tagline = showTagline ? (
    <span
      className="text-muted-foreground"
      style={{ fontSize: Math.max(10, size * 0.24), letterSpacing: "0.18em", fontWeight: 500 }}
    >
      TRACK WHAT REPEATS
    </span>
  ) : null;

  if (orientation === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-1.5 ${className}`}>
        <span className="text-primary">
          <KnotsMark size={size * 1.15} />
        </span>
        {wordmark}
        {tagline}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-primary">
        <KnotsMark size={size} />
      </span>
      <div className="flex flex-col leading-none">
        {wordmark}
        {tagline}
      </div>
    </div>
  );
}
