import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppDialog } from '../../components/AppDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { listMyLinkedSightingPhotos, removeLinkedSightingPhoto } from '../../services/linkedSightingService';
import { colors, radii, spacing, typography } from '../../theme';

function PhotoPreview({ url }) {
  const [failed, setFailed] = useState(false);
  return failed || !url
    ? <View style={styles.photoFallback}><MaterialCommunityIcons name="image-off-outline" size={32} color={colors.textSecondary} /><Text style={styles.fallbackText}>Photo unavailable</Text></View>
    : <Image source={{ uri: url }} style={styles.photo} onError={() => setFailed(true)} accessibilityLabel="Your private sighting photo" />;
}

function observedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Observation date unavailable'
    : `Observed ${date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

export function ManageSightingPhotosScreen() {
  const { showDialog } = useAppDialog();
  const { session } = useSession();
  const contributorId = session?.user?.id;
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const next = await listMyLinkedSightingPhotos(contributorId);
      if (currentRequest === requestId.current) setPhotos(next);
    } catch {
      if (currentRequest === requestId.current) {
        setPhotos([]);
        setError('Could not load your sighting photos. Check your connection and try again.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [contributorId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  async function remove(photo) {
    if (busyId) return;
    setBusyId(photo.id);
    setError('');
    setNotice('');
    try {
      await removeLinkedSightingPhoto(photo.id, photo.photo_path);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice('Photo removed. Your sighting and the owner’s review remain available.');
    } catch {
      setError('Could not finish removing that photo. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove(photo) {
    showDialog('Remove this sighting photo?', 'The photo will be deleted. Your observation and the owner’s review will stay in the private case history.', [
      { text: 'Keep photo', style: 'cancel' },
      { text: 'Remove photo', style: 'destructive', onPress: () => remove(photo) }
    ]);
  }

  return <ScreenContainer>
    <Text style={styles.title}>Your sighting photos</Text>
    <Text style={styles.subtitle}>These are photos you attached to missing-case sightings. Removing a photo leaves your observation in place. Only you, the case owner and authorised administrators can view an attached photo.</Text>
    {loading ? <Text style={styles.message}>Loading your sighting photos…</Text> : null}
    {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={38} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
    {notice && !error ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {!loading && !error && photos.length === 0 ? <View style={styles.state}>
      <MaterialCommunityIcons name="image-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No sighting photos to manage</Text>
      <Text style={styles.message}>Photos you attach to missing-case sightings will appear here.</Text>
    </View> : null}
    {!loading && photos.map((photo) => <View key={photo.id} style={styles.card}>
      <PhotoPreview url={photo.photoUrl} />
      <Text style={styles.cardTitle}>{observedDate(photo.observed_at)}</Text>
      <Text style={styles.message}>{[photo.suburb, photo.city, photo.province].filter(Boolean).join(', ')}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(busyId) }} disabled={Boolean(busyId)} onPress={() => confirmRemove(photo)} style={styles.removeButton}>
        <MaterialCommunityIcons name="image-remove-outline" size={21} color={colors.error} />
        <Text style={styles.removeText}>{busyId === photo.id ? 'Removing photo…' : 'Remove photo'}</Text>
      </Pressable>
    </View>)}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  notice: { ...typography.bodyStrong, color: colors.primaryDark, marginBottom: spacing.md },
  card: { gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  photo: { width: '100%', height: 220, borderRadius: radii.md },
  photoFallback: { height: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  fallbackText: { ...typography.caption, color: colors.textSecondary },
  cardTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  removeButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.error, borderRadius: radii.md },
  removeText: { ...typography.bodyStrong, color: colors.error }
});
