import { useMemo, useState } from 'react';
import type { TaskWithRelations, TaskStatus, Project } from '../../types/database';
import { ChevronDown, ChevronRight, FolderKanban, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface TaskMindMapViewProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: typeof Circle; color: string; bg: string }> = {
  todo: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100' },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
  review: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100' },
  blocked: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
};

interface ProjectNode {
  project: { id: string; name: string };
  tasks: TaskWithRelations[];
  statusGroups: Record<TaskStatus, TaskWithRelations[]>;
}

export function TaskMindMapView({ tasks, onTaskClick }: TaskMindMapViewProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());

  const projectNodes = useMemo(() => {
    const projectMap = new Map<string, ProjectNode>();

    tasks.forEach(task => {
      const projectId = task.project_id;
      const projectName = task.project?.name || 'Unknown Project';

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          project: { id: projectId, name: projectName },
          tasks: [],
          statusGroups: {
            todo: [],
            in_progress: [],
            review: [],
            blocked: [],
            completed: [],
          },
        });
      }

      const node = projectMap.get(projectId)!;
      node.tasks.push(task);
      node.statusGroups[task.status].push(task);
    });

    return Array.from(projectMap.values()).sort((a, b) =>
      a.project.name.localeCompare(b.project.name)
    );
  }, [tasks]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleStatus = (key: string) => {
    setExpandedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allProjects = new Set(projectNodes.map(p => p.project.id));
    const allStatuses = new Set<string>();
    projectNodes.forEach(p => {
      Object.keys(p.statusGroups).forEach(status => {
        allStatuses.add(`${p.project.id}-${status}`);
      });
    });
    setExpandedProjects(allProjects);
    setExpandedStatuses(allStatuses);
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
    setExpandedStatuses(new Set());
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-medium text-gray-900">Task Mind Map</h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {projectNodes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tasks to display
        </div>
      ) : (
        <div className="space-y-2">
          {projectNodes.map(node => {
            const isProjectExpanded = expandedProjects.has(node.project.id);

            return (
              <div key={node.project.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleProject(node.project.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  {isProjectExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FolderKanban className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{node.project.name}</h4>
                    <p className="text-sm text-gray-500">{node.tasks.length} tasks</p>
                  </div>
                </button>

                {isProjectExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 pl-12 space-y-2">
                    {(Object.entries(node.statusGroups) as [TaskStatus, TaskWithRelations[]][]).map(
                      ([status, statusTasks]) => {
                        if (statusTasks.length === 0) return null;

                        const statusKey = `${node.project.id}-${status}`;
                        const isStatusExpanded = expandedStatuses.has(statusKey);
                        const config = STATUS_CONFIG[status];
                        const StatusIcon = config.icon;

                        return (
                          <div key={status} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                            <button
                              onClick={() => toggleStatus(statusKey)}
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 transition-colors"
                            >
                              {isStatusExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <div className={`p-1.5 rounded ${config.bg}`}>
                                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                              </div>
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {statusTasks.length}
                              </span>
                            </button>

                            {isStatusExpanded && (
                              <div className="border-t border-gray-100 divide-y divide-gray-50">
                                {statusTasks.map(task => (
                                  <button
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="w-full flex items-center gap-3 p-2.5 pl-12 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 truncate">{task.title}</p>
                                      {task.tags && task.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                          {task.tags.slice(0, 2).map(tag => (
                                            <span
                                              key={tag}
                                              className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
