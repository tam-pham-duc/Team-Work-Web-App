import { useMemo } from 'react';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '../../types/database';
import { Calendar, User, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface TaskTimelineViewProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
  blocked: AlertCircle,
  completed: CheckCircle2,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-gray-400 bg-gray-100',
  in_progress: 'text-blue-500 bg-blue-100',
  review: 'text-amber-500 bg-amber-100',
  blocked: 'text-red-500 bg-red-100',
  completed: 'text-green-500 bg-green-100',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'border-gray-300',
  medium: 'border-blue-300',
  high: 'border-orange-300',
  urgent: 'border-red-300',
};

interface GroupedTasks {
  date: string;
  label: string;
  tasks: TaskWithRelations[];
}

export function TaskTimelineView({ tasks, onTaskClick }: TaskTimelineViewProps) {
  const groupedByDate = useMemo(() => {
    const groups: Record<string, TaskWithRelations[]> = {};

    tasks.forEach(task => {
      const date = task.due_date
        ? new Date(task.due_date).toDateString()
        : 'No due date';
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });

    const sortedGroups: GroupedTasks[] = Object.entries(groups)
      .map(([date, tasks]) => ({
        date,
        label: date === 'No due date' ? date : formatDateLabel(new Date(date)),
        tasks: tasks.sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
      }))
      .sort((a, b) => {
        if (a.date === 'No due date') return 1;
        if (b.date === 'No due date') return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    return sortedGroups;
  }, [tasks]);

  function formatDateLabel(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const isPast = (dateStr: string) => {
    if (dateStr === 'No due date') return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-8">
        {groupedByDate.map(group => (
          <div key={group.date} className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                  isPast(group.date) ? 'bg-gray-100' : 'bg-white border-2 border-gray-200'
                }`}
              >
                <Calendar className={`w-5 h-5 ${isPast(group.date) ? 'text-gray-400' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${isPast(group.date) ? 'text-gray-500' : 'text-gray-900'}`}>
                  {group.label}
                </h3>
                <p className="text-sm text-gray-500">{group.tasks.length} tasks</p>
              </div>
            </div>

            <div className="ml-16 space-y-3">
              {group.tasks.map(task => {
                const StatusIcon = STATUS_ICONS[task.status];
                const overdue = isOverdue(task.due_date, task.status);

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white rounded-lg border-l-4 border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      PRIORITY_COLORS[task.priority]
                    } ${overdue ? 'border-r border-t border-b border-red-200' : 'border-r border-t border-b border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${STATUS_COLORS[task.status]}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {overdue && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                        {task.assignee && (
                          <div className="flex items-center gap-1.5">
                            {task.assignee.avatar_url ? (
                              <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.full_name}
                                className="w-7 h-7 rounded-full"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {groupedByDate.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tasks to display
          </div>
        )}
      </div>
    </div>
  );
}
