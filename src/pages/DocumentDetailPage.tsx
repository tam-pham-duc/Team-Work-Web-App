import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDocument } from '../hooks/useTeamSpace';
import { useTeamSpace } from '../hooks/useTeamSpace';
import { ReadOnlyContent, DocumentForm, DocumentComments } from '../components/teamspace';
import {
  ArrowLeft,
  FileText,
  Newspaper,
  FileCode,
  MessagesSquare,
  Pin,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  FolderKanban,
  ListTodo,
  AlertTriangle,
  Tag,
  Loader2
} from 'lucide-react';
import type { DocumentType, DocumentWithRelations } from '../types/database';
import type { UpdateDocumentInput } from '../services/teamSpaceService';
import * as teamSpaceService from '../services/teamSpaceService';

const typeIcons: Record<DocumentType, typeof FileText> = {
  note: FileText,
  post: Newspaper,
  spec: FileCode,
  discussion: MessagesSquare
};

const typeLabels: Record<DocumentType, string> = {
  note: 'Note',
  post: 'Post',
  spec: 'Technical Spec',
  discussion: 'Discussion'
};

const typeColors: Record<DocumentType, string> = {
  note: 'bg-gray-100 text-gray-600',
  post: 'bg-blue-100 text-blue-600',
  spec: 'bg-amber-100 text-amber-600',
  discussion: 'bg-emerald-100 text-emerald-600'
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    document: doc,
    comments,
    loading,
    error,
    refetch,
    addComment,
    updateComment,
    deleteComment,
    resolveComment
  } = useDocument(id || null);

  const { categories, tags, updateDocument, deleteDocument, togglePin, createTag } = useTeamSpace();

  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = user?.id === doc?.author_id;

  const handleUpdate = async (input: UpdateDocumentInput) => {
    if (!id) return false;

    const { error } = await teamSpaceService.updateDocument(id, input);
    if (!error) {
      await refetch();
      setIsEditing(false);
      return true;
    }
    return false;
  };

  const handleUpdateTags = async (tagIds: string[]) => {
    if (!id) return;
    await teamSpaceService.updateDocumentTags(id, tagIds);
    await refetch();
  };

  const handleDelete = async () => {
    if (!id || !user?.id) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeleting(true);
    const { error } = await teamSpaceService.deleteDocument(id, user.id);
    setDeleting(false);

    if (!error) {
      navigate('/team-space');
    }
  };

  const handleTogglePin = async () => {
    if (!id || !doc) return;
    await togglePin(id, !doc.is_pinned);
    await refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-center py-24">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Document not found</h2>
        <p className="text-gray-500 mb-6">{error || 'This document may have been deleted or you may not have access.'}</p>
        <Link
          to="/team-space"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team Space
        </Link>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <DocumentForm
          document={doc}
          categories={categories}
          tags={tags}
          onSave={handleUpdate}
          onCancel={() => setIsEditing(false)}
          onCreateTag={createTag}
        />
      </div>
    );
  }

  const TypeIcon = typeIcons[doc.type];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to="/team-space"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team Space
        </Link>
      </div>

      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${typeColors[doc.type]}`}>
                <TypeIcon className="w-4 h-4" />
                {typeLabels[doc.type]}
              </span>
              {doc.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium bg-amber-100 text-amber-700">
                  <Pin className="w-3.5 h-3.5" />
                  Pinned
                </span>
              )}
              {doc.category && (
                <span
                  className="px-2.5 py-1 rounded-lg text-sm"
                  style={{ backgroundColor: `${doc.category.color}20`, color: doc.category.color }}
                >
                  {doc.category.name}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-lg text-sm ${
                doc.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                doc.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                'bg-red-100 text-red-600'
              }`}>
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePin}
                className={`p-2 rounded-lg transition-colors ${
                  doc.is_pinned
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={doc.is_pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-4 h-4" />
              </button>
              {isAuthor && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{doc.title}</h1>

          {doc.excerpt && (
            <p className="text-lg text-gray-600 mb-4">{doc.excerpt}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              {doc.author?.avatar_url ? (
                <img
                  src={doc.author.avatar_url}
                  alt={doc.author.full_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {doc.author ? getInitials(doc.author.full_name) : '?'}
                  </span>
                </div>
              )}
              <span>{doc.author?.full_name || 'Unknown'}</span>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(doc.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {doc.view_count} views
            </span>
          </div>

          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Tag className="w-4 h-4 text-gray-400" />
              {doc.tags.map(tag => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {(doc.project || doc.task || doc.issue) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              {doc.project && (
                <Link
                  to={`/projects/${doc.project.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  <FolderKanban className="w-4 h-4" />
                  {doc.project.name}
                </Link>
              )}
              {doc.task && (
                <Link
                  to={`/tasks?task=${doc.task.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  <ListTodo className="w-4 h-4" />
                  {doc.task.title}
                </Link>
              )}
              {doc.issue && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {doc.issue.title}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 lg:p-8">
          {doc.content ? (
            <ReadOnlyContent content={doc.content} />
          ) : (
            <p className="text-gray-500 italic">No content</p>
          )}
        </div>
      </article>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
        <DocumentComments
          comments={comments}
          currentUserId={user?.id}
          onAddComment={addComment}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
          onResolveComment={resolveComment}
        />
      </div>
    </div>
  );
}
