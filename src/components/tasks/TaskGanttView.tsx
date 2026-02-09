import { useMemo } from 'react';
import type { TaskWithRelations, TaskStatus } from '../../types/database';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TaskGanttViewProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  blocked: 'bg-red-500',
  completed: 'bg-green-500',
};

export function TaskGanttView({ tasks, onTaskClick }: TaskGanttViewProps) {
  const [viewStart, setViewStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today;
  });

  const daysToShow = 28;

  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(viewStart);
      date.setDate(date.getDate() + i);
      result.push(date);
    }
    return result;
  }, [viewStart, daysToShow]);

  const tasksWithDates = tasks.filter(t => t.due_date || t.created_at);

  const getTaskPosition = (task: TaskWithRelations) => {
    const startDate = new Date(task.created_at);
    const endDate = task.due_date ? new Date(task.due_date) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const viewStartTime = viewStart.getTime();
    const viewEndTime = dates[dates.length - 1].getTime();
    const dayWidth = 100 / daysToShow;

    const taskStart = Math.max(startDate.getTime(), viewStartTime);
    const taskEnd = Math.min(endDate.getTime(), viewEndTime);

    if (taskEnd < viewStartTime || taskStart > viewEndTime) {
      return null;
    }

    const startOffset = ((taskStart - viewStartTime) / (1000 * 60 * 60 * 24)) * dayWidth;
    const width = ((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) * dayWidth;

    return {
      left: `${Math.max(0, startOffset)}%`,
      width: `${Math.max(dayWidth, width)}%`,
    };
  };

  const navigateDays = (days: number) => {
    setViewStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setViewStart(today);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const formatDay = (date: Date) => {
    return date.getDate();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDays(-7)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateDays(7)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {dates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-gray-200">
            <div className="w-64 flex-shrink-0 p-3 bg-gray-50 font-medium text-sm text-gray-700 border-r border-gray-200">
              Task
            </div>
            <div className="flex-1 flex">
              {dates.map((date, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center py-2 text-xs border-r border-gray-100 last:border-r-0 ${
                    isWeekend(date) ? 'bg-gray-50' : ''
                  } ${isToday(date) ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-gray-400">{formatMonth(date)}</div>
                  <div className={`font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-700'}`}>
                    {formatDay(date)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {tasksWithDates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tasks with dates to display
            </div>
          ) : (
            tasksWithDates.map(task => {
              const position = getTaskPosition(task);

              return (
                <div
                  key={task.id}
                  className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div
                    onClick={() => onTaskClick(task)}
                    className="w-64 flex-shrink-0 p-3 border-r border-gray-200 cursor-pointer"
                  >
                    <p className="font-medium text-sm text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 truncate">{task.project?.name}</p>
                  </div>
                  <div className="flex-1 relative h-14">
                    <div className="absolute inset-0 flex">
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={`flex-1 border-r border-gray-50 last:border-r-0 ${
                            isWeekend(date) ? 'bg-gray-50/50' : ''
                          } ${isToday(date) ? 'bg-blue-50/50' : ''}`}
                        />
                      ))}
                    </div>
                    {position && (
                      <div
                        onClick={() => onTaskClick(task)}
                        className={`absolute top-3 h-8 rounded cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[task.status]}`}
                        style={{ left: position.left, width: position.width }}
                        title={task.title}
                      >
                        <span className="px-2 text-xs text-white font-medium truncate block leading-8">
                          {task.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
