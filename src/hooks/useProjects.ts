import { useState, useEffect, useCallback } from 'react';
import * as projectService from '../services/projectService';
import type { ProjectWithRelations, ProjectStats, Task } from '../types/database';

export function useProjects(filters: projectService.ProjectFilters = {}) {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await projectService.fetchProjects(filters);
    if (error) {
      setError(error.message);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return { projects, loading, error, refetch: loadProjects };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await projectService.fetchProjectById(projectId);
    if (error) {
      setError(error.message);
    } else {
      setProject(data);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return { project, loading, error, refetch: loadProject };
}

export function useProjectStats(projectId: string | null) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const data = await projectService.fetchProjectStats(projectId);
    setStats(data);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, refetch: loadStats };
}

export function useProjectTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await projectService.fetchProjectTasks(projectId);
    setTasks(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return { tasks, loading, refetch: loadTasks };
}

export function useProjectActivity(projectId: string | null) {
  const [activity, setActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await projectService.fetchProjectActivity(projectId);
    setActivity(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return { activity, loading, refetch: loadActivity };
}

export function useAllUsers() {
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await projectService.fetchAllUsers();
      setUsers(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return { users, loading };
}
