import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import * as taskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskStatus } from '../../types/database';

interface Dependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  depends_on?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

interface TaskDependenciesProps {
  taskId: string;
  projectId: string;
  onUpdate?: () => void;
}

const STATUS_ICONS: Record<TaskStatus, typeof CheckCircle2> = {
  todo: Clock,
  in_progress: Clock,
  review: AlertCircle,
  blocked: AlertCircle,
  completed: CheckCircle2,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-gray-400',
  in_progress: 'text-blue-500',
  review: 'text-amber-500',
  blocked: 'text-red-500',
  completed: 'text-green-500',
};

export function TaskDependencies({ taskId, projectId, onUpdate }: TaskDependenciesProps) {
  const { user } = useAuth();
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [dependents, setDependents] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string; status: TaskStatus }[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDependencies = useCallback(async () => {
    const [depsResult, dependentsResult] = await Promise.all([
      taskService.fetchTaskDependencies(taskId),
      taskService.fetchTaskDependents(taskId),
    ]);

    if (depsResult.data) {
      setDependencies(depsResult.data as Dependency[]);
    }
    if (dependentsResult.data) {
      setDependents(dependentsResult.data as Dependency[]);
    }
    setLoading(false);
  }, [taskId]);

  const loadAvailableTasks = useCallback(async () => {
    const { data } = await taskService.fetchTasks({ projectId });
    if (data) {
      const existingDeps = new Set(dependencies.map(d => d.depends_on_id));
      const filtered = data.filter(
        t => t.id !== taskId && !existingDeps.has(t.id)
      );
      setAvailableTasks(filtered.map(t => ({ id: t.id, title: t.title, status: t.status })));
    }
  }, [projectId, taskId, dependencies]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  useEffect(() => {
    if (showAddDependency) {
      loadAvailableTasks();
    }
  }, [showAddDependency, loadAvailableTasks]);

  const handleAddDependency = async () => {
    if (!selectedTaskId || !user) return;
    await taskService.addTaskDependency(taskId, selectedTaskId, user.id);
    setSelectedTaskId('');
    setShowAddDependency(false);
    loadDependencies();
    onUpdate?.();
  };

  const handleRemoveDependency = async (depId: string) => {
    await taskService.removeTaskDependency(depId);
    loadDependencies();
    onUpdate?.();
  };

  const filteredTasks = availableTasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasBlockingDependencies = dependencies.some(
    d => d.depends_on && d.depends_on.status !== 'completed'
  );

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Dependencies
        </h3>
      </div>

      {hasBlockingDependencies && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            This task has incomplete dependencies that must be completed first.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Depends On</h4>
            <button
              onClick={() => setShowAddDependency(!showAddDependency)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {showAddDependency && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No tasks available</p>
                ) : (
                  filteredTasks.map(task => {
                    const StatusIcon = STATUS_ICONS[task.status];
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm hover:bg-gray-100 transition-colors ${
                          selectedTaskId === task.id ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[task.status]}`} />
                        <span className="truncate">{task.title}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={handleAddDependency}
                  disabled={!selectedTaskId}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Dependency
                </button>
                <button
                  onClick={() => {
                    setShowAddDependency(false);
                    setSelectedTaskId('');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {dependencies.length === 0 ? (
            <p className="text-sm text-gray-500">No dependencies</p>
          ) : (
            <div className="space-y-1">
              {dependencies.map(dep => {
                if (!dep.depends_on) return null;
                const StatusIcon = STATUS_ICONS[dep.depends_on.status];
                return (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${STATUS_COLORS[dep.depends_on.status]}`} />
                      <span className="text-sm text-gray-700 truncate">{dep.depends_on.title}</span>
                      {dep.depends_on.status === 'completed' && (
                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          Done
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDependency(dep.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dependents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Blocks</h4>
            <div className="space-y-1">
              {dependents.map(dep => {
                if (!dep.task) return null;
                const StatusIcon = STATUS_ICONS[dep.task.status];
                return (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[dep.task.status]}`} />
                    <span className="text-sm text-gray-700 truncate">{dep.task.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
