import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export async function chooseAndUploadAvatar(userId) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9
  });
  if (result.canceled) return null;

  const processed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const response = await fetch(processed.uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: 'image/jpeg', upsert: true
  });
  if (error) throw error;
  return path;
}
