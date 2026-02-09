import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as issueService from '../services/issueService';
import type {
  IssueWithRelations,
  IssueCommentWithUser,
  IssueActivityLogWithUser,
  IssueStatus,
  IssueSeverity
} from '../types/database';
import type { IssueFilters, CreateIssueInput, UpdateIssueInput } from '../services/issueService';

interface IssueStats {
  total: number;
  byStatus: Record<IssueStatus, number>;
  bySeverity: Record<IssueSeverity, number>;
}

interface UseIssuesReturn {
  issues: IssueWithRelations[];
  stats: IssueStats | null;
  filters: IssueFilters;
  setFilters: (filters: IssueFilters) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createIssue: (input: CreateIssueInput) => Promise<{ success: boolean; issueId?: string }>;
  updateIssue: (id: string, input: UpdateIssueInput) => Promise<boolean>;
  deleteIssue: (id: string) => Promise<boolean>;
}

export function useIssues(): UseIssuesReturn {
  const { user } = useAuth();
  const [issues, setIssues] = useState<IssueWithRelations[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [filters, setFilters] = useState<IssueFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [issuesResult, statsResult] = await Promise.all([
        issueService.fetchIssues(filters),
        issueService.fetchIssueStats()
      ]);

      if (issuesResult.error) throw new Error(issuesResult.error.message);
      if (statsResult.error) throw new Error(statsResult.error.message);

      setIssues(issuesResult.data || []);
      setStats(statsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createIssue = useCallback(async (input: CreateIssueInput) => {
    if (!user?.id) return { success: false };

    const { data, error } = await issueService.createIssue(input, user.id);
    if (error) {
      setError(error.message);
      return { success: false };
    }

    await fetchData();
    return { success: true, issueId: data?.id };
  }, [user?.id, fetchData]);

  const updateIssue = useCallback(async (id: string, input: UpdateIssueInput) => {
    const { error } = await issueService.updateIssue(id, input);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const deleteIssue = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await issueService.deleteIssue(id, user.id);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, fetchData]);

  return {
    issues,
    stats,
    filters,
    setFilters,
    loading,
    error,
    refetch: fetchData,
    createIssue,
    updateIssue,
    deleteIssue
  };
}

interface UseIssueDetailReturn {
  issue: IssueWithRelations | null;
  comments: IssueCommentWithUser[];
  activity: IssueActivityLogWithUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addComment: (content: string, isResolutionNote?: boolean) => Promise<boolean>;
  updateComment: (id: string, content: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;
  updateIssue: (input: UpdateIssueInput) => Promise<boolean>;
}

export function useIssueDetail(issueId: string | null): UseIssueDetailReturn {
  const { user } = useAuth();
  const [issue, setIssue] = useState<IssueWithRelations | null>(null);
  const [comments, setComments] = useState<IssueCommentWithUser[]>([]);
  const [activity, setActivity] = useState<IssueActivityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!issueId) {
      setIssue(null);
      setComments([]);
      setActivity([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [issueResult, commentsResult, activityResult] = await Promise.all([
        issueService.fetchIssueById(issueId),
        issueService.fetchIssueComments(issueId),
        issueService.fetchIssueActivity(issueId)
      ]);

      if (issueResult.error) throw new Error(issueResult.error.message);

      setIssue(issueResult.data);
      setComments(commentsResult.data || []);
      setActivity(activityResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addComment = useCallback(async (content: string, isResolutionNote = false) => {
    if (!user?.id || !issueId) return false;

    const { error } = await issueService.createIssueComment(issueId, user.id, content, isResolutionNote);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, issueId, fetchData]);

  const updateComment = useCallback(async (id: string, content: string) => {
    const { error } = await issueService.updateIssueComment(id, content);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [fetchData]);

  const deleteComment = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await issueService.deleteIssueComment(id, user.id);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [user?.id, fetchData]);

  const updateIssue = useCallback(async (input: UpdateIssueInput) => {
    if (!issueId) return false;

    const { error } = await issueService.updateIssue(issueId, input);
    if (error) {
      setError(error.message);
      return false;
    }

    await fetchData();
    return true;
  }, [issueId, fetchData]);

  return {
    issue,
    comments,
    activity,
    loading,
    error,
    refetch: fetchData,
    addComment,
    updateComment,
    deleteComment,
    updateIssue
  };
}
