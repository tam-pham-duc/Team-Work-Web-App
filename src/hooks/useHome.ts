import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as homeService from '../services/homeService';
import type {
  TodayTasksData,
  TimeTrackingSummary,
  ActiveProjectData,
  NotificationItem
} from '../services/homeService';

interface HomeData {
  todayTasks: TodayTasksData | null;
  timeTracking: TimeTrackingSummary | null;
  activeProjects: ActiveProjectData[];
  notifications: NotificationItem[];
}

interface UseHomeReturn extends HomeData {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: (description?: string) => Promise<void>;
}

export function useHome(): UseHomeReturn {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData>({
    todayTasks: null,
    timeTracking: null,
    activeProjects: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [tasksResult, timeResult, projectsResult, notificationsResult] = await Promise.all([
        homeService.fetchTodayTasks(user.id),
        homeService.fetchTimeTrackingSummary(user.id),
        homeService.fetchActiveProjects(user.id),
        homeService.fetchNotifications(user.id)
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (timeResult.error) throw timeResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      setData({
        todayTasks: tasksResult.data,
        timeTracking: timeResult.data,
        activeProjects: projectsResult.data || [],
        notifications: notificationsResult.data || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startTimer = useCallback(async (taskId: string) => {
    if (!user?.id) return;

    const { data: newTimer, error } = await homeService.startTimer(taskId, user.id);
    if (error) {
      setError(error.message);
      return;
    }

    setData(prev => ({
      ...prev,
      timeTracking: prev.timeTracking ? {
        ...prev.timeTracking,
        activeTimer: newTimer
      } : null
    }));
  }, [user?.id]);

  const stopTimer = useCallback(async (description?: string) => {
    if (!data.timeTracking?.activeTimer?.id) return;

    const { error } = await homeService.stopTimer(data.timeTracking.activeTimer.id, description);
    if (error) {
      setError(error.message);
      return;
    }

    await fetchData();
  }, [data.timeTracking?.activeTimer?.id, fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData,
    startTimer,
    stopTimer
  };
}
