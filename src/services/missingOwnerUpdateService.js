import { supabase } from './supabase';

export async function addMissingOwnerUpdate(reportId, updateType, note, area, submissionKey) {
  const { data, error } = await supabase.rpc('add_missing_owner_update', {
    target_report_id: reportId,
    update_type: updateType,
    note: note || null,
    area: area || null,
    submission_key: submissionKey
  });
  if (error) throw error;
  return data;
}

export async function getOwnerMissingTimeline(reportId) {
  const { data, error } = await supabase.rpc('get_owner_missing_timeline', {
    target_report_id: reportId
  });
  if (error) throw error;
  return data ?? [];
}
