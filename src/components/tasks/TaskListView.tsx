import { useState, useEffect, useCallback } from 'react';
import type { TaskWithRelations, TaskStatus, TaskPriority, TaskStatusRecord } from '../../types/database';
import { Calendar, User, Tag, ChevronDown, ChevronRight, GripVertical, Play } from 'lucide-react';
import { useTimeTracker } from '../../contexts/TimeTrackerContext';
import { useAuth } from '../../contexts/AuthContext';
import * as taskService from '../../services/taskService';

interface TaskListViewProps {
  tasks: TaskWithRelations[];
  statuses: TaskStatusRecord[];
  onTaskClick: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: TaskStatus, statusId?: string) => void;
}

const COLOR_BG_MAP: Record<string, { bg: string; text: string; dropBg: string; dropBorder: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', dropBg: 'bg-gray-50', dropBorder: 'border-gray-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', dropBg: 'bg-blue-50', dropBorder: 'border-blue-400' },
  green: { bg: 'bg-green-100', text: 'text-green-700', dropBg: 'bg-green-50', dropBorder: 'border-green-400' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', dropBg: 'bg-amber-50', dropBorder: 'border-amber-400' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dropBg: 'bg-red-50', dropBorder: 'border-red-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dropBg: 'bg-purple-50', dropBorder: 'border-purple-400' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', dropBg: 'bg-teal-50', dropBorder: 'border-teal-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', dropBg: 'bg-orange-50', dropBorder: 'border-orange-400' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

export function TaskListView({ tasks, statuses, onTaskClick, onStatusChange }: TaskListViewProps) {
  const { user } = useAuth();
  const { openTracker } = useTimeTracker();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    statuses.forEach(s => {
      initialExpanded[s.id] = !s.is_completed_state;
    });
    setExpandedGroups(prev => {
      const hasValues = Object.keys(prev).length > 0;
      return hasValues ? prev : initialExpanded;
    });
  }, [statuses]);

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

  const getTasksForStatus = (statusRecord: TaskStatusRecord) => {
    return tasks.filter(t => {
      if (t.status_id === statusRecord.id) return true;
      const baseSlug = statusRecord.slug.replace(/_\d+$/, '');
      return t.status === baseSlug || t.status === statusRecord.slug;
    });
  };

  const toggleGroup = (statusId: string) => {
    setExpandedGroups(prev => ({ ...prev, [statusId]: !prev[statusId] }));
  };

  const getColorConfig = (color: string) => {
    return COLOR_BG_MAP[color] || COLOR_BG_MAP.gray;
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const handleDragStart = useCallback((e: React.DragEvent, task: TaskWithRelations) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverGroupId(null);
  }, []);

  const handleGroupDragOver = useCallback((e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(statusId);
  }, []);

  const handleGroupDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setDragOverGroupId(null);
  }, []);

  const handleGroupDrop = useCallback((e: React.DragEvent, statusRecord: TaskStatusRecord) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      const alreadyInStatus = task?.status_id === statusRecord.id;
      if (!alreadyInStatus) {
        const baseSlug = statusRecord.slug.replace(/_\d+$/, '') as TaskStatus;
        onStatusChange(taskId, baseSlug, statusRecord.id);
      }
    }
    setDraggedTaskId(null);
    setDragOverGroupId(null);
  }, [tasks, onStatusChange]);

  return (
    <div className="space-y-3">
      {statuses.map(statusRecord => {
        const statusTasks = getTasksForStatus(statusRecord);
        const isExpanded = expandedGroups[statusRecord.id];
        const colorConfig = getColorConfig(statusRecord.color);
        const isDragOver = dragOverGroupId === statusRecord.id;
        const isDragging = draggedTaskId !== null;

        return (
          <div
            key={statusRecord.id}
            className={`bg-white rounded-lg border-2 overflow-hidden transition-all duration-200 ${
              isDragOver
                ? `${colorConfig.dropBorder} ${colorConfig.dropBg} shadow-md ring-1 ring-opacity-30 ${colorConfig.dropBorder.replace('border-', 'ring-')}`
                : isDragging
                  ? 'border-gray-200 border-dashed'
                  : 'border-gray-200 border-solid'
            }`}
            onDragOver={(e) => handleGroupDragOver(e, statusRecord.id)}
            onDragLeave={handleGroupDragLeave}
            onDrop={(e) => handleGroupDrop(e, statusRecord)}
          >
            <button
              onClick={() => toggleGroup(statusRecord.id)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                isDragOver ? colorConfig.dropBg : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorConfig.bg} ${colorConfig.text}`}>
                  {statusRecord.name}
                </span>
                <span className="text-sm text-gray-500">{statusTasks.length} tasks</span>
              </div>
              {isDragOver && (
                <span className={`text-xs font-medium ${colorConfig.text} animate-pulse`}>
                  Drop to move here
                </span>
              )}
            </button>

            {isExpanded && statusTasks.length > 0 && (
              <div className="border-t border-gray-100">
                {statusTasks.map(task => {
                  const isBeingDragged = draggedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick(task)}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer transition-all group ${
                        isBeingDragged
                          ? 'opacity-40 bg-gray-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <GripVertical className={`w-4 h-4 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing ${
                        isBeingDragged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`} />

                      <select
                        value={task.status_id || task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          const selectedStatus = statuses.find(s => s.id === e.target.value);
                          if (selectedStatus) {
                            const baseSlug = selectedStatus.slug.replace(/_\d+$/, '') as TaskStatus;
                            onStatusChange(task.id, baseSlug, selectedStatus.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer flex-shrink-0 ${colorConfig.bg} ${colorConfig.text}`}
                      >
                        {statuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-gray-500 truncate">{task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm flex-shrink-0">
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-500">{task.tags.length}</span>
                          </div>
                        )}

                        <span className={`text-xs font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>

                        {task.due_date && (
                          <div className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600' : 'text-gray-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs">{formatDate(task.due_date)}</span>
                          </div>
                        )}

                        {task.assignee && (
                          <div className="flex items-center gap-1.5">
                            {task.assignee.avatar_url ? (
                              <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.full_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={(e) => handleStartTimer(e, task)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="Start Timer"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isExpanded && statusTasks.length === 0 && (
              <div className={`px-4 py-6 text-center text-sm border-t border-gray-100 transition-colors ${
                isDragOver ? `${colorConfig.text} font-medium` : 'text-gray-500'
              }`}>
                {isDragOver ? 'Drop task here' : 'No tasks'}
              </div>
            )}

            {!isExpanded && isDragOver && (
              <div className={`px-4 py-4 text-center text-sm font-medium border-t ${colorConfig.text} ${colorConfig.dropBg}`}>
                Drop to move here
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
