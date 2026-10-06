import { useId } from "react";

interface RadarChartProps {
  /** category label -> average value 1-10 */
  categories: { label: string; average: number; hasData?: boolean }[];
  size?: number;
  /** caption shown under the chart to keep it framed as tentative, not factual */
  caption?: string;
}

// A calm radial bar chart (a "nightingale rose" style) used to give an
// at-a-glance shape to a relationship's ratings. Each category gets its own
// colored bar radiating out from the center, length proportional to your
// rating -- always your own ratings, never a computed score, risk level, or
// verdict. Colors are pulled from Knots's CSS chart-color variables so it
// matches light/dark mode. Designed for legibility: a labeled ring scale, a
// faint full-length track per bar for scale reference, and a numeric value
// chip at the end of every bar.
export function RadarChart({ categories, size = 260, caption }: RadarChartProps) {
  const id = useId();
  const cx = size / 2;
  const cy = size / 2 - 6;
  const outerR = size * 0.3;
  const innerR = outerR * 0.16;
  const n = categories.length;
  const rings = [0.25, 0.5, 0.75, 1];
  const gap = n > 0 ? Math.min(0.16, (Math.PI * 1.2) / (n * 8)) : 0;

  const angleCenter = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (angle: number, r: number) => ({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const sectorPath = (i: number, rOuter: number) => {
    const half = Math.PI / n - gap;
    const a0 = angleCenter(i) - half;
    const a1 = angleCenter(i) + half;
    const p0i = pt(a0, innerR);
    const p0o = pt(a0, rOuter);
    const p1o = pt(a1, rOuter);
    const p1i = pt(a1, innerR);
    return `M ${p0i.x} ${p0i.y} L ${p0o.x} ${p0o.y} A ${rOuter} ${rOuter} 0 0 1 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${innerR} ${innerR} 0 0 0 ${p0i.x} ${p0i.y} Z`;
  };

  const labelPad = 32;

  return (
    <div className="flex flex-col items-center" data-testid="chart-radar">
      <svg
        width={size + labelPad * 2}
        height={size + 12}
        viewBox={`${-labelPad} 0 ${size + labelPad * 2} ${size + 12}`}
        role="img"
        aria-label={`Relationship trait snapshot, shaped by your own ratings: ${categories
          .map((c) => (c.hasData === false ? `${c.label} not rated yet` : `${c.label} ${c.average.toFixed(1)} out of 10`))
          .join(", ")}`}
      >
        <defs>
          {categories.map((_, i) => (
            <radialGradient key={i} id={`radial-fill-${id}-${i}`} cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor={chartColors[i % chartColors.length]} stopOpacity="0.55" />
              <stop offset="100%" stopColor={chartColors[i % chartColors.length]} stopOpacity="0.9" />
            </radialGradient>
          ))}
          <filter id={`radial-glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="hsl(var(--foreground))" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Ring scale for reference */}
        {rings.map((l) => (
          <circle
            key={l}
            cx={cx}
            cy={cy}
            r={innerR + (outerR - innerR) * l}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={l === 1 ? 1.25 : 1}
            strokeDasharray={l === 1 ? undefined : "2 3"}
            opacity={l === 1 ? 0.85 : 0.5}
          />
        ))}
        {[0.5, 1].map((l) => (
          <text
            key={l}
            x={cx + 4}
            y={cy - (innerR + (outerR - innerR) * l) - 2}
            fontSize={8.5}
            fill="hsl(var(--muted-foreground))"
            fontFamily="var(--font-sans)"
            opacity={0.75}
          >
            {Math.round(l * 10)}
          </text>
        ))}

        {/* Faint full-length track per category, for scale reference */}
        {categories.map((_, i) => (
          <path key={`track-${i}`} d={sectorPath(i, outerR)} fill="hsl(var(--muted-foreground))" opacity={0.06} />
        ))}

        {/* Data bars */}
        {categories.map((c, i) => {
          if (c.hasData === false) return null;
          const frac = Math.max(0.04, Math.min(1, c.average / 10));
          const rOuter = innerR + (outerR - innerR) * frac;
          return (
            <path
              key={i}
              d={sectorPath(i, rOuter)}
              fill={`url(#radial-fill-${id}-${i})`}
              stroke={chartColors[i % chartColors.length]}
              strokeWidth={1.25}
              strokeLinejoin="round"
              filter={`url(#radial-glow-${id})`}
            />
          );
        })}

        {/* Value chips at the end of each bar */}
        {categories.map((c, i) => {
          if (c.hasData === false) return null;
          const frac = Math.max(0.04, Math.min(1, c.average / 10));
          const rOuter = innerR + (outerR - innerR) * frac;
          const p = pt(angleCenter(i), rOuter + 15);
          return (
            <g key={`chip-${i}`}>
              <rect
                x={p.x - 13}
                y={p.y - 8}
                width={26}
                height={15}
                rx={7.5}
                fill={chartColors[i % chartColors.length]}
              />
              <text
                x={p.x}
                y={p.y + 2.5}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill="hsl(var(--background))"
                fontFamily="var(--font-sans)"
              >
                {c.average.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Category axis labels */}
        {categories.map((c, i) => {
          const lp = pt(angleCenter(i), outerR + 34);
          const words = c.label.split(" ");
          return (
            <text
              key={i}
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              fontSize={11}
              fontWeight={500}
              fill="hsl(var(--foreground))"
              fontFamily="var(--font-sans)"
            >
              {words.map((w, wi) => (
                <tspan key={wi} x={lp.x} y={lp.y + (wi - (words.length - 1) / 2) * 13}>
                  {w}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      {caption && <p className="text-xs text-muted-foreground text-center mt-1.5 max-w-xs">{caption}</p>}
    </div>
  );
}
