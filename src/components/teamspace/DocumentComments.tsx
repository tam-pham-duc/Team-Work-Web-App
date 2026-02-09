import { useState } from 'react';
import {
  MessageCircle,
  Reply,
  MoreHorizontal,
  Check,
  X,
  Edit2,
  Trash2,
  CheckCircle,
  Circle
} from 'lucide-react';
import type { DocumentCommentWithUser } from '../../types/database';

interface DocumentCommentsProps {
  comments: DocumentCommentWithUser[];
  currentUserId?: string;
  onAddComment: (content: string, parentId?: string) => Promise<boolean>;
  onUpdateComment: (id: string, content: string) => Promise<boolean>;
  onDeleteComment: (id: string) => Promise<boolean>;
  onResolveComment: (id: string, resolved: boolean) => Promise<boolean>;
}

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface CommentItemProps {
  comment: DocumentCommentWithUser;
  currentUserId?: string;
  onReply: (parentId: string) => void;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onResolve: (id: string, resolved: boolean) => Promise<boolean>;
  isReply?: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onUpdate,
  onDelete,
  onResolve,
  isReply = false
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUserId === comment.user_id;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    const success = await onUpdate(comment.id, editContent.trim());
    setSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this comment?')) {
      await onDelete(comment.id);
    }
    setShowMenu(false);
  };

  const handleToggleResolve = async () => {
    await onResolve(comment.id, !comment.is_resolved);
    setShowMenu(false);
  };

  return (
    <div className={`${isReply ? 'ml-10 mt-3' : ''}`}>
      <div className={`p-4 rounded-lg ${comment.is_resolved ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
        <div className="flex items-start gap-3">
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.full_name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-gray-600">
                {getInitials(comment.user.full_name)}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.user.full_name}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(comment.created_at)}
                </span>
                {comment.is_resolved && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" />
                    Resolved
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {!isReply && (
                        <button
                          onClick={handleToggleResolve}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {comment.is_resolved ? (
                            <>
                              <Circle className="w-4 h-4" />
                              Unresolve
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Resolve
                            </>
                          )}
                        </button>
                      )}
                      {isOwner && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editContent.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                {!isReply && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onResolve={onResolve}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentComments({
  comments,
  currentUserId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onResolveComment
}: DocumentCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const success = await onAddComment(newComment.trim());
    setSubmitting(false);

    if (success) {
      setNewComment('');
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyingTo) return;

    setSubmitting(true);
    const success = await onAddComment(replyContent.trim(), replyingTo);
    setSubmitting(false);

    if (success) {
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      <form onSubmit={handleSubmitComment} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No comments yet</p>
          <p className="text-sm text-gray-400">Be the first to comment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={setReplyingTo}
                onUpdate={onUpdateComment}
                onDelete={onDeleteComment}
                onResolve={onResolveComment}
              />

              {replyingTo === comment.id && (
                <form onSubmit={handleSubmitReply} className="ml-10 mt-3 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={submitting || !replyContent.trim()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {submitting ? 'Posting...' : 'Reply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
