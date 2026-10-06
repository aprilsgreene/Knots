interface TrendPoint {
  date: number; // timestamp
  average: number; // 1-10
}

interface CategoryTrendChartProps {
  label: string;
  points: TrendPoint[]; // oldest first
  width?: number;
  height?: number;
}

// A small line sparkline showing how one category's average rating moved
// across a person's own check-ins over time. Purely descriptive -- no
// trend judgment ("improving"/"worsening") is asserted, only the shape.
export function CategoryTrendChart({ label, points, width = 260, height = 64 }: CategoryTrendChartProps) {
  if (points.length < 2) {
    return (
      <div className="text-xs text-muted-foreground" data-testid={`trend-empty-${label.replace(/\s+/g, "-")}`}>
        {label}: not enough check-ins yet to show a trend
      </div>
    );
  }

  const padding = 6;
  const minVal = 1;
  const maxVal = 10;
  const xStep = (width - padding * 2) / (points.length - 1);
  const yFor = (v: number) => height - padding - ((v - minVal) / (maxVal - minVal)) * (height - padding * 2);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${padding + i * xStep} ${yFor(p.average)}`)
    .join(" ");

  return (
    <div data-testid={`trend-${label.replace(/\s+/g, "-")}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {points[points.length - 1].average.toFixed(1)}/10 most recent
        </span>
      </div>
      <svg width={width} height={height} role="img" aria-label={`${label} across your check-ins`}>
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={padding + i * xStep} cy={yFor(p.average)} r={2.5} fill="hsl(var(--primary))" />
        ))}
      </svg>
    </div>
  );
}
