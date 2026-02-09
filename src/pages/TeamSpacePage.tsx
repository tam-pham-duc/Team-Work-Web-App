import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeamSpace } from '../hooks/useTeamSpace';
import {
  DocumentCard,
  DocumentCardSkeleton,
  PinnedDocumentCard,
  DocumentForm,
  TeamSpaceSidebar
} from '../components/teamspace';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Pin,
  LayoutGrid,
  List,
  X
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export function TeamSpacePage() {
  const { user } = useAuth();
  const {
    documents,
    pinnedDocuments,
    categories,
    tags,
    filters,
    setFilters,
    loading,
    error,
    refetch,
    createDocument,
    deleteDocument,
    togglePin,
    createTag
  } = useTeamSpace();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleCreateDocument = async (input: Parameters<typeof createDocument>[0]) => {
    const result = await createDocument(input);
    if (result.success) {
      setShowCreateModal(false);
    }
    return result.success;
  };

  const filteredDocuments = documents.filter(doc =>
    !pinnedDocuments.some(p => p.id === doc.id)
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {showSidebar && (
        <TeamSpaceSidebar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          tags={tags}
          currentUserId={user?.id}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                {showSidebar ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-gray-600" />
                  <h1 className="text-2xl font-semibold text-gray-900">Team Space</h1>
                </div>
                <p className="text-gray-600 mt-1">Internal knowledge base and documentation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refetch}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Document
              </button>
            </div>
          </header>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error loading documents</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {pinnedDocuments.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-900">Pinned</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedDocuments.map(doc => (
                  <PinnedDocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <DocumentCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500 mb-6">
                {filters.search || filters.type || filters.categoryId
                  ? 'Try adjusting your filters'
                  : 'Create your first document to get started'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                Create Document
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
              {filteredDocuments.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onPin={togglePin}
                  onDelete={deleteDocument}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="p-6">
              <DocumentForm
                categories={categories}
                tags={tags}
                onSave={handleCreateDocument}
                onCancel={() => setShowCreateModal(false)}
                onCreateTag={createTag}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
