import { useDashboard } from '../hooks/useDashboard';
import {
  StatCards,
  TaskBreakdownCard,
  ProjectBreakdownCard,
  ProductivityChart,
  TimeLogChart,
  DonutChart,
  DashboardFiltersBar,
  TeamStatsTable,
  TeamStatsCards
} from '../components/dashboard';
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';

export function DashboardPage() {
  const {
    taskStats,
    projectStats,
    timeStats,
    productivityTrends,
    teamStats,
    filters,
    setFilters,
    filterOptions,
    loading,
    error,
    refetch,
    isAdmin
  } = useDashboard();

  const taskDonutData = taskStats ? [
    { label: 'To Do', value: taskStats.todo, color: '#9ca3af' },
    { label: 'In Progress', value: taskStats.in_progress, color: '#3b82f6' },
    { label: 'Review', value: taskStats.review, color: '#f59e0b' },
    { label: 'Completed', value: taskStats.completed, color: '#10b981' },
    { label: 'Blocked', value: taskStats.blocked, color: '#ef4444' }
  ].filter(d => d.value > 0) : [];

  const projectDonutData = projectStats ? [
    { label: 'Active', value: projectStats.active, color: '#10b981' },
    { label: 'On Hold', value: projectStats.on_hold, color: '#f59e0b' },
    { label: 'Completed', value: projectStats.completed, color: '#3b82f6' },
    { label: 'Archived', value: projectStats.archived, color: '#9ca3af' }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Team productivity overview' : 'Your productivity metrics'}
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <DashboardFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        projects={filterOptions.projects}
        teamMembers={filterOptions.teamMembers}
        isAdmin={isAdmin}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading dashboard</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <StatCards
        taskStats={taskStats}
        projectStats={projectStats}
        timeStats={timeStats}
        loading={loading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProductivityChart data={productivityTrends} loading={loading} />
        <TimeLogChart data={timeStats?.byDay || []} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart data={taskDonutData} title="Tasks by Status" loading={loading} />
        <DonutChart data={projectDonutData} title="Projects by Status" loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TaskBreakdownCard taskStats={taskStats} loading={loading} />
        <ProjectBreakdownCard projectStats={projectStats} loading={loading} />
      </div>

      {isAdmin && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
          <TeamStatsCards data={teamStats} loading={loading} />
          <TeamStatsTable data={teamStats} loading={loading} />
        </div>
      )}
    </div>
  );
}
