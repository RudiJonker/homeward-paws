import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel, animalHealthFlagLabel } from '../../config/animals';
import { animalColourLabel } from '../../config/animalColours';
import { useSession } from '../../context/SessionContext';
import { chooseAnimalPhoto, deleteAnimalProfile, getAnimalProfile, removeAnimalPhoto, reorderAnimalPhotos, replaceAnimalPhoto, setAnimalArchived, uploadAnimalPhoto } from '../../services/animalService';
import { colors, radii, spacing, typography } from '../../theme';

export function AnimalDetailScreen({ navigation, route }) {
  const { animalId } = route.params;
  const { session } = useSession();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPrivateIds, setShowPrivateIds] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAnimal(await getAnimalProfile(animalId)); }
    catch (loadError) { setError(`We couldn’t load this animal. ${loadError.message}`); }
    finally { setLoading(false); }
  }, [animalId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleArchived() {
    setBusy(true); setError('');
    try {
      await setAnimalArchived(animalId, animal.status !== 'archived');
      navigation.goBack();
    } catch (archiveError) { setError(archiveError.message); }
    finally { setBusy(false); }
  }

  function confirmDeleteAnimal() {
    Alert.alert(
      'Permanently delete animal?',
      'This permanently removes this animal profile, its photos, private details and any unfinished missing report draft. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete animal', style: 'destructive', onPress: async () => {
          setBusy(true); setError('');
          try {
            await deleteAnimalProfile(animalId, session.user.id);
            navigation.goBack();
          } catch (deleteError) {
            setError(deleteError.message);
          } finally {
            setBusy(false);
          }
        } }
      ]
    );
  }

  async function addPhoto() {
    const usedOrders = new Set((animal.animal_photos ?? []).map((photo) => photo.display_order));
    const nextOrder = [0, 1, 2].find((order) => !usedOrders.has(order));
    if (nextOrder === undefined) return;
    setBusy(true); setError('');
    try {
      const uri = await chooseAnimalPhoto();
      if (!uri) return;
      await uploadAnimalPhoto(animalId, session.user.id, {
        uri,
        type: ['face', 'full_body', 'distinctive_feature'][nextOrder]
      }, nextOrder);
      await load();
    } catch (photoError) { setError(`Photo upload failed. ${photoError.message}`); }
    finally { setBusy(false); }
  }

  async function replacePhoto(photo) {
    setBusy(true); setError('');
    try {
      const uri = await chooseAnimalPhoto();
      if (!uri) return;
      const warning = await replaceAnimalPhoto(animalId, session.user.id, photo, uri);
      await load();
      if (warning) setError(warning);
    } catch (photoError) { setError(`Photo replacement failed. ${photoError.message}`); }
    finally { setBusy(false); }
  }

  function confirmRemovePhoto(photo) {
    Alert.alert('Remove photo?', 'This photo will be permanently removed from the animal profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove photo', style: 'destructive', onPress: async () => {
        setBusy(true); setError('');
        try { await removeAnimalPhoto(animalId, photo); await load(); }
        catch (photoError) { setError(`Photo removal failed. ${photoError.message}`); }
        finally { setBusy(false); }
      } }
    ]);
  }

  async function movePhoto(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= animal.photos.length) return;
    const orderedIds = animal.photos.map((photo) => photo.id);
    [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
    setBusy(true); setError('');
    try { await reorderAnimalPhotos(animalId, orderedIds); await load(); }
    catch (photoError) { setError(`Photo order could not be changed. ${photoError.message}`); }
    finally { setBusy(false); }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading animal profile…</Text></ScreenContainer>;
  if (error && !animal) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View></ScreenContainer>;
  if (!animal) return null;

  const privateDetails = animal.animal_private_details;
  return <ScreenContainer>
    <View style={styles.photos}>
      {(animal.photos.length ? animal.photos : [{ id: 'placeholder', url: null }]).map((photo, index) => <View key={photo.id} style={styles.photoCard}>
        <Image source={photo.url ? { uri: photo.url } : ANIMAL_PLACEHOLDERS[animal.category]} style={styles.photo} />
        {photo.id !== 'placeholder' && animal.status !== 'archived' ? <>
          <View style={styles.photoControls}>
            <PhotoControl label={`Replace photo ${index + 1}`} icon="image-edit-outline" disabled={busy} onPress={() => replacePhoto(photo)} />
            <PhotoControl label={`Remove photo ${index + 1}`} icon="trash-can-outline" disabled={busy} onPress={() => confirmRemovePhoto(photo)} />
          </View>
          {animal.photos.length > 1 ? <View style={styles.photoControls}>
            <PhotoControl label={`Move photo ${index + 1} left`} icon="arrow-left" disabled={busy || index === 0} onPress={() => movePhoto(index, -1)} />
            <PhotoControl label={`Move photo ${index + 1} right`} icon="arrow-right" disabled={busy || index === animal.photos.length - 1} onPress={() => movePhoto(index, 1)} />
          </View> : null}
        </> : null}
      </View>)}
    </View>
    {animal.photos.length > 0 && animal.status !== 'archived' ? <Text style={styles.photoHelp}>Photo controls: replace, remove, or change the display order.</Text> : null}
    <View style={styles.heading}><View style={styles.headingText}><Text style={styles.title}>{animal.name}</Text><Text style={styles.message}>{animalCategoryLabel(animal.category)}{animal.breed ? ` · ${animal.breed}` : ''}</Text></View><View style={styles.status}><MaterialCommunityIcons name={animal.status === 'archived' ? 'archive-outline' : 'home-heart'} size={17} color={colors.reunitedOnTint} /><Text style={styles.statusText}>{animal.status === 'archived' ? 'ARCHIVED' : 'SAFE'}</Text></View></View>
    <Section title="Identity" icon="paw-outline" rows={[
      ['Sex', animal.sex], ['Size', animal.size], ['Relationship', animal.relationship?.replaceAll('_', ' ')],
      ['Estimated age', animal.approximate_age_years != null ? `${animal.approximate_age_years} years` : null],
      ['Estimated weight', animal.approximate_weight_kg != null ? `${animal.approximate_weight_kg} Kg` : null]
    ]} />
    <Section title="Appearance" icon="palette-outline" rows={[
      ['Primary colour', animal.primary_colours?.map(animalColourLabel).join(', ')],
      ['Secondary colours', animal.secondary_colours?.map(animalColourLabel).join(', ')],
      ['Pattern', animal.pattern],
      ['Distinctive features', animal.distinctive_features]
    ]} />
    <Section title="Health needs" icon="medical-bag" rows={(animal.animal_health_flags ?? [])
      .filter((flag) => flag.active)
      .map((flag) => [animalHealthFlagLabel(flag.flag_type), `${flag.description} · ${flag.public_during_incident ? 'Eligible for a future public report' : 'Private only'}`])} />
    <View style={styles.privateCard}><View style={styles.privateTitle}><MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.primary} /><Text style={styles.sectionTitle}>Private details</Text></View><Text style={styles.message}>Only you can access these details.</Text>
      {privateDetails?.microchip_number || privateDetails?.identifier_value ? <Pressable accessibilityRole="button" onPress={() => setShowPrivateIds((shown) => !shown)} style={styles.revealButton}><MaterialCommunityIcons name={showPrivateIds ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.primary} /><Text style={styles.addPhotoText}>{showPrivateIds ? 'Hide identifiers' : 'Reveal identifiers'}</Text></Pressable> : null}
      <DetailRow label="Microchip number" value={privateDetails?.microchip_number ? (showPrivateIds ? privateDetails.microchip_number : 'Hidden') : null} />
      <DetailRow label="Other identifier" value={privateDetails?.identifier_value ? (showPrivateIds ? privateDetails.identifier_value : 'Hidden') : null} />
      <DetailRow label="Health notes" value={privateDetails?.private_health_notes} /><DetailRow label="Veterinary practice" value={privateDetails?.veterinary_practice} /><DetailRow label="Ownership notes" value={privateDetails?.ownership_notes} />
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => navigation.navigate('EditAnimal', { animalId })} style={styles.addPhoto}><MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} /><Text style={styles.addPhotoText}>Edit details</Text></Pressable>
      {animal.status !== 'archived' && animal.photos.length < 3 ? <Pressable accessibilityRole="button" disabled={busy} onPress={addPhoto} style={styles.addPhoto}><MaterialCommunityIcons name="camera-plus-outline" size={22} color={colors.primary} /><Text style={styles.addPhotoText}>{busy ? 'Uploading photo…' : 'Add photo'}</Text></Pressable> : null}
      <PrimaryButton label={animal.status === 'archived' ? (busy ? 'Restoring…' : 'Restore animal') : (busy ? 'Archiving…' : 'Archive animal')} onPress={busy ? undefined : toggleArchived} />
      {['safe', 'archived'].includes(animal.status) ? <Pressable accessibilityRole="button" accessibilityLabel="Permanently delete animal" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmDeleteAnimal} style={styles.deleteAnimal}><MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} /><Text style={styles.deleteAnimalText}>Delete animal permanently</Text></Pressable> : null}
    </View>
  </ScreenContainer>;
}

