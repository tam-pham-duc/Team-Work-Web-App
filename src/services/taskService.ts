import { supabase } from '../lib/supabase';
import type { Task, TaskComment, TaskDependency, TimeLog, ActivityLog, InsertTables, UpdateTables } from '../types/database';

export interface TaskFilters {
  projectId?: string;
  status?: Task['status'][];
  priority?: Task['priority'][];
  assigneeId?: string;
  tags?: string[];
  search?: string;
}

export async function fetchTasks(filters: TaskFilters = {}) {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
      project:projects(id, name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters.priority?.length) {
    query = query.in('priority', filters.priority);
  }
  if (filters.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  if (filters.tags?.length) {
    query = query.overlaps('tags', filters.tags);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function fetchTaskById(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
      project:projects(id, name)
    `)
    .eq('id', id)
    .maybeSingle();

  return { data, error };
}

export async function createTask(task: InsertTables<'tasks'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', data.id, 'created', { task: data });
  }

  return { data, error };
}

export async function updateTask(id: string, updates: UpdateTables<'tasks'>) {
  const { data: oldTask } = await supabase.from('tasks').select().eq('id', id).single();

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', id, 'updated', { old: oldTask, new: data });
  }

  return { data, error };
}

export async function deleteTask(id: string, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', id, 'deleted', { task: data });
  }

  return { data, error };
}

export async function fetchTaskDependencies(taskId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      depends_on:tasks!task_dependencies_depends_on_id_fkey(id, title, status)
    `)
    .eq('task_id', taskId);

  return { data, error };
}

export async function fetchTaskDependents(taskId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      task:tasks!task_dependencies_task_id_fkey(id, title, status)
    `)
    .eq('depends_on_id', taskId);

  return { data, error };
}

export async function addTaskDependency(taskId: string, dependsOnId: string, userId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_id: dependsOnId, created_by: userId })
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', taskId, 'dependency_added', { depends_on_id: dependsOnId });
  }

  return { data, error };
}

export async function removeTaskDependency(id: string) {
  const { data: dep } = await supabase.from('task_dependencies').select().eq('id', id).single();
  const { error } = await supabase.from('task_dependencies').delete().eq('id', id);

  if (dep && !error) {
    await logActivity('task', dep.task_id, 'dependency_removed', { depends_on_id: dep.depends_on_id });
  }

  return { error };
}

export async function fetchTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  return { data, error };
}

export async function addTaskComment(taskId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select(`*, user:users(id, full_name, email, avatar_url)`)
    .single();

  if (data && !error) {
    await logActivity('task', taskId, 'comment_added', { comment_id: data.id });
  }

  return { data, error };
}

export async function updateTaskComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ content })
    .eq('id', id)
    .select(`*, user:users(id, full_name, email, avatar_url)`)
    .single();

  return { data, error };
}

export async function deleteTaskComment(id: string, userId: string) {
  const { error } = await supabase
    .from('task_comments')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id);

  return { error };
}

export async function fetchTimeLogs(taskId: string) {
  const { data, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('started_at', { ascending: false });

  return { data, error };
}

export async function startTimeLog(taskId: string, userId: string) {
  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      task_id: taskId,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', taskId, 'timer_started', { time_log_id: data.id });
  }

  return { data, error };
}

export async function stopTimeLog(id: string, description?: string) {
  const { data, error } = await supabase
    .from('time_logs')
    .update({
      ended_at: new Date().toISOString(),
      description: description || '',
    })
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', data.task_id, 'timer_stopped', {
      time_log_id: data.id,
      duration_minutes: data.duration_minutes
    });
  }

  return { data, error };
}

export async function createManualTimeLog(
  taskId: string,
  userId: string,
  startedAt: string,
  endedAt: string,
  description?: string
) {
  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      task_id: taskId,
      user_id: userId,
      started_at: startedAt,
      ended_at: endedAt,
      description: description || '',
    })
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', taskId, 'time_logged', {
      time_log_id: data.id,
      duration_minutes: data.duration_minutes
    });
  }

  return { data, error };
}

export async function updateTimeLog(
  id: string,
  updates: { started_at?: string; ended_at?: string; description?: string }
) {
  const { data, error } = await supabase
    .from('time_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('task', data.task_id, 'time_log_edited', {
      time_log_id: data.id,
      duration_minutes: data.duration_minutes,
    });
  }

  return { data, error };
}

export async function deleteTimeLog(id: string) {
  const { data } = await supabase.from('time_logs').select('task_id').eq('id', id).single();
  const { error } = await supabase.from('time_logs').delete().eq('id', id);

  if (data && !error) {
    await logActivity('task', data.task_id, 'time_log_deleted', { time_log_id: id });
  }

  return { error };
}

export async function fetchTaskActivity(taskId: string) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('entity_type', 'task')
    .eq('entity_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
}

async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  changes: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('activity_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes,
    user_id: user?.id,
  });
}

export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .is('deleted_at', null)
    .order('name');

  return { data, error };
}

export async function fetchProjectMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('project_id', projectId);

  return { data, error };
}
