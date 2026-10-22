import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export async function createAnimalProfile(payload) {
  const { data, error } = await supabase.rpc('create_animal_profile', { payload });
  if (error) throw error;
  return data;
}

export async function updateAnimalProfile(animalId, payload) {
  const { error } = await supabase.rpc('update_animal_profile', {
    target_animal_id: animalId,
    payload
  });
  if (error) throw error;
}

export async function chooseAnimalPhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1
  });
  if (result.canceled) return null;
  const edited = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
  );
  return edited.uri;
}

export async function uploadAnimalPhotos(animalId, userId, photos) {
  const { data: existingPhotos, error: existingError } = await supabase
    .from('animal_photos')
    .select('display_order')
    .eq('animal_id', animalId);
  if (existingError) throw new Error(`Could not check saved photos: ${existingError.message}`);
  const uploadedOrders = new Set((existingPhotos ?? []).map((photo) => photo.display_order));

  for (let index = 0; index < photos.length; index += 1) {
    if (uploadedOrders.has(index)) continue;
    await uploadAnimalPhoto(animalId, userId, photos[index], index);
  }
}

export async function uploadAnimalPhoto(animalId, userId, photo, displayOrder) {
  const storagePath = `${userId}/${animalId}/${displayOrder}-${Date.now()}.jpg`;
  const response = await fetch(photo.uri);
  const body = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('animal-photos')
    .upload(storagePath, body, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(`Photo ${displayOrder + 1} could not be uploaded: ${uploadError.message}`);
  const { error: rowError } = await supabase.from('animal_photos').insert({
    animal_id: animalId,
    storage_path: storagePath,
    display_order: displayOrder,
    photo_type: photo.type,
    visibility: 'report_eligible'
  });
  if (rowError) {
    await supabase.storage.from('animal-photos').remove([storagePath]);
    throw new Error(`Photo ${displayOrder + 1} was uploaded but could not be linked to the profile: ${rowError.message}`);
  }
}

export async function removeAnimalPhoto(animalId, photo) {
  // Remove the object first. If the row deletion then fails, the operation can
  // be retried using the still-visible metadata rather than leaving an orphan.
  const { error: storageError } = await supabase.storage
    .from('animal-photos')
    .remove([photo.storage_path]);
  if (storageError) throw new Error(`Could not remove the photo file: ${storageError.message}`);

  const { data, error: rowError } = await supabase.from('animal_photos')
    .delete()
    .eq('id', photo.id)
    .eq('animal_id', animalId)
    .select('id');
  if (rowError || !data?.length) {
    throw new Error('The photo file was removed, but the profile could not be updated. Please try Remove again.');
  }
}

export async function replaceAnimalPhoto(animalId, userId, photo, uri) {
  const storagePath = `${userId}/${animalId}/${photo.display_order}-${Date.now()}.jpg`;
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('animal-photos')
    .upload(storagePath, body, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(`Could not upload the replacement: ${uploadError.message}`);

  const { data, error: rowError } = await supabase.from('animal_photos')
    .update({ storage_path: storagePath })
    .eq('id', photo.id)
    .eq('animal_id', animalId)
    .eq('storage_path', photo.storage_path)
    .select('id');
  if (rowError || !data?.length) {
    await supabase.storage.from('animal-photos').remove([storagePath]);
    throw new Error('The replacement uploaded, but the profile could not be updated. The original photo is unchanged.');
  }

  const { error: cleanupError } = await supabase.storage
    .from('animal-photos')
    .remove([photo.storage_path]);
  return cleanupError ? 'The new photo is saved, but the old file could not be cleaned up. Please contact support.' : null;
}

export async function reorderAnimalPhotos(animalId, photoIds) {
  const { error } = await supabase.rpc('reorder_animal_photos', {
    target_animal_id: animalId,
    ordered_photo_ids: photoIds
  });
  if (error) throw error;
}

export async function listMyAnimals({ archived = false, limit = null } = {}) {
  const baseQuery = supabase
    .from('animals')
    .select('id, name, category, breed, sex, size, status, updated_at, animal_photos(storage_path, display_order, archived_at)')
    .order('updated_at', { ascending: false });
  const query = Number.isInteger(limit) && limit > 0 ? baseQuery.limit(limit) : baseQuery;

  const { data, error } = archived
    ? await query.eq('status', 'archived')
    : await query.neq('status', 'archived');
  if (error) throw error;

  return Promise.all((data ?? []).map(async (animal) => {
    const firstPhoto = animal.animal_photos
      ?.filter((photo) => !photo.archived_at)
      .sort((a, b) => a.display_order - b.display_order)[0];
    if (!firstPhoto) return { ...animal, photoUrl: null };
    const { data: signed, error: signedError } = await supabase.storage
      .from('animal-photos')
      .createSignedUrl(firstPhoto.storage_path, 3600);
    return { ...animal, photoUrl: signedError ? null : signed.signedUrl };
  }));
}

export async function getAnimalProfile(animalId) {
  const { data, error } = await supabase
    .from('animals')
    .select('*, animal_private_details(*), animal_behaviour_flags(*), animal_health_flags(*), animal_photos(*)')
    .eq('id', animalId)
    .single();
  if (error) throw error;

  const photos = await Promise.all((data.animal_photos ?? [])
    .filter((photo) => !photo.archived_at)
    .sort((a, b) => a.display_order - b.display_order)
    .map(async (photo) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from('animal-photos')
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: signedError ? null : signed.signedUrl };
    }));
  return { ...data, photos };
}

