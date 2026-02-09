import { useState, useEffect, useCallback } from 'react';
import * as calculationService from '../services/calculationService';
import type { CalculationHistory } from '../types/database';

export function useCalculationHistory() {
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await calculationService.fetchCalculationHistory();
    if (error) {
      setError(error.message);
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (expression: string, result: string) => {
    const { data, error } = await calculationService.saveCalculation(expression, result);
    if (error) {
      console.error('Failed to save calculation:', error);
    } else if (data) {
      setHistory(prev => [data, ...prev]);
    }
    return { data, error };
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    const { error } = await calculationService.deleteCalculation(id);
    if (!error) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
    return { error };
  }, []);

  const clearHistory = useCallback(async () => {
    const { error } = await calculationService.clearAllHistory();
    if (!error) {
      setHistory([]);
    }
    return { error };
  }, []);

  return {
    history,
    loading,
    error,
    refetch: loadHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
