import { useState, useMemo } from 'react';
import type { TaskWithRelations, TaskStatus, TaskPriority, TaskStatusRecord } from '../../types/database';
import { Calendar, User, Plus, Play, X } from 'lucide-react';
import { useTimeTracker } from '../../contexts/TimeTrackerContext';
import { useAuth } from '../../contexts/AuthContext';
import * as taskService from '../../services/taskService';

interface TaskKanbanViewProps {
  tasks: TaskWithRelations[];
  statuses: TaskStatusRecord[];
  onTaskClick: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: TaskStatus, statusId?: string) => void;
  onCreateTask?: (status: TaskStatus, statusId?: string) => void;
}

const COLOR_BORDER_MAP: Record<string, string> = {
  gray: 'border-gray-300',
  blue: 'border-blue-400',
  green: 'border-green-400',
  amber: 'border-amber-400',
  red: 'border-red-400',
  purple: 'border-purple-400',
  teal: 'border-teal-400',
  orange: 'border-orange-400',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export function TaskKanbanView({ tasks, statuses, onTaskClick, onStatusChange, onCreateTask }: TaskKanbanViewProps) {
  const { user } = useAuth();
  const { openTracker } = useTimeTracker();
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatusId, setFilterStatusId] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string }>();
    tasks.forEach(t => {
      if (t.assignee) map.set(t.assignee.id, { id: t.assignee.id, full_name: t.assignee.full_name });
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tasks]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => set.add(tag)));
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterAssignee && t.assignee?.id !== filterAssignee) return false;
      if (filterTag && (!t.tags || !t.tags.includes(filterTag))) return false;
      return true;
    });
  }, [tasks, filterAssignee, filterTag]);

  const visibleStatuses = useMemo(() => {
    if (!filterStatusId) return statuses;
    return statuses.filter(s => s.id === filterStatusId);
  }, [statuses, filterStatusId]);

  const hasActiveFilters = filterAssignee || filterStatusId || filterTag;

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterStatusId('');
    setFilterTag('');
  };

  const handleStartTimer = async (e: React.MouseEvent, task: TaskWithRelations) => {
    e.stopPropagation();
    if (!user) return;
    await taskService.startTimeLog(task.id, user.id);
    openTracker({
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.project?.name,
    });
  };

  const getTasksByStatusId = (statusId: string, statusSlug: string) => {
    return filteredTasks.filter(t => {
      if (t.status_id === statusId) return true;
      const baseSlug = statusSlug.replace(/_\d+$/, '');
      return t.status === baseSlug || t.status === statusSlug;
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const handleDragStart = (e: React.DragEvent, task: TaskWithRelations) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    setDragOverColumn(statusId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, statusRecord: TaskStatusRecord) => {
    e.preventDefault();
    if (draggedTask) {
      const baseSlug = statusRecord.slug.replace(/_\d+$/, '') as TaskStatus;
      onStatusChange(draggedTask.id, baseSlug, statusRecord.id);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs bg-gray-100 border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none cursor-pointer"
        >
          <option value="">All Assignees</option>
          {uniqueAssignees.map(a => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
          ))}
        </select>
        <select
          value={filterStatusId}
          onChange={(e) => setFilterStatusId(e.target.value)}
          className="text-xs bg-gray-100 border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          {statuses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="text-xs bg-gray-100 border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none cursor-pointer"
        >
          <option value="">All Tags</option>
          {uniqueTags.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 flex-1 min-h-0">
        {visibleStatuses.map(column => {
          const columnTasks = getTasksByStatusId(column.id, column.slug);
          const isDragOver = dragOverColumn === column.id;
          const borderColor = COLOR_BORDER_MAP[column.color] || 'border-gray-300';

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-64 bg-gray-50 rounded-lg border-t-2 flex flex-col ${borderColor}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column)}
            >
              <div className="px-2.5 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-medium text-gray-900 text-sm">{column.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>
                {onCreateTask && (
                  <button
                    onClick={() => {
                      const baseSlug = column.slug.replace(/_\d+$/, '') as TaskStatus;
                      onCreateTask(baseSlug, column.id);
                    }}
                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              <div
                className={`px-1.5 pb-1.5 space-y-1.5 flex-1 overflow-y-auto transition-colors ${
                  isDragOver ? 'bg-blue-50' : ''
                }`}
              >
                {columnTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white rounded-lg border border-gray-200 p-2.5 cursor-pointer hover:shadow-md transition-all group ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <h4 className="font-medium text-gray-900 text-xs leading-snug line-clamp-2">{task.title}</h4>
                      <button
                        onClick={(e) => handleStartTimer(e, task)}
                        className="p-0.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                        title="Start Timer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                    )}

                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {task.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] leading-tight px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{task.tags.length - 2}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] leading-tight px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span
                            className={`text-[10px] flex items-center gap-0.5 ${
                              isOverdue(task.due_date, task.status) ? 'text-red-600' : 'text-gray-500'
                            }`}
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>

                      {task.assignee && (
                        <div className="flex items-center">
                          {task.assignee.avatar_url ? (
                            <img
                              src={task.assignee.avatar_url}
                              alt={task.assignee.full_name}
                              className="w-5 h-5 rounded-full"
                              title={task.assignee.full_name}
                            />
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"
                              title={task.assignee.full_name}
                            >
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
