import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePreventRemove } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { SOUTH_AFRICAN_PROVINCES } from '../../config/constants';
import { addMissingOwnerUpdate } from '../../services/missingOwnerUpdateService';
import { colors, radii, spacing, typography } from '../../theme';
import { publicLocationPreview } from '../../utils/missingLocation';

const UPDATE_TYPES = [
  ['search_note', 'Search note', 'Share useful search progress.'],
  ['new_confirmed_area', 'New confirmed area', 'Share an area where the animal was confirmed seen.'],
  ['medical_warning', 'Safety or medical warning', 'Share a new warning that helps people act safely.'],
  ['description_correction', 'Description correction', 'Correct a public description without erasing the earlier record.']
];

const INITIAL_AREA = { province: '', city: '', suburb: '', streetOrLandmark: '', publicPrecision: 'suburb' };

function validate(updateType, note, area) {
  const errors = {};
  const cleanNote = note.trim();
  if (updateType !== 'new_confirmed_area' && !cleanNote) errors.note = 'Enter the update you want to share.';
  if (cleanNote.length > 500 || /[\x00-\x1F\x7F]/.test(cleanNote)) errors.note = 'Keep the update to 500 characters without control characters.';
  if (updateType === 'new_confirmed_area') {
    if (!SOUTH_AFRICAN_PROVINCES.includes(area.province)) errors.province = 'Choose a South African province.';
    if (!area.city.trim()) errors.city = 'Enter a city or town.';
    if (!area.suburb.trim()) errors.suburb = 'Enter a suburb or area.';
    if (area.publicPrecision === 'approximate') {
      if (!area.streetOrLandmark.trim()) errors.streetOrLandmark = 'Enter a public street or landmark name.';
      else if (/\d/.test(area.streetOrLandmark)) errors.streetOrLandmark = 'Remove house numbers and other digits.';
    }
  }
  return errors;
}

