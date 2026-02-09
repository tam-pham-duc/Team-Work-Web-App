import { supabase } from '../lib/supabase';
import type { Project, ProjectStatus, ProjectRole, InsertTables, UpdateTables } from '../types/database';

export interface ProjectFilters {
  status?: ProjectStatus[];
  search?: string;
  ownerId?: string;
}

export async function fetchProjects(filters: ProjectFilters = {}) {
  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, full_name, email, avatar_url),
      members:project_members(
        id,
        role,
        joined_at,
        user:users(id, full_name, email, avatar_url)
      )
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function fetchProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, full_name, email, avatar_url),
      members:project_members(
        id,
        role,
        joined_at,
        user:users(id, full_name, email, avatar_url)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  return { data, error };
}

export async function createProject(project: InsertTables<'projects'>) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (data && !error) {
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: project.owner_id,
      role: 'owner',
    });

    await logActivity('project', data.id, 'created', { project: data });
  }

  return { data, error };
}

export async function updateProject(id: string, updates: UpdateTables<'projects'>) {
  const { data: oldProject } = await supabase.from('projects').select().eq('id', id).single();

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('project', id, 'updated', { old: oldProject, new: data });
  }

  return { data, error };
}

export async function deleteProject(id: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    await logActivity('project', id, 'deleted', { project: data });
  }

  return { data, error };
}

export async function fetchProjectMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('joined_at');

  return { data, error };
}

export async function addProjectMember(projectId: string, userId: string, role: ProjectRole = 'member') {
  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { data: null, error: { message: 'User is already a member' } };
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role })
    .select(`*, user:users(id, full_name, email, avatar_url)`)
    .single();

  if (data && !error) {
    await logActivity('project', projectId, 'member_added', {
      user_id: userId,
      role
    });
  }

  return { data, error };
}

export async function updateProjectMemberRole(memberId: string, role: ProjectRole) {
  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId)
    .select(`*, user:users(id, full_name, email, avatar_url)`)
    .single();

  if (data && !error) {
    await logActivity('project', data.project_id, 'member_role_changed', {
      user_id: data.user_id,
      new_role: role
    });
  }

  return { data, error };
}

export async function removeProjectMember(memberId: string) {
  const { data: member } = await supabase
    .from('project_members')
    .select('project_id, user_id')
    .eq('id', memberId)
    .single();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (member && !error) {
    await logActivity('project', member.project_id, 'member_removed', {
      user_id: member.user_id
    });
  }

  return { error };
}

export async function fetchProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function fetchProjectStats(projectId: string) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  const { data: timeLogs } = await supabase
    .from('time_logs')
    .select(`
      duration_minutes,
      user_id,
      user:users(id, full_name)
    `)
    .in('task_id', (tasks || []).map(t => t.id));

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const blockedTasks = tasks?.filter(t => t.status === 'blocked').length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalTimeLogged = (timeLogs || []).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

  const timeByMemberMap = new Map<string, { userId: string; userName: string; minutes: number }>();
  (timeLogs || []).forEach(log => {
    if (!log.user_id) return;
    const existing = timeByMemberMap.get(log.user_id);
    if (existing) {
      existing.minutes += log.duration_minutes || 0;
    } else {
      timeByMemberMap.set(log.user_id, {
        userId: log.user_id,
        userName: (log.user as { full_name: string })?.full_name || 'Unknown',
        minutes: log.duration_minutes || 0,
      });
    }
  });

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    completionPercentage,
    totalTimeLogged,
    timeByMember: Array.from(timeByMemberMap.values()).sort((a, b) => b.minutes - a.minutes),
  };
}

export async function fetchProjectActivity(projectId: string) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('entity_type', 'project')
    .eq('entity_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .is('deleted_at', null)
    .order('full_name');

  return { data, error };
}

export async function searchUsersByEmail(query: string) {
  if (!query || query.length < 2) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('search_users_by_email', { query });

  return { data: data as { id: string; full_name: string; email: string; avatar_url: string | null }[] | null, error };
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
