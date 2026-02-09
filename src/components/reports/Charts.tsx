interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

const defaultColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export function BarChart({
  data,
  height = 200,
  showValues = true,
  formatValue = (v) => v.toString(),
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(20, Math.min(60, (100 / data.length) * 0.7));

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${data.length * 80} ${height}`} className="w-full h-full">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 40);
          const x = index * 80 + 40 - barWidth / 2;
          const y = height - 30 - barHeight;
          const color = item.color || defaultColors[index % defaultColors.length];

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
                className="transition-all duration-300 hover:opacity-80"
              />
              {showValues && item.value > 0 && (
                <text
                  x={index * 80 + 40}
                  y={y - 5}
                  textAnchor="middle"
                  className="fill-gray-700 text-xs font-medium"
                >
                  {formatValue(item.value)}
                </text>
              )}
              <text
                x={index * 80 + 40}
                y={height - 10}
                textAnchor="middle"
                className="fill-gray-500 text-xs"
              >
                {item.label.length > 8 ? item.label.slice(0, 8) + '...' : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showArea?: boolean;
  formatValue?: (value: number) => string;
}

export function LineChart({
  data,
  height = 200,
  color = '#3b82f6',
  showArea = true,
  formatValue = (v) => v.toString(),
}: LineChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = Math.max(400, data.length * 30);
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((item, index) => ({
    x: padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (item.value / maxValue) * chartHeight,
    ...item,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(maxValue * t),
    y: padding.top + chartHeight * (1 - t),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" style={{ height }}>
        {yAxisTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-gray-500 text-xs"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}

        {showArea && (
          <path d={areaPath} fill={color} fillOpacity={0.1} />
        )}

        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />

        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
              className="transition-all hover:r-6"
            />
            {i % Math.ceil(data.length / 10) === 0 && (
              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-gray-500 text-xs"
                transform={`rotate(-45, ${point.x}, ${height - 10})`}
              >
                {point.label.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  showLegend?: boolean;
}

export function PieChart({ data, size = 200, showLegend = true }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;

  let currentAngle = -Math.PI / 2;

  const slices = data.map((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      color: item.color || defaultColors[index % defaultColors.length],
      percentage: Math.round((item.value / total) * 100),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.pathData}
            fill={slice.color}
            className="transition-all hover:opacity-80"
            stroke="white"
            strokeWidth={2}
          />
        ))}
        <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="white" />
      </svg>

      {showLegend && (
        <div className="flex flex-col gap-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-600">{slice.label}</span>
              <span className="font-medium text-gray-900">{slice.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  color = '#3b82f6',
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightMap = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightMap[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 100, height = 30, color = '#3b82f6' }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={pathData} fill="none" stroke={color} strokeWidth={1.5} />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={color}
      />
    </svg>
  );
}
