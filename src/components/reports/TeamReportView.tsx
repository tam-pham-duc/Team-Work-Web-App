import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Award,
} from 'lucide-react';
import type { TeamOverviewReport } from '../../services/reportService';
import { formatMinutesToHours } from '../../services/reportService';
import { StatCard, StatGrid } from './StatCards';
import { BarChart, PieChart } from './Charts';
import { ProjectOverviewTable, TopPerformersTable } from './SummaryTables';
import { ExportActions } from './ExportActions';

interface TeamReportViewProps {
  report: TeamOverviewReport;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  blocked: 'Blocked',
};

const statusColors: Record<string, string> = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  completed: '#10b981',
  blocked: '#ef4444',
};

export function TeamReportView({ report, onExportCSV, onExportPDF }: TeamReportViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
          </p>
        </div>
        <ExportActions onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      </div>

      <StatGrid columns={4}>
        <StatCard
          label="Total Projects"
          value={report.summary.totalProjects}
          subValue={`${report.summary.activeProjects} active`}
          icon={<FolderKanban className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="Tasks Completed"
          value={report.summary.completedTasks}
          subValue={`of ${report.summary.totalTasks} total`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Time Logged"
          value={formatMinutesToHours(report.summary.totalTimeLogged)}
          subValue="Total team effort"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          label="Avg. Completion"
          value={`${report.summary.avgCompletionRate}%`}
          subValue="Across all projects"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          color={report.summary.avgCompletionRate >= 75 ? 'success' : 'default'}
        />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <PieChart
            data={report.taskDistribution
              .filter((s) => s.count > 0)
              .map((s) => ({
                label: statusLabels[s.status] || s.status,
                value: s.count,
                color: statusColors[s.status],
              }))}
            size={200}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <BarChart
            data={report.taskDistribution.map((s) => ({
              label: statusLabels[s.status] || s.status,
              value: s.count,
              color: statusColors[s.status],
            }))}
            height={220}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-gray-500" />
          Projects Overview
        </h3>
        <ProjectOverviewTable projects={report.projectsOverview} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Top Performers
        </h3>
        <TopPerformersTable performers={report.topPerformers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Completion Rates</h3>
          <BarChart
            data={report.projectsOverview.slice(0, 8).map((p) => ({
              label: p.projectName,
              value: p.completionPercentage,
              color: p.completionPercentage >= 75 ? '#10b981' : p.completionPercentage >= 50 ? '#f59e0b' : '#3b82f6',
            }))}
            height={250}
            formatValue={(v) => `${v}%`}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution by Project</h3>
          <PieChart
            data={report.projectsOverview
              .filter((p) => p.timeLogged > 0)
              .slice(0, 6)
              .map((p, i) => ({
                label: p.projectName,
                value: p.timeLogged,
              }))}
            size={200}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          Team Performance Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {report.topPerformers.reduce((sum, p) => sum + p.tasksCompleted, 0)}
            </p>
            <p className="text-sm text-emerald-700 mt-1">Total Tasks Done</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-600">
              {formatMinutesToHours(report.topPerformers.reduce((sum, p) => sum + p.timeLogged, 0))}
            </p>
            <p className="text-sm text-blue-700 mt-1">Total Time Logged</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-amber-600">
              {report.topPerformers.length > 0
                ? Math.round(report.topPerformers.reduce((sum, p) => sum + p.completionRate, 0) / report.topPerformers.length)
                : 0}%
            </p>
            <p className="text-sm text-amber-700 mt-1">Avg. Completion Rate</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-indigo-600">
              {report.topPerformers.length}
            </p>
            <p className="text-sm text-indigo-700 mt-1">Active Members</p>
          </div>
        </div>
      </div>
    </div>
  );
}
