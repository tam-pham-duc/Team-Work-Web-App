import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  User,
  Calendar,
  FolderKanban,
  ListTodo,
  CheckCircle2,
  Clock,
  XCircle,
  Ban
} from 'lucide-react';
import type { IssueWithRelations, IssueStatus, IssueSeverity } from '../../types/database';

interface IssueCardProps {
  issue: IssueWithRelations;
  onClick?: () => void;
}

const severityConfig: Record<IssueSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-100' },
  high: { icon: AlertCircle, color: 'text-orange-700', bg: 'bg-orange-100' },
  medium: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-100' },
  low: { icon: Info, color: 'text-blue-700', bg: 'bg-blue-100' }
};

const statusConfig: Record<IssueStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  open: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Resolved' },
  closed: { icon: CheckCircle2, color: 'text-gray-700', bg: 'bg-gray-100', label: 'Closed' },
  wont_fix: { icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100', label: "Won't Fix" }
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const severity = severityConfig[issue.severity];
  const status = statusConfig[issue.status];
  const SeverityIcon = severity.icon;
  const StatusIcon = status.icon;

  const content = (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${severity.bg} ${severity.color}`}>
            <SeverityIcon className="w-3.5 h-3.5" />
            {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${status.bg} ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(issue.created_at)}
        </span>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700">
        {issue.title}
      </h3>

      {issue.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{issue.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {issue.reporter && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Reported by</span>
              {issue.reporter.avatar_url ? (
                <img
                  src={issue.reporter.avatar_url}
                  alt={issue.reporter.full_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-600">
                    {getInitials(issue.reporter.full_name)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {issue.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-400">Assigned to</span>
            {issue.assignee.avatar_url ? (
              <img
                src={issue.assignee.avatar_url}
                alt={issue.assignee.full_name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-[10px] font-medium text-gray-600">
                  {getInitials(issue.assignee.full_name)}
                </span>
              </div>
            )}
            <span>{issue.assignee.full_name}</span>
          </div>
        )}
      </div>

      {(issue.project || issue.task) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {issue.project && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              <FolderKanban className="w-3 h-3" />
              {issue.project.name}
            </span>
          )}
          {issue.task && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              <ListTodo className="w-3 h-3" />
              {issue.task.title}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left group">
        {content}
      </button>
    );
  }

  return (
    <Link to={`/issues/${issue.id}`} className="block group">
      {content}
    </Link>
  );
}

export function IssueCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-20 bg-gray-200 rounded-md" />
        <div className="h-6 w-24 bg-gray-200 rounded-md" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded-full" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
