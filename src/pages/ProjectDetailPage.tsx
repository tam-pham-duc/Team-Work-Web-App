import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Calendar, Plus, X, LayoutGrid, List, Settings } from 'lucide-react';
import { useProject, useProjectStats, useProjectTasks } from '../hooks/useProjects';
import { useTaskStatuses } from '../hooks/useTaskStatuses';
import { useAuth } from '../contexts/AuthContext';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectStats } from '../components/projects/ProjectStats';
import { TeamManagement } from '../components/projects/TeamManagement';
import { ProjectActivity } from '../components/projects/ProjectActivity';
import { TaskKanbanView } from '../components/tasks/TaskKanbanView';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskStatusManager } from '../components/tasks/TaskStatusManager';
import * as projectService from '../services/projectService';
import * as taskService from '../services/taskService';
import type { ProjectStatus, TaskStatus, TaskWithRelations } from '../types/database';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  on_hold: { label: 'On Hold', color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-blue-700', bg: 'bg-blue-100' },
  archived: { label: 'Archived', color: 'text-gray-700', bg: 'bg-gray-100' },
};

type Tab = 'tasks' | 'team' | 'activity';
type TaskViewMode = 'kanban' | 'list';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, loading, refetch } = useProject(id || null);
  const { stats, refetch: refetchStats } = useProjectStats(id || null);
  const { tasks, refetch: refetchTasks } = useProjectTasks(id || null);
  const {
    statuses,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
  } = useTaskStatuses();

  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('kanban');
  const [editing, setEditing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus | undefined>();
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 text-gray-900 hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[project.status];
  const isOwner = user?.id === project.owner_id;
  const currentMember = project.members?.find(m => m.user_id === user?.id);
  const canEdit = isOwner || currentMember?.role === 'admin';

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUpdate = async (updates: Partial<typeof project>) => {
    await projectService.updateProject(project.id, updates);
    refetch();
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    await projectService.deleteProject(project.id, user.id);
    navigate('/projects');
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    await projectService.updateProject(project.id, { status: newStatus });
    refetch();
  };

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTaskId(task.id);
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus, statusId?: string) => {
    const statusRecord = statuses.find(s => s.id === statusId);
    await taskService.updateTask(taskId, {
      status,
      status_id: statusId,
      completed_at: statusRecord?.is_completed_state ? new Date().toISOString() : null,
    });
    refetchTasks();
    refetchStats();
  };

  const handleCreateTask = async (data: Partial<TaskWithRelations>) => {
    if (!user) return;
    await taskService.createTask({
      ...data,
      project_id: project.id,
      created_by: user.id,
    } as Parameters<typeof taskService.createTask>[0]);
    setShowCreateTask(false);
    setInitialTaskStatus(undefined);
    refetchTasks();
    refetchStats();
  };

  const handleCreateFromKanban = (status: TaskStatus) => {
    setInitialTaskStatus(status);
    setShowCreateTask(true);
  };

  const refetchAll = () => {
    refetchTasks();
    refetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              disabled={!canEdit}
              className={`px-3 py-1 text-sm font-medium rounded-full border-0 cursor-pointer ${statusConfig.bg} ${statusConfig.color} disabled:cursor-default`}
            >
              {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          {project.description && (
            <p className="text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        {canEdit && (
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
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Start: {formatDate(project.start_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Due: {formatDate(project.end_date)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between border-b border-gray-200 flex-shrink-0">
              <div className="flex">
                {(['tasks', 'team', 'activity'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'tasks' && (
                <div className="flex items-center gap-2 pr-4">
                  <button
                    onClick={() => setShowStatusManager(true)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Manage Statuses"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setTaskViewMode('kanban')}
                      className={`p-1.5 rounded transition-colors ${
                        taskViewMode === 'kanban'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="Kanban"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskViewMode('list')}
                      className={`p-1.5 rounded transition-colors ${
                        taskViewMode === 'list'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Task
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col min-h-0">
              {activeTab === 'tasks' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No tasks yet</p>
                      <button
                        onClick={() => setShowCreateTask(true)}
                        className="mt-2 text-gray-900 hover:underline text-sm"
                      >
                        Create your first task
                      </button>
                    </div>
                  ) : taskViewMode === 'kanban' ? (
                    <TaskKanbanView
                      tasks={tasks as TaskWithRelations[]}
                      statuses={statuses}
                      onTaskClick={handleTaskClick}
                      onStatusChange={handleTaskStatusChange}
                      onCreateTask={handleCreateFromKanban}
                    />
                  ) : (
                    <TaskListView
                      tasks={tasks as TaskWithRelations[]}
                      statuses={statuses}
                      onTaskClick={handleTaskClick}
                      onStatusChange={handleTaskStatusChange}
                    />
                  )}
                </div>
              )}

              {activeTab === 'team' && project.members && (
                <TeamManagement
                  projectId={project.id}
                  members={project.members}
                  ownerId={project.owner_id}
                  onUpdate={refetch}
                />
              )}

              {activeTab === 'activity' && (
                <ProjectActivity projectId={project.id} />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {stats && <ProjectStats stats={stats} />}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Project</h2>
              <button
                onClick={() => setEditing(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ProjectForm
                project={project}
                onSubmit={handleUpdate}
                onCancel={() => setEditing(false)}
              />
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={refetchAll}
          onDelete={refetchAll}
        />
      )}

      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
              <button
                onClick={() => {
                  setShowCreateTask(false);
                  setInitialTaskStatus(undefined);
                }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <TaskForm
                projectId={project.id}
                initialStatus={initialTaskStatus}
                onSubmit={handleCreateTask}
                onCancel={() => {
                  setShowCreateTask(false);
                  setInitialTaskStatus(undefined);
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
