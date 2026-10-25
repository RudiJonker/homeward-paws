import { supabase } from './supabase';

export async function submitMissingContentReport({ reportId, photoPath = null, reason, description = '' }) {
  const { data, error } = await supabase.rpc('submit_missing_content_report', {
    target_report_id: reportId,
    target_photo_path: photoPath,
    report_reason: reason,
    report_description: description.trim() || null
  });
  if (error) throw error;
  return data;
}