export async function getAnimalReportAppearance(animalId) {
  // Missing-report setup only needs public-facing appearance fields. Do not
  // fetch private identifiers, health notes or ownership evidence here.
  const { data, error } = await supabase.from('animals')
    .select('id, status, name, category, breed, pattern, coat_description, distinctive_features, updated_at, animal_photos(id, storage_path, display_order, archived_at, visibility)')
    .eq('id', animalId)
    .single();
  if (error) throw error;

  const photos = await Promise.all((data.animal_photos ?? [])
    .filter((photo) => !photo.archived_at && photo.visibility === 'report_eligible')
    .sort((a, b) => a.display_order - b.display_order)
    .map(async (photo) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from('animal-photos')
        .createSignedUrl(photo.storage_path, 3600);
      return { id: photo.id, url: signedError ? null : signed.signedUrl, visibility: photo.visibility };
    }));
  return { ...data, photos };
}

export async function setAnimalArchived(animalId, shouldArchive) {
  const { error } = await supabase.rpc('set_animal_archived', {
    target_animal_id: animalId,
    should_archive: shouldArchive
  });
  if (error) throw error;
}

export async function deleteAnimalProfile(animalId, userId) {
  // RLS checks ownership before touching Storage. The RPC repeats this check
  // and the status check so the database remains the security boundary.
  const { data: animal, error: animalError } = await supabase.from('animals')
    .select('id, status')
    .eq('id', animalId)
    .eq('owner_id', userId)
    .single();
  if (animalError || !animal) throw new Error('Animal not found or access denied.');
  if (!['safe', 'archived'].includes(animal.status)) {
    throw new Error('An animal with an active case cannot be deleted.');
  }

  const folder = `${userId}/${animalId}`;
  const paths = [];
  let offset = 0;
  while (true) {
    const { data: entries, error: listError } = await supabase.storage
      .from('animal-photos')
      .list(folder, { limit: 1000, offset });
    if (listError) throw new Error(`Could not check animal photos: ${listError.message}`);
    for (const entry of entries ?? []) {
      if (!entry.id || !entry.name || entry.name.includes('/')) {
        throw new Error('An unexpected photo folder was found. Please contact support before deleting this animal.');
      }
      paths.push(`${folder}/${entry.name}`);
    }
    if ((entries ?? []).length < 1000) break;
    offset += entries.length;
  }

  // Keep the database row until Storage deletion succeeds so retries work.
  for (let index = 0; index < paths.length; index += 1000) {
    const { error: removeError } = await supabase.storage
      .from('animal-photos')
      .remove(paths.slice(index, index + 1000));
    if (removeError) throw new Error(`Could not delete the animal photos: ${removeError.message}. The profile is still saved; please try again.`);
  }

  const { error } = await supabase.rpc('delete_animal_profile', {
    target_animal_id: animalId
  });
  if (error) {
    throw new Error(`The profile could not be deleted. Some photos may already have been removed. Please try again. ${error.message}`);
  }
}
