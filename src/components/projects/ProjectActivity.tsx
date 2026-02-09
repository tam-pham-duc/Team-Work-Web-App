import { useState, useEffect, useCallback } from 'react';
import { History, User } from 'lucide-react';
import * as projectService from '../../services/projectService';

interface ActivityItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface ProjectActivityProps {
  projectId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created this project',
  updated: 'updated project details',
  deleted: 'deleted this project',
  member_added: 'added a team member',
  member_removed: 'removed a team member',
  member_role_changed: 'changed a member role',
  status_changed: 'changed project status',
};

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    const { data } = await projectService.fetchProjectActivity(projectId);
    if (data) {
      setActivity(data as ActivityItem[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action;
  };

  const getChangeDescription = (item: ActivityItem) => {
    if (item.action === 'updated' && item.changes.old && item.changes.new) {
      const oldData = item.changes.old as Record<string, unknown>;
      const newData = item.changes.new as Record<string, unknown>;
      const changes: string[] = [];

      if (oldData.status !== newData.status) {
        changes.push(`status from "${oldData.status}" to "${newData.status}"`);
      }
      if (oldData.name !== newData.name) {
        changes.push('name');
      }
      if (oldData.description !== newData.description) {
        changes.push('description');
      }
      if (oldData.end_date !== newData.end_date) {
        changes.push('end date');
      }

      if (changes.length > 0) {
        return `Changed ${changes.join(', ')}`;
      }
    }

    if (item.action === 'member_role_changed' && item.changes.new_role) {
      return `Role changed to ${item.changes.new_role}`;
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" />
        <h3 className="font-medium text-gray-900">Activity</h3>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No activity yet</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activity.map(item => (
            <div key={item.id} className="flex gap-3">
              {item.user?.avatar_url ? (
                <img
                  src={item.user.avatar_url}
                  alt={item.user.full_name}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">
                    {item.user?.full_name || 'Unknown'}
                  </span>{' '}
                  {getActionLabel(item.action)}
                </p>
                {getChangeDescription(item) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getChangeDescription(item)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
