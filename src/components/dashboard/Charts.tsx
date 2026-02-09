import { useMemo, useState } from 'react';
import { TrendingUp, Clock, BarChart3 } from 'lucide-react';
import type { ProductivityTrend, TimeLogStats } from '../../services/dashboardService';

interface LineChartProps {
  data: ProductivityTrend[];
  loading: boolean;
}

interface BarChartProps {
  data: { date: string; minutes: number }[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric' });
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function ProductivityChart({ data, loading }: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data.length) return { points: [], maxValue: 0, labels: [] };

    const recentData = data.slice(-14);
    const maxTasks = Math.max(...recentData.map(d => Math.max(d.tasksCompleted, d.tasksCreated)), 1);

    const width = 100;
    const height = 100;
    const padding = 10;

    const completedPoints = recentData.map((d, i) => {
      const x = padding + (i / (recentData.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (d.tasksCompleted / maxTasks) * (height - 2 * padding);
      return { x, y, value: d.tasksCompleted, date: d.date };
    });

    const createdPoints = recentData.map((d, i) => {
      const x = padding + (i / (recentData.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (d.tasksCreated / maxTasks) * (height - 2 * padding);
      return { x, y, value: d.tasksCreated, date: d.date };
    });

    return {
      completed: completedPoints,
      created: createdPoints,
      maxValue: maxTasks,
      data: recentData
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  const createPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Productivity Trends</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-500 rounded" />
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-gray-600">Created</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <div className="relative">
          <svg viewBox="0 0 100 100" className="w-full h-48" preserveAspectRatio="none">
            <defs>
              <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1="10"
                y1={10 + (percent / 100) * 80}
                x2="90"
                y2={10 + (percent / 100) * 80}
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
            ))}

            {chartData.completed && chartData.completed.length > 1 && (
              <>
                <path
                  d={`${createPath(chartData.completed)} L ${chartData.completed[chartData.completed.length - 1].x} 90 L ${chartData.completed[0].x} 90 Z`}
                  fill="url(#completedGradient)"
                />
                <path
                  d={createPath(chartData.completed)}
                  fill="none"
                  stroke="rgb(16, 185, 129)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {chartData.created && chartData.created.length > 1 && (
              <path
                d={createPath(chartData.created)}
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3,2"
              />
            )}

            {chartData.completed?.map((point, i) => (
              <circle
                key={`completed-${i}`}
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === i ? 2.5 : 1.5}
                fill="rgb(16, 185, 129)"
                className="transition-all duration-150"
              />
            ))}
          </svg>

          <div
            className="absolute inset-0 flex"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.data?.map((d, i) => (
              <div
                key={i}
                className="flex-1 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            ))}
          </div>

          {hoveredIndex !== null && chartData.data && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
              <p className="font-medium mb-1">{formatDate(chartData.data[hoveredIndex].date)}</p>
              <p className="text-emerald-400">{chartData.data[hoveredIndex].tasksCompleted} completed</p>
              <p className="text-blue-400">{chartData.data[hoveredIndex].tasksCreated} created</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {chartData.data && chartData.data.length > 0 && (
          <>
            <span>{formatDate(chartData.data[0].date)}</span>
            <span>{formatDate(chartData.data[chartData.data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function TimeLogChart({ data, loading }: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data.length) return { bars: [], maxValue: 0 };

    const recentData = data.slice(-14);
    const maxMinutes = Math.max(...recentData.map(d => d.minutes), 60);

    return {
      data: recentData,
      maxValue: maxMinutes
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">Time Logged</h3>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <div className="relative">
          <div
            className="flex items-end gap-1 h-40"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.data?.map((d, i) => {
              const heightPercent = chartData.maxValue > 0
                ? (d.minutes / chartData.maxValue) * 100
                : 0;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center cursor-pointer group"
                  onMouseEnter={() => setHoveredIndex(i)}
                >
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      hoveredIndex === i ? 'bg-cyan-500' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(heightPercent, 2)}%`,
                      minHeight: d.minutes > 0 ? '4px' : '2px'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {hoveredIndex !== null && chartData.data && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-10">
              <p className="font-medium">{formatDate(chartData.data[hoveredIndex].date)}</p>
              <p className="text-cyan-400">{formatTime(chartData.data[hoveredIndex].minutes)}</p>
            </div>
          )}

          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {chartData.data && chartData.data.length > 0 && (
              <>
                <span>{formatShortDate(chartData.data[0].date)}</span>
                <span>{formatShortDate(chartData.data[chartData.data.length - 1].date)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DonutChart({
  data,
  title,
  loading
}: {
  data: { label: string; value: number; color: string }[];
  title: string;
  loading: boolean;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return { segments: [], total: 0 };

    let currentAngle = -90;
    const segments = data.map((d, i) => {
      const percentage = (d.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      return {
        ...d,
        percentage,
        path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
        index: i
      };
    });

    return { segments, total };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-40 w-40 mx-auto bg-gray-100 rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>

      {chartData.total === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {chartData.segments.map((segment, i) => (
                <path
                  key={i}
                  d={segment.path}
                  fill={segment.color}
                  className={`transition-all duration-200 ${
                    hoveredSegment === i ? 'opacity-100' : 'opacity-80'
                  }`}
                  onMouseEnter={() => setHoveredSegment(i)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  style={{
                    transform: hoveredSegment === i ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: '50% 50%'
                  }}
                />
              ))}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900">{chartData.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {chartData.segments.map((segment, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  hoveredSegment === i ? 'bg-gray-50' : ''
                }`}
                onMouseEnter={() => setHoveredSegment(i)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-gray-600">{segment.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {segment.value} ({Math.round(segment.percentage)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
