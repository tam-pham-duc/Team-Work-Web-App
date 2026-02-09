import {
  FileText,
  Newspaper,
  FileCode,
  MessagesSquare,
  FolderOpen,
  Tag,
  Pin,
  Clock,
  User,
  Filter,
  X
} from 'lucide-react';
import type { DocumentType, DocumentStatus, DocumentCategory, DocumentTag } from '../../types/database';
import type { DocumentFilters } from '../../services/teamSpaceService';

interface TeamSpaceSidebarProps {
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  categories: DocumentCategory[];
  tags: DocumentTag[];
  currentUserId?: string;
}

const documentTypes: { value: DocumentType | undefined; label: string; icon: typeof FileText }[] = [
  { value: undefined, label: 'All Types', icon: FileText },
  { value: 'note', label: 'Notes', icon: FileText },
  { value: 'post', label: 'Posts', icon: Newspaper },
  { value: 'spec', label: 'Specs', icon: FileCode },
  { value: 'discussion', label: 'Discussions', icon: MessagesSquare }
];

const documentStatuses: { value: DocumentStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All Statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' }
];

export function TeamSpaceSidebar({
  filters,
  onFiltersChange,
  categories,
  tags,
  currentUserId
}: TeamSpaceSidebarProps) {
  const hasActiveFilters = filters.type || filters.categoryId || filters.tagIds?.length || filters.isPinned || filters.authorId;

  const clearFilters = () => {
    onFiltersChange({ status: 'published' });
  };

  const setTypeFilter = (type?: DocumentType) => {
    onFiltersChange({ ...filters, type });
  };

  const setCategoryFilter = (categoryId?: string) => {
    onFiltersChange({ ...filters, categoryId });
  };

  const toggleTagFilter = (tagId: string) => {
    const currentTags = filters.tagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    onFiltersChange({ ...filters, tagIds: newTags.length > 0 ? newTags : undefined });
  };

  const togglePinnedFilter = () => {
    onFiltersChange({ ...filters, isPinned: filters.isPinned ? undefined : true });
  };

  const toggleMyDocuments = () => {
    onFiltersChange({
      ...filters,
      authorId: filters.authorId === currentUserId ? undefined : currentUserId
    });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={togglePinnedFilter}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filters.isPinned
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              Pinned
            </button>
            {currentUserId && (
              <button
                onClick={toggleMyDocuments}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filters.authorId === currentUserId
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Mine
              </button>
            )}
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Type</h4>
            <div className="space-y-1">
              {documentTypes.map(type => {
                const Icon = type.icon;
                const isActive = filters.type === type.value;
                return (
                  <button
                    key={type.label}
                    onClick={() => setTypeFilter(type.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</h4>
            <select
              value={filters.status || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                status: e.target.value as DocumentStatus || undefined
              })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
            >
              {documentStatuses.map(status => (
                <option key={status.label} value={status.value || ''}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
              Categories
            </h4>
            <div className="space-y-1">
              <button
                onClick={() => setCategoryFilter(undefined)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  !filters.categoryId
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filters.categoryId === category.id
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                <Tag className="w-3.5 h-3.5 inline mr-1" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const isActive = filters.tagIds?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={isActive ? { backgroundColor: tag.color } : undefined}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamSpaceFiltersBar({
  filters,
  onFiltersChange,
  categories,
  tags
}: Omit<TeamSpaceSidebarProps, 'currentUserId'>) {
  const hasActiveFilters = filters.type || filters.categoryId || filters.tagIds?.length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={filters.type || ''}
        onChange={(e) => onFiltersChange({
          ...filters,
          type: e.target.value as DocumentType || undefined
        })}
        className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
      >
        {documentTypes.map(type => (
          <option key={type.label} value={type.value || ''}>{type.label}</option>
        ))}
      </select>

      <select
        value={filters.categoryId || ''}
        onChange={(e) => onFiltersChange({
          ...filters,
          categoryId: e.target.value || undefined
        })}
        className="px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
      >
        <option value="">All Categories</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange({ status: 'published' })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
