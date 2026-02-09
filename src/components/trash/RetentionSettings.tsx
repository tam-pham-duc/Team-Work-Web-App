import { useState } from 'react';
import { Settings, Save, AlertTriangle, Trash2, Clock } from 'lucide-react';
import type { RetentionSettings } from '../../types/database';

interface RetentionSettingsPanelProps {
  settings: RetentionSettings;
  onSave: (settings: RetentionSettings) => Promise<boolean>;
  onPurgeExpired: () => Promise<{ success: boolean; deletedCount: number }>;
  onEmptyTrash: () => Promise<{ success: boolean; deletedCount: number }>;
  totalItems: number;
}

export function RetentionSettingsPanel({
  settings,
  onSave,
  onPurgeExpired,
  onEmptyTrash,
  totalItems,
}: RetentionSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(settings.days);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const success = await onSave({ days });
    setSaving(false);
    setMessage({
      type: success ? 'success' : 'error',
      text: success ? 'Retention settings saved' : 'Failed to save settings',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePurgeExpired = async () => {
    if (!confirm('This will permanently delete all items that have exceeded the retention period. Continue?')) {
      return;
    }
    setPurging(true);
    setMessage(null);
    const result = await onPurgeExpired();
    setPurging(false);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.success
        ? `Purged ${result.deletedCount} expired item${result.deletedCount !== 1 ? 's' : ''}`
        : 'Failed to purge expired items',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEmptyTrash = async () => {
    if (!confirm('This will permanently delete ALL items in trash. This action cannot be undone. Continue?')) {
      return;
    }
    setEmptying(true);
    setMessage(null);
    const result = await onEmptyTrash();
    setEmptying(false);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.success
        ? `Deleted ${result.deletedCount} item${result.deletedCount !== 1 ? 's' : ''}`
        : 'Failed to empty trash',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Settings className="w-4 h-4" />
        Settings
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Trash Settings
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Retention Period (days)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Items will be automatically eligible for cleanup after this period.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                onClick={handleSave}
                disabled={saving || days === settings.days}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Cleanup Actions</h3>

            <div className="space-y-3">
              <button
                onClick={handlePurgeExpired}
                disabled={purging}
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-amber-900">Purge Expired Items</p>
                    <p className="text-xs text-amber-700">Delete items older than {settings.days} days</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-600">
                  {purging ? 'Purging...' : 'Run'}
                </span>
              </button>

              <button
                onClick={handleEmptyTrash}
                disabled={emptying || totalItems === 0}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-900">Empty Trash</p>
                    <p className="text-xs text-red-700">Permanently delete all {totalItems} items</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-red-600">
                  {emptying ? 'Emptying...' : 'Run'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
