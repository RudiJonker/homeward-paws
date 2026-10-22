import { supabase } from './supabase';

export async function listMyMissingDrafts() {
  const { data, error } = await supabase.from('reports')
    .select('id, animal_id, draft_payload, updated_at')
    .eq('report_type', 'missing')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMissingDraft(reportId) {
  const { data, error } = await supabase.from('reports')
    .select('id, animal_id, draft_payload, updated_at')
    .eq('id', reportId)
    .eq('report_type', 'missing')
    .eq('status', 'draft')
    .single();
  if (error) throw error;
  return data;
}

export async function getMissingDraftReadiness(reportId) {
  const { data, error } = await supabase.rpc('missing_draft_readiness', { target_report_id: reportId });
  if (error) throw error;
  if (!Array.isArray(data) || !data.every((issue) => typeof issue === 'string')) {
    throw new Error('The draft readiness check returned an unexpected result.');
  }
  return data;
}

export async function saveMissingDraft(animalId, payload, reportId = null) {
  const { data, error } = await supabase.rpc('save_missing_draft', {
    target_animal_id: animalId,
    payload,
    target_report_id: reportId
  });
  if (error) throw error;
  return data;
}

export async function deleteMissingDraft(reportId) {
  const { error } = await supabase.rpc('delete_missing_draft', { target_report_id: reportId });
  if (error) throw error;
}
