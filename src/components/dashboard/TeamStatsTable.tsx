import { Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import type { TeamMemberStats } from '../../services/dashboardService';

interface TeamStatsTableProps {
  data: TeamMemberStats[];
  loading: boolean;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamStatsTable({ data, loading }: TeamStatsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        <div className="p-5 border-b border-gray-100">
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No team data available</p>
        </div>
      </div>
    );
  }

  const maxCompleted = Math.max(...data.map(d => d.tasksCompleted), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Team Performance</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Team Member
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Tasks Assigned
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Completed
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Completion Rate
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Time Logged
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((member) => {
              const completionRate = member.tasksAssigned > 0
                ? Math.round((member.tasksCompleted / member.tasksAssigned) * 100)
                : 0;
              const progressWidth = (member.tasksCompleted / maxCompleted) * 100;

              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {getInitials(member.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {member.tasksAssigned}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-emerald-600">
                      {member.tasksCompleted}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-sm font-medium ${
                      completionRate >= 80 ? 'text-emerald-600' :
                      completionRate >= 50 ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>
                      {completionRate}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-gray-600">
                      {formatTime(member.timeLogged)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="w-24">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TeamStatsCards({ data, loading }: TeamStatsTableProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.slice(0, 6).map((member) => {
        const completionRate = member.tasksAssigned > 0
          ? Math.round((member.tasksCompleted / member.tasksAssigned) * 100)
          : 0;

        return (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {getInitials(member.name)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-gray-900">{member.tasksAssigned}</p>
                <p className="text-xs text-gray-500">Assigned</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-emerald-600">{member.tasksCompleted}</p>
                <p className="text-xs text-gray-500">Done</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-cyan-600">{formatTime(member.timeLogged)}</p>
                <p className="text-xs text-gray-500">Logged</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Completion</span>
                <span className={`font-medium ${
                  completionRate >= 80 ? 'text-emerald-600' :
                  completionRate >= 50 ? 'text-amber-600' :
                  'text-gray-600'
                }`}>
                  {completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    completionRate >= 80 ? 'bg-emerald-500' :
                    completionRate >= 50 ? 'bg-amber-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
