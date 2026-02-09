import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin as checkIsAdmin } from '../lib/rbac';
import * as dashboardService from '../services/dashboardService';
import type {
  DashboardFilters,
  TaskStatusStats,
  ProjectStatusStats,
  TimeLogStats,
  ProductivityTrend,
  TeamMemberStats
} from '../services/dashboardService';

interface DashboardData {
  taskStats: TaskStatusStats | null;
  projectStats: ProjectStatusStats | null;
  timeStats: TimeLogStats | null;
  productivityTrends: ProductivityTrend[];
  teamStats: TeamMemberStats[];
}

interface FilterOptions {
  projects: { id: string; name: string }[];
  teamMembers: { id: string; name: string }[];
}

interface UseDashboardReturn extends DashboardData {
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  filterOptions: FilterOptions;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isAdmin: boolean;
}

const defaultFilters: DashboardFilters = {
  dateRange: 'month'
};

export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [data, setData] = useState<DashboardData>({
    taskStats: null,
    projectStats: null,
    timeStats: null,
    productivityTrends: [],
    teamStats: []
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    teamMembers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = checkIsAdmin(user);

  const fetchFilterOptions = useCallback(async () => {
    const [projectsResult, membersResult] = await Promise.all([
      dashboardService.fetchUserProjects(),
      isAdmin ? dashboardService.fetchTeamMembers() : Promise.resolve({ data: [], error: null })
    ]);

    setFilterOptions({
      projects: projectsResult.data || [],
      teamMembers: membersResult.data || []
    });
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [taskStatsResult, projectStatsResult, timeStatsResult, trendsResult, teamStatsResult] = await Promise.all([
        dashboardService.fetchTaskStats(filters, isAdmin, user.id),
        dashboardService.fetchProjectStats(filters, isAdmin, user.id),
        dashboardService.fetchTimeStats(filters, isAdmin, user.id),
        dashboardService.fetchProductivityTrends(filters, isAdmin, user.id),
        isAdmin ? dashboardService.fetchTeamStats(filters) : Promise.resolve({ data: [], error: null })
      ]);

      if (taskStatsResult.error) throw taskStatsResult.error;
      if (projectStatsResult.error) throw projectStatsResult.error;
      if (timeStatsResult.error) throw timeStatsResult.error;
      if (trendsResult.error) throw trendsResult.error;
      if (teamStatsResult.error) throw teamStatsResult.error;

      setData({
        taskStats: taskStatsResult.data,
        projectStats: projectStatsResult.data,
        timeStats: timeStatsResult.data,
        productivityTrends: trendsResult.data || [],
        teamStats: teamStatsResult.data || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters, isAdmin]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    filters,
    setFilters,
    filterOptions,
    loading,
    error,
    refetch: fetchData,
    isAdmin
  };
}
