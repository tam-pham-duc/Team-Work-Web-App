import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, X, GripHorizontal, Clock, FolderKanban, Save } from 'lucide-react';
import * as taskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';

interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

interface FloatingTimeTrackerProps {
  taskId: string;
  taskTitle: string;
  projectName?: string;
  onClose: () => void;
  onTimeLogged?: () => void;
}

export function FloatingTimeTracker({
  taskId,
  taskTitle,
  projectName,
  onClose,
  onTimeLogged,
}: FloatingTimeTrackerProps) {
  const { user } = useAuth();
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const loadActiveLog = useCallback(async () => {
    const { data } = await taskService.fetchTimeLogs(taskId);
    if (data) {
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
    loadActiveLog();
  }, [loadActiveLog]);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - 360;
      const maxY = window.innerHeight - 300;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
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
    await taskService.stopTimeLog(activeLog.id, description);
    setActiveLog(null);
    setElapsedTime(0);
    setDescription('');
    onTimeLogged?.();
  };

  const handleSaveManual = async () => {
    if (!user || !manualStart || !manualEnd) return;
    await taskService.createManualTimeLog(
      taskId,
      user.id,
      new Date(manualStart).toISOString(),
      new Date(manualEnd).toISOString(),
      description
    );
    setManualStart('');
    setManualEnd('');
    setDescription('');
    setManualMode(false);
    onTimeLogged?.();
  };

  const handleClose = () => {
    onClose();
  };

  if (loading) {
    return (
      <div
        ref={panelRef}
        className="fixed z-[60] w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200 animate-pulse"
        style={{ left: position.x, top: position.y }}
      >
        <div className="h-12 bg-gray-100 rounded-t-xl" />
        <div className="p-4 space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-[60] w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-xl cursor-move border-b border-gray-200"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 text-gray-600">
          <GripHorizontal className="w-4 h-4" />
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Time Tracker</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{taskTitle}</h3>
          {projectName && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <FolderKanban className="w-3 h-3" />
              {projectName}
            </div>
          )}
        </div>

        {!manualMode ? (
          <>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-gray-900 tracking-wider">
                  {formatDuration(elapsedTime)}
                </div>
                {activeLog && (
                  <div className="text-xs text-gray-500 mt-2">
                    Started at {formatTime(new Date(activeLog.started_at))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                {activeLog ? (
                  <button
                    onClick={handleStop}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Stop Timer
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Timer
                  </button>
                )}
              </div>

              {!activeLog && (
                <button
                  onClick={() => setManualMode(true)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Log time manually
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveManual}
                disabled={!manualStart || !manualEnd}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setManualMode(false);
                  setManualStart('');
                  setManualEnd('');
                }}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
