import { useAuth } from '../contexts/AuthContext';
import { useHome } from '../hooks/useHome';
import {
  TodayOverview,
  TimeTrackingCard,
  ActiveProjectsCard,
  QuickActions,
  NotificationsCard
} from '../components/home';
import { AlertCircle, RefreshCw } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

export function HomePage() {
  const { user } = useAuth();
  const {
    todayTasks,
    timeTracking,
    activeProjects,
    notifications,
    loading,
    error,
    refetch,
    stopTimer
  } = useHome();

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
            {formatDate()}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <TodayOverview data={todayTasks} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ActiveProjectsCard projects={activeProjects} loading={loading} />
          <QuickActions
            activeTimer={timeTracking?.activeTimer || null}
            onStopTimer={stopTimer}
          />
        </div>
        <div className="space-y-6">
          <TimeTrackingCard
            data={timeTracking}
            loading={loading}
            onStopTimer={stopTimer}
          />
          <NotificationsCard notifications={notifications} loading={loading} />
        </div>
      </div>
    </div>
  );
}
