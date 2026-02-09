import { Calendar, User, FolderKanban, RefreshCw } from 'lucide-react';
import type { ReportFilters } from '../../services/reportService';
import type { ReportType } from '../../hooks/useReports';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  reportType: ReportType;
  availableUsers: { id: string; full_name: string }[];
  availableProjects: { id: string; name: string }[];
  onRefresh: () => void;
  loading?: boolean;
}

const presetRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', preset: 'month' },
  { label: 'This quarter', preset: 'quarter' },
  { label: 'This year', preset: 'year' },
];

function getPresetDateRange(preset: string | number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  if (typeof preset === 'number') {
    start.setDate(end.getDate() - preset);
  } else {
    switch (preset) {
      case 'month':
        start.setDate(1);
        break;
      case 'quarter':
        const quarter = Math.floor(end.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
    }
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function ReportFiltersBar({
  filters,
  onFiltersChange,
  reportType,
  availableUsers,
  availableProjects,
  onRefresh,
  loading,
}: ReportFiltersBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value },
                })
              }
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <span className="self-center text-gray-400">to</span>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value },
                })
              }
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quick Select</label>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const preset = presetRanges.find(r => r.label === e.target.value);
              if (preset) {
                const range = getPresetDateRange(preset.days || preset.preset || 30);
                onFiltersChange({ ...filters, dateRange: range });
              }
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Select preset...</option>
            {presetRanges.map((range) => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {reportType === 'individual' && (
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              Team Member
            </label>
            <select
              value={filters.userId || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, userId: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select a user...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'project' && (
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FolderKanban className="w-4 h-4 inline mr-1" />
              Project
            </label>
            <select
              value={filters.projectId || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, projectId: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select a project...</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
