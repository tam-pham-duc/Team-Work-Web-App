import { useState, useEffect } from 'react';
import { Clock, Play, Square, Timer, ExternalLink } from 'lucide-react';
import type { TimeTrackingSummary } from '../../services/homeService';
import { useTimeTracker } from '../../contexts/TimeTrackerContext';

interface TimeTrackingCardProps {
  data: TimeTrackingSummary | null;
  loading: boolean;
  onStopTimer: (description?: string) => Promise<void>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TimeTrackingCard({ data, loading, onStopTimer }: TimeTrackingCardProps) {
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [stopping, setStopping] = useState(false);
  const { openTracker } = useTimeTracker();

  useEffect(() => {
    if (!data?.activeTimer?.started_at) return;

    const updateElapsed = () => {
      setElapsedTime(formatElapsedTime(data.activeTimer!.started_at));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [data?.activeTimer?.started_at]);

  const handleStopTimer = async () => {
    setStopping(true);
    await onStopTimer();
    setStopping(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-16 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  const hasActiveTimer = data?.activeTimer !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Time Tracking</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Logged today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatDuration(data?.totalMinutesToday || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <Timer className="w-6 h-6 text-gray-600" />
            </div>
          </div>

          {hasActiveTimer ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    if (data?.activeTimer) {
                      openTracker({
                        taskId: data.activeTimer.task_id,
                        taskTitle: data.activeTimer.task?.title || 'Task',
                        projectName: data.activeTimer.task?.project?.name,
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-medium text-emerald-700">Timer running</p>
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {data?.activeTimer?.task?.title || 'Task'}
                  </p>
                  <p className="text-2xl font-mono font-semibold text-emerald-700 mt-1">
                    {elapsedTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (data?.activeTimer) {
                        openTracker({
                          taskId: data.activeTimer.task_id,
                          taskTitle: data.activeTimer.task?.title || 'Task',
                          projectName: data.activeTimer.task?.project?.name,
                        });
                      }
                    }}
                    className="p-3 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                    title="Open Timer Panel"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleStopTimer}
                    disabled={stopping}
                    className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    <Square className="w-5 h-5" fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">No active timer</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Start a timer from any task
                  </p>
                </div>
                <div className="p-3 bg-gray-200 text-gray-500 rounded-lg">
                  <Play className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
