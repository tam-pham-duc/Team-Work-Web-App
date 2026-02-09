import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  Ban,
  User,
  Calendar,
  FolderKanban,
  ListTodo,
  MessageCircle,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react';
import type {
  IssueWithRelations,
  IssueCommentWithUser,
  IssueActivityLogWithUser,
  IssueStatus,
  IssueSeverity
} from '../../types/database';
import type { UpdateIssueInput } from '../../services/issueService';

interface IssueDetailProps {
  issue: IssueWithRelations;
  comments: IssueCommentWithUser[];
  activity: IssueActivityLogWithUser[];
  currentUserId?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: IssueStatus) => Promise<boolean>;
  onAddComment: (content: string, isResolutionNote?: boolean) => Promise<boolean>;
  onDeleteComment: (id: string) => Promise<boolean>;
}

const severityConfig: Record<IssueSeverity, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-100', label: 'Critical' },
  high: { icon: AlertCircle, color: 'text-orange-700', bg: 'bg-orange-100', label: 'High' },
  medium: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-100', label: 'Medium' },
  low: { icon: Info, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Low' }
};

const statusConfig: Record<IssueStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  open: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Resolved' },
  closed: { icon: CheckCircle2, color: 'text-gray-700', bg: 'bg-gray-100', label: 'Closed' },
  wont_fix: { icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100', label: "Won't Fix" }
};

const statuses: IssueStatus[] = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getActivityDescription(activity: IssueActivityLogWithUser): string {
  switch (activity.action) {
    case 'created':
      return 'created this issue';
    case 'status_changed':
      return `changed status from ${activity.old_value} to ${activity.new_value}`;
    case 'assigned':
      return activity.new_value ? 'assigned this issue' : 'unassigned this issue';
    case 'severity_changed':
      return `changed severity from ${activity.old_value} to ${activity.new_value}`;
    default:
      return activity.action;
  }
}

export function IssueDetail({
  issue,
  comments,
  activity,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onAddComment,
  onDeleteComment
}: IssueDetailProps) {
  const [newComment, setNewComment] = useState('');
  const [isResolutionNote, setIsResolutionNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  const severity = severityConfig[issue.severity];
  const status = statusConfig[issue.status];
  const SeverityIcon = severity.icon;
  const StatusIcon = status.icon;

  const isReporter = currentUserId === issue.reported_by;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const success = await onAddComment(newComment.trim(), isResolutionNote);
    setSubmitting(false);

    if (success) {
      setNewComment('');
      setIsResolutionNote(false);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    setChangingStatus(true);
    await onStatusChange(newStatus);
    setChangingStatus(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
        <div className="sticky top-0 bg-white rounded-t-xl border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${severity.bg} ${severity.color}`}>
              <SeverityIcon className="w-4 h-4" />
              {severity.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isReporter && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{issue.title}</h2>

          {issue.description && (
            <p className="text-gray-600 mb-6 whitespace-pre-wrap">{issue.description}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Reported by:</span>
                <span className="font-medium text-gray-900">{issue.reporter?.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900">{formatDate(issue.created_at)}</span>
              </div>
              {issue.resolved_at && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-500">Resolved:</span>
                  <span className="text-gray-900">{formatDate(issue.resolved_at)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {issue.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Assigned to:</span>
                  <span className="font-medium text-gray-900">{issue.assignee.full_name}</span>
                </div>
              )}
              {issue.project && (
                <Link
                  to={`/projects/${issue.project.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <FolderKanban className="w-4 h-4" />
                  {issue.project.name}
                </Link>
              )}
              {issue.task && (
                <Link
                  to={`/tasks?task=${issue.task.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ListTodo className="w-4 h-4" />
                  {issue.task.title}
                </Link>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(s => {
                const config = statusConfig[s];
                const Icon = config.icon;
                const isActive = issue.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={changingStatus || isActive}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? `${config.bg} ${config.color}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                Activity ({activity.length})
              </button>
            </div>

            {activeTab === 'comments' ? (
              <div className="space-y-4">
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={isResolutionNote}
                        onChange={(e) => setIsResolutionNote(e.target.checked)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      Mark as resolution note
                    </label>
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>

                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg ${
                          comment.is_resolution_note
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {comment.user.avatar_url ? (
                              <img
                                src={comment.user.avatar_url}
                                alt={comment.user.full_name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {getInitials(comment.user.full_name)}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {comment.user.full_name}
                            </span>
                            {comment.is_resolution_note && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                Resolution Note
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          {currentUserId === comment.user_id && (
                            <button
                              onClick={() => onDeleteComment(comment.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  activity.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.user?.avatar_url ? (
                        <img
                          src={item.user.avatar_url}
                          alt={item.user.full_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-gray-600">
                            {item.user ? getInitials(item.user.full_name) : '?'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">
                            {item.user?.full_name || 'System'}
                          </span>{' '}
                          {getActivityDescription(item)}
                        </p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
