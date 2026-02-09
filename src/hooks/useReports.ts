import { useState, useEffect, useCallback } from 'react';
import * as reportService from '../services/reportService';
import type {
  ReportFilters,
  IndividualReport,
  ProjectReport,
  TeamOverviewReport,
} from '../services/reportService';

export type ReportType = 'individual' | 'project' | 'team';

interface UseReportsReturn {
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  filters: ReportFilters;
  setFilters: (filters: ReportFilters) => void;
  individualReport: IndividualReport | null;
  projectReport: ProjectReport | null;
  teamReport: TeamOverviewReport | null;
  loading: boolean;
  error: string | null;
  availableUsers: { id: string; full_name: string }[];
  availableProjects: { id: string; name: string }[];
  refetch: () => void;
  exportCSV: (data: Record<string, unknown>[], filename: string) => void;
  printReport: (title: string, contentHtml: string) => void;
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function useReports(): UseReportsReturn {
  const [reportType, setReportType] = useState<ReportType>('team');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: getDefaultDateRange(),
  });
  const [individualReport, setIndividualReport] = useState<IndividualReport | null>(null);
  const [projectReport, setProjectReport] = useState<ProjectReport | null>(null);
  const [teamReport, setTeamReport] = useState<TeamOverviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      const [users, projects] = await Promise.all([
        reportService.fetchAvailableUsers(),
        reportService.fetchAvailableProjects(),
      ]);
      setAvailableUsers(users);
      setAvailableProjects(projects);
    };
    loadOptions();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      switch (reportType) {
        case 'individual':
          if (filters.userId) {
            const report = await reportService.fetchIndividualReport(filters);
            setIndividualReport(report);
          } else {
            setIndividualReport(null);
          }
          break;
        case 'project':
          if (filters.projectId) {
            const report = await reportService.fetchProjectReport(filters);
            setProjectReport(report);
          } else {
            setProjectReport(null);
          }
          break;
        case 'team':
          const report = await reportService.fetchTeamOverviewReport(filters);
          setTeamReport(report);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [reportType, filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCSV = useCallback((data: Record<string, unknown>[], filename: string) => {
    reportService.exportToCSV(data, filename);
  }, []);

  const printReport = useCallback((title: string, contentHtml: string) => {
    reportService.generatePrintableReport(title, contentHtml);
  }, []);

  return {
    reportType,
    setReportType,
    filters,
    setFilters,
    individualReport,
    projectReport,
    teamReport,
    loading,
    error,
    availableUsers,
    availableProjects,
    refetch: fetchReport,
    exportCSV,
    printReport,
  };
}
