import { Link } from 'react-router-dom';
import { FolderKanban, ChevronRight } from 'lucide-react';
import type { ActiveProjectData } from '../../services/homeService';

interface ActiveProjectsCardProps {
  projects: ActiveProjectData[];
  loading: boolean;
}

function ProjectRow({ project }: { project: ActiveProjectData }) {
  const progressPercentage = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <FolderKanban className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
          <span className="text-xs text-gray-500 shrink-0 ml-2">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-500">
            {project.completedTasks}/{project.totalTasks} tasks
          </span>
          {project.inProgressTasks > 0 && (
            <span className="text-xs text-emerald-600">
              {project.inProgressTasks} active
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

export function ActiveProjectsCard({ projects, loading }: ActiveProjectsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Active Projects</h3>
          </div>
          <Link
            to="/projects"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No active projects</p>
            <Link
              to="/projects"
              className="text-sm text-gray-700 hover:text-gray-900 mt-2 inline-block"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <div className="space-y-1 -mx-2">
            {projects.map(project => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
