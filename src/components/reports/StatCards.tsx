import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from './Charts';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  sparklineData?: number[];
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  default: 'bg-white',
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
};

export function StatCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  sparklineData,
  color = 'default',
}: StatCardProps) {
  return (
    <div className={`p-5 rounded-xl border border-gray-200 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-0.5">{subValue}</p>}
        </div>
        {icon && <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>}
      </div>

      {(trend !== undefined || sparklineData) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
              {trendLabel && <span className="text-gray-400 font-normal ml-1">{trendLabel}</span>}
            </div>
          )}
          {sparklineData && (
            <Sparkline
              data={sparklineData}
              color={trend && trend > 0 ? '#10b981' : trend && trend < 0 ? '#ef4444' : '#6b7280'}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatGrid({ children, columns = 4 }: StatGridProps) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={`grid gap-4 ${colClasses[columns]}`}>{children}</div>;
}

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function MiniStat({ label, value, color = '#3b82f6' }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
