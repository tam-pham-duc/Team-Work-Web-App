import { useState } from 'react';
import {
  ListTodo,
  FolderKanban,
  FileText,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Clock,
  User,
  MoreVertical,
} from 'lucide-react';
import type { TrashItem, TrashEntityType } from '../../types/database';

interface TrashItemCardProps {
  item: TrashItem;
  retentionDays: number;
  onRestore: () => void;
  onPermanentDelete: () => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

const entityIcons: Record<TrashEntityType, typeof ListTodo> = {
  task: ListTodo,
  project: FolderKanban,
  document: FileText,
  issue: AlertTriangle,
};

const entityColors: Record<TrashEntityType, string> = {
  task: 'bg-blue-50 text-blue-600 border-blue-200',
  project: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  document: 'bg-amber-50 text-amber-600 border-amber-200',
  issue: 'bg-red-50 text-red-600 border-red-200',
};

const entityLabels: Record<TrashEntityType, string> = {
  task: 'Task',
  project: 'Project',
  document: 'Document',
  issue: 'Issue',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function getDaysUntilExpiration(deletedAt: string, retentionDays: number): number {
  const deletedDate = new Date(deletedAt);
  const expirationDate = new Date(deletedDate);
  expirationDate.setDate(expirationDate.getDate() + retentionDays);
  const now = new Date();
  return Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function TrashItemCard({
  item,
  retentionDays,
  onRestore,
  onPermanentDelete,
  isRestoring = false,
  isDeleting = false,
}: TrashItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const Icon = entityIcons[item.entity_type];
  const colorClass = entityColors[item.entity_type];
  const label = entityLabels[item.entity_type];
  const daysUntilExpiration = getDaysUntilExpiration(item.deleted_at, retentionDays);
  const isExpiringSoon = daysUntilExpiration <= 7;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg border ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
              {label}
            </span>
            {item.metadata.project_name && (
              <span className="text-xs text-gray-500 truncate">
                in {item.metadata.project_name}
              </span>
            )}
          </div>

          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>

          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Deleted {formatTimeAgo(item.deleted_at)}
            </span>
            {item.deleter && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                by {item.deleter.full_name || item.deleter.email}
              </span>
            )}
          </div>

          {isExpiringSoon && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit">
              <AlertTriangle className="w-3.5 h-3.5" />
              {daysUntilExpiration <= 0
                ? 'Expires today'
                : `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRestore();
                  }}
                  disabled={isRestoring}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onPermanentDelete();
                  }}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={onRestore}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
        <button
          onClick={onPermanentDelete}
          disabled={isDeleting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

export function TrashItemCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="flex gap-2 mb-2">
            <div className="w-16 h-5 bg-gray-200 rounded-full" />
            <div className="w-24 h-5 bg-gray-200 rounded" />
          </div>
          <div className="w-3/4 h-5 bg-gray-200 rounded mb-2" />
          <div className="w-1/2 h-4 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
        <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
