import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export async function chooseLinkedSightingPhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: false, quality: 1
  });
  if (result.canceled) return null;
  const processed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri, [{ resize: { width: 1200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );
  return processed.uri;
}

export async function attachLinkedSightingPhoto(sightingId, userId, uri) {
  const path = `${userId}/${sightingId}/sighting.jpg`;
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('sighting-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  // If the first upload succeeded but its response was lost, the fixed path
  // already exists. The guarded RPC verifies that object and is idempotent.
  const { error: attachError } = await supabase.rpc('attach_linked_sighting_photo', {
    target_sighting_id: sightingId, object_name: path
  });
  if (attachError) throw uploadError ?? attachError;
}

export async function submitLinkedSighting(reportId, payload, submissionKey) {
  const { data, error } = await supabase.rpc('submit_missing_case_sighting', {
    target_report_id: reportId, payload, submission_key: submissionKey
  });
  if (!error) return data;
  // A successful commit can outlive a lost response. The contributor can read
  // only their own sighting, so this is a safe retry check.
  const { data: existing } = await supabase.from('missing_case_sightings')
    .select('id').eq('report_id', reportId).eq('client_request_key', submissionKey).maybeSingle();
  if (existing?.id) return existing.id;
  throw error;
}

export async function listOwnerMissingSightings(reportId) {
  const { data, error } = await supabase.from('missing_case_sightings')
    .select('id, observed_at, province, city, suburb, street_or_landmark, private_latitude, private_longitude, accuracy_m, location_source, movement, direction, observed_condition, still_visible, notes, share_phone, contact_phone_e164, photo_path, review_status, reviewed_at, created_at')
    .eq('report_id', reportId)
    .order('observed_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (sighting) => {
    if (!sighting.photo_path) return sighting;
    const { data: photo, error: photoError } = await supabase.storage
      .from('sighting-photos').createSignedUrl(sighting.photo_path, 3600);
    return { ...sighting, photoUrl: photo?.signedUrl ?? null, photoError: Boolean(photoError) };
  }));
}

export async function listMyLinkedSightingPhotos(contributorId) {
  if (!contributorId) throw new Error('Sign in to manage your sighting photos.');
  const { data, error } = await supabase.from('missing_case_sightings')
    .select('id, observed_at, suburb, city, province, photo_path')
    .eq('contributor_id', contributorId)
    .not('photo_path', 'is', null)
    .order('observed_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (sighting) => {
    const { data: photo, error: photoError } = await supabase.storage
      .from('sighting-photos').createSignedUrl(sighting.photo_path, 3600);
    return { ...sighting, photoUrl: photoError ? null : photo.signedUrl };
  }));
}

export async function removeLinkedSightingPhoto(sightingId, path) {
  const { error: storageError } = await supabase.storage.from('sighting-photos').remove([path]);
  // A lost Storage response can leave a removed object with linked metadata.
  // The guarded RPC succeeds only after the object has actually gone.
  const { error: metadataError } = await supabase.rpc('clear_linked_sighting_photo', {
    target_sighting_id: sightingId
  });
  if (metadataError) throw storageError ?? metadataError;
}

export async function countNewMissingSightings(reportIds) {
  if (!reportIds.length) return {};
  const counts = await Promise.all(reportIds.map(async (reportId) => {
    const { count, error } = await supabase.from('missing_case_sightings')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', reportId).eq('review_status', 'new');
    if (error) throw error;
    return [reportId, count ?? 0];
  }));
  return Object.fromEntries(counts);
}

export async function reviewLinkedSighting(sightingId, decision) {
  const { error } = await supabase.rpc('review_missing_case_sighting', {
    target_sighting_id: sightingId, decision
  });
  if (error) throw error;
}
