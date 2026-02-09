import { Link } from 'react-router-dom';
import { Clock, AlertCircle, PlayCircle, ChevronRight } from 'lucide-react';
import type { TodayTasksData } from '../../services/homeService';
import type { TaskWithRelations } from '../../types/database';

interface TodayOverviewProps {
  data: TodayTasksData | null;
  loading: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600'
};

function TaskItem({ task }: { task: TaskWithRelations }) {
  return (
    <Link
      to={`/tasks?task=${task.id}`}
      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          {task.project && (
            <p className="text-xs text-gray-500 truncate">{task.project.name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function TaskSection({
  title,
  icon: Icon,
  tasks,
  emptyMessage,
  variant = 'default'
}: {
  title: string;
  icon: typeof Clock;
  tasks: TaskWithRelations[];
  emptyMessage: string;
  variant?: 'default' | 'warning' | 'active';
}) {
  const variantStyles = {
    default: 'bg-gray-50 border-gray-100',
    warning: 'bg-red-50/50 border-red-100',
    active: 'bg-emerald-50/50 border-emerald-100'
  };

  const iconStyles = {
    default: 'text-gray-600 bg-white',
    warning: 'text-red-600 bg-red-100',
    active: 'text-emerald-600 bg-emerald-100'
  };

  const countStyles = {
    default: 'bg-gray-200 text-gray-700',
    warning: 'bg-red-200 text-red-700',
    active: 'bg-emerald-200 text-emerald-700'
  };

  return (
    <div className={`rounded-xl border p-4 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconStyles[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${countStyles[variant]}`}>
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 py-2 text-center">{emptyMessage}</p>
        ) : (
          tasks.slice(0, 3).map(task => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
        {tasks.length > 3 && (
          <Link
            to="/tasks"
            className="block text-center text-sm text-gray-600 hover:text-gray-900 py-2"
          >
            View all {tasks.length} tasks
          </Link>
        )}
      </div>
    </div>
  );
}

export function TodayOverview({ data, loading }: TodayOverviewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Today's Focus</h2>
        <Link
          to="/tasks"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          All tasks
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TaskSection
          title="Due Today"
          icon={Clock}
          tasks={data?.dueTodayTasks || []}
          emptyMessage="No tasks due today"
          variant="default"
        />
        <TaskSection
          title="Overdue"
          icon={AlertCircle}
          tasks={data?.overdueTasks || []}
          emptyMessage="No overdue tasks"
          variant="warning"
        />
        <TaskSection
          title="In Progress"
          icon={PlayCircle}
          tasks={data?.inProgressTasks || []}
          emptyMessage="No tasks in progress"
          variant="active"
        />
      </div>
    </div>
  );
}
