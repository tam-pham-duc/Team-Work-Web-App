import { Calendar, Users, CheckCircle2, Clock, FolderKanban } from 'lucide-react';
import type { ProjectWithRelations, ProjectStatus } from '../../types/database';

interface ProjectCardProps {
  project: ProjectWithRelations;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
  };
  onClick: () => void;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  on_hold: { label: 'On Hold', color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-blue-700', bg: 'bg-blue-100' },
  archived: { label: 'Archived', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export function ProjectCard({ project, stats, onClick }: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = () => {
    if (!project.end_date || project.status === 'completed' || project.status === 'archived') return false;
    return new Date(project.end_date) < new Date();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg group-hover:bg-gray-900 group-hover:text-white transition-colors">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-900">{project.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
      )}

      {stats && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{stats.completionPercentage}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.completionPercentage === 100
                  ? 'bg-green-500'
                  : stats.completionPercentage > 50
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
              }`}
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.completedTasks}/{stats.totalTasks} tasks
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {project.members && project.members.length > 0 ? (
            <div className="flex -space-x-2">
              {project.members.slice(0, 4).map((member) => (
                <div key={member.id} className="relative" title={member.user?.full_name}>
                  {member.user?.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt={member.user.full_name}
                      className="w-7 h-7 rounded-full border-2 border-white"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      {member.user?.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
              ))}
              {project.members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>No members</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {project.end_date && (
            <span className={`flex items-center gap-1 ${isOverdue() ? 'text-red-600' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(project.end_date)}
              {isOverdue() && <span className="font-medium">(Overdue)</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
