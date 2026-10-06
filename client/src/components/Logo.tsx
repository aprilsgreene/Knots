import { LOGO_MAIN, LOGO_SECONDARY, ICON_MARK, FAVICON_MARK } from "./brandPaths";

/**
 * Knots brand artwork, traced straight from the official brand kit:
 *   - main:      two open rings joined by a keyhole, above the "knots" wordmark
 *   - secondary: horizontal wordmark with the keyhole inside the "o"
 *   - icon:      the two rings and keyhole on their own
 *   - keyhole:   the keyhole-in-a-circle favicon mark
 * Every shape is one filled path using currentColor, so it follows the theme.
 */
type Shape = { viewBox: string; width: number; height: number; d: string };

function BrandShape({
  shape,
  height,
  className = "",
  label = "Knots",
}: {
  shape: Shape;
  height: number;
  className?: string;
  label?: string;
}) {
  const width = (height * shape.width) / shape.height;
  return (
    <svg
      width={width}
      height={height}
      viewBox={shape.viewBox}
      role="img"
      aria-label={label}
      className={className}
      fill="currentColor"
    >
      <path d={shape.d} fillRule="evenodd" />
    </svg>
  );
}

/** Helpers kept for the tiled background pattern. */
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

/** The icon: two open rings joined by a keyhole. `size` is the width in px. */
export function KnotsMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return <BrandShape shape={ICON_MARK} height={(size * ICON_MARK.height) / ICON_MARK.width} className={className} />;
}

/** The keyhole-in-a-circle favicon mark. `size` is the width/height in px. */
export function KeyholeMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  return <BrandShape shape={FAVICON_MARK} height={size} className={className} />;
}

/** Backwards-compatible icon-only export (navy rounded-square app-icon badge). */
export function Logo({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[#1B1B33] text-white ${className}`}
      style={{ width: size, height: size, padding: size * 0.16 }}
    >
      <KnotsMark size={size * 0.68} />
    </span>
  );
}

const TAGLINE = "TRACK WHAT REPEATS";

/**
 * Full brand lockup.
 *   orientation="stacked"     the main logo (rings above the wordmark), for hero spots
 *   orientation="horizontal"  the secondary logo (keyhole in the "o"), for the app header
 * `size` sets the scale; the optional tagline is the kit's short line under the logo.
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
  const tagline = showTagline ? (
    <span
      className="font-sans text-foreground whitespace-nowrap"
      style={{
        fontSize: Math.max(8, size * (orientation === "stacked" ? 0.2 : 0.3)),
        letterSpacing: "0.34em",
        fontWeight: 700,
        paddingLeft: "0.34em",
      }}
    >
      {TAGLINE}
    </span>
  ) : null;

  if (orientation === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-2.5 text-foreground ${className}`}>
        <BrandShape shape={LOGO_MAIN} height={size * 2.1} />
        {tagline}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 text-foreground ${className}`}>
      <BrandShape shape={LOGO_SECONDARY} height={size * 1.05} />
      {tagline}
    </div>
  );
}
