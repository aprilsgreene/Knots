import { ringPath } from "./Logo";

/**
 * Subtle tiled brand texture built from the Knots ring-and-keyhole mark.
 * Decorative only (`aria-hidden`) — used as a faint backdrop on a few key
 * surfaces (onboarding hero, empty states). Color/opacity come from the
 * wrapping element via `currentColor`, so pass a muted text-color class in
 * `className` (e.g. `text-primary/[0.06] dark:text-primary/[0.1]`).
 */
export function KnotsPattern({ className = "", id = "knots-pattern" }: { className?: string; id?: string }) {
  const uid = `${id}-tile`;
  return (
    <svg
      className={`absolute inset-0 h-full w-full pointer-events-none ${className}`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={uid} width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
          <g stroke="currentColor" fill="none" strokeWidth="1.6" strokeLinecap="round">
            <path d={ringPath(20, 24, 8.5, 20, 28)} />
            <path d={ringPath(34.5, 24, 8.5, 160, 28)} />
          </g>
          <circle cx="27.25" cy="23" r="1.6" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${uid})`} />
    </svg>
  );
}
