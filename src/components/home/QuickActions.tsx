import { useState } from 'react';
import { Plus, FolderPlus, Play, Square, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TimeTrackingSummary } from '../../services/homeService';

interface QuickActionsProps {
  activeTimer: TimeTrackingSummary['activeTimer'];
  onStopTimer: (description?: string) => Promise<void>;
}

export function QuickActions({ activeTimer, onStopTimer }: QuickActionsProps) {
  const navigate = useNavigate();
  const [showStopModal, setShowStopModal] = useState(false);
  const [description, setDescription] = useState('');
  const [stopping, setStopping] = useState(false);

  const handleStopTimer = async () => {
    setStopping(true);
    await onStopTimer(description);
    setStopping(false);
    setShowStopModal(false);
    setDescription('');
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/tasks?new=true')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left group"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
              <Plus className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">New Task</p>
              <p className="text-xs text-gray-500">Create a task</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/projects?new=true')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left group"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
              <FolderPlus className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">New Project</p>
              <p className="text-xs text-gray-500">Start a project</p>
            </div>
          </button>

          {activeTimer ? (
            <button
              onClick={() => setShowStopModal(true)}
              className="flex items-center gap-3 p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left group col-span-2"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                <Square className="w-5 h-5 text-red-600" fill="currentColor" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Stop Timer</p>
                <p className="text-xs text-red-600 truncate">
                  {activeTimer.task?.title || 'Running task'}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors text-left group col-span-2"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                <Play className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Start Timer</p>
                <p className="text-xs text-emerald-600">Track time on a task</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowStopModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <button
              onClick={() => setShowStopModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stop Timer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add an optional description for this time entry.
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              rows={3}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowStopModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStopTimer}
                disabled={stopping}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {stopping ? 'Stopping...' : 'Stop Timer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
