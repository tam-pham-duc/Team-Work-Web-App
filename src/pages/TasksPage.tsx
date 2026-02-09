import { useState } from 'react';
import { Plus, Search, Filter, List, LayoutGrid, GanttChart, Clock, GitBranch, X, Settings } from 'lucide-react';
import { useTasks, useProjects } from '../hooks/useTasks';
import { useTaskStatuses } from '../hooks/useTaskStatuses';
import { useAuth } from '../contexts/AuthContext';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskKanbanView } from '../components/tasks/TaskKanbanView';
import { TaskGanttView } from '../components/tasks/TaskGanttView';
import { TaskTimelineView } from '../components/tasks/TaskTimelineView';
import { TaskMindMapView } from '../components/tasks/TaskMindMapView';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskStatusManager } from '../components/tasks/TaskStatusManager';
import * as taskService from '../services/taskService';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '../types/database';

type ViewMode = 'list' | 'kanban' | 'gantt' | 'timeline' | 'mindmap';

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'List', icon: List },
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { value: 'gantt', label: 'Gantt', icon: GanttChart },
  { value: 'timeline', label: 'Timeline', icon: Clock },
  { value: 'mindmap', label: 'Mind Map', icon: GitBranch },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TasksPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initialStatus, setInitialStatus] = useState<TaskStatus | undefined>();
  const [initialStatusId, setInitialStatusId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);

  const [filters, setFilters] = useState<taskService.TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { projects } = useProjects();
  const { tasks, loading, refetch } = useTasks({
    ...filters,
    search: searchQuery || undefined,
  });
  const {
    statuses,
    loading: statusesLoading,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
  } = useTaskStatuses();

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTaskId(task.id);
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus, statusId?: string) => {
    const statusRecord = statuses.find(s => s.id === statusId);
    const updates: Partial<TaskWithRelations> & { status_id?: string } = {
      status,
      status_id: statusId,
    };
    if (statusRecord?.is_completed_state) {
      updates.completed_at = new Date().toISOString();
    }
    await taskService.updateTask(taskId, updates);
    refetch();
  };

  const handleCreateTask = async (data: Partial<TaskWithRelations>) => {
    if (!user) return;
    await taskService.createTask({
      ...data,
      status_id: initialStatusId,
      created_by: user.id,
    } as taskService.TaskFilters & { created_by: string; status_id?: string });
    setShowCreateModal(false);
    setInitialStatus(undefined);
    setInitialStatusId(undefined);
    refetch();
  };

  const handleCreateFromKanban = (status: TaskStatus, statusId?: string) => {
    setInitialStatus(status);
    setInitialStatusId(statusId);
    setShowCreateModal(true);
  };

  const handleFilterChange = (key: keyof taskService.TaskFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)).length + (searchQuery ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">{tasks.length} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatusManager(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Statuses
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-gray-900 rounded">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title={option.label}
              >
                <option.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
              <select
                value={filters.projectId || ''}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => {
                  const baseSlug = s.slug.replace(/_\d+$/, '');
                  return (
                    <option key={s.id} value={baseSlug}>{s.name}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={filters.priority?.[0] || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value ? [e.target.value] : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="">All Priorities</option>
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
              <select
                value={filters.assigneeId || ''}
                onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="">All Assignees</option>
                <option value={user?.id}>Assigned to me</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading || statusesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      ) : (
        <div>
          {viewMode === 'list' && (
            <TaskListView
              tasks={tasks}
              statuses={statuses}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
            />
          )}
          {viewMode === 'kanban' && (
            <TaskKanbanView
              tasks={tasks}
              statuses={statuses}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
              onCreateTask={handleCreateFromKanban}
            />
          )}
          {viewMode === 'gantt' && (
            <TaskGanttView
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'timeline' && (
            <TaskTimelineView
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'mindmap' && (
            <TaskMindMapView
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={refetch}
          onDelete={refetch}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create New Task</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setInitialStatus(undefined);
                  setInitialStatusId(undefined);
                }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <TaskForm
                initialStatus={initialStatus}
                projectId={filters.projectId}
                onSubmit={handleCreateTask}
                onCancel={() => {
                  setShowCreateModal(false);
                  setInitialStatus(undefined);
                  setInitialStatusId(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showStatusManager && (
        <TaskStatusManager
          statuses={statuses}
          onClose={() => setShowStatusManager(false)}
          onCreate={createStatus}
          onUpdate={updateStatus}
          onDelete={deleteStatus}
          onReorder={reorderStatuses}
        />
      )}
    </div>
  );
}
