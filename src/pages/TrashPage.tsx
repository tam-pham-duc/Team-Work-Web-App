import { useState } from 'react';
import { Trash2, Search, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTrash } from '../hooks/useTrash';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../lib/rbac';
import {
  TrashItemCard,
  TrashItemCardSkeleton,
  TrashFiltersBar,
  TrashStatsCard,
  RetentionSettingsPanel,
} from '../components/trash';
import type { TrashEntityType } from '../types/database';

export function TrashPage() {
  const { user, userRole } = useAuth();
  const {
    items,
    stats,
    filters,
    setFilters,
    loading,
    error,
    retentionSettings,
    restoreItem,
    permanentlyDeleteItem,
    updateRetention,
    purgeExpired,
    emptyTrash,
  } = useTrash();

  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const isUserAdmin = isAdmin(userRole);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchQuery || undefined });
  };

  const handleRestore = async (entityType: TrashEntityType, entityId: string, itemId: string) => {
    setRestoringId(itemId);
    await restoreItem(entityType, entityId);
    setRestoringId(null);
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handlePermanentDelete = async (entityType: TrashEntityType, entityId: string, itemId: string) => {
    if (!confirm('This will permanently delete this item. This action cannot be undone. Continue?')) {
      return;
    }
    setDeletingId(itemId);
    await permanentlyDeleteItem(entityType, entityId);
    setDeletingId(null);
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  };

  const handleBulkRestore = async () => {
    const selectedArray = Array.from(selectedItems);
    for (const itemId of selectedArray) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        await restoreItem(item.entity_type, item.entity_id);
      }
    }
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedItems.size} selected items? This cannot be undone.`)) {
      return;
    }
    const selectedArray = Array.from(selectedItems);
    for (const itemId of selectedArray) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        await permanentlyDeleteItem(item.entity_type, item.entity_id);
      }
    }
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-gray-500" />
            Trash
          </h1>
          <p className="text-gray-500 mt-1">
            Recover deleted items or permanently remove them
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isUserAdmin && (
            <RetentionSettingsPanel
              settings={retentionSettings}
              onSave={updateRetention}
              onPurgeExpired={purgeExpired}
              onEmptyTrash={emptyTrash}
              totalItems={stats.total}
            />
          )}
        </div>
      </div>

      <TrashStatsCard
        stats={stats}
        retentionDays={retentionSettings.days}
        loading={loading}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <TrashFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          stats={stats}
        />

        <form onSubmit={handleSearch} className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trash..."
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

      {selectedItems.size > 0 && (
        <div className="bg-gray-900 text-white rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestore}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restore all
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete all
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-3 py-1.5 text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TrashItemCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Trash is empty</h3>
          <p className="text-gray-500 mb-6">
            {filters.entityType || filters.search || filters.dateRange
              ? 'No deleted items match your filters'
              : 'Deleted items will appear here for recovery'}
          </p>
          {(filters.entityType || filters.search || filters.dateRange) && (
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
        <>
          {stats.expiringSoon > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {stats.expiringSoon} item{stats.expiringSoon !== 1 ? 's' : ''} expiring soon
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  These items will be automatically deleted within 7 days. Restore them to prevent permanent deletion.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <TrashItemCard
                key={item.id}
                item={item}
                retentionDays={retentionSettings.days}
                onRestore={() => handleRestore(item.entity_type, item.entity_id, item.id)}
                onPermanentDelete={() =>
                  handlePermanentDelete(item.entity_type, item.entity_id, item.id)
                }
                isRestoring={restoringId === item.id}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
