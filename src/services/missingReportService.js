import { supabase } from './supabase';

export async function listMyMissingDrafts(ownerId) {
  if (!ownerId) throw new Error('Sign in to see your missing reports.');
  const { data, error } = await supabase.from('reports')
    .select('id, animal_id, draft_payload, updated_at')
    .eq('reporter_id', ownerId)
    .eq('report_type', 'missing')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyActiveMissingReports(ownerId) {
  if (!ownerId) throw new Error('Sign in to see your missing reports.');
  const { data, error } = await supabase.from('reports')
    .select('id, animal_id, public_reference, published_at, activity_at')
    .eq('reporter_id', ownerId)
    .eq('report_type', 'missing')
    .eq('status', 'active')
    .order('activity_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyResolvedMissingReports(ownerId) {
  if (!ownerId) throw new Error('Sign in to see your missing reports.');
  const { data, error } = await supabase.from('reports')
    .select('id, animal_id, public_reference, status, closed_at, activity_at')
    .eq('reporter_id', ownerId)
    .eq('report_type', 'missing')
    .in('status', ['reunited', 'closed'])
    .order('closed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyMissingReportStatus(reportId) {
  const { data, error } = await supabase.from('reports')
    .select('id, status, public_reference')
    .eq('id', reportId)
    .eq('report_type', 'missing')
    .single();
  if (error) throw error;
  return data;
}

export async function getMyMissingClosure(reportId) {
  const { data, error } = await supabase.from('missing_closures')
    .select('reason_code, private_note, animal_safe_confirmed, recorded_at')
    .eq('report_id', reportId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function closeMissingReport(reportId, payload, submissionKey) {
  const { data, error } = await supabase.rpc('close_missing_report', {
    target_report_id: reportId,
    payload,
    submission_key: submissionKey
  });
  if (error) throw error;
  return data;
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

export function missingReportPhotoCopyPath(userId, animalId, reportId, photo) {
  const prefix = `${userId}/${animalId}/`;
  if (!photo?.id || !photo.storagePath?.startsWith(prefix)) {
    throw new Error('A selected animal photo is no longer available. Review the appearance step.');
  }
  const fileName = photo.storagePath.slice(prefix.length);
  if (!fileName || fileName.includes('/')) {
    throw new Error('A selected animal photo has an invalid path. Review the appearance step.');
  }
  return `${userId}/${reportId}/${photo.id}-${fileName}`;
}

export async function stageMissingReportPhotos({ animalId, reportId, userId, photos }) {
  if (!Array.isArray(photos) || photos.length > 3 || new Set(photos.map((photo) => photo.id)).size !== photos.length) {
    throw new Error('The selected report photos need review.');
  }
  const sourceBucket = supabase.storage.from('animal-photos');
  const reportBucket = supabase.storage.from('report-photos');
  for (const photo of photos) {
    const targetPath = missingReportPhotoCopyPath(userId, animalId, reportId, photo);
    const { error: copyError } = await sourceBucket.copy(photo.storagePath, targetPath, {
      destinationBucket: 'report-photos'
    });
    if (copyError) {
      // A retry may encounter a copy made just before a lost response. Only
      // treat it as complete if the exact destination object is readable.
      const { data: existing, error: lookupError } = await reportBucket.info(targetPath);
      if (lookupError || !existing) {
        throw new Error(`Could not copy a selected photo. Your draft is safe; try publishing again. ${copyError.message}`);
      }
    }
  }
}

export async function publishMissingReport(reportId) {
  const { data, error } = await supabase.rpc('publish_missing_report', { target_report_id: reportId });
  if (!error) return data;

  // A network failure can hide a successful commit. The owner-only reports
  // policy lets us recover the same reference without creating another case.
  const { data: saved } = await supabase.from('reports')
    .select('status, public_reference')
    .eq('id', reportId)
    .eq('report_type', 'missing')
    .maybeSingle();
  if (saved?.status === 'active' && saved.public_reference) return saved.public_reference;
  throw error;
}

async function withReportPhotoUrls(report, allPhotos = false) {
  const paths = allPhotos ? report.photo_paths : report.photo_paths?.slice(0, 1);
  const photoItems = await Promise.all((paths ?? []).map(async (path) => {
    const { data, error } = await supabase.storage.from('report-photos').createSignedUrl(path, 3600);
    return error ? null : { path, url: data.signedUrl };
  }));
  const available = photoItems.filter(Boolean);
  return { ...report, photoItems: available, photoUrls: available.map((photo) => photo.url) };
}

export async function listPublicMissingReports({
  limit = 20, offset = 0, reference = '', province = '', city = '', suburb = '', category = ''
} = {}) {
  const searchReference = reference.trim();
  const { data, error } = searchReference
    ? await supabase.rpc('get_public_missing_reports', {
      result_limit: limit,
      result_offset: offset,
      search_reference: searchReference
    })
    : await supabase.rpc('filter_public_missing_reports', {
      result_limit: limit,
      result_offset: offset,
      filter_province: province.trim() || null,
      filter_city: city.trim() || null,
      filter_suburb: suburb.trim() || null,
      filter_category: category.trim() || null
    });
  if (error) throw error;
  return Promise.all((data ?? []).map((report) => withReportPhotoUrls(report)));
}

export async function getPublicMissingReport(reportId) {
  const { data, error } = await supabase.rpc('get_public_missing_reports', {
    result_limit: 1,
    target_report_id: reportId
  });
  if (error) throw error;
  if (!data?.length) return null;
  return withReportPhotoUrls(data[0], true);
}

export async function getPublicMissingOutcome({ reportId = null, reference = '' } = {}) {
  const { data, error } = await supabase.rpc('get_public_missing_outcome', {
    target_report_id: reportId,
    search_reference: reference.trim() || null
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getMissingReunionContext(reportId) {
  const { data, error } = await supabase.rpc('get_public_missing_reports', {
    result_limit: 1,
    target_report_id: reportId
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function confirmMissingReunion(reportId, payload, submissionKey) {
  const { data, error } = await supabase.rpc('confirm_missing_reunion', {
    target_report_id: reportId,
    payload,
    submission_key: submissionKey
  });
  if (error) throw error;
  return data;
}
