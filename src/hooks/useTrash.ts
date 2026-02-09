import { useState, useEffect, useCallback } from 'react';
import type { TrashItem, TrashEntityType, RetentionSettings } from '../types/database';
import type { TrashFilters, TrashStats } from '../services/trashService';
import * as trashService from '../services/trashService';

export function useTrash() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [stats, setStats] = useState<TrashStats>({
    total: 0,
    byType: { task: 0, project: 0, document: 0, issue: 0 },
    expiringSoon: 0,
  });
  const [filters, setFilters] = useState<TrashFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionSettings, setRetentionSettings] = useState<RetentionSettings>({ days: 30 });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [trashItems, trashStats, settings] = await Promise.all([
        trashService.fetchTrashItems(filters),
        trashService.fetchTrashStats(),
        trashService.fetchRetentionSettings(),
      ]);

      setItems(trashItems);
      setStats(trashStats);
      setRetentionSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trash items');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const restoreItem = useCallback(async (entityType: TrashEntityType, entityId: string) => {
    const success = await trashService.restoreItem(entityType, entityId);
    if (success) {
      await fetchItems();
    }
    return success;
  }, [fetchItems]);

  const permanentlyDeleteItem = useCallback(async (entityType: TrashEntityType, entityId: string) => {
    const success = await trashService.permanentlyDeleteItem(entityType, entityId);
    if (success) {
      await fetchItems();
    }
    return success;
  }, [fetchItems]);

  const updateRetention = useCallback(async (settings: RetentionSettings) => {
    const success = await trashService.updateRetentionSettings(settings);
    if (success) {
      setRetentionSettings(settings);
    }
    return success;
  }, []);

  const purgeExpired = useCallback(async () => {
    const result = await trashService.purgeExpiredItems();
    if (result.success) {
      await fetchItems();
    }
    return result;
  }, [fetchItems]);

  const emptyTrash = useCallback(async () => {
    const result = await trashService.emptyTrash();
    if (result.success) {
      await fetchItems();
    }
    return result;
  }, [fetchItems]);

  return {
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
    refetch: fetchItems,
  };
}
