import { useState } from 'react';
import { AlertTriangle, Plus, Search, X } from 'lucide-react';
import { useIssues, useIssueDetail } from '../hooks/useIssues';
import { useAuth } from '../contexts/AuthContext';
import {
  IssueCard,
  IssueCardSkeleton,
  IssueForm,
  IssueDetail,
  IssueFiltersBar,
  IssueStats
} from '../components/issues';
import type { CreateIssueInput, UpdateIssueInput } from '../services/issueService';
import * as issueService from '../services/issueService';

export function IssuesPage() {
  const { user } = useAuth();
  const {
    issues,
    stats,
    filters,
    setFilters,
    loading,
    error,
    createIssue,
    updateIssue,
    deleteIssue,
    refetch
  } = useIssues();

  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkedEntities, setLinkedEntities] = useState<{
    projects: { id: string; name: string }[];
    users: { id: string; full_name: string }[];
  }>({ projects: [], users: [] });

  const {
    issue: selectedIssue,
    comments,
    activity,
    loading: detailLoading,
    addComment,
    deleteComment,
    updateIssue: updateSelectedIssue,
    refetch: refetchDetail
  } = useIssueDetail(selectedIssueId);

  useState(() => {
    issueService.fetchLinkedEntities().then(data => {
      setLinkedEntities({
        projects: data.projects,
        users: data.users
      });
    });
  });

  const handleCreateIssue = async (input: CreateIssueInput) => {
    const result = await createIssue(input);
    if (result.success) {
      setShowForm(false);
    }
    return result.success;
  };

  const handleUpdateIssue = async (input: UpdateIssueInput) => {
    if (!editingIssue) return false;
    const success = await updateIssue(editingIssue, input);
    if (success) {
      setEditingIssue(null);
      if (selectedIssueId === editingIssue) {
        refetchDetail();
      }
    }
    return success;
  };

  const handleDeleteIssue = async () => {
    if (!selectedIssueId) return;
    if (!confirm('Are you sure you want to delete this issue?')) return;
    const success = await deleteIssue(selectedIssueId);
    if (success) {
      setSelectedIssueId(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedIssueId) return false;
    const success = await updateSelectedIssue({ status: status as UpdateIssueInput['status'] });
    return success;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchQuery || undefined });
  };

  const editingIssueData = editingIssue ? issues.find(i => i.id === editingIssue) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            Issues
          </h1>
          <p className="text-gray-500 mt-1">Track and resolve problems across your projects</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Report Issue
        </button>
      </div>

      <IssueStats stats={stats} loading={loading} />

      <div className="flex flex-col gap-4 lg:flex-row">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilters({ ...filters, search: undefined });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      <IssueFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        projects={linkedEntities.projects}
        users={linkedEntities.users}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No issues found</h3>
          <p className="text-gray-500 mb-6">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters to see more results'
              : 'No issues have been reported yet. Click "Report Issue" to create one.'}
          </p>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => {
                setFilters({});
                setSearchQuery('');
              }}
              className="text-gray-900 font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => setSelectedIssueId(issue.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <IssueForm
              onSave={handleCreateIssue}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {editingIssue && editingIssueData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <IssueForm
              issue={editingIssueData}
              onSave={handleUpdateIssue}
              onCancel={() => setEditingIssue(null)}
            />
          </div>
        </div>
      )}

      {selectedIssueId && selectedIssue && !detailLoading && (
        <IssueDetail
          issue={selectedIssue}
          comments={comments}
          activity={activity}
          currentUserId={user?.id}
          onClose={() => setSelectedIssueId(null)}
          onEdit={() => {
            setEditingIssue(selectedIssueId);
            setSelectedIssueId(null);
          }}
          onDelete={handleDeleteIssue}
          onStatusChange={handleStatusChange}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
        />
      )}
    </div>
  );
}
