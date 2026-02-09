import { Link } from 'react-router-dom';
import {
  FileText,
  Newspaper,
  FileCode,
  MessagesSquare,
  Pin,
  Eye,
  Calendar,
  User,
  FolderKanban,
  ListTodo,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import type { DocumentWithRelations, DocumentType } from '../../types/database';

interface DocumentCardProps {
  document: DocumentWithRelations;
  onPin?: (id: string, isPinned: boolean) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const typeIcons: Record<DocumentType, typeof FileText> = {
  note: FileText,
  post: Newspaper,
  spec: FileCode,
  discussion: MessagesSquare
};

const typeLabels: Record<DocumentType, string> = {
  note: 'Note',
  post: 'Post',
  spec: 'Spec',
  discussion: 'Discussion'
};

const typeColors: Record<DocumentType, string> = {
  note: 'bg-gray-100 text-gray-600',
  post: 'bg-blue-100 text-blue-600',
  spec: 'bg-amber-100 text-amber-600',
  discussion: 'bg-emerald-100 text-emerald-600'
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
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DocumentCard({ document: doc, onPin, onDelete, showActions = true }: DocumentCardProps) {
  const TypeIcon = typeIcons[doc.type];

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group">
      <Link to={`/team-space/${doc.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${typeColors[doc.type]}`}>
              <TypeIcon className="w-3 h-3" />
              {typeLabels[doc.type]}
            </span>
            {doc.is_pinned && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
          </div>
          {doc.category && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: `${doc.category.color}20`, color: doc.category.color }}
            >
              {doc.category.name}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-2">
          {doc.title}
        </h3>

        {doc.excerpt && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.excerpt}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {doc.author?.avatar_url ? (
                <img
                  src={doc.author.avatar_url}
                  alt={doc.author.full_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-gray-600">
                    {doc.author ? getInitials(doc.author.full_name) : '?'}
                  </span>
                </div>
              )}
              <span>{doc.author?.full_name || 'Unknown'}</span>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(doc.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {doc.view_count}
            </span>
          </div>
        </div>

        {(doc.project || doc.task || doc.issue) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            {doc.project && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                <FolderKanban className="w-3 h-3" />
                {doc.project.name}
              </span>
            )}
            {doc.task && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                <ListTodo className="w-3 h-3" />
                {doc.task.title}
              </span>
            )}
            {doc.issue && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                {doc.issue.title}
              </span>
            )}
          </div>
        )}
      </Link>

      {showActions && (onPin || onDelete) && (
        <div className="px-5 pb-4 pt-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onPin(doc.id, !doc.is_pinned);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                doc.is_pinned
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Pin className="w-3 h-3 inline mr-1" />
              {doc.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to delete this document?')) {
                  onDelete(doc.id);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-16 bg-gray-200 rounded-md" />
      </div>
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-gray-200 rounded-full" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-12 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function PinnedDocumentCard({ document: doc }: { document: DocumentWithRelations }) {
  const TypeIcon = typeIcons[doc.type];

  return (
    <Link
      to={`/team-space/${doc.id}`}
      className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors group"
    >
      <div className={`p-2 rounded-lg ${typeColors[doc.type]}`}>
        <TypeIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-700">
          {doc.title}
        </h4>
        <p className="text-xs text-gray-500">
          {doc.author?.full_name} · {formatDate(doc.created_at)}
        </p>
      </div>
      <Pin className="w-4 h-4 text-amber-500 shrink-0" />
    </Link>
  );
}
