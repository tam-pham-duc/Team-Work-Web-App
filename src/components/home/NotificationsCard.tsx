import { Link } from 'react-router-dom';
import { Bell, UserPlus, ArrowRightLeft, Clock, MessageCircle } from 'lucide-react';
import type { NotificationItem } from '../../services/homeService';

interface NotificationsCardProps {
  notifications: NotificationItem[];
  loading: boolean;
}

const notificationIcons: Record<NotificationItem['type'], typeof Bell> = {
  assignment: UserPlus,
  status_change: ArrowRightLeft,
  deadline: Clock,
  comment: MessageCircle
};

const notificationStyles: Record<NotificationItem['type'], string> = {
  assignment: 'bg-blue-100 text-blue-600',
  status_change: 'bg-amber-100 text-amber-600',
  deadline: 'bg-red-100 text-red-600',
  comment: 'bg-emerald-100 text-emerald-600'
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
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

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const Icon = notificationIcons[notification.type];
  const iconStyle = notificationStyles[notification.type];

  const linkTo = notification.taskId
    ? `/tasks?task=${notification.taskId}`
    : notification.projectId
    ? `/projects/${notification.projectId}`
    : '#';

  return (
    <Link
      to={linkTo}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className={`p-2 rounded-lg shrink-0 ${iconStyle}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        <p className="text-sm text-gray-600 truncate">{notification.description}</p>
        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.timestamp)}</p>
      </div>
    </Link>
  );
}

export function NotificationsCard({ notifications, loading }: NotificationsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Notifications</h3>
          {notifications.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
              {notifications.length}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No new notifications</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up</p>
          </div>
        ) : (
          <div className="space-y-1 -mx-2 max-h-80 overflow-y-auto">
            {notifications.map(notification => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
