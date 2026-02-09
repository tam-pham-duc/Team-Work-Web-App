import { supabase } from '../lib/supabase';
import type {
  Issue,
  IssueStatus,
  IssueSeverity,
  IssueWithRelations,
  IssueCommentWithUser,
  IssueActivityLogWithUser
} from '../types/database';

export interface IssueFilters {
  status?: IssueStatus[];
  severity?: IssueSeverity[];
  projectId?: string;
  taskId?: string;
  assigneeId?: string;
  reporterId?: string;
  search?: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  severity: IssueSeverity;
  project_id?: string;
  task_id?: string;
  assigned_to?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  project_id?: string | null;
  task_id?: string | null;
  assigned_to?: string | null;
}

export async function fetchIssues(filters: IssueFilters = {}) {
  let query = supabase
    .from('issues')
    .select(`
      *,
      reporter:users!issues_reported_by_fkey(id, full_name, email, avatar_url),
      assignee:users!issues_assigned_to_fkey(id, full_name, email, avatar_url),
      project:projects(id, name),
      task:tasks(id, title)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters.severity?.length) {
    query = query.in('severity', filters.severity);
  }
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters.taskId) {
    query = query.eq('task_id', filters.taskId);
  }
  if (filters.assigneeId) {
    query = query.eq('assigned_to', filters.assigneeId);
  }
  if (filters.reporterId) {
    query = query.eq('reported_by', filters.reporterId);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return { data: data as IssueWithRelations[], error };
}

export async function fetchIssueById(id: string) {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      reporter:users!issues_reported_by_fkey(id, full_name, email, avatar_url),
      assignee:users!issues_assigned_to_fkey(id, full_name, email, avatar_url),
      project:projects(id, name),
      task:tasks(id, title)
    `)
    .eq('id', id)
    .maybeSingle();

  return { data: data as IssueWithRelations, error };
}

export async function createIssue(input: CreateIssueInput, reporterId: string) {
  const { data, error } = await supabase
    .from('issues')
    .insert({
      ...input,
      reported_by: reporterId,
      status: 'open'
    })
    .select()
    .single();

  return { data: data as Issue, error };
}

export async function updateIssue(id: string, input: UpdateIssueInput) {
  const updateData: Record<string, unknown> = { ...input };

  if (input.status === 'resolved' || input.status === 'closed') {
    updateData.resolved_at = new Date().toISOString();
  } else if (input.status === 'open' || input.status === 'in_progress') {
    updateData.resolved_at = null;
  }

  const { data, error } = await supabase
    .from('issues')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  return { data: data as Issue, error };
}

export async function deleteIssue(id: string, userId: string) {
  const { data, error } = await supabase
    .from('issues')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function fetchIssueComments(issueId: string) {
  const { data, error } = await supabase
    .from('issue_comments')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  return { data: data as IssueCommentWithUser[], error };
}

export async function createIssueComment(
  issueId: string,
  userId: string,
  content: string,
  isResolutionNote = false
) {
  const { data, error } = await supabase
    .from('issue_comments')
    .insert({
      issue_id: issueId,
      user_id: userId,
      content,
      is_resolution_note: isResolutionNote
    })
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .single();

  return { data: data as IssueCommentWithUser, error };
}

export async function updateIssueComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('issue_comments')
    .update({ content })
    .eq('id', id)
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .single();

  return { data: data as IssueCommentWithUser, error };
}

export async function deleteIssueComment(id: string, userId: string) {
  const { error } = await supabase
    .from('issue_comments')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', id);

  return { error };
}

export async function fetchIssueActivity(issueId: string) {
  const { data, error } = await supabase
    .from('issue_activity_logs')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data: data as IssueActivityLogWithUser[], error };
}

export async function fetchIssueStats() {
  const { data: issues, error } = await supabase
    .from('issues')
    .select('status, severity')
    .is('deleted_at', null);

  if (error) {
    return { data: null, error };
  }

  const stats = {
    total: issues?.length || 0,
    byStatus: {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      wont_fix: 0
    },
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
  };

  for (const issue of issues || []) {
    stats.byStatus[issue.status as IssueStatus]++;
    stats.bySeverity[issue.severity as IssueSeverity]++;
  }

  return { data: stats, error: null };
}

export async function fetchLinkedEntities() {
  const [projectsResult, tasksResult, usersResult] = await Promise.all([
    supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('tasks').select('id, title').is('deleted_at', null).order('title'),
    supabase.from('users').select('id, full_name, email, avatar_url').is('deleted_at', null).order('full_name')
  ]);

  return {
    projects: projectsResult.data || [],
    tasks: tasksResult.data || [],
    users: usersResult.data || []
  };
}
