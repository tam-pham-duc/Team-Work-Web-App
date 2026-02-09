import { supabase } from '../lib/supabase';
import type { CalculationHistory } from '../types/database';

export async function fetchCalculationHistory(limit = 50) {
  const { data, error } = await supabase
    .from('calculation_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data as CalculationHistory[] | null, error };
}

export async function saveCalculation(expression: string, result: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('calculation_history')
    .insert({
      user_id: user.id,
      expression,
      result,
    })
    .select()
    .single();

  return { data: data as CalculationHistory | null, error };
}

export async function deleteCalculation(id: string) {
  const { error } = await supabase
    .from('calculation_history')
    .delete()
    .eq('id', id);

  return { error };
}

export async function clearAllHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('calculation_history')
    .delete()
    .eq('user_id', user.id);

  return { error };
}
