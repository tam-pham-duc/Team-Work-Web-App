import { useState } from 'react';
import { Plus, X, Pencil, Trash2, GripVertical, Check, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskStatusRecord } from '../../types/database';

interface TaskStatusManagerProps {
  statuses: TaskStatusRecord[];
  onClose: () => void;
  onCreate: (input: { name: string; color: string; is_completed_state: boolean }, userId: string) => Promise<{ error?: { message: string } | null }>;
  onUpdate: (id: string, updates: { name?: string; color?: string; is_completed_state?: boolean }) => Promise<{ error?: { message: string } | null }>;
  onDelete: (id: string) => Promise<{ error?: { message: string } | null }>;
  onReorder: (statusIds: string[]) => Promise<{ error?: { message: string } | null }>;
}

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  { value: 'red', label: 'Red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-400' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
];

function getColorConfig(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color) || COLOR_OPTIONS[0];
}

export function TaskStatusManager({
  statuses,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: TaskStatusManagerProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('gray');
  const [editIsCompleted, setEditIsCompleted] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('gray');
  const [newIsCompleted, setNewIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleStartEdit = (status: TaskStatusRecord) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
    setEditIsCompleted(status.is_completed_state);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('gray');
    setEditIsCompleted(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setError(null);
    const { error } = await onUpdate(editingId, {
      name: editName.trim(),
      color: editColor,
      is_completed_state: editIsCompleted,
    });
    if (error) {
      setError(error.message);
    } else {
      handleCancelEdit();
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setError(null);
    const { error } = await onCreate(
      { name: newName.trim(), color: newColor, is_completed_state: newIsCompleted },
      user.id
    );
    if (error) {
      setError(error.message);
    } else {
      setShowCreateForm(false);
      setNewName('');
      setNewColor('gray');
      setNewIsCompleted(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const { error } = await onDelete(id);
    if (error) {
      setError(error.message);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = statuses.findIndex(s => s.id === draggedId);
    const targetIndex = statuses.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...statuses];
    const [dragged] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, dragged);

    onReorder(newOrder.map(s => s.id));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Task Statuses</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {statuses.map(status => {
              const colorConfig = getColorConfig(status.color);
              const isEditing = editingId === status.id;

              if (isEditing) {
                return (
                  <div key={status.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      placeholder="Status name"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setEditColor(color.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${color.bg} ${color.text} ${
                            editColor === color.value ? color.border : 'border-transparent'
                          }`}
                        >
                          {color.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editIsCompleted}
                        onChange={(e) => setEditIsCompleted(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-gray-700">Mark tasks as completed when moved to this status</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={status.id}
                  draggable
                  onDragStart={() => handleDragStart(status.id)}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 group transition-colors cursor-move ${
                    draggedId === status.id ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />

                  <span className={`px-2.5 py-1 text-sm font-medium rounded ${colorConfig.bg} ${colorConfig.text}`}>
                    {status.name}
                  </span>

                  {status.is_completed_state && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Completes task
                    </span>
                  )}

                  {status.is_default && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Shield className="w-3 h-3" />
                      Default
                    </span>
                  )}

                  <div className="flex-1" />

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(status)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!status.is_default && (
                      <button
                        onClick={() => handleDelete(status.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showCreateForm ? (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                placeholder="New status name"
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewColor(color.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${color.bg} ${color.text} ${
                      newColor === color.value ? color.border : 'border-transparent'
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newIsCompleted}
                  onChange={(e) => setNewIsCompleted(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-gray-700">Mark tasks as completed when moved to this status</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Create Status
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName('');
                    setNewColor('gray');
                    setNewIsCompleted(false);
                  }}
                  className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Status
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500">
            Drag to reorder. All statuses can be renamed and recolored. Default statuses cannot be deleted.
          </p>
        </div>
      </div>
    </div>
  );
}
