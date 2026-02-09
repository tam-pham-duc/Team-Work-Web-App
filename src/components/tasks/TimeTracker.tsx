import { useState, useEffect, useCallback } from 'react';
import { Play, Square, Plus, Clock, Trash2, ExternalLink, Pencil, Check, X } from 'lucide-react';
import * as taskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracker } from '../../contexts/TimeTrackerContext';

interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface TimeTrackerProps {
  taskId: string;
  taskTitle?: string;
  projectName?: string;
  onTimeLogged?: () => void;
}

export function TimeTracker({ taskId, taskTitle = 'Task', projectName, onTimeLogged }: TimeTrackerProps) {
  const { user } = useAuth();
  const { openTracker } = useTimeTracker();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [stopDescription, setStopDescription] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadTimeLogs = useCallback(async () => {
    const { data } = await taskService.fetchTimeLogs(taskId);
    if (data) {
      setTimeLogs(data as TimeLog[]);
      const active = data.find((log: TimeLog) => !log.ended_at && log.user_id === user?.id);
      if (active) {
        setActiveLog(active as TimeLog);
        const startTime = new Date(active.started_at).getTime();
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }
    setLoading(false);
  }, [taskId, user?.id]);

  useEffect(() => {
    loadTimeLogs();
  }, [loadTimeLogs]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeLog) {
      interval = setInterval(() => {
        const startTime = new Date(activeLog.started_at).getTime();
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeLog]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleStart = async () => {
    if (!user) return;
    const { data } = await taskService.startTimeLog(taskId, user.id);
    if (data) {
      setActiveLog(data);
      setElapsedTime(0);
      onTimeLogged?.();
    }
  };

  const handleStop = async () => {
    if (!activeLog) return;
    await taskService.stopTimeLog(activeLog.id, stopDescription);
    setActiveLog(null);
    setElapsedTime(0);
    setStopDescription('');
    loadTimeLogs();
    onTimeLogged?.();
  };

  const handleManualEntry = async () => {
    if (!user || !manualStart || !manualEnd) return;
    await taskService.createManualTimeLog(
      taskId,
      user.id,
      new Date(manualStart).toISOString(),
      new Date(manualEnd).toISOString(),
      manualDescription
    );
    setShowManualEntry(false);
    setManualStart('');
    setManualEnd('');
    setManualDescription('');
    loadTimeLogs();
    onTimeLogged?.();
  };

  const handleDeleteLog = async (logId: string) => {
    await taskService.deleteTimeLog(logId);
    loadTimeLogs();
    onTimeLogged?.();
  };

  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const startEditing = (log: TimeLog) => {
    setEditingLogId(log.id);
    setEditStart(toLocalDatetime(log.started_at));
    setEditEnd(log.ended_at ? toLocalDatetime(log.ended_at) : '');
    setEditDescription(log.description || '');
    setEditError('');
  };

  const cancelEditing = () => {
    setEditingLogId(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingLogId || !editStart || !editEnd) return;
    const startDate = new Date(editStart);
    const endDate = new Date(editEnd);
    if (endDate < startDate) {
      setEditError('End time must be after start time');
      return;
    }
    setEditSaving(true);
    setEditError('');
    const { error } = await taskService.updateTimeLog(editingLogId, {
      started_at: startDate.toISOString(),
      ended_at: endDate.toISOString(),
      description: editDescription,
    });
    setEditSaving(false);
    if (error) {
      setEditError('Failed to save changes');
      return;
    }
    setEditingLogId(null);
    loadTimeLogs();
    onTimeLogged?.();
  };

  const totalTime = timeLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Tracking
        </h3>
        <span className="text-sm text-gray-500">
          Total: {formatMinutes(totalTime)}
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-3xl font-mono font-bold text-gray-900">
            {formatDuration(elapsedTime)}
          </div>
          <div className="flex items-center gap-2">
            {activeLog ? (
              <>
                <button
                  onClick={() => openTracker({ taskId, taskTitle, projectName })}
                  className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Open Timer Panel"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  onClick={handleStop}
                  className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="Stop"
                >
                  <Square className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => openTracker({ taskId, taskTitle, projectName })}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                title="Start Timer"
              >
                <Play className="w-4 h-4" />
                Start Timer
              </button>
            )}
          </div>
        </div>

        {activeLog && (
          <div className="mt-3">
            <input
              type="text"
              value={stopDescription}
              onChange={(e) => setStopDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Time Entries</h4>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      {showManualEntry && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualEntry}
              disabled={!manualStart || !manualEnd}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Entry
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {timeLogs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No time entries yet</p>
        ) : (
          timeLogs.map(log => (
            <div
              key={log.id}
              className={`rounded-lg border ${
                log.ended_at ? 'bg-white border-gray-200' : 'bg-green-50 border-green-200'
              }`}
            >
              {editingLogId === log.id ? (
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="What did you work on?"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600">{editError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editStart || !editEnd || editSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {log.user?.avatar_url ? (
                      <img
                        src={log.user.avatar_url}
                        alt={log.user.full_name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {log.user?.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {log.ended_at && (
                          <>
                            {' - '}
                            {new Date(log.ended_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${log.ended_at ? 'text-gray-900' : 'text-green-600'}`}>
                      {log.ended_at ? formatMinutes(log.duration_minutes) : 'Running...'}
                    </span>
                    {log.ended_at && log.user_id === user?.id && (
                      <>
                        <button
                          onClick={() => startEditing(log)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit time entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete time entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
