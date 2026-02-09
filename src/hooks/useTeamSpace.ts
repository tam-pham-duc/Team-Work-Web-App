import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as teamSpaceService from '../services/teamSpaceService';
import type {
  DocumentWithRelations,
  DocumentCategory,
  DocumentTag,
  DocumentCommentWithUser,
  DocumentType,
  DocumentStatus
} from '../types/database';
import type { DocumentFilters, CreateDocumentInput, UpdateDocumentInput } from '../services/teamSpaceService';

interface UseTeamSpaceReturn {
  documents: DocumentWithRelations[];
  pinnedDocuments: DocumentWithRelations[];
  categories: DocumentCategory[];
  tags: DocumentTag[];
  filters: DocumentFilters;
  setFilters: (filters: DocumentFilters) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createDocument: (input: CreateDocumentInput) => Promise<{ success: boolean; documentId?: string }>;
  updateDocument: (id: string, input: UpdateDocumentInput) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  togglePin: (id: string, isPinned: boolean) => Promise<boolean>;
  updateDocumentTags: (documentId: string, tagIds: string[]) => Promise<boolean>;
  createTag: (name: string, color?: string) => Promise<DocumentTag | null>;
}

export function useTeamSpace(): UseTeamSpaceReturn {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([]);
  const [pinnedDocuments, setPinnedDocuments] = useState<DocumentWithRelations[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [filters, setFilters] = useState<DocumentFilters>({ status: 'published' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [docsResult, pinnedResult, categoriesResult, tagsResult] = await Promise.all([
        teamSpaceService.fetchDocuments(filters),
        teamSpaceService.fetchPinnedDocuments(),
        teamSpaceService.fetchCategories(),
        teamSpaceService.fetchTags()
      ]);

      if (docsResult.error) throw new Error(docsResult.error.message);
      if (pinnedResult.error) throw new Error(pinnedResult.error.message);
      if (categoriesResult.error) throw new Error(categoriesResult.error.message);
      if (tagsResult.error) throw new Error(tagsResult.error.message);

      setDocuments(docsResult.data || []);
      setPinnedDocuments(pinnedResult.data || []);
      setCategories(categoriesResult.data || []);
      setTags(tagsResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createDocument = useCallback(async (input: CreateDocumentInput) => {
    if (!user?.id) return { success: false };

    const { data, error } = await teamSpaceService.createDocument(input, user.id);
    if (error) {
      setError(error.message);
      return { success: false };
    }

    await fetchData();
    return { success: true, documentId: data?.id };
  }, [user?.id, fetchData]);

  const updateDocument = useCallback(async (id: string, input: UpdateDocumentInput) => {
    const { error } = await teamSpaceService.updateDocument(id, input);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const deleteDocument = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await teamSpaceService.deleteDocument(id, user.id);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, fetchData]);

  const togglePin = useCallback(async (id: string, isPinned: boolean) => {
    const { error } = await teamSpaceService.updateDocument(id, { is_pinned: isPinned });
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const updateDocumentTags = useCallback(async (documentId: string, tagIds: string[]) => {
    const { error } = await teamSpaceService.updateDocumentTags(documentId, tagIds);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const createTag = useCallback(async (name: string, color?: string) => {
    const { data, error } = await teamSpaceService.createTag(name, color);
    if (error) {
      setError(error.message);
      return null;
    }

    setTags(prev => [...prev, data!]);
    return data;
  }, []);

  return {
    documents,
    pinnedDocuments,
    categories,
    tags,
    filters,
    setFilters,
    loading,
    error,
    refetch: fetchData,
    createDocument,
    updateDocument,
    deleteDocument,
    togglePin,
    updateDocumentTags,
    createTag
  };
}

interface UseDocumentReturn {
  document: DocumentWithRelations | null;
  comments: DocumentCommentWithUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addComment: (content: string, parentId?: string) => Promise<boolean>;
  updateComment: (id: string, content: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;
  resolveComment: (id: string, resolved: boolean) => Promise<boolean>;
}

export function useDocument(documentId: string | null): UseDocumentReturn {
  const { user } = useAuth();
  const [document, setDocument] = useState<DocumentWithRelations | null>(null);
  const [comments, setComments] = useState<DocumentCommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!documentId) {
      setDocument(null);
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [docResult, commentsResult] = await Promise.all([
        teamSpaceService.fetchDocumentById(documentId),
        teamSpaceService.fetchDocumentComments(documentId)
      ]);

      if (docResult.error) throw new Error(docResult.error.message);

      setDocument(docResult.data);
      setComments(commentsResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addComment = useCallback(async (content: string, parentId?: string) => {
    if (!user?.id || !documentId) return false;

    const { data, error } = await teamSpaceService.createComment(documentId, user.id, content, parentId);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, documentId, fetchData]);

  const updateComment = useCallback(async (id: string, content: string) => {
    const { error } = await teamSpaceService.updateComment(id, content);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const deleteComment = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await teamSpaceService.deleteComment(id, user.id);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, fetchData]);

  const resolveComment = useCallback(async (id: string, resolved: boolean) => {
    const { error } = await teamSpaceService.resolveComment(id, resolved);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  return {
    document,
    comments,
    loading,
    error,
    refetch: fetchData,
    addComment,
    updateComment,
    deleteComment,
    resolveComment
  };
}
