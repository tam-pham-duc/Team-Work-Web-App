import { supabase } from '../lib/supabase';
import type { TrashItem, TrashEntityType, RetentionSettings, User } from '../types/database';

export interface TrashFilters {
  entityType?: TrashEntityType;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface TrashStats {
  total: number;
  byType: {
    task: number;
    project: number;
    document: number;
    issue: number;
  };
  expiringSoon: number;
}

async function fetchDeletedTasks(): Promise<TrashItem[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      deleted_at,
      deleted_by,
      priority,
      status,
      project:projects(id, name),
      deleter:users!tasks_deleted_by_fkey(id, full_name, email, avatar_url)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted tasks:', error);
    return [];
  }

  return (data || []).map(task => ({
    id: `task-${task.id}`,
    entity_type: 'task' as TrashEntityType,
    entity_id: task.id,
    title: task.title,
    description: task.description,
    deleted_at: task.deleted_at!,
    deleted_by: task.deleted_by,
    deleter: task.deleter as User | null,
    metadata: {
      project_name: (task.project as { id: string; name: string } | null)?.name,
      project_id: (task.project as { id: string; name: string } | null)?.id,
      status: task.status,
      priority: task.priority,
    },
  }));
}

async function fetchDeletedProjects(): Promise<TrashItem[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      deleted_at,
      deleted_by,
      status,
      deleter:users!projects_deleted_by_fkey(id, full_name, email, avatar_url)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted projects:', error);
    return [];
  }

  return (data || []).map(project => ({
    id: `project-${project.id}`,
    entity_type: 'project' as TrashEntityType,
    entity_id: project.id,
    title: project.name,
    description: project.description,
    deleted_at: project.deleted_at!,
    deleted_by: project.deleted_by,
    deleter: project.deleter as User | null,
    metadata: {
      status: project.status,
    },
  }));
}

async function fetchDeletedDocuments(): Promise<TrashItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      excerpt,
      deleted_at,
      deleted_by,
      type,
      status,
      project:projects(id, name),
      deleter:users!documents_deleted_by_fkey(id, full_name, email, avatar_url)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted documents:', error);
    return [];
  }

  return (data || []).map(doc => ({
    id: `document-${doc.id}`,
    entity_type: 'document' as TrashEntityType,
    entity_id: doc.id,
    title: doc.title,
    description: doc.excerpt,
    deleted_at: doc.deleted_at!,
    deleted_by: doc.deleted_by,
    deleter: doc.deleter as User | null,
    metadata: {
      project_name: (doc.project as { id: string; name: string } | null)?.name,
      project_id: (doc.project as { id: string; name: string } | null)?.id,
      status: doc.type,
    },
  }));
}

async function fetchDeletedIssues(): Promise<TrashItem[]> {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      id,
      title,
      description,
      deleted_at,
      deleted_by,
      status,
      severity,
      project:projects(id, name),
      deleter:users!issues_deleted_by_fkey(id, full_name, email, avatar_url)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted issues:', error);
    return [];
  }

  return (data || []).map(issue => ({
    id: `issue-${issue.id}`,
    entity_type: 'issue' as TrashEntityType,
    entity_id: issue.id,
    title: issue.title,
    description: issue.description,
    deleted_at: issue.deleted_at!,
    deleted_by: issue.deleted_by,
    deleter: issue.deleter as User | null,
    metadata: {
      project_name: (issue.project as { id: string; name: string } | null)?.name,
      project_id: (issue.project as { id: string; name: string } | null)?.id,
      status: issue.status,
      severity: issue.severity,
    },
  }));
}

