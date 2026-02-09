import { Filter, Calendar, FolderKanban, Users } from 'lucide-react';
import type { DashboardFilters } from '../../services/dashboardService';

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  projects: { id: string; name: string }[];
  teamMembers: { id: string; name: string }[];
  isAdmin: boolean;
}

const dateRangeOptions: { value: DashboardFilters['dateRange']; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 90 days' },
  { value: 'year', label: 'Last year' }
];

export function DashboardFiltersBar({
  filters,
  onFiltersChange,
  projects,
  teamMembers,
  isAdmin
}: DashboardFiltersProps) {
  const handleDateRangeChange = (dateRange: DashboardFilters['dateRange']) => {
    onFiltersChange({ ...filters, dateRange });
  };

  const handleProjectChange = (projectId: string) => {
    onFiltersChange({
      ...filters,
      projectId: projectId || undefined
    });
  };

  const handleUserChange = (userId: string) => {
    onFiltersChange({
      ...filters,
      userId: userId || undefined
    });
  };

  const hasActiveFilters = filters.projectId || filters.userId;

  const clearFilters = () => {
    onFiltersChange({
      dateRange: 'month',
      projectId: undefined,
      userId: undefined
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={filters.dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as DashboardFilters['dateRange'])}
              className="text-sm border-0 bg-gray-50 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-gray-900 focus:bg-white"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-gray-400" />
            <select
              value={filters.projectId || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="text-sm border-0 bg-gray-50 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-gray-900 focus:bg-white"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && teamMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={filters.userId || ''}
                onChange={(e) => handleUserChange(e.target.value)}
                className="text-sm border-0 bg-gray-50 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-gray-900 focus:bg-white"
              >
                <option value="">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
