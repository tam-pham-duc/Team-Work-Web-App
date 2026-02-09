import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Trash2, Calendar, User, Tag, FolderKanban, Clock } from 'lucide-react';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '../../types/database';
import { TaskForm } from './TaskForm';
import { TaskComments } from './TaskComments';
import { TimeTracker } from './TimeTracker';
import { TaskDependencies } from './TaskDependencies';
import { TaskActivity } from './TaskActivity';
import * as taskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { useTaskStatuses } from '../../hooks/useTaskStatuses';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const COLOR_MAP: Record<string, { text: string; bg: string }> = {
  gray: { text: 'text-gray-700', bg: 'bg-gray-100' },
  blue: { text: 'text-blue-700', bg: 'bg-blue-100' },
  green: { text: 'text-green-700', bg: 'bg-green-100' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-100' },
  red: { text: 'text-red-700', bg: 'bg-red-100' },
  purple: { text: 'text-purple-700', bg: 'bg-purple-100' },
  teal: { text: 'text-teal-700', bg: 'bg-teal-100' },
  orange: { text: 'text-orange-700', bg: 'bg-orange-100' },
};

function getColorConfig(color: string) {
  return COLOR_MAP[color] || COLOR_MAP.gray;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

type Tab = 'details' | 'comments' | 'time' | 'activity';

export function TaskDetailModal({ taskId, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { statuses } = useTaskStatuses();
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [deleting, setDeleting] = useState(false);

  const loadTask = useCallback(async () => {
    const { data } = await taskService.fetchTaskById(taskId);
    if (data) {
      setTask(data as TaskWithRelations);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleUpdate = async (updates: Partial<TaskWithRelations>) => {
    await taskService.updateTask(taskId, updates);
    loadTask();
    onUpdate();
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    await taskService.deleteTask(taskId, user.id);
    onDelete();
    onClose();
  };

  const handleStatusChange = async (statusId: string) => {
    const statusRecord = statuses.find(s => s.id === statusId);
    if (!statusRecord) return;
    const baseSlug = statusRecord.slug.replace(/_\d+$/, '') as TaskStatus;
    const currentStatusRecord = statuses.find(s => s.id === task?.status_id) || statuses.find(s => {
      const slug = s.slug.replace(/_\d+$/, '');
      return slug === task?.status;
    });
    const updates: Record<string, unknown> = {
      status: baseSlug,
      status_id: statusId,
    };
    if (statusRecord.is_completed_state) {
      updates.completed_at = new Date().toISOString();
    } else if (currentStatusRecord?.is_completed_state) {
      updates.completed_at = null;
    }
    await taskService.updateTask(taskId, updates);
    loadTask();
    onUpdate();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const currentStatus = statuses.find(s => s.id === task?.status_id) || statuses.find(s => {
      const slug = s.slug.replace(/_\d+$/, '');
      return slug === task?.status;
    });
    if (currentStatus?.is_completed_state) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-pulse">
          <div className="h-16 bg-gray-100" />
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {(() => {
              const activeStatus = statuses.find(s => s.id === task.status_id) || statuses.find(s => {
                const slug = s.slug.replace(/_\d+$/, '');
                return slug === task.status;
              });
              const colors = getColorConfig(activeStatus?.color || 'gray');
              return (
                <select
                  value={activeStatus?.id || ''}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border-0 cursor-pointer ${colors.bg} ${colors.text}`}
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              );
            })()}
            <span className={`text-sm font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
              {PRIORITY_CONFIG[task.priority].label} Priority
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="flex-1 overflow-y-auto p-6">
            <TaskForm
              task={task}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
              {task.project && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <FolderKanban className="w-4 h-4" />
                  {task.project.name}
                </div>
              )}
            </div>

            <div className="flex border-b border-gray-200">
              {(['details', 'comments', 'time', 'activity'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {task.description || 'No description provided'}
                        </p>
                      </div>

                      {task.tags && task.tags.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {task.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <TaskDependencies
                        taskId={task.id}
                        projectId={task.project_id}
                        onUpdate={() => {
                          loadTask();
                          onUpdate();
                        }}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Due Date</p>
                            <p className={`text-sm font-medium ${
                              isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {formatDate(task.due_date)}
                              {isOverdue(task.due_date) && (
                                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                  Overdue
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Assignee</p>
                            {task.assignee ? (
                              <div className="flex items-center gap-2 mt-1">
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
                                <span className="text-sm font-medium text-gray-900">
                                  {task.assignee.full_name}
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Unassigned</p>
                            )}
                          </div>
                        </div>

                        {task.estimated_hours && (
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Estimated</p>
                              <p className="text-sm font-medium text-gray-900">
                                {task.estimated_hours} hours
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="text-sm text-gray-700">{formatDate(task.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'comments' && (
                  <TaskComments taskId={task.id} />
                )}

                {activeTab === 'time' && (
                  <TimeTracker
                    taskId={task.id}
                    taskTitle={task.title}
                    projectName={task.project?.name}
                    onTimeLogged={loadTask}
                  />
                )}

                {activeTab === 'activity' && (
                  <TaskActivity taskId={task.id} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
