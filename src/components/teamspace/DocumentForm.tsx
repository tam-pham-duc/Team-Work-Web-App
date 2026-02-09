import { useState, useEffect } from 'react';
import { X, Save, Eye, FolderKanban, ListTodo, AlertTriangle, Tag } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import type { DocumentType, DocumentStatus, DocumentCategory, DocumentTag, DocumentWithRelations } from '../../types/database';
import type { CreateDocumentInput, UpdateDocumentInput } from '../../services/teamSpaceService';
import * as teamSpaceService from '../../services/teamSpaceService';

interface DocumentFormProps {
  document?: DocumentWithRelations | null;
  categories: DocumentCategory[];
  tags: DocumentTag[];
  onSave: (input: CreateDocumentInput | UpdateDocumentInput) => Promise<boolean>;
  onCancel: () => void;
  onCreateTag?: (name: string, color?: string) => Promise<DocumentTag | null>;
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'post', label: 'Post' },
  { value: 'spec', label: 'Technical Spec' },
  { value: 'discussion', label: 'Discussion' }
];

const documentStatuses: { value: DocumentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' }
];

export function DocumentForm({
  document,
  categories,
  tags,
  onSave,
  onCancel,
  onCreateTag
}: DocumentFormProps) {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [excerpt, setExcerpt] = useState(document?.excerpt || '');
  const [type, setType] = useState<DocumentType>(document?.type || 'note');
  const [status, setStatus] = useState<DocumentStatus>(document?.status || 'draft');
  const [categoryId, setCategoryId] = useState(document?.category_id || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(document?.tags?.map(t => t.id) || []);
  const [projectId, setProjectId] = useState(document?.project_id || '');
  const [taskId, setTaskId] = useState(document?.task_id || '');
  const [issueId, setIssueId] = useState(document?.issue_id || '');

  const [linkedEntities, setLinkedEntities] = useState<{
    projects: { id: string; name: string }[];
    tasks: { id: string; title: string }[];
    issues: { id: string; title: string }[];
  }>({ projects: [], tasks: [], issues: [] });

  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    teamSpaceService.fetchLinkedEntities().then(setLinkedEntities);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    const input = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || null,
      type,
      status,
      category_id: categoryId || null,
      project_id: projectId || null,
      task_id: taskId || null,
      issue_id: issueId || null,
      tagIds: selectedTagIds
    };

    const success = await onSave(input);
    setSaving(false);

    if (success && !document) {
      onCancel();
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return;

    const tag = await onCreateTag(newTagName.trim());
    if (tag) {
      setSelectedTagIds(prev => [...prev, tag.id]);
      setNewTagName('');
      setShowTagInput(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {document ? 'Edit Document' : 'Create Document'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocumentType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {documentTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {documentStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Summary <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief description of this document"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing your document..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">No category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag.name}
            </button>
          ))}
          {!showTagInput && onCreateTag && (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              + New tag
            </button>
          )}
        </div>
        {showTagInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateTag}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTagInput(false);
                setNewTagName('');
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Link to</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <FolderKanban className="w-3.5 h-3.5" />
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">None</option>
              {linkedEntities.projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <ListTodo className="w-3.5 h-3.5" />
              Task
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">None</option>
              {linkedEntities.tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Issue
            </label>
            <select
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">None</option>
              {linkedEntities.issues.map(i => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : document ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