export async function fetchTrashItems(filters: TrashFilters = {}): Promise<TrashItem[]> {
  const fetchFunctions: Record<TrashEntityType, () => Promise<TrashItem[]>> = {
    task: fetchDeletedTasks,
    project: fetchDeletedProjects,
    document: fetchDeletedDocuments,
    issue: fetchDeletedIssues,
  };

  let items: TrashItem[] = [];

  if (filters.entityType) {
    items = await fetchFunctions[filters.entityType]();
  } else {
    const results = await Promise.all([
      fetchDeletedTasks(),
      fetchDeletedProjects(),
      fetchDeletedDocuments(),
      fetchDeletedIssues(),
    ]);
    items = results.flat();
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    items = items.filter(
      item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.dateRange) {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    items = items.filter(item => {
      const deletedAt = new Date(item.deleted_at);
      return deletedAt >= start && deletedAt <= end;
    });
  }

  items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

  return items;
}

export async function fetchTrashStats(): Promise<TrashStats> {
  const [tasks, projects, documents, issues, settings] = await Promise.all([
    fetchDeletedTasks(),
    fetchDeletedProjects(),
    fetchDeletedDocuments(),
    fetchDeletedIssues(),
    fetchRetentionSettings(),
  ]);

  const allItems = [...tasks, ...projects, ...documents, ...issues];
  const retentionDays = settings.days;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - retentionDays + 7);

  const expiringSoon = allItems.filter(item => {
    const deletedAt = new Date(item.deleted_at);
    const itemExpirationDate = new Date(deletedAt);
    itemExpirationDate.setDate(itemExpirationDate.getDate() + retentionDays);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((itemExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  }).length;

  return {
    total: allItems.length,
    byType: {
      task: tasks.length,
      project: projects.length,
      document: documents.length,
      issue: issues.length,
    },
    expiringSoon,
  };
}

export async function restoreItem(entityType: TrashEntityType, entityId: string): Promise<boolean> {
  const tableMap: Record<TrashEntityType, string> = {
    task: 'tasks',
    project: 'projects',
    document: 'documents',
    issue: 'issues',
  };

  const table = tableMap[entityType];
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', entityId);

  if (error) {
    console.error(`Error restoring ${entityType}:`, error);
    return false;
  }

  return true;
}

export async function permanentlyDeleteItem(entityType: TrashEntityType, entityId: string): Promise<boolean> {
  const tableMap: Record<TrashEntityType, string> = {
    task: 'tasks',
    project: 'projects',
    document: 'documents',
    issue: 'issues',
  };

  const table = tableMap[entityType];
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', entityId);

  if (error) {
    console.error(`Error permanently deleting ${entityType}:`, error);
    return false;
  }

  return true;
}

export async function fetchRetentionSettings(): Promise<RetentionSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'trash_retention_days')
    .maybeSingle();

  if (error || !data) {
    return { days: 30 };
  }

  return data.value as RetentionSettings;
}

export async function updateRetentionSettings(settings: RetentionSettings): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('system_settings')
    .update({
      value: settings,
      updated_by: user?.id,
    })
    .eq('key', 'trash_retention_days');

  if (error) {
    console.error('Error updating retention settings:', error);
    return false;
  }

  return true;
}

export async function purgeExpiredItems(): Promise<{ success: boolean; deletedCount: number }> {
  const settings = await fetchRetentionSettings();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.days);
  const cutoffDateStr = cutoffDate.toISOString();

  let deletedCount = 0;

  const tables = ['tasks', 'projects', 'documents', 'issues'] as const;

  for (const table of tables) {
    const { data: itemsToDelete } = await supabase
      .from(table)
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDateStr);

    if (itemsToDelete && itemsToDelete.length > 0) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', itemsToDelete.map(i => i.id));

      if (!error) {
        deletedCount += itemsToDelete.length;
      }
    }
  }

  return { success: true, deletedCount };
}

export async function emptyTrash(): Promise<{ success: boolean; deletedCount: number }> {
  let deletedCount = 0;

  const tables = ['tasks', 'projects', 'documents', 'issues'] as const;

  for (const table of tables) {
    const { data: itemsToDelete } = await supabase
      .from(table)
      .select('id')
      .not('deleted_at', 'is', null);

    if (itemsToDelete && itemsToDelete.length > 0) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', itemsToDelete.map(i => i.id));

      if (!error) {
        deletedCount += itemsToDelete.length;
      }
    }
  }

  return { success: true, deletedCount };
}