export function AddMissingUpdateScreen({ navigation, route }) {
  const { reportId, reference } = route.params;
  const [updateType, setUpdateType] = useState('search_note');
  const [note, setNote] = useState('');
  const [area, setArea] = useState(INITIAL_AREA);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryOnly, setRetryOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const requestKey = useRef(null);
  const inFlight = useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Leave this update?', retryOnly
      ? 'We could not confirm whether it was published. Leaving loses this retry. Check the case timeline before sending a new update.'
      : 'This unsent update will be lost. Your existing case stays unchanged.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function changeType(value) {
    setUpdateType(value);
    setErrors({});
    setError('');
    setDirty(true);
  }

  function changeArea(field, value) {
    setArea((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDirty(true);
  }

  async function submit() {
    if (inFlight.current) return;
    const nextErrors = validate(updateType, note, area);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setError('Please correct the highlighted details. Nothing has been published.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    if (!requestKey.current) requestKey.current = `owner-update-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const publicArea = updateType === 'new_confirmed_area' ? {
      province: area.province, city: area.city.trim(), suburb: area.suburb.trim(),
      publicPrecision: area.publicPrecision,
      streetOrLandmark: area.publicPrecision === 'approximate' ? area.streetOrLandmark.trim() : null
    } : null;
    try {
      await addMissingOwnerUpdate(reportId, updateType, note.trim(), publicArea, requestKey.current);
      setDirty(false);
      Alert.alert('Update published', 'Your update is now on the public case timeline.', [
        { text: 'View timeline', onPress: () => navigation.goBack() }
      ]);
    } catch (saveError) {
      if (saveError.code === '23514' || saveError.code === '42501') {
        requestKey.current = null;
        setError(`The update was not published. Review your details and try again. ${saveError.message}`);
      } else {
        setRetryOnly(true);
        setError('We could not confirm whether the update was saved. Your text is still here. Try again with the same request; it will not create a duplicate.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function confirmSubmit() {
    const nextErrors = validate(updateType, note, area);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setError('Please correct the highlighted details. Nothing has been published.');
      return;
    }
    Alert.alert('Publish this update?', 'It will be visible to anyone viewing this report. Check that it contains no house number, exact location, private phone number or identifying details.', [
      { text: 'Review again', style: 'cancel' },
      { text: 'Publish update', onPress: submit }
    ]);
  }

  const locked = busy || retryOnly;
  return <ScreenContainer>
    <Text style={styles.title}>Add an owner update</Text>
    <Text style={styles.subtitle}>Report {reference}. Updates are added to the timeline; the original report remains unchanged.</Text>
    <Text style={styles.warning}><MaterialCommunityIcons name="earth" size={17} /> This update is public. Do not include a house number, exact point, private contact or identifying information.</Text>
    <Text style={styles.heading}>What changed?</Text>
    {UPDATE_TYPES.map(([value, label, hint]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: updateType === value, disabled: locked }} disabled={locked} onPress={() => changeType(value)} style={[styles.choice, updateType === value && styles.selected]}>
      <MaterialCommunityIcons name={updateType === value ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={updateType === value ? colors.primary : colors.textSecondary} />
      <View style={styles.choiceBody}><Text style={styles.choiceLabel}>{label}</Text><Text style={styles.hint}>{hint}</Text></View>
    </Pressable>)}

    {updateType === 'new_confirmed_area' ? <View style={styles.areaFields}>
      <Text style={styles.heading}>Confirmed area</Text>
      <Text style={styles.hint}>Enter where the animal was confirmed seen, not where you are now. No device point is captured here.</Text>
      <Text style={styles.fieldLabel}>Province</Text>
      <View style={styles.provinces}>{SOUTH_AFRICAN_PROVINCES.map((province) => <Pressable key={province} accessibilityRole="radio" accessibilityState={{ selected: area.province === province, disabled: locked }} disabled={locked} onPress={() => changeArea('province', province)} style={[styles.province, area.province === province && styles.selected]}><Text style={styles.provinceText}>{province}</Text></Pressable>)}</View>
      {errors.province ? <Text style={styles.fieldError}>{errors.province}</Text> : null}
      <FormField label="City or town" value={area.city} onChangeText={(value) => changeArea('city', value)} maxLength={120} error={errors.city} editable={!locked} />
      <FormField label="Suburb or area" value={area.suburb} onChangeText={(value) => changeArea('suburb', value)} maxLength={120} error={errors.suburb} editable={!locked} />
      <Text style={styles.fieldLabel}>What may other people see?</Text>
      {[['suburb', 'Suburb, city and province only'], ['approximate', 'Nearby street or public landmark name']].map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: area.publicPrecision === value, disabled: locked }} disabled={locked} onPress={() => changeArea('publicPrecision', value)} style={[styles.choice, area.publicPrecision === value && styles.selected]}><MaterialCommunityIcons name={area.publicPrecision === value ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={area.publicPrecision === value ? colors.primary : colors.textSecondary} /><Text style={styles.choiceLabel}>{label}</Text></Pressable>)}
      {area.publicPrecision === 'approximate' ? <FormField label="Street or public landmark name" value={area.streetOrLandmark} onChangeText={(value) => changeArea('streetOrLandmark', value)} maxLength={200} placeholder="For example, near the library" error={errors.streetOrLandmark} editable={!locked} /> : null}
      <View style={styles.preview}><Text style={styles.fieldLabel}>Public area preview</Text><Text style={styles.previewText}>{publicLocationPreview(area)}</Text></View>
    </View> : null}

    <View style={styles.noteField}><FormField label={updateType === 'new_confirmed_area' ? 'Extra context (optional)' : 'Update for other people'} value={note} onChangeText={(value) => { setNote(value); setErrors((current) => ({ ...current, note: undefined })); setDirty(true); }} multiline maxLength={500} error={errors.note} editable={!locked} placeholder="Keep this factual and brief" /></View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <PrimaryButton label={busy ? 'Saving…' : retryOnly ? 'Try the same update again' : 'Publish update'} onPress={retryOnly ? submit : confirmSubmit} disabled={busy} />
    {retryOnly ? <Text style={styles.hint}>Fields are locked during recovery so a retry uses the exact same details. You can leave without publishing again.</Text> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  warning: { ...typography.bodyStrong, color: colors.missingOnTint, backgroundColor: colors.missingTint, padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.xl },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  choice: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceBody: { flex: 1 },
  choiceLabel: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  areaFields: { gap: spacing.md, marginTop: spacing.xl },
  fieldLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  fieldError: { ...typography.caption, color: colors.error },
  provinces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  province: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  provinceText: { ...typography.caption, color: colors.textPrimary },
  preview: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryLight },
  previewText: { ...typography.body, color: colors.textPrimary },
  noteField: { marginTop: spacing.xl, marginBottom: spacing.xl },
  error: { ...typography.body, color: colors.error, marginBottom: spacing.md }
});
