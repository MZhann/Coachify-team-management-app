"use client";

/**
 * FIFA-style hexagonal radar chart built with pure SVG.
 * 6 axes: ATT, TEC, STA, DEF, POW, SPD
 */

interface RadarChartProps {
  /** Values 0–99 for each of the 6 axes */
  values: {
    ATT: number;
    TEC: number;
    STA: number;
    DEF: number;
    POW: number;
    SPD: number;
  };
  /** SVG width/height – defaults to 300 */
  size?: number;
}

const LABELS: (keyof RadarChartProps["values"])[] = [
  "ATT",
  "TEC",
  "STA",
  "DEF",
  "POW",
  "SPD",
];

// Offset so first axis (ATT) points UP instead of right
const ANGLE_OFFSET = -Math.PI / 2;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  index: number,
  total: number
): [number, number] {
  const angle = ANGLE_OFFSET + (2 * Math.PI * index) / total;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function RadarChart({ values, size = 300 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38; // max radius for the chart area
  const labelR = size * 0.46; // radius for labels
  const n = LABELS.length;

  // Grid rings at 25 %, 50 %, 75 %, 100 %
  const rings = [0.25, 0.5, 0.75, 1];

  // Axis lines
  const axisLines = LABELS.map((_, i) => {
    const [x, y] = polarToCartesian(cx, cy, maxR, i, n);
    return `M${cx},${cy} L${x},${y}`;
  });

  // Grid polygons
  const gridPolygons = rings.map((pct) => {
    const pts = LABELS.map((_, i) =>
      polarToCartesian(cx, cy, maxR * pct, i, n)
    );
    return pts.map(([x, y]) => `${x},${y}`).join(" ");
  });

  // Data polygon
  const dataPoints = LABELS.map((label, i) => {
    const val = Math.max(0, Math.min(99, values[label]));
    const r = (val / 99) * maxR;
    return polarToCartesian(cx, cy, r, i, n);
  });
  const dataPolygon = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  // Label positions
  const labelPositions = LABELS.map((label, i) => {
    const [x, y] = polarToCartesian(cx, cy, labelR, i, n);
    return { label, x, y };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="mx-auto"
    >
      {/* Background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={maxR}
        fill="#f9fafb"
        stroke="#e5e7eb"
        strokeWidth={1}
      />

      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={0.5}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((d, i) => (
        <path key={i} d={d} stroke="#d1d5db" strokeWidth={0.5} />
      ))}

      {/* Filled data area */}
      <polygon
        points={dataPolygon}
        fill="rgba(220, 38, 38, 0.25)"
        stroke="#dc2626"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#dc2626" />
      ))}

      {/* Labels */}
      {labelPositions.map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-700 text-xs font-bold"
          style={{ fontSize: size * 0.045 }}
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

