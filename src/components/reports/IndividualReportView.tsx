import { User, CheckCircle2, Clock, Target, TrendingUp, FolderKanban } from 'lucide-react';
import type { IndividualReport } from '../../services/reportService';
import { formatMinutesToHours } from '../../services/reportService';
import { StatCard, StatGrid, MiniStat } from './StatCards';
import { BarChart, LineChart, PieChart } from './Charts';
import { ExportActions } from './ExportActions';

interface IndividualReportViewProps {
  report: IndividualReport;
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

export function IndividualReportView({ report, onExportCSV, onExportPDF }: IndividualReportViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {report.userAvatar ? (
            <img
              src={report.userAvatar}
              alt={report.userName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{report.userName}</h2>
            <p className="text-gray-500">{report.userEmail}</p>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ExportActions onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      </div>

      <StatGrid columns={4}>
        <StatCard
          label="Tasks Completed"
          value={report.summary.totalTasksCompleted}
          subValue={`${report.summary.avgTasksPerDay} per day avg`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          sparklineData={report.taskCompletionByDay.map((d) => d.count)}
        />
        <StatCard
          label="Time Logged"
          value={formatMinutesToHours(report.summary.totalTimeLogged)}
          subValue={`${formatMinutesToHours(report.summary.avgTimePerTask)} per task avg`}
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          sparklineData={report.timeLogsByDay.map((d) => d.minutes)}
        />
        <StatCard
          label="Completion Rate"
          value={`${report.summary.completionRate}%`}
          icon={<Target className="w-5 h-5 text-amber-600" />}
          color={report.summary.completionRate >= 75 ? 'success' : report.summary.completionRate >= 50 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Productivity Score"
          value={Math.round((report.summary.completionRate + (report.summary.avgTasksPerDay * 10)) / 2)}
          subValue="Composite score"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
        />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Trend</h3>
          <LineChart
            data={report.taskCompletionByDay.map((d) => ({
              label: d.date,
              value: d.count,
            }))}
            height={250}
            color="#10b981"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Logged Trend</h3>
          <LineChart
            data={report.timeLogsByDay.map((d) => ({
              label: d.date,
              value: d.minutes,
            }))}
            height={250}
            color="#3b82f6"
            formatValue={(v) => formatMinutesToHours(v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <PieChart
            data={report.tasksByStatus
              .filter((s) => s.count > 0)
              .map((s) => ({
                label: statusLabels[s.status] || s.status,
                value: s.count,
                color: statusColors[s.status],
              }))}
            size={180}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <PieChart
            data={report.tasksByPriority
              .filter((p) => p.count > 0)
              .map((p) => ({
                label: priorityLabels[p.priority] || p.priority,
                value: p.count,
                color: priorityColors[p.priority],
              }))}
            size={180}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Productivity Trend</h3>
          <BarChart
            data={report.productivityTrends.map((w) => ({
              label: w.week.split('-W')[1] ? `W${w.week.split('-W')[1]}` : w.week,
              value: w.tasksCompleted,
              color: '#10b981',
            }))}
            height={200}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-gray-500" />
            Top Projects
          </h3>
          <div className="space-y-3">
            {report.topProjects.map((project, index) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{project.projectName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-medium">
                    {project.tasksCompleted} tasks
                  </span>
                  <span className="text-gray-500">
                    {formatMinutesToHours(project.timeLogged)}
                  </span>
                </div>
              </div>
            ))}
            {report.topProjects.length === 0 && (
              <p className="text-gray-500 text-center py-4">No project data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
