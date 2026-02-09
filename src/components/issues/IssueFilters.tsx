import {
  Filter,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  Ban,
  X
} from 'lucide-react';
import type { IssueStatus, IssueSeverity } from '../../types/database';
import type { IssueFilters } from '../../services/issueService';

interface IssueFiltersBarProps {
  filters: IssueFilters;
  onFiltersChange: (filters: IssueFilters) => void;
  projects: { id: string; name: string }[];
  users: { id: string; full_name: string }[];
}

const severityOptions: { value: IssueSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'wont_fix', label: "Won't Fix" }
];

export function IssueFiltersBar({
  filters,
  onFiltersChange,
  projects,
  users
}: IssueFiltersBarProps) {
  const hasActiveFilters = filters.status?.length || filters.severity?.length || filters.projectId || filters.assigneeId;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const toggleStatus = (status: IssueStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const toggleSeverity = (severity: IssueSeverity) => {
    const currentSeverities = filters.severity || [];
    const newSeverities = currentSeverities.includes(severity)
      ? currentSeverities.filter(s => s !== severity)
      : [...currentSeverities, severity];
    onFiltersChange({ ...filters, severity: newSeverities.length > 0 ? newSeverities : undefined });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Status:</span>
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => toggleStatus(option.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filters.status?.includes(option.value)
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200" />

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Severity:</span>
            {severityOptions.map(option => (
              <button
                key={option.value}
                onClick={() => toggleSeverity(option.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filters.severity?.includes(option.value)
                    ? option.value === 'critical' ? 'bg-red-600 text-white' :
                      option.value === 'high' ? 'bg-orange-500 text-white' :
                      option.value === 'medium' ? 'bg-amber-500 text-white' :
                      'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200" />

          <select
            value={filters.projectId || ''}
            onChange={(e) => onFiltersChange({ ...filters, projectId: e.target.value || undefined })}
            className="text-sm border-0 bg-gray-50 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          <select
            value={filters.assigneeId || ''}
            onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value || undefined })}
            className="text-sm border-0 bg-gray-50 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Assignees</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

interface IssueStatsProps {
  stats: {
    total: number;
    byStatus: Record<IssueStatus, number>;
    bySeverity: Record<IssueSeverity, number>;
  } | null;
  loading: boolean;
}

export function IssueStats({ stats, loading }: IssueStatsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const openCount = stats.byStatus.open + stats.byStatus.in_progress;
  const resolvedCount = stats.byStatus.resolved + stats.byStatus.closed;
  const criticalCount = stats.bySeverity.critical + stats.bySeverity.high;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">Total Issues</p>
        <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">Open</p>
        <p className="text-2xl font-semibold text-red-600">{openCount}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">Resolved</p>
        <p className="text-2xl font-semibold text-emerald-600">{resolvedCount}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">Critical / High</p>
        <p className="text-2xl font-semibold text-orange-600">{criticalCount}</p>
      </div>
    </div>
  );
}
