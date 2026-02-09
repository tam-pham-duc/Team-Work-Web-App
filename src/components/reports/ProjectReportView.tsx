import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
} from 'lucide-react';
import type { ProjectReport } from '../../services/reportService';
import { formatMinutesToHours } from '../../services/reportService';
import { StatCard, StatGrid } from './StatCards';
import { BarChart, LineChart, PieChart, ProgressBar } from './Charts';
import { TeamMemberTable } from './SummaryTables';
import { ExportActions } from './ExportActions';

interface ProjectReportViewProps {
  report: ProjectReport;
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

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const priorityColors: Record<string, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

const projectStatusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-600',
};

export function ProjectReportView({ report, onExportCSV, onExportPDF }: ProjectReportViewProps) {
  const timeVarianceColor = report.summary.timeVariance > 20
    ? 'text-red-600'
    : report.summary.timeVariance > 0
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
            <FolderKanban className="w-7 h-7 text-gray-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{report.projectName}</h2>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${projectStatusColors[report.projectStatus]}`}>
                {report.projectStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Report period: {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ExportActions onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      </div>

      <StatGrid columns={4}>
        <StatCard
          label="Completion"
          value={`${report.summary.completionPercentage}%`}
          subValue={`${report.summary.completedTasks} of ${report.summary.totalTasks} tasks`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          color={report.summary.completionPercentage >= 75 ? 'success' : 'default'}
        />
        <StatCard
          label="Time Logged"
          value={formatMinutesToHours(report.summary.totalTimeLogged)}
          subValue={`Est. ${report.summary.estimatedHours}h`}
          icon={<Clock className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="Blocked Tasks"
          value={report.summary.blockedTasks}
          subValue={report.summary.blockedTasks > 0 ? 'Needs attention' : 'No blockers'}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          color={report.summary.blockedTasks > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Days Remaining"
          value={report.summary.daysRemaining !== null ? report.summary.daysRemaining : 'N/A'}
          subValue={report.summary.daysRemaining !== null && report.summary.daysRemaining < 0 ? 'Overdue' : 'Until deadline'}
          icon={<Calendar className="w-5 h-5 text-indigo-600" />}
          color={report.summary.daysRemaining !== null && report.summary.daysRemaining < 0 ? 'danger' : 'default'}
        />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Over Time</h3>
          <LineChart
            data={report.progressOverTime.map((d) => ({
              label: d.date,
              value: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
            }))}
            height={250}
            color="#10b981"
            formatValue={(v) => `${v}%`}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Variance</h3>
          <div className="text-center py-6">
            <p className={`text-4xl font-bold ${timeVarianceColor}`}>
              {report.summary.timeVariance > 0 ? '+' : ''}{report.summary.timeVariance}%
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {report.summary.timeVariance > 0 ? 'Over budget' : report.summary.timeVariance < 0 ? 'Under budget' : 'On track'}
            </p>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated</span>
              <span className="font-medium">{report.summary.estimatedHours}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Actual</span>
              <span className="font-medium">{formatMinutesToHours(report.summary.totalTimeLogged)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg. per task</span>
              <span className="font-medium">{formatMinutesToHours(report.summary.avgTaskCompletionTime)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Breakdown by Status</h3>
          <div className="space-y-4">
            {report.taskBreakdown.map((item) => (
              <div key={item.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{statusLabels[item.status]}</span>
                  <span className="font-medium">{item.count} ({item.percentage}%)</span>
                </div>
                <ProgressBar
                  value={item.percentage}
                  color={statusColors[item.status]}
                  showLabel={false}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <BarChart
            data={report.tasksByPriority.map((p) => ({
              label: priorityLabels[p.priority],
              value: p.count,
              color: priorityColors[p.priority],
            }))}
            height={200}
          />
          <div className="flex justify-center gap-6 mt-4 text-sm">
            {report.tasksByPriority.map((p) => (
              <div key={p.priority} className="text-center">
                <p className="text-gray-500">{priorityLabels[p.priority]}</p>
                <p className="font-medium">
                  <span className="text-emerald-600">{p.completed}</span>
                  <span className="text-gray-400">/{p.count}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          Team Member Performance
        </h3>
        <TeamMemberTable members={report.memberStats} />
      </div>

      {report.recentActivity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {report.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>{' '}
                    <span className="text-gray-500">{activity.action}</span>{' '}
                    <span className="font-medium">{activity.taskTitle}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(activity.date).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
