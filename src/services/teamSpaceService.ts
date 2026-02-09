import { supabase } from '../lib/supabase';
import type {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentCategory,
  DocumentTag,
  DocumentWithRelations,
  DocumentCommentWithUser
} from '../types/database';

export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus;
  categoryId?: string;
  tagIds?: string[];
  authorId?: string;
  projectId?: string;
  search?: string;
  isPinned?: boolean;
}

export interface CreateDocumentInput {
  title: string;
  content?: string;
  excerpt?: string;
  type: DocumentType;
  status?: DocumentStatus;
  category_id?: string;
  project_id?: string;
  task_id?: string;
  issue_id?: string;
  tagIds?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  excerpt?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  category_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  issue_id?: string | null;
  is_pinned?: boolean;
}

export async function fetchDocuments(filters: DocumentFilters = {}) {
  let query = supabase
    .from('documents')
    .select(`
      *,
      author:users!documents_author_id_fkey(id, full_name, email, avatar_url),
      category:document_categories(id, name, slug, color, icon),
      project:projects(id, name),
      task:tasks(id, title),
      issue:issues(id, title)
    `)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.authorId) {
    query = query.eq('author_id', filters.authorId);
  }
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters.isPinned !== undefined) {
    query = query.eq('is_pinned', filters.isPinned);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  if (filters.tagIds?.length && data) {
    const { data: tagRelations } = await supabase
      .from('document_tag_relations')
      .select('document_id, tag_id')
      .in('tag_id', filters.tagIds);

    const docIdsWithTags = new Set(tagRelations?.map(r => r.document_id) || []);
    const filteredData = data.filter(doc => docIdsWithTags.has(doc.id));
    return { data: filteredData as DocumentWithRelations[], error: null };
  }

  return { data: data as DocumentWithRelations[], error: null };
}

export async function fetchDocumentById(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:users!documents_author_id_fkey(id, full_name, email, avatar_url),
      category:document_categories(id, name, slug, color, icon),
      project:projects(id, name),
      task:tasks(id, title),
      issue:issues(id, title)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error };
  }

  const { data: tagRelations } = await supabase
    .from('document_tag_relations')
    .select(`
      tag:document_tags(id, name, slug, color)
    `)
    .eq('document_id', id);

  const tags = tagRelations?.map(r => r.tag).filter(Boolean) || [];

  await supabase
    .from('documents')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id);

  return {
    data: { ...data, tags } as DocumentWithRelations,
    error: null
  };
}

export async function createDocument(input: CreateDocumentInput, authorId: string) {
  const { tagIds, ...documentData } = input;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...documentData,
      author_id: authorId,
      status: input.status || 'draft'
    })
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  if (tagIds?.length) {
    await supabase
      .from('document_tag_relations')
      .insert(tagIds.map(tagId => ({
        document_id: data.id,
        tag_id: tagId
      })));
  }

  return { data: data as Document, error: null };
}

export async function updateDocument(id: string, input: UpdateDocumentInput) {
  const updateData: Record<string, unknown> = { ...input };

  if (input.is_pinned === true) {
    const { data: { user } } = await supabase.auth.getUser();
    updateData.pinned_at = new Date().toISOString();
    updateData.pinned_by = user?.id;
  } else if (input.is_pinned === false) {
    updateData.pinned_at = null;
    updateData.pinned_by = null;
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  return { data: data as Document, error };
}

export async function deleteDocument(id: string, userId: string) {
  const { data, error } = await supabase
    .from('documents')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function updateDocumentTags(documentId: string, tagIds: string[]) {
  await supabase
    .from('document_tag_relations')
    .delete()
    .eq('document_id', documentId);

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('document_tag_relations')
      .insert(tagIds.map(tagId => ({
        document_id: documentId,
        tag_id: tagId
      })));

    return { error };
  }

  return { error: null };
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .order('sort_order');

  return { data: data as DocumentCategory[], error };
}

export async function fetchTags() {
  const { data, error } = await supabase
    .from('document_tags')
    .select('*')
    .order('name');

  return { data: data as DocumentTag[], error };
}

export async function createTag(name: string, color?: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { data, error } = await supabase
    .from('document_tags')
    .insert({ name, slug, color: color || '#6b7280' })
    .select()
    .single();

  return { data: data as DocumentTag, error };
}

export async function fetchDocumentComments(documentId: string) {
  const { data, error } = await supabase
    .from('document_comments')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return { data: null, error };
  }

  const topLevelComments = data.filter(c => !c.parent_id);
  const replies = data.filter(c => c.parent_id);

  const commentsWithReplies = topLevelComments.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id)
  }));

  return { data: commentsWithReplies as DocumentCommentWithUser[], error: null };
}

export async function createComment(documentId: string, userId: string, content: string, parentId?: string) {
  const { data, error } = await supabase
    .from('document_comments')
    .insert({
      document_id: documentId,
      user_id: userId,
      content,
      parent_id: parentId || null
    })
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .single();

  return { data: data as DocumentCommentWithUser, error };
}

export async function updateComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('document_comments')
    .update({ content })
    .eq('id', id)
    .select(`
      *,
      user:users(id, full_name, email, avatar_url)
    `)
    .single();

  return { data: data as DocumentCommentWithUser, error };
}

export async function deleteComment(id: string, userId: string) {
  const { error } = await supabase
    .from('document_comments')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', id);

  return { error };
}

export async function resolveComment(id: string, resolved: boolean) {
  const { data, error } = await supabase
    .from('document_comments')
    .update({ is_resolved: resolved })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function fetchPinnedDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:users!documents_author_id_fkey(id, full_name, email, avatar_url),
      category:document_categories(id, name, slug, color, icon)
    `)
    .eq('is_pinned', true)
    .is('deleted_at', null)
    .eq('status', 'published')
    .order('pinned_at', { ascending: false });

  return { data: data as DocumentWithRelations[], error };
}

export async function fetchRecentDocuments(limit = 10) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:users!documents_author_id_fkey(id, full_name, email, avatar_url),
      category:document_categories(id, name, slug, color, icon)
    `)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data as DocumentWithRelations[], error };
}

export async function fetchLinkedEntities() {
  const [projectsResult, tasksResult, issuesResult] = await Promise.all([
    supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('tasks').select('id, title').is('deleted_at', null).order('title'),
    supabase.from('issues').select('id, title').is('deleted_at', null).order('title')
  ]);

  return {
    projects: projectsResult.data || [],
    tasks: tasksResult.data || [],
    issues: issuesResult.data || []
  };
}
