import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, FolderKanban, ListTodo, User } from 'lucide-react';
import type { IssueWithRelations, IssueSeverity, IssueStatus } from '../../types/database';
import type { CreateIssueInput, UpdateIssueInput } from '../../services/issueService';
import * as issueService from '../../services/issueService';

interface IssueFormProps {
  issue?: IssueWithRelations | null;
  onSave: (input: CreateIssueInput | UpdateIssueInput) => Promise<boolean>;
  onCancel: () => void;
}

const severities: { value: IssueSeverity; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Minor issue, cosmetic' },
  { value: 'medium', label: 'Medium', description: 'Affects functionality' },
  { value: 'high', label: 'High', description: 'Major impact' },
  { value: 'critical', label: 'Critical', description: 'Blocks work' }
];

const statuses: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'wont_fix', label: "Won't Fix" }
];

export function IssueForm({ issue, onSave, onCancel }: IssueFormProps) {
  const [title, setTitle] = useState(issue?.title || '');
  const [description, setDescription] = useState(issue?.description || '');
  const [severity, setSeverity] = useState<IssueSeverity>(issue?.severity || 'medium');
  const [status, setStatus] = useState<IssueStatus>(issue?.status || 'open');
  const [projectId, setProjectId] = useState(issue?.project_id || '');
  const [taskId, setTaskId] = useState(issue?.task_id || '');
  const [assigneeId, setAssigneeId] = useState(issue?.assigned_to || '');

  const [linkedEntities, setLinkedEntities] = useState<{
    projects: { id: string; name: string }[];
    tasks: { id: string; title: string }[];
    users: { id: string; full_name: string; email: string; avatar_url: string | null }[];
  }>({ projects: [], tasks: [], users: [] });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    issueService.fetchLinkedEntities().then(setLinkedEntities);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    const input: CreateIssueInput | UpdateIssueInput = issue
      ? {
          title: title.trim(),
          description: description.trim() || undefined,
          severity,
          status,
          project_id: projectId || null,
          task_id: taskId || null,
          assigned_to: assigneeId || null
        }
      : {
          title: title.trim(),
          description: description.trim() || undefined,
          severity,
          project_id: projectId || undefined,
          task_id: taskId || undefined,
          assigned_to: assigneeId || undefined
        };

    const success = await onSave(input);
    setSaving(false);

    if (success && !issue) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {issue ? 'Edit Issue' : 'Report Issue'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the issue"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description of the issue, steps to reproduce, expected behavior..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <div className="space-y-2">
            {severities.map(s => (
              <label
                key={s.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  severity === s.value
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s.value}
                  checked={severity === s.value}
                  onChange={() => setSeverity(s.value)}
                  className="sr-only"
                />
                <div className={`w-3 h-3 rounded-full ${
                  s.value === 'critical' ? 'bg-red-500' :
                  s.value === 'high' ? 'bg-orange-500' :
                  s.value === 'medium' ? 'bg-amber-500' :
                  'bg-blue-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {issue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <User className="w-4 h-4 inline mr-1" />
          Assign to
        </label>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">Unassigned</option>
          {linkedEntities.users.map(user => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Link to</h3>
        <div className="grid gap-4 md:grid-cols-2">
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
          {saving ? 'Saving...' : issue ? 'Update Issue' : 'Create Issue'}
        </button>
      </div>
    </form>
  );
}
