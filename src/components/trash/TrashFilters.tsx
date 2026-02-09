import { ListTodo, FolderKanban, FileText, AlertTriangle, X } from 'lucide-react';
import type { TrashEntityType } from '../../types/database';
import type { TrashFilters, TrashStats } from '../../services/trashService';

interface TrashFiltersBarProps {
  filters: TrashFilters;
  onFiltersChange: (filters: TrashFilters) => void;
  stats: TrashStats;
}

const entityTypes: { type: TrashEntityType; label: string; icon: typeof ListTodo }[] = [
  { type: 'task', label: 'Tasks', icon: ListTodo },
  { type: 'project', label: 'Projects', icon: FolderKanban },
  { type: 'document', label: 'Documents', icon: FileText },
  { type: 'issue', label: 'Issues', icon: AlertTriangle },
];

export function TrashFiltersBar({ filters, onFiltersChange, stats }: TrashFiltersBarProps) {
  const hasActiveFilters = filters.entityType || filters.dateRange;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => onFiltersChange({ ...filters, entityType: undefined })}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            !filters.entityType
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({stats.total})
        </button>
        {entityTypes.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() =>
              onFiltersChange({
                ...filters,
                entityType: filters.entityType === type ? undefined : type,
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filters.entityType === type
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label} ({stats.byType[type]})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filters.dateRange ? 'custom' : ''}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              onFiltersChange({ ...filters, dateRange: undefined });
              return;
            }

            const now = new Date();
            const start = new Date();

            switch (value) {
              case 'today':
                start.setHours(0, 0, 0, 0);
                break;
              case 'week':
                start.setDate(now.getDate() - 7);
                break;
              case 'month':
                start.setMonth(now.getMonth() - 1);
                break;
              default:
                return;
            }

            onFiltersChange({
              ...filters,
              dateRange: {
                start: start.toISOString(),
                end: now.toISOString(),
              },
            });
          }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange({})}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Clear filters
        </button>
      )}
    </div>
  );
}

interface TrashStatsCardProps {
  stats: TrashStats;
  retentionDays: number;
  loading?: boolean;
}

export function TrashStatsCard({ stats, retentionDays, loading }: TrashStatsCardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="w-16 h-4 bg-gray-200 rounded mb-2" />
            <div className="w-10 h-8 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Total in Trash</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Retention Period</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{retentionDays} days</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Expiring Soon</p>
        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringSoon}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Categories</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
            {stats.byType.task} tasks
          </span>
          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
            {stats.byType.project} projects
          </span>
        </div>
      </div>
    </div>
  );
}
