import { supabase } from '../lib/supabase';
import type { TaskStatusRecord } from '../types/database';

export interface CreateStatusInput {
  name: string;
  color: string;
  is_completed_state?: boolean;
}

export interface UpdateStatusInput {
  name?: string;
  color?: string;
  sort_order?: number;
  is_completed_state?: boolean;
}

export async function fetchTaskStatuses() {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .order('sort_order', { ascending: true });

  return { data: data as TaskStatusRecord[] | null, error };
}

export async function createTaskStatus(input: CreateStatusInput, userId: string) {
  const { data: maxOrder } = await supabase
    .from('task_statuses')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;
  const slug = input.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const { data, error } = await supabase
    .from('task_statuses')
    .insert({
      name: input.name,
      slug: `${slug}_${Date.now()}`,
      color: input.color,
      sort_order: nextOrder,
      is_default: false,
      is_completed_state: input.is_completed_state ?? false,
      created_by: userId,
    })
    .select()
    .single();

  return { data: data as TaskStatusRecord | null, error };
}

export async function updateTaskStatus(id: string, updates: UpdateStatusInput) {
  const { data, error } = await supabase
    .from('task_statuses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data: data as TaskStatusRecord | null, error };
}

export async function deleteTaskStatus(id: string) {
  const { data: status } = await supabase
    .from('task_statuses')
    .select('is_default')
    .eq('id', id)
    .maybeSingle();

  if (status?.is_default) {
    return { error: { message: 'Cannot delete default statuses' } };
  }

  const { data: tasksUsingStatus } = await supabase
    .from('tasks')
    .select('id')
    .eq('status_id', id)
    .limit(1);

  if (tasksUsingStatus && tasksUsingStatus.length > 0) {
    return { error: { message: 'Cannot delete status that is in use by tasks' } };
  }

  const { error } = await supabase
    .from('task_statuses')
    .delete()
    .eq('id', id);

  return { error };
}

export async function reorderStatuses(statusIds: string[]) {
  const updates = statusIds.map((id, index) => ({
    id,
    sort_order: index,
  }));

  for (const update of updates) {
    await supabase
      .from('task_statuses')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }

  return { error: null };
}

export async function getTaskCountByStatus(statusId: string) {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status_id', statusId)
    .is('deleted_at', null);

  return { count: count ?? 0, error };
}