function PhotoControl({ label, icon, disabled, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.photoControl}>
    <MaterialCommunityIcons name={icon} size={22} color={disabled ? colors.border : colors.primary} />
  </Pressable>;
}

function Section({ title, icon, rows }) {
  const visibleRows = rows.filter(([, value]) => value);
  if (!visibleRows.length) return null;
  return <View style={styles.section}><View style={styles.privateTitle}><MaterialCommunityIcons name={icon} size={22} color={colors.primary} /><Text style={styles.sectionTitle}>{title}</Text></View>{visibleRows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</View>;
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCard: { width: 96 },
  photo: { width: 96, height: 96, borderRadius: radii.md },
  photoControls: { flexDirection: 'row' },
  photoControl: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  photoHelp: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginVertical: spacing.xl },
  headingText: { flex: 1 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.reunitedTint },
  statusText: { ...typography.caption, color: colors.reunitedOnTint },
  section: { gap: spacing.sm, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  privateCard: { gap: spacing.sm, marginVertical: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.primaryLight },
  privateTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  rowLabel: { ...typography.bodyStrong, color: colors.textPrimary, width: 130 },
  rowValue: { ...typography.body, color: colors.textSecondary, flex: 1, textTransform: 'capitalize' },
  state: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxxl },
  error: { ...typography.body, color: colors.error },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  addPhoto: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  revealButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addPhotoText: { ...typography.button, color: colors.primary },
  deleteAnimal: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  deleteAnimalText: { ...typography.button, color: colors.error }
});
