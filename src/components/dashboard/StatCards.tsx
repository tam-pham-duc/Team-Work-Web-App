import { CheckCircle2, Clock, FolderKanban, ListTodo, AlertCircle, Loader2, Timer } from 'lucide-react';
import type { TaskStatusStats, ProjectStatusStats, TimeLogStats } from '../../services/dashboardService';

interface StatCardsProps {
  taskStats: TaskStatusStats | null;
  projectStats: ProjectStatusStats | null;
  timeStats: TimeLogStats | null;
  loading: boolean;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  loading
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          )}
          {subtitle && !loading && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export function StatCards({ taskStats, projectStats, timeStats, loading }: StatCardsProps) {
  const completionRate = taskStats && taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Tasks"
        value={taskStats?.total || 0}
        subtitle={`${taskStats?.in_progress || 0} in progress`}
        icon={ListTodo}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        loading={loading}
      />

      <StatCard
        title="Completed Tasks"
        value={taskStats?.completed || 0}
        subtitle={`${completionRate}% completion rate`}
        icon={CheckCircle2}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        loading={loading}
      />

      <StatCard
        title="Active Projects"
        value={projectStats?.active || 0}
        subtitle={`${projectStats?.completed || 0} completed`}
        icon={FolderKanban}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        loading={loading}
      />

      <StatCard
        title="Time Logged"
        value={formatTime(timeStats?.month || 0)}
        subtitle={`${formatTime(timeStats?.today || 0)} today`}
        icon={Timer}
        iconBg="bg-cyan-50"
        iconColor="text-cyan-600"
        loading={loading}
      />
    </div>
  );
}

export function TaskBreakdownCard({
  taskStats,
  loading
}: {
  taskStats: TaskStatusStats | null;
  loading: boolean;
}) {
  const statuses = [
    { key: 'todo', label: 'To Do', color: 'bg-gray-400' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
    { key: 'review', label: 'Review', color: 'bg-amber-500' },
    { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
    { key: 'blocked', label: 'Blocked', color: 'bg-red-500' }
  ] as const;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const total = taskStats?.total || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">Task Breakdown</h3>
      </div>

      <div className="space-y-3">
        {statuses.map(({ key, label, color }) => {
          const count = taskStats?.[key] || 0;
          const percentage = Math.round((count / total) * 100);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`${color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectBreakdownCard({
  projectStats,
  loading
}: {
  projectStats: ProjectStatusStats | null;
  loading: boolean;
}) {
  const statuses = [
    { key: 'active', label: 'Active', color: 'bg-emerald-500' },
    { key: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
    { key: 'completed', label: 'Completed', color: 'bg-blue-500' },
    { key: 'archived', label: 'Archived', color: 'bg-gray-400' }
  ] as const;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const total = projectStats?.total || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FolderKanban className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">Project Status</h3>
      </div>

      <div className="space-y-3">
        {statuses.map(({ key, label, color }) => {
          const count = projectStats?.[key] || 0;
          const percentage = Math.round((count / total) * 100);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`${color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
