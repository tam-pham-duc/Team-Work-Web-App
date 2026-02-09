import { User } from 'lucide-react';
import { ProgressBar } from './Charts';
import { formatMinutesToHours } from '../../services/reportService';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`py-3 px-4 text-sm ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TeamMemberTableProps {
  members: {
    userId: string;
    userName: string;
    userAvatar: string | null;
    tasksAssigned: number;
    tasksCompleted: number;
    timeLogged: number;
    completionRate: number;
  }[];
}

export function TeamMemberTable({ members }: TeamMemberTableProps) {
  return (
    <DataTable
      data={members}
      columns={[
        {
          key: 'userName',
          label: 'Team Member',
          render: (item) => (
            <div className="flex items-center gap-3">
              {item.userAvatar ? (
                <img
                  src={item.userAvatar}
                  alt={item.userName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <span className="font-medium text-gray-900">{item.userName}</span>
            </div>
          ),
        },
        {
          key: 'tasksAssigned',
          label: 'Assigned',
          align: 'center',
          render: (item) => <span className="text-gray-600">{item.tasksAssigned}</span>,
        },
        {
          key: 'tasksCompleted',
          label: 'Completed',
          align: 'center',
          render: (item) => <span className="font-medium text-gray-900">{item.tasksCompleted}</span>,
        },
        {
          key: 'completionRate',
          label: 'Progress',
          render: (item) => (
            <div className="w-32">
              <ProgressBar
                value={item.completionRate}
                color={item.completionRate >= 75 ? '#10b981' : item.completionRate >= 50 ? '#f59e0b' : '#ef4444'}
              />
            </div>
          ),
        },
        {
          key: 'timeLogged',
          label: 'Time Logged',
          align: 'right',
          render: (item) => (
            <span className="text-gray-600">{formatMinutesToHours(item.timeLogged)}</span>
          ),
        },
      ]}
    />
  );
}

interface ProjectOverviewTableProps {
  projects: {
    projectId: string;
    projectName: string;
    status: string;
    completionPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
    timeLogged: number;
  }[];
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-600',
};

export function ProjectOverviewTable({ projects }: ProjectOverviewTableProps) {
  return (
    <DataTable
      data={projects}
      columns={[
        {
          key: 'projectName',
          label: 'Project',
          render: (item) => <span className="font-medium text-gray-900">{item.projectName}</span>,
        },
        {
          key: 'status',
          label: 'Status',
          render: (item) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status] || statusColors.active}`}>
              {item.status.replace('_', ' ')}
            </span>
          ),
        },
        {
          key: 'tasks',
          label: 'Tasks',
          align: 'center',
          render: (item) => (
            <span className="text-gray-600">
              {item.tasksCompleted} / {item.totalTasks}
            </span>
          ),
        },
        {
          key: 'completionPercentage',
          label: 'Progress',
          render: (item) => (
            <div className="w-32">
              <ProgressBar
                value={item.completionPercentage}
                color={item.completionPercentage >= 75 ? '#10b981' : item.completionPercentage >= 50 ? '#f59e0b' : '#3b82f6'}
              />
            </div>
          ),
        },
        {
          key: 'timeLogged',
          label: 'Time Logged',
          align: 'right',
          render: (item) => (
            <span className="text-gray-600">{formatMinutesToHours(item.timeLogged)}</span>
          ),
        },
      ]}
    />
  );
}

interface TopPerformersTableProps {
  performers: {
    userId: string;
    userName: string;
    userAvatar: string | null;
    tasksCompleted: number;
    timeLogged: number;
    completionRate: number;
  }[];
}

export function TopPerformersTable({ performers }: TopPerformersTableProps) {
  return (
    <DataTable
      data={performers}
      columns={[
        {
          key: 'rank',
          label: '#',
          render: (_, index) => (
            <span className={`font-bold ${index < 3 ? 'text-amber-500' : 'text-gray-400'}`}>
              {(index as number) + 1}
            </span>
          ),
        },
        {
          key: 'userName',
          label: 'Team Member',
          render: (item) => (
            <div className="flex items-center gap-3">
              {item.userAvatar ? (
                <img
                  src={item.userAvatar}
                  alt={item.userName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <span className="font-medium text-gray-900">{item.userName}</span>
            </div>
          ),
        },
        {
          key: 'tasksCompleted',
          label: 'Tasks Done',
          align: 'center',
          render: (item) => <span className="font-semibold text-emerald-600">{item.tasksCompleted}</span>,
        },
        {
          key: 'timeLogged',
          label: 'Time Logged',
          align: 'center',
          render: (item) => (
            <span className="text-gray-600">{formatMinutesToHours(item.timeLogged)}</span>
          ),
        },
        {
          key: 'completionRate',
          label: 'Rate',
          align: 'right',
          render: (item) => (
            <span className={`font-medium ${item.completionRate >= 75 ? 'text-emerald-600' : 'text-gray-600'}`}>
              {item.completionRate}%
            </span>
          ),
        },
      ]}
    />
  );
}
