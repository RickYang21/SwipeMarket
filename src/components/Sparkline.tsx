"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 120, height = 32, color }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = color || (isUp ? "#34D399" : "#EF4444");

  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((val - min) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Build fill polygon (area under the line)
  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={width - padding}
        cy={padding + chartH - ((data[data.length - 1] - min) / range) * chartH}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
