import { BarChart3, User, FolderKanban, Users, Loader2 } from 'lucide-react';
import { useReports, type ReportType } from '../hooks/useReports';
import { formatMinutesToHours } from '../services/reportService';
import {
  ReportFiltersBar,
  IndividualReportView,
  ProjectReportView,
  TeamReportView,
} from '../components/reports';

const reportTabs: { type: ReportType; label: string; icon: typeof User; description: string }[] = [
  {
    type: 'team',
    label: 'Team Overview',
    icon: Users,
    description: 'Organization-wide metrics and performance',
  },
  {
    type: 'individual',
    label: 'Individual',
    icon: User,
    description: 'Personal productivity and task completion',
  },
  {
    type: 'project',
    label: 'Project',
    icon: FolderKanban,
    description: 'Project progress and resource utilization',
  },
];

export function ReportsPage() {
  const {
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
    refetch,
    exportCSV,
    printReport,
  } = useReports();

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (reportType === 'individual' && individualReport) {
      const data = individualReport.taskCompletionByDay.map((d) => ({
        Date: d.date,
        'Tasks Completed': d.count,
        'Time Logged (mins)': individualReport.timeLogsByDay.find((t) => t.date === d.date)?.minutes || 0,
      }));
      exportCSV(data, `individual-report-${individualReport.userName}-${timestamp}`);
    } else if (reportType === 'project' && projectReport) {
      const data = projectReport.memberStats.map((m) => ({
        'Team Member': m.userName,
        'Tasks Assigned': m.tasksAssigned,
        'Tasks Completed': m.tasksCompleted,
        'Completion Rate': `${m.completionRate}%`,
        'Time Logged': formatMinutesToHours(m.timeLogged),
      }));
      exportCSV(data, `project-report-${projectReport.projectName}-${timestamp}`);
    } else if (reportType === 'team' && teamReport) {
      const data = teamReport.projectsOverview.map((p) => ({
        Project: p.projectName,
        Status: p.status,
        'Tasks Completed': p.tasksCompleted,
        'Total Tasks': p.totalTasks,
        'Completion %': `${p.completionPercentage}%`,
        'Time Logged': formatMinutesToHours(p.timeLogged),
      }));
      exportCSV(data, `team-overview-${timestamp}`);
    }
  };

  const handleExportPDF = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    let title = 'Report';
    let contentHtml = '';

    if (reportType === 'individual' && individualReport) {
      title = `Individual Report - ${individualReport.userName}`;
      contentHtml = `
        <h1>${individualReport.userName} - Productivity Report</h1>
        <p class="subtitle">Period: ${new Date(individualReport.period.start).toLocaleDateString()} - ${new Date(individualReport.period.end).toLocaleDateString()}</p>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Tasks Completed</div>
            <div class="stat-value">${individualReport.summary.totalTasksCompleted}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Time Logged</div>
            <div class="stat-value">${formatMinutesToHours(individualReport.summary.totalTimeLogged)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Tasks/Day</div>
            <div class="stat-value">${individualReport.summary.avgTasksPerDay}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completion Rate</div>
            <div class="stat-value">${individualReport.summary.completionRate}%</div>
          </div>
        </div>

        <h2>Tasks by Status</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${individualReport.tasksByStatus.map((s) => `
              <tr>
                <td>${s.status}</td>
                <td>${s.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Top Projects</h2>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Tasks Completed</th>
              <th>Time Logged</th>
            </tr>
          </thead>
          <tbody>
            ${individualReport.topProjects.map((p) => `
              <tr>
                <td>${p.projectName}</td>
                <td>${p.tasksCompleted}</td>
                <td>${formatMinutesToHours(p.timeLogged)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'project' && projectReport) {
      title = `Project Report - ${projectReport.projectName}`;
      contentHtml = `
        <h1>${projectReport.projectName} - Project Report</h1>
        <p class="subtitle">Period: ${new Date(projectReport.period.start).toLocaleDateString()} - ${new Date(projectReport.period.end).toLocaleDateString()}</p>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Completion</div>
            <div class="stat-value">${projectReport.summary.completionPercentage}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value">${projectReport.summary.totalTasks}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Time Logged</div>
            <div class="stat-value">${formatMinutesToHours(projectReport.summary.totalTimeLogged)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Blocked</div>
            <div class="stat-value">${projectReport.summary.blockedTasks}</div>
          </div>
        </div>

        <h2>Task Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${projectReport.taskBreakdown.map((t) => `
              <tr>
                <td>${t.status}</td>
                <td>${t.count}</td>
                <td>${t.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Team Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>Rate</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${projectReport.memberStats.map((m) => `
              <tr>
                <td>${m.userName}</td>
                <td>${m.tasksAssigned}</td>
                <td>${m.tasksCompleted}</td>
                <td>${m.completionRate}%</td>
                <td>${formatMinutesToHours(m.timeLogged)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'team' && teamReport) {
      title = 'Team Overview Report';
      contentHtml = `
        <h1>Team Overview Report</h1>
        <p class="subtitle">Period: ${new Date(teamReport.period.start).toLocaleDateString()} - ${new Date(teamReport.period.end).toLocaleDateString()}</p>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Projects</div>
            <div class="stat-value">${teamReport.summary.totalProjects}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tasks Done</div>
            <div class="stat-value">${teamReport.summary.completedTasks}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Time Logged</div>
            <div class="stat-value">${formatMinutesToHours(teamReport.summary.totalTimeLogged)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg. Completion</div>
            <div class="stat-value">${teamReport.summary.avgCompletionRate}%</div>
          </div>
        </div>

        <h2>Projects Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Tasks</th>
              <th>Progress</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${teamReport.projectsOverview.map((p) => `
              <tr>
                <td>${p.projectName}</td>
                <td>${p.status}</td>
                <td>${p.tasksCompleted}/${p.totalTasks}</td>
                <td>${p.completionPercentage}%</td>
                <td>${formatMinutesToHours(p.timeLogged)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Top Performers</h2>
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Tasks Done</th>
              <th>Time Logged</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            ${teamReport.topPerformers.map((p) => `
              <tr>
                <td>${p.userName}</td>
                <td>${p.tasksCompleted}</td>
                <td>${formatMinutesToHours(p.timeLogged)}</td>
                <td>${p.completionRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    printReport(title, contentHtml);
  };

  const showEmptyState = () => {
    if (reportType === 'individual' && !filters.userId) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Team Member</h3>
          <p className="text-gray-500">
            Choose a user from the filters above to view their individual report
          </p>
        </div>
      );
    }

    if (reportType === 'project' && !filters.projectId) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Project</h3>
          <p className="text-gray-500">
            Choose a project from the filters above to view its detailed report
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-gray-500" />
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Track performance, analyze trends, and export insights
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-1">
        <div className="flex gap-1">
          {reportTabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setReportType(tab.type)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                reportType === tab.type
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ReportFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        reportType={reportType}
        availableUsers={availableUsers}
        availableProjects={availableProjects}
        onRefresh={refetch}
        loading={loading}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Generating report...</p>
        </div>
      ) : (
        <>
          {showEmptyState()}

          {reportType === 'individual' && individualReport && (
            <IndividualReportView
              report={individualReport}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          )}

          {reportType === 'project' && projectReport && (
            <ProjectReportView
              report={projectReport}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          )}

          {reportType === 'team' && teamReport && (
            <TeamReportView
              report={teamReport}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          )}
        </>
      )}
    </div>
  );
}
