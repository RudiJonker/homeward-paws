import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { getAnimalReportAppearance } from '../../services/animalService';
import { deleteMissingDraft, getMissingDraft, saveMissingDraft } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { selectedMissingPhotos } from '../../utils/missingPreview';

export function MissingAppearanceScreen({ navigation, route }) {
  const { animalId, reportId } = route.params;
  const [animal, setAnimal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [accessories, setAccessories] = useState('');
  const [appearanceNotes, setAppearanceNotes] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const skipLeavePrompt = useRef(false);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [animalRow, draftRow] = await Promise.all([getAnimalReportAppearance(animalId), getMissingDraft(reportId)]);
      if (draftRow.animal_id !== animalId || !['safe', 'missing'].includes(animalRow.status)) {
        throw new Error('This animal is no longer available for a missing draft.');
      }
      const appearance = draftRow.draft_payload?.appearance ?? {};
      const photoIds = animalRow.photos.map((photo) => photo.id);
      const selectedPhotos = selectedMissingPhotos(animalRow, appearance);
      const savedSelectionValid = !Array.isArray(appearance.selected_photo_ids)
        || appearance.selected_photo_ids.every((id) => selectedPhotos.some((photo) => photo.id === id));
      const appearanceStillCurrent = appearance.animal_updated_at === animalRow.updated_at
        && JSON.stringify(appearance.photo_ids ?? []) === JSON.stringify(photoIds);
      setAnimal(animalRow);
      setDraft(draftRow);
      setAccessories(appearance.accessories ?? '');
      setAppearanceNotes(appearance.notes ?? '');
      setSelectedPhotoIds(selectedPhotos.map((photo) => photo.id));
      const needsReview = !appearanceStillCurrent || !savedSelectionValid || selectedPhotos.some((photo) => !photo.url);
      setConfirmed(appearance.confirmed === true && !needsReview);
      setDirty(appearance.confirmed === true && needsReview);
    } catch (loadError) {
      setError(`We couldn't load this private draft. Check your connection and try again. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [animalId, reportId]);

  useFocusEffect(useCallback(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      load();
    }
  }, [load]));

  usePreventRemove(dirty, ({ data }) => {
    if (skipLeavePrompt.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert('Leave without saving?', 'Your changes on this screen will be lost. The last saved draft will remain private.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function change(setter, value) {
    setter(value);
    setDirty(true);
    setSaved(false);
  }

  function togglePhoto(photo) {
    if (busy || (!photo.url && !selectedPhotoIds.includes(photo.id))) return;
    change(setSelectedPhotoIds, selectedPhotoIds.includes(photo.id)
      ? selectedPhotoIds.filter((id) => id !== photo.id)
      : [...selectedPhotoIds, photo.id]);
    setConfirmed(false);
  }

  async function save({ next = false } = {}) {
    if (!draft || busy) return;
    const selectedPhotos = animal.photos.filter((photo) => selectedPhotoIds.includes(photo.id));
    if (next && (!confirmed || selectedPhotos.some((photo) => !photo.url))) {
      setError('Confirm the current appearance and check that each selected photo can be viewed before continuing.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const latestDraft = await getMissingDraft(reportId);
      if (latestDraft.animal_id !== animalId) throw new Error('This draft no longer belongs to this animal.');
      const payload = {
        ...latestDraft.draft_payload,
        appearance: {
          accessories: accessories.trim(),
          notes: appearanceNotes.trim(),
          confirmed,
          animal_updated_at: animal.updated_at,
          photo_ids: animal.photos.map((photo) => photo.id),
          selected_photo_ids: selectedPhotoIds
        }
      };
      await saveMissingDraft(animalId, payload, reportId);
      setDraft((current) => ({ ...current, draft_payload: payload }));
      setDirty(false);
      setSaved(true);
      if (next) navigation.navigate('MissingLastSeen', { animalId, reportId });
    } catch (saveError) {
      setError(`Your changes were not saved. Check your connection and try again. ${saveError.message}`);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete private draft?', 'This permanently removes the unfinished missing report. Your animal profile and photos will remain.', [
      { text: 'Keep draft', style: 'cancel' },
      { text: 'Delete draft', style: 'destructive', onPress: async () => {
        setBusy(true);
        setError('');
        try {
          await deleteMissingDraft(reportId);
          skipLeavePrompt.current = true;
          navigation.goBack();
        } catch (deleteError) {
          setError(`The draft could not be deleted. ${deleteError.message}`);
          setBusy(false);
        }
      } }
    ]);
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading your private draft…</Text></ScreenContainer>;
  if (!animal || !draft) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error || 'This draft is unavailable.'}</Text><PrimaryButton label="Try again" onPress={load} /></View></ScreenContainer>;

  const description = [animalCategoryLabel(animal.category), animal.breed, animal.pattern, animal.coat_description, animal.distinctive_features].filter(Boolean).join(' · ');
  const unavailablePhotoCount = animal.photos.filter((photo) => !photo.url).length;
  const selectedPhotoUnavailable = animal.photos.some((photo) => selectedPhotoIds.includes(photo.id) && !photo.url);

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>PRIVATE MISSING-REPORT DRAFT</Text>
      <Text style={styles.title}>Confirm current appearance</Text>
      <Text style={styles.subtitle}>Check that these details still describe {animal.name}. Choose which report-ready photos could appear publicly later. This screen does not publish a report.</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{animal.name}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.photoLabel}>Photos selected for this report: {selectedPhotoIds.length}</Text>
        <View style={styles.photos}>
          {(animal.photos.length ? animal.photos : [{ id: 'placeholder', url: null }]).map((photo, index) => photo.id === 'placeholder' ? (
            <Image key={photo.id} source={ANIMAL_PLACEHOLDERS[animal.category]} style={styles.photo} />
          ) : (
            <Pressable key={photo.id} accessibilityRole="checkbox" accessibilityLabel={`Photo ${index + 1} for public report`} accessibilityState={{ checked: selectedPhotoIds.includes(photo.id), disabled: busy }} disabled={busy} onPress={() => togglePhoto(photo)} style={[styles.photoChoice, selectedPhotoIds.includes(photo.id) && styles.photoSelected]}>
              <Image source={photo.url ? { uri: photo.url } : ANIMAL_PLACEHOLDERS[animal.category]} style={styles.photo} />
              <MaterialCommunityIcons name={selectedPhotoIds.includes(photo.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={25} color={selectedPhotoIds.includes(photo.id) ? colors.primary : colors.textSecondary} />
            </Pressable>
          ))}
        </View>
        {!animal.photos.length ? <Text style={styles.warning}>This animal has no report-ready profile photos. You can add clear photos in My Animals later.</Text> : null}
        {unavailablePhotoCount ? <Text style={styles.warning}>Some report-ready photos could not be displayed. Check your connection before selecting them.</Text> : null}
        {animal.photos.length && !selectedPhotoIds.length ? <Text style={styles.helper}>No photo selected. The proposed public report will show an animal placeholder.</Text> : null}
        <Text style={styles.helper}>Need to correct permanent details or photos? Edit this animal in My Animals, then reopen this draft to review the changes.</Text>
      </View>
      <View style={styles.fields}>
        <FormField label="Collar, harness or other accessories (optional)" value={accessories} onChangeText={(value) => change(setAccessories, value)} placeholder="For example, a red collar and silver tag" multiline maxLength={500} editable={!busy} />
        <FormField label="Other current appearance notes (optional)" value={appearanceNotes} onChangeText={(value) => change(setAppearanceNotes, value)} placeholder="Anything different from the profile photos" multiline maxLength={1000} editable={!busy} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed, disabled: busy || selectedPhotoUnavailable }} disabled={busy || selectedPhotoUnavailable} onPress={() => change(setConfirmed, !confirmed)} style={styles.confirmRow}>
          <MaterialCommunityIcons name={confirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={28} color={confirmed ? colors.primary : colors.textSecondary} />
          <Text style={styles.confirmText}>I have checked this animal’s current appearance and the photos selected for this report.</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>Draft saved privately. You can return to it from Report at any time.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save({ next: true })} style={[styles.saveButton, busy && styles.disabled]}>
        <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save and continue'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save()} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Save private draft for later</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmDelete} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Delete private draft</Text>
      </Pressable>
      <Text style={styles.footer}>Your report remains private. Location, contact choices and final review will be added before publishing is enabled.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.missingOnTint, marginBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  name: { ...typography.sectionTitle, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  photoLabel: { ...typography.label, color: colors.textPrimary, marginTop: spacing.md },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  photoChoice: { alignItems: 'center', gap: spacing.xs, padding: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  photoSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  photo: { width: 90, height: 90, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  helper: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  warning: { ...typography.bodyStrong, color: colors.missingOnTint, marginTop: spacing.md },
  fields: { gap: spacing.lg, marginTop: spacing.xxl },
  confirmRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confirmText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  saveButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, marginTop: spacing.xxl },
  saveText: { ...typography.button, color: colors.textOnPrimary },
  secondaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  secondaryText: { ...typography.button, color: colors.primary },
  disabled: { opacity: 0.55 },
  deleteButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  deleteText: { ...typography.bodyStrong, color: colors.error },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  saved: { ...typography.bodyStrong, color: colors.primaryDark, marginTop: spacing.md }
});
