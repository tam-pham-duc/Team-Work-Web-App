import { useState, useEffect, useCallback } from 'react';
import * as taskService from '../services/taskService';
import type { Task, TaskWithRelations } from '../types/database';

export function useTasks(filters: taskService.TaskFilters = {}) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await taskService.fetchTasks(filters);
    if (error) {
      setError(error.message);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return { tasks, loading, error, refetch: loadTasks };
}

export function useTask(taskId: string | null) {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await taskService.fetchTaskById(taskId);
    if (error) {
      setError(error.message);
    } else {
      setTask(data);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  return { task, loading, error, refetch: loadTask };
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<taskService.TaskFilters[]>([]);
  const [loading, setLoading] = useState(false);

  const loadComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data } = await taskService.fetchTaskComments(taskId);
    setComments(data || []);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return { comments, loading, refetch: loadComments };
}

export function useTimeLogs(taskId: string | null) {
  const [timeLogs, setTimeLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTimeLogs = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data } = await taskService.fetchTimeLogs(taskId);
    setTimeLogs(data || []);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadTimeLogs();
  }, [loadTimeLogs]);

  return { timeLogs, loading, refetch: loadTimeLogs };
}

export function useTaskActivity(taskId: string | null) {
  const [activity, setActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data } = await taskService.fetchTaskActivity(taskId);
    setActivity(data || []);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return { activity, loading, refetch: loadActivity };
}

export function useProjects() {
  const [projects, setProjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await taskService.fetchProjects();
      setProjects(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return { projects, loading };
}
