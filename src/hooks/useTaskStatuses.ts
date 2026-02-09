import { useState, useEffect, useCallback } from 'react';
import * as taskStatusService from '../services/taskStatusService';
import type { TaskStatusRecord } from '../types/database';

export function useTaskStatuses() {
  const [statuses, setStatuses] = useState<TaskStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await taskStatusService.fetchTaskStatuses();
    if (error) {
      setError(error.message);
    } else {
      setStatuses(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const createStatus = async (input: taskStatusService.CreateStatusInput, userId: string) => {
    const { data, error } = await taskStatusService.createTaskStatus(input, userId);
    if (!error && data) {
      await loadStatuses();
    }
    return { data, error };
  };

  const updateStatus = async (id: string, updates: taskStatusService.UpdateStatusInput) => {
    const { data, error } = await taskStatusService.updateTaskStatus(id, updates);
    if (!error && data) {
      await loadStatuses();
    }
    return { data, error };
  };

  const deleteStatus = async (id: string) => {
    const { error } = await taskStatusService.deleteTaskStatus(id);
    if (!error) {
      await loadStatuses();
    }
    return { error };
  };

  const reorderStatuses = async (statusIds: string[]) => {
    const { error } = await taskStatusService.reorderStatuses(statusIds);
    if (!error) {
      await loadStatuses();
    }
    return { error };
  };

  const getStatusBySlug = (slug: string) => {
    return statuses.find(s => s.slug === slug || s.slug.startsWith(slug + '_'));
  };

  const getStatusById = (id: string) => {
    return statuses.find(s => s.id === id);
  };

  return {
    statuses,
    loading,
    error,
    refetch: loadStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    getStatusBySlug,
    getStatusById,
  };
}
